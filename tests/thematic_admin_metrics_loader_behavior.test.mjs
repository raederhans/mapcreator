import assert from "node:assert/strict";
import test from "node:test";

import politicalManifest from "../data/thematic_layers/political/state_capacity_demo/manifest.json" with { type: "json" };
import politicalMetrics from "../data/thematic_layers/political/state_capacity_demo/metrics.admin0.json" with { type: "json" };
import wgiManifest from "../data/thematic_layers/political/wgi_state_capacity_v1/manifest.json" with { type: "json" };
import wgiMetrics from "../data/thematic_layers/political/wgi_state_capacity_v1/metrics.admin0.json" with { type: "json" };
import populationManifest from "../data/thematic_layers/population/population_density_demo/manifest.json" with { type: "json" };
import { getCatalogAssetMetadata } from "../js/core/data_service.js";
import {
  createThematicAdminMetricLookup,
  getThematicAdminCoverageSummary,
  getThematicAdminFeatureMetrics,
  getThematicAdminMetricValue,
  listThematicAdminMetricIds,
  loadThematicAdminMetrics,
  normalizeThematicAdminMetricsPayload,
  THEMATIC_ADMIN_METRICS_CATALOG_ROLE,
  THEMATIC_ADMIN_METRICS_REASON,
  THEMATIC_ADMIN_METRICS_SCHEMA_VERSION,
} from "../js/core/thematic_admin_metrics_loader.js";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createAdminMetadata(path) {
  return Object.freeze({
    key: `test:${path}`,
    url: path,
    role: THEMATIC_ADMIN_METRICS_CATALOG_ROLE,
    format: "json",
    readMode: "json",
    cachePolicy: "default",
  });
}

function assertRejectsWithReason(action, reason) {
  return assert.rejects(action, (error) => {
    assert.equal(error.reason, reason);
    assert.equal(error.code, reason);
    return true;
  });
}

function assertThrowsWithReason(action, reason) {
  assert.throws(action, (error) => {
    assert.equal(error.reason, reason);
    assert.equal(error.code, reason);
    return true;
  });
}

test("normalizes fixture admin0 metrics and exposes known values", () => {
  const lookup = createThematicAdminMetricLookup(politicalMetrics);
  const usa = getThematicAdminMetricValue(lookup, "USA", "state_capacity_index");

  assert.equal(lookup.layerId, "political_state_capacity_demo");
  assert.equal(lookup.schemaVersion, THEMATIC_ADMIN_METRICS_SCHEMA_VERSION);
  assert.equal(lookup.geographyLevel, "admin0");
  assert.equal(lookup.joinKeyType, "iso_a3");
  assert.deepEqual(listThematicAdminMetricIds(lookup), [
    "state_capacity_index",
    "government_effectiveness_demo",
    "rule_of_law_demo",
  ]);
  assert.equal(usa.found, true);
  assert.equal(usa.missing, false);
  assert.equal(usa.rawValue, 78);
  assert.equal(usa.normalizedValue, 78);
  assert.equal(usa.year, 2024);
  assert.equal(usa.unit, "index_0_100");
  assert.equal(usa.sourceStatus, "fixture");
  assert.equal(usa.layerId, "political_state_capacity_demo");
  assert.equal(usa.joinKey, "USA");
  assert.equal(usa.metricId, "state_capacity_index");
  assert.equal(Object.isFrozen(lookup), true);
  assert.equal(Object.isFrozen(lookup.featureByJoinKey.USA.values), true);
});

test("real catalog metadata identifies admin metrics payload assets", () => {
  const fixtureMetadata = getCatalogAssetMetadata(politicalManifest.paths.metrics);
  const wgiMetadata = getCatalogAssetMetadata(wgiManifest.paths.metrics);

  assert.equal(fixtureMetadata.role, THEMATIC_ADMIN_METRICS_CATALOG_ROLE);
  assert.equal(fixtureMetadata.readMode, "json");
  assert.equal(wgiMetadata.role, THEMATIC_ADMIN_METRICS_CATALOG_ROLE);
  assert.equal(wgiMetadata.readMode, "json");
});

test("preserves null metric values separately from zero values", () => {
  const lookup = createThematicAdminMetricLookup(politicalMetrics);
  const brazilRuleOfLaw = getThematicAdminMetricValue(lookup, "BRA", "rule_of_law_demo");

  assert.equal(brazilRuleOfLaw.found, true);
  assert.equal(brazilRuleOfLaw.missing, true);
  assert.equal(brazilRuleOfLaw.rawValue, null);
  assert.equal(brazilRuleOfLaw.normalizedValue, null);
  assert.equal(brazilRuleOfLaw.sourceStatus, "source_gap");
  assert.equal(brazilRuleOfLaw.reason, THEMATIC_ADMIN_METRICS_REASON.METRIC_VALUE_MISSING);

  const zeroPayload = cloneJson(politicalMetrics);
  zeroPayload.metric_ids = ["state_capacity_index"];
  zeroPayload.features = [
    {
      join_key: "AAA",
      name: "Zero Test",
      coverage_status: "complete",
      values: {
        state_capacity_index: {
          raw_value: 0,
          normalized_value: 0,
          year: 2024,
          unit: "index_0_100",
          source_status: "observed",
        },
      },
    },
  ];
  const zeroLookup = createThematicAdminMetricLookup(zeroPayload);
  const zero = getThematicAdminMetricValue(zeroLookup, "AAA", "state_capacity_index");

  assert.equal(zero.found, true);
  assert.equal(zero.missing, false);
  assert.equal(zero.rawValue, 0);
  assert.equal(zero.normalizedValue, 0);
});

test("keeps unknown metric and unknown join key as separate query results", () => {
  const lookup = createThematicAdminMetricLookup(politicalMetrics);
  const unknownMetric = getThematicAdminMetricValue(lookup, "USA", "not_a_metric");
  const unknownJoin = getThematicAdminMetricValue(lookup, "ZZZ", "state_capacity_index");

  assert.equal(unknownMetric.found, false);
  assert.equal(unknownMetric.reason, THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_METRIC_ID);
  assert.equal(unknownJoin.found, false);
  assert.equal(unknownJoin.reason, THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_JOIN_KEY);
});

test("loads WGI admin0 metrics with uncertainty fields intact", () => {
  const lookup = createThematicAdminMetricLookup(wgiMetrics);
  const usaFeature = getThematicAdminFeatureMetrics(lookup, "USA");
  const governmentEffectiveness = usaFeature.metrics.wgi_government_effectiveness_score_0_100;
  const composite = usaFeature.metrics.wgi_state_capacity_composite_0_100;

  assert.equal(lookup.layerId, "political_wgi_state_capacity_v1");
  assert.equal(lookup.geographyLevel, "admin0");
  assert.equal(lookup.joinKeyType, "iso_a3");
  assert.deepEqual(listThematicAdminMetricIds(lookup), [
    "wgi_government_effectiveness_score_0_100",
    "wgi_rule_of_law_score_0_100",
    "wgi_state_capacity_composite_0_100",
  ]);
  assert.equal(governmentEffectiveness.uncertainty.number_of_sources, 8);
  assert.equal(governmentEffectiveness.uncertainty.score_standard_error, 4.595575);
  assert.equal(governmentEffectiveness.uncertainty.score_confidence_interval_90.lower, 70.247188);
  assert.equal(Object.isFrozen(governmentEffectiveness.uncertainty), true);
  assert.equal(Object.isFrozen(governmentEffectiveness.uncertainty.score_confidence_interval_90), true);
  assert.equal(governmentEffectiveness.sourceCountryCode, "USA");
  assert.equal(governmentEffectiveness.sourceRowRef, "WGI_2025_Revision_Governance_Estimates_and_Absolute_Scores_1996_2024.xlsx:row:5329");
  assert.equal(composite.uncertainty.method, "not_computed");
  assert.equal(composite.uncertainty.reason, "Composite uncertainty is not inferred from the two source dimensions.");
  assert.equal(composite.sourceRowRefs.government_effectiveness, "WGI_2025_Revision_Governance_Estimates_and_Absolute_Scores_1996_2024.xlsx:row:5329");
  assert.equal(composite.sourceRowRefs.rule_of_law, "WGI_2025_Revision_Governance_Estimates_and_Absolute_Scores_1996_2024.xlsx:row:5465");
});

test("summarizes admin metric coverage without recomputing source facts", () => {
  const fixtureSummary = getThematicAdminCoverageSummary(createThematicAdminMetricLookup(politicalMetrics));
  const wgiSummary = getThematicAdminCoverageSummary(createThematicAdminMetricLookup(wgiMetrics));

  assert.deepEqual(fixtureSummary, {
    layerId: "political_state_capacity_demo",
    features: 10,
    complete: 8,
    partial: 2,
    missing: 0,
  });
  assert.deepEqual(wgiSummary, {
    layerId: "political_wgi_state_capacity_v1",
    features: 215,
    complete: 213,
    partial: 2,
    missing: 0,
  });
});

test("loads manifest and metrics through runtime asset and catalog allowlist APIs", async () => {
  const requested = [];
  const payloadsByPath = {
    [politicalManifest.paths.metrics]: politicalMetrics,
  };
  const lookup = await loadThematicAdminMetrics("political_state_capacity_demo", {
    loadAsset: async (key) => {
      requested.push(["asset", key]);
      assert.equal(key, "thematic_layer:political_state_capacity_demo");
      return politicalManifest;
    },
    getCatalogAssetMetadata: (path) => {
      requested.push(["metadata", path]);
      return payloadsByPath[path] ? createAdminMetadata(path) : null;
    },
    loadCatalogAsset: async (path) => {
      requested.push(["catalog", path]);
      return payloadsByPath[path];
    },
  });

  assert.deepEqual(requested, [
    ["asset", "thematic_layer:political_state_capacity_demo"],
    ["metadata", politicalManifest.paths.metrics],
    ["catalog", politicalManifest.paths.metrics],
  ]);
  assert.equal(getThematicAdminMetricValue(lookup, "USA", "state_capacity_index").rawValue, 78);
});

test("loads WGI admin metrics through runtime asset and catalog allowlist APIs", async () => {
  const requested = [];
  const payloadsByPath = {
    [wgiManifest.paths.metrics]: wgiMetrics,
  };
  const lookup = await loadThematicAdminMetrics("political_wgi_state_capacity_v1", {
    loadAsset: async (key) => {
      requested.push(["asset", key]);
      assert.equal(key, "thematic_layer:political_wgi_state_capacity_v1");
      return wgiManifest;
    },
    getCatalogAssetMetadata: (path) => {
      requested.push(["metadata", path]);
      return payloadsByPath[path] ? createAdminMetadata(path) : null;
    },
    loadCatalogAsset: async (path) => {
      requested.push(["catalog", path]);
      return payloadsByPath[path];
    },
  });

  assert.deepEqual(requested, [
    ["asset", "thematic_layer:political_wgi_state_capacity_v1"],
    ["metadata", wgiManifest.paths.metrics],
    ["catalog", wgiManifest.paths.metrics],
  ]);
  assert.deepEqual(listThematicAdminMetricIds(lookup), [
    "wgi_government_effectiveness_score_0_100",
    "wgi_rule_of_law_score_0_100",
    "wgi_state_capacity_composite_0_100",
  ]);
  assert.deepEqual(getThematicAdminCoverageSummary(lookup), {
    layerId: "political_wgi_state_capacity_v1",
    features: 215,
    complete: 213,
    partial: 2,
    missing: 0,
  });
});

test("rejects unknown layer id before metrics payload loading", async () => {
  let catalogRequested = false;

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("missing_layer_id", {
      loadCatalogAsset: async () => {
        catalogRequested = true;
        return {};
      },
    }),
    THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_LAYER_ID,
  );
  assert.equal(catalogRequested, false);
});

test("rejects grid layers before loading grid payloads", async () => {
  let metadataRequested = false;
  let catalogRequested = false;

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("population_density_demo", {
      loadAsset: async () => populationManifest,
      getCatalogAssetMetadata: () => {
        metadataRequested = true;
        return createAdminMetadata(populationManifest.paths.grid);
      },
      loadCatalogAsset: async () => {
        catalogRequested = true;
        return {};
      },
    }),
    THEMATIC_ADMIN_METRICS_REASON.UNSUPPORTED_GEOMETRY_KIND,
  );
  assert.equal(metadataRequested, false);
  assert.equal(catalogRequested, false);
});

test("rejects manifest metrics paths outside the catalog allowlist", async () => {
  let catalogRequested = false;
  const manifest = {
    ...politicalManifest,
    paths: {
      ...politicalManifest.paths,
      metrics: "data/thematic_layers/not-registered.json",
    },
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => manifest,
      getCatalogAssetMetadata: () => null,
      loadCatalogAsset: async () => {
        catalogRequested = true;
        return politicalMetrics;
      },
    }),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PATH_NOT_ALLOWLISTED,
  );
  assert.equal(catalogRequested, false);
});

test("rejects catalog entries that are not admin metrics json assets", async () => {
  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => ({
        ...createAdminMetadata(politicalManifest.paths.metrics),
        role: "thematic_build_audit",
      }),
      loadMetrics: async () => politicalMetrics,
    }),
    THEMATIC_ADMIN_METRICS_REASON.ADMIN_METRICS_UNAVAILABLE,
  );

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => ({
        ...createAdminMetadata(politicalManifest.paths.metrics),
        readMode: "module",
      }),
      loadMetrics: async () => politicalMetrics,
    }),
    THEMATIC_ADMIN_METRICS_REASON.ADMIN_METRICS_UNAVAILABLE,
  );
});

test("rejects manifest and payload layer mismatch", async () => {
  const mismatchedPayload = {
    ...cloneJson(politicalMetrics),
    layer_id: "political_wgi_state_capacity_v1",
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => createAdminMetadata(politicalManifest.paths.metrics),
      loadMetrics: async () => mismatchedPayload,
    }),
    THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_LAYER_MISMATCH,
  );
});

test("rejects unsupported manifest and payload schema versions", async () => {
  const manifestV2 = {
    ...politicalManifest,
    schema_version: 2,
  };
  const payloadV2 = {
    ...cloneJson(politicalMetrics),
    schema_version: 2,
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => manifestV2,
      getCatalogAssetMetadata: () => createAdminMetadata(manifestV2.paths.metrics),
      loadMetrics: async () => politicalMetrics,
    }),
    THEMATIC_ADMIN_METRICS_REASON.MANIFEST_LOAD_FAILED,
  );

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => createAdminMetadata(politicalManifest.paths.metrics),
      loadMetrics: async () => payloadV2,
    }),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );
});

test("rejects duplicate manifest metric ids before metrics payload loading", async () => {
  let metadataRequested = false;
  let metricsRequested = false;
  const duplicateMetricManifest = {
    ...politicalManifest,
    metric_ids: ["state_capacity_index", "state_capacity_index"],
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => duplicateMetricManifest,
      getCatalogAssetMetadata: () => {
        metadataRequested = true;
        return createAdminMetadata(duplicateMetricManifest.paths.metrics);
      },
      loadMetrics: async () => {
        metricsRequested = true;
        return politicalMetrics;
      },
    }),
    THEMATIC_ADMIN_METRICS_REASON.MANIFEST_LOAD_FAILED,
  );
  assert.equal(metadataRequested, false);
  assert.equal(metricsRequested, false);
});

test("rejects empty feature payloads", () => {
  const emptyPayload = {
    ...cloneJson(politicalMetrics),
    features: [],
  };

  assert.throws(
    () => createThematicAdminMetricLookup(emptyPayload),
    (error) => {
      assert.equal(error.reason, THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID);
      return true;
    },
  );
});

test("rejects manifest and payload metric id mismatch", async () => {
  const mismatchedPayload = cloneJson(politicalMetrics);
  mismatchedPayload.metric_ids = ["state_capacity_index", "government_effectiveness_demo"];

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => createAdminMetadata(politicalManifest.paths.metrics),
      loadMetrics: async () => mismatchedPayload,
    }),
    THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_METRIC_IDS_MISMATCH,
  );
});

test("rejects geography and join key type mismatch", async () => {
  const mismatchedPayload = {
    ...cloneJson(politicalMetrics),
    geography_level: "admin1",
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => createAdminMetadata(politicalManifest.paths.metrics),
      loadMetrics: async () => mismatchedPayload,
    }),
    THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_JOIN_CONTRACT_MISMATCH,
  );
});

test("rejects feature count mismatch", async () => {
  const manifest = {
    ...politicalManifest,
    coverage_scope: {
      ...politicalManifest.coverage_scope,
      feature_count: politicalManifest.coverage_scope.feature_count + 1,
    },
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => manifest,
      getCatalogAssetMetadata: () => createAdminMetadata(manifest.paths.metrics),
      loadMetrics: async () => politicalMetrics,
    }),
    THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_FEATURE_COUNT_MISMATCH,
  );
});

test("rejects blank and duplicate feature join keys before lookup creation", async () => {
  const blankJoinPayload = cloneJson(politicalMetrics);
  blankJoinPayload.features[0] = {
    ...blankJoinPayload.features[0],
    join_key: " ",
  };

  await assertRejectsWithReason(
    () => loadThematicAdminMetrics("political_state_capacity_demo", {
      loadManifest: async () => politicalManifest,
      getCatalogAssetMetadata: () => createAdminMetadata(politicalManifest.paths.metrics),
      loadMetrics: async () => blankJoinPayload,
    }),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const duplicateJoinPayload = cloneJson(politicalMetrics);
  duplicateJoinPayload.features[1] = {
    ...duplicateJoinPayload.features[1],
    join_key: duplicateJoinPayload.features[0].join_key,
  };

  assert.throws(
    () => createThematicAdminMetricLookup(duplicateJoinPayload),
    (error) => {
      assert.equal(error.reason, THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID);
      assert.equal(error.joinKey, "USA");
      return true;
    },
  );
});

test("rejects invalid payload shape before lookup creation", () => {
  assertThrowsWithReason(
    () => normalizeThematicAdminMetricsPayload({ layer_id: "broken", metric_ids: [] }),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const duplicateMetricPayload = cloneJson(politicalMetrics);
  duplicateMetricPayload.metric_ids = ["state_capacity_index", "state_capacity_index"];
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(duplicateMetricPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );
});

test("rejects malformed feature metric values before lookup creation", () => {
  const missingMetricPayload = cloneJson(politicalMetrics);
  delete missingMetricPayload.features[0].values.state_capacity_index;
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(missingMetricPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const nonObjectMetricPayload = cloneJson(politicalMetrics);
  nonObjectMetricPayload.features[0].values.state_capacity_index = null;
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(nonObjectMetricPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const missingRequiredMetricFieldPayload = cloneJson(politicalMetrics);
  delete missingRequiredMetricFieldPayload.features[0].values.state_capacity_index.source_status;
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(missingRequiredMetricFieldPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const invalidSourceStatusPayload = cloneJson(politicalMetrics);
  invalidSourceStatusPayload.features[0].values.state_capacity_index.source_status = "blank";
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(invalidSourceStatusPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const invalidCoverageStatusPayload = cloneJson(politicalMetrics);
  invalidCoverageStatusPayload.features[0].coverage_status = "blank";
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(invalidCoverageStatusPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const coverageStatusMismatchPayload = cloneJson(politicalMetrics);
  coverageStatusMismatchPayload.features.find((feature) => feature.join_key === "BRA").coverage_status = "complete";
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(coverageStatusMismatchPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const missingStatusWithValuesPayload = cloneJson(politicalMetrics);
  missingStatusWithValuesPayload.features[0].values.state_capacity_index.source_status = "source_gap";
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(missingStatusWithValuesPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const nullObservedValuePayload = cloneJson(politicalMetrics);
  nullObservedValuePayload.features[0].values.state_capacity_index.raw_value = null;
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(nullObservedValuePayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const stringMetricValuePayload = cloneJson(politicalMetrics);
  stringMetricValuePayload.features[0].values.state_capacity_index.raw_value = "78";
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(stringMetricValuePayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );

  const outOfRangeNormalizedPayload = cloneJson(politicalMetrics);
  outOfRangeNormalizedPayload.features[0].values.state_capacity_index.normalized_value = 150;
  assertThrowsWithReason(
    () => createThematicAdminMetricLookup(outOfRangeNormalizedPayload),
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
  );
});
