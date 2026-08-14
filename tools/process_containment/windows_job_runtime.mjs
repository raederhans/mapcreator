import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { compileWindowsJobRunner } from "../perf/williams_crossover_windows_runtime.mjs";

export const WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID = "SF_WINDOWS_JOB_V2";
export const WINDOWS_JOB_RUNNER_V2_SOURCE_PATH = fileURLToPath(
  new URL("./windows_job_runner_v2.cs", import.meta.url),
);
export const WINDOWS_JOB_RUNNER_V2_CORE_SOURCE_PATH = fileURLToPath(
  new URL("./windows_job_runner_core.cs", import.meta.url),
);
export const WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS = Object.freeze([
  WINDOWS_JOB_RUNNER_V2_SOURCE_PATH,
  WINDOWS_JOB_RUNNER_V2_CORE_SOURCE_PATH,
]);
export const WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS = Object.freeze([
  "tools/process_containment/windows_job_runner_v2.cs",
  "tools/process_containment/windows_job_runner_core.cs",
]);

const JSONL_MAX_BYTES = 16 * 1024;
const BOOTSTRAP_DECODED_LINE_MAX_BYTES = 64 * 1024;
const BOOTSTRAP_MAX_BYTES = 1024 * 1024;
const CANCEL_REASON_MAX_BYTES = 128;
const DEFAULT_OUTER_GRACE_MS = 10_000;
const DEFAULT_ESCALATION_GRACE_MS = 2_000;

function base64Line(value) {
  return Buffer.from(String(value ?? ""), "utf8").toString("base64");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function absolutePath(value) {
  return path.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || path.posix.isAbsolute(value);
}

function assertBoundedDecodedLine(value, label) {
  if (Buffer.byteLength(String(value), "utf8") > BOOTSTRAP_DECODED_LINE_MAX_BYTES) {
    throw new RangeError(`${label} exceeds the 64 KiB decoded-line limit`);
  }
}

function exactStringArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

export function encodeWindowsJobRunnerV2Spec({
  runId,
  parentPid = process.pid,
  pipeName,
  token,
  command,
  executablePath = command?.bin,
  cwd = command?.cwd,
  evidencePath,
  timeoutMs,
  args = command?.args || [],
} = {}) {
  if (!String(runId || "").trim()) throw new TypeError("runId is required");
  if (!positiveInteger(parentPid)) throw new TypeError("parentPid must be a positive integer");
  if (!String(pipeName || "").trim()) throw new TypeError("pipeName is required");
  if (!Buffer.isBuffer(token) && !(token instanceof Uint8Array)) throw new TypeError("token must be 32 bytes");
  if (token.byteLength !== 32) throw new TypeError("token must be 32 bytes");
  if (!String(executablePath || "").trim()) throw new TypeError("command executablePath is required");
  if (!String(cwd || "").trim()) throw new TypeError("cwd is required");
  if (!String(evidencePath || "").trim()) throw new TypeError("evidencePath is required");
  if (!absolutePath(cwd)) throw new TypeError("cwd must be absolute");
  if (!absolutePath(evidencePath)) throw new TypeError("evidencePath must be absolute");
  if (!positiveInteger(timeoutMs)) throw new TypeError("timeoutMs must be a positive integer");
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== "string")) {
    throw new TypeError("args must be an array of strings");
  }
  for (const [value, label] of [
    [runId, "runId"],
    [pipeName, "pipeName"],
    [executablePath, "executablePath"],
    [cwd, "cwd"],
    [evidencePath, "evidencePath"],
    ...args.map((argument, index) => [argument, `argument-${index}`]),
  ]) assertBoundedDecodedLine(value, label);
  const payload = [
    WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
    base64Line(runId),
    String(parentPid),
    base64Line(pipeName),
    Buffer.from(token).toString("base64"),
    base64Line(executablePath),
    base64Line(cwd),
    base64Line(evidencePath),
    String(timeoutMs),
    String(args.length),
    ...args.map(base64Line),
    "",
  ].join("\n");
  if (Buffer.byteLength(payload, "utf8") > BOOTSTRAP_MAX_BYTES) {
    throw new RangeError("Windows Job V2 bootstrap exceeds the 1 MiB limit");
  }
  return payload;
}

export function validateWindowsJobRunnerV2Evidence(evidence, {
  command = null,
  cwd = command?.cwd,
  runId = null,
  parentPid = process.pid,
  parentCreationTimeFileTime = null,
  helperPid = null,
  rootPid = null,
  timeoutMs = null,
} = {}) {
  const errors = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return ["job-v2-evidence.missing"];
  }
  const requireTrue = (value, field) => {
    if (value !== true) errors.push(`job-v2-evidence.${field}`);
  };
  const requireTimestamp = (value, field) => {
    if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
      errors.push(`job-v2-evidence.${field}`);
    }
  };
  if (evidence.schemaVersion !== 2) errors.push("job-v2-evidence.schemaVersion");
  if (evidence.kind !== "scenario-forge-windows-job-run") errors.push("job-v2-evidence.kind");
  if (evidence.protocolId !== WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID) errors.push("job-v2-evidence.protocolId");
  if (evidence.provider !== "windows-job-object") errors.push("job-v2-evidence.provider");
  if (evidence.status !== "complete") errors.push("job-v2-evidence.status");
  if (typeof evidence.primaryCause !== "string" || !evidence.primaryCause) errors.push("job-v2-evidence.primaryCause");
  if (!Array.isArray(evidence.secondaryCauses)) errors.push("job-v2-evidence.secondaryCauses");
  if (runId !== null && evidence.runId !== runId) errors.push("job-v2-evidence.runId");
  if (!["root-exit", "cancel-requested", "parent-death", "control-loss", "timeout"].includes(evidence.primaryCause)) {
    errors.push("job-v2-evidence.primaryCause");
  }
  if (Array.isArray(evidence.secondaryCauses) && evidence.secondaryCauses.some((cause) => typeof cause !== "string" || !cause)) {
    errors.push("job-v2-evidence.secondaryCauses");
  }
  for (const field of ["startedAt", "rootResumedAt", "cleanupStartedAt", "finishedAt"]) {
    requireTimestamp(evidence[field], field);
  }
  if (!positiveInteger(evidence.helperPid)) errors.push("job-v2-evidence.helperPid");
  if (helperPid !== null && evidence.helperPid !== helperPid) errors.push("job-v2-evidence.helperPid");

  if (evidence.parent?.pid !== parentPid) errors.push("job-v2-evidence.parent.pid");
  if (typeof evidence.parent?.creationTimeFileTime !== "string" || !evidence.parent.creationTimeFileTime) {
    errors.push("job-v2-evidence.parent.creationTimeFileTime");
  }
  if (parentCreationTimeFileTime !== null && evidence.parent?.creationTimeFileTime !== parentCreationTimeFileTime) {
    errors.push("job-v2-evidence.parent.creationTimeFileTime");
  }
  requireTrue(evidence.parent?.handleOpened, "parent.handleOpened");
  requireTrue(evidence.parent?.identityAcknowledged, "parent.identityAcknowledged");
  if (typeof evidence.parent?.deathObserved !== "boolean") errors.push("job-v2-evidence.parent.deathObserved");
  if ((evidence.primaryCause === "parent-death") !== (evidence.parent?.deathObserved === true)) {
    errors.push("job-v2-evidence.parent.deathObserved");
  }

  if (!positiveInteger(evidence.root?.pid)) errors.push("job-v2-evidence.root.pid");
  if (rootPid !== null && evidence.root?.pid !== rootPid) errors.push("job-v2-evidence.root.pid");
  if (typeof evidence.root?.creationTimeFileTime !== "string" || !evidence.root.creationTimeFileTime) {
    errors.push("job-v2-evidence.root.creationTimeFileTime");
  }
  if (!Number.isInteger(evidence.root?.exitCode)) errors.push("job-v2-evidence.root.exitCode");
  requireTrue(evidence.root?.createSuspended, "root.createSuspended");
  requireTrue(evidence.root?.assignedAtCreation, "root.assignedAtCreation");
  requireTrue(evidence.root?.assignedBeforeResume, "root.assignedBeforeResume");
  requireTrue(evidence.root?.rootInJobBeforeResume, "root.rootInJobBeforeResume");
  requireTrue(evidence.root?.resumed, "root.resumed");
  requireTrue(evidence.root?.terminationConfirmed, "root.terminationConfirmed");

  requireTrue(evidence.job?.killOnJobClose, "job.killOnJobClose");
  if (evidence.job?.breakawayAllowed !== false) errors.push("job-v2-evidence.job.breakawayAllowed");
  requireTrue(evidence.job?.jobListAtCreation, "job.jobListAtCreation");
  requireTrue(evidence.job?.terminateRequested, "job.terminateRequested");
  requireTrue(evidence.job?.terminateSucceeded, "job.terminateSucceeded");
  if (!Number.isInteger(evidence.job?.activeProcessesAtCleanupStart) || evidence.job.activeProcessesAtCleanupStart < 0) {
    errors.push("job-v2-evidence.job.activeProcessesAtCleanupStart");
  }
  if (evidence.job?.activeProcessesAfterCleanup !== 0) errors.push("job-v2-evidence.job.activeProcessesAfterCleanup");
  if (!Array.isArray(evidence.job?.processIdsAtCleanupStart)) errors.push("job-v2-evidence.job.processIdsAtCleanupStart");
  if (!Array.isArray(evidence.job?.remainingPids) || evidence.job.remainingPids.length !== 0) {
    errors.push("job-v2-evidence.job.remainingPids");
  }
  if (!Array.isArray(evidence.job?.unverifiedPids) || evidence.job.unverifiedPids.length !== 0) {
    errors.push("job-v2-evidence.job.unverifiedPids");
  }
  requireTrue(evidence.job?.jobCloseSucceeded, "job.jobCloseSucceeded");

  if (evidence.control?.transport !== "named-pipe-jsonl") errors.push("job-v2-evidence.control.transport");
  requireTrue(evidence.control?.authenticated, "control.authenticated");
  requireTrue(evidence.control?.startAcknowledged, "control.startAcknowledged");
  if (evidence.control?.cancelRequestId !== null && typeof evidence.control?.cancelRequestId !== "string") {
    errors.push("job-v2-evidence.control.cancelRequestId");
  }
  if (evidence.primaryCause === "cancel-requested" && typeof evidence.control?.cancelRequestId !== "string") {
    errors.push("job-v2-evidence.control.cancelRequestId");
  }
  if (evidence.primaryCause !== "cancel-requested" && evidence.control?.cancelRequestId !== null) {
    errors.push("job-v2-evidence.control.cancelRequestId");
  }
  requireTrue(evidence.control?.terminalMessagePrepared, "control.terminalMessagePrepared");
  if (!positiveInteger(evidence.timeoutMs)) errors.push("job-v2-evidence.timeoutMs");
  if (timeoutMs !== null && evidence.timeoutMs !== timeoutMs) errors.push("job-v2-evidence.timeoutMs");
  if (!Number.isInteger(evidence.cleanupWaitMs) || evidence.cleanupWaitMs < 0) errors.push("job-v2-evidence.cleanupWaitMs");
  if (command) {
    if (evidence.command?.executablePath !== command.bin) errors.push("job-v2-evidence.command.executablePath");
    if (evidence.command?.workingDirectory !== cwd) errors.push("job-v2-evidence.command.workingDirectory");
    if (!exactStringArray(evidence.command?.arguments, command.args || [])) {
      errors.push("job-v2-evidence.command.arguments");
    }
  }
  requireTrue(evidence.cleanupVerified, "cleanupVerified");
  if (evidence.error !== null) errors.push("job-v2-evidence.error");
  return [...new Set(errors)];
}

export async function prepareWindowsJobRunnerV2({
  platform = process.platform,
  buildRoot,
  compileFn = compileWindowsJobRunner,
} = {}) {
  if (platform !== "win32") {
    return Object.freeze({ status: "required-capability-missing", protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID, error: `platform=${platform}` });
  }
  try {
    const compiled = await compileFn({
      platform,
      buildRoot,
      sourcePaths: WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS,
      sourceIdentityPaths: WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS,
    });
    return Object.freeze({
      ...compiled,
      status: "available",
      protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
      sourcePaths: WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS,
      sourceIdentityPaths: WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS,
      runnerVersion: 2,
    });
  } catch (error) {
    return Object.freeze({
      status: "compile-error",
      protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
      error: String(error?.stack || error?.message || error),
    });
  }
}

function writeJsonLine(socket, message) {
  const bytes = Buffer.from(`${JSON.stringify(message)}\n`, "utf8");
  if (bytes.length > JSONL_MAX_BYTES) throw new Error("job-v2-control.message-too-large");
  socket.write(bytes);
}

export function spawnWindowsJobSession(command, {
  preparedRunner,
  cwd = command?.cwd,
  evidencePath,
  timeoutMs,
  parentPid = process.pid,
  env = process.env,
  runId = crypto.randomUUID(),
  outerGraceMs = DEFAULT_OUTER_GRACE_MS,
  escalationGraceMs = DEFAULT_ESCALATION_GRACE_MS,
  spawnFn = spawn,
  createServerFn = (listener) => net.createServer(listener),
  readFileFn = fs.readFile,
  rmFn = fs.rm,
  randomBytesFn = crypto.randomBytes,
  nowFn = () => new Date().toISOString(),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) {
  if (preparedRunner?.status !== "available" && preparedRunner?.status !== "compiled") {
    throw new Error(`Windows Job runner V2 is not prepared: ${preparedRunner?.status || "missing"}`);
  }
  if (!command || typeof command.bin !== "string" || !Array.isArray(command.args)) throw new TypeError("command is required");
  if (!String(cwd || "").trim()) throw new TypeError("cwd is required");
  if (!String(evidencePath || "").trim()) throw new TypeError("evidencePath is required");
  if (!absolutePath(cwd)) throw new TypeError("cwd must be absolute");
  if (!absolutePath(evidencePath)) throw new TypeError("evidencePath must be absolute");
  if (!positiveInteger(timeoutMs)) throw new TypeError("timeoutMs must be a positive integer");
  if (!positiveInteger(outerGraceMs)) throw new TypeError("outerGraceMs must be a positive integer");
  if (!positiveInteger(escalationGraceMs)) throw new TypeError("escalationGraceMs must be a positive integer");

  const facade = new EventEmitter();
  facade.stdout = new PassThrough();
  facade.stderr = new PassThrough();
  facade.stdin = null;
  facade.pid = null;
  facade.helperPid = null;
  facade.connected = false;
  facade.killed = false;

  const tokenBytes = Buffer.from(randomBytesFn(32));
  if (tokenBytes.length !== 32) throw new Error("job-v2 random token must contain 32 bytes");
  const authToken = tokenBytes.toString("base64");
  const pipeNonce = randomBytesFn(16).toString("hex");
  const pipeName = `\\\\.\\pipe\\scenario-forge-job-v2-${parentPid}-${pipeNonce}`;
  let helper = null;
  let socket = null;
  let server = null;
  let lineBuffer = Buffer.alloc(0);
  let expectedHelperSequence = 1;
  let nextNodeSequence = 2;
  let parentCreationTimeFileTime = null;
  let terminal = null;
  let helperClose = null;
  let helperExited = false;
  let settled = false;
  let settleStarted = false;
  let transportError = null;
  let cancelRequest = null;
  let started = false;
  let watchdog = null;
  let escalationWatchdog = null;
  const terminationDiagnostics = [];
  let containmentResult = null;
  let resolveCompletion;
  const completion = new Promise((resolve) => { resolveCompletion = resolve; });

  facade.getContainmentResult = () => containmentResult;
  facade.terminationDiagnostics = terminationDiagnostics;
  facade.completion = completion;
  facade.requestCancel = (request = {}) => {
    if (cancelRequest || terminal || settled || settleStarted) return false;
    const normalized = typeof request === "string" ? { requestedSignal: request } : request;
    const reasonCode = String(normalized.reasonCode || "explicit-cancel");
    const requestedSignal = normalized.requestedSignal == null
      ? "SIGTERM"
      : String(normalized.requestedSignal);
    if (!reasonCode || Buffer.byteLength(reasonCode, "utf8") > CANCEL_REASON_MAX_BYTES) {
      throw new RangeError("cancel reasonCode must contain at most 128 UTF-8 bytes");
    }
    if (!new Set(["SIGINT", "SIGTERM"]).has(requestedSignal)) {
      throw new TypeError("cancel requestedSignal must be SIGINT or SIGTERM");
    }
    cancelRequest = Object.freeze({
      requestId: crypto.randomUUID(),
      cause: "cancel-requested",
      reasonCode,
      requestedSignal,
      requestedAt: String(normalized.requestedAt || nowFn()),
    });
    sendCancelIfReady();
    return true;
  };
  facade.kill = (signal = "SIGTERM") => {
    facade.killed = facade.requestCancel({ requestedSignal: signal, reasonCode: "child-process-kill" }) || facade.killed;
    return facade.killed;
  };

  const closeResources = () => {
    if (watchdog) clearTimeoutFn(watchdog);
    watchdog = null;
    if (escalationWatchdog) clearTimeoutFn(escalationWatchdog);
    escalationWatchdog = null;
    try { socket?.destroy(); } catch {}
    try { server?.close(); } catch {}
  };

  const emitSettled = (result, code, signal = null) => {
    if (settled) return;
    settled = true;
    containmentResult = Object.freeze(result);
    closeResources();
    facade.emit("exit", code, signal);
    facade.emit("close", code, signal);
    resolveCompletion(containmentResult);
  };

  const blockedResult = (error, signal = null) => {
    const detail = String(error?.code || error?.message || error || "job-v2.unknown-error");
    return {
      containmentScope: "blocked",
      containmentStatus: "blocked",
      containmentAvailable: false,
      cleanupVerified: false,
      runId,
      pid: facade.pid,
      helperPid: facade.helperPid,
      signal,
      evidencePath,
      evidence: null,
      errors: [detail, ...terminationDiagnostics],
      error: detail,
    };
  };

  const recordTerminationDiagnostic = (value) => {
    const detail = String(value?.code || value?.message || value || "job-v2.helper-termination-unverified");
    if (!terminationDiagnostics.includes(detail)) terminationDiagnostics.push(detail);
  };

  const requestHelperTermination = () => {
    if (!helper || helperClose || helperExited || settled) return;
    try {
      if (helper.kill("SIGTERM") !== true) recordTerminationDiagnostic("job-v2.helper-kill-not-accepted");
    } catch (error) {
      recordTerminationDiagnostic(`job-v2.helper-kill-error:${String(error?.code || error?.message || error)}`);
    }
    if (escalationWatchdog) return;
    escalationWatchdog = setTimeoutFn(() => {
      escalationWatchdog = null;
      if (!helper || helperClose || helperExited || settled) return;
      try {
        if (helper.kill("SIGKILL") !== true) {
          recordTerminationDiagnostic("job-v2.helper-escalation-not-accepted");
        }
      } catch (error) {
        recordTerminationDiagnostic(`job-v2.helper-escalation-error:${String(error?.code || error?.message || error)}`);
      }
    }, escalationGraceMs);
  };

  const beginFailure = (error, { killHelper = false } = {}) => {
    if (settled) return;
    transportError ||= error instanceof Error ? error : new Error(String(error || "job-v2.unknown-error"));
    try { socket?.destroy(); } catch {}
    try { server?.close(); } catch {}
    if (killHelper) requestHelperTermination();
    if (!helper) {
      settleStarted = true;
      facade.stdout.end();
      facade.stderr.end();
      emitSettled(blockedResult(transportError), 3, null);
      return;
    }
    void maybeSettle();
  };

  const maybeSettle = async () => {
    if (settleStarted || settled || !helperClose || (!terminal && !transportError)) return;
    settleStarted = true;
    try {
      await Promise.all([
        finished(facade.stdout, { readable: false }).catch(() => null),
        finished(facade.stderr, { readable: false }).catch(() => null),
      ]);
      if (transportError) {
        emitSettled(blockedResult(transportError, helperClose.signal), 3, helperClose.signal);
        return;
      }
      const evidenceBytes = await readFileFn(evidencePath);
      const actualSha256 = sha256(evidenceBytes);
      if (!/^[a-f0-9]{64}$/i.test(String(terminal.evidenceSha256 || "")) || actualSha256 !== terminal.evidenceSha256) {
        throw new Error("job-v2-evidence.sha256");
      }
      const evidence = JSON.parse(evidenceBytes.toString("utf8"));
      const errors = validateWindowsJobRunnerV2Evidence(evidence, {
        command,
        cwd,
        runId,
        parentPid,
        parentCreationTimeFileTime,
        helperPid: facade.helperPid,
        rootPid: facade.pid,
        timeoutMs,
      });
      if (terminal.rootExitCode !== evidence.root?.exitCode) errors.push("job-v2-terminal.rootExitCode");
      if (terminal.cleanupVerified !== evidence.cleanupVerified) errors.push("job-v2-terminal.cleanupVerified");
      if (terminal.status !== evidence.status) errors.push("job-v2-terminal.status");
      if (terminal.primaryCause !== evidence.primaryCause) errors.push("job-v2-terminal.primaryCause");
      if (helperClose.code !== 0) errors.push(`job-v2-helper.exitCode:${helperClose.code}`);
      if (cancelRequest?.acceptance === true) {
        if (evidence.control?.cancelRequestId !== cancelRequest.requestId) errors.push("job-v2-evidence.control.cancelRequestId");
        if (evidence.primaryCause !== "cancel-requested") errors.push("job-v2-evidence.primaryCause");
      } else {
        if (evidence.control?.cancelRequestId !== null) errors.push("job-v2-evidence.control.cancelRequestId");
        if (
          cancelRequest?.acceptance === false
          && cancelRequest?.acknowledged === true
          && !evidence.secondaryCauses?.includes("cancel-requested")
        ) {
          errors.push("job-v2-evidence.secondaryCauses");
        }
      }
      const available = errors.length === 0;
      emitSettled({
        containmentScope: available ? "tree-contained" : "blocked",
        containmentStatus: available ? "tree-contained" : "blocked",
        containmentAvailable: available,
        cleanupVerified: available,
        runId,
        pid: facade.pid,
        helperPid: facade.helperPid,
        exitCode: available ? evidence.root.exitCode : 3,
        signal: helperClose.signal,
        evidencePath,
        evidence,
        evidenceSha256: actualSha256,
        errors,
        error: errors[0] || null,
      }, available ? evidence.root.exitCode : 3, helperClose.signal);
    } catch (error) {
      emitSettled({
        containmentScope: "blocked",
        containmentStatus: "blocked",
        containmentAvailable: false,
        cleanupVerified: false,
        runId,
        pid: facade.pid,
        helperPid: facade.helperPid,
        evidencePath,
        evidence: null,
        errors: [String(error?.code || error?.message || error)],
        error: String(error?.code || error?.message || error),
      }, 3, helperClose?.signal || null);
    }
  };

  const sendCancelIfReady = () => {
    if (!socket || !started || !cancelRequest || cancelRequest.sequence) return;
    const message = { schemaVersion: 2, protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID, runId, sequence: nextNodeSequence, type: "cancel", ...cancelRequest };
    nextNodeSequence += 2;
    cancelRequest = Object.freeze({ ...cancelRequest, sequence: message.sequence });
    try { writeJsonLine(socket, message); } catch (error) { beginFailure(error); }
  };

  const validateCommon = (message, type) => {
    if (message?.schemaVersion !== 2) throw new Error("job-v2-control.schemaVersion");
    if (message.protocolId !== WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID) throw new Error("job-v2-control.protocolId");
    if (message.runId !== runId) throw new Error("job-v2-control.runId");
    if (message.sequence !== expectedHelperSequence) throw new Error("job-v2-control.sequence");
    if (message.type !== type) throw new Error("job-v2-control.type");
    expectedHelperSequence += 2;
  };

  const receiveMessage = (message) => {
    if (!facade.connected) {
      validateCommon(message, "ready");
      if (message.authToken !== authToken) throw new Error("job-v2-control.authentication");
      if (message.helperPid !== facade.helperPid) throw new Error("job-v2-control.helperPid");
      if (message.parent?.pid !== parentPid || typeof message.parent?.creationTimeFileTime !== "string" || !message.parent.creationTimeFileTime) {
        throw new Error("job-v2-control.parentIdentity");
      }
      parentCreationTimeFileTime = message.parent.creationTimeFileTime;
      facade.connected = true;
      writeJsonLine(socket, {
        schemaVersion: 2,
        protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
        runId,
        sequence: nextNodeSequence,
        type: "start",
        parent: { pid: parentPid, creationTimeFileTime: parentCreationTimeFileTime },
        authToken,
      });
      nextNodeSequence += 2;
      return;
    }
    if (!started) {
      validateCommon(message, "started");
      if (message.helperPid !== facade.helperPid || !positiveInteger(message.rootPid)) throw new Error("job-v2-control.processIdentity");
      if (message.assignedAtCreation !== true || message.rootInJobBeforeResume !== true) throw new Error("job-v2-control.creationContainment");
      facade.pid = message.rootPid;
      started = true;
      facade.emit("spawn");
      sendCancelIfReady();
      return;
    }
    if (message.type === "cancel-accepted") {
      if (!cancelRequest || !cancelRequest.sequence || cancelRequest.acknowledged) {
        throw new Error("job-v2-control.cancelAcknowledgement");
      }
      validateCommon(message, "cancel-accepted");
      if (message.requestId !== cancelRequest.requestId || typeof message.accepted !== "boolean" || typeof message.primaryCause !== "string") {
        throw new Error("job-v2-control.cancelAcknowledgement");
      }
      cancelRequest = Object.freeze({
        ...cancelRequest,
        acknowledged: true,
        acceptance: message.accepted,
      });
      return;
    }
    validateCommon(message, "terminal");
    if (!Number.isInteger(message.rootExitCode) || typeof message.cleanupVerified !== "boolean" || typeof message.status !== "string" || typeof message.primaryCause !== "string") {
      throw new Error("job-v2-control.terminal");
    }
    terminal = message;
    void maybeSettle();
  };

  const onSocket = (acceptedSocket) => {
    if (socket) {
      acceptedSocket.destroy();
      return;
    }
    socket = acceptedSocket;
    socket.on("data", (chunk) => {
      if (settled) return;
      lineBuffer = Buffer.concat([lineBuffer, Buffer.from(chunk)]);
      let newline;
      while ((newline = lineBuffer.indexOf(0x0a)) >= 0) {
        const line = lineBuffer.subarray(0, newline);
        lineBuffer = lineBuffer.subarray(newline + 1);
        if (line.length === 0) continue;
        if (line.length > JSONL_MAX_BYTES) {
          beginFailure(new Error("job-v2-control.message-too-large"));
          return;
        }
        try { receiveMessage(JSON.parse(line.toString("utf8"))); } catch (error) { beginFailure(error); return; }
      }
      if (lineBuffer.length > JSONL_MAX_BYTES) beginFailure(new Error("job-v2-control.message-too-large"));
    });
    socket.once("error", beginFailure);
    socket.once("close", () => {
      if (!settled && !terminal) beginFailure(new Error("job-v2-control.closed-before-terminal"));
    });
  };

  try {
    server = createServerFn(onSocket);
    server.once("error", beginFailure);
    server.listen(pipeName, () => {
      if (settled) return;
      void rmFn(evidencePath, { force: true }).then(() => {
        if (settled) return;
        try {
          helper = spawnFn(preparedRunner.executablePath, [], {
            cwd,
            env,
            detached: true,
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"],
          });
          facade.helperPid = helper.pid;
          helper.stdout.pipe(facade.stdout);
          helper.stderr.pipe(facade.stderr);
          helper.once("error", beginFailure);
          helper.once("exit", () => {
            helperExited = true;
            if (escalationWatchdog) clearTimeoutFn(escalationWatchdog);
            escalationWatchdog = null;
          });
          helper.once("close", (code, signal) => {
            helperExited = true;
            helperClose = { code, signal };
            void maybeSettle();
          });
          helper.stdin.once("error", beginFailure);
          helper.stdin.end(encodeWindowsJobRunnerV2Spec({ runId, parentPid, pipeName, token: tokenBytes, command, cwd, evidencePath, timeoutMs }));
        } catch (error) {
          beginFailure(error);
        }
      }, beginFailure);
    });
    watchdog = setTimeoutFn(() => {
      watchdog = null;
      beginFailure(new Error("job-v2.outer-watchdog"), { killHelper: true });
    }, timeoutMs + outerGraceMs);
  } catch (error) {
    queueMicrotask(() => beginFailure(error));
  }
  return facade;
}
