import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  collectWindowsPerformanceWindow,
  prepareWindowsJobRunner,
  runWindowsJobCommand,
} from "../tools/perf/williams_crossover_windows_runtime.mjs";

function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

test("Windows Job runner preserves argv and kills a detached descendant on Job close", {
  skip: process.platform === "win32" ? false : "Windows Job Objects require win32",
}, async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "williams-job-runner-integration-"));
  let preparation = null;
  t.after(async () => {
    if (preparation?.status === "available") await preparation.cleanup();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  preparation = await prepareWindowsJobRunner({
    buildRoot: path.join(tempRoot, "build"),
    evidenceDirectory: path.join(tempRoot, "capability"),
  });
  assert.equal(preparation.status, "available", preparation.error);

  const expectedArgs = ["", "two words", "say\"hello", "C:\\path with space\\"];
  const rootScript = [
    "const { spawn } = require('node:child_process');",
    "const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "child.unref();",
    "process.stdout.write(JSON.stringify({ argv: process.argv.slice(1), childPid: child.pid }) + '\\n');",
    "process.stderr.write('job-root-stderr\\n');",
    "setTimeout(() => process.exit(7), 250);",
  ].join(" ");
  const result = await runWindowsJobCommand(
    { bin: process.execPath, args: ["-e", rootScript, ...expectedArgs] },
    {
      preparedRunner: preparation,
      cwd: tempRoot,
      stdoutPath: path.join(tempRoot, "root.stdout.log"),
      stderrPath: path.join(tempRoot, "root.stderr.log"),
      evidencePath: path.join(tempRoot, "root.job.json"),
      timeoutMs: 10_000,
    },
  );

  assert.equal(result.containmentStatus, "available", result.containmentErrors?.join("\n"));
  assert.equal(result.exitCode, 7);
  assert.equal(result.timedOut, false);
  assert.equal(result.jobEvidence.cleanupValid, true);
  assert.deepEqual(result.jobEvidence.remainingPids, []);
  assert.deepEqual(result.jobEvidence.unverifiedPids, []);
  assert.ok(result.jobEvidence.jobProcessIdsAtRootExit.includes(result.pid));

  const stdout = await fs.readFile(result.stdoutPath, "utf8");
  const stderr = await fs.readFile(result.stderrPath, "utf8");
  const payload = JSON.parse(stdout.trim());
  assert.deepEqual(payload.argv, expectedArgs);
  assert.match(stderr, /job-root-stderr/);
  assert.ok(Number.isInteger(payload.childPid) && payload.childPid > 0);
  assert.ok(result.jobEvidence.jobProcessIdsAtRootExit.includes(payload.childPid));
  assert.equal(isPidRunning(payload.childPid), false);
});

const LIVE_TELEMETRY_ENABLED = process.env.WILLIAMS_LIVE_TELEMETRY_TEST === "1";

test("Windows telemetry collector samples actual capture starts on a fixed-rate cadence", {
  skip: process.platform !== "win32"
    ? "Windows performance counters require win32"
    : (LIVE_TELEMETRY_ENABLED ? false : "explicit live telemetry lane required"),
}, () => {
  const telemetry = collectWindowsPerformanceWindow({ phase: "integration" });
  assert.equal(telemetry.capability?.status, "available", telemetry.capability?.missing?.join("\n"));
  assert.deepEqual(telemetry.sampling, {
    scheduler: "monotonic-fixed-rate",
    timestampSemantics: "actual-capture-start",
    sampleIntervalMs: 1000,
    sampleCount: 5,
  });
  assert.equal(telemetry.samples.length, 5);

  const captureStarts = telemetry.samples.map((sample) => Date.parse(sample.at));
  const intervals = captureStarts.slice(1).map((atMs, index) => atMs - captureStarts[index]);
  for (const intervalMs of intervals) {
    assert.ok(intervalMs >= 750 && intervalMs <= 1250, `capture-start interval ${intervalMs}ms`);
  }
  for (const sample of telemetry.samples) {
    assert.ok(Date.parse(sample.completedAt) >= Date.parse(sample.at));
    assert.ok(Number.isFinite(sample.captureDurationMs) && sample.captureDurationMs >= 0);
    assert.ok(Number.isFinite(sample.scheduleLagMs));
  }
});
