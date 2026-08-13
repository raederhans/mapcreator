import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { normalizeP4StateActionPhase } from "../p4_state_action_phases.mjs";
import {
  atomicWriteJsonSync,
  captureVerificationIdentity,
} from "./resumable_verification.mjs";

export const STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION = 1;
export const STATE_WRITER_POLICY_EVIDENCE_KIND =
  "state-writer-policy-checker-evidence";
export const STATE_WRITER_POLICY_REPORT_SCHEMA_VERSION = 1;
export const STATE_WRITER_POLICY_EVIDENCE_MODE_ENV =
  "STATE_WRITER_POLICY_EVIDENCE_MODE";
export const STATE_WRITER_POLICY_EVIDENCE_PATH_ENV =
  "STATE_WRITER_POLICY_EVIDENCE_PATH";
export const STATE_WRITER_POLICY_EVIDENCE_ID_ENV =
  "STATE_WRITER_POLICY_EVIDENCE_ID";
export const STATE_WRITER_POLICY_EVIDENCE_STRICT_MODE = "strict";
export const STATE_WRITER_POLICY_EVIDENCE_SESSION_KIND =
  "state-writer-policy-evidence-session";

const DEFAULT_POLICY_PATH = "tools/state_writer_policy.json";
const CHECKER_PATH = "tools/check_state_writer_policy.mjs";
const CHECKER_RUNNER_ID = "state-writer-policy-checker-v1";

function normalizeRepoPath(value) {
  return String(value || "").trim().replaceAll("\\", "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function evidenceError(code, message, disposition, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.disposition = disposition;
  Object.assign(error, details);
  return error;
}

function reuseMiss(code, message, details = {}) {
  return evidenceError(code, message, "reuse-miss", details);
}

function blocked(code, message, details = {}) {
  return evidenceError(code, message, "blocked", details);
}

function resolveArtifactPath(cwd, relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  if (!normalized || path.isAbsolute(normalized)) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer evidence artifact paths must be repository-relative.",
    );
  }
  const root = path.resolve(cwd);
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer evidence artifact path escapes the repository root.",
    );
  }
  return { normalized, resolved };
}

function readJsonArtifact(filePath, {
  missingCode,
  corruptCode,
  label,
} = {}) {
  let bytes;
  try {
    bytes = fs.readFileSync(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw reuseMiss(missingCode, `${label} is missing.`, { cause: error });
    }
    throw reuseMiss(corruptCode, `${label} could not be read.`, { cause: error });
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw reuseMiss(corruptCode, `${label} is not parseable JSON.`, {
      cause: error,
    });
  }
  return { bytes, parsed };
}

function normalizeVerificationIdentity(identity = {}) {
  const workspaceStatus = identity?.workspaceStatus;
  return {
    verificationSha: String(identity?.verificationSha || "").trim().toLowerCase(),
    verificationTreeSha: String(identity?.verificationTreeSha || "")
      .trim()
      .toLowerCase(),
    workspaceClean: identity?.workspaceClean,
    trackedClean: identity?.trackedClean,
    includesUntracked: identity?.includesUntracked,
    workspaceStatus: typeof workspaceStatus === "string" ? workspaceStatus : null,
  };
}

function requireCompleteIdentity(identity, label) {
  const normalized = normalizeVerificationIdentity(identity);
  if (
    !/^[0-9a-f]{40}$/.test(normalized.verificationSha)
    || !/^[0-9a-f]{40}$/.test(normalized.verificationTreeSha)
    || typeof normalized.workspaceClean !== "boolean"
    || typeof normalized.trackedClean !== "boolean"
    || normalized.includesUntracked !== true
    || typeof normalized.workspaceStatus !== "string"
  ) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      `${label} lacks an exact Git SHA/tree identity with untracked coverage.`,
    );
  }
  return normalized;
}

function requireCleanIdentity(identity, label) {
  const normalized = requireCompleteIdentity(identity, label);
  if (!normalized.workspaceClean || normalized.workspaceStatus !== "") {
    throw blocked(
      "state-writer-evidence-workspace-dirty",
      `${label} was captured from a dirty workspace.`,
      { workspaceStatus: normalized.workspaceStatus },
    );
  }
  return normalized;
}

function sameGitIdentity(left, right) {
  return left.verificationSha === right.verificationSha
    && left.verificationTreeSha === right.verificationTreeSha;
}

function fenceExactCleanIdentity(startIdentity, endIdentityInput, label) {
  let endIdentity;
  try {
    endIdentity = requireCompleteIdentity(endIdentityInput, `${label} end`);
  } catch (error) {
    error.startIdentity = cloneJson(startIdentity);
    error.endIdentity = cloneJson(normalizeVerificationIdentity(endIdentityInput));
    throw error;
  }
  const stable = sameGitIdentity(startIdentity, endIdentity)
    && startIdentity.workspaceClean === endIdentity.workspaceClean
    && startIdentity.trackedClean === endIdentity.trackedClean
    && startIdentity.includesUntracked === endIdentity.includesUntracked
    && startIdentity.workspaceStatus === endIdentity.workspaceStatus;
  if (
    !endIdentity.workspaceClean
    || endIdentity.workspaceStatus !== ""
    || !stable
  ) {
    throw blocked(
      "state-writer-evidence-identity-drift",
      `${label} Git identity changed while evidence was being read.`,
      {
        startIdentity: cloneJson(startIdentity),
        endIdentity: cloneJson(endIdentity),
      },
    );
  }
  return endIdentity;
}

export function createStateWriterPolicyEvidenceSession() {
  return {
    kind: STATE_WRITER_POLICY_EVIDENCE_SESSION_KIND,
    liveFallbackAttempts: 0,
  };
}

function consumeLiveFallbackBudget(session, fallbackReason) {
  if (
    session?.kind !== STATE_WRITER_POLICY_EVIDENCE_SESSION_KIND
    || !Number.isInteger(session?.liveFallbackAttempts)
    || session.liveFallbackAttempts < 0
  ) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer live fallback session is missing or invalid.",
    );
  }
  if (session.liveFallbackAttempts >= 1) {
    throw blocked(
      "state-writer-evidence-live-fallback-budget-exhausted",
      "State-writer live fallback budget is exhausted for this runner invocation.",
      {
        fallbackReason,
        liveFallbackAttempts: session.liveFallbackAttempts,
      },
    );
  }
  session.liveFallbackAttempts += 1;
  return session.liveFallbackAttempts;
}

function defaultBlobShaReader(relativePath, {
  cwd = process.cwd(),
  runner = spawnSync,
} = {}) {
  const result = runner("git", ["hash-object", relativePath], {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  if (result?.status !== 0) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      `Unable to resolve Git blob identity for ${relativePath}.`,
      { stderr: String(result?.stderr || "").trim() },
    );
  }
  const blobSha = String(result?.stdout || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(blobSha)) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      `Git blob identity for ${relativePath} is incomplete.`,
    );
  }
  return blobSha;
}

function defaultPolicyReader({
  cwd = process.cwd(),
  policyPath = DEFAULT_POLICY_PATH,
} = {}) {
  return JSON.parse(
    fs.readFileSync(path.resolve(cwd, policyPath), "utf8"),
  );
}

function configTreeIdentity(configBlobShas = []) {
  return sha256(
    [...configBlobShas]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(({ path: configPath, blobSha }) => `${configPath}\0${blobSha}`)
      .join("\n"),
  );
}

function checkpointIdentity(policy, phase) {
  const checkpoints = Array.isArray(policy?.progress?.checkpoints)
    ? policy.progress.checkpoints
    : [];
  const currentCheckpoint = checkpoints.find(
    (checkpoint) => String(checkpoint?.phase || "") === phase,
  );
  if (!currentCheckpoint) {
    throw reuseMiss(
      "state-writer-evidence-checkpoint-drift",
      `State-writer policy has no exact ${phase} progress checkpoint.`,
    );
  }
  return {
    currentCheckpoint: cloneJson(currentCheckpoint),
    currentCheckpointDigest: sha256(stableJson(currentCheckpoint)),
    checkpointHistoryDigest: sha256(stableJson(checkpoints)),
  };
}

function policyIdentityFromReport({
  report,
  policy,
  phase,
  blobShaReader,
}) {
  const reportIdentity = report?.verificationIdentity;
  const policyPath = normalizeRepoPath(
    reportIdentity?.policyPath || report?.policyPath,
  );
  const sourceBaseSha = String(
    reportIdentity?.sourceBaseSha || report?.sourceBaseSha || "",
  ).trim().toLowerCase();
  const configBlobShas = Array.isArray(reportIdentity?.configBlobShas)
    ? reportIdentity.configBlobShas.map(({ path: configPath, blobSha }) => ({
      path: normalizeRepoPath(configPath),
      blobSha: String(blobSha || "").trim().toLowerCase(),
    }))
    : [];
  if (
    policyPath !== DEFAULT_POLICY_PATH
    || !/^[0-9a-f]{40}$/.test(sourceBaseSha)
    || !/^[0-9a-f]{40}$/.test(String(reportIdentity?.policyBlobSha || ""))
    || !/^[0-9a-f]{64}$/.test(String(reportIdentity?.configTreeIdentity || ""))
    || configBlobShas.length === 0
    || configBlobShas.some(({ path: configPath, blobSha }) => (
      !configPath || !/^[0-9a-f]{40}$/.test(blobSha)
    ))
  ) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer policy report lacks complete policy/config provenance.",
    );
  }
  if (String(policy?.progress?.latestPhase || "") !== phase) {
    throw reuseMiss(
      "state-writer-evidence-policy-identity-drift",
      "State-writer policy latest phase drifted from checker evidence.",
    );
  }
  const currentPolicyBlobSha = String(blobShaReader(policyPath) || "")
    .trim()
    .toLowerCase();
  if (currentPolicyBlobSha !== reportIdentity.policyBlobSha) {
    throw reuseMiss(
      "state-writer-evidence-policy-identity-drift",
      "State-writer policy blob drifted from checker evidence.",
    );
  }
  const currentConfigBlobShas = configBlobShas.map(({ path: configPath }) => ({
    path: configPath,
    blobSha: String(blobShaReader(configPath) || "").trim().toLowerCase(),
  }));
  if (
    currentConfigBlobShas.some(({ blobSha }) => !/^[0-9a-f]{40}$/.test(blobSha))
    || stableJson(currentConfigBlobShas) !== stableJson(configBlobShas)
    || configTreeIdentity(currentConfigBlobShas)
      !== reportIdentity.configTreeIdentity
  ) {
    throw reuseMiss(
      "state-writer-evidence-policy-identity-drift",
      "State-writer checker configuration drifted from report provenance.",
    );
  }
  return {
    path: policyPath,
    schemaVersion: Number(policy?.schemaVersion),
    sourceBaseSha,
    latestPhase: phase,
    policyBlobSha: currentPolicyBlobSha,
    configBlobShas: currentConfigBlobShas,
    configTreeIdentity: reportIdentity.configTreeIdentity,
    ...checkpointIdentity(policy, phase),
  };
}

function validateReport({
  report,
  currentIdentity,
  policy,
  phase,
  blobShaReader,
}) {
  if (
    report?.schemaVersion !== STATE_WRITER_POLICY_REPORT_SCHEMA_VERSION
    || report?.phase !== phase
    || report?.verdict !== "pass"
    || !Array.isArray(report?.violations)
    || report.violations.length !== 0
  ) {
    throw reuseMiss(
      "state-writer-evidence-report-schema-drift",
      "State-writer policy report schema, phase, or verdict is incompatible.",
    );
  }
  const reportIdentity = requireCleanIdentity(
    report.verificationIdentity,
    "State-writer policy report",
  );
  if (!sameGitIdentity(reportIdentity, currentIdentity)) {
    throw reuseMiss(
      "state-writer-evidence-git-identity-drift",
      "State-writer policy report was produced for another Git SHA/tree.",
    );
  }
  return policyIdentityFromReport({
    report,
    policy,
    phase,
    blobShaReader,
  });
}

function evidenceBody(evidence) {
  const { evidenceId: _evidenceId, ...body } = evidence || {};
  return body;
}

export function defaultStateWriterPolicyReportPath(phase) {
  return path.join(
    ".runtime",
    "reports",
    "generated",
    "p4-state-actions",
    normalizeP4StateActionPhase(phase),
    "policy-report.json",
  );
}

export function defaultStateWriterPolicyEvidencePath(phase) {
  return path.join(
    ".runtime",
    "reports",
    "generated",
    "p4-state-actions",
    normalizeP4StateActionPhase(phase),
    "state-writer-policy-evidence.json",
  );
}

export function readCurrentStateWriterPolicyPhase({
  cwd = process.cwd(),
  policyReader = () => defaultPolicyReader({ cwd }),
} = {}) {
  const policy = policyReader();
  return normalizeP4StateActionPhase(policy?.progress?.latestPhase);
}

export function buildStateWriterCheckerPlan({
  phase,
  reportPath = defaultStateWriterPolicyReportPath(phase),
  nodeExecutable = process.execPath,
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  const normalizedReportPath = normalizeRepoPath(reportPath);
  const resolvedCommand = {
    executable: String(nodeExecutable || "").trim(),
    args: [
      CHECKER_PATH,
      "--phase",
      normalizedPhase,
      "--require-clean",
      "--json-out",
      normalizedReportPath,
    ],
  };
  if (!resolvedCommand.executable) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer checker executable is missing.",
    );
  }
  const canonical = {
    runnerId: CHECKER_RUNNER_ID,
    phase: normalizedPhase,
    reportPath: normalizedReportPath,
    commandRef: `node ${resolvedCommand.args.join(" ")}`,
    resolvedCommand,
  };
  return Object.freeze({
    ...canonical,
    digest: sha256(stableJson(canonical)),
  });
}

export function createStateWriterPolicyEvidence({
  cwd = process.cwd(),
  phase,
  reportPath = defaultStateWriterPolicyReportPath(phase),
  evidencePath = defaultStateWriterPolicyEvidencePath(phase),
  checkerPlan = buildStateWriterCheckerPlan({ phase, reportPath }),
  producer = {},
  verificationIdentityReader = () => captureVerificationIdentity({ cwd }),
  policyReader = () => defaultPolicyReader({ cwd }),
  blobShaReader = (relativePath) => defaultBlobShaReader(relativePath, { cwd }),
  now = () => new Date(),
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  const currentIdentity = requireCleanIdentity(
    verificationIdentityReader(),
    "Current workspace",
  );
  const reportArtifactPath = resolveArtifactPath(cwd, reportPath);
  const evidenceArtifactPath = resolveArtifactPath(cwd, evidencePath);
  const reportArtifact = readJsonArtifact(reportArtifactPath.resolved, {
    missingCode: "state-writer-evidence-report-artifact-missing",
    corruptCode: "state-writer-evidence-report-artifact-corrupt",
    label: "State-writer policy report artifact",
  });
  const policy = policyReader();
  const policyIdentity = validateReport({
    report: reportArtifact.parsed,
    currentIdentity,
    policy,
    phase: normalizedPhase,
    blobShaReader,
  });
  const entrypoint = normalizeRepoPath(producer?.entrypoint);
  const commandRef = String(producer?.commandRef || "").trim();
  if (!entrypoint || !commandRef) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer evidence producer provenance is incomplete.",
    );
  }
  if (
    checkerPlan?.phase !== normalizedPhase
    || checkerPlan?.reportPath !== reportArtifactPath.normalized
    || !/^[0-9a-f]{64}$/.test(String(checkerPlan?.digest || ""))
  ) {
    throw reuseMiss(
      "state-writer-evidence-plan-drift",
      "State-writer checker plan is incompatible with the evidence request.",
    );
  }
  const body = {
    schemaVersion: STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION,
    kind: STATE_WRITER_POLICY_EVIDENCE_KIND,
    phase: normalizedPhase,
    verificationIdentity: currentIdentity,
    checkerPlan: cloneJson(checkerPlan),
    policyIdentity,
    reportArtifact: {
      path: reportArtifactPath.normalized,
      sha256: sha256(reportArtifact.bytes),
      size: reportArtifact.bytes.length,
      schemaVersion: reportArtifact.parsed.schemaVersion,
      verdict: reportArtifact.parsed.verdict,
    },
    producer: {
      entrypoint,
      commandRef,
      planDigest: checkerPlan.digest,
      producedAt: now().toISOString(),
      disposition: "produced-live",
    },
    applicability: {
      mode: "exact-clean-tree",
      sourceVerificationSha: currentIdentity.verificationSha,
      sourceVerificationTreeSha: currentIdentity.verificationTreeSha,
    },
  };
  const evidence = {
    ...body,
    evidenceId: sha256(stableJson(body)),
  };
  fenceExactCleanIdentity(
    currentIdentity,
    verificationIdentityReader(),
    "State-writer evidence producer",
  );
  atomicWriteJsonSync(evidenceArtifactPath.resolved, evidence);
  return evidence;
}

export function validateStateWriterPolicyEvidence({
  cwd = process.cwd(),
  phase,
  evidencePath = defaultStateWriterPolicyEvidencePath(phase),
  checkerPlan = buildStateWriterCheckerPlan({ phase }),
  routeApplicability = { unmatchedChangedFiles: [] },
  verificationIdentityReader = () => captureVerificationIdentity({ cwd }),
  policyReader = () => defaultPolicyReader({ cwd }),
  blobShaReader = (relativePath) => defaultBlobShaReader(relativePath, { cwd }),
  expectedEvidenceId = null,
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  const currentIdentity = requireCleanIdentity(
    verificationIdentityReader(),
    "Current workspace",
  );
  const unmatchedChangedFiles = Array.isArray(
    routeApplicability?.unmatchedChangedFiles,
  )
    ? routeApplicability.unmatchedChangedFiles.map(normalizeRepoPath).filter(Boolean)
    : [];
  if (unmatchedChangedFiles.length) {
    throw blocked(
      "state-writer-evidence-unmatched-route",
      "State-writer evidence applicability contains unmatched changed files.",
      { unmatchedChangedFiles },
    );
  }
  const evidenceArtifactPath = resolveArtifactPath(cwd, evidencePath);
  const artifact = readJsonArtifact(evidenceArtifactPath.resolved, {
    missingCode: "state-writer-evidence-missing",
    corruptCode: "state-writer-evidence-corrupt",
    label: "State-writer policy evidence",
  });
  const evidence = artifact.parsed;
  if (
    evidence?.schemaVersion !== STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION
    || evidence?.kind !== STATE_WRITER_POLICY_EVIDENCE_KIND
  ) {
    throw reuseMiss(
      "state-writer-evidence-schema-drift",
      "State-writer policy evidence schema is incompatible.",
    );
  }
  const sourceIdentity = requireCompleteIdentity(
    evidence.verificationIdentity,
    "State-writer policy evidence",
  );
  if (!sourceIdentity.workspaceClean || sourceIdentity.workspaceStatus !== "") {
    throw blocked(
      "state-writer-evidence-workspace-dirty",
      "State-writer policy evidence was produced from a dirty workspace.",
    );
  }
  if (sha256(stableJson(evidenceBody(evidence))) !== evidence.evidenceId) {
    throw reuseMiss(
      "state-writer-evidence-body-drift",
      "State-writer policy evidence body no longer matches its identity.",
    );
  }
  if (
    expectedEvidenceId !== null
    && evidence.evidenceId !== String(expectedEvidenceId).trim().toLowerCase()
  ) {
    throw reuseMiss(
      "state-writer-evidence-id-drift",
      "State-writer policy evidence identity differs from the expected consumer identity.",
    );
  }
  if (evidence.phase !== normalizedPhase) {
    throw reuseMiss(
      "state-writer-evidence-phase-drift",
      "State-writer policy evidence phase drifted.",
    );
  }
  if (
    evidence?.checkerPlan?.digest !== checkerPlan?.digest
    || stableJson(evidence.checkerPlan) !== stableJson(checkerPlan)
  ) {
    throw reuseMiss(
      "state-writer-evidence-plan-drift",
      "State-writer checker command plan drifted.",
    );
  }
  if (!sameGitIdentity(sourceIdentity, currentIdentity)) {
    throw reuseMiss(
      "state-writer-evidence-git-identity-drift",
      "State-writer policy evidence belongs to another Git SHA/tree.",
    );
  }
  if (
    !evidence?.producer?.entrypoint
    || !evidence?.producer?.commandRef
    || evidence?.producer?.planDigest !== checkerPlan.digest
    || evidence?.producer?.disposition !== "produced-live"
  ) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer evidence producer provenance is incomplete.",
    );
  }
  const expectedReportPath = normalizeRepoPath(checkerPlan.reportPath);
  if (evidence?.reportArtifact?.path !== expectedReportPath) {
    throw reuseMiss(
      "state-writer-evidence-report-artifact-drift",
      "State-writer report artifact path drifted.",
    );
  }
  const reportArtifactPath = resolveArtifactPath(cwd, expectedReportPath);
  const reportArtifact = readJsonArtifact(reportArtifactPath.resolved, {
    missingCode: "state-writer-evidence-report-artifact-missing",
    corruptCode: "state-writer-evidence-report-artifact-corrupt",
    label: "State-writer policy report artifact",
  });
  if (
    reportArtifact.bytes.length !== evidence.reportArtifact.size
    || sha256(reportArtifact.bytes) !== evidence.reportArtifact.sha256
  ) {
    throw reuseMiss(
      "state-writer-evidence-report-artifact-drift",
      "State-writer report artifact bytes drifted.",
    );
  }
  const policy = policyReader();
  const currentPolicyIdentity = validateReport({
    report: reportArtifact.parsed,
    currentIdentity,
    policy,
    phase: normalizedPhase,
    blobShaReader,
  });
  if (
    evidence.reportArtifact.schemaVersion
      !== reportArtifact.parsed.schemaVersion
    || evidence.reportArtifact.verdict !== reportArtifact.parsed.verdict
    || stableJson(evidence.policyIdentity) !== stableJson(currentPolicyIdentity)
  ) {
    const checkpointDrift = evidence?.policyIdentity?.currentCheckpointDigest
      !== currentPolicyIdentity.currentCheckpointDigest
      || evidence?.policyIdentity?.checkpointHistoryDigest
        !== currentPolicyIdentity.checkpointHistoryDigest;
    throw reuseMiss(
      checkpointDrift
        ? "state-writer-evidence-checkpoint-drift"
        : "state-writer-evidence-policy-identity-drift",
      "State-writer policy/checkpoint identity drifted from evidence.",
    );
  }
  fenceExactCleanIdentity(
    currentIdentity,
    verificationIdentityReader(),
    "State-writer evidence validator",
  );
  return {
    status: "reusable-exact",
    evidence,
    evidenceId: evidence.evidenceId,
    evidencePath: evidenceArtifactPath.normalized,
    sourceVerificationSha: sourceIdentity.verificationSha,
    sourceVerificationTreeSha: sourceIdentity.verificationTreeSha,
    producer: cloneJson(evidence.producer),
    disposition: "reused-exact",
  };
}

export function ensureStateWriterPolicyEvidence({
  cwd = process.cwd(),
  phase = readCurrentStateWriterPolicyPhase({ cwd }),
  reportPath = defaultStateWriterPolicyReportPath(phase),
  evidencePath = defaultStateWriterPolicyEvidencePath(phase),
  checkerPlan = buildStateWriterCheckerPlan({ phase, reportPath }),
  producer = {
    entrypoint: "tools/verification/state_writer_policy_evidence.mjs",
    commandRef: "state-writer-policy-live-fallback",
  },
  routeApplicability = { unmatchedChangedFiles: [] },
  runner = spawnSync,
  verificationIdentityReader = () => captureVerificationIdentity({ cwd }),
  policyReader = () => defaultPolicyReader({ cwd }),
  blobShaReader = (relativePath) => defaultBlobShaReader(relativePath, { cwd }),
  now = () => new Date(),
  liveFallbackSession = null,
} = {}) {
  const shared = {
    cwd,
    phase,
    evidencePath,
    checkerPlan,
    routeApplicability,
    verificationIdentityReader,
    policyReader,
    blobShaReader,
  };
  try {
    return validateStateWriterPolicyEvidence(shared);
  } catch (error) {
    if (error?.disposition !== "reuse-miss") throw error;
    const fallbackReason = error.code || "state-writer-evidence-reuse-miss";
    consumeLiveFallbackBudget(liveFallbackSession, fallbackReason);
    const result = runner(
      checkerPlan.resolvedCommand.executable,
      checkerPlan.resolvedCommand.args,
      {
        cwd,
        encoding: "utf8",
        shell: false,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    if (result?.error || result?.signal || result?.status !== 0) {
      throw blocked(
        "state-writer-evidence-live-producer-failed",
        "State-writer live checker fallback failed.",
        {
          fallbackReason,
          status: result?.status,
          signal: result?.signal,
          stdout: String(result?.stdout || "").trim(),
          stderr: String(result?.stderr || "").trim(),
          cause: result?.error,
        },
      );
    }
    let evidence;
    let validated;
    try {
      evidence = createStateWriterPolicyEvidence({
        cwd,
        phase,
        reportPath,
        evidencePath,
        checkerPlan,
        producer,
        verificationIdentityReader,
        policyReader,
        blobShaReader,
        now,
      });
      validated = validateStateWriterPolicyEvidence(shared);
    } catch (artifactError) {
      throw blocked(
        "state-writer-evidence-live-producer-invalid-artifact",
        "State-writer live checker fallback did not produce reusable evidence.",
        {
          fallbackReason,
          validationCode: artifactError?.code,
          validationDisposition: artifactError?.disposition,
          cause: artifactError,
        },
      );
    }
    return {
      ...validated,
      status: "produced-live",
      evidence,
      evidenceId: evidence.evidenceId,
      fallbackReason,
      disposition: "produced-live",
    };
  }
}

export function isStateWriterPythonBoundaryCommandRef(commandRef) {
  return /^(?:npm run )?test:python:p4:.*boundary$/u.test(
    String(commandRef || "").trim(),
  );
}

export function buildStrictStateWriterEvidenceEnvironment(
  evidenceResult,
  {
    cwd = process.cwd(),
    baseEnv = process.env,
  } = {},
) {
  const evidencePath = normalizeRepoPath(evidenceResult?.evidencePath);
  const evidenceId = String(evidenceResult?.evidenceId || "").trim();
  if (!evidencePath || !/^[0-9a-f]{64}$/.test(evidenceId)) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "Strict state-writer consumer environment lacks evidence identity.",
    );
  }
  return {
    ...baseEnv,
    [STATE_WRITER_POLICY_EVIDENCE_MODE_ENV]:
      STATE_WRITER_POLICY_EVIDENCE_STRICT_MODE,
    [STATE_WRITER_POLICY_EVIDENCE_PATH_ENV]: evidencePath,
    [STATE_WRITER_POLICY_EVIDENCE_ID_ENV]: evidenceId,
  };
}

export function buildStateWriterPolicyEvidenceTrace(evidenceResult) {
  const evidence = evidenceResult?.evidence;
  const trace = {
    kind: STATE_WRITER_POLICY_EVIDENCE_KIND,
    status: String(evidenceResult?.status || ""),
    disposition: String(evidenceResult?.disposition || ""),
    evidenceId: String(evidenceResult?.evidenceId || ""),
    evidencePath: normalizeRepoPath(evidenceResult?.evidencePath),
    phase: String(evidence?.phase || ""),
    sourceVerificationSha: String(
      evidenceResult?.sourceVerificationSha || "",
    ),
    sourceVerificationTreeSha: String(
      evidenceResult?.sourceVerificationTreeSha || "",
    ),
    producer: cloneJson(evidenceResult?.producer || {}),
    fallbackReason: evidenceResult?.fallbackReason || null,
  };
  if (
    !trace.status
    || !trace.disposition
    || !/^[0-9a-f]{64}$/.test(trace.evidenceId)
    || !trace.evidencePath
    || !trace.phase
    || !/^[0-9a-f]{40}$/.test(trace.sourceVerificationSha)
    || !/^[0-9a-f]{40}$/.test(trace.sourceVerificationTreeSha)
    || !trace.producer?.entrypoint
    || !trace.producer?.commandRef
  ) {
    throw blocked(
      "state-writer-evidence-source-identity-incomplete",
      "State-writer evidence trace is incomplete.",
    );
  }
  return trace;
}

function parseCliArgs(argv) {
  const [command, ...tokens] = argv;
  const args = {
    command,
    evidencePath: "",
    expectedEvidenceId: "",
    phase: "",
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--evidence") args.evidencePath = tokens[++index] || "";
    else if (token === "--expected-id") {
      args.expectedEvidenceId = tokens[++index] || "";
    }
    else if (token === "--phase") args.phase = tokens[++index] || "";
    else throw new Error(`Unknown state-writer evidence argument: ${token}`);
  }
  return args;
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  if (
    args.command !== "validate"
    || !args.evidencePath
    || !/^[0-9a-f]{64}$/u.test(args.expectedEvidenceId)
    || !args.phase
  ) {
    throw new Error(
      "Usage: state_writer_policy_evidence.mjs validate --evidence <path> --expected-id <sha256> --phase <phase>",
    );
  }
  const reportPath = defaultStateWriterPolicyReportPath(args.phase);
  const result = validateStateWriterPolicyEvidence({
    phase: args.phase,
    evidencePath: args.evidencePath,
    expectedEvidenceId: args.expectedEvidenceId,
    checkerPlan: buildStateWriterCheckerPlan({
      phase: args.phase,
      reportPath,
    }),
  });
  console.log([
    "State writer policy evidence reusable-exact",
    `id=${result.evidenceId}`,
    `path=${result.evidencePath}`,
    `source=${result.sourceVerificationSha}`,
  ].join(" "));
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    runCli();
  } catch (error) {
    console.error([
      "State writer policy evidence validation failed",
      `code=${error?.code || "state-writer-evidence-cli-error"}`,
      `disposition=${error?.disposition || "blocked"}`,
      `message=${error?.message || String(error)}`,
    ].join(" "));
    process.exitCode = 2;
  }
}
