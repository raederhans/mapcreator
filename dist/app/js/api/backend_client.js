let csrfToken = "";

export function isLocalBackendRuntimeAvailable(locationLike = globalThis.location) {
  const protocol = String(locationLike?.protocol || "").trim().toLowerCase();
  const hostname = String(locationLike?.hostname || "").trim().toLowerCase();
  return (
    (protocol === "http:" || protocol === "https:")
    && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]")
  );
}

async function requestJson(path, { method = "GET", body = null } = {}) {
  const headers = {};
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }
  if (csrfToken && method !== "GET") {
    headers["X-MapCreator-CSRF"] = csrfToken;
  }
  const response = await fetch(path, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.code || "Backend request failed.");
    const error = new Error(message);
    error.status = response.status;
    error.code = String(payload?.code || "request_failed");
    error.payload = payload;
    throw error;
  }
  if (payload?.csrfToken) {
    csrfToken = String(payload.csrfToken);
  }
  return payload;
}

export function getBackendCsrfToken() {
  return csrfToken;
}

export async function refreshBackendSession() {
  return requestJson("/api/backend/auth/me");
}

export async function registerBackendUser({ username, password, displayName }) {
  return requestJson("/api/backend/auth/register", {
    method: "POST",
    body: { username, password, displayName },
  });
}

export async function loginBackendUser({ username, password }) {
  return requestJson("/api/backend/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export async function logoutBackendUser() {
  const payload = await requestJson("/api/backend/auth/logout", {
    method: "POST",
    body: {},
  });
  csrfToken = "";
  return payload;
}

export async function createBackendSave({ title, description, project }) {
  return requestJson("/api/backend/saves", {
    method: "POST",
    body: { title, description, project },
  });
}

export async function listBackendSaves() {
  return requestJson("/api/backend/saves");
}

export async function publishBackendSave(saveId) {
  return requestJson(`/api/backend/saves/${encodeURIComponent(saveId)}/publish`, {
    method: "POST",
    body: { visibility: "public" },
  });
}

export async function listCommunitySaves() {
  return requestJson("/api/backend/community/saves");
}

export async function downloadCommunitySave(saveId) {
  return requestJson(`/api/backend/community/saves/${encodeURIComponent(saveId)}/download`);
}

export async function addCommunityComment(saveId, body) {
  return requestJson(`/api/backend/community/saves/${encodeURIComponent(saveId)}/comments`, {
    method: "POST",
    body: { body },
  });
}

export async function reportCommunitySave(saveId, reason = "other", details = "") {
  return requestJson(`/api/backend/community/saves/${encodeURIComponent(saveId)}/reports`, {
    method: "POST",
    body: { reason, details },
  });
}
