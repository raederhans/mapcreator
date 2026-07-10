import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRendererRuntimeContext,
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

function createInteractionDescriptor(runtimeState, rendererSurfaceHost, overrides = {}) {
  const targetWindow = overrides.targetWindow || { addEventListener() {} };
  const d3 = overrides.d3 || { zoomIdentity: { x: 0, y: 0, k: 1 } };
  const hitHoverOverrides = overrides.hitHover || {};
  return {
    constants: {
      minZoomScale: 0.35,
      maxZoomScale: 50,
      renderPhaseInteracting: "interacting",
      renderPhaseSettling: "settling",
      ...(overrides.constants || {}),
    },
    helpers: {
      cloneZoomTransform: (transform) => ({ ...transform }),
      shouldAllowZoomEvent: () => true,
      ...(overrides.helpers || {}),
    },
    accessors: {
      getRuntimeState: () => runtimeState,
      getSurfaceHost: () => rendererSurfaceHost,
      getD3: () => d3,
      getWidth: () => runtimeState.width,
      getHeight: () => runtimeState.height,
      getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),
      getInteractionRectNode: () => rendererSurfaceHost.getInteractionRect()?.node?.(),
      getWindow: () => targetWindow,
      getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),
      getZoomIdentity: () => d3.zoomIdentity,
      getZoomTransform: () => runtimeState.zoomTransform,
      getPendingZoomTransform: () => runtimeState.pendingZoomTransform,
      getZoomGestureStartTransform: () => runtimeState.zoomGestureStartTransform,
      isZoomRenderScheduled: () => runtimeState.zoomRenderScheduled,
      ...(overrides.accessors || {}),
    },
    hitHover: {
      constants: {
        renderPhaseIdle: "idle",
        hoverSnapPx: 0,
        ...(hitHoverOverrides.constants || {}),
      },
      accessors: {
        hasHitCanvasRuntime: () => false,
        isHitCanvasDirty: () => Boolean(runtimeState.hitCanvasDirty),
        isHitCanvasBuildDeferred: () => Boolean(runtimeState.deferHitCanvasBuild),
        getRenderPhase: () => runtimeState.renderPhase,
        getScheduledHitCanvasBuildHandle: () => runtimeState.hitCanvasBuildScheduled,
        getActiveScenarioId: () => runtimeState.activeScenarioId,
        hasHoverData: () => false,
        isSpecialZoneEditorActive: () => false,
        isReducedHoverPhase: () => false,
        getHoverIds: () => ({ landId: null, waterId: null, specialId: null }),
        hasTooltip: () => false,
        getHoveredFacilityEntry: () => null,
        getFeatureForHit: () => null,
        ...(hitHoverOverrides.accessors || {}),
      },
    },
  };
}

function collectObjectKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object") return keys;
  for (const [key, nestedValue] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(nestedValue, keys);
  }
  return keys;
}

function createContextFixture(overrides = {}) {
  const runtimeState = overrides.runtimeState || {
    width: 800,
    height: 600,
    zoomTransform: { x: 1, y: 2, k: 3 },
    pendingZoomTransform: null,
    zoomGestureStartTransform: null,
    zoomRenderScheduled: false,
  };
  const rendererSurfaceHost = overrides.rendererSurfaceHost || createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      interactionRect: { node: () => ({ id: "interaction-node" }) },
      zoomBehavior: { id: "zoom-a" },
    },
  });
  return createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    interaction: Object.hasOwn(overrides, "interaction")
      ? overrides.interaction
      : createInteractionDescriptor(runtimeState, rendererSurfaceHost, overrides.interactionOverrides),
    ownerTag: "interaction-test",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

test("interaction read model exposes frozen constants, read helpers, and live accessors", () => {
  const runtimeModel = {
    width: 800,
    height: 600,
    zoomTransform: { x: 1, y: 2, k: 3 },
    pendingZoomTransform: null,
    zoomGestureStartTransform: { x: 0, y: 0, k: 1 },
    zoomRenderScheduled: false,
  };
  const firstNode = { id: "node-a" };
  const d3 = { zoomIdentity: { x: 0, y: 0, k: 1 } };
  const targetWindow = { addEventListener() {} };
  const rendererSurfaceHost = createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      interactionRect: { node: () => firstNode },
      zoomBehavior: { id: "zoom-a" },
    },
  });
  const context = createContextFixture({
    runtimeState: runtimeModel,
    rendererSurfaceHost,
    interactionOverrides: { d3, targetWindow },
  });

  assertRendererRuntimeContext(context);
  assert.equal(Object.isFrozen(context.interaction), true);
  assert.equal(Object.isFrozen(context.interaction.constants), true);
  assert.equal(Object.isFrozen(context.interaction.helpers), true);
  assert.deepEqual(context.interaction.constants, {
    minZoomScale: 0.35,
    maxZoomScale: 50,
    renderPhaseInteracting: "interacting",
    renderPhaseSettling: "settling",
  });
  assert.equal(context.interaction.getRuntimeState(), runtimeModel);
  assert.equal(context.interaction.getSurfaceHost(), rendererSurfaceHost);
  assert.equal(context.interaction.getD3(), d3);
  assert.equal(context.interaction.getWindow(), targetWindow);
  assert.equal(context.interaction.getZoomIdentity(), d3.zoomIdentity);
  assert.equal(context.interaction.getWidth(), 800);
  assert.equal(context.interaction.getHeight(), 600);
  assert.equal(context.interaction.getInteractionRectNode(), firstNode);
  assert.equal(context.interaction.getZoomTransform(), runtimeModel.zoomTransform);
  assert.equal(context.interaction.getPendingZoomTransform(), null);
  assert.equal(context.interaction.getZoomGestureStartTransform(), runtimeModel.zoomGestureStartTransform);
  assert.deepEqual(context.interaction.helpers.cloneZoomTransform({ x: 4, y: 5, k: 6 }), {
    x: 4,
    y: 5,
    k: 6,
  });
  assert.equal(context.interaction.helpers.shouldAllowZoomEvent({ type: "wheel" }), true);

  runtimeModel.width = 1024;
  runtimeModel.zoomRenderScheduled = true;
  runtimeModel.pendingZoomTransform = { x: 7, y: 8, k: 9 };
  const nextNode = { id: "node-b" };
  const nextRect = { node: () => nextNode };
  const nextZoomBehavior = { id: "zoom-b" };
  rendererSurfaceHost.setInteractionRect(nextRect);
  rendererSurfaceHost.setZoomBehavior(nextZoomBehavior);

  assert.equal(context.interaction.getWidth(), 1024);
  assert.equal(context.interaction.isZoomRenderScheduled(), true);
  assert.equal(context.interaction.getInteractionRect(), nextRect);
  assert.equal(context.interaction.getInteractionRectNode(), nextNode);
  assert.equal(context.interaction.getZoomBehavior(), nextZoomBehavior);
  assert.equal(context.interaction.getPendingZoomTransform(), runtimeModel.pendingZoomTransform);
});

test("interaction remains an optional reserved section", () => {
  const context = createContextFixture({ interaction: null });
  const description = describeRendererRuntimeContext(context);

  assert.equal(context.interaction, null);
  assert.deepEqual(description.sections.interaction, { present: false });
});

test("interaction description is JSON-safe and exposes function descriptors only", () => {
  const context = createContextFixture();
  const description = describeRendererRuntimeContext(context);
  const json = JSON.stringify(description);

  assert.doesNotThrow(() => JSON.stringify(description));
  assert.deepEqual(description.sections.interaction.helpers.cloneZoomTransform, {
    present: true,
    type: "function",
  });
  assert.deepEqual(description.sections.interaction.accessors.getInteractionRectNode, {
    present: true,
    type: "function",
  });
  assert.equal(json.includes("interaction-node"), false);
  assert.equal(json.includes("=>"), false);
});

test("interaction constants fail fast on invalid zoom bounds and render phases", () => {
  assert.throws(
    () => createContextFixture({
      interactionOverrides: { constants: { minZoomScale: Number.NaN } },
    }),
    /interaction\.constants\.minZoomScale must be a finite number/,
  );
  assert.throws(
    () => createContextFixture({
      interactionOverrides: { constants: { minZoomScale: 2, maxZoomScale: 2 } },
    }),
    /minZoomScale must be less than maxZoomScale/,
  );
  assert.throws(
    () => createContextFixture({
      interactionOverrides: { constants: { renderPhaseSettling: "" } },
    }),
    /renderPhaseSettling must be a non-empty string/,
  );
});

test("interaction helpers and accessors must be functions", () => {
  assert.throws(
    () => createContextFixture({
      interactionOverrides: { helpers: { shouldAllowZoomEvent: null } },
    }),
    /interaction\.helpers\.shouldAllowZoomEvent must be a function/,
  );
  assert.throws(
    () => createContextFixture({
      interactionOverrides: { accessors: { getWindow: null } },
    }),
    /interaction\.accessors\.getWindow must be a function/,
  );
});

test("interaction read model excludes handlers, state setters, and scheduling effects", () => {
  const context = createContextFixture();
  const exposedKeys = collectObjectKeys(context.interaction);

  for (const forbiddenName of [
    "handlers",
    "effects",
    "requestAnimationFrame",
    "nowMs",
    "scheduleRenderPhaseIdle",
    "setPendingZoomTransform",
    "dispatchMapClick",
  ]) {
    assert.equal(exposedKeys.has(forbiddenName), false, `${forbiddenName} must remain outside the read model`);
  }
});
