import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  buildWorkerPixelRingsForGeometry,
  collectRasterPolygonalGeometryParts,
} from "../js/core/map_renderer/political_raster_worker_packet.js";

test("political raster worker preserves scene data identity in replies", async () => {
  const workerSource = await readFile(new URL("../js/workers/political_raster.worker.js", import.meta.url), "utf8");
  const postedMessages = [];
  const self = {
    performance: { now: () => 100 },
    postMessage(message) {
      postedMessages.push(message);
    },
  };
  vm.runInNewContext(workerSource, { self });

  const identity = {
    sceneGeneration: 7,
    scenarioDataGeneration: 11,
    scenarioId: "tno_1962",
    selectionVersion: 13,
    topologyRevision: 17,
    colorRevision: 19,
    transformBucket: "100:0:0",
    dpr: 2,
    viewport: { x: 1, y: 2, width: 800, height: 600 },
    passSignature: "political-pass",
  };
  self.onmessage({
    data: {
      protocolVersion: 4,
      type: "RASTER_POLITICAL_PASS",
      taskId: "identity-roundtrip",
      identity,
      renderHint: { pass: "political" },
    },
  });

  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].type, "RASTER_RESULT");
  assert.equal(postedMessages[0].identity.sceneGeneration, 7);
  assert.equal(postedMessages[0].identity.scenarioDataGeneration, 11);
  assert.equal(postedMessages[0].identity.passSignature, "political-pass");
});

test("political raster worker preserves scene data identity in bitmap error replies", async () => {
  const workerSource = await readFile(new URL("../js/workers/political_raster.worker.js", import.meta.url), "utf8");
  const postedMessages = [];
  const self = {
    performance: { now: () => 100 },
    postMessage(message) {
      postedMessages.push(message);
    },
  };
  vm.runInNewContext(workerSource, { self });

  const identity = {
    sceneGeneration: 23,
    scenarioDataGeneration: 29,
    scenarioId: "tno_1962",
    selectionVersion: 31,
    topologyRevision: 37,
    colorRevision: 41,
    transformBucket: "100:0:0",
    dpr: 2,
    viewport: { x: 1, y: 2, width: 800, height: 600 },
    passSignature: "political-bitmap-pass",
  };
  self.onmessage({
    data: {
      protocolVersion: 4,
      type: "RASTER_POLITICAL_PASS",
      taskId: "identity-bitmap-error",
      identity,
      renderHint: { pass: "political", bitmapMode: true },
      rasterPacket: {
        canvasPxWidth: 10,
        canvasPxHeight: 10,
        entries: [{ id: "DE", rings: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }],
      },
    },
  });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].type, "ERROR");
  assert.equal(postedMessages[0].errorCode, "offscreen-canvas-unavailable");
  assert.equal(postedMessages[0].identity.sceneGeneration, 23);
  assert.equal(postedMessages[0].identity.scenarioDataGeneration, 29);
  assert.equal(postedMessages[0].identity.passSignature, "political-bitmap-pass");
});

test("political raster worker preserves scene data identity when bitmap rasterization throws", async () => {
  const workerSource = await readFile(new URL("../js/workers/political_raster.worker.js", import.meta.url), "utf8");
  const postedMessages = [];
  class ThrowingOffscreenCanvas {
    getContext() {
      return {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        fill() {},
        stroke() {},
      };
    }

    transferToImageBitmap() {
      throw new Error("bitmap-transfer-failed");
    }
  }
  const self = {
    performance: { now: () => 100 },
    postMessage(message) {
      postedMessages.push(message);
    },
  };
  vm.runInNewContext(workerSource, { self, OffscreenCanvas: ThrowingOffscreenCanvas });

  const identity = {
    sceneGeneration: 43,
    scenarioDataGeneration: 47,
    scenarioId: "tno_1962",
    selectionVersion: 53,
    topologyRevision: 59,
    colorRevision: 61,
    transformBucket: "100:0:0",
    dpr: 2,
    viewport: { x: 1, y: 2, width: 800, height: 600 },
    passSignature: "political-bitmap-throw",
  };
  self.onmessage({
    data: {
      protocolVersion: 4,
      type: "RASTER_POLITICAL_PASS",
      taskId: "identity-bitmap-throw",
      identity,
      packetBuildMs: 6,
      renderHint: { pass: "political", bitmapMode: true, canvasPxWidth: 10, canvasPxHeight: 10 },
      rasterPacket: {
        canvasPxWidth: 10,
        canvasPxHeight: 10,
        entries: [{ id: "DE", rings: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }],
      },
    },
  });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(postedMessages.length, 1);
  assert.equal(postedMessages[0].type, "ERROR");
  assert.equal(postedMessages[0].errorCode, "raster-failed");
  assert.equal(postedMessages[0].message, "bitmap-transfer-failed");
  assert.equal(postedMessages[0].identity.sceneGeneration, 43);
  assert.equal(postedMessages[0].identity.scenarioDataGeneration, 47);
  assert.equal(postedMessages[0].packetBuildMs, 6);
  assert.equal(postedMessages[0].renderHint.bitmapMode, true);
});

test("collectRasterPolygonalGeometryParts flattens geometry collections to polygons", () => {
  const geometry = {
    type: "GeometryCollection",
    geometries: [
      {
        type: "Polygon",
        coordinates: [[[0, 0], [2, 0], [0, 2], [0, 0]]],
      },
      {
        type: "MultiPolygon",
        coordinates: [
          [[[10, 10], [12, 10], [10, 12], [10, 10]]],
          [[[20, 20], [22, 20], [20, 22], [20, 20]]],
        ],
      },
      {
        type: "LineString",
        coordinates: [[99, 99], [100, 100]],
      },
    ],
  };

  const parts = collectRasterPolygonalGeometryParts(geometry);
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map((part) => part.type), ["Polygon", "Polygon", "Polygon"]);
});

test("buildWorkerPixelRingsForGeometry projects geometry collection polygon rings", () => {
  const geometry = {
    type: "GeometryCollection",
    geometries: [
      {
        type: "Polygon",
        coordinates: [[[0, 0], [2, 0], [0, 2], [0, 0]]],
      },
      {
        type: "MultiPolygon",
        coordinates: [
          [[[10, 10], [12, 10], [10, 12], [10, 10]]],
        ],
      },
    ],
  };

  const rings = buildWorkerPixelRingsForGeometry(geometry, ([x, y]) => [x * 2, y * 3]);
  assert.deepEqual(rings, [
    [[0, 0], [4, 0], [0, 6], [0, 0]],
    [[20, 30], [24, 30], [20, 36], [20, 30]],
  ]);
});
