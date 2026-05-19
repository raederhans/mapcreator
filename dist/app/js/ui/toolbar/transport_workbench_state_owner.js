// Transport workbench state owner.
// Owns workbench-local UI state normalization and mutation helpers.

import {
  createDefaultTransportWorkbenchDisplayConfig,
  normalizeTransportWorkbenchDisplayConfig,
  normalizeTransportWorkbenchUiState,
} from "../../core/state.js";
import {
  getDefaultMainMapPackIdForFamily,
  getTargetMainMapPackMeta,
} from "../../core/transport_pack_resolver.js";
import {
  TRANSPORT_WORKBENCH_FAMILIES,
  TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS,
  TRANSPORT_WORKBENCH_BASELINE_CONFIGS,
  TRANSPORT_WORKBENCH_SECTION_DEFAULTS,
} from "./transport_workbench_descriptor.js";
import {
  TRANSPORT_WORKBENCH_RUNTIME_FAMILY_IDS,
  mapTransportWorkbenchMaxLevelToLabelLevel,
  normalizeAirportTransportWorkbenchConfig,
  normalizeEnergyFacilityTransportWorkbenchConfig,
  normalizeIndustrialTransportWorkbenchConfig,
  normalizeLogisticsHubTransportWorkbenchConfig,
  normalizeMineralResourceTransportWorkbenchConfig,
  normalizePortTransportWorkbenchConfig,
  normalizeRailTransportWorkbenchConfig,
  normalizeRoadTransportWorkbenchConfig,
  normalizeTransportWorkbenchFamily,
  normalizeTransportWorkbenchInspectorTab,
  normalizeTransportWorkbenchLayerOrder,
} from "./transport_workbench_config_owner.js";

const clonePlainObject = (value) => JSON.parse(JSON.stringify(value || {}));

function normalizeTransportWorkbenchFamilyConfig(familyId, value) {
  if (familyId === "road") return normalizeRoadTransportWorkbenchConfig(value);
  if (familyId === "rail") return normalizeRailTransportWorkbenchConfig(value);
  if (familyId === "airport") return normalizeAirportTransportWorkbenchConfig(value);
  if (familyId === "port") return normalizePortTransportWorkbenchConfig(value);
  if (familyId === "mineral_resources") return normalizeMineralResourceTransportWorkbenchConfig(value);
  if (familyId === "energy_facilities") return normalizeEnergyFacilityTransportWorkbenchConfig(value);
  if (familyId === "industrial_zones") return normalizeIndustrialTransportWorkbenchConfig(value);
  if (familyId === "logistics_hubs") return normalizeLogisticsHubTransportWorkbenchConfig(value);
  return value && typeof value === "object" ? { ...value } : {};
}

function resolveTransportWorkbenchPackIdForFamily(uiState, familyId) {
  const candidatePackId = String(
    uiState?.activePackIdByFamily?.[familyId] || uiState?.activePackId || ""
  ).trim().toLowerCase();
  const candidatePackMeta = getTargetMainMapPackMeta(candidatePackId);
  if (candidatePackMeta?.family === familyId) return candidatePackMeta.packId;
  return getDefaultMainMapPackIdForFamily(familyId);
}

function writeTransportWorkbenchFamilyConfig(uiState, familyId, config) {
  uiState.familyConfigs[familyId] = normalizeTransportWorkbenchFamilyConfig(familyId, config);
  return uiState.familyConfigs[familyId];
}

export function createTransportWorkbenchStateOwner(runtimeState) {
  const ensureUiState = () => {
    const previousUiState = runtimeState.transportWorkbenchUi;
    const previousLayerOrder = Array.isArray(previousUiState?.layerOrder)
      ? [...previousUiState.layerOrder]
      : null;
    const normalizedUiState = normalizeTransportWorkbenchUiState(previousUiState);
    // Keep the existing object reference stable for bound controls and preview listeners.
    if (!previousUiState || typeof previousUiState !== "object") {
      runtimeState.transportWorkbenchUi = normalizedUiState;
    } else {
      Object.assign(previousUiState, normalizedUiState);
      runtimeState.transportWorkbenchUi = previousUiState;
    }
    const uiState = runtimeState.transportWorkbenchUi;
    uiState.open = !!uiState.open;
    uiState.activeFamily = normalizeTransportWorkbenchFamily(uiState.activeFamily);
    if (!uiState.activePackIdByFamily || typeof uiState.activePackIdByFamily !== "object") {
      uiState.activePackIdByFamily = {};
    }
    const activePackId = resolveTransportWorkbenchPackIdForFamily(uiState, uiState.activeFamily);
    uiState.activePackId = activePackId;
    uiState.activePackIdByFamily[uiState.activeFamily] = activePackId;
    const activePackMeta = getTargetMainMapPackMeta(activePackId);
    if (activePackMeta?.country) uiState.sampleCountry = activePackMeta.country;
    if (!uiState.previewCamera || typeof uiState.previewCamera !== "object") {
      uiState.previewCamera = {};
    }
    uiState.previewCamera.scale = Number(uiState.previewCamera.scale) || 1;
    uiState.previewCamera.translateX = Number(uiState.previewCamera.translateX) || 0;
    uiState.previewCamera.translateY = Number(uiState.previewCamera.translateY) || 0;
    uiState.compareHeld = !!uiState.compareHeld;
    uiState.activeInspectorTab = normalizeTransportWorkbenchInspectorTab(uiState.activeInspectorTab);
    uiState.layerOrder = normalizeTransportWorkbenchLayerOrder(previousLayerOrder || uiState.layerOrder);
    if (!uiState.familyConfigs || typeof uiState.familyConfigs !== "object") {
      uiState.familyConfigs = {};
    }
    if (!uiState.displayConfigs || typeof uiState.displayConfigs !== "object") {
      uiState.displayConfigs = {};
    }
    TRANSPORT_WORKBENCH_RUNTIME_FAMILY_IDS.forEach((familyId) => {
      uiState.familyConfigs[familyId] = normalizeTransportWorkbenchFamilyConfig(familyId, uiState.familyConfigs[familyId]);
      uiState.displayConfigs[familyId] = normalizeTransportWorkbenchDisplayConfig(
        uiState.displayConfigs[familyId],
        familyId
      );
    });
    if (!uiState.sectionOpen || typeof uiState.sectionOpen !== "object") {
      uiState.sectionOpen = {};
    }
    TRANSPORT_WORKBENCH_RUNTIME_FAMILY_IDS.forEach((familyId) => {
      const defaults = TRANSPORT_WORKBENCH_SECTION_DEFAULTS[familyId];
      const source = uiState.sectionOpen[familyId] && typeof uiState.sectionOpen[familyId] === "object"
        ? uiState.sectionOpen[familyId]
        : {};
      uiState.sectionOpen[familyId] = Object.fromEntries(
        Object.entries(defaults).map(([sectionKey, defaultValue]) => [
          sectionKey,
          source[sectionKey] !== undefined ? !!source[sectionKey] : defaultValue,
        ])
      );
    });
    uiState.shellPhase = "road-live-preview";
    uiState.restoreLeftDrawer = !!uiState.restoreLeftDrawer;
    uiState.restoreRightDrawer = !!uiState.restoreRightDrawer;
    return uiState;
  };

  const getFamilyMeta = () => {
    const uiState = ensureUiState();
    const activeFamily = normalizeTransportWorkbenchFamily(uiState.activeFamily);
    return TRANSPORT_WORKBENCH_FAMILIES.find((family) => family.id === activeFamily) || TRANSPORT_WORKBENCH_FAMILIES[0];
  };

  const getWorkingConfig = (familyId, { baseline = false } = {}) => {
    const uiState = ensureUiState();
    if (baseline) {
      return TRANSPORT_WORKBENCH_BASELINE_CONFIGS[familyId]
        ? clonePlainObject(TRANSPORT_WORKBENCH_BASELINE_CONFIGS[familyId])
        : null;
    }
    return uiState.familyConfigs?.[familyId] || null;
  };

  const getDisplayConfig = (familyId, { baseline = false } = {}) => {
    const uiState = ensureUiState();
    if (!TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(familyId) || baseline) {
      return createDefaultTransportWorkbenchDisplayConfig(familyId);
    }
    return normalizeTransportWorkbenchDisplayConfig(uiState.displayConfigs?.[familyId], familyId);
  };

  const buildResolvedConfig = (familyId, familyConfig, displayConfig, activePackId) => {
    if (!TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(familyId)) {
      return { ...(familyConfig || {}), activePackId };
    }
    const resolvedDisplayConfig = normalizeTransportWorkbenchDisplayConfig(displayConfig, familyId);
    return {
      ...(familyConfig || {}),
      activePackId,
      displayConfig: resolvedDisplayConfig,
      displayMode: resolvedDisplayConfig.mode,
      displayPreset: resolvedDisplayConfig.preset,
      aggregationAlgorithm: resolvedDisplayConfig.aggregation.algorithm,
      aggregationAutoSwitch: !!resolvedDisplayConfig.aggregation.autoSwitch,
      aggregationCellSizePx: Number(resolvedDisplayConfig.aggregation.thresholds?.cellSizePx || 44),
      aggregationClusterRadiusPx: Number(resolvedDisplayConfig.aggregation.thresholds?.clusterRadiusPx || 48),
      labelBudget: Number(resolvedDisplayConfig.labels?.budget || 8),
      labelSeparation: Number(resolvedDisplayConfig.labels?.separationStrength || 1),
      labelLevel: mapTransportWorkbenchMaxLevelToLabelLevel(resolvedDisplayConfig.labels?.maxLevel),
      labelAllowAggregation: !!resolvedDisplayConfig.labels?.allowAggregation,
      dominantCategoryThreshold: Number(resolvedDisplayConfig.labels?.dominantCategoryThreshold || 0.62),
      mixedCategoryMode: resolvedDisplayConfig.labels?.mixedCategoryMode || "summary",
      coverageTier: resolvedDisplayConfig.coverage || "default",
    };
  };

  const resetSectionState = () => {
    const uiState = ensureUiState();
    uiState.sectionOpen = Object.fromEntries(
      TRANSPORT_WORKBENCH_RUNTIME_FAMILY_IDS.map((familyId) => [
        familyId,
        { ...TRANSPORT_WORKBENCH_SECTION_DEFAULTS[familyId] },
      ])
    );
    return uiState.sectionOpen;
  };

  const setCompareHeld = (nextHeld) => {
    const uiState = ensureUiState();
    const family = getFamilyMeta();
    if (!family.supportsDetailedControls) return false;
    const normalized = !!nextHeld;
    if (uiState.compareHeld === normalized) return false;
    uiState.compareHeld = normalized;
    return true;
  };

  const updateFamilyConfig = (familyId, key, nextValue, { appendValue = null } = {}) => {
    const uiState = ensureUiState();
    const family = TRANSPORT_WORKBENCH_FAMILIES.find((entry) => entry.id === familyId);
    if (!family?.supportsDetailedControls || uiState.compareHeld) return false;
    const current = clonePlainObject(getWorkingConfig(familyId) || {});
    if (appendValue !== null) {
      const currentValues = Array.isArray(current[key]) ? [...current[key]] : [];
      const index = currentValues.indexOf(appendValue);
      if (nextValue) {
        if (index === -1) currentValues.push(appendValue);
      } else if (index !== -1) {
        currentValues.splice(index, 1);
      }
      current[key] = currentValues;
    } else {
      current[key] = nextValue;
    }
    writeTransportWorkbenchFamilyConfig(uiState, familyId, current);
    return true;
  };

  const updateDisplayConfig = (familyId, updateFn) => {
    const uiState = ensureUiState();
    if (!TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(familyId) || typeof updateFn !== "function") return false;
    const draft = clonePlainObject(getDisplayConfig(familyId));
    updateFn(draft);
    uiState.displayConfigs[familyId] = normalizeTransportWorkbenchDisplayConfig(draft, familyId);
    return true;
  };

  const toggleSection = (familyId, sectionKey, nextOpen) => {
    const uiState = ensureUiState();
    if (!uiState.sectionOpen[familyId]) {
      uiState.sectionOpen[familyId] = {};
    }
    uiState.sectionOpen[familyId][sectionKey] = !!nextOpen;
    return uiState.sectionOpen[familyId][sectionKey];
  };

  const setActivePackId = (packId) => {
    const uiState = ensureUiState();
    const normalizedPackId = String(packId || "").trim().toLowerCase();
    const meta = getTargetMainMapPackMeta(normalizedPackId);
    if (!meta) return null;
    uiState.activeFamily = meta.family;
    if (!uiState.activePackIdByFamily || typeof uiState.activePackIdByFamily !== "object") {
      uiState.activePackIdByFamily = {};
    }
    uiState.activePackIdByFamily[meta.family] = meta.packId;
    uiState.activePackId = meta.packId;
    uiState.sampleCountry = meta.country;
    return meta;
  };

  const setActiveFamily = (familyId) => {
    const uiState = ensureUiState();
    const activeFamily = normalizeTransportWorkbenchFamily(familyId || "road");
    uiState.activeFamily = activeFamily;
    const activePackId = resolveTransportWorkbenchPackIdForFamily(uiState, activeFamily);
    uiState.activePackId = activePackId;
    if (!uiState.activePackIdByFamily || typeof uiState.activePackIdByFamily !== "object") {
      uiState.activePackIdByFamily = {};
    }
    uiState.activePackIdByFamily[activeFamily] = activePackId;
    uiState.compareHeld = false;
    const activePackMeta = getTargetMainMapPackMeta(activePackId);
    if (activePackMeta?.country) uiState.sampleCountry = activePackMeta.country;
    return activeFamily;
  };

  const setInspectorTab = (tabId) => {
    const uiState = ensureUiState();
    uiState.activeInspectorTab = normalizeTransportWorkbenchInspectorTab(tabId || "inspect");
    return uiState.activeInspectorTab;
  };

  const prepareOpenState = ({ restoreLeftDrawer = false, restoreRightDrawer = false } = {}) => {
    const uiState = ensureUiState();
    uiState.restoreLeftDrawer = !!restoreLeftDrawer;
    uiState.restoreRightDrawer = !!restoreRightDrawer;
    uiState.compareHeld = false;
    return uiState;
  };

  const setOpenState = (nextOpen) => {
    const uiState = ensureUiState();
    uiState.open = !!nextOpen;
    return uiState;
  };

  const prepareCloseState = () => {
    const uiState = ensureUiState();
    const restoreState = {
      restoreLeftDrawer: !!uiState.restoreLeftDrawer,
      restoreRightDrawer: !!uiState.restoreRightDrawer,
    };
    uiState.compareHeld = false;
    uiState.restoreLeftDrawer = false;
    uiState.restoreRightDrawer = false;
    return restoreState;
  };

  const moveLayerOrder = (draggedFamilyId, targetFamilyId) => {
    const uiState = ensureUiState();
    const draggedId = normalizeTransportWorkbenchFamily(draggedFamilyId);
    const targetId = normalizeTransportWorkbenchFamily(targetFamilyId);
    if (!draggedId || draggedId === targetId) return false;
    const nextOrder = [...uiState.layerOrder];
    const draggedIndex = nextOrder.indexOf(draggedId);
    const targetIndex = nextOrder.indexOf(targetId);
    if (draggedIndex === -1 || targetIndex === -1) return false;
    nextOrder.splice(draggedIndex, 1);
    nextOrder.splice(targetIndex, 0, draggedId);
    uiState.layerOrder = normalizeTransportWorkbenchLayerOrder(nextOrder);
    return true;
  };

  return {
    buildResolvedConfig,
    ensureUiState,
    getDisplayConfig,
    getFamilyMeta,
    getWorkingConfig,
    moveLayerOrder,
    prepareCloseState,
    prepareOpenState,
    resetSectionState,
    setActiveFamily,
    setActivePackId,
    setCompareHeld,
    setInspectorTab,
    setOpenState,
    toggleSection,
    updateDisplayConfig,
    updateFamilyConfig,
  };
}
