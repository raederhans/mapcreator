import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMainRuntimeLoadStatusSnapshot,
  buildMainRuntimeVersionSnapshot,
  cloneSnapshotValue,
  registerMainRuntimeDiagnostics,
} from "../js/bootstrap/main_runtime_diagnostics.js";

function createCompleteState() {
  return {
    bootPhase: "ready",
    startupInteractionMode: "full",
    startupReadonly: true,
    bootProgressPhase: "interactive",
    activeScenarioId: "tno_1962",
    topologyBundleMode: "chunked",
    detailDeferred: true,
    detailPromotionCompleted: false,
    startupBootCacheState: { mode: "hit", nested: { count: 1 } },
    contextLayerLoadStateByName: { relief: "ready" },
    contextLayerDeferredStatusByName: { contour: { status: "pending" } },
    runtimeChunkLoadState: {
      shellStatus: "ready",
      selectionVersion: 12,
      pendingReason: "viewport",
      pendingPromotion: true,
      pendingVisualPromotion: true,
      pendingInfraPromotion: false,
      promotionScheduled: true,
      refreshScheduled: false,
      promotionCommitInFlight: true,
      errorByChunkId: { chunk_a: { message: "boom" } },
      inFlightByChunkId: { chunk_b: { started: 5 } },
    },
    postReadyTaskDiagnostics: {
      pendingTaskKeys: ["post-ready-context-warmup"],
      maxRetryCount: 6,
    },
  };
}

test("buildMainRuntimeLoadStatusSnapshot preserves the full loadStatus schema", () => {
  const state = createCompleteState();
  const snapshot = buildMainRuntimeLoadStatusSnapshot(state);

  assert.deepEqual(Object.keys(snapshot), [
    "boot",
    "startup",
    "contextLayers",
    "chunkRuntime",
    "postReadyScheduler",
  ]);
  assert.deepEqual(snapshot, {
    boot: {
      phase: "ready",
      interactionMode: "full",
      readonly: true,
      bootProgressPhase: "interactive",
    },
    startup: {
      activeScenarioId: "tno_1962",
      topologyBundleMode: "chunked",
      detailDeferred: true,
      detailPromotionCompleted: false,
      startupBootCacheState: { mode: "hit", nested: { count: 1 } },
    },
    contextLayers: {
      loadStateByName: { relief: "ready" },
      deferredStatusByName: { contour: { status: "pending" } },
    },
    chunkRuntime: {
      shellStatus: "ready",
      selectionVersion: 12,
      pendingReason: "viewport",
      pendingPromotion: true,
      pendingVisualPromotion: true,
      pendingInfraPromotion: false,
      promotionScheduled: true,
      refreshScheduled: false,
      promotionCommitInFlight: true,
      errorByChunkId: { chunk_a: { message: "boom" } },
      inFlightByChunkId: { chunk_b: { started: 5 } },
    },
    postReadyScheduler: {
      pendingTaskKeys: ["post-ready-context-warmup"],
      maxRetryCount: 6,
    },
  });
});

test("missing runtimeChunkLoadState keeps chunkRuntime fallback values safe", () => {
  const snapshot = buildMainRuntimeLoadStatusSnapshot({
    activeScenarioId: "blank_base",
    bootPhase: "booting",
  });

  assert.equal(snapshot.startup.activeScenarioId, "blank_base");
  assert.equal(snapshot.startup.topologyBundleMode, "single");
  assert.deepEqual(snapshot.contextLayers.loadStateByName, {});
  assert.deepEqual(snapshot.contextLayers.deferredStatusByName, {});
  assert.deepEqual(snapshot.chunkRuntime, {
    shellStatus: "",
    selectionVersion: 0,
    pendingReason: "",
    pendingPromotion: false,
    pendingVisualPromotion: false,
    pendingInfraPromotion: false,
    promotionScheduled: false,
    refreshScheduled: false,
    promotionCommitInFlight: false,
    errorByChunkId: {},
    inFlightByChunkId: {},
  });
  assert.deepEqual(snapshot.postReadyScheduler, {});
});

test("cloneSnapshotValue deep-clones plain objects", () => {
  const source = { nested: { count: 1 }, items: ["a"] };
  const clone = cloneSnapshotValue(source, {});

  clone.nested.count = 2;
  clone.items.push("b");

  assert.deepEqual(source, { nested: { count: 1 }, items: ["a"] });
  assert.deepEqual(clone, { nested: { count: 2 }, items: ["a", "b"] });
});

test("cloneSnapshotValue returns fallback for undefined values", () => {
  const fallback = { safe: true };

  assert.equal(cloneSnapshotValue(undefined, fallback), fallback);
});

test("buildMainRuntimeVersionSnapshot preserves version schema and defaults", () => {
  const snapshot = buildMainRuntimeVersionSnapshot({
    activeScenarioId: "hoi4_1939",
    bootPhase: "ready",
    topologyBundleMode: "chunked",
  });

  assert.deepEqual(snapshot, {
    appSchemaVersion: 1,
    activeScenarioId: "hoi4_1939",
    bootPhase: "ready",
    topologyBundleMode: "chunked",
  });
});

test("registerMainRuntimeDiagnostics registers main_runtime loadStatus and version providers", () => {
  const state = createCompleteState();
  const registrations = [];
  const diagnostics = registerMainRuntimeDiagnostics({
    targetState: state,
    registerSnapshotProvider(section, providerName, callback) {
      registrations.push({ section, providerName, callback });
    },
  });

  assert.deepEqual(
    registrations.map(({ section, providerName }) => [section, providerName]),
    [
      ["loadStatus", "main_runtime"],
      ["version", "main_runtime"],
    ],
  );
  assert.deepEqual(registrations[0].callback(), buildMainRuntimeLoadStatusSnapshot(state));
  assert.deepEqual(registrations[1].callback(), buildMainRuntimeVersionSnapshot(state));
  assert.deepEqual(diagnostics.buildLoadStatusSnapshot(), buildMainRuntimeLoadStatusSnapshot(state));
  assert.deepEqual(diagnostics.buildVersionSnapshot(), buildMainRuntimeVersionSnapshot(state));
});

test("registerMainRuntimeDiagnostics validates required injection points", () => {
  assert.throws(
    () => registerMainRuntimeDiagnostics({
      targetState: null,
      registerSnapshotProvider() {},
    }),
    /targetState/,
  );
  assert.throws(
    () => registerMainRuntimeDiagnostics({
      targetState: {},
      registerSnapshotProvider: null,
    }),
    /registerSnapshotProvider/,
  );
});

test("registerMainRuntimeDiagnostics forwards the configured app schema version", () => {
  const state = createCompleteState();
  const registrations = [];
  const diagnostics = registerMainRuntimeDiagnostics({
    targetState: state,
    appSchemaVersion: 7,
    registerSnapshotProvider(section, providerName, callback) {
      registrations.push({ section, providerName, callback });
    },
  });
  const versionProvider = registrations.find(({ section }) => section === "version");

  assert.deepEqual(versionProvider.callback(), {
    appSchemaVersion: 7,
    activeScenarioId: "tno_1962",
    bootPhase: "ready",
    topologyBundleMode: "chunked",
  });
  assert.equal(diagnostics.buildVersionSnapshot().appSchemaVersion, 7);
});
