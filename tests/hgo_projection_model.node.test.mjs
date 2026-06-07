import assert from "node:assert/strict";
import test from "node:test";

import {
  createHgoProjectionModel,
  mapHgoLonLatToSourcePoint,
  mapHgoSourcePointToLonLat,
} from "../js/core/hgo_projection_model.js";

function createLinearProjection() {
  const projection = (lonLat) => lonLat;
  projection.invert = ([x, y]) => [
    -180 + x * 90,
    90 - y * 90,
  ];
  return projection;
}

test("maps lon/lat points into equirectangular HGO source pixels", () => {
  assert.deepEqual(mapHgoLonLatToSourcePoint([-180, 90], { sourceWidth: 4, sourceHeight: 2 }), {
    lon: -180,
    lat: 90,
    sourceX: 0,
    sourceY: 0,
    pixelIndex: 0,
  });
  assert.deepEqual(mapHgoLonLatToSourcePoint([180, -90], { sourceWidth: 4, sourceHeight: 2 }), {
    lon: 180,
    lat: -90,
    sourceX: 3,
    sourceY: 1,
    pixelIndex: 7,
  });
  assert.equal(mapHgoLonLatToSourcePoint([181, 0], { sourceWidth: 4, sourceHeight: 2 }), null);
});

test("maps source pixels back to lon/lat pixel centers", () => {
  assert.deepEqual(mapHgoSourcePointToLonLat(0, 0, { sourceWidth: 4, sourceHeight: 2 }), [-135, 45]);
  assert.deepEqual(mapHgoSourcePointToLonLat(3, 1, { sourceWidth: 4, sourceHeight: 2 }), [135, -45]);
  assert.equal(mapHgoSourcePointToLonLat(4, 0, { sourceWidth: 4, sourceHeight: 2 }), null);
});

test("inverts projected canvas pixels through dpr and zoom transform", () => {
  const model = createHgoProjectionModel({
    projection: createLinearProjection(),
    sourceWidth: 4,
    sourceHeight: 2,
    targetWidth: 8,
    targetHeight: 4,
    projectionPixelRatio: 2,
    projectionTransform: { k: 2, x: 1, y: 0 },
  });

  const mapped = model.mapCanvasPointToSource(5, 1);

  assert.equal(mapped.projectionPixelRatio, 2);
  assert.equal(mapped.projectionX, 0.875);
  assert.equal(mapped.projectionY, 0.375);
  assert.equal(mapped.sourceX, 0);
  assert.equal(mapped.sourceY, 0);
});

test("returns null for unprojectable canvas points", () => {
  const projection = () => null;
  projection.invert = () => null;
  const model = createHgoProjectionModel({
    projection,
    sourceWidth: 4,
    sourceHeight: 2,
    targetWidth: 4,
    targetHeight: 2,
  });

  assert.equal(model.mapCanvasPointToSource(1, 0), null);
  assert.equal(model.mapCanvasPointToSource(Number.NaN, 0), null);
  assert.equal(model.mapCanvasPointToSource(4, 0), null);
});

test("rejects missing projection invert support", () => {
  assert.throws(() => createHgoProjectionModel({
    projection: () => null,
    sourceWidth: 4,
    sourceHeight: 2,
    targetWidth: 4,
    targetHeight: 2,
  }), /invert/);
});

test("rejects unsupported HGO source projection labels", () => {
  assert.throws(() => createHgoProjectionModel({
    projection: createLinearProjection(),
    sourceWidth: 4,
    sourceHeight: 2,
    targetWidth: 4,
    targetHeight: 2,
    sourceProjection: "mercator",
  }), /source projection/);
});
