// Canonical renderer cache-holder mutations.
// Cache normalization, geometry work, and nested cache algorithms stay in callers/owners.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[renderer_cache_actions] target must be an object");
  }
}

function assertMap(value, label) {
  if (!(value instanceof Map)) {
    throw new TypeError(`[renderer_cache_actions] ${label} must be a Map`);
  }
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

export function commitRenderPassCacheState(target, renderPassCache) {
  assertStateTarget(target);
  if (!renderPassCache || typeof renderPassCache !== "object" || Array.isArray(renderPassCache)) {
    throw new TypeError("[renderer_cache_actions] renderPassCache must be an object");
  }
  target.renderPassCache = renderPassCache;
  return true;
}

export function ensureRenderPassCacheState(
  target,
  {
    defaults = {},
    cloneZoomTransform = (value) => value,
    renderPassNames = [],
  } = {},
) {
  assertStateTarget(target);
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
    throw new TypeError("[renderer_cache_actions] defaults must be an object");
  }
  if (typeof cloneZoomTransform !== "function") {
    throw new TypeError("[renderer_cache_actions] cloneZoomTransform must be a function");
  }
  if (!Array.isArray(renderPassNames)) {
    throw new TypeError("[renderer_cache_actions] renderPassNames must be an array");
  }
  const currentCache = target.renderPassCache && typeof target.renderPassCache === "object"
    ? target.renderPassCache
    : null;
  if (currentCache && isRenderPassCacheStateNormalized(currentCache, defaults, renderPassNames)) {
    return currentCache;
  }
  const cache = !currentCache
    ? normalizeRenderPassCacheDefaultShape({}, defaults)
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
  cache.compositeBuffer = normalizeRenderPassCacheDefaultShape(cache.compositeBuffer, defaults.compositeBuffer);
  cache.borderSnapshot = normalizeRenderPassCacheDefaultShape(cache.borderSnapshot, defaults.borderSnapshot);
  cache.lastGoodFrame = normalizeRenderPassCacheDefaultShape(cache.lastGoodFrame, defaults.lastGoodFrame);
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
  Object.entries(defaults.counters || {}).forEach(([counterName, initialValue]) => {
    const normalized = Number(cache.counters[counterName]);
    cache.counters[counterName] = Number.isFinite(normalized) ? normalized : initialValue;
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

export function commitProjectedBoundsCacheState(
  target,
  { projectedBoundsById, sphericalFeatureDiagnosticsById } = {},
) {
  assertStateTarget(target);
  assertMap(projectedBoundsById, "projectedBoundsById");
  assertMap(sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  target.projectedBoundsById = projectedBoundsById;
  target.sphericalFeatureDiagnosticsById = sphericalFeatureDiagnosticsById;
  return true;
}

export function setSphericalFeatureDiagnosticsCacheState(
  target,
  sphericalFeatureDiagnosticsById,
) {
  assertStateTarget(target);
  assertMap(sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  target.sphericalFeatureDiagnosticsById = sphericalFeatureDiagnosticsById;
  return true;
}
