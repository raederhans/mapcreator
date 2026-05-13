import {
  normalizeScenarioOceanFillColor,
} from "./pure_helpers.js";
import {
  STATE_BUS_EVENTS,
  emitStateBusEvent,
} from "../state/index.js";

function emitScenarioToolbarInputUpdate() {
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_TOOLBAR_INPUTS);
}

function createScenarioOceanFillRestoreRuntime({
  state,
  invalidateOceanBackgroundVisualState = null,
} = {}) {
  function getScenarioOceanFillOverride(manifest) {
    const rawValue = String(manifest?.style_defaults?.ocean?.fillColor || "").trim();
    return rawValue ? normalizeScenarioOceanFillColor(rawValue, "") : "";
  }

  function getScenarioOceanStyleOverride(manifest) {
    const oceanDefaults = manifest?.style_defaults?.ocean;
    if (!oceanDefaults || typeof oceanDefaults !== "object") {
      return null;
    }
    const override = {};
    const fillColor = getScenarioOceanFillOverride(manifest);
    if (fillColor) {
      override.fillColor = fillColor;
    }
    const preset = String(oceanDefaults.preset || "").trim();
    if (preset) {
      override.preset = preset;
    }
    if (Object.prototype.hasOwnProperty.call(oceanDefaults, "experimentalAdvancedStyles")) {
      override.experimentalAdvancedStyles = oceanDefaults.experimentalAdvancedStyles === true;
    }
    return Object.keys(override).length ? override : null;
  }

  function updateScenarioOceanFill(fillColor, reason) {
    if (!state.styleConfig || typeof state.styleConfig !== "object") {
      state.styleConfig = {};
    }
    if (!state.styleConfig.ocean || typeof state.styleConfig.ocean !== "object") {
      state.styleConfig.ocean = {};
    }
    const previousFill = normalizeScenarioOceanFillColor(state.styleConfig.ocean.fillColor);
    const nextFill = normalizeScenarioOceanFillColor(fillColor);
    state.styleConfig.ocean.fillColor = nextFill;
    if (previousFill !== nextFill && typeof invalidateOceanBackgroundVisualState === "function") {
      invalidateOceanBackgroundVisualState(reason);
      return true;
    }
    return previousFill !== nextFill;
  }

  function updateScenarioOceanStyle(styleOverride, reason) {
    if (!styleOverride || typeof styleOverride !== "object") {
      return false;
    }
    if (!state.styleConfig || typeof state.styleConfig !== "object") {
      state.styleConfig = {};
    }
    if (!state.styleConfig.ocean || typeof state.styleConfig.ocean !== "object") {
      state.styleConfig.ocean = {};
    }
    const previous = JSON.stringify({
      fillColor: normalizeScenarioOceanFillColor(state.styleConfig.ocean.fillColor),
      preset: String(state.styleConfig.ocean.preset || ""),
      experimentalAdvancedStyles: state.styleConfig.ocean.experimentalAdvancedStyles === true,
    });
    Object.entries(styleOverride).forEach(([key, value]) => {
      state.styleConfig.ocean[key] = value;
    });
    const next = JSON.stringify({
      fillColor: normalizeScenarioOceanFillColor(state.styleConfig.ocean.fillColor),
      preset: String(state.styleConfig.ocean.preset || ""),
      experimentalAdvancedStyles: state.styleConfig.ocean.experimentalAdvancedStyles === true,
    });
    if (previous !== next && typeof invalidateOceanBackgroundVisualState === "function") {
      invalidateOceanBackgroundVisualState(reason);
      return true;
    }
    return previous !== next;
  }

  function syncScenarioOceanFillForActivation(manifest) {
    const nextOverride = getScenarioOceanStyleOverride(manifest);
    const previousOverride = getScenarioOceanStyleOverride(state.activeScenarioManifest);
    if (!state.scenarioOceanStyleBeforeActivate) {
      state.scenarioOceanStyleBeforeActivate = {
        ...(state.styleConfig?.ocean || {}),
      };
    }
    if (state.scenarioOceanFillBeforeActivate === null) {
      state.scenarioOceanFillBeforeActivate = normalizeScenarioOceanFillColor(state.styleConfig?.ocean?.fillColor);
    }
    if (nextOverride) {
      updateScenarioOceanStyle(nextOverride, "scenario-ocean-fill-activate");
    } else if (previousOverride && state.scenarioOceanFillBeforeActivate !== null) {
      updateScenarioOceanStyle(
        state.scenarioOceanStyleBeforeActivate || { fillColor: state.scenarioOceanFillBeforeActivate },
        "scenario-ocean-fill-restore-baseline"
      );
    }
    emitScenarioToolbarInputUpdate();
  }

  function restoreScenarioOceanFillAfterExit() {
    if (state.scenarioOceanFillBeforeActivate === null) {
      return;
    }
    updateScenarioOceanStyle(
      state.scenarioOceanStyleBeforeActivate || { fillColor: state.scenarioOceanFillBeforeActivate },
      "scenario-ocean-fill-clear"
    );
    state.scenarioOceanFillBeforeActivate = null;
    state.scenarioOceanStyleBeforeActivate = null;
    emitScenarioToolbarInputUpdate();
  }

  return {
    getScenarioOceanFillOverride,
    restoreScenarioOceanFillAfterExit,
    syncScenarioOceanFillForActivation,
    updateScenarioOceanFill,
  };
}

export {
  createScenarioOceanFillRestoreRuntime,
};
