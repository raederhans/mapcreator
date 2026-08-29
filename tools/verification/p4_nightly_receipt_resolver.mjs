import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  P4_NIGHTLY_AUTHORITY_KIND,
  P4_NIGHTLY_AUTHORITY_ROLES,
  P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
} from "./p4_nightly_authority.mjs";
import {
  captureP4NightlyRepairToolDigests,
  validateP4NightlyRepairPlan,
} from "./p4_nightly_repair.mjs";
import { atomicWriteJsonSync } from "./resumable_verification.mjs";

export const P4_NIGHTLY_RESOLVED_AUTHORITY_SCHEMA_VERSION = 1;
export const P4_NIGHTLY_RESOLVED_AUTHORITY_KIND = "p4-nightly-resolved-authority";

const SHA_RE = /^[0-9a-f]{40}$/u;
const SHA256_RE = /^[0-9a-f]{64}$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateIdentity(identity, expectedSha, expectedTree, label) {
  if (
    identity?.verificationSha !== expectedSha
    || identity?.verificationTreeSha !== expectedTree
    || identity?.workspaceClean !== true
    || identity?.trackedClean !== true
    || identity?.includesUntracked !== true
    || identity?.workspaceStatus !== ""
  ) fail("p4-nightly-source-identity-mismatch", `${label} does not match the exact clean source SHA/tree.`);
}

export function validateP4NightlyAuthorityReceipt({
  receipt,
  role,
  expectedSha,
  expectedTree,
} = {}) {
  if (!P4_NIGHTLY_AUTHORITY_ROLES.includes(role)) {
    fail("p4-nightly-authority-role-invalid", `Unknown P4 Nightly authority role: ${role || "<empty>"}.`);
  }
  if (!SHA_RE.test(expectedSha || "") || !SHA_RE.test(expectedTree || "")) {
    fail("p4-nightly-expected-identity-invalid", "Receipt validation requires an exact expected SHA/tree.");
  }
  if (
    receipt?.schemaVersion !== P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION
    || receipt?.kind !== P4_NIGHTLY_AUTHORITY_KIND
    || receipt?.role !== role
    || receipt?.status !== "pass"
  ) fail("p4-nightly-authority-receipt-invalid", `Authority receipt is invalid for ${role}.`);

  const body = { ...receipt };
  delete body.receiptDigest;
  if (!SHA256_RE.test(receipt.receiptDigest || "")
    || sha256(JSON.stringify(body)) !== receipt.receiptDigest) {
    fail("p4-nightly-authority-receipt-drift", `Authority receipt drifted for ${role}.`);
  }
  validateIdentity(receipt.sourceIdentity, expectedSha, expectedTree, `${role} source`);
  validateIdentity(receipt.finalSourceIdentity, expectedSha, expectedTree, `${role} final source`);
  if (!Array.isArray(receipt.commands)
    || receipt.commands.some((entry) => entry.status !== "pass" || entry.exitCode !== 0)) {
    fail("p4-nightly-authority-command-failed", `${role} did not pass every owned command.`);
  }
  return receipt;
}

export function resolveP4NightlyAuthorityReceipt({
  receipt,
  role,
  expectedSha,
  expectedTree,
  repairPlan,
  currentRunId,
} = {}) {
  const validatedReceipt = validateP4NightlyAuthorityReceipt({
    receipt,
    role,
    expectedSha,
    expectedTree,
  });
  const validatedPlan = validateP4NightlyRepairPlan(repairPlan, {
    expectedSha,
    expectedTree,
    currentRunId,
    expectedToolDigests: captureP4NightlyRepairToolDigests(),
  });
  const lane = validatedPlan.lanes.find((entry) => entry.role === role);
  if (!lane) fail("p4-nightly-resolved-authority-lane-missing", `Repair plan has no ${role} lane.`);
  const resolved = {
    schemaVersion: P4_NIGHTLY_RESOLVED_AUTHORITY_SCHEMA_VERSION,
    kind: P4_NIGHTLY_RESOLVED_AUTHORITY_KIND,
    status: "pass",
    role,
    receiptDigest: validatedReceipt.receiptDigest,
    originRunId: lane.originRunId,
    disposition: lane.disposition,
    sourceIdentity: {
      verificationSha: expectedSha,
      verificationTreeSha: expectedTree,
    },
    repairPlanDigest: validatedPlan.planDigest,
    repairPolicyDigest: validatedPlan.policyDigest,
    repairToolDigests: validatedPlan.toolDigests,
    ...(lane.sourceArtifact ? { sourceArtifact: lane.sourceArtifact } : {}),
  };
  resolved.resolvedAuthorityDigest = sha256(stableJson(resolved));
  return resolved;
}

export function validateP4NightlyResolvedAuthority({
  resolvedAuthority,
  receipt,
  role,
  expectedSha,
  expectedTree,
  repairPlan,
  currentRunId,
} = {}) {
  const expected = resolveP4NightlyAuthorityReceipt({
    receipt,
    role,
    expectedSha,
    expectedTree,
    repairPlan,
    currentRunId,
  });
  if (stableJson(resolvedAuthority) !== stableJson(expected)) {
    fail("p4-nightly-resolved-authority-mismatch", `Resolved authority provenance drifted for ${role}.`);
  }
  return resolvedAuthority;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = {
    receipt: "",
    role: "",
    expectedSha: "",
    expectedTree: "",
    repairPlan: "",
    currentRunId: "",
    out: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--receipt") args.receipt = argv[++index] || "";
    else if (token === "--role") args.role = argv[++index] || "";
    else if (token === "--expected-sha") args.expectedSha = argv[++index] || "";
    else if (token === "--expected-tree") args.expectedTree = argv[++index] || "";
    else if (token === "--repair-plan") args.repairPlan = argv[++index] || "";
    else if (token === "--current-run-id") args.currentRunId = argv[++index] || "";
    else if (token === "--out") args.out = argv[++index] || "";
    else fail("p4-nightly-receipt-argument-invalid", `Unknown receipt resolver argument: ${token}`);
  }
  return args;
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.repairPlan || !args.currentRunId || !args.out) {
      fail("p4-nightly-resolved-authority-argument-missing", "Receipt resolution requires repair plan, current run id, and output path.");
    }
    const resolved = resolveP4NightlyAuthorityReceipt({
      receipt: readJson(args.receipt),
      role: args.role,
      expectedSha: args.expectedSha,
      expectedTree: args.expectedTree,
      repairPlan: readJson(args.repairPlan),
      currentRunId: args.currentRunId,
    });
    atomicWriteJsonSync(path.resolve(args.out), resolved);
    console.log(`P4 Nightly receipt passed role=${resolved.role} digest=${resolved.receiptDigest} origin=${resolved.originRunId}`);
  } catch (error) {
    console.error(`P4 Nightly receipt failed code=${error?.code || "p4-nightly-receipt-error"} message=${error?.message || error}`);
    process.exitCode = 1;
  }
}
