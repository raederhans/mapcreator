import assert from "node:assert/strict";
import test from "node:test";

import {
  APPEARANCE_TRANSPORT_CHANGE_SET_ACTION,
  APPEARANCE_TRANSPORT_CHANGE_SET_ERROR,
  APPEARANCE_TRANSPORT_OPERATION_PHASE,
  advanceAppearanceTransportOperation,
  beginAppearanceTransportOperation,
  createAppearanceTransportChangeSet,
  createAppearanceTransportOperationState,
  listAppearanceTransportOperationNextPhases,
} from "../js/core/appearance_transport_change_set.js";
import * as operationApi from "../js/core/appearance_transport_operation.js";
import {
  completeApply,
  createAppearanceTransportChangeSetFixture,
  createAppliedRecordIdentityForTest,
  getPassedPackGateReport,
  transitionOperation,
} from "./helpers/appearance_transport_change_set_fixtures.mjs";

test("Apply Ready requires an exact trusted owner receipt and a new revision", () => {
  assert.equal(beginAppearanceTransportOperation, operationApi.beginAppearanceTransportOperation);
  assert.equal(advanceAppearanceTransportOperation, operationApi.advanceAppearanceTransportOperation);
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  let operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
    operationId: "apply-receipt",
    changeSet,
    currentRevision: changeSet.baseRevision,
    getPackGateReport: getPassedPackGateReport,
  });
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING);
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING);

  for (const event of [
    {},
    { appliedRevision: "project-revision-18" },
    { resolveApplyReceipt: () => { throw new Error("apply owner failed"); } },
    {
      resolveApplyReceipt: (query) => ({
        ...query,
        appliedRevision: query.baseRevision,
        status: "applied",
      }),
    },
    {
      resolveApplyReceipt: (query) => ({
        ...query,
        operationId: "another-operation",
        appliedRevision: "project-revision-18",
        status: "applied",
      }),
    },
    {
      resolveApplyReceipt: (query) => ({
        ...query,
        appliedRevision: "project-revision-18",
        status: "pending",
      }),
    },
  ]) {
    assert.throws(
      () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, event),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
    );
  }

  const ready = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, {
    resolveApplyReceipt: (query) => ({
      ...query,
      appliedRevision: "project-revision-18",
      status: "applied",
    }),
  });
  assert.equal(ready.completionReceipt.appliedRevision, "project-revision-18");
  assert.equal(ready.historyRecord.recordIdentity.length > 0, true);
  assert.equal(ready.historyRecord.status, "applied");
  assert.equal(ready.historyRecord.consumed, false);
});

test("Preview Compare Apply and Undo share the complete operation lifecycle", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const appliedRecord = completeApply(changeSet).historyRecord;
  for (const action of Object.values(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION)) {
    const undo = action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO;
    let operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
      action,
      operationId: `${action}-operation`,
      changeSet,
      currentRevision: undo ? "project-revision-18" : "project-revision-17",
      getPackGateReport: getPassedPackGateReport,
      ...(undo ? {
        resolveAppliedRecord: () => appliedRecord,
      } : {}),
    });
    assert.equal(operation.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.PREPARING);
    assert.deepEqual(listAppearanceTransportOperationNextPhases(operation), [
      APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING,
      APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR,
    ]);
    for (const phase of [
      APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING,
      APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING,
      APPEARANCE_TRANSPORT_OPERATION_PHASE.READY,
    ]) {
      operation = transitionOperation(operation, phase, {
        ...(action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY
          && phase === APPEARANCE_TRANSPORT_OPERATION_PHASE.READY
          ? {
            resolveApplyReceipt: (query) => ({
              ...query,
              appliedRevision: "project-revision-18",
              status: "applied",
            }),
          }
          : {}),
        ...(action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO
          && phase === APPEARANCE_TRANSPORT_OPERATION_PHASE.READY
          ? {
            consumeAppliedRecord: (query) => ({
              ...query,
              undoRevision: "project-revision-19",
              status: "undone",
              consumed: true,
            }),
          }
          : {}),
      });
    }
    assert.equal(operation.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY);
  }
});

test("Recoverable error retains structured failure evidence and rejects stale completions", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  let operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
    operationId: "apply-17",
    changeSet,
    currentRevision: "project-revision-17",
    getPackGateReport: getPassedPackGateReport,
  });
  const firstGeneration = operation.generation;
  assert.throws(
    () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR, {
      error: {
        code: "TRANSPORT_PACK_LOAD_FAILED",
        message: "The selected Transport pack could not be prepared.",
        details: {},
      },
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
  );
  assert.throws(
    () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR, {
      error: {
        code: "TRANSPORT_PACK_LOAD_FAILED",
        message: "The selected Transport pack could not be prepared.",
        details: {},
      },
      recoveryExpectation: {
        checkpointIdentity: "checkpoint:apply-17:wrong-revision",
        expectedRecoveryRevision: "project-revision-18",
      },
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
  );
  operation = advanceAppearanceTransportOperation(operation, {
    operationId: "apply-17",
    generation: firstGeneration,
    phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR,
    error: {
      code: "TRANSPORT_PACK_LOAD_FAILED",
      message: "The selected Transport pack could not be prepared.",
      details: { familyId: "road", packId: "germany_road" },
    },
    recoveryExpectation: {
      checkpointIdentity: "checkpoint:apply-17:1",
      expectedRecoveryRevision: "project-revision-17",
    },
  });

  assert.equal(operation.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.RECOVERABLE_ERROR);
  assert.equal(operation.error.code, "TRANSPORT_PACK_LOAD_FAILED");
  assert.equal(operation.error.retryable, true);
  assert.equal(operation.recoveryExpectation.checkpointIdentity, "checkpoint:apply-17:1");
  assert.throws(
    () => advanceAppearanceTransportOperation(operation, {
      operationId: "apply-18",
      generation: firstGeneration,
      phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.PREPARING,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.OPERATION_STALE,
  );

  assert.throws(
    () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
  );
  for (const recoveryResult of [
    {
      checkpointIdentity: "checkpoint:wrong",
      restoredRevision: "project-revision-17",
      renderCompleted: true,
      disposition: "restored",
    },
    {
      checkpointIdentity: "checkpoint:apply-17:1",
      restoredRevision: "project-revision-18",
      renderCompleted: true,
      disposition: "restored",
    },
    {
      checkpointIdentity: "checkpoint:apply-17:1",
      restoredRevision: "project-revision-17",
      renderCompleted: true,
      disposition: "abandoned",
    },
  ]) {
    assert.throws(
      () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, {
        recoveryResult,
      }),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
    );
  }
  const recovered = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, {
    recoveryResult: {
      checkpointIdentity: "checkpoint:apply-17:1",
      restoredRevision: "project-revision-17",
      renderCompleted: true,
      disposition: "restored",
    },
  });
  assert.equal(recovered.recoveryResult.renderCompleted, true);
  assert.equal(Object.isFrozen(recovered.recoveryResult), true);

  assert.throws(
    () => beginAppearanceTransportOperation(operation, {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
      operationId: "apply-17",
      changeSet,
      currentRevision: "project-revision-17",
      getPackGateReport: getPassedPackGateReport,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
  );

  operation = beginAppearanceTransportOperation(recovered, {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
    operationId: "apply-17",
    changeSet,
    currentRevision: "project-revision-17",
    getPackGateReport: getPassedPackGateReport,
  });
  assert.equal(operation.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.PREPARING);
  assert.equal(operation.error, null);
  assert.equal(operation.generation, firstGeneration + 1);
  assert.throws(
    () => advanceAppearanceTransportOperation(operation, {
      operationId: "apply-17",
      generation: firstGeneration,
      phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.OPERATION_STALE,
  );
});

test("Undo validates applied revision, consumption, identity, and immutable history evidence", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const appliedReady = completeApply(changeSet, {
    operationId: "apply-for-undo",
    appliedRevision: "project-revision-18",
  });
  const appliedRecord = appliedReady.historyRecord;
  assert.equal(appliedRecord.applyOperationId, "apply-for-undo");
  assert.equal(appliedRecord.applyGeneration, 1);
  assert.equal(appliedRecord.status, "applied");
  assert.equal(Object.isFrozen(appliedRecord), true);
  const operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
    operationId: "undo-18",
    changeSet,
    currentRevision: "project-revision-18",
    getPackGateReport: getPassedPackGateReport,
    resolveAppliedRecord: () => appliedRecord,
  });
  assert.equal(Object.isFrozen(operation.appliedRecord), true);
  assert.equal(Object.getPrototypeOf(operation.appliedRecord), null);
  assert.equal(operation.appliedRecord.consumed, false);

  const sameRevisionRecord = {
    ...appliedRecord,
    appliedRevision: changeSet.baseRevision,
  };
  sameRevisionRecord.recordIdentity = createAppliedRecordIdentityForTest(sameRevisionRecord);
  assert.throws(
    () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
      operationId: "same-revision-record-rejected",
      changeSet,
      currentRevision: changeSet.baseRevision,
      getPackGateReport: getPassedPackGateReport,
      resolveAppliedRecord: () => sameRevisionRecord,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
  );

  assert.throws(
    () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
      operationId: "literal-undo-rejected",
      changeSet,
      currentRevision: "project-revision-18",
      getPackGateReport: getPassedPackGateReport,
      appliedRecord,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID
      && error.details.literalAppliedRecord === true,
  );

  for (const [override, currentRevision] of [
    [{ consumed: true }, "project-revision-18"],
    [{ changeSetId: "another-change-set" }, "project-revision-18"],
    [{ baseRevision: "project-revision-16" }, "project-revision-18"],
    [{ exactChangeSetIdentity: `${appliedRecord.exactChangeSetIdentity}:stale` }, "project-revision-18"],
    [{ applyOperationId: "" }, "project-revision-18"],
    [{ applyGeneration: 0 }, "project-revision-18"],
    [{ status: "undone" }, "project-revision-18"],
    [{}, "project-revision-19"],
  ]) {
    assert.throws(
      () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
        action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
        operationId: "undo-rejected",
        changeSet,
        currentRevision,
        getPackGateReport: getPassedPackGateReport,
        resolveAppliedRecord: () => ({ ...appliedRecord, ...override }),
      }),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
    );
  }
});

test("Undo Ready requires an atomic trusted consume receipt and a new undo revision", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const appliedRecord = completeApply(changeSet, {
    operationId: "apply-before-consume",
    appliedRevision: "project-revision-18",
  }).historyRecord;
  let operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO,
    operationId: "undo-consume",
    changeSet,
    currentRevision: appliedRecord.appliedRevision,
    getPackGateReport: getPassedPackGateReport,
    resolveAppliedRecord: () => appliedRecord,
  });
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING);
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING);

  for (const event of [
    {},
    { consumeAppliedRecord: () => { throw new Error("history owner failed"); } },
    {
      consumeAppliedRecord: (query) => ({
        ...query,
        undoRevision: query.appliedRevision,
        status: "undone",
        consumed: true,
      }),
    },
    {
      consumeAppliedRecord: (query) => ({
        ...query,
        recordIdentity: `${query.recordIdentity}:drift`,
        undoRevision: "project-revision-19",
        status: "undone",
        consumed: true,
      }),
    },
    {
      consumeAppliedRecord: (query) => ({
        ...query,
        undoRevision: "project-revision-19",
        status: "undone",
        consumed: false,
      }),
    },
    {
      consumeAppliedRecord: (query) => ({
        ...query,
        undoRevision: "project-revision-19",
        status: "applied",
        consumed: true,
      }),
    },
    {
      consumeAppliedRecord: (query) => ({
        ...query,
        applyOperationId: "wrong-applied-record",
        undoRevision: "project-revision-19",
        status: "undone",
        consumed: true,
      }),
    },
  ]) {
    assert.throws(
      () => transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, event),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.HISTORY_INVALID,
    );
  }

  const ready = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, {
    consumeAppliedRecord: (query) => ({
      ...query,
      undoRevision: "project-revision-19",
      status: "undone",
      consumed: true,
    }),
  });
  assert.equal(ready.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY);
  assert.equal(ready.completionReceipt.recordIdentity, appliedRecord.recordIdentity);
  assert.equal(ready.completionReceipt.undoRevision, "project-revision-19");
  assert.equal(ready.historyRecord.recordIdentity, appliedRecord.recordIdentity);
  assert.equal(ready.historyRecord.status, "undone");
  assert.equal(ready.historyRecord.consumed, true);
  assert.equal(ready.historyRecord.undoRevision, "project-revision-19");
});

test("operation state branding rejects fabricated and JSON-cloned transitions", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW,
    operationId: "branded-preview",
    changeSet,
    currentRevision: changeSet.baseRevision,
  });
  for (const forged of [
    JSON.parse(JSON.stringify(operation)),
    { ...operation },
  ]) {
    assert.throws(
      () => advanceAppearanceTransportOperation(forged, {
        operationId: operation.operationId,
        generation: operation.generation,
        phase: APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING,
      }),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.TRANSITION_INVALID,
    );
  }
});

test("failed atomic begin leaves the branded ready state without a canonical target", () => {
  const initial = createAppearanceTransportOperationState();
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  assert.throws(
    () => beginAppearanceTransportOperation(initial, {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
      operationId: "stale-apply",
      changeSet,
      currentRevision: "project-revision-18",
      getPackGateReport: getPassedPackGateReport,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.BASE_STALE,
  );
  assert.equal(initial.intent, null);
  assert.equal(initial.phase, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY);
});
