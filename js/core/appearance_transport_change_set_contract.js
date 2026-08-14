import {
  APPEARANCE_PRESET_SCHEMA_VERSION,
  normalizeAppearancePresetSnapshot,
} from "./state/appearance_preset_state.js";
import {
  getTransportCapabilityFamilyMetadata,
  getTransportWorkbenchOverviewBridgeSupport,
} from "./transport_capability_registry.js";
import { getTransportWorkbenchPackMeta } from "./transport_pack_resolver.js";

export const APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION = 1;
export const APPEARANCE_TRANSPORT_SNAPSHOT_SCHEMA_VERSION = 1;
export const APPEARANCE_TRANSPORT_CHANGE_SET_KIND = "appearance-transport-change-set";

export const APPEARANCE_TRANSPORT_CHANGE_SET_ACTION = Object.freeze({
  PREVIEW: "preview",
  COMPARE: "compare",
  APPLY: "apply",
  UNDO: "undo",
});

export const APPEARANCE_TRANSPORT_OPERATION_PHASE = Object.freeze({
  PREPARING: "preparing",
  APPLYING: "applying",
  RENDERING: "rendering",
  READY: "ready",
  RECOVERABLE_ERROR: "recoverable-error",
});

export const APPEARANCE_TRANSPORT_CHANGE_SET_ERROR = Object.freeze({
  INVALID: "CHANGESET_INVALID",
  VERSION_UNSUPPORTED: "CHANGESET_VERSION_UNSUPPORTED",
  KIND_UNSUPPORTED: "CHANGESET_KIND_UNSUPPORTED",
  SCOPE_INVALID: "CHANGESET_SCOPE_INVALID",
  EMPTY: "CHANGESET_EMPTY",
  ACTION_UNSUPPORTED: "CHANGESET_ACTION_UNSUPPORTED",
  BASE_STALE: "CHANGESET_BASE_STALE",
  OPERATION_STALE: "CHANGESET_OPERATION_STALE",
  TRANSITION_INVALID: "CHANGESET_TRANSITION_INVALID",
  HISTORY_INVALID: "CHANGESET_HISTORY_INVALID",
});

const ACTION_VALUES = Object.freeze(Object.values(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION));
const POISON_RECORD_KEYS = Object.freeze(["__proto__", "prototype", "constructor"]);
const RFC3339_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export class AppearanceTransportChangeSetError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AppearanceTransportChangeSetError";
    this.code = String(code || APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID);
    this.details = Object.freeze({ ...(details || {}) });
  }
}

function fail(code, message, details = {}) {
  throw new AppearanceTransportChangeSetError(code, message, details);
}

function isPlainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireRecord(value, path) {
  if (!isPlainRecord(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path} must be a plain object.`,
      { path },
    );
  }
  return value;
}

function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path} must be a non-empty string.`,
      { path },
    );
  }
  return value.trim();
}

function assertOnlyKeys(value, allowedKeys, path) {
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path} contains unsupported fields.`,
      { path, unknownKeys },
    );
  }
}

function cloneContractValue(value, path = "$", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID, `${path} must be finite.`, { path });
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path} must be JSON-like data.`,
      { path },
    );
  }
  if (ancestors.has(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path} must not contain a cycle.`,
      { path },
    );
  }
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => cloneContractValue(entry, `${path}[${index}]`, ancestors));
  } else {
    requireRecord(value, path);
    const keys = Object.keys(value).sort();
    const poisonKeys = keys.filter((key) => POISON_RECORD_KEYS.includes(key));
    if (poisonKeys.length) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
        `${path} contains unsafe record keys.`,
        { path, poisonKeys },
      );
    }
    result = Object.assign(
      Object.create(null),
      Object.fromEntries(keys.map((key) => [
        key,
        cloneContractValue(value[key], `${path}.${key}`, ancestors),
      ])),
    );
  }
  ancestors.delete(value);
  return deepFreeze(result);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

function normalizeTimestamp(value) {
  const timestamp = requireText(value, "changeSet.createdAt");
  if (!RFC3339_TIMESTAMP_PATTERN.test(timestamp)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      "changeSet.createdAt must be an RFC3339 timestamp with an explicit timezone.",
      { path: "changeSet.createdAt" },
    );
  }
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      "changeSet.createdAt must be a valid timestamp.",
      { path: "changeSet.createdAt" },
    );
  }
  return date.toISOString();
}

function normalizeAppearanceSnapshot(value, path) {
  const snapshot = requireRecord(value, path);
  assertOnlyKeys(snapshot, ["schemaVersion", "styleConfig", "layerVisibility", "intensityFields"], path);
  if (snapshot.schemaVersion !== APPEARANCE_PRESET_SCHEMA_VERSION) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
      `${path}.schemaVersion must be ${APPEARANCE_PRESET_SCHEMA_VERSION}.`,
      { actual: snapshot.schemaVersion, expected: APPEARANCE_PRESET_SCHEMA_VERSION, path },
    );
  }
  return normalizeAppearancePresetSnapshot(snapshot);
}

function normalizeTransportSnapshot(value, path) {
  const snapshot = requireRecord(value, path);
  assertOnlyKeys(
    snapshot,
    ["schemaVersion", "familyId", "activePackId", "applyCompatibility", "workbench", "mainMap"],
    path,
  );
  if (snapshot.schemaVersion !== APPEARANCE_TRANSPORT_SNAPSHOT_SCHEMA_VERSION) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
      `${path}.schemaVersion must be ${APPEARANCE_TRANSPORT_SNAPSHOT_SCHEMA_VERSION}.`,
      {
        actual: snapshot.schemaVersion,
        expected: APPEARANCE_TRANSPORT_SNAPSHOT_SCHEMA_VERSION,
        path,
      },
    );
  }

  const familyId = requireText(snapshot.familyId, `${path}.familyId`).toLowerCase();
  const familyMetadata = getTransportCapabilityFamilyMetadata(familyId);
  if (!familyMetadata || familyMetadata.runtimeKind === "board") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
      `${path}.familyId is not a runtime Transport capability.`,
      { familyId, path },
    );
  }

  const activePackId = requireText(snapshot.activePackId, `${path}.activePackId`).toLowerCase();
  const packMetadata = getTransportWorkbenchPackMeta(activePackId);
  if (!packMetadata || packMetadata.family !== familyId) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
      `${path}.activePackId must identify a pack from the selected family.`,
      { activePackId, familyId, path },
    );
  }

  const compatibility = familyMetadata.applyCompatibility;
  if (snapshot.applyCompatibility !== undefined && snapshot.applyCompatibility !== compatibility) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path}.applyCompatibility must match the capability registry.`,
      { actual: snapshot.applyCompatibility, expected: compatibility, path },
    );
  }

  const workbench = requireRecord(snapshot.workbench, `${path}.workbench`);
  assertOnlyKeys(workbench, ["familyConfig", "displayConfig", "pointDeltas"], `${path}.workbench`);
  const familyConfig = requireRecord(workbench.familyConfig, `${path}.workbench.familyConfig`);
  const snapshotFamilyConfig = Object.keys(familyConfig).reduce((result, key) => {
    if (key !== "packGateReport" && key !== "gateReport") result[key] = familyConfig[key];
    return result;
  }, Object.create(null));
  const mainMap = requireRecord(snapshot.mainMap, `${path}.mainMap`);
  assertOnlyKeys(mainMap, ["overviewConfig", "layerVisibility"], `${path}.mainMap`);
  if (typeof mainMap.layerVisibility !== "boolean") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      `${path}.mainMap.layerVisibility must be boolean.`,
      { path: `${path}.mainMap.layerVisibility` },
    );
  }

  return {
    schemaVersion: APPEARANCE_TRANSPORT_SNAPSHOT_SCHEMA_VERSION,
    familyId,
    activePackId: packMetadata.packId,
    applyCompatibility: compatibility,
    workbench: {
      familyConfig: cloneContractValue(snapshotFamilyConfig, `${path}.workbench.familyConfig`),
      displayConfig: cloneContractValue(requireRecord(workbench.displayConfig, `${path}.workbench.displayConfig`), `${path}.workbench.displayConfig`),
      pointDeltas: cloneContractValue(requireRecord(workbench.pointDeltas, `${path}.workbench.pointDeltas`), `${path}.workbench.pointDeltas`),
    },
    mainMap: {
      overviewConfig: cloneContractValue(requireRecord(mainMap.overviewConfig, `${path}.mainMap.overviewConfig`), `${path}.mainMap.overviewConfig`),
      layerVisibility: mainMap.layerVisibility,
    },
  };
}

function normalizeSnapshotPair(beforeValue, afterValue) {
  const before = requireRecord(beforeValue, "changeSet.before");
  const after = requireRecord(afterValue, "changeSet.after");
  assertOnlyKeys(before, ["appearance", "transport"], "changeSet.before");
  assertOnlyKeys(after, ["appearance", "transport"], "changeSet.after");

  const hasAppearance = Object.hasOwn(before, "appearance");
  const hasTransport = Object.hasOwn(before, "transport");
  if (hasAppearance !== Object.hasOwn(after, "appearance") || hasTransport !== Object.hasOwn(after, "transport")) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
      "changeSet.before and changeSet.after must cover the same scopes.",
    );
  }
  if (!hasAppearance && !hasTransport) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
      "A change-set must cover Appearance, Transport, or both.",
    );
  }

  const normalizedBefore = {};
  const normalizedAfter = {};
  if (hasAppearance) {
    normalizedBefore.appearance = normalizeAppearanceSnapshot(before.appearance, "changeSet.before.appearance");
    normalizedAfter.appearance = normalizeAppearanceSnapshot(after.appearance, "changeSet.after.appearance");
  }
  if (hasTransport) {
    normalizedBefore.transport = normalizeTransportSnapshot(before.transport, "changeSet.before.transport");
    normalizedAfter.transport = normalizeTransportSnapshot(after.transport, "changeSet.after.transport");
    if (normalizedBefore.transport.familyId !== normalizedAfter.transport.familyId) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
        "A Transport change-set must stay within one capability family.",
        {
          beforeFamilyId: normalizedBefore.transport.familyId,
          afterFamilyId: normalizedAfter.transport.familyId,
        },
      );
    }
  }
  return { before: normalizedBefore, after: normalizedAfter };
}

function compareNormalizedChangeSet(changeSet) {
  const appearanceChanged = Object.hasOwn(changeSet.before, "appearance")
    && JSON.stringify(changeSet.before.appearance) !== JSON.stringify(changeSet.after.appearance);
  const transportChanged = Object.hasOwn(changeSet.before, "transport")
    && JSON.stringify(changeSet.before.transport) !== JSON.stringify(changeSet.after.transport);
  const changedScopes = [];
  if (appearanceChanged) changedScopes.push("appearance");
  if (transportChanged) changedScopes.push("transport");
  return deepFreeze({
    appearanceChanged,
    transportChanged,
    changedScopes,
    hasChanges: changedScopes.length > 0,
  });
}

export function parseAppearanceTransportChangeSet(value) {
  const raw = requireRecord(value, "changeSet");
  assertOnlyKeys(
    raw,
    ["schemaVersion", "kind", "id", "createdAt", "baseRevision", "before", "after", "provenance"],
    "changeSet",
  );
  if (raw.schemaVersion !== APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
      `changeSet.schemaVersion must be ${APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION}.`,
      { actual: raw.schemaVersion, expected: APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION },
    );
  }
  if (raw.kind !== APPEARANCE_TRANSPORT_CHANGE_SET_KIND) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.KIND_UNSUPPORTED,
      `changeSet.kind must be ${APPEARANCE_TRANSPORT_CHANGE_SET_KIND}.`,
      { actual: raw.kind, expected: APPEARANCE_TRANSPORT_CHANGE_SET_KIND },
    );
  }

  const snapshots = normalizeSnapshotPair(raw.before, raw.after);
  const normalized = {
    schemaVersion: APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION,
    kind: APPEARANCE_TRANSPORT_CHANGE_SET_KIND,
    id: requireText(raw.id, "changeSet.id"),
    createdAt: normalizeTimestamp(raw.createdAt),
    baseRevision: requireText(raw.baseRevision, "changeSet.baseRevision"),
    before: snapshots.before,
    after: snapshots.after,
    provenance: cloneContractValue(
      requireRecord(raw.provenance === undefined ? {} : raw.provenance, "changeSet.provenance"),
      "changeSet.provenance",
    ),
  };
  if (!compareNormalizedChangeSet(normalized).hasChanges) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.EMPTY,
      "A change-set must contain at least one normalized change.",
      { id: normalized.id },
    );
  }
  return deepFreeze(normalized);
}

export function createAppearanceTransportChangeSet(value) {
  const raw = requireRecord(value, "changeSet");
  return parseAppearanceTransportChangeSet({
    ...raw,
    schemaVersion: APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION,
    kind: APPEARANCE_TRANSPORT_CHANGE_SET_KIND,
  });
}

export function compareAppearanceTransportChangeSet(value) {
  return compareNormalizedChangeSet(parseAppearanceTransportChangeSet(value));
}

function getCurrentPackGateReport(transport, options) {
  if (!transport || typeof options?.getPackGateReport !== "function") return null;
  let gateReport;
  try {
    gateReport = options.getPackGateReport(transport.activePackId);
  } catch (error) {
    return {
      authorityError: true,
      cause: deepFreeze({
        name: String(error?.name || "Error"),
        message: String(error?.message || error || "pack-gate-resolver-failed"),
      }),
    };
  }
  if (!isPlainRecord(gateReport)
    || String(gateReport.packId || "").trim().toLowerCase() !== transport.activePackId
    || String(gateReport.family || "").trim().toLowerCase() !== transport.familyId) {
    return { stale: true };
  }
  return gateReport;
}

function getNormalizedActionCapability(changeSet, action, options = {}) {
  if (action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW
    || action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.COMPARE) {
    return { supported: true, reason: "" };
  }
  const transport = action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO
    ? changeSet.before.transport
    : changeSet.after.transport;
  if (!transport) return { supported: true, reason: "" };
  const gateReport = getCurrentPackGateReport(transport, options);
  if (gateReport?.authorityError) {
    return {
      supported: false,
      reason: "source_authority_error",
      evidence: gateReport.cause,
    };
  }
  if (gateReport?.stale) return { supported: false, reason: "source_stale" };
  const support = getTransportWorkbenchOverviewBridgeSupport(transport.familyId, {
    ...transport.workbench.familyConfig,
    activePackId: transport.activePackId,
    packGateReport: gateReport,
  });
  const normalizeCommitSupport = (support) => support.supported === true
    ? { supported: true, reason: "" }
    : {
      supported: false,
      reason: support.reason || "transport-main-map-bridge-required",
      ...(support.evidence ? { evidence: support.evidence } : {}),
    };
  return normalizeCommitSupport(support);
}

function getNormalizedChangeSetCapabilities(changeSet, options = {}) {
  return deepFreeze({
    [APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW]: getNormalizedActionCapability(
      changeSet,
      APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW,
      options,
    ),
    [APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.COMPARE]: getNormalizedActionCapability(
      changeSet,
      APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.COMPARE,
      options,
    ),
    [APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY]: getNormalizedActionCapability(
      changeSet,
      APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
      options,
    ),
    [APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO]: getNormalizedActionCapability(
      changeSet,
      APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
      options,
    ),
  });
}

export function getAppearanceTransportChangeSetCapabilities(value, options = {}) {
  const capabilities = getNormalizedChangeSetCapabilities(parseAppearanceTransportChangeSet(value), options);
  return deepFreeze(Object.fromEntries(
    Object.entries(capabilities).map(([action, capability]) => [
      action,
      { ...capability, advisory: true },
    ]),
  ));
}

export function assertAppearanceTransportChangeSetBaseRevision(value, currentRevision) {
  const changeSet = parseAppearanceTransportChangeSet(value);
  const normalizedCurrentRevision = requireText(currentRevision, "currentRevision");
  if (changeSet.baseRevision !== normalizedCurrentRevision) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.BASE_STALE,
      "The change-set base revision is stale.",
      { actual: normalizedCurrentRevision, expected: changeSet.baseRevision },
    );
  }
  return changeSet;
}

function resolveAppearanceTransportChangeSetAction(changeSet, action, options) {
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (!ACTION_VALUES.includes(normalizedAction)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.ACTION_UNSUPPORTED,
      "Unknown Appearance / Transport change-set action.",
      { action: normalizedAction },
    );
  }
  const capability = getNormalizedActionCapability(changeSet, normalizedAction, options);
  if (!capability.supported) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.ACTION_UNSUPPORTED,
      "The change-set transport capability cannot commit to the main map.",
      {
        action: normalizedAction,
        reason: capability.reason,
        ...(capability.evidence ? { evidence: capability.evidence } : {}),
      },
    );
  }

  const undo = normalizedAction === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO;
  const commitsState = normalizedAction === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY || undo;
  const sessionAction = normalizedAction === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW
    || normalizedAction === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.COMPARE;
  const resolvedTarget = undo ? changeSet.before : changeSet.after;
  const resolvedBaseline = undo ? changeSet.after : changeSet.before;
  return deepFreeze({
    action: normalizedAction,
    changeSetId: changeSet.id,
    baseRevision: changeSet.baseRevision,
    exactChangeSetIdentity: JSON.stringify(changeSet),
    sessionBaseline: sessionAction ? resolvedBaseline : null,
    sessionTarget: sessionAction ? resolvedTarget : null,
    canonicalBaseline: commitsState ? resolvedBaseline : null,
    canonicalTarget: commitsState ? resolvedTarget : null,
    comparison: compareNormalizedChangeSet(changeSet),
    commitsState,
    recordsHistory: normalizedAction === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
    requiresRender: true,
  });
}

export const appearanceTransportChangeSetContractInternals = Object.freeze({
  assertOnlyKeys,
  cloneContractValue,
  deepFreeze,
  fail,
  isPlainRecord,
  requireRecord,
  requireText,
  resolveAppearanceTransportChangeSetAction,
});
