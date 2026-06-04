import test from "node:test";
import assert from "node:assert/strict";

import { LegendManager } from "../js/core/legend_manager.js";

function rectangleFeature(id, owner, width, height, continent = "europe") {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      ISO_A3: owner,
      continent_id: continent,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
        [0, 0],
      ]],
    },
  };
}

function createLegendState(features, overrides = {}) {
  return {
    colors: {},
    countryBaseColors: {},
    sovereignBaseColors: {},
    sovereigntyByFeatureId: Object.fromEntries(features.map((feature) => [feature.id, feature.properties.ISO_A3])),
    landData: { type: "FeatureCollection", features },
    resolvedDefaultCountryPalette: {
      GER: "#111111",
      RK1: "#222222",
      USA: "#333333",
      JAP: "#444444",
      CHI: "#555555",
    },
    scenarioCountriesByTag: {
      GER: { tag: "GER", display_name_zh: "大日耳曼国", display_name_en: "Germany" },
      RK1: { tag: "RK1", display_name_zh: "辖区一", parent_owner_tag: "GER", entry_kind: "scenario_subject" },
      USA: { tag: "USA", display_name_zh: "美国" },
      CHI: { tag: "CHI", display_name_zh: "中国", continent_id: "asia" },
    },
    ...overrides,
  };
}

test("direct area generation orders owners by controlled land area", () => {
  const state = createLegendState([
    rectangleFeature("small", "USA", 1, 1),
    rectangleFeature("large", "GER", 4, 4),
  ]);

  const generation = LegendManager.generate(state, {
    mode: "direct-area",
    useModernMajorOrder: false,
  });

  assert.equal(generation.entries[0].code, "GER");
  assert.equal(generation.entries[0].label, "Germany");
});

test("realm area generation folds subject land into the parent owner", () => {
  const state = createLegendState([
    rectangleFeature("subject", "RK1", 5, 5),
    rectangleFeature("parent", "GER", 1, 1),
    rectangleFeature("other", "USA", 2, 2),
  ]);

  const generation = LegendManager.generate(state, {
    mode: "realm-area",
    useModernMajorOrder: false,
  });

  assert.equal(generation.entries[0].code, "GER");
  assert.deepEqual(new Set(generation.entries[0].ownerCodes), new Set(["GER", "RK1"]));
});

test("generated legend writes owner colors and persisted labels", () => {
  const state = createLegendState([
    rectangleFeature("germany", "GER", 3, 3),
  ]);
  const generation = LegendManager.generate(state, { mode: "direct-area" });
  const owners = LegendManager.applyGeneratedLegend(state, generation);

  assert.deepEqual(owners, ["GER"]);
  assert.equal(state.sovereignBaseColors.GER, generation.entries[0].color);
  assert.equal(state.countryBaseColors.GER, generation.entries[0].color);
  assert.equal(state.legendLabels[generation.entries[0].color], "Germany");
});

test("generated legend reads quick swatch objects as colors", () => {
  const state = createLegendState([
    rectangleFeature("germany", "GER", 3, 3),
  ], {
    resolvedDefaultCountryPalette: {},
    paletteQuickSwatches: [{ color: "#abcdef" }],
  });
  const generation = LegendManager.generate(state, { mode: "direct-area" });
  const owners = LegendManager.applyGeneratedLegend(state, generation);

  assert.deepEqual(owners, ["GER"]);
  assert.equal(generation.entries[0].color, "#abcdef");
  assert.equal(state.sovereignBaseColors.GER, "#abcdef");
  assert.equal(Object.hasOwn(state.sovereignBaseColors, "[object object]"), false);
});

test("fresh legend state does not inherit labels or config from another project", () => {
  const previousProject = createLegendState([]);
  LegendManager.setLabel("#abcdef", "Previous Project", previousProject);
  LegendManager.updateConfig(previousProject, {
    mode: "realm-area",
    continent: "asia",
    useModernMajorOrder: true,
  });

  const freshProject = createLegendState([]);
  LegendManager.ensureLegendState(freshProject);

  assert.deepEqual(freshProject.legendLabels, {});
  assert.deepEqual(freshProject.legendConfig, LegendManager.getDefaultConfig());
  assert.deepEqual(LegendManager.getLabels(), {});
});

test("continent mode filters candidates before area sorting", () => {
  const state = createLegendState([
    rectangleFeature("europe", "GER", 9, 9, "europe"),
    rectangleFeature("asia", "CHI", 1, 1, "asia"),
  ]);

  const generation = LegendManager.generate(state, {
    mode: "continent-area",
    continent: "asia",
  });

  assert.equal(generation.entries.length, 1);
  assert.equal(generation.entries[0].code, "CHI");
});
