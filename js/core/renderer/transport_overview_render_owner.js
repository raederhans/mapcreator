import { ColorManager } from "../color_manager.js";
import { ensureTransportOverviewStyleConfigState } from "../state/ui_state.js";
import {
  getTransportOverviewLineClassScopeRank,
  normalizeTransportOverviewVisualMode,
  resolveTransportOverviewLineStrategy,
  resolveTransportOverviewPointStrategy,
} from "../transport_capability_registry.js";
import {
  getTransportFacilityIconAtlasImage,
  getTransportFacilityIconAtlasStatus,
  getTransportFacilityIconCell,
  isTransportFacilityIconAtlasReady,
  resolveTransportFacilityIconDrawSizePx,
  resolveTransportFacilityIconKey,
} from "./transport_facility_icons.js";

export function createTransportOverviewRenderOwner({
  state = {},
  helpers = {},
} = {}) {
  const runtimeState = state;
  const {
    buildFacilityEntryKey,
    buildFacilityTooltipText,
    clamp,
    clearFacilityHoverEntries,
    collectContextMetric,
    getActiveFacilityHighlightEntry,
    getCanvasColorRelativeLuminance,
    getContext = () => null,
    getFacilityHoverRadiusPx,
    getFeatureCollectionFeatureCount,
    getLineMidpointFromCoordinates,
    getMultiLineLabelAnchor,
    getPathCanvas = () => null,
    getProjection = () => null,
    invalidateRenderPasses = null,
    mixCanvasColors,
    nowMs,
    requestRender = null,
    setVisibleFacilityHoverEntries,
  } = helpers;

  let context = null;
  let pathCanvas = null;
  let projection = null;
  let transportFacilityIconAtlasRenderQueued = false;

  function syncRenderTargets() {
    context = getContext();
    pathCanvas = getPathCanvas();
    projection = getProjection();
  }

function requestTransportFacilityIconAtlasRender() {
  if (transportFacilityIconAtlasRenderQueued) return;
  transportFacilityIconAtlasRenderQueued = true;
  if (typeof invalidateRenderPasses === "function") {
    invalidateRenderPasses("contextMarkers", "transport-facility-icons-ready");
  }
  if (typeof requestRender === "function") requestRender("transport-facility-icons-ready");
}

function getContextFacilityThresholdRank(threshold, allowed = []) {
  const normalized = String(threshold || "").trim().toLowerCase();
  if (allowed.includes(normalized)) {
    if (normalized === "national_core") return 3;
    if (normalized === "regional_core") return 2;
    return 1;
  }
  return 1;
}

function getTransportOverviewStyleConfig() {
  return ensureTransportOverviewStyleConfigState(runtimeState);
}

function getTransportOverviewVisualMode() {
  return normalizeTransportOverviewVisualMode(getTransportOverviewStyleConfig().visualMode, "distribution");
}

function getTransportOverviewFamilyConfig(familyId) {
  const config = getTransportOverviewStyleConfig();
  return config?.[familyId] || {};
}

function getTransportCountryOverlayStateForFamily(familyId) {
  const normalizedFamilyId = String(familyId || "").trim().toLowerCase();
  const overlayState = runtimeState.transportCountryOverlayState;
  const familyOverlay = overlayState?.overlaysByFamily?.[normalizedFamilyId];
  if (familyOverlay?.status === "ready") return familyOverlay;
  if (overlayState?.status !== "ready" || overlayState.family !== normalizedFamilyId) return null;
  return overlayState;
}

function getTransportCountryOverlayCollection(familyId, layerKey) {
  const overlayState = getTransportCountryOverlayStateForFamily(familyId);
  return overlayState?.collectionsByLayer?.[layerKey] || null;
}

function collectTransportCountryOverlayMetric(metricName, familyId, reason) {
  const collectionKey = familyId === "road" ? "roads" : familyId === "rail" ? "railways" : "airports";
  const collection = getTransportCountryOverlayCollection(familyId, collectionKey);
  collectContextMetric(metricName, 0, {
    featureCount: getFeatureCollectionFeatureCount(collection),
    visibleFeatureCount: 0,
    labelCount: 0,
    interactive: false,
    skipped: true,
    reason,
  });
}

function getTransportOverviewLabelZoomConfig(familyId, labelDensity) {
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

function getTransportOverviewImportanceThresholdRank(value, allowed = ["primary", "secondary", "all"]) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!allowed.includes(normalized)) return 2;
  if (normalized === "primary") return 3;
  if (normalized === "secondary") return 2;
  return 1;
}

function getTransportOverviewZoomRevealAllowance(scale) {
  const k = Number(scale || 1);
  if (k >= 6) return 2;
  if (k >= 3.1) return 1;
  return 0;
}

function getTransportPortZoomRevealFloor(scale) {
  return Math.max(1, 2 - getTransportOverviewZoomRevealAllowance(scale));
}

function getTransportAirportScopeThreshold(scope) {
  const normalized = String(scope || "").trim().toLowerCase();
  if (normalized === "international") return 3;
  if (normalized === "all_civil") return 1;
  return 2;
}

function getTransportPortScopeThreshold(scope) {
  const normalized = String(scope || "").trim().toLowerCase();
  if (normalized === "core") return 3;
  if (normalized === "expanded") return 1;
  return 2;
}

function getTransportOverviewPrimaryColor(value, fallback = "#1d4ed8") {
  return ColorManager.normalizeHexColor(String(value || "").trim()) || fallback;
}

function buildTransportFacilityVisualStyle(primaryColor, visualStrength, fallback = "#1d4ed8") {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, fallback);
  const strength = clamp(Number.isFinite(Number(visualStrength)) ? Number(visualStrength) : 0.56, 0, 1);
  const luminance = getCanvasColorRelativeLuminance(resolvedPrimaryColor);
  const strokeTarget = Number.isFinite(luminance) && luminance < 0.4 ? "#f8fbff" : "#ffffff";
  const labelTarget = Number.isFinite(luminance) && luminance < 0.56 ? "#f8fafc" : "#0f172a";
  return {
    fillStyle: resolvedPrimaryColor,
    strokeStyle: mixCanvasColors(resolvedPrimaryColor, strokeTarget, 0.72) || strokeTarget,
    labelColor: mixCanvasColors(resolvedPrimaryColor, labelTarget, Number.isFinite(luminance) && luminance < 0.56 ? 0.48 : 0.78) || labelTarget,
    highlightStroke: mixCanvasColors(resolvedPrimaryColor, "#ffffff", 0.82) || "#ffffff",
    radiusScale: 0.85 + (strength * 0.55),
    strokeScale: 0.9 + (strength * 0.35),
    hoverScale: 1.12 + (strength * 0.12),
  };
}

function getTransportOverviewAirportVisualStyle(primaryColor, visualStrength) {
  return buildTransportFacilityVisualStyle(primaryColor, visualStrength, "#1d4ed8");
}

function getTransportOverviewPortVisualStyle(primaryColor, visualStrength) {
  return buildTransportFacilityVisualStyle(primaryColor, visualStrength, "#b45309");
}

function getTransportOverviewRailVisualStyle(primaryColor, visualStrength) {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, "#0f172a");
  const strength = clamp(Number.isFinite(Number(visualStrength)) ? Number(visualStrength) : 0.5, 0, 1);
  return {
    mainlineCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#f8fafc", 0.82) || "#f8fafc",
    mainlineStroke: mixCanvasColors(resolvedPrimaryColor, "#020617", 0.28) || resolvedPrimaryColor,
    regionalCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#f1f5f9", 0.72) || "#f1f5f9",
    regionalStroke: mixCanvasColors(resolvedPrimaryColor, "#64748b", 0.34) || resolvedPrimaryColor,
    secondaryCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#e2e8f0", 0.62) || "#e2e8f0",
    secondaryStroke: mixCanvasColors(resolvedPrimaryColor, "#94a3b8", 0.42) || resolvedPrimaryColor,
    mainlineCasingWidth: 3.35 + (strength * 1.65),
    mainlineWidth: 1.55 + (strength * 1.25),
    regionalCasingWidth: 2.25 + (strength * 1.05),
    regionalWidth: 0.9 + (strength * 0.75),
    secondaryCasingWidth: 1.8 + (strength * 0.75),
    secondaryWidth: 0.72 + (strength * 0.55),
    mainlineOpacity: 0.74 + (strength * 0.26),
    regionalOpacity: 0.42 + (strength * 0.22),
    secondaryOpacity: 0.28 + (strength * 0.18),
    regionalDashPx: [5.5, 4.5],
    secondaryDashPx: [2.8, 4.8],
  };
}

function getTransportOverviewRoadVisualStyle(primaryColor, visualStrength) {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, "#374151");
  const strength = clamp(Number.isFinite(Number(visualStrength)) ? Number(visualStrength) : 0.5, 0, 1);
  return {
    motorwayCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#f9fafb", 0.86) || "#f9fafb",
    motorwayStroke: mixCanvasColors(resolvedPrimaryColor, "#111827", 0.22) || resolvedPrimaryColor,
    trunkCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#e5e7eb", 0.68) || "#e5e7eb",
    trunkStroke: mixCanvasColors(resolvedPrimaryColor, "#111827", 0.1) || resolvedPrimaryColor,
    primaryCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#e5e7eb", 0.54) || "#e5e7eb",
    primaryStroke: mixCanvasColors(resolvedPrimaryColor, "#4b5563", 0.18) || resolvedPrimaryColor,
    secondaryCasingStroke: mixCanvasColors(resolvedPrimaryColor, "#d1d5db", 0.44) || "#d1d5db",
    secondaryStroke: mixCanvasColors(resolvedPrimaryColor, "#6b7280", 0.26) || resolvedPrimaryColor,
    motorwayCasingWidth: 3.45 + (strength * 1.75),
    motorwayWidth: 1.55 + (strength * 1.45),
    trunkCasingWidth: 2.35 + (strength * 1.2),
    trunkWidth: 0.95 + (strength * 0.95),
    primaryCasingWidth: 1.85 + (strength * 0.85),
    primaryWidth: 0.76 + (strength * 0.58),
    secondaryCasingWidth: 1.5 + (strength * 0.58),
    secondaryWidth: 0.62 + (strength * 0.4),
    motorwayOpacity: 0.72 + (strength * 0.24),
    trunkOpacity: 0.48 + (strength * 0.2),
    primaryOpacity: 0.34 + (strength * 0.16),
    secondaryOpacity: 0.24 + (strength * 0.12),
    trunkDashPx: [6, 5],
    primaryDashPx: [4.2, 5.4],
    secondaryDashPx: [2.6, 5.8],
  };
}

function resolveTransportOverviewLineCoordinateWidth(screenWidthPx, k, floorPx = 0.75) {
  const safeZoom = Math.max(0.0001, Number(k || 1));
  const normalizedScreenWidth = Math.max(Number(floorPx) || 0, Number(screenWidthPx) || 0);
  // Canvas lineWidth is in transformed coordinate units, so keep the visual
  // target in screen pixels and convert it back through the active zoom.
  return normalizedScreenWidth / safeZoom;
}

function resolveTransportOverviewLineDash(dashPx, k) {
  if (!Array.isArray(dashPx) || !dashPx.length) return [];
  const safeZoom = Math.max(0.0001, Number(k || 1));
  return dashPx
    .map((value) => Math.max(0, Number(value) || 0) / safeZoom)
    .filter((value) => value > 0);
}

function drawTransportOverviewLineStroke(features, strokeStyle, screenWidthPx, opacity, { k, dashPx = null, widthFloorPx = 0.75 } = {}) {
  if (!features.length || !(opacity > 0) || !(screenWidthPx > 0)) return;
  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = strokeStyle;
  context.lineWidth = resolveTransportOverviewLineCoordinateWidth(screenWidthPx, k, widthFloorPx);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash(resolveTransportOverviewLineDash(dashPx, k));
  try {
    features.forEach((feature) => {
      context.beginPath();
      pathCanvas(feature);
      context.stroke();
    });
  } finally {
    context.setLineDash([]);
    context.restore();
  }
}

function drawTransportOverviewLineSet(features, style, { baseOpacity, strategy, k, widthFloorPx = 0.75 } = {}) {
  if (!features.length) return;
  const opacity = baseOpacity * Number(style.opacity || 0) * strategy.opacityMultiplier;
  drawTransportOverviewLineStroke(features, style.casingStroke, style.casingWidth * strategy.widthMultiplier, opacity * 0.82, {
    k,
    widthFloorPx: widthFloorPx + 0.7,
  });
  drawTransportOverviewLineStroke(features, style.innerStroke, style.innerWidth * strategy.widthMultiplier, opacity, {
    k,
    dashPx: style.dashPx,
    widthFloorPx,
  });
}

function getTransportLineLabelGridSize(labelDensity) {
  switch (String(labelDensity || "").trim().toLowerCase()) {
    case "dense":
      return 112;
    case "sparse":
      return 176;
    default:
      return 144;
  }
}

function buildProjectedRailLines(geometry) {
  if (!projection || !geometry || typeof geometry !== "object") return [];
  const rawLines = geometry.type === "LineString"
    ? [geometry.coordinates || []]
    : geometry.type === "MultiLineString"
      ? (geometry.coordinates || [])
      : [];
  return rawLines
    .map((line) => (Array.isArray(line) ? line : []).map((coord) => projection(coord)).filter((point) => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])))
    .filter((line) => line.length >= 2);
}

function measureProjectedLineSetLength(lines) {
  let total = 0;
  (Array.isArray(lines) ? lines : []).forEach((line) => {
    for (let index = 1; index < line.length; index += 1) {
      const previous = line[index - 1];
      const current = line[index];
      total += Math.hypot(
        Number(current?.[0] || 0) - Number(previous?.[0] || 0),
        Number(current?.[1] || 0) - Number(previous?.[1] || 0),
      );
    }
  });
  return total;
}

function getRailFeatureLabelAnchor(feature) {
  return getLineFeatureLabelAnchor(feature);
}

function getLineFeatureLabelAnchor(feature) {
  const geometry = feature?.geometry;
  if (!geometry || typeof geometry !== "object") return null;
  if (geometry.type === "LineString") {
    return getLineMidpointFromCoordinates(Array.isArray(geometry.coordinates) ? geometry.coordinates : []);
  }
  return getMultiLineLabelAnchor(geometry, "midpoint");
}

function getTransportOverviewAirportLabelText(properties = {}, mode = "both") {
  const name = String(properties.name || "").trim();
  const code = String(properties.iata || properties.icao || "").trim();
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "code") return code || name;
  if (normalized === "name") return name || code;
  return code && name ? `${code} · ${name}` : (code || name);
}

function getTransportOverviewPortLabelText(properties = {}, mode = "mixed") {
  const name = String(properties.name || "").trim();
  const designation = String(properties.legal_designation_label || properties.legal_designation || "").trim();
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "cargo_focus") return designation || name;
  if (normalized === "name") return name || designation;
  return designation && name ? `${name} · ${designation}` : (name || designation);
}

function getTransportOverviewRailLabelText(properties = {}, mode = "name") {
  const name = String(properties.name || "").trim();
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "ref") return name;
  return name;
}

function getTransportOverviewRoadLabelText(properties = {}, mode = "ref") {
  const ref = String(properties.ref || properties.route_ref || "").trim();
  const name = String(properties.name || properties.road_name || "").trim();
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "name") return name || ref;
  if (normalized === "both") return ref && name ? `${ref} · ${name}` : (ref || name);
  return ref || name;
}

function getRoadLabelClassPriority(roadClass) {
  switch (String(roadClass || "").trim().toLowerCase()) {
    case "motorway":
      return 4;
    case "trunk":
      return 3;
    case "primary":
      return 2;
    default:
      return 1;
  }
}

function getRoadLabelClassFromPriority(priority) {
  if (priority >= 4) return "motorway";
  if (priority >= 3) return "trunk";
  if (priority >= 2) return "primary";
  return "secondary";
}

function resolveTransportRoadLabelClassAndPriority(properties = {}) {
  const explicitRoadClass = String(properties.class || properties.road_class || properties.highway || "").trim().toLowerCase();
  if (explicitRoadClass) {
    return {
      roadClass: explicitRoadClass,
      priority: getRoadLabelClassPriority(explicitRoadClass),
    };
  }
  const rawPriority = Number(properties.priority ?? properties.label_priority ?? properties.rank);
  const priority = Number.isFinite(rawPriority)
    ? Math.max(1, Math.min(4, Math.round(rawPriority)))
    : 1;
  return {
    roadClass: getRoadLabelClassFromPriority(priority),
    priority,
  };
}

function getCurrentZoomTransform() {
  const transform = runtimeState.zoomTransform || globalThis.d3?.zoomIdentity || { x: 0, y: 0, k: 1 };
  return {
    x: Number(transform.x || 0),
    y: Number(transform.y || 0),
    k: Math.max(0.0001, Number(transform.k || 1)),
  };
}

function buildContextFacilityEntries(
  collection,
  thresholdRank = 1,
  {
    getLabelText = null,
  } = {},
) {
  const featureCount = getFeatureCollectionFeatureCount(collection);
  if (!collection?.features?.length || !projection) {
    return {
      featureCount,
      entries: [],
      skipped: true,
      reason: !projection ? "no-projection" : "no-data",
    };
  }
  const targetCanvas = context?.canvas || null;
  const viewportWidth = Number(targetCanvas?.width || 0);
  const viewportHeight = Number(targetCanvas?.height || 0);
  const zoomTransform = getCurrentZoomTransform();
  const padding = 36;
  const entries = [];
  collection.features.forEach((feature) => {
    if (feature?.geometry?.type !== "Point") return;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    const projected = projection([coordinates[0], coordinates[1]]);
    if (!Array.isArray(projected) || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) return;
    const properties = feature.properties || {};
    const importanceRank = Math.max(1, Math.round(Number(properties.importance_rank || 1)));
    if (importanceRank < thresholdRank) return;
    const x = projected[0];
    const y = projected[1];
    const screenX = (x * zoomTransform.k) + zoomTransform.x;
    const screenY = (y * zoomTransform.k) + zoomTransform.y;
    if (
      viewportWidth > 0
      && viewportHeight > 0
      && (screenX < -padding || screenX > viewportWidth + padding || screenY < -padding || screenY > viewportHeight + padding)
    ) {
      return;
    }
    entries.push({
      x,
      y,
      screenX,
      screenY,
      screenScale: zoomTransform.k,
      label: typeof getLabelText === "function"
        ? String(getLabelText(properties, feature) || "").trim()
        : String(properties.name || "").trim(),
      importanceRank,
      properties: {
        ...properties,
        __coordinates: [coordinates[0], coordinates[1]],
      },
    });
  });
  entries.sort((left, right) => left.importanceRank - right.importanceRank);
  return {
    featureCount,
    entries,
    skipped: false,
    reason: "",
  };
}

function tintTransportFacilityIcon(context2d, { x, y, size, tintColor, strokeColor, opacity, scale, strokeScale }) {
  context2d.save();
  context2d.globalCompositeOperation = "source-atop";
  context2d.globalAlpha = Math.min(0.22, Math.max(0.08, opacity * 0.18));
  context2d.fillStyle = tintColor;
  context2d.fillRect(x, y, size, size);
  context2d.restore();

  context2d.save();
  context2d.globalAlpha = Math.min(0.72, Math.max(0.28, opacity * 0.48));
  context2d.strokeStyle = strokeColor;
  context2d.lineWidth = Math.max(0.75 / scale, (0.95 * strokeScale) / scale);
  context2d.beginPath();
  context2d.arc(x + (size / 2), y + (size / 2), size * 0.48, 0, Math.PI * 2);
  context2d.stroke();
  context2d.restore();
}

function drawContextFacilityPointLayer(
  metricName,
  collection,
  k,
  {
    familyId = "",
    interactive = false,
    visible = true,
    thresholdRank = 1,
    shape = "diamond",
    fillStyle = "#2563eb",
    strokeStyle = "#eff6ff",
    labelColor = "#1e3a8a",
    opacity = 0.9,
    labelsEnabled = true,
    nationalLabelScale = 2.2,
    regionalLabelScale = 5.2,
    getLabelText = null,
    radiusScale = 1,
    strokeScale = 1,
    hoverScale = 1.18,
    highlightStroke = "#ffffff",
    packId = "global",
    appendHoverEntries = false,
  } = {},
) {
  const startedAt = nowMs();
  const normalizedFamilyId = String(familyId || "").trim().toLowerCase();
  const normalizedPackId = String(packId || "global").trim().toLowerCase() || "global";
  const clearCurrentPackHoverEntries = () => {
    if (appendHoverEntries) {
      setVisibleFacilityHoverEntries(normalizedFamilyId, [], { append: true, packId: normalizedPackId });
      return;
    }
    clearFacilityHoverEntries(normalizedFamilyId);
  };
  if (!visible) {
    clearCurrentPackHoverEntries();
    collectContextMetric(metricName, nowMs() - startedAt, {
      featureCount: getFeatureCollectionFeatureCount(collection),
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "hidden",
    });
    return;
  }
  if (interactive) {
    collectContextMetric(metricName, nowMs() - startedAt, {
      featureCount: getFeatureCollectionFeatureCount(collection),
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: true,
      skipped: true,
      reason: "interactive-pass",
    });
    return;
  }
  const renderState = buildContextFacilityEntries(collection, thresholdRank, {
    getLabelText,
  });
  if (renderState.skipped) {
    clearCurrentPackHoverEntries();
    collectContextMetric(metricName, nowMs() - startedAt, {
      featureCount: renderState.featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: renderState.reason,
    });
    return;
  }
  const activeHighlightKey = buildFacilityEntryKey(getActiveFacilityHighlightEntry());
  const hoverEntries = [];
  const usesFacilityIconLayer = normalizedFamilyId === "airport" || normalizedFamilyId === "port";
  const iconAtlasImage = usesFacilityIconLayer
    ? getTransportFacilityIconAtlasImage(requestTransportFacilityIconAtlasRender)
    : null;
  const canDrawIconAtlas = !!iconAtlasImage && isTransportFacilityIconAtlasReady();
  if (usesFacilityIconLayer && !canDrawIconAtlas) {
    clearCurrentPackHoverEntries();
    collectContextMetric(metricName, nowMs() - startedAt, {
      featureCount: renderState.featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: `icon-atlas-${getTransportFacilityIconAtlasStatus() || "unavailable"}`,
    });
    return;
  }
  let labelCount = 0;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.globalAlpha = opacity;
  renderState.entries.forEach((entry) => {
    const radiusBase = entry.importanceRank >= 3 ? 5.2 : entry.importanceRank === 2 ? 4.3 : 3.5;
    const iconKey = resolveTransportFacilityIconKey(normalizedFamilyId, entry.properties);
    const iconCell = getTransportFacilityIconCell(iconKey);
    const iconSizePx = iconCell
      ? resolveTransportFacilityIconDrawSizePx(normalizedFamilyId, entry.properties, { visualScale: radiusScale })
      : radiusBase * radiusScale * 2;
    const zoomScale = Math.max(0.0001, Number(entry.screenScale || 1));
    const markerEntry = {
      familyId: normalizedFamilyId,
      packId: normalizedPackId,
      stableId: String(entry.properties?.stable_key || entry.properties?.id || entry.label || `${entry.x}:${entry.y}`).trim(),
      shape: iconCell ? "icon" : shape,
      iconKey,
      markerRadiusPx: iconCell ? Math.max(5.4, iconSizePx * 0.52) : radiusBase * radiusScale,
      hoverScale: Number(hoverScale || 1.18),
      highlightStroke: String(highlightStroke || strokeStyle || "#ffffff"),
      projectedPoint: [entry.x, entry.y],
      screenPoint: [entry.screenX, entry.screenY],
      coordinates: Array.isArray(entry.properties?.__coordinates) ? entry.properties.__coordinates : null,
      properties: entry.properties,
    };
    markerEntry.hoverRadiusPx = getFacilityHoverRadiusPx(markerEntry);
    markerEntry.tooltipText = buildFacilityTooltipText(markerEntry);
    hoverEntries.push(markerEntry);
    const highlightFactor = buildFacilityEntryKey(markerEntry) && buildFacilityEntryKey(markerEntry) === activeHighlightKey ? markerEntry.hoverScale : 1;
    if (iconCell) {
      if (canDrawIconAtlas) {
        const iconWorldSize = (iconSizePx * highlightFactor) / zoomScale;
        const iconLeft = entry.x - (iconWorldSize / 2);
        const iconTop = entry.y - (iconWorldSize / 2);
        context.drawImage(
          iconAtlasImage,
          iconCell.x,
          iconCell.y,
          iconCell.size,
          iconCell.size,
          iconLeft,
          iconTop,
          iconWorldSize,
          iconWorldSize,
        );
        tintTransportFacilityIcon(context, {
          x: iconLeft,
          y: iconTop,
          size: iconWorldSize,
          tintColor: fillStyle,
          strokeColor: highlightFactor > 1 ? markerEntry.highlightStroke : strokeStyle,
          opacity,
          scale: zoomScale,
          strokeScale,
        });
      }
      return;
    }
    const radius = markerEntry.markerRadiusPx * highlightFactor;
    context.beginPath();
    if (shape === "square") {
      context.rect(entry.x - radius, entry.y - radius, radius * 2, radius * 2);
    } else {
      context.moveTo(entry.x, entry.y - radius);
      context.lineTo(entry.x + radius, entry.y);
      context.lineTo(entry.x, entry.y + radius);
      context.lineTo(entry.x - radius, entry.y);
      context.closePath();
    }
    context.fillStyle = fillStyle;
    context.strokeStyle = strokeStyle;
    context.lineWidth = (entry.importanceRank >= 3 ? 1.4 : 1.1) * strokeScale;
    context.fill();
    context.stroke();
  });
  context.restore();
  setVisibleFacilityHoverEntries(normalizedFamilyId, hoverEntries, {
    append: appendHoverEntries,
    packId: normalizedPackId,
  });

  if (!labelsEnabled) {
    collectContextMetric(metricName, nowMs() - startedAt, {
      featureCount: renderState.featureCount,
      visibleFeatureCount: renderState.entries.length,
      labelCount: 0,
      interactive: !!interactive,
      skipped: false,
    });
    return;
  }

  context.save();
  context.textAlign = "left";
  context.textBaseline = "middle";
  renderState.entries.forEach((entry) => {
    if (!entry.label) return;
    const shouldShowLabel = entry.importanceRank >= 3 ? k >= nationalLabelScale : k >= regionalLabelScale;
    if (!shouldShowLabel) return;
    const usesFacilityIcon = normalizedFamilyId === "airport" || normalizedFamilyId === "port";
    const zoomScale = Math.max(0.0001, Number(entry.screenScale || 1));
    const iconSizePx = resolveTransportFacilityIconDrawSizePx(normalizedFamilyId, entry.properties, { visualScale: radiusScale });
    const fontSize = usesFacilityIcon
      ? (entry.importanceRank >= 3 ? 11 : 10) / zoomScale
      : (entry.importanceRank >= 3 ? 11 : 10);
    const labelOffset = usesFacilityIcon ? ((iconSizePx / 2) + 4) / zoomScale : 8;
    context.font = `${entry.importanceRank >= 3 ? 600 : 500} ${fontSize}px "IBM Plex Sans", "Noto Sans JP", sans-serif`;
    context.lineWidth = usesFacilityIcon ? 3 / zoomScale : 3;
    context.strokeStyle = "rgba(255,255,255,0.92)";
    context.fillStyle = labelColor;
    context.strokeText(entry.label, entry.x + labelOffset, entry.y);
    context.fillText(entry.label, entry.x + labelOffset, entry.y);
    labelCount += 1;
  });
  context.restore();

  collectContextMetric(metricName, nowMs() - startedAt, {
    featureCount: renderState.featureCount,
    visibleFeatureCount: renderState.entries.length,
    labelCount,
    interactive: !!interactive,
    skipped: false,
  });
}

function drawAirportPointCollection(metricName, collection, k, { interactive = false, packId = "global", appendHoverEntries = false } = {}) {
  const airportConfig = getTransportOverviewFamilyConfig("airport");
  const labelZoomConfig = getTransportOverviewLabelZoomConfig("airport", airportConfig.labelDensity);
  const visualStyle = getTransportOverviewAirportVisualStyle(airportConfig.primaryColor, airportConfig.visualStrength);
  const strategy = resolveTransportOverviewPointStrategy("airport", airportConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  drawContextFacilityPointLayer(metricName, collection, k, {
    familyId: "airport",
    interactive,
    visible: !!runtimeState.showTransport && !!runtimeState.showAirports,
    thresholdRank: strategy.thresholdRank,
    fillStyle: visualStyle.fillStyle,
    strokeStyle: visualStyle.strokeStyle,
    labelColor: visualStyle.labelColor,
    opacity: clamp(Number(airportConfig.opacity ?? 0.68), 0, 1) * strategy.opacityMultiplier,
    labelsEnabled: strategy.labelsEnabled,
    nationalLabelScale: labelZoomConfig.nationalLabelScale,
    regionalLabelScale: labelZoomConfig.regionalLabelScale,
    radiusScale: visualStyle.radiusScale * strategy.radiusMultiplier,
    strokeScale: visualStyle.strokeScale * strategy.strokeMultiplier,
    hoverScale: visualStyle.hoverScale,
    highlightStroke: visualStyle.highlightStroke,
    getLabelText: (properties) => getTransportOverviewAirportLabelText(properties, airportConfig.labelMode),
    packId,
    appendHoverEntries,
  });
}

function drawCountryAirportsLayer(k, { interactive = false } = {}) {
  const overlayState = getTransportCountryOverlayStateForFamily("airport");
  if (!overlayState) return;
  drawAirportPointCollection("drawCountryAirportsLayer", overlayState.collectionsByLayer?.airports, k, {
    interactive,
    packId: overlayState.activePackId,
    appendHoverEntries: true,
  });
}

function drawAirportsLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  drawAirportPointCollection("drawAirportsLayer", runtimeState.airportsData, k, { interactive });
  drawCountryAirportsLayer(k, { interactive });
}

function drawPortsLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  const portConfig = getTransportOverviewFamilyConfig("port");
  const labelZoomConfig = getTransportOverviewLabelZoomConfig("port", portConfig.labelDensity);
  const visualStyle = getTransportOverviewPortVisualStyle(portConfig.primaryColor, portConfig.visualStrength);
  const strategy = resolveTransportOverviewPointStrategy("port", portConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  drawContextFacilityPointLayer("drawPortsLayer", runtimeState.portsData, k, {
    familyId: "port",
    interactive,
    visible: !!runtimeState.showTransport && !!runtimeState.showPorts,
    thresholdRank: strategy.thresholdRank,
    fillStyle: visualStyle.fillStyle,
    strokeStyle: visualStyle.strokeStyle,
    labelColor: visualStyle.labelColor,
    opacity: clamp(Number(portConfig.opacity ?? 0.64), 0, 1) * strategy.opacityMultiplier,
    labelsEnabled: strategy.labelsEnabled,
    nationalLabelScale: labelZoomConfig.nationalLabelScale,
    regionalLabelScale: labelZoomConfig.regionalLabelScale,
    radiusScale: visualStyle.radiusScale * strategy.radiusMultiplier,
    strokeScale: visualStyle.strokeScale * strategy.strokeMultiplier,
    hoverScale: visualStyle.hoverScale,
    highlightStroke: visualStyle.highlightStroke,
    getLabelText: (properties) => getTransportOverviewPortLabelText(properties, portConfig.labelMode),
  });
}

function drawRailwaysLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  const startedAt = nowMs();
  const visible = !!runtimeState.showTransport && !!runtimeState.showRail;
  const collection = runtimeState.railwaysData;
  const featureCount = getFeatureCollectionFeatureCount(collection);
  if (!visible) {
    collectContextMetric("drawRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "hidden",
    });
    return;
  }
  if (interactive) {
    collectContextMetric("drawRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: true,
      skipped: true,
      reason: "interactive-pass",
    });
    return;
  }
  if (!collection?.features?.length || !pathCanvas) {
    collectContextMetric("drawRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: !pathCanvas ? "no-path" : "no-data",
    });
    drawCountryRailwaysLayer(k, { interactive });
    return;
  }
  const railConfig = getTransportOverviewFamilyConfig("rail");
  const strategy = resolveTransportOverviewLineStrategy("rail", railConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  const minimumScopeRank = strategy.minimumScopeRank;
  const maximumRevealRank = strategy.maximumRevealRank;
  const visualStyle = getTransportOverviewRailVisualStyle(railConfig.primaryColor, railConfig.visualStrength);
  const featuresByClass = {
    secondary: [],
    regional: [],
    mainline: [],
  };
  const labelCandidates = [];
  collection.features.forEach((feature) => {
    const properties = feature?.properties || {};
    const lineClass = String(properties.class || "").trim().toLowerCase();
    const revealRank = Math.max(1, Math.round(Number(properties.reveal_rank || (lineClass === "mainline" ? 1 : 2))));
    if (revealRank > maximumRevealRank) return;
    if (getTransportOverviewLineClassScopeRank("rail", lineClass) > minimumScopeRank) return;
    if (lineClass === "mainline") {
      featuresByClass.mainline.push(feature);
    } else if (lineClass === "regional") {
      featuresByClass.regional.push(feature);
    } else if (lineClass === "secondary") {
      featuresByClass.secondary.push(feature);
    } else {
      return;
    }

    const label = getTransportOverviewRailLabelText(properties, railConfig.labelMode);
    if (!label || !railConfig.labelsEnabled || typeof projection !== "function") return;
    const anchorGeo = getRailFeatureLabelAnchor(feature);
    if (!Array.isArray(anchorGeo) || anchorGeo.length < 2) return;
    const anchorProjected = projection(anchorGeo);
    if (!Array.isArray(anchorProjected) || anchorProjected.length < 2 || !Number.isFinite(anchorProjected[0]) || !Number.isFinite(anchorProjected[1])) return;
    const projectedLines = buildProjectedRailLines(feature.geometry);
    const projectedLength = measureProjectedLineSetLength(projectedLines);
    const minimumProjectedLength = lineClass === "mainline" ? 110 : lineClass === "regional" ? 72 : 58;
    if (projectedLength < minimumProjectedLength) return;
    labelCandidates.push({
      label,
      lineClass,
      projectedLength,
      x: anchorProjected[0],
      y: anchorProjected[1],
    });
  });
  const stationCollection = runtimeState.railStationsMajorData;
  const stationFeatureCount = getFeatureCollectionFeatureCount(stationCollection);
  if (Array.isArray(stationCollection?.features) && stationCollection.features.length) {
    drawContextFacilityPointLayer("drawRailStationsMajorLayer", stationCollection, k, {
      familyId: "rail",
      interactive,
      visible,
      thresholdRank: 1,
      shape: "square",
      fillStyle: visualStyle.regionalStroke,
      strokeStyle: mixCanvasColors(visualStyle.regionalStroke, "#ffffff", 0.7) || "#ffffff",
      labelColor: visualStyle.mainlineStroke,
      opacity: clamp(Number(railConfig.opacity ?? 0.72), 0, 1) * 0.9 * strategy.opacityMultiplier,
      labelsEnabled: false,
      radiusScale: 0.92 * Math.max(0.88, strategy.widthMultiplier * 0.92),
      strokeScale: 0.95,
      hoverScale: 1.1,
      highlightStroke: "#ffffff",
      getLabelText: null,
    });
  } else {
    collectContextMetric("drawRailStationsMajorLayer", 0, {
      featureCount: stationFeatureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: visible ? "no-data" : "hidden",
    });
  }
  const labelZoomConfig = getTransportOverviewLabelZoomConfig("rail", railConfig.labelDensity);
  const labelsEnabled = !!railConfig.labelsEnabled && strategy.labelsEnabled;
  const visibleLabelEntries = [];
  if (labelsEnabled) {
    const gridSize = getTransportLineLabelGridSize(railConfig.labelDensity);
    const usedBuckets = new Set();
    labelCandidates
      .filter((entry) => entry.lineClass === "mainline" ? k >= labelZoomConfig.nationalLabelScale : k >= labelZoomConfig.regionalLabelScale)
      .sort((left, right) => {
        if (left.lineClass !== right.lineClass) return left.lineClass === "mainline" ? -1 : 1;
        return right.projectedLength - left.projectedLength;
      })
      .forEach((entry) => {
        const bucketKey = `${Math.round(entry.x / gridSize)}:${Math.round(entry.y / gridSize)}:${entry.lineClass}`;
        if (usedBuckets.has(bucketKey)) return;
        usedBuckets.add(bucketKey);
        visibleLabelEntries.push(entry);
      });
  }
  const visibleFeatureCount = featuresByClass.mainline.length + featuresByClass.regional.length + featuresByClass.secondary.length;
  if (!visibleFeatureCount) {
    collectContextMetric("drawRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "filtered",
    });
    drawCountryRailwaysLayer(k, { interactive });
    return;
  }

  const baseRailOpacity = clamp(Number(railConfig.opacity ?? 0.72), 0, 1);
  drawTransportOverviewLineSet(featuresByClass.secondary, {
    casingStroke: visualStyle.secondaryCasingStroke,
    innerStroke: visualStyle.secondaryStroke,
    casingWidth: visualStyle.secondaryCasingWidth,
    innerWidth: visualStyle.secondaryWidth,
    opacity: visualStyle.secondaryOpacity,
    dashPx: visualStyle.secondaryDashPx,
  }, {
    baseOpacity: baseRailOpacity,
    strategy,
    k,
    widthFloorPx: 0.78,
  });
  drawTransportOverviewLineSet(featuresByClass.regional, {
    casingStroke: visualStyle.regionalCasingStroke,
    innerStroke: visualStyle.regionalStroke,
    casingWidth: visualStyle.regionalCasingWidth,
    innerWidth: visualStyle.regionalWidth,
    opacity: visualStyle.regionalOpacity,
    dashPx: visualStyle.regionalDashPx,
  }, {
    baseOpacity: baseRailOpacity,
    strategy,
    k,
    widthFloorPx: 0.9,
  });
  drawTransportOverviewLineSet(featuresByClass.mainline, {
    casingStroke: visualStyle.mainlineCasingStroke,
    innerStroke: visualStyle.mainlineStroke,
    casingWidth: visualStyle.mainlineCasingWidth,
    innerWidth: visualStyle.mainlineWidth,
    opacity: visualStyle.mainlineOpacity,
  }, {
    baseOpacity: baseRailOpacity,
    strategy,
    k,
    widthFloorPx: 1.05,
  });

  let labelCount = 0;
  if (visibleLabelEntries.length) {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    visibleLabelEntries.forEach((entry) => {
      context.font = `${entry.lineClass === "mainline" ? 600 : 500} ${entry.lineClass === "mainline" ? 10.5 : 9.5}px "IBM Plex Sans", "Noto Sans JP", sans-serif`;
      context.lineWidth = 3;
      context.strokeStyle = "rgba(255,255,255,0.9)";
      context.fillStyle = visualStyle.mainlineStroke;
      context.strokeText(entry.label, entry.x, entry.y);
      context.fillText(entry.label, entry.x, entry.y);
      labelCount += 1;
    });
    context.restore();
  }

  collectContextMetric("drawRailwaysLayer", nowMs() - startedAt, {
    featureCount,
    visibleFeatureCount,
    labelCount,
    interactive: !!interactive,
    skipped: false,
  });
  drawCountryRailwaysLayer(k, { interactive });
}

function drawRoadsLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  const startedAt = nowMs();
  const visible = !!runtimeState.showTransport && !!runtimeState.showRoad;
  const collection = runtimeState.roadsData;
  const featureCount = getFeatureCollectionFeatureCount(collection);
  if (!visible) {
    collectContextMetric("drawRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "hidden",
    });
    return;
  }
  if (interactive) {
    collectContextMetric("drawRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: true,
      skipped: true,
      reason: "interactive-pass",
    });
    return;
  }
  if (!collection?.features?.length || !pathCanvas) {
    collectContextMetric("drawRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: !pathCanvas ? "no-path" : "no-data",
    });
    drawCountryRoadsLayer(k, { interactive });
    return;
  }
  const roadConfig = getTransportOverviewFamilyConfig("road");
  const strategy = resolveTransportOverviewLineStrategy("road", roadConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  const minimumScopeRank = strategy.minimumScopeRank;
  const maximumRevealRank = strategy.maximumRevealRank;
  const visualStyle = getTransportOverviewRoadVisualStyle(roadConfig.primaryColor, roadConfig.visualStrength);
  const featuresByClass = {
    secondary: [],
    primary: [],
    trunk: [],
    motorway: [],
  };
  collection.features.forEach((feature) => {
    const properties = feature?.properties || {};
    const roadClass = String(properties.class || "").trim().toLowerCase();
    const defaultRevealRank = roadClass === "motorway" ? 1 : roadClass === "trunk" ? 2 : 3;
    const revealRank = Math.max(1, Math.round(Number(properties.reveal_rank || defaultRevealRank)));
    if (revealRank > maximumRevealRank) return;
    if (getTransportOverviewLineClassScopeRank("road", roadClass) > minimumScopeRank) return;
    if (roadClass === "motorway") {
      featuresByClass.motorway.push(feature);
    } else if (roadClass === "trunk") {
      featuresByClass.trunk.push(feature);
    } else if (roadClass === "primary") {
      featuresByClass.primary.push(feature);
    } else if (roadClass === "secondary") {
      featuresByClass.secondary.push(feature);
    }
  });
  const visibleFeatureCount = featuresByClass.motorway.length + featuresByClass.trunk.length + featuresByClass.primary.length + featuresByClass.secondary.length;
  if (!visibleFeatureCount) {
    collectContextMetric("drawRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "filtered",
    });
    drawCountryRoadsLayer(k, { interactive });
    return;
  }

  const baseRoadOpacity = clamp(Number(roadConfig.opacity ?? 0.72), 0, 1);
  drawTransportOverviewLineSet(featuresByClass.secondary, {
    casingStroke: visualStyle.secondaryCasingStroke,
    innerStroke: visualStyle.secondaryStroke,
    casingWidth: visualStyle.secondaryCasingWidth,
    innerWidth: visualStyle.secondaryWidth,
    opacity: visualStyle.secondaryOpacity,
    dashPx: visualStyle.secondaryDashPx,
  }, {
    baseOpacity: baseRoadOpacity,
    strategy,
    k,
    widthFloorPx: 0.68,
  });
  drawTransportOverviewLineSet(featuresByClass.primary, {
    casingStroke: visualStyle.primaryCasingStroke,
    innerStroke: visualStyle.primaryStroke,
    casingWidth: visualStyle.primaryCasingWidth,
    innerWidth: visualStyle.primaryWidth,
    opacity: visualStyle.primaryOpacity,
    dashPx: visualStyle.primaryDashPx,
  }, {
    baseOpacity: baseRoadOpacity,
    strategy,
    k,
    widthFloorPx: 0.78,
  });
  drawTransportOverviewLineSet(featuresByClass.trunk, {
    casingStroke: visualStyle.trunkCasingStroke,
    innerStroke: visualStyle.trunkStroke,
    casingWidth: visualStyle.trunkCasingWidth,
    innerWidth: visualStyle.trunkWidth,
    opacity: visualStyle.trunkOpacity,
    dashPx: visualStyle.trunkDashPx,
  }, {
    baseOpacity: baseRoadOpacity,
    strategy,
    k,
    widthFloorPx: 0.95,
  });
  drawTransportOverviewLineSet(featuresByClass.motorway, {
    casingStroke: visualStyle.motorwayCasingStroke,
    innerStroke: visualStyle.motorwayStroke,
    casingWidth: visualStyle.motorwayCasingWidth,
    innerWidth: visualStyle.motorwayWidth,
    opacity: visualStyle.motorwayOpacity,
  }, {
    baseOpacity: baseRoadOpacity,
    strategy,
    k,
    widthFloorPx: 1.1,
  });

  const labelZoomConfig = getTransportOverviewLabelZoomConfig("road", roadConfig.labelDensity);
  const labelsEnabled = !!roadConfig.labelsEnabled && strategy.labelsEnabled && typeof projection === "function";
  let labelCount = 0;
  if (labelsEnabled) {
    const gridSize = getTransportLineLabelGridSize(roadConfig.labelDensity);
    const usedBuckets = new Set();
    const labelCandidates = [];
    const classPriority = { motorway: 4, trunk: 3, primary: 2, secondary: 1 };
    Object.entries(featuresByClass).forEach(([roadClass, features]) => {
      features.forEach((feature) => {
        const properties = feature?.properties || {};
        const label = getTransportOverviewRoadLabelText(properties, roadConfig.labelMode);
        if (!label) return;
        const anchorGeo = getLineFeatureLabelAnchor(feature);
        if (!Array.isArray(anchorGeo) || anchorGeo.length < 2) return;
        const anchorProjected = projection(anchorGeo);
        if (!Array.isArray(anchorProjected) || anchorProjected.length < 2 || !Number.isFinite(anchorProjected[0]) || !Number.isFinite(anchorProjected[1])) return;
        const projectedLines = buildProjectedRailLines(feature.geometry);
        const projectedLength = measureProjectedLineSetLength(projectedLines);
        const minimumProjectedLength = roadClass === "motorway" ? 120 : roadClass === "trunk" ? 88 : 70;
        if (projectedLength < minimumProjectedLength) return;
        labelCandidates.push({
          label,
          roadClass,
          projectedLength,
          x: anchorProjected[0],
          y: anchorProjected[1],
          priority: classPriority[roadClass] || 0,
        });
      });
    });
    const visibleLabelEntries = [];
    labelCandidates
      .filter((entry) => entry.priority >= 4 ? k >= labelZoomConfig.nationalLabelScale : k >= labelZoomConfig.regionalLabelScale)
      .sort((left, right) => {
        if (left.priority !== right.priority) return right.priority - left.priority;
        return right.projectedLength - left.projectedLength;
      })
      .forEach((entry) => {
        const bucketKey = `${Math.round(entry.x / gridSize)}:${Math.round(entry.y / gridSize)}`;
        if (usedBuckets.has(bucketKey)) return;
        usedBuckets.add(bucketKey);
        visibleLabelEntries.push(entry);
      });
    if (visibleLabelEntries.length) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      visibleLabelEntries.forEach((entry) => {
        const isMotorway = entry.roadClass === "motorway";
        context.font = `${isMotorway ? 600 : 500} ${isMotorway ? 10.5 : 9.5}px "IBM Plex Sans", "Noto Sans JP", sans-serif`;
        context.lineWidth = 3;
        context.strokeStyle = "rgba(255,255,255,0.88)";
        context.fillStyle = isMotorway ? visualStyle.motorwayStroke : visualStyle.trunkStroke;
        context.strokeText(entry.label, entry.x, entry.y);
        context.fillText(entry.label, entry.x, entry.y);
        labelCount += 1;
      });
      context.restore();
    }
  }

  collectContextMetric("drawRoadsLayer", nowMs() - startedAt, {
    featureCount,
    visibleFeatureCount,
    labelCount,
    interactive: !!interactive,
    skipped: false,
  });
  drawCountryRoadsLayer(k, { interactive });
}


function drawCountryRailwaysLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  const startedAt = nowMs();
  const overlayState = getTransportCountryOverlayStateForFamily("rail");
  if (!overlayState) return;
  const visible = !!runtimeState.showTransport && !!runtimeState.showRail;
  const collection = overlayState.collectionsByLayer?.railways;
  const stationCollection = overlayState.collectionsByLayer?.rail_stations_major;
  const featureCount = getFeatureCollectionFeatureCount(collection);
  if (!visible) {
    collectContextMetric("drawCountryRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "hidden",
    });
    setVisibleFacilityHoverEntries("rail", [], { append: true, packId: overlayState.activePackId });
    return;
  }
  if (interactive) {
    collectContextMetric("drawCountryRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: true,
      skipped: true,
      reason: "interactive-pass",
    });
    return;
  }
  const railConfig = getTransportOverviewFamilyConfig("rail");
  const strategy = resolveTransportOverviewLineStrategy("rail", railConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  const visualStyle = getTransportOverviewRailVisualStyle(railConfig.primaryColor, railConfig.visualStrength);
  drawContextFacilityPointLayer("drawCountryRailStationsMajorLayer", stationCollection, k, {
    familyId: "rail",
    interactive,
    visible,
    thresholdRank: 1,
    shape: "square",
    fillStyle: visualStyle.regionalStroke,
    strokeStyle: mixCanvasColors(visualStyle.regionalStroke, "#ffffff", 0.7) || "#ffffff",
    labelColor: visualStyle.mainlineStroke,
    opacity: clamp(Number(railConfig.opacity ?? 0.72), 0, 1) * 0.9 * strategy.opacityMultiplier,
    labelsEnabled: false,
    radiusScale: 0.92 * Math.max(0.88, strategy.widthMultiplier * 0.92),
    strokeScale: 0.95,
    hoverScale: 1.1,
    highlightStroke: "#ffffff",
    getLabelText: null,
    packId: overlayState.activePackId,
    appendHoverEntries: true,
  });
  if (!collection?.features?.length || !pathCanvas) {
    collectContextMetric("drawCountryRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: !pathCanvas ? "no-path" : "no-data",
    });
    return;
  }
  const featuresByClass = {
    secondary: [],
    regional: [],
    mainline: [],
  };
  collection.features.forEach((feature) => {
    const properties = feature?.properties || {};
    const lineClass = String(properties.class || "").trim().toLowerCase();
    const revealRank = Math.max(1, Math.round(Number(properties.reveal_rank || (lineClass === "mainline" ? 1 : 2))));
    if (revealRank > strategy.maximumRevealRank) return;
    if (getTransportOverviewLineClassScopeRank("rail", lineClass) > strategy.minimumScopeRank) return;
    if (lineClass === "mainline") featuresByClass.mainline.push(feature);
    else if (lineClass === "regional") featuresByClass.regional.push(feature);
    else if (lineClass === "secondary") featuresByClass.secondary.push(feature);
  });
  const visibleFeatureCount = featuresByClass.mainline.length + featuresByClass.regional.length + featuresByClass.secondary.length;
  if (!visibleFeatureCount) {
    collectContextMetric("drawCountryRailwaysLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "filtered",
    });
    return;
  }
  const baseRailOpacity = clamp(Number(railConfig.opacity ?? 0.72), 0, 1);
  drawTransportOverviewLineSet(featuresByClass.secondary, {
    casingStroke: visualStyle.secondaryCasingStroke,
    innerStroke: visualStyle.secondaryStroke,
    casingWidth: visualStyle.secondaryCasingWidth,
    innerWidth: visualStyle.secondaryWidth,
    opacity: visualStyle.secondaryOpacity,
    dashPx: visualStyle.secondaryDashPx,
  }, { baseOpacity: baseRailOpacity, strategy, k, widthFloorPx: 0.78 });
  drawTransportOverviewLineSet(featuresByClass.regional, {
    casingStroke: visualStyle.regionalCasingStroke,
    innerStroke: visualStyle.regionalStroke,
    casingWidth: visualStyle.regionalCasingWidth,
    innerWidth: visualStyle.regionalWidth,
    opacity: visualStyle.regionalOpacity,
    dashPx: visualStyle.regionalDashPx,
  }, { baseOpacity: baseRailOpacity, strategy, k, widthFloorPx: 0.9 });
  drawTransportOverviewLineSet(featuresByClass.mainline, {
    casingStroke: visualStyle.mainlineCasingStroke,
    innerStroke: visualStyle.mainlineStroke,
    casingWidth: visualStyle.mainlineCasingWidth,
    innerWidth: visualStyle.mainlineWidth,
    opacity: visualStyle.mainlineOpacity,
  }, { baseOpacity: baseRailOpacity, strategy, k, widthFloorPx: 1.05 });
  collectContextMetric("drawCountryRailwaysLayer", nowMs() - startedAt, {
    featureCount,
    visibleFeatureCount,
    labelCount: 0,
    interactive: !!interactive,
    skipped: false,
  });
}

function drawCountryRoadsLayer(k, { interactive = false } = {}) {
  syncRenderTargets();
  const startedAt = nowMs();
  const overlayState = getTransportCountryOverlayStateForFamily("road");
  if (!overlayState) return;
  const visible = !!runtimeState.showTransport && !!runtimeState.showRoad;
  const collection = overlayState.collectionsByLayer?.roads;
  const labelCollection = overlayState.collectionsByLayer?.road_labels;
  const featureCount = getFeatureCollectionFeatureCount(collection);
  if (!visible) {
    collectContextMetric("drawCountryRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "hidden",
    });
    return;
  }
  if (interactive) {
    collectContextMetric("drawCountryRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: true,
      skipped: true,
      reason: "interactive-pass",
    });
    return;
  }
  if (!collection?.features?.length || !pathCanvas) {
    collectContextMetric("drawCountryRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: !pathCanvas ? "no-path" : "no-data",
    });
    return;
  }
  const roadConfig = getTransportOverviewFamilyConfig("road");
  const strategy = resolveTransportOverviewLineStrategy("road", roadConfig, {
    scale: k,
    visualMode: getTransportOverviewVisualMode(),
  });
  const visualStyle = getTransportOverviewRoadVisualStyle(roadConfig.primaryColor, roadConfig.visualStrength);
  const featuresByClass = {
    secondary: [],
    primary: [],
    trunk: [],
    motorway: [],
  };
  collection.features.forEach((feature) => {
    const properties = feature?.properties || {};
    const roadClass = String(properties.class || "").trim().toLowerCase();
    const defaultRevealRank = roadClass === "motorway" ? 1 : roadClass === "trunk" ? 2 : 3;
    const revealRank = Math.max(1, Math.round(Number(properties.reveal_rank || defaultRevealRank)));
    if (revealRank > strategy.maximumRevealRank) return;
    if (getTransportOverviewLineClassScopeRank("road", roadClass) > strategy.minimumScopeRank) return;
    if (roadClass === "motorway") featuresByClass.motorway.push(feature);
    else if (roadClass === "trunk") featuresByClass.trunk.push(feature);
    else if (roadClass === "primary") featuresByClass.primary.push(feature);
    else if (roadClass === "secondary") featuresByClass.secondary.push(feature);
  });
  const visibleFeatureCount = featuresByClass.motorway.length + featuresByClass.trunk.length + featuresByClass.primary.length + featuresByClass.secondary.length;
  if (!visibleFeatureCount) {
    collectContextMetric("drawCountryRoadsLayer", nowMs() - startedAt, {
      featureCount,
      visibleFeatureCount: 0,
      labelCount: 0,
      interactive: !!interactive,
      skipped: true,
      reason: "filtered",
    });
    return;
  }
  const baseRoadOpacity = clamp(Number(roadConfig.opacity ?? 0.72), 0, 1);
  drawTransportOverviewLineSet(featuresByClass.secondary, {
    casingStroke: visualStyle.secondaryCasingStroke,
    innerStroke: visualStyle.secondaryStroke,
    casingWidth: visualStyle.secondaryCasingWidth,
    innerWidth: visualStyle.secondaryWidth,
    opacity: visualStyle.secondaryOpacity,
    dashPx: visualStyle.secondaryDashPx,
  }, { baseOpacity: baseRoadOpacity, strategy, k, widthFloorPx: 0.68 });
  drawTransportOverviewLineSet(featuresByClass.primary, {
    casingStroke: visualStyle.primaryCasingStroke,
    innerStroke: visualStyle.primaryStroke,
    casingWidth: visualStyle.primaryCasingWidth,
    innerWidth: visualStyle.primaryWidth,
    opacity: visualStyle.primaryOpacity,
    dashPx: visualStyle.primaryDashPx,
  }, { baseOpacity: baseRoadOpacity, strategy, k, widthFloorPx: 0.78 });
  drawTransportOverviewLineSet(featuresByClass.trunk, {
    casingStroke: visualStyle.trunkCasingStroke,
    innerStroke: visualStyle.trunkStroke,
    casingWidth: visualStyle.trunkCasingWidth,
    innerWidth: visualStyle.trunkWidth,
    opacity: visualStyle.trunkOpacity,
    dashPx: visualStyle.trunkDashPx,
  }, { baseOpacity: baseRoadOpacity, strategy, k, widthFloorPx: 0.95 });
  drawTransportOverviewLineSet(featuresByClass.motorway, {
    casingStroke: visualStyle.motorwayCasingStroke,
    innerStroke: visualStyle.motorwayStroke,
    casingWidth: visualStyle.motorwayCasingWidth,
    innerWidth: visualStyle.motorwayWidth,
    opacity: visualStyle.motorwayOpacity,
  }, { baseOpacity: baseRoadOpacity, strategy, k, widthFloorPx: 1.1 });

  const labelZoomConfig = getTransportOverviewLabelZoomConfig("road", roadConfig.labelDensity);
  const labelsEnabled = !!roadConfig.labelsEnabled && strategy.labelsEnabled && typeof projection === "function";
  let labelCount = 0;
  if (labelsEnabled && Array.isArray(labelCollection?.features) && labelCollection.features.length) {
    const gridSize = getTransportLineLabelGridSize(roadConfig.labelDensity);
    const usedBuckets = new Set();
    const visibleLabelEntries = [];
    labelCollection.features
      .map((feature) => {
        const properties = feature?.properties || {};
        const coordinates = feature?.geometry?.coordinates;
        const label = getTransportOverviewRoadLabelText(properties, roadConfig.labelMode);
        if (!label || !Array.isArray(coordinates) || coordinates.length < 2) return null;
        const anchorProjected = projection(coordinates);
        if (!Array.isArray(anchorProjected) || anchorProjected.length < 2 || !Number.isFinite(anchorProjected[0]) || !Number.isFinite(anchorProjected[1])) return null;
        const { roadClass, priority } = resolveTransportRoadLabelClassAndPriority(properties);
        return {
          label,
          roadClass,
          priority,
          x: anchorProjected[0],
          y: anchorProjected[1],
        };
      })
      .filter(Boolean)
      .filter((entry) => entry.priority >= 4 ? k >= labelZoomConfig.nationalLabelScale : k >= labelZoomConfig.regionalLabelScale)
      .sort((left, right) => right.priority - left.priority)
      .forEach((entry) => {
        const bucketKey = `${Math.round(entry.x / gridSize)}:${Math.round(entry.y / gridSize)}`;
        if (usedBuckets.has(bucketKey)) return;
        usedBuckets.add(bucketKey);
        visibleLabelEntries.push(entry);
      });
    if (visibleLabelEntries.length) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      visibleLabelEntries.forEach((entry) => {
        const isMotorway = entry.priority >= 4;
        context.font = `${isMotorway ? 600 : 500} ${isMotorway ? 10.5 : 9.5}px "IBM Plex Sans", "Noto Sans JP", sans-serif`;
        context.lineWidth = 3;
        context.strokeStyle = "rgba(255,255,255,0.88)";
        context.fillStyle = isMotorway ? visualStyle.motorwayStroke : visualStyle.trunkStroke;
        context.strokeText(entry.label, entry.x, entry.y);
        context.fillText(entry.label, entry.x, entry.y);
        labelCount += 1;
      });
      context.restore();
    }
  }
  collectContextMetric("drawCountryRoadsLayer", nowMs() - startedAt, {
    featureCount,
    visibleFeatureCount,
    labelCount,
    interactive: !!interactive,
    skipped: false,
  });
}


  return {
    drawAirportsLayer,
    drawPortsLayer,
    drawRailwaysLayer,
    drawRoadsLayer,
    getTransportOverviewStyleConfig,
  };
}
