import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { scenarioChunkContractRegistrationManifest } from "./scenario_chunk_contracts.test.mjs";
import {
  compareScenarioChunkContractRuns,
  collectScenarioChunkCatalogEvidence,
  parseScenarioChunkTap,
  runScenarioChunkShadow,
} from "../tools/verification/test_shadow_equivalence.mjs";

const REPO_ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function registrationBlocks(source) {
  const lines = source.split(/\r?\n/);
  const heavyStart = lines.findIndex((line) => (
    line.startsWith("export function registerScenarioChunkContractHeavyTests")
  ));
  const blocks = [];
  for (let start = 0; start < lines.length; start += 1) {
    const match = /^  register\((\d+), "([^"]+)"/.exec(lines[start]);
    if (!match) continue;
    let end = start + 1;
    while (end < lines.length && lines[end] !== "  });") end += 1;
    assert.ok(end < lines.length, `registration ${match[1]} must close`);
    blocks.push({
      order: Number(match[1]),
      name: match[2],
      partition: start < heavyStart ? "quick" : "heavy",
      lines: lines.slice(start, end + 1),
    });
  }
  return blocks;
}

function metrics(blocks) {
  const lines = blocks.flatMap((entry) => entry.lines);
  const source = lines.join("\n");
  return {
    tests: blocks.length,
    testBodyLoc: lines.length,
    readMarkers: (source.match(/readRepoFile\(/g) || []).length
      + (source.match(/loadVendorD3\(/g) || []).length,
    wideRegexLines: lines.filter((line) => /\[\\s\\S\]/.test(line)).length,
    regexTestCalls: (source.match(/\.test\(/g) || []).length,
  };
}

function runFromManifest(manifest, partition = null, status = "pass", exitCode = 0) {
  return {
    exitCode,
    results: manifest
      .filter((entry) => partition === null || entry.partition === partition)
      .map((entry) => ({ name: entry.name, status })),
  };
}

test("legacy owns 79 static test bodies while quick and heavy entry files only select static registrars", () => {
  const legacySource = read("tests/scenario_chunk_contracts.test.mjs");
  const quickSource = read("tests/scenario_chunk_contracts.quick.test.mjs");
  const heavySource = read("tests/scenario_chunk_contracts.heavy.test.mjs");
  const blocks = registrationBlocks(legacySource);
  const manifest = scenarioChunkContractRegistrationManifest();

  assert.equal(blocks.length, 79);
  assert.deepEqual(
    blocks
      .map(({ order, name, partition }) => ({ order, name, partition }))
      .sort((left, right) => left.order - right.order),
    manifest,
  );
  assert.deepEqual(manifest.map((entry) => entry.order), Array.from({ length: 79 }, (_, index) => index));
  assert.equal(manifest.filter((entry) => entry.partition === "quick").length, 58);
  assert.equal(manifest.filter((entry) => entry.partition === "heavy").length, 21);
  assert.match(legacySource, /registerScenarioChunkContractQuickTests\(collect\)/);
  assert.match(legacySource, /registerScenarioChunkContractHeavyTests\(collect\)/);
  assert.match(legacySource, /registrations\.sort\(\(left, right\) => left\.order - right\.order\)/);
  assert.match(quickSource, /registerScenarioChunkContractQuickTests/);
  assert.match(heavySource, /registerScenarioChunkContractHeavyTests/);
  for (const entrySource of [quickSource, heavySource]) {
    assert.doesNotMatch(entrySource, /--test-name-pattern|\.filter\(|register\(\d+,/);
  }
});

test("mechanical split preserves the frozen body and scan reduction counts", () => {
  const blocks = registrationBlocks(read("tests/scenario_chunk_contracts.test.mjs"));
  const quick = blocks.filter((entry) => entry.partition === "quick");
  const heavy = blocks.filter((entry) => entry.partition === "heavy");
  assert.deepEqual(metrics(blocks), {
    tests: 79,
    testBodyLoc: 4545,
    readMarkers: 112,
    wideRegexLines: 382,
    regexTestCalls: 438,
  });
  assert.deepEqual(metrics(quick), {
    tests: 58,
    testBodyLoc: 2812,
    readMarkers: 0,
    wideRegexLines: 0,
    regexTestCalls: 1,
  });
  assert.deepEqual(metrics(heavy), {
    tests: 21,
    testBodyLoc: 1733,
    readMarkers: 112,
    wideRegexLines: 382,
    regexTestCalls: 437,
  });
  assert.equal(Number((((4545 - 2812) / 4545) * 100).toFixed(2)), 38.13);
});

test("TAP parsing and ordered shadow comparison preserve pass fail skip and todo outcomes", () => {
  assert.deepEqual(
    parseScenarioChunkTap([
      "ok 1 - pass",
      "not ok 2 - fail",
      "ok 3 - skipped # SKIP platform",
      "not ok 4 - planned # TODO follow-up",
    ].join("\n")),
    [
      { name: "pass", status: "pass" },
      { name: "fail", status: "fail" },
      { name: "skipped", status: "skip" },
      { name: "planned", status: "todo" },
    ],
  );

  const manifest = scenarioChunkContractRegistrationManifest();
  const baseline = runFromManifest(manifest);
  const quick = runFromManifest(manifest, "quick");
  const heavy = runFromManifest(manifest, "heavy");
  const equal = compareScenarioChunkContractRuns({ baseline, quick, heavy, manifest });
  assert.equal(equal.equal, true);
  assert.deepEqual(equal.counts, { legacy: 79, quick: 58, heavy: 21, split: 79 });

  const driftedHeavy = structuredClone(heavy);
  driftedHeavy.results[0].status = "fail";
  driftedHeavy.exitCode = 1;
  const drifted = compareScenarioChunkContractRuns({
    baseline: structuredClone(baseline),
    quick: structuredClone(quick),
    heavy: driftedHeavy,
    manifest,
  });
  assert.equal(drifted.equal, false);
  assert.ok(drifted.mismatches.some((entry) => entry.startsWith("status-drift:")));
  assert.ok(drifted.mismatches.some((entry) => entry.startsWith("exit-drift:")));
});

test("shadow runner uses three independent run results and rejects shared self-comparison objects", () => {
  const manifest = scenarioChunkContractRegistrationManifest();
  const fixtures = new Map([
    ["tests/scenario_chunk_contracts.test.mjs", runFromManifest(manifest)],
    ["tests/scenario_chunk_contracts.quick.test.mjs", runFromManifest(manifest, "quick")],
    ["tests/scenario_chunk_contracts.heavy.test.mjs", runFromManifest(manifest, "heavy")],
  ]);
  const calls = [];
  const report = runScenarioChunkShadow({
    run(relativePath) {
      calls.push(relativePath);
      return structuredClone(fixtures.get(relativePath));
    },
    catalogEvidence: () => ({ equal: true, mismatches: [] }),
    writeReport: () => ".runtime/reports/generated/pr7-shadow/test-report.json",
  });
  assert.equal(report.equal, true);
  assert.deepEqual(calls, [...fixtures.keys()]);
  assert.match(report.reportPath, /^\.runtime\/reports\/generated\/pr7-shadow\//);

  const shared = runFromManifest(manifest);
  assert.throws(
    () => compareScenarioChunkContractRuns({
      baseline: shared,
      quick: shared,
      heavy: runFromManifest(manifest, "heavy"),
      manifest,
    }),
    /scenario-chunk-shadow-shared-run-object/,
  );
});

test("catalog evidence binds independent inputs, leaf policy, and P4/TNO closure", () => {
  const evidence = collectScenarioChunkCatalogEvidence();
  assert.equal(evidence.equal, true);
  assert.match(evidence.catalogIdentity.digest, /^[a-f0-9]{64}$/);
  assert.match(evidence.inputSets.legacy.identity.digest, /^[a-f0-9]{64}$/);
  assert.notEqual(evidence.inputSets.legacy.identity.digest, evidence.inputSets.quick.identity.digest);
  assert.notEqual(evidence.inputSets.quick.identity.digest, evidence.inputSets.heavy.identity.digest);
  assert.deepEqual(
    evidence.leaves["test:node:scenario-chunk-contracts:quick"].policy,
    { executionOwner: "child-safe", ciProfiles: ["pr-fast"], resourceLocks: [] },
  );
  assert.deepEqual(evidence.reachability, {
    p4_2b: true,
    p4_3: true,
    tno: true,
    full: true,
  });
  assert.ok(evidence.supersessionClosure.p4_2b.includes("test:node:scenario-chunk-contracts"));
  assert.ok(evidence.supersessionClosure.tno.includes("test:node:scenario-chunk-contracts"));
});
