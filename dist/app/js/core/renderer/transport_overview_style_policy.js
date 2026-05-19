import { ColorManager } from "../color_manager.js";

function clampUnit(value, fallback = 0.5) {
  const numericValue = Number(value);
  return Math.min(1, Math.max(0, Number.isFinite(numericValue) ? numericValue : fallback));
}

export function getTransportOverviewPrimaryColor(value, fallback = "#1d4ed8") {
  return ColorManager.normalizeHexColor(String(value || "").trim()) || fallback;
}

export function buildTransportFacilityVisualStyle(primaryColor, visualStrength, fallback = "#1d4ed8") {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, fallback);
  const strength = clampUnit(visualStrength, 0.56);
  const luminance = ColorManager.getHexRelativeLuminance(resolvedPrimaryColor);
  const strokeTarget = Number.isFinite(luminance) && luminance < 0.4 ? "#f8fbff" : "#ffffff";
  const labelTarget = Number.isFinite(luminance) && luminance < 0.56 ? "#f8fafc" : "#0f172a";
  return {
    fillStyle: resolvedPrimaryColor,
    strokeStyle: ColorManager.mixHexColors(resolvedPrimaryColor, strokeTarget, 0.72) || strokeTarget,
    labelColor: ColorManager.mixHexColors(resolvedPrimaryColor, labelTarget, Number.isFinite(luminance) && luminance < 0.56 ? 0.48 : 0.78) || labelTarget,
    highlightStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#ffffff", 0.82) || "#ffffff",
    radiusScale: 0.95 + (strength * 0.62),
    strokeScale: 0.9 + (strength * 0.35),
    hoverScale: 1.12 + (strength * 0.12),
  };
}

export function getTransportOverviewAirportVisualStyle(primaryColor, visualStrength) {
  return buildTransportFacilityVisualStyle(primaryColor, visualStrength, "#1d4ed8");
}

export function getTransportOverviewPortVisualStyle(primaryColor, visualStrength) {
  return buildTransportFacilityVisualStyle(primaryColor, visualStrength, "#b45309");
}

export function getTransportOverviewRailVisualStyle(primaryColor, visualStrength) {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, "#0f172a");
  const strength = clampUnit(visualStrength, 0.5);
  return {
    mainlineCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#f8fafc", 0.82) || "#f8fafc",
    mainlineStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#020617", 0.28) || resolvedPrimaryColor,
    regionalCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#f1f5f9", 0.72) || "#f1f5f9",
    regionalStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#64748b", 0.34) || resolvedPrimaryColor,
    secondaryCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#e2e8f0", 0.62) || "#e2e8f0",
    secondaryStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#94a3b8", 0.42) || resolvedPrimaryColor,
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

export function getTransportOverviewRoadVisualStyle(primaryColor, visualStrength) {
  const resolvedPrimaryColor = getTransportOverviewPrimaryColor(primaryColor, "#374151");
  const strength = clampUnit(visualStrength, 0.5);
  return {
    motorwayCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#f9fafb", 0.86) || "#f9fafb",
    motorwayStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#111827", 0.22) || resolvedPrimaryColor,
    trunkCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#e5e7eb", 0.68) || "#e5e7eb",
    trunkStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#111827", 0.1) || resolvedPrimaryColor,
    primaryCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#e5e7eb", 0.54) || "#e5e7eb",
    primaryStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#4b5563", 0.18) || resolvedPrimaryColor,
    secondaryCasingStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#d1d5db", 0.44) || "#d1d5db",
    secondaryStroke: ColorManager.mixHexColors(resolvedPrimaryColor, "#6b7280", 0.26) || resolvedPrimaryColor,
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
