import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION,
  RENDERER_RUNTIME_CONTEXT_SECTION_IDS,
  assertRendererRuntimeContext,
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTEXT_MODULE_PATH = path.join(REPO_ROOT, "js", "core", "map_renderer", "renderer_runtime_context.js");

const RESERVED_SECTION_IDS = Object.freeze([
  "projection",
  "renderCache",
  "interaction",
  "scheduling",
]);

const FORBIDDEN_IMPORT_TOKENS = Object.freeze([
  "../map_renderer.js",
  "./map_renderer.js",
  "map_renderer.js",
  "scenario_manager",
  "toolbar",
  "sidebar",
  "dirty_state",
  "history_manager",
  "js/ui",
  "d3",
]);

function createContextFixture(overrides = {}) {
  const runtimeState = overrides.runtimeState || { renderRevision: 1 };
  const rendererSurfaceHost = overrides.rendererSurfaceHost || createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      mapCanvas: { nodeName: "CANVAS" },
    },
  });
  return createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    ownerTag: "test-owner",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

test("createRendererRuntimeContext creates a versioned frozen context shell", () => {
  const context = createContextFixture();

  assert.equal(context.schemaVersion, RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION);
  assert.equal(context.lifecycle.ownerTag, "test-owner");
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.state), true);
  assert.equal(Object.isFrozen(context.surface), true);
  assert.equal(Object.isFrozen(context.diagnostics), true);
  assert.equal(Object.isFrozen(context.lifecycle), true);
  assertRendererRuntimeContext(context);
});

test("createRendererRuntimeContext fails fast when runtimeState is missing", () => {
  assert.throws(
    () => createRendererRuntimeContext({
      rendererSurfaceHost: createRendererSurfaceHost(),
    }),
    /runtimeState is required/,
  );
});

test("createRendererRuntimeContext fails fast when rendererSurfaceHost is missing or incomplete", () => {
  assert.throws(
    () => createRendererRuntimeContext({ runtimeState: {} }),
    /rendererSurfaceHost is required/,
  );
  assert.throws(
    () => createRendererRuntimeContext({ runtimeState: {}, rendererSurfaceHost: { getContext() {} } }),
    /snapshot/,
  );
  assert.throws(
    () => createRendererRuntimeContext({ runtimeState: {}, rendererSurfaceHost: { snapshot() { return {}; } } }),
    /surface getter/,
  );
});

test("context shell does not deep-freeze runtimeState", () => {
  const runtimeState = { renderRevision: 1 };
  const context = createContextFixture({ runtimeState });
  const observedRuntimeState = context.state.runtimeState;

  observedRuntimeState.renderRevision = 2;

  assert.equal(Object.isFrozen(observedRuntimeState), false);
  assert.equal(observedRuntimeState.renderRevision, 2);
});

test("describeRendererRuntimeContext returns a JSON-serializable safe snapshot", () => {
  const host = createRendererSurfaceHost({
    handles: {
      context: { secretCanvasHandle: true },
      hitCanvas: { nodeName: "CANVAS" },
    },
  });
  const context = createContextFixture({ rendererSurfaceHost: host });
  const description = describeRendererRuntimeContext(context);

  assert.doesNotThrow(() => JSON.stringify(description));
  assert.equal(description.schemaVersion, RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION);
  assert.deepEqual(description.sections.surface.snapshot.context, { present: true, type: "object" });
  assert.deepEqual(description.sections.surface.snapshot.hitCanvas, { present: true, type: "object" });
  assert.equal("secretCanvasHandle" in description.sections.surface.snapshot.context, false);
  assert.equal(description.sections.lifecycle.ownerTag, "test-owner");
});

test("diagnostics snapshot uses the surface host snapshot contract", () => {
  const host = createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
    },
  });
  const context = createContextFixture({ rendererSurfaceHost: host });

  assert.deepEqual(context.diagnostics.getSnapshot().context, { present: true, type: "object" });
  host.setContext(null);
  assert.deepEqual(context.diagnostics.getSnapshot().context, { present: false, type: "null" });
});

test("section ids reserve future owner migration sections", () => {
  for (const sectionId of ["state", "surface", "diagnostics", ...RESERVED_SECTION_IDS]) {
    assert.equal(RENDERER_RUNTIME_CONTEXT_SECTION_IDS.includes(sectionId), true, `${sectionId} should be declared`);
  }
});

test("context module stays decoupled from map renderer orchestration and UI modules", () => {
  const source = fs.readFileSync(CONTEXT_MODULE_PATH, "utf8");

  assert.equal(/\bimport\b/.test(source), false);
  for (const token of FORBIDDEN_IMPORT_TOKENS) {
    assert.equal(source.includes(token), false, `${token} should stay out of renderer runtime context`);
  }
});
