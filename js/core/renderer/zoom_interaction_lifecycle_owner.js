const DEFAULT_MIN_ZOOM_SCALE = 0.35;
const DEFAULT_MAX_ZOOM_SCALE = 50;
const DEFAULT_RENDER_PHASE_INTERACTING = "interacting";
const DEFAULT_RENDER_PHASE_SETTLING = "settling";

function requireFunction(owner, name, ownerName) {
  const value = owner?.[name];
  if (typeof value !== "function") {
    throw new TypeError(`Zoom interaction lifecycle owner requires ${ownerName}.${name}.`);
  }
  return value;
}

export function createZoomInteractionLifecycleOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
  effects = {},
} = {}) {
  void state;
  const {
    minZoomScale = DEFAULT_MIN_ZOOM_SCALE,
    maxZoomScale = DEFAULT_MAX_ZOOM_SCALE,
    renderPhaseInteracting = DEFAULT_RENDER_PHASE_INTERACTING,
    renderPhaseSettling = DEFAULT_RENDER_PHASE_SETTLING,
  } = constants;

  let currentZoomBehavior = null;
  const updateMap = requireFunction(effects, "updateMap", "effects");

  function getD3() {
    return typeof getters.getD3 === "function" ? getters.getD3() : null;
  }

  function getInteractionRect() {
    return typeof getters.getInteractionRect === "function" ? getters.getInteractionRect() : null;
  }

  function getZoomBehavior() {
    return typeof getters.getZoomBehavior === "function" ? getters.getZoomBehavior() : currentZoomBehavior;
  }

  function getZoomIdentity() {
    if (typeof getters.getZoomIdentity === "function") {
      return getters.getZoomIdentity();
    }
    return getD3()?.zoomIdentity;
  }

  function getViewportSize() {
    return {
      width: Number(getters.getWidth?.() || 0),
      height: Number(getters.getHeight?.() || 0),
    };
  }

  function cloneTransform(transform) {
    if (typeof helpers.cloneZoomTransform === "function") {
      return helpers.cloneZoomTransform(transform);
    }
    return transform;
  }

  function shouldAllowZoomEvent(event) {
    return typeof helpers.shouldAllowZoomEvent === "function"
      ? helpers.shouldAllowZoomEvent(event)
      : true;
  }

  function getNowMs() {
    return typeof helpers.nowMs === "function" ? helpers.nowMs() : Date.now();
  }

  function requestFrame(callback) {
    if (typeof helpers.requestAnimationFrame === "function") {
      return helpers.requestAnimationFrame(callback);
    }
    if (typeof globalThis.requestAnimationFrame === "function") {
      return globalThis.requestAnimationFrame(callback);
    }
    throw new Error("Zoom interaction lifecycle owner requires requestAnimationFrame.");
  }

  function getCurrentTransform() {
    return getters.getZoomTransform?.() || getZoomIdentity();
  }

  function getPendingZoomTransform() {
    return getters.getPendingZoomTransform?.() || null;
  }

  function getZoomGestureStartTransform() {
    return getters.getZoomGestureStartTransform?.() || null;
  }

  function isZoomRenderScheduled() {
    return !!getters.isZoomRenderScheduled?.();
  }

  function scheduleLatestZoomTransformFlush() {
    requestFrame(flushLatestZoomTransform);
  }

  function handleZoomStart() {
    effects.clearRenderPhaseTimer?.();
    effects.cancelExactAfterSettleRefresh?.();
    effects.setZoomGestureStartTransform?.(cloneTransform(getCurrentTransform()));
    effects.setZoomGestureScaleDelta?.(0);
    effects.setPendingExactPoliticalFastFrame?.(false);
    effects.setRenderPhase?.(renderPhaseInteracting);
    effects.captureInteractionBorderSnapshot?.(getCurrentTransform());
    effects.renderHoverOverlayIfNeeded?.({ force: true, eventType: "zoom-start" });
    effects.dismissOnboardingHint?.();
  }

  function handleZoom(event = {}) {
    effects.setPendingZoomTransform?.(event.transform);
    if (isZoomRenderScheduled()) return;
    effects.setZoomRenderScheduled?.(true);
    scheduleLatestZoomTransformFlush();
  }

  function flushLatestZoomTransform() {
    const nextTransform = getPendingZoomTransform();
    effects.setPendingZoomTransform?.(null);
    if (nextTransform) {
      updateMap(nextTransform);
    }
    if (getPendingZoomTransform()) {
      scheduleLatestZoomTransformFlush();
      return;
    }
    effects.setZoomRenderScheduled?.(false);
  }

  function handleZoomEnd(event = {}) {
    const endTransform = event.transform;
    effects.setRenderPhase?.(renderPhaseSettling);
    effects.setPendingZoomTransform?.(null);
    updateMap(endTransform);
    const startK = Math.max(0.0001, Number(getZoomGestureStartTransform()?.k || endTransform?.k || 1));
    const endK = Math.max(0.0001, Number(endTransform?.k || startK));
    effects.setZoomGestureScaleDelta?.(Math.abs(Math.log2(endK / startK)));
    effects.setZoomGestureEndedAt?.(getNowMs());
    effects.setPendingExactPoliticalFastFrame?.(true);
    effects.scheduleScenarioChunkRefresh?.({
      reason: "zoom-end",
      delayMs: 0,
    });
    effects.scheduleRenderPhaseIdle?.();
  }

  function initZoom() {
    const d3 = getD3();
    const rect = getInteractionRect();
    const node = typeof rect?.node === "function" ? rect.node() : null;
    if (!d3) throw new Error("Zoom interaction lifecycle owner requires d3.");
    if (!rect || !node) throw new Error("Zoom interaction lifecycle owner requires an interaction rect node.");
    if (typeof d3.zoom !== "function") throw new Error("Zoom interaction lifecycle owner requires d3.zoom.");
    if (typeof d3.select !== "function") throw new Error("Zoom interaction lifecycle owner requires d3.select.");

    const { width, height } = getViewportSize();
    const zoomBehavior = d3.zoom()
      .scaleExtent([minZoomScale, maxZoomScale])
      .extent([[0, 0], [width, height]])
      .filter((event) => shouldAllowZoomEvent(event))
      .on("start", handleZoomStart)
      .on("zoom", handleZoom)
      .on("end", handleZoomEnd);

    currentZoomBehavior = zoomBehavior;
    effects.setZoomBehavior?.(zoomBehavior);
    effects.updateZoomTranslateExtent?.();
    const zoomTarget = d3.select(node);
    zoomTarget.call(zoomBehavior);
    zoomTarget.on("dblclick.zoom", null);
    effects.resetZoomToFit?.();
    effects.enforceZoomConstraints?.();
    return getZoomBehavior();
  }

  function dispose() {
    effects.setPendingZoomTransform?.(null);
    effects.setZoomRenderScheduled?.(false);
    currentZoomBehavior = null;
    effects.setZoomBehavior?.(null);
  }

  return {
    initZoom,
    flushLatestZoomTransform,
    getZoomBehavior,
    dispose,
  };
}
