import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  P4_NIGHTLY_AUTHORITY_KIND,
  P4_NIGHTLY_AUTHORITY_ROLES,
  P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
  P4_NIGHTLY_FAST_COMMANDS,
  P4_NIGHTLY_FULL_POLICY_COMMAND,
  P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS,
} from "./p4_nightly_authority.mjs";
import {
  validateP4NightlyAuthorityReceipt,
  validateP4NightlyResolvedAuthority,
} from "./p4_nightly_receipt_resolver.mjs";
import {
  captureP4NightlyRepairToolDigests,
  validateP4NightlyRepairPlan,
} from "./p4_nightly_repair.mjs";
import { P4_STATE_WRITER_POLICY_TEST_FILES } from "../run_p4_state_writer_policy_tests.mjs";
import {
  STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE,
  STATE_WRITER_POLICY_EVIDENCE_KIND,
  STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION,
} from "./state_writer_policy_evidence.mjs";
import { atomicWriteJsonSync } from "./resumable_verification.mjs";

export const P4_NIGHTLY_CLOSEOUT_SCHEMA_VERSION = 1;
export const P4_NIGHTLY_CLOSEOUT_KIND = "p4-nightly-closeout";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
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

function evidenceDigest(evidence) {
  const body = { ...evidence };
  delete body.evidenceId;
  return sha256(stableJson(body));
}

export function validateP4NightlyCloseout({
  authorities,
  expectedSha,
  expectedTree,
  evidence,
  canonicalTap,
  completedArtifact,
  repairPlan,
  resolvedAuthorities,
  currentRunId,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(expectedSha || "") || !/^[0-9a-f]{40}$/u.test(expectedTree || "")) {
    fail("p4-nightly-expected-identity-invalid", "Closeout requires an exact expected SHA/tree.");
  }
  if (!Array.isArray(authorities) || authorities.length !== P4_NIGHTLY_AUTHORITY_ROLES.length) {
    fail("p4-nightly-authority-count", "Closeout requires exactly three authority receipts.");
  }
  const byRole = new Map();
  for (const receipt of authorities) {
    if (
      receipt?.schemaVersion !== P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION
      || receipt?.kind !== P4_NIGHTLY_AUTHORITY_KIND
      || receipt?.status !== "pass"
      || !P4_NIGHTLY_AUTHORITY_ROLES.includes(receipt?.role)
      || byRole.has(receipt.role)
    ) fail("p4-nightly-authority-role-set", "Each P4 Nightly authority role must appear exactly once and pass.");
    validateP4NightlyAuthorityReceipt({ receipt, role: receipt.role, expectedSha, expectedTree });
    byRole.set(receipt.role, receipt);
  }

  const validatedRepairPlan = repairPlan === undefined
    ? null
    : validateP4NightlyRepairPlan(repairPlan, {
      expectedSha,
      expectedTree,
      currentRunId,
      expectedToolDigests: captureP4NightlyRepairToolDigests(),
    });
  const resolvedByRole = new Map();
  if (validatedRepairPlan) {
    if (!Array.isArray(resolvedAuthorities)
      || resolvedAuthorities.length !== P4_NIGHTLY_AUTHORITY_ROLES.length) {
      fail("p4-nightly-resolved-authority-count", "Repair closeout requires exactly three resolved authority envelopes.");
    }
    for (const resolvedAuthority of resolvedAuthorities) {
      const role = resolvedAuthority?.role;
      if (!P4_NIGHTLY_AUTHORITY_ROLES.includes(role) || resolvedByRole.has(role)) {
        fail("p4-nightly-resolved-authority-role-set", "Each resolved authority role must appear exactly once.");
      }
      validateP4NightlyResolvedAuthority({
        resolvedAuthority,
        receipt: byRole.get(role),
        role,
        expectedSha,
        expectedTree,
        repairPlan: validatedRepairPlan,
        currentRunId,
      });
      resolvedByRole.set(role, resolvedAuthority);
    }
  } else if (resolvedAuthorities !== undefined) {
    fail("p4-nightly-resolved-authority-unexpected", "Resolved authority envelopes require a repair plan.");
  }

  const checker = byRole.get("checker-boundaries");
  const boundaryEvidence = checker.checker?.boundaryEvidence;
  if (
    !sameArray(checker.commands.map((entry) => entry.commandRef), [
      "node tools/verification/state_writer_policy_evidence.mjs produce --phase P4.3",
      ...P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS,
    ])
    || checker.checker?.producerRole !== STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE
    || checker.checker?.checkerCount !== 1
    || checker.checker?.liveFallbackAttempts !== 0
    || !/^[0-9a-f]{64}$/u.test(checker.checker?.evidenceId || "")
    || !Array.isArray(boundaryEvidence)
    || !sameArray(boundaryEvidence.map((entry) => entry.commandRef), P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS)
    || boundaryEvidence.some((entry) => entry.evidenceId !== checker.checker.evidenceId)
    || evidence?.evidenceId !== checker.checker.evidenceId
    || evidenceDigest(evidence) !== evidence?.evidenceId
    || evidence?.schemaVersion !== STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION
    || evidence?.kind !== STATE_WRITER_POLICY_EVIDENCE_KIND
    || evidence?.phase !== "P4.3"
    || evidence?.producer?.role !== STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE
    || evidence?.verificationIdentity?.verificationSha !== expectedSha
    || evidence?.verificationIdentity?.verificationTreeSha !== expectedTree
  ) fail("p4-nightly-checker-evidence-invalid", "Checker producer/evidence/boundary identity contract failed.");

  const full = byRole.get("full-policy-tap");
  const fullStartIdentity = completedArtifact?.verificationIdentity?.start;
  const fullEndIdentity = completedArtifact?.verificationIdentity?.end;
  if (
    !sameArray(full.commands.map((entry) => entry.commandRef), [P4_NIGHTLY_FULL_POLICY_COMMAND])
    || full.fullPolicy?.admissionEligible !== true
    || full.fullPolicy?.canonicalFullPlanCount !== 1
    || completedArtifact?.status !== "passed"
    || completedArtifact?.admissionEligible !== true
    || completedArtifact?.planIdentityVerified !== true
    || completedArtifact?.planIdentity !== full.fullPolicy.planIdentity
    || full.fullPolicy.planIdentity !== full.fullPolicy.expectedPlanIdentity
    || !sameArray(full.fullPolicy?.testArguments, P4_STATE_WRITER_POLICY_TEST_FILES)
    || completedArtifact?.canonicalSha256 !== full.fullPolicy.canonicalSha256
    || sha256(canonicalTap || "") !== completedArtifact?.canonicalSha256
    || !sameArray(completedArtifact?.args, ["--test", ...P4_STATE_WRITER_POLICY_TEST_FILES])
    || fullStartIdentity?.available !== true
    || fullEndIdentity?.available !== true
    || fullStartIdentity?.workspaceClean !== true
    || fullEndIdentity?.workspaceClean !== true
    || fullStartIdentity?.includesUntracked !== true
    || fullEndIdentity?.includesUntracked !== true
    || fullStartIdentity?.verificationSha !== expectedSha
    || fullEndIdentity?.verificationSha !== expectedSha
    || fullStartIdentity?.verificationTreeSha !== expectedTree
    || fullEndIdentity?.verificationTreeSha !== expectedTree
  ) fail("p4-nightly-full-policy-invalid", "Canonical full TAP admission/plan contract failed.");

  const fast = byRole.get("fast-contracts-routes");
  if (
    !sameArray(fast.commands.map((entry) => entry.commandRef), P4_NIGHTLY_FAST_COMMANDS)
    || fast.fast?.contracts !== "pass"
    || fast.fast?.routes !== "pass"
  ) fail("p4-nightly-fast-authority-invalid", "Fast P4.3 contracts/routes authority did not pass exactly once.");

  const result = {
    schemaVersion: P4_NIGHTLY_CLOSEOUT_SCHEMA_VERSION,
    kind: P4_NIGHTLY_CLOSEOUT_KIND,
    status: "pass",
    sourceIdentity: { verificationSha: expectedSha, verificationTreeSha: expectedTree },
    roles: [...P4_NIGHTLY_AUTHORITY_ROLES],
    evidenceId: checker.checker.evidenceId,
    checkerCount: 1,
    liveFallbackAttempts: 0,
    canonicalFullPlanCount: 1,
    fastContracts: "pass",
    fastRoutes: "pass",
  };
  if (validatedRepairPlan) {
    result.authorityOrigins = validatedRepairPlan.lanes.map((lane) => ({
      role: lane.role,
      originRunId: resolvedByRole.get(lane.role).originRunId,
      disposition: resolvedByRole.get(lane.role).disposition,
      receiptDigest: resolvedByRole.get(lane.role).receiptDigest,
      resolvedAuthorityDigest: resolvedByRole.get(lane.role).resolvedAuthorityDigest,
      ...(resolvedByRole.get(lane.role).sourceArtifact
        ? { sourceArtifact: resolvedByRole.get(lane.role).sourceArtifact }
        : {}),
    }));
    result.repairPlanDigest = validatedRepairPlan.planDigest;
    result.repairPolicyDigest = validatedRepairPlan.policyDigest;
    result.repairToolDigests = validatedRepairPlan.toolDigests;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = {
    authorities: [],
    resolvedAuthorities: [],
    expectedSha: "",
    expectedTree: "",
    evidence: "",
    tap: "",
    completed: "",
    repairPlan: "",
    currentRunId: "",
    out: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--authority") args.authorities.push(argv[++index] || "");
    else if (token === "--resolved-authority") args.resolvedAuthorities.push(argv[++index] || "");
    else if (token === "--expected-sha") args.expectedSha = argv[++index] || "";
    else if (token === "--expected-tree") args.expectedTree = argv[++index] || "";
    else if (token === "--evidence") args.evidence = argv[++index] || "";
    else if (token === "--tap") args.tap = argv[++index] || "";
    else if (token === "--completed") args.completed = argv[++index] || "";
    else if (token === "--repair-plan") args.repairPlan = argv[++index] || "";
    else if (token === "--current-run-id") args.currentRunId = argv[++index] || "";
    else if (token === "--out") args.out = argv[++index] || "";
    else throw new Error(`Unknown P4 Nightly closeout argument: ${token}`);
  }
  return args;
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = validateP4NightlyCloseout({
      authorities: args.authorities.map(readJson),
      expectedSha: args.expectedSha,
      expectedTree: args.expectedTree,
      evidence: readJson(args.evidence),
      canonicalTap: fs.readFileSync(args.tap, "utf8"),
      completedArtifact: readJson(args.completed),
      ...(args.repairPlan ? {
        repairPlan: readJson(args.repairPlan),
        resolvedAuthorities: args.resolvedAuthorities.map(readJson),
        currentRunId: args.currentRunId,
      } : {}),
    });
    if (!args.out) fail("p4-nightly-closeout-output-missing", "Closeout requires --out.");
    atomicWriteJsonSync(path.resolve(args.out), result);
    console.log(`P4 Nightly closeout passed evidence=${result.evidenceId}`);
  } catch (error) {
    console.error(`P4 Nightly closeout failed code=${error?.code || "p4-nightly-closeout-error"} message=${error?.message || error}`);
    process.exitCode = 1;
  }
}
