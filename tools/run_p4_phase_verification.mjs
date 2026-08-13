import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeP4StateActionPhase } from "./p4_state_action_phases.mjs";
import {
  RESUMABLE_VERIFICATION_SCHEMA_VERSION,
  atomicWriteJsonSync,
  buildCommandStates,
  buildPlanIdentity,
  captureVerificationIdentity,
  decideResume,
  discoverChangedFilesBetween,
  normalizeVerificationIdentity,
  readResumeCheckpoint,
  runCheckpointedCommands,
  summarizeCommandStates,
} from "./verification/resumable_verification.mjs";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const P4_PHASE_COMMANDS = Object.freeze({
  "P4.1": Object.freeze([
    "npm run test:node:p4:p4-1",
    "npm run test:python:p4:p4-1-boundary",
    "node tools/check_state_writer_policy.mjs --phase P4.1 --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.1 --history-base HEAD^",
  ]),
  "P4.2a": Object.freeze([
    "npm run test:node:p4:p4-2a",
    "npm run test:python:p4:p4-2a-boundary",
    "node tools/check_state_writer_policy.mjs --phase P4.2a --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2a --history-base HEAD^",
  ]),
  "P4.2b": Object.freeze([
    "npm run test:node:p4:p4-2b",
    "npm run test:python:p4:p4-2b-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.2b --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2b --history-base HEAD^",
  ]),
  "P4.2c": Object.freeze([
    "npm run test:node:p4:p4-2c",
    "npm run test:python:p4:p4-2c-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.2c --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.2c --history-base HEAD^",
  ]),
  "P4.3": Object.freeze([
    "npm run test:node:p4:p4-3",
    "npm run test:python:p4:p4-3-boundary",
    "npm run test:node:p4:state-writer-policy",
    "node tools/check_state_writer_policy.mjs --phase P4.3 --require-clean",
    "node tools/check_p4_state_action_routes.mjs --phase P4.3 --history-base HEAD^",
  ]),
});

function normalizeRepoPath(value) {
  return String(value || "").replaceAll("\\", "/");
}

export function defaultP4PhaseReportPath(phase) {
  return path.join(
    ".runtime",
    "reports",
    "generated",
    "p4-state-actions",
    normalizeP4StateActionPhase(phase),
    "phase-verification.json",
  );
}

export function parseArgs(argv) {
  const args = {
    phase: null,
    list: false,
    resume: false,
    resumeFrom: null,
    jsonOut: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--phase") {
      args.phase = argv[++index] || null;
    } else if (token === "--list") {
      args.list = true;
    } else if (token === "--resume") {
      args.resume = true;
    } else if (token === "--resume-from") {
      args.resume = true;
      args.resumeFrom = argv[++index] || null;
    } else if (token === "--json-out") {
      args.jsonOut = argv[++index] || null;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!args.phase) {
    throw new Error("P4 phase verification requires --phase.");
  }
  args.phase = normalizeP4StateActionPhase(args.phase);
  args.jsonOut = args.jsonOut || defaultP4PhaseReportPath(args.phase);
  return args;
}

export function buildP4PhaseVerificationPlan({ phase }) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  const commands = P4_PHASE_COMMANDS[normalizedPhase];
  if (!commands) {
    throw new Error(
      `P4 phase verification has no executable plan for ${normalizedPhase}.`,
    );
  }
  return Object.freeze({
    phase: normalizedPhase,
    commands: Object.freeze([...commands]),
    reportPath: defaultP4PhaseReportPath(normalizedPhase),
  });
}

export function commandToProcess(commandRef, platform = process.platform) {
  const command = String(commandRef || "").trim();
  if (!command) {
    throw new Error("P4 phase verification commandRef must not be empty.");
  }
  if (command.startsWith("npm run ")) {
    const args = command.split(/\s+/);
    if (platform === "win32") {
      return {
        command: "cmd.exe",
        args: ["/d", "/s", "/c", ...args],
      };
    }
    return {
      command: args[0],
      args: args.slice(1),
    };
  }
  if (command.startsWith("node ")) {
    const args = command.split(/\s+/);
    return {
      command: process.execPath,
      args: args.slice(1),
    };
  }
  throw new Error(`Unsupported P4 phase commandRef: ${command}`);
}

export function readVerificationIdentity({
  cwd = REPO_ROOT,
  runner = spawnSync,
} = {}) {
  const identity = captureVerificationIdentity({ cwd, runner });
  return Object.freeze({
    ...identity,
    trackedStatus: identity.workspaceStatus,
  });
}

function writeJsonReport(reportPath, report, cwd = REPO_ROOT) {
  const absolutePath = path.resolve(cwd, reportPath);
  atomicWriteJsonSync(absolutePath, report);
}

export function runVerificationPlan(plan, {
  cwd = REPO_ROOT,
  runner = spawnSync,
  platform = process.platform,
  identityReader = null,
  identity = null,
  jsonOut = plan.reportPath,
  execute = true,
  resumeCheckpoint = null,
  changedFilesReader = (baseSha) => discoverChangedFilesBetween(baseSha, { cwd }),
  now = () => new Date(),
} = {}) {
  const effectiveIdentityReader = identityReader
    || (identity
      ? () => identity
      : () => readVerificationIdentity({ cwd, runner }));
  const normalizedIdentity = normalizeVerificationIdentity(identity || effectiveIdentityReader());
  const normalizedIdentityReader = () => normalizeVerificationIdentity(effectiveIdentityReader());
  const runnerId = `p4-phase-${plan.phase}`;
  const planIdentity = buildPlanIdentity({
    runnerId,
    entries: plan.commands.map((commandRef) => ({
      group: plan.phase,
      commandRef,
      command: commandRef,
      commandType: commandRef.startsWith("npm run ") ? "package-script" : "direct",
    })),
  });
  let resumeDecision = {
    mode: "fresh",
    blockReason: null,
    reusedIndexes: [],
    changedFiles: [],
    unmatchedChangedFiles: [],
    invalidatedCommandRefs: [],
  };
  if (resumeCheckpoint) {
    try {
      resumeDecision = decideResume({
        checkpoint: resumeCheckpoint,
        checkpointKind: "p4-phase-verification",
        runnerId,
        planIdentity,
        verificationIdentity: normalizedIdentity,
        changedFilesReader,
      });
    } catch (error) {
      resumeDecision = {
        mode: "blocked",
        blockReason: error?.code || "checkpoint-invalid",
        detail: error?.message || String(error),
        reusedIndexes: [],
        changedFiles: [],
        unmatchedChangedFiles: [],
        invalidatedCommandRefs: [],
      };
    }
  }
  const report = {
    schemaVersion: RESUMABLE_VERIFICATION_SCHEMA_VERSION,
    kind: "p4-phase-verification",
    runnerId,
    phase: plan.phase,
    planIdentity,
    verificationIdentity: normalizedIdentity,
    commands: buildCommandStates(planIdentity, {
      checkpoint: resumeCheckpoint,
      resumeDecision,
      verificationIdentity: normalizedIdentity,
    }),
    resumeDecision,
    startedAt: now().toISOString(),
    updatedAt: null,
    summary: null,
    verdict: execute ? resumeDecision.mode === "blocked" ? "blocked" : "running" : "listed",
  };
  const checkpoint = () => {
    report.updatedAt = now().toISOString();
    report.summary = summarizeCommandStates(report.commands);
    writeJsonReport(jsonOut, report, cwd);
  };
  if (!normalizedIdentity.workspaceClean) {
    report.verdict = "blocked";
    report.blockReason = "workspace-dirty";
    checkpoint();
    return { report, exitCode: 2 };
  }
  if (resumeDecision.mode === "blocked") {
    report.blockReason = resumeDecision.blockReason;
    checkpoint();
    return { report, exitCode: 2 };
  }
  if (!execute) {
    checkpoint();
    return { report, exitCode: 0 };
  }
  checkpoint();
  runCheckpointedCommands({
    report,
    checkpoint,
    now,
    identityReader: normalizedIdentityReader,
    expectedVerificationIdentity: normalizedIdentity,
    execute(commandResult) {
      const resolved = commandToProcess(commandResult.commandRef, platform);
      return runner(resolved.command, resolved.args, {
        cwd,
        encoding: "utf8",
        shell: false,
        stdio: "inherit",
      });
    },
  });
  const failed = report.commands.find((entry) => entry.status === "failed");
  if (failed) return { report, exitCode: failed.exitCode };

  const finalIdentity = normalizedIdentityReader();
  report.finalVerificationIdentity = finalIdentity;
  if (
    !finalIdentity.workspaceClean
    || finalIdentity.verificationSha !== normalizedIdentity.verificationSha
    || finalIdentity.verificationTreeSha !== normalizedIdentity.verificationTreeSha
  ) {
    report.verdict = "failed";
    report.blockReason = "verification-identity-drift";
    checkpoint();
    return { report, exitCode: 2 };
  }
  report.verdict = "pass";
  checkpoint();
  return { report, exitCode: 0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildP4PhaseVerificationPlan({ phase: args.phase });
  let resumeCheckpoint = null;
  if (args.resume) {
    try {
      resumeCheckpoint = readResumeCheckpoint(args.resumeFrom || args.jsonOut);
    } catch (error) {
      console.error(error?.message || error);
      process.exitCode = 2;
      return;
    }
  }
  const result = runVerificationPlan(plan, {
    jsonOut: args.jsonOut,
    execute: !args.list,
    resumeCheckpoint,
  });
  console.log(
    [
      `P4 phase verification ${result.report.verdict}`,
      `phase=${result.report.phase}`,
      `commands=${result.report.commands.length}`,
      `report=${normalizeRepoPath(path.resolve(REPO_ROOT, args.jsonOut))}`,
    ].join(" "),
  );
  process.exitCode = result.exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
