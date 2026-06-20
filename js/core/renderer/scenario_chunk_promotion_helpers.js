export function resolveScenarioChunkPromotionChangeSet({
  changedLayerKeys = [],
  politicalFeatureIds = [],
  hasPoliticalPayloadChange = false,
} = {}) {
  const normalizedChangedLayerKeys = (Array.isArray(changedLayerKeys) ? changedLayerKeys : [])
    .map((layerKey) => String(layerKey || "").trim().toLowerCase())
    .filter(Boolean);
  const hasAtlantropaLayerChange = normalizedChangedLayerKeys.includes("scenario_atlantropa");
  const hasPoliticalChange = !!hasPoliticalPayloadChange
    || hasAtlantropaLayerChange
    || (Array.isArray(politicalFeatureIds) && politicalFeatureIds.length > 0);
  const effectiveChangedLayerKeys = hasAtlantropaLayerChange
    ? Array.from(new Set([
      ...(Array.isArray(changedLayerKeys) ? changedLayerKeys : []),
      "water",
    ]))
    : changedLayerKeys;
  return {
    normalizedChangedLayerKeys,
    hasAtlantropaLayerChange,
    hasPoliticalChange,
    effectiveChangedLayerKeys,
  };
}

function toNonNegativeCount(value, defaultValue = 0) {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue >= 0) {
    return Math.max(0, numberValue);
  }
  return Math.max(0, Number(defaultValue) || 0);
}

function normalizeStringSet(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function createDrawSubsetIndex({
  scenarioId = "",
  scenarioDataGeneration = 0,
  subsetSignature = "",
  primaryDrawFeatureIds = null,
  visibleFeatureIndexesByChunkId = null,
  knownFeatureIds = null,
  chunkFeatureCounts = null,
} = {}) {
  const knownFeatureSet = knownFeatureIds instanceof Set
    ? knownFeatureIds
    : (Array.isArray(knownFeatureIds) ? new Set(normalizeStringSet(knownFeatureIds)) : null);
  const rawFeatureIds = Array.isArray(primaryDrawFeatureIds) ? primaryDrawFeatureIds : null;
  let duplicateFeatureIdCount = 0;
  let unknownFeatureIdCount = 0;
  const seenFeatureIds = new Set();
  const normalizedFeatureIds = [];
  if (rawFeatureIds) {
    rawFeatureIds.forEach((value) => {
      const featureId = String(value || "").trim();
      if (!featureId) return;
      if (seenFeatureIds.has(featureId)) {
        duplicateFeatureIdCount += 1;
        return;
      }
      seenFeatureIds.add(featureId);
      if (knownFeatureSet && !knownFeatureSet.has(featureId)) {
        unknownFeatureIdCount += 1;
        return;
      }
      normalizedFeatureIds.push(featureId);
    });
  }

  const normalizedIndexesByChunkId = {};
  let duplicateIndexCount = 0;
  let outOfRangeIndexCount = 0;
  const rawIndexesByChunkId = visibleFeatureIndexesByChunkId && typeof visibleFeatureIndexesByChunkId === "object"
    ? visibleFeatureIndexesByChunkId
    : null;
  if (rawIndexesByChunkId) {
    Object.entries(rawIndexesByChunkId).forEach(([chunkId, rawIndexes]) => {
      const normalizedChunkId = String(chunkId || "").trim();
      if (!normalizedChunkId || !Array.isArray(rawIndexes)) return;
      const hasKnownFeatureCount = Object.hasOwn(chunkFeatureCounts || {}, normalizedChunkId);
      const maxFeatureCount = hasKnownFeatureCount
        ? Math.max(0, Number(chunkFeatureCounts?.[normalizedChunkId] || 0))
        : 0;
      const seenIndexes = new Set();
      const indexes = [];
      rawIndexes.forEach((value) => {
        const index = Number(value);
        if (!Number.isInteger(index) || index < 0 || (hasKnownFeatureCount && index >= maxFeatureCount)) {
          outOfRangeIndexCount += 1;
          return;
        }
        if (seenIndexes.has(index)) {
          duplicateIndexCount += 1;
          return;
        }
        seenIndexes.add(index);
        indexes.push(index);
      });
      if (indexes.length) {
        normalizedIndexesByChunkId[normalizedChunkId] = indexes;
      }
    });
  }

  const hasFeatureIds = normalizedFeatureIds.length > 0;
  const hasChunkIndexes = Object.keys(normalizedIndexesByChunkId).length > 0;
  if (!hasFeatureIds && !hasChunkIndexes) return null;
  return {
    scenarioId: String(scenarioId || ""),
    scenarioDataGeneration: Math.max(0, Number(scenarioDataGeneration || 0)),
    subsetSignature: String(subsetSignature || ""),
    ...(hasFeatureIds ? { primaryDrawFeatureIds: normalizedFeatureIds } : {}),
    ...(hasChunkIndexes ? { visibleFeatureIndexesByChunkId: normalizedIndexesByChunkId } : {}),
    diagnostics: {
      duplicateFeatureIdCount,
      unknownFeatureIdCount,
      duplicateIndexCount,
      outOfRangeIndexCount,
    },
  };
}

export function isDrawSubsetIndexCurrent(drawSubsetIndex, {
  scenarioId = "",
  scenarioDataGeneration = 0,
} = {}) {
  if (!drawSubsetIndex || typeof drawSubsetIndex !== "object") return false;
  return String(drawSubsetIndex.scenarioId || "") === String(scenarioId || "")
    && Math.max(0, Number(drawSubsetIndex.scenarioDataGeneration || 0)) === Math.max(0, Number(scenarioDataGeneration || 0));
}

export function buildScenarioChunkPromotionVisualMetricDetails({
  activeScenarioId = "",
  reason = "scenario-chunk-promotion",
  runtimeChunkLoadState = null,
  pendingVisualPromotion = null,
  pendingPromotion = null,
  promotionQueuedAt = 0,
  startedAt = 0,
  suppressRender = false,
  hasPoliticalChange = false,
  promotedTotalFeatureCount = 0,
  promotedPrimaryFeatureCount = 0,
  promotedVisibleFeatureCount = 0,
  effectiveChangedLayerKeys = [],
  promotionVersion = 0,
  synchronizedSecondaryRegionIndexes = false,
} = {}) {
  const primaryTotalFeatureCount = toNonNegativeCount(
    pendingVisualPromotion?.primaryTotalFeatureCount ?? pendingPromotion?.primaryTotalFeatureCount,
    promotedTotalFeatureCount,
  );
  const primaryVisibleFeatureCount = toNonNegativeCount(
    pendingVisualPromotion?.primaryVisibleFeatureCount ?? pendingPromotion?.primaryVisibleFeatureCount,
    promotedPrimaryFeatureCount,
  );
  const fullPoliticalPayloadFeatureCount = toNonNegativeCount(promotedTotalFeatureCount);
  const viewportVisibleSubsetFeatureCount = toNonNegativeCount(primaryVisibleFeatureCount, promotedVisibleFeatureCount);
  return {
    activeScenarioId: String(activeScenarioId || ""),
    reason: String(reason || "scenario-chunk-promotion"),
    selectionVersion: Math.max(0, Number(pendingVisualPromotion?.selectionVersion || pendingPromotion?.selectionVersion || runtimeChunkLoadState?.selectionVersion || 0)),
    requiredPoliticalChunkCount: Math.max(0, Number(pendingPromotion?.requiredPoliticalChunkCount || 0)),
    requiredChunkCount: Array.isArray(pendingVisualPromotion?.requiredChunkIds)
      ? pendingVisualPromotion.requiredChunkIds.length
      : 0,
    queuedAt: promotionQueuedAt,
    queueMs: promotionQueuedAt > 0 ? Math.max(0, startedAt - promotionQueuedAt) : 0,
    promotionRetryCount: Math.max(0, Number(runtimeChunkLoadState?.promotionRetryCount || 0)),
    renderNow: !suppressRender,
    hasPoliticalGeometryChange: hasPoliticalChange,
    suppressRender: !!suppressRender,
    promotedFeatureCount: promotedTotalFeatureCount,
    promotedPrimaryFeatureCount,
    promotedVisibleFeatureCount,
    promotedTotalFeatureCount,
    selectedVisibleFeatureCountSum: Math.max(0, Number(pendingVisualPromotion?.selectedVisibleFeatureCountSum || pendingPromotion?.selectedVisibleFeatureCountSum || 0)),
    selectedPoliticalFeatureCountSum: Math.max(0, Number(pendingVisualPromotion?.selectedPoliticalFeatureCountSum || pendingPromotion?.selectedPoliticalFeatureCountSum || 0)),
    selectedPoliticalVisibleFeatureCountSum: Math.max(0, Number(pendingVisualPromotion?.selectedPoliticalVisibleFeatureCountSum || pendingPromotion?.selectedPoliticalVisibleFeatureCountSum || 0)),
    primaryTotalFeatureCount,
    primaryVisibleFeatureCount,
    fullPoliticalPayloadFeatureCount,
    viewportVisibleSubsetFeatureCount,
    primaryVisibleIsSubset: primaryTotalFeatureCount > 0 && primaryVisibleFeatureCount < primaryTotalFeatureCount,
    promotedVisibleIsSubset: fullPoliticalPayloadFeatureCount > 0 && toNonNegativeCount(promotedVisibleFeatureCount) < fullPoliticalPayloadFeatureCount,
    selectedByteCountSum: Math.max(0, Number(pendingVisualPromotion?.selectedByteCountSum || pendingPromotion?.selectedByteCountSum || 0)),
    selectedEstimatedPathCostSum: Math.max(0, Number(pendingVisualPromotion?.selectedEstimatedPathCostSum || pendingPromotion?.selectedEstimatedPathCostSum || 0)),
    changedLayerCount: Array.isArray(effectiveChangedLayerKeys) ? effectiveChangedLayerKeys.length : 0,
    promotionVersion,
    synchronizedSecondaryRegionIndexes,
  };
}
