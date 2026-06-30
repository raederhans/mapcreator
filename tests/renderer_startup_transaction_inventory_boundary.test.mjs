import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const STARTUP_OWNER_PATH = "js/core/renderer/renderer_startup_transaction_owner.js";
const PREFLIGHT_DOC_PATH = "docs/active/renderer-startup-transaction-preflight-20260629.md";

const OWNERIZED_INIT_MAP_TOKENS = Object.freeze([
  "ensureHybridLayers();",
  "getRendererSurfaceLifecycleOwner().ensureHitCanvasHandle();",
  "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
  "getRendererProjectionPathOwner().initializeProjectionPaths();",
  "applyRendererSurfaceBridgeState(runtimeState, {",
  "fitProjection({ skipSpatialIndex: shouldDeferInteractionInfrastructure });",
  "initZoom();",
  "bindEvents();",
]);

const RESET_TRANSACTION_TOKENS = Object.freeze([
  "layerResolverCache.primaryRef = null;",
  "layerResolverCache.detailRef = null;",
  "layerResolverCache.bundleMode = null;",
  "layerResolverCache.contextRevision = 0;",
  "resetPhysicalLandClipPathCache();",
  "resetExactRefreshOptimizationState();",
  "runtimeState.topologyRevision = Number(runtimeState.topologyRevision || 0) + 1;",
  "runtimeState.hitCanvasTopologyRevision = 0;",
  "clearPendingPoliticalColorEdit({",
  "resetReason: \"init-map\",",
  "clearRenderPassReferenceTransforms();",
  "clearLastGoodFrame(\"init-map\");",
  "invalidateInteractionComposite(\"init-map\");",
  "resetFirstVisibleFramePainted(\"init-map\");",
  "renderPassCache.perfOverlayEnabled = isPerfOverlayEnabled();",
  "ensureLayerDataFromTopology();",
  "rebuildPoliticalLandCollections();",
  "applyRendererSurfaceBridgeState(runtimeState, {",
  "migrateLegacyColorState();",
  "ensureSovereigntyState();",
  "normalizeColorStateForRender(state, {",
  "runtimeState.debugMode = debugMode;",
  "resetRenderDiagnostics();",
  "clearRenderPhaseTimer();",
  "runtimeState.renderPhase = RENDER_PHASE_IDLE;",
  "runtimeState.phaseEnteredAt = nowMs();",
  "runtimeState.renderPhaseTimerId = null;",
  "runtimeState.tooltipPendingState = { visible: false };",
  "runtimeState.tooltipRafHandle = null;",
  "cancelScheduledHoverOverlayRender();",
  "markAllOverlaysDirty();",
  "clearStagedMapDataTasks();",
  "cancelExactAfterSettleRefresh();",
  "cancelPendingIndexUiRefresh();",
  "runtimeState.deferContextBasePass = false;",
  "runtimeState.deferHitCanvasBuild = false;",
  "runtimeState.deferExactAfterSettle = false;",
  "runtimeState.hitCanvasBuildScheduled = null;",
  "resetProjectedBoundsCacheState();",
  "invalidateAllRenderPasses(\"init-map\");",
  "syncDayNightClockTimer();",
]);

const LATER_STARTUP_BRANCH_TOKENS = Object.freeze([
  "rendererSurfaceHost.getMapCanvas().style.pointerEvents = \"none\";",
  "rendererSurfaceHost.getMapCanvas().style.touchAction = \"none\";",
  "buildRuntimePoliticalMeta();",
  "setCanvasSize();",
  "buildIndex();",
  "setInteractionInfrastructureState(\"deferred-startup\", {",
  "rebuildStaticMeshes();",
  "invalidateBorderCache();",
  "updateDynamicBorderStatusUI();",
  "fitProjection({ skipSpatialIndex: shouldDeferInteractionInfrastructure });",
  "initZoom();",
  "bindEvents();",
  "runtimeState.getViewportGeoBoundsFn = getViewportGeoBounds;",
  "setInteractionInfrastructureState(\"ready\", {",
  "render();",
]);

const RENDER_SEMANTIC_ANCHORS = Object.freeze([
  "function render()",
  "function drawCanvas()",
  "function renderPassToCache(",
  "async function buildHitCanvasAfterStartup",
  "createScenarioRefreshRuntime({",
  "createExactAfterSettleScheduler({",
  "createStrategicOverlayRuntimeOwner({",
]);

const DOC_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current P34 renderer lifecycle baseline",
  "## initMap owned sequence after surface/projection setup",
  "## Cache and topology reset inventory",
  "## Render pass and visible-frame reset inventory",
  "## Runtime phase and deferred-flag reset inventory",
  "## Day-night and canvas pointer style inventory",
  "## Interaction infrastructure startup branch",
  "## P36 allowed first move",
  "## P36 forbidden areas",
  "## Required validation commands",
]);

const P36_ALLOWED_DOC_TOKENS = Object.freeze([
  "P35 is preflight only.",
  "P36 may add `js/core/renderer/renderer_startup_transaction_owner.js`.",
  "P36 may only move the `initMap` reset/startup transaction after projection/path creation through injected getters and effects.",
  "P36 must keep `initMap` as the composition root and must preserve the public wrapper in `js/core/map_renderer.js`.",
  "P36 must keep state writes as injected effects from `map_renderer.js` or existing state ops.",
  "P36 must preserve `applyRendererSurfaceBridgeState(runtimeState, { ... })` call location relative to `rebuildPoliticalLandCollections()` and `migrateLegacyColorState()`.",
]);

const P36_FORBIDDEN_DOC_TOKENS = Object.freeze([
  "render lifecycle owner",
  "`drawCanvas`",
  "`renderPassToCache`",
  "hit canvas build",
  "`setMapData` migration",
  "scenario refresh/chunk migration",
  "exact-after-settle scheduler migration",
  "strategic overlay runtime migration",
  "`initZoom` or `bindEvents` migration",
  "renderer public facade change",
  "direct `runtimeState` writes inside the new owner",
  "import of `js/core/map_renderer.js` from the new owner",
]);

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected end marker ${JSON.stringify(endMarker)}`);
  return source.slice(start, end);
}

test("P35 does not add a startup transaction owner yet", () => {
  assert.equal(
    repoFileExists(STARTUP_OWNER_PATH),
    false,
    "P35 reserves renderer_startup_transaction_owner.js for P36",
  );
});

test("initMap still owns ownerized startup calls and reset transaction ordering", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const initMapSource = sliceBetween(
    rendererSource,
    "function initMap({",
    "function markRendererTopologyChanged(",
  );

  for (const token of OWNERIZED_INIT_MAP_TOKENS) {
    assertIncludes(initMapSource, token, "initMap must keep current ownerized startup call");
  }
  for (const token of RESET_TRANSACTION_TOKENS) {
    assertIncludes(initMapSource, token, "initMap must keep reset transaction token");
  }
  for (const token of LATER_STARTUP_BRANCH_TOKENS) {
    assertIncludes(initMapSource, token, "initMap must keep later startup branch token");
  }

  const projectionIndex = initMapSource.indexOf("getRendererProjectionPathOwner().initializeProjectionPaths();");
  const layerResetIndex = initMapSource.indexOf("layerResolverCache.primaryRef = null;");
  const bridgeIndex = initMapSource.indexOf("applyRendererSurfaceBridgeState(runtimeState, {");
  const rebuildIndex = initMapSource.indexOf("rebuildPoliticalLandCollections();");
  const migrateIndex = initMapSource.indexOf("migrateLegacyColorState();");

  assert.ok(projectionIndex < layerResetIndex, "reset transaction must start after projection/path initialization");
  assert.ok(rebuildIndex < bridgeIndex, "surface bridge state must follow political collection rebuild");
  assert.ok(bridgeIndex < migrateIndex, "surface bridge state must precede legacy color migration");
});

test("render semantic anchors remain in map_renderer and outside P36 first move", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of RENDER_SEMANTIC_ANCHORS) {
    assertIncludes(rendererSource, token, "P36 first move must leave render semantic anchor in map_renderer");
  }
});

test("viewport update owner remains effects-only", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_viewport_update_owner.js");

  assertIncludes(ownerSource, "export function createRendererViewportUpdateOwner({", "viewport owner must exist");
  assertIncludes(ownerSource, "getters = {},", "viewport owner must preserve factory signature");
  assertIncludes(ownerSource, "void getters;", "viewport owner must keep getters unused");
  assertExcludes(ownerSource, "getters.", "viewport owner must stay effects-only");
  for (const token of ["runtimeState", "map_renderer.js", "fitProjection", "initMap", "setMapData"]) {
    assertExcludes(ownerSource, token, "viewport owner must avoid startup transaction tokens");
  }
});

test("fitProjection owner remains effects-only and outside initMap transaction ownership", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_fit_projection_owner.js");

  assertIncludes(ownerSource, "effects = {},", "fitProjection owner must preserve effects injection");
  assertIncludes(ownerSource, "const resetCityAnchorCache = requireFunction(effects, \"resetCityAnchorCache\", \"effects\");", "fitProjection owner must use injected effects");
  for (const token of [
    "function initMap(",
    "init-map",
    "topologyRevision",
    "applyRendererSurfaceBridgeState",
    "clearPendingPoliticalColorEdit",
    "resetExactRefreshOptimizationState",
    "clearLastGoodFrame",
    "invalidateAllRenderPasses",
  ]) {
    assertExcludes(ownerSource, token, "fitProjection owner must not own initMap transaction token");
  }
});

test("package exposes startup transaction inventory script", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-startup-transaction-inventory\": \"node --test tests/renderer_startup_transaction_inventory_boundary.test.mjs\"",
    "package.json must expose the P35 startup transaction inventory test",
  );
});

test("P35 preflight doc locks P36 allowed and forbidden scope", () => {
  const docSource = readRepoFile(...PREFLIGHT_DOC_PATH.split("/"));

  for (const heading of DOC_HEADINGS) {
    assertIncludes(docSource, heading, "P35 doc must keep required heading");
  }
  for (const token of P36_ALLOWED_DOC_TOKENS) {
    assertIncludes(docSource, token, "P35 doc must lock P36 allowed first move");
  }
  for (const token of P36_FORBIDDEN_DOC_TOKENS) {
    assertIncludes(docSource, token, "P35 doc must lock P36 forbidden area");
  }
});
