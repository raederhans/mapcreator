// Export artifact pipeline owner.
// Owns canvas baking, adjustment, packaging, and download adapters for the export workbench.

import { buildExportArtifactPackage } from "../../core/export_artifact_package.js";
import { createExportError } from "./export_failure_handler.js";
import {
  EXPORT_BAKE_OUTPUT_ID,
  EXPORT_BAKE_OUTPUT_IDS,
  EXPORT_MAIN_LAYER_IDS,
  EXPORT_MAIN_LAYER_MODEL_BY_ID,
  EXPORT_TEXT_LAYER_IDS,
  ensureExportWorkbenchUiState,
  resolveExportPassSequence,
} from "./export_workbench_contract.js";

const EXPORT_MAX_DIMENSION_PX = 7680;
const EXPORT_MAX_PIXELS = 7680 * 4320;
const EXPORT_MAX_CONCURRENT_JOBS = 1;
const SVG_ANNOTATION_VIEWPORT_SELECTOR = [
  ".frontline-overlay-layer",
  ".frontline-labels-layer",
  ".operational-lines-layer",
  ".operation-graphics-layer",
  ".unit-counters-layer",
].join(", ");

function assertRequiredCallableDependency(value, name) {
  if (typeof value !== "function") {
    throw new TypeError(`createExportArtifactPipeline requires ${name} to be a function.`);
  }
}

function computeBakeHash(parts) {
  const source = Array.isArray(parts) ? parts.join("|") : String(parts || "");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function resolveExportBaseDimensions(state, devicePixelRatio = 1) {
  const dpr = Math.max(1, Number(state.dpr || devicePixelRatio || 1));
  const fallbackLogicalWidth = Number(state.colorCanvas?.width || 0) / dpr;
  const fallbackLogicalHeight = Number(state.colorCanvas?.height || 0) / dpr;
  return {
    width: Math.round(Number(state.width || fallbackLogicalWidth || 0)),
    height: Math.round(Number(state.height || fallbackLogicalHeight || 0)),
  };
}

function createExportArtifactPipeline({
  state,
  normalizeExportWorkbenchUiState,
  renderPassNames,
  renderExportPassesToCanvas,
  exportScale = null,
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
  devicePixelRatio = globalThis.devicePixelRatio,
  xmlSerializerCtor = documentRef?.defaultView?.XMLSerializer || globalThis.XMLSerializer,
  imageCtor = documentRef?.defaultView?.Image || globalThis.Image,
  blobCtor = documentRef?.defaultView?.Blob || globalThis.Blob,
  scheduleRevoke = (callback) => globalThis.setTimeout(callback, 0),
  now = () => Date.now(),
} = {}) {
  if (!state || typeof state !== "object") {
    throw new TypeError("createExportArtifactPipeline requires state to be an object.");
  }
  assertRequiredCallableDependency(normalizeExportWorkbenchUiState, "normalizeExportWorkbenchUiState");
  assertRequiredCallableDependency(renderExportPassesToCanvas, "renderExportPassesToCanvas");
  assertRequiredCallableDependency(scheduleRevoke, "scheduleRevoke");
  const availableRenderPassNames = Array.isArray(renderPassNames) ? renderPassNames : [];
  const getExportUi = () => ensureExportWorkbenchUiState(state, normalizeExportWorkbenchUiState);

  const getExportBakeVisibilitySignature = (exportUi) => {
    const main = EXPORT_MAIN_LAYER_IDS
      .map((layerId) => `${layerId}:${exportUi?.visibility?.[layerId] === false ? "0" : "1"}`)
      .join("|");
    const text = EXPORT_TEXT_LAYER_IDS
      .map((layerId) => `${layerId}:${exportUi?.textVisibility?.[layerId] === false ? "0" : "1"}`)
      .join("|");
    return `main=${main};text=${text}`;
  };

  const getLayerDependencyRevision = (layerId, exportUi = getExportUi()) => {
    const mapSvg = documentRef.getElementById("map-svg");
    const mapSvgChildCount = mapSvg ? mapSvg.childElementCount : 0;
    const renderPassCache = state.renderPassCache && typeof state.renderPassCache === "object"
      ? state.renderPassCache
      : {};
    const signatures = renderPassCache.signatures && typeof renderPassCache.signatures === "object"
      ? renderPassCache.signatures
      : {};
    const dirtyRevision = Number(state.dirtyRevision || 0);
    const zoomTransform = state.zoomTransform && typeof state.zoomTransform === "object"
      ? state.zoomTransform
      : { k: 1, x: 0, y: 0 };
    const transformSignature = [
      `zoomK:${Number(zoomTransform.k || 1).toFixed(5)}`,
      `zoomX:${Number(zoomTransform.x || 0).toFixed(2)}`,
      `zoomY:${Number(zoomTransform.y || 0).toFixed(2)}`,
    ];
    if (layerId === EXPORT_BAKE_OUTPUT_ID.color) {
      return [
        getExportBakeVisibilitySignature(exportUi),
        `colorRevision:${Number(state.colorRevision) || 0}`,
        `topologyRevision:${Number(state.topologyRevision) || 0}`,
        `dirtyRevision:${dirtyRevision}`,
        `passBackground:${String(signatures.background || "")}`,
        `passPhysicalBase:${String(signatures.physicalBase || "")}`,
        `passPolitical:${String(signatures.political || "")}`,
        `passContextBase:${String(signatures.contextBase || "")}`,
        `passContextScenario:${String(signatures.contextScenario || "")}`,
        `passEffects:${String(signatures.effects || "")}`,
        `passDayNight:${String(signatures.dayNight || "")}`,
      ];
    }
    if (layerId === EXPORT_BAKE_OUTPUT_ID.line) {
      return [
        getExportBakeVisibilitySignature(exportUi),
        `topologyRevision:${Number(state.topologyRevision) || 0}`,
        `dynamicDirty:${state.dynamicBordersDirty ? 1 : 0}`,
        `dirtyRevision:${dirtyRevision}`,
        `passBorders:${String(signatures.borders || "")}`,
        `passLineEffects:${String(signatures.lineEffects || "")}`,
      ];
    }
    if (layerId === EXPORT_BAKE_OUTPUT_ID.text) {
      return [
        getExportBakeVisibilitySignature(exportUi),
        `topologyRevision:${Number(state.topologyRevision) || 0}`,
        `svgChildren:${mapSvgChildCount}`,
        `dirtyRevision:${dirtyRevision}`,
        ...transformSignature,
      ];
    }
    return [
      getExportBakeVisibilitySignature(exportUi),
      `colorRevision:${Number(state.colorRevision) || 0}`,
      `topologyRevision:${Number(state.topologyRevision) || 0}`,
      `svgChildren:${mapSvgChildCount}`,
      `dirtyRevision:${dirtyRevision}`,
      ...transformSignature,
      `passPolitical:${String(signatures.political || "")}`,
      `passContextBase:${String(signatures.contextBase || "")}`,
      `passContextScenario:${String(signatures.contextScenario || "")}`,
      `passEffects:${String(signatures.effects || "")}`,
      `passBorders:${String(signatures.borders || "")}`,
      `passLineEffects:${String(signatures.lineEffects || "")}`,
      `passDayNight:${String(signatures.dayNight || "")}`,
      `passContextMarkers:${String(signatures.contextMarkers || "")}`,
      `passTextureLabels:${String(signatures.textureLabels || "")}`,
      `passLabels:${String(signatures.labels || "")}`,
    ];
  };

  const cloneSvgForExport = ({ onlyViewportSelector = "", removeSelectors = [] } = {}) => {
    const mapSvg = documentRef.getElementById("map-svg");
    if (!mapSvg) return null;
    const clone = mapSvg.cloneNode(true);
    removeSelectors.forEach((selector) => clone.querySelectorAll(selector).forEach((node) => node.remove()));
    if (onlyViewportSelector) {
      const viewport = clone.querySelector(".viewport-layer");
      if (viewport) {
        Array.from(viewport.children).forEach((child) => {
          if (!child.matches(onlyViewportSelector)) child.remove();
        });
      }
      Array.from(clone.children).forEach((child) => {
        const tagName = String(child.tagName || "").toLowerCase();
        if (child !== viewport && tagName !== "defs") child.remove();
      });
    }
    return clone;
  };

  const drawSvgLayerToCanvas = async (targetCanvas, targetCtx, options = {}) => {
    const svgForExport = cloneSvgForExport(options);
    if (!svgForExport || !targetCanvas || !targetCtx) return false;
    assertRequiredCallableDependency(xmlSerializerCtor, "xmlSerializerCtor");
    assertRequiredCallableDependency(imageCtor, "imageCtor");
    assertRequiredCallableDependency(blobCtor, "blobCtor");
    const serializer = new xmlSerializerCtor();
    const svgBlob = new blobCtor([serializer.serializeToString(svgForExport)], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = urlApi.createObjectURL(svgBlob);
    try {
      await new Promise((resolve, reject) => {
        const image = new imageCtor();
        image.onload = () => {
          targetCtx.drawImage(image, 0, 0);
          resolve();
        };
        image.onerror = () => reject(new Error("SVG overlay export failed."));
        image.src = svgUrl;
      });
      return true;
    } finally {
      urlApi.revokeObjectURL(svgUrl);
    }
  };

  const writeBakeArtifactMeta = (exportUi, layerId, dependencies, canvas, dirtyFlag) => {
    const entry = {
      layerId,
      updatedAt: now(),
      dependencies: [...dependencies],
      canvasSize: {
        width: Math.max(0, Math.round(Number(canvas?.width) || 0)),
        height: Math.max(0, Math.round(Number(canvas?.height) || 0)),
      },
      dirtyFlag: !!dirtyFlag,
    };
    const nextArtifacts = Array.isArray(exportUi.bakeArtifacts) ? [...exportUi.bakeArtifacts] : [];
    const existingIndex = nextArtifacts.findIndex((artifact) => artifact?.layerId === layerId);
    if (existingIndex >= 0) nextArtifacts[existingIndex] = entry;
    else nextArtifacts.push(entry);
    exportUi.bakeArtifacts = nextArtifacts;
    return entry;
  };

  const buildExportAdjustmentFilter = (exportUi) => {
    const adjustments = exportUi?.adjustments || {};
    const brightness = Math.max(0, Number(adjustments.brightness || 100)) / 100;
    const saturation = Math.max(0, Number(adjustments.saturation || 100)) / 100;
    const contrast = (Math.max(0, Number(adjustments.contrast || 100)) / 100)
      * (0.88 + (Math.max(0, Number(adjustments.clarity || 100)) / 100) * 0.12);
    return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
  };

  const applyExportAdjustmentsToCanvas = (sourceCanvas, exportUi, { width = sourceCanvas?.width, height = sourceCanvas?.height } = {}) => {
    if (!sourceCanvas) throw createExportError("invalid-params", "Missing export source canvas.");
    const targetWidth = Math.max(1, Math.round(Number(width) || 0));
    const targetHeight = Math.max(1, Math.round(Number(height) || 0));
    const adjustedCanvas = documentRef.createElement("canvas");
    adjustedCanvas.width = targetWidth;
    adjustedCanvas.height = targetHeight;
    const adjustedCtx = adjustedCanvas.getContext("2d");
    if (!adjustedCtx) throw createExportError("invalid-params", "Canvas export context unavailable.");
    adjustedCtx.imageSmoothingEnabled = true;
    adjustedCtx.imageSmoothingQuality = "high";
    adjustedCtx.filter = buildExportAdjustmentFilter(exportUi);
    adjustedCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    adjustedCtx.filter = "none";
    return adjustedCanvas;
  };

  const cloneCanvas = (sourceCanvas) => {
    if (!sourceCanvas) return null;
    const canvas = documentRef.createElement("canvas");
    canvas.width = sourceCanvas.width || 0;
    canvas.height = sourceCanvas.height || 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(sourceCanvas, 0, 0);
    return canvas;
  };

  const buildSvgAnnotationCanvas = async (options = {}) => {
    const width = state.colorCanvas?.width || state.lineCanvas?.width || 0;
    const height = state.colorCanvas?.height || state.lineCanvas?.height || 0;
    if (!(width > 0) || !(height > 0)) throw createExportError("invalid-params", "SVG annotation canvas unavailable.");
    const canvas = documentRef.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw createExportError("invalid-params", "SVG annotation context unavailable.");
    await drawSvgLayerToCanvas(canvas, ctx, options);
    return canvas;
  };

  const getBakePassNamesForLayer = (layerId, exportUi) => {
    const visibility = exportUi?.visibility || {};
    const textVisibility = exportUi?.textVisibility || {};
    if (layerId === EXPORT_BAKE_OUTPUT_ID.color) {
      return [
        ...(visibility.background === false ? [] : ["background"]),
        ...(visibility.political === false ? [] : ["physicalBase", "political"]),
        ...(visibility.context === false ? [] : ["contextBase", "contextScenario"]),
        ...(visibility.effects === false ? [] : ["effects", "dayNight"]),
      ];
    }
    if (layerId === EXPORT_BAKE_OUTPUT_ID.line) return visibility.effects === false ? [] : ["lineEffects", "borders"];
    if (layerId === EXPORT_BAKE_OUTPUT_ID.text) return textVisibility["render-labels"] === false ? [] : ["labels"];
    if (layerId === EXPORT_BAKE_OUTPUT_ID.composite) {
      return resolveExportPassSequence({ ...exportUi, visibility }, availableRenderPassNames)
        .filter((passName) => textVisibility["render-labels"] !== false || passName !== "labels");
    }
    return [];
  };

  const buildCompositeSourceCanvas = async (exportUi) => {
    const passNames = resolveExportPassSequence({ ...exportUi, visibility: exportUi.visibility }, availableRenderPassNames)
      .filter((passName) => exportUi.textVisibility?.["render-labels"] || passName !== "labels");
    const compositeCanvas = renderExportPassesToCanvas(passNames);
    if (!compositeCanvas) throw createExportError("invalid-params", "Composite export canvas unavailable.");
    const workingCanvas = cloneCanvas(compositeCanvas) || compositeCanvas;
    const workingCtx = workingCanvas.getContext("2d");
    if ((exportUi.textVisibility?.["svg-annotations"] || exportUi.textVisibility?.["special-zones"]) && !workingCtx) {
      throw createExportError("invalid-params", "Composite export context unavailable.");
    }
    if (exportUi.textVisibility?.["svg-annotations"]) {
      await drawSvgLayerToCanvas(workingCanvas, workingCtx, { onlyViewportSelector: SVG_ANNOTATION_VIEWPORT_SELECTOR });
    }
    if (exportUi.textVisibility?.["special-zones"]) {
      await drawSvgLayerToCanvas(workingCanvas, workingCtx, { onlyViewportSelector: ".special-zones-layer" });
    }
    return workingCanvas;
  };

  const buildSingleExportSourceCanvas = async (exportUi, sourceId) => {
    const normalizedSourceId = String(sourceId || "").trim();
    if (EXPORT_MAIN_LAYER_MODEL_BY_ID.has(normalizedSourceId)) {
      const canvas = renderExportPassesToCanvas(EXPORT_MAIN_LAYER_MODEL_BY_ID.get(normalizedSourceId)?.passNames || []);
      if (!canvas) throw createExportError("invalid-params", `Layer export canvas unavailable for ${normalizedSourceId}.`);
      return canvas;
    }
    if (normalizedSourceId === "render-labels") {
      const canvas = renderExportPassesToCanvas(["labels"]);
      if (!canvas) throw createExportError("invalid-params", "Render-pass label canvas unavailable.");
      return canvas;
    }
    if (normalizedSourceId === "svg-annotations") {
      return buildSvgAnnotationCanvas({ onlyViewportSelector: SVG_ANNOTATION_VIEWPORT_SELECTOR });
    }
    if (normalizedSourceId === "special-zones") {
      return buildSvgAnnotationCanvas({ onlyViewportSelector: ".special-zones-layer" });
    }
    throw createExportError("invalid-params", `Unsupported preview source: ${normalizedSourceId}`);
  };

  const bakeLayer = async (layerId, exportUiOverride = null) => {
    const exportUi = exportUiOverride && typeof exportUiOverride === "object" ? exportUiOverride : getExportUi();
    const normalizedLayerId = String(layerId || "").trim().toLowerCase();
    if (!EXPORT_BAKE_OUTPUT_IDS.includes(normalizedLayerId)) {
      throw new Error(`Unsupported bake layer: ${layerId}`);
    }
    const width = state.colorCanvas?.width || state.lineCanvas?.width || 0;
    const height = state.colorCanvas?.height || state.lineCanvas?.height || 0;
    const dependencies = getLayerDependencyRevision(normalizedLayerId, exportUi);
    const hash = computeBakeHash([normalizedLayerId, `${width}x${height}`, ...dependencies]);
    const cacheEntry = exportUi.bakeCache.get(normalizedLayerId);
    if (cacheEntry?.hash === hash && cacheEntry.canvas?.width === width && cacheEntry.canvas?.height === height) {
      writeBakeArtifactMeta(exportUi, normalizedLayerId, dependencies, cacheEntry.canvas, false);
      return cacheEntry.canvas;
    }
    const bakeCanvas = documentRef.createElement("canvas");
    bakeCanvas.width = width;
    bakeCanvas.height = height;
    const bakeCtx = bakeCanvas.getContext("2d");
    if (!bakeCtx) throw new Error("Canvas bake context unavailable.");
    const bakePassNames = getBakePassNamesForLayer(normalizedLayerId, exportUi);
    if (normalizedLayerId === EXPORT_BAKE_OUTPUT_ID.composite) {
      bakeCtx.drawImage(await buildCompositeSourceCanvas(exportUi), 0, 0);
    } else {
      if (bakePassNames.length) {
        const passCanvas = renderExportPassesToCanvas(bakePassNames);
        if (passCanvas) bakeCtx.drawImage(passCanvas, 0, 0);
      }
      if (normalizedLayerId === EXPORT_BAKE_OUTPUT_ID.text && exportUi.textVisibility?.["svg-annotations"]) {
        await drawSvgLayerToCanvas(bakeCanvas, bakeCtx, { onlyViewportSelector: SVG_ANNOTATION_VIEWPORT_SELECTOR });
      }
      if (normalizedLayerId === EXPORT_BAKE_OUTPUT_ID.text && exportUi.textVisibility?.["special-zones"]) {
        await drawSvgLayerToCanvas(bakeCanvas, bakeCtx, { onlyViewportSelector: ".special-zones-layer" });
      }
    }
    const version = cacheEntry ? Number(cacheEntry.version || 0) + 1 : 1;
    exportUi.bakeCache.set(normalizedLayerId, {
      hash,
      version,
      canvas: bakeCanvas,
      updatedAt: now(),
      dependencies,
      canvasSize: { width, height },
      dirtyFlag: true,
    });
    writeBakeArtifactMeta(exportUi, normalizedLayerId, dependencies, bakeCanvas, true);
    return bakeCanvas;
  };

  const getBakePackLayerIds = (exportUi) => {
    const visibleMainLayers = exportUi.layerOrder.filter((layerId) => exportUi.visibility?.[layerId] !== false);
    const next = [];
    if (visibleMainLayers.length) next.push(EXPORT_BAKE_OUTPUT_ID.color);
    if (visibleMainLayers.includes("effects")) next.push(EXPORT_BAKE_OUTPUT_ID.line);
    if (Object.values(exportUi.textVisibility || {}).some(Boolean)) next.push(EXPORT_BAKE_OUTPUT_ID.text);
    if (visibleMainLayers.length || Object.values(exportUi.textVisibility || {}).some(Boolean)) {
      next.push(EXPORT_BAKE_OUTPUT_ID.composite);
    }
    return next;
  };

  const getSelectedExportScale = () => {
    const rawValue = String(exportScale?.value || getExportUi().scale || "2").trim();
    return ["1", "1.5", "2", "4"].includes(rawValue) ? Number(rawValue) : 2;
  };

  const scaleCanvasForExport = (sourceCanvas, scaleMultiplier, exportUi) => {
    if (!sourceCanvas) throw createExportError("invalid-params", "Missing export source canvas.");
    const { width: baseWidth, height: baseHeight } = resolveExportBaseDimensions(state, devicePixelRatio);
    if (!(baseWidth > 0) || !(baseHeight > 0)) throw createExportError("invalid-params", "Missing preview canvas dimensions.");
    const targetWidth = Math.round(baseWidth * scaleMultiplier);
    const targetHeight = Math.round(baseHeight * scaleMultiplier);
    if (targetWidth > EXPORT_MAX_DIMENSION_PX || targetHeight > EXPORT_MAX_DIMENSION_PX) {
      throw createExportError("invalid-params", `Export size exceeds 8K cap (${targetWidth}x${targetHeight}).`);
    }
    if (targetWidth * targetHeight > EXPORT_MAX_PIXELS) {
      throw createExportError("invalid-params", `Export pixel budget exceeded (${targetWidth}x${targetHeight}).`);
    }
    return applyExportAdjustmentsToCanvas(sourceCanvas, exportUi, { width: targetWidth, height: targetHeight });
  };

  const buildCompositeExportCanvas = async (exportUi, scaleMultiplier) => (
    scaleCanvasForExport(await buildCompositeSourceCanvas(exportUi), scaleMultiplier, exportUi)
  );

  const buildPerLayerExportOutputs = async (exportUi, scaleMultiplier) => {
    const outputs = exportUi.layerOrder
      .filter((layerId) => exportUi.visibility?.[layerId] !== false)
      .filter((layerId) => layerId !== "labels" || exportUi.textVisibility?.["render-labels"] !== false)
      .map((id) => ({ id }));
    if (exportUi.textVisibility?.["svg-annotations"]) outputs.push({ id: "svg-annotations" });
    if (exportUi.textVisibility?.["special-zones"]) outputs.push({ id: "special-zones" });
    for (const output of outputs) {
      output.canvas = scaleCanvasForExport(await buildSingleExportSourceCanvas(exportUi, output.id), scaleMultiplier, exportUi);
    }
    if (!outputs.length) throw createExportError("invalid-params", "No visible export layers are available for per-layer export.");
    return outputs;
  };

  const buildExportArtifactScenarioContext = () => {
    const scenarioId = String(state.activeScenarioId || "").trim();
    return scenarioId ? {
      id: scenarioId,
      version: Number(state.activeScenarioManifest?.version || 1) || 1,
      baselineHash: String(state.scenarioBaselineHash || "").trim(),
    } : null;
  };
  const buildExportArtifactProjectContext = () => ({
    dirtyRevision: Number(state.dirtyRevision || 0) || 0,
    colorRevision: Number(state.colorRevision || 0) || 0,
    topologyRevision: Number(state.topologyRevision || 0) || 0,
  });
  const buildExportUiManifestSnapshot = (exportUi) => ({
    target: exportUi.target,
    format: exportUi.format,
    scale: exportUi.scale,
    layerOrder: [...(exportUi.layerOrder || [])],
    visibility: { ...(exportUi.visibility || {}) },
    textVisibility: { ...(exportUi.textVisibility || {}) },
    adjustments: { ...(exportUi.adjustments || {}) },
    bakeArtifacts: Array.isArray(exportUi.bakeArtifacts) ? exportUi.bakeArtifacts : [],
  });

  const buildPerLayerExportPackage = async (exportUi, scaleMultiplier) => buildExportArtifactPackage({
    artifactKind: "per-layer",
    fileStem: "map_layers",
    scenario: buildExportArtifactScenarioContext(),
    project: buildExportArtifactProjectContext(),
    exportUi: buildExportUiManifestSnapshot(exportUi),
    files: (await buildPerLayerExportOutputs(exportUi, scaleMultiplier)).map((output) => ({
      path: `layers/map_layer_${output.id}.png`,
      role: "layer",
      mime: "image/png",
      canvas: output.canvas,
    })),
  });

  const buildBakePackOutputs = async (exportUi, scaleMultiplier) => {
    const outputs = [];
    for (const layerId of getBakePackLayerIds(exportUi)) {
      outputs.push({ id: layerId, canvas: scaleCanvasForExport(await bakeLayer(layerId, exportUi), scaleMultiplier, exportUi) });
    }
    const metadata = {
      version: 1,
      generatedAt: new Date(now()).toISOString(),
      exportUi: {
        target: exportUi.target,
        format: exportUi.format,
        scale: exportUi.scale,
        layerOrder: [...exportUi.layerOrder],
        visibility: { ...(exportUi.visibility || {}) },
        textVisibility: { ...(exportUi.textVisibility || {}) },
        adjustments: { ...(exportUi.adjustments || {}) },
      },
      bakeArtifacts: Array.isArray(exportUi.bakeArtifacts) ? exportUi.bakeArtifacts : [],
      files: outputs.map((output) => `map_bake_${output.id}.png`),
    };
    outputs.push({
      id: "metadata",
      blob: new blobCtor([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
      extension: "json",
      fileStem: "map_bake_manifest",
    });
    return outputs;
  };

  const buildBakePackPackage = async (exportUi, scaleMultiplier) => buildExportArtifactPackage({
    artifactKind: "bake-pack",
    fileStem: "map_bake_pack",
    scenario: buildExportArtifactScenarioContext(),
    project: buildExportArtifactProjectContext(),
    exportUi: buildExportUiManifestSnapshot(exportUi),
    files: (await buildBakePackOutputs(exportUi, scaleMultiplier)).map((output) => output.canvas ? {
      path: `layers/map_bake_${output.id}.png`,
      role: "bake-layer",
      mime: "image/png",
      canvas: output.canvas,
    } : {
      path: `${output.fileStem || output.id}.${output.extension || "json"}`,
      role: "legacy-metadata",
      mime: "application/json",
      blob: output.blob,
    }),
  });

  const triggerCanvasDownload = (canvas, extension, fileStem) => {
    const dataUrl = canvas.toDataURL(extension === "jpg" ? "image/jpeg" : "image/png", 0.92);
    const link = documentRef.createElement("a");
    link.href = dataUrl;
    link.download = `${fileStem}.${extension}`;
    documentRef.body.appendChild(link);
    link.click();
    link.remove();
  };
  const triggerBlobDownload = (blob, extension, fileStem) => {
    const objectUrl = urlApi.createObjectURL(blob);
    let link = null;
    try {
      link = documentRef.createElement("a");
      link.href = objectUrl;
      link.download = `${fileStem}.${extension}`;
      documentRef.body.appendChild(link);
      link.click();
    } finally {
      link?.remove();
      scheduleRevoke(() => urlApi.revokeObjectURL(objectUrl));
    }
  };

  return Object.freeze({
    applyExportAdjustmentsToCanvas,
    bakeLayer,
    buildBakePackPackage,
    buildCompositeExportCanvas,
    buildCompositeSourceCanvas,
    buildPerLayerExportPackage,
    buildSingleExportSourceCanvas,
    getBakePackLayerIds,
    getSelectedExportScale,
    triggerBlobDownload,
    triggerCanvasDownload,
  });
}

export {
  EXPORT_MAX_CONCURRENT_JOBS,
  EXPORT_MAX_DIMENSION_PX,
  EXPORT_MAX_PIXELS,
  SVG_ANNOTATION_VIEWPORT_SELECTOR,
  computeBakeHash,
  createExportArtifactPipeline,
  resolveExportBaseDimensions,
};
