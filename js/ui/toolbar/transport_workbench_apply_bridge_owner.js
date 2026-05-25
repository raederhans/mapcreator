// Transport workbench apply bridge owner.
// Owns workbench-to-main-map apply decisions and the side-effect sequence.

import {
  applyTransportWorkbenchOverviewState,
  normalizeTransportOverviewStyleConfig,
} from "../../core/state.js";
import { getTransportAsset } from "../../core/data_service.js";
import { markDirty } from "../../core/dirty_state.js";
import { resolveTransportManifestUrl } from "../../core/runtime_asset_registry.js";
import {
  createTransportPackSourceGateReport,
  getDefaultMainMapPackIdForFamily,
  getTargetMainMapPackMeta,
} from "../../core/transport_pack_resolver.js";
import {
  applyTransportCountryOverlayState,
  loadTransportCountryOverlayState,
} from "../../core/transport_country_overlay.js";
import {
  TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY,
  getTransportCapabilityApplyCompatibility,
  getTransportCapabilityDefaultOverviewConfig,
  getTransportWorkbenchOverviewBridgeSupport,
  normalizeTransportOverviewVisualMode,
  resolveTransportOverviewPatchFromWorkbench,
} from "../../core/transport_capability_registry.js";
import { t } from "../i18n.js";
import { normalizeTransportWorkbenchFamily } from "./transport_workbench_config_owner.js";

function getTransportOverviewVisualModeFromState(runtimeState) {
  return normalizeTransportOverviewVisualMode(
    runtimeState?.styleConfig?.transportOverview?.visualMode,
    "distribution",
  );
}

function getApplyDisabledReasonCopy(reason, compatibility) {
  if (reason === "active_pack_required") return t("Select a transport pack before applying to the main map", "ui");
  if (reason === "source_pending") return t("Checking pack source before apply", "ui");
  if (reason === "source_failed") return t("Pack source check failed", "ui");
  if (reason === "unknown_pack") return t("Selected transport pack is unavailable", "ui");
  if (reason === "family_mismatch") return t("Selected pack belongs to another transport family", "ui");
  if (compatibility === TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.localBoard) {
    return t("Layer order stays inside this workbench", "ui");
  }
  return t("This family is preview-only until a main-map bridge exists.", "ui");
}

export function getTransportWorkbenchActivePackId(runtimeState, familyId) {
  const normalizedFamilyId = normalizeTransportWorkbenchFamily(familyId);
  const currentByFamily = runtimeState?.transportWorkbenchUi?.activePackIdByFamily || {};
  const currentPackId = String(
    currentByFamily[normalizedFamilyId] || runtimeState?.transportWorkbenchUi?.activePackId || ""
  ).trim().toLowerCase();
  const meta = getTargetMainMapPackMeta(currentPackId);
  if (meta && meta.family === normalizedFamilyId) return meta.packId;
  return getDefaultMainMapPackIdForFamily(normalizedFamilyId);
}

export function createTransportWorkbenchApplyBridgeOwner(runtimeState, {
  shouldRerender = () => false,
  renderTransportWorkbenchUi = null,
} = {}) {
  const transportWorkbenchPackGateReportByPackId = new Map();
  const transportWorkbenchPackGatePromiseByPackId = new Map();

  const getPackGateReport = (packId) => (
    transportWorkbenchPackGateReportByPackId.get(String(packId || "").trim().toLowerCase()) || null
  );

  const refreshPackGateReport = async (packId, { rerender = false } = {}) => {
    const normalizedPackId = String(packId || "").trim().toLowerCase();
    if (!normalizedPackId) return null;
    if (transportWorkbenchPackGateReportByPackId.has(normalizedPackId)) {
      return transportWorkbenchPackGateReportByPackId.get(normalizedPackId);
    }
    if (transportWorkbenchPackGatePromiseByPackId.has(normalizedPackId)) {
      return transportWorkbenchPackGatePromiseByPackId.get(normalizedPackId);
    }
    const promise = getTransportAsset(resolveTransportManifestUrl(normalizedPackId), {
      cachePolicy: "no-cache",
      label: `transport-workbench-pack-gate:${normalizedPackId}`,
    })
      .then((manifest) => {
        const gateReport = createTransportPackSourceGateReport(normalizedPackId, manifest);
        transportWorkbenchPackGateReportByPackId.set(normalizedPackId, gateReport);
        return gateReport;
      })
      .catch((error) => {
        const gateReport = {
          packId: normalizedPackId,
          family: getTargetMainMapPackMeta(normalizedPackId)?.family || "",
          passed: false,
          reasons: ["manifest_load_failed"],
          error: error?.message || String(error || "Unknown pack gate failure"),
        };
        transportWorkbenchPackGateReportByPackId.set(normalizedPackId, gateReport);
        return gateReport;
      })
      .finally(() => {
        transportWorkbenchPackGatePromiseByPackId.delete(normalizedPackId);
        if (rerender && shouldRerender(normalizedPackId) && typeof renderTransportWorkbenchUi === "function") {
          renderTransportWorkbenchUi();
        }
      });
    transportWorkbenchPackGatePromiseByPackId.set(normalizedPackId, promise);
    return promise;
  };

  const getApplyButtonState = (familyId) => {
    const compatibility = getTransportCapabilityApplyCompatibility(familyId);
    const activePackId = getTransportWorkbenchActivePackId(runtimeState, familyId);
    const familyConfig = {
      ...(runtimeState?.transportWorkbenchUi?.familyConfigs?.[familyId] || {}),
      activePackId,
      packGateReport: getPackGateReport(activePackId),
    };
    if (compatibility === TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.mainMapBridge) {
      const bridgeSupport = getTransportWorkbenchOverviewBridgeSupport(familyId, familyConfig);
      if (!bridgeSupport.supported) {
        return {
          compatibility,
          enabled: false,
          label: t("Workbench preview only", "ui"),
          reason: getApplyDisabledReasonCopy(bridgeSupport.reason, compatibility),
        };
      }
      return {
        compatibility,
        enabled: true,
        label: t("Apply to Main Map", "ui"),
        reason: "",
      };
    }
    if (compatibility === TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY.localBoard) {
      return {
        compatibility,
        enabled: false,
        label: t("Workbench-only family", "ui"),
        reason: getApplyDisabledReasonCopy("", compatibility),
      };
    }
    return {
      compatibility,
      enabled: false,
      label: t("Workbench preview only", "ui"),
      reason: getApplyDisabledReasonCopy("", compatibility),
    };
  };

  const applyFamilyToMainMap = async (context) => {
    const familyId = context?.family?.id || "";
    const currentOverviewConfig = normalizeTransportOverviewStyleConfig(runtimeState?.styleConfig?.transportOverview || {});
    const activePackId = context?.activePackId || getTransportWorkbenchActivePackId(runtimeState, familyId);
    const gateReport = await refreshPackGateReport(activePackId);
    if (!gateReport?.passed) return false;
    const patch = resolveTransportOverviewPatchFromWorkbench(
      familyId,
      {
        ...(context.config || runtimeState?.transportWorkbenchUi?.familyConfigs?.[familyId] || {}),
        activePackId,
        packGateReport: gateReport,
      },
      {
        currentOverviewConfig: currentOverviewConfig?.[familyId] || getTransportCapabilityDefaultOverviewConfig(familyId),
        currentVisualMode: getTransportOverviewVisualModeFromState(runtimeState),
      },
    );
    if (!patch) return false;
    const overlayState = await loadTransportCountryOverlayState(patch.activePackId || activePackId);
    applyTransportCountryOverlayState(runtimeState, overlayState);
    applyTransportWorkbenchOverviewState(runtimeState, {
      ...patch,
      familyId,
    });
    const dataLayerKeys = Array.isArray(patch.dataLayerKeys) ? patch.dataLayerKeys : [];
    try {
      if (dataLayerKeys.length && typeof runtimeState.ensureContextLayerDataFn === "function") {
        await runtimeState.ensureContextLayerDataFn(
          dataLayerKeys.length === 1 ? dataLayerKeys[0] : dataLayerKeys,
          { reason: "transport-workbench-apply", renderNow: false },
        );
      }
    } finally {
      runtimeState.updateTransportAppearanceUIFn?.();
      markDirty("transport-workbench-apply");
      if (typeof runtimeState.renderNowFn === "function") {
        runtimeState.renderNowFn("transport-workbench-apply");
      }
    }
    return true;
  };

  return {
    applyFamilyToMainMap,
    getActivePackId: (familyId) => getTransportWorkbenchActivePackId(runtimeState, familyId),
    getApplyButtonState,
    getPackGateReport,
    refreshPackGateReport,
  };
}
