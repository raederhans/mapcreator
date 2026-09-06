import test from "node:test";
import assert from "node:assert/strict";

import { createScenarioTerritoryController } from "../js/ui/sidebar/scenario_territory_controller.js";

const country = { code: "CORE", source: "initial-country" };

function createHarness({
  locked = false,
  plan = {
    applied: true,
    requestedCount: 2,
    matchedCount: 1,
    missingCount: 1,
    assignments: { core: { ownerCode: "CORE", controllerCode: "CORE" } },
  },
  transactionResult = { applied: true, changed: 1, matchedCount: 1 },
  presetRef = { presetLookupCode: "AA", presetIndex: -1, preset: { ids: ["core"] } },
  visualResult = { applied: true, changed: 1, matchedCount: 1, requestedCount: 1 },
  selected = true,
  resolvedCountry = { code: "CORE", source: "resolved-country" },
} = {}) {
  const calls = {
    events: [],
    prepares: [],
    transactions: [],
    activations: [],
    variants: [],
    visual: [],
    toasts: [],
    shells: [],
    auto: [],
    lists: 0,
    presetRefs: 0,
  };
  const render = () => {};
  const controller = createScenarioTerritoryController({
    t: (value) => `t:${value}`,
    prepareScenarioCoreApplication: (countryState, options = {}) => {
      calls.events.push(`prepare:${options.variantId || "core"}`);
      calls.prepares.push({ countryState, options });
      return plan;
    },
    getPrimaryReleasablePresetRef: (countryState) => {
      calls.events.push("preset");
      calls.presetRefs += 1;
      assert.equal(countryState, country);
      return presetRef;
    },
    applyPresetReference: (ref, options) => {
      calls.events.push("visual");
      calls.visual.push({ ref, options });
      return visualResult;
    },
    getCountryState: (code) => {
      calls.events.push("country");
      assert.equal(code, "CORE");
      return resolvedCountry;
    },
    getResolvedCountryColor: (countryState) => {
      calls.events.push("color");
      assert.equal(countryState, resolvedCountry);
      return "#445566";
    },
    blockLockedScenarioInteraction: () => {
      calls.events.push("lock");
      return locked;
    },
    applyScenarioOwnerControllerAssignments: (assignments, options) => {
      calls.events.push("transaction");
      calls.transactions.push({ assignments, options });
      return transactionResult;
    },
    activateCoreOwner: (code, options) => {
      calls.events.push("activate");
      calls.activations.push({ code, options });
    },
    setReleasableBoundaryVariant: (code, variantId) => {
      calls.events.push("variant");
      calls.variants.push({ code, variantId });
      return selected;
    },
    applyScenarioAutoCompanionActions: (countryState) => {
      calls.events.push("auto");
      calls.auto.push(countryState);
    },
    refreshScenarioShellOverlays: (options) => {
      calls.events.push("shell");
      calls.shells.push(options);
    },
    showToast: (message, options) => {
      calls.events.push(`toast:${options.title}`);
      calls.toasts.push({ message, options });
    },
    render,
    renderList: () => {
      calls.events.push("list");
      calls.lists += 1;
    },
  });
  return { controller, calls, render, plan, presetRef, resolvedCountry };
}

function withMutedWarnings(run) {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return run();
  } finally {
    console.warn = originalWarn;
  }
}

test("ownership lock rejects before planning or changing active editing state", () => {
  const { controller, calls } = createHarness({ locked: true });

  assert.equal(controller.applyScenarioReleasableCoreTerritory(country, {
    forceSovereignty: true,
  }), false);

  assert.deepEqual(calls.events, ["lock"]);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.variants, []);
  assert.deepEqual(calls.transactions, []);
});

test("failed ownership planning leaves active owner, paint mode, and variants untouched", () => {
  const { controller, calls } = createHarness({
    plan: {
      applied: false,
      reason: "no-visible-features",
      requestedCount: 2,
      matchedCount: 0,
      missingCount: 2,
      assignments: {},
    },
  });

  assert.equal(withMutedWarnings(
    () => controller.applyScenarioReleasableCoreTerritory(country),
  ), false);

  assert.deepEqual(calls.events, [
    "lock",
    "prepare:core",
    "toast:t:Core territory was not applied.",
    "list",
  ]);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.variants, []);
  assert.deepEqual(calls.transactions, []);
  assert.deepEqual(calls.auto, []);
  assert.deepEqual(calls.shells, []);
});

test("ownership transaction rejection never activates the core owner", () => {
  const { controller, calls } = createHarness({
    transactionResult: { applied: false, changed: 0, reason: "locked" },
  });

  assert.equal(controller.applyScenarioReleasableCoreTerritory(country), false);

  assert.deepEqual(calls.events, [
    "lock", "prepare:core", "transaction", "toast:t:Apply failed", "list",
  ]);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.auto, []);
  assert.deepEqual(calls.shells, []);
});

test("partial ownership success commits before activation and preserves history keys", () => {
  const partialPlan = {
    applied: true,
    requestedCount: 3,
    matchedCount: 2,
    missingCount: 1,
    assignments: {
      first: { ownerCode: "CORE", controllerCode: "CORE" },
      second: { ownerCode: "CORE", controllerCode: "CORE" },
    },
  };
  const { controller, calls, render } = createHarness({
    plan: partialPlan,
    transactionResult: { applied: true, changed: 1, matchedCount: 2 },
  });

  assert.equal(controller.applyScenarioReleasableCoreTerritory(country, {
    forceSovereignty: true,
  }), true);

  assert.deepEqual(calls.events, [
    "lock",
    "prepare:core",
    "transaction",
    "activate",
    "toast:t:Political ownership updated",
    "auto",
    "shell",
    "list",
  ]);
  assert.deepEqual(calls.transactions, [{
    assignments: partialPlan.assignments,
    options: {
      render,
      historyKind: "scenario-core-apply-ownership",
      dirtyReason: "scenario-core-apply-ownership",
      recomputeReason: "scenario-core-apply-ownership",
    },
  }]);
  assert.deepEqual(calls.activations, [{
    code: "CORE", options: { forceSovereignty: true },
  }]);
  assert.deepEqual(calls.toasts[0], {
    message: "t:Applied 1/2 t:features",
    options: {
      title: "t:Political ownership updated", tone: "success", duration: 3200,
    },
  });
  assert.deepEqual(calls.auto, [country]);
  assert.deepEqual(calls.shells, [{
    renderNow: false, borderReason: "scenario-shells:core-apply:CORE",
  }]);
});

test("no-op ownership success still activates and completes downstream synchronization", () => {
  const { controller, calls } = createHarness({
    transactionResult: { applied: true, changed: 0, matchedCount: 1 },
  });

  assert.equal(controller.applyScenarioReleasableCoreTerritory(country), true);

  assert.deepEqual(calls.events, [
    "lock",
    "prepare:core",
    "transaction",
    "activate",
    "toast:t:No changes",
    "auto",
    "shell",
    "list",
  ]);
  assert.deepEqual(calls.activations, [{
    code: "CORE", options: { forceSovereignty: false },
  }]);
  assert.deepEqual(calls.toasts[0], {
    message: "t:Core territory already matches current ownership.",
    options: { title: "t:No changes", tone: "info", duration: 2800 },
  });
});

test("visual apply uses only the resolved preset path and its visual history", () => {
  const { controller, calls, render, presetRef } = createHarness();

  assert.equal(controller.applyScenarioReleasableCoreTerritory(country, {
    source: "visual-test", actionMode: "visual", forceSovereignty: true,
  }), true);

  assert.deepEqual(calls.events, [
    "preset", "country", "color", "visual", "toast:t:Visual color applied", "list",
  ]);
  assert.deepEqual(calls.visual, [{
    ref: presetRef,
    options: {
      mode: "visual",
      color: "#445566",
      render,
      visualHistoryKind: "scenario-core-apply-visual",
      visualDirtyReason: "scenario-core-apply-visual",
    },
  }]);
  assert.deepEqual(calls.transactions, []);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.variants, []);
  assert.deepEqual(calls.auto, []);
  assert.deepEqual(calls.shells, []);
});

test("boundary variant preflight passes the requested id and fails before selection", () => {
  const failedPlan = {
    applied: false,
    reason: "missing-variant",
    requestedCount: 0,
    matchedCount: 0,
    missingCount: 0,
    assignments: {},
  };
  const { controller, calls } = createHarness({ plan: failedPlan });

  assert.equal(controller.applyReleasableBoundaryVariantSelection(
    country, { id: "expanded" },
  ), false);

  assert.deepEqual(calls.prepares, [{
    countryState: country, options: { variantId: "expanded" },
  }]);
  assert.deepEqual(calls.variants, []);
  assert.deepEqual(calls.transactions, []);
  assert.deepEqual(calls.activations, []);
});

test("boundary variant setter rejection does not start the ownership transaction", () => {
  const { controller, calls } = createHarness({ selected: false });

  assert.equal(controller.applyReleasableBoundaryVariantSelection(
    country, { id: "expanded" },
  ), false);

  assert.deepEqual(calls.events, [
    "lock", "prepare:expanded", "variant", "toast:t:Variant not applied",
  ]);
  assert.deepEqual(calls.variants, [{ code: "CORE", variantId: "expanded" }]);
  assert.deepEqual(calls.transactions, []);
  assert.deepEqual(calls.activations, []);
});

test("boundary variant commit rejection returns false and never activates downstream work", () => {
  const { controller, calls } = createHarness({
    transactionResult: { applied: false, changed: 0, reason: "locked" },
  });

  assert.equal(controller.applyReleasableBoundaryVariantSelection(
    country, { id: "expanded" },
  ), false);

  assert.deepEqual(calls.events, [
    "lock",
    "prepare:expanded",
    "variant",
    "country",
    "transaction",
    "toast:t:Apply failed",
    "list",
  ]);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.auto, []);
  assert.deepEqual(calls.shells, []);
});

test("boundary variant success commits the prepared plan against refreshed country state", () => {
  const { controller, calls, resolvedCountry } = createHarness();

  assert.equal(controller.applyReleasableBoundaryVariantSelection(
    country, { id: "expanded" },
  ), true);

  assert.deepEqual(calls.events, [
    "lock",
    "prepare:expanded",
    "variant",
    "country",
    "transaction",
    "activate",
    "toast:t:Political ownership updated",
    "auto",
    "shell",
    "list",
  ]);
  assert.deepEqual(calls.activations, [{
    code: "CORE", options: { forceSovereignty: false },
  }]);
  assert.deepEqual(calls.auto, [resolvedCountry]);
});

test("missing visual preset fails closed without entering ownership or lock paths", () => {
  const { controller, calls } = createHarness({ presetRef: null });

  assert.equal(withMutedWarnings(() => controller.applyScenarioReleasableCoreTerritory(
    country, { actionMode: "visual", source: "visual-test" },
  )), false);

  assert.deepEqual(calls.events, ["preset"]);
  assert.deepEqual(calls.transactions, []);
  assert.deepEqual(calls.activations, []);
  assert.deepEqual(calls.variants, []);
});
