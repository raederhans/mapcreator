import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const OWNER_PATH = "js/core/map_renderer/hit_canvas_scheduling_owner.js";
const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const RESET_OWNER_PATH = "js/core/map_renderer/renderer_transaction_reset_owner.js";
const DOC_PATH = "docs/active/renderer-hit-canvas-scheduling-owner-p47-20260701.md";
const SCENARIO_REFRESH_RUNTIME_PATH = "js/core/map_renderer/scenario_refresh_runtime.js";
const SPATIAL_INDEX_RUNTIME_OWNER_PATH = "js/core/renderer/spatial_index_runtime_owner.js";
const INTERACTION_HIT_CANDIDATES_PATH = "js/core/map_renderer/interaction_hit_candidates.js";
const MAP_INTERACTION_EVENT_BINDING_OWNER_PATH = "js/core/renderer/map_interaction_event_binding_owner.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";
const OWNER_DIST_PATH = "dist/app/js/core/map_renderer/hit_canvas_scheduling_owner.js";

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function listRepoFiles(relativeDir) {
  const root = path.join(REPO_ROOT, relativeDir);
  const results = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        results.push(path.relative(REPO_ROOT, absolute).replaceAll("\\", "/"));
      }
    }
  };
  visit(root);
  return results;
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing start marker ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing end marker ${endMarker}`);
  return source.slice(start, end);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

function stateWriteToken(member, value) {
  return `runtimeState.${member}` + ` = ${value}`;
}

function hasHitCanvasOwnerImport(source) {
  const importPattern = /\bfrom\s+["']([^"']+)["']|import\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  return Array.from(source.matchAll(importPattern)).some((match) => {
    const specifier = match[1] || match[2] || match[3] || "";
    return specifier.toLowerCase().replace(/[_/-]/g, "").includes("hitcanvas");
  });
}

function hasMapRendererImport(source) {
  return /from\s+["'][^"']*map_renderer\.js["']/.test(source)
    || /import\s+["'][^"']*map_renderer\.js["']\s*;?/.test(source)
    || /import\s*\(\s*["'][^"']*map_renderer\.js["']\s*\)/.test(source);
}

function gitDiffNames(paths) {
  return execFileSync("git", ["diff", "--name-only", "--", ...paths], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim().split(/\r?\n/).filter(Boolean).map((name) => name.replaceAll("\\", "/"));
}

test("P47 active doc locks the unique scheduling owner boundary", () => {
  const docSource = readRepoFile(...DOC_PATH.split("/"));

  for (const token of [
    "Move only the hit canvas deferred scheduling and scheduled-handle cancellation lifecycle",
    "The only production extraction is the scheduling owner.",
    "The wrapper preserves the existing boolean behavior: it returns `false` after scheduling",
    "mode: \"deferred\"",
    "activeScenarioId: String(runtimeState.activeScenarioId || \"\")",
    "Replace the preflight rule that forbids all production `hit_canvas` files with a unique-owner rule",
    "Prefer behavior assertions and narrow owner-path assertions over broad brittle source-token counts.",
  ]) {
    assertIncludes(docSource, token, "P47 doc must lock scheduling owner boundary");
  }
});

test("owner file declares only scheduling dependencies and frozen summaries", () => {
  const ownerSource = readRepoFile(...OWNER_PATH.split("/"));

  for (const token of [
    "export function createHitCanvasSchedulingOwner",
    "const REQUIRED_EFFECT_NAMES = Object.freeze([",
    "\"scheduleDeferredWork\"",
    "\"cancelDeferredWork\"",
    "\"setScheduledHitCanvasBuildHandle\"",
    "\"runScheduledHitCanvasBuild\"",
    "const REQUIRED_GETTER_NAMES = Object.freeze([",
    "\"hasHitCanvasRuntime\"",
    "\"isHitCanvasDirty\"",
    "\"isHitCanvasBuildDeferred\"",
    "\"getRenderPhase\"",
    "\"getScheduledHitCanvasBuildHandle\"",
    "\"getActiveScenarioId\"",
    "mode: \"deferred\"",
    "activeScenarioId: String(getterApi.getActiveScenarioId() || \"\")",
    "return Object.freeze({",
  ]) {
    assertIncludes(ownerSource, token, "owner must expose P47 dependency contract");
  }
  for (const token of [
    "runtimeState",
    "rendererSurfaceHost",
    "drawHitCanvas",
    "drawHitCanvasWithMetric",
    "recordDeferredFullHitCanvasMetric",
    "buildHitCanvasAfterStartup",
    "getDirtyHitCanvasPointProbeHit",
    "hitCanvasTopologyRevision",
    "from \"../map_renderer.js\"",
    "from \"./map_renderer.js\"",
  ]) {
    assertExcludes(ownerSource, token, "owner must stay outside renderer bodies");
  }
});

test("map_renderer wrapper delegates scheduling while keeping old false return", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));
  const ownerFactorySource = sliceBetween(
    rendererSource,
    "function getHitCanvasSchedulingOwner()",
    "function getRendererTransactionResetOwner()",
  );

  assertIncludes(
    rendererSource,
    "import { createHitCanvasSchedulingOwner } from \"./map_renderer/hit_canvas_scheduling_owner.js\";",
    "map_renderer must import the scheduling owner",
  );
  assertIncludes(rendererSource, "let hitCanvasSchedulingOwner = null;", "map_renderer must keep owner singleton");
  assertIncludes(rendererSource, "function getHitCanvasSchedulingOwner()", "map_renderer must expose owner factory");
  for (const token of [
    "idleTimeoutMs: STAGED_HIT_CANVAS_TIMEOUT_MS,",
    "scheduleDeferredWork,",
    "cancelDeferredWork,",
    "setScheduledHitCanvasBuildHandle: (handle) => {",
    "setHitCanvasBuildScheduledState(runtimeState, handle)",
    "runScheduledHitCanvasBuild: (details) => drawScheduledHitCanvasWithMetric(details)",
  ]) {
    assertIncludes(ownerFactorySource, token, "map_renderer must inject scheduling owner dependency");
  }
  assertIncludes(rendererSource, "function drawScheduledHitCanvasWithMetric(details = {})", "map_renderer must keep scheduled draw body");
  assertIncludes(rendererSource, "mode: \"deferred\"", "map_renderer must keep deferred draw mode");


  const wrapperSource = sliceBetween(
    rendererSource,
    "function scheduleHitCanvasBuildIfNeeded({ reason = \"idle-render\" } = {})",
    "function ensureHitCanvasUpToDate({ force = false } = {})",
  );
  assertIncludes(
    wrapperSource,
    "getHitCanvasSchedulingOwner().scheduleHitCanvasBuildIfNeeded({ reason });",
    "wrapper must delegate to owner",
  );
  assertIncludes(wrapperSource, "return false;", "wrapper must preserve old falsy return");
  assertExcludes(wrapperSource, "scheduleDeferredWork(() =>", "wrapper must not own scheduled callback body");
  assertExcludes(wrapperSource, "drawHitCanvasWithMetric({", "wrapper must not own draw metric body");
});

test("forced validation and reset cancellation go through the scheduling owner", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));
  const resetOwnerSource = readRepoFile(...RESET_OWNER_PATH.split("/"));
  const forcedSource = sliceBetween(
    rendererSource,
    "function ensureHitCanvasUpToDate({ force = false } = {})",
    "function isHitCanvasCurrent()",
  );
  const forcedCancelIndex = forcedSource.indexOf(`getHitCanvasSchedulingOwner().cancelScheduledHitCanvasBuild({ reason: "strict-validation" });`);
  const forcedDrawIndex = forcedSource.indexOf("drawHitCanvasWithMetric({");
  assert.ok(forcedCancelIndex >= 0, "forced validation must cancel through owner");
  assert.ok(forcedDrawIndex > forcedCancelIndex, "forced validation must cancel before draw");

  const resetFactorySource = sliceBetween(
    rendererSource,
    "function getRendererTransactionResetOwner()",
    "function getMapHoverInteractionOwner()",
  );
  assertIncludes(
    resetFactorySource,
    "getHitCanvasSchedulingOwner().cancelScheduledHitCanvasBuild(options)",
    "refresh reset must route cancellation through owner",
  );
  assertIncludes(
    resetOwnerSource,
    "reason: REFRESH_RESET_REASON",
    "refresh reset must preserve cancellation reason",
  );
  assertExcludes(
    rendererSource,
    "cancelDeferredWork(runtimeState.hitCanvasBuildScheduled)",
    "map_renderer must not directly cancel hit canvas scheduled handle after P47",
  );
});

test("map_renderer keeps draw build probe dirty and topology bodies", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));

  for (const token of [
    "function drawHitCanvas()",
    "function drawHitCanvasWithMetric(details = {})",
    "function recordDeferredFullHitCanvasMetric({ reason = \"deferred-full\", keepReady = false } = {})",
    "async function buildHitCanvasAfterStartup({ keepReady = false, reason = \"startup-deferred-hit-canvas\" } = {})",
    "function ensureHitCanvasUpToDate({ force = false } = {})",
    "function isHitCanvasCurrent()",
    "function getDirtyHitCanvasPointProbeHit(event)",
    "function getValidatedCanvasHit(event, strictIds = null, { forceBuild = false } = {})",
    stateWriteToken("hitCanvasDirty", "true;"),
    stateWriteToken("hitCanvasDirty", "false;"),
    stateWriteToken("hitCanvasTopologyRevision", "Number(runtimeState.topologyRevision || 0);"),
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep hit canvas body token");
  }
});

test("scenario refresh keeps injected scheduling boundary", () => {
  const runtimeSource = readRepoFile(...SCENARIO_REFRESH_RUNTIME_PATH.split("/"));

  assertIncludes(
    runtimeSource,
    "setInteractionInfrastructureState, scheduleSecondarySpatialIndexBuild, scheduleHitCanvasBuildIfNeeded,",
    "scenario refresh runtime must receive schedule wrapper by injection",
  );
  assertIncludes(runtimeSource, "scheduleHitCanvasBuildIfNeeded({", "scenario refresh runtime must keep injected calls");
  assert.equal(hasHitCanvasOwnerImport(runtimeSource), false, "scenario refresh runtime must not import hit canvas owner");
  for (const token of [
    "buildHitCanvasAfterStartup",
    "drawHitCanvas",
    "runtimeState.hitCanvasBuildScheduled",
  ]) {
    assertExcludes(runtimeSource, token, "scenario refresh runtime must avoid hit canvas body ownership");
  }
});

test("spatial and interaction modules stay outside scheduling ownership", () => {
  for (const [relativePath, source] of [
    [SPATIAL_INDEX_RUNTIME_OWNER_PATH, readRepoFile(...SPATIAL_INDEX_RUNTIME_OWNER_PATH.split("/"))],
    [INTERACTION_HIT_CANDIDATES_PATH, readRepoFile(...INTERACTION_HIT_CANDIDATES_PATH.split("/"))],
    [MAP_INTERACTION_EVENT_BINDING_OWNER_PATH, readRepoFile(...MAP_INTERACTION_EVENT_BINDING_OWNER_PATH.split("/"))],
  ]) {
    assert.equal(hasMapRendererImport(source), false, `${relativePath} must not import map_renderer.js`);
    assert.equal(hasHitCanvasOwnerImport(source), false, `${relativePath} must not import hit canvas owner`);
    for (const token of [
      "scheduleHitCanvasBuildIfNeeded",
      "hitCanvasBuildScheduled",
      "hitCanvasTopologyRevision",
      "buildHitCanvasAfterStartup",
      "drawHitCanvas",
    ]) {
      assertExcludes(source, token, `${relativePath} must avoid hit canvas scheduling/build token`);
    }
  }
});

test("only the P47 production hit canvas scheduling owner exists", () => {
  const hitCanvasSourceFiles = listRepoFiles("js/core")
    .filter((relativePath) => /hit[_-]?canvas|hitCanvas/i.test(relativePath))
    .filter((relativePath) => /\.(m?js)$/.test(relativePath))
    .sort();

  assert.deepEqual(hitCanvasSourceFiles, [OWNER_PATH]);
});

test("public facade state allowlist and P47 owner dist mirror remain untouched", () => {
  const publicFacadeSource = readRepoFile(...PUBLIC_FACADE_PATH.split("/"));
  const stateWriteAllowlistSource = readRepoFile(...STATE_WRITE_ALLOWLIST_PATH.split("/"));

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
    assertExcludes(publicFacadeSource, token, "public facade must not expose hit canvas scheduling owner");
    assertExcludes(stateWriteAllowlistSource, token, "state-write allowlist must not add hit canvas scheduling owner");
  }
  assert.deepEqual(gitDiffNames([PUBLIC_FACADE_PATH, STATE_WRITE_ALLOWLIST_PATH, OWNER_DIST_PATH]), []);
});
