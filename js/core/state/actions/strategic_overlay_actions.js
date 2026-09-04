// Canonical strategic-overlay collection, editor, and dirty-state authority.
// Rendering, history orchestration, persistence, metrics, and UI effects stay in callers.

export const STRATEGIC_OVERLAY_COLLECTION_KEYS = Object.freeze([
  "operationalLines",
  "operationGraphics",
  "unitCounters",
]);

export const STRATEGIC_OVERLAY_DIRTY_KEYS = Object.freeze([
  "frontlineOverlayDirty",
  "operationalLinesDirty",
  "operationGraphicsDirty",
  "unitCountersDirty",
]);

export const STRATEGIC_OVERLAY_ENTITY_FIELD_KEYS = Object.freeze({
  operationalLines: Object.freeze([
    "kind", "label", "points", "stylePreset", "stroke", "width", "opacity",
    "attachedCounterIds",
  ]),
  operationGraphics: Object.freeze([
    "kind", "label", "points", "stylePreset", "stroke", "width", "opacity",
  ]),
  unitCounters: Object.freeze([
    "renderer", "label", "sidc", "symbolCode", "nationTag", "nationSource", "presetId",
    "iconId", "unitType", "echelon", "subLabel", "strengthText", "baseFillColor",
    "organizationPct", "equipmentPct", "statsPresetId", "statsSource", "size", "attachment",
    "layoutAnchor", "anchor", "facing", "zIndex",
  ]),
});

export const STRATEGIC_OVERLAY_EDITOR_FIELD_KEYS = Object.freeze({
  operationalLineEditor: Object.freeze([
    "active", "mode", "points", "kind", "label", "stylePreset", "stroke", "width",
    "opacity", "selectedId", "selectedVertexIndex", "counter",
  ]),
  operationGraphicsEditor: Object.freeze([
    "active", "mode", "collection", "points", "kind", "label", "stylePreset", "stroke",
    "width", "opacity", "selectedId", "selectedVertexIndex", "counter",
  ]),
  unitCounterEditor: Object.freeze([
    "active", "renderer", "label", "sidc", "symbolCode", "nationTag", "nationSource",
    "presetId", "iconId", "unitType", "echelon", "subLabel", "strengthText", "layoutAnchor",
    "attachment", "baseFillColor", "organizationPct", "equipmentPct", "statsPresetId",
    "statsSource", "size", "selectedId", "returnSelectionId", "counter",
  ]),
  strategicOverlayUi: Object.freeze([
    "activeMode", "modalOpen", "modalSection", "modalEntityId", "modalEntityType",
    "counterEditorModalOpen", "counterCatalogSource", "counterCatalogCategory",
    "counterCatalogQuery", "hoi4CounterCategory", "hoi4CounterQuery", "hoi4CounterVariant",
  ]),
});

const COLLECTION_DIRTY_KEY = Object.freeze({
  operationalLines: "operationalLinesDirty",
  operationGraphics: "operationGraphicsDirty",
  unitCounters: "unitCountersDirty",
});

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[strategic_overlay_actions] target must be an object");
  }
}

function assertPatch(patch, label) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError(`[strategic_overlay_actions] ${label} must be an object`);
  }
}

function cloneStateValue(value) {
  if (Array.isArray(value)) return value.map(cloneStateValue);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map(Array.from(value, ([key, entry]) => [cloneStateValue(key), cloneStateValue(entry)]));
  if (value instanceof Set) return new Set(Array.from(value, cloneStateValue));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneStateValue(entry)]));
  }
  return value;
}

function prepareCollectionPatch(patch, cloneValue, { markDirty }) {
  assertPatch(patch, "collection patch");
  const assignments = {};
  const updatedKeys = [];
  for (const key of Object.keys(patch)) {
    if (!STRATEGIC_OVERLAY_COLLECTION_KEYS.includes(key)) {
      throw new Error(`[strategic_overlay_actions] unknown collection key: ${key}`);
    }
    if (!Array.isArray(patch[key])) {
      throw new TypeError(`[strategic_overlay_actions] ${key} must be an array`);
    }
    assignments[key] = cloneValue(patch[key]);
    if (markDirty) assignments[COLLECTION_DIRTY_KEY[key]] = true;
    updatedKeys.push(key);
  }
  return { assignments, updatedKeys };
}

function prepareEntityPatch(collectionKey, patch, cloneValue) {
  const allowedFields = STRATEGIC_OVERLAY_ENTITY_FIELD_KEYS[collectionKey];
  if (!allowedFields) {
    throw new Error(`[strategic_overlay_actions] unknown entity collection key: ${collectionKey}`);
  }
  assertPatch(patch, `${collectionKey} entity patch`);
  const assignments = {};
  for (const key of Object.keys(patch)) {
    if (!allowedFields.includes(key)) {
      throw new Error(`[strategic_overlay_actions] unknown ${collectionKey} entity field: ${key}`);
    }
    assignments[key] = cloneValue(patch[key]);
  }
  return assignments;
}

export function commitStrategicOverlayCollectionsState(
  target,
  patch,
  { cloneValue = cloneStateValue, markDirty = true } = {},
) {
  assertStateTarget(target);
  if (typeof cloneValue !== "function") {
    throw new TypeError("[strategic_overlay_actions] cloneValue must be a function");
  }
  const prepared = prepareCollectionPatch(patch, cloneValue, { markDirty: markDirty !== false });
  Object.assign(target, prepared.assignments);
  return Object.freeze({ updatedKeys: Object.freeze([...prepared.updatedKeys]) });
}

export function restoreStrategicOverlaySnapshotState(target, snapshot, options = {}) {
  assertStateTarget(target);
  assertPatch(snapshot, "snapshot");
  const collectionPatch = {};
  for (const key of STRATEGIC_OVERLAY_COLLECTION_KEYS) {
    if (Object.hasOwn(snapshot, key) && Array.isArray(snapshot[key])) {
      collectionPatch[key] = snapshot[key];
    }
  }
  return commitStrategicOverlayCollectionsState(target, collectionPatch, options);
}

export function patchStrategicOverlayEntityGroupState(
  target,
  collectionKey,
  entityPatches,
  { cloneValue = cloneStateValue, markDirty = true } = {},
) {
  assertStateTarget(target);
  if (!Array.isArray(target[collectionKey])) {
    throw new TypeError(`[strategic_overlay_actions] ${collectionKey} must be an array`);
  }
  if (!Array.isArray(entityPatches)) {
    throw new TypeError("[strategic_overlay_actions] entity patches must be an array");
  }
  if (typeof cloneValue !== "function") {
    throw new TypeError("[strategic_overlay_actions] cloneValue must be a function");
  }
  const patchById = new Map();
  for (const entry of entityPatches) {
    assertPatch(entry, "entity patch entry");
    const entityId = String(entry.entityId || "").trim();
    if (!entityId) {
      throw new Error("[strategic_overlay_actions] entityId is required");
    }
    if (patchById.has(entityId)) {
      throw new Error(`[strategic_overlay_actions] duplicate entityId: ${entityId}`);
    }
    const assignments = prepareEntityPatch(collectionKey, entry.patch, cloneValue);
    if (Object.keys(assignments).length) patchById.set(entityId, assignments);
  }
  if (!patchById.size) {
    return Object.freeze({
      changedEntityIds: Object.freeze([]),
      collectionKey,
    });
  }

  const changedEntityIds = [];
  const nextCollection = target[collectionKey].map((entity) => {
    const entityId = String(entity?.id || "").trim();
    const assignments = patchById.get(entityId);
    if (!assignments) return entity;
    changedEntityIds.push(entityId);
    return { ...entity, ...assignments };
  });
  if (changedEntityIds.length) {
    target[collectionKey] = nextCollection;
    if (markDirty !== false) target[COLLECTION_DIRTY_KEY[collectionKey]] = true;
  }
  return Object.freeze({
    changedEntityIds: Object.freeze(changedEntityIds),
    collectionKey,
  });
}

export function patchStrategicOverlayEntityState(target, collectionKey, entityId, patch, options = {}) {
  const normalizedEntityId = String(entityId || "").trim();
  if (!normalizedEntityId) {
    throw new Error("[strategic_overlay_actions] entityId is required");
  }
  const result = patchStrategicOverlayEntityGroupState(
    target,
    collectionKey,
    [{ entityId: normalizedEntityId, patch }],
    options,
  );
  return Object.freeze({
    changed: result.changedEntityIds.length === 1,
    entityId: normalizedEntityId,
    collectionKey,
  });
}

export function patchStrategicOverlayEditorState(
  target,
  editorKey,
  patch,
  { cloneValue = cloneStateValue } = {},
) {
  assertStateTarget(target);
  const allowedFields = STRATEGIC_OVERLAY_EDITOR_FIELD_KEYS[editorKey];
  if (!allowedFields) {
    throw new Error(`[strategic_overlay_actions] unknown editor key: ${editorKey}`);
  }
  assertPatch(patch, `${editorKey} patch`);
  if (typeof cloneValue !== "function") {
    throw new TypeError("[strategic_overlay_actions] cloneValue must be a function");
  }
  const current = target[editorKey] && typeof target[editorKey] === "object" && !Array.isArray(target[editorKey])
    ? target[editorKey]
    : {};
  const assignments = {};
  for (const key of Object.keys(patch)) {
    if (!allowedFields.includes(key)) {
      throw new Error(`[strategic_overlay_actions] unknown ${editorKey} field: ${key}`);
    }
    assignments[key] = cloneValue(patch[key]);
  }
  Object.assign(current, assignments);
  if (target[editorKey] !== current) target[editorKey] = current;
  return current;
}

export function setStrategicOverlayDirtyState(target, dirtyKey, value = true) {
  assertStateTarget(target);
  if (!STRATEGIC_OVERLAY_DIRTY_KEYS.includes(dirtyKey)) {
    throw new Error(`[strategic_overlay_actions] unknown dirty key: ${dirtyKey}`);
  }
  target[dirtyKey] = Boolean(value);
  return target[dirtyKey];
}
