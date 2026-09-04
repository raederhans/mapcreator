import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createAppearancePresetFromRuntimeState,
  createDefaultAppearancePresetsState,
  createIntensityFieldsState,
  sampleIntensityField,
  state,
  updateIntensityFieldChannel,
  upsertAppearancePreset,
} from "../js/core/state.js";
import { applyAppearancePresetState } from "../js/core/state/actions/appearance_preset_actions.js";
import { normalizeSpecialZoneLayersState } from "../js/core/special_zone_layers.js";
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
  applyAppearancePresetState(state, preset);
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

test("history undo and redo restore strategic overlay and special-zone snapshot state through actions", () => {
  resetRuntimeAppearance();
  state.annotationView = { zoom: 2, center: [10, 20] };
  state.operationalLines = [{ id: "line-before", points: [[1, 2], [3, 4]] }];
  state.operationGraphics = [{ id: "graphic-before", points: [[5, 6]] }];
  state.unitCounters = [{ id: "counter-before", anchor: [7, 8] }];
  state.specialZoneLayers = normalizeSpecialZoneLayersState({ topologyFingerprint: "before" });
  state.specialZoneMembershipBrushMode = "add";
  const before = captureHistoryState({ strategicOverlay: true });

  state.annotationView = { zoom: 5, center: [30, 40] };
  state.operationalLines = [{ id: "line-after", points: [[11, 12], [13, 14]] }];
  state.operationGraphics = [{ id: "graphic-after", points: [[15, 16]] }];
  state.unitCounters = [{ id: "counter-after", anchor: [17, 18] }];
  state.specialZoneLayers = normalizeSpecialZoneLayersState({ topologyFingerprint: "after" });
  state.specialZoneMembershipBrushMode = "remove";
  const after = captureHistoryState({ strategicOverlay: true });

  assert.equal(pushHistoryEntry({ before, after, meta: { kind: "strategic-overlay-edit" } }), true);
  Object.assign(state, {
    frontlineOverlayDirty: false,
    operationalLinesDirty: false,
    operationGraphicsDirty: false,
    unitCountersDirty: false,
    specialZonesOverlayDirty: false,
  });

  assert.equal(undoHistory(), true);
  assert.deepEqual(state.annotationView, before.annotationView);
  assert.deepEqual(state.operationalLines, before.operationalLines);
  assert.deepEqual(state.operationGraphics, before.operationGraphics);
  assert.deepEqual(state.unitCounters, before.unitCounters);
  assert.deepEqual(state.specialZoneLayers, before.specialZoneLayers);
  assert.equal(state.specialZoneMembershipBrushMode, before.specialZoneMembershipBrushMode);
  assert.equal(state.frontlineOverlayDirty, true);
  assert.equal(state.operationalLinesDirty, true);
  assert.equal(state.operationGraphicsDirty, true);
  assert.equal(state.unitCountersDirty, true);
  assert.equal(state.specialZonesOverlayDirty, true);

  Object.assign(state, {
    frontlineOverlayDirty: false,
    operationalLinesDirty: false,
    operationGraphicsDirty: false,
    unitCountersDirty: false,
    specialZonesOverlayDirty: false,
  });
  assert.equal(redoHistory(), true);
  assert.deepEqual(state.annotationView, after.annotationView);
  assert.deepEqual(state.operationalLines, after.operationalLines);
  assert.deepEqual(state.operationGraphics, after.operationGraphics);
  assert.deepEqual(state.unitCounters, after.unitCounters);
  assert.deepEqual(state.specialZoneLayers, after.specialZoneLayers);
  assert.equal(state.specialZoneMembershipBrushMode, after.specialZoneMembershipBrushMode);
  assert.equal(state.frontlineOverlayDirty, true);
  assert.equal(state.operationalLinesDirty, true);
  assert.equal(state.operationGraphicsDirty, true);
  assert.equal(state.unitCountersDirty, true);
  assert.equal(state.specialZonesOverlayDirty, true);

  const historySource = readFileSync(new URL("../js/core/history_manager.js", import.meta.url), "utf8");
  assert.match(historySource, /restoreStrategicOverlaySnapshotState\(runtimeState, snapshot\)/);
  assert.match(historySource, /restoreSpecialZoneSnapshotState\(runtimeState, snapshot\)/);
  assert.doesNotMatch(
    historySource,
    /runtimeState\.(?:operationalLines|operationGraphics|unitCounters|specialZoneLayers|specialZoneMembershipBrushMode|frontlineOverlayDirty|operationalLinesDirty|operationGraphicsDirty|unitCountersDirty)\s*=/,
  );
});
