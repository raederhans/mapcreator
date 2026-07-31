// Renderer runtime state defaults.
import {
  setInteractionInfrastructureStateFields as setInteractionInfrastructureActionStateFields,
} from "./actions/renderer_interaction_actions.js";
import {
  commitRendererDprStageState as commitRendererDprStageActionState,
} from "./actions/renderer_phase_actions.js";
import {
  commitProjectedBoundsCacheState,
  commitRenderPassCacheState,
  setSphericalFeatureDiagnosticsCacheState,
} from "./actions/renderer_cache_actions.js";
import {
  ensureExactAfterSettleControllerState as ensureExactAfterSettleControllerActionState,
  isExactAfterSettleControllerActiveState as isExactAfterSettleControllerActiveActionState,
  isExactAfterSettleGenerationCurrentState as isExactAfterSettleGenerationCurrentActionState,
  resetExactAfterSettleControllerState as resetExactAfterSettleControllerActionState,
} from "./actions/renderer_exact_refresh_actions.js";
import {
  setFirstVisibleFramePaintedState as setFirstVisibleFramePaintedActionState,
  setProjectedBoundsDiagnosticsState as setProjectedBoundsDiagnosticsActionState,
} from "./actions/renderer_diagnostics_actions.js";
// 这里收口 map_renderer / sidebar 共享的运行时默认 shape，
// 避免 defer 标记、pass cache、诊断缓存和交互基础设施状态再次漂移。

export function createDefaultRendererInfrastructureState() {
  return {
    interactionInfrastructureReady: true,
    interactionInfrastructureBuildInFlight: false,
    interactionInfrastructureStage: "idle",
  };
}

export function createDefaultIntensityFieldToolState() {
  return {
    active: false,
    channelId: "physicalAtlas",
    subMode: "paint",
    brushRadiusDeg: 3,
    brushStrength: 1,
    selectedPointId: "",
  };
}

export function createDefaultExactAfterSettleControllerState() {
  return {
    generation: 0,
    phase: "idle",
    startedAt: 0,
    scheduledAt: 0,
    applyStartedAt: 0,
    applyFinishedAt: 0,
    scenarioId: "",
    selectionVersion: 0,
    topologyRevision: 0,
    dpr: 1,
    pixelWidth: 0,
    pixelHeight: 0,
    colorRevision: 0,
    contextFlagSignature: "",
    zoomToken: 0,
    transformBucket: "",
    pendingPlan: null,
    reason: "init",
  };
}

export function ensureExactAfterSettleControllerState(target) {
  if (!target || typeof target !== "object") {
    return createDefaultExactAfterSettleControllerState();
  }
  ensureExactAfterSettleControllerActionState(target);
  return target.exactAfterSettleController;
}

export function resetExactAfterSettleControllerState(target, { reason = "reset", generation = null } = {}) {
  if (!target || typeof target !== "object") {
    const controller = createDefaultExactAfterSettleControllerState();
    if (generation !== null && Number(controller.generation || 0) !== Number(generation || 0)) {
      return false;
    }
    return true;
  }
  return resetExactAfterSettleControllerActionState(target, {
    reason,
    generation,
  });
}

export function isExactAfterSettleGenerationCurrentState(target, generation, phase = "") {
  if (!target || typeof target !== "object") return false;
  return isExactAfterSettleGenerationCurrentActionState(target, generation, phase);
}

export function isExactAfterSettleControllerActiveState(target) {
  if (!target || typeof target !== "object") return false;
  return isExactAfterSettleControllerActiveActionState(target);
}

export function ensureSceneSnapshotState(target) {
  if (!target || typeof target !== "object") {
    return {
      sceneGeneration: 0,
      scenarioDataGeneration: 0,
      sceneScenarioId: "",
      sceneGenerationReason: "init",
      scenarioDataGenerationReason: "init",
    };
  }
  target.sceneGeneration = Math.max(0, Number(target.sceneGeneration || 0));
  target.scenarioDataGeneration = Math.max(0, Number(target.scenarioDataGeneration || 0));
  target.sceneScenarioId = String(target.sceneScenarioId || "");
  target.sceneGenerationReason = String(target.sceneGenerationReason || "init");
  target.scenarioDataGenerationReason = String(target.scenarioDataGenerationReason || "init");
  return target;
}

export function bumpSceneGenerationState(target, reason = "scene-update") {
  const state = ensureSceneSnapshotState(target);
  state.sceneGeneration = Math.max(0, Number(state.sceneGeneration || 0)) + 1;
  state.sceneGenerationReason = String(reason || "scene-update");
  return state.sceneGeneration;
}

export function bumpScenarioDataGenerationState(target, reason = "scenario-data-update") {
  const state = ensureSceneSnapshotState(target);
  state.scenarioDataGeneration = Math.max(0, Number(state.scenarioDataGeneration || 0)) + 1;
  state.scenarioDataGenerationReason = String(reason || "scenario-data-update");
  return state.scenarioDataGeneration;
}

export function createDefaultRenderPassCacheState() {
  return {
    referenceTransform: null,
    referenceTransforms: {},
    fullReferenceTransforms: {},
    canvases: {},
    layouts: {},
    signatures: {},
    contextScenarioLayerCache: {},
    compositeBuffer: {
      canvas: null,
    },
    borderSnapshot: {
      canvas: null,
      layout: null,
      referenceTransform: null,
      valid: false,
      reason: "init",
    },
    lastGoodFrame: {
      canvas: null,
      referenceTransform: null,
      commitKey: null,
      commitKeySignature: "",
      committedFrameIdentity: null,
      metadata: null,
      valid: false,
      stale: false,
      capturedAt: 0,
      invalidatedAt: 0,
      reason: "init",
      staleReason: "",
      rejectedReason: "",
      scenarioId: "",
      selectionVersion: 0,
      contextFlagSignature: "",
      topologyRevision: 0,
      dpr: 1,
      pixelWidth: 0,
      pixelHeight: 0,
      sceneGeneration: 0,
      scenarioDataGeneration: 0,
      politicalDataStage: "unknown",
      fullPoliticalReady: false,
      finePoliticalCacheReady: false,
    },
    interactionComposite: {
      canvas: null,
      layout: null,
      referenceTransform: null,
      signature: "",
      valid: false,
      capturedAt: 0,
      reason: "init",
      scenarioId: "",
      selectionVersion: 0,
      contextFlagSignature: "",
      topologyRevision: 0,
      dpr: 1,
      pixelWidth: 0,
      pixelHeight: 0,
      colorRevision: 0,
      transformBucket: "",
      sceneGeneration: 0,
      scenarioDataGeneration: 0,
      politicalDataStage: "unknown",
      fullPoliticalReady: false,
      finePoliticalCacheReady: false,
    },
    partialPoliticalDirtyIds: new Set(),
    pendingPoliticalColorEditIds: new Set(),
    pendingPoliticalColorEditRevision: -1,
    pendingPoliticalColorEditScenarioId: "",
    pendingPoliticalColorEditReason: "",
    pendingPoliticalColorEditStartedAt: 0,
    pendingPoliticalColorEditInputLabel: "",
    pendingPoliticalColorEditFirstPixelRecorded: false,
    pendingPoliticalColorEditFirstPixelPaintSource: "",
    pendingPoliticalPatchOverlayTransformSignature: "",
    politicalPassSceneGeneration: 0,
    politicalPassScenarioDataGeneration: 0,
    politicalPassDataStage: "unknown",
    politicalPassFullReady: false,
    politicalPassFineCacheReady: false,
    politicalPathCache: new Map(),
    politicalPathCacheSignature: "",
    politicalPathCacheTransform: null,
    politicalPathWarmupQueue: [],
    politicalPathWarmupHandle: null,
    politicalPathWarmupSignature: "",
    politicalPathWarmupReason: "",
    contextScenarioReasonMismatchSignature: "",
    dirty: {
      background: true,
      political: true,
      hgoPreview: true,
      effects: true,
      contextBase: true,
      contextScenario: true,
      dayNight: true,
      borders: true,
    },
    reasons: {
      background: "init",
      political: "init",
      hgoPreview: "init",
      effects: "init",
      contextBase: "init",
      contextScenario: "init",
      dayNight: "init",
      borders: "init",
    },
    counters: {
      frames: 0,
      composites: 0,
      interactionCompositeBuilds: 0,
      interactionCompositeReuses: 0,
      interactionCompositeContinuityReuses: 0,
      transformedFrames: 0,
      drawCanvas: 0,
      backgroundPassRenders: 0,
      physicalBasePassRenders: 0,
      politicalPassRenders: 0,
      hgoPreviewPassRenders: 0,
      effectsPassRenders: 0,
      contextPassRenders: 0,
      contextBasePassRenders: 0,
      contextScenarioPassRenders: 0,
      contextScenarioReuseCount: 0,
      contextScenarioExactRefreshCount: 0,
      dayNightPassRenders: 0,
      borderPassRenders: 0,
      borderSnapshotRenders: 0,
      borderSnapshotReuses: 0,
      labelPassRenders: 0,
      hitCanvasRenders: 0,
      interactionHitCandidateCount: 0,
      interactionHitCanvasPreferredCount: 0,
      interactionSecondaryIndexDemandCount: 0,
      dynamicBorderRebuilds: 0,
      politicalPartialRepaints: 0,
      politicalPartialFallbacks: 0,
      politicalPartialCandidateCount: 0,
      politicalPartialPathCacheMisses: 0,
      politicalPartialPathBuild: 0,
      fillPatchFirstPixelCount: 0,
      politicalPathCacheBuild: 0,
      politicalPathWarmupBuild: 0,
      politicalPathWarmupSlices: 0,
      politicalPathWarmupCancels: 0,
      politicalRasterWorkerTimeoutCount: 0,
      politicalRasterWorkerRecycleCount: 0,
      politicalRasterWorkerStaleResponseCount: 0,
      blackFrameCount: 0,
      lastGoodFrameReuses: 0,
      continuityFrameReuses: 0,
      missingVisibleFrameCount: 0,
      missingVisibleFrameSkippedDuringInteraction: 0,
      waterAdaptiveStateResetCount: 0,
      contextScenarioReasonMismatchWarnings: 0,
    },
    lastFrame: null,
    lastAction: "",
    lastActionDurationMs: 0,
    lastActionAt: 0,
    perfOverlayEnabled: false,
    overlayElement: null,
  };
}

export function createDefaultSidebarPerfState() {
  return {
    counters: {
      fullListRenders: 0,
      rowRefreshes: 0,
      inspectorRenders: 0,
      presetTreeRenders: 0,
      legendRenders: 0,
    },
  };
}

export function createDefaultProjectedBoundsCacheState() {
  return {
    projectedBoundsById: new Map(),
    sphericalFeatureDiagnosticsById: new Map(),
  };
}

export function createDefaultProjectedBoundsDiagnostics() {
  return {
    total: 0,
    byGeometryType: {},
    byReason: {},
  };
}

export function createDefaultRendererTransientRuntimeState() {
  return {
    dprStage: "idle",
    dprInteractiveScale: 0.72,
    dprLastStageSwitchAt: 0,
    TINY_AREA: 6,
    MOUSE_THROTTLE_MS: 16,
    lastMouseMoveTime: 0,
    hitCanvasDirty: true,
    hitCanvasTopologyRevision: 0,
    deferHitCanvasBuild: false,
    hitCanvasBuildScheduled: null,
    stagedMapDataToken: 0,
    stagedContextBaseHandle: null,
    stagedHitCanvasHandle: null,
    deferContextBasePass: false,
    deferContextBaseEnhancements: false,
    deferExactAfterSettle: false,
    exactAfterSettleHandle: null,
    exactAfterSettleController: createDefaultExactAfterSettleControllerState(),
    zoomRenderScheduled: false,
    pendingZoomTransform: null,
    zoomGestureStartTransform: null,
    zoomGestureScaleDelta: 0,
    zoomGestureEndedAt: 0,
    adaptiveSettleProfile: null,
    pendingExactPoliticalFastFrame: false,
    activeInteractionRecoveryTaskKey: "",
    activeInteractionRecoveryTaskStartedAt: 0,
    debugCountryCoverage: null,
    isInteracting: false,
    renderPhase: "idle",
    politicalRecoveryQuality: "progressive",
    firstVisibleFramePainted: false,
    phaseEnteredAt: 0,
    renderPhaseTimerId: null,
    pendingDayNightRefresh: false,
    colorRevision: 0,
    topologyRevision: 0,
    sceneGeneration: 0,
    scenarioDataGeneration: 0,
    sceneScenarioId: "",
    sceneGenerationReason: "init",
    scenarioDataGenerationReason: "init",
    renderPassCache: createDefaultRenderPassCacheState(),
    sidebarPerf: createDefaultSidebarPerfState(),
    ...createDefaultProjectedBoundsCacheState(),
  };
}

export function applyRendererSurfaceBridgeState(target, handles = {}) {
  if (!target || typeof target !== "object") {
    return false;
  }
  const source = handles && typeof handles === "object" ? handles : {};
  target.colorCanvas = source.mapCanvas ?? null;
  target.canvasLayers = source.canvasLayers ?? null;
  target.lineCanvas = null;
  target.colorCtx = source.context ?? null;
  target.politicalPatchCanvas = source.politicalPatchCanvas ?? null;
  target.politicalPatchCtx = source.politicalPatchContext ?? null;
  target.interactionOverlayCanvas = source.interactionOverlayCanvas ?? null;
  target.interactionOverlayCtx = source.interactionOverlayContext ?? null;
  target.lineCtx = null;
  return target;
}

function matchesRenderPassCacheDefaultShape(value, defaultValue) {
  if (defaultValue instanceof Map) return value instanceof Map;
  if (defaultValue instanceof Set) return value instanceof Set;
  if (Array.isArray(defaultValue)) return Array.isArray(value);
  if (defaultValue === null) return true;
  if (typeof defaultValue === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (typeof defaultValue !== "object") return typeof value === typeof defaultValue;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(defaultValue).every(([fieldName, nestedDefault]) => (
    fieldName in value
    && matchesRenderPassCacheDefaultShape(value[fieldName], nestedDefault)
  ));
}

function normalizeRenderPassCacheDefaultShape(value, defaultValue) {
  if (defaultValue instanceof Map) {
    return value instanceof Map ? value : new Map(defaultValue);
  }
  if (defaultValue instanceof Set) {
    return value instanceof Set ? value : new Set(defaultValue);
  }
  if (Array.isArray(defaultValue)) {
    return Array.isArray(value) ? value : [...defaultValue];
  }
  if (defaultValue === null) return value ?? null;
  if (typeof defaultValue === "number") {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : defaultValue;
  }
  if (typeof defaultValue !== "object") {
    return typeof value === typeof defaultValue ? value : defaultValue;
  }
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const normalized = { ...source };
  Object.entries(defaultValue).forEach(([fieldName, nestedDefault]) => {
    normalized[fieldName] = normalizeRenderPassCacheDefaultShape(
      source[fieldName],
      nestedDefault,
    );
  });
  return normalized;
}

function isNullableObjectState(value) {
  return value === null
    || (typeof value === "object" && !Array.isArray(value));
}

function isRenderPassCacheStateNormalized(cache, defaults, renderPassNames) {
  if (!cache || typeof cache !== "object" || Array.isArray(cache)) return false;
  if (!cache.dirty || typeof cache.dirty !== "object") return false;
  if (!cache.reasons || typeof cache.reasons !== "object") return false;
  if (!renderPassNames.every((passName) => (
    passName in cache.dirty
    && passName in cache.reasons
  ))) return false;
  if (!isNullableObjectState(cache.politicalPathCacheTransform)) return false;
  if (!isNullableObjectState(cache.politicalPathWarmupHandle)) return false;
  return Object.entries(defaults).every(([fieldName, defaultValue]) => {
    if (!(fieldName in cache)) return false;
    return matchesRenderPassCacheDefaultShape(cache[fieldName], defaultValue);
  });
}

export function ensureRenderPassCacheState(
  target,
  {
    cloneZoomTransform = (value) => value,
    renderPassNames = [],
  } = {},
) {
  if (!target || typeof target !== "object") {
    return createDefaultRenderPassCacheState();
  }
  const defaults = createDefaultRenderPassCacheState();
  const currentCache = target.renderPassCache && typeof target.renderPassCache === "object"
    ? target.renderPassCache
    : null;
  if (currentCache && isRenderPassCacheStateNormalized(currentCache, defaults, renderPassNames)) {
    return currentCache;
  }
  const cache = !currentCache
    ? defaults
    : {
        ...currentCache,
        compositeBuffer: currentCache.compositeBuffer && typeof currentCache.compositeBuffer === "object"
          ? { ...currentCache.compositeBuffer }
          : currentCache.compositeBuffer,
        lastGoodFrame: currentCache.lastGoodFrame && typeof currentCache.lastGoodFrame === "object"
          ? { ...currentCache.lastGoodFrame }
          : currentCache.lastGoodFrame,
        interactionComposite: currentCache.interactionComposite && typeof currentCache.interactionComposite === "object"
          ? { ...currentCache.interactionComposite }
          : currentCache.interactionComposite,
        dirty: currentCache.dirty && typeof currentCache.dirty === "object"
          ? { ...currentCache.dirty }
          : currentCache.dirty,
        reasons: currentCache.reasons && typeof currentCache.reasons === "object"
          ? { ...currentCache.reasons }
          : currentCache.reasons,
        counters: currentCache.counters && typeof currentCache.counters === "object"
          ? { ...currentCache.counters }
          : currentCache.counters,
      };
  cache.canvases = cache.canvases && typeof cache.canvases === "object" ? cache.canvases : defaults.canvases;
  cache.layouts = cache.layouts && typeof cache.layouts === "object" ? cache.layouts : defaults.layouts;
  cache.signatures = cache.signatures && typeof cache.signatures === "object" ? cache.signatures : defaults.signatures;
  cache.referenceTransforms = cache.referenceTransforms && typeof cache.referenceTransforms === "object"
    ? cache.referenceTransforms
    : defaults.referenceTransforms;
  cache.fullReferenceTransforms = cache.fullReferenceTransforms && typeof cache.fullReferenceTransforms === "object"
    ? cache.fullReferenceTransforms
    : defaults.fullReferenceTransforms;
  cache.contextScenarioLayerCache = cache.contextScenarioLayerCache && typeof cache.contextScenarioLayerCache === "object"
    ? cache.contextScenarioLayerCache
    : defaults.contextScenarioLayerCache;
  cache.compositeBuffer = normalizeRenderPassCacheDefaultShape(
    cache.compositeBuffer,
    defaults.compositeBuffer,
  );
  cache.borderSnapshot = normalizeRenderPassCacheDefaultShape(
    cache.borderSnapshot,
    defaults.borderSnapshot,
  );
  cache.lastGoodFrame = normalizeRenderPassCacheDefaultShape(
    cache.lastGoodFrame,
    defaults.lastGoodFrame,
  );
  cache.interactionComposite = normalizeRenderPassCacheDefaultShape(
    cache.interactionComposite,
    defaults.interactionComposite,
  );
  cache.partialPoliticalDirtyIds = cache.partialPoliticalDirtyIds instanceof Set
    ? cache.partialPoliticalDirtyIds
    : defaults.partialPoliticalDirtyIds;
  cache.pendingPoliticalColorEditIds = cache.pendingPoliticalColorEditIds instanceof Set
    ? cache.pendingPoliticalColorEditIds
    : defaults.pendingPoliticalColorEditIds;
  cache.pendingPoliticalColorEditRevision = Number.isFinite(Number(cache.pendingPoliticalColorEditRevision))
    ? Number(cache.pendingPoliticalColorEditRevision)
    : defaults.pendingPoliticalColorEditRevision;
  cache.pendingPoliticalColorEditScenarioId = typeof cache.pendingPoliticalColorEditScenarioId === "string"
    ? cache.pendingPoliticalColorEditScenarioId
    : defaults.pendingPoliticalColorEditScenarioId;
  cache.pendingPoliticalColorEditReason = typeof cache.pendingPoliticalColorEditReason === "string"
    ? cache.pendingPoliticalColorEditReason
    : defaults.pendingPoliticalColorEditReason;
  cache.pendingPoliticalColorEditStartedAt = Number.isFinite(Number(cache.pendingPoliticalColorEditStartedAt))
    ? Number(cache.pendingPoliticalColorEditStartedAt)
    : defaults.pendingPoliticalColorEditStartedAt;
  cache.pendingPoliticalColorEditInputLabel = typeof cache.pendingPoliticalColorEditInputLabel === "string"
    ? cache.pendingPoliticalColorEditInputLabel
    : defaults.pendingPoliticalColorEditInputLabel;
  cache.pendingPoliticalColorEditFirstPixelRecorded = typeof cache.pendingPoliticalColorEditFirstPixelRecorded === "boolean"
    ? cache.pendingPoliticalColorEditFirstPixelRecorded
    : defaults.pendingPoliticalColorEditFirstPixelRecorded;
  cache.pendingPoliticalColorEditFirstPixelPaintSource = typeof cache.pendingPoliticalColorEditFirstPixelPaintSource === "string"
    ? cache.pendingPoliticalColorEditFirstPixelPaintSource
    : defaults.pendingPoliticalColorEditFirstPixelPaintSource;
  cache.pendingPoliticalPatchOverlayTransformSignature = typeof cache.pendingPoliticalPatchOverlayTransformSignature === "string"
    ? cache.pendingPoliticalPatchOverlayTransformSignature
    : defaults.pendingPoliticalPatchOverlayTransformSignature;
  cache.politicalPassSceneGeneration = Number.isFinite(Number(cache.politicalPassSceneGeneration))
    ? Number(cache.politicalPassSceneGeneration)
    : defaults.politicalPassSceneGeneration;
  cache.politicalPassScenarioDataGeneration = Number.isFinite(Number(cache.politicalPassScenarioDataGeneration))
    ? Number(cache.politicalPassScenarioDataGeneration)
    : defaults.politicalPassScenarioDataGeneration;
  cache.politicalPassDataStage = typeof cache.politicalPassDataStage === "string"
    ? cache.politicalPassDataStage
    : defaults.politicalPassDataStage;
  cache.politicalPassFullReady = typeof cache.politicalPassFullReady === "boolean"
    ? cache.politicalPassFullReady
    : defaults.politicalPassFullReady;
  cache.politicalPassFineCacheReady = typeof cache.politicalPassFineCacheReady === "boolean"
    ? cache.politicalPassFineCacheReady
    : defaults.politicalPassFineCacheReady;
  cache.politicalPathCache = cache.politicalPathCache instanceof Map
    ? cache.politicalPathCache
    : defaults.politicalPathCache;
  cache.politicalPathCacheSignature = typeof cache.politicalPathCacheSignature === "string"
    ? cache.politicalPathCacheSignature
    : defaults.politicalPathCacheSignature;
  cache.politicalPathCacheTransform = isNullableObjectState(cache.politicalPathCacheTransform)
    && cache.politicalPathCacheTransform
    ? cloneZoomTransform(cache.politicalPathCacheTransform)
    : defaults.politicalPathCacheTransform;
  cache.politicalPathWarmupQueue = Array.isArray(cache.politicalPathWarmupQueue)
    ? cache.politicalPathWarmupQueue
    : defaults.politicalPathWarmupQueue;
  cache.politicalPathWarmupHandle = isNullableObjectState(cache.politicalPathWarmupHandle)
    && cache.politicalPathWarmupHandle
    ? cache.politicalPathWarmupHandle
    : defaults.politicalPathWarmupHandle;
  cache.politicalPathWarmupSignature = typeof cache.politicalPathWarmupSignature === "string"
    ? cache.politicalPathWarmupSignature
    : defaults.politicalPathWarmupSignature;
  cache.politicalPathWarmupReason = typeof cache.politicalPathWarmupReason === "string"
    ? cache.politicalPathWarmupReason
    : defaults.politicalPathWarmupReason;
  cache.contextScenarioReasonMismatchSignature = typeof cache.contextScenarioReasonMismatchSignature === "string"
    ? cache.contextScenarioReasonMismatchSignature
    : defaults.contextScenarioReasonMismatchSignature;
  cache.dirty = cache.dirty && typeof cache.dirty === "object" ? cache.dirty : {};
  cache.reasons = cache.reasons && typeof cache.reasons === "object" ? cache.reasons : {};
  cache.counters = cache.counters && typeof cache.counters === "object" ? cache.counters : {};
  renderPassNames.forEach((passName) => {
    if (!(passName in cache.dirty)) cache.dirty[passName] = true;
    if (!(passName in cache.reasons)) cache.reasons[passName] = "init";
  });
  Object.entries(defaults.counters).forEach(([counterName, initialValue]) => {
    const normalized = Number(cache.counters[counterName]);
    cache.counters[counterName] = Number.isFinite(normalized)
      ? normalized
      : initialValue;
  });
  if (!("lastFrame" in cache)) cache.lastFrame = defaults.lastFrame;
  if (typeof cache.lastAction !== "string") cache.lastAction = defaults.lastAction;
  cache.lastActionDurationMs = Number.isFinite(Number(cache.lastActionDurationMs))
    ? Number(cache.lastActionDurationMs)
    : defaults.lastActionDurationMs;
  cache.lastActionAt = Number.isFinite(Number(cache.lastActionAt))
    ? Number(cache.lastActionAt)
    : defaults.lastActionAt;
  if (typeof cache.perfOverlayEnabled !== "boolean") {
    cache.perfOverlayEnabled = defaults.perfOverlayEnabled;
  }
  if (!("overlayElement" in cache)) cache.overlayElement = defaults.overlayElement;
  commitRenderPassCacheState(target, cache);
  return cache;
}

export function ensureSidebarPerfState(target) {
  if (!target || typeof target !== "object") {
    return createDefaultSidebarPerfState();
  }
  const defaults = createDefaultSidebarPerfState();
  if (!target.sidebarPerf || typeof target.sidebarPerf !== "object") {
    target.sidebarPerf = defaults;
  }
  if (!target.sidebarPerf.counters || typeof target.sidebarPerf.counters !== "object") {
    target.sidebarPerf.counters = {};
  }
  Object.entries(defaults.counters).forEach(([counterName, initialValue]) => {
    if (!Number.isFinite(Number(target.sidebarPerf.counters[counterName]))) {
      target.sidebarPerf.counters[counterName] = initialValue;
    }
  });
  return target.sidebarPerf;
}

export function ensureProjectedBoundsCacheState(target) {
  if (!target || typeof target !== "object") {
    return createDefaultProjectedBoundsCacheState();
  }
  if (
    target.projectedBoundsById instanceof Map
    && target.sphericalFeatureDiagnosticsById instanceof Map
  ) {
    return target;
  }
  const defaults = createDefaultProjectedBoundsCacheState();
  commitProjectedBoundsCacheState(target, {
    projectedBoundsById: target.projectedBoundsById instanceof Map
      ? target.projectedBoundsById
      : defaults.projectedBoundsById,
    sphericalFeatureDiagnosticsById: target.sphericalFeatureDiagnosticsById instanceof Map
      ? target.sphericalFeatureDiagnosticsById
      : defaults.sphericalFeatureDiagnosticsById,
  });
  return target;
}

export function resetProjectedBoundsCacheState(target) {
  if (!target || typeof target !== "object") {
    return createDefaultProjectedBoundsCacheState();
  }
  const defaults = createDefaultProjectedBoundsCacheState();
  commitProjectedBoundsCacheState(target, defaults);
  return defaults;
}

export function ensureSphericalFeatureDiagnosticsCache(target) {
  if (!target || typeof target !== "object") {
    return createDefaultProjectedBoundsCacheState().sphericalFeatureDiagnosticsById;
  }
  if (target.sphericalFeatureDiagnosticsById instanceof Map) {
    return target.sphericalFeatureDiagnosticsById;
  }
  const diagnosticsCache =
    createDefaultProjectedBoundsCacheState().sphericalFeatureDiagnosticsById;
  setSphericalFeatureDiagnosticsCacheState(target, diagnosticsCache);
  return target.sphericalFeatureDiagnosticsById;
}

// Transitional compatibility surface. Canonical mutation authority lives in
// renderer_interaction_actions.js; new callers import that module directly.
export function setInteractionInfrastructureStateFields(target, stage, options) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return "idle";
  }
  return setInteractionInfrastructureActionStateFields(target, stage, options);
}

// Transitional compatibility surface for renderer callbacks that are handed
// across owner factories. These named functions keep mutation authority
// explicit and statically reachable while the composition root remains the
// runtime-effects owner.
export function commitRendererDprStageState(target, update) {
  return commitRendererDprStageActionState(target, update);
}

export function setFirstVisibleFramePaintedState(target, painted) {
  return setFirstVisibleFramePaintedActionState(target, painted);
}

export function commitProjectedBoundsDiagnosticsState(target, diagnostics) {
  return setProjectedBoundsDiagnosticsActionState(target, diagnostics);
}
