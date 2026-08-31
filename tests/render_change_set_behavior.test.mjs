import assert from "node:assert/strict";
import test from "node:test";

import { createRenderSnapshot } from "../js/core/renderer/render_snapshot.js";
import {
  RENDER_CHANGE_SET_ACTION,
  RENDER_CHANGE_SET_ERROR,
  RENDER_CHANGE_SET_KIND,
  RENDER_CHANGE_SET_SCHEMA_VERSION,
  RenderChangeSetError,
  assertRenderChangeSetBaseSnapshot,
  compareRenderChangeSet,
  createRenderChangeSet,
  createRenderChangeSetActionIntent,
  parseRenderChangeSet,
} from "../js/core/render_change_set.js";

function snapshot({ color = "#112233", owner = "US", x = 0 } = {}) {
  return createRenderSnapshot({
    palette: { sovereignBaseColors: { US: color } },
    ownership: { sovereigntyByFeatureId: { feature_1: owner } },
    viewport: {
      transform: { x, y: 0, k: 1 },
      renderSignature: "800|600|1",
      projectionSignature: "100|400|300",
      geoBounds: [-180, -90, 180, 90],
    },
  });
}

function changeSet(overrides = {}) {
  return createRenderChangeSet({
    id: "render-change-1",
    before: snapshot(),
    after: snapshot({ color: "#abcdef", owner: "CA", x: 10 }),
    provenance: { source: "test", nested: { sequence: 1 } },
    ...overrides,
  });
}

test("render change-set v1 strictly parses immutable before and after snapshots", () => {
  const value = changeSet();

  assert.equal(value.schemaVersion, RENDER_CHANGE_SET_SCHEMA_VERSION);
  assert.equal(value.kind, RENDER_CHANGE_SET_KIND);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.before.palette.sovereignBaseColors), true);
  assert.equal(Object.isFrozen(value.provenance.nested), true);
  assert.deepEqual(compareRenderChangeSet(value), {
    paletteChanged: true,
    ownershipChanged: true,
    viewportChanged: true,
    changedScopes: ["palette", "ownership", "viewport"],
    hasChanges: true,
  });
});

test("render change-set rejects empty changes unknown fields unsafe provenance and future contracts", () => {
  const before = snapshot();
  assert.throws(
    () => createRenderChangeSet({ id: "empty", before, after: before }),
    (error) => error instanceof RenderChangeSetError && error.code === RENDER_CHANGE_SET_ERROR.EMPTY,
  );
  assert.throws(
    () => parseRenderChangeSet({ ...changeSet(), runtime: {} }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
  assert.throws(
    () => parseRenderChangeSet({ ...changeSet(), schemaVersion: 2 }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
  );
  assert.throws(
    () => parseRenderChangeSet({ ...changeSet(), kind: "appearance-change-set" }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.KIND_UNSUPPORTED,
  );
  assert.throws(
    () => createRenderChangeSet({
      id: "unsafe",
      before,
      after: snapshot({ x: 1 }),
      provenance: JSON.parse('{"constructor":{"polluted":true}}'),
    }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
});

test("base-stale checks use exact normalized snapshot identity for apply and undo", () => {
  const value = changeSet();

  assert.deepEqual(assertRenderChangeSetBaseSnapshot(value, value.before), value);
  assert.deepEqual(
    assertRenderChangeSetBaseSnapshot(value, value.after, { action: RENDER_CHANGE_SET_ACTION.UNDO }),
    value,
  );
  assert.throws(
    () => assertRenderChangeSetBaseSnapshot(value, snapshot({ x: 1 })),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.BASE_STALE,
  );
  assert.throws(
    () => assertRenderChangeSetBaseSnapshot(value, value.before, { action: "undo" }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.BASE_STALE,
  );
});

test("preview compare apply and undo produce declarative action intents without side effects", () => {
  const value = changeSet();
  const preview = createRenderChangeSetActionIntent(value, "preview", {
    currentSnapshot: value.before,
  });
  const compare = createRenderChangeSetActionIntent(value, "compare");
  const apply = createRenderChangeSetActionIntent(value, "apply", {
    currentSnapshot: value.before,
  });
  const undo = createRenderChangeSetActionIntent(value, "undo", {
    currentSnapshot: value.after,
  });

  assert.equal(preview.sessionOnly, true);
  assert.equal(compare.sessionOnly, true);
  assert.equal(apply.commitsState, true);
  assert.equal(apply.recordsHistory, true);
  assert.equal(undo.commitsState, true);
  assert.equal(undo.recordsHistory, false);
  assert.deepEqual(apply.target, value.after);
  assert.deepEqual(undo.target, value.before);
  for (const intent of [preview, compare, apply, undo]) {
    assert.equal(intent.requiresRender, true);
    assert.equal(intent.sideEffectsPerformed, false);
    assert.equal(Object.isFrozen(intent), true);
  }
});

test("apply and undo intents require a current base snapshot and reject stale bases", () => {
  const value = changeSet();

  for (const action of [RENDER_CHANGE_SET_ACTION.APPLY, RENDER_CHANGE_SET_ACTION.UNDO]) {
    assert.throws(
      () => createRenderChangeSetActionIntent(value, action),
      (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID
        && error.details.path === "currentSnapshot",
    );
  }
  assert.throws(
    () => createRenderChangeSetActionIntent(value, RENDER_CHANGE_SET_ACTION.APPLY, {
      currentSnapshot: value.after,
    }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.BASE_STALE,
  );
  assert.throws(
    () => createRenderChangeSetActionIntent(value, RENDER_CHANGE_SET_ACTION.UNDO, {
      currentSnapshot: value.before,
    }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.BASE_STALE,
  );

  assert.equal(createRenderChangeSetActionIntent(value, "preview").sessionOnly, true);
  assert.equal(createRenderChangeSetActionIntent(value, "compare").sessionOnly, true);
});

test("action intent rejects unsupported actions and hostile provenance carriers", () => {
  assert.throws(
    () => createRenderChangeSetActionIntent(changeSet(), "commit"),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.ACTION_UNSUPPORTED,
  );
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => changeSet({ provenance: cyclic }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
  assert.throws(
    () => changeSet({ provenance: { hook() {} } }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => changeSet({ provenance: { sparse } }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
  const extraKey = ["source"];
  extraKey.channel = "runtime";
  assert.throws(
    () => changeSet({ provenance: { extraKey } }),
    (error) => error.code === RENDER_CHANGE_SET_ERROR.INVALID,
  );
});
