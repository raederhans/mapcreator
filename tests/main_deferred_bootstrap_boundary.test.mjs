import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and delegates deferred bootstrap owners", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.match(mainSource, /from "\.\/bootstrap\/deferred_vendor_loader\.js";/);
  assert.match(mainSource, /from "\.\/bootstrap\/deferred_ui_bootstrap\.js";/);
  assert.ok(mainSource.includes("const deferredMilsymbolLoader = createDeferredMilsymbolLoader();"));
  assert.ok(mainSource.includes("const deferredUiBootstrapper = createDeferredUiBootstrapper();"));
  assert.ok(mainSource.includes("deferredUiBootstrapper.reset();"));
  assert.ok(mainSource.includes("deferredMilsymbolLoader.loadMilsymbol()"));
  assert.ok(mainSource.includes("deferredUiBootstrapper.bootstrapDeferredUi(renderApp)"));
  assert.ok(mainSource.includes("bootstrapDeferredUi,"));
});

test("main no longer owns deferred bootstrap internals", () => {
  const mainSource = readRepoFile("js", "main.js");
  const forbiddenTokens = [
    "function loadDeferredMilsymbol(",
    "function bootstrapDeferredUi(",
    "function yieldToMain(",
    "let milsymbolLoadPromise",
    "let deferredUiBootstrapPromise",
    'import("./ui/toolbar.js")',
    'import("./ui/sidebar.js")',
    'import("./ui/scenario_controls.js")',
    'import("./ui/styled_selects.js")',
    'import("./ui/shortcuts.js")',
  ];

  for (const token of forbiddenTokens) {
    assert.equal(mainSource.includes(token), false, `main.js still owns ${token}`);
  }
});

test("deferred vendor loader owns milsymbol behavior without runtime state imports", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "deferred_vendor_loader.js");

  assert.ok(ownerSource.includes("export function createDeferredMilsymbolLoader"));
  assert.ok(ownerSource.includes('"vendor/milsymbol.js"'));
  assert.ok(ownerSource.includes('"[boot] Failed to load deferred milsymbol renderer."'));
  assert.ok(ownerSource.includes("loadMilsymbol"));
  assert.ok(ownerSource.includes("reset"));
  for (const fragment of [
    'from "../core/state.js"',
    'from "./core/state.js"',
    "runtimeState",
    "const state =",
  ]) {
    assert.equal(ownerSource.includes(fragment), false, `vendor loader imports state through ${fragment}`);
  }
});

test("deferred UI bootstrap owns dynamic UI import order without static UI owner imports", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "deferred_ui_bootstrap.js");
  const forbiddenStaticUiImports =
    /import\s+[^;]*from\s+["']\.\.\/ui\/(?:toolbar|sidebar|scenario_controls|styled_selects|shortcuts)\.js["']/;

  assert.ok(ownerSource.includes("export async function yieldToMain"));
  assert.ok(ownerSource.includes("export function attachDeferredUiBootstrapRejectionObserver"));
  assert.ok(ownerSource.includes("attachDeferredUiBootstrapRejectionObserver(deferredUiBootstrapPromise);"));
  assert.ok(ownerSource.includes("export function createDeferredUiBootstrapper"));
  assert.ok(ownerSource.includes('"../ui/toolbar.js"'));
  assert.ok(ownerSource.includes('"../ui/sidebar.js"'));
  assert.ok(ownerSource.includes('"../ui/scenario_controls.js"'));
  assert.ok(ownerSource.includes('"../ui/styled_selects.js"'));
  assert.ok(ownerSource.includes('"../ui/shortcuts.js"'));
  assert.ok(ownerSource.includes("initToolbar({ render: renderApp })"));
  assert.ok(ownerSource.includes("initSidebar({ render: renderApp })"));
  assert.ok(ownerSource.includes("initStyledSelects()"));
  assert.ok(ownerSource.includes("initScenarioControls()"));
  assert.ok(ownerSource.includes("initTranslationsFn()"));
  assert.ok(ownerSource.includes("initShortcuts()"));
  assert.equal(forbiddenStaticUiImports.test(ownerSource), false);
  assert.equal(ownerSource.includes('from "../core/state.js"'), false);
  assert.equal(ownerSource.includes("runtimeState"), false);
});
