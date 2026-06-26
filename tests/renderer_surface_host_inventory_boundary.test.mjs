import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RENDERER_SURFACE_HANDLE_KEYS,
} from "../js/core/renderer/renderer_surface_host.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const HANDLE_DECLARATIONS = Object.freeze([
  "let mapContainer = null;",
  "let canvasLayers = null;",
  "let mapCanvas = null;",
  "let politicalPatchCanvas = null;",
  "let interactionOverlayCanvas = null;",
  "let hitCanvas = null;",
  "let mapSvg = null;",
  "let interactionRect = null;",
  "let tooltip = null;",
  "let context = null;",
  "let politicalPatchContext = null;",
  "let interactionOverlayContext = null;",
  "let hitContext = null;",
  "let projection = null;",
  "let pathSVG = null;",
  "let pathCanvas = null;",
  "let pathHitCanvas = null;",
  "let zoomBehavior = null;",
  "let viewportGroup = null;",
  "let strategicDefs = null;",
  "let frontlineOverlayGroup = null;",
  "let frontlineLabelsGroup = null;",
  "let operationalLinesGroup = null;",
  "let operationGraphicsGroup = null;",
  "let operationGraphicsEditorGroup = null;",
  "let unitCountersGroup = null;",
  "let specialZonesGroup = null;",
  "let specialZoneEditorGroup = null;",
  "let hoverGroup = null;",
  "let devSelectionGroup = null;",
  "let inspectorHighlightGroup = null;",
  "let intensityFieldPreviewGroup = null;",
]);

const OWNER_GETTER_TOKENS = Object.freeze([
  "getContext: () => rendererSurfaceHost.getContext()",
  "getProjection: () => rendererSurfaceHost.getProjection()",
  "getPathCanvas: () => rendererSurfaceHost.getPathCanvas()",
  "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
  "getPathSVG: () => rendererSurfaceHost.getPathSvg()",
  "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior()",
  "getInteractionRect: () => rendererSurfaceHost.getInteractionRect()",
  "getMapContainer: () => rendererSurfaceHost.getMapContainer()",
  "getMapSvg: () => rendererSurfaceHost.getMapSvg()",
  "getTargetCanvas: () => rendererSurfaceHost.getContext()?.canvas || null",
  "getOperationalLinesGroup: () => rendererSurfaceHost.getOperationalLinesGroup()",
  "getOperationGraphicsGroup: () => rendererSurfaceHost.getOperationGraphicsGroup()",
  "getUnitCountersGroup: () => rendererSurfaceHost.getUnitCountersGroup()",
  "getSpecialZonesGroup: () => rendererSurfaceHost.getSpecialZonesGroup()",
  "getSpecialZoneEditorGroup: () => rendererSurfaceHost.getSpecialZoneEditorGroup()",
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

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing end marker ${JSON.stringify(endMarker)}`);
  return source.slice(start, end);
}

function assertFunctionIncludes(source, startMarker, endMarker, tokens, message) {
  const functionSource = sliceBetween(source, startMarker, endMarker);
  for (const token of tokens) {
    assertIncludes(functionSource, token, message);
  }
}

test("surface host module owns the renderer handle registry", () => {
  const hostSource = readRepoFile("js", "core", "renderer", "renderer_surface_host.js");

  assertIncludes(hostSource, "export function createRendererSurfaceHost(options = {})", "surface host must expose its factory");
  assertIncludes(hostSource, "export const RENDERER_SURFACE_HANDLE_KEYS", "surface host must expose handle keys for tests and diagnostics");
  assertIncludes(hostSource, "function createEmptyHandles()", "surface host must centralize empty handle creation");
  assertIncludes(hostSource, "setMany", "surface host must support grouped setup");
  assertIncludes(hostSource, "snapshot", "surface host must support non-handle diagnostics");
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
    assertExcludes(hostSource, token, "surface host must stay a handle registry without renderer semantics");
  }

  for (const handleKey of RENDERER_SURFACE_HANDLE_KEYS) {
    assertIncludes(hostSource, `"${handleKey}"`, "surface host registry must include every expected handle key");
  }
});

test("map_renderer delegates surface handle storage to the host", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceHost } from "./renderer/renderer_surface_host.js";',
    "map_renderer must import the surface host",
  );
  assertIncludes(rendererSource, "const rendererSurfaceHost = createRendererSurfaceHost();", "map_renderer must instantiate one surface host");

  for (const sourcePath of listProjectSourceFiles("js")) {
    if (sourcePath === "js/core/map_renderer.js") continue;
    const source = readRepoFile(sourcePath);
    assertExcludes(source, "renderer_surface_host.js", "only map_renderer may import the production surface host");
  }

  for (const token of HANDLE_DECLARATIONS) {
    assertExcludes(rendererSource, token, "top-level surface handle storage must move out of map_renderer");
  }
  for (const token of [
    "rendererSurfaceHost.setMapContainer(document.getElementById(containerId))",
    "rendererSurfaceHost.setTooltip(document.getElementById(\"tooltip\"))",
    "rendererSurfaceHost.setCanvasLayers(ensureCanvasLayers(rendererSurfaceHost.getMapContainer(), {",
    "rendererSurfaceHost.setContext(rendererSurfaceHost.getMapCanvas().getContext(\"2d\"))",
    "rendererSurfaceHost.setHitContext(rendererSurfaceHost.getHitCanvas().getContext(\"2d\", { willReadFrequently: true }))",
    "rendererSurfaceHost.setProjection(globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION))",
    "rendererSurfaceHost.setPathCanvas(globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS))",
    "rendererSurfaceHost.setZoomBehavior(nextZoomBehavior)",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must write surface handles through the host");
  }
});

test("owner getters read surface handles through rendererSurfaceHost", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertFunctionIncludes(
    rendererSource,
    "function getRenderCacheOwner() {",
    "function getProjectedGeometryBoundsOwner() {",
    ["getContext: () => rendererSurfaceHost.getContext()"],
    "render cache owner must receive the host drawing context",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getProjectedGeometryBoundsOwner() {",
    "function getViewportReadModelOwner() {",
    [
      "getProjection: () => rendererSurfaceHost.getProjection()",
      "getPathCanvas: () => rendererSurfaceHost.getPathCanvas()",
      "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
    ],
    "projected geometry bounds owner must receive projection/path handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportReadModelOwner() {",
    "function getViewportCommandOwner() {",
    [
      "getProjection: () => rendererSurfaceHost.getProjection()",
      "getPathSvg: () => rendererSurfaceHost.getPathSvg()",
      "getZoomIdentity: () => globalThis.d3?.zoomIdentity",
    ],
    "viewport read model owner must receive projection/path/zoom identity getters",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportCommandOwner() {",
    "function getViewportResizeLifecycleOwner() {",
    [
      "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior()",
      "getInteractionRect: () => rendererSurfaceHost.getInteractionRect()",
    ],
    "viewport command owner must receive zoom and interaction rect handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportResizeLifecycleOwner() {",
    "function getZoomInteractionLifecycleOwner() {",
    ["getMapContainer: () => rendererSurfaceHost.getMapContainer()"],
    "viewport resize lifecycle owner must receive the map container handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getSpatialIndexRuntimeOwner() {",
    "function getRenderCacheOwner() {",
    ["getPathSvg: () => rendererSurfaceHost.getPathSvg()"],
    "spatial index runtime owner must receive the SVG path handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getIntensityFieldMaskOwner() {",
    "function getHgoRuntimePreviewRenderOwner() {",
    ["getProjection: () => rendererSurfaceHost.getProjection()"],
    "intensity field mask owner must receive the projection handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getHgoRuntimePreviewRenderOwner() {",
    "function getRenderPipelinePassesOwner() {",
    [
      "getProjection: () => rendererSurfaceHost.getProjection()",
      "getMapSvg: () => rendererSurfaceHost.getMapSvg()",
      "getTargetCanvas: () => rendererSurfaceHost.getContext()?.canvas || null",
    ],
    "HGO runtime preview owner must receive projection, SVG, and target canvas handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getStrategicOverlayHelpersOwner() {",
    "function getStrategicOverlayRenderOwner() {",
    OWNER_GETTER_TOKENS.filter((token) => token.includes("Group")),
    "strategic overlay helpers owner must receive SVG overlay groups",
  );
});

test("canvas layer manager calls remain in map_renderer", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  for (const token of [
    "CANVAS_LAYER_NAMES",
    "clearCanvasLayer",
    "ensureCanvasLayers",
    "getCanvasLayer",
    "resizeCanvasLayers",
    "rendererSurfaceHost.setCanvasLayers(ensureCanvasLayers(rendererSurfaceHost.getMapContainer(), {",
    "rendererSurfaceHost.setMapCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.composite)?.canvas || null);",
    "rendererSurfaceHost.setPoliticalPatchCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.politicalPatch)?.canvas || null);",
    "rendererSurfaceHost.setInteractionOverlayCanvas(getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.interactionOverlay)?.canvas || null);",
    "resizeCanvasLayers(rendererSurfaceHost.getCanvasLayers(), {",
    "clearCanvasLayer(getCanvasLayer(rendererSurfaceHost.getCanvasLayers(), CANVAS_LAYER_NAMES.politicalPatch))",
  ]) {
    assertIncludes(rendererSource, token, "canvas layer manager surface bridge must stay visible in map_renderer.js");
  }
});

test("P23 preflight document remains available as P24 input evidence", () => {
  const docSource = readRepoFile("docs", "active", "renderer-surface-host-preflight-20260626.md");
  for (const heading of [
    "## Current surface handle inventory",
    "## P24 candidate surface host API",
    "## P24 allowed first move",
  ]) {
    assertIncludes(docSource, heading, "P23 preflight doc must keep required heading");
  }
});

test("package exposes renderer surface host scripts", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-host": "node --test tests/renderer_surface_host_behavior.test.mjs tests/renderer_surface_host_inventory_boundary.test.mjs"',
    "package.json must expose combined surface host behavior and inventory tests",
  );
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-host-inventory": "node --test tests/renderer_surface_host_inventory_boundary.test.mjs"',
    "package.json must keep the inventory-only script",
  );
});
