import {
  getAsset,
  getCatalogAsset,
  getCatalogAssetMetadata,
} from "./data_service.js";
import { resolveThematicLayerManifestAssetKey } from "./runtime_asset_registry.js";

export const THEMATIC_ADMIN_METRICS_CATALOG_ROLE = "thematic_admin_metrics";
export const THEMATIC_ADMIN_METRICS_SCHEMA_VERSION = 1;

export const THEMATIC_ADMIN_METRICS_REASON = Object.freeze({
  ADMIN_METRICS_UNAVAILABLE: "admin_metrics_unavailable",
  MANIFEST_LOAD_FAILED: "manifest_load_failed",
  METRIC_VALUE_MISSING: "metric_value_missing",
  METRICS_PATH_NOT_ALLOWLISTED: "metrics_path_not_allowlisted",
  METRICS_PAYLOAD_INVALID: "metrics_payload_invalid",
  METRICS_PAYLOAD_LOAD_FAILED: "metrics_payload_load_failed",
  PAYLOAD_FEATURE_COUNT_MISMATCH: "payload_feature_count_mismatch",
  PAYLOAD_JOIN_CONTRACT_MISMATCH: "payload_join_contract_mismatch",
  PAYLOAD_LAYER_MISMATCH: "payload_layer_mismatch",
  PAYLOAD_METRIC_IDS_MISMATCH: "payload_metric_ids_mismatch",
  UNKNOWN_JOIN_KEY: "unknown_join_key",
  UNKNOWN_LAYER_ID: "unknown_layer_id",
  UNKNOWN_METRIC_ID: "unknown_metric_id",
  UNSUPPORTED_GEOMETRY_KIND: "unsupported_geometry_kind",
});

const SUPPORTED_ADMIN_GEOMETRY_KINDS = Object.freeze(["admin0", "admin1", "admin2"]);
const MISSING_SOURCE_STATUSES = Object.freeze([
  "missing",
  "not_applicable",
  "partial_source_gap",
  "source_gap",
  "unmatched",
]);

function freezeArray(values = []) {
  return Object.freeze([...(Array.isArray(values) ? values : [])]);
}

function freezeJsonValue(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeJsonValue));
  }
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, freezeJsonValue(entryValue)]),
    ));
  }
  return value;
}

function freezeJsonObject(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Object.freeze({});
  return freezeJsonValue(value);
}

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMetricId(value) {
  return normalizeText(value);
}

function normalizeJoinKey(value) {
  return normalizeText(value);
}

function normalizeStringList(values = []) {
  return freezeArray(
    (Array.isArray(values) ? values : [])
      .map(normalizeText)
      .filter(Boolean),
  );
}

function listsEqual(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function createThematicAdminMetricsError(reason, message, extra = {}) {
  const error = new Error(message);
  error.code = reason;
  error.reason = reason;
  Object.assign(error, extra);
  return error;
}

function isThematicAdminMetricsError(error) {
  return Object.values(THEMATIC_ADMIN_METRICS_REASON).includes(String(error?.reason || error?.code || ""));
}

function assertPayloadObject(payload, reason, label) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload;
  throw createThematicAdminMetricsError(
    reason,
    `[thematic_admin_metrics_loader] ${label} must be an object.`,
    { payloadType: typeof payload },
  );
}

function assertSchemaVersion(payload, label, reason, layerId = "") {
  const schemaVersion = normalizeNumber(payload?.schema_version, null);
  if (schemaVersion === THEMATIC_ADMIN_METRICS_SCHEMA_VERSION) return schemaVersion;
  throw createThematicAdminMetricsError(
    reason,
    `[thematic_admin_metrics_loader] ${label} schema_version must be ${THEMATIC_ADMIN_METRICS_SCHEMA_VERSION}.`,
    {
      layerId,
      schemaVersion,
      expectedSchemaVersion: THEMATIC_ADMIN_METRICS_SCHEMA_VERSION,
    },
  );
}

function normalizeMetricIds(payload) {
  const metricIds = normalizeStringList(payload?.metric_ids);
  if (!metricIds.length) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
      "[thematic_admin_metrics_loader] metrics payload must include metric_ids.",
      { layerId: normalizeText(payload?.layer_id) },
    );
  }
  return metricIds;
}

function assertUniqueFeatureJoinKeys(rawFeatures, layerId) {
  const seenJoinKeys = new Set();
  rawFeatures.forEach((feature, index) => {
    const joinKey = normalizeJoinKey(feature?.join_key);
    if (!joinKey) {
      throw createThematicAdminMetricsError(
        THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
        `[thematic_admin_metrics_loader] feature ${index} in ${layerId || "<unknown>"} must include join_key.`,
        { layerId, featureIndex: index },
      );
    }
    if (seenJoinKeys.has(joinKey)) {
      throw createThematicAdminMetricsError(
        THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
        `[thematic_admin_metrics_loader] duplicate join_key ${joinKey} in ${layerId || "<unknown>"}.`,
        { layerId, featureIndex: index, joinKey },
      );
    }
    seenJoinKeys.add(joinKey);
  });
}

function isMissingMetricValue(metricValue = {}) {
  const sourceStatus = normalizeText(metricValue.source_status);
  if (MISSING_SOURCE_STATUSES.includes(sourceStatus)) return true;
  return metricValue.raw_value === null || metricValue.normalized_value === null;
}

function deriveFeatureCoverageStatus(values, metricIds) {
  const presentValues = metricIds
    .map((metricId) => values[metricId])
    .filter((metricValue) => metricValue && typeof metricValue === "object");
  if (!presentValues.length) return "missing";
  const missingCount = presentValues.filter(isMissingMetricValue).length;
  if (missingCount === presentValues.length) return "missing";
  if (missingCount > 0 || presentValues.length < metricIds.length) return "partial";
  return "complete";
}

function normalizeMetricValue(metricValue = {}) {
  const metric = metricValue && typeof metricValue === "object" ? metricValue : {};
  return Object.freeze({
    rawValue: metric.raw_value ?? null,
    normalizedValue: metric.normalized_value ?? null,
    year: normalizeNumber(metric.year, null),
    unit: normalizeText(metric.unit),
    sourceStatus: normalizeText(metric.source_status),
    notes: normalizeText(metric.notes),
    uncertainty: freezeJsonObject(metric.uncertainty),
    sourceCountryCode: normalizeText(metric.source_country_code),
    sourceRowRef: normalizeText(metric.source_row_ref),
    sourceRowRefs: freezeJsonObject(metric.source_row_refs),
  });
}

function normalizeFeature(feature = {}, metricIds = []) {
  const rawValues = feature?.values && typeof feature.values === "object" ? feature.values : {};
  const values = Object.fromEntries(
    metricIds.map((metricId) => [metricId, normalizeMetricValue(rawValues[metricId])]),
  );
  const coverageStatus = normalizeText(
    feature.coverage_status,
    deriveFeatureCoverageStatus(rawValues, metricIds),
  );
  const joinKey = normalizeJoinKey(feature.join_key);
  return Object.freeze({
    joinKey,
    name: normalizeText(feature.name),
    coverageStatus,
    sourceCountryCodes: normalizeStringList(feature.source_country_codes),
    sourceRowRefs: freezeJsonObject(feature.source_row_refs),
    values: Object.freeze(values),
  });
}

function createCoverageCounts(features = []) {
  const counts = {
    features: features.length,
    complete: 0,
    partial: 0,
    missing: 0,
  };
  features.forEach((feature) => {
    const status = normalizeText(feature.coverageStatus);
    if (status === "complete") {
      counts.complete += 1;
    } else if (status === "partial") {
      counts.partial += 1;
    } else if (status === "missing") {
      counts.missing += 1;
    }
  });
  return Object.freeze(counts);
}

export function normalizeThematicAdminMetricsPayload(payload, options = {}) {
  const metricsPayload = assertPayloadObject(
    payload,
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
    "metrics payload",
  );
  const rawFeatures = Array.isArray(metricsPayload.features) ? metricsPayload.features : null;
  if (!rawFeatures) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
      "[thematic_admin_metrics_loader] metrics payload must include features.",
      { layerId: normalizeText(metricsPayload.layer_id) },
    );
  }
  if (!rawFeatures.length) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
      "[thematic_admin_metrics_loader] metrics payload must include at least one feature.",
      { layerId: normalizeText(metricsPayload.layer_id) },
    );
  }
  const schemaVersion = assertSchemaVersion(
    metricsPayload,
    "metrics payload",
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
    normalizeText(metricsPayload.layer_id),
  );
  const metricIds = normalizeMetricIds(metricsPayload);
  const layerId = normalizeText(options.layerId || metricsPayload.layer_id);
  assertUniqueFeatureJoinKeys(rawFeatures, layerId);
  const features = freezeArray(
    rawFeatures.map((feature) => normalizeFeature(feature, metricIds)),
  );
  const featureByJoinKey = Object.freeze(Object.fromEntries(
    features.map((feature) => [feature.joinKey, feature]),
  ));
  return Object.freeze({
    schemaVersion,
    layerId,
    geographyLevel: normalizeText(metricsPayload.geography_level),
    joinKeyType: normalizeText(metricsPayload.join_key_type),
    metricIds,
    featureCount: features.length,
    coverageCounts: createCoverageCounts(features),
    features,
    featureByJoinKey,
  });
}

export function createThematicAdminMetricLookup(payload, options = {}) {
  return normalizeThematicAdminMetricsPayload(payload, options);
}

function createMissingMetricResult(lookup, joinKey, metricId, reason) {
  return Object.freeze({
    found: false,
    layerId: normalizeText(lookup?.layerId),
    joinKey: normalizeJoinKey(joinKey),
    metricId: normalizeMetricId(metricId),
    rawValue: null,
    normalizedValue: null,
    year: null,
    unit: "",
    sourceStatus: "",
    notes: "",
    uncertainty: Object.freeze({}),
    sourceCountryCode: "",
    sourceRowRef: "",
    sourceRowRefs: Object.freeze({}),
    coverageStatus: "",
    missing: true,
    reason,
  });
}

export function getThematicAdminMetricValue(lookup, joinKey, metricId) {
  const normalizedJoinKey = normalizeJoinKey(joinKey);
  const normalizedMetricId = normalizeMetricId(metricId);
  const feature = lookup?.featureByJoinKey?.[normalizedJoinKey] || null;
  if (!feature) {
    return createMissingMetricResult(
      lookup,
      normalizedJoinKey,
      normalizedMetricId,
      THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_JOIN_KEY,
    );
  }
  const metricValue = feature.values?.[normalizedMetricId] || null;
  if (!metricValue || !(lookup?.metricIds || []).includes(normalizedMetricId)) {
    return createMissingMetricResult(
      lookup,
      normalizedJoinKey,
      normalizedMetricId,
      THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_METRIC_ID,
    );
  }
  const missing = isMissingMetricValue({
    raw_value: metricValue.rawValue,
    normalized_value: metricValue.normalizedValue,
    source_status: metricValue.sourceStatus,
  });
  return Object.freeze({
    found: true,
    layerId: normalizeText(lookup.layerId),
    joinKey: normalizedJoinKey,
    metricId: normalizedMetricId,
    rawValue: missing ? null : metricValue.rawValue,
    normalizedValue: missing ? null : metricValue.normalizedValue,
    year: metricValue.year,
    unit: metricValue.unit,
    sourceStatus: metricValue.sourceStatus,
    notes: metricValue.notes,
    uncertainty: metricValue.uncertainty,
    sourceCountryCode: metricValue.sourceCountryCode,
    sourceRowRef: metricValue.sourceRowRef,
    sourceRowRefs: metricValue.sourceRowRefs,
    coverageStatus: feature.coverageStatus,
    missing,
    reason: missing ? THEMATIC_ADMIN_METRICS_REASON.METRIC_VALUE_MISSING : "",
  });
}

export function getThematicAdminFeatureMetrics(lookup, joinKey) {
  const normalizedJoinKey = normalizeJoinKey(joinKey);
  const feature = lookup?.featureByJoinKey?.[normalizedJoinKey] || null;
  if (!feature) {
    return Object.freeze({
      found: false,
      layerId: normalizeText(lookup?.layerId),
      joinKey: normalizedJoinKey,
      coverageStatus: "",
      metrics: Object.freeze({}),
      reason: THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_JOIN_KEY,
    });
  }
  const metrics = Object.freeze(Object.fromEntries(
    lookup.metricIds.map((metricId) => [
      metricId,
      getThematicAdminMetricValue(lookup, normalizedJoinKey, metricId),
    ]),
  ));
  return Object.freeze({
    found: true,
    layerId: normalizeText(lookup.layerId),
    joinKey: normalizedJoinKey,
    coverageStatus: feature.coverageStatus,
    metrics,
    reason: "",
  });
}

export function listThematicAdminMetricIds(lookup) {
  return freezeArray(lookup?.metricIds);
}

export function getThematicAdminCoverageSummary(lookup) {
  return Object.freeze({
    layerId: normalizeText(lookup?.layerId),
    features: normalizeNumber(lookup?.coverageCounts?.features, 0),
    complete: normalizeNumber(lookup?.coverageCounts?.complete, 0),
    partial: normalizeNumber(lookup?.coverageCounts?.partial, 0),
    missing: normalizeNumber(lookup?.coverageCounts?.missing, 0),
  });
}

function normalizeManifestLoadError(error, layerId) {
  if (isThematicAdminMetricsError(error)) return error;
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const reason = code === "unknown-asset-key" || message.includes("Unknown thematic layer manifest")
    ? THEMATIC_ADMIN_METRICS_REASON.UNKNOWN_LAYER_ID
    : THEMATIC_ADMIN_METRICS_REASON.MANIFEST_LOAD_FAILED;
  return createThematicAdminMetricsError(
    reason,
    `[thematic_admin_metrics_loader] failed to load thematic layer manifest for ${layerId || "<empty>"}.`,
    { layerId, cause: error },
  );
}

export async function loadThematicLayerManifest(layerId, options = {}) {
  const normalizedLayerId = normalizeText(layerId);
  try {
    if (typeof options.loadManifest === "function") {
      return await options.loadManifest(normalizedLayerId, options);
    }
    const resolveManifestAssetKey = typeof options.resolveManifestAssetKey === "function"
      ? options.resolveManifestAssetKey
      : resolveThematicLayerManifestAssetKey;
    const loadAsset = typeof options.loadAsset === "function" ? options.loadAsset : getAsset;
    const manifestAssetKey = resolveManifestAssetKey(normalizedLayerId);
    return await loadAsset(manifestAssetKey, {
      ...options,
      label: options.label || `thematic-layer-manifest:${normalizedLayerId}`,
    });
  } catch (error) {
    throw normalizeManifestLoadError(error, normalizedLayerId);
  }
}

function assertSupportedManifest(manifest, layerId) {
  const normalizedLayerId = normalizeText(layerId);
  const manifestLayerId = normalizeText(manifest?.layer_id);
  assertSchemaVersion(
    manifest,
    "thematic layer manifest",
    THEMATIC_ADMIN_METRICS_REASON.MANIFEST_LOAD_FAILED,
    manifestLayerId || normalizedLayerId,
  );
  if (!manifestLayerId || manifestLayerId !== normalizedLayerId) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_LAYER_MISMATCH,
      `[thematic_admin_metrics_loader] requested layer_id ${normalizedLayerId || "<empty>"} does not match manifest layer_id ${manifestLayerId || "<empty>"}.`,
      { layerId: normalizedLayerId, manifestLayerId },
    );
  }
  const geometryKind = normalizeText(manifest?.geometry_kind);
  if (!SUPPORTED_ADMIN_GEOMETRY_KINDS.includes(geometryKind)) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.UNSUPPORTED_GEOMETRY_KIND,
      `[thematic_admin_metrics_loader] ${manifestLayerId} has unsupported geometry_kind=${geometryKind || "<empty>"}.`,
      { layerId: manifestLayerId, geometryKind },
    );
  }
  const metricsPath = normalizeText(manifest?.paths?.metrics);
  if (!metricsPath) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.ADMIN_METRICS_UNAVAILABLE,
      `[thematic_admin_metrics_loader] ${manifestLayerId} does not declare paths.metrics.`,
      { layerId: manifestLayerId },
    );
  }
  return Object.freeze({
    layerId: manifestLayerId,
    metricsPath,
    geometryKind,
    metricIds: normalizeStringList(manifest?.metric_ids),
    geographyLevel: normalizeText(manifest?.coverage_scope?.geography_level),
    joinKeyType: normalizeText(manifest?.coverage_scope?.join_key_type),
    featureCount: normalizeNumber(
      manifest?.coverage_scope?.feature_count ?? manifest?.feature_counts?.features,
      null,
    ),
  });
}

function assertCatalogEntryForMetricsPath(metricsPath, options = {}) {
  const metadataReader = typeof options.getCatalogAssetMetadata === "function"
    ? options.getCatalogAssetMetadata
    : getCatalogAssetMetadata;
  const metadata = metadataReader(metricsPath);
  if (!metadata) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.METRICS_PATH_NOT_ALLOWLISTED,
      `[thematic_admin_metrics_loader] metrics path is not allowlisted: ${metricsPath || "<empty>"}.`,
      { metricsPath },
    );
  }
  if (metadata.role !== THEMATIC_ADMIN_METRICS_CATALOG_ROLE || metadata.readMode !== "json") {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.ADMIN_METRICS_UNAVAILABLE,
      `[thematic_admin_metrics_loader] metrics path is not a thematic admin metrics asset: ${metricsPath}.`,
      { metricsPath, metadata },
    );
  }
  return metadata;
}

async function loadMetricsPayload(metricsPath, manifest, options = {}) {
  try {
    if (typeof options.loadMetrics === "function") {
      return await options.loadMetrics(metricsPath, manifest, options);
    }
    const loadCatalogAsset = typeof options.loadCatalogAsset === "function"
      ? options.loadCatalogAsset
      : getCatalogAsset;
    return await loadCatalogAsset(metricsPath, {
      ...options,
      label: options.label || `thematic-admin-metrics:${manifest.layerId}`,
    });
  } catch (error) {
    const code = String(error?.code || error?.reason || "");
    const reason = code === "catalog-path-not-allowed"
      ? THEMATIC_ADMIN_METRICS_REASON.METRICS_PATH_NOT_ALLOWLISTED
      : THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_LOAD_FAILED;
    throw createThematicAdminMetricsError(
      reason,
      `[thematic_admin_metrics_loader] failed to load admin metrics payload for ${manifest.layerId}.`,
      { layerId: manifest.layerId, metricsPath, cause: error },
    );
  }
}

function assertPayloadMatchesManifest(metricsPayload, manifestInfo) {
  const payload = assertPayloadObject(
    metricsPayload,
    THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
    "metrics payload",
  );
  const payloadLayerId = normalizeText(payload.layer_id);
  if (payloadLayerId !== manifestInfo.layerId) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_LAYER_MISMATCH,
      `[thematic_admin_metrics_loader] manifest layer_id ${manifestInfo.layerId} does not match metrics layer_id ${payloadLayerId || "<empty>"}.`,
      { layerId: manifestInfo.layerId, payloadLayerId },
    );
  }
  const payloadMetricIds = normalizeMetricIds(payload);
  if (!listsEqual(manifestInfo.metricIds, payloadMetricIds)) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_METRIC_IDS_MISMATCH,
      `[thematic_admin_metrics_loader] manifest metric_ids do not match payload metric_ids for ${manifestInfo.layerId}.`,
      {
        layerId: manifestInfo.layerId,
        manifestMetricIds: manifestInfo.metricIds,
        payloadMetricIds,
      },
    );
  }
  const payloadGeographyLevel = normalizeText(payload.geography_level);
  const payloadJoinKeyType = normalizeText(payload.join_key_type);
  if (
    manifestInfo.geographyLevel !== payloadGeographyLevel
    || manifestInfo.joinKeyType !== payloadJoinKeyType
  ) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_JOIN_CONTRACT_MISMATCH,
      `[thematic_admin_metrics_loader] manifest join contract does not match payload for ${manifestInfo.layerId}.`,
      {
        layerId: manifestInfo.layerId,
        manifestGeographyLevel: manifestInfo.geographyLevel,
        payloadGeographyLevel,
        manifestJoinKeyType: manifestInfo.joinKeyType,
        payloadJoinKeyType,
      },
    );
  }
  const rawFeatures = Array.isArray(payload.features) ? payload.features : null;
  if (!rawFeatures) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.METRICS_PAYLOAD_INVALID,
      "[thematic_admin_metrics_loader] metrics payload must include features.",
      { layerId: manifestInfo.layerId },
    );
  }
  if (manifestInfo.featureCount !== null && manifestInfo.featureCount !== rawFeatures.length) {
    throw createThematicAdminMetricsError(
      THEMATIC_ADMIN_METRICS_REASON.PAYLOAD_FEATURE_COUNT_MISMATCH,
      `[thematic_admin_metrics_loader] manifest feature count does not match payload features for ${manifestInfo.layerId}.`,
      {
        layerId: manifestInfo.layerId,
        manifestFeatureCount: manifestInfo.featureCount,
        payloadFeatureCount: rawFeatures.length,
      },
    );
  }
  return payload;
}

export async function loadThematicAdminMetrics(layerId, options = {}) {
  const normalizedLayerId = normalizeText(layerId);
  const manifest = assertPayloadObject(
    await loadThematicLayerManifest(normalizedLayerId, options),
    THEMATIC_ADMIN_METRICS_REASON.MANIFEST_LOAD_FAILED,
    "thematic layer manifest",
  );
  const manifestInfo = assertSupportedManifest(manifest, normalizedLayerId);
  assertCatalogEntryForMetricsPath(manifestInfo.metricsPath, options);
  const metricsPayload = await loadMetricsPayload(manifestInfo.metricsPath, manifestInfo, options);
  const checkedPayload = assertPayloadMatchesManifest(metricsPayload, manifestInfo);
  return createThematicAdminMetricLookup(checkedPayload, {
    ...options,
    layerId: manifestInfo.layerId,
  });
}
