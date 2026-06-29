function requireFunction(owner, name, ownerName) {
  if (typeof owner?.[name] !== "function") {
    throw new TypeError(`renderer viewport update owner requires ${ownerName}.${name}`);
  }
  return owner[name].bind(owner);
}

export function createRendererViewportUpdateOwner({
  effects = {},
  getters = {},
} = {}) {
  void getters;

  const setZoomTransform = requireFunction(effects, "setZoomTransform", "effects");
  const setHitCanvasDirty = requireFunction(effects, "setHitCanvasDirty", "effects");
  const updateZoomUi = requireFunction(effects, "updateZoomUi", "effects");
  const applyViewportTransform = requireFunction(effects, "applyViewportTransform", "effects");
  const renderPhysicalIntensityBrushPreview = requireFunction(
    effects,
    "renderPhysicalIntensityBrushPreview",
    "effects",
  );
  const syncUnitCounterScalesDuringZoom = requireFunction(
    effects,
    "syncUnitCounterScalesDuringZoom",
    "effects",
  );
  const syncSpecialZonePatternTransformDuringZoom = requireFunction(
    effects,
    "syncSpecialZonePatternTransformDuringZoom",
    "effects",
  );
  const drawFrame = requireFunction(effects, "drawFrame", "effects");

  function updateMap(transform) {
    setZoomTransform(transform);
    setHitCanvasDirty();
    updateZoomUi();
    applyViewportTransform(transform);
    renderPhysicalIntensityBrushPreview();
    syncUnitCounterScalesDuringZoom();
    syncSpecialZonePatternTransformDuringZoom();
    drawFrame();
  }

  return Object.freeze({
    updateMap,
  });
}
