import { normalizeReferenceImageState } from "../ui_state.js";

function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("[appearance_reference_actions] target must be an object");
}
export function setReferenceImageState(target, value, { clamp } = {}) {
  assertTarget(target);
  target.referenceImageState = normalizeReferenceImageState(value, { clamp });
  return target.referenceImageState;
}
export function patchReferenceImageState(target, patch, { clamp } = {}) {
  assertTarget(target);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new TypeError("[appearance_reference_actions] patch must be an object");
  return setReferenceImageState(target, { ...(target.referenceImageState || {}), ...patch }, { clamp });
}
export function setReferenceImageUrlState(target, value = null) { assertTarget(target); target.referenceImageUrl = value; return value; }
