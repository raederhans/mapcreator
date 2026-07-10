import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRendererRuntimeContext,
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

const HIT_HOVER_ACCESSOR_NAMES = Object.freeze([
  "hasHitCanvasRuntime",
  "isHitCanvasDirty",
  "isHitCanvasBuildDeferred",
  "getRenderPhase",
  "getScheduledHitCanvasBuildHandle",
  "getActiveScenarioId",
  "hasHoverData",
  "isSpecialZoneEditorActive",
  "isReducedHoverPhase",
  "getHoverIds",
  "hasTooltip",
  "getHoveredFacilityEntry",
  "getFeatureForHit",
]);

function createModel(overrides = {}) {
  return {
    hasHitCanvasRuntime: true,
    hitCanvasDirty: true,
    hitCanvasBuildDeferred: false,
    renderPhase: "idle",
    scheduledHandle: null,
    activeScenarioId: "scenario-a",
    hasHoverData: true,
    specialZoneEditorActive: false,
    reducedHoverPhase: false,
    hoverIds: { landId: "land-a", waterId: null, specialId: null },
    hasTooltip: true,
    hoveredFacilityEntry: { id: "facility-a" },
    features: new Map([["land:land-a", { id: "land-a" }]]),
    ...overrides,
  };
}

function createHitHoverDescriptor(model, overrides = {}) {
  const accessors = {
    hasHitCanvasRuntime: () => model.hasHitCanvasRuntime,
    isHitCanvasDirty: () => model.hitCanvasDirty,
    isHitCanvasBuildDeferred: () => model.hitCanvasBuildDeferred,
    getRenderPhase: () => model.renderPhase,
    getScheduledHitCanvasBuildHandle: () => model.scheduledHandle,
    getActiveScenarioId: () => model.activeScenarioId,
    hasHoverData: () => model.hasHoverData,
    isSpecialZoneEditorActive: () => model.specialZoneEditorActive,
    isReducedHoverPhase: () => model.reducedHoverPhase,
    getHoverIds: () => model.hoverIds,
    hasTooltip: () => model.hasTooltip,
    getHoveredFacilityEntry: () => model.hoveredFacilityEntry,
    getFeatureForHit: (hit) => model.features.get(`${hit?.targetType}:${hit?.id}`) || null,
    ...(overrides.accessors || {}),
  };
  return {
    constants: {
      renderPhaseIdle: "idle",
      hoverSnapPx: 0,
      ...(overrides.constants || {}),
    },
    accessors,
  };
}

function createInteractionDescriptor(runtimeState, rendererSurfaceHost, hitHover) {
  const d3 = { zoomIdentity: { x: 0, y: 0, k: 1 } };
  return {
    constants: {
      minZoomScale: 0.35,
      maxZoomScale: 50,
      renderPhaseInteracting: "interacting",
      renderPhaseSettling: "settling",
    },
    helpers: {
      cloneZoomTransform: (transform) => ({ ...transform }),
      shouldAllowZoomEvent: () => true,
    },
    accessors: {
      getRuntimeState: () => runtimeState,
      getSurfaceHost: () => rendererSurfaceHost,
      getD3: () => d3,
      getWidth: () => runtimeState.width,
      getHeight: () => runtimeState.height,
      getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),
      getInteractionRectNode: () => rendererSurfaceHost.getInteractionRect()?.node?.(),
      getWindow: () => globalThis,
      getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),
      getZoomIdentity: () => d3.zoomIdentity,
      getZoomTransform: () => runtimeState.zoomTransform,
      getPendingZoomTransform: () => runtimeState.pendingZoomTransform,
      getZoomGestureStartTransform: () => runtimeState.zoomGestureStartTransform,
      isZoomRenderScheduled: () => runtimeState.zoomRenderScheduled,
    },
    hitHover,
  };
}

function createContextFixture(options = {}) {
  const runtimeState = options.runtimeState || {
    width: 800,
    height: 600,
    zoomTransform: { x: 0, y: 0, k: 1 },
    pendingZoomTransform: null,
    zoomGestureStartTransform: null,
    zoomRenderScheduled: false,
  };
  const rendererSurfaceHost = createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      interactionRect: { node: () => ({ id: "interaction-node" }) },
      zoomBehavior: { id: "zoom" },
    },
  });
  const model = options.model || createModel();
  const hitHover = Object.hasOwn(options, "hitHover")
    ? options.hitHover
    : createHitHoverDescriptor(model, options.hitHoverOverrides);
  const context = createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    interaction: createInteractionDescriptor(runtimeState, rendererSurfaceHost, hitHover),
    ownerTag: "hit-hover-test",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  return { context, hitHover, model };
}

function collectObjectKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object") return keys;
  for (const [key, nestedValue] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(nestedValue, keys);
  }
  return keys;
}

test("hitHover exposes the exact frozen constants and stable live accessor identities", () => {
  const { context, hitHover, model } = createContextFixture();
  const capsule = context.interaction.hitHover;

  assertRendererRuntimeContext(context);
  assert.equal(Object.isFrozen(capsule), true);
  assert.equal(Object.isFrozen(capsule.constants), true);
  assert.deepEqual(Object.keys(capsule), ["constants", ...HIT_HOVER_ACCESSOR_NAMES]);
  assert.deepEqual(Object.keys(capsule.constants), ["renderPhaseIdle", "hoverSnapPx"]);
  assert.deepEqual(capsule.constants, { renderPhaseIdle: "idle", hoverSnapPx: 0 });
  for (const accessorName of HIT_HOVER_ACCESSOR_NAMES) {
    assert.equal(capsule[accessorName], hitHover.accessors[accessorName]);
  }

  assert.equal(capsule.hasHitCanvasRuntime(), true);
  assert.equal(capsule.isHitCanvasDirty(), true);
  assert.equal(capsule.getActiveScenarioId(), "scenario-a");
  assert.deepEqual(capsule.getHoverIds(), model.hoverIds);
  assert.equal(capsule.getHoveredFacilityEntry(), model.hoveredFacilityEntry);
  assert.deepEqual(capsule.getFeatureForHit({ targetType: "land", id: "land-a" }), { id: "land-a" });

  model.hasHitCanvasRuntime = false;
  model.hitCanvasDirty = false;
  model.activeScenarioId = "scenario-b";
  model.hoverIds = { landId: null, waterId: "water-b", specialId: null };
  model.hoveredFacilityEntry = null;
  model.features.set("water:water-b", { id: "water-b" });

  assert.equal(capsule.hasHitCanvasRuntime(), false);
  assert.equal(capsule.isHitCanvasDirty(), false);
  assert.equal(capsule.getActiveScenarioId(), "scenario-b");
  assert.deepEqual(capsule.getHoverIds(), model.hoverIds);
  assert.equal(capsule.getHoveredFacilityEntry(), null);
  assert.deepEqual(capsule.getFeatureForHit({ targetType: "water", id: "water-b" }), { id: "water-b" });
});

test("hitHover validation and JSON-safe description never invoke dynamic accessors", () => {
  let accessorCallCount = 0;
  const accessors = Object.fromEntries(HIT_HOVER_ACCESSOR_NAMES.map((name) => [name, () => {
    accessorCallCount += 1;
    throw new Error(`${name} must not be invoked during validation`);
  }]));
  const { context } = createContextFixture({
    hitHover: {
      constants: { renderPhaseIdle: "idle", hoverSnapPx: 2 },
      accessors,
    },
  });

  assert.equal(accessorCallCount, 0);
  assertRendererRuntimeContext(context);
  const description = describeRendererRuntimeContext(context);
  const json = JSON.stringify(description);

  assert.equal(accessorCallCount, 0);
  assert.deepEqual(description.sections.interaction.hitHover.constants, {
    renderPhaseIdle: "idle",
    hoverSnapPx: 2,
  });
  assert.deepEqual(description.sections.interaction.hitHover.accessors.getFeatureForHit, {
    present: true,
    type: "function",
  });
  assert.equal(json.includes("must not be invoked"), false);
  assert.equal(json.includes("=>"), false);
});

test("hitHover fails fast on missing shape invalid constants and non-function accessors", () => {
  assert.throws(
    () => createContextFixture({ hitHover: null }),
    /interaction\.hitHover must be an object/,
  );
  assert.throws(
    () => createContextFixture({
      hitHoverOverrides: { constants: { renderPhaseIdle: "" } },
    }),
    /interaction\.hitHover\.constants\.renderPhaseIdle must be a non-empty string/,
  );
  assert.throws(
    () => createContextFixture({
      hitHoverOverrides: { constants: { hoverSnapPx: Number.NaN } },
    }),
    /interaction\.hitHover\.constants\.hoverSnapPx must be a finite number/,
  );
  assert.throws(
    () => createContextFixture({
      hitHoverOverrides: { constants: { hoverSnapPx: -1 } },
    }),
    /interaction\.hitHover\.constants\.hoverSnapPx must be non-negative/,
  );
  assert.throws(
    () => createContextFixture({
      hitHoverOverrides: { accessors: { getFeatureForHit: null } },
    }),
    /interaction\.hitHover\.accessors\.getFeatureForHit must be a function/,
  );
});

test("hitHover excludes timing event resolution scheduling metrics writes UI and DOM capabilities", () => {
  const { context } = createContextFixture();
  const exposedKeys = collectObjectKeys(context.interaction.hitHover);

  for (const forbiddenName of [
    "helpers",
    "effects",
    "handlers",
    "nowMs",
    "getLastMouseMoveTime",
    "getMouseThrottleMs",
    "inspectHgoRuntimePreviewFromEvent",
    "getHitFromEvent",
    "getHoveredFacilityEntryFromEvent",
    "isFacilityDetailsSurfaceActive",
    "getHoveredCityTooltipEntry",
    "getTooltipTextForFeature",
    "scheduleDeferredWork",
    "cancelDeferredWork",
    "setScheduledHitCanvasBuildHandle",
    "runScheduledHitCanvasBuild",
    "recordRenderPerfMetric",
    "setHoverIds",
    "queueTooltipUpdate",
    "setMapInteractionCursor",
    "dispatchMapClick",
  ]) {
    assert.equal(exposedKeys.has(forbiddenName), false, `${forbiddenName} must remain root-owned`);
  }
});
