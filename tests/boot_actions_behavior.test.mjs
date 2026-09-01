import assert from "node:assert/strict";
import test from "node:test";

import {
  clearActivePostReadyTask,
  clearStartupReadonlyStateFields,
  clearStartupReadonlyStateForReason,
  commitStartupReadonlyStateFields,
  replaceBootMetricsState,
  replacePostReadyTaskDiagnostics,
  replaceSampleProjectDeeplinkState,
  replaceStartupBootCacheState,
  setActivePostReadyTask,
  setBootPreviewVisibleState,
  setBootStateFields,
  setLongAnimationFrameObserver,
  setStartupInitialScenarioChunkVisualPromotion,
  setStartupInteractionMode,
  setStartupScenarioBootstrapCacheStatus,
  setUiShellDebugState,
  setUiShellDebugTerritorySeededState,
  setUiHydrationState,
} from "../js/core/state/actions/boot_actions.js";
import {
  createDefaultBootState,
  setBootStateFields as setBootStateFieldsCompat,
  setStartupBootCacheState,
  setStartupInteractionMode as setStartupInteractionModeCompat,
  setStartupReadonlyStateFields,
} from "../js/core/state/boot_state.js";

test("boot action writes normalized scalar fields without importing the global state", () => {
  const target = createDefaultBootState();

  assert.equal(setStartupInteractionMode(target, "full"), "full");
  assert.equal(setBootPreviewVisibleState(target, 1), true);
  assert.equal(
    setBootStateFields(target, {
      phase: "ready",
      message: "Ready",
      progress: 100,
      blocking: 0,
      error: null,
      canContinueWithoutScenario: 1,
    }),
    "ready",
  );

  assert.equal(target.startupInteractionMode, "full");
  assert.equal(target.bootPreviewVisible, true);
  assert.deepEqual(
    {
      phase: target.bootPhase,
      message: target.bootMessage,
      progress: target.bootProgress,
      blocking: target.bootBlocking,
      error: target.bootError,
      canContinueWithoutScenario: target.bootCanContinueWithoutScenario,
    },
    {
      phase: "ready",
      message: "Ready",
      progress: 100,
      blocking: false,
      error: "",
      canContinueWithoutScenario: true,
    },
  );
});

test("boot phase action preserves the assigned phase value and return identity", () => {
  const target = createDefaultBootState();
  const phase = { id: "custom-phase" };

  assert.equal(setBootStateFields(target, { phase }), phase);
  assert.equal(target.bootPhase, phase);
  assert.equal(
    setBootStateFieldsCompat(target, {
      phase,
      message: "Still ready",
    }),
    phase,
  );
});

test("UI hydration action keeps a fail-closed pending-ready-failed lifecycle", () => {
  const target = createDefaultBootState();
  assert.equal(Object.hasOwn(target, "uiHydrationStatus"), false);
  assert.equal(Object.hasOwn(target, "uiHydrationError"), false);
  assert.equal(Object.hasOwn(target, "uiHydrationUpdatedAt"), false);

  assert.equal(setUiHydrationState(target), "pending");
  assert.deepEqual({
    status: target.uiHydrationStatus,
    error: target.uiHydrationError,
    updatedAt: target.uiHydrationUpdatedAt,
  }, {
    status: "pending",
    error: "",
    updatedAt: 0,
  });

  assert.equal(setUiHydrationState(target, { status: "ready", updatedAt: 10 }), "ready");
  assert.equal(target.uiHydrationStatus, "ready");
  assert.equal(target.uiHydrationError, "");

  assert.equal(setUiHydrationState(target, {
    status: "failed",
    error: "toolbar unavailable",
    updatedAt: 20,
  }), "failed");
  assert.deepEqual({
    status: target.uiHydrationStatus,
    error: target.uiHydrationError,
    updatedAt: target.uiHydrationUpdatedAt,
  }, {
    status: "failed",
    error: "toolbar unavailable",
    updatedAt: 20,
  });
  assert.equal(setUiHydrationState(target, { status: "unknown" }), "pending");
});

test("compatibility boot field facade returns the existing phase when the patch omits it", () => {
  const target = {
    bootPhase: "ready",
    bootMessage: "",
  };

  assert.equal(
    setBootStateFieldsCompat(target, { message: "still ready" }),
    "ready",
  );
  assert.equal(target.bootMessage, "still ready");
});

test("readonly actions preserve the first activation timestamp and support explicit clearing", () => {
  const target = createDefaultBootState();

  assert.equal(
    commitStartupReadonlyStateFields(target, {
      active: true,
      reason: "scenario-health-gate",
      unlockInFlight: true,
      since: 101,
    }),
    true,
  );
  assert.deepEqual(
    {
      active: target.startupReadonly,
      reason: target.startupReadonlyReason,
      unlockInFlight: target.startupReadonlyUnlockInFlight,
      since: target.startupReadonlySince,
    },
    {
      active: true,
      reason: "scenario-health-gate",
      unlockInFlight: true,
      since: 101,
    },
  );

  commitStartupReadonlyStateFields(target, {
    active: true,
    reason: "detail-promotion",
    unlockInFlight: false,
    since: 202,
  });
  assert.equal(target.startupReadonlySince, 101);

  assert.equal(
    clearStartupReadonlyStateForReason(target, "scenario-health-gate"),
    false,
  );
  assert.equal(target.startupReadonly, true);
  assert.equal(
    clearStartupReadonlyStateForReason(target, "detail-promotion"),
    true,
  );
  assert.equal(target.startupReadonly, false);
  assert.equal(target.startupReadonlySince, 101);

  commitStartupReadonlyStateFields(target, {
    active: true,
    reason: "detail-promotion",
    since: 303,
  });
  assert.equal(target.startupReadonlySince, 101);
  clearStartupReadonlyStateFields(target, { preserveSince: false });
  assert.equal(target.startupReadonlySince, 0);
});

test("compatibility readonly wrapper supplies time while canonical action stays time-free", () => {
  const target = createDefaultBootState();

  setStartupReadonlyStateFields(target, {
    active: true,
    reason: "detail-promotion",
    since: 456,
  });
  assert.equal(target.startupReadonlySince, 456);

  const zeroSinceTarget = createDefaultBootState();
  setStartupReadonlyStateFields(zeroSinceTarget, {
    active: true,
    reason: "detail-promotion",
    since: 0,
  });
  assert.equal(zeroSinceTarget.startupReadonlySince > 0, true);

  const invalidTargetResult = commitStartupReadonlyStateFields(null, {
    active: true,
    since: 999,
  });
  assert.equal(invalidTargetResult, false);
});

test("replacement actions preserve boot metric, cache, sample, and diagnostic root identities", () => {
  const target = createDefaultBootState();
  const metrics = [];
  const cache = {
    enabled: true,
    baseTopology: "ready",
    localization: "ready",
    scenarioBootstrap: "pending",
  };
  const sample = { status: "pending", sampleId: "blank-base-starter" };
  const diagnostics = { pendingTaskKeys: ["warmup"], pendingTaskCount: 1 };

  assert.equal(replaceBootMetricsState(target, metrics), metrics);
  assert.equal(replaceStartupBootCacheState(target, cache), cache);
  assert.equal(replaceSampleProjectDeeplinkState(target, sample), sample);
  assert.equal(replacePostReadyTaskDiagnostics(target, diagnostics), diagnostics);
  assert.equal(target.bootMetrics, metrics);
  assert.equal(target.startupBootCacheState, cache);
  assert.equal(target.sampleProjectDeeplink, sample);
  assert.equal(target.postReadyTaskDiagnostics, diagnostics);

  assert.equal(setStartupScenarioBootstrapCacheStatus(target, "ready"), "ready");
  assert.equal(target.startupBootCacheState, cache);
  assert.equal(cache.scenarioBootstrap, "ready");
});

test("compatibility cache setter keeps its clone and default-merge behavior", () => {
  const target = createDefaultBootState();
  const input = { enabled: true, scenarioBootstrap: "ready" };
  const result = setStartupBootCacheState(target, input);

  assert.notEqual(result, input);
  assert.equal(target.startupBootCacheState, result);
  assert.deepEqual(result, {
    enabled: true,
    baseTopology: "idle",
    localization: "idle",
    scenarioBootstrap: "ready",
  });
});

test("post-ready task actions retain the expected-task race guard", () => {
  const target = {};

  assert.equal(
    setActivePostReadyTask(target, { taskKey: "first", startedAt: 123 }),
    "first",
  );
  assert.equal(target.activePostReadyTaskStartedAt, 123);
  assert.equal(
    clearActivePostReadyTask(target, { expectedTaskKey: "second" }),
    false,
  );
  assert.equal(target.activePostReadyTaskKey, "first");
  assert.equal(target.activePostReadyTaskStartedAt, 123);
  const stringEquivalentKey = {
    toString() {
      return "first";
    },
  };
  assert.equal(
    clearActivePostReadyTask(
      target,
      { expectedTaskKey: stringEquivalentKey },
    ),
    false,
  );
  assert.equal(target.activePostReadyTaskKey, "first");

  assert.equal(
    clearActivePostReadyTask(target, { expectedTaskKey: "first" }),
    true,
  );
  assert.equal(target.activePostReadyTaskKey, "");
  assert.equal(target.activePostReadyTaskStartedAt, 0);
});

test("remaining startup actions preserve reference and boolean semantics", () => {
  const target = {};
  const observer = { disconnect() {} };
  const promotion = { ok: true, reason: "chunk-ready" };

  assert.equal(setLongAnimationFrameObserver(target, observer), observer);
  assert.equal(
    setStartupInitialScenarioChunkVisualPromotion(target, promotion),
    promotion,
  );
  assert.equal(setUiShellDebugState(target, 1), true);
  assert.equal(setUiShellDebugTerritorySeededState(target, 0), false);
  assert.equal(target.longAnimationFrameObserver, observer);
  assert.equal(target.startupInitialScenarioChunkVisualPromotion, promotion);
  assert.equal(target.uiShellDebug, true);
  assert.equal(target.uiShellDebugTerritorySeeded, false);
});

test("boot action methods fail closed for invalid targets", () => {
  assert.equal(setStartupInteractionMode(null, "full"), "readonly");
  assert.equal(setBootPreviewVisibleState(null, true), false);
  assert.equal(setBootStateFields(null, { phase: "ready" }), null);
  assert.deepEqual(replaceBootMetricsState(null, { totalMs: 1 }), {});
  assert.deepEqual(replaceStartupBootCacheState(null, { enabled: true }), {});
  assert.deepEqual(replaceSampleProjectDeeplinkState(null, { status: "ready" }), {});
  assert.deepEqual(replacePostReadyTaskDiagnostics(null, { pendingTaskCount: 0 }), {});
  assert.equal(setStartupScenarioBootstrapCacheStatus(null, "ready"), "");
  assert.equal(setActivePostReadyTask(null, { taskKey: "x", startedAt: 1 }), "");
  assert.equal(clearActivePostReadyTask(null), false);
  assert.equal(setLongAnimationFrameObserver(null, {}), null);
  assert.equal(setStartupInitialScenarioChunkVisualPromotion(null, {}), null);
  assert.equal(setUiShellDebugState(null, true), false);
  assert.equal(setUiShellDebugTerritorySeededState(null, true), false);
});

test("compatibility interaction wrapper retains normalization behavior", () => {
  const target = createDefaultBootState();

  assert.equal(setStartupInteractionModeCompat(target, " FULL "), "full");
  assert.equal(setStartupInteractionModeCompat(target, "unexpected"), "readonly");
  assert.throws(() => setBootStateFields(target, null), TypeError);
  assert.throws(() => setBootStateFieldsCompat(target, null), TypeError);
});
