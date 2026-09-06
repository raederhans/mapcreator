import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const PROJECTION_PATH_OWNER_PATH = "js/core/renderer/renderer_projection_path_owner.js";

const PROJECTION_PATH_OWNER_FORBIDDEN_TOKENS = Object.freeze([
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
]);

const FIT_PROJECTION_RENDERER_ANCHORS = Object.freeze([
  'import { createRendererFitProjectionOwner } from "./renderer/renderer_fit_projection_owner.js";',
  "function getRendererFitProjectionOwner()",
  "function fitProjection({ skipSpatialIndex = false } = {})",
  "return getRendererFitProjectionOwner().fitProjection({ skipSpatialIndex });",
]);

const FIT_PROJECTION_WIRING_ANCHORS = Object.freeze([
  "rendererFitProjectionOwner = createRendererFitProjectionOwner({",
  "surfaceHost: rendererSurfaceHost,",
  "state: runtimeState,",
  "projectionFitPaddingRatio: PROJECTION_FIT_PADDING_RATIO",
  "getLogicalCanvasDimensions,",
  "getRenderableLandFeatures,",
  "resetCityAnchorCache: () => {",
  "cityAnchorCache = new WeakMap();",
  "rebuildProjectedBoundsCache,",
  "buildSpatialIndex,",
  "setHitCanvasDirty: () => {",
  "setHitCanvasDirtyState(runtimeState, true);",
  "updateSpecialZonesPaths,",
  "renderSpecialZoneEditorOverlay,",
  "updateZoomTranslateExtent,",
  "markAllOverlaysDirty,",
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

test("P28 projection/path owner exists and remains scoped to handle initialization", () => {
  assert.equal(
    repoFileExists(PROJECTION_PATH_OWNER_PATH),
    true,
    "P28 must add the projection/path owner implementation",
  );
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");

  for (const token of PROJECTION_PATH_OWNER_FORBIDDEN_TOKENS) {
    assertExcludes(ownerSource, token, "projection/path owner must avoid renderer semantic token");
  }
  assert.equal(hasMapRendererImport(ownerSource), false, "projection/path owner must not import map_renderer");
});

// Initialization details are covered by renderer_projection_path_owner_behavior.
// Raw initialization retirement is also checked by the canonical architecture rule.
test("map_renderer keeps fitting composition outside the projection/path owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const fitProjectionOwnerSource = sliceBetween(
    rendererSource,
    "function getRendererFitProjectionOwner()",
    "function getRendererStartupTransactionOwner()",
  );

  for (const token of FIT_PROJECTION_RENDERER_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep fitProjection owner and wrapper anchor");
  }
  for (const token of FIT_PROJECTION_WIRING_ANCHORS) {
    assertIncludes(
      fitProjectionOwnerSource,
      token,
      "map_renderer must keep fitProjection injected side-effect anchor",
    );
  }
  assert.doesNotMatch(fitProjectionOwnerSource, /runtimeState\.hitCanvasDirty\s*=/,
    "fitProjection dirty state must flow through its action");
});

test("surface lifecycle owner remains mechanical-only for projection/path concerns", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");

  for (const token of SURFACE_LIFECYCLE_FORBIDDEN_TOKENS) {
    assertExcludes(ownerSource, token, "surface lifecycle owner must avoid projection/path/fitting token");
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
