const DEFAULT_RENDER_INVALIDATION_PASSES = ["political", "borders", "labels"];

const REQUIRED_RENDERER_EFFECT_NAMES = Object.freeze([
  "clearLastGoodFrame",
  "clearRenderPassReferenceTransforms",
  "invalidateInteractionComposite",
  "invalidateBorderCache",
  "resetScenarioWaterCacheAdaptiveState",
  "invalidateRenderPasses",
  "markAllOverlaysDirty",
  "updateZoomTranslateExtent",
  "render",
]);

const RETIRED_VISUAL_INVALIDATION_PASS_INPUT_KEYS = Object.freeze([
  "targetPasses",
  "legacyTargetPasses",
]);

function normalizeStringList(values = []) {
  const result = [];
  const seen = new Set();
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function getRequiredRendererEffect(deps, name) {
  const effect = deps?.[name];
  if (typeof effect !== "function") {
    throw new TypeError(`createScenarioVisualInvalidationExecutor requires ${name} dependency.`);
  }
  return effect;
}

function findRetiredVisualInvalidationPassInputKey(inputs = {}) {
  return RETIRED_VISUAL_INVALIDATION_PASS_INPUT_KEYS.find((key) => (
    Object.prototype.hasOwnProperty.call(inputs, key)
  ));
}

function assertExecutionPlanHasNoRetiredPassFields(executionPlan, topLevelInputs = {}) {
  if (executionPlan && typeof executionPlan === "object") {
    const retiredExecutionPlanKey = findRetiredVisualInvalidationPassInputKey(executionPlan);
    if (retiredExecutionPlanKey) {
      throw new Error(
        `Scenario visual invalidation execution plans use invalidationTargetPasses; remove ${retiredExecutionPlanKey}.`
      );
    }
  }
  const retiredTopLevelInputKey = findRetiredVisualInvalidationPassInputKey(topLevelInputs);
  if (retiredTopLevelInputKey) {
    throw new Error(
      `Scenario visual invalidation inputs use executionPlan.invalidationTargetPasses; remove ${retiredTopLevelInputKey}.`
    );
  }
}

function createScenarioVisualInvalidationExecutor(deps = {}) {
  const effects = Object.fromEntries(
    REQUIRED_RENDERER_EFFECT_NAMES.map((name) => [name, getRequiredRendererEffect(deps, name)]),
  );
  const {
    clearLastGoodFrame,
    clearRenderPassReferenceTransforms,
    invalidateInteractionComposite,
    invalidateBorderCache,
    resetScenarioWaterCacheAdaptiveState,
    invalidateRenderPasses,
    markAllOverlaysDirty,
    updateZoomTranslateExtent,
    render,
  } = effects;

  function executeScenarioVisualInvalidation({
    reason = "scenario-refresh",
    suppressRender = false,
    frameGraphInvalidation = null,
    executionPlan = null,
    hasExplicitTargetResources = false,
    ...retiredInputs
  } = {}) {
    assertExecutionPlanHasNoRetiredPassFields(executionPlan, retiredInputs);
    const explicitResources = executionPlan?.hasExplicitTargetResources === true || hasExplicitTargetResources === true;
    const invalidationTargetPasses = Array.isArray(executionPlan?.invalidationTargetPasses)
      ? normalizeStringList(executionPlan.invalidationTargetPasses)
      : (explicitResources ? [] : DEFAULT_RENDER_INVALIDATION_PASSES);

    if (frameGraphInvalidation?.clearLastGoodFrame) {
      clearLastGoodFrame(`${reason}-frame-graph`);
    }
    if (frameGraphInvalidation?.clearReferenceTransforms) {
      clearRenderPassReferenceTransforms(invalidationTargetPasses);
    }
    if (frameGraphInvalidation?.clearInteractionComposite) {
      invalidateInteractionComposite(`${reason}-frame-graph`);
    }
    if (frameGraphInvalidation?.clearOpeningOwnerBorderCache) {
      invalidateBorderCache();
    }
    if (frameGraphInvalidation?.resetWaterCacheReason) {
      resetScenarioWaterCacheAdaptiveState(frameGraphInvalidation.resetWaterCacheReason);
    }
    if (invalidationTargetPasses.length) {
      invalidateRenderPasses(invalidationTargetPasses, reason);
    }
    markAllOverlaysDirty();
    updateZoomTranslateExtent();
    if (!suppressRender) {
      render();
    }

    return {
      invalidationTargetPasses,
      didInvalidateRenderPasses: invalidationTargetPasses.length > 0,
      didRender: !suppressRender,
    };
  }

  return {
    executeScenarioVisualInvalidation,
  };
}

export {
  createScenarioVisualInvalidationExecutor,
};
