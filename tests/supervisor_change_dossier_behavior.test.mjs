import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChangeDossier,
  buildDomainSummaries,
  classifyRouteGap,
  deriveRiskLevel,
  resolveDefaultBaseSha,
} from "../tools/ai_test_supervisor/build_change_dossier.mjs";

const NOW = new Date("2026-07-02T00:00:00.000Z");

function commandEntry(overrides = {}) {
  return {
    commandRef: "verify:supervisor-contracts",
    domains: ["test-routing"],
    ownerHints: ["test-infra"],
    resourceLocks: [],
    executionOwners: ["child-safe"],
    ciProfiles: ["pr-fast"],
    expandedSpecs: [],
    routeIds: ["infra:sf-ats-contracts"],
    reason: "matches test-routing/test-infra",
    ...overrides,
  };
}

function selectorReport({
  changedFiles = ["AGENTS.md"],
  commands = [commandEntry()],
  unmatchedChangedFiles = [],
} = {}) {
  return {
    schemaVersion: 1,
    changedFiles,
    importGraphLoaded: true,
    recommendedCommands: commands,
    coveredDomains: [...new Set(commands.flatMap((entry) => entry.domains))],
    coveredOwners: [...new Set(commands.flatMap((entry) => entry.ownerHints))],
    resourceLocks: [...new Set(commands.flatMap((entry) => entry.resourceLocks))],
    executionOwners: [...new Set(commands.flatMap((entry) => entry.executionOwners))],
    childAgentStaticTasks: commands
      .filter((entry) => entry.executionOwners.every((owner) => owner === "child-safe"))
      .map((entry) => ({ commandRef: entry.commandRef })),
    mainThreadSerialVerification: commands
      .filter((entry) => entry.executionOwners.includes("main-thread"))
      .map((entry) => ({ commandRef: entry.commandRef, resourceLocks: entry.resourceLocks })),
    ciOnlyVerification: commands
      .filter((entry) => entry.executionOwners.every((owner) => owner === "ci-only"))
      .map((entry) => ({ commandRef: entry.commandRef })),
    matchedByFile: changedFiles.map((changedFile) => ({
      changedFile,
      matchedRouteIds: commands.map((entry) => entry.routeIds).flat(),
      recommendedCommands: commands,
    })),
    impactedDomains: [...new Set(commands.flatMap((entry) => entry.domains))]
      .map((domain) => ({ domain, commandCount: 1, ownerHints: ["test-infra"], specCount: 0 })),
    diagnosticNextSteps: commands,
    advisoryNotes: [],
    unmatchedChangedFiles,
    skippedHeavyTests: [],
  };
}

test("buildChangeDossier preserves selector fields and builds lane/domain summaries", () => {
  const selector = selectorReport();
  const dossier = buildChangeDossier({
    changedFiles: ["AGENTS.md"],
    selectorReport: selector,
    baseSha: "base",
    gitSha: "head",
    now: NOW,
  });

  assert.equal(dossier.schemaVersion, 1);
  assert.equal(dossier.discoveryMode, "explicit-input");
  assert.deepEqual(dossier.routeGaps, []);
  assert.equal(dossier.riskLevel, "medium");
  assert.equal(dossier.selector.matchedByFile[0].changedFile, "AGENTS.md");
  assert.deepEqual(dossier.laneSummary.counts, {
    childSafe: 1,
    mainThread: 0,
    ciOnly: 0,
    blocked: 0,
    total: 1,
  });
  assert.equal(dossier.domainSummaries[0].domainId, "test-routing");
  assert.ok(dossier.domainSummaries[0].recommendedChecks.includes("verify:supervisor-contracts"));
  assert.ok(dossier.requiredArtifacts.includes(".runtime/reports/generated/supervisor-plan.json"));
});

test("classifyRouteGap marks workflow and tooling gaps critical", () => {
  assert.equal(classifyRouteGap(".github/workflows/verify-shared.yml").severity, "critical");
  assert.equal(classifyRouteGap("tools/new_selector_probe.mjs").severity, "critical");
  assert.equal(classifyRouteGap("tests/e2e/new_visible_case.spec.js").severity, "high");
});

test("deriveRiskLevel raises high for main-thread locks", () => {
  const risk = deriveRiskLevel({
    changedFiles: ["tests/e2e/main_shell_i18n.spec.js"],
    routeGaps: [],
    laneSummary: {
      mainThreadCommands: [commandEntry({ executionOwners: ["main-thread"], resourceLocks: ["playwright-browser"] })],
      resourceLocks: ["playwright-browser"],
    },
  });

  assert.equal(risk.riskLevel, "high");
  assert.ok(risk.riskReasons.some((reason) => reason.includes("main-thread")));
});

test("buildDomainSummaries uses registry artifacts and selector commands", () => {
  const summaries = buildDomainSummaries(selectorReport(), {
    domains: [
      {
        id: "test-routing",
        ownerHints: ["test-infra"],
        preferredChildSafeChecks: ["node tools/select_verification_targets.mjs --check"],
        preferredMainThreadChecks: [],
        mainRiskSignals: ["route registry schema drift"],
        evidenceArtifacts: [".runtime/reports/generated/test-adaptive-selection.json"],
      },
    ],
  });

  assert.deepEqual(summaries[0].changedFiles, ["AGENTS.md"]);
  assert.deepEqual(summaries[0].ownerHints, ["test-infra"]);
  assert.ok(summaries[0].evidenceArtifacts.includes(".runtime/reports/generated/test-adaptive-selection.json"));
});

test("unmatched production files create critical route gaps", () => {
  const selector = selectorReport({
    changedFiles: ["js/core/new_runtime_file.js"],
    commands: [],
    unmatchedChangedFiles: ["js/core/new_runtime_file.js"],
  });
  const dossier = buildChangeDossier({
    changedFiles: ["js/core/new_runtime_file.js"],
    selectorReport: selector,
    baseSha: "base",
    gitSha: "head",
    now: NOW,
  });

  assert.equal(dossier.riskLevel, "critical");
  assert.equal(dossier.routeGaps[0].severity, "critical");
  assert.equal(dossier.routeGaps[0].suggestedRoute, "architecture-boundaries");
});

test("resolveDefaultBaseSha matches workspace and history discovery modes", () => {
  const calls = [];
  const runner = (_bin, args) => {
    calls.push(args.join(" "));
    if (args.join(" ") === "rev-parse HEAD") return { status: 0, stdout: "head-sha\n" };
    if (args.join(" ") === "merge-base HEAD origin/main") return { status: 0, stdout: "origin-base\n" };
    return { status: 1, stdout: "" };
  };

  assert.equal(resolveDefaultBaseSha({ runner }), "head-sha");
  assert.equal(resolveDefaultBaseSha({ includeBranchHistory: true, runner }), "origin-base");
  assert.deepEqual(calls, [
    "rev-parse HEAD",
    "merge-base HEAD origin/main",
  ]);
});

test("resolveDefaultBaseSha falls back to local main when origin main is unavailable", () => {
  const calls = [];
  const runner = (_bin, args) => {
    calls.push(args.join(" "));
    if (args.join(" ") === "merge-base HEAD main") return { status: 0, stdout: "local-main-base\n" };
    return { status: 1, stdout: "" };
  };

  assert.equal(resolveDefaultBaseSha({ includeBranchHistory: true, runner }), "local-main-base");
  assert.deepEqual(calls, [
    "merge-base HEAD origin/main",
    "merge-base HEAD main",
  ]);
});
