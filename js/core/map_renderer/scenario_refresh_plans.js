function normalizeLayerKeyList(layerKeys = []) {
  return Array.from(
    new Set(
      (Array.isArray(layerKeys) ? layerKeys : [])
        .map((layerKey) => String(layerKey || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizeStringList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function createRendererRefreshPlan({
  source,
  targetPasses = [],
  frameGraphInvalidation = null,
  refreshOpeningOwnerBorders = true,
  resetWaterCacheReason = "",
} = {}) {
  return {
    kind: "RendererRefreshPlan",
    source: String(source || "scenario-refresh"),
    targetPasses: normalizeStringList(targetPasses),
    ...(frameGraphInvalidation && typeof frameGraphInvalidation === "object"
      ? { frameGraphInvalidation }
      : {}),
    refreshOpeningOwnerBorders: refreshOpeningOwnerBorders !== false,
    resetWaterCacheReason: String(resetWaterCacheReason || ""),
  };
}

function createScenarioRefreshPlan({
  source,
  changedLayerKeys = [],
  renderer = {},
} = {}) {
  return {
    kind: "ScenarioRefreshPlan",
    source: String(source || "scenario-refresh"),
    changedLayerKeys: normalizeLayerKeyList(changedLayerKeys),
    renderer: createRendererRefreshPlan({
      source,
      ...renderer,
    }),
  };
}

const PASS_RESOURCE_MAP = Object.freeze({
  background: Object.freeze(["backgroundBuffer"]),
  physicalBase: Object.freeze(["physicalBaseBuffer"]),
  political: Object.freeze(["politicalBaseBuffer", "hitIndex"]),
  contextBase: Object.freeze(["contextBaseBuffer"]),
  contextScenario: Object.freeze(["contextScenarioBuffer"]),
  effects: Object.freeze(["effectsBuffer"]),
  lineEffects: Object.freeze(["lineEffectsBuffer"]),
  contextMarkers: Object.freeze(["contextMarkersBuffer"]),
  dayNight: Object.freeze(["dayNightBuffer"]),
  borders: Object.freeze(["borderBuffer", "interactionOverlay"]),
  textureLabels: Object.freeze(["textureLabelBuffer"]),
  labels: Object.freeze(["labelBuffer"]),
});

function getTargetResourcesForPasses(targetPasses = []) {
  return normalizeStringList((Array.isArray(targetPasses) ? targetPasses : []).flatMap((passName) => (
    PASS_RESOURCE_MAP[String(passName || "").trim()] || []
  )));
}

function createFrameGraphInvalidation({
  reason = "scenario-refresh",
  changedLayerKeys = [],
  dataRevisionLayers = changedLayerKeys,
  renderVisibleLayers = changedLayerKeys,
  interactionAuthorityLayers = changedLayerKeys,
  targetPasses = [],
  targetResources = null,
  clearLastGoodFrame = false,
  clearReferenceTransforms = false,
  clearPartialPoliticalDirtyIds = false,
  resetWaterCacheReason = "",
  clearOpeningOwnerBorderCache = false,
  clearInteractionComposite = false,
} = {}) {
  const normalizedTargetPasses = normalizeStringList(targetPasses);
  return {
    kind: "FrameGraphInvalidation",
    reason: String(reason || "scenario-refresh"),
    dataRevisionLayers: normalizeLayerKeyList(dataRevisionLayers),
    renderVisibleLayers: normalizeLayerKeyList(renderVisibleLayers),
    interactionAuthorityLayers: normalizeLayerKeyList(interactionAuthorityLayers),
    targetResources: Array.isArray(targetResources)
      ? normalizeStringList(targetResources)
      : getTargetResourcesForPasses(normalizedTargetPasses),
    targetPasses: normalizedTargetPasses,
    clearLastGoodFrame: !!clearLastGoodFrame,
    clearReferenceTransforms: !!clearReferenceTransforms,
    clearPartialPoliticalDirtyIds: !!clearPartialPoliticalDirtyIds,
    resetWaterCacheReason: String(resetWaterCacheReason || ""),
    clearOpeningOwnerBorderCache: !!clearOpeningOwnerBorderCache,
    clearInteractionComposite: !!clearInteractionComposite,
  };
}

function createScenarioApplyRefreshPlan({
  refreshOpeningOwnerBorders = true,
} = {}) {
  return createScenarioRefreshPlan({
    source: "scenario-apply",
    renderer: {
      targetPasses: [
        "background",
        "physicalBase",
        "political",
        "contextBase",
        "contextScenario",
        "dayNight",
        "borders",
        "labels",
      ],
      refreshOpeningOwnerBorders,
      resetWaterCacheReason: "scenario-switch-complete",
    },
  });
}

function createScenarioChunkPromotionRefreshPlan({
  changedLayerKeys = [],
  hasPoliticalChange = false,
} = {}) {
  const normalizedChangedLayerKeys = normalizeLayerKeyList(changedLayerKeys);
  const derivedTargetPasses = getScenarioChunkPromotionTargetPasses({
    changedLayerKeys: normalizedChangedLayerKeys,
    hasPoliticalChange,
  });
  return createScenarioRefreshPlan({
    source: "scenario-chunk-promotion",
    changedLayerKeys: normalizedChangedLayerKeys,
    renderer: {
      targetPasses: [],
      frameGraphInvalidation: createFrameGraphInvalidation({
        reason: "scenario-chunk-promotion",
        changedLayerKeys: normalizedChangedLayerKeys,
        targetPasses: derivedTargetPasses,
        clearLastGoodFrame: derivedTargetPasses.some((passName) => (
          passName === "political" || passName === "contextBase" || passName === "contextScenario"
        )),
        clearReferenceTransforms: derivedTargetPasses.length > 0,
        clearPartialPoliticalDirtyIds: derivedTargetPasses.includes("political"),
        clearOpeningOwnerBorderCache: !!hasPoliticalChange,
        clearInteractionComposite: derivedTargetPasses.some((passName) => (
          passName === "political" || passName === "contextBase" || passName === "contextScenario" || passName === "borders"
        )),
      }),
      refreshOpeningOwnerBorders: !!hasPoliticalChange,
    },
  });
}

function createStartupHydrationRefreshPlan({
  changedLayerKeys = [],
  hasPoliticalChange = true,
} = {}) {
  return createScenarioRefreshPlan({
    source: "startup-hydration",
    changedLayerKeys,
    renderer: {
      targetPasses: [],
      refreshOpeningOwnerBorders: !!hasPoliticalChange,
    },
  });
}

function getRendererRefreshPlan(refreshPlan) {
  if (!refreshPlan || typeof refreshPlan !== "object") return null;
  if (refreshPlan.kind === "RendererRefreshPlan") return refreshPlan;
  if (refreshPlan.renderer && typeof refreshPlan.renderer === "object") {
    return refreshPlan.renderer;
  }
  return null;
}

function getScenarioChunkPromotionTargetPasses({
  changedLayerKeys = [],
  hasPoliticalChange = false,
} = {}) {
  const targetPasses = new Set();
  if (hasPoliticalChange) {
    ["political", "contextBase", "contextMarkers", "borders", "labels"].forEach((passName) => targetPasses.add(passName));
  }
  (Array.isArray(changedLayerKeys) ? changedLayerKeys : []).forEach((layerKey) => {
    const normalized = String(layerKey || "").trim().toLowerCase();
    if (normalized === "cities") {
      ["contextBase", "labels", "dayNight"].forEach((passName) => targetPasses.add(passName));
      return;
    }
    if (normalized === "water" || normalized === "special" || normalized === "relief") {
      targetPasses.add("contextScenario");
      return;
    }
    if (normalized === "scenario_atlantropa") {
      ["political", "contextScenario", "borders", "labels"].forEach((passName) => targetPasses.add(passName));
      return;
    }
    if (normalized === "strategicvalues") {
      ["political", "contextMarkers", "labels"].forEach((passName) => targetPasses.add(passName));
    }
  });
  return Array.from(targetPasses);
}

function normalizeRendererRefreshPlan(refreshPlan, defaults = {}) {
  const plan = refreshPlan && typeof refreshPlan === "object" ? refreshPlan : {};
  const defaultTargetPasses = Array.isArray(defaults.targetPasses) ? defaults.targetPasses : [];
  const targetPasses = Array.isArray(plan.targetPasses) && plan.targetPasses.length
    ? plan.targetPasses
    : defaultTargetPasses;
  const frameGraphInvalidation = plan.frameGraphInvalidation && typeof plan.frameGraphInvalidation === "object"
    ? plan.frameGraphInvalidation
    : (defaults.frameGraphInvalidation && typeof defaults.frameGraphInvalidation === "object" ? defaults.frameGraphInvalidation : null);
  return {
    source: String(plan.source || defaults.source || "renderer-refresh"),
    targetPasses: normalizeStringList(targetPasses),
    ...(frameGraphInvalidation ? { frameGraphInvalidation } : {}),
    refreshOpeningOwnerBorders: plan.refreshOpeningOwnerBorders !== undefined
      ? plan.refreshOpeningOwnerBorders !== false
      : defaults.refreshOpeningOwnerBorders !== false,
    resetWaterCacheReason: String(plan.resetWaterCacheReason || defaults.resetWaterCacheReason || ""),
  };
}

export {
  createFrameGraphInvalidation,
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
  createStartupHydrationRefreshPlan,
  getTargetResourcesForPasses,
  getRendererRefreshPlan,
  getScenarioChunkPromotionTargetPasses,
  normalizeRendererRefreshPlan,
};
