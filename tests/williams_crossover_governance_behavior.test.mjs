import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WILLIAMS_ADJACENT_PAIRS,
  WILLIAMS_BLOCK_SEQUENCE,
  WILLIAMS_CROSSOVER_POLICY_ID,
  WILLIAMS_DRIFT_PAIRS,
  WILLIAMS_EXIT_CODES,
  WILLIAMS_SCENARIOS,
  WILLIAMS_TELEMETRY_CADENCE,
  analyzeWilliamsCrossoverEvidence,
  buildWilliamsBlockCommand,
  buildWilliamsPreregistration,
  expectedCanonicalBlockCommand,
} from "../tools/perf/williams_crossover_policy.mjs";
import {
  analyzeWilliamsCrossoverRawRootWithTestAdapters,
  buildWilliamsBlockArtifactIdentity,
  buildCurrentHarnessArtifacts,
  buildWilliamsExecutionPlan,
  buildWilliamsMarkdown,
  buildWilliamsRawManifest,
  buildWilliamsTrustedRevisionIdentity,
  deriveWilliamsQuietWindow,
  getWilliamsErrorExitCode,
  parseWilliamsArgs,
  requireWilliamsJobRunnerReady,
  resolveServerMetadataProbeTarget,
  runWilliamsBlockWithTestAdapters,
  runWilliamsPreBlockAdmission,
  runWilliamsCli,
  validateMeasurementSnapshot,
  validateWilliamsOutputPolicy,
  WilliamsInvalidExperimentError,
} from "../tools/perf/run_williams_crossover.mjs";
import {
  buildOrderedContainmentSourceSet,
} from "../tools/process_containment/ordered_source_set_identity.mjs";
import {
  STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID,
  WILLIAMS_CROSSOVER_RENDER_SAMPLE_RUN_PROFILE_ID,
} from "../tools/perf/render_sample_role_policy.mjs";
import {
  STANDARD_PERF_ADMISSION_EXIT_CODES,
  STANDARD_PERF_ADMISSION_POLICY,
  evaluateStandardPerfAdmission,
} from "../tools/perf/standard_perf_admission.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const CONTROL_HEAD = "a".repeat(40);
const CANDIDATE_HEAD = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
  windowsHide: true,
}).stdout.trim();
const CONTROL_WORKTREE = "C:\\perf\\control";
const CANDIDATE_WORKTREE = REPO_ROOT;
const EVIDENCE_RAW_ROOT = "C:\\perf\\evidence";
const RUNTIME_TMP_ROOT = path.join(REPO_ROOT, ".runtime", "tmp");
const EXPECTED_POWER_SCHEME_GUID = "00000000-0000-0000-0000-000000000000";
const JOB_RUNNER_EVIDENCE_PATH = "tooling/windows-job-runner.exe";
const JOB_RUNNER_FIXTURE_BYTES = Buffer.from("MZ-SCENARIO-FORGE-WILLIAMS-JOB-RUNNER-FIXTURE", "utf8");
const HASH = "c".repeat(64);
const URL_QUERY = Object.freeze({
  render_profile: "balanced",
  startup_interaction: "full",
  startup_worker: 1,
  startup_cache: 0,
  perf: 1,
});

function trustedRevisionIdentity(overrides = {}) {
  return {
    expectedControlWorktree: CONTROL_WORKTREE,
    expectedControlHead: CONTROL_HEAD,
    expectedCandidateWorktree: CANDIDATE_WORKTREE,
    expectedCandidateHead: CANDIDATE_HEAD,
    trustedAnalyzerRoot: REPO_ROOT,
    ...overrides,
  };
}

function normalizedGitBlob(buffer) {
  const normalized = Buffer.from(Buffer.from(buffer).toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
  const header = Buffer.from(`blob ${normalized.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(normalized).digest("hex");
}

function normalizedSha256(buffer) {
  const normalized = Buffer.from(Buffer.from(buffer).toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function expectedPackageLockDescriptor() {
  const buffer = await fs.readFile(path.join(REPO_ROOT, "package-lock.json"));
  return {
    path: "package-lock.json",
    gitBlob: normalizedGitBlob(buffer),
    lfNormalizedSha256: normalizedSha256(buffer),
  };
}

function trustedAnalyzerAuthorityAdapter({
  root = REPO_ROOT,
  head = CANDIDATE_HEAD,
  snapshots = null,
  gitTopLevel = root,
  commitMutations = {},
  commitBlobOverrides = {},
  commitReads = null,
  realpath = (value) => path.resolve(value),
} = {}) {
  const cleanSnapshot = {
    actualHead: head,
    detached: true,
    branch: null,
    gitStatus: "",
  };
  const snapshotSequence = snapshots || [cleanSnapshot, cleanSnapshot];
  let snapshotIndex = 0;
  return {
    realpath,
    gitTopLevel: async () => gitTopLevel,
    gitSnapshot: async () => structuredClone(
      snapshotSequence[Math.min(snapshotIndex++, snapshotSequence.length - 1)],
    ),
    readWorkspaceFile: async ({ root, relativePath }) => fs.readFile(path.join(root, relativePath)),
    readCommitArtifact: async ({ root: requestedRoot, head: requestedHead, relativePath }) => {
      commitReads?.push({ root: requestedRoot, head: requestedHead, relativePath });
      let buffer = await fs.readFile(path.join(root, relativePath));
      const mutate = commitMutations[relativePath];
      if (mutate) buffer = Buffer.from(await mutate(Buffer.from(buffer)));
      buffer = Buffer.from(buffer.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
      const override = commitBlobOverrides[relativePath];
      const gitBlob = typeof override === "function" ? override(buffer) : override;
      return { buffer, gitBlob: gitBlob || normalizedGitBlob(buffer) };
    },
  };
}

async function analyzeTrustedRawRoot(root, overrides = {}, analyzeOptions = {}) {
  return analyzeWilliamsCrossoverRawRootWithTestAdapters(root, {
    trustedRevisionIdentity: trustedRevisionIdentity(overrides),
    analyzerAuthorityAdapter: analyzeOptions.analyzerAuthorityAdapter || trustedAnalyzerAuthorityAdapter(),
    rawSnapshotAdapter: analyzeOptions.rawSnapshotAdapter || null,
  });
}

function literalWilliamsCommand({
  rawRoot,
  blockId,
  measuredWorktree,
  scenarioOrder,
}) {
  const directory = path.join(rawRoot, "blocks", blockId);
  return {
    bin: process.execPath,
    args: [
      path.join(CANDIDATE_WORKTREE, "tools", "perf", "run_baseline.mjs"),
      "--measured-repo-root", measuredWorktree,
      "--mode", "baseline",
      "--scenarios", scenarioOrder.join(","),
      "--runs", "2",
      "--warmups", "1",
      "--render-sample-run-profile", "p2-williams-crossover-v7",
      "--baseline-json", path.join(directory, "baseline.json"),
      "--baseline-md", path.join(directory, "baseline.md"),
      "--raw-dir", path.join(directory, "raw"),
    ],
  };
}

async function makeRuntimeTemp(prefix) {
  await fs.mkdir(RUNTIME_TMP_ROOT, { recursive: true });
  return fs.mkdtemp(path.join(RUNTIME_TMP_ROOT, prefix));
}

function canonicalSnapshot(scenarioId, durationMs) {
  return {
    renderPerfMetrics: {
      scenarioChunkPromotionVisualStage: { recordedAt: 200 },
    },
    renderSamples: {
      count: 2,
      medianMs: durationMs,
      samples: [
        {
          sequence: 1,
          durationMs: Math.max(1, durationMs - 20),
          recordedAt: 100,
          activeScenarioId: "blank_base",
          phase: "idle",
          politicalBgProgressive: false,
          contextScenarioMs: 0,
        },
        {
          sequence: 2,
          durationMs,
          recordedAt: 300,
          activeScenarioId: scenarioId,
          phase: "idle",
          politicalBgProgressive: true,
          contextScenarioMs: 10,
        },
      ],
    },
  };
}

function telemetryWindow(phase, blockOrdinal, cwd, gitHead) {
  const baseMs = Date.UTC(2026, 6, 11, 0, 0, (blockOrdinal - 1) * 20 + (phase === "post" ? 10 : 0));
  const primingCompletedAtMs = baseMs - 1000;
  const windowStartedAtMs = primingCompletedAtMs - 3717;
  const windowCompletedAtMs = baseMs + 4700;
  return {
    schemaVersion: 4,
    phase,
    startedAt: new Date(windowStartedAtMs).toISOString(),
    completedAt: new Date(windowCompletedAtMs).toISOString(),
    priming: {
      captureCount: 1,
      status: "complete",
      admissionRole: "excluded-warmup",
      startedAt: new Date(primingCompletedAtMs - 3617).toISOString(),
      completedAt: new Date(primingCompletedAtMs).toISOString(),
      captureDurationMs: 3617,
    },
    sampling: {
      scheduler: "monotonic-fixed-rate",
      timestampSemantics: "actual-capture-start",
      sampleIntervalMs: 1000,
      sampleCount: 5,
    },
    capability: { status: "available", missing: [] },
    samples: Array.from({ length: 5 }, (_, index) => {
      const captureStartedAtMs = baseMs + index * 1000;
      return {
        at: new Date(captureStartedAtMs).toISOString(),
        completedAt: new Date(captureStartedAtMs + 600).toISOString(),
        captureDurationMs: 600,
        scheduleLagMs: 0,
        cpuUtilizationPercent: 10 + index,
        processorPerformancePercent: 100,
        percentOfMaximumFrequency: 95,
        processorFrequencyMHz: 4200,
        performanceAdjustedFrequencyMHz: 4200,
        memoryCommittedPercent: 50,
        memoryAvailableMBytes: 16000,
      };
    }),
    environment: {
      power: {
        activeSchemeGuid: EXPECTED_POWER_SCHEME_GUID,
        activeSchemeName: "Balanced",
        acLineStatus: 1,
        batteryFlag: 128,
      },
      ports: { "8000": [], "8892": [] },
      processes: [],
      server: [],
      browser: [],
      cwd,
      probe: [
        { url: "http://127.0.0.1:8000/app/", responded: false, ok: false, status: null },
        { url: "http://127.0.0.1:8892/app/", responded: false, ok: false, status: null },
      ],
      gitStatus: "",
      gitHead,
      detached: true,
    },
  };
}

function standardPerfAdmissionEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    startedAt: "2026-07-11T00:00:00.000Z",
    completedAt: "2026-07-11T00:00:07.000Z",
    platform: "win32",
    cpuSamples: [10, 11, 12, 13, 14, 15, 16],
    topProcesses: [{ pid: 321, name: "System", singleCorePercent: 4 }],
    memoryAvailableMiB: 16_000,
    power: {
      status: "available",
      activeSchemeGuid: EXPECTED_POWER_SCHEME_GUID,
      activeSchemeName: "Balanced",
      acLineStatus: 1,
    },
    git: {
      status: "available",
      head: CONTROL_HEAD,
      entries: [],
      detail: "",
    },
    degradedCapabilities: [],
    ...overrides,
  };
}

function standardPerfAdmissionDecision(gitHead = CONTROL_HEAD, overrides = {}) {
  return evaluateStandardPerfAdmission(
    standardPerfAdmissionEvidence({
      git: {
        status: "available",
        head: gitHead,
        entries: [],
        detail: "",
      },
      ...overrides,
    }),
    STANDARD_PERF_ADMISSION_POLICY,
  );
}

function deriveTestQuietWindow(telemetry, decision = standardPerfAdmissionDecision(
  telemetry?.environment?.gitHead || CONTROL_HEAD,
)) {
  return deriveWilliamsQuietWindow(telemetry, decision, {
    expectedGitHead: telemetry?.environment?.gitHead || "",
  });
}

function artifactDescriptor(relativePath = "artifact") {
  return { path: relativePath, gitBlob: "d".repeat(40), lfNormalizedSha256: HASH };
}

function jobRunnerSourceSet(overrides = {}) {
  const sources = [
    artifactDescriptor("tools/perf/williams_crossover_windows_job_runner.cs"),
    artifactDescriptor("tools/process_containment/windows_job_runner_core.cs"),
  ].map((descriptor, index) => ({ ...descriptor, ...(overrides[index] || {}) }));
  return structuredClone(buildOrderedContainmentSourceSet(sources));
}

function refreshSourceSetDigest(sourceSet) {
  const refreshed = structuredClone(buildOrderedContainmentSourceSet(sourceSet.sources));
  sourceSet.schemaVersion = refreshed.schemaVersion;
  sourceSet.kind = refreshed.kind;
  sourceSet.sha256 = refreshed.sha256;
  sourceSet.sources = refreshed.sources;
  return sourceSet;
}

function jobRunnerBinaryDescriptor() {
  return {
    path: JOB_RUNNER_EVIDENCE_PATH,
    sha256: crypto.createHash("sha256").update(JOB_RUNNER_FIXTURE_BYTES).digest("hex"),
    bytes: JOB_RUNNER_FIXTURE_BYTES.length,
  };
}

function jobObjectEvidence(rootPid = 4242, {
  command = { bin: process.execPath, args: ["--version"] },
  cwd = "C:\\perf\\runner",
} = {}) {
  return {
    schemaVersion: 1,
    protocolId: "SF_WILLIAMS_JOB_V1",
    provider: "windows-job-object",
    status: "complete",
    rootPid,
    rootExitCode: 0,
    timedOut: false,
    createSuspended: true,
    createNoWindow: true,
    assignedBeforeResume: true,
    rootInJobBeforeResume: true,
    killOnJobClose: true,
    breakawayAllowed: false,
    suspendedRootTerminatedOnAssignFailure: false,
    jobCloseSucceeded: true,
    terminateJobSucceeded: false,
    rootTerminationConfirmed: true,
    jobProcessIdsAtRootExit: [rootPid],
    remainingPids: [],
    unverifiedPids: [],
    cleanupValid: true,
    commandExecutablePath: command.bin,
    commandWorkingDirectory: cwd,
    commandArguments: [...command.args],
    error: null,
  };
}

function notStartedJobObjectEvidence({
  command,
  cwd,
  skipReason = "standard-perf-admission-rejected",
  admission = standardPerfAdmissionDecision(CONTROL_HEAD, { cpuSamples: Array(7).fill(21) }),
} = {}) {
  return {
    schemaVersion: 1,
    protocolId: "SF_WILLIAMS_JOB_V1",
    provider: "windows-job-object",
    status: "not-started",
    rootPid: null,
    rootExitCode: null,
    blockExitCode: WILLIAMS_EXIT_CODES.invalidExperiment,
    jobObjectCreated: false,
    timedOut: false,
    createSuspended: false,
    createNoWindow: false,
    assignedBeforeResume: false,
    rootInJobBeforeResume: false,
    killOnJobClose: false,
    breakawayAllowed: false,
    suspendedRootTerminatedOnAssignFailure: false,
    jobCloseSucceeded: false,
    terminateJobSucceeded: false,
    rootTerminationConfirmed: false,
    jobProcessIdsAtRootExit: [],
    remainingPids: [],
    unverifiedPids: [],
    cleanupValid: true,
    workloadSpawnCount: 0,
    commandExecutablePath: command.bin,
    commandWorkingDirectory: cwd,
    commandArguments: [...command.args],
    skipReason,
    admission: {
      policyId: admission.policyId,
      status: admission.status,
      exitCode: admission.exitCode,
      failureCodes: admission.failures.map((entry) => entry.code),
    },
    error: null,
  };
}

function jobRunnerPreparation(
  source = artifactDescriptor("tools/perf/williams_crossover_windows_job_runner.cs"),
  sourceSet = jobRunnerSourceSet(),
) {
  const capabilityCommand = {
    bin: process.execPath,
    args: ["-e", "process.stdout.write('williams-job-runner-ready')"],
    cwd: "C:\\perf\\runner",
  };
  return {
    schemaVersion: 1,
    status: "available",
    error: null,
    compiledAt: "2026-07-10T23:59:00.000Z",
    capabilityProbedAt: "2026-07-10T23:59:30.000Z",
    source: structuredClone(source),
    sourceSet: structuredClone(sourceSet),
    binary: jobRunnerBinaryDescriptor(),
    capabilityCommand,
    capabilityEvidence: jobObjectEvidence(3999, {
      command: capabilityCommand,
      cwd: capabilityCommand.cwd,
    }),
  };
}

function powerSchemeLifecycle() {
  const actions = [
    "capabilities",
    "original-active",
    "query-destination-before-duplicate",
    "query-original-before-duplicate",
    "duplicate",
    "query-created",
    "activate",
    "temporary-active",
    "restore",
    "restored-active",
    "query-temporary-before-delete",
    "delete-temporary",
    "query-deleted",
    "query-original-after-delete",
  ];
  return {
    schemaVersion: 1,
    status: "cleaned",
    originalGuid: "381b4222-f694-41f0-9685-ff5bb260df2e",
    temporaryGuid: EXPECTED_POWER_SCHEME_GUID,
    createdGuid: EXPECTED_POWER_SCHEME_GUID,
    destinationWasAbsent: true,
    destinationAbsenceClassification: "scheme-absent",
    duplicateStarted: true,
    events: actions.map((action, index) => {
      const cleanupStartIndex = actions.indexOf("restore");
      const at = index >= cleanupStartIndex
        ? new Date(Date.UTC(2026, 6, 11, 0, 3, index - cleanupStartIndex)).toISOString()
        : new Date(Date.UTC(2026, 6, 10, 23, 59, 40 + index)).toISOString();
      return {
        action,
        startedAt: at,
        completedAt: at,
        exitCode: new Set(["query-destination-before-duplicate", "query-deleted"]).has(action) ? 1 : 0,
      };
    }),
    cleanup: {
      valid: true,
      restoredGuid: "381b4222-f694-41f0-9685-ff5bb260df2e",
      temporaryGuid: EXPECTED_POWER_SCHEME_GUID,
      temporaryGuidAbsent: true,
      absenceClassification: "scheme-absent",
      deletedQueryExitCode: 1,
      deletionPerformed: true,
      alreadyAbsent: false,
    },
  };
}

function workloadIdentity(scenarioId) {
  return {
    scenarioId,
    manifestPath: `data/scenarios/${scenarioId}/manifest.json`,
    manifestSha256: scenarioId === "tno_1962" ? "1".repeat(64) : "2".repeat(64),
    featureCount: scenarioId === "tno_1962" ? 1000 : 2000,
    sampleRole: "gate",
    baseUrl: "http://127.0.0.1:8892",
    runs: 2,
    warmups: 1,
    renderSampleRunProfileId: WILLIAMS_CROSSOVER_RENDER_SAMPLE_RUN_PROFILE_ID,
    urlQuery: { ...URL_QUERY },
  };
}

function createEvidence({ startupByBlock = {}, renderByBlock = {} } = {}) {
  const preregistration = buildWilliamsPreregistration({
    controlHead: CONTROL_HEAD,
    candidateHead: CANDIDATE_HEAD,
    controlWorktree: CONTROL_WORKTREE,
    candidateWorktree: CANDIDATE_WORKTREE,
    generatedAt: "2026-07-10T23:59:50.000Z",
    expectedPowerSchemeGuid: EXPECTED_POWER_SCHEME_GUID,
    powerSchemeHelper: artifactDescriptor("tools/perf/williams_crossover_power_scheme.ps1"),
    jobRunnerSource: artifactDescriptor("tools/perf/williams_crossover_windows_job_runner.cs"),
    jobRunnerSources: jobRunnerSourceSet(),
    jobRunnerBinary: jobRunnerBinaryDescriptor(),
  });
  const blocks = WILLIAMS_BLOCK_SEQUENCE.map((block) => {
    const expectedHead = block.side === "A" ? CONTROL_HEAD : CANDIDATE_HEAD;
    const cwd = block.side === "A" ? CONTROL_WORKTREE : CANDIDATE_WORKTREE;
    const baselineScenarios = {};
    const rawRuns = {};
    for (const scenarioId of WILLIAMS_SCENARIOS) {
      const startup = startupByBlock[block.ordinal]?.[scenarioId] ?? 3000;
      const render = renderByBlock[block.ordinal]?.[scenarioId] ?? 1000;
      rawRuns[scenarioId] = [0, 1].map((offset) => ({
        activeScenarioId: scenarioId,
        snapshot: canonicalSnapshot(scenarioId, render + offset),
        summary: {
          totalStartupMs: startup + offset,
          canonicalRenderSampleMs: render + offset,
        },
      }));
      baselineScenarios[scenarioId] = {
        sampleRole: "gate",
        featureCount: workloadIdentity(scenarioId).featureCount,
        workloadIdentity: workloadIdentity(scenarioId),
        runs: rawRuns[scenarioId],
        summary: { canonicalRenderSampleMs: render + 0.5 },
        renderSampleRoleSummary: {
          policyId: "render-sample-role-v2",
          canonicalRoleId: "last-post-promotion-idle-scenario-frame-v1",
          governedRunCount: 2,
          matchedRunCount: 2,
          mismatchCount: 0,
          canonicalRenderSampleMs: render + 0.5,
        },
      };
    }
    const command = buildWilliamsBlockCommand({
      candidateWorktree: CANDIDATE_WORKTREE,
      measuredWorktree: cwd,
      blockDirectory: path.join(EVIDENCE_RAW_ROOT, "blocks", block.id),
      scenarioOrder: block.scenarioOrder,
    });
    return {
      ordinal: block.ordinal,
      id: block.id,
      side: block.side,
      orderId: block.orderId,
      scenarioOrder: [...block.scenarioOrder],
      identity: {
        side: block.side,
        expectedHead,
        actualHead: expectedHead,
        detached: true,
        gitStatus: "",
        cwd,
        measuredRoot: cwd,
        harnessRoot: CANDIDATE_WORKTREE,
        artifacts: {
          packageLock: artifactDescriptor("package-lock.json"),
          runner: artifactDescriptor("tools/perf/run_baseline.mjs"),
          rolePolicy: artifactDescriptor("tools/perf/render_sample_role_policy.mjs"),
          analyzer: artifactDescriptor("tools/perf/run_williams_crossover.mjs"),
          policy: artifactDescriptor("tools/perf/williams_crossover_policy.mjs"),
          standardPerfAdmission: artifactDescriptor("tools/perf/standard_perf_admission.mjs"),
          windowsRuntime: artifactDescriptor("tools/perf/williams_crossover_windows_runtime.mjs"),
          containmentIdentityHelper: artifactDescriptor("tools/process_containment/ordered_source_set_identity.mjs"),
          jobRunnerSource: artifactDescriptor("tools/perf/williams_crossover_windows_job_runner.cs"),
          jobRunnerSources: jobRunnerSourceSet(),
          powerSchemeHelper: artifactDescriptor("tools/perf/williams_crossover_power_scheme.ps1"),
          jobRunnerBinary: jobRunnerBinaryDescriptor(),
        },
      },
      preBlockAdmission: evaluateStandardPerfAdmission(
        standardPerfAdmissionEvidence({
          git: {
            status: "available",
            head: expectedHead,
            entries: [],
            detail: "",
          },
        }),
        STANDARD_PERF_ADMISSION_POLICY,
      ),
      telemetry: {
        pre: telemetryWindow("pre", block.ordinal, cwd, expectedHead),
        post: telemetryWindow("post", block.ordinal, cwd, expectedHead),
      },
      cleanup: {
        valid: true,
        processTreeCaptureStatus: "available",
        terminationSucceeded: true,
        terminationResults: [],
        taskOwnedPidsRemaining: [],
        taskOwnedProcessesRemaining: [],
        newBrowserPids: [],
        portsClear: true,
        serverProbesClear: true,
        gitStatusStable: true,
        gitHeadStable: true,
        detachedStable: true,
        jobObject: jobObjectEvidence(4000 + block.ordinal, { command, cwd }),
      },
      jobObject: jobObjectEvidence(4000 + block.ordinal, { command, cwd }),
      command,
      quietWindow: { status: "valid", valid: true },
      blockResult: { status: "complete", exitCode: 0 },
      baseline: {
        schemaVersion: 2,
        benchmarkMetricsSchemaVersion: "3.3",
        probeSchema: "mc_perf_snapshot",
        mode: "baseline",
        gitHead: expectedHead,
        config: { warmups: 1, runs: 2, scenarios: [...block.scenarioOrder], threshold: 1.15, urlQuery: { ...URL_QUERY } },
        renderSampleRolePolicy: {
          policyId: "render-sample-role-v2",
          canonicalRoleId: "last-post-promotion-idle-scenario-frame-v1",
          runProfile: {
            id: WILLIAMS_CROSSOVER_RENDER_SAMPLE_RUN_PROFILE_ID,
            measuredRunsPerScenario: 2,
            reportSchemaVersion: 2,
          },
        },
        workloadIdentity: {
          scenarioIds: [...block.scenarioOrder],
          runs: 2,
          warmups: 1,
          renderSampleRunProfileId: WILLIAMS_CROSSOVER_RENDER_SAMPLE_RUN_PROFILE_ID,
          urlQuery: { ...URL_QUERY },
          baseUrl: "http://127.0.0.1:8892",
          scenarios: Object.fromEntries(WILLIAMS_SCENARIOS.map((scenarioId) => [scenarioId, workloadIdentity(scenarioId)])),
        },
        scenarios: baselineScenarios,
      },
      rawRuns,
    };
  });
  return {
    trustedRevisionIdentity: trustedRevisionIdentity(),
    rawRoot: EVIDENCE_RAW_ROOT,
    preregistration,
    jobRunnerPreparation: jobRunnerPreparation(
      preregistration.workloadContract.processContainment.identity.source,
      preregistration.workloadContract.processContainment.identity.sourceSet,
    ),
    powerSchemeLifecycle: powerSchemeLifecycle(),
    blocks,
    manifestValidation: { status: "valid", errors: [], measuredRawFileCount: 32 },
  };
}

function applyNotStartedBlockEvidence(evidence, blockIndex = 0) {
  const block = evidence.blocks[blockIndex];
  const expectedHead = block.side === "A" ? CONTROL_HEAD : CANDIDATE_HEAD;
  const rejectedAdmission = standardPerfAdmissionDecision(expectedHead, {
    cpuSamples: Array(STANDARD_PERF_ADMISSION_POLICY.sampleCount).fill(21),
  });
  const notStartedJob = notStartedJobObjectEvidence({
    command: block.command,
    cwd: block.identity.cwd,
    admission: rejectedAdmission,
  });
  block.preBlockAdmission = rejectedAdmission;
  block.quietWindow = {
    status: "invalid",
    valid: false,
    standardPerfAdmission: {
      valid: false,
      policyId: rejectedAdmission.policyId,
      status: rejectedAdmission.status,
      exitCode: rejectedAdmission.exitCode,
      failureCodes: rejectedAdmission.failures.map((entry) => entry.code),
    },
  };
  Object.assign(block.cleanup, {
    workloadSpawnCount: 0,
    workloadStarted: false,
    cleanupRequired: false,
    taskOwnedPids: [],
    taskOwnedProcesses: [],
    terminationResults: [],
    terminationSucceeded: true,
    jobObject: structuredClone(notStartedJob),
  });
  block.jobObject = structuredClone(notStartedJob);
  block.blockResult = {
    schemaVersion: 1,
    status: "invalid",
    exitCode: WILLIAMS_EXIT_CODES.invalidExperiment,
    timedOut: false,
    runnerPid: null,
    workloadSpawnCount: 0,
    skipReason: "standard-perf-admission-rejected",
    preBlockAdmission: {
      policyId: rejectedAdmission.policyId,
      status: rejectedAdmission.status,
      exitCode: rejectedAdmission.exitCode,
      failureCodes: rejectedAdmission.failures.map((entry) => entry.code),
    },
    cleanupValid: true,
  };
  return block;
}

function setMetricValues(table, ordinals, value) {
  for (const ordinal of ordinals) {
    table[ordinal] = Object.fromEntries(WILLIAMS_SCENARIOS.map((scenarioId) => [scenarioId, value]));
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function materializeEvidenceRoot(evidence) {
  const root = await makeRuntimeTemp("williams-crossover-");
  const currentToolIdentity = await buildCurrentHarnessArtifacts();
  const packageLock = await expectedPackageLockDescriptor();
  currentToolIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  evidence.preregistration.workloadContract.processContainment.identity = {
    source: currentToolIdentity.jobRunnerSource,
    sourceSet: currentToolIdentity.jobRunnerSources,
    binary: currentToolIdentity.jobRunnerBinary,
  };
  evidence.preregistration.telemetry.powerSchemeHelper = currentToolIdentity.powerSchemeHelper;
  evidence.rawRoot = root;
  const materializedPlan = buildWilliamsExecutionPlan({
    rawRoot: root,
    controlHead: evidence.preregistration.control.head,
    candidateHead: evidence.preregistration.candidate.head,
    controlWorktree: evidence.preregistration.control.worktree,
    candidateWorktree: evidence.preregistration.candidate.worktree,
  });
  const commandByBlockId = new Map(materializedPlan.blocks.map((block) => [block.id, block.command]));
  for (const block of evidence.blocks) {
    block.command = structuredClone(commandByBlockId.get(block.id));
    for (const jobEvidence of [block.jobObject, block.cleanup.jobObject]) {
      jobEvidence.commandExecutablePath = block.command.bin;
      jobEvidence.commandWorkingDirectory = block.identity.cwd;
      jobEvidence.commandArguments = [...block.command.args];
    }
    block.identity.artifacts.runner = currentToolIdentity.runner;
    block.identity.artifacts.packageLock = structuredClone(packageLock);
    block.identity.artifacts.rolePolicy = currentToolIdentity.rolePolicy;
    block.identity.artifacts.analyzer = currentToolIdentity.analyzer;
    block.identity.artifacts.policy = currentToolIdentity.policy;
    block.identity.artifacts.standardPerfAdmission = currentToolIdentity.standardPerfAdmission;
    block.identity.artifacts.windowsRuntime = currentToolIdentity.windowsRuntime;
    block.identity.artifacts.containmentIdentityHelper = currentToolIdentity.containmentIdentityHelper;
    block.identity.artifacts.jobRunnerSource = currentToolIdentity.jobRunnerSource;
    block.identity.artifacts.jobRunnerSources = currentToolIdentity.jobRunnerSources;
    block.identity.artifacts.powerSchemeHelper = currentToolIdentity.powerSchemeHelper;
    block.identity.artifacts.jobRunnerBinary = currentToolIdentity.jobRunnerBinary;
  }
  await writeJson(path.join(root, "preregistration.json"), evidence.preregistration);
  const preparation = jobRunnerPreparation(currentToolIdentity.jobRunnerSource, currentToolIdentity.jobRunnerSources);
  preparation.binary = currentToolIdentity.jobRunnerBinary;
  evidence.jobRunnerPreparation = preparation;
  await writeJson(path.join(root, "harness", "job-runner-preparation.json"), preparation);
  await writeJson(path.join(root, "harness", "power-scheme-lifecycle.json"), evidence.powerSchemeLifecycle);
  await fs.mkdir(path.join(root, "tooling"), { recursive: true });
  await fs.writeFile(path.join(root, JOB_RUNNER_EVIDENCE_PATH), JOB_RUNNER_FIXTURE_BYTES);
  for (const block of evidence.blocks) {
    const directory = path.join(root, "blocks", block.id);
    await writeJson(path.join(directory, "block-metadata.json"), {
      ordinal: block.ordinal,
      id: block.id,
      side: block.side,
      orderId: block.orderId,
      scenarioOrder: block.scenarioOrder,
    });
    await writeJson(path.join(directory, "identity.json"), block.identity);
    await writeJson(path.join(directory, "pre-block-standard-perf-admission.json"), block.preBlockAdmission);
    await writeJson(path.join(directory, "telemetry-pre.json"), block.telemetry.pre);
    await writeJson(path.join(directory, "telemetry-post.json"), block.telemetry.post);
    await writeJson(path.join(directory, "quiet-window.json"), block.quietWindow);
    await writeJson(path.join(directory, "command.json"), block.command);
    await writeJson(path.join(directory, "baseline.json"), block.baseline);
    await writeJson(path.join(directory, "cleanup.json"), block.cleanup);
    await writeJson(path.join(directory, "block-result.json"), block.blockResult);
    await writeJson(path.join(directory, "job-object.json"), block.jobObject);
    for (const scenarioId of WILLIAMS_SCENARIOS) {
      for (let index = 0; index < block.rawRuns[scenarioId].length; index += 1) {
        await writeJson(
          path.join(directory, "raw", scenarioId, `run-${String(index + 1).padStart(2, "0")}.json`),
          block.rawRuns[scenarioId][index],
        );
      }
    }
  }
  await buildWilliamsRawManifest(root, currentToolIdentity);
  return root;
}

async function rebuildRawManifest(root) {
  const currentToolIdentity = await buildCurrentHarnessArtifacts();
  currentToolIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await fs.rm(path.join(root, "raw-sha256-manifest.json"));
  await buildWilliamsRawManifest(root, currentToolIdentity);
}

async function synchronizeRawRevisionEvidence(root, overrides = {}) {
  const preregistrationPath = path.join(root, "preregistration.json");
  const preregistration = JSON.parse(await fs.readFile(preregistrationPath, "utf8"));
  const revision = {
    controlWorktree: overrides.controlWorktree ?? preregistration.control.worktree,
    controlHead: overrides.controlHead ?? preregistration.control.head,
    candidateWorktree: overrides.candidateWorktree ?? preregistration.candidate.worktree,
    candidateHead: overrides.candidateHead ?? preregistration.candidate.head,
  };
  const commandCandidateWorktree = overrides.commandCandidateWorktree ?? revision.candidateWorktree;
  const harnessRoot = overrides.harnessRoot ?? commandCandidateWorktree;
  preregistration.control.worktree = revision.controlWorktree;
  preregistration.control.head = revision.controlHead;
  preregistration.candidate.worktree = revision.candidateWorktree;
  preregistration.candidate.head = revision.candidateHead;
  await writeJson(preregistrationPath, preregistration);

  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const directory = path.join(root, "blocks", block.id);
    const measuredWorktree = block.side === "A" ? revision.controlWorktree : revision.candidateWorktree;
    const expectedHead = block.side === "A" ? revision.controlHead : revision.candidateHead;
    const command = literalWilliamsCommand({
      rawRoot: root,
      blockId: block.id,
      measuredWorktree,
      scenarioOrder: block.scenarioOrder,
    });
    command.args[0] = path.join(commandCandidateWorktree, "tools", "perf", "run_baseline.mjs");
    await writeJson(path.join(directory, "command.json"), command);

    const identityPath = path.join(directory, "identity.json");
    const identity = JSON.parse(await fs.readFile(identityPath, "utf8"));
    identity.expectedHead = expectedHead;
    identity.actualHead = expectedHead;
    identity.cwd = measuredWorktree;
    identity.measuredRoot = measuredWorktree;
    identity.harnessRoot = harnessRoot;
    await writeJson(identityPath, identity);

    for (const telemetryName of ["telemetry-pre.json", "telemetry-post.json"]) {
      const telemetryPath = path.join(directory, telemetryName);
      const telemetry = JSON.parse(await fs.readFile(telemetryPath, "utf8"));
      telemetry.environment.cwd = measuredWorktree;
      telemetry.environment.gitHead = expectedHead;
      await writeJson(telemetryPath, telemetry);
    }

    const baselinePath = path.join(directory, "baseline.json");
    const baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
    baseline.gitHead = expectedHead;
    await writeJson(baselinePath, baseline);

    const admissionPath = path.join(directory, "pre-block-standard-perf-admission.json");
    const admission = JSON.parse(await fs.readFile(admissionPath, "utf8"));
    admission.git.head = expectedHead;
    await writeJson(admissionPath, admission);

    const jobObjectPath = path.join(directory, "job-object.json");
    const jobObject = JSON.parse(await fs.readFile(jobObjectPath, "utf8"));
    jobObject.commandExecutablePath = command.bin;
    jobObject.commandWorkingDirectory = measuredWorktree;
    jobObject.commandArguments = [...command.args];
    await writeJson(jobObjectPath, jobObject);

    const cleanupPath = path.join(directory, "cleanup.json");
    const cleanup = JSON.parse(await fs.readFile(cleanupPath, "utf8"));
    cleanup.jobObject = structuredClone(jobObject);
    await writeJson(cleanupPath, cleanup);
  }
  await rebuildRawManifest(root);
}

async function synchronizeRawToolIdentity(root, currentToolIdentity) {
  const toolIdentity = structuredClone(currentToolIdentity);
  toolIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  const preregistrationPath = path.join(root, "preregistration.json");
  const preregistration = JSON.parse(await fs.readFile(preregistrationPath, "utf8"));
  preregistration.workloadContract.processContainment.identity = {
    source: toolIdentity.jobRunnerSource,
    sourceSet: toolIdentity.jobRunnerSources,
    binary: toolIdentity.jobRunnerBinary,
  };
  preregistration.telemetry.powerSchemeHelper = toolIdentity.powerSchemeHelper;
  await writeJson(preregistrationPath, preregistration);

  const preparationPath = path.join(root, "harness", "job-runner-preparation.json");
  const preparation = JSON.parse(await fs.readFile(preparationPath, "utf8"));
  preparation.source = toolIdentity.jobRunnerSource;
  preparation.sourceSet = toolIdentity.jobRunnerSources;
  preparation.binary = toolIdentity.jobRunnerBinary;
  await writeJson(preparationPath, preparation);

  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const identityPath = path.join(root, "blocks", block.id, "identity.json");
    const identity = JSON.parse(await fs.readFile(identityPath, "utf8"));
    for (const field of [
      "runner",
      "rolePolicy",
      "analyzer",
      "policy",
      "standardPerfAdmission",
      "windowsRuntime",
      "containmentIdentityHelper",
      "jobRunnerSource",
      "jobRunnerSources",
      "powerSchemeHelper",
      "jobRunnerBinary",
    ]) {
      identity.artifacts[field] = structuredClone(toolIdentity[field]);
    }
    await writeJson(identityPath, identity);
  }
  await fs.rm(path.join(root, "raw-sha256-manifest.json"));
  await buildWilliamsRawManifest(root, toolIdentity);
}

function runGitFixture(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

async function createDetachedAnalyzerFixtureRepository({ commitMessage = "fixture" } = {}) {
  const root = await makeRuntimeTemp("williams-direct-cli-repo-");
  const files = [
    "package-lock.json",
    "tools/perf/run_williams_crossover.mjs",
    "tools/perf/williams_crossover_policy.mjs",
    "tools/perf/standard_perf_admission.mjs",
    "tools/perf/williams_crossover_windows_runtime.mjs",
    "tools/perf/run_baseline.mjs",
    "tools/perf/render_sample_role_policy.mjs",
    "tools/perf/williams_crossover_windows_job_runner.cs",
    "tools/perf/williams_crossover_power_scheme.ps1",
    "tools/process_containment/ordered_source_set_identity.mjs",
    "tools/process_containment/windows_job_runner_core.cs",
  ];
  for (const relativePath of files) {
    const destination = path.join(root, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(REPO_ROOT, relativePath), destination);
  }
  runGitFixture(root, ["init", "--quiet"]);
  runGitFixture(root, ["config", "user.name", "Williams Test"]);
  runGitFixture(root, ["config", "user.email", "williams-test@example.invalid"]);
  runGitFixture(root, ["add", "--", ...files]);
  runGitFixture(root, ["commit", "--quiet", "-m", commitMessage]);
  runGitFixture(root, ["checkout", "--quiet", "--detach", "HEAD"]);
  return { root, head: runGitFixture(root, ["rev-parse", "HEAD"]) };
}

async function loadDetachedAnalyzerFixture() {
  const fixture = await createDetachedAnalyzerFixtureRepository({ commitMessage: "candidate fixture" });
  const control = await createDetachedAnalyzerFixtureRepository({ commitMessage: "control fixture" });
  assert.notEqual(path.resolve(control.root), path.resolve(fixture.root));
  assert.notEqual(control.head, fixture.head);
  const moduleUrl = pathToFileURL(path.join(fixture.root, "tools", "perf", "run_williams_crossover.mjs"));
  const runner = await import(`${moduleUrl.href}?fixture=${crypto.randomUUID()}`);
  return { ...fixture, control, runner };
}

async function removeDetachedAnalyzerFixture(fixture) {
  await Promise.all([
    fs.rm(fixture.root, { recursive: true, force: true }),
    fs.rm(fixture.control.root, { recursive: true, force: true }),
  ]);
}

function buildDetachedExecutePreflightOptions(runner, fixture, outputRoot, candidateWorktree = fixture.root) {
  return runner.parseWilliamsArgs([
    "--execute",
    "--control-worktree", fixture.control.root,
    "--control-head", fixture.control.head,
    "--candidate-worktree", candidateWorktree,
    "--candidate-head", fixture.head,
    "--raw-root", path.join(outputRoot, "raw"),
    "--json-out", path.join(outputRoot, "report.json"),
    "--md-out", path.join(outputRoot, "report.md"),
  ]);
}

function windowsMixedCasePath(value) {
  return [...path.resolve(value)].map((character, index) => {
    if (!/[a-z]/i.test(character)) return character;
    return index % 2 === 0 ? character.toUpperCase() : character.toLowerCase();
  }).join("");
}

async function rejectUnexpectedJobPreparation() {
  throw new Error("unexpected-job-preparation");
}

test("mixed-case Windows candidate roots preserve exact producer-consumer block commands", {
  skip: process.platform !== "win32",
}, async (t) => {
  const outputRoot = await makeRuntimeTemp("williams-command-authority-");
  t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
  const mixedCaseRoot = windowsMixedCasePath(REPO_ROOT);
  const identity = buildWilliamsTrustedRevisionIdentity(trustedRevisionIdentity({
    expectedCandidateWorktree: mixedCaseRoot,
  }));
  const rawRoot = path.join(outputRoot, "raw");
  const plan = buildWilliamsExecutionPlan({ rawRoot, trustedRevisionIdentity: identity });

  for (const block of plan.blocks) {
    const expected = expectedCanonicalBlockCommand(block, identity, rawRoot);
    assert.equal(block.command.bin, expected.bin, block.id);
    assert.deepEqual(block.command.args, expected.args, block.id);
  }
});

test("execute preflight accepts a canonical Windows mixed-case candidate root before a later typed failure", {
  skip: process.platform !== "win32",
}, async (t) => {
  const fixture = await loadDetachedAnalyzerFixture();
  const outputRoot = await makeRuntimeTemp("williams-execute-mixed-case-");
  t.after(() => Promise.all([
    removeDetachedAnalyzerFixture(fixture),
    fs.rm(outputRoot, { recursive: true, force: true }),
  ]));
  const mixedCaseRoot = windowsMixedCasePath(fixture.root);
  assert.notEqual(mixedCaseRoot, fixture.root);
  assert.equal(mixedCaseRoot.toLowerCase(), fixture.root.toLowerCase());
  const options = buildDetachedExecutePreflightOptions(fixture.runner, fixture, outputRoot, mixedCaseRoot);
  await fs.writeFile(options.jsonOut, "{}\n", "utf8");
  const trustedIdentity = fixture.runner.buildWilliamsTrustedRevisionIdentity(options);

  await assert.rejects(
    fixture.runner.executeWilliamsExperimentWithTestAdapters(options, trustedIdentity),
    (error) => (
      error instanceof fixture.runner.WilliamsInvalidExperimentError
      && error.code === "report-output-exists"
      && fixture.runner.getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment
    ),
  );
  await assert.rejects(fs.access(options.rawRoot), (error) => error?.code === "ENOENT");
});

test("execute rejects non-distinct trusted A/B identities before every downstream authority", async (t) => {
  const fixture = await loadDetachedAnalyzerFixture();
  t.after(() => removeDetachedAnalyzerFixture(fixture));
  const cases = [
    {
      label: "distinct physical roots declare one exact head",
      reason: "trusted-revision-identity.heads.distinct",
      mutateOptions: (options) => {
        options.controlHead = fixture.head;
      },
    },
    {
      label: "one physical root declares distinct exact heads",
      reason: "trusted-revision-identity.worktrees.distinct",
      mutateOptions: (options) => {
        options.controlWorktree = fixture.root;
      },
    },
  ];

  for (const { label, reason, mutateOptions } of cases) {
    const outputRoot = await makeRuntimeTemp("williams-execute-distinct-identity-");
    t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
    const options = buildDetachedExecutePreflightOptions(fixture.runner, fixture, outputRoot);
    mutateOptions(options);
    const trustedIdentity = fixture.runner.buildWilliamsTrustedRevisionIdentity(options);
    assert.equal(Object.isFrozen(trustedIdentity), true, label);
    let authorityCalls = 0;
    let jobPreparationCalls = 0;
    const unexpectedAuthority = async () => {
      authorityCalls += 1;
      throw new Error("unexpected-downstream-authority");
    };

    await assert.rejects(
      fixture.runner.executeWilliamsExperimentWithTestAdapters(options, trustedIdentity, {
        analyzerAuthorityAdapter: {
          realpath: unexpectedAuthority,
          gitTopLevel: unexpectedAuthority,
          gitSnapshot: unexpectedAuthority,
          readWorkspaceFile: unexpectedAuthority,
          readCommitArtifact: unexpectedAuthority,
        },
        prepareWindowsJobRunnerFn: async () => {
          jobPreparationCalls += 1;
          throw new Error("unexpected-job-preparation");
        },
      }),
      (error) => (
        error instanceof fixture.runner.WilliamsInvalidExperimentError
        && error.code === "trusted-revision-identity-invalid"
        && error.message.includes(reason)
        && fixture.runner.getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment
      ),
      label,
    );
    assert.equal(authorityCalls, 0, label);
    assert.equal(jobPreparationCalls, 0, label);
    await assert.rejects(fs.access(options.rawRoot), (error) => error?.code === "ENOENT", label);
  }
});

test("execute preflight fences trusted harness descriptor reads before Job preparation", async (t) => {
  const fixture = await loadDetachedAnalyzerFixture();
  const outputRoot = await makeRuntimeTemp("williams-execute-post-fence-");
  t.after(() => Promise.all([
    removeDetachedAnalyzerFixture(fixture),
    fs.rm(outputRoot, { recursive: true, force: true }),
  ]));
  const options = buildDetachedExecutePreflightOptions(fixture.runner, fixture, outputRoot);
  const trustedIdentity = fixture.runner.buildWilliamsTrustedRevisionIdentity(options);
  const clean = { actualHead: fixture.head, detached: true, branch: null, gitStatus: "" };
  const analyzerAuthorityAdapter = trustedAnalyzerAuthorityAdapter({
    root: fixture.root,
    head: fixture.head,
    snapshots: [clean, { ...clean, actualHead: "f".repeat(40) }],
  });

  await assert.rejects(
    fixture.runner.executeWilliamsExperimentWithTestAdapters(options, trustedIdentity, {
      analyzerAuthorityAdapter,
      prepareWindowsJobRunnerFn: rejectUnexpectedJobPreparation,
    }),
    (error) => (
      error instanceof fixture.runner.WilliamsInvalidExperimentError
      && error.code === "identity-mismatch"
      && error.message.includes("trusted analyzer after tool snapshot")
      && fixture.runner.getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment
    ),
  );
  await assert.rejects(fs.access(options.rawRoot), (error) => error?.code === "ENOENT");
});

test("execute package descriptors fail closed after exact-commit reads and before output or Job preparation", async (t) => {
  const fixture = await loadDetachedAnalyzerFixture();
  t.after(() => removeDetachedAnalyzerFixture(fixture));
  const candidateClean = { actualHead: fixture.head, detached: true, branch: null, gitStatus: "" };
  const controlClean = { actualHead: fixture.control.head, detached: true, branch: null, gitStatus: "" };
  const packageLock = await fs.readFile(path.join(fixture.root, "package-lock.json"));
  const postFenceCommitReads = [];
  const cases = [
    {
      label: "checkout drift after descriptor read",
      expectedCode: "identity-mismatch",
      expectedMessage: "control/A after package-lock snapshot",
      commitReads: postFenceCommitReads,
      adapter: trustedAnalyzerAuthorityAdapter({
        root: fixture.root,
        head: fixture.head,
        snapshots: [
          candidateClean,
          candidateClean,
          controlClean,
          { ...controlClean, actualHead: "f".repeat(40) },
        ],
        commitReads: postFenceCommitReads,
      }),
    },
    {
      label: "descriptor bytes differ from exact commit blob",
      expectedCode: "expected-commit-descriptor-mismatch",
      adapter: trustedAnalyzerAuthorityAdapter({
        root: fixture.root,
        head: fixture.head,
        snapshots: [candidateClean, candidateClean, controlClean, controlClean],
        commitMutations: {
          "package-lock.json": (buffer) => Buffer.concat([buffer, Buffer.from("\n")]),
        },
        commitBlobOverrides: {
          "package-lock.json": normalizedGitBlob(packageLock),
        },
      }),
    },
  ];

  for (const { label, expectedCode, expectedMessage, commitReads, adapter } of cases) {
    const outputRoot = await makeRuntimeTemp("williams-package-preflight-");
    t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
    const options = buildDetachedExecutePreflightOptions(fixture.runner, fixture, outputRoot);
    const trustedIdentity = fixture.runner.buildWilliamsTrustedRevisionIdentity(options);
    let jobPreparationCalls = 0;
    await assert.rejects(
      fixture.runner.executeWilliamsExperimentWithTestAdapters(options, trustedIdentity, {
        analyzerAuthorityAdapter: adapter,
        prepareWindowsJobRunnerFn: async () => {
          jobPreparationCalls += 1;
          throw new Error("unexpected-job-preparation");
        },
      }),
      (error) => (
        error instanceof fixture.runner.WilliamsInvalidExperimentError
        && error.code === expectedCode
        && (!expectedMessage || error.message.includes(expectedMessage))
        && fixture.runner.getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment
      ),
      label,
    );
    if (commitReads) {
      assert.deepEqual(
        commitReads.filter((entry) => entry.relativePath === "package-lock.json"),
        [{
          root: fixture.control.root,
          head: fixture.control.head,
          relativePath: "package-lock.json",
        }],
        label,
      );
    }
    assert.equal(jobPreparationCalls, 0, label);
    await assert.rejects(fs.access(options.rawRoot), (error) => error?.code === "ENOENT", label);
  }
});

test("execute preflight keeps physical-root, Git-top-level, and candidate-commit drift fail closed", async (t) => {
  const fixture = await loadDetachedAnalyzerFixture();
  t.after(() => removeDetachedAnalyzerFixture(fixture));
  const clean = { actualHead: fixture.head, detached: true, branch: null, gitStatus: "" };
  const cases = [
    [
      "different physical candidate root",
      () => {
        let realpathCall = 0;
        return trustedAnalyzerAuthorityAdapter({
          root: fixture.root,
          head: fixture.head,
          realpath: async () => (++realpathCall === 3 ? path.dirname(fixture.root) : fixture.root),
        });
      },
      "trusted-analyzer-realpath-mismatch",
    ],
    [
      "Git top-level drift",
      () => trustedAnalyzerAuthorityAdapter({
        root: fixture.root,
        head: fixture.head,
        gitTopLevel: path.dirname(fixture.root),
      }),
      "trusted-analyzer-realpath-mismatch",
    ],
    [
      "candidate commit drift",
      () => trustedAnalyzerAuthorityAdapter({
        root: fixture.root,
        head: fixture.head,
        snapshots: [{ ...clean, actualHead: "e".repeat(40) }],
      }),
      "identity-mismatch",
    ],
  ];

  for (const [label, buildAdapter, expectedCode] of cases) {
    const outputRoot = await makeRuntimeTemp("williams-execute-root-drift-");
    t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
    const options = buildDetachedExecutePreflightOptions(fixture.runner, fixture, outputRoot);
    const trustedIdentity = fixture.runner.buildWilliamsTrustedRevisionIdentity(options);
    await assert.rejects(
      fixture.runner.executeWilliamsExperimentWithTestAdapters(options, trustedIdentity, {
        analyzerAuthorityAdapter: buildAdapter(),
        prepareWindowsJobRunnerFn: rejectUnexpectedJobPreparation,
      }),
      (error) => (
        error instanceof fixture.runner.WilliamsInvalidExperimentError
        && error.code === expectedCode
        && fixture.runner.getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment
      ),
      label,
    );
    await assert.rejects(fs.access(options.rawRoot), (error) => error?.code === "ENOENT", label);
  }
});

test("Williams sequence, adjacent B-A pairs, and same-side drift pairs are frozen", () => {
  assert.equal(WILLIAMS_CROSSOVER_POLICY_ID, "p2-williams-crossover-v7");
  assert.deepEqual(buildWilliamsPreregistration().workloadContract.report.renderSampleRunProfile, {
    id: WILLIAMS_CROSSOVER_RENDER_SAMPLE_RUN_PROFILE_ID,
    measuredRunsPerScenario: 2,
    reportSchemaVersion: 2,
    allowedModes: ["baseline"],
  });
  assert.deepEqual(WILLIAMS_TELEMETRY_CADENCE, {
    windowSchemaVersion: 4,
    samplesPerWindow: 5,
    sampleIntervalMs: 1000,
    sampleIntervalToleranceMs: 250,
    maxCaptureDurationMs: 1250,
    maxScheduleLagMs: 250,
    scheduler: "monotonic-fixed-rate",
    timestampSemantics: "actual-capture-start",
    priming: {
      captureCount: 1,
      timing: "before-sampling-stopwatch",
      admissionRole: "excluded-warmup",
      requiredEvidenceFields: ["status", "startedAt", "completedAt", "captureDurationMs"],
    },
    requiredCaptureFields: ["completedAt", "captureDurationMs", "scheduleLagMs"],
    requiredWindowFields: ["startedAt", "completedAt"],
  });
  assert.deepEqual(
    WILLIAMS_BLOCK_SEQUENCE.map(({ ordinal, side, orderId, scenarioOrder }) => ({ ordinal, side, orderId, scenarioOrder })),
    [
      { ordinal: 1, side: "A", orderId: "TH", scenarioOrder: ["tno_1962", "hoi4_1939"] },
      { ordinal: 2, side: "B", orderId: "TH", scenarioOrder: ["tno_1962", "hoi4_1939"] },
      { ordinal: 3, side: "B", orderId: "HT", scenarioOrder: ["hoi4_1939", "tno_1962"] },
      { ordinal: 4, side: "A", orderId: "HT", scenarioOrder: ["hoi4_1939", "tno_1962"] },
      { ordinal: 5, side: "B", orderId: "TH", scenarioOrder: ["tno_1962", "hoi4_1939"] },
      { ordinal: 6, side: "A", orderId: "TH", scenarioOrder: ["tno_1962", "hoi4_1939"] },
      { ordinal: 7, side: "A", orderId: "HT", scenarioOrder: ["hoi4_1939", "tno_1962"] },
      { ordinal: 8, side: "B", orderId: "HT", scenarioOrder: ["hoi4_1939", "tno_1962"] },
    ],
  );
  assert.deepEqual(WILLIAMS_ADJACENT_PAIRS, [
    { id: "pair-01-02", controlOrdinal: 1, candidateOrdinal: 2 },
    { id: "pair-03-04", controlOrdinal: 4, candidateOrdinal: 3 },
    { id: "pair-05-06", controlOrdinal: 6, candidateOrdinal: 5 },
    { id: "pair-07-08", controlOrdinal: 7, candidateOrdinal: 8 },
  ]);
  assert.deepEqual(WILLIAMS_DRIFT_PAIRS.map(({ id, firstOrdinal, secondOrdinal }) => ({ id, firstOrdinal, secondOrdinal })), [
    { id: "A-TH-1-6", firstOrdinal: 1, secondOrdinal: 6 },
    { id: "A-HT-4-7", firstOrdinal: 4, secondOrdinal: 7 },
    { id: "B-TH-2-5", firstOrdinal: 2, secondOrdinal: 5 },
    { id: "B-HT-3-8", firstOrdinal: 3, secondOrdinal: 8 },
  ]);
});

test("accepted experiment uses four B-A pair deltas and keeps pooled medians diagnostic", () => {
  const report = analyzeWilliamsCrossoverEvidence(createEvidence());
  assert.equal(report.decision.status, "accepted");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.accepted);
  assert.equal(report.primary.tno_1962.startup.pairCount, 4);
  assert.equal(report.primary.tno_1962.startup.deltaMs, 0);
  assert.equal(report.legacyPooledMedian.tno_1962.startup.admissionRole, "diagnostic-only");
});

test("one practical pair regression is diagnostic when the primary stays green", () => {
  const startupByBlock = {};
  setMetricValues(startupByBlock, [1, 4], 3000);
  setMetricValues(startupByBlock, [2, 5, 6], 3100);
  setMetricValues(startupByBlock, [3, 7, 8], 3000);
  const report = analyzeWilliamsCrossoverEvidence(createEvidence({ startupByBlock }));
  assert.equal(report.primary.tno_1962.startup.practicalRegressionCount, 1);
  assert.equal(report.primary.tno_1962.startup.pairPolicyStatus, "diagnostic-one-of-four");
  assert.equal(report.decision.status, "accepted");
});

test("two practical pair regressions invalidate the experiment", () => {
  const startupByBlock = {};
  setMetricValues(startupByBlock, [1, 4, 6, 7], 3000);
  setMetricValues(startupByBlock, [2, 3, 5, 8], 3100);
  const report = analyzeWilliamsCrossoverEvidence(createEvidence({ startupByBlock }));
  assert.equal(report.primary.hoi4_1939.startup.practicalRegressionCount, 4);
  assert.equal(report.decision.status, "valid-regression");

  setMetricValues(startupByBlock, [3, 4, 7, 8], 3000);
  const twoPairReport = analyzeWilliamsCrossoverEvidence(createEvidence({ startupByBlock }));
  assert.equal(twoPairReport.primary.tno_1962.startup.practicalRegressionCount, 2);
  assert.equal(twoPairReport.decision.status, "invalid-experiment");
  assert.ok(twoPairReport.decision.invalidReasons.includes("primary.tno_1962.startup.two-of-four-regressions"));
});

test("three or four practical pair regressions produce a valid regression exit", () => {
  const renderByBlock = {};
  setMetricValues(renderByBlock, [1, 4, 6, 7], 1000);
  setMetricValues(renderByBlock, [2, 3, 5, 8], 1060);
  const report = analyzeWilliamsCrossoverEvidence(createEvidence({ renderByBlock }));
  assert.equal(report.primary.tno_1962.canonicalRender.practicalRegressionCount, 4);
  assert.equal(report.decision.status, "valid-regression");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.validRegression);
});

test("opposite practical directions trigger the symmetric direction veto", () => {
  const startupByBlock = {};
  setMetricValues(startupByBlock, [1], 3000);
  setMetricValues(startupByBlock, [2, 5, 6], 3100);
  setMetricValues(startupByBlock, [3, 7, 8], 2900);
  setMetricValues(startupByBlock, [4], 3000);
  const report = analyzeWilliamsCrossoverEvidence(createEvidence({ startupByBlock }));
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.directionVetoes.some((entry) => entry.scenarioId === "tno_1962" && entry.metric === "startup"));
});

test("missing telemetry capability fails closed without converting null to zero", () => {
  const evidence = createEvidence();
  evidence.blocks[0].telemetry.pre.capability = { status: "required-capability-missing", missing: ["Processor Performance"] };
  evidence.blocks[0].telemetry.pre.samples[0].processorPerformancePercent = null;
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.includes("block-01.telemetry.pre.capability.required-capability-missing"));
  assert.ok(report.decision.invalidReasons.includes("block-01.telemetry.pre.samples.0.processorPerformancePercent"));
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("missing telemetry summary returns a typed invalid experiment", () => {
  const evidence = createEvidence();
  evidence.blocks[0].telemetry.post = null;
  let report;
  assert.doesNotThrow(() => {
    report = analyzeWilliamsCrossoverEvidence(evidence);
  });
  assert.equal(report.decision.status, "invalid-experiment");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(report.decision.invalidReasons.includes("block-01.telemetry.post.missing"));
});

test("telemetry admission enforces phase, ordering, CPU, frequency, memory, and power regimes", () => {
  const cases = [
    {
      reason: "block-01.telemetry.pre.schemaVersion",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.schemaVersion = 2; },
    },
    {
      reason: "block-01.telemetry.pre.priming.missing",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming = null; },
    },
    {
      reason: "block-01.telemetry.pre.priming.captureCount",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.captureCount = 2; },
    },
    {
      reason: "block-01.telemetry.pre.priming.captureCount",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.captureCount = true; },
    },
    {
      reason: "block-01.telemetry.pre.priming.status",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.status = "failed"; },
    },
    {
      reason: "block-01.telemetry.pre.priming.admissionRole",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.admissionRole = "measured"; },
    },
    {
      reason: "block-01.telemetry.pre.priming.startedAt",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.startedAt = "invalid"; },
    },
    {
      reason: "block-01.telemetry.pre.priming.completedAt",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.completedAt = "invalid"; },
    },
    {
      reason: "block-01.telemetry.pre.priming.captureDurationMs",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.priming.captureDurationMs = -1; },
    },
    {
      reason: "block-01.telemetry.pre.priming.first-sample-interval",
      mutate: (evidence) => {
        evidence.blocks[0].telemetry.pre.priming.completedAt = evidence.blocks[0].telemetry.pre.samples[0].at;
      },
    },
    {
      reason: "block-01.telemetry.pre.phase",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.phase = "post"; },
    },
    {
      reason: "block-01.telemetry.pre.sampling.scheduler",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.sampling.scheduler = "fixed-delay"; },
    },
    {
      reason: "block-01.telemetry.pre.sampling.timestampSemantics",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.sampling.timestampSemantics = "capture-complete"; },
    },
    {
      reason: "block-01.telemetry.pre.sampling.sampleIntervalMs",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.sampling.sampleIntervalMs = 1200; },
    },
    {
      reason: "block-01.telemetry.pre.sampling.sampleCount",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.sampling.sampleCount = 4; },
    },
    {
      reason: "block-01.telemetry.pre.samples.expected-5-actual-4",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples.pop(); },
    },
    {
      reason: "block-01.telemetry.pre.samples.timestamp-order",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[1].at = evidence.blocks[0].telemetry.pre.samples[0].at; },
    },
    {
      reason: "block-01.telemetry.pre.samples.interval",
      mutate: (evidence) => {
        const first = Date.parse(evidence.blocks[0].telemetry.pre.samples[0].at);
        evidence.blocks[0].telemetry.pre.samples[1].at = new Date(first + 100).toISOString();
      },
    },
    {
      reason: "block-01.telemetry.pre.samples.0.performanceAdjustedFrequencyMHz.formula",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[0].performanceAdjustedFrequencyMHz = 4100; },
    },
    {
      reason: "block-01.telemetry.pre.samples.0.completedAt",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[0].completedAt = "invalid"; },
    },
    {
      reason: "block-01.telemetry.pre.samples.0.completedAt",
      mutate: (evidence) => {
        evidence.blocks[0].telemetry.pre.samples[0].completedAt = new Date(
          Date.parse(evidence.blocks[0].telemetry.pre.samples[0].at) - 1,
        ).toISOString();
      },
    },
    {
      reason: "block-01.telemetry.pre.samples.0.captureDurationMs",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[0].captureDurationMs = -1; },
    },
    {
      reason: "block-01.telemetry.pre.samples.4.captureDurationMs.max",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[4].captureDurationMs = 3617; },
    },
    {
      reason: "block-01.telemetry.pre.samples.0.scheduleLagMs",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[0].scheduleLagMs = null; },
    },
    {
      reason: "block-01.telemetry.pre.samples.4.scheduleLagMs.max",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.samples[4].scheduleLagMs = 251; },
    },
    {
      reason: "block-01.telemetry.pre.capability.missing",
      mutate: (evidence) => { evidence.blocks[0].telemetry.pre.capability.missing = ["counter"]; },
    },
    {
      reason: "block-01.telemetry.pre.cpu-average",
      mutate: (evidence) => evidence.blocks[0].telemetry.pre.samples.forEach((sample) => { sample.cpuUtilizationPercent = 30; }),
    },
    {
      reason: "telemetry.pair-01-02.pre-cpu-difference",
      mutate: (evidence) => evidence.blocks[1].telemetry.pre.samples.forEach((sample) => { sample.cpuUtilizationPercent = 24; }),
    },
    {
      reason: "telemetry.pair-01-02.pre-frequency-difference",
      mutate: (evidence) => evidence.blocks[1].telemetry.pre.samples.forEach((sample) => { sample.performanceAdjustedFrequencyMHz = 3900; }),
    },
    {
      reason: "telemetry.global.pre-frequency-drift",
      mutate: (evidence) => evidence.blocks[7].telemetry.pre.samples.forEach((sample) => { sample.performanceAdjustedFrequencyMHz = 3600; }),
    },
    {
      reason: "telemetry.pair-01-02.pre-memory-difference",
      mutate: (evidence) => evidence.blocks[1].telemetry.pre.samples.forEach((sample) => { sample.memoryAvailableMBytes = 14000; }),
    },
    {
      reason: "block-01.telemetry.memory-within-block",
      mutate: (evidence) => evidence.blocks[0].telemetry.post.samples.forEach((sample) => { sample.memoryAvailableMBytes = 14000; }),
    },
    {
      reason: "telemetry.environment.powerSchemeGuid.consistency",
      mutate: (evidence) => { evidence.blocks[2].telemetry.pre.environment.power.activeSchemeGuid = "11111111-1111-1111-1111-111111111111"; },
    },
    {
      reason: "telemetry.environment.acLineStatus.consistency",
      mutate: (evidence) => { evidence.blocks[2].telemetry.pre.environment.power.acLineStatus = 0; },
    },
    {
      reason: "block-01.telemetry.pre.environment.power.acLineStatus.ac-required",
      mutate: (evidence) => evidence.blocks.forEach((block) => {
        block.telemetry.pre.environment.power.acLineStatus = 0;
        block.telemetry.post.environment.power.acLineStatus = 0;
      }),
    },
    {
      reason: "block-01.telemetry.pre.environment.power.activeSchemeGuid.expected",
      mutate: (evidence) => {
        evidence.blocks[0].telemetry.pre.environment.power.activeSchemeGuid = "11111111-1111-1111-1111-111111111111";
      },
    },
  ];
  for (const testCase of cases) {
    const evidence = createEvidence();
    testCase.mutate(evidence);
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, testCase.reason);
    assert.ok(report.decision.invalidReasons.includes(testCase.reason), testCase.reason);
  }
});

test("Williams pre-block standard perf admission preserves standard policy parity and writes before workload spawn", async (t) => {
  const outputRoot = await makeRuntimeTemp("williams-pre-block-standard-admission-");
  t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
  const evidence = standardPerfAdmissionEvidence();
  const artifactPath = path.join(outputRoot, "parity", "pre-block-standard-perf-admission.json");
  const decision = await runWilliamsPreBlockAdmission({
    worktree: CONTROL_WORKTREE,
    artifactPath,
    collectEvidence: async ({ cwd }) => {
      assert.equal(cwd, CONTROL_WORKTREE);
      return evidence;
    },
  });
  const expected = evaluateStandardPerfAdmission(evidence, STANDARD_PERF_ADMISSION_POLICY);
  assert.deepEqual(decision, expected);
  assert.deepEqual(JSON.parse(await fs.readFile(artifactPath, "utf8")), expected);
  assert.equal(decision.status, "admitted");
  assert.equal(decision.exitCode, STANDARD_PERF_ADMISSION_EXIT_CODES.accepted);
  assert.deepEqual(decision.thresholds, STANDARD_PERF_ADMISSION_POLICY);

  const directory = path.join(outputRoot, "accepted-block");
  const command = { bin: process.execPath, args: ["--version"] };
  const events = [];
  let telemetryCount = 0;
  let workloadSpawnCount = 0;
  let preparationCount = 0;
  const result = await runWilliamsBlockWithTestAdapters({
    block: {
      ordinal: 1,
      id: "block-01",
      side: "A",
      orderId: "tno-hoi4",
      scenarioOrder: ["tno_1962", "hoi4_1939"],
      cwd: CONTROL_WORKTREE,
      expectedHead: CONTROL_HEAD,
      directory,
      command,
    },
    packageLock: {},
    lazyPreparationAuthority: async ({ admission, validation }) => {
      const persistedAdmission = JSON.parse(await fs.readFile(
        path.join(directory, "pre-block-standard-perf-admission.json"),
        "utf8",
      ));
      assert.deepEqual(persistedAdmission, admission);
      assert.equal(validation.valid, true);
      assert.equal(preparationCount, 0);
      preparationCount += 1;
      events.push("job-preparation");
      return { harnessArtifacts: {}, preparedRunner: {}, packageLock: {} };
    },
  }, {
    collectBlockIdentity: async () => ({ actualHead: CONTROL_HEAD }),
    collectAdmissionEvidence: async () => {
      events.push("standard-admission-collected");
      return evidence;
    },
    collectTelemetry: async () => {
      telemetryCount += 1;
      events.push(`telemetry-${telemetryCount}`);
      return telemetryWindow(telemetryCount === 1 ? "pre" : "post", 1, CONTROL_WORKTREE, CONTROL_HEAD);
    },
    runLoggedCommand: async (_command, options) => {
      workloadSpawnCount += 1;
      events.push("workload-spawned");
      const persistedAdmission = JSON.parse(await fs.readFile(
        path.join(directory, "pre-block-standard-perf-admission.json"),
        "utf8",
      ));
      assert.equal(persistedAdmission.status, "admitted");
      const jobEvidence = jobObjectEvidence(4321, { command, cwd: CONTROL_WORKTREE });
      await writeJson(options.jobEvidencePath, jobEvidence);
      return {
        pid: 4321,
        exitCode: 0,
        timedOut: false,
        skipped: false,
        workloadSpawnCount: 1,
        taskOwnedTree: {
          rootPids: [4321],
          pids: [4321],
          processes: [],
          captureStatus: "available",
          captureErrors: [],
        },
        jobEvidence,
      };
    },
  });
  assert.equal(result.complete, true);
  assert.equal(result.blockResult.workloadSpawnCount, 1);
  assert.equal(preparationCount, 1);
  assert.equal(workloadSpawnCount, 1);
  assert.ok(events.indexOf("standard-admission-collected") < events.indexOf("job-preparation"));
  assert.ok(events.indexOf("job-preparation") < events.indexOf("workload-spawned"));
  assert.ok(events.indexOf("standard-admission-collected") < events.indexOf("workload-spawned"));
  assert.ok(events.indexOf("telemetry-1") < events.indexOf("workload-spawned"));
});

test("Williams pre-block standard perf admission rejects every governed resource dimension with zero workload spawn", async (t) => {
  const outputRoot = await makeRuntimeTemp("williams-pre-block-standard-rejections-");
  t.after(() => fs.rm(outputRoot, { recursive: true, force: true }));
  const cases = [
    {
      label: "average CPU",
      failureCode: "cpu-average-high",
      mutate: (evidence) => { evidence.cpuSamples = Array(7).fill(21); },
    },
    {
      label: "peak CPU",
      failureCode: "cpu-peak-high",
      mutate: (evidence) => { evidence.cpuSamples = [36, 10, 10, 10, 10, 10, 10]; },
    },
    {
      label: "top process",
      failureCode: "top-process-high",
      mutate: (evidence) => { evidence.topProcesses[0].singleCorePercent = 25.1; },
    },
    {
      label: "available memory",
      failureCode: "memory-available-low",
      mutate: (evidence) => { evidence.memoryAvailableMiB = 4095.9; },
    },
    {
      label: "power",
      failureCode: "windows-power-evidence-unavailable",
      mutate: (evidence) => { evidence.power.status = "collection-error"; },
    },
    {
      label: "Git",
      failureCode: "dirty-measurement-harness",
      mutate: (evidence) => {
        evidence.git.entries = [{ status: " M", paths: ["tools/perf/run_baseline.mjs"], malformed: false }];
      },
    },
  ];

  for (const [index, testCase] of cases.entries()) {
    const evidence = structuredClone(standardPerfAdmissionEvidence());
    testCase.mutate(evidence);
    const directory = path.join(outputRoot, `case-${index + 1}`);
    const command = { bin: process.execPath, args: ["--version"] };
    let telemetryCount = 0;
    let workloadSpawnCount = 0;
    let preparationCount = 0;
    const result = await runWilliamsBlockWithTestAdapters({
      block: {
        ordinal: 1,
        id: "block-01",
        side: "A",
        orderId: "tno-hoi4",
        scenarioOrder: ["tno_1962", "hoi4_1939"],
        cwd: CONTROL_WORKTREE,
        expectedHead: CONTROL_HEAD,
        directory,
        command,
      },
      packageLock: {},
      lazyPreparationAuthority: async () => {
        preparationCount += 1;
        throw new Error("Job preparation must stay unreachable after standard admission rejection");
      },
    }, {
      collectBlockIdentity: async () => ({ actualHead: CONTROL_HEAD }),
      collectAdmissionEvidence: async () => evidence,
      collectTelemetry: async () => {
        telemetryCount += 1;
        return telemetryWindow(telemetryCount === 1 ? "pre" : "post", 1, CONTROL_WORKTREE, CONTROL_HEAD);
      },
      runLoggedCommand: async () => {
        workloadSpawnCount += 1;
        throw new Error("workload spawn must stay unreachable after standard admission rejection");
      },
    });
    const admission = JSON.parse(await fs.readFile(
      path.join(directory, "pre-block-standard-perf-admission.json"),
      "utf8",
    ));
    const cleanup = JSON.parse(await fs.readFile(path.join(directory, "cleanup.json"), "utf8"));
    const jobEvidence = JSON.parse(await fs.readFile(path.join(directory, "job-object.json"), "utf8"));
    assert.equal(result.complete, false, testCase.label);
    assert.equal(result.blockResult.status, "invalid", testCase.label);
    assert.equal(result.blockResult.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, testCase.label);
    assert.equal(result.blockResult.workloadSpawnCount, 0, testCase.label);
    assert.equal(result.blockResult.skipReason, "standard-perf-admission-rejected", testCase.label);
    assert.equal(preparationCount, 0, testCase.label);
    assert.equal(workloadSpawnCount, 0, testCase.label);
    assert.equal(admission.status, "rejected", testCase.label);
    assert.equal(admission.exitCode, STANDARD_PERF_ADMISSION_EXIT_CODES.admissionRejected, testCase.label);
    assert.ok(admission.failures.some((failure) => failure.code === testCase.failureCode), testCase.label);
    assert.equal(cleanup.valid, true, testCase.label);
    assert.equal(cleanup.workloadSpawnCount, 0, testCase.label);
    assert.equal(cleanup.workloadStarted, false, testCase.label);
    assert.equal(cleanup.cleanupRequired, false, testCase.label);
    assert.equal(cleanup.terminationSucceeded, true, testCase.label);
    assert.deepEqual(cleanup.taskOwnedPidsRemaining, [], testCase.label);
    assert.equal(jobEvidence.status, "not-started", testCase.label);
    assert.equal(jobEvidence.workloadSpawnCount, 0, testCase.label);
    assert.equal(jobEvidence.cleanupValid, true, testCase.label);
  }

  const collectionFailureDirectory = path.join(outputRoot, "collection-failure");
  let collectionFailureTelemetryCount = 0;
  let collectionFailureSpawnCount = 0;
  let collectionFailurePreparationCount = 0;
  const collectionFailureResult = await runWilliamsBlockWithTestAdapters({
    block: {
      ordinal: 1,
      id: "block-01",
      side: "A",
      orderId: "tno-hoi4",
      scenarioOrder: ["tno_1962", "hoi4_1939"],
      cwd: CONTROL_WORKTREE,
      expectedHead: CONTROL_HEAD,
      directory: collectionFailureDirectory,
      command: { bin: process.execPath, args: ["--version"] },
    },
    packageLock: {},
    lazyPreparationAuthority: async () => {
      collectionFailurePreparationCount += 1;
      throw new Error("Job preparation must stay unreachable after collection failure");
    },
  }, {
    collectBlockIdentity: async () => ({ actualHead: CONTROL_HEAD }),
    collectAdmissionEvidence: async () => { throw new Error("collector unavailable"); },
    collectTelemetry: async () => {
      collectionFailureTelemetryCount += 1;
      return telemetryWindow(
        collectionFailureTelemetryCount === 1 ? "pre" : "post",
        1,
        CONTROL_WORKTREE,
        CONTROL_HEAD,
      );
    },
    runLoggedCommand: async () => {
      collectionFailureSpawnCount += 1;
      throw new Error("collection failure must stay fail closed");
    },
  });
  const collectionFailureAdmission = JSON.parse(await fs.readFile(
    path.join(collectionFailureDirectory, "pre-block-standard-perf-admission.json"),
    "utf8",
  ));
  assert.equal(collectionFailureResult.blockResult.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.equal(collectionFailureResult.blockResult.workloadSpawnCount, 0);
  assert.equal(collectionFailurePreparationCount, 0);
  assert.equal(collectionFailureSpawnCount, 0);
  assert.equal(collectionFailureAdmission.status, "rejected");
  assert.ok(collectionFailureAdmission.degradedCapabilities.includes("standard-perf-admission-collection"));
  assert.ok(collectionFailureAdmission.failures.some((failure) => failure.code === "cpu-samples-invalid"));

  const forgedDirectory = path.join(outputRoot, "forged-admitted-envelope");
  let forgedPreparationCount = 0;
  let forgedSpawnCount = 0;
  const forgedResult = await runWilliamsBlockWithTestAdapters({
    block: {
      ordinal: 1,
      id: "block-01",
      side: "A",
      orderId: "tno-hoi4",
      scenarioOrder: ["tno_1962", "hoi4_1939"],
      cwd: CONTROL_WORKTREE,
      expectedHead: CONTROL_HEAD,
      directory: forgedDirectory,
      command: { bin: process.execPath, args: ["--version"] },
    },
    packageLock: {},
    lazyPreparationAuthority: async () => {
      forgedPreparationCount += 1;
      throw new Error("Job preparation must stay unreachable after full validator rejection");
    },
  }, {
    collectBlockIdentity: async () => ({ actualHead: CONTROL_HEAD }),
    collectAdmissionEvidence: async () => standardPerfAdmissionEvidence({
      git: {
        status: "available",
        head: "b".repeat(40),
        entries: [],
        detail: "",
      },
    }),
    collectTelemetry: async ({ phase }) => telemetryWindow(
      phase,
      1,
      CONTROL_WORKTREE,
      CONTROL_HEAD,
    ),
    runLoggedCommand: async () => {
      forgedSpawnCount += 1;
      throw new Error("workload must stay unreachable after full validator rejection");
    },
  });
  assert.equal(forgedResult.preBlockAdmission.status, "admitted");
  assert.equal(forgedResult.standardPerfAdmissionValidation.valid, false);
  assert.ok(forgedResult.standardPerfAdmissionValidation.reasons.includes("git-evidence-invalid"));
  assert.equal(forgedResult.blockResult.skipReason, "standard-perf-admission-invalid");
  const forgedStderr = await fs.readFile(path.join(forgedDirectory, "runner.stderr.log"), "utf8");
  assert.match(forgedStderr, /standard-perf-admission-invalid/);
  assert.match(forgedStderr, /git-evidence-invalid/);
  assert.equal(forgedPreparationCount, 0);
  assert.equal(forgedSpawnCount, 0);
});

test("telemetry cadence is frozen in preregistration and rejects a fixed-delay window before workload admission", () => {
  const evidence = createEvidence();
  assert.equal(evidence.preregistration.telemetry.scheduler, "monotonic-fixed-rate");
  assert.equal(evidence.preregistration.telemetry.timestampSemantics, "actual-capture-start");
  assert.equal(evidence.preregistration.telemetry.windowSchemaVersion, 4);
  assert.equal(evidence.preregistration.telemetry.maxCaptureDurationMs, 1250);
  assert.equal(evidence.preregistration.telemetry.maxScheduleLagMs, 250);
  assert.deepEqual(evidence.preregistration.telemetry.priming, {
    captureCount: 1,
    timing: "before-sampling-stopwatch",
    admissionRole: "excluded-warmup",
    requiredEvidenceFields: ["status", "startedAt", "completedAt", "captureDurationMs"],
  });
  assert.deepEqual(evidence.preregistration.telemetry.requiredCaptureFields, [
    "completedAt",
    "captureDurationMs",
    "scheduleLagMs",
  ]);
  assert.deepEqual(evidence.preregistration.telemetry.requiredWindowFields, ["startedAt", "completedAt"]);

  const telemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  const validQuietWindow = deriveTestQuietWindow(telemetry);
  assert.equal(validQuietWindow.valid, true);
  assert.equal(validQuietWindow.telemetryCadence.valid, true);
  assert.deepEqual(validQuietWindow.telemetryCadence.intervalsMs, [1000, 1000, 1000, 1000]);
  const missingAdmissionWindow = deriveWilliamsQuietWindow(telemetry, null, {
    expectedGitHead: CONTROL_HEAD,
  });
  assert.equal(missingAdmissionWindow.valid, false);
  assert.equal(missingAdmissionWindow.standardPerfAdmissionValidation.valid, false);
  assert.ok(missingAdmissionWindow.standardPerfAdmissionValidation.reasons.includes("decision-envelope-invalid"));

  const firstAtMs = Date.parse(telemetry.samples[0].at);
  telemetry.samples.forEach((sample, index) => {
    const captureStartedAtMs = firstAtMs + index * 1635;
    sample.at = new Date(captureStartedAtMs).toISOString();
    sample.completedAt = new Date(captureStartedAtMs + sample.captureDurationMs).toISOString();
  });
  const quietWindow = deriveTestQuietWindow(telemetry);
  assert.equal(quietWindow.valid, false);
  assert.equal(quietWindow.telemetryCadence.valid, false);
  assert.ok(quietWindow.telemetryCadence.errors.includes("telemetry.samples.interval"));

  const incompleteWindow = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  incompleteWindow.completedAt = incompleteWindow.samples.at(-1).at;
  const incompleteQuietWindow = deriveTestQuietWindow(incompleteWindow);
  assert.equal(incompleteQuietWindow.valid, false);
  assert.ok(incompleteQuietWindow.telemetryCadence.errors.includes("telemetry.completedAt.sample-coverage"));
});

test("a long excluded WMI prime preserves strict measured cadence while a measured cold spike stays invalid", () => {
  const primedTelemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  primedTelemetry.priming.captureDurationMs = 3617;
  primedTelemetry.priming.startedAt = new Date(
    Date.parse(primedTelemetry.priming.completedAt) - 3617,
  ).toISOString();
  const primedQuietWindow = deriveTestQuietWindow(primedTelemetry);
  assert.equal(primedQuietWindow.valid, true);
  assert.deepEqual(primedQuietWindow.telemetryCadence.intervalsMs, [1000, 1000, 1000, 1000]);

  const measuredSpikeTelemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  const measuredIntervals = [3621, 629, 637, 654];
  let captureStartedAtMs = Date.parse(measuredSpikeTelemetry.samples[0].at);
  measuredSpikeTelemetry.samples[0].captureDurationMs = 3617;
  measuredSpikeTelemetry.samples[0].completedAt = new Date(captureStartedAtMs + 3617).toISOString();
  measuredIntervals.forEach((intervalMs, index) => {
    captureStartedAtMs += intervalMs;
    measuredSpikeTelemetry.samples[index + 1].at = new Date(captureStartedAtMs).toISOString();
    measuredSpikeTelemetry.samples[index + 1].completedAt = new Date(captureStartedAtMs + 650).toISOString();
  });
  const measuredSpikeQuietWindow = deriveTestQuietWindow(measuredSpikeTelemetry);
  assert.equal(measuredSpikeQuietWindow.valid, false);
  assert.ok(measuredSpikeQuietWindow.telemetryCadence.errors.includes("telemetry.samples.interval"));
});

test("dirty or attached measurement worktrees invalidate identity", () => {
  const evidence = createEvidence();
  evidence.blocks[2].identity.detached = false;
  evidence.blocks[2].identity.gitStatus = " M tracked-file";
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.includes("block-03.identity.detached"));
  assert.ok(report.decision.invalidReasons.includes("block-03.identity.gitStatus"));
});

test("missing preregistration remains a typed invalid experiment report", () => {
  const evidence = createEvidence();
  evidence.preregistration = null;
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(report.decision.invalidReasons.includes("preregistration.policyId"));
  assert.ok(report.decision.invalidReasons.includes("preregistration.control.head"));
});

test("preregistration drift in thresholds or pair topology invalidates the report", () => {
  const evidence = createEvidence();
  evidence.preregistration.thresholds.startup.percent = 4;
  evidence.preregistration.adjacentPairs[1].candidateOrdinal = 4;
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.includes("preregistration.thresholds"));
  assert.ok(report.decision.invalidReasons.includes("preregistration.adjacentPairs"));
});

test("every preregistered admission surface is exact and field drift is invalid", () => {
  const cases = [
    ["policyId", (_value, preregistration) => { preregistration.policyId = "p2-williams-crossover-v3"; }],
    ["renderSampleRolePolicyId", (_value, preregistration) => { preregistration.renderSampleRolePolicyId = "render-sample-role-v1"; }],
    ["generatedAt", (_value, preregistration) => { preregistration.generatedAt = "invalid"; }],
    ["scenarios", (value) => value.reverse()],
    ["primaryEstimator", (_value, preregistration) => { preregistration.primaryEstimator = "mean"; }],
    ["blockEstimator", (_value, preregistration) => { preregistration.blockEstimator = "mean"; }],
    ["pairRegressionPolicy", (value) => { value.oneOfFour = "accepted"; }],
    ["sequence", (value) => { value[0].side = "B"; }],
    ["adjacentPairs", (value) => { value[0].delta = "A-B"; }],
    ["driftPairs", (value) => { value[0].secondOrdinal = 7; }],
    ["thresholds", (value) => { value.telemetry.preBlockAverageCpuPercentMax = 26; }],
    ["telemetry", (value) => { value.preSamplesPerBlock = 4; }],
    ["workloadContract", (value) => { value.bindAcrossSidesAndBlocks = false; }],
    ["rawContract", (value) => { value.manifestEntrySet = "subset"; }],
    ["exitCodes", (value) => { value.invalidExperiment = 1; }],
  ];
  for (const [field, mutate] of cases) {
    const evidence = createEvidence();
    mutate(evidence.preregistration[field], evidence.preregistration);
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, field);
    assert.ok(report.decision.invalidReasons.some((reason) => reason.startsWith(`preregistration.${field}`)), field);
  }
});

test("recomputed canonical role is authoritative and raw summary mismatch is invalid", () => {
  const evidence = createEvidence();
  evidence.blocks[0].rawRuns.tno_1962[0].summary.canonicalRenderSampleMs = 1;
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(report.decision.invalidReasons.includes("block-01.tno_1962.run-1.canonicalRenderSummaryMismatch"));
  assert.equal(report.blocks[0].scenarios.tno_1962.canonicalRender.values[0], 1000);
});

test("stale render-sample role policy evidence fails closed", () => {
  const evidence = createEvidence();
  evidence.blocks[0].baseline.scenarios.tno_1962.renderSampleRoleSummary.policyId = "render-sample-role-v1";
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(report.decision.invalidReasons.includes("block-01.tno_1962.baselineRoleSummary.policyId"));
});

test("workload identity binds manifest, feature count, sample role, runs, warmups, and URL query across blocks", () => {
  const mutations = [
    ["manifestSha256", "3".repeat(64)],
    ["featureCount", 9999],
    ["sampleRole", "observation"],
    ["runs", 3],
    ["warmups", 2],
  ];
  for (const [field, value] of mutations) {
    const evidence = createEvidence();
    evidence.blocks[4].baseline.workloadIdentity.scenarios.tno_1962[field] = value;
    evidence.blocks[4].baseline.scenarios.tno_1962.workloadIdentity[field] = value;
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, field);
    assert.ok(report.decision.invalidReasons.some((reason) => reason.includes(`workloadIdentity.tno_1962`)), field);
  }
  const queryEvidence = createEvidence();
  queryEvidence.blocks[4].baseline.workloadIdentity.urlQuery.perf = "0";
  const queryReport = analyzeWilliamsCrossoverEvidence(queryEvidence);
  assert.equal(queryReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(queryReport.decision.invalidReasons.includes("block-05.baseline.workloadIdentity.urlQuery"));

  const globalQueryEvidence = createEvidence();
  for (const block of globalQueryEvidence.blocks) {
    block.baseline.config.urlQuery.perf = 0;
    block.baseline.workloadIdentity.urlQuery.perf = 0;
    for (const scenarioId of WILLIAMS_SCENARIOS) {
      block.baseline.workloadIdentity.scenarios[scenarioId].urlQuery.perf = 0;
      block.baseline.scenarios[scenarioId].workloadIdentity.urlQuery.perf = 0;
    }
  }
  const globalQueryReport = analyzeWilliamsCrossoverEvidence(globalQueryEvidence);
  assert.ok(globalQueryReport.decision.invalidReasons.includes("block-01.baseline.config.urlQuery.canonical"));

  const globalManifestEvidence = createEvidence();
  for (const block of globalManifestEvidence.blocks) {
    block.baseline.workloadIdentity.scenarios.tno_1962.manifestPath = "wrong/manifest.json";
    block.baseline.scenarios.tno_1962.workloadIdentity.manifestPath = "wrong/manifest.json";
  }
  const globalManifestReport = analyzeWilliamsCrossoverEvidence(globalManifestEvidence);
  assert.ok(globalManifestReport.decision.invalidReasons.includes("block-01.baseline.workloadIdentity.tno_1962.manifestPath"));

  const nestedMismatchEvidence = createEvidence();
  nestedMismatchEvidence.blocks[0].baseline.scenarios.tno_1962.workloadIdentity.featureCount = 1234;
  const nestedMismatchReport = analyzeWilliamsCrossoverEvidence(nestedMismatchEvidence);
  assert.ok(nestedMismatchReport.decision.invalidReasons.includes("block-01.baseline.workloadIdentity.tno_1962.reportScenarioMismatch"));
});

test("CLI defaults to list and the plan keeps live execution explicit", () => {
  const options = parseWilliamsArgs([]);
  assert.equal(options.mode, "list");
  const plan = buildWilliamsExecutionPlan({
    ...options,
    controlHead: CONTROL_HEAD,
    candidateHead: CANDIDATE_HEAD,
    controlWorktree: CONTROL_WORKTREE,
    candidateWorktree: CANDIDATE_WORKTREE,
  });
  assert.equal(plan.blocks.length, 8);
  assert.deepEqual(plan.blocks[2].command, {
    bin: process.execPath,
    args: [
      path.join(CANDIDATE_WORKTREE, "tools", "perf", "run_baseline.mjs"),
      "--measured-repo-root", CANDIDATE_WORKTREE,
      "--mode", "baseline",
      "--scenarios", "hoi4_1939,tno_1962",
      "--runs", "2",
      "--warmups", "1",
      "--render-sample-run-profile", "p2-williams-crossover-v7",
      "--baseline-json", path.join(plan.blocks[2].directory, "baseline.json"),
      "--baseline-md", path.join(plan.blocks[2].directory, "baseline.md"),
      "--raw-dir", path.join(plan.blocks[2].directory, "raw"),
    ],
  });

  const powerBoundOptions = parseWilliamsArgs([
    "--expected-power-scheme-guid",
    EXPECTED_POWER_SCHEME_GUID.toUpperCase(),
  ]);
  const powerBoundPlan = buildWilliamsExecutionPlan({
    ...powerBoundOptions,
    controlHead: CONTROL_HEAD,
    candidateHead: CANDIDATE_HEAD,
    controlWorktree: CONTROL_WORKTREE,
    candidateWorktree: CANDIDATE_WORKTREE,
  });
  assert.equal(powerBoundOptions.expectedPowerSchemeGuid, EXPECTED_POWER_SCHEME_GUID);
  assert.equal(powerBoundPlan.preregistration.telemetry.expectedPowerSchemeGuid, EXPECTED_POWER_SCHEME_GUID);

  const envelopePlan = buildWilliamsExecutionPlan({
    rawRoot: EVIDENCE_RAW_ROOT,
    controlWorktree: "C:\\untrusted\\control",
    controlHead: "e".repeat(40),
    candidateWorktree: "C:\\untrusted\\candidate",
    candidateHead: "f".repeat(40),
    trustedRevisionIdentity: trustedRevisionIdentity(),
  });
  assert.deepEqual(envelopePlan.preregistration.control, {
    side: "A",
    head: CONTROL_HEAD,
    worktree: CONTROL_WORKTREE,
  });
  assert.deepEqual(envelopePlan.preregistration.candidate, {
    side: "B",
    head: CANDIDATE_HEAD,
    worktree: CANDIDATE_WORKTREE,
  });
  assert.equal(envelopePlan.blocks[0].command.args[0], path.join(
    CANDIDATE_WORKTREE,
    "tools",
    "perf",
    "run_baseline.mjs",
  ));
});

test("analyze consumes a complete external trusted revision identity and rejects missing or local drift", async () => {
  const rawRoot = path.join(RUNTIME_TMP_ROOT, "williams-trusted-revision-cli");
  const baseOptions = parseWilliamsArgs([
    "--analyze",
    "--raw-root", rawRoot,
    "--json-out", `${rawRoot}.json`,
    "--md-out", `${rawRoot}.md`,
    "--control-worktree", CONTROL_WORKTREE,
    "--control-head", CONTROL_HEAD,
    "--candidate-worktree", CANDIDATE_WORKTREE,
    "--candidate-head", CANDIDATE_HEAD,
  ]);
  assert.deepEqual(buildWilliamsTrustedRevisionIdentity(baseOptions), trustedRevisionIdentity());

  for (const field of ["controlWorktree", "controlHead", "candidateWorktree", "candidateHead"]) {
    await assert.rejects(
      runWilliamsCli({ ...baseOptions, [field]: "" }),
      (error) => error instanceof WilliamsInvalidExperimentError
        && getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment,
      field,
    );
  }
  for (const drift of [
    { candidateWorktree: path.join(REPO_ROOT, "substituted-candidate") },
    { candidateHead: "f".repeat(40) },
    { trustedAnalyzerRoot: path.dirname(REPO_ROOT) },
  ]) {
    assert.throws(
      () => buildWilliamsTrustedRevisionIdentity({ ...baseOptions, ...drift }),
      (error) => error instanceof WilliamsInvalidExperimentError
        && getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment,
    );
  }
});

test("Williams analyzer rejects missing, substituted, and mixed run-profile identity", () => {
  const cases = [
    ["missing policy profile", (evidence) => { delete evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile; }],
    ["unknown policy profile", (evidence) => { evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile.id = "unknown-profile"; }],
    ["standard profile substitution", (evidence) => {
      evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile.id = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["report profile drift", (evidence) => {
      evidence.blocks[0].baseline.workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["report-scenario profile drift", (evidence) => {
      evidence.blocks[0].baseline.workloadIdentity.scenarios.tno_1962.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["scenario profile drift", (evidence) => {
      evidence.blocks[0].baseline.scenarios.tno_1962.workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
  ];
  for (const [label, mutate] of cases) {
    const evidence = createEvidence();
    mutate(evidence);
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.status, "invalid-experiment", label);
  }
});

test("shared Williams measurement harness uses one absolute candidate runner for both measured worktrees", () => {
  const plan = buildWilliamsExecutionPlan({
    ...parseWilliamsArgs([]),
    controlHead: CONTROL_HEAD,
    candidateHead: CANDIDATE_HEAD,
    controlWorktree: CONTROL_WORKTREE,
    candidateWorktree: CANDIDATE_WORKTREE,
  });
  const sharedRunner = path.join(CANDIDATE_WORKTREE, "tools", "perf", "run_baseline.mjs");
  for (const block of plan.blocks) {
    const measuredRoot = block.side === "A" ? CONTROL_WORKTREE : CANDIDATE_WORKTREE;
    assert.equal(block.command.args[0], sharedRunner);
    const measuredRootFlag = block.command.args.indexOf("--measured-repo-root");
    assert.ok(measuredRootFlag > 0);
    assert.equal(block.command.args[measuredRootFlag + 1], measuredRoot);
  }

  const sharedRunnerDescriptor = artifactDescriptor("tools/perf/run_baseline.mjs");
  const sharedRolePolicyDescriptor = artifactDescriptor("tools/perf/render_sample_role_policy.mjs");
  const harnessArtifacts = { runner: sharedRunnerDescriptor, rolePolicy: sharedRolePolicyDescriptor };
  const controlArtifacts = buildWilliamsBlockArtifactIdentity(
    { ...artifactDescriptor("package-lock.json"), gitBlob: "a".repeat(40) },
    harnessArtifacts,
  );
  const candidateArtifacts = buildWilliamsBlockArtifactIdentity(
    { ...artifactDescriptor("package-lock.json"), gitBlob: "b".repeat(40) },
    harnessArtifacts,
  );
  assert.notEqual(controlArtifacts.packageLock.gitBlob, candidateArtifacts.packageLock.gitBlob);
  assert.deepEqual(controlArtifacts.runner, candidateArtifacts.runner);
  assert.deepEqual(controlArtifacts.rolePolicy, candidateArtifacts.rolePolicy);
});

test("Williams authority rejects harness-root and shared runner identity drift", () => {
  const rootDrift = createEvidence();
  rootDrift.blocks[0].identity.harnessRoot = CONTROL_WORKTREE;
  const rootReport = analyzeWilliamsCrossoverEvidence(rootDrift);
  assert.ok(rootReport.decision.invalidReasons.includes("block-01.identity.harnessRoot"));

  const runnerDrift = createEvidence();
  runnerDrift.blocks[1].identity = {
    ...runnerDrift.blocks[1].identity,
    artifacts: {
      ...runnerDrift.blocks[1].identity.artifacts,
      runner: {
        ...runnerDrift.blocks[1].identity.artifacts.runner,
        gitBlob: "e".repeat(40),
      },
    },
  };
  assert.notDeepEqual(
    runnerDrift.blocks[0].identity.artifacts.runner,
    runnerDrift.blocks[1].identity.artifacts.runner,
  );
  const runnerReport = analyzeWilliamsCrossoverEvidence(runnerDrift);
  assert.ok(
    runnerReport.decision.invalidReasons.includes("block-02.identity.crossBlock.runner"),
    JSON.stringify(runnerReport.decision.invalidReasons),
  );

  const rolePolicyDrift = createEvidence();
  rolePolicyDrift.blocks[1].identity = {
    ...rolePolicyDrift.blocks[1].identity,
    artifacts: {
      ...rolePolicyDrift.blocks[1].identity.artifacts,
      rolePolicy: {
        ...rolePolicyDrift.blocks[1].identity.artifacts.rolePolicy,
        lfNormalizedSha256: "e".repeat(64),
      },
    },
  };
  const rolePolicyReport = analyzeWilliamsCrossoverEvidence(rolePolicyDrift);
  assert.ok(rolePolicyReport.decision.invalidReasons.includes("block-02.identity.crossBlock.rolePolicy"));

  const standardAdmissionDrift = createEvidence();
  standardAdmissionDrift.blocks[1].identity.artifacts.standardPerfAdmission.lfNormalizedSha256 = "e".repeat(64);
  const standardAdmissionReport = analyzeWilliamsCrossoverEvidence(standardAdmissionDrift);
  assert.ok(
    standardAdmissionReport.decision.invalidReasons.includes("block-02.identity.crossBlock.standardPerfAdmission"),
  );
});

test("Williams analyzer rejects self-consistent noncanonical block commands", () => {
  const rawRoot = path.join(REPO_ROOT, ".runtime", "tmp", "williams-command-authority");
  const removeOption = (args, option) => {
    const index = args.indexOf(option);
    assert.ok(index >= 0, `${option} must exist in the canonical fixture`);
    args.splice(index, 2);
  };
  const cases = [
    ["old control runner", (command) => {
      command.args[0] = path.join(CONTROL_WORKTREE, "tools", "perf", "run_baseline.mjs");
    }],
    ["missing measured root", (command) => removeOption(command.args, "--measured-repo-root")],
    ["missing Williams profile", (command) => removeOption(command.args, "--render-sample-run-profile")],
    ["missing baseline JSON", (command) => removeOption(command.args, "--baseline-json")],
    ["missing baseline MD", (command) => removeOption(command.args, "--baseline-md")],
    ["missing raw output", (command) => removeOption(command.args, "--raw-dir")],
    ["extra argument", (command) => command.args.push("--write-markdown", "false")],
    ["argument reorder", (command) => {
      const runsIndex = command.args.indexOf("--runs");
      const runsPair = command.args.splice(runsIndex, 2);
      const warmupsIndex = command.args.indexOf("--warmups");
      command.args.splice(warmupsIndex + 2, 0, ...runsPair);
    }],
  ];

  for (const [label, mutate] of cases) {
    const evidence = createEvidence();
    evidence.rawRoot = rawRoot;
    const command = literalWilliamsCommand({
      rawRoot,
      blockId: "block-01",
      measuredWorktree: CONTROL_WORKTREE,
      scenarioOrder: ["tno_1962", "hoi4_1939"],
    });
    mutate(command);
    evidence.blocks[0].command = command;
    evidence.blocks[0].jobObject = jobObjectEvidence(4001, { command, cwd: CONTROL_WORKTREE });
    evidence.blocks[0].cleanup.jobObject = jobObjectEvidence(4001, { command, cwd: CONTROL_WORKTREE });
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, label);
    assert.ok(report.decision.invalidReasons.includes("block-01.command.canonical"), label);
  }
});

test("Williams analyzer rejects a self-consistent preregistered runtime substitution", () => {
  const evidence = createEvidence();
  const substitutedRuntime = "C:\\Windows\\System32\\cmd.exe";
  evidence.preregistration.workloadContract.command.nodeExecutablePath = substitutedRuntime;
  for (const block of evidence.blocks) {
    block.command.bin = substitutedRuntime;
    for (const jobEvidence of [block.jobObject, block.cleanup.jobObject]) {
      jobEvidence.commandExecutablePath = substitutedRuntime;
    }
  }
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(
    report.decision.invalidReasons.includes("preregistration.workloadContract.command.nodeExecutablePath"),
  );
});

test("raw-root analyzer rejects a manifest-valid runtime substitution", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const substitutedRuntime = "C:\\Windows\\System32\\cmd.exe";
  const preregistrationPath = path.join(root, "preregistration.json");
  const preregistration = JSON.parse(await fs.readFile(preregistrationPath, "utf8"));
  preregistration.workloadContract.command.nodeExecutablePath = substitutedRuntime;
  await writeJson(preregistrationPath, preregistration);

  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const directory = path.join(root, "blocks", block.id);
    const commandPath = path.join(directory, "command.json");
    const command = JSON.parse(await fs.readFile(commandPath, "utf8"));
    command.bin = substitutedRuntime;
    await writeJson(commandPath, command);

    const jobObjectPath = path.join(directory, "job-object.json");
    const jobObject = JSON.parse(await fs.readFile(jobObjectPath, "utf8"));
    jobObject.commandExecutablePath = substitutedRuntime;
    await writeJson(jobObjectPath, jobObject);

    const cleanupPath = path.join(directory, "cleanup.json");
    const cleanup = JSON.parse(await fs.readFile(cleanupPath, "utf8"));
    cleanup.jobObject.commandExecutablePath = substitutedRuntime;
    await writeJson(cleanupPath, cleanup);
  }

  const currentToolIdentity = await buildCurrentHarnessArtifacts();
  currentToolIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await fs.rm(path.join(root, "raw-sha256-manifest.json"));
  await buildWilliamsRawManifest(root, currentToolIdentity);
  const report = await analyzeTrustedRawRoot(root);
  assert.equal(report.manifestValidation.status, "valid");
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(
    report.decision.invalidReasons.includes("preregistration.workloadContract.command.nodeExecutablePath"),
  );
});

test("raw-root analyzer derives current tool identity and ignores caller substitution", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const currentToolIdentity = await buildCurrentHarnessArtifacts();
  currentToolIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  const substitutedToolIdentity = structuredClone(currentToolIdentity);
  substitutedToolIdentity.policy.lfNormalizedSha256 = "f".repeat(64);

  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const identityPath = path.join(root, "blocks", block.id, "identity.json");
    const identity = JSON.parse(await fs.readFile(identityPath, "utf8"));
    identity.artifacts.policy = structuredClone(substitutedToolIdentity.policy);
    await writeJson(identityPath, identity);
  }
  await fs.rm(path.join(root, "raw-sha256-manifest.json"));
  await buildWilliamsRawManifest(root, substitutedToolIdentity);

  const report = await analyzeWilliamsCrossoverRawRootWithTestAdapters(root, {
    trustedRevisionIdentity: trustedRevisionIdentity(),
    currentToolIdentity: substitutedToolIdentity,
    analyzerAuthorityAdapter: trustedAnalyzerAuthorityAdapter(),
  });
  assert.equal(report.manifestValidation.status, "invalid");
  assert.ok(report.manifestValidation.errors.includes("manifest.toolIdentity.policy.current"));
  assert.equal(report.decision.status, "invalid-experiment");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("raw-root analyzer rejects manifest-valid synchronized trusted revision substitutions", async (t) => {
  const cases = [
    [
      "candidate root",
      { candidateWorktree: "C:\\perf\\candidate-substituted" },
      "preregistration.candidate.worktree.trusted",
    ],
    [
      "candidate head",
      { candidateHead: "d".repeat(40) },
      "preregistration.candidate.head.trusted",
    ],
    [
      "control root",
      { controlWorktree: "C:\\perf\\control-substituted" },
      "preregistration.control.worktree.trusted",
    ],
    [
      "control head",
      { controlHead: "c".repeat(40) },
      "preregistration.control.head.trusted",
    ],
    [
      "combined control and candidate revision identity",
      {
        controlWorktree: "C:\\perf\\control-combined",
        controlHead: "c".repeat(40),
        candidateWorktree: "C:\\perf\\candidate-combined",
        candidateHead: "d".repeat(40),
      },
      "preregistration.candidate.worktree.trusted",
    ],
  ];
  const roots = [];
  t.after(() => Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true }))));

  for (const [label, mutation, expectedReason] of cases) {
    const root = await materializeEvidenceRoot(createEvidence());
    roots.push(root);
    await synchronizeRawRevisionEvidence(root, mutation);
    const report = await analyzeTrustedRawRoot(root);
    assert.equal(report.manifestValidation.status, "valid", label);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, label);
    assert.ok(report.decision.invalidReasons.includes(expectedReason), label);
  }
});

test("raw-root analyzer rejects missing, substituted, and mixed run-profile identity", async (t) => {
  const cases = [
    ["missing policy profile", (evidence) => { delete evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile; }],
    ["unknown policy profile", (evidence) => { evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile.id = "unknown-profile"; }],
    ["standard profile substitution", (evidence) => {
      evidence.blocks[0].baseline.renderSampleRolePolicy.runProfile.id = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["report profile drift", (evidence) => {
      evidence.blocks[0].baseline.workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["report-scenario profile drift", (evidence) => {
      evidence.blocks[0].baseline.workloadIdentity.scenarios.tno_1962.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
    ["scenario profile drift", (evidence) => {
      evidence.blocks[0].baseline.scenarios.tno_1962.workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
    }],
  ];
  const roots = [];
  t.after(() => Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true }))));
  for (const [label, mutate] of cases) {
    const evidence = createEvidence();
    mutate(evidence);
    const root = await materializeEvidenceRoot(evidence);
    roots.push(root);
    const report = await analyzeTrustedRawRoot(root);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.ok(
      report.decision.invalidReasons.some((reason) => reason.includes("renderSampleRunProfile") || reason.includes("runProfile")),
      `${label}: ${report.decision.invalidReasons.join("\n")}`,
    );
  }
});

test("raw-root command, Job, cleanup, profile, and workload mutations stay manifest-valid and fail typed admission", async (t) => {
  const removeOption = (args, option) => {
    const index = args.indexOf(option);
    assert.ok(index >= 0, `${option} must exist in the independent literal fixture`);
    args.splice(index, 2);
  };
  const commandCases = [
    ["old control runner", (command) => {
      command.args[0] = path.join(CONTROL_WORKTREE, "tools", "perf", "run_baseline.mjs");
    }],
    ["missing measured root", (command) => removeOption(command.args, "--measured-repo-root")],
    ["missing profile", (command) => removeOption(command.args, "--render-sample-run-profile")],
    ["missing JSON", (command) => removeOption(command.args, "--baseline-json")],
    ["missing MD", (command) => removeOption(command.args, "--baseline-md")],
    ["missing raw output", (command) => removeOption(command.args, "--raw-dir")],
    ["extra argument", (command) => command.args.push("--write-markdown", "false")],
    ["argument reorder", (command) => {
      const runsIndex = command.args.indexOf("--runs");
      const runsPair = command.args.splice(runsIndex, 2);
      const warmupsIndex = command.args.indexOf("--warmups");
      command.args.splice(warmupsIndex + 2, 0, ...runsPair);
    }],
  ];
  const roots = [];
  t.after(() => Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true }))));

  for (const [label, mutate] of commandCases) {
    const root = await materializeEvidenceRoot(createEvidence());
    roots.push(root);
    const directory = path.join(root, "blocks", "block-08");
    const command = literalWilliamsCommand({
      rawRoot: root,
      blockId: "block-08",
      measuredWorktree: CANDIDATE_WORKTREE,
      scenarioOrder: ["hoi4_1939", "tno_1962"],
    });
    mutate(command);
    await writeJson(path.join(directory, "command.json"), command);

    const jobObjectPath = path.join(directory, "job-object.json");
    const jobObject = JSON.parse(await fs.readFile(jobObjectPath, "utf8"));
    jobObject.commandExecutablePath = command.bin;
    jobObject.commandWorkingDirectory = CANDIDATE_WORKTREE;
    jobObject.commandArguments = [...command.args];
    await writeJson(jobObjectPath, jobObject);
    const cleanupPath = path.join(directory, "cleanup.json");
    const cleanup = JSON.parse(await fs.readFile(cleanupPath, "utf8"));
    cleanup.jobObject = structuredClone(jobObject);
    await writeJson(cleanupPath, cleanup);

    await rebuildRawManifest(root);
    const report = await analyzeTrustedRawRoot(root);
    assert.equal(report.manifestValidation.status, "valid", label);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, label);
    assert.ok(report.decision.invalidReasons.includes("block-08.command.canonical"), label);
  }

  for (const [label, mutate, expectedReason] of [
    [
      "block-08 profile drift",
      (baseline) => {
        baseline.renderSampleRolePolicy.runProfile.id = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
        baseline.workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
        for (const scenarioId of WILLIAMS_SCENARIOS) {
          baseline.workloadIdentity.scenarios[scenarioId].renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
          baseline.scenarios[scenarioId].workloadIdentity.renderSampleRunProfileId = STANDARD_PERF_RENDER_SAMPLE_RUN_PROFILE_ID;
        }
      },
      "block-08.baseline.renderSampleRolePolicy.runProfile.id",
    ],
    [
      "block-08 workload drift",
      (baseline) => {
        baseline.config.runs = 3;
        baseline.workloadIdentity.runs = 3;
        for (const scenarioId of WILLIAMS_SCENARIOS) {
          baseline.workloadIdentity.scenarios[scenarioId].runs = 3;
          baseline.scenarios[scenarioId].workloadIdentity.runs = 3;
        }
      },
      "block-08.baseline.config.runs",
    ],
  ]) {
    const root = await materializeEvidenceRoot(createEvidence());
    roots.push(root);
    const baselinePath = path.join(root, "blocks", "block-08", "baseline.json");
    const baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
    mutate(baseline);
    await writeJson(baselinePath, baseline);
    await rebuildRawManifest(root);
    const report = await analyzeTrustedRawRoot(root);
    assert.equal(report.manifestValidation.status, "valid", label);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, label);
    assert.ok(report.decision.invalidReasons.includes(expectedReason), label);
  }
});

test("Williams admission requires a cleaned power lifecycle covering every telemetry window", () => {
  const missing = createEvidence();
  missing.powerSchemeLifecycle = null;
  let report = analyzeWilliamsCrossoverEvidence(missing);
  assert.ok(report.decision.invalidReasons.includes("power-lifecycle.missing"));

  const unprovenCleanup = createEvidence();
  unprovenCleanup.powerSchemeLifecycle.cleanup.valid = false;
  unprovenCleanup.powerSchemeLifecycle.cleanup.absenceClassification = "query-failure-unclassified";
  report = analyzeWilliamsCrossoverEvidence(unprovenCleanup);
  assert.ok(report.decision.invalidReasons.includes("power-lifecycle.cleanup.valid"));
  assert.ok(report.decision.invalidReasons.includes("power-lifecycle.cleanup.absenceClassification"));

  const earlyRestore = createEvidence();
  const restore = earlyRestore.powerSchemeLifecycle.events.find((event) => event.action === "restore");
  restore.startedAt = "2026-07-11T00:00:01.000Z";
  report = analyzeWilliamsCrossoverEvidence(earlyRestore);
  assert.ok(report.decision.invalidReasons.some((reason) => reason.endsWith("power-lifecycle-window")));

  const idempotentRetry = createEvidence();
  idempotentRetry.powerSchemeLifecycle.events = idempotentRetry.powerSchemeLifecycle.events.filter(
    (event) => !["delete-temporary", "query-deleted"].includes(event.action),
  );
  const retryProbe = idempotentRetry.powerSchemeLifecycle.events.find(
    (event) => event.action === "query-temporary-before-delete",
  );
  retryProbe.exitCode = 1;
  idempotentRetry.powerSchemeLifecycle.cleanup.deletionPerformed = false;
  idempotentRetry.powerSchemeLifecycle.cleanup.alreadyAbsent = true;
  report = analyzeWilliamsCrossoverEvidence(idempotentRetry);
  assert.equal(report.decision.status, "accepted");
});

test("Williams admission binds preparation, activation, preregistration, telemetry, and restore time", () => {
  const probeAfterActivation = createEvidence();
  probeAfterActivation.jobRunnerPreparation.capabilityProbedAt = "2026-07-10T23:59:48.000Z";
  let report = analyzeWilliamsCrossoverEvidence(probeAfterActivation);
  assert.ok(report.decision.invalidReasons.includes("power-lifecycle.job-runner-order"));

  const preregistrationBeforeActivation = createEvidence();
  preregistrationBeforeActivation.preregistration.generatedAt = "2026-07-10T23:59:44.000Z";
  report = analyzeWilliamsCrossoverEvidence(preregistrationBeforeActivation);
  assert.ok(report.decision.invalidReasons.includes("power-lifecycle.preregistration-order"));

  const preregistrationAfterTelemetryStart = createEvidence();
  preregistrationAfterTelemetryStart.preregistration.generatedAt = "2026-07-11T00:00:00.000Z";
  report = analyzeWilliamsCrossoverEvidence(preregistrationAfterTelemetryStart);
  assert.ok(report.decision.invalidReasons.includes("telemetry.preregistration-order"));

  const telemetryStartsBeforeActivation = createEvidence();
  telemetryStartsBeforeActivation.blocks[0].telemetry.pre.startedAt = "2026-07-10T23:59:44.000Z";
  telemetryStartsBeforeActivation.blocks[0].telemetry.pre.priming.startedAt = "2026-07-10T23:59:44.100Z";
  report = analyzeWilliamsCrossoverEvidence(telemetryStartsBeforeActivation);
  assert.ok(report.decision.invalidReasons.includes("block-01.telemetry.pre.power-lifecycle-window"));

  const sampleCompletesAfterRestore = createEvidence();
  const finalPost = sampleCompletesAfterRestore.blocks.at(-1).telemetry.post;
  finalPost.samples.at(-1).completedAt = "2026-07-11T00:03:01.000Z";
  finalPost.completedAt = "2026-07-11T00:03:02.000Z";
  report = analyzeWilliamsCrossoverEvidence(sampleCompletesAfterRestore);
  assert.ok(report.decision.invalidReasons.includes("block-08.telemetry.post.power-lifecycle-window"));
});

test("power-scheme orchestration preallocates identity and cleans a journaled partial start", async () => {
  const runner = await import("../tools/perf/run_williams_crossover.mjs");
  assert.equal(typeof runner.startWilliamsPowerSchemeSession, "function");
  const generatedGuid = "12345678-1234-4234-8234-123456789abc";
  const successfulCalls = [];
  const started = await runner.startWilliamsPowerSchemeSession({
    helperPath: "power-helper.ps1",
    sessionPath: "power-session.json",
    randomUUIDFn: () => generatedGuid,
    invokeHelper: (options) => {
      successfulCalls.push(options);
      return { temporaryGuid: options.destinationGuid };
    },
  });
  assert.equal(started.expectedPowerSchemeGuid, generatedGuid);
  assert.equal(successfulCalls[0].destinationGuid, generatedGuid);

  const failedCalls = [];
  await assert.rejects(
    runner.startWilliamsPowerSchemeSession({
      helperPath: "power-helper.ps1",
      sessionPath: "power-session.json",
      randomUUIDFn: () => generatedGuid,
      pathExistsFn: async () => true,
      invokeHelper: (options) => {
        failedCalls.push(options);
        if (options.action === "start") {
          throw new WilliamsInvalidExperimentError("start timed out", "power-scheme-start-failed");
        }
        return { status: "cleaned" };
      },
    }),
    (error) => error instanceof WilliamsInvalidExperimentError && error.code === "power-scheme-start-failed",
  );
  assert.deepEqual(failedCalls.map((call) => call.action), ["start", "stop"]);
  assert.equal(failedCalls[0].destinationGuid, generatedGuid);
});

test("power-scheme stop replays the durable journal once after a transient failure", async () => {
  const runner = await import("../tools/perf/run_williams_crossover.mjs");
  assert.equal(typeof runner.stopWilliamsPowerSchemeSession, "function");
  const calls = [];
  const cleanup = await runner.stopWilliamsPowerSchemeSession({
    helperPath: "power-helper.ps1",
    sessionPath: "power-session.json",
    pathExistsFn: async () => true,
    invokeHelper: (options) => {
      calls.push(options.action);
      if (calls.length === 1) throw new Error("stop timed out");
      return { status: "cleaned", cleanup: { valid: true } };
    },
  });
  assert.deepEqual(calls, ["stop", "stop"]);
  assert.equal(cleanup.status, "cleaned");

  const missingJournalCalls = [];
  await assert.rejects(
    runner.stopWilliamsPowerSchemeSession({
      helperPath: "power-helper.ps1",
      sessionPath: "missing-session.json",
      pathExistsFn: async () => false,
      invokeHelper: (options) => {
        missingJournalCalls.push(options.action);
        throw new Error("stop failed without a journal");
      },
    }),
    /stop failed without a journal/,
  );
  assert.deepEqual(missingJournalCalls, ["stop"]);

  let failedReplayAttempt = 0;
  await assert.rejects(
    runner.stopWilliamsPowerSchemeSession({
      helperPath: "power-helper.ps1",
      sessionPath: "power-session.json",
      pathExistsFn: async () => true,
      invokeHelper: () => {
        failedReplayAttempt += 1;
        throw new Error(failedReplayAttempt === 1 ? "initial stop timed out" : "replay access denied");
      },
    }),
    (error) => (
      error instanceof WilliamsInvalidExperimentError
      && error.code === "power-scheme-stop-replay-failed"
      && error.message.includes("initial stop timed out")
      && error.message.includes("replay access denied")
    ),
  );
  assert.equal(failedReplayAttempt, 2);
});

test("power-scheme execution always stops the session and restores the process environment", async () => {
  const runner = await import("../tools/perf/run_williams_crossover.mjs");
  assert.equal(typeof runner.withWilliamsPowerSchemeSession, "function");
  const generatedGuid = "12345678-1234-4234-8234-123456789abc";
  const environment = { WILLIAMS_EXPECTED_POWER_SCHEME_GUID: "original-value" };
  const calls = [];
  await assert.rejects(
    runner.withWilliamsPowerSchemeSession({
      helperPath: "power-helper.ps1",
      sessionPath: "power-session.json",
      environment,
      randomUUIDFn: () => generatedGuid,
      invokeHelper: (options) => {
        calls.push(options.action);
        return options.action === "start" ? { temporaryGuid: options.destinationGuid } : { status: "cleaned" };
      },
      operation: async (expectedPowerSchemeGuid) => {
        assert.equal(expectedPowerSchemeGuid, generatedGuid);
        assert.equal(environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID, generatedGuid);
        throw new Error("workload failed");
      },
    }),
    /workload failed/,
  );
  assert.deepEqual(calls, ["start", "stop"]);
  assert.equal(environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID, "original-value");

  for (const stopFailureEnvironment of [
    { WILLIAMS_EXPECTED_POWER_SCHEME_GUID: "original-value" },
    {},
  ]) {
    const hadOriginalValue = "WILLIAMS_EXPECTED_POWER_SCHEME_GUID" in stopFailureEnvironment;
    await assert.rejects(
      runner.withWilliamsPowerSchemeSession({
        helperPath: "power-helper.ps1",
        sessionPath: "power-session.json",
        environment: stopFailureEnvironment,
        randomUUIDFn: () => generatedGuid,
        invokeHelper: (options) => {
          if (options.action === "stop") throw new Error("stop failed");
          return { temporaryGuid: options.destinationGuid };
        },
        operation: async () => "complete",
      }),
      /stop failed/,
    );
    if (hadOriginalValue) {
      assert.equal(stopFailureEnvironment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID, "original-value");
    } else {
      assert.equal("WILLIAMS_EXPECTED_POWER_SCHEME_GUID" in stopFailureEnvironment, false);
    }
  }

  await assert.rejects(
    runner.withWilliamsPowerSchemeSession({
      helperPath: "power-helper.ps1",
      sessionPath: "power-session.json",
      randomUUIDFn: () => generatedGuid,
      pathExistsFn: async () => true,
      invokeHelper: (options) => {
        if (options.action === "stop") throw new Error("cleanup timed out");
        return { temporaryGuid: options.destinationGuid };
      },
      operation: async () => {
        throw new Error("workload crashed");
      },
    }),
    (error) => (
      error instanceof WilliamsInvalidExperimentError
      && error.code === "power-scheme-operation-cleanup-failed"
      && error.message.includes("workload crashed")
      && error.message.includes("cleanup timed out")
    ),
  );
});

test("trusted analyzer rejects attached, dirty, byte-drifted, and changing checkout authority", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clean = { actualHead: CANDIDATE_HEAD, detached: true, branch: null, gitStatus: "" };
  const cases = [
    [
      "attached checkout",
      trustedAnalyzerAuthorityAdapter({
        snapshots: [{ ...clean, detached: false, branch: "codex/test" }],
      }),
    ],
    [
      "tracked dirty tool",
      trustedAnalyzerAuthorityAdapter({ snapshots: [{ ...clean, gitStatus: " M tools/perf/run_williams_crossover.mjs" }] }),
    ],
    [
      "index dirty tool",
      trustedAnalyzerAuthorityAdapter({ snapshots: [{ ...clean, gitStatus: "M  tools/perf/run_williams_crossover.mjs" }] }),
    ],
    [
      "untracked dirty tool",
      trustedAnalyzerAuthorityAdapter({ snapshots: [{ ...clean, gitStatus: "?? untrusted-tool.mjs" }] }),
    ],
    [
      "HEAD:path byte drift",
      trustedAnalyzerAuthorityAdapter({
        commitMutations: {
          "tools/perf/run_williams_crossover.mjs": (buffer) => Buffer.concat([buffer, Buffer.from("\n// drift\n")]),
        },
      }),
    ],
    [
      "checkout changed while tools were read",
      trustedAnalyzerAuthorityAdapter({
        snapshots: [clean, { ...clean, actualHead: "f".repeat(40) }],
      }),
    ],
    [
      "Git top-level differs from analyzer realpath",
      trustedAnalyzerAuthorityAdapter({ gitTopLevel: path.dirname(REPO_ROOT) }),
    ],
  ];
  for (const [label, analyzerAuthorityAdapter] of cases) {
    await assert.rejects(
      analyzeTrustedRawRoot(root, {}, { analyzerAuthorityAdapter }),
      (error) => error instanceof WilliamsInvalidExperimentError
        && getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment,
      label,
    );
  }
});

test("raw analyzer admits canonical commands from a mixed-case Windows candidate identity", {
  skip: process.platform !== "win32",
}, async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const mixedCaseRoot = windowsMixedCasePath(REPO_ROOT);
  assert.notEqual(mixedCaseRoot, REPO_ROOT);
  assert.equal(mixedCaseRoot.toLowerCase(), REPO_ROOT.toLowerCase());
  await synchronizeRawRevisionEvidence(root, {
    candidateWorktree: mixedCaseRoot,
    commandCandidateWorktree: REPO_ROOT,
    harnessRoot: REPO_ROOT,
  });

  const report = await analyzeTrustedRawRoot(root, {
    expectedCandidateWorktree: mixedCaseRoot,
  });
  assert.equal(report.manifestValidation.status, "valid");
  assert.equal(report.decision.status, "accepted");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.accepted);
  assert.equal(report.decision.invalidReasons.some((reason) => reason.includes(".command.")), false);
});

test("raw analyzer independently reconstructs both exact-head package descriptors", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const substitutedPackageLock = {
    path: "package-lock.json",
    gitBlob: "e".repeat(40),
    lfNormalizedSha256: "e".repeat(64),
  };
  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const identityPath = path.join(root, "blocks", block.id, "identity.json");
    const identity = JSON.parse(await fs.readFile(identityPath, "utf8"));
    identity.artifacts.packageLock = structuredClone(substitutedPackageLock);
    await writeJson(identityPath, identity);
  }
  await rebuildRawManifest(root);
  const commitReads = [];
  const report = await analyzeTrustedRawRoot(root, {}, {
    analyzerAuthorityAdapter: trustedAnalyzerAuthorityAdapter({ commitReads }),
  });

  assert.equal(report.manifestValidation.status, "invalid");
  assert.ok(report.manifestValidation.errors.includes("manifest.toolIdentity.sides.A.packageLock.expectedCommit"));
  assert.ok(report.manifestValidation.errors.includes("manifest.toolIdentity.sides.B.packageLock.expectedCommit"));
  assert.deepEqual(
    commitReads.filter((entry) => entry.relativePath === "package-lock.json"),
    [
      { root: CONTROL_WORKTREE, head: CONTROL_HEAD, relativePath: "package-lock.json" },
      { root: REPO_ROOT, head: CANDIDATE_HEAD, relativePath: "package-lock.json" },
    ],
  );
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("raw authority parses and hashes each required path from one immutable Buffer", async (t) => {
  const acceptedRoot = await materializeEvidenceRoot(createEvidence());
  const renderByBlock = {};
  setMetricValues(renderByBlock, [1, 4, 6, 7], 1000);
  setMetricValues(renderByBlock, [2, 3, 5, 8], 1060);
  const regressionRoot = await materializeEvidenceRoot(createEvidence({ renderByBlock }));
  t.after(() => Promise.all([acceptedRoot, regressionRoot].map((root) => (
    fs.rm(root, { recursive: true, force: true })
  ))));
  const readCounts = new Map();
  const rawSnapshotAdapter = {
    readFile: async ({ absolutePath, relativePath }) => {
      const count = (readCounts.get(relativePath) || 0) + 1;
      readCounts.set(relativePath, count);
      if (relativePath === "raw-sha256-manifest.json") return fs.readFile(absolutePath);
      const firstSnapshotPath = path.join(acceptedRoot, relativePath);
      if (count === 1) return fs.readFile(firstSnapshotPath);
      return fs.readFile(absolutePath);
    },
  };
  const report = await analyzeTrustedRawRoot(regressionRoot, {}, { rawSnapshotAdapter });
  const manifest = JSON.parse(await fs.readFile(path.join(regressionRoot, "raw-sha256-manifest.json"), "utf8"));
  assert.equal(readCounts.size, manifest.requiredEntryCount + 1);
  assert.equal(Math.max(...readCounts.values()), 1);
  assert.equal(report.manifestValidation.status, "invalid");
  assert.equal(report.decision.status, "invalid-experiment");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("raw authority rejects a reparse-point parent before consuming evidence", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const reparseParent = path.normalize(path.join(root, "blocks", "block-01", "raw"));
  const rawSnapshotAdapter = {
    lstat: async (value) => {
      const stat = await fs.lstat(value);
      if (path.normalize(value).toLowerCase() !== reparseParent.toLowerCase()) return stat;
      return {
        isDirectory: () => true,
        isFile: () => false,
        isSymbolicLink: () => true,
      };
    },
  };
  const report = await analyzeTrustedRawRoot(root, {}, { rawSnapshotAdapter });
  assert.equal(report.manifestValidation.status, "invalid");
  assert.ok(report.manifestValidation.errors.some((error) => error.includes("symlink or reparse point")));
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("final raw-root and analyze CLI authority cover accepted 0, valid regression 2, and invalid 3", async (t) => {
  const renderByBlock = {};
  setMetricValues(renderByBlock, [1, 4, 6, 7], 1000);
  setMetricValues(renderByBlock, [2, 3, 5, 8], 1060);
  const invalidEvidence = createEvidence();
  invalidEvidence.preregistration.schemaVersion = 0;
  const cases = [
    ["accepted", await materializeEvidenceRoot(createEvidence()), WILLIAMS_EXIT_CODES.accepted],
    ["valid-regression", await materializeEvidenceRoot(createEvidence({ renderByBlock })), WILLIAMS_EXIT_CODES.validRegression],
    ["invalid-experiment", await materializeEvidenceRoot(invalidEvidence), WILLIAMS_EXIT_CODES.invalidExperiment],
  ];
  const fixtureRepository = await createDetachedAnalyzerFixtureRepository();
  const fixtureToolIdentity = await buildCurrentHarnessArtifacts({ root: fixtureRepository.root });
  const runnerPath = path.join(fixtureRepository.root, "tools", "perf", "run_williams_crossover.mjs");
  const reportRoot = await makeRuntimeTemp("williams-cli-matrix-");
  t.after(() => Promise.all([
    ...cases.map(([, root]) => fs.rm(root, { recursive: true, force: true })),
    fs.rm(fixtureRepository.root, { recursive: true, force: true }),
    fs.rm(reportRoot, { recursive: true, force: true }),
  ]));
  for (const [label, root, expectedExitCode] of cases) {
    const rawReport = await analyzeTrustedRawRoot(root);
    assert.equal(rawReport.decision.exitCode, expectedExitCode, `${label}/raw-root`);
    await synchronizeRawRevisionEvidence(root, {
      controlWorktree: REPO_ROOT,
      controlHead: CANDIDATE_HEAD,
      candidateWorktree: fixtureRepository.root,
      candidateHead: fixtureRepository.head,
    });
    await synchronizeRawToolIdentity(root, fixtureToolIdentity);
    const result = spawnSync(process.execPath, [
      runnerPath,
      "--analyze",
      "--raw-root", root,
      "--json-out", path.join(reportRoot, `${label}.json`),
      "--md-out", path.join(reportRoot, `${label}.md`),
      "--control-worktree", REPO_ROOT,
      "--control-head", CANDIDATE_HEAD,
      "--candidate-worktree", fixtureRepository.root,
      "--candidate-head", fixtureRepository.head,
    ], { encoding: "utf8", windowsHide: true });
    process.stdout.write(`# direct-cli-matrix ${label} exit=${result.status}\n`);
    assert.equal(result.status, expectedExitCode, `${label}/CLI: ${result.stderr}`);
  }
});

test("direct Williams CLI process preserves a generic harness fault as exit 1 with stderr", async (t) => {
  const fixtureRepository = await createDetachedAnalyzerFixtureRepository();
  const rawRoot = await materializeEvidenceRoot(createEvidence());
  const markdownOut = path.join(RUNTIME_TMP_ROOT, `williams-direct-cli-${crypto.randomUUID()}.md`);
  t.after(() => Promise.all([
    fs.rm(fixtureRepository.root, { recursive: true, force: true }),
    fs.rm(rawRoot, { recursive: true, force: true }),
    fs.rm(markdownOut, { force: true }),
  ]));
  await synchronizeRawRevisionEvidence(rawRoot, {
    controlWorktree: REPO_ROOT,
    controlHead: CANDIDATE_HEAD,
    candidateWorktree: fixtureRepository.root,
    candidateHead: fixtureRepository.head,
  });
  const fixtureToolIdentity = await buildCurrentHarnessArtifacts({ root: fixtureRepository.root });
  await synchronizeRawToolIdentity(rawRoot, fixtureToolIdentity);

  const runnerPath = path.join(fixtureRepository.root, "tools", "perf", "run_williams_crossover.mjs");
  const result = spawnSync(process.execPath, [
    runnerPath,
    "--analyze",
    "--overwrite-analysis",
    "--raw-root", rawRoot,
    "--json-out", fixtureRepository.root,
    "--md-out", markdownOut,
    "--control-worktree", REPO_ROOT,
    "--control-head", CANDIDATE_HEAD,
    "--candidate-worktree", fixtureRepository.root,
    "--candidate-head", fixtureRepository.head,
  ], { encoding: "utf8", windowsHide: true });
  process.stdout.write(`# direct-cli-harness-fault exit=${result.status} stderr=${JSON.stringify(result.stderr.trim().split(/\r?\n/, 1)[0])}\n`);
  assert.equal(result.status, WILLIAMS_EXIT_CODES.harnessFault);
  assert.match(result.stderr, /EISDIR|EPERM|illegal operation on a directory/i);
});

test("raw analyzer rebuilds an accepted report from exactly 32 measured files", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const report = await analyzeTrustedRawRoot(root);
  assert.equal(report.manifestValidation.status, "valid");
  assert.equal(report.manifestValidation.measuredRawFileCount, 32);
  assert.equal(report.decision.status, "accepted");
});

test("raw analyzer revalidates manifest-consistent pre-block standard admission evidence", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  const notStartedRoot = await materializeEvidenceRoot(createEvidence());
  const missingAdmissionRoot = await materializeEvidenceRoot(createEvidence());
  t.after(() => Promise.all([root, notStartedRoot, missingAdmissionRoot].map(
    (evidenceRoot) => fs.rm(evidenceRoot, { recursive: true, force: true }),
  )));
  const admissionPath = path.join(root, "blocks", "block-01", "pre-block-standard-perf-admission.json");
  const admission = JSON.parse(await fs.readFile(admissionPath, "utf8"));
  admission.cpu.averagePercent = STANDARD_PERF_ADMISSION_POLICY.cpuAverageMaxPercent + 0.1;
  await writeJson(admissionPath, admission);
  await rebuildRawManifest(root);

  const report = await analyzeTrustedRawRoot(root);
  assert.equal(report.manifestValidation.status, "valid");
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.includes("block-01.preBlockAdmission.cpu-evidence-invalid"));

  const blockRoot = path.join(notStartedRoot, "blocks", "block-01");
  const rejectedAdmission = standardPerfAdmissionDecision(CONTROL_HEAD, {
    cpuSamples: Array(STANDARD_PERF_ADMISSION_POLICY.sampleCount).fill(21),
  });
  const command = JSON.parse(await fs.readFile(path.join(blockRoot, "command.json"), "utf8"));
  const notStartedJob = notStartedJobObjectEvidence({
    command,
    cwd: CONTROL_WORKTREE,
    admission: rejectedAdmission,
  });
  const quietWindow = JSON.parse(await fs.readFile(path.join(blockRoot, "quiet-window.json"), "utf8"));
  quietWindow.status = "invalid";
  quietWindow.valid = false;
  quietWindow.standardPerfAdmission = {
    valid: false,
    policyId: rejectedAdmission.policyId,
    status: rejectedAdmission.status,
    exitCode: rejectedAdmission.exitCode,
    failureCodes: rejectedAdmission.failures.map((entry) => entry.code),
  };
  const cleanup = JSON.parse(await fs.readFile(path.join(blockRoot, "cleanup.json"), "utf8"));
  Object.assign(cleanup, {
    workloadSpawnCount: 0,
    workloadStarted: false,
    cleanupRequired: false,
    taskOwnedPids: [],
    taskOwnedProcesses: [],
    terminationResults: [],
    terminationSucceeded: true,
    jobObject: notStartedJob,
  });
  const blockResult = {
    schemaVersion: 1,
    status: "invalid",
    exitCode: WILLIAMS_EXIT_CODES.invalidExperiment,
    timedOut: false,
    runnerPid: null,
    workloadSpawnCount: 0,
    skipReason: "standard-perf-admission-rejected",
    preBlockAdmission: {
      policyId: rejectedAdmission.policyId,
      status: rejectedAdmission.status,
      exitCode: rejectedAdmission.exitCode,
      failureCodes: rejectedAdmission.failures.map((entry) => entry.code),
    },
    cleanupValid: true,
  };
  await Promise.all([
    writeJson(path.join(blockRoot, "pre-block-standard-perf-admission.json"), rejectedAdmission),
    writeJson(path.join(blockRoot, "quiet-window.json"), quietWindow),
    writeJson(path.join(blockRoot, "cleanup.json"), cleanup),
    writeJson(path.join(blockRoot, "job-object.json"), notStartedJob),
    writeJson(path.join(blockRoot, "block-result.json"), blockResult),
  ]);
  await rebuildRawManifest(notStartedRoot);

  const notStartedReport = await analyzeTrustedRawRoot(notStartedRoot);
  assert.equal(notStartedReport.manifestValidation.status, "valid");
  assert.equal(notStartedReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(notStartedReport.decision.invalidReasons.includes(
    "block-01.preBlockAdmission.cpu-evidence-invalid",
  ));
  assert.deepEqual(
    notStartedReport.decision.invalidReasons.filter((reason) => (
      reason.startsWith("block-01.jobObject.")
      || reason.startsWith("block-01.cleanup.jobObject.")
      || reason.startsWith("block-01.cleanup.zeroSpawn.")
    )),
    [],
  );

  const missingAdmissionRelativePath = "blocks/block-01/pre-block-standard-perf-admission.json";
  await fs.rm(path.join(missingAdmissionRoot, ...missingAdmissionRelativePath.split("/")));
  await rebuildRawManifest(missingAdmissionRoot);
  const missingAdmissionReport = await analyzeTrustedRawRoot(missingAdmissionRoot);
  assert.equal(missingAdmissionReport.decision.status, "invalid-experiment");
  assert.equal(missingAdmissionReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(missingAdmissionReport.manifestValidation.errors.includes(
    `manifest.missing-entry:${missingAdmissionRelativePath}`,
  ));
  assert.ok(missingAdmissionReport.decision.invalidReasons.some(
    (reason) => reason.startsWith("block-01.preBlockAdmission."),
  ));

  const structuralCases = [
    ["exit 3", (block) => { block.jobObject.blockExitCode = 1; }, "block-01.jobObject.blockExitCode"],
    ["spawn zero", (block) => { block.jobObject.workloadSpawnCount = 1; }, "block-01.jobObject.workloadSpawnCount"],
    ["allowed skip reason", (block) => { block.jobObject.skipReason = "unknown"; }, "block-01.jobObject.skipReason"],
    ["empty PID sets", (block) => { block.jobObject.remainingPids = [99]; }, "block-01.jobObject.remainingPids"],
    ["canonical command", (block) => { block.jobObject.commandExecutablePath = "C:\\wrong.exe"; }, "block-01.jobObject.commandExecutablePath"],
    ["canonical cwd", (block) => { block.jobObject.commandWorkingDirectory = "C:\\wrong"; }, "block-01.jobObject.commandWorkingDirectory"],
    ["canonical cleanup Job", (block) => { block.cleanup.jobObject.skipReason = "williams-quiet-window-invalid"; }, "block-01.jobObject.cleanup-canonical"],
    ["no termination", (block) => { block.cleanup.terminationResults = [{ pid: 99 }]; }, "block-01.cleanup.zeroSpawn.terminationResults"],
    [
      "admission summary field drift",
      (block) => { block.blockResult.preBlockAdmission.failureCodes.push("drifted-failure-code"); },
      "block-01.jobObject.admission.blockResultCanonical",
    ],
  ];
  for (const [label, mutate, expectedReason] of structuralCases) {
    const evidence = createEvidence();
    const block = applyNotStartedBlockEvidence(evidence);
    mutate(block);
    const structuralReport = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(structuralReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment, label);
    assert.ok(structuralReport.decision.invalidReasons.includes(expectedReason), label);
  }
});

test("raw analyzer requires the executed Job runner binary and recomputes its descriptor", async (t) => {
  const missingRoot = await materializeEvidenceRoot(createEvidence());
  const tamperedRoot = await materializeEvidenceRoot(createEvidence());
  t.after(() => Promise.all([missingRoot, tamperedRoot].map((root) => fs.rm(root, { recursive: true, force: true }))));

  await fs.rm(path.join(missingRoot, JOB_RUNNER_EVIDENCE_PATH));
  await fs.rm(path.join(missingRoot, "raw-sha256-manifest.json"));
  const missingIdentity = await buildCurrentHarnessArtifacts();
  missingIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(missingRoot, missingIdentity);
  const missingReport = await analyzeTrustedRawRoot(missingRoot);
  assert.ok(missingReport.manifestValidation.errors.includes(`manifest.missing-entry:${JOB_RUNNER_EVIDENCE_PATH}`));

  await fs.writeFile(path.join(tamperedRoot, JOB_RUNNER_EVIDENCE_PATH), Buffer.from("MZ-tampered", "utf8"));
  await fs.rm(path.join(tamperedRoot, "raw-sha256-manifest.json"));
  const tamperedIdentity = await buildCurrentHarnessArtifacts();
  tamperedIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(tamperedRoot, tamperedIdentity);
  const tamperedReport = await analyzeTrustedRawRoot(tamperedRoot);
  assert.ok(tamperedReport.manifestValidation.errors.includes("manifest.toolIdentity.jobRunnerBinary.evidence.sha256"));
});

test("raw analyzer consumes preparation and canonical per-block Job evidence", async (t) => {
  const preparationRoot = await materializeEvidenceRoot(createEvidence());
  const jobRoot = await materializeEvidenceRoot(createEvidence());
  t.after(() => Promise.all([preparationRoot, jobRoot].map((root) => fs.rm(root, { recursive: true, force: true }))));

  const preparationPath = path.join(preparationRoot, "harness", "job-runner-preparation.json");
  const preparation = JSON.parse(await fs.readFile(preparationPath, "utf8"));
  preparation.status = "capability-error";
  await writeJson(preparationPath, preparation);
  await fs.rm(path.join(preparationRoot, "raw-sha256-manifest.json"));
  const preparationIdentity = await buildCurrentHarnessArtifacts();
  preparationIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(preparationRoot, preparationIdentity);
  const preparationReport = await analyzeTrustedRawRoot(preparationRoot);
  assert.ok(preparationReport.decision.invalidReasons.includes("job-runner-preparation.status"));

  const jobPath = path.join(jobRoot, "blocks", "block-01", "job-object.json");
  const jobObject = JSON.parse(await fs.readFile(jobPath, "utf8"));
  jobObject.rootExitCode = 17;
  await writeJson(jobPath, jobObject);
  await fs.rm(path.join(jobRoot, "raw-sha256-manifest.json"));
  const jobIdentity = await buildCurrentHarnessArtifacts();
  jobIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(jobRoot, jobIdentity);
  const jobReport = await analyzeTrustedRawRoot(jobRoot);
  assert.ok(jobReport.decision.invalidReasons.includes("block-01.jobObject.cleanup-canonical"));
  assert.ok(jobReport.decision.invalidReasons.includes("block-01.jobObject.rootExitCode"));
});

test("raw analyzer rejects both extra and missing measured files", async (t) => {
  const extraRoot = await materializeEvidenceRoot(createEvidence());
  const missingRoot = await materializeEvidenceRoot(createEvidence());
  t.after(() => Promise.all([
    fs.rm(extraRoot, { recursive: true, force: true }),
    fs.rm(missingRoot, { recursive: true, force: true }),
  ]));
  await writeJson(
    path.join(extraRoot, "blocks", "block-01", "raw", "tno_1962", "run-03.json"),
    { unexpected: true },
  );
  await fs.rm(path.join(missingRoot, "blocks", "block-08", "raw", "hoi4_1939", "run-02.json"));
  const extraReport = await analyzeTrustedRawRoot(extraRoot);
  const missingReport = await analyzeTrustedRawRoot(missingRoot);
  assert.equal(extraReport.decision.status, "invalid-experiment");
  assert.ok(extraReport.manifestValidation.errors.some((error) => error.includes("raw.extra:")));
  assert.equal(missingReport.decision.status, "invalid-experiment");
  assert.ok(missingReport.manifestValidation.errors.some((error) => error.includes("raw.missing:")));
});

test("raw manifest rejects extra metadata, tampering, and current tool identity mismatch", async (t) => {
  const extraRoot = await materializeEvidenceRoot(createEvidence());
  const tamperRoot = await materializeEvidenceRoot(createEvidence());
  const toolRoot = await materializeEvidenceRoot(createEvidence());
  const identityHelperRoot = await materializeEvidenceRoot(createEvidence());
  const sharedHarnessRoot = await materializeEvidenceRoot(createEvidence());
  t.after(() => Promise.all([extraRoot, tamperRoot, toolRoot, identityHelperRoot, sharedHarnessRoot]
    .map((root) => fs.rm(root, { recursive: true, force: true }))));

  const extraManifestPath = path.join(extraRoot, "raw-sha256-manifest.json");
  const extraManifest = JSON.parse(await fs.readFile(extraManifestPath, "utf8"));
  extraManifest.files.push({ path: "blocks/block-01/unregistered.json", bytes: 2, sha256: HASH });
  await writeJson(extraManifestPath, extraManifest);
  const extraReport = await analyzeTrustedRawRoot(extraRoot);
  assert.ok(extraReport.manifestValidation.errors.includes("manifest.extra-entry:blocks/block-01/unregistered.json"));

  await writeJson(path.join(tamperRoot, "blocks", "block-01", "block-metadata.json"), { tampered: true });
  const tamperReport = await analyzeTrustedRawRoot(tamperRoot);
  assert.ok(tamperReport.manifestValidation.errors.includes("manifest.sha256:blocks/block-01/block-metadata.json"));

  const toolManifestPath = path.join(toolRoot, "raw-sha256-manifest.json");
  const toolManifest = JSON.parse(await fs.readFile(toolManifestPath, "utf8"));
  toolManifest.toolIdentity.policy.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(toolManifestPath, toolManifest);
  const toolReport = await analyzeTrustedRawRoot(toolRoot);
  assert.ok(toolReport.manifestValidation.errors.includes("manifest.toolIdentity.policy.current"));
  assert.equal(toolReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);

  const identityHelperManifestPath = path.join(identityHelperRoot, "raw-sha256-manifest.json");
  const identityHelperManifest = JSON.parse(await fs.readFile(identityHelperManifestPath, "utf8"));
  identityHelperManifest.toolIdentity.containmentIdentityHelper.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(identityHelperManifestPath, identityHelperManifest);
  const identityHelperReport = await analyzeTrustedRawRoot(identityHelperRoot);
  assert.ok(identityHelperReport.manifestValidation.errors.includes("manifest.toolIdentity.containmentIdentityHelper.current"));
  assert.equal(identityHelperReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);

  const sharedHarnessManifestPath = path.join(sharedHarnessRoot, "raw-sha256-manifest.json");
  const sharedHarnessManifest = JSON.parse(await fs.readFile(sharedHarnessManifestPath, "utf8"));
  sharedHarnessManifest.toolIdentity.sharedHarness.runner.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(sharedHarnessManifestPath, sharedHarnessManifest);
  const sharedHarnessReport = await analyzeTrustedRawRoot(sharedHarnessRoot);
  assert.ok(sharedHarnessReport.manifestValidation.errors.includes("manifest.toolIdentity.sharedHarness.runner.current"));
  assert.equal(sharedHarnessReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
});

test("Windows Job cleanup evidence fails admission closed for any unverified process", () => {
  const evidence = createEvidence();
  evidence.blocks[0].cleanup.valid = false;
  evidence.blocks[0].cleanup.jobObject.cleanupValid = false;
  evidence.blocks[0].cleanup.jobObject.unverifiedPids = [9999];
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);
  assert.ok(report.decision.invalidReasons.includes("block-01.cleanup.jobObject.cleanupValid"));
  assert.ok(report.decision.invalidReasons.includes("block-01.cleanup.jobObject.unverifiedPids"));
});

test("ambient browser PID churn remains diagnostic when Job containment and telemetry are valid", () => {
  const evidence = createEvidence();
  evidence.blocks[0].cleanup.newBrowserPids = [99504, 106292];
  const report = analyzeWilliamsCrossoverEvidence(evidence);
  assert.equal(report.decision.status, "accepted");
  assert.equal(report.decision.exitCode, WILLIAMS_EXIT_CODES.accepted);
  assert.equal(report.decision.invalidReasons.includes("block-01.cleanup.newBrowserPids"), false);
});

test("blocked Williams reports display missing primary metrics explicitly", () => {
  const missingMetric = {
    deltaMs: null,
    deltaPercent: null,
    practicalRegressionCount: 0,
    pairPolicyStatus: "missing",
  };
  const primary = Object.fromEntries(WILLIAMS_SCENARIOS.map((scenarioId) => [scenarioId, {
    startup: missingMetric,
    canonicalRender: missingMetric,
  }]));
  const markdown = buildWilliamsMarkdown({
    policyId: WILLIAMS_CROSSOVER_POLICY_ID,
    decision: { status: "invalid-experiment", exitCode: WILLIAMS_EXIT_CODES.invalidExperiment, invalidReasons: ["raw.metric"] },
    renderSampleRole: { canonicalRoleId: "role" },
    manifestValidation: { measuredRawFileCount: 31 },
    primary,
  });
  assert.match(markdown, /tno_1962\.startup: missing ms \/ missing%/);
  assert.doesNotMatch(markdown, /tno_1962\.startup: 0\.00 ms/);
});

test("cleanup construction records ambient browser PID churn while Job containment stays authoritative", async () => {
  const { buildWilliamsCleanup } = await import("../tools/perf/run_williams_crossover.mjs");
  assert.equal(typeof buildWilliamsCleanup, "function");
  const preTelemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  const postTelemetry = telemetryWindow("post", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  postTelemetry.environment.browser = [{ ProcessId: 99504, ParentProcessId: 32132, Name: "msedge.exe" }];
  const cleanup = buildWilliamsCleanup(
    preTelemetry,
    postTelemetry,
    { pids: [4242], processes: [], captureStatus: "available" },
    jobObjectEvidence(4242),
  );
  assert.equal(cleanup.valid, true);
  assert.deepEqual(cleanup.newBrowserPids, [99504]);

  const failedJob = jobObjectEvidence(4242);
  failedJob.cleanupValid = false;
  failedJob.remainingPids = [4242];
  assert.equal(buildWilliamsCleanup(
    preTelemetry,
    postTelemetry,
    { pids: [4242], processes: [], captureStatus: "available" },
    failedJob,
  ).valid, false);
});

test("Job runner preparation fails closed on schema, timestamp, identity, and capability drift", () => {
  const cases = [
    ["job-runner-preparation.schemaVersion", (evidence) => { evidence.jobRunnerPreparation.schemaVersion = 0; }],
    ["job-runner-preparation.compiledAt", (evidence) => { evidence.jobRunnerPreparation.compiledAt = "invalid"; }],
    ["job-runner-preparation.timestamp-order", (evidence) => {
      evidence.jobRunnerPreparation.compiledAt = "2026-07-11T00:00:00.000Z";
      evidence.jobRunnerPreparation.capabilityProbedAt = "2026-07-10T23:59:30.000Z";
    }],
    ["job-runner-preparation.source", (evidence) => {
      evidence.jobRunnerPreparation.source.lfNormalizedSha256 = "f".repeat(64);
    }],
    ["job-runner-preparation.binary", (evidence) => {
      evidence.jobRunnerPreparation.binary.bytes += 1;
    }],
    ["job-runner-preparation.capabilityEvidence.schemaVersion", (evidence) => {
      evidence.jobRunnerPreparation.capabilityEvidence.schemaVersion = 0;
    }],
  ];
  for (const [reason, mutate] of cases) {
    const evidence = createEvidence();
    mutate(evidence);
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.ok(report.decision.invalidReasons.includes(reason), reason);
  }
});

test("Williams V1 identity binds the ordered entrypoint and shared-core source set", () => {
  const entrypointDrift = createEvidence();
  entrypointDrift.blocks[0].identity.artifacts.jobRunnerSources.sources[0].lfNormalizedSha256 = "e".repeat(64);
  refreshSourceSetDigest(entrypointDrift.blocks[0].identity.artifacts.jobRunnerSources);
  let report = analyzeWilliamsCrossoverEvidence(entrypointDrift);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.some((reason) => reason.includes("jobRunnerSources")));

  const coreDrift = createEvidence();
  coreDrift.jobRunnerPreparation.sourceSet.sources[1].lfNormalizedSha256 = "e".repeat(64);
  refreshSourceSetDigest(coreDrift.jobRunnerPreparation.sourceSet);
  report = analyzeWilliamsCrossoverEvidence(coreDrift);
  assert.equal(report.decision.status, "invalid-experiment");
  assert.ok(report.decision.invalidReasons.includes("job-runner-preparation.sourceSet"));

  for (const mutate of [
    (sourceSet) => { sourceSet.sources.pop(); },
    (sourceSet) => { sourceSet.sources.push(artifactDescriptor("tools/process_containment/unexpected.cs")); },
    (sourceSet) => { sourceSet.sources.reverse(); },
  ]) {
    const evidence = createEvidence();
    mutate(evidence.preregistration.workloadContract.processContainment.identity.sourceSet);
    refreshSourceSetDigest(evidence.preregistration.workloadContract.processContainment.identity.sourceSet);
    const invalid = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(invalid.decision.status, "invalid-experiment");
    assert.ok(invalid.decision.invalidReasons.some((reason) => reason.includes("sourceSet")));
  }
});

test("canonical block Job evidence validates schema, root exit, and command identity", () => {
  const cases = [
    ["schemaVersion", 0],
    ["rootExitCode", 17],
    ["commandExecutablePath", "C:\\wrong.exe"],
    ["commandWorkingDirectory", "C:\\wrong"],
    ["commandArguments", ["--wrong"]],
  ];
  for (const [field, value] of cases) {
    const evidence = createEvidence();
    evidence.blocks[0].jobObject[field] = value;
    evidence.blocks[0].cleanup.jobObject[field] = structuredClone(value);
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.ok(report.decision.invalidReasons.includes(`block-01.jobObject.${field}`), field);
    assert.ok(report.decision.invalidReasons.includes(`block-01.cleanup.jobObject.${field}`), field);
  }
});

test("Job runner compile, readiness, and capability failures map to typed invalid exit 3", () => {
  const expectedSourceSet = jobRunnerSourceSet();
  const available = Object.freeze({ status: "available", sourceSet: expectedSourceSet });
  assert.equal(requireWilliamsJobRunnerReady(available), available);
  assert.equal(requireWilliamsJobRunnerReady(available, { expectedSourceSet }), available);
  const driftedSourceSet = jobRunnerSourceSet({ 1: { lfNormalizedSha256: "e".repeat(64) } });
  assert.throws(
    () => requireWilliamsJobRunnerReady(available, { expectedSourceSet: driftedSourceSet }),
    (error) => error instanceof WilliamsInvalidExperimentError
      && error.code === "job-runner-source-set-mismatch"
      && getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment,
  );
  for (const status of ["compile-error", "ready-error", "capability-error", "required-capability-missing"]) {
    assert.throws(
      () => requireWilliamsJobRunnerReady({ status, error: "unavailable" }),
      (error) => error instanceof WilliamsInvalidExperimentError
        && error.code === `job-runner-${status}`
        && getWilliamsErrorExitCode(error) === WILLIAMS_EXIT_CODES.invalidExperiment,
    );
  }
});

test("canonical server metadata and every HTTP response fail quiet admission closed", () => {
  assert.deepEqual(resolveServerMetadataProbeTarget({ base_url: "http://127.0.0.1:9123" }), {
    status: "valid",
    baseUrl: "http://127.0.0.1:9123",
    probeUrl: "http://127.0.0.1:9123/app/",
  });
  assert.equal(resolveServerMetadataProbeTarget({}).status, "missing");
  assert.equal(resolveServerMetadataProbeTarget({ base_url: "://bad" }).status, "invalid");

  const telemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  telemetry.environment.server = [{
    present: true,
    metadataUrlStatus: "valid",
    probe: { responded: true, ok: false, status: 404 },
  }];
  assert.equal(deriveTestQuietWindow(telemetry).valid, false);
  telemetry.environment.server = [{ present: true, metadataUrlStatus: "missing", probe: null }];
  assert.equal(deriveTestQuietWindow(telemetry).valid, false);
});

test("identity failures map to invalid exit 3 while internal failures map to harness fault 1", () => {
  for (const snapshot of [
    { actualHead: CONTROL_HEAD, detached: false, branch: "main", gitStatus: "" },
    { actualHead: CONTROL_HEAD, detached: true, branch: null, gitStatus: " M tracked" },
    { actualHead: CANDIDATE_HEAD, detached: true, branch: null, gitStatus: "" },
  ]) {
    assert.throws(
      () => validateMeasurementSnapshot(snapshot, CONTROL_HEAD),
      (error) => error instanceof WilliamsInvalidExperimentError && getWilliamsErrorExitCode(error) === 3,
    );
  }
  assert.equal(getWilliamsErrorExitCode(new Error("internal")), WILLIAMS_EXIT_CODES.harnessFault);
  assert.deepEqual(WILLIAMS_EXIT_CODES, { accepted: 0, validRegression: 2, invalidExperiment: 3, harnessFault: 1 });
});

test("raw, JSON, and Markdown outputs use no-clobber with explicit analysis overwrite", async (t) => {
  const tempRoot = await makeRuntimeTemp("williams-output-policy-");
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const options = {
    rawRoot: path.join(tempRoot, "raw"),
    jsonOut: path.join(tempRoot, "report.json"),
    mdOut: path.join(tempRoot, "report.md"),
  };
  await validateWilliamsOutputPolicy(options, { reserveRawRoot: true });
  await assert.rejects(
    validateWilliamsOutputPolicy(options, { reserveRawRoot: true }),
    (error) => error instanceof WilliamsInvalidExperimentError && error.code === "raw-root-exists",
  );
  await writeJson(options.jsonOut, { preserved: true });
  await assert.rejects(
    runWilliamsCli({
      ...parseWilliamsArgs(["--analyze"]),
      ...options,
      controlWorktree: CONTROL_WORKTREE,
      controlHead: CONTROL_HEAD,
      candidateWorktree: CANDIDATE_WORKTREE,
      candidateHead: CANDIDATE_HEAD,
    }),
    (error) => error instanceof WilliamsInvalidExperimentError && error.code === "report-output-exists",
  );
  assert.deepEqual(JSON.parse(await fs.readFile(options.jsonOut, "utf8")), { preserved: true });
  assert.equal(parseWilliamsArgs(["--analyze", "--overwrite-analysis"]).overwriteAnalysis, true);
});

test("harness source keeps Windows capability tri-state and explicit execute mode", async () => {
  const runnerSource = await fs.readFile(new URL("../tools/perf/run_williams_crossover.mjs", import.meta.url), "utf8");
  const windowsSource = await fs.readFile(new URL("../tools/perf/williams_crossover_windows_runtime.mjs", import.meta.url), "utf8");
  assert.match(windowsSource, /Win32_PerfFormattedData_Counters_ProcessorInformation/);
  assert.match(windowsSource, /Get-NetTCPConnection -State Listen/);
  assert.doesNotMatch(runnerSource, /LISTENING/);
  assert.match(runnerSource, /responded: true/);
  assert.match(windowsSource, /performanceAdjustedFrequencyMHz/);
  assert.doesNotMatch(windowsSource, /effectiveFrequencyMHz/);
  assert.doesNotMatch(windowsSource, /Win32_ProcessStartTrace|Register-CimIndicationEvent|Wait-Event/);
  assert.match(windowsSource, /JOB_RUNNER_PROTOCOL_ID/);
  assert.match(runnerSource, /runWindowsJobCommand/);
  assert.match(windowsSource, /required-capability-missing/);
  assert.match(windowsSource, /collection-error/);
  assert.doesNotMatch(windowsSource, /Start-Sleep -Seconds 1/);
  assert.match(windowsSource, /\[System\.Diagnostics\.Stopwatch\]::StartNew\(\)/);
  assert.match(windowsSource, /function Read-WilliamsCounterSample/);
  assert.match(windowsSource, /\$primingCapture = Read-WilliamsCounterSample/);
  assert.match(windowsSource, /admissionRole = '\$\{WILLIAMS_TELEMETRY_CADENCE\.priming\.admissionRole\}'/);
  assert.equal(windowsSource.match(/function Read-WilliamsCounterSample/g)?.length, 1);
  assert.equal(windowsSource.match(/\$primingCapture = Read-WilliamsCounterSample/g)?.length, 1);
  assert.equal(windowsSource.match(/\$counterCapture = Read-WilliamsCounterSample/g)?.length, 1);
  assert.match(windowsSource, /\$targetElapsedMs = \[double\]\(\(\$index \+ 1\) \* \$sampleIntervalMs\)/);
  assert.match(windowsSource, /\$remainingDelayMs = \[math\]::Ceiling\(\$targetElapsedMs - \$stopwatch\.Elapsed\.TotalMilliseconds\)/);
  assert.match(windowsSource, /Start-Sleep -Milliseconds \(\[int\]\$remainingDelayMs\)/);
  assert.match(windowsSource, /captureStartedAt/);
  assert.match(windowsSource, /completedAt/);
  assert.match(windowsSource, /captureDurationMs/);
  assert.match(windowsSource, /\$scheduleLagMs = \$captureStartedElapsedMs - \$targetElapsedMs/);
  const counterReaderIndex = windowsSource.indexOf("function Read-WilliamsCounterSample");
  const processorQueryIndex = windowsSource.indexOf("$processorSample = Get-CimInstance");
  const memoryQueryIndex = windowsSource.indexOf("$memorySample = Get-CimInstance");
  const primingIndex = windowsSource.indexOf("$primingCapture = Read-WilliamsCounterSample");
  const samplingStopwatchIndex = windowsSource.indexOf("$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()");
  const captureStartIndex = windowsSource.indexOf("$captureStartedAt = [datetime]::UtcNow");
  const measuredCaptureIndex = windowsSource.indexOf("$counterCapture = Read-WilliamsCounterSample");
  assert.ok(counterReaderIndex >= 0);
  assert.ok(counterReaderIndex < processorQueryIndex);
  assert.ok(processorQueryIndex < memoryQueryIndex);
  assert.ok(memoryQueryIndex < primingIndex);
  assert.ok(primingIndex < samplingStopwatchIndex);
  assert.ok(samplingStopwatchIndex < captureStartIndex);
  assert.ok(captureStartIndex < measuredCaptureIndex);
  assert.match(windowsSource, /at = \$captureStartedAt\.ToString\('o'\)/);
  assert.match(runnerSource, /validateWilliamsTelemetryCadence/);
  assert.match(runnerSource, /collectStandardPerfAdmissionEvidence/);
  assert.match(runnerSource, /evaluateStandardPerfAdmission/);
  assert.match(runnerSource, /validateStandardPerfAdmissionDecision/);
  assert.doesNotMatch(runnerSource, /evaluateAdmission/);
  assert.match(runnerSource, /pre-block-standard-perf-admission\.json/);
  assert.match(runnerSource, /if \(standardAdmissionAccepted && quietWindow\.valid\) \{\s*commandResult = await runLoggedCommandFn/);
  const runBlockIndex = runnerSource.indexOf("async function runBlock");
  const admissionIndex = runnerSource.indexOf("const preBlockAdmission = await runWilliamsPreBlockAdmission", runBlockIndex);
  const admissionValidationIndex = runnerSource.indexOf("validateStandardPerfAdmissionDecision", admissionIndex);
  const lazyPreparationIndex = runnerSource.indexOf("await lazyPreparationAuthority", admissionValidationIndex);
  const executeIndex = runnerSource.indexOf("async function executeExperiment");
  const powerOperationIndex = runnerSource.indexOf("operation: async (expectedPowerSchemeGuid)", executeIndex);
  const productionLazyAuthorityIndex = runnerSource.indexOf("const lazyPreparationAuthority = async", powerOperationIndex);
  const productionPreparationIndex = runnerSource.indexOf(
    "preparation = await prepareWilliamsJobRunnerForExecution",
    productionLazyAuthorityIndex,
  );
  assert.ok(runBlockIndex >= 0);
  assert.ok(runBlockIndex < admissionIndex);
  assert.ok(admissionIndex < admissionValidationIndex);
  assert.ok(admissionValidationIndex < lazyPreparationIndex);
  assert.ok(executeIndex < powerOperationIndex);
  assert.doesNotMatch(runnerSource.slice(executeIndex, powerOperationIndex), /prepareWindowsJobRunnerFn\s*\(/);
  assert.ok(powerOperationIndex < productionLazyAuthorityIndex);
  assert.ok(productionLazyAuthorityIndex < productionPreparationIndex);
  assert.doesNotMatch(runnerSource, /newBrowserPids\.length === 0/);
  assert.match(runnerSource, /newBrowserPids,/);
  assert.match(runnerSource, /mode: "list"/);
  assert.match(runnerSource, /options\.mode === "execute"/);
  assert.match(runnerSource, /prepareWindowsJobRunner/);
});

test("rerun08 governance uses query and active GUID identity without list-delta ownership", async () => {
  const governanceSource = await fs.readFile(
    new URL(
      "../docs/archive/renderer-frame-orchestration-p2-20260710/rerun08-harness-recovery-governance.md",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(governanceSource, /p2-williams-rerun08-harness-recovery-v1/);
  assert.match(governanceSource, /powercfg \/duplicatescheme SCHEME_MIN <destination-guid>/);
  assert.match(governanceSource, /powercfg \/query <temporary-guid>/);
  assert.match(governanceSource, /powercfg \/setactive <temporary-guid>/);
  assert.match(governanceSource, /powercfg \/getactivescheme/);
  assert.match(governanceSource, /diagnostic-only/);
  assert.match(governanceSource, /one dry plan, one execute, and zero retry/);
  assert.match(governanceSource, /Every rerun08 result is terminal/);
  assert.doesNotMatch(governanceSource, /exactly one new scheme.*\/list/is);
  assert.doesNotMatch(governanceSource, /\/list.*identity owner/is);
});

test(
  "power-scheme journal atomically replaces checkpoints and replays BOM-less UTF-8",
  { skip: process.platform !== "win32" },
  async (t) => {
    const helperPath = fileURLToPath(
      new URL("../tools/perf/williams_crossover_power_scheme.ps1", import.meta.url),
    );
    const runtimeTmp = fileURLToPath(new URL("../.runtime/tmp/", import.meta.url));
    await fs.mkdir(runtimeTmp, { recursive: true });
    const tempRoot = await fs.mkdtemp(path.join(runtimeTmp, "williams-power-journal-"));
    t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
    const journalPath = path.join(tempRoot, "session.json");
    const replayPath = path.join(tempRoot, "localized-replay.json");
    const escapePowerShellLiteral = (value) => value.replaceAll("'", "''");
    const script = `
. '${escapePowerShellLiteral(helperPath)}'
$journalPath = '${escapePowerShellLiteral(journalPath)}'
$first = [ordered]@{ schemaVersion = 1; status = 'checkpoint-one'; events = @([ordered]@{ ordinal = 1 }) }
$second = [ordered]@{ schemaVersion = 1; status = 'checkpoint-two'; events = @([ordered]@{ ordinal = 1 }, [ordered]@{ ordinal = 2 }) }
$blocked = [ordered]@{ schemaVersion = 1; status = 'blocked-checkpoint'; events = @([ordered]@{ ordinal = 3 }) }
$final = [ordered]@{ schemaVersion = 1; status = 'checkpoint-four'; events = @([ordered]@{ ordinal = 4 }) }

Write-WilliamsPowerSchemeSession -Session $first -Path $journalPath
$firstRead = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
Write-WilliamsPowerSchemeSession -Session $second -Path $journalPath
$secondRead = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json

[IO.File]::SetAttributes($journalPath, [IO.FileAttributes]::ReadOnly)
$failureType = $null
$failureMessage = $null
try {
  Write-WilliamsPowerSchemeSession -Session $blocked -Path $journalPath
} catch {
  $failureType = if ($_.Exception.InnerException) { $_.Exception.InnerException.GetType().FullName } else { $_.Exception.GetType().FullName }
  $failureMessage = $_.Exception.Message
} finally {
  [IO.File]::SetAttributes($journalPath, [IO.FileAttributes]::Normal)
}
$afterFailureRead = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
$journalLeaf = [IO.Path]::GetFileName($journalPath)
$temporaryFilesAfterFailure = @([IO.Directory]::GetFiles([IO.Path]::GetDirectoryName($journalPath), "$journalLeaf.*.tmp"))

Write-WilliamsPowerSchemeSession -Session $final -Path $journalPath
$finalText = [IO.File]::ReadAllText($journalPath)
$finalBytes = [IO.File]::ReadAllBytes($journalPath)
$finalRead = $finalText | ConvertFrom-Json
[ordered]@{
  first = $firstRead
  second = $secondRead
  failureType = $failureType
  failureMessage = $failureMessage
  afterFailure = $afterFailureRead
  temporaryFilesAfterFailure = $temporaryFilesAfterFailure
  final = $finalRead
  finalHasUtf8Bom = ($finalBytes.Length -ge 3 -and $finalBytes[0] -eq 0xef -and $finalBytes[1] -eq 0xbb -and $finalBytes[2] -eq 0xbf)
  finalHasTerminatingNewline = $finalText.EndsWith([Environment]::NewLine)
  directoryFiles = @([IO.Directory]::GetFiles([IO.Path]::GetDirectoryName($journalPath)) | ForEach-Object { [IO.Path]::GetFileName($_) })
} | ConvertTo-Json -Depth 8
`;
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { encoding: "utf8", windowsHide: true },
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.first.status, "checkpoint-one");
    assert.deepEqual(report.first.events, [{ ordinal: 1 }]);
    assert.equal(report.second.status, "checkpoint-two");
    assert.deepEqual(report.second.events, [{ ordinal: 1 }, { ordinal: 2 }]);
    assert.equal(report.failureType, "System.UnauthorizedAccessException");
    assert.equal(typeof report.failureMessage, "string");
    assert.deepEqual(report.afterFailure, report.second);
    assert.deepEqual(report.temporaryFilesAfterFailure, []);
    assert.equal(report.final.status, "checkpoint-four");
    assert.deepEqual(report.final.events, [{ ordinal: 4 }]);
    assert.equal(report.finalHasUtf8Bom, false);
    assert.equal(report.finalHasTerminatingNewline, true);
    assert.deepEqual(report.directoryFiles, ["session.json"]);

    const localizedCapabilities = "电源方案 GUID：卓越性能 / 日本語 / 한국어";
    const localizedEventOutput =
      "电源方案 GUID：381b4222-f694-41f0-9685-ff5bb260df2e（平衡）";
    const replayJournal = {
      schemaVersion: 1,
      status: "active",
      phase: "active",
      originalGuid: null,
      temporaryGuid: "12345678-1234-4234-8234-123456789abc",
      createdGuid: null,
      duplicateReturnedGuid: null,
      destinationWasAbsent: false,
      destinationAbsenceClassification: "localized-read-regression",
      duplicateStarted: false,
      originalExpectedPowerSchemeGuidEnv: null,
      capabilities: localizedCapabilities,
      events: [{
        action: "capabilities",
        output: localizedEventOutput,
      }],
    };
    await fs.writeFile(replayPath, `${JSON.stringify(replayJournal)}\n`, "utf8");
    const replayBytes = await fs.readFile(replayPath);
    assert.equal(replayBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);

    const escapedReplayPath = escapePowerShellLiteral(replayPath);
    const pwshRead = spawnSync(
      "pwsh.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$journal = Get-Content -Raw -LiteralPath '${escapedReplayPath}' | ConvertFrom-Json; `
          + "[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); "
          + "$journal.capabilities | ConvertTo-Json -Compress",
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(pwshRead.status, 0, `${pwshRead.stdout}\n${pwshRead.stderr}`);
    assert.equal(JSON.parse(pwshRead.stdout), localizedCapabilities);

    const stopResult = spawnSync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        helperPath,
        "-StopSession",
        "-SessionPath",
        replayPath,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(stopResult.status, 0, `${stopResult.stdout}\n${stopResult.stderr}`);
    const replayed = JSON.parse(await fs.readFile(replayPath, "utf8"));
    assert.equal(replayed.status, "cleaned");
    assert.equal(replayed.cleanup.absenceClassification, "no-mutation-before-original-discovery");
    assert.equal(replayed.capabilities, localizedCapabilities);
    assert.equal(replayed.events[0].output, localizedEventOutput);
  },
);

test("tracked power helper locks the rerun08 GUID lifecycle and deletion proof", async () => {
  const helperUrl = new URL("../tools/perf/williams_crossover_power_scheme.ps1", import.meta.url);
  const helperPath = fileURLToPath(helperUrl);
  const helperSource = await fs.readFile(helperUrl, "utf8");
  const expectedSequence = [
    "capabilities",
    "original-active",
    "query-destination-before-duplicate",
    "query-original-before-duplicate",
    "duplicate",
    "query-created",
    "activate",
    "temporary-active",
    "restore",
    "restored-active",
    "query-temporary-before-delete",
    "delete-temporary",
    "query-deleted",
    "query-original-after-delete",
  ];
  const actionIndexes = expectedSequence.map((action) =>
    helperSource.indexOf(`-Action '${action}'`),
  );
  assert.equal(actionIndexes.every((index) => index >= 0), true);
  assert.equal(
    actionIndexes.every((index, position) => position === 0 || index > actionIndexes[position - 1]),
    true,
  );
  assert.match(helperSource, /returnedGuid -ne \$session\.temporaryGuid/);
  assert.match(
    helperSource,
    /if \(\$returnedGuid -ne \$session\.temporaryGuid\)[\s\S]*?throw "duplicate GUID mismatch:[\s\S]*?\$session\.createdGuid = \$returnedGuid/,
  );
  assert.match(helperSource, /function Assert-WilliamsPowerSchemeSessionSafety/);
  assert.match(helperSource, /createdGuid does not match temporaryGuid/);
  assert.match(helperSource, /\$cleanupGuid = if \(\$ownsDestinationGuid\) \{ \$sessionSafety\.temporaryGuid \}/);
  assert.match(helperSource, /destinationWasAbsent/);
  assert.match(helperSource, /duplicateStarted/);
  assert.match(helperSource, /phase = 'duplicate-pending'/);
  assert.match(helperSource, /\$ownsDestinationGuid/);
  assert.match(helperSource, /'delete-temporary'.*\$cleanupGuid/);
  assert.match(helperSource, /activeGuid -ne \$session\.temporaryGuid/);
  assert.match(helperSource, /restoredGuid -ne \$Session\.originalGuid/);
  assert.match(helperSource, /ExpectedOutcome 'failure'/);
  assert.match(helperSource, /function Get-WilliamsPowerSchemeAbsenceClassification/);
  assert.match(helperSource, /query-failure-unclassified/);
  assert.match(helperSource, /power-scheme absence proof failed/);
  assert.match(helperSource, /WILLIAMS_EXPECTED_POWER_SCHEME_GUID/);
  assert.match(helperSource, /originalExpectedPowerSchemeGuidEnv/);
  assert.match(helperSource, /absenceClassification -eq 'scheme-absent'/);
  assert.match(helperSource, /function Invoke-WilliamsPowerSchemeCheckpoint/);
  assert.match(helperSource, /\[IO\.File\]::Replace/);
  assert.match(helperSource, /query-temporary-before-delete/);
  const startSessionEntry = helperSource.indexOf("if ($StartSession)");
  const stopSessionEntry = helperSource.indexOf("if ($StopSession)");
  const selfTestEntry = helperSource.indexOf("if ($SelfTest)");
  assert.ok(startSessionEntry >= 0 && stopSessionEntry > startSessionEntry && selfTestEntry > stopSessionEntry);
  assert.match(
    helperSource.slice(startSessionEntry, stopSessionEntry),
    /Start-WilliamsTemporaryPowerScheme -SessionOut \$sessionRef -DestinationGuid \$DestinationGuid -Checkpoint \$checkpoint/,
  );
  assert.match(
    helperSource.slice(startSessionEntry, stopSessionEntry),
    /Start-WilliamsTemporaryPowerScheme -SessionOut \$sessionRef -Checkpoint \$checkpoint/,
  );
  assert.match(
    helperSource.slice(stopSessionEntry, selfTestEntry),
    /Stop-WilliamsTemporaryPowerScheme[\s\S]*-Checkpoint \$checkpoint/,
  );
  const livePreflightStart = helperSource.indexOf("function Invoke-WilliamsPowerSchemeLivePreflight");
  const livePreflightEnd = helperSource.indexOf("if ($SelfTest)", livePreflightStart);
  assert.ok(livePreflightStart >= 0 && livePreflightEnd > livePreflightStart);
  assert.match(
    helperSource.slice(livePreflightStart, livePreflightEnd),
    /finally \{[\s\S]*Stop-WilliamsTemporaryPowerScheme/,
  );
  assert.doesNotMatch(helperSource, /['"]\/list['"]/);

  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helperPath, "-SelfTest"],
      { encoding: "utf8", windowsHide: true },
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.lifecycleSucceeded, true);
    assert.equal(report.cleanupValid, true);
    assert.equal(report.queryDeletedExitCode, 1);
    assert.equal(report.absenceClassification, "scheme-absent");
    assert.deepEqual(report.commandSequence, expectedSequence);
    assert.equal(report.journalReadyBeforeFirstMutation, true);
    assert.equal(report.interruptedDeleteRetrySucceeded, true);
    assert.equal(report.retrySkippedDelete, true);
    assert.equal(report.preexistingDestinationDeleteCount, 0);
    assert.equal(report.originalDestinationDeleteCount, 0);
    assert.equal(report.foreignGuidMismatchSafe, true);
    assert.equal(report.tamperedJournalRejectedWithoutDelete, true);
    assert.equal(report.livePreflightPreservesStartAndCleanupFailures, true);
    assert.equal(report.events.some((event) => event.arguments.includes("/list")), false);

    const escapedHelperPath = helperPath.replaceAll("'", "''");
    const controlGuid = "381b4222-f694-41f0-9685-ff5bb260df2e";
    const deletedGuid = "11111111-2222-4333-8444-555555555555";
    const classification = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `. '${escapedHelperPath}'; Get-WilliamsPowerSchemeAbsenceClassification -QueryResult ([pscustomobject]@{ exitCode = 5; output = 'Access is denied.' }) -ControlQueryResult ([pscustomobject]@{ exitCode = 0; output = 'Power Scheme GUID: ${controlGuid}' }) -ExpectedControlGuid '${controlGuid}' -DeletedGuid '${deletedGuid}'`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(classification.status, 0, `${classification.stdout}\n${classification.stderr}`);
    assert.equal(classification.stdout.trim(), "query-failure-unclassified");

    const localizedAbsence = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `. '${escapedHelperPath}'; Get-WilliamsPowerSchemeAbsenceClassification -QueryResult ([pscustomobject]@{ exitCode = 1; output = '指定的电源方案、子组或设置不存在。' }) -ControlQueryResult ([pscustomobject]@{ exitCode = 0; output = '电源方案 GUID: ${controlGuid}' }) -ExpectedControlGuid '${controlGuid}' -DeletedGuid '${deletedGuid}'`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(localizedAbsence.status, 0, `${localizedAbsence.stdout}\n${localizedAbsence.stderr}`);
    assert.equal(localizedAbsence.stdout.trim(), "scheme-absent");
  }
});
