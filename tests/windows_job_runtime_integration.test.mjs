import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test, { after, before } from "node:test";

import {
  prepareWindowsJobRunnerV2,
  spawnWindowsJobSession,
} from "../tools/process_containment/windows_job_runtime.mjs";

const RUNTIME_URL = new URL("../tools/process_containment/windows_job_runtime.mjs", import.meta.url).href;

const WINDOWS_ONLY = process.platform === "win32"
  ? false
  : "Windows Job Objects require win32";

let preparedRunner = null;
let fixtureRoot = null;

before(async () => {
  if (WINDOWS_ONLY) return;
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mapcreator-job-v2-"));
  preparedRunner = await prepareWindowsJobRunnerV2({
    buildRoot: path.join(fixtureRoot, "build"),
  });
  assert.equal(preparedRunner.status, "available", preparedRunner.error);
});

after(async () => {
  await preparedRunner?.cleanup?.();
  if (fixtureRoot) await fs.rm(fixtureRoot, { recursive: true, force: true });
});

function collectSessionOutput(session) {
  let stdout = "";
  let stderr = "";
  session.stdout.on("data", (chunk) => { stdout += chunk; });
  session.stderr.on("data", (chunk) => { stderr += chunk; });
  return {
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

async function waitFor(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("bounded Windows Job fixture timed out");
}

async function readJsonWhenAvailable(filePath, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw lastError || new Error("evidence unavailable");
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function evidencePath(label) {
  return path.join(fixtureRoot, `${label}-${crypto.randomUUID()}.json`);
}

test("V2 normal root exit drains output and removes a detached descendant", {
  skip: WINDOWS_ONLY,
  timeout: 10_000,
}, async () => {
  const childProgram = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(`DESCENDANT:${descendant.pid}\\nTAP version 13\\n1..0\\n`);",
    "process.stderr.write('job-v2-success-tail\\n');",
    "setTimeout(() => process.exit(0), 50);",
  ].join("");
  const session = spawnWindowsJobSession({
    bin: process.execPath,
    args: ["-e", childProgram],
    cwd: process.cwd(),
  }, {
    preparedRunner,
    cwd: process.cwd(),
    evidencePath: evidencePath("success"),
    timeoutMs: 5_000,
  });
  const output = collectSessionOutput(session);
  const result = await session.completion;
  const descendantPid = Number(/DESCENDANT:(\d+)/.exec(output.stdout())?.[1]);

  assert.equal(result.containmentScope, "tree-contained", result.errors?.join(", "));
  assert.equal(result.cleanupVerified, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.evidence.primaryCause, "root-exit");
  assert.equal(result.evidence.job.activeProcessesAfterCleanup, 0);
  assert.deepEqual(result.evidence.job.remainingPids, []);
  assert.deepEqual(result.evidence.job.unverifiedPids, []);
  assert.match(output.stdout(), /TAP version 13/);
  assert.match(output.stderr(), /job-v2-success-tail/);
  assert.ok(Number.isInteger(descendantPid) && descendantPid > 0);
  await waitFor(() => !processExists(descendantPid));
});

test("V2 explicit cancellation keeps the helper alive through verified tree cleanup", {
  skip: WINDOWS_ONLY,
  timeout: 10_000,
}, async () => {
  const childProgram = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(`READY:${process.pid}:${descendant.pid}\\n`);",
    "setInterval(() => {}, 60000);",
  ].join("");
  const session = spawnWindowsJobSession({
    bin: process.execPath,
    args: ["-e", childProgram],
    cwd: process.cwd(),
  }, {
    preparedRunner,
    cwd: process.cwd(),
    evidencePath: evidencePath("cancel"),
    timeoutMs: 5_000,
  });
  const output = collectSessionOutput(session);
  const ready = await waitFor(() => /READY:(\d+):(\d+)/.exec(output.stdout()));
  assert.equal(session.requestCancel({
    reasonCode: "integration-explicit-cancel",
    requestedSignal: "SIGTERM",
  }), true);
  const result = await session.completion;
  const rootPid = Number(ready[1]);
  const descendantPid = Number(ready[2]);

  assert.equal(result.containmentScope, "tree-contained", result.errors?.join(", "));
  assert.equal(result.cleanupVerified, true);
  assert.equal(result.evidence.primaryCause, "cancel-requested");
  assert.equal(result.evidence.job.activeProcessesAfterCleanup, 0);
  assert.equal(result.evidence.control.cancelRequestId?.length > 0, true);
  await waitFor(() => !processExists(rootPid) && !processExists(descendantPid));
});

test("V2 timeout terminates and verifies the full process tree", {
  skip: WINDOWS_ONLY,
  timeout: 10_000,
}, async () => {
  const childProgram = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(`READY:${process.pid}:${descendant.pid}\\n`);",
    "setInterval(() => {}, 60000);",
  ].join("");
  const session = spawnWindowsJobSession({
    bin: process.execPath,
    args: ["-e", childProgram],
    cwd: process.cwd(),
  }, {
    preparedRunner,
    cwd: process.cwd(),
    evidencePath: evidencePath("timeout"),
    timeoutMs: 250,
    outerGraceMs: 3_000,
  });
  const output = collectSessionOutput(session);
  const ready = await waitFor(() => /READY:(\d+):(\d+)/.exec(output.stdout()));
  const result = await session.completion;

  assert.equal(result.containmentScope, "tree-contained", result.errors?.join(", "));
  assert.equal(result.cleanupVerified, true);
  assert.equal(result.evidence.primaryCause, "timeout");
  assert.equal(result.evidence.job.activeProcessesAfterCleanup, 0);
  await waitFor(() => !processExists(Number(ready[1])) && !processExists(Number(ready[2])));
});

test("V2 helper crash relies on kill-on-close and remains fail-closed without evidence", {
  skip: WINDOWS_ONLY,
  timeout: 10_000,
}, async () => {
  const childProgram = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(`READY:${process.pid}:${descendant.pid}\\n`);",
    "setInterval(() => {}, 60000);",
  ].join("");
  const session = spawnWindowsJobSession({
    bin: process.execPath,
    args: ["-e", childProgram],
    cwd: process.cwd(),
  }, {
    preparedRunner,
    cwd: process.cwd(),
    evidencePath: evidencePath("helper-crash"),
    timeoutMs: 5_000,
    outerGraceMs: 3_000,
  });
  const output = collectSessionOutput(session);
  const ready = await waitFor(() => /READY:(\d+):(\d+)/.exec(output.stdout()));
  process.kill(session.helperPid, "SIGKILL");
  const result = await session.completion;

  assert.equal(result.containmentScope, "blocked");
  assert.equal(result.cleanupVerified, false);
  assert.equal(result.evidence, null);
  await waitFor(() => !processExists(Number(ready[1])) && !processExists(Number(ready[2])));
});

test("V2 parent death is observed through the parent handle and cleans descendants", {
  skip: WINDOWS_ONLY,
  timeout: 10_000,
}, async () => {
  const evidence = evidencePath("parent-death");
  const rootProgram = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { detached: true, stdio: 'ignore' });",
    "process.stdout.write(`ROOT-READY:${process.pid}:${descendant.pid}\\n`);",
    "setInterval(() => {}, 60000);",
  ].join("");
  const ownerProgram = [
    "const [runtimeUrl, runnerPath, evidencePath, cwd, rootSource] = process.argv.slice(1);",
    "const { spawnWindowsJobSession } = await import(runtimeUrl);",
    "const session = spawnWindowsJobSession({ bin: process.execPath, args: ['-e', Buffer.from(rootSource, 'base64').toString('utf8')], cwd }, { preparedRunner: { status: 'available', executablePath: runnerPath }, cwd, evidencePath, timeoutMs: 5000, outerGraceMs: 3000 });",
    "let output = ''; let exiting = false;",
    "session.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(chunk); if (!exiting && output.includes('ROOT-READY:')) { exiting = true; setTimeout(() => process.exit(17), 30); } });",
    "session.stderr.pipe(process.stderr);",
    "session.on('spawn', () => process.stdout.write(`OWNER-STARTED:${session.pid}:${session.helperPid}\\n`));",
    "setInterval(() => {}, 60000);",
  ].join("");
  const owner = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    ownerProgram,
    RUNTIME_URL,
    preparedRunner.executablePath,
    evidence,
    process.cwd(),
    Buffer.from(rootProgram, "utf8").toString("base64"),
  ], { cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  owner.stdout.on("data", (chunk) => { stdout += chunk; });
  owner.stderr.on("data", (chunk) => { stderr += chunk; });
  const ownerExit = await new Promise((resolve, reject) => {
    owner.once("error", reject);
    owner.once("close", (code, signal) => resolve({ code, signal }));
  });
  const rootReady = /ROOT-READY:(\d+):(\d+)/.exec(stdout);
  const ownerStarted = /OWNER-STARTED:(\d+):(\d+)/.exec(stdout);
  assert.deepEqual(ownerExit, { code: 17, signal: null }, stderr);
  assert.ok(rootReady, stdout);
  assert.ok(ownerStarted, stdout);
  let artifact;
  try {
    artifact = await readJsonWhenAvailable(evidence);
  } catch (error) {
    assert.fail(JSON.stringify({
      error: String(error?.message || error),
      stdout,
      stderr,
      rootAlive: processExists(Number(rootReady[1])),
      descendantAlive: processExists(Number(rootReady[2])),
      helperAlive: processExists(Number(ownerStarted[2])),
      evidence,
    }));
  }

  assert.equal(artifact.status, "complete");
  assert.equal(artifact.primaryCause, "parent-death");
  assert.equal(artifact.parent.deathObserved, true);
  assert.equal(artifact.cleanupVerified, true);
  assert.equal(artifact.job.activeProcessesAfterCleanup, 0);
  await waitFor(() => [rootReady[1], rootReady[2], ownerStarted[2]].every((pid) => !processExists(Number(pid))));
});
