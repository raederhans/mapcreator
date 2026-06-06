import assert from "node:assert/strict";
import test from "node:test";

import { createHgoRuntimePreviewToolbarController } from "../js/ui/toolbar/hgo_runtime_preview_controller.js";

function createClassList() {
  const values = new Set();
  return {
    values,
    add: (value) => values.add(value),
    contains: (value) => values.has(value),
    toggle: (value, force) => {
      const next = typeof force === "boolean" ? force : !values.has(value);
      if (next) values.add(value);
      else values.delete(value);
      return next;
    },
  };
}

function createButton() {
  const listeners = {};
  return {
    classList: createClassList(),
    dataset: {},
    attributes: new Map(),
    textContent: "",
    addEventListener: (event, handler) => {
      listeners[event] = handler;
    },
    click: () => listeners.click?.(),
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
  };
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

async function settleMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("toolbar preview button is hidden outside developer mode", () => {
  const runtimeState = { ui: { developerMode: false } };
  const button = createButton();

  createHgoRuntimePreviewToolbarController({ runtimeState, button, documentRef: null, storage: null });

  assert.equal(button.classList.contains("hidden"), true);
  assert.equal(button.attributes.get("aria-hidden"), "true");
  assert.equal(runtimeState.hgoRuntimePreview.enabled, false);
});

test("toolbar preview button stays hidden in developer mode until loaders are configured", () => {
  const runtimeState = { ui: { developerMode: true } };
  const button = createButton();

  createHgoRuntimePreviewToolbarController({ runtimeState, button, documentRef: null, storage: null });

  assert.equal(button.classList.contains("hidden"), true);
  assert.equal(button.attributes.get("aria-hidden"), "true");
  assert.equal(button.attributes.get("aria-pressed"), "false");
});

test("toolbar restores persisted enabled preview in developer mode", async () => {
  const runtimeState = { ui: { developerMode: true } };
  const button = createButton();
  const storage = createStorage({ "mapcreator:hgo-runtime-preview:enabled": "true" });
  let seedLoadCount = 0;
  let rasterLoadCount = 0;

  createHgoRuntimePreviewToolbarController({
    runtimeState,
    button,
    documentRef: null,
    storage,
    loadSeed: async () => {
      seedLoadCount += 1;
      return {
        provinces: { 1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E" } },
        states: [{ id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 }],
        countries: { AAA: { tag: "AAA", color_hex: "#010203", color_rgb: [1, 2, 3] } },
        province_to_state: { 1: 1 },
      };
    },
    loadRaster: async () => {
      rasterLoadCount += 1;
      return { width: 1, height: 1, pixelFormat: "rgb", pixels: [10, 20, 30] };
    },
  });

  await settleMicrotasks();

  assert.equal(seedLoadCount, 1);
  assert.equal(rasterLoadCount, 1);
  assert.equal(runtimeState.hgoRuntimePreview.enabled, true);
  assert.equal(runtimeState.hgoRuntimePreview.status, "ready");
  assert.equal(button.attributes.get("aria-pressed"), "true");
  assert.equal(button.attributes.get("aria-label"), "HGO preview ready");
});

test("toolbar preview button enables injected preview loader in developer mode", async () => {
  const runtimeState = { ui: { developerMode: true } };
  const button = createButton();
  let restoreCount = 0;
  const controller = createHgoRuntimePreviewToolbarController({
    runtimeState,
    button,
    documentRef: null,
    storage: null,
    loadSeed: async () => ({
      provinces: { 1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E" } },
      states: [{ id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 }],
      countries: { AAA: { tag: "AAA", color_hex: "#010203", color_rgb: [1, 2, 3] } },
      province_to_state: { 1: 1 },
    }),
    loadRaster: async () => ({ width: 1, height: 1, pixelFormat: "rgb", pixels: [10, 20, 30] }),
    restorePreviewTarget: () => {
      restoreCount += 1;
    },
  });

  await controller.setEnabled(true);

  assert.equal(button.classList.contains("hidden"), false);
  assert.equal(button.attributes.get("aria-pressed"), "true");
  assert.equal(button.attributes.get("aria-label"), "HGO preview ready");
  assert.equal(runtimeState.hgoRuntimePreview.status, "ready");

  await controller.setEnabled(false);

  assert.equal(restoreCount, 1);
  assert.equal(button.attributes.get("aria-pressed"), "false");
});

test("developer mode sync disables active preview before hiding the control", async () => {
  const runtimeState = { ui: { developerMode: true } };
  const button = createButton();
  let restoreCount = 0;
  const controller = createHgoRuntimePreviewToolbarController({
    runtimeState,
    button,
    documentRef: null,
    storage: null,
    loadSeed: async () => ({
      provinces: { 1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E" } },
      states: [{ id: 1, owner: "AAA", controller: "AAA", province_ids: [1], province_count: 1 }],
      countries: { AAA: { tag: "AAA", color_hex: "#010203", color_rgb: [1, 2, 3] } },
      province_to_state: { 1: 1 },
    }),
    loadRaster: async () => ({ width: 1, height: 1, pixelFormat: "rgb", pixels: [10, 20, 30] }),
    restorePreviewTarget: () => {
      restoreCount += 1;
    },
  });

  await controller.setEnabled(true);
  runtimeState.ui.developerMode = false;
  controller.sync();

  assert.equal(runtimeState.hgoRuntimePreview.enabled, false);
  assert.equal(runtimeState.hgoRuntimePreview.renderSummary, null);
  assert.equal(restoreCount, 1);
  assert.equal(button.classList.contains("hidden"), true);
  assert.equal(button.attributes.get("aria-pressed"), "false");
});
