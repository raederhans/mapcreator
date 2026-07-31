import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MODULE_PATH = "../js/core/state/actions/renderer_exact_refresh_actions.js";
const SOURCE_PATH = new URL(MODULE_PATH, import.meta.url);

async function loadActions() {
  try {
    return await import(MODULE_PATH);
  } catch (error) {
    assert.fail(`renderer exact refresh actions must exist: ${error?.message || error}`);
  }
}

function createIdentity(overrides = {}) {
  return Object.freeze({
    scenarioId: "tno",
    selectionVersion: 7,
    topologyRevision: 11,
    dpr: 1.25,
    pixelWidth: 1600,
    pixelHeight: 900,
    colorRevision: 13,
    contextFlagSignature: "context:visible",
    zoomToken: 17,
    transformBucket: "125:2:-1",
    ...overrides,
  });
}

test("renderer exact refresh actions are import-free and expose target-first state functions", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);

  const exportNames = [...source.matchAll(/export function\s+(\w+)\s*\(\s*([^,\s)]+)/g)]
    .map((match) => [match[1], match[2]]);
  assert.deepEqual(exportNames, [
    ["ensureExactAfterSettleControllerState", "target"],
    ["resetExactAfterSettleControllerState", "target"],
    ["isExactAfterSettleGenerationCurrentState", "target"],
    ["isExactAfterSettleControllerActiveState", "target"],
    ["refreshExactAfterSettleControllerIdentityState", "target"],
    ["beginExactAfterSettleControllerScheduleState", "target"],
    ["beginExactAfterSettleControllerApplyState", "target"],
    ["replaceExactAfterSettlePendingPlanState", "target"],
    ["completeExactAfterSettleControllerApplyState", "target"],
    ["beginExactAfterSettleControllerFinalizeState", "target"],
    ["setDeferExactAfterSettleState", "target"],
    ["setPendingExactPoliticalFastFrameState", "target"],
    ["setExactAfterSettleHandleState", "target"],
  ]);
});

test("renderer exact refresh actions reject invalid targets", async () => {
  const actions = await loadActions();
  for (const target of [null, undefined, [], "state"]) {
    assert.throws(
      () => actions.ensureExactAfterSettleControllerState(target),
      /target must be an object/,
    );
    assert.throws(
      () => actions.setDeferExactAfterSettleState(target, true),
      /target must be an object/,
    );
    assert.throws(
      () => actions.setPendingExactPoliticalFastFrameState(target, true),
      /target must be an object/,
    );
    assert.throws(
      () => actions.setExactAfterSettleHandleState(target, null),
      /target must be an object/,
    );
  }
});

test("ensure and reset preserve controller object identity and exact reset semantics", async () => {
  const {
    ensureExactAfterSettleControllerState,
    resetExactAfterSettleControllerState,
  } = await loadActions();
  const controller = { generation: 4, phase: "applying", customField: "drop" };
  const target = { exactAfterSettleController: controller };

  assert.equal(ensureExactAfterSettleControllerState(target), true);
  assert.equal(controller.phase, "applying");
  assert.equal(controller.pendingPlan, null);
  assert.equal(resetExactAfterSettleControllerState(target, {
    reason: "cancel",
    generation: 3,
  }), false);
  assert.equal(controller.phase, "applying");

  assert.equal(resetExactAfterSettleControllerState(target, {
    reason: "cancel",
    generation: 4,
  }), true);
  assert.equal(target.exactAfterSettleController, controller);
  assert.deepEqual(controller, {
    generation: 5,
    phase: "idle",
    startedAt: 0,
    scheduledAt: 0,
    applyStartedAt: 0,
    applyFinishedAt: 0,
    scenarioId: "",
    selectionVersion: 0,
    topologyRevision: 0,
    dpr: 1,
    pixelWidth: 0,
    pixelHeight: 0,
    colorRevision: 0,
    contextFlagSignature: "",
    zoomToken: 0,
    transformBucket: "",
    pendingPlan: null,
    reason: "cancel",
    customField: "drop",
  });
});

test("scheduled state resets stale fields, advances generation, and copies frozen identity values", async () => {
  const { beginExactAfterSettleControllerScheduleState } = await loadActions();
  const controller = {
    generation: 8,
    pendingPlan: { stale: true },
    applyFinishedAt: 99,
    customField: "drop",
  };
  const target = { exactAfterSettleController: controller };
  const identity = createIdentity();

  assert.equal(
    beginExactAfterSettleControllerScheduleState(target, {
      scheduleStartedAt: 41.5,
      identity,
    }),
    9,
  );
  assert.equal(target.exactAfterSettleController, controller);
  assert.equal(controller.generation, 9);
  assert.equal(controller.phase, "scheduled");
  assert.equal(controller.startedAt, 41.5);
  assert.equal(controller.scheduledAt, 41.5);
  assert.equal(controller.applyStartedAt, 0);
  assert.equal(controller.pendingPlan, null);
  assert.equal(controller.reason, "scheduled");
  assert.equal(controller.scenarioId, identity.scenarioId);
  assert.equal(controller.selectionVersion, identity.selectionVersion);
  assert.equal(controller.dpr, identity.dpr);
  assert.equal(controller.transformBucket, identity.transformBucket);
  assert.equal(Object.hasOwn(controller, "customField"), true);
  assert.equal(identity.scenarioId, "tno");
});

test("applying, plan replacement, awaiting-paint, and finalizing isolate pending plan state", async () => {
  const {
    beginExactAfterSettleControllerApplyState,
    beginExactAfterSettleControllerFinalizeState,
    beginExactAfterSettleControllerScheduleState,
    completeExactAfterSettleControllerApplyState,
    replaceExactAfterSettlePendingPlanState,
  } = await loadActions();
  const target = {};
  const identity = createIdentity();
  const referenceTransform = { x: 10, y: 20, k: 2 };
  const currentTransform = { x: 12, y: 23, k: 2.5 };
  const plan = Object.freeze({
    id: "exact-plan",
    exactTargetPasses: Object.freeze(["political"]),
    deferredExactTargetPasses: Object.freeze(["contextBase"]),
    reuseDecision: Object.freeze({
      enabled: true,
      referenceTransform,
      currentTransform,
    }),
  });
  const generation = beginExactAfterSettleControllerScheduleState(target, {
    scheduleStartedAt: 10,
    identity,
  });
  const controller = target.exactAfterSettleController;

  assert.equal(beginExactAfterSettleControllerApplyState(target, {
    generation: generation + 1,
    plan,
    applyStartedAt: 20,
    identity,
  }), false);
  assert.equal(controller.phase, "scheduled");

  assert.equal(beginExactAfterSettleControllerApplyState(target, {
    generation,
    plan,
    applyStartedAt: 20,
    identity,
  }), true);
  assert.equal(controller.phase, "applying");
  assert.notEqual(controller.pendingPlan, plan);
  assert.deepEqual(controller.pendingPlan, plan);
  assert.notEqual(controller.pendingPlan.exactTargetPasses, plan.exactTargetPasses);
  assert.notEqual(controller.pendingPlan.reuseDecision, plan.reuseDecision);
  assert.notEqual(
    controller.pendingPlan.reuseDecision.referenceTransform,
    referenceTransform,
  );
  assert.notEqual(
    controller.pendingPlan.reuseDecision.currentTransform,
    currentTransform,
  );
  referenceTransform.x = 99;
  currentTransform.k = 9;
  assert.equal(controller.pendingPlan.reuseDecision.referenceTransform.x, 10);
  assert.equal(controller.pendingPlan.reuseDecision.currentTransform.k, 2.5);
  assert.equal(controller.applyStartedAt, 20);
  assert.equal(controller.reason, "applying");

  const appliedPlan = {
    ...plan,
    controllerGeneration: generation,
    exactTargetPasses: ["political", "borders"],
  };
  assert.equal(replaceExactAfterSettlePendingPlanState(target, {
    generation: generation + 1,
    plan: appliedPlan,
  }), false);
  assert.equal(replaceExactAfterSettlePendingPlanState(target, {
    generation,
    plan: appliedPlan,
  }), true);
  assert.notEqual(controller.pendingPlan, appliedPlan);
  assert.deepEqual(controller.pendingPlan, appliedPlan);
  appliedPlan.exactTargetPasses.push("labels");
  assert.deepEqual(
    controller.pendingPlan.exactTargetPasses,
    ["political", "borders"],
  );

  assert.equal(completeExactAfterSettleControllerApplyState(target, {
    generation,
    applyFinishedAt: 30,
  }), true);
  assert.equal(controller.phase, "awaiting-paint");
  assert.notEqual(controller.pendingPlan, appliedPlan);
  assert.deepEqual(controller.pendingPlan.exactTargetPasses, ["political", "borders"]);
  assert.equal(controller.applyFinishedAt, 30);
  assert.equal(controller.reason, "awaiting-paint");

  assert.equal(beginExactAfterSettleControllerFinalizeState(target, generation), true);
  assert.equal(controller.phase, "finalizing");
  assert.deepEqual(controller.pendingPlan.exactTargetPasses, ["political", "borders"]);
  assert.equal(controller.reason, "finalizing");
  assert.equal(beginExactAfterSettleControllerFinalizeState(target, generation), false);
});

test("identity refresh copies exact values without retaining or mutating the frozen source", async () => {
  const {
    ensureExactAfterSettleControllerState,
    refreshExactAfterSettleControllerIdentityState,
  } = await loadActions();
  const target = {};
  const identity = createIdentity({ dpr: 0.75, pixelWidth: 0 });
  assert.equal(ensureExactAfterSettleControllerState(target), true);
  const controller = target.exactAfterSettleController;

  assert.equal(refreshExactAfterSettleControllerIdentityState(target, identity), true);
  for (const [key, value] of Object.entries(identity)) {
    assert.equal(controller[key], value);
  }
  assert.equal(Object.isFrozen(identity), true);
  assert.equal(Object.hasOwn(controller, "identity"), false);
});

test("active and generation reads match scheduled through finalizing controller semantics", async () => {
  const {
    isExactAfterSettleControllerActiveState,
    isExactAfterSettleGenerationCurrentState,
  } = await loadActions();
  const target = { exactAfterSettleController: { generation: 3, phase: "idle" } };

  assert.equal(isExactAfterSettleControllerActiveState(target), false);
  for (const phase of ["scheduled", "applying", "awaiting-paint", "finalizing"]) {
    target.exactAfterSettleController.phase = phase;
    assert.equal(isExactAfterSettleControllerActiveState(target), true);
    assert.equal(isExactAfterSettleGenerationCurrentState(target, 3, phase), true);
  }
  assert.equal(isExactAfterSettleGenerationCurrentState(target, 4, "finalizing"), false);
  assert.equal(isExactAfterSettleGenerationCurrentState(target, 3, "scheduled"), false);
});

test("flags normalize to booleans and handle state preserves exact references including null", async () => {
  const {
    setDeferExactAfterSettleState,
    setExactAfterSettleHandleState,
    setPendingExactPoliticalFastFrameState,
  } = await loadActions();
  const target = {
    deferExactAfterSettle: false,
    pendingExactPoliticalFastFrame: true,
  };
  const handle = Object.freeze({ type: "timeout", id: { timer: 1 } });

  assert.equal(setDeferExactAfterSettleState(target, "queued"), true);
  assert.equal(target.deferExactAfterSettle, true);
  assert.equal(target.pendingExactPoliticalFastFrame, true);
  assert.equal(setPendingExactPoliticalFastFrameState(target, 0), false);
  assert.equal(target.pendingExactPoliticalFastFrame, false);
  assert.equal(target.deferExactAfterSettle, true);

  assert.equal(setExactAfterSettleHandleState(target, handle), handle);
  assert.equal(target.exactAfterSettleHandle, handle);
  assert.equal(setExactAfterSettleHandleState(target, null), null);
  assert.equal(target.exactAfterSettleHandle, null);
  assert.equal(Object.isFrozen(handle), true);
});
