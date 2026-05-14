import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getTransportOverviewLineClassScopeRank,
  resolveTransportOverviewLineStrategy,
} from "../js/core/transport_capability_registry.js";
import {
  createTransportPackSourceGateReport,
  resolveTransportActivePack,
} from "../js/core/transport_pack_resolver.js";
import {
  applyTransportCountryOverlayState,
} from "../js/core/transport_country_overlay.js";
import { createTransportOverviewRenderOwner } from "../js/core/renderer/transport_overview_render_owner.js";

const mapRendererSource = readFileSync(new URL("../js/core/map_renderer.js", import.meta.url), "utf8");

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
    rect: (x, y, width, height) => calls.push({ type: "rect", x, y, width, height }),
    fill: () => calls.push({ type: "fill" }),
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
    railStationsMajorData: { type: "FeatureCollection", features: [] },
  };
  const hoverEntries = [];
  const owner = createTransportOverviewRenderOwner({
    state,
    helpers: {
      buildFacilityEntryKey: (entry) => entry ? `${entry.familyId || ""}:${entry.packId || "global"}:${entry.stableId || ""}` : "",
      buildFacilityTooltipText: () => "",
      clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
      clearFacilityHoverEntries: () => {},
      collectContextMetric: (name, _duration, detail) => metrics.push({ name, detail }),
      getActiveFacilityHighlightEntry: () => null,
      getCanvasColorRelativeLuminance: () => 0.5,
      getFacilityHoverRadiusPx: () => 12,
      getContext: () => context,
      getFeatureCollectionFeatureCount: (collection) => Array.isArray(collection?.features) ? collection.features.length : 0,
      getLineMidpointFromCoordinates: (coordinates) => coordinates[Math.floor((coordinates.length - 1) / 2)] || null,
      getMultiLineLabelAnchor: (geometry) => geometry?.coordinates?.[0]?.[0] || null,
      getPathCanvas: () => (feature) => context.calls.push({ type: "path", className: feature?.properties?.class }),
      getProjection: () => ([x, y]) => [Number(x) * 100, Number(y) * 100],
      mixCanvasColors: (color) => color,
      nowMs: () => 0,
      setVisibleFacilityHoverEntries: (_familyId, entries, options = {}) => hoverEntries.push({ entries, options }),
    },
  });
  return { context, metrics, owner, appRuntime: state, hoverEntries };
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


test("transport pack resolver gates source and family before apply", () => {
  const germanyManifest = {
    pack_id: "germany_road",
    family: "road",
    source_policy: "real_source_cache_only",
    source_signature: { bkg: { filename: "dlm250.zip", path: ".runtime/source-cache/transport/germany_road/dlm250.zip" } },
    mainMapEligible: true,
    apply_bridge_supported: true,
    coverage_scope: "country",
    main_map_consumer: { supported_keys: ["roads", "road_labels"] },
    sidecars: { road_labels: { required: true } },
    paths: { preview: { roads: "roads.preview.topo.json", road_labels: "road_labels.preview.geojson" }, full: { roads: "roads.topo.json", road_labels: "road_labels.geojson" } },
  };
  const passedGate = createTransportPackSourceGateReport("germany_road", germanyManifest);
  assert.equal(passedGate.passed, true);
  assert.equal(resolveTransportActivePack({ activePackId: "germany_road", familyId: "road", manifest: germanyManifest }).ok, true);

  const familyMismatch = resolveTransportActivePack({ activePackId: "usa_airport", familyId: "road" });
  assert.equal(familyMismatch.ok, false);
  assert.equal(familyMismatch.reason, "family_mismatch");

  const missingManifest = resolveTransportActivePack({ activePackId: "germany_road", familyId: "road" });
  assert.equal(missingManifest.ok, false);
  assert.equal(missingManifest.reason, "manifest_missing");

  const missingSignatureGate = createTransportPackSourceGateReport("germany_road", { ...germanyManifest, source_signature: {} });
  assert.equal(missingSignatureGate.passed, false);
  assert.ok(missingSignatureGate.reasons.includes("source_signature_missing"));

  const forbiddenSignatureGate = createTransportPackSourceGateReport("germany_road", {
    ...germanyManifest,
    source_signature: { bad: { filename: "checked_in_global.geojson" } },
  });
  assert.equal(forbiddenSignatureGate.passed, false);
  assert.ok(forbiddenSignatureGate.reasons.includes("forbidden_source_signature"));

  const consumerMissing = resolveTransportActivePack({
    activePackId: "germany_road",
    familyId: "road",
    manifest: germanyManifest,
    consumerAvailable: false,
  });
  assert.equal(consumerMissing.ok, false);
  assert.equal(consumerMissing.reason, "consumer_missing");
});

test("country road overlay consumes road_labels sidecar on the main map", () => {
  const zoom = 4;
  const { context, metrics, owner, appRuntime } = createLineRenderOwnerHarness({ k: zoom, roadLabelsEnabled: true });
  appRuntime.transportCountryOverlayState = {
    status: "ready",
    activePackId: "germany_road",
    family: "road",
    collectionsByLayer: {
      roads: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "motorway", reveal_rank: 1 } },
        ],
      },
      road_labels: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [0.5, 0.5] }, properties: { name: "E35", road_class: "motorway" } },
        ],
      },
    },
  };

  owner.drawRoadsLayer(zoom);

  assert.ok(context.calls.some((call) => call.type === "fillText" && call.text === "E35"), "country road labels should render from the road_labels sidecar");
  const countryRoadMetric = metrics.findLast((entry) => entry.name === "drawCountryRoadsLayer");
  assert.equal(countryRoadMetric?.detail?.visibleFeatureCount, 1);
  assert.equal(countryRoadMetric?.detail?.labelCount, 1);
});

test("country overlay apply preserves overlays for other transport families", () => {
  const zoom = 4;
  const { metrics, owner, appRuntime } = createLineRenderOwnerHarness({ k: zoom });

  applyTransportCountryOverlayState(appRuntime, {
    status: "ready",
    activePackId: "germany_road",
    family: "road",
    collectionsByLayer: {
      roads: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "motorway", reveal_rank: 1 } },
        ],
      },
      road_labels: { type: "FeatureCollection", features: [] },
    },
  });
  applyTransportCountryOverlayState(appRuntime, {
    status: "ready",
    activePackId: "france_rail",
    family: "rail",
    collectionsByLayer: {
      railways: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "mainline", reveal_rank: 1 } },
        ],
      },
      rail_stations_major: { type: "FeatureCollection", features: [] },
    },
  });

  owner.drawRoadsLayer(zoom);
  owner.drawRailwaysLayer(zoom);

  assert.equal(appRuntime.transportCountryOverlayState.activePackIdByFamily.road, "germany_road");
  assert.equal(appRuntime.transportCountryOverlayState.activePackIdByFamily.rail, "france_rail");
  assert.equal(metrics.findLast((entry) => entry.name === "drawCountryRoadsLayer")?.detail?.visibleFeatureCount, 1);
  assert.equal(metrics.findLast((entry) => entry.name === "drawCountryRailwaysLayer")?.detail?.visibleFeatureCount, 1);
});

test("country road sidecar labels without class stay below national label priority", () => {
  const zoom = 4;
  const { context, metrics, owner, appRuntime } = createLineRenderOwnerHarness({ k: zoom, roadLabelsEnabled: true });
  appRuntime.transportCountryOverlayState = {
    status: "ready",
    activePackId: "germany_road",
    family: "road",
    collectionsByLayer: {
      roads: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "motorway", reveal_rank: 1 } },
        ],
      },
      road_labels: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [0.5, 0.5] }, properties: { name: "B532" } },
          { type: "Feature", geometry: { type: "Point", coordinates: [0.6, 0.6] }, properties: { name: "A5", priority: 4 } },
        ],
      },
    },
  };

  owner.drawRoadsLayer(zoom);

  assert.equal(context.calls.some((call) => call.type === "fillText" && call.text === "B532"), false);
  assert.ok(context.calls.some((call) => call.type === "fillText" && call.text === "A5"));
  assert.equal(metrics.findLast((entry) => entry.name === "drawCountryRoadsLayer")?.detail?.labelCount, 1);
});

test("country rail overlay consumes rail_stations_major sidecar with pack-scoped hover keys", () => {
  const zoom = 4;
  const { metrics, owner, appRuntime, hoverEntries } = createLineRenderOwnerHarness({ k: zoom });
  appRuntime.transportCountryOverlayState = {
    status: "ready",
    activePackId: "france_rail",
    family: "rail",
    collectionsByLayer: {
      railways: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "mainline", reveal_rank: 1, name: "LGV" } },
        ],
      },
      rail_stations_major: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [0.25, 0.25] }, properties: { id: "station-1", name: "Porte Maillot" } },
        ],
      },
    },
  };

  owner.drawRailwaysLayer(zoom);

  const stationMetric = metrics.findLast((entry) => entry.name === "drawCountryRailStationsMajorLayer");
  assert.equal(stationMetric?.detail?.visibleFeatureCount, 1);
  const stationHoverUpdate = hoverEntries.findLast((entry) => entry.options?.packId === "france_rail");
  assert.equal(stationHoverUpdate?.options?.append, true);
  assert.equal(stationHoverUpdate?.entries?.[0]?.packId, "france_rail");
});



test("country road overlay still draws when global road data is empty", () => {
  const zoom = 4;
  const { metrics, owner, appRuntime } = createLineRenderOwnerHarness({ k: zoom, roadLabelsEnabled: true });
  appRuntime.roadsData = { type: "FeatureCollection", features: [] };
  appRuntime.transportCountryOverlayState = {
    status: "ready",
    activePackId: "germany_road",
    family: "road",
    collectionsByLayer: {
      roads: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "motorway", reveal_rank: 1 } },
        ],
      },
      road_labels: { type: "FeatureCollection", features: [] },
    },
  };

  owner.drawRoadsLayer(zoom);

  assert.equal(metrics.findLast((entry) => entry.name === "drawRoadsLayer")?.detail?.reason, "no-data");
  assert.equal(metrics.findLast((entry) => entry.name === "drawCountryRoadsLayer")?.detail?.visibleFeatureCount, 1);
});

test("country rail overlay still draws when global rail data is empty", () => {
  const zoom = 4;
  const { metrics, owner, appRuntime } = createLineRenderOwnerHarness({ k: zoom });
  appRuntime.railwaysData = { type: "FeatureCollection", features: [] };
  appRuntime.transportCountryOverlayState = {
    status: "ready",
    activePackId: "france_rail",
    family: "rail",
    collectionsByLayer: {
      railways: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }, properties: { class: "mainline", reveal_rank: 1 } },
        ],
      },
      rail_stations_major: { type: "FeatureCollection", features: [] },
    },
  };

  owner.drawRailwaysLayer(zoom);

  assert.equal(metrics.findLast((entry) => entry.name === "drawRailwaysLayer")?.detail?.reason, "no-data");
  assert.equal(metrics.findLast((entry) => entry.name === "drawCountryRailwaysLayer")?.detail?.visibleFeatureCount, 1);
});

test("facility hover semantic dedupe keeps pack-scoped keys and prefers country overlays", () => {
  assert.match(mapRendererSource, /function buildFacilityEntryKey\(entry\) \{[\s\S]*return `\$\{familyId\}:\$\{packId\}:\$\{stableId\}`;/);
  assert.match(mapRendererSource, /function buildFacilityEntrySemanticKey\(entry\) \{[\s\S]*return `\$\{familyId\}:stable:\$\{stableId\}`;/);
  assert.match(mapRendererSource, /dedupeFacilityHoverEntriesBySemanticKey\([\s\S]*getFacilityEntryHitPriority\(entry\) >= getFacilityEntryHitPriority\(existing\)/);
  assert.match(mapRendererSource, /visibleFacilityHoverEntriesByFamily\[normalizedFamilyId\] = dedupeFacilityHoverEntriesBySemanticKey/);
});
