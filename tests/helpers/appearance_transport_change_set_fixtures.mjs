import {
  createAppearancePresetFromRuntimeState,
  createIntensityFieldsState,
  updateIntensityFieldChannel,
} from "../../js/core/state.js";
import {
  APPEARANCE_TRANSPORT_CHANGE_SET_ACTION,
  APPEARANCE_TRANSPORT_OPERATION_PHASE,
  advanceAppearanceTransportOperation,
  beginAppearanceTransportOperation,
  createAppearanceTransportOperationState,
} from "../../js/core/appearance_transport_change_set.js";
import { createTransportWorkbenchStateOwner } from "../../js/ui/toolbar/transport_workbench_state_owner.js";

export function createRuntimeAppearanceState({
  pointLon = 139.7,
  pointLat = 35.7,
  pointStrength = 1.65,
} = {}) {
  const intensityFields = updateIntensityFieldChannel(
    createIntensityFieldsState(),
    "urbanGlow",
    (channel) => {
      channel.enabled = true;
      channel.revision = 3;
      channel.points = [{
        id: "metro-glow",
        lon: pointLon,
        lat: pointLat,
        strength: pointStrength,
        radiusDeg: 6,
        falloff: "smooth",
      }];
    },
  );
  return {
    styleConfig: {
      ocean: {
        fillColor: "#123456",
        opacity: 0.66,
      },
      urban: {
        mode: "manual",
        color: "#445566",
        fillOpacity: 0.48,
      },
    },
    showUrban: false,
    showPhysical: true,
    showRivers: false,
    showTransport: true,
    showAirports: true,
    showStrategicResourceMarkers: true,
    strategicChoroplethMetric: "steel",
    referenceImageState: {
      dataUrl: "data:image/png;base64,private",
    },
    intensityFields,
  };
}
export function createTransportChangeSetSnapshot({
  familyId = "road",
  activePackId = "germany_road",
  familyConfig = {},
  overviewOpacity = 0.72,
} = {}) {
  const runtimeState = {
    transportWorkbenchUi: {
      activeFamily: familyId,
      activePackId,
      activePackIdByFamily: { [familyId]: activePackId },
      familyConfigs: { [familyId]: familyConfig },
      displayConfigs: {},
    },
    transportWorkbenchPointDeltas: {},
  };
  const owner = createTransportWorkbenchStateOwner(runtimeState);
  owner.ensureUiState();
  return {
    schemaVersion: 1,
    familyId,
    activePackId,
    workbench: {
      familyConfig: owner.getWorkingConfig(familyId),
      displayConfig: owner.getDisplayConfig(familyId),
      pointDeltas: owner.getEditOverlay(familyId),
    },
    mainMap: {
      overviewConfig: { opacity: overviewOpacity },
      layerVisibility: true,
    },
  };
}

const FAMILY_BY_PACK_ID = Object.freeze({
  germany_road: "road",
  usa_road: "road",
  france_rail: "rail",
  usa_airport: "airport",
  usa_port: "port",
});

export function getPassedPackGateReport(packId) {
  return {
    packId,
    family: FAMILY_BY_PACK_ID[packId] || "",
    passed: true,
    reasons: [],
  };
}

export function transitionOperation(operation, phase, extra = {}) {
  return advanceAppearanceTransportOperation(operation, {
    operationId: operation.operationId,
    generation: operation.generation,
    phase,
    ...extra,
  });
}

export function completeApply(changeSet, {
  operationId = "apply-operation",
  appliedRevision = "project-revision-18",
  getPackGateReport = getPassedPackGateReport,
} = {}) {
  let operation = beginAppearanceTransportOperation(createAppearanceTransportOperationState(), {
    action: APPEARANCE_TRANSPORT_CHANGE_SET_ACTION.APPLY,
    operationId,
    changeSet,
    currentRevision: changeSet.baseRevision,
    getPackGateReport,
  });
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.APPLYING);
  operation = transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.RENDERING);
  return transitionOperation(operation, APPEARANCE_TRANSPORT_OPERATION_PHASE.READY, {
    resolveApplyReceipt: (query) => ({
      ...query,
      appliedRevision,
      status: "applied",
    }),
  });
}

export function createAppliedRecordIdentityForTest(record) {
  return JSON.stringify({
    exactChangeSetIdentity: record.exactChangeSetIdentity,
    changeSetId: record.changeSetId,
    applyOperationId: record.applyOperationId,
    applyGeneration: record.applyGeneration,
    appliedRevision: record.appliedRevision,
  });
}

export function createAppearanceTransportChangeSetFixture({
  familyId = "road",
  activePackId = "germany_road",
  includeAppearance = true,
} = {}) {
  const beforeTransport = createTransportChangeSetSnapshot({ familyId, activePackId, overviewOpacity: 0.64 });
  const afterTransport = JSON.parse(JSON.stringify(beforeTransport));
  afterTransport.mainMap.overviewConfig.opacity = 0.88;
  const before = { transport: beforeTransport };
  const after = { transport: afterTransport };
  if (includeAppearance) {
    before.appearance = createAppearancePresetFromRuntimeState(createRuntimeAppearanceState({
      pointStrength: 1.2,
    })).snapshot;
    after.appearance = createAppearancePresetFromRuntimeState({
      ...createRuntimeAppearanceState({ pointStrength: 1.8 }),
      showUrban: true,
    }).snapshot;
  }
  return {
    input: {
      id: `appearance-transport-${familyId}`,
      createdAt: "2026-08-14T08:00:00+08:00",
      baseRevision: "project-revision-17",
      before,
      after,
      provenance: { source: "transport-workbench", sampleId: "japan-demo" },
    },
    beforeTransport,
    afterTransport,
  };
}
