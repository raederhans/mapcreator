import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MODULE_PATH = "../js/core/state/actions/renderer_diagnostics_actions.js";
const SOURCE_URL = new URL(MODULE_PATH, import.meta.url);

async function loadActions() {
  return import(MODULE_PATH);
}

test("renderer diagnostics actions stay import-free with target-first exports", async () => {
  const source = await readFile(SOURCE_URL, "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  for (const name of [
    "ensureRenderPerfMetricsState",
    "setRenderPerfMetricEntryState",
    "setRenderPerfContextBreakdownState",
    "commitRenderPerfMetricState",
    "setFirstVisibleFramePaintedState",
    "resetProjectedBoundsDiagnosticsState",
    "setProjectedBoundsDiagnosticsState",
    "setDebugCountryCoverageState",
  ]) {
    assert.match(source, new RegExp(`export function ${name}\\(\\s*target[,)]`));
  }
});

test("renderer diagnostics actions reject invalid targets", async () => {
  const actions = await loadActions();
  for (const target of [null, undefined, [], "state"]) {
    assert.throws(() => actions.ensureRenderPerfMetricsState(target), /target must be an object/);
    assert.throws(() => actions.setRenderPerfMetricEntryState(target, { name: "frame", entry: {} }), /target must be an object/);
    assert.throws(() => actions.setRenderPerfContextBreakdownState(target, {}), /target must be an object/);
    assert.throws(() => actions.commitRenderPerfMetricState(target, { name: "frame", entry: {}, sequence: 1 }), /target must be an object/);
    assert.throws(() => actions.setFirstVisibleFramePaintedState(target, true), /target must be an object/);
    assert.throws(() => actions.resetProjectedBoundsDiagnosticsState(target), /target must be an object/);
    assert.throws(() => actions.setProjectedBoundsDiagnosticsState(target, {}), /target must be an object/);
    assert.throws(() => actions.setDebugCountryCoverageState(target, null), /target must be an object/);
  }
});

test("render perf holder actions commit caller-built state exactly", async () => {
  const {
    commitRenderPerfMetricState,
    ensureRenderPerfMetricsState,
    setRenderPerfContextBreakdownState,
    setRenderPerfMetricEntryState,
  } = await loadActions();
  const target = { renderPerfMetrics: null, renderPerfMetricSequence: 4 };
  assert.equal(ensureRenderPerfMetricsState(target), true);
  assert.deepEqual(target.renderPerfMetrics, {});

  const metrics = target.renderPerfMetrics;
  const entry = { durationMs: 7, sequence: 5 };
  assert.equal(commitRenderPerfMetricState(target, {
    name: "drawFrame",
    entry,
    sequence: 5,
  }), 5);
  assert.equal(target.renderPerfMetrics, metrics);
  assert.equal(target.renderPerfMetrics.drawFrame, entry);
  assert.equal(target.renderPerfMetricSequence, 5);

  const supplementalEntry = { durationMs: 9 };
  assert.equal(setRenderPerfMetricEntryState(target, {
    name: "longAnimationFrame",
    entry: supplementalEntry,
  }), supplementalEntry);
  assert.equal(target.renderPerfMetrics, metrics);
  assert.equal(target.renderPerfMetrics.longAnimationFrame, supplementalEntry);
  const breakdown = { drawFrame: entry };
  assert.equal(setRenderPerfContextBreakdownState(target, breakdown), breakdown);
  assert.equal(target.renderPerfMetrics, metrics);
  assert.equal(target.renderPerfMetrics.contextBreakdown, breakdown);

});

test("diagnostic holder actions preserve caller-provided object identity", async () => {
  const {
    resetProjectedBoundsDiagnosticsState,
    setProjectedBoundsDiagnosticsState,
  } = await loadActions();
  const target = {};
  const reset = { total: 0, byGeometryType: {}, byReason: {} };
  assert.equal(resetProjectedBoundsDiagnosticsState(target, reset), true);
  assert.equal(target.projectedBoundsDiagnostics, reset);

  const next = {
    total: 1,
    byGeometryType: { Polygon: 1 },
    byReason: { "non-finite": 1 },
  };
  assert.equal(setProjectedBoundsDiagnosticsState(target, next), true);
  assert.equal(target.projectedBoundsDiagnostics, next);
});

test("first-visible and country-coverage actions retain scalar/reference semantics", async () => {
  const {
    setDebugCountryCoverageState,
    setFirstVisibleFramePaintedState,
  } = await loadActions();
  const target = {};
  const coverage = { totalCountries: 3, priorityCountryGaps: [] };
  assert.equal(setFirstVisibleFramePaintedState(target, "painted"), true);
  assert.equal(target.firstVisibleFramePainted, true);
  assert.equal(setFirstVisibleFramePaintedState(target, 0), false);
  assert.equal(target.firstVisibleFramePainted, false);
  assert.equal(setDebugCountryCoverageState(target, coverage), coverage);
  assert.equal(target.debugCountryCoverage, coverage);
});

test("holder actions validate replacement payloads", async () => {
  const {
    commitRenderPerfMetricState,
    resetProjectedBoundsDiagnosticsState,
    setProjectedBoundsDiagnosticsState,
    setRenderPerfContextBreakdownState,
    setRenderPerfMetricEntryState,
  } = await loadActions();
  const target = {};
  for (const invalid of [null, [], "value"]) {
    assert.throws(() => commitRenderPerfMetricState(target, {
      name: "frame",
      entry: invalid,
    }), /entry must be an object/);
    assert.throws(() => setRenderPerfMetricEntryState(target, {
      name: "frame",
      entry: invalid,
    }), /entry must be an object/);
    assert.throws(() => setRenderPerfContextBreakdownState(target, invalid), /breakdown must be an object/);
    assert.throws(() => resetProjectedBoundsDiagnosticsState(target, invalid), /diagnostics must be an object/);
    assert.throws(() => setProjectedBoundsDiagnosticsState(target, invalid), /diagnostics must be an object/);
  }
  assert.throws(() => commitRenderPerfMetricState(target, {
    name: " ",
    entry: {},
  }), /name must be a non-empty string/);
  assert.throws(() => setRenderPerfMetricEntryState(target, {
    name: " ",
    entry: {},
  }), /name must be a non-empty string/);
});

test("render perf ensure repairs array roots once", async () => {
  const { ensureRenderPerfMetricsState } = await loadActions();
  const target = { renderPerfMetrics: [] };
  assert.equal(ensureRenderPerfMetricsState(target), true);
  assert.deepEqual(target.renderPerfMetrics, {});
  const metrics = target.renderPerfMetrics;
  assert.equal(ensureRenderPerfMetricsState(target), true);
  assert.equal(target.renderPerfMetrics, metrics);
});
