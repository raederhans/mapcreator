import {
  STATE_BUS_EVENTS,
  emitStateBusEvent,
} from "./state/index.js";
import { state as runtimeState } from "./state.js";
import {
  setScenarioPerfMetricState,
} from "./state/scenario_runtime_state.js";
import {
  createScenarioApplyRefreshPlan,
  refreshMapDataForScenarioApply,
  refreshScenarioOpeningOwnerBorders,
  setMapData,
} from "./scenario/scenario_renderer_bridge.js";
import { rebuildPresetState } from "./releasable_manager.js";
import { refreshScenarioDataHealth } from "./scenario_data_health.js";
import {
  ensureActiveScenarioOptionalLayersForVisibility,
  preloadScenarioCoarseChunks,
  preloadScenarioFocusCountryPoliticalDetailChunk,
  scheduleScenarioChunkRefresh,
  scenarioSupportsChunkedRuntime,
} from "./scenario_resources.js";
import {
  recordRenderTransactionSnapshot,
} from "./renderer/render_transaction_diagnostics.js";
import { refreshScenarioShellOverlays } from "./scenario_shell_overlay.js";
import { syncCountryUi } from "./scenario_ui_sync.js";
import { requestRender } from "./render_boundary.js";

function runPaletteAndToolbarRefreshCallbacks() {
  // scenario apply / reset / rollback 都会复用这一批 UI 回放事件，
  // 这样地图数据刷新和各 owner 的可见状态能在同一轮里重新对齐。
  emitStateBusEvent(STATE_BUS_EVENTS.RENDER_PALETTE, runtimeState.currentPaletteTheme);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_PALETTE_LIBRARY);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_PALETTE_SOURCE);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_PARENT_BORDER_COUNTRY_LIST);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_PAINT_MODE);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_TOOLBAR_INPUTS);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_WATER_INTERACTION);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_SCENARIO_SPECIAL_REGION);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_SCENARIO_RELIEF_OVERLAY);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_DYNAMIC_BORDER_STATUS);
}

function runPostScenarioUiReplay({ full = true, renderNow = false } = {}) {
  runPaletteAndToolbarRefreshCallbacks();
  if (full) {
    syncCountryUi({ renderNow });
  }
}

function scheduleAfterFirstFrame(callback) {
  if (typeof callback !== "function") return;
  const runAsync = () => {
    if (typeof globalThis.setTimeout === "function") {
      globalThis.setTimeout(callback, 0);
      return;
    }
    callback();
  };
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          runAsync();
        });
        return;
      }
      runAsync();
    });
    return;
  }
  runAsync();
}

function updateChunkedFirstFramePrewarmMetric(details = {}, { replace = false } = {}) {
  return setScenarioPerfMetricState(runtimeState, "chunkedFirstFramePrewarm", {
    ...details,
    recordedAt: Date.now(),
  }, { merge: !replace });
}

function scheduleScenarioDetailChunkPrewarm({
  bundle,
  scenarioId = "",
  prewarmStartedAt = 0,
  scenarioApplyEpoch = 0,
} = {}) {
  // 细节政治块只在首帧已经交给 coarse 数据兜住可见性的前提下异步补齐。
  // 这里重复检查 activeScenarioId，是为了避免用户在等待期间切剧本后把旧 detail 刷回当前页面。
  if (!scenarioSupportsChunkedRuntime(bundle)) return;
  const normalizedScenarioId = String(scenarioId || "").trim();
  const transactionScenarioApplyEpoch = Math.max(0, Number(scenarioApplyEpoch || bundle?.chunkLifecycle?.scenarioApplyEpoch || 0));
  scheduleAfterFirstFrame(() => {
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-detail-prewarm-scheduled",
      reason: "scenario-apply-detail-prewarm",
      expectedScenarioId: normalizedScenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        prewarmStartedAt,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
      },
    });
    void (async () => {
      if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
        return;
      }
      const detailPrewarmStartedAt = Date.now();
      updateChunkedFirstFramePrewarmMetric({
        scenarioId: normalizedScenarioId,
        mode: "async",
        synchronous: false,
        prewarmStartedAt,
        detailPrewarmStartedAt,
      });
      try {
        await preloadScenarioFocusCountryPoliticalDetailChunk(bundle);
        if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
          return;
        }
        scheduleScenarioChunkRefresh({
          reason: "scenario-apply-detail-prewarm",
          delayMs: 0,
          refreshSourceStartedAtMs: prewarmStartedAt,
        });
        updateChunkedFirstFramePrewarmMetric({
          scenarioId: normalizedScenarioId,
          mode: "async",
          synchronous: false,
          prewarmStartedAt,
          detailPrewarmStartedAt,
          detailPrewarmCompletedAt: Date.now(),
        });
        recordRenderTransactionSnapshot(runtimeState, {
          phase: "scenario-detail-prewarm-complete",
          reason: "scenario-apply-detail-prewarm",
          expectedScenarioId: normalizedScenarioId,
          source: "scenario_post_apply_effects",
          extra: {
            prewarmStartedAt,
            detailPrewarmStartedAt,
            scenarioApplyEpoch: transactionScenarioApplyEpoch,
            status: "committed",
          },
        });
      } catch (error) {
        console.warn(`[scenario] Detail chunk prewarm failed for "${scenarioId}".`, error);
        if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
          return;
        }
        updateChunkedFirstFramePrewarmMetric({
          scenarioId: normalizedScenarioId,
          mode: "async",
          synchronous: false,
          prewarmStartedAt,
          detailPrewarmStartedAt,
          detailPrewarmCompletedAt: Date.now(),
          detailPrewarmFailed: true,
          detailPrewarmFailure: String(error?.message || error || "Unknown detail prewarm error"),
        });
        recordRenderTransactionSnapshot(runtimeState, {
          phase: "scenario-detail-prewarm-failed",
          reason: "scenario-apply-detail-prewarm",
          expectedScenarioId: normalizedScenarioId,
          source: "scenario_post_apply_effects",
          extra: {
            prewarmStartedAt,
            detailPrewarmStartedAt,
            scenarioApplyEpoch: transactionScenarioApplyEpoch,
            error: String(error?.message || error || "Unknown detail prewarm error"),
          },
        });
      }
    })();
  });
}

async function ensureChunkedScenarioFirstFrameReady({
  bundle,
  scenarioId = "",
  awaitPrewarm = true,
  scenarioApplyEpoch = 0,
} = {}) {
  // 这里负责“apply 成功后第一眼必须看见什么”：
  // coarse chunk 永远先到位，focus detail 只在 manifest 明确要求时同步阻塞。
  if (!scenarioSupportsChunkedRuntime(bundle)) {
    return { chunkPrewarmAwaited: true, chunkPrewarmDeferred: false };
  }
  const normalizedScenarioId = String(scenarioId || "").trim();
  const transactionScenarioApplyEpoch = Math.max(0, Number(scenarioApplyEpoch || bundle?.chunkLifecycle?.scenarioApplyEpoch || 0));
  const synchronous = shouldSynchronouslyPrewarmChunkedScenario(bundle);
  const normalizedMode = synchronous ? "sync" : "async";
  const prewarmStartedAt = Date.now();
  const shouldAwaitPrewarm = awaitPrewarm !== false || synchronous;
  let prewarmStatus = {
    chunkPrewarmAwaited: shouldAwaitPrewarm,
    chunkPrewarmDeferred: !shouldAwaitPrewarm,
    coarsePrewarmCommitted: false,
  };
  updateChunkedFirstFramePrewarmMetric({
    scenarioId: normalizedScenarioId,
    mode: normalizedMode,
    synchronous: normalizedMode === "sync",
    awaited: shouldAwaitPrewarm,
    coarsePrewarmAwaited: shouldAwaitPrewarm,
    coarsePrewarmCommitted: false,
    prewarmStartedAt,
  }, { replace: true });
  recordRenderTransactionSnapshot(runtimeState, {
    phase: "scenario-coarse-prewarm-start",
    reason: "scenario-apply",
    expectedScenarioId: normalizedScenarioId,
    source: "scenario_post_apply_effects",
    extra: {
      prewarmStartedAt,
      awaited: shouldAwaitPrewarm,
      synchronous: normalizedMode === "sync",
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
    },
  });
  if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
    return prewarmStatus;
  }
  if (awaitPrewarm === false && !synchronous) {
    const refreshScheduledAt = Date.now();
    // Startup boot already has a shell/core frame; chunk refresh can hydrate the full coarse selection after apply.
    scheduleScenarioChunkRefresh({
      reason: "scenario-apply",
      delayMs: 0,
      refreshSourceStartedAtMs: prewarmStartedAt,
    });
    updateChunkedFirstFramePrewarmMetric({
      scenarioId: normalizedScenarioId,
      mode: normalizedMode,
      synchronous: false,
      awaited: false,
      coarsePrewarmAwaited: false,
      chunkPrewarmDeferred: true,
      coarsePrewarmCommitted: false,
      prewarmStartedAt,
      prewarmDeferredAt: refreshScheduledAt,
      refreshScheduledAt,
      coarsePrewarmDeferredAt: refreshScheduledAt,
      chunkRefreshScheduledAt: refreshScheduledAt,
    });
    scheduleScenarioDetailChunkPrewarm({
      bundle,
      scenarioId: normalizedScenarioId,
      prewarmStartedAt,
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
    });
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-coarse-prewarm-deferred",
      reason: "scenario-apply",
      expectedScenarioId: normalizedScenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        prewarmStartedAt,
        refreshScheduledAt,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
        status: "deferred",
      },
    });
    return {
      chunkPrewarmAwaited: false,
      chunkPrewarmDeferred: true,
      coarsePrewarmCommitted: false,
      chunkRefreshScheduledAt: refreshScheduledAt,
    };
  }
  let prewarmCompletedAt = 0;
  let coarsePrewarmCommitted = false;
  try {
    const coarsePayload = await preloadScenarioCoarseChunks(bundle);
    coarsePrewarmCommitted = !!coarsePayload;
    if (synchronous) {
      await preloadScenarioFocusCountryPoliticalDetailChunk(bundle);
    }
    if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
      return prewarmStatus;
    }
    prewarmCompletedAt = Date.now();
    updateChunkedFirstFramePrewarmMetric({
      scenarioId: normalizedScenarioId,
      mode: normalizedMode,
      synchronous,
      awaited: true,
      coarsePrewarmAwaited: true,
      chunkPrewarmDeferred: false,
      coarsePrewarmCommitted,
      prewarmStartedAt,
      prewarmCompletedAt,
      coarsePrewarmCompletedAt: prewarmCompletedAt,
    });
    prewarmStatus = {
      chunkPrewarmAwaited: true,
      chunkPrewarmDeferred: false,
      coarsePrewarmCommitted,
      coarsePrewarmCompletedAt: prewarmCompletedAt,
    };
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-coarse-prewarm-complete",
      reason: "scenario-apply",
      expectedScenarioId: normalizedScenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        prewarmStartedAt,
        prewarmCompletedAt,
        coarsePrewarmCommitted,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
        status: coarsePrewarmCommitted ? "committed" : "empty",
      },
    });
  } catch (error) {
    console.warn(`[scenario] Coarse chunk prewarm failed for "${scenarioId}".`, error);
    if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
      return prewarmStatus;
    }
    const failedAt = prewarmCompletedAt || Date.now();
    updateChunkedFirstFramePrewarmMetric({
      scenarioId: normalizedScenarioId,
      mode: normalizedMode,
      synchronous,
      awaited: true,
      coarsePrewarmAwaited: true,
      chunkPrewarmDeferred: false,
      coarsePrewarmCommitted,
      prewarmStartedAt,
      prewarmCompletedAt: failedAt,
      coarsePrewarmCompletedAt: failedAt,
      prewarmFailed: true,
      prewarmFailure: String(error?.message || error || "Unknown prewarm error"),
    });
    prewarmStatus = {
      chunkPrewarmAwaited: true,
      chunkPrewarmDeferred: false,
      coarsePrewarmCommitted,
      coarsePrewarmCompletedAt: failedAt,
      prewarmFailed: true,
    };
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-coarse-prewarm-failed",
      reason: "scenario-apply",
      expectedScenarioId: normalizedScenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        prewarmStartedAt,
        prewarmCompletedAt: failedAt,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
        error: String(error?.message || error || "Unknown prewarm error"),
      },
    });
  } finally {
    if (normalizedScenarioId && normalizedScenarioId !== String(runtimeState.activeScenarioId || "").trim()) {
      return prewarmStatus;
    }
    const refreshScheduledAt = Date.now();
    scheduleScenarioChunkRefresh({
      reason: "scenario-apply",
      delayMs: 0,
      refreshSourceStartedAtMs: prewarmStartedAt,
    });
    updateChunkedFirstFramePrewarmMetric({
      scenarioId: normalizedScenarioId,
      mode: normalizedMode,
      synchronous,
      prewarmStartedAt,
      prewarmCompletedAt: prewarmCompletedAt || Date.now(),
      refreshScheduledAt,
      chunkRefreshScheduledAt: refreshScheduledAt,
    });
    if (!synchronous) {
      scheduleScenarioDetailChunkPrewarm({
        bundle,
        scenarioId: normalizedScenarioId,
        prewarmStartedAt,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
      });
    }
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-coarse-prewarm-refresh-scheduled",
      reason: "scenario-apply",
      expectedScenarioId: normalizedScenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        prewarmStartedAt,
        refreshScheduledAt,
        coarsePrewarmCommitted,
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
      },
    });
  }
  return prewarmStatus;
}

function shouldSynchronouslyPrewarmChunkedScenario(bundle) {
  if (!scenarioSupportsChunkedRuntime(bundle)) return false;
  const hints = bundle?.manifest?.performance_hints && typeof bundle.manifest.performance_hints === "object"
    ? bundle.manifest.performance_hints
    : {};
  // Coarse chunks are still first-frame required; focus detail only blocks apply when a scenario opts in.
  return hints.sync_focus_detail_prewarm_default === true;
}

async function syncVisibleScenarioOptionalLayersForPostApply({
  bundle,
  scenarioId = "",
  renderNow = false,
  scenarioApplyEpoch = 0,
} = {}) {
  if (runtimeState.bootBlocking) {
    return;
  }
  const transactionScenarioApplyEpoch = Math.max(0, Number(scenarioApplyEpoch || bundle?.chunkLifecycle?.scenarioApplyEpoch || 0));
  recordRenderTransactionSnapshot(runtimeState, {
    phase: "scenario-optional-layers-post-apply-start",
    reason: "scenario-post-apply",
    expectedScenarioId: scenarioId,
    source: "scenario_post_apply_effects",
    extra: {
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
    },
  });
  await ensureActiveScenarioOptionalLayersForVisibility({ bundle, renderNow })
    .catch((error) => {
      console.warn(`[scenario] Optional layer visibility sync failed for "${scenarioId}".`, error);
      recordRenderTransactionSnapshot(runtimeState, {
        phase: "scenario-optional-layers-post-apply-failed",
        reason: "scenario-post-apply",
        expectedScenarioId: scenarioId,
        source: "scenario_post_apply_effects",
        extra: {
          scenarioApplyEpoch: transactionScenarioApplyEpoch,
          error: String(error?.message || error || "Unknown optional layer sync error"),
        },
      });
    });
  recordRenderTransactionSnapshot(runtimeState, {
    phase: "scenario-optional-layers-post-apply-complete",
    reason: "scenario-post-apply",
    expectedScenarioId: scenarioId,
    source: "scenario_post_apply_effects",
    extra: {
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
    },
  });
}

async function runPostScenarioApplyEffects({
  bundle,
  scenarioId = "",
  deferChunkPrewarm = false,
  renderNow = false,
  suppressRender = false,
  scenarioApplyEpoch = 0,
} = {}) {
  // post-apply 只收口 apply 之后的可见修复和 UI 回放。
  // 真正的 scenario state 提交已经在更早阶段完成，这里避免再引入第二套写口。
  const useSingleFinalRender = !!renderNow && !suppressRender;
  const refreshPlan = createScenarioApplyRefreshPlan({
    refreshOpeningOwnerBorders: false,
  });
  const transactionScenarioApplyEpoch = Math.max(0, Number(scenarioApplyEpoch || bundle?.chunkLifecycle?.scenarioApplyEpoch || 0));
  let scenarioMapRefreshMode = "light";
  try {
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-refresh-map-data-start",
      reason: "scenario-post-apply",
      expectedScenarioId: scenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        mode: "light",
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
      },
    });
    refreshMapDataForScenarioApply({
      suppressRender: useSingleFinalRender ? true : suppressRender,
      refreshPlan,
    });
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-refresh-map-data-complete",
      reason: "scenario-post-apply",
      expectedScenarioId: scenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        mode: "light",
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
      },
    });
  } catch (refreshError) {
    scenarioMapRefreshMode = "setMapData-fallback";
    console.warn("[scenario] Lightweight scenario apply refresh failed; falling back to setMapData.", refreshError);
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-refresh-map-data-fallback",
      reason: "scenario-post-apply",
      expectedScenarioId: scenarioId,
      source: "scenario_post_apply_effects",
      extra: {
        scenarioApplyEpoch: transactionScenarioApplyEpoch,
        error: String(refreshError?.message || refreshError || "Unknown refresh error"),
      },
    });
    setMapData({
      refitProjection: false,
      resetZoom: false,
      suppressRender: useSingleFinalRender ? true : suppressRender,
    });
  }
  rebuildPresetState();
  refreshScenarioShellOverlays({
    renderNow: false,
    borderReason: `scenario:${scenarioId}`,
    refreshOpeningOwnerBorders: false,
  });
  refreshScenarioOpeningOwnerBorders({ renderNow: false, reason: `scenario:${scenarioId}:opening` });
  let chunkPrewarmResult = {
    chunkPrewarmAwaited: true,
    chunkPrewarmDeferred: false,
  };
  if (scenarioSupportsChunkedRuntime(bundle)) {
    chunkPrewarmResult = await ensureChunkedScenarioFirstFrameReady({
      bundle,
      scenarioId,
      awaitPrewarm: !deferChunkPrewarm,
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
    });
  }
  await syncVisibleScenarioOptionalLayersForPostApply({ bundle, scenarioId, renderNow, scenarioApplyEpoch: transactionScenarioApplyEpoch });
  const shouldExposeScenarioDataHealthSignals =
    !bundle?.loadDiagnostics?.startupBundle
    && !runtimeState.startupReadonly
    && !runtimeState.startupReadonlyUnlockInFlight
    && !runtimeState.detailPromotionInFlight;
  const suppressChunkedCoarseDataHealthToast =
    scenarioSupportsChunkedRuntime(bundle)
    && chunkPrewarmResult?.coarsePrewarmCommitted === true;
  const dataHealth = refreshScenarioDataHealth({
    showWarningToast: shouldExposeScenarioDataHealthSignals && !suppressChunkedCoarseDataHealthToast,
    showErrorToast: shouldExposeScenarioDataHealthSignals && !suppressChunkedCoarseDataHealthToast,
  });
  recordRenderTransactionSnapshot(runtimeState, {
    phase: "scenario-data-health-refreshed",
    reason: "scenario-post-apply",
    expectedScenarioId: scenarioId,
    source: "scenario_post_apply_effects",
    extra: {
      scenarioMapRefreshMode,
      scenarioApplyEpoch: transactionScenarioApplyEpoch,
      hasChunkedRuntime: scenarioSupportsChunkedRuntime(bundle),
      chunkPrewarmResult,
      dataHealth: {
        expectedFeatureCount: Number(dataHealth?.expectedFeatureCount || 0),
        runtimeFeatureCount: Number(dataHealth?.runtimeFeatureCount || 0),
        ratio: Number(dataHealth?.ratio || 0),
        warning: String(dataHealth?.warning || ""),
        severity: String(dataHealth?.severity || ""),
      },
    },
  });
  syncCountryUi({ renderNow: useSingleFinalRender ? true : (renderNow && !suppressRender) });
  return {
    dataHealth,
    scenarioMapRefreshMode,
    hasChunkedRuntime: scenarioSupportsChunkedRuntime(bundle),
    chunkPrewarmAwaited: chunkPrewarmResult?.chunkPrewarmAwaited !== false,
    chunkPrewarmDeferred: chunkPrewarmResult?.chunkPrewarmDeferred === true,
    coarsePrewarmCommitted: chunkPrewarmResult?.coarsePrewarmCommitted === true,
  };
}

function runPostScenarioResetEffects({
  scenarioId = "",
  renderNow = false,
} = {}) {
  scheduleAfterFirstFrame(() => {
    refreshScenarioOpeningOwnerBorders({ renderNow: false, reason: `scenario-reset-opening:${scenarioId}` });
    refreshScenarioShellOverlays({ renderNow: false, borderReason: `scenario-reset:${scenarioId}` });
    refreshScenarioDataHealth({ showWarningToast: false });
    syncCountryUi({ renderNow });
    if (!renderNow) {
      requestRender(`scenario-reset-post-frame:${scenarioId}`);
    }
  });
}

function runPostScenarioClearEffects({ renderNow = false } = {}) {
  refreshScenarioOpeningOwnerBorders({ renderNow: false, reason: "scenario-clear-opening" });
  setMapData({ refitProjection: false, resetZoom: false });
  rebuildPresetState();
  refreshScenarioShellOverlays({ renderNow: false, borderReason: "scenario-clear" });
  syncCountryUi({ renderNow });
}

function runPostRollbackRestoreEffects({ renderNow = false } = {}) {
  runPaletteAndToolbarRefreshCallbacks();
  setMapData({ refitProjection: false, resetZoom: false });
  rebuildPresetState();
  refreshScenarioOpeningOwnerBorders({ renderNow: false, reason: "scenario-rollback" });
  refreshScenarioShellOverlays({ renderNow: false, borderReason: "scenario-rollback" });
  refreshScenarioDataHealth({ showWarningToast: false, showErrorToast: false });
  syncCountryUi({ renderNow });
}

export {
  runPostScenarioUiReplay,
  runPostRollbackRestoreEffects,
  runPostScenarioApplyEffects,
  runPostScenarioClearEffects,
  runPostScenarioResetEffects,
};
