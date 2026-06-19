const HGO_RUNTIME_PREVIEW_MIN_RESOLVED_PIXEL_RATIO = 0.85;

function getHgoRuntimePreviewFrameStats(rendered = null, {
  active = false,
  projectionPixelRatio = 1,
} = {}) {
  const projectedPixelCount = Number(rendered?.projectedPixelCount || 0);
  const resolvedPixelCount = Number(rendered?.resolvedPixelCount || 0);
  return {
    projectedPixelCount,
    unprojectedPixelCount: Number(rendered?.unprojectedPixelCount || 0),
    resolvedPixelCount,
    unresolvedPixelCount: Number(rendered?.unresolvedPixelCount || 0),
    resolvedPixelRatio: projectedPixelCount > 0 ? resolvedPixelCount / projectedPixelCount : 0,
    projectionPixelRatio,
    active,
  };
}

function getHgoRuntimePreviewFrameRejectionReason(rendered = null, stats = {}) {
  if (!rendered) return "missing-rendered-frame";
  const width = Number(rendered.width || 0);
  const height = Number(rendered.height || 0);
  const dataLength = Number(rendered.data?.length || 0);
  if (width <= 0 || height <= 0 || dataLength < width * height * 4) {
    return "missing-rendered-data";
  }
  if (Number(stats.projectedPixelCount || 0) <= 0) return "no-projected-pixels";
  if (Number(stats.resolvedPixelRatio || 0) < HGO_RUNTIME_PREVIEW_MIN_RESOLVED_PIXEL_RATIO) {
    return "low-resolved-pixel-ratio";
  }
  return "";
}

function createHgoRuntimePreviewFrameCommitter({
  isReady,
  renderFrame,
  getTargetCanvas,
  resetCanvasContext,
  recordRenderPerfMetric,
  nowMs,
  getStatsContext,
} = {}) {
  let committedFrameCount = 0;

  function recordPreviewPassMetric(name, durationMs, details = {}) {
    recordRenderPerfMetric(name, durationMs, {
      minResolvedPixelRatio: HGO_RUNTIME_PREVIEW_MIN_RESOLVED_PIXEL_RATIO,
      ...details,
    });
  }

  function getFrameStats(rendered = null) {
    return getHgoRuntimePreviewFrameStats(rendered, getStatsContext?.() || {});
  }

  function getFrameRejectionReason(rendered = null, stats = getFrameStats(rendered)) {
    const reason = getHgoRuntimePreviewFrameRejectionReason(rendered, stats);
    if (reason === "low-resolved-pixel-ratio" && committedFrameCount === 0) {
      return "";
    }
    return reason;
  }

  function rejectFrame(startedAt, reason, stats = getFrameStats(null)) {
    const result = { committed: false, reason };
    recordPreviewPassMetric("drawHgoPreviewPass", nowMs() - startedAt, {
      ...result,
      skipped: true,
      ...stats,
    });
    return result;
  }

  function drawPreviewPass() {
    const startedAt = nowMs();
    if (!isReady()) return rejectFrame(startedAt, "hgo-runtime-preview-not-ready");

    const targetCanvas = getTargetCanvas();
    const targetContext = targetCanvas?.getContext?.("2d") || null;
    if (!targetCanvas || !targetContext) return rejectFrame(startedAt, "missing-target-canvas");
    if (typeof targetContext.createImageData !== "function" || typeof targetContext.putImageData !== "function") {
      return rejectFrame(startedAt, "missing-image-data-context");
    }

    const rendered = renderFrame(targetCanvas);
    const stats = getFrameStats(rendered);
    const rejectionReason = getFrameRejectionReason(rendered, stats);
    if (rejectionReason) {
      const result = rejectFrame(startedAt, rejectionReason, stats);
      recordPreviewPassMetric("hgoPreviewFrameRejected", 0, { ...result, ...stats });
      return result;
    }

    const imageData = targetContext.createImageData(rendered.width, rendered.height);
    imageData.data.set(rendered.data);
    resetCanvasContext(targetContext, targetCanvas.width, targetCanvas.height);
    targetContext.putImageData(imageData, 0, 0);

    const result = { committed: true, reason: "committed" };
    committedFrameCount += 1;
    recordPreviewPassMetric("drawHgoPreviewPass", nowMs() - startedAt, {
      ...result,
      skipped: false,
      ...stats,
    });
    recordPreviewPassMetric("hgoPreviewFrameCommitted", 0, { ...result, ...stats });
    return result;
  }

  return Object.freeze({ drawPreviewPass });
}

export {
  HGO_RUNTIME_PREVIEW_MIN_RESOLVED_PIXEL_RATIO,
  createHgoRuntimePreviewFrameCommitter,
  getHgoRuntimePreviewFrameRejectionReason,
  getHgoRuntimePreviewFrameStats,
};
