import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeExportWorkbenchUiState } from "../js/core/state_defaults.js";
import { replaceExportWorkbenchUiState } from "../js/core/state/ui_state.js";
import {
  getExportAnnotationCountSummary,
  getExportAnnotationFamilyCounts,
} from "../js/ui/toolbar/export_workbench_controller.js";

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
