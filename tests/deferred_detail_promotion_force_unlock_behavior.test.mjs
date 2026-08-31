import assert from "node:assert/strict";
import test from "node:test";

import { createDeferredDetailPromotionOwner } from "../js/bootstrap/deferred_detail_promotion.js";

async function drainMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("forced readonly unlock schedules a ready sample exactly once when UI is ready", async () => {
  const runtimeState = {
    activeScenarioId: "tno_1962",
    bootPhase: "detail-promotion",
    detailDeferred: false,
    detailPromotionCompleted: false,
    detailPromotionInFlight: false,
    renderProfile: "balanced",
    startupReadonly: true,
    startupReadonlyUnlockInFlight: false,
    uiHydrationStatus: "ready",
  };
  let timerCallback = null;
  let sampleScheduleCount = 0;
  const bootPhases = [];
  const owner = createDeferredDetailPromotionOwner({
    runtimeState,
    helpers: {
      buildInteractionInfrastructureAfterStartup: async (options) => {
        assert.deepEqual(options, {
          chunked: true,
          buildHitCanvas: false,
          mode: "basic",
        });
        return true;
      },
      hasStartupReadonlyUnlockScheduled: () => false,
      scheduleStartupReadonlyUnlockTimer: (callback, delayMs) => {
        assert.equal(delayMs, 0);
        timerCallback = callback;
      },
      setBootState: (phase) => {
        runtimeState.bootPhase = phase;
        bootPhases.push(phase);
      },
      setStartupReadonlyState: (active, options = {}) => {
        runtimeState.startupReadonly = !!active;
        runtimeState.startupReadonlyUnlockInFlight = !!options.unlockInFlight;
      },
      tryScheduleStartupSampleProjectDeeplink: () => {
        assert.equal(runtimeState.bootPhase, "ready");
        assert.equal(runtimeState.uiHydrationStatus, "ready");
        sampleScheduleCount += 1;
        return sampleScheduleCount === 1;
      },
    },
  });

  owner.scheduleStartupReadonlyUnlock({}, {
    delayMs: 0,
    attempt: 1,
    maxAttempts: 1,
  });
  assert.equal(typeof timerCallback, "function");

  timerCallback();
  await drainMicrotasks();

  assert.deepEqual(bootPhases, ["interaction-infra", "ready"]);
  assert.equal(runtimeState.startupReadonly, false);
  assert.equal(sampleScheduleCount, 1);
});
