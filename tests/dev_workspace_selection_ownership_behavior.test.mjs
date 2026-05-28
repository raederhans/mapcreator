import test from "node:test";
import assert from "node:assert/strict";

import { state } from "../js/core/state.js";
import { createSelectionOwnershipController } from "../js/ui/dev_workspace/selection_ownership_controller.js";

class TestButton {
  constructor() {
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(handler);
    this.listeners.set(type, listeners);
  }

  async click() {
    for (const handler of this.listeners.get("click") || []) {
      await handler({ currentTarget: this, target: this });
    }
  }
}

class TestInput extends TestButton {
  constructor() {
    super();
    this.value = "";
    this.placeholder = "";
  }
}

class TestText {
  constructor() {
    this.textContent = "";
  }
}

function createLookupRoot(elementsById) {
  return {
    querySelector(selector) {
      if (!selector.startsWith("#")) return null;
      return elementsById[selector.slice(1)] || null;
    },
  };
}

function createController({ quickRemoveBtn, selectionToggleBtn, renderWorkspace }) {
  return createSelectionOwnershipController({
    panel: createLookupRoot({
      devSelectionToggleSelectedBtn: selectionToggleBtn,
    }),
    quickbar: createLookupRoot({
      devQuickSelectionValue: new TestText(),
      devQuickTagValue: new TestText(),
      devQuickOwnerValue: new TestText(),
      devQuickControllerValue: new TestText(),
      devQuickOwnerInput: new TestInput(),
      devQuickRemoveSelectedBtn: quickRemoveBtn,
      devQuickUseTagBtn: new TestButton(),
      devQuickApplyOwnerBtn: new TestButton(),
      devQuickResetOwnerBtn: new TestButton(),
      devQuickSaveOwnersBtn: new TestButton(),
    }),
    renderWorkspace,
    renderMetaRows() {},
    normalizeOwnerInput: (value) => String(value || "").trim().toUpperCase(),
    localizeSelectionSummary: (count) => String(count),
    resolveOwnershipTargetIds: () => Array.from(state.devSelectionFeatureIds || []),
    resolveOwnershipEditorModel: () => ({
      selectionCount: state.devSelectionFeatureIds?.size || 0,
      isMixedOwner: false,
      ownerCodes: ["GER"],
      currentOwnerCode: "GER",
      currentControllerCode: "GER",
    }),
    resolveOwnershipEditorHint: () => "",
    buildOwnershipMetaRows: () => [],
  });
}

test("quickbar remove selected reuses the selection clipboard toggle for the current selected feature", async () => {
  const previousSelectedHit = state.devSelectedHit;
  const previousSelectionFeatureIds = state.devSelectionFeatureIds;
  const previousSelectionOrder = state.devSelectionOrder;
  const previousActiveScenarioId = state.activeScenarioId;
  const previousDevScenarioEditor = state.devScenarioEditor;
  const previousLandIndex = state.landIndex;
  const quickRemoveBtn = new TestButton();
  const selectionToggleBtn = new TestButton();
  let toggleClicks = 0;

  selectionToggleBtn.addEventListener("click", () => {
    toggleClicks += 1;
    const selectedId = String(state.devSelectedHit?.id || "").trim();
    if (selectedId && state.devSelectionFeatureIds?.has(selectedId)) {
      state.devSelectionFeatureIds.delete(selectedId);
    }
  });

  try {
    state.activeScenarioId = "tno_1962";
    state.devScenarioEditor = {};
    state.devSelectedHit = { targetType: "land", id: "feature-1" };
    state.devSelectionFeatureIds = new Set(["feature-1", "feature-2"]);
    state.devSelectionOrder = ["feature-1", "feature-2"];
    state.landIndex = new Map([
      ["feature-1", { id: "feature-1" }],
      ["feature-2", { id: "feature-2" }],
    ]);

    const controller = createController({
      quickRemoveBtn,
      selectionToggleBtn,
      renderWorkspace() {},
    });
    controller.bindEvents();

    controller.render({ hasActiveScenario: true });
    assert.equal(quickRemoveBtn.disabled, false);

    await quickRemoveBtn.click();
    assert.equal(toggleClicks, 1);
    assert.equal(state.devSelectionFeatureIds.has("feature-1"), false);

    state.devSelectedHit = { targetType: "land", id: "feature-3" };
    controller.render({ hasActiveScenario: true });
    assert.equal(quickRemoveBtn.disabled, true);
  } finally {
    state.devSelectedHit = previousSelectedHit;
    state.devSelectionFeatureIds = previousSelectionFeatureIds;
    state.devSelectionOrder = previousSelectionOrder;
    state.activeScenarioId = previousActiveScenarioId;
    state.devScenarioEditor = previousDevScenarioEditor;
    state.landIndex = previousLandIndex;
  }
});
