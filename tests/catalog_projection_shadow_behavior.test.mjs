import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCatalogProjectionShadowReceipt,
  CATALOG_PROJECTION_KEYS,
  compareCatalogProjections,
} from "../tools/verification/catalog_projection_shadow.mjs";
import {
  buildLegacyCatalogProjections,
  buildRepositoryCatalogProjectionShadowComparison,
} from "../tools/verification/catalog_projection_legacy.mjs";
import { buildCanonicalCatalogProjectionBundle } from "../tools/verification/verification_catalog_projection.mjs";
import { VERIFICATION_METADATA_SOURCE } from "../tools/verification/verification_catalog_source.mjs";

function canonicalFixture() {
  const canonicalBundle = buildCanonicalCatalogProjectionBundle();
  return { canonicalBundle, legacy: structuredClone(canonicalBundle.projections) };
}

function runIdentity(index) {
  return {
    runId: `run-${index}`,
    verificationSha: index.toString(16).padStart(40, "0"),
    verificationTreeSha: (index + 100).toString(16).padStart(40, "0"),
  };
}

test("catalog projection shadow compares all canonical surfaces without spawning", () => {
  const { canonicalBundle, legacy } = canonicalFixture();
  const comparison = compareCatalogProjections({ canonicalBundle, legacy });
  assert.equal(comparison.equal, true);
  assert.equal(comparison.zeroSpawn, true);
  assert.deepEqual(comparison.projectionOrder, CATALOG_PROJECTION_KEYS);
  assert.deepEqual(comparison.mismatches, []);
  assert.ok(Object.values(comparison.projections).every((entry) => entry.equal));
});

test("catalog projection shadow reports the exact drifted surface", () => {
  for (const key of CATALOG_PROJECTION_KEYS) {
    const { canonicalBundle, legacy } = canonicalFixture();
    legacy[key] = { key, label: "drift" };
    const comparison = compareCatalogProjections({ canonicalBundle, legacy });
    assert.equal(comparison.equal, false);
    assert.deepEqual(comparison.mismatches.map((entry) => entry.projection), [key]);
  }
});

test("catalog projection shadow rejects missing, unknown, and malformed surfaces", () => {
  const { canonicalBundle, legacy } = canonicalFixture();
  const missing = structuredClone(legacy);
  delete missing.documentation;
  assert.throws(
    () => compareCatalogProjections({ canonicalBundle, legacy: missing }),
    /catalog-projection-shadow-legacy-keys/,
  );
  assert.throws(
    () => compareCatalogProjections({ canonicalBundle, legacy: { ...legacy, unknown: {} } }),
    /catalog-projection-shadow-legacy-keys/,
  );
  assert.throws(
    () => compareCatalogProjections({
      canonicalBundle: structuredClone(canonicalBundle),
      legacy,
    }),
    /catalog-projection-shadow-invalid-canonical-bundle/,
  );
  assert.throws(
    () => { canonicalBundle.authorityIdentity = { ...canonicalBundle.authorityIdentity, digest: "b".repeat(64) }; },
    TypeError,
  );
  assert.throws(
    () => { canonicalBundle.projections.documentation.push({ sourceRef: "docs/forged.md" }); },
    TypeError,
  );
});

test("ten consecutive same-identity green receipts unlock retirement without deleting legacy", () => {
  const { canonicalBundle, legacy } = canonicalFixture();
  const comparison = compareCatalogProjections({ canonicalBundle, legacy });
  let receipt = null;
  for (let index = 1; index <= 10; index += 1) {
    receipt = advanceCatalogProjectionShadowReceipt({
      comparison,
      sourceIdentity: comparison.sourceIdentity,
      runIdentity: runIdentity(index),
      previousReceipt: receipt,
    });
    assert.equal(receipt.consecutiveGreenRuns, index);
    assert.equal(receipt.retirementEligible, index === 10);
    assert.equal(receipt.legacyRetained, true);
  }
  assert.equal(receipt.runOrdinal, 10);
  assert.match(receipt.receiptDigest, /^[0-9a-f]{64}$/u);
});

test("drift or canonical identity change resets the green sequence", () => {
  const { canonicalBundle, legacy } = canonicalFixture();
  const green = compareCatalogProjections({ canonicalBundle, legacy });
  const first = advanceCatalogProjectionShadowReceipt({
    comparison: green,
    sourceIdentity: green.sourceIdentity,
    runIdentity: runIdentity(1),
  });
  const driftedLegacy = structuredClone(legacy);
  driftedLegacy.prProfiles = { drift: true };
  const mismatch = compareCatalogProjections({ canonicalBundle, legacy: driftedLegacy });
  const failed = advanceCatalogProjectionShadowReceipt({
    comparison: mismatch,
    sourceIdentity: mismatch.sourceIdentity,
    runIdentity: runIdentity(2),
    previousReceipt: first,
  });
  assert.equal(failed.consecutiveGreenRuns, 0);
  assert.equal(failed.retirementEligible, false);

  const changedSource = structuredClone(VERIFICATION_METADATA_SOURCE);
  changedSource.projectionAuthority.documentation.sourceRefPrefixes.push("docs/active/");
  const changedBundle = buildCanonicalCatalogProjectionBundle(changedSource);
  const changedComparison = compareCatalogProjections({
    canonicalBundle: changedBundle,
    legacy: structuredClone(changedBundle.projections),
  });
  const restarted = advanceCatalogProjectionShadowReceipt({
    comparison: changedComparison,
    sourceIdentity: changedComparison.sourceIdentity,
    runIdentity: runIdentity(3),
    previousReceipt: first,
  });
  assert.equal(restarted.consecutiveGreenRuns, 1);
});

test("receipt chain rejects duplicate runs and tampered prior state", () => {
  const { canonicalBundle, legacy } = canonicalFixture();
  const comparison = compareCatalogProjections({ canonicalBundle, legacy });
  const first = advanceCatalogProjectionShadowReceipt({
    comparison,
    sourceIdentity: comparison.sourceIdentity,
    runIdentity: runIdentity(1),
  });
  assert.throws(
    () => advanceCatalogProjectionShadowReceipt({
      comparison,
      sourceIdentity: comparison.sourceIdentity,
      runIdentity: runIdentity(1),
      previousReceipt: first,
    }),
    /catalog-projection-shadow-duplicate-run/,
  );
  assert.throws(
    () => advanceCatalogProjectionShadowReceipt({
      comparison,
      sourceIdentity: comparison.sourceIdentity,
      runIdentity: runIdentity(2),
      previousReceipt: { ...first, consecutiveGreenRuns: 9 },
    }),
    /catalog-projection-shadow-invalid-previous-receipt/,
  );
  assert.throws(
    () => advanceCatalogProjectionShadowReceipt({
      comparison: { ...comparison, canonicalDigest: "f".repeat(64) },
      sourceIdentity: comparison.sourceIdentity,
      runIdentity: runIdentity(2),
      previousReceipt: first,
    }),
    /catalog-projection-shadow-invalid-comparison/,
  );
  assert.throws(
    () => advanceCatalogProjectionShadowReceipt({
      comparison,
      sourceIdentity: { ...comparison.sourceIdentity, digest: "b".repeat(64) },
      runIdentity: runIdentity(2),
      previousReceipt: first,
    }),
    /catalog-projection-shadow-source-identity-mismatch/,
  );
});

test("historical comparison reports current drift without requiring baseline equality", () => {
  const snapshot = buildLegacyCatalogProjections();
  assert.deepEqual(Object.keys(snapshot).sort(), [...CATALOG_PROJECTION_KEYS].sort());
  assert.ok(snapshot.documentation.length > 0);
  assert.ok(snapshot.documentation.every((entry) => entry.sourceRef.startsWith("docs/")));
  const current = buildRepositoryCatalogProjectionShadowComparison();
  assert.equal(current.zeroSpawn, true);
  assert.equal(current.equal, current.mismatches.length === 0);

  // A legitimate new documentation reference must remain valid metadata. The
  // explicit historical audit reports drift; everyday tests do not demand that
  // the frozen snapshot be rewritten to match it.
  const changedSource = structuredClone(VERIFICATION_METADATA_SOURCE);
  changedSource.records[0].sourceRefs.push("docs/testing/new-contract-reference.md");
  const changedBundle = buildCanonicalCatalogProjectionBundle(changedSource);
  assert.ok(changedBundle.projections.documentation.some((entry) => entry.sourceRef === "docs/testing/new-contract-reference.md"));
  const report = buildRepositoryCatalogProjectionShadowComparison({ canonicalBundle: changedBundle });
  assert.equal(report.equal, false);
  assert.ok(report.mismatches.some((entry) => entry.projection === "documentation"));
  assert.deepEqual(buildLegacyCatalogProjections(), snapshot);
});

test("repository legacy projection detects heavy, alias, profile, Nightly, and docs drift", () => {
  const baseline = buildLegacyCatalogProjections();
  const mutations = {
    heavyDependencyGroups: () => ({
      heavyDependencyGroups: {
        geo_stack: { description: "drift", patterns: baseline.heavyDependencyGroups[0].patterns },
      },
    }),
    packageAliases: () => ({ packageScripts: { "forged-alias": "npm run forged-target" } }),
    prProfiles: () => ({ prWorkflow: "jobs:\n  pr-verify-fast:\n    with:\n      profile: pr-fast\n", perfPrGateWorkflow: "" }),
    nightlyTopology: () => ({ nightlyWorkflow: "jobs:\n  metadata:\n" }),
    documentation: () => ({ verificationRecords: [{ ciProfile: "pr-fast", sourceRefs: [] }] }),
  };
  for (const [projection, mutate] of Object.entries(mutations)) {
    const comparison = buildRepositoryCatalogProjectionShadowComparison({ legacyOptions: mutate() });
    assert.equal(comparison.equal, false, projection);
    assert.ok(comparison.mismatches.some((entry) => entry.projection === projection), projection);
  }
});

test("repository shadow detects canonical PR profile and Nightly topology drift", () => {
  const changedProfile = structuredClone(VERIFICATION_METADATA_SOURCE);
  changedProfile.projectionAuthority.prProfiles = ["demo", "perf-pr-gate", "pr-smoke"];
  const profileComparison = buildRepositoryCatalogProjectionShadowComparison({
    canonicalBundle: buildCanonicalCatalogProjectionBundle(changedProfile),
  });
  assert.equal(profileComparison.equal, false);
  assert.ok(profileComparison.mismatches.some((entry) => entry.projection === "prProfiles"));

  const changedNightly = structuredClone(VERIFICATION_METADATA_SOURCE);
  changedNightly.projectionAuthority.nightlyFinalDependencies = ["metadata"];
  const nightlyComparison = buildRepositoryCatalogProjectionShadowComparison({
    canonicalBundle: buildCanonicalCatalogProjectionBundle(changedNightly),
  });
  assert.equal(nightlyComparison.equal, false);
  assert.ok(nightlyComparison.mismatches.some((entry) => entry.projection === "nightlyTopology"));

  const hiddenRoleProfile = structuredClone(VERIFICATION_METADATA_SOURCE);
  hiddenRoleProfile.projectionAuthority.nightlyRoles[0].profile = "full";
  assert.throws(
    () => buildCanonicalCatalogProjectionBundle(hiddenRoleProfile),
    /verification-metadata-source-projection-fields:nightlyRoles\.0/,
  );
});
