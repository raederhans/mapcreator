// Translation helpers (Phase 13)
import { state } from "../core/state.js";

function t(key, type = "geo") {
  if (!key) return "";
  if (state.currentLanguage === "zh") {
    return state.locales?.[type]?.[key]?.zh || key;
  }
  return key;
}

function updateUIText() {
  const uiMap = [
    ["lblCurrentTool", "Current Tool"],
    ["toolFillBtn", "Fill"],
    ["toolEraserBtn", "Eraser"],
    ["toolEyedropperBtn", "Eyedropper"],
    ["lblRecent", "Recent"],
    ["lblPalette", "Color Palette"],
    ["lblCustom", "Custom"],
    ["lblExport", "Export Map"],
    ["lblExportFormat", "Format"],
    ["exportBtn", "Download Snapshot"],
    ["lblTexture", "Texture"],
    ["lblOverlay", "Overlay"],
    ["lblMapStyle", "Map Style"],
    ["labelPresetPolitical", "Auto-Fill Countries"],
    ["presetClear", "Clear Map"],
    ["lblCountrySearch", "Search Countries"],
    ["lblCountryColors", "Country Colors"],
    ["resetCountryColors", "Reset Country Colors"],
  ];

  uiMap.forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = t(label, "ui");
    }
  });

  if (typeof state.updateToolUIFn === "function") {
    state.updateToolUIFn();
  }

  const searchInput = document.getElementById("countrySearch");
  if (searchInput) {
    searchInput.setAttribute("placeholder", t("Search...", "ui"));
  }
}

function toggleLanguage() {
  const nextLang = state.currentLanguage === "zh" ? "en" : "zh";
  state.currentLanguage = nextLang;
  try {
    localStorage.setItem("map_lang", nextLang);
  } catch (error) {
    console.warn("Unable to persist language preference:", error);
  }
  updateUIText();
  if (typeof state.renderCountryListFn === "function") {
    state.renderCountryListFn();
  }
  if (typeof state.renderPresetTreeFn === "function") {
    state.renderPresetTreeFn();
  }
}

function initTranslations() {
  updateUIText();
}

export { t, initTranslations, toggleLanguage, updateUIText };
