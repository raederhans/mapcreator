import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  KNOWN_SELECTOR_DOMAIN_HINTS,
  REQUIRED_DOMAIN_FIELDS,
  REQUIRED_DOMAINS,
} from "../tools/ai_test_supervisor/check_supervisor_schemas.mjs";
import { buildRouteIndex } from "../tools/test_route_registry.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "tools", "ai_test_supervisor", "domain_registry.json");
const E2E_MANIFEST_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-layer-manifest.json");

function readRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function readE2eManifest() {
  return JSON.parse(fs.readFileSync(E2E_MANIFEST_PATH, "utf8"));
}

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string.`);
  assert.notEqual(value.trim(), "", `${label} must be non-empty.`);
}

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array.`);
  if (!allowEmpty) {
    assert.ok(value.length > 0, `${label} must be non-empty.`);
  }
  for (const [index, entry] of value.entries()) {
    assert.equal(typeof entry, "string", `${label}[${index}] must be a string.`);
  }
}

test("domain registry parses and declares schemaVersion 1", () => {
  const registry = readRegistry();
  assert.equal(registry.schemaVersion, 1);
  assert.ok(Array.isArray(registry.domains));
});

test("required supervisor domain ids exist", () => {
  const registry = readRegistry();
  const ids = new Set(registry.domains.map((domain) => domain.id));

  for (const domainId of REQUIRED_DOMAINS) {
    assert.ok(ids.has(domainId), `Missing required domain id: ${domainId}`);
  }
});

test("registry covers current route and E2E domain ids", () => {
  const registry = readRegistry();
  const ids = new Set(registry.domains.map((domain) => domain.id));
  const routeDomainIds = buildRouteIndex().map((route) => route.domain);
  const e2eDomainIds = readE2eManifest().specs.map((spec) => spec.domain);

  for (const domainId of [...new Set([...routeDomainIds, ...e2eDomainIds, ...KNOWN_SELECTOR_DOMAIN_HINTS])].sort()) {
    assert.ok(ids.has(domainId), `domain registry must cover declared route/E2E domain: ${domainId}`);
  }
});

test("domain ids are unique", () => {
  const registry = readRegistry();
  const ids = registry.domains.map((domain) => domain.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("state ownership domain exposes P4 policy and route evidence", () => {
  const registry = readRegistry();
  const domain = registry.domains.find((entry) => entry.id === "state-ownership");

  assert.ok(domain);
  assert.ok(domain.ownerHints.includes("state-ownership"));
  assert.ok(domain.preferredChildSafeChecks.includes("npm run verify:p4:state-writer-policy"));
  assert.ok(domain.preferredChildSafeChecks.includes("npm run test:python:p4:state-write-boundary"));
  assert.ok(domain.preferredChildSafeChecks.includes("npm run test:node:p4:p4-1"));
  assert.ok(domain.preferredChildSafeChecks.includes("npm run test:python:p4:p4-1-boundary"));
  assert.ok(domain.preferredChildSafeChecks.includes("npm run verify:p4:p4-1"));
  assert.equal(
    domain.preferredChildSafeChecks.some((command) => command.includes("verify:p4:routes")),
    false,
  );
  assert.ok(
    domain.evidenceArtifacts.includes(
      ".runtime/reports/generated/p4-state-actions/P4.0/policy-report.json",
    ),
  );
  assert.ok(
    domain.evidenceArtifacts.includes(
      ".runtime/reports/generated/p4-state-actions/P4.1/phase-verification.json",
    ),
  );
  assert.deepEqual(domain.preferredMainThreadChecks, []);
});

test("every domain has required fields with expected shapes", () => {
  const registry = readRegistry();

  for (const domain of registry.domains) {
    for (const field of REQUIRED_DOMAIN_FIELDS) {
      assert.ok(field in domain, `${domain.id} must include ${field}.`);
    }

    assertNonEmptyString(domain.id, `${domain.id}.id`);
    assertNonEmptyString(domain.summary, `${domain.id}.summary`);
    assertStringArray(domain.ownerHints, `${domain.id}.ownerHints`);
    assertStringArray(domain.typicalSourceGlobs, `${domain.id}.typicalSourceGlobs`);
    assertStringArray(domain.preferredChildSafeChecks, `${domain.id}.preferredChildSafeChecks`, { allowEmpty: true });
    assertStringArray(domain.preferredMainThreadChecks, `${domain.id}.preferredMainThreadChecks`, { allowEmpty: true });
    assertStringArray(domain.mainRiskSignals, `${domain.id}.mainRiskSignals`);
    assertStringArray(domain.evidenceArtifacts, `${domain.id}.evidenceArtifacts`);
    assertNonEmptyString(domain.regressionExpectation, `${domain.id}.regressionExpectation`);
  }
});

test("registry covers important lane and evidence concepts", () => {
  const registry = readRegistry();

  assert.ok(
    registry.domains.some((domain) => domain.preferredChildSafeChecks.length > 0),
    "At least one domain must include child-safe preferred checks.",
  );
  assert.ok(
    registry.domains.some((domain) => domain.preferredMainThreadChecks.length > 0),
    "At least one domain must include main-thread preferred checks.",
  );
  assert.ok(
    registry.domains.some((domain) => domain.evidenceArtifacts.length > 0),
    "At least one domain must include evidence artifacts.",
  );
});

test("preferred checks are never blank", () => {
  const registry = readRegistry();

  for (const domain of registry.domains) {
    for (const check of [...domain.preferredChildSafeChecks, ...domain.preferredMainThreadChecks]) {
      assert.notEqual(check.trim(), "", `${domain.id} contains a blank preferred check.`);
    }
  }
});
