import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const PROJECTION_PATH_OWNER_PATH = "js/core/renderer/renderer_projection_path_owner.js";

const REQUIRED_PREFLIGHT_HEADINGS = Object.freeze([
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
]);

const PROJECTION_PATH_CREATION_ANCHORS = Object.freeze([
  "function initMap({",
  "const nextProjection = rendererSurfaceHost.setProjection(globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION));",
  "nextProjection.clipExtent(null);",
  "rendererSurfaceHost.setPathSvg(globalThis.d3.geoPath(nextProjection).pointRadius(PATH_POINT_RADIUS));",
  "rendererSurfaceHost.setPathCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS));",
  "rendererSurfaceHost.setPathHitCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getHitContext()).pointRadius(PATH_POINT_RADIUS));",
]);

const FIT_PROJECTION_ANCHORS = Object.freeze([
  "function fitProjection({ skipSpatialIndex = false } = {})",
  "rendererSurfaceHost.getProjection().fitExtent([[padding, padding], [x1, y1]], fitTarget);",
  "cityAnchorCache = new WeakMap();",
  "rebuildProjectedBoundsCache();",
  "buildSpatialIndex();",
  "updateSpecialZonesPaths();",
  "renderSpecialZoneEditorOverlay();",
  "updateZoomTranslateExtent();",
  "markAllOverlaysDirty();",
]);

const FIT_PROJECTION_ANCHOR_PARTS = Object.freeze([
  ["runtimeState.", "hitCanvasDirty = true;"],
]);

const RENDERER_SEMANTIC_REGION_ANCHORS = Object.freeze([
  "function setCanvasSize({",
  "function updateMap(transform)",
  "function drawCanvas()",
  "function renderPassToCache(",
  "function initZoom()",
  "function bindEvents()",
  "function setMapData({",
  "async function buildHitCanvasAfterStartup(",
  "function applyDevSelectionFill()",
  "function refreshMapDataForScenarioChunkPromotion(options = {})",
  "createExactAfterSettleScheduler({",
  "createStrategicOverlayRuntimeOwner({",
]);

const SURFACE_LIFECYCLE_FORBIDDEN_TOKENS = Object.freeze([
  "setProjection",
  "getProjection",
  "setPathSvg",
  "getPathSvg",
  "setPathCanvas",
  "getPathCanvas",
  "setPathHitCanvas",
  "getPathHitCanvas",
  "geoEqualEarth",
  "geoPath",
  "PROJECTION_PRECISION",
  "PATH_POINT_RADIUS",
  "fitProjection",
  "fitExtent",
  "projection.fitExtent",
]);

const SURFACE_HOST_REGISTRY_TOKENS = Object.freeze([
  "export function createRendererSurfaceHost(options = {})",
  "export const RENDERER_SURFACE_HANDLE_KEYS",
  "[\"projection\", \"getProjection\", \"setProjection\"]",
  "[\"pathSVG\", \"getPathSvg\", \"setPathSvg\"]",
  "[\"pathCanvas\", \"getPathCanvas\", \"setPathCanvas\"]",
  "[\"pathHitCanvas\", \"getPathHitCanvas\", \"setPathHitCanvas\"]",
  "function createEmptyHandles()",
  "function normalizeHandleValue(value)",
  "function describeHandle(value)",
  "setMany",
  "snapshot",
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
  "refreshMapDataForScenarioChunkPromotion",
  "exactAfterSettle",
  "strategicOverlayRuntime",
  "fitProjection",
  "fitExtent",
  "initZoom",
  "bindEvents",
  "setCanvasSize",
  "setMapData",
]);

const P28_ALLOWED_TOKENS = Object.freeze([
  "P28 may add `js/core/renderer/renderer_projection_path_owner.js`.",
  "P28 may move only projection/path handle creation and registration:",
  "Create the Equal Earth projection through injected `d3` and `projectionPrecision`.",
  "Create SVG, canvas, and hit-canvas paths through injected `d3`, `pointRadius`, map context getter, and hit context getter.",
  "Register `projection`, `pathSVG`, `pathCanvas`, and `pathHitCanvas` into `rendererSurfaceHost`.",
  "Preserve `initMap` ordering by calling the owner exactly where projection/path creation currently happens.",
  "Keep `js/core/map_renderer.js` as the composition root.",
]);

const P28_FORBIDDEN_TOKENS = Object.freeze([
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
]);

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
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

test("P27 reserves projection/path owner for P28", () => {
  assert.equal(
    repoFileExists(PROJECTION_PATH_OWNER_PATH),
    false,
    "P27 preflight must not add the projection/path owner implementation",
  );
});

test("map_renderer still owns projection/path creation and fitting", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of PROJECTION_PATH_CREATION_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current projection/path creation anchor");
  }
  for (const token of FIT_PROJECTION_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current fitProjection side-effect anchor");
  }
  for (const tokenParts of FIT_PROJECTION_ANCHOR_PARTS) {
    assertIncludes(
      rendererSource,
      tokenParts.join(""),
      "map_renderer must keep current fitProjection state-dirty side-effect anchor",
    );
  }
  for (const token of RENDERER_SEMANTIC_REGION_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current semantic region anchor");
  }
});

test("surface lifecycle owner remains mechanical-only for projection/path concerns", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");

  for (const token of [
    "export function createRendererSurfaceLifecycleOwner({",
    "function resolveDomHandles({",
    "function ensureCanvasLayerHandles({",
    "function ensureHitCanvasHandle()",
    "function acquireCanvasContexts()",
    "setContext",
    "setHitContext",
  ]) {
    assertIncludes(ownerSource, token, "surface lifecycle owner must keep mechanical surface token");
  }
  for (const token of SURFACE_LIFECYCLE_FORBIDDEN_TOKENS) {
    assertExcludes(ownerSource, token, "surface lifecycle owner must avoid projection/path/fitting token");
  }
});

test("surface host remains registry-only while storing projection/path handles", () => {
  const hostSource = readRepoFile("js", "core", "renderer", "renderer_surface_host.js");

  for (const token of SURFACE_HOST_REGISTRY_TOKENS) {
    assertIncludes(hostSource, token, "surface host must keep projection/path registry token");
  }
  for (const token of SURFACE_HOST_SEMANTIC_BLACKLIST) {
    assertExcludes(hostSource, token, "surface host must stay registry-only");
  }
});

test("projection/path consumers receive handles through getters without importing map_renderer", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const projectedBoundsSource = readRepoFile("js", "core", "renderer", "projected_geometry_bounds_owner.js");
  const viewportReadModelSource = readRepoFile("js", "core", "renderer", "viewport_read_model_owner.js");

  assert.equal(hasMapRendererImport(projectedBoundsSource), false, "projected geometry bounds owner must not import map_renderer");
  assert.equal(hasMapRendererImport(viewportReadModelSource), false, "viewport read model owner must not import map_renderer");

  for (const token of [
    "getProjection: () => rendererSurfaceHost.getProjection()",
    "getPathCanvas: () => rendererSurfaceHost.getPathCanvas()",
    "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must inject projection/path getters into projected geometry bounds owner");
  }
  for (const token of [
    "getProjection: () => rendererSurfaceHost.getProjection()",
    "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
    "getZoomIdentity: () => globalThis.d3?.zoomIdentity",
    "getProjectedFeatureBounds",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must inject projection/path read-model dependencies");
  }
  for (const token of [
    "getProjection = () => null",
    "getPathCanvas = () => null",
    "getPathSvg = () => null",
    "function rebuildProjectedBoundsCache()",
  ]) {
    assertIncludes(projectedBoundsSource, token, "projected geometry bounds owner must remain getter-driven");
  }
  for (const token of [
    "function getProjectionRenderSignature()",
    "function getViewportGeoBounds()",
    "function calculatePanExtent()",
    "function getCenteredFitZoomTransform(",
  ]) {
    assertIncludes(viewportReadModelSource, token, "viewport read model owner must remain getter-driven");
  }
});

test("renderer owners keep map_renderer import direction", () => {
  for (const sourcePath of listProjectSourceFiles("js/core/renderer").filter(isRendererOwnerPath)) {
    const source = readRepoFile(sourcePath);
    assert.equal(
      hasMapRendererImport(source),
      false,
      `${sourcePath} must not import js/core/map_renderer.js; map_renderer stays the composition root`,
    );
  }
});

test("P27 preflight document locks P28 allowed first move and forbidden areas", () => {
  const docSource = readRepoFile("docs", "active", "renderer-projection-path-lifecycle-preflight-20260627.md");

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(docSource, heading, "P27 preflight doc must keep required heading");
  }
  for (const token of P28_ALLOWED_TOKENS) {
    assertIncludes(docSource, token, "P27 doc must lock P28 allowed first move");
  }
  for (const token of P28_FORBIDDEN_TOKENS) {
    assertIncludes(docSource, token, "P27 doc must lock P28 forbidden area");
  }
});

test("package exposes projection/path lifecycle inventory script", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-projection-path-lifecycle-inventory\": \"node --test tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the P27 projection/path lifecycle inventory test",
  );
});
