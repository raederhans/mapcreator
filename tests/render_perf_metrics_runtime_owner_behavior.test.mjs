import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createRenderPerfMetricsRuntimeOwner } from "../js/core/renderer/render_perf_metrics_runtime_owner.js";

const OWNER_URL = new URL(
  "../js/core/renderer/render_perf_metrics_runtime_owner.js",
  import.meta.url,
);

const BREAKDOWN_NAMES = new Set(["drawRoadsLayer", "drawRiversLayer"]);

const DEPENDENCIES = Object.freeze({
  getters: Object.freeze([
    "getRenderPerfMetrics",
    "getRenderPerfMetricSequence",
    "nowMs",
  ]),
  effects: Object.freeze([
    "ensureRenderPerfMetricsState",
    "commitRenderPerfMetricState",
    "setRenderPerfContextBreakdownState",
    "mirrorRenderPerfMetrics",
  ]),
});

function createHarness({ nowValues = [100, 110, 120, 130, 140, 150] } = {}) {
  const events = [];
  const state = {
    renderPerfMetrics: null,
    renderPerfMetricSequence: 0,
  };
  let nowIndex = 0;
  const dependencies = {
    constants: {
      contextBreakdownMetricNames: BREAKDOWN_NAMES,
    },
    getters: {
      getRenderPerfMetrics() {
        events.push("get-metrics");
        return state.renderPerfMetrics;
      },
      getRenderPerfMetricSequence() {
        events.push("get-sequence");
        return state.renderPerfMetricSequence;
      },
      nowMs() {
        const value = nowValues[nowIndex++];
        events.push(["now", value]);
        return value;
      },
    },
    effects: {
      ensureRenderPerfMetricsState() {
        events.push("ensure-metrics");
        if (!state.renderPerfMetrics || typeof state.renderPerfMetrics !== "object") {
          state.renderPerfMetrics = {};
        }
      },
      commitRenderPerfMetricState({ name, entry, sequence }) {
        events.push(["commit-entry", name, entry, sequence]);
        state.renderPerfMetrics[name] = entry;
        state.renderPerfMetricSequence = sequence;
      },
      setRenderPerfContextBreakdownState(breakdown) {
        events.push(["set-breakdown", breakdown]);
        state.renderPerfMetrics.contextBreakdown = breakdown;
      },
      mirrorRenderPerfMetrics(metrics) {
        events.push(["mirror-metrics", metrics]);
      },
    },
  };
  return {
    dependencies,
    events,
    owner: createRenderPerfMetricsRuntimeOwner(dependencies),
    state,
  };
}

test("factory validates dependencies and freezes the exact runtime API", () => {
  for (const [groupName, names] of Object.entries(DEPENDENCIES)) {
    for (const missingName of names) {
      const harness = createHarness();
      delete harness.dependencies[groupName][missingName];
      assert.throws(
        () => createRenderPerfMetricsRuntimeOwner(harness.dependencies),
        new RegExp(`${groupName}\\.${missingName} must be a function`),
      );
    }
  }
  const missingNames = createHarness();
  delete missingNames.dependencies.constants.contextBreakdownMetricNames;
  assert.throws(
    () => createRenderPerfMetricsRuntimeOwner(missingNames.dependencies),
    /constants\.contextBreakdownMetricNames must provide has\(\)/,
  );

  const { owner } = createHarness();
  assert.equal(Object.isFrozen(owner), true);
  assert.deepEqual(Object.keys(owner), [
    "ensureRenderPerfMetrics",
    "recordRenderPerfMetric",
    "beginContextMetricSession",
    "collectContextMetric",
    "endContextMetricSession",
    "resetContextBreakdownForExactFrame",
  ]);
});

test("ensure and record preserve state ordering, sequence, detail overrides, and mirror identity", () => {
  const { events, owner, state } = createHarness();
  assert.equal(owner.ensureRenderPerfMetrics(), state.renderPerfMetrics);
  assert.deepEqual(events, ["ensure-metrics", "get-metrics"]);

  events.length = 0;
  state.renderPerfMetricSequence = 4;
  const entry = owner.recordRenderPerfMetric("  drawFrame  ", -9, {
    durationMs: 17,
    recordedAt: 77,
    reason: "test",
    sequence: 999,
  });
  assert.deepEqual(entry, {
    durationMs: 17,
    recordedAt: 77,
    reason: "test",
    sequence: 5,
  });
  assert.equal(state.renderPerfMetrics.drawFrame, entry);
  assert.equal(state.renderPerfMetricSequence, 5);
  assert.deepEqual(events, [
    "ensure-metrics",
    "get-metrics",
    "get-sequence",
    ["now", 100],
    ["commit-entry", "drawFrame", entry, 5],
    ["mirror-metrics", state.renderPerfMetrics],
  ]);

  events.length = 0;
  assert.equal(owner.recordRenderPerfMetric("  ", 1), null);
  assert.deepEqual(events, ["ensure-metrics", "get-metrics"]);
});

test("collect outside a session falls back to record and retains the second sampling boundary", () => {
  const { events, owner, state } = createHarness();
  const entry = owner.collectContextMetric("drawRoadsLayer", 8, { source: "fallback" });
  assert.deepEqual(entry, {
    durationMs: 8,
    recordedAt: 110,
    source: "fallback",
    sequence: 1,
  });
  assert.equal(state.renderPerfMetrics.drawRoadsLayer, entry);
  assert.deepEqual(events, [
    ["now", 100],
    "ensure-metrics",
    "get-metrics",
    "get-sequence",
    ["now", 110],
    ["commit-entry", "drawRoadsLayer", entry, 1],
    ["mirror-metrics", state.renderPerfMetrics],
  ]);
});

test("session collection aggregates duration, latest details, timestamp, and call count", () => {
  const { events, owner, state } = createHarness();
  assert.equal(owner.beginContextMetricSession(), undefined);
  const first = owner.collectContextMetric("drawRoadsLayer", 4, {
    featureCount: 2,
    retained: "first",
  });
  const second = owner.collectContextMetric("drawRoadsLayer", 6, {
    featureCount: 3,
    latest: true,
  });
  const other = owner.collectContextMetric("miscMetric", 2, { detail: "other" });
  assert.deepEqual(first, {
    durationMs: 4,
    recordedAt: 100,
    featureCount: 2,
    retained: "first",
    callCount: 1,
  });
  assert.deepEqual(second, {
    durationMs: 10,
    recordedAt: 110,
    featureCount: 3,
    retained: "first",
    latest: true,
    callCount: 2,
  });
  assert.deepEqual(other, {
    durationMs: 2,
    recordedAt: 120,
    detail: "other",
    callCount: 1,
  });
  assert.equal(state.renderPerfMetrics, null);
  assert.deepEqual(events, [
    ["now", 100],
    ["now", 110],
    ["now", 120],
  ]);
});

test("ending a session records insertion order while preserving the metrics root", () => {
  const { events, owner, state } = createHarness({ nowValues: [10, 20, 30, 40, 50] });
  state.renderPerfMetrics = {
    contextBreakdown: {
      priorMetric: { durationMs: 1, sequence: 0 },
    },
  };
  const metricsRoot = state.renderPerfMetrics;
  owner.beginContextMetricSession();
  owner.collectContextMetric("drawRoadsLayer", 3, { featureCount: 2 });
  owner.collectContextMetric("miscMetric", 7, { reason: "other" });
  events.length = 0;

  const breakdown = owner.endContextMetricSession();
  assert.deepEqual(Object.keys(state.renderPerfMetrics), [
    "contextBreakdown",
    "drawRoadsLayer",
    "miscMetric",
  ]);
  assert.deepEqual(breakdown, {
    priorMetric: { durationMs: 1, sequence: 0 },
    drawRoadsLayer: {
      durationMs: 3,
      recordedAt: 10,
      featureCount: 2,
      callCount: 1,
      sequence: 1,
    },
  });
  assert.equal(state.renderPerfMetrics.contextBreakdown, breakdown);
  assert.equal(state.renderPerfMetrics, metricsRoot);
  assert.equal(state.renderPerfMetricSequence, 2);
  assert.equal(
    events.filter((event) => Array.isArray(event) && event[0] === "commit-entry").length,
    2,
  );
  assert.deepEqual(
    events.filter((event) => Array.isArray(event) && event[0] === "commit-entry")
      .map((event) => event[1]),
    ["drawRoadsLayer", "miscMetric"],
  );
  assert.equal(
    events.some((event) => Array.isArray(event) && event[0] === "set-breakdown"),
    true,
  );
  assert.deepEqual(events.at(-1), ["mirror-metrics", state.renderPerfMetrics]);

  events.length = 0;
  const fallback = owner.collectContextMetric("afterSession", 1);
  assert.equal(fallback.sequence, 3);
  assert.equal(events.some((event) => event === "ensure-metrics"), true);
});

test("begin replaces an unfinished session and end without a session still commits breakdown state", () => {
  const { events, owner, state } = createHarness();
  owner.beginContextMetricSession();
  owner.collectContextMetric("discarded", 4);
  owner.beginContextMetricSession();
  owner.collectContextMetric("drawRiversLayer", 5);
  const breakdown = owner.endContextMetricSession();
  assert.deepEqual(Object.keys(state.renderPerfMetrics), [
    "drawRiversLayer",
    "contextBreakdown",
  ]);
  assert.equal("discarded" in state.renderPerfMetrics, false);
  assert.deepEqual(Object.keys(breakdown), ["drawRiversLayer"]);

  events.length = 0;
  const repeated = owner.endContextMetricSession();
  assert.deepEqual(repeated, breakdown);
  assert.equal(
    events.some((event) => Array.isArray(event) && event[0] === "set-breakdown"),
    true,
  );
  assert.deepEqual(events.at(-1), ["mirror-metrics", state.renderPerfMetrics]);
});

test("reset preserves other metrics and publishes a fresh empty breakdown", () => {
  const { events, owner, state } = createHarness();
  const drawFrame = { durationMs: 9, sequence: 2 };
  const oldBreakdown = { drawRoadsLayer: { durationMs: 2 } };
  state.renderPerfMetrics = { drawFrame, contextBreakdown: oldBreakdown };
  const metricsRoot = state.renderPerfMetrics;
  assert.equal(owner.resetContextBreakdownForExactFrame(), undefined);
  assert.equal(state.renderPerfMetrics.drawFrame, drawFrame);
  assert.equal(state.renderPerfMetrics, metricsRoot);
  assert.notEqual(state.renderPerfMetrics.contextBreakdown, oldBreakdown);
  assert.deepEqual(state.renderPerfMetrics.contextBreakdown, {});
  assert.equal(
    events.some((event) => Array.isArray(event) && event[0] === "set-breakdown"),
    true,
  );
  assert.deepEqual(events.at(-1), ["mirror-metrics", state.renderPerfMetrics]);
});

test("owner source stays import-free and free of global state, DOM, and direct clocks", async () => {
  const source = await readFile(OWNER_URL, "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\b(?:state|runtimeState|appState)\b/);
  assert.doesNotMatch(source, /\b(?:window|document|globalThis)\b/);
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /performance\.now\s*\(/);
});
