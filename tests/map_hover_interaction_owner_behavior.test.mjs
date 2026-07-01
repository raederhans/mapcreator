import assert from "node:assert/strict";
import test from "node:test";

import { createMapHoverInteractionOwner } from "../js/core/map_renderer/map_hover_interaction_owner.js";

function createHarness(overrides = {}) {
  const calls = [];
  const state = {
    now: 100,
    lastMouseMoveTime: 0,
    mouseThrottleMs: 16,
    hasHoverData: true,
    specialZoneEditorActive: false,
    hgoRuntimeHover: { active: false, hit: null },
    reducedHoverPhase: false,
    hoverIds: { landId: null, waterId: null, specialId: null },
    hit: { id: null, targetType: null },
    hasTooltip: true,
    hoveredFacilityEntry: null,
    nextFacilityEntry: null,
    facilityDetailsActive: false,
    blockedUnderlyingHover: false,
    cityEntry: null,
    feature: null,
    tooltipText: "Feature tooltip",
    ...overrides,
  };
  const event = overrides.event || { type: "mousemove", clientX: 20, clientY: 30 };
  let lastMouseMoveTime = state.lastMouseMoveTime;
  let hoverIds = state.hoverIds;
  let hoveredFacilityEntry = state.hoveredFacilityEntry;
  const owner = createMapHoverInteractionOwner({
    state: {
      hoverSnapPx: 9,
    },
    getters: {
      nowMs: () => {
        calls.push(["nowMs"]);
        return state.now;
      },
      getLastMouseMoveTime: () => {
        calls.push(["getLastMouseMoveTime"]);
        return lastMouseMoveTime;
      },
      getMouseThrottleMs: () => {
        calls.push(["getMouseThrottleMs"]);
        return state.mouseThrottleMs;
      },
      hasHoverData: () => {
        calls.push(["hasHoverData"]);
        return state.hasHoverData;
      },
      isSpecialZoneEditorActive: () => {
        calls.push(["isSpecialZoneEditorActive"]);
        return state.specialZoneEditorActive;
      },
      inspectHgoRuntimePreviewFromEvent: (...args) => {
        calls.push(["inspectHgoRuntimePreviewFromEvent", args]);
        return state.hgoRuntimeHover;
      },
      isReducedHoverPhase: () => {
        calls.push(["isReducedHoverPhase"]);
        return state.reducedHoverPhase;
      },
      getHoverIds: () => {
        calls.push(["getHoverIds"]);
        return hoverIds;
      },
      getHitFromEvent: (...args) => {
        calls.push(["getHitFromEvent", args]);
        return state.hit;
      },
      hasTooltip: () => {
        calls.push(["hasTooltip"]);
        return state.hasTooltip;
      },
      getHoveredFacilityEntry: () => {
        calls.push(["getHoveredFacilityEntry"]);
        return hoveredFacilityEntry;
      },
      getHoveredFacilityEntryFromEvent: (...args) => {
        calls.push(["getHoveredFacilityEntryFromEvent", args]);
        return state.nextFacilityEntry;
      },
      isFacilityDetailsSurfaceActive: (...args) => {
        calls.push(["isFacilityDetailsSurfaceActive", args]);
        return state.facilityDetailsActive;
      },
      getHoveredCityTooltipEntry: (...args) => {
        calls.push(["getHoveredCityTooltipEntry", args]);
        return state.cityEntry;
      },
      getFeatureForHit: (...args) => {
        calls.push(["getFeatureForHit", args]);
        return state.feature;
      },
      getTooltipTextForFeature: (...args) => {
        calls.push(["getTooltipTextForFeature", args]);
        return state.tooltipText;
      },
    },
    effects: {
      setLastMouseMoveTime: (value) => {
        calls.push(["setLastMouseMoveTime", value]);
        lastMouseMoveTime = value;
      },
      setHoverIds: (value) => {
        calls.push(["setHoverIds", value]);
        hoverIds = value;
      },
      setHoveredFacilityEntry: (entry) => {
        calls.push(["setHoveredFacilityEntry", entry]);
        hoveredFacilityEntry = entry;
      },
      updateDevHoverHit: (hit) => calls.push(["updateDevHoverHit", hit]),
      markHoverOverlayDirty: () => calls.push(["markHoverOverlayDirty"]),
      scheduleHoverOverlayRender: () => calls.push(["scheduleHoverOverlayRender"]),
      queueTooltipUpdate: (payload) => calls.push(["queueTooltipUpdate", payload]),
      setMapInteractionCursor: (cursor) => calls.push(["setMapInteractionCursor", cursor]),
      clearUnderlyingHoverForFacilityEntry: (entry) => {
        calls.push(["clearUnderlyingHoverForFacilityEntry", entry]);
        return state.blockedUnderlyingHover;
      },
    },
    helpers: {
      getFacilityKey(entry) {
        calls.push(["getFacilityKey", entry]);
        return entry ? `${entry.familyId}:${entry.packId || "global"}:${entry.stableId}` : "";
      },
    },
  });
  return { calls, event, owner, state };
}

function callNames(calls) {
  return calls.map((call) => call[0]);
}

function callsNamed(calls, name) {
  return calls.filter((call) => call[0] === name);
}

test("mousemove is throttled before writing hover state", () => {
  const { calls, event, owner } = createHarness({ now: 10, lastMouseMoveTime: 0, mouseThrottleMs: 20 });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "throttled");
  assert.equal(summary.skipped, true);
  assert.equal(calls.some((call) => call[0].startsWith("set")), false);
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(Object.isFrozen(summary.effectOrder), true);
});

test("special-zone editor branch clears hover targets and hides tooltip", () => {
  const { calls, event, owner } = createHarness({
    specialZoneEditorActive: true,
    hoveredFacilityEntry: { familyId: "port", stableId: "P1" },
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "special-zone-editor");
  assert.deepEqual(summary.effectOrder, [
    "setLastMouseMoveTime",
    "setHoverIds",
    "setHoveredFacilityEntry",
    "updateDevHoverHit",
    "markHoverOverlayDirty",
    "scheduleHoverOverlayRender",
    "queueTooltipUpdate",
    "setMapInteractionCursor",
  ]);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1], { visible: false });
  assert.deepEqual(callsNamed(calls, "setMapInteractionCursor").at(-1), ["setMapInteractionCursor", ""]);
});

test("HGO runtime hover branch clears map hover and uses pointer for runtime hits", () => {
  const hgoHit = { id: "hgo-1", targetType: "hgo" };
  const { calls, event, owner } = createHarness({
    hgoRuntimeHover: { active: true, hit: hgoHit },
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "hgo-runtime-hover");
  assert.equal(summary.cursor, "pointer");
  assert.deepEqual(callsNamed(calls, "updateDevHoverHit").at(-1), ["updateDevHoverHit", hgoHit]);
  assert.deepEqual(callsNamed(calls, "setMapInteractionCursor").at(-1), ["setMapInteractionCursor", "pointer"]);
});

test("reduced hover phase clears existing map and facility hover separately", () => {
  const { calls, event, owner } = createHarness({
    reducedHoverPhase: true,
    hoverIds: { landId: "L1", waterId: null, specialId: null },
    hoveredFacilityEntry: { familyId: "airport", stableId: "A1" },
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "reduced-hover");
  assert.deepEqual(summary.effectOrder, [
    "setLastMouseMoveTime",
    "setHoverIds",
    "markHoverOverlayDirty",
    "scheduleHoverOverlayRender",
    "setHoveredFacilityEntry",
    "markHoverOverlayDirty",
    "scheduleHoverOverlayRender",
    "updateDevHoverHit",
    "queueTooltipUpdate",
    "setMapInteractionCursor",
  ]);
});

test("normal hover updates land water special ids before tooltip probing", () => {
  const hit = { id: "L1", targetType: "land" };
  const { calls, event, owner } = createHarness({
    hit,
    hasTooltip: false,
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "no-tooltip");
  assert.deepEqual(callsNamed(calls, "getHitFromEvent")[0][1][1], {
    enableSnap: false,
    snapPx: 9,
    eventType: "hover",
  });
  assert.deepEqual(callsNamed(calls, "setHoverIds").at(-1)[1], {
    landId: "L1",
    waterId: null,
    specialId: null,
  });
  assert.deepEqual(callsNamed(calls, "updateDevHoverHit").at(-1), ["updateDevHoverHit", hit]);
});

test("facility tooltip takes priority and sets pointer when details are active", () => {
  const facility = { familyId: "airport", stableId: "A1", tooltipText: "Airport" };
  const { calls, event, owner } = createHarness({
    hit: { id: "L1", targetType: "land" },
    nextFacilityEntry: facility,
    facilityDetailsActive: true,
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "facility-tooltip");
  assert.equal(summary.cursor, "pointer");
  assert.deepEqual(callsNamed(calls, "setHoveredFacilityEntry").at(-1), ["setHoveredFacilityEntry", facility]);
  assert.deepEqual(callsNamed(calls, "setMapInteractionCursor").at(-1), ["setMapInteractionCursor", "pointer"]);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1], {
    visible: true,
    text: "Airport",
    x: 32,
    y: 42,
  });
});

test("facility block hides underlying map tooltip before city and feature probes", () => {
  const facility = { familyId: "port", stableId: "P1" };
  const { calls, event, owner } = createHarness({
    nextFacilityEntry: facility,
    blockedUnderlyingHover: true,
    cityEntry: { tooltipText: "City" },
    feature: { id: "L1" },
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "facility-blocked-underlying");
  assert.deepEqual(callsNamed(calls, "clearUnderlyingHoverForFacilityEntry").at(-1), [
    "clearUnderlyingHoverForFacilityEntry",
    facility,
  ]);
  assert.equal(callNames(calls).includes("getHoveredCityTooltipEntry"), false);
  assert.equal(callNames(calls).includes("getFeatureForHit"), false);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1], { visible: false });
});

test("city tooltip is used after facility hover misses", () => {
  const { calls, event, owner } = createHarness({
    hit: { id: "L1", targetType: "land" },
    cityEntry: { tooltipText: "Capital" },
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "city-tooltip");
  assert.equal(summary.tooltipVisible, true);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1].text, "Capital");
  assert.equal(callNames(calls).includes("getFeatureForHit"), false);
});

test("feature tooltip supports special region hits", () => {
  const feature = { id: "S1" };
  const { calls, event, owner } = createHarness({
    hit: { id: "S1", targetType: "special" },
    feature,
    tooltipText: "Special region",
  });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "feature-tooltip");
  assert.deepEqual(callsNamed(calls, "getFeatureForHit").at(-1)[1][0], { id: "S1", targetType: "special" });
  assert.deepEqual(callsNamed(calls, "getTooltipTextForFeature").at(-1), ["getTooltipTextForFeature", [feature]]);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1].text, "Special region");
});

test("empty hover hides tooltip and keeps default cursor", () => {
  const { calls, event, owner } = createHarness();

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "empty-hover");
  assert.deepEqual(callsNamed(calls, "setMapInteractionCursor").at(-1), ["setMapInteractionCursor", ""]);
  assert.deepEqual(callsNamed(calls, "queueTooltipUpdate").at(-1)[1], { visible: false });
});

test("owner fails fast for missing explicit dependencies", () => {
  assert.throws(
    () => createMapHoverInteractionOwner({ getters: {}, effects: {}, helpers: {} }),
    /getters\.nowMs must be a function/,
  );
  assert.throws(
    () => createMapHoverInteractionOwner({
      getters: Object.fromEntries([
        "nowMs",
        "getLastMouseMoveTime",
        "getMouseThrottleMs",
        "hasHoverData",
        "isSpecialZoneEditorActive",
        "inspectHgoRuntimePreviewFromEvent",
        "isReducedHoverPhase",
        "getHoverIds",
        "getHitFromEvent",
        "hasTooltip",
        "getHoveredFacilityEntry",
        "getHoveredFacilityEntryFromEvent",
        "isFacilityDetailsSurfaceActive",
        "getHoveredCityTooltipEntry",
        "getFeatureForHit",
        "getTooltipTextForFeature",
      ].map((name) => [name, () => null])),
      effects: {},
      helpers: {},
    }),
    /effects\.setLastMouseMoveTime must be a function/,
  );
});

test("summaries expose frozen getter and effect traces", () => {
  const { event, owner } = createHarness({ hasHoverData: false });

  const summary = owner.handleMouseMove(event);

  assert.equal(summary.branch, "no-hover-data");
  assert.equal(summary.skipped, true);
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(Object.isFrozen(summary.getterOrder), true);
  assert.deepEqual(summary.effectOrder, ["setLastMouseMoveTime"]);
});
