import assert from "node:assert/strict";
import test from "node:test";

import {
  bakeIntensityComposite,
  createIntensityFieldsState,
  extractFieldRectPatch,
  sampleIntensityField,
  stampIntensityBrush,
} from "../js/core/intensity_field.js";
import {
  normalizeIntensityFieldsState,
  serializeIntensityFieldsState,
  updateIntensityFieldChannel,
} from "../js/core/state/intensity_field_state.js";

test("intensity field samples neutral when disabled and weighted when enabled", () => {
  let fields = createIntensityFieldsState();

  assert.equal(sampleIntensityField(fields, "physicalAtlas", 0, 0), 1);

  fields = updateIntensityFieldChannel(fields, "physicalAtlas", (channel) => {
    channel.enabled = true;
    channel.points = [
      { id: "alps", lon: 10, lat: 46, strength: 1.8, radiusDeg: 8, falloff: "smooth" },
    ];
  });

  assert.ok(sampleIntensityField(fields, "physicalAtlas", 10, 46) > 1.5);
  assert.equal(sampleIntensityField(fields, "physicalAtlas", -120, -30), 1);
});

test("intensity brush writes grid values and patch extraction captures the dirty rect", () => {
  const fields = createIntensityFieldsState();
  const channel = fields.channels.physicalContour;

  const rect = stampIntensityBrush(channel, {
    lon: 0,
    lat: 0,
    radiusDeg: 2,
    strength: 1.6,
  });
  bakeIntensityComposite(channel);

  assert.ok(rect.width > 0);
  assert.ok(rect.height > 0);
  assert.ok(sampleIntensityField({ channels: { physicalContour: { ...channel, enabled: true } } }, "physicalContour", 0, 0) > 1.2);

  const patch = extractFieldRectPatch(channel, rect);
  assert.equal(patch.values.length, rect.width * rect.height);
});

test("intensity field serialization roundtrips enabled channels and points", () => {
  const fields = updateIntensityFieldChannel(createIntensityFieldsState(), "physicalAtlas", (channel) => {
    channel.enabled = true;
    channel.points = [
      { id: "ridge", lon: 4, lat: 44, strength: 0.65, radiusDeg: 6, falloff: "linear" },
    ];
  });

  const serialized = serializeIntensityFieldsState(fields);
  const restored = normalizeIntensityFieldsState(serialized);

  assert.equal(restored.channels.physicalAtlas.enabled, true);
  assert.equal(restored.channels.physicalAtlas.points[0].id, "ridge");
  assert.ok(sampleIntensityField(restored, "physicalAtlas", 4, 44) < 0.9);
});

test("intensity field serialization preserves zero-strength grid cells", () => {
  const fields = updateIntensityFieldChannel(createIntensityFieldsState(), "physicalAtlas", (channel) => {
    channel.enabled = true;
    channel.grid.base[0] = 0;
  });

  const restored = normalizeIntensityFieldsState(serializeIntensityFieldsState(fields));

  assert.equal(restored.channels.physicalAtlas.grid.base[0], 0);
  assert.equal(restored.channels.physicalAtlas.grid.composite[0], 0);
});

test("intensity field serialization keeps neutral grid cells exact", () => {
  const restored = normalizeIntensityFieldsState(serializeIntensityFieldsState(createIntensityFieldsState()));

  assert.equal(restored.channels.physicalAtlas.grid.base[0], 1);
  assert.equal(restored.channels.physicalAtlas.grid.composite[0], 1);
  assert.ok(restored.channels.physicalAtlas.grid.base.every((value) => value === 1));
});
