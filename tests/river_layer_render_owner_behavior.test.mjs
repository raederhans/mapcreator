import test from "node:test";
import assert from "node:assert/strict";

import { createRiverLayerRenderOwner } from "../js/core/renderer/river_layer_render_owner.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createFeature(featurecla, scalerank = 8, minZoom = undefined) {
  return {
    properties: {
      featurecla,
      scalerank,
      min_zoom: minZoom,
    },
  };
}

function createCanvasContext() {
  const calls = [];
  return {
    calls,
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    lineCap: "",
    lineJoin: "",
    beginPath() {
      calls.push({ type: "beginPath" });
    },
    restore() {
      calls.push({ type: "restore" });
    },
    save() {
      calls.push({ type: "save" });
    },
    setLineDash(pattern) {
      calls.push({ type: "setLineDash", pattern: [...pattern] });
    },
    stroke() {
      calls.push({
        type: "stroke",
        alpha: this.globalAlpha,
        lineWidth: this.lineWidth,
        strokeStyle: this.strokeStyle,
      });
    },
  };
}

function createOwner({
  context = createCanvasContext(),
  features = [],
  hgoVectorScene = false,
  pathBoundsInScreen = () => true,
  showRivers = true,
} = {}) {
  const metrics = [];
  const pathCalls = [];
  const state = {
    activeScenarioId: hgoVectorScene ? "hgo_1936" : "",
    activeScenarioManifest: hgoVectorScene
      ? {
        scenario_contract_profile: "hgo_vector",
        performance_hints: {
          hgo_vector_scene_default: true,
        },
      }
      : null,
    riversData: { type: "FeatureCollection", features },
    showRivers,
    styleConfig: {
      rivers: {
        color: "#336699",
        dashStyle: "dashed",
        opacity: 0.8,
        outlineColor: "#ddeeff",
        outlineWidth: 0.4,
        width: 1.2,
      },
    },
  };
  const owner = createRiverLayerRenderOwner({
    state,
    helpers: {
      clamp,
      collectContextMetric: (name, durationMs, details) => metrics.push({ name, durationMs, details }),
      getContext: () => context,
      getContextBaseZoomBucketId: (k) => (k < 1.4 ? "low" : k < 2.5 ? "mid" : "high"),
      getDashPattern: () => [4, 2],
      getFeatureCollectionFeatureCount: (collection) => collection?.features?.length || 0,
      getPathCanvas: () => (feature) => pathCalls.push(feature),
      getSafeCanvasColor: (color, fallback) => color || fallback,
      nowMs: () => 10,
      pathBoundsInScreen,
    },
  });
  return { context, metrics, owner, pathCalls, state };
}

test("river layer owner records skip metrics with explicit reasons", () => {
  const hidden = createOwner({ features: [createFeature("River", 1)], showRivers: false });
  hidden.owner.drawRiversLayer(1);
  assert.equal(hidden.metrics.at(-1).details.skipped, true);
  assert.equal(hidden.metrics.at(-1).details.reason, "hidden");

  const empty = createOwner({ features: [] });
  empty.owner.drawRiversLayer(1);
  assert.equal(empty.metrics.at(-1).details.skipped, true);
  assert.equal(empty.metrics.at(-1).details.reason, "no-data");

  const noContext = createOwner({ context: null, features: [createFeature("River", 1)] });
  noContext.owner.drawRiversLayer(1);
  assert.equal(noContext.metrics.at(-1).details.skipped, true);
  assert.equal(noContext.metrics.at(-1).details.reason, "no-context");
});

test("river layer owner keeps zoom and class visibility rules in metrics", () => {
  const features = [
    createFeature("River", 4),
    createFeature("River", 7),
    createFeature("River (Intermittent)", 8),
    createFeature("Lake Centerline", 8),
    createFeature("Canal", 8),
  ];
  const harness = createOwner({ features });

  harness.owner.drawRiversLayer(1);
  assert.equal(harness.metrics.at(-1).details.zoomBucket, "low");
  assert.equal(harness.metrics.at(-1).details.visibleFeatureCount, 1);

  harness.owner.drawRiversLayer(1.5);
  assert.equal(harness.metrics.at(-1).details.zoomBucket, "mid");
  assert.equal(harness.metrics.at(-1).details.visibleFeatureCount, 2);

  harness.owner.drawRiversLayer(2.6);
  assert.equal(harness.metrics.at(-1).details.zoomBucket, "high");
  assert.equal(harness.metrics.at(-1).details.visibleFeatureCount, 5);
});

test("river layer owner keeps min zoom bridge for rank eight rivers at mid zoom", () => {
  const features = [
    createFeature("River", 8, 4),
    createFeature("River", 8, 6),
  ];
  const harness = createOwner({ features });

  harness.owner.drawRiversLayer(1.5);

  assert.equal(harness.metrics.at(-1).details.zoomBucket, "mid");
  assert.equal(harness.metrics.at(-1).details.visibleFeatureCount, 1);
});

test("river layer owner culls offscreen features before drawing", () => {
  const visibleFeature = createFeature("River", 4);
  const hiddenFeature = createFeature("River", 4);
  const harness = createOwner({
    features: [visibleFeature, hiddenFeature],
    pathBoundsInScreen: (feature) => feature === visibleFeature,
  });

  harness.owner.drawRiversLayer(1);

  assert.equal(harness.metrics.at(-1).details.visibleFeatureCount, 1);
  assert.ok(harness.pathCalls.every((feature) => feature === visibleFeature));
});

test("river layer owner scales dash and line widths by zoom", () => {
  const harness = createOwner({ features: [createFeature("River", 4)] });

  harness.owner.drawRiversLayer(2);

  const dashCalls = harness.context.calls.filter((call) => call.type === "setLineDash");
  const strokeCalls = harness.context.calls.filter((call) => call.type === "stroke");
  assert.deepEqual(dashCalls[0].pattern, [2, 1]);
  assert.deepEqual(dashCalls[1].pattern, [2, 1]);
  assert.deepEqual(dashCalls.at(-1).pattern, []);
  assert.equal(strokeCalls.length, 2);
  assert.ok(strokeCalls[0].lineWidth > strokeCalls[1].lineWidth);
  assert.equal(harness.metrics.at(-1).details.dashStyle, "dashed");
});

test("river layer owner records deferred metrics without drawing", () => {
  const harness = createOwner({ features: [createFeature("River", 4)] });

  harness.owner.recordDeferredRiversLayerMetric({ interactive: true, reason: "staged-apply" });

  assert.equal(harness.context.calls.length, 0);
  assert.equal(harness.metrics.at(-1).name, "drawRiversLayer");
  assert.equal(harness.metrics.at(-1).durationMs, 0);
  assert.deepEqual(harness.metrics.at(-1).details, {
    featureCount: 1,
    interactive: true,
    reason: "staged-apply",
    skipped: true,
  });
});

test("river layer owner suppresses base rivers for HGO vector scenes", () => {
  const harness = createOwner({
    features: [createFeature("River", 1)],
    hgoVectorScene: true,
  });

  harness.owner.drawRiversLayer(1);

  assert.equal(harness.context.calls.length, 0);
  assert.equal(harness.pathCalls.length, 0);
  assert.equal(harness.metrics.at(-1).name, "drawRiversLayer");
  assert.deepEqual(harness.metrics.at(-1).details, {
    featureCount: 1,
    interactive: false,
    reason: "hgo-vector-scene",
    skipped: true,
  });
});

test("river layer owner applies interactive alpha caps", () => {
  const normal = createOwner({ features: [createFeature("River", 4)] });
  const interactive = createOwner({ features: [createFeature("River", 4)] });

  normal.owner.drawRiversLayer(1, { interactive: false });
  interactive.owner.drawRiversLayer(1, { interactive: true });

  const normalStrokes = normal.context.calls.filter((call) => call.type === "stroke");
  const interactiveStrokes = interactive.context.calls.filter((call) => call.type === "stroke");
  assert.equal(normalStrokes.length, 2);
  assert.equal(interactiveStrokes.length, 2);
  assert.ok(interactiveStrokes[0].alpha < normalStrokes[0].alpha);
  assert.ok(interactiveStrokes[1].alpha < normalStrokes[1].alpha);
});
