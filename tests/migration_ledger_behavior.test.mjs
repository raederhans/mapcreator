import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateMigrationLedger,
  proposeMigrationLedgerReceiptUpdate,
  validateMigrationLedgerDocument,
} from "../tools/verification/migration_ledger_validator.mjs";
import {
  advanceCatalogProjectionShadowReceipt,
  compareCatalogProjections,
} from "../tools/verification/catalog_projection_shadow.mjs";
import {
  buildCanonicalCatalogProjectionBundle,
} from "../tools/verification/verification_catalog_projection.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(REPO_ROOT, "tools", "verification", "migration_ledger.json");
const SCHEMA_PATH = path.join(REPO_ROOT, "tools", "verification", "migration_ledger.schema.json");
const NOW = new Date("2026-08-29T00:00:00.000Z");

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

function checkedInLedger() {
  return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
}

function catalogReceipt(count = 1) {
  // Ledger behavior requires a green receipt fixture, independently of whether
  // the repository's historical projection currently matches the live catalog.
  const canonicalBundle = buildCanonicalCatalogProjectionBundle();
  const comparison = compareCatalogProjections({
    canonicalBundle,
    legacy: structuredClone(canonicalBundle.projections),
  });
  let receipt = null;
  for (let index = 1; index <= count; index += 1) {
    receipt = advanceCatalogProjectionShadowReceipt({
      comparison,
      sourceIdentity: comparison.sourceIdentity,
      runIdentity: {
        runId: `catalog-run-${index}`,
        verificationSha: index.toString(16).padStart(40, "0"),
        verificationTreeSha: (index + 100).toString(16).padStart(40, "0"),
      },
      previousReceipt: receipt,
    });
  }
  return receipt;
}

function pagesReceipt(count = 3, suffix = "a", options = {}) {
  const runIds = options.runIds
    || Array.from({ length: Math.max(count, 1) }, (_, index) => `pages-run-${index + 1}`);
  const receipt = {
    schemaVersion: 1,
    status: "green",
    runId: runIds.at(-1),
    evidenceRunIds: runIds,
    comparisonSha256: "9".repeat(64),
    publicSmoke: "passed",
    identity: {
      gitSha: suffix.repeat(40),
      gitTree: (suffix === "a" ? "b" : "c").repeat(40),
      rollbackDistTree: (suffix === "a" ? "d" : "e").repeat(40),
      manifestSha256: "1".repeat(64),
      treeSha256: "2".repeat(64),
    },
    previousReceiptSha256: options.previousReceiptSha256 ?? "3".repeat(64),
    consecutiveGreenRuns: count,
    trackedDistRetirementEligible: count >= 3,
    legacyTrackedDistRetained: true,
  };
  receipt.receiptSha256 = digest(receipt);
  return receipt;
}

function evaluationFixture({ catalogCount = 1, pagesCount = 3 } = {}) {
  const ledger = checkedInLedger();
  const catalog = catalogReceipt(catalogCount);
  const pages = pagesReceipt(pagesCount);
  const catalogEntry = ledger.migrations.find(({ id }) => id === "catalog-projection");
  const pagesEntry = ledger.migrations.find(({ id }) => id === "pages-tracked-dist");
  catalogEntry.currentGreenRuns = catalogCount;
  catalogEntry.currentIdentity = {
    sourceIdentityDigest: catalog.sourceIdentity.digest,
    canonicalDigest: catalog.comparison.canonicalDigest,
  };
  catalogEntry.retirementEligibility = catalogCount >= 10 ? "eligible" : "ineligible";
  catalogEntry.evidence.status = "recorded";
  catalogEntry.evidence.receiptDigest = catalog.receiptDigest;
  catalogEntry.evidence.latestRunId = catalog.runIdentity.runId;
  catalogEntry.blockers = catalogCount >= 10
    ? ["explicit-removal-authorization-missing"]
    : [`green-run-threshold:${catalogCount}/10`, "explicit-removal-authorization-missing"];
  pagesEntry.currentGreenRuns = pagesCount;
  pagesEntry.currentIdentity = {
    gitSha: pages.identity.gitSha,
    gitTree: pages.identity.gitTree,
    rollbackDistTree: pages.identity.rollbackDistTree,
    manifestSha256: pages.identity.manifestSha256,
    treeSha256: pages.identity.treeSha256,
  };
  pagesEntry.retirementEligibility = pagesCount >= 3 ? "eligible" : "ineligible";
  pagesEntry.evidence.status = "recorded";
  pagesEntry.evidence.receiptDigest = pages.receiptSha256;
  pagesEntry.evidence.latestRunId = pages.runId;
  pagesEntry.blockers = pagesCount >= 3
    ? ["explicit-removal-authorization-missing"]
    : [`green-run-threshold:${pagesCount}/3`, "explicit-removal-authorization-missing"];
  return { ledger, receipts: new Map([["catalog-projection", catalog], ["pages-tracked-dist", pages]]) };
}

function markReceiptUnbound(entry) {
  entry.evidence.status = "recorded-unbound";
  entry.evidence.receiptDigest = null;
  entry.blockers = [
    ...entry.blockers.filter((blocker) => blocker !== "explicit-removal-authorization-missing"),
    "exact-receipt-bytes-unavailable",
    ...(entry.authorization.removalAuthorized ? [] : ["explicit-removal-authorization-missing"]),
  ];
}

function setCurrentEvidenceWindow(entry) {
  const now = Date.now();
  entry.evidence.observedAt = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  entry.evidence.expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

test("checked-in schema and ledger register both retirement migrations", () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const ledger = checkedInLedger();
  assert.equal(schema.properties.migrations.minItems, 2);
  assert.ok(schema.properties.migrations.items.required.includes("legacyOwner"));
  assert.ok(schema.properties.migrations.items.required.includes("canonicalOwner"));
  assert.ok(schema.properties.migrations.items.required.includes("authorization"));
  validateMigrationLedgerDocument(ledger);
  assert.deepEqual(ledger.migrations.map(({ id }) => id), ["catalog-projection", "pages-tracked-dist"]);

  const catalog = ledger.migrations[0];
  assert.equal(catalog.currentGreenRuns, 1);
  assert.equal(catalog.requiredGreenRuns, 10);
  assert.equal(catalog.retirementEligibility, "ineligible");
  assert.equal(catalog.retirementAction, "retain-legacy");
  assert.equal(catalog.authorization.removalAuthorized, false);
  assert.equal(catalog.evidence.status, "recorded-unbound");
  assert.equal(catalog.evidence.receiptDigest, null);

  const pages = ledger.migrations[1];
  assert.equal(pages.currentGreenRuns, 3);
  assert.equal(pages.requiredGreenRuns, 3);
  assert.equal(pages.retirementEligibility, "eligible");
  assert.equal(pages.retirementAction, "retain-tracked-dist");
  assert.equal(pages.authorization.removalAuthorized, false);
  assert.equal(pages.evidence.status, "recorded-unbound");
  assert.equal(pages.evidence.receiptDigest, null);
  assert.equal(pages.currentIdentity.manifestSha256, null);
  assert.equal(pages.currentIdentity.treeSha256, null);
});

test("evaluation keeps eligibility and removal authorization separate", () => {
  const fixture = evaluationFixture();
  const result = evaluateMigrationLedger({ ...fixture, now: NOW });
  assert.deepEqual(result.migrations, [
    {
      id: "catalog-projection",
      eligible: false,
      authorized: false,
      retirementAction: "retain-legacy",
      currentGreenRuns: 1,
      requiredGreenRuns: 10,
    },
    {
      id: "pages-tracked-dist",
      eligible: true,
      authorized: false,
      retirementAction: "retain-tracked-dist",
      currentGreenRuns: 3,
      requiredGreenRuns: 3,
    },
  ]);
});

test("a green threshold never changes retained code without separate authorization", () => {
  const fixture = evaluationFixture({ catalogCount: 10 });
  const result = evaluateMigrationLedger({ ...fixture, now: NOW });
  const catalog = result.migrations.find(({ id }) => id === "catalog-projection");
  assert.equal(catalog.eligible, true);
  assert.equal(catalog.authorized, false);
  assert.equal(catalog.retirementAction, "retain-legacy");
});

test("missing receipts and unknown migrations fail closed", () => {
  const fixture = evaluationFixture();
  fixture.receipts.delete("catalog-projection");
  assert.throws(
    () => evaluateMigrationLedger({ ...fixture, now: NOW }),
    /migration-ledger-receipt-missing:catalog-projection/,
  );

  const unknown = checkedInLedger();
  unknown.migrations[0].id = "unknown-migration";
  assert.throws(
    () => validateMigrationLedgerDocument(unknown),
    /migration-ledger-unknown-migration:unknown-migration/,
  );
});

test("identity changes and green-count rollback fail closed", () => {
  const changedIdentity = evaluationFixture();
  changedIdentity.ledger.migrations[1].currentIdentity.gitSha = "f".repeat(40);
  assert.throws(
    () => evaluateMigrationLedger({ ...changedIdentity, now: NOW }),
    /migration-ledger-identity-changed:pages-tracked-dist/,
  );

  const rollback = evaluationFixture();
  rollback.receipts.set("pages-tracked-dist", pagesReceipt(2));
  assert.throws(
    () => evaluateMigrationLedger({ ...rollback, now: NOW }),
    /migration-ledger-green-count-rollback:pages-tracked-dist/,
  );
});

test("expired evidence and tampered receipts fail closed", () => {
  const expired = evaluationFixture();
  assert.throws(
    () => evaluateMigrationLedger({ ...expired, now: new Date("2026-09-28T00:00:00.000Z") }),
    /migration-ledger-evidence-expired:catalog-projection/,
  );

  const tampered = evaluationFixture();
  tampered.receipts.get("pages-tracked-dist").consecutiveGreenRuns = 99;
  assert.throws(
    () => evaluateMigrationLedger({ ...tampered, now: NOW }),
    /migration-ledger-invalid-receipt:pages-tracked-dist/,
  );
});

test("a correctly signed catalog receipt with projection drift still fails closed", () => {
  const fixture = evaluationFixture();
  const canonicalBundle = buildCanonicalCatalogProjectionBundle();
  const legacy = structuredClone(canonicalBundle.projections);
  legacy.documentation.push({ sourceRef: "docs/fixture-only-drift.md" });
  const comparison = compareCatalogProjections({ canonicalBundle, legacy });
  assert.equal(comparison.equal, false);
  const receipt = advanceCatalogProjectionShadowReceipt({
    comparison,
    sourceIdentity: comparison.sourceIdentity,
    runIdentity: fixture.receipts.get("catalog-projection").runIdentity,
  });
  fixture.receipts.set("catalog-projection", receipt);
  assert.throws(
    () => evaluateMigrationLedger({ ...fixture, now: NOW }),
    /migration-ledger-invalid-receipt:catalog-projection/,
  );
});

test("authorization requires eligibility, an explicit reference, and a separate action", () => {
  const missingReference = evaluationFixture();
  const pages = missingReference.ledger.migrations.find(({ id }) => id === "pages-tracked-dist");
  pages.authorization.status = "authorized";
  pages.authorization.removalAuthorized = true;
  assert.throws(
    () => validateMigrationLedgerDocument(missingReference.ledger),
    /migration-ledger-authorization-state-mismatch:pages-tracked-dist/,
  );

  const ineligible = evaluationFixture();
  const catalog = ineligible.ledger.migrations.find(({ id }) => id === "catalog-projection");
  catalog.authorization = {
    status: "authorized",
    removalAuthorized: true,
    authorizationRef: "supervisor-explicit-authorization",
  };
  catalog.retirementAction = "remove-in-separate-authorized-change";
  assert.throws(
    () => validateMigrationLedgerDocument(ineligible.ledger),
    /migration-ledger-ineligible-authorization:catalog-projection/,
  );
});

test("ingestion first binds an exact current receipt without changing authorization", () => {
  const fixture = evaluationFixture();
  const catalog = fixture.receipts.get("catalog-projection");
  const catalogEntry = fixture.ledger.migrations.find(({ id }) => id === "catalog-projection");
  markReceiptUnbound(catalogEntry);

  const proposal = proposeMigrationLedgerReceiptUpdate({
    ledger: fixture.ledger,
    migrationId: "catalog-projection",
    receipt: catalog,
    receiptPath: ".runtime/receipts/catalog-run-1.json",
    now: NOW,
  });

  assert.equal(proposal.operation, "bind-current-receipt");
  assert.equal(proposal.previous.receiptDigest, null);
  assert.equal(proposal.next.receiptDigest, catalog.receiptDigest);
  assert.equal(proposal.next.authorized, false);
  assert.equal(proposal.next.retirementAction, "retain-legacy");
  assert.equal(proposal.authorizationChanged, false);
  assert.match(proposal.proposalDigest, /^[0-9a-f]{64}$/u);
  const updated = proposal.updatedLedger.migrations.find(({ id }) => id === "catalog-projection");
  assert.equal(updated.evidence.status, "recorded");
  assert.equal(updated.evidence.receiptPath, ".runtime/receipts/catalog-run-1.json");
  assert.equal(catalogEntry.evidence.receiptDigest, null);
});

test("exact chained receipts advance one count and remain recommendation-only", () => {
  const fixture = evaluationFixture();
  const first = fixture.receipts.get("catalog-projection");
  const catalogEntry = fixture.ledger.migrations.find(({ id }) => id === "catalog-projection");
  markReceiptUnbound(catalogEntry);
  const bound = proposeMigrationLedgerReceiptUpdate({
    ledger: fixture.ledger,
    migrationId: "catalog-projection",
    receipt: first,
    receiptPath: ".runtime/receipts/catalog-run-1.json",
    now: NOW,
  });
  const second = catalogReceipt(2);
  const advanced = proposeMigrationLedgerReceiptUpdate({
    ledger: bound.updatedLedger,
    migrationId: "catalog-projection",
    receipt: second,
    receiptPath: ".runtime/receipts/catalog-run-2.json",
    observedAt: "2026-08-29T00:00:00.000Z",
    expiresAt: "2026-09-27T00:00:00.000Z",
    now: NOW,
  });
  assert.equal(advanced.operation, "advance-receipt");
  assert.equal(advanced.previous.currentGreenRuns, 1);
  assert.equal(advanced.next.currentGreenRuns, 2);
  assert.equal(advanced.next.authorized, false);
  assert.equal(advanced.next.retirementAction, "retain-legacy");
  assert.deepEqual(
    advanced.updatedLedger.migrations.find(({ id }) => id === "catalog-projection").blockers,
    ["green-run-threshold:2/10", "explicit-removal-authorization-missing"],
  );
});

test("pages receipts bind and advance only on the exact previous digest", () => {
  const fixture = evaluationFixture();
  const first = fixture.receipts.get("pages-tracked-dist");
  const pagesEntry = fixture.ledger.migrations.find(({ id }) => id === "pages-tracked-dist");
  markReceiptUnbound(pagesEntry);
  const bound = proposeMigrationLedgerReceiptUpdate({
    ledger: fixture.ledger,
    migrationId: "pages-tracked-dist",
    receipt: first,
    receiptPath: ".runtime/receipts/pages-run-3.json",
    now: NOW,
  });
  const fourth = pagesReceipt(4, "a", { previousReceiptSha256: first.receiptSha256 });
  const advanced = proposeMigrationLedgerReceiptUpdate({
    ledger: bound.updatedLedger,
    migrationId: "pages-tracked-dist",
    receipt: fourth,
    receiptPath: ".runtime/receipts/pages-run-4.json",
    observedAt: "2026-08-29T00:00:00.000Z",
    expiresAt: "2026-09-27T00:00:00.000Z",
    now: NOW,
  });
  assert.equal(advanced.next.currentGreenRuns, 4);
  assert.equal(advanced.next.eligible, true);
  assert.equal(advanced.next.authorized, false);
  assert.equal(advanced.next.retirementAction, "retain-tracked-dist");

  const fork = pagesReceipt(4, "a", { previousReceiptSha256: "f".repeat(64) });
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: bound.updatedLedger,
      migrationId: "pages-tracked-dist",
      receipt: fork,
      receiptPath: ".runtime/receipts/pages-fork.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-09-27T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-receipt-chain-mismatch:pages-tracked-dist/,
  );

  const unrelatedPrefix = pagesReceipt(4, "a", {
    previousReceiptSha256: first.receiptSha256,
    runIds: ["unrelated-1", "unrelated-2", "unrelated-3", "pages-run-4"],
  });
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: bound.updatedLedger,
      migrationId: "pages-tracked-dist",
      receipt: unrelatedPrefix,
      receiptPath: ".runtime/receipts/pages-unrelated-prefix.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-09-27T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-run-chain-predecessor-mismatch:pages-tracked-dist/,
  );
});

test("duplicate, rollback, count jump, and cross-identity ingestion fail closed", () => {
  const fixture = evaluationFixture();
  const first = fixture.receipts.get("catalog-projection");
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: fixture.ledger,
      migrationId: "catalog-projection",
      receipt: first,
      receiptPath: ".runtime/receipts/catalog-run-1.json",
      now: NOW,
    }),
    /migration-ledger-duplicate-receipt:catalog-projection/,
  );

  const rollback = catalogReceipt(1);
  const countTwo = evaluationFixture({ catalogCount: 2 });
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: countTwo.ledger,
      migrationId: "catalog-projection",
      receipt: rollback,
      receiptPath: ".runtime/receipts/catalog-old.json",
      now: NOW,
    }),
    /migration-ledger-green-count-rollback:catalog-projection/,
  );

  const jump = catalogReceipt(3);
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: fixture.ledger,
      migrationId: "catalog-projection",
      receipt: jump,
      receiptPath: ".runtime/receipts/catalog-jump.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-09-27T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-green-count-jump:catalog-projection/,
  );

  const changedIdentity = pagesReceipt(4, "f");
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: fixture.ledger,
      migrationId: "pages-tracked-dist",
      receipt: changedIdentity,
      receiptPath: ".runtime/receipts/pages-changed.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-09-27T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-identity-changed:pages-tracked-dist/,
  );
});

test("unbound, stale, and invalid evidence windows block advancement", () => {
  const fixture = evaluationFixture();
  const second = catalogReceipt(2);
  const catalogEntry = fixture.ledger.migrations.find(({ id }) => id === "catalog-projection");
  markReceiptUnbound(catalogEntry);
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: fixture.ledger,
      migrationId: "catalog-projection",
      receipt: second,
      receiptPath: ".runtime/receipts/catalog-run-2.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-09-27T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-current-receipt-unbound:catalog-projection/,
  );

  const stale = evaluationFixture();
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: stale.ledger,
      migrationId: "catalog-projection",
      receipt: stale.receipts.get("catalog-projection"),
      receiptPath: ".runtime/receipts/catalog-run-1.json",
      now: new Date("2026-09-28T00:00:00.000Z"),
    }),
    /migration-ledger-evidence-expired:catalog-projection/,
  );

  const bound = evaluationFixture();
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: bound.ledger,
      migrationId: "catalog-projection",
      receipt: second,
      receiptPath: ".runtime/receipts/catalog-run-2.json",
      observedAt: "2026-08-29T00:00:00.000Z",
      expiresAt: "2026-10-29T00:00:00.000Z",
      now: NOW,
    }),
    /migration-ledger-ingest-evidence-window-too-long:catalog-projection/,
  );
});

test("pages full producer identity is required and artifact identity drift fails closed", () => {
  const checked = checkedInLedger();
  const historical = pagesReceipt(3);
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: checked,
      migrationId: "pages-tracked-dist",
      receipt: historical,
      receiptPath: ".runtime/receipts/pages-run-3.json",
      now: NOW,
    }),
    /migration-ledger-identity-unbound:pages-tracked-dist/,
  );

  const fixture = evaluationFixture();
  const drifted = pagesReceipt(3);
  drifted.identity.manifestSha256 = "8".repeat(64);
  drifted.identity.treeSha256 = "7".repeat(64);
  const unsigned = { ...drifted };
  delete unsigned.receiptSha256;
  drifted.receiptSha256 = digest(unsigned);
  assert.throws(
    () => proposeMigrationLedgerReceiptUpdate({
      ledger: fixture.ledger,
      migrationId: "pages-tracked-dist",
      receipt: drifted,
      receiptPath: ".runtime/receipts/pages-drifted.json",
      now: NOW,
    }),
    /migration-ledger-identity-changed:pages-tracked-dist/,
  );
});

test("CLI writes only an explicit new generated-report proposal", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureRoot = path.join(REPO_ROOT, ".runtime", "tmp", `migration-ledger-cli-${suffix}`);
  const outputPath = path.join(REPO_ROOT, ".runtime", "reports", "generated", `migration-ledger-cli-${suffix}.json`);
  const ledgerPath = path.join(fixtureRoot, "ledger.json");
  const receiptPath = path.join(fixtureRoot, "catalog-receipt.json");
  const fixture = evaluationFixture();
  const receipt = fixture.receipts.get("catalog-projection");
  const catalog = fixture.ledger.migrations.find(({ id }) => id === "catalog-projection");
  markReceiptUnbound(catalog);
  setCurrentEvidenceWindow(catalog);
  fs.mkdirSync(fixtureRoot, { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify(fixture.ledger, null, 2)}\n`, "utf8");
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  try {
    const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");
    const stdoutOnly = spawnSync(process.execPath, [
      "tools/verification/migration_ledger_validator.mjs",
      "--ledger", ledgerPath,
      "--ingest", `catalog-projection=${receiptPath}`,
    ], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(stdoutOnly.status, 0, stdoutOnly.stderr);
    const stdoutProposal = JSON.parse(stdoutOnly.stdout);
    assert.equal(stdoutProposal.kind, "migration-ledger-update-proposal");
    assert.equal(stdoutProposal.next.authorized, false);
    assert.equal(fs.readFileSync(ledgerPath, "utf8"), ledgerBefore);
    assert.equal(fs.existsSync(outputPath), false);

    const completed = spawnSync(process.execPath, [
      "tools/verification/migration_ledger_validator.mjs",
      "--ledger", ledgerPath,
      "--ingest", `catalog-projection=${receiptPath}`,
      "--out", outputPath,
    ], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(completed.status, 0, completed.stderr);
    const proposal = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(proposal.operation, "bind-current-receipt");
    assert.equal(proposal.next.authorized, false);
    assert.equal(proposal.updatedLedger.migrations[0].authorization.removalAuthorized, false);

    const duplicateOutput = spawnSync(process.execPath, [
      "tools/verification/migration_ledger_validator.mjs",
      "--ledger", ledgerPath,
      "--ingest", `catalog-projection=${receiptPath}`,
      "--out", outputPath,
    ], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(duplicateOutput.status, 2);
    assert.match(duplicateOutput.stderr, /migration-ledger-output-already-exists/);

    const forbiddenOutput = spawnSync(process.execPath, [
      "tools/verification/migration_ledger_validator.mjs",
      "--ledger", ledgerPath,
      "--ingest", `catalog-projection=${receiptPath}`,
      "--out", path.join(REPO_ROOT, "tools", "verification", "forbidden-proposal.json"),
    ], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(forbiddenOutput.status, 2);
    assert.match(forbiddenOutput.stderr, /migration-ledger-output-outside-generated-reports/);
    assert.equal(fs.existsSync(path.join(REPO_ROOT, "tools", "verification", "forbidden-proposal.json")), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(outputPath, { force: true });
  }
});

test("CLI rejects receipt paths traversing a symlink or junction", (context) => {
  const suffix = `${process.pid}-${Date.now()}-reparse`;
  const fixtureRoot = path.join(REPO_ROOT, ".runtime", "tmp", `migration-ledger-cli-${suffix}`);
  const linkPath = path.join(REPO_ROOT, ".runtime", "tmp", `migration-ledger-cli-link-${suffix}`);
  const outputPath = path.join(REPO_ROOT, ".runtime", "reports", "generated", `migration-ledger-cli-${suffix}.json`);
  const ledgerPath = path.join(fixtureRoot, "ledger.json");
  const receiptPath = path.join(fixtureRoot, "catalog-receipt.json");
  const fixture = evaluationFixture();
  const receipt = fixture.receipts.get("catalog-projection");
  const catalog = fixture.ledger.migrations.find(({ id }) => id === "catalog-projection");
  markReceiptUnbound(catalog);
  setCurrentEvidenceWindow(catalog);
  fs.mkdirSync(fixtureRoot, { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify(fixture.ledger, null, 2)}\n`, "utf8");
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  try {
    try {
      fs.symlinkSync(fixtureRoot, linkPath, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      context.skip(`reparse creation unavailable: ${error.code || error.message}`);
      return;
    }
    const linkedReceipt = path.join(linkPath, "catalog-receipt.json");
    fs.writeFileSync(receiptPath, "{invalid-json\n", "utf8");
    const completed = spawnSync(process.execPath, [
      "tools/verification/migration_ledger_validator.mjs",
      "--ledger", ledgerPath,
      "--ingest", `catalog-projection=${linkedReceipt}`,
      "--out", outputPath,
    ], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(completed.status, 2);
    assert.match(completed.stderr, /migration-ledger-ingest-receipt-outside-runtime-reparse-path/);
    assert.equal(fs.existsSync(outputPath), false);
  } finally {
    if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(outputPath, { force: true });
  }
});
