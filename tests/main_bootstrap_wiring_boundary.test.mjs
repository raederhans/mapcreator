import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hydrateStartupBaseContentState } from "../js/core/state/content_state.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function assertInOrder(source, tokens) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token);
    assert.ok(index > previousIndex, `expected ${token} after previous wiring token`);
    previousIndex = index;
  }
}

function countOccurrences(source, token) {
  return source.split(token).length - 1;
}

test("main imports phase1 through phase6 bootstrap owners", () => {
  const mainSource = readRepoFile("js", "main.js");
  const ownerImports = [
    './bootstrap/post_ready_scheduler.js',
    './bootstrap/main_runtime_diagnostics.js',
    './bootstrap/render_runtime_binding.js',
    './bootstrap/startup_failure_recovery.js',
    './bootstrap/ui_shell_boot.js',
    './bootstrap/deferred_vendor_loader.js',
    './bootstrap/deferred_ui_bootstrap.js',
    './bootstrap/startup_ready_handoff.js',
  ];

  for (const ownerImport of ownerImports) {
    assert.ok(mainSource.includes(`from "${ownerImport}";`), `missing ${ownerImport}`);
  }
});

test("main no longer owns extracted bootstrap implementations", () => {
  const mainSource = readRepoFile("js", "main.js");
  const forbiddenTokens = [
    "function loadDeferredMilsymbol(",
    "function bootstrapDeferredUi(",
    "function yieldToMain(",
    "function buildMainRuntimeLoadStatusSnapshot(",
    "function schedulePostReadyTask(",
    "function updatePostReadySchedulerDiagnostics(",
    "createRenderDispatcher((",
    "globalThis.__mapcreatorUiShellDebug",
    "Deferred UI bootstrap failed during startup:",
    "Failed to boot application:",
  ];

  for (const token of forbiddenTokens) {
    assert.equal(mainSource.includes(token), false, `main.js still contains moved token: ${token}`);
  }
});

test("main delegates phase8 ready handoff policy to the startup ready handoff owner", () => {
  const mainSource = readRepoFile("js", "main.js");
  const delegatedPolicyTokens = [
    "function getStartupReadyHandoffOwner()",
    "createStartupReadyHandoffOwner({",
    "flushPendingScenarioChunkRefreshAfterReady: startupReadyHandoff.flushPendingScenarioChunkRefreshAfterReady",
    "getStartupReadyHandoffOwner().observePostReadyUiBootstrap(",
    "schedulePostReadyDeferredContextWarmup: startupReadyHandoff.schedulePostReadyDeferredContextWarmup",
    "schedulePostReadyHydration: startupReadyHandoff.schedulePostReadyHydration",
    "schedulePostReadyPoliticalReconcile: startupReadyHandoff.schedulePostReadyPoliticalReconcile",
    "schedulePostReadyVisualWarmup: startupReadyHandoff.schedulePostReadyVisualWarmup",
    "startDeferredFullInteractionInfrastructureBuild: startupReadyHandoff.startDeferredFullInteractionInfrastructureBuild",
    'getStartupReadyHandoffOwner().scheduleReadyPostBootWork(renderDispatcher, "ready-state")',
  ];

  for (const token of delegatedPolicyTokens) {
    assert.ok(mainSource.includes(token), `phase8 should delegate through ${token}`);
  }
});

test("main bootstrap reset preserves deferred UI and post-ready scheduler reset", () => {
  const mainSource = readRepoFile("js", "main.js");
  const bootstrapStart = mainSource.indexOf("async function bootstrap()");
  const ordinaryStartupStart = mainSource.indexOf("const startupDataPipeline = getStartupDataPipelineOwner();", bootstrapStart);
  const bootstrapResetSource = mainSource.slice(bootstrapStart, ordinaryStartupStart);

  assert.ok(bootstrapStart > 0);
  assert.ok(ordinaryStartupStart > bootstrapStart);
  assert.ok(bootstrapResetSource.includes("deferredUiBootstrapper.reset();"));
  assert.ok(bootstrapResetSource.includes("getStartupReadyHandoffOwner().beginUiHydration();"));
  assert.ok(bootstrapResetSource.includes('postReadyScheduler.reset("bootstrap");'));
  assert.ok(bootstrapResetSource.includes('deferredUiBootstrapper.setInteractionState("pending");'));
});

test("main keeps deferred vendor loading on the ordinary startup path only", () => {
  const mainSource = readRepoFile("js", "main.js");
  const uiShellBranch = mainSource.indexOf("if (isUiShellDebugMode()) {");
  const uiShellReturn = mainSource.indexOf("return;", uiShellBranch);
  const deferredVendorCall = mainSource.indexOf("void deferredMilsymbolLoader.loadMilsymbol();");

  assert.equal(countOccurrences(mainSource, "deferredMilsymbolLoader.loadMilsymbol()"), 1);
  assert.ok(uiShellBranch > 0);
  assert.ok(uiShellReturn > uiShellBranch);
  assert.ok(deferredVendorCall > uiShellReturn);
});

test("main keeps UI shell boot and startup failure recovery delegated", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.ok(mainSource.includes("const uiShellBootResult = await runUiShellDebugBoot({"));
  assert.ok(mainSource.includes("const failureRecovery = await handleStartupFailure({"));
});

test("main top-level wiring order remains composition-root shaped", () => {
  const mainSource = readRepoFile("js", "main.js");

  assertInOrder(mainSource, [
    "const state = runtimeState;",
    "configureStartupSupportKeyUsageAudit();",
    "registerMainRuntimeDiagnostics({",
    "function requestMainRender(",
    "const postReadyScheduler = createPostReadyScheduler({ targetState: runtimeState });",
    "const deferredMilsymbolLoader = createDeferredMilsymbolLoader();",
    "const deferredUiBootstrapper = createDeferredUiBootstrapper();",
    "const bootstrapDeferredUi = deferredUiBootstrapper.bootstrapDeferredUi;",
    "const bootOverlayController = createStartupBootOverlayController();",
    'registerRuntimeHook(state, "setStartupReadonlyStateFn", setStartupReadonlyState);',
    "let startupDataPipelineOwner = null;",
    "let deferredDetailPromotionOwner = null;",
    "let startupReadyHandoffOwner = null;",
    "const startupScenarioBootOwnerLoader = createPageLifetimeModuleLoader({",
    "const startupSampleProjectDeeplinkModuleLoader = createPageLifetimeModuleLoader({",
    "function getStartupDataPipelineOwner()",
    "function getStartupScenarioBootOwner()",
    "function getStartupReadyHandoffOwner()",
  ]);
});

test("main import list no longer carries the proven unused startup support helper", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.equal(mainSource.includes("normalizeBatchFillScopes"), false);
  assert.ok(mainSource.includes("persistViewSettings"));
  assert.ok(mainSource.includes("postStartupSupportKeyUsageReport"));
});

test("main commits initial chunk promotion through the canonical boot action before inspecting result", () => {
  const mainSource = readRepoFile("js", "main.js");
  const awaitIndex = mainSource.indexOf(
    "const result = await runtimeState.awaitInitialScenarioChunkVisualPromotionFn({",
  );
  const commitIndex = mainSource.indexOf(
    "setStartupInitialScenarioChunkVisualPromotion(runtimeState, result);",
    awaitIndex,
  );
  const resultCheckIndex = mainSource.indexOf("if (result && result.ok === false)", commitIndex);
  const legacyDirectWrite = [
    "runtimeState",
    ".startupInitialScenarioChunkVisualPromotion =",
  ].join("");

  assert.ok(mainSource.includes('from "./core/state/actions/boot_actions.js";'));
  assert.ok(awaitIndex > 0);
  assert.ok(commitIndex > awaitIndex);
  assert.ok(resultCheckIndex > commitIndex);
  assert.equal(mainSource.includes(legacyDirectWrite), false);
});

test("startup content hydration adopts the loader cache object by identity", () => {
  const startupBootCacheState = {
    enabled: true,
    baseTopology: "hit",
    localization: "hit",
    scenarioBootstrap: "probe",
  };
  const targetState = {};

  hydrateStartupBaseContentState(targetState, {
    topologyPrimary: { type: "Topology", objects: {}, arcs: [] },
    startupBootCacheState,
  });

  assert.equal(targetState.startupBootCacheState, startupBootCacheState);
});
