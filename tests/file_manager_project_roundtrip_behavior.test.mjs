import test from "node:test";
import assert from "node:assert/strict";

import { FileManager } from "../js/core/file_manager.js";
import { resolveImportedTransportCountryOverlayPackIds } from "../js/core/interaction_funnel.js";

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

async function importProjectPayload(payload, observerHooks = {}) {
  const previousDocument = globalThis.document;
  const previousFileReader = globalThis.FileReader;
  const callbacks = [];
  const successes = [];
  const errors = [];

  globalThis.document = {
    getElementById: () => null,
  };
  globalThis.FileReader = class {
    readAsText(file) {
      this.result = file.text;
      queueMicrotask(() => this.onload?.());
    }
  };

  try {
    FileManager.importProject(
      {
        name: "map_project.json",
        text: JSON.stringify(payload),
      },
      async (data) => {
        callbacks.push(data);
      },
      {
        onSuccess: (data) => {
          successes.push(data);
          observerHooks.onSuccess?.(data);
        },
        onError: (error) => {
          errors.push(error);
          observerHooks.onError?.(error);
        },
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { callbacks, successes, errors };
  } finally {
    globalThis.document = previousDocument;
    globalThis.FileReader = previousFileReader;
  }
}

test("project payload builder returns export schema without triggering download", () => {
  const payload = FileManager.buildProjectPayload({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
  });

  assert.equal(payload.schemaVersion, 21);
  assert.equal(payload.scenario.id, "tno_1962");
  assert.equal(payload.scenario.version, 3);
  assert.equal(payload.exportHandoff.artifactKind, "project-json");
  assert.equal(payload.exportHandoff.scenario.id, "tno_1962");
  assert.equal(payload.exportHandoff.project.schemaVersion, 21);
  assert.equal(payload.exportHandoff.exportUi.target, "composite");
  assert.equal(payload.exportHandoff.files[0].path, "map_project.json");
});

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
      transportOverview: {
        activePackIdByFamily: { road: "germany_road" },
      },
      rivers: {
        opacity: 3,
        width: 0.01,
        outlineWidth: -3,
        dashStyle: "",
      },
    },
    transportWorkbenchUi: {
      activeFamily: "road",
      activePackId: "germany_road",
      activePackIdByFamily: { road: "germany_road", rail: "france_rail" },
    },
    transportCountryOverlayState: {
      activePackId: "france_rail",
      family: "rail",
      activePackIdByFamily: { road: "germany_road", rail: "france_rail" },
      status: "ready",
      collectionsByLayer: { railways: { type: "FeatureCollection", features: [] } },
    },
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
  assert.equal(payload.styleConfig.transportOverview.activePackIdByFamily.road, "germany_road");
  assert.deepEqual(payload.styleConfig.rivers, {
    color: "#3b82f6",
    opacity: 1,
    width: 0.2,
    outlineColor: "#e2efff",
    outlineWidth: 0,
    dashStyle: "solid",
  });
  assert.equal(payload.transportWorkbenchUi.activePackId, "germany_road");
  assert.equal(payload.transportWorkbenchUi.activePackIdByFamily.rail, "france_rail");
  assert.deepEqual(payload.transportCountryOverlayState, {
    activePackId: "germany_road",
    family: "road",
    activePackIdByFamily: { road: "germany_road", rail: "france_rail" },
  });
  assert.equal(payload.exportHandoff.artifactKind, "project-json");
  assert.equal(payload.exportHandoff.exportUi.target, "composite");
  assert.equal(Object.hasOwn(payload.exportHandoff.exportUi, "bakeCache"), false);
  assert.deepEqual(payload.manualSpecialZones, { type: "FeatureCollection", features: [] });
  assert.equal(Object.hasOwn(payload, "specialRegionOverrides"), false);
});

test("project import notifies observers after successful import", async () => {
  const payload = await exportProjectPayload({
    activePaletteId: "hoi4_vanilla",
    annotationView: {},
    exportWorkbenchUi: {},
    styleConfig: {
      transportOverview: {
        activePackIdByFamily: { road: "germany_road" },
      },
    },
    transportWorkbenchUi: {
      activeFamily: "road",
      activePackIdByFamily: { road: "germany_road" },
    },
  });

  const result = await importProjectPayload(payload);

  assert.equal(result.callbacks.length, 1);
  assert.equal(result.successes.length, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(result.successes[0].styleConfig.transportOverview.activePackIdByFamily.road, "germany_road");
  assert.equal(result.successes[0].exportHandoff.artifactKind, "project-json");
  assert.equal(result.successes[0].exportHandoff.exportUi.target, "composite");
});

test("project import overlay resolver preserves every main-map transport family", () => {
  const packIds = resolveImportedTransportCountryOverlayPackIds(
    {
      styleConfig: {
        transportOverview: {
          activePackIdByFamily: {
            port: "germany_port",
          },
        },
      },
    },
    {
      transportCountryOverlayState: {
        activePackId: "france_rail",
        activePackIdByFamily: {
          road: "germany_road",
          rail: "france_rail",
          airport: "usa_airport",
          port: "usa_port",
          mineral_resources: "germany_mineral_resources",
        },
      },
    }
  );

  assert.deepEqual(packIds, ["germany_road", "france_rail", "usa_airport", "usa_port", "germany_port"]);
});

test("project import success is not reclassified when status observer fails", async () => {
  const previousConsoleError = console.error;
  const consoleErrors = [];
  console.error = (...args) => {
    consoleErrors.push(args);
  };

  try {
    const payload = await exportProjectPayload({
      activePaletteId: "hoi4_vanilla",
      annotationView: {},
      exportWorkbenchUi: {},
      styleConfig: {
        transportOverview: {
          activePackIdByFamily: { road: "germany_road" },
        },
      },
    });

    const result = await importProjectPayload(payload, {
      onSuccess: () => {
        throw new Error("status render failed");
      },
    });

    assert.equal(result.callbacks.length, 1);
    assert.equal(result.successes.length, 1);
    assert.equal(result.errors.length, 0);
    assert.match(String(consoleErrors[0]?.[0] || ""), /success observer failed/);
  } finally {
    console.error = previousConsoleError;
  }
});
