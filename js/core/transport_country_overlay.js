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
    family: "",
    status,
    collectionsByLayer: {},
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
  target.transportCountryOverlayState = {
    ...createEmptyOverlayState("idle"),
    revision: previousRevision + 1,
    reason: String(reason || "cleared"),
  };
  return target.transportCountryOverlayState;
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
  target.transportCountryOverlayState = {
    ...overlayState,
    revision: previousRevision + 1,
  };
  return target.transportCountryOverlayState;
}
