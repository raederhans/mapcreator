import assert from "node:assert/strict";
import test from "node:test";

import {
  createIntensityFieldsState,
  INTENSITY_FIELD_GRID,
  updateIntensityFieldChannel,
} from "../js/core/state.js";
import {
  createIntensityFieldMaskOwner,
  mapIntensityToMaskGrayByte,
} from "../js/core/renderer/intensity_field_mask_owner.js";

function createRecordingCanvasFactory() {
  const canvases = [];
  const createCanvas = (width, height) => {
    const context = {
      fillStyle: "",
      fills: [],
      path: [],
      setTransform(...args) {
        this.transform = args;
      },
      clearRect(...args) {
        this.clearRectArgs = args;
      },
      beginPath() {
        this.path = [];
      },
      moveTo(x, y) {
        this.path.push(["M", x, y]);
      },
      lineTo(x, y) {
        this.path.push(["L", x, y]);
      },
      closePath() {
        this.path.push(["Z"]);
      },
      fill() {
        this.fills.push({
          fillStyle: this.fillStyle,
          path: [...this.path],
        });
      },
    };
    const canvas = {
      width,
      height,
      context,
      getContext(type) {
        return type === "2d" ? context : null;
      },
    };
    canvases.push(canvas);
    return canvas;
  };
  return { canvases, createCanvas };
}

function createLinearProjection() {
  return ([lon, lat]) => [lon + 180, 90 - lat];
}

test("intensity field mask owner skips neutral channels without allocating canvas", () => {
  let fields = createIntensityFieldsState();
  fields = updateIntensityFieldChannel(fields, "oceanDepth", (channel) => {
    channel.enabled = true;
  });
  const { canvases, createCanvas } = createRecordingCanvasFactory();
  const owner = createIntensityFieldMaskOwner({
    getFieldsState: () => fields,
    getProjection: createLinearProjection,
    createCanvas,
  });

  const result = owner.getMaskCanvas("oceanDepth", {
    transform: { x: 0, y: 0, k: 1 },
    widthPx: 360,
    heightPx: 180,
    dpr: 1,
  });

  assert.equal(result.canvas, null);
  assert.equal(result.reason, "neutral");
  assert.equal(result.renderedRunCount, 0);
  assert.equal(canvases.length, 0);
});

test("intensity field mask owner renders row runs, caches, and invalidates by channel", () => {
  let fields = createIntensityFieldsState();
  fields = updateIntensityFieldChannel(fields, "oceanDepth", (channel) => {
    channel.enabled = true;
    const row = 10;
    const rowOffset = row * INTENSITY_FIELD_GRID.columns;
    channel.grid.base[rowOffset + 20] = 1.5;
    channel.grid.base[rowOffset + 21] = 1.5;
    channel.grid.base[rowOffset + 22] = 1.5;
    channel.grid.base[rowOffset + 24] = 0.5;
  });
  const { canvases, createCanvas } = createRecordingCanvasFactory();
  const owner = createIntensityFieldMaskOwner({
    getFieldsState: () => fields,
    getProjection: createLinearProjection,
    createCanvas,
  });

  const options = {
    transform: { x: 0, y: 0, k: 1 },
    widthPx: 360,
    heightPx: 180,
    dpr: 1,
    grayMap: { min: 28, neutral: 128, max: 232 },
    projectionKey: "linear",
  };
  const first = owner.getMaskCanvas("oceanDepth", options);

  assert.ok(first.canvas);
  assert.equal(first.cacheHit, false);
  // 相邻同强度 cell 合并为一个 run，单独低强度 cell 保持独立，防止 mask 优化吞掉强度边界。
  assert.equal(first.renderedRunCount, 2);
  assert.equal(first.renderedCellCount, 4);
  assert.equal(canvases.length, 1);
  assert.equal(canvases[0].context.fills.length, 2);
  assert.deepEqual(
    canvases[0].context.fills.map((fill) => fill.fillStyle),
    ["rgb(180, 180, 180)", "rgb(78, 78, 78)"],
  );

  const cached = owner.getMaskCanvas("oceanDepth", options);
  assert.equal(cached.canvas, first.canvas);
  assert.equal(cached.cacheHit, true);
  assert.equal(canvases.length, 1);

  owner.invalidateMask("oceanDepth");
  const redrawn = owner.getMaskCanvas("oceanDepth", options);
  assert.ok(redrawn.canvas);
  assert.equal(redrawn.cacheHit, false);
  assert.equal(canvases.length, 2);
});

test("intensity field mask gray map keeps neutral stable", () => {
  const grayMap = { min: 28, neutral: 128, max: 232 };

  assert.equal(mapIntensityToMaskGrayByte(1, grayMap), 128);
  assert.equal(mapIntensityToMaskGrayByte(0, grayMap), 28);
  assert.equal(mapIntensityToMaskGrayByte(2, grayMap), 232);
  assert.ok(mapIntensityToMaskGrayByte(0.5, grayMap) < 128);
  assert.ok(mapIntensityToMaskGrayByte(1.5, grayMap) > 128);
});
