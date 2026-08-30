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

const canonicalCatalogProjectionBundles = new WeakSet();

function clone(value) {
  return structuredClone(value);
}

function freezeProjection(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeProjection(child);
  return Object.freeze(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareText);
}

function projectionContext(source) {
  const normalized = normalizeVerificationMetadataSource(source);
  const identity = {
    schemaVersion: 1,
    kind: "verification-metadata-source-identity",
    algorithm: "sha256",
    digest: verificationMetadataSourceDigest(normalized),
  };
  return { source: normalized, identity };
}

function projectionEnvelope(kind, identity, key, value) {
  return {
    schemaVersion: 1,
    kind,
    authorityIdentity: clone(identity),
    [key]: clone(value),
  };
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

export function buildCanonicalHeavyDependencyGroups(source = VERIFICATION_METADATA_SOURCE) {
  const context = projectionContext(source);
  const groups = context.source.projectionAuthority.heavyDependencyGroups.map((group) => {
    return {
      id: group.id,
      description: group.description,
      patterns: clone(group.patterns),
    };
  });
  return projectionEnvelope(
    "verification-heavy-dependency-groups-projection",
    context.identity,
    "heavyDependencyGroups",
    groups,
  );
}

export function buildCanonicalPackageAliases(source = VERIFICATION_METADATA_SOURCE) {
  const context = projectionContext(source);
  const knownCommands = new Set([
    ...Object.keys(context.source.packageScripts),
    ...context.source.records.map((record) => record.commandRef),
  ]);
  const exactAliases = new Map();
  for (const [commandRef, command] of Object.entries(context.source.packageScripts)) {
    const match = /^npm run\s+([^\s]+)$/u.exec(command.trim());
    if (!match) continue;
    const targetCommandRef = match[1];
    if (!knownCommands.has(targetCommandRef) || targetCommandRef === commandRef) {
      throw new Error(`verification-metadata-package-alias-target:${commandRef}:${targetCommandRef}`);
    }
    exactAliases.set(commandRef, targetCommandRef);
  }
  const aliasCommands = uniqueSorted([
    ...exactAliases.keys(),
    ...Object.keys(context.source.supersession),
  ]);
  const aliases = aliasCommands.map((commandRef) => {
    if (!knownCommands.has(commandRef)) {
      throw new Error(`verification-metadata-package-alias-command:${commandRef}`);
    }
    const supersedes = clone(context.source.supersession[commandRef] || []);
    for (const superseded of supersedes) {
      if (!knownCommands.has(superseded) || superseded === commandRef) {
        throw new Error(`verification-metadata-package-alias-supersession:${commandRef}:${superseded}`);
      }
    }
    const projected = { commandRef, supersedes };
    if (exactAliases.has(commandRef)) projected.targetCommandRef = exactAliases.get(commandRef);
    return projected;
  });
  return projectionEnvelope(
    "verification-package-aliases-projection",
    context.identity,
    "packageAliases",
    aliases,
  );
}

export function buildCanonicalPrProfiles(source = VERIFICATION_METADATA_SOURCE) {
  const context = projectionContext(source);
  const profiles = context.source.projectionAuthority.prProfiles.map((profile) => ({ id: profile }));
  return projectionEnvelope(
    "verification-pr-profiles-projection",
    context.identity,
    "prProfiles",
    profiles,
  );
}

export function buildCanonicalNightlyTopology(source = VERIFICATION_METADATA_SOURCE) {
  const context = projectionContext(source);
  const roles = context.source.projectionAuthority.nightlyRoles.map((role) => {
    return {
      id: role.id,
      shards: clone(role.shards),
    };
  });
  const shards = roles.flatMap((role) => role.shards.map((shard, index) => ({
    id: `${role.id}:${shard}`,
    roleId: role.id,
    shard,
    shardIndex: index + 1,
    shardCount: role.shards.length,
  }))).sort((left, right) => compareText(left.id, right.id));
  return projectionEnvelope(
    "verification-nightly-topology-projection",
    context.identity,
    "nightlyTopology",
    {
      roles,
      shards,
      finalDependencies: clone(context.source.projectionAuthority.nightlyFinalDependencies),
    },
  );
}

export function buildCanonicalDocumentationProjection(source = VERIFICATION_METADATA_SOURCE) {
  const context = projectionContext(source);
  const prefixes = context.source.projectionAuthority.documentation.sourceRefPrefixes;
  const recordsBySourceRef = new Map();
  for (const record of context.source.records) {
    for (const sourceRef of record.sourceRefs) {
      if (!prefixes.some((prefix) => sourceRef.startsWith(prefix))) continue;
      if (!recordsBySourceRef.has(sourceRef)) recordsBySourceRef.set(sourceRef, []);
      recordsBySourceRef.get(sourceRef).push(record);
    }
  }
  const documentation = [...recordsBySourceRef.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([sourceRef]) => ({ sourceRef }));
  if (documentation.length === 0) {
    throw new Error("verification-metadata-documentation-projection-empty");
  }
  return projectionEnvelope(
    "verification-documentation-projection",
    context.identity,
    "documentation",
    documentation,
  );
}

export function buildCanonicalCatalogProjectionBundle(source = VERIFICATION_METADATA_SOURCE) {
  const envelopes = [
    ["heavyDependencyGroups", buildCanonicalHeavyDependencyGroups(source)],
    ["packageAliases", buildCanonicalPackageAliases(source)],
    ["prProfiles", buildCanonicalPrProfiles(source)],
    ["nightlyTopology", buildCanonicalNightlyTopology(source)],
    ["documentation", buildCanonicalDocumentationProjection(source)],
  ];
  const authorityDigests = new Set(envelopes.map(([, envelope]) => envelope.authorityIdentity.digest));
  if (authorityDigests.size !== 1) {
    throw new Error("verification-metadata-catalog-projection-identity-mismatch");
  }
  const bundle = freezeProjection({
    authorityIdentity: clone(envelopes[0][1].authorityIdentity),
    projections: Object.fromEntries(envelopes.map(([key, envelope]) => [key, clone(envelope[key])])),
  });
  canonicalCatalogProjectionBundles.add(bundle);
  return bundle;
}

export function isCanonicalCatalogProjectionBundle(value) {
  return Boolean(value && typeof value === "object" && canonicalCatalogProjectionBundles.has(value));
}

export function buildCanonicalCatalogProjections(source = VERIFICATION_METADATA_SOURCE) {
  return buildCanonicalCatalogProjectionBundle(source).projections;
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
    heavyDependencyGroupCount: VERIFICATION_METADATA_SOURCE.projectionAuthority.heavyDependencyGroups.length,
    packageAliasCount: buildCanonicalPackageAliases().packageAliases.length,
    prProfileCount: VERIFICATION_METADATA_SOURCE.projectionAuthority.prProfiles.length,
    nightlyRoleCount: VERIFICATION_METADATA_SOURCE.projectionAuthority.nightlyRoles.length,
    documentationProjectionCount: buildCanonicalDocumentationProjection().documentation.length,
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
