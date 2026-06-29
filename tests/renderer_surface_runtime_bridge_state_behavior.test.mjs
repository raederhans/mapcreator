import assert from "node:assert/strict";
import test from "node:test";

import { applyRendererSurfaceBridgeState } from "../js/core/state/renderer_runtime_state.js";

test("applyRendererSurfaceBridgeState maps raw surface handles to runtime bridge fields", () => {
  const handles = Object.freeze({
    mapCanvas: Object.freeze({ id: "map-canvas" }),
    canvasLayers: Object.freeze([{ name: "composite" }]),
    context: Object.freeze({ id: "color-context" }),
    politicalPatchCanvas: Object.freeze({ id: "political-patch-canvas" }),
    politicalPatchContext: Object.freeze({ id: "political-patch-context" }),
    interactionOverlayCanvas: Object.freeze({ id: "interaction-overlay-canvas" }),
    interactionOverlayContext: Object.freeze({ id: "interaction-overlay-context" }),
  });
  const target = {
    lineCanvas: Object.freeze({ id: "stale-line-canvas" }),
    lineCtx: Object.freeze({ id: "stale-line-context" }),
  };

  const result = applyRendererSurfaceBridgeState(target, handles);

  assert.equal(result, target);
  assert.equal(target.colorCanvas, handles.mapCanvas);
  assert.equal(target.canvasLayers, handles.canvasLayers);
  assert.equal(target.lineCanvas, null);
  assert.equal(target.colorCtx, handles.context);
  assert.equal(target.politicalPatchCanvas, handles.politicalPatchCanvas);
  assert.equal(target.politicalPatchCtx, handles.politicalPatchContext);
  assert.equal(target.interactionOverlayCanvas, handles.interactionOverlayCanvas);
  assert.equal(target.interactionOverlayCtx, handles.interactionOverlayContext);
  assert.equal(target.lineCtx, null);
});

test("applyRendererSurfaceBridgeState normalizes missing bridge handles to null", () => {
  const target = {};

  assert.equal(applyRendererSurfaceBridgeState(target), target);
  assert.deepEqual(target, {
    colorCanvas: null,
    canvasLayers: null,
    lineCanvas: null,
    colorCtx: null,
    politicalPatchCanvas: null,
    politicalPatchCtx: null,
    interactionOverlayCanvas: null,
    interactionOverlayCtx: null,
    lineCtx: null,
  });
});

test("applyRendererSurfaceBridgeState keeps the source handles object unchanged", () => {
  const handles = Object.freeze({
    mapCanvas: Object.freeze({ id: "map-canvas" }),
    canvasLayers: Object.freeze([]),
    context: Object.freeze({ id: "context" }),
  });
  const before = Object.entries(handles);
  const target = {};

  assert.equal(applyRendererSurfaceBridgeState(target, handles), target);
  assert.deepEqual(Object.entries(handles), before);
});

test("applyRendererSurfaceBridgeState rejects invalid targets", () => {
  assert.equal(applyRendererSurfaceBridgeState(null, {}), false);
  assert.equal(applyRendererSurfaceBridgeState(undefined, {}), false);
  assert.equal(applyRendererSurfaceBridgeState(42, {}), false);
});
