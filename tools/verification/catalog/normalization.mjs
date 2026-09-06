import { createHash } from "node:crypto";

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values, field) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) {
    throw new Error(`verification-metadata-source-duplicate-array-value:${field}:${[...new Set(duplicates)].sort(compareText).join(",")}`);
  }
  return [...values].sort(compareText);
}

function sortedUniqueProjectionStrings(values, field) {
  if (!Array.isArray(values)
    || values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error(`verification-metadata-source-projection-invalid-array:${field}`);
  }
  return sortedUnique(values, field);
}

const RECORD_SET_FIELDS = Object.freeze([
  "sourceRefs",
  "ownerHints",
  "domains",
  "tiers",
  "resourceLocks",
  "executionOwners",
  "profiles",
  "platforms",
]);
export const GATE_POLICY_SIGNAL_NAMES = Object.freeze([
  "requiresStrictTno",
  "requiresDemo",
  "requiresTestInfra",
  "requiresDeployPreflight",
]);
const GATE_POLICY_SOURCE_FIELDS = Object.freeze([
  "domains",
  "sourceRefs",
  "entrypoints",
  "sharedRisks",
]);
const PROJECTION_AUTHORITY_FIELDS = Object.freeze([
  "schemaVersion",
  "kind",
  "heavyDependencyGroups",
  "prProfiles",
  "nightlyRoles",
  "nightlyFinalDependencies",
  "documentation",
]);

function requireExactObjectFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`verification-metadata-source-projection-invalid:${label}`);
  }
  const actual = Object.keys(value).sort(compareText);
  const expected = [...fields].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`verification-metadata-source-projection-fields:${label}`);
  }
}

function normalizeProjectionAuthority(authority, source) {
  requireExactObjectFields(authority, PROJECTION_AUTHORITY_FIELDS, "authority");
  if (authority.schemaVersion !== 1 || authority.kind !== "verification-catalog-projection-authority") {
    throw new Error("verification-metadata-source-projection-invalid:authority-identity");
  }
  const normalized = structuredClone(authority);
  if (!Array.isArray(normalized.heavyDependencyGroups)
    || !Array.isArray(normalized.prProfiles)
    || !Array.isArray(normalized.nightlyRoles)
    || !Array.isArray(normalized.nightlyFinalDependencies)) {
    throw new Error("verification-metadata-source-projection-invalid:authority-arrays");
  }
  const sourceRefs = new Set(source.records.flatMap((record) => record.sourceRefs));
  const profiles = new Set(source.enums?.ciProfiles || []);
  const groupIds = new Set();
  for (const [index, group] of normalized.heavyDependencyGroups.entries()) {
    requireExactObjectFields(group, ["id", "description", "patterns"], `heavyDependencyGroups.${index}`);
    if (typeof group.id !== "string" || !group.id || groupIds.has(group.id)) {
      throw new Error(`verification-metadata-source-projection-heavy-group:${group.id || "missing"}`);
    }
    if (typeof group.description !== "string" || !group.description.trim()) {
      throw new Error(`verification-metadata-source-projection-heavy-description:${group.id}`);
    }
    groupIds.add(group.id);
    group.patterns = sortedUniqueProjectionStrings(
      group.patterns,
      `projectionAuthority.heavyDependencyGroups.${group.id}.patterns`,
    );
    for (const pattern of group.patterns) {
      if (!sourceRefs.has(pattern)) {
        throw new Error(`verification-metadata-source-projection-source-gap:heavyDependencyGroups.${group.id}:${pattern}`);
      }
    }
  }
  normalized.heavyDependencyGroups.sort((left, right) => compareText(left.id, right.id));
  normalized.prProfiles = sortedUniqueProjectionStrings(normalized.prProfiles, "projectionAuthority.prProfiles");
  for (const profile of normalized.prProfiles) {
    if (!profiles.has(profile)) {
      throw new Error(`verification-metadata-source-projection-profile-gap:prProfiles:${profile}`);
    }
  }
  const roleIds = new Set();
  for (const [index, role] of normalized.nightlyRoles.entries()) {
    requireExactObjectFields(role, ["id", "shards"], `nightlyRoles.${index}`);
    if (typeof role.id !== "string" || !role.id || roleIds.has(role.id)) {
      throw new Error(`verification-metadata-source-projection-nightly-role:${role.id || "missing"}`);
    }
    roleIds.add(role.id);
    role.shards = sortedUniqueProjectionStrings(
      role.shards,
      `projectionAuthority.nightlyRoles.${role.id}.shards`,
    );
    if (role.shards.length === 0) {
      throw new Error(`verification-metadata-source-projection-nightly-shards:${role.id}`);
    }
  }
  normalized.nightlyRoles.sort((left, right) => compareText(left.id, right.id));
  normalized.nightlyFinalDependencies = sortedUniqueProjectionStrings(
    normalized.nightlyFinalDependencies,
    "projectionAuthority.nightlyFinalDependencies",
  );
  if (normalized.nightlyFinalDependencies.length === 0
    || normalized.nightlyFinalDependencies.some((roleId) => !roleIds.has(roleId) || roleId === "final")) {
    throw new Error("verification-metadata-source-projection-nightly-final-dependencies");
  }
  requireExactObjectFields(normalized.documentation, ["sourceRefPrefixes"], "documentation");
  normalized.documentation.sourceRefPrefixes = sortedUniqueProjectionStrings(
    normalized.documentation.sourceRefPrefixes,
    "projectionAuthority.documentation.sourceRefPrefixes",
  );
  if (normalized.documentation.sourceRefPrefixes.length === 0
    || normalized.documentation.sourceRefPrefixes.some((prefix) => typeof prefix !== "string" || !prefix.endsWith("/"))) {
    throw new Error("verification-metadata-source-projection-documentation-prefix");
  }
  return normalized;
}

function normalizeGatePolicyAuthority(policy) {
  if (!policy
    || policy.schemaVersion !== 1
    || policy.kind !== "verification-gate-policy-authority"
    || policy.mode !== "observation-only"
    || policy.requiredExecutionSetEffect !== "unchanged") {
    throw new Error("verification-gate-policy-authority-invalid");
  }
  const normalized = structuredClone(policy);
  const observedSignalNames = Object.keys(normalized.signals || {}).sort(compareText);
  if (JSON.stringify(observedSignalNames) !== JSON.stringify([...GATE_POLICY_SIGNAL_NAMES].sort(compareText))) {
    throw new Error("verification-gate-policy-authority-signal-set");
  }
  for (const signalName of GATE_POLICY_SIGNAL_NAMES) {
    const matchAny = normalized.signals[signalName]?.matchAny;
    if (!matchAny || Object.keys(matchAny).some((field) => !GATE_POLICY_SOURCE_FIELDS.includes(field))) {
      throw new Error(`verification-gate-policy-authority-signal:${signalName}`);
    }
    for (const field of GATE_POLICY_SOURCE_FIELDS) {
      if (!Array.isArray(matchAny[field])) {
        throw new Error(`verification-gate-policy-authority-signal:${signalName}:${field}`);
      }
      matchAny[field] = sortedUnique(matchAny[field], `gatePolicy.signals.${signalName}.matchAny.${field}`);
    }
  }
  const riskIds = new Set();
  for (const risk of normalized.sharedRisks || []) {
    if (!risk?.id || riskIds.has(risk.id)) {
      throw new Error(`verification-gate-policy-authority-shared-risk:${risk?.id || "missing"}`);
    }
    riskIds.add(risk.id);
  }
  normalized.sharedRisks.sort((left, right) => compareText(left.id, right.id));
  for (const signalName of GATE_POLICY_SIGNAL_NAMES) {
    for (const riskId of normalized.signals[signalName].matchAny.sharedRisks) {
      if (!riskIds.has(riskId)) {
        throw new Error(`verification-gate-policy-authority-shared-risk-gap:${signalName}:${riskId}`);
      }
    }
  }
  return normalized;
}

export function normalizeVerificationMetadataSource(source) {
  const normalized = structuredClone(source);
  const recordIds = new Set();
  for (const record of normalized.records || []) {
    if (recordIds.has(record.id)) {
      throw new Error(`verification-metadata-source-duplicate-record:${record.id}`);
    }
    recordIds.add(record.id);
    for (const field of RECORD_SET_FIELDS) {
      if (!Array.isArray(record[field])) {
        throw new Error(`verification-metadata-source-invalid-array:${record.id}:${field}`);
      }
      record[field] = sortedUnique(record[field], `${record.id}.${field}`);
    }
  }
  normalized.records.sort((left, right) => compareText(left.id, right.id));
  normalized.projectionAuthority = normalizeProjectionAuthority(normalized.projectionAuthority, normalized);
  normalized.gatePolicy = normalizeGatePolicyAuthority(normalized.gatePolicy);
  for (const [superseder, superseded] of Object.entries(normalized.supersession || {})) {
    normalized.supersession[superseder] = sortedUnique(superseded, `supersession.${superseder}`);
  }
  for (const [index, policy] of (normalized.entrypointPolicies || []).entries()) {
    policy.eligibleEntrypoints = sortedUnique(policy.eligibleEntrypoints, `entrypointPolicies.${index}.eligibleEntrypoints`);
  }
  const canonicalGatePolicySources = {
    domains: new Set(normalized.records.flatMap((record) => record.domains)),
    sourceRefs: new Set(normalized.records.flatMap((record) => record.sourceRefs)),
    entrypoints: new Set(normalized.entrypointPolicies.flatMap((policy) => policy.eligibleEntrypoints)),
    sharedRisks: new Set(normalized.gatePolicy.sharedRisks.map((risk) => risk.id)),
  };
  for (const signalName of GATE_POLICY_SIGNAL_NAMES) {
    for (const field of GATE_POLICY_SOURCE_FIELDS) {
      for (const value of normalized.gatePolicy.signals[signalName].matchAny[field]) {
        if (!canonicalGatePolicySources[field].has(value)) {
          throw new Error(`verification-gate-policy-authority-source-gap:${signalName}:${field}:${value}`);
        }
      }
    }
  }
  return normalized;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function verificationMetadataSourceDigest(source) {
  const normalized = normalizeVerificationMetadataSource(source);
  return createHash("sha256").update(stableJson(normalized)).digest("hex");
}

export function gatePolicyAuthorityDigest(authority) {
  return createHash("sha256").update(stableJson(authority)).digest("hex");
}

export function verificationGatePolicySignalsDigest(signals) {
  return createHash("sha256").update(stableJson(signals)).digest("hex");
}
