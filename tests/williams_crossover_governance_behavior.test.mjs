import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
} from "../tools/perf/williams_crossover_policy.mjs";
import {
  analyzeWilliamsCrossoverRawRoot,
  buildWilliamsBlockArtifactIdentity,
  buildCurrentHarnessArtifacts,
  buildWilliamsExecutionPlan,
  buildWilliamsMarkdown,
  buildWilliamsRawManifest,
  deriveWilliamsQuietWindow,
  getWilliamsErrorExitCode,
  parseWilliamsArgs,
  requireWilliamsJobRunnerReady,
  resolveServerMetadataProbeTarget,
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

const CONTROL_HEAD = "a".repeat(40);
const CANDIDATE_HEAD = "b".repeat(40);
const CONTROL_WORKTREE = "C:\\perf\\control";
const CANDIDATE_WORKTREE = "C:\\perf\\candidate";
const EVIDENCE_RAW_ROOT = "C:\\perf\\evidence";
const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
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
          windowsRuntime: artifactDescriptor("tools/perf/williams_crossover_windows_runtime.mjs"),
          containmentIdentityHelper: artifactDescriptor("tools/process_containment/ordered_source_set_identity.mjs"),
          jobRunnerSource: artifactDescriptor("tools/perf/williams_crossover_windows_job_runner.cs"),
          jobRunnerSources: jobRunnerSourceSet(),
          powerSchemeHelper: artifactDescriptor("tools/perf/williams_crossover_power_scheme.ps1"),
          jobRunnerBinary: jobRunnerBinaryDescriptor(),
        },
      },
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
    block.identity.artifacts.rolePolicy = currentToolIdentity.rolePolicy;
    block.identity.artifacts.analyzer = currentToolIdentity.analyzer;
    block.identity.artifacts.policy = currentToolIdentity.policy;
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
  const validQuietWindow = deriveWilliamsQuietWindow(telemetry);
  assert.equal(validQuietWindow.valid, true);
  assert.equal(validQuietWindow.telemetryCadence.valid, true);
  assert.deepEqual(validQuietWindow.telemetryCadence.intervalsMs, [1000, 1000, 1000, 1000]);

  const firstAtMs = Date.parse(telemetry.samples[0].at);
  telemetry.samples.forEach((sample, index) => {
    const captureStartedAtMs = firstAtMs + index * 1635;
    sample.at = new Date(captureStartedAtMs).toISOString();
    sample.completedAt = new Date(captureStartedAtMs + sample.captureDurationMs).toISOString();
  });
  const quietWindow = deriveWilliamsQuietWindow(telemetry);
  assert.equal(quietWindow.valid, false);
  assert.equal(quietWindow.telemetryCadence.valid, false);
  assert.ok(quietWindow.telemetryCadence.errors.includes("telemetry.samples.interval"));

  const incompleteWindow = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  incompleteWindow.completedAt = incompleteWindow.samples.at(-1).at;
  const incompleteQuietWindow = deriveWilliamsQuietWindow(incompleteWindow);
  assert.equal(incompleteQuietWindow.valid, false);
  assert.ok(incompleteQuietWindow.telemetryCadence.errors.includes("telemetry.completedAt.sample-coverage"));
});

test("a long excluded WMI prime preserves strict measured cadence while a measured cold spike stays invalid", () => {
  const primedTelemetry = telemetryWindow("pre", 1, CONTROL_WORKTREE, CONTROL_HEAD);
  primedTelemetry.priming.captureDurationMs = 3617;
  primedTelemetry.priming.startedAt = new Date(
    Date.parse(primedTelemetry.priming.completedAt) - 3617,
  ).toISOString();
  const primedQuietWindow = deriveWilliamsQuietWindow(primedTelemetry);
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
  const measuredSpikeQuietWindow = deriveWilliamsQuietWindow(measuredSpikeTelemetry);
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
  assert.deepEqual(plan.blocks[2].command.args.slice(0, 11), [
    path.join(CANDIDATE_WORKTREE, "tools", "perf", "run_baseline.mjs"),
    "--measured-repo-root", CANDIDATE_WORKTREE,
    "--mode", "baseline",
    "--scenarios", "hoi4_1939,tno_1962",
    "--runs", "2",
    "--warmups", "1",
  ]);

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
});

test("Williams analyzer rejects self-consistent noncanonical block commands", () => {
  const rawRoot = path.join(REPO_ROOT, ".runtime", "tmp", "williams-command-authority");
  const canonicalPlan = buildWilliamsExecutionPlan({
    rawRoot,
    controlHead: CONTROL_HEAD,
    candidateHead: CANDIDATE_HEAD,
    controlWorktree: CONTROL_WORKTREE,
    candidateWorktree: CANDIDATE_WORKTREE,
  });
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
    ["missing baseline output", (command) => removeOption(command.args, "--baseline-json")],
  ];

  for (const [label, mutate] of cases) {
    const evidence = createEvidence();
    evidence.rawRoot = rawRoot;
    const command = structuredClone(canonicalPlan.blocks[0].command);
    mutate(command);
    evidence.blocks[0].command = command;
    evidence.blocks[0].jobObject = jobObjectEvidence(4001, { command, cwd: CONTROL_WORKTREE });
    evidence.blocks[0].cleanup.jobObject = jobObjectEvidence(4001, { command, cwd: CONTROL_WORKTREE });
    const report = analyzeWilliamsCrossoverEvidence(evidence);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.ok(report.decision.invalidReasons.includes("block-01.command.canonical"), label);
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
    const report = await analyzeWilliamsCrossoverRawRoot(root);
    assert.equal(report.decision.status, "invalid-experiment", label);
    assert.ok(
      report.decision.invalidReasons.some((reason) => reason.includes("renderSampleRunProfile") || reason.includes("runProfile")),
      `${label}: ${report.decision.invalidReasons.join("\n")}`,
    );
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

test("raw analyzer rebuilds an accepted report from exactly 32 measured files", async (t) => {
  const root = await materializeEvidenceRoot(createEvidence());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const report = await analyzeWilliamsCrossoverRawRoot(root);
  assert.equal(report.manifestValidation.status, "valid");
  assert.equal(report.manifestValidation.measuredRawFileCount, 32);
  assert.equal(report.decision.status, "accepted");
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
  const missingReport = await analyzeWilliamsCrossoverRawRoot(missingRoot);
  assert.ok(missingReport.manifestValidation.errors.includes(`manifest.missing-entry:${JOB_RUNNER_EVIDENCE_PATH}`));

  await fs.writeFile(path.join(tamperedRoot, JOB_RUNNER_EVIDENCE_PATH), Buffer.from("MZ-tampered", "utf8"));
  await fs.rm(path.join(tamperedRoot, "raw-sha256-manifest.json"));
  const tamperedIdentity = await buildCurrentHarnessArtifacts();
  tamperedIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(tamperedRoot, tamperedIdentity);
  const tamperedReport = await analyzeWilliamsCrossoverRawRoot(tamperedRoot);
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
  const preparationReport = await analyzeWilliamsCrossoverRawRoot(preparationRoot);
  assert.ok(preparationReport.decision.invalidReasons.includes("job-runner-preparation.status"));

  const jobPath = path.join(jobRoot, "blocks", "block-01", "job-object.json");
  const jobObject = JSON.parse(await fs.readFile(jobPath, "utf8"));
  jobObject.rootExitCode = 17;
  await writeJson(jobPath, jobObject);
  await fs.rm(path.join(jobRoot, "raw-sha256-manifest.json"));
  const jobIdentity = await buildCurrentHarnessArtifacts();
  jobIdentity.jobRunnerBinary = jobRunnerBinaryDescriptor();
  await buildWilliamsRawManifest(jobRoot, jobIdentity);
  const jobReport = await analyzeWilliamsCrossoverRawRoot(jobRoot);
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
  const extraReport = await analyzeWilliamsCrossoverRawRoot(extraRoot);
  const missingReport = await analyzeWilliamsCrossoverRawRoot(missingRoot);
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
  const extraReport = await analyzeWilliamsCrossoverRawRoot(extraRoot);
  assert.ok(extraReport.manifestValidation.errors.includes("manifest.extra-entry:blocks/block-01/unregistered.json"));

  await writeJson(path.join(tamperRoot, "blocks", "block-01", "block-metadata.json"), { tampered: true });
  const tamperReport = await analyzeWilliamsCrossoverRawRoot(tamperRoot);
  assert.ok(tamperReport.manifestValidation.errors.includes("manifest.sha256:blocks/block-01/block-metadata.json"));

  const toolManifestPath = path.join(toolRoot, "raw-sha256-manifest.json");
  const toolManifest = JSON.parse(await fs.readFile(toolManifestPath, "utf8"));
  toolManifest.toolIdentity.policy.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(toolManifestPath, toolManifest);
  const toolReport = await analyzeWilliamsCrossoverRawRoot(toolRoot);
  assert.ok(toolReport.manifestValidation.errors.includes("manifest.toolIdentity.policy.current"));
  assert.equal(toolReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);

  const identityHelperManifestPath = path.join(identityHelperRoot, "raw-sha256-manifest.json");
  const identityHelperManifest = JSON.parse(await fs.readFile(identityHelperManifestPath, "utf8"));
  identityHelperManifest.toolIdentity.containmentIdentityHelper.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(identityHelperManifestPath, identityHelperManifest);
  const identityHelperReport = await analyzeWilliamsCrossoverRawRoot(identityHelperRoot);
  assert.ok(identityHelperReport.manifestValidation.errors.includes("manifest.toolIdentity.containmentIdentityHelper.current"));
  assert.equal(identityHelperReport.decision.exitCode, WILLIAMS_EXIT_CODES.invalidExperiment);

  const sharedHarnessManifestPath = path.join(sharedHarnessRoot, "raw-sha256-manifest.json");
  const sharedHarnessManifest = JSON.parse(await fs.readFile(sharedHarnessManifestPath, "utf8"));
  sharedHarnessManifest.toolIdentity.sharedHarness.runner.lfNormalizedSha256 = "f".repeat(64);
  await writeJson(sharedHarnessManifestPath, sharedHarnessManifest);
  const sharedHarnessReport = await analyzeWilliamsCrossoverRawRoot(sharedHarnessRoot);
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
  assert.equal(deriveWilliamsQuietWindow(telemetry).valid, false);
  telemetry.environment.server = [{ present: true, metadataUrlStatus: "missing", probe: null }];
  assert.equal(deriveWilliamsQuietWindow(telemetry).valid, false);
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
    runWilliamsCli({ ...parseWilliamsArgs(["--analyze"]), ...options }),
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
  assert.match(runnerSource, /if \(quietWindow\.valid\) \{\s*commandResult = await runLoggedCommand/);
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
