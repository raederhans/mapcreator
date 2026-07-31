// Canonical renderer phase-state mutations.
// Timers, scheduling, rendering, metrics, and lifecycle ordering stay in composition roots.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[renderer_phase_actions] target must be an object");
  }
}

export function setRenderPhaseTimerIdState(target, timerId = null) {
  assertStateTarget(target);
  target.renderPhaseTimerId = timerId;
  return timerId;
}

export function setRenderPhaseValueState(target, phase) {
  assertStateTarget(target);
  target.renderPhase = phase;
  return phase;
}

export function setPhaseEnteredAtState(target, enteredAt) {
  assertStateTarget(target);
  target.phaseEnteredAt = enteredAt;
  return enteredAt;
}

export function setRendererIsInteractingState(target, isInteracting) {
  assertStateTarget(target);
  const nextIsInteracting = Boolean(isInteracting);
  target.isInteracting = nextIsInteracting;
  return nextIsInteracting;
}

export function setPendingDayNightRefreshState(target, pending) {
  assertStateTarget(target);
  const nextPending = Boolean(pending);
  target.pendingDayNightRefresh = nextPending;
  return nextPending;
}

export function setAdaptiveSettleProfileState(target, settleProfile = null) {
  assertStateTarget(target);
  target.adaptiveSettleProfile = settleProfile;
  return settleProfile;
}

export function commitRendererDprStageState(
  target,
  {
    stage,
    switchedAt,
  } = {},
) {
  assertStateTarget(target);
  target.dprStage = stage;
  target.dprLastStageSwitchAt = switchedAt;
  return stage;
}
