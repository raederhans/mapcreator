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
    "captureRenderPerfMetricsState",
    "captureRenderPerfContextBreakdownState",
    "captureRenderPerfMetricEntryState",
    "captureProjectedBoundsDiagnosticsState",
    "ensureRenderPerfMetricsState",
    "replaceRenderPerfMetricsState",
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
    assert.throws(() => actions.captureRenderPerfMetricsState(target), /target must be an object/);
    assert.throws(() => actions.captureRenderPerfContextBreakdownState(target), /target must be an object/);
    assert.throws(() => actions.captureRenderPerfMetricEntryState(target, "frame"), /target must be an object/);
    assert.throws(() => actions.captureProjectedBoundsDiagnosticsState(target), /target must be an object/);
    assert.throws(() => actions.ensureRenderPerfMetricsState(target), /target must be an object/);
    assert.throws(() => actions.replaceRenderPerfMetricsState(target, {}), /target must be an object/);
    assert.throws(() => actions.setRenderPerfMetricEntryState(target, { name: "frame", entry: {} }), /target must be an object/);
    assert.throws(() => actions.setRenderPerfContextBreakdownState(target, {}), /target must be an object/);
    assert.throws(() => actions.commitRenderPerfMetricState(target, { name: "frame", entry: {}, sequence: 1 }), /target must be an object/);
    assert.throws(() => actions.setFirstVisibleFramePaintedState(target, true), /target must be an object/);
    assert.throws(() => actions.resetProjectedBoundsDiagnosticsState(target), /target must be an object/);
    assert.throws(() => actions.setProjectedBoundsDiagnosticsState(target, {}), /target must be an object/);
    assert.throws(() => actions.setDebugCountryCoverageState(target, null), /target must be an object/);
  }
});

test("render perf captures detach nested diagnostics from the mutable state root", async () => {
  const {
    captureRenderPerfContextBreakdownState,
    captureRenderPerfMetricEntryState,
    captureRenderPerfMetricsState,
  } = await loadActions();
  const target = {
    renderPerfMetrics: {
      contextBreakdown: {
        drawRoadsLayer: {
          durationMs: 4,
          detail: { source: "roads" },
        },
      },
      recentFrames: [{ durationMs: 7 }],
    },
  };

  const metrics = captureRenderPerfMetricsState(target);
  const breakdown = captureRenderPerfContextBreakdownState(target);
  const frame = captureRenderPerfMetricEntryState(target, "recentFrames");
  assert.deepEqual(metrics, target.renderPerfMetrics);
  assert.deepEqual(breakdown, target.renderPerfMetrics.contextBreakdown);
  assert.notEqual(metrics, target.renderPerfMetrics);
  assert.notEqual(metrics.contextBreakdown, target.renderPerfMetrics.contextBreakdown);
  assert.notEqual(metrics.recentFrames, target.renderPerfMetrics.recentFrames);
  assert.notEqual(breakdown, target.renderPerfMetrics.contextBreakdown);
  assert.deepEqual(frame, target.renderPerfMetrics.recentFrames);
  assert.notEqual(frame, target.renderPerfMetrics.recentFrames);

  metrics.contextBreakdown.drawRoadsLayer.detail.source = "changed";
  metrics.recentFrames[0].durationMs = 99;
  breakdown.drawRoadsLayer.durationMs = 88;
  frame[0].durationMs = 66;
  assert.equal(
    target.renderPerfMetrics.contextBreakdown.drawRoadsLayer.detail.source,
    "roads",
  );
  assert.equal(target.renderPerfMetrics.recentFrames[0].durationMs, 7);
  assert.equal(
    target.renderPerfMetrics.contextBreakdown.drawRoadsLayer.durationMs,
    4,
  );

  assert.equal(captureRenderPerfMetricsState({ renderPerfMetrics: null }), undefined);
  assert.deepEqual(captureRenderPerfContextBreakdownState({ renderPerfMetrics: null }), {});
  assert.equal(captureRenderPerfMetricEntryState({ renderPerfMetrics: null }, "frame"), undefined);
  assert.throws(
    () => captureRenderPerfMetricEntryState(target, " "),
    /name must be a non-empty string/,
  );
});

test("render perf holder actions commit caller-built state exactly", async () => {
  const {
    commitRenderPerfMetricState,
    ensureRenderPerfMetricsState,
    replaceRenderPerfMetricsState,
    setRenderPerfContextBreakdownState,
    setRenderPerfMetricEntryState,
  } = await loadActions();
  const target = { renderPerfMetrics: null, renderPerfMetricSequence: 4 };
  const replacement = { seeded: true };
  assert.equal(replaceRenderPerfMetricsState(target, replacement), replacement);
  assert.equal(target.renderPerfMetrics, replacement);
  assert.equal(ensureRenderPerfMetricsState(target), true);
  assert.equal(target.renderPerfMetrics, replacement);

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

test("projected-bounds capture detaches nested counters from the mutable state root", async () => {
  const { captureProjectedBoundsDiagnosticsState } = await loadActions();
  const target = {
    projectedBoundsDiagnostics: {
      total: 3,
      byGeometryType: { Polygon: 2 },
      byReason: { "missing-bounds": 1 },
    },
  };

  const snapshot = captureProjectedBoundsDiagnosticsState(target);
  assert.deepEqual(snapshot, target.projectedBoundsDiagnostics);
  assert.notEqual(snapshot, target.projectedBoundsDiagnostics);
  assert.notEqual(
    snapshot.byGeometryType,
    target.projectedBoundsDiagnostics.byGeometryType,
  );
  assert.notEqual(snapshot.byReason, target.projectedBoundsDiagnostics.byReason);

  snapshot.byGeometryType.Polygon = 99;
  snapshot.byReason["missing-bounds"] = 88;
  assert.equal(target.projectedBoundsDiagnostics.byGeometryType.Polygon, 2);
  assert.equal(target.projectedBoundsDiagnostics.byReason["missing-bounds"], 1);

  assert.deepEqual(captureProjectedBoundsDiagnosticsState({}), {
    total: 0,
    byGeometryType: {},
    byReason: {},
  });
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
    replaceRenderPerfMetricsState,
  } = await loadActions();
  const target = {};
  for (const invalid of [null, [], "value"]) {
    assert.throws(() => replaceRenderPerfMetricsState(target, invalid), /metrics must be an object or undefined/);
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
  assert.equal(replaceRenderPerfMetricsState(target, undefined), undefined);
  assert.equal(target.renderPerfMetrics, undefined);
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

test("diagnostics actions isolate inherited holders without invoking accessors", async () => {
  const {
    captureRenderPerfMetricEntryState,
    captureRenderPerfMetricsState,
    commitRenderPerfMetricState,
    ensureRenderPerfMetricsState,
  } = await loadActions();
  const inheritedMetrics = { shared: { durationMs: 1 } };
  let getterCalls = 0;
  let setterCalls = 0;
  const prototype = {};
  Object.defineProperty(prototype, "renderPerfMetrics", {
    configurable: true,
    get() {
      getterCalls += 1;
      return inheritedMetrics;
    },
    set() {
      setterCalls += 1;
    },
  });
  const target = Object.create(prototype);

  assert.equal(captureRenderPerfMetricsState(target), undefined);
  assert.equal(ensureRenderPerfMetricsState(target), true);
  assert.equal(getterCalls, 0);
  assert.equal(setterCalls, 0);
  assert.equal(Object.hasOwn(target, "renderPerfMetrics"), true);
  assert.notEqual(target.renderPerfMetrics, inheritedMetrics);

  const entry = { durationMs: 5 };
  assert.equal(commitRenderPerfMetricState(target, {
    name: "shared",
    entry,
    sequence: 2,
  }), 2);
  assert.equal(captureRenderPerfMetricEntryState(target, "shared").durationMs, 5);
  assert.equal(inheritedMetrics.shared.durationMs, 1);
  assert.equal(getterCalls, 0);
  assert.equal(setterCalls, 0);
});

test("diagnostics actions replace configurable accessors and fail closed on frozen descriptors", async () => {
  const {
    commitRenderPerfMetricState,
    ensureRenderPerfMetricsState,
    replaceRenderPerfMetricsState,
  } = await loadActions();
  let getterCalls = 0;
  let setterCalls = 0;
  const accessorTarget = {};
  Object.defineProperty(accessorTarget, "renderPerfMetrics", {
    configurable: true,
    enumerable: false,
    get() {
      getterCalls += 1;
      return { leaked: true };
    },
    set() {
      setterCalls += 1;
    },
  });
  ensureRenderPerfMetricsState(accessorTarget);
  const holderDescriptor = Object.getOwnPropertyDescriptor(accessorTarget, "renderPerfMetrics");
  assert.equal(getterCalls, 0);
  assert.equal(setterCalls, 0);
  assert.equal(Object.hasOwn(holderDescriptor, "value"), true);
  assert.equal(holderDescriptor.enumerable, false);

  const frozenHolderTarget = {};
  const frozenHolder = {};
  Object.defineProperty(frozenHolderTarget, "renderPerfMetrics", {
    configurable: false,
    enumerable: true,
    value: frozenHolder,
    writable: false,
  });
  assert.equal(ensureRenderPerfMetricsState(frozenHolderTarget), true);
  assert.throws(
    () => replaceRenderPerfMetricsState(frozenHolderTarget, {}),
    /renderPerfMetrics must be writable/,
  );
  assert.equal(frozenHolderTarget.renderPerfMetrics, frozenHolder);

  let sequenceSetterCalls = 0;
  Object.defineProperty(frozenHolderTarget, "renderPerfMetricSequence", {
    configurable: false,
    set() {
      sequenceSetterCalls += 1;
    },
  });
  assert.throws(
    () => commitRenderPerfMetricState(frozenHolderTarget, {
      name: "frame",
      entry: { durationMs: 3 },
      sequence: 1,
    }),
    /renderPerfMetricSequence accessor must be configurable/,
  );
  assert.equal(sequenceSetterCalls, 0);
  assert.equal(Object.hasOwn(frozenHolder, "frame"), false);
});
