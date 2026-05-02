// Scenario apply pipeline.
// 这个模块只负责“准备 staged apply runtimeState”和“把 staged runtimeState 落到 runtime runtimeState”。
// scenario_manager.js 继续保留事务协调、回滚、post-apply、入口控制。

import { buildScenarioOwnerColorMapDetails } from "./palette_runtime_bridge.js";
import { commitScenarioActivationRuntimeState } from "./state/scenario_runtime_state.js";

function createScenarioApplyPipeline({
  runtimeState,
  countryNames,
  normalizeScenarioId,
  scenarioSupportsChunkedRuntime,
  scenarioBundleUsesChunkedLayer,
  scenarioBundleHasChunkedData,
  ensureScenarioDetailTopologyLoaded,
  hasUsablePoliticalTopology,
  scenarioNeedsDetailTopology,
  getScenarioDisplayName,
  getScenarioTargetPaletteId,
  hasActiveScenarioPaletteLoaded,
  applyActivePaletteState,
  setActivePaletteSource,
  getScenarioDefaultCountryCode,
  getScenarioMapSemanticMode,
  buildScenarioReleasableIndex,
  getScenarioReleasableCountries,
  normalizeScenarioCoreMap,
  normalizeScenarioDistrictGroupsPayload,
  getActiveScenarioMergedChunkLayerPayload,
  getScenarioDecodedCollection,
  getScenarioTopologyFeatureCollection,
  getScenarioNameMap,
  getMissingScenarioNameTags,
  getScenarioFixedOwnerColors,
  buildHoi4FarEastSovietOwnerBackfill,
  buildScenarioRuntimeVersionTag,
  mergeReleasableCatalogs,
  buildScenarioDistrictGroupByFeatureId,
  syncScenarioLocalizationState,
  applyBlankScenarioPresentationDefaults,
  setScenarioAuditUiState,
  getScenarioBaselineHashFromBundle,
  markLegacyColorStateDirty,
  syncScenarioInspectorSelection,
  disableScenarioParentBorders,
  applyScenarioPaintMode,
  syncScenarioOceanFillForActivation,
  applyScenarioPerformanceHints,
  scheduleScenarioChunkRefresh,
  resetScenarioChunkRuntimeState,
  ensureRuntimeChunkLoadState,
  recalculateScenarioOwnerControllerDiffCount,
  hasRenderableScenarioPoliticalTopology,
  normalizeScenarioFeatureCollection,
  cloneScenarioStateValue,
} = {}) {
  function prepareScenarioActivationContext(bundle) {
    const scenarioParentBorderEnabledBeforeActivate =
      runtimeState.scenarioParentBorderEnabledBeforeActivate === null && !runtimeState.activeScenarioId
        ? { ...(runtimeState.parentBorderEnabledByCountry || {}) }
        : cloneScenarioStateValue(runtimeState.scenarioParentBorderEnabledBeforeActivate);
    const scenarioDisplaySettingsBeforeActivate =
      !runtimeState.activeScenarioId && !runtimeState.scenarioDisplaySettingsBeforeActivate
        ? {
          renderProfile: String(runtimeState.renderProfile || "").trim().toLowerCase() || "auto",
          dynamicBordersEnabled: runtimeState.dynamicBordersEnabled !== false,
          parentBordersVisible: runtimeState.parentBordersVisible !== false,
          showWaterRegions: runtimeState.showWaterRegions !== false,
          showScenarioSpecialRegions: runtimeState.showScenarioSpecialRegions !== false,
          showScenarioReliefOverlays: runtimeState.showScenarioReliefOverlays !== false,
        }
        : cloneScenarioStateValue(runtimeState.scenarioDisplaySettingsBeforeActivate);
    const scenarioOceanFillBeforeActivate = runtimeState.scenarioOceanFillBeforeActivate === null
      ? String(runtimeState.styleConfig?.ocean?.fillColor || "").trim().toLowerCase()
      : runtimeState.scenarioOceanFillBeforeActivate;
    return {
      scenarioParentBorderEnabledBeforeActivate,
      scenarioDisplaySettingsBeforeActivate,
      scenarioOceanFillBeforeActivate,
      scenarioManifest: bundle.manifest || null,
    };
  }

  function commitScenarioActivationState(bundle, staged) {
    const runtimePoliticalTopology = staged.mapSemanticMode === "blank"
      ? (staged.runtimeTopologyPayload || null)
      : (
        hasRenderableScenarioPoliticalTopology(staged.runtimeTopologyPayload)
          ? staged.runtimeTopologyPayload
          : (runtimeState.defaultRuntimePoliticalTopology || runtimeState.runtimePoliticalTopology || null)
      );
    const scenarioPoliticalChunkData = scenarioSupportsChunkedRuntime(bundle)
      ? null
      : (
        normalizeScenarioFeatureCollection(
          getActiveScenarioMergedChunkLayerPayload("political", staged.scenarioId)
        ) || null
      );
    const runtimeVersionTag = String(staged.runtimeVersionTag || "");
    const scenarioLandMaskData = staged.scenarioLandMaskFromTopology || null;
    const scenarioContextLandMaskData = staged.scenarioContextLandMaskFromTopology || null;
    const scenarioWaterRegionsData = staged.scenarioWaterRegionsFromTopology || null;
    const scenarioDistrictGroupByFeatureId = buildScenarioDistrictGroupByFeatureId(staged.districtGroupsPayload);
    syncScenarioLocalizationState({
      cityOverridesPayload: staged.mapSemanticMode === "blank" ? null : (staged.scenarioCityOverridesPayload || null),
      geoLocalePatchPayload: staged.mapSemanticMode === "blank" ? null : (bundle.geoLocalePatchPayload || null),
    });
    if (staged.mapSemanticMode === "blank") {
      applyBlankScenarioPresentationDefaults({ resetLocalization: false });
    }
    const releasableCatalog = mergeReleasableCatalogs(runtimeState.defaultReleasableCatalog, bundle.releasableCatalog);
    setScenarioAuditUiState({
      loading: false,
      loadedForScenarioId: bundle.auditPayload ? staged.scenarioId : "",
      errorMessage: "",
    });
    const fixedOwnerColors = { ...staged.scenarioColorMap };
    if (staged.coarseColorMap && typeof staged.coarseColorMap === "object") {
      Object.entries(staged.coarseColorMap).forEach(([iso2, color]) => {
        if (iso2 && color && !fixedOwnerColors[iso2]) {
          fixedOwnerColors[iso2] = color;
        }
      });
    }
    commitScenarioActivationRuntimeState(runtimeState, {
      scenarioParentBorderEnabledBeforeActivate:
        cloneScenarioStateValue(staged.scenarioParentBorderEnabledBeforeActivate),
      scenarioDisplaySettingsBeforeActivate:
        cloneScenarioStateValue(staged.scenarioDisplaySettingsBeforeActivate),
      scenarioOceanFillBeforeActivate: staged.scenarioOceanFillBeforeActivate,
      activeScenarioId: staged.scenarioId,
      scenarioBorderMode: "scenario_owner_only",
      activeScenarioManifest: staged.scenarioManifest,
      mapSemanticMode: staged.mapSemanticMode,
      scenarioCountriesByTag: staged.countryMap,
      activeScenarioMeshPack: bundle.meshPackPayload || null,
      scenarioRuntimeTopologyData: staged.runtimeTopologyPayload,
      runtimePoliticalTopology,
      scenarioPoliticalChunkData,
      runtimePoliticalMetaSeed: bundle.runtimePoliticalMeta || null,
      runtimePoliticalFeatureCollectionSeed: getScenarioDecodedCollection(bundle, "politicalData") || null,
      scenarioLandMaskData,
      scenarioContextLandMaskData,
      scenarioWaterRegionsData,
      scenarioRuntimeTopologyVersionTag: runtimeVersionTag,
      scenarioLandMaskVersionTag: scenarioLandMaskData ? runtimeVersionTag : "",
      scenarioContextLandMaskVersionTag: scenarioContextLandMaskData ? runtimeVersionTag : "",
      scenarioWaterOverlayVersionTag: scenarioWaterRegionsData ? runtimeVersionTag : "",
      scenarioSpecialRegionsData: staged.scenarioSpecialRegionsFromTopology || bundle.specialRegionsPayload || null,
      scenarioReliefOverlaysData: staged.scenarioReliefOverlaysPayload || null,
      scenarioReliefOverlayRevision: (Number(runtimeState.scenarioReliefOverlayRevision) || 0) + 1,
      scenarioDistrictGroupsData: staged.districtGroupsPayload,
      scenarioDistrictGroupByFeatureId,
      releasableCatalog,
      scenarioReleasableIndex: staged.releasableIndex,
      scenarioAudit: bundle.auditPayload || null,
      scenarioImportAudit: null,
      scenarioBaselineHash: getScenarioBaselineHashFromBundle(bundle),
      scenarioBaselineOwnersByFeatureId: staged.resolvedOwners,
      scenarioControllersByFeatureId: staged.controllers,
      scenarioAutoShellOwnerByFeatureId: {},
      scenarioAutoShellControllerByFeatureId: {},
      scenarioBaselineControllersByFeatureId: staged.controllers,
      scenarioBaselineCoresByFeatureId: staged.cores,
      scenarioShellOverlayRevision: (Number(runtimeState.scenarioShellOverlayRevision) || 0) + 1,
      scenarioControllerRevision: (Number(runtimeState.scenarioControllerRevision) || 0) + 1,
      scenarioViewMode: "ownership",
      countryNames: staged.mapSemanticMode === "blank"
        ? countryNames
        : staged.scenarioNameMap,
      sovereigntyByFeatureId: staged.resolvedOwners,
      sovereigntyInitialized: false,
      visualOverrides: {},
      featureOverrides: {},
      scenarioGeneratedColorTags: staged.scenarioGeneratedColorTags || [],
      scenarioFixedOwnerColors: fixedOwnerColors,
      sovereignBaseColors: fixedOwnerColors,
      countryBaseColors: fixedOwnerColors,
      activeSovereignCode: staged.mapSemanticMode === "blank" ? "" : staged.defaultCountryCode,
      selectedWaterRegionId: "",
      selectedSpecialRegionId: "",
      hoveredWaterRegionId: null,
      hoveredSpecialRegionId: null,
    });
    markLegacyColorStateDirty();
  }

  function commitScenarioChunkRuntimeState(bundle, staged) {
    runtimeState.scheduleScenarioChunkRefreshFn = scenarioSupportsChunkedRuntime(bundle) ? scheduleScenarioChunkRefresh : null;
    if (scenarioSupportsChunkedRuntime(bundle)) {
      resetScenarioChunkRuntimeState({ scenarioId: staged.scenarioId });
      const chunkIds = Object.keys(bundle.chunkPayloadCacheById || {});
      if (chunkIds.length) {
        runtimeState.activeScenarioChunks.loadedChunkIds = [...chunkIds];
        runtimeState.activeScenarioChunks.payloadByChunkId = { ...(bundle.chunkPayloadCacheById || {}) };
        runtimeState.activeScenarioChunks.lruChunkIds = [...chunkIds];
      }
      ensureRuntimeChunkLoadState().shellStatus = chunkIds.length ? "ready" : "loading";
      ensureRuntimeChunkLoadState().registryStatus = scenarioBundleHasChunkedData(bundle) ? "ready" : "idle";
      return;
    }
    resetScenarioChunkRuntimeState();
  }

  function normalizeScenarioIso2Code(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
  }

  function buildScenarioCoarseColorMap({
    startupApplySeed,
    countryMap,
    scenarioColorMap,
  }) {
    if (startupApplySeed?.coarse_color_map && typeof startupApplySeed.coarse_color_map === "object") {
      const sanitized = {};
      Object.entries(startupApplySeed.coarse_color_map).forEach(([rawIso2, rawColor]) => {
        const iso2 = normalizeScenarioIso2Code(rawIso2);
        const color = String(rawColor || "").trim().toLowerCase();
        if (iso2 && /^#[0-9a-f]{6}$/.test(color)) {
          sanitized[iso2] = color;
        }
      });
      return sanitized;
    }
    const coarseCandidates = {};
    Object.entries(countryMap || {}).forEach(([rawTag, rawEntry]) => {
      const tag = String(rawTag || "").trim().toUpperCase();
      const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
      const iso2 = normalizeScenarioIso2Code(entry.base_iso2 || entry.lookup_iso2);
      const color = String(
        scenarioColorMap?.[tag]
        || entry.color_hex
        || entry.colorHex
        || ""
      ).trim().toLowerCase();
      if (!iso2 || !/^#[0-9a-f]{6}$/.test(color)) {
        return;
      }
      const featureCount = Number(entry.feature_count);
      const score = Number.isFinite(featureCount) ? featureCount : 0;
      const existing = coarseCandidates[iso2];
      if (!existing || score > existing.score) {
        coarseCandidates[iso2] = { score, color };
      }
    });
    const coarseColorMap = {};
    Object.entries(coarseCandidates).forEach(([iso2, entry]) => {
      if (entry?.color) {
        coarseColorMap[iso2] = entry.color;
      }
    });
    return coarseColorMap;
  }

  async function prepareScenarioApplyState(
    bundle,
    {
      syncPalette = true,
      interactionLevel = "full",
    } = {}
  ) {
    const startupReadonly = interactionLevel === "readonly-startup";
    const supportsChunkedPoliticalRuntime = scenarioSupportsChunkedRuntime(bundle)
      && (!!bundle?.manifest?.detail_chunk_manifest_url || !!bundle?.manifest?.runtime_meta_url);
    const detailPromoted = (startupReadonly || supportsChunkedPoliticalRuntime)
      ? false
      : await ensureScenarioDetailTopologyLoaded({ applyMapData: false });
    const politicalChunkedReady =
      supportsChunkedPoliticalRuntime
      || (scenarioBundleUsesChunkedLayer(bundle, "political")
        && scenarioBundleHasChunkedData(bundle));
    const detailReady = (
      runtimeState.topologyBundleMode === "composite"
      && hasUsablePoliticalTopology(runtimeState.topologyDetail)
    ) || !!detailPromoted || politicalChunkedReady;
    if (!detailReady && scenarioNeedsDetailTopology(bundle.manifest) && !startupReadonly) {
      const scenarioLabel = getScenarioDisplayName(
        bundle.manifest,
        String(bundle.manifest?.scenario_id || "Scenario").trim()
      );
      const message = `Detailed political topology could not be loaded. ${scenarioLabel} cannot be applied in coarse mode.`;
      console.error(`[scenario] ${message}`);
      throw new Error(message);
    }
    if (!detailReady && runtimeState.topologyBundleMode !== "composite") {
      console.warn("[scenario] Applying bundle without confirmed detail promotion; health gate will validate runtime topology.");
    }
    if (syncPalette) {
      const targetPaletteId = getScenarioTargetPaletteId(bundle.manifest);
      if (hasActiveScenarioPaletteLoaded(targetPaletteId)) {
        applyActivePaletteState({ overwriteCountryPalette: false });
      } else {
        const paletteApplied = await setActivePaletteSource(
          targetPaletteId,
          {
            syncUI: true,
            overwriteCountryPalette: false,
          }
        );
        if (!paletteApplied || !hasActiveScenarioPaletteLoaded(targetPaletteId)) {
          throw new Error(
            `Unable to load palette for scenario "${normalizeScenarioId(bundle.manifest?.scenario_id || bundle.meta?.scenario_id)}".`
          );
        }
      }
    }

    const scenarioId = normalizeScenarioId(bundle.manifest.scenario_id || bundle.meta?.scenario_id);
    if (!scenarioId) {
      throw new Error("Scenario bundle is missing a scenario id.");
    }
    const baseCountryMap = bundle.countriesPayload?.countries;
    if (!baseCountryMap || typeof baseCountryMap !== "object") {
      throw new Error(`Scenario "${scenarioId}" is missing countries data.`);
    }
    const ownersPayload = bundle.ownersPayload?.owners;
    if (!ownersPayload || typeof ownersPayload !== "object") {
      throw new Error(`Scenario "${scenarioId}" is missing owner data.`);
    }
    const baseCountryTags = Object.keys(baseCountryMap);
    const owners = ownersPayload;
    const controllers = bundle.controllersPayload?.controllers && typeof bundle.controllersPayload.controllers === "object"
      ? bundle.controllersPayload.controllers
      : owners;
    const cores = bundle.coresPayload?.cores && typeof bundle.coresPayload.cores === "object"
      ? normalizeScenarioCoreMap(bundle.coresPayload.cores)
      : {};
    const startupApplySeed = bundle.startupApplySeed && typeof bundle.startupApplySeed === "object"
      ? bundle.startupApplySeed
      : null;
    const defaultCountryCode = String(
      startupApplySeed?.default_country_code
      || getScenarioDefaultCountryCode(bundle.manifest, baseCountryMap)
    ).trim().toUpperCase();
    const mapSemanticMode = String(
      startupApplySeed?.map_semantic_mode
      || getScenarioMapSemanticMode(bundle.manifest)
    ).trim().toLowerCase() || "political";
    const releasableIndex = buildScenarioReleasableIndex(scenarioId, {
      excludeTags: baseCountryTags,
    });
    const releasableCountries = getScenarioReleasableCountries(scenarioId, {
      excludeTags: baseCountryTags,
    });
    Object.keys(releasableCountries).forEach((tag) => {
      if (baseCountryMap[tag]) {
        console.warn(`[scenario] Releasable tag conflict detected for "${tag}" while applying "${scenarioId}".`);
      }
    });
    const countryMap = {
      ...baseCountryMap,
      ...releasableCountries,
    };
    const runtimeTopologyPayload = bundle.runtimeTopologyPayload || null;
    if (
      mapSemanticMode !== "blank"
      && (
        !runtimeTopologyPayload
        || !Array.isArray(runtimeTopologyPayload?.objects?.political?.geometries)
        || runtimeTopologyPayload.objects.political.geometries.length === 0
        || !hasRenderableScenarioPoliticalTopology(runtimeTopologyPayload)
      )
    ) {
      throw new Error(
        `Scenario "${scenarioId}" runtime topology is not renderable: objects.political.geometries is required.`
      );
    }
    const runtimeVersionTag = runtimeTopologyPayload
      ? buildScenarioRuntimeVersionTag(bundle, runtimeTopologyPayload)
      : "";
    const districtGroupsPayload = normalizeScenarioDistrictGroupsPayload(bundle.districtGroupsPayload, scenarioId);
    const mergedWaterPayload = getActiveScenarioMergedChunkLayerPayload("water", scenarioId);
    const mergedSpecialPayload = getActiveScenarioMergedChunkLayerPayload("special", scenarioId);
    const mergedReliefPayload = getActiveScenarioMergedChunkLayerPayload("relief", scenarioId);
    const mergedCitiesPayload = getActiveScenarioMergedChunkLayerPayload("cities", scenarioId);
    const scenarioWaterRegionsFromTopology =
      mergedWaterPayload !== undefined
        ? mergedWaterPayload
        : (
          bundle.waterRegionsPayload
          || getScenarioDecodedCollection(bundle, "scenarioWaterRegionsData")
          || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "scenario_water")
        );
    const scenarioSpecialRegionsFromTopology =
      mergedSpecialPayload !== undefined
        ? mergedSpecialPayload
        : (
          getScenarioDecodedCollection(bundle, "scenarioSpecialRegionsData")
          || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "scenario_special_land")
        );
    const scenarioContextLandMaskFromTopology =
      getScenarioDecodedCollection(bundle, "scenarioContextLandMaskData")
      || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "context_land_mask");
    const scenarioLandMaskFromTopology =
      getScenarioDecodedCollection(bundle, "scenarioLandMaskData")
      || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "land_mask")
      || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "land");
    const scenarioNameMap = startupApplySeed?.scenario_name_map && typeof startupApplySeed.scenario_name_map === "object"
      ? { ...getScenarioNameMap(countryMap), ...startupApplySeed.scenario_name_map }
      : getScenarioNameMap(countryMap);
    const missingScenarioNameTags = getMissingScenarioNameTags(countryMap, scenarioNameMap);
    if (missingScenarioNameTags.length) {
      throw new Error(
        `Scenario "${scenarioId}" is missing display names for active tags: ${missingScenarioNameTags.slice(0, 12).join(", ")}`
      );
    }
    const seedScenarioColorMap = startupApplySeed?.scenario_color_map && typeof startupApplySeed.scenario_color_map === "object"
      ? { ...startupApplySeed.scenario_color_map }
      : {};
    const fixedScenarioCountryColors = getScenarioFixedOwnerColors(countryMap);
    const scenarioColorDetails = buildScenarioOwnerColorMapDetails(countryMap, {
      palettePack: runtimeState.activePalettePack,
      paletteMap: runtimeState.activePaletteMap,
      seedColorByTag: seedScenarioColorMap,
      fallbackColorByTag: fixedScenarioCountryColors,
    });
    const scenarioColorMap = scenarioColorDetails.byTag;
    const coarseColorMap = buildScenarioCoarseColorMap({
      startupApplySeed,
      countryMap,
      scenarioColorMap,
    });
    const scenarioOwnerBackfill = startupApplySeed?.resolved_owners && typeof startupApplySeed.resolved_owners === "object"
      ? {}
      : buildHoi4FarEastSovietOwnerBackfill(scenarioId, {
        runtimeTopology: runtimeTopologyPayload?.objects?.political
          ? runtimeTopologyPayload
          : (runtimeState.defaultRuntimePoliticalTopology || runtimeState.runtimePoliticalTopology || null),
        ownersByFeatureId: owners,
        controllersByFeatureId: controllers,
      });
    const resolvedOwners = startupApplySeed?.resolved_owners && typeof startupApplySeed.resolved_owners === "object"
      ? { ...startupApplySeed.resolved_owners }
      : (
        Object.keys(scenarioOwnerBackfill).length
          ? {
            ...owners,
            ...scenarioOwnerBackfill,
          }
          : { ...owners }
      );
    const activationContext = prepareScenarioActivationContext(bundle);
    return {
      scenarioId,
      baseCountryMap,
      defaultCountryCode,
      mapSemanticMode,
      countryMap,
      runtimeTopologyPayload,
      runtimeVersionTag,
      districtGroupsPayload,
      scenarioWaterRegionsFromTopology,
      scenarioSpecialRegionsFromTopology,
      scenarioContextLandMaskFromTopology,
      scenarioLandMaskFromTopology,
      scenarioReliefOverlaysPayload: mergedReliefPayload !== undefined
        ? mergedReliefPayload
        : (bundle.reliefOverlaysPayload || null),
      scenarioCityOverridesPayload: mergedCitiesPayload !== undefined
        ? mergedCitiesPayload
        : (bundle.cityOverridesPayload || null),
      scenarioNameMap,
      scenarioColorMap,
      scenarioGeneratedColorTags: scenarioColorDetails.generatedTags,
      coarseColorMap,
      scenarioOwnerBackfill,
      resolvedOwners,
      controllers,
      cores,
      releasableIndex,
      ...activationContext,
    };
  }

  function applyPreparedScenarioState(bundle, staged) {
    commitScenarioActivationState(bundle, staged);
    syncScenarioInspectorSelection(runtimeState.activeSovereignCode);

    disableScenarioParentBorders();
    applyScenarioPaintMode();
    syncScenarioOceanFillForActivation(bundle.manifest);
    applyScenarioPerformanceHints(bundle.manifest);
    commitScenarioChunkRuntimeState(bundle, staged);
    recalculateScenarioOwnerControllerDiffCount();
  }

  return {
    prepareScenarioApplyState,
    applyPreparedScenarioState,
  };
}

export {
  createScenarioApplyPipeline,
};
