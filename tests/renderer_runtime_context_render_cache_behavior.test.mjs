import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertRendererRuntimeContext,
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTEXT_MODULE_PATH = path.join(REPO_ROOT, "js", "core", "map_renderer", "renderer_runtime_context.js");

const FORBIDDEN_IMPORT_TOKENS = Object.freeze([
  "../map_renderer.js",
  "./map_renderer.js",
  "map_renderer.js",
  "render_cache_owner",
  "scenario_manager",
  "dirty_state",
  "history_manager",
  "js/ui",
  "d3",
]);

function createRenderCacheDescriptor(overrides = {}) {
  return {
    constants: {
      interactionCompositePassNames: ["political", "borders"],
      renderPassNames: ["political", "borders", "labels"],
      renderPassOverscanRatioPerSide: 0.15,
      transformedFramePassNames: new Set(["political", "borders"]),
      ...(overrides.constants || {}),
    },
    helpers: {
      getTransformSignature: () => "transform-signature",
      getVisibleFrameIdentity: () => ({ scenarioId: "test" }),
      ...(overrides.helpers || {}),
    },
  };
}

function createContextFixture(overrides = {}) {
  const runtimeState = overrides.runtimeState || { renderRevision: 1 };
  const contextHandle = overrides.contextHandle || { canvas: { secretCanvasHandle: true } };
  const rendererSurfaceHost = overrides.rendererSurfaceHost || createRendererSurfaceHost({
    handles: {
      context: contextHandle,
      mapCanvas: { nodeName: "CANVAS" },
    },
  });
  return createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    renderCache: Object.hasOwn(overrides, "renderCache") ? overrides.renderCache : createRenderCacheDescriptor(),
    ownerTag: "render-cache-test",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

test("renderCache read model freezes descriptor wrappers and keeps live receivers", () => {
  const runtimeState = { renderRevision: 1 };
  const host = createRendererSurfaceHost({
    handles: {
      context: { canvas: { secretCanvasHandle: true } },
      mapCanvas: { nodeName: "CANVAS" },
    },
  });
  const context = createContextFixture({ runtimeState, rendererSurfaceHost: host });

  assertRendererRuntimeContext(context);
  assert.equal(Object.isFrozen(context.renderCache), true);
  assert.equal(Object.isFrozen(context.renderCache.constants), true);
  assert.equal(Object.isFrozen(context.renderCache.helpers), true);
  assert.deepEqual(context.renderCache.constants.renderPassNames, ["political", "borders", "labels"]);
  assert.equal(context.renderCache.constants.transformedFramePassNames.has("political"), true);
  assert.equal(context.renderCache.constants.transformedFramePassNames.size, 2);
  assert.deepEqual([...context.renderCache.constants.transformedFramePassNames], ["political", "borders"]);
  assert.equal(typeof context.renderCache.constants.transformedFramePassNames.add, "undefined");
  assert.equal(typeof context.renderCache.constants.transformedFramePassNames.delete, "undefined");
  assert.equal(typeof context.renderCache.constants.transformedFramePassNames.clear, "undefined");
  assert.equal(context.renderCache.getRuntimeState(), runtimeState);
  assert.equal(context.renderCache.getSurfaceHost(), host);
  assert.equal(context.surface.getMainContext(), host.getContext());
  assert.equal(context.renderCache.getMainContext(), host.getContext());

  const nextContextHandle = { canvas: { nextCanvasHandle: true } };
  host.setContext(nextContextHandle);
  assert.equal(context.surface.getMainContext(), nextContextHandle);
  assert.equal(context.renderCache.getMainContext(), nextContextHandle);
});

test("renderCache fails fast when render pass names are missing", () => {
  assert.throws(
    () => createContextFixture({
      renderCache: createRenderCacheDescriptor({
        constants: { renderPassNames: [] },
      }),
    }),
    /renderPassNames must be a non-empty array/,
  );
});

test("renderCache fails fast when overscan ratio is invalid", () => {
  assert.throws(
    () => createContextFixture({
      renderCache: createRenderCacheDescriptor({
        constants: { renderPassOverscanRatioPerSide: Number.NaN },
      }),
    }),
    /renderPassOverscanRatioPerSide must be a finite number/,
  );
});

test("renderCache fails fast when interaction composite pass names are invalid", () => {
  assert.throws(
    () => createContextFixture({
      renderCache: createRenderCacheDescriptor({
        constants: { interactionCompositePassNames: new Set(["political"]) },
      }),
    }),
    /interactionCompositePassNames must be an array/,
  );
});

test("renderCache fails fast when transformed frame pass names are invalid", () => {
  assert.throws(
    () => createContextFixture({
      renderCache: createRenderCacheDescriptor({
        constants: { transformedFramePassNames: "political" },
      }),
    }),
    /transformedFramePassNames must be a Set or array/,
  );
});

test("renderCache fails fast when required helper functions are missing", () => {
  assert.throws(
    () => createContextFixture({
      renderCache: createRenderCacheDescriptor({
        helpers: { getVisibleFrameIdentity: null },
      }),
    }),
    /getVisibleFrameIdentity must be a function/,
  );
});

test("renderCache description is JSON-safe and avoids canvas or cache handle leaks", () => {
  const context = createContextFixture();
  const description = describeRendererRuntimeContext(context);
  const json = JSON.stringify(description);

  assert.doesNotThrow(() => JSON.stringify(description));
  assert.deepEqual(description.sections.renderCache.constants, {
    passCount: 3,
    interactionCompositePassCount: 2,
    transformedFramePassCount: 2,
    renderPassOverscanRatioPerSide: 0.15,
  });
  assert.deepEqual(description.sections.renderCache.helpers.getTransformSignature, { present: true, type: "function" });
  assert.deepEqual(description.sections.renderCache.helpers.getVisibleFrameIdentity, { present: true, type: "function" });
  assert.deepEqual(description.sections.renderCache.accessors.getMainContext, { present: true, type: "function" });
  assert.equal(json.includes("secretCanvasHandle"), false);
  assert.equal(json.includes("renderPassCache"), false);
});

test("renderCache remains optional for reserved-section context callers", () => {
  const context = createContextFixture({ renderCache: null });
  const description = describeRendererRuntimeContext(context);

  assert.equal(context.renderCache, null);
  assert.deepEqual(description.sections.renderCache, { present: false });
});

test("context module stays import-free after renderCache read model wiring", () => {
  const source = fs.readFileSync(CONTEXT_MODULE_PATH, "utf8");

  assert.equal(/\bimport\b/.test(source), false);
  for (const token of FORBIDDEN_IMPORT_TOKENS) {
    assert.equal(source.includes(token), false, `${token} should stay out of renderer runtime context`);
  }
});
