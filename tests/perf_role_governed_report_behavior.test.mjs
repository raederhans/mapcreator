import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedCompanionReport,
  buildRawHashManifestSha256,
  buildMarkdown,
  buildRawPerformanceMetricIntegrity,
  evaluateGovernedDecision,
} from "../tools/perf/analyze_render_sample_roles.mjs";
import {
  summarizeSnapshot,
  validateGateBaselineReport,
  validateGateCurrentReport,
} from "../tools/perf/run_baseline.mjs";

test("governed companion reproduces the canonical role medians from frozen raw evidence", async () => {
  const report = await buildGovernedCompanionReport();
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

test("companion report fails closed when the frozen source report identity changes", async () => {
  const report = await buildGovernedCompanionReport({ expectedSourceSha256: "0".repeat(64) });
  assert.equal(report.decision.status, "blocked-rerun-required");
  assert.equal(report.decision.admitted, false);
  assert.ok(report.decision.failedChecks.includes("source_report_sha"));
});
