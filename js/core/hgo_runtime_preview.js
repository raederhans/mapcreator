import { createHgoRasterRenderer } from "./hgo_raster_renderer.js";

const HGO_RUNTIME_PREVIEW_STORAGE_KEY = "mapcreator:hgo-runtime-preview:enabled";

const HGO_RUNTIME_PREVIEW_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  UNAVAILABLE: "unavailable",
  ERROR: "error",
});

const HGO_RUNTIME_PREVIEW_LAYER_OWNER = "hgo-runtime-preview";
const HGO_RUNTIME_PREVIEW_DEFAULT_RENDER_REASON = "manual";
const HGO_RUNTIME_PREVIEW_MAX_RENDER_REASON_LENGTH = 64;

function createDefaultHgoRuntimePreviewState() {
  return {
    enabled: false,
    status: HGO_RUNTIME_PREVIEW_STATUS.IDLE,
    errorMessage: "",
    summary: null,
    renderSummary: null,
    inspectResult: null,
  };
}

function normalizePreviewState(value) {
  const state = value && typeof value === "object" ? value : {};
  const status = Object.values(HGO_RUNTIME_PREVIEW_STATUS).includes(state.status)
    ? state.status
    : HGO_RUNTIME_PREVIEW_STATUS.IDLE;
  return {
    enabled: !!state.enabled,
    status,
    errorMessage: String(state.errorMessage || ""),
    summary: state.summary || null,
    renderSummary: state.renderSummary || null,
    inspectResult: state.inspectResult || null,
  };
}

function ensureHgoRuntimePreviewState(runtimeState) {
  if (!runtimeState || typeof runtimeState !== "object") {
    throw new TypeError("HGO runtime preview requires a runtime state object.");
  }
  const normalized = normalizePreviewState(runtimeState.hgoRuntimePreview);
  if (runtimeState.hgoRuntimePreview && typeof runtimeState.hgoRuntimePreview === "object") {
    Object.assign(runtimeState.hgoRuntimePreview, normalized);
  } else {
    runtimeState.hgoRuntimePreview = normalized;
  }
  return runtimeState.hgoRuntimePreview;
}

function readPersistedPreviewEnabled(storage) {
  try {
    const stored = storage?.getItem?.(HGO_RUNTIME_PREVIEW_STORAGE_KEY);
    return stored === "true" ? true : stored === "false" ? false : null;
  } catch {
    return null;
  }
}

function persistPreviewEnabled(storage, enabled) {
  try {
    storage?.setItem?.(HGO_RUNTIME_PREVIEW_STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}

function normalizeRenderReason(value) {
  if (typeof value !== "string") return HGO_RUNTIME_PREVIEW_DEFAULT_RENDER_REASON;
  const normalized = value.trim();
  if (!normalized) return HGO_RUNTIME_PREVIEW_DEFAULT_RENDER_REASON;
  return normalized.length > HGO_RUNTIME_PREVIEW_MAX_RENDER_REASON_LENGTH
    ? normalized.slice(0, HGO_RUNTIME_PREVIEW_MAX_RENDER_REASON_LENGTH)
    : normalized;
}

function buildRenderSummary(rendered, { reason = HGO_RUNTIME_PREVIEW_DEFAULT_RENDER_REASON, renderCount = 0 } = {}) {
  if (!rendered) return null;
  const summary = {
    layerOwner: HGO_RUNTIME_PREVIEW_LAYER_OWNER,
    reason: normalizeRenderReason(reason),
    renderCount: Math.max(0, Math.floor(Number(renderCount) || 0)),
    width: rendered.width,
    height: rendered.height,
    canvasWidth: rendered.canvasWidth || rendered.width,
    canvasHeight: rendered.canvasHeight || rendered.height,
    viewport: rendered.viewport || null,
    scaledToCanvas: rendered.scaledToCanvas === true,
    ownershipMode: rendered.ownershipMode,
    resolvedPixelCount: rendered.resolvedPixelCount,
    unresolvedPixelCount: rendered.unresolvedPixelCount,
  };
  if (rendered.projectionName) {
    summary.projectionName = rendered.projectionName;
  }
  if (rendered.sourceProjection) {
    summary.sourceProjection = rendered.sourceProjection;
  }
  if (Number.isFinite(Number(rendered.projectionPixelRatio))) {
    summary.projectionPixelRatio = Number(rendered.projectionPixelRatio);
  }
  if (Number.isFinite(Number(rendered.projectedPixelCount))) {
    summary.projectedPixelCount = Number(rendered.projectedPixelCount);
  }
  if (Number.isFinite(Number(rendered.unprojectedPixelCount))) {
    summary.unprojectedPixelCount = Number(rendered.unprojectedPixelCount);
  }
  return Object.freeze(summary);
}

function resolvePreviewRenderOptions(baseOptions, callOptions) {
  const resolvedBaseOptions = typeof baseOptions === "function"
    ? baseOptions(callOptions)
    : baseOptions;
  const normalizedBaseOptions = resolvedBaseOptions && typeof resolvedBaseOptions === "object"
    ? resolvedBaseOptions
    : {};
  const normalizedCallOptions = callOptions && typeof callOptions === "object" ? callOptions : {};
  return {
    ...normalizedBaseOptions,
    ...normalizedCallOptions,
  };
}

function setPreviewUnavailable(previewState, message) {
  previewState.enabled = false;
  previewState.status = HGO_RUNTIME_PREVIEW_STATUS.UNAVAILABLE;
  previewState.errorMessage = message;
  previewState.summary = null;
  previewState.renderSummary = null;
  previewState.inspectResult = null;
  return previewState;
}

function createHgoRuntimePreviewController(runtimeState, {
  canvas = null,
  loadSeed = null,
  loadRaster = null,
  storage = globalThis.localStorage,
  renderOptions = {},
  restorePreviewTarget = null,
} = {}) {
  const previewState = ensureHgoRuntimePreviewState(runtimeState);
  const persisted = readPersistedPreviewEnabled(storage);
  if (persisted !== null) {
    previewState.enabled = persisted;
  }
  if (persisted === true && (typeof loadSeed !== "function" || typeof loadRaster !== "function")) {
    persistPreviewEnabled(storage, false);
    setPreviewUnavailable(previewState, "HGO runtime preview seed and raster loaders are not configured.");
  }

  let renderer = null;
  let loadingPromise = null;
  let loadGeneration = 0;
  let renderCount = previewState.renderSummary?.renderCount || 0;

  const disposeRenderer = () => {
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };
  const restoreRenderedTarget = () => {
    if (typeof restorePreviewTarget === "function") {
      restorePreviewTarget();
    }
  };

  const renderPreview = (options = {}) => {
    if (!renderer) return null;
    const reason = options && typeof options === "object"
      ? normalizeRenderReason(options.reason)
      : HGO_RUNTIME_PREVIEW_DEFAULT_RENDER_REASON;
    const effectiveRenderOptions = resolvePreviewRenderOptions(renderOptions, options);
    // 有投影和 canvas 时直接写主画布，保证预览像素跟 app 渲染生命周期同步。
    const rendered = canvas && effectiveRenderOptions.projection
      ? renderer.renderProjectedToCanvas(canvas, effectiveRenderOptions)
      : effectiveRenderOptions.projection
        ? renderer.renderProjectedToBuffer(effectiveRenderOptions)
        : canvas
        ? renderer.renderToCanvas(canvas, effectiveRenderOptions)
        : renderer.renderToBuffer(effectiveRenderOptions);
    renderCount += 1;
    previewState.renderSummary = buildRenderSummary(rendered, { reason, renderCount });
    return rendered;
  };

  const loadPreview = async (generation) => {
    if (renderer) return renderer;
    if (typeof loadSeed !== "function" || typeof loadRaster !== "function") {
      return null;
    }
    const [seed, raster] = await Promise.all([loadSeed(), loadRaster()]);
    // generation 是异步加载代次；用户关闭或重开后，旧 seed/raster 结果不能回写 READY。
    if (generation !== loadGeneration || !previewState.enabled) {
      return null;
    }
    renderer = createHgoRasterRenderer({ seed, ...raster });
    previewState.summary = renderer.getSummary();
    renderPreview({ reason: "load" });
    return renderer;
  };

  const setEnabled = async (nextEnabled) => {
    const enabled = !!nextEnabled;
    if (!enabled) {
      const shouldRestoreTarget = !!renderer || !!previewState.renderSummary;
      loadGeneration += 1;
      loadingPromise = null;
      disposeRenderer();
      previewState.enabled = false;
      previewState.status = HGO_RUNTIME_PREVIEW_STATUS.IDLE;
      previewState.errorMessage = "";
      previewState.summary = null;
      previewState.renderSummary = null;
      previewState.inspectResult = null;
      renderCount = 0;
      persistPreviewEnabled(storage, false);
      if (shouldRestoreTarget) {
        restoreRenderedTarget();
      }
      return previewState;
    }

    if (previewState.enabled && renderer) {
      previewState.status = HGO_RUNTIME_PREVIEW_STATUS.READY;
      renderPreview({ reason: "enable-ready" });
      return previewState;
    }

    if (typeof loadSeed !== "function" || typeof loadRaster !== "function") {
      persistPreviewEnabled(storage, false);
      return setPreviewUnavailable(previewState, "HGO runtime preview seed and raster loaders are not configured.");
    }

    if (!loadingPromise) {
      const generation = loadGeneration + 1;
      loadGeneration = generation;
      previewState.enabled = true;
      previewState.status = HGO_RUNTIME_PREVIEW_STATUS.LOADING;
      previewState.errorMessage = "";
      persistPreviewEnabled(storage, true);
      loadingPromise = loadPreview(generation)
        .then((loadedRenderer) => {
          if (generation !== loadGeneration || !previewState.enabled || !loadedRenderer) {
            return previewState;
          }
          previewState.enabled = true;
          previewState.status = HGO_RUNTIME_PREVIEW_STATUS.READY;
          previewState.errorMessage = "";
          return previewState;
        })
        .catch((error) => {
          if (generation !== loadGeneration) {
            return previewState;
          }
          const shouldRestoreTarget = !!renderer || !!previewState.renderSummary;
          disposeRenderer();
          previewState.enabled = false;
          previewState.status = HGO_RUNTIME_PREVIEW_STATUS.ERROR;
          previewState.errorMessage = error?.message || String(error || "HGO runtime preview failed.");
          previewState.summary = null;
          previewState.renderSummary = null;
          previewState.inspectResult = null;
          renderCount = 0;
          persistPreviewEnabled(storage, false);
          if (shouldRestoreTarget) {
            restoreRenderedTarget();
          }
          return previewState;
        })
        .finally(() => {
          if (generation === loadGeneration) {
            loadingPromise = null;
          }
        });
    }

    return loadingPromise;
  };

  const toggle = () => setEnabled(!previewState.enabled);

  const inspectPoint = (x, y, options = {}) => {
    if (!renderer) return null;
    const effectiveRenderOptions = resolvePreviewRenderOptions(renderOptions, options);
    const hit = canvas && effectiveRenderOptions.projection
      ? renderer.inspectProjectedCanvasPoint(x, y, canvas, effectiveRenderOptions)
      : canvas
        ? renderer.inspectCanvasPoint(x, y, canvas)
        : renderer.inspectPoint(x, y);
    previewState.inspectResult = hit;
    return hit;
  };

  const dispose = () => {
    const shouldRestoreTarget = !!renderer || !!previewState.renderSummary;
    loadGeneration += 1;
    disposeRenderer();
    loadingPromise = null;
    previewState.enabled = false;
    previewState.status = HGO_RUNTIME_PREVIEW_STATUS.IDLE;
    previewState.errorMessage = "";
    previewState.summary = null;
    previewState.renderSummary = null;
    previewState.inspectResult = null;
    renderCount = 0;
    persistPreviewEnabled(storage, false);
    if (shouldRestoreTarget) {
      restoreRenderedTarget();
    }
  };

  return Object.freeze({
    dispose,
    getState: () => previewState,
    inspectPoint,
    renderPreview,
    setEnabled,
    toggle,
  });
}

export {
  HGO_RUNTIME_PREVIEW_STATUS,
  HGO_RUNTIME_PREVIEW_STORAGE_KEY,
  createDefaultHgoRuntimePreviewState,
  createHgoRuntimePreviewController,
  ensureHgoRuntimePreviewState,
  readPersistedPreviewEnabled,
};
