import test from "node:test";
import assert from "node:assert/strict";

let moduleCounter = 0;

async function freshClient() {
  moduleCounter += 1;
  return import(`../js/api/backend_client.js?backend-client-test=${moduleCounter}`);
}

test("backend client keeps csrf in memory and sends it on write requests", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  const client = await freshClient();

  globalThis.fetch = async (url, options = {}) => {
    requests.push([String(url), options]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/register")) {
          return { csrfToken: "csrf-1", user: { displayName: "Alice" } };
        }
        if (String(url).endsWith("/api/backend/saves")) {
          return { save: { id: "save-1" } };
        }
        return {};
      },
    };
  };

  try {
    await client.registerBackendUser({
      username: "alice",
      password: "correct horse",
      displayName: "Alice",
    });
    await client.createBackendSave({
      title: "Cloud copy",
      description: "",
      project: { schemaVersion: 21 },
    });

    const saveRequest = requests.find(([url]) => url.endsWith("/api/backend/saves"));
    assert.equal(saveRequest?.[1].credentials, "same-origin");
    assert.equal(saveRequest?.[1].headers["X-MapCreator-CSRF"], "csrf-1");
    assert.equal(client.getBackendCsrfToken(), "csrf-1");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend client clears csrf after logout", async () => {
  const previousFetch = globalThis.fetch;
  const client = await freshClient();

  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => (String(url).endsWith("/auth/login") ? { csrfToken: "csrf-2" } : { ok: true }),
  });

  try {
    await client.loginBackendUser({ username: "alice", password: "correct horse" });
    assert.equal(client.getBackendCsrfToken(), "csrf-2");

    await client.logoutBackendUser();
    assert.equal(client.getBackendCsrfToken(), "");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend client replaces stale csrf after login", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  const client = await freshClient();

  globalThis.fetch = async (url, options = {}) => {
    requests.push([String(url), options]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/register")) {
          return { csrfToken: "csrf-register" };
        }
        if (String(url).endsWith("/auth/login")) {
          return { csrfToken: "csrf-login" };
        }
        if (String(url).endsWith("/api/backend/saves")) {
          return { save: { id: "save-1" } };
        }
        return {};
      },
    };
  };

  try {
    await client.registerBackendUser({ username: "alice", password: "correct horse", displayName: "Alice" });
    await client.loginBackendUser({ username: "alice", password: "correct horse" });
    await client.createBackendSave({ title: "After login", description: "", project: { schemaVersion: 21 } });

    const saveRequest = requests.find(([url]) => url.endsWith("/api/backend/saves"));
    assert.equal(saveRequest?.[1].headers["X-MapCreator-CSRF"], "csrf-login");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend client surfaces backend error messages", async () => {
  const previousFetch = globalThis.fetch;
  const client = await freshClient();

  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: "Login is required." }),
  });

  try {
    await assert.rejects(
      () => client.listBackendSaves(),
      /Login is required\./
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend runtime availability is limited to local http origins", async () => {
  const client = await freshClient();

  assert.equal(client.isLocalBackendRuntimeAvailable({ protocol: "http:", hostname: "localhost" }), true);
  assert.equal(client.isLocalBackendRuntimeAvailable({ protocol: "http:", hostname: "127.0.0.1" }), true);
  assert.equal(client.isLocalBackendRuntimeAvailable({ protocol: "https:", hostname: "example.com" }), false);
  assert.equal(client.isLocalBackendRuntimeAvailable({ protocol: "file:", hostname: "" }), false);
});
