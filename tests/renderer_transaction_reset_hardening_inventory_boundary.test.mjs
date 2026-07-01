import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const P39_DOC_PATH = "docs/active/renderer-transaction-reset-hardening-preflight-20260630.md";
const P49_DOC_PATH = "docs/active/renderer-transaction-reset-owner-p49-20260701.md";
const RESET_OWNER_PATH = "js/core/map_renderer/renderer_transaction_reset_owner.js";
const SET_MAP_DATA_TRANSACTION_OWNER_PATH = "js/core/map_renderer/set_map_data_transaction_owner.js";
const STARTUP_TRANSACTION_OWNER_PATH = "js/core/renderer/renderer_startup_transaction_owner.js";
const SCENARIO_REFRESH_RUNTIME_PATH = "js/core/map_renderer/scenario_refresh_runtime.js";
const EXACT_AFTER_SETTLE_SCHEDULER_PATH = "js/core/map_renderer/exact_after_settle_scheduler.js";
const RENDER_LIFECYCLE_OWNER_PATH = "js/core/renderer/renderer_render_lifecycle_owner.js";
const RUNTIME_STATE_TOKEN = ["runtime", "State"].join("");

const FORBIDDEN_RESET_HELPER_PATHS = Object.freeze([
  "js/core/map_renderer/renderer_transaction_reset_helper.js",
  "js/core/map_renderer/renderer_transaction_reset_controller.js",
  "js/core/map_renderer/shared_renderer_transaction_reset_owner.js",
  "js/core/map_renderer/shared_renderer_transaction_reset_helper.js",
  "js/core/map_renderer/shared_renderer_transaction_reset_controller.js",
  "js/core/map_renderer/reset_transaction_owner.js",
  "js/core/map_renderer/reset_transaction_helper.js",
  "js/core/map_renderer/reset_transaction_controller.js",
  "js/core/map_renderer/transaction_reset_owner.js",
  "js/core/map_renderer/transaction_reset_helper.js",
  "js/core/map_renderer/transaction_reset_controller.js",
  "js/core/renderer/renderer_transaction_reset_owner.js",
  "js/core/renderer/renderer_transaction_reset_helper.js",
  "js/core/renderer/renderer_transaction_reset_controller.js",
  "js/core/renderer/shared_renderer_transaction_reset_owner.js",
  "js/core/renderer/shared_renderer_transaction_reset_helper.js",
  "js/core/renderer/shared_renderer_transaction_reset_controller.js",
  "js/core/renderer/reset_transaction_owner.js",
  "js/core/renderer/reset_transaction_helper.js",
  "js/core/renderer/reset_transaction_controller.js",
  "js/core/renderer/transaction_reset_owner.js",
  "js/core/renderer/transaction_reset_helper.js",
  "js/core/renderer/transaction_reset_controller.js",
]);

const P39_DOC_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current P38 transaction owner baseline",
  "## initMap startup reset inventory",
  "## setMapData transaction reset inventory",
  "## resetRendererTransactionState inventory",
  "## resetRendererRefreshTransactionState inventory",
  "## markRendererTopologyChanged inventory",
  "## Scenario refresh reset consumers",
  "## Exact-after-settle reset boundary",
  "## State-write and composition-root boundary",
  "## P40/P41 allowed follow-up",
  "## Forbidden areas",
  "## Required validation commands",
]);

const RESET_TRANSACTION_STATE_TOKENS = Object.freeze([
  "function resetRendererTransactionState({",
  "cancelSecondarySpatialBuild = false",
  "cancelHoverOverlayRender = false",
  "hitCanvasDirty = false",
  "getRendererTransactionResetOwner().resetRendererTransactionState({",
]);

const RESET_RENDERER_REFRESH_STATE_TOKENS = Object.freeze([
  '"clearPendingDynamicBorderTimer"',
  '"clearRenderPhaseTimer"',
  '"cancelPendingIndexUiRefresh"',
  '"cancelPendingSidebarRefresh"',
  '"cancelScheduledHoverOverlayRender"',
  '"setRenderPhaseIdle"',
  '"resetRenderDiagnostics"',
  '"clearStagedMapDataTasks"',
  '"cancelExactAfterSettleRefresh"',
  '"cancelScheduledHitCanvasBuild"',
  '"cancelSecondarySpatialBuild"',
  '"setDeferContextBasePass"',
  '"setDeferHitCanvasBuild"',
  '"setDeferExactAfterSettle"',
  '"resetLayerResolverCache"',
  '"resetDevInteractionState"',
  '"resetDevClipboardState"',
  '"resetPhysicalLandClipPathCache"',
]);

const MARK_RENDERER_TOPOLOGY_CHANGED_TOKENS = Object.freeze([
  '"resetExactRefreshOptimizationState"',
  '"resetVisibleInternalBorderMeshSignature"',
  '"bumpTopologyRevision"',
  '"setHitCanvasDirty"',
  '"resetHitCanvasTopologyRevision"',
]);

const SET_MAP_DATA_OWNER_RESET_TOKENS = Object.freeze([
  "runEffect(\"resetRendererTransactionState\", {",
  "cancelHoverOverlayRender: true",
  "cancelSecondarySpatialBuild: true",
  "runEffect(\"clearPendingPoliticalColorEdit\", {",
  "runEffect(\"clearLastGoodFrame\", SET_MAP_DATA_REASON)",
  "runEffect(\"invalidateInteractionComposite\", SET_MAP_DATA_REASON)",
  "runEffect(\"resetFirstVisibleFramePainted\", SET_MAP_DATA_REASON)",
  "runEffect(\"invalidateAllRenderPasses\", SET_MAP_DATA_REASON)",
]);

const STARTUP_OWNER_RESET_TOKENS = Object.freeze([
  "runInitMapResetTransaction",
  "resetLayerResolverCache",
  "resetPhysicalLandClipPathCache",
  "resetExactRefreshOptimizationState",
  "bumpTopologyRevision",
  "resetHitCanvasTopologyRevision",
  "clearPendingPoliticalColorEdit",
  "cancelExactAfterSettleRefresh",
  "invalidateAllRenderPasses",
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

function isForbiddenResetHelperPath(sourcePath) {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (normalized === RESET_OWNER_PATH) {
    return false;
  }
  if (!normalized.startsWith("js/core/")) {
    return false;
  }
  const baseName = path.basename(normalized);
  if (!/\.m?js$/.test(baseName)) {
    return false;
  }
  const stem = baseName.replace(/\.m?js$/, "");
  return stem.includes("reset")
    && stem.includes("transaction")
    && /(?:^|_)(?:owner|helper|controller)(?:_|$)/.test(stem);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected end marker ${JSON.stringify(endMarker)}`);
  return source.slice(start, end);
}

function assertTokensInOrder(source, tokens, message) {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    assert.notEqual(next, -1, `${message}: missing ordered token ${JSON.stringify(token)}`);
    assert.ok(next > cursor, `${message}: token out of order ${JSON.stringify(token)}`);
    cursor = next;
  }
}

test("P39 preflight doc exists and locks required headings", () => {
  const docSource = readRepoFile(...P39_DOC_PATH.split("/"));

  for (const heading of P39_DOC_HEADINGS) {
    assertIncludes(docSource, heading, "P39 doc must keep required heading");
  }
  for (const token of [
    "P39 is preflight/hardening only.",
    "No production runtime behavior changes.",
    "resetRendererTransactionState` remains in `js/core/map_renderer.js` for P39",
    "setMapData owner keeps injected effects.",
    "No new state-write allowlist entry.",
    "No renamed renderer transaction reset owner/helper/controller under `js/core/**`.",
    "No `renderer_render_lifecycle_owner.js`.",
  ]) {
    assertIncludes(docSource, token, "P39 doc must lock reset hardening boundary");
  }
});

test("P49 active doc records reset owner implementation scope", () => {
  const docSource = readRepoFile(...P49_DOC_PATH.split("/"));

  for (const token of [
    "Renderer Transaction Reset Owner P49",
    "`js/core/map_renderer/renderer_transaction_reset_owner.js`",
    "resetRendererTransactionState",
    "resetRendererRefreshTransactionState",
    "markRendererTopologyChanged",
    "P47 hit canvas scheduling owner",
    "No public facade, state-write allowlist, dist, scenario refresh runtime, or exact scheduler migration",
  ]) {
    assertIncludes(docSource, token, "P49 doc must lock implementation scope");
  }
});

test("P49 keeps exactly one bounded reset owner and render lifecycle owner absent", () => {
  assert.equal(repoFileExists(RESET_OWNER_PATH), true, "P49 must add the bounded reset owner");
  for (const relativePath of FORBIDDEN_RESET_HELPER_PATHS) {
    assert.equal(repoFileExists(relativePath), false, `P49 must not add extra reset helper: ${relativePath}`);
  }
  for (const sourcePath of listRepoSourceFiles("js/core")) {
    assert.equal(
      isForbiddenResetHelperPath(sourcePath),
      false,
      `P49 must not add renamed reset helper: ${sourcePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/renderer/renderer_transaction_reset_controller.js",
    "js/core/renderer/reset_renderer_transaction_helper.js",
    "js/core/renderer/reset_transaction_owner.js",
    "js/core/map_renderer/transaction_reset_helper.mjs",
  ]) {
    assert.equal(
      isForbiddenResetHelperPath(fixturePath),
      true,
      `P39 reset helper pattern must catch renamed helper path: ${fixturePath}`,
    );
  }
  for (const fixturePath of [
    "js/core/map_renderer/set_map_data_transaction_owner.js",
    RESET_OWNER_PATH,
    "js/core/renderer/renderer_startup_transaction_owner.js",
  ]) {
    assert.equal(
      isForbiddenResetHelperPath(fixturePath),
      false,
      `P39 reset helper pattern must allow existing owner path: ${fixturePath}`,
    );
  }
  assert.equal(
    repoFileExists(RENDER_LIFECYCLE_OWNER_PATH),
    false,
    "P39 must keep renderer_render_lifecycle_owner.js absent",
  );
});

test("map_renderer keeps reset wrappers delegated to the P49 owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const resetSource = sliceBetween(
    rendererSource,
    "function markRendererTopologyChanged({",
    "function rebuildPrimaryPoliticalCollections()",
  );
  const resetRefreshSource = sliceBetween(
    rendererSource,
    "function resetRendererRefreshTransactionState({",
    "scenarioRefreshRuntime = createScenarioRefreshRuntime({",
  );

  for (const token of RESET_TRANSACTION_STATE_TOKENS) {
    assertIncludes(resetSource, token, "map_renderer must keep resetRendererTransactionState token");
  }
  assertIncludes(
    resetSource,
    "function markRendererTopologyChanged({ hitCanvasDirty = false } = {})",
    "map_renderer must keep markRendererTopologyChanged wrapper signature",
  );
  assertIncludes(
    resetSource,
    "getRendererTransactionResetOwner().markRendererTopologyChanged({ hitCanvasDirty })",
    "map_renderer must keep markRendererTopologyChanged wrapper delegated",
  );
  assertIncludes(
    resetRefreshSource,
    "getRendererTransactionResetOwner().resetRendererRefreshTransactionState({",
    "map_renderer must keep resetRendererRefreshTransactionState wrapper delegated",
  );
});

test("P49 reset owner keeps refresh and topology reset inventory", () => {
  const resetOwnerSource = readRepoFile(...RESET_OWNER_PATH.split("/"));

  for (const token of RESET_RENDERER_REFRESH_STATE_TOKENS) {
    assertIncludes(resetOwnerSource, token, "P49 owner must keep resetRendererRefreshTransactionState token");
  }
  assertTokensInOrder(
    resetOwnerSource,
    RESET_RENDERER_REFRESH_STATE_TOKENS,
    "resetRendererRefreshTransactionState must keep reset order",
  );
  for (const token of MARK_RENDERER_TOPOLOGY_CHANGED_TOKENS) {
    assertIncludes(resetOwnerSource, token, "P49 owner must keep markRendererTopologyChanged token");
  }
  assertTokensInOrder(
    resetOwnerSource,
    MARK_RENDERER_TOPOLOGY_CHANGED_TOKENS,
    "markRendererTopologyChanged must keep topology reset order",
  );
  assertExcludes(resetOwnerSource, RUNTIME_STATE_TOKEN, "P49 owner must keep state writes injected");
  assertExcludes(resetOwnerSource, "map_renderer.js", "P49 owner must avoid composition-root import");
});

test("setMapData owner still calls injected reset and set-map-data prelude", () => {
  const ownerSource = readRepoFile(...SET_MAP_DATA_TRANSACTION_OWNER_PATH.split("/"));

  for (const token of SET_MAP_DATA_OWNER_RESET_TOKENS) {
    assertIncludes(ownerSource, token, "setMapData owner must keep reset prelude token");
  }
  assertTokensInOrder(
    ownerSource,
    SET_MAP_DATA_OWNER_RESET_TOKENS,
    "setMapData owner must keep reset prelude order",
  );
  assertExcludes(ownerSource, "map_renderer.js", "setMapData owner must keep composition-root boundary");
  assertExcludes(ownerSource, RUNTIME_STATE_TOKEN, "setMapData owner must keep state writes injected");
});

test("startup owner stays focused on initMap reset and avoids setMapData scope", () => {
  const startupOwnerSource = readRepoFile(...STARTUP_TRANSACTION_OWNER_PATH.split("/"));

  for (const token of STARTUP_OWNER_RESET_TOKENS) {
    assertIncludes(startupOwnerSource, token, "startup owner must keep initMap reset token");
  }
  for (const tokenParts of [
    ["set", "MapData"],
    ["set_map_data", "_transaction_owner"],
  ]) {
    assertExcludes(startupOwnerSource, tokenParts.join(""), "startup owner must avoid setMapData reset scope");
  }
});

test("scenario refresh and exact-after-settle boundaries stay separate", () => {
  const scenarioRefreshSource = readRepoFile(...SCENARIO_REFRESH_RUNTIME_PATH.split("/"));
  const exactSchedulerSource = readRepoFile(...EXACT_AFTER_SETTLE_SCHEDULER_PATH.split("/"));

  assertIncludes(
    scenarioRefreshSource,
    "resetRendererTransactionState",
    "scenario refresh runtime must keep injected resetRendererTransactionState dependency",
  );
  assertIncludes(
    scenarioRefreshSource,
    "resetRendererTransactionState({ hitCanvasDirty: true })",
    "scenario apply refresh must keep current reset call",
  );
  assertExcludes(
    scenarioRefreshSource,
    "set_map_data_transaction_owner.js",
    "scenario refresh runtime must avoid setMapData owner import",
  );
  for (const token of [
    "set_map_data_transaction_owner.js",
    "renderer_transaction_reset_owner.js",
    "renderer_transaction_reset_helper.js",
    "shared_renderer_transaction_reset_owner.js",
    "shared_renderer_transaction_reset_helper.js",
  ]) {
    assertExcludes(exactSchedulerSource, token, "exact-after-settle scheduler must keep reset boundary separate");
  }
});

test("package exposes P39 script and preserves P38 scripts", () => {
  const packageSource = readRepoFile("package.json");

  assertIncludes(
    packageSource,
    "\"test:node:renderer-transaction-reset-owner\": \"node --test tests/renderer_transaction_reset_owner_behavior.test.mjs\"",
    "package.json must expose the P49 reset owner test",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-transaction-reset\": \"npm run test:node:renderer-transaction-reset-owner && npm run test:node:renderer-transaction-reset-hardening-inventory\"",
    "package.json must expose the P49 combined reset suite",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-transaction-reset-hardening-inventory\": \"node --test tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs\"",
    "package.json must expose the P39 reset hardening inventory test",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-set-map-data-transaction-owner\": \"node --test tests/renderer_set_map_data_transaction_owner_behavior.test.mjs\"",
    "package.json must keep the P38 owner test script",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-set-map-data-transaction-inventory\": \"node --test tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs\"",
    "package.json must keep the P38 inventory test script",
  );
  assertIncludes(
    packageSource,
    "\"test:node:renderer-set-map-data-transaction\": \"npm run test:node:renderer-set-map-data-transaction-owner && npm run test:node:renderer-set-map-data-transaction-inventory\"",
    "package.json must keep the P38 combined test script",
  );
});
