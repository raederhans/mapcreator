import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = path.join(REPO_ROOT, "tools", "ai_test_supervisor", "schemas");

const SCHEMA_FILES = {
  changeDossier: "change_dossier.schema.json",
  supervisorPlan: "supervisor_plan.schema.json",
  verificationLedgerEntry: "verification_ledger_entry.schema.json",
};

function readSchema(fileName) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, fileName), "utf8"));
}

function assertRequiredProperties(schema, propertyNames) {
  assert.ok(Array.isArray(schema.required), `${schema.title} must define required fields.`);
  for (const propertyName of propertyNames) {
    assert.ok(schema.properties[propertyName], `${schema.title} must define ${propertyName}.`);
    assert.ok(schema.required.includes(propertyName), `${schema.title} must require ${propertyName}.`);
  }
}

test("all supervisor schema files parse", () => {
  for (const fileName of Object.values(SCHEMA_FILES)) {
    const schema = readSchema(fileName);
    assert.equal(schema.type, "object");
    assert.ok(schema.properties);
  }
});

test("schemas define required schemaVersion contracts", () => {
  for (const fileName of Object.values(SCHEMA_FILES)) {
    const schema = readSchema(fileName);
    assertRequiredProperties(schema, ["schemaVersion"]);
    assert.equal(schema.properties.schemaVersion.const, 1);
  }
});

test("verification ledger schema includes execution result fields", () => {
  const schema = readSchema(SCHEMA_FILES.verificationLedgerEntry);
  assertRequiredProperties(schema, ["lane", "commandRef", "exitCode", "artifactPaths"]);
});

test("supervisor plan schema includes lane planning fields", () => {
  const schema = readSchema(SCHEMA_FILES.supervisorPlan);
  assertRequiredProperties(schema, [
    "childSafeCommands",
    "mainThreadCommands",
    "ciOnlyCommands",
    "routeGaps",
    "commandsToRun",
    "requiredArtifacts",
  ]);
});

test("change dossier schema includes discovery and risk fields", () => {
  const schema = readSchema(SCHEMA_FILES.changeDossier);
  assertRequiredProperties(schema, [
    "changedFiles",
    "selector",
    "domainSummaries",
    "riskLevel",
    "routeGaps",
  ]);
});
