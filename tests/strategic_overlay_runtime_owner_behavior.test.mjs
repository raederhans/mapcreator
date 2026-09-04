import test from "node:test";
import assert from "node:assert/strict";

import { createStrategicOverlayRuntimeOwner } from "../js/core/renderer/strategic_overlay_runtime_owner.js";

test("operation graphic runtime owner commits history and dirty state on finish", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    operationGraphics: [],
    operationGraphicsDirty: false,
    operationGraphicsEditor: {
      active: true,
      counter: 2,
      kind: "offensive",
      label: "Arrow",
      opacity: 0.7,
      points: [[10, 20], [30, 40]],
      selectedId: null,
      selectedVertexIndex: -1,
      stroke: "#112233",
      stylePreset: "offensive",
      width: 3,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({ snapshot: payload }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureOperationGraphicCounter: () => {},
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicMinPoints: () => 2,
      markDirty: (reason) => dirtyReasons.push(reason),
      normalizeOperationGraphicOpacity: (value) => Number(value),
      normalizeOperationGraphicStroke: (value) => String(value),
      normalizeOperationGraphicStylePreset: (value) => String(value),
      normalizeOperationGraphicWidth: (value) => Number(value),
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.finishOperationGraphicDraw(), true);
  assert.equal(runtimeState.operationGraphics.length, 1);
  assert.equal(runtimeState.operationGraphics[0].id, "opg_2");
  assert.equal(runtimeState.operationGraphicsEditor.selectedId, "opg_2");
  assert.equal(runtimeState.operationGraphicsEditor.mode, "edit");
  assert.equal(historyEntries[0].kind, "finish-operation-graphic");
  assert.deepEqual(dirtyReasons, ["finish-operation-graphic"]);
  assert.equal(uiRefreshCount, 1);
  assert.equal(renderCount, 1);
});

test("operation graphic runtime owner keeps warning path for invalid closed-style switch", () => {
  const toasts = [];
  const runtimeState = {
    operationGraphics: [{
      id: "opg_1",
      kind: "front",
      label: "Front",
      opacity: 1,
      points: [[0, 0], [1, 1]],
      selectedId: null,
      stroke: "#334455",
      stylePreset: "front",
      width: 2,
    }],
    operationGraphicsEditor: {
      active: false,
      kind: "front",
      label: "Front",
      mode: "edit",
      opacity: 1,
      points: [[0, 0], [1, 1]],
      selectedId: "opg_1",
      selectedVertexIndex: -1,
      stroke: "#334455",
      stylePreset: "front",
      width: 2,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicById: () => runtimeState.operationGraphics[0],
      getOperationGraphicMinPoints: (kind) => (kind === "encirclement" ? 3 : 2),
      showToast: (message, options) => toasts.push({ message, options }),
      t: (key) => key,
    },
  });

  assert.equal(owner.updateSelectedOperationGraphic({ kind: "encirclement" }), false);
  assert.equal(runtimeState.operationGraphics[0].kind, "front");
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].options.title, "More points required");
});

test("operation graphic runtime owner keeps drag session state out of model snapshots", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  const renderForces = [];
  let uiRefreshCount = 0;
  const runtimeState = {
    operationGraphics: [{
      id: "opg_1",
      kind: "offensive",
      label: "Push",
      opacity: 0.8,
      points: [[1, 2], [3, 4]],
      stroke: "#123456",
      stylePreset: "offensive",
      width: 2,
    }],
    operationGraphicsDirty: false,
    operationGraphicsEditor: {
      active: false,
      mode: "edit",
      points: [[1, 2], [3, 4]],
      selectedId: "opg_1",
      selectedVertexIndex: -1,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({
        snapshot: payload,
        operationGraphics: JSON.parse(JSON.stringify(runtimeState.operationGraphics || [])),
      }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicById: (id) => runtimeState.operationGraphics.find((entry) => entry.id === id) || null,
      getOperationGraphicMinPoints: () => 2,
      markDirty: (reason) => dirtyReasons.push(reason),
      renderOperationGraphicsIfNeeded: (payload) => renderForces.push(payload),
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.beginOperationGraphicVertexDrag(1), true);
  assert.equal(runtimeState.operationGraphicsEditor.selectedVertexIndex, 1);
  assert.equal(owner.moveOperationGraphicVertexDrag(1, [5, 6]), true);
  assert.deepEqual(runtimeState.operationGraphics[0].points[1], [5, 6]);
  assert.equal(owner.finishOperationGraphicVertexDrag(1), true);
  assert.equal(historyEntries[0].kind, "move-operation-graphic-vertex");
  assert.equal("__historyBefore" in runtimeState.operationGraphics[0], false);
  assert.equal("__dragMoved" in runtimeState.operationGraphics[0], false);
  assert.equal("__historyBefore" in historyEntries[0].after.operationGraphics[0], false);
  assert.equal("__dragMoved" in historyEntries[0].after.operationGraphics[0], false);
  assert.deepEqual(dirtyReasons, ["move-operation-graphic-vertex"]);
  assert.equal(uiRefreshCount, 2);
  assert.deepEqual(renderForces, [{ force: true }, { force: true }, { force: true }]);
});

test("operation graphic runtime owner rejects invalid vertex drag transactions", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  const runtimeState = {
    operationGraphics: [{
      id: "opg_1",
      points: [[1, 2], [3, 4]],
    }],
    operationGraphicsDirty: false,
    operationGraphicsEditor: {
      active: false,
      mode: "edit",
      points: [[1, 2], [3, 4]],
      selectedId: "opg_1",
      selectedVertexIndex: -1,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: () => ({}),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicById: (id) => runtimeState.operationGraphics.find((entry) => entry.id === id) || null,
      markDirty: (reason) => dirtyReasons.push(reason),
    },
  });

  assert.equal(owner.beginOperationGraphicVertexDrag(5), false);
  assert.equal(owner.moveOperationGraphicVertexDrag(0, null), false);
  assert.equal(owner.finishOperationGraphicVertexDrag(0), false);
  runtimeState.operationGraphicsEditor.selectedId = "";
  assert.equal(owner.beginOperationGraphicVertexDrag(0), false);
  assert.deepEqual(historyEntries, []);
  assert.deepEqual(dirtyReasons, []);
});

test("operation graphic runtime owner commits midpoint insertion", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  const renderForces = [];
  let uiRefreshCount = 0;
  const runtimeState = {
    operationGraphics: [{
      id: "opg_1",
      kind: "offensive",
      points: [[0, 0], [2, 0]],
    }],
    operationGraphicsDirty: false,
    operationGraphicsEditor: {
      active: false,
      mode: "edit",
      points: [[0, 0], [2, 0]],
      selectedId: "opg_1",
      selectedVertexIndex: -1,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({
        snapshot: payload,
        operationGraphics: JSON.parse(JSON.stringify(runtimeState.operationGraphics || [])),
      }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicById: (id) => runtimeState.operationGraphics.find((entry) => entry.id === id) || null,
      markDirty: (reason) => dirtyReasons.push(reason),
      renderOperationGraphicsIfNeeded: (payload) => renderForces.push(payload),
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.insertOperationGraphicVertex(1, [1, 0]), true);
  assert.deepEqual(runtimeState.operationGraphics[0].points, [[0, 0], [1, 0], [2, 0]]);
  assert.equal(runtimeState.operationGraphicsEditor.selectedVertexIndex, 1);
  assert.deepEqual(runtimeState.operationGraphicsEditor.points, runtimeState.operationGraphics[0].points);
  assert.equal(runtimeState.operationGraphicsDirty, true);
  assert.equal(historyEntries[0].kind, "insert-operation-graphic-vertex");
  assert.deepEqual(dirtyReasons, ["insert-operation-graphic-vertex"]);
  assert.deepEqual(renderForces, [{ force: true }]);
  assert.equal(uiRefreshCount, 1);

  assert.equal(owner.insertOperationGraphicVertex(-1, [3, 0]), false);
  assert.equal(historyEntries.length, 1);
});

test("operation graphic ordinary updates replace the selected entity and preserve neighbors", () => {
  const neighbor = { id: "opg_neighbor", kind: "offensive", label: "Neighbor", points: [[5, 5], [6, 6]] };
  const selected = {
    id: "opg_1",
    kind: "offensive",
    label: "Before",
    points: [[0, 0], [1, 1]],
    stylePreset: "offensive",
    stroke: "#111111",
    width: 2,
    opacity: 1,
  };
  const runtimeState = {
    operationGraphics: [neighbor, selected],
    operationGraphicsDirty: false,
    operationGraphicsEditor: {
      active: false,
      mode: "edit",
      points: [[0, 0], [1, 1]],
      selectedId: "opg_1",
      selectedVertexIndex: -1,
    },
  };
  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: () => ({}),
      ensureOperationGraphicsEditorState: () => {},
      getOperationGraphicById: (id) => runtimeState.operationGraphics.find((entry) => entry.id === id) || null,
      getOperationGraphicMinPoints: () => 2,
      normalizeOperationGraphicOpacity: Number,
      normalizeOperationGraphicStroke: String,
      normalizeOperationGraphicStylePreset: String,
      normalizeOperationGraphicWidth: Number,
    },
  });

  assert.equal(owner.updateSelectedOperationGraphic({ label: "After", width: 4 }), true);
  assert.equal(runtimeState.operationGraphics[0], neighbor);
  assert.notEqual(runtimeState.operationGraphics[1], selected);
  assert.equal(runtimeState.operationGraphics[1].label, "After");
  assert.equal(runtimeState.operationGraphics[1].width, 4);
});

test("special zone runtime owner retires legacy manual feature creation", () => {
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    manualSpecialZones: { type: "FeatureCollection", features: [] },
    specialZonesOverlayDirty: false,
    specialZoneEditor: {
      active: true,
      counter: 1,
      label: "Buffer",
      selectedId: null,
      vertices: [[0, 0], [1, 0], [1, 1]],
      zoneType: "custom",
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      ensureManualSpecialZoneCounter: () => {},
      ensureSpecialZoneEditorState: () => {},
      renderNow: () => {
        renderCount += 1;
      },
      updateSpecialZoneEditorUI: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.startSpecialZoneDraw({ zoneType: "custom", label: "Buffer" }), false);
  assert.equal(owner.finishSpecialZoneDraw(), false);
  assert.equal(runtimeState.manualSpecialZones.features.length, 0);
  assert.equal(runtimeState.specialZoneEditor.selectedId, null);
  assert.equal(runtimeState.specialZoneEditor.active, false);
  assert.equal(uiRefreshCount, 2);
  assert.equal(renderCount, 2);
});

test("special zone runtime owner preserves its configured editor default", () => {
  const runtimeState = {
    specialZoneEditor: {
      active: false,
      counter: 1,
      label: "",
      selectedId: null,
      vertices: [],
    },
    specialZonesOverlayDirty: false,
  };
  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    constants: {
      defaultSpecialZoneType: "buffer",
    },
    helpers: {
      ensureSpecialZoneEditorState: () => {},
      renderNow: () => {},
      updateSpecialZoneEditorUI: () => {},
    },
  });

  owner.selectSpecialZoneById("zone-1");

  assert.equal(runtimeState.specialZoneEditor.zoneType, "buffer");
  assert.equal(runtimeState.specialZoneEditor.selectedId, "zone-1");
});

test("special zone membership runtime owner commits click and drag transactions", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  const membershipCalls = [];
  const renderForces = [];
  let workbenchRefreshCount = 0;
  const runtimeState = {
    specialZoneLayers: {
      activeLayerId: "layer_1",
      layers: [{ id: "layer_1", featureIds: [] }],
    },
    specialZonesOverlayDirty: false,
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({
        snapshot: payload,
        specialZoneLayers: JSON.parse(JSON.stringify(runtimeState.specialZoneLayers || {})),
      }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      markDirty: (reason) => dirtyReasons.push(reason),
      normalizeSpecialZoneLayersState: (layers) => ({
        activeLayerId: String(layers?.activeLayerId || ""),
        layers: Array.isArray(layers?.layers) ? layers.layers : [],
      }),
      refreshSpecialZonesWorkbenchUi: () => {
        workbenchRefreshCount += 1;
      },
      renderSpecialZonesIfNeeded: (payload) => renderForces.push(payload),
      updateSpecialZoneLayerMembership: (layers, layerId, featureIds, mode) => {
        membershipCalls.push({ layerId, featureIds, mode });
        return {
          ...layers,
          lastMembershipUpdate: { layerId, featureIds: [...featureIds], mode },
        };
      },
    },
  });

  assert.equal(owner.commitSpecialZoneMembershipClick({
    featureId: "feature_a",
    membershipTool: "multi",
    brushMode: "add",
  }), true);
  assert.equal(historyEntries[0].kind, "special-zone-membership-toggle");
  assert.deepEqual(membershipCalls[0], {
    layerId: "layer_1",
    featureIds: ["feature_a"],
    mode: "toggle",
  });

  assert.equal(owner.beginSpecialZoneMembershipDrag({
    membershipTool: "brush",
    brushMode: "remove",
  }), true);
  assert.equal(owner.applySpecialZoneMembershipDragFeature("feature_b"), true);
  assert.equal(owner.applySpecialZoneMembershipDragFeature("feature_b"), false);
  assert.deepEqual(owner.finishSpecialZoneMembershipDrag(), { active: true, changed: true });

  assert.equal(owner.beginSpecialZoneMembershipDrag({
    membershipTool: "multi",
    brushMode: "remove",
    altKey: false,
  }), true);
  assert.equal(owner.applySpecialZoneMembershipDragFeature("feature_c"), true);
  assert.deepEqual(owner.finishSpecialZoneMembershipDrag(), { active: true, changed: true });

  assert.equal(historyEntries[1].kind, "special-zone-membership-drag-remove");
  assert.deepEqual(membershipCalls[1], {
    layerId: "layer_1",
    featureIds: ["feature_b"],
    mode: "remove",
  });
  assert.equal(historyEntries[2].kind, "special-zone-membership-drag-add");
  assert.deepEqual(membershipCalls[2], {
    layerId: "layer_1",
    featureIds: ["feature_c"],
    mode: "add",
  });
  assert.deepEqual(dirtyReasons, [
    "special-zone-membership-toggle",
    "special-zone-membership-remove",
    "special-zone-membership-add",
  ]);
  assert.deepEqual(renderForces, [{ force: true }, { force: true }, { force: true }]);
  assert.equal(workbenchRefreshCount, 3);
  assert.equal(runtimeState.specialZonesOverlayDirty, true);
});

test("operational line runtime owner commits history and updates modal selection on finish", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    operationGraphicsEditor: {
      selectedId: "opg_selected",
    },
    operationalLines: [],
    operationalLinesDirty: false,
    operationalLineEditor: {
      active: true,
      counter: 3,
      kind: "frontline",
      label: "Baltic Screen",
      opacity: 0.82,
      points: [[8, 48], [13, 49], [18, 51]],
      selectedId: null,
      selectedVertexIndex: -1,
      stroke: "#6b7280",
      stylePreset: "frontline",
      width: 2.1,
    },
    strategicOverlayUi: {},
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({ snapshot: payload }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureOperationalLineCounter: () => {},
      ensureOperationalLineEditorState: () => {},
      normalizeOperationalLineStylePreset: (value) => String(value),
      normalizeOperationGraphicOpacity: (value) => Number(value),
      normalizeOperationGraphicStroke: (value) => String(value),
      normalizeOperationGraphicWidth: (value) => Number(value),
      getOperationalLineMinPoints: () => 2,
      markDirty: (reason) => dirtyReasons.push(reason),
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.finishOperationalLineDraw(), true);
  assert.equal(runtimeState.operationalLines.length, 1);
  assert.equal(runtimeState.operationalLines[0].id, "opl_3");
  assert.equal(runtimeState.operationalLineEditor.selectedId, "opl_3");
  assert.equal(runtimeState.strategicOverlayUi.modalEntityId, "opl_3");
  assert.equal(historyEntries[0].kind, "create-operational-line");
  assert.deepEqual(dirtyReasons, ["create-operational-line"]);
  assert.equal(uiRefreshCount, 1);
  assert.equal(renderCount, 1);
});

test("operational line ordinary updates replace the selected entity and preserve neighbors", () => {
  const neighbor = { id: "opl_neighbor", kind: "frontline", label: "Neighbor", points: [[5, 5], [6, 6]] };
  const selected = {
    id: "opl_1",
    kind: "frontline",
    label: "Before",
    points: [[0, 0], [1, 1]],
    attachedCounterIds: [],
  };
  const runtimeState = {
    operationGraphicsEditor: {},
    operationalLines: [neighbor, selected],
    operationalLinesDirty: false,
    operationalLineEditor: { selectedId: "opl_1" },
    strategicOverlayUi: {},
  };
  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: () => ({}),
      ensureOperationGraphicsEditorState: () => {},
      ensureOperationalLineEditorState: () => {},
      getOperationalLineById: (id) => runtimeState.operationalLines.find((entry) => entry.id === id) || null,
      normalizeOperationGraphicOpacity: Number,
      normalizeOperationGraphicStroke: String,
      normalizeOperationGraphicWidth: Number,
      normalizeOperationalLineStylePreset: String,
    },
  });

  assert.equal(owner.updateSelectedOperationalLine({ label: "After", width: 5 }), true);
  assert.equal(runtimeState.operationalLines[0], neighbor);
  assert.notEqual(runtimeState.operationalLines[1], selected);
  assert.equal(runtimeState.operationalLines[1].label, "After");
  assert.equal(runtimeState.operationalLines[1].width, 5);
});

test("unit counter nation resolution maps retired controller source to ownership", () => {
  const runtimeState = {
    activeSovereignCode: "FRA",
    landIndex: new Map([["feature-1", { id: "feature-1" }]]),
    selectedInspectorCountryCode: "",
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      canonicalCountryCode: (value) => String(value || "").trim().toUpperCase(),
      getDisplayOwnerCode: () => "",
      getFeatureOwnerCode: (featureId) => (featureId ? "ENG" : ""),
      normalizeUnitCounterNationSource: (value, fallback = "display") => String(value || fallback).trim().toLowerCase(),
    },
  });

  assert.deepEqual(
    owner.resolveUnitCounterNationForPlacement("feature-1", "", "controller"),
    { tag: "ENG", source: "owner" },
  );
  assert.deepEqual(
    owner.resolveUnitCounterNationForPlacement("", "", "controller"),
    { tag: "FRA", source: "owner" },
  );
});

test("unit counter runtime owner placement syncs line attachments and history", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    HIT_SNAP_RADIUS_CLICK_PX: 10,
    annotationView: {
      unitRendererDefault: "game",
    },
    operationalLines: [{
      id: "opl_1",
      attachedCounterIds: [],
    }],
    operationalLinesDirty: false,
    unitCounters: [],
    unitCountersDirty: false,
    unitCounterEditor: {
      active: true,
      attachment: { kind: "operational-line", lineId: "opl_1" },
      baseFillColor: "#e8decd",
      counter: 1,
      echelon: "corps",
      equipmentPct: 73,
      iconId: "infantry",
      label: "1st Corps",
      nationSource: "display",
      nationTag: "",
      organizationPct: 84,
      presetId: "inf",
      renderer: "milstd",
      returnSelectionId: null,
      sidc: "",
      size: "medium",
      statsPresetId: "regular",
      statsSource: "preset",
      strengthText: "",
      subLabel: "Nord",
      symbolCode: "",
      unitType: "INF",
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    constants: {
      defaultUnitCounterMilstdSidc: "130310001412110000000000000000",
    },
    helpers: {
      captureHistoryState: (payload) => ({ snapshot: payload }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureUnitCounterCounter: () => {},
      ensureUnitCounterEditorState: () => {},
      getHitFromEvent: () => ({ id: "GER", targetType: "land" }),
      getMapLonLatFromEvent: () => [12, 48],
      getNormalizedUnitCounterCombatState: (value) => value,
      getUnitCounterPresetById: () => ({
        baseSidc: "",
        defaultEchelon: "corps",
        defaultRenderer: "milstd",
        iconId: "infantry",
        id: "inf",
        unitType: "INF",
      }),
      markDirty: (reason) => dirtyReasons.push(reason),
      normalizeUnitCounterNationSource: (value, fallback = "display") => String(value || fallback).trim().toLowerCase(),
      normalizeUnitCounterSizeToken: (value) => String(value),
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
      resolveUnitCounterNationForPlacement: undefined,
    },
  });

  assert.equal(owner.placeUnitCounterFromEvent({ type: "click" }), true);
  assert.equal(runtimeState.unitCounters.length, 1);
  assert.equal(runtimeState.unitCounters[0].attachment.lineId, "opl_1");
  assert.equal(runtimeState.unitCounters[0].layoutAnchor.kind, "attachment");
  assert.deepEqual(runtimeState.operationalLines[0].attachedCounterIds, ["unit_1"]);
  assert.equal(historyEntries[0].kind, "place-unit-counter");
  assert.deepEqual(dirtyReasons, ["place-unit-counter"]);
  assert.equal(uiRefreshCount, 1);
  assert.equal(renderCount, 1);
});

test("unit counter runtime owner detach clears line attachments", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  const untouchedLine = {
    id: "opl_2",
    attachedCounterIds: [],
  };
  const runtimeState = {
    operationalLines: [{
      id: "opl_1",
      attachedCounterIds: ["unit_1"],
    }, untouchedLine],
    operationalLinesDirty: false,
    unitCounters: [{
      id: "unit_1",
      renderer: "game",
      sidc: "INF",
      symbolCode: "INF",
      label: "1st Corps",
      presetId: "inf",
      size: "medium",
      anchor: { lon: 12, lat: 48, featureId: "GER" },
      layoutAnchor: { kind: "attachment", key: "opl_1", slotIndex: 0 },
      attachment: { kind: "operational-line", lineId: "opl_1" },
    }],
    unitCountersDirty: false,
    unitCounterEditor: {
      selectedId: "unit_1",
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      assignUnitCounterEditorFromCounter: (counter) => {
        runtimeState.unitCounterEditor.label = String(counter.label || "");
      },
      captureHistoryState: (payload) => ({ snapshot: payload }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureUnitCounterEditorState: () => {},
      markDirty: (reason) => dirtyReasons.push(reason),
      renderNow: () => {},
      updateStrategicOverlayUi: () => {},
    },
  });

  assert.equal(owner.updateSelectedUnitCounter({ attachment: null }), true);
  assert.equal(runtimeState.unitCounters[0].attachment, null);
  assert.equal(runtimeState.unitCounters[0].layoutAnchor.kind, "feature");
  assert.equal(runtimeState.unitCounters[0].layoutAnchor.key, "GER");
  assert.deepEqual(runtimeState.operationalLines[0].attachedCounterIds, []);
  assert.equal(runtimeState.operationalLines[1], untouchedLine);
  assert.equal(runtimeState.unitCountersDirty, true);
  assert.equal(runtimeState.operationalLinesDirty, true);
  assert.equal(historyEntries[0].kind, "update-unit-counter");
  assert.deepEqual(dirtyReasons, ["update-unit-counter"]);
});

test("unit counter ordinary updates replace the selected entity and preserve neighbors", () => {
  const neighbor = { id: "unit_neighbor", label: "Neighbor" };
  const selected = {
    id: "unit_1",
    label: "Before",
    renderer: "game",
    size: "medium",
    anchor: { lon: 12, lat: 48, featureId: "GER" },
    layoutAnchor: { kind: "feature", key: "GER", slotIndex: null },
    attachment: null,
  };
  const runtimeState = {
    operationalLines: [],
    unitCounters: [neighbor, selected],
    unitCountersDirty: false,
    unitCounterEditor: { selectedId: "unit_1" },
  };
  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      assignUnitCounterEditorFromCounter: () => {},
      captureHistoryState: () => ({}),
      ensureUnitCounterEditorState: () => {},
      normalizeUnitCounterSizeToken: String,
    },
  });

  assert.equal(owner.updateSelectedUnitCounter({ label: "After", size: "large" }), true);
  assert.equal(runtimeState.unitCounters[0], neighbor);
  assert.notEqual(runtimeState.unitCounters[1], selected);
  assert.equal(runtimeState.unitCounters[1].label, "After");
  assert.equal(runtimeState.unitCounters[1].size, "large");
});

test("unit counter runtime owner commits drag moves and detaches line attachments", () => {
  const historyEntries = [];
  const dirtyReasons = [];
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    operationalLines: [{
      id: "opl_1",
      attachedCounterIds: ["unit_1"],
    }],
    operationalLinesDirty: false,
    unitCounters: [{
      id: "unit_1",
      anchor: { lon: 12, lat: 48, featureId: "GER" },
      attachment: { kind: "operational-line", lineId: "opl_1" },
      layoutAnchor: { kind: "attachment", key: "opl_1", slotIndex: 0 },
    }],
    unitCounterEditor: {},
    unitCountersDirty: false,
  };
  const counter = runtimeState.unitCounters[0];

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      captureHistoryState: (payload) => ({
        snapshot: payload,
        unitCounters: JSON.parse(JSON.stringify(runtimeState.unitCounters || [])),
      }),
      commitHistoryEntry: (entry) => historyEntries.push(entry),
      ensureUnitCounterEditorState: () => {},
      markDirty: (reason) => dirtyReasons.push(reason),
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.beginUnitCounterDrag(counter), true);
  assert.equal(runtimeState.unitCounterEditor.selectedId, "unit_1");
  assert.equal(owner.moveUnitCounterDrag(counter, [14.5, 49.25]), true);
  assert.equal(counter.attachment, null);
  assert.equal(counter.layoutAnchor.kind, "feature");
  assert.equal(counter.anchor.lon, 14.5);
  assert.equal(counter.anchor.lat, 49.25);
  assert.equal(runtimeState.unitCountersDirty, true);

  assert.equal(owner.finishUnitCounterDrag(counter, { featureId: "POL" }), true);
  assert.equal(counter.anchor.featureId, "POL");
  assert.equal(counter.layoutAnchor.key, "POL");
  assert.deepEqual(runtimeState.operationalLines[0].attachedCounterIds, []);
  assert.equal(runtimeState.operationalLinesDirty, true);
  assert.equal(historyEntries[0].kind, "move-unit-counter");
  assert.equal("__historyBefore" in counter, false);
  assert.equal("__dragMoved" in counter, false);
  assert.equal("__historyBefore" in historyEntries[0].after.unitCounters[0], false);
  assert.equal("__dragMoved" in historyEntries[0].after.unitCounters[0], false);
  assert.deepEqual(dirtyReasons, ["move-unit-counter"]);
  assert.equal(uiRefreshCount, 2);
  assert.equal(renderCount, 1);
});

test("unit counter runtime owner selects render entries through runtime facade", () => {
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    unitCounterEditor: {},
    unitCountersDirty: false,
  };
  const counter = {
    id: "unit_2",
    label: "2nd Corps",
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      assignUnitCounterEditorFromCounter: (nextCounter) => {
        runtimeState.unitCounterEditor.label = String(nextCounter.label || "");
      },
      ensureUnitCounterEditorState: () => {},
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  assert.equal(owner.selectUnitCounterFromRender(counter), true);
  assert.equal(runtimeState.unitCounterEditor.selectedId, "unit_2");
  assert.equal(runtimeState.unitCounterEditor.label, "2nd Corps");
  assert.equal(runtimeState.unitCountersDirty, true);
  assert.equal(uiRefreshCount, 1);
  assert.equal(renderCount, 1);
});

test("unit counter preview seeds editor defaults before reading preview data", () => {
  let ensureCount = 0;
  const runtimeState = {};

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      ensureUnitCounterEditorState: () => {
        ensureCount += 1;
        runtimeState.unitCounterEditor = {
          renderer: "game",
          sidc: "",
          symbolCode: "",
          nationTag: "",
          presetId: "inf",
          unitType: "",
          echelon: "",
          label: "",
          subLabel: "",
          strengthText: "",
          baseFillColor: "",
          organizationPct: 78,
          equipmentPct: 74,
          statsPresetId: "regular",
          statsSource: "preset",
          size: "medium",
        };
      },
      getNormalizedUnitCounterCombatState: (value) => value,
      getUnitCounterCardModel: (value) => value,
    },
  });

  const preview = owner.getUnitCounterPreviewData();
  assert.equal(ensureCount, 1);
  assert.equal(runtimeState.unitCounterEditor.presetId, "inf");
  assert.equal(preview.renderer, "game");
  assert.equal(preview.organizationPct, 78);
});

test("cancel active strategic modes unwinds unit counter, line, and graphics editors", () => {
  const runtimeState = {
    operationGraphicsEditor: {
      active: true,
      mode: "draw",
      points: [[0, 0]],
      selectedId: null,
      selectedVertexIndex: 0,
    },
    operationalLineEditor: {
      active: true,
      mode: "draw",
      points: [[0, 0]],
      selectedId: null,
      selectedVertexIndex: 0,
    },
    strategicOverlayUi: {
      activeMode: "frontline",
    },
    unitCounterEditor: {
      active: true,
      returnSelectionId: null,
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      ensureOperationGraphicsEditorState: () => {},
      ensureOperationalLineEditorState: () => {},
      ensureUnitCounterEditorState: () => {},
      resetUnitCounterEditorState: () => {
        runtimeState.unitCounterEditor.active = false;
      },
      updateStrategicOverlayUi: () => {},
    },
  });

  assert.equal(owner.cancelActiveStrategicInteractionModes(), true);
  assert.equal(runtimeState.unitCounterEditor.active, false);
  assert.equal(runtimeState.operationalLineEditor.active, false);
  assert.equal(runtimeState.operationGraphicsEditor.active, false);
  assert.equal(runtimeState.strategicOverlayUi.activeMode, "idle");
});

test("cancel unit counter placement restores prior selection and clears active placement mode", () => {
  let uiRefreshCount = 0;
  let renderCount = 0;
  const runtimeState = {
    unitCounters: [{
      id: "unit_existing_1",
      renderer: "game",
      sidc: "INF",
      symbolCode: "INF",
      nationTag: "GER",
      nationSource: "manual",
      presetId: "inf",
      iconId: "infantry",
      unitType: "INF",
      echelon: "corps",
      label: "Existing Counter",
      organizationPct: 84,
      equipmentPct: 73,
      size: "medium",
      anchor: { lon: 12, lat: 48, featureId: "GER" },
    }],
    unitCounterEditor: {
      active: true,
      selectedId: null,
      returnSelectionId: "unit_existing_1",
    },
  };

  const owner = createStrategicOverlayRuntimeOwner({
    state: runtimeState,
    helpers: {
      assignUnitCounterEditorFromCounter: (counter) => {
        runtimeState.unitCounterEditor.label = String(counter.label || "");
      },
      ensureUnitCounterEditorState: () => {},
      renderNow: () => {
        renderCount += 1;
      },
      updateStrategicOverlayUi: () => {
        uiRefreshCount += 1;
      },
    },
  });

  owner.cancelUnitCounterPlacement();
  assert.equal(runtimeState.unitCounterEditor.active, false);
  assert.equal(runtimeState.unitCounterEditor.selectedId, "unit_existing_1");
  assert.equal(runtimeState.unitCounterEditor.returnSelectionId, null);
  assert.equal(runtimeState.unitCounterEditor.label, "Existing Counter");
  assert.equal(uiRefreshCount, 1);
  assert.equal(renderCount, 1);
});
