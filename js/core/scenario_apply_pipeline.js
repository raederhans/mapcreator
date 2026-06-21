// Scenario apply pipeline.
// 这个模块只负责“准备 staged apply runtimeState”和“把 staged runtimeState 落到 runtime runtimeState”。
// scenario_manager.js 继续保留事务协调、回滚、post-apply、入口控制。

import { buildScenarioOwnerColorMapDetails } from "./palette_runtime_bridge.js";
import { commitScenarioActivationRuntimeState } from "./state/scenario_runtime_state.js";
import {
  normalizeScenarioStrategicValuesPayload,
} from "./scenario/strategic_values.js";
import {
  recordRenderTransactionSnapshot,
} from "./renderer/render_transaction_diagnostics.js";

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
  awaitInitialScenarioChunkVisualPromotion,
  resetScenarioChunkRuntimeState,
  ensureRuntimeChunkLoadState,
  hasRenderableScenarioPoliticalTopology,
  normalizeScenarioFeatureCollection,
  cloneScenarioStateValue,
} = {}) {
  function prepareScenarioActivationContext(bundle) {
    // 这里缓存“进入场景前”的显示状态，只在第一次激活场景时截一份基线。
    // 后续场景切换沿用这份快照，避免每次 apply 都把已经是 scenario 态的值继续覆盖回去。
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
          showScenarioAtlantropa: runtimeState.showScenarioAtlantropa !== false,
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

  function buildScenarioActivationCommitState(bundle, staged) {
    // staged 负责把 bundle/loader 结果整理成一次性 runtimeState 提交包。
    // 真正写入 runtimeState 时只认这份对象，避免 apply 流程在多个阶段分散写字段。
    const hasRenderableRuntimeTopology = staged.mapSemanticMode === "blank"
      || hasRenderableScenarioPoliticalTopology(staged.runtimeTopologyPayload);
    const runtimePoliticalTopology = staged.mapSemanticMode === "blank"
      ? (staged.runtimeTopologyPayload || null)
      : (
        hasRenderableRuntimeTopology
          ? staged.runtimeTopologyPayload
          : (runtimeState.defaultRuntimePoliticalTopology || null)
      );
    const scenarioRuntimeTopologyData = hasRenderableRuntimeTopology
      ? (staged.runtimeTopologyPayload || null)
      : null;
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
    const scenarioAtlantropaData = staged.scenarioAtlantropaFromTopology || null;
    const scenarioDistrictGroupByFeatureId = buildScenarioDistrictGroupByFeatureId(staged.districtGroupsPayload);
    const releasableCatalog = mergeReleasableCatalogs(runtimeState.defaultReleasableCatalog, bundle.releasableCatalog);
    const fixedOwnerColors = { ...staged.scenarioColorMap };
    if (staged.coarseColorMap && typeof staged.coarseColorMap === "object") {
      Object.entries(staged.coarseColorMap).forEach(([iso2, color]) => {
        if (iso2 && color && !fixedOwnerColors[iso2]) {
          fixedOwnerColors[iso2] = color;
        }
      });
    }
    return {
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
      scenarioRuntimeTopologyData,
      runtimePoliticalTopology,
      scenarioPoliticalChunkData,
      runtimePoliticalMetaSeed: bundle.runtimePoliticalMeta || null,
      runtimePoliticalFeatureCollectionSeed: getScenarioDecodedCollection(bundle, "politicalData") || null,
      scenarioLandMaskData,
      scenarioContextLandMaskData,
      scenarioWaterRegionsData,
      scenarioAtlantropaData,
      scenarioRuntimeTopologyVersionTag: scenarioRuntimeTopologyData ? runtimeVersionTag : "",
      scenarioLandMaskVersionTag: scenarioLandMaskData ? runtimeVersionTag : "",
      scenarioContextLandMaskVersionTag: scenarioContextLandMaskData ? runtimeVersionTag : "",
      scenarioWaterOverlayVersionTag: scenarioWaterRegionsData ? runtimeVersionTag : "",
      scenarioSpecialRegionsData: staged.scenarioSpecialRegionsFromTopology || bundle.specialRegionsPayload || null,
      scenarioReliefOverlaysData: staged.scenarioReliefOverlaysPayload || null,
      scenarioReliefOverlayRevision: (Number(runtimeState.scenarioReliefOverlayRevision) || 0) + 1,
      scenarioStrategicValuesData: staged.scenarioStrategicValuesPayload || null,
      scenarioStrategicValuesRevision: (Number(runtimeState.scenarioStrategicValuesRevision) || 0) + 1,
      scenarioDistrictGroupsData: staged.districtGroupsPayload,
      scenarioDistrictGroupByFeatureId,
      releasableCatalog,
      scenarioReleasableIndex: staged.releasableIndex,
      scenarioAudit: bundle.auditPayload || null,
      scenarioImportAudit: null,
      scenarioBaselineHash: getScenarioBaselineHashFromBundle(bundle),
      scenarioBaselineOwnersByFeatureId: staged.resolvedOwners,
      scenarioAutoShellOwnerByFeatureId: {},
      scenarioBaselineCoresByFeatureId: staged.cores,
      scenarioShellOverlayRevision: (Number(runtimeState.scenarioShellOverlayRevision) || 0) + 1,
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
    };
  }

  function normalizeScenarioApplyStrategicValuesPayload(payload, bundle, scenarioId) {
    if (!payload) {
      return null;
    }
    return normalizeScenarioStrategicValuesPayload(payload, {
      expected: {
        scenario_id: scenarioId,
        baseline_hash: getScenarioBaselineHashFromBundle(bundle) || bundle?.manifest?.baseline_hash || "",
      },
    });
  }

  function runScenarioActivationPreCommitPhase(bundle, staged) {
    // pre-commit 先同步会影响后续提交结果的辅助状态，
    // commit 阶段只落 runtimeState 字段，post-commit 再触发 UI/render/chunk 副作用。
    // 这样排是为了把“提交真相源”和“提交后的连锁刷新”拆开，定位 apply 异常时更容易看出卡在哪一段。
    syncScenarioLocalizationState({
      cityOverridesPayload: staged.mapSemanticMode === "blank" ? null : (staged.scenarioCityOverridesPayload || null),
      geoLocalePatchPayload: staged.mapSemanticMode === "blank" ? null : (bundle.geoLocalePatchPayload || null),
    });
    if (staged.mapSemanticMode === "blank") {
      applyBlankScenarioPresentationDefaults({ resetLocalization: false });
    }
    setScenarioAuditUiState({
      loading: false,
      loadedForScenarioId: bundle.auditPayload ? staged.scenarioId : "",
      errorMessage: "",
    });
  }

  function commitScenarioActivationState(bundle, staged) {
    const nextRuntimeState = buildScenarioActivationCommitState(bundle, staged);
    commitScenarioActivationRuntimeState(runtimeState, nextRuntimeState);
    return nextRuntimeState;
  }

  function runScenarioActivationPostCommitPhase(bundle, staged) {
    markLegacyColorStateDirty();
    syncScenarioInspectorSelection("");
    disableScenarioParentBorders();
    applyScenarioPaintMode();
    syncScenarioOceanFillForActivation(bundle.manifest);
    applyScenarioPerformanceHints(bundle.manifest);
    commitScenarioChunkRuntimeState(bundle, staged);
  }

  function commitScenarioChunkRuntimeState(bundle, staged) {
    // chunk runtime 的壳状态和 payload cache 在这里统一接管。
    // 非 chunked 场景直接 reset，避免旧场景留下的 detail/chunk 状态混进新场景。
    // 这里的 reset 不是保守清空，而是显式把 owner 交回当前场景，避免上一场景的缓存继续冒充已加载。
    const supportsChunkedRuntime = scenarioSupportsChunkedRuntime(bundle);
    runtimeState.scheduleScenarioChunkRefreshFn = supportsChunkedRuntime ? scheduleScenarioChunkRefresh : null;
    runtimeState.awaitInitialScenarioChunkVisualPromotionFn = supportsChunkedRuntime
      ? awaitInitialScenarioChunkVisualPromotion
      : null;
    if (supportsChunkedRuntime) {
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
      scenarioApplyEpoch = 0,
    } = {}
  ) {
    // apply 前半段先守住“能不能安全进入场景”这条线：
    // detail topology / palette / countries / owners 任一关键输入缺失，都在真正 commit 前直接失败。
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
    // detailReady 只表示“允许进入 apply 的最低入场条件已经满足”。
    // 后续的 hydration health gate、chunk 接管和 post-commit 细化仍可能继续补齐更多 runtime 面。
    // 所以 coarse 路径能继续，不等于场景已经完全稳定；真正 ready 还要看后续 owner 是否把细节面接管完整。
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
    const mergedAtlantropaPayload = getActiveScenarioMergedChunkLayerPayload("scenario_atlantropa", scenarioId);
    const mergedReliefPayload = getActiveScenarioMergedChunkLayerPayload("relief", scenarioId);
    const mergedCitiesPayload = getActiveScenarioMergedChunkLayerPayload("cities", scenarioId);
    const mergedStrategicValuesPayload = getActiveScenarioMergedChunkLayerPayload("strategicvalues", scenarioId);
    const scenarioStrategicValuesPayload = normalizeScenarioApplyStrategicValuesPayload(
      mergedStrategicValuesPayload !== undefined
        ? mergedStrategicValuesPayload
        : (bundle.strategicValuesPayload || null),
      bundle,
      scenarioId
    );
    // 这里用 undefined 区分“runtime 还没接管该 layer”，此时继续回退到 bundle/topology。
    // 只要 runtime 显式给出 null 或 payload，都按 runtime 的结论提交。
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
    const scenarioAtlantropaFromTopology =
      mergedAtlantropaPayload !== undefined
        ? mergedAtlantropaPayload
        : (
          getScenarioDecodedCollection(bundle, "scenarioAtlantropaData")
          || getScenarioTopologyFeatureCollection(runtimeTopologyPayload, "scenario_atlantropa")
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
        controllersByFeatureId: owners,
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
    const staged = {
      scenarioId,
      scenarioApplyEpoch: Math.max(0, Number(scenarioApplyEpoch || 0)),
      baseCountryMap,
      defaultCountryCode,
      mapSemanticMode,
      countryMap,
      runtimeTopologyPayload,
      runtimeVersionTag,
      districtGroupsPayload,
      scenarioWaterRegionsFromTopology,
      scenarioSpecialRegionsFromTopology,
      scenarioAtlantropaFromTopology,
      scenarioContextLandMaskFromTopology,
      scenarioLandMaskFromTopology,
      scenarioReliefOverlaysPayload: mergedReliefPayload !== undefined
        ? mergedReliefPayload
        : (bundle.reliefOverlaysPayload || null),
      scenarioCityOverridesPayload: mergedCitiesPayload !== undefined
        ? mergedCitiesPayload
        : (bundle.cityOverridesPayload || null),
      scenarioStrategicValuesPayload,
      scenarioNameMap,
      scenarioColorMap,
      scenarioGeneratedColorTags: scenarioColorDetails.generatedTags,
      coarseColorMap,
      scenarioOwnerBackfill,
      resolvedOwners,
      cores,
      releasableIndex,
      ...activationContext,
    };
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-apply-pipeline-staged",
      reason: "prepareScenarioApplyState",
      requestedScenarioId: scenarioId,
      source: "scenario_apply_pipeline",
      extra: {
        allowScenarioMismatch: true,
        runtimeTopologyRenderable: hasRenderableScenarioPoliticalTopology(runtimeTopologyPayload),
        runtimeTopologyObjectCount: runtimeTopologyPayload?.objects && typeof runtimeTopologyPayload.objects === "object"
          ? Object.keys(runtimeTopologyPayload.objects).length
          : 0,
        scenarioWaterSource: scenarioWaterRegionsFromTopology ? "topology-or-merged" : "none",
        scenarioAtlantropaSource: scenarioAtlantropaFromTopology ? "topology-or-merged" : "none",
        scenarioSpecialSource: scenarioSpecialRegionsFromTopology ? "topology-or-merged" : "none",
        scenarioApplyEpoch: Math.max(0, Number(scenarioApplyEpoch || 0)),
        fixedOwnerColorCount: Object.keys(scenarioColorMap || {}).length,
        coarseColorCount: Object.keys(coarseColorMap || {}).length,
        resolvedOwnerCount: Object.keys(resolvedOwners || {}).length,
      },
    });
    return staged;
  }

  function applyPreparedScenarioState(bundle, staged) {
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-apply-precommit-start",
      reason: "applyPreparedScenarioState",
      requestedScenarioId: staged?.scenarioId,
      source: "scenario_apply_pipeline",
      extra: {
        allowScenarioMismatch: true,
        scenarioApplyEpoch: Math.max(0, Number(staged?.scenarioApplyEpoch || 0)),
      },
    });
    runScenarioActivationPreCommitPhase(bundle, staged);
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-apply-runtime-commit-start",
      reason: "applyPreparedScenarioState",
      requestedScenarioId: staged?.scenarioId,
      source: "scenario_apply_pipeline",
      extra: {
        allowScenarioMismatch: true,
        scenarioApplyEpoch: Math.max(0, Number(staged?.scenarioApplyEpoch || 0)),
      },
    });
    commitScenarioActivationState(bundle, staged);
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-apply-runtime-commit-complete",
      reason: "applyPreparedScenarioState",
      requestedScenarioId: staged?.scenarioId,
      expectedScenarioId: staged?.scenarioId,
      source: "scenario_apply_pipeline",
      extra: {
        scenarioApplyEpoch: Math.max(0, Number(staged?.scenarioApplyEpoch || 0)),
        runtimeTopologyWritten: !!runtimeState.scenarioRuntimeTopologyData,
        runtimePoliticalTopologySource: runtimeState.runtimePoliticalTopology === staged?.runtimeTopologyPayload
          ? "staged"
          : "runtime-or-default",
        scenarioWaterFeatureCount: Array.isArray(runtimeState.scenarioWaterRegionsData?.features)
          ? runtimeState.scenarioWaterRegionsData.features.length
          : 0,
        scenarioAtlantropaFeatureCount: Array.isArray(runtimeState.scenarioAtlantropaData?.features)
          ? runtimeState.scenarioAtlantropaData.features.length
          : 0,
        scenarioSpecialFeatureCount: Array.isArray(runtimeState.scenarioSpecialRegionsData?.features)
          ? runtimeState.scenarioSpecialRegionsData.features.length
          : 0,
      },
    });
    runScenarioActivationPostCommitPhase(bundle, staged);
    recordRenderTransactionSnapshot(runtimeState, {
      phase: "scenario-apply-postcommit-complete",
      reason: "applyPreparedScenarioState",
      requestedScenarioId: staged?.scenarioId,
      expectedScenarioId: staged?.scenarioId,
      source: "scenario_apply_pipeline",
      extra: {
        scenarioApplyEpoch: Math.max(0, Number(staged?.scenarioApplyEpoch || 0)),
      },
    });
  }

  return {
    prepareScenarioApplyState,
    applyPreparedScenarioState,
  };
}

export {
  createScenarioApplyPipeline,
};
