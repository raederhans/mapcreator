import assert from "node:assert/strict";
import test from "node:test";
import { buildLaneSummary } from "../tools/ai_test_supervisor/command_lanes.mjs";
import {
  buildSupervisorPlan,
  executeSupervisorPlan,
  runCommand,
  supervisorExitCodeForPlan,
} from "../tools/ai_test_supervisor/supervise_adaptive_verification.mjs";
import { renderSupervisorMarkdown } from "../tools/ai_test_supervisor/render_supervisor_markdown.mjs";

const NOW = new Date("2026-07-02T00:00:00.000Z");

function laneEntry(commandRef, lane, overrides = {}) {
  return {
    commandRef,
    lane,
    laneReason: `${lane} lane`,
    domains: ["test-routing"],
    ownerHints: ["test-infra"],
    resourceLocks: [],
    executionOwners: [lane === "ci-only" ? "ci-only" : lane],
    ...overrides,
  };
}

function dossier(overrides = {}) {
  return {
    schemaVersion: 1,
    generatedAt: NOW.toISOString(),
    gitSha: "head",
    baseSha: "base",
    discoveryMode: "explicit-input",
    changedFiles: ["tools/ai_test_supervisor/supervise_adaptive_verification.mjs"],
    selector: { advisoryNotes: ["Guidance available for: test-routing."] },
    domainSummaries: [{ domainId: "test-routing", changedFiles: ["tools/ai_test_supervisor/supervise_adaptive_verification.mjs"], recommendedChecks: ["verify:supervisor-contracts"] }],
    routeGaps: [],
    riskLevel: "medium",
    riskReasons: ["matched supervisor surface changed"],
    laneSummary: {
      childSafeCommands: [laneEntry("verify:supervisor-contracts", "child-safe")],
      mainThreadCommands: [laneEntry("npm run test:e2e:smoke", "main-thread", { resourceLocks: ["playwright-browser"] })],
      ciOnlyCommands: [laneEntry("deploy-preview-check", "ci-only")],
      blockedCommands: [],
      counts: { childSafe: 1, mainThread: 1, ciOnly: 1, blocked: 0, total: 3 },
      resourceLocks: ["playwright-browser"],
      executionOwners: ["child-safe", "main-thread", "ci-only"],
    },
    requiredArtifacts: [".runtime/reports/generated/supervisor-plan.json"],
    suggestedNextActions: ["Run child-safe commands listed in the supervisor plan."],
    ...overrides,
  };
}

test("buildSupervisorPlan dry-run keeps execution empty and blocks main-thread by default", () => {
  const plan = buildSupervisorPlan({ dossier: dossier(), now: NOW });

  assert.deepEqual(plan.childSafeCommands, ["verify:supervisor-contracts"]);
  assert.deepEqual(plan.commandsToRun, ["verify:supervisor-contracts"]);
  assert.equal(plan.executionPolicy.execute, false);
  assert.deepEqual(plan.executionResults, []);
  assert.ok(plan.blockedCommands.some((entry) => entry.commandRef === "npm run test:e2e:smoke"));
  assert.ok(plan.blockedCommands.some((entry) => entry.commandRef === "deploy-preview-check"));
});

test("include flags add main-thread and CI-only commands to execution list", () => {
  const plan = buildSupervisorPlan({
    dossier: dossier(),
    includeMainThread: true,
    includeCiOnly: true,
    now: NOW,
  });

  assert.ok(plan.commandsToRun.includes("verify:supervisor-contracts"));
  assert.ok(plan.commandsToRun.includes("npm run test:e2e:smoke"));
  assert.ok(plan.commandsToRun.includes("deploy-preview-check"));
  assert.deepEqual(plan.blockedCommands, []);
});

test("strict-blocked is recorded in execution policy when blocked commands remain", () => {
  const plan = buildSupervisorPlan({ dossier: dossier(), strictBlocked: true, now: NOW });

  assert.equal(plan.executionPolicy.strictBlocked, true);
  assert.ok(plan.blockedCommands.length > 0);
  assert.ok(plan.stopConditions.some((condition) => condition.includes("Blocked main-thread")));
});

test("executeSupervisorPlan records fake runner results and stops after failure", () => {
  const plan = buildSupervisorPlan({
    dossier: dossier({
      laneSummary: {
        childSafeCommands: [
          laneEntry("first-check", "child-safe"),
          laneEntry("second-check", "child-safe"),
        ],
        mainThreadCommands: [],
        ciOnlyCommands: [],
        blockedCommands: [],
        counts: { childSafe: 2, mainThread: 0, ciOnly: 0, blocked: 0, total: 2 },
        resourceLocks: [],
        executionOwners: ["child-safe"],
      },
    }),
    execute: true,
    now: NOW,
  });
  const calls = [];
  const executed = executeSupervisorPlan(plan, {
    runner(bin, args) {
      calls.push({ bin, args });
      return { status: calls.length === 1 ? 1 : 0 };
    },
    now: (() => {
      let tick = 0;
      return () => new Date(NOW.getTime() + tick++ * 10);
    })(),
  });

  assert.equal(calls.length, 1);
  assert.equal(executed.executionResults.length, 1);
  assert.equal(executed.executionResults[0].exitCode, 1);
});

test("supervisor execution list collapses commands covered by composite heavy gates", () => {
  const mainThreadCommands = [
    "verify:scenario-contracts:strict",
    "verify:tno-coverage-ledger",
    "verify:tno-atlantropa-coverage",
    "verify:tno-polar-coverage",
    "test:node:scenario-chunk-contracts",
    "verify:tno-coverage-chain",
    "verify:dist-drift",
    "verify:pages-dist-and-drift",
  ].map((commandRef) => laneEntry(commandRef, "main-thread", {
    resourceLocks: [".runtime-output"],
  }));
  const plan = buildSupervisorPlan({
    dossier: dossier({
      laneSummary: {
        childSafeCommands: [],
        mainThreadCommands,
        ciOnlyCommands: [],
        blockedCommands: [],
        counts: { childSafe: 0, mainThread: mainThreadCommands.length, ciOnly: 0, blocked: 0, total: mainThreadCommands.length },
        resourceLocks: [".runtime-output"],
        executionOwners: ["main-thread"],
      },
    }),
    includeMainThread: true,
    now: NOW,
  });

  assert.deepEqual(plan.commandsToRun, ["verify:pages-dist-and-drift", "verify:tno-coverage-chain"]);
});

test("executeSupervisorPlan checkpoints running and terminal command states", () => {
  const plan = buildSupervisorPlan({
    dossier: dossier(),
    execute: true,
    now: NOW,
  });
  const checkpoints = [];
  const executed = executeSupervisorPlan(plan, {
    runner: () => ({ status: 0 }),
    now: (() => {
      let tick = 0;
      return () => new Date(NOW.getTime() + tick++ * 10);
    })(),
    onCheckpoint(checkpoint) {
      checkpoints.push(checkpoint);
    },
  });

  assert.equal(checkpoints.length, 2);
  assert.equal(checkpoints[0].executionResults[0].status, "running");
  assert.equal(checkpoints[1].executionResults[0].status, "passed");
  assert.equal(checkpoints[1].executionResults[0].durationMs, 10);
  assert.equal(executed.executionResults[0].exitCode, 0);
});

test("runCommand resolves npm script commands through the shared adaptive runner resolver", () => {
  const result = runCommand("verify:supervisor-contracts", {
    runner(bin, args) {
      assert.ok(bin === "npm" || bin === "cmd.exe");
      assert.ok(args.includes("verify:supervisor-contracts"));
      return { status: 0 };
    },
    now: () => NOW,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.commandRef, "verify:supervisor-contracts");
});

test("route gaps block execute and strict verification outcomes", () => {
  // 这个用例锁住“有 route gap 时零命令执行”的安全合同，防止 supervisor 报告假阳性。
  const plan = buildSupervisorPlan({
    dossier: dossier({
      routeGaps: [{
        file: "tools/new_unmatched.mjs",
        severity: "critical",
        reason: "production tooling file has no adaptive route",
        suggestedRoute: "test-routing",
      }],
      laneSummary: {
        childSafeCommands: [laneEntry("verify:supervisor-contracts", "child-safe")],
        mainThreadCommands: [],
        ciOnlyCommands: [],
        blockedCommands: [],
        counts: { childSafe: 1, mainThread: 0, ciOnly: 0, blocked: 0, total: 1 },
        resourceLocks: [],
        executionOwners: ["child-safe"],
      },
    }),
    execute: true,
    now: NOW,
  });
  const calls = [];
  const executed = executeSupervisorPlan(plan, {
    runner(bin, args) {
      calls.push({ bin, args });
      return { status: 0 };
    },
    now: () => NOW,
  });

  assert.equal(calls.length, 0);
  assert.deepEqual(executed.executionResults, []);
  assert.equal(supervisorExitCodeForPlan(executed, { strictRouteGaps: true }), 2);
  assert.equal(supervisorExitCodeForPlan(executed, { strictRouteGaps: false }), 0);
});

test("buildLaneSummary accepts legacy command fields", () => {
  const summary = buildLaneSummary({
    childAgentStaticTasks: [{ command: " verify:supervisor-contracts  " }],
  });

  assert.deepEqual(summary.childSafeCommands.map((entry) => entry.commandRef), ["verify:supervisor-contracts"]);
  assert.equal(summary.counts.childSafe, 1);
  assert.equal(summary.counts.blocked, 0);
});

test("renderSupervisorMarkdown includes changed files, gaps, lanes, artifacts, and execution results", () => {
  const inputDossier = dossier({
    routeGaps: [{
      file: "tools/new_unmatched.mjs",
      severity: "critical",
      reason: "production tooling file has no adaptive route",
      suggestedRoute: "test-routing",
    }],
  });
  const plan = {
    ...buildSupervisorPlan({ dossier: inputDossier, now: NOW }),
    executionResults: [{ commandRef: "verify:supervisor-contracts", exitCode: 0, durationMs: 10 }],
  };
  const markdown = renderSupervisorMarkdown({ dossier: inputDossier, plan });

  assert.match(markdown, /tools\/ai_test_supervisor\/supervise_adaptive_verification\.mjs/);
  assert.match(markdown, /tools\/new_unmatched\.mjs \[critical\]/);
  assert.match(markdown, /verify:supervisor-contracts/);
  assert.match(markdown, /\.runtime\/reports\/generated\/supervisor-plan\.json/);
  assert.match(markdown, /Execution Results/);
});
