// Scenario runtime state defaults.
// 这个文件只负责场景运行时默认 shape，保持 state.js 继续做公开 facade。
// 这里收口的是容易在 scenario/chunk/reset/rollback 多条路径里漂移的默认对象。

export function createDefaultActiveScenarioChunksState(scenarioId = "") {
  return {
    scenarioId: String(scenarioId || "").trim(),
    loadedChunkIds: [],
    payloadByChunkId: {},
    mergedLayerPayloads: {},
    lruChunkIds: [],
  };
}

export function createDefaultRuntimeChunkLoadState({ scenarioId = "" } = {}) {
  const normalizedScenarioId = String(scenarioId || "").trim();
  const ready = !!normalizedScenarioId;
  return {
    // shell/registry 负责 chunk runtime 是否具备基础资源；
    // protected/promotion/inFlight 三组字段则负责 zoom-end 保护、promotion 提交和并发加载状态机。
    // 后续 owner 会跨 startup、chunk refresh、detail promotion 共同读写这里，
    // 所以字段语义必须稳定，不能把一次性局部状态随手塞进这个对象。
    shellStatus: ready ? "ready" : "idle",
    registryStatus: ready ? "ready" : "idle",
    refreshScheduled: false,
    refreshTimerId: null,
    selectionVersion: 0,
    pendingReason: "",
    pendingDelayMs: null,
    focusCountryOverride: "",
    focusCountryOverrideSource: "",
    focusCountryOverrideExpiresAt: 0,
    zoomEndChunkVisibleMetric: null,
    lastZoomEndToChunkVisibleMetric: null,
    zoomEndProtectedChunkIds: [],
    zoomEndProtectedUntil: 0,
    zoomEndProtectedSelectionVersion: 0,
    zoomEndProtectedScenarioId: "",
    zoomEndProtectedFocusCountry: "",
    pendingVisualPromotion: null,
    pendingInfraPromotion: null,
    pendingPromotion: null,
    promotionTimerId: null,
    promotionScheduled: false,
    promotionCommitInFlight: false,
    promotionCommitRunId: 0,
    promotionCommitStatus: "idle",
    promotionCommitScenarioId: "",
    promotionCommitSelectionVersion: 0,
    promotionCommitReason: "",
    promotionCommitStartedAt: 0,
    promotionCommitFinishedAt: 0,
    promotionCommitError: "",
    pendingPostCommitRefresh: null,
    promotionRetryCount: 0,
    lastPromotionRetryAt: 0,
    inFlightByChunkId: {},
    errorByChunkId: {},
    lastSelection: null,
    layerSelectionSignatures: {},
    mergedLayerPayloadCache: {},
  };
}

export function createDefaultScenarioDataHealth(minRatio = 0.7) {
  return {
    expectedFeatureCount: 0,
    runtimeFeatureCount: 0,
    ratio: 1,
    minRatio: Number(minRatio) || 0.7,
    generatedColorTags: [],
    warning: "",
    severity: "",
  };
}

export function setScenarioDataHealthState(target, nextState = {}, fallbackMinRatio = 0.7) {
  if (!target || typeof target !== "object") {
    return createDefaultScenarioDataHealth(fallbackMinRatio);
  }
  const health = {
    ...createDefaultScenarioDataHealth(fallbackMinRatio),
    ...(
      nextState && typeof nextState === "object"
        ? nextState
        : {}
    ),
  };
  health.expectedFeatureCount = Number(health.expectedFeatureCount) || 0;
  health.runtimeFeatureCount = Number(health.runtimeFeatureCount) || 0;
  health.ratio = Number.isFinite(Number(health.ratio)) ? Number(health.ratio) : 1;
  health.minRatio = Number(health.minRatio) || Number(fallbackMinRatio) || 0.7;
  health.generatedColorTags = Array.isArray(health.generatedColorTags)
    ? [...health.generatedColorTags]
    : [];
  health.warning = String(health.warning || "");
  health.severity = String(health.severity || "");
  target.scenarioDataHealth = health;
  return target.scenarioDataHealth;
}

export function createDefaultScenarioHydrationHealthGate() {
  return {
    status: "idle",
    reason: "",
    checkedAt: 0,
    attemptedRetry: false,
    ownerFeatureOverlapRatio: 1,
    ownerFeatureOverlapCount: 0,
    ownerFeatureRenderedCount: 0,
    degradedWaterOverlay: false,
  };
}

export const SCENARIO_HYDRATION_HEALTH_REASONS = Object.freeze({
  ok: "ok",
  ownerFeatureMismatch: "owner-feature-mismatch",
  missingRuntimeSourceSha: "missing-runtime-source-sha",
  runtimeTopologyUnrenderable: "scenario-runtime-topology-unrenderable",
});

export function setHydratedScenarioRuntimeTopologyState(
  target,
  {
    runtimeTopologyData = null,
    runtimePoliticalTopology = null,
    runtimePoliticalMetaSeed = null,
    runtimePoliticalFeatureCollectionSeed = null,
    scenarioLandMaskData = null,
    scenarioContextLandMaskData = null,
    scenarioWaterRegionsData = null,
    scenarioAtlantropaData = null,
    scenarioRuntimeTopologyVersionTag = "",
    scenarioWaterOverlayVersionTag = "",
    scenarioLandMaskVersionTag = "",
    scenarioContextLandMaskVersionTag = "",
    scenarioSpecialRegionsData = null,
  } = {},
) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.scenarioRuntimeTopologyData = runtimeTopologyData || null;
  target.runtimePoliticalTopology = runtimePoliticalTopology || null;
  target.runtimePoliticalMetaSeed = runtimePoliticalMetaSeed || null;
  target.runtimePoliticalFeatureCollectionSeed = runtimePoliticalFeatureCollectionSeed || null;
  target.scenarioLandMaskData = scenarioLandMaskData || null;
  target.scenarioContextLandMaskData = scenarioContextLandMaskData || null;
  target.scenarioWaterRegionsData = scenarioWaterRegionsData || null;
  target.scenarioAtlantropaData = scenarioAtlantropaData || null;
  target.scenarioRuntimeTopologyVersionTag = String(scenarioRuntimeTopologyVersionTag || "");
  target.scenarioWaterOverlayVersionTag = String(scenarioWaterOverlayVersionTag || "");
  target.scenarioLandMaskVersionTag = String(scenarioLandMaskVersionTag || "");
  target.scenarioContextLandMaskVersionTag = String(scenarioContextLandMaskVersionTag || "");
  target.scenarioSpecialRegionsData = scenarioSpecialRegionsData || null;
  return target.scenarioRuntimeTopologyData;
}

export function setScenarioRuntimeOptionalLayerState(target, nextState = {}) {
  if (!target || typeof target !== "object") {
    return null;
  }
  // optional layer 要区分“这次提交没有提到该 layer”和“这次明确要把它清空”。
  // 所以这里统一走 hasOwnProperty，而不是用 truthy 判断偷懒。
  // 这样 rollback / apply / reload 才能保住“沿用旧值”和“主动清空”两种不同语义。
  const hasOwn = Object.prototype.hasOwnProperty;
  if (hasOwn.call(nextState, "activeScenarioMeshPack")) {
    target.activeScenarioMeshPack = nextState.activeScenarioMeshPack || null;
  }
  if (hasOwn.call(nextState, "scenarioPoliticalChunkData")) {
    target.scenarioPoliticalChunkData = nextState.scenarioPoliticalChunkData || null;
  }
  if (hasOwn.call(nextState, "scenarioPoliticalVisibleChunkData")) {
    target.scenarioPoliticalVisibleChunkData = nextState.scenarioPoliticalVisibleChunkData || null;
  }
  if (hasOwn.call(nextState, "scenarioAtlantropaData")) {
    target.scenarioAtlantropaData = nextState.scenarioAtlantropaData || null;
  }
  if (hasOwn.call(nextState, "scenarioDistrictGroupsData")) {
    target.scenarioDistrictGroupsData = nextState.scenarioDistrictGroupsData || null;
  }
  if (hasOwn.call(nextState, "scenarioDistrictGroupByFeatureId")) {
    target.scenarioDistrictGroupByFeatureId =
      nextState.scenarioDistrictGroupByFeatureId instanceof Map
        ? nextState.scenarioDistrictGroupByFeatureId
        : new Map();
  }
  if (hasOwn.call(nextState, "scenarioReliefOverlaysData")) {
    target.scenarioReliefOverlaysData = nextState.scenarioReliefOverlaysData || null;
  }
  return target;
}

export function setScenarioImportAudit(target, scenarioImportAudit = null) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.scenarioImportAudit = scenarioImportAudit || null;
  return target.scenarioImportAudit;
}

export function ensureScenarioPerfMetricsState(target) {
  if (!target || typeof target !== "object") {
    return {};
  }
  if (!target.scenarioPerfMetrics || typeof target.scenarioPerfMetrics !== "object") {
    target.scenarioPerfMetrics = {};
  }
  // perf 面板和外部诊断脚本仍从全局命名空间读取同一份对象。
  // 这里每次都把引用重新挂回去，保证 owner 写口和观测口指向同一份 state。
  globalThis.__scenarioPerfMetrics = target.scenarioPerfMetrics;
  return target.scenarioPerfMetrics;
}

export function setScenarioPerfMetricState(target, name, nextEntry = {}, { merge = false } = {}) {
  const metrics = ensureScenarioPerfMetricsState(target);
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return null;
  const previousEntry = merge && metrics[normalizedName] && typeof metrics[normalizedName] === "object"
    ? metrics[normalizedName]
    : {};
  metrics[normalizedName] = {
    ...previousEntry,
    ...(
      nextEntry && typeof nextEntry === "object"
        ? nextEntry
        : {}
    ),
  };
  globalThis.__scenarioPerfMetrics = metrics;
  return metrics[normalizedName];
}

export function recordScenarioPerfMetricState(target, name, durationMs, details = {}) {
  return setScenarioPerfMetricState(target, name, {
    durationMs: Math.max(0, Number(durationMs) || 0),
    recordedAt: Date.now(),
    ...(
      details && typeof details === "object"
        ? details
        : {}
    ),
  });
}

export function commitScenarioActivationRuntimeState(target, nextState = {}) {
  if (!target || typeof target !== "object") {
    return null;
  }
  // 这里只做纯 runtimeState 字段提交。
  // preCommit / postCommit 副作用由 scenario_apply_pipeline.js 显式排序。
  // requiredKeys 用来锁住最低提交合同，避免 apply 流程看似成功，实际却漏掉关键 owner 字段。
  // 如果要扩展场景切换合同，应先补这里的 requiredKeys，再补 apply pipeline 的 staged builder。
  const requiredKeys = [
    "activeScenarioId",
    "scenarioBorderMode",
    "countryNames",
    "scenarioBaselineOwnersByFeatureId",
    "sovereigntyByFeatureId",
  ];
  requiredKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(nextState, key)) {
      throw new Error(`[scenario_runtime_state] commitScenarioActivationRuntimeState missing required key: ${key}`);
    }
  });
  target.scenarioParentBorderEnabledBeforeActivate =
    nextState.scenarioParentBorderEnabledBeforeActivate || null;
  target.scenarioDisplaySettingsBeforeActivate =
    nextState.scenarioDisplaySettingsBeforeActivate || null;
  target.scenarioOceanFillBeforeActivate = String(nextState.scenarioOceanFillBeforeActivate || "");
  target.activeScenarioId = String(nextState.activeScenarioId || "");
  target.scenarioBorderMode = String(nextState.scenarioBorderMode || "canonical");
  target.activeScenarioManifest = nextState.activeScenarioManifest || null;
  target.mapSemanticMode = String(nextState.mapSemanticMode || "");
  target.scenarioCountriesByTag = nextState.scenarioCountriesByTag || {};
  setHydratedScenarioRuntimeTopologyState(target, {
    runtimeTopologyData: nextState.scenarioRuntimeTopologyData || null,
    runtimePoliticalTopology: nextState.runtimePoliticalTopology || null,
    runtimePoliticalMetaSeed: nextState.runtimePoliticalMetaSeed || null,
    runtimePoliticalFeatureCollectionSeed: nextState.runtimePoliticalFeatureCollectionSeed || null,
    scenarioLandMaskData: nextState.scenarioLandMaskData || null,
    scenarioContextLandMaskData: nextState.scenarioContextLandMaskData || null,
    scenarioWaterRegionsData: nextState.scenarioWaterRegionsData || null,
    scenarioAtlantropaData: nextState.scenarioAtlantropaData || null,
    scenarioRuntimeTopologyVersionTag: nextState.scenarioRuntimeTopologyVersionTag || "",
    scenarioLandMaskVersionTag: nextState.scenarioLandMaskVersionTag || "",
    scenarioContextLandMaskVersionTag: nextState.scenarioContextLandMaskVersionTag || "",
    scenarioWaterOverlayVersionTag: nextState.scenarioWaterOverlayVersionTag || "",
    scenarioSpecialRegionsData: nextState.scenarioSpecialRegionsData || null,
  });
  setScenarioRuntimeOptionalLayerState(target, {
    activeScenarioMeshPack: nextState.activeScenarioMeshPack || null,
    scenarioPoliticalChunkData: nextState.scenarioPoliticalChunkData || null,
    scenarioPoliticalVisibleChunkData: nextState.scenarioPoliticalVisibleChunkData || null,
    scenarioAtlantropaData: nextState.scenarioAtlantropaData || null,
    scenarioDistrictGroupsData: nextState.scenarioDistrictGroupsData || null,
    scenarioDistrictGroupByFeatureId: nextState.scenarioDistrictGroupByFeatureId,
    scenarioReliefOverlaysData: nextState.scenarioReliefOverlaysData || null,
  });
  target.scenarioReliefOverlayRevision = Number(nextState.scenarioReliefOverlayRevision) || 0;
  target.releasableCatalog = nextState.releasableCatalog || null;
  target.scenarioReleasableIndex = nextState.scenarioReleasableIndex || null;
  target.scenarioAudit = nextState.scenarioAudit || null;
  setScenarioImportAudit(target, nextState.scenarioImportAudit || null);
  target.scenarioBaselineHash = String(nextState.scenarioBaselineHash || "");
  target.scenarioBaselineOwnersByFeatureId = { ...(nextState.scenarioBaselineOwnersByFeatureId || {}) };
  target.scenarioAutoShellOwnerByFeatureId = { ...(nextState.scenarioAutoShellOwnerByFeatureId || {}) };
  target.scenarioBaselineCoresByFeatureId = { ...(nextState.scenarioBaselineCoresByFeatureId || {}) };
  target.scenarioShellOverlayRevision = Number(nextState.scenarioShellOverlayRevision) || 0;
  target.countryNames = { ...(nextState.countryNames || {}) };
  target.sovereigntyByFeatureId = { ...(nextState.sovereigntyByFeatureId || {}) };
  target.sovereigntyInitialized = !!nextState.sovereigntyInitialized;
  target.visualOverrides = { ...(nextState.visualOverrides || {}) };
  target.featureOverrides = { ...(nextState.featureOverrides || {}) };
  target.scenarioGeneratedColorTags = Array.isArray(nextState.scenarioGeneratedColorTags)
    ? [...nextState.scenarioGeneratedColorTags]
    : [];
  target.scenarioFixedOwnerColors = { ...(nextState.scenarioFixedOwnerColors || {}) };
  target.sovereignBaseColors = { ...(nextState.sovereignBaseColors || {}) };
  target.countryBaseColors = { ...(nextState.countryBaseColors || {}) };
  target.activeSovereignCode = String(nextState.activeSovereignCode || "");
  target.selectedWaterRegionId = String(nextState.selectedWaterRegionId || "");
  target.selectedSpecialRegionId = String(nextState.selectedSpecialRegionId || "");
  target.hoveredWaterRegionId = nextState.hoveredWaterRegionId ?? null;
  target.hoveredSpecialRegionId = nextState.hoveredSpecialRegionId ?? null;
  return target;
}

export function setScenarioHydrationHealthGateState(target, nextState = {}) {
  if (!target || typeof target !== "object") {
    return createDefaultScenarioHydrationHealthGate();
  }
  const gateState = {
    ...createDefaultScenarioHydrationHealthGate(),
    ...(
      nextState && typeof nextState === "object"
        ? nextState
        : {}
    ),
  };
  gateState.status = String(gateState.status || "idle");
  gateState.reason = String(gateState.reason || "");
  gateState.checkedAt = Number(gateState.checkedAt) || Date.now();
  gateState.attemptedRetry = !!gateState.attemptedRetry;
  gateState.ownerFeatureOverlapRatio = Number(gateState.ownerFeatureOverlapRatio);
  gateState.ownerFeatureOverlapRatio = Number.isFinite(gateState.ownerFeatureOverlapRatio)
    ? gateState.ownerFeatureOverlapRatio
    : 1;
  gateState.ownerFeatureOverlapCount = Number(gateState.ownerFeatureOverlapCount);
  gateState.ownerFeatureOverlapCount = Number.isFinite(gateState.ownerFeatureOverlapCount)
    ? gateState.ownerFeatureOverlapCount
    : 0;
  gateState.ownerFeatureRenderedCount = Number(gateState.ownerFeatureRenderedCount);
  gateState.ownerFeatureRenderedCount = Number.isFinite(gateState.ownerFeatureRenderedCount)
    ? gateState.ownerFeatureRenderedCount
    : 0;
  gateState.degradedWaterOverlay = !!gateState.degradedWaterOverlay;
  target.scenarioHydrationHealthGate = gateState;
  return target.scenarioHydrationHealthGate;
}

export function resetScenarioHydrationOverlayState(target) {
  if (!target || typeof target !== "object") {
    return false;
  }
  const hadScenarioOverlay =
    !!target.scenarioWaterRegionsData
    || !!target.scenarioAtlantropaData
    || !!target.scenarioLandMaskData
    || !!target.scenarioContextLandMaskData;
  target.scenarioWaterRegionsData = null;
  target.scenarioAtlantropaData = null;
  target.scenarioWaterOverlayVersionTag = "";
  target.scenarioLandMaskData = null;
  target.scenarioContextLandMaskData = null;
  target.scenarioLandMaskVersionTag = "";
  target.scenarioContextLandMaskVersionTag = "";
  return hadScenarioOverlay;
}

export function createDefaultScenarioRuntimeState({
  scenarioId = "",
  detailMinRatio = 0.7,
} = {}) {
  const normalizedScenarioId = String(scenarioId || "").trim();
  // 这里是 scenario runtime 的 canonical shape。
  // apply/chunk/hydration/overlay 各条路径都应该在这里补字段，再由 facade 或 owner helper 暴露出去。
  return {
    scenarioRegistry: null,
    scenarioBundleCacheById: {},
    activeScenarioChunks: createDefaultActiveScenarioChunksState(normalizedScenarioId),
    runtimeChunkLoadState: createDefaultRuntimeChunkLoadState({ scenarioId: normalizedScenarioId }),
    activeScenarioId: normalizedScenarioId,
    scenarioBorderMode: "canonical",
    activeScenarioManifest: null,
    scenarioCountriesByTag: {},
    scenarioFixedOwnerColors: {},
    scenarioGeneratedColorTags: [],
    scenarioBaselineHash: "",
    scenarioBaselineOwnersByFeatureId: {},
    scenarioAutoShellOwnerByFeatureId: {},
    scenarioShellOverlayRevision: 0,
    scenarioBaselineCoresByFeatureId: {},
    scenarioReliefOverlayRevision: 0,
    scenarioParentBorderEnabledBeforeActivate: null,
    scenarioPaintModeBeforeActivate: null,
    scenarioOceanFillBeforeActivate: null,
    scenarioOceanStyleBeforeActivate: null,
    scenarioDisplaySettingsBeforeActivate: null,
    activeScenarioPerformanceHints: null,
    activeScenarioMeshPack: null,
    scenarioWaterRegionsData: null,
    scenarioAtlantropaData: null,
    scenarioWaterOverlayVersionTag: "",
    scenarioSpecialRegionsData: null,
    scenarioRuntimeTopologyData: null,
    scenarioRuntimeTopologyVersionTag: "",
    scenarioPoliticalChunkData: null,
    scenarioPoliticalVisibleChunkData: null,
    scenarioLandMaskData: null,
    scenarioContextLandMaskData: null,
    scenarioLandMaskVersionTag: "",
    scenarioContextLandMaskVersionTag: "",
    scenarioReliefOverlaysData: null,
    scenarioBathymetryTopologyData: null,
    scenarioBathymetryBandsData: null,
    scenarioBathymetryContoursData: null,
    scenarioBathymetryTopologyUrl: "",
    scenarioDistrictGroupsData: null,
    scenarioDistrictGroupByFeatureId: new Map(),
    scenarioDistrictSharedTemplatesData: null,
    scenarioGeoLocalePatchData: null,
    scenarioCityOverridesData: null,
    scenarioImportAudit: null,
    scenarioDataHealth: createDefaultScenarioDataHealth(detailMinRatio),
    scenarioHydrationHealthGate: createDefaultScenarioHydrationHealthGate(),
  };
}
