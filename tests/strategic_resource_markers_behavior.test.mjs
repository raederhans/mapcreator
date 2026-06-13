import test from "node:test";
import assert from "node:assert/strict";

import {
  STRATEGIC_RESOURCE_TIER_MIN_ZOOM,
  buildStrategicResourceMarkerEntries,
  shouldRenderStrategicResourceMarker,
} from "../js/core/renderer/strategic_resource_markers.js";

function resourceFeature(resource, amount, tier, coordinates = [10, 50]) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {
      resource,
      amount,
      tier,
      state_id: 10,
      owner_tag: "POL",
      anchor_kind: "vp_city",
    },
  };
}

test("strategic resource markers return empty entries for empty payloads", () => {
  assert.deepEqual(buildStrategicResourceMarkerEntries(null), []);
  assert.deepEqual(buildStrategicResourceMarkerEntries({ resource_points: { type: "FeatureCollection", features: [] } }), []);
  assert.deepEqual(buildStrategicResourceMarkerEntries({ resourcePoints: { type: "FeatureCollection", features: [] } }), []);
});

test("strategic resource markers respect show, amount, and resource gates", () => {
  const collection = {
    type: "FeatureCollection",
    features: [
      resourceFeature("steel", 6, 2),
      resourceFeature("oil", 0, 3),
      resourceFeature("rubber", 4, 1),
      resourceFeature("unknown", 9, 3),
    ],
  };

  assert.deepEqual(buildStrategicResourceMarkerEntries(collection, { showResourceMarkers: false, zoom: 5 }), []);
  assert.deepEqual(
    buildStrategicResourceMarkerEntries(collection, { zoom: 5, resources: ["steel"], minAmount: 1 }).map((entry) => entry.resource),
    ["steel"],
  );
  assert.deepEqual(
    buildStrategicResourceMarkerEntries(collection, { zoom: 5, resources: ["steel"], minAmount: 7 }),
    [],
  );
});

test("strategic resource marker zoom and tier gates keep coarse views sparse", () => {
  const lowTier = resourceFeature("steel", 5, 1);
  const highTier = resourceFeature("oil", 20, 3, [11, 51]);
  const collection = { type: "FeatureCollection", features: [lowTier, highTier] };

  assert.equal(shouldRenderStrategicResourceMarker(lowTier, { zoom: STRATEGIC_RESOURCE_TIER_MIN_ZOOM[1] - 0.1 }), false);
  assert.equal(shouldRenderStrategicResourceMarker(highTier, { zoom: STRATEGIC_RESOURCE_TIER_MIN_ZOOM[3] }), true);
  assert.equal(shouldRenderStrategicResourceMarker(highTier, { zoom: 5, minTier: 4 }), false);
  assert.deepEqual(
    buildStrategicResourceMarkerEntries(collection, { zoom: 1 }).map((entry) => entry.resource),
    ["oil"],
  );
});

test("strategic resource marker entries expose renderable marker descriptions", () => {
  const entries = buildStrategicResourceMarkerEntries(
    { resource_points: { type: "FeatureCollection", features: [resourceFeature("steel", 6, 2)] } },
    { zoom: 5 },
  );

  assert.deepEqual(entries, [{
    id: "steel:10:10:50:0",
    resource: "steel",
    amount: 6,
    tier: 2,
    lon: 10,
    lat: 50,
    ownerTag: "POL",
    stateId: 10,
    anchorKind: "vp_city",
    radiusPx: 6.2,
  }]);
});
