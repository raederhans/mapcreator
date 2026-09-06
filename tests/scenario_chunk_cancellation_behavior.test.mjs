import assert from "node:assert/strict";
import test from "node:test";
import { createChunkLoadGenerationFixture, createDeferredPromise } from "./helpers/scenario_chunk_contract_support.mjs";
import { loadScenarioChunkFile } from "../js/core/scenario/bundle_loader.js";
import { loadMeasuredJsonResource } from "../js/core/data_loader.js";
import { terminateStartupWorker } from "../js/core/startup_worker_client.js";

const CHUNK_ID = "political.detail.tt";
const chunkResult = () => ({ payload: { type: "FeatureCollection", features: [] } });
const settleDispatch = async () => { for (let index = 0; index < 5; index += 1) await Promise.resolve(); };

function cancellationFixture({ honorAbort = true } = {}) {
  const loads = [];
  const bundles = new Map();
  const fixture = createChunkLoadGenerationFixture({
    getCachedScenarioBundle: (id) => bundles.get(id) || null,
    loadScenarioChunkFile: (url, { signal }) => {
      const deferred = createDeferredPromise();
      const load = { url, signal, ...deferred };
      loads.push(load);
      if (honorAbort) signal.addEventListener("abort", () => deferred.reject(signal.reason), { once: true });
      return deferred.promise;
    },
  });
  return {
    ...fixture, loads, bundles,
    bundle(url, id = "tno_1962") {
      const bundle = fixture.createBundle(url, id);
      bundles.set(id, bundle);
      return bundle;
    },
  };
}

test("same scenario reset reuses the cached promise without aborting its fetch", async () => {
  const { controller, loads, bundle } = cancellationFixture();
  const current = bundle("shared.json");
  const first = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  await settleDispatch();
  const cached = current.chunkPayloadPromisesById[CHUNK_ID];
  controller.resetScenarioChunkRuntimeState({ scenarioId: "tno_1962" });
  const second = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  await settleDispatch();
  assert.equal(loads.length, 1);
  assert.equal(loads[0].signal.aborted, false);
  assert.equal(current.chunkPayloadPromisesById[CHUNK_ID], cached);
  loads[0].resolve(chunkResult());
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, b);
  assert.equal(current.chunkPayloadPromisesById[CHUNK_ID], undefined);
});

test("switch cancels the outgoing bundle even after active ID changes, preserving an incoming fetch", async () => {
  const { controller, targetState, loads, bundle } = cancellationFixture();
  const outgoing = bundle("a.json");
  const incoming = bundle("b.json", "scenario_b");
  const first = controller.preloadScenarioFocusCountryPoliticalDetailChunk(outgoing);
  const firstRejected = assert.rejects(first, { name: "AbortError" });
  await settleDispatch();
  targetState.activeScenarioId = "scenario_b";
  const second = controller.preloadScenarioFocusCountryPoliticalDetailChunk(incoming);
  await settleDispatch();
  assert.equal(loads.length, 2);
  controller.resetScenarioChunkRuntimeState({ scenarioId: "scenario_b" });
  assert.equal(loads[0].signal.aborted, true);
  assert.equal(loads[1].signal.aborted, false);
  assert.equal(outgoing.chunkPayloadPromisesById[CHUNK_ID], undefined);
  const newLoadState = targetState.runtimeChunkLoadState;
  loads[1].resolve(chunkResult());
  await Promise.all([firstRejected, second]);
  assert.equal(outgoing.chunkPayloadCacheById[CHUNK_ID], undefined);
  assert.ok(incoming.chunkPayloadCacheById[CHUNK_ID]);
  assert.equal(targetState.runtimeChunkLoadState, newLoadState);
  assert.deepEqual(newLoadState.errorByChunkId, {});
});

test("clear discards a late aborted result and old cleanup cannot erase a retry promise", async () => {
  const { controller, targetState, loads, bundle } = cancellationFixture({ honorAbort: false });
  const current = bundle("retry.json");
  const first = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  const firstRejected = assert.rejects(first, { name: "AbortError" });
  await settleDispatch();
  controller.resetScenarioChunkRuntimeState();
  assert.equal(loads[0].signal.aborted, true);
  assert.equal(current.chunkPayloadPromisesById[CHUNK_ID], undefined);
  targetState.activeScenarioId = "tno_1962";
  controller.resetScenarioChunkRuntimeState({ scenarioId: "tno_1962" });
  const retry = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  await settleDispatch();
  const retryCached = current.chunkPayloadPromisesById[CHUNK_ID];
  assert.equal(loads.length, 2);
  loads[0].resolve(chunkResult());
  await firstRejected;
  assert.equal(current.chunkPayloadCacheById[CHUNK_ID], undefined);
  assert.equal(current.chunkPayloadPromisesById[CHUNK_ID], retryCached);
  assert.equal(targetState.runtimeChunkLoadState.inFlightByChunkId[CHUNK_ID], true);
  loads[1].resolve(chunkResult());
  await retry;
  assert.ok(current.chunkPayloadCacheById[CHUNK_ID]);
});

test("ordinary chunk failure clears ownership and permits a successful retry", async () => {
  const { controller, loads, bundle } = cancellationFixture();
  const current = bundle("failed.json");
  const first = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  const failed = assert.rejects(first, /network failed/);
  await settleDispatch();
  loads[0].reject(new Error("network failed"));
  await failed;
  assert.equal(current.chunkPayloadPromisesById[CHUNK_ID], undefined);
  const retry = controller.preloadScenarioFocusCountryPoliticalDetailChunk(current);
  await settleDispatch();
  assert.equal(loads.length, 2);
  loads[1].resolve(chunkResult());
  await retry;
  assert.ok(current.chunkPayloadCacheById[CHUNK_ID]);
});

test("same-ID bundle replacement preserves requests until leaving and cancels every outgoing generation", async () => {
  const { controller, targetState, loads, bundle } = cancellationFixture();
  const firstBundle = bundle("first.json");
  const completed = controller.preloadScenarioFocusCountryPoliticalDetailChunk(firstBundle);
  await settleDispatch();
  loads[0].resolve(chunkResult());
  await completed;
  const secondBundle = bundle("second.json");
  controller.resetScenarioChunkRuntimeState({ scenarioId: "tno_1962" });
  const second = controller.preloadScenarioFocusCountryPoliticalDetailChunk(secondBundle);
  const secondRejected = assert.rejects(second, { name: "AbortError" });
  await settleDispatch();
  const thirdBundle = bundle("third.json");
  controller.resetScenarioChunkRuntimeState({ scenarioId: "tno_1962" });
  const third = controller.preloadScenarioFocusCountryPoliticalDetailChunk(thirdBundle);
  const thirdRejected = assert.rejects(third, { name: "AbortError" });
  await settleDispatch();
  assert.equal(loads[1].signal.aborted, false);
  assert.equal(loads[2].signal.aborted, false);
  targetState.activeScenarioId = "scenario_b";
  controller.resetScenarioChunkRuntimeState({ scenarioId: "scenario_b" });
  assert.equal(loads[1].signal.aborted, true);
  assert.equal(loads[2].signal.aborted, true);
  await Promise.all([secondRejected, thirdRejected]);
  assert.equal(secondBundle.chunkPayloadCacheById[CHUNK_ID], undefined);
  assert.equal(thirdBundle.chunkPayloadCacheById[CHUNK_ID], undefined);
  assert.ok(firstBundle.chunkPayloadCacheById[CHUNK_ID]);
});

test("main chunk fetch receives the signal and preserves body AbortError", async (t) => {
  const controller = new AbortController();
  const body = createDeferredPromise();
  let receivedSignal;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    receivedSignal = options.signal;
    return { ok: true, text: () => body.promise };
  });
  const pending = loadScenarioChunkFile("chunk.json", { useWorker: false, signal: controller.signal });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await settleDispatch();
  assert.equal(receivedSignal, controller.signal);
  controller.abort();
  body.reject(controller.signal.reason);
  await rejected;
});

test("already aborted resources do not start fetch and legacy D3 only discards results after settlement", async (t) => {
  const controller = new AbortController();
  controller.abort();
  let fetchCalls = 0;
  t.mock.method(globalThis, "fetch", () => { fetchCalls += 1; });
  await assert.rejects(loadMeasuredJsonResource("early.json", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(fetchCalls, 0);
  const savedFetch = globalThis.fetch;
  try {
    globalThis.fetch = undefined;
    const body = createDeferredPromise();
    const legacyController = new AbortController();
    const pending = loadMeasuredJsonResource("legacy.json", {
      signal: legacyController.signal, d3Client: { json: () => body.promise },
    });
    const rejected = assert.rejects(pending, { name: "AbortError" });
    legacyController.abort();
    body.resolve({ late: true });
    await rejected;
  } finally {
    globalThis.fetch = savedFetch;
  }
});

test("worker abort never falls back while an ordinary worker error falls back once with the same signal", async (t) => {
  const OriginalWorker = globalThis.Worker;
  const messages = [];
  let worker;
  class FakeWorker {
    constructor() { worker = this; }
    postMessage(message) { messages.push(message); }
    terminate() {}
  }
  globalThis.Worker = FakeWorker;
  terminateStartupWorker();
  let fetchCalls = 0;
  let receivedSignal;
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    fetchCalls += 1;
    receivedSignal = options.signal;
    return { ok: true, text: async () => '{"ok":true}' };
  });
  try {
    const controller = new AbortController();
    const aborted = loadScenarioChunkFile("abort.json", { useWorker: true, signal: controller.signal });
    const rejected = assert.rejects(aborted, { name: "AbortError" });
    await settleDispatch();
    assert.equal(messages[0].type, "DECODE_RUNTIME_CHUNK");
    controller.abort();
    await rejected;
    assert.equal(fetchCalls, 0);
    assert.equal(messages.at(-1).type, "CANCEL_TASK");
    const normalController = new AbortController();
    const normal = loadScenarioChunkFile("fallback.json", { useWorker: true, signal: normalController.signal });
    await settleDispatch();
    const task = messages.at(-1);
    worker.onmessage({ data: { type: "ERROR", taskId: task.taskId, message: "ordinary failure" } });
    assert.deepEqual((await normal).payload, { ok: true });
    assert.equal(fetchCalls, 1);
    assert.equal(receivedSignal, normalController.signal);
  } finally {
    terminateStartupWorker();
    if (OriginalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = OriginalWorker;
  }
});
