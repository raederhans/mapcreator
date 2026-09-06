import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  P4_NIGHTLY_AUTHORITY_KIND,
  P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
} from "../tools/verification/p4_nightly_authority.mjs";
import {
  resolveP4NightlyAuthorityReceipt,
  validateP4NightlyAuthorityReceipt,
  validateP4NightlyResolvedAuthority,
} from "../tools/verification/p4_nightly_receipt_resolver.mjs";
import {
  buildP4NightlyRepairPlan,
  captureP4NightlyRepairToolDigests,
  validateP4NightlyRepairPlan,
} from "../tools/verification/p4_nightly_repair.mjs";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const SOURCE_RUN_ID = "101";
const CURRENT_RUN_ID = "202";

function identity(sha = SHA, tree = TREE) {
  return {
    verificationSha: sha,
    verificationTreeSha: tree,
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

function receipt(role = "checker-boundaries") {
  return seal({
    schemaVersion: P4_NIGHTLY_AUTHORITY_SCHEMA_VERSION,
    kind: P4_NIGHTLY_AUTHORITY_KIND,
    role,
    status: "pass",
    sourceIdentity: identity(),
    finalSourceIdentity: identity(),
    commands: [{ commandRef: "focused", status: "pass", exitCode: 0 }],
  });
}

function planInput({ failedRole = "checker-boundaries", rerunScope = "failed" } = {}) {
  const roles = [
    ["checker-boundaries", "Nightly P4 Checker and Python Boundaries", "nightly-p4-checker-boundaries"],
    ["full-policy-tap", "Nightly P4 Canonical Full Policy TAP", "nightly-p4-full-policy"],
    ["fast-contracts-routes", "Nightly P4.4 Fast Contracts and Routes", "nightly-p4-fast"],
  ];
  return {
    sourceRunId: SOURCE_RUN_ID,
    currentRunId: CURRENT_RUN_ID,
    rerunScope,
    expectedSha: SHA,
    expectedTree: TREE,
    currentIdentity: identity(),
    sourceRun: {
      id: Number(SOURCE_RUN_ID),
      status: "completed",
      event: "workflow_dispatch",
      path: ".github/workflows/nightly-verification.yml",
      head_sha: SHA,
      run_attempt: 3,
    },
    sourceJobs: roles.map(([role, name]) => ({
      name,
      conclusion: role === failedRole ? "failure" : "success",
    })),
    sourceJobTotalCount: roles.length,
    sourceArtifacts: roles.filter(([role]) => role !== failedRole).map(([, , prefix], index) => ({
      id: 500 + index,
      name: `${prefix}-${SHA}-3`,
      expired: false,
      digest: `sha256:${String(index + 1).repeat(64)}`,
    })),
    sourceArtifactTotalCount: roles.length - 1,
    toolDigests: {
      planner: "4".repeat(64),
      receiptResolver: "5".repeat(64),
      closeout: "6".repeat(64),
    },
  };
}

test("single failed lane executes while passed lanes have zero spawn count and exact artifact bindings", () => {
  const plan = buildP4NightlyRepairPlan(planInput());
  assert.deepEqual(plan.lanes.map(({ role, disposition, spawnCount }) => ({ role, disposition, spawnCount })), [
    { role: "checker-boundaries", disposition: "executed-current-run", spawnCount: 1 },
    { role: "full-policy-tap", disposition: "reused-exact-prior-run", spawnCount: 0 },
    { role: "fast-contracts-routes", disposition: "reused-exact-prior-run", spawnCount: 0 },
  ]);
  assert.equal(validateP4NightlyRepairPlan(plan, {
    expectedSha: SHA,
    expectedTree: TREE,
    currentRunId: CURRENT_RUN_ID,
  }), plan);
});

test("explicit rerun_scope executes the specified passing lane plus failed lanes", () => {
  const plan = buildP4NightlyRepairPlan(planInput({ rerunScope: "full-policy-tap" }));
  assert.deepEqual(plan.lanes.map((lane) => lane.spawnCount), [1, 1, 0]);
});

test("repair planning rejects missing reuse artifacts and cross-SHA source runs", () => {
  const missing = planInput();
  missing.sourceArtifacts.pop();
  missing.sourceArtifactTotalCount -= 1;
  assert.throws(
    () => buildP4NightlyRepairPlan(missing),
    (error) => error?.code === "p4-nightly-repair-source-artifact-invalid",
  );

  const crossSha = planInput();
  crossSha.sourceRun.head_sha = "c".repeat(40);
  assert.throws(
    () => buildP4NightlyRepairPlan(crossSha),
    (error) => error?.code === "p4-nightly-repair-source-run-invalid",
  );
});

test("repair planning rejects truncated source jobs and artifact REST snapshots", () => {
  const truncatedJobs = planInput();
  truncatedJobs.sourceJobTotalCount += 1;
  assert.throws(
    () => buildP4NightlyRepairPlan(truncatedJobs),
    (error) => error?.code === "p4-nightly-repair-source-jobs-incomplete",
  );

  const truncatedArtifacts = planInput();
  truncatedArtifacts.sourceArtifactTotalCount += 1;
  assert.throws(
    () => buildP4NightlyRepairPlan(truncatedArtifacts),
    (error) => error?.code === "p4-nightly-repair-source-artifacts-incomplete",
  );
});

test("receipt resolver preserves exact digest and rejects forged, missing, and cross-SHA receipts", () => {
  const exact = receipt();
  const digestBefore = exact.receiptDigest;
  assert.equal(validateP4NightlyAuthorityReceipt({
    receipt: exact,
    role: "checker-boundaries",
    expectedSha: SHA,
    expectedTree: TREE,
  }).receiptDigest, digestBefore);

  const forged = structuredClone(exact);
  forged.commands[0].commandRef = "forged";
  assert.throws(() => validateP4NightlyAuthorityReceipt({
    receipt: forged,
    role: "checker-boundaries",
    expectedSha: SHA,
    expectedTree: TREE,
  }), (error) => error?.code === "p4-nightly-authority-receipt-drift");

  assert.throws(() => validateP4NightlyAuthorityReceipt({
    receipt: undefined,
    role: "checker-boundaries",
    expectedSha: SHA,
    expectedTree: TREE,
  }), (error) => error?.code === "p4-nightly-authority-receipt-invalid");

  const crossSha = receipt();
  assert.throws(() => validateP4NightlyAuthorityReceipt({
    receipt: crossSha,
    role: "checker-boundaries",
    expectedSha: "d".repeat(40),
    expectedTree: TREE,
  }), (error) => error?.code === "p4-nightly-source-identity-mismatch");
  assert.equal(crossSha.receiptDigest, digestBefore);
});

test("repair plan rejects forged plan, policy, tool, and artifact digests", () => {
  const cases = [
    (plan) => { plan.planDigest = "0".repeat(64); },
    (plan) => { plan.policy.liveFallbackAttempts = 1; },
    (plan) => { plan.toolDigests.closeout = "0".repeat(64); },
    (plan) => { plan.lanes[1].sourceArtifact.digest = `sha256:${"0".repeat(64)}`; },
  ];
  for (const mutate of cases) {
    const plan = structuredClone(buildP4NightlyRepairPlan(planInput()));
    mutate(plan);
    assert.throws(() => validateP4NightlyRepairPlan(plan, {
      expectedSha: SHA,
      expectedTree: TREE,
      currentRunId: CURRENT_RUN_ID,
    }));
  }
});

test("resolved authority envelope binds receipt, origin, plan, and source artifact metadata", () => {
  const input = planInput();
  input.toolDigests = captureP4NightlyRepairToolDigests();
  const plan = buildP4NightlyRepairPlan(input);
  const exact = receipt("full-policy-tap");
  const resolved = resolveP4NightlyAuthorityReceipt({
    receipt: exact,
    role: "full-policy-tap",
    expectedSha: SHA,
    expectedTree: TREE,
    repairPlan: plan,
    currentRunId: CURRENT_RUN_ID,
  });
  assert.equal(resolved.receiptDigest, exact.receiptDigest);
  assert.equal(resolved.originRunId, SOURCE_RUN_ID);
  assert.equal(resolved.disposition, "reused-exact-prior-run");
  assert.deepEqual(resolved.sourceArtifact, plan.lanes[1].sourceArtifact);

  for (const mutate of [
    (value) => { value.originRunId = CURRENT_RUN_ID; },
    (value) => { value.disposition = "executed-current-run"; },
    (value) => { value.repairPlanDigest = "0".repeat(64); },
    (value) => { value.sourceArtifact.id = "999"; },
    (value) => { value.sourceArtifact.name = "forged"; },
    (value) => { value.sourceArtifact.digest = `sha256:${"0".repeat(64)}`; },
  ]) {
    const forged = structuredClone(resolved);
    mutate(forged);
    assert.throws(() => validateP4NightlyResolvedAuthority({
      resolvedAuthority: forged,
      receipt: exact,
      role: "full-policy-tap",
      expectedSha: SHA,
      expectedTree: TREE,
      repairPlan: plan,
      currentRunId: CURRENT_RUN_ID,
    }), (error) => error?.code === "p4-nightly-resolved-authority-mismatch");
  }
});
