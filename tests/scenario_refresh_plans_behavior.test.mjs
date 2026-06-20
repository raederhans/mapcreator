import test from "node:test";
import assert from "node:assert/strict";
import {
  createFrameGraphInvalidation,
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
  getTargetResourcesForPasses,
  getRendererRefreshPlan,
  getScenarioChunkPromotionTargetPasses,
  normalizeRendererRefreshPlan,
} from "../js/core/map_renderer/scenario_refresh_plans.js";

test("scenario apply refresh plan declares complete baseline render passes", () => {
  const plan = createScenarioApplyRefreshPlan({ refreshOpeningOwnerBorders: false });

  assert.equal(plan.kind, "ScenarioRefreshPlan");
  assert.equal(plan.source, "scenario-apply");
  assert.deepEqual(plan.changedLayerKeys, []);
  assert.deepEqual(plan.renderer, {
    kind: "RendererRefreshPlan",
    source: "scenario-apply",
    targetPasses: [
      "background",
      "physicalBase",
      "political",
      "contextBase",
      "contextScenario",
      "dayNight",
      "borders",
      "labels",
    ],
    refreshOpeningOwnerBorders: false,
    resetWaterCacheReason: "scenario-switch-complete",
  });
});

test("chunk promotion plan normalizes layer keys and carries opening border policy", () => {
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys: [" Water ", "water", "CITIES", "", null],
    hasPoliticalChange: true,
  });

  assert.equal(plan.kind, "ScenarioRefreshPlan");
  assert.equal(plan.source, "scenario-chunk-promotion");
  assert.deepEqual(plan.changedLayerKeys, ["water", "cities"]);
  assert.equal(plan.renderer.kind, "RendererRefreshPlan");
  assert.equal(plan.renderer.source, "scenario-chunk-promotion");
  assert.deepEqual(plan.renderer.targetPasses, []);
  assert.equal(plan.renderer.refreshOpeningOwnerBorders, true);
  assert.equal(plan.renderer.resetWaterCacheReason, "");
  assert.deepEqual(plan.renderer.frameGraphInvalidation.targetPasses, [
    "political",
    "contextBase",
    "contextMarkers",
    "borders",
    "labels",
    "contextScenario",
    "dayNight",
  ]);
  assert.deepEqual(plan.renderer.frameGraphInvalidation.targetResources, [
    "politicalBaseBuffer",
    "hitIndex",
    "contextBaseBuffer",
    "contextMarkersBuffer",
    "borderBuffer",
    "interactionOverlay",
    "labelBuffer",
    "contextScenarioBuffer",
    "dayNightBuffer",
  ]);
  assert.equal(getRendererRefreshPlan(plan), plan.renderer);
});

test("frame graph invalidation separates data, visible render, and interaction authority layers", () => {
  const invalidation = createFrameGraphInvalidation({
    reason: "promotion",
    dataRevisionLayers: [" political ", "political", "WATER"],
    renderVisibleLayers: ["cities"],
    interactionAuthorityLayers: ["scenario_atlantropa"],
    targetPasses: ["political", "labels"],
    clearLastGoodFrame: true,
    clearReferenceTransforms: true,
    clearPartialPoliticalDirtyIds: true,
    resetWaterCacheReason: "water-reset",
    clearOpeningOwnerBorderCache: true,
    clearInteractionComposite: true,
  });

  assert.deepEqual(invalidation, {
    kind: "FrameGraphInvalidation",
    reason: "promotion",
    dataRevisionLayers: ["political", "water"],
    renderVisibleLayers: ["cities"],
    interactionAuthorityLayers: ["scenario_atlantropa"],
    targetResources: ["politicalBaseBuffer", "hitIndex", "labelBuffer"],
    targetPasses: ["political", "labels"],
    clearLastGoodFrame: true,
    clearReferenceTransforms: true,
    clearPartialPoliticalDirtyIds: true,
    resetWaterCacheReason: "water-reset",
    clearOpeningOwnerBorderCache: true,
    clearInteractionComposite: true,
  });
});

test("chunk promotion frame graph target passes stay equivalent to legacy fan-out", () => {
  const changedLayerKeys = ["strategicvalues", "scenario_atlantropa"];
  const legacyTargetPasses = getScenarioChunkPromotionTargetPasses({
    changedLayerKeys,
    hasPoliticalChange: false,
  });
  const plan = createScenarioChunkPromotionRefreshPlan({
    changedLayerKeys,
    hasPoliticalChange: false,
  });

  assert.deepEqual(plan.renderer.targetPasses, []);
  assert.deepEqual(plan.renderer.frameGraphInvalidation.targetPasses, legacyTargetPasses);
  assert.deepEqual(
    plan.renderer.frameGraphInvalidation.targetResources,
    getTargetResourcesForPasses(legacyTargetPasses),
  );
});

test("chunk promotion target passes stay unique across political and layer changes", () => {
  assert.deepEqual(
    getScenarioChunkPromotionTargetPasses({
      hasPoliticalChange: true,
      changedLayerKeys: ["cities", "water", "special", "relief", "scenario_atlantropa"],
    }),
    ["political", "contextBase", "contextMarkers", "borders", "labels", "dayNight", "contextScenario"],
  );
});

test("strategic values chunk promotion refreshes political and marker passes", () => {
  assert.deepEqual(
    getScenarioChunkPromotionTargetPasses({
      hasPoliticalChange: false,
      changedLayerKeys: ["strategicvalues"],
    }),
    ["political", "contextMarkers", "labels"],
  );
});

test("renderer refresh plan normalization applies defaults and trims pass names", () => {
  const frameGraphInvalidation = createFrameGraphInvalidation({
    reason: "normalize",
    targetPasses: ["political"],
  });

  assert.deepEqual(
    normalizeRendererRefreshPlan({
      targetPasses: [" political ", "political", "", null, "labels"],
      frameGraphInvalidation,
      refreshOpeningOwnerBorders: false,
    }, {
      source: "default-source",
      targetPasses: ["background"],
      resetWaterCacheReason: "water-default",
    }),
    {
      source: "default-source",
      targetPasses: ["political", "labels"],
      frameGraphInvalidation,
      refreshOpeningOwnerBorders: false,
      resetWaterCacheReason: "water-default",
    },
  );
});
