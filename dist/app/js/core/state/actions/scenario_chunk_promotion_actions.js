// Canonical scenario chunk promotion-state authority.
// Localization, rendering, scheduling, and diagnostics stay in composition roots.

const PROMOTION_ROOT_STATE_KEYS = Object.freeze([
  "defaultRuntimePoliticalTopology",
  "scenarioPoliticalChunkData",
  "scenarioPoliticalVisibleChunkData",
  "scenarioDataGeneration",
  "scenarioDataGenerationReason",
]);
const hasOwn = (target, key) => Object.hasOwn(target, key);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_chunk_promotion_actions] target must be an object");
  }
}

export function setScenarioPoliticalChunkPayloadState(target, nextState = {}) {
  assertStateTarget(target);
  if (!nextState || typeof nextState !== "object" || Array.isArray(nextState)) {
    throw new TypeError("[scenario_chunk_promotion_actions] political payload state must be an object");
  }
  const payload = hasOwn(nextState, "payload") ? nextState.payload : undefined;
  const visiblePayload = hasOwn(nextState, "visiblePayload")
    ? nextState.visiblePayload
    : undefined;
  if (hasOwn(nextState, "payload")) target.scenarioPoliticalChunkData = payload;
  if (hasOwn(nextState, "visiblePayload")) {
    target.scenarioPoliticalVisibleChunkData = visiblePayload;
  }
  return {
    payload,
    visiblePayload,
  };
}

export function bumpScenarioChunkDataGenerationState(target, reason) {
  assertStateTarget(target);
  const nextGeneration = Math.max(0, Number(target.scenarioDataGeneration) || 0) + 1;
  target.scenarioDataGeneration = nextGeneration;
  target.scenarioDataGenerationReason = String(reason || "");
  return nextGeneration;
}

export function commitScenarioPoliticalChunkPayloadState(
  target,
  { payload = null, visiblePayload = null, generationReason = "political-chunk-payload" } = {},
) {
  assertStateTarget(target);
  target.scenarioPoliticalChunkData = payload;
  target.scenarioPoliticalVisibleChunkData = visiblePayload;
  const nextGeneration = Math.max(0, Number(target.scenarioDataGeneration) || 0) + 1;
  target.scenarioDataGeneration = nextGeneration;
  target.scenarioDataGenerationReason = String(generationReason || "");
  return nextGeneration;
}

export function setScenarioChunkPromotionRenderLockState(target, locked) {
  assertStateTarget(target);
  const normalizedLocked = !!locked;
  target.scenarioChunkPromotionRenderLocked = normalizedLocked;
  return normalizedLocked;
}

export function setDefaultRuntimePoliticalTopologyState(target, value) {
  assertStateTarget(target);
  if (arguments.length < 2) {
    target.defaultRuntimePoliticalTopology =
      target.runtimePoliticalTopology || null;
    return value;
  }
  target.defaultRuntimePoliticalTopology = value;
  return value;
}

export function captureScenarioChunkPromotionRootState(target) {
  assertStateTarget(target);
  const presentKeys = PROMOTION_ROOT_STATE_KEYS.filter((key) => hasOwn(target, key));
  const values = Object.fromEntries(presentKeys.map((key) => [key, target[key]]));
  return Object.freeze({
    values: Object.freeze(values),
    presentKeys: Object.freeze(presentKeys),
  });
}

export function restoreScenarioChunkPromotionRootState(target, snapshot = {}) {
  assertStateTarget(target);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("[scenario_chunk_promotion_actions] promotion root snapshot must be an object");
  }
  if (
    !snapshot.values
    || typeof snapshot.values !== "object"
    || Array.isArray(snapshot.values)
    || !Array.isArray(snapshot.presentKeys)
  ) {
    throw new TypeError(
      "[scenario_chunk_promotion_actions] snapshot must contain values and presentKeys",
    );
  }
  let defaultTopologyPresent = false;
  let politicalPayloadPresent = false;
  let visiblePoliticalPayloadPresent = false;
  let generationPresent = false;
  let generationReasonPresent = false;
  for (const key of snapshot.presentKeys) {
    switch (key) {
      case "defaultRuntimePoliticalTopology": defaultTopologyPresent = true; break;
      case "scenarioPoliticalChunkData": politicalPayloadPresent = true; break;
      case "scenarioPoliticalVisibleChunkData": visiblePoliticalPayloadPresent = true; break;
      case "scenarioDataGeneration": generationPresent = true; break;
      case "scenarioDataGenerationReason": generationReasonPresent = true; break;
    }
  }
  if (defaultTopologyPresent) {
    target.defaultRuntimePoliticalTopology = snapshot.values.defaultRuntimePoliticalTopology;
  } else delete target.defaultRuntimePoliticalTopology;
  if (politicalPayloadPresent) {
    target.scenarioPoliticalChunkData = snapshot.values.scenarioPoliticalChunkData;
  } else delete target.scenarioPoliticalChunkData;
  if (visiblePoliticalPayloadPresent) {
    target.scenarioPoliticalVisibleChunkData = snapshot.values.scenarioPoliticalVisibleChunkData;
  } else delete target.scenarioPoliticalVisibleChunkData;
  if (generationPresent) target.scenarioDataGeneration = snapshot.values.scenarioDataGeneration;
  else delete target.scenarioDataGeneration;
  if (generationReasonPresent) {
    target.scenarioDataGenerationReason = snapshot.values.scenarioDataGenerationReason;
  } else delete target.scenarioDataGenerationReason;
  return true;
}
