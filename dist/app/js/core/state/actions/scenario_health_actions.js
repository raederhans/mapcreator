// Canonical scenario hydration/data-health state authority.
// Normalization, evaluation, retries, rendering, UI publication, and rollback
// sequencing remain in scenario state/read owners and composition roots.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_health_actions] target must be an object");
  }
}

export function captureScenarioHealthState(target) {
  assertStateTarget(target);
  return Object.freeze({
    values: Object.freeze({
      scenarioHydrationHealthGate: target.scenarioHydrationHealthGate,
      scenarioDataHealth: target.scenarioDataHealth,
    }),
  });
}

export function setScenarioHydrationHealthGateState(target, nextState = {}) {
  assertStateTarget(target);
  target.scenarioHydrationHealthGate = nextState;
  return nextState;
}

export function restoreScenarioHydrationHealthGateState(target, value) {
  assertStateTarget(target);
  target.scenarioHydrationHealthGate = value;
  return value;
}

export function setScenarioDataHealthState(
  target,
  nextState = {},
) {
  assertStateTarget(target);
  target.scenarioDataHealth = nextState;
  return nextState;
}

export function restoreScenarioDataHealthState(target, value) {
  assertStateTarget(target);
  target.scenarioDataHealth = value;
  return value;
}
