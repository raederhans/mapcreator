import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultAppearancePresetsState } from "../js/core/state.js";
import { applyAppearancePresetState, setAppearancePresetsState, normalizeAppearancePresetsIntoState, upsertAppearancePresetState, deleteAppearancePresetState, mergeAppearancePresetImportPayloadState, selectAppearancePresetState } from "../js/core/state/actions/appearance_preset_actions.js";

test("appearance preset actions use canonical pure helpers", () => {
  const target = { appearancePresets: createDefaultAppearancePresetsState() };
  const preset = { id: "demo", name: "Demo", snapshot: { styleConfig: {}, layerVisibility: {}, intensityFields: {} } };
  upsertAppearancePresetState(target, preset);
  assert.equal(target.appearancePresets.byId.demo.name, "Demo");
  deleteAppearancePresetState(target, "demo");
  normalizeAppearancePresetsIntoState(target);
  assert.equal(setAppearancePresetsState(target, target.appearancePresets), target.appearancePresets);
});

test("preset selection action normalizes, copies, and commits without exposing a live record", () => {
  const target = {
    appearancePresets: {
      byId: {
        first: { id: "first", name: "First", snapshot: { styleConfig: {}, layerVisibility: {}, intensityFields: {} } },
        second: { id: "second", name: "Second", snapshot: { styleConfig: {}, layerVisibility: {}, intensityFields: {} } },
      },
      order: ["first", "second"],
      selectedPresetId: "first",
    },
  };
  const previous = target.appearancePresets;

  const selected = selectAppearancePresetState(target, "second");

  assert.notEqual(selected, previous);
  assert.equal(target.appearancePresets, selected);
  assert.equal(selected.selectedPresetId, "second");
  assert.equal(previous.selectedPresetId, "first");
});

test("preset apply action preserves canonical style visibility intensity order contract", () => {
  const target = { styleConfig: {}, layerVisibility: {}, intensityFields: {} };
  const snapshot = { styleConfig: { ocean: { fillColor: "#123456" } }, layerVisibility: { showUrban: false }, intensityFields: {} };
  const result = applyAppearancePresetState(target, snapshot);
  assert.equal(result.styleConfig.ocean.fillColor, "#123456");
  assert.equal(target.showUrban, false);
  assert.ok(target.intensityFields);
});

test("preset apply action owns detached style, visibility, and intensity commits", () => {
  const styleConfig = { ocean: { fillColor: "#123456" } };
  const layerVisibility = { showUrban: false, showPhysical: true };
  const intensityFields = {};
  const target = { styleConfig: {}, intensityFields: {} };

  applyAppearancePresetState(target, { styleConfig, layerVisibility, intensityFields });

  assert.notEqual(target.styleConfig, styleConfig);
  assert.equal(target.showUrban, false);
  assert.equal(target.showPhysical, true);
  assert.notEqual(target.intensityFields, intensityFields);
});

test("preset actions reject an invalid target before reading caller input", () => {
  let reads = 0;
  const input = Object.defineProperty({}, "snapshot", {
    enumerable: true,
    get() {
      reads += 1;
      return {};
    },
  });

  assert.throws(() => upsertAppearancePresetState(null, input), /target must be an object/);
  assert.throws(() => mergeAppearancePresetImportPayloadState(null, input), /target must be an object/);
  assert.throws(() => applyAppearancePresetState(null, input), /target must be an object/);
  assert.equal(reads, 0);
});
