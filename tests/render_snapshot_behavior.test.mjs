import assert from "node:assert/strict";
import test from "node:test";

import {
  RENDER_SNAPSHOT_ERROR,
  RENDER_SNAPSHOT_KIND,
  RENDER_SNAPSHOT_SCHEMA_VERSION,
  RenderSnapshotError,
  createRenderSnapshot,
  createRenderSnapshotOwner,
  getRenderSnapshotIdentity,
  parseRenderSnapshot,
} from "../js/core/renderer/render_snapshot.js";

function createSnapshot(overrides = {}) {
  return createRenderSnapshot({
    palette: {
      sovereignBaseColors: { ZED: "#ffffff", AAA: "#000000" },
    },
    ownership: {
      sovereigntyByFeatureId: { feature_z: "ZED", feature_a: "AAA" },
    },
    viewport: {
      transform: { x: 12, y: -4, k: 1.5 },
      renderSignature: "800|600|2",
      projectionSignature: "100|400|300",
      geoBounds: [-20, -10, 30, 40],
    },
    ...overrides,
  });
}

test("render snapshot v1 normalizes sorted maps and deeply freezes declared render inputs", () => {
  const snapshot = createSnapshot();

  assert.equal(snapshot.schemaVersion, RENDER_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(snapshot.kind, RENDER_SNAPSHOT_KIND);
  assert.deepEqual(Object.keys(snapshot.palette.sovereignBaseColors), ["AAA", "ZED"]);
  assert.deepEqual(Object.keys(snapshot.ownership.sovereigntyByFeatureId), ["feature_a", "feature_z"]);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.palette.sovereignBaseColors), true);
  assert.equal(Object.isFrozen(snapshot.viewport.transform), true);
  assert.equal(Object.isFrozen(snapshot.viewport.geoBounds), true);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), {
    schemaVersion: 1,
    kind: "render-snapshot",
    palette: { sovereignBaseColors: { AAA: "#000000", ZED: "#ffffff" } },
    ownership: { sovereigntyByFeatureId: { feature_a: "AAA", feature_z: "ZED" } },
    viewport: {
      transform: { x: 12, y: -4, k: 1.5 },
      renderSignature: "800|600|2",
      projectionSignature: "100|400|300",
      geoBounds: [-20, -10, 30, 40],
    },
  });
});

test("render snapshot never retains palette ownership viewport or transform runtime references", () => {
  const colors = { US: "#123456" };
  const owners = { feature_1: "US" };
  const transform = { x: 1, y: 2, k: 3, apply() {} };
  const geoBounds = [-1, -2, 3, 4];
  const owner = createRenderSnapshotOwner({
    getters: {
      getSovereignBaseColors: () => colors,
      getSovereigntyByFeatureId: () => owners,
      getViewportTransform: () => transform,
      getViewportRenderSignature: () => "100|200|1",
      getProjectionRenderSignature: () => "projection:na",
      getViewportGeoBounds: () => geoBounds,
    },
  });

  const snapshot = owner.captureRenderSnapshot();
  colors.US = "#abcdef";
  owners.feature_1 = "CA";
  transform.x = 999;
  geoBounds[0] = -180;

  assert.deepEqual({ ...snapshot.palette.sovereignBaseColors }, { US: "#123456" });
  assert.deepEqual({ ...snapshot.ownership.sovereigntyByFeatureId }, { feature_1: "US" });
  assert.deepEqual(snapshot.viewport.transform, { x: 1, y: 2, k: 3 });
  assert.deepEqual(snapshot.viewport.geoBounds, [-1, -2, 3, 4]);
  assert.equal(Object.hasOwn(snapshot.viewport.transform, "apply"), false);
});

test("strict parsing rejects unknown fields future versions and unsupported kinds", () => {
  const snapshot = createSnapshot();

  assert.throws(
    () => parseRenderSnapshot({ ...snapshot, scene: {} }),
    (error) => error instanceof RenderSnapshotError && error.code === RENDER_SNAPSHOT_ERROR.INVALID,
  );
  assert.throws(
    () => parseRenderSnapshot({ ...snapshot, schemaVersion: 2 }),
    (error) => error.code === RENDER_SNAPSHOT_ERROR.VERSION_UNSUPPORTED,
  );
  assert.throws(
    () => parseRenderSnapshot({ ...snapshot, kind: "pixel-snapshot" }),
    (error) => error.code === RENDER_SNAPSHOT_ERROR.KIND_UNSUPPORTED,
  );
});

test("render snapshot rejects runtime carriers non-finite numbers cycles and unsafe record keys", () => {
  const base = createSnapshot();
  const unsafeColors = JSON.parse('{"__proto__":"#000000"}');

  for (const sovereignBaseColors of [new Map(), new Set(), documentLike(), unsafeColors]) {
    assert.throws(
      () => createRenderSnapshot({
        ...base,
        palette: { sovereignBaseColors },
      }),
      (error) => error.code === RENDER_SNAPSHOT_ERROR.INVALID,
    );
  }
  assert.throws(
    () => createRenderSnapshot({
      ...base,
      palette: { sovereignBaseColors: { US: () => "#000000" } },
    }),
    (error) => error.code === RENDER_SNAPSHOT_ERROR.INVALID,
  );
  assert.throws(
    () => createRenderSnapshot({
      ...base,
      viewport: { ...base.viewport, transform: { x: Infinity, y: 0, k: 1 } },
    }),
    (error) => error.code === RENDER_SNAPSHOT_ERROR.INVALID,
  );
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => createRenderSnapshot({
      ...base,
      ownership: { sovereigntyByFeatureId: cyclic },
    }),
    (error) => error.code === RENDER_SNAPSHOT_ERROR.INVALID,
  );
});

test("canonical render snapshot identity is stable across source record insertion order", () => {
  const left = createSnapshot();
  const right = createRenderSnapshot({
    palette: { sovereignBaseColors: { AAA: "#000000", ZED: "#ffffff" } },
    ownership: { sovereigntyByFeatureId: { feature_a: "AAA", feature_z: "ZED" } },
    viewport: left.viewport,
  });

  assert.equal(getRenderSnapshotIdentity(left), getRenderSnapshotIdentity(right));
});

function documentLike() {
  return Object.create({ nodeType: 9 });
}
