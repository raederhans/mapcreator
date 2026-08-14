import assert from "node:assert/strict";
import test from "node:test";

import {
  APPEARANCE_TRANSPORT_CHANGE_SET_ACTION,
  APPEARANCE_TRANSPORT_CHANGE_SET_ERROR,
  APPEARANCE_TRANSPORT_CHANGE_SET_KIND,
  APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION,
  AppearanceTransportChangeSetError,
  assertAppearanceTransportChangeSetBaseRevision,
  beginAppearanceTransportOperation,
  compareAppearanceTransportChangeSet,
  createAppearanceTransportChangeSet,
  createAppearanceTransportOperationState,
  getAppearanceTransportChangeSetCapabilities,
  parseAppearanceTransportChangeSet,
} from "../js/core/appearance_transport_change_set.js";
import * as contractApi from "../js/core/appearance_transport_change_set_contract.js";
import {
  completeApply,
  createAppearanceTransportChangeSetFixture,
  createTransportChangeSetSnapshot,
  getPassedPackGateReport,
} from "./helpers/appearance_transport_change_set_fixtures.mjs";

test("appearance and transport owner snapshots form an immutable versioned change-set", () => {
  assert.equal(createAppearanceTransportChangeSet, contractApi.createAppearanceTransportChangeSet);
  assert.equal(parseAppearanceTransportChangeSet, contractApi.parseAppearanceTransportChangeSet);
  const { input, afterTransport } = createAppearanceTransportChangeSetFixture();
  const changeSet = createAppearanceTransportChangeSet(input);

  assert.equal(changeSet.schemaVersion, APPEARANCE_TRANSPORT_CHANGE_SET_SCHEMA_VERSION);
  assert.equal(changeSet.kind, APPEARANCE_TRANSPORT_CHANGE_SET_KIND);
  assert.equal(changeSet.createdAt, "2026-08-14T00:00:00.000Z");
  assert.equal(changeSet.after.transport.familyId, "road");
  assert.equal(changeSet.after.transport.activePackId, "germany_road");
  assert.equal(changeSet.after.transport.applyCompatibility, "main_map_bridge");
  assert.deepEqual(compareAppearanceTransportChangeSet(changeSet), {
    appearanceChanged: true,
    transportChanged: true,
    changedScopes: ["appearance", "transport"],
    hasChanges: true,
  });
  assert.equal(Object.isFrozen(changeSet), true);
  assert.equal(Object.isFrozen(changeSet.after.transport.workbench.familyConfig), true);

  afterTransport.mainMap.overviewConfig.opacity = 0.1;
  assert.equal(changeSet.after.transport.mainMap.overviewConfig.opacity, 0.88);
});

test("Preview Compare Apply and Undo resolve deterministic domain intents", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const capabilities = getAppearanceTransportChangeSetCapabilities(changeSet, {
    getPackGateReport: getPassedPackGateReport,
  });
  Object.values(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION).forEach((action) => {
    assert.equal(capabilities[action].supported, true, action);
    assert.equal(capabilities[action].advisory, true, action);
  });

  const begin = (action, extra = {}) => beginAppearanceTransportOperation(
    createAppearanceTransportOperationState(),
    {
      action,
      operationId: `${action}-intent`,
      changeSet,
      currentRevision: action === APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO
        ? "project-revision-18"
        : changeSet.baseRevision,
      getPackGateReport: getPassedPackGateReport,
      ...extra,
    },
  ).intent;
  const preview = begin(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.PREVIEW);
  const compare = begin(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.COMPARE);
  const apply = begin(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY);
  const appliedRecord = completeApply(changeSet).historyRecord;
  const undo = begin(APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.UNDO, {
    resolveAppliedRecord: () => appliedRecord,
  });

  assert.deepEqual(preview.sessionTarget, changeSet.after);
  assert.equal(preview.canonicalTarget, null);
  assert.equal(preview.commitsState, false);
  assert.deepEqual(compare.sessionTarget, changeSet.after);
  assert.equal(compare.canonicalTarget, null);
  assert.deepEqual(compare.comparison.changedScopes, ["appearance", "transport"]);
  assert.equal(compare.commitsState, false);
  assert.equal(apply.sessionTarget, null);
  assert.deepEqual(apply.canonicalTarget, changeSet.after);
  assert.equal(apply.recordsHistory, true);
  assert.equal(undo.sessionTarget, null);
  assert.deepEqual(undo.canonicalTarget, changeSet.before);
  assert.deepEqual(undo.canonicalBaseline, changeSet.after);
  assert.equal(undo.recordsHistory, false);
  assert.equal(assertAppearanceTransportChangeSetBaseRevision(changeSet, "project-revision-17").id, changeSet.id);
  assert.throws(
    () => assertAppearanceTransportChangeSetBaseRevision(changeSet, "project-revision-18"),
    (error) => error instanceof AppearanceTransportChangeSetError
      && error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.BASE_STALE,
  );
});

test("road rail airport and port commit authority follows the active pack source gate", () => {
  for (const [familyId, activePackId] of [
    ["road", "germany_road"],
    ["rail", "france_rail"],
    ["airport", "usa_airport"],
    ["port", "usa_port"],
  ]) {
    const passed = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture({
      familyId,
      activePackId,
      includeAppearance: false,
    }).input);
    const passedCapabilities = getAppearanceTransportChangeSetCapabilities(passed, {
      getPackGateReport: getPassedPackGateReport,
    });
    assert.equal(passedCapabilities.apply.supported, true, familyId);
    assert.equal(passedCapabilities.apply.reason, "", familyId);

    for (const [getPackGateReport, reason] of [
      [undefined, "source_pending"],
      [(packId) => ({ ...getPassedPackGateReport(packId), passed: false }), "source_failed"],
      [() => getPassedPackGateReport("germany_road"), familyId === "road" ? "" : "source_stale"],
      [(packId) => ({ packId, passed: true }), "source_stale"],
      [(packId) => ({ packId, family: "", passed: true }), "source_stale"],
      [() => ({ packId: "", family: familyId, passed: true }), "source_stale"],
    ]) {
      if (!reason) continue;
      const capabilities = getAppearanceTransportChangeSetCapabilities(passed, { getPackGateReport });
      assert.equal(capabilities.preview.supported, true, `${familyId}:${reason}:preview`);
      assert.equal(capabilities.compare.supported, true, `${familyId}:${reason}:compare`);
      assert.equal(capabilities.apply.supported, false, `${familyId}:${reason}:apply`);
      assert.equal(capabilities.apply.reason, reason, `${familyId}:${reason}:reason`);
      assert.throws(
        () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
          action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
          operationId: `${familyId}-${reason}`,
          changeSet: passed,
          currentRevision: passed.baseRevision,
          getPackGateReport,
        }),
        (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.ACTION_UNSUPPORTED
          && error.details.reason === reason,
      );
    }
  }
});

test("pack gate resolver failures preserve structured root-cause evidence", () => {
  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  const getPackGateReport = () => {
    throw new TypeError("gate owner exploded");
  };
  const capabilities = getAppearanceTransportChangeSetCapabilities(changeSet, { getPackGateReport });
  assert.equal(capabilities.apply.supported, false);
  assert.equal(capabilities.apply.reason, "source_authority_error");
  assert.deepEqual(capabilities.apply.evidence, {
    name: "TypeError",
    message: "gate owner exploded",
  });
  assert.throws(
    () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
      operationId: "gate-owner-error",
      changeSet,
      currentRevision: changeSet.baseRevision,
      getPackGateReport,
    }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.ACTION_UNSUPPORTED
      && error.details.reason === "source_authority_error"
      && error.details.evidence.message === "gate owner exploded",
  );
});

test("snapshots strip forged gate authority and four runtime families reject foreign packs", () => {
  for (const authorityKey of ["packGateReport", "gateReport"]) {
    const { input } = createAppearanceTransportChangeSetFixture();
    input.after.transport.workbench.familyConfig[authorityKey] = {
      packId: "germany_road",
      passed: true,
    };
    const changeSet = createAppearanceTransportChangeSet(input);
    assert.equal(Object.hasOwn(changeSet.after.transport.workbench.familyConfig, authorityKey), false);
    const capabilities = getAppearanceTransportChangeSetCapabilities(changeSet);
    assert.equal(capabilities.apply.supported, false);
    assert.equal(capabilities.apply.reason, "source_pending");
  }

  for (const [familyId, foreignPackId] of [
    ["road", "france_rail"],
    ["rail", "usa_airport"],
    ["airport", "usa_port"],
    ["port", "germany_road"],
  ]) {
    const { input } = createAppearanceTransportChangeSetFixture({
      familyId,
      activePackId: foreignPackId,
      includeAppearance: false,
    });
    assert.throws(
      () => createAppearanceTransportChangeSet(input),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
      familyId,
    );
  }
});

test("current gate authority selects the target pack when before and after use different packs", () => {
  const { input } = createAppearanceTransportChangeSetFixture({ includeAppearance: false });
  input.after.transport = createTransportChangeSetSnapshot({
    familyId: "road",
    activePackId: "usa_road",
    overviewOpacity: 0.88,
  });
  const changeSet = createAppearanceTransportChangeSet(input);
  const requestedPackIds = [];
  const getPackGateReport = (packId) => {
    requestedPackIds.push(packId);
    return getPassedPackGateReport(packId);
  };
  const capabilities = getAppearanceTransportChangeSetCapabilities(changeSet, { getPackGateReport });
  assert.equal(capabilities.apply.supported, true);
  assert.equal(capabilities.undo.supported, true);
  assert.deepEqual(requestedPackIds, ["usa_road", "germany_road"]);
});

test("preview-only Transport families keep Preview and Compare available while commit actions fail closed", () => {
  const { input } = createAppearanceTransportChangeSetFixture({
    familyId: "mineral_resources",
    activePackId: "japan_mineral_resources",
    includeAppearance: false,
  });
  const changeSet = createAppearanceTransportChangeSet(input);
  const capabilities = getAppearanceTransportChangeSetCapabilities(changeSet);

  assert.equal(changeSet.after.transport.applyCompatibility, "preview_only");
  assert.equal(capabilities.preview.supported, true);
  assert.equal(capabilities.compare.supported, true);
  assert.equal(capabilities.apply.supported, false);
  assert.equal(capabilities.undo.supported, false);
  assert.throws(
    () => beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
      action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
      operationId: "preview-only-apply",
      changeSet,
      currentRevision: changeSet.baseRevision,
    }),
    (error) => error instanceof AppearanceTransportChangeSetError
      && error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.ACTION_UNSUPPORTED,
  );
});

test("change-set parsing rejects future versions, scope drift, and session-only carriers", () => {
  const { input } = createAppearanceTransportChangeSetFixture();
  const changeSet = createAppearanceTransportChangeSet(input);
  assert.throws(
    () => parseAppearanceTransportChangeSet({ ...changeSet, schemaVersion: 2 }),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.VERSION_UNSUPPORTED,
  );

  const scopeDrift = JSON.parse(JSON.stringify(input));
  delete scopeDrift.after.appearance;
  assert.throws(
    () => createAppearanceTransportChangeSet(scopeDrift),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.SCOPE_INVALID,
  );

  const carrierInput = createAppearanceTransportChangeSetFixture().input;
  carrierInput.after.transport.workbench.familyConfig = new Map([["cache", true]]);
  assert.throws(
    () => createAppearanceTransportChangeSet(carrierInput),
    (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
  );

  for (const provenance of [null, false, 0, "locale-import"]) {
    const invalidProvenance = createAppearanceTransportChangeSetFixture().input;
    invalidProvenance.provenance = provenance;
    assert.throws(
      () => createAppearanceTransportChangeSet(invalidProvenance),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID
        && error.details.path === "changeSet.provenance",
    );
  }
});

test("change-set cloning rejects poison record keys and freezes null-prototype contract records", () => {
  for (const poisonKey of ["__proto__", "prototype", "constructor"]) {
    const { input } = createAppearanceTransportChangeSetFixture();
    input.provenance = JSON.parse(`{"safe":true,"${poisonKey}":{"polluted":true}}`);
    assert.throws(
      () => createAppearanceTransportChangeSet(input),
      (error) => error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID
        && error.details.poisonKeys.includes(poisonKey),
      poisonKey,
    );
  }

  const changeSet = createAppearanceTransportChangeSet(createAppearanceTransportChangeSetFixture().input);
  assert.equal(Object.getPrototypeOf(changeSet.provenance), null);
  assert.equal(Object.isFrozen(changeSet.provenance), true);
  assert.equal(Object.getPrototypeOf(changeSet.after.transport.workbench.familyConfig), null);
  assert.equal(Object.hasOwn(changeSet.after.transport.workbench.familyConfig, "packGateReport"), false);
});

test("createdAt requires RFC3339 with an explicit timezone before normalization", () => {
  const zulu = createAppearanceTransportChangeSetFixture().input;
  zulu.createdAt = "2026-08-14T00:00:00Z";
  const offset = createAppearanceTransportChangeSetFixture().input;
  offset.createdAt = "2026-08-14T08:00:00+08:00";

  assert.equal(
    createAppearanceTransportChangeSet(zulu).createdAt,
    createAppearanceTransportChangeSet(offset).createdAt,
  );

  for (const createdAt of ["2026-08-14T08:00:00", "August 14, 2026 08:00:00"]) {
    const invalid = createAppearanceTransportChangeSetFixture().input;
    invalid.createdAt = createdAt;
    assert.throws(
      () => createAppearanceTransportChangeSet(invalid),
      (error) => error instanceof AppearanceTransportChangeSetError
        && error.code === APPEARANCE_TRANSPORT_CHANGE_SET_ERROR.INVALID,
      createdAt,
    );
  }
});
