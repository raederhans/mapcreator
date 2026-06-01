import { resolveTransportManifestUrl } from "../core/data_loader.js";
import { getTransportAsset } from "../core/data_service.js";
import { registerMapcreatorSnapshotProvider } from "../core/mapcreator_snapshot.js";

const MANIFEST_URLS = {
  mineral_resources: resolveTransportManifestUrl("mineral_resources"),
  energy_facilities: resolveTransportManifestUrl("energy_facilities"),
  industrial_zones: resolveTransportManifestUrl("industrial_zones"),
  logistics_hubs: resolveTransportManifestUrl("logistics_hubs"),
};

const MANIFEST_ONLY_FAMILIES = new Set(Object.keys(MANIFEST_URLS));

const familyState = new Map();

function createEmptyState() {
  return {
    status: "idle",
    error: null,
    manifest: null,
    audit: null,
    subtypeCatalog: null,
    stats: {},
    packMode: null,
    previewStatus: "idle",
    fullStatus: "idle",
    selected: null,
  };
}

function getFamilyState(familyId) {
  // manifest-only family 没有本地 geometry pack；这里缓存 manifest/audit/subtype，供 inspector 与快照读取同一状态。
  const normalizedFamilyId = String(familyId || "").trim();
  if (!familyState.has(normalizedFamilyId)) {
    familyState.set(normalizedFamilyId, {
      snapshot: createEmptyState(),
      manifestPromise: null,
      auditPromise: null,
      subtypeCatalogPromise: null,
    });
  }
  return familyState.get(normalizedFamilyId);
}

async function startManifestOnlyPreviewLoad(familyId) {
  // 404 代表这个 manifest-only family 还在预留阶段，状态写成 pending 让 UI 显示“未接线”的真实进度。
  const normalizedFamilyId = String(familyId || "").trim();
  if (!MANIFEST_ONLY_FAMILIES.has(normalizedFamilyId)) return createEmptyState();
  const previewRuntime = getFamilyState(normalizedFamilyId);
  if (!previewRuntime.manifestPromise) {
    previewRuntime.snapshot.status = "loading";
    previewRuntime.snapshot.previewStatus = "loading";
    previewRuntime.snapshot.error = null;
    previewRuntime.manifestPromise = getTransportAsset(MANIFEST_URLS[normalizedFamilyId], {
      cachePolicy: "no-cache",
      label: `transport-manifest:${normalizedFamilyId}`,
    })
      .then(async (manifest) => {
        if (!manifest) {
          previewRuntime.snapshot = {
            ...createEmptyState(),
            status: "pending",
            previewStatus: "pending",
            fullStatus: "pending",
          };
          return previewRuntime.snapshot;
        }
        previewRuntime.snapshot.manifest = manifest;
        previewRuntime.snapshot.stats = manifest?.feature_counts || {};
        previewRuntime.snapshot.status = "ready";
        previewRuntime.snapshot.previewStatus = "ready";
        previewRuntime.snapshot.fullStatus = "ready";

        const auditPath = manifest?.paths?.build_audit;
        if (auditPath && !previewRuntime.auditPromise) {
          previewRuntime.auditPromise = getTransportAsset(auditPath, {
            cachePolicy: "no-cache",
            label: `transport-audit:${normalizedFamilyId}`,
          })
            .then((audit) => {
              previewRuntime.snapshot.audit = audit;
              return audit;
            })
            .catch((error) => {
              console.warn(`[transport-workbench] Failed to load ${normalizedFamilyId} audit.`, error);
              return null;
            });
        }

        const subtypeCatalogPath = manifest?.paths?.subtype_catalog;
        if (subtypeCatalogPath && !previewRuntime.subtypeCatalogPromise) {
          previewRuntime.subtypeCatalogPromise = getTransportAsset(subtypeCatalogPath, {
            cachePolicy: "no-cache",
            label: `transport-subtype-catalog:${normalizedFamilyId}`,
          })
            .then((catalog) => {
              previewRuntime.snapshot.subtypeCatalog = Array.isArray(catalog) ? catalog : null;
              return previewRuntime.snapshot.subtypeCatalog;
            })
            .catch((error) => {
              console.warn(`[transport-workbench] Failed to load ${normalizedFamilyId} subtype catalog.`, error);
              return null;
            });
        }

        return previewRuntime.snapshot;
      })
      .catch((error) => {
        if (Number(error?.httpStatus || 0) === 404) {
          previewRuntime.snapshot = {
            ...createEmptyState(),
            status: "pending",
            previewStatus: "pending",
            fullStatus: "pending",
          };
          return previewRuntime.snapshot;
        }
        previewRuntime.snapshot.status = "error";
        previewRuntime.snapshot.previewStatus = "error";
        previewRuntime.snapshot.fullStatus = "error";
        previewRuntime.snapshot.error = error instanceof Error ? error.message : String(error);
        throw error;
      });
  }
  return previewRuntime.manifestPromise;
}

export function isManifestOnlyFamily(familyId) {
  return MANIFEST_ONLY_FAMILIES.has(String(familyId || "").trim());
}

export async function renderJapanManifestOnlyFamilyPreview(familyId) {
  return startManifestOnlyPreviewLoad(familyId);
}

export async function warmJapanManifestOnlyFamilyPreview(familyId) {
  return startManifestOnlyPreviewLoad(familyId);
}

export function getJapanManifestOnlyFamilyPreviewSnapshot(familyId) {
  return { ...getFamilyState(familyId).snapshot };
}

export function clearJapanManifestOnlyFamilyPreview(familyId) {
  const previewRuntime = getFamilyState(familyId);
  previewRuntime.snapshot = {
    ...previewRuntime.snapshot,
    selected: null,
  };
}

export function destroyJapanManifestOnlyFamilyPreview(familyId) {
  const normalizedFamilyId = String(familyId || "").trim();
  if (!familyState.has(normalizedFamilyId)) return;
  const previewRuntime = familyState.get(normalizedFamilyId);
  previewRuntime.snapshot = createEmptyState();
  familyState.delete(normalizedFamilyId);
}

Array.from(MANIFEST_ONLY_FAMILIES)
  .sort((left, right) => left.localeCompare(right))
  .forEach((familyId) => {
    registerMapcreatorSnapshotProvider("loadStatus", `transport_preview_manifest:${familyId}`, () => (
      getJapanManifestOnlyFamilyPreviewSnapshot(familyId)
    ));
  });
