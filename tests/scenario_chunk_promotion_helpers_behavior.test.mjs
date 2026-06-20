import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScenarioChunkPromotionVisualMetricDetails,
  createDrawSubsetIndex,
  isDrawSubsetIndexCurrent,
  resolveScenarioChunkPromotionChangeSet,
} from "../js/core/renderer/scenario_chunk_promotion_helpers.js";

test("scenario chunk promotion change set treats atlantropa as water and political change", () => {
  const result = resolveScenarioChunkPromotionChangeSet({
    changedLayerKeys: ["scenario_atlantropa"],
    politicalFeatureIds: [],
    hasPoliticalPayloadChange: false,
  });

  assert.deepEqual(result.normalizedChangedLayerKeys, ["scenario_atlantropa"]);
  assert.equal(result.hasAtlantropaLayerChange, true);
  assert.equal(result.hasPoliticalChange, true);
  assert.deepEqual(result.effectiveChangedLayerKeys, ["scenario_atlantropa", "water"]);
});
test("scenario chunk promotion visual metrics preserve feature and backlog counts", () => {
  const result = buildScenarioChunkPromotionVisualMetricDetails({
    activeScenarioId: "demo",
    reason: "promotion",
    runtimeChunkLoadState: { selectionVersion: 7, promotionRetryCount: 2 },
    pendingVisualPromotion: {
      selectionVersion: 8,
      requiredChunkIds: ["a", "b"],
      selectedVisibleFeatureCountSum: 3,
      selectedPoliticalFeatureCountSum: 4,
      selectedPoliticalVisibleFeatureCountSum: 5,
      primaryTotalFeatureCount: 16,
      primaryVisibleFeatureCount: 7,
      selectedByteCountSum: 8,
      selectedEstimatedPathCostSum: 9,
    },
    pendingPromotion: { requiredPoliticalChunkCount: 10 },
    promotionQueuedAt: 100,
    startedAt: 125,
    suppressRender: true,
    hasPoliticalChange: true,
    promotedTotalFeatureCount: 11,
    promotedPrimaryFeatureCount: 12,
    promotedVisibleFeatureCount: 13,
    effectiveChangedLayerKeys: ["political", "water"],
    promotionVersion: 14,
    synchronizedSecondaryRegionIndexes: true,
  });

  assert.equal(result.activeScenarioId, "demo");
  assert.equal(result.selectionVersion, 8);
  assert.equal(result.requiredChunkCount, 2);
  assert.equal(result.requiredPoliticalChunkCount, 10);
  assert.equal(result.queueMs, 25);
  assert.equal(result.promotionRetryCount, 2);
  assert.equal(result.renderNow, false);
  assert.equal(result.hasPoliticalGeometryChange, true);
  assert.equal(result.promotedTotalFeatureCount, 11);
  assert.equal(result.promotedPrimaryFeatureCount, 12);
  assert.equal(result.promotedVisibleFeatureCount, 13);
  assert.equal(result.fullPoliticalPayloadFeatureCount, 11);
  assert.equal(result.primaryTotalFeatureCount, 16);
  assert.equal(result.viewportVisibleSubsetFeatureCount, 7);
  assert.equal(result.primaryVisibleIsSubset, true);
  assert.equal(result.promotedVisibleIsSubset, false);
  assert.equal(result.selectedByteCountSum, 8);
  assert.equal(result.selectedEstimatedPathCostSum, 9);
  assert.equal(result.changedLayerCount, 2);
  assert.equal(result.promotionVersion, 14);
  assert.equal(result.synchronizedSecondaryRegionIndexes, true);
});

test("scenario chunk promotion visual metrics preserve zero visible subset counts", () => {
  const result = buildScenarioChunkPromotionVisualMetricDetails({
    pendingVisualPromotion: {
      primaryTotalFeatureCount: 12,
      primaryVisibleFeatureCount: 0,
      selectedPoliticalVisibleFeatureCountSum: 0,
    },
    promotedTotalFeatureCount: 42,
    promotedPrimaryFeatureCount: 12,
    promotedVisibleFeatureCount: 0,
  });

  assert.equal(result.primaryTotalFeatureCount, 12);
  assert.equal(result.primaryVisibleFeatureCount, 0);
  assert.equal(result.fullPoliticalPayloadFeatureCount, 42);
  assert.equal(result.viewportVisibleSubsetFeatureCount, 0);
  assert.equal(result.primaryVisibleIsSubset, true);
  assert.equal(result.promotedVisibleIsSubset, true);
});

test("draw subset index returns null for empty subset input", () => {
  assert.equal(createDrawSubsetIndex({
    scenarioId: "demo",
    scenarioDataGeneration: 2,
    primaryDrawFeatureIds: ["", null],
    visibleFeatureIndexesByChunkId: { a: [] },
  }), null);
});

test("draw subset index de-duplicates ids and reports rejected entries", () => {
  const result = createDrawSubsetIndex({
    scenarioId: "demo",
    scenarioDataGeneration: 3,
    subsetSignature: "viewport-a",
    primaryDrawFeatureIds: [" a ", "b", "a", "missing"],
    visibleFeatureIndexesByChunkId: {
      chunkA: [0, 2, 2, 9, -1, 1.5],
      chunkB: [1],
    },
    knownFeatureIds: ["a", "b"],
    chunkFeatureCounts: { chunkA: 3, chunkB: 2 },
  });

  assert.deepEqual(result.primaryDrawFeatureIds, ["a", "b"]);
  assert.deepEqual(result.visibleFeatureIndexesByChunkId, {
    chunkA: [0, 2],
    chunkB: [1],
  });
  assert.deepEqual(result.diagnostics, {
    duplicateFeatureIdCount: 1,
    unknownFeatureIdCount: 1,
    duplicateIndexCount: 1,
    outOfRangeIndexCount: 3,
  });
});

test("draw subset index rejects indexes for known empty chunks", () => {
  const result = createDrawSubsetIndex({
    scenarioId: "demo",
    scenarioDataGeneration: 3,
    visibleFeatureIndexesByChunkId: {
      emptyChunk: [0],
      unknownCountChunk: [0],
    },
    chunkFeatureCounts: { emptyChunk: 0 },
  });

  assert.deepEqual(result.visibleFeatureIndexesByChunkId, {
    unknownCountChunk: [0],
  });
  assert.equal(result.diagnostics.outOfRangeIndexCount, 1);
});

test("draw subset index currentness is bound to scenario and data generation", () => {
  const result = createDrawSubsetIndex({
    scenarioId: "demo",
    scenarioDataGeneration: 4,
    primaryDrawFeatureIds: ["a"],
  });

  assert.equal(isDrawSubsetIndexCurrent(result, { scenarioId: "demo", scenarioDataGeneration: 4 }), true);
  assert.equal(isDrawSubsetIndexCurrent(result, { scenarioId: "other", scenarioDataGeneration: 4 }), false);
  assert.equal(isDrawSubsetIndexCurrent(result, { scenarioId: "demo", scenarioDataGeneration: 5 }), false);
  assert.equal(isDrawSubsetIndexCurrent(null, { scenarioId: "demo", scenarioDataGeneration: 4 }), false);
});
