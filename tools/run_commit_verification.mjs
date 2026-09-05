import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VERIFICATION_METADATA_SOURCE } from "./verification/verification_catalog_source.mjs";

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
  if (!registeredProductOnly) {
    commands.push(["npm", ["run", "verify:script-portfolio"]]);
  }
  // Keep this even for product edits: deleting a product module can break an
  // existing test import without modifying the test itself.
  commands.push(["npm", ["run", "verify:test-import-graph"]]);
  if (!registeredProductOnly) {
    commands.push(["node", ["tools/select_verification_targets.mjs", "--check"]]);
  }
  if (controlPlaneFiles.length > 0) {
    commands.push(["node", ["--test", ...entry.commitProjection.controlPlaneTestFiles]]);
  }
  if (productFiles.length > 0) {
    commands.push(["node", [
      "tools/run_adaptive_tests.mjs",
      "--entrypoint",
      "edit",
      "--execute",
      "--defer-main-thread",
      ...productFiles.flatMap((file) => ["--changed-file", file]),
    ]]);
  }
  return {
    commands,
    mode: [
      controlPlaneFiles.length > 0 ? "control-plane" : null,
      productFiles.length > 0 ? "adaptive-edit" : null,
    ].filter(Boolean).join("+") || "invariants-only",
  };
}

export function parsePorcelainChangedFiles(output) {
  const records = String(output || "").split("\0");
  const files = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    if (record.length < 4 || record[2] !== " ") {
      throw new Error("verify-commit-porcelain-malformed");
    }
    const status = record.slice(0, 2);
    const file = record.slice(3);
    if (!file) throw new Error("verify-commit-porcelain-path-missing");
    files.push(file);
    if (/[RC]/u.test(status)) {
      const previousPath = records[index + 1];
      if (!previousPath) throw new Error("verify-commit-porcelain-previous-path-missing");
      files.push(previousPath);
      index += 1;
    }
  }
  return [...new Set(files)].sort();
}

export function discoverChangedFiles({ runner = spawnSync, cwd = REPO_ROOT } = {}) {
  const result = runner("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  if (result?.status !== 0) throw new Error("verify-commit-changed-files-unavailable");
  return parsePorcelainChangedFiles(result.stdout);
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
  for (const [bin, args] of plan.commands) {
    const result = runCommand(runner, bin, args, { cwd, stdio: "inherit", shell: false });
    if (result?.status !== 0) return result?.status || 1;
  }
  return 0;
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
