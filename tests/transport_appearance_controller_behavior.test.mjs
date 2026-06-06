import assert from "node:assert/strict";
import test from "node:test";

import {
  getTransportOverviewDataLayerKeys,
  listTransportOverviewCapabilityFamilyIds,
} from "../js/core/transport_capability_registry.js";
import { createTransportAppearanceController } from "../js/ui/toolbar/transport_appearance_controller.js";

class TestElement {
  constructor() {
    this.checked = false;
    this.dataset = {};
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.classList = {
      toggle: () => {},
    };
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) {
      handler({
        target: this,
        ...event,
      });
    }
  }
}

function buildNodes(ids) {
  return Object.fromEntries(ids.map((id) => [id, new TestElement()]));
}

const TRANSPORT_TOGGLE_NODE_IDS = [
  "transportAppearanceMasterToggle",
  "toggleAirports",
  "togglePorts",
  "toggleRail",
  "toggleRoad",
];

function createHarness(runtimeOverrides = {}) {
  const previousDocument = globalThis.document;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const nodes = buildNodes(TRANSPORT_TOGGLE_NODE_IDS);
  const contextLayerLoads = [];
  const dirtyReasons = [];
  const releaseReasons = [];
  globalThis.HTMLElement = TestElement;
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  globalThis.document = {
    getElementById: (id) => nodes[id] || null,
    querySelectorAll: () => [],
  };
  const runtimeState = {
    showTransport: false,
    showAirports: false,
    showPorts: false,
    showRail: false,
    showRoad: false,
    styleConfig: {
      transportOverview: {},
    },
    ensureContextLayerDataFn(layerRequest, options) {
      contextLayerLoads.push({ layerRequest, options });
      return Promise.resolve();
    },
    releaseDeferredContextBasePassFn(reason) {
      releaseReasons.push(reason);
    },
    ...runtimeOverrides,
  };
  const controller = createTransportAppearanceController({
    runtimeState,
    t: (value) => value,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    normalizeOceanFillColor: (value) => String(value || "").toLowerCase(),
    renderDirty: (reason) => dirtyReasons.push(reason),
  });
  return {
    cleanup() {
      globalThis.document = previousDocument;
      globalThis.HTMLElement = previousHTMLElement;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    },
    contextLayerLoads,
    controller,
    dirtyReasons,
    nodes,
    releaseReasons,
    runtimeState,
  };
}

test("transport appearance master toggle loads enabled family layers from registry metadata", async () => {
  const harness = createHarness({
    showAirports: true,
    showPorts: true,
    showRail: true,
    showRoad: true,
  });
  try {
    harness.controller.bindEvents();
    harness.nodes.transportAppearanceMasterToggle.checked = true;
    harness.nodes.transportAppearanceMasterToggle.dispatch("change");

    assert.equal(harness.runtimeState.showTransport, true);
    assert.deepEqual(harness.releaseReasons, ["transport-master-toggle"]);
    assert.deepEqual(
      harness.contextLayerLoads,
      listTransportOverviewCapabilityFamilyIds().map((familyId) => {
        const layerKeys = getTransportOverviewDataLayerKeys(familyId);
        return {
          layerRequest: layerKeys.length === 1 ? layerKeys[0] : layerKeys,
          options: { reason: "transport-master-toggle", renderNow: true },
        };
      })
    );
    await Promise.resolve();
  } finally {
    harness.cleanup();
  }
});

test("transport appearance family toggles load registry data layers before dirty render", async () => {
  const cases = [
    {
      nodeId: "toggleAirports",
      showField: "showAirports",
      releaseReason: "toggle-airports",
      layerRequest: "airports",
      dirtyReason: "toggle-airports",
    },
    {
      nodeId: "togglePorts",
      showField: "showPorts",
      releaseReason: "toggle-ports",
      layerRequest: "ports",
      dirtyReason: "toggle-ports",
    },
    {
      nodeId: "toggleRail",
      showField: "showRail",
      releaseReason: "toggle-rail",
      layerRequest: ["railways", "rail_stations_major"],
      dirtyReason: "toggle-rail",
    },
    {
      nodeId: "toggleRoad",
      showField: "showRoad",
      releaseReason: "toggle-road",
      layerRequest: "roads",
      dirtyReason: "toggle-road",
    },
  ];

  for (const testCase of cases) {
    const harness = createHarness();
    try {
      harness.controller.bindEvents();
      harness.nodes[testCase.nodeId].checked = true;
      harness.nodes[testCase.nodeId].dispatch("change");

      assert.equal(harness.runtimeState[testCase.showField], true, testCase.nodeId);
      assert.equal(harness.runtimeState.showTransport, true, testCase.nodeId);
      assert.deepEqual(harness.releaseReasons, [testCase.releaseReason], testCase.nodeId);
      assert.deepEqual(harness.contextLayerLoads, [
        { layerRequest: testCase.layerRequest, options: { reason: "toolbar-toggle", renderNow: true } },
      ], testCase.nodeId);
      assert.deepEqual(harness.dirtyReasons, [testCase.dirtyReason], testCase.nodeId);
      await Promise.resolve();
    } finally {
      harness.cleanup();
    }
  }
});
