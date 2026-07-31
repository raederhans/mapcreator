import assert from "node:assert/strict";
import test from "node:test";

import { state } from "../js/core/state.js";
import {
  STATE_HANDLER_HOOK_NAMES,
  STATE_NOTIFICATION_HOOK_NAMES,
} from "../js/core/state/config.js";
import { emit, off, on } from "../js/core/state/bus.js";
import {
  bindStateCompatSurface,
  callRuntimeHook,
  emitRuntimeHookBusEvent,
  readRegisteredRuntimeHookSource,
  registerRuntimeHandler,
  registerRuntimeHook,
  subscribeRuntimeNotification,
} from "../js/core/state/index.js";

test("runtime hook catalog adds first-visible notification without changing handler count", () => {
  assert.equal(STATE_NOTIFICATION_HOOK_NAMES.length, 48);
  assert.equal(STATE_HANDLER_HOOK_NAMES.length, 39);
  assert.ok(STATE_NOTIFICATION_HOOK_NAMES.includes("noteFirstVisibleFramePaintedFn"));
  assert.equal(new Set([...STATE_NOTIFICATION_HOOK_NAMES, ...STATE_HANDLER_HOOK_NAMES]).size, 87);
  assert.equal(Object.keys(state).length, 489);
});

test("legacy notification slot exposes its source, restores multi-argument calls, and replaces only itself", () => {
  const target = bindStateCompatSurface({});
  const calls = [];
  const first = (...args) => calls.push(["first", ...args]);
  const second = (...args) => calls.push(["second", ...args]);

  try {
    const firstDispatcher = registerRuntimeHook(target, "updateRecentUI", first);
    assert.equal(readRegisteredRuntimeHookSource(target, "updateRecentUI"), first);
    const capturedSource = readRegisteredRuntimeHookSource(target, "updateRecentUI");
    firstDispatcher("a", "b");

    const secondDispatcher = registerRuntimeHook(target, "updateRecentUI", second);
    assert.equal(firstDispatcher, secondDispatcher);
    assert.equal(readRegisteredRuntimeHookSource(target, "updateRecentUI"), second);
    secondDispatcher("c", "d");
    registerRuntimeHook(target, "updateRecentUI", capturedSource);
    secondDispatcher("e", "f");

    assert.deepEqual(calls, [
      ["first", "a", "b"],
      ["second", "c", "d"],
      ["first", "e", "f"],
    ]);
  } finally {
    registerRuntimeHook(target, "updateRecentUI", null);
  }
});

test("legacy notification property replacement preserves explicit subscribers", () => {
  const target = bindStateCompatSurface({});
  const calls = [];
  const subscription = subscribeRuntimeNotification(target, "updateHistoryUIFn", (value) => {
    calls.push(`explicit:${value}`);
  });

  try {
    target.updateHistoryUIFn = (value) => calls.push(`legacy-first:${value}`);
    target.updateHistoryUIFn("one");
    target.updateHistoryUIFn = (value) => calls.push(`legacy-second:${value}`);
    target.updateHistoryUIFn("two");

    assert.deepEqual(calls, [
      "explicit:one",
      "legacy-first:one",
      "explicit:two",
      "legacy-second:two",
    ]);
  } finally {
    target.updateHistoryUIFn = null;
    subscription.dispose();
  }
});

test("explicit notification subscriptions fan out in registration order and dispose independently", () => {
  const target = {};
  const calls = [];
  const first = subscribeRuntimeNotification(target, "updateLegendUI", (...args) => calls.push(["first", ...args]));
  const second = subscribeRuntimeNotification(target, "updateLegendUI", (...args) => calls.push(["second", ...args]));

  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(second));
  assert.equal(typeof first.dispose, "function");
  assert.equal(typeof first.dispatcher, "function");

  first.dispatcher(1, 2);
  first.dispose();
  first.dispose();
  second.dispatcher(3);
  second.dispose();

  assert.deepEqual(calls, [
    ["first", 1, 2],
    ["second", 1, 2],
    ["second", 3],
  ]);
});

test("bus emission uses a listener snapshot when listeners mutate subscriptions", () => {
  const eventName = "test:runtime-hook:snapshot";
  const calls = [];
  const third = () => calls.push("third");
  const second = () => calls.push("second");
  const first = () => {
    calls.push("first");
    off(eventName, second);
    on(eventName, third);
  };

  on(eventName, first);
  on(eventName, second);
  try {
    emit(eventName, null);
    assert.deepEqual(calls, ["first", "second"]);
    calls.length = 0;
    emit(eventName, null);
    assert.deepEqual(calls, ["first", "third"]);
  } finally {
    off(eventName);
  }
});

test("bus emission runs every listener before throwing aggregate errors", () => {
  const eventName = "test:runtime-hook:aggregate";
  const calls = [];
  const firstError = new Error("first failure");
  const secondError = new TypeError("second failure");

  on(eventName, () => {
    calls.push("first");
    throw firstError;
  });
  on(eventName, () => calls.push("middle"));
  on(eventName, () => {
    calls.push("last");
    throw secondError;
  });

  try {
    assert.throws(
      () => emit(eventName, null),
      (error) => {
        assert.ok(error instanceof AggregateError);
        assert.deepEqual(error.errors, [firstError, secondError]);
        return true;
      },
    );
    assert.deepEqual(calls, ["first", "middle", "last"]);
  } finally {
    off(eventName);
  }
});

test("bus emission preserves a single listener error after running the full snapshot", () => {
  const eventName = "test:runtime-hook:single-error";
  const calls = [];
  const listenerError = Object.assign(new Error("listener failed"), {
    code: "LISTENER_FAIL",
  });

  on(eventName, () => {
    calls.push("first");
    throw listenerError;
  });
  on(eventName, () => calls.push("second"));

  try {
    assert.throws(() => emit(eventName, null), (error) => error === listenerError);
    assert.deepEqual(calls, ["first", "second"]);
  } finally {
    off(eventName);
  }
});

test("handler token disposal cannot clear a newer owner", () => {
  const target = {};
  const first = registerRuntimeHandler(target, "toggleLeftPanelFn", () => "first");
  const secondSource = () => "second";
  const second = registerRuntimeHandler(target, "toggleLeftPanelFn", secondSource);

  assert.ok(Object.isFrozen(first));
  assert.equal(first.dispatcher, second.dispatcher);
  first.dispose();
  assert.equal(callRuntimeHook(target, "toggleLeftPanelFn"), "second");
  assert.equal(readRegisteredRuntimeHookSource(target, "toggleLeftPanelFn"), secondSource);
  second.dispose();
  second.dispose();
  assert.equal(callRuntimeHook(target, "toggleLeftPanelFn"), undefined);
});

test("legacy handler registration still returns a stable dispatcher and replaces its source", () => {
  const target = {};
  const firstSource = () => "first";
  const secondSource = () => "second";

  const firstDispatcher = registerRuntimeHook(target, "toggleRightPanelFn", firstSource);
  const secondDispatcher = registerRuntimeHook(target, "toggleRightPanelFn", secondSource);
  assert.equal(firstDispatcher, secondDispatcher);
  assert.equal(secondDispatcher(), "second");
  assert.equal(readRegisteredRuntimeHookSource(target, "toggleRightPanelFn"), secondSource);

  registerRuntimeHook(target, "toggleRightPanelFn", null);
  assert.equal(callRuntimeHook(target, "toggleRightPanelFn"), undefined);
});

test("strict subscription and handler APIs reject unknown or wrong-category hooks", () => {
  assert.throws(
    () => subscribeRuntimeNotification({}, "unknownHookFn", () => {}),
    /Unknown runtime notification hook/,
  );
  assert.throws(
    () => subscribeRuntimeNotification({}, "toggleDockFn", () => {}),
    /Unknown runtime notification hook/,
  );
  assert.throws(
    () => registerRuntimeHandler({}, "unknownHookFn", () => {}),
    /Unknown runtime handler hook/,
  );
  assert.throws(
    () => registerRuntimeHandler({}, "updateRecentUI", () => {}),
    /Unknown runtime handler hook/,
  );

  assert.equal(registerRuntimeHook({}, "unknownHookFn", () => {}), null);
  assert.equal(callRuntimeHook({}, "unknownHookFn"), undefined);
});

test("first-visible notification supports explicit fanout", () => {
  const calls = [];
  const first = subscribeRuntimeNotification({}, "noteFirstVisibleFramePaintedFn", (reason) => calls.push(`first:${reason}`));
  const second = subscribeRuntimeNotification({}, "noteFirstVisibleFramePaintedFn", (reason) => calls.push(`second:${reason}`));
  try {
    emitRuntimeHookBusEvent(null, "noteFirstVisibleFramePaintedFn", "exact-frame");
    assert.deepEqual(calls, ["first:exact-frame", "second:exact-frame"]);
  } finally {
    first.dispose();
    second.dispose();
  }
});
