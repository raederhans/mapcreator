import test from "node:test";
import assert from "node:assert/strict";

import {
  isScenarioStrategicValuesRuntimePayload,
  normalizeScenarioStrategicValuesPayload,
} from "../js/core/scenario/strategic_values.js";

function createValidPayload() {
  return {
    version: 1,
    scenario_id: "hoi4_test",
    baseline_hash: "abc123",
    metrics: {
      manpower: {
        kind: "additive",
        min: 0,
        max: 3000000,
        p95: 3000000,
      },
    },
    buckets: {
      s10: {
        state_id: 10,
        owner_tag: "POL",
        attribution: "vp_anchor",
        manpower: 3000000,
      },
      "pool:GER": {
        owner_tag: "GER",
        attribution: "country_pooled",
        manpower: 500000,
      },
    },
    bucket_by_feature: {
      "GER-A": "pool:GER",
      "POL-A": "s10",
    },
    victory_points: [
      {
        province_id: 3544,
        value: 25,
        state_id: 10,
        owner_tag: "POL",
        name: "Warsaw",
        host_feature_id: "POL-A",
      },
      {
        province_id: 6000,
        value: 5,
        state_id: 12,
        owner_tag: "GER",
        name: "Fallback VP",
        match_method: "unmatched",
      },
    ],
    resource_points: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [21.0, 52.0],
          },
          properties: {
            resource: "steel",
            amount: 6,
            state_id: 10,
            owner_tag: "POL",
          },
        },
      ],
    },
    diagnostics: {
      vp_total: 2,
      vp_matched: 1,
      resource_point_count: 1,
    },
  };
}

function diagnosticCodes(entries) {
  return entries.map((entry) => entry.code);
}

test("normalizes valid strategic values payload into stable runtime indexes", () => {
  const result = normalizeScenarioStrategicValuesPayload(createValidPayload(), {
    expected: {
      scenarioId: "hoi4_test",
      baselineHash: "abc123",
    },
  });

  assert.deepEqual(Object.keys(result), [
    "scenarioId",
    "baselineHash",
    "metrics",
    "buckets",
    "bucketByFeature",
    "victoryPointsByFeature",
    "victoryPointsByState",
    "resourcePoints",
    "diagnostics",
  ]);
  assert.equal(result.scenarioId, "hoi4_test");
  assert.equal(result.baselineHash, "abc123");
  assert.deepEqual(result.diagnostics.errors, []);
  assert.deepEqual(result.diagnostics.warnings, []);
  assert.deepEqual(result.bucketByFeature, {
    "GER-A": "pool:GER",
    "POL-A": "s10",
  });
  assert.equal(result.metrics.manpower.max, 3000000);
  assert.equal(result.buckets.s10.owner_tag, "POL");
  assert.equal(result.victoryPointsByFeature["POL-A"][0].name, "Warsaw");
  assert.equal(result.victoryPointsByState["10"][0].host_feature_id, "POL-A");
  assert.equal(result.victoryPointsByState["12"][0].match_method, "unmatched");
  assert.equal(result.resourcePoints.type, "FeatureCollection");
  assert.equal(result.resourcePoints.features[0].properties.resource, "steel");
  assert.deepEqual(result.diagnostics.source, {
    resource_point_count: 1,
    vp_matched: 1,
    vp_total: 2,
  });
});

test("keeps already-normalized strategic values runtime payload stable", () => {
  const runtimePayload = normalizeScenarioStrategicValuesPayload(createValidPayload(), {
    expected: {
      scenarioId: "hoi4_test",
      baselineHash: "abc123",
    },
  });

  const result = normalizeScenarioStrategicValuesPayload(runtimePayload, {
    expectedScenarioId: "hoi4_test",
    expectedBaselineHash: "abc123",
  });

  assert.equal(isScenarioStrategicValuesRuntimePayload(result), true);
  assert.deepEqual(result, runtimePayload);
  assert.deepEqual(result.diagnostics.errors, []);
});

test("revalidates already-normalized strategic values runtime payload identity", () => {
  const runtimePayload = normalizeScenarioStrategicValuesPayload(createValidPayload(), {
    expected: {
      scenarioId: "hoi4_test",
      baselineHash: "abc123",
    },
  });

  const result = normalizeScenarioStrategicValuesPayload(runtimePayload, {
    expectedScenarioId: "other_scenario",
    expectedBaselineHash: "other_hash",
  });

  assert.equal(isScenarioStrategicValuesRuntimePayload(result), true);
  assert.equal(result.scenarioId, "hoi4_test");
  assert.equal(result.baselineHash, "abc123");
  assert.deepEqual(diagnosticCodes(result.diagnostics.errors), [
    "scenario_id_mismatch",
    "baseline_hash_mismatch",
  ]);
});

test("reports scenario id and baseline hash mismatches", () => {
  const result = normalizeScenarioStrategicValuesPayload(createValidPayload(), {
    expectedScenarioId: "hoi4_1939",
    expectedBaselineHash: "def456",
  });

  assert.deepEqual(diagnosticCodes(result.diagnostics.errors), [
    "scenario_id_mismatch",
    "baseline_hash_mismatch",
  ]);
  assert.equal(result.bucketByFeature["POL-A"], "s10");
});

test("reports unsupported payload version", () => {
  const payload = createValidPayload();
  payload.version = 2;

  const result = normalizeScenarioStrategicValuesPayload(payload);

  assert.deepEqual(diagnosticCodes(result.diagnostics.errors), [
    "unsupported_strategic_values_version",
  ]);
});

test("reports bucket references that do not exist", () => {
  const payload = createValidPayload();
  payload.bucket_by_feature["POL-B"] = "s999";

  const result = normalizeScenarioStrategicValuesPayload(payload);

  assert.ok(diagnosticCodes(result.diagnostics.errors).includes("missing_bucket_reference"));
  assert.equal(result.bucketByFeature["POL-B"], "s999");
  assert.equal(
    result.diagnostics.errors.find((entry) => entry.code === "missing_bucket_reference").details.featureId,
    "POL-B"
  );
});

test("reports invalid resource points FeatureCollection shape", () => {
  const payload = createValidPayload();
  payload.resource_points = {
    type: "FeatureCollection",
    features: {},
  };

  const result = normalizeScenarioStrategicValuesPayload(payload);

  assert.deepEqual(diagnosticCodes(result.diagnostics.errors), [
    "invalid_resource_points_features",
  ]);
  assert.deepEqual(result.resourcePoints, {
    type: "FeatureCollection",
    features: [],
  });
});

test("reports malformed strategic values payload", () => {
  const result = normalizeScenarioStrategicValuesPayload(null);

  assert.deepEqual(diagnosticCodes(result.diagnostics.errors), [
    "invalid_strategic_values_payload",
  ]);
  assert.deepEqual(result.bucketByFeature, {});
  assert.deepEqual(result.resourcePoints, {
    type: "FeatureCollection",
    features: [],
  });
});
