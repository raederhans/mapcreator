import {
  normalizeRendererRefreshPlan,
  resolveScenarioChunkPromotionRendererRefreshDescriptor,
} from "./scenario_refresh_plans.js";
import { createScenarioVisualInvalidationExecutor } from "./scenario_visual_invalidation_executor.js";
import {
  buildScenarioChunkPromotionVisualMetricDetails,
  createScenarioChunkPromotionDelta,
  readFirstNonNegativeCount,
  resolveScenarioChunkPromotionChangeSet,
} from "../renderer/scenario_chunk_promotion_helpers.js";

function createScenarioRefreshRuntime(deps = {}) {
  const {
    runtimeState,
    buildIndex, buildSpatialIndexChunked,
    rebuildPoliticalLandCollections, rebuildRuntimeDerivedState, rebuildPrimaryPoliticalDerivedState,
    setInteractionInfrastructureState, scheduleSecondarySpatialIndexBuild, scheduleHitCanvasBuildIfNeeded,
    ensureSovereigntyState, refreshScenarioOpeningOwnerBorders, invalidateBorderCache,
    updateDynamicBorderStatusUI, updateSpecialZonesPaths, renderSpecialZoneEditorOverlay, render,
    recordRenderPerfMetric, recordInteractionRecoveryTaskMetric,
    beginInteractionRecoveryTask, endInteractionRecoveryTask, isInteractionRecoverySettled,
    scheduleDeferredWork, cancelDeferredWork, yieldToMain, nowMs,
    markRendererTopologyChanged, clearDeferredInternalBorderMeshCaches,
    scheduleDeferredHeavyBorderMeshes, resetScenarioWaterCacheAdaptiveState,
    syncScenarioSecondaryRegionIndexes, invalidateRenderPasses,
    markAllOverlaysDirty, updateZoomTranslateExtent, isUsableMesh,
    resetRendererTransactionState, clearLastGoodFrame, invalidateInteractionComposite,
    resetFirstVisibleFramePainted, clearRenderPassReferenceTransforms,
    rebuildStaticMeshes, getEffectiveAtlantropaFeatures,
    rebuildAuxiliaryRegionIndexes, getSpatialIndexRuntimeOwner, queueIndexUiRefresh,
  } = deps;

  let deferredScenarioChunkPromotionInfraHandle = null;
  let scenarioChunkPromotionVersion = 0;
  const scenarioVisualInvalidationExecutor = createScenarioVisualInvalidationExecutor({
    clearLastGoodFrame, clearRenderPassReferenceTransforms, invalidateInteractionComposite,
    invalidateBorderCache, resetScenarioWaterCacheAdaptiveState, invalidateRenderPasses,
    markAllOverlaysDirty, updateZoomTranslateExtent, render,
  });

  function cancelDeferredScenarioChunkPromotionInfraRefresh() {
    cancelDeferredWork(deferredScenarioChunkPromotionInfraHandle);
    deferredScenarioChunkPromotionInfraHandle = null;
  }

  function resetDeferredScenarioChunkPromotionState() {
    cancelDeferredScenarioChunkPromotionInfraRefresh();
    scenarioChunkPromotionVersion = 0;
  }

  function scheduleDeferredScenarioChunkPromotionInfraRefresh({
    reason = "scenario-chunk-promotion",
    suppressRender = false,
    promotionVersion = scenarioChunkPromotionVersion,
    hasPoliticalGeometryChange = false,
    primaryDerivedStateReady = false,
    refreshOpeningOwnerBorders = true,
  } = {}) {
    cancelDeferredScenarioChunkPromotionInfraRefresh();
    deferredScenarioChunkPromotionInfraHandle = scheduleDeferredWork(() => {
      deferredScenarioChunkPromotionInfraHandle = null;
      void runDeferredScenarioChunkPromotionInfraRefresh({
        reason,
        suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange,
        primaryDerivedStateReady,
        refreshOpeningOwnerBorders,
      });
    }, {
      timeout: 120,
    });
  }

  async function runDeferredScenarioChunkPromotionInfraRefresh({
    reason = "scenario-chunk-promotion",
    suppressRender = false,
    promotionVersion = scenarioChunkPromotionVersion,
    hasPoliticalGeometryChange = false,
    primaryDerivedStateReady = false,
    refreshOpeningOwnerBorders = true,
  } = {}) {
    if (promotionVersion !== scenarioChunkPromotionVersion) {
      return false;
    }
    if (!isInteractionRecoverySettled({ quietMs: 600 })) {
      scheduleDeferredScenarioChunkPromotionInfraRefresh({
        reason,
        suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange,
        primaryDerivedStateReady,
        refreshOpeningOwnerBorders,
      });
      return false;
    }
    const taskKey = "scenario-chunk-promotion-infra";
    if (!beginInteractionRecoveryTask(taskKey)) {
      scheduleDeferredScenarioChunkPromotionInfraRefresh({
        reason,
        suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange,
        primaryDerivedStateReady,
        refreshOpeningOwnerBorders,
      });
      return false;
    }
    const startedAt = nowMs();
    const previousInteractionInfrastructureStage = String(runtimeState.interactionInfrastructureStage || "");
    let restoredInteractionInfrastructureState = false;
    let yieldCount = 0;
    let fullPoliticalRestoreMs = 0;
    let restoredFullPoliticalChunkData = false;
    try {
      if (!primaryDerivedStateReady) {
        buildIndex();
        await yieldToMain();
        yieldCount += 1;
        if (promotionVersion !== scenarioChunkPromotionVersion) {
          return false;
        }
        await buildSpatialIndexChunked({
          includeSecondary: false,
          keepReady: true,
        });
      }
      if (hasPoliticalGeometryChange && Array.isArray(runtimeState.scenarioPoliticalVisibleChunkData?.features)) {
        const fullRestoreStartedAt = nowMs();
        runtimeState.scenarioPoliticalVisibleChunkData = null;
        const completePoliticalFeatureCount = Array.isArray(runtimeState.scenarioPoliticalChunkData?.features)
          ? runtimeState.scenarioPoliticalChunkData.features.length
          : 0;
        const renderedLandFeatureCount = Array.isArray(runtimeState.landData?.features)
          ? runtimeState.landData.features.length
          : 0;
        const shouldRestoreFullPoliticalDerivedState = (
          !primaryDerivedStateReady
          && completePoliticalFeatureCount > 0
          && renderedLandFeatureCount < completePoliticalFeatureCount
        );
        if (shouldRestoreFullPoliticalDerivedState) {
          rebuildPoliticalLandCollections();
          rebuildRuntimeDerivedState({
            includeRuntimePoliticalMeta: true,
            scheduleUiMode: "deferred",
            buildSpatial: true,
            includeSecondarySpatial: false,
          });
          runtimeState.hitCanvasDirty = true;
          runtimeState.hitCanvasTopologyRevision = 0;
          await yieldToMain();
          yieldCount += 1;
        }
        fullPoliticalRestoreMs = nowMs() - fullRestoreStartedAt;
        restoredFullPoliticalChunkData = shouldRestoreFullPoliticalDerivedState;
        if (promotionVersion !== scenarioChunkPromotionVersion) {
          return false;
        }
      }
      setInteractionInfrastructureState(previousInteractionInfrastructureStage || "basic-ready", {
        ready: true,
        inFlight: false,
      });
      restoredInteractionInfrastructureState = true;
      if (promotionVersion !== scenarioChunkPromotionVersion) {
        return false;
      }
      scheduleSecondarySpatialIndexBuild({
        reason: `${reason}-secondary-spatial`,
      });
      if (runtimeState.hitCanvasDirty) {
        scheduleHitCanvasBuildIfNeeded({
          reason: `${reason}-hit-canvas`,
        });
      }
      if (hasPoliticalGeometryChange) {
        ensureSovereigntyState();
        if (refreshOpeningOwnerBorders !== false) {
          refreshScenarioOpeningOwnerBorders({
            renderNow: false,
            reason: `${reason}-opening`,
          });
        }
        invalidateBorderCache();
        updateDynamicBorderStatusUI();
        updateSpecialZonesPaths();
        renderSpecialZoneEditorOverlay();
      }
      if (runtimeState.runtimeChunkLoadState && typeof runtimeState.runtimeChunkLoadState === "object") {
        runtimeState.runtimeChunkLoadState.pendingInfraPromotion = null;
      }
      if (!suppressRender) {
        render();
      }
      const infraDurationMs = nowMs() - startedAt;
      recordRenderPerfMetric("scenarioChunkPromotionInfraStage", infraDurationMs, {
        activeScenarioId: String(runtimeState.activeScenarioId || ""),
        suppressRender: !!suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange: !!hasPoliticalGeometryChange,
        primaryDerivedStateReady: !!primaryDerivedStateReady,
        restoredFullPoliticalChunkData,
        fullPoliticalRestoreMs: Math.max(0, fullPoliticalRestoreMs),
      });
      recordRenderPerfMetric("chunkPromotionInfraMs", infraDurationMs, {
        activeScenarioId: String(runtimeState.activeScenarioId || ""),
        suppressRender: !!suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange: !!hasPoliticalGeometryChange,
        primaryDerivedStateReady: !!primaryDerivedStateReady,
        restoredFullPoliticalChunkData,
        fullPoliticalRestoreMs: Math.max(0, fullPoliticalRestoreMs),
      });
      recordRenderPerfMetric("chunkPromotionDeferredInfraMs", infraDurationMs, {
        activeScenarioId: String(runtimeState.activeScenarioId || ""),
        suppressRender: !!suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange: !!hasPoliticalGeometryChange,
        primaryDerivedStateReady: !!primaryDerivedStateReady,
        restoredFullPoliticalChunkData,
        fullPoliticalRestoreMs: Math.max(0, fullPoliticalRestoreMs),
      });
      recordInteractionRecoveryTaskMetric(taskKey, infraDurationMs, {
        reason: String(reason || "scenario-chunk-promotion"),
        suppressRender: !!suppressRender,
        promotionVersion,
        hasPoliticalGeometryChange: !!hasPoliticalGeometryChange,
        primaryDerivedStateReady: !!primaryDerivedStateReady,
        refreshOpeningOwnerBorders: refreshOpeningOwnerBorders !== false,
        restoredFullPoliticalChunkData,
        fullPoliticalRestoreMs: Math.max(0, fullPoliticalRestoreMs),
        yieldCount,
      });
      return true;
    } finally {
      if (!restoredInteractionInfrastructureState) {
        setInteractionInfrastructureState(previousInteractionInfrastructureStage || "basic-ready", {
          ready: true,
          inFlight: false,
        });
      }
      endInteractionRecoveryTask(taskKey);
    }
  }

  function refreshMapDataForScenarioChunkPromotion({
    suppressRender = false,
    reason = "scenario-chunk-promotion",
    changedLayerKeys = [],
    politicalFeatureIds = [],
    hasPoliticalPayloadChange = false,
    refreshPlan = null,
  } = {}) {
    const startedAt = nowMs();
    const runtimeChunkLoadState = runtimeState.runtimeChunkLoadState && typeof runtimeState.runtimeChunkLoadState === "object"
      ? runtimeState.runtimeChunkLoadState
      : null;
    const pendingVisualPromotion = runtimeChunkLoadState?.pendingVisualPromotion || null;
    const pendingPromotion = runtimeChunkLoadState?.pendingPromotion || null;
    const promotionQueuedAt = Number(pendingVisualPromotion?.queuedAt || pendingPromotion?.queuedAt || 0);
    const {
      hasPoliticalChange,
      effectiveChangedLayerKeys,
    } = resolveScenarioChunkPromotionChangeSet({
      changedLayerKeys,
      politicalFeatureIds,
      hasPoliticalPayloadChange,
    });
    if (hasPoliticalChange) {
      rebuildPrimaryPoliticalDerivedState({
        scheduleUiMode: "deferred",
        buildSpatial: true,
        includeSecondarySpatial: false,
      });
    }
    scenarioChunkPromotionVersion = Number(scenarioChunkPromotionVersion || 0) + 1;
    markRendererTopologyChanged({ hitCanvasDirty: true });
    if (runtimeState.runtimeChunkLoadState && typeof runtimeState.runtimeChunkLoadState === "object") {
      runtimeState.runtimeChunkLoadState.pendingVisualPromotion = null;
      runtimeState.runtimeChunkLoadState.pendingInfraPromotion = null;
    }
    if (hasPoliticalChange) {
      clearDeferredInternalBorderMeshCaches();
      scheduleDeferredHeavyBorderMeshes();
    }
    if ((Array.isArray(effectiveChangedLayerKeys) ? effectiveChangedLayerKeys : []).some((layerKey) => String(layerKey || "").trim().toLowerCase() === "water")) {
      resetScenarioWaterCacheAdaptiveState("scenario-water-regions-data-replaced");
    }
    const synchronizedSecondaryRegionIndexes = syncScenarioSecondaryRegionIndexes({
      changedLayerKeys: effectiveChangedLayerKeys,
      reason: `${reason}-secondary-sync`,
    });
    const shouldSkipDeferredInfraRefresh = synchronizedSecondaryRegionIndexes && !hasPoliticalChange;
    if (shouldSkipDeferredInfraRefresh && runtimeState.runtimeChunkLoadState && typeof runtimeState.runtimeChunkLoadState === "object") {
      runtimeState.runtimeChunkLoadState.pendingInfraPromotion = null;
    }
    const {
      rendererRefreshPlan,
      frameGraphInvalidation,
      hasExplicitTargetResources,
      targetPasses,
      targetResources,
      invalidationTargetPasses,
    } = resolveScenarioChunkPromotionRendererRefreshDescriptor({
      refreshPlan,
      changedLayerKeys: effectiveChangedLayerKeys,
      hasPoliticalChange,
    });
    const selectionVersion = Math.max(0, Number(runtimeState.runtimeChunkLoadState?.selectionVersion || 0));
    const promotedTotalFeatureCount = Array.isArray(runtimeState.scenarioPoliticalChunkData?.features)
      ? runtimeState.scenarioPoliticalChunkData.features.length
      : 0;
    const promotedPrimaryFeatureCount = Array.isArray(runtimeState.scenarioPoliticalVisibleChunkData?.features)
      ? runtimeState.scenarioPoliticalVisibleChunkData.features.length
      : promotedTotalFeatureCount;
    const promotedVisibleFeatureCount = readFirstNonNegativeCount(
      pendingVisualPromotion?.primaryVisibleFeatureCount,
      pendingPromotion?.primaryVisibleFeatureCount,
      pendingVisualPromotion?.selectedPoliticalVisibleFeatureCountSum,
      pendingPromotion?.selectedPoliticalVisibleFeatureCountSum,
      promotedPrimaryFeatureCount,
      pendingVisualPromotion?.selectedFeatureCountSum,
      pendingPromotion?.selectedFeatureCountSum,
      promotedTotalFeatureCount,
    );
    if (!shouldSkipDeferredInfraRefresh && runtimeState.runtimeChunkLoadState && typeof runtimeState.runtimeChunkLoadState === "object") {
      const promotionDelta = createScenarioChunkPromotionDelta({
        scenarioId: runtimeState.activeScenarioId,
        selectionVersion,
        reason,
        runId: scenarioChunkPromotionVersion,
        changedLayerKeys: effectiveChangedLayerKeys,
        targetResources,
        resourceDescriptors: frameGraphInvalidation?.resourceDescriptors,
        dataRevisionLayers: frameGraphInvalidation?.dataRevisionLayers || effectiveChangedLayerKeys,
        renderVisibleLayers: frameGraphInvalidation?.renderVisibleLayers || effectiveChangedLayerKeys,
        interactionAuthorityLayers: frameGraphInvalidation?.interactionAuthorityLayers || effectiveChangedLayerKeys,
        politicalPayloadRef: {
          kind: "political",
          id: "scenarioPoliticalChunkData",
          featureCount: promotedTotalFeatureCount,
        },
        primaryPoliticalPayloadRef: {
          kind: "primaryPolitical",
          id: "scenarioPoliticalVisibleChunkData",
          featureCount: promotedPrimaryFeatureCount,
        },
        infraTasks: ["scenario-chunk-promotion-infra"],
        visualTasks: suppressRender ? ["invalidate-render-passes"] : ["invalidate-render-passes", "render"],
        metrics: {
          changedLayerCount: Array.isArray(effectiveChangedLayerKeys) ? effectiveChangedLayerKeys.length : 0,
          targetResourceCount: targetResources.length,
          targetPassCount: targetPasses.length,
          promotionVersion: scenarioChunkPromotionVersion,
          hasPoliticalGeometryChange: hasPoliticalChange,
        },
      });
      runtimeState.runtimeChunkLoadState.pendingInfraPromotion = {
        reason: String(reason || "scenario-chunk-promotion"),
        selectionVersion,
        promotionVersion: scenarioChunkPromotionVersion,
        hasPoliticalGeometryChange: hasPoliticalChange,
        primaryDerivedStateReady: hasPoliticalChange,
        promotionDelta,
      };
    }
    scenarioVisualInvalidationExecutor.executeScenarioVisualInvalidation({
      reason,
      suppressRender,
      frameGraphInvalidation,
      executionPlan: { targetResources, targetPasses, invalidationTargetPasses, hasExplicitTargetResources },
    });
    const shouldRefreshOpeningOwnerBordersInVisual =
      hasPoliticalChange
      && rendererRefreshPlan.refreshOpeningOwnerBorders !== false
      && isUsableMesh(runtimeState.activeScenarioMeshPack?.meshes?.opening_owner_borders);
    if (shouldSkipDeferredInfraRefresh) {
      if (runtimeState.hitCanvasDirty) {
        scheduleHitCanvasBuildIfNeeded({
          reason: `${reason}-secondary-hit-canvas`,
        });
      }
    } else {
      scheduleDeferredScenarioChunkPromotionInfraRefresh({
        reason,
        suppressRender,
        promotionVersion: scenarioChunkPromotionVersion,
        hasPoliticalGeometryChange: hasPoliticalChange,
        primaryDerivedStateReady: hasPoliticalChange,
        refreshOpeningOwnerBorders: !shouldRefreshOpeningOwnerBordersInVisual,
      });
    }
    const visualDurationMs = nowMs() - startedAt;
    const promotionMetricDetails = buildScenarioChunkPromotionVisualMetricDetails({
      activeScenarioId: runtimeState.activeScenarioId,
      reason,
      runtimeChunkLoadState,
      pendingVisualPromotion,
      pendingPromotion,
      promotionQueuedAt,
      startedAt,
      suppressRender,
      hasPoliticalChange,
      promotedTotalFeatureCount,
      promotedPrimaryFeatureCount,
      promotedVisibleFeatureCount,
      effectiveChangedLayerKeys,
      promotionVersion: scenarioChunkPromotionVersion,
      synchronizedSecondaryRegionIndexes,
    });
    recordRenderPerfMetric("scenarioChunkPromotionVisualStage", visualDurationMs, {
      ...promotionMetricDetails,
    });
    recordRenderPerfMetric("chunkPromotionPrimaryRefreshMs", visualDurationMs, {
      ...promotionMetricDetails,
    });
    recordRenderPerfMetric("chunkPromotionVisualMs", visualDurationMs, {
      activeScenarioId: String(runtimeState.activeScenarioId || ""),
      suppressRender: !!suppressRender,
      promotedFeatureCount: promotedTotalFeatureCount,
      promotedPrimaryFeatureCount,
      promotedVisibleFeatureCount,
      promotedTotalFeatureCount,
      changedLayerCount: Array.isArray(effectiveChangedLayerKeys) ? effectiveChangedLayerKeys.length : 0,
      promotionVersion: scenarioChunkPromotionVersion,
      hasPoliticalGeometryChange: hasPoliticalChange,
      synchronizedSecondaryRegionIndexes,
    });
    recordRenderPerfMetric("scenarioChunkPoliticalPromotion", visualDurationMs, {
      activeScenarioId: String(runtimeState.activeScenarioId || ""),
      suppressRender: !!suppressRender,
      promotedFeatureCount: promotedTotalFeatureCount,
      promotedPrimaryFeatureCount,
      promotedVisibleFeatureCount,
      promotedTotalFeatureCount,
      changedLayerCount: Array.isArray(effectiveChangedLayerKeys) ? effectiveChangedLayerKeys.length : 0,
      promotionVersion: scenarioChunkPromotionVersion,
      synchronizedSecondaryRegionIndexes,
      stage: "visual",
    });
    if (shouldRefreshOpeningOwnerBordersInVisual) {
      refreshScenarioOpeningOwnerBorders({
        renderNow: false,
        reason: `${reason}-opening-sync`,
      });
    }
  }

  function refreshMapDataForScenarioApply({
    suppressRender = false,
    refreshPlan = null,
  } = {}) {
    const startedAt = nowMs();
    const rendererRefreshPlan = normalizeRendererRefreshPlan(refreshPlan, {
      source: "scenario-apply",
      targetPasses: ["background", "physicalBase", "political", "contextBase", "contextScenario", "dayNight", "borders", "labels"],
      refreshOpeningOwnerBorders: true,
      resetWaterCacheReason: "scenario-switch-complete",
    });
    resetRendererTransactionState({ hitCanvasDirty: true });
    rebuildPrimaryPoliticalDerivedState({
      scheduleUiMode: "deferred",
      buildSpatial: true,
      includeSecondarySpatial: false,
    });
    clearLastGoodFrame("scenario-apply-refresh");
    invalidateInteractionComposite("scenario-apply-refresh");
    resetFirstVisibleFramePainted("scenario-apply-refresh");
    const targetPasses = rendererRefreshPlan.targetPasses;
    invalidateRenderPasses(targetPasses, "scenario-apply-refresh");
    clearRenderPassReferenceTransforms(targetPasses);
    markAllOverlaysDirty();
    rebuildStaticMeshes({
      refreshOpeningOwnerBorders: rendererRefreshPlan.refreshOpeningOwnerBorders,
    });
    invalidateBorderCache();
    updateDynamicBorderStatusUI();
    updateSpecialZonesPaths();
    renderSpecialZoneEditorOverlay();
    updateZoomTranslateExtent();
    const atlantropaWaterFeatureCount = getEffectiveAtlantropaFeatures().water.length;
    resetScenarioWaterCacheAdaptiveState(rendererRefreshPlan.resetWaterCacheReason || "scenario-switch-complete");
    let atlantropaWaterIndexCount = 0;
    let atlantropaWaterSpatialCount = 0;
    if (atlantropaWaterFeatureCount > 0) {
      rebuildAuxiliaryRegionIndexes();
      atlantropaWaterIndexCount = Array.from(runtimeState.waterRegionsById?.keys?.() || [])
        .filter((featureId) => String(featureId || "").startsWith("ATLSEA_")).length;
      getSpatialIndexRuntimeOwner().resetSecondarySpatialIndexState({
        preserveCurrent: true,
        reason: "scenario-apply-atlantropa-water",
      });
      getSpatialIndexRuntimeOwner().buildSecondarySpatialIndexes({
        allowComputeMissingBounds: true,
      });
      atlantropaWaterSpatialCount = (Array.isArray(runtimeState.waterSpatialItems) ? runtimeState.waterSpatialItems : [])
        .filter((item) => String(item?.featureId || item?.id || "").startsWith("ATLSEA_")).length;
      queueIndexUiRefresh({
        renderWaterRegionList: true,
        renderSpecialRegionList: true,
      });
    } else {
      scheduleSecondarySpatialIndexBuild({
        reason: "scenario-apply-secondary-spatial",
      });
    }
    if (!suppressRender) {
      render();
    }
    recordRenderPerfMetric("scenarioApplyMapRefresh", nowMs() - startedAt, {
      activeScenarioId: String(runtimeState.activeScenarioId || ""),
      suppressRender: !!suppressRender,
      landCount: Array.isArray(runtimeState.landData?.features) ? runtimeState.landData.features.length : 0,
      atlantropaWaterFeatureCount,
      atlantropaWaterIndexCount,
      atlantropaWaterSpatialCount,
    });
  }

  return {
    cancelDeferredScenarioChunkPromotionInfraRefresh,
    resetDeferredScenarioChunkPromotionState,
    runDeferredScenarioChunkPromotionInfraRefresh,
    scheduleDeferredScenarioChunkPromotionInfraRefresh,
    refreshMapDataForScenarioApply,
    refreshMapDataForScenarioChunkPromotion,
  };
}

export {
  createScenarioRefreshRuntime,
};
