import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

function readRepoFile(...relativeParts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...relativeParts), "utf8");
}

test("physical layer source contracts stay wired to the expected renderer and startup boundaries", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const mainSource = readRepoFile("js", "main.js");
  const startupDataPipelineSource = readRepoFile("js", "bootstrap", "startup_data_pipeline.js");
  const appearanceControllerSource = readRepoFile("js", "ui", "toolbar", "appearance_controls_controller.js");
  const physicalOwnerSource = readRepoFile("js", "ui", "toolbar", "appearance_physical_owner.js");
  const interactionFunnelSource = readRepoFile("js", "core", "interaction_funnel.js");
  const renderPipelinePassesSource = readRepoFile("js", "core", "renderer", "render_pipeline_passes.js");

  const physicalBaseStart = rendererSource.indexOf("function drawPhysicalBasePass");
  const physicalBaseEnd = rendererSource.indexOf("function drawPhysicalAtlasLayer");
  const contextBaseStart = rendererSource.indexOf("function drawContextBasePass");
  const contextBaseEnd = rendererSource.indexOf("function drawContextMarkersPass");
  const physicalBaseSource =
    physicalBaseStart >= 0 && physicalBaseEnd > physicalBaseStart
      ? rendererSource.slice(physicalBaseStart, physicalBaseEnd)
      : "";
  const contextBaseSource =
    contextBaseStart >= 0 && contextBaseEnd > contextBaseStart
      ? rendererSource.slice(contextBaseStart, contextBaseEnd)
      : "";
  const contextMarkersStart = rendererSource.indexOf("function drawContextMarkersPass");
  const contextMarkersEnd = rendererSource.indexOf("function drawContextScenarioPass");
  const contextMarkersSource =
    contextMarkersStart >= 0 && contextMarkersEnd > contextMarkersStart
      ? rendererSource.slice(contextMarkersStart, contextMarkersEnd)
      : "";
  const releaseDeferredContextStart = rendererSource.indexOf("function releaseDeferredContextBasePass");
  const releaseDeferredContextEnd = rendererSource.indexOf("registerRuntimeHook(runtimeState, \"releaseDeferredContextBasePassFn\"", releaseDeferredContextStart);
  const releaseDeferredContextSource =
    releaseDeferredContextStart >= 0 && releaseDeferredContextEnd > releaseDeferredContextStart
      ? rendererSource.slice(releaseDeferredContextStart, releaseDeferredContextEnd)
      : "";

  const checks = {
    hasValidBlendModes:
      /const VALID_BLEND_MODES = new Set\(\[/.test(rendererSource)
      && /"source-over"/.test(rendererSource)
      && /"multiply"/.test(rendererSource)
      && /"screen"/.test(rendererSource)
      && /"overlay"/.test(rendererSource)
      && /"soft-light"/.test(rendererSource),
    hasSafeBlendFallback:
      /return VALID_BLEND_MODES\.has\(mode\) \? mode : safeFallback;/.test(rendererSource),
    hasPhysicalBasePass:
      /\["physicalBase", \(k\) => drawPhysicalBasePass\(k\)\]/.test(renderPipelinePassesSource)
      && /drawPhysicalBasePass,/.test(rendererSource),
    physicalBaseDrawsBeforePolitical:
      renderPipelinePassesSource.indexOf('["physicalBase", (k) => drawPhysicalBasePass(k)]')
        < renderPipelinePassesSource.indexOf('["political", (k) => drawPoliticalPass(k)]')
      && renderPipelinePassesSource.indexOf('["political", (k) => drawPoliticalPass(k)]')
        < renderPipelinePassesSource.indexOf('["contextBase", (k) => drawContextBasePass(k)]'),
    hasPhysicalReliefOverlayHelper:
      /function drawPhysicalReliefOverlayLayer\(k, \{ interactive = false, clipAlreadyApplied = false \} = \{\}\)/.test(rendererSource),
    reliefOverlayBlendClamp:
      /function getPhysicalReliefOverlayBlendMode\(cfg, presetProfile\)/.test(rendererSource)
      && /if \(requestedMode === "overlay" \|\| requestedMode === "multiply"\) \{[\s\S]*?return "soft-light";/.test(rendererSource),
    physicalBaseKeepsPhysicalFillUnderPolitical:
      physicalBaseSource.includes("const semanticRenderedCount = drawPhysicalAtlasLayer(k, { interactive });")
      && physicalBaseSource.includes("const reliefRenderedCount = drawPhysicalReliefOverlayLayer(k, { interactive });")
      && physicalBaseSource.indexOf("drawPhysicalAtlasLayer(k, { interactive });")
        < physicalBaseSource.indexOf("drawPhysicalReliefOverlayLayer(k, { interactive });"),
    hasPhysicalExactRefresh:
      /invalidateRenderPasses\(\["physicalBase", "contextBase"\], "physical-visible-exact"\);/.test(rendererSource),
    contextBaseKeepsReliefBelowPolitical:
      !contextBaseSource.includes("drawPhysicalReliefOverlayLayer(")
      && contextBaseSource.includes("drawPhysicalContourLayer(k, { interactive });"),
    deferredContextBaseSkipsReliefOverlay:
      /if \((?:runtimeState|state)\.deferContextBasePass && !interactive\) \{/.test(contextBaseSource)
      && !contextBaseSource.includes("drawPhysicalReliefOverlayLayer(k, { interactive: false });"),
    contourUsesSourceOver:
      /drawPhysicalContourLayer[\s\S]*?context\.globalCompositeOperation = "source-over";/.test(rendererSource),
    hasContourZoomProfiles:
      /const CONTOUR_ZOOM_STYLE_PROFILES = Object\.freeze\(\{/.test(rendererSource),
    hasAdaptiveContourColor:
      /function getAdaptiveContourStrokeColor\(feature, baseColor\)/.test(rendererSource),
    contourKeepsInverseScaleWidth:
      /function drawContourCollection[\s\S]*?const scale = Math\.max\(0\.0001, k\);[\s\S]*?context\.lineWidth = width \/ scale;/.test(rendererSource),
    contourUsesAdaptiveColor:
      /drawContourCollection[\s\S]*?colorResolver = null/.test(rendererSource)
      && /drawPhysicalContourLayer[\s\S]*?colorResolver: resolveContourColor/.test(rendererSource),
    contourUsesVisibleSetCache:
      /function getContourVisibleFeatures\(/.test(rendererSource)
      && /contourVisibleSetCache\[cacheSlot\] = \{[\s\S]*?collectionRef: collection,[\s\S]*?features: visibleFeatures,/.test(rendererSource),
    contourMergesBoundsAndFilter:
      /function getContourVisibleFeatures[\s\S]*?const screenBounds = getFeatureScreenBounds\(feature, \{ allowCompute: false \}\) \|\| getFeatureScreenBounds\(feature\);/.test(rendererSource)
      && /function getContourVisibleFeatures[\s\S]*?rectsIntersect\(screenBounds, viewportBounds\)/.test(rendererSource)
      && /function drawContourCollection[\s\S]*?const visibleFeatures = getContourVisibleFeatures\(collection, \{/.test(rendererSource),
    contourUsesStrokeBatching:
      /function drawContourCollection[\s\S]*?const strokeBatches = new Map\(\);/.test(rendererSource)
      && /strokeBatches\.forEach\(\(features, strokeColor\) => \{[\s\S]*?features\.forEach\(\(feature\) => \{[\s\S]*?pathCanvas\(feature\);/.test(rendererSource),
    contourFirstIdleKeepsFastPath:
      /function shouldPreferImmediateExactContextBaseRefresh\(reuseDecision = null\)/.test(rendererSource) === false
      && /const deferredReuseDecision = state\.deferExactAfterSettle \? getContextBaseReuseDecision\(\) : null;/.test(rendererSource) === false,
    contourZoomBucketRefreshesAfterQuietWindow:
      /function buildExactAfterSettleRefreshPlan[\s\S]*?const forceExactContextBaseRefresh = shouldForceExactContextBaseRefresh\(reuseDecision\);/.test(rendererSource)
      && /function applyExactAfterSettleRefreshPlan[\s\S]*?if \(plan\.forceExactContextBaseRefresh\) \{[\s\S]*?invalidateRenderPasses\(\["physicalBase", "contextBase"\], "physical-visible-exact"\);/.test(rendererSource),
    exactAfterSettleKeepsPoliticalRefreshExplicit:
      /function applyExactAfterSettleRefreshPlan\(plan\) \{[\s\S]*?const exactAfterSettleDprPasses = RENDER_PASS_NAMES\.filter\(\(passName\) => passName !== "political"\);[\s\S]*?reason: "exact-after-settle-dpr-restore",[\s\S]*?targetPassesOnDprChange: exactAfterSettleDprPasses,[\s\S]*?targetPassesOnResize: exactAfterSettleDprPasses,[\s\S]*?targetPassesOnCanvasResize: exactAfterSettleDprPasses,[\s\S]*?runtimeState\.deferExactAfterSettle = false;[\s\S]*?if \(plan\.forceExactContextBaseRefresh\) \{[\s\S]*?invalidateRenderPasses\(\["physicalBase", "contextBase"\], "physical-visible-exact"\);[\s\S]*?const targetPassNames = new Set\(\["political", "borders", "labels", "textureLabels"\]\);/.test(rendererSource)
      && /function prepareExactAfterSettlePassesInSlices\(generation, plan\) \{[\s\S]*?if \(runtimeState\.renderPhase !== RENDER_PHASE_IDLE\)[\s\S]*?if \(!isExactAfterSettleIdentityCurrent\(activeController\)\)[\s\S]*?if \(passName === "political"\) \{[\s\S]*?invalidateExactAfterSettlePoliticalPass\(plan\);/.test(rendererSource),
    hasMountainMultiplier:
      /if \(normalized === "mountain_high_relief"\) return 1\.18;/.test(rendererSource),
    hasMountainHillsMultiplier:
      /if \(normalized === "mountain_hills"\) return 1\.02;/.test(rendererSource),
    hasDesertMultiplier:
      /if \(normalized === "desert_bare"\) return 1\.1;/.test(rendererSource),
    hasForestMultiplier:
      /if \(normalized === "forest" \|\| normalized === "forest_temperate"\) return 0\.95;/.test(rendererSource),
    hasPlateauMultiplier:
      /if \(normalized === "upland_plateau"\) return 0\.9;/.test(rendererSource),
    hasBadlandsMultiplier:
      /if \(normalized === "badlands_canyon"\) return 0\.98;/.test(rendererSource),
    hasPlainsMultiplier:
      /if \(normalized === "plains_lowlands"\) return 0\.68;/.test(rendererSource),
    hasGrasslandMultiplier:
      /if \(normalized === "grassland_steppe"\) return 0\.8;/.test(rendererSource),
    hasTundraMultiplier:
      /if \(normalized === "tundra_ice"\) return 0\.85;/.test(rendererSource),
    physicalSetDefersContours:
      /const PHYSICAL_CONTEXT_LAYER_SET = \[\s*"physical",\s*"physical_semantics",\s*\];/.test(startupDataPipelineSource),
    hasSeparateContourWarmupSet:
      /const PHYSICAL_CONTOUR_LAYER_SET = \[[\s\S]*?"physical_contours_major",[\s\S]*?"physical_contours_minor",[\s\S]*?\];/.test(startupDataPipelineSource)
      && /if \(normalized === "physical-contours-set"\) \{[\s\S]*?return PHYSICAL_CONTOUR_LAYER_SET;/.test(startupDataPipelineSource),
    schedulesDeferredContourWarmup:
      /if \((?:runtimeState|state)\.showPhysical\) \{[\s\S]*?requestedLayerNames\.push\("physical-set"\);[\s\S]*?requestedContourLayerNames\.push\("physical-contours-set"\);/.test(mainSource)
      && /schedulePostReadyTask\("post-ready-contour-warmup", async \(\) => \{[\s\S]*?await ensureContextLayerDataReady\(requestedContourLayerNames, \{[\s\S]*?reason: "post-ready-contours",[\s\S]*?renderNow: false,[\s\S]*?requestMainRender\("post-ready-contours"\);/.test(mainSource),
    toolbarToggleLoadsFullPhysicalSet:
      /ensureContextLayerDataFn\(\["physical-set", "physical-contours-set"\], \{ reason: "toolbar-toggle", renderNow: true \}\)/.test(physicalOwnerSource)
      && /physicalOwner\.bindEvents\(\);/.test(appearanceControllerSource),
    projectImportLoadsFullPhysicalSet:
      /callRuntimeHook\(state, "ensureContextLayerDataFn", \["physical-set", "physical-contours-set"\], \{[\s\S]*?reason: "project-import",[\s\S]*?renderNow: false,/.test(interactionFunnelSource),
    contextMarkersStagedMetricsCoverTransportLines:
      /if \((?:runtimeState|state)\.deferContextBasePass && !interactive\) \{/.test(contextMarkersSource)
      && contextMarkersSource.includes('collectContextMetric("drawRoadsLayer", 0, {')
      && contextMarkersSource.includes('collectContextMetric("drawRailwaysLayer", 0, {')
      && /collectContextMetric\("drawRoadsLayer", 0, \{[\s\S]*?reason: "staged-apply",/.test(contextMarkersSource)
      && /collectContextMetric\("drawRailwaysLayer", 0, \{[\s\S]*?reason: "staged-apply",/.test(contextMarkersSource),
    contextBreakdownCoversTransportLines:
      /const CONTEXT_BREAKDOWN_METRIC_NAMES = new Set\(\[[\s\S]*?"drawRoadsLayer",[\s\S]*?"drawRailwaysLayer",/.test(rendererSource),
    releaseDeferredContextCancelsStagedContextWork:
      releaseDeferredContextSource.includes("cancelDeferredWork(runtimeState.stagedContextBaseHandle);")
      && releaseDeferredContextSource.includes("runtimeState.stagedContextBaseHandle = null;")
      && releaseDeferredContextSource.includes("scheduleStagedHitCanvasWarmup(nowMs(), Number(runtimeState.stagedMapDataToken || 0));"),
  };

  Object.entries(checks).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("physical layer runtime assets stay publishable through registry and Pages allowlist", () => {
  const registry = JSON.parse(readRepoFile("data", "runtime_asset_registry.json"));
  const manifest = JSON.parse(readRepoFile("data", "manifest.json"));
  const dataLoaderSource = readRepoFile("js", "core", "data_loader.js");
  const pagesDistSource = readRepoFile("tools", "build_pages_dist.py");

  const expectedAssets = {
    "context_layer:physical": "data/europe_physical.geojson",
    "context_layer:physical_semantics": "data/global_physical_semantics.topo.json",
    "context_layer:physical_contours_major": "data/global_contours.major.topo.json",
    "context_layer:physical_contours_minor": "data/global_contours.minor.topo.json",
  };

  Object.entries(expectedAssets).forEach(([assetKey, assetPath]) => {
    assert.equal(registry.assets?.[assetKey]?.url, assetPath, assetKey);
    assert.equal(manifest.runtime_asset_registry?.assets?.[assetKey]?.url, assetPath, assetKey);
    assert.ok(pagesDistSource.includes(`"${assetPath.replace("data/", "")}"`), assetPath);
  });

  assert.ok(dataLoaderSource.includes('resolveDataAssetUrl("context_layer:physical")'));
  assert.ok(dataLoaderSource.includes('resolveDataAssetUrl("context_layer:physical_semantics")'));
  assert.ok(dataLoaderSource.includes('resolveDataAssetUrl("context_layer:physical_contours_major")'));
  assert.ok(dataLoaderSource.includes('resolveDataAssetUrl("context_layer:physical_contours_minor")'));
});
