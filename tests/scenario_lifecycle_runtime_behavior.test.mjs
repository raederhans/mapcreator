import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createScenarioLifecycleRuntime } from "../js/core/scenario/lifecycle_runtime.js";
import { createScenarioApplyPipeline } from "../js/core/scenario_apply_pipeline.js";
import { createScenarioOceanFillRestoreRuntime } from "../js/core/scenario/presentation_ocean_fill_restore.js";
import { evaluateScenarioDataHealth } from "../js/core/scenario_data_health.js";
import {
  captureScenarioApplyRollbackSnapshot,
  restoreScenarioApplyRollbackSnapshot,
} from "../js/core/scenario_rollback.js";
import {
  createPoliticalRasterWorkerIdentity,
  isPoliticalRasterWorkerResultCurrent,
} from "../js/core/political_raster_worker_client.js";
import { state as appState } from "../js/core/state.js";

function createLifecycleRuntime(runtimeState, overrides = {}) {
  return createScenarioLifecycleRuntime({
    state: runtimeState,
    countryNames: { FR: "France", DE: "Germany" },
    defaultCountryPalette: { FR: "#00f", DE: "#000" },
    createDefaultScenarioReleasableIndex: () => ({ ids: [] }),
    ensureSovereigntyState: () => {},
    getScenarioDefaultCountryCode: () => "FR",
    getScenarioMapSemanticMode: () => "countries",
    markDirty: () => {},
    markLegacyColorStateDirty: () => {},
    normalizeScenarioId: (value) => String(value || "").trim(),
    releaseScenarioAuditPayload: () => {},
    resetScenarioChunkRuntimeState: () => {},
    restoreScenarioDisplaySettingsAfterExit: () => {},
    restoreScenarioOceanFillAfterExit: () => {},
    runPostScenarioClearEffects: () => {},
    runPostScenarioResetEffects: () => {},
    scenarioDetailMinRatioStrict: 0.75,
    setScenarioAuditUiState: () => {},
    syncResolvedDefaultCountryPalette: () => ({ FR: "#00f", DE: "#000" }),
    applyBlankScenarioPresentationDefaults: () => {},
    ...overrides,
  });
}

function createBaseState(overrides = {}) {
  return {
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { scenario_id: "tno_1962" },
    activeScenarioMeshPack: {},
    selectedInspectorCountryCode: "DE",
    inspectorHighlightCountryCode: "DE",
    expandedInspectorContinents: new Set(["EU"]),
    expandedInspectorReleaseParents: new Set(["FR"]),
    inspectorExpansionInitialized: true,
    scenarioBaselineOwnersByFeatureId: { A: "FR", B: "DE" },
    scenarioCountriesByTag: { FR: {}, DE: {} },
    scenarioFixedOwnerColors: { FR: "#00f", DE: "#000" },
    scenarioBorderMode: "scenario_owner_only",
    scenarioShellOverlayRevision: 0,
    scenarioPaintModeBeforeActivate: {
      paintMode: "visual",
      interactionGranularity: "subdivision",
      batchFillScope: "parent",
      politicalEditingExpanded: false,
    },
    scenarioParentBorderEnabledBeforeActivate: null,
    scenarioDisplaySettingsBeforeActivate: null,
    scenarioOceanFillBeforeActivate: null,
    scenarioRuntimeTopologyData: { id: "scenario-runtime" },
    scenarioRuntimeTopologyVersionTag: "v1",
    scenarioPoliticalChunkData: { chunk: true },
    scenarioLandMaskData: { mask: true },
    scenarioContextLandMaskData: { mask: true },
    scenarioLandMaskVersionTag: "mask",
    scenarioContextLandMaskVersionTag: "mask-context",
    scenarioWaterRegionsData: { id: "water" },
    scenarioWaterOverlayVersionTag: "water-v1",
    scenarioSpecialRegionsData: { id: "special" },
    scenarioReliefOverlaysData: { id: "relief" },
    scenarioDistrictGroupsData: { id: "districts" },
    scenarioDistrictGroupByFeatureId: new Map([["A", "group"]]),
    scenarioReliefOverlayRevision: 0,
    scenarioReleasableIndex: { ids: ["FR"] },
    defaultReleasableCatalog: { ids: ["FR", "DE"] },
    releasableCatalog: { ids: ["FR"] },
    scenarioImportAudit: { status: "ok" },
    scenarioBaselineHash: "baseline",
    scenarioAutoShellOwnerByFeatureId: { A: "FR" },
    scenarioBaselineCoresByFeatureId: { A: ["FR"] },
    scenarioHydrationHealthGate: { status: "ok" },
    scenarioDataHealth: { expectedFeatureCount: 12 },
    mapSemanticMode: "countries",
    countryNames: { FR: "France", DE: "Germany" },
    selectedWaterRegionId: "water-1",
    selectedSpecialRegionId: "special-1",
    hoveredWaterRegionId: "water-1",
    hoveredSpecialRegionId: "special-1",
    sovereigntyByFeatureId: { A: "FR", B: "DE" },
    sovereigntyInitialized: true,
    visualOverrides: { A: "#fff" },
    featureOverrides: { A: { color: "#fff" } },
    sovereignBaseColors: { FR: "#00f" },
    countryBaseColors: { FR: "#00f" },
    activeSovereignCode: "FR",
    parentBordersVisible: true,
    parentBorderEnabledByCountry: { FR: true, DE: true },
    paintMode: "sovereignty",
    interactionGranularity: "country",
    batchFillScope: "country",
    ui: {
      scenarioVisualAdjustmentsOpen: true,
      politicalEditingExpanded: true,
    },
    styleConfig: { ocean: { fillColor: "#123456" } },
    scheduleScenarioChunkRefreshFn: () => {},
    runtimeChunkLoadState: {},
    resolvedDefaultCountryPalette: { FR: "#00f", DE: "#000" },
    topologyDetail: null,
    defaultRuntimePoliticalTopology: { objects: { political: {} } },
    runtimePoliticalTopology: { objects: { political: { scenario: true } } },
    topologyBundleMode: "composite",
    detailDeferred: false,
    detailPromotionInFlight: true,
    detailPromotionCompleted: true,
    showCityPoints: true,
    showWaterRegions: true,
    showScenarioSpecialRegions: true,
    showScenarioReliefOverlays: true,
    dynamicBordersEnabled: true,
    renderProfile: "balanced",
    ...overrides,
  };
}

function withAppStatePatch(patch, callback) {
  const previousValues = {};
  Object.keys(patch).forEach((key) => {
    previousValues[key] = appState[key];
    appState[key] = patch[key];
  });
  try {
    return callback();
  } finally {
    Object.keys(previousValues).forEach((key) => {
      appState[key] = previousValues[key];
    });
  }
}

function withAppStateRestored(callback) {
  const previousValues = { ...appState };
  try {
    return callback();
  } finally {
    Object.keys(appState).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(previousValues, key)) {
        delete appState[key];
      }
    });
    Object.entries(previousValues).forEach(([key, value]) => {
      appState[key] = value;
    });
  }
}

function createFeatures(count) {
  return Array.from({ length: count }, (_value, index) => ({
    type: "Feature",
    id: `feature-${index}`,
    properties: {},
    geometry: null,
  }));
}

function createRenderableScenarioTopology() {
  return {
    type: "Topology",
    objects: {
      political: {
        type: "GeometryCollection",
        geometries: [
          {
            type: "Polygon",
            properties: { id: "POL-A" },
            arcs: [],
          },
        ],
      },
    },
    arcs: [],
  };
}

function createApplyPipelineForRuntimeTest(runtimeState, overrides = {}) {
  return createScenarioApplyPipeline({
    runtimeState,
    countryNames: {},
    normalizeScenarioId: (value) => String(value || "").trim(),
    scenarioSupportsChunkedRuntime: () => false,
    scenarioBundleUsesChunkedLayer: () => false,
    scenarioBundleHasChunkedData: () => false,
    ensureScenarioDetailTopologyLoaded: async () => true,
    hasUsablePoliticalTopology: () => true,
    scenarioNeedsDetailTopology: () => false,
    getScenarioDisplayName: () => "Sample",
    getScenarioTargetPaletteId: () => "default",
    hasActiveScenarioPaletteLoaded: () => true,
    applyActivePaletteState: () => {},
    setActivePaletteSource: async () => true,
    getScenarioDefaultCountryCode: () => "AAA",
    getScenarioMapSemanticMode: () => "political",
    buildScenarioReleasableIndex: () => ({}),
    getScenarioReleasableCountries: () => ({}),
    normalizeScenarioCoreMap: (value) => value || {},
    normalizeScenarioDistrictGroupsPayload: () => null,
    getActiveScenarioMergedChunkLayerPayload: () => undefined,
    getScenarioDecodedCollection: () => null,
    getScenarioTopologyFeatureCollection: () => null,
    getScenarioNameMap: () => ({ AAA: "Alpha" }),
    getMissingScenarioNameTags: () => [],
    getScenarioFixedOwnerColors: () => ({ AAA: "#111111" }),
    buildHoi4FarEastSovietOwnerBackfill: () => ({}),
    buildScenarioRuntimeVersionTag: () => "sample:sha",
    mergeReleasableCatalogs: () => null,
    buildScenarioDistrictGroupByFeatureId: () => new Map(),
    syncScenarioLocalizationState: () => {},
    applyBlankScenarioPresentationDefaults: () => {},
    setScenarioAuditUiState: () => {},
    getScenarioBaselineHashFromBundle: (bundle) => bundle?.manifest?.baseline_hash || "baseline",
    markLegacyColorStateDirty: () => {},
    syncScenarioInspectorSelection: () => {},
    disableScenarioParentBorders: () => {},
    applyScenarioPaintMode: () => {},
    syncScenarioOceanFillForActivation: () => {},
    applyScenarioPerformanceHints: () => {},
    scheduleScenarioChunkRefresh: () => {},
    resetScenarioChunkRuntimeState: () => {},
    ensureRuntimeChunkLoadState: () => ({}),
    hasRenderableScenarioPoliticalTopology: () => true,
    normalizeScenarioFeatureCollection: (value) => value,
    cloneScenarioStateValue: (value) => value,
    ...overrides,
  });
}

function createRawStrategicValuesPayload() {
  return {
    version: 1,
    scenario_id: "hoi4_test",
    baseline_hash: "abc123",
    metrics: {
      steel: { kind: "additive", min: 0, max: 20, p95: 20 },
    },
    buckets: {
      s1: { state_id: 1, owner_tag: "POL", steel: 20 },
    },
    bucket_by_feature: {
      "POL-A": "s1",
    },
    victory_points: [
      {
        province_id: 3544,
        value: 25,
        state_id: 1,
        owner_tag: "POL",
        name: "Warsaw",
        host_feature_id: "POL-A",
      },
    ],
    resource_points: {
      type: "FeatureCollection",
      features: [],
    },
    diagnostics: {
      vp_total: 1,
      vp_matched: 1,
    },
  };
}

async function readJsonFixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

function normalizeOwnerCodeForTest(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,15}$/.test(code) ? code : "";
}

function addOwnerCodeForTest(target, value) {
  const code = normalizeOwnerCodeForTest(value);
  if (code) {
    target.add(code);
  }
}

function collectTnoRuntimePoliticalOwnerCodes({
  countriesPayload,
  ownersPayload,
  runtimeTopologyPayload,
  countryNames = {},
  baseTopologyPayload = null,
}) {
  const codes = new Set();
  Object.keys(countriesPayload?.countries || {}).forEach((tag) => addOwnerCodeForTest(codes, tag));
  Object.keys(countryNames || {}).forEach((tag) => addOwnerCodeForTest(codes, tag));
  Object.values(ownersPayload?.owners || {}).forEach((tag) => addOwnerCodeForTest(codes, tag));
  const collectTopologyCodes = (topologyPayload) => {
    const geometries = Array.isArray(topologyPayload?.objects?.political?.geometries)
      ? topologyPayload.objects.political.geometries
      : [];
    geometries.forEach((geometry) => {
      const props = geometry?.properties || {};
      [
        props.cntr_code,
        props.CNTR_CODE,
        props.country_code,
        props.countryCode,
        props.iso_a2,
        props.ISO_A2,
        props.iso_a2_eh,
        props.ISO_A2_EH,
        props.adm0_a2,
        props.ADM0_A2,
        props.scenario_shell_owner_hint,
        props.scenario_shell_controller_hint,
      ].forEach((value) => addOwnerCodeForTest(codes, value));
    });
  };
  collectTopologyCodes(runtimeTopologyPayload);
  collectTopologyCodes(baseTopologyPayload);
  return [...codes].sort();
}

test("scenario apply staging rejects unrenderable political runtime topology before commit", async () => {
  const runtimeState = createBaseState({ activeScenarioId: "previous" });
  const pipeline = createScenarioApplyPipeline({
    runtimeState,
    countryNames: {},
    normalizeScenarioId: (value) => String(value || "").trim(),
    scenarioSupportsChunkedRuntime: () => false,
    scenarioBundleUsesChunkedLayer: () => false,
    scenarioBundleHasChunkedData: () => false,
    ensureScenarioDetailTopologyLoaded: async () => true,
    hasUsablePoliticalTopology: () => true,
    scenarioNeedsDetailTopology: () => false,
    getScenarioDisplayName: () => "Sample",
    getScenarioTargetPaletteId: () => "default",
    hasActiveScenarioPaletteLoaded: () => true,
    applyActivePaletteState: () => {},
    setActivePaletteSource: async () => true,
    getScenarioDefaultCountryCode: () => "AAA",
    getScenarioMapSemanticMode: () => "political",
    buildScenarioReleasableIndex: () => ({}),
    getScenarioReleasableCountries: () => ({}),
    normalizeScenarioCoreMap: (value) => value || {},
    normalizeScenarioDistrictGroupsPayload: () => null,
    getActiveScenarioMergedChunkLayerPayload: () => undefined,
    getScenarioDecodedCollection: () => null,
    getScenarioTopologyFeatureCollection: () => null,
    getScenarioNameMap: () => ({ AAA: "Alpha" }),
    getMissingScenarioNameTags: () => [],
    getScenarioFixedOwnerColors: () => ({ AAA: "#111111" }),
    buildHoi4FarEastSovietOwnerBackfill: () => ({}),
    buildScenarioRuntimeVersionTag: () => "sample:sha",
    mergeReleasableCatalogs: () => null,
    buildScenarioDistrictGroupByFeatureId: () => new Map(),
    syncScenarioLocalizationState: () => {},
    applyBlankScenarioPresentationDefaults: () => {},
    setScenarioAuditUiState: () => {},
    getScenarioBaselineHashFromBundle: () => "baseline",
    markLegacyColorStateDirty: () => {},
    syncScenarioInspectorSelection: () => {},
    disableScenarioParentBorders: () => {},
    applyScenarioPaintMode: () => {},
    syncScenarioOceanFillForActivation: () => {},
    applyScenarioPerformanceHints: () => {},
    scheduleScenarioChunkRefresh: () => {},
    resetScenarioChunkRuntimeState: () => {},
    ensureRuntimeChunkLoadState: () => ({}),
    hasRenderableScenarioPoliticalTopology: () => false,
    normalizeScenarioFeatureCollection: (value) => value,
    cloneScenarioStateValue: (value) => value,
  });

  await assert.rejects(
    pipeline.prepareScenarioApplyState({
      manifest: { scenario_id: "sample" },
      countriesPayload: { countries: { AAA: { display_name: "Alpha", color_hex: "#111111" } } },
      ownersPayload: { owners: { "1": "AAA" } },
      coresPayload: { cores: { "1": ["AAA"] } },
      runtimeTopologyPayload: {
        type: "Topology",
        objects: { political: { type: "GeometryCollection", geometries: [] } },
        arcs: [],
      },
    }, { syncPalette: false }),
    /runtime topology is not renderable/,
  );
  assert.equal(runtimeState.activeScenarioId, "previous");
  assert.equal(runtimeState.scenarioRuntimeTopologyData?.id, "scenario-runtime");
});

test("scenario apply commit state does not reuse stale live topology for bad non blank runtime topology", () => {
  const staleTopology = { objects: { political: { stale: true } } };
  const unrenderableTopology = {
    type: "Topology",
    objects: { political: { type: "GeometryCollection", geometries: [] } },
    arcs: [],
  };
  const runtimeState = createBaseState({
    activeScenarioId: "previous",
    defaultRuntimePoliticalTopology: null,
    runtimePoliticalTopology: staleTopology,
    scenarioRuntimeTopologyData: { id: "previous-scenario-runtime" },
  });
  const pipeline = createApplyPipelineForRuntimeTest(runtimeState, {
    hasRenderableScenarioPoliticalTopology: () => false,
  });

  pipeline.applyPreparedScenarioState({
    manifest: { scenario_id: "sample" },
  }, {
    scenarioId: "sample",
    defaultCountryCode: "AAA",
    baseCountryMap: {},
    mapSemanticMode: "political",
    countryMap: { AAA: { tag: "AAA" } },
    runtimeTopologyPayload: unrenderableTopology,
    runtimeVersionTag: "sample:bad-topology",
    districtGroupsPayload: null,
    scenarioWaterRegionsFromTopology: null,
    scenarioSpecialRegionsFromTopology: null,
    scenarioAtlantropaFromTopology: null,
    scenarioContextLandMaskFromTopology: null,
    scenarioLandMaskFromTopology: null,
    scenarioReliefOverlaysPayload: null,
    scenarioCityOverridesPayload: null,
    scenarioStrategicValuesPayload: null,
    scenarioNameMap: { AAA: "Alpha" },
    scenarioColorMap: { AAA: "#111111" },
    scenarioGeneratedColorTags: [],
    coarseColorMap: null,
    scenarioOwnerBackfill: {},
    resolvedOwners: { "POL-A": "AAA" },
    cores: { "POL-A": ["AAA"] },
    releasableIndex: {},
    scenarioParentBorderEnabledBeforeActivate: null,
    scenarioDisplaySettingsBeforeActivate: null,
    scenarioOceanFillBeforeActivate: null,
    scenarioManifest: { scenario_id: "sample" },
  });

  assert.equal(runtimeState.activeScenarioId, "sample");
  assert.equal(runtimeState.runtimePoliticalTopology, null);
  assert.equal(runtimeState.scenarioRuntimeTopologyData, null);
});

test("scenario apply normalizes bundled strategic values before commit", async () => {
  const runtimeState = createBaseState({
    activeScenarioId: "",
    scenarioStrategicValuesData: null,
    scenarioStrategicValuesRevision: 0,
  });
  const pipeline = createApplyPipelineForRuntimeTest(runtimeState);
  const bundle = {
    manifest: {
      scenario_id: "hoi4_test",
      baseline_hash: "abc123",
    },
    countriesPayload: { countries: { AAA: { display_name: "Alpha", color_hex: "#111111" } } },
    ownersPayload: { owners: { "POL-A": "AAA" } },
    coresPayload: { cores: { "POL-A": ["AAA"] } },
    runtimeTopologyPayload: createRenderableScenarioTopology(),
    strategicValuesPayload: createRawStrategicValuesPayload(),
  };

  const staged = await pipeline.prepareScenarioApplyState(bundle, { syncPalette: false });
  pipeline.applyPreparedScenarioState(bundle, staged);

  assert.equal(runtimeState.scenarioStrategicValuesData.bucketByFeature["POL-A"], "s1");
  assert.equal(runtimeState.scenarioStrategicValuesData.victoryPointsByFeature["POL-A"][0].name, "Warsaw");
  assert.equal(runtimeState.scenarioStrategicValuesData.resourcePoints.type, "FeatureCollection");
  assert.equal(runtimeState.scenarioStrategicValuesRevision, 1);
});

test("scenario apply includes external political owner codes in base color mirrors", async () => {
  const ownerCodes = ["CF", "CG", "CM", "CY", "EH", "GA", "MT", "TW", "VA"];
  const runtimeState = createBaseState({
    activeScenarioId: "",
    activePalettePack: {
      entries: {
        CAF: { map_hex: "#224466" },
        CMR: { map_hex: "#335577" },
        MLT: { map_hex: "#446688" },
        TWN: { map_hex: "#557799" },
      },
    },
    activePaletteMap: {
      mapped: {
        CAF: { iso2: "CF" },
        CMR: { iso2: "CM" },
        MLT: { iso2: "MT" },
        TWN: { iso2: "TW" },
      },
    },
  });
  const pipeline = createApplyPipelineForRuntimeTest(runtimeState, {
    getScenarioFixedOwnerColors: () => ({
      AAA: "#111111",
      GER: "#222222",
    }),
  });
  const runtimeTopologyPayload = {
    type: "Topology",
    objects: {
      political: {
        type: "GeometryCollection",
        geometries: ownerCodes.map((code, index) => ({
          type: "Polygon",
          id: index,
          arcs: [],
          properties: {
            id: code,
            cntr_code: code,
            scenario_shell_owner_hint: code === "VA" ? "VA" : "",
          },
        })),
      },
    },
    arcs: [],
  };
  const staged = await pipeline.prepareScenarioApplyState({
    manifest: {
      scenario_id: "tno_sample",
      baseline_hash: "abc123",
    },
    countriesPayload: {
      countries: {
        AAA: { display_name: "Alpha", color_hex: "#111111" },
        GER: { display_name: "Germany", color_hex: "#222222", base_iso2: "DE", lookup_iso2: "DE" },
      },
    },
    ownersPayload: {
      owners: {
        "feature-owned-by-cg": "CG",
      },
    },
    coresPayload: { cores: {} },
    runtimeTopologyPayload,
  }, { syncPalette: false });

  pipeline.applyPreparedScenarioState({ manifest: { scenario_id: "tno_sample" } }, staged);

  assert.equal(runtimeState.sovereignBaseColors.AAA, "#111111");
  assert.equal(runtimeState.sovereignBaseColors.GER, "#222222");
  for (const code of ownerCodes) {
    assert.match(runtimeState.sovereignBaseColors[code], /^#[0-9a-f]{6}$/);
    assert.equal(runtimeState.countryBaseColors[code], runtimeState.sovereignBaseColors[code]);
  }
  assert.equal(runtimeState.sovereignBaseColors.CF, "#224466");
  assert.equal(runtimeState.sovereignBaseColors.CM, "#335577");
  assert.equal(runtimeState.sovereignBaseColors.MT, "#446688");
  assert.equal(runtimeState.sovereignBaseColors.TW, "#557799");
  assert.deepEqual([...runtimeState.scenarioGeneratedColorTags].sort(), ["CG", "CY", "EH", "GA", "VA"]);
});

test("scenario apply gives every TNO 1962 runtime political owner code a base color", async () => {
  const [
    manifest,
    countriesPayload,
    ownersPayload,
    runtimeTopologyPayload,
    baseTopologyPayload,
    palettePack,
    paletteMap,
  ] = await Promise.all([
    readJsonFixture("../data/scenarios/tno_1962/manifest.json"),
    readJsonFixture("../data/scenarios/tno_1962/countries.json"),
    readJsonFixture("../data/scenarios/tno_1962/owners.by_feature.json"),
    readJsonFixture("../data/scenarios/tno_1962/runtime_topology.topo.json"),
    readJsonFixture("../data/europe_topology.json"),
    readJsonFixture("../data/palettes/tno.palette.json"),
    readJsonFixture("../data/palette-maps/tno.map.json"),
  ]);
  const runtimeState = createBaseState({
    activeScenarioId: "",
    activePalettePack: palettePack,
    activePaletteMap: paletteMap,
    topology: baseTopologyPayload,
    topologyPrimary: baseTopologyPayload,
  });
  const pipeline = createApplyPipelineForRuntimeTest(runtimeState, {
    countryNames: appState.countryNames,
    getScenarioDefaultCountryCode: () => "GER",
    getScenarioFixedOwnerColors: (countryMap = {}) => {
      const colors = {};
      Object.entries(countryMap || {}).forEach(([tag, entry]) => {
        const code = normalizeOwnerCodeForTest(tag);
        const color = String(entry?.color_hex || entry?.colorHex || "").trim().toLowerCase();
        if (code && /^#[0-9a-f]{6}$/.test(color)) {
          colors[code] = color;
        }
      });
      return colors;
    },
    buildScenarioRuntimeVersionTag: () => "tno_1962:runtime-topology",
  });
  const bundle = {
    manifest,
    countriesPayload,
    ownersPayload,
    coresPayload: { cores: {} },
    runtimeTopologyPayload,
  };
  const ownerCodes = collectTnoRuntimePoliticalOwnerCodes({
    countriesPayload,
    ownersPayload,
    runtimeTopologyPayload,
    countryNames: appState.countryNames,
    baseTopologyPayload,
  });

  const staged = await pipeline.prepareScenarioApplyState(bundle, { syncPalette: false });
  pipeline.applyPreparedScenarioState(bundle, staged);

  assert.ok(ownerCodes.length > 300, `unexpected TNO owner universe size: ${ownerCodes.length}`);
  for (const code of ["CF", "CG", "CM", "CY", "EH", "GA", "MT", "TW", "VA"]) {
    assert.ok(ownerCodes.includes(code), `${code} absent from TNO owner universe fixture`);
  }
  const missingSovereignColors = ownerCodes
    .filter((code) => !/^#[0-9a-f]{6}$/.test(String(runtimeState.sovereignBaseColors?.[code] || "")));
  const missingCountryColors = ownerCodes
    .filter((code) => !/^#[0-9a-f]{6}$/.test(String(runtimeState.countryBaseColors?.[code] || "")));
  assert.deepEqual(missingSovereignColors.slice(0, 20), [], `missing sovereign colors: ${missingSovereignColors.slice(0, 20).join(", ")}`);
  assert.equal(missingSovereignColors.length, 0);
  assert.deepEqual(missingCountryColors.slice(0, 20), [], `missing country colors: ${missingCountryColors.slice(0, 20).join(", ")}`);
  assert.equal(missingCountryColors.length, 0);
});

test("blank scenario apply preserves ownerless editable runtime topology", async () => {
  const defaultTopology = { objects: { political: { default: true } } };
  const runtimeState = createBaseState({
    activeScenarioId: "",
    defaultRuntimePoliticalTopology: defaultTopology,
    runtimePoliticalTopology: defaultTopology,
  });
  const phaseEvents = [];
  const ownerlessBlankTopology = {
    type: "Topology",
    objects: {
      political: {
        type: "GeometryCollection",
        geometries: [
          {
            type: "Polygon",
            arcs: [[[0]]],
            properties: { id: "BLANK-1", name: "Blank Parcel" },
          },
        ],
      },
    },
    arcs: [],
  };
  const pipeline = createScenarioApplyPipeline({
    runtimeState,
    countryNames: {},
    normalizeScenarioId: (value) => String(value || "").trim(),
    scenarioSupportsChunkedRuntime: () => false,
    scenarioBundleUsesChunkedLayer: () => false,
    scenarioBundleHasChunkedData: () => false,
    ensureScenarioDetailTopologyLoaded: async () => true,
    hasUsablePoliticalTopology: () => true,
    scenarioNeedsDetailTopology: () => false,
    getScenarioDisplayName: () => "Blank",
    getScenarioTargetPaletteId: () => "default",
    hasActiveScenarioPaletteLoaded: () => true,
    applyActivePaletteState: () => {},
    setActivePaletteSource: async () => true,
    getScenarioDefaultCountryCode: () => "",
    getScenarioMapSemanticMode: () => "blank",
    buildScenarioReleasableIndex: () => ({}),
    getScenarioReleasableCountries: () => ({}),
    normalizeScenarioCoreMap: (value) => value || {},
    normalizeScenarioDistrictGroupsPayload: () => null,
    getActiveScenarioMergedChunkLayerPayload: () => undefined,
    getScenarioDecodedCollection: () => null,
    getScenarioTopologyFeatureCollection: () => null,
    getScenarioNameMap: () => ({}),
    getMissingScenarioNameTags: () => [],
    getScenarioFixedOwnerColors: () => ({}),
    buildHoi4FarEastSovietOwnerBackfill: () => ({}),
    buildScenarioRuntimeVersionTag: () => "blank:sha",
    mergeReleasableCatalogs: () => null,
    buildScenarioDistrictGroupByFeatureId: () => new Map(),
    syncScenarioLocalizationState: () => phaseEvents.push(`pre:localization:${runtimeState.activeScenarioId}`),
    applyBlankScenarioPresentationDefaults: () => phaseEvents.push(`pre:blank:${runtimeState.activeScenarioId}`),
    setScenarioAuditUiState: () => phaseEvents.push(`pre:audit:${runtimeState.activeScenarioId}`),
    getScenarioBaselineHashFromBundle: () => "blank-baseline",
    markLegacyColorStateDirty: () => phaseEvents.push(`post:legacy:${runtimeState.activeScenarioId}`),
    syncScenarioInspectorSelection: (code) => phaseEvents.push(`post:inspector:${runtimeState.activeScenarioId}:${code}`),
    disableScenarioParentBorders: () => phaseEvents.push(`post:borders:${runtimeState.activeScenarioId}`),
    applyScenarioPaintMode: () => phaseEvents.push(`post:paint:${runtimeState.activeScenarioId}`),
    syncScenarioOceanFillForActivation: () => phaseEvents.push(`post:ocean:${runtimeState.activeScenarioId}`),
    applyScenarioPerformanceHints: () => phaseEvents.push(`post:performance:${runtimeState.activeScenarioId}`),
    scheduleScenarioChunkRefresh: () => {},
    resetScenarioChunkRuntimeState: () => phaseEvents.push(`post:chunks:${runtimeState.activeScenarioId}`),
    ensureRuntimeChunkLoadState: () => ({}),
    hasRenderableScenarioPoliticalTopology: () => true,
    normalizeScenarioFeatureCollection: (value) => value,
    cloneScenarioStateValue: (value) => value,
  });

  const staged = await pipeline.prepareScenarioApplyState({
    manifest: { scenario_id: "blank_base", map_mode: "blank" },
    countriesPayload: { countries: {} },
    ownersPayload: { owners: {} },
    coresPayload: { cores: {} },
    runtimeTopologyPayload: ownerlessBlankTopology,
  }, { syncPalette: false });
  pipeline.applyPreparedScenarioState({ manifest: { scenario_id: "blank_base", map_mode: "blank" } }, staged);

  assert.equal(runtimeState.activeScenarioId, "blank_base");
  assert.equal(runtimeState.runtimePoliticalTopology, ownerlessBlankTopology);
  assert.equal(runtimeState.activeSovereignCode, "");
  assert.deepEqual(runtimeState.sovereigntyByFeatureId, {});
  assert.deepEqual(phaseEvents, [
    "pre:localization:",
    "pre:blank:",
    "pre:audit:",
    "post:legacy:blank_base",
    "post:inspector:blank_base:",
    "post:borders:blank_base",
    "post:paint:blank_base",
    "post:ocean:blank_base",
    "post:performance:blank_base",
    "post:chunks:blank_base",
  ]);
});

test("scenario style defaults restore captures the pre-activation baseline after apply commit", () => {
  const runtimeState = createBaseState({
    activeScenarioManifest: {
      style_defaults: {
        coastlines: {
          width: 0.8,
        },
        empireBorders: {
          opacity: 0.4,
        },
        ocean: {
          fillColor: "#2d4769",
          preset: "flat",
          experimentalAdvancedStyles: false,
        },
      },
    },
    scenarioOceanFillBeforeActivate: "#123456",
    scenarioOceanStyleBeforeActivate: null,
    styleConfig: {
      coastlines: {
        color: "#333333",
        opacity: 0.8,
        width: 1.2,
      },
      empireBorders: {
        color: "#666666",
        opacity: 0.9,
        width: 1,
      },
      ocean: {
        fillColor: "#123456",
        preset: "bathymetry_soft",
        experimentalAdvancedStyles: true,
      },
    },
  });
  const invalidationReasons = [];
  const runtime = createScenarioOceanFillRestoreRuntime({
    state: runtimeState,
    invalidateOceanBackgroundVisualState: (reason) => invalidationReasons.push(reason),
  });

  runtime.syncScenarioOceanFillForActivation(runtimeState.activeScenarioManifest);

  assert.deepEqual(runtimeState.scenarioOceanStyleBeforeActivate, {
    fillColor: "#123456",
    preset: "bathymetry_soft",
    experimentalAdvancedStyles: true,
  });
  assert.deepEqual(runtimeState.scenarioPresentationStyleBeforeActivate, {
    coastlines: {
      color: "#333333",
      opacity: 0.8,
      width: 1.2,
    },
    empireBorders: {
      color: "#666666",
      opacity: 0.9,
      width: 1,
    },
    ocean: {
      fillColor: "#123456",
      preset: "bathymetry_soft",
      experimentalAdvancedStyles: true,
    },
  });
  assert.deepEqual(runtimeState.styleConfig.coastlines, {
    color: "#333333",
    opacity: 0.8,
    width: 0.8,
  });
  assert.deepEqual(runtimeState.styleConfig.empireBorders, {
    color: "#666666",
    opacity: 0.4,
    width: 1,
  });
  assert.deepEqual(runtimeState.styleConfig.ocean, {
    fillColor: "#2d4769",
    preset: "flat",
    experimentalAdvancedStyles: false,
  });

  runtime.restoreScenarioOceanFillAfterExit();

  assert.deepEqual(runtimeState.styleConfig.coastlines, {
    color: "#333333",
    opacity: 0.8,
    width: 1.2,
  });
  assert.deepEqual(runtimeState.styleConfig.empireBorders, {
    color: "#666666",
    opacity: 0.9,
    width: 1,
  });
  assert.deepEqual(runtimeState.styleConfig.ocean, {
    fillColor: "#123456",
    preset: "bathymetry_soft",
    experimentalAdvancedStyles: true,
  });
  assert.equal(runtimeState.scenarioOceanFillBeforeActivate, null);
  assert.equal(runtimeState.scenarioOceanStyleBeforeActivate, null);
  assert.equal(runtimeState.scenarioPresentationStyleBeforeActivate, null);
  assert.deepEqual(invalidationReasons, [
    "scenario-style-defaults-activate",
    "scenario-style-defaults-clear",
  ]);
});

test("clearActiveScenario restores deferred coarse baseline when detail topology is still pending", () => {
  const runtimeState = createBaseState({
    topologyDetail: null,
    defaultRuntimePoliticalTopology: { objects: { political: {} } },
    topologyBundleMode: "composite",
    detailDeferred: false,
    detailPromotionCompleted: true,
  });
  const runtime = createLifecycleRuntime(runtimeState);

  runtime.clearActiveScenario({ renderNow: false, markDirtyReason: "" });

  assert.equal(runtimeState.activeScenarioId, "");
  assert.equal(runtimeState.topologyBundleMode, "single");
  assert.equal(runtimeState.detailDeferred, true);
  assert.equal(runtimeState.detailPromotionCompleted, false);
  assert.deepEqual(runtimeState.runtimePoliticalTopology, runtimeState.defaultRuntimePoliticalTopology);
});

test("clearActiveScenario keeps composite mode when baseline detail topology is already loaded", () => {
  const runtimeState = createBaseState({
    topologyDetail: { objects: { political: {} } },
    defaultRuntimePoliticalTopology: { objects: { political: {} } },
    topologyBundleMode: "composite",
    detailDeferred: false,
    detailPromotionCompleted: true,
  });
  const runtime = createLifecycleRuntime(runtimeState);

  runtime.clearActiveScenario({ renderNow: false, markDirtyReason: "" });

  assert.equal(runtimeState.topologyBundleMode, "composite");
  assert.equal(runtimeState.detailDeferred, false);
  assert.equal(runtimeState.detailPromotionCompleted, true);
});

test("resetToScenarioBaseline restores ownership before UI refresh side effects", () => {
  const runtimeState = createBaseState({
    sovereigntyByFeatureId: { A: "DE", B: "DE" },
  });
  const seenOwners = [];
  const runtime = createLifecycleRuntime(runtimeState, {
    runPostScenarioResetEffects: () => {
      seenOwners.push(runtimeState.sovereigntyByFeatureId.A);
    },
  });

  const changed = runtime.resetToScenarioBaseline({
    renderNow: false,
    markDirtyReason: "",
    showToastOnComplete: false,
  });

  assert.equal(changed, true);
  assert.deepEqual(seenOwners, ["FR"]);
  assert.deepEqual(runtimeState.sovereigntyByFeatureId, { A: "FR", B: "DE" });
});

test("scenario data health uses chunked political payload as the expected feature count", () => {
  const health = withAppStatePatch({
    activeScenarioManifest: {
      scenario_id: "hoi4_1939",
      detail_chunk_manifest_url: "data/scenarios/hoi4_1939/detail_chunks.manifest.json",
      summary: { feature_count: 2200 },
    },
    landDataFull: { type: "FeatureCollection", features: createFeatures(1210) },
    landData: { type: "FeatureCollection", features: createFeatures(1190) },
    runtimePoliticalTopology: null,
    scenarioPoliticalChunkData: { type: "FeatureCollection", features: createFeatures(1200) },
    scenarioPoliticalVisibleChunkData: { type: "FeatureCollection", features: createFeatures(20) },
    activeScenarioChunks: {
      mergedLayerPayloads: {
        political: { type: "FeatureCollection", features: createFeatures(1200) },
      },
    },
    scenarioGeneratedColorTags: [],
  }, () => evaluateScenarioDataHealth(appState.activeScenarioManifest, { minRatio: 0.7 }));

  assert.equal(health.expectedFeatureCount, 1200);
  assert.equal(health.runtimeFeatureCount, 1210);
  assert.ok(health.ratio >= 1);
  assert.equal(health.warning, "");
  assert.equal(health.severity, "");
});

test("scenario rollback restores visible political data and advances scene data identity", () => withAppStateRestored(() => {
  const oldFullData = { type: "FeatureCollection", features: [{ id: "old-full", properties: {}, geometry: null }] };
  const oldVisibleData = { type: "FeatureCollection", features: [{ id: "old-visible", properties: {}, geometry: null }] };
  const failedFullData = { type: "FeatureCollection", features: [{ id: "failed-full", properties: {}, geometry: null }] };
  const failedVisibleData = { type: "FeatureCollection", features: [{ id: "failed-visible", properties: {}, geometry: null }] };

  appState.activeScenarioId = "old_scenario";
  appState.sceneScenarioId = "old_scenario";
  appState.sceneGeneration = 4;
  appState.scenarioDataGeneration = 10;
  appState.scenarioPoliticalChunkData = oldFullData;
  appState.scenarioPoliticalVisibleChunkData = oldVisibleData;
  appState.runtimeChunkLoadState = {
    refreshTimerId: null,
    promotionTimerId: null,
    promotionScheduled: false,
    promotionCommitInFlight: false,
  };

  const rollbackSnapshot = captureScenarioApplyRollbackSnapshot();

  appState.activeScenarioId = "failed_scenario";
  appState.sceneScenarioId = "failed_scenario";
  appState.sceneGeneration = 5;
  appState.scenarioDataGeneration = 11;
  appState.scenarioPoliticalChunkData = failedFullData;
  appState.scenarioPoliticalVisibleChunkData = failedVisibleData;
  const failedIdentity = createPoliticalRasterWorkerIdentity({
    sceneGeneration: appState.sceneGeneration,
    scenarioDataGeneration: appState.scenarioDataGeneration,
    scenarioId: appState.activeScenarioId,
    selectionVersion: 1,
    topologyRevision: 1,
    colorRevision: 1,
    transformBucket: "1:0:0",
    dpr: 1,
    viewport: { x: 0, y: 0, width: 10, height: 10, right: 10, bottom: 10 },
    passSignature: "political-failed",
  });

  restoreScenarioApplyRollbackSnapshot(rollbackSnapshot);

  assert.equal(appState.activeScenarioId, "old_scenario");
  assert.deepEqual(appState.scenarioPoliticalChunkData.features.map((feature) => feature.id), ["old-full"]);
  assert.deepEqual(appState.scenarioPoliticalVisibleChunkData.features.map((feature) => feature.id), ["old-visible"]);
  assert.equal(appState.scenarioDataGeneration, 12);
  assert.equal(appState.scenarioDataGenerationReason, "scenario-rollback");
  assert.equal(appState.sceneGeneration, 6);
  assert.equal(appState.sceneGenerationReason, "scenario-rollback");
  assert.equal(appState.sceneScenarioId, "old_scenario");

  const restoredIdentity = createPoliticalRasterWorkerIdentity({
    sceneGeneration: appState.sceneGeneration,
    scenarioDataGeneration: appState.scenarioDataGeneration,
    scenarioId: appState.activeScenarioId,
    selectionVersion: 1,
    topologyRevision: 1,
    colorRevision: 1,
    transformBucket: "1:0:0",
    dpr: 1,
    viewport: { x: 0, y: 0, width: 10, height: 10, right: 10, bottom: 10 },
    passSignature: "political-failed",
  });
  assert.equal(isPoliticalRasterWorkerResultCurrent(failedIdentity, restoredIdentity), false);
}));

test("scenario data health accepts current coarse collections before chunk payload promotion", () => {
  const health = withAppStatePatch({
    activeScenarioManifest: {
      scenario_id: "tno_1962",
      detail_chunk_manifest_url: "data/scenarios/tno_1962/detail_chunks.manifest.json",
      summary: { feature_count: 12865 },
    },
    landDataFull: { type: "FeatureCollection", features: createFeatures(209) },
    landData: { type: "FeatureCollection", features: createFeatures(198) },
    runtimePoliticalTopology: null,
    scenarioPoliticalChunkData: null,
    scenarioPoliticalVisibleChunkData: { type: "FeatureCollection", features: createFeatures(7) },
    activeScenarioChunks: {
      mergedLayerPayloads: {},
    },
    scenarioGeneratedColorTags: [],
  }, () => evaluateScenarioDataHealth(appState.activeScenarioManifest, { minRatio: 0.7 }));

  assert.equal(health.expectedFeatureCount, 209);
  assert.equal(health.runtimeFeatureCount, 209);
  assert.equal(health.warning, "");
  assert.equal(health.severity, "");
});

test("scenario data health keeps manifest totals for non-chunked topology checks", () => {
  const health = withAppStatePatch({
    activeScenarioManifest: {
      scenario_id: "legacy",
      summary: { feature_count: 2200 },
    },
    landDataFull: { type: "FeatureCollection", features: createFeatures(900) },
    landData: { type: "FeatureCollection", features: createFeatures(900) },
    runtimePoliticalTopology: null,
    scenarioPoliticalChunkData: { type: "FeatureCollection", features: createFeatures(1200) },
    activeScenarioChunks: {
      mergedLayerPayloads: {
        political: { type: "FeatureCollection", features: createFeatures(1200) },
      },
    },
    scenarioGeneratedColorTags: [],
  }, () => evaluateScenarioDataHealth(appState.activeScenarioManifest, { minRatio: 0.7 }));

  assert.equal(health.expectedFeatureCount, 2200);
  assert.equal(health.runtimeFeatureCount, 900);
  assert.equal(health.severity, "error");
});
