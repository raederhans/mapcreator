import {
  getRenderSnapshotIdentity,
  parseRenderSnapshot,
  renderSnapshotInternals,
} from "./renderer/render_snapshot.js";

export const RENDER_CHANGE_SET_SCHEMA_VERSION = 1;
export const RENDER_CHANGE_SET_KIND = "render-change-set";

export const RENDER_CHANGE_SET_ACTION = Object.freeze({
  PREVIEW: "preview",
  COMPARE: "compare",
  APPLY: "apply",
  UNDO: "undo",
});

export const RENDER_CHANGE_SET_ERROR = Object.freeze({
  INVALID: "RENDER_CHANGE_SET_INVALID",
  VERSION_UNSUPPORTED: "RENDER_CHANGE_SET_VERSION_UNSUPPORTED",
  KIND_UNSUPPORTED: "RENDER_CHANGE_SET_KIND_UNSUPPORTED",
  EMPTY: "RENDER_CHANGE_SET_EMPTY",
  BASE_STALE: "RENDER_CHANGE_SET_BASE_STALE",
  ACTION_UNSUPPORTED: "RENDER_CHANGE_SET_ACTION_UNSUPPORTED",
});

const ACTION_VALUES = Object.freeze(Object.values(RENDER_CHANGE_SET_ACTION));
const UNSAFE_RECORD_KEYS = Object.freeze(["__proto__", "prototype", "constructor"]);

export class RenderChangeSetError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RenderChangeSetError";
    this.code = String(code || RENDER_CHANGE_SET_ERROR.INVALID);
    this.details = Object.freeze({ ...(details || {}) });
  }
}

function fail(code, message, details = {}) {
  throw new RenderChangeSetError(code, message, details);
}

function requireRecord(value, path) {
  if (!renderSnapshotInternals.isPlainRecord(value)) {
    fail(RENDER_CHANGE_SET_ERROR.INVALID, `${path} must be a plain object.`, { path });
  }
  return value;
}

function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    fail(RENDER_CHANGE_SET_ERROR.INVALID, `${path} must be a non-empty string.`, { path });
  }
  return value.trim();
}

function assertOnlyKeys(value, allowedKeys, path) {
  const keys = Object.keys(value);
  const unsafeKeys = keys.filter((key) => UNSAFE_RECORD_KEYS.includes(key));
  if (unsafeKeys.length) {
    fail(
      RENDER_CHANGE_SET_ERROR.INVALID,
      `${path} contains unsafe record keys.`,
      { path, unsafeKeys },
    );
  }
  const unknownKeys = keys.filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length) {
    fail(
      RENDER_CHANGE_SET_ERROR.INVALID,
      `${path} contains unsupported fields.`,
      { path, unknownKeys },
    );
  }
}

function deepFreeze(value) {
  return renderSnapshotInternals.deepFreeze(value);
}

function compareNormalizedRenderChangeSet(changeSet) {
  const paletteChanged = JSON.stringify(changeSet.before.palette)
    !== JSON.stringify(changeSet.after.palette);
  const ownershipChanged = JSON.stringify(changeSet.before.ownership)
    !== JSON.stringify(changeSet.after.ownership);
  const viewportChanged = JSON.stringify(changeSet.before.viewport)
    !== JSON.stringify(changeSet.after.viewport);
  const changedScopes = [];
  if (paletteChanged) changedScopes.push("palette");
  if (ownershipChanged) changedScopes.push("ownership");
  if (viewportChanged) changedScopes.push("viewport");
  return deepFreeze({
    paletteChanged,
    ownershipChanged,
    viewportChanged,
    changedScopes,
    hasChanges: changedScopes.length > 0,
  });
}

export function parseRenderChangeSet(value) {
  const raw = requireRecord(value, "changeSet");
  assertOnlyKeys(
    raw,
    ["schemaVersion", "kind", "id", "before", "after", "provenance"],
    "changeSet",
  );
  if (raw.schemaVersion !== RENDER_CHANGE_SET_SCHEMA_VERSION) {
    fail(
      RENDER_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
      `changeSet.schemaVersion must be ${RENDER_CHANGE_SET_SCHEMA_VERSION}.`,
      { actual: raw.schemaVersion, expected: RENDER_CHANGE_SET_SCHEMA_VERSION },
    );
  }
  if (raw.kind !== RENDER_CHANGE_SET_KIND) {
    fail(
      RENDER_CHANGE_SET_ERROR.KIND_UNSUPPORTED,
      `changeSet.kind must be ${RENDER_CHANGE_SET_KIND}.`,
      { actual: raw.kind, expected: RENDER_CHANGE_SET_KIND },
    );
  }

  let before;
  let after;
  try {
    before = parseRenderSnapshot(raw.before);
    after = parseRenderSnapshot(raw.after);
  } catch (error) {
    if (error?.name === "RenderSnapshotError") {
      fail(
        RENDER_CHANGE_SET_ERROR.INVALID,
        `changeSet contains an invalid render snapshot: ${error.message}`,
        { causeCode: error.code, causeDetails: error.details },
      );
    }
    throw error;
  }
  let provenance;
  try {
    provenance = renderSnapshotInternals.cloneJsonValue(
      requireRecord(raw.provenance === undefined ? {} : raw.provenance, "changeSet.provenance"),
      "changeSet.provenance",
    );
  } catch (error) {
    if (error?.name === "RenderSnapshotError") {
      fail(
        RENDER_CHANGE_SET_ERROR.INVALID,
        `changeSet.provenance is invalid: ${error.message}`,
        { causeCode: error.code, causeDetails: error.details },
      );
    }
    throw error;
  }
  const normalized = deepFreeze({
    schemaVersion: RENDER_CHANGE_SET_SCHEMA_VERSION,
    kind: RENDER_CHANGE_SET_KIND,
    id: requireText(raw.id, "changeSet.id"),
    before,
    after,
    provenance,
  });
  if (!compareNormalizedRenderChangeSet(normalized).hasChanges) {
    fail(
      RENDER_CHANGE_SET_ERROR.EMPTY,
      "A render change-set must contain at least one changed scope.",
      { id: normalized.id },
    );
  }
  return normalized;
}

export function createRenderChangeSet(value) {
  const raw = requireRecord(value, "changeSet");
  return parseRenderChangeSet({
    ...raw,
    schemaVersion: RENDER_CHANGE_SET_SCHEMA_VERSION,
    kind: RENDER_CHANGE_SET_KIND,
  });
}

export function compareRenderChangeSet(value) {
  return compareNormalizedRenderChangeSet(parseRenderChangeSet(value));
}

function normalizeAction(action) {
  const normalized = String(action || "").trim().toLowerCase();
  if (!ACTION_VALUES.includes(normalized)) {
    fail(
      RENDER_CHANGE_SET_ERROR.ACTION_UNSUPPORTED,
      "Unknown render change-set action.",
      { action: normalized },
    );
  }
  return normalized;
}

function getActionSnapshots(changeSet, action) {
  const undo = action === RENDER_CHANGE_SET_ACTION.UNDO;
  return {
    baseline: undo ? changeSet.after : changeSet.before,
    target: undo ? changeSet.before : changeSet.after,
  };
}

export function assertRenderChangeSetBaseSnapshot(
  value,
  currentSnapshot,
  { action = RENDER_CHANGE_SET_ACTION.APPLY } = {},
) {
  const changeSet = parseRenderChangeSet(value);
  const normalizedAction = normalizeAction(action);
  const { baseline } = getActionSnapshots(changeSet, normalizedAction);
  let actualIdentity;
  try {
    actualIdentity = getRenderSnapshotIdentity(currentSnapshot);
  } catch (error) {
    fail(
      RENDER_CHANGE_SET_ERROR.INVALID,
      `currentSnapshot is invalid: ${error.message}`,
      { causeCode: error?.code },
    );
  }
  const expectedIdentity = getRenderSnapshotIdentity(baseline);
  if (actualIdentity !== expectedIdentity) {
    fail(
      RENDER_CHANGE_SET_ERROR.BASE_STALE,
      "The render change-set base snapshot is stale.",
      {
        action: normalizedAction,
        expectedIdentity,
        actualIdentity,
      },
    );
  }
  return changeSet;
}

export function createRenderChangeSetActionIntent(
  value,
  action,
  { currentSnapshot } = {},
) {
  const changeSet = parseRenderChangeSet(value);
  const normalizedAction = normalizeAction(action);
  const commitsState = normalizedAction === RENDER_CHANGE_SET_ACTION.APPLY
    || normalizedAction === RENDER_CHANGE_SET_ACTION.UNDO;
  if (commitsState && currentSnapshot === undefined) {
    fail(
      RENDER_CHANGE_SET_ERROR.INVALID,
      `${normalizedAction} action intents require currentSnapshot.`,
      { action: normalizedAction, path: "currentSnapshot" },
    );
  }
  if (currentSnapshot !== undefined) {
    assertRenderChangeSetBaseSnapshot(changeSet, currentSnapshot, { action: normalizedAction });
  }
  const { baseline, target } = getActionSnapshots(changeSet, normalizedAction);
  const sessionOnly = normalizedAction === RENDER_CHANGE_SET_ACTION.PREVIEW
    || normalizedAction === RENDER_CHANGE_SET_ACTION.COMPARE;
  return deepFreeze({
    action: normalizedAction,
    changeSetId: changeSet.id,
    exactChangeSetIdentity: JSON.stringify(changeSet),
    baseline,
    target,
    comparison: compareNormalizedRenderChangeSet(changeSet),
    sessionOnly,
    commitsState,
    recordsHistory: normalizedAction === RENDER_CHANGE_SET_ACTION.APPLY,
    requiresRender: true,
    sideEffectsPerformed: false,
  });
}

export const resolveRenderChangeSetActionIntent = createRenderChangeSetActionIntent;
