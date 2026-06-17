import assert from "node:assert/strict";
import test from "node:test";

import {
  getLatitudeAdjustedSimplifyEpsilon,
  sanitizePolyline,
  simplifyPolylineEffectiveArea,
  simplifyPolylineRDP,
} from "../js/core/renderer/polyline_simplification_helpers.js";

test("sanitizePolyline removes invalid points and consecutive duplicates", () => {
  assert.deepEqual(
    sanitizePolyline([
      [1, 2],
      [1, 2],
      ["3", "4"],
      ["x", 5],
      null,
      [3, 4],
      [5, Infinity],
      [6, 7],
    ]),
    [
      [1, 2],
      [3, 4],
      [6, 7],
    ]
  );
  assert.deepEqual(sanitizePolyline(null), []);
});

test("simplifyPolylineRDP with epsilon 0 returns a shallow copy", () => {
  const first = [0, 0];
  const middle = [1, 0.1];
  const last = [2, 0];
  const points = [first, middle, last];
  const simplified = simplifyPolylineRDP(points, 0);

  assert.notEqual(simplified, points);
  assert.deepEqual(simplified, points);
  assert.equal(simplified[0], first);
  assert.equal(simplified[1], middle);
  assert.equal(simplified[2], last);
});

test("simplifyPolylineRDP preserves endpoints and removes simple middle points", () => {
  const points = [[0, 0], [1, 0.1], [2, 0]];
  assert.deepEqual(simplifyPolylineRDP(points, 0.2), [[0, 0], [2, 0]]);
});

test("simplifyPolylineEffectiveArea with threshold 0 returns a copy", () => {
  const first = [0, 0];
  const middle = [1, 0.1];
  const last = [2, 0];
  const points = [first, middle, last];
  const simplified = simplifyPolylineEffectiveArea(points, 0);

  assert.notEqual(simplified, points);
  assert.deepEqual(simplified, points);
  assert.equal(simplified[0], first);
  assert.equal(simplified[1], middle);
  assert.equal(simplified[2], last);
});

test("simplifyPolylineEffectiveArea keeps at least two points", () => {
  const points = [[0, 0], [1, 0], [2, 0], [3, 0]];
  assert.deepEqual(simplifyPolylineEffectiveArea(points, 100), [[0, 0], [3, 0]]);
});

test("getLatitudeAdjustedSimplifyEpsilon scales high latitudes within clamp limits", () => {
  assert.equal(getLatitudeAdjustedSimplifyEpsilon(0, [[0, 85]]), 0);
  assert.equal(getLatitudeAdjustedSimplifyEpsilon(10, [[0, 0], [1, 0]]), 10);
  assert.equal(getLatitudeAdjustedSimplifyEpsilon(10, [[0, 90], [1, -90]]), 28);
  assert.ok(getLatitudeAdjustedSimplifyEpsilon(10, [[0, 75], [1, 75]]) > 10);
});

test("simplifyPolylineEffectiveArea preserves representative output", () => {
  const points = [[0, 0], [1, 0.05], [2, 0], [3, 1], [4, 0]];
  assert.deepEqual(
    simplifyPolylineEffectiveArea(points, 0.1),
    [[0, 0], [2, 0], [3, 1], [4, 0]]
  );
});
