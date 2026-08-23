import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const APPROVED_V1_BASE = "829914aaca54d3c978fa6b6642dba04cc1dae3bc";
const CORE_REPO_PATH = "tools/process_containment/windows_job_runner_core.cs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE_PATH = path.join(ROOT, CORE_REPO_PATH);
const V2_PATH = path.join(ROOT, "tools/process_containment/windows_job_runner_v2.cs");

function normalizeCoreExtraction(source) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(
      "internal static partial class ScenarioForgeWindowsJobRunnerCore",
      "internal static class ScenarioForgeWindowsJobRunnerCore",
    )
    .trimEnd();
}

test("V1 shared core remains byte-equivalent to the approved Williams audit baseline", async () => {
  const current = await fs.readFile(CORE_PATH, "utf8");
  const frozen = execFileSync("git", ["show", `${APPROVED_V1_BASE}:${CORE_REPO_PATH}`], { cwd: ROOT, encoding: "utf8" });
  assert.match(current, /internal static partial class ScenarioForgeWindowsJobRunnerCore/);
  assert.equal(normalizeCoreExtraction(current), normalizeCoreExtraction(frozen));
});

test("V2 one-shot bootstrap matches Node ordering and raw-token base64 semantics", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  assert.match(source, /public static int Main\(\)[\s\S]+ScenarioForgeWindowsJobRunnerCore\.RunV2\(\)/);
  const readSpec = source.slice(source.indexOf("private static RunnerSpecV2 ReadSpecV2()"), source.indexOf("private static void InitializeCreationAttributesV2"));
  const orderedTokens = [
    'ReadBootstrapLineV2("protocol"',
    'DecodeStringLineV2("runId")',
    'ReadBootstrapLineV2("parentPid"',
    'DecodeStringLineV2("controlPipeName")',
    'DecodeBytesLineV2("controlToken")',
    'DecodeStringLineV2("executablePath")',
    'DecodeStringLineV2("workingDirectory")',
    'DecodeStringLineV2("evidencePath")',
    'ReadBootstrapLineV2("timeoutMs"',
    'ReadBootstrapLineV2("argumentCount"',
  ];
  let cursor = -1;
  for (const token of orderedTokens) {
    const next = readSpec.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `${token} must keep bootstrap order`);
    cursor = next;
  }
  assert.match(source, /controlToken\.Length != 32/);
  assert.match(source, /spec\.ControlToken = Convert\.ToBase64String\(controlToken\)/);
  assert.match(source, /new UTF8Encoding\(false, true\)\.GetString/);
  assert.doesNotMatch(source.slice(source.indexOf("ReadControlPipeV2")), /Console\.In\.ReadLine/);
});

test("V2 native parser enforces frozen bootstrap, path, and control-message bounds", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  for (const declaration of [
    /V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES = 64 \* 1024/,
    /V2_BOOTSTRAP_MAX_BYTES = 1024 \* 1024/,
    /V2_CONTROL_MESSAGE_MAX_BYTES = 16 \* 1024/,
    /V2_CANCEL_REASON_MAX_BYTES = 128/,
  ]) assert.match(source, declaration);
  assert.match(source, /V2BootstrapBytesRead > V2_BOOTSTRAP_MAX_BYTES/);
  assert.match(source, /decoded\.Length > V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES/);
  assert.match(source, /!Path\.IsPathRooted\(command\.WorkingDirectory\)/);
  assert.match(source, /!Path\.IsPathRooted\(command\.EvidencePath\)/);
  assert.match(source, /lineBytes > V2_CONTROL_MESSAGE_MAX_BYTES/);
  assert.match(source, /Encoding\.UTF8\.GetByteCount\(reasonCode\) > V2_CANCEL_REASON_MAX_BYTES/);
  assert.match(source, /String\.Equals\(requestedSignal, "SIGINT"/);
  assert.match(source, /String\.Equals\(requestedSignal, "SIGTERM"/);
  assert.doesNotMatch(source, /state\.Reader\.ReadLine\(\)/);
});

test("JSONL envelopes lock ready/start/started/cancel/cancel-accepted/terminal sequencing", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  assert.match(source, /using Microsoft\.Win32\.SafeHandles;/);
  assert.match(source, /DuplicateHandle\(currentProcess, pipeHandle, currentProcess, out writePipeHandle, 0, false, DUPLICATE_SAME_ACCESS\)/);
  assert.match(source, /new SafeFileHandle\(pipeHandle, true\)/);
  assert.match(source, /pipeHandle = IntPtr\.Zero;[\s\S]+new FileStream\(safeReadPipeHandle, FileAccess\.Read, 4096, false\)/);
  assert.match(source, /new FileStream\(safeWritePipeHandle, FileAccess\.Write, 4096, false\)/);
  assert.match(source, /PeekNamedPipe\(state\.ReadPipeHandle,[\s\S]+Thread\.Sleep\(10\)/);
  assert.match(source, /RecordControlFailureV2[\s\S]+WaitForSingleObject\(state\.ParentHandle, 0\)[\s\S]+V2_CAUSE_PARENT_DEATH/);
  assert.doesNotMatch(source, /new FileStream\(pipeHandle, FileAccess\.ReadWrite, true,/);
  for (const field of ["schemaVersion", "protocolId", "runId", "sequence", "type"]) {
    assert.match(source, new RegExp(`\\\\"${field}\\\\"`));
  }
  for (const type of ["ready", "start", "started", "cancel", "cancel-accepted", "terminal"]) {
    assert.match(source, new RegExp(`"${type}"`));
  }
  assert.match(source, /NextNodeSequence = 2/);
  assert.match(source, /NextHelperSequence = 3/);
  assert.match(source, /ParseRequiredIntV2\(fields, "sequence"\) != state\.NextNodeSequence/);
  assert.match(source, /state\.NextNodeSequence \+= 2/);
  assert.match(source, /state\.NextHelperSequence \+= 2/);
  assert.match(source, /if \(state\.TerminalCommitted\) return;/);
  assert.match(
    source,
    /lock \(controlState\.WriteLock\)[\s\S]+controlState\.TerminalCommitted = true;[\s\S]+new List<string>\(controlState\.SecondaryCauses\)/,
  );
  for (const cancelField of ["requestId", "cause", "reasonCode", "requestedSignal", "requestedAt"]) {
    assert.match(source, new RegExp(`"${cancelField}"`));
  }
  assert.match(source, /if \(accepted\) state\.CancelRequestId = requestId;/);
  assert.match(source, /else state\.SecondaryCauses\.Add\("cancel-requested"\);/);
  assert.match(
    source,
    /BuildEvidenceV2\([\s\S]+controlState\.SecondaryCauses[\s\S]+controlState\.CancelRequestId/,
  );
  assert.match(source, /BuildExpectedStartV2/);
  assert.match(source, /authToken/);
  const evidence = source.slice(source.indexOf("private static string BuildEvidenceV2"));
  assert.doesNotMatch(evidence, /ControlToken|authToken/);
});

test("parent identity and creation-time Job containment precede resume", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  const core = await fs.readFile(CORE_PATH, "utf8");
  const sourceSet = `${core}\n${source}`;
  for (const token of [
    "PROC_THREAD_ATTRIBUTE_HANDLE_LIST",
    "PROC_THREAD_ATTRIBUTE_JOB_LIST",
    "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE",
    "CREATE_SUSPENDED",
    "CREATE_NO_WINDOW",
  ]) assert.match(sourceSet, new RegExp(token));
  const run = source.slice(source.indexOf("public static int RunV2()"));
  const parent = run.indexOf("OpenProcess(SYNCHRONIZE | V2_PROCESS_QUERY_LIMITED_INFORMATION");
  const parentTimes = run.indexOf("GetProcessTimes(parentHandle", parent);
  const startAck = run.indexOf("controlState.StartAckVerified", parentTimes);
  const create = run.indexOf("CreateProcessW(", startAck);
  const membership = run.indexOf("IsProcessInJob(", create);
  const resume = run.indexOf("ResumeThread(", membership);
  const started = run.indexOf('"started"', resume);
  assert.ok(parent >= 0 && parent < parentTimes && parentTimes < startAck && startAck < create && create < membership && membership < resume && resume < started);
  assert.doesNotMatch(sourceSet, /CREATE_BREAKAWAY_FROM_JOB|JOB_OBJECT_LIMIT_(?:SILENT_)?BREAKAWAY_OK/);
  assert.doesNotMatch(run.slice(create, resume), /AssignProcessToJobObject/);
});

test("primary cause wait and cleanup use Job termination plus accounting zero", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  const run = source.slice(source.indexOf("public static int RunV2()"));
  assert.match(run, /new IntPtr\[\] \{ primaryCauseEvent, parentHandle, processHandle \}/);
  assert.match(run, /WaitForMultipleObjects\(3, terminalWaitHandles, false/);
  assert.match(source, /Interlocked\.CompareExchange\(ref state\.FirstCause/);
  for (const cause of ["root-exit", "parent-death", "cancel-requested", "control-loss", "timeout"]) {
    assert.match(source, new RegExp(`return "${cause}"`));
  }
  assert.match(run, /terminateSucceeded = TerminateJobObject\(jobHandle, V2_CLEANUP_EXIT_CODE\)/);
  assert.doesNotMatch(run, /firstCause != V2_CAUSE_ROOT_EXIT[\s\S]{0,200}TerminateJobObject/);
  assert.match(source, /JOBOBJECT_BASIC_ACCOUNTING_INFORMATION/);
  assert.match(source, /JobObjectBasicAccountingInformation/);
  assert.match(source, /return information\.ActiveProcesses/);
  assert.match(
    run,
    /cleanupVerified = rootResumed[\s\S]+activeProcessesAfterCleanup == 0[\s\S]+remainingPids\.Count == 0[\s\S]+unverifiedPids\.Count == 0/,
  );
});

test("schema-2 evidence matches validator and terminal follows durable SHA-256 publication", async () => {
  const source = await fs.readFile(V2_PATH, "utf8");
  for (const token of [
    "scenario-forge-windows-job-run",
    "windows-job-object",
    "primaryCause",
    "secondaryCauses",
    "startedAt",
    "rootResumedAt",
    "cleanupStartedAt",
    "finishedAt",
    "cleanupStarted",
    "finished",
    "handleOpened",
    "identityAcknowledged",
    "deathObserved",
    "assignedAtCreation",
    "assignedBeforeResume",
    "resumed",
    "terminationConfirmed",
    "jobListAtCreation",
    "activeProcessesAtCleanupStart",
    "activeProcessesAfterCleanup",
    "processIdsAtCleanupStart",
    "named-pipe-jsonl",
    "authenticated",
    "startAcknowledged",
    "cancelRequestId",
    "terminalMessagePrepared",
    "cleanupWaitMs",
    "command",
    "error",
  ]) assert.ok(source.includes(token), `${token} evidence field is required`);

  const publish = source.slice(source.indexOf("private static string PublishEvidenceDurablyV2"), source.indexOf("public static int RunV2()"));
  assert.match(publish, /Path\.Combine\(directory/);
  assert.match(publish, /FileMode\.CreateNew/);
  assert.match(publish, /stream\.Flush\(true\)/);
  assert.match(publish, /File\.ReadAllBytes\(tempPath\)/);
  assert.match(publish, /ValidateJsonDocumentV2\(readback\)/);
  assert.match(publish, /File\.Move\(tempPath, evidencePath\)/);
  assert.match(publish, /SHA256\.Create\(\)/);

  const run = source.slice(source.indexOf("public static int RunV2()"));
  const publishIndex = run.indexOf("PublishEvidenceDurablyV2(");
  const terminalIndex = run.indexOf('"terminal"', publishIndex);
  assert.ok(publishIndex >= 0 && publishIndex < terminalIndex);
  assert.match(run.slice(terminalIndex), /evidenceSha256/);
  assert.match(source, /return String\.Equals\(status, "complete", StringComparison\.Ordinal\) \? 0 : 3;/);
  assert.doesNotMatch(source, /return rootExitCode/);
});
