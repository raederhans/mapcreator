// Canonical renderer interaction-state mutations.
// Event handling, render scheduling, metrics, and async recovery work stay in composition roots.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[renderer_interaction_actions] target must be an object");
  }
}

function normalizeRecoveryTaskKey(taskKey) {
  return String(taskKey || "interaction-recovery").trim() || "interaction-recovery";
}

export function setZoomGestureStartTransformState(target, transform = null) {
  assertStateTarget(target);
  target.zoomGestureStartTransform = transform;
  return transform;
}

export function setZoomGestureScaleDeltaState(target, scaleDelta) {
  assertStateTarget(target);
  target.zoomGestureScaleDelta = scaleDelta;
  return scaleDelta;
}

export function setPendingZoomTransformState(target, transform = null) {
  assertStateTarget(target);
  target.pendingZoomTransform = transform;
  return transform;
}

export function setZoomRenderScheduledState(target, scheduled) {
  assertStateTarget(target);
  const nextScheduled = Boolean(scheduled);
  target.zoomRenderScheduled = nextScheduled;
  return nextScheduled;
}

export function setZoomGestureEndedAtState(target, endedAt) {
  assertStateTarget(target);
  target.zoomGestureEndedAt = endedAt;
  return endedAt;
}

export function beginInteractionRecoveryTaskState(
  target,
  {
    taskKey = "interaction-recovery",
    startedAt = 0,
    expectedActiveTaskKey = "",
  } = {},
) {
  assertStateTarget(target);
  const activeTaskKey = String(
    target.activeInteractionRecoveryTaskKey || "",
  );
  if (activeTaskKey !== String(expectedActiveTaskKey || "")) {
    return false;
  }
  target.activeInteractionRecoveryTaskKey = normalizeRecoveryTaskKey(taskKey);
  target.activeInteractionRecoveryTaskStartedAt = startedAt;
  return true;
}

export function endInteractionRecoveryTaskState(target, expectedTaskKey) {
  assertStateTarget(target);
  if (
    target.activeInteractionRecoveryTaskKey
    !== normalizeRecoveryTaskKey(expectedTaskKey)
  ) {
    return false;
  }
  target.activeInteractionRecoveryTaskKey = "";
  target.activeInteractionRecoveryTaskStartedAt = 0;
  return true;
}

export function setInteractionInfrastructureStateFields(
  target,
  stage,
  {
    ready = null,
    inFlight = null,
  } = {},
) {
  assertStateTarget(target);
  const normalizedStage = String(stage || "idle").trim() || "idle";
  target.interactionInfrastructureStage = normalizedStage;
  if (ready != null) {
    target.interactionInfrastructureReady = Boolean(ready);
  }
  if (inFlight != null) {
    target.interactionInfrastructureBuildInFlight = Boolean(inFlight);
  }
  return normalizedStage;
}
