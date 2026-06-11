import {
  INTENSITY_FIELD_GRID,
  bumpPhysicalIntensityFieldRevision,
  createPhysicalStyleConfigForPreset,
  normalizePhysicalIntensityFieldState,
  normalizePhysicalPreset,
  normalizePhysicalStyleConfig,
  stampIntensityBrush,
  updateIntensityFieldChannel,
} from "../../core/state.js";
import {
  captureHistoryState as captureRuntimeHistoryState,
  pushHistoryEntry as pushRuntimeHistoryEntry,
} from "../../core/history_manager.js";

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
    physicalIntensityFieldEnabled: documentRef.getElementById("physicalIntensityFieldEnabled"),
    physicalIntensityFieldWeight: documentRef.getElementById("physicalIntensityFieldWeight"),
    physicalIntensityFieldRadius: documentRef.getElementById("physicalIntensityFieldRadius"),
    physicalIntensityFieldStampCenterBtn: documentRef.getElementById("physicalIntensityFieldStampCenterBtn"),
    physicalIntensityFieldAddCenterBtn: documentRef.getElementById("physicalIntensityFieldAddCenterBtn"),
    physicalIntensityFieldClearBtn: documentRef.getElementById("physicalIntensityFieldClearBtn"),
    physicalIntensityFieldPointCount: documentRef.getElementById("physicalIntensityFieldPointCount"),
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
    physicalIntensityFieldWeightValue: documentRef.getElementById("physicalIntensityFieldWeightValue"),
    physicalIntensityFieldRadiusValue: documentRef.getElementById("physicalIntensityFieldRadiusValue"),
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
  captureHistoryState = captureRuntimeHistoryState,
  pushHistoryEntry = pushRuntimeHistoryEntry,
} = {}) {
  const nodes = collectPhysicalNodes(documentRef);

  const syncPhysicalConfig = () => {
    runtimeState.styleConfig.physical = normalizePhysicalStyleConfig(runtimeState.styleConfig.physical);
    runtimeState.styleConfig.physical.contourColor = normalizeOceanFillColor(
      runtimeState.styleConfig.physical.contourColor || "#6b5947",
    );
    return runtimeState.styleConfig.physical;
  };

  const syncPhysicalIntensityField = () => {
    runtimeState.physicalIntensityField = normalizePhysicalIntensityFieldState(runtimeState.physicalIntensityField);
    return runtimeState.physicalIntensityField;
  };

  const getPhysicalIntensityDraft = () => {
    const weightValue = Number(nodes.physicalIntensityFieldWeight?.value);
    const radiusValue = Number(nodes.physicalIntensityFieldRadius?.value);
    return {
      weight: clamp(Number.isFinite(weightValue) ? weightValue / 100 : 1, -2, 2),
      radiusKm: clamp(Number.isFinite(radiusValue) ? radiusValue : 500, 25, 5000),
    };
  };

  const renderPhysicalIntensityFieldUi = () => {
    const fieldState = syncPhysicalIntensityField();
    const firstPoint = fieldState.points[0] || {};
    const weight = Number.isFinite(Number(firstPoint.weight)) ? Number(firstPoint.weight) : 1;
    const radiusKm = Number.isFinite(Number(firstPoint.radiusKm)) ? Number(firstPoint.radiusKm) : 500;
    if (nodes.physicalIntensityFieldEnabled) nodes.physicalIntensityFieldEnabled.checked = !!fieldState.enabled;
    if (nodes.physicalIntensityFieldWeight) nodes.physicalIntensityFieldWeight.value = String(Math.round(weight * 100));
    if (nodes.physicalIntensityFieldWeightValue) nodes.physicalIntensityFieldWeightValue.textContent = `${Math.round(weight * 100)}%`;
    if (nodes.physicalIntensityFieldRadius) nodes.physicalIntensityFieldRadius.value = String(Math.round(radiusKm));
    if (nodes.physicalIntensityFieldRadiusValue) nodes.physicalIntensityFieldRadiusValue.textContent = `${Math.round(radiusKm)} km`;
    if (nodes.physicalIntensityFieldPointCount) nodes.physicalIntensityFieldPointCount.textContent = String(fieldState.points.length);
    return fieldState;
  };

  const commitPhysicalIntensityField = (mutate, reason, { clearAtlasGrid = false } = {}) => {
    const before = captureHistoryState({
      intensityFieldChannels: ["physicalAtlas"],
      physicalIntensityField: true,
    });
    const current = syncPhysicalIntensityField();
    mutate(current);
    runtimeState.physicalIntensityField = bumpPhysicalIntensityFieldRevision(current);
    runtimeState.intensityFields = updateIntensityFieldChannel(runtimeState.intensityFields, "physicalAtlas", (channel) => {
      channel.enabled = !!runtimeState.physicalIntensityField.enabled;
      if (clearAtlasGrid) {
        channel.grid.base.fill(INTENSITY_FIELD_GRID.neutral);
      }
      // 面板旧状态负责可读点位，intensityFields.physicalAtlas 负责渲染；同一次提交必须同步两边。
      channel.points = runtimeState.physicalIntensityField.points.map((point) => ({
        id: point.id,
        lon: point.lon,
        lat: point.lat,
        strength: clamp(1 + (Number(point.weight || 0) * 0.35), 0, 2),
        radiusDeg: clamp(Number(point.radiusKm || 500) / 111, 0.25, 30),
        falloff: point.falloff,
      }));
    });
    const after = captureHistoryState({
      intensityFieldChannels: ["physicalAtlas"],
      physicalIntensityField: true,
    });
    pushHistoryEntry({
      label: "Physical intensity field",
      before,
      after,
      meta: {
        reason,
        affectsPhysicalIntensityField: true,
      },
    });
    renderPhysicalIntensityFieldUi();
    renderDirty(reason);
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
    renderPhysicalIntensityFieldUi();
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

    if (nodes.physicalIntensityFieldEnabled && nodes.physicalIntensityFieldEnabled.dataset.bound !== "true") {
      nodes.physicalIntensityFieldEnabled.addEventListener("change", (event) => {
        commitPhysicalIntensityField((fieldState) => {
          fieldState.enabled = !!event.target.checked;
        }, "physical-intensity-field-enabled");
      });
      nodes.physicalIntensityFieldEnabled.dataset.bound = "true";
    }

    if (nodes.physicalIntensityFieldWeight && nodes.physicalIntensityFieldWeight.dataset.bound !== "true") {
      nodes.physicalIntensityFieldWeight.addEventListener("input", () => {
        const draft = getPhysicalIntensityDraft();
        if (nodes.physicalIntensityFieldWeightValue) nodes.physicalIntensityFieldWeightValue.textContent = `${Math.round(draft.weight * 100)}%`;
      });
      nodes.physicalIntensityFieldWeight.dataset.bound = "true";
    }

    if (nodes.physicalIntensityFieldRadius && nodes.physicalIntensityFieldRadius.dataset.bound !== "true") {
      nodes.physicalIntensityFieldRadius.addEventListener("input", () => {
        const draft = getPhysicalIntensityDraft();
        if (nodes.physicalIntensityFieldRadiusValue) nodes.physicalIntensityFieldRadiusValue.textContent = `${Math.round(draft.radiusKm)} km`;
      });
      nodes.physicalIntensityFieldRadius.dataset.bound = "true";
    }

    if (nodes.physicalIntensityFieldStampCenterBtn && nodes.physicalIntensityFieldStampCenterBtn.dataset.bound !== "true") {
      nodes.physicalIntensityFieldStampCenterBtn.addEventListener("click", () => {
        const before = captureHistoryState({
          intensityFieldChannels: ["physicalAtlas"],
          physicalIntensityField: true,
        });
        const draft = getPhysicalIntensityDraft();
        const current = syncPhysicalIntensityField();
        current.enabled = true;
        runtimeState.physicalIntensityField = bumpPhysicalIntensityFieldRevision(current);
        runtimeState.intensityFields = updateIntensityFieldChannel(runtimeState.intensityFields, "physicalAtlas", (channel) => {
          channel.enabled = true;
          stampIntensityBrush(channel, {
            lon: 0,
            lat: 0,
            radiusDeg: clamp(draft.radiusKm / 111, 0.25, 30),
            strength: clamp(1 + (draft.weight * 0.35), 0, 2),
          });
        });
        const after = captureHistoryState({
          intensityFieldChannels: ["physicalAtlas"],
          physicalIntensityField: true,
        });
        pushHistoryEntry({
          label: "Physical intensity brush",
          before,
          after,
          meta: {
            reason: "physical-intensity-field-stamp-brush",
            affectsIntensityField: true,
          },
        });
        if (nodes.physicalIntensityFieldEnabled) nodes.physicalIntensityFieldEnabled.checked = true;
        if (nodes.physicalIntensityFieldPointCount) {
          nodes.physicalIntensityFieldPointCount.textContent = String(runtimeState.physicalIntensityField.points.length);
        }
        renderDirty("physical-intensity-field-stamp-brush");
      });
      nodes.physicalIntensityFieldStampCenterBtn.dataset.bound = "true";
    }

    if (nodes.physicalIntensityFieldAddCenterBtn && nodes.physicalIntensityFieldAddCenterBtn.dataset.bound !== "true") {
      nodes.physicalIntensityFieldAddCenterBtn.addEventListener("click", () => {
        commitPhysicalIntensityField((fieldState) => {
          const draft = getPhysicalIntensityDraft();
          fieldState.enabled = true;
          fieldState.points = [
            ...fieldState.points,
            {
              id: `point-${fieldState.points.length + 1}`,
              lon: 0,
              lat: 0,
              weight: draft.weight,
              radiusKm: draft.radiusKm,
              falloff: "smooth",
            },
          ];
        }, "physical-intensity-field-add-point");
      });
      nodes.physicalIntensityFieldAddCenterBtn.dataset.bound = "true";
    }

    if (nodes.physicalIntensityFieldClearBtn && nodes.physicalIntensityFieldClearBtn.dataset.bound !== "true") {
      nodes.physicalIntensityFieldClearBtn.addEventListener("click", () => {
        commitPhysicalIntensityField((fieldState) => {
          fieldState.points = [];
        }, "physical-intensity-field-clear", { clearAtlasGrid: true });
      });
      nodes.physicalIntensityFieldClearBtn.dataset.bound = "true";
    }

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
    renderPhysicalIntensityFieldUi,
    renderPhysicalUi,
    syncPhysicalIntensityField,
    syncPhysicalConfig,
  };
}
