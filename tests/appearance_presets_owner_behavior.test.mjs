import assert from "node:assert/strict";
import test from "node:test";

import { createAppearancePresetsOwner } from "../js/ui/toolbar/appearance_presets_owner.js";
import {
  createDefaultAppearancePresetsState,
  createIntensityFieldsState,
  sampleIntensityField,
  updateIntensityFieldChannel,
} from "../js/core/state.js";

class TestElement {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.disabled = false;
    this.files = [];
    this.listeners = new Map();
    this.placeholder = "";
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) {
      handler({
        target: this,
        ...event,
      });
    }
  }
}

function createHarness() {
  const nodes = {
    nameInput: new TestElement(),
    select: new TestElement(),
    saveButton: new TestElement(),
    applyButton: new TestElement(),
    deleteButton: new TestElement(),
    exportButton: new TestElement(),
    importButton: new TestElement(),
    importInput: new TestElement(),
    summary: new TestElement(),
    list: new TestElement(),
  };
  const dirtyReasons = [];
  const afterApplyCalls = [];
  const historyEntries = [];
  const runtimeState = {
    appearancePresets: createDefaultAppearancePresetsState(),
    styleConfig: {
      ocean: {
        fillColor: "#224466",
      },
    },
    showUrban: false,
    showPhysical: true,
    showRivers: false,
    intensityFields: updateIntensityFieldChannel(
      createIntensityFieldsState(),
      "urbanGlow",
      (channel) => {
        channel.enabled = true;
        channel.points = [{ id: "glow", lon: 139.7, lat: 35.7, strength: 1.7, radiusDeg: 6 }];
      },
    ),
  };
  const owner = createAppearancePresetsOwner({
    runtimeState,
    nodes,
    t: (value) => value,
    renderDirty: (reason) => dirtyReasons.push(reason),
    captureHistoryState: (request) => ({ request, presetCount: runtimeState.appearancePresets.order.length }),
    pushHistoryEntry: (entry) => {
      historyEntries.push(entry);
      return true;
    },
    documentRef: {
      createElement: (tag) => ({ tag, textContent: "", value: "" }),
      body: { appendChild: () => {} },
    },
    afterApply: (preset) => afterApplyCalls.push(preset.id),
    now: () => Date.UTC(2026, 5, 12),
  });
  return { afterApplyCalls, dirtyReasons, historyEntries, nodes, owner, runtimeState };
}

test("appearance presets owner saves current appearance and applies selected preset", () => {
  const harness = createHarness();

  harness.nodes.nameInput.value = "Glow";
  const preset = harness.owner.saveCurrentAppearancePreset();

  assert.equal(preset.name, "Glow");
  assert.deepEqual(harness.runtimeState.appearancePresets.order, [preset.id]);
  assert.equal(harness.historyEntries[0].meta.kind, "appearance-preset-save");
  assert.equal(harness.dirtyReasons[0], "appearance-preset-save");

  harness.runtimeState.styleConfig.ocean.fillColor = "#abcdef";
  harness.runtimeState.showUrban = true;
  harness.runtimeState.intensityFields = createIntensityFieldsState();

  assert.equal(harness.owner.applySelectedAppearancePreset(), true);
  assert.equal(harness.runtimeState.styleConfig.ocean.fillColor, "#224466");
  assert.equal(harness.runtimeState.showUrban, false);
  assert.ok(sampleIntensityField(harness.runtimeState.intensityFields, "urbanGlow", 139.7, 35.7) > 1.4);
  assert.equal(harness.historyEntries[1].meta.kind, "appearance-preset-apply");
  assert.deepEqual(harness.afterApplyCalls, [preset.id]);
});

test("appearance presets owner imports and deletes presets through one top-level state field", () => {
  const harness = createHarness();
  const imported = {
    kind: "appearance-preset",
    preset: {
      id: "imported",
      name: "Imported",
      snapshot: {
        styleConfig: { ocean: { fillColor: "#112233" } },
        layerVisibility: { showUrban: true },
        intensityFields: createIntensityFieldsState(),
      },
    },
  };

  harness.owner.importAppearancePresetPayload(imported);

  assert.equal(harness.runtimeState.appearancePresets.byId.imported.name, "Imported");
  assert.equal(harness.runtimeState.appearancePresets.selectedPresetId, "imported");
  assert.equal(harness.owner.deleteSelectedAppearancePreset(), true);
  assert.equal(harness.runtimeState.appearancePresets.byId.imported, undefined);
});
