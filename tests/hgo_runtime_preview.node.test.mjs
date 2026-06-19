import assert from "node:assert/strict";
import test from "node:test";

import {
  HGO_RUNTIME_PREVIEW_STATUS,
  HGO_RUNTIME_PREVIEW_STORAGE_KEY,
  createHgoRuntimePreviewController,
  ensureHgoRuntimePreviewState,
} from "../js/core/hgo_runtime_preview.js";
import { createHgoRuntimePreviewRenderOwner } from "../js/core/map_renderer/hgo_runtime_preview_render_owner.js";

const seed = {
  provinces: {
    1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E", type: "land" },
  },
  states: [
    { id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 },
  ],
  countries: {
    AAA: { tag: "AAA", color_rgb: [1, 2, 3], color_hex: "#010203" },
  },
  province_to_state: { 1: 1 },
};

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createLinearProjection() {
  const projection = ([lon, lat]) => [
    (lon + 180) / 90,
    (90 - lat) / 90,
  ];
  projection.invert = ([x, y]) => [
    -180 + x * 90,
    90 - y * 90,
  ];
  return projection;
}

function createCanvas() {
  let putCount = 0;
  let lastImageData = null;
  return {
    getPutCount: () => putCount,
    getLastImageData: () => lastImageData,
    getContext: () => ({
      createImageData: (width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (imageData, x, y) => {
        putCount += 1;
        lastImageData = { imageData, x, y };
      },
      clearRect: () => {},
      drawImage: () => {},
    }),
  };
}

function createController(overrides = {}) {
  let seedLoadCount = 0;
  let rasterLoadCount = 0;
  const runtimeState = {};
  const storage = createStorage();
  const controller = createHgoRuntimePreviewController(runtimeState, {
    storage,
    loadSeed: async () => {
      seedLoadCount += 1;
      return seed;
    },
    loadRaster: async () => {
      rasterLoadCount += 1;
      return {
        width: 1,
        height: 1,
        pixelFormat: "rgb",
        pixels: [10, 20, 30],
      };
    },
    ...overrides,
  });
  return { controller, runtimeState, storage, getSeedLoadCount: () => seedLoadCount, getRasterLoadCount: () => rasterLoadCount };
}

test("keeps HGO runtime preview disabled by default", () => {
  const runtimeState = {};
  const preview = ensureHgoRuntimePreviewState(runtimeState);

  assert.equal(preview.enabled, false);
  assert.equal(preview.status, HGO_RUNTIME_PREVIEW_STATUS.IDLE);
});

test("loads seed and raster once while already enabled and repaints existing renderer", async () => {
  const harness = createController();

  await harness.controller.setEnabled(true);
  await harness.controller.setEnabled(true);

  assert.equal(harness.runtimeState.hgoRuntimePreview.enabled, true);
  assert.equal(harness.runtimeState.hgoRuntimePreview.status, HGO_RUNTIME_PREVIEW_STATUS.READY);
  assert.equal(harness.getSeedLoadCount(), 1);
  assert.equal(harness.getRasterLoadCount(), 1);
  assert.deepEqual(harness.runtimeState.hgoRuntimePreview.renderSummary, {
    layerOwner: "hgo-runtime-preview",
    reason: "enable-ready",
    renderCount: 2,
    width: 1,
    height: 1,
    canvasWidth: 1,
    canvasHeight: 1,
    viewport: null,
    scaledToCanvas: false,
    ownershipMode: "owner",
    resolvedPixelCount: 1,
    unresolvedPixelCount: 0,
  });
  assert.equal(harness.storage.values.get(HGO_RUNTIME_PREVIEW_STORAGE_KEY), "true");
});

test("ready preview can repaint the same canvas after a normal map redraw", async () => {
  const canvas = createCanvas();
  const harness = createController({ canvas });

  await harness.controller.setEnabled(true);
  assert.equal(canvas.getPutCount(), 1);

  const rendered = harness.controller.renderPreview({ reason: "draw-canvas" });

  assert.equal(canvas.getPutCount(), 2);
  assert.equal(rendered.resolvedPixelCount, 1);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.layerOwner, "hgo-runtime-preview");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "draw-canvas");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.renderCount, 2);
  assert.equal(canvas.getLastImageData().x, 0);
  assert.equal(canvas.getLastImageData().y, 0);
  assert.deepEqual(Array.from(canvas.getLastImageData().imageData.data), [1, 2, 3, 255]);

  harness.controller.renderPreview(null);

  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "manual");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.renderCount, 3);

  harness.controller.renderPreview({ reason: "   " });
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "manual");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.renderCount, 4);

  harness.controller.renderPreview({ reason: { source: "debugger" } });
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "manual");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.renderCount, 5);

  const longReason = "x".repeat(80);
  harness.controller.renderPreview({ reason: longReason });
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason.length, 64);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, longReason.slice(0, 64));
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.renderCount, 6);
});

test("preview can target a render-pass canvas without writing the default canvas", async () => {
  const defaultCanvas = createCanvas();
  const passCanvas = createCanvas();
  const harness = createController({
    canvas: defaultCanvas,
    useDefaultCanvasTarget: false,
  });

  await harness.controller.setEnabled(true);

  assert.equal(defaultCanvas.getPutCount(), 0);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "load");

  const rendered = harness.controller.renderPreview({
    reason: "hgo-preview-pass",
    targetCanvas: passCanvas,
  });

  assert.equal(defaultCanvas.getPutCount(), 0);
  assert.equal(passCanvas.getPutCount(), 1);
  assert.equal(rendered.resolvedPixelCount, 1);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "hgo-preview-pass");
  assert.deepEqual(Array.from(passCanvas.getLastImageData().imageData.data), [1, 2, 3, 255]);
});

test("ignores stale load completion after preview is disabled", async () => {
  const delayedRaster = createDeferred();
  const harness = createController({
    loadRaster: async () => delayedRaster.promise,
  });

  const pendingEnable = harness.controller.setEnabled(true);
  assert.equal(harness.runtimeState.hgoRuntimePreview.status, HGO_RUNTIME_PREVIEW_STATUS.LOADING);

  await harness.controller.setEnabled(false);
  delayedRaster.resolve({ width: 1, height: 1, pixelFormat: "rgb", pixels: [10, 20, 30] });
  await pendingEnable;

  assert.equal(harness.runtimeState.hgoRuntimePreview.enabled, false);
  assert.equal(harness.runtimeState.hgoRuntimePreview.status, HGO_RUNTIME_PREVIEW_STATUS.IDLE);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary, null);
  assert.equal(harness.storage.values.get(HGO_RUNTIME_PREVIEW_STORAGE_KEY), "false");
});

test("restores preview target after disabling rendered preview", async () => {
  let restoreCount = 0;
  const harness = createController({
    restorePreviewTarget: () => {
      restoreCount += 1;
    },
  });

  await harness.controller.setEnabled(true);
  assert.equal(restoreCount, 0);

  await harness.controller.setEnabled(false);

  assert.equal(restoreCount, 1);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary, null);
});

test("stores unavailable state when preview loaders are not configured", async () => {
  const runtimeState = {};
  const storage = createStorage();
  const controller = createHgoRuntimePreviewController(runtimeState, { storage });

  const preview = await controller.setEnabled(true);

  assert.equal(preview.enabled, false);
  assert.equal(preview.status, HGO_RUNTIME_PREVIEW_STATUS.UNAVAILABLE);
  assert.match(preview.errorMessage, /loaders/);
  assert.equal(storage.values.get(HGO_RUNTIME_PREVIEW_STORAGE_KEY), "false");
});

test("clears persisted enabled state when preview loaders are not configured", () => {
  const runtimeState = {};
  const storage = createStorage({ [HGO_RUNTIME_PREVIEW_STORAGE_KEY]: "true" });

  createHgoRuntimePreviewController(runtimeState, { storage });

  assert.equal(runtimeState.hgoRuntimePreview.enabled, false);
  assert.equal(runtimeState.hgoRuntimePreview.status, HGO_RUNTIME_PREVIEW_STATUS.UNAVAILABLE);
  assert.equal(storage.values.get(HGO_RUNTIME_PREVIEW_STORAGE_KEY), "false");
});

test("records load failure as explicit error state", async () => {
  const harness = createController({
    loadSeed: async () => {
      throw new Error("seed missing");
    },
  });

  const preview = await harness.controller.setEnabled(true);

  assert.equal(preview.enabled, false);
  assert.equal(preview.status, HGO_RUNTIME_PREVIEW_STATUS.ERROR);
  assert.match(preview.errorMessage, /seed missing/);
  assert.equal(harness.storage.values.get(HGO_RUNTIME_PREVIEW_STORAGE_KEY), "false");
});

test("restores persisted enabled setting and can inspect rendered pixels", async () => {
  const storage = createStorage({ [HGO_RUNTIME_PREVIEW_STORAGE_KEY]: "true" });
  const harness = createController({ storage });

  assert.equal(harness.runtimeState.hgoRuntimePreview.enabled, true);

  await harness.controller.setEnabled(true);
  const hit = harness.controller.inspectPoint(0, 0);

  assert.equal(hit.resolved.provinceId, 1);
  assert.equal(harness.runtimeState.hgoRuntimePreview.inspectResult.pixelIndex, 0);
});

test("preview inspection maps canvas coordinates through the HGO viewport", async () => {
  const storage = createStorage({ [HGO_RUNTIME_PREVIEW_STORAGE_KEY]: "true" });
  const canvas = createCanvas();
  canvas.width = 2;
  canvas.height = 2;
  const harness = createController({
    storage,
    canvas,
    loadSeed: async () => ({
      provinces: {
        1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E", type: "land" },
        2: { id: 2, rgb: [11, 21, 31], rgb_key: 726303, rgb_hex: "#0B151F", type: "land" },
      },
      states: [
        { id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 },
        { id: 2, owner: "BBB", controller: "BBB", province_ids: [2], province_count: 1 },
      ],
      countries: {
        AAA: { tag: "AAA", color_rgb: [1, 2, 3], color_hex: "#010203" },
        BBB: { tag: "BBB", color_rgb: [4, 5, 6], color_hex: "#040506" },
      },
      province_to_state: { 1: 1, 2: 2 },
    }),
    loadRaster: async () => ({
      width: 4,
      height: 2,
      pixelFormat: "rgb",
      pixels: [
        10, 20, 30,
        255, 255, 255,
        11, 21, 31,
        255, 255, 255,
        255, 255, 255,
        255, 255, 255,
        255, 255, 255,
        255, 255, 255,
      ],
    }),
  });

  await harness.controller.setEnabled(true);
  const hit = harness.controller.inspectPoint(1, 0);

  assert.equal(hit.x, 2);
  assert.equal(hit.y, 0);
  assert.equal(hit.canvasX, 1);
  assert.equal(hit.canvasY, 0);
  assert.deepEqual(hit.viewport, {
    x: 0,
    y: 0,
    width: 2,
    height: 1,
    canvasWidth: 2,
    canvasHeight: 2,
    sourceWidth: 4,
    sourceHeight: 2,
    fitMode: "contain",
  });
  assert.equal(hit.resolved.provinceId, 2);
  assert.equal(harness.runtimeState.hgoRuntimePreview.inspectResult.pixelIndex, 2);
  assert.equal(harness.controller.inspectPoint(1, 1), null);
});

test("preview render and inspect share projection render options", async () => {
  const storage = createStorage({ [HGO_RUNTIME_PREVIEW_STORAGE_KEY]: "true" });
  const canvas = createCanvas();
  canvas.width = 4;
  canvas.height = 2;
  const projection = createLinearProjection();
  const harness = createController({
    storage,
    canvas,
    renderOptions: () => ({
      projection,
      projectionName: "equalEarth",
      sourceProjection: "equirectangular",
      projectionPixelRatio: 1,
    }),
    loadSeed: async () => ({
      provinces: {
        1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E", type: "land" },
        2: { id: 2, rgb: [11, 21, 31], rgb_key: 726303, rgb_hex: "#0B151F", type: "land" },
      },
      states: [
        { id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 },
        { id: 2, owner: "BBB", controller: "BBB", province_ids: [2], province_count: 1 },
      ],
      countries: {
        AAA: { tag: "AAA", color_rgb: [1, 2, 3], color_hex: "#010203" },
        BBB: { tag: "BBB", color_rgb: [4, 5, 6], color_hex: "#040506" },
      },
      province_to_state: { 1: 1, 2: 2 },
    }),
    loadRaster: async () => ({
      width: 4,
      height: 2,
      pixelFormat: "rgb",
      pixels: [
        10, 20, 30,
        11, 21, 31,
        10, 20, 30,
        11, 21, 31,
        11, 21, 31,
        10, 20, 30,
        11, 21, 31,
        10, 20, 30,
      ],
    }),
  });

  await harness.controller.setEnabled(true);
  const hit = harness.controller.inspectPoint(2, 0);

  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "load");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.projectionName, "equalEarth");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.sourceProjection, "equirectangular");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.projectedPixelCount, 8);
  assert.deepEqual(Array.from(canvas.getLastImageData().imageData.data.slice(8, 12)), [1, 2, 3, 255]);
  assert.equal(hit.pixelIndex, 2);
  assert.equal(hit.resolved.provinceId, 1);
  assert.equal(harness.runtimeState.hgoRuntimePreview.inspectResult.projectionName, "equalEarth");
});

test("preview can render projected buffers without a canvas", async () => {
  const projection = createLinearProjection();
  const harness = createController({
    // headless render 和 inspect 都走同一份 projectionTransform，保证无 canvas 环境也能复现主图坐标映射。
    renderOptions: () => ({ projection, projectionTransform: { x: -1, y: 0, k: 1 } }),
    loadSeed: async () => ({
      provinces: {
        1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E", type: "land" },
        2: { id: 2, rgb: [11, 21, 31], rgb_key: 726303, rgb_hex: "#0B151F", type: "land" },
      },
      states: [
        { id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 },
        { id: 2, owner: "BBB", controller: "BBB", province_ids: [2], province_count: 1 },
      ],
      countries: {
        AAA: { tag: "AAA", color_rgb: [1, 2, 3], color_hex: "#010203" },
        BBB: { tag: "BBB", color_rgb: [4, 5, 6], color_hex: "#040506" },
      },
      province_to_state: { 1: 1, 2: 2 },
    }),
    loadRaster: async () => ({
      width: 4,
      height: 2,
      pixelFormat: "rgb",
      pixels: [
        10, 20, 30,
        11, 21, 31,
        10, 20, 30,
        11, 21, 31,
        11, 21, 31,
        10, 20, 30,
        11, 21, 31,
        10, 20, 30,
      ],
    }),
  });

  await harness.controller.setEnabled(true);
  const rendered = harness.controller.renderPreview({ reason: "headless-projection" });
  const hit = harness.controller.inspectPoint(0, 0);

  assert.equal(rendered.projectionName, "equalEarth");
  assert.equal(rendered.projectedPixelCount, 6);
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.reason, "headless-projection");
  assert.equal(harness.runtimeState.hgoRuntimePreview.renderSummary.projectedPixelCount, 6);
  assert.equal(hit.pixelIndex, 1);
  assert.equal(hit.resolved.provinceId, 2);
  assert.equal(harness.runtimeState.hgoRuntimePreview.inspectResult.projectionName, "equalEarth");
});

test("renderer-side HGO preview owner owns active pass selection, draw, inspect, and bounds", () => {
  const projection = createLinearProjection();
  const runtimeState = {
    dpr: 2,
    width: 8,
    height: 6,
    zoomTransform: { x: -1, y: 0, k: 1.5 },
    hgoRuntimePreview: {
      enabled: true,
      status: HGO_RUNTIME_PREVIEW_STATUS.READY,
    },
  };
  const renderPassNames = Object.freeze(["background", "hgoPreview"]);
  const transformedFramePassNames = Object.freeze(["background", "hgoPreview", "labels"]);
  const contextCalls = [];
  const targetCanvas = {
    width: 16,
    height: 12,
    getContext: () => ({
      setTransform: (...args) => contextCalls.push(["setTransform", ...args]),
      clearRect: (...args) => contextCalls.push(["clearRect", ...args]),
    }),
  };
  const renderCalls = [];
  const owner = createHgoRuntimePreviewRenderOwner({
    runtimeState,
    renderPassNames,
    transformedFramePassNames,
    getProjection: () => projection,
    getMapSvg: () => ({ nodeName: "svg" }),
    getTargetCanvas: () => targetCanvas,
    callRuntimeHook: (_state, hookName, ...args) => {
      if (hookName === "renderHgoRuntimePreviewFn") {
        renderCalls.push(args[0]);
        return {
          projectedPixelCount: 6,
          unprojectedPixelCount: 1,
          resolvedPixelCount: 5,
          unresolvedPixelCount: 1,
        };
      }
      if (hookName === "inspectHgoRuntimePreviewPointFn") {
        return {
          pixelIndex: 7,
          x: args[0],
          y: args[1],
          sourceRgb: [10, 20, 30],
          resolved: {
            provinceId: 42,
            stateId: 3,
            ownerTag: "aaa",
            controllerTag: "bbb",
          },
        };
      }
      return null;
    },
    createHitResult: (payload = {}) => ({ ...payload }),
    resetCanvasContext: (targetContext, width, height) => {
      targetContext.setTransform(1, 0, 0, 1, 0, 0);
      targetContext.clearRect(0, 0, width, height);
    },
    recordRenderPerfMetric: (name, _durationMs, details) => {
      contextCalls.push(["metric", name, details]);
    },
    nowMs: () => 100,
    getD3: () => ({
      pointer: () => [2.5, 3],
    }),
  });

  assert.deepEqual(owner.getActiveRenderPassNames(), ["hgoPreview"]);
  assert.deepEqual(owner.getActiveTransformedFramePassNames(), ["hgoPreview"]);
  assert.deepEqual(owner.getProjectionOptions({ reason: "test" }), {
    projection,
    projectionName: "equalEarth",
    sourceProjection: "equirectangular",
    projectionPixelRatio: 2,
    projectionTransform: { x: -1, y: 0, k: 1.5 },
    reason: "test",
  });

  owner.drawPreviewPass();
  assert.deepEqual(contextCalls[0], ["setTransform", 1, 0, 0, 1, 0, 0]);
  assert.deepEqual(contextCalls[1], ["clearRect", 0, 0, 16, 12]);
  assert.equal(renderCalls[0].reason, "hgo-preview-pass");
  assert.equal(renderCalls[0].targetCanvas, targetCanvas);
  assert.equal(renderCalls[0].targetWidth, 16);
  assert.equal(renderCalls[0].targetHeight, 12);

  const inspected = owner.inspectFromEvent({ type: "pointermove" }, { eventType: "hover" });
  assert.equal(inspected.active, true);
  assert.equal(inspected.point.x, 5);
  assert.equal(inspected.point.y, 6);
  assert.equal(inspected.hit.id, "hgo:province:42");
  assert.equal(inspected.hit.targetType, "hgo");
  assert.equal(inspected.hit.countryCode, "AAA");
  assert.equal(inspected.hit.hitSource, "hgo-runtime-preview");
  assert.equal(inspected.hit.hgoRuntime.pixelIndex, 7);

  const bounds = owner.getProjectedBounds();
  assert.equal(bounds.minX, 0);
  assert.equal(bounds.minY, 0);
  assert.equal(bounds.maxX, 4);
  assert.equal(bounds.maxY, 2);

  runtimeState.hgoRuntimePreview.status = HGO_RUNTIME_PREVIEW_STATUS.IDLE;
  assert.equal(owner.isReady(), false);
  assert.equal(owner.getVisibilitySignature(), "hgo:off");
  assert.equal(owner.getActiveRenderPassNames(), renderPassNames);
  assert.equal(owner.getActiveTransformedFramePassNames(), transformedFramePassNames);
});
