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

export function setSphericalFeatureDiagnosticsCacheState(
  target,
  sphericalFeatureDiagnosticsById,
) {
  assertStateTarget(target);
  assertMap(sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  target.sphericalFeatureDiagnosticsById = sphericalFeatureDiagnosticsById;
  return true;
}
