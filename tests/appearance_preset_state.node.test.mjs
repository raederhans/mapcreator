import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAppearancePresetToRuntimeState,
  buildAppearancePresetExportPayload,
  createAppearancePresetFromRuntimeState,
  createDefaultAppearancePresetsState,
  createIntensityFieldsState,
  deleteAppearancePreset,
  mergeAppearancePresetImportPayload,
  sampleIntensityField,
  upsertAppearancePreset,
  updateIntensityFieldChannel,
} from "../js/core/state.js";

function createRuntimeAppearanceState() {
  const intensityFields = updateIntensityFieldChannel(
    createIntensityFieldsState(),
    "urbanGlow",
    (channel) => {
      channel.enabled = true;
      channel.revision = 3;
      channel.points = [{
        id: "metro-glow",
        lon: 139.7,
        lat: 35.7,
        strength: 1.65,
        radiusDeg: 6,
        falloff: "smooth",
      }];
    },
  );
  return {
    styleConfig: {
      ocean: {
        fillColor: "#123456",
        opacity: 0.66,
      },
      urban: {
        mode: "manual",
        color: "#445566",
        fillOpacity: 0.48,
      },
    },
    showUrban: false,
    showPhysical: true,
    showRivers: false,
    showTransport: true,
    showAirports: true,
    referenceImageState: {
      dataUrl: "data:image/png;base64,private",
    },
    intensityFields,
  };
}

test("appearance preset snapshots style, layer visibility, and intensity fields without private reference image data", () => {
  const preset = createAppearancePresetFromRuntimeState(createRuntimeAppearanceState(), {
    id: "night-glow",
    name: "Night Glow",
    now: Date.UTC(2026, 5, 12),
  });

  assert.equal(preset.id, "night-glow");
  assert.equal(preset.name, "Night Glow");
  assert.equal(preset.snapshot.styleConfig.ocean.fillColor, "#123456");
  assert.equal(preset.snapshot.layerVisibility.showUrban, false);
  assert.equal(preset.snapshot.layerVisibility.showAirports, true);
  assert.ok(sampleIntensityField(preset.snapshot.intensityFields, "urbanGlow", 139.7, 35.7) > 1.4);
  assert.equal(Object.hasOwn(preset.snapshot, "referenceImageState"), false);
});

test("appearance preset applies a full appearance snapshot to runtime state", () => {
  const preset = createAppearancePresetFromRuntimeState(createRuntimeAppearanceState(), {
    id: "night-glow",
    name: "Night Glow",
    now: Date.UTC(2026, 5, 12),
  });
  const target = {
    styleConfig: {},
    showUrban: true,
    showPhysical: false,
    showRivers: true,
    showAirports: false,
    intensityFields: createIntensityFieldsState(),
  };

  applyAppearancePresetToRuntimeState(target, preset);

  assert.equal(target.styleConfig.ocean.fillColor, "#123456");
  assert.equal(target.styleConfig.urban.color, "#445566");
  assert.equal(target.showUrban, false);
  assert.equal(target.showPhysical, true);
  assert.equal(target.showRivers, false);
  assert.equal(target.showAirports, true);
  assert.ok(sampleIntensityField(target.intensityFields, "urbanGlow", 139.7, 35.7) > 1.4);
});

test("appearance preset library upserts, deletes, and imports exported presets", () => {
  const first = createAppearancePresetFromRuntimeState(createRuntimeAppearanceState(), {
    id: "first",
    name: "First",
    now: Date.UTC(2026, 5, 12),
  });
  const second = createAppearancePresetFromRuntimeState({
    ...createRuntimeAppearanceState(),
    showUrban: true,
  }, {
    id: "second",
    name: "Second",
    now: Date.UTC(2026, 5, 13),
  });

  let library = createDefaultAppearancePresetsState();
  library = upsertAppearancePreset(library, first);
  library = upsertAppearancePreset(library, second);

  assert.deepEqual(library.order, ["first", "second"]);
  assert.equal(library.selectedPresetId, "second");

  library = deleteAppearancePreset(library, "second");

  assert.deepEqual(library.order, ["first"]);
  assert.equal(library.selectedPresetId, "first");

  const imported = mergeAppearancePresetImportPayload(library, buildAppearancePresetExportPayload(second));

  assert.deepEqual(imported.order, ["first", "second"]);
  assert.equal(imported.byId.second.name, "Second");
});
