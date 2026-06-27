import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();

const FILES = Object.freeze({
  renderer: "js/core/map_renderer.js",
  canvasColorHelpers: "js/core/renderer/canvas_color_helpers.js",
  scenarioRefreshRuntime: "js/core/map_renderer/scenario_refresh_runtime.js",
  scenarioRefreshPlans: "js/core/map_renderer/scenario_refresh_plans.js",
  scenarioVisualInvalidationExecutor: "js/core/map_renderer/scenario_visual_invalidation_executor.js",
  exactAfterSettleScheduler: "js/core/map_renderer/exact_after_settle_scheduler.js",
  exactAfterSettleRefreshPlans: "js/core/map_renderer/exact_after_settle_refresh_plans.js",
  exactAfterSettlePassCatalog: "js/core/renderer/exact_after_settle_pass_catalog.js",
  hgoPreviewRenderOwner: "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
  renderCacheOwner: "js/core/renderer/render_cache_owner.js",
  renderTransformReusePolicyOwner: "js/core/renderer/render_transform_reuse_policy_owner.js",
  projectedGeometryBoundsOwner: "js/core/renderer/projected_geometry_bounds_owner.js",
  viewportReadModelOwner: "js/core/renderer/viewport_read_model_owner.js",
  viewportCommandOwner: "js/core/renderer/viewport_command_owner.js",
  viewportResizeLifecycleOwner: "js/core/renderer/viewport_resize_lifecycle_owner.js",
  zoomInteractionLifecycleOwner: "js/core/renderer/zoom_interaction_lifecycle_owner.js",
  mapInteractionEventBindingOwner: "js/core/renderer/map_interaction_event_binding_owner.js",
  rendererSurfaceHost: "js/core/renderer/renderer_surface_host.js",
  rendererSurfaceLifecycleOwner: "js/core/renderer/renderer_surface_lifecycle_owner.js",
  scenarioWaterCachePolicyOwner: "js/core/renderer/scenario_water_cache_policy_owner.js",
  renderPipelinePasses: "js/core/renderer/render_pipeline_passes.js",
  renderPipelineCatalog: "js/core/renderer/render_pipeline_catalog.js",
  renderPassCatalog: "js/core/map_renderer/render_pass_catalog.js",
  renderInvalidationCatalog: "js/core/map_renderer/render_invalidation_catalog.js",
  rendererSurfaceHostPreflightDoc: "docs/active/renderer-surface-host-preflight-20260626.md",
  rendererSurfaceHostInventoryTest: "tests/renderer_surface_host_inventory_boundary.test.mjs",
  rendererSurfaceLifecyclePreflightDoc: "docs/active/renderer-surface-lifecycle-preflight-20260626.md",
  rendererSurfaceLifecycleInventoryTest: "tests/renderer_surface_lifecycle_inventory_boundary.test.mjs",
});

const LINE_BUDGETS = Object.freeze({
  [FILES.renderer]: 24109,
  [FILES.scenarioRefreshRuntime]: 729,
  [FILES.scenarioVisualInvalidationExecutor]: 260,
  [FILES.exactAfterSettleScheduler]: 760,
  [FILES.exactAfterSettlePassCatalog]: 120,
  [FILES.hgoPreviewRenderOwner]: 280,
  [FILES.renderCacheOwner]: 620,
  [FILES.renderTransformReusePolicyOwner]: 260,
  [FILES.projectedGeometryBoundsOwner]: 420,
  [FILES.viewportReadModelOwner]: 260,
  [FILES.viewportCommandOwner]: 220,
  [FILES.viewportResizeLifecycleOwner]: 360,
  [FILES.zoomInteractionLifecycleOwner]: 320,
  [FILES.mapInteractionEventBindingOwner]: 220,
  [FILES.rendererSurfaceHost]: 120,
  [FILES.rendererSurfaceLifecycleOwner]: 220,
  [FILES.scenarioWaterCachePolicyOwner]: 260,
  [FILES.renderPipelineCatalog]: 120,
  [FILES.renderPassCatalog]: 80,
  [FILES.renderInvalidationCatalog]: 180,
});

function readProjectFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required architecture file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function lineCount(source) {
  return source.split(/\r?\n/).length;
}

function includesImport(source, importPath) {
  const normalized = source.replaceAll('"', "'");
  return normalized.includes(`from '${importPath}';`);
}

function listProjectSourceFiles(rootRelativePath) {
  const root = path.join(REPO_ROOT, rootRelativePath);
  const results = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile() && /\.m?js$/.test(entry.name)) {
        results.push(path.relative(REPO_ROOT, absolutePath).replaceAll(path.sep, "/"));
      }
    }
  }
  return results.sort();
}

function hasMapRendererImport(source) {
  return /from\s+["'][^"']*map_renderer\.js["']/.test(source)
    || /import\s*\(\s*["'][^"']*map_renderer\.js["']\s*\)/.test(source);
}

function isRendererOwnerPath(sourcePath) {
  const baseName = path.basename(sourcePath);
  return sourcePath.startsWith("js/core/renderer/")
    && (baseName.endsWith("_owner.js") || baseName === "renderer_surface_lifecycle_owner.js");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

function collectFailures() {
  const failures = [];
  const renderer = readProjectFile(FILES.renderer);
  const canvasColorHelpers = readProjectFile(FILES.canvasColorHelpers);
  const scenarioRefreshRuntime = readProjectFile(FILES.scenarioRefreshRuntime);
  const scenarioRefreshPlans = readProjectFile(FILES.scenarioRefreshPlans);
  const scenarioVisualInvalidationExecutor = readProjectFile(FILES.scenarioVisualInvalidationExecutor);
  const exactAfterSettleScheduler = readProjectFile(FILES.exactAfterSettleScheduler);
  const exactAfterSettleRefreshPlans = readProjectFile(FILES.exactAfterSettleRefreshPlans);
  const exactAfterSettlePassCatalog = readProjectFile(FILES.exactAfterSettlePassCatalog);
  const hgoPreviewRenderOwner = readProjectFile(FILES.hgoPreviewRenderOwner);
  const renderCacheOwner = readProjectFile(FILES.renderCacheOwner);
  const renderTransformReusePolicyOwner = readProjectFile(FILES.renderTransformReusePolicyOwner);
  const projectedGeometryBoundsOwner = readProjectFile(FILES.projectedGeometryBoundsOwner);
  const viewportReadModelOwner = readProjectFile(FILES.viewportReadModelOwner);
  const viewportCommandOwner = readProjectFile(FILES.viewportCommandOwner);
  const viewportResizeLifecycleOwner = readProjectFile(FILES.viewportResizeLifecycleOwner);
  const zoomInteractionLifecycleOwner = readProjectFile(FILES.zoomInteractionLifecycleOwner);
  const mapInteractionEventBindingOwner = readProjectFile(FILES.mapInteractionEventBindingOwner);
  const rendererSurfaceHost = readProjectFile(FILES.rendererSurfaceHost);
  const rendererSurfaceLifecycleOwner = readProjectFile(FILES.rendererSurfaceLifecycleOwner);
  const scenarioWaterCachePolicyOwner = readProjectFile(FILES.scenarioWaterCachePolicyOwner);
  const renderPipelinePasses = readProjectFile(FILES.renderPipelinePasses);
  const renderPipelineCatalog = readProjectFile(FILES.renderPipelineCatalog);
  const renderPassCatalog = readProjectFile(FILES.renderPassCatalog);
  const renderInvalidationCatalog = readProjectFile(FILES.renderInvalidationCatalog);
  const rendererSurfaceHostPreflightDoc = readProjectFile(FILES.rendererSurfaceHostPreflightDoc);
  const rendererSurfaceHostInventoryTest = readProjectFile(FILES.rendererSurfaceHostInventoryTest);
  const rendererSurfaceLifecyclePreflightDoc = readProjectFile(FILES.rendererSurfaceLifecyclePreflightDoc);
  const rendererSurfaceLifecycleInventoryTest = readProjectFile(FILES.rendererSurfaceLifecycleInventoryTest);
  const sources = {
    [FILES.renderer]: renderer,
    [FILES.canvasColorHelpers]: canvasColorHelpers,
    [FILES.scenarioRefreshRuntime]: scenarioRefreshRuntime,
    [FILES.scenarioRefreshPlans]: scenarioRefreshPlans,
    [FILES.scenarioVisualInvalidationExecutor]: scenarioVisualInvalidationExecutor,
    [FILES.exactAfterSettleScheduler]: exactAfterSettleScheduler,
    [FILES.exactAfterSettleRefreshPlans]: exactAfterSettleRefreshPlans,
    [FILES.exactAfterSettlePassCatalog]: exactAfterSettlePassCatalog,
    [FILES.hgoPreviewRenderOwner]: hgoPreviewRenderOwner,
    [FILES.renderCacheOwner]: renderCacheOwner,
    [FILES.renderTransformReusePolicyOwner]: renderTransformReusePolicyOwner,
    [FILES.projectedGeometryBoundsOwner]: projectedGeometryBoundsOwner,
    [FILES.viewportReadModelOwner]: viewportReadModelOwner,
    [FILES.viewportCommandOwner]: viewportCommandOwner,
    [FILES.viewportResizeLifecycleOwner]: viewportResizeLifecycleOwner,
    [FILES.zoomInteractionLifecycleOwner]: zoomInteractionLifecycleOwner,
    [FILES.mapInteractionEventBindingOwner]: mapInteractionEventBindingOwner,
    [FILES.rendererSurfaceHost]: rendererSurfaceHost,
    [FILES.rendererSurfaceLifecycleOwner]: rendererSurfaceLifecycleOwner,
    [FILES.scenarioWaterCachePolicyOwner]: scenarioWaterCachePolicyOwner,
    [FILES.renderPipelinePasses]: renderPipelinePasses,
    [FILES.renderPipelineCatalog]: renderPipelineCatalog,
    [FILES.renderPassCatalog]: renderPassCatalog,
    [FILES.renderInvalidationCatalog]: renderInvalidationCatalog,
    [FILES.rendererSurfaceHostPreflightDoc]: rendererSurfaceHostPreflightDoc,
    [FILES.rendererSurfaceHostInventoryTest]: rendererSurfaceHostInventoryTest,
    [FILES.rendererSurfaceLifecyclePreflightDoc]: rendererSurfaceLifecyclePreflightDoc,
    [FILES.rendererSurfaceLifecycleInventoryTest]: rendererSurfaceLifecycleInventoryTest,
  };

  for (const [relativePath, budget] of Object.entries(LINE_BUDGETS)) {
    const count = lineCount(sources[relativePath]);
    if (count > budget) {
      failures.push(`${relativePath} has ${count} lines; budget is ${budget}. Move focused behavior into an owner.`);
    }
  }

  for (const token of [
    "export function createRendererSurfaceHost(options = {})",
    "export const RENDERER_SURFACE_HANDLE_KEYS",
    "function createEmptyHandles()",
    "function normalizeHandleValue(value)",
    "function describeHandle(value)",
    "setMany",
    "snapshot",
  ]) {
    if (!rendererSurfaceHost.includes(token)) {
      failures.push(`${FILES.rendererSurfaceHost} must own token: ${token}`);
    }
  }
  for (const token of [
    "map_renderer.js",
    "runtimeState",
    "from \"../state.js\"",
    "from \"./state.js\"",
    "drawCanvas",
    "updateMap",
    "renderPassToCache",
    "buildHitCanvas",
    "applyDevSelectionFill",
    "renderExportPassesToCanvas",
    "renderLegend",
    "projectGeoToScreen",
    "invalidateRenderPasses",
    "requestInteractionRender",
    "requestRendererRender",
    "setMapData",
    "buildInteractionInfrastructureAfterStartup",
    "handleResize",
    "fitProjection",
    "initZoom",
    "bindEvents",
  ]) {
    if (rendererSurfaceHost.includes(token)) {
      failures.push(`${FILES.rendererSurfaceHost} must not own renderer semantic token: ${token}`);
    }
  }

  for (const token of [
    "export function createRendererSurfaceLifecycleOwner({",
    "function resolveDomHandles({",
    "function ensureCanvasLayerHandles({",
    "function ensureHitCanvasHandle()",
    "function acquireCanvasContexts()",
    "getDocument",
    "createHitCanvasElement",
    "ensureCanvasLayers",
    "getCanvasLayer",
    "CANVAS_LAYER_NAMES",
    "willReadFrequently: true",
  ]) {
    if (!rendererSurfaceLifecycleOwner.includes(token)) {
      failures.push(`${FILES.rendererSurfaceLifecycleOwner} must own mechanical lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "runtimeState",
    "from \"../state.js\"",
    "from \"./state.js\"",
    "map_renderer.js",
    "drawCanvas",
    "renderPassToCache",
    "buildHitCanvas",
    "applyDevSelectionFill",
    "refreshMapDataForScenarioChunkPromotion",
    "exactAfterSettle",
    "setMapData",
    "fitProjection",
    "initZoom",
    "bindEvents",
    "updateMap",
    "renderLegend",
    "renderExportPassesToCanvas",
  ]) {
    if (rendererSurfaceLifecycleOwner.includes(token)) {
      failures.push(`${FILES.rendererSurfaceLifecycleOwner} must not own renderer semantic token: ${token}`);
    }
  }

  if (!renderer.includes('from "./renderer/renderer_surface_host.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererSurfaceHost}.`);
  }
  if (!renderer.includes('from "./renderer/renderer_surface_lifecycle_owner.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererSurfaceLifecycleOwner}.`);
  }
  for (const sourcePath of listProjectSourceFiles("js")) {
    if (sourcePath === FILES.renderer) continue;
    const source = readProjectFile(sourcePath);
    if (source.includes("renderer_surface_host.js")) {
      failures.push(`${sourcePath} must not import renderer_surface_host.js directly; use ${FILES.renderer} as the composition root.`);
    }
    if (source.includes("renderer_surface_lifecycle_owner.js")) {
      failures.push(`${sourcePath} must not import renderer_surface_lifecycle_owner.js directly; use ${FILES.renderer} as the composition root.`);
    }
  }
  if (!renderer.includes("const rendererSurfaceHost = createRendererSurfaceHost();")) {
    failures.push(`${FILES.renderer} must instantiate rendererSurfaceHost once.`);
  }
  for (const token of [
    "let mapContainer = null;",
    "let canvasLayers = null;",
    "let context = null;",
    "let projection = null;",
    "let pathCanvas = null;",
    "let zoomBehavior = null;",
    "let viewportGroup = null;",
  ]) {
    if (renderer.includes(token)) {
      failures.push(`${FILES.renderer} must store surface handle ${token} in rendererSurfaceHost.`);
    }
  }
  for (const token of [
    "getContext: () => rendererSurfaceHost.getContext()",
    "getProjection: () => rendererSurfaceHost.getProjection()",
    "getPathCanvas: () => rendererSurfaceHost.getPathCanvas()",
    "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
    "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior()",
    "getInteractionRect: () => rendererSurfaceHost.getInteractionRect()",
    "getMapContainer: () => rendererSurfaceHost.getMapContainer()",
  ]) {
    if (!renderer.includes(token)) {
      failures.push(`${FILES.renderer} must keep owner getter closure: ${token}`);
    }
  }

  for (const heading of [
    "## Current surface handle inventory",
    "## P24 candidate surface host API",
    "## P24 allowed first move",
  ]) {
    if (!rendererSurfaceHostPreflightDoc.includes(heading)) {
      failures.push(`${FILES.rendererSurfaceHostPreflightDoc} must keep heading: ${heading}`);
    }
  }

  for (const token of [
    "const HANDLE_DECLARATIONS = Object.freeze([",
    "getContext: () => rendererSurfaceHost.getContext()",
    "getProjection: () => rendererSurfaceHost.getProjection()",
    "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior()",
    "getMapContainer: () => rendererSurfaceHost.getMapContainer()",
    "getRendererSurfaceLifecycleOwner().ensureCanvasLayerHandles({",
    "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
  ]) {
    if (!rendererSurfaceHostInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererSurfaceHostInventoryTest} must lock token: ${token}`);
    }
  }

  for (const heading of [
    "## Scope and guardrails",
    "## Current P24 surface host state",
    "## Current initMap surface lifecycle map",
    "## DOM/root lifecycle inventory",
    "## Canvas lifecycle inventory",
    "## SVG/group lifecycle inventory",
    "## Context acquisition inventory",
    "## Projection/path lifecycle inventory",
    "## Zoom/event lifecycle inventory",
    "## RuntimeState bridge write inventory",
    "## P26 allowed first move",
    "## P26 forbidden areas",
    "## Required validation commands",
  ]) {
    if (!rendererSurfaceLifecyclePreflightDoc.includes(heading)) {
      failures.push(`${FILES.rendererSurfaceLifecyclePreflightDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P26 candidate extraction is limited to DOM/canvas/SVG surface lifecycle wrapper; projection/path/zoom/event/render semantics are not yet moved.",
    "P26 may add `js/core/renderer/renderer_surface_lifecycle_owner.js`.",
    "Map container and tooltip lookup.",
    "2D context acquisition into `rendererSurfaceHost`.",
    "Projection/path creation.",
    "`fitProjection`.",
    "`initZoom`.",
    "`bindEvents`.",
    "Direct runtimeState writes.",
    "P26 must not add `js/core/renderer/renderer_render_lifecycle_owner.js`.",
  ]) {
    if (!rendererSurfaceLifecyclePreflightDoc.includes(token)) {
      failures.push(`${FILES.rendererSurfaceLifecyclePreflightDoc} must lock P26 surface lifecycle boundary token: ${token}`);
    }
  }
  for (const token of [
    "const LIFECYCLE_OWNER_SEMANTIC_BLACKLIST = Object.freeze([",
    "const LIFECYCLE_OWNER_REQUIRED_TOKENS = Object.freeze([",
    "const P26_FORBIDDEN_REGION_TOKENS = Object.freeze([",
    "const RUNTIME_STATE_BRIDGE_ANCHORS = Object.freeze([",
    "renderer_surface_lifecycle_owner.js",
    "createRendererSurfaceLifecycleOwner({",
    "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
    "renderer_render_lifecycle_owner.js",
    "assertNoRendererOwnerImportsMapRenderer",
    "P26 must keep current runtimeState bridge writes in map_renderer without adding a test-file state writer",
  ]) {
    if (!rendererSurfaceLifecycleInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererSurfaceLifecycleInventoryTest} must lock P26 lifecycle inventory token: ${token}`);
    }
  }
  for (const tokenParts of [
    ["runtimeState.", "colorCanvas = rendererSurfaceHost.getMapCanvas()"],
    ["runtimeState.", "colorCtx = rendererSurfaceHost.getContext()"],
  ]) {
    if (!rendererSurfaceLifecycleInventoryTest.includes(tokenParts[0])
      || !rendererSurfaceLifecycleInventoryTest.includes(tokenParts[1])) {
      failures.push(`${FILES.rendererSurfaceLifecycleInventoryTest} must lock runtimeState bridge token fragments: ${tokenParts.join("")}`);
    }
  }
  const rendererSourceFiles = listProjectSourceFiles("js/core/renderer");
  if (rendererSourceFiles.includes("js/core/renderer/renderer_render_lifecycle_owner.js")) {
    failures.push("P26 must not introduce js/core/renderer/renderer_render_lifecycle_owner.js.");
  }
  for (const sourcePath of rendererSourceFiles.filter(isRendererOwnerPath)) {
    const source = readProjectFile(sourcePath);
    if (hasMapRendererImport(source)) {
      failures.push(`${sourcePath} must not import js/core/map_renderer.js; keep ${FILES.renderer} as the composition root.`);
    }
  }

  const requiredImports = [
    "./map_renderer/scenario_refresh_runtime.js",
    "./renderer/canvas_color_helpers.js",
    "./map_renderer/exact_after_settle_scheduler.js",
    "./map_renderer/hgo_runtime_preview_render_owner.js",
    "./renderer/renderer_surface_lifecycle_owner.js",
  ];
  for (const importPath of requiredImports) {
    if (!includesImport(renderer, importPath)) {
      failures.push(`${FILES.renderer} must import ${importPath}.`);
    }
  }

  const ownerFiles = [
    FILES.scenarioRefreshRuntime,
    FILES.canvasColorHelpers,
    FILES.scenarioVisualInvalidationExecutor,
    FILES.exactAfterSettleScheduler,
    FILES.exactAfterSettleRefreshPlans,
    FILES.exactAfterSettlePassCatalog,
    FILES.hgoPreviewRenderOwner,
    FILES.renderCacheOwner,
    FILES.renderTransformReusePolicyOwner,
    FILES.projectedGeometryBoundsOwner,
    FILES.viewportReadModelOwner,
    FILES.viewportCommandOwner,
    FILES.viewportResizeLifecycleOwner,
    FILES.zoomInteractionLifecycleOwner,
    FILES.mapInteractionEventBindingOwner,
    FILES.rendererSurfaceHost,
    FILES.rendererSurfaceLifecycleOwner,
    FILES.scenarioWaterCachePolicyOwner,
    FILES.renderPipelinePasses,
    FILES.renderPipelineCatalog,
    FILES.renderPassCatalog,
    FILES.renderInvalidationCatalog,
  ];
  for (const ownerPath of ownerFiles) {
    const source = sources[ownerPath];
    if (/from\s+["'][^"']*map_renderer\.js["']/.test(source)) {
      failures.push(`${ownerPath} must not import js/core/map_renderer.js.`);
    }
  }

  for (const forbiddenImport of [
    "scenario_refresh_runtime.js",
    "exact_after_settle_scheduler.js",
  ]) {
    if (scenarioVisualInvalidationExecutor.includes(forbiddenImport)) {
      failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not import ${forbiddenImport}.`);
    }
  }

  if (!scenarioVisualInvalidationExecutor.includes("function createScenarioVisualInvalidationExecutor(deps = {})")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must own createScenarioVisualInvalidationExecutor.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("function getRequiredRendererEffect(deps, name)")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must fail fast when renderer effects are missing.`);
  }
  if (scenarioVisualInvalidationExecutor.includes("function noop()") || scenarioVisualInvalidationExecutor.includes("= noop")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not silently noop renderer side effects.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("function executeScenarioVisualInvalidation({")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must own executeScenarioVisualInvalidation.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("from \"./render_invalidation_catalog.js\";")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must import render invalidation catalog.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("UNSUPPORTED_RENDER_PASS_INPUT_KEYS")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must use UNSUPPORTED_RENDER_PASS_INPUT_KEYS from the catalog.`);
  }
  if (scenarioVisualInvalidationExecutor.includes("const RETIRED_VISUAL_INVALIDATION_PASS_INPUT_KEYS = Object.freeze([")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not locally define retired visual invalidation pass inputs.`);
  }
  const renderCacheOwnerFactorySource = sliceBetween(
    renderer,
    "function getRenderCacheOwner() {",
    "function getIntensityFieldMaskOwner() {",
  );
  if (renderCacheOwnerFactorySource.includes("invalidateInteractionComposite,")) {
    failures.push(`${FILES.renderer} must not inject invalidateInteractionComposite into the render cache owner.`);
  }
  if (renderCacheOwner.includes("invalidateInteractionComposite = () => {}")) {
    failures.push(`${FILES.renderCacheOwner} must not keep an injected invalidateInteractionComposite helper fallback.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("findRetiredVisualInvalidationPassInputKey(executionPlan)")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must reject retired execution-plan pass inputs through one retired-key check.`);
  }
  if (/function executeScenarioVisualInvalidation\([\s\S]*?\btargetPasses\s*=/.test(scenarioVisualInvalidationExecutor)) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not accept top-level targetPasses.`);
  }
  if (scenarioVisualInvalidationExecutor.includes("const legacyTargetPasses =")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must route fallback pass lists through the execution plan bridge.`);
  }
  if (!scenarioRefreshRuntime.includes("createScenarioVisualInvalidationExecutor({")) {
    failures.push(`${FILES.scenarioRefreshRuntime} must create the scenario visual invalidation executor.`);
  }
  if (!scenarioRefreshRuntime.includes("scenarioVisualInvalidationExecutor.executeScenarioVisualInvalidation({")) {
    failures.push(`${FILES.scenarioRefreshRuntime} chunk promotion visual invalidation must call the executor.`);
  }
  if (scenarioRefreshRuntime.includes("const invalidationTargetPasses = targetPasses.length")) {
    failures.push(`${FILES.scenarioRefreshRuntime} must get invalidationTargetPasses from the FrameGraph execution bridge.`);
  }
  const chunkPromotionRuntimeSource = sliceBetween(
    scenarioRefreshRuntime,
    "function refreshMapDataForScenarioChunkPromotion(",
    "function refreshMapDataForScenarioApply(",
  );
  if (/executionPlan:\s*\{[^}]*\btargetPasses\s*[,}:]/.test(chunkPromotionRuntimeSource)) {
    failures.push(`${FILES.scenarioRefreshRuntime} must not pass retired targetPasses through the visual invalidation execution plan.`);
  }
  if (!scenarioRefreshPlans.includes("function resolveFrameGraphInvalidationExecutionPlan(")) {
    failures.push(`${FILES.scenarioRefreshPlans} must own resolveFrameGraphInvalidationExecutionPlan.`);
  }
  const frameGraphFactoryStart = scenarioRefreshPlans.indexOf("function createFrameGraphInvalidation(");
  const frameGraphBridgeStart = scenarioRefreshPlans.indexOf("function getFrameGraphInvalidationTargetPasses(", frameGraphFactoryStart);
  if (frameGraphFactoryStart < 0 || frameGraphBridgeStart < 0) {
    failures.push(`${FILES.scenarioRefreshPlans} must keep createFrameGraphInvalidation next to the FrameGraph execution bridge.`);
  } else if (/legacyTargetPasses|targetPasses\s*=|targetPasses:|getTargetResourcesForPasses\(targetPasses\)/.test(scenarioRefreshPlans.slice(frameGraphFactoryStart, frameGraphBridgeStart))) {
    failures.push(`${FILES.scenarioRefreshPlans} FrameGraph invalidation descriptors must not accept or expose pass fields.`);
  }
  const exportBlock = scenarioRefreshPlans.slice(scenarioRefreshPlans.indexOf("export {"));
  if (exportBlock.includes("getFrameGraphInvalidationTargetPasses,")) {
    failures.push(`${FILES.scenarioRefreshPlans} must keep getFrameGraphInvalidationTargetPasses inside the bridge.`);
  }
  const frameGraphExecutionPlanSource = sliceBetween(
    scenarioRefreshPlans,
    "function resolveFrameGraphInvalidationExecutionPlan(",
    "function createScenarioApplyRefreshPlan(",
  );
  if (/\btargetPasses\s*[,}:]/.test(frameGraphExecutionPlanSource)) {
    failures.push(`${FILES.scenarioRefreshPlans} execution plans must expose invalidationTargetPasses instead of targetPasses.`);
  }
  if (!scenarioRefreshPlans.includes("from \"./render_invalidation_catalog.js\";")) {
    failures.push(`${FILES.scenarioRefreshPlans} must import render invalidation catalog.`);
  }
  for (const token of [
    "const PASS_RESOURCE_MAP = Object.freeze({",
    "const RESOURCE_PASS_MAP = Object.freeze(",
    "const FIRST_FRAME_BASE_TARGET_RESOURCES = Object.freeze([",
    "const FIRST_FRAME_HGO_TARGET_RESOURCES = Object.freeze([",
    "const UNSUPPORTED_FRAME_GRAPH_INVALIDATION_INPUT_KEYS = Object.freeze([",
    "function getTargetResourcesForPasses(",
    "function getTargetPassesForResources(",
    "function hasAnyTargetResource(",
    "function getFirstFrameTargetResources(",
    "function resolveFirstFrameTargetResources(",
  ]) {
    if (scenarioRefreshPlans.includes(token)) {
      failures.push(`${FILES.scenarioRefreshPlans} must not own extracted render invalidation catalog token: ${token}`);
    }
  }
  for (const token of [
    "const DEFAULT_RENDER_INVALIDATION_PASSES =",
    "const RETIRED_VISUAL_INVALIDATION_PASS_INPUT_KEYS = Object.freeze([",
  ]) {
    if (scenarioVisualInvalidationExecutor.includes(token)) {
      failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not own extracted render invalidation catalog token: ${token}`);
    }
  }
  if (!exactAfterSettleRefreshPlans.includes("from \"../renderer/exact_after_settle_pass_catalog.js\";")) {
    failures.push(`${FILES.exactAfterSettleRefreshPlans} must import exact-after-settle pass catalog.`);
  }
  if (!renderPipelinePasses.includes("from \"./exact_after_settle_pass_catalog.js\";")) {
    failures.push(`${FILES.renderPipelinePasses} must import exact-after-settle pass catalog.`);
  }
  if (renderer.includes("EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES")) {
    failures.push(`${FILES.renderer} must not import or bridge EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES.`);
  }
  if (renderer.includes("exactAfterSettleDeferredPassNames: EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES")) {
    failures.push(`${FILES.renderer} must not inject exactAfterSettleDeferredPassNames from the host shell.`);
  }
  const exactFastPathRequiredPassListSource = sliceBetween(
    renderTransformReusePolicyOwner,
    "const EXACT_AFTER_SETTLE_FAST_PATH_REQUIRED_PASS_NAMES = Object.freeze([",
    "]);",
  );
  const exactFastPathRequiredPassNames = [
    "background",
    "physicalBase",
    "political",
    "contextBase",
    "contextScenario",
    "effects",
    "lineEffects",
    "contextMarkers",
    "dayNight",
    "textureLabels",
  ];
  const exactFastPathDeclaredPassNames = Array.from(
    exactFastPathRequiredPassListSource.matchAll(/"([^"]+)"/g),
    (match) => match[1],
  );
  if (JSON.stringify(exactFastPathDeclaredPassNames) !== JSON.stringify(exactFastPathRequiredPassNames)) {
    failures.push(`${FILES.renderTransformReusePolicyOwner} exact fast-path list must exactly match the required pass order.`);
  }
  for (const passName of exactFastPathRequiredPassNames) {
    if (!exactFastPathRequiredPassListSource.includes(`"${passName}"`)) {
      failures.push(`${FILES.renderTransformReusePolicyOwner} exact fast-path list must include ${passName}.`);
    }
  }
  for (const passName of ["borders", "labels", "hgoPreview"]) {
    if (exactFastPathRequiredPassListSource.includes(`"${passName}"`)) {
      failures.push(`${FILES.renderTransformReusePolicyOwner} exact fast-path list must not include ${passName}.`);
    }
  }
  for (const token of [
    "document.",
    "window.",
    "globalThis.d3",
    "requestAnimationFrame(",
    ".getContext(",
    "projection.",
    "zoomBehavior",
  ]) {
    if (renderTransformReusePolicyOwner.includes(token)) {
      failures.push(`${FILES.renderTransformReusePolicyOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  if (/runtimeState\s*\./.test(renderTransformReusePolicyOwner)) {
    failures.push(`${FILES.renderTransformReusePolicyOwner} must not write or read runtimeState directly.`);
  }
  for (const token of [
    "runtimeState",
    "state.",
    "globalThis.d3",
    "Path2D",
    "document.",
    "window.",
    "requestAnimationFrame(",
    ".getContext(",
    "drawCanvas",
    "renderPassToCache",
    "zoomBehavior",
  ]) {
    if (projectedGeometryBoundsOwner.includes(token)) {
      failures.push(`${FILES.projectedGeometryBoundsOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "zoomBehavior",
    "interactionRect",
    ".call(zoomBehavior",
    "runtimeState",
    "document.",
  ]) {
    if (viewportReadModelOwner.includes(token)) {
      failures.push(`${FILES.viewportReadModelOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "../map_renderer.js",
    "./map_renderer.js",
    "runtimeState",
    "drawCanvas",
    "handleResize",
    "initZoom",
    "fitProjection",
    "setCanvasSize",
    "renderPassToCache",
  ]) {
    if (viewportCommandOwner.includes(token)) {
      failures.push(`${FILES.viewportCommandOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "../map_renderer.js",
    "./map_renderer.js",
    "runtimeState",
    "drawCanvas",
    "initZoom",
    "renderPassToCache",
    "createElement(",
    "appendChild(",
    ".getContext(",
    "mapCanvas",
    "mapSvg",
    "projection.",
  ]) {
    if (viewportResizeLifecycleOwner.includes(token)) {
      failures.push(`${FILES.viewportResizeLifecycleOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "../map_renderer.js",
    "./map_renderer.js",
    "runtimeState",
    "document.",
    "zoomBehavior",
    "drawScenarioRegionOverlaysPass",
    "context.",
  ]) {
    if (scenarioWaterCachePolicyOwner.includes(token)) {
      failures.push(`${FILES.scenarioWaterCachePolicyOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "../map_renderer.js",
    "./map_renderer.js",
    "runtimeState",
    "drawCanvas",
    "renderPassToCache",
    "handleResize",
    "fitProjection",
    "setCanvasSize",
    "canvas",
    "svg",
    "projection",
    "path",
    "document.",
  ]) {
    if (zoomInteractionLifecycleOwner.includes(token)) {
      failures.push(`${FILES.zoomInteractionLifecycleOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "runtimeState",
    "selectedColor",
    "applyDevSelectionFill",
    "drawCanvas",
    "document.",
  ]) {
    if (mapInteractionEventBindingOwner.includes(token)) {
      failures.push(`${FILES.mapInteractionEventBindingOwner} must not touch renderer behavior token: ${token}`);
    }
  }
  for (const token of [
    "const EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES = new Set([",
    "const EXACT_AFTER_SETTLE_ALWAYS_TARGET_PASSES = [",
    "function getExactAfterSettleDprRestorePasses(",
    "export function getExactAfterSettleDprRestorePasses(",
  ]) {
    if (exactAfterSettleRefreshPlans.includes(token)) {
      failures.push(`${FILES.exactAfterSettleRefreshPlans} must not own extracted exact-after-settle pass policy token: ${token}`);
    }
  }

  const ownershipRules = [
    {
      ownerPath: FILES.rendererSurfaceLifecycleOwner,
      ownerTokens: [
        "export function createRendererSurfaceLifecycleOwner({",
        "function resolveDomHandles({",
        "function ensureCanvasLayerHandles({",
        "function ensureHitCanvasHandle()",
        "function acquireCanvasContexts()",
        "createHitCanvasElement",
        "ensureCanvasLayers",
        "getCanvasLayer",
        "CANVAS_LAYER_NAMES",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/renderer_surface_lifecycle_owner.js\";",
        "let rendererSurfaceLifecycleOwner = null;",
        "function getRendererSurfaceLifecycleOwner()",
        "createRendererSurfaceLifecycleOwner({",
        "surfaceHost: rendererSurfaceHost",
        "getDocument: () => document",
        "createHitCanvasElement,",
        "CANVAS_LAYER_NAMES,",
        "ensureCanvasLayers,",
        "getCanvasLayer,",
        "getRendererSurfaceLifecycleOwner().resolveDomHandles({ containerId });",
        "getRendererSurfaceLifecycleOwner().ensureCanvasLayerHandles({",
        "getRendererSurfaceLifecycleOwner().ensureHitCanvasHandle();",
        "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
      ],
      rendererForbiddenTokens: [
        "rendererSurfaceHost.setMapContainer(document.getElementById(containerId))",
        "rendererSurfaceHost.setTooltip(document.getElementById(\"tooltip\"))",
        "rendererSurfaceHost.setCanvasLayers(ensureCanvasLayers(rendererSurfaceHost.getMapContainer(), {",
        "rendererSurfaceHost.setMapCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.composite)?.canvas || null);",
        "rendererSurfaceHost.setPoliticalPatchCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.politicalPatch)?.canvas || null);",
        "rendererSurfaceHost.setInteractionOverlayCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.interactionOverlay)?.canvas || null);",
        "rendererSurfaceHost.setContext(rendererSurfaceHost.getMapCanvas().getContext(\"2d\"))",
        "rendererSurfaceHost.setHitContext(rendererSurfaceHost.getHitCanvas().getContext(\"2d\", { willReadFrequently: true }))",
      ],
    },
    {
      ownerPath: FILES.canvasColorHelpers,
      ownerTokens: [
        "function isProbablyCanvasColor(value) {",
        "function getSafeCanvasColor(value, fallback) {",
        "function parseCanvasColorChannels(value) {",
        "function getCanvasColorRelativeLuminance(value) {",
        "function mixCanvasColors(baseColor, targetColor, amount) {",
        'import { ColorManager } from "../color_manager.js";',
      ],
      rendererRequiredTokens: [
        "from \"./renderer/canvas_color_helpers.js\";",
      ],
      rendererForbiddenTokens: [
        "const COLOR_HEX_RE =",
        "const COLOR_FUNC_RE =",
        "const COLOR_NAME_RE =",
        "function isProbablyCanvasColor(value) {",
        "function getSafeCanvasColor(value, fallback) {",
        "function parseCanvasColorChannels(value) {",
        "function getCanvasColorRelativeLuminance(value) {",
        "function mixCanvasColors(baseColor, targetColor, amount) {",
      ],
    },
    {
      ownerPath: FILES.scenarioRefreshRuntime,
      ownerTokens: [
        "let deferredScenarioChunkPromotionInfraHandle = null;",
        "let scenarioChunkPromotionVersion = 0;",
        "function refreshMapDataForScenarioApply({",
      ],
      rendererRequiredTokens: [
        "let scenarioRefreshRuntime = null;",
        "createScenarioRefreshRuntime({",
        "return scenarioRefreshRuntime.refreshMapDataForScenarioApply(options);",
      ],
      rendererForbiddenTokens: [
        "let deferredScenarioChunkPromotionInfraHandle = null;",
        "let scenarioChunkPromotionVersion = 0;",
        "function buildScenarioChunkPromotionVisualMetricDetails(",
      ],
    },
    {
      ownerPath: FILES.exactAfterSettleScheduler,
      ownerTokens: [
        "let deferredExactContextRefreshHandle = null;",
        "let deferredExactContextRefreshVersion = 0;",
        "function buildExactAfterSettleRefreshPlan(",
        "function scheduleExactAfterSettleRefresh(",
      ],
      rendererRequiredTokens: [
        "let exactAfterSettleScheduler = null;",
        "createExactAfterSettleScheduler({",
        "return getExactAfterSettleScheduler().scheduleExactAfterSettleRefresh(profile);",
      ],
      rendererForbiddenTokens: [
        "let deferredExactContextRefreshHandle = null;",
        "function buildExactAfterSettleRefreshPlan(",
        "function applyExactAfterSettleRefreshPlan(plan) {",
      ],
    },
    {
      ownerPath: FILES.exactAfterSettlePassCatalog,
      ownerTokens: [
        "export const EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES = new Set([",
        "export const EXACT_AFTER_SETTLE_ALWAYS_TARGET_PASSES = [",
        "export function getExactAfterSettleDprRestorePasses(",
      ],
    },
    {
      ownerPath: FILES.hgoPreviewRenderOwner,
      ownerTokens: [
        "function drawPreviewPass() {",
        "function inspectFromEvent(event, { eventType = \"unknown\" } = {}) {",
        "function getProjectedBounds() {",
        "const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES = Object.freeze([",
      ],
      rendererRequiredTokens: [
        "let hgoRuntimePreviewRenderOwner = null;",
        "createHgoRuntimePreviewRenderOwner({",
        "return getHgoRuntimePreviewRenderOwner().renderIfReady(reason, options);",
        "return getHgoRuntimePreviewRenderOwner().inspectFromEvent(event, { eventType });",
        "getHgoRuntimePreviewRenderOwner().drawPreviewPass();",
      ],
      rendererForbiddenTokens: [
        "const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES =",
        "function getHgoRuntimePreviewCanvasPointFromEvent(",
        "const HGO_RUNTIME_PREVIEW_PROJECTION_NAME =",
      ],
    },
    {
      ownerPath: FILES.renderCacheOwner,
      ownerTokens: [
        "function invalidateRenderPasses(",
        "function invalidateAllRenderPasses(",
        "function clearRenderPassReferenceTransforms(",
        "function invalidateInteractionComposite(",
        "function clearLastGoodFrame(",
        "function createMutationSummary(",
        "const RENDER_CACHE_OWNER_SUMMARY_VERSION = 1;",
        "requestedPassNames,",
        "normalizedPassNames,",
        "droppedPassNames,",
        "sharedReferenceTransformCleared",
      ],
      rendererRequiredTokens: [
        "function getMutationPassNames(mutation = {})",
        "return applyRenderPassInvalidationEffects(getRenderCacheOwner().invalidateRenderPasses(",
        "return applyRenderPassInvalidationEffects(getRenderCacheOwner().invalidateAllRenderPasses(",
        "const mutation = getRenderCacheOwner().clearRenderPassReferenceTransforms(",
        "return getRenderCacheOwner().invalidateInteractionComposite(",
        "return getRenderCacheOwner().clearLastGoodFrame(",
      ],
      rendererForbiddenTokens: [
        "cache.dirty[passName] = true;",
        "cache.reasons[passName] = String(reason || \"unspecified\");",
        "cache.interactionComposite.valid = false;",
        "cache.interactionComposite.referenceTransform = null;",
        "cache.interactionComposite.signature = \"\";",
        "cache.lastGoodFrame.valid = false;",
        "cache.lastGoodFrame.stale = true;",
        "delete cache.referenceTransforms[passName];",
        "renderPassCache.referenceTransform = null;",
        "renderPassCache.referenceTransforms = {};",
        "renderPassCache.fullReferenceTransforms = {};",
      ],
    },
    {
      ownerPath: FILES.renderTransformReusePolicyOwner,
      ownerTokens: [
        "export function createRenderTransformReusePolicyOwner(",
        "function getContextBaseZoomBucketId(",
        "function getContextBaseReuseMaxDistancePx(",
        "function getTransformReuseDelta(",
        "function shouldEnableContextBaseTransformReuse(",
        "function shouldEnableContextScenarioTransformReuse(",
        "function getContextBaseReuseDecision(",
        "function getContextScenarioReuseDecision(",
        "function shouldStartExactAfterSettleFastPath(",
      ],
      rendererRequiredTokens: [
        "createRenderTransformReusePolicyOwner({",
        "return getRenderTransformReusePolicyOwner().getContextBaseReuseDecision(",
        "return getRenderTransformReusePolicyOwner().getContextScenarioReuseDecision(",
        "return getRenderTransformReusePolicyOwner().shouldStartExactAfterSettleFastPath(",
      ],
      rendererForbiddenTokens: [
        "const CONTEXT_BASE_REUSE_MIN_DISTANCE_PX =",
        "const CONTEXT_BASE_REUSE_MAX_DISTANCE_PX =",
        "const CONTEXT_BASE_REUSE_MAX_DISTANCE_VIEWPORT_RATIO =",
        "const CONTEXT_BASE_MINOR_CONTOUR_THRESHOLD =",
        "const CONTEXT_BASE_BUCKET_LOW_MAX =",
        "const CONTEXT_BASE_BUCKET_MID_MAX =",
        "const CONTEXT_SCENARIO_REUSE_MAX_DISTANCE_PX =",
        "const CONTEXT_SCENARIO_REUSE_FRAME_LIMIT =",
      ],
    },
    {
      ownerPath: FILES.projectedGeometryBoundsOwner,
      ownerTokens: [
        "export function createProjectedGeometryBoundsOwner(",
        "function computeProjectedCoordinateBounds(",
        "function computeProjectedGeoBounds(",
        "function getProjectedFeatureBounds(",
        "function rebuildProjectedBoundsCache(",
        "function getSphericalGeometryDiagnostics(",
        "function collectSafeWaterRegionGeometryPartsInfo(",
        "function sanitizeWaterRegionFeatures(",
        "function clearProjectedBoundsCache(",
        "function mergeProjectedBounds(",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/projected_geometry_bounds_owner.js\";",
        "let projectedGeometryBoundsOwner = null;",
        "createProjectedGeometryBoundsOwner({",
        "getD3: () => globalThis.d3,",
        "return getProjectedGeometryBoundsOwner().computeProjectedGeoBounds(geoObject);",
        "return getProjectedGeometryBoundsOwner().getProjectedFeatureBounds(feature, { featureId, allowCompute });",
        "return getProjectedGeometryBoundsOwner().sanitizeWaterRegionFeatures(features);",
        "collectFeatureHitGeometries: collectSafeWaterRegionGeometryParts,",
        "let scenarioWaterPartPathCache = new WeakMap();",
        "let scenarioWaterFeaturePathCache = new WeakMap();",
      ],
      rendererForbiddenTokens: [
        "const sphericalGeometryDiagnosticsByObject = new WeakMap();",
        "const safeWaterRegionGeometryPartsByFeature = new WeakMap();",
        "const sanitizedWaterRegionFeatureByFeature = new WeakMap();",
        "const waterSphericalSanitizationWarnings = new Set();",
        "const SPHERICAL_GEOMETRY_MAX_AREA =",
      ],
    },
    {
      ownerPath: FILES.viewportReadModelOwner,
      ownerTokens: [
        "export function createViewportReadModelOwner(",
        "function getViewportRenderSignature(",
        "function getProjectionRenderSignature(",
        "function getViewportGeoBounds(",
        "function calculatePanExtent(",
        "function getProjectedRenderableContentBounds(",
        "function getCenteredFitZoomTransform(",
        "function getZoomPercent(",
      ],
      rendererRequiredTokens: [
        "createViewportReadModelOwner({",
        "return getViewportReadModelOwner().getViewportRenderSignature(",
        "return getViewportReadModelOwner().getProjectionRenderSignature(",
        "return getViewportReadModelOwner().getViewportGeoBounds(",
        "return getViewportReadModelOwner().calculatePanExtent(",
        "return getViewportReadModelOwner().getProjectedRenderableContentBounds(",
        "return getViewportReadModelOwner().getCenteredFitZoomTransform(",
        "return getViewportReadModelOwner().getZoomPercent(",
      ],
      rendererForbiddenTokens: [
        "const samplePoints = [",
        "sortedLongitudes[trimCount]",
        "projection.scale() || 0",
        "return `${Math.round(scale * 100)}%`;",
      ],
    },
    {
      ownerPath: FILES.viewportCommandOwner,
      ownerTokens: [
        "export function createViewportCommandOwner(",
        "function updateZoomTranslateExtent(",
        "function resetZoomToFit(",
        "function zoomByStep(",
        "function setZoomPercent(",
        "function enforceZoomConstraints(",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/viewport_command_owner.js\";",
        "let viewportCommandOwner = null;",
        "createViewportCommandOwner({",
        "setZoomTransform: (transform) => {",
        "return getViewportCommandOwner().updateZoomTranslateExtent(",
        "return getViewportCommandOwner().resetZoomToFit(",
        "return getViewportCommandOwner().zoomByStep(",
        "return getViewportCommandOwner().setZoomPercent(",
        "return getViewportCommandOwner().enforceZoomConstraints(",
      ],
      rendererForbiddenTokens: [
        "zoomBehavior.scaleExtent([MIN_ZOOM_SCALE, MAX_ZOOM_SCALE]);",
        "globalThis.d3.select(interactionRect.node()).call(zoomBehavior.transform, transform);",
        "globalThis.d3.select(interactionRect.node()).call(zoomBehavior.scaleBy",
        "globalThis.d3.select(interactionRect.node()).call(zoomBehavior.scaleTo",
        "globalThis.d3.select(interactionRect.node()).call(zoomBehavior.translateBy",
      ],
    },
    {
      ownerPath: FILES.viewportResizeLifecycleOwner,
      ownerTokens: [
        "export function createViewportResizeLifecycleOwner(",
        "function requestMapContainerResizeSync(",
        "function bindMapContainerResizeObserver(",
        "function bindBrowserPixelRatioObserver(",
        "function bindVisualViewportResizeObserver(",
        "function handleBrowserPixelRatioRefresh(",
        "function handleResize(",
        "function scheduleResizeSpatialRefresh(",
      ],
      rendererRequiredTokens: [
        "createViewportResizeLifecycleOwner({",
        "return getViewportResizeLifecycleOwner().requestMapContainerResizeSync(",
        "return getViewportResizeLifecycleOwner().handleResize(",
        "return getViewportResizeLifecycleOwner().bindBrowserZoomObservers(",
      ],
      rendererForbiddenTokens: [
        "let mapContainerResizeObserver =",
        "let mapContainerResizeFrame =",
        "let mapContainerResizeTimer =",
        "let pendingMapResizeReason =",
        "let browserPixelRatioMediaQuery =",
        "let browserPixelRatioMediaQueryHandler =",
        "let visualViewportResizeHandler =",
        "let resizeSpatialRefreshHandle =",
      ],
    },
    {
      ownerPath: FILES.zoomInteractionLifecycleOwner,
      ownerTokens: [
        "export function createZoomInteractionLifecycleOwner(",
        "function initZoom(",
        "function flushLatestZoomTransform(",
      ],
      rendererRequiredTokens: [
        "createZoomInteractionLifecycleOwner({",
        "return getZoomInteractionLifecycleOwner().initZoom(",
      ],
      rendererForbiddenTokens: [
        "zoomBehavior = globalThis.d3",
        ".on(\"start\", () => {",
        ".on(\"zoom\", (event) => {",
        ".on(\"end\", (event) => {",
      ],
    },
    {
      ownerPath: FILES.mapInteractionEventBindingOwner,
      ownerTokens: [
        "export function createMapInteractionEventBindingOwner(",
        "function bindEvents(",
      ],
      rendererRequiredTokens: [
        "createMapInteractionEventBindingOwner({",
        "return getMapInteractionEventBindingOwner().bindEvents(",
      ],
      rendererForbiddenTokens: [
        "bindInteractionFunnel({",
        "interactionRect.on(\"mousemove\"",
        "interactionRect.on(\"pointerdown.fieldTool\"",
        "window.addEventListener(\"resize\"",
      ],
    },
    {
      ownerPath: FILES.scenarioWaterCachePolicyOwner,
      ownerTokens: [
        "export function createScenarioWaterCachePolicyOwner(",
        "function normalizeScenarioWaterCacheStrategyMode(",
        "function getForcedScenarioWaterCacheMode(",
        "function normalizeScenarioWaterCoverageAlgo(",
        "function getForcedScenarioWaterCoverageAlgo(",
        "function getScenarioWaterVisibleCoverageRatioLegacy(",
        "function getScenarioWaterVisibleCoverageRatioGrid(",
        "function getScenarioWaterCacheComplexitySignals(",
        "function shouldUseDirectScenarioWaterDraw(",
      ],
      rendererRequiredTokens: [
        "createScenarioWaterCachePolicyOwner({",
        "return getScenarioWaterCachePolicyOwner().getForcedScenarioWaterCacheMode(",
        "return getScenarioWaterCachePolicyOwner().getScenarioWaterCacheComplexitySignals(",
        "return getScenarioWaterCachePolicyOwner().shouldUseDirectScenarioWaterDraw(",
      ],
      rendererForbiddenTokens: [
        "const SCENARIO_WATER_CACHE_MODE_PARAM =",
        "const SCENARIO_WATER_CACHE_MODE_ALT_PARAM =",
        "const SCENARIO_WATER_CACHE_MODES =",
        "const SCENARIO_WATER_COVERAGE_ALGO_PARAM =",
        "const SCENARIO_WATER_COVERAGE_ALGO_ALT_PARAM =",
        "const SCENARIO_WATER_COVERAGE_ALGOS =",
        "const SCENARIO_WATER_COVERAGE_GRID_BASE_COLUMNS =",
        "const SCENARIO_WATER_COVERAGE_GRID_BASE_ROWS =",
        "const SCENARIO_WATER_COVERAGE_GRID_MAX_DPR =",
        "const SCENARIO_WATER_LOW_COMPLEXITY_FEATURE_MAX =",
        "const SCENARIO_WATER_LOW_COMPLEXITY_COVERAGE_MAX =",
        "const SCENARIO_WATER_LOW_COMPLEXITY_PREV_RENDERED_MAX =",
      ],
    },
    {
      ownerPath: FILES.renderPipelineCatalog,
      ownerTokens: [
        "export const IDLE_RENDER_PASS_DEFINITIONS = [",
        'passName: "background", drawKey: "drawBackgroundPass"',
        'passName: "hgoPreview", drawKey: "drawHgoPreviewPass"',
        'passName: "contextScenario", drawKey: "drawContextScenarioPass"',
        'passName: "textureLabels", drawKey: "drawTextureLabelEffectsPass"',
      ],
      rendererRequiredPath: FILES.renderPipelinePasses,
      rendererRequiredTokens: [
        "from \"./render_pipeline_catalog.js\";",
      ],
      rendererForbiddenPath: FILES.renderPipelinePasses,
      rendererForbiddenTokens: [
        '["background", (k) => drawBackgroundPass(k)],',
        '["hgoPreview", (k) => drawHgoPreviewPass(k)],',
        '["contextScenario", (k) => drawContextScenarioPass(k)],',
        '["textureLabels", (k) => drawTextureLabelEffectsPass(k)],',
      ],
    },
    {
      ownerPath: FILES.renderPassCatalog,
      ownerTokens: [
        "export const RENDER_PASS_NAMES = [",
        "export const TRANSFORM_REUSED_RENDER_PASS_NAMES = new Set([",
        "export const VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES = new Set([",
        "export const INTERACTION_COMPOSITE_PASS_NAMES = [",
        "export const TRANSFORMED_FRAME_PASS_NAMES = [",
        "export const RENDER_PASS_OVERSCAN_RATIO_PER_SIDE = 0.15;",
      ],
      rendererRequiredTokens: [
        "from \"./map_renderer/render_pass_catalog.js\";",
        "export { RENDER_PASS_NAMES } from \"./map_renderer/render_pass_catalog.js\";",
      ],
      rendererForbiddenTokens: [
        "export const RENDER_PASS_NAMES = [",
        "const TRANSFORM_REUSED_RENDER_PASS_NAMES = new Set([",
        "const VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES = new Set([",
        "const INTERACTION_COMPOSITE_PASS_NAMES = [",
        "const TRANSFORMED_FRAME_PASS_NAMES = [",
        "const RENDER_PASS_OVERSCAN_RATIO_PER_SIDE =",
      ],
    },
    {
      ownerPath: FILES.renderInvalidationCatalog,
      ownerTokens: [
        "export const PASS_RESOURCE_MAP = Object.freeze({",
        "export const RESOURCE_PASS_MAP = Object.freeze(",
        "export const DEFAULT_RENDER_INVALIDATION_PASSES = [",
        "export const FIRST_FRAME_BASE_TARGET_RESOURCES = Object.freeze([",
        "export const FIRST_FRAME_HGO_TARGET_RESOURCES = Object.freeze([",
        "export const UNSUPPORTED_RENDER_PASS_INPUT_KEYS = Object.freeze([",
        "export function getTargetResourcesForPasses(",
        "export function getTargetPassesForResources(",
        "export function getFirstFrameTargetResources(",
        "export function resolveFirstFrameTargetResources(",
      ],
    },
  ];

  for (const rule of ownershipRules) {
    const ownerSource = sources[rule.ownerPath];
    for (const token of rule.ownerTokens) {
      if (!ownerSource.includes(token)) {
        failures.push(`${rule.ownerPath} must own token: ${token}`);
      }
    }
    for (const token of rule.rendererRequiredTokens || []) {
      const targetPath = rule.rendererRequiredPath || FILES.renderer;
      if (!sources[targetPath].includes(token)) {
        failures.push(`${targetPath} must keep wrapper token: ${token}`);
      }
    }
    for (const token of rule.rendererForbiddenTokens || []) {
      const targetPath = rule.rendererForbiddenPath || FILES.renderer;
      if (sources[targetPath].includes(token)) {
        failures.push(`${targetPath} must not own extracted token: ${token}`);
      }
    }
  }

  return failures;
}

function main() {
  const failures = collectFailures();
  if (failures.length > 0) {
    console.error("Architecture boundary check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Architecture boundary check passed.");
}

main();
