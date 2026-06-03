import test from "node:test";
import assert from "node:assert/strict";

import { FileManager } from "../js/core/file_manager.js";
import { resolveImportedTransportCountryOverlayPackIds } from "../js/core/interaction_funnel.js";
import { prepareProjectImportFile } from "../js/core/project_package_io.js";
import { unzipSync, zipSync, strFromU8, strToU8 } from "../vendor/fflate.browser.js";

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
    await FileManager.exportProject(appState);
    assert.ok(capturedBlob, "exportProject should create a project blob");
    return JSON.parse(await capturedBlob.text());
  } finally {
    globalThis.document = previousDocument;
    globalThis.URL = previousUrl;
    globalThis.setTimeout = previousSetTimeout;
  }
}

async function exportProjectBlob(appState, options = {}) {
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
    await FileManager.exportProject(appState, options);
    assert.ok(capturedBlob, "exportProject should create a project blob");
    return capturedBlob;
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
  assert.equal(Object.hasOwn(payload.exportHandoff.files[0], "byteLength"), false);
  assert.equal(Object.hasOwn(payload.exportHandoff.files[0], "checksum"), false);
});

test("project payload builder keeps open ocean selectable by default", () => {
  const payload = FileManager.buildProjectPayload({
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
  });

  assert.equal(payload.layerVisibility.showWaterRegions, true);
  assert.equal(payload.layerVisibility.showOpenOceanRegions, true);
  assert.equal(payload.layerVisibility.allowOpenOceanSelect, true);
  assert.equal(payload.layerVisibility.allowOpenOceanPaint, false);
});

test("project import restores missing open ocean flags as selectable without paint", async () => {
  const payload = await exportProjectPayload({
    annotationView: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  });
  delete payload.layerVisibility.showOpenOceanRegions;
  delete payload.layerVisibility.allowOpenOceanSelect;
  delete payload.layerVisibility.allowOpenOceanPaint;

  const result = await importProjectPayload(payload);

  assert.equal(result.successes.length, 1);
  assert.equal(result.successes[0].layerVisibility.showOpenOceanRegions, true);
  assert.equal(result.successes[0].layerVisibility.allowOpenOceanSelect, true);
  assert.equal(result.successes[0].layerVisibility.allowOpenOceanPaint, false);
});

test("project zip download keeps editable project and manifest files", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });

  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(entries["map_project.json"], "zip should include editable project JSON");
  assert.ok(entries["project/map_project.json"], "zip should include canonical project directory");
  assert.ok(entries["manifest.json"], "zip should include package manifest");
  assert.ok(entries["map_project_manifest.json"], "zip should include legacy project manifest pointer");
  assert.ok(entries["metadata/export_settings.json"], "recommended package should include export settings");
  assert.ok(entries["resources/project_resource_index.json"], "recommended package should include resource index");
  const projectPayload = JSON.parse(strFromU8(entries["map_project.json"]));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));

  assert.equal(projectPayload.schemaVersion, 21);
  assert.equal(manifest.artifactKind, "project-zip");
  assert.equal(manifest.packageKind, "editable-project-package");
  assert.equal(manifest.files[0].path, "map_project.json");
  assert.equal(manifest.files[0].role, "editable-project");
  assert.match(manifest.files[0].checksum, /^sha256_/);
  assert.equal(manifest.files.some((file) => file.path === "metadata/export_settings.json"), true);
});

test("project zip content preset controls optional package directories", async () => {
  const minimalBlob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip", packageContents: "minimal" });
  const minimalEntries = unzipSync(new Uint8Array(await minimalBlob.arrayBuffer()));
  assert.ok(minimalEntries["project/map_project.json"]);
  assert.equal(Boolean(minimalEntries["metadata/export_settings.json"]), false);
  assert.equal(Boolean(minimalEntries["diagnostics/package_report.json"]), false);

  const diagnosticBlob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip", packageContents: "diagnostic" });
  const diagnosticEntries = unzipSync(new Uint8Array(await diagnosticBlob.arrayBuffer()));
  assert.ok(diagnosticEntries["metadata/export_settings.json"]);
  assert.ok(diagnosticEntries["resources/project_resource_index.json"]);
  assert.ok(diagnosticEntries["diagnostics/package_report.json"]);
});

test("project package resource index only references included optional files", async () => {
  const recommendedBlob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip", packageContents: "recommended" });
  const entries = unzipSync(new Uint8Array(await recommendedBlob.arrayBuffer()));
  const resourceIndex = JSON.parse(strFromU8(entries["resources/project_resource_index.json"]));

  assert.equal(resourceIndex.resources.exportSettings, "metadata/export_settings.json");
  assert.equal(Object.hasOwn(resourceIndex.resources, "diagnostics"), false);
});

test("project package resource index follows actual editable project path", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, {
    format: "zip",
    packageContents: {
      includeProjectDirectory: false,
      includeExportSettings: false,
      includeResourceIndex: true,
      includeDiagnostics: false,
    },
  });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const resourceIndex = JSON.parse(strFromU8(entries["resources/project_resource_index.json"]));

  assert.equal(Boolean(entries["project/map_project.json"]), false);
  assert.equal(resourceIndex.resources.editableProject, "map_project.json");
});

test("project package import prepares editable project and preview", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: { target: "per-layer" },
    styleConfig: {},
  }, { format: "zip", packageContents: "diagnostic" });
  Object.defineProperty(blob, "name", { value: "map_project.zip" });

  const prepared = await prepareProjectImportFile(blob);
  assert.equal(prepared.file.name, "map_project.json");
  assert.equal(prepared.preview.packageKind, "editable-project-package");
  assert.equal(prepared.preview.scenario.id, "tno_1962");
  assert.equal(prepared.preview.summary.exportTarget, "per-layer");
  assert.match(await prepared.file.text(), /"schemaVersion": 21/);
});

test("project package import rejects manifest identity mismatch", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  manifest.scenario = { id: "other_scenario", version: 3, baselineHash: "baseline-1" };
  const tampered = new Blob([zipSync({
    ...entries,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  })], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project package manifest does not match editable project/
  );
});

test("project package import rejects unparsable primary manifest", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const tampered = new Blob([zipSync({
    ...entries,
    "manifest.json": strToU8("{broken"),
  })], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project package manifest cannot be parsed/
  );
});

test("project package import rejects missing primary manifest pointer", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const entriesWithoutManifest = { ...entries };
  delete entriesWithoutManifest["manifest.json"];
  const tampered = new Blob([zipSync(entriesWithoutManifest)], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project ZIP is missing manifest\.json/
  );
});

test("project package import rejects strict manifest without project files", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  manifest.files = [];
  const tampered = new Blob([zipSync({
    ...entries,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  })], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project package manifest does not list the editable project file/
  );
});

test("project package import rejects strict manifest without project checksum", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  manifest.files = manifest.files.map((file) => {
    if (file.path !== "project/map_project.json") return file;
    const entryWithoutChecksum = { ...file };
    delete entryWithoutChecksum.checksum;
    return entryWithoutChecksum;
  });
  const tampered = new Blob([zipSync({
    ...entries,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  })], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project package manifest must include editable project checksum/
  );
});

test("project package import rejects oversized zip before unzip", async () => {
  const oversizedFile = {
    name: "map_project.zip",
    size: 33 * 1024 * 1024,
    arrayBuffer: async () => new ArrayBuffer(0),
  };

  await assert.rejects(
    () => prepareProjectImportFile(oversizedFile),
    /Project ZIP is too large/
  );
});

test("project package import rejects too many zip entries", async () => {
  const entries = {
    "map_project.json": strToU8(JSON.stringify({ schemaVersion: 21 })),
  };
  for (let index = 0; index < 129; index += 1) {
    entries[`metadata/extra-${index}.json`] = strToU8("{}");
  }
  const blob = new Blob([zipSync(entries)], { type: "application/zip" });
  Object.defineProperty(blob, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(blob),
    /Project ZIP contains too many files/
  );
});

test("project package import rejects expanded zip beyond import budget", async () => {
  const entries = {
    "map_project.json": strToU8(JSON.stringify({ schemaVersion: 21 })),
    "metadata/oversized.bin": new Uint8Array((64 * 1024 * 1024) + 1),
  };
  const blob = new Blob([zipSync(entries)], { type: "application/zip" });
  Object.defineProperty(blob, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(blob),
    /Project ZIP expands beyond/
  );
});

test("project package import rejects project checksum mismatch", async () => {
  const blob = await exportProjectBlob({
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { version: 3 },
    scenarioBaselineHash: "baseline-1",
    transportWorkbenchUi: {},
    exportWorkbenchUi: {},
    styleConfig: {},
  }, { format: "zip" });
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const project = JSON.parse(strFromU8(entries["project/map_project.json"]));
  project.activePaletteId = "kaiserreich";
  const tamperedProjectBytes = strToU8(JSON.stringify(project, null, 2));
  const tampered = new Blob([zipSync({
    ...entries,
    "project/map_project.json": tamperedProjectBytes,
    "map_project.json": tamperedProjectBytes,
  })], { type: "application/zip" });
  Object.defineProperty(tampered, "name", { value: "map_project.zip" });

  await assert.rejects(
    () => prepareProjectImportFile(tampered),
    /Project package manifest does not match editable project/
  );
});

test("project save picker cancel keeps export dirty state unchanged", async () => {
  const previousShowSaveFilePicker = globalThis.showSaveFilePicker;
  const previousDirty = globalThis.__mapcreatorDirtyState;
  globalThis.showSaveFilePicker = async () => {
    const error = new Error("cancelled");
    error.name = "AbortError";
    throw error;
  };

  try {
    const result = await FileManager.exportProject({
      activeScenarioId: "tno_1962",
      activeScenarioManifest: { version: 3 },
      scenarioBaselineHash: "baseline-1",
      transportWorkbenchUi: {},
      exportWorkbenchUi: {},
      styleConfig: {},
    }, { destination: "picker" });
    assert.equal(result, false);
  } finally {
    globalThis.showSaveFilePicker = previousShowSaveFilePicker;
    globalThis.__mapcreatorDirtyState = previousDirty;
  }
});

test("project save picker receives json file type options by default", async () => {
  const previousShowSaveFilePicker = globalThis.showSaveFilePicker;
  const previousDocument = globalThis.document;
  const calls = [];
  const writes = [];

  globalThis.document = {
    getElementById: () => null,
  };
  globalThis.showSaveFilePicker = async (options) => {
    calls.push(options);
    return {
      createWritable: async () => ({
        write: async (blob) => {
          writes.push(blob);
        },
        close: async () => {},
      }),
    };
  };

  try {
    const result = await FileManager.exportProject({
      activeScenarioId: "tno_1962",
      activeScenarioManifest: { version: 3 },
      scenarioBaselineHash: "baseline-1",
      transportWorkbenchUi: {},
      exportWorkbenchUi: {},
      styleConfig: {},
    });

    assert.equal(result, true);
    assert.equal(calls[0].suggestedName, "map_project.json");
    assert.equal(calls[0].excludeAcceptAllOption, true);
    assert.deepEqual(calls[0].types[0].accept, { "application/json": [".json"] });
    assert.equal(writes[0].type, "application/json");
  } finally {
    globalThis.showSaveFilePicker = previousShowSaveFilePicker;
    globalThis.document = previousDocument;
  }
});

test("project zip save picker receives zip file type options", async () => {
  const previousShowSaveFilePicker = globalThis.showSaveFilePicker;
  const previousDocument = globalThis.document;
  const calls = [];

  globalThis.document = {
    getElementById: () => null,
  };
  globalThis.showSaveFilePicker = async (options) => {
    calls.push(options);
    return {
      createWritable: async () => ({
        write: async () => {},
        close: async () => {},
      }),
    };
  };

  try {
    const result = await FileManager.exportProject({
      activeScenarioId: "tno_1962",
      activeScenarioManifest: { version: 3 },
      scenarioBaselineHash: "baseline-1",
      transportWorkbenchUi: {},
      exportWorkbenchUi: {},
      styleConfig: {},
    }, { format: "zip" });

    assert.equal(result, true);
    assert.equal(calls[0].suggestedName, "map_project.zip");
    assert.equal(calls[0].excludeAcceptAllOption, true);
    assert.deepEqual(calls[0].types[0].accept, { "application/zip": [".zip"] });
  } finally {
    globalThis.showSaveFilePicker = previousShowSaveFilePicker;
    globalThis.document = previousDocument;
  }
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

test("project export and import preserve transport workbench point deltas", async () => {
  const payload = await exportProjectPayload({
    activePaletteId: "hoi4_vanilla",
    annotationView: {},
    exportWorkbenchUi: {},
    transportWorkbenchPointDeltas: {
      byFamily: {
        airport: {
          created: [{
            id: "airport_edit_1",
            name: "Project Airfield",
            lon: 139.77,
            lat: 35.68,
            packId: "usa_airport",
            properties: { status_category: "active" },
          }, {
            id: "bad_airport",
            name: "Bad",
            lon: "not-a-number",
            lat: 35,
          }],
          updated: [{
            id: "airport_source_1",
            name: "Edited Source Airport",
            lon: 139.76,
            lat: 35.67,
            packId: "usa_airport",
            properties: { status_category: "inactive" },
          }],
          deleted: ["airport_source_2"],
        },
      },
    },
    transportWorkbenchUi: {
      activeFamily: "airport",
      activePackIdByFamily: { airport: "usa_airport" },
    },
  });

  assert.equal(payload.transportWorkbenchPointDeltas.byFamily.airport.created.length, 1);
  assert.equal(payload.transportWorkbenchPointDeltas.byFamily.airport.created[0].properties.source, "user_overlay");
  assert.equal(payload.transportWorkbenchPointDeltas.byFamily.airport.updated.length, 1);
  assert.equal(payload.transportWorkbenchPointDeltas.byFamily.airport.updated[0].properties.status_category, "inactive");
  assert.equal(payload.transportWorkbenchPointDeltas.byFamily.airport.updated[0].properties.source, undefined);
  assert.deepEqual(payload.transportWorkbenchPointDeltas.byFamily.airport.deleted, ["airport_source_2"]);

  const result = await importProjectPayload(payload);

  assert.equal(result.callbacks.length, 1);
  assert.equal(result.successes[0].transportWorkbenchPointDeltas.byFamily.airport.created[0].id, "airport_edit_1");
  const importedUpdate = result.successes[0].transportWorkbenchPointDeltas.byFamily.airport.updated[0];
  assert.equal(importedUpdate.id, "airport_source_1");
  assert.equal(importedUpdate.packId, "usa_airport");
  assert.equal(importedUpdate.properties.status_category, "inactive");
  assert.equal(importedUpdate.properties.source, undefined);
  assert.deepEqual(result.successes[0].transportWorkbenchPointDeltas.byFamily.airport.deleted, ["airport_source_2"]);
  assert.equal(result.successes[0].transportWorkbenchPointDeltas.byFamily.port.created.length, 0);
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
