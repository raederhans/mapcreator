import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing token ${JSON.stringify(token)}`);
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

test("map_renderer still owns surface handles before P24", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const handleDeclarations = [
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
  ];

  for (const token of handleDeclarations) {
    assertIncludes(rendererSource, token, "P23 inventory must lock current host-owned surface handle");
  }
});

test("owner getters still expose current surface handle dependencies", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertFunctionIncludes(
    rendererSource,
    "function getRenderCacheOwner() {",
    "function getRenderTransformReusePolicyOwner() {",
    ["getContext: () => context"],
    "render cache owner must receive the host drawing context",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getProjectedGeometryBoundsOwner() {",
    "function getViewportReadModelOwner() {",
    [
      "getProjection: () => projection",
      "getPathCanvas: () => pathCanvas",
      "getPathSvg: () => pathSVG",
    ],
    "projected geometry bounds owner must receive projection/path handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportReadModelOwner() {",
    "function getViewportCommandOwner() {",
    [
      "getProjection: () => projection",
      "getPathSvg: () => pathSVG",
      "getZoomIdentity: () => globalThis.d3?.zoomIdentity",
    ],
    "viewport read model owner must receive projection/path/zoom identity getters",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportCommandOwner() {",
    "function getViewportResizeLifecycleOwner() {",
    [
      "getZoomBehavior: () => zoomBehavior",
      "getInteractionRect: () => interactionRect",
    ],
    "viewport command owner must receive zoom and interaction rect handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getViewportResizeLifecycleOwner() {",
    "function getZoomInteractionLifecycleOwner() {",
    ["getMapContainer: () => mapContainer"],
    "viewport resize lifecycle owner must receive the map container handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getSpatialIndexRuntimeOwner() {",
    "function getRenderCacheOwner() {",
    ["getPathSvg: () => pathSVG"],
    "spatial index runtime owner must receive the SVG path handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getIntensityFieldMaskOwner() {",
    "function getHgoRuntimePreviewRenderOwner() {",
    ["getProjection: () => projection"],
    "intensity field mask owner must receive the projection handle",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getHgoRuntimePreviewRenderOwner() {",
    "function getRenderPipelinePassesOwner() {",
    [
      "getProjection: () => projection",
      "getMapSvg: () => mapSvg",
      "getTargetCanvas: () => context?.canvas || null",
    ],
    "HGO runtime preview owner must receive projection, SVG, and target canvas handles",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getStrategicOverlayHelpersOwner() {",
    "function getStrategicOverlayRenderOwner() {",
    [
      "getOperationalLinesGroup: () => operationalLinesGroup",
      "getOperationGraphicsGroup: () => operationGraphicsGroup",
      "getUnitCountersGroup: () => unitCountersGroup",
      "getSpecialZonesGroup: () => specialZonesGroup",
      "getSpecialZoneEditorGroup: () => specialZoneEditorGroup",
    ],
    "strategic overlay helpers owner must receive SVG overlay groups",
  );
  assertFunctionIncludes(
    rendererSource,
    "function getStrategicOverlayRuntimeOwner() {",
    "configureDataRuntimeFacade({",
    [
      "getHitFromEvent",
      "getMapLonLatFromEvent",
      "renderNow: () => {",
      "renderOperationGraphicsIfNeeded",
      "renderSpecialZonesIfNeeded",
      "renderSpecialZoneEditorOverlay",
    ],
    "strategic overlay runtime owner must receive map event and renderer bridge helpers",
  );
});

test("canvas layer manager calls remain in the host before P24", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  for (const token of [
    "CANVAS_LAYER_NAMES",
    "clearCanvasLayer",
    "ensureCanvasLayers",
    "getCanvasLayer",
    "resizeCanvasLayers",
    "canvasLayers = ensureCanvasLayers(mapContainer, {",
    "mapCanvas = getCanvasLayer(canvasLayers, CANVAS_LAYER_NAMES.composite)?.canvas || null;",
    "politicalPatchCanvas = getCanvasLayer(canvasLayers, CANVAS_LAYER_NAMES.politicalPatch)?.canvas || null;",
    "interactionOverlayCanvas = getCanvasLayer(canvasLayers, CANVAS_LAYER_NAMES.interactionOverlay)?.canvas || null;",
    "resizeCanvasLayers(canvasLayers, {",
    "clearCanvasLayer(getCanvasLayer(canvasLayers, CANVAS_LAYER_NAMES.politicalPatch))",
  ]) {
    assertIncludes(rendererSource, token, "canvas layer manager surface bridge must stay visible in map_renderer.js");
  }
});

test("P23 preflight document keeps P24 surface host anchors", () => {
  const docSource = readRepoFile("docs", "active", "renderer-surface-host-preflight-20260626.md");
  for (const heading of [
    "## Current surface handle inventory",
    "## P24 candidate surface host API",
    "## P24 allowed first move",
  ]) {
    assertIncludes(docSource, heading, "P23 preflight doc must keep required heading");
  }
});

test("package exposes the renderer surface host inventory script", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    '"test:node:renderer-surface-host-inventory": "node --test tests/renderer_surface_host_inventory_boundary.test.mjs"',
    "package.json must expose renderer surface host inventory test script",
  );
});

test("P23 does not introduce the production surface host module", () => {
  const surfaceHostPath = path.join(REPO_ROOT, "js", "core", "renderer", "renderer_surface_host.js");
  assert.equal(
    fs.existsSync(surfaceHostPath),
    false,
    "renderer_surface_host.js is reserved for the P24 implementation phase",
  );
});
