import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenarioRefreshRuntime,
} from "../js/core/map_renderer/scenario_refresh_runtime.js";
import {
  createFrameGraphInvalidation,
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
  getFirstFrameTargetResources,
  getTargetPassesForResources,
  getTargetResourcesForPasses,
  getRendererRefreshPlan,
  getScenarioChunkPromotionTargetPasses,
  getScenarioChunkPromotionTargetResources,
  normalizeRendererRefreshPlan,
  resolveFrameGraphInvalidationExecutionPlan,
  resolveFirstFrameTargetResources,
  resolveScenarioChunkPromotionRendererRefreshDescriptor,
} from "../js/core/map_renderer/scenario_refresh_plans.js";

test("scenario apply refresh plan declares complete baseline render passes", () => {
  const plan = createScenarioApplyRefreshPlan({ refreshOpeningOwnerBorders: false });

  assert.equal(plan.kind, "ScenarioRefreshPlan");
  assert.equal(plan.source, "scenario-apply");
  assert.deepEqual(plan.changedLayerKeys, []);
  assert.deepEqual(plan.renderer, {
    kind: "RendererRefreshPlan",
    source: "scenario-apply",
    targetPasses: [
      "background",
      "physicalBase",
      "political",
      "contextBase",
      "contextScenario",
      "dayNight",
      "borders",
      "labels",
    ],
    refreshOpeningOwnerBorders: false,
    resetWaterCacheReason: "scenario-switch-complete",
  });
});

test("chunk promotion plan normalizes layer keys and carries opening border policy", () => {
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys: [" Water ", "water", "CITIES", "", null],
    hasPoliticalChange: true,
  });

  assert.equal(plan.kind, "ScenarioRefreshPlan");
  assert.equal(plan.source, "scenario-chunk-promotion");
  assert.deepEqual(plan.changedLayerKeys, ["water", "cities"]);
  assert.equal(plan.renderer.kind, "RendererRefreshPlan");
  assert.equal(plan.renderer.source, "scenario-chunk-promotion");
  assert.deepEqual(plan.renderer.targetPasses, []);
  assert.equal(plan.renderer.refreshOpeningOwnerBorders, true);
  assert.equal(plan.renderer.resetWaterCacheReason, "");
  assert.deepEqual(plan.renderer.frameGraphInvalidation.targetResources, [
    "politicalBaseBuffer",
    "hitIndex",
    "contextBaseBuffer",
    "contextMarkersBuffer",
    "borderBuffer",
    "interactionOverlay",
    "labelBuffer",
    "contextScenarioBuffer",
    "dayNightBuffer",
  ]);
  assert.equal(Object.hasOwn(plan.renderer.frameGraphInvalidation, "legacyTargetPasses"), false);
  assert.equal(Object.hasOwn(plan.renderer.frameGraphInvalidation, "targetPasses"), false);
  assert.deepEqual(resolveFrameGraphInvalidationExecutionPlan(plan.renderer.frameGraphInvalidation).targetPasses, [
    "political",
    "contextBase",
    "contextMarkers",
    "borders",
    "labels",
    "contextScenario",
    "dayNight",
  ]);
  assert.equal(getRendererRefreshPlan(plan), plan.renderer);
});

test("frame graph invalidation separates data, visible render, and interaction authority layers", () => {
  const invalidation = createFrameGraphInvalidation({
    reason: "promotion",
    dataRevisionLayers: [" political ", "political", "WATER"],
    renderVisibleLayers: ["cities"],
    interactionAuthorityLayers: ["scenario_atlantropa"],
    targetResources: ["politicalBaseBuffer", "hitIndex", "labelBuffer"],
    clearLastGoodFrame: true,
    clearReferenceTransforms: true,
    clearPartialPoliticalDirtyIds: true,
    resetWaterCacheReason: "water-reset",
    clearOpeningOwnerBorderCache: true,
    clearInteractionComposite: true,
  });

  assert.deepEqual(invalidation, {
    kind: "FrameGraphInvalidation",
    reason: "promotion",
    dataRevisionLayers: ["political", "water"],
    renderVisibleLayers: ["cities"],
    interactionAuthorityLayers: ["scenario_atlantropa"],
    targetResources: ["politicalBaseBuffer", "hitIndex", "labelBuffer"],
    clearLastGoodFrame: true,
    clearReferenceTransforms: true,
    clearPartialPoliticalDirtyIds: true,
    resetWaterCacheReason: "water-reset",
    clearOpeningOwnerBorderCache: true,
    clearInteractionComposite: true,
  });
});

test("frame graph invalidation is resource-first and ignores pass-only fan-out", () => {
  const invalidation = createFrameGraphInvalidation({
    reason: "resource-authority",
    targetResources: [" labelBuffer ", "politicalBaseBuffer", "labelBuffer", "", null],
  });

  assert.deepEqual(invalidation.targetResources, ["labelBuffer", "politicalBaseBuffer"]);
  assert.equal(Object.hasOwn(invalidation, "legacyTargetPasses"), false);
  assert.equal(Object.hasOwn(invalidation, "targetPasses"), false);
  assert.deepEqual(resolveFrameGraphInvalidationExecutionPlan(invalidation).targetPasses, ["labels", "political"]);

  assert.throws(
    () => createFrameGraphInvalidation({
      reason: "pass-only-no-fanout",
      targetPasses: ["political", "labels"],
    }),
    /targetResources only/,
  );
  assert.throws(
    () => createFrameGraphInvalidation({
      reason: "legacy-pass-field",
      legacyTargetPasses: ["political"],
    }),
    /targetResources only/,
  );

  const emptyResourceInvalidation = createFrameGraphInvalidation({
    reason: "empty-resource-authority",
    targetResources: [],
  });
  assert.deepEqual(emptyResourceInvalidation.targetResources, []);
  assert.equal(Object.hasOwn(emptyResourceInvalidation, "legacyTargetPasses"), false);
  assert.equal(Object.hasOwn(emptyResourceInvalidation, "targetPasses"), false);
  assert.deepEqual(resolveFrameGraphInvalidationExecutionPlan(emptyResourceInvalidation).targetPasses, []);
});

test("chunk promotion frame graph resources resolve equivalent pass fan-out through bridge", () => {
  const changedLayerKeys = ["strategicvalues", "scenario_atlantropa"];
  const resolvedTargetPasses = getScenarioChunkPromotionTargetPasses({
    changedLayerKeys,
    hasPoliticalChange: false,
  });
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys,
    hasPoliticalChange: false,
  });

  assert.deepEqual(plan.renderer.targetPasses, []);
  assert.equal(Object.hasOwn(plan.renderer.frameGraphInvalidation, "legacyTargetPasses"), false);
  assert.equal(Object.hasOwn(plan.renderer.frameGraphInvalidation, "targetPasses"), false);
  assert.deepEqual(
    plan.renderer.frameGraphInvalidation.targetResources,
    getTargetResourcesForPasses(resolvedTargetPasses),
  );
  assert.deepEqual(
    resolveFrameGraphInvalidationExecutionPlan(plan.renderer.frameGraphInvalidation).targetPasses,
    resolvedTargetPasses,
  );
});

test("chunk promotion target passes stay unique across political and layer changes", () => {
  assert.deepEqual(
    getScenarioChunkPromotionTargetPasses({
      hasPoliticalChange: true,
      changedLayerKeys: ["cities", "water", "special", "relief", "scenario_atlantropa"],
    }),
    ["political", "contextBase", "contextMarkers", "borders", "labels", "dayNight", "contextScenario"],
  );
});

test("strategic values chunk promotion refreshes political and marker passes", () => {
  assert.deepEqual(
    getScenarioChunkPromotionTargetResources({
      hasPoliticalChange: false,
      changedLayerKeys: ["strategicvalues"],
    }),
    ["politicalBaseBuffer", "hitIndex", "contextMarkersBuffer", "labelBuffer"],
  );
  assert.deepEqual(
    getScenarioChunkPromotionTargetPasses({
      hasPoliticalChange: false,
      changedLayerKeys: ["strategicvalues"],
    }),
    ["political", "contextMarkers", "labels"],
  );
});

test("first-frame resource allowlist keeps startup visual work to the baseline", () => {
  assert.deepEqual(getFirstFrameTargetResources(), [
    "backgroundBuffer",
    "physicalBaseBuffer",
    "politicalBaseBuffer",
    "hitIndex",
    "borderBuffer",
    "interactionOverlay",
  ]);
  assert.deepEqual(getFirstFrameTargetResources({ hgoPreviewDirty: true }), [
    "backgroundBuffer",
    "physicalBaseBuffer",
    "politicalBaseBuffer",
    "hitIndex",
    "borderBuffer",
    "interactionOverlay",
    "hgoPreviewBuffer",
  ]);
  assert.deepEqual(
    resolveFirstFrameTargetResources(["contextBaseBuffer", "labelBuffer", "politicalBaseBuffer"], { hgoPreviewDirty: false }),
    ["backgroundBuffer", "physicalBaseBuffer", "politicalBaseBuffer", "hitIndex", "borderBuffer", "interactionOverlay"],
  );
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys: ["cities", "water"],
    hasPoliticalChange: true,
    firstFrameOnly: true,
  });
  assert.deepEqual(plan.renderer.frameGraphInvalidation.targetResources, [
    "backgroundBuffer",
    "physicalBaseBuffer",
    "politicalBaseBuffer",
    "hitIndex",
    "borderBuffer",
    "interactionOverlay",
  ]);
  assert.deepEqual(resolveFrameGraphInvalidationExecutionPlan(plan.renderer.frameGraphInvalidation).targetPasses, [
    "background",
    "physicalBase",
    "political",
    "borders",
  ]);
  const hgoPlan = createScenarioChunkPromotionRefreshPlan({
    hasPoliticalChange: true,
    firstFrameOnly: true,
    hgoPreviewDirty: true,
  });
  assert.deepEqual(hgoPlan.renderer.frameGraphInvalidation.targetResources, [
    "backgroundBuffer",
    "physicalBaseBuffer",
    "politicalBaseBuffer",
    "hitIndex",
    "borderBuffer",
    "interactionOverlay",
    "hgoPreviewBuffer",
  ]);
  assert.deepEqual(resolveFrameGraphInvalidationExecutionPlan(hgoPlan.renderer.frameGraphInvalidation).targetPasses, [
    "background",
    "physicalBase",
    "political",
    "borders",
    "hgoPreview",
  ]);
});

test("renderer refresh plan normalization applies defaults and trims pass names", () => {
  const frameGraphInvalidation = createFrameGraphInvalidation({
    reason: "normalize",
    targetResources: ["politicalBaseBuffer", "hitIndex"],
  });

  assert.deepEqual(
    normalizeRendererRefreshPlan({
      targetPasses: [" political ", "political", "", null, "labels"],
      frameGraphInvalidation,
      refreshOpeningOwnerBorders: false,
    }, {
      source: "default-source",
      targetPasses: ["background"],
      resetWaterCacheReason: "water-default",
    }),
    {
      source: "default-source",
      targetPasses: ["political", "labels"],
      frameGraphInvalidation,
      refreshOpeningOwnerBorders: false,
      resetWaterCacheReason: "water-default",
    },
  );
});

test("chunk promotion descriptor resolves resources before runtime execution", () => {
  const descriptor = resolveScenarioChunkPromotionRendererRefreshDescriptor({
    changedLayerKeys: ["strategicvalues"],
    hasPoliticalChange: false,
  });

  assert.deepEqual(descriptor.rendererRefreshPlan.targetPasses, ["political", "contextMarkers", "labels"]);
  assert.equal(descriptor.frameGraphInvalidation, null);
  assert.deepEqual(descriptor.targetResources, ["politicalBaseBuffer", "hitIndex", "contextMarkersBuffer", "labelBuffer"]);
  assert.deepEqual(descriptor.targetPasses, ["political", "contextMarkers", "labels"]);

  const explicitDescriptor = resolveScenarioChunkPromotionRendererRefreshDescriptor({
    refreshPlan: {
      frameGraphInvalidation: createFrameGraphInvalidation({
        reason: "explicit-resource",
        targetResources: ["contextScenarioBuffer"],
      }),
    },
    changedLayerKeys: ["strategicvalues"],
    hasPoliticalChange: false,
  });

  assert.deepEqual(explicitDescriptor.targetResources, ["contextScenarioBuffer"]);
  assert.deepEqual(explicitDescriptor.targetPasses, ["contextScenario"]);
  assert.equal(explicitDescriptor.hasExplicitTargetResources, true);

  const emptyResourceDescriptor = resolveScenarioChunkPromotionRendererRefreshDescriptor({
    refreshPlan: {
      targetPasses: ["political"],
      frameGraphInvalidation: createFrameGraphInvalidation({
        reason: "explicit-empty-resource",
        targetResources: [],
      }),
    },
    changedLayerKeys: ["strategicvalues"],
    hasPoliticalChange: false,
  });

  assert.equal(emptyResourceDescriptor.hasExplicitTargetResources, true);
  assert.deepEqual(emptyResourceDescriptor.targetResources, []);
  assert.deepEqual(emptyResourceDescriptor.targetPasses, []);
});

test("frame graph invalidation execution plan resolves pass compatibility at one bridge", () => {
  assert.deepEqual(
    resolveFrameGraphInvalidationExecutionPlan(null, [" political ", "labels", "political"]),
    {
      targetResources: ["politicalBaseBuffer", "hitIndex", "labelBuffer"],
      targetPasses: ["political", "labels"],
      invalidationTargetPasses: ["political", "labels"],
      hasExplicitTargetResources: false,
    },
  );

  const explicitResourceInvalidation = createFrameGraphInvalidation({
    reason: "explicit-resource",
    targetResources: ["contextScenarioBuffer"],
  });
  assert.deepEqual(
    resolveFrameGraphInvalidationExecutionPlan(explicitResourceInvalidation, ["political"]),
    {
      targetResources: ["contextScenarioBuffer"],
      targetPasses: ["contextScenario"],
      invalidationTargetPasses: ["contextScenario"],
      hasExplicitTargetResources: true,
    },
  );

  const explicitEmptyInvalidation = createFrameGraphInvalidation({
    reason: "explicit-empty-resource",
    targetResources: [],
  });
  assert.deepEqual(
    resolveFrameGraphInvalidationExecutionPlan(explicitEmptyInvalidation, ["political"]),
    {
      targetResources: [],
      targetPasses: [],
      invalidationTargetPasses: [],
      hasExplicitTargetResources: true,
    },
  );
});

test("chunk promotion runtime executes default frame graph invalidation effects", () => {
  const calls = [];
  const runtimeState = {
    activeScenarioId: "tno_1962",
    runtimeChunkLoadState: {
      selectionVersion: 3,
      pendingVisualPromotion: {
        queuedAt: 10,
        primaryVisibleFeatureCount: 2,
      },
    },
    activeScenarioMeshPack: { meshes: {} },
    scenarioPoliticalChunkData: { type: "FeatureCollection", features: [{ id: "a" }] },
    scenarioPoliticalVisibleChunkData: { type: "FeatureCollection", features: [{ id: "a" }] },
  };
  const deps = {
    runtimeState,
    buildIndex: () => calls.push(["buildIndex"]),
    buildSpatialIndexChunked: () => calls.push(["buildSpatialIndexChunked"]),
    rebuildPoliticalLandCollections: () => calls.push(["rebuildPoliticalLandCollections"]),
    rebuildRuntimeDerivedState: () => calls.push(["rebuildRuntimeDerivedState"]),
    rebuildPrimaryPoliticalDerivedState: (options) => calls.push(["rebuildPrimaryPoliticalDerivedState", options]),
    setInteractionInfrastructureState: (...args) => calls.push(["setInteractionInfrastructureState", ...args]),
    scheduleSecondarySpatialIndexBuild: (...args) => calls.push(["scheduleSecondarySpatialIndexBuild", ...args]),
    scheduleHitCanvasBuildIfNeeded: (...args) => calls.push(["scheduleHitCanvasBuildIfNeeded", ...args]),
    ensureSovereigntyState: () => calls.push(["ensureSovereigntyState"]),
    refreshScenarioOpeningOwnerBorders: (...args) => calls.push(["refreshScenarioOpeningOwnerBorders", ...args]),
    invalidateBorderCache: () => calls.push(["invalidateBorderCache"]),
    updateDynamicBorderStatusUI: () => calls.push(["updateDynamicBorderStatusUI"]),
    updateSpecialZonesPaths: () => calls.push(["updateSpecialZonesPaths"]),
    renderSpecialZoneEditorOverlay: () => calls.push(["renderSpecialZoneEditorOverlay"]),
    render: () => calls.push(["render"]),
    recordRenderPerfMetric: (...args) => calls.push(["recordRenderPerfMetric", ...args]),
    recordInteractionRecoveryTaskMetric: (...args) => calls.push(["recordInteractionRecoveryTaskMetric", ...args]),
    beginInteractionRecoveryTask: (...args) => calls.push(["beginInteractionRecoveryTask", ...args]),
    endInteractionRecoveryTask: (...args) => calls.push(["endInteractionRecoveryTask", ...args]),
    isInteractionRecoverySettled: () => true,
    scheduleDeferredWork: (...args) => {
      calls.push(["scheduleDeferredWork", ...args]);
      return { kind: "deferred-work" };
    },
    cancelDeferredWork: (...args) => calls.push(["cancelDeferredWork", ...args]),
    yieldToMain: async () => calls.push(["yieldToMain"]),
    nowMs: (() => {
      let now = 100;
      return () => {
        now += 5;
        return now;
      };
    })(),
    markRendererTopologyChanged: (...args) => calls.push(["markRendererTopologyChanged", ...args]),
    clearDeferredInternalBorderMeshCaches: () => calls.push(["clearDeferredInternalBorderMeshCaches"]),
    scheduleDeferredHeavyBorderMeshes: () => calls.push(["scheduleDeferredHeavyBorderMeshes"]),
    resetScenarioWaterCacheAdaptiveState: (...args) => calls.push(["resetScenarioWaterCacheAdaptiveState", ...args]),
    syncScenarioSecondaryRegionIndexes: (...args) => {
      calls.push(["syncScenarioSecondaryRegionIndexes", ...args]);
      return false;
    },
    invalidateRenderPasses: (...args) => calls.push(["invalidateRenderPasses", ...args]),
    markAllOverlaysDirty: () => calls.push(["markAllOverlaysDirty"]),
    updateZoomTranslateExtent: () => calls.push(["updateZoomTranslateExtent"]),
    isUsableMesh: () => false,
    resetRendererTransactionState: (...args) => calls.push(["resetRendererTransactionState", ...args]),
    clearLastGoodFrame: (...args) => calls.push(["clearLastGoodFrame", ...args]),
    invalidateInteractionComposite: (...args) => calls.push(["invalidateInteractionComposite", ...args]),
    resetFirstVisibleFramePainted: (...args) => calls.push(["resetFirstVisibleFramePainted", ...args]),
    clearRenderPassReferenceTransforms: (...args) => calls.push(["clearRenderPassReferenceTransforms", ...args]),
    rebuildStaticMeshes: (...args) => calls.push(["rebuildStaticMeshes", ...args]),
    getEffectiveAtlantropaFeatures: () => ({ water: [] }),
    rebuildAuxiliaryRegionIndexes: () => calls.push(["rebuildAuxiliaryRegionIndexes"]),
    getSpatialIndexRuntimeOwner: () => ({
      resetSecondarySpatialIndexState: (...args) => calls.push(["resetSecondarySpatialIndexState", ...args]),
      buildSecondarySpatialIndexes: (...args) => calls.push(["buildSecondarySpatialIndexes", ...args]),
    }),
    queueIndexUiRefresh: (...args) => calls.push(["queueIndexUiRefresh", ...args]),
  };
  const runtime = createScenarioRefreshRuntime(deps);
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys: ["water"],
    hasPoliticalChange: true,
  });
  const rendererPlan = getRendererRefreshPlan(plan);
  const frameGraphInvalidation = {
    ...rendererPlan.frameGraphInvalidation,
    targetResources: rendererPlan.frameGraphInvalidation.targetResources,
  };
  const { targetPasses } = resolveFrameGraphInvalidationExecutionPlan(
    frameGraphInvalidation,
    rendererPlan.targetPasses,
  );

  runtime.refreshMapDataForScenarioChunkPromotion({
    reason: "test-chunk-promotion",
    changedLayerKeys: ["water"],
    hasPoliticalPayloadChange: true,
    refreshPlan: {
      ...rendererPlan,
      frameGraphInvalidation,
    },
    suppressRender: true,
  });

  assert.deepEqual(calls.find(([name]) => name === "clearLastGoodFrame"), [
    "clearLastGoodFrame",
    "test-chunk-promotion-frame-graph",
  ]);
  assert.deepEqual(calls.find(([name]) => name === "clearRenderPassReferenceTransforms"), [
    "clearRenderPassReferenceTransforms",
    targetPasses,
  ]);
  assert.deepEqual(calls.find(([name]) => name === "invalidateInteractionComposite"), [
    "invalidateInteractionComposite",
    "test-chunk-promotion-frame-graph",
  ]);
  assert.ok(calls.some(([name]) => name === "invalidateBorderCache"));
  assert.ok(calls.some(([name, reason]) => (
    name === "resetScenarioWaterCacheAdaptiveState"
    && reason === "scenario-water-regions-data-replaced"
  )));
  assert.deepEqual(calls.find(([name]) => name === "invalidateRenderPasses"), [
    "invalidateRenderPasses",
    targetPasses,
    "test-chunk-promotion",
  ]);
  assert.ok(calls.some(([name]) => name === "scheduleDeferredWork"));
  assert.equal(calls.some(([name]) => name === "render"), false);

  calls.length = 0;
  runtime.refreshMapDataForScenarioChunkPromotion({
    reason: "explicit-empty-resource-plan",
    changedLayerKeys: [],
    hasPoliticalPayloadChange: false,
    refreshPlan: {
      source: "scenario-chunk-promotion",
      targetPasses: ["political", "labels"],
      frameGraphInvalidation: createFrameGraphInvalidation({
        reason: "explicit-empty-resource-plan",
        targetResources: [],
        clearReferenceTransforms: true,
      }),
    },
    suppressRender: true,
  });

  assert.deepEqual(calls.find(([name]) => name === "clearRenderPassReferenceTransforms"), [
    "clearRenderPassReferenceTransforms",
    [],
  ]);
  assert.equal(calls.some(([name]) => name === "invalidateRenderPasses"), false);
});
