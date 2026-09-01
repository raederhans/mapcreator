// Canonical scenario presentation state authority.
// UI publication, DOM work, rendering, and persistence remain in composition roots.

export const SCENARIO_PRESENTATION_STATE_KEYS = Object.freeze([
  "scenarioParentBorderEnabledBeforeActivate",
  "scenarioDisplaySettingsBeforeActivate",
  "scenarioOceanFillBeforeActivate",
  "scenarioOceanStyleBeforeActivate",
  "scenarioPresentationStyleBeforeActivate",
  "activeSovereignCode",
  "selectedWaterRegionId",
  "selectedSpecialRegionId",
  "hoveredWaterRegionId",
  "hoveredSpecialRegionId",
  "selectedInspectorCountryCode",
  "inspectorHighlightCountryCode",
  "inspectorExpansionInitialized",
  "expandedInspectorContinents",
  "expandedInspectorReleaseParents",
  "parentBordersVisible",
  "parentBorderEnabledByCountry",
  "scenarioPaintModeBeforeActivate",
  "paintMode",
  "interactionGranularity",
  "batchFillScope",
  "ui",
  "styleConfig",
  "locales",
  "geoAliasToStableKey",
  "scenarioGeoLocalePatchData",
  "scenarioCityOverridesData",
  "cityLayerRevision",
  "scenarioAuditUi",
  "renderProfile",
  "dynamicBordersEnabled",
  "showCityPoints",
  "showWaterRegions",
  "showScenarioSpecialRegions",
  "showScenarioAtlantropa",
  "showScenarioReliefOverlays",
  "showStrategicResourceMarkers",
  "strategicChoroplethMetric",
]);

const hasOwn = (target, key) =>
  Object.hasOwn(target, key);

const SCENARIO_STYLE_DEFAULTS_KEYS_BY_GROUP = Object.freeze({
  ocean: Object.freeze([
    "preset",
    "fillColor",
    "opacity",
    "scale",
    "contourStrength",
    "experimentalAdvancedStyles",
    "coastalAccentEnabled",
    "shallowBandFadeEndZoom",
    "midBandFadeEndZoom",
    "deepBandFadeEndZoom",
    "scenarioSyntheticContourFadeEndZoom",
    "scenarioShallowContourFadeEndZoom",
  ]),
  internalBorders: Object.freeze(["color", "colorMode", "opacity", "width"]),
  empireBorders: Object.freeze(["color", "opacity", "width"]),
  coastlines: Object.freeze(["color", "opacity", "width"]),
});

function readScenarioStyleDefaultsGroupPatch(styleOverride, groupKey) {
  if (!hasOwn(styleOverride, groupKey)) {
    return null;
  }
  const patch = styleOverride[groupKey];
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError(
      `[scenario_presentation_actions] styleOverride.${groupKey} must be an object`,
    );
  }
  const allowedKeys = SCENARIO_STYLE_DEFAULTS_KEYS_BY_GROUP[groupKey];
  for (const key of Object.keys(patch)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(
        `[scenario_presentation_actions] styleOverride.${groupKey} contains unknown key: ${key}`,
      );
    }
  }
  return patch;
}

function validateScenarioStyleDefaultsPatch(styleOverride) {
  if (!styleOverride || typeof styleOverride !== "object" || Array.isArray(styleOverride)) {
    throw new TypeError("[scenario_presentation_actions] styleOverride must be an object");
  }
  for (const groupKey of Object.keys(styleOverride)) {
    if (!hasOwn(SCENARIO_STYLE_DEFAULTS_KEYS_BY_GROUP, groupKey)) {
      throw new Error(
        `[scenario_presentation_actions] styleOverride contains unknown group: ${groupKey}`,
      );
    }
  }
  return {
    ocean: readScenarioStyleDefaultsGroupPatch(styleOverride, "ocean"),
    internalBorders: readScenarioStyleDefaultsGroupPatch(
      styleOverride,
      "internalBorders",
    ),
    empireBorders: readScenarioStyleDefaultsGroupPatch(
      styleOverride,
      "empireBorders",
    ),
    coastlines: readScenarioStyleDefaultsGroupPatch(styleOverride, "coastlines"),
  };
}

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[scenario_presentation_actions] target must be an object");
  }
}

export function captureActiveScenarioPerformanceHintsState(target) {
  assertStateTarget(target);
  return Object.freeze({
    values: Object.freeze({
      activeScenarioPerformanceHints:
        target.activeScenarioPerformanceHints,
    }),
  });
}

export function setActiveScenarioPerformanceHintsState(target, value) {
  assertStateTarget(target);
  target.activeScenarioPerformanceHints = value;
  return value;
}

export function clearClickScenarioHoverIdsState(target) {
  assertStateTarget(target);
  target.hoveredWaterRegionId = null;
  target.hoveredSpecialRegionId = null;
}

export function setClickSelectedWaterRegionIdState(target, regionId = "") {
  assertStateTarget(target);
  const normalizedId = String(regionId || "").trim();
  target.selectedWaterRegionId = normalizedId;
  return normalizedId;
}

export function setClickSelectedSpecialRegionIdState(target, regionId = "") {
  assertStateTarget(target);
  const normalizedId = String(regionId || "").trim();
  target.selectedSpecialRegionId = normalizedId;
  return normalizedId;
}

export function setClickActiveSovereignCodeState(target, ownerCode = "") {
  assertStateTarget(target);
  const normalizedCode = String(ownerCode || "").trim();
  target.activeSovereignCode = normalizedCode;
  return normalizedCode;
}

export function setDayNightStyleConfigState(target, config) {
  assertStateTarget(target);
  if (!target.styleConfig || typeof target.styleConfig !== "object") {
    target.styleConfig = {};
  }
  target.styleConfig.dayNight = config;
  return config;
}

export function mergeScenarioStyleDefaultsState(target, styleOverride) {
  assertStateTarget(target);
  const {
    ocean: oceanPatch,
    internalBorders: internalBordersPatch,
    empireBorders: empireBordersPatch,
    coastlines: coastlinesPatch,
  } = validateScenarioStyleDefaultsPatch(styleOverride);
  if (
    !oceanPatch
    && !internalBordersPatch
    && !empireBordersPatch
    && !coastlinesPatch
  ) {
    return true;
  }
  if (
    !target.styleConfig
    || typeof target.styleConfig !== "object"
    || Array.isArray(target.styleConfig)
  ) {
    target.styleConfig = {};
  }

  if (oceanPatch) {
    if (
      !target.styleConfig.ocean
      || typeof target.styleConfig.ocean !== "object"
      || Array.isArray(target.styleConfig.ocean)
    ) {
      target.styleConfig.ocean = {};
    }
    if (hasOwn(oceanPatch, "preset")) {
      target.styleConfig.ocean.preset = oceanPatch.preset;
    }
    if (hasOwn(oceanPatch, "fillColor")) {
      target.styleConfig.ocean.fillColor = oceanPatch.fillColor;
    }
    if (hasOwn(oceanPatch, "opacity")) {
      target.styleConfig.ocean.opacity = oceanPatch.opacity;
    }
    if (hasOwn(oceanPatch, "scale")) {
      target.styleConfig.ocean.scale = oceanPatch.scale;
    }
    if (hasOwn(oceanPatch, "contourStrength")) {
      target.styleConfig.ocean.contourStrength = oceanPatch.contourStrength;
    }
    if (hasOwn(oceanPatch, "experimentalAdvancedStyles")) {
      target.styleConfig.ocean.experimentalAdvancedStyles =
        oceanPatch.experimentalAdvancedStyles;
    }
    if (hasOwn(oceanPatch, "coastalAccentEnabled")) {
      target.styleConfig.ocean.coastalAccentEnabled =
        oceanPatch.coastalAccentEnabled;
    }
    if (hasOwn(oceanPatch, "shallowBandFadeEndZoom")) {
      target.styleConfig.ocean.shallowBandFadeEndZoom =
        oceanPatch.shallowBandFadeEndZoom;
    }
    if (hasOwn(oceanPatch, "midBandFadeEndZoom")) {
      target.styleConfig.ocean.midBandFadeEndZoom =
        oceanPatch.midBandFadeEndZoom;
    }
    if (hasOwn(oceanPatch, "deepBandFadeEndZoom")) {
      target.styleConfig.ocean.deepBandFadeEndZoom =
        oceanPatch.deepBandFadeEndZoom;
    }
    if (hasOwn(oceanPatch, "scenarioSyntheticContourFadeEndZoom")) {
      target.styleConfig.ocean.scenarioSyntheticContourFadeEndZoom =
        oceanPatch.scenarioSyntheticContourFadeEndZoom;
    }
    if (hasOwn(oceanPatch, "scenarioShallowContourFadeEndZoom")) {
      target.styleConfig.ocean.scenarioShallowContourFadeEndZoom =
        oceanPatch.scenarioShallowContourFadeEndZoom;
    }
  }

  if (internalBordersPatch) {
    if (
      !target.styleConfig.internalBorders
      || typeof target.styleConfig.internalBorders !== "object"
      || Array.isArray(target.styleConfig.internalBorders)
    ) {
      target.styleConfig.internalBorders = {};
    }
    if (hasOwn(internalBordersPatch, "color")) {
      target.styleConfig.internalBorders.color = internalBordersPatch.color;
    }
    if (hasOwn(internalBordersPatch, "colorMode")) {
      target.styleConfig.internalBorders.colorMode =
        internalBordersPatch.colorMode;
    }
    if (hasOwn(internalBordersPatch, "opacity")) {
      target.styleConfig.internalBorders.opacity = internalBordersPatch.opacity;
    }
    if (hasOwn(internalBordersPatch, "width")) {
      target.styleConfig.internalBorders.width = internalBordersPatch.width;
    }
  }

  if (empireBordersPatch) {
    if (
      !target.styleConfig.empireBorders
      || typeof target.styleConfig.empireBorders !== "object"
      || Array.isArray(target.styleConfig.empireBorders)
    ) {
      target.styleConfig.empireBorders = {};
    }
    if (hasOwn(empireBordersPatch, "color")) {
      target.styleConfig.empireBorders.color = empireBordersPatch.color;
    }
    if (hasOwn(empireBordersPatch, "opacity")) {
      target.styleConfig.empireBorders.opacity = empireBordersPatch.opacity;
    }
    if (hasOwn(empireBordersPatch, "width")) {
      target.styleConfig.empireBorders.width = empireBordersPatch.width;
    }
  }

  if (coastlinesPatch) {
    if (
      !target.styleConfig.coastlines
      || typeof target.styleConfig.coastlines !== "object"
      || Array.isArray(target.styleConfig.coastlines)
    ) {
      target.styleConfig.coastlines = {};
    }
    if (hasOwn(coastlinesPatch, "color")) {
      target.styleConfig.coastlines.color = coastlinesPatch.color;
    }
    if (hasOwn(coastlinesPatch, "opacity")) {
      target.styleConfig.coastlines.opacity = coastlinesPatch.opacity;
    }
    if (hasOwn(coastlinesPatch, "width")) {
      target.styleConfig.coastlines.width = coastlinesPatch.width;
    }
  }
  return true;
}

function validateCompletePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError("[scenario_presentation_actions] patch must be an object");
  }
  for (const key of SCENARIO_PRESENTATION_STATE_KEYS) {
    if (!hasOwn(patch, key)) {
      throw new Error(
        `[scenario_presentation_actions] commitScenarioPresentationState missing required key: ${key}`,
      );
    }
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("[scenario_presentation_actions] snapshot must be an object");
  }
  const values = snapshot.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("[scenario_presentation_actions] snapshot.values must be an object");
  }
  for (const key of SCENARIO_PRESENTATION_STATE_KEYS) {
    if (!hasOwn(values, key)) {
      throw new Error(
        `[scenario_presentation_actions] restoreScenarioPresentationState missing snapshot key: ${key}`,
      );
    }
  }
  if (
    !Array.isArray(snapshot.presentKeys)
    && !(snapshot.presentKeys instanceof Set)
  ) {
    throw new TypeError(
      "[scenario_presentation_actions] snapshot.presentKeys must be an array or Set",
    );
  }
  const presentKeys = Array.from(snapshot.presentKeys);
  const allowedKeys = new Set(SCENARIO_PRESENTATION_STATE_KEYS);
  for (const key of presentKeys) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `[scenario_presentation_actions] restoreScenarioPresentationState contains unknown present key: ${key}`,
      );
    }
  }
  return { values, presentKeys: new Set(presentKeys) };
}

export function captureScenarioPresentationState(target) {
  assertStateTarget(target);
  const presentKeys = SCENARIO_PRESENTATION_STATE_KEYS.filter((key) =>
    hasOwn(target, key)
  );
  const values = Object.fromEntries(
    SCENARIO_PRESENTATION_STATE_KEYS.map((key) => [key, target[key]]),
  );
  return Object.freeze({
    values: Object.freeze(values),
    presentKeys: Object.freeze(presentKeys),
  });
}

export function commitScenarioPresentationState(target, patch) {
  assertStateTarget(target);
  validateCompletePatch(patch);
  target.scenarioParentBorderEnabledBeforeActivate =
    patch.scenarioParentBorderEnabledBeforeActivate;
  target.scenarioDisplaySettingsBeforeActivate =
    patch.scenarioDisplaySettingsBeforeActivate;
  target.scenarioOceanFillBeforeActivate =
    patch.scenarioOceanFillBeforeActivate;
  target.scenarioOceanStyleBeforeActivate =
    patch.scenarioOceanStyleBeforeActivate;
  target.scenarioPresentationStyleBeforeActivate =
    patch.scenarioPresentationStyleBeforeActivate;
  target.activeSovereignCode = patch.activeSovereignCode;
  target.selectedWaterRegionId = patch.selectedWaterRegionId;
  target.selectedSpecialRegionId = patch.selectedSpecialRegionId;
  target.hoveredWaterRegionId = patch.hoveredWaterRegionId;
  target.hoveredSpecialRegionId = patch.hoveredSpecialRegionId;
  target.selectedInspectorCountryCode =
    patch.selectedInspectorCountryCode;
  target.inspectorHighlightCountryCode =
    patch.inspectorHighlightCountryCode;
  target.inspectorExpansionInitialized =
    patch.inspectorExpansionInitialized;
  target.expandedInspectorContinents =
    patch.expandedInspectorContinents;
  target.expandedInspectorReleaseParents =
    patch.expandedInspectorReleaseParents;
  target.parentBordersVisible = patch.parentBordersVisible;
  target.parentBorderEnabledByCountry =
    patch.parentBorderEnabledByCountry;
  target.scenarioPaintModeBeforeActivate =
    patch.scenarioPaintModeBeforeActivate;
  target.paintMode = patch.paintMode;
  target.interactionGranularity = patch.interactionGranularity;
  target.batchFillScope = patch.batchFillScope;
  target.ui = patch.ui;
  target.styleConfig = patch.styleConfig;
  target.locales = patch.locales;
  target.geoAliasToStableKey = patch.geoAliasToStableKey;
  target.scenarioGeoLocalePatchData =
    patch.scenarioGeoLocalePatchData;
  target.scenarioCityOverridesData =
    patch.scenarioCityOverridesData;
  target.cityLayerRevision = patch.cityLayerRevision;
  target.scenarioAuditUi = patch.scenarioAuditUi;
  target.renderProfile = patch.renderProfile;
  target.dynamicBordersEnabled = patch.dynamicBordersEnabled;
  target.showCityPoints = patch.showCityPoints;
  target.showWaterRegions = patch.showWaterRegions;
  target.showScenarioSpecialRegions = patch.showScenarioSpecialRegions;
  target.showScenarioAtlantropa = patch.showScenarioAtlantropa;
  target.showScenarioReliefOverlays =
    patch.showScenarioReliefOverlays;
  target.showStrategicResourceMarkers =
    patch.showStrategicResourceMarkers;
  target.strategicChoroplethMetric =
    patch.strategicChoroplethMetric;
  return true;
}

function restoreScenarioPresentationBeforeAuditStateFromValidated(
  target,
  { values, presentKeys },
) {
  if (presentKeys.has("scenarioGeoLocalePatchData")) {
    target.scenarioGeoLocalePatchData =
      values.scenarioGeoLocalePatchData;
  } else {
    delete target.scenarioGeoLocalePatchData;
  }
  if (presentKeys.has("scenarioCityOverridesData")) {
    target.scenarioCityOverridesData =
      values.scenarioCityOverridesData;
  } else {
    delete target.scenarioCityOverridesData;
  }
  if (presentKeys.has("cityLayerRevision")) {
    target.cityLayerRevision = values.cityLayerRevision;
  } else {
    delete target.cityLayerRevision;
  }
}

function restoreScenarioPresentationStateFromValidated(
  target,
  { values, presentKeys },
  { preserveTransactionNestedState = false } = {},
) {
  if (presentKeys.has("scenarioParentBorderEnabledBeforeActivate")) {
    target.scenarioParentBorderEnabledBeforeActivate =
      values.scenarioParentBorderEnabledBeforeActivate;
  } else {
    delete target.scenarioParentBorderEnabledBeforeActivate;
  }
  if (presentKeys.has("scenarioDisplaySettingsBeforeActivate")) {
    target.scenarioDisplaySettingsBeforeActivate =
      values.scenarioDisplaySettingsBeforeActivate;
  } else {
    delete target.scenarioDisplaySettingsBeforeActivate;
  }
  if (presentKeys.has("scenarioOceanFillBeforeActivate")) {
    target.scenarioOceanFillBeforeActivate =
      values.scenarioOceanFillBeforeActivate;
  } else {
    delete target.scenarioOceanFillBeforeActivate;
  }
  if (presentKeys.has("scenarioOceanStyleBeforeActivate")) {
    target.scenarioOceanStyleBeforeActivate =
      values.scenarioOceanStyleBeforeActivate;
  } else {
    delete target.scenarioOceanStyleBeforeActivate;
  }
  if (presentKeys.has("scenarioPresentationStyleBeforeActivate")) {
    target.scenarioPresentationStyleBeforeActivate =
      values.scenarioPresentationStyleBeforeActivate;
  } else {
    delete target.scenarioPresentationStyleBeforeActivate;
  }
  if (presentKeys.has("activeSovereignCode")) {
    target.activeSovereignCode = values.activeSovereignCode;
  } else {
    delete target.activeSovereignCode;
  }
  if (presentKeys.has("selectedWaterRegionId")) {
    target.selectedWaterRegionId = values.selectedWaterRegionId;
  } else {
    delete target.selectedWaterRegionId;
  }
  if (presentKeys.has("selectedSpecialRegionId")) {
    target.selectedSpecialRegionId = values.selectedSpecialRegionId;
  } else {
    delete target.selectedSpecialRegionId;
  }
  if (presentKeys.has("hoveredWaterRegionId")) {
    target.hoveredWaterRegionId = values.hoveredWaterRegionId;
  } else {
    delete target.hoveredWaterRegionId;
  }
  if (presentKeys.has("hoveredSpecialRegionId")) {
    target.hoveredSpecialRegionId = values.hoveredSpecialRegionId;
  } else {
    delete target.hoveredSpecialRegionId;
  }
  if (presentKeys.has("selectedInspectorCountryCode")) {
    target.selectedInspectorCountryCode =
      values.selectedInspectorCountryCode;
  } else {
    delete target.selectedInspectorCountryCode;
  }
  if (presentKeys.has("inspectorHighlightCountryCode")) {
    target.inspectorHighlightCountryCode =
      values.inspectorHighlightCountryCode;
  } else {
    delete target.inspectorHighlightCountryCode;
  }
  if (presentKeys.has("inspectorExpansionInitialized")) {
    target.inspectorExpansionInitialized =
      values.inspectorExpansionInitialized;
  } else {
    delete target.inspectorExpansionInitialized;
  }
  if (presentKeys.has("expandedInspectorContinents")) {
    target.expandedInspectorContinents =
      values.expandedInspectorContinents;
  } else {
    delete target.expandedInspectorContinents;
  }
  if (presentKeys.has("expandedInspectorReleaseParents")) {
    target.expandedInspectorReleaseParents =
      values.expandedInspectorReleaseParents;
  } else {
    delete target.expandedInspectorReleaseParents;
  }
  if (presentKeys.has("parentBordersVisible")) {
    target.parentBordersVisible = values.parentBordersVisible;
  } else {
    delete target.parentBordersVisible;
  }
  if (presentKeys.has("parentBorderEnabledByCountry")) {
    target.parentBorderEnabledByCountry =
      values.parentBorderEnabledByCountry;
  } else {
    delete target.parentBorderEnabledByCountry;
  }
  if (presentKeys.has("scenarioPaintModeBeforeActivate")) {
    target.scenarioPaintModeBeforeActivate =
      values.scenarioPaintModeBeforeActivate;
  } else {
    delete target.scenarioPaintModeBeforeActivate;
  }
  if (presentKeys.has("paintMode")) {
    target.paintMode = values.paintMode;
  } else {
    delete target.paintMode;
  }
  if (presentKeys.has("interactionGranularity")) {
    target.interactionGranularity = values.interactionGranularity;
  } else {
    delete target.interactionGranularity;
  }
  if (presentKeys.has("batchFillScope")) {
    target.batchFillScope = values.batchFillScope;
  } else {
    delete target.batchFillScope;
  }
  if (presentKeys.has("ui")) {
    if (preserveTransactionNestedState) {
      if (!target.ui || typeof target.ui !== "object") {
        target.ui = {};
      }
      target.ui.politicalEditingExpanded =
        values.ui.politicalEditingExpanded;
      target.ui.scenarioVisualAdjustmentsOpen =
        values.ui.scenarioVisualAdjustmentsOpen;
    } else {
      target.ui = values.ui;
    }
  } else {
    delete target.ui;
  }
  if (presentKeys.has("styleConfig")) {
    if (preserveTransactionNestedState) {
      if (!target.styleConfig || typeof target.styleConfig !== "object") {
        target.styleConfig = {};
      }
      target.styleConfig.ocean = values.styleConfig.ocean;
    } else {
      target.styleConfig = values.styleConfig;
    }
  } else {
    delete target.styleConfig;
  }
  if (presentKeys.has("locales")) {
    target.locales = values.locales;
  } else {
    delete target.locales;
  }
  if (presentKeys.has("geoAliasToStableKey")) {
    target.geoAliasToStableKey = values.geoAliasToStableKey;
  } else {
    delete target.geoAliasToStableKey;
  }
  if (!preserveTransactionNestedState) {
    restoreScenarioPresentationBeforeAuditStateFromValidated(
      target,
      { values, presentKeys },
    );
    if (presentKeys.has("scenarioAuditUi")) {
      target.scenarioAuditUi = values.scenarioAuditUi;
    } else {
      delete target.scenarioAuditUi;
    }
  }
  if (presentKeys.has("renderProfile")) {
    target.renderProfile = values.renderProfile;
  } else {
    delete target.renderProfile;
  }
  if (presentKeys.has("dynamicBordersEnabled")) {
    target.dynamicBordersEnabled = values.dynamicBordersEnabled;
  } else {
    delete target.dynamicBordersEnabled;
  }
  if (presentKeys.has("showCityPoints")) {
    target.showCityPoints = values.showCityPoints;
  } else {
    delete target.showCityPoints;
  }
  if (presentKeys.has("showWaterRegions")) {
    target.showWaterRegions = values.showWaterRegions;
  } else {
    delete target.showWaterRegions;
  }
  if (presentKeys.has("showScenarioSpecialRegions")) {
    target.showScenarioSpecialRegions =
      values.showScenarioSpecialRegions;
  } else {
    delete target.showScenarioSpecialRegions;
  }
  if (presentKeys.has("showScenarioAtlantropa")) {
    target.showScenarioAtlantropa = values.showScenarioAtlantropa;
  } else {
    delete target.showScenarioAtlantropa;
  }
  if (presentKeys.has("showScenarioReliefOverlays")) {
    target.showScenarioReliefOverlays =
      values.showScenarioReliefOverlays;
  } else {
    delete target.showScenarioReliefOverlays;
  }
  if (presentKeys.has("showStrategicResourceMarkers")) {
    target.showStrategicResourceMarkers =
      values.showStrategicResourceMarkers;
  } else {
    delete target.showStrategicResourceMarkers;
  }
  if (presentKeys.has("strategicChoroplethMetric")) {
    target.strategicChoroplethMetric =
      values.strategicChoroplethMetric;
  } else {
    delete target.strategicChoroplethMetric;
  }
}

export function restoreScenarioPresentationState(target, snapshot) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioPresentationStateFromValidated(target, validatedSnapshot);
  return true;
}

export function finalizeScenarioChunkCityExternalEffectState(target, token) {
  assertStateTarget(target);
  if (!token || token.type !== "scenario-city-restore-finalizer") return false;
  if (token.statePresent) target.scenarioCityOverridesData = token.stateValue;
  else delete target.scenarioCityOverridesData;
  if (token.revisionPresent) target.cityLayerRevision = token.revisionValue;
  else delete target.cityLayerRevision;
  return true;
}

export function applyScenarioChunkCityExternalEffectState(target, payload) {
  assertStateTarget(target);
  target.scenarioCityOverridesData = (
    payload === undefined
      ? target.scenarioCityOverridesData
      : payload
  ) || null;
  target.cityLayerRevision = Math.max(0, Number(target.cityLayerRevision || 0)) + 1;
  return true;
}

export function restoreScenarioTransactionPresentationBeforeAuditState(
  target,
  snapshot,
) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioPresentationBeforeAuditStateFromValidated(
    target,
    validatedSnapshot,
  );
  return true;
}

export function restoreScenarioTransactionPresentationState(
  target,
  snapshot,
) {
  assertStateTarget(target);
  const validatedSnapshot = validateSnapshot(snapshot);
  restoreScenarioPresentationStateFromValidated(
    target,
    validatedSnapshot,
    { preserveTransactionNestedState: true },
  );
  return true;
}
