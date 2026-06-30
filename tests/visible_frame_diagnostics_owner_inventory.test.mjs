import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER_PATH = "js/core/renderer/visible_frame_diagnostics_owner.js";
const RENDERER_PATH = "js/core/map_renderer.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const PACKAGE_PATH = "package.json";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";
const RENDER_TRANSACTION_DIAGNOSTICS_PATH = "js/core/renderer/render_transaction_diagnostics.js";
const EXACT_SCHEDULER_PATH = "js/core/map_renderer/exact_after_settle_scheduler.js";
const SCENARIO_REFRESH_RUNTIME_PATH = "js/core/map_renderer/scenario_refresh_runtime.js";
const LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing end marker ${endMarker}`);
  return source.slice(start, end);
}

test("P42 visible frame diagnostics owner files and package scripts are registered", () => {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, OWNER_PATH)), true);
  assert.equal(fs.existsSync(path.join(REPO_ROOT, LIFECYCLE_OWNER_PATH)), false);

  const packageJson = readProjectFile(PACKAGE_PATH);
  for (const token of [
    "\"test:node:visible-frame-diagnostics-owner\": \"node --test tests/visible_frame_diagnostics_owner_behavior.test.mjs\"",
    "\"test:node:visible-frame-diagnostics-inventory\": \"node --test tests/visible_frame_diagnostics_owner_inventory.test.mjs\"",
    "\"test:node:visible-frame-diagnostics\": \"npm run test:node:visible-frame-diagnostics-owner && npm run test:node:visible-frame-diagnostics-inventory\"",
  ]) {
    assert.equal(packageJson.includes(token), true, `${PACKAGE_PATH} must expose ${token}`);
  }
});

test("P42 owner owns diagnostics payload orchestration only", () => {
  const ownerSource = readProjectFile(OWNER_PATH);
  for (const token of [
    "export function createVisibleFrameDiagnosticsOwner({",
    "const REQUIRED_EFFECT_NAMES = Object.freeze([",
    "const REQUIRED_GETTER_NAMES = Object.freeze([",
    "recordVisibleFrameTransaction",
    "recordFirstVisibleFrameBlocked",
    "markFirstVisibleFramePainted",
    "resetFirstVisibleFramePainted",
    "createSummary({",
    "effectOrder",
    "getterOrder",
    "counterOrder",
    "Object.freeze({",
  ]) {
    assert.equal(ownerSource.includes(token), true, `${OWNER_PATH} must own ${token}`);
  }

  for (const token of [
    "map_renderer.js",
    "runtimeState =",
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
});

test("map_renderer delegates visible frame diagnostics while keeping render lifecycle anchors", () => {
  const rendererSource = readProjectFile(RENDERER_PATH);
  for (const token of [
    "from \"./renderer/visible_frame_diagnostics_owner.js\";",
    "let visibleFrameDiagnosticsOwner = null;",
    "function getVisibleFrameDiagnosticsOwner()",
    "visibleFrameDiagnosticsOwner = createVisibleFrameDiagnosticsOwner({",
    "recordVisibleFrameTransactionDiagnostics: (payload) => recordVisibleFrameTransactionDiagnostics(runtimeState, payload)",
    "hasFirstVisibleFramePainted: () => Boolean(runtimeState.firstVisibleFramePainted)",
    "return getVisibleFrameDiagnosticsOwner().recordVisibleFrameTransaction(status, details).metricEntry;",
    "getVisibleFrameDiagnosticsOwner().recordFirstVisibleFrameBlocked(reason, blockReason);",
    "getVisibleFrameDiagnosticsOwner().markFirstVisibleFramePainted(reason);",
    "getVisibleFrameDiagnosticsOwner().resetFirstVisibleFramePainted(reason);",
  ]) {
    assert.equal(rendererSource.includes(token), true, `${RENDERER_PATH} must keep ${token}`);
  }

  for (const token of [
    "function drawCanvas()",
    "function renderPassToCache(",
    "async function buildHitCanvasAfterStartup",
    "function getFirstVisiblePoliticalFrameBlockReason",
    "function getVisibleFrameIdentity",
    "function getCommittedFrameIdentity",
    "createScenarioRefreshRuntime({",
    "createExactAfterSettleScheduler({",
    "createStrategicOverlayRuntimeOwner({",
  ]) {
    assert.equal(rendererSource.includes(token), true, `${RENDERER_PATH} must keep render lifecycle token ${token}`);
  }

  const wrapperSource = sliceBetween(
    rendererSource,
    "function recordVisibleFrameTransactionMetric",
    "function recordUiRefreshMetric",
  );
  for (const token of [
    "incrementPerfCounter(\"visibleFrameTransactionCount\")",
    "if (normalizedStatus === \"committed\")",
    "recordVisibleFrameTransactionDiagnostics(runtimeState, {",
    "return recordRenderPerfMetric(\"visibleFrameTransaction\"",
  ]) {
    assert.equal(wrapperSource.includes(token), false, `P42 wrapper must delegate old inline token: ${token}`);
  }
});

test("render transaction diagnostics keeps visible frame snapshot ownership", () => {
  const diagnosticsSource = readProjectFile(RENDER_TRANSACTION_DIAGNOSTICS_PATH);
  for (const token of [
    "export function recordVisibleFrameTransactionDiagnostics",
    "function recordRenderTransactionIdentitySnapshot",
    "export function recordRenderTransactionSnapshot",
    "function detectSnapshotWarnings",
    "lastAcceptedFrameIdentity",
    "renderReuseAcrossDataGeneration",
    "visibleFrameStatus",
  ]) {
    assert.equal(diagnosticsSource.includes(token), true, `${RENDER_TRANSACTION_DIAGNOSTICS_PATH} must keep ${token}`);
  }
});

test("P42 keeps public facade scenario exact and state-write boundaries unchanged", () => {
  const publicFacadeSource = readProjectFile(PUBLIC_FACADE_PATH);
  const scenarioRefreshRuntimeSource = readProjectFile(SCENARIO_REFRESH_RUNTIME_PATH);
  const exactSchedulerSource = readProjectFile(EXACT_SCHEDULER_PATH);
  const stateWriteAllowlist = readProjectFile(STATE_WRITE_ALLOWLIST_PATH);

  for (const token of [
    "render,",
    "setMapData,",
    "initMap,",
    "RENDER_PASS_NAMES,",
    "from \"../map_renderer.js\";",
  ]) {
    assert.equal(publicFacadeSource.includes(token), true, `${PUBLIC_FACADE_PATH} must remain stable at ${token}`);
  }
  assert.equal(publicFacadeSource.includes("visible_frame_diagnostics_owner"), false, `${PUBLIC_FACADE_PATH} must not expose P42 owner`);

  for (const [relativePath, source] of [
    [SCENARIO_REFRESH_RUNTIME_PATH, scenarioRefreshRuntimeSource],
    [EXACT_SCHEDULER_PATH, exactSchedulerSource],
  ]) {
    assert.equal(source.includes("visible_frame_diagnostics_owner"), false, `${relativePath} must not import P42 owner`);
  }
  assert.equal(
    scenarioRefreshRuntimeSource.includes("resetFirstVisibleFramePainted(\"scenario-apply-refresh\")"),
    true,
    `${SCENARIO_REFRESH_RUNTIME_PATH} must keep injected first-visible reset call`,
  );
  assert.equal(
    stateWriteAllowlist.includes("visible_frame_diagnostics_owner"),
    false,
    `${STATE_WRITE_ALLOWLIST_PATH} must not add P42 owner state writes`,
  );
});
