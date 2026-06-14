import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScenarioChunkPromotionVisualMetricDetails,
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
      primaryTotalFeatureCount: 6,
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
  assert.equal(result.selectedByteCountSum, 8);
  assert.equal(result.selectedEstimatedPathCostSum, 9);
  assert.equal(result.changedLayerCount, 2);
  assert.equal(result.promotionVersion, 14);
  assert.equal(result.synchronizedSecondaryRegionIndexes, true);
});

