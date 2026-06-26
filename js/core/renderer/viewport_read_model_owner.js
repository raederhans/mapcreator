const WORLD_GEO_BOUNDS = Object.freeze([-180, -90, 180, 90]);

export function createViewportReadModelOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
} = {}) {
  const {
    mapPanPaddingPx = 50,
    viewportGeoBoundsInsetXRatio = 0.12,
    viewportGeoBoundsInsetYRatio = 0.12,
    viewportGeoBoundsInsetXMax = 160,
    viewportGeoBoundsInsetYMax = 120,
  } = constants;

  function getViewportDimensions({ min = 0 } = {}) {
    return {
      width: Math.max(min, Number(state.width || min)),
      height: Math.max(min, Number(state.height || min)),
    };
  }

  function getLandFeatures() {
    const features = typeof getters.getLandFeatures === "function" ? getters.getLandFeatures() : [];
    return Array.isArray(features) ? features : [];
  }

  function isPathSvgReady() {
    if (typeof getters.getPathSvgReady === "function") {
      return Boolean(getters.getPathSvgReady());
    }
    return Boolean(typeof getters.getPathSvg === "function" ? getters.getPathSvg() : null);
  }

  function getProjectedBoundsForFeature(feature) {
    if (typeof helpers.getProjectedFeatureBounds !== "function") return null;
    const featureId = typeof helpers.getFeatureId === "function" ? helpers.getFeatureId(feature) : null;
    return helpers.getProjectedFeatureBounds(feature, { featureId, allowCompute: false })
      || helpers.getProjectedFeatureBounds(feature, { featureId });
  }

  function normalizeProjectedBounds(bounds) {
    const minX = Number(bounds?.minX);
    const minY = Number(bounds?.minY);
    const maxX = Number(bounds?.maxX);
    const maxY = Number(bounds?.maxY);
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  function mergeFeatureBounds(features = []) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const feature of features) {
      const bounds = normalizeProjectedBounds(getProjectedBoundsForFeature(feature));
      if (!bounds) continue;
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
    return normalizeProjectedBounds({ minX, minY, maxX, maxY });
  }

  function getViewportRenderSignature() {
    return [
      Math.round(Number(state.width || 0)),
      Math.round(Number(state.height || 0)),
      Number(Number(state.dpr || 1).toFixed(2)),
    ].join("|");
  }

  function getProjectionRenderSignature() {
    const projection = typeof getters.getProjection === "function" ? getters.getProjection() : null;
    if (!projection || typeof projection.scale !== "function" || typeof projection.translate !== "function") {
      return "projection:na";
    }
    const translate = projection.translate() || [0, 0];
    return [
      Number(Number(projection.scale() || 0).toFixed(3)),
      Number(Number(translate[0] || 0).toFixed(3)),
      Number(Number(translate[1] || 0).toFixed(3)),
    ].join("|");
  }

  function getViewportGeoBounds() {
    const projection = typeof getters.getProjection === "function" ? getters.getProjection() : null;
    if (!projection || typeof projection.invert !== "function") {
      return [...WORLD_GEO_BOUNDS];
    }
    const transform = state.zoomTransform
      || (typeof getters.getZoomIdentity === "function" ? getters.getZoomIdentity() : null)
      || { x: 0, y: 0, k: 1 };
    const { width, height } = getViewportDimensions({ min: 1 });
    const insetX = Math.min(width * viewportGeoBoundsInsetXRatio, viewportGeoBoundsInsetXMax);
    const insetY = Math.min(height * viewportGeoBoundsInsetYRatio, viewportGeoBoundsInsetYMax);
    const samplePoints = [
      [insetX, insetY],
      [width * 0.5, insetY],
      [Math.max(insetX, width - insetX), insetY],
      [insetX, height * 0.5],
      [width * 0.5, height * 0.5],
      [Math.max(insetX, width - insetX), height * 0.5],
      [insetX, Math.max(insetY, height - insetY)],
      [width * 0.5, Math.max(insetY, height - insetY)],
      [Math.max(insetX, width - insetX), Math.max(insetY, height - insetY)],
    ];
    const longitudes = [];
    const latitudes = [];
    samplePoints.forEach(([screenX, screenY]) => {
      try {
        const mapX = (Number(screenX || 0) - Number(transform.x || 0)) / Math.max(0.0001, Number(transform.k || 1));
        const mapY = (Number(screenY || 0) - Number(transform.y || 0)) / Math.max(0.0001, Number(transform.k || 1));
        const inverted = projection.invert([mapX, mapY]);
        if (!Array.isArray(inverted) || inverted.length < 2) return;
        const [lon, lat] = inverted.map((value) => Number(value));
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        longitudes.push(Math.max(-180, Math.min(180, lon)));
        latitudes.push(Math.max(-90, Math.min(90, lat)));
      } catch (_error) {
        // Projection inversion can fail near singularities; remaining samples still define the view.
      }
    });
    if (!longitudes.length || !latitudes.length) {
      return [...WORLD_GEO_BOUNDS];
    }
    const sortedLongitudes = [...longitudes].sort((left, right) => left - right);
    const sortedLatitudes = [...latitudes].sort((left, right) => left - right);
    const trimCount = sortedLongitudes.length >= 7 && sortedLatitudes.length >= 7 ? 1 : 0;
    return [
      sortedLongitudes[trimCount],
      sortedLatitudes[trimCount],
      sortedLongitudes[sortedLongitudes.length - 1 - trimCount],
      sortedLatitudes[sortedLatitudes.length - 1 - trimCount],
    ];
  }

  function calculatePanExtent() {
    const { width, height } = getViewportDimensions();
    const fallback = [
      [-mapPanPaddingPx, -mapPanPaddingPx],
      [width + mapPanPaddingPx, height + mapPanPaddingPx],
    ];

    if (typeof getters.isHgoRuntimePreviewReady === "function" && getters.isHgoRuntimePreviewReady()) {
      const bounds = getters.getHgoRuntimePreviewBounds?.();
      if (!bounds) return fallback;
      return [
        [bounds.minX - mapPanPaddingPx, bounds.minY - mapPanPaddingPx],
        [bounds.maxX + mapPanPaddingPx, bounds.maxY + mapPanPaddingPx],
      ];
    }

    const landFeatures = getLandFeatures();
    if (!isPathSvgReady() || !landFeatures.length) return fallback;

    const [canvasWidth, canvasHeight] = typeof getters.getLogicalCanvasDimensions === "function"
      ? getters.getLogicalCanvasDimensions()
      : [width, height];
    const features = landFeatures.filter((feature) => (
      typeof helpers.shouldSkipFeature !== "function"
        || !helpers.shouldSkipFeature(feature, canvasWidth, canvasHeight, { forceProd: true })
    ));
    const bounds = mergeFeatureBounds(features);
    if (!bounds) return fallback;

    return [
      [bounds.minX - mapPanPaddingPx, bounds.minY - mapPanPaddingPx],
      [bounds.maxX + mapPanPaddingPx, bounds.maxY + mapPanPaddingPx],
    ];
  }

  function getProjectedRenderableContentBounds() {
    if (typeof getters.isHgoRuntimePreviewReady === "function" && getters.isHgoRuntimePreviewReady()) {
      return getters.getHgoRuntimePreviewBounds?.() || null;
    }
    const landFeatures = getLandFeatures();
    if (!landFeatures.length || Number(state.width || 0) <= 0 || Number(state.height || 0) <= 0) {
      return null;
    }
    const [canvasWidth, canvasHeight] = typeof getters.getLogicalCanvasDimensions === "function"
      ? getters.getLogicalCanvasDimensions()
      : [Number(state.width || 0), Number(state.height || 0)];
    const renderableFeatures = typeof helpers.getRenderableLandFeatures === "function"
      ? helpers.getRenderableLandFeatures(canvasWidth, canvasHeight, { forceProd: true })
      : [];
    const features = Array.isArray(renderableFeatures) && renderableFeatures.length
      ? renderableFeatures
      : landFeatures;
    return mergeFeatureBounds(features);
  }

  function getCenteredFitZoomTransform({ centerX = true, centerY = false } = {}) {
    const identity = typeof getters.getZoomIdentity === "function" ? getters.getZoomIdentity() : null;
    if (!identity) return null;
    const bounds = getProjectedRenderableContentBounds();
    if (!bounds) return identity;
    const { width: viewportWidth, height: viewportHeight } = getViewportDimensions({ min: 1 });
    const nextX = centerX && bounds.width < viewportWidth
      ? ((viewportWidth - bounds.width) / 2) - bounds.minX
      : 0;
    const nextY = centerY && bounds.height < viewportHeight
      ? ((viewportHeight - bounds.height) / 2) - bounds.minY
      : 0;
    if (typeof helpers.createTranslatedZoomIdentity === "function") {
      return helpers.createTranslatedZoomIdentity(identity, nextX, nextY);
    }
    return typeof identity.translate === "function" ? identity.translate(nextX, nextY) : identity;
  }

  function getZoomPercent() {
    const scale = Math.max(0.01, Number(state.zoomTransform?.k) || 1);
    return `${Math.round(scale * 100)}%`;
  }

  return {
    getViewportRenderSignature,
    getProjectionRenderSignature,
    getViewportGeoBounds,
    calculatePanExtent,
    getProjectedRenderableContentBounds,
    getCenteredFitZoomTransform,
    getZoomPercent,
  };
}
