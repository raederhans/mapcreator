import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeVerificationCommand,
  buildVerificationProfile,
  formatVerificationProfile,
  normalizeVerificationTestFile,
  prepareVerificationProfilePlan,
  publishVerificationProfileSafely,
} from "../tools/verification/verification_profile.mjs";

const PACKAGE_SCRIPTS = Object.freeze({
  python: "node tools/run_python.mjs",
  meta: "node --test tests/verification_profile_behavior.test.mjs tests/verification_profile_behavior.test.mjs",
  product: "npm run python -- -m unittest tests.test_product_contract -q && node node_modules/@playwright/test/cli.js test tests/e2e/product_flow.spec.js --workers=1 && node --test tests/product_behavior.test.mjs",
});

function selectorReport(recommendations, adaptiveMode = "execute") {
  return {
    adaptiveMode,
    recommendedCommands: recommendations.map(([commandRef, expandedSpecs]) => ({
      commandRef,
      expandedSpecs,
    })),
  };
}

test("same profile input has stable bytes and leaves the execution plan unchanged", () => {
  const executionPlan = {
    commandsToRun: ["product", "meta"],
    blockedMainThreadCommands: ["main-thread"],
  };
  const before = JSON.stringify(executionPlan);
  const input = {
    runnerId: "adaptive-verification",
    selectorReport: selectorReport([
      ["meta", ["tests/verification_profile_behavior.test.mjs"]],
      ["product", ["tests/product_behavior.test.mjs"]],
    ]),
    executionPlan,
    executionResults: [
      { commandRef: "meta", status: "passed", exitCode: 0, durationMs: 20, processStarted: true },
      { commandRef: "product", status: "passed", exitCode: 0, durationMs: 30, processStarted: true },
    ],
    packageScripts: PACKAGE_SCRIPTS,
    terminalState: "passed",
  };

  const first = formatVerificationProfile(buildVerificationProfile(input));
  const second = formatVerificationProfile(buildVerificationProfile(structuredClone(input)));

  assert.equal(first, second);
  assert.equal(JSON.stringify(executionPlan), before);
  assert.deepEqual(
    buildVerificationProfile(input).selection.executionSetComparison,
    { status: "equivalent", missingCommands: [], unexpectedCommands: [] },
  );
});

test("empty profile collections and test-file normalization are stable", () => {
  const profile = buildVerificationProfile({ runnerId: "empty", terminalState: "listed" });

  assert.equal(normalizeVerificationTestFile(".\\tests\\test_contract.py"), "tests/test_contract.py");
  assert.equal(normalizeVerificationTestFile("tests.test_contract"), "tests/test_contract.py");
  assert.deepEqual(profile.selection.selectorRecommendedCommands, []);
  assert.deepEqual(profile.selection.actualFiles, []);
  assert.deepEqual(profile.files, []);
  assert.deepEqual(profile.timings.slowestCommands, []);
  assert.deepEqual(profile.timings.slowestFiles, []);
  assert.equal(profile.processStarts.total, 0);
});

test("profile counts duplicate files, process classes, and meta versus product time", () => {
  const profile = buildVerificationProfile({
    runnerId: "adaptive-verification",
    selectorReport: selectorReport([
      ["meta", ["tests/verification_profile_behavior.test.mjs"]],
      ["product", [
        "tests/test_product_contract.py",
        "tests/e2e/product_flow.spec.js",
        "tests/product_behavior.test.mjs",
      ]],
    ]),
    executionPlan: { commandsToRun: ["meta", "product"] },
    executionResults: [
      { commandRef: "meta", status: "passed", exitCode: 0, durationMs: 100, processStarted: true },
      { commandRef: "product", status: "passed", exitCode: 0, durationMs: 200, processStarted: true },
    ],
    packageScripts: PACKAGE_SCRIPTS,
    terminalState: "passed",
  });

  assert.deepEqual(profile.processStarts, {
    node: 3,
    npm: 3,
    python: 1,
    playwright: 1,
    unclassified: 0,
    total: 8,
  });
  assert.equal(profile.timings.metaVerificationWallTimeMs, 100);
  assert.equal(profile.timings.productTestWallTimeMs, 200);
  assert.equal(profile.selection.selectorRecommendedUniqueFileCount, 4);
  assert.equal(profile.selection.actualUniqueFileCount, 4);
  assert.deepEqual(
    profile.files.find((entry) => entry.file === "tests/verification_profile_behavior.test.mjs"),
    {
      file: "tests/verification_profile_behavior.test.mjs",
      classification: "meta-verification",
      executionCount: 2,
      inclusiveWallTimeMs: 200,
    },
  );
});

test("command analysis records unresolved scripts without changing command execution", () => {
  const analysis = analyzeVerificationCommand("npm run missing", { packageScripts: {} });
  assert.deepEqual(analysis.processStarts, {
    node: 0,
    npm: 1,
    python: 0,
    playwright: 0,
    unclassified: 0,
    total: 1,
  });
  assert.deepEqual(analysis.analysisIssues, ["package-script-unresolved:missing"]);
});

test("execution-set comparison preserves duplicate command multiplicity", () => {
  const commandRef = "node --test tests/a.test.mjs";
  const profile = buildVerificationProfile({
    runnerId: "duplicate-command",
    executionPlan: { commandsToRun: [commandRef, commandRef] },
    executionResults: [{ commandRef, status: "passed", exitCode: 0, durationMs: 1, processStarted: true }],
  });

  assert.deepEqual(profile.selection.executionSetComparison, {
    status: "partial",
    missingCommands: [commandRef],
    unexpectedCommands: [],
  });
});

test("pre-spawn failures stay out of process-start counts", () => {
  const profile = buildVerificationProfile({
    runnerId: "blocked-before-spawn",
    executionPlan: { commandsToRun: ["meta"] },
    executionResults: [{
      commandRef: "meta",
      status: "failed",
      exitCode: 2,
      durationMs: 5,
      processStarted: false,
      externalEvidence: { status: "blocked" },
    }],
    packageScripts: PACKAGE_SCRIPTS,
  });

  assert.equal(profile.lifecycle.state, "failed");
  assert.equal(profile.processStarts.total, 0);
  assert.equal(profile.cache.misses, 1);
});

test("slowest command and file lists are capped at ten with deterministic ties", () => {
  const commands = Array.from({ length: 12 }, (_entry, index) => {
    const suffix = String(index).padStart(2, "0");
    return `node --test tests/file_${suffix}.test.mjs`;
  });
  const executionResults = commands.map((commandRef, index) => ({
    commandRef,
    status: "passed",
    exitCode: 0,
    durationMs: index < 2 ? 50 : index * 10,
    processStarted: true,
  }));
  const profile = buildVerificationProfile({
    runnerId: "top-ten",
    executionPlan: { commandsToRun: commands },
    executionResults,
    terminalState: "passed",
  });

  assert.equal(profile.timings.slowestCommands.length, 10);
  assert.deepEqual(
    profile.timings.slowestCommands.slice(0, 3).map((entry) => entry.commandRef),
    [commands[11], commands[10], commands[9]],
  );
  assert.equal(profile.timings.slowestFiles.length, 10);
  assert.deepEqual(
    profile.timings.slowestFiles.slice(0, 3).map((entry) => entry.file),
    ["tests/file_11.test.mjs", "tests/file_10.test.mjs", "tests/file_09.test.mjs"],
  );
});

test("failure and interruption terminal states retain partial execution evidence", () => {
  const failed = buildVerificationProfile({
    runnerId: "failed",
    executionPlan: { commandsToRun: ["node --test tests/a.test.mjs", "node --test tests/b.test.mjs"] },
    executionResults: [{
      commandRef: "node --test tests/a.test.mjs",
      status: "failed",
      exitCode: 7,
      durationMs: 25,
      processStarted: true,
    }],
  });
  assert.deepEqual(failed.lifecycle, {
    state: "failed",
    terminal: true,
    failedCommandRef: "node --test tests/a.test.mjs",
    interruptionSignal: null,
  });
  assert.deepEqual(failed.selection.executionSetComparison, {
    status: "partial",
    missingCommands: ["node --test tests/b.test.mjs"],
    unexpectedCommands: [],
  });

  const interrupted = buildVerificationProfile({
    runnerId: "interrupted",
    executionPlan: { commandsToRun: ["node --test tests/a.test.mjs"] },
    executionResults: [{
      commandRef: "node --test tests/a.test.mjs",
      status: "running",
      exitCode: null,
      durationMs: null,
      processStarted: false,
    }],
    terminalState: "interrupted",
    interruptionSignal: "SIGINT",
  });
  assert.equal(interrupted.lifecycle.state, "interrupted");
  assert.equal(interrupted.lifecycle.terminal, true);
  assert.equal(interrupted.lifecycle.interruptionSignal, "SIGINT");
  assert.equal(interrupted.selection.accountedCommandCount, 1);
});

test("cache hits remain accounted while process and file counts describe current misses", () => {
  const profile = buildVerificationProfile({
    runnerId: "verify-core",
    executionPlan: { commandsToRun: ["meta", "product"] },
    executionResults: [
      {
        commandRef: "meta",
        status: "passed",
        exitCode: 0,
        durationMs: 900,
        evidenceDisposition: "reused-exact",
      },
      {
        commandRef: "product",
        status: "passed",
        exitCode: 0,
        durationMs: 200,
        evidenceDisposition: "current",
        processStarted: true,
      },
    ],
    packageScripts: PACKAGE_SCRIPTS,
    terminalState: "passed",
  });

  assert.deepEqual(profile.cache, {
    hits: 1,
    misses: 1,
    unobserved: 0,
    hitCommands: ["meta"],
    missCommands: ["product"],
  });
  assert.deepEqual(profile.selection.processStartedCommands, ["product"]);
  assert.equal(profile.timings.totalCommandWallTimeMs, 200);
  assert.equal(profile.selection.actualFiles.includes("tests/verification_profile_behavior.test.mjs"), false);
});

test("grouped execution accounts for the normalized canonical leaf multiset", () => {
  const preparedPlan = prepareVerificationProfilePlan({
    executionPlan: { commandsToRun: ["root-suite"] },
    executionProjection: [
      {
        rootCommandRef: "root-suite",
        canonicalLeafRef: "node --test tests/a.test.mjs",
        executionGroupRef: "group-suite",
      },
      {
        rootCommandRef: "root-suite",
        canonicalLeafRef: "node --test tests/b.test.mjs",
        executionGroupRef: "group-suite",
      },
      {
        rootCommandRef: "root-suite",
        canonicalLeafRef: "node --test tests/a.test.mjs",
        executionGroupRef: "group-suite",
      },
    ],
  });
  const profile = buildVerificationProfile({
    runnerId: "grouped-execution",
    preparedPlan,
    executionResults: [{
      commandRef: "group-suite",
      status: "passed",
      exitCode: 0,
      durationMs: 12,
      processStarted: true,
    }],
    terminalState: "passed",
  });

  assert.deepEqual(profile.selection.plannedCanonicalLeaves, [
    "node --test tests/a.test.mjs",
    "node --test tests/a.test.mjs",
    "node --test tests/b.test.mjs",
  ]);
  assert.deepEqual(profile.selection.accountedCanonicalLeaves, [
    "node --test tests/a.test.mjs",
    "node --test tests/a.test.mjs",
    "node --test tests/b.test.mjs",
  ]);
  assert.deepEqual(profile.selection.executionSetComparison, {
    status: "equivalent",
    missingCommands: [],
    unexpectedCommands: [],
  });
  assert.deepEqual(profile.selection.actualFiles, ["tests/a.test.mjs", "tests/b.test.mjs"]);
  assert.equal(profile.files.find((entry) => entry.file === "tests/a.test.mjs").executionCount, 2);
});

test("prepared profile plans parse commands once across repeated checkpoints", () => {
  let analysisCount = 0;
  const preparedPlan = prepareVerificationProfilePlan({
    selectorReport: selectorReport([["root", ["tests/root.test.mjs"]]]),
    executionPlan: { commandsToRun: ["root"] },
    executionProjection: [{
      rootCommandRef: "root",
      canonicalLeafRef: "node --test tests/leaf.test.mjs",
      executionGroupRef: "group",
    }],
    commandAnalyzer(commandRef, options) {
      analysisCount += 1;
      return analyzeVerificationCommand(commandRef, options);
    },
  });
  const parsedCount = analysisCount;

  for (const status of ["running", "passed"]) {
    buildVerificationProfile({
      runnerId: "checkpoint-many",
      preparedPlan,
      executionResults: [{
        commandRef: "group",
        status,
        exitCode: status === "passed" ? 0 : null,
        durationMs: status === "passed" ? 10 : null,
        processStarted: status === "passed",
      }],
    });
  }

  assert.ok(parsedCount > 0);
  assert.equal(analysisCount, parsedCount);
});

test("observer recovery retains the last profile failure diagnostic", () => {
  const failed = publishVerificationProfileSafely({
    outputPath: "profile.json",
    buildProfile() {
      throw Object.assign(new Error("builder failed"), { code: "builder-failed" });
    },
    writeProfile() {},
  });
  const recovered = publishVerificationProfileSafely({
    outputPath: "profile.json",
    previousDiagnostic: failed.diagnostic,
    buildProfile() {
      return { schemaVersion: 1 };
    },
    writeProfile() {},
  });

  assert.equal(recovered.diagnostic.status, "published");
  assert.equal(recovered.diagnostic.failureCount, 1);
  assert.equal(recovered.diagnostic.lastFailure.code, "builder-failed");
});

test("signal evidence infers interrupted lifecycle without counting a pre-spawn process", () => {
  const profile = buildVerificationProfile({
    runnerId: "pre-spawn-signal",
    executionPlan: { commandsToRun: ["node missing.mjs"] },
    executionResults: [{
      commandRef: "node missing.mjs",
      status: "interrupted",
      exitCode: 1,
      signal: "SIGINT",
      processStarted: false,
      durationMs: 1,
    }],
  });

  assert.equal(profile.lifecycle.state, "interrupted");
  assert.equal(profile.lifecycle.interruptionSignal, "SIGINT");
  assert.equal(profile.processStarts.total, 0);
  assert.deepEqual(profile.selection.actualFiles, []);
});
