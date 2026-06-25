import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

test("main keeps phase7 ready handoff policy local", () => {
  const mainSource = readRepoFile("js", "main.js");
  const retainedPolicyTokens = [
    "function scheduleReadyPostBootWork(",
    "function flushPendingScenarioChunkRefreshAfterReady(",
    "function startDeferredFullInteractionInfrastructureBuild(",
    "function schedulePostReadyHydration(",
    "function schedulePostReadyDeferredContextWarmup(",
    "function schedulePostReadyVisualWarmup(",
    "function schedulePostReadyPoliticalReconcile(",
  ];

  for (const token of retainedPolicyTokens) {
    assert.ok(mainSource.includes(token), `phase7 should still retain ${token}`);
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
  assert.ok(bootstrapResetSource.includes('postReadyScheduler.reset("bootstrap");'));
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
    "let postReadyContextWarmupScheduled = false;",
    "const postReadyScheduler = createPostReadyScheduler({ targetState: runtimeState });",
    "const deferredMilsymbolLoader = createDeferredMilsymbolLoader();",
    "const deferredUiBootstrapper = createDeferredUiBootstrapper();",
    "const bootstrapDeferredUi = deferredUiBootstrapper.bootstrapDeferredUi;",
    "const bootOverlayController = createStartupBootOverlayController();",
    'registerRuntimeHook(state, "setStartupReadonlyStateFn", setStartupReadonlyState);',
    "let startupDataPipelineOwner = null;",
    "function getStartupDataPipelineOwner()",
  ]);
});

test("main import list no longer carries the proven unused startup support helper", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.equal(mainSource.includes("normalizeBatchFillScopes"), false);
  assert.ok(mainSource.includes("persistViewSettings"));
  assert.ok(mainSource.includes("postStartupSupportKeyUsageReport"));
});
