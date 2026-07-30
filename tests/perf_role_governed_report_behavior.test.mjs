import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildGovernedCompanionReport,
  buildRawHashManifestSha256,
  buildMarkdown,
  buildRawPerformanceMetricIntegrity,
  evaluateGovernedDecision,
} from "../tools/perf/analyze_render_sample_roles.mjs";
import {
  annotatePerfErrorWithDiagnostics,
  collectBaselineContractMismatches,
  getBaselineArtifactDate,
  isTransientPerfNetworkFailure,
  normalizePerfRegressionMode,
  runWithTransientPerfNetworkRetry,
  shouldBlockOnPerfRegressions,
  summarizeSnapshot,
  validateGateBaselineReport,
  validateBaselineOutputSelection,
  validateGateCurrentReport,
  validateGateScenarioSelection,
} from "../tools/perf/run_baseline.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOCK_SEQUENCE = Object.freeze(["A1", "B1", "B2", "A2"]);
const SCENARIOS = Object.freeze(["tno_1962", "hoi4_1939"]);
const CANONICAL_RENDER_MS = Object.freeze({
  tno_1962: Object.freeze({ A: 1197.9000000059605, B: 1195.3499999940395 }),
  hoi4_1939: Object.freeze({ A: 694.5500000119209, B: 694.8000000119209 }),
});
const CANONICAL_RENDER_OFFSETS = Object.freeze([-4, -3, -2, -1, 0, 0, 1, 2, 3, 4]);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function toRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll("\\", "/");
}

function buildExpectedRawManifestSha256(rawFiles) {
  const rows = rawFiles
    .map((entry) => `${entry.path}\0${entry.sha256}\n`)
    .sort();
  return sha256(Buffer.from(rows.join(""), "utf8"));
}

async function writeJson(filePath, payload) {
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  return sha256(bytes);
}

function buildSourceReport() {
  const controlCommit = "a".repeat(40);
  const candidateCommit = "b".repeat(40);
  const blocks = Object.fromEntries(BLOCK_SEQUENCE.map((block) => {
    const side = block.startsWith("A") ? "A" : "B";
    const expectedHead = side === "A" ? controlCommit : candidateCommit;
    return [block, {
      block,
      side,
      valid: true,
      exitCode: 0,
      reasons: [],
      quietAttempts: [{ pass: true }],
      listenersAfter: { port8000: [], port8892: [] },
      taskOwnedChromiumAfter: [],
      runnerSha256: "c".repeat(64),
      packageLockSha256: "d".repeat(64),
      urlQuery: { perf: "1" },
      workloadIdentity: { scenarios: SCENARIOS },
      environment: { platform: "test-fixture" },
      headMatches: true,
      head: expectedHead,
      expectedHead,
    }];
  }));
  return {
    generatedAt: "2026-07-11T00:00:00.000Z",
    experiment: { controlCommit, candidateCommit },
    blocks,
    decision: { status: "failed/blocked", admitted: false },
    promotionClassification: { materialGap: false },
    pooledRegressions: [],
  };
}

function buildRawRun({ scenarioId, side, sideScenarioIndex, firstSampleHasScenario }) {
  const canonicalRenderSampleMs = CANONICAL_RENDER_MS[scenarioId][side]
    + CANONICAL_RENDER_OFFSETS[sideScenarioIndex];
  const firstRenderSampleMs = canonicalRenderSampleMs / 2;
  return {
    summary: {
      totalStartupMs: scenarioId === "tno_1962" ? 1000 : 800,
      renderSampleMedianMs: (firstRenderSampleMs + canonicalRenderSampleMs) / 2,
      scenarioChunkPromotionVisualStageMs: 100,
    },
    snapshot: {
      renderPerfMetrics: {
        scenarioChunkPromotionVisualStage: { recordedAt: 200 },
      },
      renderSamples: {
        count: 2,
        medianMs: (firstRenderSampleMs + canonicalRenderSampleMs) / 2,
        samples: [
          {
            sequence: 1,
            durationMs: firstRenderSampleMs,
            recordedAt: 100,
            activeScenarioId: scenarioId,
            phase: "idle",
            politicalBgProgressive: false,
            contextScenarioMs: firstSampleHasScenario ? 10 : 0,
          },
          {
            sequence: 2,
            durationMs: canonicalRenderSampleMs,
            recordedAt: 300,
            activeScenarioId: scenarioId,
            phase: "idle",
            politicalBgProgressive: true,
            contextScenarioMs: 600,
          },
        ],
      },
    },
  };
}

async function materializeGovernedFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "render-role-governed-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceReportPath = path.join(root, "source-report.json");
  const experimentRoot = path.join(root, "experiment");
  const expectedSourceSha256 = await writeJson(sourceReportPath, buildSourceReport());
  const rawFiles = [];
  const sideScenarioIndexes = { A: { tno_1962: 0, hoi4_1939: 0 }, B: { tno_1962: 0, hoi4_1939: 0 } };

  for (const block of BLOCK_SEQUENCE) {
    const side = block.startsWith("A") ? "A" : "B";
    for (const scenarioId of SCENARIOS) {
      for (let runNumber = 1; runNumber <= 5; runNumber += 1) {
        const sideScenarioIndex = sideScenarioIndexes[side][scenarioId];
        sideScenarioIndexes[side][scenarioId] += 1;
        const scenarioFirstSampleCount = scenarioId === "tno_1962" ? (side === "A" ? 4 : 7) : 5;
        const filePath = path.join(
          experimentRoot,
          side,
          block,
          "raw",
          scenarioId,
          `run-${String(runNumber).padStart(2, "0")}.json`
        );
        const rawSha256 = await writeJson(filePath, buildRawRun({
          scenarioId,
          side,
          sideScenarioIndex,
          firstSampleHasScenario: sideScenarioIndex < scenarioFirstSampleCount,
        }));
        rawFiles.push({ path: toRepoPath(filePath), sha256: rawSha256 });
      }
    }
  }

  return {
    sourceReportPath,
    experimentRoot,
    expectedSourceSha256,
    expectedRawManifestSha256: buildExpectedRawManifestSha256(rawFiles),
  };
}

test("governed companion reproduces canonical role medians from a hermetic synthetic 40-run fixture", async (t) => {
  const fixture = await materializeGovernedFixture(t);
  const report = await buildGovernedCompanionReport(fixture);
  assert.equal(report.reportId, "p2-1-performance-ab-governed-v2-20260711");
  assert.equal(report.policy.policyId, "render-sample-role-v2");
  assert.ok(report.policy.predicates.includes("sample sequences are contiguous from 1 through N"));
  assert.ok(report.policy.predicates.includes("every sample before the canonical candidate is recorded before chunk promotion"));
  assert.equal(report.evidence.rawFileCount, 40);
  assert.equal(report.evidence.roleMatches, 40);
  assert.deepEqual(report.evidence.roleMismatches, []);
  assert.equal(report.canonicalMetric.comparisons.tno_1962.a.median, 1197.9000000059605);
  assert.equal(report.canonicalMetric.comparisons.tno_1962.b.median, 1195.3499999940395);
  assert.equal(report.canonicalMetric.comparisons.hoi4_1939.a.median, 694.5500000119209);
  assert.equal(report.canonicalMetric.comparisons.hoi4_1939.b.median, 694.8000000119209);
  assert.deepEqual(report.legacyMetric.tnoFirstRoleComposition, {
    A: { blank: 6, scenario: 4 },
    B: { blank: 3, scenario: 7 },
  });
  assert.equal(report.hoi4PromotionGap.status, "not-applicable/pass");
  assert.equal(report.sourceReport.legacyDecision.status, "failed/blocked");
  assert.equal(report.decision.status, "accepted-with-governed-reanalysis");
  assert.equal(report.decision.admitted, true);
});

test("governed decision fails closed when any identity or role check fails", () => {
  const decision = evaluateGovernedDecision([
    { id: "identity", status: "pass" },
    { id: "render_sample_roles", status: "fail" },
  ]);
  assert.equal(decision.status, "blocked-rerun-required");
  assert.equal(decision.admitted, false);
  assert.deepEqual(decision.failedChecks, ["render_sample_roles"]);
});

test("raw metric integrity fails closed for missing or non-positive values", () => {
  const records = [
    { block: "A1", scenarioId: "tno_1962", runNumber: 1, totalStartupMs: 100, canonicalRenderSampleMs: 20 },
    { block: "A1", scenarioId: "hoi4_1939", runNumber: 1, totalStartupMs: null, canonicalRenderSampleMs: 30 },
    { block: "B1", scenarioId: "tno_1962", runNumber: 1, totalStartupMs: 200, canonicalRenderSampleMs: 0 },
  ];
  const integrity = buildRawPerformanceMetricIntegrity(records);
  assert.equal(integrity.pass, false);
  assert.deepEqual(integrity.invalidRecords.map((entry) => entry.metric), [
    "totalStartupMs",
    "canonicalRenderSampleMs",
  ]);
});

test("raw hash manifest binds path and content hashes as one trusted identity", () => {
  const files = [
    { path: ".runtime/output/a.json", sha256: "a".repeat(64) },
    { path: ".runtime/output/b.json", sha256: "b".repeat(64) },
  ];
  const expected = buildRawHashManifestSha256(files);
  assert.equal(buildRawHashManifestSha256([...files].reverse()), expected);
  assert.notEqual(buildRawHashManifestSha256([
    files[0],
    { ...files[1], sha256: "c".repeat(64) },
  ]), expected);
});

test("blocked reports render missing comparison metrics without crashing", () => {
  const comparison = {
    a: { median: null },
    b: { median: 12 },
    deltaMs: null,
    deltaPercent: null,
    status: "blocked-rerun-required",
  };
  const markdown = buildMarkdown({
    decision: { status: "blocked-rerun-required", admitted: false },
    policy: { policyId: "policy", canonicalRoleId: "role" },
    sourceReport: { sha256: "0".repeat(64), legacyDecision: { status: "failed/blocked" } },
    evidence: { rawFileCount: 40, roleMatches: 39, roleMismatches: [{}] },
    canonicalMetric: { comparisons: { tno_1962: comparison, hoi4_1939: comparison } },
    legacyMetric: { tnoFirstRoleComposition: { A: { blank: 1, scenario: 0 }, B: { blank: 1, scenario: 0 } } },
    checks: [{ id: "raw_performance_metrics_complete", status: "fail" }],
  });
  assert.match(markdown, /A=missing ms/);
  assert.match(markdown, /delta=missing ms \(missing%\)/);
});

test("baseline admission rejects coerced gate metrics before comparison", () => {
  const validSummary = {
    totalStartupMs: 100,
    scenarioAppliedMs: 100,
    applyScenarioBundleMs: 100,
    refreshScenarioApplyMs: 100,
    renderSampleMedianMs: 100,
  };
  for (const invalidValue of [true, [100], "100"]) {
    const report = {
      schemaVersion: 2,
      benchmarkMetricsSchemaVersion: "3.3",
      probeSchema: "mc_perf_snapshot",
      scenarios: { tno_1962: { summary: { ...validSummary, totalStartupMs: invalidValue } } },
    };
    assert.throws(() => validateGateBaselineReport(report, ["tno_1962"], "fixture.json"), /invalid gate metrics/);
    assert.throws(() => validateGateCurrentReport(report, ["tno_1962"], "fixture"), /invalid gate metrics/);
  }
});

test("baseline admission requires the current schema-2 oracle", () => {
  const validSummary = {
    totalStartupMs: 100,
    scenarioAppliedMs: 100,
    applyScenarioBundleMs: 100,
    refreshScenarioApplyMs: 100,
    renderSampleMedianMs: 100,
  };
  const legacyReport = {
    schemaVersion: 1,
    benchmarkMetricsSchemaVersion: "3.3",
    probeSchema: "mc_perf_snapshot",
    scenarios: { tno_1962: { summary: validSummary } },
  };
  assert.throws(
    () => validateGateBaselineReport(legacyReport, ["tno_1962"], "legacy.json"),
    /schema mismatch/,
  );
});

test("gate scenario selection fails before measurement unless the canonical set is exact", () => {
  assert.doesNotThrow(() => validateGateScenarioSelection(["tno_1962", "hoi4_1939"]));
  for (const scenarios of [
    ["tno_1962"],
    ["hoi4_1939", "tno_1962"],
    ["tno_1962", "tno_1962"],
    ["blank_base", "tno_1962", "hoi4_1939"],
  ]) {
    assert.throws(
      () => validateGateScenarioSelection(scenarios),
      /Gate scenarios must exactly match/,
    );
  }
});

test("browser diagnostics remain visible in both error message and logged stack", () => {
  const error = new Error("bootstrap failed");
  annotatePerfErrorWithDiagnostics(
    error,
    ".runtime/tests/playwright/perf-baseline/tno_1962-warmup-01.json",
  );

  assert.match(error.message, /Browser diagnostics: \.runtime\/tests\/playwright\/perf-baseline/);
  assert.match(error.stack, /Browser diagnostics: \.runtime\/tests\/playwright\/perf-baseline/);
});

test("regression policy blocks runtime regressions and keeps tooling-only deltas diagnostic", () => {
  const failures = [{ scenarioId: "tno_1962", metricKey: "refreshScenarioApplyMs" }];

  assert.equal(normalizePerfRegressionMode(undefined), "enforce");
  assert.equal(normalizePerfRegressionMode("enforce"), "enforce");
  assert.equal(normalizePerfRegressionMode("diagnostic"), "diagnostic");
  assert.equal(shouldBlockOnPerfRegressions("enforce", failures), true);
  assert.equal(shouldBlockOnPerfRegressions("diagnostic", failures), false);
  assert.equal(shouldBlockOnPerfRegressions("enforce", []), false);
  assert.throws(() => shouldBlockOnPerfRegressions("enforce", null), /failures must be an array/);
  assert.throws(() => normalizePerfRegressionMode("ignore"), /regression mode/);
});

// 这组用例共同锁住 allowlist 与重试上限，防止把产品启动错误误归为 runner 网络抖动。
test("explicit Chromium network-change failures get one isolated retry", async () => {
  const attempts = [];
  const result = await runWithTransientPerfNetworkRetry(async () => {
    attempts.push(attempts.length + 1);
    if (attempts.length === 1) {
      throw new Error("script request failed: net::ERR_NETWORK_CHANGED");
    }
    return "recovered";
  });

  assert.equal(result, "recovered");
  assert.deepEqual(attempts, [1, 2]);
  assert.equal(isTransientPerfNetworkFailure(new Error("net::ERR_CONNECTION_RESET")), true);
  assert.equal(isTransientPerfNetworkFailure(new Error("net::ERR_CONNECTION_FAILED")), true);
  assert.equal(isTransientPerfNetworkFailure(new Error("scenario activation mismatch")), false);
});

test("network retry stays bounded and ordinary boot failures remain fail-closed", async () => {
  let networkAttempts = 0;
  await assert.rejects(
    runWithTransientPerfNetworkRetry(async () => {
      networkAttempts += 1;
      throw new Error("net::ERR_NETWORK_CHANGED");
    }),
    /ERR_NETWORK_CHANGED/,
  );
  assert.equal(networkAttempts, 2);

  let ordinaryAttempts = 0;
  await assert.rejects(
    runWithTransientPerfNetworkRetry(async () => {
      ordinaryAttempts += 1;
      throw new Error("scenario activation mismatch");
    }),
    /scenario activation mismatch/,
  );
  assert.equal(ordinaryAttempts, 1);
});

function makeSchema2IdentityReport() {
  return {
    schemaVersion: 2,
    benchmarkMetricsSchemaVersion: "3.3",
    probeSchema: "mc_perf_snapshot",
    environment: {
      os: "win32 10.0.26200",
      platform: "win32",
      release: "10.0.26200",
      arch: "x64",
      cpuModel: "Fixture CPU",
      cpuCount: 24,
      memoryGiB: 64,
      runnerIdentity: {
        provider: "local",
        environment: "local",
        os: "win32",
        arch: "x64",
        imageOs: "win32",
        imageVersion: "10.0.26200",
      },
      node: "v22.23.0",
      nodeMajor: 22,
      browser: "chromium-headless",
      browserVersion: "145.0.7632.6",
      packageLockSha256: "a".repeat(64),
    },
    config: {
      scenarios: ["tno_1962", "hoi4_1939"],
      runs: 5,
      warmups: 3,
      urlQuery: { perf: 1 },
    },
    workloadIdentity: {
      scenarios: {
        tno_1962: {
          manifestSha256: "b".repeat(64),
          featureCount: 12865,
        },
        hoi4_1939: {
          manifestSha256: "c".repeat(64),
          featureCount: 12602,
        },
      },
    },
  };
}

test("baseline identity comparison rejects each schema-2 workload drift independently", () => {
  const cases = [
    ["browserVersion", (report) => { report.environment.browserVersion = "146.0.0.0"; }, /browser version mismatch/],
    ["packageLockSha256", (report) => { report.environment.packageLockSha256 = "c".repeat(64); }, /package lock mismatch/],
    ["runs", (report) => { report.config.runs = 4; }, /runs mismatch/],
    ["manifestSha256", (report) => { report.workloadIdentity.scenarios.tno_1962.manifestSha256 = "d".repeat(64); }, /manifestSha256 mismatch/],
    ["featureCount", (report) => { report.workloadIdentity.scenarios.tno_1962.featureCount = 12866; }, /featureCount mismatch/],
  ];

  for (const [label, mutate, expected] of cases) {
    const baseline = makeSchema2IdentityReport();
    const current = makeSchema2IdentityReport();
    mutate(current);
    const mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} should produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("baseline identity comparison accepts observation-only scenario supersets", () => {
  const baseline = makeSchema2IdentityReport();
  const current = makeSchema2IdentityReport();
  const hoi4Identity = {
    manifestSha256: "d".repeat(64),
    featureCount: 12602,
  };
  baseline.config.scenarios = ["blank_base", "tno_1962", "hoi4_1939"];
  current.config.scenarios = ["tno_1962", "hoi4_1939"];
  baseline.workloadIdentity.scenarios.blank_base = {
    manifestSha256: "c".repeat(64),
    featureCount: 11294,
  };
  baseline.workloadIdentity.scenarios.hoi4_1939 = { ...hoi4Identity };
  current.workloadIdentity.scenarios.hoi4_1939 = { ...hoi4Identity };

  assert.deepEqual(collectBaselineContractMismatches(current, baseline), []);

  baseline.config.scenarios = ["blank_base", "tno_1962"];
  assert.deepEqual(
    collectBaselineContractMismatches(current, baseline),
    ['scenarios mismatch: baseline=["blank_base","tno_1962"] current=["tno_1962","hoi4_1939"]'],
  );

  baseline.config.scenarios = ["blank_base", "tno_1962", "hoi4_1939"];
  current.config.scenarios = ["hoi4_1939", "tno_1962"];
  assert.match(collectBaselineContractMismatches(current, baseline)[0], /scenarios mismatch/);

  current.config.scenarios = ["tno_1962", "tno_1962"];
  assert.match(collectBaselineContractMismatches(current, baseline)[0], /scenarios mismatch/);

  current.config.scenarios = ["tno_1962", "hoi4_1939"];
  baseline.config.scenarios = ["blank_base", "tno_1962", "tno_1962", "hoi4_1939"];
  assert.match(collectBaselineContractMismatches(current, baseline)[0], /scenarios mismatch/);
});

test("custom baseline scenarios cannot overwrite canonical output paths", () => {
  const canonicalOptions = {
    mode: "baseline",
    scenarios: ["tno_1962", "hoi4_1939"],
    baselineJson: path.join(REPO_ROOT, "docs", "perf", "baseline_2026-07-14.json"),
    baselineMd: path.join(REPO_ROOT, "docs", "perf", "baseline_2026-07-14.md"),
    rawDir: path.join(REPO_ROOT, ".runtime", "output", "perf", "baseline_2026-07-14"),
    writeMarkdown: true,
  };
  assert.doesNotThrow(() => validateBaselineOutputSelection(canonicalOptions));
  assert.throws(
    () => validateBaselineOutputSelection({ ...canonicalOptions, scenarios: ["blank_base"] }),
    /custom scenarios require custom output paths/,
  );
  assert.doesNotThrow(() => validateBaselineOutputSelection({
    ...canonicalOptions,
    scenarios: ["blank_base"],
    baselineJson: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank.json"),
    baselineMd: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank.md"),
    rawDir: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank"),
  }));

  const customOptions = {
    ...canonicalOptions,
    scenarios: ["blank_base"],
    baselineJson: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank.json"),
    baselineMd: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank.md"),
    rawDir: path.join(REPO_ROOT, ".runtime", "output", "perf", "blank"),
  };
  for (const [field, canonicalPath] of [
    ["baselineJson", canonicalOptions.baselineJson],
    ["baselineMd", canonicalOptions.baselineMd],
    ["rawDir", canonicalOptions.rawDir],
  ]) {
    const caseVariantOptions = {
      ...customOptions,
      [field]: canonicalPath.toUpperCase(),
    };
    if (process.platform === "win32") {
      assert.throws(
        () => validateBaselineOutputSelection(caseVariantOptions),
        /custom scenarios require custom output paths/,
        `${field} must use Windows case-insensitive canonical path comparison`,
      );
    } else {
      assert.doesNotThrow(() => validateBaselineOutputSelection(caseVariantOptions));
    }
  }
});

test("baseline artifact date follows the selected oracle filename", () => {
  assert.equal(
    getBaselineArtifactDate(path.join(REPO_ROOT, "docs", "perf", "baseline_2026-07-30.json")),
    "2026-07-30",
  );
  assert.equal(getBaselineArtifactDate(path.join(REPO_ROOT, "custom.json")), "2026-07-14");
});

test("baseline identity comparison rejects an incomplete canonical gate scenario set", () => {
  const baseline = makeSchema2IdentityReport();
  const current = makeSchema2IdentityReport();
  baseline.config.scenarios = ["blank_base", "tno_1962", "hoi4_1939"];
  current.config.scenarios = ["tno_1962"];

  assert.match(
    collectBaselineContractMismatches(current, baseline)[0],
    /scenarios mismatch/,
  );
});

test("baseline identity comparison reports invalid scenario collection types without throwing", () => {
  const baseline = makeSchema2IdentityReport();
  const current = makeSchema2IdentityReport();
  current.config.scenarios = { tno_1962: true, hoi4_1939: true };

  const mismatches = collectBaselineContractMismatches(current, baseline);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /scenarios mismatch/);
});

const missingSchema2IdentityCases = [
  ["platform", (report) => { delete report.environment.platform; }, /os platform mismatch/],
  ["release", (report) => { delete report.environment.release; }, /os release mismatch/],
  ["arch", (report) => { delete report.environment.arch; }, /architecture mismatch/],
  ["cpuModel", (report) => { delete report.environment.cpuModel; }, /CPU model mismatch/],
  ["cpuCount", (report) => { delete report.environment.cpuCount; }, /CPU count mismatch/],
  ["memoryGiB", (report) => { delete report.environment.memoryGiB; }, /memory class mismatch/],
  ["runnerIdentity", (report) => { delete report.environment.runnerIdentity; }, /runner identity mismatch/],
  ["nodeMajor", (report) => { delete report.environment.nodeMajor; }, /node major mismatch/],
  ["browser", (report) => { delete report.environment.browser; }, /browser mismatch/],
  ["browserVersion", (report) => { delete report.environment.browserVersion; }, /browser version mismatch/],
  ["packageLockSha256", (report) => { delete report.environment.packageLockSha256; }, /package lock mismatch/],
  ["runs", (report) => { delete report.config.runs; }, /runs mismatch/],
  ["warmups", (report) => { delete report.config.warmups; }, /warmups mismatch/],
  ["scenarios", (report) => { delete report.config.scenarios; }, /scenarios mismatch/],
  ["urlQuery", (report) => { delete report.config.urlQuery; }, /urlQuery mismatch/],
];

test("baseline identity comparison rejects missing schema-2 workload fields", () => {
  const cases = missingSchema2IdentityCases;

  for (const [label, mutate, expected] of cases) {
    const baseline = makeSchema2IdentityReport();
    const current = makeSchema2IdentityReport();
    mutate(baseline);
    const mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} should produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("baseline identity comparison rejects current-side and bilateral schema-2 identity gaps", () => {
  for (const [label, mutate, expected] of missingSchema2IdentityCases) {
    const baseline = makeSchema2IdentityReport();
    const current = makeSchema2IdentityReport();
    mutate(current);
    let mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} current-side gap should produce one focused mismatch`);
    assert.match(mismatches[0], expected);

    mutate(baseline);
    mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} bilateral gap should still produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("baseline identity comparison rejects malformed exact platform and node identities", () => {
  const cases = [
    ["platform suffix", (report) => { report.environment.platform = "win32 extra"; }, /os platform mismatch/],
    ["fractional nodeMajor", (report) => { report.environment.nodeMajor = 22.9; }, /node major mismatch/],
    ["string nodeMajor", (report) => { report.environment.nodeMajor = "22junk"; }, /node major mismatch/],
  ];

  for (const [label, mutate, expected] of cases) {
    let baseline = makeSchema2IdentityReport();
    let current = makeSchema2IdentityReport();
    mutate(baseline);
    let mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} baseline-side drift should produce one focused mismatch`);
    assert.match(mismatches[0], expected);

    baseline = makeSchema2IdentityReport();
    current = makeSchema2IdentityReport();
    mutate(current);
    mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} current-side drift should produce one focused mismatch`);
    assert.match(mismatches[0], expected);

    mutate(baseline);
    mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} bilateral drift should still produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("baseline identity comparison rejects machine and runner drift", () => {
  const cases = [
    ["release", (report) => { report.environment.release = "10.0.99999"; }, /os release mismatch/],
    ["arch", (report) => { report.environment.arch = "arm64"; }, /architecture mismatch/],
    ["cpuModel", (report) => { report.environment.cpuModel = "Different CPU"; }, /CPU model mismatch/],
    ["cpuCount", (report) => { report.environment.cpuCount += 1; }, /CPU count mismatch/],
    ["memoryGiB", (report) => { report.environment.memoryGiB += 8; }, /memory class mismatch/],
    ["runnerIdentity", (report) => { report.environment.runnerIdentity.imageVersion = "different"; }, /runner identity mismatch/],
  ];

  for (const [label, mutate, expected] of cases) {
    const baseline = makeSchema2IdentityReport();
    const current = makeSchema2IdentityReport();
    mutate(current);
    const mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} should produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("baseline identity comparison rejects missing scenario workload identity on either side", () => {
  const cases = [
    ["manifestSha256", (report) => { delete report.workloadIdentity.scenarios.tno_1962.manifestSha256; }, /manifestSha256 mismatch/],
    ["featureCount", (report) => { delete report.workloadIdentity.scenarios.tno_1962.featureCount; }, /featureCount mismatch/],
  ];

  for (const [label, mutate, expected] of cases) {
    let baseline = makeSchema2IdentityReport();
    let current = makeSchema2IdentityReport();
    mutate(baseline);
    let mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} baseline-side gap should produce one focused mismatch`);
    assert.match(mismatches[0], expected);

    baseline = makeSchema2IdentityReport();
    current = makeSchema2IdentityReport();
    mutate(current);
    mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} current-side gap should produce one focused mismatch`);
    assert.match(mismatches[0], expected);

    mutate(baseline);
    mismatches = collectBaselineContractMismatches(current, baseline);
    assert.equal(mismatches.length, 1, `${label} bilateral gap should still produce one focused mismatch`);
    assert.match(mismatches[0], expected);
  }
});

test("snapshot summarization keeps non-number measurements out of gate summaries", () => {
  const summary = summarizeSnapshot({
    bootMetrics: { total: { durationMs: true } },
    renderPerfMetrics: { scenarioApplyMapRefresh: { durationMs: [100] } },
    renderSamples: { count: 2, medianMs: "100", samples: [] },
  }, "tno_1962");
  assert.equal(summary.totalStartupMs, 0);
  assert.equal(summary.refreshScenarioApplyMs, 0);
  assert.equal(summary.renderSampleMedianMs, 0);
});

test("companion report fails closed when the injected source report identity changes", async (t) => {
  const fixture = await materializeGovernedFixture(t);
  const report = await buildGovernedCompanionReport({
    ...fixture,
    expectedSourceSha256: "0".repeat(64),
  });
  assert.equal(report.decision.status, "blocked-rerun-required");
  assert.equal(report.decision.admitted, false);
  assert.ok(report.decision.failedChecks.includes("source_report_sha"));
});
