import assert from "node:assert/strict";
import test from "node:test";

const MODULE_PATH = "../js/core/state/actions/renderer_interaction_actions.js";

async function loadActions() {
  try {
    return await import(MODULE_PATH);
  } catch (error) {
    assert.fail(`renderer interaction actions must exist: ${error?.message || error}`);
  }
}

test("renderer interaction actions reject invalid targets", async () => {
  const {
    beginInteractionRecoveryTaskState,
    setInteractionInfrastructureStateFields,
    setPendingZoomTransformState,
    setZoomGestureStartTransformState,
  } = await loadActions();

  for (const target of [null, undefined, [], "state"]) {
    assert.throws(() => setZoomGestureStartTransformState(target, null), /target must be an object/);
    assert.throws(() => setPendingZoomTransformState(target, null), /target must be an object/);
    assert.throws(() => beginInteractionRecoveryTaskState(target, {}), /target must be an object/);
    assert.throws(() => setInteractionInfrastructureStateFields(target, "idle"), /target must be an object/);
  }
});

test("zoom transform actions preserve object identity and explicit null", async () => {
  const {
    setPendingZoomTransformState,
    setZoomGestureStartTransformState,
  } = await loadActions();
  const target = { sentinel: "preserved" };
  const startTransform = { x: 1, y: 2, k: 3 };
  const pendingTransform = { x: 4, y: 5, k: 6 };

  assert.equal(setZoomGestureStartTransformState(target, startTransform), startTransform);
  assert.equal(target.zoomGestureStartTransform, startTransform);
  assert.equal(setPendingZoomTransformState(target, pendingTransform), pendingTransform);
  assert.equal(target.pendingZoomTransform, pendingTransform);
  assert.equal(setZoomGestureStartTransformState(target, null), null);
  assert.equal(setPendingZoomTransformState(target, null), null);
  assert.equal(target.zoomGestureStartTransform, null);
  assert.equal(target.pendingZoomTransform, null);
  assert.equal(target.sentinel, "preserved");
});

test("zoom scalar actions preserve values or normalize scheduled state", async () => {
  const {
    setZoomGestureEndedAtState,
    setZoomGestureScaleDeltaState,
    setZoomRenderScheduledState,
  } = await loadActions();
  const target = {};

  assert.equal(setZoomGestureScaleDeltaState(target, 1.25), 1.25);
  assert.equal(target.zoomGestureScaleDelta, 1.25);
  assert.equal(setZoomGestureEndedAtState(target, 98.5), 98.5);
  assert.equal(target.zoomGestureEndedAt, 98.5);
  assert.equal(setZoomRenderScheduledState(target, "scheduled"), true);
  assert.equal(target.zoomRenderScheduled, true);
  assert.equal(setZoomRenderScheduledState(target, 0), false);
  assert.equal(target.zoomRenderScheduled, false);
});

test("interaction recovery task uses an expected-key ownership fence", async () => {
  const {
    beginInteractionRecoveryTaskState,
    endInteractionRecoveryTaskState,
  } = await loadActions();
  const target = {
    activeInteractionRecoveryTaskKey: "",
    activeInteractionRecoveryTaskStartedAt: 0,
    sentinel: "preserved",
  };

  assert.equal(
    beginInteractionRecoveryTaskState(target, {
      taskKey: " cache-warmup ",
      startedAt: 41,
    }),
    true,
  );
  assert.equal(target.activeInteractionRecoveryTaskKey, "cache-warmup");
  assert.equal(target.activeInteractionRecoveryTaskStartedAt, 41);

  assert.equal(
    beginInteractionRecoveryTaskState(target, {
      taskKey: "other",
      startedAt: 99,
      expectedActiveTaskKey: "",
    }),
    false,
  );
  assert.equal(target.activeInteractionRecoveryTaskKey, "cache-warmup");
  assert.equal(target.activeInteractionRecoveryTaskStartedAt, 41);

  assert.equal(endInteractionRecoveryTaskState(target, "other"), false);
  assert.equal(target.activeInteractionRecoveryTaskKey, "cache-warmup");
  assert.equal(endInteractionRecoveryTaskState(target, " cache-warmup "), true);
  assert.equal(target.activeInteractionRecoveryTaskKey, "");
  assert.equal(target.activeInteractionRecoveryTaskStartedAt, 0);
  assert.equal(target.sentinel, "preserved");
});

test("interaction recovery treats an absent active task key as idle", async () => {
  const { beginInteractionRecoveryTaskState } = await loadActions();
  const target = {};

  assert.equal(
    beginInteractionRecoveryTaskState(target, {
      taskKey: "initial-build",
      startedAt: 7,
    }),
    true,
  );
  assert.equal(target.activeInteractionRecoveryTaskKey, "initial-build");
  assert.equal(target.activeInteractionRecoveryTaskStartedAt, 7);
});

test("interaction infrastructure preserves ready and in-flight fields for null options", async () => {
  const { setInteractionInfrastructureStateFields } = await loadActions();
  const target = {
    interactionInfrastructureStage: "idle",
    interactionInfrastructureReady: true,
    interactionInfrastructureBuildInFlight: true,
    sentinel: "preserved",
  };

  assert.equal(
    setInteractionInfrastructureStateFields(target, " basic-ready ", {
      ready: null,
      inFlight: null,
    }),
    "basic-ready",
  );
  assert.equal(target.interactionInfrastructureReady, true);
  assert.equal(target.interactionInfrastructureBuildInFlight, true);

  assert.equal(
    setInteractionInfrastructureStateFields(target, "", {
      ready: 0,
      inFlight: "building",
    }),
    "idle",
  );
  assert.equal(target.interactionInfrastructureStage, "idle");
  assert.equal(target.interactionInfrastructureReady, false);
  assert.equal(target.interactionInfrastructureBuildInFlight, true);
  assert.equal(target.sentinel, "preserved");
});
