import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const P40_DOC_PATH = "docs/active/renderer-render-lifecycle-preflight-20260630.md";
const RENDER_LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";
const MAP_RENDERER_LIFECYCLE_OWNER_PATH = "js/core/map_renderer/render_lifecycle_owner.js";

const P40_DOC_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current P38/P39 renderer transaction baseline",
  "## Current render facade and scheduler entry inventory",
  "## Current drawCanvas lifecycle inventory",
  "## Current renderPassToCache lifecycle inventory",
  "## Current hit canvas build inventory",
  "## Current render cache and pass catalog boundary",
  "## Current exact-after-settle render boundary",
  "## Current scenario refresh render boundary",
  "## Current strategic overlay render boundary",
  "## Current public facade and export boundary",
  "## P41 allowed first move candidates",
  "## P41 forbidden areas",
  "## Required validation commands",
]);

const P40_DOC_TOKENS = Object.freeze([
  "P40 is preflight only.",
  "No production runtime behavior changes.",
  "P40 does not add `renderer_render_lifecycle_owner.js`.",
  "No state-write allowlist changes.",
  "P40 does not migrate `render()`, `drawCanvas()`, `renderPassToCache()`, hit canvas build",
  "P40 does not migrate scenario refresh runtime behavior.",
  "P40 does not migrate exact-after-settle scheduler behavior.",
  "P40 does not migrate strategic overlay runtime or render behavior.",
  "P40 makes no public facade changes.",
  "No state-write allowlist changes unless a later implementation phase proves and documents the need.",
  "`render_cache_owner.js` owns render cache invalidation authority.",
  "`render_pipeline_passes.js` and `render_pipeline_catalog.js` own pass definitions/catalog.",
  "`render_invalidation_catalog.js` owns invalidation vocabulary.",
  "`render_transform_reuse_policy_owner.js` owns transform reuse policy.",
  "`exact_after_settle_scheduler.js` owns exact-after-settle scheduling.",
  "`scenario_refresh_runtime.js` owns scenario refresh/chunk visual/infra flow.",
  "`set_map_data_transaction_owner.js` owns only setMapData transaction order.",
  "`renderer_startup_transaction_owner.js` owns only initMap startup reset order.",
  "P41 may choose one small first move after P40 review.",
  "render request facade inventory hardening",
  "first visible frame diagnostic owner preflight",
  "render boundary request adapter preflight",
  "a tiny render scheduling wrapper, only if tests prove no draw/pass/hit movement",
  "P41 must not begin with `drawCanvas` or `renderPassToCache` migration.",
]);

const MAP_RENDERER_LIFECYCLE_TOKENS = Object.freeze([
  "function render()",
  "function drawCanvas()",
  "function renderPassToCache(",
  "async function buildHitCanvasAfterStartup",
  "createExactAfterSettleScheduler({",
  "createScenarioRefreshRuntime({",
  "createStrategicOverlayRuntimeOwner({",
]);

const MAP_RENDERER_EXPORT_TOKENS = Object.freeze([
  "export { RENDER_PASS_NAMES } from \"./map_renderer/render_pass_catalog.js\";",
  "render,",
  "setMapData,",
  "initMap,",
  "renderExportPassesToCanvas,",
  "export function renderLegend",
  "requestInteractionRender,",
]);

const PUBLIC_FACADE_TOKENS = Object.freeze([
  "render,",
  "setMapData,",
  "initMap,",
  "RENDER_PASS_NAMES,",
  "from \"../map_renderer.js\";",
]);

const OWNER_FORBIDDEN_TOKENS = Object.freeze([
  "function render()",
  "drawCanvas",
  "renderPassToCache",
  "buildHitCanvas",
  "createScenarioRefreshRuntime",
  "createExactAfterSettleScheduler",
  "createStrategicOverlayRuntimeOwner",
]);

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

function isForbiddenRenderLifecycleOwnerPath(sourcePath) {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (!normalized.startsWith("js/core/map_renderer/") && !normalized.startsWith("js/core/renderer/")) {
    return false;
  }
  const baseName = path.basename(normalized);
  if (!/\.m?js$/.test(baseName)) {
    return false;
  }
  const stem = baseName.replace(/\.m?js$/, "");
  const parts = stem.split("_").filter(Boolean);
  return parts.includes("render")
    && parts.includes("lifecycle")
    && parts.some((part) => ["owner", "helper", "controller"].includes(part));
}

function hasMapRendererImport(source) {
  return /from\s+["'][^"']*map_renderer\.js["']/.test(source)
    || /import\s+["'][^"']*map_renderer\.js["']\s*;?/.test(source)
    || /import\s*\(\s*["'][^"']*map_renderer\.js["']\s*\)/.test(source);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("P40 preflight doc exists and locks required headings", () => {
  const docSource = readRepoFile(...P40_DOC_PATH.split("/"));

  for (const heading of P40_DOC_HEADINGS) {
    assertIncludes(docSource, heading, "P40 doc must keep required heading");
  }
  for (const token of P40_DOC_TOKENS) {
    assertIncludes(docSource, token, "P40 doc must lock render lifecycle boundary");
  }
});

test("P40 keeps production render lifecycle owner absent", () => {
  for (const relativePath of [
    RENDER_LIFECYCLE_OWNER_PATH,
    MAP_RENDERER_LIFECYCLE_OWNER_PATH,
    "js/core/renderer/render_lifecycle_owner.js",
    "js/core/renderer/render_lifecycle_helper.js",
    "js/core/renderer/render_lifecycle_controller.js",
    "js/core/map_renderer/render_lifecycle_helper.js",
    "js/core/map_renderer/render_lifecycle_controller.js",
  ]) {
    assert.equal(repoFileExists(relativePath), false, `P40 must not add production render lifecycle owner/helper: ${relativePath}`);
  }
  for (const sourcePath of listRepoSourceFiles("js/core")) {
    assert.equal(
      isForbiddenRenderLifecycleOwnerPath(sourcePath),
      false,
      `P40 must not add renamed production render lifecycle owner/helper: ${sourcePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/renderer/renderer_render_lifecycle_owner.js",
    "js/core/renderer/render_lifecycle_helper.js",
    "js/core/map_renderer/render_lifecycle_owner.mjs",
    "js/core/map_renderer/shared_render_lifecycle_controller.js",
  ]) {
    assert.equal(
      isForbiddenRenderLifecycleOwnerPath(fixturePath),
      true,
      `P40 render lifecycle owner pattern must catch renamed owner path: ${fixturePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/renderer/renderer_surface_lifecycle_owner.js",
    "js/core/renderer/renderer_svg_surface_lifecycle_owner.js",
    "js/core/renderer/renderer_startup_transaction_owner.js",
    "js/core/renderer/render_cache_owner.js",
  ]) {
    assert.equal(
      isForbiddenRenderLifecycleOwnerPath(fixturePath),
      false,
      `P40 render lifecycle owner pattern must allow existing owner path: ${fixturePath}`,
    );
  }
});

test("map_renderer keeps render lifecycle anchors and public exports", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  for (const token of MAP_RENDERER_LIFECYCLE_TOKENS) {
    assertIncludes(rendererSource, token, "map_renderer must keep render lifecycle anchor");
  }
  for (const token of MAP_RENDERER_EXPORT_TOKENS) {
    assertIncludes(rendererSource, token, "map_renderer must keep render facade export anchor");
  }
});

test("public facade keeps render lifecycle bridge exports", () => {
  const publicFacadeSource = readRepoFile("js", "core", "map_renderer", "public.js");

  for (const token of PUBLIC_FACADE_TOKENS) {
    assertIncludes(publicFacadeSource, token, "public facade must keep render lifecycle export anchor");
  }
});

test("setMapData and startup transaction owners stay out of render lifecycle", () => {
  const setMapDataOwnerSource = readRepoFile("js", "core", "map_renderer", "set_map_data_transaction_owner.js");
  const startupOwnerSource = readRepoFile("js", "core", "renderer", "renderer_startup_transaction_owner.js");

  for (const token of OWNER_FORBIDDEN_TOKENS) {
    assertExcludes(setMapDataOwnerSource, token, "setMapData owner must avoid render lifecycle token");
  }
  for (const token of ["setMapData", "drawCanvas", "renderPassToCache", "buildHitCanvas"]) {
    assertExcludes(startupOwnerSource, token, "startup owner must avoid render lifecycle/setMapData token");
  }
});

test("narrow render owners keep existing boundaries", () => {
  const renderCacheOwnerSource = readRepoFile("js", "core", "renderer", "render_cache_owner.js");
  const renderPipelinePassesSource = readRepoFile("js", "core", "renderer", "render_pipeline_passes.js");
  const renderPipelineCatalogSource = readRepoFile("js", "core", "renderer", "render_pipeline_catalog.js");
  const renderInvalidationCatalogSource = readRepoFile("js", "core", "map_renderer", "render_invalidation_catalog.js");
  const transformReuseOwnerSource = readRepoFile("js", "core", "renderer", "render_transform_reuse_policy_owner.js");

  assertIncludes(renderCacheOwnerSource, "export function createRenderCacheOwner", "render cache owner must keep current factory");
  assert.equal(hasMapRendererImport(renderCacheOwnerSource), false, "render cache owner must not import map_renderer");
  assertIncludes(renderPipelinePassesSource, "export function createRenderPipelinePassesOwner", "render pipeline passes owner must keep current factory");
  assert.equal(hasMapRendererImport(renderPipelinePassesSource), false, "render pipeline passes owner must not import map_renderer");
  assertIncludes(renderPipelineCatalogSource, "export const IDLE_RENDER_PASS_DEFINITIONS", "render pipeline catalog must keep pass definitions");
  assertIncludes(renderInvalidationCatalogSource, "export const PASS_RESOURCE_MAP", "render invalidation catalog must keep invalidation vocabulary");
  assertIncludes(transformReuseOwnerSource, "export function createRenderTransformReusePolicyOwner", "transform reuse policy owner must keep current factory");
  for (const token of [
    "document",
    "window",
    "globalThis.d3",
    "projection",
    "zoomBehavior",
    "drawCanvas",
    "renderPassToCache",
    "buildHitCanvas",
    "runtimeState",
  ]) {
    assertExcludes(transformReuseOwnerSource, token, "transform reuse policy owner must avoid render lifecycle host token");
  }
});

test("scenario exact and strategic runtimes do not import render lifecycle owner", () => {
  for (const [relativePath, source] of [
    ["js/core/map_renderer/scenario_refresh_runtime.js", readRepoFile("js", "core", "map_renderer", "scenario_refresh_runtime.js")],
    ["js/core/map_renderer/exact_after_settle_scheduler.js", readRepoFile("js", "core", "map_renderer", "exact_after_settle_scheduler.js")],
    ["js/core/renderer/strategic_overlay_runtime_owner.js", readRepoFile("js", "core", "renderer", "strategic_overlay_runtime_owner.js")],
  ]) {
    assertExcludes(source, "renderer_render_lifecycle_owner.js", `${relativePath} must not import render lifecycle owner`);
    assertExcludes(source, "render_lifecycle_owner.js", `${relativePath} must not import render lifecycle owner`);
  }
});

test("package exposes P40 script and doc locks P41 boundaries", () => {
  const packageSource = readRepoFile("package.json");
  const docSource = readRepoFile(...P40_DOC_PATH.split("/"));

  assertIncludes(
    packageSource,
    "\"test:node:renderer-render-lifecycle-inventory\": \"node --test tests/renderer_render_lifecycle_inventory_boundary.test.mjs\"",
    "package.json must expose the P40 render lifecycle inventory test",
  );
  for (const token of [
    "render request facade inventory hardening",
    "first visible frame diagnostic owner preflight",
    "render boundary request adapter preflight",
    "a tiny render scheduling wrapper, only if tests prove no draw/pass/hit movement",
    "P41 must not begin with `drawCanvas` or `renderPassToCache` migration.",
  ]) {
    assertIncludes(docSource, token, "P40 doc must lock P41 allowed and forbidden areas");
  }
});
