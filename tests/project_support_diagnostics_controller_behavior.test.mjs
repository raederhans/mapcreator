import test from "node:test";
import assert from "node:assert/strict";

import { state } from "../js/core/state.js";
import { registerRuntimeHook } from "../js/core/state/index.js";
import { markDirty, clearDirty } from "../js/core/dirty_state.js";
import { createProjectSupportDiagnosticsController } from "../js/ui/sidebar/project_support_diagnostics_controller.js";

function createStatusNode() {
  return {
    textContent: "",
    dataset: {},
  };
}

function createButtonNode() {
  return {
    dataset: {},
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

function createListNode() {
  return {
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function createElementNode(tagName = "div") {
  return {
    tagName,
    children: [],
    className: "",
    textContent: "",
    type: "",
    dataset: {},
    disabled: false,
    hidden: false,
    addEventListener(type, handler) {
      this.listeners = this.listeners || {};
      this.listeners[type] = handler;
    },
    append(...children) {
      this.children.push(...children);
    },
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}

function createDirtyIndicator() {
  return {
    classList: {
      toggle() {},
    },
    setAttribute() {},
  };
}

function createController(projectSaveStatus, overrides = {}) {
  return createProjectSupportDiagnosticsController({
    state,
    elements: {
      projectSaveStatus,
      ...overrides.elements,
    },
    helpers: {
      t: (value) => value,
      createEmptyNote: () => null,
      resolveAuditNumber: (value) => Number(value || 0),
      incrementSidebarCounter: () => {},
      loadScenarioAuditPayload: async () => null,
      releaseScenarioAuditPayload: () => {},
      legendManager: {
        getSpecialZoneLayers: () => [],
        getSpecialZoneSignature: () => "",
        getSignature: () => "",
        getLabels: () => ({}),
      },
      mapRenderer: {},
      fileManager: {},
      showAppDialog: async () => true,
      showToast: () => {},
      importProjectThroughFunnel: () => false,
      invalidateFrontlineOverlayState: () => {},
      ...overrides.helpers,
    },
  });
}

test("project save status refreshes when dirty state changes", () => {
  const previousDocument = globalThis.document;
  const previousDirty = state.isDirty;
  const previousLastDirtyReason = state.lastDirtyReason;
  const projectSaveStatus = createStatusNode();
  const controller = createController(projectSaveStatus);

  globalThis.document = {
    getElementById: (id) => (id === "appDirtyIndicator" ? createDirtyIndicator() : null),
  };

  try {
    state.isDirty = false;
    state.lastDirtyReason = "";
    registerRuntimeHook(state, "updateProjectSaveStatusFn", controller.refreshProjectSaveStatus);
    controller.bindEvents();

    assert.equal(projectSaveStatus.textContent, "Project export includes appearance and transport settings.");

    markDirty("transport-workbench-config");
    assert.match(projectSaveStatus.textContent, /Unsaved project changes/);

    clearDirty("project-export");
    assert.equal(projectSaveStatus.textContent, "Project exported. Appearance and transport settings are saved in the JSON file.");
  } finally {
    registerRuntimeHook(state, "updateProjectSaveStatusFn", null);
    state.isDirty = previousDirty;
    state.lastDirtyReason = previousLastDirtyReason;
    globalThis.document = previousDocument;
  }
});

test("community load waits for import callback before showing loaded status", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudStatus = createStatusNode();
  const backendCommunityRefreshBtn = createButtonNode();
  const backendCommunityList = createListNode();
  let imported = false;

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url) => ({
    ok: !String(url).includes("/auth/me"),
    json: async () => {
      if (String(url).endsWith("/community/saves")) {
        return { saves: [{ id: "save-1", title: "Shared Save", owner: { displayName: "Alice" } }] };
      }
      if (String(url).endsWith("/community/saves/save-1/download")) {
        return { filename: "shared.json", save: { project: { schemaVersion: 21 } } };
      }
      return {};
    },
  });

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudStatus,
        backendCommunityRefreshBtn,
        backendCommunityList,
      },
      helpers: {
        importProjectThroughFunnel: (_file, options) => {
          imported = true;
          assert.equal(typeof options.hooks.onProjectImportComplete, "function");
          return true;
        },
        mapRenderer: { refreshColorState: () => {} },
      },
    });
    controller.bindEvents();

    await backendCommunityRefreshBtn.listeners.click();
    const row = backendCommunityList.children[0];
    const loadButton = row.children.find((child) => child.textContent === "Load");
    await loadButton.listeners.click();

    assert.equal(imported, true);
    assert.equal(backendCloudStatus.textContent, "Community save import started.");
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("publish latest recovers newest cloud save after session refresh", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudStatus = createStatusNode();
  const backendCloudPublishBtn = createButtonNode();
  const backendCommunityList = createListNode();
  const requested = [];

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url, options = {}) => {
    requested.push([String(url), options.method || "GET"]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/me")) {
          return { user: { displayName: "Alice" }, csrfToken: "csrf-token" };
        }
        if (String(url).endsWith("/api/backend/saves")) {
          return { saves: [{ id: "save-2", title: "Newest Save" }] };
        }
        if (String(url).endsWith("/publish")) {
          return { save: { id: "save-2", visibility: "public" } };
        }
        if (String(url).endsWith("/community/saves")) {
          return { saves: [] };
        }
        return {};
      },
    };
  };

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudStatus,
        backendCloudPublishBtn,
        backendCommunityList,
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await backendCloudPublishBtn.listeners.click();

    assert.deepEqual(requested.some(([url]) => url.endsWith("/api/backend/saves")), true);
    assert.deepEqual(requested.some(([url, method]) => url.endsWith("/api/backend/saves/save-2/publish") && method === "POST"), true);
    assert.equal(backendCloudStatus.textContent, "Latest cloud save published.");
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("login clears previous cloud save before publishing", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudStatus = createStatusNode();
  const backendCloudUsername = { value: "bob" };
  const backendCloudPassword = { value: "correct horse" };
  const backendCloudSaveTitle = { value: "First save" };
  const backendCloudSaveBtn = createButtonNode();
  const backendCloudLoginBtn = createButtonNode();
  const backendCloudPublishBtn = createButtonNode();
  const backendCommunityList = createListNode();
  const requested = [];

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url, options = {}) => {
    requested.push([String(url), options.method || "GET", options.body ? JSON.parse(String(options.body)) : null]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/me")) {
          return { user: { displayName: "Alice" }, csrfToken: "initial-csrf" };
        }
        if (String(url).endsWith("/api/backend/saves") && (options.method || "GET") === "POST") {
          return { save: { id: "save-1" } };
        }
        if (String(url).endsWith("/auth/login")) {
          return { user: { displayName: "Bob" }, csrfToken: "bob-csrf" };
        }
        if (String(url).endsWith("/api/backend/saves")) {
          return { saves: [{ id: "save-2", title: "Bob save" }] };
        }
        if (String(url).endsWith("/publish")) {
          return { save: { id: "save-2", visibility: "public" } };
        }
        if (String(url).endsWith("/community/saves")) {
          return { saves: [] };
        }
        return {};
      },
    };
  };

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudStatus,
        backendCloudUsername,
        backendCloudPassword,
        backendCloudSaveTitle,
        backendCloudSaveBtn,
        backendCloudLoginBtn,
        backendCloudPublishBtn,
        backendCommunityList,
      },
      helpers: {
        fileManager: {
          buildProjectPayload: () => ({ schemaVersion: 21, paintMode: "visual" }),
        },
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await backendCloudSaveBtn.listeners.click();
    await backendCloudLoginBtn.listeners.click();
    await backendCloudPublishBtn.listeners.click();

    assert.deepEqual(
      requested.some(([url, method]) => url.endsWith("/api/backend/saves/save-2/publish") && method === "POST"),
      true
    );
    assert.deepEqual(
      requested.some(([url]) => url.endsWith("/api/backend/saves/save-1/publish")),
      false
    );
    assert.equal(backendCloudStatus.textContent, "Latest cloud save published.");
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("register clears previous cloud save before publishing", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudStatus = createStatusNode();
  const backendCloudUsername = { value: "bob" };
  const backendCloudPassword = { value: "correct horse" };
  const backendCloudSaveTitle = { value: "First save" };
  const backendCloudSaveBtn = createButtonNode();
  const backendCloudRegisterBtn = createButtonNode();
  const backendCloudPublishBtn = createButtonNode();
  const backendCommunityList = createListNode();
  const requested = [];

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url, options = {}) => {
    requested.push([String(url), options.method || "GET"]);
    return {
      ok: true,
      json: async () => {
        if (String(url).endsWith("/auth/me")) {
          return { user: { username: "alice" }, csrfToken: "initial-csrf" };
        }
        if (String(url).endsWith("/api/backend/saves") && (options.method || "GET") === "POST") {
          return { save: { id: "save-1" } };
        }
        if (String(url).endsWith("/auth/register")) {
          return { user: { username: "bob" }, csrfToken: "bob-csrf" };
        }
        if (String(url).endsWith("/api/backend/saves")) {
          return { saves: [{ id: "save-2", title: "Bob save" }] };
        }
        if (String(url).endsWith("/publish")) {
          return { save: { id: "save-2", visibility: "public" } };
        }
        if (String(url).endsWith("/community/saves")) {
          return { saves: [] };
        }
        return {};
      },
    };
  };

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudStatus,
        backendCloudUsername,
        backendCloudPassword,
        backendCloudSaveTitle,
        backendCloudSaveBtn,
        backendCloudRegisterBtn,
        backendCloudPublishBtn,
        backendCommunityList,
      },
      helpers: {
        fileManager: {
          buildProjectPayload: () => ({ schemaVersion: 21, paintMode: "visual" }),
        },
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await backendCloudSaveBtn.listeners.click();
    await backendCloudRegisterBtn.listeners.click();
    await backendCloudPublishBtn.listeners.click();

    assert.deepEqual(
      requested.some(([url, method]) => url.endsWith("/api/backend/saves/save-2/publish") && method === "POST"),
      true
    );
    assert.deepEqual(
      requested.some(([url]) => url.endsWith("/api/backend/saves/save-1/publish")),
      false
    );
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("anonymous backend probe enables only public cloud actions", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudSection = { hidden: true };
  const backendCloudStatus = createStatusNode();
  const backendCloudUsername = { value: "", disabled: false };
  const backendCloudPassword = { value: "", disabled: false };
  const backendCloudSaveTitle = { value: "", disabled: false };
  const backendCloudRegisterBtn = createButtonNode();
  const backendCloudLoginBtn = createButtonNode();
  const backendCloudLogoutBtn = createButtonNode();
  const backendCloudSaveBtn = createButtonNode();
  const backendCloudPublishBtn = createButtonNode();
  const backendCommunityRefreshBtn = createButtonNode();
  const backendCommunityList = createListNode();

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url) => ({
    ok: !String(url).endsWith("/auth/me"),
    status: String(url).endsWith("/auth/me") ? 401 : 200,
    json: async () => {
      if (String(url).endsWith("/auth/me")) {
        return { code: "auth_required", message: "Login is required." };
      }
      if (String(url).endsWith("/community/saves")) {
        return { saves: [{ id: "save-1", title: "Shared Save", owner: { displayName: "Alice" } }] };
      }
      return {};
    },
  });

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudSection,
        backendCloudStatus,
        backendCloudUsername,
        backendCloudPassword,
        backendCloudSaveTitle,
        backendCloudRegisterBtn,
        backendCloudLoginBtn,
        backendCloudLogoutBtn,
        backendCloudSaveBtn,
        backendCloudPublishBtn,
        backendCommunityRefreshBtn,
        backendCommunityList,
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(backendCloudSection.hidden, false);
    assert.equal(backendCloudUsername.disabled, false);
    assert.equal(backendCloudPassword.disabled, false);
    assert.equal(backendCloudRegisterBtn.disabled, false);
    assert.equal(backendCloudLoginBtn.disabled, false);
    assert.equal(backendCommunityRefreshBtn.disabled, false);
    assert.equal(backendCloudSaveTitle.disabled, true);
    assert.equal(backendCloudLogoutBtn.disabled, true);
    assert.equal(backendCloudSaveBtn.disabled, true);
    assert.equal(backendCloudPublishBtn.disabled, true);

    await backendCommunityRefreshBtn.listeners.click();
    const row = backendCommunityList.children[0];
    assert.equal(row.children.find((child) => child.textContent === "Load").disabled, false);
    assert.equal(row.children.find((child) => child.textContent === "Comment").disabled, true);
    assert.equal(row.children.find((child) => child.textContent === "Report").disabled, true);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("community action buttons refresh after anonymous user logs in", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudSection = { hidden: true };
  const backendCloudStatus = createStatusNode();
  const backendCloudUsername = { value: "alice", disabled: false };
  const backendCloudPassword = { value: "correct horse", disabled: false };
  const backendCloudRegisterBtn = createButtonNode();
  const backendCloudLoginBtn = createButtonNode();
  const backendCommunityRefreshBtn = createButtonNode();
  const backendCommunityList = createListNode();

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async (url) => ({
    ok: !String(url).endsWith("/auth/me"),
    status: String(url).endsWith("/auth/me") ? 401 : 200,
    json: async () => {
      if (String(url).endsWith("/auth/me")) {
        return { code: "auth_required", message: "Login is required." };
      }
      if (String(url).endsWith("/auth/login")) {
        return { user: { username: "alice" }, csrfToken: "csrf-token" };
      }
      if (String(url).endsWith("/community/saves")) {
        return { saves: [{ id: "save-1", title: "Shared Save", owner: { displayName: "Alice" } }] };
      }
      return {};
    },
  });

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudSection,
        backendCloudStatus,
        backendCloudUsername,
        backendCloudPassword,
        backendCloudRegisterBtn,
        backendCloudLoginBtn,
        backendCommunityRefreshBtn,
        backendCommunityList,
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await backendCommunityRefreshBtn.listeners.click();
    const anonymousRow = backendCommunityList.children[0];
    assert.equal(anonymousRow.children.find((child) => child.textContent === "Comment").disabled, true);
    assert.equal(anonymousRow.children.find((child) => child.textContent === "Report").disabled, true);

    await backendCloudLoginBtn.listeners.click();
    const authenticatedRow = backendCommunityList.children[0];
    assert.equal(authenticatedRow.children.find((child) => child.textContent === "Comment").disabled, false);
    assert.equal(authenticatedRow.children.find((child) => child.textContent === "Report").disabled, false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("backend session probe disables cloud controls when local backend fails unexpectedly", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudSection = { hidden: true };
  const backendCloudStatus = createStatusNode();
  const backendCloudUsername = { value: "" };
  const backendCloudPassword = { value: "" };
  const backendCloudSaveTitle = { value: "" };
  const backendCloudRegisterBtn = createButtonNode();
  const backendCloudLoginBtn = createButtonNode();
  const backendCloudLogoutBtn = createButtonNode();
  const backendCloudSaveBtn = createButtonNode();
  const backendCloudPublishBtn = createButtonNode();
  const backendCommunityRefreshBtn = createButtonNode();

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ code: "internal_error", message: "Unexpected backend failure." }),
  });

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudSection,
        backendCloudStatus,
        backendCloudUsername,
        backendCloudPassword,
        backendCloudSaveTitle,
        backendCloudRegisterBtn,
        backendCloudLoginBtn,
        backendCloudLogoutBtn,
        backendCloudSaveBtn,
        backendCloudPublishBtn,
        backendCommunityRefreshBtn,
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(backendCloudStatus.textContent, "Local backend unavailable. Start the local dev server to use Cloud Saves.");
    assert.equal(backendCloudSection.hidden, false);
    assert.equal(backendCloudSaveBtn.disabled, true);
    assert.equal(backendCommunityRefreshBtn.disabled, true);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});

test("backend session probe hides cloud section for non backend success payloads", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const backendCloudSection = { hidden: true };
  const backendCloudStatus = createStatusNode();
  const backendCloudRegisterBtn = createButtonNode();
  const backendCommunityRefreshBtn = createButtonNode();

  globalThis.document = {
    createElement: createElementNode,
    getElementById: () => null,
  };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  });

  try {
    const controller = createController(createStatusNode(), {
      elements: {
        backendCloudSection,
        backendCloudStatus,
        backendCloudRegisterBtn,
        backendCommunityRefreshBtn,
      },
    });
    controller.bindEvents();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(backendCloudSection.hidden, true);
    assert.equal(backendCloudRegisterBtn.disabled, true);
    assert.equal(backendCommunityRefreshBtn.disabled, true);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});
