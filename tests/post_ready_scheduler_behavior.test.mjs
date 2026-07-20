import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostReadyScheduler,
  POST_READY_IDLE_QUIET_MS,
  POST_READY_IDLE_TIME_REMAINING_MS,
} from "../js/bootstrap/post_ready_scheduler.js";

function createTargetState(overrides = {}) {
  return {
    activePostReadyTaskKey: "",
    activePostReadyTaskStartedAt: 0,
    postReadyTaskDiagnostics: null,
    renderPerfMetrics: {},
    renderPhase: "idle",
    phaseEnteredAt: 0,
    zoomGestureEndedAt: 0,
    runtimeChunkLoadState: {},
    ...overrides,
  };
}

function createTimerScope({ idle = false } = {}) {
  let nextId = 1;
  const timeoutCalls = [];
  const idleCalls = [];
  const clearedTimeoutIds = [];
  const clearedIdleIds = [];
  const scope = {
    setTimeout(callback, delay = 0) {
      const record = { id: nextId, callback, delay, cleared: false };
      nextId += 1;
      timeoutCalls.push(record);
      return record.id;
    },
    clearTimeout(id) {
      clearedTimeoutIds.push(id);
      const record = timeoutCalls.find((item) => item.id === id);
      if (record) record.cleared = true;
    },
    __renderPerfMetrics: null,
    __test: {
      timeoutCalls,
      idleCalls,
      clearedTimeoutIds,
      clearedIdleIds,
      runNextTimeout() {
        const record = timeoutCalls.find((item) => !item.cleared && !item.ran);
        assert.ok(record, "expected a scheduled timeout");
        record.ran = true;
        record.callback();
        return record;
      },
      runNextIdle(deadline = { didTimeout: false, timeRemaining: () => Number.POSITIVE_INFINITY }) {
        const record = idleCalls.find((item) => !item.cleared && !item.ran);
        assert.ok(record, "expected a scheduled idle callback");
        record.ran = true;
        record.callback(deadline);
        return record;
      },
      runTimerById(id) {
        const record = timeoutCalls.find((item) => item.id === id);
        assert.ok(record, `expected timeout id ${id}`);
        record.ran = true;
        record.callback();
      },
    },
  };
  if (idle) {
    scope.requestIdleCallback = (callback, options = {}) => {
      const record = { id: nextId, callback, options, cleared: false };
      nextId += 1;
      idleCalls.push(record);
      return record.id;
    };
    scope.cancelIdleCallback = (id) => {
      clearedIdleIds.push(id);
      const record = idleCalls.find((item) => item.id === id);
      if (record) record.cleared = true;
    };
  }
  return scope;
}

async function drainMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("post-ready idle block reason preserves blocker order", () => {
  let currentTime = 1000;
  const targetState = createTargetState({
    bootBlocking: true,
    scenarioApplyInFlight: true,
    startupReadonly: true,
    startupReadonlyUnlockInFlight: true,
    deferExactAfterSettle: true,
    runtimeChunkLoadState: {
      promotionCommitInFlight: true,
      pendingVisualPromotion: true,
      pendingPromotion: true,
      pendingInfraPromotion: true,
    },
    hitCanvasBuildScheduled: true,
    interactionInfrastructureBuildInFlight: true,
    activeInteractionRecoveryTaskKey: "recover",
    isInteracting: true,
    renderPhase: "rendering",
    phaseEnteredAt: 900,
    zoomGestureEndedAt: 900,
  });
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope: createTimerScope(),
    clock: () => currentTime,
  });

  assert.equal(scheduler.resolveIdleBlockReason(), "boot-blocking");
  targetState.bootBlocking = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "scenario-apply-in-flight");
  targetState.scenarioApplyInFlight = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "startup-readonly");
  targetState.startupReadonly = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "startup-readonly-unlock");
  targetState.startupReadonlyUnlockInFlight = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "defer-exact-after-settle");
  targetState.deferExactAfterSettle = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "chunk-promotion-commit-in-flight");
  targetState.runtimeChunkLoadState.promotionCommitInFlight = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "chunk-visual-promotion");
  targetState.runtimeChunkLoadState.pendingVisualPromotion = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "chunk-promotion");
  targetState.runtimeChunkLoadState.pendingPromotion = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "chunk-infra-promotion");
  targetState.runtimeChunkLoadState.pendingInfraPromotion = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "hit-canvas-build-scheduled");
  targetState.hitCanvasBuildScheduled = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "interaction-infra-in-flight");
  targetState.interactionInfrastructureBuildInFlight = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "interaction-recovery-task");
  targetState.activeInteractionRecoveryTaskKey = "";
  assert.equal(scheduler.resolveIdleBlockReason(), "interacting");
  targetState.isInteracting = false;
  assert.equal(scheduler.resolveIdleBlockReason(), "render-non-idle");
  targetState.renderPhase = "idle";
  assert.equal(scheduler.resolveIdleBlockReason(), "phase-quiet-window");
  targetState.phaseEnteredAt = 0;
  assert.equal(scheduler.resolveIdleBlockReason(), "zoom-quiet-window");
  targetState.zoomGestureEndedAt = 0;
  assert.equal(scheduler.resolveIdleBlockReason(), "ready");

  targetState.runtimeChunkLoadState.pendingPromotion = true;
  assert.equal(scheduler.resolveIdleBlockReason(), "chunk-promotion");
  assert.equal(scheduler.resolveIdleBlockReason({ allowChunkBacklog: true }), "ready");
  currentTime += 1;
});

test("scheduleTask records pending diagnostics and runs through timeout fallback", async () => {
  let currentTime = 1000;
  const targetState = createTargetState();
  const globalScope = createTimerScope();
  let runCount = 0;
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope,
    clock: () => currentTime,
  });

  scheduler.scheduleTask("post-ready-test", () => {
    runCount += 1;
  }, {
    delayMs: 50,
    retryDelayMs: 300,
    timeout: 1200,
  });

  assert.deepEqual(targetState.postReadyTaskDiagnostics.pendingTaskKeys, ["post-ready-test"]);
  assert.equal(targetState.postReadyTaskDiagnostics.pendingTaskCount, 1);
  assert.equal(targetState.postReadyTaskDiagnostics.lastScheduledTaskKey, "post-ready-test");
  assert.equal(targetState.postReadyTaskDiagnostics.idleQuietMs, POST_READY_IDLE_QUIET_MS);
  assert.equal(targetState.postReadyTaskDiagnostics.minIdleTimeRemainingMs, POST_READY_IDLE_TIME_REMAINING_MS);
  assert.equal(targetState.renderPerfMetrics.postReadySchedulerState.pendingTaskCount, 1);
  assert.notEqual(
    targetState.renderPerfMetrics.postReadySchedulerState,
    targetState.postReadyTaskDiagnostics,
  );
  assert.deepEqual(
    targetState.renderPerfMetrics.postReadySchedulerState,
    targetState.postReadyTaskDiagnostics,
  );
  assert.equal(globalScope.__renderPerfMetrics, targetState.renderPerfMetrics);

  assert.equal(globalScope.__test.timeoutCalls[0].delay, 50);
  currentTime += 50;
  globalScope.__test.runNextTimeout();
  globalScope.__test.runNextTimeout();
  await drainMicrotasks();

  assert.equal(runCount, 1);
  assert.equal(targetState.activePostReadyTaskKey, "");
  assert.equal(targetState.postReadyTaskDiagnostics.lastStartedTaskKey, "post-ready-test");
  assert.equal(targetState.postReadyTaskDiagnostics.lastFinishedTaskKey, "post-ready-test");
  assert.deepEqual(targetState.postReadyTaskDiagnostics.pendingTaskKeys, []);
});

test("scheduleTask can run user-visible tasks through chunk backlog", async () => {
  const targetState = createTargetState({
    runtimeChunkLoadState: {
      pendingInfraPromotion: true,
    },
  });
  const globalScope = createTimerScope();
  let runCount = 0;
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope,
    clock: () => 1000,
  });

  scheduler.scheduleTask("startup-sample-project-import", () => {
    runCount += 1;
  }, {
    allowChunkBacklog: true,
    idleQuietMs: 0,
    minIdleTimeRemainingMs: 0,
  });

  globalScope.__test.runNextTimeout();
  globalScope.__test.runNextTimeout();
  await drainMicrotasks();

  assert.equal(runCount, 1);
  assert.equal(targetState.postReadyTaskDiagnostics.lastStartedTaskKey, "startup-sample-project-import");
  assert.deepEqual(targetState.postReadyTaskDiagnostics.pendingTaskKeys, []);
});

test("scheduleTask warns and clears active task after synchronous and async failures", async () => {
  const warnings = [];
  const targetState = createTargetState();
  const globalScope = createTimerScope();
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope,
    clock: () => 1000,
    warn: (...args) => warnings.push(args),
  });

  scheduler.scheduleTask("post-ready-throws", () => {
    throw new Error("sync failure");
  });
  globalScope.__test.runNextTimeout();
  globalScope.__test.runNextTimeout();
  await drainMicrotasks();

  scheduler.scheduleTask("post-ready-rejects", () => Promise.reject(new Error("async failure")));
  globalScope.__test.runNextTimeout();
  globalScope.__test.runNextTimeout();
  await drainMicrotasks();

  assert.equal(warnings.length, 2);
  assert.equal(warnings[0][0], "[boot] Post-ready task failed. task=post-ready-throws");
  assert.equal(warnings[1][0], "[boot] Post-ready task failed. task=post-ready-rejects");
  assert.equal(targetState.activePostReadyTaskKey, "");
  assert.equal(targetState.activePostReadyTaskStartedAt, 0);
});

test("reset cancels pending handles and prevents stale callbacks from running", () => {
  const targetState = createTargetState();
  const globalScope = createTimerScope();
  let runCount = 0;
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope,
    clock: () => 1000,
  });

  scheduler.scheduleTask("post-ready-stale", () => {
    runCount += 1;
  }, { delayMs: 25 });
  const staleStartId = globalScope.__test.timeoutCalls[0].id;

  scheduler.reset("bootstrap");

  assert.deepEqual(globalScope.__test.clearedTimeoutIds, [staleStartId]);
  assert.equal(targetState.activePostReadyTaskKey, "");
  assert.equal(targetState.activePostReadyTaskStartedAt, 0);
  assert.equal(targetState.postReadyTaskDiagnostics.lastBlockedReason, "bootstrap");
  assert.deepEqual(targetState.postReadyTaskDiagnostics.pendingTaskKeys, []);

  globalScope.__test.runTimerById(staleStartId);
  assert.equal(runCount, 0);
});

test("requestIdleCallback path retries when the idle budget is too low", () => {
  const targetState = createTargetState();
  const globalScope = createTimerScope({ idle: true });
  let runCount = 0;
  const scheduler = createPostReadyScheduler({
    targetState,
    globalScope,
    clock: () => 1000,
  });

  scheduler.scheduleTask("post-ready-idle", () => {
    runCount += 1;
  }, {
    retryDelayMs: 420,
    minIdleTimeRemainingMs: 8,
  });
  globalScope.__test.runNextTimeout();
  globalScope.__test.runNextIdle({ didTimeout: false, timeRemaining: () => 1 });

  assert.equal(runCount, 0);
  assert.equal(targetState.postReadyTaskDiagnostics.lastBlockedReason, "idle-time-remaining");
  assert.equal(targetState.postReadyTaskDiagnostics.maxRetryCount, 1);
  assert.deepEqual(targetState.postReadyTaskDiagnostics.pendingTaskKeys, ["post-ready-idle"]);
});
