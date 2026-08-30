import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_LEDGER_PATH = path.join(REPO_ROOT, "tools", "verification", "migration_ledger.json");
const GENERATED_REPORT_ROOT = path.join(REPO_ROOT, ".runtime", "reports", "generated");
const SHA256_RE = /^[0-9a-f]{64}$/u;
const GIT_SHA_RE = /^[0-9a-f]{40}$/u;
const MAX_EVIDENCE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class MigrationLedgerError extends Error {}

function fail(code, detail = "") {
  throw new MigrationLedgerError(detail ? `${code}:${detail}` : code);
}

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

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected, code) {
  if (!isRecord(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(code);
}

function assertNonEmptyString(value, code) {
  if (typeof value !== "string" || value.trim() === "") fail(code);
}

function parseTimestamp(value, code) {
  assertNonEmptyString(value, code);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) fail(code);
  return timestamp;
}

function assertIdentity(value, fields, code, nullableFields = []) {
  assertExactKeys(value, fields, code);
  const nullable = new Set(nullableFields);
  for (const field of fields) {
    if (value[field] === null && nullable.has(field)) continue;
    assertNonEmptyString(value[field], code);
  }
}

function isNullableSha256(value) {
  return value === null || SHA256_RE.test(String(value || ""));
}

const MIGRATION_DEFINITIONS = Object.freeze({
  "catalog-projection": Object.freeze({
    receiptKind: "catalog-projection-shadow-receipt",
    requiredGreenRuns: 10,
    retainedAction: "retain-legacy",
    identityFields: Object.freeze(["sourceIdentityDigest", "canonicalDigest"]),
    nullableIdentityFields: Object.freeze([]),
  }),
  "pages-tracked-dist": Object.freeze({
    receiptKind: "pages-artifact-shadow-receipt",
    requiredGreenRuns: 3,
    retainedAction: "retain-tracked-dist",
    identityFields: Object.freeze(["gitSha", "gitTree", "rollbackDistTree", "manifestSha256", "treeSha256"]),
    nullableIdentityFields: Object.freeze(["manifestSha256", "treeSha256"]),
  }),
});

function validateEvidence(evidence, migrationId) {
  assertExactKeys(evidence, [
    "status", "receiptKind", "receiptPath", "receiptDigest", "latestRunId", "observedAt", "expiresAt",
  ], `migration-ledger-invalid-evidence:${migrationId}`);
  if (!["recorded", "recorded-unbound", "missing", "expired"].includes(evidence.status)) {
    fail("migration-ledger-invalid-evidence-status", migrationId);
  }
  for (const field of ["receiptKind", "receiptPath", "latestRunId"]) {
    assertNonEmptyString(evidence[field], `migration-ledger-invalid-evidence:${migrationId}`);
  }
  const observedAt = parseTimestamp(evidence.observedAt, `migration-ledger-invalid-observed-at:${migrationId}`);
  const expiresAt = parseTimestamp(evidence.expiresAt, `migration-ledger-invalid-expires-at:${migrationId}`);
  if (expiresAt <= observedAt) fail("migration-ledger-invalid-evidence-window", migrationId);
  const digestBound = SHA256_RE.test(String(evidence.receiptDigest || ""));
  if (evidence.receiptDigest !== null && !digestBound) fail("migration-ledger-invalid-evidence-digest", migrationId);
  if ((evidence.status === "recorded") !== digestBound) {
    fail("migration-ledger-evidence-binding-mismatch", migrationId);
  }
}

function validateAuthorization(authorization, migrationId) {
  assertExactKeys(authorization, ["status", "removalAuthorized", "authorizationRef"], `migration-ledger-invalid-authorization:${migrationId}`);
  if (!["withheld", "authorized"].includes(authorization.status)
    || typeof authorization.removalAuthorized !== "boolean"
    || (authorization.authorizationRef !== null && typeof authorization.authorizationRef !== "string")) {
    fail("migration-ledger-invalid-authorization", migrationId);
  }
  const hasReference = typeof authorization.authorizationRef === "string" && authorization.authorizationRef.trim() !== "";
  if (authorization.removalAuthorized !== (authorization.status === "authorized" && hasReference)) {
    fail("migration-ledger-authorization-state-mismatch", migrationId);
  }
}

export function validateMigrationLedgerDocument(ledger) {
  assertExactKeys(ledger, ["$schema", "schemaVersion", "kind", "migrations"], "migration-ledger-invalid-document");
  if (ledger.$schema !== "./migration_ledger.schema.json"
    || ledger.schemaVersion !== 1
    || ledger.kind !== "transitional-code-retirement-ledger"
    || !Array.isArray(ledger.migrations)) {
    fail("migration-ledger-invalid-document");
  }
  const seen = new Set();
  for (const migration of ledger.migrations) {
    assertExactKeys(migration, [
      "id", "legacyOwner", "canonicalOwner", "requiredGreenRuns", "currentGreenRuns", "currentIdentity",
      "retirementEligibility", "retirementAction", "evidence", "authorization", "blockers",
    ], "migration-ledger-invalid-migration");
    assertNonEmptyString(migration.id, "migration-ledger-invalid-id");
    if (seen.has(migration.id)) fail("migration-ledger-duplicate-migration", migration.id);
    seen.add(migration.id);
    const definition = MIGRATION_DEFINITIONS[migration.id];
    if (!definition) fail("migration-ledger-unknown-migration", migration.id);
    assertNonEmptyString(migration.legacyOwner, `migration-ledger-invalid-legacy-owner:${migration.id}`);
    assertNonEmptyString(migration.canonicalOwner, `migration-ledger-invalid-canonical-owner:${migration.id}`);
    if (migration.requiredGreenRuns !== definition.requiredGreenRuns) {
      fail("migration-ledger-required-green-runs-drift", migration.id);
    }
    if (!Number.isInteger(migration.currentGreenRuns) || migration.currentGreenRuns < 0) {
      fail("migration-ledger-invalid-current-green-runs", migration.id);
    }
    assertIdentity(
      migration.currentIdentity,
      definition.identityFields,
      `migration-ledger-invalid-identity:${migration.id}`,
      definition.nullableIdentityFields,
    );
    const eligible = migration.currentGreenRuns >= migration.requiredGreenRuns;
    if (migration.retirementEligibility !== (eligible ? "eligible" : "ineligible")) {
      fail("migration-ledger-eligibility-state-mismatch", migration.id);
    }
    validateEvidence(migration.evidence, migration.id);
    if (migration.evidence.receiptKind !== definition.receiptKind) {
      fail("migration-ledger-receipt-kind-mismatch", migration.id);
    }
    validateAuthorization(migration.authorization, migration.id);
    const authorized = migration.authorization.removalAuthorized;
    if (authorized && !eligible) fail("migration-ledger-ineligible-authorization", migration.id);
    const expectedAction = authorized ? "remove-in-separate-authorized-change" : definition.retainedAction;
    if (migration.retirementAction !== expectedAction) {
      fail("migration-ledger-retirement-action-mismatch", migration.id);
    }
    if (!Array.isArray(migration.blockers)
      || migration.blockers.some((entry) => typeof entry !== "string" || entry.trim() === "")
      || new Set(migration.blockers).size !== migration.blockers.length) {
      fail("migration-ledger-invalid-blockers", migration.id);
    }
    const identityUnbound = Object.values(migration.currentIdentity).some((value) => value === null);
    if (identityUnbound !== migration.blockers.includes("exact-identity-unavailable")) {
      fail("migration-ledger-identity-blocker-mismatch", migration.id);
    }
    const receiptUnbound = migration.evidence.status === "recorded-unbound";
    if (receiptUnbound !== migration.blockers.includes("exact-receipt-bytes-unavailable")) {
      fail("migration-ledger-receipt-blocker-mismatch", migration.id);
    }
  }
  const expectedIds = Object.keys(MIGRATION_DEFINITIONS).sort();
  if (JSON.stringify([...seen].sort()) !== JSON.stringify(expectedIds)) {
    fail("migration-ledger-required-migrations-missing");
  }
  return ledger;
}

function receiptPayload(receipt, digestField) {
  const payload = { ...receipt };
  delete payload[digestField];
  return payload;
}

function validateCatalogReceipt(receipt) {
  const expectedComparisonKeys = [
    "schemaVersion", "kind", "equal", "zeroSpawn", "sourceIdentity", "projectionOrder",
    "canonicalDigest", "legacyDigest", "projections", "mismatches",
  ];
  if (!isRecord(receipt)
    || receipt.schemaVersion !== 1
    || receipt.kind !== "catalog-projection-shadow-receipt"
    || !Number.isInteger(receipt.runOrdinal)
    || receipt.runOrdinal < 1
    || receipt.requiredGreenRuns !== 10
    || !Number.isInteger(receipt.consecutiveGreenRuns)
    || receipt.consecutiveGreenRuns < 1
    || receipt.retirementEligible !== (receipt.consecutiveGreenRuns >= 10)
    || receipt.legacyRetained !== true
    || receipt.runOrdinal < receipt.consecutiveGreenRuns
    || !SHA256_RE.test(String(receipt.receiptDigest || ""))
    || digest(receiptPayload(receipt, "receiptDigest")) !== receipt.receiptDigest) {
    fail("migration-ledger-invalid-receipt", "catalog-projection");
  }
  const runIdentity = receipt.runIdentity;
  const sourceIdentity = receipt.sourceIdentity;
  const comparison = receipt.comparison;
  if (!isRecord(runIdentity)
    || typeof runIdentity.runId !== "string"
    || runIdentity.runId.trim() === ""
    || !GIT_SHA_RE.test(String(runIdentity.verificationSha || ""))
    || !GIT_SHA_RE.test(String(runIdentity.verificationTreeSha || ""))
    || !isRecord(sourceIdentity)
    || sourceIdentity.schemaVersion !== 1
    || sourceIdentity.kind !== "verification-metadata-source-identity"
    || sourceIdentity.algorithm !== "sha256"
    || !SHA256_RE.test(String(sourceIdentity.digest || ""))
    || !isRecord(comparison)
    || JSON.stringify(Object.keys(comparison).sort()) !== JSON.stringify(expectedComparisonKeys.sort())
    || comparison.schemaVersion !== 1
    || comparison.kind !== "catalog-projection-shadow-comparison"
    || comparison.equal !== true
    || comparison.zeroSpawn !== true
    || !SHA256_RE.test(String(comparison.canonicalDigest || ""))
    || !SHA256_RE.test(String(comparison.legacyDigest || ""))
    || !Array.isArray(comparison.mismatches)
    || comparison.mismatches.length !== 0
    || comparison.sourceIdentity?.digest !== sourceIdentity.digest
    || !isNullableSha256(receipt.previousReceiptDigest)
    || (receipt.consecutiveGreenRuns > 1 && receipt.previousReceiptDigest === null)) {
    fail("migration-ledger-invalid-receipt", "catalog-projection");
  }
  return {
    count: receipt.consecutiveGreenRuns,
    eligible: receipt.retirementEligible,
    latestRunId: runIdentity.runId,
    receiptDigest: receipt.receiptDigest,
    previousReceiptDigest: receipt.previousReceiptDigest,
    identity: {
      sourceIdentityDigest: sourceIdentity.digest,
      canonicalDigest: comparison.canonicalDigest,
    },
  };
}

function validatePagesReceipt(receipt) {
  if (!isRecord(receipt)
    || receipt.schemaVersion !== 1
    || !SHA256_RE.test(String(receipt.receiptSha256 || ""))
    || digest(receiptPayload(receipt, "receiptSha256")) !== receipt.receiptSha256
    || !SHA256_RE.test(String(receipt.comparisonSha256 || ""))
    || receipt.status !== "green"
    || receipt.publicSmoke !== "passed"
    || !Number.isInteger(receipt.consecutiveGreenRuns)
    || receipt.consecutiveGreenRuns < 1
    || receipt.trackedDistRetirementEligible !== (receipt.consecutiveGreenRuns >= 3)
    || receipt.legacyTrackedDistRetained !== true
    || !Array.isArray(receipt.evidenceRunIds)
    || receipt.evidenceRunIds.length === 0
    || receipt.evidenceRunIds.some((runId) => typeof runId !== "string" || runId.trim() === "")
    || receipt.evidenceRunIds.length !== new Set(receipt.evidenceRunIds).size
    || receipt.evidenceRunIds.at(-1) !== receipt.runId
    || receipt.consecutiveGreenRuns > receipt.evidenceRunIds.length
    || !isNullableSha256(receipt.previousReceiptSha256)
    || (receipt.evidenceRunIds.length > 1 && receipt.previousReceiptSha256 === null)) {
    fail("migration-ledger-invalid-receipt", "pages-tracked-dist");
  }
  assertIdentity(receipt.identity, ["gitSha", "gitTree", "rollbackDistTree", "manifestSha256", "treeSha256"], "migration-ledger-invalid-receipt:pages-tracked-dist");
  for (const field of ["gitSha", "gitTree", "rollbackDistTree"]) {
    if (!GIT_SHA_RE.test(receipt.identity[field])) fail("migration-ledger-invalid-receipt", "pages-tracked-dist");
  }
  for (const field of ["manifestSha256", "treeSha256"]) {
    if (!SHA256_RE.test(receipt.identity[field])) fail("migration-ledger-invalid-receipt", "pages-tracked-dist");
  }
  return {
    count: receipt.consecutiveGreenRuns,
    eligible: receipt.trackedDistRetirementEligible,
    latestRunId: receipt.runId,
    receiptDigest: receipt.receiptSha256,
    previousReceiptDigest: receipt.previousReceiptSha256,
    identity: {
      gitSha: receipt.identity.gitSha,
      gitTree: receipt.identity.gitTree,
      rollbackDistTree: receipt.identity.rollbackDistTree,
      manifestSha256: receipt.identity.manifestSha256,
      treeSha256: receipt.identity.treeSha256,
    },
    evidenceRunIds: [...receipt.evidenceRunIds],
  };
}

function receiptState(migration, receipt) {
  if (!receipt) fail("migration-ledger-receipt-missing", migration.id);
  if (migration.id === "catalog-projection") return validateCatalogReceipt(receipt);
  if (migration.id === "pages-tracked-dist") return validatePagesReceipt(receipt);
  fail("migration-ledger-unknown-migration", migration.id);
}

export function evaluateMigrationLedger({ ledger, receipts, now = new Date() }) {
  validateMigrationLedgerDocument(ledger);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) fail("migration-ledger-invalid-now");
  const receiptMap = receipts instanceof Map ? receipts : new Map(Object.entries(receipts || {}));
  const migrations = [];
  for (const migration of ledger.migrations) {
    if (migration.evidence.status !== "recorded") fail("migration-ledger-evidence-unavailable", migration.id);
    if (nowMs >= Date.parse(migration.evidence.expiresAt)) fail("migration-ledger-evidence-expired", migration.id);
    const state = receiptState(migration, receiptMap.get(migration.id));
    if (stableJson(state.identity) !== stableJson(migration.currentIdentity)) {
      fail("migration-ledger-identity-changed", migration.id);
    }
    if (state.count < migration.currentGreenRuns) fail("migration-ledger-green-count-rollback", migration.id);
    if (state.count > migration.currentGreenRuns) fail("migration-ledger-green-count-ahead", migration.id);
    if (state.latestRunId !== migration.evidence.latestRunId) fail("migration-ledger-latest-run-mismatch", migration.id);
    if (state.receiptDigest !== migration.evidence.receiptDigest) {
      fail("migration-ledger-receipt-digest-mismatch", migration.id);
    }
    if (state.eligible !== (migration.retirementEligibility === "eligible")) {
      fail("migration-ledger-receipt-eligibility-mismatch", migration.id);
    }
    migrations.push({
      id: migration.id,
      eligible: state.eligible,
      authorized: migration.authorization.removalAuthorized,
      retirementAction: migration.retirementAction,
      currentGreenRuns: state.count,
      requiredGreenRuns: migration.requiredGreenRuns,
    });
  }
  return {
    schemaVersion: 1,
    kind: "transitional-code-retirement-evaluation",
    status: "passed",
    migrations,
  };
}

function parseNow(now) {
  const value = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(value)) fail("migration-ledger-invalid-now");
  return value;
}

function expectedBlockers(migration, count) {
  const blockers = [];
  if (count < migration.requiredGreenRuns) {
    blockers.push(`green-run-threshold:${count}/${migration.requiredGreenRuns}`);
  }
  if (Object.values(migration.currentIdentity).some((value) => value === null)) {
    blockers.push("exact-identity-unavailable");
  }
  if (migration.evidence.status === "recorded-unbound") {
    blockers.push("exact-receipt-bytes-unavailable");
  }
  if (!migration.authorization.removalAuthorized) blockers.push("explicit-removal-authorization-missing");
  return blockers;
}

function validateAdvanceWindow({ migration, observedAt, expiresAt, nowMs }) {
  const observedAtMs = parseTimestamp(observedAt, `migration-ledger-ingest-observed-at-required:${migration.id}`);
  const expiresAtMs = parseTimestamp(expiresAt, `migration-ledger-ingest-expires-at-required:${migration.id}`);
  if (observedAtMs < Date.parse(migration.evidence.observedAt)) {
    fail("migration-ledger-ingest-observed-at-rollback", migration.id);
  }
  if (observedAtMs > nowMs) fail("migration-ledger-ingest-observed-at-future", migration.id);
  if (expiresAtMs <= nowMs || expiresAtMs <= observedAtMs) {
    fail("migration-ledger-ingest-evidence-expired", migration.id);
  }
  if (expiresAtMs - observedAtMs > MAX_EVIDENCE_WINDOW_MS) {
    fail("migration-ledger-ingest-evidence-window-too-long", migration.id);
  }
  return { observedAt, expiresAt };
}

export function proposeMigrationLedgerReceiptUpdate({
  ledger,
  migrationId,
  receipt,
  receiptPath,
  observedAt = null,
  expiresAt = null,
  now = new Date(),
}) {
  validateMigrationLedgerDocument(ledger);
  assertNonEmptyString(migrationId, "migration-ledger-ingest-migration-required");
  assertNonEmptyString(receiptPath, "migration-ledger-ingest-receipt-path-required");
  const migrationIndex = ledger.migrations.findIndex(({ id }) => id === migrationId);
  if (migrationIndex < 0) fail("migration-ledger-unknown-migration", migrationId);
  const migration = ledger.migrations[migrationIndex];
  const nowMs = parseNow(now);
  if (nowMs >= Date.parse(migration.evidence.expiresAt)) {
    fail("migration-ledger-evidence-expired", migration.id);
  }
  if (!["recorded", "recorded-unbound"].includes(migration.evidence.status)) {
    fail("migration-ledger-evidence-unavailable", migration.id);
  }
  if (Object.values(migration.currentIdentity).some((value) => value === null)) {
    fail("migration-ledger-identity-unbound", migration.id);
  }
  const state = receiptState(migration, receipt);
  if (stableJson(state.identity) !== stableJson(migration.currentIdentity)) {
    fail("migration-ledger-identity-changed", migration.id);
  }
  if (state.count < migration.currentGreenRuns) fail("migration-ledger-green-count-rollback", migration.id);
  if (state.count > migration.currentGreenRuns + 1) fail("migration-ledger-green-count-jump", migration.id);

  const updatedLedger = structuredClone(ledger);
  const updated = updatedLedger.migrations[migrationIndex];
  let operation;
  if (state.count === migration.currentGreenRuns) {
    if (state.latestRunId !== migration.evidence.latestRunId) {
      fail("migration-ledger-same-count-receipt-conflict", migration.id);
    }
    if (migration.evidence.receiptDigest !== null) {
      if (state.receiptDigest === migration.evidence.receiptDigest) {
        fail("migration-ledger-duplicate-receipt", migration.id);
      }
      fail("migration-ledger-same-count-receipt-conflict", migration.id);
    }
    if (observedAt !== null || expiresAt !== null) {
      fail("migration-ledger-binding-window-override", migration.id);
    }
    operation = "bind-current-receipt";
  } else {
    if (migration.evidence.receiptDigest === null || migration.evidence.status !== "recorded") {
      fail("migration-ledger-current-receipt-unbound", migration.id);
    }
    if (state.previousReceiptDigest !== migration.evidence.receiptDigest) {
      fail("migration-ledger-receipt-chain-mismatch", migration.id);
    }
    if (state.latestRunId === migration.evidence.latestRunId) {
      fail("migration-ledger-duplicate-run", migration.id);
    }
    if (migration.id === "pages-tracked-dist"
      && state.evidenceRunIds.at(-2) !== migration.evidence.latestRunId) {
      fail("migration-ledger-run-chain-predecessor-mismatch", migration.id);
    }
    const window = validateAdvanceWindow({ migration, observedAt, expiresAt, nowMs });
    updated.evidence.observedAt = window.observedAt;
    updated.evidence.expiresAt = window.expiresAt;
    operation = "advance-receipt";
  }

  updated.currentGreenRuns = state.count;
  updated.retirementEligibility = state.eligible ? "eligible" : "ineligible";
  updated.evidence.status = "recorded";
  updated.evidence.receiptPath = receiptPath;
  updated.evidence.receiptDigest = state.receiptDigest;
  updated.evidence.latestRunId = state.latestRunId;
  updated.blockers = expectedBlockers(updated, state.count);
  const definition = MIGRATION_DEFINITIONS[migration.id];
  updated.retirementAction = updated.authorization.removalAuthorized
    ? "remove-in-separate-authorized-change"
    : definition.retainedAction;
  validateMigrationLedgerDocument(updatedLedger);
  if (stableJson(updated.authorization) !== stableJson(migration.authorization)) {
    fail("migration-ledger-ingest-authorization-changed", migration.id);
  }
  const proposal = {
    schemaVersion: 1,
    kind: "migration-ledger-update-proposal",
    operation,
    migrationId,
    previous: {
      currentGreenRuns: migration.currentGreenRuns,
      receiptDigest: migration.evidence.receiptDigest,
      latestRunId: migration.evidence.latestRunId,
    },
    next: {
      currentGreenRuns: updated.currentGreenRuns,
      receiptDigest: updated.evidence.receiptDigest,
      latestRunId: updated.evidence.latestRunId,
      eligible: updated.retirementEligibility === "eligible",
      authorized: updated.authorization.removalAuthorized,
      retirementAction: updated.retirementAction,
    },
    authorizationChanged: false,
    updatedLedger,
  };
  proposal.proposalDigest = digest(proposal);
  return proposal;
}

function readJson(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(code, `${filePath}:${error.message}`);
  }
}

function parseArgs(argv) {
  const options = {
    ledgerPath: DEFAULT_LEDGER_PATH,
    schemaOnly: false,
    receiptPaths: new Map(),
    ingest: null,
    observedAt: null,
    expiresAt: null,
    outputPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--schema-only") {
      options.schemaOnly = true;
      continue;
    }
    if (argument === "--ledger") {
      options.ledgerPath = path.resolve(REPO_ROOT, argv[++index] || "");
      continue;
    }
    if (argument === "--receipt") {
      const value = argv[++index] || "";
      const separator = value.indexOf("=");
      if (separator < 1 || separator === value.length - 1) fail("migration-ledger-invalid-receipt-argument");
      options.receiptPaths.set(value.slice(0, separator), path.resolve(REPO_ROOT, value.slice(separator + 1)));
      continue;
    }
    if (argument === "--ingest") {
      if (options.ingest !== null) fail("migration-ledger-duplicate-ingest-argument");
      const value = argv[++index] || "";
      const separator = value.indexOf("=");
      if (separator < 1 || separator === value.length - 1) fail("migration-ledger-invalid-ingest-argument");
      options.ingest = {
        migrationId: value.slice(0, separator),
        receiptPath: path.resolve(REPO_ROOT, value.slice(separator + 1)),
      };
      continue;
    }
    if (argument === "--observed-at" || argument === "--expires-at" || argument === "--out") {
      const value = argv[++index];
      if (!value) fail("migration-ledger-missing-argument-value", argument);
      if (argument === "--observed-at") options.observedAt = value;
      if (argument === "--expires-at") options.expiresAt = value;
      if (argument === "--out") options.outputPath = path.resolve(REPO_ROOT, value);
      continue;
    }
    fail("migration-ledger-unknown-argument", argument);
  }
  if (options.ingest && (options.schemaOnly || options.receiptPaths.size > 0)) {
    fail("migration-ledger-incompatible-ingest-mode");
  }
  if (!options.ingest && (options.observedAt !== null || options.expiresAt !== null || options.outputPath !== null)) {
    fail("migration-ledger-ingest-option-without-ingest");
  }
  return options;
}

function isWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function comparablePath(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithinOrEqual(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function assertCanonicalContainment(candidate, scopeRoot, code, { mustExist = false } = {}) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedScope = path.resolve(scopeRoot);
  if (!isWithin(resolvedCandidate, resolvedScope)) fail(code);
  if (mustExist && !fs.existsSync(resolvedCandidate)) fail(code);
  const repoRealPath = fs.realpathSync.native(REPO_ROOT);
  const relative = path.relative(REPO_ROOT, resolvedCandidate);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) fail(code);
  let cursor = REPO_ROOT;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    if (!fs.existsSync(cursor)) break;
    const stats = fs.lstatSync(cursor);
    if (stats.isSymbolicLink()) fail(`${code}-reparse-path`);
    const realCursor = fs.realpathSync.native(cursor);
    if (!isWithinOrEqual(comparablePath(realCursor), comparablePath(repoRealPath))) {
      fail(`${code}-canonical-escape`);
    }
  }
}

function ensureSafeDirectory(directoryPath, code) {
  const resolvedDirectory = path.resolve(directoryPath);
  const relative = path.relative(REPO_ROOT, resolvedDirectory);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) fail(code);
  const repoRealPath = fs.realpathSync.native(REPO_ROOT);
  let cursor = REPO_ROOT;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    if (!fs.existsSync(cursor)) {
      try {
        fs.mkdirSync(cursor);
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
    }
    const stats = fs.lstatSync(cursor);
    if (stats.isSymbolicLink()) fail(`${code}-reparse-path`);
    if (!stats.isDirectory()) fail(`${code}-not-directory`);
    const realCursor = fs.realpathSync.native(cursor);
    if (!isWithinOrEqual(comparablePath(realCursor), comparablePath(repoRealPath))) {
      fail(`${code}-canonical-escape`);
    }
  }
}

function toAuditPath(receiptPath) {
  const runtimeRoot = path.join(REPO_ROOT, ".runtime");
  assertCanonicalContainment(
    receiptPath,
    runtimeRoot,
    "migration-ledger-ingest-receipt-outside-runtime",
    { mustExist: true },
  );
  return path.relative(REPO_ROOT, receiptPath).replaceAll(path.sep, "/");
}

function writeProposal(outputPath, proposal) {
  if (comparablePath(path.resolve(path.dirname(outputPath))) !== comparablePath(path.resolve(GENERATED_REPORT_ROOT))) {
    fail("migration-ledger-output-outside-generated-reports");
  }
  ensureSafeDirectory(GENERATED_REPORT_ROOT, "migration-ledger-output-outside-generated-reports");
  assertCanonicalContainment(outputPath, GENERATED_REPORT_ROOT, "migration-ledger-output-outside-generated-reports");
  if (fs.existsSync(outputPath)) fail("migration-ledger-output-already-exists");
  const descriptor = fs.openSync(outputPath, "wx");
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(proposal, null, 2)}\n`, "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

export function runMigrationLedgerCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const ledger = readJson(options.ledgerPath, "migration-ledger-read-failed");
  validateMigrationLedgerDocument(ledger);
  if (options.schemaOnly) {
    process.stdout.write(`${JSON.stringify({ status: "passed", mode: "schema-only", migrations: ledger.migrations.map(({ id }) => id) }, null, 2)}\n`);
    return 0;
  }
  if (options.ingest) {
    if (!fs.existsSync(options.ingest.receiptPath)) {
      fail("migration-ledger-receipt-missing", options.ingest.migrationId);
    }
    const receiptAuditPath = toAuditPath(options.ingest.receiptPath);
    const receipt = readJson(options.ingest.receiptPath, "migration-ledger-receipt-read-failed");
    const proposal = proposeMigrationLedgerReceiptUpdate({
      ledger,
      migrationId: options.ingest.migrationId,
      receipt,
      receiptPath: receiptAuditPath,
      observedAt: options.observedAt,
      expiresAt: options.expiresAt,
    });
    if (options.outputPath) {
      writeProposal(options.outputPath, proposal);
      process.stdout.write(`${JSON.stringify({
        status: "written",
        kind: proposal.kind,
        migrationId: proposal.migrationId,
        operation: proposal.operation,
        outputPath: path.relative(REPO_ROOT, options.outputPath).replaceAll(path.sep, "/"),
        removalAuthorized: proposal.next.authorized,
      }, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(proposal, null, 2)}\n`);
    }
    return 0;
  }
  const receipts = new Map();
  for (const migration of ledger.migrations) {
    const receiptPath = options.receiptPaths.get(migration.id)
      || path.resolve(REPO_ROOT, migration.evidence.receiptPath);
    if (!fs.existsSync(receiptPath)) fail("migration-ledger-receipt-missing", migration.id);
    receipts.set(migration.id, readJson(receiptPath, "migration-ledger-receipt-read-failed"));
  }
  const evaluation = evaluateMigrationLedger({ ledger, receipts });
  process.stdout.write(`${JSON.stringify(evaluation, null, 2)}\n`);
  return 0;
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = runMigrationLedgerCli();
  } catch (error) {
    console.error(error?.message || String(error));
    process.exitCode = 2;
  }
}
