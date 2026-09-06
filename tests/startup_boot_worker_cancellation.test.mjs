import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerSource = await readFile(new URL("../js/workers/startup_boot.worker.js", import.meta.url), "utf8");

function createWorkerHarness() {
  const posted = [];
  const pendingFetches = new Map();
  const self = {
    location: {
      href: "https://example.test/js/workers/startup_boot.worker.js",
      origin: "https://example.test",
    },
    postMessage(message) {
      posted.push(message);
    },
  };
  const context = {
    AbortController,
    DOMException,
    Error,
    JSON,
    Map,
    Object,
    Promise,
    String,
    URL,
    console,
    performance: { now: () => 1 },
    self,
    globalThis: null,
    importScripts() {
      context.__scenarioForgeFeatureIdentityShared = {
        defaultCountryCodeNormalizer: (value) => String(value || "").toUpperCase(),
        getFeatureId: (feature) => feature?.id || null,
        getCountryCode: () => "",
      };
      self.topojson = { feature: () => null };
    },
    fetch(url, options = {}) {
      const taskUrl = String(url);
      if (taskUrl.includes("slow")) {
        return new Promise((_resolve, reject) => {
          pendingFetches.set(taskUrl, { signal: options.signal, reject });
          options.signal?.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")), { once: true });
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => '{"task":"fast"}',
      });
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(workerSource, context, { filename: "startup_boot.worker.js" });
  return { pendingFetches, posted, self };
}

async function flushWorker() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("startup worker cancels only its matching decode task and passes its signal to fetch", async () => {
  const { pendingFetches, posted, self } = createWorkerHarness();

  self.onmessage({ data: {
    type: "DECODE_RUNTIME_CHUNK",
    taskId: "slow-task",
    chunkType: "custom",
    chunkUrl: "/slow.json",
  } });
  self.onmessage({ data: {
    type: "DECODE_RUNTIME_CHUNK",
    taskId: "fast-task",
    chunkType: "custom",
    chunkUrl: "/fast.json",
  } });
  await flushWorker();

  const slowFetch = pendingFetches.get("https://example.test/slow.json");
  assert.ok(slowFetch?.signal);
  assert.equal(slowFetch.signal.aborted, false);
  assert.deepEqual(
    posted.filter((message) => message.type === "RUNTIME_CHUNK_READY").map((message) => message.taskId),
    ["fast-task"],
  );

  self.onmessage({ data: { type: "CANCEL_TASK", taskId: "slow-task" } });
  await flushWorker();

  assert.equal(slowFetch.signal.aborted, true);
  assert.equal(posted.some((message) => message.type === "RUNTIME_CHUNK_READY" && message.taskId === "slow-task"), false);
  assert.equal(posted.some((message) => message.type === "ERROR" && message.taskId === "slow-task"), false);
  assert.equal(
    posted.filter((message) => message.type === "RUNTIME_CHUNK_READY").find((message) => message.taskId === "fast-task")?.chunkPayload?.task,
    "fast",
  );
});
