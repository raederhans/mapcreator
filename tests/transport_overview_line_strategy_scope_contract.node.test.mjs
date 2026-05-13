import test from "node:test";
import assert from "node:assert/strict";
import { resolveTransportOverviewLineStrategy } from "../js/core/transport_capability_registry.js";
import { createTransportOverviewRenderOwner } from "../js/core/renderer/transport_overview_render_owner.js";

const LINE_FIXTURES = Object.freeze({
  road: Object.freeze([
    { className: "motorway", revealRank: 1 },
    { className: "motorway", revealRank: 2 },
    { className: "trunk", revealRank: 2 },
  ]),
  rail: Object.freeze([
    { className: "mainline", revealRank: 1 },
    { className: "mainline", revealRank: 2 },
    { className: "regional", revealRank: 2 },
  ]),
});

function countVisibleLines(familyId, config, scale) {
  const strategy = resolveTransportOverviewLineStrategy(familyId, config, { scale });
  const primaryClass = familyId === "rail" ? "mainline" : "motorway";
  return LINE_FIXTURES[familyId].filter((feature) => {
    if (feature.revealRank > strategy.maximumRevealRank) return false;
    if (strategy.minimumScopeRank <= 1 && feature.className !== primaryClass) return false;
    return true;
  }).length;
}

test("rail and road line scope thresholds still constrain counts across overview scales", () => {
  const cases = [
    {
      familyId: "road",
      primaryConfig: { scope: "motorway_only", importanceThreshold: "primary" },
      broadConfig: { scope: "motorway_trunk", importanceThreshold: "secondary" },
    },
    {
      familyId: "rail",
      primaryConfig: { scope: "mainline_only", importanceThreshold: "primary" },
      broadConfig: { scope: "mainline_plus_regional", importanceThreshold: "secondary" },
    },
  ];

  for (const { familyId, primaryConfig, broadConfig } of cases) {
    for (const scale of [1.2, 3, 5]) {
      assert.equal(countVisibleLines(familyId, primaryConfig, scale), 1, `${familyId} primary scale ${scale}`);
      assert.equal(countVisibleLines(familyId, broadConfig, scale), 3, `${familyId} broad scale ${scale}`);
    }
  }
});


function createRecordingCanvasContext() {
  const calls = [];
  const context = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    stroke: () => calls.push({ type: "stroke" }),
    setLineDash: (value) => calls.push({ type: "setLineDash", value: [...value] }),
    set globalAlpha(value) { calls.push({ type: "globalAlpha", value }); },
    set strokeStyle(value) { calls.push({ type: "strokeStyle", value }); },
    set lineWidth(value) { calls.push({ type: "lineWidth", value }); },
    set lineCap(value) { calls.push({ type: "lineCap", value }); },
    set lineJoin(value) { calls.push({ type: "lineJoin", value }); },
  };
  return context;
}

function createLineRenderOwnerHarness({ k = 4 } = {}) {
  const context = createRecordingCanvasContext();
  const metrics = [];
  const state = {
    showTransport: true,
    showRoad: true,
    zoomTransform: { k },
    styleConfig: {
      transportOverview: {
        visualMode: "network",
        road: {
          opacity: 1,
          visualStrength: 0,
          scopeLinkMode: "manual",
          scope: "motorway_trunk",
          importanceThreshold: "secondary",
        },
      },
    },
    roadsData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "trunk", reveal_rank: 2 } },
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 1], [1, 2]] }, properties: { class: "motorway", reveal_rank: 1 } },
      ],
    },
  };
  const owner = createTransportOverviewRenderOwner({
    state,
    helpers: {
      clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
      collectContextMetric: (name, _duration, detail) => metrics.push({ name, detail }),
      getCanvasColorRelativeLuminance: () => 0.5,
      getContext: () => context,
      getFeatureCollectionFeatureCount: (collection) => Array.isArray(collection?.features) ? collection.features.length : 0,
      getPathCanvas: () => (feature) => context.calls.push({ type: "path", className: feature?.properties?.class }),
      getProjection: () => null,
      mixCanvasColors: (color) => color,
      nowMs: () => 0,
    },
  });
  return { context, metrics, owner };
}

test("transport overview road line draw resets dash and keeps screen-width floors", () => {
  const zoom = 4;
  const { context, metrics, owner } = createLineRenderOwnerHarness({ k: zoom });
  owner.drawRoadsLayer(zoom);

  const dashCalls = context.calls.filter((call) => call.type === "setLineDash");
  assert.ok(dashCalls.some((call) => call.value.length === 2 && call.value[0] > 0 && call.value[1] > 0), "trunk inner stroke should use a dash pattern");
  assert.deepEqual(dashCalls.at(-1)?.value, [], "last line draw must clear dash state");

  const widths = context.calls.filter((call) => call.type === "lineWidth").map((call) => call.value * zoom);
  assert.ok(widths.length >= 4, "casing and inner strokes should both draw for trunk and motorway");
  assert.ok(Math.min(...widths) >= 0.95, `minimum screen width ${Math.min(...widths)} should keep the visible floor`);

  assert.equal(metrics.at(-1)?.name, "drawRoadsLayer");
  assert.equal(metrics.at(-1)?.detail?.visibleFeatureCount, 2);
});
