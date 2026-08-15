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
import {
  buildBakePackMetadata,
  buildBakePackPackageFiles,
  buildExportAdjustmentFilter,
  buildExportArtifactProjectContext,
  buildExportArtifactScenarioContext,
  buildExportUiManifestSnapshot,
  buildPerLayerExportPlan,
  buildPerLayerPackageFiles,
  getBakePackLayerIds,
  getBakePassNamesForLayer,
  resolveExportBaseDimensions,
} from "../js/ui/toolbar/export_artifact_model.js";

test("export artifact model projects deterministic canvas and pass inputs", () => {
  assert.deepEqual(resolveExportBaseDimensions(2, 0, 0, 2400, 1200), { width: 1200, height: 600 });
  assert.equal(buildExportAdjustmentFilter({
    adjustments: { brightness: 125, contrast: 110, saturation: 80, clarity: 150 },
  }), "brightness(1.250) contrast(1.166) saturate(0.800)");

  const exportUi = {
    visibility: { background: true, political: true, context: false, effects: true },
    textVisibility: { "render-labels": false },
  };
  assert.deepEqual(getBakePassNamesForLayer("color", exportUi), [
    "background",
    "physicalBase",
    "political",
    "effects",
    "dayNight",
  ]);
  assert.deepEqual(getBakePassNamesForLayer("composite", exportUi, {
    resolvePassSequence: () => ["background", "labels", "borders"],
    renderPassNames: ["background", "labels", "borders"],
  }), ["background", "borders"]);
});

test("export artifact model builds defensive package projections", () => {
  const exportUi = {
    target: "composite",
    format: "png",
    scale: "2",
    layerOrder: ["background", "effects"],
    visibility: { background: true, effects: true },
    textVisibility: { "render-labels": true, "svg-annotations": true },
    adjustments: { brightness: 100 },
    bakeArtifacts: [{ layerId: "color" }],
  };
  assert.deepEqual(getBakePackLayerIds(exportUi), ["color", "line", "text", "composite"]);
  assert.deepEqual(buildPerLayerExportPlan(exportUi), [
    { id: "background" },
    { id: "effects" },
    { id: "svg-annotations" },
  ]);
  assert.deepEqual(buildExportArtifactScenarioContext("tno_1962", 3, "baseline-1"), {
    id: "tno_1962",
    version: 3,
    baselineHash: "baseline-1",
  });
  assert.deepEqual(buildExportArtifactProjectContext(4, 5, 6), {
    dirtyRevision: 4,
    colorRevision: 5,
    topologyRevision: 6,
  });

  const snapshot = buildExportUiManifestSnapshot(exportUi);
  exportUi.layerOrder.push("political");
  exportUi.visibility.background = false;
  assert.deepEqual(snapshot.layerOrder, ["background", "effects"]);
  assert.equal(snapshot.visibility.background, true);

  const canvas = { width: 20, height: 10 };
  const blob = { type: "application/json" };
  assert.deepEqual(buildPerLayerPackageFiles([{ id: "background", canvas }]), [{
    path: "layers/map_layer_background.png",
    role: "layer",
    mime: "image/png",
    canvas,
  }]);
  assert.deepEqual(buildBakePackMetadata(exportUi, [{ id: "color" }], "2026-08-15T00:00:00.000Z").files, [
    "map_bake_color.png",
  ]);
  assert.deepEqual(buildBakePackPackageFiles([
    { id: "color", canvas },
    { id: "metadata", blob, extension: "json", fileStem: "map_bake_manifest" },
  ]), [
    { path: "layers/map_bake_color.png", role: "bake-layer", mime: "image/png", canvas },
    { path: "map_bake_manifest.json", role: "legacy-metadata", mime: "application/json", blob },
  ]);
});

test("export workbench controller validates required notification dependencies at construction", () => {
  assert.throws(
    () => createExportWorkbenchController({ showExportFailureToast() {} }),
    /createExportWorkbenchController requires showToast to be a function\./,
  );
  assert.throws(
    () => createExportWorkbenchController({ showToast() {} }),
    /createExportWorkbenchController requires showExportFailureToast to be a function\./,
  );

  const controller = createExportWorkbenchController({
    showToast() {},
    showExportFailureToast() {},
  });

  assert.equal(typeof controller.bindExportWorkbenchEvents, "function");
  assert.equal(typeof controller.renderExportWorkbenchUi, "function");
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
