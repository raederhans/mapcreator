import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeP4StateActionPhase } from "./p4_state_action_phases.mjs";

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
    jsonOut: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--phase") {
      args.phase = argv[++index] || null;
    } else if (token === "--list") {
      args.list = true;
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

function runGit(args, {
  cwd = REPO_ROOT,
  runner = spawnSync,
} = {}) {
  const result = runner("git", args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${String(result.stderr || "").trim()}`,
    );
  }
  return String(result.stdout || "").trim();
}

export function readVerificationIdentity({
  cwd = REPO_ROOT,
  runner = spawnSync,
} = {}) {
  const verificationSha = runGit(["rev-parse", "HEAD"], { cwd, runner });
  const verificationTreeSha = runGit(
    ["rev-parse", "HEAD^{tree}"],
    { cwd, runner },
  );
  const trackedStatus = runGit(
    ["status", "--porcelain=v1", "--untracked-files=no"],
    { cwd, runner },
  );
  return Object.freeze({
    verificationSha,
    verificationTreeSha,
    trackedClean: trackedStatus === "",
    trackedStatus,
  });
}

function writeJsonReport(reportPath, report, cwd = REPO_ROOT) {
  const absolutePath = path.resolve(cwd, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function runVerificationPlan(plan, {
  cwd = REPO_ROOT,
  runner = spawnSync,
  platform = process.platform,
  identityReader = () => readVerificationIdentity({ cwd, runner }),
  identity = identityReader(),
  jsonOut = plan.reportPath,
  execute = true,
} = {}) {
  const report = {
    schemaVersion: 1,
    kind: "p4-phase-verification",
    phase: plan.phase,
    verificationIdentity: identity,
    commands: plan.commands.map((commandRef) => ({
      commandRef,
      status: execute ? "pending" : "listed",
      exitCode: null,
    })),
    verdict: execute ? "running" : "listed",
  };
  if (!identity.trackedClean) {
    report.verdict = "blocked";
    report.blockReason = "tracked-worktree-dirty";
    writeJsonReport(jsonOut, report, cwd);
    return { report, exitCode: 2 };
  }
  if (!execute) {
    writeJsonReport(jsonOut, report, cwd);
    return { report, exitCode: 0 };
  }

  for (const commandResult of report.commands) {
    const resolved = commandToProcess(commandResult.commandRef, platform);
    commandResult.status = "running";
    writeJsonReport(jsonOut, report, cwd);
    const result = runner(resolved.command, resolved.args, {
      cwd,
      encoding: "utf8",
      shell: false,
      stdio: "inherit",
    });
    const exitCode = Number.isInteger(result.status) ? result.status : 1;
    commandResult.exitCode = exitCode;
    commandResult.status = exitCode === 0 ? "passed" : "failed";
    if (exitCode !== 0) {
      report.verdict = "failed";
      report.failedCommandRef = commandResult.commandRef;
      writeJsonReport(jsonOut, report, cwd);
      return { report, exitCode };
    }
  }

  const finalIdentity = identityReader();
  report.finalVerificationIdentity = finalIdentity;
  if (
    !finalIdentity.trackedClean
    || finalIdentity.verificationSha !== identity.verificationSha
    || finalIdentity.verificationTreeSha !== identity.verificationTreeSha
  ) {
    report.verdict = "failed";
    report.blockReason = "verification-identity-drift";
    writeJsonReport(jsonOut, report, cwd);
    return { report, exitCode: 2 };
  }
  report.verdict = "pass";
  writeJsonReport(jsonOut, report, cwd);
  return { report, exitCode: 0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildP4PhaseVerificationPlan({ phase: args.phase });
  const result = runVerificationPlan(plan, {
    jsonOut: args.jsonOut,
    execute: !args.list,
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
