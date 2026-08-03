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

const immutableDiagnosticValues = new WeakSet();

function isShareableDiagnosticValue(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return true;
  if (seen.has(value)) return true;
  if (
    value instanceof Map
    || value instanceof Set
    || ArrayBuffer.isView(value)
    || value instanceof ArrayBuffer
    || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
  ) {
    return false;
  }
  seen.add(value);
  return Object.values(value).every((entry) => (
    isShareableDiagnosticValue(entry, seen)
  ));
}

function freezeDiagnosticValue(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  Object.values(value).forEach((entry) => freezeDiagnosticValue(entry, seen));
  Object.freeze(value);
}

export function commitRenderPassCacheState(target, renderPassCache) {
  assertStateTarget(target);
  if (!renderPassCache || typeof renderPassCache !== "object" || Array.isArray(renderPassCache)) {
    throw new TypeError("[renderer_cache_actions] renderPassCache must be an object");
  }
  target.renderPassCache = renderPassCache;
  return true;
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

export function clearSphericalFeatureDiagnosticsCacheState(target) {
  assertStateTarget(target);
  assertMap(target.sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  target.sphericalFeatureDiagnosticsById.clear();
  return true;
}

export function getSphericalFeatureDiagnosticsCacheEntryState(target, featureId) {
  assertStateTarget(target);
  assertMap(target.sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  const normalizedFeatureId = String(featureId);
  if (!target.sphericalFeatureDiagnosticsById.has(normalizedFeatureId)) {
    return null;
  }
  const cachedDiagnostics = target.sphericalFeatureDiagnosticsById.get(normalizedFeatureId);
  return immutableDiagnosticValues.has(cachedDiagnostics)
    ? cachedDiagnostics
    : structuredClone(cachedDiagnostics);
}

export function setSphericalFeatureDiagnosticsCacheEntryState(
  target,
  featureId,
  diagnostics,
) {
  assertStateTarget(target);
  assertMap(target.sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  const normalizedFeatureId = String(featureId);
  const shareable = isShareableDiagnosticValue(diagnostics);
  const detachedDiagnostics = structuredClone(diagnostics);
  if (shareable && detachedDiagnostics && typeof detachedDiagnostics === "object") {
    if (isShareableDiagnosticValue(detachedDiagnostics)) {
      freezeDiagnosticValue(detachedDiagnostics);
      immutableDiagnosticValues.add(detachedDiagnostics);
    }
  }
  target.sphericalFeatureDiagnosticsById.set(
    normalizedFeatureId,
    detachedDiagnostics,
  );
  return true;
}
