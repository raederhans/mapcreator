import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { P4_NIGHTLY_AUTHORITY_ROLES } from "./p4_nightly_authority.mjs";
import {
  atomicWriteJsonSync,
  captureVerificationIdentity,
} from "./resumable_verification.mjs";

export const P4_NIGHTLY_REPAIR_PLAN_SCHEMA_VERSION = 1;
export const P4_NIGHTLY_REPAIR_PLAN_KIND = "p4-nightly-exact-repair-plan";
export const P4_NIGHTLY_REPAIR_DISPOSITIONS = Object.freeze([
  "executed-current-run",
  "reused-exact-prior-run",
]);

const SHA_RE = /^[0-9a-f]{40}$/u;
const SHA256_RE = /^[0-9a-f]{64}$/u;
const RUN_ID_RE = /^[1-9][0-9]*$/u;
const SOURCE_WORKFLOW_PATH = ".github/workflows/nightly-verification.yml";
const SOURCE_EVENTS = new Set(["schedule", "workflow_dispatch"]);
const JOB_CONCLUSIONS = new Set([
  "success",
  "failure",
  "neutral",
  "cancelled",
  "skipped",
  "timed_out",
  "action_required",
  "stale",
]);
const ROLE_JOBS = Object.freeze({
  "checker-boundaries": "Nightly P4 Checker and Python Boundaries",
  "full-policy-tap": "Nightly P4 Canonical Full Policy TAP",
  "fast-contracts-routes": "Nightly P4.3 Fast Contracts and Routes",
});
const ROLE_ARTIFACT_PREFIXES = Object.freeze({
  "checker-boundaries": "nightly-p4-checker-boundaries",
  "full-policy-tap": "nightly-p4-full-policy",
  "fast-contracts-routes": "nightly-p4-fast",
});
const REPAIR_POLICY = Object.freeze({
  identityReuse: "exact-sha-tree-only",
  crossShaRebind: "forbidden",
  cleanTreeRequired: true,
  liveFallbackAttempts: 0,
  authorityIndependence: "preserved",
  passedLaneAction: "download-and-validate-receipt-only",
  failedOrScopedLaneAction: "execute",
});
const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
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

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function fileDigest(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function captureP4NightlyRepairToolDigests() {
  return {
    planner: fileDigest(path.join(TOOL_DIR, "p4_nightly_repair.mjs")),
    receiptResolver: fileDigest(path.join(TOOL_DIR, "p4_nightly_receipt_resolver.mjs")),
    closeout: fileDigest(path.join(TOOL_DIR, "p4_nightly_closeout.mjs")),
  };
}

function normalizeRunId(value, label) {
  const normalized = String(value ?? "").trim();
  if (!RUN_ID_RE.test(normalized)) fail("p4-nightly-repair-run-id-invalid", `${label} must be a positive run id.`);
  return normalized;
}

function parseRerunScope(rerunScope) {
  const tokens = String(rerunScope || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (tokens.length === 0) fail("p4-nightly-repair-scope-invalid", "Repair requires rerun_scope.");
  const requested = new Set();
  let failedSeen = false;
  for (const token of tokens) {
    if (token === "failed") {
      if (failedSeen) fail("p4-nightly-repair-scope-invalid", "Duplicate rerun_scope lane: failed.");
      failedSeen = true;
      continue;
    }
    if (!P4_NIGHTLY_AUTHORITY_ROLES.includes(token)) {
      fail("p4-nightly-repair-scope-invalid", `Unknown rerun_scope lane: ${token}.`);
    }
    if (requested.has(token)) fail("p4-nightly-repair-scope-invalid", `Duplicate rerun_scope lane: ${token}.`);
    requested.add(token);
  }
  return requested;
}

function exactSourceJob(sourceJobs, role) {
  const expectedName = ROLE_JOBS[role];
  const matches = sourceJobs.filter((job) => job?.name === expectedName);
  if (matches.length !== 1 || !JOB_CONCLUSIONS.has(matches[0]?.conclusion)) {
    fail("p4-nightly-repair-source-job-invalid", `Source run must contain exactly one terminal ${role} job.`);
  }
  return matches[0];
}

function exactSourceArtifact(sourceArtifacts, role, sourceSha, sourceRunAttempt) {
  const expectedName = `${ROLE_ARTIFACT_PREFIXES[role]}-${sourceSha}-${sourceRunAttempt}`;
  const matches = sourceArtifacts.filter((artifact) => artifact?.name === expectedName);
  if (
    matches.length !== 1
    || matches[0]?.expired !== false
    || !Number.isSafeInteger(matches[0]?.id)
    || matches[0].id <= 0
    || !/^sha256:[0-9a-f]{64}$/u.test(matches[0]?.digest || "")
  ) fail("p4-nightly-repair-source-artifact-invalid", `Reusable ${role} artifact is missing, expired, duplicated, or digest-invalid.`);
  return matches[0];
}

function validateToolDigests(toolDigests) {
  const normalized = {
    planner: String(toolDigests?.planner || "").toLowerCase(),
    receiptResolver: String(toolDigests?.receiptResolver || "").toLowerCase(),
    closeout: String(toolDigests?.closeout || "").toLowerCase(),
  };
  if (Object.values(normalized).some((value) => !SHA256_RE.test(value))) {
    fail("p4-nightly-repair-tool-digest-invalid", "Repair requires exact planner, receipt resolver, and closeout tool digests.");
  }
  return normalized;
}

function validateCompleteSourceSnapshot(items, totalCount, label) {
  if (!Array.isArray(items)
    || !Number.isSafeInteger(totalCount)
    || totalCount < 0
    || totalCount !== items.length) {
    fail(`p4-nightly-repair-source-${label}-incomplete`, `Source ${label} REST snapshot must be complete.`);
  }
}

export function buildP4NightlyRepairPlan({
  sourceRunId,
  currentRunId,
  rerunScope,
  expectedSha,
  expectedTree,
  currentIdentity,
  sourceRun,
  sourceJobs = [],
  sourceJobTotalCount,
  sourceArtifacts = [],
  sourceArtifactTotalCount,
  toolDigests,
} = {}) {
  const normalizedSourceRunId = normalizeRunId(sourceRunId, "source_run_id");
  const normalizedCurrentRunId = normalizeRunId(currentRunId, "current run id");
  if (normalizedSourceRunId === normalizedCurrentRunId) {
    fail("p4-nightly-repair-source-run-current", "Repair source run must be a prior run.");
  }
  if (!SHA_RE.test(expectedSha || "") || !SHA_RE.test(expectedTree || "")) {
    fail("p4-nightly-repair-identity-invalid", "Repair requires an exact current SHA/tree.");
  }
  if (
    currentIdentity?.verificationSha !== expectedSha
    || currentIdentity?.verificationTreeSha !== expectedTree
    || currentIdentity?.workspaceClean !== true
    || currentIdentity?.trackedClean !== true
    || currentIdentity?.includesUntracked !== true
    || currentIdentity?.workspaceStatus !== ""
  ) fail("p4-nightly-repair-current-identity-invalid", "Repair planning requires the exact clean current SHA/tree.");
  if (
    String(sourceRun?.id) !== normalizedSourceRunId
    || sourceRun?.status !== "completed"
    || !SOURCE_EVENTS.has(sourceRun?.event)
    || sourceRun?.path !== SOURCE_WORKFLOW_PATH
    || sourceRun?.head_sha !== expectedSha
    || !Number.isSafeInteger(sourceRun?.run_attempt)
    || sourceRun.run_attempt < 1
  ) fail("p4-nightly-repair-source-run-invalid", "Source run identity or workflow authority is invalid.");
  validateCompleteSourceSnapshot(sourceJobs, sourceJobTotalCount, "jobs");
  validateCompleteSourceSnapshot(sourceArtifacts, sourceArtifactTotalCount, "artifacts");

  const requested = parseRerunScope(rerunScope);
  const lanes = [];
  for (const role of P4_NIGHTLY_AUTHORITY_ROLES) {
    const sourceJob = exactSourceJob(sourceJobs, role);
    const execute = sourceJob.conclusion !== "success" || requested.has(role);
    const lane = {
      role,
      sourceConclusion: sourceJob.conclusion,
      disposition: execute ? "executed-current-run" : "reused-exact-prior-run",
      originRunId: execute ? normalizedCurrentRunId : normalizedSourceRunId,
      spawnCount: execute ? 1 : 0,
    };
    if (!execute) {
      const artifact = exactSourceArtifact(sourceArtifacts, role, expectedSha, sourceRun.run_attempt);
      lane.sourceArtifact = {
        id: String(artifact.id),
        name: artifact.name,
        digest: artifact.digest,
      };
    }
    lanes.push(lane);
  }

  const policyDigest = digest(REPAIR_POLICY);
  const plan = {
    schemaVersion: P4_NIGHTLY_REPAIR_PLAN_SCHEMA_VERSION,
    kind: P4_NIGHTLY_REPAIR_PLAN_KIND,
    status: "ready",
    sourceRunId: normalizedSourceRunId,
    sourceRunAttempt: sourceRun.run_attempt,
    sourceSnapshot: {
      jobsTotalCount: sourceJobTotalCount,
      artifactsTotalCount: sourceArtifactTotalCount,
    },
    currentRunId: normalizedCurrentRunId,
    rerunScope: String(rerunScope),
    sourceIdentity: { ...currentIdentity },
    policy: REPAIR_POLICY,
    policyDigest,
    toolDigests: validateToolDigests(toolDigests),
    lanes,
  };
  plan.planDigest = digest(plan);
  return plan;
}

export function validateP4NightlyRepairPlan(plan, {
  expectedSha,
  expectedTree,
  currentRunId,
  expectedToolDigests,
} = {}) {
  const normalizedCurrentRunId = normalizeRunId(currentRunId, "current run id");
  const normalizedSourceRunId = normalizeRunId(plan?.sourceRunId, "source_run_id");
  const requested = parseRerunScope(plan?.rerunScope);
  if (
    plan?.schemaVersion !== P4_NIGHTLY_REPAIR_PLAN_SCHEMA_VERSION
    || plan?.kind !== P4_NIGHTLY_REPAIR_PLAN_KIND
    || plan?.status !== "ready"
    || plan?.currentRunId !== normalizedCurrentRunId
    || plan?.sourceRunId !== normalizedSourceRunId
    || normalizedSourceRunId === normalizedCurrentRunId
    || !Number.isSafeInteger(plan?.sourceRunAttempt)
    || plan.sourceRunAttempt < 1
    || !Number.isSafeInteger(plan?.sourceSnapshot?.jobsTotalCount)
    || plan.sourceSnapshot.jobsTotalCount < P4_NIGHTLY_AUTHORITY_ROLES.length
    || !Number.isSafeInteger(plan?.sourceSnapshot?.artifactsTotalCount)
    || plan.sourceSnapshot.artifactsTotalCount < 0
    || plan?.sourceIdentity?.verificationSha !== expectedSha
    || plan?.sourceIdentity?.verificationTreeSha !== expectedTree
    || plan?.sourceIdentity?.workspaceClean !== true
    || plan?.sourceIdentity?.trackedClean !== true
    || plan?.sourceIdentity?.includesUntracked !== true
    || plan?.sourceIdentity?.workspaceStatus !== ""
    || digest(plan?.policy) !== plan?.policyDigest
    || stableJson(plan?.policy) !== stableJson(REPAIR_POLICY)
    || !SHA256_RE.test(plan?.planDigest || "")
  ) fail("p4-nightly-repair-plan-invalid", "Repair plan schema, identity, or policy is invalid.");
  const body = { ...plan };
  delete body.planDigest;
  if (digest(body) !== plan.planDigest) fail("p4-nightly-repair-plan-drift", "Repair plan digest drifted.");
  validateToolDigests(plan.toolDigests);
  if (expectedToolDigests
    && stableJson(plan.toolDigests) !== stableJson(validateToolDigests(expectedToolDigests))) {
    fail("p4-nightly-repair-tool-digest-mismatch", "Repair plan tool digests do not match the closeout checkout.");
  }
  if (!Array.isArray(plan.lanes) || plan.lanes.length !== P4_NIGHTLY_AUTHORITY_ROLES.length) {
    fail("p4-nightly-repair-lane-set-invalid", "Repair plan must contain exactly three lanes.");
  }
  for (let index = 0; index < P4_NIGHTLY_AUTHORITY_ROLES.length; index += 1) {
    const lane = plan.lanes[index];
    const role = P4_NIGHTLY_AUTHORITY_ROLES[index];
    const mustExecute = lane?.sourceConclusion !== "success" || requested.has(role);
    if (
      lane?.role !== role
      || !JOB_CONCLUSIONS.has(lane?.sourceConclusion)
      || !P4_NIGHTLY_REPAIR_DISPOSITIONS.includes(lane?.disposition)
      || lane.disposition !== (mustExecute ? "executed-current-run" : "reused-exact-prior-run")
      || lane?.originRunId !== (mustExecute ? normalizedCurrentRunId : normalizedSourceRunId)
      || lane?.spawnCount !== (lane.disposition === "executed-current-run" ? 1 : 0)
    ) fail("p4-nightly-repair-lane-invalid", `Repair lane contract is invalid for ${role}.`);
    if (lane.disposition === "reused-exact-prior-run") {
      if (
        !RUN_ID_RE.test(lane.originRunId)
        || !RUN_ID_RE.test(lane.sourceArtifact?.id || "")
        || lane.sourceArtifact?.name !== `${ROLE_ARTIFACT_PREFIXES[role]}-${expectedSha}-${plan.sourceRunAttempt}`
        || !/^sha256:[0-9a-f]{64}$/u.test(lane.sourceArtifact?.digest || "")
      ) fail("p4-nightly-repair-artifact-binding-invalid", `Reusable artifact binding is invalid for ${role}.`);
    } else if (lane.sourceArtifact !== undefined) {
      fail("p4-nightly-repair-artifact-binding-invalid", `Executed lane ${role} cannot claim a reused artifact.`);
    }
  }
  return plan;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = {
    sourceRunId: "",
    currentRunId: "",
    rerunScope: "",
    expectedSha: "",
    expectedTree: "",
    sourceRun: "",
    sourceJobs: "",
    sourceArtifacts: "",
    plannerDigest: "",
    resolverDigest: "",
    closeoutDigest: "",
    out: "",
    githubOutput: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source-run-id") args.sourceRunId = argv[++index] || "";
    else if (token === "--current-run-id") args.currentRunId = argv[++index] || "";
    else if (token === "--rerun-scope") args.rerunScope = argv[++index] || "";
    else if (token === "--expected-sha") args.expectedSha = argv[++index] || "";
    else if (token === "--expected-tree") args.expectedTree = argv[++index] || "";
    else if (token === "--source-run") args.sourceRun = argv[++index] || "";
    else if (token === "--source-jobs") args.sourceJobs = argv[++index] || "";
    else if (token === "--source-artifacts") args.sourceArtifacts = argv[++index] || "";
    else if (token === "--planner-digest") args.plannerDigest = argv[++index] || "";
    else if (token === "--resolver-digest") args.resolverDigest = argv[++index] || "";
    else if (token === "--closeout-digest") args.closeoutDigest = argv[++index] || "";
    else if (token === "--out") args.out = argv[++index] || "";
    else if (token === "--github-output") args.githubOutput = argv[++index] || "";
    else fail("p4-nightly-repair-argument-invalid", `Unknown repair planner argument: ${token}`);
  }
  return args;
}

function writeGithubOutputs(filePath, plan) {
  if (!filePath) return;
  const executed = plan.lanes.filter((lane) => lane.disposition === "executed-current-run");
  const values = {
    source_sha: plan.sourceIdentity.verificationSha,
    source_tree: plan.sourceIdentity.verificationTreeSha,
    source_attempt: plan.sourceRunAttempt,
    execute_count: executed.length,
    reuse_count: plan.lanes.length - executed.length,
    execute_matrix: JSON.stringify({ include: executed.map((lane) => ({
      role: lane.role,
      runner: lane.role === "fast-contracts-routes" ? "ubuntu-latest" : "windows-latest",
    })) }),
    checker_disposition: plan.lanes[0].disposition,
    full_disposition: plan.lanes[1].disposition,
    fast_disposition: plan.lanes[2].disposition,
  };
  fs.appendFileSync(filePath, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""));
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const sourceRunPayload = readJson(args.sourceRun);
    const sourceJobsPayload = readJson(args.sourceJobs);
    const sourceArtifactsPayload = readJson(args.sourceArtifacts);
    const declaredToolDigests = validateToolDigests({
      planner: args.plannerDigest,
      receiptResolver: args.resolverDigest,
      closeout: args.closeoutDigest,
    });
    const currentToolDigests = captureP4NightlyRepairToolDigests();
    if (stableJson(declaredToolDigests) !== stableJson(currentToolDigests)) {
      fail("p4-nightly-repair-tool-digest-mismatch", "Declared repair tool digests do not match the planning checkout.");
    }
    const plan = buildP4NightlyRepairPlan({
      sourceRunId: args.sourceRunId,
      currentRunId: args.currentRunId,
      rerunScope: args.rerunScope,
      expectedSha: args.expectedSha,
      expectedTree: args.expectedTree,
      currentIdentity: captureVerificationIdentity({ cwd: process.cwd() }),
      sourceRun: sourceRunPayload,
      sourceJobs: sourceJobsPayload.jobs,
      sourceJobTotalCount: sourceJobsPayload.total_count,
      sourceArtifacts: sourceArtifactsPayload.artifacts,
      sourceArtifactTotalCount: sourceArtifactsPayload.total_count,
      toolDigests: currentToolDigests,
    });
    if (!args.out) fail("p4-nightly-repair-output-missing", "Repair planner requires --out.");
    atomicWriteJsonSync(path.resolve(args.out), plan);
    writeGithubOutputs(args.githubOutput, plan);
    console.log(`P4 Nightly repair ready execute=${plan.lanes.filter((lane) => lane.spawnCount === 1).length} digest=${plan.planDigest}`);
  } catch (error) {
    console.error(`P4 Nightly repair failed code=${error?.code || "p4-nightly-repair-error"} message=${error?.message || error}`);
    process.exitCode = 1;
  }
}
