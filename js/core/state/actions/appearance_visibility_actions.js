import { getAppearancePresetLayerVisibilityFields } from "../appearance_preset_state.js";

const APPEARANCE_STRING_VISIBILITY_KEYS = Object.freeze(["strategicChoroplethMetric"]);

export const APPEARANCE_VISIBILITY_KEYS = Object.freeze([
  ...new Set([
    ...getAppearancePresetLayerVisibilityFields(),
    "showBlankFeatureLabels",
    "parentBordersVisible",
  ]),
]);
function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("[appearance_visibility_actions] target must be an object");
}
function assertKey(key) { if (!APPEARANCE_VISIBILITY_KEYS.includes(key)) throw new RangeError(`[appearance_visibility_actions] unknown key: ${key}`); }
function normalizeValue(key, value) {
  return APPEARANCE_STRING_VISIBILITY_KEYS.includes(key) ? String(value || "") : Boolean(value);
}
export function setAppearanceVisibilityState(target, key, value) {
  assertTarget(target);
  let admitted = false;
  for (const candidate of APPEARANCE_VISIBILITY_KEYS) {
    if (candidate === key) admitted = true;
  }
  if (!admitted) throw new RangeError(`[appearance_visibility_actions] unknown key: ${key}`);
  const next = key === "strategicChoroplethMetric" ? String(value || "") : Boolean(value);
  target[key] = next;
  return next;
}
export function patchAppearanceVisibilityState(target, patch) {
  assertTarget(target); if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new TypeError("[appearance_visibility_actions] patch must be an object");
  const entries = Object.entries(patch);
  entries.forEach(([key]) => assertKey(key));
  for (const [key, value] of entries) target[key] = normalizeValue(key, value);
  return target;
}
