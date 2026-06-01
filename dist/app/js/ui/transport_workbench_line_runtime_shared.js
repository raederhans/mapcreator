import { getTransportAsset } from "../core/data_service.js";
import { registerMapcreatorSnapshotProvider } from "../core/mapcreator_snapshot.js";

export const PACK_MODE_PREVIEW = "preview";
export const PACK_MODE_FULL = "full";

function createInitialLoadState() {
  return {
    status: "idle",
    error: null,
    manifest: null,
    audit: null,
    previewStatus: "idle",
    fullStatus: "idle",
  };
}

export function getTransportWorkbenchPackPath(manifest, mode, key) {
  const modePaths = manifest?.paths?.[mode];
  let packPath = "";
  if (modePaths && typeof modePaths === "object") {
    packPath = modePaths[key] || "";
  } else {
    packPath = manifest?.paths?.[key] || "";
  }
  if (!packPath) {
    throw new Error(`Transport workbench manifest is missing ${mode}/${key} pack path.`);
  }
  return packPath;
}

export function createTransportWorkbenchLinePackRuntime(definition) {
  // 每个 line family 共用这组 runtime 字段：manifest、preview pack、full pack 与 selection 快照必须同生同灭。
  const runtime = {
    manifestPromise: null,
    auditPromise: null,
    packPromises: {
      [PACK_MODE_PREVIEW]: null,
      [PACK_MODE_FULL]: null,
    },
    projectedPacks: {
      [PACK_MODE_PREVIEW]: null,
      [PACK_MODE_FULL]: null,
    },
    activePack: null,
    activePackMode: null,
    loadState: createInitialLoadState(),
    selectedFeature: null,
    selectionChangeListener: null,
    lastRenderedConfig: null,
    renderStats: { ...(definition.initialRenderStats || {}) },
    activePackId: "",
    activeManifestUrl: definition.manifestUrl,
  };
  const fetchOptions = definition.fetchOptions || { cache: "no-cache" };

  function resetLoadStateForActivePack() {
    runtime.manifestPromise = null;
    runtime.auditPromise = null;
    runtime.packPromises = {
      [PACK_MODE_PREVIEW]: null,
      [PACK_MODE_FULL]: null,
    };
    runtime.projectedPacks = {
      [PACK_MODE_PREVIEW]: null,
      [PACK_MODE_FULL]: null,
    };
    runtime.activePack = null;
    runtime.activePackMode = null;
    runtime.loadState = createInitialLoadState();
    runtime.selectedFeature = null;
    runtime.lastRenderedConfig = null;
  }

  function setActivePack(packId = "", manifestUrl = "") {
    // packId/manifestUrl 是国家包切换的真实边界；其中任一变化都要丢弃旧 promise 与投影结果。
    const normalizedPackId = String(packId || "").trim().toLowerCase();
    const normalizedManifestUrl = String(manifestUrl || definition.manifestUrl || "").trim();
    if (runtime.activePackId === normalizedPackId && runtime.activeManifestUrl === normalizedManifestUrl) return;
    runtime.activePackId = normalizedPackId;
    runtime.activeManifestUrl = normalizedManifestUrl;
    resetLoadStateForActivePack();
  }

  async function loadManifest() {
    if (!runtime.manifestPromise) {
      runtime.manifestPromise = (async () => {
        definition.ensureClient?.();
        const manifest = await getTransportAsset(runtime.activeManifestUrl || definition.manifestUrl, {
          cachePolicy: fetchOptions.cache,
          label: `transport-manifest:${definition.familyId}:${runtime.activePackId || "default"}`,
        });
        if (!manifest) {
          runtime.loadState.status = "pending";
          runtime.loadState.previewStatus = "pending";
          runtime.loadState.error = null;
          runtime.loadState.manifest = null;
          return null;
        }
        runtime.loadState.manifest = manifest;
        return manifest;
      })().catch((error) => {
        if (Number(error?.httpStatus || 0) === 404 && definition.allowPendingManifest) {
          runtime.loadState.status = "pending";
          runtime.loadState.previewStatus = "pending";
          runtime.loadState.error = null;
          runtime.loadState.manifest = null;
          return null;
        }
        runtime.loadState.status = "error";
        runtime.loadState.previewStatus = "error";
        runtime.loadState.error = error instanceof Error ? error.message : String(error);
        throw error;
      });
    }
    return runtime.manifestPromise;
  }

  function startAuditLoad(manifest, onAuditReady) {
    if (!manifest?.paths?.build_audit || runtime.loadState.audit || runtime.auditPromise) return runtime.auditPromise;
    runtime.auditPromise = getTransportAsset(manifest.paths.build_audit, {
      cachePolicy: fetchOptions.cache,
      label: `transport-audit:${definition.familyId}`,
    })
      .then((audit) => {
        runtime.loadState.audit = audit;
        onAuditReady?.(audit);
        return audit;
      })
      .catch((error) => {
        console.warn(`[transport-workbench] Failed to load ${definition.familyId} audit.`, error);
        return null;
      });
    return runtime.auditPromise;
  }

  async function loadPack(mode = PACK_MODE_PREVIEW, onAuditReady) {
    if (runtime.projectedPacks[mode]) return runtime.projectedPacks[mode];
    if (!runtime.packPromises[mode]) {
      runtime.packPromises[mode] = (async () => {
        const isPreview = mode === PACK_MODE_PREVIEW;
        if (isPreview) {
          runtime.loadState.status = "loading";
          runtime.loadState.previewStatus = "loading";
          runtime.loadState.error = null;
        } else {
          runtime.loadState.fullStatus = "loading";
        }
        const manifest = await loadManifest();
        if (!manifest) {
          if (isPreview) {
            runtime.loadState.status = "pending";
            runtime.loadState.previewStatus = "pending";
          } else {
            runtime.loadState.fullStatus = "pending";
          }
          return null;
        }
        startAuditLoad(manifest, onAuditReady);
        const pack = await definition.buildPack({
          mode,
          manifest,
          runtime,
          fetchOptions,
          getPackPath: getTransportWorkbenchPackPath,
          loadTransportAsset: (path, overrides = {}) => getTransportAsset(path, {
            cachePolicy: overrides.cachePolicy || fetchOptions.cache,
            label: overrides.label || `transport-pack:${definition.familyId}:${mode}`,
          }),
        });
        runtime.projectedPacks[mode] = pack;
        if (isPreview) {
          runtime.loadState.status = "ready";
          runtime.loadState.previewStatus = "ready";
          runtime.loadState.error = null;
        } else {
          runtime.loadState.fullStatus = "ready";
        }
        return pack;
      })().catch((error) => {
        if (mode === PACK_MODE_PREVIEW) {
          runtime.loadState.status = "error";
          runtime.loadState.previewStatus = "error";
          runtime.loadState.error = error instanceof Error ? error.message : String(error);
        } else {
          runtime.loadState.fullStatus = "error";
        }
        throw error;
      });
    }
    return runtime.packPromises[mode];
  }

  function pickActivePack() {
    return runtime.projectedPacks[PACK_MODE_FULL] || runtime.projectedPacks[PACK_MODE_PREVIEW] || null;
  }

  function setSelectionListener(listener) {
    runtime.selectionChangeListener = typeof listener === "function" ? listener : null;
  }

  function getSnapshot(getSelectedSnapshot) {
    return {
      status: runtime.loadState.status,
      error: runtime.loadState.error,
      manifest: runtime.loadState.manifest,
      audit: runtime.loadState.audit,
      stats: { ...runtime.renderStats },
      packMode: runtime.activePackMode,
      previewStatus: runtime.loadState.previewStatus,
      fullStatus: runtime.loadState.fullStatus,
      selected: typeof getSelectedSnapshot === "function"
        ? getSelectedSnapshot(runtime.lastRenderedConfig)
        : runtime.selectedFeature,
    };
  }

  function emitSelectionChange(getSelectedSnapshot) {
    runtime.selectionChangeListener?.(getSnapshot(getSelectedSnapshot));
  }

  function startBackgroundFullPackLoad({ onAuditReady, onHydrated } = {}) {
    // full pack 只在 preview 可用后后台补齐；主图继续先用轻量 preview，避免工作台首开被完整包阻塞。
    if (runtime.projectedPacks[PACK_MODE_FULL] || runtime.packPromises[PACK_MODE_FULL]) return;
    loadPack(PACK_MODE_FULL, onAuditReady)
      .then((pack) => {
        if (!pack) return;
        onHydrated?.(pack);
      })
      .catch((error) => {
        console.warn(`[transport-workbench] Failed to hydrate full ${definition.familyId} pack.`, error);
      });
  }

  async function warm({ includeFull = false, onAuditReady, onHydrated } = {}) {
    await loadPack(PACK_MODE_PREVIEW, onAuditReady);
    if (includeFull && runtime.loadState.status === "ready") {
      startBackgroundFullPackLoad({ onAuditReady, onHydrated });
    }
    return getSnapshot();
  }

  registerMapcreatorSnapshotProvider("loadStatus", `transport_preview:${definition.familyId}`, () => (
    getSnapshot()
  ));

  return {
    runtime,
    emitSelectionChange,
    getSnapshot,
    loadPack,
    pickActivePack,
    setSelectionListener,
    startBackgroundFullPackLoad,
    warm,
    setActivePack,
  };
}
