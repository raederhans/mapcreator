import { normalizeCityLayerStyleConfig } from "../../core/state.js";
import {
  CITY_POINTS_THEME_OPTIONS,
  formatCityPointsDensityValue,
  getCityPointsLabelDensityHint,
  getCityPointsThemeHint,
  getCityPointsThemeLabel,
  getCityPointsThemeMeta,
  getCityPointsThemeStyle,
} from "./appearance_city_points_descriptor.js";

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyCityPointsThemeStyle(cityPointsConfig, themeStyle, clamp) {
  cityPointsConfig.color = themeStyle.color;
  cityPointsConfig.capitalColor = themeStyle.capitalColor;
  const markerScale = Number(themeStyle.markerScale);
  const markerDensity = Number(themeStyle.markerDensity);
  const opacity = Number(themeStyle.opacity);
  const labelSize = Number(themeStyle.labelSize);
  const labelDensity = String(themeStyle.labelDensity || "").trim().toLowerCase();
  if (Number.isFinite(markerScale)) cityPointsConfig.markerScale = clamp(markerScale, 0.75, 2.5);
  if (Number.isFinite(markerDensity)) cityPointsConfig.markerDensity = clamp(markerDensity, 0.5, 2);
  if (Number.isFinite(opacity)) cityPointsConfig.opacity = clamp(opacity, 0, 1);
  if (["sparse", "balanced", "dense"].includes(labelDensity)) cityPointsConfig.labelDensity = labelDensity;
  if (Number.isFinite(labelSize)) cityPointsConfig.labelSize = clamp(Math.round(labelSize), 8, 24);
}

function collectCityPointsNodes(documentRef) {
  return {
    toggleCityPoints: documentRef.getElementById("toggleCityPoints"),
    cityPointsTheme: documentRef.getElementById("cityPointsTheme"),
    cityPointsThemeHint: documentRef.getElementById("cityPointsThemeHint"),
    cityPointsMarkerScale: documentRef.getElementById("cityPointsMarkerScale"),
    cityPointsMarkerDensity: documentRef.getElementById("cityPointsMarkerDensity"),
    cityPointsMarkerDensityHint: documentRef.getElementById("cityPointsMarkerDensityHint"),
    cityPointsLabelDensity: documentRef.getElementById("cityPointsLabelDensity"),
    cityPointsLabelDensityHint: documentRef.getElementById("cityPointsLabelDensityHint"),
    cityPointsColor: documentRef.getElementById("cityPointsColor"),
    cityPointsCapitalColor: documentRef.getElementById("cityPointsCapitalColor"),
    cityPointsOpacity: documentRef.getElementById("cityPointsOpacity"),
    cityPointLabelsEnabled: documentRef.getElementById("cityPointLabelsEnabled"),
    cityPointsLabelSize: documentRef.getElementById("cityPointsLabelSize"),
    cityCapitalOverlayEnabled: documentRef.getElementById("cityCapitalOverlayEnabled"),
    cityPointsMarkerScaleValue: documentRef.getElementById("cityPointsMarkerScaleValue"),
    cityPointsMarkerDensityValue: documentRef.getElementById("cityPointsMarkerDensityValue"),
    cityPointsOpacityValue: documentRef.getElementById("cityPointsOpacityValue"),
    cityPointsLabelSizeValue: documentRef.getElementById("cityPointsLabelSizeValue"),
  };
}

export function createAppearanceCityPointsOwner({
  runtimeState,
  t = (value) => value,
  clamp = clampNumber,
  renderDirty = () => {},
  normalizeOceanFillColor = (value) => value,
  ensureActiveScenarioOptionalLayerLoaded = () => {},
  documentRef = globalThis.document,
} = {}) {
  const nodes = collectCityPointsNodes(documentRef);

  const persistCityViewSettings = () => {
    runtimeState.persistViewSettingsFn?.();
  };

  const syncCityPointsConfig = () => {
    runtimeState.styleConfig.cityPoints = normalizeCityLayerStyleConfig(runtimeState.styleConfig.cityPoints);
    return runtimeState.styleConfig.cityPoints;
  };

  const ensureCityPointsThemeOptions = () => {
    if (!nodes.cityPointsTheme) return;
    const normalizedExisting = Array.from(nodes.cityPointsTheme.options || []).map((option) => String(option.value || ""));
    const expected = CITY_POINTS_THEME_OPTIONS.map((option) => option.value);
    const matchesExisting =
      normalizedExisting.length === expected.length
      && normalizedExisting.every((value, index) => value === expected[index]);
    if (matchesExisting) {
      Array.from(nodes.cityPointsTheme.options || []).forEach((optionNode, index) => {
        const meta = CITY_POINTS_THEME_OPTIONS[index];
        if (!meta) return;
        optionNode.id = meta.labelKey;
        optionNode.textContent = getCityPointsThemeLabel(meta.value, t);
      });
      return;
    }
    const fragment = documentRef.createDocumentFragment();
    CITY_POINTS_THEME_OPTIONS.forEach((optionMeta) => {
      const option = documentRef.createElement("option");
      option.value = optionMeta.value;
      option.id = optionMeta.labelKey;
      option.textContent = getCityPointsThemeLabel(optionMeta.value, t);
      fragment.appendChild(option);
    });
    nodes.cityPointsTheme.replaceChildren(fragment);
  };

  const renderCityPointsUi = () => {
    if (nodes.toggleCityPoints) nodes.toggleCityPoints.checked = !!runtimeState.showCityPoints;
    const cityPointsConfig = syncCityPointsConfig();
    ensureCityPointsThemeOptions();
    if (nodes.cityPointsTheme) nodes.cityPointsTheme.value = String(cityPointsConfig.theme || "classic_graphite");
    if (nodes.cityPointsThemeHint) {
      nodes.cityPointsThemeHint.textContent = getCityPointsThemeHint(
        cityPointsConfig.theme || "classic_graphite",
        runtimeState.currentLanguage,
      );
    }
    if (nodes.cityPointsMarkerScale) nodes.cityPointsMarkerScale.value = Number(cityPointsConfig.markerScale || 1).toFixed(2);
    if (nodes.cityPointsMarkerScaleValue) nodes.cityPointsMarkerScaleValue.textContent = `${Number(cityPointsConfig.markerScale || 1).toFixed(2)}x`;
    if (nodes.cityPointsMarkerDensity) nodes.cityPointsMarkerDensity.value = Number(cityPointsConfig.markerDensity || 1).toFixed(2);
    if (nodes.cityPointsMarkerDensityValue) nodes.cityPointsMarkerDensityValue.textContent = formatCityPointsDensityValue(cityPointsConfig.markerDensity || 1);
    if (nodes.cityPointsMarkerDensityHint) {
      nodes.cityPointsMarkerDensityHint.textContent = runtimeState.currentLanguage === "zh"
        ? "控制每个缩放阶段最多允许出现多少个城市点。"
        : "Controls how many city markers can surface at each zoom stage.";
    }
    if (nodes.cityPointsLabelDensity) nodes.cityPointsLabelDensity.value = String(cityPointsConfig.labelDensity || "balanced");
    if (nodes.cityPointsLabelDensityHint) {
      nodes.cityPointsLabelDensityHint.textContent = getCityPointsLabelDensityHint(
        cityPointsConfig.labelDensity || "balanced",
        runtimeState.currentLanguage,
      );
    }
    if (nodes.cityPointsColor) nodes.cityPointsColor.value = normalizeOceanFillColor(cityPointsConfig.color || "#20262e");
    if (nodes.cityPointsCapitalColor) nodes.cityPointsCapitalColor.value = normalizeOceanFillColor(cityPointsConfig.capitalColor || "#f0b84f");
    if (nodes.cityPointsOpacity) nodes.cityPointsOpacity.value = String(Math.round(cityPointsConfig.opacity * 100));
    if (nodes.cityPointsOpacityValue) nodes.cityPointsOpacityValue.textContent = `${Math.round(cityPointsConfig.opacity * 100)}%`;
    if (nodes.cityPointLabelsEnabled) nodes.cityPointLabelsEnabled.checked = !!cityPointsConfig.showLabels;
    if (nodes.cityPointsLabelSize) nodes.cityPointsLabelSize.value = String(Math.round(cityPointsConfig.labelSize));
    if (nodes.cityPointsLabelSizeValue) nodes.cityPointsLabelSizeValue.textContent = `${Math.round(cityPointsConfig.labelSize)}px`;
    if (nodes.cityCapitalOverlayEnabled) nodes.cityCapitalOverlayEnabled.checked = !!cityPointsConfig.showCapitalOverlay;
    return cityPointsConfig;
  };

  const bindCityPointsInput = (element, mutate, reason, afterMutate = () => {}) => {
    if (!element || element.dataset.bound === "true") return;
    element.addEventListener("input", (event) => {
      const cfg = syncCityPointsConfig();
      mutate(cfg, event);
      afterMutate(cfg);
      persistCityViewSettings();
      renderDirty(reason);
    });
    element.dataset.bound = "true";
  };

  const bindCityPointsChange = (element, mutate, reason, afterMutate = () => {}) => {
    if (!element || element.dataset.bound === "true") return;
    element.addEventListener("change", (event) => {
      const cfg = syncCityPointsConfig();
      mutate(cfg, event);
      afterMutate(cfg);
      persistCityViewSettings();
      renderDirty(reason);
    });
    element.dataset.bound = "true";
  };

  const bindEvents = () => {
    if (nodes.toggleCityPoints && nodes.toggleCityPoints.dataset.bound !== "true") {
      nodes.toggleCityPoints.checked = !!runtimeState.showCityPoints;
      nodes.toggleCityPoints.addEventListener("change", (event) => {
        runtimeState.showCityPoints = !!event.target.checked;
        if (runtimeState.showCityPoints) {
          if (typeof runtimeState.ensureBaseCityDataFn === "function") {
            void runtimeState.ensureBaseCityDataFn({ reason: "toolbar-toggle", renderNow: true });
          }
          void ensureActiveScenarioOptionalLayerLoaded("cities", { renderNow: true });
        }
        persistCityViewSettings();
        renderDirty("toggle-city-points");
      });
      nodes.toggleCityPoints.dataset.bound = "true";
    }

    bindCityPointsInput(nodes.cityPointsColor, (cfg, event) => {
      cfg.color = normalizeOceanFillColor(event.target.value);
    }, "city-points-color");

    bindCityPointsChange(nodes.cityPointsTheme, (cfg, event) => {
      cfg.theme = getCityPointsThemeMeta(event.target.value || "classic_graphite").value;
      const themeStyle = getCityPointsThemeStyle(cfg.theme);
      applyCityPointsThemeStyle(cfg, themeStyle, clamp);
      renderCityPointsUi();
    }, "city-points-theme");

    bindCityPointsInput(nodes.cityPointsMarkerScale, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.markerScale = clamp(Number.isFinite(value) ? value : 1, 0.75, 2.5);
      if (nodes.cityPointsMarkerScaleValue) nodes.cityPointsMarkerScaleValue.textContent = `${Number(cfg.markerScale).toFixed(2)}x`;
    }, "city-points-marker-scale");

    if (nodes.cityPointsMarkerDensity && nodes.cityPointsMarkerDensity.dataset.bound !== "true") {
      const syncMarkerDensity = (event) => {
        const cfg = syncCityPointsConfig();
        const value = Number(event.target.value);
        cfg.markerDensity = clamp(Number.isFinite(value) ? value : 1, 0.5, 2);
        if (nodes.cityPointsMarkerDensityValue) nodes.cityPointsMarkerDensityValue.textContent = formatCityPointsDensityValue(cfg.markerDensity);
        persistCityViewSettings();
        renderDirty("city-points-marker-density");
      };
      nodes.cityPointsMarkerDensity.addEventListener("input", syncMarkerDensity);
      nodes.cityPointsMarkerDensity.addEventListener("change", syncMarkerDensity);
      nodes.cityPointsMarkerDensity.dataset.bound = "true";
    }

    bindCityPointsChange(nodes.cityPointsLabelDensity, (cfg, event) => {
      cfg.labelDensity = String(event.target.value || "balanced");
      if (nodes.cityPointsLabelDensityHint) {
        nodes.cityPointsLabelDensityHint.textContent = getCityPointsLabelDensityHint(cfg.labelDensity, runtimeState.currentLanguage);
      }
    }, "city-points-label-density");

    bindCityPointsInput(nodes.cityPointsCapitalColor, (cfg, event) => {
      cfg.capitalColor = normalizeOceanFillColor(event.target.value);
    }, "city-points-capital-color");

    bindCityPointsInput(nodes.cityPointsOpacity, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.92, 0, 1);
      if (nodes.cityPointsOpacityValue) nodes.cityPointsOpacityValue.textContent = `${Math.round(cfg.opacity * 100)}%`;
    }, "city-points-opacity");

    bindCityPointsChange(nodes.cityPointLabelsEnabled, (cfg, event) => {
      cfg.showLabels = !!event.target.checked;
    }, "city-points-labels-toggle");

    bindCityPointsInput(nodes.cityPointsLabelSize, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.labelSize = clamp(Math.round(Number.isFinite(value) ? value : 12), 8, 24);
      if (nodes.cityPointsLabelSizeValue) nodes.cityPointsLabelSizeValue.textContent = `${Math.round(cfg.labelSize)}px`;
    }, "city-points-label-size");

    bindCityPointsChange(nodes.cityCapitalOverlayEnabled, (cfg, event) => {
      cfg.showCapitalOverlay = !!event.target.checked;
    }, "city-points-capital-overlay");
  };

  return {
    bindEvents,
    ensureCityPointsThemeOptions,
    renderCityPointsUi,
    syncCityPointsConfig,
  };
}
