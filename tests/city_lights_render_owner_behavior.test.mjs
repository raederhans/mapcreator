import test from "node:test";
import assert from "node:assert/strict";
import { createCityLightsRenderOwner } from "../js/core/renderer/city_lights_render_owner.js";
import { normalizeDayNightStyleConfig } from "../js/core/state_defaults.js";

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
  const cityCollection = overrides.cityCollection || {
    type: "FeatureCollection",
    features: [
      { properties: { id: "matched", __city_population: 500000, capitalScore: 0, lon: 10, lat: 20 } },
      {
        properties: {
          id: "capital",
          __city_population: 90000,
          __city_is_country_capital: true,
          capitalScore: 2,
          lon: 30,
          lat: 40,
          name_ascii: "Fallback Capital",
        },
      },
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
  const projection = ([lon, lat]) => [lon + 180, 90 - lat];
  projection.scale = () => 1;
  projection.translate = () => [2, 3];
  projection.center = () => [4, 5];
  projection.rotate = () => [6, 7, 8];
  return createCityLightsRenderOwner({
    state,
    assets: {
      HISTORICAL_1930_CITY_LIGHTS_ENTRIES: overrides.historicalEntries || [],
      HISTORICAL_DERIVED_GLOW_MAX_ENTRIES: 2,
      HISTORICAL_DERIVED_GLOW_MIN_WEIGHT: 0.62,
      MODERN_CITY_LIGHTS_BASE_THRESHOLD: 10,
      MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD: 14,
      MODERN_CITY_LIGHTS_GRID: [0, 12, 15, 20],
      MODERN_CITY_LIGHTS_GRID_HEIGHT: 2,
      MODERN_CITY_LIGHTS_GRID_WIDTH: 2,
      MODERN_CITY_LIGHTS_STATS: { p90: 20, max: 255 },
      MODERN_CITY_LIGHTS_STEP_LAT_DEG: 90,
      MODERN_CITY_LIGHTS_STEP_LON_DEG: 180,
      ...overrides.assets,
    },
    getters: {
      getContext: () => context,
      getPathCanvas: () => {},
      getProjection: () => projection,
      ...overrides.getters,
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
      getCityGeoCoordinates: (feature) => [feature.properties.lon, feature.properties.lat],
      getDefaultZoomTransform: () => ({ x: 0, y: 0, k: 1 }),
      getEffectiveCityCollection: () => cityCollection,
      getTransformSignature: (transform) => `${transform.x}:${transform.y}:${transform.k}`,
      getUrbanCityPolicyOwner: () => policyOwner,
      normalizeDayNightStyleConfig,
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
      ...overrides.helpers,
    },
  });
}

function createDispatchProbe() {
  const calls = [];
  const context = {
    canvas: createCanvasContext().canvas,
    beginPath: () => calls.push("begin-path"),
    clip: () => calls.push("clip"),
    drawImage: () => calls.push("modern-draw-image"),
    ellipse: () => calls.push("historical-ellipse"),
    fill: () => calls.push("fill"),
    restore: () => calls.push("restore"),
    save: () => calls.push("save"),
    setTransform: () => calls.push("set-transform"),
  };
  const owner = createOwner({
    assets: {
      MODERN_CITY_LIGHTS_GRID: [],
      MODERN_CITY_LIGHTS_GRID_HEIGHT: 0,
      MODERN_CITY_LIGHTS_GRID_WIDTH: 0,
    },
    cityCollection: { type: "FeatureCollection", features: [] },
    context,
    historicalEntries: [
      {
        lon: 12,
        lat: 34,
        weight: 0.9,
        capitalKind: "country_capital",
        population: 1000,
        nameAscii: "Historical Probe",
      },
    ],
    getters: {
      getPathCanvas: () => () => calls.push("night-mask-path"),
    },
    helpers: {
      buildNightHemisphereFeature: () => ({ type: "Feature" }),
      createCanvas: () => {
        calls.push("modern-static-canvas-create");
        return null;
      },
    },
  });
  return { calls, owner };
}

function drawWithNormalizedConfig(owner, rawConfig) {
  const config = normalizeDayNightStyleConfig(rawConfig);
  owner.drawNightLightsLayer(1, config, {});
  return config;
}

test("city lights dispatcher reaches the modern draw body through the real config normalizer", () => {
  const rawConfigs = [
    {},
    { cityLightsStyle: "unknown" },
    { cityLightsStyle: " MODERN " },
  ];
  for (const rawConfig of rawConfigs) {
    const { calls, owner } = createDispatchProbe();

    const config = drawWithNormalizedConfig(owner, rawConfig);

    assert.equal(config.cityLightsEnabled, true);
    assert.equal(config.cityLightsStyle, "modern");
    assert.equal(config.cityLightsIntensity, 1.15);
    assert.equal(calls.filter((call) => call === "modern-static-canvas-create").length, 1);
    assert.equal(calls.includes("historical-ellipse"), false);
  }
});

test("city lights dispatcher reaches the historical draw body through the real config normalizer", () => {
  for (const style of ["historical_1930s", " Historical_1930s ", " HISTORICAL_1930S "]) {
    const { calls, owner } = createDispatchProbe();

    const config = drawWithNormalizedConfig(owner, { cityLightsStyle: style });

    assert.equal(config.cityLightsStyle, "historical_1930s");
    assert.ok(calls.filter((call) => call === "historical-ellipse").length >= 2, style);
    assert.equal(calls.includes("modern-static-canvas-create"), false, style);
  }
});

test("city lights dispatcher exits silently for disabled and null config", () => {
  {
    const { calls, owner } = createDispatchProbe();
    owner.drawNightLightsLayer(1, null, {});
    assert.deepEqual(calls, []);
  }
  {
    const { calls, owner } = createDispatchProbe();
    const config = drawWithNormalizedConfig(owner, { cityLightsEnabled: false });
    assert.equal(config.cityLightsEnabled, false);
    assert.deepEqual(calls, []);
  }
});

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
  assert.match(key, /800\|600\|1\.0000\|2\.00\|3\.00\|4\.00\|5\.00\|6\.00\|7\.00\|8\.00/);
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

test("city lights owner normalizes historical density and retention controls", () => {
  const owner = createOwner();

  assert.equal(owner.getHistoricalCityLightsDensity({ historicalCityLightsDensity: 1.4 }), 1.4);
  assert.equal(owner.getHistoricalCityLightsDensity({ historicalCityLightsDensity: 9 }), 2);
  assert.equal(owner.getHistoricalCityLightsDensity({ historicalCityLightsDensity: "bad" }), 1.25);
  assert.equal(owner.getHistoricalCityLightsSecondaryRetention({ historicalCityLightsSecondaryRetention: 0.8 }), 0.8);
  assert.equal(owner.getHistoricalCityLightsSecondaryRetention({ historicalCityLightsSecondaryRetention: -1 }), 0);
  assert.equal(owner.getHistoricalCityLightsSecondaryRetention({ historicalCityLightsSecondaryRetention: "bad" }), 0.55);
});

test("city lights owner prefers historical asset entries before fallback cities", () => {
  const owner = createOwner({
    historicalEntries: [
      {
        lon: 12,
        lat: 34,
        weight: 0.9,
        capitalKind: "country_capital",
        population: 1000,
        nameAscii: "Asset Capital",
      },
    ],
  });

  const entries = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 0 });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].nameAscii, "Asset Capital");
});

test("city lights owner invalidates historical fallback entries by renderer state", () => {
  const state = { cityLayerRevision: 1, activeScenarioId: "scenario-a" };
  const owner = createOwner({ state });

  const first = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 0.2 });
  const second = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 0.2 });
  assert.equal(first, second);
  assert.equal(first.length, 1);
  assert.equal(first[0].nameAscii, "Fallback Capital");

  state.cityLayerRevision = 2;
  const afterRevisionChange = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 0.2 });
  assert.notEqual(afterRevisionChange, first);

  state.activeScenarioId = "scenario-b";
  const afterScenarioChange = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 0.2 });
  assert.notEqual(afterScenarioChange, afterRevisionChange);

  const afterRetentionChange = owner.getHistoricalNightLightEntries({ historicalCityLightsSecondaryRetention: 1 });
  assert.notEqual(afterRetentionChange, afterScenarioChange);
});

test("city lights owner invalidates historical derived glow entries by projection and retention", () => {
  const state = { width: 800, height: 600 };
  const owner = createOwner({ state });
  const entries = [
    { lon: 10, lat: 20, weight: 0.9, nameAscii: "Glow A" },
    { lon: 30, lat: 40, weight: 0.7, nameAscii: "Glow B" },
  ];

  const first = owner.getHistoricalDerivedGlowEntries(entries, { historicalCityLightsSecondaryRetention: 0.1 });
  const second = owner.getHistoricalDerivedGlowEntries(entries, { historicalCityLightsSecondaryRetention: 0.1 });
  assert.equal(first, second);
  assert.equal(first.length, 2);

  const afterRetentionChange = owner.getHistoricalDerivedGlowEntries(entries, { historicalCityLightsSecondaryRetention: 0.9 });
  assert.notEqual(afterRetentionChange, first);

  state.width = 900;
  const afterProjectionKeyChange = owner.getHistoricalDerivedGlowEntries(entries, { historicalCityLightsSecondaryRetention: 0.9 });
  assert.notEqual(afterProjectionKeyChange, afterRetentionChange);
});
