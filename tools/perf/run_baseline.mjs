#!/usr/bin/env node

import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_SCENARIOS = ["blank_base", "tno_1962", "hoi4_1939"];
const DEFAULT_GATE_SCENARIOS = ["tno_1962", "hoi4_1939"];
const DEFAULT_BASELINE_JSON = path.join(REPO_ROOT, "docs", "perf", "baseline_2026-04-20.json");
const DEFAULT_BASELINE_MD = path.join(REPO_ROOT, "docs", "perf", "baseline_2026-04-20.md");
const DEFAULT_RAW_DIR = path.join(REPO_ROOT, ".runtime", "output", "perf", "baseline_2026-04-20");
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
const DEFAULT_WARMUPS = MIN_GATE_WARMUPS;
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
  DEFAULT_SCENARIOS.map((scenarioId) => [
    scenarioId,
    path.join(REPO_ROOT, "data", "scenarios", scenarioId, "manifest.json"),
  ]),
);

function parseArgs(argv) {
  const options = {
    mode: "baseline",
    scenarios: [...DEFAULT_SCENARIOS],
    runs: 5,
    warmups: DEFAULT_WARMUPS,
    threshold: 1.15,
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
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

async function readJsonStrict(filePath, label = "json payload") {
  let rawText = "";
  try {
    rawText = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`[perf-baseline] Unable to read ${label}: ${filePath}. ${String(error?.message || error)}`);
  }
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(`[perf-baseline] Unable to parse ${label}: ${filePath}. ${String(error?.message || error)}`);
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

function resolveDevServerPythonCommand() {
  const setupPythonRoot = process.env.pythonLocation || process.env.Python_ROOT_DIR || process.env.Python3_ROOT_DIR;
  if (setupPythonRoot) {
    return {
      command: path.join(setupPythonRoot, process.platform === "win32" ? "python.exe" : "bin/python"),
      args: ["tools/dev_server.py"],
    };
  }
  if (process.platform === "win32") {
    return { command: "py", args: ["-3", "tools/dev_server.py"] };
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

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function summarizeSnapshot(snapshot) {
  const bootMetrics = snapshot?.bootMetrics && typeof snapshot.bootMetrics === "object" ? snapshot.bootMetrics : {};
  const renderPerfMetrics = snapshot?.renderPerfMetrics && typeof snapshot.renderPerfMetrics === "object" ? snapshot.renderPerfMetrics : {};
  const scenarioPerfMetrics = snapshot?.scenarioPerfMetrics && typeof snapshot.scenarioPerfMetrics === "object" ? snapshot.scenarioPerfMetrics : {};
  const renderSamples = snapshot?.renderSamples && typeof snapshot.renderSamples === "object" ? snapshot.renderSamples : {};
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
  };
}

function normalizeScenarioId(value) {
  return String(value || "").trim();
}

function getScenarioSampleRole(scenarioId) {
  return DEFAULT_GATE_SCENARIOS.includes(scenarioId) ? "gate" : "observation";
}

function normalizeOsPlatform(value) {
  const label = String(value || "").trim();
  if (!label) {
    return "";
  }
  const [platformLabel = ""] = label.split(/\s+/, 1);
  return platformLabel.trim();
}

function parseNodeMajor(value) {
  const match = String(value || "").trim().match(/^v?(?<major>\d+)/);
  if (!match?.groups?.major) {
    return 0;
  }
  return finiteNumber(match.groups.major, 0);
}

function collectEnvironment() {
  return {
    os: `${os.platform()} ${os.release()}`,
    platform: os.platform(),
    release: os.release(),
    node: process.version,
    nodeMajor: parseNodeMajor(process.version),
    browser: "chromium-headless",
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
    pushEvent({
      kind: "requestfailed",
      method: request.method(),
      resourceType: request.resourceType(),
      url: truncateDiagnosticText(request.url()),
      failure: truncateDiagnosticText(request.failure()?.errorText || ""),
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
    await waitForPerfSnapshotReady(page, { timeoutMs: 120_000 });
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
      summary: summarizeSnapshot(snapshot),
    };
  } catch (error) {
    try {
      const diagnosticsPath = await diagnostics.write(error);
      const relativeDiagnosticsPath = path.relative(REPO_ROOT, diagnosticsPath).replaceAll("\\", "/");
      if (error && typeof error === "object" && "message" in error) {
        error.message = `${error.message}\n[perf-baseline] Browser diagnostics: ${relativeDiagnosticsPath}`;
      }
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

async function waitForPerfSnapshotReady(page, { timeoutMs = 120_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
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

async function runScenarioSeries(browser, serverLeaseRef, scenarioId, options) {
  const manifestIdentity = await readScenarioManifestIdentity(scenarioId);
  const featureCount = finiteNumber(manifestIdentity.featureCount);
  const scenarioDir = path.join(options.rawDir, scenarioId);
  await ensureDir(scenarioDir);
  const warmups = [];
  for (let index = 0; index < options.warmups; index += 1) {
    serverLeaseRef.current = await ensureMeasurementServer(serverLeaseRef.current);
    const baseUrl = serverLeaseRef.current.baseUrl;
    const run = await measureOneRun(browser, baseUrl, scenarioId, {
      ...options,
      runLabel: `warmup-${String(index + 1).padStart(2, "0")}`,
      urlQuery: options.urlQuery,
    });
    warmups.push(run.summary);
  }
  const runs = [];
  for (let index = 0; index < options.runs; index += 1) {
    serverLeaseRef.current = await ensureMeasurementServer(serverLeaseRef.current);
    const baseUrl = serverLeaseRef.current.baseUrl;
    const run = await measureOneRun(browser, baseUrl, scenarioId, {
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
  };
}

function formatMetricRow(label, value) {
  return `- ${label}: ${finiteNumber(value).toFixed(1)} ms`;
}

function formatCountRow(label, value) {
  return `- ${label}: ${finiteNumber(value).toFixed(0)}`;
}

function buildMarkdown(report) {
  const gateScenarios = DEFAULT_GATE_SCENARIOS.join(", ");
  const observationScenarios = DEFAULT_SCENARIOS
    .filter((scenarioId) => !DEFAULT_GATE_SCENARIOS.includes(scenarioId))
    .join(", ");
  const lines = [
    "# Perf baseline 2026-04-20",
    "",
    "## Environment",
    `- Generated at: ${report.generatedAt}`,
    `- Git HEAD: ${report.gitHead}`,
    `- OS: ${report.environment.os}`,
    `- Node: ${report.environment.node}`,
    `- Browser: ${report.environment.browser}`,
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
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function resolveGitHead() {
  try {
    const { execFile } = await import("node:child_process");
    return await new Promise((resolve) => {
      execFile("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT }, (error, stdout) => {
        resolve(error ? "" : String(stdout || "").trim());
      });
    });
  } catch (_error) {
    return "";
  }
}

async function runMeasurements(options) {
  const serverLeaseRef = {
    current: await ensureServerBaseUrl(),
  };
  const browser = await chromium.launch({ headless: true });
  try {
    const scenarios = {};
    for (const scenarioId of options.scenarios) {
      scenarios[scenarioId] = await runScenarioSeries(browser, serverLeaseRef, scenarioId, options);
    }
    return { baseUrl: serverLeaseRef.current?.baseUrl || "", scenarios };
  } finally {
    await browser.close();
    await stopServer(serverLeaseRef.current?.serverOwner || null);
  }
}

async function writeBaselineArtifacts(options, report) {
  await writeJson(options.baselineJson, report);
  if (options.writeMarkdown) {
    await ensureDir(path.dirname(options.baselineMd));
    await fs.writeFile(options.baselineMd, buildMarkdown(report), "utf8");
  }
}

const PERF_REPORT_CONTRACT_FIELDS = [
  { key: "schemaVersion", expected: 1 },
  { key: "benchmarkMetricsSchemaVersion", expected: "3.3" },
  { key: "probeSchema", expected: "mc_perf_snapshot" },
];

function getPerfReportContractMismatches(report, label = "report") {
  return PERF_REPORT_CONTRACT_FIELDS
    .filter(({ key, expected }) => report?.[key] !== expected)
    .map(({ key, expected }) => `${label}.${key} expected=${JSON.stringify(expected)} actual=${JSON.stringify(report?.[key])}`);
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

function validateGateBaselineReport(baselineReport, scenarioIds, baselinePath) {
  if (!baselineReport || typeof baselineReport !== "object") {
    throw new Error(`[perf-baseline] Baseline report is invalid: ${baselinePath}`);
  }
  const baselineContractMismatches = getPerfReportContractMismatches(baselineReport, "baseline");
  if (baselineContractMismatches.length) {
    throw new Error(
      `[perf-baseline] Baseline report schema mismatch: ${baselinePath}\n${baselineContractMismatches.map((item) => `- ${item}`).join("\n")}`
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
        const metricValue = Number(summary[metricKey]);
        return !(Number.isFinite(metricValue) && metricValue > 0);
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
}

function validateGateCurrentReport(currentReport, scenarioIds, label = "current report") {
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
        const metricValue = Number(summary[metricKey]);
        return !(Number.isFinite(metricValue) && metricValue > 0);
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

function collectBaselineContractMismatches(currentReport, baselineReport) {
  const mismatches = [
    ...getPerfReportContractMismatches(currentReport, "current"),
    ...getPerfReportContractMismatches(baselineReport, "baseline"),
  ];
  const baselinePlatform = normalizeOsPlatform(
    baselineReport?.environment?.platform || baselineReport?.environment?.os
  );
  const currentPlatform = normalizeOsPlatform(
    currentReport?.environment?.platform || currentReport?.environment?.os
  );
  if (baselinePlatform && currentPlatform && baselinePlatform !== currentPlatform) {
    mismatches.push(`os platform mismatch: baseline=${baselinePlatform} current=${currentPlatform}`);
  }

  const baselineNodeMajor = parseNodeMajor(
    baselineReport?.environment?.nodeMajor || baselineReport?.environment?.node
  );
  const currentNodeMajor = parseNodeMajor(
    currentReport?.environment?.nodeMajor || currentReport?.environment?.node
  );
  if (baselineNodeMajor > 0 && currentNodeMajor > 0 && baselineNodeMajor !== currentNodeMajor) {
    mismatches.push(`node major mismatch: baseline=${baselineNodeMajor} current=${currentNodeMajor}`);
  }

  const baselineBrowser = String(baselineReport?.environment?.browser || "").trim();
  const currentBrowser = String(currentReport?.environment?.browser || "").trim();
  if (baselineBrowser && currentBrowser && baselineBrowser !== currentBrowser) {
    mismatches.push(`browser mismatch: baseline=${baselineBrowser} current=${currentBrowser}`);
  }

  const baselineQuery = baselineReport?.config?.urlQuery || {};
  const currentQuery = currentReport?.config?.urlQuery || {};
  if (JSON.stringify(baselineQuery) !== JSON.stringify(currentQuery)) {
    mismatches.push(
      `urlQuery mismatch: baseline=${JSON.stringify(baselineQuery)} current=${JSON.stringify(currentQuery)}`
    );
  }
  const baselineWarmups = finiteNumber(baselineReport?.config?.warmups, NaN);
  const currentWarmups = finiteNumber(currentReport?.config?.warmups, NaN);
  if (Number.isFinite(baselineWarmups) && Number.isFinite(currentWarmups) && baselineWarmups !== currentWarmups) {
    mismatches.push(`warmups mismatch: baseline=${baselineWarmups} current=${currentWarmups}`);
  }

  return mismatches;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === "gate" && options.warmups < MIN_GATE_WARMUPS) {
    throw new Error(`[perf-baseline] Gate warmups must be at least ${MIN_GATE_WARMUPS}; received ${options.warmups}.`);
  }
  await ensureDir(options.rawDir);
  const gitHead = await resolveGitHead();
  let baselineReportForGate = null;
  if (options.mode === "gate") {
    if (!(await pathExists(options.baselineJson))) {
      throw new Error(`[perf-baseline] Baseline report file does not exist: ${options.baselineJson}`);
    }
    baselineReportForGate = await readJsonStrict(options.baselineJson, "baseline report");
    validateGateBaselineReport(baselineReportForGate, options.scenarios, options.baselineJson);
  }

  const measurement = await runMeasurements(options);
  const report = {
    schemaVersion: 1,
    benchmarkMetricsSchemaVersion: "3.3",
    probeSchema: "mc_perf_snapshot",
    generatedAt: new Date().toISOString(),
    gitHead,
    mode: options.mode,
    baseUrl: measurement.baseUrl,
    config: {
      scenarios: options.scenarios,
      runs: options.runs,
      warmups: options.warmups,
      threshold: options.threshold,
      urlQuery: options.urlQuery,
    },
    environment: collectEnvironment(),
    workloadIdentity: buildReportWorkloadIdentity(options, measurement),
    scenarios: measurement.scenarios,
  };

  if (options.mode === "gate") {
    validateGateCurrentReport(report, options.scenarios, "current report");
    const contractMismatches = collectBaselineContractMismatches(report, baselineReportForGate);
    const failures = compareAgainstBaseline(report, baselineReportForGate, options.threshold);
    const gateReportPath = path.join(options.rawDir, "perf-gate-current.json");
    await writeJson(gateReportPath, { report, contractMismatches, failures });
    if (contractMismatches.length) {
      throw new Error(
        `Perf gate baseline contract mismatch.\n${contractMismatches.map((item) => `- ${item}`).join("\n")}`
      );
    }
    if (failures.length) {
      const message = failures
        .map(
          (failure) => `${failure.scenarioId}.${failure.metricKey}: current=${failure.currentValue.toFixed(1)}ms baseline=${failure.baselineValue.toFixed(1)}ms limit=${failure.limit.toFixed(1)}ms ratio=${failure.allowedRatio.toFixed(2)}`
        )
        .join("\n");
      throw new Error(`Perf gate failed.\n${message}`);
    }
    console.log(`Perf gate passed against ${path.relative(REPO_ROOT, options.baselineJson)}`);
    return;
  }

  await writeBaselineArtifacts(options, report);
  console.log(`Baseline written to ${path.relative(REPO_ROOT, options.baselineJson)}`);
  if (options.writeMarkdown) {
    console.log(`Markdown written to ${path.relative(REPO_ROOT, options.baselineMd)}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
