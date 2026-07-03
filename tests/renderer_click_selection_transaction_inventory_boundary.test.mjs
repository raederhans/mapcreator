import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DOC_PATH = "docs/active/renderer-click-selection-transaction-preflight-20260702.md";
const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const MAP_HOVER_INTERACTION_OWNER_PATH = "js/core/map_renderer/map_hover_interaction_owner.js";
const MAP_INTERACTION_EVENT_BINDING_OWNER_PATH = "js/core/renderer/map_interaction_event_binding_owner.js";
const INTERACTION_HIT_CANDIDATES_PATH = "js/core/map_renderer/interaction_hit_candidates.js";
const INTERACTION_FUNNEL_PATH = "js/core/interaction_funnel.js";
const HISTORY_MANAGER_PATH = "js/core/history_manager.js";
const DIRTY_STATE_PATH = "js/core/dirty_state.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";

const P54_DOC_HEADINGS = Object.freeze([
  "## Scope and guardrails",
  "## Current P48 hover interaction baseline",
  "## Click entry and event binding inventory",
  "## Land click transaction inventory",
  "## Water click transaction inventory",
  "## Special region click transaction inventory",
  "## Dev selection and fill inventory",
  "## History/dirty/render refresh inventory",
  "## Scenario detail readiness boundary",
  "## P55/P56 allowed first move",
  "## Forbidden areas",
  "## Required validation commands",
]);

function readRepoFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, ...relativePath.split("/"));
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, ...relativePath.split("/")));
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

function extractFunctionSource(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Expected function to exist: ${functionName}`);
  const signatureEnd = source.indexOf(") {", start + marker.length);
  const openBrace = signatureEnd >= 0
    ? signatureEnd + 2
    : source.indexOf("{", start + marker.length);
  assert.notEqual(openBrace, -1, `Expected function body to start: ${functionName}`);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`Expected function body to close: ${functionName}`);
}

function isForbiddenClickSelectionTransactionOwnerPath(sourcePath) {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (!normalized.startsWith("js/core/")) {
    return false;
  }
  const baseName = path.basename(normalized);
  if (!/\.m?js$/.test(baseName)) {
    return false;
  }
  const stem = baseName.replace(/\.m?js$/, "").toLowerCase();
  const compact = stem.replace(/[_-]/g, "");
  const hasClick = compact.includes("click") || compact.includes("mapclick");
  const hasSelection = compact.includes("selection") || compact.includes("select");
  const hasTransaction = compact.includes("transaction");
  const hasOwnerShape = /(?:^|_)(?:owner|helper|controller|adapter)(?:_|$)/.test(stem);
  return hasOwnerShape && hasClick && (hasSelection || hasTransaction);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function stateWriteToken(rootName, keyName, suffix) {
  return `${rootName}.${keyName}${suffix}`;
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("P54 doc exists and locks required click selection transaction headings", () => {
  const docSource = readRepoFile(DOC_PATH);

  for (const heading of P54_DOC_HEADINGS) {
    assertIncludes(docSource, heading, "P54 doc must keep required heading");
  }
  for (const token of [
    "P54 is preflight only.",
    "No production runtime changes.",
    "The click handler function remains in `js/core/map_renderer.js` as `async function handleClick(event, _interactionContext = null)`.",
    "`js/core/renderer/map_interaction_event_binding_owner.js` remains a binding owner only.",
    "`js/core/interaction_funnel.js` keeps the dispatch bridge.",
    "Land click transaction logic remains in `map_renderer.js`.",
    "Water click transaction logic remains in `map_renderer.js`.",
    "Special region click transaction logic remains in `map_renderer.js`.",
    "Dev selection and fill remain in `map_renderer.js` and existing UI owners.",
    "Click and fill transactions currently call the existing history, dirty-state, and render refresh paths:",
    "Detailed land interaction readiness remains inside `map_renderer.js`:",
    "The first implementation should probably extract water/special selection clearing or the dev-selection click transaction only.",
    "Do not combine land fill, sovereignty, water fill, special region, and dev selection in one owner.",
    "Adding click-selection transaction owner/helper/controller/adapter files under `js/core/**`.",
  ]) {
    assertIncludes(docSource, token, "P54 doc must lock boundary token");
  }
});

test("click entry remains in map_renderer and event binding keeps injected dispatch", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const eventBindingOwnerSource = readRepoFile(MAP_INTERACTION_EVENT_BINDING_OWNER_PATH);
  const interactionFunnelSource = readRepoFile(INTERACTION_FUNNEL_PATH);
  const handleClickSource = extractFunctionSource(rendererSource, "handleClick");

  assertIncludes(rendererSource, "async function handleClick(event, _interactionContext = null)", "map_renderer must keep click handler entry");
  assertIncludes(rendererSource, "mapClick: handleClick", "map_renderer must inject click handler");
  assertIncludes(rendererSource, "dispatchMapClick", "map_renderer must keep click dispatcher wiring");

  for (const token of [
    "requireFunction(helpers, \"bindInteractionFunnel\")({",
    "mapClick: requireFunction(handlers, \"mapClick\")",
    "mapDoubleClick: requireFunction(handlers, \"mapDoubleClick\")",
    "interactionRect.on(\"click\", requireFunction(handlers, \"dispatchMapClick\"));",
    "interactionRect.on(\"dblclick\", requireFunction(handlers, \"dispatchMapDoubleClick\"));",
  ]) {
    assertIncludes(eventBindingOwnerSource, token, "event binding owner must keep injected click binding token");
  }
  for (const token of [
    "let mapClickImpl = null;",
    "export function bindInteractionFunnel({",
    "mapClickImpl = typeof mapClick === \"function\" ? mapClick : null;",
    "export function dispatchMapClick(event)",
    "debugState.lastClickContext = buildMapInteractionContext(\"click\", event);",
    "return mapClickImpl(event, debugState.lastClickContext);",
  ]) {
    assertIncludes(interactionFunnelSource, token, "interaction funnel must keep click dispatch token");
  }
  assertIncludes(handleClickSource, "getHitFromEvent(event, {", "handleClick must keep hit resolution");
  assertIncludes(handleClickSource, "eventType: \"click\"", "handleClick must resolve click hit type");
});

test("land water special and empty click branches remain in map_renderer", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const handleClickSource = extractFunctionSource(rendererSource, "handleClick");
  const applyWaterRegionFillSource = extractFunctionSource(rendererSource, "applyWaterRegionFill");
  const applyVisualSubdivisionFillSource = extractFunctionSource(rendererSource, "applyVisualSubdivisionFill");

  for (const token of [
    "if (!id) {",
    stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";"),
    "requestInteractionRender(\"clear-water-selection-empty-click\")",
    stateWriteToken("runtimeState", "selectedSpecialRegionId", " = \"\";"),
    "requestInteractionRender(\"clear-special-selection-empty-click\")",
    "if (hit.targetType === \"special\") {",
    stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";"),
    stateWriteToken("runtimeState", "selectedSpecialRegionId", " = id;"),
    "requestInteractionRender(\"select-special-region\")",
    "if (hit.targetType === \"water\") {",
    "const isSelectionToggle = !!(event?.ctrlKey || event?.metaKey);",
    "requestInteractionRender(\"water-selection-toggle-off\")",
    "requestInteractionRender(\"water-selection-toggle-on\")",
    "requestInteractionRender(\"click-select-open-ocean\")",
    "markDirty(\"erase-water-region-color\")",
    "commitHistoryEntry({",
    "requestInteractionRender(\"click-erase-water\")",
    "applyWaterRegionFill(id, runtimeState.selectedColor, {",
    "requestInteractionRender(\"clear-water-selection-land-click\")",
    "requestInteractionRender(\"clear-special-selection-land-click\")",
    "const changedSelection = toggleFeatureInDevSelection(landId);",
    "await ensureLeafDetailReady(countryCode, { announce: true })",
    "markDirty(\"erase-sovereignty\")",
    "markDirty(\"erase-country-color\")",
    "markDirty(\"erase-feature-color\")",
    "requestInteractionRender(\"click-erase\")",
    "markDirty(\"fill-sovereignty\")",
    "markDirty(\"fill-country-color\")",
    "requestInteractionRender(\"click-fill\")",
  ]) {
    assertIncludes(handleClickSource, token, "handleClick must keep current click branch token");
  }

  for (const token of [
    stateWriteToken("runtimeState", "selectedWaterRegionId", " = resolvedId;"),
    "runtimeState.waterRegionOverrides[resolvedId] = color;",
    "markDirty(dirtyReason);",
    "commitHistoryEntry({",
    "requestInteractionRender(kind);",
    "refreshSidebarAfterPaint({ waterRegionIds: [resolvedId] });",
  ]) {
    assertIncludes(applyWaterRegionFillSource, token, "water fill helper must keep transaction token");
  }

  for (const token of [
    "const historyBefore = captureHistoryState({",
    "applyFeatureVisualOverrideTransaction(resolvedIds, color, {",
    "markDirty(dirtyReason);",
    "commitHistoryEntry({",
    "addRecentColor(color);",
    "requestInteractionRender(kind);",
    "refreshSidebarAfterPaint({ featureIds: resolvedIds });",
  ]) {
    assertIncludes(applyVisualSubdivisionFillSource, token, "land visual fill helper must keep transaction token");
  }
});

test("dev selection and fill remain in map_renderer and public facade stays stable", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const publicFacadeSource = readRepoFile(PUBLIC_FACADE_PATH);

  for (const token of [
    "function updateDevSelectedHit(hit = null)",
    "function addFeatureToDevSelection(featureId)",
    "function toggleFeatureInDevSelection(featureId)",
    "function removeLastDevSelection()",
    "function clearDevSelection()",
    "function applyDevMacroFillCurrentCountry()",
    "function applyDevMacroFillCurrentParentGroup()",
    "function applyDevMacroFillCurrentOwnerScope()",
    "function applyDevSelectionFill()",
    "requestInteractionRender(\"dev-selection-add\")",
    "requestInteractionRender(\"dev-selection-toggle\")",
    "requestInteractionRender(\"dev-selection-clear\")",
    "applyDevLandBatchAction(ids, {",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep dev selection/fill token");
  }

  for (const token of [
    "addFeatureToDevSelection,",
    "applyDevMacroFillCurrentCountry,",
    "applyDevMacroFillCurrentOwnerScope,",
    "applyDevMacroFillCurrentParentGroup,",
    "applyDevSelectionFill,",
    "clearDevSelection,",
    "removeLastDevSelection,",
    "toggleFeatureInDevSelection,",
    "from \"../map_renderer.js\";",
  ]) {
    assertIncludes(publicFacadeSource, token, "public facade must keep current dev selection/fill export");
  }
});

test("hit candidates stay pure and hover owner does not own click selection", () => {
  const hitCandidatesSource = readRepoFile(INTERACTION_HIT_CANDIDATES_PATH);
  const hoverOwnerSource = readRepoFile(MAP_HOVER_INTERACTION_OWNER_PATH);

  for (const token of [
    "runtimeState",
    "state.",
    "document",
    "window",
    "map_renderer.js",
    "markDirty",
    "captureHistoryState",
    "pushHistoryEntry",
    "commitHistoryEntry",
    "requestInteractionRender",
    "selectedWaterRegionId",
    "selectedSpecialRegionId",
  ]) {
    assertExcludes(hitCandidatesSource, token, "interaction_hit_candidates must remain pure");
  }
  for (const token of [
    "function handleMouseMove(event)",
    "\"getHitFromEvent\"",
    "\"updateDevHoverHit\"",
    "\"queueTooltipUpdate\"",
  ]) {
    assertIncludes(hoverOwnerSource, token, "hover owner must keep hover-only token");
  }
  for (const token of [
    "handleClick",
    "dispatchMapClick",
    "selectedWaterRegionId",
    "selectedSpecialRegionId",
    "toggleFeatureInDevSelection",
    "applyWaterRegionFill",
    "applyVisualSubdivisionFill",
    "markDirty",
    "commitHistoryEntry",
    "pushHistoryEntry",
  ]) {
    assertExcludes(hoverOwnerSource, token, "hover owner must not own click/selection token");
  }
});

test("history dirty and render refresh calls remain in current paths", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const historyManagerSource = readRepoFile(HISTORY_MANAGER_PATH);
  const dirtyStateSource = readRepoFile(DIRTY_STATE_PATH);
  const handleClickSource = extractFunctionSource(rendererSource, "handleClick");

  for (const token of [
    "import { captureHistoryState, pushHistoryEntry } from \"./history_manager.js\";",
    "import { markDirty } from \"./dirty_state.js\";",
    "function commitHistoryEntry({ kind, before, after, affectsSovereignty = false } = {})",
    "pushHistoryEntry({",
    "function requestInteractionRender(reason = \"interaction\")",
    "getRenderRequestBoundaryOwner().requestInteractionRenderBoundary(reason).completed;",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must keep history/dirty/render wrapper token");
  }
  for (const token of [
    "captureHistoryState({",
    "markDirty(",
    "commitHistoryEntry({",
    "requestInteractionRender(",
    "refreshSidebarAfterPaint(",
  ]) {
    assertIncludes(handleClickSource, token, "handleClick must keep transaction side-effect token");
  }
  for (const token of [
    "function captureHistoryState({",
    "function pushHistoryEntry(entry)",
    "function hasHistoryDelta(before, after)",
    "function applyHistorySnapshot(snapshot, direction, entry)",
  ]) {
    assertIncludes(historyManagerSource, token, "history manager must keep current ownership token");
  }
  for (const token of [
    "function markDirty(reason = \"\")",
    "markDirtyState(runtimeState, reason);",
    "updateDirtyIndicator();",
  ]) {
    assertIncludes(dirtyStateSource, token, "dirty state must keep current ownership token");
  }
});

test("P54 keeps facade state allowlist production runtime dist and click owner topology unchanged", () => {
  const packageJsonSource = readRepoFile("package.json");
  const publicFacadeSource = readRepoFile(PUBLIC_FACADE_PATH);
  const stateWriteAllowlistSource = readRepoFile(STATE_WRITE_ALLOWLIST_PATH);

  assertIncludes(
    packageJsonSource,
    "\"test:node:renderer-click-selection-transaction-inventory\": \"node --test tests/renderer_click_selection_transaction_inventory_boundary.test.mjs\"",
    "package.json must expose P54 inventory script",
  );
  for (const token of [
    "click_selection_transaction",
    "renderer_click_selection_transaction",
    "clickSelectionTransaction",
    "mapClickSelection",
  ]) {
    assertExcludes(publicFacadeSource, token, "public facade must not expose P54 forbidden owner token");
    assertExcludes(stateWriteAllowlistSource, token, "state-write allowlist must not include P54 forbidden owner token");
  }

  for (const relativePath of [
    "js/core/map_renderer/click_selection_transaction_owner.js",
    "js/core/map_renderer/click_selection_transaction_helper.js",
    "js/core/map_renderer/click_selection_transaction_controller.js",
    "js/core/map_renderer/click_selection_transaction_adapter.js",
    "js/core/renderer/click_selection_transaction_owner.js",
    "js/core/renderer/click_selection_transaction_helper.js",
    "js/core/renderer/click_selection_transaction_controller.js",
    "js/core/renderer/click_selection_transaction_adapter.js",
  ]) {
    assert.equal(repoFileExists(relativePath), false, `P54 must not add production click selection owner/helper: ${relativePath}`);
  }
  for (const sourcePath of listRepoSourceFiles("js/core")) {
    assert.equal(
      isForbiddenClickSelectionTransactionOwnerPath(sourcePath),
      false,
      `P54 must not add renamed production click selection transaction owner/helper: ${sourcePath}`,
    );
  }

  const immutableDiff = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--",
      "dist",
      MAP_RENDERER_PATH,
      PUBLIC_FACADE_PATH,
      STATE_WRITE_ALLOWLIST_PATH,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  assert.deepEqual(immutableDiff, [], "P54 must not modify production runtime, public facade, state allowlist, or dist");
});
