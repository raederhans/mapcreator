import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();

const FILES = Object.freeze({
  packageJson: "package.json",
  renderer: "js/core/map_renderer.js",
  rendererRuntimeState: "js/core/state/renderer_runtime_state.js",
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
  rendererViewportUpdateOwner: "js/core/renderer/renderer_viewport_update_owner.js",
  viewportResizeLifecycleOwner: "js/core/renderer/viewport_resize_lifecycle_owner.js",
  zoomInteractionLifecycleOwner: "js/core/renderer/zoom_interaction_lifecycle_owner.js",
  mapInteractionEventBindingOwner: "js/core/renderer/map_interaction_event_binding_owner.js",
  rendererSurfaceHost: "js/core/renderer/renderer_surface_host.js",
  rendererSurfaceLifecycleOwner: "js/core/renderer/renderer_surface_lifecycle_owner.js",
  rendererProjectionPathOwner: "js/core/renderer/renderer_projection_path_owner.js",
  rendererSvgSurfaceLifecycleOwner: "js/core/renderer/renderer_svg_surface_lifecycle_owner.js",
  rendererFitProjectionOwner: "js/core/renderer/renderer_fit_projection_owner.js",
  scenarioWaterCachePolicyOwner: "js/core/renderer/scenario_water_cache_policy_owner.js",
  renderPipelinePasses: "js/core/renderer/render_pipeline_passes.js",
  renderPipelineCatalog: "js/core/renderer/render_pipeline_catalog.js",
  renderPassCatalog: "js/core/map_renderer/render_pass_catalog.js",
  renderInvalidationCatalog: "js/core/map_renderer/render_invalidation_catalog.js",
  rendererSurfaceHostPreflightDoc: "docs/active/renderer-surface-host-preflight-20260626.md",
  rendererSurfaceHostInventoryTest: "tests/renderer_surface_host_inventory_boundary.test.mjs",
  rendererSurfaceLifecyclePreflightDoc: "docs/active/renderer-surface-lifecycle-preflight-20260626.md",
  rendererSurfaceLifecycleInventoryTest: "tests/renderer_surface_lifecycle_inventory_boundary.test.mjs",
  rendererProjectionPathPreflightDoc: "docs/active/renderer-projection-path-lifecycle-preflight-20260627.md",
  rendererProjectionPathOwnerDoc: "docs/active/renderer-projection-path-owner-p28-20260628.md",
  rendererProjectionPathLifecycleInventoryTest: "tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs",
  rendererSvgSurfaceLifecyclePreflightDoc: "docs/active/renderer-svg-surface-lifecycle-preflight-20260629.md",
  rendererSvgSurfaceLifecycleOwnerDoc: "docs/active/renderer-svg-surface-lifecycle-owner-p30-20260629.md",
  rendererSvgSurfaceLifecycleInventoryTest: "tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs",
  rendererFitProjectionLifecyclePreflightDoc: "docs/active/renderer-fit-projection-lifecycle-preflight-20260629.md",
  rendererFitProjectionOwnerTest: "tests/renderer_fit_projection_owner_behavior.test.mjs",
  rendererFitProjectionLifecycleInventoryTest: "tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs",
  rendererViewportUpdateOwnerTest: "tests/renderer_viewport_update_owner_behavior.test.mjs",
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
  [FILES.rendererViewportUpdateOwner]: 220,
  [FILES.viewportResizeLifecycleOwner]: 360,
  [FILES.zoomInteractionLifecycleOwner]: 320,
  [FILES.mapInteractionEventBindingOwner]: 220,
  [FILES.rendererSurfaceHost]: 120,
  [FILES.rendererSurfaceLifecycleOwner]: 220,
  [FILES.rendererProjectionPathOwner]: 180,
  [FILES.rendererSvgSurfaceLifecycleOwner]: 320,
  [FILES.rendererFitProjectionOwner]: 240,
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
  const packageJson = readProjectFile(FILES.packageJson);
  const renderer = readProjectFile(FILES.renderer);
  const rendererRuntimeState = readProjectFile(FILES.rendererRuntimeState);
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
  const rendererViewportUpdateOwner = readProjectFile(FILES.rendererViewportUpdateOwner);
  const viewportResizeLifecycleOwner = readProjectFile(FILES.viewportResizeLifecycleOwner);
  const zoomInteractionLifecycleOwner = readProjectFile(FILES.zoomInteractionLifecycleOwner);
  const mapInteractionEventBindingOwner = readProjectFile(FILES.mapInteractionEventBindingOwner);
  const rendererSurfaceHost = readProjectFile(FILES.rendererSurfaceHost);
  const rendererSurfaceLifecycleOwner = readProjectFile(FILES.rendererSurfaceLifecycleOwner);
  const rendererProjectionPathOwner = readProjectFile(FILES.rendererProjectionPathOwner);
  const rendererSvgSurfaceLifecycleOwner = readProjectFile(FILES.rendererSvgSurfaceLifecycleOwner);
  const rendererFitProjectionOwner = readProjectFile(FILES.rendererFitProjectionOwner);
  const scenarioWaterCachePolicyOwner = readProjectFile(FILES.scenarioWaterCachePolicyOwner);
  const renderPipelinePasses = readProjectFile(FILES.renderPipelinePasses);
  const renderPipelineCatalog = readProjectFile(FILES.renderPipelineCatalog);
  const renderPassCatalog = readProjectFile(FILES.renderPassCatalog);
  const renderInvalidationCatalog = readProjectFile(FILES.renderInvalidationCatalog);
  const rendererSurfaceHostPreflightDoc = readProjectFile(FILES.rendererSurfaceHostPreflightDoc);
  const rendererSurfaceHostInventoryTest = readProjectFile(FILES.rendererSurfaceHostInventoryTest);
  const rendererSurfaceLifecyclePreflightDoc = readProjectFile(FILES.rendererSurfaceLifecyclePreflightDoc);
  const rendererSurfaceLifecycleInventoryTest = readProjectFile(FILES.rendererSurfaceLifecycleInventoryTest);
  const rendererProjectionPathPreflightDoc = readProjectFile(FILES.rendererProjectionPathPreflightDoc);
  const rendererProjectionPathOwnerDoc = readProjectFile(FILES.rendererProjectionPathOwnerDoc);
  const rendererProjectionPathLifecycleInventoryTest = readProjectFile(FILES.rendererProjectionPathLifecycleInventoryTest);
  const rendererSvgSurfaceLifecyclePreflightDoc = readProjectFile(FILES.rendererSvgSurfaceLifecyclePreflightDoc);
  const rendererSvgSurfaceLifecycleOwnerDoc = readProjectFile(FILES.rendererSvgSurfaceLifecycleOwnerDoc);
  const rendererSvgSurfaceLifecycleInventoryTest = readProjectFile(FILES.rendererSvgSurfaceLifecycleInventoryTest);
  const rendererFitProjectionLifecyclePreflightDoc = readProjectFile(FILES.rendererFitProjectionLifecyclePreflightDoc);
  const rendererFitProjectionOwnerTest = readProjectFile(FILES.rendererFitProjectionOwnerTest);
  const rendererFitProjectionLifecycleInventoryTest = readProjectFile(FILES.rendererFitProjectionLifecycleInventoryTest);
  const rendererViewportUpdateOwnerTest = readProjectFile(FILES.rendererViewportUpdateOwnerTest);
  const sources = {
    [FILES.packageJson]: packageJson,
    [FILES.renderer]: renderer,
    [FILES.rendererRuntimeState]: rendererRuntimeState,
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
    [FILES.rendererViewportUpdateOwner]: rendererViewportUpdateOwner,
    [FILES.viewportResizeLifecycleOwner]: viewportResizeLifecycleOwner,
    [FILES.zoomInteractionLifecycleOwner]: zoomInteractionLifecycleOwner,
    [FILES.mapInteractionEventBindingOwner]: mapInteractionEventBindingOwner,
    [FILES.rendererSurfaceHost]: rendererSurfaceHost,
    [FILES.rendererSurfaceLifecycleOwner]: rendererSurfaceLifecycleOwner,
    [FILES.rendererProjectionPathOwner]: rendererProjectionPathOwner,
    [FILES.rendererSvgSurfaceLifecycleOwner]: rendererSvgSurfaceLifecycleOwner,
    [FILES.rendererFitProjectionOwner]: rendererFitProjectionOwner,
    [FILES.scenarioWaterCachePolicyOwner]: scenarioWaterCachePolicyOwner,
    [FILES.renderPipelinePasses]: renderPipelinePasses,
    [FILES.renderPipelineCatalog]: renderPipelineCatalog,
    [FILES.renderPassCatalog]: renderPassCatalog,
    [FILES.renderInvalidationCatalog]: renderInvalidationCatalog,
    [FILES.rendererSurfaceHostPreflightDoc]: rendererSurfaceHostPreflightDoc,
    [FILES.rendererSurfaceHostInventoryTest]: rendererSurfaceHostInventoryTest,
    [FILES.rendererSurfaceLifecyclePreflightDoc]: rendererSurfaceLifecyclePreflightDoc,
    [FILES.rendererSurfaceLifecycleInventoryTest]: rendererSurfaceLifecycleInventoryTest,
    [FILES.rendererProjectionPathPreflightDoc]: rendererProjectionPathPreflightDoc,
    [FILES.rendererProjectionPathOwnerDoc]: rendererProjectionPathOwnerDoc,
    [FILES.rendererProjectionPathLifecycleInventoryTest]: rendererProjectionPathLifecycleInventoryTest,
    [FILES.rendererSvgSurfaceLifecyclePreflightDoc]: rendererSvgSurfaceLifecyclePreflightDoc,
    [FILES.rendererSvgSurfaceLifecycleOwnerDoc]: rendererSvgSurfaceLifecycleOwnerDoc,
    [FILES.rendererSvgSurfaceLifecycleInventoryTest]: rendererSvgSurfaceLifecycleInventoryTest,
    [FILES.rendererFitProjectionLifecyclePreflightDoc]: rendererFitProjectionLifecyclePreflightDoc,
    [FILES.rendererFitProjectionOwnerTest]: rendererFitProjectionOwnerTest,
    [FILES.rendererFitProjectionLifecycleInventoryTest]: rendererFitProjectionLifecycleInventoryTest,
    [FILES.rendererViewportUpdateOwnerTest]: rendererViewportUpdateOwnerTest,
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

  for (const token of [
    "export function createRendererProjectionPathOwner({",
    "function initializeProjectionPaths()",
    "const getD3 = requireFunction(getters, \"getD3\", \"getters\");",
    "getContext: requireFunction(host, \"getContext\", \"surfaceHost\")",
    "getHitContext: requireFunction(host, \"getHitContext\", \"surfaceHost\")",
    "setProjection: requireFunction(host, \"setProjection\", \"surfaceHost\")",
    "setPathSvg: requireFunction(host, \"setPathSvg\", \"surfaceHost\")",
    "setPathCanvas: requireFunction(host, \"setPathCanvas\", \"surfaceHost\")",
    "setPathHitCanvas: requireFunction(host, \"setPathHitCanvas\", \"surfaceHost\")",
    "requireFunction(d3, \"geoEqualEarth\", \"d3\")",
    "requireFunction(d3, \"geoPath\", \"d3\")",
    "requireFunction(rawProjection, \"precision\", \"d3.geoEqualEarth()\")",
    "const nextProjection = hostApi.setProjection(projection);",
    "requireFunction(nextProjection, \"clipExtent\", \"surfaceHost.setProjection(projection)\")(null);",
    "const pathSvg = hostApi.setPathSvg(createPath({",
    "const pathCanvas = hostApi.setPathCanvas(createPath({",
    "const pathHitCanvas = hostApi.setPathHitCanvas(createPath({",
  ]) {
    if (!rendererProjectionPathOwner.includes(token)) {
      failures.push(`${FILES.rendererProjectionPathOwner} must own projection/path lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "runtimeState",
    "from \"../state.js\"",
    "from \"./state.js\"",
    "map_renderer.js",
    "fitProjection",
    "fitExtent",
    "setCanvasSize",
    "buildSpatialIndex",
    "rebuildProjectedBoundsCache",
    "updateZoomTranslateExtent",
    "markAllOverlaysDirty",
    "updateMap",
    "drawCanvas",
    "renderPassToCache",
    "buildHitCanvas",
    "applyDevSelectionFill",
    "setMapData",
    "exactAfterSettle",
    "refreshMapDataForScenarioChunkPromotion",
    "strategicOverlayRuntime",
  ]) {
    if (rendererProjectionPathOwner.includes(token)) {
      failures.push(`${FILES.rendererProjectionPathOwner} must not own renderer semantic token: ${token}`);
    }
  }

  for (const token of [
    "export function createRendererSvgSurfaceLifecycleOwner({",
    "function ensureSvgSurface()",
    "const getD3 = requireFunction(getters, \"getD3\", \"getters\");",
    "getMapContainer: requireFunction(host, \"getMapContainer\", \"surfaceHost\")",
    "setMapSvg: requireFunction(host, \"setMapSvg\", \"surfaceHost\")",
    "setViewportGroup: requireFunction(host, \"setViewportGroup\", \"surfaceHost\")",
    "setStrategicDefs: requireFunction(host, \"setStrategicDefs\", \"surfaceHost\")",
    "setFrontlineOverlayGroup: requireFunction(host, \"setFrontlineOverlayGroup\", \"surfaceHost\")",
    "setFrontlineLabelsGroup: requireFunction(host, \"setFrontlineLabelsGroup\", \"surfaceHost\")",
    "setOperationalLinesGroup: requireFunction(host, \"setOperationalLinesGroup\", \"surfaceHost\")",
    "setOperationGraphicsGroup: requireFunction(host, \"setOperationGraphicsGroup\", \"surfaceHost\")",
    "setOperationGraphicsEditorGroup: requireFunction(host, \"setOperationGraphicsEditorGroup\", \"surfaceHost\")",
    "setUnitCountersGroup: requireFunction(host, \"setUnitCountersGroup\", \"surfaceHost\")",
    "setSpecialZonesGroup: requireFunction(host, \"setSpecialZonesGroup\", \"surfaceHost\")",
    "setSpecialZoneEditorGroup: requireFunction(host, \"setSpecialZoneEditorGroup\", \"surfaceHost\")",
    "setHoverGroup: requireFunction(host, \"setHoverGroup\", \"surfaceHost\")",
    "setDevSelectionGroup: requireFunction(host, \"setDevSelectionGroup\", \"surfaceHost\")",
    "setInspectorHighlightGroup: requireFunction(host, \"setInspectorHighlightGroup\", \"surfaceHost\")",
    "setIntensityFieldPreviewGroup: requireFunction(host, \"setIntensityFieldPreviewGroup\", \"surfaceHost\")",
    "setInteractionRect: requireFunction(host, \"setInteractionRect\", \"surfaceHost\")",
    "mapContainer.querySelector(\"#map-svg\")",
    "selectOrAppend(svg, \"g.viewport-layer\", \"g\", \"viewport-layer\")",
    "selectOrAppend(svg, \"defs.strategic-overlay-defs\", \"defs\", \"strategic-overlay-defs\")",
    "selectOrAppend(svg, \"g.intensity-field-preview-layer\", \"g\", \"intensity-field-preview-layer\")",
    "svg.select(\"rect.interaction-layer\")",
    ".attr(\"fill\", \"transparent\")",
    ".lower();",
  ]) {
    if (!rendererSvgSurfaceLifecycleOwner.includes(token)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecycleOwner} must own SVG lifecycle token: ${token}`);
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
    "strategicOverlayRuntime",
    "renderFrontlineOverlay",
    "renderOperationalLinesIfNeeded",
    "renderOperationGraphicsIfNeeded",
    "renderUnitCountersIfNeeded",
    "renderSpecialZonesIfNeeded",
    "renderDevSelectionOverlayIfNeeded",
    "renderInspectorHighlightOverlayIfNeeded",
    "renderHoverOverlayIfNeeded",
    "geoEqualEarth",
    "geoPath",
    "fitProjection",
    "updateMap",
    "initZoom",
    "bindEvents",
    "renderLegend",
    "LegendManager",
  ]) {
    if (rendererSvgSurfaceLifecycleOwner.includes(token)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecycleOwner} must not own renderer semantic token: ${token}`);
    }
  }

  if (!renderer.includes('from "./renderer/renderer_surface_host.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererSurfaceHost}.`);
  }
  if (!renderer.includes('from "./renderer/renderer_surface_lifecycle_owner.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererSurfaceLifecycleOwner}.`);
  }
  if (!renderer.includes('from "./renderer/renderer_projection_path_owner.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererProjectionPathOwner}.`);
  }
  if (!renderer.includes('from "./renderer/renderer_svg_surface_lifecycle_owner.js";')) {
    failures.push(`${FILES.renderer} must import ${FILES.rendererSvgSurfaceLifecycleOwner}.`);
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
    if (source.includes("renderer_projection_path_owner.js")) {
      failures.push(`${sourcePath} must not import renderer_projection_path_owner.js directly; use ${FILES.renderer} as the composition root.`);
    }
    if (source.includes("renderer_svg_surface_lifecycle_owner.js")) {
      failures.push(`${sourcePath} must not import renderer_svg_surface_lifecycle_owner.js directly; use ${FILES.renderer} as the composition root.`);
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
    "getRendererProjectionPathOwner().initializeProjectionPaths();",
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
    "const RUNTIME_STATE_BRIDGE_HELPER_TOKENS = Object.freeze([",
    "const FORBIDDEN_RUNTIME_STATE_BRIDGE_WRITE_PARTS = Object.freeze([",
    "renderer_surface_lifecycle_owner.js",
    "renderer_projection_path_owner.js",
    "createRendererSurfaceLifecycleOwner({",
    "createRendererProjectionPathOwner({",
    "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
    "getRendererProjectionPathOwner().initializeProjectionPaths();",
    "renderer_render_lifecycle_owner.js",
    "assertNoRendererOwnerImportsMapRenderer",
    "P33 must keep surface bridge state writes behind applyRendererSurfaceBridgeState",
    "P33 bridge call must stay between rebuildPoliticalLandCollections and migrateLegacyColorState",
  ]) {
    if (!rendererSurfaceLifecycleInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererSurfaceLifecycleInventoryTest} must lock P26 lifecycle inventory token: ${token}`);
    }
  }
  for (const token of [
    "export function applyRendererSurfaceBridgeState(target, handles = {})",
    "target.colorCanvas = source.mapCanvas ?? null;",
    "target.canvasLayers = source.canvasLayers ?? null;",
    "target.lineCanvas = null;",
    "target.colorCtx = source.context ?? null;",
    "target.politicalPatchCanvas = source.politicalPatchCanvas ?? null;",
    "target.politicalPatchCtx = source.politicalPatchContext ?? null;",
    "target.interactionOverlayCanvas = source.interactionOverlayCanvas ?? null;",
    "target.interactionOverlayCtx = source.interactionOverlayContext ?? null;",
    "target.lineCtx = null;",
    "return target;",
  ]) {
    if (!rendererRuntimeState.includes(token)) {
      failures.push(`${FILES.rendererRuntimeState} must own P33 surface bridge state token: ${token}`);
    }
  }
  if (rendererRuntimeState.includes("renderer_surface_host.js")) {
    failures.push(`${FILES.rendererRuntimeState} must not import ${FILES.rendererSurfaceHost}; pass plain handles from map_renderer.`);
  }
  for (const token of [
    "applyRendererSurfaceBridgeState,",
    "applyRendererSurfaceBridgeState(runtimeState, {",
    "mapCanvas: rendererSurfaceHost.getMapCanvas(),",
    "canvasLayers: rendererSurfaceHost.getCanvasLayers(),",
    "context: rendererSurfaceHost.getContext(),",
    "politicalPatchCanvas: rendererSurfaceHost.getPoliticalPatchCanvas(),",
    "politicalPatchContext: rendererSurfaceHost.getPoliticalPatchContext(),",
    "interactionOverlayCanvas: rendererSurfaceHost.getInteractionOverlayCanvas(),",
    "interactionOverlayContext: rendererSurfaceHost.getInteractionOverlayContext(),",
  ]) {
    if (!renderer.includes(token)) {
      failures.push(`${FILES.renderer} must route P33 surface bridge state through applyRendererSurfaceBridgeState token: ${token}`);
    }
  }
  for (const tokenParts of [
    ["runtimeState.", "colorCanvas = rendererSurfaceHost.getMapCanvas()"],
    ["runtimeState.", "canvasLayers = rendererSurfaceHost.getCanvasLayers()"],
    ["runtimeState.", "lineCanvas = null"],
    ["runtimeState.", "colorCtx = rendererSurfaceHost.getContext()"],
    ["runtimeState.", "politicalPatchCanvas = rendererSurfaceHost.getPoliticalPatchCanvas()"],
    ["runtimeState.", "politicalPatchCtx = rendererSurfaceHost.getPoliticalPatchContext()"],
    ["runtimeState.", "interactionOverlayCanvas = rendererSurfaceHost.getInteractionOverlayCanvas()"],
    ["runtimeState.", "interactionOverlayCtx = rendererSurfaceHost.getInteractionOverlayContext()"],
    ["runtimeState.", "lineCtx = null"],
  ]) {
    if (renderer.includes(tokenParts.join(""))) {
      failures.push(`${FILES.renderer} must not keep direct P33 surface bridge write: ${tokenParts.join("")}`);
    }
  }
  const bridgeIndex = renderer.indexOf("applyRendererSurfaceBridgeState(runtimeState, {");
  const rebuildIndex = renderer.lastIndexOf("rebuildPoliticalLandCollections();", bridgeIndex);
  const migrateIndex = renderer.indexOf("migrateLegacyColorState();", bridgeIndex);
  if (rebuildIndex < 0 || bridgeIndex < 0 || migrateIndex < 0 || !(rebuildIndex < bridgeIndex && bridgeIndex < migrateIndex)) {
    failures.push(`${FILES.renderer} must call applyRendererSurfaceBridgeState between rebuildPoliticalLandCollections and migrateLegacyColorState.`);
  }
  if (!packageJson.includes('"test:node:renderer-surface-runtime-bridge-state": "node --test tests/renderer_surface_runtime_bridge_state_behavior.test.mjs"')) {
    failures.push(`${FILES.packageJson} must expose test:node:renderer-surface-runtime-bridge-state.`);
  }
  const rendererSourceFiles = listProjectSourceFiles("js/core/renderer");
  if (rendererSourceFiles.includes("js/core/renderer/renderer_render_lifecycle_owner.js")) {
    failures.push("P26 must not introduce js/core/renderer/renderer_render_lifecycle_owner.js.");
  }
  if (!rendererSourceFiles.includes(FILES.rendererProjectionPathOwner)) {
    failures.push(`P28 must introduce ${FILES.rendererProjectionPathOwner}.`);
  }
  for (const sourcePath of rendererSourceFiles.filter(isRendererOwnerPath)) {
    const source = readProjectFile(sourcePath);
    if (hasMapRendererImport(source)) {
      failures.push(`${sourcePath} must not import js/core/map_renderer.js; keep ${FILES.renderer} as the composition root.`);
    }
  }

  for (const heading of [
    "## Scope and guardrails",
    "## Current P26 surface lifecycle state",
    "## Current projection/path creation order",
    "## Projection/path handle inventory",
    "## Projection/path consumer inventory",
    "## fitProjection side-effect inventory",
    "## Projected bounds and viewport dependency map",
    "## P28 allowed first move",
    "## P28 forbidden areas",
    "## Required validation commands",
  ]) {
    if (!rendererProjectionPathPreflightDoc.includes(heading)) {
      failures.push(`${FILES.rendererProjectionPathPreflightDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P28 may add `js/core/renderer/renderer_projection_path_owner.js`.",
    "P28 may move only projection/path handle creation and registration:",
    "Register `projection`, `pathSVG`, `pathCanvas`, and `pathHitCanvas` into `rendererSurfaceHost`.",
    "Preserve `initMap` ordering by calling the owner exactly where projection/path creation currently happens.",
    "P28 must not move `fitProjection`.",
    "P28 must not add `projection.fitExtent` to `js/core/renderer/renderer_projection_path_owner.js`.",
    "Direct runtimeState writes.",
    "`setCanvasSize`.",
    "`updateMap`.",
    "`drawCanvas`.",
    "`renderPassToCache`.",
    "Hit canvas build.",
    "Selection/fill.",
    "Scenario refresh/chunk.",
    "Exact-after-settle.",
    "Strategic overlay runtime.",
    "Render lifecycle owner work.",
  ]) {
    if (!rendererProjectionPathPreflightDoc.includes(token)) {
      failures.push(`${FILES.rendererProjectionPathPreflightDoc} must lock P28 projection/path boundary token: ${token}`);
    }
  }
  for (const heading of [
    "## Scope and guardrails",
    "## Current implementation state",
    "## initMap ordering",
    "## Owner responsibilities",
    "## Forbidden areas",
    "## Validation commands",
    "## P29 handoff",
  ]) {
    if (!rendererProjectionPathOwnerDoc.includes(heading)) {
      failures.push(`${FILES.rendererProjectionPathOwnerDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P28 adds `js/core/renderer/renderer_projection_path_owner.js`.",
    "getRendererProjectionPathOwner().initializeProjectionPaths();",
    "`fitProjection` or `projection.fitExtent`.",
    "direct `runtimeState` writes.",
    "P29 should treat projection/path creation as owned by `renderer_projection_path_owner.js`",
  ]) {
    if (!rendererProjectionPathOwnerDoc.includes(token)) {
      failures.push(`${FILES.rendererProjectionPathOwnerDoc} must lock P28 owner handoff token: ${token}`);
    }
  }
  for (const token of [
    "const PROJECTION_PATH_OWNER_PATH = \"js/core/renderer/renderer_projection_path_owner.js\";",
    "const PROJECTION_PATH_OWNER_WIRING_ANCHORS = Object.freeze([",
    "const RAW_INIT_MAP_PROJECTION_PATH_TOKENS = Object.freeze([",
    "const PROJECTION_PATH_OWNER_REQUIRED_TOKENS = Object.freeze([",
    "const PROJECTION_PATH_OWNER_FORBIDDEN_TOKENS = Object.freeze([",
    "const FIT_PROJECTION_RENDERER_ANCHORS = Object.freeze([",
    "const FIT_PROJECTION_WIRING_ANCHORS = Object.freeze([",
    "const RENDERER_SEMANTIC_REGION_ANCHORS = Object.freeze([",
    "const SURFACE_LIFECYCLE_FORBIDDEN_TOKENS = Object.freeze([",
    "const P28_ALLOWED_TOKENS = Object.freeze([",
    "const P28_FORBIDDEN_TOKENS = Object.freeze([",
    "function sliceBetween(source, startMarker, endMarker)",
    "const projectedBoundsFactorySource = sliceBetween(",
    "const viewportReadModelFactorySource = sliceBetween(",
    "repoFileExists(PROJECTION_PATH_OWNER_PATH)",
    "createRendererProjectionPathOwner({",
    "getRendererProjectionPathOwner().initializeProjectionPaths();",
    "assertExcludes(initMapSource, token, \"initMap must delegate raw projection/path creation to the owner\");",
    "const nextProjection = rendererSurfaceHost.setProjection(globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION));",
    "rendererSurfaceHost.setPathCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS));",
    "function getRendererFitProjectionOwner()",
    "return getRendererFitProjectionOwner().fitProjection({ skipSpatialIndex });",
    "map_renderer must inject projection/path getters into projected geometry bounds owner factory",
    "map_renderer must inject projection/path read-model dependencies into viewport read model owner factory",
    "P28 may move only projection/path handle creation and registration:",
    "P28 must not move `fitProjection`.",
    "P28 must not add `projection.fitExtent` to `js/core/renderer/renderer_projection_path_owner.js`.",
    "Direct runtimeState writes.",
    "Render lifecycle owner work.",
  ]) {
    if (!rendererProjectionPathLifecycleInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererProjectionPathLifecycleInventoryTest} must lock P27/P28 projection-path inventory token: ${token}`);
    }
  }

  if (!rendererSourceFiles.includes(FILES.rendererSvgSurfaceLifecycleOwner)) {
    failures.push(`P30 must introduce ${FILES.rendererSvgSurfaceLifecycleOwner}.`);
  }
  for (const heading of [
    "## Scope and guardrails",
    "## Current surface/projection lifecycle baseline",
    "## ensureHybridLayers responsibility map",
    "## SVG root lifecycle inventory",
    "## SVG group ordering inventory",
    "## Interaction rect layering inventory",
    "## Legend and legacy SVG cleanup inventory",
    "## Strategic overlay group boundary",
    "## P30 allowed first move",
    "## P30 forbidden areas",
    "## Required validation commands",
  ]) {
    if (!rendererSvgSurfaceLifecyclePreflightDoc.includes(heading)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecyclePreflightDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P30 may add `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.",
    "P30 may move only SVG root and static group creation/registration.",
    "Preserve group ordering and interaction rect layering.",
    "Keep `js/core/map_renderer.js` as the composition root.",
    "Keep strategic overlay rendering and editor rendering outside the owner.",
    "`drawCanvas`.",
    "`renderPassToCache`.",
    "Hit canvas build.",
    "Selection/fill.",
    "Scenario refresh/chunk.",
    "Exact-after-settle.",
    "Strategic overlay runtime.",
    "Projection/path creation.",
    "`fitProjection`.",
    "`updateMap`.",
    "`initZoom` or `bindEvents`.",
    "Direct runtimeState writes.",
  ]) {
    if (!rendererSvgSurfaceLifecyclePreflightDoc.includes(token)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecyclePreflightDoc} must lock P30 SVG lifecycle boundary token: ${token}`);
    }
  }
  for (const token of [
    "const SVG_OWNER_REQUIRED_TOKENS = Object.freeze([",
    "const SVG_GROUP_ORDER_TOKENS = Object.freeze([",
    "const MAP_RENDERER_WRAPPER_TOKENS = Object.freeze([",
    "const ENSURE_HYBRID_LAYERS_FORBIDDEN_TOKENS = Object.freeze([",
    "const LEGEND_AND_LEGACY_TOKENS = Object.freeze([",
    "const SVG_LIFECYCLE_TOKENS = Object.freeze([",
    "const RENDER_SEMANTIC_ANCHORS = Object.freeze([",
    "const SVG_OWNER_FORBIDDEN_TOKENS = Object.freeze([",
    "const P30_ALLOWED_TOKENS = Object.freeze([",
    "const P30_FORBIDDEN_TOKENS = Object.freeze([",
    "function createSvgElement()",
    "createRendererSvgSurfaceLifecycleOwner({",
    "getRendererSvgSurfaceLifecycleOwner().ensureSvgSurface();",
    "assertExcludes(ensureHybridLayersSource, token, \"ensureHybridLayers must delegate raw SVG lifecycle work to the owner\");",
    "renderer_svg_surface_lifecycle_owner.js",
    "renderer_surface_lifecycle_owner.js",
    "renderer_projection_path_owner.js",
    "function renderFrontlineOverlay()",
    "renderOperationalLinesIfNeeded",
    "renderOperationGraphicsIfNeeded",
    "renderUnitCountersIfNeeded",
    "renderSpecialZonesIfNeeded",
    "renderDevSelectionOverlayIfNeeded",
    "renderInspectorHighlightOverlayIfNeeded",
    "renderHoverOverlayIfNeeded",
    "function drawCanvas()",
    "function renderPassToCache(",
    "buildHitCanvas",
    "P30 may add `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.",
    "P30 may move only SVG root and static group creation/registration.",
    "Strategic overlay runtime.",
    "Projection/path creation.",
    "Direct runtimeState writes.",
  ]) {
    if (!rendererSvgSurfaceLifecycleInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecycleInventoryTest} must lock P30 SVG lifecycle inventory token: ${token}`);
    }
  }

  for (const heading of [
    "## Scope and guardrails",
    "## Current implementation state",
    "## ensureHybridLayers ordering",
    "## Owner responsibilities",
    "## Forbidden areas",
    "## Validation commands",
    "## P31 handoff",
  ]) {
    if (!rendererSvgSurfaceLifecycleOwnerDoc.includes(heading)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecycleOwnerDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P30 adds `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.",
    "getRendererSvgSurfaceLifecycleOwner().ensureSvgSurface();",
    "`ensureHybridLayers()` remains the wrapper.",
    "`renderer_svg_surface_lifecycle_owner.js` owns SVG root/static group creation and registration.",
    "`drawCanvas`, `renderPassToCache`, hit canvas build, selection/fill, scenario refresh/chunk, exact-after-settle, strategic overlay runtime, projection/path creation, `fitProjection`, `updateMap`, `initZoom`, `bindEvents`, and direct `runtimeState` writes remain outside the owner.",
    "P31 can build on the SVG owner only after preserving group ordering and interaction rect layering.",
  ]) {
    if (!rendererSvgSurfaceLifecycleOwnerDoc.includes(token)) {
      failures.push(`${FILES.rendererSvgSurfaceLifecycleOwnerDoc} must lock P30 owner closeout token: ${token}`);
    }
  }
  for (const token of [
    "\"test:node:renderer-svg-surface-lifecycle-owner\": \"node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs\"",
    "\"test:node:renderer-svg-surface-lifecycle-inventory\": \"node --test tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs\"",
    "\"test:node:renderer-svg-surface-lifecycle\": \"node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs\"",
    "\"test:node:strategic-overlay-runtime-owner\": \"node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs\"",
  ]) {
    if (!packageJson.includes(token)) {
      failures.push(`${FILES.packageJson} must expose P30 validation script: ${token}`);
    }
  }

  if (!rendererSourceFiles.includes(FILES.rendererFitProjectionOwner)) {
    failures.push("P32 must add js/core/renderer/renderer_fit_projection_owner.js.");
  }
  if (!rendererSourceFiles.includes(FILES.rendererViewportUpdateOwner)) {
    failures.push(`P34 must add ${FILES.rendererViewportUpdateOwner}.`);
  }
  for (const heading of [
    "## Scope and guardrails",
    "## Current P30 surface/projection/svg lifecycle baseline",
    "## Current fitProjection call sites",
    "## fitProjection input inventory",
    "## fitProjection side-effect inventory",
    "## Projected bounds dependency map",
    "## Spatial index and hit-canvas dependency map",
    "## Special zone and overlay dependency map",
    "## Viewport command/resize dependency map",
    "## P32 allowed first move",
    "## P32 forbidden areas",
    "## Required validation commands",
  ]) {
    if (!rendererFitProjectionLifecyclePreflightDoc.includes(heading)) {
      failures.push(`${FILES.rendererFitProjectionLifecyclePreflightDoc} must keep heading: ${heading}`);
    }
  }
  for (const token of [
    "P31 is preflight only.",
    "P32 may add `js/core/renderer/renderer_fit_projection_owner.js`.",
    "P32 may only move fitProjection orchestration through dependency-injected getters and effects.",
    "`js/core/map_renderer.js` remains the composition root.",
    "runtimeState.landData",
    "runtimeState.width",
    "runtimeState.height",
    "PROJECTION_FIT_PADDING_RATIO",
    "getLogicalCanvasDimensions()",
    "getRenderableLandFeatures(canvasWidth, canvasHeight, { forceProd: true })",
    "rendererSurfaceHost.getProjection()",
    "projection.fitExtent",
    "cityAnchorCache = new WeakMap();",
    "rebuildProjectedBoundsCache();",
    "buildSpatialIndex();",
    "runtimeState.hitCanvasDirty = true;",
    "updateSpecialZonesPaths();",
    "renderSpecialZoneEditorOverlay();",
    "updateZoomTranslateExtent();",
    "markAllOverlaysDirty();",
    "projected_geometry_bounds_owner.js` owns projected bounds calculations and cache rebuild helpers through injected getters and effects.",
    "viewport_read_model_owner.js` owns read-model calculations",
    "viewport_command_owner.js` owns zoom command effects",
    "viewport_resize_lifecycle_owner.js` currently calls fitProjection as an injected effect",
    "Render pass execution is not part of P32.",
    "Direct `runtimeState` writes.",
    "Import of `js/core/map_renderer.js`.",
    "`drawCanvas`.",
    "`renderPassToCache`.",
    "Hit canvas build.",
    "Selection/fill.",
    "Scenario refresh/chunk.",
    "Exact-after-settle.",
    "Strategic overlay runtime.",
    "Render lifecycle owner.",
    "`setMapData` migration.",
    "`initZoom` or `bindEvents` migration.",
    "Renderer public facade change.",
  ]) {
    if (!rendererFitProjectionLifecyclePreflightDoc.includes(token)) {
      failures.push(`${FILES.rendererFitProjectionLifecyclePreflightDoc} must lock P31/P32 fitProjection lifecycle token: ${token}`);
    }
  }
  for (const token of [
    "const FIT_PROJECTION_OWNER_TEST_PATH = \"tests/renderer_fit_projection_owner_behavior.test.mjs\";",
    "const MAP_RENDERER_WIRING_TOKENS = Object.freeze([",
    "const FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS = Object.freeze([",
    "const FIT_PROJECTION_WRAPPER_TOKENS = Object.freeze([",
    "const OWNER_REQUIRED_TOKENS = Object.freeze([",
    "const OWNER_FORBIDDEN_TOKENS = Object.freeze([",
    "const MAP_RENDERER_RAW_BODY_TOKENS = Object.freeze([",
    "const RENDER_SEMANTIC_ANCHORS = Object.freeze([",
    "repoFileExists(FIT_PROJECTION_OWNER_PATH)",
    "function fitProjection({ skipSpatialIndex = false } = {})",
    "return getRendererFitProjectionOwner().fitProjection({ skipSpatialIndex });",
    "effects.fitProjection?.({ skipSpatialIndex: interactiveLayoutResize });",
    "renderer_projection_path_owner.js",
    "renderer_svg_surface_lifecycle_owner.js",
    "function drawCanvas()",
    "function renderPassToCache(",
    "async function buildHitCanvasAfterStartup",
    "createExactAfterSettleScheduler({",
    "createScenarioRefreshRuntime({",
    "createStrategicOverlayRuntimeOwner({",
    "Direct `runtimeState` writes.",
    "Renderer public facade change.",
  ]) {
    if (!rendererFitProjectionLifecycleInventoryTest.includes(token)) {
      failures.push(`${FILES.rendererFitProjectionLifecycleInventoryTest} must lock P32 fitProjection inventory token: ${token}`);
    }
  }
  for (const token of [
    "import { createRendererFitProjectionOwner } from \"../js/core/renderer/renderer_fit_projection_owner.js\";",
    "no land data returns false without effects",
    "invalid width or height returns false without effects",
    "computes padding and fit extent exactly",
    "chooses renderable feature collection when non-empty",
    "falls back to state land data when renderable list is empty",
    "calls effects in exact order",
    "respects skipSpatialIndex",
    "fails fast when projection.fitExtent is missing",
    "fails fast when required injected dependencies are missing",
    "fails fast when projection fit padding ratio is not finite",
    "owner source stays independent from runtime state writes and render semantics",
  ]) {
    if (!rendererFitProjectionOwnerTest.includes(token)) {
      failures.push(`${FILES.rendererFitProjectionOwnerTest} must lock P32 behavior token: ${token}`);
    }
  }
  for (const token of [
    "export function createRendererFitProjectionOwner({",
    "function requireFiniteNumber(owner, name, ownerName)",
    "renderer fit projection owner requires ${ownerName}.${name}",
    "renderer fit projection owner requires finite ${ownerName}.${name}",
    "function fitProjection({ skipSpatialIndex = false } = {})",
    "state?.landData?.features",
    "projectionFitPaddingRatio",
    "const getLogicalCanvasDimensions = requireFunction(",
    "const getRenderableLandFeatures = requireFunction(",
    "const resetCityAnchorCache = requireFunction(effects, \"resetCityAnchorCache\", \"effects\");",
    "const [canvasWidth, canvasHeight] = getLogicalCanvasDimensions();",
    "getRenderableLandFeatures,",
    "const features = getRenderableLandFeatures(canvasWidth, canvasHeight, {",
    "fitExtent([[padding, padding], [x1, y1]], fitTarget);",
    "resetCityAnchorCache();",
    "rebuildProjectedBoundsCache();",
    "buildSpatialIndex();",
    "setHitCanvasDirty();",
    "updateSpecialZonesPaths();",
    "renderSpecialZoneEditorOverlay();",
    "updateZoomTranslateExtent();",
    "markAllOverlaysDirty();",
  ]) {
    if (!rendererFitProjectionOwner.includes(token)) {
      failures.push(`${FILES.rendererFitProjectionOwner} must own P32 fitProjection token: ${token}`);
    }
  }
  for (const token of [
    "map_renderer.js",
    "runtimeState",
    "drawCanvas",
    "renderPassToCache",
    "buildHitCanvas",
    "applyDevSelectionFill",
    "refreshMapDataForScenarioChunkPromotion",
    "exactAfterSettle",
    "strategicOverlayRuntime",
    "renderFrontlineOverlay",
    "renderSpecialZones",
    "renderHoverOverlay",
    "setMapData",
    "initZoom",
    "bindEvents",
    "requestRender",
    "flushRenderBoundary",
  ]) {
    if (rendererFitProjectionOwner.includes(token)) {
      failures.push(`${FILES.rendererFitProjectionOwner} must not include forbidden renderer semantic token: ${token}`);
    }
  }
  for (const token of [
    "from \"./renderer/renderer_fit_projection_owner.js\";",
    "let rendererFitProjectionOwner = null;",
    "function getRendererFitProjectionOwner()",
    "createRendererFitProjectionOwner({",
    "return getRendererFitProjectionOwner().fitProjection({ skipSpatialIndex });",
  ]) {
    if (!renderer.includes(token)) {
      failures.push(`${FILES.renderer} must wire P32 fitProjection owner token: ${token}`);
    }
  }
  if (!packageJson.includes("\"test:node:renderer-fit-projection-lifecycle-inventory\": \"node --test tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs\"")) {
    failures.push(`${FILES.packageJson} must expose P31 fitProjection lifecycle inventory script.`);
  }
  if (!packageJson.includes("\"test:node:renderer-fit-projection-owner\": \"node --test tests/renderer_fit_projection_owner_behavior.test.mjs\"")) {
    failures.push(`${FILES.packageJson} must expose P32 fitProjection owner behavior script.`);
  }
  if (!packageJson.includes("\"test:node:renderer-fit-projection-lifecycle\": \"node --test tests/renderer_fit_projection_owner_behavior.test.mjs tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs\"")) {
    failures.push(`${FILES.packageJson} must expose P32 fitProjection lifecycle script.`);
  }
  if (!packageJson.includes("\"test:node:renderer-viewport-update-owner\": \"node --test tests/renderer_viewport_update_owner_behavior.test.mjs\"")) {
    failures.push(`${FILES.packageJson} must expose P34 renderer viewport update owner behavior script.`);
  }

  const requiredImports = [
    "./map_renderer/scenario_refresh_runtime.js",
    "./renderer/canvas_color_helpers.js",
    "./map_renderer/exact_after_settle_scheduler.js",
    "./map_renderer/hgo_runtime_preview_render_owner.js",
    "./renderer/renderer_surface_lifecycle_owner.js",
    "./renderer/renderer_projection_path_owner.js",
    "./renderer/renderer_svg_surface_lifecycle_owner.js",
    "./renderer/renderer_fit_projection_owner.js",
    "./renderer/renderer_viewport_update_owner.js",
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
    FILES.rendererViewportUpdateOwner,
    FILES.viewportResizeLifecycleOwner,
    FILES.zoomInteractionLifecycleOwner,
    FILES.mapInteractionEventBindingOwner,
    FILES.rendererSurfaceHost,
    FILES.rendererSurfaceLifecycleOwner,
    FILES.rendererProjectionPathOwner,
    FILES.rendererSvgSurfaceLifecycleOwner,
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
    "renderPassToCache",
    "buildHitCanvas",
    "setMapData",
    "fitProjection",
    "exactAfterSettle",
    "refreshMapDataForScenarioChunkPromotion",
    "strategicOverlayRuntime",
    "applyDevSelectionFill",
  ]) {
    if (rendererViewportUpdateOwner.includes(token)) {
      failures.push(`${FILES.rendererViewportUpdateOwner} must not touch renderer lifecycle token: ${token}`);
    }
  }
  if (rendererViewportUpdateOwner.includes("getters.")) {
    failures.push(`${FILES.rendererViewportUpdateOwner} must keep P34 as effects-only orchestration.`);
  }
  const viewportUpdateWrapperSource = sliceBetween(
    renderer,
    "function updateMap(transform)",
    "function getProjectedHgoRuntimePreviewBounds()",
  );
  const zoomInteractionLifecycleFactorySource = sliceBetween(
    renderer,
    "function getZoomInteractionLifecycleOwner()",
    "function getMapInteractionEventBindingOwner()",
  );
  if (!viewportUpdateWrapperSource.includes("return getRendererViewportUpdateOwner().updateMap(transform);")) {
    failures.push(`${FILES.renderer} updateMap wrapper must delegate to ${FILES.rendererViewportUpdateOwner}.`);
  }
  if (!zoomInteractionLifecycleFactorySource.includes("updateMap,")) {
    failures.push(`${FILES.renderer} zoom interaction lifecycle must keep updateMap injected as an effect.`);
  }
  if (!zoomInteractionLifecycleOwner.includes("const updateMap = requireFunction(effects, \"updateMap\", \"effects\");")) {
    failures.push(`${FILES.zoomInteractionLifecycleOwner} must require updateMap as a runtime effect.`);
  }
  if (zoomInteractionLifecycleOwner.includes("effects.updateMap?.(")) {
    failures.push(`${FILES.zoomInteractionLifecycleOwner} must call required updateMap directly.`);
  }
  for (const token of [
    "renderPhysicalIntensityBrushPreview();",
    "getStrategicOverlayRenderOwner().syncUnitCounterScalesDuringZoom();",
    "syncSpecialZonePatternTransformDuringZoom();",
    "drawCanvas();",
  ]) {
    if (viewportUpdateWrapperSource.includes(token)) {
      failures.push(`${FILES.renderer} updateMap wrapper must not keep raw viewport update token: ${token}`);
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
      ownerPath: FILES.rendererProjectionPathOwner,
      ownerTokens: [
        "export function createRendererProjectionPathOwner({",
        "function initializeProjectionPaths()",
        "const getD3 = requireFunction(getters, \"getD3\", \"getters\");",
        "getContext: requireFunction(host, \"getContext\", \"surfaceHost\")",
        "getHitContext: requireFunction(host, \"getHitContext\", \"surfaceHost\")",
        "setProjection: requireFunction(host, \"setProjection\", \"surfaceHost\")",
        "setPathSvg: requireFunction(host, \"setPathSvg\", \"surfaceHost\")",
        "setPathCanvas: requireFunction(host, \"setPathCanvas\", \"surfaceHost\")",
        "setPathHitCanvas: requireFunction(host, \"setPathHitCanvas\", \"surfaceHost\")",
        "const nextProjection = hostApi.setProjection(projection);",
        "requireFunction(nextProjection, \"clipExtent\", \"surfaceHost.setProjection(projection)\")(null);",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/renderer_projection_path_owner.js\";",
        "let rendererProjectionPathOwner = null;",
        "function getRendererProjectionPathOwner()",
        "createRendererProjectionPathOwner({",
        "surfaceHost: rendererSurfaceHost",
        "getD3: () => globalThis.d3",
        "projectionPrecision: PROJECTION_PRECISION",
        "pathPointRadius: PATH_POINT_RADIUS",
        "getRendererProjectionPathOwner().initializeProjectionPaths();",
      ],
      rendererForbiddenTokens: [
        "const nextProjection = rendererSurfaceHost.setProjection(globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION));",
        "nextProjection.clipExtent(null);",
        "rendererSurfaceHost.setPathSvg(globalThis.d3.geoPath(nextProjection).pointRadius(PATH_POINT_RADIUS));",
        "rendererSurfaceHost.setPathCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS));",
        "rendererSurfaceHost.setPathHitCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getHitContext()).pointRadius(PATH_POINT_RADIUS));",
      ],
    },
    {
      ownerPath: FILES.rendererSvgSurfaceLifecycleOwner,
      ownerTokens: [
        "export function createRendererSvgSurfaceLifecycleOwner({",
        "function ensureSvgSurface()",
        "const getD3 = requireFunction(getters, \"getD3\", \"getters\");",
        "getMapContainer: requireFunction(host, \"getMapContainer\", \"surfaceHost\")",
        "setMapSvg: requireFunction(host, \"setMapSvg\", \"surfaceHost\")",
        "setViewportGroup: requireFunction(host, \"setViewportGroup\", \"surfaceHost\")",
        "setStrategicDefs: requireFunction(host, \"setStrategicDefs\", \"surfaceHost\")",
        "setInteractionRect: requireFunction(host, \"setInteractionRect\", \"surfaceHost\")",
        "mapContainer.querySelector(\"#map-svg\")",
        "selectOrAppend(svg, \"g.viewport-layer\", \"g\", \"viewport-layer\")",
        "selectOrAppend(svg, \"defs.strategic-overlay-defs\", \"defs\", \"strategic-overlay-defs\")",
        "selectOrAppend(svg, \"g.intensity-field-preview-layer\", \"g\", \"intensity-field-preview-layer\")",
        "svg.select(\"rect.interaction-layer\")",
        ".attr(\"fill\", \"transparent\")",
        ".lower();",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/renderer_svg_surface_lifecycle_owner.js\";",
        "let rendererSvgSurfaceLifecycleOwner = null;",
        "function getRendererSvgSurfaceLifecycleOwner()",
        "createRendererSvgSurfaceLifecycleOwner({",
        "surfaceHost: rendererSurfaceHost",
        "getD3: () => globalThis.d3",
        "createSvgElement,",
        "getRendererSvgSurfaceLifecycleOwner().ensureSvgSurface();",
      ],
      rendererForbiddenTokens: [
        "let nextMapSvg = rendererSurfaceHost.getMapContainer().querySelector(\"#map-svg\");",
        "nextMapSvg = createSvgElement();",
        "rendererSurfaceHost.getMapContainer().appendChild(nextMapSvg);",
        "rendererSurfaceHost.setMapSvg(nextMapSvg);",
        "let nextViewportGroup = svg.select(\"g.viewport-layer\");",
        "rendererSurfaceHost.setViewportGroup(nextViewportGroup);",
        "let nextStrategicDefs = svg.select(\"defs.strategic-overlay-defs\");",
        "rendererSurfaceHost.setStrategicDefs(nextStrategicDefs);",
        "rendererSurfaceHost.setFrontlineOverlayGroup(nextFrontlineOverlayGroup);",
        "rendererSurfaceHost.setInteractionRect(nextInteractionRect);",
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
      ownerPath: FILES.rendererViewportUpdateOwner,
      ownerTokens: [
        "export function createRendererViewportUpdateOwner(",
        "getters = {},",
        "void getters;",
        "function updateMap(transform)",
        "const setZoomTransform = requireFunction(effects, \"setZoomTransform\", \"effects\");",
        "const setHitCanvasDirty = requireFunction(effects, \"setHitCanvasDirty\", \"effects\");",
        "const updateZoomUi = requireFunction(effects, \"updateZoomUi\", \"effects\");",
        "const applyViewportTransform = requireFunction(effects, \"applyViewportTransform\", \"effects\");",
        "const drawFrame = requireFunction(effects, \"drawFrame\", \"effects\");",
        "setZoomTransform(transform);",
        "setHitCanvasDirty();",
        "updateZoomUi();",
        "applyViewportTransform(transform);",
        "renderPhysicalIntensityBrushPreview();",
        "syncUnitCounterScalesDuringZoom();",
        "syncSpecialZonePatternTransformDuringZoom();",
        "drawFrame();",
      ],
      rendererRequiredTokens: [
        "from \"./renderer/renderer_viewport_update_owner.js\";",
        "let rendererViewportUpdateOwner = null;",
        "function getRendererViewportUpdateOwner()",
        "rendererViewportUpdateOwner = createRendererViewportUpdateOwner({",
        "return getRendererViewportUpdateOwner().updateMap(transform);",
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
        "const updateMap = requireFunction(effects, \"updateMap\", \"effects\");",
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
