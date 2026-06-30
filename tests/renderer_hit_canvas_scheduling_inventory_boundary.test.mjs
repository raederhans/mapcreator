import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DOC_PATH = "docs/active/renderer-hit-canvas-scheduling-preflight-20260630.md";
const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const SCENARIO_REFRESH_RUNTIME_PATH = "js/core/map_renderer/scenario_refresh_runtime.js";
const SPATIAL_INDEX_RUNTIME_OWNER_PATH = "js/core/renderer/spatial_index_runtime_owner.js";
const INTERACTION_HIT_CANDIDATES_PATH = "js/core/map_renderer/interaction_hit_candidates.js";
const MAP_INTERACTION_EVENT_BINDING_OWNER_PATH = "js/core/renderer/map_interaction_event_binding_owner.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";
const RENDER_LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";

const RUNTIME_STATE_TOKEN = ["runtime", "State"].join("");
const runtimeToken = (property) => `${RUNTIME_STATE_TOKEN}.${property}`;
const runtimeAssignmentToken = (property, expression) => `${runtimeToken(property)} ${expression}`;

const DOC_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current P42 renderer lifecycle baseline",
  "## Hit canvas build entry inventory",
  "## Hit canvas dirty and topology revision inventory",
  "## Hit canvas scheduling/cancel handle inventory",
  "## Deferred startup and interaction infrastructure boundary",
  "## Spatial index dependency boundary",
  "## Scenario refresh and chunk promotion boundary",
  "## Interaction hit candidate boundary",
  "## P45/P47 allowed first move",
  "## Forbidden areas",
  "## Required validation commands",
]);

const PUBLIC_FACADE_SOURCE = `// Stable app/UI facade for map_renderer.
// Internal bridge and core helper imports stay on ../map_renderer.js this round.
export {
  // App bootstrap and render lifecycle.
  buildInteractionInfrastructureAfterStartup,
  initMap,
  render,
  setMapData,

  // Selection and fill tools.
  addFeatureToDevSelection,
  applyDevMacroFillCurrentCountry,
  applyDevMacroFillCurrentOwnerScope,
  applyDevMacroFillCurrentParentGroup,
  applyDevSelectionFill,
  autoFillMap,
  clearDevSelection,
  removeLastDevSelection,
  toggleFeatureInDevSelection,

  // Strategic overlay editing.
  cancelActiveStrategicInteractionModes,
  cancelOperationGraphicDraw,
  cancelOperationalLineDraw,
  cancelSpecialZoneDraw,
  cancelUnitCounterPlacement,
  deleteSelectedManualSpecialZone,
  deleteSelectedOperationGraphic,
  deleteSelectedOperationGraphicVertex,
  deleteSelectedOperationalLine,
  deleteSelectedUnitCounter,
  finishOperationGraphicDraw,
  finishOperationalLineDraw,
  finishSpecialZoneDraw,
  selectOperationGraphicById,
  selectOperationalLineById,
  selectSpecialZoneById,
  selectUnitCounterById,
  startOperationGraphicDraw,
  startOperationalLineDraw,
  startSpecialZoneDraw,
  startUnitCounterPlacement,
  undoOperationGraphicVertex,
  undoOperationalLineVertex,
  undoSpecialZoneVertex,
  updateSelectedOperationGraphic,
  updateSelectedOperationalLine,
  updateSelectedUnitCounter,

  // Render invalidation and scenario/color refresh.
  invalidateAllRenderPasses,
  invalidateContextLayerVisualStateBatch,
  invalidateOceanBackgroundVisualState,
  invalidateOceanCoastalAccentVisualState,
  invalidateOceanVisualState,
  invalidateOceanWaterInteractionVisualState,
  recomputeDynamicBordersNow,
  reconcileDetailPromotionPoliticalPass,
  refreshColorState,
  refreshResolvedColorsForFeatures,
  scheduleDynamicBorderRecompute,
  setInspectorFeatureHighlight,

  // Render products and diagnostics.
  getBathymetryPresetStyleDefaults,
  getEffectiveCityCollection,
  getWaterRegionColor,
  rebuildStaticMeshes,
  renderExportPassesToCanvas,
  renderLegend,
  RENDER_PASS_NAMES,

  // Viewport.
  getZoomPercent,
  resetZoomToFit,
  setDebugMode,
  setZoomPercent,
  zoomByStep,
} from "../map_renderer.js";
`;

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

function listRepoSourceFiles(rootRelativePath) {
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

function countToken(source, token) {
  return source.split(token).length - 1;
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

function hasMapRendererImport(source) {
  return /from\s+["'][^"']*map_renderer\.js["']/.test(source)
    || /import\s+["'][^"']*map_renderer\.js["']\s*;?/.test(source)
    || /import\s*\(\s*["'][^"']*map_renderer\.js["']\s*\)/.test(source);
}

function hasHitCanvasOwnerImport(source) {
  const importPattern = /\bfrom\s+["']([^"']+)["']|import\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  return Array.from(source.matchAll(importPattern)).some((match) => {
    const specifier = match[1] || match[2] || match[3] || "";
    return specifier.toLowerCase().replace(/[_/-]/g, "").includes("hitcanvas");
  });
}

function isForbiddenHitCanvasOwnerPath(sourcePath) {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (!normalized.startsWith("js/core/")) {
    return false;
  }
  const baseName = path.basename(normalized);
  if (!/\.m?js$/.test(baseName)) {
    return false;
  }
  const stem = baseName.replace(/\.m?js$/, "");
  return stem.toLowerCase().replace(/[_-]/g, "").includes("hitcanvas");
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("hit canvas scheduling preflight doc exists and locks required headings", () => {
  const docSource = readRepoFile(...DOC_PATH.split("/"));

  for (const heading of DOC_HEADINGS) {
    assertIncludes(docSource, heading, "preflight doc must keep required heading");
  }
  for (const token of [
    "This preflight is docs, tests, and tooling only.",
    "No production runtime edits in `js/core/map_renderer.js`.",
    "No `hit_canvas_*` owner, helper, controller, or scheduler.",
    "No migration of `buildHitCanvasAfterStartup`.",
    "Recommended next implementation: hit canvas scheduling owner.",
    "any new production `js/core/**` module whose filename contains `hit_canvas` or `hitCanvas`",
    "Keep `drawHitCanvas()`, `drawHitCanvasWithMetric()`, `recordDeferredFullHitCanvasMetric()`, `buildHitCanvasAfterStartup()`, point probe, dirty-source writes, and topology revision writes in `map_renderer.js`.",
  ]) {
    assertIncludes(docSource, token, "preflight doc must lock scheduling boundary");
  }
});

test("map_renderer keeps hit canvas build and scheduling anchors", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));

  for (const token of [
    "function drawHitCanvas()",
    "function drawHitCanvasWithMetric(details = {})",
    "function recordDeferredFullHitCanvasMetric({ reason = \"deferred-full\", keepReady = false } = {})",
    "async function buildHitCanvasAfterStartup({ keepReady = false, reason = \"startup-deferred-hit-canvas\" } = {})",
    "function scheduleHitCanvasBuildIfNeeded({ reason = \"idle-render\" } = {})",
    "function ensureHitCanvasUpToDate({ force = false } = {})",
    "function isHitCanvasCurrent()",
    "function getDirtyHitCanvasPointProbeHit(event)",
    "function getValidatedCanvasHit(event, strictIds = null, { forceBuild = false } = {})",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep hit canvas anchor");
  }
  assert.equal(countToken(rendererSource, "scheduleHitCanvasBuildIfNeeded"), 8);
  assert.equal(countToken(rendererSource, "buildHitCanvasAfterStartup"), 3);
});

test("map_renderer keeps current hit canvas dirty topology and scheduling handle tokens", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));

  assert.equal(countToken(rendererSource, runtimeToken("hitCanvasDirty")), 24);
  assert.equal(countToken(rendererSource, runtimeToken("hitCanvasTopologyRevision")), 6);
  assert.equal(countToken(rendererSource, runtimeToken("hitCanvasBuildScheduled")), 9);
  for (const token of [
    runtimeAssignmentToken("hitCanvasDirty", "= true;"),
    runtimeAssignmentToken("hitCanvasDirty", "= false;"),
    runtimeAssignmentToken("hitCanvasDirty", "= Boolean(dirty);"),
    runtimeAssignmentToken("hitCanvasTopologyRevision", "= 0;"),
    runtimeAssignmentToken("hitCanvasTopologyRevision", "= Number(runtimeState.topologyRevision || 0);"),
    runtimeAssignmentToken("hitCanvasBuildScheduled", "= scheduleDeferredWork(() => {"),
    runtimeAssignmentToken("hitCanvasBuildScheduled", "= null;"),
    "cancelDeferredWork(" + runtimeToken("hitCanvasBuildScheduled") + ")",
    "function markRendererTopologyChanged({ hitCanvasDirty = false } = {})",
    "function resetRendererTransactionState({",
    "hitCanvasDirty = false,",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep current hit canvas state token");
  }
  assert.equal(countToken(rendererSource, "cancelDeferredWork(" + runtimeToken("hitCanvasBuildScheduled") + ")"), 2);

  const scheduleSource = sliceBetween(
    rendererSource,
    "function scheduleHitCanvasBuildIfNeeded({ reason = \"idle-render\" } = {})",
    "function ensureHitCanvasUpToDate({ force = false } = {})",
  );
  assertIncludes(scheduleSource, "if (!rendererSurfaceHost.getHitContext() || !rendererSurfaceHost.getPathHitCanvas() || !" + runtimeToken("hitCanvasDirty") + ") return false;", "schedule wrapper must keep context/path/dirty guard");
  assertIncludes(scheduleSource, "if (" + runtimeToken("hitCanvasBuildScheduled") + ") {", "schedule wrapper must keep duplicate handle guard");
  assertIncludes(scheduleSource, "drawHitCanvasWithMetric({", "schedule wrapper must keep existing build callback");

  const resetSource = sliceBetween(
    rendererSource,
    "function resetRendererRefreshTransactionState({",
    "scenarioRefreshRuntime = createScenarioRefreshRuntime({",
  );
  assertIncludes(resetSource, "cancelDeferredWork(" + runtimeToken("hitCanvasBuildScheduled") + ");", "reset path must cancel scheduled hit canvas work");
  assertIncludes(resetSource, runtimeAssignmentToken("hitCanvasBuildScheduled", "= null;"), "reset path must clear scheduled hit canvas handle");
});

test("scenario refresh runtime receives scheduling by injection and keeps current topology reset", () => {
  const runtimeSource = readRepoFile(...SCENARIO_REFRESH_RUNTIME_PATH.split("/"));

  for (const token of [
    "setInteractionInfrastructureState, scheduleSecondarySpatialIndexBuild, scheduleHitCanvasBuildIfNeeded,",
    "scheduleHitCanvasBuildIfNeeded({",
    "resetRendererTransactionState({ hitCanvasDirty: true })",
    runtimeAssignmentToken("hitCanvasTopologyRevision", "= 0;"),
  ]) {
    assertIncludes(runtimeSource, token, "scenario refresh runtime must keep injected hit canvas scheduling boundary");
  }
  assert.equal(countToken(runtimeSource, "scheduleHitCanvasBuildIfNeeded"), 3);
  assert.equal(countToken(runtimeSource, runtimeToken("hitCanvasTopologyRevision")), 1);
  assert.equal(hasHitCanvasOwnerImport(runtimeSource), false, "scenario refresh runtime must not import hit canvas modules");
  for (const token of [
    "buildHitCanvasAfterStartup",
    "drawHitCanvas",
    runtimeToken("hitCanvasBuildScheduled"),
  ]) {
    assertExcludes(runtimeSource, token, "scenario refresh runtime must avoid direct hit canvas build/scheduling ownership");
  }
});

test("spatial index owner can mark dirty but cannot own hit canvas scheduling", () => {
  const ownerSource = readRepoFile(...SPATIAL_INDEX_RUNTIME_OWNER_PATH.split("/"));

  assert.equal(hasMapRendererImport(ownerSource), false, "spatial index runtime owner must not import map_renderer");
  assert.equal(countToken(ownerSource, "state.hitCanvasDirty"), 2);
  for (const token of [
    "scheduleHitCanvasBuildIfNeeded",
    "buildHitCanvasAfterStartup",
    "drawHitCanvas",
    "hitCanvasBuildScheduled",
    "hit_canvas",
  ]) {
    assertExcludes(ownerSource, token, "spatial index runtime owner must avoid hit canvas scheduling/build ownership");
  }
});

test("interaction hit candidates and event binding stay outside hit canvas build ownership", () => {
  const candidateSource = readRepoFile(...INTERACTION_HIT_CANDIDATES_PATH.split("/"));
  const eventBindingSource = readRepoFile(...MAP_INTERACTION_EVENT_BINDING_OWNER_PATH.split("/"));

  for (const token of [
    "function collectSpatialGridCandidates",
    "function rankCandidates",
    "function findFirstContainingCandidate",
    "function toHitResult",
    "function shouldPreferWaterHit",
    "export {",
    "  collectSpatialGridCandidates,",
    "  rankCandidates,",
    "  findFirstContainingCandidate,",
    "  toHitResult,",
    "  shouldPreferWaterHit,",
  ]) {
    assertIncludes(candidateSource, token, "interaction hit candidates must keep pure candidate helper export");
  }
  for (const [label, source] of [
    ["interaction hit candidates", candidateSource],
    ["map interaction event binding owner", eventBindingSource],
  ]) {
    assert.equal(hasMapRendererImport(source), false, `${label} must not import map_renderer`);
    assert.equal(hasHitCanvasOwnerImport(source), false, `${label} must not import hit canvas owner/helper/controller`);
    for (const token of [
      "buildHitCanvasAfterStartup",
      "drawHitCanvas",
      "scheduleHitCanvasBuildIfNeeded",
      "hitCanvasBuildScheduled",
      "hitCanvasTopologyRevision",
    ]) {
      assertExcludes(source, token, `${label} must avoid hit canvas build/scheduling token`);
    }
  }
  assertExcludes(candidateSource, "runtimeState", "interaction hit candidates must stay pure");
});

test("production hit canvas owner helper controller and broad render lifecycle owner stay absent", () => {
  assert.equal(repoFileExists(RENDER_LIFECYCLE_OWNER_PATH), false, "broad render lifecycle owner must stay absent");
  for (const sourcePath of listRepoSourceFiles("js/core")) {
    assert.equal(
      isForbiddenHitCanvasOwnerPath(sourcePath),
      false,
      `preflight must not add production hit canvas owner/helper/controller/scheduler: ${sourcePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/map_renderer/hit_canvas.js",
    "js/core/map_renderer/hit_canvas_scheduling_owner.js",
    "js/core/map_renderer/hit_canvas_schedule_owner.js",
    "js/core/map_renderer/hit_canvas_owner.mjs",
    "js/core/renderer/renderer_hit_canvas_helper.js",
    "js/core/renderer/hitCanvasDiagnostics.js",
    "js/core/renderer/shared_hit_canvas_controller.js",
    "js/core/renderer/hit_canvas_scheduler.js",
  ]) {
    assert.equal(
      isForbiddenHitCanvasOwnerPath(fixturePath),
      true,
      `hit canvas owner detector must catch forbidden production path: ${fixturePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/renderer/canvas_color_helpers.js",
    "js/core/map_renderer/interaction_hit_candidates.js",
    "js/core/renderer/renderer_surface_lifecycle_owner.js",
    "js/core/renderer/spatial_index_runtime_owner.js",
  ]) {
    assert.equal(
      isForbiddenHitCanvasOwnerPath(fixturePath),
      false,
      `hit canvas owner detector must allow existing non-hit-canvas owner path: ${fixturePath}`,
    );
  }
});

test("public facade and state-write allowlist remain closed to hit canvas owners", () => {
  const publicFacadeSource = readRepoFile(...PUBLIC_FACADE_PATH.split("/"));
  const stateWriteAllowlistSource = readRepoFile(...STATE_WRITE_ALLOWLIST_PATH.split("/"));

  assert.equal(
    publicFacadeSource.replace(/\r\n/g, "\n"),
    PUBLIC_FACADE_SOURCE,
    "public facade text content must remain unchanged for this preflight",
  );
  for (const token of [
    "render,",
    "setMapData,",
    "initMap,",
    "RENDER_PASS_NAMES,",
    "from \"../map_renderer.js\";",
  ]) {
    assertIncludes(publicFacadeSource, token, "public facade must keep existing export bridge");
  }
  for (const token of [
    "hit_canvas",
    "hitCanvasScheduling",
    "renderer_render_lifecycle_owner",
    "render_lifecycle_owner",
  ]) {
    assertExcludes(publicFacadeSource, token, "public facade must not expose preflight-only owner");
    assertExcludes(stateWriteAllowlistSource, token, "state-write allowlist must not add preflight-only owner");
  }
});

test("package exposes hit canvas scheduling inventory script", () => {
  const packageSource = readRepoFile("package.json");

  assertIncludes(
    packageSource,
    "\"test:node:renderer-hit-canvas-scheduling-inventory\": \"node --test tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs\"",
    "package.json must expose the hit canvas scheduling inventory test",
  );
});
