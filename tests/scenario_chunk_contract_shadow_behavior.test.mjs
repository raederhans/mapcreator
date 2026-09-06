import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { VERIFICATION_CATALOG_SOURCE_FILES } from "../tools/verification/catalog/source_files.mjs";

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

function registrationBlocks(source, partition) {
  const lines = source.split(/\r?\n/);
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
      partition,
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
    readMarkers: (source.match(/readRepoFile\(/g) || []).length
      + (source.match(/loadVendorD3\(/g) || []).length,
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

test("aggregate entry preserves 79 physical quick and heavy case registrations", () => {
  const legacySource = read("tests/scenario_chunk_contracts.test.mjs");
  const quickSource = read("tests/scenario_chunk_contracts.quick.test.mjs");
  const heavySource = read("tests/scenario_chunk_contracts.heavy.test.mjs");
  const quickCasesSource = read("tests/scenario_chunk_contracts.quick_cases.mjs");
  const heavyCasesSource = read("tests/scenario_chunk_contracts.heavy_cases.mjs");
  const blocks = [
    ...registrationBlocks(quickCasesSource, "quick"),
    ...registrationBlocks(heavyCasesSource, "heavy"),
  ];
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
  assert.match(legacySource, /from "\.\/scenario_chunk_contracts\.quick_cases\.mjs"/);
  assert.match(legacySource, /from "\.\/scenario_chunk_contracts\.heavy_cases\.mjs"/);
  assert.match(legacySource, /registerScenarioChunkContractQuickTests\(collect\)/);
  assert.match(legacySource, /registerScenarioChunkContractHeavyTests\(collect\)/);
  assert.match(legacySource, /registrations\.sort\(\(left, right\) => left\.order - right\.order\)/);
  assert.match(quickCasesSource, /export function registerScenarioChunkContractQuickTests/);
  assert.match(heavyCasesSource, /export function registerScenarioChunkContractHeavyTests/);
  assert.match(quickSource, /from "\.\/scenario_chunk_contracts\.quick_cases\.mjs"/);
  assert.match(heavySource, /from "\.\/scenario_chunk_contracts\.heavy_cases\.mjs"/);
  assert.doesNotMatch(quickSource, /scenario_chunk_contracts\.test|heavy_cases|register\(\d+,/);
  assert.doesNotMatch(heavySource, /scenario_chunk_contracts\.test|quick_cases|register\(\d+,/);
  assert.doesNotMatch(legacySource, /register\(\d+,/);
});

test("physical split keeps quick registrations free of heavy production-data reads", () => {
  const quick = registrationBlocks(
    read("tests/scenario_chunk_contracts.quick_cases.mjs"),
    "quick",
  );
  const heavy = registrationBlocks(
    read("tests/scenario_chunk_contracts.heavy_cases.mjs"),
    "heavy",
  );
  const blocks = [...quick, ...heavy];
  assert.deepEqual(metrics(blocks), { tests: 79, readMarkers: metrics(heavy).readMarkers });
  assert.deepEqual(metrics(quick), {
    tests: 58,
    readMarkers: 0,
  });
  assert.equal(metrics(heavy).tests, 21);
  assert.ok(metrics(heavy).readMarkers > 0);
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
  const inputSetPaths = (name) => evidence.inputSets[name].entries
    .map((entry) => entry.path);
  assert.ok(inputSetPaths("legacy").includes("tests/scenario_chunk_contracts.quick_cases.mjs"));
  assert.ok(inputSetPaths("legacy").includes("tests/scenario_chunk_contracts.heavy_cases.mjs"));
  assert.ok(inputSetPaths("quick").includes("tests/scenario_chunk_contracts.quick_cases.mjs"));
  assert.equal(inputSetPaths("quick").includes("tests/scenario_chunk_contracts.heavy_cases.mjs"), false);
  assert.ok(inputSetPaths("heavy").includes("tests/scenario_chunk_contracts.heavy_cases.mjs"));
  assert.equal(inputSetPaths("heavy").includes("tests/scenario_chunk_contracts.quick_cases.mjs"), false);
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

test("catalog evidence includes every split source input and observes module changes", () => {
  const blobIdentity = (relativePath) => ({ path: relativePath, algorithm: "git-sha1", blob: "1".repeat(40) });
  const evidence = collectScenarioChunkCatalogEvidence({ blobIdentity });
  const paths = evidence.inputs.map(({ path: relativePath }) => relativePath);
  assert.equal(new Set(paths).size, paths.length);
  for (const file of VERIFICATION_CATALOG_SOURCE_FILES) assert.ok(paths.includes(file), file);
  const manifest = "tools/verification/catalog/source_files.mjs";
  assert.ok(paths.includes(manifest));
  const changed = collectScenarioChunkCatalogEvidence({
    blobIdentity: (relativePath) => ({
      ...blobIdentity(relativePath),
      blob: relativePath === manifest ? "2".repeat(40) : "1".repeat(40),
    }),
  });
  assert.notDeepEqual(changed.inputs, evidence.inputs);
  assert.deepEqual(changed.inputs.filter(({ path: relativePath }) => relativePath !== manifest),
    evidence.inputs.filter(({ path: relativePath }) => relativePath !== manifest));
  assert.deepEqual(changed.inputSets, evidence.inputSets);
});
