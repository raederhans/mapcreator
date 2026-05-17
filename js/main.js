// App entry point (Phase 13)
import { normalizeCityLayerStyleConfig, state as runtimeState } from "./core/state.js";
import "./core/data_service.js";
import {
  setBootPreviewVisibleState,
  setStartupInteractionMode,
} from "./core/state/boot_state.js";
import { createStartupBootOverlayController } from "./bootstrap/startup_boot_overlay.js";
import { createStartupDataPipelineOwner } from "./bootstrap/startup_data_pipeline.js";
import { createDeferredDetailPromotionOwner } from "./bootstrap/deferred_detail_promotion.js";
import { createStartupScenarioBootOwner } from "./bootstrap/startup_scenario_boot.js";
import {
  createRenderDispatcher,
  getBootLanguage,
  hydrateLanguage,
  initLongAnimationFrameObserver,
  normalizeBatchFillScopes,
  persistViewSettings,
  postStartupSupportKeyUsageReport,
  warnOnStartupBundleIntegrity,
} from "./bootstrap/startup_bootstrap_support.js";
import {
  buildInteractionInfrastructureAfterStartup,
  initMap,
  invalidateAllRenderPasses,
  invalidateContextLayerVisualStateBatch,
  reconcileDetailPromotionPoliticalPass,
  setMapData,
  render,
} from "./core/map_renderer/public.js";
import { bindRenderBoundary, flushRenderBoundary, markRenderBoundaryFlushed, requestRender } from "./core/render_boundary.js";
import { registerRuntimeHook } from "./core/state/index.js";
import { initPresetState } from "./core/preset_state.js";
import { runPostScenarioUiReplay } from "./core/scenario_post_apply_effects.js";
import { registerMapcreatorSnapshotProvider } from "./core/mapcreator_snapshot.js";
import { initTranslations } from "./ui/i18n.js";
import { initToast } from "./ui/toast.js";
import { bindBeforeUnload } from "./core/dirty_state.js";
const state = runtimeState;

function cloneSnapshotValue(value, fallback = null) {
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

function buildMainRuntimeLoadStatusSnapshot() {
  const chunkLoadState = state.runtimeChunkLoadState && typeof state.runtimeChunkLoadState === "object"
    ? state.runtimeChunkLoadState
    : {};
  return {
    boot: {
      phase: String(state.bootPhase || ""),
      interactionMode: String(state.startupInteractionMode || ""),
      readonly: !!state.startupReadonly,
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

registerMapcreatorSnapshotProvider("loadStatus", "main_runtime", buildMainRuntimeLoadStatusSnapshot);
registerMapcreatorSnapshotProvider("version", "main_runtime", () => ({
  appSchemaVersion: 1,
  activeScenarioId: String(state.activeScenarioId || ""),
  bootPhase: String(state.bootPhase || ""),
  topologyBundleMode: String(state.topologyBundleMode || "single"),
}));

function requestMainRender(reason = "", { flush = false } = {}) {
  return flush ? flushRenderBoundary(reason) : requestRender(reason);
}

let milsymbolLoadPromise = null;
let deferredUiBootstrapPromise = null;
let postReadyContextWarmupScheduled = false;
let postReadyHydrationScheduled = false;
let postReadyTaskHandles = new Map();
let postReadyTaskDiagnostics = new Map();
let postReadyTaskEpoch = 0;
const POST_READY_IDLE_QUIET_MS = 850;
const POST_READY_IDLE_TIME_REMAINING_MS = 8;

function nowMs() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

const bootOverlayController = createStartupBootOverlayController();
const {
  checkpointBootMetric,
  checkpointBootMetricOnce,
  completeBootSequenceLogging,
  finishBootMetric,
  getBootProgressWindow,
  hasStartupReadonlyUnlockScheduled,
  initializeBootOverlay,
  resetBootMetrics,
  resolveStartupInteractionMode,
  scheduleStartupReadonlyUnlockTimer,
  setBootContinueHandler,
  setBootPreviewVisible,
  setBootState,
  setStartupReadonlyState,
  startBootMetric,
} = bootOverlayController;
registerRuntimeHook(state, "setStartupReadonlyStateFn", setStartupReadonlyState);
let startupDataPipelineOwner = null;
let deferredDetailPromotionOwner = null;
let startupScenarioBootOwner = null;

/**
 * Startup owner boundaries:
 * 1) StartupDataPipelineOwner: drives bootstrap data ingestion and base-state hydration.
 * 2) StartupScenarioBootOwner: applies the startup scenario bundle onto hydrated base runtimeState.
 * 3) DeferredDetailPromotionOwner: promotes delayed detail topology and unlocks interaction readiness.
 */
function getStartupDataPipelineOwner() {
  if (startupDataPipelineOwner) {
    return startupDataPipelineOwner;
  }
  startupDataPipelineOwner = createStartupDataPipelineOwner({
    state,
    helpers: {
      checkpointBootMetric,
      finishBootMetric,
      invalidateContextLayerVisualStateBatch,
      requestMainRender,
      startBootMetric,
    },
  });
  return startupDataPipelineOwner;
}

function getStartupScenarioBootOwner() {
  if (startupScenarioBootOwner) {
    return startupScenarioBootOwner;
  }
  startupScenarioBootOwner = createStartupScenarioBootOwner({
    runtimeState: state,
    helpers: {
      finishBootMetric,
      setBootState,
      startBootMetric,
      warnOnStartupBundleIntegrity,
    },
  });
  return startupScenarioBootOwner;
}

function getDeferredDetailPromotionOwner() {
  if (deferredDetailPromotionOwner) {
    return deferredDetailPromotionOwner;
  }
  deferredDetailPromotionOwner = createDeferredDetailPromotionOwner({
    runtimeState: state,
    helpers: {
      canRunPostReadyIdleWork,
      checkpointBootMetric,
      completeBootSequenceLogging,
      finishBootMetric,
      flushPendingScenarioChunkRefreshAfterReady,
      getBootProgressWindow,
      hasStartupReadonlyUnlockScheduled,
      requestMainRender,
      schedulePostReadyDeferredContextWarmup,
      schedulePostReadyHydration,
      schedulePostReadyPoliticalReconcile,
      schedulePostReadyVisualWarmup,
      scheduleStartupReadonlyUnlockTimer,
      setBootState,
      setStartupReadonlyState,
      startBootMetric,
      startDeferredFullInteractionInfrastructureBuild,
      warnOnStartupBundleIntegrity,
    },
  });
  return deferredDetailPromotionOwner;
}

function yieldToMain() {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
}

function loadDeferredMilsymbol() {
  if (globalThis.ms?.Symbol) {
    return Promise.resolve(true);
  }
  if (milsymbolLoadPromise) {
    return milsymbolLoadPromise;
  }
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  const existingScript = Array.from(document.scripts || []).find((script) => (
    String(script?.src || "").endsWith("/vendor/milsymbol.js")
    || String(script?.getAttribute?.("src") || "").trim() === "vendor/milsymbol.js"
  ));
  if (existingScript) {
    milsymbolLoadPromise = new Promise((resolve) => {
      const finalize = (loaded) => resolve(loaded && !!globalThis.ms?.Symbol);
      existingScript.addEventListener("load", () => finalize(true), { once: true });
      existingScript.addEventListener("error", () => finalize(false), { once: true });
      if (globalThis.ms?.Symbol) {
        finalize(true);
      }
    });
    return milsymbolLoadPromise;
  }

  milsymbolLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "vendor/milsymbol.js";
    script.async = true;
    script.onload = () => resolve(!!globalThis.ms?.Symbol);
    script.onerror = () => {
      console.warn("[boot] Failed to load deferred milsymbol renderer.");
      resolve(false);
    };
    document.body?.appendChild(script);
  });
  return milsymbolLoadPromise;
}

function bootstrapDeferredUi(renderApp) {
  if (deferredUiBootstrapPromise) {
    return deferredUiBootstrapPromise;
  }
  deferredUiBootstrapPromise = (async () => {
    const [
      { initToolbar },
      { initSidebar },
      { initScenarioControls },
      { initShortcuts },
    ] = await Promise.all([
      import("./ui/toolbar.js"),
      import("./ui/sidebar.js"),
      import("./ui/scenario_controls.js"),
      import("./ui/shortcuts.js"),
    ]);
    await yieldToMain();
    initToolbar({ render: renderApp });
    await yieldToMain();
    initSidebar({ render: renderApp });
    await yieldToMain();
    initScenarioControls();
    initTranslations();
    initShortcuts();
    return true;
  })();
  return deferredUiBootstrapPromise;
}

async function rollbackStartupScenarioToBaseMap() {
  // 启动失败后的“继续进入基础地图”只负责撤销已激活场景；完整回滚仍由 scenario_manager 的 clear/apply 链路持有。
  if (!String(runtimeState.activeScenarioId || "").trim()) {
    return false;
  }
  const { clearActiveScenario } = await import("./core/scenario_manager.js");
  return !!clearActiveScenario({
    renderNow: false,
    markDirtyReason: "",
    showToastOnComplete: false,
    allowDuringBootBlocking: true,
  });
}

async function ensureBaseCityDataReady({ reason = "manual", renderNow = true } = {}) {
  return getStartupDataPipelineOwner().ensureBaseCityDataReady({ reason, renderNow });
}

async function ensureFullLocalizationDataReady({ reason = "post-ready", renderNow = true } = {}) {
  return getStartupDataPipelineOwner().ensureFullLocalizationDataReady({ reason, renderNow });
}

registerRuntimeHook(state, "ensureFullLocalizationDataReadyFn", ensureFullLocalizationDataReady);

async function ensureActiveScenarioBundleHydrated({ reason = "post-ready", renderNow = true } = {}) {
  return getStartupDataPipelineOwner().ensureActiveScenarioBundleHydrated({ reason, renderNow });
}

function shouldFastTrackScenarioHydration() {
  return getStartupDataPipelineOwner().shouldFastTrackScenarioHydration();
}

function schedulePostReadyHydration() {
  if (postReadyHydrationScheduled) {
    return;
  }
  postReadyHydrationScheduled = true;
  // ready 之后再补齐完整本地化与场景 bundle，保证首屏先可见；调度器负责等待交互空窗，避免和用户第一轮缩放抢主线程。
  schedulePostReadyTask("post-ready-localization-hydration", () => (
    ensureFullLocalizationDataReady({ reason: "post-ready-idle", renderNow: true }).catch((error) => {
      console.warn("[boot] Deferred full localization hydration failed during idle scheduling.", error);
      return null;
    })
  ), {
    timeout: 2200,
    delayMs: 1200,
    retryDelayMs: 600,
  });
  schedulePostReadyTask("post-ready-scenario-hydration", () => (
    ensureActiveScenarioBundleHydrated({ reason: "post-ready-idle", renderNow: true }).catch((error) => {
      console.warn("[boot] Deferred full scenario hydration failed during idle scheduling.", error);
      return null;
    })
  ), {
    timeout: 4800,
    delayMs: shouldFastTrackScenarioHydration() ? 300 : 4200,
    retryDelayMs: shouldFastTrackScenarioHydration() ? 450 : 900,
  });
}

const POST_READY_DETAIL_PROMOTION_POLITICAL_RECONCILE_TASK_KEY = "post-ready-detail-promotion-political-reconcile";

function schedulePostReadyPoliticalReconcileTask(reason = "detail-promotion-political-reconcile") {
  const normalizedReason = String(reason || "detail-promotion-political-reconcile").trim()
    || "detail-promotion-political-reconcile";
  schedulePostReadyTask(POST_READY_DETAIL_PROMOTION_POLITICAL_RECONCILE_TASK_KEY, () => {
    if (!runtimeState.detailPromotionCompleted) {
      schedulePostReadyPoliticalReconcileTask(normalizedReason);
      return false;
    }
    const requested = reconcileDetailPromotionPoliticalPass(normalizedReason);
    if (!requested) {
      schedulePostReadyPoliticalReconcileTask(normalizedReason);
    }
    return requested;
  }, {
    timeout: 1200,
    delayMs: 0,
    retryDelayMs: 320,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
  return true;
}

function schedulePostReadyPoliticalReconcile(reason = "detail-promotion-political-reconcile") {
  if (!runtimeState.detailPromotionCompleted) {
    return false;
  }
  return schedulePostReadyPoliticalReconcileTask(reason);
}

async function ensureContextLayerDataReady(
  requestedLayerNames,
  { reason = "manual", renderNow = true } = {}
) {
  return getStartupDataPipelineOwner().ensureContextLayerDataReady(requestedLayerNames, {
    reason,
    renderNow,
  });
}

function scheduleIdleTask(callback, { timeout = 1200, delayMs = 0 } = {}) {
  const run = () => {
    if (typeof globalThis.requestIdleCallback === "function") {
      globalThis.requestIdleCallback(() => {
        void callback();
      }, { timeout });
      return;
    }
    globalThis.setTimeout(() => {
      void callback();
    }, 0);
  };
  globalThis.setTimeout(run, Math.max(0, delayMs));
}

function flushPendingScenarioChunkRefreshAfterReady(reason = "post-ready") {
  if (typeof runtimeState.scheduleScenarioChunkRefreshFn !== "function") {
    return;
  }
  const loadState = runtimeState.runtimeChunkLoadState;
  const normalizedReason = String(reason || "post-ready").trim() || "post-ready";
  const shouldSeedFirstReadyFlush = !!(
    loadState
    && Number(loadState.selectionVersion || 0) <= 0
    && !String(loadState.pendingReason || "").trim()
    && !loadState.pendingPromotion
  );
  if (shouldSeedFirstReadyFlush) {
    // 首次 ready 可能早于 chunk runtime 的 selection 初始化；这里补一个显式 pending reason，让 chunk owner 统一执行 first-ready 刷新。
    loadState.pendingReason = normalizedReason;
    loadState.pendingDelayMs = 0;
  }
  runtimeState.scheduleScenarioChunkRefreshFn({
    reason: normalizedReason,
    delayMs: 0,
    flushPending: true,
  });
}

function scheduleReadyPostBootWork(renderDispatcher, reason = "ready-state") {
  // ready 是启动链的交接点：同步完成可交互指标与首轮 chunk flush；detail promotion 单独调度，交互基础设施和数据补水进入 post-ready 任务。
  checkpointBootMetric("time-to-interactive");
  checkpointBootMetric("first-interactive");
  completeBootSequenceLogging();
  flushPendingScenarioChunkRefreshAfterReady(reason);
  scheduleDeferredDetailPromotion(renderDispatcher);
  startDeferredFullInteractionInfrastructureBuild(reason);
  schedulePostReadyHydration();
  schedulePostReadyDeferredContextWarmup();
  schedulePostReadyVisualWarmup();
}

function startDeferredFullInteractionInfrastructureBuild(reason = "post-ready-full-interaction") {
  schedulePostReadyTask("post-ready-full-interaction-infra", () => {
    if (runtimeState.detailDeferred && !runtimeState.detailPromotionCompleted) {
      startDeferredFullInteractionInfrastructureBuild(`${reason}-after-detail`);
      return false;
    }
    return buildInteractionInfrastructureAfterStartup({
      chunked: true,
      buildHitCanvas: false,
      mode: "full",
    }).catch((error) => {
      console.warn(`[boot] Deferred full interaction infrastructure build failed. reason=${reason}`, error);
    });
  }, {
    timeout: 1200,
    delayMs: 180,
    retryDelayMs: 320,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
}

function clearPostReadyTaskHandle(handle) {
  if (!handle) return;
  if (handle.type === "idle" && typeof globalThis.cancelIdleCallback === "function") {
    globalThis.cancelIdleCallback(handle.id);
    return;
  }
  if (handle.type === "raf" && typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle.id);
    return;
  }
  globalThis.clearTimeout?.(handle.id);
}

function clearScheduledPostReadyTask(taskKey) {
  const handle = postReadyTaskHandles.get(taskKey);
  if (handle) {
    clearPostReadyTaskHandle(handle);
  }
  postReadyTaskHandles.delete(taskKey);
  postReadyTaskDiagnostics.delete(taskKey);
  updatePostReadySchedulerDiagnostics({ lastBlockedReason: "cleared", taskKey });
}

function clearAllScheduledPostReadyTasks() {
  postReadyTaskHandles.forEach((handle) => {
    clearPostReadyTaskHandle(handle);
  });
  postReadyTaskHandles.clear();
  postReadyTaskDiagnostics.clear();
  updatePostReadySchedulerDiagnostics({ lastBlockedReason: "cleared-all" });
}

function resolvePostReadyIdleBlockReason({
  quietMs = POST_READY_IDLE_QUIET_MS,
  allowChunkBacklog = false,
} = {}) {
  const phaseEnteredAt = Number(runtimeState.phaseEnteredAt || 0);
  const zoomEndedAt = Number(runtimeState.zoomGestureEndedAt || 0);
  const currentMs = nowMs();
  const idleForMs = phaseEnteredAt > 0 ? currentMs - phaseEnteredAt : Number.POSITIVE_INFINITY;
  const zoomQuietForMs = zoomEndedAt > 0 ? currentMs - zoomEndedAt : Number.POSITIVE_INFINITY;
  const requiredQuietMs = Math.max(0, Number(quietMs) || 0);
  if (runtimeState.bootBlocking) return "boot-blocking";
  if (runtimeState.scenarioApplyInFlight) return "scenario-apply-in-flight";
  if (runtimeState.startupReadonly) return "startup-readonly";
  if (runtimeState.startupReadonlyUnlockInFlight) return "startup-readonly-unlock";
  if (runtimeState.deferExactAfterSettle) return "defer-exact-after-settle";
  if (!allowChunkBacklog && runtimeState.runtimeChunkLoadState?.promotionCommitInFlight) return "chunk-promotion-commit-in-flight";
  if (!allowChunkBacklog && runtimeState.runtimeChunkLoadState?.pendingVisualPromotion) return "chunk-visual-promotion";
  if (!allowChunkBacklog && runtimeState.runtimeChunkLoadState?.pendingPromotion) return "chunk-promotion";
  if (!allowChunkBacklog && runtimeState.runtimeChunkLoadState?.pendingInfraPromotion) return "chunk-infra-promotion";
  if (runtimeState.hitCanvasBuildScheduled) return "hit-canvas-build-scheduled";
  if (runtimeState.interactionInfrastructureBuildInFlight) return "interaction-infra-in-flight";
  if (runtimeState.activeInteractionRecoveryTaskKey) return "interaction-recovery-task";
  if (runtimeState.isInteracting) return "interacting";
  if (String(runtimeState.renderPhase || "idle") !== "idle") return "render-non-idle";
  if (idleForMs < requiredQuietMs) return "phase-quiet-window";
  if (zoomQuietForMs < requiredQuietMs) return "zoom-quiet-window";
  return "ready";
}

function updatePostReadySchedulerDiagnostics({
  taskKey = "",
  lastBlockedReason = "",
  lastScheduledTaskKey = "",
  lastStartedTaskKey = "",
  lastFinishedTaskKey = "",
} = {}) {
  const currentMs = nowMs();
  const pendingEntries = [...postReadyTaskDiagnostics.entries()];
  const pendingTaskKeys = [...postReadyTaskHandles.keys()].sort();
  const maxPendingAgeMs = pendingEntries.reduce((maxAge, [_key, entry]) => (
    Math.max(maxAge, Math.max(0, currentMs - Number(entry.firstScheduledAt || currentMs)))
  ), 0);
  const maxRetryCount = pendingEntries.reduce((maxRetry, [_key, entry]) => (
    Math.max(maxRetry, Number(entry.retryCount || 0))
  ), 0);
  runtimeState.postReadyTaskDiagnostics = {
    activeTaskKey: String(runtimeState.activePostReadyTaskKey || ""),
    activeTaskAgeMs: runtimeState.activePostReadyTaskStartedAt
      ? Math.max(0, currentMs - Number(runtimeState.activePostReadyTaskStartedAt || 0))
      : 0,
    pendingTaskKeys,
    pendingTaskCount: pendingTaskKeys.length,
    lastBlockedReason: String(lastBlockedReason || runtimeState.postReadyTaskDiagnostics?.lastBlockedReason || ""),
    lastTaskKey: String(taskKey || ""),
    lastScheduledTaskKey: String(lastScheduledTaskKey || runtimeState.postReadyTaskDiagnostics?.lastScheduledTaskKey || ""),
    lastStartedTaskKey: String(lastStartedTaskKey || runtimeState.postReadyTaskDiagnostics?.lastStartedTaskKey || ""),
    lastFinishedTaskKey: String(lastFinishedTaskKey || runtimeState.postReadyTaskDiagnostics?.lastFinishedTaskKey || ""),
    maxPendingAgeMs,
    maxRetryCount,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
    minIdleTimeRemainingMs: POST_READY_IDLE_TIME_REMAINING_MS,
    reasonStateHint: {
      renderPhase: String(runtimeState.renderPhase || ""),
      isInteracting: !!runtimeState.isInteracting,
      deferExactAfterSettle: !!runtimeState.deferExactAfterSettle,
      interactionInfrastructureBuildInFlight: !!runtimeState.interactionInfrastructureBuildInFlight,
      activeInteractionRecoveryTaskKey: String(runtimeState.activeInteractionRecoveryTaskKey || ""),
      hitCanvasBuildScheduled: !!runtimeState.hitCanvasBuildScheduled,
      chunkShellStatus: String(runtimeState.runtimeChunkLoadState?.shellStatus || ""),
      hasPendingChunkVisualPromotion: !!runtimeState.runtimeChunkLoadState?.pendingVisualPromotion,
      hasPendingChunkPromotion: !!runtimeState.runtimeChunkLoadState?.pendingPromotion,
      hasPendingChunkInfraPromotion: !!runtimeState.runtimeChunkLoadState?.pendingInfraPromotion,
    },
    recordedAt: Date.now(),
  };
  runtimeState.renderPerfMetrics = runtimeState.renderPerfMetrics && typeof runtimeState.renderPerfMetrics === "object"
    ? runtimeState.renderPerfMetrics
    : {};
  runtimeState.renderPerfMetrics.postReadySchedulerState = { ...runtimeState.postReadyTaskDiagnostics };
  globalThis.__renderPerfMetrics = runtimeState.renderPerfMetrics;
  return runtimeState.postReadyTaskDiagnostics;
}

function markPostReadyTaskRetry(taskKey, reason) {
  const entry = postReadyTaskDiagnostics.get(taskKey);
  if (entry) {
    entry.retryCount = Math.max(0, Number(entry.retryCount || 0) + 1);
    entry.lastRetryAt = nowMs();
    entry.lastBlockedReason = String(reason || "");
  }
  updatePostReadySchedulerDiagnostics({ taskKey, lastBlockedReason: reason });
}

function canRunPostReadyIdleWork({
  quietMs = POST_READY_IDLE_QUIET_MS,
  allowChunkBacklog = false,
} = {}) {
  return resolvePostReadyIdleBlockReason({ quietMs, allowChunkBacklog }) === "ready";
}

function runPostReadyTaskCallback(taskKey, callback) {
  runtimeState.activePostReadyTaskKey = taskKey;
  runtimeState.activePostReadyTaskStartedAt = nowMs();
  postReadyTaskDiagnostics.delete(taskKey);
  updatePostReadySchedulerDiagnostics({ taskKey, lastStartedTaskKey: taskKey });

  const clearActivePostReadyTask = () => {
    if (runtimeState.activePostReadyTaskKey === taskKey) {
      runtimeState.activePostReadyTaskKey = "";
      runtimeState.activePostReadyTaskStartedAt = 0;
    }
    updatePostReadySchedulerDiagnostics({ taskKey, lastFinishedTaskKey: taskKey });
  };

  try {
    Promise.resolve(callback())
      .catch((error) => {
        console.warn(`[boot] Post-ready task failed. task=${taskKey}`, error);
      })
      .finally(clearActivePostReadyTask);
  } catch (error) {
    console.warn(`[boot] Post-ready task failed. task=${taskKey}`, error);
    clearActivePostReadyTask();
  }
}

function reschedulePostReadyTask(normalizedTaskKey, callback, {
  timeout,
  retryDelayMs,
  idleQuietMs,
  minIdleTimeRemainingMs,
} = {}) {
  schedulePostReadyTask(normalizedTaskKey, callback, {
    timeout,
    delayMs: retryDelayMs,
    retryDelayMs,
    idleQuietMs,
    minIdleTimeRemainingMs,
  });
}

function schedulePostReadyTask(
  taskKey,
  callback,
  {
    timeout = 1200,
    delayMs = 0,
    retryDelayMs = 320,
    idleQuietMs = POST_READY_IDLE_QUIET_MS,
    minIdleTimeRemainingMs = POST_READY_IDLE_TIME_REMAINING_MS,
  } = {}
) {
  const normalizedTaskKey = String(taskKey || "").trim();
  if (!normalizedTaskKey) return;
  const previousDiagnostic = postReadyTaskDiagnostics.get(normalizedTaskKey);
  clearScheduledPostReadyTask(normalizedTaskKey);
  postReadyTaskDiagnostics.set(normalizedTaskKey, {
    firstScheduledAt: Number(previousDiagnostic?.firstScheduledAt || 0) || nowMs(),
    lastScheduledAt: nowMs(),
    retryCount: Math.max(0, Number(previousDiagnostic?.retryCount || 0)),
    timeout,
    retryDelayMs,
    idleQuietMs,
    minIdleTimeRemainingMs,
  });
  updatePostReadySchedulerDiagnostics({
    taskKey: normalizedTaskKey,
    lastScheduledTaskKey: normalizedTaskKey,
  });
  const scheduledEpoch = postReadyTaskEpoch;

  const runWhenIdle = () => {
    if (scheduledEpoch !== postReadyTaskEpoch) {
      clearScheduledPostReadyTask(normalizedTaskKey);
      return;
    }
    const blockReason = runtimeState.activePostReadyTaskKey
      ? "active-task"
      : resolvePostReadyIdleBlockReason({ quietMs: idleQuietMs });
    if (blockReason !== "ready") {
      markPostReadyTaskRetry(normalizedTaskKey, blockReason);
      const retryId = globalThis.setTimeout(runWhenIdle, Math.max(120, retryDelayMs));
      postReadyTaskHandles.set(normalizedTaskKey, { type: "timeout", id: retryId });
      return;
    }
    if (typeof globalThis.requestIdleCallback === "function") {
      const idleId = globalThis.requestIdleCallback((deadline) => {
        postReadyTaskHandles.delete(normalizedTaskKey);
        if (scheduledEpoch !== postReadyTaskEpoch) {
          return;
        }
        const remainingMs = typeof deadline?.timeRemaining === "function"
          ? Number(deadline.timeRemaining())
          : Number.POSITIVE_INFINITY;
        if (!deadline?.didTimeout && remainingMs < minIdleTimeRemainingMs) {
          markPostReadyTaskRetry(normalizedTaskKey, "idle-time-remaining");
          reschedulePostReadyTask(normalizedTaskKey, callback, { timeout, retryDelayMs, idleQuietMs, minIdleTimeRemainingMs });
          return;
        }
        const idleBlockReason = runtimeState.activePostReadyTaskKey
          ? "active-task"
          : resolvePostReadyIdleBlockReason({ quietMs: idleQuietMs });
        if (idleBlockReason !== "ready") {
          markPostReadyTaskRetry(normalizedTaskKey, idleBlockReason);
          reschedulePostReadyTask(normalizedTaskKey, callback, { timeout, retryDelayMs, idleQuietMs, minIdleTimeRemainingMs });
          return;
        }
        runPostReadyTaskCallback(normalizedTaskKey, callback);
      }, { timeout });
      postReadyTaskHandles.set(normalizedTaskKey, { type: "idle", id: idleId });
      return;
    }
    const timeoutId = globalThis.setTimeout(() => {
      postReadyTaskHandles.delete(normalizedTaskKey);
      if (scheduledEpoch !== postReadyTaskEpoch) {
        return;
      }
      const timeoutBlockReason = runtimeState.activePostReadyTaskKey
        ? "active-task"
        : resolvePostReadyIdleBlockReason({ quietMs: idleQuietMs });
      if (timeoutBlockReason !== "ready") {
        markPostReadyTaskRetry(normalizedTaskKey, timeoutBlockReason);
        reschedulePostReadyTask(normalizedTaskKey, callback, { timeout, retryDelayMs, idleQuietMs, minIdleTimeRemainingMs });
        return;
      }
      runPostReadyTaskCallback(normalizedTaskKey, callback);
    }, 0);
    postReadyTaskHandles.set(normalizedTaskKey, { type: "timeout", id: timeoutId });
  };

  const startId = globalThis.setTimeout(runWhenIdle, Math.max(0, delayMs));
  postReadyTaskHandles.set(normalizedTaskKey, { type: "timeout", id: startId });
}

function schedulePostReadyVisualWarmup() {
  const textureMode = String(runtimeState.styleConfig?.texture?.mode || "none").trim().toLowerCase();
  const dayNightEnabled = !!runtimeState.styleConfig?.dayNight?.enabled;
  if (textureMode === "none" && !dayNightEnabled) {
    return;
  }
  schedulePostReadyTask("post-ready-visual-warmup", async () => {
    if (!runtimeState.bootBlocking) {
      requestMainRender("post-ready-visual-warmup");
    }
  }, {
    timeout: 1200,
    delayMs: 900,
    retryDelayMs: 320,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
}

function schedulePostReadyDeferredContextWarmup() {
  if (runtimeState.bootBlocking || postReadyContextWarmupScheduled) {
    return;
  }
  const requestedLayerNames = [];
  const requestedContourLayerNames = [];
  if (runtimeState.showRivers) {
    requestedLayerNames.push("rivers");
  }
  if (runtimeState.showUrban) {
    requestedLayerNames.push("urban");
  }
  if (runtimeState.showPhysical) {
    requestedLayerNames.push("physical-set");
    requestedContourLayerNames.push("physical-contours-set");
  }
  const shouldWarmCities =
    runtimeState.showCityPoints !== false
    && runtimeState.baseCityDataState === "idle"
    && typeof runtimeState.ensureBaseCityDataFn === "function";
  if (!requestedLayerNames.length && !shouldWarmCities) {
    return;
  }
  postReadyContextWarmupScheduled = true;
  schedulePostReadyTask("post-ready-context-warmup", async () => {
    if (runtimeState.bootBlocking) {
      return;
    }
    const tasks = [];
    if (requestedLayerNames.length) {
      tasks.push(ensureContextLayerDataReady(requestedLayerNames, {
        reason: "post-ready",
        renderNow: false,
      }));
    }
    if (shouldWarmCities && runtimeState.baseCityDataState === "idle" && typeof runtimeState.ensureBaseCityDataFn === "function") {
      tasks.push(runtimeState.ensureBaseCityDataFn({ reason: "post-ready", renderNow: false }));
    }
    await Promise.allSettled(tasks);
    requestMainRender("post-ready-context-warmup");
  }, {
    timeout: 1600,
    delayMs: 900,
    retryDelayMs: 420,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
  if (requestedContourLayerNames.length) {
    schedulePostReadyTask("post-ready-contour-warmup", async () => {
      if (runtimeState.bootBlocking) {
        return;
      }
      await ensureContextLayerDataReady(requestedContourLayerNames, {
        reason: "post-ready-contours",
        renderNow: false,
      });
      requestMainRender("post-ready-contours");
    }, {
      timeout: 1800,
      delayMs: 1400,
      retryDelayMs: 420,
      idleQuietMs: POST_READY_IDLE_QUIET_MS,
    });
  }
}

function schedulePostReadyCityWarmup() {
  if (
    runtimeState.bootBlocking
    || runtimeState.showCityPoints === false
    || runtimeState.baseCityDataState !== "idle"
    || typeof runtimeState.ensureBaseCityDataFn !== "function"
  ) {
    return;
  }
  const run = () => {
    if (runtimeState.bootBlocking || runtimeState.baseCityDataState !== "idle") {
      return;
    }
    void runtimeState.ensureBaseCityDataFn({ reason: "post-ready", renderNow: true }).catch(() => {});
  };
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(() => {
      run();
    }, { timeout: 2200 });
  } else {
    globalThis.setTimeout(run, 900);
  }
}

function hasDetailTopologyLoaded() {
  return getDeferredDetailPromotionOwner().hasDetailTopologyLoaded();
}

async function ensureDetailTopologyReady({
  renderDispatcher = null,
  requireIdle = false,
  applyMapData = true,
  suppressRender = false,
  interactionLevel = "full",
  deferInteractionInfrastructure = false,
  flushPendingFocusRefresh = true,
} = {}) {
  return getDeferredDetailPromotionOwner().ensureDetailTopologyReady({
    renderDispatcher,
    requireIdle,
    applyMapData,
    suppressRender,
    interactionLevel,
    deferInteractionInfrastructure,
    flushPendingFocusRefresh,
  });
}

async function unlockStartupReadonlyWithDetail(renderDispatcher) {
  return getDeferredDetailPromotionOwner().unlockStartupReadonlyWithDetail(renderDispatcher);
}

function scheduleStartupReadonlyUnlock(
  renderDispatcher,
  { delayMs = 120, attempt = 0, maxAttempts = 5 } = {},
) {
  return getDeferredDetailPromotionOwner().scheduleStartupReadonlyUnlock(renderDispatcher, {
    delayMs,
    attempt,
    maxAttempts,
  });
}

function scheduleDeferredDetailPromotion(renderDispatcher) {
  const deferredDetailPromotion = getDeferredDetailPromotionOwner();
  return deferredDetailPromotion.scheduleDeferredDetailPromotion(renderDispatcher);
}

async function finalizeReadyState(renderDispatcher) {
  // 只在这里决定进入 ready、readonly 等待 detail，或先建 coarse 交互层；上游 bootstrap 只提供当前场景和 renderDispatcher。
  const shouldEnterStartupReadonly = (
    !!String(runtimeState.activeScenarioId || "").trim()
    && runtimeState.startupInteractionMode === "readonly"
    && runtimeState.detailDeferred
    && !hasDetailTopologyLoaded()
  );
  const startupBootstrapStrategy = String(
    runtimeState.activeScenarioManifest?.startup_bootstrap_strategy || ""
  ).trim();
  const shouldUseChunkedCoarseStartup =
    shouldEnterStartupReadonly
    && startupBootstrapStrategy === "chunked-coarse-first";
  if (shouldUseChunkedCoarseStartup) {
    // chunked-coarse-first 已有可点击粗粒度政治层，先建 basic hit 基础设施再放行 ready，完整交互设施继续延后。
    setBootState("interaction-infra", {
      blocking: true,
      progress: Math.max(Number(runtimeState.bootProgress) || 0, getBootProgressWindow("detail-promotion").min),
      canContinueWithoutScenario: false,
    });
    startBootMetric("interaction-infra");
    await buildInteractionInfrastructureAfterStartup({
      chunked: true,
      buildHitCanvas: false,
      mode: "basic",
    });
    finishBootMetric("interaction-infra", {
      activeScenarioId: String(runtimeState.activeScenarioId || ""),
      startupBootstrapStrategy,
    });
    setStartupReadonlyState(false);
    setBootState("ready", {
      blocking: false,
      progress: 100,
      canContinueWithoutScenario: false,
    });
    scheduleReadyPostBootWork(renderDispatcher, "ready-state");
    return;
  }
  if (shouldEnterStartupReadonly) {
    // 非 chunked 的 deferred detail 需要维持启动遮罩和 readonly 状态，等待 detail promotion 解锁后再进入完整交互。
    setStartupReadonlyState(true, {
      reason: "detail-promotion",
      unlockInFlight: false,
    });
    setBootState("detail-promotion", {
      blocking: true,
      progress: Math.max(Number(runtimeState.bootProgress) || 0, getBootProgressWindow("detail-promotion").min),
      canContinueWithoutScenario: false,
    });
    scheduleStartupReadonlyUnlock(renderDispatcher);
    return;
  }
  setBootState("ready", {
    blocking: false,
    progress: 100,
    canContinueWithoutScenario: false,
  });
  scheduleReadyPostBootWork(renderDispatcher, "ready-state");
}

async function bootstrap() {
  initializeBootOverlay();
  if (!globalThis.d3 || !globalThis.topojson) {
    console.error("D3/topojson not loaded. Ensure scripts are included before main.js.");
    setBootState("error", {
      error: "D3/topojson not loaded. Ensure scripts are included before main.js.",
      canContinueWithoutScenario: false,
      progress: 0,
    });
    return;
  }

  hydrateLanguage();
  resetBootMetrics();
  setBootPreviewVisibleState(state, false);
  setBootState("shell", {
    progress: getBootProgressWindow("shell").min,
    canContinueWithoutScenario: false,
  });
  setBootContinueHandler(null);
  deferredUiBootstrapPromise = null;
  postReadyContextWarmupScheduled = false;
  postReadyHydrationScheduled = false;
  runtimeState.activePostReadyTaskKey = "";
  runtimeState.activePostReadyTaskStartedAt = 0;
  runtimeState.postReadyTaskDiagnostics = null;
  postReadyTaskDiagnostics.clear();
  postReadyTaskEpoch += 1;
  clearAllScheduledPostReadyTasks();
  setStartupInteractionMode(state, resolveStartupInteractionMode());
  setStartupReadonlyState(false);

  let renderDispatcher = null;
  let startupUiBootstrapPromise = null;
  let startupUiBootstrapAwaited = false;
  let startupUiBootstrapFailed = false;
  try {
    bindBeforeUnload();
    // Phase: 加载基础拓扑 | Input: 启动配置与 bootstrap 资源 promise | Output: startupBaseData + 已注入基础 state 字段。
    // 这一段只建立 base runtimeState 与启动 bundle promise，不应用场景；场景写入必须等 map shell 与 render boundary 建好之后执行。
    setBootState("base-data");
    startBootMetric("base-data");
    const d3Client = globalThis.d3;
    const startupDataPipeline = getStartupDataPipelineOwner();
    const {
      configuredDefaultScenarioId,
      registryDefaultScenarioIdPromise,
      requestedDefaultScenarioIdPromise,
      scenarioBundlePromise,
      startupBundleResultPromise,
    } = startupDataPipeline.resolveStartupScenarioBootstrap({ d3Client });
    const startupFallbackScenarioId = await requestedDefaultScenarioIdPromise;
    const startupBaseData = await startupDataPipeline.loadStartupBaseData({
      d3Client,
      startupBundleResultPromise,
      startupFallbackScenarioId,
    });
    startupDataPipeline.hydrateStartupBaseState({
      ensureBaseCityDataReadyFn: ensureBaseCityDataReady,
      ensureContextLayerDataReadyFn: ensureContextLayerDataReady,
      persistViewSettingsFn: persistViewSettings,
      startupBaseData,
    });
    startupDataPipeline.decodeStartupPrimaryCollections({
      resourceMetrics: startupBaseData.resourceMetrics || {},
      startupDecodedCollections: startupBaseData.startupDecodedCollections || null,
    });
    const registryDefaultScenarioId = configuredDefaultScenarioId
      ? configuredDefaultScenarioId
      : await registryDefaultScenarioIdPromise;
    if (configuredDefaultScenarioId && registryDefaultScenarioId !== configuredDefaultScenarioId) {
      console.warn(
        `[boot] Configured default scenario "${configuredDefaultScenarioId}" differs from registry default "${registryDefaultScenarioId}".`
      );
    }
    initLongAnimationFrameObserver();
    // Phase: 初始化地图骨架 | Input: startup interaction mode + 基础拓扑/语言状态 | Output: map shell + 首次渲染调度器。
    const startupInteractionLevel = runtimeState.startupInteractionMode === "readonly" ? "readonly-startup" : "full";
    initMap({
      suppressRender: true,
      interactionLevel: startupInteractionLevel,
      deferInteractionInfrastructure: startupInteractionLevel === "readonly-startup",
    });
    setMapData({
      suppressRender: true,
      interactionLevel: startupInteractionLevel,
      deferInteractionInfrastructure: startupInteractionLevel === "readonly-startup",
    });

    renderDispatcher = createRenderDispatcher(() => {
      try {
        render();
      } finally {
        markRenderBoundaryFlushed();
      }
    });
    const renderApp = () => {
      renderDispatcher.schedule();
    };
    globalThis.renderApp = renderApp;
    bindRenderBoundary({
      scheduleRender: () => renderDispatcher.schedule(),
      flushRender: () => renderDispatcher.flush(),
      ensureDetailTopology: (options = {}) =>
        ensureDetailTopologyReady({
          renderDispatcher,
          ...options,
        }),
    });
    const flushRenderNow = () => flushRenderBoundary("legacy-render-now");
    globalThis.renderNow = flushRenderNow;
    registerRuntimeHook(state, "renderNowFn", flushRenderNow);
    registerRuntimeHook(state, "ensureDetailTopologyFn", (options = {}) =>
      ensureDetailTopologyReady({
        renderDispatcher,
        ...options,
      }));

    initToast();
    setBootPreviewVisible(false);
    initPresetState();
    void loadDeferredMilsymbol();
    startupUiBootstrapPromise = bootstrapDeferredUi(renderApp);

    // Phase: 应用启动场景 | Input: scenarioBundlePromise + UI bootstrap promise | Output: active scenario state + source/recovery metadata。
    // UI bootstrap 与 scenario apply 并行启动，但 post-scenario UI replay 必须等 UI 绑定完成，避免控件用旧状态覆盖刚应用的场景。
    const startupScenarioBoot = getStartupScenarioBootOwner();
    const {
      defaultScenarioBundle,
      scenarioBundleSource,
    } = await startupScenarioBoot.runStartupScenarioBoot({
      d3Client,
      scenarioBundlePromise,
      startupInteractionMode: runtimeState.startupInteractionMode,
    });

    setBootState("warmup");
    invalidateAllRenderPasses("bootstrap-first-political-frame");
    renderDispatcher.flush();
    checkpointBootMetricOnce("first-visible");
    checkpointBootMetricOnce("first-visible-scenario");

    if (startupUiBootstrapPromise) {
      startupUiBootstrapAwaited = true;
      try {
        await startupUiBootstrapPromise;
      } catch (uiBootstrapError) {
        startupUiBootstrapFailed = true;
        throw uiBootstrapError;
      }
      runPostScenarioUiReplay({ full: true });
    }

    // Phase: 触发 detail promotion | Input: 当前 scenario/state/renderDispatcher | Output: ready state 或 readonly 解锁调度。
    await finalizeReadyState(renderDispatcher);
    void postStartupSupportKeyUsageReport({
      scenarioId: String(runtimeState.activeScenarioId || defaultScenarioBundle?.manifest?.scenario_id || "").trim(),
      source: scenarioBundleSource,
    });
  } catch (error) {
    // 启动失败路径保持最小可恢复面：清 apply 标志、回放 UI 状态，再按是否已有 base map 决定能否继续。
    let deferredUiBootstrapError = null;
    if (startupUiBootstrapPromise && !startupUiBootstrapAwaited) {
      try {
        await startupUiBootstrapPromise;
      } catch (uiBootstrapError) {
        startupUiBootstrapFailed = true;
        deferredUiBootstrapError = uiBootstrapError;
        console.error("Deferred UI bootstrap failed during startup:", uiBootstrapError);
      }
    }
    runtimeState.scenarioApplyInFlight = false;
    runPostScenarioUiReplay({ full: true });
    finishBootMetric("total", { failed: true });
    console.error("Failed to boot application:", error);
    console.error("Stack trace:", error?.stack);
    setStartupReadonlyState(false);
    const canContinueWithoutScenario =
      !!runtimeState.landData?.features?.length
      && !!renderDispatcher?.flush;
    setBootContinueHandler(canContinueWithoutScenario
      ? async () => {
        if (String(runtimeState.activeScenarioId || "").trim()) {
          await rollbackStartupScenarioToBaseMap();
        }
        if (startupUiBootstrapPromise && !startupUiBootstrapFailed && !deferredUiBootstrapError) {
          await startupUiBootstrapPromise;
        }
        setBootState("warmup", {
          message: getBootLanguage() === "zh"
            ? "正在以基础地图模式继续。"
            : "Continuing with the base map only.",
          canContinueWithoutScenario: false,
        });
        invalidateAllRenderPasses("bootstrap-first-frame");
        renderDispatcher.flush();
        checkpointBootMetricOnce("first-visible");
        checkpointBootMetricOnce("first-visible-base");
        await finalizeReadyState(renderDispatcher);
      }
      : null);
    setBootState("error", {
      error: error?.message || "Failed to load the default startup scenario.",
      canContinueWithoutScenario,
      progress: runtimeState.bootProgress || getBootProgressWindow("scenario-apply").min,
    });
  }
}

bootstrap();
