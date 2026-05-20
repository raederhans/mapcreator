import {
  createPhysicalStyleConfigForPreset,
  normalizePhysicalPreset,
  normalizePhysicalStyleConfig,
} from "../../core/state.js";

export const PHYSICAL_CLASS_TOGGLE_IDS = Object.freeze({
  mountain_high_relief: "physicalClassMountain",
  mountain_hills: "physicalClassMountainHills",
  upland_plateau: "physicalClassPlateau",
  badlands_canyon: "physicalClassBadlands",
  plains_lowlands: "physicalClassPlains",
  basin_lowlands: "physicalClassBasin",
  wetlands_delta: "physicalClassWetlands",
  forest_temperate: "physicalClassForestTemperate",
  rainforest_tropical: "physicalClassRainforestTropical",
  grassland_steppe: "physicalClassGrassland",
  desert_bare: "physicalClassDesert",
  tundra_ice: "physicalClassTundra",
});

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function collectPhysicalNodes(documentRef) {
  const physicalClassToggles = Object.fromEntries(
    Object.entries(PHYSICAL_CLASS_TOGGLE_IDS).map(([key, id]) => [key, documentRef.getElementById(id)]),
  );
  return {
    togglePhysical: documentRef.getElementById("togglePhysical"),
    physicalPreset: documentRef.getElementById("physicalPreset"),
    physicalPresetHint: documentRef.getElementById("physicalPresetHint"),
    physicalMode: documentRef.getElementById("physicalMode"),
    physicalOpacity: documentRef.getElementById("physicalOpacity"),
    physicalAtlasIntensity: documentRef.getElementById("physicalAtlasIntensity"),
    physicalRainforestEmphasis: documentRef.getElementById("physicalRainforestEmphasis"),
    physicalContourColor: documentRef.getElementById("physicalContourColor"),
    physicalContourOpacity: documentRef.getElementById("physicalContourOpacity"),
    physicalMinorContours: documentRef.getElementById("physicalMinorContours"),
    physicalContourMajorWidth: documentRef.getElementById("physicalContourMajorWidth"),
    physicalContourMinorWidth: documentRef.getElementById("physicalContourMinorWidth"),
    physicalContourMajorInterval: documentRef.getElementById("physicalContourMajorInterval"),
    physicalContourMinorInterval: documentRef.getElementById("physicalContourMinorInterval"),
    physicalContourMajorLowReliefCutoff: documentRef.getElementById("physicalContourMajorLowReliefCutoff"),
    physicalContourMinorLowReliefCutoff: documentRef.getElementById("physicalContourMinorLowReliefCutoff"),
    physicalBlendMode: documentRef.getElementById("physicalBlendMode"),
    physicalOpacityValue: documentRef.getElementById("physicalOpacityValue"),
    physicalAtlasIntensityValue: documentRef.getElementById("physicalAtlasIntensityValue"),
    physicalRainforestEmphasisValue: documentRef.getElementById("physicalRainforestEmphasisValue"),
    physicalContourOpacityValue: documentRef.getElementById("physicalContourOpacityValue"),
    physicalContourMajorWidthValue: documentRef.getElementById("physicalContourMajorWidthValue"),
    physicalContourMinorWidthValue: documentRef.getElementById("physicalContourMinorWidthValue"),
    physicalContourMajorIntervalValue: documentRef.getElementById("physicalContourMajorIntervalValue"),
    physicalContourMinorIntervalValue: documentRef.getElementById("physicalContourMinorIntervalValue"),
    physicalContourMajorLowReliefCutoffValue: documentRef.getElementById("physicalContourMajorLowReliefCutoffValue"),
    physicalContourMinorLowReliefCutoffValue: documentRef.getElementById("physicalContourMinorLowReliefCutoffValue"),
    physicalClassToggles,
  };
}

export function createAppearancePhysicalOwner({
  runtimeState,
  t = (value) => value,
  clamp = clampNumber,
  renderDirty = () => {},
  normalizeOceanFillColor = (value) => value,
  documentRef = globalThis.document,
} = {}) {
  const nodes = collectPhysicalNodes(documentRef);

  const syncPhysicalConfig = () => {
    runtimeState.styleConfig.physical = normalizePhysicalStyleConfig(runtimeState.styleConfig.physical);
    runtimeState.styleConfig.physical.contourColor = normalizeOceanFillColor(
      runtimeState.styleConfig.physical.contourColor || "#6b5947",
    );
    return runtimeState.styleConfig.physical;
  };

  const applyPhysicalPresetConfig = (preset, { preserveMode = true } = {}) => {
    const current = syncPhysicalConfig();
    const resolvedPreset = normalizePhysicalPreset(preset);
    const next = createPhysicalStyleConfigForPreset(resolvedPreset);
    runtimeState.styleConfig.physical = normalizePhysicalStyleConfig({
      ...next,
      mode: preserveMode ? current.mode : next.mode,
      contourColor: current.contourColor || next.contourColor,
    });
    return runtimeState.styleConfig.physical;
  };

  const getPhysicalPresetHint = (preset) => {
    const normalizedPreset = normalizePhysicalPreset(preset);
    if (normalizedPreset === "political_clean") {
      return t("Political Clean keeps only the clearest landform cues over political fills.", "ui");
    }
    if (normalizedPreset === "terrain_rich") {
      return t("Terrain Rich pushes the atlas and contour layer for the strongest relief read.", "ui");
    }
    return t("Balanced keeps terrain visible while staying cleaner over political fills.", "ui");
  };

  const renderPhysicalUi = () => {
    if (nodes.togglePhysical) nodes.togglePhysical.checked = !!runtimeState.showPhysical;
    const physicalConfig = syncPhysicalConfig();
    const activePhysicalPreset = normalizePhysicalPreset(physicalConfig.preset || "balanced");
    if (nodes.physicalPreset) nodes.physicalPreset.value = activePhysicalPreset;
    if (nodes.physicalPresetHint) nodes.physicalPresetHint.textContent = getPhysicalPresetHint(activePhysicalPreset);
    if (nodes.physicalMode) nodes.physicalMode.value = physicalConfig.mode;
    if (nodes.physicalOpacity) nodes.physicalOpacity.value = String(Math.round(physicalConfig.opacity * 100));
    if (nodes.physicalOpacityValue) nodes.physicalOpacityValue.textContent = `${Math.round(physicalConfig.opacity * 100)}%`;
    if (nodes.physicalAtlasIntensity) nodes.physicalAtlasIntensity.value = String(Math.round(physicalConfig.atlasIntensity * 100));
    if (nodes.physicalAtlasIntensityValue) nodes.physicalAtlasIntensityValue.textContent = `${Math.round(physicalConfig.atlasIntensity * 100)}%`;
    if (nodes.physicalRainforestEmphasis) nodes.physicalRainforestEmphasis.value = String(Math.round(physicalConfig.rainforestEmphasis * 100));
    if (nodes.physicalRainforestEmphasisValue) nodes.physicalRainforestEmphasisValue.textContent = `${Math.round(physicalConfig.rainforestEmphasis * 100)}%`;
    if (nodes.physicalContourColor) nodes.physicalContourColor.value = physicalConfig.contourColor;
    if (nodes.physicalContourOpacity) nodes.physicalContourOpacity.value = String(Math.round(physicalConfig.contourOpacity * 100));
    if (nodes.physicalContourOpacityValue) nodes.physicalContourOpacityValue.textContent = `${Math.round(physicalConfig.contourOpacity * 100)}%`;
    if (nodes.physicalMinorContours) nodes.physicalMinorContours.checked = !!physicalConfig.contourMinorVisible;
    if (nodes.physicalContourMajorWidth) nodes.physicalContourMajorWidth.value = String(Number(physicalConfig.contourMajorWidth).toFixed(2));
    if (nodes.physicalContourMajorWidthValue) nodes.physicalContourMajorWidthValue.textContent = Number(physicalConfig.contourMajorWidth).toFixed(2);
    if (nodes.physicalContourMinorWidth) nodes.physicalContourMinorWidth.value = String(Number(physicalConfig.contourMinorWidth).toFixed(2));
    if (nodes.physicalContourMinorWidthValue) nodes.physicalContourMinorWidthValue.textContent = Number(physicalConfig.contourMinorWidth).toFixed(2);
    if (nodes.physicalContourMajorInterval) nodes.physicalContourMajorInterval.value = String(Math.round(physicalConfig.contourMajorIntervalM));
    if (nodes.physicalContourMajorIntervalValue) nodes.physicalContourMajorIntervalValue.textContent = `${Math.round(physicalConfig.contourMajorIntervalM)}`;
    if (nodes.physicalContourMinorInterval) nodes.physicalContourMinorInterval.value = String(Math.round(physicalConfig.contourMinorIntervalM));
    if (nodes.physicalContourMinorIntervalValue) nodes.physicalContourMinorIntervalValue.textContent = `${Math.round(physicalConfig.contourMinorIntervalM)}`;
    if (nodes.physicalContourMajorLowReliefCutoff) nodes.physicalContourMajorLowReliefCutoff.value = String(Math.round(physicalConfig.contourMajorLowReliefCutoffM));
    if (nodes.physicalContourMajorLowReliefCutoffValue) nodes.physicalContourMajorLowReliefCutoffValue.textContent = `${Math.round(physicalConfig.contourMajorLowReliefCutoffM)}`;
    if (nodes.physicalContourMinorLowReliefCutoff) nodes.physicalContourMinorLowReliefCutoff.value = String(Math.round(physicalConfig.contourMinorLowReliefCutoffM));
    if (nodes.physicalContourMinorLowReliefCutoffValue) nodes.physicalContourMinorLowReliefCutoffValue.textContent = `${Math.round(physicalConfig.contourMinorLowReliefCutoffM)}`;
    if (nodes.physicalBlendMode) nodes.physicalBlendMode.value = physicalConfig.blendMode;
    Object.entries(nodes.physicalClassToggles).forEach(([key, element]) => {
      if (element) element.checked = physicalConfig.atlasClassVisibility?.[key] !== false;
    });
    return physicalConfig;
  };

  const bindPhysicalInput = (element, mutate, reason) => {
    if (!element || element.dataset.bound === "true") return;
    element.addEventListener("input", (event) => {
      const cfg = syncPhysicalConfig();
      mutate(cfg, event);
      renderDirty(reason);
    });
    element.dataset.bound = "true";
  };

  const bindPhysicalChange = (element, mutate, reason) => {
    if (!element || element.dataset.bound === "true") return;
    element.addEventListener("change", (event) => {
      const cfg = syncPhysicalConfig();
      mutate(cfg, event);
      renderDirty(reason);
    });
    element.dataset.bound = "true";
  };

  const bindEvents = () => {
    if (nodes.togglePhysical && nodes.togglePhysical.dataset.bound !== "true") {
      nodes.togglePhysical.checked = !!runtimeState.showPhysical;
      nodes.togglePhysical.addEventListener("change", (event) => {
        runtimeState.showPhysical = !!event.target.checked;
        if (runtimeState.showPhysical && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn(["physical-set", "physical-contours-set"], { reason: "toolbar-toggle", renderNow: true });
        }
        renderDirty("toggle-physical");
      });
      nodes.togglePhysical.dataset.bound = "true";
    }

    if (nodes.physicalPreset && nodes.physicalPreset.dataset.bound !== "true") {
      nodes.physicalPreset.addEventListener("change", (event) => {
        applyPhysicalPresetConfig(event.target.value || "balanced");
        renderPhysicalUi();
        renderDirty("physical-preset-select");
      });
      nodes.physicalPreset.dataset.bound = "true";
    }

    bindPhysicalChange(nodes.physicalMode, (cfg, event) => {
      cfg.mode = String(event.target.value || "atlas_and_contours");
    }, "physical-mode");

    bindPhysicalInput(nodes.physicalOpacity, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.5, 0, 1);
      if (nodes.physicalOpacityValue) nodes.physicalOpacityValue.textContent = `${Math.round(cfg.opacity * 100)}%`;
    }, "physical-opacity");

    bindPhysicalInput(nodes.physicalAtlasIntensity, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.atlasIntensity = clamp(Number.isFinite(value) ? value / 100 : 0.9, 0.2, 1.4);
      if (nodes.physicalAtlasIntensityValue) nodes.physicalAtlasIntensityValue.textContent = `${Math.round(cfg.atlasIntensity * 100)}%`;
    }, "physical-atlas-intensity");

    bindPhysicalInput(nodes.physicalRainforestEmphasis, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.rainforestEmphasis = clamp(Number.isFinite(value) ? value / 100 : 0.72, 0, 1);
      if (nodes.physicalRainforestEmphasisValue) nodes.physicalRainforestEmphasisValue.textContent = `${Math.round(cfg.rainforestEmphasis * 100)}%`;
    }, "physical-rainforest-emphasis");

    bindPhysicalInput(nodes.physicalContourColor, (cfg, event) => {
      cfg.contourColor = normalizeOceanFillColor(event.target.value);
    }, "physical-contour-color");

    bindPhysicalInput(nodes.physicalContourOpacity, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourOpacity = clamp(Number.isFinite(value) ? value / 100 : 0.34, 0, 1);
      if (nodes.physicalContourOpacityValue) nodes.physicalContourOpacityValue.textContent = `${Math.round(cfg.contourOpacity * 100)}%`;
    }, "physical-contour-opacity");

    bindPhysicalChange(nodes.physicalMinorContours, (cfg, event) => {
      cfg.contourMinorVisible = !!event.target.checked;
    }, "physical-contour-minor-toggle");

    bindPhysicalInput(nodes.physicalContourMajorWidth, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMajorWidth = clamp(Number.isFinite(value) ? value : 0.8, 0.2, 3);
      if (nodes.physicalContourMajorWidthValue) nodes.physicalContourMajorWidthValue.textContent = Number(cfg.contourMajorWidth).toFixed(2);
    }, "physical-contour-major-width");

    bindPhysicalInput(nodes.physicalContourMinorWidth, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMinorWidth = clamp(Number.isFinite(value) ? value : 0.45, 0.1, 2);
      if (nodes.physicalContourMinorWidthValue) nodes.physicalContourMinorWidthValue.textContent = Number(cfg.contourMinorWidth).toFixed(2);
    }, "physical-contour-minor-width");

    bindPhysicalInput(nodes.physicalContourMajorInterval, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMajorIntervalM = clamp(Number.isFinite(value) ? Math.round(value / 500) * 500 : 500, 500, 2000);
      if (nodes.physicalContourMajorIntervalValue) nodes.physicalContourMajorIntervalValue.textContent = `${Math.round(cfg.contourMajorIntervalM)}`;
    }, "physical-contour-major-interval");

    bindPhysicalInput(nodes.physicalContourMinorInterval, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMinorIntervalM = clamp(Number.isFinite(value) ? Math.round(value / 100) * 100 : 100, 100, 1000);
      if (nodes.physicalContourMinorIntervalValue) nodes.physicalContourMinorIntervalValue.textContent = `${Math.round(cfg.contourMinorIntervalM)}`;
    }, "physical-contour-minor-interval");

    bindPhysicalInput(nodes.physicalContourMajorLowReliefCutoff, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMajorLowReliefCutoffM = clamp(Number.isFinite(value) ? Math.round(value) : 200, 0, 2000);
      if (nodes.physicalContourMajorLowReliefCutoffValue) nodes.physicalContourMajorLowReliefCutoffValue.textContent = `${Math.round(cfg.contourMajorLowReliefCutoffM)}`;
    }, "physical-contour-major-low-relief-cutoff");

    bindPhysicalInput(nodes.physicalContourMinorLowReliefCutoff, (cfg, event) => {
      const value = Number(event.target.value);
      cfg.contourMinorLowReliefCutoffM = clamp(Number.isFinite(value) ? Math.round(value) : 280, 0, 2000);
      if (nodes.physicalContourMinorLowReliefCutoffValue) nodes.physicalContourMinorLowReliefCutoffValue.textContent = `${Math.round(cfg.contourMinorLowReliefCutoffM)}`;
    }, "physical-contour-minor-low-relief-cutoff");

    bindPhysicalChange(nodes.physicalBlendMode, (cfg, event) => {
      cfg.blendMode = String(event.target.value || "source-over");
    }, "physical-blend");

    Object.entries(nodes.physicalClassToggles).forEach(([key, element]) => {
      if (!element || element.dataset.bound === "true") return;
      element.addEventListener("change", (event) => {
        const cfg = syncPhysicalConfig();
        cfg.atlasClassVisibility = {
          ...(cfg.atlasClassVisibility || {}),
          [key]: !!event.target.checked,
        };
        renderDirty(`physical-class-${key}`);
      });
      element.dataset.bound = "true";
    });
  };

  return {
    applyPhysicalPresetConfig,
    bindEvents,
    getPhysicalPresetHint,
    renderPhysicalUi,
    syncPhysicalConfig,
  };
}
