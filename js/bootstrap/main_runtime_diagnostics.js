function isObjectRecord(value) {
  return value !== null && typeof value === "object";
}

export function cloneSnapshotValue(value, fallback = null) {
  if (value === undefined) return fallback;
  if (typeof globalThis.structuredClone === "function") {
    try {
      return globalThis.structuredClone(value);
    } catch (_error) {
      // Fall through to JSON clone.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return fallback;
  }
}

export function buildMainRuntimeLoadStatusSnapshot(targetState) {
  const state = isObjectRecord(targetState) ? targetState : {};
  const chunkLoadState = state.runtimeChunkLoadState && typeof state.runtimeChunkLoadState === "object"
    ? state.runtimeChunkLoadState
    : {};
  // This snapshot is consumed by diagnostics panels and external probes; keep it serializable.
  return {
    boot: {
      phase: String(state.bootPhase || ""),
      interactionMode: String(state.startupInteractionMode || ""),
      blocking: state.bootBlocking === false ? false : !!state.bootBlocking,
      readonly: !!state.startupReadonly,
      readonlyUnlockInFlight: !!state.startupReadonlyUnlockInFlight,
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
      error: String(state.bootError || ""),
      bootProgressPhase: String(state.bootProgressPhase || ""),
    },
    startup: {
      activeScenarioId: String(state.activeScenarioId || ""),
      topologyBundleMode: String(state.topologyBundleMode || "single"),
      detailDeferred: !!state.detailDeferred,
      detailPromotionCompleted: !!state.detailPromotionCompleted,
      startupBootCacheState: cloneSnapshotValue(state.startupBootCacheState, {}),
    },
    contextLayers: {
      loadStateByName: cloneSnapshotValue(state.contextLayerLoadStateByName, {}),
      deferredStatusByName: cloneSnapshotValue(state.contextLayerDeferredStatusByName, {}),
    },
    chunkRuntime: {
      shellStatus: String(chunkLoadState.shellStatus || ""),
      selectionVersion: Number(chunkLoadState.selectionVersion || 0),
      pendingReason: String(chunkLoadState.pendingReason || ""),
      pendingPromotion: !!chunkLoadState.pendingPromotion,
      pendingVisualPromotion: !!chunkLoadState.pendingVisualPromotion,
      pendingInfraPromotion: !!chunkLoadState.pendingInfraPromotion,
      promotionScheduled: !!chunkLoadState.promotionScheduled,
      refreshScheduled: !!chunkLoadState.refreshScheduled,
      promotionCommitInFlight: !!chunkLoadState.promotionCommitInFlight,
      errorByChunkId: cloneSnapshotValue(chunkLoadState.errorByChunkId, {}),
      inFlightByChunkId: cloneSnapshotValue(chunkLoadState.inFlightByChunkId, {}),
    },
    postReadyScheduler: cloneSnapshotValue(state.postReadyTaskDiagnostics, {}),
  };
}

export function buildMainRuntimeVersionSnapshot(targetState, { appSchemaVersion = 1 } = {}) {
  const state = isObjectRecord(targetState) ? targetState : {};
  return {
    appSchemaVersion,
    activeScenarioId: String(state.activeScenarioId || ""),
    bootPhase: String(state.bootPhase || ""),
    topologyBundleMode: String(state.topologyBundleMode || "single"),
  };
}

export function registerMainRuntimeDiagnostics({
  targetState,
  registerSnapshotProvider,
  appSchemaVersion = 1,
} = {}) {
  if (!isObjectRecord(targetState)) {
    throw new TypeError("registerMainRuntimeDiagnostics requires targetState to be an object.");
  }
  if (typeof registerSnapshotProvider !== "function") {
    throw new TypeError("registerMainRuntimeDiagnostics requires registerSnapshotProvider to be a function.");
  }

  registerSnapshotProvider(
    "loadStatus",
    "main_runtime",
    () => buildMainRuntimeLoadStatusSnapshot(targetState),
  );
  registerSnapshotProvider(
    "version",
    "main_runtime",
    () => buildMainRuntimeVersionSnapshot(targetState, { appSchemaVersion }),
  );

  return {
    buildLoadStatusSnapshot: () => buildMainRuntimeLoadStatusSnapshot(targetState),
    buildVersionSnapshot: () => buildMainRuntimeVersionSnapshot(targetState, { appSchemaVersion }),
  };
}
