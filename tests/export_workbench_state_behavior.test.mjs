import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { strFromU8, unzipSync } from "../vendor/fflate.browser.js";
import {
  buildExportArtifactManifest,
  buildExportArtifactPackage,
} from "../js/core/export_artifact_package.js";
import { normalizeExportWorkbenchUiState } from "../js/core/state_defaults.js";
import { replaceExportWorkbenchUiState } from "../js/core/state/ui_state.js";
import {
  createExportWorkbenchController,
  ensureExportWorkbenchUiState,
  getExportAnnotationCountSummary,
  getExportAnnotationFamilyCounts,
  resolveExportPassSequence,
} from "../js/ui/toolbar/export_workbench_controller.js";

function createArtifactPipelineStub() {
  return Object.fromEntries([
    "applyExportAdjustmentsToCanvas",
    "bakeLayer",
    "buildBakePackPackage",
    "buildCompositeExportCanvas",
    "buildCompositeSourceCanvas",
    "buildPerLayerExportPackage",
    "buildSingleExportSourceCanvas",
    "getBakePackLayerIds",
    "getSelectedExportScale",
    "triggerBlobDownload",
    "triggerCanvasDownload",
  ].map((methodName) => [methodName, () => {}]));
}

function createButtonHarness() {
  const listeners = new Map();
  return {
    dataset: {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    async dispatch(type) { return listeners.get(type)?.(); },
  };
}

test("export workbench controller validates required notification dependencies at construction", () => {
  assert.throws(
    () => createExportWorkbenchController({ showExportFailureToast() {} }),
    /createExportWorkbenchController requires showToast to be a function\./,
  );
  assert.throws(
    () => createExportWorkbenchController({ showToast() {}, artifactPipeline: createArtifactPipelineStub() }),
    /createExportWorkbenchController requires showExportFailureToast to be a function\./,
  );
  assert.throws(
    () => createExportWorkbenchController({
      showToast() {},
      showExportFailureToast() {},
      artifactPipeline: {},
    }),
    /createExportWorkbenchController requires artifactPipeline\.applyExportAdjustmentsToCanvas to be a function\./,
  );

  const controller = createExportWorkbenchController({
    showToast() {},
    showExportFailureToast() {},
    artifactPipeline: createArtifactPipelineStub(),
  });

  assert.equal(typeof controller.bindExportWorkbenchEvents, "function");
  assert.equal(typeof controller.renderExportWorkbenchUi, "function");
});

test("Bake Visible uses the pipeline visibility contract and bakes every selected output", async () => {
  const previousHtmlInputElement = globalThis.HTMLInputElement;
  globalThis.HTMLInputElement = class {};
  const bakeButton = createButtonHarness();
  const bakeCalls = [];
  const toasts = [];
  let selectedExportUi = null;
  const exportUi = {
    ...normalizeExportWorkbenchUiState({
      visibility: { background: true, effects: true },
      textVisibility: { "render-labels": false, "special-zones": false, "svg-annotations": false },
    }),
    bakeCache: new Map(),
  };
  const artifactPipeline = {
    ...createArtifactPipelineStub(),
    getBakePackLayerIds(value) {
      selectedExportUi = value;
      return ["color", "line", "composite"];
    },
    async bakeLayer(layerId, value) {
      bakeCalls.push([layerId, value]);
    },
  };
  const controller = createExportWorkbenchController({
    state: { exportWorkbenchUi: exportUi },
    t: (key) => key,
    showToast(message, options) { toasts.push([message, options]); },
    showExportFailureToast() { assert.fail("success path must not show a failure toast"); },
    normalizeExportWorkbenchUiState,
    renderPassNames: [],
    exportWorkbenchBakeVisibleBtn: bakeButton,
    artifactPipeline,
  });

  try {
    controller.bindExportWorkbenchEvents();
    await bakeButton.dispatch("click");
  } finally {
    if (previousHtmlInputElement === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previousHtmlInputElement;
  }

  assert.deepEqual(bakeCalls.map(([layerId]) => layerId), ["color", "line", "composite"]);
  assert.ok(bakeCalls.every(([, value]) => value === selectedExportUi));
  assert.deepEqual(toasts, [["Bake outputs updated.", { title: "Bake ready", tone: "success" }]]);
});

test("Bake Visible reports pipeline failures and stops the remaining bake sequence", async () => {
  const previousHtmlInputElement = globalThis.HTMLInputElement;
  globalThis.HTMLInputElement = class {};
  const bakeButton = createButtonHarness();
  const failure = new Error("bake failed");
  const bakeCalls = [];
  const failures = [];
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const artifactPipeline = {
      ...createArtifactPipelineStub(),
      getBakePackLayerIds() { return ["color", "line", "composite"]; },
      async bakeLayer(layerId) {
        bakeCalls.push(layerId);
        if (layerId === "line") throw failure;
      },
    };
    const controller = createExportWorkbenchController({
      state: { exportWorkbenchUi: { ...normalizeExportWorkbenchUiState({}), bakeCache: new Map() } },
      t: (key) => key,
      showToast() { assert.fail("failure path must not show a success toast"); },
      showExportFailureToast(error) { failures.push(error); },
      normalizeExportWorkbenchUiState,
      renderPassNames: [],
      exportWorkbenchBakeVisibleBtn: bakeButton,
      artifactPipeline,
    });

    controller.bindExportWorkbenchEvents();
    await bakeButton.dispatch("click");
  } finally {
    console.error = originalConsoleError;
    if (previousHtmlInputElement === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previousHtmlInputElement;
  }

  assert.deepEqual(bakeCalls, ["color", "line"]);
  assert.deepEqual(failures, [failure]);
});

test("export workbench state normalizes legacy visibility and text aliases", () => {
  const normalized = normalizeExportWorkbenchUiState({
    target: "per-layer-png",
    layerVisibility: { paint: false, borders: true },
    textVisibility: {
      annotations: false,
      specialzones: true,
      text: false,
    },
    includeTextLayer: true,
    previewSource: "annotations",
    scale: "10",
    adjustments: {
      brightness: 240,
      contrast: -20,
      saturation: 143,
      clarity: 99,
    },
  });

  assert.equal(normalized.target, "per-layer");
  assert.equal(normalized.visibility.political, false);
  assert.equal(normalized.visibility.effects, true);
  assert.deepEqual(normalized.textVisibility, {
    "render-labels": false,
    "special-zones": true,
    "svg-annotations": false,
  });
  assert.equal(normalized.includeTextLayer, true);
  assert.equal(normalized.previewLayerId, "svg-annotations");
  assert.equal(normalized.scale, "2");
  assert.deepEqual(normalized.adjustments, {
    brightness: 200,
    contrast: 0,
    saturation: 143,
    clarity: 99,
  });
});

test("replaceExportWorkbenchUiState writes normalized export workbench state", () => {
  const target = {};
  const nextState = replaceExportWorkbenchUiState(target, {
    includeTextLayer: false,
    textVisibility: {
      svg: true,
    },
  });

  assert.equal(target.exportWorkbenchUi, nextState);
  assert.equal(nextState.includeTextLayer, true);
  assert.equal(nextState.textVisibility["svg-annotations"], true);
});

test("export workbench state normalizes layer order aliases and bake artifacts", () => {
  const normalized = normalizeExportWorkbenchUiState({
    layerOrder: ["paint", "background", "paint", "unknown"],
    bakeArtifacts: [
      {
        layerId: "color",
        updatedAt: 12.4,
        dependencies: ["a", "a", "b"],
        canvasSize: { width: 10.6, height: -3 },
      },
      { layerId: "unknown", dependencies: ["drop"] },
    ],
  });

  assert.deepEqual(normalized.layerOrder, ["political", "background", "context", "effects", "labels"]);
  assert.deepEqual(normalized.bakeArtifacts, [{
    layerId: "color",
    updatedAt: 12,
    dependencies: ["a", "b"],
    canvasSize: { width: 11, height: 0 },
    dirtyFlag: true,
  }]);
});

test("export pass sequence follows normalized order and visibility", () => {
  const passNames = ["background", "physicalBase", "political", "labels"];
  const sequence = resolveExportPassSequence({
    layerOrder: ["labels", "political", "background", "effects"],
    visibility: {
      labels: true,
      political: true,
      background: false,
      effects: true,
    },
  }, passNames);

  assert.deepEqual(sequence, ["labels", "physicalBase", "political"]);
});

test("export workbench runtime state keeps bake cache runtime-only", () => {
  const existingCache = new Map([["color", { hash: "abc" }]]);
  const state = {
    exportWorkbenchUi: {
      bakeCache: existingCache,
      bakeArtifacts: [{ layerId: "text", dependencies: ["x", "x"], canvasSize: { width: 2, height: 3 } }],
    },
  };

  const normalized = ensureExportWorkbenchUiState(state, normalizeExportWorkbenchUiState);

  assert.equal(normalized.bakeCache, existingCache);
  assert.deepEqual(normalized.bakeArtifacts, [{
    layerId: "text",
    updatedAt: 0,
    dependencies: ["x"],
    canvasSize: { width: 2, height: 3 },
    dirtyFlag: true,
  }]);

  const fromJson = ensureExportWorkbenchUiState({ exportWorkbenchUi: { bakeCache: {} } }, normalizeExportWorkbenchUiState);
  assert.ok(fromJson.bakeCache instanceof Map);
});

test("export artifact package writes a zip manifest and payload files", async () => {
  const artifact = await buildExportArtifactPackage({
    artifactKind: "per-layer",
    fileStem: "map layers",
    scenario: { id: "tno_1962" },
    exportUi: { target: "per-layer" },
    files: [{
      path: "layers/political.png",
      role: "layer",
      mime: "image/png",
      text: "png-bytes",
    }],
  });
  const zipBytes = new Uint8Array(await artifact.blob.arrayBuffer());
  const entries = unzipSync(zipBytes);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));

  assert.equal(artifact.fileStem, "map-layers");
  assert.equal(manifest.artifactKind, "per-layer");
  assert.equal(manifest.scenario.id, "tno_1962");
  assert.equal(manifest.files[0].path, "layers/political.png");
  assert.equal(manifest.files[0].byteLength, 9);
  assert.equal(manifest.files[0].checksum, `sha256_${createHash("sha256").update("png-bytes").digest("hex")}`);
  assert.equal(strFromU8(entries["layers/political.png"]), "png-bytes");
});

test("export artifact package rejects payload manifest path collisions", async () => {
  await assert.rejects(
    () => buildExportArtifactPackage({
      artifactKind: "per-layer",
      files: [{
        path: "manifest.json",
        role: "metadata",
        mime: "application/json",
        text: "{}",
      }],
    }),
    /manifest path conflicts/
  );
});

test("export artifact manifest normalizes raw file entries", () => {
  const manifest = buildExportArtifactManifest({
    artifactKind: "project-json",
    files: [{
      path: "../Map Project.JSON",
      role: "Editable Project",
      mime: "application/json",
      byteLength: -1,
      dimensions: { width: "4.6", height: "bad" },
    }],
  });

  assert.equal(manifest.files[0].path, "map-project.json");
  assert.equal(manifest.files[0].role, "editable-project");
  assert.equal(manifest.files[0].mime, "application/json");
  assert.equal(Object.hasOwn(manifest.files[0], "byteLength"), false);
  assert.deepEqual(manifest.files[0].dimensions, { width: 5, height: 0 });
});

test("export annotation family counts use strategic overlay selectors", () => {
  const selectorCounts = new Map([
    [".frontline-overlay-layer path, .frontline-labels-layer .frontline-label", 3],
    [".operational-lines-layer .operational-line", 2],
    [".operation-graphics-layer .operation-graphic", 4],
    [".unit-counters-layer .unit-counter", 5],
  ]);
  const mapSvg = {
    querySelectorAll: (selector) => ({ length: selectorCounts.get(selector) || 0 }),
  };

  assert.deepEqual(getExportAnnotationFamilyCounts(mapSvg), {
    frontlines: 3,
    "operational-lines": 2,
    "operation-graphics": 4,
    "unit-counters": 5,
  });
  assert.deepEqual(getExportAnnotationCountSummary(mapSvg), {
    count: 14,
    summary: "Frontlines: 3 · Operational lines: 2 · Operation graphics: 4 · Unit counters: 5",
    counts: {
      frontlines: 3,
      "operational-lines": 2,
      "operation-graphics": 4,
      "unit-counters": 5,
    },
  });
});

test("export workbench controller renders annotation family summaries", () => {
  const source = readFileSync(new URL("../js/ui/toolbar/export_workbench_controller.js", import.meta.url), "utf8");
  assert.match(source, /const getTextLayerSummary = \(entry\) => \{/);
  assert.match(source, /entry\.familyCounts/);
  assert.match(source, /EXPORT_ANNOTATION_FAMILY_VIEW_MODELS/);
  assert.match(source, /export-workbench-layer-meta/);
});
