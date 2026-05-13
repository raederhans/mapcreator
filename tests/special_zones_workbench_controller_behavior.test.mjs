import test from "node:test";
import assert from "node:assert/strict";

import { createLayerFromPreset } from "../js/core/special_zone_layers.js";
import { createSpecialZonesWorkbenchController } from "../js/ui/toolbar/special_zones_workbench_controller.js";

class TestClassList {
  constructor(node) { this.node = node; this.values = new Set(); }
  add(...tokens) { tokens.forEach((token) => this.values.add(token)); this.node.className = Array.from(this.values).join(" "); }
  remove(...tokens) { tokens.forEach((token) => this.values.delete(token)); this.node.className = Array.from(this.values).join(" "); }
  contains(token) { return this.values.has(token); }
  toggle(token, force) {
    const enabled = force === undefined ? !this.values.has(token) : !!force;
    if (enabled) this.add(token); else this.remove(token);
    return enabled;
  }
}

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new TestClassList(this);
    this.className = "";
    this.textContent = "";
    this.disabled = false;
    this.hidden = false;
    this.value = "";
    this.type = "";
    this.open = false;
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) {
    if (typeof node === "string") {
      const text = new TestElement("#text");
      text.textContent = node;
      node = text;
    }
    this.children.push(node);
    node.parentNode = this;
    return node;
  }
  prepend(node) {
    this.children.unshift(node);
    node.parentNode = this;
    return node;
  }
  replaceChildren(...nodes) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, handler) {
    const list = this.listeners.get(type) || [];
    list.push(handler);
    this.listeners.set(type, list);
  }
  async click() {
    const event = { target: this, currentTarget: this };
    for (const handler of this.listeners.get("click") || []) {
      await handler(event);
    }
  }
  focus() { this.dataset.focused = "true"; }
  showModal() { this.open = true; this.hidden = false; }
  close() { this.open = false; this.hidden = true; }
  get options() { return this.children.filter((child) => child.tagName === "option"); }
  querySelector(selector) { return findFirst(this, (node) => matchesSelector(node, selector)); }
  querySelectorAll(selector) { return findAll(this, (node) => matchesSelector(node, selector)); }
}

function createTestDocument() {
  return {
    createElement: (tagName) => new TestElement(tagName),
    createElementNS: (_ns, tagName) => new TestElement(tagName),
  };
}

function walk(node, visit) {
  for (const child of node.children || []) {
    visit(child);
    walk(child, visit);
  }
}

function findFirst(root, predicate) {
  let result = null;
  walk(root, (node) => {
    if (!result && predicate(node)) result = node;
  });
  return result;
}

function findAll(root, predicate) {
  const result = [];
  walk(root, (node) => {
    if (predicate(node)) result.push(node);
  });
  return result;
}

function matchesSimple(node, selector) {
  if (selector.startsWith(".")) return node.className.split(/\s+/).includes(selector.slice(1));
  if (selector.startsWith("[data-")) {
    const key = selector.slice(6, -1).replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
    return Object.prototype.hasOwnProperty.call(node.dataset, key);
  }
  return node.tagName === selector.toLowerCase();
}

function matchesSelector(node, selector) {
  if (!selector) return false;
  if (selector.includes(" ")) {
    const parts = selector.split(/\s+/);
    const last = parts.pop();
    if (!matchesSelector(node, last)) return false;
    let parent = node.parentNode;
    while (parent) {
      if (matchesSelector(parent, parts.join(" "))) return true;
      parent = parent.parentNode;
    }
    return false;
  }
  if (selector.includes(".")) {
    const [tag, ...classes] = selector.split(".");
    if (tag && node.tagName !== tag.toLowerCase()) return false;
    return classes.every((className) => node.className.split(/\s+/).includes(className));
  }
  return matchesSimple(node, selector);
}

function findButtonByText(root, text) {
  return findFirst(root, (node) => node.tagName === "button" && node.textContent === text);
}

function getNodeText(node) {
  return [node.textContent, ...(node.children || []).map(getNodeText)].join(" ");
}

test("first scenario save loads the optional layer asset and posts canonical payload", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  globalThis.document = createTestDocument();

  const container = new TestElement("section");
  const runtimeState = {
    activeScenarioId: "tno_1962",
    specialZoneLayers: {
      layers: [createLayerFromPreset("custom", { id: "layer-a", memberFeatureIds: ["b", "a"] })],
      activeLayerId: "layer-a",
    },
  };
  const loads = [];
  const fetches = [];
  globalThis.fetch = async (url, options) => {
    fetches.push({ url, options });
    return {
      ok: true,
      async json() {
        return { ok: true, specialZoneLayers: runtimeState.specialZoneLayers };
      },
    };
  };

  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty() {},
    render() {},
    updateToolUI() {},
    captureHistoryState: () => ({}),
    pushHistoryEntry() {},
    ensureActiveScenarioOptionalLayerLoaded: async (layerId, options) => {
      loads.push({ layerId, options });
      runtimeState.specialZoneLayers = {
        layers: [createLayerFromPreset("custom", { id: "server-layer", memberFeatureIds: ["server"] })],
        activeLayerId: "server-layer",
        diagnostics: [],
      };
      return runtimeState.specialZoneLayers;
    },
    showToast() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    const saveBtn = findButtonByText(container, "Save scenario layer asset");
    assert.ok(saveBtn, "save button should render");
    await saveBtn.click();

    assert.deepEqual(loads, [{ layerId: "specialZoneLayers", options: { renderNow: false } }]);
    assert.equal(fetches.length, 1);
    assert.equal(fetches[0].url, "/__dev/scenario/special-zone-layers/save");
    const body = JSON.parse(fetches[0].options.body);
    assert.equal(body.scenarioId, "tno_1962");
    assert.equal(body.specialZoneLayers.layers[0].id, "layer-a");
    assert.deepEqual(body.specialZoneLayers.layers[0].memberFeatureIds, ["a", "b"]);
    assert.equal(saveBtn.getAttribute("aria-busy"), null);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("overlay toggle enables map overlay and loads scenario layers", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();

  const container = new TestElement("section");
  const runtimeState = {
    activeScenarioId: "tno_1962",
    showSpecialZones: false,
    specialZoneLayers: { layers: [], activeLayerId: "" },
  };
  const loads = [];
  const dirty = [];
  let renderCount = 0;
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty: (label) => dirty.push(label),
    render: () => { renderCount += 1; },
    updateToolUI() {},
    ensureActiveScenarioOptionalLayerLoaded: async (layerId, options) => {
      loads.push({ layerId, options });
      return runtimeState.specialZoneLayers;
    },
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    const toggle = container.querySelector("[data-special-zone-overlay-toggle]");
    assert.ok(toggle);
    toggle.checked = true;
    for (const handler of toggle.listeners.get("change") || []) {
      await handler({ target: toggle, currentTarget: toggle });
    }

    assert.equal(runtimeState.showSpecialZones, true);
    assert.deepEqual(loads, [{ layerId: "specialZoneLayers", options: { renderNow: false } }]);
    assert.deepEqual(dirty, ["toggle-special-zones"]);
    assert.equal(renderCount, 1);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("topology mismatch diagnostics render in the workbench", () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();

  const container = new TestElement("section");
  const runtimeState = {
    activeScenarioManifest: { source: { runtime_topology_sha256: "current-fp" } },
    specialZoneLayers: {
      topologyFingerprint: "old-fp",
      layers: [],
      activeLayerId: "",
    },
  };
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty() {},
    render() {},
    updateToolUI() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    const diagnostics = container.querySelector(".special-zone-workbench-diagnostics");
    assert.ok(diagnostics);
    assert.match(getNodeText(diagnostics), /topology_fingerprint_mismatch/);
    assert.match(getNodeText(diagnostics), /expected current-fp/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("failed scenario layer load clears current layers and remains retryable", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();

  const container = new TestElement("section");
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { special_zone_layers_url: "data/scenarios/tno_1962/special_zone_layers.json" },
    specialZoneLayers: {
      layers: [createLayerFromPreset("custom", { id: "pending-layer", memberFeatureIds: ["a"] })],
      activeLayerId: "pending-layer",
    },
  };
  let loadCount = 0;
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty() {},
    render() {},
    updateToolUI() {},
    ensureActiveScenarioOptionalLayerLoaded: async () => {
      loadCount += 1;
      return null;
    },
    showToast() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    await controller.loadScenarioSpecialZoneLayers();
    await controller.loadScenarioSpecialZoneLayers();
    assert.equal(loadCount, 2);
    assert.deepEqual(runtimeState.specialZoneLayers.layers, []);
    assert.equal(runtimeState.specialZoneLayers.activeLayerId, "");
    assert.equal(runtimeState.specialZonesOverlayDirty, true);
    assert.ok(runtimeState.specialZoneLayers.diagnostics.some((entry) => entry.code === "special_zone_layers_load_failed"));
  } finally {
    globalThis.document = previousDocument;
  }
});

test("render-triggered scenario layer load failure does not loop", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();

  const container = new TestElement("section");
  const runtimeState = {
    activeScenarioId: "tno_1962",
    activeScenarioManifest: { special_zone_layers_url: "data/scenarios/tno_1962/special_zone_layers.json" },
    showSpecialZones: true,
    specialZoneLayers: {
      layers: [createLayerFromPreset("custom", { id: "pending-layer", memberFeatureIds: ["a"] })],
      activeLayerId: "pending-layer",
    },
  };
  let loadCount = 0;
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty() {},
    render() {},
    updateToolUI() {},
    ensureActiveScenarioOptionalLayerLoaded: async () => {
      loadCount += 1;
      return null;
    },
    showToast() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(loadCount, 1);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(loadCount, 1);
    assert.deepEqual(runtimeState.specialZoneLayers.layers, []);
    assert.equal(runtimeState.specialZoneLayers.activeLayerId, "");
    assert.equal(runtimeState.specialZonesOverlayDirty, true);
    assert.ok(runtimeState.specialZoneLayers.diagnostics.some((entry) => entry.code === "special_zone_layers_load_failed"));
  } finally {
    globalThis.document = previousDocument;
  }
});

test("large member lists render capped chips and keep drawer search bounded", () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();
  const container = new TestElement("section");
  const memberFeatureIds = Array.from({ length: 95 }, (_value, index) => `member-${String(index + 1).padStart(3, "0")}`);
  const runtimeState = {
    specialZoneLayers: {
      layers: [createLayerFromPreset("custom", { id: "layer-a", memberFeatureIds })],
      activeLayerId: "layer-a",
    },
  };
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty() {},
    render() {},
    updateToolUI() {},
    captureHistoryState: () => ({}),
    pushHistoryEntry() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    assert.equal(container.querySelectorAll(".special-zone-member-chip").length, 30);
    assert.ok(findButtonByText(container, "View all (95)"));
  } finally {
    globalThis.document = previousDocument;
  }
});

test("batch import, set operations, and story preview use compact workbench controls", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();
  const container = new TestElement("section");
  const runtimeState = {
    landIndex: new Map([["a", {}], ["b", {}], ["c", {}], ["d", {}]]),
    specialZoneLayers: {
      layers: [
        createLayerFromPreset("custom", { id: "target", name: "Target", memberFeatureIds: ["a"] }),
        createLayerFromPreset("buffer", { id: "source", name: "Source", memberFeatureIds: ["b", "c"] }),
      ],
      activeLayerId: "target",
    },
  };
  const dirty = [];
  const controller = createSpecialZonesWorkbenchController({
    runtimeState,
    container,
    markDirty: (label) => dirty.push(label),
    render() {},
    updateToolUI() {},
    captureHistoryState: () => ({}),
    pushHistoryEntry() {},
    t: (value) => value,
  });

  try {
    controller.renderSpecialZonesWorkbenchUi();
    const importInput = container.querySelector(".special-zone-member-import-input");
    assert.ok(importInput);
    importInput.value = "d missing b";
    await findButtonByText(container, "Replace with imported ids").click();
    assert.deepEqual(runtimeState.specialZoneLayers.layers.find((layer) => layer.id === "target").memberFeatureIds, ["b", "d"]);

    controller.renderSpecialZonesWorkbenchUi();
    const invalidOnlyInput = container.querySelector(".special-zone-member-import-input");
    invalidOnlyInput.value = "missing";
    await findButtonByText(container, "Replace with imported ids").click();
    assert.deepEqual(runtimeState.specialZoneLayers.layers.find((layer) => layer.id === "target").memberFeatureIds, []);

    controller.renderSpecialZonesWorkbenchUi();
    const restoreInput = container.querySelector(".special-zone-member-import-input");
    restoreInput.value = "d b";
    await findButtonByText(container, "Replace with imported ids").click();
    assert.deepEqual(runtimeState.specialZoneLayers.layers.find((layer) => layer.id === "target").memberFeatureIds, ["b", "d"]);

    controller.renderSpecialZonesWorkbenchUi();
    const selects = container.querySelectorAll("select");
    selects[selects.length - 1].value = "source";
    await findButtonByText(container, "Union with layer").click();
    assert.deepEqual(runtimeState.specialZoneLayers.layers.find((layer) => layer.id === "target").memberFeatureIds, ["b", "c", "d"]);
    assert.ok(dirty.includes("special-zone-members-batch-replace"));
    assert.ok(dirty.includes("special-zone-members-union"));
    assert.match(getNodeText(container), /Story preview/);
    assert.match(getNodeText(container), /Target/);
  } finally {
    globalThis.document = previousDocument;
  }
});
