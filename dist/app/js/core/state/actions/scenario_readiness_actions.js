// Canonical scenario readiness state authority.
// Transaction ordering, async work, observers, and recovery stay in scenario composition roots.

export const SCENARIO_READINESS_STATE_KEYS = Object.freeze([
  "topologyDetail",
  "topologyBundleMode",
  "detailDeferred",
  "detailPromotionCompleted",
  "detailPromotionInFlight",
  "detailSourceRequested",
]);

const hasOwn = (target, key) =>
  Object.hasOwn(target, key);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_readiness_actions] target must be an object");
  }
}

function validateCompletePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError("[scenario_readiness_actions] patch must be an object");
  }
  for (const key of SCENARIO_READINESS_STATE_KEYS) {
    if (!hasOwn(patch, key)) {
      throw new Error(
        `[scenario_readiness_actions] commitScenarioReadinessState missing required key: ${key}`,
      );
    }
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("[scenario_readiness_actions] snapshot must be an object");
  }
  const values = snapshot.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("[scenario_readiness_actions] snapshot.values must be an object");
  }
  for (const key of SCENARIO_READINESS_STATE_KEYS) {
    if (!hasOwn(values, key)) {
      throw new Error(
        `[scenario_readiness_actions] restoreScenarioReadinessState missing snapshot key: ${key}`,
      );
    }
  }
  if (
    !Array.isArray(snapshot.presentKeys)
    && !(snapshot.presentKeys instanceof Set)
  ) {
    throw new TypeError(
      "[scenario_readiness_actions] snapshot.presentKeys must be an array or Set",
    );
  }
  const presentKeys = Array.from(snapshot.presentKeys);
  const allowedKeys = new Set(SCENARIO_READINESS_STATE_KEYS);
  for (const key of presentKeys) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `[scenario_readiness_actions] restoreScenarioReadinessState contains unknown present key: ${key}`,
      );
    }
  }
  return { values, presentKeys: new Set(presentKeys) };
}

export function captureScenarioReadinessState(target) {
  assertStateTarget(target);
  const presentKeys = SCENARIO_READINESS_STATE_KEYS.filter((key) =>
    hasOwn(target, key)
  );
  const values = Object.fromEntries(
    SCENARIO_READINESS_STATE_KEYS.map((key) => [key, target[key]]),
  );
  return Object.freeze({
    values: Object.freeze(values),
    presentKeys: Object.freeze(presentKeys),
  });
}

export function commitScenarioReadinessState(target, patch) {
  assertStateTarget(target);
  validateCompletePatch(patch);
  target.topologyDetail = patch.topologyDetail;
  target.topologyBundleMode = patch.topologyBundleMode;
  target.detailDeferred = patch.detailDeferred;
  target.detailPromotionCompleted = patch.detailPromotionCompleted;
  target.detailPromotionInFlight = patch.detailPromotionInFlight;
  target.detailSourceRequested = patch.detailSourceRequested;
  return true;
}

export function restoreScenarioReadinessState(target, snapshot) {
  assertStateTarget(target);
  const { values, presentKeys } = validateSnapshot(snapshot);
  if (presentKeys.has("topologyDetail")) {
    target.topologyDetail = values.topologyDetail;
  } else {
    delete target.topologyDetail;
  }
  if (presentKeys.has("topologyBundleMode")) {
    target.topologyBundleMode = values.topologyBundleMode;
  } else {
    delete target.topologyBundleMode;
  }
  if (presentKeys.has("detailDeferred")) {
    target.detailDeferred = values.detailDeferred;
  } else {
    delete target.detailDeferred;
  }
  if (presentKeys.has("detailPromotionCompleted")) {
    target.detailPromotionCompleted = values.detailPromotionCompleted;
  } else {
    delete target.detailPromotionCompleted;
  }
  if (presentKeys.has("detailPromotionInFlight")) {
    target.detailPromotionInFlight = values.detailPromotionInFlight;
  } else {
    delete target.detailPromotionInFlight;
  }
  if (presentKeys.has("detailSourceRequested")) {
    target.detailSourceRequested = values.detailSourceRequested;
  } else {
    delete target.detailSourceRequested;
  }
  return true;
}
