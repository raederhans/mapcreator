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
  hgoPreview: Object.freeze(["hgoPreviewBuffer"]),
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

const RESOURCE_PASS_MAP = Object.freeze(Object.entries(PASS_RESOURCE_MAP).reduce((acc, [passName, resourceNames]) => {
  resourceNames.forEach((resourceName) => {
    if (!acc[resourceName]) acc[resourceName] = [];
    acc[resourceName].push(passName);
  });
  return acc;
}, {}));

const FIRST_FRAME_BASE_TARGET_RESOURCES = Object.freeze([
  "backgroundBuffer",
  "physicalBaseBuffer",
  "politicalBaseBuffer",
  "hitIndex",
  "borderBuffer",
  "interactionOverlay",
]);

const FIRST_FRAME_HGO_TARGET_RESOURCES = Object.freeze([
  "hgoPreviewBuffer",
]);

function getTargetResourcesForPasses(targetPasses = []) {
  return normalizeStringList((Array.isArray(targetPasses) ? targetPasses : []).flatMap((passName) => (
    PASS_RESOURCE_MAP[String(passName || "").trim()] || []
  )));
}

function getTargetPassesForResources(targetResources = []) {
  return normalizeStringList((Array.isArray(targetResources) ? targetResources : []).flatMap((resourceName) => (
    RESOURCE_PASS_MAP[String(resourceName || "").trim()] || []
  )));
}

function hasAnyTargetResource(targetResources = [], resourceNames = []) {
  const targetResourceSet = new Set(normalizeStringList(targetResources));
  return (Array.isArray(resourceNames) ? resourceNames : []).some((resourceName) => (
    targetResourceSet.has(String(resourceName || "").trim())
  ));
}

function getFirstFrameTargetResources({
  hgoPreviewDirty = false,
} = {}) {
  return normalizeStringList([
    ...FIRST_FRAME_BASE_TARGET_RESOURCES,
    ...(hgoPreviewDirty ? FIRST_FRAME_HGO_TARGET_RESOURCES : []),
  ]);
}

function resolveFirstFrameTargetResources(targetResources = [], {
  hgoPreviewDirty = false,
} = {}) {
  const allowlist = new Set(getFirstFrameTargetResources({ hgoPreviewDirty }));
  const filteredTargetResources = normalizeStringList(targetResources).filter((resourceName) => allowlist.has(resourceName));
  return normalizeStringList([
    ...FIRST_FRAME_BASE_TARGET_RESOURCES,
    ...filteredTargetResources,
    ...(hgoPreviewDirty ? FIRST_FRAME_HGO_TARGET_RESOURCES : []),
  ]);
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
  const hasExplicitTargetResources = Array.isArray(targetResources);
  const normalizedTargetResources = hasExplicitTargetResources
    ? normalizeStringList(targetResources)
    : getTargetResourcesForPasses(normalizedTargetPasses);
  const legacyTargetPasses = hasExplicitTargetResources || normalizedTargetResources.length
    ? getTargetPassesForResources(normalizedTargetResources)
    : normalizedTargetPasses;
  return {
    kind: "FrameGraphInvalidation",
    reason: String(reason || "scenario-refresh"),
    dataRevisionLayers: normalizeLayerKeyList(dataRevisionLayers),
    renderVisibleLayers: normalizeLayerKeyList(renderVisibleLayers),
    interactionAuthorityLayers: normalizeLayerKeyList(interactionAuthorityLayers),
    targetResources: normalizedTargetResources,
    legacyTargetPasses,
    targetPasses: legacyTargetPasses,
    clearLastGoodFrame: !!clearLastGoodFrame,
    clearReferenceTransforms: !!clearReferenceTransforms,
    clearPartialPoliticalDirtyIds: !!clearPartialPoliticalDirtyIds,
    resetWaterCacheReason: String(resetWaterCacheReason || ""),
    clearOpeningOwnerBorderCache: !!clearOpeningOwnerBorderCache,
    clearInteractionComposite: !!clearInteractionComposite,
  };
}

function getFrameGraphInvalidationTargetPasses(frameGraphInvalidation, fallbackTargetPasses = []) {
  if (frameGraphInvalidation && typeof frameGraphInvalidation === "object") {
    if (Array.isArray(frameGraphInvalidation.targetResources)) {
      return getTargetPassesForResources(frameGraphInvalidation.targetResources);
    }
    const resourceTargetPasses = getTargetPassesForResources(frameGraphInvalidation.targetResources);
    if (resourceTargetPasses.length) return resourceTargetPasses;
    const legacyTargetPasses = normalizeStringList(frameGraphInvalidation.legacyTargetPasses);
    if (legacyTargetPasses.length) return legacyTargetPasses;
    const targetPasses = normalizeStringList(frameGraphInvalidation.targetPasses);
    if (targetPasses.length) return targetPasses;
  }
  return normalizeStringList(fallbackTargetPasses);
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
  firstFrameOnly = false,
  hgoPreviewDirty = false,
} = {}) {
  const normalizedChangedLayerKeys = normalizeLayerKeyList(changedLayerKeys);
  const promotionTargetResources = getScenarioChunkPromotionTargetResources({
    changedLayerKeys: normalizedChangedLayerKeys,
    hasPoliticalChange,
  });
  const targetResources = firstFrameOnly
    ? resolveFirstFrameTargetResources(promotionTargetResources, { hgoPreviewDirty })
    : promotionTargetResources;
  const targetPasses = getTargetPassesForResources(targetResources);
  return createScenarioRefreshPlan({
    source: "scenario-chunk-promotion",
    changedLayerKeys: normalizedChangedLayerKeys,
    renderer: {
      targetPasses: [],
      frameGraphInvalidation: createFrameGraphInvalidation({
        reason: "scenario-chunk-promotion",
        changedLayerKeys: normalizedChangedLayerKeys,
        targetResources,
        clearLastGoodFrame: hasAnyTargetResource(targetResources, [
          "politicalBaseBuffer",
          "hitIndex",
          "contextBaseBuffer",
          "contextScenarioBuffer",
        ]),
        clearReferenceTransforms: targetResources.length > 0,
        clearPartialPoliticalDirtyIds: hasAnyTargetResource(targetResources, [
          "politicalBaseBuffer",
          "hitIndex",
        ]),
        clearOpeningOwnerBorderCache: !!hasPoliticalChange,
        clearInteractionComposite: hasAnyTargetResource(targetResources, [
          "politicalBaseBuffer",
          "hitIndex",
          "contextBaseBuffer",
          "contextScenarioBuffer",
          "borderBuffer",
          "interactionOverlay",
        ]),
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
  return getTargetPassesForResources(getScenarioChunkPromotionTargetResources({
    changedLayerKeys,
    hasPoliticalChange,
  }));
}

function getScenarioChunkPromotionTargetResources({
  changedLayerKeys = [],
  hasPoliticalChange = false,
} = {}) {
  const targetResources = new Set();
  const addResources = (resourceNames) => {
    (Array.isArray(resourceNames) ? resourceNames : []).forEach((resourceName) => {
      const normalized = String(resourceName || "").trim();
      if (normalized) targetResources.add(normalized);
    });
  };
  if (hasPoliticalChange) {
    addResources([
      "politicalBaseBuffer",
      "hitIndex",
      "contextBaseBuffer",
      "contextMarkersBuffer",
      "borderBuffer",
      "interactionOverlay",
      "labelBuffer",
    ]);
  }
  (Array.isArray(changedLayerKeys) ? changedLayerKeys : []).forEach((layerKey) => {
    const normalized = String(layerKey || "").trim().toLowerCase();
    if (normalized === "cities") {
      addResources(["contextBaseBuffer", "labelBuffer", "dayNightBuffer"]);
      return;
    }
    if (normalized === "water" || normalized === "special" || normalized === "relief") {
      addResources(["contextScenarioBuffer"]);
      return;
    }
    if (normalized === "scenario_atlantropa") {
      addResources([
        "politicalBaseBuffer",
        "hitIndex",
        "contextScenarioBuffer",
        "borderBuffer",
        "interactionOverlay",
        "labelBuffer",
      ]);
      return;
    }
    if (normalized === "strategicvalues") {
      addResources(["politicalBaseBuffer", "hitIndex", "contextMarkersBuffer", "labelBuffer"]);
    }
  });
  return Array.from(targetResources);
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

function resolveScenarioChunkPromotionRendererRefreshDescriptor({
  refreshPlan = null,
  changedLayerKeys = [],
  hasPoliticalChange = false,
} = {}) {
  const defaultTargetPasses = getScenarioChunkPromotionTargetPasses({
    changedLayerKeys,
    hasPoliticalChange,
  });
  const rendererRefreshPlan = normalizeRendererRefreshPlan(refreshPlan, {
    source: "scenario-chunk-promotion",
    targetPasses: defaultTargetPasses,
    refreshOpeningOwnerBorders: hasPoliticalChange,
  });
  const frameGraphInvalidation = rendererRefreshPlan.frameGraphInvalidation && typeof rendererRefreshPlan.frameGraphInvalidation === "object"
    ? rendererRefreshPlan.frameGraphInvalidation
    : null;
  const hasExplicitTargetResources = Array.isArray(frameGraphInvalidation?.targetResources);
  const targetPasses = getFrameGraphInvalidationTargetPasses(
    frameGraphInvalidation,
    rendererRefreshPlan.targetPasses,
  );
  const targetResources = hasExplicitTargetResources
    ? normalizeStringList(frameGraphInvalidation.targetResources)
    : getTargetResourcesForPasses(targetPasses);
  return {
    rendererRefreshPlan,
    frameGraphInvalidation,
    hasExplicitTargetResources,
    targetPasses,
    targetResources,
  };
}

export {
  createFrameGraphInvalidation,
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
  createStartupHydrationRefreshPlan,
  getFirstFrameTargetResources,
  getFrameGraphInvalidationTargetPasses,
  getTargetPassesForResources,
  getTargetResourcesForPasses,
  getRendererRefreshPlan,
  getScenarioChunkPromotionTargetPasses,
  getScenarioChunkPromotionTargetResources,
  normalizeRendererRefreshPlan,
  resolveFirstFrameTargetResources,
  resolveScenarioChunkPromotionRendererRefreshDescriptor,
};
