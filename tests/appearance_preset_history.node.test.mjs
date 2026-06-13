import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAppearancePresetToRuntimeState,
  createAppearancePresetFromRuntimeState,
  createDefaultAppearancePresetsState,
  createIntensityFieldsState,
  sampleIntensityField,
  state,
  updateIntensityFieldChannel,
  upsertAppearancePreset,
} from "../js/core/state.js";
import {
  createDefaultStyleConfig,
} from "../js/core/state/ui_state.js";
import {
  captureHistoryState,
  clearHistory,
  pushHistoryEntry,
  redoHistory,
  undoHistory,
} from "../js/core/history_manager.js";

function resetRuntimeAppearance() {
  globalThis.document = {
    getElementById: () => null,
  };
  clearHistory();
  state.appearancePresets = createDefaultAppearancePresetsState();
  state.styleConfig = createDefaultStyleConfig();
  state.showUrban = true;
  state.showPhysical = true;
  state.showRivers = true;
  state.showTransport = true;
  state.showStrategicResourceMarkers = false;
  state.strategicChoroplethMetric = "";
  state.intensityFields = createIntensityFieldsState();
}

function createPresetRuntime() {
  return {
    styleConfig: {
      ocean: {
        fillColor: "#112233",
      },
    },
    showUrban: false,
    showPhysical: true,
    showRivers: false,
    showTransport: true,
    showStrategicResourceMarkers: true,
    strategicChoroplethMetric: "steel",
    intensityFields: updateIntensityFieldChannel(
      createIntensityFieldsState(),
      "urbanGlow",
      (channel) => {
        channel.enabled = true;
        channel.points = [{ id: "glow", lon: 139.7, lat: 35.7, strength: 1.8, radiusDeg: 5 }];
      },
    ),
  };
}

test("history undo and redo restore appearance preset library changes", () => {
  resetRuntimeAppearance();
  const before = captureHistoryState({ appearancePresets: true });
  const preset = createAppearancePresetFromRuntimeState(createPresetRuntime(), {
    id: "history-preset",
    name: "History Preset",
    now: Date.UTC(2026, 5, 12),
  });
  state.appearancePresets = upsertAppearancePreset(state.appearancePresets, preset);
  const after = captureHistoryState({ appearancePresets: true });

  assert.equal(pushHistoryEntry({ before, after, meta: { kind: "appearance-preset-save" } }), true);
  assert.equal(state.appearancePresets.byId["history-preset"].name, "History Preset");

  assert.equal(undoHistory(), true);
  assert.equal(state.appearancePresets.byId["history-preset"], undefined);

  assert.equal(redoHistory(), true);
  assert.equal(state.appearancePresets.byId["history-preset"].name, "History Preset");
});

test("history undo and redo restore applied appearance style, visibility, and intensity fields", () => {
  resetRuntimeAppearance();
  const preset = createAppearancePresetFromRuntimeState(createPresetRuntime(), {
    id: "history-preset",
    name: "History Preset",
    now: Date.UTC(2026, 5, 12),
  });
  const before = captureHistoryState({ appearanceState: true });
  applyAppearancePresetToRuntimeState(state, preset);
  const after = captureHistoryState({ appearanceState: true });

  assert.equal(pushHistoryEntry({ before, after, meta: { kind: "appearance-preset-apply" } }), true);
  assert.equal(state.styleConfig.ocean.fillColor, "#112233");
  assert.equal(state.showUrban, false);
  assert.equal(state.showStrategicResourceMarkers, true);
  assert.equal(state.strategicChoroplethMetric, "steel");
  assert.ok(sampleIntensityField(state.intensityFields, "urbanGlow", 139.7, 35.7) > 1.4);

  assert.equal(undoHistory(), true);
  assert.equal(state.styleConfig.ocean.fillColor, "#aadaff");
  assert.equal(state.showUrban, true);
  assert.equal(state.showStrategicResourceMarkers, false);
  assert.equal(state.strategicChoroplethMetric, "");
  assert.equal(sampleIntensityField(state.intensityFields, "urbanGlow", 139.7, 35.7), 1);

  assert.equal(redoHistory(), true);
  assert.equal(state.styleConfig.ocean.fillColor, "#112233");
  assert.equal(state.showUrban, false);
  assert.equal(state.showStrategicResourceMarkers, true);
  assert.equal(state.strategicChoroplethMetric, "steel");
  assert.ok(sampleIntensityField(state.intensityFields, "urbanGlow", 139.7, 35.7) > 1.4);
});
