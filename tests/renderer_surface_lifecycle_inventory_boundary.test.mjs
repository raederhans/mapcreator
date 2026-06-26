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
  "ensureHybridLayers();",
  "rendererSurfaceHost.setContext(rendererSurfaceHost.getMapCanvas().getContext(\"2d\"))",
  "rendererSurfaceHost.setProjection(globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION))",
  "rendererSurfaceHost.setPathSvg(globalThis.d3.geoPath(nextProjection).pointRadius(PATH_POINT_RADIUS))",
  "rendererSurfaceHost.setPathCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS))",
  "rendererSurfaceHost.setPathHitCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getHitContext()).pointRadius(PATH_POINT_RADIUS))",
  "setCanvasSize();",
  "fitProjection({",
  "initZoom();",
  "bindEvents();",
]);

const RUNTIME_STATE_BRIDGE_ANCHORS = Object.freeze([
  ["runtimeState.", "colorCanvas = rendererSurfaceHost.getMapCanvas()"],
  ["runtimeState.", "colorCtx = rendererSurfaceHost.getContext()"],
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

const P26_ALLOWED_FIRST_MOVE_TOKENS = Object.freeze([
  "P26 may add `js/core/renderer/renderer_surface_lifecycle_owner.js`.",
  "Map container and tooltip lookup.",
  "Named canvas layer ensure/get bridge.",
  "Hit canvas creation bridge if implemented as an injected helper.",
  "Map canvas, political patch canvas, and interaction overlay canvas registration into `rendererSurfaceHost`.",
  "2D context acquisition into `rendererSurfaceHost`.",
  "SVG root/group creation if and only if `ensureHybridLayers()` can be moved without changing ordering.",
]);

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

test("renderer surface host exists and remains registry-only", () => {
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

test("map_renderer remains the only production importer of renderer_surface_host", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceHost } from "./renderer/renderer_surface_host.js";',
    "map_renderer must import the surface host",
  );
  assertIncludes(
    rendererSource,
    "const rendererSurfaceHost = createRendererSurfaceHost();",
    "map_renderer must instantiate the surface host",
  );

  for (const sourcePath of listProjectSourceFiles("js")) {
    if (sourcePath === "js/core/map_renderer.js") continue;
    const source = readRepoFile(sourcePath);
    assertExcludes(source, "renderer_surface_host.js", "only map_renderer may import the production surface host");
  }
});

test("map_renderer still owns current initMap surface lifecycle anchors", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of REQUIRED_MAP_RENDERER_LIFECYCLE_TOKENS) {
    assertIncludes(rendererSource, token, "P25 must lock the current P24 surface lifecycle map");
  }
  for (const tokenParts of RUNTIME_STATE_BRIDGE_ANCHORS) {
    assertIncludes(
      rendererSource,
      tokenParts.join(""),
      "P25 must lock current runtimeState bridge writes without adding a test-file state writer",
    );
  }
});

test("P26 candidate extraction is limited to DOM canvas and SVG lifecycle mechanics", () => {
  const preflightDoc = readRepoFile("docs", "active", "renderer-surface-lifecycle-preflight-20260626.md");

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(preflightDoc, heading, "P25 preflight doc must keep required heading");
  }
  assertIncludes(preflightDoc, P26_SCOPE_STATEMENT, "P25 doc must state the P26 extraction boundary");
  for (const token of P26_ALLOWED_FIRST_MOVE_TOKENS) {
    assertIncludes(preflightDoc, token, "P25 doc must lock the P26 allowed first move");
  }
  for (const token of P26_FORBIDDEN_REGION_TOKENS) {
    assertIncludes(preflightDoc, token, "P25 doc must lock P26 forbidden renderer regions");
  }
});

test("P25 forbids render lifecycle owners and renderer owner back-imports", () => {
  const sourcePaths = listProjectSourceFiles("js");
  assert.equal(
    sourcePaths.includes("js/core/renderer/renderer_render_lifecycle_owner.js"),
    false,
    "P25 must not introduce a render lifecycle owner during surface lifecycle preflight",
  );

  for (const sourcePath of sourcePaths.filter(isRendererOwnerPath)) {
    assertNoRendererOwnerImportsMapRenderer(sourcePath, readRepoFile(sourcePath));
  }
});

test("package exposes the lifecycle inventory script without requiring P26 implementation", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-lifecycle-inventory": "node --test tests/renderer_surface_lifecycle_inventory_boundary.test.mjs"',
    "package.json must expose the P25 lifecycle inventory test",
  );
});
