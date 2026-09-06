import test from "node:test";
import assert from "node:assert/strict";

import { createScenarioTransferController } from "../js/ui/sidebar/scenario_transfer_controller.js";
import { createScenarioTerritoryController } from "../js/ui/sidebar/scenario_territory_controller.js";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  click() {
    for (const handler of this.listeners.get("click") || []) handler();
  }
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function createHarness({
  visibleIds = [],
  transaction = (_assignments, _options) => ({ applied: true, changed: 1 }),
  scenarioMetaByCode = {},
} = {}) {
  const visible = new Set(visibleIds);
  const calls = {
    events: [],
    transactions: [],
    toasts: [],
    shells: [],
    lists: 0,
    sections: [],
    buttons: [],
    resolved: [],
    meta: [],
  };
  const render = () => {};
  const controller = createScenarioTransferController({
    t: (value) => `t:${value}`,
    normalizeCountryCode: normalizeCode,
    getScenarioCountryMeta: (code) => {
      calls.meta.push(code);
      return scenarioMetaByCode[code] || null;
    },
    resolveCompanionActionFeatureIds: (action, entry) => {
      calls.resolved.push({ action, entry });
      return action?.preset_source?.ids || [];
    },
    filterToVisibleFeatureIds: (ids = []) => {
      const requestedIds = Array.from(new Set(ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)));
      return {
        requestedIds,
        matchedIds: requestedIds.filter((id) => visible.has(id)),
        missingIds: requestedIds.filter((id) => !visible.has(id)),
      };
    },
    applyScenarioOwnerControllerAssignments: (assignments, options) => {
      calls.events.push(`transaction:${options.historyKind}`);
      calls.transactions.push({ assignments, options });
      return transaction(assignments, options);
    },
    showToast: (message, options) => {
      calls.events.push(`toast:${options.title}`);
      calls.toasts.push({ message, options });
    },
    refreshScenarioShellOverlays: (options) => {
      calls.events.push("shell");
      calls.shells.push(options);
    },
    render,
    renderList: () => {
      calls.events.push("list");
      calls.lists += 1;
    },
    appendActionSection: (container, title) => {
      const section = new FakeElement();
      calls.sections.push({ container, title, section });
      container.appendChild(section);
      return section;
    },
    createInspectorActionButton: (label, onClick) => {
      const button = new FakeElement("button");
      button.textContent = label;
      button.addEventListener("click", onClick);
      calls.buttons.push(button);
      return button;
    },
  });
  return { controller, calls, render, visible };
}

function companionAction({
  id = "transfer",
  label = "Transfer label",
  owner = "new",
  ids = ["shown"],
  auto = false,
  hidden = false,
} = {}) {
  return {
    id,
    label,
    target_owner_tag: owner,
    preset_source: { ids },
    auto_apply_on_core_territory: auto,
    hidden_in_ui: hidden,
  };
}

test("manual transfer applies only visible ids and orders toast, shell refresh, and list render", () => {
  const meta = { tag: "CORE", source: "scenario-meta" };
  const { controller, calls, render } = createHarness({
    visibleIds: ["shown"],
    scenarioMetaByCode: { CORE: meta },
  });
  const country = { code: "CORE", source: "country-state" };
  const action = companionAction({ ids: ["shown", "missing", "shown"], owner: " new " });

  assert.equal(controller.applyScenarioCompanionAction(country, action), true);

  assert.equal(calls.meta[0], "CORE");
  assert.equal(calls.resolved[0].entry, meta);
  assert.deepEqual(calls.transactions, [{
    assignments: {
      shown: { ownerCode: "NEW", controllerCode: "NEW" },
    },
    options: {
      render,
      historyKind: "scenario-companion-transfer:CORE:transfer",
      dirtyReason: "scenario-companion-transfer",
      recomputeReason: "sidebar-companion-transfer",
    },
  }]);
  assert.deepEqual(calls.toasts, [{
    message: "t:Applied 1/1 t:features",
    options: {
      title: "Transfer label",
      tone: "success",
      duration: 3200,
    },
  }]);
  assert.deepEqual(calls.shells, [{
    renderNow: false,
    borderReason: "scenario-shells:companion-action:CORE:transfer",
  }]);
  assert.deepEqual(calls.events, [
    "transaction:scenario-companion-transfer:CORE:transfer",
    "toast:Transfer label",
    "shell",
    "list",
  ]);
});

test("an already-matching manual transfer remains successful and reports no changes", () => {
  const { controller, calls } = createHarness({
    visibleIds: ["shown"],
    transaction: () => ({ applied: true, changed: 0 }),
  });

  assert.equal(controller.applyScenarioCompanionAction(
    { code: "CORE" },
    companionAction(),
  ), true);

  assert.deepEqual(calls.toasts, [{
    message: "t:Historical transfer already matches current ownership.",
    options: { title: "t:No changes", tone: "info", duration: 2800 },
  }]);
  assert.deepEqual(calls.events.slice(1), ["toast:t:No changes", "shell", "list"]);
});

test("manual transfer failures stay side-effect bounded and preserve distinct feedback", async (t) => {
  await t.test("missing target owner", () => {
    const { controller, calls } = createHarness({ visibleIds: ["shown"] });
    assert.equal(controller.applyScenarioCompanionAction(
      { code: "CORE" }, companionAction({ owner: "" }),
    ), false);
    assert.deepEqual(calls.toasts.map(({ message }) => message), [
      "t:Historical transfer target is missing.",
    ]);
    assert.equal(calls.transactions.length, 0);
    assert.equal(calls.lists, 0);
    assert.equal(calls.shells.length, 0);
  });

  await t.test("empty source", () => {
    const { controller, calls } = createHarness();
    assert.equal(controller.applyScenarioCompanionAction(
      { code: "CORE" }, companionAction({ ids: [] }),
    ), false);
    assert.deepEqual(calls.toasts.map(({ message }) => message), [
      "t:Historical transfer was not applied.",
    ]);
    assert.deepEqual(calls.events, ["toast:t:Transfer not applied", "list"]);
    assert.equal(calls.transactions.length, 0);
  });

  await t.test("no visible source ids", () => {
    const { controller, calls } = createHarness();
    assert.equal(controller.applyScenarioCompanionAction(
      { code: "CORE" }, companionAction({ ids: ["detail-only"] }),
    ), false);
    assert.deepEqual(calls.toasts.map(({ message }) => message), [
      "t:Current map does not include this action's detail features. Load detail topology and try again.",
    ]);
    assert.deepEqual(calls.events, ["toast:t:Transfer not applied", "list"]);
    assert.equal(calls.transactions.length, 0);
  });

  await t.test("transaction rejection", () => {
    const { controller, calls } = createHarness({
      visibleIds: ["shown"],
      transaction: () => ({ applied: false, changed: 0, reason: "locked" }),
    });
    assert.equal(controller.applyScenarioCompanionAction(
      { code: "CORE" }, companionAction(),
    ), false);
    assert.deepEqual(calls.events, [
      "transaction:scenario-companion-transfer:CORE:transfer",
      "toast:t:Transfer not applied",
      "list",
    ]);
    assert.equal(calls.shells.length, 0);
  });

  await t.test("transaction-owned no-visible rejection", () => {
    const { controller, calls } = createHarness({
      visibleIds: ["shown"],
      transaction: () => ({ applied: false, changed: 0, reason: "no-visible-features" }),
    });
    assert.equal(controller.applyScenarioCompanionAction(
      { code: "CORE" }, companionAction(),
    ), false);
    assert.deepEqual(calls.events, [
      "transaction:scenario-companion-transfer:CORE:transfer",
      "list",
    ]);
    assert.equal(calls.toasts.length, 0);
    assert.equal(calls.shells.length, 0);
  });
});

test("automatic transfers keep declaration order, continue after failures, and stay silent", () => {
  const outcomes = new Map([
    ["auto-fails", { applied: false, changed: 0, reason: "locked" }],
    ["hidden-auto", { applied: true, changed: 1 }],
    ["auto-last", { applied: true, changed: 1 }],
  ]);
  const { controller, calls } = createHarness({
    visibleIds: ["fail", "hidden", "last"],
    transaction: (_assignments, options) => outcomes.get(options.historyKind.split(":").at(-1)),
  });
  const country = {
    code: "CORE",
    companionActions: [
      companionAction({ id: "manual-only", ids: ["last"] }),
      companionAction({ id: "no-visible", ids: ["detail-only"], auto: true }),
      companionAction({ id: "missing-owner", owner: "", ids: ["last"], auto: true }),
      companionAction({ id: "auto-fails", ids: ["fail"], auto: true }),
      companionAction({ id: "hidden-auto", ids: ["hidden"], auto: true, hidden: true }),
      companionAction({ id: "auto-last", ids: ["last"], auto: true }),
    ],
  };

  assert.equal(controller.applyScenarioAutoCompanionActions(country), true);

  assert.deepEqual(calls.transactions.map(({ options }) => options.historyKind), [
    "scenario-companion-transfer:CORE:auto-fails",
    "scenario-companion-transfer:CORE:hidden-auto",
    "scenario-companion-transfer:CORE:auto-last",
  ]);
  assert.deepEqual(calls.transactions.map(({ assignments }) => Object.keys(assignments)), [
    ["fail"], ["hidden"], ["last"],
  ]);
  assert.equal(calls.toasts.length, 0, "silent auto actions must not leak no-visible feedback");
  assert.equal(calls.shells.length, 0);
  assert.equal(calls.lists, 0);
});

test("historical transfer rendering excludes hidden actions while hidden automatic actions remain executable", () => {
  const { controller, calls } = createHarness({ visibleIds: ["shown", "hidden"] });
  const country = {
    code: "CORE",
    companionActions: [
      companionAction({ id: "visible", label: "Visible transfer", ids: ["shown"] }),
      companionAction({ id: "fallback-label", label: "", ids: ["shown"] }),
      companionAction({ id: "hidden", label: "Hidden transfer", ids: ["hidden"], auto: true, hidden: true }),
    ],
  };
  const container = new FakeElement();

  controller.renderScenarioHistoricalTransfers(container, country);

  assert.equal(calls.sections.length, 1);
  assert.equal(calls.sections[0].title, "t:Historical Transfers");
  assert.deepEqual(calls.buttons.map(({ textContent }) => textContent), [
    "Visible transfer", "fallback-label",
  ]);
  calls.buttons[0].click();
  assert.equal(calls.transactions[0].options.historyKind,
    "scenario-companion-transfer:CORE:visible");

  calls.transactions.length = 0;
  controller.applyScenarioAutoCompanionActions(country);
  assert.deepEqual(calls.transactions.map(({ options }) => options.historyKind), [
    "scenario-companion-transfer:CORE:hidden",
  ]);
});

function loadCoreTerritoryFlow({ coreResult }) {
  const calls = { events: [], transactions: [], toasts: [], shells: 0, lists: 0 };
  const country = {
    code: "CORE",
    companionActions: [companionAction({ id: "auto", ids: ["auto-id"], auto: true })],
  };
  const applyAssignments = (assignments, options) => {
    calls.events.push(`transaction:${options.historyKind}`);
    calls.transactions.push({ assignments, options });
    return options.historyKind === "scenario-core-apply-ownership"
      ? coreResult
      : { applied: true, changed: 1 };
  };
  const showToast = (_message, options) => {
    calls.events.push(`toast:${options.title}`);
    calls.toasts.push(options);
  };
  const refreshScenarioShellOverlays = () => {
    calls.events.push("shell");
    calls.shells += 1;
  };
  const controller = createScenarioTransferController({
    t: (value) => value,
    normalizeCountryCode: normalizeCode,
    getScenarioCountryMeta: () => null,
    resolveCompanionActionFeatureIds: (action) => action.preset_source.ids,
    filterToVisibleFeatureIds: (ids) => ({
      requestedIds: [...ids], matchedIds: [...ids], missingIds: [],
    }),
    applyScenarioOwnerControllerAssignments: applyAssignments,
    showToast,
    refreshScenarioShellOverlays,
    render: () => {},
    renderList: () => {
      calls.events.push("list");
      calls.lists += 1;
    },
    appendActionSection: () => new FakeElement(),
    createInspectorActionButton: () => new FakeElement("button"),
  });
  const territoryController = createScenarioTerritoryController({
    t: (value) => value,
    prepareScenarioCoreApplication: () => ({
      applied: true,
      assignments: { "core-id": { ownerCode: "CORE", controllerCode: "CORE" } },
    }),
    getPrimaryReleasablePresetRef: () => ({ preset: { ids: ["core-id"] } }),
    applyPresetReference: () => ({ applied: true, matchedCount: 1, requestedCount: 1 }),
    getCountryState: () => null,
    getResolvedCountryColor: () => "#000000",
    blockLockedScenarioInteraction: () => false,
    applyScenarioOwnerControllerAssignments: applyAssignments,
    activateCoreOwner: () => calls.events.push("active-owner-ui"),
    setReleasableBoundaryVariant: () => true,
    applyScenarioAutoCompanionActions: controller.applyScenarioAutoCompanionActions,
    refreshScenarioShellOverlays,
    showToast,
    render: () => {},
    renderList: () => {
      calls.events.push("list");
      calls.lists += 1;
    },
  });
  return {
    runCoreApply: territoryController.applyScenarioReleasableCoreTerritory,
    country,
    calls,
  };
}

test("territory flow runs automatic transfers only after core success and refreshes once", () => {
  const succeeded = loadCoreTerritoryFlow({
    coreResult: { applied: true, changed: 1, matchedCount: 1 },
  });
  assert.equal(succeeded.runCoreApply(succeeded.country), true);
  assert.deepEqual(succeeded.calls.events, [
    "transaction:scenario-core-apply-ownership",
    "active-owner-ui",
    "toast:Political ownership updated",
    "transaction:scenario-companion-transfer:CORE:auto",
    "shell",
    "list",
  ]);
  assert.equal(succeeded.calls.shells, 1);
  assert.equal(succeeded.calls.lists, 1);

  const failed = loadCoreTerritoryFlow({
    coreResult: { applied: false, changed: 0, reason: "locked" },
  });
  assert.equal(failed.runCoreApply(failed.country), false);
  assert.deepEqual(failed.calls.events, [
    "transaction:scenario-core-apply-ownership",
    "toast:Apply failed",
    "list",
  ]);
  assert.equal(failed.calls.transactions.some(({ options }) => (
    options.historyKind.startsWith("scenario-companion-transfer:")
  )), false);
  assert.equal(failed.calls.shells, 0);
  assert.equal(failed.calls.lists, 1);
});
