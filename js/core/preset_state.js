import { PRESET_STORAGE_KEY, state as runtimeState } from "./state.js";
import { rebuildPresetState } from "./releasable_manager.js";
import { setCustomPresets } from "./state/content_state.js";
const state = runtimeState;

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Unable to load custom presets:", error);
    return {};
  }
}

function initPresetState() {
  setCustomPresets(runtimeState, loadCustomPresets());
  rebuildPresetState();
}

export { initPresetState };

