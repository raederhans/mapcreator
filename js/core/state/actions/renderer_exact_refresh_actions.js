// Canonical exact-after-settle renderer state mutations.
// Scheduling, timers, rendering, metrics, and identity reads stay in composition roots.

const ACTIVE_EXACT_AFTER_SETTLE_PHASES = new Set([
  "scheduled",
  "applying",
  "awaiting-paint",
  "finalizing",
]);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[renderer_exact_refresh_actions] target must be an object");
  }
}

function createDefaultExactAfterSettleControllerState() {
  return {
    generation: 0,
    phase: "idle",
    startedAt: 0,
    scheduledAt: 0,
    applyStartedAt: 0,
    applyFinishedAt: 0,
    scenarioId: "",
    selectionVersion: 0,
    topologyRevision: 0,
    dpr: 1,
    pixelWidth: 0,
    pixelHeight: 0,
    colorRevision: 0,
    contextFlagSignature: "",
    zoomToken: 0,
    transformBucket: "",
    pendingPlan: null,
    reason: "init",
  };
}

function cloneExactAfterSettlePendingPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new TypeError("[renderer_exact_refresh_actions] plan must be an object");
  }
  const clone = { ...plan };
  if (plan.resolvedProfile && typeof plan.resolvedProfile === "object") {
    clone.resolvedProfile = { ...plan.resolvedProfile };
  }
  if (plan.reuseDecision && typeof plan.reuseDecision === "object") {
    clone.reuseDecision = { ...plan.reuseDecision };
    if (
      plan.reuseDecision.referenceTransform
      && typeof plan.reuseDecision.referenceTransform === "object"
    ) {
      clone.reuseDecision.referenceTransform = {
        ...plan.reuseDecision.referenceTransform,
      };
    }
    if (
      plan.reuseDecision.currentTransform
      && typeof plan.reuseDecision.currentTransform === "object"
    ) {
      clone.reuseDecision.currentTransform = {
        ...plan.reuseDecision.currentTransform,
      };
    }
  }
  if (Array.isArray(plan.exactTargetPasses)) {
    clone.exactTargetPasses = [...plan.exactTargetPasses];
  }
  if (Array.isArray(plan.deferredExactTargetPasses)) {
    clone.deferredExactTargetPasses = [...plan.deferredExactTargetPasses];
  }
  if (
    plan.deferredExactContextIdentity
    && typeof plan.deferredExactContextIdentity === "object"
  ) {
    clone.deferredExactContextIdentity = {
      ...plan.deferredExactContextIdentity,
    };
  }
  return clone;
}

export function ensureExactAfterSettleControllerState(target) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || typeof target.exactAfterSettleController !== "object"
    || Array.isArray(target.exactAfterSettleController)
  ) {
    target.exactAfterSettleController = createDefaultExactAfterSettleControllerState();
  }
  if (!("generation" in target.exactAfterSettleController)) target.exactAfterSettleController.generation = 0;
  if (!("phase" in target.exactAfterSettleController)) target.exactAfterSettleController.phase = "idle";
  if (!("startedAt" in target.exactAfterSettleController)) target.exactAfterSettleController.startedAt = 0;
  if (!("scheduledAt" in target.exactAfterSettleController)) target.exactAfterSettleController.scheduledAt = 0;
  if (!("applyStartedAt" in target.exactAfterSettleController)) target.exactAfterSettleController.applyStartedAt = 0;
  if (!("applyFinishedAt" in target.exactAfterSettleController)) target.exactAfterSettleController.applyFinishedAt = 0;
  if (!("scenarioId" in target.exactAfterSettleController)) target.exactAfterSettleController.scenarioId = "";
  if (!("selectionVersion" in target.exactAfterSettleController)) target.exactAfterSettleController.selectionVersion = 0;
  if (!("topologyRevision" in target.exactAfterSettleController)) target.exactAfterSettleController.topologyRevision = 0;
  if (!("dpr" in target.exactAfterSettleController)) target.exactAfterSettleController.dpr = 1;
  if (!("pixelWidth" in target.exactAfterSettleController)) target.exactAfterSettleController.pixelWidth = 0;
  if (!("pixelHeight" in target.exactAfterSettleController)) target.exactAfterSettleController.pixelHeight = 0;
  if (!("colorRevision" in target.exactAfterSettleController)) target.exactAfterSettleController.colorRevision = 0;
  if (!("contextFlagSignature" in target.exactAfterSettleController)) target.exactAfterSettleController.contextFlagSignature = "";
  if (!("zoomToken" in target.exactAfterSettleController)) target.exactAfterSettleController.zoomToken = 0;
  if (!("transformBucket" in target.exactAfterSettleController)) target.exactAfterSettleController.transformBucket = "";
  if (!("pendingPlan" in target.exactAfterSettleController)) target.exactAfterSettleController.pendingPlan = null;
  if (!("reason" in target.exactAfterSettleController)) target.exactAfterSettleController.reason = "init";
  return true;
}

export function resetExactAfterSettleControllerState(
  target,
  { reason = "reset", generation = null } = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || typeof target.exactAfterSettleController !== "object"
    || Array.isArray(target.exactAfterSettleController)
  ) {
    target.exactAfterSettleController = createDefaultExactAfterSettleControllerState();
  }
  if (
    generation !== null
    && Number(target.exactAfterSettleController.generation || 0) !== Number(generation || 0)
  ) return false;
  const nextGeneration = Number(target.exactAfterSettleController.generation || 0) + 1;
  target.exactAfterSettleController.generation = nextGeneration;
  target.exactAfterSettleController.phase = "idle";
  target.exactAfterSettleController.startedAt = 0;
  target.exactAfterSettleController.scheduledAt = 0;
  target.exactAfterSettleController.applyStartedAt = 0;
  target.exactAfterSettleController.applyFinishedAt = 0;
  target.exactAfterSettleController.scenarioId = "";
  target.exactAfterSettleController.selectionVersion = 0;
  target.exactAfterSettleController.topologyRevision = 0;
  target.exactAfterSettleController.dpr = 1;
  target.exactAfterSettleController.pixelWidth = 0;
  target.exactAfterSettleController.pixelHeight = 0;
  target.exactAfterSettleController.colorRevision = 0;
  target.exactAfterSettleController.contextFlagSignature = "";
  target.exactAfterSettleController.zoomToken = 0;
  target.exactAfterSettleController.transformBucket = "";
  target.exactAfterSettleController.pendingPlan = null;
  target.exactAfterSettleController.reason = String(reason || "reset");
  return true;
}

export function isExactAfterSettleGenerationCurrentState(
  target,
  generation,
  phase = "",
) {
  assertStateTarget(target);
  const controller = target.exactAfterSettleController;
  return Boolean(controller)
    && Number(controller.generation || 0) === Number(generation || 0)
    && (!phase || String(controller.phase || "") === phase);
}

export function isExactAfterSettleControllerActiveState(target) {
  assertStateTarget(target);
  const phase = String(target.exactAfterSettleController?.phase || "idle");
  return ACTIVE_EXACT_AFTER_SETTLE_PHASES.has(phase);
}

export function refreshExactAfterSettleControllerIdentityState(
  target,
  identity = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || typeof target.exactAfterSettleController !== "object"
    || Array.isArray(target.exactAfterSettleController)
  ) {
    target.exactAfterSettleController = createDefaultExactAfterSettleControllerState();
  }
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new TypeError("[renderer_exact_refresh_actions] identity must be an object");
  }
  target.exactAfterSettleController.scenarioId = identity.scenarioId;
  target.exactAfterSettleController.selectionVersion = identity.selectionVersion;
  target.exactAfterSettleController.topologyRevision = identity.topologyRevision;
  target.exactAfterSettleController.dpr = identity.dpr;
  target.exactAfterSettleController.pixelWidth = identity.pixelWidth;
  target.exactAfterSettleController.pixelHeight = identity.pixelHeight;
  target.exactAfterSettleController.colorRevision = identity.colorRevision;
  target.exactAfterSettleController.contextFlagSignature = identity.contextFlagSignature;
  target.exactAfterSettleController.zoomToken = identity.zoomToken;
  target.exactAfterSettleController.transformBucket = identity.transformBucket;
  return true;
}

export function beginExactAfterSettleControllerScheduleState(
  target,
  { scheduleStartedAt, identity } = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || typeof target.exactAfterSettleController !== "object"
    || Array.isArray(target.exactAfterSettleController)
  ) {
    target.exactAfterSettleController = createDefaultExactAfterSettleControllerState();
  }
  const nextGeneration = Number(target.exactAfterSettleController.generation || 0) + 1;
  target.exactAfterSettleController.generation = nextGeneration;
  target.exactAfterSettleController.phase = "scheduled";
  target.exactAfterSettleController.startedAt = scheduleStartedAt;
  target.exactAfterSettleController.scheduledAt = scheduleStartedAt;
  target.exactAfterSettleController.applyStartedAt = 0;
  target.exactAfterSettleController.applyFinishedAt = 0;
  target.exactAfterSettleController.pendingPlan = null;
  target.exactAfterSettleController.reason = "scheduled";
  target.exactAfterSettleController.scenarioId = identity?.scenarioId;
  target.exactAfterSettleController.selectionVersion = identity?.selectionVersion;
  target.exactAfterSettleController.topologyRevision = identity?.topologyRevision;
  target.exactAfterSettleController.dpr = identity?.dpr;
  target.exactAfterSettleController.pixelWidth = identity?.pixelWidth;
  target.exactAfterSettleController.pixelHeight = identity?.pixelHeight;
  target.exactAfterSettleController.colorRevision = identity?.colorRevision;
  target.exactAfterSettleController.contextFlagSignature = identity?.contextFlagSignature;
  target.exactAfterSettleController.zoomToken = identity?.zoomToken;
  target.exactAfterSettleController.transformBucket = identity?.transformBucket;
  return nextGeneration;
}

export function beginExactAfterSettleControllerApplyState(
  target,
  {
    generation,
    plan,
    applyStartedAt,
    identity,
  } = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || Number(target.exactAfterSettleController.generation || 0) !== Number(generation || 0)
    || String(target.exactAfterSettleController.phase || "") !== "scheduled"
  ) return false;
  target.exactAfterSettleController.phase = "applying";
  target.exactAfterSettleController.pendingPlan =
    cloneExactAfterSettlePendingPlan(plan);
  target.exactAfterSettleController.applyStartedAt = applyStartedAt;
  target.exactAfterSettleController.reason = "applying";
  target.exactAfterSettleController.scenarioId = identity?.scenarioId;
  target.exactAfterSettleController.selectionVersion = identity?.selectionVersion;
  target.exactAfterSettleController.topologyRevision = identity?.topologyRevision;
  target.exactAfterSettleController.dpr = identity?.dpr;
  target.exactAfterSettleController.pixelWidth = identity?.pixelWidth;
  target.exactAfterSettleController.pixelHeight = identity?.pixelHeight;
  target.exactAfterSettleController.colorRevision = identity?.colorRevision;
  target.exactAfterSettleController.contextFlagSignature = identity?.contextFlagSignature;
  target.exactAfterSettleController.zoomToken = identity?.zoomToken;
  target.exactAfterSettleController.transformBucket = identity?.transformBucket;
  return true;
}

export function replaceExactAfterSettlePendingPlanState(
  target,
  { generation, plan } = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || Number(target.exactAfterSettleController.generation || 0) !== Number(generation || 0)
    || String(target.exactAfterSettleController.phase || "") !== "applying"
  ) return false;
  target.exactAfterSettleController.pendingPlan =
    cloneExactAfterSettlePendingPlan(plan);
  return true;
}

export function completeExactAfterSettleControllerApplyState(
  target,
  { generation, applyFinishedAt } = {},
) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || Number(target.exactAfterSettleController.generation || 0) !== Number(generation || 0)
    || String(target.exactAfterSettleController.phase || "") !== "applying"
  ) return false;
  target.exactAfterSettleController.phase = "awaiting-paint";
  target.exactAfterSettleController.applyFinishedAt = applyFinishedAt;
  target.exactAfterSettleController.reason = "awaiting-paint";
  return true;
}

export function beginExactAfterSettleControllerFinalizeState(target, generation) {
  assertStateTarget(target);
  if (
    !target.exactAfterSettleController
    || Number(target.exactAfterSettleController.generation || 0) !== Number(generation || 0)
    || String(target.exactAfterSettleController.phase || "") !== "awaiting-paint"
  ) return false;
  target.exactAfterSettleController.phase = "finalizing";
  target.exactAfterSettleController.reason = "finalizing";
  return true;
}

export function setDeferExactAfterSettleState(target, deferred) {
  assertStateTarget(target);
  const nextDeferred = Boolean(deferred);
  target.deferExactAfterSettle = nextDeferred;
  return nextDeferred;
}

export function setPendingExactPoliticalFastFrameState(target, pending) {
  assertStateTarget(target);
  const nextPending = Boolean(pending);
  target.pendingExactPoliticalFastFrame = nextPending;
  return nextPending;
}

export function setExactAfterSettleHandleState(target, handle = null) {
  assertStateTarget(target);
  target.exactAfterSettleHandle = handle;
  return handle;
}
