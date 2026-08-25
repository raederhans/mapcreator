import assert from "node:assert/strict";
import test from "node:test";

import { createDayNightRuntimeOwner } from "../js/core/renderer/day_night_runtime_owner.js";
import { normalizeDayNightStyleConfig } from "../js/core/state_defaults.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function normalizeLongitude(value) {
  let normalized = Number(value) || 0;
  while (normalized > 180) normalized -= 360;
  while (normalized <= -180) normalized += 360;
  return normalized;
}

function createHarness({
  config = {},
  renderPhase = "idle",
  bootReady = true,
  hasAnimationFrame = true,
  invokeRenderFallback = false,
} = {}) {
  const events = [];
  const frameCallbacks = new Map();
  const intervalCallbacks = new Map();
  const timeoutCallbacks = new Map();
  const calls = {
    cancelAnimationFrame: 0,
    clearInterval: 0,
    clearTimeout: 0,
    requestAnimationFrame: 0,
    setInterval: 0,
    setTimeout: 0,
  };
  let nextHandle = 1;
  let currentDate = new Date("2026-06-21T12:00:00.000Z");
  const runtimeState = {
    renderPhase,
    styleConfig: { dayNight: config },
    topologyRevision: 17,
    zoomTransform: { k: 2 },
    updateToolbarInputsFn: () => events.push("toolbar"),
  };
  const context = new Proxy({
    beginPath: () => events.push("begin"),
    fill: () => events.push("fill"),
    restore: () => events.push("restore"),
    save: () => events.push("save"),
    stroke: () => events.push("stroke"),
  }, {
    set(target, key, value) {
      events.push(["set", String(key), value]);
      Reflect.set(target, key, value);
      return true;
    },
  });
  const platform = {
    document: { visibilityState: "visible" },
    d3: {
      geoCircle: () => {
        const feature = { center: null, radius: null, precision: null };
        const builder = () => ({ ...feature });
        Object.assign(builder, {
          center: (value) => { Reflect.set(feature, "center", value); return builder; },
          radius: (value) => { Reflect.set(feature, "radius", value); return builder; },
          precision: (value) => { Reflect.set(feature, "precision", value); return builder; },
        });
        return builder;
      },
    },
    requestAnimationFrame(callback) {
      calls.requestAnimationFrame += 1;
      const id = nextHandle++;
      frameCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      calls.cancelAnimationFrame += 1;
      frameCallbacks.delete(id);
    },
    setInterval(callback) {
      calls.setInterval += 1;
      const id = nextHandle++;
      intervalCallbacks.set(id, callback);
      return id;
    },
    clearInterval(id) {
      calls.clearInterval += 1;
      intervalCallbacks.delete(id);
    },
    setTimeout(callback) {
      calls.setTimeout += 1;
      const id = nextHandle++;
      timeoutCallbacks.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      calls.clearTimeout += 1;
      timeoutCallbacks.delete(id);
    },
  };
  if (!hasAnimationFrame) delete platform.requestAnimationFrame;
  const owner = createDayNightRuntimeOwner({
    rendererSurfaceHost: {
      getContext: () => context,
      getPathCanvas: () => (feature) => events.push(["path", feature.radius]),
    },
    getters: {
      getDayNightStyleConfigState: () => runtimeState.styleConfig?.dayNight,
      isBootInteractionReady: () => bootReady,
      isRenderPhaseIdle: () => runtimeState.renderPhase === "idle",
    },
    helpers: {
      clamp,
      createDate: () => new Date(currentDate),
      normalizeDayNightStyleConfig,
      normalizeLongitude,
      nowMs: () => currentDate.getTime(),
      stableJson: JSON.stringify,
    },
    effects: {
      drawNightLightsLayer: (...args) => events.push(["lights", ...args]),
      invalidateRenderPasses: (...args) => events.push(["invalidate", ...args]),
      renderFallback: () => events.push("render-fallback"),
      requestRender: (reason, options) => {
        events.push(["request", reason]);
        if (invokeRenderFallback) options?.fallback?.();
      },
      setDayNightStyleConfig: (nextConfig) => {
        runtimeState.styleConfig.dayNight = nextConfig;
        return nextConfig;
      },
      setPendingDayNightRefresh: (pending) => {
        runtimeState.pendingDayNightRefresh = Boolean(pending);
      },
      updateToolbarInputs: () => runtimeState.updateToolbarInputsFn?.(),
    },
    platform,
  });
  return {
    calls,
    events,
    frameCallbacks,
    intervalCallbacks,
    platform,
    timeoutCallbacks,
    owner,
    runtimeState,
    setDate(value) { currentDate = new Date(value); },
  };
}

test("UTC, manual, and cycle inputs produce deterministic tokens and solar state", () => {
  const harness = createHarness({ config: { enabled: true, mode: "manual", manualUtcMinutes: 720 } });
  const date = new Date("2026-06-21T12:34:00.000Z");
  const manual = harness.owner.getDayNightStyleConfig();
  assert.equal(harness.owner.getDayNightSignatureClockToken(manual, date), "2026-06-21|manual:720");
  const solar = harness.owner.getCurrentSolarState(manual, date);
  assert.equal(solar.utcMinutes, 720);
  assert.equal(solar.subsolarLongitude, 0);
  assert.ok(solar.declinationDeg > 23 && solar.declinationDeg < 24);

  const cycle = normalizeDayNightStyleConfig({ enabled: true, mode: "cycle", cycleSecondsPerDay: 120 });
  assert.equal(harness.owner.getCycleUtcMinutes(cycle, new Date(30_000)), 360);
  assert.equal(
    harness.owner.getDayNightSignatureClockToken(cycle, new Date("2026-06-21T00:00:30.000Z")),
    "2026-06-21|cycle:120:360.00",
  );
});

test("day-night draw keeps shadow geometry before the City Lights delegate", () => {
  const harness = createHarness({
    config: { enabled: true, mode: "manual", manualUtcMinutes: 720, shadowOpacity: 0.4, twilightWidthDeg: 10 },
  });
  harness.owner.drawDayNightPass(2, { interactive: true });
  const pathEvents = harness.events.filter((entry) => Array.isArray(entry) && entry[0] === "path");
  assert.deepEqual(pathEvents, [["path", 90], ["path", 80], ["path", 90]]);
  const restoreIndex = harness.events.indexOf("restore");
  const lightsIndex = harness.events.findIndex((entry) => Array.isArray(entry) && entry[0] === "lights");
  assert.ok(restoreIndex >= 0 && lightsIndex > restoreIndex);
  assert.equal(harness.events[lightsIndex][1], 2);
});

test("cycle scheduler uses the frame lane and preserves the busy-phase pending guardrail", () => {
  const harness = createHarness({
    config: { enabled: true, mode: "cycle", cycleSecondsPerDay: 120 },
    renderPhase: "interacting",
  });
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  assert.equal(harness.intervalCallbacks.size, 0);
  assert.equal(harness.frameCallbacks.size, 1);

  const firstFrame = [...harness.frameCallbacks.values()][0];
  harness.frameCallbacks.clear();
  harness.setDate("2026-06-21T12:00:01.000Z");
  firstFrame(Date.parse("2026-06-21T12:00:01.000Z"));
  assert.equal(harness.runtimeState.pendingDayNightRefresh, true);
  assert.deepEqual(
    harness.events.filter((entry) => Array.isArray(entry) && entry[0] === "invalidate"),
    [],
  );

  Reflect.set(harness.runtimeState, "renderPhase", "idle");
  const secondFrame = [...harness.frameCallbacks.values()][0];
  harness.frameCallbacks.clear();
  harness.setDate("2026-06-21T12:00:02.000Z");
  secondFrame(Date.parse("2026-06-21T12:00:02.000Z"));
  assert.ok(harness.events.some((entry) => (
    Array.isArray(entry)
    && entry[0] === "invalidate"
    && entry[1] === "dayNight"
    && entry[2] === "day-night-cycle-frame"
  )));
});

test("UTC timer ignores a stale clock token and orders toolbar through render fallback", () => {
  const harness = createHarness({
    config: { enabled: true, mode: "utc" },
    invokeRenderFallback: true,
  });
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  assert.equal(harness.calls.setInterval, 1);
  assert.equal(harness.intervalCallbacks.size, 1);
  const intervalCallback = [...harness.intervalCallbacks.values()][0];

  intervalCallback();
  assert.deepEqual(harness.events, []);

  harness.setDate("2026-06-21T12:01:00.000Z");
  intervalCallback();
  assert.deepEqual(harness.events, [
    "toolbar",
    ["invalidate", "dayNight", "day-night-clock"],
    ["request", "day-night-clock"],
    "render-fallback",
  ]);
});

test("UTC and cycle transitions cancel the prior platform lane", () => {
  const harness = createHarness({ config: { enabled: true, mode: "utc" } });
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  harness.runtimeState.styleConfig.dayNight = { enabled: true, mode: "cycle", cycleSecondsPerDay: 120 };
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  assert.equal(harness.calls.clearInterval, 1);
  assert.equal(harness.intervalCallbacks.size, 0);
  assert.equal(harness.frameCallbacks.size, 1);
  harness.runtimeState.styleConfig.dayNight = { enabled: true, mode: "utc" };
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  assert.equal(harness.calls.cancelAnimationFrame, 1);
  assert.equal(harness.frameCallbacks.size, 0);
  assert.equal(harness.intervalCallbacks.size, 1);

  assert.deepEqual(harness.events, []);

  harness.owner.clearDayNightClockTimer();
  assert.equal(harness.calls.clearInterval, 2);
  assert.equal(harness.intervalCallbacks.size, 0);
});

test("cycle frame suppresses hidden-document rendering while keeping the frame lane alive", () => {
  const harness = createHarness({
    config: { enabled: true, mode: "cycle", cycleSecondsPerDay: 120 },
  });
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  const frame = [...harness.frameCallbacks.values()][0];
  harness.frameCallbacks.clear();
  harness.platform.document.visibilityState = "hidden";
  harness.setDate("2026-06-21T12:00:01.000Z");
  frame(Date.parse("2026-06-21T12:00:01.000Z"));
  assert.deepEqual(harness.events, []);
  assert.equal(harness.frameCallbacks.size, 1);
  assert.equal(harness.calls.requestAnimationFrame, 2);
});

test("cycle scheduler falls back to timeout and cancels the active timeout", () => {
  const harness = createHarness({
    config: { enabled: true, mode: "cycle", cycleSecondsPerDay: 120 },
    hasAnimationFrame: false,
  });
  assert.equal(harness.owner.syncDayNightClockTimer(), true);
  assert.equal(harness.calls.setTimeout, 1);
  assert.equal(harness.timeoutCallbacks.size, 1);

  const timeoutCallback = [...harness.timeoutCallbacks.values()][0];
  harness.timeoutCallbacks.clear();
  harness.setDate("2026-06-21T12:00:01.000Z");
  timeoutCallback();
  assert.equal(harness.calls.setTimeout, 2);
  assert.equal(harness.timeoutCallbacks.size, 1);
  assert.deepEqual(harness.events.slice(0, 2), [
    ["invalidate", "dayNight", "day-night-cycle-frame"],
    ["request", "day-night-cycle-frame"],
  ]);

  harness.owner.clearDayNightClockTimer();
  assert.equal(harness.calls.clearTimeout, 1);
  assert.equal(harness.timeoutCallbacks.size, 0);
});

test("pass signature keeps topology, urban glow, normalized config, and live clock identity", () => {
  const harness = createHarness({ config: { enabled: true, mode: "manual", manualUtcMinutes: 600 } });
  const signature = harness.owner.buildDayNightPassSignature("zoom:2", 9, 17);
  assert.match(signature, /^zoom:2::17::field:urbanGlow:9::/);
  assert.match(signature, /::2026-06-21\|manual:600$/);
});
