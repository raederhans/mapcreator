import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const REQUIRED_MAP_RENDERER_LIFECYCLE_TOKENS = Object.freeze([
  "function initMap({",
  "function ensureHybridLayers()",
  "function setCanvasSize({",
  "function fitProjection({",
  "function initZoom()",
  "function bindEvents()",
  "function getRendererSurfaceLifecycleOwner()",
  "function getRendererProjectionPathOwner()",
  "createRendererSurfaceLifecycleOwner({",
  "createRendererProjectionPathOwner({",
  "surfaceHost: rendererSurfaceHost",
  "getDocument: () => document",
  "getD3: () => globalThis.d3",
  "createHitCanvasElement,",
  "CANVAS_LAYER_NAMES,",
  "ensureCanvasLayers,",
  "getCanvasLayer,",
  "getRendererSurfaceLifecycleOwner().resolveDomHandles({ containerId });",
  "ensureHybridLayers();",
  "getRendererSurfaceLifecycleOwner().ensureCanvasLayerHandles({",
  "getRendererSurfaceLifecycleOwner().ensureHitCanvasHandle();",
  "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
  "getRendererProjectionPathOwner().initializeProjectionPaths();",
  "setCanvasSize();",
  "fitProjection({",
  "initZoom();",
  "bindEvents();",
]);

const RUNTIME_STATE_BRIDGE_ANCHORS = Object.freeze([
  ["runtimeState.", "colorCanvas = rendererSurfaceHost.getMapCanvas()"],
  ["runtimeState.", "canvasLayers = rendererSurfaceHost.getCanvasLayers()"],
  ["runtimeState.", "colorCtx = rendererSurfaceHost.getContext()"],
  ["runtimeState.", "politicalPatchCanvas = rendererSurfaceHost.getPoliticalPatchCanvas()"],
  ["runtimeState.", "politicalPatchCtx = rendererSurfaceHost.getPoliticalPatchContext()"],
  ["runtimeState.", "interactionOverlayCanvas = rendererSurfaceHost.getInteractionOverlayCanvas()"],
  ["runtimeState.", "interactionOverlayCtx = rendererSurfaceHost.getInteractionOverlayContext()"],
]);

const SURFACE_HOST_SEMANTIC_BLACKLIST = Object.freeze([
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
  "ensureHybridLayers",
  "setCanvasSize",
]);

const LIFECYCLE_OWNER_SEMANTIC_BLACKLIST = Object.freeze([
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
  "initZoom",
  "bindEvents",
  "fitProjection",
  "updateMap",
  "setMapData",
  "renderLegend",
  "renderExportPassesToCanvas",
]);

const LIFECYCLE_OWNER_REQUIRED_TOKENS = Object.freeze([
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
]);

const REQUIRED_PREFLIGHT_HEADINGS = Object.freeze([
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
]);

const P26_SCOPE_STATEMENT =
  "P26 candidate extraction is limited to DOM/canvas/SVG surface lifecycle wrapper; projection/path/zoom/event/render semantics are not yet moved.";

const P26_FORBIDDEN_REGION_TOKENS = Object.freeze([
  "Projection/path creation.",
  "`fitProjection`.",
  "`setCanvasSize` internals.",
  "`initZoom`.",
  "`bindEvents`.",
  "`updateMap`.",
  "`drawCanvas`.",
  "`renderPassToCache`.",
  "Hit canvas build.",
  "Selection/fill.",
  "Scenario refresh/chunk.",
  "Exact-after-settle.",
  "Strategic overlay runtime.",
  "Direct runtimeState writes.",
  "P26 must not add `js/core/renderer/renderer_render_lifecycle_owner.js`.",
]);

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
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

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing token ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected token ${JSON.stringify(token)}`);
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

function assertNoRendererOwnerImportsMapRenderer(sourcePath, source) {
  assert.equal(
    hasMapRendererImport(source),
    false,
    `${sourcePath} must not import js/core/map_renderer.js; map_renderer.js stays the composition root`,
  );
}

test("renderer surface host remains registry-only", () => {
  const hostSource = readRepoFile("js", "core", "renderer", "renderer_surface_host.js");

  for (const token of [
    "export function createRendererSurfaceHost(options = {})",
    "export const RENDERER_SURFACE_HANDLE_KEYS",
    "function createEmptyHandles()",
    "function normalizeHandleValue(value)",
    "function describeHandle(value)",
    "setMany",
    "snapshot",
  ]) {
    assertIncludes(hostSource, token, "surface host must keep registry API");
  }
  for (const token of SURFACE_HOST_SEMANTIC_BLACKLIST) {
    assertExcludes(hostSource, token, "surface host must stay registry-only");
  }
});

test("renderer surface lifecycle owner exists and remains mechanical-only", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");

  for (const token of LIFECYCLE_OWNER_REQUIRED_TOKENS) {
    assertIncludes(ownerSource, token, "P26 lifecycle owner must own mechanical surface lifecycle token");
  }
  for (const token of LIFECYCLE_OWNER_SEMANTIC_BLACKLIST) {
    assertExcludes(ownerSource, token, "P26 lifecycle owner must avoid renderer semantic token");
  }
});

test("map_renderer remains the composition root for surface modules", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceHost } from "./renderer/renderer_surface_host.js";',
    "map_renderer must import the surface host",
  );
  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceLifecycleOwner } from "./renderer/renderer_surface_lifecycle_owner.js";',
    "map_renderer must import the lifecycle owner",
  );
  assertIncludes(
    rendererSource,
    'import { createRendererProjectionPathOwner } from "./renderer/renderer_projection_path_owner.js";',
    "map_renderer must import the projection/path owner",
  );
  assertIncludes(
    rendererSource,
    "const rendererSurfaceHost = createRendererSurfaceHost();",
    "map_renderer must instantiate the surface host",
  );

  for (const sourcePath of listProjectSourceFiles("js")) {
    const source = readRepoFile(sourcePath);
    if (sourcePath !== "js/core/map_renderer.js") {
      assertExcludes(source, "renderer_surface_host.js", "only map_renderer may import the production surface host");
      assertExcludes(source, "renderer_surface_lifecycle_owner.js", "only map_renderer may import the production lifecycle owner");
      assertExcludes(source, "renderer_projection_path_owner.js", "only map_renderer may import the production projection/path owner");
    }
  }
});

test("map_renderer still owns current initMap lifecycle ordering and forbidden semantic regions", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of REQUIRED_MAP_RENDERER_LIFECYCLE_TOKENS) {
    assertIncludes(rendererSource, token, "P26 must preserve the surface lifecycle call order");
  }
  for (const tokenParts of RUNTIME_STATE_BRIDGE_ANCHORS) {
    assertIncludes(
      rendererSource,
      tokenParts.join(""),
      "P26 must keep current runtimeState bridge writes in map_renderer without adding a test-file state writer",
    );
  }
  for (const token of [
    "function updateMap(transform)",
    "function drawCanvas()",
    "function renderPassToCache(",
    "function applyDevSelectionFill()",
    "function refreshMapDataForScenarioChunkPromotion(options = {})",
    "function setMapData({",
    "async function buildHitCanvasAfterStartup(",
  ]) {
    assertIncludes(rendererSource, token, "P26 must leave existing renderer semantics in their current owner");
  }
});

test("P25 preflight continues to define P26 boundary and forbidden regions", () => {
  const preflightDoc = readRepoFile("docs", "active", "renderer-surface-lifecycle-preflight-20260626.md");

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(preflightDoc, heading, "P25 preflight doc must keep required heading");
  }
  assertIncludes(preflightDoc, P26_SCOPE_STATEMENT, "P25 doc must state the P26 extraction boundary");
  for (const token of P26_FORBIDDEN_REGION_TOKENS) {
    assertIncludes(preflightDoc, token, "P25 doc must lock P26 forbidden renderer regions");
  }
});

test("P26 forbids render lifecycle owners and renderer owner back-imports", () => {
  const sourcePaths = listProjectSourceFiles("js");
  assert.equal(
    sourcePaths.includes("js/core/renderer/renderer_render_lifecycle_owner.js"),
    false,
    "P26 must not introduce a render lifecycle owner during surface lifecycle extraction",
  );

  for (const sourcePath of sourcePaths.filter(isRendererOwnerPath)) {
    assertNoRendererOwnerImportsMapRenderer(sourcePath, readRepoFile(sourcePath));
  }
});

test("package exposes lifecycle owner and inventory scripts", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-lifecycle-owner": "node --test tests/renderer_surface_lifecycle_owner_behavior.test.mjs"',
    "package.json must expose the P26 lifecycle owner behavior test",
  );
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-lifecycle-inventory": "node --test tests/renderer_surface_lifecycle_inventory_boundary.test.mjs"',
    "package.json must keep the P25/P26 lifecycle inventory test",
  );
});
