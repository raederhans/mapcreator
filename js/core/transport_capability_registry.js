export const TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY = Object.freeze({
  mainMapBridge: "main_map_bridge",
  previewOnly: "preview_only",
  localBoard: "local_board",
});

export const TRANSPORT_OVERVIEW_VISUAL_MODES = Object.freeze(["distribution", "network", "coverage"]);

const TRANSPORT_OVERVIEW_VISIBILITY_FIELD_BY_FAMILY = Object.freeze({
  airport: "showAirports",
  port: "showPorts",
  rail: "showRail",
  road: "showRoad",
});

const TRANSPORT_OVERVIEW_DATA_LAYER_KEYS_BY_FAMILY = Object.freeze({
  airport: Object.freeze(["airports"]),
  port: Object.freeze(["ports"]),
  rail: Object.freeze(["railways", "rail_stations_major"]),
  road: Object.freeze(["roads"]),
});

const TRANSPORT_WORKBENCH_OVERVIEW_BRIDGE_SUPPORTED_VALUES = Object.freeze({
  airport: Object.freeze({
    airportTypes: Object.freeze([
      "company_managed",
      "national",
      "specific_local",
      "local",
      "other",
      "shared",
    ]),
    statuses: Object.freeze([
      "active",
      "paused",
      "unknown",
    ]),
  }),
  port: Object.freeze({
    legalDesignations: Object.freeze([
      "international_strategy",
      "international_hub",
      "important",
      "local",
      "shelter",
    ]),
    managerTypes: Object.freeze([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]),
  }),
});

const BASE_TRANSPORT_OVERVIEW_DEFAULTS = Object.freeze({
  airport: Object.freeze({
    opacity: 0.68,
    visualStrength: 0.4,
    primaryColor: "#1d4ed8",
    labelsEnabled: true,
    labelDensity: "sparse",
    labelMode: "both",
    coverageReach: 0.38,
    scopeLinkMode: "linked",
  }),
  port: Object.freeze({
    opacity: 0.64,
    visualStrength: 0.38,
    primaryColor: "#b45309",
    labelsEnabled: true,
    labelDensity: "sparse",
    labelMode: "mixed",
    coverageReach: 0.38,
    scopeLinkMode: "linked",
  }),
  rail: Object.freeze({
    opacity: 0.8,
    visualStrength: 0.72,
    primaryColor: "#0f172a",
    labelsEnabled: false,
    labelDensity: "sparse",
    labelMode: "name",
    coverageReach: 0.62,
    scopeLinkMode: "linked",
  }),
  road: Object.freeze({
    opacity: 0.84,
    visualStrength: 0.76,
    primaryColor: "#374151",
    labelsEnabled: false,
    labelDensity: "sparse",
    labelMode: "ref",
    coverageReach: 0.62,
    scopeLinkMode: "linked",
  }),
});

const createTransportCapabilityFamily = ({
  id,
  label,
  baseCapability,
  runtimeKind,
  geometryKind,
  previewKind = "live",
  applyCompatibility = TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.previewOnly,
  overviewSupport = true,
  overviewVisibilityField = "",
  overviewDataLayerKeys = [],
  defaultOverviewConfig = null,
  supportsDetailedControls = true,
  previewCarrierId = "japan",
  previewAssetId = "japan_carrier_v3",
  sampleCountry = "Japan",
  warmup = Object.freeze({ enabled: false, includeFull: false }),
}) => Object.freeze({
  id,
  label,
  baseCapability,
  runtimeKind,
  geometryKind,
  previewKind,
  applyCompatibility,
  overviewSupport,
  overviewVisibilityField,
  overviewDataLayerKeys: Object.freeze([...(overviewDataLayerKeys || [])]),
  defaultOverviewConfig,
  supportsDetailedControls,
  previewCarrierId,
  previewAssetId,
  sampleCountry,
  warmup,
});

export const TRANSPORT_CAPABILITY_REGISTRY = Object.freeze({
  road: createTransportCapabilityFamily({
    id: "road",
    label: "Road",
    baseCapability: "line",
    runtimeKind: "line",
    geometryKind: "line",
    applyCompatibility: TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge,
    overviewSupport: true,
    overviewVisibilityField: TRANSPORT_OVERVIEW_VISIBILITY_FIELD_BY_FAMILY.road,
    overviewDataLayerKeys: TRANSPORT_OVERVIEW_DATA_LAYER_KEYS_BY_FAMILY.road,
    defaultOverviewConfig: BASE_TRANSPORT_OVERVIEW_DEFAULTS.road,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
  rail: createTransportCapabilityFamily({
    id: "rail",
    label: "Rail",
    baseCapability: "line",
    runtimeKind: "line",
    geometryKind: "line",
    applyCompatibility: TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge,
    overviewSupport: true,
    overviewVisibilityField: TRANSPORT_OVERVIEW_VISIBILITY_FIELD_BY_FAMILY.rail,
    overviewDataLayerKeys: TRANSPORT_OVERVIEW_DATA_LAYER_KEYS_BY_FAMILY.rail,
    defaultOverviewConfig: BASE_TRANSPORT_OVERVIEW_DEFAULTS.rail,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
  airport: createTransportCapabilityFamily({
    id: "airport",
    label: "Airport",
    baseCapability: "point",
    runtimeKind: "point",
    geometryKind: "point",
    applyCompatibility: TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge,
    overviewSupport: true,
    overviewVisibilityField: TRANSPORT_OVERVIEW_VISIBILITY_FIELD_BY_FAMILY.airport,
    overviewDataLayerKeys: TRANSPORT_OVERVIEW_DATA_LAYER_KEYS_BY_FAMILY.airport,
    defaultOverviewConfig: BASE_TRANSPORT_OVERVIEW_DEFAULTS.airport,
    warmup: Object.freeze({ enabled: false, includeFull: true }),
  }),
  port: createTransportCapabilityFamily({
    id: "port",
    label: "Port",
    baseCapability: "point",
    runtimeKind: "point",
    geometryKind: "point",
    applyCompatibility: TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge,
    overviewSupport: true,
    overviewVisibilityField: TRANSPORT_OVERVIEW_VISIBILITY_FIELD_BY_FAMILY.port,
    overviewDataLayerKeys: TRANSPORT_OVERVIEW_DATA_LAYER_KEYS_BY_FAMILY.port,
    defaultOverviewConfig: BASE_TRANSPORT_OVERVIEW_DEFAULTS.port,
    warmup: Object.freeze({ enabled: false, includeFull: true }),
  }),
  mineral_resources: createTransportCapabilityFamily({
    id: "mineral_resources",
    label: "Mineral Resources",
    baseCapability: "point",
    runtimeKind: "point",
    geometryKind: "point",
    overviewSupport: false,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
  energy_facilities: createTransportCapabilityFamily({
    id: "energy_facilities",
    label: "Energy Facilities",
    baseCapability: "point",
    runtimeKind: "point",
    geometryKind: "point",
    overviewSupport: false,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
  industrial_zones: createTransportCapabilityFamily({
    id: "industrial_zones",
    label: "Industrial Land",
    baseCapability: "polygon",
    runtimeKind: "polygon",
    geometryKind: "polygon",
    overviewSupport: false,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
  logistics_hubs: createTransportCapabilityFamily({
    id: "logistics_hubs",
    label: "Logistics Hubs",
    baseCapability: "point",
    runtimeKind: "point",
    geometryKind: "point",
    overviewSupport: false,
    warmup: Object.freeze({ enabled: false, includeFull: true }),
  }),
  layers: createTransportCapabilityFamily({
    id: "layers",
    label: "Layers",
    baseCapability: "order_board",
    runtimeKind: "board",
    geometryKind: "none",
    previewKind: "local",
    applyCompatibility: TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.localBoard,
    overviewSupport: false,
    supportsDetailedControls: false,
    warmup: Object.freeze({ enabled: false, includeFull: false }),
  }),
});

export const TRANSPORT_CAPABILITY_FAMILY_IDS = Object.freeze(Object.keys(TRANSPORT_CAPABILITY_REGISTRY));
export const TRANSPORT_RUNTIME_CAPABILITY_FAMILY_IDS = Object.freeze(
  TRANSPORT_CAPABILITY_FAMILY_IDS.filter((familyId) => TRANSPORT_CAPABILITY_REGISTRY[familyId].runtimeKind !== "board")
);
export const TRANSPORT_OVERVIEW_CAPABILITY_FAMILY_IDS = Object.freeze(
  TRANSPORT_CAPABILITY_FAMILY_IDS.filter((familyId) => !!TRANSPORT_CAPABILITY_REGISTRY[familyId].overviewSupport)
);

function clampNumber(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function clampUnitInterval(value, fallback = 0.5) {
  return clampNumber(value, 0, 1, fallback);
}

function hasExactTransportWorkbenchBridgeValueSet(value, expectedValues) {
  const normalized = Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const deduped = Array.from(new Set(normalized));
  if (deduped.length !== expectedValues.length) return false;
  return expectedValues.every((entry) => deduped.includes(entry));
}

export function normalizeTransportOverviewVisualMode(value, fallback = "distribution") {
  const normalized = String(value || "").trim().toLowerCase();
  if (TRANSPORT_OVERVIEW_VISUAL_MODES.includes(normalized)) {
    return normalized;
  }
  return TRANSPORT_OVERVIEW_VISUAL_MODES.includes(fallback) ? fallback : "distribution";
}

export function resolveLinkedTransportOverviewScopeAndThreshold(familyId, coverageReach = 0.5) {
  const reach = clampUnitInterval(coverageReach, 0.5);
  switch (String(familyId || "").trim().toLowerCase()) {
    case "airport":
      if (reach >= 0.74) return { scope: "all_civil", importanceThreshold: "all" };
      if (reach >= 0.36) return { scope: "major_civil", importanceThreshold: "secondary" };
      return { scope: "international", importanceThreshold: "primary" };
    case "port":
      if (reach >= 0.74) return { scope: "expanded", importanceThreshold: "all" };
      if (reach >= 0.36) return { scope: "regional", importanceThreshold: "secondary" };
      return { scope: "core", importanceThreshold: "primary" };
    case "rail":
      if (reach >= 0.58) return { scope: "mainline_plus_regional", importanceThreshold: "secondary" };
      return { scope: "mainline_only", importanceThreshold: "primary" };
    case "road":
      if (reach >= 0.58) return { scope: "motorway_trunk", importanceThreshold: "secondary" };
      return { scope: "motorway_only", importanceThreshold: "primary" };
    default:
      return { scope: "default", importanceThreshold: "secondary" };
  }
}

export function resolveTransportOverviewScaleTier(scale = 1) {
  const normalizedScale = Math.max(0.1, Number(scale) || 1);
  if (normalizedScale < 1.65) return "world";
  if (normalizedScale < 4.1) return "regional";
  return "local";
}

export function getTransportOverviewImportanceThresholdRank(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "primary") return 3;
  if (normalized === "secondary") return 2;
  return 1;
}

export function getTransportOverviewScopeThresholdRank(familyId, scope) {
  const normalizedFamilyId = String(familyId || "").trim().toLowerCase();
  const normalizedScope = String(scope || "").trim().toLowerCase();
  if (normalizedFamilyId === "airport") {
    if (normalizedScope === "international") return 3;
    if (normalizedScope === "all_civil") return 1;
    return 2;
  }
  if (normalizedFamilyId === "port") {
    if (normalizedScope === "core") return 3;
    if (normalizedScope === "expanded") return 1;
    return 2;
  }
  if (normalizedFamilyId === "rail") {
    return normalizedScope === "mainline_only" ? 1 : 2;
  }
  if (normalizedFamilyId === "road") {
    return normalizedScope === "motorway_only" ? 1 : 2;
  }
  return 1;
}

function resolveTransportOverviewPointWorldFloor(familyId, visualMode) {
  if (visualMode === "coverage") return 2;
  if (familyId === "port") return 2;
  return 3;
}

export function resolveTransportOverviewPointStrategy(familyId, familyConfig = {}, { scale = 1, visualMode = "distribution" } = {}) {
  const normalizedMode = normalizeTransportOverviewVisualMode(visualMode);
  const scaleTier = resolveTransportOverviewScaleTier(scale);
  const baseThresholdRank = Math.max(
    getTransportOverviewImportanceThresholdRank(familyConfig.importanceThreshold),
    getTransportOverviewScopeThresholdRank(familyId, familyConfig.scope)
  );
  let thresholdRank = baseThresholdRank;
  let radiusMultiplier = normalizedMode === "coverage" ? 1.16 : 1;
  let strokeMultiplier = normalizedMode === "network" ? 0.95 : 1;
  let opacityMultiplier = normalizedMode === "coverage" ? 0.82 : (normalizedMode === "network" ? 0.9 : 1);
  let labelsEnabled = !!familyConfig.labelsEnabled;
  if (scaleTier === "world") {
    thresholdRank = Math.max(baseThresholdRank, resolveTransportOverviewPointWorldFloor(familyId, normalizedMode));
    radiusMultiplier *= normalizedMode === "coverage" ? 1.14 : 0.92;
    opacityMultiplier *= normalizedMode === "coverage" ? 0.78 : 0.7;
    labelsEnabled = false;
  } else if (scaleTier === "regional") {
    thresholdRank = Math.max(baseThresholdRank, 2);
    radiusMultiplier *= normalizedMode === "coverage" ? 1.08 : 0.98;
    opacityMultiplier *= normalizedMode === "network" ? 0.92 : 0.84;
    labelsEnabled = !!familyConfig.labelsEnabled && normalizedMode !== "coverage";
  }
  return {
    scaleTier,
    thresholdRank,
    radiusMultiplier,
    strokeMultiplier,
    opacityMultiplier,
    labelsEnabled,
  };
}

function getTransportOverviewLineRevealRankThreshold(familyId, value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (familyId === "rail") {
    return normalized === "primary" ? 1 : normalized === "secondary" ? 2 : 3;
  }
  return normalized === "primary" ? 1 : 2;
}

export function resolveTransportOverviewLineStrategy(familyId, familyConfig = {}, { scale = 1, visualMode = "distribution" } = {}) {
  const normalizedMode = normalizeTransportOverviewVisualMode(visualMode);
  const scaleTier = resolveTransportOverviewScaleTier(scale);
  const baseMinimumScopeRank = getTransportOverviewScopeThresholdRank(familyId, familyConfig.scope);
  const baseMaximumRevealRank = getTransportOverviewLineRevealRankThreshold(familyId, familyConfig.importanceThreshold);
  let minimumScopeRank = baseMinimumScopeRank;
  let maximumRevealRank = baseMaximumRevealRank;
  let widthMultiplier = normalizedMode === "network" ? 1.18 : 1;
  let opacityMultiplier = normalizedMode === "coverage" ? 0.92 : 1;
  let labelsEnabled = !!familyConfig.labelsEnabled;
  if (scaleTier === "world") {
    minimumScopeRank = Math.max(baseMinimumScopeRank, 2);
    maximumRevealRank = Math.max(baseMaximumRevealRank, 2);
    widthMultiplier *= normalizedMode === "network" ? 1.18 : (normalizedMode === "coverage" ? 1.2 : 1.12);
    opacityMultiplier *= normalizedMode === "network" ? 1.06 : (normalizedMode === "coverage" ? 0.94 : 1.02);
    labelsEnabled = false;
  } else if (scaleTier === "regional") {
    minimumScopeRank = Math.max(baseMinimumScopeRank, familyId === "rail" ? 2 : 2);
    maximumRevealRank = Math.max(baseMaximumRevealRank, 2);
    widthMultiplier *= normalizedMode === "network" ? 1.1 : 1.04;
    opacityMultiplier *= normalizedMode === "coverage" ? 0.96 : 1.02;
    labelsEnabled = !!familyConfig.labelsEnabled && normalizedMode !== "coverage";
  }
  return {
    scaleTier,
    minimumScopeRank,
    maximumRevealRank,
    widthMultiplier,
    opacityMultiplier,
    labelsEnabled,
  };
}

export function getTransportCapabilityFamilyMetadata(familyId) {
  const normalizedFamilyId = String(familyId || "").trim();
  return TRANSPORT_CAPABILITY_REGISTRY[normalizedFamilyId] || null;
}

export function listTransportCapabilityFamilyIds() {
  return [...TRANSPORT_CAPABILITY_FAMILY_IDS];
}

export function listTransportRuntimeCapabilityFamilyIds() {
  return [...TRANSPORT_RUNTIME_CAPABILITY_FAMILY_IDS];
}

export function listTransportOverviewCapabilityFamilyIds() {
  return [...TRANSPORT_OVERVIEW_CAPABILITY_FAMILY_IDS];
}

export function listTransportCapabilityWarmupPlans() {
  return TRANSPORT_RUNTIME_CAPABILITY_FAMILY_IDS
    .map((familyId) => ({
      familyId,
      ...(getTransportCapabilityFamilyMetadata(familyId)?.warmup || {}),
    }))
    .filter((plan) => plan.enabled !== false);
}

export function getTransportCapabilityApplyCompatibility(familyId) {
  return getTransportCapabilityFamilyMetadata(familyId)?.applyCompatibility || "";
}

export function getTransportWorkbenchOverviewBridgeSupport(familyId, familyConfig = {}) {
  const normalizedFamilyId = String(familyId || "").trim().toLowerCase();
  const compatibility = getTransportCapabilityApplyCompatibility(normalizedFamilyId);
  if (compatibility !== TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge) {
    return {
      supported: false,
      compatibility,
    };
  }
  if (normalizedFamilyId === "road" || normalizedFamilyId === "rail") {
    return {
      supported: false,
      compatibility,
    };
  }
  if (normalizedFamilyId === "airport") {
    const supportedValues = TRANSPORT_WORKBENCH_OVERVIEW_BRIDGE_SUPPORTED_VALUES.airport;
    return {
      supported:
        hasExactTransportWorkbenchBridgeValueSet(familyConfig.airportTypes, supportedValues.airportTypes)
        && hasExactTransportWorkbenchBridgeValueSet(familyConfig.statuses, supportedValues.statuses),
      compatibility,
    };
  }
  if (normalizedFamilyId === "port") {
    const supportedValues = TRANSPORT_WORKBENCH_OVERVIEW_BRIDGE_SUPPORTED_VALUES.port;
    return {
      supported:
        hasExactTransportWorkbenchBridgeValueSet(familyConfig.legalDesignations, supportedValues.legalDesignations)
        && hasExactTransportWorkbenchBridgeValueSet(familyConfig.managerTypes, supportedValues.managerTypes),
      compatibility,
    };
  }
  // Keep future main-map bridge families closed until they declare an exact
  // workbench-to-overview mapping rule here.
  return {
    supported: false,
    compatibility,
  };
}

export function supportsTransportCapabilityOverview(familyId) {
  return !!getTransportCapabilityFamilyMetadata(familyId)?.overviewSupport;
}

export function getTransportOverviewVisibilityField(familyId) {
  return String(getTransportCapabilityFamilyMetadata(familyId)?.overviewVisibilityField || "").trim();
}

export function getTransportOverviewDataLayerKeys(familyId) {
  return [...(getTransportCapabilityFamilyMetadata(familyId)?.overviewDataLayerKeys || [])];
}

export function getTransportCapabilityDefaultOverviewConfig(familyId) {
  const metadata = getTransportCapabilityFamilyMetadata(familyId);
  const defaults = metadata?.defaultOverviewConfig;
  if (!defaults) return null;
  const linked = resolveLinkedTransportOverviewScopeAndThreshold(familyId, defaults.coverageReach);
  return {
    ...defaults,
    scope: linked.scope,
    importanceThreshold: linked.importanceThreshold,
  };
}

export function isTransportCapabilityLivePreviewFamily(familyId) {
  return getTransportCapabilityFamilyMetadata(familyId)?.previewKind === "live";
}

export function isTransportCapabilityManifestOnlyFamily(familyId) {
  return getTransportCapabilityFamilyMetadata(familyId)?.previewKind === "manifest";
}

function mapTransportWorkbenchLabelDensityPresetToOverview(value, fallback = "balanced") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "very_sparse" || normalized === "sparse") return "sparse";
  if (normalized === "dense" || normalized === "very_dense") return "dense";
  if (normalized === "balanced") return "balanced";
  return fallback;
}

function resolveTransportWorkbenchApplyCoverageReach(familyId, familyConfig = {}, fallback = 0.5) {
  if (familyId === "road") {
    const roadClass = Array.isArray(familyConfig.roadClass) ? familyConfig.roadClass : [];
    if (roadClass.includes("primary")) return 0.82;
    if (roadClass.includes("trunk")) return 0.62;
    return 0.22;
  }
  if (familyId === "rail") {
    const importance = String(familyConfig.importanceThreshold || "").trim().toLowerCase();
    if (importance === "broad_major") return 0.82;
    if (importance === "regional_core") return 0.62;
    return 0.22;
  }
  if (familyId === "airport" || familyId === "port") {
    const importance = String(familyConfig.importanceThreshold || "").trim().toLowerCase();
    if (importance === "local_connector") return 0.82;
    if (importance === "regional_core") return 0.5;
    return 0.22;
  }
  return clampUnitInterval(fallback, 0.5);
}

function resolveWorkbenchOverviewVisualStrength(familyId, familyConfig = {}, fallback = 0.5) {
  if (familyId === "road") {
    const motorwayWidth = clampNumber(familyConfig.motorwayWidth, 1, 4, 2.8);
    const trunkWidth = clampNumber(familyConfig.trunkWidth, 0.8, 3.2, 2.0);
    const primaryWidth = clampNumber(familyConfig.primaryWidth, 0.6, 2.4, 1.18);
    return clampUnitInterval(((motorwayWidth / 3.4) + (trunkWidth / 2.6) + (primaryWidth / 1.8)) / 3, fallback);
  }
  if (familyId === "rail") {
    const lineOpacity = clampNumber(familyConfig.lineOpacity, 40, 100, 92) / 100;
    const stationOpacity = clampNumber(familyConfig.stationOpacity, 40, 100, 86) / 100;
    return clampUnitInterval((lineOpacity * 0.72) + (stationOpacity * 0.28), fallback);
  }
  if (familyId === "airport" || familyId === "port") {
    const baseOpacity = clampNumber(familyConfig.baseOpacity, 40, 100, 90) / 100;
    return clampUnitInterval(baseOpacity * 0.72, fallback);
  }
  return clampUnitInterval(fallback, 0.5);
}

function resolveWorkbenchOverviewOpacity(familyId, familyConfig = {}, fallback = 0.72) {
  if (familyId === "road") return clampUnitInterval(clampNumber(familyConfig.baseOpacity, 40, 100, 88) / 100, fallback);
  if (familyId === "rail") return clampUnitInterval(clampNumber(familyConfig.lineOpacity, 40, 100, 92) / 100, fallback);
  if (familyId === "airport" || familyId === "port") {
    return clampUnitInterval(clampNumber(familyConfig.baseOpacity, 40, 100, 90) / 100, fallback);
  }
  return clampUnitInterval(fallback, 0.72);
}

function resolveWorkbenchOverviewLabelsEnabled(familyId, familyConfig = {}, fallback = false) {
  if (familyId === "road") return !!familyConfig.showRefs;
  if (familyId === "rail") return !!familyConfig.showStationLabels;
  if (familyId === "airport" || familyId === "port") return !!familyConfig.showLabels;
  return !!fallback;
}

function resolveWorkbenchOverviewLabelMode(familyId, familyConfig = {}, fallback = "name") {
  if (familyId === "road") return "ref";
  if (familyId === "rail") return "name";
  if (familyId === "airport") return "both";
  if (familyId === "port") {
    return familyConfig.showLabels ? "mixed" : fallback;
  }
  return fallback;
}

export function resolveTransportOverviewPatchFromWorkbench(
  familyId,
  familyConfig = {},
  {
    currentOverviewConfig = null,
    currentVisualMode = "distribution",
  } = {}
) {
  const metadata = getTransportCapabilityFamilyMetadata(familyId);
  const bridgeSupport = getTransportWorkbenchOverviewBridgeSupport(familyId, familyConfig);
  if (
    !metadata
    || metadata.applyCompatibility !== TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge
    || !bridgeSupport.supported
  ) {
    return null;
  }
  const defaults = currentOverviewConfig || getTransportCapabilityDefaultOverviewConfig(familyId) || {};
  const coverageReach = resolveTransportWorkbenchApplyCoverageReach(familyId, familyConfig, defaults.coverageReach ?? 0.5);
  const linked = resolveLinkedTransportOverviewScopeAndThreshold(familyId, coverageReach);
  const labelDensity = mapTransportWorkbenchLabelDensityPresetToOverview(
    familyConfig.labelDensityPreset,
    defaults.labelDensity || "balanced"
  );
  // Apply only bridges overview fields that the main-map renderer already owns.
  // Preview-only display/aggregation controls stay local to the workbench carrier.
  return {
    visibilityField: metadata.overviewVisibilityField,
    dataLayerKeys: [...metadata.overviewDataLayerKeys],
    visualMode: normalizeTransportOverviewVisualMode(currentVisualMode),
    familyConfig: {
      opacity: resolveWorkbenchOverviewOpacity(familyId, familyConfig, defaults.opacity ?? 0.72),
      visualStrength: resolveWorkbenchOverviewVisualStrength(familyId, familyConfig, defaults.visualStrength ?? 0.5),
      primaryColor: String(defaults.primaryColor || "#1d4ed8"),
      labelsEnabled: resolveWorkbenchOverviewLabelsEnabled(familyId, familyConfig, defaults.labelsEnabled),
      labelDensity,
      labelMode: resolveWorkbenchOverviewLabelMode(familyId, familyConfig, defaults.labelMode || "name"),
      coverageReach,
      scopeLinkMode: "linked",
      scope: linked.scope,
      importanceThreshold: linked.importanceThreshold,
    },
  };
}
