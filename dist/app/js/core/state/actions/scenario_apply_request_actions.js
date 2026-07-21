// Canonical request-identity mutations for scenario apply ownership.
// Promise handles, queue ownership, diagnostics, and UI synchronization stay in scenario_manager.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_apply_request_actions] target must be an object");
  }
}

function normalizeRequestId(value) {
  return Math.max(0, Number(value) || 0);
}

function normalizeTargetId(value) {
  return String(value || "").trim();
}

export function setLatestScenarioApplyRequestState(
  target,
  { requestId = 0, targetId = "" } = {},
) {
  assertStateTarget(target);
  const nextRequestId = normalizeRequestId(requestId);
  const nextTargetId = normalizeTargetId(targetId);
  target.latestScenarioApplyRequestId = nextRequestId;
  target.latestScenarioApplyTargetId = nextTargetId;
  return nextRequestId;
}

export function beginScenarioApplyRequestState(
  target,
  { requestId = 0, targetId = "" } = {},
) {
  assertStateTarget(target);
  const nextRequestId = normalizeRequestId(requestId);
  const nextTargetId = normalizeTargetId(targetId);
  target.scenarioApplyInFlight = true;
  target.currentScenarioApplyRequestId = nextRequestId;
  target.currentScenarioApplyTargetId = nextTargetId;
  target.scenarioApplyActiveRequestId = nextRequestId;
  target.scenarioApplyActiveTargetId = nextTargetId;
  return nextRequestId;
}

export function clearActiveScenarioApplyRequestState(target) {
  assertStateTarget(target);
  target.scenarioApplyInFlight = false;
  target.scenarioApplyActiveRequestId = 0;
  target.scenarioApplyActiveTargetId = "";
  return false;
}
