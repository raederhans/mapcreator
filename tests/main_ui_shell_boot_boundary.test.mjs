import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and delegates UI shell boot", () => {
  const mainSource = readRepoFile("js", "main.js");
  const movedStateWrite = ["runtimeState.uiShellDebug", "= true"].join(" ");

  assert.match(mainSource, /from "\.\/bootstrap\/ui_shell_boot\.js";/);
  assert.equal(mainSource.includes("function isUiShellDebugMode("), false);
  assert.ok(mainSource.includes("await runUiShellDebugBoot({"));
  assert.equal(mainSource.includes(movedStateWrite), false);
  assert.equal(mainSource.includes('document.body?.classList.add("app-ui-shell-debug")'), false);
  assert.equal(mainSource.includes("globalThis.__mapcreatorUiShellDebug"), false);
});

test("main wires UI shell hooks before returning from debug startup", () => {
  const mainSource = readRepoFile("js", "main.js");
  const bootCallStart = mainSource.indexOf("const uiShellBootResult = await runUiShellDebugBoot({");
  const returnAfterBoot = mainSource.indexOf("return;", bootCallStart);
  const bootCallSource = mainSource.slice(bootCallStart, returnAfterBoot);

  assert.ok(bootCallStart > 0);
  assert.ok(returnAfterBoot > bootCallStart);
  assert.ok(bootCallSource.includes("targetState: state,"));
  assert.ok(bootCallSource.includes("onRenderDispatcher: (nextRenderDispatcher) => {"));
  assert.ok(bootCallSource.includes("renderDispatcher = nextRenderDispatcher;"));
  assert.ok(bootCallSource.includes("onStartupUiBootstrapPromise: (promise) => {"));
  assert.ok(bootCallSource.includes("startupUiBootstrapPromise = promise;"));
  assert.ok(bootCallSource.includes("onStartupUiBootstrapAwaited: (value) => {"));
  assert.ok(bootCallSource.includes("startupUiBootstrapAwaited = !!value;"));
  assert.ok(mainSource.includes("renderDispatcher = uiShellBootResult.renderDispatcher;"));
  assert.ok(mainSource.includes("startupUiBootstrapPromise = uiShellBootResult.startupUiBootstrapPromise;"));
  assert.ok(mainSource.includes("startupUiBootstrapAwaited = !!uiShellBootResult.startupUiBootstrapAwaited;"));
});

test("main injects the complete UI shell helper surface", () => {
  const mainSource = readRepoFile("js", "main.js");
  const bootCallStart = mainSource.indexOf("const uiShellBootResult = await runUiShellDebugBoot({");
  const returnAfterBoot = mainSource.indexOf("return;", bootCallStart);
  const bootCallSource = mainSource.slice(bootCallStart, returnAfterBoot);
  const requiredHelpers = [
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
  ];

  for (const helperName of requiredHelpers) {
    assert.ok(bootCallSource.includes(`${helperName},`), `missing helper ${helperName}`);
  }
});

test("UI shell boot owner exports expected API and owns moved debug tokens", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "ui_shell_boot.js");
  const targetStateWrite = ["targetState.uiShellDebug", "= true"].join(" ");

  assert.ok(ownerSource.includes("export function isUiShellDebugMode"));
  assert.ok(ownerSource.includes("export async function runUiShellDebugBoot"));
  assert.ok(ownerSource.includes(targetStateWrite));
  assert.ok(ownerSource.includes('documentRef.body?.classList.add("app-ui-shell-debug")'));
  assert.ok(ownerSource.includes('flushReason: "ui-shell-render-now"'));
  assert.ok(ownerSource.includes("globalScope.__mapcreatorUiShellDebug = {"));
});

test("UI shell boot owner avoids direct runtime, renderer, and debug seed imports", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "ui_shell_boot.js");
  const forbiddenImportFragments = [
    'from "../core/state.js"',
    'from "./core/state.js"',
    'from "../core/map_renderer/public.js"',
    'from "../core/map_renderer',
    'from "./ui_shell_debug_seed.js"',
  ];

  assert.equal(ownerSource.includes("import "), false);
  for (const fragment of forbiddenImportFragments) {
    assert.equal(ownerSource.includes(fragment), false, `owner imports ${fragment}`);
  }
});
