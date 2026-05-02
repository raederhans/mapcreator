import test from "node:test";
import assert from "node:assert/strict";

import { createBorderMeshOwner } from "../js/core/renderer/border_mesh_owner.js";

function createTestOwner(state = {}) {
  const perfMetrics = [];
  const invalidations = [];
  const owner = createBorderMeshOwner({
    state,
    helpers: {
      invalidateRenderPasses: (...args) => invalidations.push(args),
      isUsableMesh: (mesh) => !!(mesh && Array.isArray(mesh.coordinates) && mesh.coordinates.length > 0),
      nowMs: () => 0,
      recordRenderPerfMetric: (name, duration, details) => perfMetrics.push({ name, duration, details }),
      resolveOwnerBorderCode: (feature, ownershipContext = {}) => ownershipContext.ownershipByFeatureId?.[feature?.id] || "",
      shouldExcludeOwnerBorderEntity: () => false,
    },
  });
  return { owner, invalidations, perfMetrics };
}

test("refreshScenarioOpeningOwnerBorders reuses mesh pack opening-owner mesh when available", () => {
  const meshPackMesh = {
    type: "MultiLineString",
    coordinates: [[[1, 1], [2, 2]]],
  };
  const state = {
    activeScenarioId: "tno_1962",
    scenarioBorderMode: "scenario_owner_only",
    scenarioViewMode: "ownership",
    runtimePoliticalTopology: null,
    activeScenarioMeshPack: { meshes: { opening_owner_borders: meshPackMesh } },
    scenarioBaselineOwnersByFeatureId: {},
    scenarioAutoShellOwnerByFeatureId: {},
    scenarioShellOverlayRevision: 0,
    scenarioBaselineHash: "baseline-hash",
    cachedScenarioOpeningOwnerBorders: null,
  };

  const { owner } = createTestOwner(state);
  const built = owner.refreshScenarioOpeningOwnerBorders("mesh-pack-ready");

  assert.equal(built, true);
  assert.equal(state.cachedScenarioOpeningOwnerBorders, meshPackMesh);
});

test("refreshScenarioOpeningOwnerBorders falls back to runtime topology when mesh pack is absent", () => {
  const runtimeFallbackMesh = {
    type: "MultiLineString",
    coordinates: [[[3, 3], [4, 4]]],
  };
  const previousTopojson = globalThis.topojson;
  globalThis.topojson = {
    mesh: () => runtimeFallbackMesh,
  };

  try {
    const state = {
      activeScenarioId: "tno_1962",
      scenarioBorderMode: "scenario_owner_only",
      scenarioViewMode: "ownership",
      runtimePoliticalTopology: { objects: { political: {} } },
      activeScenarioMeshPack: null,
      scenarioBaselineOwnersByFeatureId: { A: "GER", B: "USA" },
      scenarioAutoShellOwnerByFeatureId: {},
      scenarioShellOverlayRevision: 0,
      scenarioBaselineHash: "baseline-hash",
      cachedScenarioOpeningOwnerBorders: null,
    };

    const { owner } = createTestOwner(state);
    const built = owner.refreshScenarioOpeningOwnerBorders("runtime-fallback");

    assert.equal(built, true);
    assert.equal(state.cachedScenarioOpeningOwnerBorders, runtimeFallbackMesh);
  } finally {
    globalThis.topojson = previousTopojson;
  }
});

test("refreshScenarioOpeningOwnerBorders clears cache when startup state is not ready", () => {
  const state = {
    activeScenarioId: "tno_1962",
    scenarioBorderMode: "canonical",
    scenarioViewMode: "ownership",
    runtimePoliticalTopology: { objects: { political: {} } },
    activeScenarioMeshPack: null,
    scenarioBaselineOwnersByFeatureId: {},
    scenarioAutoShellOwnerByFeatureId: {},
    scenarioShellOverlayRevision: 0,
    scenarioBaselineHash: "baseline-hash",
    cachedScenarioOpeningOwnerBorders: {
      type: "MultiLineString",
      coordinates: [[[5, 5], [6, 6]]],
    },
  };

  const { owner } = createTestOwner(state);
  const built = owner.refreshScenarioOpeningOwnerBorders("not-ready");

  assert.equal(built, false);
  assert.equal(state.cachedScenarioOpeningOwnerBorders, null);
});

test("getFrontlineMesh caches frontline mesh by ownership revision hash and clears when disabled", () => {
  const frontlineMesh = {
    type: "MultiLineString",
    coordinates: [[[7, 7], [8, 8]]],
  };
  const previousTopojson = globalThis.topojson;
  globalThis.topojson = {
    mesh: () => frontlineMesh,
  };

  try {
    const state = {
      activeScenarioId: "tno_1962",
      annotationView: { frontlineEnabled: true },
      runtimePoliticalTopology: { objects: { political: {} } },
      sovereigntyByFeatureId: { A: "GER", B: "USA" },
      scenarioControllersByFeatureId: { A: "GER", B: "USA" },
      scenarioAutoShellOwnerByFeatureId: {},
      scenarioAutoShellControllerByFeatureId: {},
      scenarioControllerRevision: 2,
      scenarioShellOverlayRevision: 1,
      sovereigntyRevision: 4,
      cachedFrontlineMesh: null,
      cachedFrontlineMeshHash: "",
    };

    const { owner } = createTestOwner(state);
    const first = owner.getFrontlineMesh();
    const second = owner.getFrontlineMesh();
    const ownershipContext = owner.getFrontlineOwnershipContext();

    assert.equal(first, frontlineMesh);
    assert.equal(second, frontlineMesh);
    assert.equal(state.cachedFrontlineMesh, frontlineMesh);
    assert.match(state.cachedFrontlineMeshHash, /^scenario:tno_1962\|ctrl:2\|shell:1\|sov:4$/);
    assert.equal(ownershipContext.viewMode, "frontline");
    assert.equal(ownershipContext.scenarioActive, true);

    state.annotationView.frontlineEnabled = false;
    assert.equal(owner.getFrontlineMesh(), null);
    assert.equal(state.cachedFrontlineMesh, null);
    assert.equal(state.cachedFrontlineMeshHash, "");
  } finally {
    globalThis.topojson = previousTopojson;
  }
});
