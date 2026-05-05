import test from "node:test";
import assert from "node:assert/strict";

import { createScenarioLifecycleRuntime } from "../js/core/scenario/lifecycle_runtime.js";
import { createScenarioApplyPipeline } from "../js/core/scenario_apply_pipeline.js";

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

test("blank scenario apply preserves explicit empty runtime topology", async () => {
  const defaultTopology = { objects: { political: { default: true } } };
  const runtimeState = createBaseState({
    activeScenarioId: "",
    defaultRuntimePoliticalTopology: defaultTopology,
    runtimePoliticalTopology: defaultTopology,
  });
  const phaseEvents = [];
  const emptyBlankTopology = {
    type: "Topology",
    objects: { political: { type: "GeometryCollection", geometries: [] } },
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
    hasRenderableScenarioPoliticalTopology: () => false,
    normalizeScenarioFeatureCollection: (value) => value,
    cloneScenarioStateValue: (value) => value,
  });

  const staged = await pipeline.prepareScenarioApplyState({
    manifest: { scenario_id: "blank_base", map_mode: "blank" },
    countriesPayload: { countries: {} },
    ownersPayload: { owners: {} },
    coresPayload: { cores: {} },
    runtimeTopologyPayload: emptyBlankTopology,
  }, { syncPalette: false });
  pipeline.applyPreparedScenarioState({ manifest: { scenario_id: "blank_base", map_mode: "blank" } }, staged);

  assert.equal(runtimeState.activeScenarioId, "blank_base");
  assert.equal(runtimeState.runtimePoliticalTopology, emptyBlankTopology);
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
