import {
  buildRestoredAppearancePresetIntensityFields,
  deleteAppearancePreset,
  mergeAppearancePresetImportPayload,
  normalizeAppearancePresetSnapshot,
  normalizeAppearancePresetsState,
  upsertAppearancePreset,
} from "../appearance_preset_state.js";
import { setAppearanceStyleConfigState } from "./appearance_actions.js";
import { patchAppearanceVisibilityState } from "./appearance_visibility_actions.js";
import { setIntensityFieldsState } from "./intensity_field_actions.js";

function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("[appearance_preset_actions] target must be an object");
}
export function setAppearancePresetsState(target, value) { assertTarget(target); target.appearancePresets = value; return value; }
export function normalizeAppearancePresetsIntoState(target) { assertTarget(target); return setAppearancePresetsState(target, normalizeAppearancePresetsState(target.appearancePresets)); }
export function upsertAppearancePresetState(target, preset) { assertTarget(target); return setAppearancePresetsState(target, upsertAppearancePreset(target.appearancePresets, preset)); }
export function deleteAppearancePresetState(target, presetId) { assertTarget(target); return setAppearancePresetsState(target, deleteAppearancePreset(target.appearancePresets, presetId)); }
export function mergeAppearancePresetImportPayloadState(target, payload) { assertTarget(target); return setAppearancePresetsState(target, mergeAppearancePresetImportPayload(target.appearancePresets, payload)); }
// The canonical helper owns the restore order: style, visibility, then intensity fields.
export function applyAppearancePresetState(target, presetOrSnapshot) {
  assertTarget(target);
  const snapshot = normalizeAppearancePresetSnapshot(presetOrSnapshot);
  setAppearanceStyleConfigState(target, snapshot.styleConfig);
  patchAppearanceVisibilityState(target, {
    ...snapshot.layerVisibility,
    showBlankFeatureLabels: false,
  });
  setIntensityFieldsState(
    target,
    buildRestoredAppearancePresetIntensityFields(
      target.intensityFields,
      snapshot.intensityFields,
    ),
  );
  return snapshot;
}
