import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
  WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS,
  WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS,
  encodeWindowsJobRunnerV2Spec,
  prepareWindowsJobRunnerV2,
  spawnWindowsJobSession,
  validateWindowsJobRunnerV2Evidence,
} from "../tools/process_containment/windows_job_runtime.mjs";

function decode(value) {
  return Buffer.from(value, "base64").toString("utf8");
}

function validEvidence({ runId = "run-1", parentPid = 700, helperPid = 701, command, cwd, timeoutMs = 1_000 } = {}) {
  return {
    schemaVersion: 2,
    kind: "scenario-forge-windows-job-run",
    protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
    provider: "windows-job-object",
    runId,
    status: "complete",
    primaryCause: "root-exit",
    secondaryCauses: [],
    startedAt: "2026-08-14T00:00:00.000Z",
    rootResumedAt: "2026-08-14T00:00:00.010Z",
    cleanupStartedAt: "2026-08-14T00:00:00.020Z",
    finishedAt: "2026-08-14T00:00:00.030Z",
    helperPid,
    parent: {
      pid: parentPid,
      creationTimeFileTime: "134000000000000000",
      handleOpened: true,
      identityAcknowledged: true,
      deathObserved: false,
    },
    root: {
      pid: 702,
      creationTimeFileTime: "134000000000000001",
      exitCode: 0,
      createSuspended: true,
      assignedAtCreation: true,
      assignedBeforeResume: true,
      rootInJobBeforeResume: true,
      resumed: true,
      terminationConfirmed: true,
    },
    job: {
      killOnJobClose: true,
      breakawayAllowed: false,
      jobListAtCreation: true,
      terminateRequested: true,
      terminateSucceeded: true,
      activeProcessesAtCleanupStart: 0,
      activeProcessesAfterCleanup: 0,
      processIdsAtCleanupStart: [],
      remainingPids: [],
      unverifiedPids: [],
      jobCloseSucceeded: true,
    },
    control: {
      transport: "named-pipe-jsonl",
      authenticated: true,
      startAcknowledged: true,
      cancelRequestId: null,
      terminalMessagePrepared: true,
    },
    timeoutMs,
    cleanupWaitMs: 0,
    command: {
      executablePath: command.bin,
      workingDirectory: cwd,
      arguments: [...command.args],
    },
    cleanupVerified: true,
    error: null,
  };
}

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.writes = [];
    this.destroyed = false;
  }

  write(bytes) {
    this.writes.push(JSON.parse(Buffer.from(bytes).toString("utf8").trim()));
    return true;
  }

  send(message) {
    this.emit("data", Buffer.from(`${JSON.stringify(message)}\n`, "utf8"));
  }

  destroy() {
    this.destroyed = true;
  }
}

function createHarness({ evidenceBytes, readError = null } = {}) {
  const harnessState = { pipeName: null, server: null, socket: null, child: null, bootstrap: null, spawnOptions: null, evidenceBytes };
  const createServerFn = (listener) => {
    const server = new EventEmitter();
    server.listen = (pipeName, callback) => {
      harnessState.pipeName = pipeName;
      harnessState.server = server;
      queueMicrotask(callback);
    };
    server.close = () => {};
    server.accept = () => {
      const socket = new FakeSocket();
      harnessState.socket = socket;
      listener(socket);
      return socket;
    };
    return server;
  };
  const spawnFn = (_executablePath, _args, options) => {
    const child = new EventEmitter();
    child.pid = 701;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.stdin = new EventEmitter();
    child.stdin.end = (bootstrap) => { harnessState.bootstrap = bootstrap; };
    child.kill = () => { child.killCount = (child.killCount || 0) + 1; return true; };
    harnessState.child = child;
    harnessState.spawnOptions = options;
    return child;
  };
  return {
    state: harnessState,
    setEvidenceBytes: (value) => {
      harnessState.evidenceBytes = value;
    },
    seams: {
      createServerFn,
      spawnFn,
      rmFn: async () => {},
      readFileFn: async () => {
        if (readError) throw readError;
        return Buffer.from(harnessState.evidenceBytes || "", "utf8");
      },
      randomBytesFn: (size) => Buffer.alloc(size, size),
      setTimeoutFn: () => ({ fake: true }),
      clearTimeoutFn: () => {},
    },
  };
}

async function waitFor(predicate) {
  for (let index = 0; index < 50; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("condition did not become true");
}

function sendReady(socket, { runId = "run-1", parentPid = 700, token }) {
  socket.send({
    schemaVersion: 2,
    protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID,
    runId,
    sequence: 1,
    type: "ready",
    helperPid: 701,
    parent: { pid: parentPid, creationTimeFileTime: "134000000000000000" },
    authToken: token,
  });
}

function commonMessage(type, sequence, runId = "run-1") {
  return { schemaVersion: 2, protocolId: WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID, runId, sequence, type };
}

function bootstrapToken(bootstrap) {
  return bootstrap.trimEnd().split("\n")[4];
}

function closeChild(child, code = 0, signal = null) {
  child.stdout.end();
  child.stderr.end();
  child.emit("close", code, signal);
}

test("V2 source identity order and bootstrap encoding are exact and argv-lossless", () => {
  assert.equal(WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS.length, 2);
  assert.deepEqual(WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS, [
    "tools/process_containment/windows_job_runner_v2.cs",
    "tools/process_containment/windows_job_runner_core.cs",
  ]);
  const args = ["", "two words", "quoted\"value", "C:\\trailing\\"];
  const payload = encodeWindowsJobRunnerV2Spec({
    runId: "run with spaces",
    parentPid: 9,
    pipeName: "\\\\.\\pipe\\fixture",
    token: Buffer.alloc(32, 7),
    command: { bin: "C:\\Program Files\\node.exe", args },
    cwd: "C:\\work tree",
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 321,
  });
  const lines = payload.trimEnd().split("\n");
  assert.equal(lines[0], WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID);
  assert.equal(decode(lines[1]), "run with spaces");
  assert.equal(lines[2], "9");
  assert.equal(decode(lines[3]), "\\\\.\\pipe\\fixture");
  assert.deepEqual(Buffer.from(lines[4], "base64"), Buffer.alloc(32, 7));
  assert.equal(decode(lines[5]), "C:\\Program Files\\node.exe");
  assert.equal(decode(lines[6]), "C:\\work tree");
  assert.equal(decode(lines[7]), "C:\\evidence\\job.json");
  assert.equal(lines[8], "321");
  assert.equal(lines[9], String(args.length));
  assert.deepEqual(lines.slice(10).map(decode), args);
});

test("V2 bootstrap and cancel inputs enforce frozen byte, path, and signal bounds", () => {
  const base = {
    runId: "bounded-run",
    parentPid: 9,
    pipeName: "\\\\.\\pipe\\bounded",
    token: Buffer.alloc(32, 7),
    command: { bin: "C:\\Program Files\\node.exe", args: [] },
    cwd: "C:\\repo",
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 321,
  };
  assert.throws(() => encodeWindowsJobRunnerV2Spec({ ...base, cwd: "relative" }), /cwd must be absolute/);
  assert.throws(() => encodeWindowsJobRunnerV2Spec({ ...base, evidencePath: "job.json" }), /evidencePath must be absolute/);
  assert.throws(
    () => encodeWindowsJobRunnerV2Spec({ ...base, command: { ...base.command, args: ["x".repeat(64 * 1024 + 1)] } }),
    /decoded-line limit/,
  );
  assert.throws(
    () => encodeWindowsJobRunnerV2Spec({ ...base, command: { ...base.command, args: Array.from({ length: 17 }, () => "x".repeat(64 * 1024)) } }),
    /bootstrap exceeds the 1 MiB limit/,
  );
});

test("V2 validator rejects every frozen containment mutation", () => {
  const command = { bin: "node.exe", args: ["task.mjs"] };
  const cwd = "C:\\repo";
  const base = validEvidence({ command, cwd });
  assert.deepEqual(validateWindowsJobRunnerV2Evidence(base, { command, cwd, runId: "run-1", parentPid: 700, helperPid: 701, timeoutMs: 1_000 }), []);
  const mutations = [
    ["schemaVersion", (value) => { value.schemaVersion = 1; }],
    ["runId", (value) => { value.runId = "other"; }],
    ["parent.identityAcknowledged", (value) => { value.parent.identityAcknowledged = false; }],
    ["root.assignedAtCreation", (value) => { value.root.assignedAtCreation = false; }],
    ["job.activeProcessesAfterCleanup", (value) => { value.job.activeProcessesAfterCleanup = 1; }],
    ["job.terminateRequested", (value) => { value.job.terminateRequested = false; }],
    ["job.terminateSucceeded", (value) => { value.job.terminateSucceeded = false; }],
    ["job.remainingPids", (value) => { value.job.remainingPids = [99]; }],
    ["job.unverifiedPids", (value) => { value.job.unverifiedPids = [100]; }],
    ["job.jobCloseSucceeded", (value) => { value.job.jobCloseSucceeded = false; }],
    ["root.terminationConfirmed", (value) => { value.root.terminationConfirmed = false; }],
    ["control.authenticated", (value) => { value.control.authenticated = false; }],
    ["parent.deathObserved", (value) => { value.primaryCause = "parent-death"; }],
    ["control.cancelRequestId", (value) => { value.primaryCause = "cancel-requested"; }],
    ["cleanupVerified", (value) => { value.cleanupVerified = false; }],
    ["command.arguments", (value) => { value.command.arguments = []; }],
  ];
  for (const [field, mutate] of mutations) {
    const evidence = structuredClone(base);
    mutate(evidence);
    const errors = validateWindowsJobRunnerV2Evidence(evidence, { command, cwd, runId: "run-1", parentPid: 700, helperPid: 701, timeoutMs: 1_000 });
    assert.ok(errors.some((error) => error.endsWith(field)), `${field}: ${errors.join(", ")}`);
  }
});

test("V2 preparation compiles the explicit ordered source set and wraps its descriptor", async () => {
  let received = null;
  const cleanup = async () => {};
  const prepared = await prepareWindowsJobRunnerV2({
    platform: "win32",
    buildRoot: "C:\\build",
    compileFn: async (options) => {
      received = options;
      return { status: "compiled", executablePath: "runner.exe", binary: { sha256: "a".repeat(64) }, cleanup };
    },
  });
  assert.equal(prepared.status, "available");
  assert.equal(prepared.protocolId, WINDOWS_JOB_RUNNER_V2_PROTOCOL_ID);
  assert.equal(prepared.runnerVersion, 2);
  assert.equal(prepared.cleanup, cleanup);
  assert.deepEqual(received.sourcePaths, WINDOWS_JOB_RUNNER_V2_SOURCE_PATHS);
  assert.deepEqual(received.sourceIdentityPaths, WINDOWS_JOB_RUNNER_V2_SOURCE_IDENTITY_PATHS);
});

test("session authenticates ready/start, settles from durable evidence, and exposes synchronous close result", async () => {
  const command = { bin: "node.exe", args: ["task.mjs"] };
  const cwd = "C:\\repo";
  const evidence = validEvidence({ command, cwd });
  const evidenceText = JSON.stringify(evidence);
  const harness = createHarness({ evidenceBytes: evidenceText });
  const session = spawnWindowsJobSession(command, {
    preparedRunner: { status: "available", executablePath: "runner.exe" },
    cwd,
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 1_000,
    env: { FIXTURE_MODE: "full" },
    parentPid: 700,
    runId: "run-1",
    ...harness.seams,
  });
  await waitFor(() => harness.state.child);
  assert.deepEqual(harness.state.spawnOptions.env, { FIXTURE_MODE: "full" });
  assert.equal(JSON.stringify(harness.state.spawnOptions.env).includes("authToken"), false);
  assert.equal(harness.state.spawnOptions.detached, true, "helper must survive the Node owner long enough to publish parent-death evidence");
  const socket = harness.state.server.accept();
  sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
  assert.equal(socket.writes[0].type, "start");
  assert.equal(socket.writes[0].sequence, 2);
  assert.ok(socket.writes[0].authToken);
  assert.deepEqual(Object.keys(socket.writes[0]).sort(), [
    "authToken", "parent", "protocolId", "runId", "schemaVersion", "sequence", "type",
  ]);
  socket.send({ ...commonMessage("started", 3), helperPid: 701, rootPid: 702, assignedAtCreation: true, rootInJobBeforeResume: true });
  assert.equal(session.pid, 702);
  socket.send({
    ...commonMessage("terminal", 5),
    status: "complete",
    primaryCause: "root-exit",
    evidenceSha256: crypto.createHash("sha256").update(evidenceText).digest("hex"),
    rootExitCode: 0,
    cleanupVerified: true,
  });
  assert.equal(session.requestCancel({ reasonCode: "after-terminal" }), false);
  let closeResult = null;
  session.once("close", () => { closeResult = session.getContainmentResult(); });
  closeChild(harness.state.child);
  const result = await session.completion;
  assert.equal(result.containmentStatus, "tree-contained");
  assert.equal(result.cleanupVerified, true);
  assert.equal(closeResult, result);
});

test("first cancel wins and authenticated token is absent from cancel", async () => {
  const command = { bin: "node.exe", args: [] };
  const cwd = "C:\\repo";
  const evidence = validEvidence({ command, cwd });
  evidence.primaryCause = "cancel-requested";
  evidence.control.cancelRequestId = "placeholder";
  const harness = createHarness({ evidenceBytes: JSON.stringify(evidence) });
  const session = spawnWindowsJobSession(command, {
    preparedRunner: { status: "available", executablePath: "runner.exe" }, cwd, evidencePath: "C:\\evidence\\job.json", timeoutMs: 1_000,
    parentPid: 700, runId: "run-1", nowFn: () => "2026-08-14T00:00:00.000Z", ...harness.seams,
  });
  assert.throws(
    () => session.requestCancel({ reasonCode: "x".repeat(129), requestedSignal: "SIGINT" }),
    /at most 128 UTF-8 bytes/,
  );
  assert.throws(
    () => session.requestCancel({ reasonCode: "operator", requestedSignal: "SIGKILL" }),
    /must be SIGINT or SIGTERM/,
  );
  assert.equal(session.requestCancel({ reasonCode: "operator", requestedSignal: "SIGINT" }), true);
  assert.equal(session.requestCancel({ reasonCode: "second" }), false);
  await waitFor(() => harness.state.child);
  const socket = harness.state.server.accept();
  sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
  socket.send({ ...commonMessage("started", 3), helperPid: 701, rootPid: 702, assignedAtCreation: true, rootInJobBeforeResume: true });
  const cancel = socket.writes[1];
  assert.equal(cancel.type, "cancel");
  assert.equal(cancel.sequence, 4);
  assert.equal(cancel.reasonCode, "operator");
  assert.equal(cancel.requestedSignal, "SIGINT");
  assert.equal("authToken" in cancel, false);
  assert.deepEqual(Object.keys(cancel).sort(), [
    "cause", "protocolId", "reasonCode", "requestId", "requestedAt", "requestedSignal", "runId", "schemaVersion", "sequence", "type",
  ]);
  evidence.control.cancelRequestId = cancel.requestId;
  harness.setEvidenceBytes(JSON.stringify(evidence));
  socket.send({ ...commonMessage("cancel-accepted", 5), requestId: cancel.requestId, accepted: true, primaryCause: "cancel-requested" });
  socket.send({
    ...commonMessage("terminal", 7), status: "complete", primaryCause: "cancel-requested",
    evidenceSha256: crypto.createHash("sha256").update(harness.state.evidenceBytes).digest("hex"), rootExitCode: 0, cleanupVerified: true,
  });
  closeChild(harness.state.child);
  assert.equal((await session.completion).containmentScope, "tree-contained");
});

test("late rejected cancel remains secondary to root exit and preserves verified cleanup", async () => {
  const command = { bin: "node.exe", args: [] };
  const cwd = "C:\\repo";
  const evidence = validEvidence({ command, cwd });
  evidence.secondaryCauses = ["cancel-requested"];
  const harness = createHarness({ evidenceBytes: JSON.stringify(evidence) });
  const session = spawnWindowsJobSession(command, {
    preparedRunner: { status: "available", executablePath: "runner.exe" },
    cwd,
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 1_000,
    parentPid: 700,
    runId: "run-1",
    nowFn: () => "2026-08-14T00:00:00.000Z",
    ...harness.seams,
  });
  assert.equal(session.requestCancel({ reasonCode: "late-operator", requestedSignal: "SIGTERM" }), true);
  await waitFor(() => harness.state.child);
  const socket = harness.state.server.accept();
  sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
  socket.send({
    ...commonMessage("started", 3), helperPid: 701, rootPid: 702,
    assignedAtCreation: true, rootInJobBeforeResume: true,
  });
  const cancel = socket.writes[1];
  assert.equal(cancel.type, "cancel");
  socket.send({
    ...commonMessage("cancel-accepted", 5), requestId: cancel.requestId,
    accepted: false, primaryCause: "root-exit",
  });
  socket.send({
    ...commonMessage("terminal", 7), status: "complete", primaryCause: "root-exit",
    evidenceSha256: crypto.createHash("sha256").update(harness.state.evidenceBytes).digest("hex"),
    rootExitCode: 0, cleanupVerified: true,
  });
  closeChild(harness.state.child);
  const result = await session.completion;
  assert.equal(result.containmentScope, "tree-contained");
  assert.equal(result.cleanupVerified, true);
  assert.equal(result.evidence.primaryCause, "root-exit");
  assert.deepEqual(result.evidence.secondaryCauses, ["cancel-requested"]);
  assert.equal(result.evidence.control.cancelRequestId, null);
});

test("terminal can win an in-flight cancel without a cross-direction sequence collision", async () => {
  const command = { bin: "node.exe", args: [] };
  const cwd = "C:\\repo";
  const evidence = validEvidence({ command, cwd });
  const harness = createHarness({ evidenceBytes: JSON.stringify(evidence) });
  const session = spawnWindowsJobSession(command, {
    preparedRunner: { status: "available", executablePath: "runner.exe" },
    cwd,
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 1_000,
    parentPid: 700,
    runId: "run-1",
    ...harness.seams,
  });
  assert.equal(session.requestCancel({ reasonCode: "racing-cancel" }), true);
  await waitFor(() => harness.state.child);
  const socket = harness.state.server.accept();
  sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
  socket.send({
    ...commonMessage("started", 3), helperPid: 701, rootPid: 702,
    assignedAtCreation: true, rootInJobBeforeResume: true,
  });
  assert.equal(socket.writes[1].type, "cancel");
  assert.equal(socket.writes[1].sequence, 4);
  socket.send({
    ...commonMessage("terminal", 5), status: "complete", primaryCause: "root-exit",
    evidenceSha256: crypto.createHash("sha256")
      .update(harness.state.evidenceBytes)
      .digest("hex"),
    rootExitCode: 0, cleanupVerified: true,
  });
  closeChild(harness.state.child);
  const result = await session.completion;
  assert.equal(result.containmentScope, "tree-contained");
  assert.equal(result.cleanupVerified, true);
  assert.equal(result.evidence.primaryCause, "root-exit");
  assert.deepEqual(result.evidence.secondaryCauses, []);
  assert.equal(result.evidence.control.cancelRequestId, null);
});

test("missing and invalid evidence both settle blocked", async () => {
  for (const fixture of [
    { name: "missing", readError: Object.assign(new Error("ENOENT"), { code: "ENOENT" }) },
    { name: "invalid", evidenceBytes: "{" },
  ]) {
    const command = { bin: "node.exe", args: [] };
    const harness = createHarness(fixture);
    const session = spawnWindowsJobSession(command, {
      preparedRunner: { status: "available", executablePath: "runner.exe" }, cwd: "C:\\repo", evidencePath: "C:\\evidence\\job.json", timeoutMs: 1_000,
      parentPid: 700, runId: "run-1", ...harness.seams,
    });
    await waitFor(() => harness.state.child);
    const socket = harness.state.server.accept();
    sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
    socket.send({ ...commonMessage("started", 3), helperPid: 701, rootPid: 702, assignedAtCreation: true, rootInJobBeforeResume: true });
    const bytes = fixture.evidenceBytes || "missing";
    socket.send({ ...commonMessage("terminal", 5), status: "complete", primaryCause: "root-exit", evidenceSha256: crypto.createHash("sha256").update(bytes).digest("hex"), rootExitCode: 0, cleanupVerified: true });
    closeChild(harness.state.child);
    const result = await session.completion;
    assert.equal(result.containmentStatus, "blocked", fixture.name);
    assert.equal(result.cleanupVerified, false, fixture.name);
  }
});

test("helper error followed by close settles exactly once", async () => {
  const harness = createHarness({ evidenceBytes: "{}" });
  const session = spawnWindowsJobSession({ bin: "node.exe", args: [] }, {
    preparedRunner: { status: "available", executablePath: "runner.exe" }, cwd: "C:\\repo", evidencePath: "C:\\evidence\\job.json", timeoutMs: 1_000,
    parentPid: 700, runId: "run-1", ...harness.seams,
  });
  let closeCount = 0;
  let completed = false;
  let stdout = "";
  session.on("close", () => { closeCount += 1; });
  session.stdout.setEncoding("utf8");
  session.stdout.on("data", (chunk) => { stdout += chunk; });
  session.completion.then(() => { completed = true; });
  await waitFor(() => harness.state.child);
  harness.state.child.emit("error", new Error("spawn channel failed"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false, "helper error must wait for helper close and stdio drain");
  harness.state.child.stdout.write("tail-after-error");
  closeChild(harness.state.child, 1);
  await session.completion;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closeCount, 1);
  assert.equal(stdout, "tail-after-error");
  assert.equal(session.getContainmentResult().containmentStatus, "blocked");
});

test("protocol authentication failure waits for helper close and preserves tail output", async () => {
  const harness = createHarness({ evidenceBytes: "{}" });
  const session = spawnWindowsJobSession({ bin: "node.exe", args: [] }, {
    preparedRunner: { status: "available", executablePath: "runner.exe" }, cwd: "C:\\repo", evidencePath: "C:\\evidence\\job.json", timeoutMs: 1_000,
    parentPid: 700, runId: "run-1", ...harness.seams,
  });
  let completed = false;
  let stdout = "";
  session.completion.then(() => { completed = true; });
  session.stdout.setEncoding("utf8");
  session.stdout.on("data", (chunk) => { stdout += chunk; });
  await waitFor(() => harness.state.child);
  const socket = harness.state.server.accept();
  sendReady(socket, { token: "wrong-token" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  harness.state.child.stdout.write("protocol-tail");
  closeChild(harness.state.child, 3);
  const result = await session.completion;
  assert.equal(result.containmentScope, "blocked");
  assert.equal(stdout, "protocol-tail");
});

test("outer watchdog records rejected termination and performs one bounded escalation", async () => {
  for (const fixture of [
    {
      name: "initial-false-escalation-throw",
      killResults: [false, Object.assign(new Error("denied"), { code: "EPERM" })],
      expected: ["job-v2.helper-kill-not-accepted", "job-v2.helper-escalation-error:EPERM"],
    },
    {
      name: "initial-throw-escalation-false",
      killResults: [Object.assign(new Error("gone"), { code: "ESRCH" }), false],
      expected: ["job-v2.helper-kill-error:ESRCH", "job-v2.helper-escalation-not-accepted"],
    },
  ]) {
    const timers = [];
    const harness = createHarness({ evidenceBytes: "{}" });
    const session = spawnWindowsJobSession({ bin: "node.exe", args: [] }, {
      preparedRunner: { status: "available", executablePath: "runner.exe" },
      cwd: "C:\\repo",
      evidencePath: "C:\\evidence\\job.json",
      timeoutMs: 1_000,
      outerGraceMs: 10,
      escalationGraceMs: 10,
      parentPid: 700,
      runId: `run-${fixture.name}`,
      ...harness.seams,
      setTimeoutFn: (callback, delay) => {
        const timer = { callback, delay, cleared: false };
        timers.push(timer);
        return timer;
      },
      clearTimeoutFn: (timer) => { timer.cleared = true; },
    });
    let completed = false;
    session.completion.then(() => { completed = true; });
    await waitFor(() => harness.state.child);
    let killIndex = 0;
    harness.state.child.kill = () => {
      const result = fixture.killResults[killIndex++];
      if (result instanceof Error) throw result;
      return result;
    };
    assert.equal(timers.length, 1, fixture.name);
    timers[0].callback();
    assert.equal(timers.length, 2, fixture.name);
    assert.equal(completed, false, fixture.name);
    timers[1].callback();
    assert.deepEqual(session.terminationDiagnostics, fixture.expected, fixture.name);
    assert.equal(completed, false, fixture.name);
    closeChild(harness.state.child, 3);
    const result = await session.completion;
    assert.equal(result.containmentStatus, "blocked", fixture.name);
    for (const diagnostic of fixture.expected) assert.ok(result.errors.includes(diagnostic), fixture.name);
  }
});

test("helper exit cancels PID escalation while close-only settlement waits for stream drain", async () => {
  const timers = [];
  let killCalls = 0;
  const harness = createHarness({ evidenceBytes: "{}" });
  const session = spawnWindowsJobSession({ bin: "node.exe", args: [] }, {
    preparedRunner: { status: "available", executablePath: "runner.exe" },
    cwd: "C:\\repo",
    evidencePath: "C:\\evidence\\job.json",
    timeoutMs: 1_000,
    outerGraceMs: 10,
    escalationGraceMs: 10,
    parentPid: 700,
    runId: "run-exit-before-close",
    ...harness.seams,
    setTimeoutFn: (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn: (timer) => { timer.cleared = true; },
  });
  let completed = false;
  session.completion.then(() => { completed = true; });
  await waitFor(() => harness.state.child);
  harness.state.child.kill = () => { killCalls += 1; return true; };
  timers[0].callback();
  assert.equal(timers.length, 2);
  harness.state.child.emit("exit", 3, null);
  assert.equal(timers[1].cleared, true);
  timers[1].callback();
  assert.equal(killCalls, 1);
  assert.equal(completed, false);
  closeChild(harness.state.child, 3);
  assert.equal((await session.completion).containmentStatus, "blocked");
});

test("terminal evidence hash mismatch blocks containment", async () => {
  const command = { bin: "node.exe", args: [] };
  const cwd = "C:\\repo";
  const evidenceText = JSON.stringify(validEvidence({ command, cwd }));
  const harness = createHarness({ evidenceBytes: evidenceText });
  const session = spawnWindowsJobSession(command, {
    preparedRunner: { status: "available", executablePath: "runner.exe" }, cwd, evidencePath: "C:\\evidence\\job.json", timeoutMs: 1_000,
    parentPid: 700, runId: "run-1", ...harness.seams,
  });
  await waitFor(() => harness.state.child);
  const socket = harness.state.server.accept();
  sendReady(socket, { token: bootstrapToken(harness.state.bootstrap) });
  socket.send({ ...commonMessage("started", 3), helperPid: 701, rootPid: 702, assignedAtCreation: true, rootInJobBeforeResume: true });
  socket.send({ ...commonMessage("terminal", 5), status: "complete", primaryCause: "root-exit", evidenceSha256: "f".repeat(64), rootExitCode: 0, cleanupVerified: true });
  closeChild(harness.state.child);
  const result = await session.completion;
  assert.equal(result.containmentStatus, "blocked");
  assert.ok(result.errors.includes("job-v2-evidence.sha256"));
});
