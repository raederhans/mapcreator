export function deriveRuntimePrimaryFeaturePayload({
  feature,
  id,
  canvasWidth = 1,
  canvasHeight = 1,
  projectedBoundsCache = null,
  computeProjectedFeatureBounds = () => null,
  shouldSkipFeature = () => false,
} = {}) {
  const bounds = computeProjectedFeatureBounds(feature);
  if (bounds && projectedBoundsCache?.set) {
    projectedBoundsCache.set(id, bounds);
  }
  // Primary payload stays limited to geometry/index state; resolved colors are
  // rebuilt by map_renderer.js without viewport culling.
  const skipped = shouldSkipFeature(feature, canvasWidth, canvasHeight, { forceProd: true });
  return {
    bounds,
    skipped,
  };
}

export function createSpatialIndexPerfPayload({
  landCount = 0,
  spatialItems = 0,
  waterItems = 0,
  specialItems = 0,
  spatialGridCells = 0,
  spatialGridGlobals = 0,
  waterGridCells = 0,
  waterGridGlobals = 0,
  specialGridCells = 0,
  specialGridGlobals = 0,
  skipped = false,
  chunked,
} = {}) {
  const payload = {
    landCount: Number(landCount) || 0,
    spatialItems: Number(spatialItems) || 0,
    waterItems: Number(waterItems) || 0,
    specialItems: Number(specialItems) || 0,
    spatialGridCells: Number(spatialGridCells) || 0,
    spatialGridGlobals: Number(spatialGridGlobals) || 0,
    waterGridCells: Number(waterGridCells) || 0,
    waterGridGlobals: Number(waterGridGlobals) || 0,
    specialGridCells: Number(specialGridCells) || 0,
    specialGridGlobals: Number(specialGridGlobals) || 0,
    skipped: !!skipped,
  };
  if (typeof chunked === 'boolean') {
    payload.chunked = chunked;
  }
  return payload;
}
