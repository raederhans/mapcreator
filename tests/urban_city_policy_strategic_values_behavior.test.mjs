import test from "node:test";
import assert from "node:assert/strict";

import {
  createUrbanCityPolicyOwner,
  getUrbanCityRenderPassSignatureParts,
} from "../js/core/renderer/urban_city_policy.js";

function createCityFeature(id, hostFeatureId, extraProps = {}) {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [13.4, 52.5] },
    properties: {
      city_id: id,
      stable_key: id,
      __city_host_feature_id: hostFeatureId,
      __city_population: 1000,
      ...extraProps,
    },
  };
}

function createStrategicValuesPayload(victoryPointsByFeature, diagnostics = { errors: [], warnings: [], source: {} }) {
  return {
    metrics: {},
    buckets: {},
    bucketByFeature: {},
    victoryPointsByFeature,
    victoryPointsByState: {},
    resourcePoints: {
      type: "FeatureCollection",
      features: [],
    },
    diagnostics,
  };
}

function createOwner(state) {
  const helpers = {
    getCityCanonicalId: (feature) => String(feature?.properties?.city_id || feature?.id || "").trim(),
    getCityFeatureAliases: (feature, key) => new Set([
      key,
      feature?.id,
      feature?.properties?.city_id,
      feature?.properties?.stable_key,
      feature?.properties?.__city_stable_key,
    ].map((value) => String(value || "").trim()).filter(Boolean)),
    getCityFeatureKey: (feature, fallback = "") => String(
      feature?.id
      || feature?.properties?.city_id
      || feature?.properties?.stable_key
      || fallback
    ).trim(),
    getCityCapitalScore: () => 0,
    getCityTierWeight: () => 1,
  };
  return createUrbanCityPolicyOwner({
    state,
    caches: {
      cityLayerCache: {},
      urbanFeatureIndexCache: {},
    },
    helpers,
  });
}

test("urban city policy owns revision-sensitive render pass signature parts", () => {
  const state = {
    cityLayerRevision: 4,
    scenarioStrategicValuesRevision: 5,
    strategicChoroplethMetric: "victory_points",
    sovereigntyRevision: 6,
    colorRevision: 7,
    deferContextBasePass: true,
  };

  assert.deepEqual(getUrbanCityRenderPassSignatureParts(state, "contextMarkers"), [
    "cities:4",
    "strategic:5:victory_points",
    "sovereignty:6",
    "colors:7",
  ]);
  assert.deepEqual(getUrbanCityRenderPassSignatureParts(state, "labels"), [
    "labels:deferred",
    "cities:4",
    "strategic:5",
    "sovereignty:6",
    "colors:7",
  ]);
  assert.throws(
    () => getUrbanCityRenderPassSignatureParts(state, "political"),
    /Unsupported urban city render pass/,
  );
});

test("urban city policy copies matching strategic victory points onto city features", () => {
  const state = {
    activeScenarioId: "hoi4_city_test",
    worldCitiesData: {
      type: "FeatureCollection",
      features: [
        createCityFeature("berlin", "GER-1"),
      ],
    },
    scenarioCityOverridesData: null,
    scenarioStrategicValuesData: createStrategicValuesPayload({
        "GER-1": [
          {
            city_id: "berlin",
            stable_key: "berlin",
            value: 50,
            name: "Berlin",
            province_id: 6521,
            match_method: "city_exact",
          },
        ],
      }),
    scenarioStrategicValuesRevision: 1,
    scenarioCountriesByTag: {},
    sovereigntyByFeatureId: {},
    sovereigntyRevision: 0,
    cityLayerRevision: 0,
  };

  const collection = createOwner(state).getEffectiveCityCollection();
  assert.equal(collection.features.length, 1);
  assert.equal(collection.features[0].properties.__city_scenario_victory_points, 50);
  assert.equal(collection.features[0].properties.__city_scenario_vp_name, "Berlin");
  assert.equal(collection.features[0].properties.__city_scenario_vp_province_id, 6521);
  assert.equal(collection.features[0].properties.__city_scenario_vp_match_method, "city_exact");
});

test("urban city policy invalidates one owner cache when strategic values revision changes", () => {
  const strategicValues = createStrategicValuesPayload({
    "GER-1": [{ city_id: "berlin", stable_key: "berlin", value: 10, name: "Berlin" }],
  });
  const state = {
    activeScenarioId: "hoi4_city_test",
    worldCitiesData: {
      type: "FeatureCollection",
      features: [createCityFeature("berlin", "GER-1")],
    },
    scenarioCityOverridesData: null,
    scenarioStrategicValuesData: strategicValues,
    scenarioStrategicValuesRevision: 1,
    scenarioCountriesByTag: {},
    sovereigntyByFeatureId: {},
    sovereigntyRevision: 0,
    cityLayerRevision: 0,
  };
  const owner = createOwner(state);
  const first = owner.getEffectiveCityCollection();
  assert.equal(first.features[0].properties.__city_scenario_victory_points, 10);

  strategicValues.victoryPointsByFeature["GER-1"][0].value = 40;
  state.scenarioStrategicValuesRevision += 1;
  const second = owner.getEffectiveCityCollection();
  assert.notEqual(second, first);
  assert.equal(second.features[0].properties.__city_scenario_victory_points, 40);
});

test("urban city policy uses the strongest host victory point when city ids do not match", () => {
  const state = {
    activeScenarioId: "hoi4_city_test",
    worldCitiesData: {
      type: "FeatureCollection",
      features: [
        createCityFeature("host-city", "FRA-1"),
      ],
    },
    scenarioCityOverridesData: null,
    scenarioStrategicValuesData: createStrategicValuesPayload({
        "FRA-1": [
          { city_id: "minor", value: 1, name: "Minor" },
          { city_id: "paris", value: 30, name: "Paris", province_id: 11506 },
        ],
      }),
    scenarioStrategicValuesRevision: 2,
    scenarioCountriesByTag: {},
    sovereigntyByFeatureId: {},
    sovereigntyRevision: 0,
    cityLayerRevision: 0,
  };

  const collection = createOwner(state).getEffectiveCityCollection();
  assert.equal(collection.features[0].properties.__city_scenario_victory_points, 30);
  assert.equal(collection.features[0].properties.__city_scenario_vp_name, "Paris");
  assert.equal(collection.features[0].properties.__city_scenario_vp_province_id, 11506);
});

test("urban city policy ignores strategic victory points from diagnostic-error payloads", () => {
  const state = {
    activeScenarioId: "hoi4_city_test",
    worldCitiesData: {
      type: "FeatureCollection",
      features: [
        createCityFeature("berlin", "GER-1"),
      ],
    },
    scenarioCityOverridesData: null,
    scenarioStrategicValuesData: createStrategicValuesPayload({
      "GER-1": [
        {
          city_id: "berlin",
          stable_key: "berlin",
          value: 50,
          name: "Berlin",
          province_id: 6521,
          match_method: "city_exact",
        },
      ],
    }, {
      errors: [{ code: "baseline_hash_mismatch" }],
      warnings: [],
      source: {},
    }),
    scenarioStrategicValuesRevision: 3,
    scenarioCountriesByTag: {},
    sovereigntyByFeatureId: {},
    sovereigntyRevision: 0,
    cityLayerRevision: 0,
  };

  const collection = createOwner(state).getEffectiveCityCollection();
  assert.equal(collection.features.length, 1);
  assert.equal(collection.features[0].properties.__city_scenario_victory_points, undefined);
  assert.equal(collection.features[0].properties.__city_scenario_vp_name, undefined);
  assert.equal(collection.features[0].properties.__city_scenario_vp_province_id, undefined);
});
