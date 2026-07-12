import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const WINDOWS_COUNTER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$samples = @()
for ($index = 0; $index -lt 5; $index += 1) {
  Start-Sleep -Seconds 1
  $processorSample = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" -ErrorAction Stop
  $memorySample = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop
  foreach ($propertyName in @('PercentProcessorTime','PercentProcessorPerformance','PercentofMaximumFrequency','ProcessorFrequency')) {
    if ($null -eq $processorSample.$propertyName) { throw "required processor counter missing: $propertyName" }
  }
  foreach ($propertyName in @('PercentCommittedBytesInUse','AvailableMBytes')) {
    if ($null -eq $memorySample.$propertyName) { throw "required memory counter missing: $propertyName" }
  }
  $samples += [pscustomobject]@{
    at = [datetime]::UtcNow.ToString('o')
    cpuUtilizationPercent = [double]$processorSample.PercentProcessorTime
    processorPerformancePercent = [double]$processorSample.PercentProcessorPerformance
    percentOfMaximumFrequency = [double]$processorSample.PercentofMaximumFrequency
    processorFrequencyMHz = [double]$processorSample.ProcessorFrequency
    performanceAdjustedFrequencyMHz = ([double]$processorSample.ProcessorFrequency * [double]$processorSample.PercentProcessorPerformance) / 100.0
    memoryCommittedPercent = [double]$memorySample.PercentCommittedBytesInUse
    memoryAvailableMBytes = [double]$memorySample.AvailableMBytes
  }
}
if ($samples.Count -ne 5) { throw "required sample count mismatch: $($samples.Count)" }
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
  schemaVersion = 1
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

const WINDOWS_PROCESS_START_WATCHER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$sourceIdentifier = 'ScenarioForgeWilliamsProcessStart'
Register-CimIndicationEvent -Query 'SELECT * FROM Win32_ProcessStartTrace' -SourceIdentifier $sourceIdentifier -ErrorAction Stop | Out-Null
[Console]::Out.WriteLine('{"type":"ready"}')
[Console]::Out.Flush()
try {
  while ($true) {
    $eventRecord = Wait-Event -SourceIdentifier $sourceIdentifier -Timeout 1
    if ($null -eq $eventRecord) { continue }
    $processEvent = $eventRecord.SourceEventArgs.NewEvent
    [pscustomobject]@{
      type = 'process-start'
      ProcessId = [int]$processEvent.ProcessID
      ParentProcessId = [int]$processEvent.ParentProcessID
      Name = [string]$processEvent.ProcessName
    } | ConvertTo-Json -Compress | ForEach-Object {
      [Console]::Out.WriteLine($_)
      [Console]::Out.Flush()
    }
    Remove-Event -EventIdentifier $eventRecord.EventIdentifier -ErrorAction SilentlyContinue
  }
} finally {
  Unregister-Event -SourceIdentifier $sourceIdentifier -ErrorAction SilentlyContinue
}
`;

export const TASK_PROCESS_MONITOR_INTERVAL_MS = 200;

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
    schemaVersion: 1,
    phase,
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
      schemaVersion: 1,
      phase,
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

export async function startWindowsProcessStartWatcher({
  platform = process.platform,
  onProcessStart = () => {},
  onError = () => {},
  startupTimeoutMs = 5000,
  spawnFn = spawn,
} = {}) {
  if (platform !== "win32") throw new Error(`Windows process-start watcher required; platform=${platform}`);
  return new Promise((resolve, reject) => {
    const child = spawnFn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PROCESS_START_WATCHER_SCRIPT],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let ready = false;
    let stopped = false;
    let stdoutBuffer = "";
    let stderr = "";
    const startupTimer = setTimeout(() => {
      if (ready) return;
      terminateTaskOwnedProcess(child.pid);
      reject(new Error(`Windows process-start watcher readiness timed out after ${startupTimeoutMs}ms`));
    }, startupTimeoutMs);

    function handleLine(line) {
      if (!line.trim()) return;
      let payload;
      try {
        payload = JSON.parse(line);
      } catch (error) {
        onError(new Error(`Windows process-start watcher emitted invalid JSON: ${line}`));
        return;
      }
      if (payload?.type === "ready" && !ready) {
        ready = true;
        clearTimeout(startupTimer);
        resolve(Object.freeze({
          pid: child.pid,
          stop() {
            if (stopped) return { pid: child.pid, attempted: false, exitCode: 0, stderr };
            stopped = true;
            return { ...terminateTaskOwnedProcess(child.pid), watcherStderr: stderr };
          },
        }));
        return;
      }
      if (payload?.type === "process-start") onProcessStart(payload);
    }

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      lines.forEach(handleLine);
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(startupTimer);
      if (!ready) reject(error);
      else onError(error);
    });
    child.on("close", (code) => {
      clearTimeout(startupTimer);
      if (!ready) reject(new Error(`Windows process-start watcher exited ${code}: ${stderr.trim()}`));
      else if (!stopped) onError(new Error(`Windows process-start watcher exited ${code}: ${stderr.trim()}`));
    });
  });
}

function normalizedPidSet(values = []) {
  return new Set(values.map(Number).filter((pid) => Number.isInteger(pid) && pid > 0));
}

export function expandTaskOwnedProcessIds(processes = [], knownOwnedPids = []) {
  const owned = normalizedPidSet(knownOwnedPids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const processEntry of processes) {
      const pid = Number(processEntry?.ProcessId);
      const parentPid = Number(processEntry?.ParentProcessId);
      if (!Number.isInteger(pid) || pid <= 0 || owned.has(pid) || !owned.has(parentPid)) continue;
      owned.add(pid);
      changed = true;
    }
  }
  return [...owned];
}

export function buildTaskOwnedProcessTree(processes = [], rootPids = [], knownOwnedPids = []) {
  const roots = [...normalizedPidSet(rootPids)];
  const byParent = new Map();
  const byPid = new Map();
  for (const processEntry of processes) {
    const pid = Number(processEntry?.ProcessId);
    const parentPid = Number(processEntry?.ParentProcessId);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const normalized = { ...processEntry, ProcessId: pid, ParentProcessId: parentPid };
    byPid.set(pid, normalized);
    if (!byParent.has(parentPid)) byParent.set(parentPid, []);
    byParent.get(parentPid).push(normalized);
  }
  const expandedOwnedPids = expandTaskOwnedProcessIds(processes, [...knownOwnedPids, ...roots]);
  const depthByPid = new Map(roots.map((pid) => [pid, 0]));
  let depthChanged = true;
  while (depthChanged) {
    depthChanged = false;
    for (const processEntry of processes) {
      const pid = Number(processEntry?.ProcessId);
      const parentPid = Number(processEntry?.ParentProcessId);
      if (!expandedOwnedPids.includes(pid) || !depthByPid.has(parentPid) || depthByPid.has(pid)) continue;
      depthByPid.set(pid, depthByPid.get(parentPid) + 1);
      depthChanged = true;
    }
  }
  const queue = expandedOwnedPids.map((pid) => ({ pid, depth: depthByPid.get(pid) ?? 0 }));
  const seen = new Set();
  const owned = [];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current.pid)) continue;
    seen.add(current.pid);
    const processEntry = byPid.get(current.pid);
    owned.push({
      ProcessId: current.pid,
      ParentProcessId: processEntry?.ParentProcessId ?? null,
      Name: processEntry?.Name ?? null,
      ExecutablePath: processEntry?.ExecutablePath ?? null,
      CommandLine: processEntry?.CommandLine ?? null,
      depth: current.depth,
      root: roots.includes(current.pid),
    });
    for (const child of byParent.get(current.pid) || []) {
      queue.push({ pid: child.ProcessId, depth: current.depth + 1 });
    }
  }
  return {
    rootPids: roots,
    pids: owned.map((entry) => entry.ProcessId),
    processes: owned,
  };
}

export function createTaskOwnedProcessMonitor({
  snapshotProvider = collectWindowsProcessSnapshot,
  intervalMs = TASK_PROCESS_MONITOR_INTERVAL_MS,
  delayFn = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const rootPids = new Set();
  const ownedPids = new Set();
  const observedProcesses = new Map();
  const ownedProcesses = new Map();
  const captureErrors = [];
  function recomputeOwnership() {
    const processes = [...observedProcesses.values()];
    const expanded = expandTaskOwnedProcessIds(processes, [...ownedPids, ...rootPids]);
    expanded.forEach((pid) => ownedPids.add(pid));
    for (const processEntry of processes) {
      const pid = Number(processEntry?.ProcessId);
      if (ownedPids.has(pid)) ownedProcesses.set(pid, { ...processEntry, ProcessId: pid });
    }
  }

  function ingest(processes) {
    try {
      for (const processEntry of processes) {
        const pid = Number(processEntry?.ProcessId);
        if (Number.isInteger(pid) && pid > 0) observedProcesses.set(pid, { ...processEntry, ProcessId: pid });
      }
      recomputeOwnership();
    } catch (error) {
      captureErrors.push(String(error?.stack || error?.message || error));
    }
  }

  function sample() {
    try {
      ingest(snapshotProvider());
    } catch (error) {
      captureErrors.push(String(error?.stack || error?.message || error));
    }
  }

  function recordCaptureError(error) {
    captureErrors.push(String(error?.stack || error?.message || error));
  }

  function registerRoot(pid) {
    const numericPid = Number(pid);
    if (!Number.isInteger(numericPid) || numericPid <= 0) return;
    rootPids.add(numericPid);
    ownedPids.add(numericPid);
    recomputeOwnership();
  }

  function snapshot() {
    const roots = [...rootPids];
    const pids = [...ownedPids];
    const processes = pids.map((pid) => ({
      ProcessId: pid,
      ParentProcessId: ownedProcesses.get(pid)?.ParentProcessId ?? null,
      Name: ownedProcesses.get(pid)?.Name ?? null,
      ExecutablePath: ownedProcesses.get(pid)?.ExecutablePath ?? null,
      CommandLine: ownedProcesses.get(pid)?.CommandLine ?? null,
      depth: 0,
      root: rootPids.has(pid),
    }));
    for (const processEntry of processes) {
      let currentParent = processEntry.ParentProcessId;
      const visited = new Set();
      while (ownedPids.has(currentParent) && !visited.has(currentParent)) {
        visited.add(currentParent);
        processEntry.depth += 1;
        currentParent = ownedProcesses.get(currentParent)?.ParentProcessId ?? null;
      }
    }
    return {
      rootPids: roots,
      pids,
      processes,
      captureStatus: captureErrors.length ? "collection-error" : "available",
      captureErrors: [...captureErrors],
    };
  }

  async function stop({ finalSamples = 3 } = {}) {
    for (let index = 0; index < finalSamples; index += 1) {
      sample();
      if (index + 1 < finalSamples) await delayFn(intervalMs);
    }
    return snapshot();
  }

  return Object.freeze({ ingest, recordCaptureError, registerRoot, sample, snapshot, stop });
}

export function isProcessRunning(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) return false;
  try {
    process.kill(numericPid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function terminateTaskOwnedProcess(pid, { platform = process.platform } = {}) {
  if (!isProcessRunning(pid)) return { pid: Number(pid), attempted: false, exitCode: 0, stdout: "", stderr: "" };
  if (platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return {
      pid: Number(pid),
      attempted: true,
      exitCode: result.status ?? 1,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || result.error?.message || ""),
    };
  }
  try {
    process.kill(pid, "SIGTERM");
    return { pid: Number(pid), attempted: true, exitCode: 0, stdout: "", stderr: "" };
  } catch (_error) {
    return { pid: Number(pid), attempted: true, exitCode: 1, stdout: "", stderr: String(_error?.message || _error) };
  }
}
