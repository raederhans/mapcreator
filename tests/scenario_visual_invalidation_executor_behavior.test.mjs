import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenarioVisualInvalidationExecutor,
} from "../js/core/map_renderer/scenario_visual_invalidation_executor.js";

function createExecutorDeps(calls = []) {
  return {
    clearLastGoodFrame: (...args) => calls.push(["clearLastGoodFrame", ...args]),
    clearRenderPassReferenceTransforms: (...args) => calls.push(["clearRenderPassReferenceTransforms", ...args]),
    invalidateInteractionComposite: (...args) => calls.push(["invalidateInteractionComposite", ...args]),
    invalidateBorderCache: (...args) => calls.push(["invalidateBorderCache", ...args]),
    resetScenarioWaterCacheAdaptiveState: (...args) => calls.push(["resetScenarioWaterCacheAdaptiveState", ...args]),
    invalidateRenderPasses: (...args) => calls.push(["invalidateRenderPasses", ...args]),
    markAllOverlaysDirty: (...args) => calls.push(["markAllOverlaysDirty", ...args]),
    updateZoomTranslateExtent: (...args) => calls.push(["updateZoomTranslateExtent", ...args]),
    render: (...args) => calls.push(["render", ...args]),
  };
}

function createExecutorWithCalls() {
  const calls = [];
  const deps = createExecutorDeps(calls);
  return {
    calls,
    executor: createScenarioVisualInvalidationExecutor(deps),
  };
}

test("scenario visual invalidation executor fails fast on missing renderer effects", () => {
  const deps = createExecutorDeps();
  delete deps.render;
  assert.throws(
    () => createScenarioVisualInvalidationExecutor(deps),
    /requires render dependency/,
  );
});

test("scenario visual invalidation executor preserves frame graph side-effect order", () => {
  const { calls, executor } = createExecutorWithCalls();

  const result = executor.executeScenarioVisualInvalidation({
    reason: "test-promotion",
    frameGraphInvalidation: {
      clearLastGoodFrame: true,
      clearReferenceTransforms: true,
      clearInteractionComposite: true,
      clearOpeningOwnerBorderCache: true,
      resetWaterCacheReason: "water-reset",
    },
    executionPlan: {
      invalidationTargetPasses: ["political", "labels"],
      hasExplicitTargetResources: true,
    },
  });

  assert.deepEqual(calls, [
    ["clearLastGoodFrame", "test-promotion-frame-graph"],
    ["clearRenderPassReferenceTransforms", ["political", "labels"]],
    ["invalidateInteractionComposite", "test-promotion-frame-graph"],
    ["invalidateBorderCache"],
    ["resetScenarioWaterCacheAdaptiveState", "water-reset"],
    ["invalidateRenderPasses", ["political", "labels"], "test-promotion"],
    ["markAllOverlaysDirty"],
    ["updateZoomTranslateExtent"],
    ["render"],
  ]);
  assert.deepEqual(result, {
    invalidationTargetPasses: ["political", "labels"],
    didInvalidateRenderPasses: true,
    didRender: true,
  });
});

test("scenario visual invalidation executor skips pass invalidation for explicit empty resources", () => {
  const { calls, executor } = createExecutorWithCalls();

  const result = executor.executeScenarioVisualInvalidation({
    reason: "empty-resource",
    suppressRender: true,
    frameGraphInvalidation: {
      clearReferenceTransforms: true,
    },
    executionPlan: {
      invalidationTargetPasses: [],
      hasExplicitTargetResources: true,
    },
  });

  assert.deepEqual(calls, [
    ["clearRenderPassReferenceTransforms", []],
    ["markAllOverlaysDirty"],
    ["updateZoomTranslateExtent"],
  ]);
  assert.equal(calls.some(([name]) => name === "invalidateRenderPasses"), false);
  assert.equal(calls.some(([name]) => name === "render"), false);
  assert.deepEqual(result, {
    invalidationTargetPasses: [],
    didInvalidateRenderPasses: false,
    didRender: false,
  });
});

test("scenario visual invalidation executor rejects retired execution plan targetPasses", () => {
  const { executor } = createExecutorWithCalls();

  assert.throws(
    () => executor.executeScenarioVisualInvalidation({
      executionPlan: {
        targetPasses: ["political"],
        invalidationTargetPasses: ["political"],
      },
    }),
    /invalidationTargetPasses; remove targetPasses/,
  );
});

test("scenario visual invalidation executor keeps default pass fan-out for legacy callers", () => {
  const { calls, executor } = createExecutorWithCalls();

  executor.executeScenarioVisualInvalidation({
    reason: "legacy-default",
    suppressRender: true,
  });

  assert.deepEqual(calls, [
    ["invalidateRenderPasses", ["political", "borders", "labels"], "legacy-default"],
    ["markAllOverlaysDirty"],
    ["updateZoomTranslateExtent"],
  ]);
});
