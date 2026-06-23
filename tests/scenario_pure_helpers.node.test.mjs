import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pureHelpersPath = new URL("../js/core/scenario/pure_helpers.js", import.meta.url);
const pureHelpersSource = await readFile(pureHelpersPath, "utf8");
const inlinedSource = pureHelpersSource
  .replace(
    /import\s*\{[\s\S]*?\}\s*from\s*"\.\.\/scenario_runtime_queries\.js";/,
    `const getRuntimeGeometryFeatureId = (geometry) => String(geometry?.properties?.id || geometry?.id || "").trim();
const getScenarioRuntimeGeometryCountryCode = (geometry) => String(geometry?.properties?.cntr_code || "").trim().toUpperCase();
const hasExplicitScenarioAssignment = (featureMap, featureId) => !!(featureMap && Object.prototype.hasOwnProperty.call(featureMap, featureId));
const WATER_LIKE_TOKEN_PATTERN = /(^|[_-])(water|marine|ocean|sea|gulf|bay|lake|river|strait|chokepoint)([_-]|$)/i;
const isScenarioWaterLikeFeature = (feature, featureId = "") => {
  const props = feature?.properties || {};
  if (String(props.water_type || "").trim()) return true;
  if (WATER_LIKE_TOKEN_PATTERN.test(String(props.region_group || "").trim())) return true;
  if (WATER_LIKE_TOKEN_PATTERN.test(String(props.geometry_role || "").trim())) return true;
  if (props.render_as_base_geography === true) {
    const identity = [
      featureId,
      String(props.id || feature?.id || ""),
      props.__source,
      props.source_layer,
      props.layer,
      props.feature_class,
      props.kind,
    ].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
    return WATER_LIKE_TOKEN_PATTERN.test(identity);
  }
  return false;
};
const shouldApplyHoi4FarEastSovietBackfill = (scenarioId) => {
  const normalizedId = String(scenarioId || "").trim();
  return normalizedId === "hoi4_1936" || normalizedId === "hoi4_1939";
};`,
  )
  .replace(
    /import\s*\{\s*recordScenarioPerfMetricState,\s*\}\s*from\s*"\.\.\/state\/scenario_runtime_state\.js";/,
    `const recordScenarioPerfMetricState = (state, name, durationMs, details = {}) => {
  if (!state.scenarioPerfMetrics || typeof state.scenarioPerfMetrics !== "object") {
    Reflect.set(state, "scenarioPerfMetrics", {});
  }
  const metrics = state.scenarioPerfMetrics;
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return null;
  const nextEntry = {
    durationMs: Math.max(0, Number(durationMs) || 0),
    recordedAt: Date.now(),
    ...(details && typeof details === "object" ? details : {}),
  };
  metrics[normalizedName] = nextEntry;
  globalThis.__scenarioPerfMetrics = metrics;
  return nextEntry;
};`,
  );
const pureHelpers = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(inlinedSource)}`);

test("getHoi4FarEastSovietRuntimeCandidateFeatureIds uses topology identity cache on repeated calls", () => {
  const topology = {
    objects: {
      political: {
        geometries: [
          { properties: { id: "RU-1", cntr_code: "RU" } },
          { properties: { id: "RU-2", cntr_code: "RU" } },
          { properties: { id: "JP-1", cntr_code: "JP" } },
        ],
      },
    },
  };

  const first = pureHelpers.getHoi4FarEastSovietRuntimeCandidateFeatureIds(topology);
  const second = pureHelpers.getHoi4FarEastSovietRuntimeCandidateFeatureIds(topology);

  assert.equal(second, first);
  assert.deepEqual(second, ["RU-1", "RU-2"]);
});

test("getHoi4FarEastSovietRuntimeCandidateFeatureIds keeps ordinary RU land while excluding water and base geography", () => {
  const topology = {
    objects: {
      political: {
        geometries: [
          { properties: { id: "RU-LAND", cntr_code: "RU" } },
          { properties: { id: "RU-SHELL-LAND", cntr_code: "RU", scenario_helper_kind: "shell_fallback", render_as_base_geography: false } },
          { properties: { id: "RU-WATER", cntr_code: "RU", water_type: "sea", region_group: "marine_macro" } },
          { properties: { id: "RU-BASE-WATER", cntr_code: "RU", render_as_base_geography: true, source_layer: "marine_macro" } },
          { properties: { id: "RU-BASE-LAND", cntr_code: "RU", render_as_base_geography: true } },
          { properties: { id: "JP-LAND", cntr_code: "JP" } },
        ],
      },
    },
  };

  assert.deepEqual(
    pureHelpers.getHoi4FarEastSovietRuntimeCandidateFeatureIds(topology),
    ["RU-LAND", "RU-SHELL-LAND"],
  );
  assert.equal(
    pureHelpers.isHoi4FarEastSovietBackfillLandCandidate({
      properties: { id: "RU-WATER", water_type: "sea" },
    }, "RU-WATER"),
    false,
  );
});

test("buildHoi4FarEastSovietOwnerBackfill reuses cached candidate ids and respects explicit assignments", () => {
  const topology = {
    objects: {
      political: {
        geometries: [
          { properties: { id: "RU-1", cntr_code: "RU" } },
          { properties: { id: "RU-2", cntr_code: "RU" } },
        ],
      },
    },
  };

  const firstBackfill = pureHelpers.buildHoi4FarEastSovietOwnerBackfill("hoi4_1939", {
    runtimeTopology: topology,
    ownersByFeatureId: { "RU-1": "SOV" },
    controllersByFeatureId: {},
  });
  const secondBackfill = pureHelpers.buildHoi4FarEastSovietOwnerBackfill("hoi4_1939", {
    runtimeTopology: topology,
    ownersByFeatureId: {},
    controllersByFeatureId: {},
  });

  assert.deepEqual(firstBackfill, { "RU-2": "SOV" });
  assert.deepEqual(secondBackfill, { "RU-1": "SOV", "RU-2": "SOV" });
});
