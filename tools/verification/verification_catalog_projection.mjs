import {
  normalizeVerificationMetadataSource,
  projectVerificationGatePolicySignals,
  VERIFICATION_GATE_POLICY_AUTHORITY,
  VERIFICATION_GATE_POLICY_AUTHORITY_IDENTITY,
  VERIFICATION_METADATA_SOURCE,
  VERIFICATION_METADATA_SOURCE_IDENTITY,
  verificationGatePolicySignalsDigest,
  verificationMetadataSourceDigest,
} from "./verification_catalog_source.mjs";

function clone(value) {
  return structuredClone(value);
}

function single(record, field) {
  const values = record[field];
  if (!Array.isArray(values) || values.length !== 1) {
    throw new Error(`verification-metadata-source-singular-field:${record.id}:${field}`);
  }
  return values[0];
}

function entrypointPolicy(record) {
  const policy = VERIFICATION_METADATA_SOURCE.entrypointPolicies[record.entrypointPolicyIndex];
  if (!policy) throw new Error(`verification-metadata-source-policy-gap:${record.id}`);
  return clone(policy);
}

function commonProjection(record) {
  return {
    id: record.id,
    commandRef: record.commandRef,
    sourceRefs: clone(record.sourceRefs),
    domain: single(record, "domains"),
    ownerHint: single(record, "ownerHints"),
    layer: single(record, "tiers"),
    cost: record.cost,
    resourceLocks: clone(record.resourceLocks),
    executionOwner: single(record, "executionOwners"),
    ciProfile: single(record, "profiles"),
    platforms: clone(record.platforms),
    entrypointPolicy: entrypointPolicy(record),
  };
}

export function buildCanonicalVerificationRecords() {
  return VERIFICATION_METADATA_SOURCE.records
    .filter((record) => record.verification !== null)
    .sort((left, right) => left.verificationOrder - right.verificationOrder)
    .map((record) => {
      const common = commonProjection(record);
      const projected = {
        id: common.id,
        commandRef: common.commandRef,
        ...clone(record.verification),
        sourceRefs: common.sourceRefs,
        domain: common.domain,
        ownerHint: common.ownerHint,
        layer: common.layer,
        cost: common.cost,
        resourceLocks: common.resourceLocks,
        executionOwner: common.executionOwner,
        ciProfile: common.ciProfile,
      };
      if (!(common.platforms.length === 1 && common.platforms[0] === "all")) {
        projected.platforms = common.platforms;
      }
      if (record.selector?.guidance) projected.guidance = clone(record.selector.guidance);
      return projected;
    });
}

export function buildCanonicalRouteIndex() {
  return VERIFICATION_METADATA_SOURCE.records
    .filter((record) => record.selector !== null)
    .sort((left, right) => left.selectorOrder - right.selectorOrder)
    .map((record) => {
      const common = commonProjection(record);
      const projected = {
        id: common.id,
        commandRef: common.commandRef,
        sourceRef: common.sourceRefs.join(","),
        domain: common.domain,
        ownerHint: common.ownerHint,
        layer: common.layer,
        cost: common.cost,
        resourceLocks: common.resourceLocks,
        executionOwner: common.executionOwner,
        ciProfile: common.ciProfile,
        entrypointPolicy: common.entrypointPolicy,
        authoritySource: "canonical-metadata-source",
      };
      if (!(common.platforms.length === 1 && common.platforms[0] === "all")) {
        projected.platforms = common.platforms;
      }
      if (record.selector.guidance) projected.guidance = clone(record.selector.guidance);
      return projected;
    });
}

export function verificationMetadataSourceSummary() {
  const records = VERIFICATION_METADATA_SOURCE.records;
  const commands = new Set(records.map((record) => record.commandRef));
  return {
    schemaVersion: VERIFICATION_METADATA_SOURCE.schemaVersion,
    kind: VERIFICATION_METADATA_SOURCE.kind,
    identity: clone(VERIFICATION_METADATA_SOURCE_IDENTITY),
    authoredSurfaces: 1,
    packageScriptCount: Object.keys(VERIFICATION_METADATA_SOURCE.packageScripts).length,
    contributorRecords: records.length,
    verificationRecordProjectionCount: records.filter((record) => record.verification !== null).length,
    routeProjectionCount: records.filter((record) => record.selector !== null).length,
    commandCount: commands.size,
    policyCount: VERIFICATION_METADATA_SOURCE.entrypointPolicies.length,
    supersederCount: Object.keys(VERIFICATION_METADATA_SOURCE.supersession).length,
    supersessionEdgeCount: Object.values(VERIFICATION_METADATA_SOURCE.supersession).flat().length,
  };
}

export {
  normalizeVerificationMetadataSource,
  projectVerificationGatePolicySignals,
  VERIFICATION_GATE_POLICY_AUTHORITY,
  VERIFICATION_GATE_POLICY_AUTHORITY_IDENTITY,
  VERIFICATION_METADATA_SOURCE,
  VERIFICATION_METADATA_SOURCE_IDENTITY,
  verificationGatePolicySignalsDigest,
  verificationMetadataSourceDigest,
};
