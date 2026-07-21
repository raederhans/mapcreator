// Canonical scenario activation state authority.
// Rendering, observers, rollback orchestration, and recovery stay outside this module.

export const SCENARIO_ACTIVATION_STATE_KEYS = Object.freeze([
  "activeScenarioId",
  "scenarioBorderMode",
  "activeScenarioManifest",
  "mapSemanticMode",
  "scenarioCountriesByTag",
  "activeScenarioMeshPack",
  "scenarioRuntimeTopologyData",
  "runtimePoliticalTopology",
  "scenarioPoliticalChunkData",
  "runtimePoliticalMetaSeed",
  "runtimePoliticalFeatureCollectionSeed",
  "scenarioLandMaskData",
  "scenarioContextLandMaskData",
  "scenarioWaterRegionsData",
  "scenarioAtlantropaData",
  "scenarioRuntimeTopologyVersionTag",
  "scenarioLandMaskVersionTag",
  "scenarioContextLandMaskVersionTag",
  "scenarioWaterOverlayVersionTag",
  "scenarioSpecialRegionsData",
  "scenarioReliefOverlaysData",
  "scenarioReliefOverlayRevision",
  "scenarioStrategicValuesData",
  "scenarioStrategicValuesRevision",
  "scenarioDistrictGroupsData",
  "scenarioDistrictGroupByFeatureId",
  "releasableCatalog",
  "scenarioReleasableIndex",
  "scenarioAudit",
  "scenarioImportAudit",
  "scenarioBaselineHash",
  "scenarioBaselineOwnersByFeatureId",
  "scenarioAutoShellOwnerByFeatureId",
  "scenarioBaselineCoresByFeatureId",
  "scenarioShellOverlayRevision",
  "countryNames",
  "sovereigntyByFeatureId",
  "sovereigntyInitialized",
  "visualOverrides",
  "featureOverrides",
  "scenarioGeneratedColorTags",
  "scenarioFixedOwnerColors",
  "sovereignBaseColors",
  "countryBaseColors",
]);

const hasOwn = (target, key) =>
  Object.hasOwn(target, key);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_activation_actions] target must be an object");
  }
}

function validateCompletePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError("[scenario_activation_actions] patch must be an object");
  }
  for (const key of SCENARIO_ACTIVATION_STATE_KEYS) {
    if (!hasOwn(patch, key)) {
      throw new Error(
        `[scenario_activation_actions] commitScenarioActivationState missing required key: ${key}`,
      );
    }
  }
  if (!hasOwn(patch, "useDefaultRuntimePoliticalTopology")) {
    throw new Error(
      "[scenario_activation_actions] commitScenarioActivationState missing required key: useDefaultRuntimePoliticalTopology",
    );
  }
  if (typeof patch.useDefaultRuntimePoliticalTopology !== "boolean") {
    throw new TypeError(
      "[scenario_activation_actions] useDefaultRuntimePoliticalTopology must be a boolean",
    );
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("[scenario_activation_actions] snapshot must be an object");
  }
  const values = snapshot.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("[scenario_activation_actions] snapshot.values must be an object");
  }
  for (const key of SCENARIO_ACTIVATION_STATE_KEYS) {
    if (!hasOwn(values, key)) {
      throw new Error(
        `[scenario_activation_actions] restoreScenarioActivationState missing snapshot key: ${key}`,
      );
    }
  }
  if (
    !Array.isArray(snapshot.presentKeys)
    && !(snapshot.presentKeys instanceof Set)
  ) {
    throw new TypeError(
      "[scenario_activation_actions] snapshot.presentKeys must be an array or Set",
    );
  }
  const presentKeys = Array.from(snapshot.presentKeys);
  const allowedKeys = new Set(SCENARIO_ACTIVATION_STATE_KEYS);
  for (const key of presentKeys) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `[scenario_activation_actions] restoreScenarioActivationState contains unknown present key: ${key}`,
      );
    }
  }
  return { values, presentKeys: new Set(presentKeys) };
}

export function captureScenarioActivationState(target) {
  assertStateTarget(target);
  const presentKeys = SCENARIO_ACTIVATION_STATE_KEYS.filter((key) =>
    hasOwn(target, key)
  );
  const values = Object.fromEntries(
    SCENARIO_ACTIVATION_STATE_KEYS.map((key) => [key, target[key]]),
  );
  return Object.freeze({
    values: Object.freeze(values),
    presentKeys: Object.freeze(presentKeys),
  });
}

export function commitScenarioActivationState(target, patch) {
  assertStateTarget(target);
  validateCompletePatch(patch);
  target.activeScenarioId = patch.activeScenarioId;
  target.scenarioBorderMode = patch.scenarioBorderMode;
  target.activeScenarioManifest = patch.activeScenarioManifest;
  target.mapSemanticMode = patch.mapSemanticMode;
  target.scenarioCountriesByTag = patch.scenarioCountriesByTag;
  target.activeScenarioMeshPack = patch.activeScenarioMeshPack;
  target.scenarioRuntimeTopologyData = patch.scenarioRuntimeTopologyData;
  target.runtimePoliticalTopology = patch.useDefaultRuntimePoliticalTopology
    ? (target.defaultRuntimePoliticalTopology || null)
    : patch.runtimePoliticalTopology;
  target.scenarioPoliticalChunkData = patch.scenarioPoliticalChunkData;
  target.runtimePoliticalMetaSeed = patch.runtimePoliticalMetaSeed;
  target.runtimePoliticalFeatureCollectionSeed =
    patch.runtimePoliticalFeatureCollectionSeed;
  target.scenarioLandMaskData = patch.scenarioLandMaskData;
  target.scenarioContextLandMaskData = patch.scenarioContextLandMaskData;
  target.scenarioWaterRegionsData = patch.scenarioWaterRegionsData;
  target.scenarioAtlantropaData = patch.scenarioAtlantropaData;
  target.scenarioRuntimeTopologyVersionTag =
    patch.scenarioRuntimeTopologyVersionTag;
  target.scenarioLandMaskVersionTag = patch.scenarioLandMaskVersionTag;
  target.scenarioContextLandMaskVersionTag =
    patch.scenarioContextLandMaskVersionTag;
  target.scenarioWaterOverlayVersionTag =
    patch.scenarioWaterOverlayVersionTag;
  target.scenarioSpecialRegionsData = patch.scenarioSpecialRegionsData;
  target.scenarioReliefOverlaysData = patch.scenarioReliefOverlaysData;
  target.scenarioReliefOverlayRevision =
    patch.scenarioReliefOverlayRevision;
  target.scenarioStrategicValuesData = patch.scenarioStrategicValuesData;
  target.scenarioStrategicValuesRevision =
    patch.scenarioStrategicValuesRevision;
  target.scenarioDistrictGroupsData = patch.scenarioDistrictGroupsData;
  target.scenarioDistrictGroupByFeatureId =
    patch.scenarioDistrictGroupByFeatureId;
  target.releasableCatalog = patch.releasableCatalog;
  target.scenarioReleasableIndex = patch.scenarioReleasableIndex;
  target.scenarioAudit = patch.scenarioAudit;
  target.scenarioImportAudit = patch.scenarioImportAudit;
  target.scenarioBaselineHash = patch.scenarioBaselineHash;
  target.scenarioBaselineOwnersByFeatureId =
    { ...(patch.scenarioBaselineOwnersByFeatureId || {}) };
  target.scenarioAutoShellOwnerByFeatureId =
    { ...(patch.scenarioAutoShellOwnerByFeatureId || {}) };
  target.scenarioBaselineCoresByFeatureId =
    { ...(patch.scenarioBaselineCoresByFeatureId || {}) };
  target.scenarioShellOverlayRevision =
    patch.scenarioShellOverlayRevision;
  target.countryNames = { ...(patch.countryNames || {}) };
  target.sovereigntyByFeatureId =
    { ...(patch.sovereigntyByFeatureId || {}) };
  target.sovereigntyInitialized = patch.sovereigntyInitialized;
  target.visualOverrides = { ...(patch.visualOverrides || {}) };
  target.featureOverrides = { ...(patch.featureOverrides || {}) };
  target.scenarioGeneratedColorTags =
    Array.isArray(patch.scenarioGeneratedColorTags)
      ? [...patch.scenarioGeneratedColorTags]
      : [];
  target.scenarioFixedOwnerColors =
    { ...(patch.scenarioFixedOwnerColors || {}) };
  target.sovereignBaseColors = { ...(patch.sovereignBaseColors || {}) };
  target.countryBaseColors = { ...(patch.countryBaseColors || {}) };
  return true;
}

function restoreScenarioActivationBeforeAuditStateFromValidated(
  target,
  { values, presentKeys },
) {
  if (presentKeys.has("activeScenarioId")) {
    target.activeScenarioId = values.activeScenarioId;
  } else {
    delete target.activeScenarioId;
  }
  if (presentKeys.has("scenarioBorderMode")) {
    target.scenarioBorderMode = values.scenarioBorderMode;
  } else {
    delete target.scenarioBorderMode;
  }
  if (presentKeys.has("activeScenarioManifest")) {
    target.activeScenarioManifest = values.activeScenarioManifest;
  } else {
    delete target.activeScenarioManifest;
  }
  if (presentKeys.has("scenarioCountriesByTag")) {
    target.scenarioCountriesByTag = values.scenarioCountriesByTag;
  } else {
    delete target.scenarioCountriesByTag;
  }
  if (presentKeys.has("activeScenarioMeshPack")) {
    target.activeScenarioMeshPack = values.activeScenarioMeshPack;
  } else {
    delete target.activeScenarioMeshPack;
  }
  if (presentKeys.has("scenarioRuntimeTopologyData")) {
    target.scenarioRuntimeTopologyData = values.scenarioRuntimeTopologyData;
  } else {
    delete target.scenarioRuntimeTopologyData;
  }
  if (presentKeys.has("runtimePoliticalTopology")) {
    target.runtimePoliticalTopology = values.runtimePoliticalTopology;
  } else {
    delete target.runtimePoliticalTopology;
  }
  if (presentKeys.has("runtimePoliticalMetaSeed")) {
    target.runtimePoliticalMetaSeed = values.runtimePoliticalMetaSeed;
  } else {
    delete target.runtimePoliticalMetaSeed;
  }
  if (presentKeys.has("runtimePoliticalFeatureCollectionSeed")) {
    target.runtimePoliticalFeatureCollectionSeed =
      values.runtimePoliticalFeatureCollectionSeed;
  } else {
    delete target.runtimePoliticalFeatureCollectionSeed;
  }
  if (presentKeys.has("scenarioLandMaskData")) {
    target.scenarioLandMaskData = values.scenarioLandMaskData;
  } else {
    delete target.scenarioLandMaskData;
  }
  if (presentKeys.has("scenarioContextLandMaskData")) {
    target.scenarioContextLandMaskData = values.scenarioContextLandMaskData;
  } else {
    delete target.scenarioContextLandMaskData;
  }
  if (presentKeys.has("scenarioWaterRegionsData")) {
    target.scenarioWaterRegionsData = values.scenarioWaterRegionsData;
  } else {
    delete target.scenarioWaterRegionsData;
  }
  if (presentKeys.has("scenarioAtlantropaData")) {
    target.scenarioAtlantropaData = values.scenarioAtlantropaData;
  } else {
    delete target.scenarioAtlantropaData;
  }
  if (presentKeys.has("scenarioRuntimeTopologyVersionTag")) {
    target.scenarioRuntimeTopologyVersionTag =
      values.scenarioRuntimeTopologyVersionTag;
  } else {
    delete target.scenarioRuntimeTopologyVersionTag;
  }
  if (presentKeys.has("scenarioLandMaskVersionTag")) {
    target.scenarioLandMaskVersionTag = values.scenarioLandMaskVersionTag;
  } else {
    delete target.scenarioLandMaskVersionTag;
  }
  if (presentKeys.has("scenarioContextLandMaskVersionTag")) {
    target.scenarioContextLandMaskVersionTag =
      values.scenarioContextLandMaskVersionTag;
  } else {
    delete target.scenarioContextLandMaskVersionTag;
  }
  if (presentKeys.has("scenarioWaterOverlayVersionTag")) {
    target.scenarioWaterOverlayVersionTag =
      values.scenarioWaterOverlayVersionTag;
  } else {
    delete target.scenarioWaterOverlayVersionTag;
  }
  if (presentKeys.has("scenarioSpecialRegionsData")) {
    target.scenarioSpecialRegionsData = values.scenarioSpecialRegionsData;
  } else {
    delete target.scenarioSpecialRegionsData;
  }
  if (presentKeys.has("scenarioReliefOverlaysData")) {
    target.scenarioReliefOverlaysData = values.scenarioReliefOverlaysData;
  } else {
    delete target.scenarioReliefOverlaysData;
  }
  if (presentKeys.has("scenarioReliefOverlayRevision")) {
    target.scenarioReliefOverlayRevision =
      values.scenarioReliefOverlayRevision;
  } else {
    delete target.scenarioReliefOverlayRevision;
  }
  if (presentKeys.has("scenarioStrategicValuesData")) {
    target.scenarioStrategicValuesData = values.scenarioStrategicValuesData;
  } else {
    delete target.scenarioStrategicValuesData;
  }
  if (presentKeys.has("scenarioStrategicValuesRevision")) {
    target.scenarioStrategicValuesRevision =
      values.scenarioStrategicValuesRevision;
  } else {
    delete target.scenarioStrategicValuesRevision;
  }
  if (presentKeys.has("scenarioDistrictGroupsData")) {
    target.scenarioDistrictGroupsData = values.scenarioDistrictGroupsData;
  } else {
    delete target.scenarioDistrictGroupsData;
  }
  if (presentKeys.has("scenarioDistrictGroupByFeatureId")) {
    target.scenarioDistrictGroupByFeatureId =
      values.scenarioDistrictGroupByFeatureId;
  } else {
    delete target.scenarioDistrictGroupByFeatureId;
  }
  if (presentKeys.has("releasableCatalog")) {
    target.releasableCatalog = values.releasableCatalog;
  } else {
    delete target.releasableCatalog;
  }
  if (presentKeys.has("scenarioReleasableIndex")) {
    target.scenarioReleasableIndex = values.scenarioReleasableIndex;
  } else {
    delete target.scenarioReleasableIndex;
  }
  if (presentKeys.has("scenarioAudit")) {
    target.scenarioAudit = values.scenarioAudit;
  } else {
    delete target.scenarioAudit;
  }
  if (presentKeys.has("scenarioGeneratedColorTags")) {
    target.scenarioGeneratedColorTags = values.scenarioGeneratedColorTags;
  } else {
    delete target.scenarioGeneratedColorTags;
  }
  if (presentKeys.has("scenarioFixedOwnerColors")) {
    target.scenarioFixedOwnerColors = values.scenarioFixedOwnerColors;
  } else {
    delete target.scenarioFixedOwnerColors;
  }
}

function restoreScenarioActivationBeforeColorDirtyStateFromValidated(
  target,
  { values, presentKeys },
) {
  if (presentKeys.has("mapSemanticMode")) {
    target.mapSemanticMode = values.mapSemanticMode;
  } else {
    delete target.mapSemanticMode;
  }
  if (presentKeys.has("scenarioImportAudit")) {
    target.scenarioImportAudit = values.scenarioImportAudit;
  } else {
    delete target.scenarioImportAudit;
  }
  if (presentKeys.has("scenarioBaselineHash")) {
    target.scenarioBaselineHash = values.scenarioBaselineHash;
  } else {
    delete target.scenarioBaselineHash;
  }
  if (presentKeys.has("scenarioBaselineOwnersByFeatureId")) {
    target.scenarioBaselineOwnersByFeatureId =
      values.scenarioBaselineOwnersByFeatureId;
  } else {
    delete target.scenarioBaselineOwnersByFeatureId;
  }
  if (presentKeys.has("scenarioAutoShellOwnerByFeatureId")) {
    target.scenarioAutoShellOwnerByFeatureId =
      values.scenarioAutoShellOwnerByFeatureId;
  } else {
    delete target.scenarioAutoShellOwnerByFeatureId;
  }
  if (presentKeys.has("scenarioBaselineCoresByFeatureId")) {
    target.scenarioBaselineCoresByFeatureId =
      values.scenarioBaselineCoresByFeatureId;
  } else {
    delete target.scenarioBaselineCoresByFeatureId;
  }
  if (presentKeys.has("scenarioShellOverlayRevision")) {
    target.scenarioShellOverlayRevision =
      values.scenarioShellOverlayRevision;
  } else {
    delete target.scenarioShellOverlayRevision;
  }
  if (presentKeys.has("countryNames")) {
    target.countryNames = values.countryNames;
  } else {
    delete target.countryNames;
  }
  if (presentKeys.has("sovereigntyByFeatureId")) {
    target.sovereigntyByFeatureId = values.sovereigntyByFeatureId;
  } else {
    delete target.sovereigntyByFeatureId;
  }
  if (presentKeys.has("sovereigntyInitialized")) {
    target.sovereigntyInitialized = values.sovereigntyInitialized;
  } else {
    delete target.sovereigntyInitialized;
  }
  if (presentKeys.has("visualOverrides")) {
    target.visualOverrides = values.visualOverrides;
  } else {
    delete target.visualOverrides;
  }
  if (presentKeys.has("featureOverrides")) {
    target.featureOverrides = values.featureOverrides;
  } else {
    delete target.featureOverrides;
  }
  if (presentKeys.has("sovereignBaseColors")) {
    target.sovereignBaseColors = values.sovereignBaseColors;
  } else {
    delete target.sovereignBaseColors;
  }
  if (presentKeys.has("countryBaseColors")) {
    target.countryBaseColors = values.countryBaseColors;
  } else {
    delete target.countryBaseColors;
  }
}

function restoreScenarioActivationAfterColorDirtyStateFromValidated(
  target,
  { values, presentKeys },
) {
  if (presentKeys.has("scenarioPoliticalChunkData")) {
    target.scenarioPoliticalChunkData = values.scenarioPoliticalChunkData;
  } else {
    delete target.scenarioPoliticalChunkData;
  }
}

export function restoreScenarioActivationBeforeAuditState(target, snapshot) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioActivationBeforeAuditStateFromValidated(
    target,
    validatedSnapshot,
  );
  return true;
}

export function restoreScenarioActivationBeforeColorDirtyState(
  target,
  snapshot,
) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioActivationBeforeColorDirtyStateFromValidated(
    target,
    validatedSnapshot,
  );
  return true;
}

export function restoreScenarioActivationAfterColorDirtyState(
  target,
  snapshot,
) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioActivationAfterColorDirtyStateFromValidated(
    target,
    validatedSnapshot,
  );
  return true;
}

export function restoreScenarioActivationState(target, snapshot) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioActivationBeforeAuditStateFromValidated(
    target,
    validatedSnapshot,
  );
  restoreScenarioActivationBeforeColorDirtyStateFromValidated(
    target,
    validatedSnapshot,
  );
  restoreScenarioActivationAfterColorDirtyStateFromValidated(
    target,
    validatedSnapshot,
  );
  return true;
}
