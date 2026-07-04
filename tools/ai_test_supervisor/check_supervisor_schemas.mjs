import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildRouteIndex } from "../test_route_registry.mjs";

const REPO_ROOT = process.cwd();
const DOMAIN_REGISTRY_PATH = path.join(REPO_ROOT, "tools", "ai_test_supervisor", "domain_registry.json");
const E2E_MANIFEST_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-layer-manifest.json");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const SCHEMA_PATHS = [
  path.join(REPO_ROOT, "tools", "ai_test_supervisor", "schemas", "change_dossier.schema.json"),
  path.join(REPO_ROOT, "tools", "ai_test_supervisor", "schemas", "supervisor_plan.schema.json"),
  path.join(REPO_ROOT, "tools", "ai_test_supervisor", "schemas", "verification_ledger_entry.schema.json"),
];

export const REQUIRED_DOMAINS = [
  "test-routing",
  "playwright-observability",
  "architecture-boundaries",
  "renderer-runtime",
  "scenario-runtime",
  "startup",
  "main-shell",
  "ui-shell",
  "city-runtime",
  "map-layer",
  "water-runtime",
  "tno-water",
  "tno-startup",
  "transport-workbench",
  "project-io",
  "strategic-overlay",
  "data-governance",
  "backend-cloud-support",
  "pages-dist",
  "perf",
  "i18n-data",
];
export const KNOWN_SELECTOR_DOMAIN_HINTS = ["palette-runtime"];

export const REQUIRED_DOMAIN_FIELDS = [
  "id",
  "summary",
  "ownerHints",
  "typicalSourceGlobs",
  "preferredChildSafeChecks",
  "preferredMainThreadChecks",
  "mainRiskSignals",
  "evidenceArtifacts",
  "regressionExpectation",
];

export const REQUIRED_PACKAGE_SCRIPTS = {
  "verify:supervisor-schemas": "node tools/ai_test_supervisor/check_supervisor_schemas.mjs",
  "test:node:supervisor-contracts": "node --test tests/supervisor_domain_registry_behavior.test.mjs tests/supervisor_schema_contracts.test.mjs",
  "test:node:supervisor-routing": "node --test tests/supervisor_adaptive_route_behavior.test.mjs",
  "test:node:supervisor-plan": "node --test tests/supervisor_change_dossier_behavior.test.mjs tests/supervisor_plan_behavior.test.mjs",
  "test:supervisor": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs",
  "test:supervisor:execute": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute",
  "test:supervisor:execute:main-thread": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute --include-main-thread",
  "verify:supervisor-plan": "npm run test:node:supervisor-plan && node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tests/supervisor_plan_behavior.test.mjs",
  "verify:supervisor-contracts": "npm run verify:supervisor-schemas && npm run test:node:supervisor-contracts && npm run test:node:supervisor-routing",
};

function toRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${toRepoPath(filePath)} is not valid JSON: ${error.message}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  if (!allowEmpty && value.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string") {
      throw new Error(`${label}[${index}] must be a string.`);
    }
  }
}

function currentRouteDomainIds() {
  return [...new Set(buildRouteIndex().map((route) => route.domain))].sort();
}

function currentE2eDomainIds() {
  const manifest = readJson(E2E_MANIFEST_PATH);
  const specs = Array.isArray(manifest?.specs) ? manifest.specs : [];
  return [...new Set(specs.map((spec) => spec.domain).filter((domain) => typeof domain === "string" && domain.trim()))].sort();
}

function validateDomainRegistry(registry) {
  if (registry?.schemaVersion !== 1) {
    throw new Error("domain_registry.json schemaVersion must be 1.");
  }
  if (!Array.isArray(registry.domains)) {
    throw new Error("domain_registry.json domains must be an array.");
  }

  const seenIds = new Set();
  for (const [index, domain] of registry.domains.entries()) {
    if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
      throw new Error(`domains[${index}] must be an object.`);
    }
    for (const field of REQUIRED_DOMAIN_FIELDS) {
      if (!(field in domain)) {
        throw new Error(`domain ${domain.id || `<index ${index}>`} is missing required field: ${field}.`);
      }
    }
    assertNonEmptyString(domain.id, `domains[${index}].id`);
    if (seenIds.has(domain.id)) {
      throw new Error(`Duplicate domain id: ${domain.id}.`);
    }
    seenIds.add(domain.id);

    assertNonEmptyString(domain.summary, `${domain.id}.summary`);
    assertStringArray(domain.ownerHints, `${domain.id}.ownerHints`);
    assertStringArray(domain.typicalSourceGlobs, `${domain.id}.typicalSourceGlobs`);
    assertStringArray(domain.preferredChildSafeChecks, `${domain.id}.preferredChildSafeChecks`, { allowEmpty: true });
    assertStringArray(domain.preferredMainThreadChecks, `${domain.id}.preferredMainThreadChecks`, { allowEmpty: true });
    assertStringArray(domain.mainRiskSignals, `${domain.id}.mainRiskSignals`);
    assertStringArray(domain.evidenceArtifacts, `${domain.id}.evidenceArtifacts`);
    assertNonEmptyString(domain.regressionExpectation, `${domain.id}.regressionExpectation`);
  }

  for (const domainId of REQUIRED_DOMAINS) {
    if (!seenIds.has(domainId)) {
      throw new Error(`Missing required domain id: ${domainId}.`);
    }
  }

  const externallyDeclaredDomains = [
    ...currentRouteDomainIds(),
    ...currentE2eDomainIds(),
    ...KNOWN_SELECTOR_DOMAIN_HINTS,
  ];
  for (const domainId of [...new Set(externallyDeclaredDomains)].sort()) {
    if (!seenIds.has(domainId)) {
      throw new Error(`domain_registry.json is missing currently declared route/E2E domain: ${domainId}.`);
    }
  }
}

function validateSchemas() {
  for (const schemaPath of SCHEMA_PATHS) {
    const schema = readJson(schemaPath);
    assertNonEmptyString(schema.$schema, `${toRepoPath(schemaPath)}.$schema`);
    assertNonEmptyString(schema.title, `${toRepoPath(schemaPath)}.title`);
    if (schema.type !== "object") {
      throw new Error(`${toRepoPath(schemaPath)} type must be object.`);
    }
    if (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties)) {
      throw new Error(`${toRepoPath(schemaPath)} properties must be an object.`);
    }
  }
}

function validatePackageScripts(packageJson) {
  const scripts = packageJson?.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new Error("package.json scripts must be an object.");
  }
  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
    if (scripts[scriptName] !== expectedCommand) {
      throw new Error(`package.json script ${scriptName} must equal "${expectedCommand}".`);
    }
  }
}

export function main() {
  const registry = readJson(DOMAIN_REGISTRY_PATH);
  const packageJson = readJson(PACKAGE_JSON_PATH);

  validateSchemas();
  validateDomainRegistry(registry);
  validatePackageScripts(packageJson);

  console.log(`SF-ATS supervisor schema check passed: ${registry.domains.length} domains, ${SCHEMA_PATHS.length} schemas.`);
}

const runningAsCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (runningAsCli) {
  try {
    main();
  } catch (error) {
    console.error(`SF-ATS supervisor schema check failed: ${error.message}`);
    process.exit(1);
  }
}
