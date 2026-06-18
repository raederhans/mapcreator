import test from "node:test";
import assert from "node:assert/strict";
import {
  createExactAfterSettleRefreshPlan,
  EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES,
  getExactAfterSettleDprRestorePasses,
  resolveDeferredExactContextTargetPasses,
  resolveExactAfterSettleTargetPasses,
} from "../js/core/map_renderer/exact_after_settle_refresh_plans.js";

const RENDER_PASSES = [
  "background",
  "physicalBase",
  "political",
  "hgoPreview",
  "contextBase",
  "contextScenario",
  "effects",
  "lineEffects",
  "contextMarkers",
  "dayNight",
  "borders",
  "textureLabels",
  "labels",
];

test("exact-after-settle plan records timing and refresh policy inputs", () => {
  const plan = createExactAfterSettleRefreshPlan({
    profile: { exactQuietWindowMs: 420 },
    scheduleStartedAt: 100,
    callbackStartedAt: 580,
    reuseDecision: { shouldExactRefresh: true, reason: "context-base-exact" },
    forceExactContextBaseRefresh: false,
    metricSequenceStartedAt: 9,
  });

  assert.equal(plan.exactRefreshApplied, true);
  assert.equal(plan.settleWindowElapsedMs, 480);
  assert.equal(plan.metricSequenceStartedAt, 9);
  assert.deepEqual(plan.exactTargetPasses, []);
  assert.deepEqual(plan.deferredExactTargetPasses, []);
});

test("DPR restore pass list keeps political invalidation explicit", () => {
  assert.deepEqual(
    getExactAfterSettleDprRestorePasses(["political", "contextBase", "political", "labels"]),
    ["contextBase", "labels"],
  );
});

test("target pass policy splits critical political work from deferred context passes", () => {
  const targetPasses = resolveExactAfterSettleTargetPasses({
    renderPassNames: RENDER_PASSES,
    idleRenderPassNames: RENDER_PASSES,
    dirtyPassNames: ["contextScenario", "effects"],
    physicalExactRefreshPasses: ["physicalBase", "political", "contextBase", "borders"],
    forceExactContextBaseRefresh: true,
    exactRefreshApplied: true,
  });

  assert.deepEqual(targetPasses.exactTargetPasses, ["physicalBase", "political", "effects", "borders"]);
  assert.deepEqual(targetPasses.deferredExactTargetPasses, ["contextBase", "contextScenario", "textureLabels", "labels"]);
});

test("deferred context target policy merges plan targets and newly dirty deferred passes", () => {
  const targetPasses = resolveDeferredExactContextTargetPasses({
    plan: { deferredExactTargetPasses: ["labels"] },
    dirtyPassNames: ["contextBase", "political", "labels"],
    idleRenderPassNames: RENDER_PASSES,
  });

  assert.deepEqual(targetPasses, ["contextBase", "labels"]);
});

test("deferred pass set excludes background and physical base", () => {
  assert.equal(EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES.has("contextBase"), true);
  assert.equal(EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES.has("contextScenario"), true);
  assert.equal(EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES.has("background"), false);
  assert.equal(EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES.has("physicalBase"), false);
});
