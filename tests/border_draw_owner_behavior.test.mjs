import assert from "node:assert/strict";
import test from "node:test";

import { createBorderDrawOwner } from "../js/core/renderer/border_draw_owner.js";

const mesh = { type: "MultiLineString", coordinates: [[[0, 0], [100, 100]]] };

function nearlyEqual(actual, expected, epsilon = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

function createContextRecorder() {
  return {
    globalAlpha: 1,
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "",
    lineCap: "",
    miterLimit: 0,
    strokes: [],
    beginPath() {},
    stroke() {
      this.strokes.push({
        alpha: this.globalAlpha,
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
      });
    },
  };
}

function createOwner({ interactive = false } = {}) {
  const context = createContextRecorder();
  const state = {
    activeScenarioId: "",
    scenarioBorderMode: "canonical",
    cachedCountryBorders: [mesh],
    cachedCoastlines: [mesh],
    cachedCoastlinesHigh: [mesh],
    cachedCoastlinesLow: [mesh],
    cachedCoastlinesMid: [mesh],
    cachedProvinceBordersByCountry: new Map([["AAA", [mesh]]]),
    cachedLocalBordersByCountry: new Map([["AAA", [mesh]]]),
    cachedDetailAdmBorders: [],
    cachedParentBordersByCountry: new Map(),
    parentBorderSupportedCountries: [],
    parentBorderEnabledByCountry: {},
    parentBordersVisible: true,
    styleConfig: {
      internalBorders: {
        color: "#111111",
        colorMode: "manual",
        opacity: 0,
        width: 1,
      },
      empireBorders: {
        color: "#222222",
        opacity: 0.25,
        width: 2,
      },
      coastlines: {
        color: "#333333",
        opacity: 0.5,
        width: 1.8,
      },
      parentBorders: {
        color: "#444444",
        opacity: 0.85,
        width: 1.1,
      },
    },
  };
  const owner = createBorderDrawOwner({
    state,
    getters: {
      getContext: () => context,
      getPathCanvas: () => () => {},
      getProjection: () => (point) => point,
      getVisibleInternalBorderMeshSignature: () => "",
    },
    helpers: {
      clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
      drawScenarioCoastalAccentLayer: () => {},
      getCoastlineCollectionForZoom: () => (interactive ? state.cachedCoastlinesLow : state.cachedCoastlines),
      getInternalBorderStrokeColor: (_countryCode, fallbackColor) => fallbackColor,
      getSafeCanvasColor: (value, fallbackColor) => value || fallbackColor,
      getVisibleCountryCodesForBorderMeshes: () => new Set(["AAA"]),
      isDynamicBordersEnabled: () => false,
      isUsableMesh: (candidate) => !!candidate?.coordinates?.length,
      sanitizePolyline: (line) => (Array.isArray(line) ? line : []),
    },
  });
  return { owner, context };
}

test("drawHierarchicalBorders applies border opacity and width styles to normal pass", () => {
  const { owner, context } = createOwner();

  owner.drawHierarchicalBorders(2, { interactive: false });

  const internalStroke = context.strokes.find((stroke) => stroke.strokeStyle === "#111111");
  const countryStroke = context.strokes.find((stroke) => stroke.strokeStyle === "#222222");
  const coastStroke = context.strokes.find((stroke) => stroke.strokeStyle === "#333333");

  assert.equal(internalStroke.alpha, 0);
  nearlyEqual(countryStroke.alpha, 0.25);
  nearlyEqual(coastStroke.alpha, 0.3785714286);
  nearlyEqual(countryStroke.lineWidth, 1.0071428571);
  nearlyEqual(coastStroke.lineWidth, 0.8485714286);
});

test("drawHierarchicalBorders applies border opacity and width styles to interactive snapshot pass", () => {
  const { owner, context } = createOwner({ interactive: true });

  owner.drawHierarchicalBorders(2, { interactive: true });

  const countryStroke = context.strokes.find((stroke) => stroke.strokeStyle === "#222222");
  const coastStroke = context.strokes.find((stroke) => stroke.strokeStyle === "#333333");

  nearlyEqual(countryStroke.alpha, 0.22);
  nearlyEqual(coastStroke.alpha, 0.39);
  nearlyEqual(countryStroke.lineWidth, 0.95);
  nearlyEqual(coastStroke.lineWidth, 0.792);
});
