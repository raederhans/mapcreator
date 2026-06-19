import { HGO_RUNTIME_PREVIEW_STATUS } from "../hgo_runtime_preview.js";
import {
  HGO_DEFAULT_TARGET_PROJECTION,
  HGO_SOURCE_PROJECTION,
} from "../hgo_projection_model.js";
import {
  createHgoRuntimePreviewFrameCommitter,
} from "./hgo_runtime_preview_frame_commit.js";

const HGO_RUNTIME_PREVIEW_PROJECTION_NAME = HGO_DEFAULT_TARGET_PROJECTION;
const HGO_RUNTIME_PREVIEW_SOURCE_PROJECTION = HGO_SOURCE_PROJECTION;
const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES = Object.freeze([
  "hgoPreview",
]);
const HGO_RUNTIME_PREVIEW_TRANSFORMED_FRAME_PASS_NAMES = Object.freeze([
  "hgoPreview",
]);

function filterHgoPreviewPassNames(passNames = []) {
  return (Array.isArray(passNames) ? passNames : [])
    .filter((passName) => passName !== "hgoPreview");
}

function createHgoRuntimePreviewRenderOwner({
  runtimeState,
  renderPassNames,
  transformedFramePassNames,
  getProjection,
  getMapSvg,
  getTargetCanvas,
  callRuntimeHook,
  createHitResult,
  resetCanvasContext,
  recordRenderPerfMetric,
  nowMs,
  getD3 = () => globalThis.d3,
} = {}) {
  if (!runtimeState || typeof runtimeState !== "object") {
    throw new TypeError("HGO runtime preview render owner requires runtimeState.");
  }
  const vectorRenderPassNames = Object.freeze(filterHgoPreviewPassNames(renderPassNames));
  const vectorTransformedFramePassNames = Object.freeze(filterHgoPreviewPassNames(transformedFramePassNames));

  function isReady() {
    const preview = runtimeState.hgoRuntimePreview;
    return !!preview?.enabled && preview.status === HGO_RUNTIME_PREVIEW_STATUS.READY;
  }

  function getVisibilitySignature() {
    return isReady() ? "hgo:on" : "hgo:off";
  }

  function getActiveRenderPassNames() {
    return isReady() ? HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES : vectorRenderPassNames;
  }

  function getActiveTransformedFramePassNames() {
    return isReady() ? HGO_RUNTIME_PREVIEW_TRANSFORMED_FRAME_PASS_NAMES : vectorTransformedFramePassNames;
  }

  function getProjectionOptions(overrides = {}) {
    return {
      projection: getProjection(),
      projectionName: HGO_RUNTIME_PREVIEW_PROJECTION_NAME,
      sourceProjection: HGO_RUNTIME_PREVIEW_SOURCE_PROJECTION,
      projectionPixelRatio: runtimeState.dpr,
      projectionTransform: runtimeState.zoomTransform || null,
      ...overrides,
    };
  }

  function renderIfReady(reason = "render", options = {}) {
    if (!isReady()) return null;
    return callRuntimeHook(runtimeState, "renderHgoRuntimePreviewFn", {
      reason,
      ...getProjectionOptions(options),
    }) || null;
  }

  function getCanvasPointFromEvent(event) {
    const mapSvg = getMapSvg();
    const d3 = getD3();
    if (!mapSvg || !d3?.pointer) return null;
    const [sx, sy] = d3.pointer(event, mapSvg);
    if (![sx, sy].every(Number.isFinite)) return null;
    const dpr = Number.isFinite(Number(runtimeState.dpr)) && Number(runtimeState.dpr) > 0
      ? Number(runtimeState.dpr)
      : 1;
    return {
      x: Math.round(Number(sx) * dpr),
      y: Math.round(Number(sy) * dpr),
      screenX: Number(sx),
      screenY: Number(sy),
      dpr,
    };
  }

  function inspectFromEvent(event, { eventType = "unknown" } = {}) {
    if (!isReady()) {
      return { active: false, point: null, inspection: null, hit: createHitResult() };
    }
    const point = getCanvasPointFromEvent(event);
    const inspection = point
      ? callRuntimeHook(runtimeState, "inspectHgoRuntimePreviewPointFn", point.x, point.y, {
        eventType,
        point,
        ...getProjectionOptions(),
      }) || null
      : null;
    const resolved = inspection?.resolved || null;
    if (!resolved) {
      return { active: true, point, inspection, hit: createHitResult() };
    }
    const ownerTag = String(resolved.ownerTag || resolved.controllerTag || "").trim().toUpperCase();
    return {
      active: true,
      point,
      inspection,
      hit: createHitResult({
        id: `hgo:province:${resolved.provinceId}`,
        targetType: "hgo",
        countryCode: ownerTag,
        hitSource: "hgo-runtime-preview",
        strict: true,
        distancePx: 0,
        hgoRuntime: Object.freeze({
          provinceId: resolved.provinceId,
          stateId: resolved.stateId,
          ownerTag: resolved.ownerTag,
          controllerTag: resolved.controllerTag,
          pixelIndex: inspection.pixelIndex,
          x: inspection.x,
          y: inspection.y,
          sourceRgb: inspection.sourceRgb,
        }),
      }),
    };
  }

  const frameCommitter = createHgoRuntimePreviewFrameCommitter({
    isReady,
    getTargetCanvas,
    resetCanvasContext,
    recordRenderPerfMetric,
    nowMs,
    getStatsContext: () => ({
      projectionPixelRatio: Number(runtimeState.dpr || 1),
      active: isReady(),
    }),
    renderFrame: (targetCanvas) => renderIfReady("hgo-preview-pass", {
      targetCanvas,
      targetWidth: targetCanvas.width,
      targetHeight: targetCanvas.height,
      commitToTargetCanvas: false,
    }),
  });

  function drawPreviewPass() {
    return frameCommitter.drawPreviewPass();
  }

  function normalizeHitPayload(payload = null) {
    if (!payload || typeof payload !== "object") return null;
    return Object.freeze({
      provinceId: payload.provinceId,
      stateId: payload.stateId,
      ownerTag: payload.ownerTag,
      controllerTag: payload.controllerTag,
      pixelIndex: payload.pixelIndex,
      x: payload.x,
      y: payload.y,
      sourceRgb: payload.sourceRgb,
    });
  }

  function getProjectedBounds() {
    const projection = getProjection();
    if (typeof projection !== "function" || runtimeState.width <= 0 || runtimeState.height <= 0) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let lat = -90; lat <= 90; lat += 5) {
      for (let lon = -180; lon <= 180; lon += 5) {
        const point = projection([lon, lat]);
        if (!Array.isArray(point) || point.length < 2) continue;
        const x = Number(point[0]);
        const y = Number(point[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
      return null;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  return Object.freeze({
    drawPreviewPass,
    getActiveRenderPassNames,
    getActiveTransformedFramePassNames,
    getProjectedBounds,
    getProjectionOptions,
    getVisibilitySignature,
    inspectFromEvent,
    isReady,
    normalizeHitPayload,
    renderIfReady,
  });
}

export {
  HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES,
  HGO_RUNTIME_PREVIEW_TRANSFORMED_FRAME_PASS_NAMES,
  createHgoRuntimePreviewRenderOwner,
};
