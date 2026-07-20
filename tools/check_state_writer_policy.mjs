import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  P4_CLOSEOUT_DIRECT_FILES_TARGET,
  P4_CLOSEOUT_MEMBERSHIP_RATIO,
  readStateWriterPolicy,
  resolveGitCommitSha,
  scanStateWriterPolicySnapshot,
  STATE_WRITER_POLICY_PATH,
  validateLegacyMembershipRetirementReplacements,
  validateLegacyStateWriterSemanticAuthority,
  validateLegacyStateWriterSemanticLedger,
  validateStateWriterPolicyProgression,
} from "./build_state_writer_policy.mjs";
import {
  buildDefaultStateOwnershipReport,
  validateTestDiagnosticBudget,
  validateStateWriterPolicySnapshot,
} from "./state_writer_policy.mjs";
import {
  isP4StateActionCloseoutPhase,
  normalizeP4StateActionPhase,
} from "./p4_state_action_phases.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REPORT_ROOT = path.join(
  PROJECT_ROOT,
  ".runtime",
  "reports",
  "generated",
  "p4-state-actions",
);
const POLICY_CONFIG_PATHS = Object.freeze([
  "package-lock.json",
  "tools/eslint-rules/state-writer-allowlist.json",
  "tools/state_action_delegation_contract.mjs",
  "tools/state_writer_inventory.mjs",
  "tools/state_writer_policy.mjs",
  "tools/build_state_writer_policy.mjs",
  "tools/check_state_writer_policy.mjs",
  "tools/p4_state_action_phases.mjs",
]);

function parseArgs(argv) {
  const args = {
    phase: "",
    jsonOut: "",
    json: false,
    requireClean: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--phase") {
      args.phase = normalizeP4StateActionPhase(argv[index + 1]);
      index += 1;
    } else if (arg === "--json-out") {
      args.jsonOut = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--require-clean") {
      args.requireClean = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.phase) {
    args.phase = normalizeP4StateActionPhase(args.phase);
  }
  return args;
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
}

function buildExpectedP4ProgressCheckpoint(policy = {}) {
  const baselines = policy?.baselines || {};
  return {
    phase: "P4.0",
    productionLegacyDirectFiles:
      baselines?.legacyDirectFiles?.production,
    productionLegacyMemberships:
      baselines?.bindingScopedMemberships?.production?.legacyCombined,
    productionLegacyDynamicSites:
      baselines?.bindingScopedSites?.dynamic?.production?.legacyCombined,
    productionLegacyAliasSites:
      baselines?.bindingScopedSites?.alias?.production?.legacyCombined,
    productionLegacyAmbiguousSites:
      baselines?.bindingScopedSites?.ambiguous?.production?.legacyCombined,
    productionLegacyUnsupportedSites:
      baselines?.bindingScopedSites?.unsupported?.production?.legacyCombined,
  };
}

export function validateFrozenP4ProgressCheckpoint(policy = {}) {
  const checkpoints = Array.isArray(policy?.progress?.checkpoints)
    ? policy.progress.checkpoints
    : [];
  const p4BaselineCheckpoints = checkpoints.filter(
    (checkpoint) => checkpoint?.phase === "P4.0",
  );
  if (p4BaselineCheckpoints.length !== 1) {
    return [{
      code: "p4-baseline-progress-checkpoint-count-invalid",
      expected: 1,
      actual: p4BaselineCheckpoints.length,
    }];
  }
  const expected = buildExpectedP4ProgressCheckpoint(policy);
  const actual = p4BaselineCheckpoints[0];
  return isDeepStrictEqual(expected, actual)
    ? []
    : [{
      code: "p4-baseline-progress-checkpoint-drift",
      expected,
      actual,
    }];
}

function validateProgressCheckpointHistoryTransition({
  previousPolicy = {},
  currentPolicy = {},
} = {}) {
  const previousCheckpoints = Array.isArray(
    previousPolicy?.progress?.checkpoints,
  )
    ? previousPolicy.progress.checkpoints
    : [];
  const currentCheckpoints = Array.isArray(
    currentPolicy?.progress?.checkpoints,
  )
    ? currentPolicy.progress.checkpoints
    : [];
  const violations = [];
  for (let index = 0; index < previousCheckpoints.length; index += 1) {
    const expected = previousCheckpoints[index];
    const actual = currentCheckpoints[index];
    if (!actual) {
      violations.push({
        code: "progress-checkpoint-history-missing",
        index,
        phase: expected?.phase || "",
        expected,
      });
      continue;
    }
    if (!isDeepStrictEqual(expected, actual)) {
      violations.push({
        code: "progress-checkpoint-history-drift",
        index,
        phase: expected?.phase || "",
        expected,
        actual,
      });
    }
  }
  return violations;
}

export function validateStateWriterPolicyTransition({
  previousPolicy = null,
  currentPolicy = {},
} = {}) {
  if (!previousPolicy) {
    return [];
  }
  const violations = [
    ...validateFrozenP4ProgressCheckpoint(currentPolicy),
    ...validateProgressCheckpointHistoryTransition({
      previousPolicy,
      currentPolicy,
    }),
  ];
  if (!isDeepStrictEqual(previousPolicy?.baseline, currentPolicy?.baseline)) {
    violations.push({
      code: "policy-baseline-drift",
      expected: previousPolicy?.baseline ?? null,
      actual: currentPolicy?.baseline ?? null,
    });
  }
  if (!isDeepStrictEqual(previousPolicy?.baselines, currentPolicy?.baselines)) {
    violations.push({
      code: "policy-baselines-drift",
      expected: previousPolicy?.baselines ?? null,
      actual: currentPolicy?.baselines ?? null,
    });
  }
  violations.push(
    ...validateLegacyStateWriterSemanticLedger({
      baseline: previousPolicy?.baselines?.legacySemanticAuthority,
      writers: currentPolicy?.writers,
      retired:
        currentPolicy?.progress?.retiredLegacySemanticAuthority,
      previousWriters: previousPolicy?.writers,
      previousRetired:
        previousPolicy?.progress?.retiredLegacySemanticAuthority,
    }).violations,
    ...validateLegacyMembershipRetirementReplacements({
      previousWriters: previousPolicy?.writers,
      writers: currentPolicy?.writers,
    }),
  );
  return violations;
}

function loadPreviousStateWriterPolicy({
  phase,
  trackedClean,
  executeGit = runGit,
} = {}) {
  const revision = trackedClean ? "HEAD^1" : "HEAD";
  const policyPath = path
    .relative(PROJECT_ROOT, STATE_WRITER_POLICY_PATH)
    .replaceAll("\\", "/");
  try {
    const source = executeGit(["show", `${revision}:${policyPath}`]);
    return {
      revision,
      policy: JSON.parse(String(source || "")),
      violations: [],
    };
  } catch (error) {
    return {
      revision,
      policy: null,
      violations: normalizeP4StateActionPhase(phase) === "P4.0"
        ? []
        : [{
          code: "previous-policy-unavailable",
          revision,
          policyPath,
          message: String(error?.message || error),
        }],
    };
  }
}

export function buildStateWriterVerificationIdentity({
  sourceBaseSha = "",
  requireClean = false,
  runGit: executeGit = runGit,
  policyPath = "tools/state_writer_policy.json",
  configPaths = POLICY_CONFIG_PATHS,
} = {}) {
  const verificationSha = String(
    executeGit(["rev-parse", "--verify", "HEAD^{commit}"]) || "",
  ).trim().toLowerCase();
  const verificationTreeSha = String(
    executeGit(["rev-parse", "HEAD^{tree}"]) || "",
  ).trim().toLowerCase();
  const trackedStatus = String(
    executeGit([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]) || "",
  ).trim();
  const trackedClean = trackedStatus === "";
  const hashBlob = (filePath) =>
    String(executeGit(["hash-object", filePath]) || "").trim().toLowerCase();
  const policyBlobSha = hashBlob(policyPath);
  const configBlobShas = [...configPaths].sort().map((configPath) => ({
    path: configPath,
    blobSha: hashBlob(configPath),
  }));
  const configTreeIdentity = createHash("sha256")
    .update(
      configBlobShas.map(({ path: configPath, blobSha }) =>
        `${configPath}\0${blobSha}`
      ).join("\n"),
    )
    .digest("hex");
  const violations = [];
  if (requireClean && !trackedClean) {
    violations.push({
      code: "tracked-worktree-dirty",
      trackedStatus,
    });
  }
  return {
    sourceBaseSha: String(sourceBaseSha || "").trim().toLowerCase(),
    verificationSha,
    verificationTreeSha,
    trackedClean,
    trackedStatus,
    policyPath,
    policyBlobSha,
    configBlobShas,
    configTreeIdentity,
    violations,
  };
}

export function validateFrozenCloseoutTargets(baselines = {}) {
  const targets = baselines?.closeoutTargets || {};
  const denominator =
    baselines?.bindingScopedMemberships?.production?.legacyCombined;
  const violations = [];
  const expectedSource =
    "baselines.bindingScopedMemberships.production.legacyCombined";
  if (
    typeof denominator !== "number"
    || !Number.isInteger(denominator)
    || denominator < 0
  ) {
    violations.push({
      code: "closeout-target-denominator-invalid",
      denominator,
    });
    return violations;
  }
  if (
    targets.productionLegacyMembershipDenominator !== denominator
  ) {
    violations.push({
      code: "closeout-target-denominator-drift",
      expected: denominator,
      actual: targets.productionLegacyMembershipDenominator,
    });
  }
  if (
    targets.productionLegacyMembershipRatio
    !== P4_CLOSEOUT_MEMBERSHIP_RATIO
  ) {
    violations.push({
      code: "closeout-target-ratio-drift",
      expected: P4_CLOSEOUT_MEMBERSHIP_RATIO,
      actual: targets.productionLegacyMembershipRatio,
    });
  }
  if (
    targets.productionLegacyMemberships
    !== Math.floor(
      denominator * P4_CLOSEOUT_MEMBERSHIP_RATIO,
    )
  ) {
    violations.push({
      code: "closeout-membership-target-drift",
      expected: Math.floor(
        denominator * P4_CLOSEOUT_MEMBERSHIP_RATIO,
      ),
      actual: targets.productionLegacyMemberships,
    });
  }
  if (
    targets.productionLegacyDirectFiles
    !== P4_CLOSEOUT_DIRECT_FILES_TARGET
  ) {
    violations.push({
      code: "closeout-direct-files-target-drift",
      expected: P4_CLOSEOUT_DIRECT_FILES_TARGET,
      actual: targets.productionLegacyDirectFiles,
    });
  }
  if (targets.source !== expectedSource) {
    violations.push({
      code: "closeout-target-source-drift",
      expected: expectedSource,
      actual: targets.source,
    });
  }
  return violations;
}

function compareDefaultStateBaselines(policy, report) {
  const expected = policy?.baselines?.defaultState || {};
  const actual = {
    factoryGroups: report.factoryGroups.length,
    explicitKeys: report.explicitKeys.length,
    preCompatKeys: report.preCompatKeyCount,
    compatibilityHooks: report.compatibilityHookCount,
    postCompatKeys: report.postCompatKeyCount,
    actualFacadeKeys: report.actualFacadeKeyCount,
    unownedActualFacadeKeys: report.unownedActualFacadeKeys.length,
    registeredKeysMissingFromFacade:
      report.registeredKeysMissingFromFacade.length,
    collisions: report.collisions.length,
  };
  const violations = [];
  for (const [key, actualValue] of Object.entries(actual)) {
    if (Number(expected[key]) !== Number(actualValue)) {
      violations.push({
        code: "default-state-baseline-drift",
        key,
        expected: expected[key],
        actual: actualValue,
      });
    }
  }
  for (const collision of report.collisions) {
    violations.push({
      code: "default-state-key-collision",
      ...collision,
    });
  }
  for (const key of report.unownedActualFacadeKeys) {
    violations.push({
      code: "unowned-actual-state-key",
      key,
    });
  }
  for (const key of report.registeredKeysMissingFromFacade) {
    violations.push({
      code: "registered-state-key-missing-from-facade",
      key,
    });
  }
  return {
    expected,
    actual,
    collisions: report.collisions,
    violations,
  };
}

export function buildStateWriterCloseoutTargetViolations({
  phase,
  currentMetrics = {},
  targets = {},
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  if (!isP4StateActionCloseoutPhase(normalizedPhase)) {
    return [];
  }
  const violations = [];
  if (
    Number(currentMetrics.productionLegacyDirectFiles || 0)
    > Number(targets.productionLegacyDirectFiles || 0)
  ) {
    violations.push({
      code: "closeout-legacy-direct-files-target-missed",
      actual: Number(currentMetrics.productionLegacyDirectFiles || 0),
      target: Number(targets.productionLegacyDirectFiles || 0),
    });
  }
  if (
    Number(currentMetrics.productionLegacyMemberships || 0)
    > Number(targets.productionLegacyMemberships || 0)
  ) {
    violations.push({
      code: "closeout-legacy-memberships-target-missed",
      actual: Number(currentMetrics.productionLegacyMemberships || 0),
      target: Number(targets.productionLegacyMemberships || 0),
    });
  }
  return violations;
}

export async function buildStateWriterPolicyReport({
  phase = "",
  policy = null,
  previousPolicy = undefined,
  requireClean = false,
} = {}) {
  const loadedPolicy = policy || await readStateWriterPolicy();
  const requestedPhase = String(phase || "").trim()
    || String(loadedPolicy?.progress?.latestPhase || "").trim()
    || "P4.0";
  const normalizedPhase = normalizeP4StateActionPhase(requestedPhase);
  const inventory = await scanStateWriterPolicySnapshot(loadedPolicy);
  const validation = validateStateWriterPolicySnapshot({
    policy: loadedPolicy,
    legacyAllowlistPaths: inventory.legacyAllowlistPaths,
    scans: inventory.scans,
  });
  const defaultStateReport = await buildDefaultStateOwnershipReport();
  const defaultState = compareDefaultStateBaselines(
    loadedPolicy,
    defaultStateReport,
  );
  const currentProgressMetrics = {
    productionLegacyDirectFiles:
      validation.metrics.legacyDirectFiles.production,
    productionLegacyMemberships:
      validation.metrics.legacyMemberships.production,
    productionLegacyDynamicSites:
      validation.metrics.bindingScoped.sites.dynamic.production.legacyCombined,
    productionLegacyAliasSites:
      validation.metrics.bindingScoped.sites.alias.production.legacyCombined,
    productionLegacyAmbiguousSites:
      validation.metrics.bindingScoped.sites.ambiguous.production.legacyCombined,
    productionLegacyUnsupportedSites:
      validation.metrics.bindingScoped.sites.unsupported.production.legacyCombined,
  };
  const progression = validateStateWriterPolicyProgression({
    previousPolicy: loadedPolicy,
    phase: normalizedPhase,
    currentMetrics: currentProgressMetrics,
  });
  const policyLatestPhase = String(
    loadedPolicy?.progress?.latestPhase || "",
  ).trim();
  const sourceBaseSha = String(
    loadedPolicy?.baseline?.sourceBaseSha || "",
  ).trim();
  const identity = buildStateWriterVerificationIdentity({
    sourceBaseSha,
    requireClean,
  });
  const previousPolicyState = previousPolicy === undefined
    ? loadPreviousStateWriterPolicy({
      phase: normalizedPhase,
      trackedClean: identity.trackedClean,
    })
    : {
      revision: "injected",
      policy: previousPolicy,
      violations: [],
    };
  const transitionViolations = previousPolicyState.policy
    ? validateStateWriterPolicyTransition({
      previousPolicy: previousPolicyState.policy,
      currentPolicy: loadedPolicy,
    })
    : [];
  const frozenProgressViolations = previousPolicyState.policy
    ? []
    : validateFrozenP4ProgressCheckpoint(loadedPolicy);
  const violations = [
    ...validation.violations,
    ...inventory.unknownCandidateBindings.map((binding) => ({
      code: "unknown-candidate-binding",
      binding,
    })),
    ...inventory.stalePolicyBindings.map((binding) => ({
      code: "stale-policy-binding",
      binding,
    })),
    ...defaultState.violations,
    ...progression.violations,
    ...frozenProgressViolations,
    ...identity.violations,
    ...previousPolicyState.violations,
    ...transitionViolations,
    ...validateFrozenCloseoutTargets(loadedPolicy?.baselines),
    ...validateLegacyStateWriterSemanticAuthority({
      baseline: loadedPolicy?.baselines?.legacySemanticAuthority,
      writers: loadedPolicy?.writers,
    }).violations,
    ...(previousPolicyState.policy
      ? []
      : validateLegacyStateWriterSemanticLedger({
        baseline: loadedPolicy?.baselines?.legacySemanticAuthority,
        writers: loadedPolicy?.writers,
        retired:
          loadedPolicy?.progress?.retiredLegacySemanticAuthority,
      }).violations),
    ...validateTestDiagnosticBudget({
      baseline: loadedPolicy?.baselines?.testDiagnosticBudget,
      current: validation.metrics.bindingScoped.diagnostics.test,
    }),
  ];
  try {
    resolveGitCommitSha(sourceBaseSha);
  } catch (error) {
    violations.push({
      code: "source-base-sha-invalid",
      sourceBaseSha,
      message: error.message,
    });
  }
  if (policyLatestPhase !== normalizedPhase) {
    violations.push({
      code: "policy-phase-mismatch",
      requestedPhase: normalizedPhase,
      policyLatestPhase,
    });
  }
  const frozenMemberships =
    loadedPolicy?.baselines?.bindingScopedMemberships || {};
  const targets = loadedPolicy?.baselines?.closeoutTargets || {};
  violations.push(...buildStateWriterCloseoutTargetViolations({
    phase: normalizedPhase,
    currentMetrics: currentProgressMetrics,
    targets,
  }));
  return {
    schemaVersion: 1,
    phase: normalizedPhase,
    sourceBaseSha,
    verificationSha: identity.verificationSha,
    verificationIdentity: identity,
    policyPath: path
      .relative(PROJECT_ROOT, STATE_WRITER_POLICY_PATH)
      .replaceAll("\\", "/"),
    policyBaseline: loadedPolicy.baseline,
    verdict: violations.length ? "fail" : "pass",
    violations,
    metrics: {
      ...validation.metrics,
      policyWriters: loadedPolicy.writers.length,
      policyBindings: loadedPolicy.writers.reduce(
        (count, writer) => count + (writer.bindings || []).length,
        0,
      ),
      unknownCandidateBindings: inventory.unknownCandidateBindings.length,
      stalePolicyBindings: inventory.stalePolicyBindings.length,
    },
    frozenMetrics: {
      legacyDirectFiles: loadedPolicy?.baselines?.legacyDirectFiles || {},
      bindingScopedMemberships: frozenMemberships,
      bindingScopedSites:
        loadedPolicy?.baselines?.bindingScopedSites || {},
      testDiagnosticBudget:
        loadedPolicy?.baselines?.testDiagnosticBudget || null,
    },
    progress: {
      policy: loadedPolicy.progress || null,
      current: currentProgressMetrics,
      validation: progression,
      previousPolicyRevision: previousPolicyState.revision,
      transitionViolations,
    },
    targets,
    defaultState,
  };
}

export async function writeStateWriterPolicyReport(
  report,
  { jsonOut = "" } = {},
) {
  const outputPath = jsonOut
    ? path.resolve(PROJECT_ROOT, jsonOut)
    : path.join(
      DEFAULT_REPORT_ROOT,
      report.phase,
      "policy-report.json",
    );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return outputPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await buildStateWriterPolicyReport({
    phase: args.phase,
    requireClean: args.requireClean,
  });
  const outputPath = await writeStateWriterPolicyReport(report, {
    jsonOut: args.jsonOut,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(
      `P4 state writer policy ${report.verdict}: ${report.metrics.legacyDirectFiles.production} production + ${report.metrics.legacyDirectFiles.test} test legacy-direct files; report ${path.relative(PROJECT_ROOT, outputPath).replaceAll("\\", "/")}.`,
    );
    if (report.violations.length) {
      for (const violation of report.violations) {
        console.error(`  ${violation.code}: ${JSON.stringify(violation)}`);
      }
    }
  }
  process.exitCode = report.verdict === "pass" ? 0 : 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
