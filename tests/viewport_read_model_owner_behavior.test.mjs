import assert from "node:assert/strict";
import test from "node:test";

import { createViewportReadModelOwner } from "../js/core/renderer/viewport_read_model_owner.js";

function createFeature(id) {
  return { id, properties: { id } };
}

function createZoomIdentity() {
  return {
    x: 0,
    y: 0,
    k: 1,
    translate(x, y) {
      return { x, y, k: 1 };
    },
  };
}

function createHarness({
  modelState: modelStateOverrides = {},
  projection = null,
  pathSvg = null,
  zoomIdentity = createZoomIdentity(),
  landFeatures = [],
  hgoReady = false,
  hgoBounds = null,
  logicalCanvasDimensions = [800, 600],
  projectedBoundsById = {},
  renderableLandFeatures = null,
  skipFeatureIds = new Set(),
} = {}) {
  const modelState = {
    width: 800,
    height: 600,
    dpr: 1,
    zoomTransform: null,
    ...modelStateOverrides,
  };
  const calls = {
    projectedBounds: [],
    skipped: [],
    renderable: 0,
  };
  const owner = createViewportReadModelOwner({
    state: modelState,
    getters: {
      getProjection: () => projection,
      getPathSvg: () => pathSvg,
      getZoomIdentity: () => zoomIdentity,
      getLogicalCanvasDimensions: () => logicalCanvasDimensions,
      getLandFeatures: () => landFeatures,
      getHgoRuntimePreviewBounds: () => hgoBounds,
      isHgoRuntimePreviewReady: () => hgoReady,
    },
    helpers: {
      getFeatureId: (feature) => String(feature?.properties?.id || feature?.id || ""),
      getProjectedFeatureBounds: (feature, options = {}) => {
        calls.projectedBounds.push({ id: feature?.id, options });
        return projectedBoundsById[feature?.id] || null;
      },
      shouldSkipFeature: (feature, canvasWidth, canvasHeight, options = {}) => {
        calls.skipped.push({ id: feature?.id, canvasWidth, canvasHeight, options });
        return skipFeatureIds.has(feature?.id);
      },
      getRenderableLandFeatures: renderableLandFeatures
        ? (canvasWidth, canvasHeight, options = {}) => {
          calls.renderable += 1;
          return renderableLandFeatures(canvasWidth, canvasHeight, options);
        }
        : undefined,
    },
  });
  return { calls, modelState, owner };
}

test("getViewportRenderSignature rounds dimensions and dpr", () => {
  const { owner } = createHarness({
    modelState: { width: 799.6, height: 600.4, dpr: 1.234 },
  });

  assert.equal(owner.getViewportRenderSignature(), "800|600|1.23");
});

test("getProjectionRenderSignature handles missing projection and rounded projection values", () => {
  assert.equal(createHarness().owner.getProjectionRenderSignature(), "projection:na");

  const projection = {
    scale: () => 123.4567,
    translate: () => [10.3333, -20.6666],
  };
  assert.equal(createHarness({ projection }).owner.getProjectionRenderSignature(), "123.457|10.333|-20.667");
});

test("getViewportGeoBounds falls back to world bounds without usable inversion", () => {
  assert.deepEqual(createHarness().owner.getViewportGeoBounds(), [-180, -90, 180, 90]);
  assert.deepEqual(
    createHarness({ projection: { invert: () => [NaN, Infinity] } }).owner.getViewportGeoBounds(),
    [-180, -90, 180, 90],
  );
});

test("getViewportGeoBounds clips inverted lon lat samples", () => {
  const projection = {
    invert: ([x, y]) => [x - 500, y - 300],
  };

  assert.deepEqual(createHarness({ projection }).owner.getViewportGeoBounds(), [-180, -90, 180, 90]);
});

test("getViewportGeoBounds trims one outlier when nine samples are valid", () => {
  const outputs = [
    [-170, -80],
    [-50, -30],
    [-20, -10],
    [-40, -20],
    [0, 0],
    [40, 20],
    [20, 10],
    [50, 30],
    [170, 80],
  ];
  let index = 0;
  const projection = {
    invert: () => outputs[index++],
  };

  assert.deepEqual(createHarness({ projection }).owner.getViewportGeoBounds(), [-50, -30, 50, 30]);
});

test("calculatePanExtent returns padded fallback when path or land is unavailable", () => {
  assert.deepEqual(createHarness().owner.calculatePanExtent(), [[-50, -50], [850, 650]]);
  assert.deepEqual(
    createHarness({ pathSvg: {}, landFeatures: [] }).owner.calculatePanExtent(),
    [[-50, -50], [850, 650]],
  );
});

test("calculatePanExtent uses HGO runtime preview bounds when ready", () => {
  const hgoBounds = { minX: 10, minY: 20, maxX: 110, maxY: 220, width: 100, height: 200 };

  assert.deepEqual(createHarness({ hgoReady: true, hgoBounds }).owner.calculatePanExtent(), [[-40, -30], [160, 270]]);
});

test("calculatePanExtent uses projected feature bounds and skip decisions for land features", () => {
  const landFeatures = [createFeature("A"), createFeature("B"), createFeature("SKIP")];
  const { calls, owner } = createHarness({
    pathSvg: {},
    landFeatures,
    skipFeatureIds: new Set(["SKIP"]),
    projectedBoundsById: {
      A: { minX: 10, minY: 20, maxX: 30, maxY: 40 },
      B: { minX: -5, minY: 50, maxX: 80, maxY: 120 },
      SKIP: { minX: -500, minY: -500, maxX: 500, maxY: 500 },
    },
  });

  assert.deepEqual(owner.calculatePanExtent(), [[-55, -30], [130, 170]]);
  assert.deepEqual(calls.skipped.map((entry) => entry.id), ["A", "B", "SKIP"]);
});

test("getProjectedRenderableContentBounds returns HGO bounds and null for missing inputs", () => {
  const hgoBounds = { minX: 1, minY: 2, maxX: 3, maxY: 4, width: 2, height: 2 };

  assert.equal(createHarness({ hgoReady: true, hgoBounds }).owner.getProjectedRenderableContentBounds(), hgoBounds);
  assert.equal(createHarness({ landFeatures: [] }).owner.getProjectedRenderableContentBounds(), null);
  assert.equal(
    createHarness({ modelState: { width: 0 }, landFeatures: [createFeature("A")] })
      .owner.getProjectedRenderableContentBounds(),
    null,
  );
});

test("getProjectedRenderableContentBounds uses renderable helper and falls back to all land", () => {
  const featureA = createFeature("A");
  const featureB = createFeature("B");
  const projectedBoundsById = {
    A: { minX: 0, minY: 0, maxX: 40, maxY: 50 },
    B: { minX: 100, minY: 120, maxX: 180, maxY: 220 },
  };

  assert.deepEqual(
    createHarness({
      landFeatures: [featureA, featureB],
      projectedBoundsById,
      renderableLandFeatures: () => [featureB],
    }).owner.getProjectedRenderableContentBounds(),
    { minX: 100, minY: 120, maxX: 180, maxY: 220, width: 80, height: 100 },
  );
  assert.deepEqual(
    createHarness({
      landFeatures: [featureA, featureB],
      projectedBoundsById,
      renderableLandFeatures: () => [],
    }).owner.getProjectedRenderableContentBounds(),
    { minX: 0, minY: 0, maxX: 180, maxY: 220, width: 180, height: 220 },
  );
});

test("getCenteredFitZoomTransform handles missing identity missing bounds and horizontal centering", () => {
  assert.equal(createHarness({ zoomIdentity: null }).owner.getCenteredFitZoomTransform(), null);

  const identity = createZoomIdentity();
  assert.equal(createHarness({ zoomIdentity: identity }).owner.getCenteredFitZoomTransform(), identity);

  const feature = createFeature("A");
  const centered = createHarness({
    zoomIdentity: identity,
    landFeatures: [feature],
    projectedBoundsById: {
      A: { minX: 10, minY: 20, maxX: 110, maxY: 120 },
    },
  }).owner.getCenteredFitZoomTransform({ centerX: true, centerY: false });
  assert.deepEqual(centered, { x: 340, y: 0, k: 1 });
});

test("getZoomPercent formats the current zoom scale", () => {
  assert.equal(createHarness().owner.getZoomPercent(), "100%");
  assert.equal(createHarness({ modelState: { zoomTransform: { k: 1.234 } } }).owner.getZoomPercent(), "123%");
});
