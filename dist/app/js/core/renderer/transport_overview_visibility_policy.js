import {
  getTransportOverviewLineClassScopeRank,
  resolveTransportOverviewLineStrategy,
  resolveTransportOverviewPointStrategy,
} from "../transport_capability_registry.js";

const TRANSPORT_LINE_CLASS_BY_FAMILY = Object.freeze({
  rail: Object.freeze(["mainline", "regional", "secondary"]),
  road: Object.freeze(["motorway", "trunk", "primary", "secondary"]),
});

function normalizeFamilyId(familyId) {
  return String(familyId || "").trim().toLowerCase();
}

export function getTransportOverviewPointImportanceRank(feature) {
  return Math.max(1, Math.round(Number(feature?.properties?.importance_rank || 1)));
}

export function getTransportOverviewLabelZoomConfig(familyId, labelDensity) {
  const base = familyId === "airport"
    ? { nationalLabelScale: 2.0, regionalLabelScale: 5.0 }
    : { nationalLabelScale: 2.2, regionalLabelScale: 5.4 };
  switch (String(labelDensity || "").trim().toLowerCase()) {
    case "sparse":
      return {
        nationalLabelScale: base.nationalLabelScale + 0.7,
        regionalLabelScale: base.regionalLabelScale + 1.1,
      };
    case "dense":
      return {
        nationalLabelScale: Math.max(0.75, base.nationalLabelScale - 0.35),
        regionalLabelScale: Math.max(1.4, base.regionalLabelScale - 0.9),
      };
    default:
      return base;
  }
}

export function shouldIncludeTransportOverviewPointFeature(feature, strategy = {}) {
  return getTransportOverviewPointImportanceRank(feature) >= Math.max(1, Math.round(Number(strategy.thresholdRank || 1)));
}

export function getTransportOverviewLineFeatureClass(familyId, feature) {
  const normalizedFamilyId = normalizeFamilyId(familyId);
  const lineClass = String(feature?.properties?.class || "").trim().toLowerCase();
  return TRANSPORT_LINE_CLASS_BY_FAMILY[normalizedFamilyId]?.includes(lineClass) ? lineClass : "";
}

export function getTransportOverviewLineRevealRank(familyId, feature, lineClass = "") {
  const normalizedFamilyId = normalizeFamilyId(familyId);
  const properties = feature?.properties || {};
  if (normalizedFamilyId === "road") {
    const defaultRevealRank = lineClass === "motorway" ? 1 : lineClass === "trunk" ? 2 : 3;
    return Math.max(1, Math.round(Number(properties.reveal_rank || defaultRevealRank)));
  }
  return Math.max(1, Math.round(Number(properties.reveal_rank || (lineClass === "mainline" ? 1 : 2))));
}

export function getIncludedTransportOverviewLineClass(familyId, feature, strategy = {}) {
  const normalizedFamilyId = normalizeFamilyId(familyId);
  const lineClass = getTransportOverviewLineFeatureClass(normalizedFamilyId, feature);
  if (!lineClass) return "";
  const revealRank = getTransportOverviewLineRevealRank(normalizedFamilyId, feature, lineClass);
  if (revealRank > Math.max(1, Math.round(Number(strategy.maximumRevealRank || 1)))) return "";
  if (getTransportOverviewLineClassScopeRank(normalizedFamilyId, lineClass) > Math.max(1, Math.round(Number(strategy.minimumScopeRank || 1)))) return "";
  return lineClass;
}

export function shouldIncludeTransportOverviewLineFeature(familyId, feature, strategy = {}) {
  return !!getIncludedTransportOverviewLineClass(familyId, feature, strategy);
}

export function getTransportOverviewFilteredFeatureCount({
  familyId,
  collection,
  familyConfig,
  effectiveScope,
  zoomScale,
  visualMode,
}) {
  const features = Array.isArray(collection?.features) ? collection.features : null;
  if (!features) return null;
  const normalizedFamilyId = normalizeFamilyId(familyId);
  const scale = Number(zoomScale || 1);
  if (normalizedFamilyId === "rail" || normalizedFamilyId === "road") {
    const strategy = resolveTransportOverviewLineStrategy(
      normalizedFamilyId,
      { ...familyConfig, ...effectiveScope },
      { scale, visualMode },
    );
    return features.filter((feature) => shouldIncludeTransportOverviewLineFeature(normalizedFamilyId, feature, strategy)).length;
  }
  const strategy = resolveTransportOverviewPointStrategy(
    normalizedFamilyId,
    { ...familyConfig, ...effectiveScope },
    { scale, visualMode },
  );
  return features.filter((feature) => shouldIncludeTransportOverviewPointFeature(feature, strategy)).length;
}
