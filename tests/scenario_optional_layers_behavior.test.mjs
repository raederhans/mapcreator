import test from "node:test";
import assert from "node:assert/strict";

import { state } from "../js/core/state.js";
import {
  ensureActiveScenarioOptionalLayerLoaded,
  ensureActiveScenarioOptionalLayersForVisibility,
} from "../js/core/scenario_resources.js";
import { createLayerFromPreset } from "../js/core/special_zone_layers.js";

test("failed special zone optional layer load clears stale runtime state", async () => {
  const previousActiveScenarioId = state.activeScenarioId;
  const previousActiveScenarioManifest = state.activeScenarioManifest;
  const previousBundleCache = state.scenarioBundleCacheById;
  const previousSpecialZoneLayers = state.specialZoneLayers;
  const previousLandIndex = state.landIndex;
  const previousFetch = globalThis.fetch;

  const pendingLayer = createLayerFromPreset("custom", { id: "pending-layer", memberFeatureIds: ["a"] });
  state.activeScenarioId = "scenario_special_zones_test";
  state.activeScenarioManifest = {
    scenario_id: "scenario_special_zones_test",
    special_zone_layers_url: "data/scenarios/test/special_zone_layers.json",
  };
  state.landIndex = new Map([["a", { id: "a" }]]);
  state.specialZoneLayers = {
    layers: [pendingLayer],
    activeLayerId: "pending-layer",
    diagnostics: [],
  };
  state.scenarioBundleCacheById = {
    scenario_special_zones_test: {
      manifest: {
        scenario_id: "scenario_special_zones_test",
        special_zone_layers_url: "data/scenarios/test/special_zone_layers.json",
      },
      optionalLayerPromises: {},
      optionalLayerSettledByKey: {},
    },
  };
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  try {
    const payload = await ensureActiveScenarioOptionalLayerLoaded("specialZoneLayers", { renderNow: false });
    assert.equal(payload, null);
    assert.deepEqual(state.specialZoneLayers.layers, []);
    assert.equal(state.specialZoneLayers.activeLayerId, "");
    assert.ok(state.specialZoneLayers.diagnostics.some((entry) => entry.code === "special_zone_layers_load_failed"));
    assert.equal(state.specialZonesOverlayDirty, true);
  } finally {
    state.activeScenarioId = previousActiveScenarioId;
    state.activeScenarioManifest = previousActiveScenarioManifest;
    state.scenarioBundleCacheById = previousBundleCache;
    state.specialZoneLayers = previousSpecialZoneLayers;
    state.landIndex = previousLandIndex;
    globalThis.fetch = previousFetch;
  }
});

test("visibility sync clears stale special zone layers when declared asset load fails", async () => {
  const previousActiveScenarioId = state.activeScenarioId;
  const previousActiveScenarioManifest = state.activeScenarioManifest;
  const previousBundleCache = state.scenarioBundleCacheById;
  const previousSpecialZoneLayers = state.specialZoneLayers;
  const previousLandIndex = state.landIndex;
  const previousShowSpecialZones = state.showSpecialZones;
  const previousShowWaterRegions = state.showWaterRegions;
  const previousShowScenarioSpecialRegions = state.showScenarioSpecialRegions;
  const previousShowScenarioAtlantropa = state.showScenarioAtlantropa;
  const previousShowScenarioReliefOverlays = state.showScenarioReliefOverlays;
  const previousShowCityPoints = state.showCityPoints;
  const previousSpecialZonesOverlayDirty = state.specialZonesOverlayDirty;
  const previousFetch = globalThis.fetch;

  const staleLayer = createLayerFromPreset("custom", { id: "stale-layer", memberFeatureIds: ["a"] });
  state.activeScenarioId = "scenario_special_zones_visibility_test";
  state.activeScenarioManifest = {
    scenario_id: "scenario_special_zones_visibility_test",
    special_zone_layers_url: "data/scenarios/test/special_zone_layers.json",
  };
  state.showSpecialZones = true;
  state.showWaterRegions = false;
  state.showScenarioSpecialRegions = false;
  state.showScenarioAtlantropa = false;
  state.showScenarioReliefOverlays = false;
  state.showCityPoints = false;
  state.specialZonesOverlayDirty = false;
  state.landIndex = new Map([["a", { id: "a" }]]);
  state.specialZoneLayers = {
    layers: [staleLayer],
    activeLayerId: "stale-layer",
    diagnostics: [],
  };
  state.scenarioBundleCacheById = {
    scenario_special_zones_visibility_test: {
      manifest: {
        scenario_id: "scenario_special_zones_visibility_test",
        special_zone_layers_url: "data/scenarios/test/special_zone_layers.json",
      },
      optionalLayerPromises: {},
      optionalLayerSettledByKey: {},
    },
  };
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  try {
    const payloads = await ensureActiveScenarioOptionalLayersForVisibility({
      renderNow: false,
    });
    assert.deepEqual(payloads, [null]);
    assert.deepEqual(state.specialZoneLayers.layers, []);
    assert.equal(state.specialZoneLayers.activeLayerId, "");
    assert.ok(state.specialZoneLayers.diagnostics.some((entry) => entry.code === "special_zone_layers_load_failed"));
    assert.equal(state.specialZonesOverlayDirty, true);
  } finally {
    state.activeScenarioId = previousActiveScenarioId;
    state.activeScenarioManifest = previousActiveScenarioManifest;
    state.scenarioBundleCacheById = previousBundleCache;
    state.specialZoneLayers = previousSpecialZoneLayers;
    state.landIndex = previousLandIndex;
    state.showSpecialZones = previousShowSpecialZones;
    state.showWaterRegions = previousShowWaterRegions;
    state.showScenarioSpecialRegions = previousShowScenarioSpecialRegions;
    state.showScenarioAtlantropa = previousShowScenarioAtlantropa;
    state.showScenarioReliefOverlays = previousShowScenarioReliefOverlays;
    state.showCityPoints = previousShowCityPoints;
    state.specialZonesOverlayDirty = previousSpecialZonesOverlayDirty;
    globalThis.fetch = previousFetch;
  }
});

