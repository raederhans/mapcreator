import assert from "node:assert/strict";
import test from "node:test";

import {
  createTransportWorkbenchRightDeckOwner,
} from "../js/ui/toolbar/transport_workbench_right_deck_owner.js";

class TestClassList {
  constructor(node) {
    this.node = node;
  }

  add(...tokens) {
    const values = new Set(String(this.node.className || "").split(/\s+/).filter(Boolean));
    tokens.forEach((token) => values.add(token));
    this.node.className = Array.from(values).join(" ");
  }

  remove(...tokens) {
    const values = new Set(String(this.node.className || "").split(/\s+/).filter(Boolean));
    tokens.forEach((token) => values.delete(token));
    this.node.className = Array.from(values).join(" ");
  }

  contains(token) {
    return String(this.node.className || "").split(/\s+/).includes(token);
  }

  toggle(token, force) {
    const shouldAdd = force === undefined ? !this.contains(token) : !!force;
    if (shouldAdd) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldAdd;
  }
}

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = "";
    this.classList = new TestClassList(this);
    this.textContent = "";
    this.type = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.open = false;
  }

  get childElementCount() {
    return this.children.length;
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  appendChild(node) {
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  prepend(...nodes) {
    nodes.reverse().forEach((node) => {
      this.children.unshift(node);
      node.parentNode = this;
    });
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || "";
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    const nextEvent = {
      preventDefault() {},
      ...event,
    };
    for (const handler of this.listeners.get(type) || []) {
      handler(nextEvent);
    }
  }
}

function createTestDocument() {
  return {
    createElement: (tagName) => new TestElement(tagName),
  };
}

function withTestDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = createTestDocument();
  try {
    callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

function walk(node) {
  return [node, ...(node.children || []).flatMap(walk)];
}

function findByTag(node, tagName) {
  return walk(node).find((candidate) => candidate.tagName === tagName);
}

function findAllByTag(node, tagName) {
  return walk(node).filter((candidate) => candidate.tagName === tagName);
}

function findByText(node, pattern) {
  return walk(node).find((candidate) => pattern.test(candidate.textContent || ""));
}

function textOf(node) {
  return [node.textContent, ...(node.children || []).map(textOf)].join(" ");
}

function createDisplayConfig(overrides = {}) {
  return {
    mode: "inspect",
    preset: "balanced",
    coverage: "core",
    aggregation: { algorithm: "cluster", thresholds: { cellSizePx: 44, clusterRadiusPx: 48 } },
    labels: { maxLevel: 2, budget: 8, allowAggregation: false, separationStrength: 1 },
    ...overrides,
  };
}

test("right deck owner commits toggle, select, range, and multi controls", () => withTestDocument(() => {
  const events = [];
  const owner = createTransportWorkbenchRightDeckOwner({
    translate: (value) => `t:${value}`,
    updateFamilyConfig: (familyId, key, nextValue, options = {}) => events.push([familyId, key, nextValue, options]),
    getPreviewSnapshot: () => ({ optionsReady: true }),
  });

  const toggle = owner.renderControl("road", { type: "toggle", key: "visible", label: "Visible" }, { visible: false }, false);
  const toggleInput = findByTag(toggle, "input");
  toggleInput.checked = true;
  toggleInput.dispatch("change");

  const select = owner.renderControl("road", {
    type: "select",
    key: "mode",
    label: "Mode",
    options: [{ value: "fast", label: "Fast" }, { value: "slow", label: "Slow" }],
  }, { mode: "fast" }, false);
  const selectInput = findByTag(select, "select");
  selectInput.value = "slow";
  selectInput.dispatch("change");

  const range = owner.renderControl("road", { type: "range", key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.1 }, { opacity: 0.5 }, false);
  const rangeInput = findByTag(range, "input");
  rangeInput.value = "0.7";
  rangeInput.dispatch("input");
  assert.match(textOf(range), /0\.7/);
  rangeInput.dispatch("change");

  const multi = owner.renderControl("road", {
    type: "multi",
    key: "lanes",
    label: "Lanes",
    options: [{ value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }],
  }, { lanes: ["primary"] }, false);
  const multiInputs = findAllByTag(multi, "input");
  multiInputs[1].checked = true;
  multiInputs[1].dispatch("change");

  assert.deepEqual(events, [
    ["road", "visible", true, {}],
    ["road", "mode", "slow", {}],
    ["road", "opacity", 0.7, {}],
    ["road", "lanes", true, { appendValue: "secondary" }],
  ]);
}));

test("right deck owner keeps compare-held controls disabled and read-only", () => withTestDocument(() => {
  const events = [];
  const owner = createTransportWorkbenchRightDeckOwner({
    updateFamilyConfig: (...args) => events.push(args),
  });

  const field = owner.renderControl("road", { type: "toggle", key: "visible", label: "Visible" }, { visible: true }, true);
  const input = findByTag(field, "input");
  assert.equal(input.disabled, true);
  input.checked = false;
  input.dispatch("change");
  assert.deepEqual(events, []);
}));

test("right deck owner renders only the active control tab", () => withTestDocument(() => {
  const displayMount = new TestElement("div");
  const aggregationMount = new TestElement("div");
  aggregationMount.appendChild(new TestElement("span"));
  const displayPanel = new TestElement("section");
  const aggregationPanel = new TestElement("section");
  const displayButton = new TestElement("button");
  displayButton.dataset.transportInspectorTab = "display";
  const aggregationButton = new TestElement("button");
  aggregationButton.dataset.transportInspectorTab = "aggregation";
  const owner = createTransportWorkbenchRightDeckOwner({
    tabButtons: [displayButton, aggregationButton],
    panels: { display: displayPanel, aggregation: aggregationPanel },
    mounts: { display: displayMount, aggregation: aggregationMount },
    setInspectorTab: () => "display",
    getDisplayConfig: () => ({ mode: "inspect", preset: "balanced" }),
  });

  owner.renderTabs({
    family: { id: "layers" },
    config: {},
    compareHeld: false,
    activeTab: "display",
  });

  assert.equal(displayButton.classList.contains("is-active"), true);
  assert.equal(aggregationPanel.classList.contains("hidden"), true);
  assert.match(textOf(displayMount), /No controls in this tab/);
  assert.equal(aggregationMount.childElementCount, 1);
}));

test("right deck owner preserves section open state and toggle writes", () => withTestDocument(() => {
  const events = [];
  const mount = new TestElement("div");
  const owner = createTransportWorkbenchRightDeckOwner({
    isSectionOpen: (familyId, sectionKey) => familyId === "road" && sectionKey === "style",
    toggleSection: (familyId, sectionKey, nextOpen) => events.push([familyId, sectionKey, nextOpen]),
  });

  owner.renderTabSections(
    { id: "road" },
    { visible: true },
    false,
    "display",
    mount
  );
  const details = findByTag(mount, "details");
  assert.equal(details.open, true);
  details.open = false;
  details.dispatch("toggle");
  assert.deepEqual(events, [["road", "style", false]]);
}));

test("right deck owner wires advanced range input to display config", () => withTestDocument(() => {
  const events = [];
  const mount = new TestElement("div");
  const owner = createTransportWorkbenchRightDeckOwner({
    getDisplayConfig: () => createDisplayConfig(),
    updateDisplayConfig: (familyId, updateFn) => {
      const draft = {
        aggregation: { thresholds: { clusterRadiusPx: 48 } },
        labels: { separationStrength: 1 },
      };
      updateFn(draft);
      events.push([familyId, draft.aggregation.thresholds.clusterRadiusPx]);
    },
  });

  owner.renderTabSections(
    { id: "mineral_resources" },
    { aggregationClusterRadiusPx: 48 },
    false,
    "aggregation",
    mount
  );
  const ranges = findAllByTag(mount, "input").filter((input) => input.type === "range");
  const advancedRange = ranges[ranges.length - 1];
  advancedRange.value = "64";
  advancedRange.dispatch("input");

  assert.deepEqual(events, [["mineral_resources", 64]]);
}));

test("right deck owner keeps density shell and advanced controls read-only while compare is held", () => withTestDocument(() => {
  const events = [];
  const mount = new TestElement("div");
  const owner = createTransportWorkbenchRightDeckOwner({
    getDisplayConfig: () => createDisplayConfig(),
    updateDisplayConfig: (...args) => events.push(args),
  });

  owner.renderTabSections(
    { id: "mineral_resources" },
    { aggregationClusterRadiusPx: 48 },
    true,
    "aggregation",
    mount
  );
  const inputs = findAllByTag(mount, "input");
  const selects = findAllByTag(mount, "select");
  assert.equal(inputs.every((input) => input.disabled), true);
  assert.equal(selects.every((select) => select.disabled), true);

  const firstSelect = selects[0];
  firstSelect.value = "square";
  firstSelect.dispatch("change");
  const advancedRange = inputs[inputs.length - 1];
  advancedRange.value = "64";
  advancedRange.dispatch("input");

  assert.deepEqual(events, []);
}));

test("right deck owner keeps density label shell toggle read-only while compare is held", () => withTestDocument(() => {
  const events = [];
  const mount = new TestElement("div");
  const owner = createTransportWorkbenchRightDeckOwner({
    getDisplayConfig: () => createDisplayConfig(),
    updateDisplayConfig: (...args) => events.push(args),
  });

  owner.renderTabSections(
    { id: "mineral_resources" },
    { labelSeparation: 1 },
    true,
    "labels",
    mount
  );
  const checkbox = findAllByTag(mount, "input").find((input) => input.type === "checkbox");
  assert.equal(checkbox.disabled, true);
  checkbox.checked = true;
  checkbox.dispatch("change");
  assert.deepEqual(events, []);
}));

test("right deck owner renders diagnostics body in the data tab", () => withTestDocument(() => {
  const events = [];
  const mount = new TestElement("div");
  const diagnosticBody = new TestElement("div");
  diagnosticBody.textContent = "diagnostic-body";
  const owner = createTransportWorkbenchRightDeckOwner({
    renderDiagnosticsBody: (familyId, config) => {
      events.push([familyId, config.visible]);
      return diagnosticBody;
    },
  });

  owner.renderTabSections(
    { id: "road" },
    { visible: true },
    false,
    "data",
    mount
  );

  assert.deepEqual(events, [["road", true]]);
  assert.match(textOf(mount), /diagnostic-body/);
  assert.match(textOf(mount), /Explain rule intent only/);
}));

test("right deck owner replaces the active mount when tab and family change", () => withTestDocument(() => {
  const displayMount = new TestElement("div");
  const labelsMount = new TestElement("div");
  const displayButton = new TestElement("button");
  displayButton.dataset.transportInspectorTab = "display";
  const labelsButton = new TestElement("button");
  labelsButton.dataset.transportInspectorTab = "labels";
  let currentTab = "display";
  const owner = createTransportWorkbenchRightDeckOwner({
    tabButtons: [displayButton, labelsButton],
    panels: { display: new TestElement("section"), labels: new TestElement("section") },
    mounts: { display: displayMount, labels: labelsMount },
    setInspectorTab: () => currentTab,
    getDisplayConfig: () => createDisplayConfig(),
  });

  owner.renderTabs({
    family: { id: "layers" },
    config: {},
    compareHeld: false,
    activeTab: "display",
  });
  assert.match(textOf(displayMount), /Layers is operated/);

  currentTab = "labels";
  owner.renderTabs({
    family: { id: "road" },
    config: { showRefs: true, refClasses: ["motorway"], labelDensityPreset: "balanced", allowPrimaryRefsAtHighZoom: false },
    compareHeld: false,
    activeTab: "labels",
  });

  assert.equal(labelsButton.classList.contains("is-active"), true);
  assert.match(textOf(labelsMount), /Labels/);
  assert.equal(!!findByText(labelsMount, /Reference labels/), true);
}));
