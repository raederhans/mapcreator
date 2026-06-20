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
  refreshOpeningOwnerBorders = true,
  resetWaterCacheReason = "",
} = {}) {
  return {
    kind: "RendererRefreshPlan",
    source: String(source || "scenario-refresh"),
    targetPasses: normalizeStringList(targetPasses),
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
  return createScenarioRefreshPlan({
    source: "scenario-chunk-promotion",
    changedLayerKeys: normalizedChangedLayerKeys,
    renderer: {
      targetPasses: [],
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
  return {
    source: String(plan.source || defaults.source || "renderer-refresh"),
    targetPasses: normalizeStringList(targetPasses),
    refreshOpeningOwnerBorders: plan.refreshOpeningOwnerBorders !== undefined
      ? plan.refreshOpeningOwnerBorders !== false
      : defaults.refreshOpeningOwnerBorders !== false,
    resetWaterCacheReason: String(plan.resetWaterCacheReason || defaults.resetWaterCacheReason || ""),
  };
}

export {
  createScenarioApplyRefreshPlan,
  createScenarioChunkPromotionRefreshPlan,
  createStartupHydrationRefreshPlan,
  getRendererRefreshPlan,
  getScenarioChunkPromotionTargetPasses,
  normalizeRendererRefreshPlan,
};
