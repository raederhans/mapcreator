import test from "node:test";
import assert from "node:assert/strict";

import { createTransportWorkbenchPreviewLifecycleOwner } from "../js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js";

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("transport workbench preview lifecycle owner schedules warmup once during runtime hook init", async () => {
  const runtimeState = { transportWorkbenchUi: { open: false, activeFamily: "road" } };
  const warmCalls = [];
  const warnCalls = [];
  const selectionListeners = new Map();
  let carrierListener = null;
  let timeoutCalls = 0;
  let idleCalls = 0;

  const owner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    listWarmupPlans: () => [
      { familyId: "road", includeFull: true },
      { familyId: "port", includeFull: false },
    ],
    warmFamilyPreview: async (familyId, options) => {
      warmCalls.push({ familyId, options });
      if (familyId === "port") {
        throw new Error("port warm failed");
      }
      return true;
    },
    setCarrierViewChangeListener: (listener) => {
      carrierListener = listener;
    },
    setFamilyPreviewSelectionListener: (familyId, listener) => {
      selectionListeners.set(familyId, listener);
    },
    runtimeFamilyIds: ["road", "port"],
    scheduleTimeout: (callback, delay) => {
      timeoutCalls += 1;
      assert.equal(delay, 10_000);
      callback();
      return timeoutCalls;
    },
    requestIdle: (callback, options) => {
      idleCalls += 1;
      assert.deepEqual(options, { timeout: 2_000 });
      callback();
      return idleCalls;
    },
    warnWarmupFailure: (familyId, reason) => {
      warnCalls.push({ familyId, message: reason?.message || String(reason) });
    },
  });

  owner.initializeRuntimeHooks();
  owner.initializeRuntimeHooks();
  await flushMicrotasks();

  assert.equal(timeoutCalls, 1);
  assert.equal(idleCalls, 1);
  assert.deepEqual(warmCalls, [
    { familyId: "road", options: { includeFull: true } },
    { familyId: "port", options: { includeFull: false } },
  ]);
  assert.deepEqual(warnCalls, [
    { familyId: "port", message: "port warm failed" },
  ]);
  assert.equal(typeof carrierListener, "function");
  assert.equal(typeof selectionListeners.get("road"), "function");
  assert.equal(typeof selectionListeners.get("port"), "function");
});

test("transport workbench preview lifecycle owner selection listeners refresh the active family shell", () => {
  const runtimeState = { transportWorkbenchUi: { open: true, activeFamily: "road" } };
  const selectionListeners = new Map();
  const lensCalls = [];
  const inspectorCalls = [];
  let context = {
    isOpen: true,
    family: { id: "road" },
    config: { roadClass: ["motorway"] },
    compareHeld: false,
  };

  const owner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    getRenderContext: () => context,
    listWarmupPlans: () => [],
    setCarrierViewChangeListener: () => {},
    setFamilyPreviewSelectionListener: (familyId, listener) => {
      selectionListeners.set(familyId, listener);
    },
    runtimeFamilyIds: ["road", "port"],
    scheduleTimeout: () => 0,
    renderLensSections: (family, config, compareHeld) => {
      lensCalls.push({ familyId: family.id, config, compareHeld });
    },
    renderInspector: (family, config, compareHeld) => {
      inspectorCalls.push({ familyId: family.id, config, compareHeld });
    },
  });

  owner.initializeRuntimeHooks();
  selectionListeners.get("road")();

  assert.deepEqual(lensCalls, [
    { familyId: "road", config: { roadClass: ["motorway"] }, compareHeld: false },
  ]);
  assert.deepEqual(inspectorCalls, [
    { familyId: "road", config: { roadClass: ["motorway"] }, compareHeld: false },
  ]);

  context = { ...context, family: { id: "port" } };
  selectionListeners.get("road")();
  context = { ...context, isOpen: false, family: { id: "road" } };
  selectionListeners.get("road")();

  assert.equal(lensCalls.length, 1);
  assert.equal(inspectorCalls.length, 1);
});

test("transport workbench preview lifecycle owner restores runtime listeners after dispose", () => {
  const runtimeState = { transportWorkbenchUi: { open: false, activeFamily: "road" } };
  let carrierListener = null;
  const registeredFamilies = [];

  const owner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    listWarmupPlans: () => [],
    setCarrierViewChangeListener: (listener) => {
      carrierListener = listener;
    },
    setFamilyPreviewSelectionListener: (familyId) => {
      registeredFamilies.push(familyId);
    },
    runtimeFamilyIds: ["road", "port"],
    destroyCarrier: () => {
      carrierListener = null;
    },
    destroyFamilyPreviews: () => {},
    scheduleTimeout: () => 0,
  });

  owner.initializeRuntimeHooks();
  assert.equal(typeof carrierListener, "function");
  owner.dispose();

  assert.equal(typeof carrierListener, "function");
  assert.deepEqual(registeredFamilies, ["road", "port", "road", "port"]);
});
