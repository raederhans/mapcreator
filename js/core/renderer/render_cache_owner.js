/**
 * Owns render pass cache / canvas cache / reference transform cache.
 * map_renderer.js 保留更高层的 invalidation、render pass 编排和 visible frame 事务，
 * 这里专注于“缓存容器长什么样、何时初始化、怎样校验可复用性”。
 */
export function createRenderCacheOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
} = {}) {
  const {
    interactionCompositePassNames = [],
    renderPassNames = [],
    renderPassOverscanRatioPerSide = 0,
    transformedFramePassNames = new Set(),
  } = constants;
  const {
    getContext = () => null,
  } = getters;
  const {
    cloneZoomTransform = (transform) => transform,
    ensureRenderPassCacheState = () => ({}),
    getTransformSignature = () => "",
    getVisibleFrameIdentity = () => ({}),
    invalidateInteractionComposite = () => {},
  } = helpers;

  function getRenderPassCacheState() {
    return ensureRenderPassCacheState(state, {
      cloneZoomTransform,
      renderPassNames,
    });
  }

  function getRenderPassOverscanRatio(passName) {
    return transformedFramePassNames.has(passName)
      ? renderPassOverscanRatioPerSide
      : 0;
  }

  function buildRenderPassLayout(passName) {
    const dpr = Math.max(state.dpr || 1, 1);
    const logicalWidth = Math.max(1, Number(state.width || 1));
    const logicalHeight = Math.max(1, Number(state.height || 1));
    const overscanRatio = getRenderPassOverscanRatio(passName);
    const offsetX = overscanRatio > 0 ? Math.ceil(logicalWidth * overscanRatio) : 0;
    const offsetY = overscanRatio > 0 ? Math.ceil(logicalHeight * overscanRatio) : 0;
    const paddedWidth = logicalWidth + offsetX * 2;
    const paddedHeight = logicalHeight + offsetY * 2;
    return {
      offsetX,
      offsetY,
      logicalWidth,
      logicalHeight,
      paddedWidth,
      paddedHeight,
      pixelWidth: Math.max(1, Math.floor(paddedWidth * dpr)),
      pixelHeight: Math.max(1, Math.floor(paddedHeight * dpr)),
      dpr,
    };
  }

  function getRenderPassLayout(passName) {
    const cache = getRenderPassCacheState();
    const layout = buildRenderPassLayout(passName);
    cache.layouts[passName] = layout;
    return layout;
  }

  function resizeRenderPassCanvases() {
    const cache = getRenderPassCacheState();
    renderPassNames.forEach((passName) => {
      const layout = getRenderPassLayout(passName);
      const canvas = cache.canvases?.[passName];
      if (!canvas) return;
      if (canvas.width !== layout.pixelWidth) canvas.width = layout.pixelWidth;
      if (canvas.height !== layout.pixelHeight) canvas.height = layout.pixelHeight;
    });
  }

  function ensureRenderPassCanvas(passName) {
    const cache = getRenderPassCacheState();
    if (!cache.canvases[passName]) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cache.canvases[passName] = canvas;
    }
    resizeRenderPassCanvases();
    return cache.canvases[passName];
  }

  function resizeCanvasToMainTarget(targetCanvas) {
    const context = getContext();
    const width = Math.max(1, Number(context?.canvas?.width || 1));
    const height = Math.max(1, Number(context?.canvas?.height || 1));
    if (targetCanvas.width !== width) targetCanvas.width = width;
    if (targetCanvas.height !== height) targetCanvas.height = height;
    return { width, height };
  }

  function ensureLastGoodFrameCanvas() {
    const cache = getRenderPassCacheState();
    if (!cache.lastGoodFrame.canvas) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cache.lastGoodFrame.canvas = canvas;
    }
    resizeCanvasToMainTarget(cache.lastGoodFrame.canvas);
    return cache.lastGoodFrame.canvas;
  }

  function ensureInteractionCompositeCanvas() {
    const cache = getRenderPassCacheState();
    if (!cache.interactionComposite.canvas) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cache.interactionComposite.canvas = canvas;
    }
    const { width, height } = resizeCanvasToMainTarget(cache.interactionComposite.canvas);
    cache.interactionComposite.layout = {
      pixelWidth: width,
      pixelHeight: height,
      dpr: Math.max(1, Number(state.dpr || 1)),
    };
    return cache.interactionComposite.canvas;
  }

  function ensureCompositeBufferCanvas() {
    const cache = getRenderPassCacheState();
    if (!cache.compositeBuffer?.canvas) {
      cache.compositeBuffer = cache.compositeBuffer && typeof cache.compositeBuffer === "object"
        ? cache.compositeBuffer
        : {};
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cache.compositeBuffer.canvas = canvas;
    }
    resizeCanvasToMainTarget(cache.compositeBuffer.canvas);
    return cache.compositeBuffer.canvas;
  }

  function getPassReferenceTransform(passName) {
    const cache = getRenderPassCacheState();
    if (cache.referenceTransforms?.[passName]) {
      return cloneZoomTransform(cache.referenceTransforms[passName]);
    }
    return cache.referenceTransform ? cloneZoomTransform(cache.referenceTransform) : null;
  }

  function setPassReferenceTransform(passName, transform) {
    const cache = getRenderPassCacheState();
    cache.referenceTransforms[passName] = cloneZoomTransform(transform);
    cache.referenceTransform = cloneZoomTransform(transform);
  }

  function getPassFullReferenceTransform(passName) {
    const cache = getRenderPassCacheState();
    const transform = cache.fullReferenceTransforms?.[passName] || null;
    return transform ? cloneZoomTransform(transform) : null;
  }

  function setPassFullReferenceTransform(passName, transform) {
    const cache = getRenderPassCacheState();
    cache.fullReferenceTransforms[passName] = cloneZoomTransform(transform);
  }

  function hasPassFullReferenceTransform(passName) {
    const cache = getRenderPassCacheState();
    return !!cache.fullReferenceTransforms?.[passName];
  }

  function clearPassFullReferenceTransforms(passNames = null) {
    const cache = getRenderPassCacheState();
    if (!passNames) {
      cache.fullReferenceTransforms = {};
      return;
    }
    const rawTargetPassNames = Array.isArray(passNames) ? passNames : [passNames];
    rawTargetPassNames.forEach((passName) => {
      if (!passName) return;
      delete cache.fullReferenceTransforms[passName];
    });
  }

  function getInteractionCompositeSignature(cache = getRenderPassCacheState()) {
    return interactionCompositePassNames.map((passName) => [
      passName,
      String(cache.signatures?.[passName] || ""),
      getTransformSignature(getPassReferenceTransform(passName)),
    ].join("@")).join("|");
  }

  function getInteractionCompositeRejectReason(composite, currentTransform, cache = getRenderPassCacheState()) {
    if (!composite?.valid) return "invalid";
    if (!composite.canvas || !composite.referenceTransform) return "missing-canvas-or-transform";
    if (composite.signature !== getInteractionCompositeSignature(cache)) return "signature-mismatch";
    const identity = getVisibleFrameIdentity(currentTransform);
    if (String(composite.scenarioId || "") !== identity.scenarioId) return "scenario-mismatch";
    if (Number(composite.selectionVersion || 0) !== identity.selectionVersion) return "selection-version-mismatch";
    if (String(composite.contextFlagSignature || "") !== identity.contextFlagSignature) return "context-flag-mismatch";
    if (Number(composite.topologyRevision || 0) !== identity.topologyRevision) return "topology-revision-mismatch";
    if (Math.abs(Number(composite.dpr || 1) - identity.dpr) > 0.01) return "dpr-mismatch";
    if (Number(composite.pixelWidth || 0) !== identity.pixelWidth || Number(composite.pixelHeight || 0) !== identity.pixelHeight) {
      return "canvas-size-mismatch";
    }
    if (Number(composite.colorRevision || 0) !== identity.colorRevision) return "color-revision-mismatch";
    return "";
  }

  function canDrawInteractionComposite(currentTransform, cache = getRenderPassCacheState()) {
    const composite = cache.interactionComposite || {};
    const rejectReason = getInteractionCompositeRejectReason(composite, currentTransform, cache);
    if (!rejectReason) return true;
    if (composite && typeof composite === "object") {
      composite.rejectedReason = rejectReason;
    }
    if (rejectReason !== "invalid") {
      invalidateInteractionComposite(rejectReason);
    }
    return false;
  }

  return {
    canDrawInteractionComposite,
    clearPassFullReferenceTransforms,
    ensureCompositeBufferCanvas,
    ensureInteractionCompositeCanvas,
    ensureLastGoodFrameCanvas,
    ensureRenderPassCanvas,
    getInteractionCompositeSignature,
    getPassFullReferenceTransform,
    getPassReferenceTransform,
    getRenderPassCacheState,
    getRenderPassLayout,
    hasPassFullReferenceTransform,
    resizeRenderPassCanvases,
    setPassFullReferenceTransform,
    setPassReferenceTransform,
  };
}
