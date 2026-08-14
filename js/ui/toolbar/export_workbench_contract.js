// Shared export workbench state and render-pass contract.

import { replaceExportWorkbenchUiState } from "../../core/state/index.js";

const EXPORT_MAIN_LAYER_VIEW_MODELS = Object.freeze([
  Object.freeze({ id: "background", name: "Background", summary: "Base frame", passNames: ["background"] }),
  Object.freeze({ id: "political", name: "Political", summary: "Terrain + ownership", passNames: ["physicalBase", "political"] }),
  Object.freeze({ id: "context", name: "Context", summary: "Scenario overlays", passNames: ["contextBase", "contextScenario"] }),
  Object.freeze({ id: "effects", name: "Effects", summary: "Borders + overlays", passNames: ["effects", "lineEffects", "contextMarkers", "dayNight", "borders", "textureLabels"] }),
  Object.freeze({ id: "labels", name: "Labels", summary: "Render-pass labels", passNames: ["labels"] }),
]);
const EXPORT_MAIN_LAYER_IDS = Object.freeze(EXPORT_MAIN_LAYER_VIEW_MODELS.map((layer) => layer.id));
const EXPORT_MAIN_LAYER_MODEL_BY_ID = new Map(EXPORT_MAIN_LAYER_VIEW_MODELS.map((layer) => [layer.id, layer]));

const EXPORT_TEXT_LAYER_VIEW_MODELS = Object.freeze([
  Object.freeze({ id: "render-labels", name: "Render-pass labels", summary: "City and map labels from the labels pass" }),
  Object.freeze({ id: "special-zones", name: "Special zones", summary: "Layer-based special zone fills, patterns, and outlines" }),
  Object.freeze({ id: "svg-annotations", name: "SVG annotations", summary: "Frontlines, graphics, counters, and other SVG overlays" }),
]);
const EXPORT_TEXT_LAYER_IDS = Object.freeze(EXPORT_TEXT_LAYER_VIEW_MODELS.map((layer) => layer.id));
const EXPORT_TEXT_LAYER_MODEL_BY_ID = new Map(EXPORT_TEXT_LAYER_VIEW_MODELS.map((layer) => [layer.id, layer]));

const EXPORT_BAKE_OUTPUT_MODELS = Object.freeze([
  Object.freeze({ id: "color", name: "Color bake", summary: "Base color and scenario fills" }),
  Object.freeze({ id: "line", name: "Line bake", summary: "Borders and line effects" }),
  Object.freeze({ id: "text", name: "Text bake", summary: "SVG annotations and text overlays" }),
  Object.freeze({ id: "composite", name: "Composite bake", summary: "Full packed export layer" }),
]);
const EXPORT_BAKE_OUTPUT_IDS = Object.freeze(EXPORT_BAKE_OUTPUT_MODELS.map((item) => item.id));
const EXPORT_BAKE_OUTPUT_ID = Object.freeze(Object.fromEntries(EXPORT_BAKE_OUTPUT_IDS.map((id) => [id, id])));
const EXPORT_BAKE_OUTPUT_MODEL_BY_ID = new Map(EXPORT_BAKE_OUTPUT_MODELS.map((item) => [item.id, item]));

function normalizeExportWorkbenchLayerOrder(value) {
  const nextOrder = Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter((entry) => EXPORT_MAIN_LAYER_IDS.includes(entry))
    : [];
  const deduped = Array.from(new Set(nextOrder));
  EXPORT_MAIN_LAYER_IDS.forEach((layerId) => {
    if (!deduped.includes(layerId)) deduped.push(layerId);
  });
  return deduped;
}

function normalizeExportWorkbenchVisibility(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(EXPORT_MAIN_LAYER_IDS.map((layerId) => [layerId, source[layerId] !== false]));
}

function normalizeExportWorkbenchTextVisibility(value, includeTextLayer = true) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(EXPORT_TEXT_LAYER_IDS.map((layerId) => [
    layerId,
    source[layerId] === undefined ? !!includeTextLayer : source[layerId] !== false,
  ]));
}

function ensureExportWorkbenchUiState(state, normalizeExportWorkbenchUiState) {
  const existingBakeCache = state.exportWorkbenchUi?.bakeCache instanceof Map
    ? state.exportWorkbenchUi.bakeCache
    : null;
  const exportWorkbenchUi = replaceExportWorkbenchUiState(state, state.exportWorkbenchUi, {
    normalizeState: normalizeExportWorkbenchUiState,
  });
  exportWorkbenchUi.layerOrder = normalizeExportWorkbenchLayerOrder(exportWorkbenchUi.layerOrder);
  exportWorkbenchUi.visibility = normalizeExportWorkbenchVisibility(exportWorkbenchUi.visibility);
  exportWorkbenchUi.textVisibility = normalizeExportWorkbenchTextVisibility(
    exportWorkbenchUi.textVisibility,
    exportWorkbenchUi.includeTextLayer,
  );
  exportWorkbenchUi.includeTextLayer = Object.values(exportWorkbenchUi.textVisibility).some(Boolean);
  exportWorkbenchUi.scale = ["1", "1.5", "2", "4"].includes(String(exportWorkbenchUi.scale || "").trim())
    ? String(exportWorkbenchUi.scale || "").trim()
    : "2";
  exportWorkbenchUi.previewMode = String(exportWorkbenchUi.previewMode || "").trim().toLowerCase() === "layer"
    ? "layer"
    : "main";
  exportWorkbenchUi.previewLayerId = [...EXPORT_MAIN_LAYER_IDS, ...EXPORT_TEXT_LAYER_IDS]
    .includes(String(exportWorkbenchUi.previewLayerId || "").trim())
    ? String(exportWorkbenchUi.previewLayerId || "").trim()
    : "background";
  const adjustments = exportWorkbenchUi.adjustments && typeof exportWorkbenchUi.adjustments === "object"
    ? exportWorkbenchUi.adjustments
    : {};
  exportWorkbenchUi.adjustments = {
    brightness: Math.max(0, Math.min(200, Math.round(Number(adjustments.brightness) || 100))),
    contrast: Math.max(0, Math.min(200, Math.round(Number(adjustments.contrast) || 100))),
    saturation: Math.max(0, Math.min(200, Math.round(Number(adjustments.saturation) || 100))),
    clarity: Math.max(0, Math.min(200, Math.round(Number(adjustments.clarity) || 100))),
  };
  exportWorkbenchUi.bakeCache = existingBakeCache || new Map();
  return exportWorkbenchUi;
}

function resolveExportPassSequence(exportWorkbenchUi, renderPassNames) {
  const source = exportWorkbenchUi && typeof exportWorkbenchUi === "object" ? exportWorkbenchUi : {};
  const layerOrder = normalizeExportWorkbenchLayerOrder(source.layerOrder);
  const visibility = normalizeExportWorkbenchVisibility(source.visibility);
  const selectedPasses = layerOrder.flatMap((layerId) => (
    visibility[layerId] === false ? [] : [...(EXPORT_MAIN_LAYER_MODEL_BY_ID.get(layerId)?.passNames || [])]
  ));
  return Array.from(new Set(selectedPasses)).filter((passName) => renderPassNames.includes(passName));
}

export {
  EXPORT_BAKE_OUTPUT_IDS,
  EXPORT_BAKE_OUTPUT_ID,
  EXPORT_BAKE_OUTPUT_MODELS,
  EXPORT_BAKE_OUTPUT_MODEL_BY_ID,
  EXPORT_MAIN_LAYER_IDS,
  EXPORT_MAIN_LAYER_MODEL_BY_ID,
  EXPORT_TEXT_LAYER_IDS,
  EXPORT_TEXT_LAYER_MODEL_BY_ID,
  ensureExportWorkbenchUiState,
  normalizeExportWorkbenchLayerOrder,
  normalizeExportWorkbenchTextVisibility,
  normalizeExportWorkbenchVisibility,
  resolveExportPassSequence,
};
