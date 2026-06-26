const DEFAULT_MIN_ZOOM_SCALE = 0.35;
const DEFAULT_MAX_ZOOM_SCALE = 50;

export function createViewportCommandOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
  effects = {},
} = {}) {
  void helpers;

  const {
    minZoomScale = DEFAULT_MIN_ZOOM_SCALE,
    maxZoomScale = DEFAULT_MAX_ZOOM_SCALE,
  } = constants;

  function getViewportDimensions() {
    return {
      width: Number(state.width || 0),
      height: Number(state.height || 0),
    };
  }

  function getZoomBehavior() {
    return typeof getters.getZoomBehavior === "function" ? getters.getZoomBehavior() : null;
  }

  function getInteractionRectNode() {
    const rect = typeof getters.getInteractionRect === "function" ? getters.getInteractionRect() : null;
    return typeof rect?.node === "function" ? rect.node() : null;
  }

  function getD3() {
    return typeof getters.getD3 === "function" ? getters.getD3() : null;
  }

  function selectInteractionRect() {
    const d3 = getD3();
    const node = getInteractionRectNode();
    if (!d3 || typeof d3.select !== "function" || !node) return null;
    return d3.select(node);
  }

  function calculatePanExtent() {
    return typeof getters.calculatePanExtent === "function" ? getters.calculatePanExtent() : null;
  }

  function updateZoomTranslateExtent() {
    const zoomBehavior = getZoomBehavior();
    const { width, height } = getViewportDimensions();
    if (!zoomBehavior || width <= 0 || height <= 0) return;
    zoomBehavior.scaleExtent([minZoomScale, maxZoomScale]);
    zoomBehavior.extent([[0, 0], [width, height]]);
    zoomBehavior.translateExtent(calculatePanExtent());
  }

  function getCenteredFitZoomTransform(options) {
    return typeof getters.getCenteredFitZoomTransform === "function"
      ? getters.getCenteredFitZoomTransform(options)
      : null;
  }

  function resetZoomToFit({ centerContent = false, centerX = true, centerY = false } = {}) {
    const zoomBehavior = getZoomBehavior();
    const d3 = getD3();
    const selection = selectInteractionRect();
    if (!zoomBehavior || !d3 || !selection) return;
    updateZoomTranslateExtent();
    const transform = centerContent
      ? (getCenteredFitZoomTransform({ centerX, centerY }) || d3.zoomIdentity)
      : d3.zoomIdentity;
    effects.setZoomTransform?.(transform);
    selection.call(zoomBehavior.transform, transform);
  }

  function zoomByStep(direction = 1) {
    const zoomBehavior = getZoomBehavior();
    const selection = selectInteractionRect();
    if (!zoomBehavior || !selection) return;
    const factor = Number(direction) >= 0 ? 1.2 : 1 / 1.2;
    selection.call(zoomBehavior.scaleBy, factor);
  }

  function setZoomPercent(percent) {
    const zoomBehavior = getZoomBehavior();
    const selection = selectInteractionRect();
    if (!zoomBehavior || !selection) return;
    const rawPercent = typeof percent === "string"
      ? Number(String(percent).trim().replace(/%/g, ""))
      : Number(percent);
    if (!Number.isFinite(rawPercent)) return;
    const nextScale = Math.min(maxZoomScale, Math.max(minZoomScale, rawPercent / 100));
    selection.call(zoomBehavior.scaleTo, nextScale);
  }

  function enforceZoomConstraints() {
    const zoomBehavior = getZoomBehavior();
    const selection = selectInteractionRect();
    if (!zoomBehavior || !selection) return;
    selection.call(zoomBehavior.translateBy, 0, 0);
  }

  return {
    updateZoomTranslateExtent,
    resetZoomToFit,
    zoomByStep,
    setZoomPercent,
    enforceZoomConstraints,
  };
}
