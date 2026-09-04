// Canonical special-zone layer, compatibility-editor, brush-mode, and dirty-state authority.
// Persistence, rendering, UI feedback, metrics, and runtime hooks stay in callers.

import {
  normalizeSpecialZoneLayersState,
  normalizeSpecialZoneMembershipBrushModeState,
} from "../../special_zone_layers.js";
import { createDefaultSpecialZoneEditorState } from "../strategic_overlay_state.js";

export const SPECIAL_ZONE_EDITOR_FIELD_KEYS = Object.freeze([
  "active",
  "vertices",
  "zoneType",
  "label",
  "selectedId",
  "counter",
]);

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[special_zone_actions] target must be an object");
  }
}

function assertPatch(patch, label) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError(`[special_zone_actions] ${label} must be an object`);
  }
}

function normalizeEditorState(editor, defaultZoneType = "custom") {
  const existing = editor && typeof editor === "object" && !Array.isArray(editor);
  const source = existing
    ? editor
    : createDefaultSpecialZoneEditorState();
  const next = { ...source };
  if (!Array.isArray(next.vertices)) next.vertices = [];
  if (!Number.isFinite(Number(next.counter)) || Number(next.counter) < 1) next.counter = 1;
  if (!next.zoneType) next.zoneType = String(defaultZoneType || "custom");
  if (typeof next.label !== "string") next.label = "";
  if (next.selectedId === undefined) next.selectedId = null;
  return next;
}

function cloneEditorVertices(vertices) {
  return Array.isArray(vertices)
    ? vertices.map((vertex) => Array.isArray(vertex) ? [...vertex] : vertex)
    : [];
}

export function ensureSpecialZoneEditorState(target, { defaultZoneType = "custom" } = {}) {
  assertStateTarget(target);
  const current = target.specialZoneEditor;
  const next = normalizeEditorState(current, defaultZoneType);
  if (current && typeof current === "object" && !Array.isArray(current)) {
    Object.assign(current, next);
  } else {
    target.specialZoneEditor = next;
  }
  return target.specialZoneEditor;
}

export function patchSpecialZoneEditorState(
  target,
  patch,
  { defaultZoneType = "custom" } = {},
) {
  assertStateTarget(target);
  assertPatch(patch, "specialZoneEditor patch");
  for (const key of Object.keys(patch)) {
    if (!SPECIAL_ZONE_EDITOR_FIELD_KEYS.includes(key)) {
      throw new Error(`[special_zone_actions] unknown specialZoneEditor field: ${key}`);
    }
  }
  const current = ensureSpecialZoneEditorState(target, { defaultZoneType });
  const assignments = {};
  if (Object.hasOwn(patch, "active")) assignments.active = Boolean(patch.active);
  if (Object.hasOwn(patch, "vertices")) assignments.vertices = Array.isArray(patch.vertices)
    ? patch.vertices.map((vertex) => Array.isArray(vertex) ? [...vertex] : vertex)
    : [];
  if (Object.hasOwn(patch, "zoneType")) assignments.zoneType = String(patch.zoneType || defaultZoneType || "custom");
  if (Object.hasOwn(patch, "label")) assignments.label = String(patch.label || "");
  if (Object.hasOwn(patch, "selectedId")) assignments.selectedId = String(patch.selectedId || "").trim() || null;
  if (Object.hasOwn(patch, "counter")) assignments.counter = Math.max(1, Number(patch.counter) || 1);
  Object.assign(current, assignments);
  return current;
}

export function commitSpecialZoneLayersState(
  target,
  nextState,
  options = {},
) {
  assertStateTarget(target);
  const normalized = normalizeSpecialZoneLayersState(nextState, options);
  Object.assign(target, {
    specialZoneLayers: normalized,
    specialZonesOverlayDirty: true,
  });
  return normalized;
}

export function restoreSpecialZoneSnapshotState(
  target,
  snapshot,
  { layerOptions = {}, defaultZoneType = "custom" } = {},
) {
  assertStateTarget(target);
  assertPatch(snapshot, "snapshot");
  const assignments = {};
  const updatedKeys = [];
  if (
    Object.hasOwn(snapshot, "specialZoneLayers")
    && snapshot.specialZoneLayers
    && typeof snapshot.specialZoneLayers === "object"
    && !Array.isArray(snapshot.specialZoneLayers)
  ) {
    assignments.specialZoneLayers = normalizeSpecialZoneLayersState(snapshot.specialZoneLayers, layerOptions);
    assignments.specialZonesOverlayDirty = true;
    updatedKeys.push("specialZoneLayers");
  }
  if (Object.hasOwn(snapshot, "specialZoneMembershipBrushMode") && typeof snapshot.specialZoneMembershipBrushMode === "string") {
    assignments.specialZoneMembershipBrushMode = normalizeSpecialZoneMembershipBrushModeState(
      snapshot.specialZoneMembershipBrushMode,
    );
    updatedKeys.push("specialZoneMembershipBrushMode");
  }
  if (
    Object.hasOwn(snapshot, "specialZoneEditor")
    && snapshot.specialZoneEditor
    && typeof snapshot.specialZoneEditor === "object"
    && !Array.isArray(snapshot.specialZoneEditor)
  ) {
    const normalizedEditor = normalizeEditorState(
      snapshot.specialZoneEditor,
      defaultZoneType,
    );
    assignments.specialZoneEditor = {
      ...normalizedEditor,
      vertices: cloneEditorVertices(normalizedEditor.vertices),
    };
    updatedKeys.push("specialZoneEditor");
  }
  Object.assign(target, assignments);
  return Object.freeze({ updatedKeys: Object.freeze(updatedKeys) });
}

export function setSpecialZoneMembershipBrushModeState(target, mode = "add") {
  assertStateTarget(target);
  target.specialZoneMembershipBrushMode = normalizeSpecialZoneMembershipBrushModeState(mode);
  return target.specialZoneMembershipBrushMode;
}

export function setSpecialZonePresetCategoryState(target, category = "all") {
  assertStateTarget(target);
  target.specialZonePresetCategory = String(category || "all").trim() || "all";
  return target.specialZonePresetCategory;
}

export function setSpecialZonePresetCategoryOpenState(
  target,
  category,
  isOpen,
) {
  assertStateTarget(target);
  const normalizedCategory = String(category || "").trim();
  if (!normalizedCategory) return Array.isArray(target.specialZonePresetOpenCategories)
    ? target.specialZonePresetOpenCategories
    : [];
  const openCategories = new Set(
    Array.isArray(target.specialZonePresetOpenCategories)
      ? target.specialZonePresetOpenCategories
      : target.specialZonePresetOpenCategories instanceof Set
        ? target.specialZonePresetOpenCategories
        : [],
  );
  if (isOpen) openCategories.add(normalizedCategory);
  else openCategories.delete(normalizedCategory);
  target.specialZonePresetOpenCategories = [...openCategories];
  return target.specialZonePresetOpenCategories;
}

export function ensureManualSpecialZonesState(target) {
  assertStateTarget(target);
  if (
    !target.manualSpecialZones
    || typeof target.manualSpecialZones !== "object"
    || Array.isArray(target.manualSpecialZones)
    || target.manualSpecialZones.type !== "FeatureCollection"
  ) {
    target.manualSpecialZones = { type: "FeatureCollection", features: [] };
  } else if (!Array.isArray(target.manualSpecialZones.features)) {
    target.manualSpecialZones = {
      ...target.manualSpecialZones,
      features: [],
    };
  }
  return target.manualSpecialZones;
}

export function setSpecialZonesVisibilityState(target, value = true) {
  assertStateTarget(target);
  target.showSpecialZones = Boolean(value);
  return target.showSpecialZones;
}

export function setSpecialZonesOverlayDirtyState(target, value = true) {
  assertStateTarget(target);
  target.specialZonesOverlayDirty = Boolean(value);
  return target.specialZonesOverlayDirty;
}
