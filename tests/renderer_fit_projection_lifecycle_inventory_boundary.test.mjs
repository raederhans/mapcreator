import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const FIT_PROJECTION_OWNER_PATH = "js/core/renderer/renderer_fit_projection_owner.js";
const FIT_PROJECTION_PREFLIGHT_DOC_PATH = "docs/active/renderer-fit-projection-lifecycle-preflight-20260629.md";

const REQUIRED_PREFLIGHT_HEADINGS = Object.freeze([
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
]);

const FIT_PROJECTION_REQUIRED_TOKENS = Object.freeze([
  "function fitProjection({ skipSpatialIndex = false } = {})",
  "runtimeState.landData",
  "runtimeState.width",
  "runtimeState.height",
  "PROJECTION_FIT_PADDING_RATIO",
  "getLogicalCanvasDimensions()",
  "getRenderableLandFeatures(canvasWidth, canvasHeight, {",
  "rendererSurfaceHost.getProjection().fitExtent",
  "cityAnchorCache = new WeakMap();",
  "rebuildProjectedBoundsCache();",
  "buildSpatialIndex();",
  "updateSpecialZonesPaths();",
  "renderSpecialZoneEditorOverlay();",
  "updateZoomTranslateExtent();",
  "markAllOverlaysDirty();",
]);

const FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS = Object.freeze([
  ["runtimeState.", "hitCanvasDirty = true;"],
]);

const MAP_RENDERER_WRAPPER_TOKENS = Object.freeze([
  "function calculatePanExtent()",
  "function updateZoomTranslateExtent()",
  "function getViewportGeoBounds()",
  "function getProjectedRenderableContentBounds()",
  "function getCenteredFitZoomTransform({ centerX = true, centerY = false } = {})",
  "function resetZoomToFit({ centerContent = false, centerX = true, centerY = false } = {})",
  "function enforceZoomConstraints()",
]);

const VIEWPORT_RESIZE_FIT_PROJECTION_TOKENS = Object.freeze([
  "createViewportResizeLifecycleOwner({",
  "fitProjection,",
  "effects.fitProjection?.({ skipSpatialIndex: interactiveLayoutResize });",
]);

const RENDER_SEMANTIC_ANCHORS = Object.freeze([
  "function drawCanvas()",
  "function renderPassToCache(",
  "async function buildHitCanvasAfterStartup",
  "function render()",
  "createExactAfterSettleScheduler({",
  "createScenarioRefreshRuntime({",
  "createStrategicOverlayRuntimeOwner({",
]);

const P32_ALLOWED_TOKENS = Object.freeze([
  "P32 may add `js/core/renderer/renderer_fit_projection_owner.js`.",
  "P32 may move fitProjection orchestration into the owner only through injected getters and effects",
  "Preserve `js/core/map_renderer.js` as the composition root.",
  "Preserve the existing `fitProjection` wrapper name in `js/core/map_renderer.js`.",
  "Keep viewport resize lifecycle using the same fitProjection wrapper/effect.",
]);

const P32_FORBIDDEN_TOKENS = Object.freeze([
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
]);

const DOC_INVENTORY_TOKENS = Object.freeze([
  "P31 is preflight only.",
  "renderer_surface_host.js` is registry-only",
  "renderer_surface_lifecycle_owner.js` owns DOM lookup, canvas layer registration, hit canvas handle creation, and 2D context acquisition.",
  "renderer_projection_path_owner.js` owns Equal Earth projection creation and SVG/canvas/hit path creation plus registration.",
  "renderer_svg_surface_lifecycle_owner.js` owns SVG root, static viewport groups, strategic defs, preview group, and interaction rect creation plus registration.",
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
  "updateSpecialZonesPaths();",
  "renderSpecialZoneEditorOverlay();",
  "updateZoomTranslateExtent();",
  "markAllOverlaysDirty();",
  "projected_geometry_bounds_owner.js` owns projected bounds calculations and cache rebuild helpers through injected getters and effects.",
  "viewport_read_model_owner.js` owns read-model calculations",
  "viewport_command_owner.js` owns zoom command effects",
  "viewport_resize_lifecycle_owner.js` currently calls fitProjection as an injected effect",
  "Render pass execution is not part of P32.",
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

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected source to contain start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected source to contain end marker ${JSON.stringify(endMarker)}`);
  return source.slice(start, end);
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

test("P31 reserves fitProjection owner implementation for P32", () => {
  assert.equal(
    repoFileExists(FIT_PROJECTION_OWNER_PATH),
    false,
    "P31 must not add renderer_fit_projection_owner.js",
  );
  assert.equal(
    listProjectSourceFiles("js/core/renderer").includes(FIT_PROJECTION_OWNER_PATH),
    false,
    "P31 must keep renderer_fit_projection_owner.js absent from js/core/renderer",
  );
});

test("map_renderer still owns fitProjection inputs and side effects", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const fitProjectionSource = sliceBetween(
    rendererSource,
    "function fitProjection({ skipSpatialIndex = false } = {})",
    "function getResizeReason(reason, fallback = \"resize\")",
  );

  for (const token of FIT_PROJECTION_REQUIRED_TOKENS) {
    assertIncludes(fitProjectionSource, token, "fitProjection must keep current input/side-effect inventory");
  }
  for (const tokenParts of FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS) {
    assertIncludes(
      fitProjectionSource,
      tokenParts.join(""),
      "fitProjection must keep current hit-canvas dirty side-effect inventory",
    );
  }
});

test("map_renderer keeps viewport wrapper names around fitProjection dependencies", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of MAP_RENDERER_WRAPPER_TOKENS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current viewport wrapper");
  }
});

test("viewport resize lifecycle still receives fitProjection as an injected effect", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const resizeOwnerSource = readRepoFile("js", "core", "renderer", "viewport_resize_lifecycle_owner.js");
  const resizeFactorySource = sliceBetween(
    rendererSource,
    "function getViewportResizeLifecycleOwner()",
    "function getScenarioWaterCachePolicyOwner()",
  );

  assertIncludes(resizeFactorySource, VIEWPORT_RESIZE_FIT_PROJECTION_TOKENS[0], "map_renderer must create viewport resize owner");
  assertIncludes(resizeFactorySource, VIEWPORT_RESIZE_FIT_PROJECTION_TOKENS[1], "map_renderer must inject fitProjection into viewport resize owner");
  assertIncludes(resizeOwnerSource, VIEWPORT_RESIZE_FIT_PROJECTION_TOKENS[2], "viewport resize owner must call injected fitProjection effect");
});

test("projection and SVG owners remain outside fitProjection fitting", () => {
  const projectionOwnerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");
  const svgOwnerSource = readRepoFile("js", "core", "renderer", "renderer_svg_surface_lifecycle_owner.js");

  for (const token of ["fitProjection", "fitExtent"]) {
    assertExcludes(projectionOwnerSource, token, "projection/path owner must not own fitProjection fitting");
    assertExcludes(svgOwnerSource, token, "SVG lifecycle owner must not own fitProjection fitting");
  }
});

test("render semantic anchors remain out of P31 fitProjection scope", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of RENDER_SEMANTIC_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep render semantic anchor out of P31 scope");
  }
});

test("renderer owners keep map_renderer import direction before P32", () => {
  for (const sourcePath of listProjectSourceFiles("js/core/renderer").filter(isRendererOwnerPath)) {
    const source = readRepoFile(sourcePath);
    assert.equal(
      hasMapRendererImport(source),
      false,
      `${sourcePath} must not import js/core/map_renderer.js; map_renderer stays the composition root`,
    );
  }
});

test("P31 preflight document locks P32 allowed first move and forbidden areas", () => {
  const docSource = readRepoFile(...FIT_PROJECTION_PREFLIGHT_DOC_PATH.split("/"));

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(docSource, heading, "P31 preflight doc must keep required heading");
  }
  for (const token of DOC_INVENTORY_TOKENS) {
    assertIncludes(docSource, token, "P31 doc must inventory current fitProjection dependency");
  }
  for (const tokenParts of FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS) {
    assertIncludes(
      docSource,
      tokenParts.join(""),
      "P31 doc must inventory current hit-canvas dirty side effect",
    );
  }
  for (const token of P32_ALLOWED_TOKENS) {
    assertIncludes(docSource, token, "P31 doc must lock P32 allowed first move");
  }
  for (const token of P32_FORBIDDEN_TOKENS) {
    assertIncludes(docSource, token, "P31 doc must lock P32 forbidden area");
  }
});

test("package exposes fitProjection lifecycle inventory script", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-fit-projection-lifecycle-inventory\": \"node --test tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the P31 fitProjection lifecycle inventory test",
  );
});
