import test from "node:test";
import assert from "node:assert/strict";

import { createScenarioReliefOverlayRenderOwner } from "../js/core/renderer/scenario_relief_overlay_render_owner.js";

function createCanvasContext() {
  const calls = [];
  return {
    calls,
    fillStyle: "",
    globalAlpha: 1,
    lineCap: "",
    lineJoin: "",
    lineWidth: 1,
    strokeStyle: "",
    beginPath() {
      calls.push({ type: "beginPath" });
    },
    clip() {
      calls.push({ type: "clip" });
    },
    fill() {
      calls.push({ type: "fill", alpha: this.globalAlpha, fillStyle: this.fillStyle });
    },
    lineTo(x, y) {
      calls.push({ type: "lineTo", x, y });
    },
    moveTo(x, y) {
      calls.push({ type: "moveTo", x, y });
    },
    restore() {
      calls.push({ type: "restore" });
    },
    save() {
      calls.push({ type: "save" });
    },
    setLineDash(value) {
      calls.push({ type: "setLineDash", value });
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

function createFeature(id, overlayKind, geometryType = "Polygon") {
  return {
    id,
    geometry: {
      type: geometryType,
    },
    properties: {
      id,
      overlay_kind: overlayKind,
    },
  };
}

function createOwner({
  context = createCanvasContext(),
  features = [],
  renderPhase = "idle",
  showScenarioReliefOverlays = true,
  coastalAccentEnabled = false,
} = {}) {
  const metrics = [];
  const pathCalls = [];
  const state = {
    renderPhase,
    showScenarioReliefOverlays,
  };
  const owner = createScenarioReliefOverlayRenderOwner({
    state,
    constants: {
      RENDER_PHASE_INTERACTING: "interacting",
      RENDER_PHASE_SETTLING: "settling",
    },
    getters: {
      getContext: () => context,
      getPathCanvas: () => (feature) => pathCalls.push(feature.id),
    },
    helpers: {
      collectContextMetric: (name, durationMs, details) => metrics.push({ name, durationMs, details }),
      getEffectiveScenarioReliefOverlayFeatures: () => features,
      getPathBounds: () => ({ minX: 0, minY: 0, maxX: 20, maxY: 12 }),
      getReliefOverlayKind: (feature) => feature?.properties?.overlay_kind || "",
      getScenarioReliefVisualRevisionToken: () => "relief:1",
      isAtlantropaReliefOverlayFeature: (feature) => String(feature?.id || "").startsWith("atlantropa_"),
      isReliefOverlayEnabled: () => true,
      isScenarioCoastalAccentEnabled: () => coastalAccentEnabled,
      nowMs: () => 10,
      pathBoundsInScreen: () => true,
    },
  });
  return { context, metrics, owner, pathCalls, state };
}

test("scenario relief owner records disabled skip metrics", () => {
  const harness = createOwner({
    features: [createFeature("salt-a", "salt_flat_texture")],
    showScenarioReliefOverlays: false,
  });

  const renderedCount = harness.owner.drawScenarioReliefOverlaysLayer(2);

  assert.equal(renderedCount, 0);
  assert.equal(harness.metrics.at(-1).name, "contextScenarioLayerRelief");
  assert.equal(harness.metrics.at(-1).details.reason, "disabled");
  assert.equal(harness.metrics.at(-1).details.signature, "relief:1");
  assert.equal(harness.context.calls.length, 0);
});

test("scenario relief owner draws salt texture fill and line pattern", () => {
  const harness = createOwner({
    features: [createFeature("salt-a", "salt_flat_texture")],
  });

  const renderedCount = harness.owner.drawScenarioReliefOverlaysLayer(2, { cacheMode: "redraw" });

  assert.equal(renderedCount, 1);
  assert.deepEqual(harness.pathCalls, ["salt-a", "salt-a"]);
  assert.ok(harness.context.calls.some((call) => call.type === "fill"));
  assert.ok(harness.context.calls.filter((call) => call.type === "stroke").length > 1);
  assert.equal(harness.metrics.at(-1).details.cacheMode, "redraw");
  assert.equal(harness.metrics.at(-1).details.renderedCount, 1);
});

test("scenario relief owner lets coastal accent own shoreline overlays", () => {
  const shoreline = createFeature("shore-a", "new_shoreline", "LineString");
  const dam = createFeature("dam-a", "dam_approach", "LineString");
  const harness = createOwner({
    coastalAccentEnabled: true,
    features: [shoreline, dam],
  });

  const renderedCount = harness.owner.drawScenarioReliefOverlaysLayer(3);

  assert.equal(renderedCount, 1);
  assert.deepEqual(harness.pathCalls, ["dam-a"]);
  assert.ok(harness.context.calls.some((call) => call.type === "setLineDash"));
});

test("scenario relief owner skips interacting and settling phases", () => {
  const harness = createOwner({
    features: [createFeature("salt-a", "salt_flat_texture")],
    renderPhase: "interacting",
  });

  const renderedCount = harness.owner.drawScenarioReliefOverlaysLayer(2);

  assert.equal(renderedCount, 0);
  assert.equal(harness.metrics.at(-1).details.reason, "interacting");
  assert.equal(harness.context.calls.length, 0);
});
