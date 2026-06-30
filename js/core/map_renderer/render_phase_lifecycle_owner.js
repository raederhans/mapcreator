const DEFAULT_RENDER_PHASE_IDLE = "idle";
const DEFAULT_RENDER_PHASE_INTERACTING = "interacting";

const REQUIRED_EFFECT_NAMES = Object.freeze([
  "clearTimeout",
  "setTimeout",
  "setRenderPhaseTimerId",
  "setRenderPhaseValue",
  "setPhaseEnteredAt",
  "setIsInteracting",
  "cancelPoliticalPathWarmup",
  "setHoverOverlayDirty",
  "setPendingDayNightRefresh",
  "invalidateRenderPasses",
  "updateDprStage",
  "setCanvasSize",
  "setAdaptiveSettleProfile",
  "scheduleScenarioChunkRefresh",
  "setDeferExactAfterSettle",
  "render",
  "scheduleExactAfterSettleRefresh",
]);

const REQUIRED_GETTER_NAMES = Object.freeze([
  "getRenderPhase",
  "getRenderPhaseTimerId",
  "nowMs",
  "getAdaptiveSettleProfile",
  "hasPendingDayNightRefresh",
  "shouldStartExactAfterSettleFastPath",
]);

const PROMOTION_ACTIVE_STATUSES = Object.freeze([
  "promotion-committed",
  "promotion-commit-started",
  "promotion-commit-in-flight",
  "promotion-started",
  "promotion-in-flight",
  "promotion-scheduled",
  "refresh-started",
]);

function requireFunction(source, name, label) {
  const candidate = source?.[name];
  if (typeof candidate !== "function") {
    throw new TypeError(`${label}.${name} must be a function.`);
  }
  return candidate;
}

function normalizeReason(reason, defaultReason) {
  const normalized = String(reason || "").trim();
  return normalized || defaultReason;
}

function createTrace() {
  return {
    effectOrder: [],
    getterOrder: [],
  };
}

function createSummary({
  phase,
  previousPhase = phase,
  reason,
  timerScheduled = false,
  timerCleared = false,
  trace,
}) {
  return Object.freeze({
    phase: String(phase || ""),
    previousPhase: String(previousPhase || ""),
    reason,
    timerScheduled: Boolean(timerScheduled),
    timerCleared: Boolean(timerCleared),
    effectOrder: Object.freeze([...(trace?.effectOrder || [])]),
    getterOrder: Object.freeze([...(trace?.getterOrder || [])]),
  });
}

export function createRenderPhaseLifecycleOwner({ state = {}, effects = {}, getters = {} } = {}) {
  const renderPhaseIdle = String(state.renderPhaseIdle || DEFAULT_RENDER_PHASE_IDLE);
  const renderPhaseInteracting = String(state.renderPhaseInteracting || DEFAULT_RENDER_PHASE_INTERACTING);
  const effectApi = Object.fromEntries(
    REQUIRED_EFFECT_NAMES.map((name) => [name, requireFunction(effects, name, "effects")]),
  );
  const getterApi = Object.fromEntries(
    REQUIRED_GETTER_NAMES.map((name) => [name, requireFunction(getters, name, "getters")]),
  );

  function runEffect(trace, name, ...args) {
    trace.effectOrder.push(name);
    return effectApi[name](...args);
  }

  function runGetter(trace, name, ...args) {
    trace.getterOrder.push(name);
    return getterApi[name](...args);
  }

  function clearRenderPhaseTimerCore(trace) {
    const timerId = runGetter(trace, "getRenderPhaseTimerId");
    if (!timerId) return false;
    runEffect(trace, "clearTimeout", timerId);
    runEffect(trace, "setRenderPhaseTimerId", null);
    return true;
  }

  function clearRenderPhaseTimer(reason = "render-phase-timer-clear") {
    const trace = createTrace();
    const normalizedReason = normalizeReason(reason, "render-phase-timer-clear");
    const timerCleared = clearRenderPhaseTimerCore(trace);
    const phase = runGetter(trace, "getRenderPhase");
    return createSummary({
      phase,
      reason: normalizedReason,
      timerCleared,
      trace,
    });
  }

  function setRenderPhase(nextPhase, { reason = "" } = {}) {
    const trace = createTrace();
    const phase = String(nextPhase || renderPhaseIdle);
    const normalizedReason = normalizeReason(reason, `phase-${phase}`);
    const previousPhase = String(runGetter(trace, "getRenderPhase") || "");
    const enteredAt = runGetter(trace, "nowMs");

    runEffect(trace, "setRenderPhaseValue", phase);
    runEffect(trace, "setPhaseEnteredAt", enteredAt);
    runEffect(trace, "setIsInteracting", phase === renderPhaseInteracting);

    if (phase !== renderPhaseIdle) {
      runEffect(trace, "cancelPoliticalPathWarmup", `phase-${phase}`);
    }
    if (previousPhase !== phase && (previousPhase === renderPhaseIdle || phase === renderPhaseIdle)) {
      runEffect(trace, "setHoverOverlayDirty", true);
    }
    if (phase === renderPhaseIdle && runGetter(trace, "hasPendingDayNightRefresh")) {
      runEffect(trace, "setPendingDayNightRefresh", false);
      runEffect(trace, "invalidateRenderPasses", "dayNight", "day-night-clock-deferred");
    }
    const dprStageChanged = runEffect(
      trace,
      "updateDprStage",
      phase === renderPhaseInteracting ? "interactive" : "idle",
    );
    if (dprStageChanged) {
      runEffect(trace, "setCanvasSize", {
        reason: `phase-${phase}-dpr-stage`,
        targetPassesOnDprChange: ["political", "contextBase", "borders"],
      });
    }

    return createSummary({
      phase,
      previousPhase,
      reason: normalizedReason,
      trace,
    });
  }

  function scheduleRenderPhaseIdle({ reason = "render-phase-idle" } = {}) {
    const trace = createTrace();
    const normalizedReason = normalizeReason(reason, "render-phase-idle");
    const timerCleared = clearRenderPhaseTimerCore(trace);
    const previousPhase = String(runGetter(trace, "getRenderPhase") || "");
    const settleProfile = runGetter(trace, "getAdaptiveSettleProfile");

    runEffect(trace, "setAdaptiveSettleProfile", settleProfile);
    const timerId = runEffect(trace, "setTimeout", () => {
      runEffect(createTrace(), "setRenderPhaseTimerId", null);
      setRenderPhase(renderPhaseIdle, { reason: normalizedReason });
      const pendingChunkRefreshStatus = runEffect(createTrace(), "scheduleScenarioChunkRefresh", {
        reason: normalizedReason,
        delayMs: 0,
        flushPending: true,
      });
      const promotionWorkActive = PROMOTION_ACTIVE_STATUSES.includes(String(pendingChunkRefreshStatus || ""));
      if (runGetter(createTrace(), "shouldStartExactAfterSettleFastPath")) {
        if (promotionWorkActive) return;
        runEffect(createTrace(), "setDeferExactAfterSettle", true);
        runEffect(createTrace(), "render");
        runEffect(createTrace(), "scheduleExactAfterSettleRefresh", settleProfile);
        return;
      }
      runEffect(createTrace(), "render");
    }, Number(settleProfile?.settleDurationMs || 0));
    runEffect(trace, "setRenderPhaseTimerId", timerId);

    return createSummary({
      phase: previousPhase,
      previousPhase,
      reason: normalizedReason,
      timerScheduled: Boolean(timerId),
      timerCleared,
      trace,
    });
  }

  function resetRenderPhaseState(reason = "render-phase-reset") {
    const trace = createTrace();
    const normalizedReason = normalizeReason(reason, "render-phase-reset");
    const timerCleared = clearRenderPhaseTimerCore(trace);
    const previousPhase = String(runGetter(trace, "getRenderPhase") || "");
    const enteredAt = runGetter(trace, "nowMs");

    runEffect(trace, "setRenderPhaseValue", renderPhaseIdle);
    runEffect(trace, "setPhaseEnteredAt", enteredAt);
    if (!timerCleared) {
      runEffect(trace, "setRenderPhaseTimerId", null);
    }

    return createSummary({
      phase: renderPhaseIdle,
      previousPhase,
      reason: normalizedReason,
      timerCleared,
      trace,
    });
  }

  return Object.freeze({
    clearRenderPhaseTimer,
    setRenderPhase,
    scheduleRenderPhaseIdle,
    resetRenderPhaseState,
  });
}
