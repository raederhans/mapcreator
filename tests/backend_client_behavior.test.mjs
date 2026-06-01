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

test("backend client exposes save detail export community detail and admin routes", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  const client = await freshClient();

  globalThis.fetch = async (url, options = {}) => {
    requests.push([String(url), options]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/login")) {
          return { csrfToken: "csrf-admin" };
        }
        return { ok: true };
      },
    };
  };

  try {
    await client.loginBackendUser({ username: "admin", password: "correct horse" });
    await client.getBackendSave("save-1");
    await client.exportBackendSave("save-1");
    await client.getCommunitySave("save-1");
    await client.getBackendAdminOverview();
    await client.getBackendAdminSave("save-1");
    await client.reviewBackendReport("report-1");
    await client.setBackendSaveVisibility("save-1", "private");
    await client.setBackendSaveComments("save-1", false);
    await client.setBackendSaveImage("save-1", "");
    await client.hideBackendComment("comment-1");
    await client.updateBackendUser("user-1", { status: "banned" });
    await client.seedBackendDemoCommunity();

    assert.deepEqual(
      requests.map(([url]) => url),
      [
        "/api/backend/auth/login",
        "/api/backend/saves/save-1",
        "/api/backend/saves/save-1/export",
        "/api/backend/community/saves/save-1",
        "/api/backend/admin/overview",
        "/api/backend/admin/saves/save-1",
        "/api/backend/admin/reports/report-1/review",
        "/api/backend/admin/saves/save-1/visibility",
        "/api/backend/admin/saves/save-1/comments",
        "/api/backend/admin/saves/save-1/image",
        "/api/backend/admin/comments/comment-1/hide",
        "/api/backend/admin/users/user-1",
        "/api/backend/admin/demo/seed",
      ]
    );
    const adminWrites = requests.slice(6).map(([, options]) => options.headers["X-MapCreator-CSRF"]);
    assert.deepEqual(adminWrites, [
      "csrf-admin",
      "csrf-admin",
      "csrf-admin",
      "csrf-admin",
      "csrf-admin",
      "csrf-admin",
      "csrf-admin",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend runtime availability is limited to local http origins", async () => {
  const previousFetch = globalThis.fetch;
  const client = await freshClient();

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({}),
  });

  try {
    await assert.rejects(
      () => client.refreshBackendSession(),
      /Backend capability probe/
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("backend community helpers encode save ids in paths", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  const client = await freshClient();
  const rawSaveId = "save/1?draft=true";
  const encodedSaveId = encodeURIComponent(rawSaveId);

  globalThis.fetch = async (url, options = {}) => {
    requests.push([String(url), options.method || "GET", options.body ? JSON.parse(String(options.body)) : null]);
    return {
      ok: true,
      json: async () => ({}),
    };
  };

  try {
    await client.downloadCommunitySave(rawSaveId);
    await client.addCommunityComment(rawSaveId, "Works locally.");
    await client.reportCommunitySave(rawSaveId, "other", "Needs review.");

    assert.deepEqual(requests.map(([url]) => url), [
      `/api/backend/community/saves/${encodedSaveId}/download`,
      `/api/backend/community/saves/${encodedSaveId}/comments`,
      `/api/backend/community/saves/${encodedSaveId}/reports`,
    ]);
    assert.equal(requests[1][1], "POST");
    assert.deepEqual(requests[1][2], { body: "Works locally." });
    assert.deepEqual(requests[2][2], { reason: "other", details: "Needs review." });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
