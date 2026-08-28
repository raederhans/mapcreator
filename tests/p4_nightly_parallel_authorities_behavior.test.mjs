import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  P4_NIGHTLY_AUTHORITY_KIND,
  P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
  P4_NIGHTLY_FAST_COMMANDS,
  P4_NIGHTLY_FULL_POLICY_COMMAND,
  P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS,
  buildP4NightlyAuthorityPlan,
} from "../tools/verification/p4_nightly_authority.mjs";
import { validateP4NightlyCloseout } from "../tools/verification/p4_nightly_closeout.mjs";
import { P4_STATE_WRITER_POLICY_TEST_FILES } from "../tools/run_p4_state_writer_policy_tests.mjs";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PLAN_ID = "sha256:canonical-full-plan";
const TAP = "TAP version 13\n1..1\nok 1 - canonical\n";

function identity() {
  return {
    verificationSha: SHA,
    verificationTreeSha: TREE,
    workspaceClean: true,
    trackedClean: true,
    includesUntracked: true,
    workspaceStatus: "",
  };
}

function seal(receipt) {
  return {
    ...receipt,
    receiptDigest: crypto.createHash("sha256").update(JSON.stringify(receipt)).digest("hex"),
  };
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

function command(commandRef, evidenceId = undefined) {
  return { commandRef, status: "pass", exitCode: 0, ...(evidenceId ? { evidenceId } : {}) };
}

function fixtures() {
  const evidence = {
    schemaVersion: 1,
    kind: "state-writer-policy-checker-evidence",
    phase: "P4.3",
    producer: { role: "checker-producer" },
    verificationIdentity: identity(),
  };
  evidence.evidenceId = crypto.createHash("sha256").update(stableJson(evidence)).digest("hex");
  const evidenceId = evidence.evidenceId;
  const checkerCommands = [
    command("node tools/verification/state_writer_policy_evidence.mjs produce --phase P4.3", evidenceId),
    ...P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS.map((commandRef) => command(commandRef)),
  ];
  const authorities = [
    seal({
      schemaVersion: P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
      kind: P4_NIGHTLY_AUTHORITY_KIND,
      role: "checker-boundaries",
      status: "pass",
      sourceIdentity: identity(),
      finalSourceIdentity: identity(),
      commands: checkerCommands,
      checker: {
        producerRole: "checker-producer",
        checkerCount: 1,
        liveFallbackAttempts: 0,
        evidenceId,
        boundaryEvidence: P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS.map((commandRef) => ({
          commandRef,
          evidenceId,
        })),
      },
    }),
    seal({
      schemaVersion: P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
      kind: P4_NIGHTLY_AUTHORITY_KIND,
      role: "full-policy-tap",
      status: "pass",
      sourceIdentity: identity(),
      finalSourceIdentity: identity(),
      commands: [command(P4_NIGHTLY_FULL_POLICY_COMMAND)],
      fullPolicy: {
        admissionEligible: true,
        canonicalFullPlanCount: 1,
        planIdentity: PLAN_ID,
        expectedPlanIdentity: PLAN_ID,
        testArguments: P4_STATE_WRITER_POLICY_TEST_FILES,
        canonicalSha256: crypto.createHash("sha256").update(TAP).digest("hex"),
      },
    }),
    seal({
      schemaVersion: P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
      kind: P4_NIGHTLY_AUTHORITY_KIND,
      role: "fast-contracts-routes",
      status: "pass",
      sourceIdentity: identity(),
      finalSourceIdentity: identity(),
      commands: P4_NIGHTLY_FAST_COMMANDS.map((commandRef) => command(commandRef)),
      fast: { contracts: "pass", routes: "pass" },
    }),
  ];
  return {
    authorities,
    expectedSha: SHA,
    expectedTree: TREE,
    evidence,
    canonicalTap: TAP,
    completedArtifact: {
      status: "passed",
      admissionEligible: true,
      planIdentityVerified: true,
      planIdentity: PLAN_ID,
      canonicalSha256: crypto.createHash("sha256").update(TAP).digest("hex"),
      args: ["--test", ...P4_STATE_WRITER_POLICY_TEST_FILES],
      verificationIdentity: {
        start: { ...identity(), available: true },
        end: { ...identity(), available: true },
      },
    },
  };
}

test("P4 Nightly splits the former exact plan into three disjoint authorities", () => {
  const checker = buildP4NightlyAuthorityPlan("checker-boundaries");
  const full = buildP4NightlyAuthorityPlan("full-policy-tap");
  const fast = buildP4NightlyAuthorityPlan("fast-contracts-routes");
  assert.equal(checker.commands.length, 1 + P4_NIGHTLY_PYTHON_BOUNDARY_COMMANDS.length);
  assert.deepEqual(full.commands, [P4_NIGHTLY_FULL_POLICY_COMMAND]);
  assert.deepEqual(fast.commands, P4_NIGHTLY_FAST_COMMANDS);
  assert.equal(new Set([...checker.commands, ...full.commands, ...fast.commands]).size,
    checker.commands.length + full.commands.length + fast.commands.length);
});

test("P4 closeout accepts exactly one passing receipt for every authority", () => {
  const result = validateP4NightlyCloseout(fixtures());
  assert.equal(result.status, "pass");
  assert.equal(result.evidenceId, fixtures().evidence.evidenceId);
  assert.equal(result.checkerCount, 1);
  assert.equal(result.liveFallbackAttempts, 0);
  assert.equal(result.canonicalFullPlanCount, 1);
});

test("P4 closeout fails closed on role, identity, evidence, full-plan, and fast-route drift", () => {
  const cases = [
    (value) => { value.authorities[2] = value.authorities[1]; },
    (value) => { value.authorities[0].sourceIdentity.verificationTreeSha = "d".repeat(40); },
    (value) => { value.evidence.evidenceId = "e".repeat(64); },
    (value) => { value.completedArtifact.admissionEligible = false; },
    (value) => { value.authorities[2].fast.routes = "fail"; },
  ];
  for (const mutate of cases) {
    const value = fixtures();
    mutate(value);
    assert.throws(() => validateP4NightlyCloseout(value));
  }
});
