import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBatchedRenderReason,
  createToolbarDirtyRenderScheduler,
  createToolbarRenderScheduler,
  normalizeRenderReason,
  shouldBatchToolbarRenderReason,
} from "../js/ui/toolbar/toolbar_render_scheduler.js";

test("toolbar render scheduler batches same-frame render requests", () => {
  const frameCallbacks = [];
  const calls = [];
  const scheduler = createToolbarRenderScheduler({
    requestRender: (reason) => calls.push(reason),
    requestAnimationFrameRef: (callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    },
  });

  scheduler.schedule("urban-opacity");
  scheduler.schedule("transport-appearance");
  scheduler.schedule("urban-opacity");

  assert.equal(calls.length, 0);
  assert.equal(frameCallbacks.length, 1);
  assert.deepEqual(scheduler.getPendingReasons(), ["urban-opacity", "transport-appearance"]);

  frameCallbacks[0]();

  assert.deepEqual(calls, ["toolbar-batch:urban-opacity,transport-appearance"]);
  assert.equal(scheduler.hasPendingFrame(), false);
});

test("toolbar render scheduler preserves a single reason without batch prefix", () => {
  const calls = [];
  const scheduler = createToolbarRenderScheduler({
    requestRender: (reason) => calls.push(reason),
    requestAnimationFrameRef: (callback) => {
      callback();
      return 1;
    },
  });

  scheduler.schedule("city-points-opacity");

  assert.deepEqual(calls, ["city-points-opacity"]);
  assert.equal(scheduler.hasPendingFrame(), false);
});

test("toolbar render scheduler falls back to timeout when raf is absent", () => {
  const calls = [];
  const timeoutCallbacks = [];
  const scheduler = createToolbarRenderScheduler({
    requestRender: (reason) => calls.push(reason),
    requestAnimationFrameRef: null,
    setTimeoutRef: (callback) => {
      timeoutCallbacks.push(callback);
      return 9;
    },
  });

  const frameId = scheduler.schedule("physical-opacity");
  assert.equal(frameId, 9);
  assert.equal(calls.length, 0);

  timeoutCallbacks[0]();

  assert.deepEqual(calls, ["physical-opacity"]);
});

test("toolbar render reason helpers normalize empty and repeated input", () => {
  assert.equal(normalizeRenderReason(""), "toolbar-render");
  assert.equal(buildBatchedRenderReason(["a", "a", "b"]), "toolbar-batch:a,b");
  assert.equal(buildBatchedRenderReason(["only"]), "only");
});

test("toolbar render batching is limited to high-frequency control reasons", () => {
  [
    "urban-opacity",
    "parent-border-width",
    "physical-contour-major-interval",
    "transport-airport-opacity",
    "transport-road-coverage-reach",
    "texture-style-input",
    "day-night-city-lights-intensity",
  ].forEach((reason) => {
    assert.equal(shouldBatchToolbarRenderReason(reason), true, reason);
  });

  [
    "toggle-urban",
    "appearance-preset-apply",
    "physical-preset-select",
    "transport-airport-label-density",
    "internal-border-color-mode",
    "texture-style",
  ].forEach((reason) => {
    assert.equal(shouldBatchToolbarRenderReason(reason), false, reason);
  });
});

test("toolbar render scheduler recovers after a synchronous fallback frame", () => {
  const calls = [];
  const scheduler = createToolbarRenderScheduler({
    requestRender: (reason) => calls.push(reason),
    requestAnimationFrameRef: null,
    setTimeoutRef: null,
  });

  scheduler.schedule("first");
  scheduler.schedule("second");

  assert.deepEqual(calls, ["first", "second"]);
  assert.equal(scheduler.hasPendingFrame(), false);
});

test("toolbar dirty render scheduler marks every edit and batches only render", () => {
  const frameCallbacks = [];
  const dirtyReasons = [];
  const renderReasons = [];
  const scheduler = createToolbarDirtyRenderScheduler({
    markDirty: (reason) => dirtyReasons.push(reason),
    requestRender: (reason) => renderReasons.push(reason),
    requestAnimationFrameRef: (callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    },
  });

  scheduler.schedule("urban-opacity");
  scheduler.schedule("urban-stroke-opacity");

  assert.deepEqual(dirtyReasons, ["urban-opacity", "urban-stroke-opacity"]);
  assert.deepEqual(renderReasons, []);
  assert.equal(frameCallbacks.length, 1);

  frameCallbacks[0]();

  assert.deepEqual(renderReasons, ["toolbar-batch:urban-opacity,urban-stroke-opacity"]);
});
