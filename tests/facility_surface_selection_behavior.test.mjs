import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUnderlyingMapHoverClearPatch,
  shouldBlockUnderlyingMapSelectionForFacility,
} from "../js/core/renderer/facility_surface.js";

test("airport and port facility hits block underlying map selection by default", () => {
  assert.equal(shouldBlockUnderlyingMapSelectionForFacility({ familyId: "airport" }, false), true);
  assert.equal(shouldBlockUnderlyingMapSelectionForFacility({ familyId: "port" }, false), true);
  assert.equal(shouldBlockUnderlyingMapSelectionForFacility({ familyId: "rail" }, false), false);
  assert.equal(shouldBlockUnderlyingMapSelectionForFacility({ familyId: "airport" }, true), false);
});

test("facility hover blocking clears land, water, special, and dev hover state", () => {
  const patch = buildUnderlyingMapHoverClearPatch({
    hoveredId: "AAA",
    hoveredWaterRegionId: "water-1",
    hoveredSpecialRegionId: "special-1",
    devHoverHit: { id: "AAA", targetType: "land" },
  });

  assert.deepEqual(patch, {
    hadUnderlyingHover: true,
    hoveredId: null,
    hoveredWaterRegionId: null,
    hoveredSpecialRegionId: null,
    devHoverHit: null,
  });
});

test("facility hover clear patch stays quiet when no underlying hit is active", () => {
  const patch = buildUnderlyingMapHoverClearPatch({});
  assert.equal(patch.hadUnderlyingHover, false);
  assert.equal(patch.hoveredId, null);
  assert.equal(patch.hoveredWaterRegionId, null);
  assert.equal(patch.hoveredSpecialRegionId, null);
  assert.equal(patch.devHoverHit, null);
});
