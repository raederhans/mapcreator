import runtimeAssetRegistry from "../../data/runtime_asset_registry.json" with { type: "json" };

export const RUNTIME_ASSET_REGISTRY = Object.freeze(runtimeAssetRegistry);
export const RUNTIME_ASSET_URLS = Object.freeze(
  Object.fromEntries(
    Object.entries(RUNTIME_ASSET_REGISTRY?.assets || {})
      .map(([assetKey, assetSpec]) => [assetKey, String(assetSpec?.url || "").trim()])
      .filter(([, url]) => !!url)
  )
);
export const TRANSPORT_MANIFEST_ASSET_KEYS = Object.freeze({
  ...((RUNTIME_ASSET_REGISTRY?.transport_manifest_keys && typeof RUNTIME_ASSET_REGISTRY.transport_manifest_keys === "object")
    ? RUNTIME_ASSET_REGISTRY.transport_manifest_keys
    : {}),
});

function normalizeRuntimeAssetKey(key) {
  return String(key || "").trim();
}

export function resolveDataAssetUrl(key) {
  const normalizedKey = normalizeRuntimeAssetKey(key);
  const url = RUNTIME_ASSET_URLS[normalizedKey];
  if (!url) {
    throw new Error(`[runtime_asset_registry] Unknown runtime data asset key: ${normalizedKey || "<empty>"}.`);
  }
  return url;
}

export function resolveScenarioRegistryUrl() {
  const scenarioRegistryKey = normalizeRuntimeAssetKey(RUNTIME_ASSET_REGISTRY?.scenario_registry_key || "scenario_registry");
  return resolveDataAssetUrl(scenarioRegistryKey);
}

export function resolveTransportManifestUrl(familyId) {
  const normalizedFamilyId = normalizeRuntimeAssetKey(familyId);
  const assetKey = TRANSPORT_MANIFEST_ASSET_KEYS[normalizedFamilyId];
  if (!assetKey) {
    throw new Error(`[runtime_asset_registry] Unknown transport manifest family: ${normalizedFamilyId || "<empty>"}.`);
  }
  return resolveDataAssetUrl(assetKey);
}
