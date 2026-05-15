export function deriveRuntimePrimaryFeaturePayload({
  feature,
  id,
  canvasWidth = 1,
  canvasHeight = 1,
  projectedBoundsCache = null,
  computeProjectedFeatureBounds = () => null,
  shouldSkipFeature = () => false,
  getResolvedFeatureColor = () => null,
} = {}) {
  const bounds = computeProjectedFeatureBounds(feature);
  if (bounds && projectedBoundsCache?.set) {
    projectedBoundsCache.set(id, bounds);
  }
  // 颜色解析必须与视口剔除解耦：resolved color map 要覆盖全部 feature，
  // 否则当前视口外/边缘被 shouldSkipFeature 剔除的 feature 没有颜色，
  // 政治层把它们画成透明（黑洞），且会随缩放视口变化反复出现。
  // skipped 只表达"是否进交互空间网格"，颜色照常计算。
  const skipped = shouldSkipFeature(feature, canvasWidth, canvasHeight, { forceProd: true });
  return {
    bounds,
    resolvedColor: getResolvedFeatureColor(feature, id) || null,
    skipped,
  };
}

export function createSpatialIndexPerfPayload({
  landCount = 0,
  spatialItems = 0,
  waterItems = 0,
  specialItems = 0,
  skipped = false,
  chunked,
} = {}) {
  const payload = {
    landCount: Number(landCount) || 0,
    spatialItems: Number(spatialItems) || 0,
    waterItems: Number(waterItems) || 0,
    specialItems: Number(specialItems) || 0,
    skipped: !!skipped,
  };
  if (typeof chunked === 'boolean') {
    payload.chunked = chunked;
  }
  return payload;
}