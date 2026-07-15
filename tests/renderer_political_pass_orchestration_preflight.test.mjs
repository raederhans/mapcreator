import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  RENDER_PASS_FAMILY_INVENTORY,
} from "../tools/renderer_pass_family_inventory.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const MAP_RENDERER_PATH = "js/core/map_renderer.js";
const PREFLIGHT_DOC_PATH = "docs/active/renderer-political-pass-preflight-p3-3a-20260714.md";
const FUTURE_OWNER_PATH = "js/core/renderer/political_pass_orchestrator_owner.js";
const PUBLIC_FACADE_PATH = "js/core/map_renderer/public.js";
const RUNTIME_CONTEXT_PATH = "js/core/map_renderer/renderer_runtime_context.js";
const STATE_WRITE_ALLOWLIST_PATH = "tools/eslint-rules/state-writer-allowlist.json";

const PREFLIGHT_HEADINGS = Object.freeze([
  "## Scope and invariants",
  "## Current drawPoliticalPass orchestration",
  "## Worker identity and bitmap path",
  "## Background and missing-land path",
  "## Progressive recovery and color-edit guard",
  "## Fine loop and state-effect ownership",
  "## P3.3b canonical owner contract",
  "## Protected boundaries",
  "## Verification lanes",
  "## Stop rules",
]);

function readRepoFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, ...relativePath.split("/"));
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
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
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) {
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

function extractFunctionSource(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Expected function to exist: ${functionName}`);
  const openBrace = source.indexOf("{", start + marker.length);
  assert.notEqual(openBrace, -1, `Expected function body to start: ${functionName}`);
  const maskedSource = maskStringAndCommentContent(source);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (maskedSource[index] === "{") depth += 1;
    if (maskedSource[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`Expected function body to close: ${functionName}`);
}

function assertOrderedTokens(source, tokens, label) {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    assert.notEqual(next, -1, `${label}: missing or out-of-order token ${JSON.stringify(token)}`);
    cursor = next;
  }
}

function isPoliticalPassOwnerCandidate(sourcePath) {
  const normalized = sourcePath.replaceAll("\\", "/");
  const stem = path.basename(normalized).replace(/\.m?js$/, "").toLowerCase();
  const compact = stem.replace(/[_-]/g, "");
  return compact.includes("political")
    && compact.includes("pass")
    && ["owner", "orchestrator", "controller", "helper", "adapter"].some((token) => compact.includes(token));
}

test("P3.3a document locks the political-pass preflight and P3.3b seam", () => {
  const docSource = readRepoFile(PREFLIGHT_DOC_PATH);
  for (const heading of PREFLIGHT_HEADINGS) {
    assert.ok(docSource.includes(heading), `preflight doc should keep heading ${heading}`);
  }
  for (const token of [
    "P3.3a is preflight only.",
    "Production runtime diff is zero.",
    "The canonical P3.3b owner path is `js/core/renderer/political_pass_orchestrator_owner.js`.",
    "`drawPoliticalPass(k)` remains in `js/core/map_renderer.js` during P3.3a.",
    "Worker identity, packet construction, bitmap commit, and accepted-result repaint remain composition-root effects.",
    "The fine feature loop remains in `map_renderer.js`.",
    "The owner receives explicit getters, helpers, resolvers, and effects; it never receives runtime state, RendererRuntimeContext, DOM, D3, canvas contexts, or an unbounded dependency bag.",
    "P3.3b atomically upgrades this preflight contract from owner-absent to one canonical owner plus one thin wrapper.",
    "`test:e2e:dev:political-progressive-recovery`",
    "`npm run perf:gate`",
    "Stop when extraction requires moving the fine feature loop, worker packet builder, partial repaint, state writes, pass order, public facade, or RendererRuntimeContext.",
  ]) {
    assert.ok(docSource.includes(token), `preflight doc should keep boundary token ${JSON.stringify(token)}`);
  }
});

test("current political pass keeps its exact top-level orchestration order", () => {
  const rendererSource = readRepoFile(MAP_RENDERER_PATH);
  const drawSource = extractFunctionSource(rendererSource, "drawPoliticalPass");
  assertOrderedTokens(drawSource, [
    "if (isHgoRuntimePreviewReady())",
    'recordRenderPerfMetric("drawPoliticalPass", 0, {',
    "const transform = runtimeState.zoomTransform || globalThis.d3?.zoomIdentity;",
    "const [canvasWidth, canvasHeight] = getLogicalCanvasDimensions();",
    "const sceneIdentity = getVisibleFrameIdentity(transform);",
    "const workerIdentity = createPoliticalRasterWorkerIdentity({",
    "recordPoliticalRasterWorkerSnapshot();",
    "const politicalOverscanPx = getPoliticalPassViewportOverscanPx();",
    'const visibleItemsResult = debugMode === "PROD"',
    'recordRenderPerfMetric("politicalPassVisibleItems", 0, {',
    "if (renderDiag.enabled)",
    "const consumedBitmapResult = consumePoliticalRasterWorkerBitmapResult(workerIdentity);",
    "drawPoliticalWorkerBitmapResult(consumedBitmapResult, workerIdentity)",
    'reason: "political-raster-worker-bitmap"',
    "const backgroundStartedAt = nowMs();",
    "const backgroundSummary = drawPoliticalBackgroundFills({",
    'recordRenderPerfMetric("drawPoliticalBackgroundFillsPass"',
    "if (!runtimeState.landData?.features?.length)",
    'reason: "missing-land-data"',
    "const workerPacketState = isPoliticalRasterWorkerBitmapEnabled()",
    "requestPoliticalRasterWorkerPass({",
    "recordPoliticalRasterWorkerSnapshot();",
    "const pendingPoliticalColorEdit = hasPendingPoliticalColorEdit();",
    "const progressiveRecoveryCoarseSkipCandidate = (",
    "const visiblePoliticalForegroundColorOverride = progressiveRecoveryCoarseSkipCandidate",
    "const skipFineFeatureLoopForProgressiveRecovery = (",
    "if (skipFineFeatureLoopForProgressiveRecovery)",
    'reason: "progressive-coarse-underlay"',
    'reason: "fine-feature-loop"',
  ], "drawPoliticalPass order");
});

test("worker identity, bitmap consumption, packet request, and repaint callback remain root-owned", () => {
  const drawSource = extractFunctionSource(readRepoFile(MAP_RENDERER_PATH), "drawPoliticalPass");
  assert.match(
    drawSource,
    /const politicalScreenRects = \[\{[\s\S]*?minX: -politicalOverscanPx,[\s\S]*?minY: -politicalOverscanPx,[\s\S]*?maxX: canvasWidth \+ politicalOverscanPx,[\s\S]*?maxY: canvasHeight \+ politicalOverscanPx,[\s\S]*?\}\];/,
  );
  assert.match(
    drawSource,
    /createPoliticalRasterWorkerIdentity\(\{[\s\S]*?sceneGeneration: sceneIdentity\.sceneGeneration,[\s\S]*?scenarioDataGeneration: sceneIdentity\.scenarioDataGeneration,[\s\S]*?selectionVersion: sceneIdentity\.selectionVersion \|\| Number\(loadState\?\.selectionVersion \|\| 0\),[\s\S]*?passSignature: getRenderPassSignature\("political", transform\),/,
  );
  assert.match(
    drawSource,
    /requestPoliticalRasterWorkerPass\(\{[\s\S]*?identity: workerIdentity,[\s\S]*?rasterPacket: workerPacketState\.packet,[\s\S]*?packetBuildMs: workerPacketState\.packetBuildMs/,
  );
  assert.match(
    drawSource,
    /: \{ packet: null, packetBuildMs: 0, reason: "bitmap-flag-disabled" \};[\s\S]*?requestPoliticalRasterWorkerPass\(\{/,
  );
  assert.match(
    drawSource,
    /canvasPxWidth: workerPacketState\.packet\?\.canvasPxWidth \|\| Math\.max\(0, Math\.round\(canvasWidth \* Number\(runtimeState\.dpr \|\| 1\)\)\),[\s\S]*?canvasPxHeight: workerPacketState\.packet\?\.canvasPxHeight \|\| Math\.max\(0, Math\.round\(canvasHeight \* Number\(runtimeState\.dpr \|\| 1\)\)\),/,
  );
  const callbackStart = drawSource.indexOf("onAcceptedBitmapResult: () => {");
  assert.notEqual(callbackStart, -1);
  const callbackTail = drawSource.slice(callbackStart);
  const callbackEndMatch = callbackTail.match(/\r?\n    \},\r?\n  \}\);/);
  assert.ok(callbackEndMatch, "accepted bitmap callback should retain its request-closing boundary");
  const callbackSource = callbackTail.slice(0, callbackEndMatch.index);
  assertOrderedTokens(callbackSource, [
    'invalidateRenderPasses("political", "political-raster-worker-bitmap-ready");',
    'requestRendererRender("political-raster-worker-bitmap-ready", {',
    "fallback: () => render(),",
  ], "accepted bitmap callback");
  assert.equal((drawSource.match(/recordPoliticalRasterWorkerSnapshot\(\);/g) || []).length, 3);
});

test("progressive recovery keeps pending edits and visible overrides ahead of coarse skip", () => {
  const drawSource = extractFunctionSource(readRepoFile(MAP_RENDERER_PATH), "drawPoliticalPass");
  assert.match(
    drawSource,
    /const progressiveRecoveryCoarseSkipCandidate = \([\s\S]*?!!backgroundSummary\?\.progressive[\s\S]*?!backgroundSummary\?\.deferredFullCacheReady[\s\S]*?String\(backgroundSummary\?\.coarseUnderlay \|\| ""\) === "admin0"[\s\S]*?&& !pendingPoliticalColorEdit[\s\S]*?\);/,
  );
  assert.match(
    drawSource,
    /const visiblePoliticalForegroundColorOverride = progressiveRecoveryCoarseSkipCandidate[\s\S]*?\? hasVisiblePoliticalForegroundColorOverride\(visibleItems\)[\s\S]*?: false;/,
  );
  assert.match(
    drawSource,
    /const skipFineFeatureLoopForProgressiveRecovery = \([\s\S]*?progressiveRecoveryCoarseSkipCandidate[\s\S]*?&& !visiblePoliticalForegroundColorOverride[\s\S]*?\);/,
  );
  const skipStart = drawSource.indexOf("if (skipFineFeatureLoopForProgressiveRecovery)");
  const fineStart = drawSource.indexOf("const islandNeighbors", skipStart);
  const skipSource = drawSource.slice(skipStart, fineStart);
  assertOrderedTokens(skipSource, [
    'recordRenderPerfMetric("drawPoliticalFeatureFillLoop", 0, {',
    'recordRenderPerfMetric("drawPoliticalFeatureStrokeLoop", 0, {',
    'politicalDataStage: "coarse"',
    'reason: "progressive-coarse-underlay"',
  ], "coarse recovery result");
});

test("partial political repaint stays upstream and composition-root owned", () => {
  const partialSource = extractFunctionSource(readRepoFile(MAP_RENDERER_PATH), "tryPartialPoliticalPassRepaint");
  assertOrderedTokens(partialSource, [
    'String(cache.reasons?.political || "") !== "refresh-colors"',
    "getPoliticalPassFineBaselineMismatch(transform)",
    "collectLandSpatialItemsForProjectedRects(projectedDirtyRects, {",
    "getPoliticalPathCacheHandle(transform, { resetIfMismatch: true })",
    "drawPoliticalBackgroundFillsForEntries(redrawEntries)",
    "drawPoliticalFeature(feature, index, {",
    "cache.partialPoliticalDirtyIds.clear();",
    "clearPendingPoliticalColorEdit({",
    'paintSource: "political-partial-repaint"',
    'recordRenderPerfMetric("politicalPartialRepaint", nowMs() - startedAt, {',
    "return true;",
  ], "partial political repaint");
  assert.equal(partialSource.includes("political_pass_orchestrator_owner"), false);
});

test("fine feature drawing, pending-edit clearing, diagnostics, and result construction remain composition-root effects", () => {
  const drawSource = extractFunctionSource(readRepoFile(MAP_RENDERER_PATH), "drawPoliticalPass");
  assert.ok(drawSource.includes("renderDiag.politicalPass = {"));
  assert.equal(/runtimeState\.[A-Za-z0-9_$]+\s*=(?!=)/.test(drawSource), false);
  assertOrderedTokens(drawSource, [
    "const islandNeighbors = debugMode === \"ISLANDS\" ? getIslandNeighborGraph() : null;",
    "const featureMetrics = {",
    "if (Array.isArray(visibleItems))",
    "orderPoliticalShellUnderlayFirst(visibleItems).forEach",
    "const featureEntries = runtimeState.landData.features.map",
    "orderPoliticalShellUnderlayFirst(featureEntries).forEach",
    'recordRenderPerfMetric("drawPoliticalFeatureFillLoop"',
    'recordRenderPerfMetric("drawPoliticalFeatureStrokeLoop"',
    "clearPendingPoliticalColorEdit({",
    'paintSource: "political-pass"',
    'politicalDataStage: "fine"',
    'reason: "fine-feature-loop"',
  ], "fine political result");
  assert.equal((drawSource.match(/return createPoliticalPassDrawResult\(/g) || []).length, 4);
  assert.equal((maskStringAndCommentContent(drawSource).match(/^\s*return;\s*$/gm) || []).length, 1);
});

test("P3.3a keeps the future owner absent and locks protected architecture surfaces", () => {
  const sourceFiles = listRepoSourceFiles("js/core");
  assert.deepEqual(sourceFiles.filter(isPoliticalPassOwnerCandidate), []);
  assert.equal(fs.existsSync(path.join(REPO_ROOT, ...FUTURE_OWNER_PATH.split("/"))), false);
  assert.equal(readRepoFile(PUBLIC_FACADE_PATH).includes("political_pass_orchestrator_owner"), false);
  assert.equal(readRepoFile(RUNTIME_CONTEXT_PATH).includes("politicalPass"), false);
  assert.equal(readRepoFile(STATE_WRITE_ALLOWLIST_PATH).includes(FUTURE_OWNER_PATH), false);
  for (const protectedPath of [
    "js/core/renderer/render_pipeline_catalog.js",
    "js/core/map_renderer/render_pass_catalog.js",
    "js/core/map_renderer/draw_canvas_orchestration_owner.js",
    "js/core/renderer/cached_pass_compositor_owner.js",
    "js/core/map_renderer/transformed_frame_compositor_owner.js",
    "js/core/renderer/visual_effects_pass_owner.js",
    "js/core/renderer/context_pass_orchestrator_owner.js",
  ]) {
    assert.equal(
      readRepoFile(protectedPath).includes("political_pass_orchestrator_owner"),
      false,
      `${protectedPath} should remain independent during preflight`,
    );
  }
  assert.ok(readRepoFile(MAP_RENDERER_PATH).includes("function renderPassToCache("));

  const politicalRecord = RENDER_PASS_FAMILY_INVENTORY.find((record) => record.passName === "political");
  assert.ok(politicalRecord);
  assert.equal(politicalRecord.implementationStatus, "inline");
  assert.equal(politicalRecord.plannedPhase, "P3.3a");
  assert.ok(politicalRecord.browserLanes.includes("test:e2e:dev:political-progressive-recovery"));
});
