import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultAppearancePresetsState } from "../js/core/state.js";
import { applyAppearancePresetState, setAppearancePresetsState, normalizeAppearancePresetsIntoState, upsertAppearancePresetState, deleteAppearancePresetState } from "../js/core/state/actions/appearance_preset_actions.js";

test("appearance preset actions use canonical pure helpers", () => {
  const target = { appearancePresets: createDefaultAppearancePresetsState() };
  const preset = { id: "demo", name: "Demo", snapshot: { styleConfig: {}, layerVisibility: {}, intensityFields: {} } };
  upsertAppearancePresetState(target, preset);
  assert.equal(target.appearancePresets.byId.demo.name, "Demo");
  deleteAppearancePresetState(target, "demo");
  normalizeAppearancePresetsIntoState(target);
  assert.equal(setAppearancePresetsState(target, target.appearancePresets), target.appearancePresets);
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
