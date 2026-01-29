// Shared map logic helpers (Phase 13)
import { state, countryPalette, defaultCountryPalette } from "./state.js";
import { invalidateBorderCache } from "./map_renderer.js";

function getCountryCode(feature) {
  const code =
    feature.properties?.cntr_code ||
    feature.properties?.CNTR_CODE ||
    feature.properties?.CNTR ||
    "";
  return code ? String(code).toUpperCase() : "";
}

function applyCountryColor(code, color) {
  if (!state.landData) return;
  const target = String(code || "").toUpperCase();
  if (!target) return;
  for (const feature of state.landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    if (!id) continue;
    if (getCountryCode(feature) !== target) continue;
    state.colors[id] = color;
  }
  invalidateBorderCache();
  if (typeof globalThis.renderApp === "function") {
    globalThis.renderApp();
  }
}

function resetCountryColors() {
  Object.keys(defaultCountryPalette).forEach((code) => {
    countryPalette[code] = defaultCountryPalette[code];
  });
  if (typeof globalThis.renderApp === "function") {
    globalThis.renderApp();
  }
}

function applyPaletteToMap() {
  if (!state.landData) return;
  for (const feature of state.landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    if (!id) continue;
    const code = getCountryCode(feature);
    const color = countryPalette[code];
    if (color) {
      state.colors[id] = color;
    }
  }
  invalidateBorderCache();
  if (typeof globalThis.renderApp === "function") {
    globalThis.renderApp();
  }
}

function saveMapState() {
  try {
    localStorage.setItem("map_colors", JSON.stringify(state.colors));
  } catch (error) {
    console.warn("Unable to save map state:", error);
  }
}

export { applyCountryColor, resetCountryColors, applyPaletteToMap, saveMapState };
