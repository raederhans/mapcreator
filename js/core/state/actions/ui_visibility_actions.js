// Canonical UI visibility mutations. Missing patch properties retain their current state.

const BOOLEAN_VISIBILITY_FIELDS = Object.freeze([
  "showWaterRegions",
  "showOpenOceanRegions",
  "allowOpenOceanSelect",
  "allowOpenOceanPaint",
  "showScenarioSpecialRegions",
  "showScenarioAtlantropa",
  "showScenarioReliefOverlays",
  "showCityPoints",
  "showBlankFeatureLabels",
  "showStrategicResourceMarkers",
  "showUrban",
  "showPhysical",
  "showRivers",
  "showTransport",
  "showAirports",
  "showPorts",
  "showRail",
  "showRoad",
  "showSpecialZones",
]);

function isStateTarget(target) {
  return !!target && typeof target === "object" && !Array.isArray(target);
}

function setVisibilityField(target, field, value) {
  switch (field) {
    case "showWaterRegions": target.showWaterRegions = value; break;
    case "showOpenOceanRegions": target.showOpenOceanRegions = value; break;
    case "allowOpenOceanSelect": target.allowOpenOceanSelect = value; break;
    case "allowOpenOceanPaint": target.allowOpenOceanPaint = value; break;
    case "showScenarioSpecialRegions": target.showScenarioSpecialRegions = value; break;
    case "showScenarioAtlantropa": target.showScenarioAtlantropa = value; break;
    case "showScenarioReliefOverlays": target.showScenarioReliefOverlays = value; break;
    case "showCityPoints": target.showCityPoints = value; break;
    case "showBlankFeatureLabels": target.showBlankFeatureLabels = value; break;
    case "showStrategicResourceMarkers": target.showStrategicResourceMarkers = value; break;
    case "showUrban": target.showUrban = value; break;
    case "showPhysical": target.showPhysical = value; break;
    case "showRivers": target.showRivers = value; break;
    case "showTransport": target.showTransport = value; break;
    case "showAirports": target.showAirports = value; break;
    case "showPorts": target.showPorts = value; break;
    case "showRail": target.showRail = value; break;
    case "showRoad": target.showRoad = value; break;
    case "showSpecialZones": target.showSpecialZones = value; break;
    default: break;
  }
}

export function captureUiVisibilityState(target) {
  if (!isStateTarget(target)) return {};
  const snapshot = {};
  BOOLEAN_VISIBILITY_FIELDS.forEach((field) => {
    if (Object.hasOwn(target, field)) snapshot[field] = !!target[field];
  });
  if (Object.hasOwn(target, "strategicChoroplethMetric")) {
    snapshot.strategicChoroplethMetric = String(
      target.strategicChoroplethMetric || "",
    ).trim();
  }
  return snapshot;
}

export function commitUiVisibilityState(target, patch = {}) {
  if (!isStateTarget(target) || !isStateTarget(patch)) return null;
  BOOLEAN_VISIBILITY_FIELDS.forEach((field) => {
    if (Object.hasOwn(patch, field)) setVisibilityField(target, field, !!patch[field]);
  });
  if (Object.hasOwn(patch, "strategicChoroplethMetric")) {
    target.strategicChoroplethMetric = String(patch.strategicChoroplethMetric || "").trim();
  }
  return captureUiVisibilityState(target);
}

export function restoreUiVisibilityState(target, snapshot = {}) {
  if (!isStateTarget(target) || !isStateTarget(snapshot)) return null;
  const detachedSnapshot = { ...snapshot };
  return commitUiVisibilityState(target, detachedSnapshot);
}

export function restoreImportedLayerVisibilityState(target, layerVisibility = null) {
  if (!isStateTarget(target) || !isStateTarget(layerVisibility)) return null;
  const detachedVisibility = { ...layerVisibility };
  return commitUiVisibilityState(target, detachedVisibility);
}
