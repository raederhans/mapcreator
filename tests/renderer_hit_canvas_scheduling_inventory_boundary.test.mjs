import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DOC_PATH = "docs/active/renderer-hit-canvas-scheduling-owner-p47-20260701.md";
const PREVIOUS_PREFLIGHT_DOC_PATH = "docs/active/renderer-hit-canvas-scheduling-preflight-20260630.md";
const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const OWNER_PATH = "js/core/map_renderer/hit_canvas_scheduling_owner.js";
const RESET_OWNER_PATH = "js/core/map_renderer/renderer_transaction_reset_owner.js";
const SCENARIO_REFRESH_RUNTIME_PATH = "js/core/map_renderer/scenario_refresh_runtime.js";
const SPATIAL_INDEX_RUNTIME_OWNER_PATH = "js/core/renderer/spatial_index_runtime_owner.js";
const INTERACTION_HIT_CANDIDATES_PATH = "js/core/map_renderer/interaction_hit_candidates.js";
const MAP_INTERACTION_EVENT_BINDING_OWNER_PATH = "js/core/renderer/map_interaction_event_binding_owner.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";
const RENDER_LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

function listRepoSourceFiles(relativeDir) {
  const root = path.join(REPO_ROOT, relativeDir);
  const results = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (/\.(m?js)$/.test(entry.name)) {
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

test("P47 doc exists and records the preflight-to-owner transition", () => {
  const docSource = readRepoFile(...DOC_PATH.split("/"));
  const preflightSource = readRepoFile(...PREVIOUS_PREFLIGHT_DOC_PATH.split("/"));

  for (const token of [
    "## First Principles",
    "## P47 Acceptance Checklist",
    "## Architecture Checker Target State",
    "The wrapper preserves the existing boolean behavior",
    "Replace the preflight rule that forbids all production `hit_canvas` files with a unique-owner rule",
  ]) {
    assertIncludes(docSource, token, "P47 doc must lock owner transition");
  }
  assertIncludes(
    preflightSource,
    "Recommended next implementation: hit canvas scheduling owner.",
    "preflight doc must remain as historical handoff evidence",
  );
});

test("map_renderer keeps hit canvas build anchors and delegates scheduling only", () => {
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
  assertIncludes(
    rendererSource,
    "import { createHitCanvasSchedulingOwner } from \"./map_renderer/hit_canvas_scheduling_owner.js\";",
    "map_renderer must import P47 scheduling owner",
  );

  const scheduleSource = sliceBetween(
    rendererSource,
    "function scheduleHitCanvasBuildIfNeeded({ reason = \"idle-render\" } = {})",
    "function ensureHitCanvasUpToDate({ force = false } = {})",
  );
  assertIncludes(
    scheduleSource,
    "getHitCanvasSchedulingOwner().scheduleHitCanvasBuildIfNeeded({ reason });",
    "schedule wrapper must delegate to owner",
  );
  assertIncludes(scheduleSource, "return false;", "schedule wrapper must keep old falsy contract");
  for (const token of [
    "scheduleDeferredWork(() =>",
    "drawHitCanvasWithMetric({",
    stateWriteToken("hitCanvasBuildScheduled", "scheduleDeferredWork"),
  ]) {
    assertExcludes(scheduleSource, token, "schedule wrapper must not own scheduling body after P47");
  }
});

test("hit canvas owner keeps scheduling body and excludes draw build probe ownership", () => {
  const ownerSource = readRepoFile(...OWNER_PATH.split("/"));

  for (const token of [
    "export function createHitCanvasSchedulingOwner",
    "scheduleHitCanvasBuildIfNeeded",
    "cancelScheduledHitCanvasBuild",
    "scheduleDeferredWork",
    "cancelDeferredWork",
    "setScheduledHitCanvasBuildHandle",
    "runScheduledHitCanvasBuild",
    "mode: \"deferred\"",
    "activeScenarioId: String(getterApi.getActiveScenarioId() || \"\")",
  ]) {
    assertIncludes(ownerSource, token, "owner must lock P47 scheduling body");
  }
  for (const token of [
    "runtimeState",
    "rendererSurfaceHost",
    "drawHitCanvas",
    "drawHitCanvasWithMetric",
    "recordDeferredFullHitCanvasMetric",
    "buildHitCanvasAfterStartup",
    "getDirtyHitCanvasPointProbeHit",
    "getValidatedCanvasHit",
    "hitCanvasTopologyRevision",
  ]) {
    assertExcludes(ownerSource, token, "owner must avoid hit canvas draw/build/probe bodies");
  }
});

test("forced validation and refresh reset cancel through owner", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));
  const resetOwnerSource = readRepoFile(...RESET_OWNER_PATH.split("/"));
  const forcedSource = sliceBetween(
    rendererSource,
    "function ensureHitCanvasUpToDate({ force = false } = {})",
    "function isHitCanvasCurrent()",
  );
  const resetFactorySource = sliceBetween(
    rendererSource,
    "function getRendererTransactionResetOwner()",
    "function getMapHoverInteractionOwner()",
  );

  assertIncludes(
    forcedSource,
    "getHitCanvasSchedulingOwner().cancelScheduledHitCanvasBuild({ reason: \"strict-validation\" });",
    "strict validation must cancel through owner",
  );
  assertIncludes(
    forcedSource,
    "drawHitCanvasWithMetric({",
    "strict validation must keep forced draw metric in map_renderer",
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
    "map_renderer must remove direct hit canvas scheduled-work cancellation",
  );
});

test("dirty topology and point probing stay in map_renderer", () => {
  const rendererSource = readRepoFile(...MAP_RENDERER_PATH.split("/"));

  for (const token of [
    stateWriteToken("hitCanvasDirty", "true;"),
    stateWriteToken("hitCanvasDirty", "false;"),
    stateWriteToken("hitCanvasDirty", "Boolean(dirty);"),
    stateWriteToken("hitCanvasTopologyRevision", "0;"),
    stateWriteToken("hitCanvasTopologyRevision", "Number(runtimeState.topologyRevision || 0);"),
    "function markRendererTopologyChanged({ hitCanvasDirty = false } = {})",
    "hitCanvasDirty = false,",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep hit canvas state ownership token");
  }
});

test("scenario refresh runtime receives scheduling by injection", () => {
  const runtimeSource = readRepoFile(...SCENARIO_REFRESH_RUNTIME_PATH.split("/"));

  for (const token of [
    "setInteractionInfrastructureState, scheduleSecondarySpatialIndexBuild, scheduleHitCanvasBuildIfNeeded,",
    "scheduleHitCanvasBuildIfNeeded({",
    "resetRendererTransactionState({ hitCanvasDirty: true })",
    stateWriteToken("hitCanvasTopologyRevision", "0;"),
  ]) {
    assertIncludes(runtimeSource, token, "scenario refresh runtime must keep injected hit canvas scheduling boundary");
  }
  assert.equal(hasHitCanvasOwnerImport(runtimeSource), false, "scenario refresh runtime must not import hit canvas modules");
  for (const token of [
    "buildHitCanvasAfterStartup",
    "drawHitCanvas",
    "runtimeState.hitCanvasBuildScheduled",
  ]) {
    assertExcludes(runtimeSource, token, "scenario refresh runtime must avoid direct hit canvas build/scheduling ownership");
  }
});

test("spatial index owner and interaction modules stay outside hit canvas scheduling", () => {
  for (const [relativePath, source] of [
    [SPATIAL_INDEX_RUNTIME_OWNER_PATH, readRepoFile(...SPATIAL_INDEX_RUNTIME_OWNER_PATH.split("/"))],
    [INTERACTION_HIT_CANDIDATES_PATH, readRepoFile(...INTERACTION_HIT_CANDIDATES_PATH.split("/"))],
    [MAP_INTERACTION_EVENT_BINDING_OWNER_PATH, readRepoFile(...MAP_INTERACTION_EVENT_BINDING_OWNER_PATH.split("/"))],
  ]) {
    assert.equal(hasMapRendererImport(source), false, `${relativePath} must not import map_renderer`);
    assert.equal(hasHitCanvasOwnerImport(source), false, `${relativePath} must not import hit canvas owner`);
    for (const token of [
      "scheduleHitCanvasBuildIfNeeded",
      "buildHitCanvasAfterStartup",
      "drawHitCanvas",
      "hitCanvasBuildScheduled",
      "hitCanvasTopologyRevision",
    ]) {
      assertExcludes(source, token, `${relativePath} must avoid hit canvas build/scheduling token`);
    }
  }
});

test("only P47 production hit canvas scheduling owner and no broad render lifecycle owner exist", () => {
  assert.equal(repoFileExists(RENDER_LIFECYCLE_OWNER_PATH), false, "broad render lifecycle owner must stay absent");
  const hitCanvasSourceFiles = listRepoSourceFiles("js/core")
    .filter((sourcePath) => /hit[_-]?canvas|hitCanvas/i.test(sourcePath))
    .sort();
  assert.deepEqual(hitCanvasSourceFiles, [OWNER_PATH]);
});

test("public facade and state-write allowlist remain closed to hit canvas owner", () => {
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
    assertExcludes(publicFacadeSource, token, "public facade must not expose hit canvas owner");
    assertExcludes(stateWriteAllowlistSource, token, "state-write allowlist must not add hit canvas owner");
  }
});

test("package exposes the canonical P47 hit canvas scheduling suite", () => {
  const packageSource = readRepoFile("package.json");

  for (const token of [
    "\"test:node:hit-canvas-scheduling-owner\": \"node --test tests/hit_canvas_scheduling_owner_behavior.test.mjs\"",
    "\"test:node:hit-canvas-scheduling-owner-inventory\": \"node --test tests/hit_canvas_scheduling_owner_inventory.test.mjs\"",
    "\"test:node:hit-canvas-scheduling-owner-suite\": \"npm run test:node:hit-canvas-scheduling-owner && npm run test:node:hit-canvas-scheduling-owner-inventory && node --test tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs\"",
  ]) {
    assertIncludes(packageSource, token, "package.json must expose P47 scheduling script");
  }
  assertExcludes(
    packageSource,
    "\"test:node:renderer-hit-canvas-scheduling-inventory\":",
    "package.json must keep the superseded P47 inventory alias retired",
  );
});
