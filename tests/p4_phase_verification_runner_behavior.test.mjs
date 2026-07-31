import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildP4PhaseVerificationPlan,
  commandToProcess,
  defaultP4PhaseReportPath,
  parseArgs,
  readVerificationIdentity,
  runVerificationPlan,
} from "../tools/run_p4_phase_verification.mjs";

test("P4.1 plan keeps focused policy and route commands exact", () => {
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.1" });
  assert.deepEqual(plan.commands, [
    "npm run test:node:p4:p4-1",
    "npm run test:python:p4:p4-1-boundary",
    "node tools/check_state_writer_policy.mjs --phase P4.1 --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.1 --history-base HEAD^",
  ]);
  assert.equal(
    plan.reportPath.replaceAll("\\", "/"),
    ".runtime/reports/generated/p4-state-actions/P4.1/phase-verification.json",
  );
});

test("P4.2a plan keeps scenario actions, policy, and route commands exact", () => {
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.2a" });
  assert.deepEqual(plan.commands, [
    "npm run test:node:p4:p4-2a",
    "npm run test:python:p4:p4-2a-boundary",
    "node tools/check_state_writer_policy.mjs --phase P4.2a --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2a --history-base HEAD^",
  ]);
  assert.equal(
    plan.reportPath.replaceAll("\\", "/"),
    ".runtime/reports/generated/p4-state-actions/P4.2a/phase-verification.json",
  );
});

test("P4.2b plan keeps scenario chunk actions, complete policy suite, and route commands exact", () => {
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.2b" });
  assert.deepEqual(plan.commands, [
    "npm run test:node:p4:p4-2b",
    "npm run test:python:p4:p4-2b-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.2b --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2b --history-base HEAD^",
  ]);
  assert.equal(
    plan.reportPath.replaceAll("\\", "/"),
    ".runtime/reports/generated/p4-state-actions/P4.2b/phase-verification.json",
  );
});

test("P4.2c plan keeps scenario health actions, complete policy suite, and route commands exact", () => {
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.2c" });
  assert.deepEqual(plan.commands, [
    "npm run test:node:p4:p4-2c",
    "npm run test:python:p4:p4-2c-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.2c --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2c --history-base HEAD^",
  ]);
  assert.equal(
    plan.reportPath.replaceAll("\\", "/"),
    ".runtime/reports/generated/p4-state-actions/P4.2c/phase-verification.json",
  );
});

test("P4.3 plan keeps renderer actions, complete policy suite, and route commands exact", () => {
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.3" });
  assert.deepEqual(plan.commands, [
    "npm run test:node:p4:p4-3",
    "npm run test:python:p4:p4-3-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.3 --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.3 --history-base HEAD^",
  ]);
  assert.equal(
    plan.reportPath.replaceAll("\\", "/"),
    ".runtime/reports/generated/p4-state-actions/P4.3/phase-verification.json",
  );
});

test("unsupported future phase plans fail closed", () => {
  assert.throws(
    () => buildP4PhaseVerificationPlan({ phase: "P4.4" }),
    /Unknown P4 state-action phase|no executable plan/,
  );
});

test("argument parsing requires an exact phase and supports list reports", () => {
  assert.deepEqual(
    parseArgs(["--phase", "P4.1", "--list", "--json-out", "custom.json"]),
    {
      phase: "P4.1",
      list: true,
      jsonOut: "custom.json",
    },
  );
  assert.throws(() => parseArgs([]), /requires --phase/);
  assert.throws(
    () => parseArgs(["--phase", "P4.1", "--unknown"]),
    /Unknown argument/,
  );
  assert.match(
    defaultP4PhaseReportPath("P4.1").replaceAll("\\", "/"),
    /P4\.1\/phase-verification\.json$/,
  );
});

test("command resolution supports npm scripts and direct node commands", () => {
  assert.deepEqual(
    commandToProcess("npm run test:node:p4:p4-1", "win32"),
    {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", "run", "test:node:p4:p4-1"],
    },
  );
  assert.deepEqual(
    commandToProcess("node tools/check_state_writer_policy.mjs --phase P4.1", "linux"),
    {
      command: process.execPath,
      args: [
        "tools/check_state_writer_policy.mjs",
        "--phase",
        "P4.1",
      ],
    },
  );
  assert.throws(() => commandToProcess(""), /must not be empty/);
  assert.throws(() => commandToProcess("python test.py"), /Unsupported/);
});

test("verification identity records exact SHA tree and tracked cleanliness", () => {
  const calls = [];
  const runner = (command, args) => {
    calls.push([command, ...args]);
    const joined = args.join(" ");
    if (joined === "rev-parse HEAD") {
      return { status: 0, stdout: "candidate-sha\n", stderr: "" };
    }
    if (joined === "rev-parse HEAD^{tree}") {
      return { status: 0, stdout: "candidate-tree\n", stderr: "" };
    }
    if (joined.startsWith("status ")) {
      return { status: 0, stdout: "", stderr: "" };
    }
    return { status: 1, stdout: "", stderr: "unexpected git command" };
  };
  assert.deepEqual(readVerificationIdentity({ runner }), {
    verificationSha: "candidate-sha",
    verificationTreeSha: "candidate-tree",
    trackedClean: true,
    trackedStatus: "",
  });
  assert.equal(calls.length, 3);
});

test("list mode writes an auditable report without executing commands", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-list-"));
  const reportPath = "phase-report.json";
  let executions = 0;
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.1" });
  const result = runVerificationPlan(plan, {
    cwd: root,
    execute: false,
    jsonOut: reportPath,
    identity: {
      verificationSha: "candidate-sha",
      verificationTreeSha: "candidate-tree",
      trackedClean: true,
      trackedStatus: "",
    },
    runner: () => {
      executions += 1;
      return { status: 0 };
    },
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.verdict, "listed");
  assert.equal(executions, 0);
  assert.equal(fs.existsSync(path.join(root, reportPath)), true);
});

test("dirty tracked state blocks execution before the first command", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-dirty-"));
  let executions = 0;
  const result = runVerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.1" }),
    {
      cwd: root,
      jsonOut: "report.json",
      identity: {
        verificationSha: "candidate-sha",
        verificationTreeSha: "candidate-tree",
        trackedClean: false,
        trackedStatus: " M js/main.js",
      },
      runner: () => {
        executions += 1;
        return { status: 0 };
      },
    },
  );
  assert.equal(result.exitCode, 2);
  assert.equal(result.report.verdict, "blocked");
  assert.equal(result.report.blockReason, "tracked-worktree-dirty");
  assert.equal(executions, 0);
});

test("execution stops at the first failing command and records it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-fail-"));
  const executed = [];
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.1" });
  const result = runVerificationPlan(plan, {
    cwd: root,
    jsonOut: "report.json",
    platform: "linux",
    identity: {
      verificationSha: "candidate-sha",
      verificationTreeSha: "candidate-tree",
      trackedClean: true,
      trackedStatus: "",
    },
    runner: (command, args) => {
      executed.push([command, ...args]);
      return { status: executed.length === 2 ? 7 : 0 };
    },
  });
  assert.equal(result.exitCode, 7);
  assert.equal(result.report.verdict, "failed");
  assert.equal(
    result.report.failedCommandRef,
    "npm run test:python:p4:p4-1-boundary",
  );
  assert.equal(executed.length, 2);
  assert.equal(result.report.commands[2].status, "pending");
});

test("successful execution requires the final SHA tree and clean status to stay exact", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-exact-"));
  const identity = {
    verificationSha: "candidate-sha",
    verificationTreeSha: "candidate-tree",
    trackedClean: true,
    trackedStatus: "",
  };
  const result = runVerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.1" }),
    {
      cwd: root,
      jsonOut: "report.json",
      platform: "linux",
      identity,
      identityReader: () => identity,
      runner: () => ({ status: 0 }),
    },
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.verdict, "pass");
  assert.deepEqual(result.report.finalVerificationIdentity, identity);

  const drifted = runVerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.1" }),
    {
      cwd: root,
      jsonOut: "drift-report.json",
      platform: "linux",
      identity,
      identityReader: () => ({
        ...identity,
        verificationTreeSha: "drifted-tree",
      }),
      runner: () => ({ status: 0 }),
    },
  );
  assert.equal(drifted.exitCode, 2);
  assert.equal(drifted.report.verdict, "failed");
  assert.equal(drifted.report.blockReason, "verification-identity-drift");
});
