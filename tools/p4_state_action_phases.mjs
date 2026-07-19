export const P4_STATE_ACTION_PHASES = Object.freeze([
  "P4.0",
  "P4.1",
  "P4.2a",
  "P4.2b",
  "P4.2c",
  "P4.3",
  "P4.4",
  "P4.5a",
  "P4.5b",
]);

const P4_STATE_ACTION_PHASE_INDEX = new Map(
  P4_STATE_ACTION_PHASES.map((phase, index) => [phase, index]),
);

export function normalizeP4StateActionPhase(
  value = "P4.0",
  { defaultPhase = "P4.0" } = {},
) {
  const normalized = String(value || defaultPhase).trim();
  if (!P4_STATE_ACTION_PHASE_INDEX.has(normalized)) {
    throw new Error(`Unsupported P4 phase: ${normalized || "<empty>"}`);
  }
  return normalized;
}

export function compareP4StateActionPhases(left, right) {
  return P4_STATE_ACTION_PHASE_INDEX.get(
    normalizeP4StateActionPhase(left),
  ) - P4_STATE_ACTION_PHASE_INDEX.get(
    normalizeP4StateActionPhase(right),
  );
}

export function isP4StateActionCloseoutPhase(phase) {
  return normalizeP4StateActionPhase(phase) === "P4.5b";
}
