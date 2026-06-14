import test from "node:test";
import assert from "node:assert/strict";

import { createTransportWorkbenchPreviewLifecycleOwner } from "../js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js";
import {
  buildTransportWorkbenchProjectedLines,
  createTransportWorkbenchLinePathD,
  measureTransportWorkbenchProjectedLineLength,
  normalizeTransportWorkbenchNumber,
} from "../js/ui/transport_workbench_line_runtime_shared.js";
import {
  __transportWorkbenchPointPreviewTestInternals,
} from "../js/ui/transport_workbench_point_preview_shared.js";

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("transport workbench line helpers keep shared path, length, and segment contracts", () => {
  const geometry = {
    type: "MultiLineString",
    coordinates: [
      [[0, 0], [3, 4]],
      [[3, 4], [6, 8]],
    ],
  };

  assert.equal(createTransportWorkbenchLinePathD(geometry), "M 0 0 L 3 4 M 3 4 L 6 8");
  assert.equal(measureTransportWorkbenchProjectedLineLength(geometry), 10);
  assert.equal(normalizeTransportWorkbenchNumber("bad", 7), 7);
  assert.deepEqual(buildTransportWorkbenchProjectedLines(geometry), [
    {
      points: [[0, 0], [3, 4]],
      pathD: "M 0 0 L 3 4",
      length: 5,
      segments: [
        {
          start: [0, 0],
          end: [3, 4],
          startDistance: 0,
          length: 5,
          angle: 53.13010235415598,
        },
      ],
    },
    {
      points: [[3, 4], [6, 8]],
      pathD: "M 3 4 L 6 8",
      length: 5,
      segments: [
        {
          start: [3, 4],
          end: [6, 8],
          startDistance: 0,
          length: 5,
          angle: 53.13010235415598,
        },
      ],
    },
  ]);
});

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

test("transport workbench preview lifecycle owner batches selection listeners to one frame", () => {
  const runtimeState = { transportWorkbenchUi: { open: true, activeFamily: "road" } };
  const selectionListeners = new Map();
  const lensCalls = [];
  const inspectorCalls = [];
  const rafCallbacks = [];
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
    requestAnimationFrame: (callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    },
    renderLensSections: (family, config, compareHeld) => {
      lensCalls.push({ familyId: family.id, config, compareHeld });
    },
    renderInspector: (family, config, compareHeld) => {
      inspectorCalls.push({ familyId: family.id, config, compareHeld });
    },
  });

  owner.initializeRuntimeHooks();
  selectionListeners.get("road")();
  selectionListeners.get("road")();

  assert.equal(lensCalls.length, 0);
  assert.equal(inspectorCalls.length, 0);
  assert.equal(rafCallbacks.length, 1);
  rafCallbacks.shift()();
  assert.deepEqual(lensCalls, [
    { familyId: "road", config: { roadClass: ["motorway"] }, compareHeld: false },
  ]);
  assert.deepEqual(inspectorCalls, [
    { familyId: "road", config: { roadClass: ["motorway"] }, compareHeld: false },
  ]);

  context = { ...context, family: { id: "port" } };
  selectionListeners.get("road")();
  rafCallbacks.shift()();
  context = { ...context, isOpen: false, family: { id: "road" } };
  selectionListeners.get("road")();
  rafCallbacks.shift()();

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

test("transport workbench preview lifecycle owner schedules carrier view sync as view-only preview refresh", async () => {
  const runtimeState = { transportWorkbenchUi: { open: true, activeFamily: "airport" } };
  const refreshCalls = [];
  let carrierListener = null;
  let rafCallback = null;
  let viewState = { scale: 1, translateX: 0, translateY: 0, quarterTurns: 0 };

  const owner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    getRenderContext: () => ({
      isOpen: true,
      family: { id: "airport" },
      config: { airportType: ["international"] },
      compareHeld: false,
    }),
    getCarrierMount: () => ({}),
    getCarrierViewState: () => viewState,
    listWarmupPlans: () => [],
    renderFamilyPreview: async (familyId, config, options) => {
      refreshCalls.push({ familyId, config, viewOnly: !!options?.viewOnly });
      return null;
    },
    setCarrierViewChangeListener: (listener) => {
      carrierListener = listener;
    },
    setFamilyPreviewSelectionListener: () => {},
    runtimeFamilyIds: ["airport"],
    scheduleTimeout: () => 0,
    requestAnimationFrame: (callback) => {
      rafCallback = callback;
      return 7;
    },
    cancelAnimationFrame: () => {},
  });

  owner.initializeRuntimeHooks();
  viewState = { ...viewState, scale: 1.25 };
  carrierListener();
  assert.equal(refreshCalls.length, 0);
  assert.equal(typeof rafCallback, "function");

  rafCallback();
  await flushMicrotasks();

  assert.deepEqual(refreshCalls, [
    {
      familyId: "airport",
      config: { airportType: ["international"] },
      viewOnly: true,
    },
  ]);

  rafCallback = null;
  viewState = { ...viewState, scale: 1.254, translateX: 0.9, translateY: -0.9 };
  carrierListener();
  assert.equal(rafCallback, null);

  viewState = { ...viewState, translateX: 3 };
  carrierListener();
  assert.equal(typeof rafCallback, "function");
});

test("transport workbench preview lifecycle owner skips stale preview generation inspector writes", async () => {
  const runtimeState = { transportWorkbenchUi: { open: true, activeFamily: "road" } };
  const previewResolvers = [];
  const inspectorCalls = [];
  const owner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    getCarrierMount: () => ({}),
    listWarmupPlans: () => [],
    renderFamilyPreview: (familyId, config, options) => new Promise((resolve) => {
      previewResolvers.push({ familyId, config, options, resolve });
    }),
    renderInspector: (family, config, compareHeld) => {
      inspectorCalls.push({ familyId: family.id, config, compareHeld });
    },
    setCarrierViewChangeListener: () => {},
    setFamilyPreviewSelectionListener: () => {},
    runtimeFamilyIds: ["road", "rail"],
    scheduleTimeout: () => 0,
  });
  const roadContext = {
    isOpen: true,
    family: { id: "road" },
    config: { scope: "motorway_only" },
    compareHeld: false,
  };
  const railContext = {
    isOpen: true,
    family: { id: "rail" },
    config: { scope: "mainline_only" },
    compareHeld: true,
  };

  const stalePreview = owner.refreshPreview(roadContext, { allowCarrierPrep: false });
  await flushMicrotasks();
  assert.equal(previewResolvers.length, 1);
  assert.equal(previewResolvers[0].familyId, "road");

  runtimeState.transportWorkbenchUi.activeFamily = "rail";
  const currentPreview = owner.refreshPreview(railContext, { allowCarrierPrep: false });
  await flushMicrotasks();
  assert.equal(previewResolvers.length, 2);
  assert.equal(previewResolvers[1].familyId, "rail");

  previewResolvers[0].resolve(null);
  await stalePreview;
  assert.deepEqual(inspectorCalls, []);

  previewResolvers[1].resolve(null);
  await currentPreview;
  assert.deepEqual(inspectorCalls, [
    {
      familyId: "rail",
      config: { scope: "mainline_only" },
      compareHeld: true,
    },
  ]);
});

test("point preview effective pack merges update patches and removes deleted source features", () => {
  const sourcePack = {
    mode: "preview",
    variantId: "fixture",
    features: [{
      id: "source_port_1",
      name: "Original Port",
      label: "Original Port",
      lon: 10,
      lat: 20,
      x: 100,
      y: 200,
      properties: {
        id: "source_port_1",
        name: "Original Port",
        source: "official_registry",
        manager_type_code: "1",
        legal_designation: "international_hub",
      },
    }, {
      id: "source_port_2",
      name: "Deleted Port",
      lon: 11,
      lat: 21,
      x: 110,
      y: 210,
      properties: {
        id: "source_port_2",
        source: "official_registry",
        manager_type_code: "1",
      },
    }],
    featureById: new Map(),
  };
  const config = {
    editOverlay: {
      updated: [{
        id: "source_port_1",
        name: "Edited Port",
        lon: 10.5,
        lat: 20.5,
        properties: { manager_type_code: "2" },
      }],
      deleted: ["source_port_2"],
    },
  };
  const projectFeature = (rawFeature, definition, variantId) => {
    const [lon, lat] = rawFeature.geometry.coordinates;
    return {
      id: rawFeature.id,
      name: rawFeature.properties.name,
      label: rawFeature.properties.name,
      lon,
      lat,
      x: lon * 10,
      y: lat * 10,
      kind: definition.selectionType,
      variant: variantId,
      properties: rawFeature.properties,
      editOverlay: !!rawFeature.properties.edit_overlay,
    };
  };

  const pack = __transportWorkbenchPointPreviewTestInternals.createEffectivePointPack(
    sourcePack,
    config,
    { selectionType: "port" },
    { projectFeature }
  );

  assert.equal(pack.features.length, 1);
  assert.equal(pack.featureById.has("source_port_2"), false);
  const updated = pack.featureById.get("source_port_1");
  assert.equal(updated.name, "Edited Port");
  assert.equal(updated.lon, 10.5);
  assert.equal(updated.lat, 20.5);
  assert.equal(updated.properties.source, "official_registry");
  assert.equal(updated.properties.legal_designation, "international_hub");
  assert.equal(updated.properties.manager_type_code, "2");
  assert.equal(updated.properties.edit_overlay_mode, "updated");
});
