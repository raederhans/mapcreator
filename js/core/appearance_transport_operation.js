import {
  APPEARANCE_TRANSPORT_CHANGE_SET_ACTION,
  APPEARANCE_TRANSPORT_CHANGE_SET_ERROR,
  APPEARANCE_TRANSPORT_OPERATION_PHASE,
  appearanceTransportChangeSetContractInternals,
  assertAppearanceTransportChangeSetBaseRevision,
  parseAppearanceTransportChangeSet,
} from "./appearance_transport_change_set_contract.js";

const {
  assertOnlyKeys,
  cloneContractValue,
  deepFreeze,
  fail,
  isPlainRecord,
  requireRecord,
  requireText,
  resolveAppearanceTransportChangeSetAction,
} = appearanceTransportChangeSetContractInternals;

const ACTION_VALUES = Object.freeze(Object.values(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION));
const PHASE_VALUES = Object.freeze(Object.values(APPEARANCE_TRANSPORT_OPERATION_PHASE));
const OPERATION_TRANSITIONS = Object.freeze({
  [APPEARANCE_TRANSPORT_OPERATION_PHASE.PREPARING]: Object.freeze([
    APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING,
    APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR,
  ]),
  [APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING]: Object.freeze([
    APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING,
    APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR,
  ]),
  [APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING]: Object.freeze([
    APPEARANCE_TRANSPORT_OPERATION_PHASE.READY,
    APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR,
  ]),
  [APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR]: Object.freeze([
    APPEARANCE_TRANSPORT_OPERATION_PHASE.READY,
  ]),
});
const OPERATION_STATE_BRAND = new WeakSet();

export function createAppearanceTransportOperationState() {
  const state = deepFreeze({
    phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.READY,
    action: "",
    operationId: "",
    changeSetId: "",
    generation: 0,
    intent: null,
    appliedRecord: null,
    historyRecord: null,
    recoveryExpectation: null,
    recoveryResult: null,
    completionReceipt: null,
    error: null,
  });
  OPERATION_STATE_BRAND.add(state);
  return state;
}

function normalizeOperationState(value) {
  const state = requireRecord(value, "operationState");
  if (!OPERATION_STATE_BRAND.has(state)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "operationState must originate from this operation boundary.",
    );
  }
  if (!PHASE_VALUES.includes(state.phase)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "operationState.phase is invalid.",
      { phase: state.phase },
    );
  }
  if (!Number.isSafeInteger(state.generation) || state.generation < 0) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "operationState.generation must be a non-negative safe integer.",
      { generation: state.generation },
    );
  }
  return state;
}

export function beginAppearanceTransportOperation(value, options = {}) {
  const state = normalizeOperationState(value);
  if (state.phase !== APPEARANCE_TRANSPORT_OPERATION_PHASE.READY) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "An operation can begin only from Ready.",
      { phase: state.phase },
    );
  }
  const action = String(options.action || "").trim().toLowerCase();
  if (state.generation === Number.MAX_SAFE_INTEGER) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.OPERATION_STALE,
      "The operation generation is exhausted.",
      { generation: state.generation },
    );
  }
  const changeSet = parseAppearanceTransportChangeSet(options.changeSet);
  const currentRevision = requireText(options.currentRevision, "currentRevision");
  if (action !== APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO) {
    assertAppearanceTransportChangeSetBaseRevision(changeSet, currentRevision);
  }
  const intent = resolveAppearanceTransportChangeSetAction(changeSet, action, options);
  const operationId = requireText(options.operationId, "operation.operationId");
  const generation = state.generation + 1;
  let appliedRecord = null;
  if (action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO) {
    if (options.appliedRecord !== undefined || typeof options.resolveAppliedRecord !== "function") {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
        "Undo requires a trusted applied-record resolver.",
        { literalAppliedRecord: options.appliedRecord !== undefined },
      );
    }
    let resolvedRecord;
    try {
      resolvedRecord = options.resolveAppliedRecord(deepFreeze({
        exactChangeSetIdentity: intent.exactChangeSetIdentity,
        changeSetId: changeSet.id,
        currentRevision,
      }));
    } catch (error) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
        "The trusted applied-record resolver failed.",
        { cause: String(error?.message || error || "resolver-failed") },
      );
    }
    if (!isPlainRecord(resolvedRecord)) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
        "The trusted applied-record resolver returned invalid evidence.",
      );
    }
    const rawRecord = requireRecord(resolvedRecord, "operation.appliedRecord");
    assertOnlyKeys(
      rawRecord,
      [
        "exactChangeSetIdentity",
        "recordIdentity",
        "changeSetId",
        "baseRevision",
        "appliedRevision",
        "applyOperationId",
        "applyGeneration",
        "status",
        "consumed",
      ],
      "operation.appliedRecord",
    );
    appliedRecord = deepFreeze(cloneContractValue(rawRecord, "operation.appliedRecord"));
    const appliedBaseRevision = typeof appliedRecord.baseRevision === "string"
      ? appliedRecord.baseRevision.trim()
      : "";
    const appliedRevision = typeof appliedRecord.appliedRevision === "string"
      ? appliedRecord.appliedRevision.trim()
      : "";
    if (appliedRecord.exactChangeSetIdentity !== intent.exactChangeSetIdentity
      || appliedRecord.recordIdentity !== createAppliedRecordIdentity(appliedRecord)
      || appliedRecord.changeSetId !== changeSet.id
      || !appliedBaseRevision
      || appliedRecord.baseRevision !== appliedBaseRevision
      || !appliedRevision
      || appliedRecord.appliedRevision !== appliedRevision
      || appliedRevision === appliedBaseRevision
      || appliedRecord.baseRevision !== changeSet.baseRevision
      || appliedRecord.appliedRevision !== currentRevision
      || typeof appliedRecord.applyOperationId !== "string"
      || !appliedRecord.applyOperationId.trim()
      || !Number.isSafeInteger(appliedRecord.applyGeneration)
      || appliedRecord.applyGeneration < 1
      || appliedRecord.status !== "applied"
      || appliedRecord.consumed !== false) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
        "Undo requires the current, unconsumed applied record.",
        {
          actualChangeSetId: appliedRecord.changeSetId,
          expectedChangeSetId: changeSet.id,
          exactIdentityMatches: appliedRecord.exactChangeSetIdentity === intent.exactChangeSetIdentity,
          baseRevision: appliedRecord.baseRevision,
          expectedBaseRevision: changeSet.baseRevision,
          appliedRevision: appliedRecord.appliedRevision,
          currentRevision,
          applyOperationId: appliedRecord.applyOperationId,
          applyGeneration: appliedRecord.applyGeneration,
          status: appliedRecord.status,
          consumed: appliedRecord.consumed,
        },
      );
    }
  } else if (options.appliedRecord !== undefined || options.resolveAppliedRecord !== undefined) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "Only Undo accepts an applied record.",
      { action },
    );
  }
  const nextState = deepFreeze({
    phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.PREPARING,
    action,
    operationId,
    changeSetId: changeSet.id,
    generation,
    intent,
    appliedRecord,
    historyRecord: null,
    recoveryExpectation: null,
    recoveryResult: null,
    completionReceipt: null,
    error: null,
  });
  OPERATION_STATE_BRAND.add(nextState);
  return nextState;
}

export function listAppearanceTransportOperationNextPhases(value) {
  const state = normalizeOperationState(value);
  if (!ACTION_VALUES.includes(state.action)) return [];
  return [...(OPERATION_TRANSITIONS[state.phase] || [])];
}

function normalizeRecoverableError(value) {
  const error = requireRecord(value, "operation.error");
  assertOnlyKeys(error, ["code", "message", "details"], "operation.error");
  return deepFreeze({
    code: requireText(error.code, "operation.error.code"),
    message: requireText(error.message, "operation.error.message"),
    details: cloneContractValue(requireRecord(error.details || {}, "operation.error.details"), "operation.error.details"),
    retryable: true,
  });
}

function normalizeRecoveryExpectation(value, state) {
  if (!isPlainRecord(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recoverable error requires a recovery checkpoint expectation.",
    );
  }
  assertOnlyKeys(
    value,
    ["checkpointIdentity", "expectedRecoveryRevision"],
    "operation.recoveryExpectation",
  );
  const expectedRecoveryRevision = requireText(
    value.expectedRecoveryRevision,
    "operation.recoveryExpectation.expectedRecoveryRevision",
  );
  const operationRecoveryRevision = state.action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO
    ? state.appliedRecord?.appliedRevision
    : state.intent?.baseRevision;
  if (expectedRecoveryRevision !== operationRecoveryRevision) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recovery expectation must restore the operation revision.",
      { expectedRecoveryRevision, operationRecoveryRevision },
    );
  }
  return deepFreeze({
    checkpointIdentity: requireText(
      value.checkpointIdentity,
      "operation.recoveryExpectation.checkpointIdentity",
    ),
    expectedRecoveryRevision,
  });
}

function normalizeRecoveryResult(value, expectation) {
  if (!isPlainRecord(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recoverable error completion requires restoration evidence.",
    );
  }
  const result = requireRecord(value, "operation.recoveryResult");
  assertOnlyKeys(
    result,
    ["checkpointIdentity", "restoredRevision", "renderCompleted", "disposition"],
    "operation.recoveryResult",
  );
  const normalized = deepFreeze(cloneContractValue(result, "operation.recoveryResult"));
  if (normalized.checkpointIdentity !== expectation?.checkpointIdentity
    || normalized.restoredRevision !== expectation?.expectedRecoveryRevision
    || normalized.renderCompleted !== true
    || normalized.disposition !== "restored") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recoverable error completion requires restoration evidence.",
      { recoveryResult: normalized, recoveryExpectation: expectation || null },
    );
  }
  return normalized;
}

function createAppliedRecordIdentity(record) {
  return JSON.stringify({
    exactChangeSetIdentity: record.exactChangeSetIdentity,
    changeSetId: record.changeSetId,
    applyOperationId: record.applyOperationId,
    applyGeneration: record.applyGeneration,
    appliedRevision: record.appliedRevision,
  });
}

function resolveTrustedApplyReceipt(state, resolver) {
  if (typeof resolver !== "function") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "Apply Ready requires a trusted owner receipt resolver.",
    );
  }
  let value;
  try {
    value = resolver(deepFreeze({
      exactChangeSetIdentity: state.intent.exactChangeSetIdentity,
      changeSetId: state.changeSetId,
      operationId: state.operationId,
      generation: state.generation,
      baseRevision: state.intent.baseRevision,
    }));
  } catch (error) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted Apply receipt resolver failed.",
      { cause: String(error?.message || error || "apply-receipt-resolver-failed") },
    );
  }
  if (!isPlainRecord(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted Apply receipt resolver returned invalid evidence.",
    );
  }
  assertOnlyKeys(
    value,
    [
      "exactChangeSetIdentity",
      "changeSetId",
      "operationId",
      "generation",
      "baseRevision",
      "appliedRevision",
      "status",
    ],
    "operation.applyReceipt",
  );
  const receipt = deepFreeze(cloneContractValue(value, "operation.applyReceipt"));
  const appliedRevision = typeof receipt.appliedRevision === "string"
    ? receipt.appliedRevision.trim()
    : "";
  if (receipt.exactChangeSetIdentity !== state.intent.exactChangeSetIdentity
    || receipt.changeSetId !== state.changeSetId
    || receipt.operationId !== state.operationId
    || receipt.generation !== state.generation
    || receipt.baseRevision !== state.intent.baseRevision
    || !appliedRevision
    || appliedRevision === state.intent.baseRevision
    || receipt.status !== "applied") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted Apply receipt does not match the operation.",
      { receipt, operationId: state.operationId, generation: state.generation },
    );
  }
  return deepFreeze({ ...receipt, appliedRevision });
}

function resolveTrustedUndoReceipt(state, resolver) {
  if (typeof resolver !== "function") {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "Undo Ready requires a trusted history-owner consume receipt.",
    );
  }
  let value;
  try {
    value = resolver(deepFreeze({
      recordIdentity: state.appliedRecord.recordIdentity,
      exactChangeSetIdentity: state.appliedRecord.exactChangeSetIdentity,
      changeSetId: state.appliedRecord.changeSetId,
      applyOperationId: state.appliedRecord.applyOperationId,
      applyGeneration: state.appliedRecord.applyGeneration,
      appliedRevision: state.appliedRecord.appliedRevision,
      undoOperationId: state.operationId,
      undoGeneration: state.generation,
    }));
  } catch (error) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted history-owner consume resolver failed.",
      { cause: String(error?.message || error || "undo-consume-resolver-failed") },
    );
  }
  if (!isPlainRecord(value)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted history-owner consume resolver returned invalid evidence.",
    );
  }
  assertOnlyKeys(
    value,
    [
      "recordIdentity",
      "exactChangeSetIdentity",
      "changeSetId",
      "applyOperationId",
      "applyGeneration",
      "appliedRevision",
      "undoOperationId",
      "undoGeneration",
      "undoRevision",
      "status",
      "consumed",
    ],
    "operation.undoReceipt",
  );
  const receipt = deepFreeze(cloneContractValue(value, "operation.undoReceipt"));
  const undoRevision = typeof receipt.undoRevision === "string" ? receipt.undoRevision.trim() : "";
  if (receipt.recordIdentity !== state.appliedRecord.recordIdentity
    || receipt.exactChangeSetIdentity !== state.appliedRecord.exactChangeSetIdentity
    || receipt.changeSetId !== state.appliedRecord.changeSetId
    || receipt.applyOperationId !== state.appliedRecord.applyOperationId
    || receipt.applyGeneration !== state.appliedRecord.applyGeneration
    || receipt.appliedRevision !== state.appliedRecord.appliedRevision
    || receipt.undoOperationId !== state.operationId
    || receipt.undoGeneration !== state.generation
    || !undoRevision
    || undoRevision === state.appliedRecord.appliedRevision
    || receipt.status !== "undone"
    || receipt.consumed !== true) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
      "The trusted Undo consume receipt does not match the applied record.",
      { receipt, recordIdentity: state.appliedRecord.recordIdentity },
    );
  }
  return deepFreeze({ ...receipt, undoRevision });
}

function transitionAppearanceTransportOperation(value, options = {}) {
  const state = normalizeOperationState(value);
  const operationId = requireText(options.operationId, "operation.operationId");
  const generation = options.generation;
  if (state.operationId !== operationId || state.generation !== generation) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.OPERATION_STALE,
      "The operation completion belongs to a stale operation id.",
      {
        actualOperationId: operationId,
        expectedOperationId: state.operationId,
        actualGeneration: generation,
        expectedGeneration: state.generation,
      },
    );
  }
  const nextPhase = String(options.phase || "").trim().toLowerCase();
  const allowedNextPhases = listAppearanceTransportOperationNextPhases(state);
  if (!allowedNextPhases.includes(nextPhase)) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "The requested operation phase transition is invalid.",
      { action: state.action, currentPhase: state.phase, nextPhase, allowedNextPhases },
    );
  }
  if (nextPhase !== APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR && options.error !== undefined) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Only Recoverable error can carry an operation error payload.",
      { nextPhase },
    );
  }
  const recoveringToReady = state.phase === APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR
    && nextPhase === APPEARANCE_TRANSPORT_OPERATION_PHASE.READY;
  const recoveryResult = recoveringToReady
    ? normalizeRecoveryResult(options.recoveryResult, state.recoveryExpectation)
    : null;
  if (!recoveringToReady && options.recoveryResult !== undefined) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recovery evidence is only accepted when closing a recoverable error.",
    );
  }
  const enteringRecoverableError = nextPhase === APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR;
  const recoveryExpectation = enteringRecoverableError
    ? normalizeRecoveryExpectation(options.recoveryExpectation, state)
    : (recoveringToReady ? null : state.recoveryExpectation);
  if (!enteringRecoverableError && options.recoveryExpectation !== undefined) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Recovery expectation is only accepted when entering a recoverable error.",
    );
  }
  let historyRecord = state.historyRecord;
  let completionReceipt = state.completionReceipt;
  if (state.action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY
    && state.phase === APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING
    && nextPhase === APPEARANCE_TRANSPORT_OPERATION_PHASE.READY) {
    if (options.appliedRevision !== undefined) {
      fail(
        APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
        "Apply Ready accepts only a trusted owner receipt resolver.",
      );
    }
    completionReceipt = resolveTrustedApplyReceipt(state, options.resolveApplyReceipt);
    const recordDraft = {
      exactChangeSetIdentity: state.intent.exactChangeSetIdentity,
      changeSetId: state.changeSetId,
      baseRevision: state.intent.baseRevision,
      appliedRevision: completionReceipt.appliedRevision,
      applyOperationId: state.operationId,
      applyGeneration: state.generation,
      status: "applied",
      consumed: false,
    };
    historyRecord = deepFreeze(cloneContractValue({
      ...recordDraft,
      recordIdentity: createAppliedRecordIdentity(recordDraft),
    }, "operation.historyRecord"));
  } else if (state.action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO
    && state.phase === APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING
    && nextPhase === APPEARANCE_TRANSPORT_OPERATION_PHASE.READY) {
    completionReceipt = resolveTrustedUndoReceipt(state, options.consumeAppliedRecord);
    historyRecord = deepFreeze(cloneContractValue({
      ...state.appliedRecord,
      status: "undone",
      consumed: true,
      undoOperationId: state.operationId,
      undoGeneration: state.generation,
      undoRevision: completionReceipt.undoRevision,
    }, "operation.historyRecord"));
  } else if (options.appliedRevision !== undefined
    || options.resolveApplyReceipt !== undefined
    || options.consumeAppliedRecord !== undefined) {
    fail(
      APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
      "Applied revision is only accepted when Apply reaches Ready.",
    );
  }
  const nextState = deepFreeze({
    ...state,
    phase: nextPhase,
    historyRecord,
    completionReceipt,
    recoveryExpectation,
    recoveryResult,
    error: nextPhase === APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR
      ? normalizeRecoverableError(options.error)
      : null,
  });
  OPERATION_STATE_BRAND.add(nextState);
  return nextState;
}

export function advanceAppearanceTransportOperation(value, event = {}) {
  return transitionAppearanceTransportOperation(value, event);
}
