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

function writeOwnRenderPassCacheState(target, value) {
  const descriptor = Object.getOwnPropertyDescriptor(target, "renderPassCache");
  if (descriptor && Object.hasOwn(descriptor, "value")) {
    target.renderPassCache = value;
    return;
  }
  Object.defineProperty(target, "renderPassCache", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function writeOwnProjectedBoundsCacheState(target, value) {
  const descriptor = Object.getOwnPropertyDescriptor(target, "projectedBoundsById");
  if (descriptor && Object.hasOwn(descriptor, "value")) {
    target.projectedBoundsById = value;
    return;
  }
  Object.defineProperty(target, "projectedBoundsById", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function writeOwnSphericalFeatureDiagnosticsCacheState(target, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    target,
    "sphericalFeatureDiagnosticsById",
  );
  if (descriptor && Object.hasOwn(descriptor, "value")) {
    target.sphericalFeatureDiagnosticsById = value;
    return;
  }
  Object.defineProperty(target, "sphericalFeatureDiagnosticsById", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

const immutableDiagnosticValues = new WeakSet();

function isShareableDiagnosticValue(value, ancestors = []) {
  if (!value || typeof value !== "object") return true;
  for (const ancestor of ancestors) {
    if (ancestor === value) return true;
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    return false;
  }
  const nextAncestors = [...ancestors];
  nextAncestors[nextAncestors.length] = value;
  return Object.values(value).every((entry) => (
    isShareableDiagnosticValue(entry, nextAncestors)
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
  writeOwnRenderPassCacheState(target, renderPassCache);
  return true;
}

export function commitProjectedBoundsCacheState(
  target,
  { projectedBoundsById, sphericalFeatureDiagnosticsById } = {},
) {
  assertStateTarget(target);
  assertMap(projectedBoundsById, "projectedBoundsById");
  assertMap(sphericalFeatureDiagnosticsById, "sphericalFeatureDiagnosticsById");
  writeOwnProjectedBoundsCacheState(target, projectedBoundsById);
  writeOwnSphericalFeatureDiagnosticsCacheState(
    target,
    sphericalFeatureDiagnosticsById,
  );
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
