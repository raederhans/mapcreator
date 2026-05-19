import { getTransportAsset } from "./data_service.js";
import { resolveTransportManifestUrl } from "./runtime_asset_registry.js";
import {
  MAIN_MAP_CONSUMER_KEYS_BY_FAMILY,
  createTransportPackSourceGateReport,
  getTargetMainMapPackMeta,
} from "./transport_pack_resolver.js";

function createEmptyOverlayState(status = "idle") {
  return {
    activePackId: "",
    activePackIdByFamily: {},
    family: "",
    status,
    collectionsByLayer: {},
    overlaysByFamily: {},
    sourceSignature: null,
    revision: 0,
    error: "",
  };
}

export function createDefaultTransportCountryOverlayState() {
  return createEmptyOverlayState("idle");
}

export function clearTransportCountryOverlayState(target, reason = "cleared") {
  if (!target || typeof target !== "object") return null;
  const previousRevision = Number(target.transportCountryOverlayState?.revision || 0);
  // clear 也要推进 revision，主图 renderer / 持久化读取方据此识别“已明确清空”，
  // 而不是把它和“还没初始化过 overlayState”混成同一种状态。
  target.transportCountryOverlayState = {
    ...createEmptyOverlayState("idle"),
    revision: previousRevision + 1,
    reason: String(reason || "cleared"),
  };
  return target.transportCountryOverlayState;
}

function getExistingOverlaysByFamily(overlayState = {}) {
  const overlaysByFamily = overlayState?.overlaysByFamily && typeof overlayState.overlaysByFamily === "object"
    ? { ...overlayState.overlaysByFamily }
    : {};
  // 兼容早期“单 family 顶层 overlayState”形态。
  // 读取时先把 legacy ready overlay 投影回 overlaysByFamily，后面的 apply/save 才能统一按 family 工作。
  const legacyFamily = String(overlayState?.family || "").trim().toLowerCase();
  if (overlayState?.status === "ready" && legacyFamily && overlayState?.collectionsByLayer && !overlaysByFamily[legacyFamily]) {
    overlaysByFamily[legacyFamily] = {
      ...overlayState,
      family: legacyFamily,
    };
  }
  return overlaysByFamily;
}

function getActivePackIdByFamily(overlaysByFamily = {}) {
  return Object.fromEntries(
    Object.entries(overlaysByFamily)
      .map(([familyId, overlay]) => [familyId, String(overlay?.activePackId || "").trim().toLowerCase()])
      .filter(([, packId]) => !!packId),
  );
}

function getPackPath(manifest, mode, key) {
  const path = manifest?.paths?.[mode]?.[key] || manifest?.paths?.preview?.[key] || "";
  if (!path) {
    throw new Error(`Transport country overlay manifest is missing ${mode}/${key}.`);
  }
  return path;
}

function decodeTopologyCollection(payload, objectName, topojsonClient = globalThis.topojson) {
  const object = payload?.objects?.[objectName];
  if (!object || !topojsonClient || typeof topojsonClient.feature !== "function") {
    throw new Error(`Transport country overlay topology is missing object ${objectName}.`);
  }
  const collection = topojsonClient.feature(payload, object);
  if (!Array.isArray(collection?.features)) {
    throw new Error(`Transport country overlay topology object ${objectName} did not decode to a FeatureCollection.`);
  }
  return collection;
}

async function loadLayerCollection({ manifest, mode, key, topojsonClient }) {
  const path = getPackPath(manifest, mode, key);
  const payload = await getTransportAsset(path, {
    cachePolicy: "no-cache",
    label: `transport-country-overlay:${key}:${mode}`,
  });
  if (key === "roads" || key === "railways") {
    return decodeTopologyCollection(payload, key, topojsonClient);
  }
  if (!Array.isArray(payload?.features)) {
    throw new Error(`Transport country overlay ${key} payload is not a FeatureCollection.`);
  }
  return {
    type: "FeatureCollection",
    features: payload.features,
  };
}

export async function loadTransportCountryOverlayState(packId, {
  mode = "full",
  topojsonClient = globalThis.topojson,
} = {}) {
  const meta = getTargetMainMapPackMeta(packId);
  if (!meta) {
    throw new Error(`Unknown transport country overlay pack: ${packId}`);
  }
  const manifestUrl = resolveTransportManifestUrl(meta.packId);
  const manifest = await getTransportAsset(manifestUrl, {
    cachePolicy: "no-cache",
    label: `transport-country-overlay-manifest:${meta.packId}`,
  });
  const gateReport = createTransportPackSourceGateReport(meta.packId, manifest);
  if (!gateReport.passed) {
    throw new Error(`Transport country overlay pack ${meta.packId} failed source gate: ${gateReport.reasons.join(", ")}`);
  }
  // 主图 overlay 只读取当前 family 真正会消费的 layer。
  // 这样 pack manifest 可以继续保留 preview/full 的完整描述，而主图 apply 只搬运自己需要的部分。
  const supportedKeys = MAIN_MAP_CONSUMER_KEYS_BY_FAMILY[meta.family] || [];
  const entries = await Promise.all(
    supportedKeys.map(async (key) => [key, await loadLayerCollection({ manifest, mode, key, topojsonClient })])
  );
  return {
    activePackId: meta.packId,
    family: meta.family,
    status: "ready",
    collectionsByLayer: Object.fromEntries(entries),
    sourceSignature: manifest.source_signature || null,
    sourcePolicy: manifest.source_policy || "",
    gateReport,
    manifest,
    revision: 0,
    error: "",
  };
}

export function applyTransportCountryOverlayState(target, overlayState) {
  if (!target || typeof target !== "object") return null;
  const previousRevision = Number(target.transportCountryOverlayState?.revision || 0);
  const family = String(overlayState?.family || "").trim().toLowerCase();
  if (!family) return target.transportCountryOverlayState || null;
  const revision = previousRevision + 1;
  const overlaysByFamily = getExistingOverlaysByFamily(target.transportCountryOverlayState);
  // 每次 Apply 只替换当前 family 的主图 overlay，其他 family 已应用的数据要原样保留。
  // 这样 road/rail/airport 可以各自独立切换，不会互相冲掉已加载状态。
  const nextFamilyOverlay = {
    ...overlayState,
    family,
    revision,
  };
  overlaysByFamily[family] = nextFamilyOverlay;
  target.transportCountryOverlayState = {
    ...nextFamilyOverlay,
    activePackIdByFamily: getActivePackIdByFamily(overlaysByFamily),
    overlaysByFamily,
    revision,
  };
  return target.transportCountryOverlayState;
}
