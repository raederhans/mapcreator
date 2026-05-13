import test from "node:test";
import assert from "node:assert/strict";
import {
  getTransportOverviewLineClassScopeRank,
  resolveTransportOverviewLineStrategy,
} from "../js/core/transport_capability_registry.js";
import { createTransportOverviewRenderOwner } from "../js/core/renderer/transport_overview_render_owner.js";

const LINE_FIXTURES = Object.freeze({
  road: Object.freeze([
    { className: "motorway", revealRank: 1 },
    { className: "motorway", revealRank: 2 },
    { className: "trunk", revealRank: 2 },
    { className: "primary", revealRank: 3 },
    { className: "secondary", revealRank: 3 },
  ]),
  rail: Object.freeze([
    { className: "mainline", revealRank: 1 },
    { className: "mainline", revealRank: 2 },
    { className: "regional", revealRank: 2 },
    { className: "secondary", revealRank: 2 },
  ]),
});

function countVisibleLines(familyId, config, scale) {
  const strategy = resolveTransportOverviewLineStrategy(familyId, config, { scale });
  return LINE_FIXTURES[familyId].filter((feature) => {
    if (feature.revealRank > strategy.maximumRevealRank) return false;
    if (getTransportOverviewLineClassScopeRank(familyId, feature.className) > strategy.minimumScopeRank) return false;
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
      broadCount: 4,
    },
  ];

  for (const { familyId, primaryConfig, broadConfig, broadCount = 3 } of cases) {
    for (const scale of [1.2, 3, 5]) {
      assert.equal(countVisibleLines(familyId, primaryConfig, scale), 1, `${familyId} primary scale ${scale}`);
      assert.equal(countVisibleLines(familyId, broadConfig, scale), broadCount, `${familyId} broad scale ${scale}`);
    }
  }

  assert.equal(
    countVisibleLines("road", { scope: "motorway_trunk", importanceThreshold: "all" }, 5),
    3,
    "road motorway_trunk scope should keep primary/secondary out even when threshold is all",
  );
});


function createRecordingCanvasContext() {
  const calls = [];
  const context = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    stroke: () => calls.push({ type: "stroke" }),
    strokeText: (text, x, y) => calls.push({ type: "strokeText", text, x, y }),
    fillText: (text, x, y) => calls.push({ type: "fillText", text, x, y }),
    setLineDash: (value) => calls.push({ type: "setLineDash", value: [...value] }),
    set globalAlpha(value) { calls.push({ type: "globalAlpha", value }); },
    set strokeStyle(value) { calls.push({ type: "strokeStyle", value }); },
    set fillStyle(value) { calls.push({ type: "fillStyle", value }); },
    set lineWidth(value) { calls.push({ type: "lineWidth", value }); },
    set lineCap(value) { calls.push({ type: "lineCap", value }); },
    set lineJoin(value) { calls.push({ type: "lineJoin", value }); },
    set textAlign(value) { calls.push({ type: "textAlign", value }); },
    set textBaseline(value) { calls.push({ type: "textBaseline", value }); },
    set font(value) { calls.push({ type: "font", value }); },
  };
  return context;
}

function createLineRenderOwnerHarness({ k = 4, roadLabelsEnabled = false, railLabelsEnabled = false } = {}) {
  const context = createRecordingCanvasContext();
  const metrics = [];
  const state = {
    showTransport: true,
    showRoad: true,
    showRail: true,
    zoomTransform: { k },
    styleConfig: {
      transportOverview: {
        visualMode: "network",
        road: {
          opacity: 1,
          visualStrength: 0,
          labelsEnabled: roadLabelsEnabled,
          labelDensity: "dense",
          labelMode: "ref",
          scopeLinkMode: "manual",
          scope: "motorway_trunk",
          importanceThreshold: "secondary",
        },
        rail: {
          opacity: 1,
          visualStrength: 0,
          labelsEnabled: railLabelsEnabled,
          labelDensity: "dense",
          labelMode: "name",
          scopeLinkMode: "manual",
          scope: "mainline_plus_regional",
          importanceThreshold: "secondary",
        },
      },
    },
    roadsData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "trunk", reveal_rank: 2 } },
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 1], [1, 2]] }, properties: { class: "motorway", reveal_rank: 1, ref: "A1" } },
      ],
    },
    railwaysData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "secondary", reveal_rank: 2, name: "Secondary line" } },
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 1], [1, 2]] }, properties: { class: "regional", reveal_rank: 2, name: "Regional line" } },
        { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 2], [1, 3]] }, properties: { class: "mainline", reveal_rank: 1, name: "Mainline" } },
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
      getLineMidpointFromCoordinates: (coordinates) => coordinates[Math.floor((coordinates.length - 1) / 2)] || null,
      getMultiLineLabelAnchor: (geometry) => geometry?.coordinates?.[0]?.[0] || null,
      getPathCanvas: () => (feature) => context.calls.push({ type: "path", className: feature?.properties?.class }),
      getProjection: () => ([x, y]) => [Number(x) * 100, Number(y) * 100],
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

test("transport overview rail line draw includes secondary with dash and screen-width floors", () => {
  const zoom = 4;
  const { context, metrics, owner } = createLineRenderOwnerHarness({ k: zoom });
  owner.drawRailwaysLayer(zoom);

  const dashedClasses = [];
  context.calls.forEach((call, index) => {
    if (call.type === "setLineDash" && call.value.length === 2) {
      const nextPath = context.calls.slice(index).find((candidate) => candidate.type === "path");
      if (nextPath?.className) dashedClasses.push(nextPath.className);
    }
  });
  assert.ok(dashedClasses.includes("secondary"), "secondary rail should render as a weaker dashed class");
  assert.ok(dashedClasses.includes("regional"), "regional rail should keep dashed rendering");
  assert.deepEqual(context.calls.filter((call) => call.type === "setLineDash").at(-1)?.value, [], "rail draw must clear dash state");

  const widths = context.calls.filter((call) => call.type === "lineWidth").map((call) => call.value * zoom);
  assert.ok(widths.length >= 6, "casing and inner strokes should draw for secondary, regional, and mainline rail");
  assert.ok(Math.min(...widths) >= 0.78, `minimum screen width ${Math.min(...widths)} should keep the rail visible floor`);

  const railMetric = metrics.findLast((entry) => entry.name === "drawRailwaysLayer");
  assert.equal(railMetric?.detail?.visibleFeatureCount, 3);
});

test("transport overview road labels use ref/name fields and report labelCount", () => {
  const zoom = 4;
  const { context, metrics, owner } = createLineRenderOwnerHarness({ k: zoom, roadLabelsEnabled: true });
  owner.drawRoadsLayer(zoom);

  assert.ok(context.calls.some((call) => call.type === "fillText" && call.text === "A1"), "road labels should draw from ref/name fields");
  const roadMetric = metrics.findLast((entry) => entry.name === "drawRoadsLayer");
  assert.equal(roadMetric?.detail?.visibleFeatureCount, 2);
  assert.equal(roadMetric?.detail?.labelCount, 1);
});
