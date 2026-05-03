import catalogPayload from "../../data/CATALOG.json" with { type: "json" };
import { loadMeasuredJsonResource } from "./data_loader.js";
import {
  RUNTIME_ASSET_REGISTRY,
  RUNTIME_ASSET_URLS,
} from "./runtime_asset_registry.js";
import {
  ensureMapcreatorSnapshotGlobal,
  registerMapcreatorSnapshotProvider,
} from "./mapcreator_snapshot.js";

const DATA_SERVICE_SCHEMA_VERSION = 1;
const catalogEntries = Array.isArray(catalogPayload?.entries) ? catalogPayload.entries : [];
const catalogEntryByUrl = new Map(
  catalogEntries.map((entry) => [normalizeCatalogPath(entry?.url || ""), entry]).filter(([url]) => !!url)
);
const transportEntryByUrl = new Map(
  catalogEntries
    .filter((entry) => {
      const url = normalizeCatalogPath(entry?.url || "");
      return (
        !!url
        && url.startsWith("data/transport_layers/")
        && String(entry?.readMode || "").trim() === "json"
      );
    })
    .map((entry) => [normalizeCatalogPath(entry.url), entry])
);
const statusByRequestId = new Map();
const metricsByRequestId = new Map();
let lastUpdatedAt = 0;

function cloneJsonLike(value) {
  if (value === undefined) return undefined;
  if (typeof globalThis.structuredClone === "function") {
    try {
      return globalThis.structuredClone(value);
    } catch (_error) {
      // Fall through to JSON clone.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return undefined;
  }
}

function normalizeCatalogPath(value) {
  return String(value || "").replaceAll("\\", "/").trim();
}

function resolveEntryCachePolicy(entry, overridePolicy = "") {
  const normalizedOverridePolicy = String(overridePolicy || "").trim();
  if (normalizedOverridePolicy) return normalizedOverridePolicy;
  const normalizedEntryPolicy = String(entry?.cachePolicy || "").trim();
  return normalizedEntryPolicy || "default";
}

function createDataServiceError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function createRequestId(kind, id) {
  return `${String(kind || "").trim()}:${String(id || "").trim()}`;
}

function updateStatus(requestId, nextState = {}) {
  const previous = statusByRequestId.get(requestId) || {
    requestId,
    status: "idle",
  };
  const merged = {
    ...previous,
    ...nextState,
    requestId,
    updatedAt: Date.now(),
  };
  statusByRequestId.set(requestId, merged);
  lastUpdatedAt = merged.updatedAt;
  return merged;
}

function updateMetrics(requestId, metrics = {}) {
  const nextMetrics = {
    ...(metricsByRequestId.get(requestId) || {}),
    ...metrics,
    recordedAt: Date.now(),
  };
  metricsByRequestId.set(requestId, nextMetrics);
  lastUpdatedAt = nextMetrics.recordedAt;
  return nextMetrics;
}

function normalizeDataServiceError(error, {
  kind,
  id,
  url,
  cachePolicy,
} = {}) {
  if (error?.code && String(error?.message || "").startsWith("[data_service]")) {
    return error;
  }
  const normalizedKind = String(kind || "").trim() || "resource";
  const normalizedId = String(id || "").trim() || "<empty>";
  const normalizedUrl = String(url || "").trim();
  if (error?.httpStatus) {
    return createDataServiceError(
      "http-error",
      `[data_service] Failed to load ${normalizedKind} ${normalizedId} at ${normalizedUrl} (${error.httpStatus}${error.httpStatusText ? ` ${error.httpStatusText}` : ""}).`,
      {
        cause: error,
        kind: normalizedKind,
        id: normalizedId,
        url: normalizedUrl,
        httpStatus: error.httpStatus,
        httpStatusText: error.httpStatusText || "",
        cachePolicy,
      },
    );
  }
  return createDataServiceError(
    String(error?.code || "load-failed"),
    `[data_service] Failed to load ${normalizedKind} ${normalizedId} at ${normalizedUrl}: ${error?.message || error}`,
    {
      cause: error,
      kind: normalizedKind,
      id: normalizedId,
      url: normalizedUrl,
      cachePolicy,
    },
  );
}

function ensureReadableJsonEntry(entry, {
  kind,
  id,
  url,
} = {}) {
  const normalizedUrl = normalizeCatalogPath(url);
  const normalizedKind = String(kind || "").trim() || "resource";
  const normalizedId = String(id || "").trim() || normalizedUrl || "<empty>";
  const readMode = String(entry?.readMode || "").trim();
  if (readMode === "json") return;
  throw createDataServiceError(
    "unsupported-format",
    `[data_service] ${normalizedKind} ${normalizedId} is registered with readMode=${readMode || "<empty>"} at ${normalizedUrl}.`,
    {
      kind: normalizedKind,
      id: normalizedId,
      url: normalizedUrl,
      format: String(entry?.format || "").trim(),
      readMode,
    },
  );
}

async function loadJsonEntry(kind, id, url, entry, options = {}) {
  const normalizedUrl = normalizeCatalogPath(url);
  const requestId = createRequestId(kind, id || normalizedUrl);
  const cachePolicy = resolveEntryCachePolicy(entry, options.cachePolicy);
  ensureReadableJsonEntry(entry, { kind, id, url: normalizedUrl });
  updateStatus(requestId, {
    kind,
    id,
    url: normalizedUrl,
    role: String(entry?.role || "").trim(),
    status: "loading",
    error: "",
    errorCode: "",
    httpStatus: 0,
    cachePolicy,
  });
  try {
    const { payload, metrics } = await loadMeasuredJsonResource(normalizedUrl, {
      d3Client: options.d3Client,
      label: options.label || requestId,
      cache: cachePolicy,
    });
    updateMetrics(requestId, {
      ...metrics,
      cachePolicy,
      kind,
      id,
      url: normalizedUrl,
      role: String(entry?.role || "").trim(),
    });
    updateStatus(requestId, {
      status: "ready",
      error: "",
      errorCode: "",
      httpStatus: 200,
      loadedAt: Date.now(),
      cachePolicy,
    });
    return payload;
  } catch (error) {
    const normalizedError = normalizeDataServiceError(error, {
      kind,
      id,
      url: normalizedUrl,
      cachePolicy,
    });
    updateStatus(requestId, {
      status: "error",
      error: normalizedError.message,
      errorCode: String(normalizedError.code || "load-failed"),
      httpStatus: Number(normalizedError.httpStatus || 0),
      cachePolicy,
    });
    throw normalizedError;
  }
}

function resolveCatalogEntryByUrl(url) {
  return catalogEntryByUrl.get(normalizeCatalogPath(url)) || null;
}

export async function getAsset(key, options = {}) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw createDataServiceError("unknown-asset-key", "[data_service] Asset key must be non-empty.", {
      kind: "asset",
      id: "",
      url: "",
    });
  }
  const url = normalizeCatalogPath(RUNTIME_ASSET_URLS[normalizedKey] || "");
  if (!url) {
    throw createDataServiceError("unknown-asset-key", `[data_service] Unknown runtime asset key: ${normalizedKey}.`, {
      kind: "asset",
      id: normalizedKey,
      url: "",
    });
  }
  const entry = resolveCatalogEntryByUrl(url) || {
    key: normalizedKey,
    url,
    role: String(RUNTIME_ASSET_REGISTRY?.assets?.[normalizedKey]?.role || "runtime_asset"),
    format: url.endsWith(".js") ? "javascript" : "json",
    readMode: url.endsWith(".js") ? "module" : "json",
    cachePolicy: "default",
  };
  return loadJsonEntry("asset", normalizedKey, url, entry, {
    ...options,
    label: options.label || `asset:${normalizedKey}`,
  });
}

export async function getCatalogAsset(path, options = {}) {
  const normalizedPath = normalizeCatalogPath(path);
  const entry = resolveCatalogEntryByUrl(normalizedPath);
  if (!entry) {
    throw createDataServiceError("catalog-path-not-allowed", `[data_service] Catalog path is not registered: ${normalizedPath || "<empty>"}.`, {
      kind: "catalog",
      id: normalizedPath,
      url: normalizedPath,
    });
  }
  return loadJsonEntry("catalog", normalizedPath, normalizedPath, entry, {
    ...options,
    label: options.label || `catalog:${normalizedPath}`,
  });
}

export async function getTransportAsset(path, options = {}) {
  const normalizedPath = normalizeCatalogPath(path);
  const entry = transportEntryByUrl.get(normalizedPath);
  if (!entry) {
    throw createDataServiceError("transport-path-not-allowed", `[data_service] Transport path is not allowlisted: ${normalizedPath || "<empty>"}.`, {
      kind: "transport",
      id: normalizedPath,
      url: normalizedPath,
    });
  }
  return loadJsonEntry("transport", normalizedPath, normalizedPath, entry, {
    ...options,
    label: options.label || `transport:${normalizedPath}`,
  });
}

export function getStatusSnapshot() {
  const resources = Object.fromEntries(
    Array.from(statusByRequestId.entries())
      .sort(([leftKey], [rightKey]) => String(leftKey).localeCompare(String(rightKey)))
      .map(([requestId, snapshot]) => [requestId, cloneJsonLike(snapshot)])
  );
  const totals = {
    total: statusByRequestId.size,
    loading: 0,
    ready: 0,
    error: 0,
    idle: 0,
  };
  Object.values(resources).forEach((snapshot) => {
    const status = String(snapshot?.status || "idle").trim() || "idle";
    if (Object.prototype.hasOwnProperty.call(totals, status)) {
      totals[status] += 1;
      return;
    }
    totals[status] = Number(totals[status] || 0) + 1;
  });
  return {
    schemaVersion: DATA_SERVICE_SCHEMA_VERSION,
    updatedAt: lastUpdatedAt || 0,
    resources,
    totals,
  };
}

export function getMetricsSnapshot() {
  const resources = Object.fromEntries(
    Array.from(metricsByRequestId.entries())
      .sort(([leftKey], [rightKey]) => String(leftKey).localeCompare(String(rightKey)))
      .map(([requestId, metrics]) => [requestId, cloneJsonLike(metrics)])
  );
  return {
    schemaVersion: DATA_SERVICE_SCHEMA_VERSION,
    updatedAt: lastUpdatedAt || 0,
    resources,
  };
}

ensureMapcreatorSnapshotGlobal();
registerMapcreatorSnapshotProvider("assets", "data_service", () => ({
  schemaVersion: DATA_SERVICE_SCHEMA_VERSION,
  runtimeAssetCount: Object.keys(RUNTIME_ASSET_URLS).length,
  runtimeAssets: cloneJsonLike(RUNTIME_ASSET_URLS),
  catalogEntryCount: catalogEntries.length,
  transportEntryCount: transportEntryByUrl.size,
}));
registerMapcreatorSnapshotProvider("loadStatus", "data_service", getStatusSnapshot);
registerMapcreatorSnapshotProvider("version", "data_service", () => ({
  schemaVersion: DATA_SERVICE_SCHEMA_VERSION,
  catalogVersion: Number(catalogPayload?.version || 0),
  catalogGeneratedAt: String(catalogPayload?.generated_at || ""),
}));
