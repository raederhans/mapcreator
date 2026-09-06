import assert from "node:assert/strict";
import test from "node:test";

import { createStartupBootOverlayController } from "../js/bootstrap/startup_boot_overlay.js";
import { state as runtimeState } from "../js/core/state.js";
import {
  clearStartupReadonlyStateFields,
  commitStartupReadonlyStateFields,
  replaceBootMetricsState,
} from "../js/core/state/actions/boot_actions.js";

const BOOT_STATE_KEYS = Object.freeze([
  "startupReadonly",
  "startupReadonlyReason",
  "startupReadonlyUnlockInFlight",
  "startupReadonlySince",
  "bootMetrics",
]);

function snapshotProperties(target, keys) {
  return new Map(keys.map((key) => [key, target[key]]));
}

function restoreProperties(target, snapshot) {
  clearStartupReadonlyStateFields(target, { preserveSince: false });
  commitStartupReadonlyStateFields(target, {
    active: true,
    reason: snapshot.get("startupReadonlyReason"),
    unlockInFlight: snapshot.get("startupReadonlyUnlockInFlight"),
    since: snapshot.get("startupReadonlySince"),
  });
  if (!snapshot.get("startupReadonly")) {
    clearStartupReadonlyStateFields(target, { preserveSince: true });
  }
  replaceBootMetricsState(target, snapshot.get("bootMetrics"));
}

test("boot snapshot restore preserves active and inactive timestamps and metrics identity", () => {
  for (const active of [false, true]) {
    const metrics = { fixture: { startedAt: 10 } };
    const original = {
      startupReadonly: active,
      startupReadonlyReason: active ? "detail-promotion" : "",
      startupReadonlyUnlockInFlight: active,
      startupReadonlySince: 123,
      bootMetrics: metrics,
    };
    const target = { ...original, startupReadonlySince: 999, bootMetrics: {} };
    restoreProperties(target, snapshotProperties(original, BOOT_STATE_KEYS));
    assert.deepEqual(target, original);
    assert.equal(target.bootMetrics, metrics);
  }
});

function createDocumentStub() {
  return {
    body: {
      classList: {
        toggle() {},
      },
    },
    getElementById() {
      return null;
    },
  };
}

test("boot overlay keeps boot metrics and global mirror on the same committed root", () => {
  const stateSnapshot = snapshotProperties(runtimeState, BOOT_STATE_KEYS);
  const hadDocument = Object.hasOwn(globalThis, "document");
  const originalDocument = globalThis.document;
  const hadBootMetrics = Object.hasOwn(globalThis, "__bootMetrics");
  const originalBootMetrics = globalThis.__bootMetrics;

  try {
    globalThis.document = createDocumentStub();
    const controller = createStartupBootOverlayController();

    controller.resetBootMetrics();
    assert.equal(globalThis.__bootMetrics, runtimeState.bootMetrics);
    const resetRoot = runtimeState.bootMetrics;

    controller.startBootMetric("startup-data");
    assert.equal(globalThis.__bootMetrics, runtimeState.bootMetrics);
    assert.notEqual(runtimeState.bootMetrics, resetRoot);

    controller.finishBootMetric("startup-data", { status: "ready" });
    assert.equal(globalThis.__bootMetrics, runtimeState.bootMetrics);
    assert.equal(runtimeState.bootMetrics["startup-data"].status, "ready");
  } finally {
    restoreProperties(runtimeState, stateSnapshot);
    if (hadDocument) {
      globalThis.document = originalDocument;
    } else {
      delete globalThis.document;
    }
    if (hadBootMetrics) {
      globalThis.__bootMetrics = originalBootMetrics;
    } else {
      delete globalThis.__bootMetrics;
    }
  }
});

test("boot overlay preserves readonly activation time and clears it on ordinary deactivate", () => {
  const stateSnapshot = snapshotProperties(runtimeState, BOOT_STATE_KEYS);
  const hadDocument = Object.hasOwn(globalThis, "document");
  const originalDocument = globalThis.document;

  try {
    globalThis.document = createDocumentStub();
    commitStartupReadonlyStateFields(runtimeState, {
      active: false,
      reason: "",
      unlockInFlight: false,
      since: 0,
    });
    const controller = createStartupBootOverlayController();

    controller.setStartupReadonlyState(true, {
      reason: "detail-promotion",
      unlockInFlight: true,
    });
    const activatedAt = runtimeState.startupReadonlySince;

    assert.equal(runtimeState.startupReadonly, true);
    assert.equal(runtimeState.startupReadonlyReason, "detail-promotion");
    assert.equal(runtimeState.startupReadonlyUnlockInFlight, true);
    assert.ok(Number(activatedAt) > 0);

    controller.setStartupReadonlyState(true, {
      reason: "scenario-health-gate",
      unlockInFlight: false,
    });
    assert.equal(runtimeState.startupReadonlySince, activatedAt);

    controller.setStartupReadonlyState(false);
    assert.equal(runtimeState.startupReadonly, false);
    assert.equal(runtimeState.startupReadonlyReason, "");
    assert.equal(runtimeState.startupReadonlyUnlockInFlight, false);
    assert.equal(runtimeState.startupReadonlySince, 0);
  } finally {
    restoreProperties(runtimeState, stateSnapshot);
    if (hadDocument) {
      globalThis.document = originalDocument;
    } else {
      delete globalThis.document;
    }
  }
});
