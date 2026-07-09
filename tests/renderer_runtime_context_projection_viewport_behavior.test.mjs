import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRendererRuntimeContext,
  createRendererRuntimeContext,
  describeRendererRuntimeContext,
} from "../js/core/map_renderer/renderer_runtime_context.js";
import { createRendererSurfaceHost } from "../js/core/renderer/renderer_surface_host.js";

function createProjectionDescriptor(overrides = {}) {
  return {
    constants: {
      projectionPrecision: 0.1,
      pathPointRadius: 2,
      projectionFitPaddingRatio: 0.04,
      ...(overrides.constants || {}),
    },
    helpers: {
      getD3: () => ({ geoPath() {}, zoomIdentity: { k: 1, x: 0, y: 0 } }),
      ...(overrides.helpers || {}),
    },
    accessors: {
      getProjection: () => ({ scale: () => 1 }),
      getPathSvg: () => ({ type: "svg-path" }),
      getPathCanvas: () => ({ type: "canvas-path" }),
      getPathHitCanvas: () => ({ type: "hit-path" }),
      getContext: () => ({ canvas: true }),
      getHitContext: () => ({ canvas: true }),
      ...(overrides.accessors || {}),
    },
  };
}

function createViewportDescriptor(runtimeState, rendererSurfaceHost, overrides = {}) {
  return {
    constants: {
      mapPanPaddingPx: 50,
      minZoomScale: 0.35,
      maxZoomScale: 50,
      projectionFitPaddingRatio: 0.04,
      ...(overrides.constants || {}),
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
      ...(overrides.helpers || {}),
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
  const runtimeState = overrides.runtimeState || { width: 800, height: 600 };
  const rendererSurfaceHost = overrides.rendererSurfaceHost || createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      hitContext: { canvas: true },
      projection: { scale: () => 1 },
      pathSvg: { type: "svg-path" },
      pathCanvas: { type: "canvas-path" },
      pathHitCanvas: { type: "hit-path" },
      zoomBehavior: { scaleExtent() {}, extent() {}, translateExtent() {} },
      interactionRect: { node: () => ({}) },
      mapContainer: { type: "map-container" },
      viewportGroup: { attr() {} },
    },
  });
  return createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    projection: Object.hasOwn(overrides, "projection")
      ? overrides.projection
      : createProjectionDescriptor({
        ...(overrides.projectionOverrides || {}),
        accessors: {
          getProjection: () => rendererSurfaceHost.getProjection(),
          getPathSvg: () => rendererSurfaceHost.getPathSvg(),
          getPathCanvas: () => rendererSurfaceHost.getPathCanvas(),
          getPathHitCanvas: () => rendererSurfaceHost.getPathHitCanvas(),
          getContext: () => rendererSurfaceHost.getContext(),
          getHitContext: () => rendererSurfaceHost.getHitContext(),
          ...(overrides.projectionOverrides?.accessors || {}),
        },
      }),
    viewport: Object.hasOwn(overrides, "viewport")
      ? overrides.viewport
      : createViewportDescriptor(runtimeState, rendererSurfaceHost, overrides.viewportOverrides),
    ownerTag: "projection-viewport-test",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

test("projection and viewport read models expose frozen constants, helpers, and live accessors", () => {
  const runtimeState = { width: 800, height: 600 };
  const rendererSurfaceHost = createRendererSurfaceHost({
    handles: {
      context: { canvas: true },
      hitContext: { canvas: true },
      projection: { name: "projection-a" },
      pathSvg: { name: "path-svg-a" },
      pathCanvas: { name: "path-canvas-a" },
      pathHitCanvas: { name: "path-hit-a" },
      zoomBehavior: { name: "zoom-a" },
      interactionRect: { name: "interaction-a" },
    },
  });
  const context = createContextFixture({ runtimeState, rendererSurfaceHost });

  assertRendererRuntimeContext(context);
  assert.equal(Object.isFrozen(context.projection), true);
  assert.equal(Object.isFrozen(context.projection.constants), true);
  assert.equal(Object.isFrozen(context.projection.helpers), true);
  assert.equal(Object.isFrozen(context.viewport), true);
  assert.equal(Object.isFrozen(context.viewport.constants), true);
  assert.equal(Object.isFrozen(context.viewport.helpers), true);
  assert.deepEqual(context.projection.constants, {
    projectionPrecision: 0.1,
    pathPointRadius: 2,
    projectionFitPaddingRatio: 0.04,
  });
  assert.deepEqual(context.viewport.constants, {
    mapPanPaddingPx: 50,
    minZoomScale: 0.35,
    maxZoomScale: 50,
    projectionFitPaddingRatio: 0.04,
  });
  assert.equal(context.viewport.getRuntimeState(), runtimeState);
  assert.equal(context.viewport.getSurfaceHost(), rendererSurfaceHost);
  assert.equal(context.projection.getProjection(), rendererSurfaceHost.getProjection());
  assert.equal(context.viewport.getProjection(), rendererSurfaceHost.getProjection());
  assert.equal(context.viewport.getMapContainer(), rendererSurfaceHost.getMapContainer());
  assert.equal(context.viewport.getViewportGroup(), rendererSurfaceHost.getViewportGroup());
  assert.equal(context.viewport.getGlobal(), globalThis);
  assert.equal(context.viewport.getDevicePixelRatio(), globalThis.devicePixelRatio);
  assert.equal(context.viewport.hasLandFeatures(), false);

  const nextProjection = { name: "projection-b" };
  rendererSurfaceHost.setProjection(nextProjection);
  assert.equal(context.projection.getProjection(), nextProjection);
  assert.equal(context.viewport.getProjection(), nextProjection);
});

test("projection and viewport remain optional reserved sections", () => {
  const context = createContextFixture({ projection: null, viewport: null });
  const description = describeRendererRuntimeContext(context);

  assert.equal(context.projection, null);
  assert.equal(context.viewport, null);
  assert.deepEqual(description.sections.projection, { present: false });
  assert.deepEqual(description.sections.viewport, { present: false });
});

test("projection and viewport descriptions are JSON-safe and contain no function bodies or handles", () => {
  const context = createContextFixture();
  const description = describeRendererRuntimeContext(context);
  const json = JSON.stringify(description);

  assert.doesNotThrow(() => JSON.stringify(description));
  assert.deepEqual(description.sections.projection.helpers.getD3, { present: true, type: "function" });
  assert.deepEqual(description.sections.projection.accessors.getProjection, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.helpers.getLogicalCanvasDimensions, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getInteractionRect, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getMapContainer, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getViewportGroup, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getGlobal, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.getDevicePixelRatio, { present: true, type: "function" });
  assert.deepEqual(description.sections.viewport.accessors.hasLandFeatures, { present: true, type: "function" });
  assert.equal(json.includes("secretCanvasHandle"), false);
  assert.equal(json.includes("nextCanvasHandle"), false);
  assert.equal(json.includes("function"), true);
  assert.equal(json.includes("=>"), false);
  assert.equal(json.includes("geoPath"), false);
});

test("projection constants fail fast on non-finite numbers", () => {
  assert.throws(
    () => createContextFixture({
      projectionOverrides: { constants: { projectionPrecision: Number.NaN } },
    }),
    /projectionPrecision must be a finite number/,
  );
  assert.throws(
    () => createContextFixture({
      projectionOverrides: { constants: { pathPointRadius: Infinity } },
    }),
    /pathPointRadius must be a finite number/,
  );
  assert.throws(
    () => createContextFixture({
      projectionOverrides: { constants: { projectionFitPaddingRatio: "wide" } },
    }),
    /projectionFitPaddingRatio must be a finite number/,
  );
});

test("viewport constants fail fast on non-finite numbers and invalid zoom range", () => {
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { constants: { mapPanPaddingPx: Number.NaN } },
    }),
    /mapPanPaddingPx must be a finite number/,
  );
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { constants: { minZoomScale: 2, maxZoomScale: 2 } },
    }),
    /minZoomScale must be less than maxZoomScale/,
  );
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { constants: { minZoomScale: 4, maxZoomScale: 2 } },
    }),
    /minZoomScale must be less than maxZoomScale/,
  );
});

test("projection helpers and accessors must be functions", () => {
  assert.throws(
    () => createContextFixture({
      projectionOverrides: { helpers: { getD3: null } },
    }),
    /projection\.helpers\.getD3 must be a function/,
  );
  assert.throws(
    () => createContextFixture({
      projectionOverrides: { accessors: { getPathCanvas: "missing" } },
    }),
    /projection\.accessors\.getPathCanvas must be a function/,
  );
});

test("viewport helpers and accessors must be functions", () => {
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { helpers: { shouldSkipFeature: null } },
    }),
    /viewport\.helpers\.shouldSkipFeature must be a function/,
  );
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { accessors: { getInteractionRect: null } },
    }),
    /viewport\.accessors\.getInteractionRect must be a function/,
  );
  assert.throws(
    () => createContextFixture({
      viewportOverrides: { accessors: { getViewportGroup: null } },
    }),
    /viewport\.accessors\.getViewportGroup must be a function/,
  );
});
