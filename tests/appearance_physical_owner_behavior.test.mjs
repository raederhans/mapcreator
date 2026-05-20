import assert from "node:assert/strict";
import test from "node:test";

import {
  PHYSICAL_CLASS_TOGGLE_IDS,
  createAppearancePhysicalOwner,
} from "../js/ui/toolbar/appearance_physical_owner.js";

class TestElement {
  constructor() {
    this.checked = false;
    this.dataset = {};
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) {
      handler({
        target: this,
        ...event,
      });
    }
  }
}

function createTestDocument(nodeMap) {
  return {
    getElementById: (id) => nodeMap[id] || null,
  };
}

function buildNodes(ids) {
  return Object.fromEntries(ids.map((id) => [id, new TestElement()]));
}

const PHYSICAL_NODE_IDS = [
  "togglePhysical",
  "physicalPreset",
  "physicalPresetHint",
  "physicalMode",
  "physicalOpacity",
  "physicalAtlasIntensity",
  "physicalRainforestEmphasis",
  "physicalContourColor",
  "physicalContourOpacity",
  "physicalMinorContours",
  "physicalContourMajorWidth",
  "physicalContourMinorWidth",
  "physicalContourMajorInterval",
  "physicalContourMinorInterval",
  "physicalContourMajorLowReliefCutoff",
  "physicalContourMinorLowReliefCutoff",
  "physicalBlendMode",
  "physicalOpacityValue",
  "physicalAtlasIntensityValue",
  "physicalRainforestEmphasisValue",
  "physicalContourOpacityValue",
  "physicalContourMajorWidthValue",
  "physicalContourMinorWidthValue",
  "physicalContourMajorIntervalValue",
  "physicalContourMinorIntervalValue",
  "physicalContourMajorLowReliefCutoffValue",
  "physicalContourMinorLowReliefCutoffValue",
  ...Object.values(PHYSICAL_CLASS_TOGGLE_IDS),
];

function createPhysicalConfig(overrides = {}) {
  return {
    preset: "balanced",
    mode: "atlas_and_contours",
    opacity: 0.62,
    atlasIntensity: 0.72,
    rainforestEmphasis: 0.34,
    contourColor: "#6B5947",
    contourOpacity: 0.45,
    contourMinorVisible: true,
    contourMajorWidth: 1.25,
    contourMinorWidth: 0.55,
    contourMajorIntervalM: 1000,
    contourMinorIntervalM: 200,
    contourMajorLowReliefCutoffM: 300,
    contourMinorLowReliefCutoffM: 180,
    blendMode: "multiply",
    atlasClassVisibility: {
      desert_bare: false,
    },
    ...overrides,
  };
}

function createHarness(ids = PHYSICAL_NODE_IDS, runtimeOverrides = {}) {
  const nodes = buildNodes(ids);
  const dirtyReasons = [];
  const contextLayerLoads = [];
  const runtimeState = {
    showPhysical: true,
    styleConfig: {
      physical: createPhysicalConfig(),
    },
    ensureContextLayerDataFn(layers, options) {
      contextLayerLoads.push({ layers, options });
      return Promise.resolve();
    },
    ...runtimeOverrides,
  };
  const owner = createAppearancePhysicalOwner({
    runtimeState,
    t: (value, scope) => `${scope}:${value}`,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    normalizeOceanFillColor: (value) => String(value || "").toLowerCase(),
    renderDirty: (reason) => dirtyReasons.push(reason),
    documentRef: createTestDocument(nodes),
  });
  return { contextLayerLoads, dirtyReasons, nodes, owner, runtimeState };
}

test("physical owner renders preset, value labels, and class toggles", () => {
  const harness = createHarness();

  harness.owner.renderPhysicalUi();

  assert.equal(harness.nodes.togglePhysical.checked, true);
  assert.equal(harness.nodes.physicalPreset.value, "balanced");
  assert.equal(harness.nodes.physicalPresetHint.textContent, "ui:Balanced keeps terrain visible while staying cleaner over political fills.");
  assert.equal(harness.nodes.physicalMode.value, "atlas_and_contours");
  assert.equal(harness.nodes.physicalOpacity.value, "62");
  assert.equal(harness.nodes.physicalOpacityValue.textContent, "62%");
  assert.equal(harness.nodes.physicalAtlasIntensity.value, "72");
  assert.equal(harness.nodes.physicalAtlasIntensityValue.textContent, "72%");
  assert.equal(harness.nodes.physicalRainforestEmphasis.value, "34");
  assert.equal(harness.nodes.physicalRainforestEmphasisValue.textContent, "34%");
  assert.equal(harness.nodes.physicalContourColor.value, "#6b5947");
  assert.equal(harness.nodes.physicalContourOpacity.value, "45");
  assert.equal(harness.nodes.physicalContourOpacityValue.textContent, "45%");
  assert.equal(harness.nodes.physicalContourMajorWidth.value, "1.25");
  assert.equal(harness.nodes.physicalContourMajorWidthValue.textContent, "1.25");
  assert.equal(harness.nodes.physicalContourMinorInterval.value, "200");
  assert.equal(harness.nodes.physicalContourMinorIntervalValue.textContent, "200");
  assert.equal(harness.nodes.physicalClassDesert.checked, false);
  assert.equal(harness.nodes.physicalClassMountain.checked, true);
});

test("physical owner toggles visibility and requests physical context layers", () => {
  const harness = createHarness(["togglePhysical"], {
    showPhysical: false,
  });

  harness.owner.bindEvents();
  harness.nodes.togglePhysical.checked = true;
  harness.nodes.togglePhysical.dispatch("change");

  assert.equal(harness.runtimeState.showPhysical, true);
  assert.deepEqual(harness.contextLayerLoads, [
    {
      layers: ["physical-set", "physical-contours-set"],
      options: { reason: "toolbar-toggle", renderNow: true },
    },
  ]);
  assert.deepEqual(harness.dirtyReasons, ["toggle-physical"]);
});

test("physical owner applies presets once and preserves selected mode", () => {
  const harness = createHarness(PHYSICAL_NODE_IDS, {
    styleConfig: {
      physical: createPhysicalConfig({
        mode: "contours_only",
        contourColor: "#AA5500",
      }),
    },
  });

  harness.owner.bindEvents();
  harness.owner.bindEvents();
  harness.nodes.physicalPreset.value = "terrain_rich";
  harness.nodes.physicalPreset.dispatch("change");

  assert.equal(harness.nodes.physicalPreset.listeners.get("change").length, 1);
  assert.equal(harness.runtimeState.styleConfig.physical.preset, "terrain_rich");
  assert.equal(harness.runtimeState.styleConfig.physical.mode, "contours_only");
  assert.equal(harness.runtimeState.styleConfig.physical.contourColor, "#aa5500");
  assert.equal(harness.nodes.physicalPresetHint.textContent, "ui:Terrain Rich pushes the atlas and contour layer for the strongest relief read.");
  assert.deepEqual(harness.dirtyReasons, ["physical-preset-select"]);
});

test("physical owner clamps numeric inputs and updates value labels", () => {
  const harness = createHarness();

  harness.owner.bindEvents();
  harness.nodes.physicalOpacity.value = "130";
  harness.nodes.physicalOpacity.dispatch("input");
  harness.nodes.physicalAtlasIntensity.value = "10";
  harness.nodes.physicalAtlasIntensity.dispatch("input");
  harness.nodes.physicalContourMajorInterval.value = "1750";
  harness.nodes.physicalContourMajorInterval.dispatch("input");
  harness.nodes.physicalContourMinorLowReliefCutoff.value = "-12";
  harness.nodes.physicalContourMinorLowReliefCutoff.dispatch("input");

  assert.equal(harness.runtimeState.styleConfig.physical.opacity, 1);
  assert.equal(harness.nodes.physicalOpacityValue.textContent, "100%");
  assert.equal(harness.runtimeState.styleConfig.physical.atlasIntensity, 0.2);
  assert.equal(harness.nodes.physicalAtlasIntensityValue.textContent, "20%");
  assert.equal(harness.runtimeState.styleConfig.physical.contourMajorIntervalM, 2000);
  assert.equal(harness.nodes.physicalContourMajorIntervalValue.textContent, "2000");
  assert.equal(harness.runtimeState.styleConfig.physical.contourMinorLowReliefCutoffM, 0);
  assert.equal(harness.nodes.physicalContourMinorLowReliefCutoffValue.textContent, "0");
  assert.deepEqual(harness.dirtyReasons, [
    "physical-opacity",
    "physical-atlas-intensity",
    "physical-contour-major-interval",
    "physical-contour-minor-low-relief-cutoff",
  ]);
});

test("physical owner updates class visibility through class toggles", () => {
  const harness = createHarness(Object.values(PHYSICAL_CLASS_TOGGLE_IDS));

  harness.owner.bindEvents();
  harness.nodes.physicalClassMountain.checked = false;
  harness.nodes.physicalClassMountain.dispatch("change");

  assert.equal(harness.runtimeState.styleConfig.physical.atlasClassVisibility.mountain_high_relief, false);
  assert.deepEqual(harness.dirtyReasons, ["physical-class-mountain_high_relief"]);
});
