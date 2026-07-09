import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildVerifyCoreDefaultGroups,
  buildVerifyCoreMainThreadGroup,
  getVerifyCoreOptionalMainThreadCommands,
} from "./verification/verification_metadata_helpers.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "verify-core.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "verify-core.md");

const DEFAULT_GROUPS = buildVerifyCoreDefaultGroups();
const MAIN_THREAD_GROUP = buildVerifyCoreMainThreadGroup();
const OPTIONAL_MAIN_THREAD_COMMANDS = getVerifyCoreOptionalMainThreadCommands();

export function parseArgs(argv) {
  const args = {
    list: false,
    includeMainThread: false,
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--list") args.list = true;
    else if (token === "--include-main-thread") args.includeMainThread = true;
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else throw new Error(`Unknown verify:core argument: ${token}`);
  }
  return args;
}

function readPackageScripts(packageJsonPath = path.join(REPO_ROOT, "package.json")) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.scripts || {};
}

function tokenizeCommand(command) {
  return String(command || "").match(/(?:[^\s"]+|"[^"]*")+/g)?.map((token) => token.replace(/^"(.*)"$/, "$1")) || [];
}

function isPackageScript(commandRef, packageScripts) {
  return Object.prototype.hasOwnProperty.call(packageScripts, commandRef);
}

function isSelfRecursive(commandRef, command = "") {
  const ref = String(commandRef || "").trim();
  const concrete = String(command || "").trim();
  return ref === "verify:core"
    || ref === "verify:core:list"
    || ref === "verify:core:main-thread"
    || /^node\s+tools\/run_core_verification\.mjs(?:\s|$)/.test(ref)
    || /^node\s+tools\/run_core_verification\.mjs(?:\s|$)/.test(concrete);
}

function concreteCommandFor(commandRef, packageScripts) {
  return isPackageScript(commandRef, packageScripts) ? packageScripts[commandRef] : commandRef;
}

function makeCommandEntry(commandRef, group, packageScripts) {
  const command = concreteCommandFor(commandRef, packageScripts);
  return {
    group: group.id,
    groupTitle: group.title,
    commandRef,
    command,
    commandType: isPackageScript(commandRef, packageScripts) ? "package-script" : "direct",
  };
}

export function buildCoreVerificationPlan({
  includeMainThread = false,
  packageScripts = readPackageScripts(),
  groups = DEFAULT_GROUPS,
  mainThreadGroup = MAIN_THREAD_GROUP,
  optionalMainThreadCommands = OPTIONAL_MAIN_THREAD_COMMANDS,
} = {}) {
  const planGroups = [];
  const omittedCommands = [];
  const duplicateCommands = [];
  const skippedMainThreadCommands = [];
  const seenConcreteCommands = new Map();

  function addGroup(group) {
    const entries = [];
    for (const commandRef of group.commands) {
      if (!String(commandRef || "").trim()) {
        omittedCommands.push({ group: group.id, commandRef, reason: "empty commandRef" });
        continue;
      }
      const command = concreteCommandFor(commandRef, packageScripts);
      if (!isPackageScript(commandRef, packageScripts) && !/^(node|python|npm)\b/.test(commandRef)) {
        omittedCommands.push({ group: group.id, commandRef, reason: "missing package script" });
        continue;
      }
      if (isSelfRecursive(commandRef, command)) {
        omittedCommands.push({ group: group.id, commandRef, reason: "self recursion" });
        continue;
      }
      if (seenConcreteCommands.has(command)) {
        duplicateCommands.push({
          group: group.id,
          commandRef,
          command,
          duplicateOf: seenConcreteCommands.get(command),
        });
        continue;
      }
      seenConcreteCommands.set(command, commandRef);
      entries.push(makeCommandEntry(commandRef, group, packageScripts));
    }
    planGroups.push({ id: group.id, title: group.title, commands: entries });
  }

  for (const group of groups) {
    addGroup(group);
  }

  if (includeMainThread) {
    addGroup(mainThreadGroup);
    for (const commandRef of optionalMainThreadCommands) {
      skippedMainThreadCommands.push({ commandRef, reason: "optional main-thread E2E; run explicitly when needed" });
    }
  } else {
    for (const commandRef of [...mainThreadGroup.commands, ...optionalMainThreadCommands]) {
      skippedMainThreadCommands.push({ commandRef, reason: "main-thread lane excluded by default" });
    }
  }

  const defaultIncludesPagesGroup = planGroups.some((group) => group.id === "pages" && group.commands.length > 0);

  return {
    schemaVersion: 1,
    lane: includeMainThread
      ? "non-browser deterministic core lane plus main-thread E2E"
      : "non-browser deterministic core lane",
    includeMainThread,
    startsBrowserDevServerOrPlaywright: includeMainThread,
    requiresDistLaneOwner: defaultIncludesPagesGroup,
    groups: planGroups,
    commandsToRun: planGroups.flatMap((group) => group.commands),
    omittedCommands,
    duplicateCommands,
    skippedMainThreadCommands,
    reportPaths: {
      json: DEFAULT_JSON_OUT,
      markdown: DEFAULT_MD_OUT,
    },
  };
}

export function commandToProcess(commandRef, { packageScripts = readPackageScripts(), platform = process.platform } = {}) {
  const normalized = String(commandRef || "").trim();
  if (!normalized) return null;
  if (isPackageScript(normalized, packageScripts)) {
    if (platform === "win32") {
      return { bin: "cmd.exe", args: ["/d", "/s", "/c", "npm", "run", normalized] };
    }
    return { bin: "npm", args: ["run", normalized] };
  }
  const tokens = tokenizeCommand(normalized);
  if (!tokens.length) return null;
  if (tokens[0] === "npm" && platform === "win32") {
    return { bin: "cmd.exe", args: ["/d", "/s", "/c", ...tokens] };
  }
  return { bin: tokens[0], args: tokens.slice(1) };
}

export function renderMarkdownReport(plan, results = []) {
  const lines = [
    "# verify:core report",
    "",
    `- schemaVersion: ${plan.schemaVersion}`,
    `- lane: ${plan.lane}`,
    `- includeMainThread: ${plan.includeMainThread}`,
    `- startsBrowserDevServerOrPlaywright: ${plan.startsBrowserDevServerOrPlaywright}`,
    `- requiresDistLaneOwner: ${plan.requiresDistLaneOwner}`,
    `- commandsToRun: ${plan.commandsToRun.length}`,
    "",
    "## Command groups",
  ];
  for (const group of plan.groups) {
    lines.push("", `### ${group.title}`);
    lines.push(...(group.commands.length
      ? group.commands.map((entry) => `- ${entry.commandRef}: ${entry.command}`)
      : ["- none"]));
  }
  lines.push("", "## Skipped main-thread commands");
  lines.push(...(plan.skippedMainThreadCommands.length
    ? plan.skippedMainThreadCommands.map((entry) => `- ${entry.commandRef}: ${entry.reason}`)
    : ["- none"]));
  lines.push("", "## Omitted commands");
  lines.push(...(plan.omittedCommands.length
    ? plan.omittedCommands.map((entry) => `- ${entry.commandRef}: ${entry.reason}`)
    : ["- none"]));
  lines.push("", "## Duplicate commands");
  lines.push(...(plan.duplicateCommands.length
    ? plan.duplicateCommands.map((entry) => `- ${entry.commandRef}: duplicates ${entry.duplicateOf}`)
    : ["- none"]));
  lines.push("", "## Execution results");
  lines.push(...(results.length
    ? results.map((entry) => `- ${entry.commandRef}: exit=${entry.exitCode}`)
    : ["- none"]));
  return `${lines.join("\n")}\n`;
}

export function writeReports(plan, results = [], { jsonOut = DEFAULT_JSON_OUT, mdOut = DEFAULT_MD_OUT } = {}) {
  const report = {
    ...plan,
    reportPaths: {
      json: jsonOut,
      markdown: mdOut,
    },
    results,
  };
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(mdOut), { recursive: true });
  fs.writeFileSync(mdOut, renderMarkdownReport(plan, results), "utf8");
  return report;
}

export function runVerificationPlan(plan, {
  runner = spawnSync,
  packageScripts = readPackageScripts(),
  cwd = REPO_ROOT,
  stdio = "inherit",
  platform = process.platform,
} = {}) {
  const results = [];
  for (const entry of plan.commandsToRun) {
    const command = commandToProcess(entry.commandRef, { packageScripts, platform });
    if (!command) {
      results.push({ commandRef: entry.commandRef, exitCode: 1, skipped: true, reason: "unresolvable command" });
      break;
    }
    const result = runner(command.bin, command.args, {
      cwd,
      stdio,
      shell: false,
      encoding: "utf8",
    });
    const exitCode = typeof result?.status === "number" ? result.status : 1;
    results.push({ commandRef: entry.commandRef, command: entry.command, exitCode });
    if (exitCode !== 0) break;
  }
  return results;
}

export function runCoreVerification({
  argv = process.argv.slice(2),
  packageScripts = readPackageScripts(),
  runner = spawnSync,
  cwd = REPO_ROOT,
  stdio = "inherit",
  platform = process.platform,
} = {}) {
  const args = Array.isArray(argv) ? parseArgs(argv) : argv;
  const plan = buildCoreVerificationPlan({ includeMainThread: args.includeMainThread, packageScripts });
  if (args.list) {
    const report = writeReports(plan, [], { jsonOut: args.jsonOut, mdOut: args.mdOut });
    return { plan, results: [], report, exitCode: 0 };
  }
  const results = runVerificationPlan(plan, { runner, packageScripts, cwd, stdio, platform });
  const report = writeReports(plan, results, { jsonOut: args.jsonOut, mdOut: args.mdOut });
  const failed = results.find((entry) => entry.exitCode !== 0);
  return { plan, results, report, exitCode: failed ? failed.exitCode : 0 };
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const result = runCoreVerification();
  if (result.plan.commandsToRun.length === 0 || result.exitCode === 0) {
    console.log(`verify:core ${result.plan.commandsToRun.length} command(s); report ${result.report.reportPaths.json}`);
  }
  process.exit(result.exitCode);
}
