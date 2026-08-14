import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { StringDecoder } from "node:string_decoder";
import {
  atomicWriteJsonSync,
  captureVerificationIdentity,
} from "./resumable_verification.mjs";

const DEFAULT_ARTIFACT_ROOT = path.join(
  process.cwd(),
  ".runtime",
  "reports",
  "generated",
  "p4-state-actions",
  "P4.0",
);
const RUN_ARTIFACT_SCHEMA_VERSION = 1;
const DEFAULT_REPORT_BUFFER_LIMIT = 64 * 1024 * 1024;
const DEFAULT_TERMINAL_TAIL_BYTES = 64 * 1024;
const DEFAULT_RUNNING_UPDATE_INTERVAL_MS = 1000;
const P4_STATE_WRITER_POLICY_RUN_MODES = Object.freeze([
  "full",
  "focused",
  "quick",
]);

export function buildP4StateWriterPolicyPlanIdentity(command, args) {
  if (typeof command !== "string" || !command || !Array.isArray(args)) {
    return null;
  }
  return `sha256:${createHash("sha256")
    .update(JSON.stringify({ command, args }))
    .digest("hex")}`;
}

function atomicWriteTextSync(filePath, text, {
  fsImpl = fs,
  tempSuffix = `${process.pid}-${randomUUID()}`,
} = {}) {
  const resolvedPath = path.resolve(filePath);
  fsImpl.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const tempPath = path.join(
    path.dirname(resolvedPath),
    `.${path.basename(resolvedPath)}.${tempSuffix}.tmp`,
  );
  let fd = null;
  try {
    fd = fsImpl.openSync(tempPath, "wx");
    fsImpl.writeFileSync(fd, String(text), "utf8");
    fsImpl.fsyncSync(fd);
    fsImpl.closeSync(fd);
    fd = null;
    if (fsImpl.readFileSync(tempPath, "utf8") !== String(text)) {
      throw new Error(`Atomic text verification failed for ${resolvedPath}.`);
    }
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

function removeFileIfPresent(filePath, fsImpl = fs) {
  try {
    fsImpl.unlinkSync(filePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export function resolveP4StateWriterPolicyArtifactPaths({
  mode = "full",
  artifactRoot = DEFAULT_ARTIFACT_ROOT,
  reportPath = null,
} = {}) {
  const normalizedMode = String(mode || "");
  if (!P4_STATE_WRITER_POLICY_RUN_MODES.includes(normalizedMode)) {
    const error = new Error(
      `Unsupported P4 state-writer policy run mode: ${normalizedMode || "<empty>"}.`,
    );
    error.code = "p4-state-writer-policy-run-mode-invalid";
    error.mode = normalizedMode;
    throw error;
  }
  let suffix;
  if (reportPath !== null && reportPath !== undefined) {
    if (typeof reportPath !== "string" || !reportPath.trim()) {
      const error = new Error("P4 state-writer policy report path must be a non-empty string.");
      error.code = "p4-state-writer-policy-report-path-invalid";
      throw error;
    }
    const resolvedReportPath = path.resolve(reportPath);
    if (path.extname(resolvedReportPath).toLowerCase() !== ".tap") {
      const error = new Error("P4 state-writer policy report path must end in .tap.");
      error.code = "p4-state-writer-policy-report-path-invalid";
      error.reportPath = resolvedReportPath;
      throw error;
    }
    suffix = resolvedReportPath.slice(0, -4);
  } else {
    const basename = normalizedMode === "full"
      ? "state-writer-policy-tests"
      : `state-writer-policy-tests.${normalizedMode}`;
    suffix = path.join(path.resolve(artifactRoot), basename);
  }
  return Object.freeze({
    reportPath: `${suffix}.tap`,
    lockPath: `${suffix}.lock`,
    runningPath: `${suffix}.running.json`,
    runningTapPath: `${suffix}.running.tap`,
    runningStderrPath: `${suffix}.running.stderr.log`,
    completedPath: `${suffix}.completed.json`,
    publishingPath: `${suffix}.publishing.json`,
    failedTapPath: `${suffix}.failed.tap`,
    failedPath: `${suffix}.failed.json`,
    interruptedTapPath: `${suffix}.interrupted.tap`,
    interruptedPath: `${suffix}.interrupted.json`,
  });
}

function escapeTapCommentText(value) {
  return String(value).replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export function frameP4StateWriterPolicyStderr(stderr) {
  const normalized = String(stderr || "");
  if (!normalized) return "";
  const lines = normalized.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") lines.pop();
  return lines
    .map((line) => `# stderr: ${escapeTapCommentText(line)}`)
    .join("\n");
}

export function buildCanonicalP4StateWriterPolicyTap(stdout, stderr) {
  const stderrComments = frameP4StateWriterPolicyStderr(stderr);
  const report = [
    String(stdout || "").trimEnd(),
    stderrComments,
  ].filter(Boolean).join("\n");
  return `${report}\n`;
}

function toErrorSummary(error) {
  if (!error) return null;
  return String(error?.message || error);
}

function toStructuredError(error) {
  if (!error) return null;
  return {
    code: String(error?.code || "p4-state-writer-policy-run-failed"),
    message: toErrorSummary(error),
  };
}

function normalizeVerificationIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    return {
      available: false,
      reason: "verification identity reader returned no identity",
    };
  }
  return {
    available: true,
    verificationSha: String(identity.verificationSha || ""),
    verificationTreeSha: String(identity.verificationTreeSha || ""),
    workspaceClean: identity.workspaceClean === true,
    trackedClean: identity.trackedClean === true,
    includesUntracked: identity.includesUntracked === true,
    workspaceStatus: String(identity.workspaceStatus || ""),
  };
}

function readVerificationIdentity(reader) {
  try {
    return normalizeVerificationIdentity(reader());
  } catch (error) {
    return {
      available: false,
      reason: toErrorSummary(error),
    };
  }
}

function identitiesSupportFullAdmission(startIdentity, endIdentity) {
  return startIdentity.available === true
    && endIdentity.available === true
    && startIdentity.workspaceClean === true
    && endIdentity.workspaceClean === true
    && startIdentity.includesUntracked === true
    && endIdentity.includesUntracked === true
    && startIdentity.verificationSha === endIdentity.verificationSha
    && startIdentity.verificationTreeSha
      === endIdentity.verificationTreeSha;
}

function decodeBuffers(buffers) {
  const decoder = new StringDecoder("utf8");
  const parts = buffers.map((buffer) => decoder.write(buffer));
  parts.push(decoder.end());
  return parts.join("");
}

function tailText(value, maxBytes) {
  const buffer = Buffer.from(String(value || ""), "utf8");
  if (buffer.length <= maxBytes) return buffer.toString("utf8");
  const decoder = new StringDecoder("utf8");
  return decoder.write(buffer.subarray(buffer.length - maxBytes))
    + decoder.end();
}

function buildLifecycleArtifact({
  runId,
  mode,
  args,
  command = process.execPath,
  reportTarget,
  startedAt,
  updatedAt,
  finishedAt = null,
  status,
  pid = null,
  exitCode = null,
  signal = null,
  error = null,
  additionalDiagnostics = [],
  stdoutBytes = 0,
  stderrBytes = 0,
  reportTruncated = false,
  containmentStatus = "root-only",
  cleanupVerified = false,
  startVerificationIdentity,
  endVerificationIdentity,
  reportBytes = 0,
  maxReportBytes,
  reusable = false,
  admissionEligible = false,
  admissionCandidate = false,
  planIdentity = null,
  planIdentityVerified = false,
  canonicalSha256 = null,
  stdoutTail = "",
  stderrTail = "",
}) {
  return {
    schemaVersion: RUN_ARTIFACT_SCHEMA_VERSION,
    kind: "p4-state-writer-policy-run",
    runId,
    mode,
    command,
    args: [...args],
    startedAt,
    updatedAt,
    finishedAt,
    status,
    producerPid: process.pid,
    childPid: Number.isInteger(pid) ? pid : null,
    exitCode: Number.isInteger(exitCode) ? exitCode : null,
    signal: signal ? String(signal) : null,
    error: toStructuredError(error),
    additionalDiagnostics: additionalDiagnostics.map(toStructuredError),
    stdoutBytes,
    stderrBytes,
    reportTruncated,
    reportBytes,
    maxReportBytes,
    containmentScope: containmentStatus,
    cleanupVerified,
    verificationIdentity: {
      start: startVerificationIdentity,
      end: endVerificationIdentity,
    },
    reusable,
    admissionEligible,
    admissionCandidate,
    planIdentity,
    planIdentityVerified,
    canonicalSha256,
    reportTarget,
    stdoutTail,
    stderrTail,
  };
}

export function isP4StateWriterPolicyCanonicalReusable({
  completedArtifact,
  canonicalTap,
  publishingArtifact = null,
  expectedMode = "full",
  expectedTestArguments = null,
  expectedCommand = null,
  expectedReportTarget = null,
  expectedPlanIdentity = null,
} = {}) {
  if (
    publishingArtifact !== null
    && publishingArtifact !== undefined
  ) return false;
  if (
    !completedArtifact
    || typeof completedArtifact !== "object"
    || typeof canonicalTap !== "string"
    || completedArtifact.schemaVersion !== RUN_ARTIFACT_SCHEMA_VERSION
    || completedArtifact.kind !== "p4-state-writer-policy-run"
    || completedArtifact.status !== "passed"
    || completedArtifact.mode !== expectedMode
    || completedArtifact.reusable !== true
    || completedArtifact.admissionCandidate !== true
    || completedArtifact.planIdentityVerified !== true
    || typeof completedArtifact.canonicalSha256 !== "string"
    || typeof expectedCommand !== "string"
    || !expectedCommand
    || completedArtifact.command !== expectedCommand
    || typeof expectedReportTarget !== "string"
    || !expectedReportTarget
    || completedArtifact.reportTarget !== path.resolve(expectedReportTarget)
    || typeof expectedPlanIdentity !== "string"
    || !expectedPlanIdentity
    || completedArtifact.planIdentity !== expectedPlanIdentity
  ) return false;
  if (!Array.isArray(expectedTestArguments)) return false;
  const expectedArgs = ["--test", ...expectedTestArguments];
  if (
    !Array.isArray(completedArtifact.args)
    || completedArtifact.args.length !== expectedArgs.length
    || completedArtifact.args.some((value, index) => value !== expectedArgs[index])
  ) return false;
  const identities = completedArtifact.verificationIdentity;
  if (!identitiesSupportFullAdmission(identities?.start, identities?.end)) {
    return false;
  }
  return createHash("sha256").update(canonicalTap).digest("hex")
    === completedArtifact.canonicalSha256;
}

export function isP4StateWriterPolicyCanonicalAdmissionEligible(options = {}) {
  return isP4StateWriterPolicyCanonicalReusable(options)
    && options.completedArtifact?.admissionEligible === true
    && options.completedArtifact?.containmentScope === "tree-contained"
    && options.completedArtifact?.cleanupVerified === true;
}

export function runP4StateWriterPolicyTestLifecycle({
  testArguments = [],
  mode = "full",
  artifactRoot = DEFAULT_ARTIFACT_ROOT,
  reportPath = null,
  command = process.execPath,
  commandArguments = ["--test", ...testArguments],
  spawnChild,
  stdoutTarget = process.stdout,
  stderrTarget = process.stderr,
  signalSource = process,
  terminateChild = (child, signal) => child.kill(signal),
  now = () => new Date(),
  maxReportBytes = DEFAULT_REPORT_BUFFER_LIMIT,
  terminalTailBytes = DEFAULT_TERMINAL_TAIL_BYTES,
  runningUpdateIntervalMs = DEFAULT_RUNNING_UPDATE_INTERVAL_MS,
  scheduleUpdate = (callback, delay) => setTimeout(callback, delay),
  cancelUpdate = (handle) => clearTimeout(handle),
  verificationIdentityReader = () => captureVerificationIdentity({
    cwd: process.cwd(),
  }),
  fsImpl = fs,
  containmentStatus = "root-only",
  cleanupVerified = false,
  admissionCandidate = false,
  fullPlanIdentity = null,
} = {}) {
  const artifactPaths = resolveP4StateWriterPolicyArtifactPaths({
    mode,
    artifactRoot,
    reportPath,
  });
  const startedAt = now().toISOString();
  const runId = randomUUID();
  const startVerificationIdentity = readVerificationIdentity(
    verificationIdentityReader,
  );
  const planIdentityVerified = admissionCandidate === true
    && fullPlanIdentity === buildP4StateWriterPolicyPlanIdentity(
      command,
      commandArguments,
    );
  let updatedAt = startedAt;
  let child = null;
  let finalized = false;
  let requestedSignal = null;
  let primaryError = null;
  let primaryErrorPriority = -1;
  const additionalDiagnostics = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let retainedBytes = 0;
  let reportTruncated = false;
  let reportBytes = 0;
  let effectiveContainmentStatus = containmentStatus;
  const stdoutChunks = [];
  const stderrChunks = [];
  const stdoutCountDecoder = new StringDecoder("utf8");
  const stderrCountDecoder = new StringDecoder("utf8");
  let stdoutSynthesizedBytes = 0;
  let stderrFramedBytes = 0;
  let stderrPending = "";
  let runningTapFd = null;
  let runningStderrFd = null;
  let runningTapCreated = false;
  let runningStderrCreated = false;
  let lockFd = null;
  let lockCreated = false;
  let claimed = false;
  let scheduledUpdate = null;
  let observedExitCode = null;
  let observedExitSignal = null;
  let terminationRequested = false;

  const setPrimaryError = (error, priority) => {
    if (!error) return;
    if (priority > primaryErrorPriority) {
      if (primaryError) additionalDiagnostics.push(primaryError);
      primaryError = error;
      primaryErrorPriority = priority;
    } else if (error !== primaryError) {
      additionalDiagnostics.push(error);
    }
  };

  const closeRunningStreams = () => {
    for (const key of ["runningTapFd", "runningStderrFd"]) {
      const fd = key === "runningTapFd" ? runningTapFd : runningStderrFd;
      if (fd === null) continue;
      try {
        fsImpl.fsyncSync(fd);
      } catch (error) {
        setPrimaryError(error, 90);
      }
      try {
        fsImpl.closeSync(fd);
      } catch (error) {
        setPrimaryError(error, 90);
      }
      if (key === "runningTapFd") runningTapFd = null;
      else runningStderrFd = null;
    }
  };

  const rollbackUnclaimedSidecars = () => {
    for (const [filePath, created] of [
      [artifactPaths.runningTapPath, runningTapCreated],
      [artifactPaths.runningStderrPath, runningStderrCreated],
    ]) {
      if (!created) continue;
      try {
        removeFileIfPresent(filePath, fsImpl);
      } catch (error) {
        additionalDiagnostics.push(error);
      }
    }
    runningTapCreated = false;
    runningStderrCreated = false;
  };

  const rollbackUnclaimedLock = () => {
    if (lockFd !== null) {
      try {
        fsImpl.closeSync(lockFd);
      } catch (error) {
        additionalDiagnostics.push(error);
      }
      lockFd = null;
    }
    if (!lockCreated) return;
    try {
      removeFileIfPresent(artifactPaths.lockPath, fsImpl);
    } catch (error) {
      additionalDiagnostics.push(error);
    }
    lockCreated = false;
  };

  const releaseLock = () => {
    if (lockFd !== null) {
      try {
        fsImpl.closeSync(lockFd);
      } catch (error) {
        additionalDiagnostics.push(error);
      }
      lockFd = null;
    }
    try {
      const owner = JSON.parse(fsImpl.readFileSync(artifactPaths.lockPath, "utf8"));
      if (owner.runId === runId) removeFileIfPresent(artifactPaths.lockPath, fsImpl);
    } catch (error) {
      if (error?.code !== "ENOENT") additionalDiagnostics.push(error);
    }
  };

  const assertPublishOwnership = () => {
    const owner = JSON.parse(fsImpl.readFileSync(artifactPaths.lockPath, "utf8"));
    if (owner.runId !== runId) {
      const error = new Error("State-writer policy run lost its mode lock.");
      error.code = "p4-state-writer-policy-run-lock-lost";
      throw error;
    }
  };

  const snapshot = (
    status,
    terminal = {},
  ) => buildLifecycleArtifact({
    runId,
    mode,
    args: commandArguments,
    command,
    reportTarget: artifactPaths.reportPath,
    startedAt,
    updatedAt,
    status,
    pid: child?.pid,
    stdoutBytes,
    stderrBytes,
    reportTruncated,
    reportBytes,
    maxReportBytes,
    containmentStatus: effectiveContainmentStatus,
    cleanupVerified,
    admissionCandidate,
    planIdentity: fullPlanIdentity,
    planIdentityVerified,
    startVerificationIdentity,
    endVerificationIdentity: null,
    additionalDiagnostics,
    ...terminal,
  });

  const writeRunning = () => {
    updatedAt = now().toISOString();
    atomicWriteJsonSync(
      artifactPaths.runningPath,
      snapshot("running"),
      { fsImpl },
    );
  };

  const scheduleRunningWrite = () => {
    if (scheduledUpdate !== null || finalized) return;
    try {
      scheduledUpdate = scheduleUpdate(() => {
        scheduledUpdate = null;
        if (finalized) return;
        try {
          writeRunning();
        } catch (error) {
          handleRuntimeIoError(error);
        }
      }, runningUpdateIntervalMs);
      scheduledUpdate?.unref?.();
    } catch (error) {
      handleRuntimeIoError(error);
    }
  };

  const requestRootTermination = (
    diagnostic = null,
    signal = "SIGTERM",
  ) => {
    if (diagnostic) additionalDiagnostics.push(diagnostic);
    if (terminationRequested || !child) return;
    terminationRequested = true;
    try {
      const accepted = terminateChild(child, signal);
      if (accepted === false) {
        const error = new Error(
          "P4 state-writer policy root-child termination request was rejected.",
        );
        error.code = "p4-state-writer-policy-root-termination-rejected";
        effectiveContainmentStatus = "blocked";
        additionalDiagnostics.push(error);
      }
    } catch (terminationError) {
      effectiveContainmentStatus = "blocked";
      additionalDiagnostics.push(terminationError);
    }
  };

  const handleRuntimeIoError = (error) => {
    setPrimaryError(error, 90);
    requestRootTermination();
  };

  const requestReportLimitTermination = () => {
    if (reportTruncated) return;
    reportTruncated = true;
    const error = new Error(
      `State-writer policy synthesized TAP reached the ${maxReportBytes}-byte limit.`,
    );
    error.code = "p4-state-writer-policy-report-limit-exceeded";
    setPrimaryError(error, 100);
    requestRootTermination();
  };

  const updateReportByteEstimate = () => {
    const pendingFrame = stderrPending
      ? `# stderr: ${escapeTapCommentText(stderrPending)}\n`
      : "";
    reportBytes = stdoutSynthesizedBytes
      + stderrFramedBytes
      + Buffer.byteLength(pendingFrame, "utf8");
    if (reportBytes >= maxReportBytes) requestReportLimitTermination();
  };

  const countStdoutChunk = (buffer) => {
    if (reportTruncated) return;
    stdoutSynthesizedBytes += Buffer.byteLength(
      stdoutCountDecoder.write(buffer),
      "utf8",
    );
    updateReportByteEstimate();
  };

  const countStderrChunk = (buffer) => {
    if (reportTruncated) return;
    stderrPending += stderrCountDecoder.write(buffer);
    while (true) {
      const match = /\r\n|\n|\r(?!$)/.exec(stderrPending);
      if (!match) break;
      const line = stderrPending.slice(0, match.index);
      const framed = `# stderr: ${escapeTapCommentText(line)}\n`;
      stderrFramedBytes += Buffer.byteLength(framed, "utf8");
      stderrPending = stderrPending.slice(match.index + match[0].length);
    }
    updateReportByteEstimate();
  };

  const retainChunk = (chunk, targetChunks) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remaining = Math.max(0, maxReportBytes - retainedBytes);
    if (remaining > 0) {
      targetChunks.push(buffer.subarray(0, remaining));
      retainedBytes += Math.min(buffer.length, remaining);
    }
    if (buffer.length > remaining) requestReportLimitTermination();
    return buffer;
  };

  const cleanupSignalHandlers = () => {
    if (typeof signalSource?.removeListener !== "function") return;
    signalSource.removeListener("SIGINT", onSigint);
    signalSource.removeListener("SIGTERM", onSigterm);
  };
  const onParentSignal = (signal) => {
    if (finalized || requestedSignal) return;
    requestedSignal = signal;
    requestRootTermination(null, signal);
    scheduleRunningWrite();
  };
  const onSigint = () => onParentSignal("SIGINT");
  const onSigterm = () => onParentSignal("SIGTERM");

  const acquireLockAndSidecars = () => {
    fsImpl.mkdirSync(path.dirname(artifactPaths.reportPath), { recursive: true });
    for (const stalePath of [
      artifactPaths.runningPath,
      artifactPaths.runningTapPath,
      artifactPaths.runningStderrPath,
      artifactPaths.publishingPath,
    ]) {
      if (fsImpl.existsSync(stalePath)) {
        const error = new Error(
          `Stale state-writer policy running artifact blocks ${mode}: ${path.basename(stalePath)}.`,
        );
        error.code = "p4-state-writer-policy-stale-running-artifact";
        error.path = stalePath;
        throw error;
      }
    }
    try {
      lockFd = fsImpl.openSync(artifactPaths.lockPath, "wx");
      lockCreated = true;
    } catch (error) {
      if (error?.code === "EEXIST") {
        const conflict = new Error(
          `Another ${mode} state-writer policy runner owns the mode lock.`,
        );
        conflict.code = "p4-state-writer-policy-run-lock-active";
        throw conflict;
      }
      throw error;
    }
    fsImpl.writeFileSync(lockFd, `${JSON.stringify({
      schemaVersion: 1,
      runId,
      mode,
      producerPid: process.pid,
      startedAt,
    })}\n`, "utf8");
    fsImpl.fsyncSync(lockFd);
    runningTapFd = fsImpl.openSync(artifactPaths.runningTapPath, "wx");
    runningTapCreated = true;
    runningStderrFd = fsImpl.openSync(artifactPaths.runningStderrPath, "wx");
    runningStderrCreated = true;
  };

  return new Promise((resolve, reject) => {
    const finalize = ({ exitCode = null, signal = null, spawnError = null } = {}) => {
      if (finalized) return;
      finalized = true;
      try {
        cleanupSignalHandlers();
      } catch (error) {
        setPrimaryError(error, 90);
      }
      if (scheduledUpdate !== null) {
        try {
          cancelUpdate(scheduledUpdate);
        } catch (error) {
          setPrimaryError(error, 90);
        }
        scheduledUpdate = null;
      }
      if (spawnError) setPrimaryError(spawnError, 30);
      try {
        writeRunning();
        closeRunningStreams();
      } catch (error) {
        setPrimaryError(error, 90);
      }
      const stdout = decodeBuffers(stdoutChunks);
      const stderr = decodeBuffers(stderrChunks);
      const diagnosticTap = buildCanonicalP4StateWriterPolicyTap(stdout, stderr);
      reportBytes = Buffer.byteLength(diagnosticTap, "utf8");
      if (reportBytes >= maxReportBytes && !reportTruncated) {
        reportTruncated = true;
        const error = new Error(
          `State-writer policy synthesized TAP reached the ${maxReportBytes}-byte limit.`,
        );
        error.code = "p4-state-writer-policy-report-limit-exceeded";
        setPrimaryError(error, 100);
      }
      if (exitCode !== null && exitCode !== 0) {
        const error = new Error(
          `P4 state-writer policy tests exited with status ${exitCode}.`,
        );
        error.code = "p4-state-writer-policy-test-nonzero";
        setPrimaryError(error, 20);
      }
      if (!spawnError && exitCode === 0 && !signal && !requestedSignal) {
        if (!/^TAP version \d+/m.test(stdout) || !/^1\.\.\d+/m.test(stdout)) {
          const error = new Error(
            "P4 state-writer policy success output lacks a TAP version or root plan.",
          );
          error.code = "p4-state-writer-policy-tap-incomplete";
          setPrimaryError(error, 40);
        }
      }
      const endVerificationIdentity = readVerificationIdentity(
        verificationIdentityReader,
      );
      const terminalSignal = signal || requestedSignal;
      const fullAdmissionIdentity = identitiesSupportFullAdmission(
        startVerificationIdentity,
        endVerificationIdentity,
      );
      if (
        admissionCandidate === true
        && mode === "full"
        && exitCode === 0
        && !terminalSignal
        && !primaryError
        && !fullAdmissionIdentity
      ) {
        const error = new Error(
          "Full state-writer policy run lacks an exact clean start/end verification identity.",
        );
        error.code = "p4-state-writer-policy-verification-identity-ineligible";
        setPrimaryError(error, 50);
      }
      const passed = exitCode === 0 && !terminalSignal && !primaryError;
      const status = passed
        ? "passed"
        : terminalSignal
          ? "interrupted"
          : "failed";
      const finishedAt = now().toISOString();
      updatedAt = finishedAt;
      const reusable = passed
        && admissionCandidate === true
        && mode === "full"
        && typeof fullPlanIdentity === "string"
        && Boolean(fullPlanIdentity)
        && planIdentityVerified
        && fullAdmissionIdentity;
      const admissionEligible = reusable
        && effectiveContainmentStatus === "tree-contained"
        && cleanupVerified === true;
      const canonicalSha256 = passed
        ? createHash("sha256").update(diagnosticTap).digest("hex")
        : null;
      const artifact = snapshot(status, {
        finishedAt,
        exitCode,
        signal: terminalSignal,
        error: primaryError,
        endVerificationIdentity,
        reusable,
        admissionEligible,
        canonicalSha256,
        stdoutTail: tailText(stdout, terminalTailBytes),
        stderrTail: tailText(stderr, terminalTailBytes),
      });
      let finalArtifact = artifact;
      let canonicalPublished = false;
      let attemptedCanonicalPublication = false;
      let previousCanonical = null;
      let previousCompleted = null;
      let previousCompletedCaptured = false;
      const restoreSnapshot = (filePath, contents) => {
        if (contents === null) removeFileIfPresent(filePath, fsImpl);
        else atomicWriteTextSync(filePath, contents, { fsImpl });
      };
      const removeWithDiagnostic = (filePath) => {
        try {
          removeFileIfPresent(filePath, fsImpl);
        } catch (error) {
          additionalDiagnostics.push(error);
        }
      };
      try {
        assertPublishOwnership();
        if (passed) {
          attemptedCanonicalPublication = true;
          previousCanonical = fsImpl.existsSync(artifactPaths.reportPath)
            ? fsImpl.readFileSync(artifactPaths.reportPath, "utf8")
            : null;
          previousCompleted = fsImpl.existsSync(artifactPaths.completedPath)
            ? fsImpl.readFileSync(artifactPaths.completedPath, "utf8")
            : null;
          previousCompletedCaptured = true;
          atomicWriteJsonSync(artifactPaths.publishingPath, {
            ...artifact,
            status: "publishing",
            reusable: false,
            admissionEligible: false,
          }, { fsImpl });
          atomicWriteTextSync(
            artifactPaths.reportPath,
            diagnosticTap,
            { fsImpl },
          );
          canonicalPublished = true;
          atomicWriteJsonSync(artifactPaths.completedPath, artifact, { fsImpl });
          removeFileIfPresent(artifactPaths.publishingPath, fsImpl);
          removeWithDiagnostic(artifactPaths.failedPath);
          removeWithDiagnostic(artifactPaths.failedTapPath);
          removeWithDiagnostic(artifactPaths.interruptedPath);
          removeWithDiagnostic(artifactPaths.interruptedTapPath);
        } else {
          const terminalTapPath = status === "interrupted"
            ? artifactPaths.interruptedTapPath
            : artifactPaths.failedTapPath;
          const terminalJsonPath = status === "interrupted"
            ? artifactPaths.interruptedPath
            : artifactPaths.failedPath;
          const boundedFailureTap = reportTruncated
            ? [
              "TAP version 13",
              `Bail out! ${primaryError?.code || "p4-state-writer-policy-run-failed"}`,
              "",
            ].join("\n")
            : diagnosticTap;
          if (
            Buffer.byteLength(boundedFailureTap, "utf8")
              < maxReportBytes
          ) {
            atomicWriteTextSync(terminalTapPath, boundedFailureTap, { fsImpl });
          }
          atomicWriteJsonSync(terminalJsonPath, artifact, { fsImpl });
        }
      } catch (publicationError) {
        setPrimaryError(publicationError, 95);
        if (canonicalPublished) {
          try {
            restoreSnapshot(artifactPaths.reportPath, previousCanonical);
          } catch (rollbackError) {
            additionalDiagnostics.push(rollbackError);
          }
        }
        if (attemptedCanonicalPublication && previousCompletedCaptured) {
          try {
            restoreSnapshot(artifactPaths.completedPath, previousCompleted);
          } catch (rollbackError) {
            additionalDiagnostics.push(rollbackError);
          }
        }
        if (attemptedCanonicalPublication) {
          removeWithDiagnostic(artifactPaths.publishingPath);
        }
        const publicationArtifact = snapshot("failed", {
          finishedAt,
          exitCode,
          signal: terminalSignal,
          error: primaryError,
          endVerificationIdentity,
          reusable: false,
          admissionEligible: false,
          stdoutTail: tailText(stdout, terminalTailBytes),
          stderrTail: tailText(stderr, terminalTailBytes),
        });
        finalArtifact = publicationArtifact;
        try {
          atomicWriteJsonSync(
            artifactPaths.failedPath,
            publicationArtifact,
            { fsImpl },
          );
        } catch (failureArtifactError) {
          additionalDiagnostics.push(failureArtifactError);
        }
      }
      if (finalArtifact.status === "passed" && !primaryError) {
        removeWithDiagnostic(artifactPaths.runningPath);
        removeWithDiagnostic(artifactPaths.runningTapPath);
        removeWithDiagnostic(artifactPaths.runningStderrPath);
      } else {
        removeWithDiagnostic(artifactPaths.runningPath);
      }
      releaseLock();
      resolve(Object.freeze({
        ...finalArtifact,
        status: finalArtifact.status,
        error: toStructuredError(primaryError),
        additionalDiagnostics: additionalDiagnostics.map(toStructuredError),
        reusable: finalArtifact.status === "passed" && !primaryError
          ? finalArtifact.reusable
          : false,
        admissionEligible: finalArtifact.status !== "passed" || primaryError
          ? false
          : finalArtifact.admissionEligible,
        artifactPaths,
      }));
    };

    try {
      acquireLockAndSidecars();
      claimed = true;
      if (typeof spawnChild !== "function") {
        const error = new Error("P4 state-writer policy lifecycle requires spawnChild.");
        error.code = "p4-state-writer-policy-spawn-child-required";
        throw error;
      }
      const spawnedChild = spawnChild();
      if (!spawnedChild || typeof spawnedChild.once !== "function") {
        const error = new Error("P4 state-writer policy spawnChild returned an invalid child.");
        error.code = "p4-state-writer-policy-child-invalid";
        throw error;
      }
      child = spawnedChild;
      child.once("close", (exitCode, signal) => finalize({
        exitCode: exitCode ?? observedExitCode,
        signal: signal || observedExitSignal,
      }));
      child.once("error", (error) => {
        if (finalized) return;
        setPrimaryError(error, 30);
        scheduleRunningWrite();
      });
      child.once("exit", (exitCode, signal) => {
        observedExitCode = exitCode;
        observedExitSignal = signal;
        scheduleRunningWrite();
      });
      child.stdout?.on("data", (chunk) => {
        try {
          const buffer = retainChunk(chunk, stdoutChunks);
          stdoutBytes += buffer.length;
          stdoutTarget?.write?.(buffer);
          countStdoutChunk(buffer);
          if (!reportTruncated && runningTapFd !== null) {
            fsImpl.writeSync(runningTapFd, buffer);
          }
          scheduleRunningWrite();
        } catch (error) {
          handleRuntimeIoError(error);
        }
      });
      child.stderr?.on("data", (chunk) => {
        try {
          const buffer = retainChunk(chunk, stderrChunks);
          stderrBytes += buffer.length;
          stderrTarget?.write?.(buffer);
          countStderrChunk(buffer);
          if (!reportTruncated && runningStderrFd !== null) {
            fsImpl.writeSync(runningStderrFd, buffer);
          }
          scheduleRunningWrite();
        } catch (error) {
          handleRuntimeIoError(error);
        }
      });
      if (typeof signalSource?.on === "function") {
        signalSource.on("SIGINT", onSigint);
        signalSource.on("SIGTERM", onSigterm);
      }
      writeRunning();
    } catch (error) {
      if (child && !finalized) {
        handleRuntimeIoError(error);
      } else if (claimed && !finalized) {
        finalize({ spawnError: error });
      } else if (!claimed) {
        closeRunningStreams();
        rollbackUnclaimedSidecars();
        rollbackUnclaimedLock();
        reject(error);
      }
    }
  });
}
