import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { WILLIAMS_TELEMETRY_CADENCE } from "./williams_crossover_policy.mjs";

export const WINDOWS_JOB_RUNNER_PROTOCOL_ID = "SF_WILLIAMS_JOB_V1";
export const WINDOWS_JOB_RUNNER_SOURCE_PATH = fileURLToPath(
  new URL("./williams_crossover_windows_job_runner.cs", import.meta.url),
);

const WINDOWS_JOB_RUNNER_BINARY_NAME = "williams_crossover_windows_job_runner.exe";
const WINDOWS_JOB_RUNNER_DESCRIPTOR_PATH = `runtime-compiled/${WINDOWS_JOB_RUNNER_BINARY_NAME}`;
export const WINDOWS_JOB_RUNNER_EVIDENCE_PATH = "tooling/windows-job-runner.exe";
const DEFAULT_JOB_RUNNER_BUILD_ROOT = path.resolve(
  path.dirname(WINDOWS_JOB_RUNNER_SOURCE_PATH),
  "..",
  "..",
  ".runtime",
  "tmp",
  "williams-job-runner",
);

const WINDOWS_COUNTER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$sampleIntervalMs = ${WILLIAMS_TELEMETRY_CADENCE.sampleIntervalMs}.0
$sampleCount = ${WILLIAMS_TELEMETRY_CADENCE.samplesPerWindow}
$samples = @()
function Read-WilliamsCounterSample {
  $processorSample = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" -ErrorAction Stop
  $memorySample = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop
  foreach ($propertyName in @('PercentProcessorTime','PercentProcessorPerformance','PercentofMaximumFrequency','ProcessorFrequency')) {
    if ($null -eq $processorSample.$propertyName) { throw "required processor counter missing: $propertyName" }
  }
  foreach ($propertyName in @('PercentCommittedBytesInUse','AvailableMBytes')) {
    if ($null -eq $memorySample.$propertyName) { throw "required memory counter missing: $propertyName" }
  }
  return [pscustomobject]@{
    processor = $processorSample
    memory = $memorySample
  }
}
$primingStartedAt = [datetime]::UtcNow
$primingStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$primingCapture = Read-WilliamsCounterSample
$primingStopwatch.Stop()
$primingCompletedAt = [datetime]::UtcNow
$priming = [pscustomobject]@{
  captureCount = ${WILLIAMS_TELEMETRY_CADENCE.priming.captureCount}
  status = 'complete'
  admissionRole = '${WILLIAMS_TELEMETRY_CADENCE.priming.admissionRole}'
  startedAt = $primingStartedAt.ToString('o')
  completedAt = $primingCompletedAt.ToString('o')
  captureDurationMs = [double]$primingStopwatch.Elapsed.TotalMilliseconds
}
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
for ($index = 0; $index -lt $sampleCount; $index += 1) {
  $targetElapsedMs = [double](($index + 1) * $sampleIntervalMs)
  $remainingDelayMs = [math]::Ceiling($targetElapsedMs - $stopwatch.Elapsed.TotalMilliseconds)
  if ($remainingDelayMs -gt 0) {
    Start-Sleep -Milliseconds ([int]$remainingDelayMs)
  }
  $captureStartedElapsedMs = $stopwatch.Elapsed.TotalMilliseconds
  $captureStartedAt = [datetime]::UtcNow
  $scheduleLagMs = $captureStartedElapsedMs - $targetElapsedMs
  $counterCapture = Read-WilliamsCounterSample
  $processorSample = $counterCapture.processor
  $memorySample = $counterCapture.memory
  $completedAt = [datetime]::UtcNow
  $captureDurationMs = $stopwatch.Elapsed.TotalMilliseconds - $captureStartedElapsedMs
  $samples += [pscustomobject]@{
    at = $captureStartedAt.ToString('o')
    completedAt = $completedAt.ToString('o')
    captureDurationMs = [double]$captureDurationMs
    scheduleLagMs = [double]$scheduleLagMs
    cpuUtilizationPercent = [double]$processorSample.PercentProcessorTime
    processorPerformancePercent = [double]$processorSample.PercentProcessorPerformance
    percentOfMaximumFrequency = [double]$processorSample.PercentofMaximumFrequency
    processorFrequencyMHz = [double]$processorSample.ProcessorFrequency
    performanceAdjustedFrequencyMHz = ([double]$processorSample.ProcessorFrequency * [double]$processorSample.PercentProcessorPerformance) / 100.0
    memoryCommittedPercent = [double]$memorySample.PercentCommittedBytesInUse
    memoryAvailableMBytes = [double]$memorySample.AvailableMBytes
  }
}
if ($samples.Count -ne $sampleCount) { throw "required sample count mismatch: $($samples.Count)" }
$processors = @(Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object Name,MaxClockSpeed,CurrentClockSpeed,NumberOfCores,NumberOfLogicalProcessors)
$operatingSystem = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop | Select-Object TotalVisibleMemorySize,FreePhysicalMemory
$powerText = (& powercfg /getactivescheme 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "powercfg /getactivescheme failed: $powerText" }
$guidMatch = [regex]::Match($powerText, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
$nameMatch = [regex]::Match($powerText, '\(([^)]+)\)')
if (-not $guidMatch.Success) { throw "active power scheme GUID missing" }
if (-not $nameMatch.Success) { throw "active power scheme name missing" }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ScenarioForgePowerStatus {
  [StructLayout(LayoutKind.Sequential)]
  public struct SYSTEM_POWER_STATUS {
    public byte ACLineStatus;
    public byte BatteryFlag;
    public byte BatteryLifePercent;
    public byte SystemStatusFlag;
    public int BatteryLifeTime;
    public int BatteryFullLifeTime;
  }
  [DllImport("kernel32.dll")]
  public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS status);
}
'@
$powerStatus = New-Object ScenarioForgePowerStatus+SYSTEM_POWER_STATUS
if (-not [ScenarioForgePowerStatus]::GetSystemPowerStatus([ref]$powerStatus)) { throw "GetSystemPowerStatus failed" }
[pscustomobject]@{
  schemaVersion = ${WILLIAMS_TELEMETRY_CADENCE.windowSchemaVersion}
  sampling = [pscustomobject]@{
    scheduler = '${WILLIAMS_TELEMETRY_CADENCE.scheduler}'
    timestampSemantics = '${WILLIAMS_TELEMETRY_CADENCE.timestampSemantics}'
    sampleIntervalMs = [int]$sampleIntervalMs
    sampleCount = [int]$sampleCount
  }
  capability = [pscustomobject]@{
    status = 'available'
    missing = @()
    provider = 'Win32_PerfFormattedData'
    requiredCounters = @(
      'ProcessorInformation._Total.PercentProcessorTime',
      'ProcessorInformation._Total.PercentProcessorPerformance',
      'ProcessorInformation._Total.PercentofMaximumFrequency',
      'ProcessorInformation._Total.ProcessorFrequency',
      'PerfOS_Memory.PercentCommittedBytesInUse',
      'PerfOS_Memory.AvailableMBytes'
    )
  }
  priming = $priming
  samples = @($samples)
  processor = @($processors)
  memory = $operatingSystem
  power = [pscustomobject]@{
    activeSchemeGuid = $guidMatch.Value.ToLowerInvariant()
    activeSchemeName = $nameMatch.Groups[1].Value.Trim()
    acLineStatus = [int]$powerStatus.ACLineStatus
    batteryFlag = [int]$powerStatus.BatteryFlag
    batteryLifePercent = [int]$powerStatus.BatteryLifePercent
  }
} | ConvertTo-Json -Depth 8 -Compress
`;

const WINDOWS_PROCESS_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
@(
  Get-CimInstance Win32_Process -ErrorAction Stop |
    Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine
) | ConvertTo-Json -Depth 5 -Compress
`;

const WINDOWS_TCP_CONNECTION_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
@(
  Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Select-Object LocalAddress,LocalPort,OwningProcess,State
) | ConvertTo-Json -Depth 5 -Compress
`;

function runPowerShell(script) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`PowerShell capability probe exited ${result.status}: ${String(result.stderr || result.stdout || "").trim()}`);
  }
  return JSON.parse(String(result.stdout || "null"));
}

function missingWindow(phase, status, detail) {
  return {
    schemaVersion: WILLIAMS_TELEMETRY_CADENCE.windowSchemaVersion,
    phase,
    priming: null,
    sampling: {
      scheduler: WILLIAMS_TELEMETRY_CADENCE.scheduler,
      timestampSemantics: WILLIAMS_TELEMETRY_CADENCE.timestampSemantics,
      sampleIntervalMs: WILLIAMS_TELEMETRY_CADENCE.sampleIntervalMs,
      sampleCount: WILLIAMS_TELEMETRY_CADENCE.samplesPerWindow,
    },
    capability: { status, missing: [String(detail || "unknown Windows counter capability")] },
    samples: [],
    processor: [],
    memory: null,
    power: null,
  };
}

export function collectWindowsPerformanceWindow({ phase, platform = process.platform } = {}) {
  if (platform !== "win32") {
    return missingWindow(phase, "required-capability-missing", `platform=${platform}`);
  }
  try {
    const payload = runPowerShell(WINDOWS_COUNTER_SCRIPT);
    return {
      schemaVersion: WILLIAMS_TELEMETRY_CADENCE.windowSchemaVersion,
      phase,
      priming: payload.priming,
      sampling: payload.sampling,
      capability: payload.capability,
      samples: Array.isArray(payload.samples) ? payload.samples : [payload.samples].filter(Boolean),
      processor: Array.isArray(payload.processor) ? payload.processor : [payload.processor].filter(Boolean),
      memory: payload.memory,
      power: payload.power,
    };
  } catch (error) {
    return missingWindow(phase, "collection-error", String(error?.stack || error?.message || error));
  }
}

export function collectWindowsProcessSnapshot({ platform = process.platform } = {}) {
  if (platform !== "win32") {
    throw new Error(`Windows process capability required; platform=${platform}`);
  }
  const payload = runPowerShell(WINDOWS_PROCESS_SCRIPT);
  return Array.isArray(payload) ? payload : [payload].filter(Boolean);
}

export function collectWindowsTcpConnections({ platform = process.platform } = {}) {
  if (platform !== "win32") {
    throw new Error(`Windows TCP capability required; platform=${platform}`);
  }
  const payload = runPowerShell(WINDOWS_TCP_CONNECTION_SCRIPT);
  return (Array.isArray(payload) ? payload : [payload].filter(Boolean)).map((entry) => ({
    localAddress: String(entry?.LocalAddress || ""),
    port: Number(entry?.LocalPort),
    pid: Number(entry?.OwningProcess),
    state: String(entry?.State || ""),
  }));
}

function base64Line(value) {
  return Buffer.from(String(value ?? ""), "utf8").toString("base64");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function encodePowerShellCommand(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

export class WilliamsJobRunnerTransportError extends Error {
  constructor(message, code, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "WilliamsJobRunnerTransportError";
    this.code = code;
  }
}

export function validateJobRunnerEvidence(evidence, { command = null, cwd = null } = {}) {
  const errors = [];
  if (!evidence || typeof evidence !== "object") return ["job-evidence.missing"];
  if (evidence.schemaVersion !== 1) errors.push("job-evidence.schemaVersion");
  if (evidence.protocolId !== WINDOWS_JOB_RUNNER_PROTOCOL_ID) errors.push("job-evidence.protocolId");
  if (evidence.provider !== "windows-job-object") errors.push("job-evidence.provider");
  if (evidence.status !== "complete") errors.push("job-evidence.status");
  if (evidence.createSuspended !== true) errors.push("job-evidence.createSuspended");
  if (evidence.createNoWindow !== true) errors.push("job-evidence.createNoWindow");
  if (evidence.assignedBeforeResume !== true) errors.push("job-evidence.assignedBeforeResume");
  if (evidence.rootInJobBeforeResume !== true) errors.push("job-evidence.rootInJobBeforeResume");
  if (evidence.killOnJobClose !== true) errors.push("job-evidence.killOnJobClose");
  if (evidence.breakawayAllowed !== false) errors.push("job-evidence.breakawayAllowed");
  if (evidence.jobCloseSucceeded !== true) errors.push("job-evidence.jobCloseSucceeded");
  if (evidence.rootTerminationConfirmed !== true) errors.push("job-evidence.rootTerminationConfirmed");
  if (evidence.cleanupValid !== true) errors.push("job-evidence.cleanupValid");
  if (!Array.isArray(evidence.remainingPids) || evidence.remainingPids.length !== 0) {
    errors.push("job-evidence.remainingPids");
  }
  if (!Array.isArray(evidence.unverifiedPids) || evidence.unverifiedPids.length !== 0) {
    errors.push("job-evidence.unverifiedPids");
  }
  if (evidence.timedOut === true && evidence.terminateJobSucceeded !== true) {
    errors.push("job-evidence.terminateJobSucceeded");
  }
  if (!Number.isInteger(evidence.rootExitCode)) errors.push("job-evidence.rootExitCode");
  if (command) {
    if (evidence.commandExecutablePath !== command.bin) errors.push("job-evidence.commandExecutablePath");
    if (evidence.commandWorkingDirectory !== cwd) errors.push("job-evidence.commandWorkingDirectory");
    if (
      !Array.isArray(evidence.commandArguments)
      || evidence.commandArguments.length !== (command.args || []).length
      || evidence.commandArguments.some((argument, index) => argument !== command.args[index])
    ) {
      errors.push("job-evidence.commandArguments");
    }
  }
  return errors;
}

export function encodeWindowsJobRunnerSpec({
  command,
  executablePath = command?.bin,
  workingDirectory,
  cwd = workingDirectory,
  evidencePath,
  timeoutMs,
  args = command?.args || [],
} = {}) {
  if (!String(executablePath || "").trim()) throw new TypeError("executablePath is required");
  if (!String(cwd || "").trim()) throw new TypeError("workingDirectory is required");
  if (!String(evidencePath || "").trim()) throw new TypeError("evidencePath is required");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be a positive integer");
  if (!Array.isArray(args)) throw new TypeError("args must be an array");
  return [
    WINDOWS_JOB_RUNNER_PROTOCOL_ID,
    base64Line(executablePath),
    base64Line(cwd),
    base64Line(evidencePath),
    String(timeoutMs),
    String(args.length),
    ...args.map(base64Line),
    "",
  ].join("\n");
}

export async function compileWindowsJobRunner({
  platform = process.platform,
  sourcePath = WINDOWS_JOB_RUNNER_SOURCE_PATH,
  buildRoot = DEFAULT_JOB_RUNNER_BUILD_ROOT,
  spawnSyncFn = spawnSync,
} = {}) {
  if (platform !== "win32") throw new Error(`Windows Job Object capability required; platform=${platform}`);
  await fs.mkdir(buildRoot, { recursive: true });
  const buildDirectory = await fs.mkdtemp(path.join(buildRoot, "build-"));
  const executablePath = path.join(buildDirectory, WINDOWS_JOB_RUNNER_BINARY_NAME);
  const sourceEncoded = base64Line(path.resolve(sourcePath));
  const outputEncoded = base64Line(executablePath);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${sourceEncoded}'))`,
    `$output = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${outputEncoded}'))`,
    "Add-Type -Path $source -OutputAssembly $output -OutputType ConsoleApplication -ErrorAction Stop",
  ].join("\n");
  const result = spawnSyncFn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodePowerShellCommand(script)],
    { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0) {
    await fs.rm(buildDirectory, { recursive: true, force: true });
    throw result.error || new Error(
      `Windows Job runner compilation exited ${result.status}: ${String(result.stderr || result.stdout || "").trim()}`,
    );
  }
  const binary = await fs.readFile(executablePath);
  return Object.freeze({
    status: "compiled",
    compiledAt: new Date().toISOString(),
    buildDirectory,
    executablePath,
    binary: Object.freeze({
      path: WINDOWS_JOB_RUNNER_DESCRIPTOR_PATH,
      sha256: sha256(binary),
      bytes: binary.length,
    }),
    async cleanup() {
      await fs.rm(buildDirectory, { recursive: true, force: true });
    },
  });
}

export async function runWindowsJobCommand(command, {
  preparedRunner,
  cwd,
  stdoutPath,
  stderrPath,
  evidencePath,
  timeoutMs,
  spawnFn = spawn,
} = {}) {
  if (preparedRunner?.status !== "available" && preparedRunner?.status !== "compiled") {
    throw new Error(`Windows Job runner is not prepared: ${preparedRunner?.status || "missing"}`);
  }
  await Promise.all([
    fs.mkdir(path.dirname(stdoutPath), { recursive: true }),
    fs.mkdir(path.dirname(stderrPath), { recursive: true }),
    fs.mkdir(path.dirname(evidencePath), { recursive: true }),
  ]);
  await fs.rm(evidencePath, { force: true });
  return new Promise((resolve, reject) => {
    const child = spawnFn(preparedRunner.executablePath, [], {
      cwd,
      env: process.env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let settled = false;
    let outerTimedOut = false;
    let guardTimer = null;
    child.stdout?.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on("data", (chunk) => stderr.push(Buffer.from(chunk)));

    const finish = async ({ code, signal, error = null }) => {
      if (settled) return;
      settled = true;
      try {
        if (guardTimer) clearTimeout(guardTimer);
        const stdoutBuffer = Buffer.concat(stdout);
        const stderrBuffer = Buffer.concat(stderr);
        try {
          await fs.writeFile(stdoutPath, stdoutBuffer);
          await fs.writeFile(
            stderrPath,
            error ? String(error?.stack || error?.message || error) : stderrBuffer,
          );
        } catch (writeError) {
          throw new WilliamsJobRunnerTransportError(
            `Windows Job runner output write failed: ${String(writeError?.message || writeError)}`,
            "job-runner-output-write-error",
            writeError,
          );
        }
        if (error instanceof WilliamsJobRunnerTransportError) throw error;
        let evidence = null;
        let evidenceError = null;
        try {
          evidence = JSON.parse(await fs.readFile(evidencePath, "utf8"));
        } catch (readError) {
          evidenceError = String(readError?.message || readError);
        }
        const evidenceErrors = validateJobRunnerEvidence(evidence, { command, cwd });
        if (evidenceError) evidenceErrors.unshift(`job-evidence.read:${evidenceError}`);
        if (code !== 0) evidenceErrors.unshift(`job-runner.exitCode:${code}`);
        if (outerTimedOut) evidenceErrors.unshift("job-runner.outer-timeout");
        const rootPid = Number(evidence?.rootPid);
        const jobPids = [...new Set([
          ...(Array.isArray(evidence?.jobProcessIdsAtRootExit) ? evidence.jobProcessIdsAtRootExit : []),
          ...(Number.isInteger(rootPid) && rootPid > 0 ? [rootPid] : []),
        ].map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
        const containmentAvailable = evidenceErrors.length === 0;
        resolve({
          pid: Number.isInteger(rootPid) && rootPid > 0 ? rootPid : null,
          exitCode: containmentAvailable && Number.isInteger(evidence?.rootExitCode)
            ? evidence.rootExitCode
            : 3,
          signal,
          timedOut: evidence?.timedOut === true || outerTimedOut,
          stdoutPath,
          stderrPath,
          jobEvidencePath: evidencePath,
          jobEvidence: evidence,
          jobRunnerBinary: preparedRunner.binary,
          containmentStatus: containmentAvailable ? "available" : "invalid",
          containmentErrors: evidenceErrors,
          taskOwnedTree: {
            rootPids: Number.isInteger(rootPid) && rootPid > 0 ? [rootPid] : [],
            pids: jobPids,
            processes: jobPids.map((pid) => ({
              ProcessId: pid,
              ParentProcessId: null,
              Name: null,
              ExecutablePath: null,
              CommandLine: null,
              depth: pid === rootPid ? 0 : 1,
              root: pid === rootPid,
            })),
            captureStatus: containmentAvailable ? "available" : "collection-error",
            captureErrors: evidenceErrors,
            jobEvidence: evidence,
          },
          error: error ? String(error?.message || error) : evidenceErrors[0],
        });
      } catch (finishError) {
        reject(finishError);
      }
    };
    child.on("close", (code, signal) => { void finish({ code, signal }); });
    child.on("error", (error) => { void finish({ code: 1, signal: null, error }); });
    child.stdin?.once("error", (stdinError) => {
      child.kill();
      void finish({
        code: 1,
        signal: null,
        error: new WilliamsJobRunnerTransportError(
          `Windows Job runner stdin failed: ${String(stdinError?.message || stdinError)}`,
          "job-runner-stdin-error",
          stdinError,
        ),
      });
    });
    guardTimer = setTimeout(() => {
      outerTimedOut = true;
      child.kill();
    }, timeoutMs + 10_000);
    try {
      child.stdin?.end(encodeWindowsJobRunnerSpec({
        executablePath: command.bin,
        workingDirectory: cwd,
        evidencePath,
        timeoutMs,
        args: command.args,
      }));
    } catch (stdinError) {
      child.kill();
      void finish({
        code: 1,
        signal: null,
        error: new WilliamsJobRunnerTransportError(
          `Windows Job runner stdin failed: ${String(stdinError?.message || stdinError)}`,
          "job-runner-stdin-error",
          stdinError,
        ),
      });
    }
  });
}

export async function prepareWindowsJobRunner({
  platform = process.platform,
  buildRoot = DEFAULT_JOB_RUNNER_BUILD_ROOT,
  evidenceDirectory = buildRoot,
  evidenceBinaryPath = null,
  evidenceBinaryDescriptorPath = WINDOWS_JOB_RUNNER_EVIDENCE_PATH,
  compileFn = compileWindowsJobRunner,
  runFn = runWindowsJobCommand,
} = {}) {
  if (platform !== "win32") {
    return Object.freeze({ status: "required-capability-missing", error: `platform=${platform}` });
  }
  let compiled;
  try {
    compiled = await compileFn({ platform, buildRoot });
  } catch (error) {
    return Object.freeze({ status: "compile-error", error: String(error?.stack || error?.message || error) });
  }
  let preparedExecutablePath = compiled.executablePath;
  let preparedBinary = compiled.binary;
  try {
    if (evidenceBinaryPath) {
      await fs.mkdir(path.dirname(evidenceBinaryPath), { recursive: true });
      await fs.copyFile(compiled.executablePath, evidenceBinaryPath, fsConstants.COPYFILE_EXCL);
      const evidenceBinary = await fs.readFile(evidenceBinaryPath);
      preparedExecutablePath = evidenceBinaryPath;
      preparedBinary = Object.freeze({
        path: evidenceBinaryDescriptorPath,
        sha256: sha256(evidenceBinary),
        bytes: evidenceBinary.length,
      });
    }
    const capabilityCommand = Object.freeze({
      bin: process.execPath,
      args: Object.freeze(["-e", "process.stdout.write('williams-job-runner-ready')"]),
      cwd: path.dirname(WINDOWS_JOB_RUNNER_SOURCE_PATH),
    });
    const prepared = {
      ...compiled,
      executablePath: preparedExecutablePath,
      binary: preparedBinary,
      status: "available",
    };
    const probeResult = await runFn(
      capabilityCommand,
      {
        preparedRunner: prepared,
        cwd: capabilityCommand.cwd,
        stdoutPath: path.join(evidenceDirectory, "capability.stdout.log"),
        stderrPath: path.join(evidenceDirectory, "capability.stderr.log"),
        evidencePath: path.join(evidenceDirectory, "capability.job.json"),
        timeoutMs: 10_000,
      },
    );
    if (probeResult.containmentStatus !== "available" || probeResult.exitCode !== 0) {
      await compiled.cleanup();
      return Object.freeze({
        status: "capability-error",
        error: probeResult.error || `probe exit ${probeResult.exitCode}`,
        probeResult,
      });
    }
    return Object.freeze({
      ...prepared,
      compiledAt: compiled.compiledAt,
      capabilityProbedAt: new Date().toISOString(),
      capabilityCommand,
      capabilityEvidence: probeResult.jobEvidence,
      capabilityEvidencePath: probeResult.jobEvidencePath,
    });
  } catch (error) {
    await compiled.cleanup();
    return Object.freeze({ status: "ready-error", error: String(error?.stack || error?.message || error) });
  }
}
