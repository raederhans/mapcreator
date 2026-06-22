import defaultThematicLayerIndex from "../../data/thematic_layers/index.json" with { type: "json" };
import {
  resolveThematicLayerCatalogAssetKey,
  resolveThematicLayerManifestAssetKey,
} from "./runtime_asset_registry.js";

export const THEMATIC_LAYER_RENDER_DISABLED_REASON = "Runtime rendering disabled";
export const THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON = "Real source not ingested";
export const THEMATIC_CATALOG_PENDING_SUMMARY = "Preview metadata pending";
export const THEMATIC_CATALOG_READY_SUMMARY = "Preview metadata available";
export const THEMATIC_SOURCE_POLICY_FIXTURE_ONLY = "fixture_only";

function freezeArray(values = []) {
  return Object.freeze([...(Array.isArray(values) ? values : [])]);
}

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

async function getAsset(key, options = {}) {
  const dataService = await import("./data_service.js");
  return dataService.getAsset(key, options);
}

function normalizeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLegend(value) {
  return Object.freeze({
    ...((value && typeof value === "object" && !Array.isArray(value)) ? value : {}),
  });
}

function normalizeDefaultStyle(value = {}) {
  const style = value && typeof value === "object" ? value : {};
  return Object.freeze({
    renderer: normalizeText(style.renderer, "unknown"),
    palette: normalizeText(style.palette, "unknown"),
    opacity: normalizeNumber(style.opacity, null),
    neutralValue: style.neutral_value ?? null,
  });
}

function normalizeManifestCoverageScope(value = {}) {
  const scope = value && typeof value === "object" ? value : {};
  return Object.freeze({
    geographyLevel: normalizeText(scope.geography_level, "unknown"),
    joinKeyType: normalizeText(scope.join_key_type, "unknown"),
    featureCount: normalizeNumber(scope.feature_count, null),
  });
}

function normalizePaths(value = {}) {
  const paths = value && typeof value === "object" ? value : {};
  return Object.freeze({
    metrics: normalizeText(paths.metrics),
    grid: normalizeText(paths.grid),
    buildAudit: normalizeText(paths.build_audit),
    sourceRecipes: freezeArray(paths.source_recipes),
  });
}

function createPayloadKind(layer = {}, manifest = null) {
  const paths = normalizePaths(manifest?.paths);
  const geometryKind = normalizeText(layer.geometry_kind || manifest?.geometry_kind);
  if (paths.metrics) return "Admin metrics available";
  if (paths.grid) return "Grid payload available";
  if (geometryKind.includes("grid")) return "Grid metadata available";
  return "Manifest metadata available";
}

function createSummaryText({
  statusLabel,
  sourcePolicyLabel,
  payloadKind,
  hiddenByDefault,
}) {
  return [
    statusLabel,
    sourcePolicyLabel,
    payloadKind,
    THEMATIC_LAYER_RENDER_DISABLED_REASON,
    hiddenByDefault ? "Hidden by default" : "Visible by default",
  ]
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(" | ");
}

function normalizeLayerSummary(layer = {}, {
  manifest = null,
  sourcePolicyLegend = {},
  statusLegend = {},
} = {}) {
  const layerId = normalizeText(layer.layer_id || manifest?.layer_id);
  const sourcePolicy = normalizeText(layer.source_policy || manifest?.source_policy, THEMATIC_SOURCE_POLICY_FIXTURE_ONLY);
  const status = normalizeText(layer.status || manifest?.status, "fixture");
  const defaultStyle = normalizeDefaultStyle(layer.default_style);
  const manifestCoverageScope = normalizeManifestCoverageScope(manifest?.coverage_scope);
  const featureCount = normalizeNumber(
    manifest?.feature_counts?.features ?? manifestCoverageScope.featureCount,
    null,
  );
  const payloadKind = createPayloadKind(layer, manifest);
  const hiddenByDefault = layer.default_visible !== true;
  const statusLabel = normalizeText(statusLegend[status], status);
  const sourcePolicyLabel = normalizeText(sourcePolicyLegend[sourcePolicy], sourcePolicy);
  const summary = createSummaryText({
    statusLabel,
    sourcePolicyLabel,
    payloadKind,
    hiddenByDefault,
  });
  const fixtureOnly = sourcePolicy === THEMATIC_SOURCE_POLICY_FIXTURE_ONLY || status === "fixture";
  return Object.freeze({
    id: layerId,
    layerId,
    theme: normalizeText(layer.theme || manifest?.theme, "thematic"),
    title: normalizeText(layer.title || manifest?.title, layerId || "Thematic layer"),
    description: normalizeText(layer.description || manifest?.description),
    geometryKind: normalizeText(layer.geometry_kind || manifest?.geometry_kind, "unknown"),
    manifestPath: normalizeText(layer.manifest_path),
    manifestLoaded: !!manifest,
    manifestRuntimeStatus: normalizeText(manifest?.runtime_consumer?.status, "catalog_only"),
    sourcePolicy,
    sourcePolicyLabel,
    status,
    statusLabel,
    coverageScope: normalizeText(layer.coverage_scope),
    manifestCoverageScope,
    featureCount,
    defaultVisible: layer.default_visible === true,
    hiddenByDefault,
    defaultStyle,
    renderer: defaultStyle.renderer,
    palette: defaultStyle.palette,
    opacity: defaultStyle.opacity,
    payloadKind,
    paths: normalizePaths(manifest?.paths),
    metricIds: freezeArray(manifest?.metric_ids),
    limitations: freezeArray(manifest?.limitations),
    fixtureOnly,
    supportsRuntimePreview: true,
    supportsMainMapRender: false,
    disabledReason: THEMATIC_LAYER_RENDER_DISABLED_REASON,
    realSourceStatus: THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON,
    summary,
  });
}

export function createEmptyThematicLayerCatalogPreview({
  status = "idle",
  error = "",
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    generatedAt: "",
    assetKey: "",
    status: normalizeText(status, "idle"),
    error: normalizeText(error),
    layerCount: 0,
    loadedManifestCount: 0,
    sourcePolicyLegend: Object.freeze({}),
    statusLegend: Object.freeze({}),
    layers: Object.freeze([]),
    summary: normalizeText(error, THEMATIC_CATALOG_PENDING_SUMMARY),
  });
}

export function normalizeThematicLayerCatalogPayload(payload = defaultThematicLayerIndex, {
  assetKey = "",
  manifestByLayerId = {},
  status = "ready",
} = {}) {
  const catalog = payload && typeof payload === "object" ? payload : {};
  const sourcePolicyLegend = normalizeLegend(catalog.source_policy_legend);
  const statusLegend = normalizeLegend(catalog.status_legend);
  const manifestLookup = manifestByLayerId && typeof manifestByLayerId === "object" ? manifestByLayerId : {};
  const layers = (Array.isArray(catalog.layers) ? catalog.layers : [])
    .map((layer) => normalizeLayerSummary(layer, {
      manifest: manifestLookup[normalizeText(layer?.layer_id)] || null,
      sourcePolicyLegend,
      statusLegend,
    }))
    .filter((layer) => !!layer.layerId);
  const loadedManifestCount = layers.filter((layer) => layer.manifestLoaded).length;
  return Object.freeze({
    schemaVersion: normalizeNumber(catalog.schema_version, 1),
    generatedAt: normalizeText(catalog.generated_at),
    assetKey: normalizeText(assetKey),
    status: normalizeText(status, "ready"),
    error: "",
    layerCount: layers.length,
    loadedManifestCount,
    sourcePolicyLegend,
    statusLegend,
    layers: Object.freeze(layers),
    summary: `${THEMATIC_CATALOG_READY_SUMMARY} | ${layers.length} layers | ${THEMATIC_LAYER_RENDER_DISABLED_REASON}`,
  });
}

export function listDefaultThematicLayerSummaries() {
  // Synchronous panel contracts need a generated snapshot; runtime loading below still uses registry asset keys.
  return normalizeThematicLayerCatalogPayload(defaultThematicLayerIndex).layers;
}

export async function loadThematicLayerCatalogPreview({
  loadAsset = null,
} = {}) {
  const assetLoader = typeof loadAsset === "function" ? loadAsset : getAsset;
  const assetKey = resolveThematicLayerCatalogAssetKey();
  const catalog = await assetLoader(assetKey);
  const layers = Array.isArray(catalog?.layers) ? catalog.layers : [];
  const manifestEntries = await Promise.all(layers.map(async (layer) => {
    const layerId = normalizeText(layer?.layer_id);
    const manifestAssetKey = resolveThematicLayerManifestAssetKey(layerId);
    const manifest = await assetLoader(manifestAssetKey);
    return [layerId, manifest];
  }));
  return normalizeThematicLayerCatalogPayload(catalog, {
    assetKey,
    manifestByLayerId: Object.fromEntries(manifestEntries),
    status: "ready",
  });
}
