import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scenarioChunkContractRegistrationManifest } from "../../tests/scenario_chunk_contracts.test.mjs";
import { prepareRepositoryVerificationCatalog } from "./script_portfolio.mjs";
import { VERIFICATION_COMMAND_SUPERSESSION } from "./command_supersession.mjs";
import { VERIFICATION_CATALOG_SOURCE_FILES } from "./catalog/source_files.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT_ROOT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "pr7-shadow");
const COMMANDS = Object.freeze({
  legacy: "test:node:scenario-chunk-contracts",
  quick: "test:node:scenario-chunk-contracts:quick",
  heavy: "test:node:scenario-chunk-contracts:heavy",
  split: "test:node:scenario-chunk-contracts:split",
  shadow: "test:node:scenario-chunk-contracts:shadow",
});
const TEST_PATHS = Object.freeze({
  legacy: "tests/scenario_chunk_contracts.test.mjs",
  quick: "tests/scenario_chunk_contracts.quick.test.mjs",
  heavy: "tests/scenario_chunk_contracts.heavy.test.mjs",
});
const INPUT_PATHS = Object.freeze([
  TEST_PATHS.legacy,
  TEST_PATHS.quick,
  TEST_PATHS.heavy,
  "tests/helpers/scenario_chunk_contract_support.mjs",
  "tests/scenario_chunk_contract_shadow_behavior.test.mjs",
  "tools/verification/test_shadow_equivalence.mjs",
  ...VERIFICATION_CATALOG_SOURCE_FILES,
  "package.json",
]);
const EXPECTED_POLICY = Object.freeze({
  [COMMANDS.legacy]: Object.freeze({
    executionOwner: "child-safe",
    ciProfiles: Object.freeze(["pr-fast"]),
    resourceLocks: Object.freeze([]),
  }),
  [COMMANDS.quick]: Object.freeze({
    executionOwner: "child-safe",
    ciProfiles: Object.freeze(["pr-fast"]),
    resourceLocks: Object.freeze([]),
  }),
  [COMMANDS.heavy]: Object.freeze({
    executionOwner: "main-thread",
    ciProfiles: Object.freeze(["full"]),
    resourceLocks: Object.freeze(["scenario-data"]),
  }),
  [COMMANDS.split]: Object.freeze({
    executionOwner: "main-thread",
    ciProfiles: Object.freeze(["full"]),
    resourceLocks: Object.freeze(["scenario-data"]),
  }),
  [COMMANDS.shadow]: Object.freeze({
    executionOwner: "main-thread",
    ciProfiles: Object.freeze(["full"]),
    resourceLocks: Object.freeze([".runtime-output", "scenario-data"]),
  }),
});
const EXPECTED_SUPERSESSION_CLOSURE = Object.freeze({
  p4_2b: Object.freeze([
    "test:node:p4:p4-2b",
    "test:node:scenario-chunk-contracts",
  ]),
  p4_3: Object.freeze([
    "verify:p4:p4-3",
    "test:node:p4:p4-3",
    "test:node:renderer-render-phase-lifecycle",
    "test:node:zoom-interaction-lifecycle-owner",
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
    "test:python:p4:p4-3-boundary",
    "verify:p4:state-writer-policy",
  ]),
  tno: Object.freeze([
    "verify:tno-coverage-chain",
    "test:node:scenario-chunk-contracts",
    "verify:scenario-contracts:strict",
    "verify:tno-atlantropa-coverage",
    "verify:tno-coverage-ledger",
    "verify:tno-polar-coverage",
  ]),
});

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function parseScenarioChunkTap(output) {
  const results = [];
  for (const line of String(output || "").split(/\r?\n/)) {
    const match = /^(ok|not ok) \d+ - (.*?)(?: # (SKIP|TODO)(?: .*)?)?$/.exec(line);
    if (!match) continue;
    const status = match[3]?.toLowerCase() || (match[1] === "ok" ? "pass" : "fail");
    results.push({ name: match[2], status });
  }
  return results;
}

export function runScenarioChunkTest(relativePath, {
  spawn = spawnSync,
  cwd = REPO_ROOT,
} = {}) {
  const completed = spawn(process.execPath, ["--test", relativePath], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const exitCode = Number.isInteger(completed.status) ? completed.status : 2;
  const output = `${completed.stdout || ""}${completed.stderr || ""}`;
  return {
    relativePath,
    exitCode,
    signal: completed.signal || null,
    results: parseScenarioChunkTap(output),
  };
}

function assertIndependentRuns(baseline, quick, heavy) {
  if (baseline === quick || baseline === heavy || quick === heavy) {
    throw new Error("scenario-chunk-shadow-shared-run-object");
  }
  if (baseline.results === quick.results || baseline.results === heavy.results || quick.results === heavy.results) {
    throw new Error("scenario-chunk-shadow-shared-result-array");
  }
}

function indexUniqueResults(results, partition, mismatches) {
  const index = new Map();
  for (const result of results) {
    if (index.has(result.name)) mismatches.push(`duplicate-${partition}-test:${result.name}`);
    index.set(result.name, result);
  }
  return index;
}

export function compareScenarioChunkContractRuns({
  baseline,
  quick,
  heavy,
  manifest = scenarioChunkContractRegistrationManifest(),
}) {
  assertIndependentRuns(baseline, quick, heavy);
  const mismatches = [];
  const quickManifest = manifest.filter((entry) => entry.partition === "quick");
  const heavyManifest = manifest.filter((entry) => entry.partition === "heavy");
  if (manifest.length !== 79) mismatches.push(`manifest-count:${manifest.length}`);
  if (quickManifest.length !== 58) mismatches.push(`quick-manifest-count:${quickManifest.length}`);
  if (heavyManifest.length !== 21) mismatches.push(`heavy-manifest-count:${heavyManifest.length}`);
  if (baseline.results.length !== 79) mismatches.push(`legacy-result-count:${baseline.results.length}`);
  if (quick.results.length !== 58) mismatches.push(`quick-result-count:${quick.results.length}`);
  if (heavy.results.length !== 21) mismatches.push(`heavy-result-count:${heavy.results.length}`);

  const legacyNames = baseline.results.map((entry) => entry.name);
  const manifestNames = manifest.map((entry) => entry.name);
  if (stableJson(legacyNames) !== stableJson(manifestNames)) mismatches.push("legacy-registration-order-drift");

  const quickIndex = indexUniqueResults(quick.results, "quick", mismatches);
  const heavyIndex = indexUniqueResults(heavy.results, "heavy", mismatches);
  const candidateOrdered = manifest.map((entry) => (
    entry.partition === "quick" ? quickIndex.get(entry.name) : heavyIndex.get(entry.name)
  ));
  for (let index = 0; index < manifest.length; index += 1) {
    const expected = baseline.results[index];
    const actual = candidateOrdered[index];
    if (!actual) {
      mismatches.push(`missing-${manifest[index].partition}-test:${manifest[index].name}`);
      continue;
    }
    if (actual.name !== expected?.name) mismatches.push(`name-drift:${index}`);
    if (actual.status !== expected?.status) {
      mismatches.push(`status-drift:${manifest[index].name}:${expected?.status || "missing"}->${actual.status}`);
    }
  }

  const candidateExitCode = quick.exitCode === 0 && heavy.exitCode === 0 ? 0 : 1;
  if (candidateExitCode !== baseline.exitCode) {
    mismatches.push(`exit-drift:${baseline.exitCode}->${candidateExitCode}`);
  }
  return {
    equal: mismatches.length === 0,
    mismatches,
    counts: {
      legacy: baseline.results.length,
      quick: quick.results.length,
      heavy: heavy.results.length,
      split: quick.results.length + heavy.results.length,
    },
    exits: {
      legacy: baseline.exitCode,
      quick: quick.exitCode,
      heavy: heavy.exitCode,
      split: candidateExitCode,
    },
    orderedResults: baseline.results.map((entry) => ({ ...entry })),
  };
}

function gitBlobIdentity(relativePath, {
  spawn = spawnSync,
  cwd = REPO_ROOT,
} = {}) {
  const completed = spawn("git", ["hash-object", "--", relativePath], {
    cwd,
    encoding: "utf8",
  });
  const blob = String(completed.stdout || "").trim();
  if (completed.status !== 0 || !/^[0-9a-f]{40}$/.test(blob)) {
    throw new Error(`scenario-chunk-shadow-blob-identity-failed:${relativePath}`);
  }
  return { path: relativePath, algorithm: "git-sha1", blob };
}

function supersessionClosure(root, supersession = VERIFICATION_COMMAND_SUPERSESSION, seen = new Set()) {
  if (seen.has(root)) return [];
  seen.add(root);
  return [root, ...(supersession[root] || []).flatMap((child) => supersessionClosure(child, supersession, seen))];
}

export function collectScenarioChunkCatalogEvidence({
  packageScripts = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).scripts,
  prepareCatalog = prepareRepositoryVerificationCatalog,
  blobIdentity = (relativePath) => gitBlobIdentity(relativePath),
} = {}) {
  const prepared = prepareCatalog({ packageScripts });
  const leaves = {};
  const policyMismatches = [];
  for (const commandRef of Object.values(COMMANDS)) {
    const leaf = prepared.catalog.entries.find((entry) => entry.id === commandRef);
    if (!leaf) {
      policyMismatches.push(`missing-leaf:${commandRef}`);
      continue;
    }
    const policy = {
      executionOwner: leaf.executionOwner,
      ciProfiles: [...leaf.ciProfiles],
      resourceLocks: [...leaf.resourceLocks],
    };
    if (stableJson(policy) !== stableJson(EXPECTED_POLICY[commandRef])) {
      policyMismatches.push(`policy-drift:${commandRef}`);
    }
    leaves[commandRef] = {
      identity: { algorithm: "sha256", digest: digest(leaf) },
      policy,
    };
  }
  const reachability = {
    p4_2b: packageScripts["test:node:p4:p4-2b"]?.includes(TEST_PATHS.legacy) === true,
    p4_3: packageScripts["test:node:p4:p4-3"]?.includes(TEST_PATHS.legacy) === true,
    tno: packageScripts["verify:tno-coverage-chain"]?.includes(`npm run ${COMMANDS.legacy}`) === true,
    full: prepared.catalog.entries.some((entry) => (
      entry.kind === "suite"
      && entry.refs?.some((ref) => ref.id === COMMANDS.legacy)
      && entry.ciProfiles?.includes("full")
    )),
  };
  for (const [name, reachable] of Object.entries(reachability)) {
    if (!reachable) policyMismatches.push(`reachability-drift:${name}`);
  }
  const closure = {
    p4_2b: supersessionClosure("test:node:p4:p4-2b"),
    p4_3: supersessionClosure("verify:p4:p4-3"),
    tno: supersessionClosure("verify:tno-coverage-chain"),
  };
  for (const [name, commands] of Object.entries(closure)) {
    if (stableJson(commands) !== stableJson(EXPECTED_SUPERSESSION_CLOSURE[name])) {
      policyMismatches.push(`supersession-closure-drift:${name}`);
    }
  }
  const inputs = INPUT_PATHS.map((relativePath) => blobIdentity(relativePath));
  const inputByPath = new Map(inputs.map((entry) => [entry.path, entry]));
  const inputSet = (paths) => {
    const entries = paths.map((relativePath) => inputByPath.get(relativePath));
    return { entries, identity: { algorithm: "sha256", digest: digest(entries) } };
  };
  return {
    equal: policyMismatches.length === 0,
    mismatches: policyMismatches,
    inputs,
    inputSets: {
      legacy: inputSet([TEST_PATHS.legacy, "tests/helpers/scenario_chunk_contract_support.mjs"]),
      quick: inputSet([TEST_PATHS.quick, TEST_PATHS.legacy, "tests/helpers/scenario_chunk_contract_support.mjs"]),
      heavy: inputSet([TEST_PATHS.heavy, TEST_PATHS.legacy, "tests/helpers/scenario_chunk_contract_support.mjs"]),
    },
    sourceIdentity: prepared.sourceIdentity,
    catalogIdentity: {
      ...prepared.catalog.identity,
      digest: prepared.catalogDigest,
    },
    leaves,
    reachability,
    supersessionClosure: closure,
  };
}

function writeShadowReport(report, {
  reportRoot = REPORT_ROOT,
  writeFile = fs.writeFileSync,
  makeDirectory = fs.mkdirSync,
} = {}) {
  makeDirectory(reportRoot, { recursive: true });
  const reportPath = path.join(reportRoot, "scenario-chunk-contract-shadow.json");
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path.relative(REPO_ROOT, reportPath).replaceAll("\\", "/");
}

export function runScenarioChunkShadow({
  run = (relativePath) => runScenarioChunkTest(relativePath),
  catalogEvidence = () => collectScenarioChunkCatalogEvidence(),
  writeReport = (report) => writeShadowReport(report),
} = {}) {
  const baseline = run(TEST_PATHS.legacy);
  const quick = run(TEST_PATHS.quick);
  const heavy = run(TEST_PATHS.heavy);
  const equivalence = compareScenarioChunkContractRuns({ baseline, quick, heavy });
  const catalog = catalogEvidence();
  const report = {
    schemaVersion: 1,
    kind: "scenario-chunk-contract-shadow-equivalence",
    equal: equivalence.equal && catalog.equal,
    equivalence,
    catalog,
  };
  report.reportPath = writeReport(report);
  return report;
}

export function runScenarioChunkSplit({
  run = (relativePath) => runScenarioChunkTest(relativePath),
} = {}) {
  const quick = run(TEST_PATHS.quick);
  const heavy = run(TEST_PATHS.heavy);
  return {
    schemaVersion: 1,
    kind: "scenario-chunk-contract-split-run",
    exitCode: quick.exitCode === 0 && heavy.exitCode === 0 ? 0 : 1,
    counts: { quick: quick.results.length, heavy: heavy.results.length, split: quick.results.length + heavy.results.length },
    exits: { quick: quick.exitCode, heavy: heavy.exitCode },
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || !new Set(["--split", "--shadow"]).has(argv[0])) {
    console.error("Usage: node tools/verification/test_shadow_equivalence.mjs --split|--shadow");
    return 2;
  }
  const report = argv[0] === "--split" ? runScenarioChunkSplit() : runScenarioChunkShadow();
  console.log(JSON.stringify(report, null, 2));
  return argv[0] === "--split" ? report.exitCode : (report.equal ? 0 : 1);
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}

export { COMMANDS as SCENARIO_CHUNK_CONTRACT_COMMANDS, INPUT_PATHS as SCENARIO_CHUNK_CONTRACT_INPUT_PATHS };
