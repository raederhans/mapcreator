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
  runVerificationPlan as runP4VerificationPlan,
} from "../tools/run_p4_phase_verification.mjs";

function fakeStateWriterEvidenceResult(commandRef) {
  return {
    status: "reusable-exact",
    disposition: "reused-exact",
    evidenceId: "a".repeat(64),
    evidencePath: ".runtime/reports/generated/p4-state-actions/P4.3/state-writer-policy-evidence.json",
    sourceVerificationSha: "b".repeat(40),
    sourceVerificationTreeSha: "c".repeat(40),
    producer: {
      entrypoint: "tools/run_p4_phase_verification.mjs",
      commandRef,
      role: "checker-producer",
      planDigest: "d".repeat(64),
      producedAt: "2026-08-13T00:00:00.000Z",
      disposition: "produced-live",
    },
    evidence: { phase: "P4.3" },
  };
}

function runVerificationPlan(plan, options = {}) {
  return runP4VerificationPlan(plan, {
    stateWriterEvidenceEnsurer: ({ producer }) => (
      fakeStateWriterEvidenceResult(producer.commandRef)
    ),
    ...options,
  });
}

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
    "node tools/verification/state_writer_policy_evidence.mjs produce --phase P4.3",
    "npm run test:python:p4:p4-3-boundary",
    "npm run test:node:p4:state-writer-policy",
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
      resume: false,
      resumeFrom: null,
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
    workspaceClean: true,
    trackedClean: true,
    includesUntracked: true,
    workspaceStatus: "",
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

test("dirty tracked or untracked state blocks execution before the first command", () => {
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
  assert.equal(result.report.blockReason, "workspace-dirty");
  assert.equal(executions, 0);

  const untracked = runVerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.1" }),
    {
      cwd: root,
      jsonOut: "untracked-report.json",
      identity: {
        verificationSha: "candidate-sha",
        verificationTreeSha: "candidate-tree",
        workspaceClean: false,
        trackedClean: true,
        includesUntracked: true,
        workspaceStatus: "?? scratch.mjs",
      },
      runner: () => {
        executions += 1;
        return { status: 0 };
      },
    },
  );
  assert.equal(untracked.exitCode, 2);
  assert.equal(untracked.report.blockReason, "workspace-dirty");
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

test("P4 runner injects strict exact-tree evidence and persists its trace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-evidence-"));
  const commandRef = "npm run test:python:p4:p4-1-boundary";
  const ensured = [];
  const executions = [];
  const identity = {
    verificationSha: "b".repeat(40),
    verificationTreeSha: "c".repeat(40),
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
      baseEnv: { FIXTURE_ENV: "kept" },
      stateWriterEvidenceEnsurer(options) {
        ensured.push(options);
        return fakeStateWriterEvidenceResult(commandRef);
      },
      runner(command, args, options) {
        executions.push({ command, args, options });
        return { status: 0 };
      },
    },
  );

  assert.equal(result.exitCode, 0);
  assert.equal(ensured.length, 1);
  assert.equal(ensured[0].producer.commandRef, commandRef);
  assert.deepEqual(ensured[0].routeApplicability.unmatchedChangedFiles, []);
  const boundaryExecution = executions[1];
  assert.equal(boundaryExecution.options.env.FIXTURE_ENV, "kept");
  assert.equal(
    boundaryExecution.options.env.STATE_WRITER_POLICY_EVIDENCE_MODE,
    "strict",
  );
  assert.equal(
    boundaryExecution.options.env.STATE_WRITER_POLICY_EVIDENCE_ID,
    "a".repeat(64),
  );
  assert.equal(
    boundaryExecution.options.env.STATE_WRITER_POLICY_EVIDENCE_PATH,
    fakeStateWriterEvidenceResult(commandRef).evidencePath,
  );
  const boundary = result.report.commands.find(
    (entry) => entry.commandRef === commandRef,
  );
  assert.equal(boundary.externalEvidence.evidenceId, "a".repeat(64));
  assert.equal(boundary.externalEvidence.disposition, "reused-exact");
  const durable = JSON.parse(fs.readFileSync(path.join(root, "report.json"), "utf8"));
  assert.equal(
    durable.commands.find((entry) => entry.commandRef === commandRef)
      .externalEvidence.evidencePath,
    fakeStateWriterEvidenceResult(commandRef).evidencePath,
  );
});

test("P4.3 runs one explicit checker producer and binds every boundary to its evidence id", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-producer-"));
  const producerCommand =
    "node tools/verification/state_writer_policy_evidence.mjs produce --phase P4.3";
  const boundaryCommand = "npm run test:python:p4:p4-3-boundary";
  const evidenceId = "e".repeat(64);
  const ensured = [];
  const executions = [];
  const identity = {
    verificationSha: "b".repeat(40),
    verificationTreeSha: "c".repeat(40),
    trackedClean: true,
    trackedStatus: "",
  };
  const evidenceResult = {
    ...fakeStateWriterEvidenceResult(producerCommand),
    evidenceId,
    producer: {
      ...fakeStateWriterEvidenceResult(producerCommand).producer,
      role: "checker-producer",
    },
  };
  const result = runP4VerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.3" }),
    {
      cwd: root,
      jsonOut: "report.json",
      platform: "linux",
      identity,
      identityReader: () => identity,
      baseEnv: { FIXTURE_ENV: "kept" },
      stateWriterEvidenceEnsurer(options) {
        ensured.push(options);
        return evidenceResult;
      },
      runner(command, args, options) {
        executions.push({ command, args, options });
        return { status: 0 };
      },
    },
  );

  assert.equal(result.exitCode, 0);
  assert.equal(executions.length, 5);
  assert.equal(ensured.length, 2);
  assert.equal(ensured[0].liveFallbackPolicy, "forbid");
  assert.equal(ensured[0].expectedProducerRole, "checker-producer");
  assert.equal(ensured[1].expectedEvidenceId, evidenceId);
  assert.equal(ensured[1].expectedProducerRole, "checker-producer");
  assert.equal(ensured[1].liveFallbackPolicy, "forbid");

  const producer = result.report.commands.find(
    (entry) => entry.commandRef === producerCommand,
  );
  const boundary = result.report.commands.find(
    (entry) => entry.commandRef === boundaryCommand,
  );
  assert.equal(producer.externalEvidence.evidenceId, evidenceId);
  assert.equal(producer.externalEvidence.status, "produced-live");
  assert.equal(producer.externalEvidence.producer.role, "checker-producer");
  assert.equal(boundary.externalEvidence.evidenceId, evidenceId);
  const boundaryExecution = executions.find(
    ({ args }) => args.includes("test:python:p4:p4-3-boundary"),
  );
  assert.equal(
    boundaryExecution.options.env.STATE_WRITER_POLICY_LIVE_FALLBACK,
    "forbid",
  );
  assert.equal(
    boundaryExecution.options.env.STATE_WRITER_POLICY_EVIDENCE_ID,
    evidenceId,
  );
});

test("P4 runner blocks a boundary before spawn when evidence setup is blocked", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-evidence-blocked-"));
  let executions = 0;
  const blockedError = Object.assign(new Error("unmatched route"), {
    code: "state-writer-evidence-unmatched-route",
    disposition: "blocked",
  });
  const identity = {
    verificationSha: "b".repeat(40),
    verificationTreeSha: "c".repeat(40),
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
      stateWriterEvidenceEnsurer() {
        throw blockedError;
      },
      runner() {
        executions += 1;
        return { status: 0 };
      },
    },
  );

  assert.equal(result.exitCode, 2);
  assert.equal(executions, 1);
  assert.equal(result.report.failedCommandRef, "npm run test:python:p4:p4-1-boundary");
  const boundary = result.report.commands[1];
  assert.equal(boundary.externalEvidence.code, "state-writer-evidence-unmatched-route");
  assert.match(boundary.error, /disposition=blocked/);
});

test("each P4 runner invocation owns one fallback session across boundaries", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-session-"));
  const commandRefs = [
    "npm run test:python:p4:p4-1-boundary",
    "npm run test:python:p4:p4-2a-boundary",
  ];
  const identity = {
    verificationSha: "b".repeat(40),
    verificationTreeSha: "c".repeat(40),
    trackedClean: true,
    trackedStatus: "",
  };
  let producerCount = 0;
  const sessions = [];
  const stateWriterEvidenceEnsurer = ({ producer, liveFallbackSession }) => {
    sessions.push(liveFallbackSession);
    if (liveFallbackSession.liveFallbackAttempts === 0) {
      liveFallbackSession.liveFallbackAttempts += 1;
      producerCount += 1;
    }
    return fakeStateWriterEvidenceResult(producer.commandRef);
  };

  for (let invocation = 0; invocation < 2; invocation += 1) {
    const result = runVerificationPlan({
      phase: "P4.1",
      commands: commandRefs,
      reportPath: `report-${invocation}.json`,
    }, {
      cwd: root,
      jsonOut: `report-${invocation}.json`,
      platform: "linux",
      identity,
      identityReader: () => identity,
      stateWriterEvidenceEnsurer,
      runner: () => ({ status: 0 }),
    });
    assert.equal(result.exitCode, 0);
  }

  assert.equal(producerCount, 2);
  assert.equal(sessions[0], sessions[1]);
  assert.notEqual(sessions[1], sessions[2]);
  assert.equal(sessions[2], sessions[3]);
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
  assert.deepEqual(result.report.finalVerificationIdentity, {
    ...identity,
    workspaceClean: true,
    includesUntracked: true,
    workspaceStatus: "",
  });

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

  const invalidCheckpoint = structuredClone(result.report);
  invalidCheckpoint.verdict = "failed";
  invalidCheckpoint.blockReason = "verification-identity-drift";
  invalidCheckpoint.finalVerificationIdentity.verificationTreeSha = "drifted-tree";
  let resumeExecutions = 0;
  const rejectedResume = runVerificationPlan(
    buildP4PhaseVerificationPlan({ phase: "P4.1" }),
    {
      cwd: root,
      jsonOut: "rejected-resume-report.json",
      platform: "linux",
      identity,
      identityReader: () => identity,
      resumeCheckpoint: invalidCheckpoint,
      runner: () => {
        resumeExecutions += 1;
        return { status: 0 };
      },
    },
  );
  assert.equal(rejectedResume.exitCode, 2);
  assert.equal(rejectedResume.report.blockReason, "checkpoint-invalid");
  assert.equal(resumeExecutions, 0);
});

test("same-tree resume reuses passed P4 commands and reruns the failed suffix", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4-phase-resume-"));
  const reportPath = "phase-report.json";
  const identity = {
    verificationSha: "candidate-sha",
    verificationTreeSha: "candidate-tree",
    workspaceClean: true,
    trackedClean: true,
    includesUntracked: true,
    workspaceStatus: "",
    trackedStatus: "",
  };
  const plan = buildP4PhaseVerificationPlan({ phase: "P4.1" });
  let calls = 0;
  const first = runVerificationPlan(plan, {
    cwd: root,
    jsonOut: reportPath,
    platform: "linux",
    identity,
    identityReader: () => identity,
    now: (() => {
      let value = 0;
      return () => new Date(value++ * 10);
    })(),
    runner: () => ({ status: ++calls === 2 ? 7 : 0 }),
  });
  assert.equal(first.exitCode, 7);
  const checkpoint = JSON.parse(fs.readFileSync(path.join(root, reportPath), "utf8"));

  const resumedCalls = [];
  const resumed = runVerificationPlan(plan, {
    cwd: root,
    jsonOut: reportPath,
    platform: "linux",
    identity,
    identityReader: () => identity,
    resumeCheckpoint: checkpoint,
    now: (() => {
      let value = 100;
      return () => new Date(value++ * 10);
    })(),
    runner: (command, args) => {
      resumedCalls.push([command, ...args]);
      return { status: 0 };
    },
  });

  assert.equal(resumed.exitCode, 0);
  assert.equal(resumed.report.resumeDecision.mode, "exact");
  assert.equal(resumed.report.summary.reused, 1);
  assert.equal(resumed.report.commands[0].evidenceDisposition, "reused-exact");
  assert.deepEqual(
    resumedCalls.map((entry) => entry.join(" ")),
    plan.commands.slice(1).map((commandRef) => (
      commandRef.startsWith("npm run ") ? commandRef : commandRef.replace(/^node /, `${process.execPath} `)
    )),
  );
});
