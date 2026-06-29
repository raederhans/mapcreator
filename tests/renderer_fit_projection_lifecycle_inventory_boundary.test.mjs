import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const FIT_PROJECTION_OWNER_PATH = "js/core/renderer/renderer_fit_projection_owner.js";
const FIT_PROJECTION_OWNER_TEST_PATH = "tests/renderer_fit_projection_owner_behavior.test.mjs";
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

const MAP_RENDERER_WIRING_TOKENS = Object.freeze([
  "import { createRendererFitProjectionOwner } from \"./renderer/renderer_fit_projection_owner.js\";",
  "let rendererFitProjectionOwner = null;",
  "function getRendererFitProjectionOwner()",
  "rendererFitProjectionOwner = createRendererFitProjectionOwner({",
  "surfaceHost: rendererSurfaceHost",
  "state,",
  "projectionFitPaddingRatio: PROJECTION_FIT_PADDING_RATIO",
  "getLogicalCanvasDimensions,",
  "getRenderableLandFeatures,",
  "resetCityAnchorCache: () => {",
  "cityAnchorCache = new WeakMap();",
  "rebuildProjectedBoundsCache,",
  "buildSpatialIndex,",
  "setHitCanvasDirty: () => {",
  "updateSpecialZonesPaths,",
  "renderSpecialZoneEditorOverlay,",
  "updateZoomTranslateExtent,",
  "markAllOverlaysDirty,",
]);

const FIT_PROJECTION_WRAPPER_TOKENS = Object.freeze([
  "function fitProjection({ skipSpatialIndex = false } = {})",
  "return getRendererFitProjectionOwner().fitProjection({ skipSpatialIndex });",
]);

const OWNER_REQUIRED_TOKENS = Object.freeze([
  "export function createRendererFitProjectionOwner({",
  "surfaceHost,",
  "state = {},",
  "constants = {},",
  "getters = {},",
  "effects = {},",
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
  "forceProd: true",
  "type: \"FeatureCollection\"",
  "fitExtent([[padding, padding], [x1, y1]], fitTarget);",
  "resetCityAnchorCache();",
  "rebuildProjectedBoundsCache();",
  "buildSpatialIndex();",
  "setHitCanvasDirty();",
  "updateSpecialZonesPaths();",
  "renderSpecialZoneEditorOverlay();",
  "updateZoomTranslateExtent();",
  "markAllOverlaysDirty();",
]);

const OWNER_FORBIDDEN_TOKENS = Object.freeze([
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
]);

const MAP_RENDERER_RAW_BODY_TOKENS = Object.freeze([
  "const padding = Math.max(16, Math.round(Math.min(runtimeState.width, runtimeState.height) * PROJECTION_FIT_PADDING_RATIO));",
  "const x1 = Math.max(padding + 1, runtimeState.width - padding);",
  "const y1 = Math.max(padding + 1, runtimeState.height - padding);",
  "rendererSurfaceHost.getProjection().fitExtent([[padding, padding], [x1, y1]], fitTarget);",
]);

const FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS = Object.freeze([
  ["runtimeState.", "hitCanvasDirty = true;"],
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

const P32_DOC_TOKENS = Object.freeze([
  "P32 may add `js/core/renderer/renderer_fit_projection_owner.js`.",
  "P32 may move fitProjection orchestration into the owner only through injected getters and effects",
  "Preserve `js/core/map_renderer.js` as the composition root.",
  "Preserve the existing `fitProjection` wrapper name in `js/core/map_renderer.js`.",
  "Keep viewport resize lifecycle using the same fitProjection wrapper/effect.",
  "Direct `runtimeState` writes.",
  "Import of `js/core/map_renderer.js`.",
  "Render pass execution is not part of P32.",
  "Renderer public facade change.",
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

test("P32 adds fitProjection owner implementation and behavior test", () => {
  assert.equal(repoFileExists(FIT_PROJECTION_OWNER_PATH), true);
  assert.equal(repoFileExists(FIT_PROJECTION_OWNER_TEST_PATH), true);
  assert.equal(
    listProjectSourceFiles("js/core/renderer").includes(FIT_PROJECTION_OWNER_PATH),
    true,
    "P32 must add renderer_fit_projection_owner.js to js/core/renderer",
  );
});

test("map_renderer imports and wires fitProjection owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of MAP_RENDERER_WIRING_TOKENS) {
    assertIncludes(rendererSource, token, "map_renderer must wire fitProjection owner");
  }
  for (const tokenParts of FIT_PROJECTION_STATE_WRITE_TOKEN_PARTS) {
    assertIncludes(
      rendererSource,
      tokenParts.join(""),
      "map_renderer must keep hit-canvas dirty write as injected effect",
    );
  }
});

test("map_renderer keeps stable fitProjection wrapper and moves raw body into owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const fitProjectionSource = sliceBetween(
    rendererSource,
    "function fitProjection({ skipSpatialIndex = false } = {})",
    "function getResizeReason(reason, fallback = \"resize\")",
  );

  for (const token of FIT_PROJECTION_WRAPPER_TOKENS) {
    assertIncludes(fitProjectionSource, token, "fitProjection wrapper must remain stable");
  }
  for (const token of MAP_RENDERER_RAW_BODY_TOKENS) {
    assertExcludes(fitProjectionSource, token, "fitProjection wrapper must delegate raw body to owner");
  }
});

test("fitProjection owner locks injected inputs and ordered effects", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_fit_projection_owner.js");

  for (const token of OWNER_REQUIRED_TOKENS) {
    assertIncludes(ownerSource, token, "fitProjection owner must keep injected behavior token");
  }
});

test("fitProjection owner avoids forbidden renderer semantics", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_fit_projection_owner.js");

  for (const token of OWNER_FORBIDDEN_TOKENS) {
    assertExcludes(ownerSource, token, "fitProjection owner must avoid forbidden semantic token");
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

  assertIncludes(resizeFactorySource, "createViewportResizeLifecycleOwner({", "map_renderer must create viewport resize owner");
  assertIncludes(resizeFactorySource, "fitProjection,", "map_renderer must inject fitProjection into viewport resize owner");
  assertIncludes(
    resizeOwnerSource,
    "effects.fitProjection?.({ skipSpatialIndex: interactiveLayoutResize });",
    "viewport resize owner must call injected fitProjection effect",
  );
});

test("projection and SVG owners remain outside fitProjection fitting", () => {
  const projectionOwnerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");
  const svgOwnerSource = readRepoFile("js", "core", "renderer", "renderer_svg_surface_lifecycle_owner.js");

  for (const token of ["fitProjection", "fitExtent"]) {
    assertExcludes(projectionOwnerSource, token, "projection/path owner must not own fitProjection fitting");
    assertExcludes(svgOwnerSource, token, "SVG lifecycle owner must not own fitProjection fitting");
  }
});

test("render semantic anchors remain outside fitProjection owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_fit_projection_owner.js");

  for (const token of RENDER_SEMANTIC_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep render semantic anchor");
    assertExcludes(ownerSource, token, "fitProjection owner must not import render semantic anchor");
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

test("P31 preflight document still locks P32 allowed move and forbidden areas", () => {
  const docSource = readRepoFile(...FIT_PROJECTION_PREFLIGHT_DOC_PATH.split("/"));

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(docSource, heading, "P31 preflight doc must keep required heading");
  }
  for (const token of P32_DOC_TOKENS) {
    assertIncludes(docSource, token, "P31 doc must keep P32 guardrail token");
  }
});

test("package exposes fitProjection owner and lifecycle scripts", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-fit-projection-owner\": \"node --test tests/renderer_fit_projection_owner_behavior.test.mjs\"",
    "package.json must expose the P32 fitProjection owner test",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-fit-projection-lifecycle\": \"node --test tests/renderer_fit_projection_owner_behavior.test.mjs tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose combined P32 fitProjection lifecycle script",
  );
});
