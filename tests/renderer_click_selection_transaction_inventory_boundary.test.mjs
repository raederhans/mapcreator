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
const P1_7_DOC_PATH = "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md";
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

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker to exist: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected end marker to exist after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function sliceFrom(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker to exist: ${startMarker}`);
  return source.slice(start);
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

const ORDERED_STEP_CATEGORIES = new Set([
  "sync-read-only",
  "sync-effectful",
  "async-read-only",
  "async-effectful",
]);
const step = Object.freeze({
  syncReadOnly: (reason, token) => ({ category: "sync-read-only", reason, token }),
  syncEffectful: (reason, token) => ({ category: "sync-effectful", reason, token }),
  asyncReadOnly: (reason, token) => ({ category: "async-read-only", reason, token }),
  asyncEffectful: (reason, token) => ({ category: "async-effectful", reason, token }),
});

function assertOrderedSteps(source, steps, message) {
  let cursor = -1;
  const reasons = new Set();
  const tokens = new Set();
  const classifications = new Set();
  for (const orderedStep of steps) {
    assert.deepEqual(
      Object.keys(orderedStep).sort(),
      ["category", "reason", "token"],
      `${message}: ordered step must use the exact category/reason/token schema`,
    );
    const { category, reason, token } = orderedStep;
    assert.equal(ORDERED_STEP_CATEGORIES.has(category), true, `${message}: invalid category ${JSON.stringify(category)}`);
    assert.equal(typeof reason === "string" && reason.length > 0, true, `${message}: reason must be nonempty`);
    assert.equal(typeof token === "string" && token.length > 0, true, `${message}: token must be nonempty`);
    assert.equal(reasons.has(reason), false, `${message}: duplicate reason ${JSON.stringify(reason)}`);
    assert.equal(tokens.has(token), false, `${message}: duplicate token ${JSON.stringify(token)}`);
    const classification = `${category}\u0000${reason}\u0000${token}`;
    assert.equal(
      classifications.has(classification),
      false,
      `${message}: duplicate classification ${JSON.stringify(classification)}`,
    );
    reasons.add(reason);
    tokens.add(token);
    classifications.add(classification);
    const next = source.indexOf(token, cursor + 1);
    assert.notEqual(
      next,
      -1,
      `${message} (${reason}): missing or out-of-order token ${JSON.stringify(token)}`,
    );
    cursor = next;
  }
}

const RETURN_STATEMENT_LINE_PATTERN = /^(?:if\s*\(.+\)\s*)?return(?:\s+[^;\r\n]+)?;\s*$/;

function maskStringAndCommentContent(source) {
  let result = "";
  let mode = "code";
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (mode === "line-comment") {
      if (character === "\n") {
        mode = "code";
        result += "\n";
      } else {
        result += " ";
      }
      continue;
    }

    if (mode === "block-comment") {
      if (character === "*" && nextCharacter === "/") {
        result += "  ";
        index += 1;
        mode = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (mode === "string") {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        mode = "code";
        quote = "";
      }
      result += character === "\n" ? "\n" : " ";
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      result += "  ";
      index += 1;
      mode = "line-comment";
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      result += "  ";
      index += 1;
      mode = "block-comment";
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      result += " ";
      mode = "string";
      quote = character;
      continue;
    }

    result += character;
  }

  return result;
}

function assertReturnStatementCount(source, expectedCount, message) {
  const returnStatementLines = maskStringAndCommentContent(source)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => RETURN_STATEMENT_LINE_PATTERN.test(line));
  assert.equal(
    returnStatementLines.length,
    expectedCount,
    `${message}: expected ${expectedCount} line-scoped return statements, found ${returnStatementLines.length}: ${JSON.stringify(returnStatementLines)}`,
  );
}

test("return counter recognizes single-line expressions and masks strings and comments", () => {
  const fixtureSource = [
    "return;",
    "return false;",
    "return resolvedValue;",
    "if (ready) return resolveValue();",
    'return "value;with-semicolon"; // trailing comment',
    "// return ignoredLineComment;",
    "/*",
    "return ignoredBlockComment;",
    "*/",
    "const ignoredTemplate = `",
    "return ignoredTemplateContent;",
    "`;",
  ].join("\n");

  assertReturnStatementCount(fixtureSource, 5, "return counter fixture");
});

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("P54 doc exists and locks required click selection transaction headings", () => {
  const docSource = readRepoFile(DOC_PATH);
  const p1_7DocSource = readRepoFile(P1_7_DOC_PATH);

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
  for (const token of [
    "`resolvedHit` has exactly four own keys: `targetType`, `id`, `countryCode`, and `runtimeCountryCode`.",
    "Every `resolvedHit` value is a scalar string or `null`; `targetType` accepts exactly `\"land\"`, `\"water\"`, `\"special\"`, or `null`.",
    "The current empty-hit contract is `targetType: null`, `id: null`, `countryCode: null`, and `runtimeCountryCode: null`.",
    "Missing or blank `id`, `countryCode`, and `runtimeCountryCode` inputs normalize to `null`.",
    "`readonlyModifiers` has exactly four own keys: `ctrlKey`, `metaKey`, `shiftKey`, and `altKey`, and every value is a boolean.",
    "Root creates `readonlyModifiers` with exactly those four boolean own keys and freezes it with `Object.freeze` before calling the pure seam.",
    "Extra own keys, object values, functions, DOM/Event values, and nested values are rejected.",
    "The output has exactly two own keys: `{ decision, target }`.",
    "`decision` is exactly `{ devSelectionRequested: boolean }`.",
    "An empty target is exactly `{ kind: \"empty\" }`.",
    "A nonempty target is exactly `{ kind, id, countryCode, runtimeCountryCode }`.",
    "`target.kind` accepts exactly `\"empty\"`, `\"land\"`, `\"water\"`, or `\"special\"`.",
    "Nonempty `id`, `countryCode`, and `runtimeCountryCode` values are scalar strings or `null`; missing or blank identity values normalize to `null`.",
    "`devSelectionRequested = target.kind === \"land\" && (readonlyModifiers.ctrlKey || readonlyModifiers.metaKey)`.",
    "Root consumes only returned `target.kind` and `target.id` for admission, and only returned `decision.devSelectionRequested` for the dev-selection branch.",
    "Raw hit data becomes available only after returned-target admission for root-owned lookup, hydration, refreshed-hit resolution, and effects.",
  ]) {
    assertIncludes(p1_7DocSource, token, "P1.7 doc must lock the future click-selection seam");
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

test("handleClick keeps the global branch spine and branch-local transaction order", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const handleClickSource = sliceBetween(
    rendererSource,
    "async function handleClick(event, _interactionContext = null)",
    "async function handleDoubleClick(event, _interactionContext = null)",
  );

  assertOrderedSteps(handleClickSource, [
    step.syncReadOnly("readonly admission", "if (runtimeState.startupReadonly) {"),
    step.syncReadOnly("action timing starts", "const actionStart = nowMs();"),
    step.syncReadOnly("data availability guard", "if (!runtimeState.landData && !runtimeState.waterRegionsData && !runtimeState.scenarioSpecialRegionsData) return;"),
    step.syncReadOnly("brush click suppression guard", "if (suppressNextClickAfterBrush) {"),
    step.syncEffectful("brush click suppression reset", "suppressNextClickAfterBrush = false;"),
    step.syncEffectful("onboarding hint dismissal", "dismissOnboardingHint();"),
    step.syncReadOnly("intensity tool guard", "if (getIntensityFieldTool().active) {"),
    step.syncReadOnly("special zone editor guard", "if (runtimeState.specialZoneEditor?.active) {"),
    step.syncEffectful("special zone editor action", "appendSpecialZoneVertexFromEvent(event);"),
    step.syncReadOnly("operational line editor guard", "if (runtimeState.operationalLineEditor?.active) {"),
    step.syncEffectful("operational line editor action", "appendOperationalLineVertexFromEvent(event);"),
    step.syncReadOnly("operation graphics editor guard", "if (runtimeState.operationGraphicsEditor?.active) {"),
    step.syncEffectful("operation graphics editor action", "appendOperationGraphicVertexFromEvent(event);"),
    step.syncReadOnly("unit counter editor guard", "if (runtimeState.unitCounterEditor?.active) {"),
    step.syncEffectful("unit counter editor action", "placeUnitCounterFromEvent(event);"),
    step.syncReadOnly("HGO click guard", "const hgoRuntimeClick = inspectHgoRuntimePreviewFromEvent(event, { eventType: \"click\" });"),
    step.syncReadOnly("HGO active admission", "if (hgoRuntimeClick.active) {"),
    step.syncReadOnly("facility click guard", "const clickedFacilityEntry = getHoveredFacilityEntryFromEvent(event);"),
    step.syncReadOnly("facility details admission", "if (clickedFacilityEntry && isFacilityDetailsSurfaceActive(clickedFacilityEntry.familyId)) {"),
    step.syncReadOnly("facility block-underlying admission", "if (clickedFacilityEntry && shouldBlockUnderlyingSelectionForFacility(clickedFacilityEntry)) {"),
    step.syncReadOnly("selected facility clear admission", "\n  if (selectedFacilityEntry) {"),
    step.syncReadOnly("root hit resolution", "const hit = getHitFromEvent(event, {"),
    step.syncReadOnly("resolved id admission", "const id = hit.id;"),
    step.syncReadOnly("empty branch", "if (!id) {"),
    step.syncEffectful("dev hit update", "updateDevSelectedHit(hit);"),
    step.syncEffectful("special-zone membership", "if (handleSpecialZoneMembershipClick(hit, event)) return;"),
    step.syncReadOnly("special branch", "if (hit.targetType === \"special\") {"),
    step.syncReadOnly("water branch", "if (hit.targetType === \"water\") {"),
    step.syncReadOnly("land clears water selection", "if (runtimeState.selectedWaterRegionId) {"),
    step.syncReadOnly("land clears special selection", "if (runtimeState.selectedSpecialRegionId) {"),
    step.syncReadOnly("land hit admission", "let landHit = hit;"),
    step.syncReadOnly("land feature lookup", "let feature = runtimeState.landIndex.get(landId);"),
    step.syncReadOnly("dev selection branch", "if (event?.ctrlKey || event?.metaKey) {"),
    step.asyncEffectful("async detail hydration", "if (!(await ensureLeafDetailReady(countryCode, { announce: true }))) {"),
    step.syncReadOnly("refreshed hit resolution", "const refreshedHit = getHitFromEvent(event, {"),
    step.syncReadOnly("target expansion", "const targetIds = resolveInteractionTargetIds(feature, landId);"),
    step.syncReadOnly("preset admission", "if (runtimeState.isEditingPreset) {"),
    step.syncReadOnly("land eraser branch", "if (runtimeState.currentTool === \"eraser\") {"),
    step.syncReadOnly("land eyedropper branch", "if (runtimeState.currentTool === \"eyedropper\") {"),
    step.syncReadOnly("land fill color", "const selectedColor = getSafeCanvasColor(runtimeState.selectedColor, LAND_FILL_COLOR);"),
    step.syncReadOnly("land fill admission", "if (isSovereigntyModeActive()) {"),
    step.syncReadOnly("country fill admission", "} else if (runtimeState.interactionGranularity === \"country\" && countryCode) {"),
    step.syncEffectful("feature fill delegation", "applyVisualSubdivisionFill(targetIds, selectedColor, {"),
    step.syncEffectful("fill recent color", "addRecentColor(selectedColor);"),
    step.syncEffectful("fill render request", "requestInteractionRender(\"click-fill\");"),
    step.syncEffectful("fill metric", "noteRenderAction(\"click-fill\", actionStart);"),
  ], "handleClick must keep the global branch spine");

  const hgoActiveSource = sliceBetween(
    handleClickSource,
    "if (hgoRuntimeClick.active) {",
    "const clickedFacilityEntry = getHoveredFacilityEntryFromEvent(event);",
  );
  assertOrderedSteps(hgoActiveSource, [
    step.syncReadOnly("HGO local admission", "if (hgoRuntimeClick.active) {"),
    step.syncEffectful("HGO prevent default", "if (event?.preventDefault) event.preventDefault();"),
    step.syncEffectful("HGO dev hit update", "updateDevSelectedHit(hgoRuntimeClick.hit?.id ? hgoRuntimeClick.hit : null);"),
    step.syncEffectful("HGO hovered land clear", stateWriteToken("runtimeState", "hoveredId", " = null;")),
    step.syncEffectful("HGO hovered water clear", stateWriteToken("runtimeState", "hoveredWaterRegionId", " = null;")),
    step.syncEffectful("HGO hovered special clear", stateWriteToken("runtimeState", "hoveredSpecialRegionId", " = null;")),
    step.syncEffectful("HGO tooltip clear", "queueTooltipUpdate({ visible: false });"),
    step.syncEffectful("HGO overlay dirty", stateWriteToken("runtimeState", "hoverOverlayDirty", " = true;")),
    step.syncEffectful("HGO overlay render", "renderHoverOverlayIfNeeded({ eventType: \"hgo-runtime-preview-click\" });"),
    step.syncEffectful("HGO interaction render", "requestInteractionRender(\"hgo-runtime-preview-click\");"),
    step.syncEffectful("HGO metric", "noteRenderAction(hgoRuntimeClick.hit?.id ? \"hgo-runtime-preview-select\" : \"hgo-runtime-preview-empty\", actionStart);"),
    step.syncReadOnly("HGO branch return", "return;"),
  ], "HGO active branch must keep selection, clear, render, metric, and return order");
  assertReturnStatementCount(hgoActiveSource, 1, "HGO active branch return contract");

  const facilityDetailsSource = sliceBetween(
    handleClickSource,
    "if (clickedFacilityEntry && isFacilityDetailsSurfaceActive(clickedFacilityEntry.familyId)) {",
    "if (clickedFacilityEntry && shouldBlockUnderlyingSelectionForFacility(clickedFacilityEntry)) {",
  );
  assertOrderedSteps(facilityDetailsSource, [
    step.syncReadOnly("facility details local admission", "if (clickedFacilityEntry && isFacilityDetailsSurfaceActive(clickedFacilityEntry.familyId)) {"),
    step.syncEffectful("facility details hover selection", "hoveredFacilityEntry = clickedFacilityEntry;"),
    step.syncEffectful("facility details card selection", "selectedFacilityEntry = clickedFacilityEntry;"),
    step.syncEffectful("facility details collapse", "facilityInfoCardExpanded = false;"),
    step.syncEffectful("facility details tooltip clear", "queueTooltipUpdate({ visible: false });"),
    step.syncEffectful("facility details card render", "applyFacilityInfoCardState(clickedFacilityEntry, {"),
    step.syncEffectful("facility details overlay dirty", stateWriteToken("runtimeState", "hoverOverlayDirty", " = true;")),
    step.syncEffectful("facility details overlay render", "renderHoverOverlayIfNeeded({ eventType: \"facility-card-open\" });"),
    step.syncEffectful("facility details metric", "noteRenderAction(\"click-facility-info\", actionStart);"),
    step.syncReadOnly("facility details return", "return;"),
  ], "facility details branch must keep card, overlay, metric, and return order");
  assertReturnStatementCount(facilityDetailsSource, 1, "facility details branch return contract");

  const facilityBlockSource = sliceBetween(
    handleClickSource,
    "if (clickedFacilityEntry && shouldBlockUnderlyingSelectionForFacility(clickedFacilityEntry)) {",
    "\n  if (selectedFacilityEntry) {",
  );
  assertOrderedSteps(facilityBlockSource, [
    step.syncReadOnly("facility block local admission", "if (clickedFacilityEntry && shouldBlockUnderlyingSelectionForFacility(clickedFacilityEntry)) {"),
    step.syncEffectful("facility block hover selection", "hoveredFacilityEntry = clickedFacilityEntry;"),
    step.syncReadOnly("facility block card clear admission", "if (selectedFacilityEntry) {"),
    step.syncEffectful("facility block card selection clear", "selectedFacilityEntry = null;"),
    step.syncEffectful("facility block card clear", "applyFacilityInfoCardState(null);"),
    step.syncEffectful("facility block tooltip clear", "queueTooltipUpdate({ visible: false });"),
    step.syncEffectful("facility block overlay dirty", stateWriteToken("runtimeState", "hoverOverlayDirty", " = true;")),
    step.syncEffectful("facility block overlay render", "renderHoverOverlayIfNeeded({ eventType: \"facility-click-block-underlying\" });"),
    step.syncEffectful("facility block metric", "noteRenderAction(\"click-facility-block-underlying\", actionStart);"),
    step.syncReadOnly("facility block return", "return;"),
  ], "facility block-underlying branch must keep card clear, overlay, metric, and return order");
  assertReturnStatementCount(facilityBlockSource, 1, "facility block-underlying branch return contract");

  const selectedFacilityClearSource = sliceBetween(
    handleClickSource,
    "\n  if (selectedFacilityEntry) {",
    "const hit = getHitFromEvent(event, {",
  );
  assertOrderedSteps(selectedFacilityClearSource, [
    step.syncReadOnly("selected facility local admission", "\n  if (selectedFacilityEntry) {"),
    step.syncEffectful("selected facility selection clear", "selectedFacilityEntry = null;"),
    step.syncEffectful("selected facility card clear", "applyFacilityInfoCardState(null);"),
    step.syncEffectful("selected facility overlay dirty", stateWriteToken("runtimeState", "hoverOverlayDirty", " = true;")),
    step.syncEffectful("selected facility overlay render", "renderHoverOverlayIfNeeded({ eventType: \"facility-card-clear\" });"),
  ], "selected facility clear branch must keep card and overlay clear order");
  assertReturnStatementCount(selectedFacilityClearSource, 0, "selected facility clear branch return contract");

  const emptyBranchSource = sliceBetween(handleClickSource, "if (!id) {", "updateDevSelectedHit(hit);");
  assertOrderedSteps(emptyBranchSource, [
    step.syncReadOnly("empty water admission", "if (runtimeState.selectedWaterRegionId) {"),
    step.syncReadOnly("empty water previous id", "const previousWaterRegionId = String(runtimeState.selectedWaterRegionId || \"\").trim();"),
    step.syncEffectful("empty water clear", stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";")),
    step.syncEffectful("empty water sidebar", "refreshWaterRegionSidebarRowsNow([previousWaterRegionId]);"),
    step.syncEffectful("empty water render", "requestInteractionRender(\"clear-water-selection-empty-click\")"),
    step.syncReadOnly("empty special admission", "if (runtimeState.selectedSpecialRegionId) {"),
    step.syncReadOnly("empty special previous id", "const previousSpecialRegionId = String(runtimeState.selectedSpecialRegionId || \"\").trim();"),
    step.syncEffectful("empty special clear", stateWriteToken("runtimeState", "selectedSpecialRegionId", " = \"\";")),
    step.syncEffectful("empty special sidebar", "refreshSpecialRegionSidebarRowsNow([previousSpecialRegionId]);"),
    step.syncEffectful("empty special render", "requestInteractionRender(\"clear-special-selection-empty-click\")"),
  ], "empty click branch must keep clear order");
  assertReturnStatementCount(emptyBranchSource, 1, "empty click branch return contract");

  const specialBranchSource = sliceBetween(
    handleClickSource,
    "if (hit.targetType === \"special\") {",
    "if (hit.targetType === \"water\") {",
  );
  assertOrderedSteps(specialBranchSource, [
    step.syncReadOnly("special lookup", "const specialFeature = runtimeState.specialRegionsById.get(id);"),
    step.syncReadOnly("special lookup admission", "if (!specialFeature) return;"),
    step.syncReadOnly("special previous water", "const previousWaterRegionId = String(runtimeState.selectedWaterRegionId || \"\").trim();"),
    step.syncReadOnly("special previous special", "const previousSpecialRegionId = String(runtimeState.selectedSpecialRegionId || \"\").trim();"),
    step.syncEffectful("special water clear", stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";")),
    step.syncEffectful("special selection write", stateWriteToken("runtimeState", "selectedSpecialRegionId", " = id;")),
    step.syncEffectful("special water sidebar", "if (previousWaterRegionId) refreshWaterRegionSidebarRowsNow([previousWaterRegionId]);"),
    step.syncEffectful("special sidebar", "refreshSpecialRegionSidebarRowsNow([previousSpecialRegionId, id]);"),
    step.syncEffectful("special selection render", "requestInteractionRender(\"select-special-region\")"),
    step.syncReadOnly("special eyedropper admission", "if (runtimeState.currentTool === \"eyedropper\") {"),
    step.syncReadOnly("special eyedropper color", "const picked = getSpecialRegionColor(id, specialFeature);"),
    step.syncEffectful("special selected color write", stateWriteToken("runtimeState", "selectedColor", " = picked;")),
    step.syncEffectful("special swatch refresh", "runtimeState.updateSwatchUIFn();"),
    step.syncEffectful("special eyedropper metric", "noteRenderAction(\"eyedropper-special\", actionStart);"),
    step.syncEffectful("special selection metric", "noteRenderAction(\"select-special-region\", actionStart);"),
  ], "special click branch must keep selection and eyedropper order");
  assertReturnStatementCount(specialBranchSource, 3, "special click branch return contract");

  const waterBranchSource = sliceBetween(
    handleClickSource,
    "if (hit.targetType === \"water\") {",
    "if (runtimeState.selectedWaterRegionId) {",
  );
  assertOrderedSteps(waterBranchSource, [
    step.syncReadOnly("water lookup", "const waterFeature = runtimeState.waterRegionsById.get(id);"),
    step.syncReadOnly("water lookup admission", "if (!waterFeature) return;"),
    step.syncReadOnly("water previous special", "const previousSpecialRegionId = String(runtimeState.selectedSpecialRegionId || \"\").trim();"),
    step.syncReadOnly("water previous water", "const previousWaterRegionId = String(runtimeState.selectedWaterRegionId || \"\").trim();"),
    step.syncReadOnly("water toggle decision", "const isSelectionToggle = !!(event?.ctrlKey || event?.metaKey);"),
    step.syncEffectful("water special clear", stateWriteToken("runtimeState", "selectedSpecialRegionId", " = \"\";")),
    step.syncReadOnly("water toggle-off admission", "if (isSelectionToggle && previousWaterRegionId === id) {"),
    step.syncEffectful("water toggle-off clear", stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";")),
    step.syncEffectful("water toggle-off render", "requestInteractionRender(\"water-selection-toggle-off\")"),
    step.syncEffectful("water toggle-off metric", "noteRenderAction(\"water-selection-toggle-off\", actionStart);"),
    step.syncEffectful("water selection write", stateWriteToken("runtimeState", "selectedWaterRegionId", " = id;")),
    step.syncEffectful("water selection sidebar", "refreshWaterRegionSidebarRowsNow([previousWaterRegionId, id]);"),
    step.syncReadOnly("water toggle-on admission", "if (isSelectionToggle) {"),
    step.syncEffectful("water toggle-on render", "requestInteractionRender(\"water-selection-toggle-on\")"),
    step.syncEffectful("water toggle-on metric", "noteRenderAction(\"water-selection-toggle-on\", actionStart);"),
    step.syncReadOnly("macro ocean admission", "if (macroOceanSelectionOnly) {"),
    step.syncEffectful("macro ocean render", "requestInteractionRender(\"click-select-open-ocean\")"),
    step.syncEffectful("macro ocean metric", "noteRenderAction(\"click-select-open-ocean\", actionStart);"),
    step.syncReadOnly("water eraser admission", "if (runtimeState.currentTool === \"eraser\") {"),
    step.syncReadOnly("water eraser history", "const historyBefore = captureHistoryState({ waterRegionIds: [id] });"),
    step.syncEffectful("water eraser mutation", "delete runtimeState.waterRegionOverrides[id];"),
    step.syncEffectful("water eraser dirty", "markDirty(\"erase-water-region-color\")"),
    step.syncEffectful("water eraser history commit", "kind: \"erase-water-region-color\","),
    step.syncEffectful("water eraser render", "requestInteractionRender(\"click-erase-water\")"),
    step.syncEffectful("water eraser sidebar", "refreshSidebarAfterPaint({ waterRegionIds: [id] });"),
    step.syncEffectful("water eraser metric", "noteRenderAction(\"click-erase-water\", actionStart);"),
    step.syncReadOnly("water eyedropper admission", "if (runtimeState.currentTool === \"eyedropper\") {"),
    step.syncReadOnly("water eyedropper color", "const picked = getWaterRegionColor(id);"),
    step.syncEffectful("water selected color write", stateWriteToken("runtimeState", "selectedColor", " = picked;")),
    step.syncEffectful("water eyedropper render", "requestInteractionRender(\"eyedropper-water\")"),
    step.syncEffectful("water eyedropper metric", "noteRenderAction(\"eyedropper-water\", actionStart);"),
    step.syncEffectful("water fill delegation", "applyWaterRegionFill(id, runtimeState.selectedColor, {"),
  ], "water click branch must keep selection, erase, eyedropper, and fill order");
  assertReturnStatementCount(waterBranchSource, 7, "water click branch return contract");

  const afterWaterBranchSource = sliceFrom(
    handleClickSource,
    "applyWaterRegionFill(id, runtimeState.selectedColor, {",
  );
  const landSelectionClearSource = sliceBetween(
    afterWaterBranchSource,
    "if (runtimeState.selectedWaterRegionId) {",
    "let countryCode = landHit.countryCode || getFeatureCountryCodeNormalized(feature);",
  );
  assertOrderedSteps(landSelectionClearSource, [
    step.syncReadOnly("land water clear admission", "if (runtimeState.selectedWaterRegionId) {"),
    step.syncReadOnly("land previous water id", "const previousWaterRegionId = String(runtimeState.selectedWaterRegionId || \"\").trim();"),
    step.syncEffectful("land water selection clear", stateWriteToken("runtimeState", "selectedWaterRegionId", " = \"\";")),
    step.syncEffectful("land water sidebar", "refreshWaterRegionSidebarRowsNow([previousWaterRegionId]);"),
    step.syncEffectful("land water clear render", "requestInteractionRender(\"clear-water-selection-land-click\");"),
    step.syncReadOnly("land special clear admission", "if (runtimeState.selectedSpecialRegionId) {"),
    step.syncReadOnly("land previous special id", "const previousSpecialRegionId = String(runtimeState.selectedSpecialRegionId || \"\").trim();"),
    step.syncEffectful("land special selection clear", stateWriteToken("runtimeState", "selectedSpecialRegionId", " = \"\";")),
    step.syncEffectful("land special sidebar", "refreshSpecialRegionSidebarRowsNow([previousSpecialRegionId]);"),
    step.syncEffectful("land special clear render", "requestInteractionRender(\"clear-special-selection-land-click\");"),
    step.syncReadOnly("land hit local", "let landHit = hit;"),
    step.syncReadOnly("land id local", "let landId = id;"),
    step.syncReadOnly("land feature local", "let feature = runtimeState.landIndex.get(landId);"),
  ], "land selection clear must finish before land lookup and dev selection");

  const landTransactionSource = sliceBetween(
    handleClickSource,
    "let landHit = hit;",
    "const selectedColor = getSafeCanvasColor(runtimeState.selectedColor, LAND_FILL_COLOR);",
  );
  const devSelectionSource = sliceBetween(
    landTransactionSource,
    "if (event?.ctrlKey || event?.metaKey) {",
    "let countryCode = landHit.countryCode || getFeatureCountryCodeNormalized(feature);",
  );
  assertOrderedSteps(devSelectionSource, [
    step.syncReadOnly("dev selection modifier admission", "if (event?.ctrlKey || event?.metaKey) {"),
    step.syncEffectful("dev selection prevent default", "if (event?.preventDefault) event.preventDefault();"),
    step.syncEffectful("dev selection toggle", "const changedSelection = toggleFeatureInDevSelection(landId);"),
    step.syncEffectful("dev inspector sync", "syncInspectorCountryToLandSelection(feature, landId, landHit);"),
    step.syncEffectful("dev selection metric", "noteRenderAction(changedSelection ? \"dev-selection-toggle\" : \"dev-selection-sync\", actionStart);"),
  ], "dev-selection branch must keep modifier, toggle, inspector, and metric order");

  const landEraserSource = sliceBetween(
    landTransactionSource,
    "if (runtimeState.currentTool === \"eraser\") {",
    "if (runtimeState.currentTool === \"eyedropper\") {",
  );
  const sovereigntyEraseSource = sliceBetween(
    landEraserSource,
    "if (isSovereigntyModeActive()) {",
    "} else if (runtimeState.interactionGranularity === \"country\" && countryCode) {",
  );
  assertOrderedSteps(sovereigntyEraseSource, [
    step.syncReadOnly("sovereignty erase history", "sovereigntyFeatureIds: targetIds,"),
    step.syncEffectful("sovereignty erase mutation", "const changed = resetFeatureOwnerCodes(targetIds);"),
    step.syncEffectful("sovereignty erase color refresh", "refreshResolvedColorsForFeatures(targetIds, { renderNow: false });"),
    step.syncEffectful("sovereignty erase dirty", "markDirty(\"erase-sovereignty\")"),
    step.syncEffectful("sovereignty erase batch border", "scheduleDynamicBorderRecompute(\"sovereignty-batch-reset\", 90);"),
    step.syncEffectful("sovereignty erase single border", "scheduleDynamicBorderRecompute(\"sovereignty-single-reset\", 150);"),
    step.syncEffectful("sovereignty erase history kind", "kind: \"erase-sovereignty\","),
    step.syncEffectful("sovereignty erase ownership flag", "affectsSovereignty: true,"),
  ], "land sovereignty eraser subpath must keep effect order");
  assertReturnStatementCount(sovereigntyEraseSource, 0, "land sovereignty eraser return contract");

  const countryEraseSource = sliceBetween(
    landEraserSource,
    "} else if (runtimeState.interactionGranularity === \"country\" && countryCode) {",
    "applyFeatureVisualOverrideTransaction(targetIds, null, {",
  );
  assertOrderedSteps(countryEraseSource, [
    step.syncReadOnly("country erase history", "ownerCodes: [countryCode],"),
    step.syncEffectful("country erase sovereign color", "delete runtimeState.sovereignBaseColors[countryCode];"),
    step.syncEffectful("country erase country color", "delete runtimeState.countryBaseColors[countryCode];"),
    step.syncEffectful("country erase legacy state", "markLegacyColorStateDirty();"),
    step.syncEffectful("country erase color refresh", "refreshResolvedColorsForOwners([countryCode], { renderNow: false });"),
    step.syncEffectful("country erase dirty", "markDirty(\"erase-country-color\")"),
    step.syncEffectful("country erase history kind", "kind: \"erase-country-color\","),
  ], "land country eraser subpath must keep effect order");
  assertReturnStatementCount(countryEraseSource, 0, "land country eraser return contract");

  const featureEraseSource = sliceBetween(
    landEraserSource,
    "featureIds: targetIds,",
    "requestInteractionRender(\"click-erase\");",
  );
  assertOrderedSteps(featureEraseSource, [
    step.syncReadOnly("feature erase history", "featureIds: targetIds,"),
    step.syncEffectful("feature erase mutation", "applyFeatureVisualOverrideTransaction(targetIds, null, {"),
    step.syncEffectful("feature erase remove flag", "remove: true,"),
    step.syncEffectful("feature erase input label", "inputLabel: \"erase-feature-color\","),
    step.syncEffectful("feature erase dirty", "markDirty(\"erase-feature-color\")"),
    step.syncEffectful("feature erase history kind", "kind: \"erase-feature-color\","),
  ], "land feature eraser subpath must keep effect order");
  assertReturnStatementCount(featureEraseSource, 0, "land feature eraser return contract");

  assertOrderedSteps(landEraserSource, [
    step.syncEffectful("land eraser branch completion", "requestInteractionRender(\"click-erase\");"),
    step.syncReadOnly("land eraser sidebar admission", "if (shouldRefreshCountryList) {"),
    step.syncEffectful("land eraser sidebar", "refreshSidebarAfterPaint({"),
    step.syncEffectful("land eraser metric", "noteRenderAction(\"click-erase\", actionStart);"),
  ], "land eraser must keep shared render, sidebar, and metric tail");
  assertReturnStatementCount(landEraserSource, 1, "land eraser wrapper return contract");

  const landFillSource = sliceFrom(
    handleClickSource,
    "const selectedColor = getSafeCanvasColor(runtimeState.selectedColor, LAND_FILL_COLOR);",
  );
  assertOrderedSteps(landFillSource, [
    step.syncReadOnly("land fill color resolve", "const selectedColor = getSafeCanvasColor(runtimeState.selectedColor, LAND_FILL_COLOR);"),
    step.syncEffectful("land selected color write", stateWriteToken("runtimeState", "selectedColor", " = selectedColor;")),
    step.syncReadOnly("sovereignty fill admission", "if (isSovereigntyModeActive()) {"),
    step.syncReadOnly("sovereignty fill history", "sovereigntyFeatureIds: targetIds,"),
    step.syncReadOnly("sovereignty fill active owner", "if (!runtimeState.activeSovereignCode) {"),
    step.syncEffectful("sovereignty fill mutation", "const changed = setFeatureOwnerCodes(targetIds, runtimeState.activeSovereignCode);"),
    step.syncEffectful("sovereignty fill dirty", "markDirty(\"fill-sovereignty\")"),
    step.syncEffectful("sovereignty fill history kind", "kind: \"fill-sovereignty\","),
    step.syncReadOnly("country fill admission", "} else if (runtimeState.interactionGranularity === \"country\" && countryCode) {"),
    step.syncReadOnly("country fill history", "ownerCodes: [countryCode],"),
    step.syncEffectful("country sovereign color write", stateWriteToken("runtimeState", "sovereignBaseColors[countryCode]", " = selectedColor;")),
    step.syncEffectful("country base color write", stateWriteToken("runtimeState", "countryBaseColors[countryCode]", " = selectedColor;")),
    step.syncEffectful("country fill legacy state", "markLegacyColorStateDirty();"),
    step.syncEffectful("country fill color refresh", "refreshResolvedColorsForOwners([countryCode], { renderNow: false });"),
    step.syncEffectful("country fill dirty", "markDirty(\"fill-country-color\")"),
    step.syncEffectful("country fill history kind", "kind: \"fill-country-color\","),
    step.syncReadOnly("feature fill click count", "const clickCount = Math.max(1, Number(event?.detail || 1));"),
    step.syncReadOnly("feature fill double-click admission", "if (clickCount >= 2 && isDoubleClickBatchEligible(landHit, feature)) {"),
    step.syncEffectful("feature fill delegation", "applyVisualSubdivisionFill(targetIds, selectedColor, {"),
    step.syncEffectful("feature fill history kind", "kind: \"fill-feature-color\","),
    step.syncEffectful("land fill recent color", "addRecentColor(selectedColor);"),
    step.syncEffectful("land fill render", "requestInteractionRender(\"click-fill\");"),
    step.syncReadOnly("land fill sidebar admission", "if (isSovereigntyModeActive() || (runtimeState.interactionGranularity === \"country\" && countryCode)) {"),
    step.syncEffectful("land fill sidebar", "refreshSidebarAfterPaint({"),
    step.syncEffectful("land fill metric", "noteRenderAction(\"click-fill\", actionStart);"),
  ], "land fill branch must keep mutation, history, render, sidebar, and metric order");
  assertReturnStatementCount(landFillSource, 3, "land fill branch return contract");

  const applyWaterRegionFillSource = extractFunctionSource(rendererSource, "applyWaterRegionFill");
  assertOrderedSteps(applyWaterRegionFillSource, [
    step.syncReadOnly("water fill id normalize", "const resolvedId = String(targetId || \"\").trim();"),
    step.syncReadOnly("water fill default color", "const defaultColor = getWaterRegionDefaultFillColorById(resolvedId);"),
    step.syncReadOnly("water fill color resolve", "const color = getSafeCanvasColor(selectedColor, defaultColor);"),
    step.syncReadOnly("water fill current color", "const currentColor = getWaterRegionColor(resolvedId);"),
    step.syncEffectful("water fill selection write", stateWriteToken("runtimeState", "selectedWaterRegionId", " = resolvedId;")),
    step.syncReadOnly("water fill unchanged admission", "if (currentColor === color) {"),
    step.syncEffectful("water fill unchanged sidebar", "refreshWaterRegionSidebarRowsNow([resolvedId]);"),
    step.syncReadOnly("water fill history", "const historyBefore = captureHistoryState({"),
    step.syncEffectful("water fill override write", stateWriteToken("runtimeState", "waterRegionOverrides[resolvedId]", " = color;")),
    step.syncEffectful("water fill dirty", "markDirty(dirtyReason);"),
    step.syncEffectful("water fill history commit", "commitHistoryEntry({"),
    step.syncEffectful("water fill recent color", "addRecentColor(color);"),
    step.syncEffectful("water fill render", "requestInteractionRender(kind);"),
    step.syncEffectful("water fill sidebar", "refreshSidebarAfterPaint({ waterRegionIds: [resolvedId] });"),
    step.syncEffectful("water fill metric", "noteRenderAction(kind, actionStart);"),
  ], "applyWaterRegionFill must keep transaction order");
  const applyWaterUnchangedSource = sliceBetween(
    applyWaterRegionFillSource,
    "if (currentColor === color) {",
    "const historyBefore = captureHistoryState({",
  );
  assertOrderedSteps(applyWaterUnchangedSource, [
    step.syncEffectful("unchanged water sidebar", "refreshWaterRegionSidebarRowsNow([resolvedId]);"),
    step.syncEffectful("unchanged water render", "requestInteractionRender(kind);"),
    step.syncReadOnly("unchanged water result", "return false;"),
  ], "unchanged water fill must render before returning false");
  assertReturnStatementCount(applyWaterRegionFillSource, 3, "applyWaterRegionFill return contract");

  const applyVisualSubdivisionFillSource = extractFunctionSource(rendererSource, "applyVisualSubdivisionFill");
  assertOrderedSteps(applyVisualSubdivisionFillSource, [
    step.syncReadOnly("visual fill target normalize", "const resolvedIds = normalizeFeatureOverrideTargetIds(targetIds);"),
    step.syncReadOnly("visual fill color resolve", "const color = getSafeCanvasColor(selectedColor, LAND_FILL_COLOR);"),
    step.syncReadOnly("visual fill history", "const historyBefore = captureHistoryState({"),
    step.syncEffectful("visual fill mutation", "applyFeatureVisualOverrideTransaction(resolvedIds, color, {"),
    step.syncEffectful("visual fill input label", "inputLabel: kind || \"fill-feature-color\","),
    step.syncEffectful("visual fill dirty", "markDirty(dirtyReason);"),
    step.syncEffectful("visual fill history commit", "commitHistoryEntry({"),
    step.syncEffectful("visual fill recent color", "addRecentColor(color);"),
    step.syncEffectful("visual fill render", "requestInteractionRender(kind);"),
    step.syncEffectful("visual fill sidebar", "refreshSidebarAfterPaint({ featureIds: resolvedIds });"),
    step.syncEffectful("visual fill metric", "noteRenderAction(kind, actionStart);"),
  ], "applyVisualSubdivisionFill must keep transaction order");
  assertReturnStatementCount(applyVisualSubdivisionFillSource, 2, "applyVisualSubdivisionFill return contract");
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
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      "js",
      "dist",
      STATE_WRITE_ALLOWLIST_PATH,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  assert.deepEqual(immutableDiff, [], "P54 must not modify production runtime, public facade, state allowlist, or dist");
});
