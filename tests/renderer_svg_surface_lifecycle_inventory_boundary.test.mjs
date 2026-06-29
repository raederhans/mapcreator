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

const ENSURE_HYBRID_LAYERS_ROOT_TOKENS = Object.freeze([
  "function ensureHybridLayers()",
  "const legacySpecialZones = document.getElementById(\"specialZonesSvg\");",
  "const legacyLegend = document.getElementById(\"legendSvg\");",
  "const legacyColorCanvas = document.getElementById(\"colorCanvas\");",
  "const legacyLineCanvas = document.getElementById(\"lineCanvas\");",
  "getRendererSurfaceLifecycleOwner().ensureCanvasLayerHandles({",
  "let nextMapSvg = rendererSurfaceHost.getMapContainer().querySelector(\"#map-svg\");",
  "nextMapSvg = createSvgElement();",
  "rendererSurfaceHost.getMapContainer().appendChild(nextMapSvg);",
  "rendererSurfaceHost.setMapSvg(nextMapSvg);",
  "const svg = globalThis.d3.select(nextMapSvg);",
  "let nextViewportGroup = svg.select(\"g.viewport-layer\");",
  "rendererSurfaceHost.setViewportGroup(nextViewportGroup);",
  "let nextStrategicDefs = svg.select(\"defs.strategic-overlay-defs\");",
  "rendererSurfaceHost.setStrategicDefs(nextStrategicDefs);",
]);

const SVG_GROUP_ORDER_TOKENS = Object.freeze([
  "nextViewportGroup = svg.append(\"g\").attr(\"class\", \"viewport-layer\");",
  "nextStrategicDefs = svg.append(\"defs\").attr(\"class\", \"strategic-overlay-defs\");",
  "nextFrontlineOverlayGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"frontline-overlay-layer\");",
  "nextFrontlineLabelsGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"frontline-labels-layer\");",
  "nextOperationalLinesGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"operational-lines-layer\");",
  "nextOperationGraphicsGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"operation-graphics-layer\");",
  "nextOperationGraphicsEditorGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"operation-graphics-editor-layer\");",
  "nextUnitCountersGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"unit-counters-layer\");",
  "nextSpecialZonesGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"special-zones-layer\");",
  "nextSpecialZoneEditorGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"special-zone-editor-layer\");",
  "nextHoverGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"hover-layer\");",
  "nextDevSelectionGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"dev-selection-layer\");",
  "nextInspectorHighlightGroup = nextViewportGroup.append(\"g\").attr(\"class\", \"inspector-highlight-layer\");",
  "nextIntensityFieldPreviewGroup = svg.append(\"g\").attr(\"class\", \"intensity-field-preview-layer\");",
  "let nextInteractionRect = svg.select(\"rect.interaction-layer\");",
]);

const SVG_GROUP_REGISTRATION_TOKENS = Object.freeze([
  "rendererSurfaceHost.setFrontlineOverlayGroup(nextFrontlineOverlayGroup);",
  "rendererSurfaceHost.setFrontlineLabelsGroup(nextFrontlineLabelsGroup);",
  "rendererSurfaceHost.setOperationalLinesGroup(nextOperationalLinesGroup);",
  "rendererSurfaceHost.setOperationGraphicsGroup(nextOperationGraphicsGroup);",
  "rendererSurfaceHost.setOperationGraphicsEditorGroup(nextOperationGraphicsEditorGroup);",
  "rendererSurfaceHost.setUnitCountersGroup(nextUnitCountersGroup);",
  "rendererSurfaceHost.setSpecialZonesGroup(nextSpecialZonesGroup);",
  "rendererSurfaceHost.setSpecialZoneEditorGroup(nextSpecialZoneEditorGroup);",
  "rendererSurfaceHost.setHoverGroup(nextHoverGroup);",
  "rendererSurfaceHost.setDevSelectionGroup(nextDevSelectionGroup);",
  "rendererSurfaceHost.setInspectorHighlightGroup(nextInspectorHighlightGroup);",
  "rendererSurfaceHost.setIntensityFieldPreviewGroup(nextIntensityFieldPreviewGroup);",
  "rendererSurfaceHost.setInteractionRect(nextInteractionRect);",
]);

const INTERACTION_RECT_TOKENS = Object.freeze([
  "let nextInteractionRect = svg.select(\"rect.interaction-layer\");",
  ".append(\"rect\")",
  ".attr(\"class\", \"interaction-layer\")",
  ".attr(\"fill\", \"transparent\")",
  "rendererSurfaceHost.setInteractionRect(nextInteractionRect);",
  ".style(\"pointer-events\", \"all\")",
  "Keep the global hit surface behind editor overlays so midpoint/vertex handles can win hit-testing.",
  ".lower();",
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
  "createSvgElement",
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

test("P29 reserves the future SVG lifecycle owner file", () => {
  assert.equal(
    repoFileExists(SVG_SURFACE_OWNER_PATH),
    false,
    "P29 must keep renderer_svg_surface_lifecycle_owner.js reserved for P30",
  );
  assert.equal(
    listProjectSourceFiles("js/core/renderer").includes(SVG_SURFACE_OWNER_PATH),
    false,
    "P29 must not add the future SVG lifecycle owner implementation",
  );
});

test("map_renderer still owns ensureHybridLayers and SVG root lifecycle", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const ensureHybridLayersSource = sliceBetween(rendererSource, "function ensureHybridLayers()", "function setCanvasSize({");

  assertIncludes(rendererSource, "function createSvgElement()", "map_renderer must keep current SVG root factory");
  for (const token of ENSURE_HYBRID_LAYERS_ROOT_TOKENS) {
    assertIncludes(ensureHybridLayersSource, token, "ensureHybridLayers must keep current SVG root lifecycle token");
  }
});

test("ensureHybridLayers still owns static SVG group ordering and registration", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const ensureHybridLayersSource = sliceBetween(rendererSource, "function ensureHybridLayers()", "function setCanvasSize({");

  assertIncludesInOrder(
    ensureHybridLayersSource,
    SVG_GROUP_ORDER_TOKENS,
    "ensureHybridLayers must preserve current SVG group creation order",
  );
  for (const token of SVG_GROUP_REGISTRATION_TOKENS) {
    assertIncludes(ensureHybridLayersSource, token, "ensureHybridLayers must register SVG handles into rendererSurfaceHost");
  }
});

test("ensureHybridLayers keeps interaction rect layering and legacy cleanup", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const ensureHybridLayersSource = sliceBetween(rendererSource, "function ensureHybridLayers()", "function setCanvasSize({");

  for (const token of INTERACTION_RECT_TOKENS) {
    assertIncludes(ensureHybridLayersSource, token, "ensureHybridLayers must preserve interaction rect layering token");
  }
  for (const token of LEGEND_AND_LEGACY_TOKENS) {
    assertIncludes(ensureHybridLayersSource, token, "ensureHybridLayers must preserve legend and legacy cleanup token");
  }
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

test("render semantics remain outside the SVG lifecycle preflight", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const surfaceOwnerSource = readRepoFile("js", "core", "renderer", "renderer_surface_lifecycle_owner.js");
  const projectionOwnerSource = readRepoFile("js", "core", "renderer", "renderer_projection_path_owner.js");

  for (const token of RENDER_SEMANTIC_ANCHORS) {
    assertIncludes(rendererSource, token, "map_renderer must keep current render semantic anchor during P29");
    assertExcludes(surfaceOwnerSource, token, "surface lifecycle owner must stay outside render semantics");
    assertExcludes(projectionOwnerSource, token, "projection/path owner must stay outside render semantics");
  }
});

test("future SVG lifecycle owner must keep map_renderer import direction", () => {
  for (const sourcePath of listProjectSourceFiles("js/core/renderer").filter(isRendererOwnerPath)) {
    const source = readRepoFile(sourcePath);
    assert.equal(
      hasMapRendererImport(source),
      false,
      `${sourcePath} must not import js/core/map_renderer.js; map_renderer stays the composition root`,
    );
  }
});

test("P29 preflight document locks P30 allowed first move and forbidden areas", () => {
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

test("package exposes SVG surface lifecycle inventory script", () => {
  const packageSource = readRepoFile("package.json");
  assertIncludes(
    packageSource,
    "\"test:node:renderer-svg-surface-lifecycle-inventory\": \"node --test tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the P29 SVG surface lifecycle inventory test",
  );
});
