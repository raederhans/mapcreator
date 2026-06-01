let csrfToken = "";

export function isLocalBackendRuntimeAvailable() {
  const location = globalThis.location;
  const protocol = String(location?.protocol || "");
  const hostname = String(location?.hostname || "");
  return protocol === "http:" && (hostname === "127.0.0.1" || hostname === "localhost");
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
  // 这个请求同时承担能力探测和会话恢复：静态页面环境缺少这份合同，调用方据此隐藏 Cloud Saves。
  const payload = await requestJson("/api/backend/auth/me");
  if (!payload?.csrfToken || !payload?.user || typeof payload.user !== "object") {
    csrfToken = "";
    const error = new Error("Backend capability probe did not return a session contract.");
    error.status = 404;
    error.code = "backend_unavailable";
    error.payload = payload;
    throw error;
  }
  return payload;
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

export async function createBackendSave({ title, description, project, imageUrl = "" }) {
  return requestJson("/api/backend/saves", {
    method: "POST",
    body: { title, description, project, imageUrl },
  });
}

export async function listBackendSaves() {
  return requestJson("/api/backend/saves");
}

export async function getBackendSave(saveId) {
  return requestJson(`/api/backend/saves/${encodeURIComponent(saveId)}`);
}

export async function exportBackendSave(saveId) {
  return requestJson(`/api/backend/saves/${encodeURIComponent(saveId)}/export`);
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

export async function getCommunitySave(saveId) {
  return requestJson(`/api/backend/community/saves/${encodeURIComponent(saveId)}`);
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

export async function getBackendAdminOverview() {
  return requestJson("/api/backend/admin/overview");
}

export async function getBackendAdminSave(saveId) {
  return requestJson(`/api/backend/admin/saves/${encodeURIComponent(saveId)}`);
}

export async function reviewBackendReport(reportId) {
  return requestJson(`/api/backend/admin/reports/${encodeURIComponent(reportId)}/review`, {
    method: "POST",
    body: {},
  });
}

export async function setBackendSaveVisibility(saveId, visibility) {
  return requestJson(`/api/backend/admin/saves/${encodeURIComponent(saveId)}/visibility`, {
    method: "POST",
    body: { visibility },
  });
}

export async function setBackendSaveComments(saveId, enabled) {
  return requestJson(`/api/backend/admin/saves/${encodeURIComponent(saveId)}/comments`, {
    method: "POST",
    body: { enabled },
  });
}

export async function setBackendSaveImage(saveId, imageUrl) {
  return requestJson(`/api/backend/admin/saves/${encodeURIComponent(saveId)}/image`, {
    method: "POST",
    body: { imageUrl },
  });
}

export async function hideBackendComment(commentId) {
  return requestJson(`/api/backend/admin/comments/${encodeURIComponent(commentId)}/hide`, {
    method: "POST",
    body: {},
  });
}

export async function updateBackendUser(userId, patch) {
  return requestJson(`/api/backend/admin/users/${encodeURIComponent(userId)}`, {
    method: "POST",
    body: patch,
  });
}

export async function seedBackendDemoCommunity() {
  return requestJson("/api/backend/admin/demo/seed", {
    method: "POST",
    body: {},
  });
}
