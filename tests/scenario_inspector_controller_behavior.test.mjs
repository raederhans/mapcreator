import test from "node:test";
import assert from "node:assert/strict";
import { createScenarioInspectorController } from "../js/ui/sidebar/scenario_inspector_controller.js";

class Element {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.classList = {
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(" ").filter(Boolean));
        if (enabled) classes.add(name);
        else classes.delete(name);
        this.className = [...classes].join(" ");
      },
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  fire(type = "click") { if (!this.disabled) this.listeners.get(type)?.(); }
}

function nodes(root) { return [root, ...root.children.flatMap(nodes)]; }
function button(root, label) {
  const result = nodes(root).find((node) => node.tagName === "button" && node.textContent === label);
  assert.ok(result, `button exists: ${label}`);
  return result;
}
function country(extra = {}) {
  return { code: "AA", displayName: "Country A", hierarchyGroups: [], ...extra };
}
function harness(t, overrides = {}) {
  const previous = globalThis.document;
  globalThis.document = { createElement: (tag) => new Element(tag) };
  t.after(() => { globalThis.document = previous; });
  const calls = [];
  const record = (name, result) => (...args) => { calls.push([name, ...args]); return result; };
  const view = { visualOpen: false, paintMode: "sovereignty", selectedColor: "#112233" };
  const host = new Element();
  const deps = {
    t: (value) => value,
    getView: () => ({ ...view }),
    getCountryState: () => null,
    activateScenarioCountry: record("activate"),
    storeVisualOpen: record("storeOpen"),
    selectInspectorCountry: record("select"),
    getScenarioSubjectKindLabel: () => "Subject",
    getResolvedCountryColor: () => "#abcdef",
    getScenarioSubjectChildrenForParent: () => [],
    getReleasableChildrenForParent: () => [],
    appendActionSection: (parent, title, options) => {
      const section = new Element();
      section.textContent = title;
      section.options = options;
      return parent.appendChild(section);
    },
    createInspectorActionButton: (label, callback) => {
      const node = new Element("button");
      node.textContent = label;
      node.addEventListener("click", callback);
      return node;
    },
    applyHierarchyGroupWithMode: record("hierarchy"),
    render: () => {},
    createEmptyNote: (text) => Object.assign(new Element(), { textContent: text }),
    renderRegionalPresets: record("presets"),
    normalizeCountryCode: (value) => String(value || "").trim().toUpperCase(),
    getResolvedReleasableBoundaryVariant: () => ({ id: "base" }),
    getScenarioCountryMeta: () => null,
    applyReleasableBoundaryVariantSelection: record("variant"),
    getPrimaryReleasablePresetRef: () => ({ preset: { name: "Core A", ids: ["visible", "hidden"] } }),
    applyScenarioReleasableCoreTerritory: record("core"),
    renderScenarioHistoricalTransfers: record("transfers"),
    selectedCountryActionsSection: host,
    scheduleAdaptiveInspectorHeights: record("schedule"),
    setScenarioMapPaintMode: record("paintMode"),
    setScenarioVisualAdjustmentsOpen: record("open"),
    filterToVisibleFeatureIds: record("filter", { matchedIds: ["visible"] }),
    clearVisualOverridesForFeatureIds: record("clearCore", { changed: 1 }),
    showToast: record("toast"),
    applyVisualColorToOwnedRegions: record("paintOwned", { changed: 1, matchedCount: 1 }),
    clearCountryVisualOverrides: record("clearOwned", { changed: 0 }),
    renderCountryColorSyncAffordance: record("colorSync"),
    hasScenarioCoreTerritoryActions: (value) => !!value.releasable,
    ...overrides,
  };
  const controller = createScenarioInspectorController(deps);
  const root = new Element();
  return { root, host, view, calls, deps, render: (value) => controller.renderScenarioActionsPanel(root, value) };
}

test("no country clears old content and stops before scenario actions", (t) => {
  const h = harness(t);
  h.root.appendChild(new Element());
  h.render(null);
  assert.equal(h.root.children.length, 1);
  assert.match(h.root.children[0].textContent, /Select a country/);
  assert.deepEqual(h.calls, []);
});

test("parent and child navigation retain labels, swatches, and country targets", (t) => {
  const parent = country({ code: "PP", displayName: "Parent" });
  const child = country({ code: "CC", displayName: "Child", scenarioSubject: true });
  const h = harness(t, {
    getCountryState: (code) => code === "PP" ? parent : null,
    getScenarioSubjectChildrenForParent: () => [child],
  });
  h.render(country({ scenarioSubject: true, parentOwnerTags: [" pp "] }));
  const cards = nodes(h.root).filter((node) => node.tagName === "button" && node.className.includes("scenario-action-card"));
  assert.equal(cards.length, 2);
  assert.equal(cards[0].className, "scenario-action-card scenario-navigation-card scenario-parent-return-btn");
  assert.ok(nodes(cards[0]).some((node) => node.textContent === "Return to Parent"));
  assert.ok(nodes(cards[1]).some((node) => node.textContent === "(CC) · Subject"));
  assert.equal(nodes(cards[1]).find((node) => node.tagName === "span").style.backgroundColor, "#abcdef");
  cards.forEach((card) => card.fire());
  assert.deepEqual(h.calls.filter(([name]) => name === "select"), [["select", "PP"], ["select", "CC"]]);
  const section = nodes(h.root).find((node) => node.textContent === "Hierarchy Groups");
  assert.equal(section.options.rememberKey, "territories-presets:hierarchy-groups");
  assert.equal(section.children[0].textContent, "No hierarchy groups");
});

test("core path routes variants, activation and reapply without parent hierarchy", (t) => {
  const h = harness(t);
  const target = country({ releasable: true, boundaryVariants: [{ id: " BASE ", label: "Base" }, { id: "alt", label: "Alternate" }] });
  h.render(target);
  assert.equal(button(h.root, "Base").disabled, true);
  assert.equal(button(h.root, "Base").title, "Already using this boundary variant.");
  button(h.root, "Alternate").fire();
  button(h.root, "Activate Releasable").fire();
  button(h.root, "Reapply Core Territory").fire();
  assert.ok(h.calls.some(([name]) => name === "transfers"));
  assert.ok(!h.calls.some(([name]) => name === "presets"));
  assert.deepEqual(h.calls.find(([name]) => name === "activate"), ["activate", target]);
  assert.deepEqual(h.calls.find(([name]) => name === "variant"), ["variant", target, target.boundaryVariants[1]]);
  assert.deepEqual(h.calls.find(([name]) => name === "core"), ["core", target, { source: "scenario-actions", actionMode: "ownership" }]);
});

test("non-releasable country may use core actions and still get country visuals", (t) => {
  const h = harness(t, { hasScenarioCoreTerritoryActions: () => true });
  h.render(country());
  button(h.root, "Target This Country").fire();
  assert.equal(h.calls.filter(([name]) => name === "activate").length, 1);
  assert.ok(button(h.root, "Paint Owned Regions With Country Color"));
});

test("missing core disables visual core buttons and explains missing territory", (t) => {
  const h = harness(t, { getPrimaryReleasablePresetRef: () => null });
  h.render(country({ releasable: true }));
  assert.equal(button(h.root, "Apply Visual Color to Core Territory").disabled, true);
  assert.equal(button(h.root, "Clear Core Territory Visual Overrides").disabled, true);
  assert.equal(nodes(h.root).filter((node) => node.textContent === "No core territory defined").length, 2);
});

test("visual core actions preserve visual mode and filter clear targets to visible features", (t) => {
  const h = harness(t);
  const target = country({ releasable: true });
  h.render(target);
  button(h.root, "Apply Visual Color to Core Territory").fire();
  button(h.root, "Clear Core Territory Visual Overrides").fire();
  assert.deepEqual(h.calls.find(([name]) => name === "core"), ["core", target, { source: "visual-adjustments", actionMode: "visual" }]);
  assert.deepEqual(h.calls.find(([name]) => name === "filter"), ["filter", ["visible", "hidden"]]);
  const clear = h.calls.find(([name]) => name === "clearCore");
  assert.deepEqual(clear[1], ["visible"]);
  assert.equal(clear[2].historyKind, "scenario-core-clear-visual");
  assert.equal(h.calls.filter(([name]) => name === "open").length, 2);
  assert.ok(!h.calls.some(([name]) => ["activate", "hierarchy", "variant"].includes(name)));
});

test("hierarchy visuals read click-time color and leave ownership routes untouched", (t) => {
  const h = harness(t);
  const group = { label: "Group A" };
  h.render(country({ hierarchyGroups: [group] }));
  const visual = nodes(h.root).find((node) => node.textContent === "Hierarchy Groups (Visual Color)");
  h.view.selectedColor = "#fedcba";
  button(visual, "Group A").fire();
  button(h.root, "Paint Owned Regions With Country Color").fire();
  button(h.root, "Clear Owned Region Visual Overrides").fire();
  const hierarchy = h.calls.filter(([name]) => name === "hierarchy");
  assert.equal(hierarchy.length, 1);
  assert.equal(hierarchy[0][2].mode, "visual");
  assert.equal(hierarchy[0][2].color, "#fedcba");
  assert.ok(!h.calls.some(([name]) => ["activate", "core", "variant", "paintMode"].includes(name)));
  assert.deepEqual(h.calls.filter(([name]) => name === "presets").map((call) => call[3].mode), ["ownership", "visual"]);
});

test("ownership hierarchy keeps explicit owner and history metadata", (t) => {
  const h = harness(t);
  const group = { label: "Group A" };
  h.render(country({ hierarchyGroups: [group] }));
  button(h.root, "Group A").fire();
  const call = h.calls.find(([name]) => name === "hierarchy");
  assert.equal(call[2].mode, "ownership");
  assert.equal(call[2].ownerCode, "AA");
  assert.equal(call[2].ownershipHistoryKind, "scenario-hierarchy-apply-ownership");
});

test("disclosure persists open state and schedules layout; brush persists before mode switch", (t) => {
  const h = harness(t);
  h.view.visualOpen = true;
  h.render(country());
  const details = nodes(h.root).find((node) => node.tagName === "details");
  assert.equal(details.open, true);
  assert.match(h.host.className, /has-open-visual-adjustments/);
  details.open = false;
  details.fire("toggle");
  assert.equal(h.host.className, "");
  assert.deepEqual(h.calls.slice(-2), [["storeOpen", false], ["schedule"]]);
  button(h.root, "Use Visual Color Brush").fire();
  assert.deepEqual(h.calls.slice(-2), [["storeOpen", true], ["paintMode", "visual"]]);
  h.view.paintMode = "visual";
  h.render(country());
  button(h.root, "Return to Political Ownership Brush").fire();
  assert.deepEqual(h.calls.slice(-2), [["storeOpen", true], ["paintMode", "ownership"]]);
});
