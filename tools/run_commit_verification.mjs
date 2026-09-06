import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VERIFICATION_METADATA_SOURCE } from "./verification/verification_catalog_source.mjs";
import { prepareRepositoryVerificationCatalogBinding } from "./verification/script_portfolio.mjs";
import { buildRouteIndex } from "./test_route_registry.mjs";
import { buildPrCostObservation } from "./verification/verification_profile.mjs";
import { discoverWorkspaceChangedFiles } from "./verification/workspace_changes.mjs";
export { parsePorcelainChangedFiles } from "./verification/workspace_changes.mjs";
import {
  adaptivePlanningExitCode,
  applyLocalEntrypointExecutionBudget,
  buildAdaptiveEntrypointRecommendation,
  buildExecutionPlan,
  constrainAdaptiveEntrypointSelection,
  executeAdaptivePlan,
} from "./run_adaptive_tests.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runCommand(runner, bin, args, options) {
  if (process.platform === "win32" && bin === "npm") {
    return runner(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], options);
  }
  return runner(bin, args, options);
}

function commitTier(metadataSource = VERIFICATION_METADATA_SOURCE) {
  const entry = metadataSource?.canonicalEntrypoints?.tier?.find((candidate) => candidate.id === "commit");
  if (!entry?.commitProjection) throw new Error("verify-commit-canonical-projection-missing");
  return entry;
}

function controlPlaneRecords(metadataSource = VERIFICATION_METADATA_SOURCE) {
  const entry = commitTier(metadataSource);
  const ids = entry.commitProjection.controlPlaneRecordIds;
  if (!Array.isArray(ids) || ids.length === 0
    || ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("verify-commit-control-plane-record-ids-invalid");
  }
  if (new Set(ids).size !== ids.length) throw new Error("verify-commit-control-plane-record-ids-duplicate");
  if (!Array.isArray(metadataSource?.records)) throw new Error("verify-commit-canonical-records-missing");
  return ids.map((id) => {
    const matches = metadataSource.records.filter((record) => record.id === id);
    if (matches.length > 1) throw new Error(`verify-commit-control-plane-record-duplicate:${id}`);
    if (matches.length === 0 || !Array.isArray(matches[0].sourceRefs)) {
      throw new Error(`verify-commit-control-plane-record-missing:${id}`);
    }
    return matches[0];
  });
}

function nonControlPlaneSourceRefs(metadataSource, controlRecords) {
  const controlIds = new Set(controlRecords.map((record) => record.id));
  return new Set(metadataSource.records
    .filter((record) => !controlIds.has(record.id))
    .flatMap((record) => record.sourceRefs || []));
}

export function buildCommitVerificationPlan(changedFiles, {
  metadataSource = VERIFICATION_METADATA_SOURCE,
} = {}) {
  const entry = commitTier(metadataSource);
  const normalizedFiles = [...new Set((changedFiles || []).map(String))].sort();
  const controlRecords = controlPlaneRecords(metadataSource);
  const controlPlaneSources = new Set(controlRecords.flatMap((record) => record.sourceRefs));
  const nonControlPlaneSources = nonControlPlaneSourceRefs(metadataSource, controlRecords);
  const controlPlaneFiles = normalizedFiles.filter((file) => controlPlaneSources.has(file));
  const productFiles = normalizedFiles.filter((file) => (
    !controlPlaneSources.has(file) || nonControlPlaneSources.has(file)
  ));
  // Registered product edits cannot change the verification metadata. The adaptive
  // runner still validates its selected catalog and rejects missing local coverage.
  // Unknown files and tooling/configuration changes retain the global checks.
  const registeredProductOnly = normalizedFiles.length > 0 && normalizedFiles.every((file) => (
    file.startsWith("js/")
      && /\.(?:js|mjs)$/.test(file)
      && !controlPlaneSources.has(file)
      && nonControlPlaneSources.has(file)
  ));
  const commands = [];
  const requiredCanonicalCommandRefs = [];
  if (!registeredProductOnly) {
    commands.push(["npm", ["run", "verify:script-portfolio"]]);
  }
  // Keep this even for product edits: deleting a product module can break an
  // existing test import without modifying the test itself.
  commands.push(["npm", ["run", "verify:test-import-graph"]]);
  if (!registeredProductOnly) {
    requiredCanonicalCommandRefs.push("node tools/select_verification_targets.mjs --check");
  }
  if (controlPlaneFiles.length > 0) {
    const refs = entry.commitProjection.controlPlaneCommandRefs;
    if (!Array.isArray(refs) || refs.length === 0
      || refs.some((ref) => typeof ref !== "string" || !ref.trim())
      || new Set(refs).size !== refs.length) {
      throw new Error("verify-commit-control-plane-command-refs-invalid");
    }
    requiredCanonicalCommandRefs.push(...refs);
  }
  return {
    commands,
    productFiles,
    controlPlaneFiles,
    requiredCanonicalCommandRefs,
    mode: [
      controlPlaneFiles.length > 0 ? "control-plane" : null,
      productFiles.length > 0 ? "adaptive-edit" : null,
    ].filter(Boolean).join("+") || "invariants-only",
  };
}

export function buildCommitExecutionPlan(commitPlan, {
  cwd = REPO_ROOT,
  platform = process.platform,
  catalogBinding = prepareRepositoryVerificationCatalogBinding({ repoRoot: cwd, platform }),
  selectorRoutes = buildRouteIndex(),
} = {}) {
  const { preparedCatalog, bindSelectionReport } = catalogBinding;
  const selectorStartedAt = performance.now();
  const recommendation = buildAdaptiveEntrypointRecommendation(commitPlan.productFiles, selectorRoutes, {
    entrypoint: "edit", routeAuthority: preparedCatalog.authority,
  });
  const boundSelection = bindSelectionReport(constrainAdaptiveEntrypointSelection(recommendation, "edit", { preparedCatalog }));
  const report = {
    ...boundSelection,
    prCost: buildPrCostObservation({
      selectorReport: boundSelection,
      observationStage: "selector",
      timingInputs: { selectorMs: { value: performance.now() - selectorStartedAt, source: "local-monotonic-clock" } },
    }),
  };
  const productPlan = applyLocalEntrypointExecutionBudget(
    buildExecutionPlan(report, { preparedCatalog, platform, packageScripts: preparedCatalog.sourceInputs.packageScripts }), "edit", { preparedCatalog },
  );
  const productExitCode = adaptivePlanningExitCode(report, productPlan);
  // Fixed commit obligations never count towards, or repair, the product edit budget.
  if (productExitCode) return { report, productPlan, executionPlan: productPlan, exitCode: productExitCode };
  const executionPlan = commitPlan.requiredCanonicalCommandRefs.length > 0
    ? buildExecutionPlan(report, { preparedCatalog, platform, packageScripts: preparedCatalog.sourceInputs.packageScripts, requiredCanonicalCommandRefs: commitPlan.requiredCanonicalCommandRefs })
    : productPlan;
  return { report, productPlan, executionPlan, exitCode: adaptivePlanningExitCode(report, executionPlan) };
}

export function discoverChangedFiles({ runner = spawnSync, cwd = REPO_ROOT } = {}) {
  return discoverWorkspaceChangedFiles({
    runner, cwd, failureCode: "verify-commit-changed-files-unavailable",
  });
}

export function parseCommitVerificationArgs(argv = []) {
  const changedFiles = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== "--changed-file") throw new Error(`verify-commit-cli-unknown-arg:${arg}`);
    const file = argv[index + 1];
    if (!file || file.startsWith("--")) throw new Error("verify-commit-cli-changed-file-missing");
    changedFiles.push(file);
    index += 1;
  }
  return {
    changedFiles: [...new Set(changedFiles)].sort(),
    hasExplicitChangedFiles: changedFiles.length > 0,
  };
}

export function runCommitVerification({
  cwd = REPO_ROOT,
  runner = spawnSync,
  changedFiles = discoverChangedFiles({ runner, cwd }),
} = {}) {
  const plan = buildCommitVerificationPlan(changedFiles);
  const { report, executionPlan, exitCode } = buildCommitExecutionPlan(plan, { cwd });
  if (exitCode) {
    console.error("Commit verification planning failed:", JSON.stringify({ unmatchedChangedFiles: report.unmatchedChangedFiles, routeGaps: executionPlan.routeGaps }));
    return exitCode;
  }
  for (const [bin, args] of plan.commands) {
    const result = runCommand(runner, bin, args, { cwd, stdio: "inherit", shell: false });
    if (result?.status !== 0) return result?.status || 1;
  }
  const results = executeAdaptivePlan(executionPlan, { runner, cwd });
  const failedResult = results.find((result) => result.exitCode !== 0);
  if (failedResult) return failedResult.exitCode || 1;
  return results.length === executionPlan.executionCommands.length ? 0 : 1;
}

export function runCommitVerificationCli(argv = process.argv.slice(2), options = {}) {
  const parsed = parseCommitVerificationArgs(argv);
  return runCommitVerification({
    ...options,
    ...(parsed.hasExplicitChangedFiles ? { changedFiles: parsed.changedFiles } : {}),
  });
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) process.exitCode = runCommitVerificationCli();
