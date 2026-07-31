// Pure render-pass cache preparation. This module stays import-free so callers
// can normalize a detached holder before the state action performs one commit.

function isObjectHolder(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNullableObjectHolder(value) {
  return value === null || isObjectHolder(value);
}

function matchesDefaultShape(value, defaultValue) {
  if (defaultValue instanceof Map) return value instanceof Map;
  if (defaultValue instanceof Set) return value instanceof Set;
  if (Array.isArray(defaultValue)) return Array.isArray(value);
  if (defaultValue === null) return true;
  if (typeof defaultValue === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (typeof defaultValue !== "object") {
    return typeof value === typeof defaultValue;
  }
  if (!isObjectHolder(value)) return false;
  return Object.entries(defaultValue).every(([fieldName, nestedDefault]) => (
    fieldName in value
    && matchesDefaultShape(value[fieldName], nestedDefault)
  ));
}

function isNormalizedRenderPassCache(cache, defaults, renderPassNames) {
  if (!isObjectHolder(cache)) return false;
  if (!isObjectHolder(cache.dirty) || !isObjectHolder(cache.reasons)) return false;
  for (const passName of renderPassNames) {
    if (!(passName in cache.dirty) || !(passName in cache.reasons)) return false;
  }
  if (!isNullableObjectHolder(cache.politicalPathCacheTransform)) return false;
  if (!isNullableObjectHolder(cache.politicalPathWarmupHandle)) return false;
  return Object.entries(defaults).every(([fieldName, defaultValue]) => (
    fieldName in cache && matchesDefaultShape(cache[fieldName], defaultValue)
  ));
}

function normalizeDefaultShape(value, defaultValue) {
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
  const source = isObjectHolder(value) ? value : {};
  const normalized = { ...source };
  for (const [fieldName, nestedDefault] of Object.entries(defaultValue)) {
    normalized[fieldName] = normalizeDefaultShape(source[fieldName], nestedDefault);
  }
  return normalized;
}

export function normalizeRenderPassCacheState(
  currentCache,
  {
    defaults = {},
    cloneZoomTransform = (value) => value,
    renderPassNames = [],
  } = {},
) {
  if (!isObjectHolder(defaults)) {
    throw new TypeError("[render_pass_cache_state_normalizer] defaults must be an object");
  }
  if (typeof cloneZoomTransform !== "function") {
    throw new TypeError("[render_pass_cache_state_normalizer] cloneZoomTransform must be a function");
  }
  if (!Array.isArray(renderPassNames)) {
    throw new TypeError("[render_pass_cache_state_normalizer] renderPassNames must be an array");
  }
  if (isNormalizedRenderPassCache(currentCache, defaults, renderPassNames)) {
    return currentCache;
  }

  const cache = normalizeDefaultShape(
    isObjectHolder(currentCache) ? currentCache : {},
    defaults,
  );
  if (!isNullableObjectHolder(cache.politicalPathCacheTransform)) {
    cache.politicalPathCacheTransform = defaults.politicalPathCacheTransform;
  } else if (cache.politicalPathCacheTransform) {
    cache.politicalPathCacheTransform = cloneZoomTransform(
      cache.politicalPathCacheTransform,
    );
  }
  if (!isNullableObjectHolder(cache.politicalPathWarmupHandle)) {
    cache.politicalPathWarmupHandle = defaults.politicalPathWarmupHandle;
  }
  cache.dirty = isObjectHolder(cache.dirty) ? cache.dirty : {};
  cache.reasons = isObjectHolder(cache.reasons) ? cache.reasons : {};
  for (const passName of renderPassNames) {
    if (!(passName in cache.dirty)) cache.dirty[passName] = true;
    if (!(passName in cache.reasons)) cache.reasons[passName] = "init";
  }
  return cache;
}
