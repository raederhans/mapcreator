import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { buildRecommendation } from "../select_verification_targets.mjs";

export const RESUMABLE_VERIFICATION_SCHEMA_VERSION = 2;
export const RESUMABLE_VERIFICATION_KIND = "resumable-verification";

const DEFAULT_CONTROL_SURFACES = Object.freeze([
  "package.json",
  "package-lock.json",
  "tools/run_core_verification.mjs",
  "tools/run_p4_phase_verification.mjs",
  "tools/run_adaptive_tests.mjs",
  "tools/select_verification_targets.mjs",
  "tools/test_route_registry.mjs",
  "tools/verification/resumable_verification.mjs",
  "tools/verification/verification_domains.mjs",
  "tools/verification/verification_metadata_helpers.mjs",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function runGit(args, { cwd, runner = spawnSync } = {}) {
  const result = runner("git", args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr || "").trim()}`);
  }
  return String(result.stdout || "");
}

export function captureVerificationIdentity({
  cwd = process.cwd(),
  runner = spawnSync,
} = {}) {
  const verificationSha = runGit(["rev-parse", "HEAD"], { cwd, runner }).trim();
  const verificationTreeSha = runGit(["rev-parse", "HEAD^{tree}"], { cwd, runner }).trim();
  const workspaceStatus = runGit(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd, runner },
  ).trimEnd();
  return Object.freeze({
    verificationSha,
    verificationTreeSha,
    workspaceClean: workspaceStatus === "",
    trackedClean: !workspaceStatus
      .split(/\r?\n/)
      .filter(Boolean)
      .some((line) => !line.startsWith("?? ")),
    includesUntracked: true,
    workspaceStatus,
  });
}

export function discoverChangedFilesBetween(baseSha, {
  cwd = process.cwd(),
  runner = spawnSync,
} = {}) {
  const normalizedBaseSha = String(baseSha || "").trim();
  if (!normalizedBaseSha) throw new Error("Resume checkpoint is missing its source revision.");
  return runGit(
    ["-c", "core.quotepath=false", "diff", "--name-only", "--diff-filter=ACMRD", "-z", normalizedBaseSha, "HEAD"],
    { cwd, runner },
  )
    .split("\0")
    .map((entry) => entry.trim().replaceAll("\\", "/"))
    .filter(Boolean)
    .sort();
}

export function buildPlanIdentity({ runnerId, entries }) {
  const commands = entries.map((entry, index) => ({
    index,
    group: String(entry.group || ""),
    commandRef: String(entry.commandRef || ""),
    command: String(entry.command || entry.commandRef || ""),
    commandType: String(entry.commandType || "direct"),
  }));
  const canonical = {
    runnerId: String(runnerId || ""),
    commands,
  };
  return Object.freeze({
    ...canonical,
    digest: sha256(stableJson(canonical)),
  });
}

export function atomicWriteJsonSync(filePath, value, {
  fsImpl = fs,
  tempSuffix = `${process.pid}-${crypto.randomUUID()}`,
} = {}) {
  const resolvedPath = path.resolve(filePath);
  fsImpl.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const tempPath = path.join(
    path.dirname(resolvedPath),
    `.${path.basename(resolvedPath)}.${tempSuffix}.tmp`,
  );
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  JSON.parse(serialized);
  let fd = null;
  try {
    fd = fsImpl.openSync(tempPath, "wx");
    fsImpl.writeFileSync(fd, serialized, "utf8");
    fsImpl.fsyncSync(fd);
    fsImpl.closeSync(fd);
    fd = null;
    JSON.parse(fsImpl.readFileSync(tempPath, "utf8"));
    fsImpl.renameSync(tempPath, resolvedPath);
  } catch (error) {
    if (fd !== null) {
      try { fsImpl.closeSync(fd); } catch {}
    }
    try { fsImpl.unlinkSync(tempPath); } catch (unlinkError) {
      if (unlinkError?.code !== "ENOENT") throw unlinkError;
    }
    throw error;
  }
}

export function readResumeCheckpoint(filePath, { fsImpl = fs } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(fsImpl.readFileSync(path.resolve(filePath), "utf8"));
  } catch (error) {
    const wrapped = new Error(`Resume checkpoint could not be read: ${error.message}`);
    wrapped.code = "checkpoint-invalid";
    throw wrapped;
  }
  return parsed;
}

export function normalizeVerificationIdentity(identity = {}) {
  const source = identity || {};
  return {
    ...source,
    workspaceClean: source.workspaceClean ?? source.trackedClean ?? false,
    includesUntracked: source.includesUntracked ?? true,
    workspaceStatus: source.workspaceStatus ?? source.trackedStatus ?? "",
  };
}

function sameCleanVerificationIdentity(actual, expected) {
  const normalizedActual = normalizeVerificationIdentity(actual);
  const normalizedExpected = normalizeVerificationIdentity(expected);
  return normalizedActual.workspaceClean
    && normalizedActual.verificationSha === normalizedExpected.verificationSha
    && normalizedActual.verificationTreeSha === normalizedExpected.verificationTreeSha;
}

function validatePassedEvidence(entry, index, expectedIdentity) {
  if (entry.status !== "passed") return false;
  if (entry.exitCode !== 0 || !entry.finishedAt || !Number.isFinite(entry.durationMs)) {
    const error = new Error(`Resume checkpoint has incomplete passed evidence at command index ${index}.`);
    error.code = "checkpoint-invalid";
    throw error;
  }
  const applicableIdentity = entry.evidenceValidatedForIdentity
    || entry.verificationIdentityAfter;
  if (!sameCleanVerificationIdentity(applicableIdentity, expectedIdentity)) {
    const error = new Error(`Resume checkpoint has unbound or drifted passed evidence at command index ${index}.`);
    error.code = "checkpoint-invalid";
    throw error;
  }
  if (entry.evidenceDisposition === "reused-after-sf-ats") {
    const executionIdentity = normalizeVerificationIdentity(entry.verificationIdentityAfter);
    if (
      !executionIdentity.workspaceClean
      || executionIdentity.verificationSha !== entry.sourceVerificationSha
    ) {
      const error = new Error(`Resume checkpoint has invalid source evidence at command index ${index}.`);
      error.code = "checkpoint-invalid";
      throw error;
    }
  } else if (!sameCleanVerificationIdentity(entry.verificationIdentityAfter, expectedIdentity)) {
    const error = new Error(`Resume checkpoint has drifted execution evidence at command index ${index}.`);
    error.code = "checkpoint-invalid";
    throw error;
  }
  return true;
}

function validateCheckpoint(checkpoint, { runnerId, planIdentity, checkpointKind }) {
  if (
    checkpoint?.schemaVersion !== RESUMABLE_VERIFICATION_SCHEMA_VERSION
    || checkpoint?.kind !== checkpointKind
    || checkpoint?.runnerId !== runnerId
  ) {
    const error = new Error("Resume checkpoint schema, kind, or runner identity is incompatible.");
    error.code = "checkpoint-invalid";
    throw error;
  }
  if (checkpoint?.planIdentity?.digest !== planIdentity.digest) {
    const error = new Error("Resume checkpoint command plan has changed.");
    error.code = "plan-drift";
    throw error;
  }
  if (!Array.isArray(checkpoint.commands) || checkpoint.commands.length !== planIdentity.commands.length) {
    const error = new Error("Resume checkpoint command count does not match the current plan.");
    error.code = "checkpoint-invalid";
    throw error;
  }
  if (!checkpoint?.verificationIdentity?.workspaceClean) {
    const error = new Error("Resume checkpoint was not produced from a clean workspace.");
    error.code = "checkpoint-workspace-dirty";
    throw error;
  }
  let passedPrefixEnded = false;
  checkpoint.commands.forEach((entry, index) => {
    const expected = planIdentity.commands[index];
    if (
      entry.index !== index
      || entry.commandRef !== expected.commandRef
      || entry.command !== expected.command
    ) {
      const error = new Error(`Resume checkpoint command identity drifted at index ${index}.`);
      error.code = "plan-drift";
      throw error;
    }
    const passed = validatePassedEvidence(entry, index, checkpoint.verificationIdentity);
    if (passed && passedPrefixEnded) {
      const error = new Error(`Resume checkpoint has a non-contiguous passed command at index ${index}.`);
      error.code = "checkpoint-invalid";
      throw error;
    }
    if (!passed) passedPrefixEnded = true;
  });
  const allPassed = checkpoint.commands.every((entry) => entry.status === "passed");
  if (
    allPassed
    && (
      checkpoint.verdict !== "pass"
      || !sameCleanVerificationIdentity(
        checkpoint.finalVerificationIdentity,
        checkpoint.verificationIdentity,
      )
    )
  ) {
    const error = new Error("Resume checkpoint has no valid final pass identity.");
    error.code = "checkpoint-invalid";
    throw error;
  }
}

function commandsMatchedByChangedFiles(recommendation) {
  const commandRefs = new Set();
  for (const fileEntry of recommendation.matchedByFile || []) {
    for (const command of fileEntry.recommendedCommands || []) {
      commandRefs.add(command.commandRef);
    }
  }
  return commandRefs;
}

function passedPrefixLength(commands, expectedIdentity) {
  let length = 0;
  for (let index = 0; index < commands.length; index += 1) {
    if (!validatePassedEvidence(commands[index], index, expectedIdentity)) break;
    length += 1;
  }
  return length;
}

function indexesBefore(limit) {
  return Array.from({ length: limit }, (_entry, index) => index);
}

export function decideResume({
  checkpoint,
  runnerId,
  planIdentity,
  verificationIdentity,
  changedFilesReader,
  selector = buildRecommendation,
  controlSurfaces = DEFAULT_CONTROL_SURFACES,
  checkpointKind = RESUMABLE_VERIFICATION_KIND,
}) {
  validateCheckpoint(checkpoint, { runnerId, planIdentity, checkpointKind });
  if (!verificationIdentity.workspaceClean) {
    return {
      mode: "blocked",
      blockReason: "workspace-dirty",
      reusedIndexes: [],
      changedFiles: [],
      unmatchedChangedFiles: [],
      invalidatedCommandRefs: [],
    };
  }

  const previousIdentity = checkpoint.verificationIdentity;
  const firstNonPassedIndex = passedPrefixLength(checkpoint.commands, previousIdentity);
  const exact = previousIdentity.verificationSha === verificationIdentity.verificationSha
    && previousIdentity.verificationTreeSha === verificationIdentity.verificationTreeSha;
  if (exact) {
    return {
      mode: "exact",
      blockReason: null,
      resumeIndex: firstNonPassedIndex,
      reusedIndexes: indexesBefore(firstNonPassedIndex),
      changedFiles: [],
      unmatchedChangedFiles: [],
      invalidatedCommandRefs: [],
      reasonCodes: [],
    };
  }

  const changedFiles = changedFilesReader(previousIdentity.verificationSha);
  if (changedFiles.length === 0) {
    return {
      mode: "sf-ats",
      blockReason: null,
      resumeIndex: 0,
      reusedIndexes: [],
      changedFiles,
      unmatchedChangedFiles: [],
      invalidatedCommandRefs: planIdentity.commands.map((entry) => entry.commandRef),
      reasonCodes: ["revision-drift-without-path-change"],
    };
  }
  const recommendation = selector(changedFiles);
  const unmatchedChangedFiles = [...(recommendation.unmatchedChangedFiles || [])];
  if (unmatchedChangedFiles.length > 0) {
    return {
      mode: "blocked",
      blockReason: "unmatched-changed-files",
      resumeIndex: 0,
      reusedIndexes: [],
      changedFiles,
      unmatchedChangedFiles,
      invalidatedCommandRefs: [],
      reasonCodes: ["unmatched-changed-files"],
    };
  }

  const controlSurfaceChanged = changedFiles.some((file) => controlSurfaces.includes(file));
  const matchedCommandRefs = commandsMatchedByChangedFiles(recommendation);
  const planCommandRefs = new Set(planIdentity.commands.map((entry) => entry.commandRef));
  const changedFileWithoutPlanIntersection = (recommendation.matchedByFile || []).some((fileEntry) => {
    const commands = fileEntry.recommendedCommands || [];
    return commands.length === 0 || commands.every((entry) => !planCommandRefs.has(entry.commandRef));
  });
  const fullRestart = controlSurfaceChanged || changedFileWithoutPlanIntersection;
  const invalidatedCommandRefs = fullRestart
    ? new Set(planIdentity.commands.map((entry) => entry.commandRef))
    : new Set([...matchedCommandRefs].filter((commandRef) => planCommandRefs.has(commandRef)));
  const earliestInvalidatedIndex = planIdentity.commands.findIndex((entry) => (
    invalidatedCommandRefs.has(entry.commandRef)
  ));
  const resumeIndex = earliestInvalidatedIndex < 0
    ? firstNonPassedIndex
    : Math.min(firstNonPassedIndex, earliestInvalidatedIndex);
  const reasonCodes = [];
  if (controlSurfaceChanged) reasonCodes.push("control-surface-changed");
  if (changedFileWithoutPlanIntersection) reasonCodes.push("changed-file-without-plan-intersection");
  return {
    mode: "sf-ats",
    blockReason: null,
    resumeIndex,
    reusedIndexes: indexesBefore(resumeIndex),
    changedFiles,
    unmatchedChangedFiles,
    invalidatedCommandRefs: [...invalidatedCommandRefs].sort(),
    reasonCodes,
  };
}

export function buildCommandStates(planIdentity, {
  checkpoint = null,
  resumeDecision = null,
  verificationIdentity = null,
} = {}) {
  const reused = new Set(resumeDecision?.reusedIndexes || []);
  return planIdentity.commands.map((entry) => {
    if (checkpoint && reused.has(entry.index)) {
      const previous = checkpoint.commands[entry.index];
      const currentIdentity = normalizeVerificationIdentity(
        verificationIdentity || checkpoint.verificationIdentity,
      );
      const retainsCrossRevisionProvenance = previous.evidenceDisposition === "reused-after-sf-ats"
        || !sameCleanVerificationIdentity(previous.verificationIdentityAfter, currentIdentity);
      return {
        ...previous,
        evidenceDisposition: retainsCrossRevisionProvenance || resumeDecision.mode !== "exact"
          ? "reused-after-sf-ats"
          : "reused-exact",
        lastReuseMode: resumeDecision.mode === "exact"
          ? "reused-exact"
          : "reused-after-sf-ats",
        sourceVerificationSha: previous.sourceVerificationSha
          || checkpoint.verificationIdentity.verificationSha,
        evidenceValidatedForIdentity: currentIdentity,
      };
    }
    return {
      ...entry,
      status: "pending",
      exitCode: null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      verificationIdentityAfter: null,
      evidenceValidatedForIdentity: null,
      evidenceDisposition: "current",
      lastReuseMode: null,
      attempt: Number(checkpoint?.commands?.[entry.index]?.attempt || 0),
    };
  });
}

export function runCheckpointedCommands({
  report,
  execute,
  checkpoint,
  identityReader = null,
  expectedVerificationIdentity = report.verificationIdentity,
  now = () => new Date(),
}) {
  for (const command of report.commands) {
    if (command.status === "passed") continue;
    const started = now();
    command.status = "running";
    command.attempt = Number(command.attempt || 0) + 1;
    command.startedAt = started.toISOString();
    command.finishedAt = null;
    command.durationMs = null;
    command.exitCode = null;
    report.verdict = "running";
    report.failedCommandRef = null;
    checkpoint(report);

    let result;
    try {
      result = execute(command);
    } catch (error) {
      result = { status: 1, error: error?.message || String(error) };
    }
    const finished = now();
    command.finishedAt = finished.toISOString();
    command.durationMs = Math.max(0, finished.getTime() - started.getTime());
    command.exitCode = Number.isInteger(result?.status) ? result.status : 1;
    if (result?.error) command.error = String(result.error);
    if (identityReader) {
      try {
        command.verificationIdentityAfter = normalizeVerificationIdentity(identityReader());
        command.evidenceValidatedForIdentity = command.verificationIdentityAfter;
      } catch (error) {
        command.verificationIdentityAfter = null;
        command.evidenceValidatedForIdentity = null;
        command.error = [command.error, `verification identity read failed: ${error?.message || String(error)}`]
          .filter(Boolean)
          .join("; ");
        if (command.exitCode === 0) command.exitCode = 2;
      }
    }
    if (
      command.exitCode === 0
      && normalizeVerificationIdentity(expectedVerificationIdentity).workspaceClean
      && !sameCleanVerificationIdentity(
        command.verificationIdentityAfter,
        expectedVerificationIdentity,
      )
    ) {
      command.exitCode = 2;
      command.error = [command.error, "verification identity drifted after command"]
        .filter(Boolean)
        .join("; ");
      report.blockReason = "verification-identity-drift";
    }
    command.status = command.exitCode === 0 ? "passed" : "failed";
    checkpoint(report);
    if (command.exitCode !== 0) {
      report.verdict = "failed";
      report.failedCommandRef = command.commandRef;
      checkpoint(report);
      break;
    }
  }
  return report.commands;
}

export function summarizeCommandStates(commands) {
  const summary = {
    passed: 0,
    failed: 0,
    pending: 0,
    running: 0,
    reused: 0,
    observedDurationMs: 0,
  };
  for (const command of commands || []) {
    if (command.status in summary) summary[command.status] += 1;
    if (String(command.evidenceDisposition || "").startsWith("reused")) summary.reused += 1;
    if (Number.isFinite(command.durationMs)) summary.observedDurationMs += command.durationMs;
  }
  return summary;
}
