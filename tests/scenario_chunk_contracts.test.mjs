import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createScenarioChunkRuntimeController } from "../js/core/scenario/chunk_runtime.js";
import {
  buildViewportGeoBounds,
  mergeScenarioChunkPayloadsForViewport,
  normalizeScenarioChunkManifest,
  selectScenarioChunks,
} from "../js/core/scenario_chunk_manager.js";
import {
  getCountryCode as getSharedFeatureCountryCode,
  getFeatureId as getSharedFeatureId,
  normalizeFeatureCountryCode,
} from "../js/core/feature_identity.js";
import { createRenderCacheOwner } from "../js/core/renderer/render_cache_owner.js";
import { buildSpatialGridSnapshot, getSpatialBucketKey } from "../js/core/renderer/spatial_index_runtime_builders.js";

const REPO_ROOT = process.cwd();

function readRepoFile(...relativeParts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...relativeParts), "utf8");
}

function loadVendorD3() {
  const context = { window: {}, self: {}, globalThis: null, console };
  context.globalThis = context;
  context.window = context;
  context.self = context;
  vm.createContext(context);
  vm.runInContext(readRepoFile("vendor", "d3.v7.min.js"), context);
  return context.d3;
}

function isWorldGeoBounds(bounds) {
  return Array.isArray(bounds)
    && bounds.length === 2
    && bounds[0]?.[0] <= -179.999
    && bounds[0]?.[1] <= -89.999
    && bounds[1]?.[0] >= 179.999
    && bounds[1]?.[1] >= 89.999;
}

function getManifestChunksByLayer(chunkManifest, layerKey) {
  return (chunkManifest.chunks || []).filter((chunk) => chunk.layer === layerKey);
}

function readManifestChunkPayload(chunk) {
  return JSON.parse(readRepoFile(...String(chunk.url || "").split("/")));
}

function getFeatureId(feature) {
  return String(feature?.properties?.id || feature?.id || "").trim();
}

function getTopologyGeometryId(geometry) {
  return String(geometry?.properties?.id || geometry?.id || "").trim();
}

function getCoordinateBounds(coordinates, bounds = {
  minLon: Infinity,
  minLat: Infinity,
  maxLon: -Infinity,
  maxLat: -Infinity,
}) {
  if (!Array.isArray(coordinates)) return bounds;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      bounds.minLon = Math.min(bounds.minLon, lon);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLon = Math.max(bounds.maxLon, lon);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
    }
    return bounds;
  }
  coordinates.forEach((child) => getCoordinateBounds(child, bounds));
  return bounds;
}

function extractRendererFunction(source, functionName) {
  const startToken = `function ${functionName}`;
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${functionName} must have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${functionName} body must close`);
}

function extractRendererPassSignatureBranch(source, passName) {
  const marker = `if (passName === "${passName}") {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${passName} signature branch must exist`);
  const next = source.indexOf("\n  if (passName ===", start + marker.length);
  assert.notEqual(next, -1, `${passName} signature branch must end before the next pass branch`);
  return source.slice(start, next);
}

function createRendererShellPolicyHarness(rendererSource) {
  const functionNames = [
    "isScenarioShellFeature",
    "isRuntimeOnlyShellFallbackPoliticalFeature",
    "isPoliticalShellUnderlayFeature",
    "isPoliticalPrimaryUnderlayFeature",
    "isPoliticalUnderlayFeature",
    "hasPoliticalForegroundColorOverride",
    "isPendingPoliticalColorEditFeature",
    "isPoliticalForegroundFeature",
    "orderPoliticalShellUnderlayFirst",
    "shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature",
    "isBaseGeographyScenarioFeature",
    "isPoliticalVisualRenderableFeature",
    "isPoliticalInteractionRenderableFeature",
    "getRuntimePoliticalBaseCollection",
  ];
  const source = `
    const runtimeState = {
      mapSemanticMode: "ownership",
      activeScenarioId: "test",
      colorRevision: 1,
      visualOverrides: {},
      featureOverrides: {},
      renderPassCache: {
        pendingPoliticalColorEditIds: new Set(),
        pendingPoliticalColorEditRevision: 1,
        pendingPoliticalColorEditScenarioId: "test",
      },
    };
    const getFeatureId = (feature) => String(feature?.properties?.id || feature?.id || "").trim();
    const getSafeCanvasColor = (value, fallback = null) => (typeof value === "string" && value.trim() ? value : fallback);
    const getRenderPassCacheState = () => runtimeState.renderPassCache;
    function hasPendingPoliticalColorEdit() {
      const cache = getRenderPassCacheState();
      return cache.pendingPoliticalColorEditIds instanceof Set
        && cache.pendingPoliticalColorEditIds.size > 0
        && String(cache.pendingPoliticalColorEditScenarioId || "") === String(runtimeState.activeScenarioId || "")
        && Number(cache.pendingPoliticalColorEditRevision ?? -1) === Number(runtimeState.colorRevision || 0);
    }
    const isAtlantropaFieldDrivenFeature = () => false;
    const isScenarioAtlantropaVisible = () => true;
    const isAntarcticSectorFeature = () => false;
    const isAtlantropaVisualSupportHelperFeature = () => false;
    const isAtlantropaSupportHelperFeature = () => false;
    ${functionNames.map((name) => extractRendererFunction(rendererSource, name)).join("\n")}
    globalThis.__shellPolicyHarness = {
      isScenarioShellFeature,
      isRuntimeOnlyShellFallbackPoliticalFeature,
      isPoliticalShellUnderlayFeature,
      isPoliticalPrimaryUnderlayFeature,
      isPoliticalUnderlayFeature,
      hasPoliticalForegroundColorOverride,
      isPendingPoliticalColorEditFeature,
      isPoliticalForegroundFeature,
      orderPoliticalShellUnderlayFirst,
      shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature,
      isPoliticalVisualRenderableFeature,
      isPoliticalInteractionRenderableFeature,
      getRuntimePoliticalBaseCollection,
      setMapSemanticMode: (value) => { runtimeState.mapSemanticMode = value; },
      setVisualOverrides: (value) => {
        runtimeState.visualOverrides = value || {};
        runtimeState.featureOverrides = { ...(value || {}) };
      },
      setPendingColorEditIds: (ids) => {
        runtimeState.renderPassCache.pendingPoliticalColorEditIds = new Set(ids || []);
      },
    };
  `;
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__shellPolicyHarness;
}

function getPolygonCoordinateSets(geometry) {
  if (!geometry || typeof geometry !== "object") return [];
  if (geometry.type === "Polygon") {
    return Array.isArray(geometry.coordinates) ? [geometry.coordinates] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  }
  return [];
}

function getRingSignedArea(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return 0;
  let total = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const first = ring[index];
    const second = ring[index + 1];
    if (!Array.isArray(first) || !Array.isArray(second)) continue;
    total += (Number(first[0]) * Number(second[1])) - (Number(second[0]) * Number(first[1]));
  }
  return total / 2;
}

test("scheduled chunk refresh starts without seeded pending reason", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timerCallbacks = [];
  const chunk = {
    id: "political.detail.test",
    url: "political.detail.test.json",
    layer: "political",
    lod: "detail",
    bounds: [-1, -1, 1, 1],
    countryCodes: ["TT"],
  };
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeScenarioChunks: {
      loadedChunkIds: [],
      payloadByChunkId: {},
      mergedLayerPayloads: {},
      lruChunkIds: [],
    },
    renderPerfMetrics: {},
    uiState: { developerMode: true },
    renderDiagnostics: { perfOverlayEnabled: true },
    zoomTransform: { k: 2 },
    getViewportGeoBoundsFn: () => [-2, -2, 2, 2],
  };
  let selectCalls = 0;

  globalThis.setTimeout = (callback) => {
    timerCallbacks.push(callback);
    return timerCallbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    const controller = createScenarioChunkRuntimeController({
      runtimeState,
      getSearchParams: () => new URLSearchParams(),
      normalizeScenarioId: (value) => String(value || "").trim(),
      normalizeCountryCodeAlias: (value) => String(value || "").trim().toUpperCase(),
      normalizeScenarioFeatureCollection: (payload) => payload,
      getScenarioFeatureCollectionIdentityList: (payload) => (
        Array.isArray(payload?.features) ? payload.features.map((feature) => String(feature?.id || "")) : []
      ),
      areScenarioFeatureCollectionsEquivalent: () => false,
      getScenarioDefaultCountryCode: () => "",
      getScenarioBundleId: () => "tno_1962",
      getCachedScenarioBundle: () => ({
        manifest: { scenario_id: "tno_1962" },
        chunkRegistry: { byLayer: { political: [chunk] } },
        runtimeShell: { renderBudgetHints: {} },
        countriesPayload: { countries: {} },
      }),
      getVisibleScenarioChunkLayers: () => ["political"],
      selectScenarioChunks: () => {
        selectCalls += 1;
        return {
          scenarioId: "tno_1962",
          requiredChunks: [chunk],
          optionalChunks: [],
          evictableChunkIds: [],
          selectedFeatureCountSum: 1,
        };
      },
      mergeScenarioChunkPayloads: (_layerKey, payloads) => ({
        type: "FeatureCollection",
        features: payloads.flatMap((payload) => payload?.features || []),
      }),
      normalizeScenarioRenderBudgetHints: (value) => value || {},
      loadScenarioChunkFile: async () => ({
        type: "FeatureCollection",
        features: [{ type: "Feature", id: "feature-a", properties: {}, geometry: null }],
      }),
      scenarioSupportsChunkedRuntime: () => true,
      scenarioBundleUsesChunkedLayer: () => true,
      getScenarioOptionalLayerConfig: () => null,
      syncScenarioLocalizationState: () => {},
      refreshMapDataForScenarioChunkPromotion: () => {},
      flushRenderBoundary: () => {},
      recordScenarioPerfMetric: () => {},
      ensureScenarioChunkRegistryLoaded: async () => {},
    });

    const status = controller.scheduleScenarioChunkRefresh({ reason: "visibility:political", delayMs: 0 });
    assert.equal(status, "scheduled");
    assert.equal(typeof status, "string");
    assert.equal(typeof status?.then, "undefined");
    assert.equal(selectCalls, 0);

    timerCallbacks.splice(0).forEach((callback) => callback());
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(selectCalls, 1);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("scenario tag focus stays tag-scoped when palette metadata maps to ISO2", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const chunk = {
    id: "political.detail.country.gco",
    url: "political.detail.country.gco.json",
    layer: "political",
    lod: "detail",
    bounds: [8, -14, 32, 14],
    countryCodes: ["GCO"],
  };
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeSovereignCode: "GCO",
    activeScenarioChunks: {
      loadedChunkIds: [],
      payloadByChunkId: {},
      mergedLayerPayloads: {},
      lruChunkIds: [],
    },
    renderPerfMetrics: {},
    uiState: { developerMode: true },
    renderDiagnostics: { perfOverlayEnabled: true },
    zoomTransform: { k: 3 },
    getViewportGeoBoundsFn: () => [12, -8, 28, 6],
  };
  let selectedFocusCountry = "";

  globalThis.setTimeout = (callback) => {
    callback();
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    const controller = createScenarioChunkRuntimeController({
      runtimeState,
      getSearchParams: () => new URLSearchParams(),
      normalizeScenarioId: (value) => String(value || "").trim(),
      normalizeCountryCodeAlias: (value) => String(value || "").trim().toUpperCase(),
      normalizeScenarioFeatureCollection: (payload) => payload,
      getScenarioFeatureCollectionIdentityList: (payload) => (
        Array.isArray(payload?.features) ? payload.features.map((feature) => String(feature?.id || "")) : []
      ),
      areScenarioFeatureCollectionsEquivalent: () => false,
      getScenarioDefaultCountryCode: () => "GCO",
      getScenarioBundleId: () => "tno_1962",
      getCachedScenarioBundle: () => ({
        manifest: { scenario_id: "tno_1962" },
        chunkRegistry: { byLayer: { political: [chunk] } },
        runtimeShell: { renderBudgetHints: { detail_zoom_threshold: 2 } },
        countriesPayload: { countries: { GCO: { lookup_iso2: "CD" } } },
      }),
      getVisibleScenarioChunkLayers: () => ["political"],
      selectScenarioChunks: ({ focusCountry }) => {
        selectedFocusCountry = focusCountry;
        return {
          scenarioId: "tno_1962",
          requiredChunks: [chunk],
          optionalChunks: [],
          evictableChunkIds: [],
          selectedFeatureCountSum: 1,
        };
      },
      mergeScenarioChunkPayloads: (_layerKey, payloads) => ({
        type: "FeatureCollection",
        features: payloads.flatMap((payload) => payload?.features || []),
      }),
      normalizeScenarioRenderBudgetHints: (value) => value || {},
      loadScenarioChunkFile: async () => ({
        payload: { type: "FeatureCollection", features: [] },
      }),
      scenarioSupportsChunkedRuntime: () => true,
      scenarioBundleUsesChunkedLayer: (_bundle, layerKey = "") => !layerKey || layerKey === "political",
      getScenarioOptionalLayerConfig: () => null,
      syncScenarioLocalizationState: () => {},
      refreshMapDataForScenarioChunkPromotion: () => {},
      flushRenderBoundary: () => {},
      recordScenarioPerfMetric: () => {},
      ensureScenarioChunkRegistryLoaded: async () => {},
    });

    assert.equal(controller.scheduleScenarioChunkRefresh({ reason: "zoom-end", delayMs: 0 }), "scheduled");
    for (let i = 0; i < 4; i += 1) {
      await Promise.resolve();
    }
    assert.equal(selectedFocusCountry, "GCO");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("chunk cost tie-breaker preserves viewport center relevance", () => {
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: {
      byLayer: {
        political: [
          {
            id: "cheap-edge",
            url: "cheap-edge.json",
            layer: "political",
            lod: "detail",
            bounds: [-10, -10, -8, -8],
            minZoom: 0,
            maxZoom: 99,
            priority: 0,
            countryCodes: [],
            estimatedPathCost: 1,
            byteSize: 1,
            coordCount: 1,
            partCount: 1,
            featureCount: 1,
          },
          {
            id: "expensive-center",
            url: "expensive-center.json",
            layer: "political",
            lod: "detail",
            bounds: [-1, -1, 1, 1],
            minZoom: 0,
            maxZoom: 99,
            priority: 0,
            countryCodes: [],
            estimatedPathCost: 1000,
            byteSize: 1000,
            coordCount: 1000,
            partCount: 100,
            featureCount: 100,
          },
        ],
      },
    },
    zoom: 10,
    viewportBbox: [-10, -10, 10, 10],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 1,
      max_optional_chunks: 0,
    },
  });
  assert.equal(selection.requiredChunks[0]?.id, "expensive-center");
});

test("chunk cost budget limits high-cost required detail tail", () => {
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: {
      byLayer: {
        political: [
          {
            id: "center-a",
            url: "center-a.json",
            layer: "political",
            lod: "detail",
            bounds: [-1, -1, 1, 1],
            minZoom: 0,
            maxZoom: 99,
            priority: 0,
            countryCodes: [],
            estimatedPathCost: 10,
            byteSize: 10,
            coordCount: 10,
            partCount: 1,
            featureCount: 1,
          },
          {
            id: "center-b",
            url: "center-b.json",
            layer: "political",
            lod: "detail",
            bounds: [-1, -1, 1, 1],
            minZoom: 0,
            maxZoom: 99,
            priority: 0,
            countryCodes: [],
            estimatedPathCost: 10,
            byteSize: 10,
            coordCount: 10,
            partCount: 1,
            featureCount: 1,
          },
        ],
      },
    },
    zoom: 10,
    viewportBbox: [-10, -10, 10, 10],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 1,
      min_required_chunks: 1,
      max_optional_chunks: 0,
      max_required_estimated_path_cost: 15,
    },
  });

  assert.deepEqual(selection.requiredChunks.map((chunk) => chunk.id), ["center-a"]);
  assert.equal(selection.selectedEstimatedPathCostSum, 10);
});

test("political byte budget limits cold required detail tail", () => {
  const makePoliticalChunk = (id, byteSize) => ({
    id,
    url: `${id}.json`,
    layer: "political",
    lod: "detail",
    bounds: [-1, -1, 1, 1],
    minZoom: 0,
    maxZoom: 99,
    priority: 0,
    countryCodes: [],
    estimatedPathCost: 10,
    byteSize,
    coordCount: 10,
    partCount: 1,
    featureCount: 1,
  });
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: {
      byLayer: {
        political: [
          makePoliticalChunk("center-a", 5),
          makePoliticalChunk("center-b", 5),
          makePoliticalChunk("center-c", 5),
        ],
      },
    },
    zoom: 10,
    viewportBbox: [-10, -10, 10, 10],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 6,
      max_required_political_chunks: 6,
      min_required_political_chunks: 2,
      max_optional_chunks: 0,
      max_required_political_byte_size: 11,
    },
  });

  assert.deepEqual(selection.requiredChunks.map((chunk) => chunk.id), ["center-a", "center-b"]);
  assert.equal(selection.selectedByteCountSum, 10);
});

test("chunk selection requires only current viewport political chunks", () => {
  const makePoliticalChunk = (id, bounds, estimatedPathCost = 10) => ({
    id,
    url: `${id}.json`,
    layer: "political",
    lod: "detail",
    bounds,
    minZoom: 0,
    maxZoom: 99,
    priority: 0,
    countryCodes: [],
    featureCount: 1,
    byteSize: 1,
    estimatedPathCost,
  });
  const selection = selectScenarioChunks({
    scenarioId: "hoi4_1939",
    chunkRegistry: normalizeScenarioChunkManifest({
      chunks: [
        makePoliticalChunk("political.detail.visible", [-2, -2, 2, 2], 17),
        makePoliticalChunk("political.detail.outside", [80, 40, 90, 50], 19),
      ],
    }),
    zoom: 6,
    viewportBbox: [-5, -5, 5, 5],
    visibleLayers: ["political"],
    loadedChunkIds: [
      "political.detail.visible",
      "political.detail.previous",
      "political.detail.outside",
    ],
    renderBudgetHints: {
      max_required_chunks: 8,
      max_required_political_chunks: 8,
      min_required_political_chunks: 1,
      max_optional_chunks: 0,
    },
  });

  assert.deepEqual(selection.requiredChunks.map((chunk) => chunk.id), ["political.detail.visible"]);
  assert.deepEqual(selection.evictableChunkIds, [
    "political.detail.previous",
    "political.detail.outside",
  ]);
  assert.equal(selection.selectedEstimatedPathCostSum, 17);
});

test("feature bounds keep broad owner chunks out of unrelated viewports", () => {
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: normalizeScenarioChunkManifest({
      chunks: [
        {
          id: "political.detail.country.global-owner",
          url: "global-owner.json",
          layer: "political",
          lod: "detail",
          bounds: [-180, -60, 180, 80],
          feature_bounds: [[120, 20, 130, 30]],
          min_zoom: 0,
          max_zoom: 99,
          country_codes: ["GO"],
          feature_count: 1,
          byte_size: 1,
          estimated_path_cost: 1,
        },
        {
          id: "political.detail.country.local-owner",
          url: "local-owner.json",
          layer: "political",
          lod: "detail",
          bounds: [-180, -60, 180, 80],
          feature_bounds: [[8, 32, 12, 36]],
          min_zoom: 0,
          max_zoom: 99,
          country_codes: ["LO"],
          feature_count: 1,
          byte_size: 1,
          estimated_path_cost: 1,
        },
      ],
    }),
    zoom: 2.5,
    viewportBbox: [7, 31, 13, 37],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 6,
      max_required_political_chunks: 6,
      min_required_political_chunks: 1,
    },
  });

  assert.deepEqual(selection.requiredChunks.map((chunk) => chunk.id), ["political.detail.country.local-owner"]);
});

test("edge-touching feature bounds stay eligible for political detail selection", () => {
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: normalizeScenarioChunkManifest({
      chunks: [
        {
          id: "political.detail.country.edge-owner",
          url: "edge-owner.json",
          layer: "political",
          lod: "detail",
          bounds: [-180, -60, 180, 80],
          feature_bounds: [[13, 33, 15, 36]],
          min_zoom: 0,
          max_zoom: 99,
          country_codes: ["EO"],
          feature_count: 1,
          byte_size: 1,
          estimated_path_cost: 1,
        },
      ],
    }),
    zoom: 2.5,
    viewportBbox: [7, 31, 13, 37],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 6,
      max_required_political_chunks: 6,
      min_required_political_chunks: 1,
    },
  });

  assert.deepEqual(selection.requiredChunks.map((chunk) => chunk.id), ["political.detail.country.edge-owner"]);
});

test("political detail selection reports viewport feature subset counts", () => {
  const selection = selectScenarioChunks({
    scenarioId: "tno_1962",
    chunkRegistry: normalizeScenarioChunkManifest({
      chunks: [
        {
          id: "political.detail.country.multi-owner",
          url: "multi-owner.json",
          layer: "political",
          lod: "detail",
          bounds: [-180, -60, 180, 80],
          feature_bounds: [
            [8, 32, 10, 34],
            [80, 40, 90, 50],
            [11, 35, 12, 36],
          ],
          min_zoom: 0,
          max_zoom: 99,
          feature_count: 3,
          byte_size: 1,
          estimated_path_cost: 3,
        },
      ],
    }),
    zoom: 2.5,
    viewportBbox: [7, 31, 13, 37],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 6,
      max_required_political_chunks: 6,
      min_required_political_chunks: 1,
    },
  });

  assert.equal(selection.selectedFeatureCountSum, 3);
  assert.equal(selection.selectedVisibleFeatureCountSum, 2);
  assert.equal(selection.selectedPoliticalFeatureCountSum, 3);
  assert.equal(selection.selectedPoliticalVisibleFeatureCountSum, 2);
  assert.equal(selection.politicalVisibleFeatureSubsetSignature, "political.detail.country.multi-owner:0.2");
});

test("political chunk payload merge can clip to viewport feature bounds", () => {
  const chunk = normalizeScenarioChunkManifest({
    chunks: [
      {
        id: "political.detail.country.multi-owner",
        url: "multi-owner.json",
        layer: "political",
        lod: "detail",
        bounds: [-180, -60, 180, 80],
        feature_bounds: [
          [8, 32, 10, 34],
          [80, 40, 90, 50],
          [11, 35, 12, 36],
        ],
        feature_count: 3,
      },
    ],
  }).chunks[0];
  const result = mergeScenarioChunkPayloadsForViewport("political", [{
    chunk,
    payload: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", id: "visible-a", properties: {}, geometry: null },
        { type: "Feature", id: "outside-b", properties: {}, geometry: null },
        { type: "Feature", id: "visible-c", properties: {}, geometry: null },
      ],
    },
  }], [7, 31, 13, 37]);

  assert.deepEqual(result.payload.features.map((feature) => feature.id), ["visible-a", "visible-c"]);
  assert.equal(result.stats.visibleFeatureCount, 2);
  assert.equal(result.stats.totalFeatureCount, 3);
  assert.equal(result.stats.clippedChunkCount, 1);
});

test("political chunk feature bounds preserve zero-area positional alignment", () => {
  const selection = selectScenarioChunks({
    scenarioId: "zero_bounds",
    chunkRegistry: normalizeScenarioChunkManifest({
      chunks: [
        {
          id: "political.detail.country.zero-owner",
          url: "zero-owner.json",
          layer: "political",
          lod: "detail",
          bounds: [-180, -60, 180, 80],
          feature_bounds: [
            [0, 0, 0, 0],
            [80, 40, 90, 50],
          ],
          min_zoom: 0,
          max_zoom: 99,
          feature_count: 2,
          byte_size: 1,
          estimated_path_cost: 2,
        },
      ],
    }),
    zoom: 2.5,
    viewportBbox: [-1, -1, 1, 1],
    visibleLayers: ["political"],
    renderBudgetHints: {
      max_required_chunks: 6,
      max_required_political_chunks: 6,
      min_required_political_chunks: 1,
    },
  });

  assert.equal(selection.selectedPoliticalFeatureCountSum, 2);
  assert.equal(selection.selectedPoliticalVisibleFeatureCountSum, 1);
  assert.equal(selection.politicalVisibleFeatureSubsetSignature, "political.detail.country.zero-owner:0");

  const result = mergeScenarioChunkPayloadsForViewport("political", [{
    chunk: selection.requiredChunks[0],
    payload: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", id: "zero-a", properties: {}, geometry: null },
        { type: "Feature", id: "outside-b", properties: {}, geometry: null },
      ],
    },
  }], [-1, -1, 1, 1]);

  assert.deepEqual(result.payload.features.map((feature) => feature.id), ["zero-a"]);
  assert.equal(result.stats.visibleFeatureCount, 1);
  assert.equal(result.stats.totalFeatureCount, 2);
  assert.equal(result.stats.clippedChunkCount, 1);
});

test("tno render budget sets political cold selection caps", () => {
  const manifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "manifest.json"));
  const chunkAssetToolSource = readRepoFile("tools", "scenario_chunk_assets.py");
  const hints = manifest.render_budget_hints || {};

  assert.equal(hints.max_required_political_chunks, 6);
  assert.equal(hints.min_required_political_chunks, 1);
  assert.equal(hints.max_required_political_estimated_path_cost, 680_000);
  assert.equal(hints.max_required_political_byte_size, 45_000_000);
  assert.match(chunkAssetToolSource, /TNO_1962_RENDER_BUDGET_HINTS = \{[\s\S]*?"max_required_political_chunks": 6/);
  assert.match(chunkAssetToolSource, /\*\*\(TNO_1962_RENDER_BUDGET_HINTS if scenario_id == "tno_1962" else \{\}\)/);
});

test("checked-in political coarse chunks match complete runtime political geometry", () => {
  for (const scenarioId of ["tno_1962", "hoi4_1939"]) {
    const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", scenarioId, "detail_chunks.manifest.json"));
    const bootstrapTopology = JSON.parse(readRepoFile("data", "scenarios", scenarioId, "runtime_topology.bootstrap.topo.json"));
    const runtimeTopology = JSON.parse(readRepoFile("data", "scenarios", scenarioId, "runtime_topology.topo.json"));
    const bootstrapPoliticalCount = bootstrapTopology.objects?.political?.geometries?.length || 0;
    const runtimePoliticalCount = runtimeTopology.objects?.political?.geometries?.length || 0;
    const coarseChunk = chunkManifest.chunks.find((chunk) => chunk.id === "political.coarse.r0c0");
    const coarsePayload = readManifestChunkPayload(coarseChunk);

    assert.ok(bootstrapPoliticalCount > 0, `${scenarioId} bootstrap political geometry must exist`);
    assert.ok(runtimePoliticalCount > 0, `${scenarioId} runtime political geometry must exist`);
    assert.equal(coarseChunk.feature_count, runtimePoliticalCount, `${scenarioId} coarse chunk should match runtime political geometry`);
    assert.equal(coarseChunk.feature_bounds.length, coarseChunk.feature_count, `${scenarioId} coarse chunk should expose per-feature bounds`);
    assert.equal(coarsePayload.features.length, coarseChunk.feature_count, `${scenarioId} coarse payload should match manifest count`);

    const interactivePoliticalFeatures = coarsePayload.features.filter((feature) => {
      const props = feature?.properties || {};
      return props.interactive !== false && props.render_as_base_geography !== true;
    });
    assert.ok(interactivePoliticalFeatures.length > 0, `${scenarioId} coarse chunk should retain interactive political features`);
  }
});

test("tno mediterranean detail selection keeps Atlantropa scenario layer chunks", () => {
  const manifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "manifest.json"));
  const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "detail_chunks.manifest.json"));
  const chunkRegistry = normalizeScenarioChunkManifest(chunkManifest);
  const mediterraneanViewport = [8, 32, 28, 46];
  const focusCountries = ["ITA", "GRE", "TUR", "CRO", "SPR", ""];

  focusCountries.forEach((focusCountry) => {
    const selection = selectScenarioChunks({
      scenarioId: "tno_1962",
      chunkRegistry,
      contextLodManifest: null,
      zoom: 2.5,
      viewportBbox: mediterraneanViewport,
      focusCountry,
      renderBudgetHints: manifest.render_budget_hints,
      visibleLayers: ["political", "scenario_atlantropa"],
      loadedChunkIds: [],
    });
    const requiredIds = selection.requiredChunks.map((chunk) => chunk.id);
    assert.ok(
      requiredIds.some((id) => id.startsWith("scenario_atlantropa.detail.")),
      `focus=${focusCountry || "(none)"} required=${requiredIds.join(",")}`,
    );
    assert.equal(
      requiredIds.includes("political.detail.country.atl"),
      false,
      `focus=${focusCountry || "(none)"} should use scenario_atlantropa chunks instead of the old ATL political chunk`,
    );
    assert.ok(requiredIds.length > 6, "TNO Mediterranean detail view needs wider political chunk coverage than the old 6 chunk cap");
  });
});

test("tno detail chunk manifest records content hashes and precise feature bounds", () => {
  const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "detail_chunks.manifest.json"));
  const atlantropaDetailChunks = getManifestChunksByLayer(chunkManifest, "scenario_atlantropa")
    .filter((chunk) => chunk.lod === "detail");
  assert.ok(atlantropaDetailChunks.length > 0, "scenario_atlantropa detail chunks must exist");
  atlantropaDetailChunks.forEach((chunk) => {
    assert.match(chunk.id, /^scenario_atlantropa\.detail\.r[0-1]c[0-3]$/);
    assert.match(String(chunk.sha256 || ""), /^[a-f0-9]{64}$/);
    assert.ok(Array.isArray(chunk.feature_bounds), `${chunk.id} should expose precise feature bounds`);
  });
  const localBounds = atlantropaDetailChunks.flatMap((chunk) => chunk.feature_bounds || []);
  assert.ok(localBounds.length >= 100);
  assert.ok(
    localBounds.some((bounds) => Array.isArray(bounds) && bounds[0] >= -6.1 && bounds[2] <= 36.3),
    "scenario_atlantropa chunks should expose local feature bounds for viewport selection",
  );
});

test("tno startup runtime meta keeps Atlantropa ids beyond the bootstrap shell", () => {
  const startupBundle = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "startup.bundle.en.json"));
  const bootstrapTopology = startupBundle.scenario.runtime_topology_bootstrap;
  const metaFeatureIds = startupBundle.scenario.runtime_political_meta.featureIds;
  const bootstrapPoliticalIds = (bootstrapTopology.objects.political.geometries || []).map(getTopologyGeometryId);
  const bootstrapAtlantropaIds = (bootstrapTopology.objects.scenario_atlantropa?.geometries || []).map(getTopologyGeometryId);

  assert.ok(metaFeatureIds.length > bootstrapPoliticalIds.length + bootstrapAtlantropaIds.length);
  assert.ok(metaFeatureIds.some((featureId) => String(featureId).startsWith("ATL")));
  const metaFeatureIdSet = new Set(metaFeatureIds);
  assert.ok(bootstrapPoliticalIds.every((featureId) => metaFeatureIdSet.has(featureId)));
});

test("tno scenario_atlantropa chunks stay d3 small-polygon safe", () => {
  const d3 = loadVendorD3();
  const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "detail_chunks.manifest.json"));
  const atlantropaChunks = getManifestChunksByLayer(chunkManifest, "scenario_atlantropa");
  assert.ok(atlantropaChunks.length > 0, "scenario_atlantropa chunks must exist");
  const badSamples = [];
  for (const chunk of atlantropaChunks) {
    const payload = readManifestChunkPayload(chunk);
    for (const feature of payload.features || []) {
      const featureId = String(feature?.properties?.id || feature?.id || "").trim();
      if (!featureId.startsWith("ATL")) continue;
      const bounds = d3.geoBounds(feature);
      const area = d3.geoArea(feature);
      if (isWorldGeoBounds(bounds) || area > 1) {
        badSamples.push({ chunkId: chunk.id, featureId, bounds, area });
      }
      if (badSamples.length >= 8) break;
    }
    if (badSamples.length >= 8) break;
  }
  assert.deepEqual(badSamples, []);
});

test("tno boolean-weld Atlantropa donor island chunks do not publish large interior holes", () => {
  const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "detail_chunks.manifest.json"));
  const requiredIslandIds = new Set([
    "ATLISL_west_med_balearics",
    "ATLISL_aegean_crete",
    "ATLISL_levant_cyprus",
  ]);
  const atlantropaChunks = getManifestChunksByLayer(chunkManifest, "scenario_atlantropa");
  const visitedRequiredIds = new Set();
  const visitedBooleanWeldIds = new Set();
  const interiorRingSamples = [];
  for (const chunk of atlantropaChunks) {
    const payload = readManifestChunkPayload(chunk);
    for (const feature of payload.features || []) {
      const featureId = getFeatureId(feature);
      const props = feature?.properties || {};
      if (!featureId.startsWith("ATLISL_")) continue;
      if (props.atl_geometry_role !== "donor_island" || props.atl_join_mode !== "boolean_weld") continue;
      if (requiredIslandIds.has(featureId)) visitedRequiredIds.add(featureId);
      visitedBooleanWeldIds.add(featureId);
      for (const polygonCoordinates of getPolygonCoordinateSets(feature.geometry)) {
        polygonCoordinates.slice(1).forEach((ring, ringIndex) => {
          interiorRingSamples.push({
            chunkId: chunk.id,
            featureId,
            ringIndex: ringIndex + 1,
            pointCount: Array.isArray(ring) ? ring.length : 0,
            area: Number(Math.abs(getRingSignedArea(ring)).toFixed(9)),
          });
        });
      }
    }
  }
  assert.ok(visitedBooleanWeldIds.size > 0, "expected checked-in Atlantropa boolean-weld donor islands");
  assert.deepEqual([...requiredIslandIds].filter((featureId) => !visitedRequiredIds.has(featureId)), []);
  assert.deepEqual(interiorRingSamples, []);
});

test("viewport geo bounds samples curved projection edges for chunk eligibility", () => {
  const bounds = buildViewportGeoBounds({
    width: 100,
    height: 100,
    transform: { x: 0, y: 0, k: 1 },
    projection: {
      invert: ([x, y]) => [
        x + 100 * Math.sin(Math.PI * (y / 100)),
        y,
      ],
    },
  });

  assert.ok(bounds[0] < 0);
  assert.ok(bounds[1] < 0);
  assert.equal(bounds[2], 180);
  assert.equal(bounds[3], 90);
});

test("exact-after-settle keeps scenario overlays on the contextScenario reuse path", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const mainSource = readRepoFile("js", "main.js");
  const contextScenarioSignatureBranch = extractRendererPassSignatureBranch(rendererSource, "contextScenario");
  const rendererRuntimeStateSource = readRepoFile("js", "core", "state", "renderer_runtime_state.js");
  const frameSchedulerSource = readRepoFile("js", "core", "frame_scheduler.js");
  const scenarioOwnershipEditorSource = readRepoFile("js", "core", "scenario_ownership_editor.js");
  const politicalRasterWorkerClientSource = readRepoFile("js", "core", "political_raster_worker_client.js");
  const politicalRasterWorkerSource = readRepoFile("js", "workers", "political_raster.worker.js");
  const chunkRuntimeSource = readRepoFile("js", "core", "scenario", "chunk_runtime.js");
  const chunkManagerSource = readRepoFile("js", "core", "scenario_chunk_manager.js");
  const spatialQueryIndexSource = readRepoFile("js", "core", "renderer", "spatial_query_index.js");
  const chunkPromotionHelperSource = readRepoFile("js", "core", "renderer", "scenario_chunk_promotion_helpers.js");
  const scenarioRefreshPlansSource = readRepoFile("js", "core", "map_renderer", "scenario_refresh_plans.js");
  const interactionHitCandidateSource = readRepoFile("js", "core", "map_renderer", "interaction_hit_candidates.js");
  const bundleRuntimeSource = readRepoFile("js", "core", "scenario", "bundle_runtime.js");
  const bundleLoaderSource = readRepoFile("js", "core", "scenario", "bundle_loader.js");
  const postApplyEffectsSource = readRepoFile("js", "core", "scenario_post_apply_effects.js");
  const renderPipelinePassesSource = readRepoFile("js", "core", "renderer", "render_pipeline_passes.js");
  const renderCacheOwnerSource = readRepoFile("js", "core", "renderer", "render_cache_owner.js");
  const interactionRecoveryBlockedBody =
    rendererSource.match(/function isInteractionRecoveryBlocked\(\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body || "";

  const contract = {
    drawContextScenarioPassKeepsScenarioOverlayBoundary:
      /function drawContextScenarioPass\(k, \{ interactive = false \} = \{\}\) \{[\s\S]*?drawScenarioRegionOverlaysPass\(k\);[\s\S]*?drawScenarioReliefOverlaysPass\(k\);[\s\S]*?recordRenderPerfMetric\("drawContextScenarioPass"/.test(rendererSource),
    signatureOnlyContextScenarioInvalidationUsesTransformReuse:
      /passName === "contextScenario"[\s\S]*?shouldEnableContextScenarioTransformReuse\(\)[\s\S]*?cache\.dirty\[passName\] = false;[\s\S]*?recordRenderPerfMetric\("contextScenarioReuseSkipped", 0, \{/.test(renderPipelinePassesSource)
      && /shouldEnableContextScenarioTransformReuse,/.test(rendererSource),
    contextScenarioKeepsLayerMetrics:
      rendererSource.includes('"contextScenarioLayerWater"')
      && rendererSource.includes('"contextScenarioLayerSpecial"')
      && rendererSource.includes('renderScenarioSpecialRegionOverlaysLayerToCache')
      && rendererSource.includes('getContextScenarioLayerCacheEntry("special")')
      && rendererSource.includes('"contextScenarioLayerRelief"')
      && rendererSource.includes('renderScenarioReliefOverlaysLayerToCache')
      && rendererSource.includes('getContextScenarioLayerCacheEntry("relief")')
      && renderPipelinePassesSource.includes('recordRenderPerfMetric("contextScenarioSignatureChanged"'),
    contextScenarioSpecialSignatureTracksPayloadIdentity:
      /function getScenarioSpecialVisualRevisionToken\(\) \{[\s\S]*?special-ref:\$\{getObjectIdentityToken\(runtimeState\.scenarioSpecialRegionsData, "scenario-special"\)\}[\s\S]*?special-count:\$\{getFeatureCollectionFeatureCount\(runtimeState\.scenarioSpecialRegionsData\)\}[\s\S]*?runtimeState\.showScenarioSpecialRegions \? "scenario-special:on" : "scenario-special:off"/.test(rendererSource),
    interactionMetricsKeepDirectActionAndHitRankDurations:
      rendererSource.includes('recordInteractionDurationMetric("interactionActionDuration"')
      && /function rankCandidates\([\s\S]*?candidates,[\s\S]*?lonLat,[\s\S]*?eventType = "unknown",[\s\S]*?targetType = "unknown",[\s\S]*?recordInteractionDurationMetric\("interactionHitRankDuration"[\s\S]*?candidateCount: candidates\.length,[\s\S]*?geoContainsCount,[\s\S]*?containsGeoCount:[\s\S]*?eventType,[\s\S]*?targetType,/.test(interactionHitCandidateSource)
      && /function rankCandidates\(candidates, lonLat,[\s\S]*?rankHitCandidates\(candidates, lonLat,[\s\S]*?recordInteractionDurationMetric,/.test(rendererSource),
    hoverMetricsUseSamplingAndSlowSampleThreshold:
      rendererSource.includes("const HOVER_INTERACTION_METRIC_SAMPLE_RATE = 10;")
      && rendererSource.includes("const HOVER_INTERACTION_SLOW_SAMPLE_MS = 8;")
      && /function recordInteractionDurationMetric\(name, durationMs, details = \{\}\) \{[\s\S]*?incrementPerfCounter\(counterName\);[\s\S]*?callCount % HOVER_INTERACTION_METRIC_SAMPLE_RATE === 0/.test(rendererSource),
    hoverOverlayKeepsDirtySignatureGateAndRafQueue:
      /function renderHoverOverlayIfNeeded\(\{ force = false, eventType = "hover" \} = \{\}\) \{[\s\S]*?!force && !runtimeState\.hoverOverlayDirty && nextSignature === lastHoverOverlaySignature[\s\S]*?recordInteractionDurationMetric\("interactionHoverOverlayDuration"/.test(rendererSource)
      && /function scheduleHoverOverlayRender\(\) \{[\s\S]*?hoverOverlayRenderRafHandle !== null && hoverOverlayRenderRafHandle !== undefined[\s\S]*?requestAnimationFrame\(callback\)/.test(rendererSource),
    hoverOverlayDirectPathsCarryExplicitEventTypes:
      rendererSource.includes('renderHoverOverlayIfNeeded({ eventType: "facility-card-visibility" });')
      && rendererSource.includes('renderHoverOverlayIfNeeded({ eventType: "facility-card-open" });')
      && rendererSource.includes('renderHoverOverlayIfNeeded({ eventType: "facility-card-clear" });')
      && rendererSource.includes('renderHoverOverlayIfNeeded({ force: true, eventType: "zoom-start" });')
      && rendererSource.includes('renderHoverOverlayIfNeeded({ eventType: "mouseleave" });')
      && rendererSource.includes('renderHoverOverlayIfNeeded({ eventType: "facility-card-close" });'),
    hoverFacilityAndCityProbeMetricsRemainNamed:
      rendererSource.includes('recordInteractionDurationMetric("interactionHoverFacilityProbeDuration"')
      && rendererSource.includes('recordInteractionDurationMetric("interactionHoverCityProbeDuration"'),
    interactionCompositeUsesSingleMainPassCache:
      rendererSource.includes("const INTERACTION_COMPOSITE_PASS_NAMES = [")
      && rendererSource.includes('recordRenderPerfMetric("interactionCompositeBuild"')
      && rendererSource.includes('recordRenderPerfMetric("interactionCompositeContinuityReuse"')
      && renderCacheOwnerSource.includes("function getInteractionCompositeReuseDecision(")
      && renderCacheOwnerSource.includes('new Set(["selection-version-mismatch", "topology-revision-mismatch"])')
      && /function composeTransformedFrameToBuffer\([\s\S]*?useInteractionComposite = true[\s\S]*?allowInteractionCompositeContinuity = false[\s\S]*?drawInteractionComposite\(currentTransform, \{[\s\S]*?allowSelectionTopologyContinuity: allowInteractionCompositeContinuity[\s\S]*?composeRenderPassesToTarget\(bufferContext, INTERACTION_COMPOSITE_PASS_NAMES[\s\S]*?drawInteractionBorderSnapshot\(currentTransform\)/.test(rendererSource),
    continuityFrameSkipsBaseFillDuringInteraction:
      rendererSource.includes("const CONTINUITY_FRAME_MAX_STALE_AGE_MS = 1500;")
      && /function invalidateLastGoodFrame\(reason = "visual-invalidation"\) \{[\s\S]*?cache\.lastGoodFrame\.stale = true;[\s\S]*?recordRenderPerfMetric\("continuityFrameMarkedStale"/.test(rendererSource)
      && /if \(runtimeState\.renderPhase === RENDER_PHASE_INTERACTING && runtimeState\.firstVisibleFramePainted\) \{[\s\S]*?noteMissingVisibleFrameSkippedDuringInteraction\("missing-fast-frame-no-continuity"\);[\s\S]*?keptPreviousPixels = true;[\s\S]*?\} else \{[\s\S]*?drewFrame = drawBaseVisibleFrameFallback\("missing-fast-frame-no-continuity"\);/.test(rendererSource)
      && rendererSource.includes('recordRenderPerfMetric("continuityFrameStaleAgeMs"')
      && rendererSource.includes('recordRenderPerfMetric("missingVisibleFrameCount"')
      && rendererSource.includes('recordRenderPerfMetric("missingVisibleFrameSkippedDuringInteraction"')
      && /const staleSince = frame\.stale && Number\(frame\.invalidatedAt \|\| 0\) > 0[\s\S]*?Number\(frame\.invalidatedAt \|\| 0\)[\s\S]*?Number\(frame\.capturedAt \|\| 0\);[\s\S]*?const staleAgeMs = Math\.max\(0, Date\.now\(\) - staleSince\);/.test(rendererSource)
      && rendererSource.includes('return reject("topology-revision-mismatch")')
      && rendererSource.includes('return reject("stale-age-limit")')
      && rendererSource.includes('continuityFrameRelaxedReuse'),
    firstVisibleScenarioRequiresCurrentPoliticalExactFrame:
      /function getFirstVisiblePoliticalFrameBlockReason\(reason = "visible-frame"\) \{[\s\S]*?base-visible-fallback[\s\S]*?normalizedReason !== "exact-frame"[\s\S]*?dirty-political-pass[\s\S]*?stale-ocean-fill[\s\S]*?stale-political-signature[\s\S]*?stale-political-reference-transform[\s\S]*?stale-political-full-reference-transform/.test(rendererSource)
      && /function noteFirstVisibleFrameBlocked\(reason = "visible-frame", blockReason = "unknown"\) \{[\s\S]*?recordRenderPerfMetric\("firstVisibleFrameBlocked"[\s\S]*?topologyBundleMode:[\s\S]*?oceanFill: getOceanBaseFillColor\(\)/.test(rendererSource)
      && /function markFirstVisibleFramePainted\(reason = "visible-frame"\) \{[\s\S]*?const blockReason = getFirstVisiblePoliticalFrameBlockReason\(reason\);[\s\S]*?if \(blockReason\) \{[\s\S]*?noteFirstVisibleFrameBlocked\(reason, blockReason\);[\s\S]*?return;/.test(rendererSource)
      && /function markFirstVisibleFramePainted\(reason = "visible-frame"\) \{[\s\S]*?runtimeState\.firstVisibleFramePainted = true;[\s\S]*?recordRenderPerfMetric\("firstVisibleFramePainted"[\s\S]*?callRuntimeHook\(runtimeState, "noteFirstVisibleFramePaintedFn"/.test(rendererSource),
    oceanBackgroundInvalidationCoversPoliticalSignatureDependents:
      /function invalidateOceanBackgroundVisualState\(reason = "ocean-background"\) \{[\s\S]*?cancelExactAfterSettleRefresh\(\{ clearDefer: true \}\);[\s\S]*?invalidateRenderPasses\(\["background", "physicalBase", "political", "contextBase", "contextScenario"\], reason\);[\s\S]*?clearRenderPassReferenceTransforms\(\["background", "physicalBase", "political", "contextBase", "contextScenario"\]\);/.test(rendererSource)
      && /function getPoliticalPassStaticSignature[\s\S]*?`ocean-fill:\$\{getOceanBaseFillColor\(\)\}`/.test(rendererSource)
      && /if \(passName === "contextScenario"\) \{[\s\S]*?`ocean-fill:\$\{getOceanBaseFillColor\(\)\}`/.test(rendererSource),
    exactAfterSettleReschedulesWhenPhaseStillBusy:
      /function scheduleExactAfterSettleRefresh\(profile = runtimeState\.adaptiveSettleProfile \|\| getAdaptiveSettleProfile\(\)\) \{[\s\S]*?beginExactAfterSettleControllerSchedule\(scheduleStartedAt\);[\s\S]*?isExactAfterSettleGenerationCurrent\(generation, "scheduled"\)[\s\S]*?if \(!runtimeState\.deferExactAfterSettle\) \{[\s\S]*?resetExactAfterSettleController\("defer-cleared", generation\);[\s\S]*?if \(runtimeState\.renderPhase !== RENDER_PHASE_IDLE\) \{[\s\S]*?scheduleExactAfterSettleRefresh\(resolvedProfile\);[\s\S]*?return;[\s\S]*?\}/.test(rendererSource),
    exactAfterSettleUsesLocalController:
      rendererRuntimeStateSource.includes("exactAfterSettleController")
      && rendererRuntimeStateSource.includes("function createDefaultExactAfterSettleControllerState()")
      && rendererRuntimeStateSource.includes("function resetExactAfterSettleControllerState(")
      && rendererRuntimeStateSource.includes("function isExactAfterSettleGenerationCurrentState(")
      && /function getExactAfterSettleControllerState\(\) \{[\s\S]*?ensureExactAfterSettleControllerState\(runtimeState\);/.test(rendererSource)
      && /function applyScheduledExactAfterSettleRefreshPlan\(generation, plan\) \{[\s\S]*?phase: "applying"[\s\S]*?recordRenderPerfMetric\("settleExactRefreshApply"[\s\S]*?prepareExactAfterSettlePassesInSlices\(generation, plan\);/.test(rendererSource)
      && /function completeScheduledExactAfterSettleRefreshPlan\(generation, plan, passStartedAt\) \{[\s\S]*?phase: "awaiting-paint"[\s\S]*?recordRenderPerfMetric\("settleExactRefreshPasses"[\s\S]*?requestRendererRender\("exact-after-settle", \{[\s\S]*?flush: true/.test(rendererSource),
    exactAfterSettleFinalizesAfterExactCompose:
      /function drawCanvas\(\) \{[\s\S]*?drewExactFrame = composeCachedPasses\(RENDER_PASS_NAMES\);[\s\S]*?if \(drewExactFrame\) \{[\s\S]*?finalizePendingExactAfterSettleRefreshAfterPaint\(\);/.test(rendererSource)
      && /function finalizePendingExactAfterSettleRefreshAfterPaint\(\) \{[\s\S]*?isExactAfterSettleIdentityCurrent\(controller\)[\s\S]*?recordRenderPerfMetric\("settleExactRefreshWaitForPaint"[\s\S]*?finalizeExactAfterSettleRefreshPlan\(plan\);[\s\S]*?recordRenderPerfMetric\("settleExactRefreshFinalize"/.test(rendererSource)
      && /metricSequenceStartedAt: Math\.max\(0, Number\(runtimeState\.renderPerfMetricSequence \|\| 0\)\)/.test(rendererSource)
      && /function readRenderPerfMetricDuration\(metricName, minSequence = 0\) \{[\s\S]*?requiredMinSequence > 0[\s\S]*?entry\?\.sequence/.test(rendererSource)
      && /function recordSettleExactRefreshPhaseBreakdown\(plan, durationMs\) \{[\s\S]*?recordRenderPerfMetric\("settleExactRefreshPhaseBreakdown"[\s\S]*?applyMs: readRenderPerfMetricDuration\("settleExactRefreshApply"\)[\s\S]*?passesMs: readRenderPerfMetricDuration\("settleExactRefreshPasses"\)[\s\S]*?hitCanvasMs: readRenderPerfMetricDuration\("buildHitCanvas", metricSequenceStartedAt\)/.test(rendererSource)
      && /recordRenderPerfMetric\("settleExactRefreshFinalize"[\s\S]*?recordSettleExactRefreshPhaseBreakdown\(plan, Math\.max\(0, nowMs\(\) - Number\(plan\.startedAt \|\| finalizeStartedAt\)\)\);/.test(rendererSource)
      && !/applyScheduledExactAfterSettleRefreshPlan\(generation, plan\);[\s\S]{0,160}?finalizeExactAfterSettleRefreshPlan\(plan\);/.test(rendererSource),
    exactAfterSettleSuccessInvalidatesPoliticalPass:
      /function invalidateExactAfterSettlePoliticalPass\(plan\) \{[\s\S]*?invalidateRenderPasses\("political", "exact-after-settle-political"\);[\s\S]*?plan\.politicalInvalidationReason = "exact-after-settle-political";[\s\S]*?plan\.politicalInvalidatedAt = politicalInvalidatedAt;/.test(rendererSource)
      && /function prepareExactAfterSettlePassesInSlices\(generation, plan\) \{[\s\S]*?if \(runtimeState\.renderPhase !== RENDER_PHASE_IDLE\) \{[\s\S]*?resetExactAfterSettleController\(`\$\{passName\}-phase-interrupted`, generation\);[\s\S]*?return;[\s\S]*?if \(!isExactAfterSettleIdentityCurrent\(activeController\)\) \{[\s\S]*?resetExactAfterSettleController\(`\$\{passName\}-identity-mismatch`, generation\);[\s\S]*?return;[\s\S]*?if \(passName === "political"\) \{[\s\S]*?invalidateExactAfterSettlePoliticalPass\(plan\);[\s\S]*?getRenderPipelinePassesOwner\(\)\.prepareIdleRenderPassDefinition\(passName, drawFn, transform, timings, cache\);/.test(rendererSource)
      && /function applyExactAfterSettleRefreshPlan\(plan\) \{[\s\S]*?const exactAfterSettleDprPasses = RENDER_PASS_NAMES\.filter\(\(passName\) => passName !== "political"\);[\s\S]*?reason: "exact-after-settle-dpr-restore",[\s\S]*?targetPassesOnDprChange: exactAfterSettleDprPasses,[\s\S]*?targetPassesOnResize: exactAfterSettleDprPasses,[\s\S]*?targetPassesOnCanvasResize: exactAfterSettleDprPasses,[\s\S]*?const targetPassNames = new Set\(\["political", "borders", "labels", "textureLabels"\]\);/.test(rendererSource)
      && !/function applyExactAfterSettleRefreshPlan\(plan\) \{[\s\S]*?exact-after-settle-dpr-restore[\s\S]*?targetPassesOnDprChange: \["political", "contextBase", "borders"\]/.test(rendererSource)
      && !/function applyExactAfterSettleRefreshPlan\(plan\) \{[\s\S]*?invalidateRenderPasses\("political", "exact-after-settle-political"\);[\s\S]*?const targetPassNames = new Set\(\["political", "borders", "labels", "textureLabels"\]\);/.test(rendererSource)
      && /recordRenderPerfMetric\("settleExactRefreshPasses"[\s\S]*?politicalInvalidationReason: String\(plan\.politicalInvalidationReason \|\| ""\),[\s\S]*?politicalInvalidatedAt: Number\(plan\.politicalInvalidatedAt \|\| 0\),/.test(rendererSource),
    exactAfterSettleAbortsAwaitingPaintAfterExactComposeFailure:
      /function abortPendingExactAfterSettleRefreshAfterPaint\(reason = "exact-compose-failed"\) \{[\s\S]*?String\(controller\.phase \|\| ""\) !== "awaiting-paint"[\s\S]*?recordRenderPerfMetric\("settleExactRefreshAbortAfterPaintFailure"[\s\S]*?resetExactAfterSettleController\(`abort-\$\{reason\}`, generation\);/.test(rendererSource)
      && /function abortPendingExactAfterSettleRefreshAfterPaint\(reason = "exact-compose-failed"\) \{[\s\S]*?resetExactAfterSettleController\(`abort-\$\{reason\}`, generation\);[\s\S]*?runtimeState\.deferExactAfterSettle = false;[\s\S]*?runtimeState\.pendingExactPoliticalFastFrame = false;[\s\S]*?invalidateRenderPasses\("political", "exact-after-settle-abort"\);[\s\S]*?requestRendererRender\("exact-after-settle-abort-recover", \{[\s\S]*?flush: false,[\s\S]*?if \(context\) render\(\);/.test(rendererSource)
      && /if \(!useTransformedFrame \|\| !drewFrame\) \{[\s\S]*?drewExactFrame = composeCachedPasses\(RENDER_PASS_NAMES\);[\s\S]*?if \(!drewExactFrame\) \{[\s\S]*?abortPendingExactAfterSettleRefreshAfterPaint\("compose-cached-passes-failed"\);[\s\S]*?\}/.test(rendererSource)
      && /function isInteractionRecoveryBlocked\(\) \{[\s\S]*?isExactAfterSettleControllerActive\(\)/.test(rendererSource),
    exactComposeFailureReportsControllerAndMissingPassContext:
      /function composeCachedPasses\(passNames, currentTransform = runtimeState\.zoomTransform \|\| globalThis\.d3\.zoomIdentity\) \{[\s\S]*?recordRenderPerfMetric\("compositeBufferMissingPass", 0, \{[\s\S]*?missingPassNames:[\s\S]*?controllerPhase:[\s\S]*?deferExactAfterSettle:[\s\S]*?\}\);/.test(rendererSource)
      && /function composeRenderPassesToTarget\([\s\S]*?const missingCanvasPassNames = \[\];[\s\S]*?const missingReferenceTransformPassNames = \[\];[\s\S]*?reason: "missing-pass-canvas"[\s\S]*?missingPassNames: missingCanvasPassNames[\s\S]*?reason: "missing-reference-transform"[\s\S]*?missingPassNames: missingReferenceTransformPassNames/.test(rendererSource),
    interactionRecoveryDoesNotSelfBlockPostReadyTask:
      interactionRecoveryBlockedBody.includes("runtimeState.renderPhase !== RENDER_PHASE_IDLE")
      && interactionRecoveryBlockedBody.includes("runtimeState.isInteracting")
      && interactionRecoveryBlockedBody.includes("isExactAfterSettleControllerActive()")
      && interactionRecoveryBlockedBody.includes("activeInteractionRecoveryTaskKey")
      && !interactionRecoveryBlockedBody.includes("activePostReadyTaskKey"),
    interactionRecoveryMetricsNameTaskAndWindow:
      /function recordInteractionRecoveryTaskMetric\(taskKey, durationMs, details = \{\}, \{ benchmarkInteraction = true \} = \{\}\) \{[\s\S]*?taskMetricName = benchmarkInteraction \? "interactionRecoveryTaskMs"[\s\S]*?windowMetricName = benchmarkInteraction \? "interactionRecoveryWindowMs"/.test(rendererSource)
      && /const taskKey = "scenario-chunk-promotion-infra";[\s\S]*?recordInteractionRecoveryTaskMetric\(taskKey,/.test(rendererSource)
      && /const taskKey = "secondary-spatial-index";[\s\S]*?recordInteractionRecoveryTaskMetric\(taskKey,/.test(rendererSource)
      && /const taskKey = "deferred-heavy-border-meshes";[\s\S]*?recordInteractionRecoveryTaskMetric\(taskKey,/.test(rendererSource),
    hoverStrictHitUsesFirstContainingFastPath:
      /function findFirstContainingCandidate\([\s\S]*?eventType = "hover",[\s\S]*?targetType = "unknown",[\s\S]*?fastPath: "hover-first-containing"/.test(interactionHitCandidateSource)
      && /function findFirstContainingCandidate\(candidates, lonLat,[\s\S]*?findFirstContainingHitCandidate\(candidates, lonLat,[\s\S]*?recordInteractionDurationMetric,/.test(rendererSource)
      && /eventType === "hover" && !enableSnap[\s\S]*?findFirstContainingCandidate\(strictCandidates, pointer\.lonLat, \{ eventType, targetType: "land" \}\)/.test(rendererSource),
    exactAfterSettleRefreshLeavesContextScenarioOutsidePhysicalRefreshPasses:
      /function getPhysicalExactRefreshPasses\(\) \{[\s\S]*?\["physicalBase", "political", "contextBase", "borders"\][\s\S]*?\["political", "contextBase", "borders"\][\s\S]*?return passes;[\s\S]*?\}/.test(rendererSource)
      && /function applyExactAfterSettleRefreshPlan[\s\S]*?invalidateRenderPasses\(\["physicalBase", "contextBase"\], "physical-visible-exact"\);[\s\S]*?invalidateRenderPasses\(getPhysicalExactRefreshPasses\(\), reuseDecision\.reason \|\| "context-base-exact"\);/.test(rendererSource),
    colorRefreshUsesPartialPoliticalInvalidation:
      /function refreshResolvedColorsForFeatures[\s\S]*?const pendingRenderIds = new Set\(\);[\s\S]*?normalizePoliticalColorEditIds\(cache\.pendingPoliticalColorEditIds\)[\s\S]*?pendingRenderIds\.add\(pendingId\);[\s\S]*?cache\.partialPoliticalDirtyIds\.add\(id\);[\s\S]*?pendingRenderIds\.add\(id\);[\s\S]*?bumpColorRevision\(state\);[\s\S]*?markPendingPoliticalColorEdit\(Array\.from\(pendingRenderIds\)\)[\s\S]*?clearPendingPoliticalColorEdit\(\{ force: true \}\);[\s\S]*?invalidateRenderPasses\("political", "refresh-colors"\);/.test(rendererSource)
      && rendererSource.includes('invalidateRenderPasses(["contextMarkers", "labels"], "refresh-colors-collateral");')
      && rendererSource.includes('invalidateRenderPasses("contextBase", "refresh-colors-context-base");')
      && /function markPendingPoliticalColorEdit\(featureIds,[\s\S]*?cache\.pendingPoliticalColorEditIds = new Set\(ids\);[\s\S]*?cache\.pendingPoliticalColorEditRevision = Number\(runtimeState\.colorRevision \|\| 0\);/.test(rendererSource)
      && rendererSource.includes('cache.pendingPoliticalColorEditScenarioId = String(runtimeState.activeScenarioId || "");')
      && /function hasPendingPoliticalColorEdit\(\) \{[\s\S]*?pendingIds instanceof Set[\s\S]*?Number\(cache\.pendingPoliticalColorEditRevision \?\? -1\) === Number\(runtimeState\.colorRevision \|\| 0\)/.test(rendererSource)
      && /function clearPendingPoliticalColorEdit\(\{ renderedCount = 0, renderedIds = null, force = false \} = \{\}\) \{[\s\S]*?const hasRenderedIdScope = renderedIds !== null && renderedIds !== undefined;[\s\S]*?renderedIdList\.forEach\(\(id\) => pendingIds\.delete\(id\)\);[\s\S]*?if \(pendingIds\.size > 0\) return false;/.test(rendererSource)
      && /function shouldRefreshContextBaseContoursForColorChanges\(\) \{[\s\S]*?runtimeState\.showPhysical[\s\S]*?physicalContourMajorData/.test(rendererSource)
      && /if \(passName === "contextBase"\) \{[\s\S]*?`context-colors:\$\{shouldRefreshContextBaseForColorChanges\(\) \? Number\(runtimeState\.colorRevision \|\| 0\) : 0\}`/.test(rendererSource)
      && !contextScenarioSignatureBranch.includes("`colors:${Number(runtimeState.colorRevision || 0)}`")
      && /if \(passName === "labels"\) \{[\s\S]*?`colors:\$\{Number\(runtimeState\.colorRevision \|\| 0\)\}`/.test(rendererSource),
    partialPoliticalRepaintOnlyAcceptsTargetedRefreshColors:
      /function tryPartialPoliticalPassRepaint\(transform, nextSignature, timings\) \{[\s\S]*?String\(cache\.reasons\?\.political \|\| ""\) !== "refresh-colors"[\s\S]*?return fallback\("non-color-invalidation"\);/.test(rendererSource)
      && !rendererSource.includes('["refresh-colors", "rebuild-colors"].includes(String(cache.reasons?.political || ""))')
      && !rendererSource.includes('!["refresh-colors", "rebuild-colors"].includes(String(reason || "unspecified"))'),
    politicalPathCachePreservesTargetedColorAndDeferredFullCacheReady:
      /const POLITICAL_PATH_CACHE_PRESERVING_INVALIDATION_REASONS = new Set\(\[[\s\S]*?"refresh-colors"[\s\S]*?"progressive-political-full-cache-ready"[\s\S]*?\]\);/.test(rendererSource)
      && /targetPassNames\.includes\("political"\)[\s\S]*?!POLITICAL_PATH_CACHE_PRESERVING_INVALIDATION_REASONS\.has\(String\(reason \|\| "unspecified"\)\)[\s\S]*?cache\.partialPoliticalDirtyIds\.clear\(\);[\s\S]*?cancelScenarioPoliticalBackgroundDeferredFullCache/.test(rendererSource)
      && !/targetPassNames\.includes\("political"\)[\s\S]*?pendingPoliticalColorEditIds\.clear\(\)/.test(rendererSource)
      && /function rebuildResolvedColors\(\) \{[\s\S]*?const previousColorRevision = Number\(runtimeState\.colorRevision \|\| 0\);[\s\S]*?bumpColorRevision\(state\);[\s\S]*?retargetPendingPoliticalColorEditRevisionAfterColorRebuild\(previousColorRevision\);[\s\S]*?invalidateRenderPasses\(\["physicalBase", "political", "contextBase"\], "rebuild-colors"\);/.test(rendererSource)
      && /function retargetPendingPoliticalColorEditRevisionAfterColorRebuild\(previousColorRevision\) \{[\s\S]*?pendingScenarioId && pendingScenarioId !== activeScenarioId[\s\S]*?clearPendingPoliticalColorEdit\(\{ force: true \}\);[\s\S]*?cache\.pendingPoliticalColorEditRevision = currentRevision;/.test(rendererSource)
      && /function setMapData\([\s\S]*?const renderPassCache = getRenderPassCacheState\(\);[\s\S]*?clearPendingPoliticalColorEdit\(\{ force: true \}\);[\s\S]*?renderPassCache\.referenceTransform = null;/.test(rendererSource),
    politicalFullReferenceOnlyWrittenByFullPass:
      (() => {
        const body = rendererSource.match(/function renderPassToCache\(passName, drawFn, transform, timings\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction /)?.[0] || "";
        return body.includes("setPassReferenceTransform(passName, referenceTransform);")
          && /if \(passName === "political"\) \{[\s\S]*?setPassFullReferenceTransform\(passName, transform\);[\s\S]*?\}/.test(body)
          && (body.match(/setPassFullReferenceTransform\(/g) || []).length === 1
          && !/if \(passName !== "political"\)[\s\S]*?setPassFullReferenceTransform/.test(body);
      })(),
    politicalPartialRequiresFullReferenceBaseline:
      /function tryPartialPoliticalPassRepaint\(transform, nextSignature, timings\) \{[\s\S]*?hasPassFullReferenceTransform\("political"\)[\s\S]*?fallback\("missing-full-reference-transform"\)[\s\S]*?getPassFullReferenceTransform\("political"\)[\s\S]*?fallback\("full-reference-transform-mismatch"\)/.test(rendererSource),
    politicalPartialNeverMutatesFullReferenceBaseline:
      [
        "function tryPartialPoliticalPassRepaint(transform, nextSignature, timings)",
        'setPassReferenceTransform("political", transform);',
        "setPassFullReferenceTransform(passName, transform);",
        'if (passName === "political")',
      ].every((snippet) => rendererSource.includes(snippet))
      && !rendererSource.includes('setPassFullReferenceTransform("political"'),
    canvasResizeClearsFullReferenceBaseline:
      [
        "targetPassesOnDprChange = null",
        "targetPassesOnResize = null",
        "targetPassesOnCanvasResize = null",
        "const resizeInvalidationPasses = Array.isArray(targetPassesOnResize) && targetPassesOnResize.length",
        "const dprInvalidationPasses = Array.isArray(targetPassesOnDprChange) && targetPassesOnDprChange.length",
        "const invalidationPasses = sizeChanged ? resizeInvalidationPasses : dprInvalidationPasses;",
        "const canvasResizePasses = Array.isArray(targetPassesOnCanvasResize) && targetPassesOnCanvasResize.length",
        "resizeRenderPassCanvases(canvasResizePasses);",
        "invalidateRenderPasses(resizeInvalidationPasses, reason || \"resize\");",
        "clearRenderPassReferenceTransforms(resizeInvalidationPasses);",
        "invalidateRenderPasses(dprInvalidationPasses, reason || \"dpr-change\");",
        "clearRenderPassReferenceTransforms(dprInvalidationPasses);",
      ].every((snippet) => rendererSource.includes(snippet))
      && /function ensureRenderPassCanvas\(passName\) \{[\s\S]*?resizeRenderPassCanvases\(\[passName\]\);[\s\S]*?return cache\.canvases\[passName\];/.test(renderCacheOwnerSource),
    firstBatchInteractionWritesUseRafRenderBoundary:
      /function requestInteractionRender\(reason = "interaction"\) \{[\s\S]*?requestRendererRender\(reason,[\s\S]*?flush: false/.test(rendererSource)
      && !scenarioOwnershipEditorSource.includes("flushRenderBoundary")
      && /function requestScenarioOwnershipRender\(reason = "scenario-ownership"\) \{[\s\S]*?requestInteractionRender\(reason\);/.test(scenarioOwnershipEditorSource)
      && scenarioOwnershipEditorSource.includes('requestScenarioOwnershipRender("scenario-ownership-apply-owner");')
      && scenarioOwnershipEditorSource.includes('requestScenarioOwnershipRender("scenario-ownership-reset-baseline");')
      && scenarioOwnershipEditorSource.includes('requestScenarioOwnershipRender("scenario-ownership-apply-owner-controller");')
      && /function handleBrushPointerMove[\s\S]*?requestInteractionRender\("brush-preview"\);/.test(rendererSource)
      && /function addFeatureToDevSelection[\s\S]*?requestInteractionRender\("dev-selection-add"\);/.test(rendererSource)
      && /function toggleFeatureInDevSelection[\s\S]*?requestInteractionRender\("dev-selection-toggle"\);/.test(rendererSource)
      && /function setDevSelectionDirty\(\)[\s\S]*?runtimeState\.refreshCountryListRowsFn\(\{[\s\S]*?refreshInspector: true,[\s\S]*?refreshPresetTree: true,[\s\S]*?\}\);/.test(rendererSource)
      && /function syncInspectorCountryToLandSelection[\s\S]*?runtimeState\.selectedInspectorCountryCode = nextCode;[\s\S]*?refreshPresetTree: true/.test(rendererSource)
      && /if \(event\?\.ctrlKey \|\| event\?\.metaKey\) \{[\s\S]*?toggleFeatureInDevSelection\(landId\);[\s\S]*?syncInspectorCountryToLandSelection\(feature, landId, landHit\);/.test(rendererSource)
      && !rendererSource.includes("runtimeState.devSelectionModeEnabled && (event?.ctrlKey || event?.metaKey)")
      && /function removeLastDevSelection[\s\S]*?requestInteractionRender\("dev-selection-remove-last"\);/.test(rendererSource)
      && /function clearDevSelection[\s\S]*?requestInteractionRender\("dev-selection-clear"\);/.test(rendererSource)
      && /function applyVisualSubdivisionFill[\s\S]*?requestInteractionRender\(kind\);[\s\S]*?refreshSidebarAfterPaint\(\{ featureIds: resolvedIds \}\);/.test(rendererSource)
      && /function applyWaterRegionFill[\s\S]*?requestInteractionRender\(kind\);[\s\S]*?refreshSidebarAfterPaint\(\{ waterRegionIds: \[resolvedId\] \}\);/.test(rendererSource)
      && /function applyWaterRegionFill[\s\S]*?if \(currentColor === color\) \{[\s\S]*?refreshWaterRegionSidebarRowsNow\(\[resolvedId\]\);[\s\S]*?requestInteractionRender\(kind\);[\s\S]*?return false;/.test(rendererSource)
      && !rendererSource.includes('flushInteractionRender("dev-selection-add")')
      && !rendererSource.includes('flushInteractionRender("dev-selection-toggle")')
      && !rendererSource.includes('flushInteractionRender("dev-selection-remove-last")')
      && !rendererSource.includes('flushInteractionRender("dev-selection-clear")')
      && !rendererSource.includes('flushInteractionRender("click-fill")')
      && !rendererSource.includes('flushInteractionRender("click-erase")')
      && !rendererSource.includes('flushInteractionRender(kind);'),
    exactAfterSettleDefersContextPassesAfterCriticalPaint:
      rendererSource.includes("const EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES = new Set")
      && rendererSource.includes("const DEFERRED_EXACT_CONTEXT_REFRESH_DELAY_MS = 3600;")
      && rendererSource.includes('"contextBase",')
      && rendererSource.includes('"contextScenario",')
      && (() => {
        const deferredPassSet = rendererSource.match(/const EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES = new Set\(\[[\s\S]*?\]\);/)?.[0] || "";
        return !deferredPassSet.includes('"background"') && !deferredPassSet.includes('"physicalBase"');
      })()
      && /function shouldDeferExactAfterSettlePassForCriticalPaint\(passName, cache = getRenderPassCacheState\(\)\) \{[\s\S]*?String\(controller\.phase \|\| ""\) !== "awaiting-paint"[\s\S]*?getPassReferenceTransform\(passName\)/.test(renderPipelinePassesSource)
      && /function prepareIdleRenderPassDefinition[\s\S]*?shouldDeferExactAfterSettlePassForCriticalPaint\(passName, cache\)[\s\S]*?recordRenderPerfMetric\("settleExactRefreshDeferredPass"/.test(renderPipelinePassesSource)
      && /function applyExactAfterSettleRefreshPlan[\s\S]*?plan\.deferredExactTargetPasses[\s\S]*?EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES\.has\(passName\)[\s\S]*?plan\.exactTargetPasses[\s\S]*?!EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES\.has\(passName\)/.test(rendererSource)
      && /function scheduleDeferredExactContextRefresh\(plan = \{\}\)[\s\S]*?prepareDeferredExactContextPassesInSlices[\s\S]*?recordRenderPerfMetric\("deferredExactContextRefreshScheduled"/.test(rendererSource)
      && rendererSource.includes("let deferredExactContextRefreshVersion = 0;")
      && rendererSource.includes("const deferredExactContextRefreshTaskHandles = new Set();")
      && /function cancelDeferredExactContextRefresh\(\) \{[\s\S]*?deferredExactContextRefreshVersion \+= 1;[\s\S]*?deferredExactContextRefreshTaskHandles\.forEach[\s\S]*?handle\.cancel\(\);[\s\S]*?deferredExactContextRefreshTaskHandles\.clear\(\);/.test(rendererSource)
      && /function isDeferredExactContextRefreshCurrent\(refreshVersion, plan = \{\}\) \{[\s\S]*?deferredExactContextRefreshVersion[\s\S]*?isExactAfterSettleIdentityCurrent\(identity\)/.test(rendererSource)
      && /function prepareDeferredExactContextPassesInSlices\(passNames, plan = \{\}, refreshVersion = deferredExactContextRefreshVersion\) \{[\s\S]*?!isDeferredExactContextRefreshCurrent\(refreshVersion, plan\)[\s\S]*?deferredExactContextRefreshTaskHandles\.delete\(taskHandle\)[\s\S]*?getRenderPipelinePassesOwner\(\)\.prepareIdleRenderPassDefinition\(passName, drawFn, transform, timings, cache\)/.test(rendererSource)
      && /function scheduleDeferredExactContextRefresh\(plan = \{\}\) \{[\s\S]*?const refreshVersion = Number\(deferredExactContextRefreshVersion \|\| 0\);[\s\S]*?plan\.deferredExactContextIdentity = getExactAfterSettleIdentity\(\);[\s\S]*?!isDeferredExactContextRefreshCurrent\(refreshVersion, plan\)[\s\S]*?prepareDeferredExactContextPassesInSlices\(targetPasses, plan, refreshVersion\)[\s\S]*?timeout: DEFERRED_EXACT_CONTEXT_REFRESH_DELAY_MS/.test(rendererSource),
    exactAfterSettleUsesFrameScheduler:
      frameSchedulerSource.includes("export function enqueueFrameTask")
      && /import \{ enqueueFrameTask(?:, getFrameSchedulerQueueLength)? \} from "\.\/frame_scheduler\.js";/.test(rendererSource)
      && /function enqueueExactAfterSettleSegment\(generation, label, task\) \{[\s\S]*?enqueueFrameTask/.test(rendererSource)
      && /scheduleExactAfterSettleRefresh[\s\S]*?enqueueExactAfterSettleSegment\(generation, "Prepare"[\s\S]*?enqueueExactAfterSettleSegment\(generation, "Apply"/.test(rendererSource),
    exactAfterSettleWaitsForRefreshStartedChunkWork:
      /const promotionWorkActive = \[[\s\S]*?"promotion-scheduled",[\s\S]*?"refresh-started",[\s\S]*?\]\.includes\(String\(pendingChunkRefreshStatus \|\| ""\)\);/.test(rendererSource),
    frameSchedulerQueueMetricsReportedPerPriority:
      frameSchedulerSource.includes("HIGH_PRIORITY_MIN_PER_DRAIN = 1")
      && frameSchedulerSource.includes("byLabelGeneration = false")
      && frameSchedulerSource.includes("labelGenerationKey")
      && /export function getFrameSchedulerQueueLength\(\{ byPriority = false, byLabelGeneration = false \} = \{\}\) \{[\s\S]*?high:[\s\S]*?normal:[\s\S]*?low:[\s\S]*?total:/.test(frameSchedulerSource)
      && /function render\(\) \{[\s\S]*?getFrameSchedulerQueueLength\(\{ byPriority: true, byLabelGeneration: true \}\);[\s\S]*?recordRenderPerfMetric\("frameSchedulerQueueDepth", 0, frameSchedulerQueue\);/.test(rendererSource),
    deferredUiYieldPrefersSchedulerYield:
      /async function yieldToMain\(\) \{[\s\S]*?typeof globalThis\.scheduler\?\.yield === "function"[\s\S]*?await globalThis\.scheduler\.yield\(\);[\s\S]*?globalThis\.setTimeout\(resolve, 0\);/.test(mainSource),
    exactAfterSettleDedupesByGeneration:
      /function enqueueExactAfterSettleSegment\(generation, label, task\) \{[\s\S]*?generation,[\s\S]*?dedupe: true,[\s\S]*?deferOnContinuousInput: false/.test(rendererSource)
      && /label: `exact-after-settle-pass-\$\{passName\}`,[\s\S]*?generation,[\s\S]*?dedupe: true,[\s\S]*?deferOnContinuousInput: false/.test(rendererSource)
      && /priority: "high",[\s\S]*?label: `deferred-exact-context-pass-\$\{passName\}`,[\s\S]*?generation: Number\(plan\.controllerGeneration \|\| 0\),[\s\S]*?dedupe: true,[\s\S]*?deferOnContinuousInput: false/.test(rendererSource),
    buildHitCanvasReportsVisibleAndGridCandidateCounts:
      rendererSource.includes("lastHitCanvasBuildStats")
      && rendererSource.includes("HIT_CANVAS_VIEWPORT_OVERSCAN_PX")
      && /const visibleSpatialItemsResult = collectVisibleLandSpatialItemsWithStats\(\{[\s\S]*?overscanPx: HIT_CANVAS_VIEWPORT_OVERSCAN_PX,[\s\S]*?\}\);/.test(rendererSource)
      && rendererSource.includes("visibleItemCount")
      && spatialQueryIndexSource.includes("cellCandidateCount")
      && spatialQueryIndexSource.includes("globalCandidateCount")
      && rendererSource.includes("globalCount")
      && spatialQueryIndexSource.includes("cellSpan"),
    dirtyHitCanvasUsesPointProbeBeforeDeferredFullBuild:
      /function getDirtyHitCanvasPointProbeHit\(event\) \{[\s\S]*?collectGridCandidates\(projectedX, projectedY, 0\)[\s\S]*?hitContext\.rect\(px - 1, py - 1, 3, 3\);[\s\S]*?hitContext\.clip\(\);[\s\S]*?recordRenderPerfMetric\("hitCanvasPointProbe"[\s\S]*?recordRenderPerfMetric\("hitCanvasViewportProfile"[\s\S]*?profile: "point-probe"/.test(rendererSource)
      && /function getValidatedCanvasHit\(event, strictIds = null, \{ forceBuild = false \} = \{\}\) \{[\s\S]*?if \(isHitCanvasCurrent\(\)\) \{[\s\S]*?getHitResultFromCanvas\(event\)[\s\S]*?\} else \{[\s\S]*?scheduleHitCanvasBuildIfNeeded\(\{ reason: forceBuild \? "dirty-point-probe-click" : "dirty-point-probe-hover" \}\);[\s\S]*?getDirtyHitCanvasPointProbeHit\(event\);/.test(rendererSource),
    startupHitCanvasFullBuildIsDeferred:
      /function recordDeferredFullHitCanvasMetric\(\{ reason = "deferred-full", keepReady = false \} = \{\}\) \{[\s\S]*?mode: "deferred-full"[\s\S]*?reason,[\s\S]*?recordRenderPerfMetric\("hitCanvasViewportProfile"[\s\S]*?profile: "deferred-full"/.test(rendererSource)
      && /async function buildHitCanvasAfterStartup\(\{ keepReady = false, reason = "startup-deferred-hit-canvas" \} = \{\}\) \{[\s\S]*?recordDeferredFullHitCanvasMetric\(\{[\s\S]*?reason,[\s\S]*?keepReady[\s\S]*?\}\);[\s\S]*?setInteractionInfrastructureState\("hit-canvas-deferred"/.test(rendererSource)
      && !/async function buildHitCanvasAfterStartup\(\{[\s\S]*?ensureHitCanvasUpToDate\(\{ force: true \}\);[\s\S]*?\n\}/.test(rendererSource),
    stagedHitCanvasWarmupDefersFullBuild:
      /function scheduleStagedHitCanvasWarmup\(startedAt, token\) \{[\s\S]*?recordDeferredFullHitCanvasMetric\(\{[\s\S]*?reason: "staged-hit-canvas-warmup"[\s\S]*?recordRenderPerfMetric\("setMapDataHitCanvasReady"/.test(rendererSource)
      && !/function scheduleStagedHitCanvasWarmup\(startedAt, token\) \{[\s\S]*?ensureHitCanvasUpToDate\(\{ force: true \}\);/.test(rendererSource),
    buildHitCanvasMetricsSeparateDeferredForcedAndPointProbe:
      /drawHitCanvasWithMetric\(\{[\s\S]*?mode: "deferred",[\s\S]*?reason,/.test(rendererSource)
      && /drawHitCanvasWithMetric\(\{[\s\S]*?mode: "forced",[\s\S]*?reason: "strict-validation"/.test(rendererSource)
      && /recordDeferredFullHitCanvasMetric\(\{[\s\S]*?mode: "deferred-full"[\s\S]*?profile: "deferred-full"/.test(rendererSource)
      && /recordRenderPerfMetric\("hitCanvasPointProbe"[\s\S]*?recordRenderPerfMetric\("hitCanvasViewportProfile"[\s\S]*?profile: "point-probe"/.test(rendererSource),
    hitCanvasPixelReadsUseFiniteDpr:
      /function getHitResultFromCanvas\(event\) \{[\s\S]*?const dpr = Number\.isFinite\(Number\(runtimeState\.dpr\)\) && Number\(runtimeState\.dpr\) > 0[\s\S]*?Math\.round\(sx \* dpr\)[\s\S]*?Math\.round\(sy \* dpr\)/.test(rendererSource)
      && /function getDirtyHitCanvasPointProbeHit\(event\) \{[\s\S]*?const dpr = Number\.isFinite\(Number\(runtimeState\.dpr\)\) && Number\(runtimeState\.dpr\) > 0[\s\S]*?Math\.round\(sx \* dpr\)[\s\S]*?hitContext\.setTransform\(dpr, 0, 0, dpr, 0, 0\);/.test(rendererSource),
    chunkPromotionReportsPrimaryAndDeferredStageMetrics:
      rendererSource.includes('recordRenderPerfMetric("chunkPromotionPrimaryRefreshMs"')
      && rendererSource.includes('recordRenderPerfMetric("chunkPromotionDeferredInfraMs"')
      && rendererSource.includes("promotedVisibleFeatureCount")
      && rendererSource.includes("promotedTotalFeatureCount")
      && /function buildScenarioChunkPromotionVisualMetricDetails\(\{[\s\S]*?selectedByteCountSum[\s\S]*?selectedEstimatedPathCostSum/.test(chunkPromotionHelperSource)
      && /const promotionMetricDetails = buildScenarioChunkPromotionVisualMetricDetails\(\{[\s\S]*?recordRenderPerfMetric\("scenarioChunkPromotionVisualStage", visualDurationMs, \{[\s\S]*?\.\.\.promotionMetricDetails/.test(rendererSource)
      && /recordScenarioRenderMetric\("politicalChunkPromotionMs"[\s\S]*?promotedVisibleFeatureCount:[\s\S]*?promotedTotalFeatureCount:[\s\S]*?primaryVisibleFeatureCount:[\s\S]*?primaryTotalFeatureCount:/.test(chunkRuntimeSource)
      && /function buildInitialScenarioChunkVisualPromotionResult[\s\S]*?scenarioPoliticalVisibleFeatureCount[\s\S]*?promotedVisibleFeatureCount: scenarioPoliticalVisibleFeatureCount,[\s\S]*?promotedTotalFeatureCount: scenarioPoliticalChunkFeatureCount/.test(chunkRuntimeSource)
      && /const ready = !!\([\s\S]*?scenarioPoliticalChunkFeatureCount > 0[\s\S]*?landFeatureCount > 0[\s\S]*?colorCount > 0/.test(chunkRuntimeSource)
      && /allowStartupInitialVisual = false,[\s\S]*?shouldForceStartupInitialVisualRefresh = !!allowStartupInitialVisual[\s\S]*?getFeatureCount\(runtimeState\.landData\) <= 0[\s\S]*?getColorCount\(\) <= 0[\s\S]*?forceRefresh: !!pendingPromotion\.primaryVisibleFeatureSubsetChanged \|\| shouldForceStartupInitialVisualRefresh/.test(chunkRuntimeSource)
      && /loadState\.pendingVisualPromotion = \{[\s\S]*?selectedFeatureCountSum:[\s\S]*?selectedByteCountSum:[\s\S]*?selectedEstimatedPathCostSum:/.test(chunkRuntimeSource)
      && /loadState\.pendingPromotion = \{[\s\S]*?requiredPoliticalChunkCount:[\s\S]*?selectedFeatureCountSum:[\s\S]*?selectedByteCountSum:[\s\S]*?selectedEstimatedPathCostSum:/.test(chunkRuntimeSource),
    deferredInfraSkipsFullPoliticalRestoreWhenCompleteLandDataAlreadyOwnsRender:
      /const completePoliticalFeatureCount = Array\.isArray\(runtimeState\.scenarioPoliticalChunkData\?\.features\)[\s\S]*?runtimeState\.scenarioPoliticalChunkData\.features\.length/.test(rendererSource)
      && /const renderedLandFeatureCount = Array\.isArray\(runtimeState\.landData\?\.features\)[\s\S]*?runtimeState\.landData\.features\.length/.test(rendererSource)
      && /const shouldRestoreFullPoliticalDerivedState = \([\s\S]*?!primaryDerivedStateReady[\s\S]*?completePoliticalFeatureCount > 0[\s\S]*?renderedLandFeatureCount < completePoliticalFeatureCount[\s\S]*?\);/.test(rendererSource)
      && /if \(shouldRestoreFullPoliticalDerivedState\) \{[\s\S]*?rebuildPoliticalLandCollections\(\);[\s\S]*?rebuildRuntimeDerivedState\(\{[\s\S]*?includeRuntimePoliticalMeta: true,[\s\S]*?includeSecondarySpatial: false,[\s\S]*?\}\);/.test(rendererSource)
      && /restoredFullPoliticalChunkData = shouldRestoreFullPoliticalDerivedState;/.test(rendererSource),
    exactAfterSettleDefersPoliticalFastExact:
      /function drawTransformedFrameFromCaches[\s\S]*?settlePoliticalFastExactSkipped[\s\S]*?defer-to-sliced-exact-refresh/.test(rendererSource)
      && !/function drawTransformedFrameFromCaches[\s\S]*?renderPassToCache\("political", \(k\) => drawPoliticalPass\(k\)/.test(rendererSource),
    transformReusablePassSignaturesUseStableViewportKey:
      rendererSource.includes("const VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES = new Set")
      && /const VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES = new Set\(\[[\s\S]*?"contextBase",[\s\S]*?\]\);/.test(rendererSource)
      && (() => {
        const stableSignatureSet = rendererSource.match(/const VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES = new Set\(\[[\s\S]*?\]\);/)?.[0] || "";
        return [
          '"background"',
          '"physicalBase"',
          '"contextScenario"',
          '"effects"',
          '"lineEffects"',
          '"contextMarkers"',
          '"dayNight"',
        ].every((passName) => !stableSignatureSet.includes(passName));
      })()
      && /function getRenderPassTransformSignature[\s\S]*?VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES\.has\(passName\)[\s\S]*?shouldEnableContextBaseTransformReuse\(\)[\s\S]*?"transform-reuse"[\s\S]*?getViewportRenderSignature\(\)/.test(rendererSource)
      && /if \(passName === "contextScenario"\) \{[\s\S]*?transformSignature,[\s\S]*?`scenario-overlays:\$\{getScenarioOverlaySignatureToken\(\)\}`/.test(rendererSource)
      && /function getRenderPassSignature[\s\S]*?const transformSignature = getRenderPassTransformSignature\(passName, transform\);/.test(rendererSource),
    continuityFrameReuseIdentityIncludesSelectionAndContextFlags:
      rendererSource.includes("function getRuntimeChunkSelectionVersion()")
      && rendererSource.includes("function getVisibleContextFlagSignature()")
      && /function getVisibleFrameIdentity[\s\S]*?selectionVersion: getRuntimeChunkSelectionVersion\(\)[\s\S]*?contextFlagSignature: getVisibleContextFlagSignature\(\)/.test(rendererSource)
      && /function getInteractionCompositeMismatchReasons[\s\S]*?selection-version-mismatch[\s\S]*?context-flag-mismatch[\s\S]*?color-revision-mismatch/.test(renderCacheOwnerSource)
      && /function getInteractionCompositeReuseDecision[\s\S]*?allowSelectionTopologyContinuity[\s\S]*?continuityReasons\.has\(reason\)/.test(renderCacheOwnerSource)
      && /function captureLastGoodFrame[\s\S]*?cache\.lastGoodFrame\.colorRevision = identity\.colorRevision/.test(rendererSource)
      && /function drawLastGoodFrameFallback[\s\S]*?selection-version-mismatch[\s\S]*?context-flag-mismatch[\s\S]*?color-revision-mismatch/.test(rendererSource)
      && rendererRuntimeStateSource.includes("selectionVersion: 0")
      && rendererRuntimeStateSource.includes('contextFlagSignature: ""'),
    exactAfterSettleFreshnessIdentityIncludesContextFlags:
      /function getExactAfterSettleIdentity\(\)[\s\S]*?selectionVersion:[\s\S]*?contextFlagSignature: getVisibleContextFlagSignature\(\)[\s\S]*?transformBucket: getTransformBucketSignature\(\)/.test(rendererSource)
      && /function assignExactAfterSettleIdentity[\s\S]*?controller\.contextFlagSignature = identity\.contextFlagSignature/.test(rendererSource)
      && /function isExactAfterSettleIdentityCurrent[\s\S]*?String\(controller\.contextFlagSignature \|\| ""\) === identity\.contextFlagSignature/.test(rendererSource),
    contextScenarioReuseUsesScenarioDistanceBudget:
      rendererSource.includes("const CONTEXT_SCENARIO_REUSE_MAX_DISTANCE_PX = 960;")
      && /function getContextScenarioReuseDecision[\s\S]*?Math\.max\([\s\S]*?getContextBaseReuseMaxDistancePx\(\),[\s\S]*?CONTEXT_SCENARIO_REUSE_MAX_DISTANCE_PX[\s\S]*?\)[\s\S]*?const shouldExactRefresh =[\s\S]*?delta\.distancePx > maxDistancePx[\s\S]*?reachesReuseFrameLimit/.test(rendererSource),
    settlingFastFrameCanUseDirtyCachedPassesWithoutDirtyComposite:
      /function canDrawTransformedPass\(passName, cache = getRenderPassCacheState\(\), \{ allowDirty = false \} = \{\}\) \{[\s\S]*?cache\.dirty\?\.\[passName\] && !allowDirty/.test(rendererSource)
      && /function canBuildInteractionComposite\(cache = getRenderPassCacheState\(\)\) \{[\s\S]*?canDrawTransformedPass\(passName, cache\)/.test(rendererSource)
      && /function buildInteractionComposite\(currentTransform, timings\) \{[\s\S]*?canBuildInteractionComposite\(getRenderPassCacheState\(\)\)/.test(rendererSource)
      && /function drawTransformedFrameFromCaches[\s\S]*?const allowDirtyFastFrame =[\s\S]*?runtimeState\.renderPhase === RENDER_PHASE_SETTLING[\s\S]*?runtimeState\.deferExactAfterSettle[\s\S]*?const dirtyFastFramePassNames = allowDirtyFastFrame[\s\S]*?canDrawTransformedPass\(passName, cache, \{[\s\S]*?allowDirty: allowDirtyFastFrame[\s\S]*?const canDrawDirtyInteractionPasses = allowDirtyFastFrame[\s\S]*?allowDirty: true[\s\S]*?buildInteractionComposite\(currentTransform, timings\)[\s\S]*?useInteractionComposite: !canDrawDirtyInteractionPasses/.test(rendererSource)
      && /function drawCanvas[\s\S]*?usedDirtyFastFramePasses[\s\S]*?!usedDirtyFastFramePasses[\s\S]*?captureLastGoodFrame[\s\S]*?lastGoodFrameCaptureSkipped/.test(rendererSource),
    politicalRasterWorkerProtocolDefaultsOff:
      politicalRasterWorkerClientSource.includes("POLITICAL_RASTER_WORKER_PROTOCOL_VERSION = 2")
      && politicalRasterWorkerClientSource.includes("political_raster_worker")
      && politicalRasterWorkerClientSource.includes('return { ok: false, reason: "flag-disabled" };')
      && politicalRasterWorkerClientSource.includes('type: "RASTER_POLITICAL_PASS"')
      && politicalRasterWorkerClientSource.includes("isPoliticalRasterWorkerResultCurrent(request, current)")
      && politicalRasterWorkerClientSource.includes("acceptedCount")
      && politicalRasterWorkerClientSource.includes("rejectedStaleCount")
      && politicalRasterWorkerClientSource.includes("fallbackCount")
      && politicalRasterWorkerClientSource.includes("passSignature")
      && politicalRasterWorkerSource.includes('type: "RASTER_RESULT"')
      && politicalRasterWorkerSource.includes('reason: "metadata-only"')
      && politicalRasterWorkerSource.includes('type: "ERROR"')
      && politicalRasterWorkerSource.includes("taskId"),
    exactComposeUsesCompositeBuffer:
      /function ensureCompositeBufferCanvas\(\) \{[\s\S]*?cache\.compositeBuffer\.canvas = canvas;/.test(renderCacheOwnerSource)
      && /function composeCachedPasses[\s\S]*?const bufferCanvas = ensureCompositeBufferCanvas\(\);[\s\S]*?composeRenderPassesToTarget\(bufferContext, passNames, currentTransform,[\s\S]*?requireAllPasses: true[\s\S]*?blitCompositeBufferToMain\(bufferCanvas\);/.test(rendererSource)
      && /function blitCompositeBufferToMain\(bufferCanvas\) \{[\s\S]*?context\.globalCompositeOperation = "copy";[\s\S]*?context\.drawImage\(bufferCanvas, 0, 0\);[\s\S]*?context\.globalCompositeOperation = "source-over";/.test(rendererSource),
    coarsePrewarmDoesNotOverwriteActiveDetailChunks:
      /function hasDetailScenarioChunkIds\(chunkIds = \[\]\) \{[\s\S]*?String\(chunkId \|\| ""\)\.includes\("\.detail\."\)/.test(chunkRuntimeSource)
      && /const SCENARIO_CHUNK_FULL_WORLD_BBOX = Object\.freeze\(\[-180, -90, 180, 90\]\);/.test(chunkRuntimeSource)
      && /function preloadScenarioCoarseChunks[\s\S]*?viewportBbox: \[\.\.\.SCENARIO_CHUNK_FULL_WORLD_BBOX\],[\s\S]*?focusCountry:/.test(chunkRuntimeSource)
      && /function preloadScenarioCoarseChunks[\s\S]*?hasDetailScenarioChunkIds\(chunkState\.loadedChunkIds\)[\s\S]*?loadState\.promotionCommitInFlight[\s\S]*?return null;/.test(chunkRuntimeSource),
    zoomEndSettleRetainsPreviousRequiredPoliticalDetailChunks:
      chunkRuntimeSource.includes('function applyZoomEndChunkProtectionToSelection(selection, loadState, {')
      && chunkRuntimeSource.includes('reason = "",')
      && chunkRuntimeSource.includes('previousSelection = null,')
      && chunkRuntimeSource.includes('"render-phase-idle", "exact-after-settle", "scenario-apply", "scenario-apply-detail-prewarm"')
      && chunkRuntimeSource.includes('previousSelection?.requiredChunkIds')
      && chunkRuntimeSource.includes('chunkId.startsWith("political.detail.")')
      && chunkRuntimeSource.includes("selection.cacheOnlyChunkIds")
      && chunkRuntimeSource.includes("getScenarioChunkActiveMergeIds")
      && /const previousSelection = loadState\.lastSelection;[\s\S]*?applyZoomEndChunkProtection\(selection, loadState, \{[\s\S]*?reason: normalizedReason,[\s\S]*?previousSelection,/.test(chunkRuntimeSource),
    stalePostApplyRefreshDoesNotEvictRecentZoomEndDetail:
      /function shouldSkipStalePostApplyRefreshAfterZoomEnd\(loadState, reason = "", \{[\s\S]*?scenarioId = "",[\s\S]*?selectionVersion = 0,[\s\S]*?refreshSourceStartedAtMs = 0,[\s\S]*?lastSelection\?\.reason[\s\S]*?lastZoomEndToChunkVisibleMetric[\s\S]*?metric\?\.scenarioId[\s\S]*?metric\?\.selectionVersion[\s\S]*?sourceStartedAt > 0 && sourceStartedAt <= recordedAt/.test(chunkRuntimeSource)
      && /if \(shouldSkipStalePostApplyRefreshAfterZoomEnd\(loadState, nextReason, \{[\s\S]*?scenarioId,[\s\S]*?selectionVersion: loadState\.selectionVersion,[\s\S]*?refreshSourceStartedAtMs,[\s\S]*?normalizeScenarioIdFn: normalizeScenarioId,[\s\S]*?\}\)\) \{[\s\S]*?return "stale-post-apply-after-zoom-end";/.test(chunkRuntimeSource)
      && /pendingPostCommitRefresh = \{[\s\S]*?refreshSourceStartedAtMs,[\s\S]*?requestedAt: Date\.now\(\),[\s\S]*?\};/.test(chunkRuntimeSource)
      && /scheduleScenarioChunkRefresh\(\{[\s\S]*?reason: replayReason,[\s\S]*?refreshSourceStartedAtMs: Number\(pendingPostCommitRefresh\.refreshSourceStartedAtMs \|\| 0\),[\s\S]*?\}\);/.test(chunkRuntimeSource)
      && /scheduleScenarioChunkRefresh\(\{[\s\S]*?reason: "scenario-apply-detail-prewarm",[\s\S]*?refreshSourceStartedAtMs: prewarmStartedAt,[\s\S]*?\}\);/.test(postApplyEffectsSource)
      && /scheduleScenarioChunkRefresh\(\{[\s\S]*?reason: "scenario-apply",[\s\S]*?refreshSourceStartedAtMs: prewarmStartedAt,[\s\S]*?\}\);/.test(postApplyEffectsSource),
    delayedPoliticalCoreReadyMetricKeepsCoarseReadinessDetails:
      /const coarseReadyDetails = \{[\s\S]*?source: "chunk-promotion-coarse-ready"[\s\S]*?readinessLevel: "coarse-chunk"[\s\S]*?promotedPoliticalFeatureCount[\s\S]*?recordScenarioPerfMetric\("timeToPoliticalCoreReady", coarseReadyMs, coarseReadyDetails\);[\s\S]*?recordScenarioPerfMetric\("timeToInteractiveCoarseFrame", coarseReadyMs, coarseReadyDetails\);/.test(chunkRuntimeSource),
    chunkSelectionCarriesCostFieldsAndSums:
      chunkManagerSource.includes("byteSize")
      && chunkManagerSource.includes("coordCount")
      && chunkManagerSource.includes("partCount")
      && chunkManagerSource.includes("estimatedPathCost")
      && chunkManagerSource.includes("selectedFeatureCountSum")
      && chunkManagerSource.includes("selectedEstimatedPathCostSum")
      && chunkManagerSource.includes("max_required_estimated_path_cost")
      && chunkManagerSource.includes("max_required_byte_size")
      && chunkManagerSource.includes("max_required_political_chunks")
      && chunkManagerSource.includes("min_required_political_chunks")
      && chunkManagerSource.includes("max_required_political_estimated_path_cost")
      && chunkManagerSource.includes("max_required_political_byte_size")
      && chunkManagerSource.includes("takeRequiredChunksWithinCostBudget"),
    focusCountryOverrideHasTtlAndIsConsumed:
      chunkRuntimeSource.includes("FOCUS_COUNTRY_OVERRIDE_TTL_MS")
      && chunkRuntimeSource.includes("focusCountryOverrideExpiresAt")
      && chunkRuntimeSource.includes("consumeScenarioChunkFocusCountryOverride(loadState)")
      && chunkRuntimeSource.includes("clearScenarioChunkFocusCountryOverride(loadState)"),
    chunkedFullBundleUsesBootstrapRuntimeTopology:
      bundleRuntimeSource.includes("const runtimeTopologyLevel = requestedBundleLevel === \"bootstrap\" || runtimeShell?.detailChunkManifestUrl")
      && /const runtimeTopologyUrl = String\([\s\S]*?runtimeTopologyLevel === "bootstrap"[\s\S]*?runtimeShell\?\.startupTopologyUrl[\s\S]*?manifest\.runtime_topology_url/.test(bundleRuntimeSource)
      && /assembleScenarioBundle\([\s\S]*?runtimeTopologyUrl,[\s\S]*?runtimeTopologyLevel,[\s\S]*?geoLocalePatchDescriptor/.test(bundleRuntimeSource)
      && /function loadScenarioRuntimeTopologyForBundle\([\s\S]*?runtimeTopologyLevel = requestedBundleLevel[\s\S]*?requestedRuntimeTopologyLevel === "bootstrap"[\s\S]*?loadScenarioRuntimeBootstrapViaWorker/.test(bundleLoaderSource)
      && /decodeRuntimeChunkViaWorker\(\{ runtimeTopologyUrl \}\)/.test(bundleLoaderSource)
      && /topologyLevel: runtimeTopologyLevel === "bootstrap" \? "bootstrap" : "full"/.test(bundleLoaderSource),
  };

  Object.entries(contract).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("perf contracts keep coarse first frame and benchmark app-path fallback boundaries", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const scenarioManagerSource = readRepoFile("js", "core", "scenario_manager.js");
  const scenarioApplyPipelineSource = readRepoFile("js", "core", "scenario_apply_pipeline.js");
  const chunkRuntimeSource = readRepoFile("js", "core", "scenario", "chunk_runtime.js");
  const mainSource = readRepoFile("js", "main.js");
  const benchmarkSource = readRepoFile("ops", "browser-mcp", "editor-performance-benchmark.py");
  const playwrightAppPathsSource = readRepoFile("tests", "e2e", "support", "playwright-app-paths.js");

  const checks = {
    politicalPassStartsWithBackgroundFills:
      /function drawPoliticalPass\(k\) \{[\s\S]*?recordPoliticalRasterWorkerSnapshot\(\);[\s\S]*?const politicalOverscanPx = getPoliticalPassViewportOverscanPx\(\);[\s\S]*?collectVisibleLandSpatialItemsWithStats\(\{ overscanPx: politicalOverscanPx \}\)[\s\S]*?const visibleItems = visibleItemsResult \? visibleItemsResult\.items : null;[\s\S]*?drawPoliticalBackgroundFills\(\{[\s\S]*?returnSummary: true,[\s\S]*?\}\);[\s\S]*?if \(!(?:runtimeState|state)\.landData\?\.features\?\.length\) return;/.test(rendererSource),
    drawTransformedPassRecordsRenderDiagnostics:
      /function drawTransformedPass\(passName, currentTransform, referenceTransform = null\) \{[\s\S]*?renderDiag\.transformedPasses = \{[\s\S]*?\[passName\]: \{[\s\S]*?current,[\s\S]*?reference,[\s\S]*?scaleRatio,[\s\S]*?dx,[\s\S]*?dy,[\s\S]*?layout,[\s\S]*?publishRenderDiagnostics\(\);/.test(rendererSource),
    drawInteractionCompositeRecordsStableRenderDiagnostics:
      (() => {
        const body = rendererSource.match(/function drawInteractionComposite\([\s\S]*?\r?\n\}\r?\n\r?\nfunction /)?.[0] || "";
        return body.includes("renderDiag.transformedPasses = {")
          && body.includes("interactionComposite: {")
          && body.includes("current,")
          && body.includes("reference,")
          && body.includes("scaleRatio,")
          && body.includes("layout: null,")
          && body.includes("dirty: false,")
          && body.includes("publishRenderDiagnostics();");
      })(),
    backgroundFillHelperKeepsScenarioMergeSplit:
      /function drawPoliticalBackgroundFills\(options = \{\}\) \{[\s\S]*?if \(shouldUseScenarioPoliticalBackgroundMerge\(\)\) \{[\s\S]*?return drawScenarioPoliticalBackgroundFills\(options\);[\s\S]*?\}[\s\S]*?drawAdmin0BackgroundFills\(options\);/.test(rendererSource),
    backgroundFullPassCacheBuildsAndReplays:
      /function getScenarioPoliticalBackgroundFullPassGroups\([\s\S]*?metricName = "scenarioPoliticalBackgroundCacheBuild"[\s\S]*?recordRenderPerfMetric\("scenarioPoliticalBackgroundCacheReplay"[\s\S]*?recordRenderPerfMetric\(metricName/.test(rendererSource),
    politicalRecoveryQualityDefaultsProgressiveWithExactOverride:
      rendererSource.includes('const POLITICAL_RECOVERY_QUALITY_PARAM = "political_recovery_quality";')
      && /function getPoliticalRecoveryQuality\(\) \{[\s\S]*?raw === POLITICAL_RECOVERY_QUALITY_EXACT[\s\S]*?POLITICAL_RECOVERY_QUALITY_EXACT[\s\S]*?POLITICAL_RECOVERY_QUALITY_PROGRESSIVE[\s\S]*?runtimeState\.politicalRecoveryQuality = resolved;[\s\S]*?return resolved;[\s\S]*?\}/.test(rendererSource),
    progressivePoliticalRecoveryUsesCoarseUnderlayAndDeferredFullCache:
      rendererSource.includes("POLITICAL_PROGRESSIVE_BACKGROUND_EXACT_ENTRY_LIMIT")
      && rendererSource.includes("POLITICAL_PATH_CACHE_PRESERVING_INVALIDATION_REASONS")
      && rendererSource.includes('"progressive-political-full-cache-ready"')
      && rendererSource.includes("function isScenarioPoliticalBackgroundFullPassCacheKeyReady")
      && rendererSource.includes("function scheduleScenarioPoliticalBackgroundDeferredFullCache")
      && /function recordScenarioPoliticalBackgroundDeferredFullCacheReadyRepaintDeferred\(state\) \{[\s\S]*?state\.repaintDeferredRecorded = true;[\s\S]*?recordRenderPerfMetric\("scenarioPoliticalBackgroundDeferredFullCacheReadyRepaintDeferred"/.test(rendererSource)
      && rendererSource.includes("function runScenarioPoliticalBackgroundDeferredFullCacheSlice")
      && /function runScenarioPoliticalBackgroundDeferredFullCacheSlice\([\s\S]*?const normalizedEntries = state\.entries;[\s\S]*?isScenarioPoliticalBackgroundFullPassCacheKeyReady\(state\.fullPassCacheKey\)/.test(rendererSource)
      && (() => {
        const body = rendererSource.match(/function runScenarioPoliticalBackgroundDeferredFullCacheSlice\([\s\S]*?\r?\n\}\r?\n\r?\nfunction scheduleScenarioPoliticalBackgroundDeferredFullCache/)?.[0] || "";
        return body.includes("runtimeState.deferExactAfterSettle")
          && body.includes("isExactAfterSettleControllerActive()")
          && body.includes("cache.dirty?.political")
          && body.includes("scenarioPoliticalBackgroundDeferredFullCacheHandle = scheduleDeferredWork")
          && body.includes("const recoverySettled = isInteractionRecoverySettled({ quietMs: 600 });")
          && /!recoverySettled[\s\S]*?state\.index >= normalizedEntries\.length[\s\S]*?recordScenarioPoliticalBackgroundDeferredFullCacheReadyRepaintDeferred\(state\);[\s\S]*?const startedAt = nowMs\(\)[\s\S]*?getPoliticalFeaturePathEntry\([\s\S]*?allowBuild: true/.test(body)
          && /if \(!isInteractionRecoverySettled\(\{ quietMs: 600 \}\)\) \{[\s\S]*?scenarioPoliticalBackgroundDeferredFullCacheHandle = scheduleDeferredWork\([\s\S]*?runScenarioPoliticalBackgroundDeferredFullCacheSlice,[\s\S]*?\{ timeout: POLITICAL_DEFERRED_FULL_CACHE_TIMEOUT_MS \},[\s\S]*?\);[\s\S]*?recordScenarioPoliticalBackgroundDeferredFullCacheReadyRepaintDeferred\(state\);[\s\S]*?return false;[\s\S]*?\}/.test(body);
      })()
      && /function drawScenarioPoliticalBackgroundFills\([\s\S]*?const pendingPoliticalColorEdit = hasPendingPoliticalColorEdit\(\);[\s\S]*?politicalDirtyReason !== "refresh-colors"[\s\S]*?!pendingPoliticalColorEdit[\s\S]*?allowBuild: false[\s\S]*?drawAdmin0BackgroundFills\(\{[\s\S]*?scheduleScenarioPoliticalBackgroundDeferredFullCache/.test(rendererSource)
      && /function drawPoliticalPass\(k\) \{[\s\S]*?const pendingPoliticalColorEdit = hasPendingPoliticalColorEdit\(\);[\s\S]*?const skipFineFeatureLoopForProgressiveRecovery = \([\s\S]*?coarseUnderlay \|\| ""\) === "admin0"[\s\S]*?!pendingPoliticalColorEdit[\s\S]*?\);/.test(rendererSource)
      && /function clearPendingPoliticalColorEdit\(\{ renderedCount = 0, renderedIds = null, force = false \} = \{\}\) \{[\s\S]*?cache\.pendingPoliticalColorEditIds\.clear\(\);[\s\S]*?cache\.pendingPoliticalColorEditRevision = -1;/.test(rendererSource)
      && /function drawPoliticalFeature\([\s\S]*?metricsCollector\.renderedIds instanceof Set[\s\S]*?metricsCollector\.renderedIds\.add\(id\);/.test(rendererSource)
      && /const featureMetrics = \{[\s\S]*?renderedIds: new Set\(\),[\s\S]*?\};[\s\S]*?clearPendingPoliticalColorEdit\(\{[\s\S]*?renderedIds: featureMetrics\.renderedIds,[\s\S]*?\}\);/.test(rendererSource)
      && /function tryPartialPoliticalPassRepaint\(transform, nextSignature, timings\) \{[\s\S]*?const partialFeatureMetrics = \{[\s\S]*?renderedIds: new Set\(\),[\s\S]*?\};[\s\S]*?metricsCollector: partialFeatureMetrics,[\s\S]*?clearPendingPoliticalColorEdit\(\{[\s\S]*?renderedIds: partialFeatureMetrics\.renderedIds,[\s\S]*?\}\);/.test(rendererSource)
      && rendererSource.includes('recordRenderPerfMetric("scenarioPoliticalBackgroundProgressiveRecovery"')
      && rendererSource.includes('metricName: "scenarioPoliticalBackgroundDeferredFullCacheBuild"')
      && rendererSource.includes('recordRenderPerfMetric("scenarioPoliticalBackgroundDeferredFullCacheSlice"')
      && rendererSource.includes('reason: "progressive-coarse-underlay"'),
    progressiveFullCacheReadyRequestsPoliticalRepaint:
      (() => {
        const body = rendererSource.match(/function runScenarioPoliticalBackgroundDeferredFullCacheSlice\([\s\S]*?\r?\n\}\r?\n\r?\nfunction scheduleScenarioPoliticalBackgroundDeferredFullCache/)?.[0] || "";
        return /isInteractionRecoverySettled\(\{ quietMs: 600 \}\)[\s\S]*?recordRenderPerfMetric\("scenarioPoliticalBackgroundDeferredFullCacheComplete"[\s\S]*?scenarioPoliticalBackgroundDeferredFullCacheState = null;[\s\S]*?invalidateRenderPasses\("political", "progressive-political-full-cache-ready"\);[\s\S]*?const repaintRequested = requestRendererRender\("progressive-political-full-cache-ready", \{[\s\S]*?flush: false,[\s\S]*?if \(context\) render\(\);[\s\S]*?recordRenderPerfMetric\("scenarioPoliticalBackgroundDeferredFullCacheReadyRepaintRequest"[\s\S]*?repaintRequested: !!repaintRequested/.test(body);
      })(),
    chunkedRuntimeSkipsBlockingDetailPromotion:
      /const supportsChunkedPoliticalRuntime = scenarioSupportsChunkedRuntime\(bundle\)[\s\S]*?const detailPromoted = \(startupReadonly \|\| supportsChunkedPoliticalRuntime\)\s*\?\s*false\s*:\s*await ensureScenarioDetailTopologyLoaded\(\{ applyMapData: false \}\);/.test(scenarioApplyPipelineSource),
    unconfirmedDetailPromotionStillWarnsBeforeHealthGate:
      /if \(!detailReady && (?:runtimeState|state)\.topologyBundleMode !== "composite"\) \{[\s\S]*?console\.warn\("\[scenario\] Applying bundle without confirmed detail promotion; health gate will validate runtime topology\."\);/.test(scenarioApplyPipelineSource),
    coarseInteractiveMetricRecordedAfterPostApplyEffects:
      /const \{[\s\S]*?chunkPrewarmAwaited = true,[\s\S]*?chunkPrewarmDeferred = false,[\s\S]*?coarsePrewarmCommitted = false,[\s\S]*?\} = await runPostScenarioApplyEffects\([\s\S]*?deferChunkPrewarm,[\s\S]*?const canRecordPostApplyCoarseMetric = !hasChunkedRuntime \|\| coarsePrewarmCommitted;[\s\S]*?if \(chunkPrewarmDeferred\) \{[\s\S]*?recordScenarioPerfMetric\("timeToStartupShellApplyReady"[\s\S]*?source: "post-apply-startup-shell-ready"[\s\S]*?readinessLevel: "startup-shell-apply-ready"[\s\S]*?\} else if[\s\S]*?canRecordPostApplyCoarseMetric[\s\S]*?recordScenarioPerfMetric\([\s\S]*?"timeToPoliticalCoreReady"[\s\S]*?source: "post-apply-coarse-ready"[\s\S]*?if \(!chunkPrewarmDeferred && canRecordPostApplyCoarseMetric\) \{[\s\S]*?recordScenarioPerfMetric\([\s\S]*?"timeToInteractiveCoarseFrame"[\s\S]*?readinessLevel: "coarse-chunk"[\s\S]*?chunkPrewarmAwaited,[\s\S]*?chunkPrewarmDeferred,[\s\S]*?coarsePrewarmCommitted,/.test(scenarioManagerSource),
    chunkedCoarsePrewarmSuppressesDetailHealthToast:
      /const suppressChunkedCoarseDataHealthToast =[\s\S]*?scenarioSupportsChunkedRuntime\(bundle\)[\s\S]*?chunkPrewarmResult\?\.coarsePrewarmCommitted === true;[\s\S]*?refreshScenarioDataHealth\(\{[\s\S]*?showWarningToast: shouldExposeScenarioDataHealthSignals && !suppressChunkedCoarseDataHealthToast,[\s\S]*?showErrorToast: shouldExposeScenarioDataHealthSignals && !suppressChunkedCoarseDataHealthToast,/.test(readRepoFile("js", "core", "scenario_post_apply_effects.js")),
    startupBootDefersCoarsePrewarm:
      /async function ensureChunkedScenarioFirstFrameReady\(\{[\s\S]*?awaitPrewarm = true,[\s\S]*?coarsePrewarmCommitted: false,[\s\S]*?if \(awaitPrewarm === false && !synchronous\) \{[\s\S]*?scheduleScenarioChunkRefresh\(\{[\s\S]*?reason: "scenario-apply"[\s\S]*?coarsePrewarmDeferredAt: refreshScheduledAt[\s\S]*?chunkRefreshScheduledAt: refreshScheduledAt[\s\S]*?return \{[\s\S]*?chunkPrewarmAwaited: false,[\s\S]*?chunkPrewarmDeferred: true,[\s\S]*?coarsePrewarmCommitted: false,/.test(readRepoFile("js", "core", "scenario_post_apply_effects.js"))
      && /canDeferStartupChunkPrewarm = scenarioBundleSource === "startup-bundle"[\s\S]*?defaultScenarioBundle\?\.loadDiagnostics\?\.startupBundle === true[\s\S]*?deferChunkPrewarm: canDeferStartupChunkPrewarm,[\s\S]*?canDeferStartupChunkPrewarm = false;/.test(readRepoFile("js", "bootstrap", "startup_scenario_boot.js")),
    disabledDefaultScenarioOverrideBootsBaseMap:
      readRepoFile("js", "bootstrap", "startup_bootstrap_support.js").includes('const DEFAULT_SCENARIO_DISABLED_OVERRIDE = "none";')
      && /function getConfiguredDefaultScenarioId\(\)[\s\S]*?if \(isDefaultScenarioDisabledOverride\(queryOverride\)\) \{[\s\S]*?return "";[\s\S]*?export function shouldDisableConfiguredDefaultScenario\(\)/.test(readRepoFile("js", "bootstrap", "startup_bootstrap_support.js"))
      && /const defaultScenarioDisabled = shouldDisableConfiguredDefaultScenario\(\);[\s\S]*?const configuredDefaultScenarioId = defaultScenarioDisabled \? "" : getConfiguredDefaultScenarioId\(\);[\s\S]*?const registryDefaultScenarioIdPromise = defaultScenarioDisabled[\s\S]*?Promise\.resolve\(""\)[\s\S]*?const requestedDefaultScenarioIdPromise = defaultScenarioDisabled[\s\S]*?Promise\.resolve\(""\)/.test(readRepoFile("js", "bootstrap", "startup_data_pipeline.js"))
      && /if \(scenarioBundleResult\?\.skipped && !scenarioBundleResult\.bundle\) \{[\s\S]*?bundleLevel: "none"[\s\S]*?defaultScenarioBundle: null/.test(readRepoFile("js", "bootstrap", "startup_scenario_boot.js"))
      && /if \(!scenarioId\) \{[\s\S]*?buildInitialScenarioChunkVisualPromotionResult\("no-active-scenario"[\s\S]*?result\.ok = true;[\s\S]*?return result;/.test(chunkRuntimeSource),
    startupBootRebuildsBaseMapBeforeInitialChunkVisual:
      /startupScenarioBoot\.runStartupScenarioBoot\([\s\S]*?if \(!Array\.isArray\(runtimeState\.landData\?\.features\) \|\| !runtimeState\.landData\.features\.length\) \{[\s\S]*?setMapData\(\{[\s\S]*?suppressRender: true,[\s\S]*?interactionLevel: startupInteractionLevel,[\s\S]*?deferInteractionInfrastructure: startupInteractionLevel === "readonly-startup"[\s\S]*?\}\);[\s\S]*?await ensureStartupInitialScenarioChunkVisualReady/.test(mainSource),
    ensureAppPathUrlRewritesRootAndNestedPaths:
      /def ensure_app_path_url\(url: str\) -> str:[\s\S]*?if path\.startswith\("\/app\/"\) or path == "\/app":[\s\S]*?elif path == "\/":[\s\S]*?normalized_path = "\/app\/"[\s\S]*?else:[\s\S]*?normalized_path = f"\/app\{path\}" if path\.startswith\("\/"\) else f"\/app\/\{path\}"/.test(benchmarkSource),
    buildScenarioOpenUrlsAddsPerfOverlayAndScenarioCandidate:
      /def build_scenario_open_urls\([\s\S]*?perf_url = with_query_overrides\(ensure_app_path_url\(base_url\), perf_overlay="1", runtime_chunk_perf="1"\)[\s\S]*?neutral_perf_url = with_query_overrides\(perf_url, default_scenario="none"\)[\s\S]*?urls\.append\(neutral_perf_url\)[\s\S]*?if normalized_scenario_id == "none":[\s\S]*?pass[\s\S]*?elif normalized_scenario_id:[\s\S]*?scenario_perf_url = with_query_overrides\(perf_url, default_scenario=normalized_scenario_id\)[\s\S]*?urls\.append\(scenario_perf_url\)[\s\S]*?urls\.append\(perf_url\)/.test(benchmarkSource),
    openPageKeepsWrapperThenLocalFallbackAcrossCandidates:
      /REQUESTED_PLAYWRIGHT_BACKEND = os\.environ\.get\("EDITOR_PERF_BENCHMARK_BACKEND"/.test(benchmarkSource)
      && /PLAYWRIGHT_BACKEND = LOCAL_NODE_PLAYWRIGHT_BACKEND if REQUESTED_PLAYWRIGHT_BACKEND == LOCAL_NODE_PLAYWRIGHT_BACKEND else WRAPPER_BACKEND/.test(benchmarkSource)
      && /SCENARIO_BROWSER_RECYCLE_SETTLE_SEC = 1\.0/.test(benchmarkSource)
      && /case 'open': \{[\s\S]*?if \(url && payload\.navigate !== false\) \{[\s\S]*?await targetPage\.goto/.test(benchmarkSource)
      && /"headless": LOCAL_NODE_PLAYWRIGHT_HEADLESS,[\s\S]*?"navigate": False,/.test(benchmarkSource)
      && /def open_page\(urls: list\[str\] \| tuple\[str, \.\.\.\] \| str\) -> dict:[\s\S]*?if REQUESTED_PLAYWRIGHT_BACKEND in \{"", WRAPPER_BACKEND\} and PWCLI\.exists\(\):[\s\S]*?run_wrapper_pw\("open", candidate_url, "--browser", browser_name,[\s\S]*?if REQUESTED_PLAYWRIGHT_BACKEND in \{"", LOCAL_NODE_PLAYWRIGHT_BACKEND\}:[\s\S]*?run_local_pw\(\s*"open",\s*candidate_url,\s*"--browser",\s*browser_name,/.test(benchmarkSource),
    scenarioSuitesSettleAfterClosingBrowser:
      /def run_scenario_suite\([\s\S]*?close_session\(\)[\s\S]*?time\.sleep\(SCENARIO_BROWSER_RECYCLE_SETTLE_SEC\)[\s\S]*?page_load = open_page/.test(benchmarkSource),
    benchmarkReadyTimeoutReportsBootErrorAndBrowserIssues:
      /bootError: String\(state\.bootError \|\| ''\),/.test(benchmarkSource)
      && /if isinstance\(result, dict\):[\s\S]*?result\["consoleIssues"\] = capture_console_issues\(\)[\s\S]*?result\["networkIssues"\] = capture_network_issues\(\)[\s\S]*?Benchmark runtime did not become ready before scenario action/.test(benchmarkSource),
    suiteBaseUrlsKeepOriginalAndAppVariants:
      /suite_base_urls = unique_strings\(\[[\s\S]*?effective_url,[\s\S]*?ensure_app_path_url\(effective_url\),[\s\S]*?args\.url,[\s\S]*?ensure_app_path_url\(args\.url\),/.test(benchmarkSource),
    sameScenarioFreshMetricSelectionIsExplicit:
      /def is_same_scenario_fresh_metric_entry\([\s\S]*?def summarize_freshest_same_scenario_metric_entry\(/.test(benchmarkSource),
    scenarioConsistencyAcceptsNeutralPageLoadBeforeApply:
      /neutral_page_load = page_load_active == "" and "default_scenario=none" in page_load_open_url[\s\S]*?or neutral_page_load[\s\S]*?scenario_apply_matches =/.test(benchmarkSource),
    contextProbeReportsPerPassDurations:
      benchmarkSource.includes('("all_context_off", {')
      && benchmarkSource.includes('"contextBaseDurationMs"')
      && benchmarkSource.includes('"contextScenarioDurationMs"')
      && benchmarkSource.includes('("lastFrame", "timings", "contextScenario")')
      && benchmarkSource.includes("'showCityPoints'")
      && benchmarkSource.includes("'showTransport'"),
    contextProbeScenariosAndCasesAreConfigurable:
      benchmarkSource.includes('"--context-probe-scenarios"')
      && benchmarkSource.includes('"--context-probe-cases"')
      && /def parse_context_probe_scenarios\(value: str\) -> set\[str\]:[\s\S]*?known_scenario_ids = set\(SCENARIO_IDS\)[\s\S]*?Unknown --context-probe-scenarios value\(s\)/.test(benchmarkSource)
      && /def parse_context_probe_cases\(value: str\) -> list\[tuple\[str, dict\[str, bool\]\]\]:[\s\S]*?unknown = \[label for label in labels if label not in cases_by_label\]/.test(benchmarkSource)
      && /def measure_context_probes\([\s\S]*?enabled_scenario_ids: set\[str\][\s\S]*?context_probe_cases: list\[tuple\[str, dict\[str, bool\]\][\s\S]*?if scenario_id not in enabled_scenario_ids:[\s\S]*?for label, flags in context_probe_cases:/.test(benchmarkSource)
      && /context_probe_scenario_ids = parse_context_probe_scenarios\(args\.context_probe_scenarios\)[\s\S]*?context_probe_cases = parse_context_probe_cases\(args\.context_probe_cases\)[\s\S]*?"contextProbeScenarios": sorted\(context_probe_scenario_ids\)[\s\S]*?"contextProbeCases": \[label for label, _flags in context_probe_cases\]/.test(benchmarkSource),
    benchmarkWheelTraceTracksLastWheelAndBlackRatio:
      benchmarkSource.includes("firstIdleAfterLastWheelMs")
      && benchmarkSource.includes("sample_canvas_black_pixel_ratio_js")
      && benchmarkSource.includes("maxBlackPixelRatio")
      && benchmarkSource.includes("lastWheelAt = await page.evaluate(() => performance.now())")
      && benchmarkSource.includes('"rapidWheel": rapid_wheel_screenshot_path')
      && benchmarkSource.includes('"interactivePan": interactive_pan_screenshot_path'),
    zoomEndVisualMetricRequiresCurrentZoomEndSelection:
      benchmarkSource.includes("String(entry?.reason || '').toLowerCase() === 'zoom-end'")
      && benchmarkSource.includes("expectedSelectionVersion")
      && benchmarkSource.includes("Number(entry?.selectionVersion || 0) >= Number(expectedSelectionVersion || 0)"),
    directProbeScenarioContextDoesNotLookLikeStaleMetric:
      benchmarkSource.includes("direct_probe_without_scenario_fields")
      && benchmarkSource.includes('"requestedScenarioId"')
      && benchmarkSource.includes('"sameScenario": details_match_scenario or probe_matches_scenario or direct_probe_without_scenario_fields'),
    fillActionInvalidProbeStaysReportable:
      benchmarkSource.includes("def build_invalid_fill_probe(precheck: dict, reason: str) -> dict:")
      && /explicit_validity = probe\.get\("validity"\)[\s\S]*?if explicit_validity and explicit_validity\.get\("valid"\) is False:[\s\S]*?"reason": str\(explicit_validity\.get\("reason"\) or "invalid-probe"\)/.test(benchmarkSource)
      && /if \(!interaction \|\| !state\.landData\?\.features\?\.length\) \{[\s\S]*?return invalid\('missing-prerequisites'\);/.test(benchmarkSource)
      && /if \(!candidate\) \{[\s\S]*?return invalid\('missing-target'\);/.test(benchmarkSource)
      && /if not isinstance\(target, dict\) or target\.get\("valid"\) is False:[\s\S]*?return build_invalid_fill_probe\([\s\S]*?str\(target\.get\("reason"\) if isinstance\(target, dict\) else ""\),/.test(benchmarkSource),
    e2eHarnessDefaultsToAppPath:
      playwrightAppPathsSource.includes("const DEFAULT_OPEN_PATH = DEFAULT_FAST_APP_OPEN_PATH;")
      && playwrightAppPathsSource.includes("const DEFAULT_APP_ORIGIN = `http://127.0.0.1:${DEFAULT_TEST_SERVER_PORT}`;"),
    normalizeAppPathKeepsRootQueryAndHashOnAppRoute:
      playwrightAppPathsSource.includes('if (normalizedTarget === "/") {')
      && playwrightAppPathsSource.includes('if (normalizedTarget.startsWith("/app/")) {')
      && playwrightAppPathsSource.includes('if (normalizedTarget === "/app") {')
      && playwrightAppPathsSource.includes('if (normalizedTarget.startsWith("/?") || normalizedTarget.startsWith("/#")) {')
      && playwrightAppPathsSource.includes('return `/app${normalizedTarget}`;'),
  };

  Object.entries(checks).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("spatial grid builder returns stable bucket snapshots without renderer state writes", () => {
  const localItem = { id: "local", minX: 10, minY: 10, maxX: 80, maxY: 80 };
  const globalItem = { id: "global", minX: 0, minY: 0, maxX: 500, maxY: 500 };
  const snapshot = buildSpatialGridSnapshot({
    items: [localItem, globalItem],
    canvasWidth: 500,
    canvasHeight: 500,
    hitGridTargetCols: 5,
    hitGridMinCellPx: 100,
    hitGridMaxCellPx: 100,
    hitMaxCellsPerItem: 4,
  });

  assert.equal(snapshot.gridMeta.cellSize, 100);
  assert.equal(snapshot.gridMeta.cols, 5);
  assert.equal(snapshot.gridMeta.rows, 5);
  assert.deepEqual(snapshot.gridMeta.globals.map((item) => item.id), ["global"]);
  assert.equal(snapshot.itemsById.get("local"), localItem);
  assert.equal(snapshot.itemsById.get("global"), globalItem);
  assert.deepEqual(
    snapshot.grid.get(getSpatialBucketKey(0, 0)).map((item) => item.id),
    ["local"]
  );
  assert.equal(snapshot.grid.has(getSpatialBucketKey(4, 4)), false);
});

test("TNO water topology contracts keep exclusive scenario water and shared surface version signal", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const spatialBuilderSource = readRepoFile("js", "core", "renderer", "spatial_index_runtime_builders.js");
  const spatialOwnerSource = readRepoFile("js", "core", "renderer", "spatial_index_runtime_owner.js");
  const scenarioApplyPipelineSource = readRepoFile("js", "core", "scenario_apply_pipeline.js");
  const startupHydrationSource = readRepoFile("js", "core", "scenario", "startup_hydration.js");
  const chunkRuntimeSource = readRepoFile("js", "core", "scenario", "chunk_runtime.js");
  const scenarioRefreshPlansSource = readRepoFile("js", "core", "map_renderer", "scenario_refresh_plans.js");

  const checks = {
    scenarioWaterExclusiveModeComesFromManifestWithLegacyAtlantropaDefault:
      /function getScenarioWaterRegionsMode\(\) \{[\s\S]*?runtimeState\.activeScenarioManifest\?\.water_regions_mode[\s\S]*?SCENARIO_PRESENTATION_FEATURES\.ATLANTROPA_RELIEF[\s\S]*?return "exclusive";[\s\S]*?return "combined";[\s\S]*?\}/.test(rendererSource)
      && /function isScenarioWaterTopologyExclusiveMode\(\) \{[\s\S]*?return getScenarioWaterRegionsMode\(\) === "exclusive";[\s\S]*?\}/.test(rendererSource),
    tnoWaterUsesScenarioCollectionOnly:
      /function getEffectiveWaterRegionFeatures\(\) \{[\s\S]*?if \(isScenarioWaterTopologyExclusiveMode\(\)\) \{[\s\S]*?return sanitizeWaterRegionFeatures\(scenarioFeatures\.filter\(\(feature\) => !isWaterRegionExcludedByScenario\(feature\)\)\);/.test(rendererSource),
    openOceanRenderAndInteractionUseActiveOverlayGate:
      /function isOpenOceanOverlayActive\(\) \{[\s\S]*?return isOpenOceanSelectionEnabled\(\) \|\| isOpenOceanPaintEnabled\(\);[\s\S]*?\}/.test(rendererSource)
      && /function isWaterRegionRenderable\(feature\) \{[\s\S]*?if \(isOpenOceanWaterRegion\(feature\)\) \{[\s\S]*?return isOpenOceanOverlayActive\(\);[\s\S]*?return feature\?\.properties\?\.interactive !== false;[\s\S]*?\}/.test(rendererSource)
      && /function isWaterRegionEnabled\(feature\) \{[\s\S]*?if \(isOpenOceanWaterRegion\(feature\)\) \{[\s\S]*?return isOpenOceanOverlayActive\(\);[\s\S]*?return feature\?\.properties\?\.interactive !== false;[\s\S]*?\}/.test(rendererSource)
      && /function drawScenarioWaterFillLayer\(k, \{ waterFeatures = \[\] \} = \{\}\) \{[\s\S]*?if \(!isWaterRegionRenderable\(feature\)\) return;/.test(rendererSource)
      && /function collectWaterGridCandidates\(px, py, radiusProj = 0\) \{[\s\S]*?shouldIncludeItem: \(item\) => isWaterRegionEnabled\(item\.feature\),/.test(rendererSource)
      && /function rebuildAuxiliaryRegionIndexes\(\) \{[\s\S]*?if \(!isWaterRegionEnabled\(selectedFeature\)\) \{[\s\S]*?runtimeState\.selectedWaterRegionId = "";/.test(rendererSource)
      && /function drawScenarioWaterHighlightLayer\(k\) \{[\s\S]*?if \(!isWaterRegionEnabled\(feature\)\) return;/.test(rendererSource),
    waterSphericalDiagnosticsBacksSanitization:
      /function getSphericalGeometryDiagnostics\(geoObject\) \{[\s\S]*?globalThis\.d3\.geoArea[\s\S]*?globalThis\.d3\.geoBounds[\s\S]*?isWorldBounds\(bounds\)[\s\S]*?SPHERICAL_GEOMETRY_MAX_AREA/.test(rendererSource)
      && /function collectSafeWaterRegionGeometryPartsInfo\(feature\) \{[\s\S]*?isSphericalGeometryUnsafe\(part\)[\s\S]*?removedCount \+= 1;/.test(rendererSource)
      && /function sanitizeWaterRegionFeatures\(features = \[\]\) \{[\s\S]*?recordRenderPerfMetric\("waterSphericalSanitization"/.test(rendererSource),
    waterDrawAndHighlightUseSafeParts:
      /function drawScenarioWaterFillLayer\(k, \{ waterFeatures = \[\] \} = \{\}\) \{[\s\S]*?collectSafeWaterRegionGeometryParts\(feature\)[\s\S]*?pathCanvas\(part\)/.test(rendererSource)
      && /function drawScenarioWaterHighlightLayer\(k\) \{[\s\S]*?collectSafeWaterRegionGeometryParts\(feature\)[\s\S]*?pathCanvas\(part\)/.test(rendererSource),
    waterFillUsesProjectionPathCacheBeforeCanvasFallback:
      /let scenarioWaterPartPathCache = new WeakMap\(\);[\s\S]*?let scenarioWaterFeaturePathCache = new WeakMap\(\);/.test(rendererSource)
      && /function getScenarioWaterFeaturePath\(feature, parts\) \{[\s\S]*?scenarioWaterFeaturePathCache\.has\(feature\)[\s\S]*?combinedPath\.addPath\(partPath\)[\s\S]*?scenarioWaterFeaturePathCache\.set\(feature, path\);/.test(rendererSource)
      && /function drawScenarioWaterFillLayer\(k, \{ waterFeatures = \[\] \} = \{\}\) \{[\s\S]*?const waterPath = visibleParts\.length === parts\.length[\s\S]*?getScenarioWaterFeaturePath\(feature, parts\)[\s\S]*?context\.fill\(waterPath\);[\s\S]*?getScenarioWaterPartPath\(part\)[\s\S]*?context\.fill\(partPath\)[\s\S]*?pathCanvas\(part\);/.test(rendererSource),
    waterCoverageUsesSafeParts:
      /function getScenarioWaterVisibleCoverageRatioLegacy\(waterFeatures = \[\]\) \{[\s\S]*?if \(!isWaterRegionRenderable\(feature\)\) return;[\s\S]*?collectSafeWaterRegionGeometryParts\(feature\)[\s\S]*?computeProjectedGeoBounds\(part\)/.test(rendererSource)
      && /function getScenarioWaterVisibleCoverageRatioGrid\(waterFeatures = \[\]\) \{[\s\S]*?if \(!isWaterRegionRenderable\(feature\)\) continue;[\s\S]*?collectSafeWaterRegionGeometryParts\(feature\)[\s\S]*?computeProjectedGeoBounds\(part\)/.test(rendererSource),
    waterSpatialIndexSkipsUnsafeParts:
      /function buildWaterSpatialItems\(\{[\s\S]*?shouldExcludeWaterHitGeometry = \(\) => false,[\s\S]*?if \(shouldExcludeWaterHitGeometry\(hitGeometry, feature, id\)\) return;/.test(spatialBuilderSource)
      && /shouldExcludeWaterHitGeometry = \(\) => false/.test(spatialOwnerSource)
      && /shouldExcludeWaterHitGeometry,/.test(spatialOwnerSource)
      && /collectFeatureHitGeometries: collectSafeWaterRegionGeometryParts/.test(rendererSource),
    physicalLandMasksRequireD3Quality:
      /function getPhysicalLandMaskCandidateQuality\(collection, maskSource\) \{[\s\S]*?getSphericalGeometryDiagnostics\(collection\)[\s\S]*?recordRenderPerfMetric\("physicalLandMaskRejected"/.test(rendererSource)
      && /function getFirstUsablePhysicalLandMaskInfo\(candidates = \[\]\) \{[\s\S]*?getPhysicalLandMaskCandidateQuality\(candidate\.collection, candidate\.maskSource\)/.test(rendererSource),
    waterMaskAndCoastlineShareScenarioSurfaceSignal:
      /function getScenarioSurfaceVersionSignal\(\) \{/.test(rendererSource)
      && /`water-ref:\$\{getObjectIdentityToken\(runtimeState\.scenarioWaterRegionsData, "scenario-water"\)\}`/.test(rendererSource)
      && /`water-mode:\$\{getScenarioWaterRegionsMode\(\)\}`/.test(rendererSource)
      && /maskInfo\.maskQualityToken \|\| "unchecked"/.test(rendererSource)
      && /function getScenarioWaterVisualRevisionToken\(\) \{[\s\S]*?getScenarioSurfaceVersionSignal\(\)/.test(rendererSource)
      && /function getPhysicalLandClipCacheKey\(maskInfo\) \{[\s\S]*?scenario-surface:\$\{getScenarioSurfaceVersionSignal\(\)\}/.test(rendererSource)
      && /function getCoastlineDecisionSignature\(decision = null\) \{[\s\S]*?String\(decision\.scenarioSurfaceVersionSignal \|\| ""\)/.test(rendererSource),
    chunkPromotionSkipsDeferredInfraWhenSecondaryIndexesAlreadySynced:
      /const synchronizedSecondaryRegionIndexes = syncScenarioSecondaryRegionIndexes\(\{[\s\S]*?const shouldSkipDeferredInfraRefresh = synchronizedSecondaryRegionIndexes && !hasPoliticalChange;[\s\S]*?if \(shouldSkipDeferredInfraRefresh\) \{[\s\S]*?scheduleHitCanvasBuildIfNeeded\(\{[\s\S]*?\}\);[\s\S]*?\} else \{[\s\S]*?scheduleDeferredScenarioChunkPromotionInfraRefresh\(\{/.test(rendererSource),
    startupHydrationWaterOnlyChangeSyncsSecondaryIndexes:
      /let scenarioWaterChanged = false;/.test(startupHydrationSource)
      && /scenarioWaterChanged = state\.scenarioWaterRegionsData !== nextScenarioWaterRegionsData;/.test(startupHydrationSource)
      && /hydrationChangedLayerKeys = \[[\s\S]*?\.\.\.\(scenarioWaterChanged \? \["water"\] : \[\]\),[\s\S]*?\.\.\.\(scenarioAtlantropaChanged \? \["scenario_atlantropa"\] : \[\]\),[\s\S]*?\];/.test(startupHydrationSource)
      && /if \(scenarioWaterChanged && !scenarioAtlantropaChanged && !promotedScenarioPolitical && !hasPoliticalPayloadChange\) \{[\s\S]*?refreshMapDataForScenarioChunkPromotion\(\{[\s\S]*?reason: "scenario-hydrate-water",[\s\S]*?changedLayerKeys: \["water"\],[\s\S]*?hasPoliticalPayloadChange: false,/.test(startupHydrationSource),
    chunkPromotionVisualStageReusesPrimaryDerivedStateRebuild:
      [
        "function getScenarioChunkPromotionTargetPasses({",
        '"contextMarkers"',
        '"labels"',
        "function refreshMapDataForScenarioChunkPromotion({",
        "ensureLayerDataFromTopology();",
        "rebuildPoliticalLandCollections();",
        "includeRuntimePoliticalMeta: true",
        'scheduleUiMode: "deferred"',
        "buildSpatial: true",
        "includeSecondarySpatial: false",
        "async function runDeferredScenarioChunkPromotionInfraRefresh({",
        "primaryDerivedStateReady = false",
        "buildIndex();",
        "await buildSpatialIndexChunked({",
        "includeSecondary: false",
        "keepReady: true",
      ].every((snippet) => `${rendererSource}\n${scenarioRefreshPlansSource}`.includes(snippet)),
    rebuildPoliticalLandCollectionsBreakdownExposesSyncSubsteps:
      /function rebuildPoliticalLandCollections\(\) \{[\s\S]*?let runtimeCollectionMs = 0;[\s\S]*?let composeMs = 0;[\s\S]*?let atlantropaMs = 0;[\s\S]*?let interactiveMs = 0;[\s\S]*?let coverageMs = 0;[\s\S]*?recordRenderPerfMetric\("rebuildPoliticalLandCollectionsBreakdown"[\s\S]*?scenarioChunkFeatureCount:[\s\S]*?scenarioChunkVisibleFeatureCount:[\s\S]*?runtimeCollectionMs:[\s\S]*?composeMs:[\s\S]*?atlantropaMs:[\s\S]*?interactiveMs:[\s\S]*?coverageMs:/.test(rendererSource),
    politicalChunkPromotionBreakdownExposesVisualStageSubsteps:
      /function applyScenarioPoliticalChunkPayload\(bundle, politicalPayload,[\s\S]*?const normalizeStartedAt = startedAt;[\s\S]*?const identityStartedAt = normalizeEndedAt;[\s\S]*?const compareStartedAt = identityEndedAt;[\s\S]*?recordScenarioRenderMetric\("politicalChunkPromotionBreakdown"[\s\S]*?normalizeMs:[\s\S]*?identityMs:[\s\S]*?compareMs:[\s\S]*?refreshMs:/.test(chunkRuntimeSource)
      && /if \(samePayload && samePrimaryPayload && !forceRefresh\) \{[\s\S]*?recordScenarioRenderMetric\("politicalChunkPromotionBreakdown"[\s\S]*?samePayload: true,[\s\S]*?samePrimaryPayload: true,[\s\S]*?refreshMs: 0,/.test(chunkRuntimeSource)
      && /recordScenarioRenderMetric\("politicalChunkPromotionBreakdown", finishedAt - startedAt,[\s\S]*?samePayload: false,[\s\S]*?samePrimaryPayload,[\s\S]*?forcedRefresh: !!forceRefresh,[\s\S]*?resolvedPoliticalFeatureCount: resolvedPoliticalFeatureIds\.length,/.test(chunkRuntimeSource),
    compositeScenarioRebuildKeepsScenarioRuntimeTopology:
      [
        "render_as_base_geography === false",
        "scenarioRuntimeTopologyData || runtimeState.runtimePoliticalTopology",
        "const runtimeBaseCollection = getRuntimePoliticalBaseCollection(runtimeCollection);",
        "const hasScenarioRuntimePoliticalSource = !!String(runtimeState.activeScenarioId || \"\").trim()",
        "&& !!runtimeTopology?.objects?.political;",
        "if (runtimeBaseCollection)",
        "fullCollection = runtimeBaseCollection;",
        "fullCollection = { type: \"FeatureCollection\", features: [] };",
        "scenarioPoliticalVisibleChunkCollection",
        "composePoliticalFeatureCollections(fullCollection, scenarioPoliticalChunkCollection)",
        "shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature(",
      ].every((snippet) => rendererSource.includes(snippet))
      && rendererSource.includes("features.filter((feature, index) => !shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature(")
      && /if \(runtimeBaseCollection\) \{[\s\S]*?fullCollection = runtimeBaseCollection;[\s\S]*?\} else if \(hasScenarioRuntimePoliticalSource\) \{[\s\S]*?fullCollection = \{ type: "FeatureCollection", features: \[\] \};[\s\S]*?\} else if \(primaryTopology\?\.objects\?\.political/.test(rendererSource),
    scenarioApplyCommitsPreparedScenarioWaterPayloadOnly:
      /function buildScenarioActivationCommitState\(bundle,\s*staged\) \{[\s\S]*?const scenarioWaterRegionsData = staged\.scenarioWaterRegionsFromTopology \|\| null;[\s\S]*?scenarioWaterRegionsData,/.test(scenarioApplyPipelineSource)
      && /commitScenarioActivationRuntimeState\(runtimeState,\s*nextRuntimeState\);/.test(scenarioApplyPipelineSource),
  };

  Object.entries(checks).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("owner/base diagnostics separate geometry country from display owner", () => {
  const feature = {
    id: "AL011",
    properties: {
      id: "AL011",
      name: "AL011",
    },
  };
  const state = {
    sovereigntyByFeatureId: {
      AL011: "ITA",
    },
  };
  const featureId = getSharedFeatureId(feature);
  const geometryCountryCode = getSharedFeatureCountryCode(feature);
  const displayOwnerCode = normalizeFeatureCountryCode(
    state.sovereigntyByFeatureId[featureId],
    { allowReserved: true }
  );

  assert.equal(featureId, "AL011");
  assert.equal(geometryCountryCode, "AL");
  assert.equal(displayOwnerCode, "ITA");
});

test("Atlantropa field-driven interaction contracts preserve explicit render and hit layers", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const spatialBuilderSource = readRepoFile("js", "core", "renderer", "spatial_index_runtime_builders.js");
  const spatialOwnerSource = readRepoFile("js", "core", "renderer", "spatial_index_runtime_owner.js");
  const chunkAssetToolSource = readRepoFile("tools", "scenario_chunk_assets.py");
  const checkScenarioContractsSource = readRepoFile("tools", "check_scenario_contracts.py");
  const chunkPromotionHelperSource = readRepoFile("js", "core", "renderer", "scenario_chunk_promotion_helpers.js");
  const interactionHitCandidateSource = readRepoFile("js", "core", "map_renderer", "interaction_hit_candidates.js");
  const colorCoverageE2eSource = readRepoFile("tests", "e2e", "dev", "scenario_chunk_exact_after_settle_regression.dev.spec.js");
  const pixelProbeSource = readRepoFile("tests", "e2e", "support", "political-pixel-probe.js");
  const visualRenderableBody = rendererSource.match(/function isPoliticalVisualRenderableFeature\(feature, featureId = null\) \{[\s\S]*?\n\}/)?.[0] || "";

  const checks = {
    hitResultShapeCarriesRuntimeCountry:
      /function createHitResult\(overrides = \{\}\) \{[\s\S]*?countryCode: null,[\s\S]*?runtimeCountryCode: null,/.test(interactionHitCandidateSource),
    interactionCountryCodeFallsBackFromDisplayOwnerToRuntimeCountry:
      /function getFeatureInteractionCountryCodeNormalized\(feature, featureId = null\) \{[\s\S]*?getDisplayOwnerCode\(feature, resolvedId\)[\s\S]*?getFeatureCountryCodeNormalized\(feature\)/.test(rendererSource),
    canvasHitPreservesRuntimeCountryAndReturnsInteractionCountry:
      /function getHitResultFromCanvas\(event\) \{[\s\S]*?countryCode: getFeatureInteractionCountryCodeNormalized\(feature, id\),[\s\S]*?runtimeCountryCode: getFeatureCountryCodeNormalized\(feature\),/.test(rendererSource),
    spatialHitPreservesRuntimeCountryAndReturnsInteractionCountry:
      /function toHitResult\([\s\S]*?const runtimeCountryCode = canonicalCountryCode\([\s\S]*?candidate\.item\.countryCode[\s\S]*?const interactionCountryCode = feature[\s\S]*?getFeatureInteractionCountryCodeNormalized\(feature, resolvedId\)[\s\S]*?countryCode: interactionCountryCode \|\| runtimeCountryCode,[\s\S]*?runtimeCountryCode,/.test(interactionHitCandidateSource)
      && /function toHitResult\(candidate,[\s\S]*?toCandidateHitResult\(candidate,[\s\S]*?getFeatureInteractionCountryCodeNormalized,/.test(rendererSource),
    targetResolutionUsesOwnerAwareFeatureIds:
      /function getInteractionCountryFeatureIds\(feature, featureId\) \{[\s\S]*?getScenarioOwnerFeatureIds\(interactionCountryCode\)[\s\S]*?getCountryFeatureIds\(runtimeCountryCode\)/.test(rendererSource)
      && /function resolveInteractionTargetIds\(feature, id\) \{[\s\S]*?getFeatureInteractionCountryCodeNormalized\(feature, id\)[\s\S]*?getInteractionCountryFeatureIds\(feature, id\)/.test(rendererSource)
      && /function resolveCountryFillTargetIds\(feature, featureId[\s\S]*?getFeatureInteractionCountryCodeNormalized\(feature, featureId\)[\s\S]*?getInteractionCountryFeatureIds\(feature, featureId\)/.test(rendererSource),
    parentGroupsUseOwnerAwareScope:
      /function resolveParentGroupKey\(feature, featureId\) \{[\s\S]*?getFeatureInteractionCountryCodeNormalized\(feature, featureId\)/.test(rendererSource)
      && /function resolveParentGroupTargetIds\(feature, featureId\) \{[\s\S]*?getInteractionCountryFeatureIds\(feature, featureId\)/.test(rendererSource),
    booleanWeldDonorIslandHasDedicatedInteractiveEscape:
      /function isInteractiveAtlantropaBooleanWeldIslandFeature\(feature, featureId = null\) \{[\s\S]*?candidate\.startsWith\("ATLISL_"\)[\s\S]*?getAtlantropaGeometryRole\(feature\) === "donor_island"[\s\S]*?getAtlantropaJoinMode\(feature\) === "boolean_weld"[\s\S]*?\}/.test(rendererSource),
    booleanWeldIslandCanRenderAndRemainInteractive:
      /function isAtlantropaVisualSupportHelperFeature\(feature, featureId = null\) \{[\s\S]*?joinMode === "gap_fill"[\s\S]*?\}/.test(rendererSource)
      && /function isAtlantropaSupportHelperFeature\(feature, featureId = null\) \{[\s\S]*?isInteractiveAtlantropaBooleanWeldIslandFeature\(feature, featureId\)[\s\S]*?return false;[\s\S]*?joinMode === "boolean_weld"[\s\S]*?\}/.test(rendererSource)
      && /function isPoliticalInteractionRenderableFeature\(feature, featureId = null\) \{[\s\S]*?feature\?\.properties\?\.interactive === false[\s\S]*?isAtlantropaSupportHelperFeature\(feature, featureId\)/.test(rendererSource),
    arcticShellCanRenderWithoutBecomingInteractive:
      !/shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature/.test(visualRenderableBody)
      && !/isScenarioShellFeature/.test(visualRenderableBody)
      && /function isPoliticalInteractionRenderableFeature\(feature, featureId = null\) \{[\s\S]*?isScenarioShellFeature\(feature, featureId\)[\s\S]*?feature\?\.properties\?\.interactive === false/.test(rendererSource),
    arcticShellUnderlayDrawsBeforeDetailFeatures:
      /function isPoliticalShellUnderlayFeature\(feature, featureId = null\) \{[\s\S]*?isRuntimeOnlyShellFallbackPoliticalFeature\(feature, featureId\)/.test(rendererSource)
      && /function isPoliticalPrimaryUnderlayFeature\(feature, _featureId = null\) \{[\s\S]*?__source[\s\S]*?=== "primary";[\s\S]*?\}/.test(rendererSource)
      && /function isPoliticalUnderlayFeature\(feature, featureId = null\) \{[\s\S]*?isPoliticalShellUnderlayFeature\(feature, featureId\)[\s\S]*?isPoliticalPrimaryUnderlayFeature\(feature, featureId\)/.test(rendererSource)
      && /function hasPoliticalForegroundColorOverride\(featureId\) \{[\s\S]*?runtimeState\.visualOverrides\?\.\[id\][\s\S]*?runtimeState\.featureOverrides\?\.\[id\]/.test(rendererSource)
      && /function isPendingPoliticalColorEditFeature\(feature, featureId = null\) \{[\s\S]*?hasPendingPoliticalColorEdit\(\)[\s\S]*?pendingPoliticalColorEditIds[\s\S]*?pendingIds\.has\(id\);/.test(rendererSource)
      && /function isPoliticalForegroundFeature\(feature, featureId = null\) \{[\s\S]*?hasPoliticalForegroundColorOverride\(id\)[\s\S]*?isPendingPoliticalColorEditFeature\(feature, id\)/.test(rendererSource)
      && /function orderPoliticalShellUnderlayFirst\(entries = \[\]\) \{[\s\S]*?const underlayEntries = \[\];[\s\S]*?const detailEntries = \[\];[\s\S]*?const foregroundEntries = \[\];[\s\S]*?isPoliticalForegroundFeature\(feature, featureId\)[\s\S]*?isPoliticalUnderlayFeature\(feature, featureId\)[\s\S]*?return \[\.\.\.underlayEntries, \.\.\.detailEntries, \.\.\.foregroundEntries\];/.test(rendererSource)
      && /orderPoliticalShellUnderlayFirst\(redrawEntries\)\.forEach/.test(rendererSource)
      && /orderPoliticalShellUnderlayFirst\(visibleItems\)\.forEach/.test(rendererSource)
      && /const featureEntries = runtimeState\.landData\.features\.map/.test(rendererSource)
      && /orderPoliticalShellUnderlayFirst\(featureEntries\)\.forEach/.test(rendererSource),
    arcticShellOwnerHintsCanColorCoalescedShells:
      /scenario_shell_owner_hint/.test(rendererSource)
      && /scenario_shell_controller_hint/.test(rendererSource),
    scenarioAtlantropaVisibilityGatesFieldDrivenRenderPaths:
      /function isScenarioAtlantropaVisible\(\) \{[\s\S]*?runtimeState\.showScenarioAtlantropa !== false;[\s\S]*?\}/.test(rendererSource)
      && /function getEffectiveAtlantropaFeatures\(\) \{[\s\S]*?if \(!isScenarioAtlantropaVisible\(\)\) \{[\s\S]*?return buckets;[\s\S]*?\}/.test(rendererSource)
      && /function isPoliticalVisualRenderableFeature\(feature, featureId = null\) \{[\s\S]*?isAtlantropaFieldDrivenFeature\(feature\) && !isScenarioAtlantropaVisible\(\)/.test(rendererSource),
    fieldDrivenAtlantropaUsesExplicitInteractionFlag:
      /function isAtlantropaSupportHelperFeature\(feature, featureId = null\) \{[\s\S]*?if \(isAtlantropaFieldDrivenFeature\(feature\)\) \{[\s\S]*?return feature\?\.properties\?\.atl_interactive !== true;[\s\S]*?\}/.test(rendererSource),
    backgroundMergeFiltersVisualHelpersButKeepsVisibleNonInteractiveLand:
      /function buildScenarioPoliticalBackgroundEntries\(\) \{[\s\S]*?shouldExcludePoliticalVisualFeature\(feature, id\)/.test(rendererSource)
      && /function buildScenarioPoliticalBackgroundEntriesFromSpatialItems\(items = \[\]\) \{[\s\S]*?shouldExcludePoliticalVisualFeature\(entry\.feature, entry\.id\)/.test(rendererSource),
    admin0BackgroundUsesDominantResolvedFillBeforeBaseColor:
      /function getAdmin0BackgroundFillColor\(countryCode\) \{[\s\S]*?const dominantFillColor = buildCountryDominantFillColorMap\(\)\.get\(canonicalCode\);[\s\S]*?return getSafeCanvasColor\(dominantFillColor, null\)[\s\S]*?getSafeCanvasColor\(getColorByCanonicalCountryCode\(runtimeState\.sovereignBaseColors, canonicalCode\), null\)[\s\S]*?getSafeCanvasColor\(getColorByCanonicalCountryCode\(runtimeState\.countryBaseColors, canonicalCode\), null\)[\s\S]*?\|\| LAND_FILL_COLOR;[\s\S]*?\}/.test(rendererSource)
      && /function drawAdmin0BackgroundFills\([\s\S]*?const fillColor = getAdmin0BackgroundFillColor\(code\);/.test(rendererSource),
    colorCoverageOwnerDiagnosticsUseDisplayOwnerCode:
      /import\("\/js\/core\/feature_identity\.js"\)/.test(colorCoverageE2eSource)
      && /getCountryCode:\s*getSharedFeatureCountryCode/.test(colorCoverageE2eSource)
      && /getFeatureId:\s*getSharedFeatureId/.test(colorCoverageE2eSource)
      && /const normalizeCode = \(value\) => normalizeFeatureCountryCode\(value, \{ allowReserved: true \}\);/.test(colorCoverageE2eSource)
      && /getSharedFeatureCountryCode\(feature, \{[\s\S]*?fallbackCountryCode: fallback,[\s\S]*?fallbackId: fallback,[\s\S]*?\}\)/.test(colorCoverageE2eSource)
      && /getSharedFeatureId\(feature, \{ fallback \}\)/.test(colorCoverageE2eSource)
      && /ISO_A2_EH: props\.ISO_A2_EH[\s\S]*?ADM0_A2: props\.ADM0_A2[\s\S]*?__city_country_code: props\.__city_country_code/.test(colorCoverageE2eSource)
      && /const getDisplayOwnerCode = \(feature, featureId, fallbackCountryCode = ""\) => \{[\s\S]*?state\.sovereigntyByFeatureId\?\.\[featureId\][\s\S]*?state\.scenarioAutoShellOwnerByFeatureId\?\.\[featureId\][\s\S]*?shellCandidate\.startsWith\("RU_ARCTIC_FB_"\)[\s\S]*?props\.name[\s\S]*?shell fallback[\s\S]*?const displayOwnerCode = getDisplayOwnerCode\(feature, featureId, countryCode\);/.test(colorCoverageE2eSource)
      && /countryOwnerSourceMismatches\.push\(\{[\s\S]*?classification: "display-owner-source-mismatch"/.test(colorCoverageE2eSource)
      && /expect\(coverage\.missingOwnerColorCount,[\s\S]*?display owner base colors/.test(colorCoverageE2eSource),
    pixelProbeOwnerColorUsesDisplayOwnerCode:
      /import\("\/js\/core\/feature_identity\.js"\)/.test(pixelProbeSource)
      && /getCountryCode:\s*getSharedFeatureCountryCode/.test(pixelProbeSource)
      && /getFeatureId:\s*getSharedFeatureId/.test(pixelProbeSource)
      && /getSharedFeatureCountryCode\(feature, \{[\s\S]*?fallbackCountryCode: fallback,[\s\S]*?fallbackId: fallback,[\s\S]*?\}\)/.test(pixelProbeSource)
      && /getSharedFeatureId\(feature\)/.test(pixelProbeSource)
      && /normalizeFeatureCountryCode\(state\.sovereigntyByFeatureId\?\.\[featureId\][\s\S]*?allowReserved: true/.test(pixelProbeSource)
      && /shellCandidate\.startsWith\("RU_ARCTIC_FB_"\)[\s\S]*?props\.name[\s\S]*?shell fallback/.test(pixelProbeSource)
      && /const displayOwnerCode = getDisplayOwnerCode\(matchedFeature, featureId, countryCode\);/.test(pixelProbeSource)
      && /state\.sovereignBaseColors\?\.\[displayOwnerCode\][\s\S]*?state\.countryBaseColors\?\.\[displayOwnerCode\]/.test(pixelProbeSource),
    scenarioBackgroundMergeUsesVisualLandCollection:
      /function getScenarioPoliticalBackgroundLandCollection\(\) \{[\s\S]*?return runtimeState\.landData \|\| runtimeState\.landDataFull;[\s\S]*?\}/.test(rendererSource)
      && /function shouldUseScenarioPoliticalBackgroundMerge\(\) \{[\s\S]*?const landCollection = getScenarioPoliticalBackgroundLandCollection\(\);[\s\S]*?runtimeState\.activeScenarioId[\s\S]*?landCollection\.features\.length/.test(rendererSource)
      && /function buildScenarioPoliticalBackgroundEntries\(\) \{[\s\S]*?const landCollection = getScenarioPoliticalBackgroundLandCollection\(\);/.test(rendererSource)
      && /function collectScenarioPoliticalBackgroundSpatialEntries\([\s\S]*?const landCollection = getScenarioPoliticalBackgroundLandCollection\(\);[\s\S]*?if \(landCollection !== runtimeState\.landData\)/.test(rendererSource),
    backgroundMergeEntriesCacheIsViewportIndependent:
      (() => {
        const entriesBody = rendererSource.match(/function buildScenarioPoliticalBackgroundEntries\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction buildScenarioPoliticalBackgroundEntriesFromSpatialItems/)?.[0] || "";
        return !!entriesBody
          && !entriesBody.includes("pathBoundsInScreen")
          && entriesBody.includes("viewport filtering stays in the draw path");
      })()
      && /function drawScenarioPoliticalBackgroundFills\([\s\S]*?const normalizedScreenRects = Array\.isArray\(screenRects\) && screenRects\.length[\s\S]*?const visibleEntries = normalizedScreenRects[\s\S]*?projectedBoundsIntersectScreenRects\(projectedBounds, normalizedScreenRects, \{ transform \}\)/.test(rendererSource),
    spatialItemsCanCarryVisibleNonInteractiveLand:
      /function appendLandSpatialItemsRange\([\s\S]*?shouldExcludePoliticalVisualFeature = shouldExcludePoliticalInteractionFeature[\s\S]*?if \(shouldExcludePoliticalVisualFeature\(feature, id\)\) continue;[\s\S]*?interactive: !shouldExcludePoliticalInteractionFeature\(feature, id\)/.test(spatialBuilderSource)
      && /shouldExcludePoliticalVisualFeature = shouldExcludePoliticalInteractionFeature/.test(spatialOwnerSource)
      && /shouldExcludePoliticalVisualFeature,/.test(spatialOwnerSource),
    hitCanvasStillFiltersNonInteractiveSpatialItems:
      /const visibleSpatialItemsResult = collectVisibleLandSpatialItemsWithStats\(\{[\s\S]*?overscanPx: HIT_CANVAS_VIEWPORT_OVERSCAN_PX,[\s\S]*?\}\);[\s\S]*?const visibleSpatialItems = visibleSpatialItemsResult\.items;[\s\S]*?visibleSpatialItems\.forEach\(\(item\) => \{[\s\S]*?shouldExcludePoliticalInteractionFeature\(item\.feature, item\.id\)/.test(rendererSource)
      && /collectVisibleSpatialItemsWithStats\(\{[\s\S]*?shouldIncludeItem:[\s\S]*?!shouldExcludePoliticalVisualFeature/.test(rendererSource),
    atlantropaScenarioLayerFeedsScenarioWaterPath:
      /function getScenarioAtlantropaRevisionToken\(\) \{[\s\S]*?runtimeState\.scenarioAtlantropaData[\s\S]*?water:\$\{buckets\.water\.length\}/.test(rendererSource)
      && /function getScenarioAtlantropaRevisionToken\(\) \{[\s\S]*?isScenarioAtlantropaVisible\(\) \? "visible:on" : "visible:off"/.test(rendererSource)
      && /function getEffectiveWaterRegionFeatures\(\) \{[\s\S]*?const atlantropaFeatures = getEffectiveAtlantropaFeatures\(\);[\s\S]*?\.\.\.atlantropaFeatures\.water,/.test(rendererSource)
      && /function drawScenarioAtlantropaLandLikeOverlayLayer\(k\) \{[\s\S]*?const buckets = getEffectiveAtlantropaFeatures\(\);[\s\S]*?\.\.\.buckets\.shoal,/.test(rendererSource)
      && /function drawScenarioAtlantropaLandLikeOverlayLayer\(k\) \{[\s\S]*?getSafeCanvasColor\(runtimeState\.colors\?\.\[id\], null\)[\s\S]*?getSafeCanvasColor\(getResolvedFeatureColor\(feature, id\), null\)/.test(rendererSource)
      && /function drawScenarioRegionOverlaysPass\(k\) \{[\s\S]*?const showAtlantropaLandLikeOverlay = showWater && isScenarioAtlantropaVisible\(\);[\s\S]*?if \(showAtlantropaLandLikeOverlay\) \{[\s\S]*?drawScenarioAtlantropaLandLikeOverlayLayer\(k\);[\s\S]*?\}/.test(rendererSource)
      && /function shouldExcludeWaterHitGeometry\(hitGeometry, feature = null\) \{[\s\S]*?return isSphericalGeometryUnsafe\(hitGeometry\);[\s\S]*?\}/.test(rendererSource)
      && /function getUnifiedWaterBaseStyle\(feature\) \{[\s\S]*?isAtlantropaSeaFeature\(feature\)[\s\S]*?getAtlantropaSeaPoliticalFillColor\(\)/.test(rendererSource)
      && /function getWaterRegionColor\(id, feature = null\) \{[\s\S]*?const defaultStyleFeature = feature \|\| runtimeState\.waterRegionsById\?\.get\(resolvedId\);/.test(rendererSource)
      && /context\.fillStyle = getWaterRegionColor\(id, feature\);/.test(rendererSource)
      && /function getScenarioWaterVisualRevisionToken\(\) \{[\s\S]*?water-atlantropa:\$\{getScenarioAtlantropaRevisionToken\(\)\}/.test(rendererSource)
      && /const bounds = computeProjectedGeoBounds\(hitGeometry\) \|\| computeProjectedGeoBounds\(feature\);/.test(spatialBuilderSource)
      && !rendererSource.includes("atl_water_projection")
      && !rendererSource.includes("collectActiveAtlantropaSeaWaterFeatures")
      && !rendererSource.includes("getActiveAtlantropaSeaWaterProjectionState"),
    macroOceanOverridesRequirePaintMode:
      /function getWaterRegionColor\(id, feature = null\) \{[\s\S]*?const defaultStyleFeature = feature \|\| runtimeState\.waterRegionsById\?\.get\(resolvedId\);[\s\S]*?if \(isMacroOceanWaterRegion\(defaultStyleFeature\) && !isOpenOceanPaintEnabled\(\)\) \{[\s\S]*?return getWaterRegionDefaultStyle\(defaultStyleFeature\)\.fill;[\s\S]*?\}[\s\S]*?getSafeCanvasColor\(runtimeState\.waterRegionOverrides\?\.\[resolvedId\], null\)/.test(rendererSource),
    politicalPromotionTreatsAtlantropaLayerAsWaterChange:
      /const hasAtlantropaLayerChange = normalizedChangedLayerKeys\.includes\("scenario_atlantropa"\);/.test(chunkPromotionHelperSource)
      && /const effectiveChangedLayerKeys = hasAtlantropaLayerChange[\s\S]*?"water"/.test(chunkPromotionHelperSource)
      && /resolveScenarioChunkPromotionChangeSet\(\{[\s\S]*?changedLayerKeys,[\s\S]*?politicalFeatureIds,[\s\S]*?hasPoliticalPayloadChange/.test(rendererSource)
      && /const hasWaterChange = normalizedLayerKeys\.has\("water"\) \|\| normalizedLayerKeys\.has\("scenario_atlantropa"\);/.test(rendererSource)
      && /syncScenarioSecondaryRegionIndexes\(\{[\s\S]*?changedLayerKeys: effectiveChangedLayerKeys,/.test(rendererSource)
      && /function refreshMapDataForScenarioApply\([\s\S]*?const atlantropaWaterFeatureCount = getEffectiveAtlantropaFeatures\(\)\.water\.length;[\s\S]*?if \(atlantropaWaterFeatureCount > 0\) \{[\s\S]*?rebuildAuxiliaryRegionIndexes\(\);[\s\S]*?getSpatialIndexRuntimeOwner\(\)\.buildSecondarySpatialIndexes/.test(rendererSource)
      && /function scheduleSecondarySpatialIndexBuild\([\s\S]*?rebuildAuxiliaryRegionIndexes\(\);[\s\S]*?getSpatialIndexRuntimeOwner\(\)\.buildSecondarySpatialIndexes/.test(rendererSource),
    startupRuntimeMetaSeedAllowsShellOnlyAtlantropaLayer:
      /function collectRuntimePoliticalTopologyFeatureIds\(\) \{[\s\S]*?\["political", "scenario_atlantropa"\]\.flatMap/.test(rendererSource)
      && /function runtimePoliticalMetaSeedCoversTopology\(seed, runtimeFeatureIds\) \{[\s\S]*?seedFeatureIds\.length < runtimeFeatureIds\.length[\s\S]*?new Set\(seedFeatureIds\)[\s\S]*?seedFeatureIdSet\.has\(featureId\)/.test(rendererSource)
      && /const seedMatches = runtimePoliticalMetaSeedCoversTopology\(seed, runtimeFeatureIds\);/.test(rendererSource)
      && !/seed\.featureIds\.length === runtimeFeatureCount/.test(rendererSource),
    chunkAssetBuilderNormalizesDirectAtlantropaGeojsonForD3:
      /def _normalize_atlantropa_feature_for_d3\(feature: dict\[str, Any\]\) -> dict\[str, Any\]:/.test(chunkAssetToolSource)
      && /def _normalize_polygon_coordinates_for_d3\(polygon_coordinates: Any\) -> Any:/.test(chunkAssetToolSource)
      && /_normalize_atlantropa_feature_for_d3\(feature\)/.test(chunkAssetToolSource)
      && /\"sha256\": sha256_path\(chunk_path\)/.test(chunkAssetToolSource)
      && /\"feature_bounds\": feature_bounds_summary/.test(chunkAssetToolSource),
    strictCheckerValidatesDetailFeatureBounds:
      /def _validate_detail_chunk_feature_bounds\(/.test(checkScenarioContractsSource)
      && /require_precise_chunk_manifest = target_dir\.name == "tno_1962"/.test(checkScenarioContractsSource)
      && /feature_bounds must be present for political detail chunks/.test(checkScenarioContractsSource)
      && /feature_bounds length must match non-empty payload feature bounds/.test(checkScenarioContractsSource)
      && /feature_bounds\[\{index\}\] must match payload geometry bounds/.test(checkScenarioContractsSource),
    strictCheckerSeparatesAtlantropaCoarseAndDetailCoverage:
      /atlantropa_all_ids: set\[str\] = set\(\)/.test(checkScenarioContractsSource)
      && /atlantropa_detail_ids: set\[str\] = set\(\)/.test(checkScenarioContractsSource)
      && /if chunk_lod == "detail":[\s\S]*?atlantropa_detail_ids\.add\(feature_id\)/.test(checkScenarioContractsSource)
      && /scenario_atlantropa detail chunks must cover runtime scenario_atlantropa ids/.test(checkScenarioContractsSource),
  };

  Object.entries(checks).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("renderer shell fallback policy behaves as visual-only underlay coverage", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const harness = createRendererShellPolicyHarness(rendererSource);
  const shellFeature = {
    id: "RU_ARCTIC_FB_TYM_042",
    properties: {
      id: "RU_ARCTIC_FB_TYM_042",
      scenario_helper_kind: "shell_fallback",
      render_as_base_geography: false,
      interactive: false,
    },
  };
  const baseFeature = {
    id: "REAL_TYM",
    properties: {
      id: "REAL_TYM",
      cntr_code: "RU",
    },
  };
  const primaryFallbackFeature = {
    id: "FR",
    properties: {
      id: "FR",
      __source: "primary",
    },
  };
  const detailFeature = {
    id: "FR_ARR_18002",
    properties: {
      id: "FR_ARR_18002",
      __source: "detail",
    },
  };

  assert.equal(harness.isScenarioShellFeature(shellFeature, shellFeature.id), true);
  assert.equal(harness.isRuntimeOnlyShellFallbackPoliticalFeature(shellFeature, shellFeature.id), true);
  assert.equal(harness.isPoliticalVisualRenderableFeature(shellFeature, shellFeature.id), true);
  assert.equal(harness.isPoliticalInteractionRenderableFeature(shellFeature, shellFeature.id), false);
  assert.equal(harness.isPoliticalVisualRenderableFeature(baseFeature, baseFeature.id), true);
  assert.equal(harness.isPoliticalInteractionRenderableFeature(baseFeature, baseFeature.id), true);
  assert.equal(harness.isPoliticalPrimaryUnderlayFeature(primaryFallbackFeature, primaryFallbackFeature.id), true);
  assert.equal(harness.isPoliticalUnderlayFeature(detailFeature, detailFeature.id), false);
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: baseFeature.id, feature: baseFeature },
      { id: shellFeature.id, feature: shellFeature },
    ]), (entry) => entry.id),
    [shellFeature.id, baseFeature.id],
  );
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: detailFeature.id, feature: detailFeature },
      { id: primaryFallbackFeature.id, feature: primaryFallbackFeature },
    ]), (entry) => entry.id),
    [primaryFallbackFeature.id, detailFeature.id],
  );
  harness.setVisualOverrides({ [detailFeature.id]: "#ff00aa" });
  assert.equal(harness.hasPoliticalForegroundColorOverride(detailFeature.id), true);
  assert.equal(harness.isPoliticalForegroundFeature(detailFeature, detailFeature.id), true);
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: detailFeature.id, feature: detailFeature },
      { id: primaryFallbackFeature.id, feature: primaryFallbackFeature },
      { id: baseFeature.id, feature: baseFeature },
    ]), (entry) => entry.id),
    [primaryFallbackFeature.id, baseFeature.id, detailFeature.id],
  );
  harness.setVisualOverrides({});
  harness.setVisualOverrides({ [primaryFallbackFeature.id]: "#ff00aa" });
  assert.equal(harness.hasPoliticalForegroundColorOverride(primaryFallbackFeature.id), true);
  assert.equal(harness.isPoliticalForegroundFeature(primaryFallbackFeature, primaryFallbackFeature.id), true);
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: primaryFallbackFeature.id, feature: primaryFallbackFeature },
      { id: shellFeature.id, feature: shellFeature },
      { id: detailFeature.id, feature: detailFeature },
    ]), (entry) => entry.id),
    [shellFeature.id, detailFeature.id, primaryFallbackFeature.id],
  );
  harness.setVisualOverrides({});
  harness.setPendingColorEditIds([primaryFallbackFeature.id]);
  assert.equal(harness.isPendingPoliticalColorEditFeature(primaryFallbackFeature, primaryFallbackFeature.id), true);
  assert.equal(harness.isPoliticalForegroundFeature(primaryFallbackFeature, primaryFallbackFeature.id), true);
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: detailFeature.id, feature: detailFeature },
      { id: primaryFallbackFeature.id, feature: primaryFallbackFeature },
      { id: shellFeature.id, feature: shellFeature },
    ]), (entry) => entry.id),
    [shellFeature.id, detailFeature.id, primaryFallbackFeature.id],
  );
  harness.setPendingColorEditIds([]);
  harness.setPendingColorEditIds([baseFeature.id]);
  assert.equal(harness.isPendingPoliticalColorEditFeature(baseFeature, baseFeature.id), true);
  assert.equal(harness.isPoliticalForegroundFeature(baseFeature, baseFeature.id), true);
  assert.deepEqual(
    Array.from(harness.orderPoliticalShellUnderlayFirst([
      { id: baseFeature.id, feature: baseFeature },
      { id: shellFeature.id, feature: shellFeature },
      { id: detailFeature.id, feature: detailFeature },
    ]), (entry) => entry.id),
    [shellFeature.id, detailFeature.id, baseFeature.id],
  );
  harness.setPendingColorEditIds([]);

  const mixedCollection = {
    type: "FeatureCollection",
    features: [shellFeature, baseFeature],
  };
  assert.deepEqual(
    harness.getRuntimePoliticalBaseCollection(mixedCollection).features.map((feature) => feature.id),
    [baseFeature.id],
  );
  harness.setMapSemanticMode("blank");
  assert.equal(harness.getRuntimePoliticalBaseCollection({ type: "FeatureCollection", features: [shellFeature] }).features.length, 1);
});

test("TNO Russian Arctic shell fallbacks remain visual-only political coverage", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const visualRenderableBody = rendererSource.match(/function isPoliticalVisualRenderableFeature\(feature, featureId = null\) \{[\s\S]*?\n\}/)?.[0] || "";
  const interactionRenderableBody = rendererSource.match(/function isPoliticalInteractionRenderableFeature\(feature, featureId = null\) \{[\s\S]*?\n\}/)?.[0] || "";
  const coarsePoliticalChunk = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "chunks", "political.coarse.r0c0.json"));
  const countries = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "countries.json")).countries || {};
  const ownersByFeature = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "owners.by_feature.json"));
  const arcticShells = (coarsePoliticalChunk.features || [])
    .filter((feature) => getFeatureId(feature).startsWith("RU_ARCTIC_FB_"))
    .map((feature) => ({
      feature,
      featureId: getFeatureId(feature),
      bounds: getCoordinateBounds(feature?.geometry?.coordinates),
    }))
    .filter((entry) => entry.bounds.maxLat >= 73);

  assert.ok(arcticShells.length >= 3, `expected high-latitude RU_ARCTIC_FB shell coverage, found ${arcticShells.length}`);
  assert.equal(
    visualRenderableBody.includes("shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature"),
    false,
    "runtime-only shell collection filtering must not block per-feature political fill",
  );
  assert.match(
    interactionRenderableBody,
    /isScenarioShellFeature\(feature, featureId\)/,
    "scenario shells must remain excluded from political interaction",
  );
  assert.match(
    rendererSource,
    /function getRuntimePoliticalBaseCollection\(collection\) \{[\s\S]*?shouldExcludeRuntimeOnlyShellFallbackPoliticalFeature\(/,
    "runtime political base collection still filters shell-only payloads",
  );

  arcticShells.forEach(({ feature, featureId, bounds }) => {
    const properties = feature?.properties || {};
    const ownerHint = String(properties.scenario_shell_owner_hint || "").trim().toUpperCase();
    assert.equal(properties.scenario_helper_kind, "shell_fallback", `${featureId} must stay marked as a shell fallback`);
    assert.equal(properties.render_as_base_geography, false, `${featureId} should be political fill coverage, not base geography`);
    assert.equal(properties.interactive, false, `${featureId} must stay non-interactive`);
    assert.equal(Object.hasOwn(ownersByFeature, featureId), false, `${featureId} should rely on owner hints instead of owners.by_feature`);
    assert.ok(ownerHint, `${featureId} needs a scenario shell owner hint`);
    assert.match(String(countries[ownerHint]?.color_hex || ""), /^#[0-9a-f]{6}$/i, `${featureId} owner hint ${ownerHint} needs a country color`);
    assert.ok(bounds.maxLat >= 73, `${featureId} should cover the reported high-latitude band`);
  });
});

test("TNO ATLSEA chunk GeoJSON donor seas stay d3-small and local", () => {
  const d3 = loadVendorD3();
  const chunkManifest = JSON.parse(readRepoFile("data", "scenarios", "tno_1962", "detail_chunks.manifest.json"));
  const atlantropaChunks = getManifestChunksByLayer(chunkManifest, "scenario_atlantropa");
  assert.ok(atlantropaChunks.length > 0, "scenario_atlantropa chunks must carry Atlantropa donor seas");
  const checkedPayloads = atlantropaChunks.map(readManifestChunkPayload);
  let donorSeaCount = 0;

  checkedPayloads.forEach((payload) => {
    (payload.features || []).forEach((feature) => {
      const props = feature?.properties || {};
      const featureId = String(props.id || "").trim();
      if (!featureId.startsWith("ATLSEA_") || featureId.startsWith("ATLSEA_FILL_")) return;
      if (String(props.atl_geometry_role || "").trim().toLowerCase() !== "donor_sea") return;
      donorSeaCount += 1;
      const area = d3.geoArea(feature);
      const bounds = d3.geoBounds(feature);
      assert.equal(isWorldGeoBounds(bounds), false, `${featureId} must not render as global water shell`);
      assert.ok(area < 0.05, `${featureId} spherical area must stay local: ${area}`);
      if (featureId === "ATLSEA_adriatica_8597_5838_0") {
        assert.equal(d3.geoContains(feature, [18, 41.6]), true, `${featureId} should contain its Adriatic basin probe`);
        assert.equal(d3.geoContains(feature, [-150, 0]), false, `${featureId} should not contain a global ocean probe`);
      }
    });
  });

  assert.ok(donorSeaCount >= 100, `expected ATLSEA donor seas in checked chunks, found ${donorSeaCount}`);
});

test("frame scheduler continues after a failed task", async () => {
  const scheduler = await import("../js/core/frame_scheduler.js");
  const originalError = console.error;
  const calls = [];
  console.error = () => {};
  try {
    scheduler.enqueueFrameTask(() => {
      calls.push("first");
      throw new Error("scheduler test failure");
    }, { priority: "high", label: "throwing-test-task" });
    scheduler.enqueueFrameTask(() => {
      calls.push("second");
    }, { priority: "high", label: "following-test-task" });
    scheduler.runFrameTasks(8);
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(calls, ["first", "second"]);
});

test("zoom-end evictable protection reuses unified validator across TTL, focusCountry, and selectionVersion", async () => {
  const {
    applyZoomEndChunkProtectionToSelection,
    protectZoomEndChunksForSelection,
  } = await import("../js/core/scenario/chunk_runtime.js");
  const baseLoadState = {
    zoomEndProtectedChunkIds: [],
    zoomEndProtectedUntil: 0,
    zoomEndProtectedSelectionVersion: 0,
    zoomEndProtectedScenarioId: "",
    zoomEndProtectedFocusCountry: "",
  };
  const nowMs = 1_000;
  const selection = {
    evictableChunkIds: ["political.detail.a", "political.detail.b"],
  };
  protectZoomEndChunksForSelection(baseLoadState, ["political.detail.a"], {
    scenarioId: "tno_1962",
    selectionVersion: 7,
    focusCountry: "de",
    nowMs,
  });
  assert.equal(
    applyZoomEndChunkProtectionToSelection(selection, baseLoadState, {
      scenarioId: "tno_1962",
      selectionVersion: 7,
      focusCountry: "DE",
      nowMs: nowMs + 4_000,
    }),
    true,
  );
  assert.deepEqual(selection.evictableChunkIds, ["political.detail.b"]);
  assert.deepEqual(selection.retainedActiveChunkIds, ["political.detail.a"]);
  assert.deepEqual(selection.cacheOnlyChunkIds || [], []);

  const expiredLoadState = {
    ...baseLoadState,
    zoomEndProtectedChunkIds: ["political.detail.a"],
    zoomEndProtectedUntil: nowMs + 5_000,
    zoomEndProtectedSelectionVersion: 7,
    zoomEndProtectedScenarioId: "tno_1962",
    zoomEndProtectedFocusCountry: "DE",
  };
  const expiredSelection = { evictableChunkIds: ["political.detail.a"] };
  assert.equal(
    applyZoomEndChunkProtectionToSelection(expiredSelection, expiredLoadState, {
      scenarioId: "tno_1962",
      selectionVersion: 7,
      focusCountry: "DE",
      nowMs: nowMs + 5_001,
    }),
    false,
  );
  assert.deepEqual(expiredSelection.evictableChunkIds, ["political.detail.a"]);

  const previousSelection = {
    reason: "zoom-end",
    scenarioId: "tno_1962",
    selectionVersion: 8,
    focusCountry: "DE",
    recordedAt: nowMs,
    zoomEndProtectionUntil: nowMs + 5_000,
    requiredChunkIds: ["political.detail.a"],
  };
  const focusChangedSelection = { evictableChunkIds: ["political.detail.a"] };
  assert.equal(
    applyZoomEndChunkProtectionToSelection(focusChangedSelection, baseLoadState, {
      reason: "scenario-apply",
      previousSelection,
      scenarioId: "tno_1962",
      selectionVersion: 8,
      focusCountry: "FR",
      nowMs: nowMs + 3_000,
    }),
    false,
  );
  const versionChangedSelection = { evictableChunkIds: ["political.detail.a"] };
  assert.equal(
    applyZoomEndChunkProtectionToSelection(versionChangedSelection, baseLoadState, {
      reason: "scenario-apply",
      previousSelection,
      scenarioId: "tno_1962",
      selectionVersion: 9,
      focusCountry: "DE",
      nowMs: nowMs + 3_000,
    }),
    false,
  );
});

test("zoom-end retained political detail chunks stay in active merge payload", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const previousChunk = {
    id: "political.detail.previous",
    url: "political.detail.previous.json",
    layer: "political",
    lod: "detail",
    bounds: [-1, -1, 1, 1],
    countryCodes: ["DE"],
  };
  const nextChunk = {
    id: "political.detail.next",
    url: "political.detail.next.json",
    layer: "political",
    lod: "detail",
    bounds: [1, 1, 2, 2],
    countryCodes: ["DE"],
  };
  const previousPayload = {
    type: "FeatureCollection",
    features: [{ type: "Feature", id: "feature-previous", properties: {}, geometry: null }],
  };
  const nextPayload = {
    type: "FeatureCollection",
    features: [{ type: "Feature", id: "feature-next", properties: {}, geometry: null }],
  };
  const bundle = {
    manifest: { scenario_id: "tno_1962" },
    chunkRegistry: { byLayer: { political: [previousChunk, nextChunk] } },
    runtimeShell: { renderBudgetHints: { detail_zoom_threshold: 2 } },
    countriesPayload: { countries: { DE: { lookup_iso2: "DE" } } },
    chunkPayloadCacheById: {},
  };
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeSovereignCode: "DE",
    activeScenarioChunks: {
      scenarioId: "tno_1962",
      loadedChunkIds: [previousChunk.id],
      payloadByChunkId: {
        [previousChunk.id]: {
          layerKey: "political",
          payload: previousPayload,
        },
      },
      mergedLayerPayloads: { political: previousPayload },
      lruChunkIds: [previousChunk.id],
    },
    runtimeChunkLoadState: {
      shellStatus: "ready",
      selectionVersion: 1,
      lastSelection: {
        reason: "zoom-end",
        scenarioId: "tno_1962",
        requiredChunkIds: [previousChunk.id],
        optionalChunkIds: [],
        cacheOnlyChunkIds: [],
        retainedActiveChunkIds: [],
        selectionVersion: 1,
        focusCountry: "DE",
        recordedAt: Date.now(),
        zoomEndProtectionUntil: Date.now() + 5000,
      },
      layerSelectionSignatures: { political: previousChunk.id },
      mergedLayerPayloadCache: { political: previousPayload },
    },
    renderPerfMetrics: {},
    uiState: { developerMode: true },
    renderDiagnostics: { perfOverlayEnabled: true },
    zoomTransform: { k: 3 },
    getViewportGeoBoundsFn: () => [-2, -2, 3, 3],
  };

  globalThis.setTimeout = (callback) => {
    callback();
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    const controller = createScenarioChunkRuntimeController({
      runtimeState,
      getSearchParams: () => new URLSearchParams(),
      normalizeScenarioId: (value) => String(value || "").trim(),
      normalizeCountryCodeAlias: (value) => String(value || "").trim().toUpperCase(),
      normalizeScenarioFeatureCollection: (payload) => payload,
      getScenarioFeatureCollectionIdentityList: (payload) => (
        Array.isArray(payload?.features) ? payload.features.map((feature) => String(feature?.id || "")) : []
      ),
      areScenarioFeatureCollectionsEquivalent: () => false,
      getScenarioDefaultCountryCode: () => "DE",
      getScenarioBundleId: () => "tno_1962",
      getCachedScenarioBundle: () => bundle,
      getVisibleScenarioChunkLayers: () => ["political"],
      selectScenarioChunks: () => ({
        scenarioId: "tno_1962",
        requiredChunks: [nextChunk],
        optionalChunks: [],
        evictableChunkIds: [previousChunk.id],
        selectedFeatureCountSum: 1,
      }),
      mergeScenarioChunkPayloads: (_layerKey, payloads) => ({
        type: "FeatureCollection",
        features: payloads.flatMap((payload) => payload?.features || []),
      }),
      normalizeScenarioRenderBudgetHints: (value) => value || {},
      loadScenarioChunkFile: async () => ({ payload: nextPayload }),
      scenarioSupportsChunkedRuntime: () => true,
      scenarioBundleUsesChunkedLayer: (_bundle, layerKey = "") => !layerKey || layerKey === "political",
      getScenarioOptionalLayerConfig: () => null,
      syncScenarioLocalizationState: () => {},
      refreshMapDataForScenarioChunkPromotion: () => {},
      flushRenderBoundary: () => {},
      recordScenarioPerfMetric: () => {},
      ensureScenarioChunkRegistryLoaded: async () => {},
    });

    assert.equal(controller.scheduleScenarioChunkRefresh({ reason: "scenario-apply", delayMs: 0 }), "scheduled");
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }

    assert.deepEqual(runtimeState.runtimeChunkLoadState.lastSelection.cacheOnlyChunkIds, []);
    assert.deepEqual(runtimeState.runtimeChunkLoadState.lastSelection.retainedActiveChunkIds, [previousChunk.id]);
    assert.deepEqual(
      runtimeState.activeScenarioChunks.mergedLayerPayloads.political.features.map((feature) => feature.id),
      ["feature-previous", "feature-next"],
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("chunk promotion applies viewport-clipped political payload for primary recovery", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const politicalChunk = {
    id: "political.detail.viewport",
    layer: "political",
    lod: "detail",
    url: "viewport.json",
    bounds: [-180, -60, 180, 80],
    featureBounds: [
      [0, 0, 2, 2],
      [80, 40, 90, 50],
      [3, 3, 4, 4],
    ],
    featureCount: 3,
  };
  const fullPayload = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", id: "visible-a", properties: {}, geometry: null },
      { type: "Feature", id: "outside-b", properties: {}, geometry: null },
      { type: "Feature", id: "visible-c", properties: {}, geometry: null },
    ],
  };
  const bundle = {
    manifest: { scenario_id: "tno_1962" },
    chunkRegistry: { byLayer: { political: [politicalChunk] } },
    runtimeShell: { renderBudgetHints: {} },
    countriesPayload: { countries: {} },
    chunkPayloadCacheById: {},
  };
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeScenarioChunks: {
      scenarioId: "tno_1962",
      loadedChunkIds: [],
      payloadByChunkId: {},
      mergedLayerPayloads: {},
      lruChunkIds: [],
    },
    renderPerfMetrics: {},
    uiState: { developerMode: true },
    renderDiagnostics: { perfOverlayEnabled: true },
    zoomTransform: { k: 3 },
    getViewportGeoBoundsFn: () => [-1, -1, 5, 5],
    landData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", id: "full-land-a", properties: {}, geometry: null },
        { type: "Feature", id: "full-land-b", properties: {}, geometry: null },
        { type: "Feature", id: "full-land-c", properties: {}, geometry: null },
      ],
    },
  };
  const capturedPrimaryFeatureIds = [];
  let capturedLandDataFeatureIds = [];
  let capturedPrimaryVisibleFeatureCount = 0;
  let capturedPrimaryTotalFeatureCount = 0;

  globalThis.setTimeout = (callback) => {
    callback();
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    const controller = createScenarioChunkRuntimeController({
      runtimeState,
      getSearchParams: () => new URLSearchParams(),
      normalizeScenarioId: (value) => String(value || "").trim(),
      normalizeCountryCodeAlias: (value) => String(value || "").trim().toUpperCase(),
      normalizeScenarioFeatureCollection: (payload) => (
        Array.isArray(payload?.features)
          ? { type: "FeatureCollection", features: payload.features }
          : null
      ),
      getScenarioFeatureCollectionIdentityList: (payload) => (
        Array.isArray(payload?.features) ? payload.features.map((feature) => String(feature?.id || "")) : []
      ),
      areScenarioFeatureCollectionsEquivalent: (left, right) => {
        const leftIds = Array.isArray(left?.features) ? left.features.map((feature) => feature.id) : [];
        const rightIds = Array.isArray(right?.features) ? right.features.map((feature) => feature.id) : [];
        return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
      },
      getScenarioDefaultCountryCode: () => "",
      getScenarioBundleId: () => "tno_1962",
      getCachedScenarioBundle: () => bundle,
      getVisibleScenarioChunkLayers: () => ["political"],
      selectScenarioChunks: () => ({
        scenarioId: "tno_1962",
        requiredChunks: [politicalChunk],
        optionalChunks: [],
        evictableChunkIds: [],
        viewportBbox: [-1, -1, 5, 5],
        selectedFeatureCountSum: 3,
        selectedVisibleFeatureCountSum: 2,
        selectedPoliticalFeatureCountSum: 3,
        selectedPoliticalVisibleFeatureCountSum: 2,
        politicalVisibleFeatureSubsetSignature: "political.detail.viewport:0.2",
      }),
      mergeScenarioChunkPayloads: (_layerKey, payloads) => ({
        type: "FeatureCollection",
        features: payloads.flatMap((payload) => payload?.features || []),
      }),
      mergeScenarioChunkPayloadsForViewport,
      normalizeScenarioRenderBudgetHints: (value) => value || {},
      loadScenarioChunkFile: async () => ({ payload: fullPayload }),
      scenarioSupportsChunkedRuntime: () => true,
      scenarioBundleUsesChunkedLayer: (_bundle, layerKey = "") => !layerKey || layerKey === "political",
      getScenarioOptionalLayerConfig: () => null,
      syncScenarioLocalizationState: () => {},
      refreshMapDataForScenarioChunkPromotion: () => {
        capturedLandDataFeatureIds = (runtimeState.landData?.features || [])
          .map((feature) => feature.id);
        capturedPrimaryFeatureIds.push(
          ...(runtimeState.scenarioPoliticalVisibleChunkData?.features || [])
            .map((feature) => feature.id),
        );
        capturedPrimaryVisibleFeatureCount = Number(
          runtimeState.runtimeChunkLoadState?.pendingVisualPromotion?.primaryVisibleFeatureCount || 0,
        );
        capturedPrimaryTotalFeatureCount = Number(
          runtimeState.runtimeChunkLoadState?.pendingVisualPromotion?.primaryTotalFeatureCount || 0,
        );
      },
      flushRenderBoundary: () => {},
      recordScenarioPerfMetric: () => {},
      ensureScenarioChunkRegistryLoaded: async () => {},
    });

    assert.equal(controller.scheduleScenarioChunkRefresh({ reason: "viewport-primary", delayMs: 0 }), "scheduled");
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }

    assert.deepEqual(
      runtimeState.scenarioPoliticalChunkData.features.map((feature) => feature.id),
      ["visible-a", "outside-b", "visible-c"],
    );
    assert.deepEqual(
      runtimeState.scenarioPoliticalVisibleChunkData.features.map((feature) => feature.id),
      ["visible-a", "visible-c"],
    );
    assert.deepEqual(capturedLandDataFeatureIds, ["full-land-a", "full-land-b", "full-land-c"]);
    assert.deepEqual(capturedPrimaryFeatureIds, ["visible-a", "visible-c"]);
    assert.equal(capturedPrimaryVisibleFeatureCount, 2);
    assert.equal(capturedPrimaryTotalFeatureCount, 3);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("coarse prewarm keeps complete political payload for initial promotion", async () => {
  const politicalChunk = {
    id: "political.coarse.world",
    layer: "political",
    lod: "coarse",
    url: "political.coarse.world.json",
    bounds: [-180, -90, 180, 90],
    featureBounds: [
      [0, 0, 2, 2],
      [80, 40, 90, 50],
      [3, 3, 4, 4],
    ],
    featureCount: 3,
  };
  const fullPayload = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", id: "visible-a", properties: {}, geometry: null },
      { type: "Feature", id: "outside-b", properties: {}, geometry: null },
      { type: "Feature", id: "visible-c", properties: {}, geometry: null },
    ],
  };
  const bundle = {
    manifest: {
      scenario_id: "hoi4_1939",
      summary: { feature_count: 22502 },
      render_budget_hints: {},
      performance_hints: {},
    },
    chunkRegistry: { byLayer: { political: [politicalChunk] } },
    contextLodManifest: {},
    runtimeShell: { renderBudgetHints: {} },
    countriesPayload: { countries: {} },
    chunkPayloadCacheById: {},
  };
  const runtimeState = {
    activeScenarioId: "hoi4_1939",
    activeScenarioChunks: {
      scenarioId: "hoi4_1939",
      loadedChunkIds: [],
      payloadByChunkId: {},
      mergedLayerPayloads: {},
      lruChunkIds: [],
    },
    renderPerfMetrics: {},
    uiState: { developerMode: true },
    renderDiagnostics: { perfOverlayEnabled: true },
    zoomTransform: { k: 1 },
    getViewportGeoBoundsFn: () => [-1, -1, 5, 5],
    landData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", id: "full-land-a", properties: {}, geometry: null },
        { type: "Feature", id: "full-land-b", properties: {}, geometry: null },
        { type: "Feature", id: "full-land-c", properties: {}, geometry: null },
      ],
    },
  };
  let selectedViewportBbox = null;
  let capturedLandDataFeatureIds = [];

  const controller = createScenarioChunkRuntimeController({
    runtimeState,
    getSearchParams: () => new URLSearchParams(),
    normalizeScenarioId: (value) => String(value || "").trim(),
    normalizeCountryCodeAlias: (value) => String(value || "").trim().toUpperCase(),
    normalizeScenarioPerformanceHints: () => ({
      waterRegionsDefault: false,
      specialRegionsDefault: false,
      scenarioReliefOverlaysDefault: false,
      scenarioAtlantropaDefault: false,
    }),
    normalizeScenarioFeatureCollection: (payload) => (
      Array.isArray(payload?.features)
        ? { type: "FeatureCollection", features: payload.features }
        : null
    ),
    getScenarioFeatureCollectionIdentityList: (payload) => (
      Array.isArray(payload?.features) ? payload.features.map((feature) => String(feature?.id || "")) : []
    ),
    areScenarioFeatureCollectionsEquivalent: () => false,
    getScenarioDefaultCountryCode: () => "",
    getScenarioBundleId: () => "hoi4_1939",
    getCachedScenarioBundle: () => bundle,
    getVisibleScenarioChunkLayers: () => ["political"],
    selectScenarioChunks: ({ viewportBbox }) => {
      selectedViewportBbox = viewportBbox;
      return {
        scenarioId: "hoi4_1939",
        requiredChunks: [politicalChunk],
        optionalChunks: [],
        evictableChunkIds: [],
        viewportBbox,
        selectedFeatureCountSum: 3,
        selectedVisibleFeatureCountSum: 2,
        selectedPoliticalFeatureCountSum: 3,
        selectedPoliticalVisibleFeatureCountSum: 2,
        politicalVisibleFeatureSubsetSignature: "political.coarse.world:0.2",
      };
    },
    mergeScenarioChunkPayloads: (_layerKey, payloads) => ({
      type: "FeatureCollection",
      features: payloads.flatMap((payload) => payload?.features || []),
    }),
    mergeScenarioChunkPayloadsForViewport,
    normalizeScenarioRenderBudgetHints: (value) => value || {},
    loadScenarioChunkFile: async () => ({ payload: fullPayload }),
    scenarioSupportsChunkedRuntime: () => true,
    scenarioBundleUsesChunkedLayer: (_bundle, layerKey = "") => !layerKey || layerKey === "political",
    getScenarioOptionalLayerConfig: () => null,
    syncScenarioLocalizationState: () => {},
    refreshMapDataForScenarioChunkPromotion: () => {
      capturedLandDataFeatureIds = (runtimeState.landData?.features || [])
        .map((feature) => feature.id);
    },
    flushRenderBoundary: () => {},
    recordScenarioPerfMetric: () => {},
    ensureScenarioChunkRegistryLoaded: async () => {},
  });

  await controller.preloadScenarioCoarseChunks(bundle);

  assert.deepEqual(selectedViewportBbox, [-180, -90, 180, 90]);
  assert.deepEqual(
    runtimeState.scenarioPoliticalChunkData.features.map((feature) => feature.id),
    ["visible-a", "outside-b", "visible-c"],
  );
  assert.equal(runtimeState.scenarioPoliticalVisibleChunkData, null);
  assert.deepEqual(capturedLandDataFeatureIds, ["full-land-a", "full-land-b", "full-land-c"]);
});

test("zoom-end retained political detail chunks persist through exact-after-settle within TTL", async () => {
  const {
    applyZoomEndChunkProtectionToSelection,
  } = await import("../js/core/scenario/chunk_runtime.js");
  const nowMs = 10_000;
  const previousSelection = {
    reason: "scenario-apply",
    scenarioId: "tno_1962",
    requiredChunkIds: ["political.detail.next"],
    retainedActiveChunkIds: ["political.detail.previous"],
    selectionVersion: 4,
    focusCountry: "DE",
    recordedAt: nowMs,
    zoomEndProtectionUntil: nowMs + 5_000,
  };
  const selection = {
    evictableChunkIds: ["political.detail.previous", "political.detail.other"],
  };

  assert.equal(
    applyZoomEndChunkProtectionToSelection(selection, {}, {
      reason: "exact-after-settle",
      previousSelection,
      scenarioId: "tno_1962",
      selectionVersion: 4,
      focusCountry: "DE",
      nowMs: nowMs + 3_000,
    }),
    true,
  );
  assert.deepEqual(selection.evictableChunkIds, ["political.detail.other"]);
  assert.deepEqual(selection.retainedActiveChunkIds, ["political.detail.previous"]);
});

test("political raster worker result currentness includes viewport", async () => {
  const {
    createPoliticalRasterWorkerIdentity,
    isPoliticalRasterWorkerResultCurrent,
  } = await import("../js/core/political_raster_worker_client.js");
  const base = {
    scenarioId: "tno_1962",
    selectionVersion: 7,
    topologyRevision: 11,
    colorRevision: 13,
    transformBucket: "100:0:0",
    dpr: 1,
    viewport: { x: 0, y: 0, width: 800, height: 600 },
  };
  const requestIdentity = createPoliticalRasterWorkerIdentity(base);
  assert.equal(
    isPoliticalRasterWorkerResultCurrent(requestIdentity, createPoliticalRasterWorkerIdentity(base)),
    true,
  );
  assert.equal(
    isPoliticalRasterWorkerResultCurrent(
      requestIdentity,
      createPoliticalRasterWorkerIdentity({ ...base, viewport: { x: 80, y: 0, width: 800, height: 600 } }),
    ),
    false,
  );
});

test("political raster renderer request identity includes viewport and pass signature", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const workerClientSource = readRepoFile("js", "core", "political_raster_worker_client.js");
  const workerSource = readRepoFile("js", "workers", "political_raster.worker.js");
  const drawStart = rendererSource.indexOf("function drawPoliticalPass");
  const drawEnd = rendererSource.indexOf("function drawScenarioRegionOverlaysPass", drawStart);
  const drawSource = drawStart >= 0 && drawEnd > drawStart
    ? rendererSource.slice(drawStart, drawEnd)
    : "";

  assert.ok(drawSource.includes("const [canvasWidth, canvasHeight] = getLogicalCanvasDimensions();"));
  assert.ok(/createPoliticalRasterWorkerIdentity\(\{[\s\S]*?selectionVersion: Number\(loadState\?\.selectionVersion \|\| 0\),[\s\S]*?topologyRevision: Number\(runtimeState\.topologyRevision \|\| 0\),[\s\S]*?colorRevision: Number\(runtimeState\.colorRevision \|\| 0\),[\s\S]*?transformBucket: getTransformBucketSignature\(transform\),[\s\S]*?dpr: Number\(runtimeState\.dpr \|\| 1\),/.test(drawSource));
  assert.ok(/viewport: \{[\s\S]*?width: canvasWidth,[\s\S]*?height: canvasHeight,[\s\S]*?right: canvasWidth,[\s\S]*?bottom: canvasHeight,[\s\S]*?\}/.test(drawSource));
  assert.ok(drawSource.includes('passSignature: getRenderPassSignature("political", transform),'));
  assert.ok(/requestPoliticalRasterWorkerPass\(\{[\s\S]*?identity: workerIdentity,[\s\S]*?canvasPxWidth: Math\.max\(0, Math\.round\(canvasWidth \* Number\(runtimeState\.dpr \|\| 1\)\)\),[\s\S]*?canvasPxHeight: Math\.max\(0, Math\.round\(canvasHeight \* Number\(runtimeState\.dpr \|\| 1\)\)\),/.test(drawSource));
  assert.ok(/function normalizeViewportIdentity\(viewport = null\)[\s\S]*?\["x", "y", "width", "height", "left", "top", "right", "bottom"\]/.test(workerClientSource));
  assert.ok(/String\(request\.passSignature \|\| ""\) === String\(current\.passSignature \|\| ""\)/.test(workerClientSource));
  assert.ok(/normalizeViewportIdentity\(request\.viewport\) === normalizeViewportIdentity\(current\.viewport\)/.test(workerClientSource));
  assert.ok(workerSource.includes("passSignature: String(identity.passSignature || \"\")"));
  assert.ok(workerSource.includes("viewport: identity.viewport || null"));
});

test("startup render samples expose hot-path details", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const renderStart = rendererSource.indexOf("function render()");
  const renderEnd = rendererSource.indexOf("function autoFillMap(", renderStart);
  const renderSource = renderStart >= 0 && renderEnd > renderStart
    ? rendererSource.slice(renderStart, renderEnd)
    : "";

  assert.ok(renderSource.includes("const metricSequenceStartedAt = startedAt > 0"));
  assert.ok(renderSource.includes('politicalBgMs: readRenderPerfMetricDuration("drawPoliticalBackgroundFillsPass", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalRecoveryQuality: readRenderPerfMetricString("drawPoliticalBackgroundFillsPass", "recoveryQuality", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgProgressive: readRenderPerfMetricBoolean("drawPoliticalBackgroundFillsPass", "progressive", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgDeferredFullCacheScheduled: readRenderPerfMetricBoolean("drawPoliticalBackgroundFillsPass", "deferredFullCacheScheduled", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgDeferredFullCacheReady: readRenderPerfMetricBoolean("drawPoliticalBackgroundFillsPass", "deferredFullCacheReady", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCacheBuildMs: readRenderPerfMetricDuration("scenarioPoliticalBackgroundCacheBuild", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCacheEntryCount: readRenderPerfMetricNumber("scenarioPoliticalBackgroundCacheBuild", "entryCount", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCacheBuiltPathCount: readRenderPerfMetricNumber("scenarioPoliticalBackgroundCacheBuild", "builtPathCount", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCachePathCacheSizeBefore: readRenderPerfMetricNumber("scenarioPoliticalBackgroundCacheBuild", "pathCacheSizeBefore", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCachePathCacheSizeAfter: readRenderPerfMetricNumber("scenarioPoliticalBackgroundCacheBuild", "pathCacheSizeAfter", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgCachePathCacheResetPreviousReason: readRenderPerfMetricString("scenarioPoliticalBackgroundCacheBuild", "pathCacheResetPreviousReason", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgDeferredFullCacheBuildMs: readRenderPerfMetricDuration("scenarioPoliticalBackgroundDeferredFullCacheBuild", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgDeferredFullCacheEntryCount: readRenderPerfMetricNumber("scenarioPoliticalBackgroundDeferredFullCacheBuild", "entryCount", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalBgDeferredFullCacheBuiltPathCount: readRenderPerfMetricNumber("scenarioPoliticalBackgroundDeferredFullCacheBuild", "builtPathCount", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('politicalFeatureFillMs: readRenderPerfMetricDuration("drawPoliticalFeatureFillLoop", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('contextScenarioMs: readRenderPerfMetricDuration("drawContextScenarioPass", metricSequenceStartedAt)'));
  assert.ok(renderSource.includes('hitCanvasMs: readRenderPerfMetricDuration("buildHitCanvas", metricSequenceStartedAt)'));
});

test("render perf metric sequence filter excludes previous-frame metrics", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const match = rendererSource.match(/function readRenderPerfMetricDuration\(metricName, minSequence = 0\) \{[\s\S]*?\n\}/);
  assert.ok(match, "readRenderPerfMetricDuration should stay available for render sample filtering");
  const readRenderPerfMetricDuration = Function(
    "runtimeState",
    `${match[0]}; return readRenderPerfMetricDuration;`,
  )({
    renderPerfMetrics: {
      previousFrame: {
        durationMs: 33,
        sequence: 10,
      },
      currentFrame: {
        durationMs: 44,
        sequence: 11,
      },
      missingSequence: {
        durationMs: 55,
      },
    },
  });

  assert.equal(readRenderPerfMetricDuration("previousFrame", 10), 0);
  assert.equal(readRenderPerfMetricDuration("currentFrame", 10), 44);
  assert.equal(readRenderPerfMetricDuration("previousFrame", 9), 33);
  assert.equal(readRenderPerfMetricDuration("missingSequence", 10), 0);

  const numberMatch = rendererSource.match(/function readRenderPerfMetricNumber\(metricName, fieldName, minSequence = 0\) \{[\s\S]*?\n\}/);
  assert.ok(numberMatch, "readRenderPerfMetricNumber should share the render sample sequence filter");
  const readRenderPerfMetricNumber = Function(
    "runtimeState",
    `${numberMatch[0]}; return readRenderPerfMetricNumber;`,
  )({
    renderPerfMetrics: {
      previousFrame: {
        entryCount: 77,
        sequence: 10,
      },
      currentFrame: {
        entryCount: 88,
        sequence: 11,
      },
    },
  });
  assert.equal(readRenderPerfMetricNumber("previousFrame", "entryCount", 10), 0);
  assert.equal(readRenderPerfMetricNumber("currentFrame", "entryCount", 10), 88);

  const stringMatch = rendererSource.match(/function readRenderPerfMetricString\(metricName, fieldName, minSequence = 0\) \{[\s\S]*?\n\}/);
  assert.ok(stringMatch, "readRenderPerfMetricString should share the render sample sequence filter");
  const readRenderPerfMetricString = Function(
    "runtimeState",
    `${stringMatch[0]}; return readRenderPerfMetricString;`,
  )({
    renderPerfMetrics: {
      previousFrame: {
        reason: "old",
        sequence: 10,
      },
      currentFrame: {
        reason: "current",
        sequence: 11,
      },
    },
  });
  assert.equal(readRenderPerfMetricString("previousFrame", "reason", 10), "");
  assert.equal(readRenderPerfMetricString("currentFrame", "reason", 10), "current");

  const booleanMatch = rendererSource.match(/function readRenderPerfMetricBoolean\(metricName, fieldName, minSequence = 0\) \{[\s\S]*?\n\}/);
  assert.ok(booleanMatch, "readRenderPerfMetricBoolean should share the render sample sequence filter");
  const readRenderPerfMetricBoolean = Function(
    "runtimeState",
    `${booleanMatch[0]}; return readRenderPerfMetricBoolean;`,
  )({
    renderPerfMetrics: {
      previousFrame: {
        progressive: true,
        sequence: 10,
      },
      currentFrame: {
        progressive: true,
        sequence: 11,
      },
    },
  });
  assert.equal(readRenderPerfMetricBoolean("previousFrame", "progressive", 10), false);
  assert.equal(readRenderPerfMetricBoolean("currentFrame", "progressive", 10), true);
});

test("political path cache reset exposes invalidation reason and previous size", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const invalidateBody = rendererSource.match(/function invalidatePoliticalPathCache\(reason = "unspecified"\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(invalidateBody.includes('recordRenderPerfMetric("politicalPathCacheReset"'));
  assert.ok(invalidateBody.includes("previousSize"));
  assert.ok(invalidateBody.includes("previousSignature"));
  assert.ok(invalidateBody.includes("previousReason"));

  const handleBody = rendererSource.match(/function getPoliticalPathCacheHandle\([\s\S]*?\n\}/)?.[0] || "";
  assert.ok(handleBody.includes('recordRenderPerfMetric("politicalPathCacheReset"'));
  assert.ok(handleBody.includes('reason: "prepare-mismatch"'));
  assert.ok(handleBody.includes("nextSignature: signature"));
  const signatureBody = rendererSource.match(/function getPoliticalPathCacheSignature\([\s\S]*?\n\}/)?.[0] || "";
  [
    "getPoliticalPassStaticSignature(transform)",
    "getProjectionRenderSignature()",
    "getViewportRenderSignature()",
    "String(runtimeState.activeScenarioId || \"\")",
    "\"ownership\"",
    "Number(runtimeState.sovereigntyRevision || 0)",
    "Number(runtimeState.scenarioShellOverlayRevision || 0)",
  ].forEach((signatureInput) => {
    assert.ok(signatureBody.includes(signatureInput), `political path cache signature should include ${signatureInput}`);
  });
  assert.ok(rendererSource.includes("runtimeState.topologyRevision || 0"));
  const entryBody = rendererSource.match(/function buildPoliticalFeaturePathEntry\(feature\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(entryBody.includes("path: new globalThis.Path2D(pathString)"));
  assert.equal(entryBody.includes("featureRef"), false);
  assert.equal(entryBody.includes("projectionSignature"), false);
  const getEntryBody = rendererSource.match(/function getPoliticalFeaturePathEntry\([\s\S]*?\n\}/)?.[0] || "";
  assert.ok(getEntryBody.includes("if (cachedEntry?.path)"));
  assert.ok(rendererSource.includes("pathCacheSizeBefore"));
  assert.ok(rendererSource.includes("pathCacheSizeAfter"));
  assert.ok(rendererSource.includes("pathCacheResetReason"));
  assert.ok(rendererSource.includes("pathCacheResetPreviousSize"));
  assert.ok(rendererSource.includes("pathCacheResetPreviousReason"));
});

test("frame scheduler keeps high-priority exact slices draining under continuous input pressure", async () => {
  const scheduler = await import("../js/core/frame_scheduler.js");
  const originalNavigator = globalThis.navigator;
  let inputPending = true;
  const pendingHighQueueLengths = [];
  const calls = [];
  const totalHighTasks = 6;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      scheduling: {
        isInputPending: ({ includeContinuous } = {}) => includeContinuous ? inputPending : false,
      },
    },
  });
  try {
    for (let index = 0; index < totalHighTasks; index += 1) {
      scheduler.enqueueFrameTask(() => {
        calls.push(`high-${index}`);
      }, { priority: "high", label: `exact-slice-high-${index}` });
    }
    scheduler.enqueueFrameTask(() => {
      calls.push("normal");
    }, { priority: "normal", label: "exact-slice-normal" });
    for (let frame = 0; frame < totalHighTasks; frame += 1) {
      const queueBefore = scheduler.getFrameSchedulerQueueLength({ byPriority: true });
      pendingHighQueueLengths.push(queueBefore.high);
      scheduler.runFrameTasks(1);
    }
    const queueAfterPressure = scheduler.getFrameSchedulerQueueLength({ byPriority: true });
    assert.equal(calls.includes("normal"), false);
    assert.equal(queueAfterPressure.high < pendingHighQueueLengths[0], true);
    assert.equal(queueAfterPressure.high, 0);
    for (let index = 1; index < pendingHighQueueLengths.length; index += 1) {
      assert.equal(
        pendingHighQueueLengths[index] <= pendingHighQueueLengths[index - 1],
        true,
        `high queue should keep converging by frame ${index}`,
      );
    }
    assert.equal(queueAfterPressure.normal, 1);

    inputPending = false;
    scheduler.runFrameTasks(8);
    const queueAfterRelease = scheduler.getFrameSchedulerQueueLength({ byPriority: true });
    assert.equal(queueAfterRelease.total, 0);
    assert.equal(calls[calls.length - 1], "normal");
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
});

test("frame scheduler defers high tasks for discrete input and dedupes label generation", async () => {
  const scheduler = await import("../js/core/frame_scheduler.js");
  const originalNavigator = globalThis.navigator;
  const calls = [];
  let discreteInputPending = true;
  let continuousInputPending = true;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      scheduling: {
        isInputPending: ({ includeContinuous } = {}) => includeContinuous ? continuousInputPending : discreteInputPending,
      },
    },
  });
  try {
    scheduler.enqueueFrameTask(() => {
      calls.push("deduped");
    }, { priority: "high", label: "exact-after-settle-Apply", generation: 42, dedupe: true });
    scheduler.enqueueFrameTask(() => {
      calls.push("deduped-again");
    }, { priority: "high", label: "exact-after-settle-Apply", generation: 42, dedupe: true });
    scheduler.enqueueFrameTask(() => {
      calls.push("deferred-context");
    }, { priority: "high", label: "deferred-exact-context-pass-contextScenario", generation: 43, dedupe: true });
    const queued = scheduler.getFrameSchedulerQueueLength({ byPriority: true, byLabelGeneration: true });
    assert.equal(queued.high, 2);
    assert.equal(queued.byLabelGeneration["exact-after-settle-Apply:42"], 1);
    assert.equal(queued.byLabelGeneration["deferred-exact-context-pass-contextScenario:43"], 1);

    scheduler.runFrameTasks(8);
    assert.deepEqual(calls, []);
    assert.equal(scheduler.getFrameSchedulerQueueLength({ byPriority: true }).high, 2);

    discreteInputPending = false;
    scheduler.runFrameTasks(8);
    assert.deepEqual(calls, ["deduped", "deferred-context"]);
    assert.equal(scheduler.getFrameSchedulerQueueLength({ byPriority: true }).total, 0);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
});



test("political raster worker flag-on metadata path records accepted and stale counters", async () => {
  const workerClient = await import("../js/core/political_raster_worker_client.js");
  const originalWorker = globalThis.Worker;
  const originalLocation = globalThis.location;
  const originalMetrics = globalThis.__mc_politicalRasterWorkerMetrics;
  const postedMessages = [];
  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }
    postMessage(message) {
      postedMessages.push(message);
      this.lastMessage = message;
    }
    terminate() {
      this.terminated = true;
    }
  }
  try {
    workerClient.terminatePoliticalRasterWorker();
    delete globalThis.__mc_politicalRasterWorkerMetrics;
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: FakeWorker,
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { search: "?political_raster_worker=1" },
    });
    workerClient.refreshPoliticalRasterWorkerFlag("?political_raster_worker=1");
    const baseIdentity = workerClient.createPoliticalRasterWorkerIdentity({
      scenarioId: "tno_1962",
      selectionVersion: 1,
      topologyRevision: 2,
      colorRevision: 3,
      transformBucket: "100:0:0",
      dpr: 1,
      viewport: { x: 0, y: 0, width: 800, height: 600 },
      passSignature: "political-a",
    });
    const queuedA = workerClient.requestPoliticalRasterWorkerPass({ identity: baseIdentity });
    assert.equal(queuedA.ok, true);
    assert.equal(postedMessages[0].type, "RASTER_POLITICAL_PASS");
    assert.equal(postedMessages[0].protocolVersion, 2);
    assert.equal(postedMessages[0].identity.passSignature, "political-a");

    const freshIdentity = workerClient.createPoliticalRasterWorkerIdentity({
      ...baseIdentity,
      colorRevision: 4,
      passSignature: "political-b",
    });
    const queuedB = workerClient.requestPoliticalRasterWorkerPass({ identity: freshIdentity });
    assert.equal(queuedB.ok, true);
    let metrics = workerClient.ensurePoliticalRasterWorkerMetrics(globalThis);
    assert.equal(metrics.staleResponseCount, 1);
    assert.equal(metrics.rejectedStaleCount, 1);
    assert.equal(metrics.fallbackCount, 0);

    FakeWorker.instance.onmessage({
      data: {
        protocolVersion: 2,
        type: "RASTER_RESULT",
        taskId: queuedB.taskId,
        accepted: true,
        identity: freshIdentity,
        reason: "metadata-only",
        rasterMs: 2,
        encodeMs: 0,
        decodeMs: 0,
        blitMs: 0,
      },
    });
    metrics = workerClient.ensurePoliticalRasterWorkerMetrics(globalThis);
    assert.equal(metrics.acceptedCount, 1);
    assert.equal(metrics.lastReason, "metadata-only");
    assert.equal(metrics.fallbackCount, 0);
  } finally {
    workerClient.terminatePoliticalRasterWorker();
    if (originalWorker === undefined) {
      delete globalThis.Worker;
    } else {
      Object.defineProperty(globalThis, "Worker", { configurable: true, value: originalWorker });
    }
    if (originalLocation === undefined) {
      delete globalThis.location;
    } else {
      Object.defineProperty(globalThis, "location", { configurable: true, value: originalLocation });
    }
    if (originalMetrics === undefined) {
      delete globalThis.__mc_politicalRasterWorkerMetrics;
    } else {
      globalThis.__mc_politicalRasterWorkerMetrics = originalMetrics;
    }
    workerClient.refreshPoliticalRasterWorkerFlag("");
  }
});

test("political raster worker flag parser accepts both explicit keys", async () => {
  const workerClient = await import("../js/core/political_raster_worker_client.js");
  assert.equal(workerClient.refreshPoliticalRasterWorkerFlag("?political_raster_worker=1"), true);
  assert.equal(workerClient.refreshPoliticalRasterWorkerFlag("?ENABLE_POLITICAL_RASTER_WORKER=yes"), true);
  assert.equal(workerClient.refreshPoliticalRasterWorkerFlag("?political_raster_worker=0"), false);
  assert.equal(workerClient.refreshPoliticalRasterWorkerFlag(""), false);
});

test("interaction composite continuity only tolerates selection and topology drift", () => {
  const identity = {
    scenarioId: "tno_1962",
    selectionVersion: 2,
    contextFlagSignature: "water:on|context:on",
    topologyRevision: 7,
    dpr: 2,
    pixelWidth: 1600,
    pixelHeight: 900,
    colorRevision: 4,
  };
  const referenceTransform = { x: 0, y: 0, k: 1 };
  const createHarness = (compositeOverrides = {}, signatureOverrides = {}) => {
    const cache = {
      signatures: {
        political: "political-v1",
        contextScenario: "context-v1",
        ...signatureOverrides,
      },
      referenceTransform,
      referenceTransforms: {
        political: referenceTransform,
        contextScenario: referenceTransform,
      },
      interactionComposite: {
        valid: true,
        canvas: {},
        referenceTransform,
        signature: "political@political-v1@ref|contextScenario@context-v1@ref",
        ...identity,
        ...compositeOverrides,
      },
    };
    const owner = createRenderCacheOwner({
      constants: {
        interactionCompositePassNames: ["political", "contextScenario"],
        renderPassNames: [],
      },
      helpers: {
        cloneZoomTransform: (transform) => ({ ...(transform || {}) }),
        ensureRenderPassCacheState: () => cache,
        getTransformSignature: () => "ref",
        getVisibleFrameIdentity: () => identity,
      },
    });
    return owner;
  };

  const continuity = createHarness({
    selectionVersion: 1,
    topologyRevision: 6,
  }).getInteractionCompositeReuseDecision(referenceTransform, undefined, {
    allowSelectionTopologyContinuity: true,
  });
  assert.equal(continuity.ok, true);
  assert.equal(continuity.mode, "continuity");
  assert.deepEqual(continuity.reasons, ["selection-version-mismatch", "topology-revision-mismatch"]);

  [
    ["scenario mismatch", { scenarioId: "hoi4_1939" }, {}],
    ["context mismatch", { contextFlagSignature: "water:off" }, {}],
    ["dpr mismatch", { dpr: 1 }, {}],
    ["canvas size mismatch", { pixelWidth: 1599 }, {}],
    ["color mismatch", { colorRevision: 3 }, {}],
    ["signature mismatch", {}, { political: "political-v2" }],
  ].forEach(([label, compositeOverrides, signatureOverrides]) => {
    const decision = createHarness(compositeOverrides, signatureOverrides)
      .getInteractionCompositeReuseDecision(referenceTransform, undefined, {
        allowSelectionTopologyContinuity: true,
      });
    assert.equal(decision.ok, false, label);
    assert.equal(decision.mode, "reject", label);
  });
});
