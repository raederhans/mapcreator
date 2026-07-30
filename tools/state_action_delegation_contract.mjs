import { createHash } from "node:crypto";

import { parse } from "acorn";

import {
  compareP4StateActionPhases,
  normalizeP4StateActionPhase,
} from "./p4_state_action_phases.mjs";

const BOOT_ACTION_MODULE_PATH =
  "js/core/state/actions/boot_actions.js";
const SCENARIO_READINESS_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_readiness_actions.js";
const SCENARIO_ACTIVATION_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_activation_actions.js";
const SCENARIO_PRESENTATION_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_presentation_actions.js";
const SCENARIO_HEALTH_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_health_actions.js";
const SCENARIO_APPLY_REQUEST_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_apply_request_actions.js";
const SCENARIO_PALETTE_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_palette_actions.js";
const SCENARIO_TRANSACTION_ROLLBACK_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_transaction_rollback_actions.js";
const SCENARIO_CHUNK_RUNTIME_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_chunk_runtime_actions.js";
const SCENARIO_CHUNK_PROMOTION_ACTION_MODULE_PATH =
  "js/core/state/actions/scenario_chunk_promotion_actions.js";

const BOOT_ACTION_EXPORT_NAMES = Object.freeze([
  "setStartupInteractionMode",
  "setBootPreviewVisibleState",
  "commitStartupReadonlyStateFields",
  "clearStartupReadonlyStateFields",
  "clearStartupReadonlyStateForReason",
  "setBootStateFields",
  "replaceBootMetricsState",
  "replaceStartupBootCacheState",
  "setStartupScenarioBootstrapCacheStatus",
  "replaceSampleProjectDeeplinkState",
  "setActivePostReadyTask",
  "clearActivePostReadyTask",
  "replacePostReadyTaskDiagnostics",
  "setLongAnimationFrameObserver",
  "setStartupInitialScenarioChunkVisualPromotion",
  "setUiShellDebugState",
  "setUiShellDebugTerritorySeededState",
]);

const SCENARIO_READINESS_ACTION_EXPORT_NAMES = Object.freeze([
  "commitScenarioReadinessState",
  "restoreScenarioReadinessState",
]);

const SCENARIO_ACTIVATION_ACTION_EXPORT_NAMES = Object.freeze([
  "commitScenarioActivationState",
  "restoreScenarioActivationBeforeAuditState",
  "restoreScenarioActivationBeforeColorDirtyState",
  "restoreScenarioActivationState",
]);

const SCENARIO_ACTIVATION_CHUNK_OPTIONAL_ACTION_EXPORT_NAMES = Object.freeze([
  "applyScenarioChunkOptionalLayerState",
  "restoreScenarioChunkPromotionState",
]);

const SCENARIO_PRESENTATION_ACTION_EXPORT_NAMES = Object.freeze([
  "commitScenarioPresentationState",
  "restoreScenarioTransactionPresentationBeforeAuditState",
  "restoreScenarioPresentationState",
  "restoreScenarioTransactionPresentationState",
]);

const SCENARIO_PRESENTATION_CHUNK_CITY_ACTION_EXPORT_NAMES = Object.freeze([
  "applyScenarioChunkCityExternalEffectState",
  "finalizeScenarioChunkCityExternalEffectState",
]);

const SCENARIO_PRESENTATION_HEALTH_ACTION_EXPORT_NAMES = Object.freeze([
  "setActiveScenarioPerformanceHintsState",
]);

const SCENARIO_APPLY_REQUEST_ACTION_EXPORT_NAMES = Object.freeze([
  "setLatestScenarioApplyRequestState",
  "beginScenarioApplyRequestState",
  "clearActiveScenarioApplyRequestState",
]);

const SCENARIO_PALETTE_ACTION_EXPORT_NAMES = Object.freeze([
  "commitScenarioPaletteState",
  "restoreScenarioPaletteState",
]);

const SCENARIO_HEALTH_ACTION_EXPORT_NAMES = Object.freeze([
  "setScenarioHydrationHealthGateState",
  "restoreScenarioHydrationHealthGateState",
  "setScenarioDataHealthState",
  "restoreScenarioDataHealthState",
]);

const SCENARIO_CHUNK_RUNTIME_ACTION_EXPORT_NAMES = Object.freeze([
  "ensureScenarioChunkRuntimeState",
  "resetScenarioChunkRuntimeState",
  "replaceScenarioChunkRuntimeState",
  "patchScenarioChunkLoadState",
  "commitScenarioChunkSelectionState",
  "beginScenarioChunkLoadState",
  "completeScenarioChunkLoadState",
  "failScenarioChunkLoadState",
  "finishScenarioChunkLoadState",
  "commitScenarioChunkPayloadEntriesState",
  "evictScenarioChunkPayloadsState",
  "setScenarioChunkMergedLayerPayloadsState",
  "replaceScenarioChunkPendingPromotionIdentityState",
  "queueScenarioChunkPromotionState",
  "setScenarioChunkPromotionStatusState",
  "clearScenarioChunkPromotionState",
  "setScenarioChunkRuntimeHooksState",
]);

const SCENARIO_CHUNK_PROMOTION_ACTION_EXPORT_NAMES = Object.freeze([
  "setScenarioPoliticalChunkPayloadState",
  "bumpScenarioChunkDataGenerationState",
  "commitScenarioPoliticalChunkPayloadState",
  "setScenarioChunkPromotionRenderLockState",
  "setDefaultRuntimePoliticalTopologyState",
  "restoreScenarioChunkPromotionRootState",
]);

const STATE_ACTION_EXPORT_GROUPS = Object.freeze([
  Object.freeze({
    modulePath: BOOT_ACTION_MODULE_PATH,
    exportNames: BOOT_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.1",
  }),
  Object.freeze({
    modulePath: SCENARIO_READINESS_ACTION_MODULE_PATH,
    exportNames: SCENARIO_READINESS_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2a",
  }),
  Object.freeze({
    modulePath: SCENARIO_ACTIVATION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_ACTIVATION_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2a",
  }),
  Object.freeze({
    modulePath: SCENARIO_PRESENTATION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_PRESENTATION_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2a",
  }),
  Object.freeze({
    modulePath: SCENARIO_APPLY_REQUEST_ACTION_MODULE_PATH,
    exportNames: SCENARIO_APPLY_REQUEST_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2a",
  }),
  Object.freeze({
    modulePath: SCENARIO_PALETTE_ACTION_MODULE_PATH,
    exportNames: SCENARIO_PALETTE_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2a",
  }),
  Object.freeze({
    modulePath: SCENARIO_ACTIVATION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_ACTIVATION_CHUNK_OPTIONAL_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2b",
  }),
  Object.freeze({
    modulePath: SCENARIO_PRESENTATION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_PRESENTATION_CHUNK_CITY_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2b",
  }),
  Object.freeze({
    modulePath: SCENARIO_CHUNK_RUNTIME_ACTION_MODULE_PATH,
    exportNames: SCENARIO_CHUNK_RUNTIME_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2b",
  }),
  Object.freeze({
    modulePath: SCENARIO_CHUNK_PROMOTION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_CHUNK_PROMOTION_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2b",
  }),
  Object.freeze({
    modulePath: SCENARIO_HEALTH_ACTION_MODULE_PATH,
    exportNames: SCENARIO_HEALTH_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2c",
  }),
  Object.freeze({
    modulePath: SCENARIO_PRESENTATION_ACTION_MODULE_PATH,
    exportNames: SCENARIO_PRESENTATION_HEALTH_ACTION_EXPORT_NAMES,
    introducedInPhase: "P4.2c",
  }),
]);

const STATE_ACTION_READ_ONLY_EXPORT_NAMES_BY_MODULE = new Map([
  [
    SCENARIO_READINESS_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_READINESS_STATE_KEYS",
      "captureScenarioReadinessState",
    ]),
  ],
  [
    SCENARIO_ACTIVATION_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_ACTIVATION_STATE_KEYS",
      "SCENARIO_CHUNK_OPTIONAL_LAYER_STATE_CONFIGS",
      "captureScenarioActivationState",
      "captureScenarioChunkPromotionState",
      "getScenarioChunkOptionalLayerState",
      "restoreScenarioActivationAfterColorDirtyState",
    ]),
  ],
  [
    SCENARIO_PRESENTATION_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_PRESENTATION_STATE_KEYS",
      "captureActiveScenarioPerformanceHintsState",
      "captureScenarioPresentationState",
    ]),
  ],
  [
    SCENARIO_HEALTH_ACTION_MODULE_PATH,
    new Set([
      "captureScenarioHealthState",
    ]),
  ],
  [
    SCENARIO_PALETTE_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_PALETTE_STATE_KEYS",
      "captureScenarioPaletteState",
    ]),
  ],
  [
    SCENARIO_TRANSACTION_ROLLBACK_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_TRANSACTION_ROLLBACK_OPTIONAL_STATE_KEYS",
      "SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_HANDOFF_PHASE_BY_KEY",
      "SCENARIO_TRANSACTION_ROLLBACK_SUPPLEMENTAL_STATE_KEYS",
      "captureScenarioTransactionRollbackOptionalState",
      "captureScenarioTransactionRollbackSupplementalState",
      "validateScenarioTransactionRollbackSupplementalStatePatch",
    ]),
  ],
  [
    SCENARIO_CHUNK_RUNTIME_ACTION_MODULE_PATH,
    new Set([
      "SCENARIO_CHUNK_LOAD_STATE_PATCH_KEYS",
      "captureScenarioChunkLoadStateContinuation",
    ]),
  ],
  [
    SCENARIO_CHUNK_PROMOTION_ACTION_MODULE_PATH,
    new Set([
      "captureScenarioChunkPromotionRootState",
    ]),
  ],
]);

function freezePureReaderEscape({
  reason = "state-alias-escape",
  key = "*",
  sourceFingerprint = "",
  count = 1,
} = {}) {
  return Object.freeze({
    reason: String(reason || ""),
    key: String(key || ""),
    sourceFingerprint: String(sourceFingerprint || ""),
    count: Number(count),
  });
}

function freezePureReaderConservativeFinding({
  enclosingFunctionIdentity = "",
  reason = "",
  operation = "",
  key = "",
  sourceFingerprint = "",
  count = 1,
} = {}) {
  return Object.freeze({
    enclosingFunctionIdentity: String(
      enclosingFunctionIdentity || "",
    ),
    reason: String(reason || ""),
    operation: String(operation || ""),
    key: String(key || ""),
    sourceFingerprint: String(sourceFingerprint || ""),
    count: Number(count),
  });
}

function freezeStateTargetPureReaderEntry({
  modulePath,
  functionName,
  targetParameterName,
  targetParameterIndex = 0,
  targetParameterPath = "$",
  sourceFingerprint,
  acceptedEscapes = [],
  conservativeFindings = [],
} = {}) {
  return Object.freeze({
    modulePath: normalizeModulePath(modulePath),
    functionName: String(functionName || ""),
    targetParameterName: String(targetParameterName || ""),
    targetParameterIndex: Number(targetParameterIndex),
    targetParameterPath: String(targetParameterPath || ""),
    sourceFingerprint: String(sourceFingerprint || ""),
    acceptedEscapes: Object.freeze(
      acceptedEscapes.map(freezePureReaderEscape),
    ),
    conservativeFindings: Object.freeze(
      conservativeFindings.map(
        freezePureReaderConservativeFinding,
      ),
    ),
  });
}

const SCENARIO_DETAIL_PURE_READER_FUNCTION_IDENTITY =
  '{"kind":"function","ancestry":[{"name":"prepareScenarioDetailTopologyState","ordinal":0}]}';
const SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY =
  '{"kind":"function","ancestry":[{"name":"prepareScenarioDetailTopologyState","ordinal":0},{"name":"currentPatch","ordinal":0}]}';
const SCENARIO_DETAIL_CREATE_RESULT_FUNCTION_IDENTITY =
  '{"kind":"function","ancestry":[{"name":"prepareScenarioDetailTopologyState","ordinal":0},{"name":"createResult","ordinal":0}]}';

function scenarioDetailConservativeFinding(
  enclosingFunctionIdentity,
  key,
  sourceFingerprint,
  count = 1,
) {
  return {
    enclosingFunctionIdentity,
    reason: "state-alias-escape",
    operation: "unsupported",
    key,
    sourceFingerprint,
    count,
  };
}

export const STATE_TARGET_PURE_READER_CONTRACT = Object.freeze([
  freezeStateTargetPureReaderEntry({
    modulePath: "js/core/scenario_manager.js",
    functionName: "prepareScenarioDetailTopologyState",
    targetParameterName: "targetState",
    targetParameterIndex: 0,
    targetParameterPath: "$/property:targetState",
    sourceFingerprint:
      "47c43af8daaa53a0f3b791601a75d17cb9136cda6914a5daa6874b415443f964",
    conservativeFindings: [
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "*",
        "4cd9b0d4014198e8d5d3d514b177adcc28016abdee9111d8503d9f5b21b53bfe",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "topologyDetail",
        "a480f4d95a77a248f3f00504dae9250d7d2b5b203b4fa62095e5c392347240d1",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "topologyBundleMode",
        "dc3cf41d39483cf1a5324d0dc39c11a16cd734f0ed3c6f5535c4f6d594883265",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "detailDeferred",
        "f4b65c454d015438e41078986902c10a152e822bf5f51b83885c7477a7bdaf81",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "detailPromotionCompleted",
        "015b4efaf9069d2d2cb7fe40a597ffc2f9c479e1c1afa7400756261972ab1f1c",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "detailPromotionInFlight",
        "9bb1a630841347e38e962d7d9a8238577794cdd7c673d9f83ba79ad7d382357e",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CURRENT_PATCH_FUNCTION_IDENTITY,
        "detailSourceRequested",
        "5edd9c39faa5ea35266783d4e03088366240264b8011e86bf6e45f87a3a1b0c3",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CREATE_RESULT_FUNCTION_IDENTITY,
        "*",
        "bd646f14a3726436c3155818421d934c3a2dcdf53ada9f31393a3871e2a3235f",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_CREATE_RESULT_FUNCTION_IDENTITY,
        "*",
        "a4895eb44afc336fecbba6e520cd67e178dace0276655d102fceffa8e5f70570",
      ),
      scenarioDetailConservativeFinding(
        SCENARIO_DETAIL_PURE_READER_FUNCTION_IDENTITY,
        "topologyDetail",
        "a480f4d95a77a248f3f00504dae9250d7d2b5b203b4fa62095e5c392347240d1",
      ),
      ...[
        [
          "4037acc7602070fd45debf1292f6b051e6b371fb95a0fcbf6a03057454b0fb40",
          1,
        ],
        [
          "9b7c27f4636707683beb548569b03c1d2eaecde9490179330a84f69df58e9430",
          2,
        ],
        [
          "e0ae35c7b2c9744523e772fa0831a6af75a74595e7ca8b631d9d3ac7c82d1495",
          1,
        ],
        [
          "51bbcb024ae6b86304ba5499c611b3e3199f21fb3130109be8b61041cf2d3586",
          1,
        ],
        [
          "cd5277d5cb24bee2902ffb16cb96ddf8737123b558b20963bc7ae3db01c57b44",
          1,
        ],
        [
          "87607f01208bed5b3096eb8d02f8f006224ea3b5039a4c537e0b537942d939d4",
          1,
        ],
        [
          "5cd9d40ef22cb3a83b4b1b7979daaeace0e243f813f2f401d018829f8411f823",
          1,
        ],
        [
          "594cccd49e06cb5382ce1cc30e1e2df05b0363abe71fafdc6d5ed6e41611fad0",
          1,
        ],
        [
          "9b39afa32f43a3cf35be55150858a82c68e983a995bbeeb1d9e5250ed31eeb0e",
          1,
        ],
        [
          "0e0088092335c06a6e813f95103ee3ec653de0f603320fb89430d82553ba7620",
          1,
        ],
        [
          "1297675eb4c214963ade4245676beb37e6551ae26175acda39b8657c8e944127",
          1,
        ],
      ].map(([sourceFingerprint, count]) =>
        scenarioDetailConservativeFinding(
          SCENARIO_DETAIL_PURE_READER_FUNCTION_IDENTITY,
          "*",
          sourceFingerprint,
          count,
        )
      ),
    ],
  }),
]);

const PURE_READER_ENTRY_BY_ID = new Map(
  STATE_TARGET_PURE_READER_CONTRACT.map((entry) => [
    [
      entry.modulePath,
      entry.functionName,
      entry.targetParameterIndex,
      entry.targetParameterPath,
    ].join("#"),
    entry,
  ]),
);

function normalizeModulePath(value = "") {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

const STATE_ACTION_READ_ONLY_ARGUMENT_INDEXES_BY_ID = new Map([
  [
    `${SCENARIO_CHUNK_RUNTIME_ACTION_MODULE_PATH}#replaceScenarioChunkPendingPromotionIdentityState`,
    Object.freeze([1]),
  ],
]);

function freezeDelegationEntry({
  modulePath,
  exportName,
  targetArgumentIndex = 0,
  introducedInPhase,
}) {
  const normalizedModulePath = normalizeModulePath(modulePath);
  const normalizedExportName = String(exportName || "");
  return Object.freeze({
    modulePath: normalizedModulePath,
    exportName: normalizedExportName,
    targetArgumentIndex: Number(targetArgumentIndex),
    readOnlyArgumentIndexes:
      STATE_ACTION_READ_ONLY_ARGUMENT_INDEXES_BY_ID.get(
        `${normalizedModulePath}#${normalizedExportName}`,
      ) || Object.freeze([]),
    introducedInPhase: String(introducedInPhase || ""),
  });
}

export const STATE_ACTION_DELEGATION_CONTRACT = Object.freeze(
  STATE_ACTION_EXPORT_GROUPS.flatMap(({
    modulePath,
    exportNames,
    introducedInPhase,
  }) =>
    exportNames.map((exportName) =>
      freezeDelegationEntry({
        modulePath,
        exportName,
        targetArgumentIndex: 0,
        introducedInPhase,
      })
    )
  ),
);

const CONTRACT_ENTRY_BY_ID = new Map(
  STATE_ACTION_DELEGATION_CONTRACT.map((entry) => [
    `${entry.modulePath}#${entry.exportName}`,
    entry,
  ]),
);

function normalizeStateActionMembership(value = "") {
  return String(value || "").trim();
}

function stateActionLegacyMembershipReplacementIdentityPayload(
  entry = {},
) {
  return {
    modulePath: normalizeModulePath(entry.modulePath),
    exportName: String(entry.exportName || ""),
    retiredMembership: normalizeStateActionMembership(
      entry.retiredMembership,
    ),
    requiredConcreteMemberships: (
      Array.isArray(entry.requiredConcreteMemberships)
        ? entry.requiredConcreteMemberships
        : []
    ).map(normalizeStateActionMembership),
  };
}

export function buildStateActionLegacyMembershipReplacementContractIdentity(
  entry = {},
) {
  return createHash("sha256")
    .update(JSON.stringify(
      stateActionLegacyMembershipReplacementIdentityPayload(entry),
    ))
    .digest("hex");
}

function freezeLegacyMembershipReplacementEntry(entry = {}) {
  const normalized =
    stateActionLegacyMembershipReplacementIdentityPayload(entry);
  const contractIdentity =
    buildStateActionLegacyMembershipReplacementContractIdentity(
      normalized,
    );
  return Object.freeze({
    ...normalized,
    requiredConcreteMemberships: Object.freeze(
      normalized.requiredConcreteMemberships,
    ),
    contractIdentity,
  });
}

const SCENARIO_CHUNK_OPTIONAL_LAYER_ASSIGN_MEMBERSHIPS = Object.freeze([
  "scenario|P4.2|assign|scenarioAtlantropaData",
  "scenario|P4.2|assign|scenarioAtlantropaRevision",
  "scenario|P4.2|assign|scenarioReliefOverlayRevision",
  "scenario|P4.2|assign|scenarioReliefOverlaysData",
  "scenario|P4.2|assign|scenarioSpecialRegionsData",
  "scenario|P4.2|assign|scenarioStrategicValuesData",
  "scenario|P4.2|assign|scenarioStrategicValuesRevision",
  "scenario|P4.2|assign|scenarioWaterRegionsData",
  "ui|P4.4|assign|specialZoneLayers",
]);

export const STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT =
  Object.freeze([
    "applyScenarioChunkOptionalLayerState",
    "restoreScenarioChunkPromotionState",
  ].map((exportName) =>
    freezeLegacyMembershipReplacementEntry({
      modulePath: SCENARIO_ACTIVATION_ACTION_MODULE_PATH,
      exportName,
      retiredMembership: "scenario|P4.2|assign|*",
      requiredConcreteMemberships:
        SCENARIO_CHUNK_OPTIONAL_LAYER_ASSIGN_MEMBERSHIPS,
    })
  ));

const SCENARIO_MANAGER_RUNTIME_STATE_BINDING_IDENTITY =
  JSON.stringify({
    kind: "module",
    name: "runtimeState",
    functionName: "",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "",
    importSource: "./state.js",
    importedName: "state",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_APPLY_PIPELINE_RUNTIME_STATE_BINDING_IDENTITY =
  JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "createScenarioApplyPipeline",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$/property:runtimeState",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_DETAIL_RETIRED_FUNCTION_IDENTITY =
  JSON.stringify({
    kind: "function",
    ancestry: [{
      name: "ensureScenarioDetailTopologyLoaded",
      ordinal: 0,
    }],
  });
const SCENARIO_ACTIVATION_COMMIT_FUNCTION_IDENTITY =
  JSON.stringify({
    kind: "function",
    ancestry: [{
      name: "createScenarioApplyPipeline",
      ordinal: 0,
    }, {
      name: "commitScenarioActivationState",
      ordinal: 0,
    }],
  });
const SCENARIO_RUNTIME_DATA_HEALTH_RETIRED_BINDING_IDENTITY =
  JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "setScenarioDataHealthState",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_RUNTIME_HYDRATION_HEALTH_RETIRED_BINDING_IDENTITY =
  JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "setScenarioHydrationHealthGateState",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_DATA_HEALTH_RUNTIME_STATE_BINDING_IDENTITY =
  JSON.stringify({
    kind: "module",
    name: "runtimeState",
    functionName: "",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "",
    importSource: "./state.js",
    importedName: "state",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_STARTUP_HYDRATION_STATE_BINDING_IDENTITY =
  JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "createScenarioStartupHydrationController",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$/property:state",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
const SCENARIO_DATA_HEALTH_REFRESH_FUNCTION_IDENTITY =
  JSON.stringify({
    kind: "function",
    ancestry: [{
      name: "refreshScenarioDataHealth",
      ordinal: 0,
    }],
  });
const SCENARIO_HYDRATION_HEALTH_ENFORCEMENT_FUNCTION_IDENTITY =
  JSON.stringify({
    kind: "function",
    ancestry: [{
      name: "createScenarioStartupHydrationController",
      ordinal: 0,
    }, {
      name: "enforceScenarioHydrationHealthGate",
      ordinal: 0,
    }],
  });
function normalizeMigrationMutationSite(site = {}) {
  return Object.freeze({
    enclosingFunctionIdentity: String(
      site.enclosingFunctionIdentity || "",
    ),
    sourceFingerprint: String(site.sourceFingerprint || ""),
    occurrenceIndex: Number(site.occurrenceIndex),
  });
}

function crossFileMigrationContractIdentityPayload(entry = {}) {
  return {
    retiredCallerPath: normalizeModulePath(entry.retiredCallerPath),
    retiredCallerBindingIdentity: String(
      entry.retiredCallerBindingIdentity || "",
    ),
    domain: String(entry.domain || ""),
    migrationPhase: String(entry.migrationPhase || ""),
    operation: String(entry.operation || ""),
    key: String(entry.key || ""),
    retiredMutationSites: (
      Array.isArray(entry.retiredMutationSites)
        ? entry.retiredMutationSites
        : []
    ).map((site) => ({
      enclosingFunctionIdentity: String(
        site.enclosingFunctionIdentity || "",
      ),
      sourceFingerprint: String(site.sourceFingerprint || ""),
      occurrenceIndex: Number(site.occurrenceIndex),
    })),
    replacementCallerPath: normalizeModulePath(
      entry.replacementCallerPath,
    ),
    replacementCallerBindingIdentity: String(
      entry.replacementCallerBindingIdentity || "",
    ),
    replacementEnclosingFunctionIdentity: String(
      entry.replacementEnclosingFunctionIdentity || "",
    ),
    actionModulePath: normalizeModulePath(entry.actionModulePath),
    actionExportName: String(entry.actionExportName || ""),
    targetArgumentIndex: Number(entry.targetArgumentIndex),
    replacementActionSourceFingerprint: String(
      entry.replacementActionSourceFingerprint || "",
    ),
  };
}

export function buildStateActionCrossFileMigrationContractIdentity(
  entry = {},
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        crossFileMigrationContractIdentityPayload(entry),
      ),
    )
    .digest("hex");
}

function freezeCrossFileMigrationEntry(entry = {}) {
  const normalized = crossFileMigrationContractIdentityPayload(entry);
  const retiredMutationSites = Object.freeze(
    normalized.retiredMutationSites.map(
      normalizeMigrationMutationSite,
    ),
  );
  const retiredMembershipIdentity = [
    normalized.retiredCallerPath,
    normalized.retiredCallerBindingIdentity,
    normalized.domain,
    normalized.migrationPhase,
    normalized.operation,
    normalized.key,
  ].join("|");
  const frozen = {
    ...normalized,
    retiredMutationSites,
    retiredMembershipIdentity,
  };
  return Object.freeze({
    ...frozen,
    contractIdentity:
      buildStateActionCrossFileMigrationContractIdentity(frozen),
  });
}

const SCENARIO_DETAIL_MIGRATION_SITES_BY_KEY = Object.freeze({
  topologyBundleMode: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "1edfcf4cc10092c06ae4e9763c436a5b31fa3141123717bfd5113ebfc42454aa",
      occurrenceIndex: 0,
    }),
    Object.freeze({
      sourceFingerprint:
        "1edfcf4cc10092c06ae4e9763c436a5b31fa3141123717bfd5113ebfc42454aa",
      occurrenceIndex: 1,
    }),
  ]),
  detailDeferred: Object.freeze([
    ...[0, 1, 2, 3].map((occurrenceIndex) => Object.freeze({
      sourceFingerprint:
        "0b82c34a7c15b03e57d63b2013fb904db8187628bfb249fb9da9bf816e4be5ae",
      occurrenceIndex,
    })),
  ]),
  detailPromotionCompleted: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "2b29862129ac2f743c6a257512b6cfb5b2a418aedd32279a6bb23d64ccd8ada6",
      occurrenceIndex: 0,
    }),
    Object.freeze({
      sourceFingerprint:
        "2b29862129ac2f743c6a257512b6cfb5b2a418aedd32279a6bb23d64ccd8ada6",
      occurrenceIndex: 1,
    }),
  ]),
  detailPromotionInFlight: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "9989ae5aceaa64ece377c75f87c5c7e1cbd1c47f57aa8b0e78cd98ea13be1098",
      occurrenceIndex: 0,
    }),
    Object.freeze({
      sourceFingerprint:
        "9989ae5aceaa64ece377c75f87c5c7e1cbd1c47f57aa8b0e78cd98ea13be1098",
      occurrenceIndex: 1,
    }),
  ]),
  topologyDetail: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "8edd070d7210a8201b16b65ba20c261acc7c4fe661a79b5e1245731ef6c9bc39",
      occurrenceIndex: 0,
    }),
  ]),
  runtimePoliticalTopology: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "1f83bd9f1169e37079140e94347a0f2c8a6bd12ff6c78be4f0fe800933b4dedc",
      occurrenceIndex: 0,
    }),
  ]),
  detailSourceRequested: Object.freeze([
    Object.freeze({
      sourceFingerprint:
        "c5fa2c1ee7493ac4474e9243de5b7b36cea3afc76c3534f36c71325472bf26ff",
      occurrenceIndex: 0,
    }),
  ]),
});

function createScenarioDetailCrossFileMigrationEntry(
  key,
  {
    actionModulePath,
    actionExportName,
    replacementActionSourceFingerprint,
  },
) {
  return freezeCrossFileMigrationEntry({
    retiredCallerPath: "js/core/scenario_manager.js",
    retiredCallerBindingIdentity:
      SCENARIO_MANAGER_RUNTIME_STATE_BINDING_IDENTITY,
    domain: "content",
    migrationPhase: "P4.2",
    operation: "assign",
    key,
    retiredMutationSites:
      SCENARIO_DETAIL_MIGRATION_SITES_BY_KEY[key].map((site) => ({
        ...site,
        enclosingFunctionIdentity:
          SCENARIO_DETAIL_RETIRED_FUNCTION_IDENTITY,
      })),
    replacementCallerPath:
      "js/core/scenario_apply_pipeline.js",
    replacementCallerBindingIdentity:
      SCENARIO_APPLY_PIPELINE_RUNTIME_STATE_BINDING_IDENTITY,
    replacementEnclosingFunctionIdentity:
      SCENARIO_ACTIVATION_COMMIT_FUNCTION_IDENTITY,
    actionModulePath,
    actionExportName,
    targetArgumentIndex: 0,
    replacementActionSourceFingerprint,
  });
}

function createScenarioHealthCrossFileMigrationEntry({
  retiredCallerBindingIdentity,
  key,
  retiredEnclosingFunctionIdentity,
  retiredSourceFingerprint,
  replacementCallerPath,
  replacementCallerBindingIdentity,
  replacementEnclosingFunctionIdentity,
  actionExportName,
  replacementActionSourceFingerprint,
}) {
  return freezeCrossFileMigrationEntry({
    retiredCallerPath: "js/core/state/scenario_runtime_state.js",
    retiredCallerBindingIdentity,
    domain: "scenario",
    migrationPhase: "P4.2",
    operation: "assign",
    key,
    retiredMutationSites: [{
      enclosingFunctionIdentity: retiredEnclosingFunctionIdentity,
      sourceFingerprint: retiredSourceFingerprint,
      occurrenceIndex: 0,
    }],
    replacementCallerPath,
    replacementCallerBindingIdentity,
    replacementEnclosingFunctionIdentity,
    actionModulePath: SCENARIO_HEALTH_ACTION_MODULE_PATH,
    actionExportName,
    targetArgumentIndex: 0,
    replacementActionSourceFingerprint,
  });
}

export const STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT =
  Object.freeze([
    ...[
      "detailDeferred",
      "detailPromotionCompleted",
      "detailPromotionInFlight",
      "detailSourceRequested",
      "topologyBundleMode",
      "topologyDetail",
    ].map((key) =>
      createScenarioDetailCrossFileMigrationEntry(key, {
        actionModulePath:
          SCENARIO_READINESS_ACTION_MODULE_PATH,
        actionExportName: "commitScenarioReadinessState",
        replacementActionSourceFingerprint:
          "a18092f6cae4949214006f1acd9091cb66b8fca6a23c06f970a08e8554954412",
      })
    ),
    createScenarioDetailCrossFileMigrationEntry(
      "runtimePoliticalTopology",
      {
        actionModulePath:
          SCENARIO_ACTIVATION_ACTION_MODULE_PATH,
        actionExportName: "commitScenarioActivationState",
        replacementActionSourceFingerprint:
          "48de10ee32e9c2cb07dee776e315e5bf98c22ac658d90af9180f76712616a22a",
      },
    ),
    createScenarioHealthCrossFileMigrationEntry({
      retiredCallerBindingIdentity:
        SCENARIO_RUNTIME_DATA_HEALTH_RETIRED_BINDING_IDENTITY,
      key: "scenarioDataHealth",
      retiredEnclosingFunctionIdentity: JSON.stringify({
        kind: "function",
        ancestry: [{
          name: "setScenarioDataHealthState",
          ordinal: 0,
        }],
      }),
      retiredSourceFingerprint:
        "499c46a92c442aca4ea8ac280d759b930abe5821c3ff06dcc2c6e2f910d749b5",
      replacementCallerPath: "js/core/scenario_data_health.js",
      replacementCallerBindingIdentity:
        SCENARIO_DATA_HEALTH_RUNTIME_STATE_BINDING_IDENTITY,
      replacementEnclosingFunctionIdentity:
        SCENARIO_DATA_HEALTH_REFRESH_FUNCTION_IDENTITY,
      actionExportName: "setScenarioDataHealthState",
      replacementActionSourceFingerprint:
        "34e8ad9722db769ba6c7da4c2e84fcee70c24ef65a9d8a5ef0a96fd08f3f5373",
    }),
    createScenarioHealthCrossFileMigrationEntry({
      retiredCallerBindingIdentity:
        SCENARIO_RUNTIME_HYDRATION_HEALTH_RETIRED_BINDING_IDENTITY,
      key: "scenarioHydrationHealthGate",
      retiredEnclosingFunctionIdentity: JSON.stringify({
        kind: "function",
        ancestry: [{
          name: "setScenarioHydrationHealthGateState",
          ordinal: 0,
        }],
      }),
      retiredSourceFingerprint:
        "c84938fde26b1d2af44477315d953497d4ef55223b474dc4dc5c9b0d3ec99f6a",
      replacementCallerPath:
        "js/core/scenario/startup_hydration.js",
      replacementCallerBindingIdentity:
        SCENARIO_STARTUP_HYDRATION_STATE_BINDING_IDENTITY,
      replacementEnclosingFunctionIdentity:
        SCENARIO_HYDRATION_HEALTH_ENFORCEMENT_FUNCTION_IDENTITY,
      actionExportName: "setScenarioHydrationHealthGateState",
      replacementActionSourceFingerprint:
        "cc4831af773186e73e4d9dc6b705d379fdc5b384fe574bacef03b89ed3bfbc75",
    }),
  ].sort(
    (left, right) =>
      left.retiredMembershipIdentity.localeCompare(
        right.retiredMembershipIdentity,
      ),
  ));

const CROSS_FILE_MIGRATION_ENTRY_BY_RETIRED_IDENTITY =
  new Map(
    STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT.map((entry) => [
      entry.retiredMembershipIdentity,
      entry,
    ]),
  );

export function findStateActionCrossFileMigrationContractEntry(
  retiredMembershipIdentity,
  entries = STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT,
) {
  if (entries !== STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT) {
    return (Array.isArray(entries) ? entries : []).find(
      (entry) =>
        String(entry?.retiredMembershipIdentity || "")
        === String(retiredMembershipIdentity || ""),
    ) || null;
  }
  return CROSS_FILE_MIGRATION_ENTRY_BY_RETIRED_IDENTITY.get(
    String(retiredMembershipIdentity || ""),
  ) || null;
}

export function validateStateActionCrossFileMigrationContract(
  entries = STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT,
) {
  const violations = [];
  if (!Array.isArray(entries)) {
    return [
      createViolation(
        "state-action-cross-file-migration-contract-invalid",
        {
          reason: "entries-not-array",
        },
      ),
    ];
  }
  const seenRetiredIdentities = new Set();
  for (
    const [index, entry] of
    entries.entries()
  ) {
    const normalized =
      crossFileMigrationContractIdentityPayload(entry);
    const retiredMembershipIdentity = [
      normalized.retiredCallerPath,
      normalized.retiredCallerBindingIdentity,
      normalized.domain,
      normalized.migrationPhase,
      normalized.operation,
      normalized.key,
    ].join("|");
    const actionContract =
      CONTRACT_ENTRY_BY_ID.get(
        `${normalized.actionModulePath}#${normalized.actionExportName}`,
      );
    const mutationSitesValid =
      normalized.retiredMutationSites.length > 0
      && normalized.retiredMutationSites.every((site) =>
        String(site.enclosingFunctionIdentity || "")
        && /^[0-9a-f]{64}$/i.test(
          String(site.sourceFingerprint || ""),
        )
        && Number.isInteger(site.occurrenceIndex)
        && site.occurrenceIndex >= 0
      );
    const mutationSiteIdentities =
      normalized.retiredMutationSites.map((site) =>
        [
          site.enclosingFunctionIdentity,
          site.sourceFingerprint,
          site.occurrenceIndex,
        ].join("|")
      );
    const mutationSitesUnique =
      new Set(mutationSiteIdentities).size
      === mutationSiteIdentities.length;
    const mutationSitesSorted =
      JSON.stringify(normalized.retiredMutationSites)
      === JSON.stringify(
        [...normalized.retiredMutationSites].sort(
          (left, right) =>
            left.enclosingFunctionIdentity.localeCompare(
              right.enclosingFunctionIdentity,
            )
            || left.sourceFingerprint.localeCompare(
              right.sourceFingerprint,
            )
            || left.occurrenceIndex - right.occurrenceIndex,
        ),
      );
    const retiredEnclosingFunctionIdentities = new Set(
      normalized.retiredMutationSites.map(
        ({ enclosingFunctionIdentity }) =>
          enclosingFunctionIdentity,
      ),
    );
    const replacementBoundaryDistinct = Boolean(
      normalized.replacementCallerPath
        !== normalized.retiredCallerPath
      || normalized.replacementCallerBindingIdentity
        !== normalized.retiredCallerBindingIdentity
      || !retiredEnclosingFunctionIdentities.has(
        normalized.replacementEnclosingFunctionIdentity,
      ),
    );
    let retiredCallerBindingIdentityValid = false;
    let replacementCallerBindingIdentityValid = false;
    try {
      retiredCallerBindingIdentityValid = Boolean(
        JSON.parse(normalized.retiredCallerBindingIdentity),
      );
    } catch {
      retiredCallerBindingIdentityValid = false;
    }
    try {
      replacementCallerBindingIdentityValid = Boolean(
        JSON.parse(normalized.replacementCallerBindingIdentity),
      );
    } catch {
      replacementCallerBindingIdentityValid = false;
    }
    const valid = Boolean(
      normalized.retiredCallerPath
      && normalized.retiredCallerBindingIdentity
      && retiredCallerBindingIdentityValid
      && normalized.domain
      && normalized.migrationPhase
      && normalized.operation
      && normalized.key
      && mutationSitesValid
      && mutationSitesUnique
      && mutationSitesSorted
      && retiredEnclosingFunctionIdentities.size === 1
      && normalized.replacementCallerPath
      && replacementBoundaryDistinct
      && normalized.replacementCallerBindingIdentity
      && replacementCallerBindingIdentityValid
      && normalized.replacementEnclosingFunctionIdentity
      && normalized.actionModulePath
      && normalized.actionExportName
      && actionContract
      && normalized.targetArgumentIndex
        === actionContract.targetArgumentIndex
      && /^[0-9a-f]{64}$/i.test(
        normalized.replacementActionSourceFingerprint,
      )
      && String(entry?.retiredMembershipIdentity || "")
        === retiredMembershipIdentity
      && String(entry?.contractIdentity || "")
        === buildStateActionCrossFileMigrationContractIdentity(
          entry,
        )
    );
    if (!valid) {
      violations.push(
        createViolation(
          "state-action-cross-file-migration-entry-invalid",
          {
            index,
            retiredMembershipIdentity,
          },
        ),
      );
    }
    if (seenRetiredIdentities.has(retiredMembershipIdentity)) {
      violations.push(
        createViolation(
          "state-action-cross-file-migration-entry-duplicate",
          {
            index,
            retiredMembershipIdentity,
          },
        ),
      );
    }
    seenRetiredIdentities.add(retiredMembershipIdentity);
  }
  return violations;
}

export function findStateActionDelegationContractEntry(
  modulePath,
  exportName,
) {
  return CONTRACT_ENTRY_BY_ID.get(
    `${normalizeModulePath(modulePath)}#${String(exportName || "")}`,
  ) || null;
}

function parseStateActionMembership(value = "") {
  const normalized = normalizeStateActionMembership(value);
  const parts = normalized.split("|");
  if (parts.length !== 4) {
    return null;
  }
  const [domain, migrationPhase, operation, key] = parts;
  if (!domain || !migrationPhase || !operation || !key) {
    return null;
  }
  if (!/^P4\.[1-4]$/.test(migrationPhase)) {
    return null;
  }
  return {
    normalized,
    domain,
    migrationPhase,
    operation,
    key,
  };
}

function legacyMembershipReplacementEntryId(entry = {}) {
  return [
    normalizeModulePath(entry.modulePath),
    String(entry.exportName || ""),
    normalizeStateActionMembership(entry.retiredMembership),
  ].join("#");
}

export function validateStateActionLegacyMembershipReplacementContract(
  entries = STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT,
) {
  if (!Array.isArray(entries)) {
    return [createViolation(
      "state-action-legacy-membership-replacement-contract-invalid",
      { reason: "entries-not-array" },
    )];
  }
  const violations = [];
  const entryIds = entries.map(legacyMembershipReplacementEntryId);
  const sortedEntryIds = [...entryIds].sort((left, right) =>
    left.localeCompare(right)
  );
  if (JSON.stringify(entryIds) !== JSON.stringify(sortedEntryIds)) {
    violations.push(createViolation(
      "state-action-legacy-membership-replacement-order-invalid",
    ));
  }
  const seenEntryIds = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      violations.push(createViolation(
        "state-action-legacy-membership-replacement-entry-invalid",
        { index, reason: "entry-not-object" },
      ));
      continue;
    }
    const normalized =
      stateActionLegacyMembershipReplacementIdentityPayload(entry);
    const entryId = legacyMembershipReplacementEntryId(normalized);
    const retiredMembership = parseStateActionMembership(
      normalized.retiredMembership,
    );
    const requiredMemberships =
      normalized.requiredConcreteMemberships;
    const parsedRequiredMemberships = requiredMemberships.map(
      parseStateActionMembership,
    );
    const actionContract = CONTRACT_ENTRY_BY_ID.get(
      `${normalized.modulePath}#${normalized.exportName}`,
    );
    const requiredMembershipsSorted =
      [...requiredMemberships].sort((left, right) =>
        left.localeCompare(right)
      );
    const valid = Boolean(
      normalized.modulePath === String(entry.modulePath || "")
      && actionContract
      && retiredMembership?.key === "*"
      && ["assign", "delete"].includes(retiredMembership?.operation)
      && requiredMemberships.length > 0
      && JSON.stringify(requiredMemberships)
        === JSON.stringify(requiredMembershipsSorted)
      && new Set(requiredMemberships).size === requiredMemberships.length
      && parsedRequiredMemberships.every(
        (membership) =>
          membership
          && membership.key !== "*"
          && membership.operation === retiredMembership.operation,
      )
      && String(entry.contractIdentity || "")
        === buildStateActionLegacyMembershipReplacementContractIdentity(
          entry,
        )
    );
    if (!valid) {
      violations.push(createViolation(
        "state-action-legacy-membership-replacement-entry-invalid",
        {
          index,
          modulePath: normalized.modulePath,
          exportName: normalized.exportName,
          retiredMembership: normalized.retiredMembership,
        },
      ));
    }
    if (seenEntryIds.has(entryId)) {
      violations.push(createViolation(
        "state-action-legacy-membership-replacement-entry-duplicate",
        { index, entryId },
      ));
    }
    seenEntryIds.add(entryId);
  }
  return violations;
}

export function expandStateActionMembershipsWithLegacyReplacements({
  modulePath = "",
  exportName = "",
  memberships = [],
  contractEntries =
    STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT,
} = {}) {
  const effectiveMemberships = new Set(
    [...(memberships instanceof Set
      ? memberships
      : (Array.isArray(memberships) ? memberships : []))]
      .map(normalizeStateActionMembership)
      .filter(Boolean),
  );
  if (
    validateStateActionLegacyMembershipReplacementContract(
      contractEntries,
    ).length
  ) {
    return effectiveMemberships;
  }
  const normalizedModulePath = normalizeModulePath(modulePath);
  const normalizedExportName = String(exportName || "");
  for (const entry of contractEntries) {
    const retiredOperation = parseStateActionMembership(
      entry.retiredMembership,
    )?.operation;
    const concreteMembershipsForOperation = [...effectiveMemberships].filter(
      (membership) => {
        const parsed = parseStateActionMembership(membership);
        return parsed?.operation === retiredOperation && parsed.key !== "*";
      },
    );
    if (
      entry.modulePath !== normalizedModulePath
      || entry.exportName !== normalizedExportName
      || concreteMembershipsForOperation.length
        !== entry.requiredConcreteMemberships.length
      || !entry.requiredConcreteMemberships.every(
        (membership) => effectiveMemberships.has(membership),
      )
    ) {
      continue;
    }
    effectiveMemberships.add(entry.retiredMembership);
  }
  return effectiveMemberships;
}

export function getStateActionDelegationContractEntriesForModule(
  modulePath,
) {
  const normalizedPath = normalizeModulePath(modulePath);
  return STATE_ACTION_DELEGATION_CONTRACT.filter(
    (entry) => entry.modulePath === normalizedPath,
  );
}

function createViolation(code, details = {}) {
  return {
    code,
    ...details,
  };
}

function contractEntryId(entry = {}) {
  return [
    normalizeModulePath(entry.modulePath),
    String(entry.exportName || ""),
  ].join("#");
}

function isRegisteredReadOnlyExport(modulePath, exportName) {
  return STATE_ACTION_READ_ONLY_EXPORT_NAMES_BY_MODULE
    .get(normalizeModulePath(modulePath))
    ?.has(String(exportName || "")) === true;
}

export function findStateActionReadOnlyContractEntry(
  modulePath,
  exportName,
) {
  const normalizedPath = normalizeModulePath(modulePath);
  const normalizedExportName = String(exportName || "");
  if (
    !isRegisteredReadOnlyExport(
      normalizedPath,
      normalizedExportName,
    )
  ) {
    return null;
  }
  return Object.freeze({
    modulePath: normalizedPath,
    exportName: normalizedExportName,
    targetArgumentIndex: 0,
  });
}

function stateTargetPureReaderContractEntryId(entry = {}) {
  return [
    normalizeModulePath(entry.modulePath),
    String(entry.functionName || ""),
    Number(entry.targetParameterIndex),
    String(entry.targetParameterPath || ""),
  ].join("#");
}

export function findStateTargetPureReaderContractEntry(
  modulePath,
  functionName,
  targetParameterIndex,
  targetParameterPath,
) {
  return PURE_READER_ENTRY_BY_ID.get(
    [
      normalizeModulePath(modulePath),
      String(functionName || ""),
      Number(targetParameterIndex),
      String(targetParameterPath || ""),
    ].join("#"),
  ) || null;
}

export function getStateTargetPureReaderContractEntriesForModule(
  modulePath,
) {
  const normalizedPath = normalizeModulePath(modulePath);
  return STATE_TARGET_PURE_READER_CONTRACT.filter(
    (entry) => entry.modulePath === normalizedPath,
  );
}

export function validateStateTargetPureReaderContract(
  contractEntries = STATE_TARGET_PURE_READER_CONTRACT,
) {
  const violations = [];
  const seenEntryIds = new Set();
  for (
    const [index, entry] of
    (Array.isArray(contractEntries) ? contractEntries : []).entries()
  ) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      violations.push(
        createViolation("state-target-pure-reader-entry-invalid", { index }),
      );
      continue;
    }
    const entryId = stateTargetPureReaderContractEntryId(entry);
    if (seenEntryIds.has(entryId)) {
      violations.push(
        createViolation("state-target-pure-reader-entry-duplicate", {
          index,
          entryId,
        }),
      );
    }
    seenEntryIds.add(entryId);
    if (
      !/^js\/[^/].*\.js$/.test(normalizeModulePath(entry.modulePath))
      || !isValidExportName(entry.functionName)
      || !isValidExportName(entry.targetParameterName)
      || !Number.isInteger(entry.targetParameterIndex)
      || entry.targetParameterIndex < 0
      || !String(entry.targetParameterPath || "")
      || !/^[a-f0-9]{64}$/.test(String(entry.sourceFingerprint || ""))
    ) {
      violations.push(
        createViolation("state-target-pure-reader-entry-shape-invalid", {
          index,
          entryId,
        }),
      );
    }
    const seenEscapes = new Set();
    for (
      const [escapeIndex, escape] of
      (
        Array.isArray(entry.acceptedEscapes)
          ? entry.acceptedEscapes
          : []
      ).entries()
    ) {
      const escapeIdentity = [
        String(escape?.reason || ""),
        String(escape?.key || ""),
        String(escape?.sourceFingerprint || ""),
      ].join("|");
      if (
        String(escape?.reason || "") !== "state-alias-escape"
        || !String(escape?.key || "")
        || !/^[a-f0-9]{64}$/.test(
          String(escape?.sourceFingerprint || ""),
        )
        || !Number.isInteger(escape?.count)
        || Number(escape.count) < 1
      ) {
        violations.push(
          createViolation("state-target-pure-reader-escape-invalid", {
            index,
            escapeIndex,
            entryId,
          }),
        );
      }
      if (String(escape?.key || "") === "*") {
        violations.push(
          createViolation(
            "state-target-pure-reader-escape-wildcard-forbidden",
            {
              index,
              escapeIndex,
              entryId,
            },
          ),
        );
      }
      if (seenEscapes.has(escapeIdentity)) {
        violations.push(
          createViolation("state-target-pure-reader-escape-duplicate", {
            index,
            escapeIndex,
            entryId,
            escapeIdentity,
          }),
        );
      }
      seenEscapes.add(escapeIdentity);
    }
    const seenConservativeFindings = new Set();
    for (
      const [findingIndex, finding] of
      (
        Array.isArray(entry.conservativeFindings)
          ? entry.conservativeFindings
          : []
      ).entries()
    ) {
      const findingIdentity = [
        String(finding?.enclosingFunctionIdentity || ""),
        String(finding?.reason || ""),
        String(finding?.operation || ""),
        String(finding?.key || ""),
        String(finding?.sourceFingerprint || ""),
      ].join("|");
      if (
        !String(finding?.enclosingFunctionIdentity || "")
        || String(finding?.reason || "") !== "state-alias-escape"
        || String(finding?.operation || "") !== "unsupported"
        || !String(finding?.key || "")
        || !/^[a-f0-9]{64}$/.test(
          String(finding?.sourceFingerprint || ""),
        )
        || !Number.isInteger(finding?.count)
        || Number(finding.count) < 1
      ) {
        violations.push(
          createViolation(
            "state-target-pure-reader-conservative-finding-invalid",
            {
              index,
              findingIndex,
              entryId,
            },
          ),
        );
      }
      if (seenConservativeFindings.has(findingIdentity)) {
        violations.push(
          createViolation(
            "state-target-pure-reader-conservative-finding-duplicate",
            {
              index,
              findingIndex,
              entryId,
              findingIdentity,
            },
          ),
        );
      }
      seenConservativeFindings.add(findingIdentity);
    }
  }
  return violations;
}

function staticPropertyName(property) {
  if (!property) {
    return "";
  }
  if (!property.computed && property.key?.type === "Identifier") {
    return property.key.name;
  }
  if (
    property.key?.type === "Literal"
    && ["string", "number"].includes(typeof property.key.value)
  ) {
    return String(property.key.value);
  }
  return "";
}

function collectParameterBindingPaths(
  pattern,
  path = "$",
  results = [],
) {
  if (!pattern) {
    return results;
  }
  if (pattern.type === "Identifier") {
    results.push({
      name: pattern.name,
      path,
    });
    return results;
  }
  if (pattern.type === "AssignmentPattern") {
    return collectParameterBindingPaths(pattern.left, path, results);
  }
  if (pattern.type === "RestElement") {
    return collectParameterBindingPaths(
      pattern.argument,
      `${path}/rest`,
      results,
    );
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties || []) {
      if (property.type === "RestElement") {
        collectParameterBindingPaths(
          property.argument,
          `${path}/rest`,
          results,
        );
        continue;
      }
      const propertyName = staticPropertyName(property);
      collectParameterBindingPaths(
        property.value,
        propertyName
          ? `${path}/property:${propertyName}`
          : `${path}/property:*`,
        results,
      );
    }
    return results;
  }
  if (pattern.type === "ArrayPattern") {
    for (
      let elementIndex = 0;
      elementIndex < (pattern.elements || []).length;
      elementIndex += 1
    ) {
      collectParameterBindingPaths(
        pattern.elements[elementIndex],
        `${path}/index:${elementIndex}`,
        results,
      );
    }
  }
  return results;
}

function findTopLevelFunctionDeclarations(ast, functionName) {
  const matches = [];
  for (const statement of ast?.body || []) {
    const declaration = statement.type === "ExportNamedDeclaration"
      ? statement.declaration
      : statement;
    if (
      declaration?.type === "FunctionDeclaration"
      && declaration.id?.name === functionName
    ) {
      matches.push(declaration);
    }
  }
  return matches;
}

export function inspectStateTargetPureReaderFunctionSource(
  source,
  entry,
) {
  const violations = validateStateTargetPureReaderContract([entry]);
  if (violations.length) {
    return {
      violations,
      functionSource: "",
      functionSourceFingerprint: "",
    };
  }
  let ast;
  try {
    ast = parseModuleSource(source);
  } catch (error) {
    return {
      violations: [
        createViolation("state-target-pure-reader-source-parse-failed", {
          modulePath: normalizeModulePath(entry.modulePath),
          functionName: String(entry.functionName || ""),
          message: String(error?.message || ""),
        }),
      ],
      functionSource: "",
      functionSourceFingerprint: "",
    };
  }
  const functions = findTopLevelFunctionDeclarations(
    ast,
    String(entry.functionName || ""),
  );
  if (functions.length !== 1) {
    return {
      violations: [
        createViolation(
          functions.length
            ? "state-target-pure-reader-function-duplicate"
            : "state-target-pure-reader-function-missing",
          {
            modulePath: normalizeModulePath(entry.modulePath),
            functionName: String(entry.functionName || ""),
            count: functions.length,
          },
        ),
      ],
      functionSource: "",
      functionSourceFingerprint: "",
    };
  }
  const [functionNode] = functions;
  const parameter = functionNode.params?.[entry.targetParameterIndex];
  const targetBindings = collectParameterBindingPaths(parameter).filter(
    ({ name, path }) =>
      name === entry.targetParameterName
      && path === entry.targetParameterPath,
  );
  if (targetBindings.length !== 1) {
    violations.push(
      createViolation("state-target-pure-reader-target-binding-missing", {
        modulePath: normalizeModulePath(entry.modulePath),
        functionName: String(entry.functionName || ""),
        targetParameterName: String(entry.targetParameterName || ""),
        targetParameterIndex: Number(entry.targetParameterIndex),
        targetParameterPath: String(entry.targetParameterPath || ""),
      }),
    );
  }
  const functionSource = String(source || "")
    .slice(functionNode.start, functionNode.end)
    .replaceAll("\r\n", "\n");
  const functionSourceFingerprint = createHash("sha256")
    .update(functionSource)
    .digest("hex");
  if (functionSourceFingerprint !== entry.sourceFingerprint) {
    violations.push(
      createViolation("state-target-pure-reader-source-drift", {
        modulePath: normalizeModulePath(entry.modulePath),
        functionName: String(entry.functionName || ""),
        expectedSourceFingerprint: String(entry.sourceFingerprint || ""),
        actualSourceFingerprint: functionSourceFingerprint,
      }),
    );
  }
  return {
    violations,
    functionSource,
    functionSourceFingerprint,
  };
}

function isValidActionModulePath(modulePath = "") {
  return /^js\/core\/state\/actions\/[^/]+\.js$/.test(
    normalizeModulePath(modulePath),
  );
}

function isValidExportName(exportName = "") {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(
    String(exportName || ""),
  );
}

function normalizeStateActionIntroducedPhase(value) {
  const phase = String(value || "").trim();
  if (!phase) {
    throw new Error("State action introduced phase is required.");
  }
  return normalizeP4StateActionPhase(phase);
}

export function validateStateActionDelegationContract(
  contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
) {
  const violations = [];
  const seenEntryIds = new Set();
  for (
    const [index, entry] of
    (Array.isArray(contractEntries) ? contractEntries : []).entries()
  ) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      violations.push(
        createViolation("state-action-contract-entry-invalid", { index }),
      );
      continue;
    }
    const rawModulePath = String(entry.modulePath || "");
    const modulePath = normalizeModulePath(rawModulePath);
    const exportName = String(entry.exportName || "");
    let introducedInPhase = "";
    try {
      introducedInPhase = normalizeStateActionIntroducedPhase(
        entry.introducedInPhase,
      );
    } catch {
      violations.push(
        createViolation(
          "state-action-contract-introduced-phase-invalid",
          {
            index,
            modulePath,
            introducedInPhase: String(
              entry.introducedInPhase || "",
            ),
          },
        ),
      );
    }
    if (
      rawModulePath !== modulePath
      || !isValidActionModulePath(modulePath)
    ) {
      violations.push(
        createViolation("state-action-contract-module-path-invalid", {
          index,
          modulePath,
        }),
      );
    }
    if (!isValidExportName(exportName) || exportName === "default") {
      violations.push(
        createViolation("state-action-contract-export-name-invalid", {
          index,
          modulePath,
          exportName,
        }),
      );
    }
    if (entry.targetArgumentIndex !== 0) {
      violations.push(
        createViolation("state-action-contract-target-index-invalid", {
          index,
          modulePath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
        }),
      );
    }
    if (
      entry.readOnlyArgumentIndexes !== undefined
      && !Array.isArray(entry.readOnlyArgumentIndexes)
    ) {
      violations.push(
        createViolation(
          "state-action-contract-read-only-argument-indexes-invalid",
          { index, modulePath, exportName },
        ),
      );
    } else {
      const seenReadOnlyIndexes = new Set();
      for (const readOnlyArgumentIndex of entry.readOnlyArgumentIndexes || []) {
        if (
          !Number.isInteger(readOnlyArgumentIndex)
          || readOnlyArgumentIndex < 0
          || readOnlyArgumentIndex === entry.targetArgumentIndex
          || seenReadOnlyIndexes.has(readOnlyArgumentIndex)
        ) {
          violations.push(
            createViolation(
              "state-action-contract-read-only-argument-index-invalid",
              {
                index,
                modulePath,
                exportName,
                readOnlyArgumentIndex,
              },
            ),
          );
        }
        seenReadOnlyIndexes.add(readOnlyArgumentIndex);
      }
    }
    const entryId = contractEntryId(entry);
    if (seenEntryIds.has(entryId)) {
      violations.push(
        createViolation("state-action-contract-entry-duplicate", {
          index,
          modulePath,
          exportName,
        }),
      );
    }
    seenEntryIds.add(entryId);
  }
  return violations;
}

export function validateStateActionModulePhaseAdmissions({
  modulePaths = [],
  phase,
  contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
} = {}) {
  let currentPhase = "";
  try {
    currentPhase = normalizeP4StateActionPhase(phase);
  } catch {
    return [
      createViolation("state-action-module-current-phase-invalid", {
        currentPhase: String(phase || ""),
      }),
    ];
  }
  const entries = Array.isArray(contractEntries)
    ? contractEntries
    : [];
  const violations = [];
  for (
    const modulePath of
    [...new Set((Array.isArray(modulePaths) ? modulePaths : [])
      .map(normalizeModulePath))]
      .sort()
  ) {
    const introducedPhases = new Set();
    for (
      const entry of entries.filter(
        (candidate) =>
          normalizeModulePath(candidate?.modulePath) === modulePath,
      )
    ) {
      try {
        introducedPhases.add(
          normalizeStateActionIntroducedPhase(
            entry.introducedInPhase,
          ),
        );
      } catch {
        violations.push(
          createViolation(
            "state-action-module-introduced-phase-invalid",
            {
              modulePath,
              introducedInPhase: String(
                entry?.introducedInPhase || "",
              ),
              currentPhase,
            },
          ),
        );
      }
    }
    if (!introducedPhases.size) {
      violations.push(
        createViolation("state-action-module-phase-ambiguous", {
          modulePath,
          introducedInPhases: [...introducedPhases].sort(),
          currentPhase,
        }),
      );
      continue;
    }
    const introducedInPhase = [...introducedPhases].reduce(
      (latestPhase, candidatePhase) =>
        compareP4StateActionPhases(candidatePhase, latestPhase) > 0
          ? candidatePhase
          : latestPhase,
    );
    if (
      compareP4StateActionPhases(
        introducedInPhase,
        currentPhase,
      ) > 0
    ) {
      violations.push(
        createViolation(
          "state-action-module-phase-not-admitted",
          {
            modulePath,
            introducedInPhase,
            currentPhase,
          },
        ),
      );
    }
  }
  return violations;
}

function parseModuleSource(source = "") {
  return parse(String(source || ""), {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
    allowHashBang: true,
  });
}

function staticExportedName(node) {
  if (node?.type === "Identifier") {
    return node.name;
  }
  if (node?.type === "Literal") {
    return String(node.value || "");
  }
  return "";
}

function declarationExportedNames(declaration) {
  if (!declaration) {
    return [];
  }
  if (
    ["FunctionDeclaration", "ClassDeclaration"].includes(declaration.type)
    && declaration.id?.type === "Identifier"
  ) {
    return [declaration.id.name];
  }
  if (declaration.type !== "VariableDeclaration") {
    return [];
  }
  return (declaration.declarations || [])
    .map(({ id }) => id?.type === "Identifier" ? id.name : "")
    .filter(Boolean);
}

function collectNamedExportShapes(ast) {
  const directFunctions = new Map();
  const nonDirectExports = new Map();
  const add = (target, exportName, node, shape) => {
    if (!exportName) {
      return;
    }
    if (!target.has(exportName)) {
      target.set(exportName, []);
    }
    target.get(exportName).push({ node, shape });
  };

  for (const statement of ast?.body || []) {
    if (statement.type === "ExportAllDeclaration") {
      add(
        nonDirectExports,
        staticExportedName(statement.exported) || "*",
        statement,
        statement.exported ? "export-namespace" : "export-all",
      );
      continue;
    }
    if (statement.type === "ExportNamedDeclaration") {
      if (
        statement.declaration?.type === "FunctionDeclaration"
        && statement.declaration.id?.type === "Identifier"
      ) {
        add(
          directFunctions,
          statement.declaration.id.name,
          statement.declaration,
          "direct-function",
        );
      } else {
        for (
          const exportName of declarationExportedNames(
            statement.declaration,
          )
        ) {
          add(
            nonDirectExports,
            exportName,
            statement.declaration,
            `direct-${statement.declaration?.type || "declaration"}`,
          );
        }
      }
      for (const specifier of statement.specifiers || []) {
        add(
          nonDirectExports,
          staticExportedName(specifier.exported),
          specifier,
          statement.source ? "reexport" : "export-specifier",
        );
      }
      continue;
    }
    if (statement.type === "ExportDefaultDeclaration") {
      add(
        nonDirectExports,
        "default",
        statement.declaration,
        "default-export",
      );
    }
  }
  return { directFunctions, nonDirectExports };
}

export function validateStateActionModuleSource(
  source,
  {
    filePath = "",
    contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
  } = {},
) {
  const normalizedPath = normalizeModulePath(filePath);
  const entries = (Array.isArray(contractEntries) ? contractEntries : [])
    .filter(
      (entry) =>
        normalizeModulePath(entry?.modulePath) === normalizedPath,
    );
  const violations = validateStateActionDelegationContract(entries);

  let ast;
  try {
    ast = parseModuleSource(source);
  } catch (error) {
    return [
      ...violations,
      createViolation("state-action-source-parse-failed", {
        modulePath: normalizedPath,
        message: String(error?.message || ""),
      }),
    ];
  }

  const { directFunctions, nonDirectExports } =
    collectNamedExportShapes(ast);
  const registeredReadOnlyExportCount = [
    ...directFunctions.keys(),
    ...nonDirectExports.keys(),
  ].filter((exportName) => (
    isRegisteredReadOnlyExport(normalizedPath, exportName)
  )).length;
  if (!entries.length && registeredReadOnlyExportCount === 0) {
    violations.push(
      createViolation("state-action-module-contract-missing", {
        modulePath: normalizedPath,
      }),
    );
  }
  const registeredExportNames = new Set(
    entries.map(({ exportName }) => String(exportName || "")),
  );
  for (const [exportName, functions] of directFunctions) {
    if (
      registeredExportNames.has(exportName)
      || isRegisteredReadOnlyExport(normalizedPath, exportName)
    ) {
      continue;
    }
    for (const _function of functions) {
      violations.push(
        createViolation("state-action-direct-export-unregistered", {
          modulePath: normalizedPath,
          exportName,
        }),
      );
    }
  }
  for (const [exportName, exposures] of nonDirectExports) {
    if (
      registeredExportNames.has(exportName)
      || isRegisteredReadOnlyExport(normalizedPath, exportName)
    ) {
      continue;
    }
    for (const exposure of exposures) {
      violations.push(
        createViolation("state-action-export-unregistered", {
          modulePath: normalizedPath,
          exportName,
          shape: exposure.shape,
        }),
      );
    }
  }
  for (const entry of entries) {
    const exportName = String(entry.exportName || "");
    const functions = directFunctions.get(exportName) || [];
    const indirect = nonDirectExports.get(exportName) || [];
    if (!functions.length) {
      violations.push(
        createViolation("state-action-direct-export-missing", {
          modulePath: normalizedPath,
          exportName,
        }),
      );
    }
    if (functions.length > 1) {
      violations.push(
        createViolation("state-action-direct-export-duplicate", {
          modulePath: normalizedPath,
          exportName,
          count: functions.length,
        }),
      );
    }
    for (const exposure of indirect) {
      violations.push(
        createViolation("state-action-export-not-direct-function", {
          modulePath: normalizedPath,
          exportName,
          shape: exposure.shape,
          line: Number(exposure.node?.loc?.start?.line || 1),
          column: Number(exposure.node?.loc?.start?.column || 0) + 1,
        }),
      );
    }
    if (functions.length !== 1) {
      continue;
    }
    const targetParameter =
      functions[0].node.params?.[entry.targetArgumentIndex];
    if (!targetParameter) {
      violations.push(
        createViolation("state-action-target-parameter-missing", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
        }),
      );
    } else if (targetParameter.type !== "Identifier") {
      violations.push(
        createViolation("state-action-target-parameter-shape-invalid", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
          parameterType: targetParameter.type,
        }),
      );
    } else if (targetParameter.name !== "target") {
      violations.push(
        createViolation("state-action-target-parameter-name-invalid", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
          parameterName: targetParameter.name,
        }),
      );
    }
  }
  return violations;
}

function isSafeDomainActionTargetHelperAliasSite(
  binding = {},
  site = {},
) {
  return Boolean(
    binding.authority === "domain-action"
    && binding.kind === "function-parameter"
    && binding.parameterIndex === 0
    && String(binding.parameterPath || "") === "$"
    && String(binding.parameterName || "") === "target"
    && String(site.alias || "") === "target"
    && Array.isArray(site.aliasChain)
    && site.aliasChain.length >= 1
    && site.aliasChain.every((aliasName) => aliasName === "target")
    && String(site.key || "")
    && site.key !== "*"
    && /^[0-9a-f]{64}$/i.test(
      String(site.sourceFingerprint || ""),
    )
  );
}

function bindingDiagnosticCount(binding = {}) {
  return (binding.grants || []).reduce(
    (count, grant) =>
      count
      + (grant.aliasSites || []).filter(
        (site) =>
          !isSafeDomainActionTargetHelperAliasSite(binding, site),
      ).length
      + (grant.dynamicSites || []).length
      + (grant.ambiguousSites || []).length
      + (grant.unsupportedSites || []).length,
    0,
  );
}

export function validateStateActionPolicyBindings(
  policyOrWriters,
  {
    contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
    modulePaths = null,
  } = {},
) {
  const writers = Array.isArray(policyOrWriters)
    ? policyOrWriters
    : (policyOrWriters?.writers || []);
  const activeModulePaths = new Set(
    (
      Array.isArray(modulePaths)
        ? modulePaths
        : (contractEntries || []).map(({ modulePath }) => modulePath)
    ).map(normalizeModulePath),
  );
  const entries = (Array.isArray(contractEntries) ? contractEntries : [])
    .filter((entry) =>
      activeModulePaths.has(normalizeModulePath(entry?.modulePath))
    );
  const entriesByModulePath = new Map();
  for (const entry of entries) {
    const modulePath = normalizeModulePath(entry.modulePath);
    if (!entriesByModulePath.has(modulePath)) {
      entriesByModulePath.set(modulePath, []);
    }
    entriesByModulePath.get(modulePath).push(entry);
  }

  const violations = [];
  for (const [modulePath, moduleEntries] of entriesByModulePath) {
    const writer = writers.find(
      ({ path: writerPath }) =>
        normalizeModulePath(writerPath) === modulePath,
    );
    if (!writer) {
      violations.push(
        createViolation("state-action-policy-writer-missing", {
          modulePath,
        }),
      );
      continue;
    }
    if (writer.authority !== "domain-action") {
      violations.push(
        createViolation("state-action-policy-writer-authority-invalid", {
          modulePath,
          authority: writer.authority,
        }),
      );
    }
    const registeredNames = new Set(
      moduleEntries.map(({ exportName }) => String(exportName)),
    );
    for (const binding of writer.bindings || []) {
      if (
        binding.kind === "function-parameter"
        && !registeredNames.has(String(binding.functionName || ""))
      ) {
        violations.push(
          createViolation("state-action-policy-binding-unregistered", {
            modulePath,
            functionName: String(binding.functionName || ""),
          }),
        );
      }
    }
    for (const entry of moduleEntries) {
      const matches = (writer.bindings || []).filter(
        (binding) =>
          binding.functionName === entry.exportName,
      );
      if (!matches.length) {
        violations.push(
          createViolation("state-action-policy-binding-missing", {
            modulePath,
            exportName: entry.exportName,
          }),
        );
        continue;
      }
      if (matches.length > 1) {
        violations.push(
          createViolation("state-action-policy-binding-duplicate", {
            modulePath,
            exportName: entry.exportName,
            count: matches.length,
          }),
        );
      }
      for (const binding of matches) {
        if (
          binding.authority !== "domain-action"
          || binding.kind !== "function-parameter"
        ) {
          violations.push(
            createViolation(
              "state-action-policy-binding-authority-invalid",
              {
                modulePath,
                exportName: entry.exportName,
                authority: binding.authority,
                kind: binding.kind,
              },
            ),
          );
        }
        if (
          binding.parameterIndex !== entry.targetArgumentIndex
          || binding.parameterIndex !== 0
          || String(binding.parameterPath || "") !== "$"
        ) {
          violations.push(
            createViolation("state-action-policy-binding-shape-invalid", {
              modulePath,
              exportName: entry.exportName,
              parameterIndex: binding.parameterIndex,
              parameterPath: binding.parameterPath,
            }),
          );
        }
        const diagnosticCount = bindingDiagnosticCount(binding);
        if (diagnosticCount > 0) {
          violations.push(
            createViolation(
              "state-action-policy-binding-diagnostics-invalid",
              {
                modulePath,
                exportName: entry.exportName,
                diagnosticCount,
              },
            ),
          );
        }
      }
    }
  }
  return violations;
}
