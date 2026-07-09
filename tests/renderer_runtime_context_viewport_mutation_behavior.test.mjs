import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

function createViewportDescriptor(runtimeState, rendererSurfaceHost, overrides = {}) {
  return {
    constants: {
      mapPanPaddingPx: 50,
      minZoomScale: 0.35,
      maxZoomScale: 50,
      projectionFitPaddingRatio: 0.04,
    },
    helpers: {
      getLogicalCanvasDimensions: () => [800, 600],
      getRenderableLandFeatures: () => [],
      getProjectedFeatureBounds: () => null,
      shouldSkipFeature: () => false,
      getFeatureId: () => "feature-id",
      getHgoRuntimePreviewBounds: () => null,
      isHgoRuntimePreviewReady: () => false,
      getZoomIdentity: () => ({ k: 1, x: 0, y: 0 }),
      getD3: () => ({ zoomIdentity: { k: 1, x: 0, y: 0 } }),
    },
    accessors: {
      getRuntimeState: () => runtimeState,
      getSurfaceHost: () => rendererSurfaceHost,
      getProjection: () => rendererSurfaceHost.getProjection(),
      getPathSvg: () => rendererSurfaceHost.getPathSvg(),
      getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),
      getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),
      getMapContainer: () => rendererSurfaceHost.getMapContainer(),
      getViewportGroup: () => rendererSurfaceHost.getViewportGroup(),
      getGlobal: () => globalThis,
      getDevicePixelRatio: () => globalThis.devicePixelRatio,
      hasLandFeatures: () => Boolean(runtimeState.landData?.features?.length),
      ...(overrides.accessors || {}),
    },
  };
}

function createContextFixture(overrides = {}) {
  const runtimeState = overrides.runtimeState || {
    width: 800,
    height: 600,
    landData: { features: [{ id: "land-a" }] },
  };
  const rendererSurfaceHost = createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      projection: { name: "projection" },
      pathSvg: { name: "path-svg" },
      zoomBehavior: { name: "zoom" },
      interactionRect: { node: () => ({}) },
      mapContainer: { secretDomHandle: "map-container" },
      viewportGroup: { secretSvgHandle: "viewport-group", attr() {} },
    },
  });

  return createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    viewport: createViewportDescriptor(runtimeState, rendererSurfaceHost, overrides.viewportOverrides),
    ownerTag: "viewport-mutation-test",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

test("viewport mutation read accessors expose live handles without leaking them in descriptions", () => {
  const context = createContextFixture();
  const description = describeRendererRuntimeContext(context);
  const json = JSON.stringify(description);

  assert.equal(Object.isFrozen(context.viewport), true);
  assert.equal(context.viewport.getMapContainer().secretDomHandle, "map-container");
  assert.equal(context.viewport.getViewportGroup().secretSvgHandle, "viewport-group");
  assert.equal(context.viewport.getGlobal(), globalThis);
  assert.equal(context.viewport.getDevicePixelRatio(), globalThis.devicePixelRatio);
  assert.equal(context.viewport.hasLandFeatures(), true);
  assert.deepEqual(description.sections.viewport.accessors.getMapContainer, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getViewportGroup, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getGlobal, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getDevicePixelRatio, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.hasLandFeatures, { present: true, type: "function" });
  assert.equal(json.includes("secretDomHandle"), false);
  assert.equal(json.includes("secretSvgHandle"), false);
  assert.equal(json.includes("map-container"), false);
  assert.equal(json.includes("viewport-group"), false);
});

test("viewport mutation accessors remain read model functions and fail fast when missing", () => {
  for (const accessorName of [
    "getMapContainer",
    "getViewportGroup",
    "getGlobal",
    "getDevicePixelRatio",
    "hasLandFeatures",
  ]) {
    assert.throws(
      () => createContextFixture({
        viewportOverrides: {
          accessors: { [accessorName]: null },
        },
      }),
      new RegExp(`viewport\\.accessors\\.${accessorName} must be a function`),
    );
  }
});

test("viewport context does not expose lifecycle helpers or effects bus", () => {
  const context = createContextFixture();

  for (const forbiddenName of [
    "scheduleDeferredWork",
    "cancelDeferredWork",
    "nowMs",
    "recordRenderPerfMetric",
  ]) {
    assert.equal(context.viewport.helpers[forbiddenName], undefined);
    assert.equal(context.viewport[forbiddenName], undefined);
  }
  assert.equal(context.viewport.lifecycle, undefined);
  assert.equal(context.viewport.effects, undefined);
});

test("RendererRuntimeContext module remains import-free after viewport mutation accessors", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "js", "core", "map_renderer", "renderer_runtime_context.js"),
    "utf8",
  );

  assert.equal(source.includes("import "), false);
  assert.equal(source.includes("scheduleDeferredWork"), false);
  assert.equal(source.includes("cancelDeferredWork"), false);
  assert.equal(source.includes("recordRenderPerfMetric"), false);
});
