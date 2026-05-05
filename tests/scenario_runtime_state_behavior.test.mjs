import test from "node:test";
import assert from "node:assert/strict";

import {
  commitScenarioActivationRuntimeState,
  createDefaultScenarioRuntimeState,
  recordScenarioPerfMetricState,
  setScenarioPerfMetricState,
} from "../js/core/state/scenario_runtime_state.js";
import {
  applyZoomEndChunkProtectionToSelection,
  protectZoomEndChunksForSelection,
  shouldSkipStalePostApplyRefreshAfterZoomEnd,
} from "../js/core/scenario/chunk_runtime.js";

test("scenario runtime factory seeds scenario-aware defaults", () => {
  const defaults = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" });

  assert.equal(defaults.activeScenarioId, "tno_1962");
  assert.equal(defaults.activeScenarioChunks.scenarioId, "tno_1962");
  assert.equal(defaults.runtimeChunkLoadState.shellStatus, "ready");
  assert.equal(defaults.runtimeChunkLoadState.registryStatus, "ready");
  assert.equal(defaults.runtimeChunkLoadState.promotionCommitStatus, "idle");
  assert.equal(defaults.runtimeChunkLoadState.promotionCommitInFlight, false);
  assert.equal(defaults.runtimeChunkLoadState.promotionCommitRunId, 0);
  assert.deepEqual(defaults.runtimeChunkLoadState.zoomEndProtectedChunkIds, []);
  assert.equal(defaults.runtimeChunkLoadState.zoomEndProtectedUntil, 0);
  assert.equal(defaults.runtimeChunkLoadState.zoomEndProtectedSelectionVersion, 0);
  assert.equal(defaults.runtimeChunkLoadState.zoomEndProtectedScenarioId, "");
  assert.equal(defaults.runtimeChunkLoadState.zoomEndProtectedFocusCountry, "");
  assert.doesNotThrow(() => JSON.stringify(defaults.runtimeChunkLoadState));
});

test("scenario runtime factory returns fresh nested objects and maps", () => {
  const first = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" });
  const second = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" });

  first.activeScenarioChunks.loadedChunkIds.push("owners");
  first.activeScenarioChunks.mergedLayerPayloads.owners = null;
  first.runtimeChunkLoadState.inFlightByChunkId.owners = true;
  first.runtimeChunkLoadState.zoomEndProtectedChunkIds.push("political.detail.country.cd");
  first.scenarioDistrictGroupByFeatureId.set("1", "district-a");
  first.scenarioHydrationHealthGate.status = "blocked";

  assert.deepEqual(second.activeScenarioChunks.loadedChunkIds, []);
  assert.deepEqual(second.activeScenarioChunks.mergedLayerPayloads, {});
  assert.deepEqual(second.runtimeChunkLoadState.inFlightByChunkId, {});
  assert.deepEqual(second.runtimeChunkLoadState.zoomEndProtectedChunkIds, []);
  assert.equal(second.scenarioDistrictGroupByFeatureId.size, 0);
  assert.equal(second.scenarioHydrationHealthGate.status, "idle");
});

test("scenario activation commit helper centralizes staged runtime writes", () => {
  const runtimeState = createDefaultScenarioRuntimeState();
  const districtGroupByFeatureId = new Map([["A", "group-a"]]);

  commitScenarioActivationRuntimeState(runtimeState, {
    scenarioParentBorderEnabledBeforeActivate: { FR: true },
    scenarioDisplaySettingsBeforeActivate: { renderProfile: "balanced" },
    scenarioOceanFillBeforeActivate: "#123456",
    activeScenarioId: "tno_1962",
    scenarioBorderMode: "scenario_owner_only",
    activeScenarioManifest: { scenario_id: "tno_1962" },
    mapSemanticMode: "ownership",
    scenarioCountriesByTag: { FRA: { name: "France" } },
    activeScenarioMeshPack: { meshes: {} },
    scenarioRuntimeTopologyData: { id: "runtime-topology" },
    runtimePoliticalTopology: { id: "political-topology" },
    scenarioPoliticalChunkData: { political: true },
    runtimePoliticalMetaSeed: { featureIds: ["A"] },
    runtimePoliticalFeatureCollectionSeed: { features: [] },
    scenarioLandMaskData: { id: "land-mask" },
    scenarioContextLandMaskData: { id: "context-land-mask" },
    scenarioWaterRegionsData: { id: "water-regions" },
    scenarioRuntimeTopologyVersionTag: "runtime-v1",
    scenarioLandMaskVersionTag: "land-v1",
    scenarioContextLandMaskVersionTag: "context-v1",
    scenarioWaterOverlayVersionTag: "water-v1",
    scenarioSpecialRegionsData: { id: "special-regions" },
    scenarioReliefOverlaysData: { id: "relief-overlays" },
    scenarioReliefOverlayRevision: 4,
    scenarioDistrictGroupsData: { groups: [] },
    scenarioDistrictGroupByFeatureId: districtGroupByFeatureId,
    releasableCatalog: { ids: ["FRA"] },
    scenarioReleasableIndex: { FRA: true },
    scenarioAudit: { ok: true },
    scenarioImportAudit: null,
    scenarioBaselineHash: "baseline-sha",
    scenarioBaselineOwnersByFeatureId: { A: "FRA" },
    scenarioControllersByFeatureId: { A: "FRA" },
    scenarioAutoShellOwnerByFeatureId: {},
    scenarioAutoShellControllerByFeatureId: {},
    scenarioBaselineControllersByFeatureId: { A: "FRA" },
    scenarioBaselineCoresByFeatureId: { A: ["FRA"] },
    scenarioShellOverlayRevision: 2,
    scenarioControllerRevision: 3,
    scenarioViewMode: "ownership",
    countryNames: { FRA: "France" },
    sovereigntyByFeatureId: { A: "FRA" },
    sovereigntyInitialized: false,
    visualOverrides: {},
    featureOverrides: {},
    scenarioGeneratedColorTags: ["FRA"],
    scenarioFixedOwnerColors: { FRA: "#0055aa" },
    sovereignBaseColors: { FRA: "#0055aa" },
    countryBaseColors: { FRA: "#0055aa" },
    activeSovereignCode: "FRA",
    selectedWaterRegionId: "",
    selectedSpecialRegionId: "",
    hoveredWaterRegionId: null,
    hoveredSpecialRegionId: null,
  });

  assert.equal(runtimeState.activeScenarioId, "tno_1962");
  assert.equal(runtimeState.scenarioBorderMode, "scenario_owner_only");
  assert.equal(runtimeState.scenarioRuntimeTopologyVersionTag, "runtime-v1");
  assert.equal(runtimeState.scenarioReliefOverlayRevision, 4);
  assert.equal(runtimeState.scenarioDistrictGroupByFeatureId.get("A"), "group-a");
  assert.deepEqual(runtimeState.scenarioGeneratedColorTags, ["FRA"]);
  assert.deepEqual(runtimeState.scenarioFixedOwnerColors, { FRA: "#0055aa" });
  assert.equal(runtimeState.activeSovereignCode, "FRA");
});

test("scenario perf metrics are written through the scenario runtime owner", () => {
  const runtimeState = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" });
  const previousGlobalMetrics = globalThis.__scenarioPerfMetrics;
  try {
    const applyMetric = recordScenarioPerfMetricState(runtimeState, "applyScenarioBundle", 12.5, {
      scenarioId: "tno_1962",
    });
    assert.equal(applyMetric.durationMs, 12.5);
    assert.equal(applyMetric.scenarioId, "tno_1962");
    assert.equal(runtimeState.scenarioPerfMetrics.applyScenarioBundle, applyMetric);
    assert.equal(globalThis.__scenarioPerfMetrics, runtimeState.scenarioPerfMetrics);

    const prewarmMetric = setScenarioPerfMetricState(runtimeState, "chunkedFirstFramePrewarm", {
      prewarmStartedAt: 100,
    });
    assert.deepEqual(prewarmMetric, { prewarmStartedAt: 100 });

    const mergedPrewarmMetric = setScenarioPerfMetricState(runtimeState, "chunkedFirstFramePrewarm", {
      refreshScheduledAt: 120,
    }, { merge: true });
    assert.deepEqual(mergedPrewarmMetric, {
      prewarmStartedAt: 100,
      refreshScheduledAt: 120,
    });
  } finally {
    globalThis.__scenarioPerfMetrics = previousGlobalMetrics;
  }
});

test("zoom-end detail chunk protection is one-shot and selection scoped", () => {
  const loadState = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" }).runtimeChunkLoadState;
  const normalizeScenarioIdFn = (value) => String(value || "").trim();

  protectZoomEndChunksForSelection(
    loadState,
    ["political.detail.country.cd", "political.detail.country.cd", "context.detail.water"],
    {
      scenarioId: "tno_1962",
      selectionVersion: 7,
      focusCountry: "cd",
      normalizeScenarioIdFn,
      nowMs: 1000,
    },
  );

  assert.deepEqual(loadState.zoomEndProtectedChunkIds, ["political.detail.country.cd"]);
  assert.equal(loadState.zoomEndProtectedUntil, 6000);
  assert.equal(loadState.zoomEndProtectedSelectionVersion, 7);
  assert.equal(loadState.zoomEndProtectedFocusCountry, "CD");

  const protectedSelection = {
    evictableChunkIds: ["political.detail.country.cd", "political.detail.country.mx"],
  };
  assert.equal(applyZoomEndChunkProtectionToSelection(protectedSelection, loadState, {
    scenarioId: "tno_1962",
    selectionVersion: 7,
    focusCountry: "CD",
    normalizeScenarioIdFn,
    nowMs: 1200,
  }), true);
  assert.deepEqual(protectedSelection.evictableChunkIds, ["political.detail.country.mx"]);
  assert.deepEqual(loadState.zoomEndProtectedChunkIds, []);

  protectZoomEndChunksForSelection(loadState, ["political.detail.country.cd"], {
    scenarioId: "tno_1962",
    selectionVersion: 8,
    focusCountry: "CD",
    normalizeScenarioIdFn,
    nowMs: 2000,
  });
  const changedSelection = { evictableChunkIds: ["political.detail.country.cd"] };
  assert.equal(applyZoomEndChunkProtectionToSelection(changedSelection, loadState, {
    scenarioId: "tno_1962",
    selectionVersion: 9,
    focusCountry: "CD",
    normalizeScenarioIdFn,
    nowMs: 2200,
  }), false);
  assert.deepEqual(changedSelection.evictableChunkIds, ["political.detail.country.cd"]);
  assert.deepEqual(loadState.zoomEndProtectedChunkIds, []);

  protectZoomEndChunksForSelection(loadState, ["political.detail.country.cd"], {
    scenarioId: "tno_1962",
    selectionVersion: 10,
    focusCountry: "CD",
    normalizeScenarioIdFn,
    nowMs: 3000,
  });
  const expiredSelection = { evictableChunkIds: ["political.detail.country.cd"] };
  assert.equal(applyZoomEndChunkProtectionToSelection(expiredSelection, loadState, {
    scenarioId: "tno_1962",
    selectionVersion: 10,
    focusCountry: "CD",
    normalizeScenarioIdFn,
    nowMs: 9001,
  }), false);
  assert.deepEqual(expiredSelection.evictableChunkIds, ["political.detail.country.cd"]);
  assert.deepEqual(loadState.zoomEndProtectedChunkIds, []);
});

test("stale post-apply skip is scoped to the zoom-end source refresh", () => {
  const loadState = createDefaultScenarioRuntimeState({ scenarioId: "tno_1962" }).runtimeChunkLoadState;
  const normalizeScenarioIdFn = (value) => String(value || "").trim();
  loadState.selectionVersion = 7;
  loadState.lastSelection = {
    reason: "zoom-end",
    scenarioId: "tno_1962",
    requiredChunkIds: ["political.detail.country.cd"],
    optionalChunkIds: [],
  };
  loadState.lastZoomEndToChunkVisibleMetric = {
    recordedAt: 2000,
    scenarioId: "tno_1962",
    selectionVersion: 7,
  };

  assert.equal(shouldSkipStalePostApplyRefreshAfterZoomEnd(loadState, "scenario-apply", {
    scenarioId: "tno_1962",
    selectionVersion: 7,
    refreshSourceStartedAtMs: 1500,
    normalizeScenarioIdFn,
    nowMs: 2500,
  }), true);

  assert.equal(shouldSkipStalePostApplyRefreshAfterZoomEnd(loadState, "scenario-apply", {
    scenarioId: "tno_1962",
    selectionVersion: 7,
    refreshSourceStartedAtMs: 2100,
    normalizeScenarioIdFn,
    nowMs: 2500,
  }), false);

  assert.equal(shouldSkipStalePostApplyRefreshAfterZoomEnd(loadState, "scenario-apply-detail-prewarm", {
    scenarioId: "tno_1962",
    selectionVersion: 8,
    refreshSourceStartedAtMs: 1500,
    normalizeScenarioIdFn,
    nowMs: 2500,
  }), false);

  assert.equal(shouldSkipStalePostApplyRefreshAfterZoomEnd(loadState, "scenario-apply-detail-prewarm", {
    scenarioId: "other_scenario",
    selectionVersion: 7,
    refreshSourceStartedAtMs: 1500,
    normalizeScenarioIdFn,
    nowMs: 2500,
  }), false);
});
