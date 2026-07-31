import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultProjectedBoundsCacheState,
  createDefaultRenderPassCacheState,
  createDefaultRendererTransientRuntimeState,
  createDefaultSidebarPerfState,
  bumpScenarioDataGenerationState,
  bumpSceneGenerationState,
  ensureExactAfterSettleControllerState,
  ensureProjectedBoundsCacheState,
  ensureRenderPassCacheState,
  ensureSceneSnapshotState,
  ensureSidebarPerfState,
  isExactAfterSettleControllerActiveState,
  isExactAfterSettleGenerationCurrentState,
  resetExactAfterSettleControllerState,
  ensureSphericalFeatureDiagnosticsCache,
  resetProjectedBoundsCacheState,
  setInteractionInfrastructureStateFields,
  commitRendererDprStageState,
  setFirstVisibleFramePaintedState,
  commitProjectedBoundsDiagnosticsState,
} from "../js/core/state/renderer_runtime_state.js";
import {
  createDefaultUiState,
  normalizeOpenOceanLayerVisibility,
  restoreImportedLayerVisibilityState,
} from "../js/core/state/ui_state.js";
import {
  createDefaultSpatialIndexState,
} from "../js/core/state/spatial_index_state.js";
import {
  getTransportOverviewVisibilityField,
  listTransportOverviewCapabilityFamilyIds,
} from "../js/core/transport_capability_registry.js";
import {
  createDefaultBorderCacheState,
} from "../js/core/state/border_cache_state.js";
import {
  applyPrimarySpatialSnapshot,
  applySecondarySpatialSnapshot,
  clearPrimaryIndexMaps,
  markSecondarySpatialBuildPending,
  resetPrimarySpatialState,
  resetSecondarySpatialState,
} from "../js/core/renderer/spatial_index_runtime_state_ops.js";
import {
  createSpatialIndexPerfPayload,
  deriveRuntimePrimaryFeaturePayload,
} from "../js/core/renderer/spatial_index_runtime_derivation.js";
import {
  buildWaterSpatialItems,
} from "../js/core/renderer/spatial_index_runtime_builders.js";

test("renderer runtime factories return fresh nested caches", () => {
  const first = createDefaultRendererTransientRuntimeState();
  const second = createDefaultRendererTransientRuntimeState();

  first.renderPassCache.counters.frames = 9;
  first.renderPassCache.partialPoliticalDirtyIds.add("feature-1");
  first.renderPassCache.pendingPoliticalColorEditIds.add("feature-1");
  first.renderPassCache.pendingPoliticalColorEditRevision = 4;
  first.renderPassCache.pendingPoliticalColorEditScenarioId = "tno_1962";
  first.renderPassCache.fullReferenceTransforms.political = { x: 1, y: 2, k: 3 };
  first.sidebarPerf.counters.legendRenders = 2;
  first.projectedBoundsById.set("feature-1", { minX: 1 });
  first.sphericalFeatureDiagnosticsById.set("feature-1", { total: 1 });

  assert.equal(second.renderPassCache.counters.frames, 0);
  assert.equal(second.renderPassCache.partialPoliticalDirtyIds.size, 0);
  assert.equal(second.renderPassCache.pendingPoliticalColorEditIds.size, 0);
  assert.equal(second.renderPassCache.pendingPoliticalColorEditRevision, -1);
  assert.equal(second.renderPassCache.pendingPoliticalColorEditScenarioId, "");
  assert.deepEqual(second.renderPassCache.fullReferenceTransforms, {});
  assert.equal(second.sidebarPerf.counters.legendRenders, 0);
  assert.equal(second.projectedBoundsById.size, 0);
  assert.equal(second.sphericalFeatureDiagnosticsById.size, 0);
});

test("renderer supporting factories keep cache shapes aligned", () => {
  const renderPass = createDefaultRenderPassCacheState();
  const sidebarPerf = createDefaultSidebarPerfState();
  const projectedBounds = createDefaultProjectedBoundsCacheState();
  const borderCache = createDefaultBorderCacheState();
  const spatialIndex = createDefaultSpatialIndexState();

  assert.equal(renderPass.lastGoodFrame.valid, false);
  assert.equal(renderPass.lastGoodFrame.commitKey, null);
  assert.equal(renderPass.lastGoodFrame.commitKeySignature, "");
  assert.equal(renderPass.lastGoodFrame.committedFrameIdentity, null);
  assert.equal(renderPass.lastGoodFrame.metadata, null);
  assert.equal(renderPass.lastGoodFrame.sceneGeneration, 0);
  assert.equal(renderPass.lastGoodFrame.scenarioDataGeneration, 0);
  assert.equal(renderPass.lastGoodFrame.politicalDataStage, "unknown");
  assert.deepEqual(renderPass.fullReferenceTransforms, {});
  assert.equal(renderPass.compositeBuffer.canvas, null);
  assert.equal(renderPass.interactionComposite.scenarioId, "");
  assert.equal(renderPass.interactionComposite.sceneGeneration, 0);
  assert.equal(renderPass.interactionComposite.scenarioDataGeneration, 0);
  assert.equal(renderPass.interactionComposite.politicalDataStage, "unknown");
  assert.equal(renderPass.interactionComposite.topologyRevision, 0);
  assert.equal(renderPass.interactionComposite.pixelWidth, 0);
  assert.equal(renderPass.politicalPassSceneGeneration, 0);
  assert.equal(renderPass.politicalPassScenarioDataGeneration, 0);
  assert.equal(renderPass.politicalPassDataStage, "unknown");
  assert.equal(renderPass.politicalPassFullReady, false);
  assert.equal(renderPass.politicalPassFineCacheReady, false);
  assert.equal(renderPass.counters.missingVisibleFrameSkippedDuringInteraction, 0);
  const transient = createDefaultRendererTransientRuntimeState();
  assert.equal(transient.firstVisibleFramePainted, false);
  assert.equal(transient.exactAfterSettleController.phase, "idle");
  assert.equal(transient.exactAfterSettleController.generation, 0);
  assert.equal(transient.exactAfterSettleController.pendingPlan, null);
  assert.equal(transient.sceneGeneration, 0);
  assert.equal(transient.scenarioDataGeneration, 0);
  assert.equal(transient.sceneScenarioId, "");
  assert.equal(transient.sceneGenerationReason, "init");
  assert.equal(transient.scenarioDataGenerationReason, "init");
  assert.equal(sidebarPerf.counters.fullListRenders, 0);
  assert.equal(projectedBounds.projectedBoundsById.size, 0);
  assert.equal(borderCache.cachedFrontlineMeshHash, "");
  assert.equal(borderCache.cachedParentBordersByCountry.size, 0);
  assert.equal(spatialIndex.landIndex.size, 0);
  assert.equal(spatialIndex.waterSpatialItems.length, 0);
  assert.equal(spatialIndex.secondarySpatialGeneration, 0);
  assert.equal(spatialIndex.secondarySpatialBuildPending, false);
  assert.equal(spatialIndex.specialSpatialGrid.size, 0);
});

test("open ocean defaults keep visibility separate from interaction", () => {
  const state = createDefaultUiState();

  assert.equal(state.showWaterRegions, true);
  assert.equal(state.showOpenOceanRegions, true);
  assert.equal(state.allowOpenOceanSelect, false);
  assert.equal(state.allowOpenOceanPaint, false);
  assert.deepEqual(normalizeOpenOceanLayerVisibility({}), {
    showOpenOceanRegions: true,
    allowOpenOceanSelect: false,
    allowOpenOceanPaint: false,
  });
  assert.deepEqual(normalizeOpenOceanLayerVisibility({ showOpenOceanRegions: false }), {
    showOpenOceanRegions: false,
    allowOpenOceanSelect: false,
    allowOpenOceanPaint: false,
  });
  assert.deepEqual(normalizeOpenOceanLayerVisibility({ showOpenOceanRegions: true }), {
    showOpenOceanRegions: true,
    allowOpenOceanSelect: false,
    allowOpenOceanPaint: false,
  });

  const restoredTarget = {};
  const transportOverviewVisibility = Object.fromEntries(
    listTransportOverviewCapabilityFamilyIds()
      .map((familyId, index) => [getTransportOverviewVisibilityField(familyId), index % 2 === 0])
      .filter(([field]) => !!field)
  );
  const restored = restoreImportedLayerVisibilityState(restoredTarget, {
    showWaterRegions: true,
    ...transportOverviewVisibility,
  });
  assert.deepEqual(restored, {
    allowOpenOceanSelect: false,
    allowOpenOceanPaint: false,
  });
  assert.equal(restoredTarget.showOpenOceanRegions, true);
  assert.equal(restoredTarget.allowOpenOceanSelect, false);
  assert.equal(restoredTarget.allowOpenOceanPaint, false);
  for (const [field, value] of Object.entries(transportOverviewVisibility)) {
    assert.equal(restoredTarget[field], value);
  }
});


test("scene snapshot helpers normalize and bump explicit generations", () => {
  const state = {
    sceneGeneration: "2",
    scenarioDataGeneration: "5",
    sceneScenarioId: "tno_1962",
  };

  const normalized = ensureSceneSnapshotState(state);
  assert.equal(normalized, state);
  assert.equal(state.sceneGeneration, 2);
  assert.equal(state.scenarioDataGeneration, 5);
  assert.equal(state.sceneScenarioId, "tno_1962");
  assert.equal(state.sceneGenerationReason, "init");
  assert.equal(state.scenarioDataGenerationReason, "init");

  assert.equal(bumpSceneGenerationState(state, "scenario-switch"), 3);
  assert.equal(state.sceneGenerationReason, "scenario-switch");
  assert.equal(bumpScenarioDataGenerationState(state, "political-chunk-payload"), 6);
  assert.equal(state.scenarioDataGenerationReason, "political-chunk-payload");
});

test("exact-after-settle controller ignores stale generations", () => {
  const state = createDefaultRendererTransientRuntimeState();
  const controller = ensureExactAfterSettleControllerState(state);

  controller.generation = 1;
  controller.phase = "awaiting-paint";
  controller.pendingPlan = { id: "older" };

  resetExactAfterSettleControllerState(state, {
    reason: "newer-schedule",
    generation: 1,
  });
  state.exactAfterSettleController.phase = "scheduled";
  state.exactAfterSettleController.pendingPlan = { id: "newer" };

  assert.equal(resetExactAfterSettleControllerState(state, {
    reason: "stale-finalize",
    generation: 1,
  }), false);
  assert.equal(isExactAfterSettleGenerationCurrentState(state, 1, "awaiting-paint"), false);
  assert.equal(isExactAfterSettleGenerationCurrentState(state, 2, "scheduled"), true);
  assert.equal(isExactAfterSettleControllerActiveState(state), true);
  assert.equal(state.exactAfterSettleController.generation, 2);
  assert.equal(state.exactAfterSettleController.phase, "scheduled");
  assert.deepEqual(state.exactAfterSettleController.pendingPlan, { id: "newer" });
});

test("renderer runtime accessors normalize cache holders in place", () => {
  const state = {
    renderPassCache: {
      counters: { frames: 3 },
      dirty: {},
      reasons: {},
    },
    sidebarPerf: {},
  };
  const incompleteRenderPassCache = state.renderPassCache;

  const renderPassCache = ensureRenderPassCacheState(state, {
    cloneZoomTransform(value) {
      return value ? { ...value } : value;
    },
    renderPassNames: ["background", "political"],
  });
  const sidebarPerf = ensureSidebarPerfState(state);
  const projectedBoundsState = ensureProjectedBoundsCacheState(state);
  const projectedBoundsById = projectedBoundsState.projectedBoundsById;
  const projectedDefaults = resetProjectedBoundsCacheState(state);
  const diagnostics = ensureSphericalFeatureDiagnosticsCache(state);

  assert.equal(renderPassCache.counters.frames, 3);
  assert.notEqual(renderPassCache, incompleteRenderPassCache);
  assert.equal("compositeBuffer" in incompleteRenderPassCache, false);
  assert.equal(renderPassCache.compositeBuffer.canvas, null);
  assert.deepEqual(renderPassCache.fullReferenceTransforms, {});
  assert.ok(renderPassCache.partialPoliticalDirtyIds instanceof Set);
  assert.ok(renderPassCache.pendingPoliticalColorEditIds instanceof Set);
  assert.equal(renderPassCache.pendingPoliticalColorEditRevision, -1);
  assert.equal(renderPassCache.pendingPoliticalColorEditScenarioId, "");
  assert.equal(renderPassCache.pendingPoliticalColorEditReason, "");
  assert.equal(renderPassCache.dirty.background, true);
  assert.equal(renderPassCache.reasons.political, "init");
  assert.equal(sidebarPerf.counters.legendRenders, 0);
  assert.equal(projectedBoundsState, state);
  assert.ok(projectedBoundsById instanceof Map);
  assert.equal(projectedDefaults.projectedBoundsById, state.projectedBoundsById);
  assert.equal(projectedDefaults.sphericalFeatureDiagnosticsById, diagnostics);
  assert.equal(state.projectedBoundsById.size, 0);
  assert.equal(diagnostics.size, 0);
});

test("renderer callback mutation bridges preserve canonical action semantics", () => {
  const target = {};
  const diagnostics = {
    total: 1,
    byGeometryType: { Polygon: 1 },
    byReason: { projected: 1 },
  };

  assert.equal(commitRendererDprStageState(target, {
    stage: "interactive",
    switchedAt: 42,
  }), "interactive");
  assert.equal(setFirstVisibleFramePaintedState(target, 1), true);
  assert.equal(
    commitProjectedBoundsDiagnosticsState(target, diagnostics),
    true,
  );
  assert.equal(target.dprStage, "interactive");
  assert.equal(target.dprLastStageSwitchAt, 42);
  assert.equal(target.firstVisibleFramePainted, true);
  assert.equal(target.projectedBoundsDiagnostics, diagnostics);
});

test("renderer runtime cache wrapper preserves a fully normalized holder identity", () => {
  const renderPassCache = createDefaultRenderPassCacheState();
  renderPassCache.politicalPathCacheTransform = { x: 4, y: 5, k: 1.5 };
  const state = { renderPassCache };

  assert.equal(ensureRenderPassCacheState(state), renderPassCache);
  assert.equal(state.renderPassCache, renderPassCache);
  assert.deepEqual(renderPassCache.politicalPathCacheTransform, { x: 4, y: 5, k: 1.5 });
});

test("renderer runtime cache repair normalizes numeric strings once", () => {
  const renderPassCache = createDefaultRenderPassCacheState();
  renderPassCache.counters.frames = "3";
  renderPassCache.lastActionDurationMs = "4.5";
  renderPassCache.lastGoodFrame.capturedAt = "7";
  renderPassCache.interactionComposite.capturedAt = "8";
  const state = { renderPassCache };

  const repaired = ensureRenderPassCacheState(state);
  assert.notEqual(repaired, renderPassCache);
  assert.equal(repaired.counters.frames, 3);
  assert.equal(repaired.lastActionDurationMs, 4.5);
  assert.equal(repaired.lastGoodFrame.capturedAt, 7);
  assert.equal(repaired.interactionComposite.capturedAt, 8);
  assert.equal(ensureRenderPassCacheState(state), repaired);
  assert.equal(state.renderPassCache, repaired);
});

test("renderer runtime cache repair rejects malformed border snapshots once", () => {
  for (const malformed of [[], null, undefined]) {
    const renderPassCache = createDefaultRenderPassCacheState();
    if (malformed === undefined) {
      delete renderPassCache.borderSnapshot;
    } else {
      renderPassCache.borderSnapshot = malformed;
    }
    const state = { renderPassCache };
    const repaired = ensureRenderPassCacheState(state);
    assert.notEqual(repaired, renderPassCache);
    assert.deepEqual(repaired.borderSnapshot, {
      canvas: null,
      layout: null,
      referenceTransform: null,
      valid: false,
      reason: "init",
    });
    assert.equal(ensureRenderPassCacheState(state), repaired);
  }
});

test("renderer runtime cache repair rejects malformed nullable object fields once", () => {
  const renderPassCache = createDefaultRenderPassCacheState();
  renderPassCache.politicalPathCacheTransform = "stale-transform";
  renderPassCache.politicalPathWarmupHandle = "stale-handle";
  const state = { renderPassCache };

  const repaired = ensureRenderPassCacheState(state);
  assert.notEqual(repaired, renderPassCache);
  assert.equal(repaired.politicalPathCacheTransform, null);
  assert.equal(repaired.politicalPathWarmupHandle, null);
  assert.equal(ensureRenderPassCacheState(state), repaired);
  assert.equal(state.renderPassCache, repaired);
});

test("renderer runtime cache wrappers preserve legacy invalid-target fallbacks", () => {
  assert.ok(ensureRenderPassCacheState(null).politicalPathCache instanceof Map);
  assert.ok(ensureProjectedBoundsCacheState(null).projectedBoundsById instanceof Map);
  assert.ok(resetProjectedBoundsCacheState(null).projectedBoundsById instanceof Map);
  assert.ok(ensureSphericalFeatureDiagnosticsCache(null) instanceof Map);
  assert.equal(setInteractionInfrastructureStateFields(null, "ready"), "idle");
  assert.equal(setInteractionInfrastructureStateFields(undefined, "ready"), "idle");
});

test("spatial state ops preserve snapshot shapes across reset and apply", () => {
  const state = createDefaultSpatialIndexState();
  const landIndexRef = state.landIndex;
  const countryToFeatureIdsRef = state.countryToFeatureIds;
  const idToKeyRef = state.idToKey;
  const keyToIdRef = state.keyToId;

  state.landIndex.set("a", {});
  state.countryToFeatureIds.set("AA", ["a"]);
  state.idToKey.set("a", 1);
  state.keyToId.set(1, "a");
  state.spatialItems = [{ id: "a" }];
  state.waterSpatialItems = [{ id: "water" }];
  state.specialSpatialItems = [{ id: "special" }];

  clearPrimaryIndexMaps(state);
  resetPrimarySpatialState(state);
  resetSecondarySpatialState(state);

  assert.equal(state.landIndex, landIndexRef);
  assert.equal(state.countryToFeatureIds, countryToFeatureIdsRef);
  assert.equal(state.idToKey, idToKeyRef);
  assert.equal(state.keyToId, keyToIdRef);
  assert.equal(state.landIndex.size, 0);
  assert.equal(state.countryToFeatureIds.size, 0);
  assert.equal(state.idToKey.size, 0);
  assert.equal(state.keyToId.size, 0);
  assert.equal(state.spatialItems.length, 0);
  assert.equal(state.waterSpatialItems.length, 0);
  assert.equal(state.specialSpatialItems.length, 0);
  assert.equal(state.secondarySpatialBuildPending, false);

  const primaryItems = [{ id: "next" }];
  const primaryGrid = new Map([["grid", [1]]]);
  const primaryItemsById = new Map([["next", primaryItems[0]]]);
  const waterItems = [{ id: "water-next" }];
  const waterGrid = new Map([["water", [1]]]);
  const waterItemsById = new Map([["water-next", waterItems[0]]]);
  const specialItems = [{ id: "special-next" }];
  const specialGrid = new Map([["special", [1]]]);
  const specialItemsById = new Map([["special-next", specialItems[0]]]);

  applyPrimarySpatialSnapshot(state, {
    items: primaryItems,
    grid: primaryGrid,
    gridMeta: { cols: 2 },
    itemsById: primaryItemsById,
  });
  applySecondarySpatialSnapshot(state, {
    water: {
      items: waterItems,
      grid: waterGrid,
      gridMeta: { cols: 1 },
      itemsById: waterItemsById,
    },
    special: {
      items: specialItems,
      grid: specialGrid,
      gridMeta: { cols: 3 },
      itemsById: specialItemsById,
    },
  });

  assert.equal(state.spatialItems, primaryItems);
  assert.equal(state.spatialGrid, primaryGrid);
  assert.deepEqual(state.spatialGridMeta, { cols: 2 });
  assert.equal(state.spatialItemsById, primaryItemsById);
  assert.equal(state.spatialIndex, null);
  assert.equal(state.waterSpatialItems, waterItems);
  assert.equal(state.waterSpatialGrid, waterGrid);
  assert.deepEqual(state.waterSpatialGridMeta, { cols: 1 });
  assert.equal(state.waterSpatialItemsById, waterItemsById);
  assert.equal(state.waterSpatialIndex, null);
  assert.equal(state.specialSpatialItems, specialItems);
  assert.equal(state.specialSpatialGrid, specialGrid);
  assert.deepEqual(state.specialSpatialGridMeta, { cols: 3 });
  assert.equal(state.specialSpatialItemsById, specialItemsById);
  assert.equal(state.specialSpatialIndex, null);
  assert.equal(state.secondarySpatialBuildPending, false);
  assert.equal(state.secondarySpatialLastReason, "secondary-spatial-apply");
});

test("secondary spatial pending state can preserve the last valid snapshot", () => {
  const state = createDefaultSpatialIndexState();
  const waterItems = [{ id: "water-current" }];
  const specialItems = [{ id: "special-current" }];
  applySecondarySpatialSnapshot(state, {
    water: {
      items: waterItems,
      grid: new Map([["water", [waterItems[0]]]]),
      gridMeta: { cols: 1 },
      itemsById: new Map([["water-current", waterItems[0]]]),
    },
    special: {
      items: specialItems,
      grid: new Map([["special", [specialItems[0]]]]),
      gridMeta: { cols: 1 },
      itemsById: new Map([["special-current", specialItems[0]]]),
    },
    reason: "seed",
  });

  markSecondarySpatialBuildPending(state, {
    reason: "water-hit-demand",
    preserveCurrent: true,
  });

  assert.equal(state.secondarySpatialBuildPending, true);
  assert.equal(state.secondarySpatialPreservedDuringBuild, true);
  assert.equal(state.secondarySpatialLastReason, "water-hit-demand");
  assert.equal(state.waterSpatialItems, waterItems);
  assert.equal(state.specialSpatialItems, specialItems);

  applySecondarySpatialSnapshot(state, {
    water: {
      items: [{ id: "water-next" }],
    },
    special: {
      items: [{ id: "special-next" }],
    },
    reason: "rebuilt",
  });

  assert.equal(state.secondarySpatialBuildPending, false);
  assert.equal(state.secondarySpatialPreservedDuringBuild, false);
  assert.equal(state.secondarySpatialLastReason, "rebuilt");
  assert.deepEqual(state.waterSpatialItems.map((item) => item.id), ["water-next"]);
});

test("spatial derivation payloads stay pure and explicit", () => {
  const projectedBoundsCache = new Map();
  const payload = deriveRuntimePrimaryFeaturePayload({
    feature: { id: "feature-1" },
    id: "feature-1",
    canvasWidth: 100,
    canvasHeight: 100,
    projectedBoundsCache,
    computeProjectedFeatureBounds: () => ({ minX: 1, minY: 2, maxX: 3, maxY: 4 }),
    shouldSkipFeature: () => false,
  });
  const perfPayload = createSpatialIndexPerfPayload({
    landCount: 10,
    spatialItems: 8,
    waterItems: 2,
    specialItems: 1,
    spatialGridCells: 5,
    spatialGridGlobals: 1,
    waterGridCells: 3,
    waterGridGlobals: 2,
    specialGridCells: 2,
    specialGridGlobals: 1,
    skipped: false,
    chunked: true,
  });

  assert.deepEqual(payload, {
    bounds: { minX: 1, minY: 2, maxX: 3, maxY: 4 },
    skipped: false,
  });
  assert.deepEqual(Object.keys(payload).sort(), ["bounds", "skipped"]);
  assert.deepEqual(projectedBoundsCache.get("feature-1"), { minX: 1, minY: 2, maxX: 3, maxY: 4 });
  assert.deepEqual(perfPayload, {
    landCount: 10,
    spatialItems: 8,
    waterItems: 2,
    specialItems: 1,
    spatialGridCells: 5,
    spatialGridGlobals: 1,
    waterGridCells: 3,
    waterGridGlobals: 2,
    specialGridCells: 2,
    specialGridGlobals: 1,
    skipped: false,
    chunked: true,
  });
});

test("water spatial builder indexes base geography water hit geometries", () => {
  const targetIds = [
    "caspian_sea",
    "lake_superior",
    "lake_michigan",
    "lake_huron",
    "lake_erie",
    "lake_ontario",
  ];
  const features = targetIds.map((featureId, index) => ({
    type: "Feature",
    properties: {
      id: featureId,
      render_as_base_geography: true,
      interactive: true,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [index, index],
        [index + 1, index],
        [index + 1, index + 1],
        [index, index + 1],
        [index, index],
      ]],
    },
  }));

  const items = buildWaterSpatialItems({
    features,
    getFeatureId: (feature) => String(feature?.properties?.id || ""),
    collectFeatureHitGeometries: (feature) => [feature],
    computeProjectedGeoBounds: (feature) => {
      const coords = feature.geometry.coordinates[0];
      const xs = coords.map(([x]) => x);
      const ys = coords.map(([, y]) => y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
        area: 1,
      };
    },
    shouldExcludeWaterHitGeometry: () => false,
  });

  assert.deepEqual(
    items.map((item) => item.featureId).sort(),
    [...targetIds].sort(),
  );
  assert.ok(items.every((item) => item.id.endsWith("::part:0")));
  assert.ok(items.every((item) => item.bboxArea > 0));
});
