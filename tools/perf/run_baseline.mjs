#!/usr/bin/env node

import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  CANONICAL_RENDER_SAMPLE_ROLE_ID,
  GOVERNED_RENDER_SAMPLE_SCENARIOS,
  RENDER_SAMPLE_ROLE_POLICY_ID,
  analyzeRenderSampleRole,
  summarizeRenderSampleRoleAnalyses,
} from "./render_sample_role_policy.mjs";
import {
  PerfEnvironmentAdmissionError,
  PerfGenerationFenceError,
  STANDARD_PERF_ADMISSION_EXIT_CODES,
  STANDARD_PERF_ADMISSION_POLICY,
  STANDARD_PERF_GENERATION_FENCE_POLICY_ID,
  collectStandardPerfAdmissionEvidence,
  collectStandardPerfStabilityEvidence,
  evaluateStandardPerfAdmission,
  evaluateStandardPerfGenerationFence,
  validateStandardPerfAdmissionDecision,
} from "./standard_perf_admission.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUPPORTED_SCENARIOS = ["blank_base", "tno_1962", "hoi4_1939"];
const DEFAULT_GATE_SCENARIOS = ["tno_1962", "hoi4_1939"];
const NODE_PLATFORM_IDS = new Set(["aix", "android", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32"]);
const PERF_BASELINE_DATE = "2026-07-30";
const DEFAULT_BASELINE_JSON = path.join(REPO_ROOT, "docs", "perf", `baseline_${PERF_BASELINE_DATE}.json`);
const DEFAULT_BASELINE_MD = path.join(REPO_ROOT, "docs", "perf", `baseline_${PERF_BASELINE_DATE}.md`);
const DEFAULT_RAW_DIR = path.join(REPO_ROOT, ".runtime", "output", "perf", `baseline_${PERF_BASELINE_DATE}`);
const ACTIVE_SERVER_PATH = path.join(REPO_ROOT, ".runtime", "dev", "active_server.json");
const PERF_SERVER_RUNTIME_ROOT = path.join(REPO_ROOT, ".runtime", "tmp", "perf-baseline-runtime");
const PERF_SERVER_ACTIVE_SERVER_PATH = path.join(PERF_SERVER_RUNTIME_ROOT, "dev", "active_server.json");
const DEV_SERVER_OUT = path.join(REPO_ROOT, ".runtime", "tmp", "perf-baseline-dev-server.out.log");
const DEV_SERVER_ERR = path.join(REPO_ROOT, ".runtime", "tmp", "perf-baseline-dev-server.err.log");
const PERF_BROWSER_DIAGNOSTICS_DIR = path.join(REPO_ROOT, ".runtime", "tests", "playwright", "perf-baseline");
const PERF_BROWSER_DIAGNOSTICS_EVENT_LIMIT = 120;
const DEV_SERVER_READY_TIMEOUT_MS = Math.max(
  45_000,
  Number.parseInt(process.env.PERF_DEV_SERVER_READY_TIMEOUT_MS || "45000", 10) || 45_000
);
const MIN_GATE_WARMUPS = 3;
const CANONICAL_GATE_RUN_COUNT = 5;
const DEFAULT_WARMUPS = MIN_GATE_WARMUPS;
const CURRENT_PERF_REPORT_SCHEMA_VERSION = 3;
const PERF_REGRESSION_MODES = new Set(["enforce", "diagnostic"]);
// 这里只收录已从 Chromium requestfailed 证据确认的瞬时网络错误；命中后最多重跑一次，第二次失败原样上抛。
const TRANSIENT_PERF_NETWORK_FAILURE_CODES = Object.freeze([
  "net::ERR_NETWORK_CHANGED",
  "net::ERR_CONNECTION_RESET",
  "net::ERR_CONNECTION_FAILED",
  "net::ERR_INTERNET_DISCONNECTED",
  "net::ERR_NETWORK_IO_SUSPENDED",
]);
const PERF_URL_QUERY = Object.freeze({
  render_profile: "balanced",
  startup_interaction: "full",
  startup_worker: 1,
  startup_cache: 0,
  perf: 1,
});
const GATE_METRICS = Object.freeze([
  { key: "totalStartupMs", label: "totalStartupMs" },
  { key: "scenarioAppliedMs", label: "scenarioAppliedMs" },
  { key: "applyScenarioBundleMs", label: "applyScenarioBundleMs" },
  { key: "refreshScenarioApplyMs", label: "refreshScenarioApplyMs" },
  { key: "renderSampleMedianMs", label: "renderSampleMedianMs", threshold: 1.25 },
]);
const SCENARIO_MANIFEST_MAP = Object.fromEntries(
  SUPPORTED_SCENARIOS.map((scenarioId) => [
    scenarioId,
    path.join(REPO_ROOT, "data", "scenarios", scenarioId, "manifest.json"),
  ]),
);

function parseArgs(argv) {
  const options = {
    mode: "baseline",
    scenarios: [...DEFAULT_GATE_SCENARIOS],
    runs: 5,
    warmups: DEFAULT_WARMUPS,
    threshold: 1.15,
    regressionMode: "enforce",
    baselineJson: DEFAULT_BASELINE_JSON,
    baselineMd: DEFAULT_BASELINE_MD,
    rawDir: DEFAULT_RAW_DIR,
    urlQuery: { ...PERF_URL_QUERY },
    writeMarkdown: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--mode" && next) {
      options.mode = String(next).trim();
      index += 1;
    } else if (token === "--scenarios" && next) {
      options.scenarios = String(next).split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (token === "--runs" && next) {
      options.runs = Math.max(1, Number(next) || 1);
      index += 1;
    } else if (token === "--warmups" && next) {
      options.warmups = Math.max(0, Number(next) || 0);
      index += 1;
    } else if (token === "--threshold" && next) {
      options.threshold = Math.max(1, Number(next) || 1.15);
      index += 1;
    } else if (token === "--regression-mode" && next) {
      options.regressionMode = normalizePerfRegressionMode(next);
      index += 1;
    } else if (token === "--baseline-json" && next) {
      options.baselineJson = path.resolve(REPO_ROOT, next);
      index += 1;
    } else if (token === "--baseline-md" && next) {
      options.baselineMd = path.resolve(REPO_ROOT, next);
      index += 1;
    } else if (token === "--raw-dir" && next) {
      options.rawDir = path.resolve(REPO_ROOT, next);
      index += 1;
    } else if (token === "--url-query" && next) {
      options.urlQuery = parseUrlQueryOverrides(next, options.urlQuery);
      index += 1;
    } else if (token === "--write-markdown" && next) {
      options.writeMarkdown = ["1", "true", "yes"].includes(String(next).trim().toLowerCase());
      index += 1;
    }
  }
  return options;
}

export function getBaselineArtifactDate(baselineJsonPath) {
  const artifactName = path.basename(String(baselineJsonPath || ""));
  const match = /^baseline_(\d{4}-\d{2}-\d{2})\.json$/i.exec(artifactName);
  return match?.[1] || PERF_BASELINE_DATE;
}

export function validateBaselineOutputSelection(options = {}) {
  if (options.mode !== "baseline") {
    return;
  }

  const scenarios = Array.isArray(options.scenarios)
    ? options.scenarios.map((scenarioId) => String(scenarioId || "").trim())
    : [];
  const usesCanonicalScenarioSequence =
    scenarios.length === DEFAULT_GATE_SCENARIOS.length
    && scenarios.every(
      (scenarioId, index) => scenarioId === DEFAULT_GATE_SCENARIOS[index]
    );
  if (usesCanonicalScenarioSequence) {
    return;
  }

  const usesCanonicalJsonPath = normalizeMetadataPath(options.baselineJson) === normalizeMetadataPath(DEFAULT_BASELINE_JSON);
  const usesCanonicalMarkdownPath = options.writeMarkdown !== false
    && normalizeMetadataPath(options.baselineMd) === normalizeMetadataPath(DEFAULT_BASELINE_MD);
  const usesCanonicalRawPath = normalizeMetadataPath(options.rawDir) === normalizeMetadataPath(DEFAULT_RAW_DIR);
  if (usesCanonicalJsonPath || usesCanonicalMarkdownPath || usesCanonicalRawPath) {
    throw new Error(
      "[perf-baseline] custom scenarios require custom output paths for JSON, Markdown, and raw measurements."
    );
  }
}

export function normalizePerfRegressionMode(value) {
  const normalized = String(value || "enforce").trim().toLowerCase();
  if (!PERF_REGRESSION_MODES.has(normalized)) {
    throw new Error(`[perf-baseline] Unsupported regression mode: ${JSON.stringify(value)}.`);
  }
  return normalized;
}

export function shouldBlockOnPerfRegressions(regressionMode, failures) {
  if (!Array.isArray(failures)) {
    throw new Error("[perf-baseline] Regression failures must be an array.");
  }
  return normalizePerfRegressionMode(regressionMode) === "enforce" && failures.length > 0;
}

export function isTransientPerfNetworkFailure(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return TRANSIENT_PERF_NETWORK_FAILURE_CODES.some((code) => message.includes(code.toLowerCase()));
}

export async function runWithTransientPerfNetworkRetry(operation, { onRetry = null } = {}) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientPerfNetworkFailure(error)) {
      throw error;
    }
    if (typeof onRetry === "function") {
      await onRetry(error);
    }
    return operation();
  }
}

function parseUrlQueryOverrides(rawValue, baseQuery = PERF_URL_QUERY) {
  const query = { ...(baseQuery || {}) };
  const text = String(rawValue || "").trim();
  if (!text) {
    return query;
  }
  const normalizedText = text.startsWith("?") ? text.slice(1) : text;
  const entries = normalizedText.includes("&")
    ? Array.from(new URLSearchParams(normalizedText).entries())
    : normalizedText
      .split(",")
      .map((entry) => {
        const [key, ...valueParts] = String(entry || "").split("=");
        return [key, valueParts.join("=")];
      });
  entries.forEach(([rawKey, rawEntryValue]) => {
    const key = String(rawKey || "").trim();
    if (!key) {
      return;
    }
    const value = String(rawEntryValue ?? "").trim();
    if (value.toLowerCase() === "unset" || value.toLowerCase() === "delete") {
      delete query[key];
      return;
    }
    query[key] = value;
  });
  return query;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback = null) {
  // 此宽松入口只读取可选的 active-server 元数据；缺失或损坏会按“没有可复用 server”处理，再走完整启服流程。
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function truncateDiagnosticText(value, maxLength = 2_000) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...<truncated>` : text;
}

function truncateStderr(value) {
  return truncateDiagnosticText(value);
}

function sanitizeDiagnosticPathPart(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown";
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function probeUrl(baseUrl) {
  if (!baseUrl) {
    return false;
  }
  try {
    const response = await fetch(new URL("/app/", baseUrl), { method: "GET" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

function normalizeMetadataPath(value) {
  const normalizedPath = path.resolve(String(value || "").trim());
  return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}

function isProcessIdRunning(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }
  try {
    process.kill(numericPid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function shouldReuseActiveServer() {
  return /^(1|true|yes|on)$/i.test(String(process.env.PERF_REUSE_ACTIVE_SERVER || "").trim());
}

function formatWindowsPythonProbeError(reason, stderr) {
  const stderrText = String(stderr || "").trim();
  return stderrText
    ? `[perf-baseline] Unable to resolve Windows Python executable: ${reason}\nstderr:\n${stderrText}`
    : `[perf-baseline] Unable to resolve Windows Python executable: ${reason}`;
}

function resolveWindowsPythonExecutable() {
  const pythonProbe = spawnSync("py", ["-3", "-c", "import sys; print(sys.executable)"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (pythonProbe.error) {
    throw new Error(formatWindowsPythonProbeError(String(pythonProbe.error.message || pythonProbe.error), truncateStderr(pythonProbe.stderr)));
  }
  if (pythonProbe.status === null || pythonProbe.status !== 0) {
    throw new Error(formatWindowsPythonProbeError(`py probe exited with status ${pythonProbe.status}`, truncateStderr(pythonProbe.stderr)));
  }
  const pythonExecutable = String(pythonProbe.stdout || "").trim();
  if (!pythonExecutable) {
    throw new Error(formatWindowsPythonProbeError("py probe returned a blank executable path", truncateStderr(pythonProbe.stderr)));
  }
  return pythonExecutable;
}

function resolveDevServerPythonCommand() {
  const setupPythonRoot = process.env.pythonLocation || process.env.Python_ROOT_DIR || process.env.Python3_ROOT_DIR;
  if (setupPythonRoot) {
    return {
      command: path.join(setupPythonRoot, process.platform === "win32" ? "python.exe" : "bin/python"),
      args: ["tools/dev_server.py"],
    };
  }
  if (process.platform === "win32") {
    const pythonExecutable = resolveWindowsPythonExecutable();
    return { command: pythonExecutable, args: ["tools/dev_server.py"] };
  }
  return { command: "python3", args: ["tools/dev_server.py"] };
}

function activeServerMetadataMatchesRepo(metadata, { expectedPid = null } = {}) {
  const metadataCwd = String(metadata?.cwd || "").trim();
  const metadataPid = Number(metadata?.pid);
  const expectedNumericPid = expectedPid === null
    ? null
    : Number(expectedPid);
  return (
    !!metadataCwd
    && normalizeMetadataPath(metadataCwd) === normalizeMetadataPath(REPO_ROOT)
    && isProcessIdRunning(metadataPid)
    && (expectedNumericPid === null || (Number.isInteger(expectedNumericPid) && metadataPid === expectedNumericPid))
  );
}

async function resolveExistingServerBaseUrl(activeServerPath, options = {}) {
  const metadata = await readJson(activeServerPath, {});
  if (!activeServerMetadataMatchesRepo(metadata, options)) {
    return "";
  }
  const baseUrl = String(metadata?.base_url || metadata?.url || "").trim();
  return (await probeUrl(baseUrl)) ? baseUrl : "";
}

function spawnDevServer() {
  const { command, args } = resolveDevServerPythonCommand();
  const env = {
    ...process.env,
    MAPCREATOR_OPEN_BROWSER: "0",
    MAPCREATOR_RUNTIME_ROOT: PERF_SERVER_RUNTIME_ROOT,
  };
  return Promise.all([
    ensureDir(path.dirname(DEV_SERVER_OUT)),
    ensureDir(path.dirname(DEV_SERVER_ERR)),
  ]).then(async () => {
    const outHandle = await fs.open(DEV_SERVER_OUT, "w");
    const errHandle = await fs.open(DEV_SERVER_ERR, "w");
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(outHandle.createWriteStream());
    child.stderr.pipe(errHandle.createWriteStream());
    return { child, outHandle, errHandle };
  });
}

// perf gate 默认自管隔离 server；只有显式 PERF_REUSE_ACTIVE_SERVER 才读取外部 active_server，避免旧端口污染当前 gate。
async function ensureServerBaseUrl() {
  if (shouldReuseActiveServer()) {
    const existingBaseUrl = await resolveExistingServerBaseUrl(ACTIVE_SERVER_PATH);
    if (existingBaseUrl) {
      return { baseUrl: existingBaseUrl, serverOwner: null };
    }
  }
  const serverOwner = await spawnDevServer();
  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < DEV_SERVER_READY_TIMEOUT_MS) {
      const nextBaseUrl = await resolveExistingServerBaseUrl(PERF_SERVER_ACTIVE_SERVER_PATH, {
        expectedPid: serverOwner.child.pid,
      });
      if (nextBaseUrl) {
        return { baseUrl: nextBaseUrl, serverOwner };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    await stopServer(serverOwner);
    throw error;
  }
  await stopServer(serverOwner);
  throw new Error(`Dev server did not become ready within ${Math.round(DEV_SERVER_READY_TIMEOUT_MS / 1000)} seconds.`);
}

async function ensureMeasurementServer(serverLease) {
  if (
    serverLease?.baseUrl
    && (!serverLease.serverOwner || isProcessIdRunning(serverLease.serverOwner.child.pid))
    && await probeUrl(serverLease.baseUrl)
  ) {
    return serverLease;
  }
  await stopServer(serverLease?.serverOwner || null);
  return ensureServerBaseUrl();
}

async function stopServer(serverOwner) {
  if (!serverOwner) {
    return;
  }
  serverOwner.child.kill("SIGTERM");
  await Promise.allSettled([serverOwner.outHandle.close(), serverOwner.errHandle.close()]);
}

function buildScenarioUrl(baseUrl, scenarioId, urlQuery = PERF_URL_QUERY) {
  const url = new URL("/app/", baseUrl);
  for (const [key, value] of Object.entries(urlQuery || PERF_URL_QUERY)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("default_scenario", scenarioId);
  return url.toString();
}

export function finiteNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function median(values) {
  const numbers = values.map((value) => finiteNumber(value, NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!numbers.length) {
    return 0;
  }
  const middleIndex = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 0) {
    return (numbers[middleIndex - 1] + numbers[middleIndex]) / 2;
  }
  return numbers[middleIndex];
}

function percentile(values, percentileValue) {
  const numbers = values.map((value) => finiteNumber(value, NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!numbers.length) {
    return 0;
  }
  const clampedPercentile = Math.max(0, Math.min(100, Number(percentileValue) || 0));
  const rank = (clampedPercentile / 100) * (numbers.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex === upperIndex) {
    return numbers[lowerIndex];
  }
  return numbers[lowerIndex] + ((numbers[upperIndex] - numbers[lowerIndex]) * (rank - lowerIndex));
}

function summarizeSampleSpread(values) {
  const numbers = values.map((value) => finiteNumber(value, NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!numbers.length) {
    return { count: 0, p50: 0, p90: 0, min: 0, max: 0, spread: 0 };
  }
  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  return {
    count: numbers.length,
    p50: percentile(numbers, 50),
    p90: percentile(numbers, 90),
    min,
    max,
    spread: max - min,
  };
}

function metricAtMs(metric, bootTotal) {
  if (!metric || typeof metric !== "object") {
    return 0;
  }
  if (Number.isFinite(metric.atMs)) {
    return Number(metric.atMs);
  }
  const startedAt = finiteNumber(bootTotal?.startedAt, NaN);
  const finishedAt = finiteNumber(metric.finishedAt, NaN);
  if (Number.isFinite(startedAt) && Number.isFinite(finishedAt)) {
    return Math.max(0, finishedAt - startedAt);
  }
  return 0;
}

export function summarizeSnapshot(snapshot, scenarioId) {
  const bootMetrics = snapshot?.bootMetrics && typeof snapshot.bootMetrics === "object" ? snapshot.bootMetrics : {};
  const renderPerfMetrics = snapshot?.renderPerfMetrics && typeof snapshot.renderPerfMetrics === "object" ? snapshot.renderPerfMetrics : {};
  const scenarioPerfMetrics = snapshot?.scenarioPerfMetrics && typeof snapshot.scenarioPerfMetrics === "object" ? snapshot.scenarioPerfMetrics : {};
  const renderSamples = snapshot?.renderSamples && typeof snapshot.renderSamples === "object" ? snapshot.renderSamples : {};
  const renderSampleRole = analyzeRenderSampleRole({ scenarioId, snapshot });
  const bootTotal = bootMetrics.total && typeof bootMetrics.total === "object" ? bootMetrics.total : {};
  return {
    totalStartupMs: finiteNumber(bootTotal.durationMs),
    topologyLoadedMs: metricAtMs(bootMetrics["base-data"], bootTotal),
    scenarioAppliedMs: metricAtMs(bootMetrics["scenario-apply"], bootTotal),
    firstInteractiveMs: metricAtMs(bootMetrics["time-to-interactive"], bootTotal),
    scenarioFullHydrateMs: finiteNumber(bootMetrics["scenario:full:hydrate"]?.durationMs),
    interactionInfraMs: finiteNumber(bootMetrics["interaction-infra"]?.durationMs),
    startupBundleSource: String(bootMetrics["scenario-apply"]?.source || "").trim(),
    applyScenarioBundleMs: finiteNumber(scenarioPerfMetrics.applyScenarioBundle?.durationMs),
    startupShellApplyReadyMs: finiteNumber(scenarioPerfMetrics.timeToStartupShellApplyReady?.durationMs),
    loadScenarioBundleMs: finiteNumber(scenarioPerfMetrics.loadScenarioBundle?.durationMs),
    workerDecodeMs: finiteNumber(scenarioPerfMetrics.loadScenarioBundle?.workerDecodeMs),
    workerMetaBuildMs: finiteNumber(scenarioPerfMetrics.loadScenarioBundle?.workerMetaBuildMs),
    refreshScenarioApplyMs: finiteNumber(renderPerfMetrics.scenarioApplyMapRefresh?.durationMs),
    refreshColorMs: finiteNumber(renderPerfMetrics.refreshColorState?.durationMs),
    rebuildPoliticalCollectionsMs: finiteNumber(renderPerfMetrics.rebuildPoliticalLandCollections?.durationMs),
    rebuildStaticMeshesMs: finiteNumber(renderPerfMetrics.rebuildStaticMeshes?.durationMs),
    invalidateBorderCacheMs: finiteNumber(renderPerfMetrics.invalidateBorderCache?.durationMs),
    scenarioChunkPromotionInfraStageMs: finiteNumber(renderPerfMetrics.scenarioChunkPromotionInfraStage?.durationMs),
    scenarioChunkPromotionVisualStageMs: finiteNumber(renderPerfMetrics.scenarioChunkPromotionVisualStage?.durationMs),
    chunkPromotionPrimaryRefreshMs: finiteNumber(renderPerfMetrics.chunkPromotionPrimaryRefreshMs?.durationMs),
    chunkPromotionDeferredInfraMs: finiteNumber(renderPerfMetrics.chunkPromotionDeferredInfraMs?.durationMs),
    zoomEndToChunkVisibleMs: finiteNumber(renderPerfMetrics.zoomEndToChunkVisibleMs?.durationMs),
    interactionRecoveryWindowMs: finiteNumber(renderPerfMetrics.interactionRecoveryWindowMs?.durationMs),
    interactionRecoveryTaskMs: finiteNumber(renderPerfMetrics.interactionRecoveryTaskMs?.durationMs),
    visibleFrameTransactionMs: finiteNumber(renderPerfMetrics.visibleFrameTransaction?.durationMs),
    visibleFrameTransactionCount: finiteNumber(renderPerfMetrics.visibleFrameTransaction?.count),
    visibleFrameRejectedCount: finiteNumber(renderPerfMetrics.visibleFrameTransaction?.rejectedCount),
    visibleFrameMissingCount: finiteNumber(renderPerfMetrics.visibleFrameTransaction?.missingCount),
    continuityFrameStaleAgeMs: finiteNumber(renderPerfMetrics.continuityFrameStaleAgeMs?.durationMs),
    missingVisibleFrameCount: finiteNumber(renderPerfMetrics.missingVisibleFrameCount?.count),
    fillPatchInputToFirstPixelMs: finiteNumber(renderPerfMetrics.fillPatchInputToFirstPixelMs?.durationMs),
    postReadyMaxPendingAgeMs: finiteNumber(renderPerfMetrics.postReadySchedulerState?.maxPendingAgeMs),
    postReadyMaxRetryCount: finiteNumber(renderPerfMetrics.postReadySchedulerState?.maxRetryCount),
    drawContextScenarioPassMs: finiteNumber(renderPerfMetrics.drawContextScenarioPass?.durationMs),
    setMapDataFirstPaintMs: finiteNumber(renderPerfMetrics.setMapDataFirstPaint?.durationMs),
    buildHitCanvasMs: finiteNumber(renderPerfMetrics.buildHitCanvas?.durationMs),
    settleExactRefreshMs: finiteNumber(renderPerfMetrics.settleExactRefresh?.durationMs),
    settleExactRefreshApplyMs: finiteNumber(renderPerfMetrics.settleExactRefreshApply?.durationMs),
    settleExactRefreshPassesMs: finiteNumber(renderPerfMetrics.settleExactRefreshPasses?.durationMs),
    settleExactRefreshWaitForPaintMs: finiteNumber(renderPerfMetrics.settleExactRefreshWaitForPaint?.durationMs),
    settleExactRefreshFinalizeMs: finiteNumber(renderPerfMetrics.settleExactRefreshFinalize?.durationMs),
    settleExactRefreshPhaseBreakdownMs: finiteNumber(renderPerfMetrics.settleExactRefreshPhaseBreakdown?.durationMs),
    renderSampleCount: finiteNumber(renderSamples.count),
    renderSampleTotalMs: finiteNumber(renderSamples.totalMs),
    renderSampleMedianMs: finiteNumber(renderSamples.medianMs),
    canonicalRenderSampleMs: finiteNumber(renderSampleRole.canonicalRenderSampleMs),
    preScenarioRenderSampleCount: finiteNumber(renderSampleRole.preScenarioSampleCount),
  };
}

function normalizeScenarioId(value) {
  return String(value || "").trim();
}

function getScenarioSampleRole(scenarioId) {
  return DEFAULT_GATE_SCENARIOS.includes(scenarioId) ? "gate" : "observation";
}

function readCanonicalNodePlatform(value) {
  return typeof value === "string" && NODE_PLATFORM_IDS.has(value) ? value : "";
}

function readPositiveIntegerIdentity(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function readRequiredIdentityString(value) {
  return typeof value === "string" && value.trim() === value && value ? value : "";
}

function readRunnerIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const identity = {
    provider: readRequiredIdentityString(value.provider),
    environment: readRequiredIdentityString(value.environment),
    os: readRequiredIdentityString(value.os),
    arch: readRequiredIdentityString(value.arch),
    imageOs: readRequiredIdentityString(value.imageOs),
    imageVersion: readRequiredIdentityString(value.imageVersion),
  };
  return Object.values(identity).every(Boolean) ? identity : null;
}

function collectRunnerIdentity() {
  const provider = process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "local";
  return {
    provider,
    environment: String(process.env.RUNNER_ENVIRONMENT || provider),
    os: String(process.env.RUNNER_OS || os.platform()),
    arch: String(process.env.RUNNER_ARCH || os.arch()),
    imageOs: String(process.env.ImageOS || process.env.RUNNER_OS || os.platform()),
    imageVersion: String(process.env.ImageVersion || os.release()),
  };
}

function parseNodeMajor(value) {
  const match = String(value || "").trim().match(/^v?(?<major>\d+)/);
  if (!match?.groups?.major) {
    return 0;
  }
  return Number.parseInt(match.groups.major, 10) || 0;
}

function collectEnvironment({ browserVersion = "", packageLockSha256 = "" } = {}) {
  const cpus = os.cpus();
  return {
    os: `${os.platform()} ${os.release()}`,
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpuModel: String(cpus[0]?.model || "").trim(),
    cpuCount: cpus.length,
    memoryGiB: Math.max(1, Math.round(os.totalmem() / (1024 ** 3))),
    runnerIdentity: collectRunnerIdentity(),
    node: process.version,
    nodeMajor: parseNodeMajor(process.version),
    browser: "chromium-headless",
    browserVersion: String(browserVersion || "").trim(),
    packageLockSha256: String(packageLockSha256 || "").trim(),
  };
}

function aggregateRuns(runs) {
  const summaries = runs.map((run) => run.summary || {});
  const fieldNames = [
    "totalStartupMs",
    "topologyLoadedMs",
    "scenarioAppliedMs",
    "firstInteractiveMs",
    "scenarioFullHydrateMs",
    "interactionInfraMs",
    "applyScenarioBundleMs",
    "startupShellApplyReadyMs",
    "loadScenarioBundleMs",
    "workerDecodeMs",
    "workerMetaBuildMs",
    "refreshScenarioApplyMs",
    "refreshColorMs",
    "rebuildPoliticalCollectionsMs",
    "rebuildStaticMeshesMs",
    "invalidateBorderCacheMs",
    "scenarioChunkPromotionInfraStageMs",
    "scenarioChunkPromotionVisualStageMs",
    "chunkPromotionPrimaryRefreshMs",
    "chunkPromotionDeferredInfraMs",
    "zoomEndToChunkVisibleMs",
    "interactionRecoveryWindowMs",
    "interactionRecoveryTaskMs",
    "visibleFrameTransactionMs",
    "visibleFrameTransactionCount",
    "visibleFrameRejectedCount",
    "visibleFrameMissingCount",
    "continuityFrameStaleAgeMs",
    "missingVisibleFrameCount",
    "fillPatchInputToFirstPixelMs",
    "postReadyMaxPendingAgeMs",
    "postReadyMaxRetryCount",
    "drawContextScenarioPassMs",
    "setMapDataFirstPaintMs",
    "buildHitCanvasMs",
    "settleExactRefreshMs",
    "settleExactRefreshApplyMs",
    "settleExactRefreshPassesMs",
    "settleExactRefreshWaitForPaintMs",
    "settleExactRefreshFinalizeMs",
    "settleExactRefreshPhaseBreakdownMs",
    "renderSampleCount",
    "renderSampleTotalMs",
    "renderSampleMedianMs",
    "canonicalRenderSampleMs",
    "preScenarioRenderSampleCount",
  ];
  const medianSummary = {};
  for (const fieldName of fieldNames) {
    medianSummary[fieldName] = median(summaries.map((summary) => summary[fieldName]));
  }
  medianSummary.startupBundleSource = summaries
    .map((summary) => String(summary.startupBundleSource || "").trim())
    .find(Boolean) || "";
  return medianSummary;
}

function buildAggregateSampleSpread(runs) {
  const summaries = runs.map((run) => run.summary || {});
  const spread = {};
  const metricKeys = [
    ...GATE_METRICS.map((metric) => metric.key),
    "scenarioChunkPromotionVisualStageMs",
    "chunkPromotionPrimaryRefreshMs",
    "chunkPromotionDeferredInfraMs",
    "interactionRecoveryWindowMs",
    "settleExactRefreshMs",
    "renderSampleCount",
    "canonicalRenderSampleMs",
  ];
  for (const metricKey of Array.from(new Set(metricKeys))) {
    spread[metricKey] = summarizeSampleSpread(summaries.map((summary) => summary[metricKey]));
  }
  return spread;
}

function buildScenarioWorkloadIdentity(manifestIdentity, options, baseUrl) {
  return {
    ...manifestIdentity,
    baseUrl,
    runs: options.runs,
    warmups: options.warmups,
    urlQuery: options.urlQuery,
  };
}

function buildReportWorkloadIdentity(options, measurement) {
  const scenarios = {};
  for (const [scenarioId, scenario] of Object.entries(measurement.scenarios || {})) {
    scenarios[scenarioId] = scenario.workloadIdentity || {};
  }
  return {
    scenarioIds: options.scenarios,
    runs: options.runs,
    warmups: options.warmups,
    threshold: options.threshold,
    urlQuery: options.urlQuery,
    baseUrl: measurement.baseUrl,
    scenarios,
  };
}

async function readScenarioManifestIdentity(scenarioId) {
  const manifestPath = SCENARIO_MANIFEST_MAP[scenarioId];
  const relativeManifestPath = path.relative(REPO_ROOT, manifestPath).replaceAll("\\", "/");
  let manifest = {};
  let manifestSha256 = "";
  try {
    const content = await fs.readFile(manifestPath, "utf8");
    manifestSha256 = crypto.createHash("sha256").update(content).digest("hex");
    manifest = JSON.parse(content);
  } catch (_error) {
    manifest = {};
  }
  return {
    scenarioId,
    manifestPath: relativeManifestPath,
    manifestSha256,
    featureCount: finiteNumber(manifest?.summary?.feature_count),
    sampleRole: getScenarioSampleRole(scenarioId),
  };
}

async function readPerfRuntimeState(page) {
  return page.evaluate(() => {
    const snapshot = typeof globalThis.__mapcreator__?.snapshot === "function"
      ? globalThis.__mapcreator__.snapshot()
      : null;
    const mainLoadStatus = snapshot?.loadStatus?.providers?.main_runtime || {};
    const mainVersion = snapshot?.version?.providers?.main_runtime || {};
    const boot = mainLoadStatus.boot || {};
    const startup = mainLoadStatus.startup || {};
    return {
      bootPhase: String(boot.phase || mainVersion.bootPhase || ""),
      bootBlocking: boot.blocking === false ? false : !!boot.blocking,
      startupReadonly: !!boot.readonly,
      startupReadonlyUnlockInFlight: !!boot.readonlyUnlockInFlight,
      scenarioApplyInFlight: !!boot.scenarioApplyInFlight,
      activeScenarioId: String(startup.activeScenarioId || mainVersion.activeScenarioId || ""),
      startupInteractionMode: String(boot.interactionMode || ""),
      bootError: String(boot.error || ""),
      snapshotAvailable: !!snapshot,
    };
  });
}

async function collectPerfBrowserRuntimeSnapshot(page) {
  try {
    const domSnapshot = await page.evaluate(() => {
      const overlay = document.querySelector("#bootOverlay");
      const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]'))
        .map((script) => script.getAttribute("src") || "")
        .filter(Boolean);
      return {
        href: String(globalThis.location?.href || ""),
        readyState: String(document.readyState || ""),
        title: String(document.title || ""),
        bodyClassName: String(document.body?.className || ""),
        moduleScripts,
        perfSnapshotAvailable: typeof globalThis.__mc_perf__?.snapshot === "function",
        mapcreatorSnapshotAvailable: typeof globalThis.__mapcreator__?.snapshot === "function",
        bootOverlay: {
          present: !!overlay,
          hidden: !!overlay?.classList?.contains("hidden"),
          text: String(overlay?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 800),
        },
      };
    });
    return {
      ...domSnapshot,
      state: await readPerfRuntimeState(page),
    };
  } catch (error) {
    return {
      evaluationError: String(error?.stack || error?.message || error || ""),
    };
  }
}

function createPerfBrowserDiagnostics(page, { scenarioId, runLabel, targetUrl } = {}) {
  const events = [];
  let transientNetworkFailure = null;
  const pushEvent = (event) => {
    events.push({
      at: new Date().toISOString(),
      ...event,
    });
    while (events.length > PERF_BROWSER_DIAGNOSTICS_EVENT_LIMIT) {
      events.shift();
    }
  };
  page.on("console", (message) => {
    pushEvent({
      kind: "console",
      type: message.type(),
      text: truncateDiagnosticText(message.text()),
      location: message.location(),
    });
  });
  page.on("pageerror", (error) => {
    pushEvent({
      kind: "pageerror",
      message: truncateDiagnosticText(error?.message || error),
      stack: truncateDiagnosticText(error?.stack || ""),
    });
  });
  page.on("requestfailed", (request) => {
    const failure = truncateDiagnosticText(request.failure()?.errorText || "");
    const url = truncateDiagnosticText(request.url());
    if (!transientNetworkFailure && isTransientPerfNetworkFailure(failure)) {
      transientNetworkFailure = { failure, url };
    }
    pushEvent({
      kind: "requestfailed",
      method: request.method(),
      resourceType: request.resourceType(),
      url,
      failure,
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) {
      return;
    }
    pushEvent({
      kind: "http-error",
      status,
      statusText: response.statusText(),
      resourceType: response.request().resourceType(),
      url: truncateDiagnosticText(response.url()),
    });
  });
  page.on("crash", () => {
    pushEvent({ kind: "page-crash" });
  });
  return {
    getTransientNetworkFailure() {
      return transientNetworkFailure;
    },
    async write(error) {
      const diagnosticScenarioId = sanitizeDiagnosticPathPart(scenarioId);
      const diagnosticRunLabel = sanitizeDiagnosticPathPart(runLabel || "run");
      const filePath = path.join(
        PERF_BROWSER_DIAGNOSTICS_DIR,
        `${diagnosticScenarioId}-${diagnosticRunLabel}-${Date.now()}.json`
      );
      await writeJson(filePath, {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        scenarioId,
        runLabel,
        targetUrl,
        error: {
          message: truncateDiagnosticText(error?.message || error),
          stack: truncateDiagnosticText(error?.stack || ""),
        },
        runtimeSnapshot: await collectPerfBrowserRuntimeSnapshot(page),
        events,
      });
      return filePath;
    },
  };
}

export function annotatePerfErrorWithDiagnostics(error, relativeDiagnosticsPath) {
  if (!error || typeof error !== "object") {
    return error;
  }
  const diagnosticsLine = `[perf-baseline] Browser diagnostics: ${relativeDiagnosticsPath}`;
  if ("message" in error && !String(error.message || "").includes(diagnosticsLine)) {
    error.message = `${String(error.message || error)}\n${diagnosticsLine}`;
  }
  if ("stack" in error && typeof error.stack === "string" && !error.stack.includes(diagnosticsLine)) {
    error.stack = `${error.stack}\n${diagnosticsLine}`;
  }
  return error;
}

async function measureOneRun(browser, baseUrl, scenarioId, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const targetUrl = buildScenarioUrl(baseUrl, scenarioId, options.urlQuery);
  const diagnostics = createPerfBrowserDiagnostics(page, {
    scenarioId,
    runLabel: options.runLabel || "run",
    targetUrl,
  });
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitForPerfSnapshotReady(page, {
      timeoutMs: 120_000,
      getTransientNetworkFailure: diagnostics.getTransientNetworkFailure,
    });
    await page.waitForTimeout(300);
    const snapshot = await page.evaluate(() => globalThis.__mc_perf__?.snapshot?.() ?? null);
    if (!snapshot) {
      throw new Error("window.__mc_perf__.snapshot() returned null.");
    }
    const activeScenarioId = String((await readPerfRuntimeState(page)).activeScenarioId || "").trim();
    if (activeScenarioId !== normalizeScenarioId(scenarioId)) {
      throw new Error(
        `[perf-baseline] Scenario activation mismatch for ${scenarioId}: activeScenarioId=${activeScenarioId || "<empty>"}`
      );
    }
    return {
      url: targetUrl,
      activeScenarioId,
      snapshot,
      summary: summarizeSnapshot(snapshot, scenarioId),
      renderSampleRole: analyzeRenderSampleRole({ scenarioId, snapshot }),
    };
  } catch (error) {
    try {
      const diagnosticsPath = await diagnostics.write(error);
      const relativeDiagnosticsPath = path.relative(REPO_ROOT, diagnosticsPath).replaceAll("\\", "/");
      annotatePerfErrorWithDiagnostics(error, relativeDiagnosticsPath);
    } catch (diagnosticsError) {
      console.warn(
        "[perf-baseline] Failed to write browser diagnostics:",
        diagnosticsError?.stack || diagnosticsError?.message || diagnosticsError
      );
    }
    throw error;
  } finally {
    await context.close();
  }
}

async function waitForPerfSnapshotReady(
  page,
  {
    timeoutMs = 120_000,
    getTransientNetworkFailure = null,
  } = {},
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const transientNetworkFailure =
      typeof getTransientNetworkFailure === "function" ? getTransientNetworkFailure() : null;
    if (transientNetworkFailure) {
      throw new Error(
        `[perf-baseline] transient network failure ${transientNetworkFailure.failure}: ${transientNetworkFailure.url}`
      );
    }
    const snapshot = await readPerfRuntimeState(page);
    if (snapshot.bootError) {
      throw new Error(`[perf-baseline] bootError=${snapshot.bootError}`);
    }
    if (
      snapshot.bootPhase === "ready"
      && snapshot.bootBlocking === false
      && !snapshot.startupReadonlyUnlockInFlight
      && !snapshot.scenarioApplyInFlight
    ) {
      return snapshot;
    }
    await page.waitForTimeout(500);
  }
  const finalDomSnapshot = await page.evaluate(() => {
    const overlay = document.querySelector("#bootOverlay");
    return {
      href: String(globalThis.location?.href || ""),
      readyState: String(document.readyState || ""),
      overlayHidden: !!overlay?.classList?.contains("hidden"),
    };
  });
  const finalSnapshot = {
    ...finalDomSnapshot,
    ...await readPerfRuntimeState(page),
  };
  throw new Error(`[perf-baseline] app did not reach ready state in ${timeoutMs}ms: ${JSON.stringify(finalSnapshot)}`);
}

async function measureScenarioRun(browser, serverLeaseRef, scenarioId, options) {
  // 每次尝试都重新校验 server lease，让一次网络重试同时具备探活和按需重启能力。
  return runWithTransientPerfNetworkRetry(
    async () => {
      serverLeaseRef.current = await ensureMeasurementServer(serverLeaseRef.current);
      return measureOneRun(browser, serverLeaseRef.current.baseUrl, scenarioId, options);
    },
    {
      onRetry(error) {
        const reason = String(error?.message || error || "").split(/\r?\n/, 1)[0];
        console.warn(
          `[perf-baseline] Retrying ${scenarioId} ${options.runLabel || "run"} once after transient Chromium network failure: ${reason}`
        );
      },
    },
  );
}

async function runScenarioSeries(browser, serverLeaseRef, scenarioId, options) {
  const manifestIdentity = await readScenarioManifestIdentity(scenarioId);
  const featureCount = finiteNumber(manifestIdentity.featureCount);
  const scenarioDir = path.join(options.rawDir, scenarioId);
  await ensureDir(scenarioDir);
  const warmups = [];
  for (let index = 0; index < options.warmups; index += 1) {
    const run = await measureScenarioRun(browser, serverLeaseRef, scenarioId, {
      ...options,
      runLabel: `warmup-${String(index + 1).padStart(2, "0")}`,
      urlQuery: options.urlQuery,
    });
    warmups.push(run.summary);
  }
  const runs = [];
  for (let index = 0; index < options.runs; index += 1) {
    const run = await measureScenarioRun(browser, serverLeaseRef, scenarioId, {
      ...options,
      runLabel: `run-${String(index + 1).padStart(2, "0")}`,
      urlQuery: options.urlQuery,
    });
    const filePath = path.join(scenarioDir, `run-${String(index + 1).padStart(2, "0")}.json`);
    await writeJson(filePath, run);
    runs.push({
      ...run,
      rawPath: path.relative(REPO_ROOT, filePath).replaceAll("\\", "/"),
    });
  }
  const lastBaseUrl = serverLeaseRef.current?.baseUrl || "";
  return {
    scenarioId,
    sampleRole: getScenarioSampleRole(scenarioId),
    featureCount,
    workloadIdentity: buildScenarioWorkloadIdentity(manifestIdentity, options, lastBaseUrl),
    warmups,
    runs,
    summary: aggregateRuns(runs),
    sampleSpread: buildAggregateSampleSpread(runs),
    renderSampleRoleSummary: summarizeRenderSampleRoleAnalyses(runs.map((run) => run.renderSampleRole)),
  };
}

function formatMetricRow(label, value) {
  return `- ${label}: ${finiteNumber(value).toFixed(1)} ms`;
}

function formatCountRow(label, value) {
  return `- ${label}: ${finiteNumber(value).toFixed(0)}`;
}

function buildMarkdown(report) {
  const configuredScenarios = Array.isArray(report?.config?.scenarios)
    ? report.config.scenarios.map((scenarioId) => String(scenarioId || "").trim()).filter(Boolean)
    : [];
  const gateScenarios = configuredScenarios
    .filter((scenarioId) => DEFAULT_GATE_SCENARIOS.includes(scenarioId))
    .join(", ") || "none";
  const observationScenarios = configuredScenarios
    .filter((scenarioId) => !DEFAULT_GATE_SCENARIOS.includes(scenarioId))
    .join(", ") || "none";
  const lines = [
    `# Perf baseline ${report.baselineDate || PERF_BASELINE_DATE}`,
    "",
    "## Environment",
    `- Generated at: ${report.generatedAt}`,
    `- Git HEAD: ${report.gitHead}`,
    `- OS: ${report.environment.os}`,
    `- Architecture: ${report.environment.arch}`,
    `- CPU: ${report.environment.cpuModel} (${report.environment.cpuCount} logical processors)`,
    `- Memory class: ${report.environment.memoryGiB} GiB`,
    `- Runner: ${JSON.stringify(report.environment.runnerIdentity)}`,
    `- Node: ${report.environment.node}`,
    `- Browser: ${report.environment.browser}`,
    `- Browser version: ${report.environment.browserVersion}`,
    `- package-lock.json SHA256: ${report.environment.packageLockSha256}`,
    `- Gate scenarios: ${gateScenarios}`,
    `- Observation samples: ${observationScenarios}`,
    "",
  ];
  for (const scenarioId of Object.keys(report.scenarios)) {
    const entry = report.scenarios[scenarioId];
    const summary = entry.summary || {};
    lines.push(`## Scenario: ${scenarioId}`);
    lines.push(`- sample_role: ${String(entry.sampleRole || getScenarioSampleRole(scenarioId))}`);
    lines.push(`- Runs: ${entry.runs.length}`);
    lines.push(`- feature_count: ${entry.featureCount}`);
    lines.push(formatMetricRow("Total startup", summary.totalStartupMs));
    lines.push(formatMetricRow("Topology loaded", summary.topologyLoadedMs));
    lines.push(formatMetricRow("Scenario applied", summary.scenarioAppliedMs));
    lines.push(formatMetricRow("First interactive", summary.firstInteractiveMs));
    lines.push(formatMetricRow("scenario full hydrate", summary.scenarioFullHydrateMs));
    lines.push(formatMetricRow("interaction infra", summary.interactionInfraMs));
    lines.push(`- startup bundle source: ${String(summary.startupBundleSource || "") || "unknown"}`);
    lines.push(formatMetricRow("applyScenarioBundle", summary.applyScenarioBundleMs));
    lines.push(formatMetricRow("startup shell apply-ready", summary.startupShellApplyReadyMs));
    lines.push(formatMetricRow("loadScenarioBundle", summary.loadScenarioBundleMs));
    lines.push(formatMetricRow("worker decode", summary.workerDecodeMs));
    lines.push(formatMetricRow("worker meta build", summary.workerMetaBuildMs));
    lines.push(formatMetricRow("refresh scenario apply", summary.refreshScenarioApplyMs));
    lines.push(formatMetricRow("refresh color", summary.refreshColorMs));
    lines.push(formatMetricRow("rebuild political collections", summary.rebuildPoliticalCollectionsMs));
    lines.push(formatMetricRow("rebuild static meshes", summary.rebuildStaticMeshesMs));
    lines.push(formatMetricRow("invalidate border cache", summary.invalidateBorderCacheMs));
    lines.push(formatMetricRow("scenario chunk promotion infra stage", summary.scenarioChunkPromotionInfraStageMs));
    lines.push(formatMetricRow("scenario chunk promotion visual stage", summary.scenarioChunkPromotionVisualStageMs));
    lines.push(formatMetricRow("zoom end to chunk visible", summary.zoomEndToChunkVisibleMs));
    lines.push(formatMetricRow("interaction recovery window", summary.interactionRecoveryWindowMs));
    lines.push(formatMetricRow("interaction recovery task", summary.interactionRecoveryTaskMs));
    lines.push(formatMetricRow("visible frame transaction", summary.visibleFrameTransactionMs));
    lines.push(formatCountRow("visible frame transaction count", summary.visibleFrameTransactionCount));
    lines.push(formatCountRow("visible frame rejected count", summary.visibleFrameRejectedCount));
    lines.push(formatCountRow("visible frame missing count", summary.visibleFrameMissingCount));
    lines.push(formatMetricRow("continuity frame stale age", summary.continuityFrameStaleAgeMs));
    lines.push(formatCountRow("missing visible frame count", summary.missingVisibleFrameCount));
    lines.push(formatMetricRow("fill patch input to first pixel", summary.fillPatchInputToFirstPixelMs));
    lines.push(formatMetricRow("post-ready max pending age", summary.postReadyMaxPendingAgeMs));
    lines.push(formatMetricRow("post-ready max retry count", summary.postReadyMaxRetryCount));
    lines.push(formatMetricRow("draw context scenario pass", summary.drawContextScenarioPassMs));
    lines.push(formatMetricRow("setMapData first paint", summary.setMapDataFirstPaintMs));
    lines.push(formatMetricRow("build hit canvas", summary.buildHitCanvasMs));
    lines.push(formatMetricRow("settle exact refresh", summary.settleExactRefreshMs));
    lines.push(formatMetricRow("settle exact apply", summary.settleExactRefreshApplyMs));
    lines.push(formatMetricRow("settle exact passes", summary.settleExactRefreshPassesMs));
    lines.push(formatMetricRow("settle exact wait for paint", summary.settleExactRefreshWaitForPaintMs));
    lines.push(formatMetricRow("settle exact finalize", summary.settleExactRefreshFinalizeMs));
    lines.push(`- render samples: ${finiteNumber(summary.renderSampleCount).toFixed(0)} calls / ${finiteNumber(summary.renderSampleTotalMs).toFixed(1)} ms total / ${finiteNumber(summary.renderSampleMedianMs).toFixed(1)} ms median`);
    const roleSummary = entry.renderSampleRoleSummary || {};
    lines.push(`- render sample role policy: ${String(roleSummary.policyId || RENDER_SAMPLE_ROLE_POLICY_ID)}`);
    lines.push(`- canonical render sample role: ${String(roleSummary.canonicalRoleId || CANONICAL_RENDER_SAMPLE_ROLE_ID)}`);
    lines.push(`- canonical render sample: ${finiteNumber(summary.canonicalRenderSampleMs).toFixed(1)} ms median / ${finiteNumber(roleSummary.matchedRunCount).toFixed(0)} matched runs / ${finiteNumber(roleSummary.mismatchCount).toFixed(0)} mismatches`);
    lines.push("");
  }
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return `${lines.join("\n")}\n`;
}

export async function readJsonAndSha256Strict(
  filePath,
  label = "json payload",
  { readFile = fs.readFile } = {},
) {
  let rawBytes;
  try {
    rawBytes = await readFile(filePath);
  } catch (error) {
    throw new Error(`[perf-baseline] Unable to read ${label}: ${filePath}. ${String(error?.message || error)}`);
  }
  const bytes = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
  let payload;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`[perf-baseline] Unable to parse ${label}: ${filePath}. ${String(error?.message || error)}`);
  }
  return {
    payload,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function readEnvironmentAdmissionIdentity(report) {
  const admission = report?.environmentAdmission;
  if (!admission || typeof admission !== "object" || Array.isArray(admission)) return null;
  const reportPlatform = readCanonicalNodePlatform(report?.environment?.platform);
  const validation = validateStandardPerfAdmissionDecision(admission, {
    expectedPlatform: reportPlatform,
    expectedGitHead: report?.gitHead,
  });
  return validation.valid ? validation.identity : null;
}

function readGenerationFenceIdentity(report) {
  const fence = report?.generationFence;
  if (!fence || typeof fence !== "object" || Array.isArray(fence)) return null;
  const failures = Array.isArray(fence.failures) ? fence.failures : null;
  const gitHead = String(fence.git?.head || "").trim().toLowerCase();
  const reportHead = String(report?.gitHead || "").trim().toLowerCase();
  const gitEvidenceValid = fence.git?.status === "available"
    && /^[0-9a-f]{40,64}$/.test(gitHead)
    && gitHead === reportHead
    && Array.isArray(fence.git?.runtimePaths)
    && fence.git.runtimePaths.length === 0
    && Array.isArray(fence.git?.harnessPaths)
    && fence.git.harnessPaths.length === 0
    && Array.isArray(fence.git?.invalidPaths)
    && fence.git.invalidPaths.length === 0;
  const beforeOracleSha = String(fence.baselineOracle?.beforeSha256 || "").trim().toLowerCase();
  const afterOracleSha = String(fence.baselineOracle?.afterSha256 || "").trim().toLowerCase();
  const reportMode = String(report?.mode || "").trim().toLowerCase();
  const oracleEvidenceValid = reportMode === "gate"
    ? /^[0-9a-f]{64}$/.test(beforeOracleSha) && beforeOracleSha === afterOracleSha
    : reportMode === "baseline" && !beforeOracleSha && !afterOracleSha;
  const reportPlatform = readCanonicalNodePlatform(report?.environment?.platform);
  const admissionPowerSchemeGuid = String(report?.environmentAdmission?.power?.activeSchemeGuid || "").trim().toLowerCase();
  const powerStatus = String(fence.power?.status || "").trim();
  const powerSchemeGuid = String(fence.power?.activeSchemeGuid || "").trim().toLowerCase();
  const powerEvidenceValid = reportPlatform === "win32"
    ? powerStatus === "available"
      && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(powerSchemeGuid)
      && powerSchemeGuid === admissionPowerSchemeGuid
      && fence.power?.acLineStatus === 1
    : powerStatus === "not-applicable" || powerStatus === "available";
  if (
    fence.schemaVersion !== 1
    || fence.policyId !== STANDARD_PERF_GENERATION_FENCE_POLICY_ID
    || fence.status !== "stable"
    || fence.exitCode !== STANDARD_PERF_ADMISSION_EXIT_CODES.accepted
    || failures?.length !== 0
    || !gitEvidenceValid
    || !oracleEvidenceValid
    || !powerEvidenceValid
  ) return null;
  return { gitHead, powerSchemeGuid, beforeOracleSha, afterOracleSha };
}

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function runMeasurements(options) {
  const serverLeaseRef = {
    current: await ensureServerBaseUrl(),
  };
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  try {
    const scenarios = {};
    for (const scenarioId of options.scenarios) {
      scenarios[scenarioId] = await runScenarioSeries(browser, serverLeaseRef, scenarioId, options);
    }
    return { baseUrl: serverLeaseRef.current?.baseUrl || "", browserVersion, scenarios };
  } finally {
    await browser.close();
    await stopServer(serverLeaseRef.current?.serverOwner || null);
  }
}

async function sha256FileOrNull(filePath) {
  try {
    return await sha256File(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function runStandardPerfAdmission(
  options,
  { collectEvidence = collectStandardPerfAdmissionEvidence } = {},
) {
  const evidence = await collectEvidence({ cwd: REPO_ROOT });
  const decision = evaluateStandardPerfAdmission(evidence);
  const artifactPath = path.join(options.rawDir, "perf-admission.json");
  await writeJson(artifactPath, decision);
  if (decision.status !== "admitted") {
    throw new PerfEnvironmentAdmissionError(decision);
  }
  return decision;
}

export async function runStandardPerfGenerationFence(
  options,
  environmentAdmission,
  {
    baselineOracleBeforeSha256 = null,
    collectStabilityEvidence = collectStandardPerfStabilityEvidence,
    readBaselineOracleSha256 = sha256FileOrNull,
  } = {},
) {
  const evidence = await collectStabilityEvidence({ cwd: REPO_ROOT });
  let baselineOracleAfterSha256 = null;
  if (options.mode === "gate") {
    try {
      baselineOracleAfterSha256 = await readBaselineOracleSha256(options.baselineJson);
    } catch (_error) {
      baselineOracleAfterSha256 = null;
    }
  }
  const decision = evaluateStandardPerfGenerationFence(environmentAdmission, evidence, {
    baselineOracleBeforeSha256,
    baselineOracleAfterSha256,
  });
  await writeJson(path.join(options.rawDir, "perf-generation-fence.json"), decision);
  if (decision.status !== "stable") throw new PerfGenerationFenceError(decision);
  return decision;
}

async function writeBaselineArtifacts(options, report) {
  await writeJson(options.baselineJson, report);
  if (options.writeMarkdown) {
    await ensureDir(path.dirname(options.baselineMd));
    await fs.writeFile(options.baselineMd, buildMarkdown(report), "utf8");
  }
}

const PERF_REPORT_CONTRACT_FIELDS = [
  { key: "benchmarkMetricsSchemaVersion", expected: "3.3" },
  { key: "probeSchema", expected: "mc_perf_snapshot" },
];

function getPerfReportContractMismatches(report, label = "report") {
  const mismatches = PERF_REPORT_CONTRACT_FIELDS
    .filter(({ key, expected }) => report?.[key] !== expected)
    .map(({ key, expected }) => `${label}.${key} expected=${JSON.stringify(expected)} actual=${JSON.stringify(report?.[key])}`);
  if (report?.schemaVersion !== CURRENT_PERF_REPORT_SCHEMA_VERSION) {
    mismatches.unshift(`${label}.schemaVersion expected=${CURRENT_PERF_REPORT_SCHEMA_VERSION} actual=${JSON.stringify(report?.schemaVersion)}`);
  }
  if (!readEnvironmentAdmissionIdentity(report)) {
    mismatches.push(`${label}.environmentAdmission must be admitted under ${STANDARD_PERF_ADMISSION_POLICY.policyId}`);
  }
  if (!readGenerationFenceIdentity(report)) {
    mismatches.push(`${label}.generationFence must be stable under ${STANDARD_PERF_GENERATION_FENCE_POLICY_ID}`);
  }
  return mismatches;
}

function compareAgainstBaseline(currentReport, baselineReport, threshold) {
  const failures = [];
  for (const scenarioId of Object.keys(currentReport.scenarios)) {
    const currentSummary = currentReport.scenarios[scenarioId]?.summary || {};
    const baselineSummary = baselineReport?.scenarios?.[scenarioId]?.summary || {};
    for (const metric of GATE_METRICS) {
      const baselineValue = finiteNumber(baselineSummary?.[metric.key]);
      const currentValue = finiteNumber(currentSummary?.[metric.key]);
      if (baselineValue <= 0) {
        continue;
      }
      const allowedRatio = Number.isFinite(metric.threshold) ? metric.threshold : threshold;
      const limit = baselineValue * allowedRatio;
      if (currentValue > limit) {
        failures.push({
          scenarioId,
          metricKey: metric.key,
          allowedRatio,
          baselineValue,
          currentValue,
          limit,
        });
      }
    }
  }
  return failures;
}

function formatPerfRegressionFailures(failures) {
  return failures
    .map(
      (failure) => `${failure.scenarioId}.${failure.metricKey}: current=${failure.currentValue.toFixed(1)}ms baseline=${failure.baselineValue.toFixed(1)}ms limit=${failure.limit.toFixed(1)}ms ratio=${failure.allowedRatio.toFixed(2)}`
    )
    .join("\n");
}

export function validateGateBaselineReport(baselineReport, scenarioIds, baselinePath) {
  if (!baselineReport || typeof baselineReport !== "object") {
    throw new Error(`[perf-baseline] Baseline report is invalid: ${baselinePath}`);
  }
  const baselineContractMismatches = getPerfReportContractMismatches(baselineReport, "baseline");
  if (baselineContractMismatches.length) {
    throw new Error(
      `[perf-baseline] Baseline report schema mismatch: ${baselinePath}\n${baselineContractMismatches.map((item) => `- ${item}`).join("\n")}`
    );
  }
  const expectedScenarioIds = Array.isArray(scenarioIds)
    ? scenarioIds.map((scenarioId) => String(scenarioId || "").trim())
    : [];
  const baselineScenarioValues = baselineReport?.config?.scenarios;
  const baselineScenarioIds = Array.isArray(baselineScenarioValues)
    ? baselineScenarioValues.map((scenarioId) => (
      typeof scenarioId === "string" ? scenarioId.trim() : ""
    ))
    : [];
  const baselineScenarioSequenceValid =
    Array.isArray(baselineScenarioValues)
    && baselineScenarioValues.length > 0
    && baselineScenarioValues.every((scenarioId) => typeof scenarioId === "string")
    && baselineScenarioIds.every(Boolean)
    && new Set(baselineScenarioIds).size === baselineScenarioIds.length;
  if (
    !baselineScenarioSequenceValid
    || JSON.stringify(baselineScenarioIds) !== JSON.stringify(expectedScenarioIds)
  ) {
    throw new Error(
      `[perf-baseline] Baseline report scenario sequence mismatch: expected=${JSON.stringify(expectedScenarioIds)} actual=${JSON.stringify(baselineScenarioIds)} path=${baselinePath}`
    );
  }
  const baselineScenarios = baselineReport.scenarios;
  if (!baselineScenarios || typeof baselineScenarios !== "object") {
    throw new Error(`[perf-baseline] Baseline report misses scenarios map: ${baselinePath}`);
  }
  const missing = [];
  const invalid = [];
  for (const scenarioId of scenarioIds) {
    const summary = baselineScenarios?.[scenarioId]?.summary;
    if (!summary || typeof summary !== "object") {
      missing.push(scenarioId);
      continue;
    }
    const invalidMetrics = GATE_METRICS
      .map((metric) => metric.key)
      .filter((metricKey) => {
        const metricValue = summary[metricKey];
        return !(typeof metricValue === "number" && Number.isFinite(metricValue) && metricValue > 0);
      });
    if (invalidMetrics.length) {
      invalid.push(`${scenarioId}: ${invalidMetrics.join(", ")}`);
    }
  }
  if (missing.length) {
    throw new Error(
      `[perf-baseline] Baseline report misses required scenarios (${missing.join(", ")}): ${baselinePath}`
    );
  }
  if (invalid.length) {
    throw new Error(
      `[perf-baseline] Baseline report has invalid gate metrics for scenarios (${invalid.join("; ")}): ${baselinePath}`
    );
  }
  const roleMismatches = collectGovernedRenderSampleRoleMismatches(
    baselineReport,
    scenarioIds,
  );
  if (roleMismatches.length) {
    throw new Error(
      `[perf-baseline] Baseline render sample role mismatch: ${baselinePath}\n${roleMismatches.map((item) => `- ${item}`).join("\n")}`
    );
  }
}

export function validateGateCurrentReport(currentReport, scenarioIds, label = "current report") {
  if (!currentReport || typeof currentReport !== "object") {
    throw new Error(`[perf-baseline] Current report is invalid: ${label}`);
  }
  const currentScenarios = currentReport.scenarios;
  if (!currentScenarios || typeof currentScenarios !== "object") {
    throw new Error(`[perf-baseline] Current report misses scenarios map: ${label}`);
  }
  const missing = [];
  const invalid = [];
  for (const scenarioId of scenarioIds) {
    const summary = currentScenarios?.[scenarioId]?.summary;
    if (!summary || typeof summary !== "object") {
      missing.push(scenarioId);
      continue;
    }
    const invalidMetrics = GATE_METRICS
      .map((metric) => metric.key)
      .filter((metricKey) => {
        const metricValue = summary[metricKey];
        return !(typeof metricValue === "number" && Number.isFinite(metricValue) && metricValue > 0);
      });
    if (invalidMetrics.length) {
      invalid.push(`${scenarioId}: ${invalidMetrics.join(", ")}`);
    }
  }
  if (missing.length) {
    throw new Error(
      `[perf-baseline] Current report misses required scenarios (${missing.join(", ")}): ${label}`
    );
  }
  if (invalid.length) {
    throw new Error(
      `[perf-baseline] Current report has invalid gate metrics for scenarios (${invalid.join("; ")}): ${label}`
    );
  }
}

function collectGovernedRenderSampleRoleMismatches(report, scenarioIds) {
  const mismatches = [];
  const configuredRunCount = report?.config?.runs;
  if (configuredRunCount !== CANONICAL_GATE_RUN_COUNT) {
    mismatches.push(
      `config.runs expected=${CANONICAL_GATE_RUN_COUNT} actual=${JSON.stringify(configuredRunCount)}`
    );
  }
  for (const scenarioId of scenarioIds) {
    if (!GOVERNED_RENDER_SAMPLE_SCENARIOS.includes(scenarioId)) {
      continue;
    }
    const scenario = report?.scenarios?.[scenarioId] || {};
    const roleSummary = scenario.renderSampleRoleSummary || {};
    if (!Array.isArray(scenario.runs)) {
      mismatches.push(`${scenarioId}.runs must be an array`);
      continue;
    }
    const runs = scenario.runs;
    if (runs.length !== CANONICAL_GATE_RUN_COUNT) {
      mismatches.push(
        `${scenarioId}.runs.length expected=${CANONICAL_GATE_RUN_COUNT} actual=${runs.length}`
      );
    }
    const recomputedAnalyses = runs.map((run, runIndex) => {
      const recomputed = analyzeRenderSampleRole({
        scenarioId,
        snapshot: run?.snapshot,
        summary: run?.summary,
      });
      if (!isDeepStrictEqual(run?.renderSampleRole, recomputed)) {
        mismatches.push(`${scenarioId}.run-${runIndex + 1}.renderSampleRole does not match raw snapshot evidence`);
      }
      if (!recomputed.roleMatched) {
        mismatches.push(
          `${scenarioId}.run-${runIndex + 1}.canonicalRole=${recomputed.roleMismatches.join(",") || "unmatched"}`
        );
      }
      return recomputed;
    });
    const recomputedSummary = summarizeRenderSampleRoleAnalyses(recomputedAnalyses);
    if (!isDeepStrictEqual(roleSummary, recomputedSummary)) {
      mismatches.push(`${scenarioId}.renderSampleRoleSummary does not match raw run evidence`);
    }
    const storedCanonicalRenderSampleMs = scenario?.summary?.canonicalRenderSampleMs;
    if (!isDeepStrictEqual(
      storedCanonicalRenderSampleMs,
      recomputedSummary.canonicalRenderSampleMs,
    )) {
      mismatches.push(
        `${scenarioId}.summary.canonicalRenderSampleMs does not match raw run evidence`
      );
    }
  }
  return mismatches;
}

export function collectBaselineContractMismatches(currentReport, baselineReport) {
  const mismatches = [
    ...getPerfReportContractMismatches(currentReport, "current"),
    ...getPerfReportContractMismatches(baselineReport, "baseline"),
  ];
  const baselinePlatform = readCanonicalNodePlatform(
    baselineReport?.environment?.platform
  );
  const currentPlatform = readCanonicalNodePlatform(
    currentReport?.environment?.platform
  );
  if (!baselinePlatform || !currentPlatform || baselinePlatform !== currentPlatform) {
    mismatches.push(`os platform mismatch: baseline=${baselinePlatform || "<missing>"} current=${currentPlatform || "<missing>"}`);
  }

  const baselineRelease = readRequiredIdentityString(baselineReport?.environment?.release);
  const currentRelease = readRequiredIdentityString(currentReport?.environment?.release);
  if (!baselineRelease || !currentRelease || baselineRelease !== currentRelease) {
    mismatches.push(`os release mismatch: baseline=${baselineRelease || "<missing>"} current=${currentRelease || "<missing>"}`);
  }

  const baselineArch = readRequiredIdentityString(baselineReport?.environment?.arch);
  const currentArch = readRequiredIdentityString(currentReport?.environment?.arch);
  if (!baselineArch || !currentArch || baselineArch !== currentArch) {
    mismatches.push(`architecture mismatch: baseline=${baselineArch || "<missing>"} current=${currentArch || "<missing>"}`);
  }

  const baselineCpuModel = readRequiredIdentityString(baselineReport?.environment?.cpuModel);
  const currentCpuModel = readRequiredIdentityString(currentReport?.environment?.cpuModel);
  if (!baselineCpuModel || !currentCpuModel || baselineCpuModel !== currentCpuModel) {
    mismatches.push(`CPU model mismatch: baseline=${baselineCpuModel || "<missing>"} current=${currentCpuModel || "<missing>"}`);
  }

  const baselineCpuCount = readPositiveIntegerIdentity(baselineReport?.environment?.cpuCount);
  const currentCpuCount = readPositiveIntegerIdentity(currentReport?.environment?.cpuCount);
  if (!baselineCpuCount || !currentCpuCount || baselineCpuCount !== currentCpuCount) {
    mismatches.push(`CPU count mismatch: baseline=${baselineCpuCount || "<missing>"} current=${currentCpuCount || "<missing>"}`);
  }

  const baselineMemoryGiB = readPositiveIntegerIdentity(baselineReport?.environment?.memoryGiB);
  const currentMemoryGiB = readPositiveIntegerIdentity(currentReport?.environment?.memoryGiB);
  if (!baselineMemoryGiB || !currentMemoryGiB || baselineMemoryGiB !== currentMemoryGiB) {
    mismatches.push(`memory class mismatch: baseline=${baselineMemoryGiB || "<missing>"} current=${currentMemoryGiB || "<missing>"}`);
  }

  const baselineRunnerIdentity = readRunnerIdentity(baselineReport?.environment?.runnerIdentity);
  const currentRunnerIdentity = readRunnerIdentity(currentReport?.environment?.runnerIdentity);
  if (
    !baselineRunnerIdentity
    || !currentRunnerIdentity
    || JSON.stringify(baselineRunnerIdentity) !== JSON.stringify(currentRunnerIdentity)
  ) {
    mismatches.push(
      `runner identity mismatch: baseline=${baselineRunnerIdentity ? JSON.stringify(baselineRunnerIdentity) : "<missing>"} current=${currentRunnerIdentity ? JSON.stringify(currentRunnerIdentity) : "<missing>"}`
    );
  }

  const baselineNodeMajor = readPositiveIntegerIdentity(
    baselineReport?.environment?.nodeMajor
  );
  const currentNodeMajor = readPositiveIntegerIdentity(
    currentReport?.environment?.nodeMajor
  );
  if (!baselineNodeMajor || !currentNodeMajor || baselineNodeMajor !== currentNodeMajor) {
    mismatches.push(`node major mismatch: baseline=${baselineNodeMajor || "<missing>"} current=${currentNodeMajor || "<missing>"}`);
  }

  const baselineBrowser = String(baselineReport?.environment?.browser || "").trim();
  const currentBrowser = String(currentReport?.environment?.browser || "").trim();
  if (!baselineBrowser || !currentBrowser || baselineBrowser !== currentBrowser) {
    mismatches.push(`browser mismatch: baseline=${baselineBrowser || "<missing>"} current=${currentBrowser || "<missing>"}`);
  }

  const baselineBrowserVersion = String(baselineReport?.environment?.browserVersion || "").trim();
  const currentBrowserVersion = String(currentReport?.environment?.browserVersion || "").trim();
  if (!baselineBrowserVersion || !currentBrowserVersion || baselineBrowserVersion !== currentBrowserVersion) {
    mismatches.push(`browser version mismatch: baseline=${baselineBrowserVersion || "<missing>"} current=${currentBrowserVersion || "<missing>"}`);
  }

  const baselinePackageLockSha256 = String(baselineReport?.environment?.packageLockSha256 || "").trim();
  const currentPackageLockSha256 = String(currentReport?.environment?.packageLockSha256 || "").trim();
  if (!baselinePackageLockSha256 || !currentPackageLockSha256 || baselinePackageLockSha256 !== currentPackageLockSha256) {
    mismatches.push(`package lock mismatch: baseline=${baselinePackageLockSha256 || "<missing>"} current=${currentPackageLockSha256 || "<missing>"}`);
  }

  const baselineQuery = baselineReport?.config?.urlQuery;
  const currentQuery = currentReport?.config?.urlQuery;
  const baselineQueryValid = !!baselineQuery && typeof baselineQuery === "object" && !Array.isArray(baselineQuery);
  const currentQueryValid = !!currentQuery && typeof currentQuery === "object" && !Array.isArray(currentQuery);
  if (!baselineQueryValid || !currentQueryValid || JSON.stringify(baselineQuery) !== JSON.stringify(currentQuery)) {
    mismatches.push(
      `urlQuery mismatch: baseline=${baselineQueryValid ? JSON.stringify(baselineQuery) : "<missing>"} current=${currentQueryValid ? JSON.stringify(currentQuery) : "<missing>"}`
    );
  }
  const baselineWarmups = finiteNumber(baselineReport?.config?.warmups, NaN);
  const currentWarmups = finiteNumber(currentReport?.config?.warmups, NaN);
  if (!Number.isFinite(baselineWarmups) || !Number.isFinite(currentWarmups) || baselineWarmups !== currentWarmups) {
    mismatches.push(`warmups mismatch: baseline=${baselineWarmups} current=${currentWarmups}`);
  }

  const baselineRuns = finiteNumber(baselineReport?.config?.runs, NaN);
  const currentRuns = finiteNumber(currentReport?.config?.runs, NaN);
  if (!Number.isFinite(baselineRuns) || !Number.isFinite(currentRuns) || baselineRuns !== currentRuns) {
    mismatches.push(`runs mismatch: baseline=${baselineRuns} current=${currentRuns}`);
  }

  const baselineScenarioValues = baselineReport?.config?.scenarios;
  const currentScenarioValues = currentReport?.config?.scenarios;
  const normalizeScenarioList = (scenarioValues) => Array.isArray(scenarioValues)
    ? scenarioValues.map((scenarioId) => String(scenarioId || "").trim())
    : [];
  const baselineScenarios = normalizeScenarioList(baselineScenarioValues);
  const currentScenarios = normalizeScenarioList(currentScenarioValues);
  const baselineScenariosValid = Array.isArray(baselineScenarioValues)
    && baselineScenarioValues.length > 0
    && baselineScenarioValues.every((scenarioId) => typeof scenarioId === "string")
    && baselineScenarios.every(Boolean)
    && new Set(baselineScenarios).size === baselineScenarios.length
    && baselineScenarios.every((scenarioId) => SUPPORTED_SCENARIOS.includes(scenarioId));
  const currentScenariosValid = Array.isArray(currentScenarioValues)
    && currentScenarioValues.length > 0
    && currentScenarioValues.every((scenarioId) => typeof scenarioId === "string")
    && currentScenarios.every(Boolean)
    && new Set(currentScenarios).size === currentScenarios.length;
  if (
    !baselineScenariosValid
    || !currentScenariosValid
    || JSON.stringify(baselineScenarios) !== JSON.stringify(DEFAULT_GATE_SCENARIOS)
    || JSON.stringify(currentScenarios) !== JSON.stringify(DEFAULT_GATE_SCENARIOS)
  ) {
    mismatches.push(`scenarios mismatch: baseline=${JSON.stringify(baselineScenarios)} current=${JSON.stringify(currentScenarios)}`);
  }

  for (const scenarioId of currentScenariosValid ? currentScenarios : []) {
    const baselineIdentity = baselineReport?.workloadIdentity?.scenarios?.[scenarioId] || {};
    const currentIdentity = currentReport?.workloadIdentity?.scenarios?.[scenarioId] || {};
    const baselineManifestSha256 = String(baselineIdentity.manifestSha256 || "").trim();
    const currentManifestSha256 = String(currentIdentity.manifestSha256 || "").trim();
    if (!baselineManifestSha256 || !currentManifestSha256 || baselineManifestSha256 !== currentManifestSha256) {
      mismatches.push(`${scenarioId}.manifestSha256 mismatch: baseline=${baselineManifestSha256 || "<missing>"} current=${currentManifestSha256 || "<missing>"}`);
    }
    const baselineFeatureCount = finiteNumber(baselineIdentity.featureCount, NaN);
    const currentFeatureCount = finiteNumber(currentIdentity.featureCount, NaN);
    if (!Number.isFinite(baselineFeatureCount) || !Number.isFinite(currentFeatureCount) || baselineFeatureCount !== currentFeatureCount) {
      mismatches.push(`${scenarioId}.featureCount mismatch: baseline=${baselineFeatureCount} current=${currentFeatureCount}`);
    }
  }

  const baselineAdmission = readEnvironmentAdmissionIdentity(baselineReport);
  const currentAdmission = readEnvironmentAdmissionIdentity(currentReport);
  const powerIdentityAvailable = baselineAdmission?.powerStatus === "available"
    && currentAdmission?.powerStatus === "available";
  if (baselineAdmission && currentAdmission && baselinePlatform === "win32" && powerIdentityAvailable) {
    if (
      !baselineAdmission.powerSchemeGuid
      || !currentAdmission.powerSchemeGuid
      || baselineAdmission.powerSchemeGuid !== currentAdmission.powerSchemeGuid
    ) {
      mismatches.push(
        `power scheme mismatch: baseline=${baselineAdmission.powerSchemeGuid || "<missing>"} current=${currentAdmission.powerSchemeGuid || "<missing>"}`
      );
    }
    if (baselineAdmission.acLineStatus !== 1 || currentAdmission.acLineStatus !== 1) {
      mismatches.push(
        `AC power mismatch: baseline=${baselineAdmission.acLineStatus} current=${currentAdmission.acLineStatus}`
      );
    }
  }

  return mismatches;
}

export function validateGateScenarioSelection(scenarioIds) {
  const normalizedScenarioIds = Array.isArray(scenarioIds)
    ? scenarioIds.map((scenarioId) => (
      typeof scenarioId === "string" ? scenarioId.trim() : ""
    ))
    : [];
  const matchesCanonicalGateSet =
    normalizedScenarioIds.length === DEFAULT_GATE_SCENARIOS.length
    && normalizedScenarioIds.every(
      (scenarioId, index) => scenarioId === DEFAULT_GATE_SCENARIOS[index]
    );

  if (!matchesCanonicalGateSet) {
    throw new Error(
      `[perf-baseline] Gate scenarios must exactly match ${JSON.stringify(DEFAULT_GATE_SCENARIOS)}; received ${JSON.stringify(normalizedScenarioIds)}.`
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === "gate" && options.warmups < MIN_GATE_WARMUPS) {
    throw new Error(`[perf-baseline] Gate warmups must be at least ${MIN_GATE_WARMUPS}; received ${options.warmups}.`);
  }
  if (options.mode === "gate") {
    validateGateScenarioSelection(options.scenarios);
  }

  validateBaselineOutputSelection(options);
  await ensureDir(options.rawDir);
  let baselineReportForGate = null;
  let baselineOracleBeforeSha256 = null;
  if (options.mode === "gate") {
    if (!(await pathExists(options.baselineJson))) {
      throw new Error(`[perf-baseline] Baseline report file does not exist: ${options.baselineJson}`);
    }
    const baselineOracle = await readJsonAndSha256Strict(options.baselineJson, "baseline report");
    baselineReportForGate = baselineOracle.payload;
    validateGateBaselineReport(baselineReportForGate, options.scenarios, options.baselineJson);
    baselineOracleBeforeSha256 = baselineOracle.sha256;
  }
  const environmentAdmission = await runStandardPerfAdmission(options);
  const gitHead = environmentAdmission.git.head;

  const measurement = await runMeasurements(options);
  const generationFence = await runStandardPerfGenerationFence(
    options,
    environmentAdmission,
    { baselineOracleBeforeSha256 },
  );
  const packageLockSha256 = await sha256File(path.join(REPO_ROOT, "package-lock.json"));
  const report = {
    schemaVersion: CURRENT_PERF_REPORT_SCHEMA_VERSION,
    benchmarkMetricsSchemaVersion: "3.3",
    probeSchema: "mc_perf_snapshot",
    renderSampleRolePolicy: {
      policyId: RENDER_SAMPLE_ROLE_POLICY_ID,
      canonicalRoleId: CANONICAL_RENDER_SAMPLE_ROLE_ID,
      governedScenarios: GOVERNED_RENDER_SAMPLE_SCENARIOS,
    },
    generatedAt: new Date().toISOString(),
    gitHead,
    baselineDate: getBaselineArtifactDate(options.baselineJson),
    mode: options.mode,
    regressionMode: options.regressionMode,
    baseUrl: measurement.baseUrl,
    config: {
      scenarios: options.scenarios,
      runs: options.runs,
      warmups: options.warmups,
      threshold: options.threshold,
      urlQuery: options.urlQuery,
    },
    environment: collectEnvironment({
      browserVersion: measurement.browserVersion,
      packageLockSha256,
    }),
    environmentAdmission,
    generationFence,
    workloadIdentity: buildReportWorkloadIdentity(options, measurement),
    scenarios: measurement.scenarios,
  };

  if (options.mode === "gate") {
    validateGateCurrentReport(report, options.scenarios, "current report");
    const contractMismatches = collectBaselineContractMismatches(report, baselineReportForGate);
    const renderSampleRoleMismatches = collectGovernedRenderSampleRoleMismatches(report, options.scenarios);
    const failures = compareAgainstBaseline(report, baselineReportForGate, options.threshold);
    const regressionsEnforced = normalizePerfRegressionMode(options.regressionMode) === "enforce";
    const gateReportPath = path.join(options.rawDir, "perf-gate-current.json");
    await writeJson(gateReportPath, {
      report,
      regressionMode: options.regressionMode,
      regressionsEnforced,
      contractMismatches,
      renderSampleRoleMismatches,
      failures,
    });
    if (contractMismatches.length) {
      throw new Error(
        `Perf gate baseline contract mismatch.\n${contractMismatches.map((item) => `- ${item}`).join("\n")}`
      );
    }
    if (renderSampleRoleMismatches.length) {
      throw new Error(
        `Perf gate render sample role mismatch.\n${renderSampleRoleMismatches.map((item) => `- ${item}`).join("\n")}`
      );
    }
    if (shouldBlockOnPerfRegressions(options.regressionMode, failures)) {
      throw new Error(`Perf gate failed.\n${formatPerfRegressionFailures(failures)}`);
    }
    if (failures.length) {
      console.warn(`Perf gate recorded diagnostic-only regressions.\n${formatPerfRegressionFailures(failures)}`);
    }
    console.log(
      `Perf gate passed against ${path.relative(REPO_ROOT, options.baselineJson)} (regressionMode=${options.regressionMode})`
    );
    return;
  }

  const renderSampleRoleMismatches = collectGovernedRenderSampleRoleMismatches(report, options.scenarios);
  if (renderSampleRoleMismatches.length) {
    throw new Error(
      `Perf baseline render sample role mismatch.\n${renderSampleRoleMismatches.map((item) => `- ${item}`).join("\n")}`
    );
  }
  await writeBaselineArtifacts(options, report);
  console.log(`Baseline written to ${path.relative(REPO_ROOT, options.baselineJson)}`);
  if (options.writeMarkdown) {
    console.log(`Markdown written to ${path.relative(REPO_ROOT, options.baselineMd)}`);
  }
}

const directEntryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (directEntryPath && pathToFileURL(directEntryPath).href === import.meta.url) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exit(Number.isInteger(error?.exitCode)
      ? error.exitCode
      : STANDARD_PERF_ADMISSION_EXIT_CODES.gateFailure);
  });
}
