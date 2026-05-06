import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  TRANSPORT_FACILITY_ICON_CELLS,
  getTransportFacilityIconAtlasImage,
  getTransportFacilityIconAtlasStatus,
  getTransportFacilityIconCell,
  resolveTransportFacilityIconDrawSizePx,
  resolveTransportFacilityIconKey,
} from "../js/core/renderer/transport_facility_icons.js";

const globalAirportsUrl = new URL("../data/transport_layers/global_airport/airports.geojson", import.meta.url);
const globalPortsUrl = new URL("../data/transport_layers/global_port/ports.geojson", import.meta.url);

const airportData = JSON.parse(await readFile(globalAirportsUrl, "utf8"));
const portData = JSON.parse(await readFile(globalPortsUrl, "utf8"));

function sampleFeatures(collection, count = 300) {
  return Array.isArray(collection?.features) ? collection.features.slice(0, count) : [];
}

test("transport facility icon owner exposes a compact 4x2 atlas contract", () => {
  assert.equal(Object.keys(TRANSPORT_FACILITY_ICON_CELLS).length, 8);
  for (const [key, cell] of Object.entries(TRANSPORT_FACILITY_ICON_CELLS)) {
    assert.equal(getTransportFacilityIconCell(key), cell);
    assert.equal(cell.size, 64);
    assert.ok(cell.x === 0 || cell.x === 64 || cell.x === 128 || cell.x === 192);
    assert.ok(cell.y === 0 || cell.y === 64);
  }
});

test("airport subcategories resolve to stable icon keys", () => {
  assert.equal(resolveTransportFacilityIconKey("airport", { airport_type: "spaceport" }), "airport_spaceport");
  assert.equal(resolveTransportFacilityIconKey("airport", { airport_type: "military" }), "airport_military");
  assert.equal(resolveTransportFacilityIconKey("airport", { airport_type: "major" }), "airport_major");
  assert.equal(resolveTransportFacilityIconKey("airport", { airport_type: "regional" }), "airport_regional");
  assert.equal(resolveTransportFacilityIconKey("airport", { airport_type: "local" }), "airport_local");
  assert.equal(resolveTransportFacilityIconKey("airport", { importance_rank: 3 }), "airport_major");
  assert.equal(resolveTransportFacilityIconKey("airport", { importance_rank: 2 }), "airport_regional");
});

test("port subcategories resolve to stable icon keys", () => {
  assert.equal(resolveTransportFacilityIconKey("port", { legal_designation: "international_hub" }), "port_hub");
  assert.equal(resolveTransportFacilityIconKey("port", { legal_designation: "important" }), "port_important");
  assert.equal(resolveTransportFacilityIconKey("port", { legal_designation: "local" }), "port_local");
  assert.equal(resolveTransportFacilityIconKey("port", { importance_rank: 3 }), "port_hub");
  assert.equal(resolveTransportFacilityIconKey("port", { importance_rank: 2 }), "port_important");
});

test("real transport data maps every airport and port sample to an atlas cell", () => {
  for (const feature of sampleFeatures(airportData)) {
    const key = resolveTransportFacilityIconKey("airport", feature.properties || {});
    assert.ok(getTransportFacilityIconCell(key), `airport icon key ${key} should have a cell`);
  }
  for (const feature of sampleFeatures(portData)) {
    const key = resolveTransportFacilityIconKey("port", feature.properties || {});
    assert.ok(getTransportFacilityIconCell(key), `port icon key ${key} should have a cell`);
  }
});

test("transport facility icon size stays in small screen-pixel bounds", () => {
  for (const familyId of ["airport", "port"]) {
    for (const visualScale of [0.25, 1, 1.8, 3]) {
      const size = resolveTransportFacilityIconDrawSizePx(familyId, { importance_rank: 3 }, { visualScale });
      assert.ok(size >= 10, `${familyId} size ${size} should stay readable`);
      assert.ok(size <= 18, `${familyId} size ${size} should stay compact`);
    }
  }
});

test("atlas loader exposes loading and ready states without registering invisible targets", async () => {
  const moduleUrl = new URL(`../js/core/renderer/transport_facility_icons.js?ready-status=${Date.now()}`, import.meta.url);
  const iconModule = await import(moduleUrl.href);
  const previousImage = globalThis.Image;
  let imageInstance = null;
  let callbackCount = 0;
  class MockImage {
    constructor() {
      imageInstance = this;
      this.complete = false;
      this.naturalWidth = 0;
    }
    set src(value) {
      this.value = value;
    }
  }
  try {
    globalThis.Image = MockImage;
    const image = iconModule.getTransportFacilityIconAtlasImage(() => {
      callbackCount += 1;
    });
    assert.equal(image, imageInstance);
    assert.equal(iconModule.getTransportFacilityIconAtlasStatus(), "loading");
    imageInstance.naturalWidth = 256;
    imageInstance.onload();
    assert.equal(iconModule.getTransportFacilityIconAtlasStatus(), "ready");
    assert.equal(callbackCount, 1);
    assert.equal(iconModule.isTransportFacilityIconAtlasReady(), true);
  } finally {
    globalThis.Image = previousImage;
  }
});

test("atlas loader exposes error state for render-owner gating", async () => {
  const moduleUrl = new URL(`../js/core/renderer/transport_facility_icons.js?error-status=${Date.now()}`, import.meta.url);
  const iconModule = await import(moduleUrl.href);
  const previousImage = globalThis.Image;
  let imageInstance = null;
  class MockImage {
    constructor() {
      imageInstance = this;
      this.complete = false;
      this.naturalWidth = 0;
    }
    set src(value) {
      this.value = value;
    }
  }
  try {
    globalThis.Image = MockImage;
    iconModule.getTransportFacilityIconAtlasImage(() => {});
    imageInstance.onerror();
    assert.equal(iconModule.getTransportFacilityIconAtlasStatus(), "error");
    assert.equal(iconModule.isTransportFacilityIconAtlasReady(), false);
  } finally {
    globalThis.Image = previousImage;
  }
});
