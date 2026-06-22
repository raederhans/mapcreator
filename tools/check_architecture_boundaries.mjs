import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();

const FILES = Object.freeze({
  renderer: "js/core/map_renderer.js",
  canvasColorHelpers: "js/core/renderer/canvas_color_helpers.js",
  scenarioRefreshRuntime: "js/core/map_renderer/scenario_refresh_runtime.js",
  scenarioRefreshPlans: "js/core/map_renderer/scenario_refresh_plans.js",
  scenarioVisualInvalidationExecutor: "js/core/map_renderer/scenario_visual_invalidation_executor.js",
  exactAfterSettleScheduler: "js/core/map_renderer/exact_after_settle_scheduler.js",
  hgoPreviewRenderOwner: "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
});

const LINE_BUDGETS = Object.freeze({
  [FILES.renderer]: 24100,
  [FILES.scenarioRefreshRuntime]: 540,
  [FILES.scenarioVisualInvalidationExecutor]: 260,
  [FILES.exactAfterSettleScheduler]: 760,
  [FILES.hgoPreviewRenderOwner]: 280,
});

function readProjectFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required architecture file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function lineCount(source) {
  return source.split(/\r?\n/).length;
}

function includesImport(source, importPath) {
  const normalized = source.replaceAll('"', "'");
  return normalized.includes(`from '${importPath}';`);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

function collectFailures() {
  const failures = [];
  const renderer = readProjectFile(FILES.renderer);
  const canvasColorHelpers = readProjectFile(FILES.canvasColorHelpers);
  const scenarioRefreshRuntime = readProjectFile(FILES.scenarioRefreshRuntime);
  const scenarioRefreshPlans = readProjectFile(FILES.scenarioRefreshPlans);
  const scenarioVisualInvalidationExecutor = readProjectFile(FILES.scenarioVisualInvalidationExecutor);
  const exactAfterSettleScheduler = readProjectFile(FILES.exactAfterSettleScheduler);
  const hgoPreviewRenderOwner = readProjectFile(FILES.hgoPreviewRenderOwner);
  const sources = {
    [FILES.renderer]: renderer,
    [FILES.canvasColorHelpers]: canvasColorHelpers,
    [FILES.scenarioRefreshRuntime]: scenarioRefreshRuntime,
    [FILES.scenarioVisualInvalidationExecutor]: scenarioVisualInvalidationExecutor,
    [FILES.exactAfterSettleScheduler]: exactAfterSettleScheduler,
    [FILES.hgoPreviewRenderOwner]: hgoPreviewRenderOwner,
  };

  for (const [relativePath, budget] of Object.entries(LINE_BUDGETS)) {
    const count = lineCount(sources[relativePath]);
    if (count > budget) {
      failures.push(`${relativePath} has ${count} lines; budget is ${budget}. Move focused behavior into an owner.`);
    }
  }

  const requiredImports = [
    "./map_renderer/scenario_refresh_runtime.js",
    "./renderer/canvas_color_helpers.js",
    "./map_renderer/exact_after_settle_scheduler.js",
    "./map_renderer/hgo_runtime_preview_render_owner.js",
  ];
  for (const importPath of requiredImports) {
    if (!includesImport(renderer, importPath)) {
      failures.push(`${FILES.renderer} must import ${importPath}.`);
    }
  }

  const ownerFiles = [
    FILES.scenarioRefreshRuntime,
    FILES.canvasColorHelpers,
    FILES.scenarioVisualInvalidationExecutor,
    FILES.exactAfterSettleScheduler,
    FILES.hgoPreviewRenderOwner,
  ];
  for (const ownerPath of ownerFiles) {
    const source = sources[ownerPath];
    if (/from\s+["'][^"']*map_renderer\.js["']/.test(source)) {
      failures.push(`${ownerPath} must not import js/core/map_renderer.js.`);
    }
  }

  for (const forbiddenImport of [
    "scenario_refresh_runtime.js",
    "exact_after_settle_scheduler.js",
  ]) {
    if (scenarioVisualInvalidationExecutor.includes(forbiddenImport)) {
      failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not import ${forbiddenImport}.`);
    }
  }

  if (!scenarioVisualInvalidationExecutor.includes("function createScenarioVisualInvalidationExecutor(deps = {})")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must own createScenarioVisualInvalidationExecutor.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("function getRequiredRendererEffect(deps, name)")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must fail fast when renderer effects are missing.`);
  }
  if (scenarioVisualInvalidationExecutor.includes("function noop()") || scenarioVisualInvalidationExecutor.includes("= noop")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not silently noop renderer side effects.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("function executeScenarioVisualInvalidation({")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must own executeScenarioVisualInvalidation.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("const RETIRED_VISUAL_INVALIDATION_PASS_INPUT_KEYS = Object.freeze([")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must define retired visual invalidation pass inputs.`);
  }
  if (!scenarioVisualInvalidationExecutor.includes("findRetiredVisualInvalidationPassInputKey(executionPlan)")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must reject retired execution-plan pass inputs through one retired-key check.`);
  }
  if (/function executeScenarioVisualInvalidation\([\s\S]*?\btargetPasses\s*=/.test(scenarioVisualInvalidationExecutor)) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must not accept top-level targetPasses.`);
  }
  if (scenarioVisualInvalidationExecutor.includes("const legacyTargetPasses =")) {
    failures.push(`${FILES.scenarioVisualInvalidationExecutor} must route fallback pass lists through the execution plan bridge.`);
  }
  if (!scenarioRefreshRuntime.includes("createScenarioVisualInvalidationExecutor({")) {
    failures.push(`${FILES.scenarioRefreshRuntime} must create the scenario visual invalidation executor.`);
  }
  if (!scenarioRefreshRuntime.includes("scenarioVisualInvalidationExecutor.executeScenarioVisualInvalidation({")) {
    failures.push(`${FILES.scenarioRefreshRuntime} chunk promotion visual invalidation must call the executor.`);
  }
  if (scenarioRefreshRuntime.includes("const invalidationTargetPasses = targetPasses.length")) {
    failures.push(`${FILES.scenarioRefreshRuntime} must get invalidationTargetPasses from the FrameGraph execution bridge.`);
  }
  const chunkPromotionRuntimeSource = sliceBetween(
    scenarioRefreshRuntime,
    "function refreshMapDataForScenarioChunkPromotion(",
    "function refreshMapDataForScenarioApply(",
  );
  if (/executionPlan:\s*\{[^}]*\btargetPasses\s*[,}:]/.test(chunkPromotionRuntimeSource)) {
    failures.push(`${FILES.scenarioRefreshRuntime} must not pass retired targetPasses through the visual invalidation execution plan.`);
  }
  if (!scenarioRefreshPlans.includes("function resolveFrameGraphInvalidationExecutionPlan(")) {
    failures.push(`${FILES.scenarioRefreshPlans} must own resolveFrameGraphInvalidationExecutionPlan.`);
  }
  const frameGraphFactoryStart = scenarioRefreshPlans.indexOf("function createFrameGraphInvalidation(");
  const frameGraphBridgeStart = scenarioRefreshPlans.indexOf("function getFrameGraphInvalidationTargetPasses(", frameGraphFactoryStart);
  if (frameGraphFactoryStart < 0 || frameGraphBridgeStart < 0) {
    failures.push(`${FILES.scenarioRefreshPlans} must keep createFrameGraphInvalidation next to the FrameGraph execution bridge.`);
  } else if (/legacyTargetPasses|targetPasses\s*=|targetPasses:|getTargetResourcesForPasses\(targetPasses\)/.test(scenarioRefreshPlans.slice(frameGraphFactoryStart, frameGraphBridgeStart))) {
    failures.push(`${FILES.scenarioRefreshPlans} FrameGraph invalidation descriptors must not accept or expose pass fields.`);
  }
  const exportBlock = scenarioRefreshPlans.slice(scenarioRefreshPlans.indexOf("export {"));
  if (exportBlock.includes("getFrameGraphInvalidationTargetPasses,")) {
    failures.push(`${FILES.scenarioRefreshPlans} must keep getFrameGraphInvalidationTargetPasses inside the bridge.`);
  }
  const frameGraphExecutionPlanSource = sliceBetween(
    scenarioRefreshPlans,
    "function resolveFrameGraphInvalidationExecutionPlan(",
    "function createScenarioApplyRefreshPlan(",
  );
  if (/\btargetPasses\s*[,}:]/.test(frameGraphExecutionPlanSource)) {
    failures.push(`${FILES.scenarioRefreshPlans} execution plans must expose invalidationTargetPasses instead of targetPasses.`);
  }

  const ownershipRules = [
    {
      ownerPath: FILES.canvasColorHelpers,
      ownerTokens: [
        "function isProbablyCanvasColor(value) {",
        "function getSafeCanvasColor(value, fallback) {",
        "function parseCanvasColorChannels(value) {",
        "function getCanvasColorRelativeLuminance(value) {",
        "function mixCanvasColors(baseColor, targetColor, amount) {",
        'import { ColorManager } from "../color_manager.js";',
      ],
      rendererRequiredTokens: [
        "from \"./renderer/canvas_color_helpers.js\";",
      ],
      rendererForbiddenTokens: [
        "const COLOR_HEX_RE =",
        "const COLOR_FUNC_RE =",
        "const COLOR_NAME_RE =",
        "function isProbablyCanvasColor(value) {",
        "function getSafeCanvasColor(value, fallback) {",
        "function parseCanvasColorChannels(value) {",
        "function getCanvasColorRelativeLuminance(value) {",
        "function mixCanvasColors(baseColor, targetColor, amount) {",
      ],
    },
    {
      ownerPath: FILES.scenarioRefreshRuntime,
      ownerTokens: [
        "let deferredScenarioChunkPromotionInfraHandle = null;",
        "let scenarioChunkPromotionVersion = 0;",
        "function refreshMapDataForScenarioApply({",
      ],
      rendererRequiredTokens: [
        "let scenarioRefreshRuntime = null;",
        "createScenarioRefreshRuntime({",
        "return scenarioRefreshRuntime.refreshMapDataForScenarioApply(options);",
      ],
      rendererForbiddenTokens: [
        "let deferredScenarioChunkPromotionInfraHandle = null;",
        "let scenarioChunkPromotionVersion = 0;",
        "function buildScenarioChunkPromotionVisualMetricDetails(",
      ],
    },
    {
      ownerPath: FILES.exactAfterSettleScheduler,
      ownerTokens: [
        "let deferredExactContextRefreshHandle = null;",
        "let deferredExactContextRefreshVersion = 0;",
        "function buildExactAfterSettleRefreshPlan(",
        "function scheduleExactAfterSettleRefresh(",
      ],
      rendererRequiredTokens: [
        "let exactAfterSettleScheduler = null;",
        "createExactAfterSettleScheduler({",
        "return getExactAfterSettleScheduler().scheduleExactAfterSettleRefresh(profile);",
      ],
      rendererForbiddenTokens: [
        "let deferredExactContextRefreshHandle = null;",
        "function buildExactAfterSettleRefreshPlan(",
        "function applyExactAfterSettleRefreshPlan(plan) {",
      ],
    },
    {
      ownerPath: FILES.hgoPreviewRenderOwner,
      ownerTokens: [
        "function drawPreviewPass() {",
        "function inspectFromEvent(event, { eventType = \"unknown\" } = {}) {",
        "function getProjectedBounds() {",
        "const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES = Object.freeze([",
      ],
      rendererRequiredTokens: [
        "let hgoRuntimePreviewRenderOwner = null;",
        "createHgoRuntimePreviewRenderOwner({",
        "return getHgoRuntimePreviewRenderOwner().renderIfReady(reason, options);",
        "return getHgoRuntimePreviewRenderOwner().inspectFromEvent(event, { eventType });",
        "getHgoRuntimePreviewRenderOwner().drawPreviewPass();",
      ],
      rendererForbiddenTokens: [
        "const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES =",
        "function getHgoRuntimePreviewCanvasPointFromEvent(",
        "const HGO_RUNTIME_PREVIEW_PROJECTION_NAME =",
      ],
    },
  ];

  for (const rule of ownershipRules) {
    const ownerSource = sources[rule.ownerPath];
    for (const token of rule.ownerTokens) {
      if (!ownerSource.includes(token)) {
        failures.push(`${rule.ownerPath} must own token: ${token}`);
      }
    }
    for (const token of rule.rendererRequiredTokens) {
      if (!renderer.includes(token)) {
        failures.push(`${FILES.renderer} must keep wrapper token: ${token}`);
      }
    }
    for (const token of rule.rendererForbiddenTokens) {
      if (renderer.includes(token)) {
        failures.push(`${FILES.renderer} must not own extracted token: ${token}`);
      }
    }
  }

  return failures;
}

function main() {
  const failures = collectFailures();
  if (failures.length > 0) {
    console.error("Architecture boundary check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Architecture boundary check passed.");
}

main();
