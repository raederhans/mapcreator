import test from "node:test";
import assert from "node:assert/strict";

import { FileManager } from "../js/core/file_manager.js";

async function exportProjectPayload(appState) {
  let capturedBlob = null;
  const previousDocument = globalThis.document;
  const previousUrl = globalThis.URL;
  const previousSetTimeout = globalThis.setTimeout;

  globalThis.document = {
    body: {
      appendChild: () => {},
    },
    getElementById: () => null,
    createElement: () => ({
      click: () => {},
      remove: () => {},
      set download(_value) {},
      set href(_value) {},
    }),
  };
  globalThis.URL = {
    createObjectURL: (blob) => {
      capturedBlob = blob;
      return "blob:project-export";
    },
    revokeObjectURL: () => {},
  };
  globalThis.setTimeout = (callback) => {
    if (typeof callback === "function") callback();
    return 0;
  };

  try {
    FileManager.exportProject(appState);
    assert.ok(capturedBlob, "exportProject should create a project blob");
    return JSON.parse(await capturedBlob.text());
  } finally {
    globalThis.document = previousDocument;
    globalThis.URL = previousUrl;
    globalThis.setTimeout = previousSetTimeout;
  }
}

test("project export preserves strategic overlay counters and legacy kind values", async () => {
  const payload = await exportProjectPayload({
    activePaletteId: "hoi4_vanilla",
    annotationView: {},
    exportWorkbenchUi: {},
    operationGraphics: [{
      id: "opg_front_1",
      kind: "front",
      label: "Front",
      points: [[10, 20], [30, 40]],
      stylePreset: "front",
      stroke: "#334455",
      width: 2,
      opacity: 0.8,
    }],
    operationalLines: [{
      id: "opl_axis_1",
      kind: "axis",
      label: "Axis",
      points: [[11, 21], [31, 41]],
      stylePreset: "axis",
      stroke: "#445566",
      width: 3,
      opacity: 0.75,
      attachedCounterIds: ["unit_1"],
    }],
    showSpecialZones: true,
    specialZoneMembershipBrushMode: "remove",
    specialZoneLayers: {
      layers: [{
        id: "layer-a",
        name: "Layer A",
        visible: true,
        legendVisible: false,
        style: { fill: "#112233", stroke: "#445566", pattern: "dots" },
        memberFeatureIds: ["z", "a"],
      }],
      activeLayerId: "layer-a",
    },
    styleConfig: {
      specialZones: { disputedFill: "#ffffff" },
    },
    transportWorkbenchUi: {},
    unitCounters: [{
      id: "unit_1",
      renderer: "milstd",
      sidc: "130310001412110000000000000000",
      symbolCode: "130310001412110000000000000000",
      label: "I Corps",
      nationTag: "GER",
      nationSource: "manual",
      presetId: "inf",
      unitType: "INF",
      iconId: "infantry",
      echelon: "corps",
      subLabel: "Nord",
      strengthText: "Fresh",
      baseFillColor: "#e8decd",
      organizationPct: 84,
      equipmentPct: 73,
      statsPresetId: "regular",
      statsSource: "manual",
      size: "large",
      facing: 12,
      zIndex: 5,
      anchor: { lon: 181, lat: -91, featureId: "GER" },
      layoutAnchor: { kind: "attachment", key: "opl_axis_1", slotIndex: 2 },
      attachment: { kind: "operational-line", lineId: "opl_axis_1" },
    }],
  });

  assert.deepEqual(payload.operationGraphics, [{
    id: "opg_front_1",
    kind: "front",
    label: "Front",
    points: [[10, 20], [30, 40]],
    stylePreset: "front",
    stroke: "#334455",
    width: 2,
    opacity: 0.8,
  }]);
  assert.deepEqual(payload.operationalLines, [{
    id: "opl_axis_1",
    kind: "axis",
    label: "Axis",
    points: [[11, 21], [31, 41]],
    stylePreset: "axis",
    stroke: "#445566",
    width: 3,
    opacity: 0.75,
    attachedCounterIds: ["unit_1"],
  }]);
  assert.equal(payload.unitCounters[0].baseFillColor, "#e8decd");
  assert.equal(payload.unitCounters[0].organizationPct, 84);
  assert.equal(payload.unitCounters[0].equipmentPct, 73);
  assert.equal(payload.unitCounters[0].statsPresetId, "regular");
  assert.equal(payload.unitCounters[0].statsSource, "manual");
  assert.deepEqual(payload.unitCounters[0].anchor, { lon: 180, lat: -90, featureId: "GER" });
  assert.deepEqual(payload.unitCounters[0].attachment, { kind: "operational-line", lineId: "opl_axis_1" });
  assert.deepEqual(payload.unitCounters[0].layoutAnchor, { kind: "attachment", key: "opl_axis_1", slotIndex: 2 });
  assert.equal(payload.specialZoneMembershipBrushMode, "remove");
  assert.equal(payload.layerVisibility.showSpecialZones, true);
  assert.deepEqual(payload.specialZoneLayers.layers[0].memberFeatureIds, ["a", "z"]);
  assert.equal(payload.specialZoneLayers.layers[0].legendVisible, false);
  assert.equal(Object.hasOwn(payload.styleConfig, "specialZones"), false);
  assert.deepEqual(payload.manualSpecialZones, { type: "FeatureCollection", features: [] });
  assert.equal(Object.hasOwn(payload, "specialRegionOverrides"), false);
});
