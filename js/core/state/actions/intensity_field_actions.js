import { normalizeIntensityFieldsState, updateIntensityFieldChannel } from "../intensity_field_state.js";

function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("[intensity_field_actions] target must be an object");
}
export function setIntensityFieldsState(target, value) { assertTarget(target); target.intensityFields = value; return value; }
export function normalizeIntensityFieldsIntoState(target) { assertTarget(target); return setIntensityFieldsState(target, normalizeIntensityFieldsState(target.intensityFields)); }
export function updateIntensityFieldChannelState(target, channelId, mutate) {
  assertTarget(target);
  const normalizedChannelId = String(channelId || "");
  const detachedMutate = typeof mutate === "function"
    ? (channel, fields) => mutate(channel, fields)
    : null;
  return setIntensityFieldsState(target, updateIntensityFieldChannel(target.intensityFields, normalizedChannelId, detachedMutate));
}
export function setIntensityFieldToolState(target, value) { assertTarget(target); target.intensityFieldTool = value; return value; }
