import test from "node:test";
import assert from "node:assert/strict";

import {
  SPECIAL_ZONE_PRESETS,
  buildSpecialZoneRenderFeatures,
  createEmptySpecialZoneLayersState,
  createLayerFromPreset,
  mutateSpecialZoneLayersState,
  normalizeSpecialZoneLayersState,
  serializeSpecialZoneLayersState,
  updateSpecialZoneLayerMembership,
} from "../js/core/special_zone_layers.js";

test("special zone layer defaults and preset registry are stable", () => {
  const state = createEmptySpecialZoneLayersState({ topologyFingerprint: "topo-a" });
  assert.equal(state.version, 1);
  assert.equal(state.topologyFingerprint, "topo-a");
  assert.equal(state.activeLayerId, "");
  assert.equal(state.layers.length, 0);
  assert.equal(SPECIAL_ZONE_PRESETS.length, 18);
});

test("normalizes schema, diagnostics, legacy drops, and sorted member arrays", () => {
  const normalized = normalizeSpecialZoneLayersState({
    topologyFingerprint: "old-topo",
    manualSpecialZones: { type: "FeatureCollection", features: [] },
    layers: [
      {
        id: "layer-a",
        name: "Layer A",
        source: "scenario",
        style: { fill: "#ABC", pattern: "dots" },
        memberFeatureIds: ["b", "", "a", "missing", "a"],
      },
      { id: "layer-a", memberFeatureIds: ["b"] },
    ],
    activeLayerId: "layer-a",
  }, {
    topologyFingerprint: "new-topo",
    validFeatureIds: new Set(["a", "b"]),
  });

  assert.equal(normalized.topologyFingerprint, "new-topo");
  assert.equal(normalized.layers.length, 1);
  assert.deepEqual(normalized.layers[0].memberFeatureIds, ["a", "b"]);
  assert.equal(normalized.layers[0].style.fill, "#aabbcc");
  assert.ok(normalized.diagnostics.some((entry) => entry.code === "topology_fingerprint_mismatch"));
  assert.ok(normalized.diagnostics.some((entry) => entry.code === "legacy_special_zone_fields_dropped"));
  assert.ok(normalized.diagnostics.some((entry) => entry.code === "invalid_feature_id" && entry.featureId === "missing"));
  assert.ok(normalized.diagnostics.some((entry) => entry.code === "duplicate_layer_id_dropped"));
});

test("mutations cover CRUD, reorder, style, and membership operations", () => {
  let state = createEmptySpecialZoneLayersState();
  const first = createLayerFromPreset("disputed", { id: "a", memberFeatureIds: ["1"] });
  const second = createLayerFromPreset("wasteland", { id: "b", memberFeatureIds: ["2"] });

  state = mutateSpecialZoneLayersState(state, { action: "addLayer", layer: first });
  state = mutateSpecialZoneLayersState(state, { action: "addLayer", layer: second });
  assert.equal(state.activeLayerId, "b");

  state = mutateSpecialZoneLayersState(state, { action: "setActiveLayer", layerId: "a" });
  assert.equal(state.activeLayerId, "a");

  state = mutateSpecialZoneLayersState(state, { action: "addMembers", layerId: "a", featureIds: ["3", "2"] });
  assert.deepEqual(state.layers.find((layer) => layer.id === "a").memberFeatureIds, ["1", "2", "3"]);

  state = mutateSpecialZoneLayersState(state, { action: "toggleMembers", layerId: "a", featureIds: ["2", "4"] });
  assert.deepEqual(state.layers.find((layer) => layer.id === "a").memberFeatureIds, ["1", "3", "4"]);

  state = mutateSpecialZoneLayersState(state, { action: "replaceMembers", layerId: "a", featureIds: ["9", "8"] });
  assert.deepEqual(state.layers.find((layer) => layer.id === "a").memberFeatureIds, ["8", "9"]);

  state = mutateSpecialZoneLayersState(state, { action: "updateLayer", layerId: "a", patch: { name: "Renamed", style: { fill: "#112233", revision: 5 } } });
  assert.equal(state.layers.find((layer) => layer.id === "a").name, "Renamed");
  assert.equal(state.layers.find((layer) => layer.id === "a").style.revision, 5);

  state = mutateSpecialZoneLayersState(state, { action: "duplicateLayer", layerId: "a", newLayerId: "a-copy" });
  assert.ok(state.layers.some((layer) => layer.id === "a-copy"));

  state = mutateSpecialZoneLayersState(state, { action: "reorderLayers", layerIds: ["a-copy", "b", "a"] });
  assert.deepEqual(state.layers.map((layer) => layer.id), ["a-copy", "b", "a"]);

  state = mutateSpecialZoneLayersState(state, { action: "deleteLayer", layerId: "b" });
  assert.deepEqual(state.layers.map((layer) => layer.id), ["a-copy", "a"]);
});

test("serialization and render feature bridge preserve canonical ids", () => {
  let state = createEmptySpecialZoneLayersState();
  state = mutateSpecialZoneLayersState(state, {
    action: "addLayer",
    layer: createLayerFromPreset("neutral", { id: "neutral", memberFeatureIds: ["2", "1"] }),
  });
  state = updateSpecialZoneLayerMembership(state, "neutral", "3", "add");
  const serialized = serializeSpecialZoneLayersState(state);
  assert.deepEqual(serialized.layers[0].memberFeatureIds, ["1", "2", "3"]);

  const featureById = new Map([
    ["1", { type: "Feature", properties: { id: "1" }, geometry: { type: "Polygon", coordinates: [] } }],
    ["3", { type: "Feature", properties: { id: "3" }, geometry: { type: "Polygon", coordinates: [] } }],
  ]);
  const rendered = buildSpecialZoneRenderFeatures(serialized, featureById);
  assert.equal(rendered.features.length, 2);
  assert.deepEqual(rendered.features.map((feature) => feature.properties.sourceFeatureId), ["1", "3"]);
  assert.equal(rendered.features[0].properties.__specialZoneLayerId, "neutral");
});

test("style preset updates preserve members and replace mode keeps one explicit set", () => {
  let state = createEmptySpecialZoneLayersState();
  state = mutateSpecialZoneLayersState(state, {
    action: "addLayer",
    layer: createLayerFromPreset("custom", { id: "active", memberFeatureIds: ["2", "1"] }),
  });

  const disputed = SPECIAL_ZONE_PRESETS.find((preset) => preset.id === "disputed");
  state = mutateSpecialZoneLayersState(state, {
    action: "updateLayer",
    layerId: "active",
    patch: {
      presetId: "custom",
      category: "custom",
      style: { fill: "#112233", revision: 10 },
    },
  });

  let layer = state.layers.find((entry) => entry.id === "active");
  assert.equal(layer.presetId, "custom");
  assert.equal(layer.category, "custom");
  assert.deepEqual(layer.memberFeatureIds, ["1", "2"]);

  state = mutateSpecialZoneLayersState(state, {
    action: "updateLayer",
    layerId: "active",
    patch: {
      presetId: disputed.id,
      category: disputed.category,
      style: { ...disputed.style, revision: 9 },
    },
  });

  layer = state.layers.find((entry) => entry.id === "active");
  assert.equal(layer.presetId, "disputed");
  assert.equal(layer.style.fill, disputed.style.fill);
  assert.deepEqual(layer.memberFeatureIds, ["1", "2"]);

  state = updateSpecialZoneLayerMembership(state, "active", "9", "replace");
  layer = state.layers.find((entry) => entry.id === "active");
  assert.deepEqual(layer.memberFeatureIds, ["9"]);
});
