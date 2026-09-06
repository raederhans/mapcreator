const DEFAULT_CONTAINER_RESIZE_DELAY_MS = 120;
const DEFAULT_SPATIAL_REFRESH_DELAY_MS = 360;

export function createViewportResizeLifecycleOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
  effects = {},
} = {}) {
  const {
    containerResizeDelayMs = DEFAULT_CONTAINER_RESIZE_DELAY_MS,
    spatialRefreshDelayMs = DEFAULT_SPATIAL_REFRESH_DELAY_MS,
  } = constants;

  let mapContainerResizeObserver = null;
  let mapContainerResizeFrame = 0;
  let mapContainerResizeTimer = 0;
  let pendingMapResizeReason = "";
  let pendingBrowserPixelRatioRefresh = false;
  let browserPixelRatioMediaQuery = null;
  let browserPixelRatioMediaQueryHandler = null;
  let visualViewportResizeHandler = null;
  let visualViewportResizeTarget = null;
  let resizeSpatialRefreshHandle = null;

  function getRuntimeGlobal() {
    const runtimeGlobal = typeof getters.getGlobal === "function" ? getters.getGlobal() : null;
    return runtimeGlobal && typeof runtimeGlobal === "object" ? runtimeGlobal : globalThis;
  }

  function getMapContainer() {
    return typeof getters.getMapContainer === "function" ? getters.getMapContainer() : null;
  }

  function hasLandFeatures() {
    if (typeof getters.hasLandFeatures === "function") {
      return Boolean(getters.hasLandFeatures());
    }
    return Boolean(state.landData?.features?.length);
  }

  function getTimeoutApi() {
    const runtimeGlobal = getRuntimeGlobal();
    return {
      setTimeout: typeof runtimeGlobal.setTimeout === "function"
        ? runtimeGlobal.setTimeout.bind(runtimeGlobal)
        : globalThis.setTimeout.bind(globalThis),
      clearTimeout: typeof runtimeGlobal.clearTimeout === "function"
        ? runtimeGlobal.clearTimeout.bind(runtimeGlobal)
        : globalThis.clearTimeout.bind(globalThis),
    };
  }

  function requestFrame(callback) {
    const runtimeGlobal = getRuntimeGlobal();
    if (typeof runtimeGlobal.requestAnimationFrame === "function") {
      return runtimeGlobal.requestAnimationFrame(callback);
    }
    return getTimeoutApi().setTimeout(callback, 0);
  }

  function cancelFrame(frameId) {
    if (!frameId) return;
    const runtimeGlobal = getRuntimeGlobal();
    if (typeof runtimeGlobal.cancelAnimationFrame === "function") {
      runtimeGlobal.cancelAnimationFrame(frameId);
      return;
    }
    getTimeoutApi().clearTimeout(frameId);
  }

  function getNowMs() {
    return typeof helpers.nowMs === "function" ? helpers.nowMs() : Date.now();
  }

  function getResizeReason(reason, fallback = "resize") {
    if (typeof helpers.getResizeReason === "function") {
      return helpers.getResizeReason(reason, fallback);
    }
    return typeof reason === "string" && reason.trim() ? reason.trim() : fallback;
  }

  function isInteractiveLayoutResize(reason) {
    return reason === "map-container-resize" || reason === "sidebar-layout-refresh";
  }

  function scheduleResizeSpatialRefresh(reason = "resize") {
    if (typeof helpers.cancelDeferredWork === "function") {
      helpers.cancelDeferredWork(resizeSpatialRefreshHandle);
    }
    if (typeof helpers.scheduleDeferredWork !== "function") {
      resizeSpatialRefreshHandle = null;
      return null;
    }
    resizeSpatialRefreshHandle = helpers.scheduleDeferredWork(() => {
      resizeSpatialRefreshHandle = null;
      if (!hasLandFeatures()) return;
      const startedAt = getNowMs();
      effects.buildSpatialIndex?.();
      effects.setHitCanvasDirty?.();
      effects.scheduleHitCanvasBuildIfNeeded?.({ reason: "resize-spatial-refresh" });
      helpers.recordRenderPerfMetric?.("resizeSpatialRefresh", getNowMs() - startedAt, {
        reason: getResizeReason(reason),
        activeScenarioId: String(state.activeScenarioId || ""),
      });
    }, {
      timeout: Math.max(0, Number(spatialRefreshDelayMs) || 0),
    });
    return resizeSpatialRefreshHandle;
  }

  function shouldPreferFullResizeReason(currentReason, nextReason) {
    return currentReason === "browser-dpr-change" && nextReason !== "browser-dpr-change";
  }

  function requestMapContainerResizeSync(reason = "map-container-resize") {
    const resizeReason = getResizeReason(reason, "map-container-resize");
    if (resizeReason === "browser-dpr-change") {
      pendingBrowserPixelRatioRefresh = true;
      if (mapContainerResizeFrame) {
        pendingMapResizeReason = pendingMapResizeReason || resizeReason;
        return;
      }
      pendingMapResizeReason = resizeReason;
      mapContainerResizeFrame = requestFrame(() => {
        flushPendingMapResizeFrame(resizeReason);
      });
      return;
    }
    if (resizeReason === "map-container-resize") {
      const { setTimeout, clearTimeout } = getTimeoutApi();
      if (mapContainerResizeTimer) {
        clearTimeout(mapContainerResizeTimer);
      }
      mapContainerResizeTimer = setTimeout(() => {
        mapContainerResizeTimer = 0;
        handleResize(resizeReason);
      }, Math.max(0, Number(containerResizeDelayMs) || 0));
      return;
    }
    if (mapContainerResizeFrame) {
      if (shouldPreferFullResizeReason(pendingMapResizeReason, resizeReason)) {
        pendingMapResizeReason = resizeReason;
      }
      return;
    }
    pendingMapResizeReason = resizeReason;
    mapContainerResizeFrame = requestFrame(() => {
      flushPendingMapResizeFrame(resizeReason);
    });
  }

  function bindMapContainerResizeObserver() {
    const runtimeGlobal = getRuntimeGlobal();
    const mapContainer = getMapContainer();
    if (!mapContainer || typeof runtimeGlobal.ResizeObserver !== "function") return;
    if (mapContainerResizeObserver) {
      mapContainerResizeObserver.disconnect();
    }
    mapContainerResizeObserver = new runtimeGlobal.ResizeObserver((entries = []) => {
      const entry = entries[0] || null;
      const width = Math.round(Number(entry?.contentRect?.width || mapContainer.clientWidth || 0));
      const height = Math.round(Number(entry?.contentRect?.height || mapContainer.clientHeight || 0));
      if (width <= 0 || height <= 0) return;
      if (width === Number(state.width || 0) && height === Number(state.height || 0)) return;
      requestMapContainerResizeSync("map-container-resize");
    });
    mapContainerResizeObserver.observe(mapContainer);
  }

  function getDevicePixelRatioMediaQuery() {
    const runtimeGlobal = getRuntimeGlobal();
    const rawDpr = typeof getters.getDevicePixelRatio === "function"
      ? getters.getDevicePixelRatio()
      : runtimeGlobal.devicePixelRatio;
    const numericDpr = Number(rawDpr);
    const dpr = Number.isFinite(numericDpr) && numericDpr > 0 ? numericDpr : 1;
    return `(resolution: ${dpr}dppx)`;
  }

  function unbindBrowserPixelRatioObserver() {
    if (!browserPixelRatioMediaQuery || !browserPixelRatioMediaQueryHandler) {
      browserPixelRatioMediaQuery = null;
      browserPixelRatioMediaQueryHandler = null;
      return;
    }
    if (typeof browserPixelRatioMediaQuery.removeEventListener === "function") {
      browserPixelRatioMediaQuery.removeEventListener("change", browserPixelRatioMediaQueryHandler);
    } else if (typeof browserPixelRatioMediaQuery.removeListener === "function") {
      browserPixelRatioMediaQuery.removeListener(browserPixelRatioMediaQueryHandler);
    }
    browserPixelRatioMediaQuery = null;
    browserPixelRatioMediaQueryHandler = null;
  }

  function bindBrowserPixelRatioObserver() {
    const runtimeGlobal = getRuntimeGlobal();
    if (typeof runtimeGlobal.matchMedia !== "function") return;
    unbindBrowserPixelRatioObserver();
    const mediaQuery = runtimeGlobal.matchMedia(getDevicePixelRatioMediaQuery());
    const handleBrowserPixelRatioChange = () => {
      requestMapContainerResizeSync("browser-dpr-change");
      bindBrowserPixelRatioObserver();
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleBrowserPixelRatioChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleBrowserPixelRatioChange);
    } else {
      return;
    }
    browserPixelRatioMediaQuery = mediaQuery;
    browserPixelRatioMediaQueryHandler = handleBrowserPixelRatioChange;
  }

  function bindVisualViewportResizeObserver() {
    const viewport = getRuntimeGlobal().visualViewport;
    if (!viewport || typeof viewport.addEventListener !== "function") return;
    if (visualViewportResizeHandler && typeof visualViewportResizeTarget?.removeEventListener === "function") {
      visualViewportResizeTarget.removeEventListener("resize", visualViewportResizeHandler);
    }
    visualViewportResizeHandler = () => requestMapContainerResizeSync("visual-viewport-resize");
    visualViewportResizeTarget = viewport;
    viewport.addEventListener("resize", visualViewportResizeHandler, { passive: true });
  }

  function bindBrowserZoomObservers() {
    bindBrowserPixelRatioObserver();
    bindVisualViewportResizeObserver();
  }

  function flushPendingMapResizeFrame(defaultReason = "resize") {
    mapContainerResizeFrame = 0;
    const pendingReason = getResizeReason(pendingMapResizeReason, defaultReason);
    const forceDprInvalidation = pendingBrowserPixelRatioRefresh || pendingReason === "browser-dpr-change";
    pendingMapResizeReason = "";
    pendingBrowserPixelRatioRefresh = false;
    handleResize(pendingReason, { forceDprInvalidation });
  }

  function handleBrowserPixelRatioRefresh(reason = "browser-dpr-change") {
    handleResize(reason, { forceDprInvalidation: true });
  }

  function handleResize(reason = "resize", options = {}) {
    const resizeReason = getResizeReason(reason);
    const forceDprInvalidation = Boolean(options.forceDprInvalidation);
    const browserDprOnlyResize = resizeReason === "browser-dpr-change";
    const interactiveLayoutResize = isInteractiveLayoutResize(resizeReason);
    const previousViewport = {
      width: Number(state.width || 0),
      height: Number(state.height || 0),
    };
    if (interactiveLayoutResize) {
      effects.setRenderPhaseInteracting?.();
    }
    const canvasSizeChanged = effects.setCanvasSize?.({
      reason: resizeReason,
      ...(forceDprInvalidation ? { forceDprInvalidation: true } : {}),
    });
    const layoutSizeChangedDuringPhase = interactiveLayoutResize && (
      previousViewport.width !== Number(state.width || 0)
      || previousViewport.height !== Number(state.height || 0)
    );
    if (!canvasSizeChanged && !layoutSizeChangedDuringPhase) {
      if (interactiveLayoutResize) {
        effects.scheduleRenderPhaseIdle?.();
      }
      return;
    }
    if (browserDprOnlyResize) {
      effects.markAllOverlaysDirty?.();
      effects.render?.();
      effects.handleCanvasDprRefreshComplete?.({ reason: resizeReason });
      return;
    }
    effects.fitProjection?.({ skipSpatialIndex: interactiveLayoutResize });
    effects.resetZoomToFit?.({
      centerContent: interactiveLayoutResize,
      centerX: true,
      centerY: false,
    });
    if (!interactiveLayoutResize) {
      effects.enforceZoomConstraints?.();
    }
    effects.markAllOverlaysDirty?.();
    effects.render?.();
    if (forceDprInvalidation) {
      effects.handleCanvasDprRefreshComplete?.({ reason: resizeReason });
    }
    if (interactiveLayoutResize) {
      scheduleResizeSpatialRefresh(resizeReason);
      effects.scheduleRenderPhaseIdle?.();
    }
  }

  function handleSidebarLayoutStart() {
    effects.setRenderPhaseInteracting?.();
    effects.scheduleRenderPhaseIdle?.();
  }

  function dispose() {
    if (mapContainerResizeObserver) {
      mapContainerResizeObserver.disconnect();
      mapContainerResizeObserver = null;
    }
    cancelFrame(mapContainerResizeFrame);
    mapContainerResizeFrame = 0;
    if (mapContainerResizeTimer) {
      getTimeoutApi().clearTimeout(mapContainerResizeTimer);
      mapContainerResizeTimer = 0;
    }
    pendingMapResizeReason = "";
    pendingBrowserPixelRatioRefresh = false;
    unbindBrowserPixelRatioObserver();
    if (visualViewportResizeHandler && typeof visualViewportResizeTarget?.removeEventListener === "function") {
      visualViewportResizeTarget.removeEventListener("resize", visualViewportResizeHandler);
    }
    visualViewportResizeHandler = null;
    visualViewportResizeTarget = null;
    if (typeof helpers.cancelDeferredWork === "function") {
      helpers.cancelDeferredWork(resizeSpatialRefreshHandle);
    }
    resizeSpatialRefreshHandle = null;
  }

  return Object.freeze({
    getResizeReason,
    isInteractiveLayoutResize,
    scheduleResizeSpatialRefresh,
    shouldPreferFullResizeReason,
    requestMapContainerResizeSync,
    bindMapContainerResizeObserver,
    getDevicePixelRatioMediaQuery,
    unbindBrowserPixelRatioObserver,
    bindBrowserPixelRatioObserver,
    bindVisualViewportResizeObserver,
    bindBrowserZoomObservers,
    handleBrowserPixelRatioRefresh,
    handleResize,
    handleSidebarLayoutStart,
    dispose,
  });
}
