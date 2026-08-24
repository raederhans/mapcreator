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

function createHarness({ config = {}, renderPhase = "idle", bootReady = true } = {}) {
  const events = [];
  const frameCallbacks = new Map();
  const intervalCallbacks = new Map();
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
      const id = nextHandle++;
      frameCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frameCallbacks.delete(id); },
    setInterval(callback) {
      const id = nextHandle++;
      intervalCallbacks.set(id, callback);
      return id;
    },
    clearInterval(id) { intervalCallbacks.delete(id); },
    setTimeout(callback) {
      const id = nextHandle++;
      frameCallbacks.set(id, callback);
      return id;
    },
    clearTimeout(id) { frameCallbacks.delete(id); },
  };
  const owner = createDayNightRuntimeOwner({
    runtimeState,
    rendererSurfaceHost: {
      getContext: () => context,
      getPathCanvas: () => (feature) => events.push(["path", feature.radius]),
    },
    constants: { renderPhaseIdle: "idle" },
    getters: { isBootInteractionReady: () => bootReady },
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
      requestRender: (...args) => events.push(["request", ...args]),
      setPendingDayNightRefreshState: (state, pending) => {
        Reflect.set(state, "pendingDayNightRefresh", Boolean(pending));
        events.push(["pending", Boolean(pending)]);
      },
    },
    platform,
  });
  return {
    events,
    frameCallbacks,
    intervalCallbacks,
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

test("pass signature keeps topology, urban glow, normalized config, and live clock identity", () => {
  const harness = createHarness({ config: { enabled: true, mode: "manual", manualUtcMinutes: 600 } });
  const signature = harness.owner.buildDayNightPassSignature("zoom:2", 9);
  assert.match(signature, /^zoom:2::17::field:urbanGlow:9::/);
  assert.match(signature, /::2026-06-21\|manual:600$/);
});
