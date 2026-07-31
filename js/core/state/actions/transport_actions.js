// Canonical transport state mutations. Preview, render, persistence, and load effects remain with callers.

import {
  TRANSPORT_WORKBENCH_FAMILY_IDS,
  normalizeTransportOverviewStyleConfig,
  normalizeTransportWorkbenchPointDeltas,
  normalizeTransportWorkbenchUiState,
} from "../../state_defaults.js";
import { getTransportOverviewVisibilityField } from "../../transport_capability_registry.js";

const TRANSPORT_VISIBILITY_FIELDS = new Set([
  "showAirports",
  "showPorts",
  "showRail",
  "showRoad",
]);

function isStateTarget(target) {
  return !!target && typeof target === "object" && !Array.isArray(target);
}

function cloneDetached(value) {
  if (!isStateTarget(value)) return value;
  if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function ensureTransportWorkbenchUiState(target) {
  if (!isStateTarget(target)) return normalizeTransportWorkbenchUiState(null);
  return commitTransportWorkbenchUiState(target, target.transportWorkbenchUi);
}

export function commitTransportWorkbenchUiState(target, nextUiState = null) {
  if (!isStateTarget(target)) return normalizeTransportWorkbenchUiState(null);
  const requestedLayerOrder = Array.isArray(nextUiState?.layerOrder)
    ? nextUiState.layerOrder
    : [];
  const normalized = normalizeTransportWorkbenchUiState(cloneDetached(nextUiState));
  const admittedLayerOrder = Array.from(new Set(
    requestedLayerOrder
      .map((familyId) => String(familyId || "").trim())
      .filter((familyId) => TRANSPORT_WORKBENCH_FAMILY_IDS.includes(familyId)),
  ));
  normalized.layerOrder = admittedLayerOrder.concat(
    TRANSPORT_WORKBENCH_FAMILY_IDS.filter((familyId) => !admittedLayerOrder.includes(familyId)),
  );
  const current = isStateTarget(target.transportWorkbenchUi)
    ? target.transportWorkbenchUi
    : normalized;
  if (current !== normalized) Object.assign(current, normalized);
  delete current.compareHeld;
  target.transportWorkbenchUi = current;
  return current;
}

export function commitTransportWorkbenchPointDeltasState(target, nextDeltas = null) {
  const normalized = normalizeTransportWorkbenchPointDeltas(nextDeltas);
  if (!isStateTarget(target)) return normalized;
  target.transportWorkbenchPointDeltas = normalized;
  return normalized;
}

export function applyTransportWorkbenchOverviewState(target, patch = {}) {
  if (!isStateTarget(target) || !isStateTarget(patch)) return null;
  const currentOverview = ensureTransportOverviewStyleConfigState(target);
  const familyId = String(patch.familyId || "").trim().toLowerCase();
  const nextOverview = {
    ...currentOverview,
  };
  if (Object.hasOwn(patch, "visualMode")) nextOverview.visualMode = patch.visualMode;
  if (familyId) {
    nextOverview[familyId] = {
      ...(currentOverview[familyId] || {}),
      ...(isStateTarget(patch.familyConfig) ? patch.familyConfig : {}),
    };
    if (patch.activePackId) {
      nextOverview.activePackIdByFamily = {
        ...(currentOverview.activePackIdByFamily || {}),
        [familyId]: String(patch.activePackId).trim().toLowerCase(),
      };
    }
  }
  target.styleConfig.transportOverview = normalizeTransportOverviewStyleConfig(nextOverview);
  setTransportMasterVisibilityState(target, true);
  const visibilityField = String(patch.visibilityField || "");
  if (TRANSPORT_VISIBILITY_FIELDS.has(visibilityField)) target[visibilityField] = true;
  return target.styleConfig.transportOverview;
}

export function ensureTransportOverviewStyleConfigState(target) {
  if (!isStateTarget(target)) return normalizeTransportOverviewStyleConfig(null);
  if (!isStateTarget(target.styleConfig)) target.styleConfig = {};
  const current = isStateTarget(target.styleConfig.transportOverview)
    ? target.styleConfig.transportOverview
    : null;
  const normalized = normalizeTransportOverviewStyleConfig(current);
  if (current) {
    Object.assign(current, normalized);
    target.styleConfig.transportOverview = current;
    return current;
  }
  target.styleConfig.transportOverview = normalized;
  return normalized;
}

export function setTransportMasterVisibilityState(target, visible) {
  if (!isStateTarget(target)) return false;
  target.showTransport = !!visible;
  return target.showTransport;
}

export function setTransportFamilyVisibilityState(target, familyId, visible) {
  if (!isStateTarget(target)) return false;
  const field = getTransportOverviewVisibilityField(String(familyId || "").trim().toLowerCase());
  if (!field) return false;
  const nextVisible = !!visible;
  target[field] = nextVisible;
  if (nextVisible) target.showTransport = true;
  return nextVisible;
}
