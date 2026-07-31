import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTransportWorkbenchOverviewState,
  commitTransportWorkbenchPointDeltasState,
  commitTransportWorkbenchUiState,
  ensureTransportOverviewStyleConfigState,
  ensureTransportWorkbenchUiState,
  setTransportFamilyVisibilityState,
  setTransportMasterVisibilityState,
} from "../js/core/state/actions/transport_actions.js";

test("transport workbench commits preserve the existing ui root and detach drafts", () => {
  const root = { open: false, familyConfigs: { road: { width: 1 } } };
  const target = { transportWorkbenchUi: root };
  const draft = { open: true, activeFamily: "rail", familyConfigs: { rail: { width: 2 } } };

  assert.equal(commitTransportWorkbenchUiState(target, draft), root);
  assert.equal(ensureTransportWorkbenchUiState(target), root);
  assert.equal(root.open, true);
  assert.equal(root.activeFamily, "rail");
  draft.familyConfigs.rail.width = 9;
  assert.equal(root.familyConfigs.rail.width, 2);
});

test("transport point delta commit preserves normalized create update delete semantics", () => {
  const draft = {
    byFamily: {
      airport: {
        features: [{ id: "a1", lon: 10, lat: 20, properties: { kind: "civil" } }],
        updated: [{ id: "a2", lon: 30, lat: 40 }],
        deleted: ["a3", "a3"],
        revision: 7,
      },
    },
  };
  const target = {};
  const committed = commitTransportWorkbenchPointDeltasState(target, draft);
  const airport = committed.byFamily.airport;

  assert.equal(committed, target.transportWorkbenchPointDeltas);
  assert.equal(airport.revision, 7);
  assert.deepEqual(airport.deleted, ["a3"]);
  assert.deepEqual(airport.created.map(({ id }) => id), ["a1"]);
  assert.deepEqual(airport.updated.map(({ id }) => id), ["a2"]);
  draft.byFamily.airport.features[0].properties.kind = "military";
  assert.equal(airport.created[0].properties.kind, "civil");
});

test("transport overview and visibility actions publish only renderer-owned state", () => {
  const target = {};

  assert.equal(setTransportMasterVisibilityState(target, 0), false);
  assert.equal(setTransportFamilyVisibilityState(target, "road", 1), true);
  assert.equal(target.showTransport, true);
  assert.equal(target.showRoad, true);
  assert.equal(setTransportFamilyVisibilityState(target, "unknown", true), false);

  const overview = applyTransportWorkbenchOverviewState(target, {
    familyId: "road",
    visualMode: "clarity",
    activePackId: " JAPAN_ROAD ",
    familyConfig: { opacity: 0.33 },
    previewCamera: { scale: 9 },
  });
  assert.equal(ensureTransportOverviewStyleConfigState(target), overview);
  assert.equal(overview.road.opacity, 0.33);
  assert.equal(overview.activePackIdByFamily.road, "japan_road");
  assert.equal(Object.hasOwn(overview, "previewCamera"), false);
});
