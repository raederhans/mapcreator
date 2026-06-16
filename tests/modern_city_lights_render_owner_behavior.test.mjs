import test from "node:test";
import assert from "node:assert/strict";
import { createModernCityLightsRenderOwner } from "../js/core/renderer/modern_city_lights_render_owner.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stableJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }
  return JSON.stringify(sorted);
}

function createCanvasContext(width = 1600, height = 1200) {
  return {
    canvas: {
      width,
      height,
      ownerDocument: {
        createElement: () => createCanvasContext(width, height).canvas,
      },
    },
  };
}

function createOwner(overrides = {}) {
  const urbanFeature = { properties: { id: "urban-1", area_sqkm: 10 } };
  const cityCollection = {
    type: "FeatureCollection",
    features: [
      { properties: { id: "matched", __city_population: 500000, capitalScore: 0 } },
      { properties: { id: "capital", __city_population: 90000, capitalScore: 2 } },
    ],
  };
  const state = overrides.state || {};
  state.activeScenarioId ??= "scenario-a";
  state.cityLayerRevision ??= 4;
  state.contextLayerRevision ??= 3;
  state.dpr ??= 2;
  state.height ??= 600;
  state.intensityFields ??= { channels: { urbanGlow: { revision: 7 } } };
  state.topologyRevision ??= 2;
  state.urbanData ??= { type: "FeatureCollection", features: [urbanFeature] };
  state.width ??= 800;
  state.zoomTransform ??= { x: 10, y: 20, k: 2 };
  const context = overrides.context || createCanvasContext();
  const policyOwner = {
    getUrbanFeatureIndex: () => new Map(),
    getCityUrbanRuntimeInfo: (feature) => (
      feature?.properties?.id === "matched"
        ? { hasUrbanMatch: true, urbanMatchId: "urban-1", urbanFeature }
        : { hasUrbanMatch: false }
    ),
  };
  return createModernCityLightsRenderOwner({
    state,
    constants: {
      MODERN_CITY_LIGHTS_BASE_THRESHOLD: 10,
      MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD: 14,
      MODERN_CITY_LIGHTS_GRID: [0, 12, 15, 20],
      MODERN_CITY_LIGHTS_GRID_HEIGHT: 2,
      MODERN_CITY_LIGHTS_GRID_WIDTH: 2,
      MODERN_CITY_LIGHTS_STATS: { p90: 20, max: 255 },
      MODERN_CITY_LIGHTS_STEP_LAT_DEG: 90,
      MODERN_CITY_LIGHTS_STEP_LON_DEG: 180,
    },
    getters: {
      getContext: () => context,
      getPathCanvas: () => {},
      getProjection: () => ([lon, lat]) => [lon + 180, 90 - lat],
    },
    helpers: {
      clamp,
      ColorManager: {
        normalizeHexColor: (color) => (/^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null),
        hexToRgb: (hex) => ({
          r: Number.parseInt(hex.slice(1, 3), 16),
          g: Number.parseInt(hex.slice(3, 5), 16),
          b: Number.parseInt(hex.slice(5, 7), 16),
        }),
      },
      createCanvas: (width, height, targetContext) => (
        targetContext?.canvas?.ownerDocument?.createElement?.("canvas") || createCanvasContext(width, height).canvas
      ),
      getCityCapitalScore: (feature) => Number(feature?.properties?.capitalScore || 0),
      getDefaultZoomTransform: () => ({ x: 0, y: 0, k: 1 }),
      getEffectiveCityCollection: () => cityCollection,
      getModernCityLightsProjectionKey: () => "projection-a",
      getTransformSignature: (transform) => `${transform.x}:${transform.y}:${transform.k}`,
      getUrbanCityPolicyOwner: () => policyOwner,
      normalizeDayNightStyleConfig: (config = {}) => ({
        cityLightsCorridorStrength: 0.5,
        cityLightsCoreSharpness: 0.4,
        cityLightsIntensity: 0.8,
        cityLightsPopulationBoostEnabled: true,
        cityLightsPopulationBoostStrength: 0.6,
        cityLightsTextureOpacity: 0.7,
        ...config,
      }),
      normalizeIntensityFieldsState: (fields) => fields,
      normalizeLongitude: (value) => value,
      stableJson,
      stringHash: (value) => {
        let hash = 0;
        for (const char of String(value || "")) {
          hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
        }
        return Math.abs(hash);
      },
    },
  });
}

test("modern city lights owner keeps color helpers deterministic", () => {
  const owner = createOwner();

  assert.deepEqual(owner.getLightBlobRgb("#336699"), { r: 51, g: 102, b: 153 });
  assert.deepEqual(owner.getLightBlobRgb("invalid"), { r: 255, g: 255, b: 255 });
  assert.equal(owner.toRgbaString({ r: 1, g: 2, b: 3 }, 2), "rgba(1, 2, 3, 1)");
});

test("modern city lights owner culls entries outside the viewport", () => {
  const owner = createOwner();

  assert.equal(owner.shouldCullModernLightEntry({ x: 50, y: 50 }, 10), false);
  assert.equal(owner.shouldCullModernLightEntry({ x: -200, y: 50 }, 10), true);
});

test("modern city lights owner caches population boost data by current renderer state", () => {
  const state = { cityLayerRevision: 4 };
  const owner = createOwner({ state });

  const first = owner.getModernCityLightsPopulationBoostData();
  const second = owner.getModernCityLightsPopulationBoostData();
  const firstUrbanEntries = first.urbanEntries;
  const firstCityEntries = first.cityEntries;

  assert.equal(first, second);
  assert.equal(first.urbanEntries.length, 1);
  assert.equal(first.urbanEntries[0].urbanId, "urban-1");
  assert.equal(first.urbanEntries[0].populationSum, 500000);
  assert.equal(first.urbanEntries[0].density, 50000);
  assert.equal(first.cityEntries.length, 1);
  assert.equal(first.cityEntries[0].feature.properties.id, "capital");

  state.cityLayerRevision = 5;
  const afterRevisionChange = owner.getModernCityLightsPopulationBoostData();
  assert.equal(afterRevisionChange, first);
  assert.notEqual(afterRevisionChange.urbanEntries, firstUrbanEntries);
  assert.notEqual(afterRevisionChange.cityEntries, firstCityEntries);
  assert.equal(afterRevisionChange.cityLayerRevision, 5);

  const revisionUrbanEntries = afterRevisionChange.urbanEntries;
  state.activeScenarioId = "scenario-b";
  const afterScenarioChange = owner.getModernCityLightsPopulationBoostData();
  assert.equal(afterScenarioChange, afterRevisionChange);
  assert.notEqual(afterScenarioChange.urbanEntries, revisionUrbanEntries);
  assert.equal(afterScenarioChange.scenarioId, "scenario-b");
});

test("modern city lights owner static layer key includes render invalidation inputs", () => {
  const state = {
    cityLayerRevision: 4,
    contextLayerRevision: 3,
    intensityFields: { channels: { urbanGlow: { revision: 7 } } },
    topologyRevision: 2,
  };
  const owner = createOwner({ state });
  const key = owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 });

  assert.ok(key.includes("1600::1200::2.000"));
  assert.match(key, /10:20:2/);
  assert.match(key, /projection-a/);
  assert.match(key, /scenario-a/);
  assert.match(key, /field:urbanGlow:7/);
  assert.match(key, /"intensity":"1\.100"/);

  state.topologyRevision = 20;
  assert.notEqual(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 }), key);
  state.topologyRevision = 2;

  state.contextLayerRevision = 30;
  assert.notEqual(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 }), key);
  state.contextLayerRevision = 3;

  state.cityLayerRevision = 40;
  assert.notEqual(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 }), key);
  state.cityLayerRevision = 4;

  state.intensityFields = { channels: { urbanGlow: { revision: 70 } } };
  assert.notEqual(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 }), key);

  assert.notEqual(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.2 }), key);
});

test("modern city lights owner static layer key tolerates missing intensity channels", () => {
  const state = {
    cityLayerRevision: 4,
    contextLayerRevision: 3,
    intensityFields: {},
    topologyRevision: 2,
  };
  const owner = createOwner({ state });

  assert.match(owner.getModernCityLightsStaticLayerKey({ cityLightsIntensity: 1.1 }), /field:urbanGlow:0/);
});
