import assert from "node:assert/strict";
import test from "node:test";

import {
  createDeferredUiBootstrapper,
  yieldToMain,
} from "../js/bootstrap/deferred_ui_bootstrap.js";

const EXPECTED_MODULE_PATHS = Object.freeze([
  "../ui/toolbar.js",
  "../ui/sidebar.js",
  "../ui/scenario_controls.js",
  "../ui/styled_selects.js",
  "../ui/shortcuts.js",
]);

function createHarness() {
  const calls = [];
  const importCalls = [];
  const modules = {
    "../ui/toolbar.js": {
      initToolbar(options) {
        calls.push(["initToolbar", options]);
      },
    },
    "../ui/sidebar.js": {
      initSidebar(options) {
        calls.push(["initSidebar", options]);
      },
    },
    "../ui/scenario_controls.js": {
      initScenarioControls() {
        calls.push(["initScenarioControls"]);
      },
    },
    "../ui/styled_selects.js": {
      initStyledSelects() {
        calls.push(["initStyledSelects"]);
      },
    },
    "../ui/shortcuts.js": {
      initShortcuts() {
        calls.push(["initShortcuts"]);
      },
    },
  };
  const globalScope = {
    scheduler: {
      async yield() {
        calls.push(["yield"]);
      },
    },
  };
  const renderApp = () => calls.push(["renderApp"]);
  const bootstrapper = createDeferredUiBootstrapper({
    globalScope,
    importModule: async (path) => {
      importCalls.push(path);
      return modules[path];
    },
    initTranslationsFn() {
      calls.push(["initTranslations"]);
    },
  });

  return {
    bootstrapper,
    calls,
    importCalls,
    renderApp,
  };
}

test("bootstrapDeferredUi dynamically imports the five UI modules", async () => {
  const harness = createHarness();

  assert.equal(await harness.bootstrapper.bootstrapDeferredUi(harness.renderApp), true);

  assert.deepEqual(harness.importCalls, EXPECTED_MODULE_PATHS);
});

test("bootstrapDeferredUi preserves precise yield and init order", async () => {
  const harness = createHarness();

  await harness.bootstrapper.bootstrapDeferredUi(harness.renderApp);

  assert.deepEqual(harness.calls, [
    ["yield"],
    ["initToolbar", { render: harness.renderApp }],
    ["yield"],
    ["initSidebar", { render: harness.renderApp }],
    ["yield"],
    ["initStyledSelects"],
    ["yield"],
    ["initScenarioControls"],
    ["initTranslations"],
    ["initShortcuts"],
  ]);
});

test("bootstrapDeferredUi reuses the cached promise", async () => {
  const harness = createHarness();

  const firstPromise = harness.bootstrapper.bootstrapDeferredUi(harness.renderApp);
  const secondPromise = harness.bootstrapper.bootstrapDeferredUi(harness.renderApp);

  assert.equal(firstPromise, secondPromise);
  assert.equal(harness.bootstrapper.getPromise(), firstPromise);
  assert.equal(await firstPromise, true);
  assert.equal(harness.importCalls.length, 5);
});

test("reset allows a new deferred UI bootstrap", async () => {
  const harness = createHarness();

  await harness.bootstrapper.bootstrapDeferredUi(harness.renderApp);
  harness.bootstrapper.reset();
  assert.equal(harness.bootstrapper.getPromise(), null);
  await harness.bootstrapper.bootstrapDeferredUi(harness.renderApp);

  assert.equal(harness.importCalls.length, 10);
});

test("yieldToMain prefers scheduler.yield", async () => {
  const calls = [];
  const globalScope = {
    scheduler: {
      async yield() {
        calls.push("scheduler.yield");
      },
    },
    setTimeout() {
      calls.push("setTimeout");
    },
  };

  await yieldToMain({ globalScope });

  assert.deepEqual(calls, ["scheduler.yield"]);
});

test("yieldToMain fallback uses setTimeout with a zero delay", async () => {
  const calls = [];
  let scheduledCallback = null;
  const globalScope = {
    setTimeout(callback, delay) {
      calls.push(delay);
      scheduledCallback = callback;
    },
  };

  const yieldPromise = yieldToMain({ globalScope });
  assert.deepEqual(calls, [0]);
  scheduledCallback();
  await yieldPromise;
});

test("bootstrapDeferredUi caches a rejected import promise", async () => {
  const failure = new Error("dynamic import failed");
  const bootstrapper = createDeferredUiBootstrapper({
    importModule: async () => {
      throw failure;
    },
    initTranslationsFn() {},
  });

  const firstPromise = bootstrapper.bootstrapDeferredUi(() => {});
  await assert.rejects(firstPromise, failure);
  const secondPromise = bootstrapper.bootstrapDeferredUi(() => {});

  assert.equal(secondPromise, firstPromise);
  await assert.rejects(secondPromise, failure);
});
