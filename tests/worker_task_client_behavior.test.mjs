import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerTaskClient } from "../js/core/worker_task_client.js";

test("worker task client resolves matching task replies and clears timeouts", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;
  const clearedTimeouts = [];
  const postedMessages = [];

  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }

    postMessage(message) {
      postedMessages.push(message);
    }

    terminate() {
      this.terminated = true;
    }
  }

  try {
    globalThis.setTimeout = (callback) => {
      timeoutCallback = callback;
      return "timeout-1";
    };
    globalThis.clearTimeout = (timeoutId) => {
      clearedTimeouts.push(timeoutId);
    };
    const client = createWorkerTaskClient({
      createWorker: () => new FakeWorker(),
      defaultTimeoutMs: 1000,
      createTaskId: (type, sequence) => `${type}:${sequence}`,
      resolveMessage: (message) => ({ ok: true, value: message.value }),
    });

    await client.ensureWorker();
    const resultPromise = client.dispatchTask("LOAD", { value: 7 });
    await Promise.resolve();
    assert.equal(postedMessages.length, 1);
    assert.equal(postedMessages[0].taskId, "LOAD:1");
    assert.equal(postedMessages[0].value, 7);

    FakeWorker.instance.onmessage({
      data: {
        type: "READY",
        taskId: "LOAD:1",
        value: 11,
      },
    });

    assert.deepEqual(await resultPromise, { ok: true, value: 11 });
    assert.deepEqual(clearedTimeouts, ["timeout-1"]);
    assert.equal(typeof timeoutCallback, "function");
    assert.equal(client.getPendingTaskCount(), 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("worker task client recycles worker and rejects pending work on timeout", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;

  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }

    postMessage() {}

    terminate() {
      this.terminated = true;
    }
  }

  try {
    globalThis.setTimeout = (callback) => {
      timeoutCallback = callback;
      return "timeout-2";
    };
    globalThis.clearTimeout = () => {};
    const client = createWorkerTaskClient({
      createWorker: () => new FakeWorker(),
      defaultTimeoutMs: 1000,
      createTaskId: (type, sequence) => `${type}:${sequence}`,
      createTimeoutError: (type) => new Error(`timed out: ${type}`),
    });

    await client.ensureWorker();
    const resultPromise = client.dispatchTask("LOAD", {});
    await Promise.resolve();
    timeoutCallback();

    await assert.rejects(resultPromise, /timed out: LOAD/);
    assert.equal(FakeWorker.instance.terminated, true);
    assert.equal(client.getPendingTaskCount(), 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("worker task client gives timeout and recycled pending tasks separate errors", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timeoutCallbacks = [];

  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }

    postMessage() {}

    terminate() {
      this.terminated = true;
    }
  }

  try {
    globalThis.setTimeout = (callback) => {
      timeoutCallbacks.push(callback);
      return `timeout-${timeoutCallbacks.length}`;
    };
    globalThis.clearTimeout = () => {};
    const client = createWorkerTaskClient({
      createWorker: () => new FakeWorker(),
      defaultTimeoutMs: 1000,
      createTaskId: (type, sequence) => `${type}:${sequence}`,
      createTimeoutError: (type) => new Error(`timed out: ${type}`),
      createRecycleError: (type) => new Error(`recycled after timeout: ${type}`),
    });

    await client.ensureWorker();
    const firstPromise = client.dispatchTask("LOAD_A", {});
    const secondPromise = client.dispatchTask("LOAD_B", {});
    await Promise.resolve();
    timeoutCallbacks[0]();

    await assert.rejects(firstPromise, /timed out: LOAD_A/);
    await assert.rejects(secondPromise, /recycled after timeout: LOAD_A/);
    assert.equal(FakeWorker.instance.terminated, true);
    assert.equal(client.getPendingTaskCount(), 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("worker task client rejects task-specific ERROR messages", async () => {
  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }

    postMessage() {}
  }

  const client = createWorkerTaskClient({
    createWorker: () => new FakeWorker(),
    createTaskId: (type, sequence) => `${type}:${sequence}`,
    createMessageError: (message) => new Error(`message failed: ${message.reason}`),
  });

  await client.ensureWorker();
  const resultPromise = client.dispatchTask("LOAD", {});
  await Promise.resolve();
  FakeWorker.instance.onmessage({
    data: {
      type: "ERROR",
      taskId: "LOAD:1",
      reason: "decode",
    },
  });

  await assert.rejects(resultPromise, /message failed: decode/);
  assert.equal(client.getPendingTaskCount(), 0);
});

test("worker task client rejects pending work on worker error", async () => {
  class FakeWorker {
    constructor() {
      FakeWorker.instance = this;
      this.onmessage = null;
      this.onerror = null;
    }

    postMessage() {}

    terminate() {
      this.terminated = true;
    }
  }

  const client = createWorkerTaskClient({
    createWorker: () => new FakeWorker(),
    createTaskId: (type, sequence) => `${type}:${sequence}`,
    createWorkerError: (event) => new Error(`worker crashed: ${event.message}`),
  });

  await client.ensureWorker();
  const resultPromise = client.dispatchTask("LOAD", {});
  await Promise.resolve();
  FakeWorker.instance.onerror({ message: "boom" });

  await assert.rejects(resultPromise, /worker crashed: boom/);
  assert.equal(FakeWorker.instance.terminated, true);
  assert.equal(client.getPendingTaskCount(), 0);
});
