import test from "node:test";
import assert from "node:assert/strict";

import { getDefaultTransportWorkbenchPackIdForFamily } from "../js/core/transport_pack_resolver.js";
import { createTransportWorkbenchStateOwner } from "../js/ui/toolbar/transport_workbench_state_owner.js";

function createOwner(initialUi = {}) {
  const runtimeState = { transportWorkbenchUi: initialUi };
  return {
    owner: createTransportWorkbenchStateOwner(runtimeState),
    runtimeState,
  };
}

test("transport workbench state owner preserves the UI object while normalizing shape", () => {
  const existingUi = {
    activeFamily: "road",
    activePackId: "",
    familyConfigs: { road: { roadClass: ["motorway"] } },
    sectionOpen: { road: { data: false } },
    previewCamera: { scale: "2", translateX: "12", translateY: "-4" },
  };
  const { owner, runtimeState } = createOwner(existingUi);

  const normalized = owner.ensureUiState();

  assert.equal(normalized, existingUi);
  assert.equal(runtimeState.transportWorkbenchUi, existingUi);
  assert.equal(normalized.activePackIdByFamily.road, getDefaultTransportWorkbenchPackIdForFamily("road"));
  assert.equal(normalized.previewCamera.scale, 2);
  assert.equal(normalized.previewCamera.translateX, 12);
  assert.equal(normalized.previewCamera.translateY, -4);
  assert.equal(typeof normalized.displayConfigs.port, "object");
  assert.equal(typeof normalized.sectionOpen.road, "object");
});

test("transport workbench state owner updates active pack and family-local pack map", () => {
  const { owner, runtimeState } = createOwner({});

  const meta = owner.setActivePackId("germany_road");

  assert.equal(meta.packId, "germany_road");
  assert.equal(runtimeState.transportWorkbenchUi.activeFamily, "road");
  assert.equal(runtimeState.transportWorkbenchUi.activePackId, "germany_road");
  assert.equal(runtimeState.transportWorkbenchUi.activePackIdByFamily.road, "germany_road");
  assert.equal(runtimeState.transportWorkbenchUi.sampleCountry, "Germany");
});

test("transport workbench state owner keeps workbench-only active pack choices", () => {
  const { owner, runtimeState } = createOwner({});

  const meta = owner.setActivePackId("germany_energy_facilities");

  assert.equal(meta.packId, "germany_energy_facilities");
  assert.equal(runtimeState.transportWorkbenchUi.activeFamily, "energy_facilities");
  assert.equal(runtimeState.transportWorkbenchUi.activePackId, "germany_energy_facilities");
  assert.equal(runtimeState.transportWorkbenchUi.activePackIdByFamily.energy_facilities, "germany_energy_facilities");
  owner.ensureUiState();
  assert.equal(runtimeState.transportWorkbenchUi.activePackId, "germany_energy_facilities");
  assert.equal(runtimeState.transportWorkbenchUi.activePackIdByFamily.energy_facilities, "germany_energy_facilities");
});

test("transport workbench state owner restores family-local active pack choices", () => {
  const { owner, runtimeState } = createOwner({
    activeFamily: "road",
    activePackIdByFamily: {
      road: "germany_road",
      rail: "france_rail",
    },
  });
  owner.ensureUiState();

  assert.equal(owner.setActiveFamily("rail"), "rail");
  assert.equal(runtimeState.transportWorkbenchUi.activePackId, "france_rail");
  assert.equal(runtimeState.transportWorkbenchUi.activePackIdByFamily.rail, "france_rail");
  assert.equal(runtimeState.transportWorkbenchUi.sampleCountry, "France");

  assert.equal(owner.setActiveFamily("road"), "road");
  assert.equal(runtimeState.transportWorkbenchUi.activePackId, "germany_road");
  assert.equal(runtimeState.transportWorkbenchUi.activePackIdByFamily.road, "germany_road");
  assert.equal(runtimeState.transportWorkbenchUi.sampleCountry, "Germany");
});

test("transport workbench state owner returns and clears drawer restore flags on close", () => {
  const { owner, runtimeState } = createOwner({});

  owner.prepareOpenState({ restoreLeftDrawer: true, restoreRightDrawer: true });
  owner.setOpenState(true);
  owner.setOpenState(false);
  const restoreState = owner.prepareCloseState();

  assert.deepEqual(restoreState, {
    restoreLeftDrawer: true,
    restoreRightDrawer: true,
  });
  assert.equal(runtimeState.transportWorkbenchUi.open, false);
  assert.equal(runtimeState.transportWorkbenchUi.restoreLeftDrawer, false);
  assert.equal(runtimeState.transportWorkbenchUi.restoreRightDrawer, false);
});

test("transport workbench state owner removes stale compare state before config updates", () => {
  const { owner } = createOwner({
    activeFamily: "road",
    compareHeld: true,
    familyConfigs: { road: { roadClass: ["motorway"] } },
  });
  const uiState = owner.ensureUiState();

  assert.equal(Object.hasOwn(uiState, "compareHeld"), false);
  assert.equal(owner.updateFamilyConfig("road", "roadClass", true, { appendValue: "trunk" }), true);

  assert.deepEqual(owner.getWorkingConfig("road").roadClass, ["motorway", "trunk"]);
});

test("transport workbench state owner limits display config writes to density families", () => {
  const { owner } = createOwner({});
  owner.ensureUiState();

  assert.equal(owner.updateDisplayConfig("road", () => {}), false);
  assert.equal(owner.updateDisplayConfig("port", (draft) => {
    draft.labels.budget = 12;
  }), true);

  assert.equal(owner.getDisplayConfig("port").labels.budget, 12);
});

test("transport workbench state owner moves layer order without duplicating families", () => {
  const { owner } = createOwner({
    layerOrder: ["road", "rail", "airport", "port"],
  });
  owner.ensureUiState();

  assert.equal(owner.moveLayerOrder("port", "road"), true);

  const order = owner.ensureUiState().layerOrder;
  assert.equal(order[0], "port");
  assert.equal(new Set(order).size, order.length);
});
