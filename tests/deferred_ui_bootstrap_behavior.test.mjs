import assert from "node:assert/strict";
import test from "node:test";

import {
  attachDeferredUiBootstrapRejectionObserver,
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
  const controlledIds = [
    "leftSidebar",
    "rightSidebar",
    "bottomDock",
    "scenarioContextBar",
    "zoomControls",
  ];
  const roots = Object.fromEntries(controlledIds.map((id) => [id, {
    id,
    inert: false,
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
  }]));
  roots.mapOverlayControls = {
    id: "mapOverlayControls",
    inert: false,
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
  };
  const mapContainer = { id: "mapContainer", inert: false };
  const documentRef = {
    body: { dataset: {} },
    getElementById: (id) => (id === "mapContainer" ? mapContainer : roots[id] || null),
    querySelectorAll: (selector) => (
      selector === ".map-overlay-controls" ? [roots.mapOverlayControls] : []
    ),
  };
  const bootstrapper = createDeferredUiBootstrapper({
    globalScope,
    documentRef,
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
    roots,
    mapContainer,
    documentRef,
  };
}

test("bootstrapDeferredUi dynamically imports the five UI modules", async () => {
  const harness = createHarness();

  assert.equal(await harness.bootstrapper.bootstrapDeferredUi(harness.renderApp), true);

  assert.deepEqual(harness.importCalls, EXPECTED_MODULE_PATHS);
});

test("deferred UI rejection observer attaches immediately without replacing the promise", async () => {
  const promise = Promise.resolve(true);
  const nativeCatch = promise.catch.bind(promise);
  let catchAttached = false;
  promise.catch = (handler) => {
    catchAttached = true;
    return nativeCatch(handler);
  };

  assert.equal(attachDeferredUiBootstrapRejectionObserver(promise), promise);
  assert.equal(catchAttached, true);
  assert.equal(await promise, true);
});

test("UI interaction roots remain inert until hydration is explicitly ready", () => {
  const harness = createHarness();

  assert.equal(harness.bootstrapper.setInteractionState("pending"), "pending");
  assert.equal(harness.documentRef.body.dataset.uiHydrationState, "pending");
  for (const root of Object.values(harness.roots)) {
    assert.equal(root.inert, true);
    assert.equal(root.attributes.get("aria-disabled"), "true");
    assert.equal(root.attributes.get("aria-busy"), "true");
  }
  assert.equal(harness.mapContainer.inert, false, "UI hydration gating must not disable map interaction");

  assert.equal(harness.bootstrapper.setInteractionState("failed"), "failed");
  for (const root of Object.values(harness.roots)) {
    assert.equal(root.inert, true);
    assert.equal(root.attributes.has("aria-busy"), false);
  }
  assert.equal(harness.mapContainer.inert, false);

  assert.equal(harness.bootstrapper.setInteractionState("ready"), "ready");
  for (const root of Object.values(harness.roots)) {
    assert.equal(root.inert, false);
    assert.equal(root.attributes.get("aria-disabled"), "false");
  }
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
