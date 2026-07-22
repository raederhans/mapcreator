// Narrow scenario transaction rollback state authority.
// Canonical activation, readiness, presentation, and palette keys restore through
// their domain action modules. This temporary supplement has an explicit handoff:
// P4.2b -> topology/chunk runtime and hook keys.
// P4.2c -> hydration/data-health and performance-hint keys.

export const SCENARIO_TRANSACTION_ROLLBACK_OPTIONAL_STATE_KEYS = Object.freeze([
  "runtimePoliticalMetaSeed",
  "runtimePoliticalFeatureCollectionSeed",
  "scenarioAtlantropaData",
  "mapSemanticMode",
  "topologyDetail",
  "topologyBundleMode",
  "detailDeferred",
  "detailPromotionCompleted",
  "detailPromotionInFlight",
  "detailSourceRequested",
  "showScenarioAtlantropa",
  "scenarioPresentationStyleBeforeActivate",
  "locales",
  "geoAliasToStableKey",
]);

export const SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_HANDOFF_PHASE_BY_KEY =
  Object.freeze({
    defaultRuntimePoliticalTopology: "P4.2b",
    scenarioPoliticalChunkData: "P4.2b",
    scenarioHydrationHealthGate: "P4.2c",
    scenarioDataHealth: "P4.2c",
    activeScenarioPerformanceHints: "P4.2c",
    scenarioPoliticalVisibleChunkData: "P4.2b",
    activeScenarioChunks: "P4.2b",
    runtimeChunkLoadState: "P4.2b",
    scheduleScenarioChunkRefreshFn: "P4.2b",
    awaitInitialScenarioChunkVisualPromotionFn: "P4.2b",
  });

export const SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_STATE_KEYS =
  Object.freeze(
    Object.keys(
      SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_HANDOFF_PHASE_BY_KEY,
    ),
  );

const hasOwn = (target, key) =>
  Object.hasOwn(target, key);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError(
      "[scenario_transaction_rollback_actions] target must be an object",
    );
  }
}

function cloneRollbackStateValue(value, cloneValue) {
  return typeof cloneValue === "function"
    ? cloneValue(value)
    : value;
}

export function captureScenarioTransactionRollbackOptionalState(
  target,
  {
    cloneValue = null,
  } = {},
) {
  assertStateTarget(target);
  const values = {
    runtimePoliticalMetaSeed:
      cloneRollbackStateValue(target.runtimePoliticalMetaSeed, cloneValue),
    runtimePoliticalFeatureCollectionSeed:
      cloneRollbackStateValue(
        target.runtimePoliticalFeatureCollectionSeed,
        cloneValue,
      ),
    scenarioAtlantropaData:
      cloneRollbackStateValue(target.scenarioAtlantropaData, cloneValue),
    mapSemanticMode:
      cloneRollbackStateValue(target.mapSemanticMode, cloneValue),
    topologyDetail:
      cloneRollbackStateValue(target.topologyDetail, cloneValue),
    topologyBundleMode:
      cloneRollbackStateValue(target.topologyBundleMode, cloneValue),
    detailDeferred:
      cloneRollbackStateValue(target.detailDeferred, cloneValue),
    detailPromotionCompleted:
      cloneRollbackStateValue(target.detailPromotionCompleted, cloneValue),
    detailPromotionInFlight:
      cloneRollbackStateValue(target.detailPromotionInFlight, cloneValue),
    detailSourceRequested:
      cloneRollbackStateValue(target.detailSourceRequested, cloneValue),
    showScenarioAtlantropa:
      cloneRollbackStateValue(target.showScenarioAtlantropa, cloneValue),
    scenarioPresentationStyleBeforeActivate:
      cloneRollbackStateValue(
        target.scenarioPresentationStyleBeforeActivate,
        cloneValue,
      ),
    locales:
      cloneRollbackStateValue(target.locales, cloneValue),
    geoAliasToStableKey:
      cloneRollbackStateValue(target.geoAliasToStableKey, cloneValue),
  };
  return {
    values,
    presentKeys:
      SCENARIO_TRANSACTION_ROLLBACK_OPTIONAL_STATE_KEYS.filter((key) =>
        hasOwn(target, key)
      ),
  };
}

export function captureScenarioTransactionRollbackSupplementalState(
  target,
  {
    cloneValue = null,
    readHookSource = null,
    scheduleScenarioChunkRefreshSource = null,
    awaitInitialScenarioChunkVisualPromotionSource = null,
  } = {},
) {
  assertStateTarget(target);
  if (
    readHookSource !== null
    && typeof readHookSource !== "function"
  ) {
    throw new TypeError(
      "[scenario_transaction_rollback_actions] readHookSource must be a function",
    );
  }
  const runtimeChunkLoadState = cloneRollbackStateValue(
    {
      ...(target.runtimeChunkLoadState || {}),
      refreshTimerId: null,
      promotionTimerId: null,
      promotionScheduled: false,
      promotionCommitInFlight: false,
      promotionCommitStatus: "rolled-back",
      promotionCommitError: "",
      pendingPostCommitRefresh: null,
    },
    cloneValue,
  );
  const scheduleHookSource = readHookSource
    ? readHookSource(target, "scheduleScenarioChunkRefreshFn")
    : null;
  const promotionHookSource = readHookSource
    ? readHookSource(
      target,
      "awaitInitialScenarioChunkVisualPromotionFn",
    )
    : null;
  const values = {
    defaultRuntimePoliticalTopology:
      cloneRollbackStateValue(
        target.defaultRuntimePoliticalTopology,
        cloneValue,
      ),
    scenarioPoliticalChunkData:
      cloneRollbackStateValue(
        target.scenarioPoliticalChunkData,
        cloneValue,
      ),
    scenarioHydrationHealthGate:
      cloneRollbackStateValue(
        target.scenarioHydrationHealthGate,
        cloneValue,
      ),
    scenarioDataHealth:
      cloneRollbackStateValue(target.scenarioDataHealth, cloneValue),
    activeScenarioPerformanceHints:
      cloneRollbackStateValue(
        target.activeScenarioPerformanceHints,
        cloneValue,
      ),
    scenarioPoliticalVisibleChunkData:
      cloneRollbackStateValue(
        target.scenarioPoliticalVisibleChunkData,
        cloneValue,
      ),
    activeScenarioChunks:
      cloneRollbackStateValue(target.activeScenarioChunks, cloneValue),
    runtimeChunkLoadState,
    scheduleScenarioChunkRefreshEnabled:
      scheduleScenarioChunkRefreshSource !== null
      && scheduleHookSource === scheduleScenarioChunkRefreshSource,
    awaitInitialScenarioChunkVisualPromotionEnabled:
      awaitInitialScenarioChunkVisualPromotionSource !== null
      && promotionHookSource
        === awaitInitialScenarioChunkVisualPromotionSource,
  };
  const presentKeys =
    SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_STATE_KEYS.filter((key) => {
      if (key === "scheduleScenarioChunkRefreshFn") {
        return scheduleHookSource !== null;
      }
      if (key === "awaitInitialScenarioChunkVisualPromotionFn") {
        return promotionHookSource !== null;
      }
      return hasOwn(target, key);
    });
  return Object.freeze({
    values: Object.freeze(values),
    presentKeys: Object.freeze(presentKeys),
  });
}

function validateSupplementalPatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError(
      "[scenario_transaction_rollback_actions] patch must be an object",
    );
  }
  const values = patch.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError(
      "[scenario_transaction_rollback_actions] patch.values must be an object",
    );
  }
  for (const key of SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_STATE_KEYS) {
    if (!hasOwn(values, key)) {
      throw new Error(
        `[scenario_transaction_rollback_actions] supplemental rollback missing required key: ${key}`,
      );
    }
  }
  return values;
}

export function validateScenarioTransactionRollbackSupplementalStatePatch(
  patch,
) {
  validateSupplementalPatch(patch);
  return true;
}

export function restoreScenarioTransactionSupplementBeforeAuditState(
  target,
  patch,
) {
  assertStateTarget(target);
  const values = validateSupplementalPatch(patch);
  target.scenarioHydrationHealthGate =
    values.scenarioHydrationHealthGate;
  return true;
}

export function restoreScenarioTransactionSupplementBeforeColorDirtyState(
  target,
  patch,
) {
  assertStateTarget(target);
  const values = validateSupplementalPatch(patch);
  target.scenarioDataHealth = values.scenarioDataHealth;
  return true;
}

export function restoreScenarioTransactionSupplementAfterColorDirtyState(
  target,
  patch,
) {
  assertStateTarget(target);
  const values = validateSupplementalPatch(patch);
  target.activeScenarioPerformanceHints =
    values.activeScenarioPerformanceHints;
  return true;
}
