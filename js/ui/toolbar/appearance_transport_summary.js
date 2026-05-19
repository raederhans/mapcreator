import { getTransportOverviewLineSummaryMeta } from "../../core/transport_capability_registry.js";
import { getTransportOverviewFilteredFeatureCount } from "../../core/renderer/transport_overview_visibility_policy.js";

const TRANSPORT_RENDER_METRIC_NAMES = Object.freeze({
  airport: "drawAirportsLayer",
  port: "drawPortsLayer",
  rail: "drawRailwaysLayer",
  road: "drawRoadsLayer",
});
const TRANSPORT_POINT_FAMILY_NOUNS = Object.freeze({
  airport: ["airport", "airports"],
  port: ["port", "ports"],
});

function translateUi(translate, key) {
  return typeof translate === "function" ? translate(key, "ui") : key;
}

function formatTransportLabelValue(value) {
  return String(value || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatTransportPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function formatTransportScopeLabel(value) {
  return formatTransportLabelValue(value);
}

export function formatTransportThresholdLabel(value) {
  return formatTransportLabelValue(value);
}

function getTransportFamilyCollection(familyId, collections = {}) {
  if (familyId === "rail") return collections.rail;
  if (familyId === "road") return collections.road;
  if (familyId === "port") return collections.port;
  if (familyId === "airport") return collections.airport;
  return null;
}

export function getTransportFamilyFilteredCount({
  familyId,
  familyConfig,
  effectiveScope,
  collections,
  zoomScale,
  visualMode,
}) {
  return getTransportOverviewFilteredFeatureCount({
    familyId,
    collection: getTransportFamilyCollection(familyId, collections),
    familyConfig,
    effectiveScope,
    zoomScale,
    visualMode,
  });
}

export function getTransportFamilyRenderMetric(familyId, metricsSource) {
  const metricName = TRANSPORT_RENDER_METRIC_NAMES[familyId];
  if (!metricName) return null;
  const metrics = metricsSource && typeof metricsSource === "object" ? metricsSource : {};
  const breakdown = metrics.contextBreakdown && typeof metrics.contextBreakdown === "object"
    ? metrics.contextBreakdown
    : {};
  const metric = breakdown[metricName] || metrics[metricName] || null;
  return metric && typeof metric === "object" ? metric : null;
}

export function isTransportFamilyRenderSettlingMetric(metric) {
  if (!metric || typeof metric !== "object") return true;
  const reason = String(metric.reason || "").trim().toLowerCase();
  return !!metric.interactive
    || reason === "hidden"
    || reason === "interactive-pass"
    || reason === "staged-apply"
    || reason === "no-path";
}

export function formatTransportFamilyCountText(familyId, count, translate) {
  if (!Number.isFinite(count)) return "";
  const roundedCount = Math.max(0, Math.round(count));
  if (familyId === "rail") return `${roundedCount.toLocaleString()} ${translateUi(translate, roundedCount === 1 ? "railway" : "railways")}`;
  if (familyId === "road") return `${roundedCount.toLocaleString()} ${translateUi(translate, roundedCount === 1 ? "road" : "roads")}`;
  const nouns = TRANSPORT_POINT_FAMILY_NOUNS[familyId];
  if (!nouns) return "";
  const noun = roundedCount === 1 ? nouns[0] : nouns[1];
  return `${roundedCount.toLocaleString()} ${translateUi(translate, noun)}`;
}

export function formatTransportLoadedAuxiliaryText(familyId, count, translate) {
  const countText = formatTransportFamilyCountText(familyId, count, translate);
  return countText ? `${countText} ${translateUi(translate, "loaded")}` : "";
}

export function getTransportLineClassCoverage(familyId, collections, translate) {
  const meta = getTransportOverviewLineSummaryMeta(familyId);
  if (!meta) return "";
  const collection = getTransportFamilyCollection(familyId, collections);
  const features = Array.isArray(collection?.features) ? collection.features : [];
  const presentClasses = new Set();
  features.forEach((feature) => {
    const className = String(feature?.properties?.class || "").trim().toLowerCase();
    if (meta.classOrder.includes(className)) presentClasses.add(className);
  });
  const orderedClasses = meta.classOrder.filter((className) => presentClasses.has(className));
  if (!orderedClasses.length) return "";
  const visibleClasses = orderedClasses.join("/");
  if (familyId === "road" && !presentClasses.has("primary") && !presentClasses.has("secondary")) {
    return `${translateUi(translate, "Loaded classes:")} ${visibleClasses} (${translateUi(translate, "primary/secondary pending")})`;
  }
  if (familyId === "rail" && !presentClasses.has("secondary")) {
    return `${translateUi(translate, "Loaded classes:")} ${visibleClasses} (${translateUi(translate, "secondary full-only")})`;
  }
  return `${translateUi(translate, "Loaded classes:")} ${visibleClasses}`;
}

export function buildTransportLineSummaryDetails(familyId, collections, translate) {
  const meta = getTransportOverviewLineSummaryMeta(familyId);
  if (!meta) return [];
  return [
    getTransportLineClassCoverage(familyId, collections, translate),
    `${translateUi(translate, "Phase:")} ${translateUi(translate, meta.phaseText)}`,
    `${translateUi(translate, "Source:")} ${translateUi(translate, meta.sourceText)}`,
  ].filter(Boolean);
}

export function buildTransportFamilySummaryText({
  familyId,
  masterEnabled,
  familyEnabled,
  familyConfig,
  effectiveScope,
  collections,
  metrics,
  zoomScale,
  visualMode,
  translate,
}) {
  if (!familyEnabled || !masterEnabled) return translateUi(translate, "Hidden");
  const metric = getTransportFamilyRenderMetric(familyId, metrics);
  const filteredCount = getTransportFamilyFilteredCount({
    familyId,
    familyConfig,
    effectiveScope,
    collections,
    zoomScale,
    visualMode,
  });
  const loadedAuxiliaryText = formatTransportLoadedAuxiliaryText(familyId, filteredCount, translate);
  const lineDetails = buildTransportLineSummaryDetails(familyId, collections, translate);
  const joinSummaryParts = (...parts) => parts.filter(Boolean).join(" · ");
  if (isTransportFamilyRenderSettlingMetric(metric)) {
    return loadedAuxiliaryText
      ? joinSummaryParts(translateUi(translate, "Loading/settling"), loadedAuxiliaryText, ...lineDetails)
      : joinSummaryParts(translateUi(translate, "Loading/settling"), ...lineDetails);
  }
  const visibleCount = Math.max(0, Math.round(Number(metric.visibleFeatureCount || 0)));
  if (visibleCount > 0) {
    return joinSummaryParts(translateUi(translate, "Visible"), formatTransportFamilyCountText(familyId, visibleCount, translate), ...lineDetails);
  }
  if (Number(metric.featureCount || 0) > 0 || Number.isFinite(filteredCount)) {
    return loadedAuxiliaryText
      ? joinSummaryParts(translateUi(translate, "Loaded · 0 visible"), loadedAuxiliaryText, ...lineDetails)
      : joinSummaryParts(translateUi(translate, "Loaded · 0 visible"), ...lineDetails);
  }
  return joinSummaryParts(translateUi(translate, "Loading/settling"), ...lineDetails);
}
