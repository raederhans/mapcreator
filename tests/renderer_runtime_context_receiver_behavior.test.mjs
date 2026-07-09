import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const CONTEXT_PATH = "js/core/map_renderer/renderer_runtime_context.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";

function readRepoFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, ...relativePath.split("/"));
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker to exist: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected end marker to exist after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

function assertMatches(source, pattern, message) {
  assert.match(source, pattern, message);
}

function countOccurrences(source, token) {
  return source.split(token).length - 1;
}

test("map_renderer lazily owns the private RendererRuntimeContext receiver", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const helperSource = sliceBetween(
    rendererSource,
    "function getRendererRuntimeContext()",
    "function getRenderPassReceiverContext()",
  );
  const receiverSource = sliceBetween(
    rendererSource,
    "function getRenderPassReceiverContext()",
    "function getRendererSurfaceLifecycleOwner()",
  );

  assertMatches(
    rendererSource,
    /import\s*\{[^}]*assertRendererRuntimeContext[^}]*createRendererRuntimeContext[^}]*describeRendererRuntimeContext[^}]*\}\s*from\s*"\/?\.\/map_renderer\/renderer_runtime_context\.js";/,
    "map_renderer must import the runtime context contract helpers",
  );
  assertIncludes(rendererSource, "let rendererRuntimeContext = null;", "map_renderer must keep the context private");
  assert.equal(
    countOccurrences(rendererSource, "createRendererRuntimeContext({"),
    1,
    "map_renderer must create the context from one lazy helper",
  );

  for (const token of [
    "if (rendererRuntimeContext) {",
    "return rendererRuntimeContext;",
    "runtimeState,",
    "rendererSurfaceHost,",
    "renderCache: {",
    "interactionCompositePassNames: INTERACTION_COMPOSITE_PASS_NAMES,",
    "renderPassNames: RENDER_PASS_NAMES,",
    "renderPassOverscanRatioPerSide: RENDER_PASS_OVERSCAN_RATIO_PER_SIDE,",
    "transformedFramePassNames: TRANSFORM_REUSED_RENDER_PASS_NAMES,",
    "getTransformSignature,",
    "getVisibleFrameIdentity,",
    "ownerTag: \"map-renderer\",",
  ]) {
    assertIncludes(helperSource, token, "getRendererRuntimeContext must keep lazy construction token");
  }

  for (const token of [
    "const rendererContext = assertRendererRuntimeContext(getRendererRuntimeContext());",
    "rendererContext.state.runtimeState !== runtimeState",
    "rendererContext.surface.host !== rendererSurfaceHost",
    "describeRendererRuntimeContext(rendererContext);",
    "return rendererContext;",
    "function getRenderCacheReceiverContext()",
    "const rendererContext = getRenderPassReceiverContext();",
    "RendererRuntimeContext.renderCache receiver is required.",
    "rendererContext.renderCache.getRuntimeState() !== runtimeState",
    "rendererContext.renderCache.getSurfaceHost() !== rendererSurfaceHost",
    "function getProjectionReceiverContext()",
    "const rendererContext = getRenderPassReceiverContext();",
    "RendererRuntimeContext.projection receiver is required.",
    "rendererContext.projection.getProjection() !== rendererSurfaceHost.getProjection()",
    "rendererContext.projection.getPathSvg() !== rendererSurfaceHost.getPathSvg()",
    "rendererContext.projection.getPathCanvas() !== rendererSurfaceHost.getPathCanvas()",
    "rendererContext.projection.getPathHitCanvas() !== rendererSurfaceHost.getPathHitCanvas()",
    "rendererContext.projection.getContext() !== rendererSurfaceHost.getContext()",
    "rendererContext.projection.getHitContext() !== rendererSurfaceHost.getHitContext()",
    "function getViewportReceiverContext()",
    "RendererRuntimeContext.viewport receiver is required.",
    "rendererContext.viewport.getRuntimeState() !== runtimeState",
    "rendererContext.viewport.getSurfaceHost() !== rendererSurfaceHost",
    "rendererContext.viewport.getMapContainer() !== rendererSurfaceHost.getMapContainer()",
    "rendererContext.viewport.getViewportGroup() !== rendererSurfaceHost.getViewportGroup()",
    "rendererContext.viewport.getGlobal() !== globalThis",
    "rendererContext.viewport.getDevicePixelRatio() !== globalThis.devicePixelRatio",
    "rendererContext.viewport.hasLandFeatures() !== !!runtimeState.landData?.features?.length",
  ]) {
    assertIncludes(receiverSource, token, "receiver helper must assert and describe the context contract");
  }
});

test("projection and viewport descriptors are assembled in the private runtime context", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const helperSource = sliceBetween(
    rendererSource,
    "function getRendererRuntimeContext()",
    "function getRenderPassReceiverContext()",
  );

  for (const token of [
    "projection: {",
    "projectionPrecision: PROJECTION_PRECISION,",
    "pathPointRadius: PATH_POINT_RADIUS,",
    "projectionFitPaddingRatio: PROJECTION_FIT_PADDING_RATIO,",
    "getD3: () => globalThis.d3,",
    "getProjection: () => rendererSurfaceHost.getProjection(),",
    "getPathSvg: () => rendererSurfaceHost.getPathSvg(),",
    "getPathCanvas: () => rendererSurfaceHost.getPathCanvas(),",
    "getPathHitCanvas: () => rendererSurfaceHost.getPathHitCanvas(),",
    "getContext: () => rendererSurfaceHost.getContext(),",
    "getHitContext: () => rendererSurfaceHost.getHitContext(),",
    "viewport: {",
    "mapPanPaddingPx: MAP_PAN_PADDING_PX,",
    "minZoomScale: MIN_ZOOM_SCALE,",
    "maxZoomScale: MAX_ZOOM_SCALE,",
    "getLogicalCanvasDimensions,",
    "getRenderableLandFeatures,",
    "getProjectedFeatureBounds,",
    "shouldSkipFeature,",
    "getFeatureId,",
    "getHgoRuntimePreviewBounds: getProjectedHgoRuntimePreviewBounds,",
    "isHgoRuntimePreviewReady,",
    "getZoomIdentity: () => globalThis.d3?.zoomIdentity,",
    "getRuntimeState: () => runtimeState,",
    "getSurfaceHost: () => rendererSurfaceHost,",
    "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),",
    "getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),",
    "getMapContainer: () => rendererSurfaceHost.getMapContainer(),",
    "getViewportGroup: () => rendererSurfaceHost.getViewportGroup(),",
    "getGlobal: () => globalThis,",
    "getDevicePixelRatio: () => globalThis.devicePixelRatio,",
    "hasLandFeatures: () => !!runtimeState.landData?.features?.length,",
  ]) {
    assertIncludes(helperSource, token, "getRendererRuntimeContext must assemble projection and viewport descriptors");
  }

  for (const token of [
    "setProjection:",
    "setPathSvg:",
    "setPathCanvas:",
    "setPathHitCanvas:",
  ]) {
    assertExcludes(helperSource, token, "read model descriptors must not expose surface setters");
  }
});

test("render cache owner receives runtime, surface, constants, and helpers through the context", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const renderCacheOwnerSource = sliceBetween(
    rendererSource,
    "function getRenderCacheOwner()",
    "function getRenderPassCacheHostOwner()",
  );

  const receiverIndex = renderCacheOwnerSource.indexOf("const rendererContext = getRenderCacheReceiverContext();");
  const createIndex = renderCacheOwnerSource.indexOf("renderCacheOwner = createRenderCacheOwner({");
  assert.notEqual(receiverIndex, -1, "render cache owner must request the runtime context receiver");
  assert.notEqual(createIndex, -1, "render cache owner must keep its constructor call in map_renderer");
  assert.ok(receiverIndex < createIndex, "render cache receiver assertion must run before owner construction");

  for (const token of [
    "const runtime = rendererContext.state.runtimeState;",
    "const surfaceHost = rendererContext.surface.host;",
    "const renderCacheContext = rendererContext.renderCache;",
    "surfaceHost !== renderCacheContext.getSurfaceHost()",
    "RendererRuntimeContext renderCache surface read model mismatch.",
    "const renderCacheConstants = renderCacheContext.constants;",
    "const renderCacheHelpers = renderCacheContext.helpers;",
    "state: runtime,",
    "interactionCompositePassNames: renderCacheConstants.interactionCompositePassNames,",
    "renderPassNames: renderCacheConstants.renderPassNames,",
    "renderPassOverscanRatioPerSide: renderCacheConstants.renderPassOverscanRatioPerSide,",
    "transformedFramePassNames: renderCacheConstants.transformedFramePassNames,",
    "getContext: () => renderCacheContext.getMainContext(),",
    "getTransformSignature: renderCacheHelpers.getTransformSignature,",
    "getVisibleFrameIdentity: renderCacheHelpers.getVisibleFrameIdentity,",
  ]) {
    assertIncludes(renderCacheOwnerSource, token, "render cache owner must consume context read-model tokens");
  }

  assertExcludes(renderCacheOwnerSource, "state,", "render cache owner must use context runtime instead of the local state alias");
  assertExcludes(renderCacheOwnerSource, "getContext: () => rendererSurfaceHost.getContext(),", "render cache owner must read surface through context");
  assertExcludes(renderCacheOwnerSource, "rendererRuntimeContext:", "render cache owner API must not receive a new context bag parameter");
});

test("projection owner receives constants and d3 through the projection context", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const projectionOwnerSource = sliceBetween(
    rendererSource,
    "function getRendererProjectionPathOwner()",
    "function getRendererSvgSurfaceLifecycleOwner()",
  );

  const receiverIndex = projectionOwnerSource.indexOf("const rendererContext = getProjectionReceiverContext();");
  const createIndex = projectionOwnerSource.indexOf("rendererProjectionPathOwner = createRendererProjectionPathOwner({");
  assert.notEqual(receiverIndex, -1, "projection owner must request the projection receiver context");
  assert.notEqual(createIndex, -1, "projection owner must keep its constructor call in map_renderer");
  assert.ok(receiverIndex < createIndex, "projection receiver assertion must run before owner construction");

  for (const token of [
    "const projectionContext = rendererContext.projection;",
    "surfaceHost: rendererContext.surface.host,",
    "getD3: projectionContext.helpers.getD3,",
    "projectionPrecision: projectionContext.constants.projectionPrecision,",
    "pathPointRadius: projectionContext.constants.pathPointRadius,",
  ]) {
    assertIncludes(projectionOwnerSource, token, "projection owner must consume projection context tokens");
  }

  assertExcludes(projectionOwnerSource, "surfaceHost: rendererSurfaceHost,", "projection owner must use the context surface host");
  assertExcludes(projectionOwnerSource, "getD3: () => globalThis.d3,", "projection owner must use the context helper");
  assertExcludes(projectionOwnerSource, "projectionPrecision: PROJECTION_PRECISION,", "projection owner must use context constants");
  assertExcludes(projectionOwnerSource, "pathPointRadius: PATH_POINT_RADIUS,", "projection owner must use context constants");
});

test("viewport owners receive runtime, constants, helpers, and accessors through the viewport context", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const readModelSource = sliceBetween(
    rendererSource,
    "function getViewportReadModelOwner()",
    "function getViewportCommandOwner()",
  );
  const commandSource = sliceBetween(
    rendererSource,
    "function getViewportCommandOwner()",
    "function getRendererViewportUpdateOwner()",
  );
  const viewportZoomWriteToken = ["runtime", "zoomTransform = transform;"].join(".");
  const legacyRuntimeStateZoomWriteToken = ["runtimeState", "zoomTransform = transform;"].join(".");

  for (const [ownerSource, createToken, label] of [
    [readModelSource, "viewportReadModelOwner = createViewportReadModelOwner({", "viewport read model"],
    [commandSource, "viewportCommandOwner = createViewportCommandOwner({", "viewport command"],
  ]) {
    const receiverIndex = ownerSource.indexOf("const rendererContext = getViewportReceiverContext();");
    const createIndex = ownerSource.indexOf(createToken);
    assert.notEqual(receiverIndex, -1, `${label} owner must request the viewport receiver context`);
    assert.notEqual(createIndex, -1, `${label} owner must keep its constructor call`);
    assert.ok(receiverIndex < createIndex, `${label} receiver assertion must run before owner construction`);
  }

  for (const token of [
    "const viewportContext = rendererContext.viewport;",
    "const viewportConstants = viewportContext.constants;",
    "const viewportHelpers = viewportContext.helpers;",
    "const runtime = viewportContext.getRuntimeState();",
    "state: runtime,",
    "mapPanPaddingPx: viewportConstants.mapPanPaddingPx,",
    "projectionFitPaddingRatio: viewportConstants.projectionFitPaddingRatio,",
    "getProjection: () => viewportContext.getProjection(),",
    "getPathSvg: () => viewportContext.getPathSvg(),",
    "getZoomIdentity: viewportHelpers.getZoomIdentity,",
    "getLogicalCanvasDimensions: viewportHelpers.getLogicalCanvasDimensions,",
    "getLandFeatures: () => runtime.landData?.features || [],",
    "getHgoRuntimePreviewBounds: viewportHelpers.getHgoRuntimePreviewBounds,",
    "isHgoRuntimePreviewReady: viewportHelpers.isHgoRuntimePreviewReady,",
    "getFeatureId: viewportHelpers.getFeatureId,",
    "getProjectedFeatureBounds: viewportHelpers.getProjectedFeatureBounds,",
    "shouldSkipFeature: viewportHelpers.shouldSkipFeature,",
    "getRenderableLandFeatures: viewportHelpers.getRenderableLandFeatures,",
  ]) {
    assertIncludes(readModelSource, token, "viewport read model owner must consume viewport context tokens");
  }

  for (const token of [
    "const viewportContext = rendererContext.viewport;",
    "const viewportConstants = viewportContext.constants;",
    "const viewportHelpers = viewportContext.helpers;",
    "const runtime = viewportContext.getRuntimeState();",
    "state: runtime,",
    "minZoomScale: viewportConstants.minZoomScale,",
    "maxZoomScale: viewportConstants.maxZoomScale,",
    "getZoomBehavior: () => viewportContext.getZoomBehavior(),",
    "getInteractionRect: () => viewportContext.getInteractionRect(),",
    "getD3: viewportHelpers.getD3,",
    "calculatePanExtent,",
    "getCenteredFitZoomTransform,",
    viewportZoomWriteToken,
  ]) {
    assertIncludes(commandSource, token, "viewport command owner must consume viewport context tokens");
  }

  for (const token of [
    "state,",
    "MAP_PAN_PADDING_PX",
    "MIN_ZOOM_SCALE",
    "MAX_ZOOM_SCALE",
    "getProjection: () => rendererSurfaceHost.getProjection(),",
    "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),",
    "getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),",
    "getD3: () => globalThis.d3,",
    legacyRuntimeStateZoomWriteToken,
  ]) {
    assertExcludes(`${readModelSource}\n${commandSource}`, token, "viewport owners must use context read-model tokens");
  }
});

test("viewport mutation owners receive read dependencies through the viewport context", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const fitSource = sliceBetween(
    rendererSource,
    "function getRendererFitProjectionOwner()",
    "function getRendererStartupTransactionOwner()",
  );
  const updateSource = sliceBetween(
    rendererSource,
    "function getRendererViewportUpdateOwner()",
    "function getViewportResizeLifecycleOwner()",
  );
  const resizeSource = sliceBetween(
    rendererSource,
    "function getViewportResizeLifecycleOwner()",
    "function getScenarioWaterCachePolicyOwner()",
  );
  const stateWriteToken = (root, field, value) => [root, `${field} = ${value};`].join(".");

  for (const [ownerSource, createToken, label] of [
    [fitSource, "rendererFitProjectionOwner = createRendererFitProjectionOwner({", "fit projection"],
    [updateSource, "rendererViewportUpdateOwner = createRendererViewportUpdateOwner({", "viewport update"],
    [resizeSource, "viewportResizeLifecycleOwner = createViewportResizeLifecycleOwner({", "viewport resize"],
  ]) {
    const receiverIndex = ownerSource.indexOf("const rendererContext = getViewportReceiverContext();");
    const createIndex = ownerSource.indexOf(createToken);
    assert.notEqual(receiverIndex, -1, `${label} owner must request the viewport receiver context`);
    assert.notEqual(createIndex, -1, `${label} owner must keep its constructor call`);
    assert.ok(receiverIndex < createIndex, `${label} receiver assertion must run before owner construction`);
  }

  for (const token of [
    "const viewportContext = rendererContext.viewport;",
    "const viewportHelpers = viewportContext.helpers;",
    "const runtime = viewportContext.getRuntimeState();",
    "const surfaceHost = viewportContext.getSurfaceHost();",
    "surfaceHost,",
    "state: runtime,",
    "projectionFitPaddingRatio: viewportContext.constants.projectionFitPaddingRatio,",
    "getLogicalCanvasDimensions: viewportHelpers.getLogicalCanvasDimensions,",
    "getRenderableLandFeatures: viewportHelpers.getRenderableLandFeatures,",
  ]) {
    assertIncludes(fitSource, token, "fit projection owner must consume viewport context tokens");
  }

  for (const token of [
    "const viewportContext = rendererContext.viewport;",
    "const runtime = viewportContext.getRuntimeState();",
    "getViewportGroup: viewportContext.getViewportGroup,",
    stateWriteToken("runtime", "zoomTransform", "transform"),
    stateWriteToken("runtime", "hitCanvasDirty", "true"),
    "runtime.updateZoomUIFn",
    "drawCanvas();",
  ]) {
    assertIncludes(updateSource, token, "viewport update owner must consume viewport context tokens");
  }

  for (const token of [
    "const viewportContext = rendererContext.viewport;",
    "const runtime = viewportContext.getRuntimeState();",
    "state: runtime,",
    "getMapContainer: viewportContext.getMapContainer,",
    "getGlobal: viewportContext.getGlobal,",
    "getDevicePixelRatio: viewportContext.getDevicePixelRatio,",
    "hasLandFeatures: viewportContext.hasLandFeatures,",
    "scheduleDeferredWork,",
    "cancelDeferredWork,",
    "nowMs,",
    "recordRenderPerfMetric,",
  ]) {
    assertIncludes(resizeSource, token, "viewport resize owner must consume viewport context tokens");
  }

  for (const token of [
    "surfaceHost: rendererSurfaceHost,",
    "projectionFitPaddingRatio: PROJECTION_FIT_PADDING_RATIO,",
    "rendererSurfaceHost.getViewportGroup()",
    "getMapContainer: () => rendererSurfaceHost.getMapContainer(),",
    "getGlobal: () => globalThis,",
    "getDevicePixelRatio: () => globalThis.devicePixelRatio,",
    "hasLandFeatures: () => !!runtimeState.landData?.features?.length,",
  ]) {
    assertExcludes(`${fitSource}\n${updateSource}\n${resizeSource}`, token, "viewport mutation owners must use context read-model tokens");
  }
  assertExcludes(updateSource, stateWriteToken("runtimeState", "zoomTransform", "transform"), "viewport update owner must use context runtime");
  assertExcludes(updateSource, stateWriteToken("runtimeState", "hitCanvasDirty", "true"), "viewport update owner must use context runtime");
});

test("P51 and P52 owners are the first receivers without changing owner APIs", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const p51Source = sliceBetween(
    rendererSource,
    "function getRenderPassCacheHostOwner()",
    "function getRenderPassCommitAccountingOwner()",
  );
  const p52Source = sliceBetween(
    rendererSource,
    "function getRenderPassCommitAccountingOwner()",
    "function getRenderPipelinePassesOwner()",
  );

  for (const [ownerSource, createToken, label] of [
    [p51Source, "renderPassCacheHostOwner = createRenderPassCacheHostOwner({", "P51"],
    [p52Source, "renderPassCommitAccountingOwner = createRenderPassCommitAccountingOwner({", "P52"],
  ]) {
    const receiverIndex = ownerSource.indexOf("getRenderPassReceiverContext();");
    const createIndex = ownerSource.indexOf(createToken);
    assert.notEqual(receiverIndex, -1, `${label} owner must request the runtime context receiver`);
    assert.notEqual(createIndex, -1, `${label} owner must keep its existing constructor call`);
    assert.ok(receiverIndex < createIndex, `${label} receiver assertion must run before owner construction`);
  }

  assertIncludes(p51Source, "ensureRenderPassCanvas,", "P51 constructor must keep existing effects shape");
  assertIncludes(p52Source, "clearPassFullReferenceTransforms,", "P52 constructor must keep existing effects shape");
  assertExcludes(p51Source, "rendererRuntimeContext:", "P51 owner API must not receive a new context bag parameter");
  assertExcludes(p52Source, "rendererRuntimeContext:", "P52 owner API must not receive a new context bag parameter");
});

test("render wrapper drawing and public boundaries remain stable", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const renderPassToCacheSource = sliceBetween(
    rendererSource,
    "function renderPassToCache(passName, drawFn, transform, timings)",
    "function resetCanvasContext(",
  );
  const publicFacadeSource = readRepoFile(PUBLIC_FACADE_PATH);
  const stateWriteAllowlistSource = readRepoFile(STATE_WRITE_ALLOWLIST_PATH);
  const stateContextToken = ["runtimeState", "rendererRuntimeContext"].join(".");
  const globalContextToken = ["globalThis", "rendererRuntimeContext"].join(".");

  for (const token of [
    "function drawCanvas()",
    "function drawBackgroundPass",
    "function drawPhysicalBasePass",
    "function drawPoliticalPass",
    "function drawEffectsPass",
    "function drawLabelsPass",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep drawing functions in place");
  }

  for (const token of [
    "const hostResult = getRenderPassCacheHostOwner().prepareRenderPassHost({",
    "if (hostResult?.skipped) return;",
    "getRenderPassCommitAccountingOwner().commitRenderPass({",
    "hostSummary: hostResult,",
  ]) {
    assertIncludes(renderPassToCacheSource, token, "renderPassToCache must keep P51/P52 delegation shape");
  }

  for (const token of [
    "RendererRuntimeContext",
    "getRendererRuntimeContext",
    "renderer_runtime_context",
  ]) {
    assertExcludes(publicFacadeSource, token, "public facade must not expose the private runtime context");
  }
  assertExcludes(rendererSource, stateContextToken, "map_renderer must not write the context onto runtimeState");
  assertExcludes(rendererSource, globalContextToken, "map_renderer must not expose the context on globalThis");
  assertExcludes(stateWriteAllowlistSource, "rendererRuntimeContext", "state-write allowlist must not add a context exception");
  assertExcludes(stateWriteAllowlistSource, "renderer_runtime_context", "state-write allowlist must not add a context module exception");
});

test("RendererRuntimeContext module remains a small import-free contract surface", () => {
  const contextSource = readRepoFile(CONTEXT_PATH);

  for (const token of [
    "export function createRendererRuntimeContext(options = {})",
    "export function assertRendererRuntimeContext(context)",
    "export function describeRendererRuntimeContext(context)",
    "Object.freeze({",
    "schemaVersion: RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION",
    "surface: createSurfaceReadModel(rendererSurfaceHost),",
    "renderCache: createRenderCacheReadModel(renderCache, runtimeState, rendererSurfaceHost),",
    "diagnostics: Object.freeze({",
  ]) {
    assertIncludes(contextSource, token, "runtime context contract must keep exports and read-model shape");
  }

  for (const token of [
    "import ",
    "render_pass_cache_host",
    "render_pass_commit_accounting",
    "drawCanvas",
    "renderPassToCache",
  ]) {
    assertExcludes(contextSource, token, "runtime context module must stay independent from receivers");
  }
});
