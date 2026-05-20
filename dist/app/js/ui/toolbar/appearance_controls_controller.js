import { normalizeUrbanStyleConfig } from "../../core/state.js";
import { normalizeHexColor } from "../../core/palette_manager.js";
import { createTransportAppearanceController } from "./transport_appearance_controller.js";
import { createAppearanceParentBorderOwner } from "./appearance_parent_border_owner.js";
import { createAppearanceTextureOwner } from "./appearance_texture_owner.js";
import { createAppearanceCityPointsOwner } from "./appearance_city_points_owner.js";
import { createAppearancePhysicalOwner } from "./appearance_physical_owner.js";

/**
 * Owns the Appearance 面板 shell plus urban / rivers / reference controls.
 * Transport, texture/day-night, city-points, physical, and parent-border details live in narrower owners.
 *
 * toolbar.js 继续保留更高层 facade：
 * - runtimeState callback 注册
 * - special zone popover 壳层
 * - export / dock / workspace 编排
 */
export function createAppearanceControlsController({
  runtimeState,
  t,
  clamp,
  markDirty,
  renderDirty,
  ensureActiveScenarioOptionalLayerLoaded,
  normalizeOceanFillColor,
  updateSwatchUI,
  openSpecialZonePopover,
}) {
  const toggleUrban = document.getElementById("toggleUrban");
  const toggleRivers = document.getElementById("toggleRivers");
  const urbanMode = document.getElementById("urbanMode");
  const urbanAdaptiveControls = document.getElementById("urbanAdaptiveControls");
  const urbanManualControls = document.getElementById("urbanManualControls");
  const lblUrbanOpacity = document.getElementById("lblUrbanOpacity");
  const urbanColor = document.getElementById("urbanColor");
  const urbanOpacity = document.getElementById("urbanOpacity");
  const urbanBlendMode = document.getElementById("urbanBlendMode");
  const urbanAdaptiveStrength = document.getElementById("urbanAdaptiveStrength");
  const urbanStrokeOpacity = document.getElementById("urbanStrokeOpacity");
  const urbanToneBias = document.getElementById("urbanToneBias");
  const urbanAdaptiveTintEnabled = document.getElementById("urbanAdaptiveTintEnabled");
  const urbanAdaptiveTintColor = document.getElementById("urbanAdaptiveTintColor");
  const urbanAdaptiveTintStrength = document.getElementById("urbanAdaptiveTintStrength");
  const urbanMinArea = document.getElementById("urbanMinArea");
  const urbanAdaptiveStatus = document.getElementById("urbanAdaptiveStatus");
  const riversColor = document.getElementById("riversColor");
  const riversOpacity = document.getElementById("riversOpacity");
  const riversWidth = document.getElementById("riversWidth");
  const riversOutlineColor = document.getElementById("riversOutlineColor");
  const riversOutlineWidth = document.getElementById("riversOutlineWidth");
  const riversDashStyle = document.getElementById("riversDashStyle");
  const referenceImageInput = document.getElementById("referenceImageInput");
  const referenceOpacity = document.getElementById("referenceOpacity");
  const referenceScale = document.getElementById("referenceScale");
  const referenceOffsetX = document.getElementById("referenceOffsetX");
  const referenceOffsetY = document.getElementById("referenceOffsetY");
  const urbanOpacityValue = document.getElementById("urbanOpacityValue");
  const urbanAdaptiveStrengthValue = document.getElementById("urbanAdaptiveStrengthValue");
  const urbanStrokeOpacityValue = document.getElementById("urbanStrokeOpacityValue");
  const urbanToneBiasValue = document.getElementById("urbanToneBiasValue");
  const urbanAdaptiveTintStrengthValue = document.getElementById("urbanAdaptiveTintStrengthValue");
  const urbanMinAreaValue = document.getElementById("urbanMinAreaValue");
  const riversOpacityValue = document.getElementById("riversOpacityValue");
  const riversWidthValue = document.getElementById("riversWidthValue");
  const riversOutlineWidthValue = document.getElementById("riversOutlineWidthValue");
  const referenceOpacityValue = document.getElementById("referenceOpacityValue");
  const referenceScaleValue = document.getElementById("referenceScaleValue");
  const referenceOffsetXValue = document.getElementById("referenceOffsetXValue");
  const referenceOffsetYValue = document.getElementById("referenceOffsetYValue");
  const appearanceLayerFilter = document.getElementById("appearanceLayerFilter");
  const appearanceTabButtons = Array.from(document.querySelectorAll("[data-appearance-tab]"));
  const appearanceTabPanels = Array.from(document.querySelectorAll("[data-appearance-panel]"));
  const appearanceFilterItems = Array.from(document.querySelectorAll("[data-appearance-filter-item]"));
  const appearanceSpecialZoneBtn = document.getElementById("appearanceSpecialZoneBtn");
  const recentContainer = document.getElementById("recentColors");
  const dockRecentDivider = document.getElementById("dockRecentDivider");
  const parentBordersVisible = document.getElementById("parentBordersVisible");
  const parentBorderColor = document.getElementById("parentBorderColor");
  const parentBorderOpacity = document.getElementById("parentBorderOpacity");
  const parentBorderWidth = document.getElementById("parentBorderWidth");
  const parentBorderEnableAll = document.getElementById("parentBorderEnableAll");
  const parentBorderDisableAll = document.getElementById("parentBorderDisableAll");
  const parentBorderCountryList = document.getElementById("parentBorderCountryList");
  const parentBorderEmpty = document.getElementById("parentBorderEmpty");

  const transportAppearanceController = createTransportAppearanceController({
    runtimeState,
    t,
    clamp,
    renderDirty,
    normalizeOceanFillColor,
  });
  const renderTransportAppearanceUi = transportAppearanceController.renderTransportAppearanceUi;
  const textureOwner = createAppearanceTextureOwner({
    runtimeState,
    clamp,
    renderDirty,
    normalizeOceanFillColor,
  });
  const renderTextureUI = textureOwner.renderTextureUI;
  const renderDayNightUI = textureOwner.renderDayNightUI;
  const cityPointsOwner = createAppearanceCityPointsOwner({
    runtimeState,
    t,
    clamp,
    renderDirty,
    normalizeOceanFillColor,
    ensureActiveScenarioOptionalLayerLoaded,
  });
  const physicalOwner = createAppearancePhysicalOwner({
    runtimeState,
    t,
    clamp,
    renderDirty,
    normalizeOceanFillColor,
  });
  const parentBorderOwner = createAppearanceParentBorderOwner({
    runtimeState,
    nodes: {
      visibleToggle: parentBordersVisible,
      colorInput: parentBorderColor,
      opacityInput: parentBorderOpacity,
      widthInput: parentBorderWidth,
      enableAllButton: parentBorderEnableAll,
      disableAllButton: parentBorderDisableAll,
      countryList: parentBorderCountryList,
      emptyNode: parentBorderEmpty,
    },
    translateGeo: (label) => t(label, "geo"),
    renderDirty,
  });

  const applyAppearanceFilter = () => {
    const query = String(appearanceLayerFilter?.value || "").trim().toLowerCase();
    appearanceFilterItems.forEach((item) => {
      const label = String(item.getAttribute("data-appearance-filter-label") || item.textContent || "").toLowerCase();
      item.classList.toggle("hidden", !!query && !label.includes(query));
    });
  };

  const setAppearanceTab = (tabId = "ocean") => {
    const normalizedTabId = String(tabId || "ocean").trim().toLowerCase();
    appearanceTabButtons.forEach((button) => {
      const id = String(button.dataset.appearanceTab || "").trim().toLowerCase();
      const isActive = id === normalizedTabId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    appearanceTabPanels.forEach((panel) => {
      const id = String(panel.dataset.appearancePanel || "").trim().toLowerCase();
      const isActive = id === normalizedTabId;
      panel.classList.toggle("is-active", isActive);
      panel.classList.toggle("hidden", !isActive);
      panel.hidden = !isActive;
    });
  };

  const syncUrbanConfig = () => {
    runtimeState.styleConfig.urban = normalizeUrbanStyleConfig(runtimeState.styleConfig.urban);
    if (runtimeState.styleConfig.urban.mode === "manual") {
      runtimeState.styleConfig.urban.color = normalizeOceanFillColor(runtimeState.styleConfig.urban.color || "#4b5563");
    }
    runtimeState.styleConfig.urban.adaptiveTintColor = normalizeOceanFillColor(runtimeState.styleConfig.urban.adaptiveTintColor || "#f2dea1");
    return runtimeState.styleConfig.urban;
  };

  const getUrbanCapability = () => {
    const capability = runtimeState.urbanLayerCapability && typeof runtimeState.urbanLayerCapability === "object"
      ? runtimeState.urbanLayerCapability
      : null;
    if (capability) return capability;
    return {
      adaptiveAvailable: false,
      unavailableReason: "Urban layer metadata is still loading.",
    };
  };

  const getEffectiveUrbanMode = (urbanConfig, capability = getUrbanCapability()) => {
    if (urbanConfig?.mode === "adaptive" && !capability?.adaptiveAvailable) {
      return "manual";
    }
    return urbanConfig?.mode === "manual" ? "manual" : "adaptive";
  };

  const formatUrbanToneBias = (rawValue) => {
    const percent = Math.round((Number(rawValue) || 0) * 100);
    return `${percent >= 0 ? "+" : ""}${percent}%`;
  };

  const syncUrbanControls = () => {
    const urbanConfig = syncUrbanConfig();
    const capability = getUrbanCapability();
    const adaptiveAvailable = !!capability.adaptiveAvailable;
    const effectiveMode = getEffectiveUrbanMode(urbanConfig, capability);
    const isManual = effectiveMode === "manual";
    if (urbanMode) {
      urbanMode.value = effectiveMode;
      const adaptiveOption = urbanMode.querySelector('option[value="adaptive"]');
      if (adaptiveOption) adaptiveOption.disabled = !adaptiveAvailable;
    }
    if (urbanAdaptiveStatus) {
      const statusText = adaptiveAvailable ? "" : String(capability.unavailableReason || "").trim();
      urbanAdaptiveStatus.textContent = statusText;
      urbanAdaptiveStatus.classList.toggle("hidden", !statusText);
    }
    if (lblUrbanOpacity) lblUrbanOpacity.textContent = isManual ? t("Opacity", "ui") : t("Fill Opacity", "ui");
    if (urbanAdaptiveControls) urbanAdaptiveControls.classList.toggle("hidden", isManual);
    if (urbanManualControls) urbanManualControls.classList.toggle("hidden", !isManual);
    if (urbanColor) urbanColor.value = urbanConfig.color;
    if (urbanOpacity) urbanOpacity.value = String(Math.round(urbanConfig.fillOpacity * 100));
    if (urbanOpacityValue) urbanOpacityValue.textContent = `${Math.round(urbanConfig.fillOpacity * 100)}%`;
    if (urbanBlendMode) urbanBlendMode.value = urbanConfig.blendMode;
    if (urbanAdaptiveStrength) urbanAdaptiveStrength.value = String(Math.round(urbanConfig.adaptiveStrength * 100));
    if (urbanAdaptiveStrengthValue) urbanAdaptiveStrengthValue.textContent = `${Math.round(urbanConfig.adaptiveStrength * 100)}%`;
    if (urbanStrokeOpacity) urbanStrokeOpacity.value = String(Math.round(urbanConfig.strokeOpacity * 100));
    if (urbanStrokeOpacityValue) urbanStrokeOpacityValue.textContent = `${Math.round(urbanConfig.strokeOpacity * 100)}%`;
    if (urbanToneBias) urbanToneBias.value = String(Math.round(urbanConfig.toneBias * 100));
    if (urbanToneBiasValue) urbanToneBiasValue.textContent = formatUrbanToneBias(urbanConfig.toneBias);
    if (urbanAdaptiveTintEnabled) urbanAdaptiveTintEnabled.checked = !!urbanConfig.adaptiveTintEnabled;
    if (urbanAdaptiveTintColor) urbanAdaptiveTintColor.value = urbanConfig.adaptiveTintColor || "#f2dea1";
    if (urbanAdaptiveTintStrength) urbanAdaptiveTintStrength.value = String(Math.round((urbanConfig.adaptiveTintStrength || 0) * 100));
    if (urbanAdaptiveTintStrengthValue) urbanAdaptiveTintStrengthValue.textContent = `${Math.round((urbanConfig.adaptiveTintStrength || 0) * 100)}%`;
    [urbanAdaptiveStrength, urbanStrokeOpacity, urbanToneBias, urbanAdaptiveTintEnabled, urbanAdaptiveTintColor, urbanAdaptiveTintStrength].forEach((element) => {
      if (element) element.disabled = !adaptiveAvailable;
    });
    if (urbanAdaptiveTintColor) urbanAdaptiveTintColor.disabled = !adaptiveAvailable || !urbanConfig.adaptiveTintEnabled;
    if (urbanAdaptiveTintStrength) urbanAdaptiveTintStrength.disabled = !adaptiveAvailable || !urbanConfig.adaptiveTintEnabled;
    if (urbanMinArea) urbanMinArea.value = String(Math.round(urbanConfig.minAreaPx));
    if (urbanMinAreaValue) urbanMinAreaValue.textContent = `${Math.round(urbanConfig.minAreaPx)}`;
    return urbanConfig;
  };

  const renderAppearanceStyleControlsUi = () => {
    cityPointsOwner.renderCityPointsUi();
    if (toggleUrban) toggleUrban.checked = !!runtimeState.showUrban;
    physicalOwner.renderPhysicalUi();
    if (toggleRivers) toggleRivers.checked = !!runtimeState.showRivers;

    syncUrbanControls();

    if (riversColor) riversColor.value = runtimeState.styleConfig.rivers.color;
    if (riversOpacity) riversOpacity.value = String(Math.round(runtimeState.styleConfig.rivers.opacity * 100));
    if (riversOpacityValue) riversOpacityValue.textContent = `${Math.round(runtimeState.styleConfig.rivers.opacity * 100)}%`;
    if (riversWidth) riversWidth.value = String(Number(runtimeState.styleConfig.rivers.width).toFixed(2));
    if (riversWidthValue) riversWidthValue.textContent = Number(runtimeState.styleConfig.rivers.width).toFixed(2);
    if (riversOutlineColor) riversOutlineColor.value = runtimeState.styleConfig.rivers.outlineColor;
    if (riversOutlineWidth) riversOutlineWidth.value = String(Number(runtimeState.styleConfig.rivers.outlineWidth).toFixed(2));
    if (riversOutlineWidthValue) riversOutlineWidthValue.textContent = Number(runtimeState.styleConfig.rivers.outlineWidth).toFixed(2);
    if (riversDashStyle) riversDashStyle.value = runtimeState.styleConfig.rivers.dashStyle;
  };

  const renderReferenceOverlayUi = () => {
    if (referenceOpacity) referenceOpacity.value = String(Math.round(runtimeState.referenceImageState.opacity * 100));
    if (referenceOpacityValue) referenceOpacityValue.textContent = `${Math.round(runtimeState.referenceImageState.opacity * 100)}%`;
    if (referenceScale) referenceScale.value = String(Number(runtimeState.referenceImageState.scale).toFixed(2));
    if (referenceScaleValue) referenceScaleValue.textContent = `${Number(runtimeState.referenceImageState.scale).toFixed(2)}x`;
    if (referenceOffsetX) referenceOffsetX.value = String(Math.round(runtimeState.referenceImageState.offsetX));
    if (referenceOffsetXValue) referenceOffsetXValue.textContent = `${Math.round(runtimeState.referenceImageState.offsetX)}px`;
    if (referenceOffsetY) referenceOffsetY.value = String(Math.round(runtimeState.referenceImageState.offsetY));
    if (referenceOffsetYValue) referenceOffsetYValue.textContent = `${Math.round(runtimeState.referenceImageState.offsetY)}px`;
    const referenceImage = document.getElementById("referenceImage");
    if (referenceImage) {
      referenceImage.style.opacity = String(runtimeState.referenceImageState.opacity);
      referenceImage.style.transform =
        `translate(${runtimeState.referenceImageState.offsetX}px, ${runtimeState.referenceImageState.offsetY}px) `
        + `scale(${runtimeState.referenceImageState.scale})`;
    }
  };

  const renderRecentColors = () => {
    if (!recentContainer) return;
    recentContainer.replaceChildren();
    const visibleRecentColors = runtimeState.recentColors.slice(0, 10);
    dockRecentDivider?.classList.toggle("hidden", visibleRecentColors.length === 0);
    visibleRecentColors.forEach((color) => {
      const normalized = normalizeHexColor(color);
      if (!normalized) return;
      const btn = document.createElement("button");
      btn.className = "color-swatch";
      btn.type = "button";
      btn.dataset.color = normalized;
      btn.style.backgroundColor = normalized;
      btn.title = normalized;
      btn.setAttribute("aria-label", `${t("Recent", "ui")}: ${normalized}`);
      btn.addEventListener("click", () => {
        runtimeState.selectedColor = normalized;
        updateSwatchUI();
      });
      recentContainer.appendChild(btn);
    });
  };

  const syncParentBorderVisibilityUI = () => parentBorderOwner.syncVisibilityUi();

  const renderParentBorderCountryList = () => parentBorderOwner.renderCountryList();

  const bindEvents = () => {
    if (appearanceSpecialZoneBtn && !appearanceSpecialZoneBtn.dataset.bound) {
      appearanceSpecialZoneBtn.setAttribute("aria-haspopup", "dialog");
      appearanceSpecialZoneBtn.setAttribute("aria-controls", "specialZonePopover");
      appearanceSpecialZoneBtn.addEventListener("click", () => {
        openSpecialZonePopover();
      });
      appearanceSpecialZoneBtn.dataset.bound = "true";
    }

    appearanceTabButtons.forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.addEventListener("click", () => {
        setAppearanceTab(button.dataset.appearanceTab || "ocean");
      });
      button.dataset.bound = "true";
    });

    if (appearanceLayerFilter && !appearanceLayerFilter.dataset.bound) {
      appearanceLayerFilter.addEventListener("input", () => {
        applyAppearanceFilter();
      });
      appearanceLayerFilter.dataset.bound = "true";
    }

    transportAppearanceController.bindEvents();
    textureOwner.bindEvents();
    cityPointsOwner.bindEvents();
    physicalOwner.bindEvents();

    if (toggleUrban && toggleUrban.dataset.bound !== "true") {
      toggleUrban.checked = !!runtimeState.showUrban;
      toggleUrban.addEventListener("change", (event) => {
        runtimeState.showUrban = event.target.checked;
        if (runtimeState.showUrban && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("urban", { reason: "toolbar-toggle", renderNow: true });
        }
        renderDirty("toggle-urban");
      });
      toggleUrban.dataset.bound = "true";
    }

    if (toggleRivers && toggleRivers.dataset.bound !== "true") {
      toggleRivers.checked = !!runtimeState.showRivers;
      toggleRivers.addEventListener("change", (event) => {
        runtimeState.showRivers = event.target.checked;
        if (runtimeState.showRivers && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("rivers", { reason: "toolbar-toggle", renderNow: true });
        }
        renderDirty("toggle-rivers");
      });
      toggleRivers.dataset.bound = "true";
    }

    if (urbanMode && urbanMode.dataset.bound !== "true") {
      urbanMode.addEventListener("change", (event) => {
        const cfg = syncUrbanConfig();
        const requestedMode = String(event.target.value || "adaptive");
        const capability = getUrbanCapability();
        cfg.mode = requestedMode === "adaptive" && !capability.adaptiveAvailable ? "manual" : requestedMode;
        syncUrbanControls();
        renderDirty("urban-mode");
      });
      urbanMode.dataset.bound = "true";
    }
    if (urbanColor && urbanColor.dataset.bound !== "true") {
      urbanColor.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        cfg.color = normalizeOceanFillColor(event.target.value);
        renderDirty("urban-color");
      });
      urbanColor.dataset.bound = "true";
    }
    if (urbanOpacity && urbanOpacity.dataset.bound !== "true") {
      urbanOpacity.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.fillOpacity = clamp(Number.isFinite(value) ? value / 100 : cfg.fillOpacity, 0, 1);
        if (urbanOpacityValue) urbanOpacityValue.textContent = `${Math.round(cfg.fillOpacity * 100)}%`;
        renderDirty("urban-opacity");
      });
      urbanOpacity.dataset.bound = "true";
    }
    if (urbanBlendMode && urbanBlendMode.dataset.bound !== "true") {
      urbanBlendMode.addEventListener("change", (event) => {
        const cfg = syncUrbanConfig();
        cfg.blendMode = String(event.target.value || "multiply");
        renderDirty("urban-blend");
      });
      urbanBlendMode.dataset.bound = "true";
    }
    if (urbanAdaptiveStrength && urbanAdaptiveStrength.dataset.bound !== "true") {
      urbanAdaptiveStrength.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.adaptiveStrength = clamp(Number.isFinite(value) ? value / 100 : cfg.adaptiveStrength, 0, 1);
        if (urbanAdaptiveStrengthValue) urbanAdaptiveStrengthValue.textContent = `${Math.round(cfg.adaptiveStrength * 100)}%`;
        renderDirty("urban-adaptive-strength");
      });
      urbanAdaptiveStrength.dataset.bound = "true";
    }
    if (urbanStrokeOpacity && urbanStrokeOpacity.dataset.bound !== "true") {
      urbanStrokeOpacity.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.strokeOpacity = clamp(Number.isFinite(value) ? value / 100 : cfg.strokeOpacity, 0, 1);
        if (urbanStrokeOpacityValue) urbanStrokeOpacityValue.textContent = `${Math.round(cfg.strokeOpacity * 100)}%`;
        renderDirty("urban-stroke-opacity");
      });
      urbanStrokeOpacity.dataset.bound = "true";
    }
    if (urbanToneBias && urbanToneBias.dataset.bound !== "true") {
      urbanToneBias.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.toneBias = clamp(Number.isFinite(value) ? value / 100 : cfg.toneBias, -0.3, 0.3);
        if (urbanToneBiasValue) urbanToneBiasValue.textContent = formatUrbanToneBias(cfg.toneBias);
        renderDirty("urban-tone-bias");
      });
      urbanToneBias.dataset.bound = "true";
    }
    if (urbanAdaptiveTintEnabled && urbanAdaptiveTintEnabled.dataset.bound !== "true") {
      urbanAdaptiveTintEnabled.addEventListener("change", (event) => {
        const cfg = syncUrbanConfig();
        cfg.adaptiveTintEnabled = !!event.target.checked;
        syncUrbanControls();
        renderDirty("urban-adaptive-tint-enabled");
      });
      urbanAdaptiveTintEnabled.dataset.bound = "true";
    }
    if (urbanAdaptiveTintColor && urbanAdaptiveTintColor.dataset.bound !== "true") {
      urbanAdaptiveTintColor.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        cfg.adaptiveTintColor = normalizeOceanFillColor(event.target.value || cfg.adaptiveTintColor || "#f2dea1");
        renderDirty("urban-adaptive-tint-color");
      });
      urbanAdaptiveTintColor.dataset.bound = "true";
    }
    if (urbanAdaptiveTintStrength && urbanAdaptiveTintStrength.dataset.bound !== "true") {
      urbanAdaptiveTintStrength.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.adaptiveTintStrength = clamp(Number.isFinite(value) ? value / 100 : cfg.adaptiveTintStrength, 0, 0.5);
        if (urbanAdaptiveTintStrengthValue) urbanAdaptiveTintStrengthValue.textContent = `${Math.round(cfg.adaptiveTintStrength * 100)}%`;
        renderDirty("urban-adaptive-tint-strength");
      });
      urbanAdaptiveTintStrength.dataset.bound = "true";
    }
    if (urbanMinArea && urbanMinArea.dataset.bound !== "true") {
      urbanMinArea.addEventListener("input", (event) => {
        const cfg = syncUrbanConfig();
        const value = Number(event.target.value);
        cfg.minAreaPx = clamp(Number.isFinite(value) ? value : 1, 1, 80);
        if (urbanMinAreaValue) urbanMinAreaValue.textContent = `${Math.round(cfg.minAreaPx)}`;
        renderDirty("urban-area");
      });
      urbanMinArea.dataset.bound = "true";
    }
    if (riversColor && riversColor.dataset.bound !== "true") {
      riversColor.addEventListener("input", (event) => {
        runtimeState.styleConfig.rivers.color = normalizeOceanFillColor(event.target.value);
        renderDirty("rivers-color");
      });
      riversColor.dataset.bound = "true";
    }
    if (riversOpacity && riversOpacity.dataset.bound !== "true") {
      riversOpacity.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.styleConfig.rivers.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.88, 0, 1);
        if (riversOpacityValue) riversOpacityValue.textContent = `${Math.round(runtimeState.styleConfig.rivers.opacity * 100)}%`;
        renderDirty("rivers-opacity");
      });
      riversOpacity.dataset.bound = "true";
    }
    if (riversWidth && riversWidth.dataset.bound !== "true") {
      riversWidth.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.styleConfig.rivers.width = clamp(Number.isFinite(value) ? value : 0.5, 0.2, 4);
        if (riversWidthValue) riversWidthValue.textContent = Number(runtimeState.styleConfig.rivers.width).toFixed(2);
        renderDirty("rivers-width");
      });
      riversWidth.dataset.bound = "true";
    }
    if (riversOutlineColor && riversOutlineColor.dataset.bound !== "true") {
      riversOutlineColor.addEventListener("input", (event) => {
        runtimeState.styleConfig.rivers.outlineColor = normalizeOceanFillColor(event.target.value);
        renderDirty("rivers-outline-color");
      });
      riversOutlineColor.dataset.bound = "true";
    }
    if (riversOutlineWidth && riversOutlineWidth.dataset.bound !== "true") {
      riversOutlineWidth.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.styleConfig.rivers.outlineWidth = clamp(Number.isFinite(value) ? value : 0.25, 0, 3);
        if (riversOutlineWidthValue) riversOutlineWidthValue.textContent = Number(runtimeState.styleConfig.rivers.outlineWidth).toFixed(2);
        renderDirty("rivers-outline-width");
      });
      riversOutlineWidth.dataset.bound = "true";
    }
    if (riversDashStyle && riversDashStyle.dataset.bound !== "true") {
      riversDashStyle.addEventListener("change", (event) => {
        runtimeState.styleConfig.rivers.dashStyle = String(event.target.value || "solid");
        renderDirty("rivers-dash");
      });
      riversDashStyle.dataset.bound = "true";
    }

    const applyReferenceStyles = () => {
      const referenceImage = document.getElementById("referenceImage");
      if (!referenceImage) return;
      referenceImage.style.opacity = String(runtimeState.referenceImageState.opacity);
      referenceImage.style.transform =
        `translate(${runtimeState.referenceImageState.offsetX}px, ${runtimeState.referenceImageState.offsetY}px) `
        + `scale(${runtimeState.referenceImageState.scale})`;
    };

    if (referenceImageInput && referenceImageInput.dataset.bound !== "true") {
      referenceImageInput.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        const referenceImage = document.getElementById("referenceImage");
        if (!referenceImage) return;
        if (!file) {
          if (runtimeState.referenceImageUrl) {
            URL.revokeObjectURL(runtimeState.referenceImageUrl);
            runtimeState.referenceImageUrl = null;
          }
          referenceImage.src = "";
          referenceImage.style.opacity = "0";
          markDirty("reference-image-clear");
          return;
        }
        if (runtimeState.referenceImageUrl) {
          URL.revokeObjectURL(runtimeState.referenceImageUrl);
        }
        runtimeState.referenceImageUrl = URL.createObjectURL(file);
        referenceImage.src = runtimeState.referenceImageUrl;
        applyReferenceStyles();
        markDirty("reference-image-file");
      });
      referenceImageInput.dataset.bound = "true";
    }
    if (referenceOpacity && referenceOpacity.dataset.bound !== "true") {
      runtimeState.referenceImageState.opacity = Number(referenceOpacity.value) / 100;
      if (referenceOpacityValue) referenceOpacityValue.textContent = `${referenceOpacity.value}%`;
      referenceOpacity.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.referenceImageState.opacity = Number.isFinite(value) ? value / 100 : 0.6;
        if (referenceOpacityValue) referenceOpacityValue.textContent = `${event.target.value}%`;
        applyReferenceStyles();
        markDirty("reference-opacity");
      });
      referenceOpacity.dataset.bound = "true";
    }
    if (referenceScale && referenceScale.dataset.bound !== "true") {
      runtimeState.referenceImageState.scale = Number(referenceScale.value);
      if (referenceScaleValue) referenceScaleValue.textContent = `${Number(referenceScale.value).toFixed(2)}x`;
      referenceScale.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.referenceImageState.scale = Number.isFinite(value) ? value : 1;
        if (referenceScaleValue) referenceScaleValue.textContent = `${runtimeState.referenceImageState.scale.toFixed(2)}x`;
        applyReferenceStyles();
        markDirty("reference-scale");
      });
      referenceScale.dataset.bound = "true";
    }
    if (referenceOffsetX && referenceOffsetX.dataset.bound !== "true") {
      runtimeState.referenceImageState.offsetX = Number(referenceOffsetX.value);
      if (referenceOffsetXValue) referenceOffsetXValue.textContent = `${referenceOffsetX.value}px`;
      referenceOffsetX.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.referenceImageState.offsetX = Number.isFinite(value) ? value : 0;
        if (referenceOffsetXValue) referenceOffsetXValue.textContent = `${runtimeState.referenceImageState.offsetX}px`;
        applyReferenceStyles();
        markDirty("reference-offset-x");
      });
      referenceOffsetX.dataset.bound = "true";
    }
    if (referenceOffsetY && referenceOffsetY.dataset.bound !== "true") {
      runtimeState.referenceImageState.offsetY = Number(referenceOffsetY.value);
      if (referenceOffsetYValue) referenceOffsetYValue.textContent = `${referenceOffsetY.value}px`;
      referenceOffsetY.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        runtimeState.referenceImageState.offsetY = Number.isFinite(value) ? value : 0;
        if (referenceOffsetYValue) referenceOffsetYValue.textContent = `${runtimeState.referenceImageState.offsetY}px`;
        applyReferenceStyles();
        markDirty("reference-offset-y");
      });
      referenceOffsetY.dataset.bound = "true";
    }
  };

  return {
    applyAppearanceFilter,
    bindEvents,
    renderAppearanceStyleControlsUi,
    renderReferenceOverlayUi,
    renderParentBorderCountryList,
    renderRecentColors,
    renderDayNightUI,
    renderTextureUI,
    renderTransportAppearanceUi,
    setAppearanceTab,
    syncParentBorderVisibilityUI,
  };
}
