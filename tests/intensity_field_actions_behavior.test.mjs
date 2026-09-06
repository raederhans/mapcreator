import test from "node:test";
import assert from "node:assert/strict";
import { createIntensityFieldsState } from "../js/core/intensity_field.js";
import { normalizeIntensityFieldsIntoState, setIntensityFieldToolState, updateIntensityFieldChannelState } from "../js/core/state/actions/intensity_field_actions.js";

test("intensity actions preserve runtime field identity and revision semantics", () => {
  const target = { intensityFields: createIntensityFieldsState() };
  normalizeIntensityFieldsIntoState(target);
  const identity = target.intensityFields;
  const revision = target.intensityFields.channels.urbanGlow.revision;
  updateIntensityFieldChannelState(target, "urbanGlow", (channel) => { channel.enabled = true; });
  assert.equal(target.intensityFields, identity);
  assert.equal(target.intensityFields.channels.urbanGlow.revision, revision + 1);
  const tool = { active: true, channelId: "urbanGlow" };
  assert.equal(setIntensityFieldToolState(target, tool), tool);
});
