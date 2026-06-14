import test from "node:test";
import assert from "node:assert/strict";

import {
  collectSpatialItemsForProjectedRects,
  collectVisibleSpatialItemsWithStats,
  doesSpatialItemIntersectProjectedRect,
  getProjectedRectCellSpan,
} from "../js/core/renderer/spatial_query_index.js";

function createItem(id, drawOrder, minX, minY, maxX, maxY) {
  return { id, drawOrder, minX, minY, maxX, maxY, feature: { properties: { id } } };
}

function createGridSnapshot() {
  const alpha = createItem("alpha", 2, 0, 0, 40, 40);
  const beta = createItem("beta", 1, 20, 20, 80, 80);
  const hidden = createItem("hidden", 3, 15, 15, 30, 30);
  const global = createItem("global", 0, -100, -100, 500, 500);
  const grid = new Map([
    ["0,0", [alpha, beta, hidden]],
    ["1,1", [beta]],
  ]);
  return {
    grid,
    gridMeta: {
      cellSize: 50,
      cols: 2,
      rows: 2,
      width: 100,
      height: 100,
      globals: [global],
    },
    items: [alpha, beta, hidden, global],
  };
}

test("spatial query cell span clamps projected rects to grid bounds", () => {
  assert.deepEqual(getProjectedRectCellSpan({ minX: -30, minY: 20, maxX: 150, maxY: 120 }, {
    cellSize: 50,
    cols: 2,
    rows: 2,
  }), {
    colStart: 0,
    colEnd: 1,
    rowStart: 0,
    rowEnd: 1,
    cols: 2,
    rows: 2,
  });
});

test("spatial query detects projected rect intersection", () => {
  const item = createItem("a", 0, 0, 0, 10, 10);
  assert.equal(doesSpatialItemIntersectProjectedRect(item, { minX: 5, minY: 5, maxX: 15, maxY: 15 }), true);
  assert.equal(doesSpatialItemIntersectProjectedRect(item, { minX: 11, minY: 5, maxX: 15, maxY: 15 }), false);
});

test("spatial rect query dedupes cells, includes globals, and preserves draw order", () => {
  const snapshot = createGridSnapshot();
  const result = collectSpatialItemsForProjectedRects({
    ...snapshot,
    projectedRects: [{ minX: 0, minY: 0, maxX: 90, maxY: 90 }],
    shouldIncludeItem: (item) => item.id !== "hidden",
  });

  assert.deepEqual(result.items.map((item) => item.id), ["global", "beta", "alpha"]);
  assert.equal(result.overflow, false);
});

test("spatial rect query reports overflow after max candidate threshold", () => {
  const snapshot = createGridSnapshot();
  const result = collectSpatialItemsForProjectedRects({
    ...snapshot,
    projectedRects: [{ minX: 0, minY: 0, maxX: 90, maxY: 90 }],
    maxCandidates: 1,
  });

  assert.equal(result.overflow, true);
  assert.equal(result.items.length, 2);
});

test("visible spatial query returns stats for visited cells and globals", () => {
  const snapshot = createGridSnapshot();
  const result = collectVisibleSpatialItemsWithStats({
    ...snapshot,
    viewportBounds: { minX: 0, minY: 0, maxX: 90, maxY: 90 },
    overscanPx: 25,
    shouldIncludeItem: (item) => item.id !== "hidden",
  });

  assert.deepEqual(result.items.map((item) => item.id), ["global", "beta", "alpha"]);
  assert.equal(result.stats.cellCandidateCount, 4);
  assert.equal(result.stats.globalCandidateCount, 1);
  assert.equal(result.stats.visitedCellCount, 4);
  assert.equal(result.stats.overscanPx, 25);
  assert.deepEqual(result.stats.cellSpan, {
    colStart: 0,
    colEnd: 1,
    rowStart: 0,
    rowEnd: 1,
    cols: 2,
    rows: 2,
  });
});

test("visible spatial query accepts iterable globals", () => {
  const snapshot = createGridSnapshot();
  snapshot.gridMeta.globals = new Set(snapshot.gridMeta.globals);

  const result = collectVisibleSpatialItemsWithStats({
    ...snapshot,
    viewportBounds: { minX: 0, minY: 0, maxX: 90, maxY: 90 },
  });

  assert.equal(result.stats.globalCandidateCount, 1);
  assert.equal(result.items.some((item) => item.id === "global"), true);
});

test("visible spatial query reads map globals as values", () => {
  const snapshot = createGridSnapshot();
  const global = snapshot.gridMeta.globals[0];
  snapshot.gridMeta.globals = new Map([[global.id, global]]);

  const result = collectVisibleSpatialItemsWithStats({
    ...snapshot,
    viewportBounds: { minX: 0, minY: 0, maxX: 90, maxY: 90 },
  });

  assert.equal(result.stats.globalCandidateCount, 1);
  assert.deepEqual(result.items.map((item) => item.id), ["global", "beta", "alpha", "hidden"]);
});
