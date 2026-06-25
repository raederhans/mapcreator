import assert from "node:assert/strict";
import test from "node:test";

import {
  createStartupReadyHandoffOwner,
} from "../js/bootstrap/startup_ready_handoff.js";
import { POST_READY_IDLE_QUIET_MS } from "../js/bootstrap/post_ready_scheduler.js";

function createSchedulerRecorder({ order = null } = {}) {
  const tasks = [];
  const recordedOrderLabels = new Set();
  const orderLabelByTaskKey = {
    "post-ready-full-interaction-infra": "startDeferredFullInteractionInfrastructureBuild",
    "post-ready-localization-hydration": "schedulePostReadyHydration",
    "post-ready-context-warmup": "schedulePostReadyDeferredContextWarmup",
    "post-ready-visual-warmup": "schedulePostReadyVisualWarmup",
  };
  return {
    tasks,
    scheduleTask(key, callback, options = {}) {
      tasks.push({ key, callback, options });
      const orderLabel = orderLabelByTaskKey[key];
      if (order && orderLabel && !recordedOrderLabels.has(orderLabel)) {
        recordedOrderLabels.add(orderLabel);
        order.push(orderLabel);
      }
    },
  };
}

function createTargetRuntime(overrides = {}) {
  return {
    bootBlocking: false,
    detailDeferred: false,
    detailPromotionCompleted: false,
    runtimeChunkLoadState: {
      selectionVersion: 1,
      pendingReason: "",
      pendingPromotion: false,
    },
    styleConfig: {
      texture: { mode: "none" },
      dayNight: { enabled: false },
    },
    showCityPoints: true,
    baseCityDataState: "loaded",
    ...overrides,
  };
}

function createHelpers({ order = null, overrides = {} } = {}) {
  return {
    buildInteractionInfrastructureAfterStartup: async () => true,
    checkpointBootMetric(metricName) {
      order?.push(`checkpoint ${metricName}`);
    },
    completeBootSequenceLogging() {
      order?.push("completeBootSequenceLogging");
    },
    ensureActiveScenarioBundleHydrated: async () => true,
    ensureContextLayerDataReady: async () => true,
    ensureFullLocalizationDataReady: async () => true,
    reconcileDetailPromotionPoliticalPass: () => true,
    requestMainRender: () => {},
    scheduleDeferredDetailPromotion() {
      order?.push("scheduleDeferredDetailPromotion");
    },
    shouldFastTrackScenarioHydration: () => false,
    consoleWarn: () => {},
    ...overrides,
  };
}

function createOwnerHarness({
  targetRuntime = createTargetRuntime(),
  scheduler = createSchedulerRecorder(),
  helpers = createHelpers(),
} = {}) {
  const owner = createStartupReadyHandoffOwner({
    runtimeState: targetRuntime,
    postReadyScheduler: scheduler,
    helpers,
  });
  return {
    helpers,
    owner,
    scheduler,
    targetRuntime,
  };
}

test("scheduleReadyPostBootWork preserves ready handoff order", () => {
  const order = [];
  const targetRuntime = createTargetRuntime({
    runtimeChunkLoadState: { selectionVersion: 0, pendingReason: "", pendingPromotion: false },
    scheduleScenarioChunkRefreshFn() {
      order.push("flushPendingScenarioChunkRefreshAfterReady");
    },
    showRivers: true,
    styleConfig: { texture: { mode: "grain" }, dayNight: { enabled: false } },
  });
  const scheduler = createSchedulerRecorder({ order });
  const helpers = createHelpers({ order });
  const { owner } = createOwnerHarness({ targetRuntime, scheduler, helpers });

  owner.scheduleReadyPostBootWork({ schedule() {} }, "ready-state");

  assert.deepEqual(order, [
    "checkpoint time-to-interactive",
    "checkpoint first-interactive",
    "completeBootSequenceLogging",
    "flushPendingScenarioChunkRefreshAfterReady",
    "scheduleDeferredDetailPromotion",
    "startDeferredFullInteractionInfrastructureBuild",
    "schedulePostReadyHydration",
    "schedulePostReadyDeferredContextWarmup",
    "schedulePostReadyVisualWarmup",
  ]);
});

test("flushPendingScenarioChunkRefreshAfterReady seeds first-ready pending reason", () => {
  const refreshCalls = [];
  const targetRuntime = createTargetRuntime({
    runtimeChunkLoadState: {
      selectionVersion: 0,
      pendingReason: "",
      pendingPromotion: false,
    },
    scheduleScenarioChunkRefreshFn(payload) {
      refreshCalls.push(payload);
    },
  });
  const { owner } = createOwnerHarness({ targetRuntime });

  owner.flushPendingScenarioChunkRefreshAfterReady("ready-state");

  assert.equal(targetRuntime.runtimeChunkLoadState.pendingReason, "ready-state");
  assert.equal(targetRuntime.runtimeChunkLoadState.pendingDelayMs, 0);
  assert.deepEqual(refreshCalls, [{
    reason: "ready-state",
    delayMs: 0,
    flushPending: true,
  }]);
});

test("flushPendingScenarioChunkRefreshAfterReady skips missing refresh function", () => {
  const targetRuntime = createTargetRuntime({
    runtimeChunkLoadState: {
      selectionVersion: 0,
      pendingReason: "",
      pendingPromotion: false,
    },
  });
  const { owner } = createOwnerHarness({ targetRuntime });

  assert.doesNotThrow(() => {
    owner.flushPendingScenarioChunkRefreshAfterReady("ready-state");
  });
});

test("schedulePostReadyHydration schedules two task keys and preserves timing", () => {
  const slowHarness = createOwnerHarness({
    helpers: createHelpers({
      overrides: {
        shouldFastTrackScenarioHydration: () => false,
      },
    }),
  });

  slowHarness.owner.schedulePostReadyHydration();
  slowHarness.owner.schedulePostReadyHydration();

  assert.deepEqual(slowHarness.scheduler.tasks.map((task) => task.key), [
    "post-ready-localization-hydration",
    "post-ready-scenario-hydration",
  ]);
  assert.deepEqual(slowHarness.scheduler.tasks[0].options, {
    timeout: 2200,
    delayMs: 1200,
    retryDelayMs: 600,
  });
  assert.deepEqual(slowHarness.scheduler.tasks[1].options, {
    timeout: 4800,
    delayMs: 4200,
    retryDelayMs: 900,
  });

  const fastHarness = createOwnerHarness({
    helpers: createHelpers({
      overrides: {
        shouldFastTrackScenarioHydration: () => true,
      },
    }),
  });

  fastHarness.owner.schedulePostReadyHydration();

  assert.deepEqual(fastHarness.scheduler.tasks[1].options, {
    timeout: 4800,
    delayMs: 300,
    retryDelayMs: 450,
  });
});

test("hydration task callbacks catch and warn", async () => {
  const localizationFailure = new Error("localization failed");
  const scenarioFailure = new Error("scenario failed");
  const warnings = [];
  const { owner, scheduler } = createOwnerHarness({
    helpers: createHelpers({
      overrides: {
        ensureFullLocalizationDataReady: async () => {
          throw localizationFailure;
        },
        ensureActiveScenarioBundleHydrated: async () => {
          throw scenarioFailure;
        },
        consoleWarn: (...args) => warnings.push(args),
      },
    }),
  });

  owner.schedulePostReadyHydration();
  await scheduler.tasks[0].callback();
  await scheduler.tasks[1].callback();

  assert.equal(warnings[0][0], "[boot] Deferred full localization hydration failed during idle scheduling.");
  assert.equal(warnings[0][1], localizationFailure);
  assert.equal(warnings[1][0], "[boot] Deferred full scenario hydration failed during idle scheduling.");
  assert.equal(warnings[1][1], scenarioFailure);
});

test("schedulePostReadyPoliticalReconcile gates detail readiness and reschedules false requests", () => {
  const targetRuntime = createTargetRuntime({ detailPromotionCompleted: false });
  const reconcileCalls = [];
  const { owner, scheduler } = createOwnerHarness({
    targetRuntime,
    helpers: createHelpers({
      overrides: {
        reconcileDetailPromotionPoliticalPass(reason) {
          reconcileCalls.push(reason);
          return false;
        },
      },
    }),
  });

  assert.equal(owner.schedulePostReadyPoliticalReconcile("detail-ready"), false);
  assert.equal(scheduler.tasks.length, 0);

  targetRuntime.detailPromotionCompleted = true;
  assert.equal(owner.schedulePostReadyPoliticalReconcile("detail-ready"), true);
  assert.equal(scheduler.tasks[0].key, "post-ready-detail-promotion-political-reconcile");
  assert.deepEqual(scheduler.tasks[0].options, {
    timeout: 1200,
    delayMs: 0,
    retryDelayMs: 320,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });

  assert.equal(scheduler.tasks[0].callback(), false);
  assert.deepEqual(reconcileCalls, ["detail-ready"]);
  assert.equal(scheduler.tasks.length, 2);
});

test("startDeferredFullInteractionInfrastructureBuild defers until detail is complete", async () => {
  const buildCalls = [];
  const targetRuntime = createTargetRuntime({
    detailDeferred: true,
    detailPromotionCompleted: false,
  });
  const { owner, scheduler } = createOwnerHarness({
    targetRuntime,
    helpers: createHelpers({
      overrides: {
        buildInteractionInfrastructureAfterStartup: async (options) => {
          buildCalls.push(options);
          return true;
        },
      },
    }),
  });

  owner.startDeferredFullInteractionInfrastructureBuild("ready-state");
  assert.equal(scheduler.tasks[0].key, "post-ready-full-interaction-infra");
  assert.equal(scheduler.tasks[0].callback(), false);
  assert.deepEqual(buildCalls, []);
  assert.equal(scheduler.tasks.length, 2);

  targetRuntime.detailPromotionCompleted = true;
  await scheduler.tasks[1].callback();
  assert.deepEqual(buildCalls, [{
    chunked: true,
    buildHitCanvas: false,
    mode: "full",
  }]);
});

test("startDeferredFullInteractionInfrastructureBuild catches build rejection with reason", async () => {
  const failure = new Error("infra failed");
  const warnings = [];
  const { owner, scheduler } = createOwnerHarness({
    helpers: createHelpers({
      overrides: {
        buildInteractionInfrastructureAfterStartup: async () => {
          throw failure;
        },
        consoleWarn: (...args) => warnings.push(args),
      },
    }),
  });

  owner.startDeferredFullInteractionInfrastructureBuild("ready-state");
  await scheduler.tasks[0].callback();

  assert.equal(warnings[0][0], "[boot] Deferred full interaction infrastructure build failed. reason=ready-state");
  assert.equal(warnings[0][1], failure);
});

test("schedulePostReadyVisualWarmup respects visual state and boot blocking", async () => {
  const inactiveHarness = createOwnerHarness();
  inactiveHarness.owner.schedulePostReadyVisualWarmup();
  assert.equal(inactiveHarness.scheduler.tasks.length, 0);

  const renderCalls = [];
  const targetRuntime = createTargetRuntime({
    styleConfig: { texture: { mode: "paper" }, dayNight: { enabled: false } },
  });
  const { owner, scheduler } = createOwnerHarness({
    targetRuntime,
    helpers: createHelpers({
      overrides: {
        requestMainRender: (reason) => renderCalls.push(reason),
      },
    }),
  });

  owner.schedulePostReadyVisualWarmup();
  assert.equal(scheduler.tasks[0].key, "post-ready-visual-warmup");
  assert.deepEqual(scheduler.tasks[0].options, {
    timeout: 1200,
    delayMs: 900,
    retryDelayMs: 320,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
  await scheduler.tasks[0].callback();
  assert.deepEqual(renderCalls, ["post-ready-visual-warmup"]);

  renderCalls.length = 0;
  targetRuntime.bootBlocking = true;
  await scheduler.tasks[0].callback();
  assert.deepEqual(renderCalls, []);

  const dayNightHarness = createOwnerHarness({
    targetRuntime: createTargetRuntime({
      styleConfig: { texture: { mode: "none" }, dayNight: { enabled: true } },
    }),
  });
  dayNightHarness.owner.schedulePostReadyVisualWarmup();
  assert.equal(dayNightHarness.scheduler.tasks[0].key, "post-ready-visual-warmup");
});

test("schedulePostReadyDeferredContextWarmup warms context layers, contours, and cities once", async () => {
  const contextCalls = [];
  const cityCalls = [];
  const renderCalls = [];
  const targetRuntime = createTargetRuntime({
    showRivers: true,
    showUrban: true,
    showPhysical: true,
    showCityPoints: true,
    baseCityDataState: "idle",
    ensureBaseCityDataFn: async (options) => {
      cityCalls.push(options);
      return true;
    },
  });
  const { owner, scheduler } = createOwnerHarness({
    targetRuntime,
    helpers: createHelpers({
      overrides: {
        ensureContextLayerDataReady: async (layerNames, options) => {
          contextCalls.push({ layerNames: [...layerNames], options });
          return true;
        },
        requestMainRender: (reason) => renderCalls.push(reason),
      },
    }),
  });

  owner.schedulePostReadyDeferredContextWarmup();

  assert.deepEqual(scheduler.tasks.map((task) => task.key), [
    "post-ready-context-warmup",
    "post-ready-contour-warmup",
  ]);
  assert.deepEqual(scheduler.tasks[0].options, {
    timeout: 1600,
    delayMs: 900,
    retryDelayMs: 420,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });
  assert.deepEqual(scheduler.tasks[1].options, {
    timeout: 1800,
    delayMs: 1400,
    retryDelayMs: 420,
    idleQuietMs: POST_READY_IDLE_QUIET_MS,
  });

  await scheduler.tasks[0].callback();
  assert.deepEqual(contextCalls[0], {
    layerNames: ["rivers", "urban", "physical-set"],
    options: { reason: "post-ready", renderNow: false },
  });
  assert.deepEqual(cityCalls, [{ reason: "post-ready", renderNow: false }]);
  assert.equal(renderCalls[0], "post-ready-context-warmup");

  await scheduler.tasks[1].callback();
  assert.deepEqual(contextCalls[1], {
    layerNames: ["physical-contours-set"],
    options: { reason: "post-ready-contours", renderNow: false },
  });
  assert.equal(renderCalls[1], "post-ready-contours");

  owner.schedulePostReadyDeferredContextWarmup();
  assert.equal(scheduler.tasks.length, 2);
});

test("reset clears internal scheduling flags", () => {
  const targetRuntime = createTargetRuntime({ showRivers: true });
  const { owner, scheduler } = createOwnerHarness({ targetRuntime });

  owner.schedulePostReadyHydration();
  owner.schedulePostReadyDeferredContextWarmup();
  assert.equal(scheduler.tasks.length, 3);

  owner.schedulePostReadyHydration();
  owner.schedulePostReadyDeferredContextWarmup();
  assert.equal(scheduler.tasks.length, 3);

  assert.deepEqual(owner.reset("bootstrap"), {
    reason: "bootstrap",
    postReadyContextWarmupScheduled: false,
    postReadyHydrationScheduled: false,
  });
  owner.schedulePostReadyHydration();
  owner.schedulePostReadyDeferredContextWarmup();
  assert.equal(scheduler.tasks.length, 6);
});
