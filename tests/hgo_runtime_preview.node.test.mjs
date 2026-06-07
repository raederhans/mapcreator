import assert from "node:assert/strict";
import test from "node:test";

import {
  HGO_RUNTIME_PREVIEW_STATUS,
  HGO_RUNTIME_PREVIEW_STORAGE_KEY,
  createHgoRuntimePreviewController,
  ensureHgoRuntimePreviewState,
} from "../js/core/hgo_runtime_preview.js";

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

test("loads seed and raster once while already enabled", async () => {
  const harness = createController();

  await harness.controller.setEnabled(true);
  await harness.controller.setEnabled(true);

  assert.equal(harness.runtimeState.hgoRuntimePreview.enabled, true);
  assert.equal(harness.runtimeState.hgoRuntimePreview.status, HGO_RUNTIME_PREVIEW_STATUS.READY);
  assert.equal(harness.getSeedLoadCount(), 1);
  assert.equal(harness.getRasterLoadCount(), 1);
  assert.deepEqual(harness.runtimeState.hgoRuntimePreview.renderSummary, {
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

  const rendered = harness.controller.renderPreview();

  assert.equal(canvas.getPutCount(), 2);
  assert.equal(rendered.resolvedPixelCount, 1);
  assert.equal(canvas.getLastImageData().x, 0);
  assert.equal(canvas.getLastImageData().y, 0);
  assert.deepEqual(Array.from(canvas.getLastImageData().imageData.data), [1, 2, 3, 255]);
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
