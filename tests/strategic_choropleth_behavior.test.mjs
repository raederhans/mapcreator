import test from "node:test";
import assert from "node:assert/strict";

import {
  STRATEGIC_CHOROPLETH_METRIC_IDS,
  buildStrategicChoroplethColorInput,
  getStrategicChoroplethMetricDomain,
  getStrategicChoroplethT,
  isStrategicChoroplethMetric,
  resolveStrategicChoroplethValue,
} from "../js/core/renderer/strategic_choropleth.js";

test("strategic choropleth metric allowlist rejects unknown metrics", () => {
  assert.equal(isStrategicChoroplethMetric("steel"), true);
  assert.equal(STRATEGIC_CHOROPLETH_METRIC_IDS.includes("factories_total"), true);
  assert.throws(
    () => resolveStrategicChoroplethValue({}, "feature-a", "unknown_metric"),
    /Unknown strategic choropleth metric/,
  );
});

test("strategic choropleth returns safe zero input for empty payload", () => {
  const input = buildStrategicChoroplethColorInput(null, "feature-a", "manpower");

  assert.equal(input.featureId, "feature-a");
  assert.equal(input.bucketId, "");
  assert.equal(input.value, 0);
  assert.equal(input.domain.min, 0);
  assert.equal(input.domain.max, 1);
  assert.equal(input.t, 0);
});

test("strategic choropleth resolves feature bucket values and metric domains", () => {
  const payload = {
    metrics: {
      manpower: { kind: "additive", min: 0, max: 1000, p95: 800 },
    },
    bucketByFeature: {
      "feature-a": "s10",
    },
    buckets: {
      s10: { manpower: 400 },
    },
  };

  const input = buildStrategicChoroplethColorInput(payload, { id: "feature-a" }, "manpower");

  assert.equal(input.bucketId, "s10");
  assert.equal(input.value, 400);
  assert.deepEqual(input.domain, {
    metricId: "manpower",
    kind: "additive",
    min: 0,
    max: 800,
    cap: 800,
    absoluteMax: 1000,
  });
  assert.equal(input.t, 0.5);
});

test("strategic choropleth clamps interpolation t values", () => {
  const domain = getStrategicChoroplethMetricDomain(
    { metrics: { steel: { kind: "additive", min: 2, max: 20, p95: 10 } } },
    "steel",
  );

  assert.equal(getStrategicChoroplethT(-5, domain), 0);
  assert.equal(getStrategicChoroplethT(20, domain), 1);
});
