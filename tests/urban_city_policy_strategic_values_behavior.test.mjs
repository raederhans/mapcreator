import test from "node:test";
import assert from "node:assert/strict";

import { createUrbanCityPolicyOwner } from "../js/core/renderer/urban_city_policy.js";

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
    scenarioStrategicValuesData: {
      victoryPointsByFeature: {
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
      },
    },
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
    scenarioStrategicValuesData: {
      victoryPointsByFeature: {
        "FRA-1": [
          { city_id: "minor", value: 1, name: "Minor" },
          { city_id: "paris", value: 30, name: "Paris", province_id: 11506 },
        ],
      },
    },
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
