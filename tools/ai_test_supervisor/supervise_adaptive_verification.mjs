import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { commandToProcess } from "../run_adaptive_tests.mjs";
import { buildChangeDossier } from "./build_change_dossier.mjs";
import { buildExecutionCommandList, commandKey } from "./command_lanes.mjs";
import { renderSupervisorMarkdown } from "./render_supervisor_markdown.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_DOSSIER_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "supervisor-change-dossier.json");
const DEFAULT_PLAN_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "supervisor-plan.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "supervisor-plan.md");

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function commandRefs(entries = []) {
  return uniqueSorted(entries.map((entry) => commandKey(typeof entry === "string" ? entry : entry?.commandRef || entry?.command)));
}

function blockedFromLane(entries = []) {
  return entries
    .map((entry) => ({
      commandRef: commandKey(entry.commandRef || entry.command),
      lane: entry.lane || "blocked",
      reason: entry.laneReason || entry.reason || "blocked command",
    }))
    .filter((entry) => entry.commandRef);
}

function planIdFor(dossier) {
  const basis = `${dossier.gitSha || "unknown"}:${dossier.changedFiles.join(",")}:${dossier.generatedAt}`;
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) {
    hash = ((hash << 5) - hash + basis.charCodeAt(index)) | 0;
  }
  return `sf-ats-plan-${Math.abs(hash).toString(16)}`;
}

export function parseSupervisorArgs(argv = []) {
  const args = {
    changedFiles: [],
    includeBranchHistory: false,
    execute: false,
    includeMainThread: false,
    includeCiOnly: false,
    strictBlocked: false,
    continueOnFailure: false,
    jsonOut: DEFAULT_PLAN_OUT,
    dossierOut: DEFAULT_DOSSIER_OUT,
    mdOut: DEFAULT_MD_OUT,
    printJson: false,
    baseSha: "",
    gitSha: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--changed-file") args.changedFiles.push(argv[++index]);
    else if (token === "--changed-files") args.changedFiles.push(...splitList(argv[++index]));
    else if (token === "--changed-files-list") args.changedFiles.push(...readLines(argv[++index]));
    else if (token === "--include-branch-history") args.includeBranchHistory = true;
    else if (token === "--execute") args.execute = true;
    else if (token === "--include-main-thread") args.includeMainThread = true;
    else if (token === "--include-ci-only") args.includeCiOnly = true;
    else if (token === "--strict-blocked") args.strictBlocked = true;
    else if (token === "--continue-on-failure") args.continueOnFailure = true;
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--dossier-out") args.dossierOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else if (token === "--print-json") args.printJson = true;
    else if (token === "--base-sha") args.baseSha = argv[++index];
    else if (token === "--git-sha") args.gitSha = argv[++index];
    else if (token && !token.startsWith("--")) args.changedFiles.push(token);
    else throw new Error(`Unknown supervisor argument: ${token}`);
  }
  return args;
}

function stopConditionsFor({ routeGaps, blockedCommands, continueOnFailure }) {
  const conditions = ["Stop on the first child-safe command failure unless continue-on-failure is set."];
  if (continueOnFailure) {
    conditions[0] = "Continue through child-safe command failures and record all exit codes.";
  }
  if (routeGaps.length > 0) {
    conditions.push("Route gaps require selector coverage before claiming complete verification.");
  }
  if (blockedCommands.length > 0) {
    conditions.push("Blocked main-thread or CI-only commands require a reserved lane or external CI evidence.");
  }
  return conditions;
}

export function buildSupervisorPlan({
  dossier,
  includeMainThread = false,
  includeCiOnly = false,
  strictBlocked = false,
  continueOnFailure = false,
  execute = false,
  now = new Date(),
  planId = "",
} = {}) {
  if (!dossier) {
    throw new Error("buildSupervisorPlan requires a change dossier.");
  }
  const laneSummary = dossier.laneSummary || {};
  const basePlan = {
    childSafeCommands: commandRefs(laneSummary.childSafeCommands || []),
    mainThreadCommands: commandRefs(laneSummary.mainThreadCommands || []),
    ciOnlyCommands: commandRefs(laneSummary.ciOnlyCommands || []),
    blockedCommands: blockedFromLane(laneSummary.blockedCommands || []),
  };
  const executionList = buildExecutionCommandList(basePlan, { includeMainThread, includeCiOnly });
  // 计划对象同时服务 dry-run 和 execute；commandsToRun 只包含当前 lane 已获准执行的命令。
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    planId: planId || planIdFor(dossier),
    riskLevel: dossier.riskLevel,
    changedFiles: dossier.changedFiles,
    domains: uniqueSorted(dossier.domainSummaries.map((entry) => entry.domainId)),
    childSafeCommands: basePlan.childSafeCommands,
    mainThreadCommands: basePlan.mainThreadCommands,
    ciOnlyCommands: basePlan.ciOnlyCommands,
    blockedCommands: executionList.blockedCommands,
    commandsToRun: executionList.commandsToRun,
    routeGaps: dossier.routeGaps,
    requiredArtifacts: dossier.requiredArtifacts,
    executionPolicy: {
      execute,
      includeMainThread,
      includeCiOnly,
      strictBlocked,
      continueOnFailure,
      defaultLane: "child-safe",
    },
    stopConditions: stopConditionsFor({
      routeGaps: dossier.routeGaps,
      blockedCommands: executionList.blockedCommands,
      continueOnFailure,
    }),
    executionResults: [],
    notes: uniqueSorted([
      ...dossier.riskReasons,
      ...(dossier.selector?.advisoryNotes || []),
    ]),
  };
}

export function runCommand(commandRef, {
  runner = spawnSync,
  cwd = REPO_ROOT,
  now = () => new Date(),
} = {}) {
  const startedAtDate = now();
  const startedAt = startedAtDate.toISOString();
  const startedMs = startedAtDate.getTime();
  const command = commandToProcess(commandRef);
  if (!command) {
    const finishedAtDate = now();
    return {
      commandRef,
      startedAt,
      finishedAt: finishedAtDate.toISOString(),
      durationMs: Math.max(0, finishedAtDate.getTime() - startedMs),
      exitCode: 1,
      error: "Command could not be resolved.",
    };
  }
  const result = runner(command.bin, command.args, {
    cwd,
    stdio: "inherit",
    shell: false,
    encoding: "utf8",
  });
  const finishedAtDate = now();
  const exitCode = typeof result?.status === "number" ? result.status : 1;
  return {
    commandRef,
    bin: command.bin,
    args: command.args,
    startedAt,
    finishedAt: finishedAtDate.toISOString(),
    durationMs: Math.max(0, finishedAtDate.getTime() - startedMs),
    exitCode,
  };
}

export function executeSupervisorPlan(plan, {
  runner = spawnSync,
  cwd = REPO_ROOT,
  now = () => new Date(),
} = {}) {
  // route gap 是执行前合同缺口，保留空结果能让报告说明“未执行”而非误报全绿。
  if ((plan.routeGaps || []).length > 0) {
    return {
      ...plan,
      executionResults: [],
    };
  }

  const executionResults = [];
  for (const commandRef of plan.commandsToRun || []) {
    const result = runCommand(commandRef, { runner, cwd, now });
    executionResults.push(result);
    if (result.exitCode !== 0 && !plan.executionPolicy?.continueOnFailure) {
      break;
    }
  }
  return {
    ...plan,
    executionResults,
  };
}

export function supervisorExitCodeForPlan(plan, { strictRouteGaps = false } = {}) {
  const failed = (plan.executionResults || []).find((entry) => entry.exitCode !== 0);
  if (failed) return failed.exitCode;
  if (strictRouteGaps && (plan.routeGaps || []).length > 0) return 2;
  if (plan.executionPolicy?.strictBlocked && (plan.blockedCommands || []).length > 0) return 2;
  return 0;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

export function main(argv = process.argv.slice(2)) {
  const args = parseSupervisorArgs(argv);
  const dossier = buildChangeDossier({
    changedFiles: args.changedFiles,
    includeBranchHistory: args.includeBranchHistory,
    baseSha: args.baseSha,
    gitSha: args.gitSha,
  });
  let plan = buildSupervisorPlan({
    dossier,
    includeMainThread: args.includeMainThread,
    includeCiOnly: args.includeCiOnly,
    strictBlocked: args.strictBlocked,
    continueOnFailure: args.continueOnFailure,
    execute: args.execute,
  });
  if (args.execute) {
    plan = executeSupervisorPlan(plan);
  }
  writeJson(args.dossierOut, dossier);
  writeJson(args.jsonOut, plan);
  writeText(args.mdOut, renderSupervisorMarkdown({ dossier, plan }));
  if (args.printJson) {
    console.log(JSON.stringify({ dossier, plan }, null, 2));
  } else {
    const relPlan = path.relative(REPO_ROOT, args.jsonOut).split(path.sep).join("/");
    console.log(`SF-ATS supervisor plan wrote ${relPlan}.`);
  }

  const exitCode = supervisorExitCodeForPlan(plan, { strictRouteGaps: args.execute || args.strictBlocked });
  if (exitCode !== 0) process.exit(exitCode);
  return plan;
}

const isMainModule = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  try {
    main();
  } catch (error) {
    console.error(`SF-ATS supervisor failed: ${error.message}`);
    process.exit(1);
  }
}

export { DEFAULT_DOSSIER_OUT, DEFAULT_PLAN_OUT, DEFAULT_MD_OUT };
