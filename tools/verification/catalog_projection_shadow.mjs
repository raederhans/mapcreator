import { createHash } from "node:crypto";

import { isCanonicalCatalogProjectionBundle } from "./verification_catalog_projection.mjs";

export const CATALOG_PROJECTION_KEYS = Object.freeze([
  "heavyDependencyGroups",
  "packageAliases",
  "prProfiles",
  "nightlyTopology",
  "documentation",
]);

const SHA256_RE = /^[0-9a-f]{64}$/u;
const GIT_SHA_RE = /^[0-9a-f]{40}$/u;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function assertExactProjectionSet(projections, label) {
  if (!projections || typeof projections !== "object" || Array.isArray(projections)) {
    throw new Error(`catalog-projection-shadow-invalid-${label}`);
  }
  const keys = Object.keys(projections).sort();
  const expected = [...CATALOG_PROJECTION_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`catalog-projection-shadow-${label}-keys`);
  }
}

function normalizeSourceIdentity(identity) {
  if (!identity
    || identity.schemaVersion !== 1
    || identity.kind !== "verification-metadata-source-identity"
    || identity.algorithm !== "sha256"
    || !SHA256_RE.test(String(identity.digest || ""))) {
    throw new Error("catalog-projection-shadow-invalid-source-identity");
  }
  return structuredClone(identity);
}

function normalizeRunIdentity(runIdentity) {
  if (!runIdentity
    || typeof runIdentity.runId !== "string"
    || runIdentity.runId.trim() === ""
    || !GIT_SHA_RE.test(String(runIdentity.verificationSha || ""))
    || !GIT_SHA_RE.test(String(runIdentity.verificationTreeSha || ""))) {
    throw new Error("catalog-projection-shadow-invalid-run-identity");
  }
  return {
    runId: runIdentity.runId.trim(),
    verificationSha: runIdentity.verificationSha,
    verificationTreeSha: runIdentity.verificationTreeSha,
  };
}

export function compareCatalogProjections({ canonicalBundle, legacy }) {
  if (!isCanonicalCatalogProjectionBundle(canonicalBundle)) {
    throw new Error("catalog-projection-shadow-invalid-canonical-bundle");
  }
  const canonical = canonicalBundle.projections;
  assertExactProjectionSet(canonical, "canonical");
  assertExactProjectionSet(legacy, "legacy");
  const normalizedSourceIdentity = normalizeSourceIdentity(canonicalBundle.authorityIdentity);
  const projections = {};
  const mismatches = [];
  for (const key of CATALOG_PROJECTION_KEYS) {
    const canonicalDigest = digest(canonical[key]);
    const legacyDigest = digest(legacy[key]);
    const equal = canonicalDigest === legacyDigest;
    projections[key] = { equal, canonicalDigest, legacyDigest };
    if (!equal) mismatches.push({ projection: key, canonicalDigest, legacyDigest });
  }
  const canonicalDigests = Object.fromEntries(CATALOG_PROJECTION_KEYS.map((key) => [key, projections[key].canonicalDigest]));
  const legacyDigests = Object.fromEntries(CATALOG_PROJECTION_KEYS.map((key) => [key, projections[key].legacyDigest]));
  return {
    schemaVersion: 1,
    kind: "catalog-projection-shadow-comparison",
    equal: mismatches.length === 0,
    zeroSpawn: true,
    sourceIdentity: normalizedSourceIdentity,
    projectionOrder: [...CATALOG_PROJECTION_KEYS],
    canonicalDigest: digest(canonicalDigests),
    legacyDigest: digest(legacyDigests),
    projections,
    mismatches,
  };
}

function assertComparison(comparison) {
  if (!comparison
    || comparison.schemaVersion !== 1
    || comparison.kind !== "catalog-projection-shadow-comparison"
    || comparison.zeroSpawn !== true
    || !comparison.sourceIdentity
    || !Array.isArray(comparison.mismatches)
    || JSON.stringify(comparison.projectionOrder) !== JSON.stringify(CATALOG_PROJECTION_KEYS)
    || !comparison.projections
    || JSON.stringify(Object.keys(comparison.projections).sort()) !== JSON.stringify([...CATALOG_PROJECTION_KEYS].sort())) {
    throw new Error("catalog-projection-shadow-invalid-comparison");
  }
  normalizeSourceIdentity(comparison.sourceIdentity);
  const canonicalDigests = {};
  const legacyDigests = {};
  const expectedMismatches = [];
  for (const key of CATALOG_PROJECTION_KEYS) {
    const projection = comparison.projections[key];
    if (!projection
      || typeof projection.equal !== "boolean"
      || !SHA256_RE.test(String(projection.canonicalDigest || ""))
      || !SHA256_RE.test(String(projection.legacyDigest || ""))
      || projection.equal !== (projection.canonicalDigest === projection.legacyDigest)) {
      throw new Error("catalog-projection-shadow-invalid-comparison");
    }
    canonicalDigests[key] = projection.canonicalDigest;
    legacyDigests[key] = projection.legacyDigest;
    if (!projection.equal) {
      expectedMismatches.push({
        projection: key,
        canonicalDigest: projection.canonicalDigest,
        legacyDigest: projection.legacyDigest,
      });
    }
  }
  if (comparison.canonicalDigest !== digest(canonicalDigests)
    || comparison.legacyDigest !== digest(legacyDigests)
    || comparison.equal !== (expectedMismatches.length === 0)
    || stableJson(comparison.mismatches) !== stableJson(expectedMismatches)) {
    throw new Error("catalog-projection-shadow-invalid-comparison");
  }
}

function receiptPayload(receipt) {
  const { receiptDigest: _receiptDigest, ...payload } = receipt;
  return payload;
}

function assertPreviousReceipt(receipt) {
  if (receipt === null || receipt === undefined) return null;
  if (!receipt
    || receipt.schemaVersion !== 1
    || receipt.kind !== "catalog-projection-shadow-receipt"
    || !Number.isInteger(receipt.runOrdinal)
    || receipt.runOrdinal < 1
    || !Number.isInteger(receipt.consecutiveGreenRuns)
    || receipt.consecutiveGreenRuns < 0
    || !Number.isInteger(receipt.requiredGreenRuns)
    || receipt.requiredGreenRuns < 1
    || receipt.legacyRetained !== true
    || receipt.retirementEligible !== (receipt.consecutiveGreenRuns >= receipt.requiredGreenRuns)
    || !SHA256_RE.test(String(receipt.receiptDigest || ""))
    || digest(receiptPayload(receipt)) !== receipt.receiptDigest) {
    throw new Error("catalog-projection-shadow-invalid-previous-receipt");
  }
  assertComparison(receipt.comparison);
  const sourceIdentity = normalizeSourceIdentity(receipt.sourceIdentity);
  normalizeRunIdentity(receipt.runIdentity);
  if (receipt.comparison.sourceIdentity.digest !== sourceIdentity.digest
    || (receipt.comparison.equal ? receipt.consecutiveGreenRuns < 1 : receipt.consecutiveGreenRuns !== 0)) {
    throw new Error("catalog-projection-shadow-invalid-previous-receipt");
  }
  return receipt;
}

export function advanceCatalogProjectionShadowReceipt({
  comparison,
  sourceIdentity,
  runIdentity,
  previousReceipt = null,
  requiredGreenRuns = 10,
} = {}) {
  assertComparison(comparison);
  if (!Number.isInteger(requiredGreenRuns) || requiredGreenRuns < 1) {
    throw new Error("catalog-projection-shadow-invalid-required-green-runs");
  }
  const normalizedSourceIdentity = normalizeSourceIdentity(sourceIdentity);
  if (comparison.sourceIdentity.digest !== normalizedSourceIdentity.digest) {
    throw new Error("catalog-projection-shadow-source-identity-mismatch");
  }
  const normalizedRunIdentity = normalizeRunIdentity(runIdentity);
  const previous = assertPreviousReceipt(previousReceipt);
  if (previous?.runIdentity?.runId === normalizedRunIdentity.runId) {
    throw new Error(`catalog-projection-shadow-duplicate-run:${normalizedRunIdentity.runId}`);
  }

  const sameIdentity = previous !== null
    && previous.sourceIdentity.digest === normalizedSourceIdentity.digest
    && previous.comparison.canonicalDigest === comparison.canonicalDigest;
  const consecutiveGreenRuns = comparison.equal
    ? (sameIdentity && previous.comparison.equal ? previous.consecutiveGreenRuns + 1 : 1)
    : 0;
  const receipt = {
    schemaVersion: 1,
    kind: "catalog-projection-shadow-receipt",
    runOrdinal: (previous?.runOrdinal || 0) + 1,
    requiredGreenRuns,
    consecutiveGreenRuns,
    retirementEligible: consecutiveGreenRuns >= requiredGreenRuns,
    legacyRetained: true,
    sourceIdentity: normalizedSourceIdentity,
    runIdentity: normalizedRunIdentity,
    comparison: structuredClone(comparison),
    previousReceiptDigest: previous?.receiptDigest || null,
  };
  receipt.receiptDigest = digest(receipt);
  return receipt;
}
