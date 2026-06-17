import test from "node:test";
import assert from "node:assert/strict";

import { createStrategicOverlayRenderOwner } from "../js/core/renderer/strategic_overlay_render_owner.js";

test("strategic overlay render owner renders dirty overlays once per signature", () => {
  const calls = [];
  const state = {
    annotationView: {
      frontlineEnabled: true,
      frontlineStyle: "clean",
      showFrontlineLabels: true,
      showUnitLabels: true,
      unitRendererDefault: "game",
    },
    dirtyRevision: 1,
    frontlineOverlayDirty: true,
    operationGraphics: [{ id: "opg_1" }],
    operationGraphicsDirty: true,
    operationGraphicsEditor: { active: false, points: [], selectedId: "" },
    operationalLineEditor: { active: false, points: [], selectedId: "" },
    operationalLines: [{ id: "opl_1" }],
    operationalLinesDirty: true,
    renderPhase: "idle",
    showSpecialZones: true,
    specialZoneEditor: { active: false, selectedId: "" },
    specialZonesOverlayDirty: true,
    topologyRevision: 3,
    unitCounterEditor: { active: false, selectedId: "" },
    unitCounters: [{ id: "unit_1" }],
    unitCountersDirty: true,
    zoomTransform: { k: 1.5 },
  };

  const owner = createStrategicOverlayRenderOwner({
    state,
    helpers: {
      getProjectionRenderSignature: () => "projection-a",
    },
    renderers: {
      renderFrontlineOverlay: () => calls.push("frontline"),
      renderOperationGraphicsOverlay: () => calls.push("operationGraphics"),
      renderOperationalLinesOverlay: () => calls.push("operationalLines"),
      renderSpecialZones: () => calls.push("specialZones"),
      renderUnitCountersOverlay: () => calls.push("unitCounters"),
    },
  });

  assert.equal(owner.renderFrontlineOverlayIfNeeded(), true);
  assert.equal(owner.renderOperationalLinesIfNeeded(), true);
  assert.equal(owner.renderOperationGraphicsIfNeeded(), true);
  assert.equal(owner.renderUnitCountersIfNeeded(), true);
  assert.equal(owner.renderSpecialZonesIfNeeded(), true);
  assert.deepEqual(calls, ["frontline", "operationalLines", "operationGraphics", "unitCounters", "specialZones"]);
  assert.equal(state.frontlineOverlayDirty, false);
  assert.equal(state.operationalLinesDirty, false);
  assert.equal(state.operationGraphicsDirty, false);
  assert.equal(state.unitCountersDirty, false);
  assert.equal(state.specialZonesOverlayDirty, false);

  assert.equal(owner.renderFrontlineOverlayIfNeeded(), false);
  assert.equal(owner.renderOperationalLinesIfNeeded(), false);
  assert.equal(owner.renderOperationGraphicsIfNeeded(), false);
  assert.equal(owner.renderUnitCountersIfNeeded(), false);
  assert.equal(owner.renderSpecialZonesIfNeeded(), false);
  assert.equal(calls.length, 5);
});

test("strategic overlay render owner force renders and skips non-idle dynamic overlays", () => {
  const calls = [];
  const state = {
    annotationView: {},
    renderPhase: "drawing",
    topologyRevision: 1,
    zoomTransform: { k: 2 },
  };

  const owner = createStrategicOverlayRenderOwner({
    state,
    helpers: {
      getProjectionRenderSignature: () => "projection-b",
    },
    renderers: {
      renderFrontlineOverlay: () => calls.push("frontline"),
      renderOperationGraphicsOverlay: () => calls.push("operationGraphics"),
      renderOperationalLinesOverlay: () => calls.push("operationalLines"),
      renderUnitCountersOverlay: () => calls.push("unitCounters"),
      syncUnitCounterScalesDuringZoom: () => calls.push("sync"),
    },
  });

  assert.equal(owner.renderFrontlineOverlayIfNeeded(), false);
  assert.equal(owner.renderOperationalLinesIfNeeded(), false);
  assert.equal(owner.renderOperationGraphicsIfNeeded(), false);
  assert.equal(owner.renderUnitCountersIfNeeded(), false);
  assert.deepEqual(calls, []);

  assert.equal(owner.renderUnitCountersIfNeeded({ force: true }), true);
  owner.syncUnitCounterScalesDuringZoom();
  assert.deepEqual(calls, ["unitCounters", "sync"]);
});
