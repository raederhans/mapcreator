import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER_PATH = "js/core/map_renderer/render_request_boundary_owner.js";
const RENDERER_PATH = "js/core/map_renderer.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const PACKAGE_PATH = "package.json";
const LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("P41 render request boundary owner files and package scripts are registered", () => {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, OWNER_PATH)), true);
  assert.equal(fs.existsSync(path.join(REPO_ROOT, LIFECYCLE_OWNER_PATH)), false);

  const packageJson = readProjectFile(PACKAGE_PATH);
  for (const token of [
    "\"test:node:renderer-render-request-boundary-owner\": \"node --test tests/renderer_render_request_boundary_owner_behavior.test.mjs\"",
    "\"test:node:renderer-render-request-boundary-inventory\": \"node --test tests/renderer_render_request_boundary_inventory.test.mjs\"",
    "\"test:node:renderer-render-request-boundary\": \"npm run test:node:renderer-render-request-boundary-owner && npm run test:node:renderer-render-request-boundary-inventory\"",
  ]) {
    assert.equal(packageJson.includes(token), true, `${PACKAGE_PATH} must expose ${token}`);
  }
});

test("P41 owner keeps the render request boundary narrow", () => {
  const ownerSource = readProjectFile(OWNER_PATH);
  for (const token of [
    "export function createRenderRequestBoundaryOwner({",
    "const REQUIRED_EFFECT_NAMES = Object.freeze([",
    "const REQUIRED_GETTER_NAMES = Object.freeze([",
    "requestRendererRenderBoundary",
    "requestInteractionRenderBoundary",
    "flushInteractionRenderBoundary",
    "return createSummary({",
    "effectOrder",
    "Object.freeze({",
  ]) {
    assert.equal(ownerSource.includes(token), true, `${OWNER_PATH} must own ${token}`);
  }

  for (const token of [
    "map_renderer.js",
    "runtimeState",
    "drawCanvas",
    "renderPassToCache",
    "buildHitCanvas",
    "createScenarioRefreshRuntime",
    "createExactAfterSettleScheduler",
    "createStrategicOverlayRuntimeOwner",
    "renderer_render_lifecycle_owner",
  ]) {
    assert.equal(ownerSource.includes(token), false, `${OWNER_PATH} must avoid ${token}`);
  }
  assert.equal(ownerSource.includes("fallback({ effectApi"), false, `${OWNER_PATH} must keep external fallback narrow`);
});

test("P41 map renderer only delegates existing request wrappers", () => {
  const rendererSource = readProjectFile(RENDERER_PATH);
  for (const token of [
    "from \"./map_renderer/render_request_boundary_owner.js\";",
    "let renderRequestBoundaryOwner = null;",
    "function getRenderRequestBoundaryOwner()",
    "renderRequestBoundaryOwner = createRenderRequestBoundaryOwner({",
    "requestRender,",
    "flushRenderBoundary,",
    "render,",
    "hasInteractionRenderContext: () => Boolean(rendererSurfaceHost.getContext())",
    "getRenderRequestBoundaryOwner().requestInteractionRenderBoundary(reason).completed;",
    "getRenderRequestBoundaryOwner().flushInteractionRenderBoundary(reason).completed;",
    "getRenderRequestBoundaryOwner().requestRendererRenderBoundary(reason, {",
  ]) {
    assert.equal(rendererSource.includes(token), true, `${RENDERER_PATH} must keep ${token}`);
  }

  const wrapperStart = rendererSource.indexOf("function requestInteractionRender");
  const wrapperEnd = rendererSource.indexOf("function normalizeDevInteractionHit");
  const wrapperSource = rendererSource.slice(wrapperStart, wrapperEnd);
  for (const token of [
    "const requested = flush ? flushRenderBoundary(reason) : requestRender(reason);",
    "if (rendererSurfaceHost.getContext()) render();",
  ]) {
    assert.equal(wrapperSource.includes(token), false, `P41 wrapper must delegate old inline token: ${token}`);
  }
});

test("P41 keeps render lifecycle and public facade boundaries in place", () => {
  const rendererSource = readProjectFile(RENDERER_PATH);
  const publicFacadeSource = readProjectFile(PUBLIC_FACADE_PATH);

  for (const token of [
    "function render()",
    "function drawCanvas()",
    "function renderPassToCache(",
    "async function buildHitCanvasAfterStartup",
    "createScenarioRefreshRuntime({",
    "createExactAfterSettleScheduler({",
    "createStrategicOverlayRuntimeOwner({",
    "requestInteractionRender,",
    "scheduleRenderPhaseIdle,",
  ]) {
    assert.equal(rendererSource.includes(token), true, `${RENDERER_PATH} must retain ${token}`);
  }

  for (const token of [
    "render,",
    "setMapData,",
    "initMap,",
    "RENDER_PASS_NAMES,",
    "from \"../map_renderer.js\";",
  ]) {
    assert.equal(publicFacadeSource.includes(token), true, `${PUBLIC_FACADE_PATH} must remain stable at ${token}`);
  }
});
