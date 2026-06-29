import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const SVG_SURFACE_OWNER_PATH = "js/core/renderer/renderer_svg_surface_lifecycle_owner.js";

const REQUIRED_PREFLIGHT_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current surface/projection lifecycle baseline",
  "## ensureHybridLayers responsibility map",
  "## SVG root lifecycle inventory",
  "## SVG group ordering inventory",
  "## Interaction rect layering inventory",
  "## Legend and legacy SVG cleanup inventory",
  "## Strategic overlay group boundary",
  "## P30 allowed first move",
  "## P30 forbidden areas",
  "## Required validation commands",
]);

const SVG_OWNER_REQUIRED_TOKENS = Object.freeze([
  "export function createRendererSvgSurfaceLifecycleOwner({",
  "function ensureSvgSurface()",
  "const getD3 = requireFunction(getters, \"getD3\", \"getters\");",
  "getMapContainer: requireFunction(host, \"getMapContainer\", \"surfaceHost\")",
  "setMapSvg: requireFunction(host, \"setMapSvg\", \"surfaceHost\")",
  "setViewportGroup: requireFunction(host, \"setViewportGroup\", \"surfaceHost\")",
  "setStrategicDefs: requireFunction(host, \"setStrategicDefs\", \"surfaceHost\")",
  "setFrontlineOverlayGroup: requireFunction(host, \"setFrontlineOverlayGroup\", \"surfaceHost\")",
  "setFrontlineLabelsGroup: requireFunction(host, \"setFrontlineLabelsGroup\", \"surfaceHost\")",
  "setOperationalLinesGroup: requireFunction(host, \"setOperationalLinesGroup\", \"surfaceHost\")",
  "setOperationGraphicsGroup: requireFunction(host, \"setOperationGraphicsGroup\", \"surfaceHost\")",
  "setOperationGraphicsEditorGroup: requireFunction(host, \"setOperationGraphicsEditorGroup\", \"surfaceHost\")",
  "setUnitCountersGroup: requireFunction(host, \"setUnitCountersGroup\", \"surfaceHost\")",
  "setSpecialZonesGroup: requireFunction(host, \"setSpecialZonesGroup\", \"surfaceHost\")",
  "setSpecialZoneEditorGroup: requireFunction(host, \"setSpecialZoneEditorGroup\", \"surfaceHost\")",
  "setHoverGroup: requireFunction(host, \"setHoverGroup\", \"surfaceHost\")",
  "setDevSelectionGroup: requireFunction(host, \"setDevSelectionGroup\", \"surfaceHost\")",
  "setInspectorHighlightGroup: requireFunction(host, \"setInspectorHighlightGroup\", \"surfaceHost\")",
  "setIntensityFieldPreviewGroup: requireFunction(host, \"setIntensityFieldPreviewGroup\", \"surfaceHost\")",
  "setInteractionRect: requireFunction(host, \"setInteractionRect\", \"surfaceHost\")",
  "mapContainer.querySelector(\"#map-svg\")",
  "createSvgElement(mapContainer)",
  "mapContainer.appendChild(nextMapSvg)",
  "applySvgRootProps(nextMapSvg)",
  "getRequiredD3Select(getD3)(mapSvg)",
  "selectOrAppend(svg, \"g.viewport-layer\", \"g\", \"viewport-layer\")",
  "selectOrAppend(svg, \"defs.strategic-overlay-defs\", \"defs\", \"strategic-overlay-defs\")",
  "selectOrAppend(svg, \"g.intensity-field-preview-layer\", \"g\", \"intensity-field-preview-layer\")",
  "svg.select(\"rect.interaction-layer\")",
  ".attr(\"fill\", \"transparent\")",
  ".lower();",
]);

const SVG_GROUP_ORDER_TOKENS = Object.freeze([
  "selector: \"g.frontline-overlay-layer\"",
  "selector: \"g.frontline-labels-layer\"",
  "selector: \"g.operational-lines-layer\"",
  "selector: \"g.operation-graphics-layer\"",
  "selector: \"g.operation-graphics-editor-layer\"",
  "selector: \"g.unit-counters-layer\"",
  "selector: \"g.special-zones-layer\"",
  "selector: \"g.special-zone-editor-layer\"",
  "selector: \"g.hover-layer\"",
  "selector: \"g.dev-selection-layer\"",
  "selector: \"g.inspector-highlight-layer\"",
]);

const MAP_RENDERER_WRAPPER_TOKENS = Object.freeze([
  "from \"./renderer/renderer_svg_surface_lifecycle_owner.js\";",
  "let rendererSvgSurfaceLifecycleOwner = null;",
  "function getRendererSvgSurfaceLifecycleOwner()",
  "createRendererSvgSurfaceLifecycleOwner({",
  "surfaceHost: rendererSurfaceHost",
  "getD3: () => globalThis.d3",
  "createSvgElement,",
  "const { mapSvg } = getRendererSvgSurfaceLifecycleOwner().ensureSvgSurface();",
  "const svg = globalThis.d3.select(mapSvg);",
  "svg.select(\"g.legend-group\").remove();",
  "ensureLegendControlElement();",
]);

const ENSURE_HYBRID_LAYERS_FORBIDDEN_TOKENS = Object.freeze([
  "let nextMapSvg = rendererSurfaceHost.getMapContainer().querySelector(\"#map-svg\");",
  "nextMapSvg = createSvgElement();",
  "rendererSurfaceHost.getMapContainer().appendChild(nextMapSvg);",
  "rendererSurfaceHost.setMapSvg(nextMapSvg);",
  "let nextViewportGroup = svg.select(\"g.viewport-layer\");",
  "rendererSurfaceHost.setViewportGroup(nextViewportGroup);",
  "let nextStrategicDefs = svg.select(\"defs.strategic-overlay-defs\");",
  "rendererSurfaceHost.setStrategicDefs(nextStrategicDefs);",
  "rendererSurfaceHost.setFrontlineOverlayGroup(nextFrontlineOverlayGroup);",
  "rendererSurfaceHost.setOperationGraphicsEditorGroup(nextOperationGraphicsEditorGroup);",
  "rendererSurfaceHost.setIntensityFieldPreviewGroup(nextIntensityFieldPreviewGroup);",
  "let nextInteractionRect = svg.select(\"rect.interaction-layer\");",
  "rendererSurfaceHost.setInteractionRect(nextInteractionRect);",
]);

const LEGEND_AND_LEGACY_TOKENS = Object.freeze([
  "const legacySpecialZones = document.getElementById(\"specialZonesSvg\");",
  "if (legacySpecialZones) legacySpecialZones.remove();",
  "const legacyLegend = document.getElementById(\"legendSvg\");",
  "if (legacyLegend) legacyLegend.remove();",
  "const legacyColorCanvas = document.getElementById(\"colorCanvas\");",
  "const legacyLineCanvas = document.getElementById(\"lineCanvas\");",
  "legacyColorCanvas.style.display = \"none\";",
  "legacyLineCanvas.style.display = \"none\";",
  "svg.select(\"g.legend-group\").remove();",
  "ensureLegendControlElement();",
]);

const SVG_LIFECYCLE_TOKENS = Object.freeze([
  "map-svg",
  "viewport-layer",
  "strategic-overlay-defs",
  "frontline-overlay-layer",
  "frontline-labels-layer",
  "operational-lines-layer",
  "operation-graphics-layer",
  "operation-graphics-editor-layer",
  "unit-counters-layer",
  "special-zones-layer",
  "special-zone-editor-layer",
  "hover-layer",
  "dev-selection-layer",
  "inspector-highlight-layer",
  "intensity-field-preview-layer",
  "interaction-layer",
  "setMapSvg",
  "setViewportGroup",
  "setStrategicDefs",
  "setInteractionRect",
]);

const SURFACE_LIFECYCLE_REQUIRED_TOKENS = Object.freeze([
  "export function createRendererSurfaceLifecycleOwner({",
  "function resolveDomHandles({",
  "function ensureCanvasLayerHandles({",
  "function ensureHitCanvasHandle()",
  "function acquireCanvasContexts()",
  "setContext",
  "setHitContext",
]);

const PROJECTION_PATH_REQUIRED_TOKENS = Object.freeze([
  "export function createRendererProjectionPathOwner({",
  "function initializeProjectionPaths()",
  "setProjection",
  "setPathSvg",
  "setPathCanvas",
  "setPathHitCanvas",
  "geoEqualEarth",
  "geoPath",
]);

const RENDER_SEMANTIC_ANCHORS = Object.freeze([
  "function renderFrontlineOverlay()",
  "function renderOperationalLinesIfNeeded({ force = false } = {})",
  "function renderOperationGraphicsIfNeeded({ force = false } = {})",
  "function renderUnitCountersIfNeeded({ force = false } = {})",
  "function renderSpecialZonesIfNeeded({ force = false } = {})",
  "function renderDevSelectionOverlayIfNeeded({ force = false } = {})",
  "function renderInspectorHighlightOverlayIfNeeded({ force = false } = {})",
  "function renderHoverOverlayIfNeeded({ force = false, eventType = \"hover\" } = {})",
  "function drawCanvas()",
  "function renderPassToCache(",
  "async function buildHitCanvasAfterStartup({ keepReady = false, reason = \"startup-deferred-hit-canvas\" } = {})",
  "buildHitCanvas",
]);

const SVG_OWNER_FORBIDDEN_TOKENS = Object.freeze([
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
  "strategicOverlayRuntime",
  "renderFrontlineOverlay",
  "renderOperationalLinesIfNeeded",
  "renderOperationGraphicsIfNeeded",
  "renderUnitCountersIfNeeded",
  "renderSpecialZonesIfNeeded",
  "renderDevSelectionOverlayIfNeeded",
  "renderInspectorHighlightOverlayIfNeeded",
  "renderHoverOverlayIfNeeded",
  "geoEqualEarth",
  "geoPath",
  "fitProjection",
  "updateMap",
  "initZoom",
  "bindEvents",
  "renderLegend",
  "LegendManager",
]);

const P30_ALLOWED_TOKENS = Object.freeze([
  "P30 may add `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.",
  "P30 may move only SVG root and static group creation/registration.",
  "Preserve group ordering and interaction rect layering.",
  "Keep `js/core/map_renderer.js` as the composition root.",
  "Keep strategic overlay rendering and editor rendering outside the owner.",
]);

const P30_FORBIDDEN_TOKENS = Object.freeze([
  "`drawCanvas`.",
  "`renderPassToCache`.",
  "Hit canvas build.",
  "Selection/fill.",
  "Scenario refresh/chunk.",
  "Exact-after-settle.",
  "Strategic overlay runtime.",
  "Projection/path creation.",
  "`fitProjection`.",
  "`updateMap`.",
  "`initZoom` or `bindEvents`.",
  "Direct runtimeState writes.",
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

function assertIncludesInOrder(source, tokens, message) {
  let lastIndex = -1;
  for (const token of tokens) {
    const nextIndex = source.indexOf(token, lastIndex + 1);
    assert.notEqual(nextIndex, -1, `${message}: missing or out-of-order token ${JSON.stringify(token)}`);
    lastIndex = nextIndex;
  }
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

test("P30 introduces the SVG lifecycle owner file", () => {
  assert.equal(
    repoFileExists(SVG_SURFACE_OWNER_PATH),
    true,
    "P30 must add renderer_svg_surface_lifecycle_owner.js",
  );
  assert.equal(
    listProjectSourceFiles("js/core/renderer").includes(SVG_SURFACE_OWNER_PATH),
    true,
    "P30 must keep the SVG lifecycle owner under js/core/renderer",
  );
});

test("map_renderer keeps ensureHybridLayers as the orchestration wrapper", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const ensureHybridLayersSource = sliceBetween(rendererSource, "function ensureHybridLayers()", "function setCanvasSize({");

  assertIncludes(rendererSource, "function createSvgElement()", "map_renderer must keep SVG root factory injection");
  for (const token of MAP_RENDERER_WRAPPER_TOKENS) {
    assertIncludes(rendererSource, token, "map_renderer must keep SVG lifecycle owner wiring");
  }
  for (const token of LEGEND_AND_LEGACY_TOKENS) {
    assertIncludes(ensureHybridLayersSource, token, "ensureHybridLayers must preserve legend and legacy cleanup token");
  }
  for (const token of ENSURE_HYBRID_LAYERS_FORBIDDEN_TOKENS) {
    assertExcludes(ensureHybridLayersSource, token, "ensureHybridLayers must delegate raw SVG lifecycle work to the owner");
  }
});

test("SVG lifecycle owner owns static SVG root group ordering and registration", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_svg_surface_lifecycle_owner.js");

  for (const token of SVG_OWNER_REQUIRED_TOKENS) {
    assertIncludes(ownerSource, token, "SVG lifecycle owner must own mechanical SVG lifecycle token");
  }
  assertIncludesInOrder(
    ownerSource,
    SVG_GROUP_ORDER_TOKENS,
    "SVG lifecycle owner must preserve viewport group declaration order",
  );
});

test("surface and projection owners remain outside SVG surface lifecycle", () => {
  const surfaceOwnerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");
  const projectionOwnerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");

  for (const token of SURFACE_LIFECYCLE_REQUIRED_TOKENS) {
    assertIncludes(surfaceOwnerSource, token, "surface lifecycle owner must stay DOM/canvas/context only");
  }
  for (const token of PROJECTION_PATH_REQUIRED_TOKENS) {
    assertIncludes(projectionOwnerSource, token, "projection/path owner must stay projection/path only");
  }
  for (const token of SVG_LIFECYCLE_TOKENS) {
    assertExcludes(surfaceOwnerSource, token, "surface lifecycle owner must not own SVG lifecycle token");
    assertExcludes(projectionOwnerSource, token, "projection/path owner must not own SVG lifecycle token");
  }
});

test("render semantics remain outside the SVG lifecycle owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const surfaceOwnerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");
  const projectionOwnerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");
  const svgOwnerSource = readRepoFile("js", "core", "renderer", "renderer_svg_surface_lifecycle_owner.js");

  for (const token of RENDER_SEMANTIC_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current render semantic anchor during P30");
    assertExcludes(surfaceOwnerSource, token, "surface lifecycle owner must stay outside render semantics");
    assertExcludes(projectionOwnerSource, token, "projection/path owner must stay outside render semantics");
    assertExcludes(svgOwnerSource, token, "SVG lifecycle owner must stay outside render semantics");
  }
  for (const token of SVG_OWNER_FORBIDDEN_TOKENS) {
    assertExcludes(svgOwnerSource, token, "SVG lifecycle owner must avoid forbidden P30 region");
  }
});

test("SVG lifecycle owner keeps map_renderer import direction", () => {
  for (const sourcePath of listProjectSourceFiles("js/core/renderer").filter(isRendererOwnerPath)) {
    const source = readRepoFile(sourcePath);
    assert.equal(
      hasMapRendererImport(source),
      false,
      `${sourcePath} must not import js/core/map_renderer.js; map_renderer stays the composition root`,
    );
  }
});

test("P29 preflight document keeps P30 allowed first move and forbidden areas", () => {
  const docSource = readRepoFile("docs", "active", "renderer-svg-surface-lifecycle-preflight-20260629.md");

  for (const heading of REQUIRED_PREFLIGHT_HEADINGS) {
    assertIncludes(docSource, heading, "P29 preflight doc must keep required heading");
  }
  for (const token of P30_ALLOWED_TOKENS) {
    assertIncludes(docSource, token, "P29 doc must lock P30 allowed first move");
  }
  for (const token of P30_FORBIDDEN_TOKENS) {
    assertIncludes(docSource, token, "P29 doc must lock P30 forbidden area");
  }
});

test("package exposes SVG surface lifecycle scripts", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-svg-surface-lifecycle-owner\": \"node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs\"",
    "package.json must expose the P30 SVG surface lifecycle owner behavior test",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-svg-surface-lifecycle-inventory\": \"node --test tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the SVG surface lifecycle inventory test",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-svg-surface-lifecycle\": \"node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the combined SVG surface lifecycle suite",
  );
});
