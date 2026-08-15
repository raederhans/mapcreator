export const EXPORT_MAX_DIMENSION_PX = 7680;
export const EXPORT_MAX_PIXELS = 7680 * 4320;

export function resolveExportBaseDimensions(runtimeView, devicePixelRatio = globalThis.devicePixelRatio) {
  const dpr = Math.max(1, Number(runtimeView?.dpr || devicePixelRatio || 1));
  const fallbackLogicalWidth = Number(runtimeView?.colorCanvas?.width || 0) / dpr;
  const fallbackLogicalHeight = Number(runtimeView?.colorCanvas?.height || 0) / dpr;
  const width = Math.round(Number(runtimeView?.width || fallbackLogicalWidth || 0));
  const height = Math.round(Number(runtimeView?.height || fallbackLogicalHeight || 0));
  return { width, height };
}

export function buildExportAdjustmentFilter(exportUi) {
  const adjustments = exportUi?.adjustments || {};
  const brightness = Math.max(0, Number(adjustments.brightness || 100)) / 100;
  const saturation = Math.max(0, Number(adjustments.saturation || 100)) / 100;
  const contrast = (Math.max(0, Number(adjustments.contrast || 100)) / 100)
    * (0.88 + (Math.max(0, Number(adjustments.clarity || 100)) / 100) * 0.12);
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
}

export function getBakePassNamesForLayer(layerId, exportUi, {
  resolvePassSequence,
  renderPassNames,
} = {}) {
  const visibility = exportUi?.visibility || {};
  const textVisibility = exportUi?.textVisibility || {};
  if (layerId === "color") {
    return [
      ...(visibility.background === false ? [] : ["background"]),
      ...(visibility.political === false ? [] : ["physicalBase", "political"]),
      ...(visibility.context === false ? [] : ["contextBase", "contextScenario"]),
      ...(visibility.effects === false ? [] : ["effects", "dayNight"]),
    ];
  }
  if (layerId === "line") {
    return visibility.effects === false ? [] : ["lineEffects", "borders"];
  }
  if (layerId === "text") {
    return textVisibility["render-labels"] === false ? [] : ["labels"];
  }
  if (layerId === "composite") {
    if (typeof resolvePassSequence !== "function") {
      throw new TypeError("getBakePassNamesForLayer requires resolvePassSequence for composite layers.");
    }
    return resolvePassSequence({
      ...exportUi,
      visibility,
    }, renderPassNames).filter((passName) => textVisibility["render-labels"] !== false || passName !== "labels");
  }
  return [];
}

export function getBakePackLayerIds(exportUi) {
  const visibleMainLayers = (exportUi?.layerOrder || []).filter(
    (layerId) => exportUi?.visibility?.[layerId] !== false,
  );
  const hasVisibleMainLayers = visibleMainLayers.length > 0;
  const hasEffectsLayer = visibleMainLayers.includes("effects");
  const hasTextLayer = Object.values(exportUi?.textVisibility || {}).some(Boolean);
  const next = [];
  if (hasVisibleMainLayers) next.push("color");
  if (hasEffectsLayer) next.push("line");
  if (hasTextLayer) next.push("text");
  if (hasVisibleMainLayers || hasTextLayer) next.push("composite");
  return next;
}

export function buildExportArtifactScenarioContext(runtimeView) {
  const scenarioId = String(runtimeView?.activeScenarioId || "").trim();
  if (!scenarioId) return null;
  return {
    id: scenarioId,
    version: Number(runtimeView?.activeScenarioManifest?.version || 1) || 1,
    baselineHash: String(runtimeView?.scenarioBaselineHash || "").trim(),
  };
}

export function buildExportArtifactProjectContext(runtimeView) {
  return {
    dirtyRevision: Number(runtimeView?.dirtyRevision || 0) || 0,
    colorRevision: Number(runtimeView?.colorRevision || 0) || 0,
    topologyRevision: Number(runtimeView?.topologyRevision || 0) || 0,
  };
}

export function buildExportUiManifestSnapshot(exportUi) {
  return {
    target: exportUi?.target,
    format: exportUi?.format,
    scale: exportUi?.scale,
    layerOrder: [...(exportUi?.layerOrder || [])],
    visibility: { ...(exportUi?.visibility || {}) },
    textVisibility: { ...(exportUi?.textVisibility || {}) },
    adjustments: { ...(exportUi?.adjustments || {}) },
    bakeArtifacts: Array.isArray(exportUi?.bakeArtifacts) ? exportUi.bakeArtifacts : [],
  };
}

export function buildPerLayerExportPlan(exportUi) {
  const outputs = [];
  (exportUi?.layerOrder || []).forEach((layerId) => {
    if (exportUi?.visibility?.[layerId] === false) return;
    if (layerId === "labels" && exportUi?.textVisibility?.["render-labels"] === false) return;
    outputs.push({ id: layerId });
  });
  if (exportUi?.textVisibility?.["svg-annotations"]) outputs.push({ id: "svg-annotations" });
  if (exportUi?.textVisibility?.["special-zones"]) outputs.push({ id: "special-zones" });
  return outputs;
}

export function buildPerLayerPackageFiles(outputs) {
  return outputs.map((output) => ({
    path: `layers/map_layer_${output.id}.png`,
    role: "layer",
    mime: "image/png",
    canvas: output.canvas,
  }));
}

export function buildBakePackMetadata(exportUi, outputs, generatedAt = new Date().toISOString()) {
  return {
    version: 1,
    generatedAt,
    exportUi: {
      target: exportUi?.target,
      format: exportUi?.format,
      scale: exportUi?.scale,
      layerOrder: [...(exportUi?.layerOrder || [])],
      visibility: { ...(exportUi?.visibility || {}) },
      textVisibility: { ...(exportUi?.textVisibility || {}) },
      adjustments: { ...(exportUi?.adjustments || {}) },
    },
    bakeArtifacts: Array.isArray(exportUi?.bakeArtifacts) ? exportUi.bakeArtifacts : [],
    files: outputs.map((output) => `map_bake_${output.id}.png`),
  };
}

export function buildBakePackPackageFiles(outputs) {
  return outputs.map((output) => {
    if (output.canvas) {
      return {
        path: `layers/map_bake_${output.id}.png`,
        role: "bake-layer",
        mime: "image/png",
        canvas: output.canvas,
      };
    }
    return {
      path: `${output.fileStem || output.id}.${output.extension || "json"}`,
      role: "legacy-metadata",
      mime: "application/json",
      blob: output.blob,
    };
  });
}
