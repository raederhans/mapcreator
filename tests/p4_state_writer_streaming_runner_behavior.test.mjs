import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  P4_STATE_WRITER_POLICY_RUN_MODE_ENV,
  P4_STATE_WRITER_POLICY_TEST_FILES,
  P4_STATE_WRITER_POLICY_FULL_PLAN_IDENTITY,
  P4_STATE_WRITER_POLICY_WINDOWS_JOB_TIMEOUT_MS,
  cleanupP4StateWriterPolicyWindowsJobSession,
  isOfficialP4StateWriterPolicyCanonicalAdmissionEligible,
  isOfficialP4StateWriterPolicyCanonicalReusable,
  resolveP4StateWriterPolicyArtifactPaths,
  resolveP4StateWriterPolicyExitCode,
  resolveP4StateWriterPolicyRun,
  readP4StateWriterPolicyWindowsJobContainmentResult,
  runP4StateWriterPolicyTestLifecycle,
  shouldUseP4StateWriterPolicyWindowsJobV2,
} from "../tools/run_p4_state_writer_policy_tests.mjs";

class FakeChild extends EventEmitter {
  constructor(pid = 4242) {
    super();
    this.pid = pid;
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.killCalls = [];
  }

  kill(signal) {
    this.killCalls.push(signal);
    return true;
  }
}

function createTarget() {
  const chunks = [];
  return {
    chunks,
    write(chunk) {
      chunks.push(Buffer.from(chunk));
      return true;
    },
    text() {
      return Buffer.concat(chunks).toString("utf8");
    },
  };
}

function createClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 14, 0, 0, tick++));
}

function createFixture(mode = "full") {
  const artifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "p4-state-writer-streaming-"),
  );
  const paths = resolveP4StateWriterPolicyArtifactPaths({
    mode,
    artifactRoot,
  });
  return {
    artifactRoot,
    paths,
    reportPath: paths.reportPath,
  };
}

const CLEAN_IDENTITY = Object.freeze({
  verificationSha: "1".repeat(40),
  verificationTreeSha: "2".repeat(40),
  workspaceClean: true,
  trackedClean: true,
  includesUntracked: true,
  workspaceStatus: "",
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validOfficialContainmentEvidence(completedArtifact) {
  return {
    schemaVersion: 2,
    kind: "scenario-forge-windows-job-run",
    protocolId: "SF_WINDOWS_JOB_V2",
    provider: "windows-job-object",
    runId: completedArtifact.runId,
    status: "complete",
    primaryCause: "root-exit",
    secondaryCauses: [],
    startedAt: "2026-08-14T00:00:00.000Z",
    rootResumedAt: "2026-08-14T00:00:00.010Z",
    cleanupStartedAt: "2026-08-14T00:00:00.020Z",
    finishedAt: "2026-08-14T00:00:00.030Z",
    helperPid: 4241,
    parent: {
      pid: completedArtifact.producerPid,
      creationTimeFileTime: "134000000000000000",
      handleOpened: true,
      identityAcknowledged: true,
      deathObserved: false,
    },
    root: {
      pid: completedArtifact.childPid,
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
    timeoutMs: P4_STATE_WRITER_POLICY_WINDOWS_JOB_TIMEOUT_MS,
    cleanupWaitMs: 0,
    command: {
      executablePath: process.execPath,
      workingDirectory: process.cwd(),
      arguments: ["--test", ...P4_STATE_WRITER_POLICY_TEST_FILES],
    },
    cleanupVerified: true,
    error: null,
  };
}

test("streaming runner publishes canonical TAP only after successful close", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical\n", "utf8");
  const child = new FakeChild();
  const stdoutTarget = createTarget();
  const stderrTarget = createTarget();
  let spawnInvocation = null;
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    testArguments: [
      "--test-name-pattern=fixture",
      "tests/state_writer_policy_manifest_behavior.test.mjs",
    ],
    mode: "focused",
    artifactRoot,
    runner(command, args, options) {
      spawnInvocation = { command, args, options };
      return child;
    },
    parentEnv: { FIXTURE_SECRET: "must-not-leak" },
    stdoutTarget,
    stderrTarget,
    signalSource: new EventEmitter(),
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  assert.equal(readJson(paths.runningPath).status, "running");
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");

  child.stdout.write(Buffer.from("TAP ver", "utf8"));
  child.stdout.write(Buffer.from("sion 13\n1..0\n", "utf8"));
  child.stderr.write(Buffer.from("warn", "utf8"));
  child.stderr.write(Buffer.from("ing\npartial", "utf8"));
  assert.equal(stdoutTarget.text(), "TAP version 13\n1..0\n");
  assert.equal(stderrTarget.text(), "warning\npartial");
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");
  assert.equal("stdout" in readJson(paths.runningPath), false);

  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "passed");
  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(paths.runningPath), false);
  assert.equal(
    fs.readFileSync(reportPath, "utf8"),
    [
      "TAP version 13",
      "1..0",
      "# stderr: warning",
      "# stderr: partial",
      "",
    ].join("\n"),
  );
  const completed = readJson(paths.completedPath);
  assert.equal(completed.schemaVersion, 1);
  assert.equal(completed.kind, "p4-state-writer-policy-run");
  assert.match(completed.runId, /^[0-9a-f-]{36}$/);
  assert.equal(completed.mode, "focused");
  assert.equal(completed.status, "passed");
  assert.equal(completed.childPid, 4242);
  assert.equal(completed.stdoutBytes, 20);
  assert.equal(completed.stderrBytes, 15);
  assert.equal(completed.reportTarget, path.resolve(reportPath));
  assert.equal(completed.containmentScope, "root-only");
  assert.equal(completed.cleanupVerified, false);
  assert.equal(completed.reusable, false);
  assert.equal(
    completed.canonicalSha256,
    createHash("sha256")
      .update(fs.readFileSync(reportPath, "utf8"))
      .digest("hex"),
  );
  assert.equal(JSON.stringify(completed).includes("must-not-leak"), false);
  assert.deepEqual(spawnInvocation.args, [
    "--test",
    "--test-name-pattern=fixture",
    "tests/state_writer_policy_manifest_behavior.test.mjs",
  ]);
  assert.equal(
    spawnInvocation.options.env[P4_STATE_WRITER_POLICY_RUN_MODE_ENV],
    "focused",
  );
});

test("nonzero and spawn failures preserve the previous canonical TAP", async (t) => {
  for (const failureKind of ["nonzero", "spawn-error"]) {
    const { artifactRoot, reportPath, paths } = createFixture("quick");
    t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
    fs.writeFileSync(reportPath, "trusted previous TAP\n", "utf8");
    const previousCompleted = `${JSON.stringify({
      status: "passed",
      canonicalSha256: "previous-hash",
    })}\n`;
    fs.writeFileSync(paths.completedPath, previousCompleted, "utf8");
    const child = new FakeChild();
    const lifecycle = runP4StateWriterPolicyTestLifecycle({
      testArguments: ["tests/state_writer_policy_behavior.test.mjs"],
      mode: "quick",
      artifactRoot,
      runner() {
        if (failureKind === "spawn-error") {
          throw new Error("fixture spawn failed");
        }
        return child;
      },
      stdoutTarget: createTarget(),
      stderrTarget: createTarget(),
      signalSource: new EventEmitter(),
      now: createClock(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    });
    if (failureKind === "nonzero") {
      child.stdout.write("TAP version 13\nnot ok 1\n");
      child.emit("close", 7, null);
    }
    const result = await lifecycle;
    assert.equal(result.status, "failed");
    assert.equal(
      fs.readFileSync(reportPath, "utf8"),
      "trusted previous TAP\n",
    );
    assert.equal(
      fs.readFileSync(paths.completedPath, "utf8"),
      previousCompleted,
    );
    assert.equal(fs.existsSync(paths.runningPath), false);
    const failed = readJson(paths.failedPath);
    assert.equal(failed.status, "failed");
    if (failureKind === "nonzero") {
      assert.equal(failed.exitCode, 7);
    } else {
      assert.equal(failed.error.message, "fixture spawn failed");
      assert.equal(failed.childPid, null);
    }
  }
});

test("parent signal uses the injectable root-only termination seam", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("full");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "trusted previous TAP\n", "utf8");
  const previousCompleted = "{\"status\":\"passed\",\"canonicalSha256\":\"old\"}\n";
  fs.writeFileSync(paths.completedPath, previousCompleted, "utf8");
  const child = new FakeChild();
  const signalSource = new EventEmitter();
  const terminateCalls = [];
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    testArguments: ["tests/state_writer_policy_behavior.test.mjs"],
    mode: "full",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource,
    terminateChild(target, signal) {
      terminateCalls.push({ target, signal });
      target.kill(signal);
    },
    containmentStatus: "root-only",
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  signalSource.emit("SIGTERM");
  assert.deepEqual(child.killCalls, ["SIGTERM"]);
  assert.equal(terminateCalls.length, 1);
  child.emit("close", null, "SIGTERM");
  const result = await lifecycle;
  assert.equal(result.status, "interrupted");
  assert.equal(result.signal, "SIGTERM");
  assert.equal(result.containmentScope, "root-only");
  assert.equal(readJson(paths.interruptedPath).containmentScope, "root-only");
  assert.equal(fs.readFileSync(reportPath, "utf8"), "trusted previous TAP\n");
  assert.equal(fs.readFileSync(paths.completedPath, "utf8"), previousCompleted);
});

test("mode artifacts are isolated and terminal events finalize once", async (t) => {
  const fixtureDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "p4-state-writer-streaming-modes-"),
  );
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
  const pathsByMode = new Map();
  for (const mode of ["full", "quick", "focused"]) {
    const paths = resolveP4StateWriterPolicyArtifactPaths({
      mode,
      artifactRoot: fixtureDir,
    });
    const { reportPath } = paths;
    pathsByMode.set(mode, paths);
    const child = new FakeChild();
    const lifecycle = runP4StateWriterPolicyTestLifecycle({
      mode,
      artifactRoot: fixtureDir,
      runner: () => child,
      stdoutTarget: createTarget(),
      stderrTarget: createTarget(),
      signalSource: new EventEmitter(),
      now: createClock(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    });
    child.stdout.write("TAP version 13\n1..0\n");
    child.emit("close", 0, null);
    const result = await lifecycle;
    const completedBefore = fs.readFileSync(paths.completedPath, "utf8");
    child.emit("error", new Error("late duplicate event"));
    child.emit("close", 9, null);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(result.status, "passed");
    assert.equal(
      fs.readFileSync(paths.completedPath, "utf8"),
      completedBefore,
    );
  }
  assert.equal(
    new Set([...pathsByMode.values()].map(({ runningPath }) => runningPath)).size,
    3,
  );
  assert.equal(
    new Set([...pathsByMode.values()].map(({ reportPath }) => reportPath)).size,
    3,
  );
});

test("report retention overflow fails closed and preserves canonical TAP", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "trusted previous TAP\n", "utf8");
  const child = new FakeChild();
  const terminateCalls = [];
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    maxReportBytes: 8,
    terminateChild(_child, signal) {
      terminateCalls.push(signal);
    },
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("123456789");
  assert.deepEqual(terminateCalls, ["SIGTERM"]);
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "failed");
  assert.equal(result.reportTruncated, true);
  assert.match(result.error.message, /reached the 8-byte limit/);
  assert.equal(fs.readFileSync(reportPath, "utf8"), "trusted previous TAP\n");
  assert.equal(readJson(paths.failedPath).stdoutTail, "12345678");
});

test("running metadata coalesces burst chunks through the injected scheduler", async (t) => {
  const { artifactRoot, paths } = createFixture("quick");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  const child = new FakeChild();
  const scheduled = [];
  const cancelled = [];
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "quick",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    scheduleUpdate(callback, delay) {
      const handle = { callback, delay, unref() {} };
      scheduled.push(handle);
      return handle;
    },
    cancelUpdate(handle) {
      cancelled.push(handle);
    },
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n");
  child.stdout.write("ok 1\n");
  child.stderr.write("fixture warning\n");
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 1000);
  assert.equal(readJson(paths.runningPath).stdoutBytes, 0);
  scheduled[0].callback();
  assert.equal(readJson(paths.runningPath).stdoutBytes, 20);
  child.stdout.write("1..1\n");
  assert.equal(scheduled.length, 2);
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "passed");
  assert.deepEqual(cancelled, [scheduled[1]]);
});

test("exit waits for split UTF-8 and logical stderr tails before close", async (t) => {
  const { artifactRoot, reportPath } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical\n", "utf8");
  const child = new FakeChild();
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  const snow = Buffer.from("雪", "utf8");
  child.stdout.write(Buffer.concat([
    Buffer.from("TAP version 13\n# ", "utf8"),
    snow.subarray(0, 1),
  ]));
  child.emit("exit", 0, null);
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");
  child.stdout.write(Buffer.concat([
    snow.subarray(1),
    Buffer.from("\n1..0\n", "utf8"),
  ]));
  child.stderr.write(Buffer.from("alpha\r", "utf8"));
  child.stderr.write(Buffer.from("\nbeta\rgamma\u0000tail", "utf8"));
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "passed");
  assert.equal(
    fs.readFileSync(reportPath, "utf8"),
    [
      "TAP version 13",
      "# 雪",
      "1..0",
      "# stderr: alpha",
      "# stderr: beta",
      "# stderr: gamma\\u0000tail",
      "",
    ].join("\n"),
  );
});

test("same-mode lock and stale running artifacts block before spawn", async (t) => {
  const { artifactRoot, paths } = createFixture("full");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  let spawnCalls = 0;
  fs.writeFileSync(paths.lockPath, "fixture owner\n", "utf8");
  await assert.rejects(
    runP4StateWriterPolicyTestLifecycle({
      mode: "full",
      artifactRoot,
      runner() {
        spawnCalls += 1;
        return new FakeChild();
      },
      verificationIdentityReader: () => CLEAN_IDENTITY,
    }),
    (error) => error?.code === "p4-state-writer-policy-run-lock-active",
  );
  assert.equal(spawnCalls, 0);
  fs.rmSync(paths.lockPath, { force: true });
  fs.writeFileSync(paths.runningPath, JSON.stringify({
    runId: "stale",
    status: "running",
  }), "utf8");
  await assert.rejects(
    runP4StateWriterPolicyTestLifecycle({
      mode: "full",
      artifactRoot,
      runner() {
        spawnCalls += 1;
        return new FakeChild();
      },
      verificationIdentityReader: () => CLEAN_IDENTITY,
    }),
    (error) => error?.code === "p4-state-writer-policy-stale-running-artifact",
  );
  assert.equal(spawnCalls, 0);
  fs.rmSync(paths.runningPath, { force: true });
  fs.writeFileSync(paths.publishingPath, JSON.stringify({
    runId: "stale-publishing",
    status: "publishing",
  }), "utf8");
  await assert.rejects(
    runP4StateWriterPolicyTestLifecycle({
      mode: "full",
      artifactRoot,
      runner() {
        spawnCalls += 1;
        return new FakeChild();
      },
      verificationIdentityReader: () => CLEAN_IDENTITY,
    }),
    (error) => error?.code === "p4-state-writer-policy-stale-running-artifact",
  );
  assert.equal(spawnCalls, 0);
});

test("partial sidecar acquisition rolls back its lock and owned files", async (t) => {
  const { artifactRoot, paths } = createFixture("quick");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  let spawnCalls = 0;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "openSync") return Reflect.get(target, property);
      return (filePath, ...args) => {
        if (path.resolve(filePath) === path.resolve(paths.runningStderrPath)) {
          const error = new Error("fixture running stderr acquisition failure");
          error.code = "EIO";
          throw error;
        }
        return target.openSync(filePath, ...args);
      };
    },
  });

  await assert.rejects(
    runP4StateWriterPolicyTestLifecycle({
      mode: "quick",
      artifactRoot,
      fsImpl,
      runner() {
        spawnCalls += 1;
        return new FakeChild();
      },
      verificationIdentityReader: () => CLEAN_IDENTITY,
    }),
    (error) => error?.code === "EIO",
  );

  assert.equal(spawnCalls, 0);
  assert.equal(fs.existsSync(paths.lockPath), false);
  assert.equal(fs.existsSync(paths.runningTapPath), false);
  assert.equal(fs.existsSync(paths.runningStderrPath), false);

  const child = new FakeChild();
  const retry = runP4StateWriterPolicyTestLifecycle({
    mode: "quick",
    artifactRoot,
    runner: () => child,
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  assert.equal((await retry).status, "passed");
});

test("partial lock metadata write rolls back the owned empty lock", async (t) => {
  const { artifactRoot, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  let failedLockWrite = false;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "writeFileSync") return Reflect.get(target, property);
      return (file, ...args) => {
        if (!failedLockWrite && typeof file === "number") {
          failedLockWrite = true;
          const error = new Error("fixture lock metadata write failure");
          error.code = "EIO";
          throw error;
        }
        return target.writeFileSync(file, ...args);
      };
    },
  });

  await assert.rejects(
    runP4StateWriterPolicyTestLifecycle({
      mode: "focused",
      artifactRoot,
      fsImpl,
      runner: () => new FakeChild(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    }),
    (error) => error?.code === "EIO",
  );

  assert.equal(fs.existsSync(paths.lockPath), false);
  assert.equal(fs.existsSync(paths.runningTapPath), false);
  assert.equal(fs.existsSync(paths.runningStderrPath), false);
});

test("error plus close and empty code-zero output fail once", async (t) => {
  for (const failureKind of ["error-close", "empty-success"]) {
    const { artifactRoot, reportPath, paths } = createFixture("quick");
    t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
    fs.writeFileSync(reportPath, "previous canonical\n", "utf8");
    const child = new FakeChild();
    const signalSource = new EventEmitter();
    const lifecycle = runP4StateWriterPolicyTestLifecycle({
      mode: "quick",
      artifactRoot,
      runner: () => child,
      stdoutTarget: createTarget(),
      stderrTarget: createTarget(),
      signalSource,
      now: createClock(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    });
    if (failureKind === "error-close") {
      const error = new Error("fixture child error");
      error.code = "fixture-child-error";
      child.emit("error", error);
      child.emit("exit", 0, null);
    }
    child.emit("close", 0, null);
    const result = await lifecycle;
    assert.equal(result.status, "failed");
    assert.equal(resolveP4StateWriterPolicyExitCode(result), 1);
    assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");
    assert.equal(fs.existsSync(paths.failedPath), true);
    assert.equal(signalSource.listenerCount("SIGINT"), 0);
    assert.equal(signalSource.listenerCount("SIGTERM"), 0);
    child.emit("close", 0, null);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(readJson(paths.failedPath).status, "failed");
  }
});

test("canonical publication failure rolls back the previous complete TAP", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical bytes\n", "utf8");
  const child = new FakeChild();
  let failedCanonicalRename = false;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "renameSync") return Reflect.get(target, property);
      return (source, destination) => {
        if (destination === reportPath && !failedCanonicalRename) {
          failedCanonicalRename = true;
          const error = new Error("fixture canonical rename failure");
          error.code = "EIO";
          throw error;
        }
        return target.renameSync(source, destination);
      };
    },
  });
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    fsImpl,
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "failed");
  assert.equal(resolveP4StateWriterPolicyExitCode(result), 1);
  assert.equal(
    fs.readFileSync(reportPath, "utf8"),
    "previous canonical bytes\n",
  );
  assert.equal(readJson(paths.failedPath).reusable, false);
});

test("full reusable evidence binds exact args, canonical bytes, and publication state", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("full");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  const testArguments = [...P4_STATE_WRITER_POLICY_TEST_FILES];
  const child = new FakeChild();
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    testArguments,
    mode: "full",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  await lifecycle;
  const localArtifact = readJson(paths.completedPath);
  const canonicalTap = fs.readFileSync(reportPath, "utf8");
  assert.equal(localArtifact.reusable, false);
  assert.equal(localArtifact.admissionEligible, false);
  const completedArtifact = {
    ...localArtifact,
    command: process.execPath,
    args: ["--test", ...P4_STATE_WRITER_POLICY_TEST_FILES],
    reportTarget: resolveP4StateWriterPolicyRun([]).reportPath,
    admissionCandidate: true,
    planIdentity: P4_STATE_WRITER_POLICY_FULL_PLAN_IDENTITY,
    planIdentityVerified: true,
    reusable: true,
    admissionEligible: false,
  };
  assert.equal(isOfficialP4StateWriterPolicyCanonicalReusable({
    completedArtifact,
    canonicalTap,
  }), true);
  for (const mutatedArtifact of [
    { ...completedArtifact, planIdentity: "sha256:wrong" },
    { ...completedArtifact, args: [...completedArtifact.args, "tests/drift.test.mjs"] },
    { ...completedArtifact, command: "node-from-another-runtime" },
    { ...completedArtifact, reportTarget: path.join(artifactRoot, "other.tap") },
    {
      ...completedArtifact,
      verificationIdentity: {
        ...completedArtifact.verificationIdentity,
        start: {
          ...completedArtifact.verificationIdentity.start,
          workspaceClean: false,
        },
      },
    },
  ]) {
    assert.equal(isOfficialP4StateWriterPolicyCanonicalReusable({
      completedArtifact: mutatedArtifact,
      canonicalTap,
    }), false);
  }
  assert.equal(isOfficialP4StateWriterPolicyCanonicalReusable({
    completedArtifact,
    canonicalTap: `${canonicalTap}# drift\n`,
  }), false);
  assert.equal(isOfficialP4StateWriterPolicyCanonicalReusable({
    completedArtifact,
    canonicalTap,
    publishingArtifact: { status: "publishing" },
  }), false);
  assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
    completedArtifact,
    canonicalTap,
  }), false);
  const admittedArtifact = {
    ...completedArtifact,
    containmentScope: "tree-contained",
    cleanupVerified: true,
    admissionEligible: true,
  };
  const containmentEvidence = validOfficialContainmentEvidence(admittedArtifact);
  admittedArtifact.containmentEvidence = containmentEvidence;
  admittedArtifact.containmentEvidenceSha256 = createHash("sha256")
    .update(`${JSON.stringify(containmentEvidence)}\r\n`)
    .digest("hex");
  assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
    completedArtifact: admittedArtifact,
    canonicalTap,
  }), true);
  assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
    completedArtifact: { ...admittedArtifact, containmentScope: "root-only" },
    canonicalTap,
  }), false);
  assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
    completedArtifact: { ...admittedArtifact, cleanupVerified: false },
    canonicalTap,
  }), false);
  for (const mutateEvidence of [
    (evidence) => { evidence.runId = "other-run"; },
    (evidence) => { evidence.root.pid += 1; },
    (evidence) => { evidence.command.arguments = []; },
    (evidence) => { evidence.job.activeProcessesAfterCleanup = 1; },
    (evidence) => { evidence.control.cancelRequestId = "cancelled"; },
  ]) {
    const mutatedEvidence = structuredClone(admittedArtifact.containmentEvidence);
    mutateEvidence(mutatedEvidence);
    const mutatedArtifact = {
      ...admittedArtifact,
      containmentEvidence: mutatedEvidence,
      containmentEvidenceSha256: createHash("sha256")
        .update(`${JSON.stringify(mutatedEvidence)}\r\n`)
        .digest("hex"),
    };
    assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
      completedArtifact: mutatedArtifact,
      canonicalTap,
    }), false);
  }
  assert.equal(isOfficialP4StateWriterPolicyCanonicalAdmissionEligible({
    completedArtifact: {
      ...admittedArtifact,
      containmentEvidenceSha256: "invalid",
    },
    canonicalTap,
  }), false);
});

test("Windows Job V2 is selected only for the exact official full plan", () => {
  assert.equal(shouldUseP4StateWriterPolicyWindowsJobV2({
    platform: "win32",
    fullPlan: true,
  }), true);
  assert.equal(shouldUseP4StateWriterPolicyWindowsJobV2({
    platform: "win32",
    fullPlan: false,
  }), false);
  assert.equal(shouldUseP4StateWriterPolicyWindowsJobV2({
    platform: "linux",
    fullPlan: true,
  }), false);
});

test("Windows Job V2 terminal causes fail closed before P4 publication", () => {
  const child = {
    getContainmentResult: () => ({
      containmentScope: "tree-contained",
      cleanupVerified: true,
      evidence: { primaryCause: "timeout" },
    }),
  };
  const timeout = readP4StateWriterPolicyWindowsJobContainmentResult(child);
  assert.equal(
    timeout.error.code,
    "p4-state-writer-policy-windows-job-v2-terminal-cause",
  );
  child.getContainmentResult = () => ({
    containmentScope: "tree-contained",
    cleanupVerified: true,
    evidence: { primaryCause: "cancel-requested" },
  });
  assert.equal(
    readP4StateWriterPolicyWindowsJobContainmentResult(child, {
      requestedSignal: "SIGTERM",
    }).error,
    undefined,
  );
  child.getContainmentResult = () => ({
    containmentScope: "tree-contained",
    cleanupVerified: true,
    evidence: { primaryCause: "root-exit" },
  });
  assert.equal(
    readP4StateWriterPolicyWindowsJobContainmentResult(child).error,
    undefined,
  );
});

test("completed Windows Job sessions remove their per-run containment sidecar", async () => {
  const removals = [];
  const session = {
    getContainmentResult: () => ({
      evidencePath: "C:\\runtime\\containment.fixture.json",
    }),
  };
  assert.equal(await cleanupP4StateWriterPolicyWindowsJobSession(session, {
    removeFile: async (...args) => { removals.push(args); },
  }), null);
  assert.deepEqual(removals, [[
    "C:\\runtime\\containment.fixture.json",
    { force: true },
  ]]);
  const diagnostic = await cleanupP4StateWriterPolicyWindowsJobSession(session, {
    removeFile: async () => {
      throw Object.assign(new Error("fixture cleanup failed"), { code: "EIO" });
    },
  });
  assert.deepEqual(diagnostic, {
    code: "EIO",
    message: "fixture cleanup failed",
  });
});

test("close-time containment evidence is embedded before canonical publication", async (t) => {
  const { artifactRoot, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  const child = new FakeChild();
  const evidence = { schemaVersion: 2, runId: "fixture-containment" };
  const evidenceSha256 = createHash("sha256")
    .update(`${JSON.stringify(evidence)}\r\n`)
    .digest("hex");
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    platform: "linux",
    runner: () => child,
    containmentResultReader: () => ({
      containmentScope: "tree-contained",
      cleanupVerified: true,
      evidence,
      evidenceSha256,
    }),
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  const result = await lifecycle;
  const completed = readJson(paths.completedPath);
  assert.equal(result.status, "passed");
  assert.equal(completed.containmentScope, "tree-contained");
  assert.equal(completed.cleanupVerified, true);
  assert.deepEqual(completed.containmentEvidence, evidence);
  assert.equal(completed.containmentEvidenceSha256, evidenceSha256);
  assert.equal(completed.admissionEligible, false);
});

test("full mode with a subset remains local and ineligible for reuse", async (t) => {
  for (const testArguments of [[], [P4_STATE_WRITER_POLICY_TEST_FILES[0]]]) {
    const { artifactRoot, paths } = createFixture("full");
    t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
    const child = new FakeChild();
    const lifecycle = runP4StateWriterPolicyTestLifecycle({
      testArguments,
      mode: "full",
      artifactRoot,
      runner: () => child,
      stdoutTarget: createTarget(),
      stderrTarget: createTarget(),
      signalSource: new EventEmitter(),
      now: createClock(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    });
    child.stdout.write("TAP version 13\n1..0\n");
    child.emit("close", 0, null);
    const result = await lifecycle;
    assert.equal(result.status, "passed");
    const completed = readJson(paths.completedPath);
    assert.equal(completed.admissionCandidate, false);
    assert.equal(completed.planIdentity, null);
    assert.equal(completed.reusable, false);
    assert.equal(completed.admissionEligible, false);
  }
});

test("custom reportPath owns one artifact family and invalid paths fail early", async (t) => {
  const artifactRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "p4-state-writer-custom-report-"),
  );
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  const reportPath = path.join(artifactRoot, "caller-owned.tap");
  const paths = resolveP4StateWriterPolicyArtifactPaths({
    mode: "focused",
    reportPath,
  });
  assert.equal(paths.reportPath, reportPath);
  assert.equal(paths.runningPath, path.join(artifactRoot, "caller-owned.running.json"));
  const child = new FakeChild();
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    reportPath,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  assert.equal((await lifecycle).status, "passed");
  assert.equal(fs.existsSync(reportPath), true);
  assert.throws(
    () => resolveP4StateWriterPolicyArtifactPaths({ mode: "unknown" }),
    (error) => error?.code === "p4-state-writer-policy-run-mode-invalid",
  );
  assert.throws(
    () => resolveP4StateWriterPolicyArtifactPaths({
      mode: "focused",
      reportPath: path.join(artifactRoot, "caller-owned.txt"),
    }),
    (error) => error?.code === "p4-state-writer-policy-report-path-invalid",
  );
});

test("post-spawn running write failure terminates root and waits for close", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("quick");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical\n", "utf8");
  const previousCompleted = "{\"status\":\"passed\",\"canonicalSha256\":\"old\"}\n";
  fs.writeFileSync(paths.completedPath, previousCompleted, "utf8");
  const child = new FakeChild();
  let failedRunningWrite = false;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "renameSync") return Reflect.get(target, property);
      return (source, destination) => {
        if (destination === paths.runningPath && !failedRunningWrite) {
          failedRunningWrite = true;
          const error = new Error("fixture running metadata failure");
          error.code = "EIO";
          throw error;
        }
        return target.renameSync(source, destination);
      };
    },
  });
  let settled = false;
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "quick",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    fsImpl,
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  lifecycle.then(() => { settled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(child.killCalls, ["SIGTERM"]);
  assert.equal(settled, false);
  child.stdout.write("tail after setup failure\n");
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "EIO");
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");
  assert.equal(fs.readFileSync(paths.completedPath, "utf8"), previousCompleted);
});

test("stderr framing expansion enforces the synthesized report cap", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical\n", "utf8");
  const child = new FakeChild();
  const terminateCalls = [];
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    maxReportBytes: 30,
    terminateChild(_child, signal) {
      terminateCalls.push(signal);
      return true;
    },
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.stderr.write("x\n");
  assert.deepEqual(terminateCalls, ["SIGTERM"]);
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "p4-state-writer-policy-report-limit-exceeded");
  assert.equal(result.stdoutBytes + result.stderrBytes < 30, true);
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical\n");
  assert.equal(fs.existsSync(paths.failedTapPath), false);
});

test("root termination rejection and throw remain interrupted with blocked containment", async (t) => {
  for (const terminationKind of ["false", "throw"]) {
    const { artifactRoot, paths } = createFixture("focused");
    t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
    const child = new FakeChild();
    const signalSource = new EventEmitter();
    const lifecycle = runP4StateWriterPolicyTestLifecycle({
      mode: "focused",
      artifactRoot,
      runner: () => child,
      stdoutTarget: createTarget(),
      stderrTarget: createTarget(),
      signalSource,
      terminateChild() {
        if (terminationKind === "false") return false;
        const error = new Error("fixture termination threw");
        error.code = "fixture-termination-threw";
        throw error;
      },
      now: createClock(),
      verificationIdentityReader: () => CLEAN_IDENTITY,
    });
    signalSource.emit("SIGTERM");
    child.emit("close", 0, "SIGTERM");
    const result = await lifecycle;
    assert.equal(result.status, "interrupted");
    assert.equal(result.containmentScope, "blocked");
    assert.equal(readJson(paths.interruptedPath).cleanupVerified, false);
    assert.equal(result.additionalDiagnostics.length > 0, true);
    assert.equal(fs.existsSync(paths.reportPath), false);
  }
});

test("completed publication failure restores prior canonical and identity sidecar", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  fs.writeFileSync(reportPath, "previous canonical bytes\n", "utf8");
  const previousCompleted = "{\"status\":\"passed\",\"canonicalSha256\":\"old\"}\n";
  fs.writeFileSync(paths.completedPath, previousCompleted, "utf8");
  const child = new FakeChild();
  let failedCompletedRename = false;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "renameSync") return Reflect.get(target, property);
      return (source, destination) => {
        if (destination === paths.completedPath && !failedCompletedRename) {
          failedCompletedRename = true;
          const error = new Error("fixture completed rename failure");
          error.code = "EIO";
          throw error;
        }
        return target.renameSync(source, destination);
      };
    },
  });
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    fsImpl,
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "failed");
  assert.equal(fs.readFileSync(reportPath, "utf8"), "previous canonical bytes\n");
  assert.equal(fs.readFileSync(paths.completedPath, "utf8"), previousCompleted);
  assert.equal(fs.existsSync(paths.publishingPath), false);
});

test("post-publication cleanup errors resolve as diagnostics", async (t) => {
  const { artifactRoot, reportPath, paths } = createFixture("focused");
  t.after(() => fs.rmSync(artifactRoot, { recursive: true, force: true }));
  const child = new FakeChild();
  let failedCleanup = false;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "unlinkSync") return Reflect.get(target, property);
      return (filePath) => {
        if (filePath === paths.runningTapPath && !failedCleanup) {
          failedCleanup = true;
          const error = new Error("fixture running sidecar cleanup failure");
          error.code = "EIO";
          throw error;
        }
        return target.unlinkSync(filePath);
      };
    },
  });
  const lifecycle = runP4StateWriterPolicyTestLifecycle({
    mode: "focused",
    artifactRoot,
    runner: () => child,
    stdoutTarget: createTarget(),
    stderrTarget: createTarget(),
    signalSource: new EventEmitter(),
    fsImpl,
    now: createClock(),
    verificationIdentityReader: () => CLEAN_IDENTITY,
  });
  child.stdout.write("TAP version 13\n1..0\n");
  child.emit("close", 0, null);
  const result = await lifecycle;
  assert.equal(result.status, "passed");
  assert.equal(result.additionalDiagnostics.some(
    (diagnostic) => diagnostic.code === "EIO",
  ), true);
  assert.equal(fs.existsSync(reportPath), true);
  assert.equal(fs.existsSync(paths.lockPath), false);
});
