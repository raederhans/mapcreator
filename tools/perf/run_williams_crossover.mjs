#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WILLIAMS_BLOCK_SEQUENCE,
  WILLIAMS_BASELINE_RUNNER_PATH,
  WILLIAMS_CROSSOVER_POLICY_ID,
  WILLIAMS_EXIT_CODES,
  WILLIAMS_SCENARIOS,
  analyzeWilliamsCrossoverEvidence,
  buildWilliamsBlockCommand,
  buildWilliamsPreregistration,
  validateWilliamsTelemetryCadence,
} from "./williams_crossover_policy.mjs";
import {
  WINDOWS_JOB_RUNNER_EVIDENCE_PATH,
  collectWindowsPerformanceWindow,
  collectWindowsProcessSnapshot as collectProcessSnapshot,
  collectWindowsTcpConnections,
  prepareWindowsJobRunner,
  runWindowsJobCommand,
} from "./williams_crossover_windows_runtime.mjs";
import {
  buildOrderedContainmentSourceSet,
  isValidOrderedContainmentSourceSet,
  orderedContainmentSourceSetsEqual,
} from "../process_containment/ordered_source_set_identity.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_RAW_ROOT = path.join(REPO_ROOT, ".runtime", "output", "perf", "p2-williams-crossover");
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "p2-williams-crossover.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "p2-williams-crossover.md");
const TASK_PORTS = Object.freeze([8000, 8892]);
const BASELINE_RUNNER_PATH = WILLIAMS_BASELINE_RUNNER_PATH;
const ROLE_POLICY_PATH = "tools/perf/render_sample_role_policy.mjs";
const ANALYZER_PATH = "tools/perf/run_williams_crossover.mjs";
const POLICY_PATH = "tools/perf/williams_crossover_policy.mjs";
const WINDOWS_RUNTIME_PATH = "tools/perf/williams_crossover_windows_runtime.mjs";
const CONTAINMENT_IDENTITY_HELPER_PATH = "tools/process_containment/ordered_source_set_identity.mjs";
const JOB_RUNNER_SOURCE_PATH = "tools/perf/williams_crossover_windows_job_runner.cs";
const JOB_RUNNER_CORE_SOURCE_PATH = "tools/process_containment/windows_job_runner_core.cs";
const JOB_RUNNER_SOURCE_PATHS = Object.freeze([JOB_RUNNER_SOURCE_PATH, JOB_RUNNER_CORE_SOURCE_PATH]);
const POWER_SCHEME_HELPER_PATH = "tools/perf/williams_crossover_power_scheme.ps1";
const POWER_SCHEME_LIFECYCLE_EVIDENCE_PATH = "harness/power-scheme-lifecycle.json";
const PACKAGE_LOCK_PATH = "package-lock.json";
const LIVE_TIMEOUT_MS = 45 * 60 * 1000;

export class WilliamsInvalidExperimentError extends Error {
  constructor(message, code = "invalid-experiment") {
    super(message);
    this.name = "WilliamsInvalidExperimentError";
    this.code = code;
    this.exitCode = WILLIAMS_EXIT_CODES.invalidExperiment;
  }
}

export function getWilliamsErrorExitCode(error) {
  return error instanceof WilliamsInvalidExperimentError
    ? WILLIAMS_EXIT_CODES.invalidExperiment
    : WILLIAMS_EXIT_CODES.harnessFault;
}

function isDirectExecution() {
  const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return entryPath && pathToFileURL(entryPath).href === import.meta.url;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined ? [] : [value];
}

function normalizePath(value) {
  return path.resolve(String(value || ""));
}

function toPosix(value) {
  return String(value || "").replaceAll("\\", "/");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function lfNormalizedSha256(buffer) {
  return sha256(Buffer.from(buffer.toString("utf8").replace(/\r\n?/g, "\n"), "utf8"));
}

function gitBlobSha1(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(buffer).digest("hex");
}

function artifactDescriptorsEqual(left, right) {
  return String(left?.path || "") === String(right?.path || "")
    && String(left?.gitBlob || "") === String(right?.gitBlob || "")
    && String(left?.lfNormalizedSha256 || "") === String(right?.lfNormalizedSha256 || "");
}

function binaryDescriptorsEqual(left, right) {
  return String(left?.path || "") === String(right?.path || "")
    && String(left?.sha256 || "") === String(right?.sha256 || "")
    && Number(left?.bytes) === Number(right?.bytes);
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, String(value), "utf8");
}

async function writeJsonExclusive(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function writeTextExclusive(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, String(value), { encoding: "utf8", flag: "wx" });
}

function resolveOutputPath(value, fallback) {
  return value ? normalizePath(value) : fallback;
}

export function parseWilliamsArgs(argv = []) {
  const options = {
    mode: "list",
    rawRoot: DEFAULT_RAW_ROOT,
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
    controlWorktree: process.env.WILLIAMS_CONTROL_WORKTREE ? normalizePath(process.env.WILLIAMS_CONTROL_WORKTREE) : "",
    candidateWorktree: process.env.WILLIAMS_CANDIDATE_WORKTREE ? normalizePath(process.env.WILLIAMS_CANDIDATE_WORKTREE) : "",
    controlHead: String(process.env.WILLIAMS_CONTROL_HEAD || "").trim(),
    candidateHead: String(process.env.WILLIAMS_CANDIDATE_HEAD || "").trim(),
    expectedPowerSchemeGuid: String(process.env.WILLIAMS_EXPECTED_POWER_SCHEME_GUID || "").trim().toLowerCase(),
    overwriteAnalysis: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (["--list", "--plan", "--dry-run", "--analyze", "--execute"].includes(token)) {
      options.mode = token.slice(2);
    } else if (token === "--raw-root" && next) {
      options.rawRoot = resolveOutputPath(next, DEFAULT_RAW_ROOT);
      index += 1;
    } else if (token === "--json-out" && next) {
      options.jsonOut = resolveOutputPath(next, DEFAULT_JSON_OUT);
      index += 1;
    } else if (token === "--md-out" && next) {
      options.mdOut = resolveOutputPath(next, DEFAULT_MD_OUT);
      index += 1;
    } else if (token === "--control-worktree" && next) {
      options.controlWorktree = normalizePath(next);
      index += 1;
    } else if (token === "--candidate-worktree" && next) {
      options.candidateWorktree = normalizePath(next);
      index += 1;
    } else if (token === "--control-head" && next) {
      options.controlHead = String(next).trim();
      index += 1;
    } else if (token === "--candidate-head" && next) {
      options.candidateHead = String(next).trim();
      index += 1;
    } else if (token === "--expected-power-scheme-guid" && next) {
      options.expectedPowerSchemeGuid = String(next).trim().toLowerCase();
      index += 1;
    } else if (token === "--overwrite-analysis") {
      options.overwriteAnalysis = true;
    } else {
      throw new Error(`Unknown Williams crossover argument: ${token}`);
    }
  }
  return options;
}

function blockDirectory(rawRoot, block) {
  return path.join(rawRoot, "blocks", block.id);
}

export function buildWilliamsExecutionPlan(options = {}) {
  const trustedRevisionIdentity = options.trustedRevisionIdentity || {};
  const controlWorktree = trustedRevisionIdentity.expectedControlWorktree || options.controlWorktree;
  const candidateWorktree = trustedRevisionIdentity.expectedCandidateWorktree || options.candidateWorktree;
  const controlHead = trustedRevisionIdentity.expectedControlHead || options.controlHead;
  const candidateHead = trustedRevisionIdentity.expectedCandidateHead || options.candidateHead;
  const harnessRoot = path.resolve(trustedRevisionIdentity.trustedAnalyzerRoot || candidateWorktree || REPO_ROOT);
  const rawRoot = path.resolve(options.rawRoot || DEFAULT_RAW_ROOT);
  const preregistration = buildWilliamsPreregistration({
    controlHead,
    candidateHead,
    controlWorktree,
    candidateWorktree,
    generatedAt: null,
    jobRunnerSource: options.jobRunnerSource || null,
    jobRunnerSources: options.jobRunnerSources || null,
    jobRunnerBinary: options.jobRunnerBinary || null,
    powerSchemeHelper: options.powerSchemeHelper || null,
    expectedPowerSchemeGuid: options.expectedPowerSchemeGuid || "",
  });
  return {
    preregistration,
    blocks: WILLIAMS_BLOCK_SEQUENCE.map((block) => {
      const cwd = block.side === "A" ? controlWorktree : candidateWorktree;
      const expectedHead = block.side === "A" ? controlHead : candidateHead;
      const directory = blockDirectory(rawRoot, block);
      return {
        ...block,
        scenarioOrder: [...block.scenarioOrder],
        cwd,
        harnessRoot,
        expectedHead,
        directory,
        command: buildWilliamsBlockCommand({
          candidateWorktree: harnessRoot,
          measuredWorktree: cwd,
          blockDirectory: directory,
          scenarioOrder: block.scenarioOrder,
        }),
      };
    }),
  };
}

function formatPlan(plan) {
  const lines = [
    `${WILLIAMS_CROSSOVER_POLICY_ID}: 8 blocks, 1 warmup + 2 measured per scenario`,
    `control A: ${plan.preregistration.control.head || "<required>"} @ ${plan.preregistration.control.worktree || "<required>"}`,
    `candidate B: ${plan.preregistration.candidate.head || "<required>"} @ ${plan.preregistration.candidate.worktree || "<required>"}`,
  ];
  for (const block of plan.blocks) {
    lines.push(`${block.ordinal}. ${block.side} ${block.scenarioOrder.join(" -> ")} cwd=${block.cwd || "<required>"}`);
  }
  return `${lines.join("\n")}\n`;
}

function runSync(command, args, { cwd = REPO_ROOT, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}: ${String(result.stderr || result.stdout || "").trim()}`);
  }
  return {
    exitCode: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function runGit(cwd, args, options = {}) {
  return runSync("git", args, { cwd, ...options });
}

function runGitBuffer(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: null,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} exited ${result.status}: ${Buffer.from(result.stderr || result.stdout || []).toString("utf8").trim()}`);
  }
  return Buffer.from(result.stdout || []);
}

export function invokeWilliamsPowerSchemeHelper({
  action,
  helperPath,
  sessionPath,
  destinationGuid = "",
  spawnSyncFn = spawnSync,
} = {}) {
  if (!new Set(["start", "stop"]).has(action)) throw new TypeError("Power-scheme action must be start or stop.");
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", helperPath,
    action === "start" ? "-StartSession" : "-StopSession",
    "-SessionPath", sessionPath,
  ];
  if (action === "start" && destinationGuid) args.push("-DestinationGuid", destinationGuid);
  const result = spawnSyncFn("powershell.exe", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    throw new WilliamsInvalidExperimentError(
      `Power-scheme ${action} failed: ${String(result.error?.message || result.stderr || result.stdout || "unknown error").trim()}`,
      `power-scheme-${action}-failed`,
    );
  }
  try {
    return JSON.parse(String(result.stdout || "null"));
  } catch (error) {
    throw new WilliamsInvalidExperimentError(
      `Power-scheme ${action} returned invalid JSON: ${String(error?.message || error)}`,
      `power-scheme-${action}-invalid-json`,
    );
  }
}

export async function stopWilliamsPowerSchemeSession({
  helperPath,
  sessionPath,
  invokeHelper = invokeWilliamsPowerSchemeHelper,
  pathExistsFn = pathExists,
} = {}) {
  try {
    return await invokeHelper({ action: "stop", helperPath, sessionPath });
  } catch (firstError) {
    if (!(await pathExistsFn(sessionPath))) throw firstError;
    try {
      return await invokeHelper({ action: "stop", helperPath, sessionPath });
    } catch (replayError) {
      throw new WilliamsInvalidExperimentError(
        `Power-scheme stop failed: ${String(firstError?.message || firstError)}; journal replay failed: ${String(replayError?.message || replayError)}`,
        "power-scheme-stop-replay-failed",
      );
    }
  }
}

export async function startWilliamsPowerSchemeSession({
  helperPath,
  sessionPath,
  requestedGuid = "",
  randomUUIDFn = crypto.randomUUID,
  invokeHelper = invokeWilliamsPowerSchemeHelper,
  pathExistsFn = pathExists,
} = {}) {
  const destinationGuid = String(requestedGuid || randomUUIDFn()).trim().toLowerCase();
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(destinationGuid)) {
    throw new WilliamsInvalidExperimentError(
      "Power-scheme destination GUID is invalid.",
      "power-scheme-guid-invalid",
    );
  }
  try {
    const powerSession = invokeHelper({
      action: "start",
      helperPath,
      sessionPath,
      destinationGuid,
    });
    const actualGuid = String(powerSession?.temporaryGuid || "").trim().toLowerCase();
    if (actualGuid !== destinationGuid) {
      throw new WilliamsInvalidExperimentError(
        `Power-scheme helper returned ${actualGuid || "no GUID"}; expected ${destinationGuid}.`,
        "power-scheme-guid-mismatch",
      );
    }
    return { powerSession, expectedPowerSchemeGuid: destinationGuid };
  } catch (startError) {
    if (await pathExistsFn(sessionPath)) {
      try {
        await stopWilliamsPowerSchemeSession({
          helperPath,
          sessionPath,
          invokeHelper,
          pathExistsFn,
        });
      } catch (cleanupError) {
        throw new WilliamsInvalidExperimentError(
          `${startError.message}; cleanup also failed: ${cleanupError.message}`,
          "power-scheme-start-cleanup-failed",
        );
      }
    }
    throw startError;
  }
}

export async function withWilliamsPowerSchemeSession({
  helperPath,
  sessionPath,
  requestedGuid = "",
  operation,
  environment = process.env,
  randomUUIDFn = crypto.randomUUID,
  invokeHelper = invokeWilliamsPowerSchemeHelper,
  pathExistsFn = pathExists,
} = {}) {
  if (typeof operation !== "function") throw new TypeError("Power-scheme operation must be a function.");
  const previousExpectedGuid = environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID;
  const { expectedPowerSchemeGuid } = await startWilliamsPowerSchemeSession({
    helperPath,
    sessionPath,
    requestedGuid,
    randomUUIDFn,
    invokeHelper,
    pathExistsFn,
  });
  environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID = expectedPowerSchemeGuid;
  let operationError = null;
  try {
    return await operation(expectedPowerSchemeGuid);
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await stopWilliamsPowerSchemeSession({
        helperPath,
        sessionPath,
        invokeHelper,
        pathExistsFn,
      });
    } catch (cleanupError) {
      if (operationError) {
        throw new WilliamsInvalidExperimentError(
          `Workload failed: ${String(operationError?.message || operationError)}; power-scheme cleanup failed: ${String(cleanupError?.message || cleanupError)}`,
          "power-scheme-operation-cleanup-failed",
        );
      }
      throw cleanupError;
    } finally {
      if (previousExpectedGuid === undefined) delete environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID;
      else environment.WILLIAMS_EXPECTED_POWER_SCHEME_GUID = previousExpectedGuid;
    }
  }
}

async function trackedArtifactDescriptor(worktree, relativePath) {
  const gitBlob = runGit(worktree, ["rev-parse", `HEAD:${toPosix(relativePath)}`]).stdout.trim();
  const content = runGit(worktree, ["show", `HEAD:${toPosix(relativePath)}`]).stdout;
  return {
    path: toPosix(relativePath),
    gitBlob,
    lfNormalizedSha256: lfNormalizedSha256(Buffer.from(content, "utf8")),
  };
}

async function currentArtifactDescriptor(root, relativePath, readWorkspaceFile = null) {
  const absolutePath = path.join(root, relativePath);
  const content = readWorkspaceFile
    ? await readWorkspaceFile({ root, relativePath, absolutePath })
    : await fs.readFile(absolutePath);
  const normalized = Buffer.from(content.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
  return {
    path: toPosix(relativePath),
    gitBlob: gitBlobSha1(normalized),
    lfNormalizedSha256: sha256(normalized),
  };
}

async function readCurrentHarnessArtifacts(root, readWorkspaceFile = null) {
  const descriptor = (relativePath) => currentArtifactDescriptor(root, relativePath, readWorkspaceFile);
  const jobRunnerSourceDescriptors = await Promise.all(JOB_RUNNER_SOURCE_PATHS.map(descriptor));
  const jobRunnerSources = buildOrderedContainmentSourceSet(jobRunnerSourceDescriptors);
  return {
    root,
    runner: await descriptor(BASELINE_RUNNER_PATH),
    rolePolicy: await descriptor(ROLE_POLICY_PATH),
    analyzer: await descriptor(ANALYZER_PATH),
    policy: await descriptor(POLICY_PATH),
    windowsRuntime: await descriptor(WINDOWS_RUNTIME_PATH),
    containmentIdentityHelper: await descriptor(CONTAINMENT_IDENTITY_HELPER_PATH),
    jobRunnerSource: jobRunnerSourceDescriptors[0],
    jobRunnerSources,
    powerSchemeHelper: await descriptor(POWER_SCHEME_HELPER_PATH),
  };
}

function worktreeGitSnapshot(worktree) {
  const actualHead = runGit(worktree, ["rev-parse", "HEAD"]).stdout.trim();
  const branch = runGit(worktree, ["symbolic-ref", "-q", "--short", "HEAD"], { allowFailure: true });
  const gitStatus = runGit(worktree, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout.trim();
  return {
    actualHead,
    detached: branch.exitCode !== 0,
    branch: branch.exitCode === 0 ? branch.stdout.trim() : null,
    gitStatus,
  };
}

export function validateMeasurementSnapshot(snapshot, expectedHead, label = "measurement") {
  const failures = [];
  if (snapshot.actualHead !== expectedHead) failures.push(`head=${snapshot.actualHead} expected=${expectedHead}`);
  if (!snapshot.detached) failures.push(`branch=${snapshot.branch || "attached"}`);
  if (snapshot.gitStatus) failures.push(`gitStatus=${JSON.stringify(snapshot.gitStatus)}`);
  if (failures.length) throw new WilliamsInvalidExperimentError(
    `${label} measurement worktree is invalid: ${failures.join("; ")}`,
    "identity-mismatch",
  );
  return snapshot;
}

function validateMeasurementWorktree(worktree, expectedHead, label) {
  if (!worktree || !expectedHead) throw new WilliamsInvalidExperimentError(`${label} worktree and exact head are required.`, "identity-missing");
  return validateMeasurementSnapshot(worktreeGitSnapshot(worktree), expectedHead, label);
}

function identityPathsEqual(left, right) {
  if (!String(left || "").trim() || !String(right || "").trim()) return false;
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function defaultAnalyzerAuthorityAdapter() {
  return {
    realpath: (value) => fs.realpath(value),
    gitTopLevel: async (root) => runGit(root, ["rev-parse", "--show-toplevel"]).stdout.trim(),
    gitSnapshot: async (root) => worktreeGitSnapshot(root),
    readWorkspaceFile: ({ absolutePath }) => fs.readFile(absolutePath),
    readCommitArtifact: async ({ root, head, relativePath }) => ({
      buffer: runGitBuffer(root, ["show", `${head}:${toPosix(relativePath)}`]),
      gitBlob: runGit(root, ["rev-parse", `${head}:${toPosix(relativePath)}`]).stdout.trim(),
    }),
  };
}

async function canonicalizeTrustedAnalyzerRoot(trustedRevisionIdentity, adapter) {
  const [repoRoot, analyzerRoot, candidateRoot] = await Promise.all([
    adapter.realpath(REPO_ROOT),
    adapter.realpath(trustedRevisionIdentity.trustedAnalyzerRoot),
    adapter.realpath(trustedRevisionIdentity.expectedCandidateWorktree),
  ]);
  const gitTopLevel = await adapter.gitTopLevel(analyzerRoot);
  const canonicalGitTopLevel = await adapter.realpath(gitTopLevel);
  if (
    !identityPathsEqual(repoRoot, analyzerRoot)
    || !identityPathsEqual(analyzerRoot, candidateRoot)
    || !identityPathsEqual(analyzerRoot, canonicalGitTopLevel)
  ) {
    throw new WilliamsInvalidExperimentError(
      "Trusted analyzer, candidate, repository, and Git top-level realpaths must identify one root.",
      "trusted-analyzer-realpath-mismatch",
    );
  }
  return analyzerRoot;
}

async function readExpectedHarnessArtifacts(root, expectedHead, adapter) {
  const descriptor = async (relativePath) => {
    const artifact = await adapter.readCommitArtifact({ root, head: expectedHead, relativePath });
    const content = Buffer.from(artifact?.buffer || []);
    return {
      path: toPosix(relativePath),
      gitBlob: String(artifact?.gitBlob || "").trim(),
      lfNormalizedSha256: lfNormalizedSha256(content),
    };
  };
  const jobRunnerSourceDescriptors = await Promise.all(JOB_RUNNER_SOURCE_PATHS.map(descriptor));
  return {
    root,
    runner: await descriptor(BASELINE_RUNNER_PATH),
    rolePolicy: await descriptor(ROLE_POLICY_PATH),
    analyzer: await descriptor(ANALYZER_PATH),
    policy: await descriptor(POLICY_PATH),
    windowsRuntime: await descriptor(WINDOWS_RUNTIME_PATH),
    containmentIdentityHelper: await descriptor(CONTAINMENT_IDENTITY_HELPER_PATH),
    jobRunnerSource: jobRunnerSourceDescriptors[0],
    jobRunnerSources: buildOrderedContainmentSourceSet(jobRunnerSourceDescriptors),
    powerSchemeHelper: await descriptor(POWER_SCHEME_HELPER_PATH),
  };
}

function validateTrustedHarnessArtifacts(current, expected) {
  for (const [field, relativePath] of [
    ["runner", BASELINE_RUNNER_PATH],
    ["rolePolicy", ROLE_POLICY_PATH],
    ["analyzer", ANALYZER_PATH],
    ["policy", POLICY_PATH],
    ["windowsRuntime", WINDOWS_RUNTIME_PATH],
    ["containmentIdentityHelper", CONTAINMENT_IDENTITY_HELPER_PATH],
    ["jobRunnerSource", JOB_RUNNER_SOURCE_PATH],
    ["powerSchemeHelper", POWER_SCHEME_HELPER_PATH],
  ]) {
    if (!artifactDescriptorsEqual(current[field], expected[field])) {
      throw new WilliamsInvalidExperimentError(
        `Current Williams tool bytes differ from the trusted candidate commit at ${relativePath}.`,
        "trusted-tool-identity-mismatch",
      );
    }
  }
  if (!orderedContainmentSourceSetsEqual(current.jobRunnerSources, expected.jobRunnerSources)) {
    throw new WilliamsInvalidExperimentError(
      `Current Williams tool bytes differ from the trusted candidate commit at ${JOB_RUNNER_SOURCE_PATHS.join(", ")}.`,
      "trusted-tool-identity-mismatch",
    );
  }
}

export async function buildCurrentHarnessArtifacts({
  root = REPO_ROOT,
  trustedRevisionIdentity = null,
  analyzerAuthorityAdapter = null,
} = {}) {
  if (!trustedRevisionIdentity) return readCurrentHarnessArtifacts(normalizePath(root));
  const adapter = { ...defaultAnalyzerAuthorityAdapter(), ...(analyzerAuthorityAdapter || {}) };
  try {
    const canonicalRoot = await canonicalizeTrustedAnalyzerRoot(trustedRevisionIdentity, adapter);
    validateMeasurementSnapshot(
      await adapter.gitSnapshot(canonicalRoot),
      trustedRevisionIdentity.expectedCandidateHead,
      "trusted analyzer before tool snapshot",
    );
    const current = await readCurrentHarnessArtifacts(canonicalRoot, adapter.readWorkspaceFile);
    const expected = await readExpectedHarnessArtifacts(
      canonicalRoot,
      trustedRevisionIdentity.expectedCandidateHead,
      adapter,
    );
    validateTrustedHarnessArtifacts(current, expected);
    validateMeasurementSnapshot(
      await adapter.gitSnapshot(canonicalRoot),
      trustedRevisionIdentity.expectedCandidateHead,
      "trusted analyzer after tool snapshot",
    );
    return current;
  } catch (error) {
    if (error instanceof WilliamsInvalidExperimentError) throw error;
    throw new WilliamsInvalidExperimentError(
      `Trusted analyzer authority is unavailable: ${String(error?.message || error)}`,
      "trusted-analyzer-authority-unavailable",
    );
  }
}

export function buildWilliamsTrustedRevisionIdentity(options = {}) {
  const rawIdentity = {
    expectedControlWorktree: options.expectedControlWorktree ?? options.controlWorktree,
    expectedControlHead: options.expectedControlHead ?? options.controlHead,
    expectedCandidateWorktree: options.expectedCandidateWorktree ?? options.candidateWorktree,
    expectedCandidateHead: options.expectedCandidateHead ?? options.candidateHead,
    trustedAnalyzerRoot: options.trustedAnalyzerRoot ?? REPO_ROOT,
  };
  for (const field of [
    "expectedControlWorktree",
    "expectedControlHead",
    "expectedCandidateWorktree",
    "expectedCandidateHead",
    "trustedAnalyzerRoot",
  ]) {
    if (!String(rawIdentity[field] || "").trim()) {
      throw new WilliamsInvalidExperimentError(
        `Trusted revision identity requires ${field}.`,
        `trusted-revision-identity-${field}-missing`,
      );
    }
  }
  for (const field of ["expectedControlHead", "expectedCandidateHead"]) {
    if (!/^[a-f0-9]{40}$/i.test(String(rawIdentity[field]))) {
      throw new WilliamsInvalidExperimentError(
        `Trusted revision identity ${field} must be an exact 40-character Git commit id.`,
        `trusted-revision-identity-${field}-invalid`,
      );
    }
  }
  const trustedRevisionIdentity = Object.freeze({
    expectedControlWorktree: normalizePath(rawIdentity.expectedControlWorktree),
    expectedControlHead: String(rawIdentity.expectedControlHead).toLowerCase(),
    expectedCandidateWorktree: normalizePath(rawIdentity.expectedCandidateWorktree),
    expectedCandidateHead: String(rawIdentity.expectedCandidateHead).toLowerCase(),
    trustedAnalyzerRoot: normalizePath(rawIdentity.trustedAnalyzerRoot),
  });
  if (!identityPathsEqual(trustedRevisionIdentity.trustedAnalyzerRoot, REPO_ROOT)) {
    throw new WilliamsInvalidExperimentError(
      "The trusted Williams analyzer root must equal the repository running the analyzer.",
      "trusted-analyzer-root-mismatch",
    );
  }
  if (!identityPathsEqual(
    trustedRevisionIdentity.expectedCandidateWorktree,
    trustedRevisionIdentity.trustedAnalyzerRoot,
  )) {
    throw new WilliamsInvalidExperimentError(
      "The expected Williams candidate worktree must equal the trusted analyzer root.",
      "trusted-candidate-root-mismatch",
    );
  }
  let actualCandidateHead = "";
  try {
    actualCandidateHead = runGit(
      trustedRevisionIdentity.trustedAnalyzerRoot,
      ["rev-parse", "HEAD"],
    ).stdout.trim().toLowerCase();
  } catch (error) {
    throw new WilliamsInvalidExperimentError(
      `Trusted analyzer HEAD is unavailable: ${String(error?.message || error)}`,
      "trusted-candidate-head-unavailable",
    );
  }
  if (actualCandidateHead !== trustedRevisionIdentity.expectedCandidateHead) {
    throw new WilliamsInvalidExperimentError(
      `Trusted analyzer HEAD mismatch: expected ${trustedRevisionIdentity.expectedCandidateHead}, actual ${actualCandidateHead || "missing"}.`,
      "trusted-candidate-head-mismatch",
    );
  }
  return trustedRevisionIdentity;
}

async function collectBlockIdentity(block, harnessArtifacts) {
  const gitSnapshot = validateMeasurementWorktree(block.cwd, block.expectedHead, `${block.id}/${block.side}`);
  const packageLock = await trackedArtifactDescriptor(block.cwd, PACKAGE_LOCK_PATH);
  return {
    schemaVersion: 1,
    blockId: block.id,
    side: block.side,
    expectedHead: block.expectedHead,
    actualHead: gitSnapshot.actualHead,
    detached: gitSnapshot.detached,
    branch: gitSnapshot.branch,
    gitStatus: gitSnapshot.gitStatus,
    cwd: block.cwd,
    measuredRoot: block.cwd,
    harnessRoot: harnessArtifacts.root,
    artifacts: buildWilliamsBlockArtifactIdentity(packageLock, harnessArtifacts),
  };
}

export function buildWilliamsBlockArtifactIdentity(packageLock, harnessArtifacts = {}) {
  return {
    packageLock,
    runner: harnessArtifacts.runner,
    rolePolicy: harnessArtifacts.rolePolicy,
    analyzer: harnessArtifacts.analyzer,
    policy: harnessArtifacts.policy,
    windowsRuntime: harnessArtifacts.windowsRuntime,
    containmentIdentityHelper: harnessArtifacts.containmentIdentityHelper,
    jobRunnerSource: harnessArtifacts.jobRunnerSource,
    jobRunnerSources: harnessArtifacts.jobRunnerSources,
    powerSchemeHelper: harnessArtifacts.powerSchemeHelper,
    jobRunnerBinary: harnessArtifacts.jobRunnerBinary,
  };
}

async function fetchProbe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return { url, responded: true, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, responded: false, ok: false, status: null, error: String(error?.message || error) };
  }
}

export function resolveServerMetadataProbeTarget(metadata) {
  const baseUrl = String(metadata?.base_url || metadata?.baseUrl || metadata?.url || "").trim();
  if (!baseUrl) return { status: "missing", baseUrl: null, probeUrl: null };
  try {
    return { status: "valid", baseUrl, probeUrl: new URL("/app/", baseUrl).href };
  } catch (error) {
    return { status: "invalid", baseUrl, probeUrl: null, error: String(error?.message || error) };
  }
}

async function collectServerState(worktree) {
  const metadataPaths = [
    path.join(worktree, ".runtime", "dev", "active_server.json"),
    path.join(worktree, ".runtime", "tmp", "perf-baseline-runtime", "dev", "active_server.json"),
  ];
  const entries = [];
  for (const metadataPath of metadataPaths) {
    if (!(await pathExists(metadataPath))) {
      entries.push({ metadataPath, present: false, metadata: null, probe: null });
      continue;
    }
    let metadata = null;
    try {
      metadata = await readJson(metadataPath);
    } catch (error) {
      entries.push({ metadataPath, present: true, metadata: null, probe: null, error: String(error?.message || error) });
      continue;
    }
    const target = resolveServerMetadataProbeTarget(metadata);
    const probe = target.status === "valid" ? await fetchProbe(target.probeUrl) : null;
    entries.push({ metadataPath, present: true, metadata, metadataUrlStatus: target.status, probe, error: target.error || null });
  }
  return entries;
}

async function collectEnvironmentState(worktree) {
  const listeners = collectWindowsTcpConnections();
  const processes = collectProcessSnapshot();
  const browser = processes.filter((entry) => /(?:chrome|chromium|msedge)/i.test(String(entry?.Name || "")));
  const server = await collectServerState(worktree);
  const probe = await Promise.all(TASK_PORTS.map((port) => fetchProbe(`http://127.0.0.1:${port}/app/`)));
  const git = worktreeGitSnapshot(worktree);
  return {
    ports: Object.fromEntries(TASK_PORTS.map((port) => [String(port), listeners.filter((entry) => entry.port === port)])),
    allListeningPorts: listeners,
    processes,
    server,
    browser,
    cwd: worktree,
    probe,
    gitStatus: git.gitStatus,
    gitHead: git.actualHead,
    detached: git.detached,
  };
}

export async function collectWindowsTelemetryWindow({ worktree, phase } = {}) {
  const counterPayload = collectWindowsPerformanceWindow({ phase });
  if (counterPayload.capability?.status !== "available") return { ...counterPayload, environment: null };
  try {
    const environment = await collectEnvironmentState(worktree);
    return {
      ...counterPayload,
      completedAt: new Date().toISOString(),
      environment: {
        ...environment,
        power: counterPayload.power,
      },
    };
  } catch (error) {
    return {
      ...counterPayload,
      completedAt: new Date().toISOString(),
      capability: {
        status: "collection-error",
        missing: [String(error?.stack || error?.message || error)],
      },
      environment: null,
    };
  }
}

export function deriveWilliamsQuietWindow(telemetry) {
  const environment = telemetry?.environment || {};
  const telemetryCadence = validateWilliamsTelemetryCadence(telemetry, { label: "telemetry" });
  const portsClear = TASK_PORTS.every((port) => (environment.ports?.[String(port)] || []).length === 0);
  const activeServer = (environment.server || []).some((entry) => (
    entry?.present === true
    && (entry?.metadataUrlStatus !== "valid" || entry?.probe?.responded === true)
  ));
  const directProbeResponse = (environment.probe || []).some((entry) => entry?.responded === true);
  const valid = telemetry?.capability?.status === "available"
    && telemetryCadence.valid
    && portsClear
    && !activeServer
    && !directProbeResponse
    && environment.gitStatus === ""
    && environment.detached === true;
  return {
    schemaVersion: 1,
    status: valid ? "valid" : "invalid",
    valid,
    capabilityStatus: telemetry?.capability?.status || "missing",
    telemetryCadence: {
      valid: telemetryCadence.valid,
      sampleCount: telemetryCadence.sampleCount,
      intervalsMs: [...telemetryCadence.intervalsMs],
      errors: [...telemetryCadence.errors],
    },
    portsClear,
    activeServer,
    directProbeResponse,
    gitClean: environment.gitStatus === "",
    detached: environment.detached === true,
  };
}

async function runLoggedCommand(command, {
  cwd,
  stdoutPath,
  stderrPath,
  jobEvidencePath,
  preparedRunner,
  timeoutMs = LIVE_TIMEOUT_MS,
} = {}) {
  return runWindowsJobCommand(command, {
    preparedRunner,
    cwd,
    stdoutPath,
    stderrPath,
    evidencePath: jobEvidencePath,
    timeoutMs,
  });
}

function pidSet(items) {
  return new Set((items || []).map((item) => Number(item?.ProcessId)).filter(Number.isInteger));
}

export function buildWilliamsCleanup(preTelemetry, postTelemetry, taskOwnedTree, jobEvidence) {
  const preEnvironment = preTelemetry?.environment || {};
  const postEnvironment = postTelemetry?.environment || {};
  const preBrowserPids = pidSet(preEnvironment.browser);
  const postBrowserPids = [...pidSet(postEnvironment.browser)];
  const newBrowserPids = postBrowserPids.filter((pid) => !preBrowserPids.has(pid));
  const taskOwnedPids = taskOwnedTree?.pids || [];
  const taskOwnedPidsRemaining = Array.isArray(jobEvidence?.remainingPids)
    ? jobEvidence.remainingPids.map(Number).filter(Number.isInteger)
    : taskOwnedPids;
  const taskOwnedProcessesRemaining = (taskOwnedTree?.processes || []).filter((entry) => taskOwnedPidsRemaining.includes(entry.ProcessId));
  const terminationResults = [];
  const terminationSucceeded = jobEvidence?.cleanupValid === true;
  const portsClear = TASK_PORTS.every((port) => (postEnvironment.ports?.[String(port)] || []).length === 0);
  const serverProbesClear = (postEnvironment.server || []).every((entry) => entry?.probe?.responded !== true)
    && (postEnvironment.probe || []).every((entry) => entry?.responded !== true);
  const gitStatusStable = String(preEnvironment.gitStatus || "") === ""
    && String(postEnvironment.gitStatus || "") === "";
  const gitHeadStable = String(preEnvironment.gitHead || "") !== ""
    && preEnvironment.gitHead === postEnvironment.gitHead;
  const detachedStable = preEnvironment.detached === true && postEnvironment.detached === true;
  const valid = postTelemetry?.capability?.status === "available"
    && taskOwnedTree?.captureStatus === "available"
    && terminationSucceeded
    && taskOwnedPidsRemaining.length === 0
    && portsClear
    && serverProbesClear
    && gitStatusStable
    && gitHeadStable
    && detachedStable;
  return {
    schemaVersion: 1,
    valid,
    taskOwnedPids,
    taskOwnedProcesses: taskOwnedTree?.processes || [],
    processTreeCaptureStatus: taskOwnedTree?.captureStatus || "missing",
    terminationResults,
    terminationSucceeded,
    taskOwnedPidsRemaining,
    taskOwnedProcessesRemaining,
    newBrowserPids,
    portsClear,
    serverProbesClear,
    gitStatusStable,
    gitHeadStable,
    detachedStable,
    jobObject: jobEvidence || null,
  };
}

async function runBlock(block, harnessArtifacts, preparedRunner) {
  const directory = block.directory;
  await ensureDir(directory);
  const metadata = {
    schemaVersion: 1,
    policyId: WILLIAMS_CROSSOVER_POLICY_ID,
    ordinal: block.ordinal,
    id: block.id,
    side: block.side,
    orderId: block.orderId,
    scenarioOrder: [...block.scenarioOrder],
    cwd: block.cwd,
    expectedHead: block.expectedHead,
  };
  await writeJson(path.join(directory, "block-metadata.json"), metadata);
  const identity = await collectBlockIdentity(block, harnessArtifacts);
  await writeJson(path.join(directory, "identity.json"), identity);
  const preTelemetry = await collectWindowsTelemetryWindow({ worktree: block.cwd, phase: "pre" });
  await writeJson(path.join(directory, "telemetry-pre.json"), preTelemetry);
  const quietWindow = deriveWilliamsQuietWindow(preTelemetry);
  await writeJson(path.join(directory, "quiet-window.json"), quietWindow);
  await writeJson(path.join(directory, "command.json"), block.command);

  let commandResult = {
    pid: null,
    exitCode: 3,
    timedOut: false,
    skipped: true,
    taskOwnedTree: { rootPids: [], pids: [], processes: [], captureStatus: "available", captureErrors: [] },
  };
  let taskOwnedTree = { rootPids: [], pids: [], processes: [], captureStatus: "available", terminationResults: [] };
  try {
    if (quietWindow.valid) {
      commandResult = await runLoggedCommand(block.command, {
        cwd: block.cwd,
        stdoutPath: path.join(directory, "runner.stdout.log"),
        stderrPath: path.join(directory, "runner.stderr.log"),
        jobEvidencePath: path.join(directory, "job-object.json"),
        preparedRunner,
      });
    } else {
      await writeText(path.join(directory, "runner.stdout.log"), "");
      await writeText(path.join(directory, "runner.stderr.log"), "pre-block telemetry or quiet-window invalid\n");
    }
  } finally {
    taskOwnedTree = commandResult.taskOwnedTree || {
      rootPids: Number.isInteger(commandResult.pid) ? [commandResult.pid] : [],
      pids: Number.isInteger(commandResult.pid) ? [commandResult.pid] : [],
      processes: [],
      captureStatus: "collection-error",
      captureErrors: ["job object evidence missing"],
    };
  }
  const postTelemetry = await collectWindowsTelemetryWindow({ worktree: block.cwd, phase: "post" });
  await writeJson(path.join(directory, "telemetry-post.json"), postTelemetry);
  const cleanup = buildWilliamsCleanup(preTelemetry, postTelemetry, taskOwnedTree, commandResult.jobEvidence);
  await writeJson(path.join(directory, "cleanup.json"), cleanup);
  const complete = quietWindow.valid && commandResult.exitCode === 0 && cleanup.valid;
  const blockResult = {
    schemaVersion: 1,
    status: complete ? "complete" : "invalid",
    exitCode: commandResult.exitCode,
    timedOut: commandResult.timedOut === true,
    runnerPid: commandResult.pid,
    cleanupValid: cleanup.valid,
  };
  await writeJson(path.join(directory, "block-result.json"), blockResult);
  return { complete, blockResult };
}

function requiredEvidencePaths() {
  const paths = [
    "preregistration.json",
    "harness/job-runner-preparation.json",
    POWER_SCHEME_LIFECYCLE_EVIDENCE_PATH,
    WINDOWS_JOB_RUNNER_EVIDENCE_PATH,
  ];
  for (const block of WILLIAMS_BLOCK_SEQUENCE) {
    const prefix = `blocks/${block.id}`;
    for (const fileName of [
      "block-metadata.json",
      "identity.json",
      "telemetry-pre.json",
      "quiet-window.json",
      "command.json",
      "baseline.json",
      "telemetry-post.json",
      "cleanup.json",
      "block-result.json",
      "job-object.json",
    ]) {
      paths.push(`${prefix}/${fileName}`);
    }
    for (const scenarioId of WILLIAMS_SCENARIOS) {
      paths.push(`${prefix}/raw/${scenarioId}/run-01.json`);
      paths.push(`${prefix}/raw/${scenarioId}/run-02.json`);
    }
  }
  return paths;
}

export async function buildWilliamsRawManifest(rawRoot, harnessArtifacts) {
  const files = [];
  for (const relativePath of requiredEvidencePaths()) {
    const absolutePath = path.join(rawRoot, relativePath);
    if (!(await pathExists(absolutePath))) continue;
    const content = await fs.readFile(absolutePath);
    files.push({ path: relativePath, bytes: content.length, sha256: sha256(content) });
  }
  const sideIdentity = {};
  for (const [side, blockId] of [["A", "block-01"], ["B", "block-02"]]) {
    try {
      const identity = await readJson(path.join(rawRoot, "blocks", blockId, "identity.json"));
      sideIdentity[side] = {
        packageLock: identity?.artifacts?.packageLock || null,
        runner: identity?.artifacts?.runner || null,
        rolePolicy: identity?.artifacts?.rolePolicy || null,
      };
    } catch (_error) {
      sideIdentity[side] = null;
    }
  }
  const manifest = {
    schemaVersion: 1,
    policyId: WILLIAMS_CROSSOVER_POLICY_ID,
    requiredEntryCount: requiredEvidencePaths().length,
    measuredRawFileCount: files.filter((entry) => /\/raw\/[^/]+\/run-\d+\.json$/.test(`/${entry.path}`)).length,
    toolIdentity: {
      sharedHarness: {
        root: harnessArtifacts.root,
        runner: harnessArtifacts.runner,
        rolePolicy: harnessArtifacts.rolePolicy,
      },
      analyzer: harnessArtifacts.analyzer,
      policy: harnessArtifacts.policy,
      windowsRuntime: harnessArtifacts.windowsRuntime,
      containmentIdentityHelper: harnessArtifacts.containmentIdentityHelper,
      jobRunnerSource: harnessArtifacts.jobRunnerSource,
      jobRunnerSources: harnessArtifacts.jobRunnerSources,
      powerSchemeHelper: harnessArtifacts.powerSchemeHelper,
      jobRunnerBinary: harnessArtifacts.jobRunnerBinary,
      sides: sideIdentity,
    },
    files,
  };
  await writeJsonExclusive(path.join(rawRoot, "raw-sha256-manifest.json"), manifest);
  return manifest;
}

function defaultRawSnapshotAdapter() {
  return {
    lstat: (value) => fs.lstat(value),
    realpath: (value) => fs.realpath(value),
    readdir: (value, options) => fs.readdir(value, options),
    readFile: async ({ absolutePath }) => {
      const handle = await fs.open(absolutePath, "r");
      try {
        const stat = await handle.stat();
        const buffer = await handle.readFile();
        return { buffer, stat };
      } finally {
        await handle.close();
      }
    },
  };
}

function isSafeRelativeEvidencePath(relativePath) {
  const normalizedPath = path.posix.normalize(relativePath);
  return Boolean(relativePath)
    && !path.posix.isAbsolute(relativePath)
    && normalizedPath !== ".."
    && !normalizedPath.startsWith("../")
    && normalizedPath === relativePath;
}

async function validateRawPathSegments(rawRoot, canonicalRoot, relativePath, adapter) {
  if (!isSafeRelativeEvidencePath(relativePath)) {
    throw new Error(`unsafe relative evidence path: ${relativePath}`);
  }
  const segments = relativePath.split("/");
  let currentPath = rawRoot;
  for (let index = 0; index < segments.length; index += 1) {
    currentPath = path.join(currentPath, segments[index]);
    const stat = await adapter.lstat(currentPath);
    if (stat.isSymbolicLink()) throw new Error(`symlink or reparse point: ${relativePath}`);
    const finalSegment = index === segments.length - 1;
    if (!finalSegment && !stat.isDirectory()) throw new Error(`parent is not a directory: ${relativePath}`);
    if (finalSegment && !stat.isFile()) throw new Error(`evidence path is not a regular file: ${relativePath}`);
  }
  const canonicalPath = await adapter.realpath(currentPath);
  if (!pathIsInside(canonicalRoot, canonicalPath)) {
    throw new Error(`evidence path escapes raw root: ${relativePath}`);
  }
  return { absolutePath: currentPath, canonicalPath };
}

async function buildRawEvidenceSnapshot(rawRoot, rawSnapshotAdapter = null) {
  const adapter = { ...defaultRawSnapshotAdapter(), ...(rawSnapshotAdapter || {}) };
  const errors = [];
  let canonicalRoot = rawRoot;
  try {
    const rootStat = await adapter.lstat(rawRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new Error("raw root must be a regular directory without symlink or reparse indirection");
    }
    canonicalRoot = await adapter.realpath(rawRoot);
    if (!identityPathsEqual(rawRoot, canonicalRoot)) {
      throw new Error("raw root realpath differs from the requested root");
    }
  } catch (error) {
    throw new WilliamsInvalidExperimentError(
      `Williams raw evidence root is unsafe: ${String(error?.message || error)}`,
      "raw-root-unsafe",
    );
  }

  const records = new Map();
  for (const relativePath of ["raw-sha256-manifest.json", ...requiredEvidencePaths()]) {
    try {
      const pathBeforeRead = await validateRawPathSegments(rawRoot, canonicalRoot, relativePath, adapter);
      const { absolutePath } = pathBeforeRead;
      const readResult = await adapter.readFile({ absolutePath, relativePath });
      const buffer = Buffer.from(readResult?.buffer ?? readResult);
      const fileStat = readResult?.stat || await adapter.lstat(absolutePath);
      if (fileStat.isSymbolicLink?.() || !fileStat.isFile()) {
        throw new Error(`evidence path is not a regular file: ${relativePath}`);
      }
      const pathAfterRead = await validateRawPathSegments(rawRoot, canonicalRoot, relativePath, adapter);
      if (!identityPathsEqual(pathBeforeRead.canonicalPath, pathAfterRead.canonicalPath)) {
        throw new Error(`evidence path changed while being read: ${relativePath}`);
      }
      records.set(relativePath, Object.freeze({
        relativePath,
        absolutePath,
        buffer,
        bytes: buffer.length,
        sha256: sha256(buffer),
      }));
    } catch (error) {
      errors.push(`${relativePath}: ${String(error?.message || error)}`);
      records.set(relativePath, null);
    }
  }
  return Object.freeze({ rawRoot, canonicalRoot, records, errors, adapter });
}

function parseSnapshotJson(snapshot, relativePath, errors) {
  const record = snapshot.records.get(relativePath);
  if (!record) return null;
  try {
    return JSON.parse(record.buffer.toString("utf8"));
  } catch (error) {
    errors.push(`${relativePath}: ${String(error?.message || error)}`);
    return null;
  }
}

async function walkRawEvidenceInventory(rawRoot, snapshot) {
  const errors = [];
  const actualRawPaths = [];
  const blocksRoot = path.join(rawRoot, "blocks");
  const stack = [blocksRoot];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      const stat = await snapshot.adapter.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("inventory directory is unsafe");
      entries = await snapshot.adapter.readdir(current, { withFileTypes: true });
    } catch (error) {
      errors.push(`raw.inventory:${toPosix(path.relative(rawRoot, current))}:${String(error?.message || error)}`);
      continue;
    }
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = toPosix(path.relative(rawRoot, absolutePath));
      try {
        const stat = await snapshot.adapter.lstat(absolutePath);
        if (stat.isSymbolicLink()) throw new Error("symlink or reparse point");
        if (stat.isDirectory()) {
          const canonicalDirectory = await snapshot.adapter.realpath(absolutePath);
          if (!pathIsInside(snapshot.canonicalRoot, canonicalDirectory)) throw new Error("directory escapes raw root");
          stack.push(absolutePath);
        } else if (stat.isFile() && /\/raw\/[^/]+\/run-\d+\.json$/i.test(`/${relativePath}`)) {
          actualRawPaths.push(relativePath);
        } else if (!stat.isFile()) {
          throw new Error("unsupported filesystem entry type");
        }
      } catch (error) {
        errors.push(`raw.inventory:${relativePath}:${String(error?.message || error)}`);
      }
    }
  }
  return { actualRawPaths, errors };
}

async function validateRawManifest(
  snapshot,
  manifest,
  actualRawPaths,
  loadErrors,
  blocks,
  currentToolIdentity,
  jobRunnerPreparation,
  trustedRevisionIdentity,
) {
  const errors = [...loadErrors];
  if (!manifest || typeof manifest !== "object") {
    return { status: "invalid", errors: [...errors, "manifest.missing"], measuredRawFileCount: actualRawPaths.length };
  }
  if (manifest.schemaVersion !== 1) errors.push("manifest.schemaVersion");
  if (manifest.policyId !== WILLIAMS_CROSSOVER_POLICY_ID) errors.push("manifest.policyId");
  const required = new Set(requiredEvidencePaths());
  if (!Array.isArray(manifest.files)) errors.push("manifest.files.array");
  const manifestFiles = asArray(manifest.files);
  const entries = new Map(manifestFiles.map((entry) => [toPosix(entry?.path), entry]));
  if (entries.size !== manifestFiles.length) errors.push("manifest.duplicate-entry");
  if (manifest.requiredEntryCount !== required.size) errors.push("manifest.requiredEntryCount");
  for (const requiredPath of required) {
    if (!entries.has(requiredPath)) errors.push(`manifest.missing-entry:${requiredPath}`);
  }
  for (const entryPath of entries.keys()) {
    if (!required.has(entryPath)) errors.push(`manifest.extra-entry:${entryPath}`);
  }
  for (const [relativePath, entry] of entries) {
    if (!isSafeRelativeEvidencePath(relativePath)) {
      errors.push(`manifest.unsafe-path:${relativePath}`);
      continue;
    }
    const record = snapshot.records.get(relativePath);
    if (!record) errors.push(`manifest.unreadable:${relativePath}`);
    else {
      if (record.sha256 !== entry.sha256) errors.push(`manifest.sha256:${relativePath}`);
      if (record.bytes !== entry.bytes) errors.push(`manifest.bytes:${relativePath}`);
    }
  }
  const expectedRaw = new Set(requiredEvidencePaths().filter((relativePath) => relativePath.includes("/raw/")));
  const actualRaw = new Set(actualRawPaths);
  for (const expectedPath of expectedRaw) if (!actualRaw.has(expectedPath)) errors.push(`raw.missing:${expectedPath}`);
  for (const actualPath of actualRaw) if (!expectedRaw.has(actualPath)) errors.push(`raw.extra:${actualPath}`);
  if (actualRaw.size !== 32) errors.push(`raw.count.expected-32-actual-${actualRaw.size}`);
  if (manifest.measuredRawFileCount !== 32) errors.push(`manifest.raw-count.expected-32-actual-${manifest.measuredRawFileCount}`);
  const sharedHarness = manifest.toolIdentity?.sharedHarness;
  if (!identityPathsEqual(currentToolIdentity?.root, trustedRevisionIdentity?.trustedAnalyzerRoot)) {
    errors.push("manifest.toolIdentity.currentAnalyzer.root.trusted");
  }
  if (String(sharedHarness?.root || "") !== String(currentToolIdentity?.root || "")) {
    errors.push("manifest.toolIdentity.sharedHarness.root.current");
  }
  for (const field of ["runner", "rolePolicy"]) {
    const descriptor = sharedHarness?.[field];
    if (!/^[a-f0-9]{40}$/i.test(String(descriptor?.gitBlob || ""))) {
      errors.push(`manifest.toolIdentity.sharedHarness.${field}.gitBlob`);
    }
    if (!/^[a-f0-9]{64}$/i.test(String(descriptor?.lfNormalizedSha256 || ""))) {
      errors.push(`manifest.toolIdentity.sharedHarness.${field}.lfNormalizedSha256`);
    }
    if (!artifactDescriptorsEqual(descriptor, currentToolIdentity?.[field])) {
      errors.push(`manifest.toolIdentity.sharedHarness.${field}.current`);
    }
    for (const block of blocks) {
      if (!artifactDescriptorsEqual(descriptor, block?.identity?.artifacts?.[field])) {
        errors.push(`manifest.toolIdentity.sharedHarness.${field}.${block?.id || "unknown-block"}`);
      }
    }
  }
  for (const field of ["analyzer", "policy", "windowsRuntime", "containmentIdentityHelper", "jobRunnerSource", "powerSchemeHelper"]) {
    if (!/^[a-f0-9]{40}$/i.test(String(manifest.toolIdentity?.[field]?.gitBlob || ""))) {
      errors.push(`manifest.toolIdentity.${field}.gitBlob`);
    }
    if (!/^[a-f0-9]{64}$/i.test(String(manifest.toolIdentity?.[field]?.lfNormalizedSha256 || ""))) {
      errors.push(`manifest.toolIdentity.${field}.lfNormalizedSha256`);
    }
    if (!artifactDescriptorsEqual(manifest.toolIdentity?.[field], currentToolIdentity?.[field])) {
      errors.push(`manifest.toolIdentity.${field}.current`);
    }
    for (const block of blocks) {
      if (!artifactDescriptorsEqual(manifest.toolIdentity?.[field], block?.identity?.artifacts?.[field])) {
        errors.push(`manifest.toolIdentity.${field}.${block?.id || "unknown-block"}`);
      }
    }
  }
  const binaryDescriptor = manifest.toolIdentity?.jobRunnerBinary;
  if (binaryDescriptor?.path !== WINDOWS_JOB_RUNNER_EVIDENCE_PATH) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.path");
  }
  if (!/^[a-f0-9]{64}$/i.test(String(binaryDescriptor?.sha256 || ""))) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.sha256");
  }
  if (!Number.isInteger(binaryDescriptor?.bytes) || binaryDescriptor.bytes <= 0) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.bytes");
  }
  const binaryEntry = entries.get(WINDOWS_JOB_RUNNER_EVIDENCE_PATH);
  if (binaryEntry?.sha256 !== binaryDescriptor?.sha256) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.evidence.sha256");
  }
  if (binaryEntry?.bytes !== binaryDescriptor?.bytes) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.evidence.bytes");
  }
  if (!binaryDescriptorsEqual(binaryDescriptor, jobRunnerPreparation?.binary)) {
    errors.push("manifest.toolIdentity.jobRunnerBinary.preparation");
  }
  if (!artifactDescriptorsEqual(manifest.toolIdentity?.jobRunnerSource, jobRunnerPreparation?.source)) {
    errors.push("manifest.toolIdentity.jobRunnerSource.preparation");
  }
  if (!isValidOrderedContainmentSourceSet(manifest.toolIdentity?.jobRunnerSources)) {
    errors.push("manifest.toolIdentity.jobRunnerSources");
  }
  if (!orderedContainmentSourceSetsEqual(manifest.toolIdentity?.jobRunnerSources, currentToolIdentity?.jobRunnerSources)) {
    errors.push("manifest.toolIdentity.jobRunnerSources.current");
  }
  for (const block of blocks) {
    if (!orderedContainmentSourceSetsEqual(manifest.toolIdentity?.jobRunnerSources, block?.identity?.artifacts?.jobRunnerSources)) {
      errors.push(`manifest.toolIdentity.jobRunnerSources.${block?.id || "unknown-block"}`);
    }
  }
  if (!orderedContainmentSourceSetsEqual(manifest.toolIdentity?.jobRunnerSources, jobRunnerPreparation?.sourceSet)) {
    errors.push("manifest.toolIdentity.jobRunnerSources.preparation");
  }
  for (const block of blocks) {
    if (!binaryDescriptorsEqual(binaryDescriptor, block?.identity?.artifacts?.jobRunnerBinary)) {
      errors.push(`manifest.toolIdentity.jobRunnerBinary.${block?.id || "unknown-block"}`);
    }
  }
  for (const side of ["A", "B"]) {
    for (const field of ["packageLock", "runner", "rolePolicy"]) {
      const descriptor = manifest.toolIdentity?.sides?.[side]?.[field];
      if (!/^[a-f0-9]{40}$/i.test(String(descriptor?.gitBlob || ""))) {
        errors.push(`manifest.toolIdentity.sides.${side}.${field}.gitBlob`);
      }
      if (!/^[a-f0-9]{64}$/i.test(String(descriptor?.lfNormalizedSha256 || ""))) {
        errors.push(`manifest.toolIdentity.sides.${side}.${field}.lfNormalizedSha256`);
      }
      for (const block of blocks.filter((entry) => entry?.side === side)) {
        if (!artifactDescriptorsEqual(descriptor, block?.identity?.artifacts?.[field])) {
          errors.push(`manifest.toolIdentity.sides.${side}.${field}.${block?.id || "unknown-block"}`);
        }
      }
    }
  }
  return {
    status: errors.length ? "invalid" : "valid",
    errors,
    measuredRawFileCount: actualRaw.size,
    manifestEntryCount: entries.size,
  };
}

async function analyzeWilliamsCrossoverRawRootInternal(rawRoot, {
  trustedRevisionIdentity = null,
  analyzerAuthorityAdapter = null,
  rawSnapshotAdapter = null,
} = {}) {
  const trustedIdentity = buildWilliamsTrustedRevisionIdentity(trustedRevisionIdentity || {});
  const resolvedRoot = normalizePath(rawRoot);
  const analyzerToolIdentity = await buildCurrentHarnessArtifacts({
    trustedRevisionIdentity: trustedIdentity,
    analyzerAuthorityAdapter,
  });
  const snapshot = await buildRawEvidenceSnapshot(resolvedRoot, rawSnapshotAdapter);
  const loadErrors = [...snapshot.errors];
  const preregistration = parseSnapshotJson(snapshot, "preregistration.json", loadErrors);
  const jobRunnerPreparation = parseSnapshotJson(
    snapshot,
    "harness/job-runner-preparation.json",
    loadErrors,
  );
  const powerSchemeLifecycle = parseSnapshotJson(
    snapshot,
    POWER_SCHEME_LIFECYCLE_EVIDENCE_PATH,
    loadErrors,
  );
  const manifest = parseSnapshotJson(snapshot, "raw-sha256-manifest.json", loadErrors);
  const inventory = await walkRawEvidenceInventory(resolvedRoot, snapshot);
  loadErrors.push(...inventory.errors);
  const blocks = [];
  for (const expectedBlock of WILLIAMS_BLOCK_SEQUENCE) {
    const prefix = `blocks/${expectedBlock.id}`;
    const metadata = parseSnapshotJson(snapshot, `${prefix}/block-metadata.json`, loadErrors);
    const rawRuns = {};
    for (const scenarioId of WILLIAMS_SCENARIOS) {
      rawRuns[scenarioId] = [];
      for (const runNumber of [1, 2]) {
        const run = parseSnapshotJson(
          snapshot,
          `${prefix}/raw/${scenarioId}/run-${String(runNumber).padStart(2, "0")}.json`,
          loadErrors,
        );
        if (run) rawRuns[scenarioId].push(run);
      }
    }
    blocks.push({
      ordinal: metadata?.ordinal ?? expectedBlock.ordinal,
      id: metadata?.id ?? expectedBlock.id,
      side: metadata?.side ?? expectedBlock.side,
      orderId: metadata?.orderId ?? expectedBlock.orderId,
      scenarioOrder: metadata?.scenarioOrder ?? [],
      identity: parseSnapshotJson(snapshot, `${prefix}/identity.json`, loadErrors),
      telemetry: {
        pre: parseSnapshotJson(snapshot, `${prefix}/telemetry-pre.json`, loadErrors),
        post: parseSnapshotJson(snapshot, `${prefix}/telemetry-post.json`, loadErrors),
      },
      quietWindow: parseSnapshotJson(snapshot, `${prefix}/quiet-window.json`, loadErrors),
      command: parseSnapshotJson(snapshot, `${prefix}/command.json`, loadErrors),
      baseline: parseSnapshotJson(snapshot, `${prefix}/baseline.json`, loadErrors),
      cleanup: parseSnapshotJson(snapshot, `${prefix}/cleanup.json`, loadErrors),
      jobObject: parseSnapshotJson(snapshot, `${prefix}/job-object.json`, loadErrors),
      blockResult: parseSnapshotJson(snapshot, `${prefix}/block-result.json`, loadErrors),
      rawRuns,
    });
  }
  const manifestValidation = await validateRawManifest(
    snapshot,
    manifest,
    inventory.actualRawPaths,
    loadErrors,
    blocks,
    analyzerToolIdentity,
    jobRunnerPreparation,
    trustedIdentity,
  );
  return analyzeWilliamsCrossoverEvidence({
    trustedRevisionIdentity: trustedIdentity,
    preregistration,
    jobRunnerPreparation,
    powerSchemeLifecycle,
    blocks,
    manifestValidation,
    rawRoot: resolvedRoot,
  });
}

export async function analyzeWilliamsCrossoverRawRoot(rawRoot, {
  trustedRevisionIdentity = null,
} = {}) {
  return analyzeWilliamsCrossoverRawRootInternal(rawRoot, { trustedRevisionIdentity });
}

export async function analyzeWilliamsCrossoverRawRootWithTestAdapters(rawRoot, options = {}) {
  return analyzeWilliamsCrossoverRawRootInternal(rawRoot, options);
}

export function buildWilliamsMarkdown(report) {
  const formatMetric = (value, digits = 2) => (
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "missing"
  );
  const lines = [
    "# P2 Williams crossover performance report",
    "",
    `- Policy: ${report.policyId}`,
    `- Decision: ${report.decision.status}`,
    `- Exit code: ${report.decision.exitCode}`,
    `- Canonical role: ${report.renderSampleRole.canonicalRoleId}`,
    `- Raw files: ${report.manifestValidation.measuredRawFileCount ?? 0}/32`,
    "",
    "## Primary paired estimates",
    "",
  ];
  for (const scenarioId of WILLIAMS_SCENARIOS) {
    for (const metricId of ["startup", "canonicalRender"]) {
      const metric = report.primary?.[scenarioId]?.[metricId] || {};
      lines.push(`- ${scenarioId}.${metricId}: ${formatMetric(metric.deltaMs)} ms / ${formatMetric(metric.deltaPercent)}%; pair regressions ${metric.practicalRegressionCount ?? 0}/4; ${metric.pairPolicyStatus || "missing"}`);
    }
  }
  lines.push("", "## Admission", "");
  if (report.decision.invalidReasons?.length) {
    report.decision.invalidReasons.forEach((reason) => lines.push(`- invalid: ${reason}`));
  } else if (report.decision.regressions?.length) {
    report.decision.regressions.forEach((entry) => lines.push(`- regression: ${entry.scenarioId}.${entry.metric}`));
  } else {
    lines.push("- All pre-registered validity and performance checks pass.");
  }
  lines.push("", "Legacy pooled medians remain diagnostic-only.", "");
  return lines.join("\n");
}

async function writeReport(options, report, { allowOverwrite = false } = {}) {
  if (allowOverwrite) {
    await writeJson(options.jsonOut, report);
    await writeText(options.mdOut, buildWilliamsMarkdown(report));
    return;
  }
  await writeJsonExclusive(options.jsonOut, report);
  await writeTextExclusive(options.mdOut, buildWilliamsMarkdown(report));
}

function validateExecuteOptions(options) {
  for (const field of ["controlWorktree", "candidateWorktree", "controlHead", "candidateHead"]) {
    if (!String(options[field] || "").trim()) throw new WilliamsInvalidExperimentError(
      `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required for --execute.`,
      "identity-option-missing",
    );
  }
  if (
    options.expectedPowerSchemeGuid
    && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(options.expectedPowerSchemeGuid)
  ) {
    throw new WilliamsInvalidExperimentError(
      "--expected-power-scheme-guid must be a Windows power-scheme GUID.",
      "power-scheme-guid-invalid",
    );
  }
}

function pathIsInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function validateWilliamsOutputPolicy(options, { reserveRawRoot = false, allowReportOverwrite = false } = {}) {
  const paths = [options.rawRoot, options.jsonOut, options.mdOut].map(normalizePath);
  if (new Set(paths.map((entry) => entry.toLowerCase())).size !== paths.length) {
    throw new WilliamsInvalidExperimentError("Raw, JSON, and Markdown output paths must be distinct.", "output-path-collision");
  }
  if (pathIsInside(options.rawRoot, options.jsonOut) || pathIsInside(options.rawRoot, options.mdOut)) {
    throw new WilliamsInvalidExperimentError("Report outputs must stay outside the immutable raw evidence root.", "report-inside-raw-root");
  }
  if (!allowReportOverwrite) {
    for (const reportPath of [options.jsonOut, options.mdOut]) {
      if (await pathExists(reportPath)) throw new WilliamsInvalidExperimentError(
        `Report output already exists; choose a new path or use --overwrite-analysis for an explicit analysis replacement: ${reportPath}`,
        "report-output-exists",
      );
    }
  }
  if (reserveRawRoot) {
    await ensureDir(path.dirname(options.rawRoot));
    try {
      await fs.mkdir(options.rawRoot, { recursive: false });
    } catch (error) {
      if (error?.code === "EEXIST") throw new WilliamsInvalidExperimentError(
        `Raw root already exists; preserve prior evidence and choose a new root: ${options.rawRoot}`,
        "raw-root-exists",
      );
      throw error;
    }
  }
}

async function collectHarnessArtifacts(options, { analyzerAuthorityAdapter = null } = {}) {
  return buildCurrentHarnessArtifacts({
    trustedRevisionIdentity: options.trustedRevisionIdentity,
    analyzerAuthorityAdapter,
  });
}

export function requireWilliamsJobRunnerReady(preparation, { expectedSourceSet = null } = {}) {
  if (preparation?.status !== "available") {
    throw new WilliamsInvalidExperimentError(
      `Windows Job runner preparation failed (${preparation?.status || "missing"}): ${preparation?.error || "unknown error"}`,
      `job-runner-${preparation?.status || "missing"}`,
    );
  }
  if (expectedSourceSet && !orderedContainmentSourceSetsEqual(preparation.sourceSet, expectedSourceSet)) {
    throw new WilliamsInvalidExperimentError(
      "Compiled Windows Job runner source set differs from the exact candidate/current tooling identity.",
      "job-runner-source-set-mismatch",
    );
  }
  return preparation;
}

async function executeExperiment(options, trustedRevisionIdentity, {
  analyzerAuthorityAdapter = null,
  prepareWindowsJobRunnerFn = prepareWindowsJobRunner,
} = {}) {
  validateExecuteOptions(options);
  const executionOptions = {
    ...options,
    controlWorktree: trustedRevisionIdentity.expectedControlWorktree,
    controlHead: trustedRevisionIdentity.expectedControlHead,
    candidateWorktree: trustedRevisionIdentity.expectedCandidateWorktree,
    candidateHead: trustedRevisionIdentity.expectedCandidateHead,
    trustedRevisionIdentity,
  };
  validateMeasurementWorktree(executionOptions.controlWorktree, executionOptions.controlHead, "control/A");
  validateMeasurementWorktree(executionOptions.candidateWorktree, executionOptions.candidateHead, "candidate/B");
  const harnessArtifacts = await collectHarnessArtifacts(executionOptions, { analyzerAuthorityAdapter });
  await validateWilliamsOutputPolicy(executionOptions, { reserveRawRoot: true, allowReportOverwrite: false });
  const preparationResult = await prepareWindowsJobRunnerFn({
    evidenceDirectory: path.join(executionOptions.rawRoot, "harness", "job-runner"),
    evidenceBinaryPath: path.join(executionOptions.rawRoot, WINDOWS_JOB_RUNNER_EVIDENCE_PATH),
    evidenceBinaryDescriptorPath: WINDOWS_JOB_RUNNER_EVIDENCE_PATH,
  });
  const preparationSourceSetMatches = orderedContainmentSourceSetsEqual(
    preparationResult.sourceSet,
    harnessArtifacts.jobRunnerSources,
  );
  const preparationIdentityMismatch = preparationResult.status === "available" && !preparationSourceSetMatches;
  await writeJson(path.join(executionOptions.rawRoot, "harness", "job-runner-preparation.json"), {
    schemaVersion: 1,
    status: preparationIdentityMismatch ? "identity-error" : preparationResult.status,
    error: preparationIdentityMismatch
      ? "compiled source set differs from the exact candidate/current tooling identity"
      : (preparationResult.error || null),
    compiledAt: preparationResult.compiledAt || null,
    capabilityProbedAt: preparationResult.capabilityProbedAt || null,
    source: harnessArtifacts.jobRunnerSource,
    sourceSet: preparationResult.sourceSet || null,
    binary: preparationResult.binary || null,
    capabilityCommand: preparationResult.capabilityCommand || null,
    capabilityEvidence: preparationResult.capabilityEvidence || preparationResult.probeResult?.jobEvidence || null,
  });
  let preparation;
  try {
    preparation = requireWilliamsJobRunnerReady(preparationResult, {
      expectedSourceSet: harnessArtifacts.jobRunnerSources,
    });
  } catch (error) {
    await preparationResult.cleanup?.();
    throw error;
  }
  harnessArtifacts.jobRunnerBinary = preparation.binary;
  try {
    const lifecyclePath = path.join(executionOptions.rawRoot, POWER_SCHEME_LIFECYCLE_EVIDENCE_PATH);
    const helperPath = path.join(executionOptions.candidateWorktree, POWER_SCHEME_HELPER_PATH);
    await withWilliamsPowerSchemeSession({
      helperPath,
      sessionPath: lifecyclePath,
      requestedGuid: executionOptions.expectedPowerSchemeGuid,
      operation: async (expectedPowerSchemeGuid) => {
        const plan = buildWilliamsExecutionPlan({
          ...executionOptions,
          expectedPowerSchemeGuid,
          jobRunnerSource: harnessArtifacts.jobRunnerSource,
          jobRunnerSources: harnessArtifacts.jobRunnerSources,
          jobRunnerBinary: harnessArtifacts.jobRunnerBinary,
          powerSchemeHelper: harnessArtifacts.powerSchemeHelper,
        });
        const preregistration = {
          ...plan.preregistration,
          generatedAt: new Date().toISOString(),
        };
        await writeJson(path.join(executionOptions.rawRoot, "preregistration.json"), preregistration);
        for (const block of plan.blocks) {
          const result = await runBlock(block, harnessArtifacts, preparation);
          if (!result.complete) break;
        }
      },
    });
    await buildWilliamsRawManifest(executionOptions.rawRoot, harnessArtifacts);
    const report = await analyzeWilliamsCrossoverRawRoot(executionOptions.rawRoot, {
      trustedRevisionIdentity,
    });
    await writeReport(executionOptions, report, { allowOverwrite: false });
    return report;
  } finally {
    await preparation.cleanup();
  }
}

export async function executeWilliamsExperimentWithTestAdapters(options, trustedRevisionIdentity, adapters = {}) {
  return executeExperiment(options, trustedRevisionIdentity, adapters);
}

export async function runWilliamsCli(options) {
  if (["list", "dry-run"].includes(options.mode)) {
    const plan = buildWilliamsExecutionPlan(options);
    process.stdout.write(formatPlan(plan));
    return { mode: options.mode, exitCode: 0, plan };
  }
  if (options.mode === "plan") {
    const plan = buildWilliamsExecutionPlan(options);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return { mode: options.mode, exitCode: 0, plan };
  }
  if (options.mode === "analyze") {
    const trustedRevisionIdentity = buildWilliamsTrustedRevisionIdentity(options);
    await validateWilliamsOutputPolicy(options, { reserveRawRoot: false, allowReportOverwrite: options.overwriteAnalysis === true });
    const report = await analyzeWilliamsCrossoverRawRoot(options.rawRoot, {
      trustedRevisionIdentity,
    });
    await writeReport(options, report, { allowOverwrite: options.overwriteAnalysis === true });
    return { mode: options.mode, exitCode: report.decision.exitCode, report };
  }
  if (options.mode === "execute") {
    const trustedRevisionIdentity = buildWilliamsTrustedRevisionIdentity(options);
    const report = await executeExperiment(options, trustedRevisionIdentity);
    return { mode: options.mode, exitCode: report.decision.exitCode, report };
  }
  throw new Error(`Unsupported Williams crossover mode: ${options.mode}`);
}

async function main() {
  const options = parseWilliamsArgs(process.argv.slice(2));
  const result = await runWilliamsCli(options);
  process.exitCode = result.exitCode;
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = getWilliamsErrorExitCode(error);
  });
}
