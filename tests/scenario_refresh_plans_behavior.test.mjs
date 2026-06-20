import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
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
  assert.deepEqual(plan.renderer, {
    kind: "RendererRefreshPlan",
    source: "scenario-chunk-promotion",
    targetPasses: [],
    refreshOpeningOwnerBorders: true,
    resetWaterCacheReason: "",
  });
  assert.equal(getRendererRefreshPlan(plan), plan.renderer);
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
  assert.deepEqual(
    normalizeRendererRefreshPlan({
      targetPasses: [" political ", "political", "", null, "labels"],
      refreshOpeningOwnerBorders: false,
    }, {
      source: "default-source",
      targetPasses: ["background"],
      resetWaterCacheReason: "water-default",
    }),
    {
      source: "default-source",
      targetPasses: ["political", "labels"],
      refreshOpeningOwnerBorders: false,
      resetWaterCacheReason: "water-default",
    },
  );
});
