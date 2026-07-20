import assert from "node:assert/strict";
import test from "node:test";

import { initLongAnimationFrameObserver } from "../js/bootstrap/startup_bootstrap_support.js";
import { state as runtimeState } from "../js/core/state.js";
import {
  setLongAnimationFrameObserver,
} from "../js/core/state/actions/boot_actions.js";

function restoreGlobalProperty(name, hadProperty, value) {
  if (hadProperty) {
    globalThis[name] = value;
    return;
  }
  delete globalThis[name];
}

test("long animation frame observer is committed only after observe succeeds", () => {
  const hadObserverApi = Object.hasOwn(globalThis, "PerformanceObserver");
  const originalObserverApi = globalThis.PerformanceObserver;
  const originalStateObserver = runtimeState.longAnimationFrameObserver;
  const events = [];
  let observerInstance = null;

  class SuccessfulPerformanceObserver {
    constructor(callback) {
      this.callback = callback;
      observerInstance = this;
      events.push("construct");
    }

    observe(options) {
      events.push(["observe", options]);
    }
  }

  try {
    globalThis.PerformanceObserver = SuccessfulPerformanceObserver;
    setLongAnimationFrameObserver(runtimeState, null);

    initLongAnimationFrameObserver();

    assert.deepEqual(events, [
      "construct",
      ["observe", { type: "long-animation-frame", buffered: true }],
    ]);
    assert.equal(runtimeState.longAnimationFrameObserver, observerInstance);
  } finally {
    setLongAnimationFrameObserver(runtimeState, originalStateObserver);
    restoreGlobalProperty("PerformanceObserver", hadObserverApi, originalObserverApi);
  }
});

test("long animation frame observer keeps the previous state when observe throws", () => {
  const hadObserverApi = Object.hasOwn(globalThis, "PerformanceObserver");
  const originalObserverApi = globalThis.PerformanceObserver;
  const originalStateObserver = runtimeState.longAnimationFrameObserver;
  const sentinelObserver = { sentinel: true };

  class FailingPerformanceObserver {
    observe() {
      throw new Error("unsupported");
    }
  }

  try {
    globalThis.PerformanceObserver = FailingPerformanceObserver;
    setLongAnimationFrameObserver(runtimeState, sentinelObserver);

    initLongAnimationFrameObserver();

    assert.equal(runtimeState.longAnimationFrameObserver, sentinelObserver);
  } finally {
    setLongAnimationFrameObserver(runtimeState, originalStateObserver);
    restoreGlobalProperty("PerformanceObserver", hadObserverApi, originalObserverApi);
  }
});
