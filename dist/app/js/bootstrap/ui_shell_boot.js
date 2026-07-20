import { setUiShellDebugState } from "../core/state/actions/boot_actions.js";

const UI_SHELL_BOOT_HELPER_NAMES = Object.freeze([
  "applyUiShellDebugTerritorySeed",
  "bootstrapDeferredUi",
  "checkpointBootMetricOnce",
  "completeBootSequenceLogging",
  "createStartupRenderRuntimeBinding",
  "ensureDetailTopologyReady",
  "ensureFullLocalizationDataReady",
  "finishBootMetric",
  "getBootLanguage",
  "initLongAnimationFrameObserver",
  "initMap",
  "revealUiShellDebugTerritoryPanels",
  "runPostScenarioUiReplay",
  "setBootPreviewVisible",
  "setBootState",
  "setMapData",
  "startBootMetric",
]);

const UI_SHELL_HOOK_NAMES = Object.freeze([
  "onRenderDispatcher",
  "onStartupUiBootstrapPromise",
  "onStartupUiBootstrapAwaited",
]);

function assertObjectRecord(value, name) {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`runUiShellDebugBoot requires ${name} to be an object.`);
  }
}

function assertFunction(value, name) {
  if (typeof value !== "function") {
    throw new TypeError(`runUiShellDebugBoot requires ${name} to be a function.`);
  }
}

function validateHelpers(helpers) {
  assertObjectRecord(helpers, "helpers");
  for (const helperName of UI_SHELL_BOOT_HELPER_NAMES) {
    assertFunction(helpers[helperName], `helpers.${helperName}`);
  }
}

function validateHooks(hooks) {
  assertObjectRecord(hooks, "hooks");
  for (const hookName of UI_SHELL_HOOK_NAMES) {
    if (hooks[hookName] === undefined) continue;
    assertFunction(hooks[hookName], `hooks.${hookName}`);
  }
}

function getUiShellMessage(getBootLanguage) {
  return getBootLanguage() === "zh"
    ? "正在启动 UI 调试外壳。"
    : "Starting the UI debug shell.";
}

export function isUiShellDebugMode({ globalScope = globalThis } = {}) {
  if (!globalScope || typeof globalScope.URLSearchParams !== "function") {
    return false;
  }
  const params = new globalScope.URLSearchParams(globalScope.location?.search || "");
  const raw = String(params.get("ui_shell") || params.get("startup_mode") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "ui-shell";
}

export async function runUiShellDebugBoot({
  targetState,
  documentRef = document,
  globalScope = globalThis,
  hooks = {},
  helpers = {},
} = {}) {
  assertObjectRecord(targetState, "targetState");
  assertObjectRecord(globalScope, "globalScope");
  validateHooks(hooks);
  validateHelpers(helpers);

  setUiShellDebugState(targetState, true);
  documentRef.body?.classList.add("app-ui-shell-debug");
  helpers.setBootState("ui-shell", {
    message: getUiShellMessage(helpers.getBootLanguage),
    progress: 55,
    canContinueWithoutScenario: false,
  });
  helpers.startBootMetric("ui-shell");
  helpers.initLongAnimationFrameObserver();

  const startupInteractionLevel = "full";
  helpers.initMap({
    suppressRender: true,
    interactionLevel: startupInteractionLevel,
    deferInteractionInfrastructure: false,
  });
  helpers.setMapData({
    refitProjection: false,
    resetZoom: false,
    suppressRender: true,
    interactionLevel: startupInteractionLevel,
    deferInteractionInfrastructure: false,
  });

  const renderRuntime = helpers.createStartupRenderRuntimeBinding({
    targetState,
    setBootPreviewVisible: helpers.setBootPreviewVisible,
    ensureDetailTopologyReady: helpers.ensureDetailTopologyReady,
    flushReason: "ui-shell-render-now",
  });
  hooks.onRenderDispatcher?.(renderRuntime.renderDispatcher);

  const uiShellTerritorySeed = helpers.applyUiShellDebugTerritorySeed();
  const startupUiBootstrapPromise = helpers.bootstrapDeferredUi(renderRuntime.renderApp);
  hooks.onStartupUiBootstrapPromise?.(startupUiBootstrapPromise);

  await startupUiBootstrapPromise;
  hooks.onStartupUiBootstrapAwaited?.(true);

  helpers.revealUiShellDebugTerritoryPanels();
  helpers.runPostScenarioUiReplay({ full: true });
  await helpers.ensureFullLocalizationDataReady({ reason: "ui-shell-ready", renderNow: false });
  renderRuntime.renderDispatcher.flush();
  helpers.setBootState("ready", {
    blocking: false,
    progress: 100,
    canContinueWithoutScenario: false,
  });
  helpers.finishBootMetric("ui-shell", { mode: "debug" });
  helpers.checkpointBootMetricOnce("ui-shell-ready");
  helpers.completeBootSequenceLogging();

  globalScope.__mapcreatorUiShellDebug = {
    ready: true,
    skippedStartupData: true,
    skippedScenarioApply: true,
    territoryPreview: uiShellTerritorySeed,
  };

  return {
    handled: true,
    renderDispatcher: renderRuntime.renderDispatcher,
    renderApp: renderRuntime.renderApp,
    startupUiBootstrapPromise,
    startupUiBootstrapAwaited: true,
    territoryPreview: uiShellTerritorySeed,
  };
}
