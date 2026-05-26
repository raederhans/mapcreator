import { countryNames, createDefaultScenarioReleasableIndex, defaultCountryPalette, normalizeMapSemanticMode, state as runtimeState } from "./state.js";
import { ensureSovereigntyState, markLegacyColorStateDirty } from "./sovereignty_manager.js";
import {
  invalidateOceanBackgroundVisualState,
  recomputeDynamicBordersNow,
  refreshColorState,
  refreshMapDataForScenarioChunkPromotion,
  refreshResolvedColorsForFeatures,
  setMapData,
} from "./scenario/scenario_renderer_bridge.js";
import {
  loadDeferredDetailBundle,
  normalizeCityText,
} from "./data_loader.js";
import {
  getVisibleScenarioChunkLayers,
  mergeScenarioChunkPayloads,
  selectScenarioChunks,
} from "./scenario_chunk_manager.js";
import {
  buildScenarioDistrictGroupByFeatureId,
  normalizeScenarioDistrictGroupsPayload,
} from "./scenario_districts.js";
import { ensureDetailTopologyBoundary } from "./render_boundary.js";
import { applyActivePaletteState, setActivePaletteSource, syncResolvedDefaultCountryPalette } from "./palette_manager.js";
import { markDirty } from "./dirty_state.js";
import {
  buildScenarioReleasableIndex,
  getScenarioReleasableCountries,
} from "./releasable_manager.js";
import {
  DETAIL_POLITICAL_MIN_FEATURES,
  SCENARIO_DETAIL_MIN_RATIO_STRICT,
  evaluateScenarioDataHealth,
  hasUsablePoliticalTopology,
  refreshScenarioDataHealth,
  scenarioNeedsDetailTopology,
} from "./scenario_data_health.js";
import {
  runPostRollbackRestoreEffects,
  runPostScenarioApplyEffects,
  runPostScenarioClearEffects,
  runPostScenarioResetEffects,
} from "./scenario_post_apply_effects.js";
import {
  setScenarioAuditUiState,
  syncCountryUi,
  syncScenarioUi,
} from "./scenario_ui_sync.js";
import { syncScenarioLocalizationState } from "./scenario_localization_state.js";
import {
  applyBlankScenarioPresentationDefaults,
  ensureRuntimeChunkLoadState,
  ensureActiveScenarioOptionalLayerLoaded,
  ensureScenarioGeoLocalePatchForLanguage,
  evaluateScenarioHydrationHealthGateState,
  buildScenarioRuntimeVersionTag,
  hasRenderableScenarioPoliticalTopology,
  getScenarioDecodedCollection,
  getScenarioTopologyFeatureCollection,
  hydrateActiveScenarioBundle,
  loadScenarioAuditPayload,
  loadScenarioBundle,
  loadScenarioRegistry,
  resetScenarioChunkRuntimeState,
  releaseScenarioAuditPayload,
  scheduleScenarioChunkRefresh,
  scenarioBundleHasChunkedData,
  scenarioSupportsChunkedRuntime,
  scenarioBundleUsesChunkedLayer,
  validateImportedScenarioBaseline,
} from "./scenario_resources.js";
import { assertScenarioInteractionsAllowed, buildScenarioFatalRecoveryError, clearScenarioFatalRecoveryState, consumeScenarioTestHook, enterScenarioFatalRecovery, formatScenarioFatalRecoveryMessage, getScenarioFatalRecoveryState, validateScenarioRuntimeConsistency } from "./scenario_recovery.js";
import { captureScenarioApplyRollbackSnapshot, restoreScenarioApplyRollbackSnapshot } from "./scenario_rollback.js";
import {
  buildHoi4FarEastSovietOwnerBackfill,
  recordScenarioPerfMetric as sharedRecordScenarioPerfMetric,
} from "./scenario/pure_helpers.js";
import {
  createScenarioPresentationRuntime,
} from "./scenario/presentation_runtime.js";
import {
  createScenarioLifecycleRuntime,
} from "./scenario/lifecycle_runtime.js";
import {
  createScenarioApplyPipeline,
} from "./scenario_apply_pipeline.js";
import {
  getSearchParams,
  shouldBypassScenarioCache,
  scenarioBundleSatisfiesLevel,
  normalizeScenarioCoreTag,
  normalizeScenarioCoreValue,
  normalizeScenarioCoreMap as sharedNormalizeScenarioCoreMap,
  normalizeScenarioId,
  cloneScenarioStateValue,
} from "./scenario/shared.js";
import {
  getScenarioRegistryEntries as getBundleLoaderScenarioRegistryEntries,
  getScenarioDisplayName as getBundleLoaderScenarioDisplayName,
  getScenarioNameMap as getBundleLoaderScenarioNameMap,
  getScenarioFixedOwnerColors as getBundleLoaderScenarioFixedOwnerColors,
  mergeReleasableCatalogs,
  getScenarioMetaById as getBundleLoaderScenarioMetaById,
  getDefaultScenarioId as getBundleLoaderDefaultScenarioId,
  getScenarioManifestVersion,
  getScenarioManifestSummary as getBundleLoaderScenarioManifestSummary,
  getScenarioBaselineHashFromBundle,
  getScenarioBlockerCount,
  getScenarioDefaultCountryCode as getBundleLoaderDefaultCountryCode,
} from "./scenario/bundle_loader.js";
import { t } from "../ui/i18n.js";
import { showToast } from "../ui/toast.js";
const state = runtimeState;

const SCENARIO_DETAIL_SOURCE_FALLBACK_ORDER = ["na_v2", "na_v1", "legacy_bak", "highres"];
const SCENARIO_CHUNK_REFRESH_DELAY_MS_INTERACTING = 180;
const SCENARIO_CHUNK_REFRESH_DELAY_MS_IDLE = 60;
let activeScenarioApplyPromise = null;

/**
 * Cross-module shared high-frequency state fields.
 * - activeScenarioId: active scenario selector used by UI sync, resources, and apply pipeline.
 * - scenarioBundleCacheById: bundle cache keyed by normalized scenario id for startup/full reuse.
 * - scenarioShellOverlayRevision: revision counter for owner shell overlay refresh and dependent UI.
 */

function normalizeScenarioCoreMap(rawMap) {
  return sharedNormalizeScenarioCoreMap(rawMap, { normalizeFeatureText: normalizeCityText });
}

function getScenarioTargetPaletteId(manifest) {
  return normalizeScenarioId(manifest?.palette_id) || "hoi4_vanilla";
}

function hasActiveScenarioPaletteLoaded(paletteId) {
  const targetPaletteId = normalizeScenarioId(paletteId);
  if (!targetPaletteId) {
    return false;
  }
  return normalizeScenarioId(runtimeState.activePaletteId) === targetPaletteId
    && !!runtimeState.activePalettePack
    && !!runtimeState.activePaletteMap;
}

function normalizeScenarioViewMode(value) {
  void value;
  return "ownership";
}

function canReuseActiveScenarioBundle(cachedScenarioBundle, normalizedScenarioId) {
  // 复用只接受“同一场景、完整 bundle、当前 runtime 已完整激活”的情况；startup readonly 和半水合状态继续走正常 apply 链路。
  if (!normalizedScenarioId || normalizeScenarioId(runtimeState.activeScenarioId) !== normalizedScenarioId) {
    return false;
  }
  if (runtimeState.startupReadonly || runtimeState.startupReadonlyUnlockInFlight) {
    return false;
  }
  if (String(runtimeState.topologyBundleMode || "") !== "composite") {
    return false;
  }
  if (!cachedScenarioBundle || !scenarioBundleSatisfiesLevel(cachedScenarioBundle, "full")) {
    return false;
  }

  const cachedManifest = cachedScenarioBundle.manifest || null;
  const cachedManifestId = normalizeScenarioId(cachedManifest?.scenario_id || cachedScenarioBundle?.meta?.scenario_id);
  if (!cachedManifestId || cachedManifestId !== normalizedScenarioId) {
    return false;
  }

  const activeManifestId = normalizeScenarioId(runtimeState.activeScenarioManifest?.scenario_id);
  if (!activeManifestId || activeManifestId !== normalizedScenarioId) {
    return false;
  }

  const activeBaselineHash = String(runtimeState.scenarioBaselineHash || "").trim();
  const cachedBaselineHash = String(getScenarioBaselineHashFromBundle(cachedScenarioBundle) || "").trim();
  if (activeBaselineHash !== cachedBaselineHash) {
    return false;
  }

  const hasShellOwnerMap = Object.keys(runtimeState.scenarioAutoShellOwnerByFeatureId || {}).length > 0;
  const hasBaselineOwnerMap = Object.keys(runtimeState.scenarioBaselineOwnersByFeatureId || {}).length > 0;
  const requiresMeshPack = !!String(cachedManifest?.mesh_pack_url || "").trim();
  const hasMeshPack = !requiresMeshPack || !!runtimeState.activeScenarioMeshPack;
  return (
    hasShellOwnerMap
    && hasBaselineOwnerMap
    && hasMeshPack
  );
}

function recordScenarioPerfMetric(name, durationMs, details = {}) {
  return sharedRecordScenarioPerfMetric(state, name, durationMs, details);
}
const {
  applyScenarioPerformanceHints,
  restoreScenarioDisplaySettingsAfterExit,
  restoreScenarioOceanFillAfterExit,
  syncScenarioOceanFillForActivation,
} = createScenarioPresentationRuntime({
  state,
  invalidateOceanBackgroundVisualState,
});

const {
  applyScenarioPaintMode,
  clearActiveScenario: clearActiveScenarioRuntime,
  disableScenarioParentBorders,
  resetToScenarioBaseline: resetToScenarioBaselineRuntime,
  syncScenarioInspectorSelection,
} = createScenarioLifecycleRuntime({
  state,
  countryNames,
  defaultCountryPalette,
  createDefaultScenarioReleasableIndex,
  ensureSovereigntyState,
  getScenarioDefaultCountryCode,
  getScenarioMapSemanticMode,
  markDirty,
  markLegacyColorStateDirty,
  normalizeScenarioId,
  releaseScenarioAuditPayload,
  resetScenarioChunkRuntimeState,
  restoreScenarioDisplaySettingsAfterExit,
  restoreScenarioOceanFillAfterExit,
  runPostScenarioClearEffects,
  runPostScenarioResetEffects,
  scenarioDetailMinRatioStrict: SCENARIO_DETAIL_MIN_RATIO_STRICT,
  setScenarioAuditUiState,
  syncResolvedDefaultCountryPalette,
  applyBlankScenarioPresentationDefaults,
});

function getScenarioDisplayOwnerByFeatureId(featureId, { fallbackOwner = "" } = {}) {
  const normalizedId = String(featureId || "").trim();
  if (!normalizedId) return String(fallbackOwner || "").trim().toUpperCase();
  const fallback = String(fallbackOwner || "").trim().toUpperCase();
  const directOwner = String(runtimeState.sovereigntyByFeatureId?.[normalizedId] || "").trim().toUpperCase();
  return directOwner || fallback;
}

function getScenarioRegistryEntries() {
  return getBundleLoaderScenarioRegistryEntries(state);
}

function getScenarioDisplayName(source, fallbackId = "") {
  return getBundleLoaderScenarioDisplayName(source, fallbackId, t);
}

function getScenarioNameMap(countryMap = {}) {
  return getBundleLoaderScenarioNameMap(countryMap);
}

function getMissingScenarioNameTags(countryMap = {}, scenarioNameMap = {}) {
  const missing = [];
  Object.keys(countryMap || {}).forEach((rawTag) => {
    const normalizedTag = String(rawTag || "").trim().toUpperCase();
    if (!normalizedTag) {
      return;
    }
    const displayName = String(scenarioNameMap?.[normalizedTag] || "").trim();
    if (!displayName) {
      missing.push(normalizedTag);
    }
  });
  return missing;
}

function getScenarioFixedOwnerColors(
  countryMap = {}
) {
  return getBundleLoaderScenarioFixedOwnerColors(countryMap);
}


function getScenarioMetaById(scenarioId) {
  return getBundleLoaderScenarioMetaById(state, normalizeScenarioId, scenarioId);
}

function getDefaultScenarioId() {
  return getBundleLoaderDefaultScenarioId(state, normalizeScenarioId);
}

function getScenarioManifestSummary(manifest = runtimeState.activeScenarioManifest) {
  return getBundleLoaderScenarioManifestSummary(manifest);
}

function getActiveScenarioMergedChunkLayerPayload(layerKey, scenarioId = runtimeState.activeScenarioId) {
  const mergedLayerPayloads = runtimeState.activeScenarioChunks?.mergedLayerPayloads;
  const normalizedScenarioId = normalizeScenarioId(scenarioId);
  const normalizedChunkScenarioId = normalizeScenarioId(runtimeState.activeScenarioChunks?.scenarioId);
  // 这里故意保留三态：
  // undefined = chunk runtime 还没有接管这个 layer；
  // null = chunk 明确声明该 layer 当前为空；
  // object = 已有合并后的 layer payload。
  if (
    !normalizedScenarioId
    || normalizedChunkScenarioId !== normalizedScenarioId
    || !mergedLayerPayloads
    || typeof mergedLayerPayloads !== "object"
    || !Object.prototype.hasOwnProperty.call(mergedLayerPayloads, layerKey)
  ) {
    return undefined;
  }
  return mergedLayerPayloads[layerKey] || null;
}


function getScenarioDefaultCountryCode(manifest, countryMap = {}) {
  return getBundleLoaderDefaultCountryCode(manifest, countryMap);
}

function getScenarioMapSemanticMode(manifest, fallback = "political") {
  return normalizeMapSemanticMode(manifest?.map_mode, fallback);
}

function normalizeScenarioFeatureCollection(payload) {
  if (!Array.isArray(payload?.features)) {
    return null;
  }
  return {
    type: "FeatureCollection",
    features: payload.features,
  };
}

function getCachedScenarioBundle(scenarioId = runtimeState.activeScenarioId) {
  const normalizedScenarioId = normalizeScenarioId(scenarioId);
  if (!normalizedScenarioId) return null;
  return runtimeState.scenarioBundleCacheById?.[normalizedScenarioId] || null;
}

function setScenarioViewMode(
  viewMode,
  {
    renderNow = true,
    markDirtyReason = "",
  } = {}
) {
  void viewMode;
  void renderNow;
  void markDirtyReason;
  return false;
}

async function ensureScenarioDetailTopologyLoaded({ applyMapData = true } = {}) {
  // detail promotion 是 scenario apply 前后的共享边界：优先交给 render_boundary，只有它无法处理时才在这里补载 detail bundle。
  const syncScenarioReadyUiAfterPromotion = () => {
    refreshScenarioDataHealth({
      showWarningToast: false,
      showErrorToast: false,
    });
    syncScenarioUi();
    syncCountryUi({ renderNow: false });
  };
  {
    const promoted = await ensureDetailTopologyBoundary({ applyMapData });
    if (promoted) return true;
  }
  const hasDetailNow = hasUsablePoliticalTopology(runtimeState.topologyDetail);
  if (hasDetailNow && runtimeState.topologyBundleMode !== "composite") {
    runtimeState.topologyBundleMode = "composite";
    if (applyMapData) {
      setMapData({ refitProjection: false, resetZoom: false });
    }
    runtimeState.detailDeferred = false;
    runtimeState.detailPromotionCompleted = true;
    syncScenarioReadyUiAfterPromotion();
    return true;
  }
  if (hasDetailNow && runtimeState.topologyBundleMode === "composite") {
    return false;
  }
  if (runtimeState.detailPromotionInFlight) {
    return false;
  }
  runtimeState.detailPromotionInFlight = true;
  try {
    const detailSourceKeys = Array.from(new Set([
      String(runtimeState.detailSourceRequested || "").trim(),
      String(runtimeState.activeScenarioManifest?.detail_source || "").trim(),
      ...SCENARIO_DETAIL_SOURCE_FALLBACK_ORDER,
    ].filter(Boolean)));
    try {
      const {
        topologyDetail,
        runtimePoliticalTopology,
        detailSourceUsed,
      } = await loadDeferredDetailBundle({
        detailSourceKey: detailSourceKeys[0] || runtimeState.detailSourceRequested,
        detailSourceKeys,
      });

      const runtimeFallback = runtimePoliticalTopology || runtimeState.runtimePoliticalTopology || null;
      const resolvedDetail = hasUsablePoliticalTopology(topologyDetail)
        ? topologyDetail
        : (hasUsablePoliticalTopology(runtimeFallback) ? runtimeFallback : null);
      if (!resolvedDetail) {
        console.warn(
          `[scenario] Detail promotion resolved no usable topology. Tried sources: ${detailSourceKeys.join(", ") || "(default)"}.`
        );
        runtimeState.detailDeferred = false;
        return false;
      }

      if (!hasUsablePoliticalTopology(topologyDetail) && hasUsablePoliticalTopology(runtimeFallback)) {
        console.warn("[scenario] Detail promotion using runtime political fallback.");
      }
      runtimeState.topologyDetail = resolvedDetail;
      runtimeState.runtimePoliticalTopology = runtimeFallback;
      runtimeState.topologyBundleMode = "composite";
      runtimeState.detailDeferred = false;
      runtimeState.detailPromotionCompleted = true;
      runtimeState.detailSourceRequested = detailSourceUsed || detailSourceKeys[0] || runtimeState.detailSourceRequested;
      if (applyMapData) {
        setMapData({ refitProjection: false, resetZoom: false });
      }
      syncScenarioReadyUiAfterPromotion();
      return true;
    } catch (error) {
      runtimeState.detailDeferred = false;
      console.warn(
        `[scenario] Detail topology could not be promoted. Tried sources: ${detailSourceKeys.join(", ") || "(default)"}. Staying on coarse map.`,
        error
      );
      return false;
    }
  } catch (error) {
    console.warn("Unable to force-load detail topology before scenario apply:", error);
    return false;
  } finally {
    runtimeState.detailPromotionInFlight = false;
  }
}

const {
  prepareScenarioApplyState,
  applyPreparedScenarioState,
} = createScenarioApplyPipeline({
  // prepare 负责解码并构造 staged state，apply 负责集中提交 runtimeState；这个分界把主要运行时写入推迟到 apply，便于 apply 失败后按 rollback 恢复旧场景。
  runtimeState: state,
  countryNames,
  normalizeScenarioId,
  scenarioSupportsChunkedRuntime,
  scenarioBundleUsesChunkedLayer,
  scenarioBundleHasChunkedData,
  ensureScenarioDetailTopologyLoaded,
  hasUsablePoliticalTopology,
  scenarioNeedsDetailTopology,
  getScenarioDisplayName,
  getScenarioTargetPaletteId,
  hasActiveScenarioPaletteLoaded,
  applyActivePaletteState,
  setActivePaletteSource,
  getScenarioDefaultCountryCode,
  getScenarioMapSemanticMode,
  buildScenarioReleasableIndex,
  getScenarioReleasableCountries,
  normalizeScenarioCoreMap,
  normalizeScenarioDistrictGroupsPayload,
  getActiveScenarioMergedChunkLayerPayload,
  getScenarioDecodedCollection,
  getScenarioTopologyFeatureCollection,
  getScenarioNameMap,
  getMissingScenarioNameTags,
  getScenarioFixedOwnerColors,
  buildHoi4FarEastSovietOwnerBackfill,
  buildScenarioRuntimeVersionTag,
  mergeReleasableCatalogs,
  buildScenarioDistrictGroupByFeatureId,
  syncScenarioLocalizationState,
  applyBlankScenarioPresentationDefaults,
  setScenarioAuditUiState,
  getScenarioBaselineHashFromBundle,
  markLegacyColorStateDirty,
  syncScenarioInspectorSelection,
  disableScenarioParentBorders,
  applyScenarioPaintMode,
  syncScenarioOceanFillForActivation,
  applyScenarioPerformanceHints,
  scheduleScenarioChunkRefresh,
  resetScenarioChunkRuntimeState,
  ensureRuntimeChunkLoadState,
  hasRenderableScenarioPoliticalTopology,
  normalizeScenarioFeatureCollection,
  cloneScenarioStateValue,
});

async function applyScenarioBundle(
  bundle,
  {
    renderNow = true,
    suppressRender = false,
    markDirtyReason = "scenario-apply",
    syncPalette = true,
    showToastOnComplete = false,
    interactionLevel = "full",
  } = {}
) {
  const applyStartedAt = globalThis.performance?.now ? globalThis.performance.now() : Date.now();
  if (!bundle?.manifest) {
    throw new Error("Scenario bundle is missing a manifest.");
  }
  const rollbackSnapshot = captureScenarioApplyRollbackSnapshot();
  let staged = null;
  let topologyDecodeMs = 0;
  try {
    // apply 主链顺序固定：先 stage、再一次性提交 runtimeState、再跑 post-apply 副作用和一致性检查。
    const topologyDecodeStartedAt = globalThis.performance?.now ? globalThis.performance.now() : Date.now();
    staged = await prepareScenarioApplyState(bundle, { syncPalette, interactionLevel });
    topologyDecodeMs = (globalThis.performance?.now ? globalThis.performance.now() : Date.now()) - topologyDecodeStartedAt;

    applyPreparedScenarioState(bundle, staged);
    if (Object.keys(staged.scenarioOwnerBackfill).length) {
      console.info(
        `[scenario] Applied HOI4 Far East owner backfill for "${staged.scenarioId}": ${Object.keys(staged.scenarioOwnerBackfill).length} missing RU runtime features -> SOV.`
      );
    }
    bundle.chunkLifecycle = {
      applyStartedAt,
      politicalCoreReadyRecorded: false,
    };
    const { dataHealth, scenarioMapRefreshMode, hasChunkedRuntime } = await runPostScenarioApplyEffects({
      bundle,
      scenarioId: staged.scenarioId,
      renderNow,
      suppressRender,
    });
    if (bundle.loadDiagnostics?.startupBundle) {
      const startupHydrationHealth = evaluateScenarioHydrationHealthGateState({
        phase: "startup",
      });
      if (!startupHydrationHealth.ok) {
        throw new Error(
          `[scenario] Startup hydration health gate failed for "${staged.scenarioId}". reason=${
            !startupHydrationHealth.report.healthy
              ? startupHydrationHealth.report.reason
              : startupHydrationHealth.overlayConsistency.reason
          }, overlap=${startupHydrationHealth.report.overlapCount}/${startupHydrationHealth.report.renderedFeatureCount}, ratio=${startupHydrationHealth.report.overlapRatio.toFixed(3)}`
        );
      }
    }
    const currentPoliticalCoreReadyMetric = runtimeState.scenarioPerfMetrics?.timeToPoliticalCoreReady;
    const hasCurrentPoliticalCoreReadyMetric =
      currentPoliticalCoreReadyMetric
      && String(currentPoliticalCoreReadyMetric.scenarioId || "") === staged.scenarioId;
    if (
      !hasCurrentPoliticalCoreReadyMetric
      && (
        hasChunkedRuntime
        || !!runtimeState.scenarioPoliticalChunkData
        || hasRenderableScenarioPoliticalTopology(runtimeState.runtimePoliticalTopology)
      )
    ) {
      recordScenarioPerfMetric(
        "timeToPoliticalCoreReady",
        (globalThis.performance?.now ? globalThis.performance.now() : Date.now()) - applyStartedAt,
        {
          scenarioId: staged.scenarioId,
          source: "post-apply-coarse-ready",
          hasChunkedRuntime,
          mapRefreshMode: scenarioMapRefreshMode,
        }
      );
      if (bundle?.chunkLifecycle) {
        bundle.chunkLifecycle.politicalCoreReadyRecorded = true;
      }
    }
    recordScenarioPerfMetric(
      "timeToInteractiveCoarseFrame",
      (globalThis.performance?.now ? globalThis.performance.now() : Date.now()) - applyStartedAt,
      {
        scenarioId: staged.scenarioId,
        hasChunkedRuntime,
        mapRefreshMode: scenarioMapRefreshMode,
      }
    );
    if (typeof document !== "undefined") {
      const presetSection = document.getElementById("selectedCountryActionsSection");
      if (presetSection && "open" in presetSection) {
        presetSection.open = true;
      }
    }

    // Diagnostic: verify key ownership assignments took effect.
    const spotChecks = [
      "SYR-134",
      "LBN-3022",
      "BY_HIST_POL_VITEBSK_WEST",
      "CN_CITY_17275852B74586174185496",
      "CN_CITY_17275852B2295538790743",
    ];
    if (String(runtimeState.debugMode || "PROD") !== "PROD") {
      spotChecks.forEach((fid) => {
        const owner = runtimeState.sovereigntyByFeatureId[fid];
        if (owner) {
          const color = staged.scenarioColorMap[owner] || "(no color)";
          console.log(`[scenario] Spot-check: ${fid} -> owner=${owner}, color=${color}`);
        }
      });
    }
    const shouldExposeDetailVisibilityWarning =
      !!dataHealth.warning
      && !bundle?.loadDiagnostics?.startupBundle
      && !runtimeState.startupReadonly
      && !runtimeState.startupReadonlyUnlockInFlight
      && !runtimeState.detailPromotionInFlight;
    if (shouldExposeDetailVisibilityWarning) {
      console.warn(
        `[scenario] Detail visibility gate triggered for ${staged.scenarioId}: runtime=${dataHealth.runtimeFeatureCount}, expected=${dataHealth.expectedFeatureCount}, ratio=${dataHealth.ratio.toFixed(3)} (min=${dataHealth.minRatio}).`
      );
    }
    const applyConsistency = validateScenarioRuntimeConsistency({
      expectedScenarioId: staged.scenarioId,
      phase: "apply",
    });
    if (!applyConsistency.ok) {
      throw new Error(
        `[scenario] Scenario state consistency check failed after apply: ${applyConsistency.problems.join(" ")}`
      );
    }
    clearScenarioFatalRecoveryState();
    if (markDirtyReason) {
      markDirty(markDirtyReason);
    }
    if (typeof runtimeState.triggerScenarioGuideFn === "function") {
      runtimeState.triggerScenarioGuideFn();
    }

    if (showToastOnComplete) {
      showToast(
        t("Scenario loaded. Expand the parent country and use Activate to apply releasable territory.", "ui"),
        {
          title: t("Scenario loaded", "ui"),
          tone: "success",
          duration: 4200,
        }
      );
    }
    recordScenarioPerfMetric("applyScenarioBundle", (globalThis.performance?.now ? globalThis.performance.now() : Date.now()) - applyStartedAt, {
      scenarioId: staged.scenarioId,
      expectedFeatureCount: Number(bundle.manifest?.summary?.feature_count || 0),
      runtimeFeatureCount: Array.isArray(runtimeState.landData?.features) ? runtimeState.landData.features.length : 0,
      topologyDecodeMs,
      mapRefreshMode: scenarioMapRefreshMode,
      applyMs: (globalThis.performance?.now ? globalThis.performance.now() : Date.now()) - applyStartedAt,
    });
  } catch (error) {
    // rollback 只恢复 apply 前快照；若快照恢复或恢复后一致性检查失败，进入 fatal recovery，阻止 UI 继续操作半提交状态。
    let rollbackRestoreError = null;
    try {
      restoreScenarioApplyRollbackSnapshot(rollbackSnapshot, {
        shouldFailRestore: consumeScenarioTestHook("failRollbackRestoreOnce"),
      });
      runPostRollbackRestoreEffects({ renderNow });
    } catch (rollbackError) {
      rollbackRestoreError = rollbackError;
      console.error("[scenario] Failed to restore scenario apply rollback snapshot.", rollbackError);
    }
    if (rollbackRestoreError) {
      enterScenarioFatalRecovery({
        phase: "rollback",
        rootError: error,
        rollbackError: rollbackRestoreError,
      });
      const fatalError = buildScenarioFatalRecoveryError("recover the previous scenario state");
      fatalError.cause = error;
      throw fatalError;
    }
    const rollbackConsistency = validateScenarioRuntimeConsistency({
      expectedScenarioId: rollbackSnapshot?.activeScenarioId,
      phase: "rollback",
    });
    if (!rollbackConsistency.ok) {
      enterScenarioFatalRecovery({
        phase: "rollback",
        rootError: error,
        consistencyReport: rollbackConsistency,
      });
      const fatalError = buildScenarioFatalRecoveryError("recover the previous scenario state");
      fatalError.cause = error;
      throw fatalError;
    }
    throw error;
  }
}

/**
 * Scenario switch entrypoint for selecting and applying one scenario id.
 * Major state write surface:
 * - runtimeState.scenarioApplyInFlight / activeScenarioApplyPromise lifecycle.
 * - runtimeState.scenarioBundleCacheById reuse via full bundle loading.
 * - active scenario state fields written by applyScenarioBundle pipeline.
 */
async function applyScenarioById(
  scenarioId,
  {
    renderNow = true,
    markDirtyReason = "scenario-apply",
    showToastOnComplete = false,
  } = {}
) {
  assertScenarioInteractionsAllowed("apply a scenario");
  const normalizedScenarioId = normalizeScenarioId(scenarioId);
  if (!normalizedScenarioId) {
    throw new Error("[scenario] Scenario id is required.");
  }
  const cachedScenarioBundle = runtimeState.scenarioBundleCacheById?.[normalizedScenarioId] || null;
  if (canReuseActiveScenarioBundle(cachedScenarioBundle, normalizedScenarioId)) {
    return cachedScenarioBundle;
  }
  if (runtimeState.scenarioApplyInFlight && activeScenarioApplyPromise) {
    return activeScenarioApplyPromise;
  }

  runtimeState.scenarioApplyInFlight = true;
  activeScenarioApplyPromise = (async () => {
    // 同一时刻只允许一个 scenario apply；UI 先同步为“加载中”，finally 再同步结束态，避免控件读到中间状态。
    syncScenarioUi();
    const bundle = await loadScenarioBundle(normalizedScenarioId, { bundleLevel: "full" });
    await applyScenarioBundle(bundle, {
      renderNow,
      markDirtyReason,
      showToastOnComplete,
    });
    return bundle;
  })();

  try {
    return await activeScenarioApplyPromise;
  } finally {
    activeScenarioApplyPromise = null;
    runtimeState.scenarioApplyInFlight = false;
    syncScenarioUi();
  }
}

async function applyDefaultScenarioOnStartup(
  {
    renderNow = true,
    d3Client = globalThis.d3,
  } = {}
) {
  if (runtimeState.activeScenarioId) {
    return null;
  }
  const registry = await loadScenarioRegistry({ d3Client });
  const defaultScenarioId = normalizeScenarioId(registry?.default_scenario_id);
  if (!defaultScenarioId) {
    return null;
  }
  const meta = getScenarioMetaById(defaultScenarioId);
  if (!meta?.manifest_url) {
    console.warn(`[scenario] Default scenario "${defaultScenarioId}" is not registered.`);
    return null;
  }
  return applyScenarioById(defaultScenarioId, {
    renderNow,
    markDirtyReason: "",
    showToastOnComplete: false,
  });
}

function resetToScenarioBaseline(options = {}) {
  assertScenarioInteractionsAllowed("reset the active scenario");
  const {
    renderNow = true,
    markDirtyReason = "scenario-reset",
    showToastOnComplete = false,
  } = options;
  return resetToScenarioBaselineRuntime({
    renderNow,
    markDirtyReason,
    showToastOnComplete,
    showToast,
    t,
  });
}

function clearActiveScenario(options = {}) {
  const {
    allowDuringBootBlocking = false,
  } = options;
  assertScenarioInteractionsAllowed("exit the active scenario", {
    allowDuringBootBlocking,
  });
  const {
    renderNow = true,
    markDirtyReason = "scenario-clear",
    showToastOnComplete = false,
  } = options;
  return clearActiveScenarioRuntime({
    renderNow,
    markDirtyReason,
    showToastOnComplete,
    showToast,
    t,
  });
}

function formatScenarioStatusText() {
  const fatalState = getScenarioFatalRecoveryState();
  if (fatalState) {
    if (!runtimeState.activeScenarioId || !runtimeState.activeScenarioManifest) {
      return formatScenarioFatalRecoveryMessage(fatalState);
    }
    const displayName = getScenarioDisplayName(runtimeState.activeScenarioManifest, runtimeState.activeScenarioId);
    return `${displayName} - ${formatScenarioFatalRecoveryMessage(fatalState)}`;
  }
  if (!runtimeState.activeScenarioId || !runtimeState.activeScenarioManifest) {
    return t("No scenario active", "ui");
  }
  const displayName = getScenarioDisplayName(runtimeState.activeScenarioManifest, runtimeState.activeScenarioId);
  const liveHealth = evaluateScenarioDataHealth(runtimeState.activeScenarioManifest, {
    minRatio: Number(runtimeState.scenarioDataHealth?.minRatio || SCENARIO_DETAIL_MIN_RATIO_STRICT),
  });
  const warning = String(liveHealth?.warning || runtimeState.scenarioDataHealth?.warning || "").trim();
  if (
    runtimeState.scenarioHydrationHealthGate?.status === "degraded"
    && String(runtimeState.scenarioHydrationHealthGate?.reason || "").startsWith("runtime-overlay-")
  ) {
    return `${displayName} · ${t("Overlay fallback active; editing remains available.", "ui")}`;
  }
  return warning ? `${displayName} · ${warning}` : displayName;
}

function formatScenarioAuditText() {
  if (getScenarioFatalRecoveryState()) {
    return t("Scenario controls are locked until the page reloads.", "ui");
  }
  if (!runtimeState.activeScenarioId || !runtimeState.activeScenarioManifest) {
    return "";
  }
  return t("Ownership baseline active.", "ui");
}

export {
  applyScenarioBundle,
  applyScenarioById,
  clearActiveScenario,
  formatScenarioAuditText,
  formatScenarioStatusText,
  getDefaultScenarioId,
  getScenarioDisplayName,
  getScenarioDisplayOwnerByFeatureId,
  getScenarioRegistryEntries,
  normalizeScenarioId,
  normalizeScenarioViewMode,
  resetToScenarioBaseline,
  setScenarioViewMode,
};
