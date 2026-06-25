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
import {
  createPostReadyScheduler,
  POST_READY_IDLE_QUIET_MS,
} from "./bootstrap/post_ready_scheduler.js";
import { registerMainRuntimeDiagnostics } from "./bootstrap/main_runtime_diagnostics.js";
import { createStartupScenarioBootOwner } from "./bootstrap/startup_scenario_boot.js";
import {
  createRenderDispatcher,
  configureStartupSupportKeyUsageAudit,
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
import {
  applyUiShellDebugTerritorySeed,
  revealUiShellDebugTerritoryPanels,
} from "./bootstrap/ui_shell_debug_seed.js";
import { registerMapcreatorSnapshotProvider } from "./core/mapcreator_snapshot.js";
import { initTranslations, updateUIText } from "./ui/i18n.js";
import { initToast, showToast } from "./ui/toast.js";
import { bindBeforeUnload } from "./core/dirty_state.js";
const state = runtimeState;
configureStartupSupportKeyUsageAudit();

registerMainRuntimeDiagnostics({
  targetState: state,
  registerSnapshotProvider: registerMapcreatorSnapshotProvider,
});

function requestMainRender(reason = "", { flush = false } = {}) {
  return flush ? flushRenderBoundary(reason) : requestRender(reason);
}

function isUiShellDebugMode() {
  if (typeof globalThis.URLSearchParams !== "function") {
    return false;
  }
  const params = new globalThis.URLSearchParams(globalThis.location?.search || "");
  const raw = String(params.get("ui_shell") || params.get("startup_mode") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "ui-shell";
}

let milsymbolLoadPromise = null;
let deferredUiBootstrapPromise = null;
let postReadyContextWarmupScheduled = false;
let postReadyHydrationScheduled = false;
const postReadyScheduler = createPostReadyScheduler({ targetState: runtimeState });

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

function checkpointFirstVisibleFrameMetrics() {
  if (!state.firstVisibleFramePainted) {
    return null;
  }
  checkpointBootMetricOnce("first-visible");
  if (String(state.activeScenarioId || "").trim()) {
    checkpointBootMetricOnce("first-visible-scenario");
  }
  return state.bootMetrics;
}

function assertStartupFirstVisibleFrameAccepted(reason = "startup-first-visible") {
  const metrics = checkpointFirstVisibleFrameMetrics();
  if (metrics) return metrics;
  const blocked = state.renderPerfMetrics?.firstVisibleFrameBlocked || {};
  const blockReason = String(blocked.blockReason || blocked.reason || state.renderPhase || "unknown");
  throw new Error(`[boot] First visible frame was not accepted after ${reason}: ${blockReason}`);
}

registerRuntimeHook(state, "noteFirstVisibleFramePaintedFn", checkpointFirstVisibleFrameMetrics);

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
      canRunPostReadyIdleWork: postReadyScheduler.canRunIdleWork,
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

async function yieldToMain() {
  if (typeof globalThis.scheduler?.yield === "function") {
    await globalThis.scheduler.yield();
    return;
  }
  await new Promise((resolve) => {
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
      { initStyledSelects },
      { initShortcuts },
    ] = await Promise.all([
      import("./ui/toolbar.js"),
      import("./ui/sidebar.js"),
      import("./ui/scenario_controls.js"),
      import("./ui/styled_selects.js"),
      import("./ui/shortcuts.js"),
    ]);
    await yieldToMain();
    initToolbar({ render: renderApp });
    await yieldToMain();
    initSidebar({ render: renderApp });
    await yieldToMain();
    initStyledSelects();
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
  const result = await getStartupDataPipelineOwner().ensureFullLocalizationDataReady({ reason, renderNow });
  updateUIText();
  return result;
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
  postReadyScheduler.scheduleTask("post-ready-localization-hydration", () => (
    ensureFullLocalizationDataReady({ reason: "post-ready-idle", renderNow: true }).catch((error) => {
      console.warn("[boot] Deferred full localization hydration failed during idle scheduling.", error);
      return null;
    })
  ), {
    timeout: 2200,
    delayMs: 1200,
    retryDelayMs: 600,
  });
  postReadyScheduler.scheduleTask("post-ready-scenario-hydration", () => (
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
  postReadyScheduler.scheduleTask(POST_READY_DETAIL_PROMOTION_POLITICAL_RECONCILE_TASK_KEY, () => {
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

async function ensureStartupInitialScenarioChunkVisualReady({
  reason = "startup-initial-visual",
  d3Client = globalThis.d3,
} = {}) {
  if (typeof runtimeState.awaitInitialScenarioChunkVisualPromotionFn !== "function") {
    return null;
  }
  const result = await runtimeState.awaitInitialScenarioChunkVisualPromotionFn({
    reason,
    d3Client,
    renderNow: true,
  });
  runtimeState.startupInitialScenarioChunkVisualPromotion = result;
  if (result && result.ok === false) {
    const details = {
      status: String(result.status || "unknown"),
      scenarioId: String(result.scenarioId || ""),
      activeScenarioId: String(result.activeScenarioId || ""),
      selectionVersion: Number(result.selectionVersion || 0),
      shellStatus: String(result.shellStatus || ""),
      promotedVisibleFeatureCount: Number(result.promotedVisibleFeatureCount || 0),
      promotedTotalFeatureCount: Number(result.promotedTotalFeatureCount || 0),
      landFeatureCount: Number(result.landFeatureCount || 0),
      colorCount: Number(result.colorCount || 0),
      pendingVisualPromotion: !!result.pendingVisualPromotion,
      pendingPromotion: !!result.pendingPromotion,
      promotionCommitInFlight: !!result.promotionCommitInFlight,
    };
    throw new Error(
      `[boot] Initial scenario chunk visual promotion did not reach visible readiness: ${JSON.stringify(details)}`
    );
  }
  return result;
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
  postReadyScheduler.scheduleTask("post-ready-full-interaction-infra", () => {
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

function schedulePostReadyVisualWarmup() {
  const textureMode = String(runtimeState.styleConfig?.texture?.mode || "none").trim().toLowerCase();
  const dayNightEnabled = !!runtimeState.styleConfig?.dayNight?.enabled;
  if (textureMode === "none" && !dayNightEnabled) {
    return;
  }
  postReadyScheduler.scheduleTask("post-ready-visual-warmup", async () => {
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
  postReadyScheduler.scheduleTask("post-ready-context-warmup", async () => {
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
    postReadyScheduler.scheduleTask("post-ready-contour-warmup", async () => {
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
  postReadyScheduler.reset("bootstrap");
  setStartupInteractionMode(state, resolveStartupInteractionMode());
  setStartupReadonlyState(false);

  let renderDispatcher = null;
  let startupUiBootstrapPromise = null;
  let startupUiBootstrapAwaited = false;
  let startupUiBootstrapFailed = false;
  try {
    bindBeforeUnload();
    if (isUiShellDebugMode()) {
      runtimeState.uiShellDebug = true;
      document.body?.classList.add("app-ui-shell-debug");
      setBootState("ui-shell", {
        message: getBootLanguage() === "zh"
          ? "正在启动 UI 调试外壳。"
          : "Starting the UI debug shell.",
        progress: 55,
        canContinueWithoutScenario: false,
      });
      startBootMetric("ui-shell");
      initLongAnimationFrameObserver();
      const startupInteractionLevel = "full";
      initMap({
        suppressRender: true,
        interactionLevel: startupInteractionLevel,
        deferInteractionInfrastructure: false,
      });
      setMapData({
        refitProjection: false,
        resetZoom: false,
        suppressRender: true,
        interactionLevel: startupInteractionLevel,
        deferInteractionInfrastructure: false,
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
      const flushRenderNow = () => flushRenderBoundary("ui-shell-render-now");
      globalThis.renderNow = flushRenderNow;
      registerRuntimeHook(state, "renderNowFn", flushRenderNow);
      registerRuntimeHook(state, "ensureDetailTopologyFn", (options = {}) =>
        ensureDetailTopologyReady({
          renderDispatcher,
          ...options,
        }));

      initToast();
      registerRuntimeHook(state, "showToastFn", showToast);
      setBootPreviewVisible(false);
      initPresetState();
      const uiShellTerritorySeed = applyUiShellDebugTerritorySeed();
      startupUiBootstrapPromise = bootstrapDeferredUi(renderApp);
      await startupUiBootstrapPromise;
      startupUiBootstrapAwaited = true;
      revealUiShellDebugTerritoryPanels();
      runPostScenarioUiReplay({ full: true });
      await ensureFullLocalizationDataReady({ reason: "ui-shell-ready", renderNow: false });
      renderDispatcher.flush();
      setBootState("ready", {
        blocking: false,
        progress: 100,
        canContinueWithoutScenario: false,
      });
      finishBootMetric("ui-shell", { mode: "debug" });
      checkpointBootMetricOnce("ui-shell-ready");
      completeBootSequenceLogging();
      globalThis.__mapcreatorUiShellDebug = {
        ready: true,
        skippedStartupData: true,
        skippedScenarioApply: true,
        territoryPreview: uiShellTerritorySeed,
      };
      return;
    }
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
    registerRuntimeHook(state, "showToastFn", showToast);
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

    if (!Array.isArray(runtimeState.landData?.features) || !runtimeState.landData.features.length) {
      setMapData({
        suppressRender: true,
        interactionLevel: startupInteractionLevel,
        deferInteractionInfrastructure: startupInteractionLevel === "readonly-startup",
      });
    }

    await ensureStartupInitialScenarioChunkVisualReady({
      reason: "startup-initial-visual",
      d3Client,
    });

    setBootState("warmup");
    invalidateAllRenderPasses("bootstrap-first-political-frame");
    renderDispatcher.flush();
    assertStartupFirstVisibleFrameAccepted("bootstrap-first-political-frame");

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
