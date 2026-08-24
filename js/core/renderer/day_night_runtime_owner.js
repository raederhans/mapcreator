import { setDayNightStyleConfigState } from "../state/actions/renderer_phase_actions.js";

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new TypeError(`createDayNightRuntimeOwner requires ${label}`);
  }
  return value;
}

export function createDayNightRuntimeOwner({
  runtimeState,
  rendererSurfaceHost,
  constants = {},
  getters = {},
  helpers = {},
  effects = {},
  platform = globalThis,
} = {}) {
  if (!runtimeState || typeof runtimeState !== "object") {
    throw new TypeError("createDayNightRuntimeOwner requires runtimeState");
  }
  if (!rendererSurfaceHost || typeof rendererSurfaceHost !== "object") {
    throw new TypeError("createDayNightRuntimeOwner requires rendererSurfaceHost");
  }
  const clockIntervalMs = Number(constants.clockIntervalMs) || 15_000;
  const cycleFrameIntervalMs = Number(constants.cycleFrameIntervalMs) || (1000 / 30);
  const renderPhaseIdle = constants.renderPhaseIdle;
  const isBootInteractionReady = requireFunction(
    getters.isBootInteractionReady,
    "getters.isBootInteractionReady",
  );
  const clamp = requireFunction(helpers.clamp, "helpers.clamp");
  const normalizeLongitude = requireFunction(
    helpers.normalizeLongitude,
    "helpers.normalizeLongitude",
  );
  const normalizeDayNightStyleConfig = requireFunction(
    helpers.normalizeDayNightStyleConfig,
    "helpers.normalizeDayNightStyleConfig",
  );
  const createDate = typeof helpers.createDate === "function" ? helpers.createDate : () => new Date();
  const nowMs = requireFunction(helpers.nowMs, "helpers.nowMs");
  const stableJson = requireFunction(helpers.stableJson, "helpers.stableJson");
  const drawNightLightsLayer = requireFunction(
    effects.drawNightLightsLayer,
    "effects.drawNightLightsLayer",
  );
  const invalidateRenderPasses = requireFunction(
    effects.invalidateRenderPasses,
    "effects.invalidateRenderPasses",
  );
  const requestRender = requireFunction(effects.requestRender, "effects.requestRender");
  const renderFallback = requireFunction(effects.renderFallback, "effects.renderFallback");
  const setPendingDayNightRefreshState = requireFunction(
    effects.setPendingDayNightRefreshState,
    "effects.setPendingDayNightRefreshState",
  );

  let clockTimerId = null;
  let clockFrameHandle = null;
  let lastClockToken = "";
  let lastCycleFrameAt = 0;

  function getDayNightStyleConfig() {
    const config = normalizeDayNightStyleConfig(runtimeState.styleConfig?.dayNight);
    return setDayNightStyleConfigState(runtimeState, config);
  }

  function getUtcDateKey(date = createDate()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getUtcDayOfYear(date = createDate()) {
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const todayUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.max(1, Math.floor((todayUtc - yearStart) / 86_400_000) + 1);
  }

  function getCurrentUtcMinutesFromDate(date = createDate()) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  function getCurrentUtcMinutes() {
    return getCurrentUtcMinutesFromDate(createDate());
  }

  function getCycleUtcMinutes(config = getDayNightStyleConfig(), now = createDate()) {
    const secondsPerDay = clamp(Number(config.cycleSecondsPerDay) || 120, 10, 600);
    const elapsedSeconds = (now.getTime() / 1000) % secondsPerDay;
    return clamp((elapsedSeconds / secondsPerDay) * 24 * 60, 0, 24 * 60 - 1);
  }

  function getDayNightSignatureClockToken(config = getDayNightStyleConfig(), now = createDate()) {
    const dayKey = getUtcDateKey(now);
    if (config.mode === "utc") {
      return `${dayKey}|utc:${getCurrentUtcMinutesFromDate(now)}`;
    }
    if (config.mode === "cycle") {
      return `${dayKey}|cycle:${config.cycleSecondsPerDay}:${getCycleUtcMinutes(config, now).toFixed(2)}`;
    }
    return `${dayKey}|manual:${config.manualUtcMinutes}`;
  }

  function getDayNightLiveClockToken(config = getDayNightStyleConfig(), now = createDate()) {
    const dayKey = getUtcDateKey(now);
    if (config.mode === "utc") {
      return `${dayKey}|utc:${getCurrentUtcMinutesFromDate(now)}`;
    }
    if (config.mode === "cycle") {
      return `${dayKey}|cycle:${config.cycleSecondsPerDay}:${getCycleUtcMinutes(config, now).toFixed(2)}`;
    }
    return `${dayKey}|manual-day`;
  }

  function getSolarDeclinationRadians(
    date = createDate(),
    utcMinutes = getCurrentUtcMinutesFromDate(date),
  ) {
    const dayOfYear = getUtcDayOfYear(date);
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + ((utcMinutes / 60) - 12) / 24);
    return (
      0.006918
      - 0.399912 * Math.cos(gamma)
      + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma)
      + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma)
      + 0.00148 * Math.sin(3 * gamma)
    );
  }

  function getCurrentSolarState(config = getDayNightStyleConfig(), now = createDate()) {
    const mode = String(config.mode || "manual");
    const utcMinutes = mode === "utc"
      ? getCurrentUtcMinutesFromDate(now)
      : mode === "cycle"
        ? getCycleUtcMinutes(config, now)
        : clamp(Math.round(Number(config.manualUtcMinutes) || 0), 0, 24 * 60 - 1);
    const declinationDeg = getSolarDeclinationRadians(now, utcMinutes) * (180 / Math.PI);
    const subsolarLongitude = normalizeLongitude(180 - (utcMinutes / 4));
    return {
      now,
      utcMinutes,
      declinationDeg,
      subsolarLongitude,
      antisolarLongitude: normalizeLongitude(subsolarLongitude + 180),
      antisolarLatitude: clamp(-declinationDeg, -89.5, 89.5),
    };
  }

  function buildNightHemisphereFeature(solarState, radiusDeg = 90) {
    if (!solarState || typeof platform.d3?.geoCircle !== "function") return null;
    return platform.d3.geoCircle()
      .center([solarState.antisolarLongitude, solarState.antisolarLatitude])
      .radius(clamp(Number(radiusDeg) || 90, 1, 90))
      .precision(2)();
  }

  function drawDayNightShadowLayer(_k, config, solarState) {
    const twilightBand = buildNightHemisphereFeature(solarState, 90);
    if (!twilightBand) return;
    const coreRadius = clamp(90 - Number(config.twilightWidthDeg || 10), 56, 89);
    const nightCore = buildNightHemisphereFeature(solarState, coreRadius);
    const context = rendererSurfaceHost.getContext();
    const pathCanvas = rendererSurfaceHost.getPathCanvas();
    if (!context || !pathCanvas) return;

    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#24374c";
    context.globalAlpha = clamp(config.shadowOpacity * 0.5, 0, 0.5);
    context.beginPath();
    pathCanvas(twilightBand);
    context.fill();

    if (nightCore) {
      context.fillStyle = "#081423";
      context.globalAlpha = clamp(config.shadowOpacity, 0, 0.85);
      context.beginPath();
      pathCanvas(nightCore);
      context.fill();
    }

    context.strokeStyle = "#8aa1ba";
    context.globalAlpha = clamp(config.shadowOpacity * 0.28, 0, 0.24);
    context.lineWidth = 1.1 / Math.max(0.0001, Number(runtimeState.zoomTransform?.k || 1));
    context.beginPath();
    pathCanvas(twilightBand);
    context.stroke();
    context.restore();
  }

  function clearDayNightClockTimer() {
    if (clockTimerId) {
      platform.clearInterval(clockTimerId);
      clockTimerId = null;
    }
    if (clockFrameHandle) {
      if (clockFrameHandle.kind === "raf" && typeof platform.cancelAnimationFrame === "function") {
        platform.cancelAnimationFrame(clockFrameHandle.id);
      } else {
        platform.clearTimeout(clockFrameHandle.id);
      }
      clockFrameHandle = null;
    }
    lastCycleFrameAt = 0;
  }

  function scheduleDayNightCycleFrame(callback) {
    if (typeof platform.requestAnimationFrame === "function") {
      return { kind: "raf", id: platform.requestAnimationFrame(callback) };
    }
    return {
      kind: "timeout",
      id: platform.setTimeout(() => callback(nowMs()), cycleFrameIntervalMs),
    };
  }

  function requestDayNightClockRender(reason) {
    if (runtimeState.renderPhase !== renderPhaseIdle) {
      setPendingDayNightRefreshState(runtimeState, true);
      return;
    }
    invalidateRenderPasses("dayNight", reason);
    requestRender(reason, {
      fallback: () => {
        if (rendererSurfaceHost.getContext()) renderFallback();
      },
    });
  }

  function syncDayNightCycleAnimation(initialConfig) {
    if (clockTimerId) {
      platform.clearInterval(clockTimerId);
      clockTimerId = null;
    }
    if (clockFrameHandle) return true;
    lastClockToken = getDayNightLiveClockToken(initialConfig);
    const step = (timestamp = nowMs()) => {
      clockFrameHandle = null;
      const config = getDayNightStyleConfig();
      const mode = String(config.mode || "manual");
      if (!config.enabled || mode !== "cycle") {
        clearDayNightClockTimer();
        return;
      }
      const currentTime = Number.isFinite(timestamp) ? timestamp : nowMs();
      if (lastCycleFrameAt && currentTime - lastCycleFrameAt < cycleFrameIntervalMs) {
        clockFrameHandle = scheduleDayNightCycleFrame(step);
        return;
      }
      lastCycleFrameAt = currentTime;
      const nextToken = getDayNightLiveClockToken(config);
      if (nextToken !== lastClockToken) {
        lastClockToken = nextToken;
        if (platform.document?.visibilityState !== "hidden") {
          requestDayNightClockRender("day-night-cycle-frame");
        }
      }
      clockFrameHandle = scheduleDayNightCycleFrame(step);
    };
    clockFrameHandle = scheduleDayNightCycleFrame(step);
    return true;
  }

  function syncDayNightClockTimer() {
    const initialConfig = getDayNightStyleConfig();
    const initialMode = String(initialConfig.mode || "manual");
    if (!initialConfig.enabled || (initialMode !== "utc" && initialMode !== "cycle")) {
      clearDayNightClockTimer();
      return false;
    }
    if (initialMode === "cycle") {
      return syncDayNightCycleAnimation(initialConfig);
    }
    if (clockFrameHandle) clearDayNightClockTimer();
    if (clockTimerId) return true;
    lastClockToken = getDayNightLiveClockToken(initialConfig);
    clockTimerId = platform.setInterval(() => {
      const config = getDayNightStyleConfig();
      const mode = String(config.mode || "manual");
      if (!config.enabled || (mode !== "utc" && mode !== "cycle")) {
        clearDayNightClockTimer();
        return;
      }
      const nextToken = getDayNightLiveClockToken(config);
      if (nextToken === lastClockToken) return;
      lastClockToken = nextToken;
      runtimeState.updateToolbarInputsFn?.();
      if (!config.enabled) return;
      requestDayNightClockRender("day-night-clock");
    }, clockIntervalMs);
    return true;
  }

  function buildDayNightPassSignature(transformSignature, urbanGlowRevision) {
    const config = getDayNightStyleConfig();
    return [
      transformSignature,
      runtimeState.topologyRevision || 0,
      `field:urbanGlow:${Number(urbanGlowRevision || 0)}`,
      stableJson(config),
      getDayNightSignatureClockToken(config),
    ].join("::");
  }

  function drawDayNightPass(k, { interactive = false } = {}) {
    const config = getDayNightStyleConfig();
    if (!config.enabled || !isBootInteractionReady()) return;
    const solarState = getCurrentSolarState(config);
    drawDayNightShadowLayer(k, config, solarState);
    drawNightLightsLayer(k, config, solarState);
  }

  return {
    buildNightHemisphereFeature,
    buildDayNightPassSignature,
    clearDayNightClockTimer,
    drawDayNightShadowLayer,
    drawDayNightPass,
    getDayNightStyleConfig,
    getCurrentSolarState,
    getCurrentUtcMinutes,
    getCycleUtcMinutes,
    getDayNightLiveClockToken,
    getDayNightSignatureClockToken,
    getSolarDeclinationRadians,
    getUtcDateKey,
    getUtcDayOfYear,
    syncDayNightClockTimer,
  };
}
