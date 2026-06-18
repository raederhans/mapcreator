import assert from "node:assert/strict";
import test from "node:test";

import {
  createHgoProjectionModel,
  mapHgoLonLatToSourcePoint,
  mapHgoSourcePointToLonLat,
} from "../js/core/hgo_projection_model.js";

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

function createSouthPoleClampingProjection() {
  const projection = createLinearProjection();
  projection.invert = ([x, y]) => [
    -180 + x * 90,
    y > 2 ? -90 : 90 - y * 90,
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

test("keeps canvas-to-source mapping stable across dpr zoom and size matrix", () => {
  const projectionPoint = [2.5, 1.5];
  const expectedSource = { sourceX: 5, sourceY: 3, pixelIndex: 29 };
  const cases = [
    { dpr: 1, width: 800, height: 400, transform: { k: 1, x: 0, y: 0 } },
    { dpr: 1.25, width: 1000, height: 500, transform: { k: 1, x: 0, y: 0 } },
    { dpr: 1.5, width: 1200, height: 600, transform: { k: 2.5, x: 4, y: 3 } },
    { dpr: 0.72, width: 576, height: 288, transform: { k: 2.5, x: -1.2, y: 2.4 } },
  ];

  for (const { dpr, width, height, transform } of cases) {
    const model = createHgoProjectionModel({
      projection: createLinearProjection(),
      sourceWidth: 8,
      sourceHeight: 4,
      targetWidth: width,
      targetHeight: height,
      projectionPixelRatio: dpr,
      projectionTransform: transform,
    });
    const canvasX = ((projectionPoint[0] * transform.k) + transform.x) * dpr - 0.5;
    const canvasY = ((projectionPoint[1] * transform.k) + transform.y) * dpr - 0.5;
    const mapped = model.mapCanvasPointToSource(canvasX, canvasY);

    assert.equal(mapped.projectionPixelRatio, dpr);
    assert.equal(mapped.projectionX.toFixed(6), projectionPoint[0].toFixed(6));
    assert.equal(mapped.projectionY.toFixed(6), projectionPoint[1].toFixed(6));
    assert.equal(mapped.sourceX, expectedSource.sourceX);
    assert.equal(mapped.sourceY, expectedSource.sourceY);
    assert.equal(mapped.pixelIndex, expectedSource.pixelIndex);
  }
});

test("matches identity pass pixels after affine zoom reuse", () => {
  const projectionPoint = [2.5, 1.5];
  const dpr = 1.5;
  const zoom = { k: 2.5, x: 4, y: 3 };
  const identityModel = createHgoProjectionModel({
    projection: createLinearProjection(),
    sourceWidth: 8,
    sourceHeight: 4,
    targetWidth: 1200,
    targetHeight: 600,
    projectionPixelRatio: dpr,
    projectionTransform: null,
  });
  const zoomedModel = createHgoProjectionModel({
    projection: createLinearProjection(),
    sourceWidth: 8,
    sourceHeight: 4,
    targetWidth: 1200,
    targetHeight: 600,
    projectionPixelRatio: dpr,
    projectionTransform: zoom,
  });

  const identityHit = identityModel.mapCanvasPointToSource(
    projectionPoint[0] * dpr - 0.5,
    projectionPoint[1] * dpr - 0.5,
  );
  const zoomedHit = zoomedModel.mapCanvasPointToSource(
    ((projectionPoint[0] * zoom.k) + zoom.x) * dpr - 0.5,
    ((projectionPoint[1] * zoom.k) + zoom.y) * dpr - 0.5,
  );

  assert.equal(zoomedHit.pixelIndex, identityHit.pixelIndex);
  assert.equal(zoomedHit.sourceX, identityHit.sourceX);
  assert.equal(zoomedHit.sourceY, identityHit.sourceY);
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

test("rejects inverted lon lat that does not forward round-trip to the projected point", () => {
  const model = createHgoProjectionModel({
    projection: createSouthPoleClampingProjection(),
    sourceWidth: 4,
    sourceHeight: 2,
    targetWidth: 5,
    targetHeight: 5,
  });

  const validHit = model.mapCanvasPointToSource(2, 1);
  assert.equal(validHit.sourceX, 2);
  assert.equal(validHit.sourceY, 1);
  assert.equal(model.mapCanvasPointToSource(2, 3), null);
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
