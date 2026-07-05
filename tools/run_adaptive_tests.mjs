import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildRecommendation } from "./select_verification_targets.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.md");
const DEFAULT_DISCOVERY_COMMANDS = [
  ["diff", "--name-only", "--diff-filter=ACMRD", "-z"],
  ["diff", "--name-only", "--cached", "--diff-filter=ACMRD", "-z"],
  ["ls-files", "--others", "--exclude-standard", "-z"],
];
const HISTORY_DISCOVERY_COMMANDS = [
  ["diff", "--name-only", "origin/main...HEAD", "--diff-filter=ACMRD", "-z"],
  ["diff", "--name-only", "HEAD^", "HEAD", "--diff-filter=ACMRD", "-z"],
];

export function parseArgs(argv) {
  const args = {
    changedFiles: [],
    dryRun: true,
    includeBranchHistory: false,
    includeMainThread: false,
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--changed-file") args.changedFiles.push(argv[++index]);
    else if (token === "--changed-files") args.changedFiles.push(...String(argv[++index] || "").split(",").map((value) => value.trim()).filter(Boolean));
    else if (token === "--changed-files-list") {
      const filePath = argv[++index];
      const values = fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      args.changedFiles.push(...values);
    } else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--execute") args.dryRun = false;
    else if (token === "--include-branch-history") args.includeBranchHistory = true;
    else if (token === "--include-main-thread") args.includeMainThread = true;
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else args.changedFiles.push(token);
  }
  return args;
}

export function parseGitPathOutput(output) {
  return String(output || "")
    .split("\0")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^"(.*)"$/, "$1"));
}

function runGitPathCommand(gitArgs, runner = spawnSync) {
  return runner("git", ["-c", "core.quotepath=false", ...gitArgs], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
}

export function discoverChangedFiles({
  runner = spawnSync,
  includeBranchHistory = false,
} = {}) {
  const discovered = new Set();
  const commands = includeBranchHistory
    ? [...DEFAULT_DISCOVERY_COMMANDS, ...HISTORY_DISCOVERY_COMMANDS]
    : DEFAULT_DISCOVERY_COMMANDS;
  for (const gitArgs of commands) {
    const result = runGitPathCommand(gitArgs, runner);
    if (result.status === 0) {
      const files = parseGitPathOutput(result.stdout);
      for (const file of files) {
        discovered.add(file);
      }
    }
  }
  return [...discovered].sort();
}

export function commandToProcess(commandRef) {
  const normalized = String(commandRef || "").trim();
  if (!normalized) return null;
  if (/^(node|python|npm)\b/.test(normalized)) {
    const tokens = normalized.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    if (tokens[0] === "npm" && process.platform === "win32") {
      return {
        bin: "cmd.exe",
        args: ["/d", "/s", "/c", "npm", ...tokens.slice(1).map((token) => token.replace(/^\"(.*)\"$/, "$1"))],
      };
    }
    return {
      bin: tokens[0],
      args: tokens.slice(1).map((token) => token.replace(/^"(.*)"$/, "$1")),
    };
  }
  if (process.platform === "win32") {
    return {
      bin: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", "run", normalized],
    };
  }
  return {
    bin: "npm",
    args: ["run", normalized],
  };
}

export function buildExecutionPlan(report, { includeMainThread = false } = {}) {
  const childSafeCommands = [...new Set((report.childAgentStaticTasks || []).map((entry) => entry.commandRef))]
    .filter((commandRef) => !commandRef.startsWith("node tools/run_adaptive_tests.mjs "));
  const mainThreadCommands = [...new Set((report.mainThreadSerialVerification || []).map((entry) => entry.commandRef))]
    .filter((commandRef) => !commandRef.startsWith("node tools/run_adaptive_tests.mjs "));
  return {
    childSafeCommands,
    mainThreadCommands,
    commandsToRun: includeMainThread ? [...childSafeCommands, ...mainThreadCommands] : childSafeCommands,
    blockedMainThreadCommands: includeMainThread ? [] : mainThreadCommands,
  };
}

function renderMarkdown(report, executionResults, executionPlan = null) {
  const lines = [
    "# test-adaptive-selection",
    "",
    `- mode: ${report.adaptiveMode}`,
    `- discoveryMode: ${report.discoveryMode}`,
    "",
    "## Changed files",
    ...(report.changedFiles.length ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Unmatched changed files",
    ...((report.unmatchedChangedFiles || []).length ? report.unmatchedChangedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Recommended commands",
    ...(report.recommendedCommands.length
      ? report.recommendedCommands.map((entry) => `- ${entry.commandRef} (${entry.executionOwners.join("+")}; ${entry.reason})`)
      : ["- none"]),
  ];
  lines.push(
    "",
    "## Diagnostic next steps",
    ...((report.diagnosticNextSteps || []).length
      ? report.diagnosticNextSteps.map((entry) => `- ${entry.commandRef} (${entry.executionOwners.join("+")}; locks=${entry.resourceLocks.join("+") || "none"})`)
      : ["- none"]),
    "",
    "## Advisory notes",
    ...((report.advisoryNotes || []).length ? report.advisoryNotes.map((note) => `- ${note}`) : ["- none"]),
  );
  if (executionPlan) {
    lines.push("", "## Execution plan");
    lines.push(...(executionPlan.commandsToRun.length ? executionPlan.commandsToRun.map((commandRef) => `- run: ${commandRef}`) : ["- run: none"]));
    lines.push(...(executionPlan.blockedMainThreadCommands.length ? executionPlan.blockedMainThreadCommands.map((commandRef) => `- blocked-main-thread: ${commandRef}`) : ["- blocked-main-thread: none"]));
  }
  if (executionResults) {
    lines.push("", "## Execution results");
    lines.push(...executionResults.map((entry) => `- ${entry.commandRef}: exit=${entry.exitCode}`));
  }
  return `${lines.join("\n")}\n`;
}

function writeOutputs(report, args, executionResults = null, executionPlan = null) {
  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${JSON.stringify({ ...report, executionResults, executionPlan }, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
  fs.writeFileSync(args.mdOut, renderMarkdown(report, executionResults, executionPlan), "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const changedFiles = args.changedFiles.length
    ? args.changedFiles
    : discoverChangedFiles({ includeBranchHistory: args.includeBranchHistory });
  const report = {
    ...buildRecommendation(changedFiles),
    adaptiveMode: args.dryRun ? "dry-run" : "execute",
    discoveryMode: args.changedFiles.length
      ? "explicit-input"
      : args.includeBranchHistory
        ? "workspace-plus-history"
        : "workspace-only",
  };
  if (args.dryRun) {
    writeOutputs(report, args);
    console.log(`Adaptive selection planned ${report.recommendedCommands.length} commands (dry-run only; no verification executed).`);
    return;
  }

  if ((report.unmatchedChangedFiles || []).length > 0) {
    writeOutputs(report, args);
    console.error(
      `Adaptive selection found ${report.unmatchedChangedFiles.length} unmatched changed files. `
      + "Add route coverage before running --execute.",
    );
    process.exit(2);
  }

  const executionPlan = buildExecutionPlan(report, { includeMainThread: args.includeMainThread });
  if (executionPlan.blockedMainThreadCommands.length > 0) {
    writeOutputs(report, args, null, executionPlan);
    console.error(
      `Adaptive selection found ${executionPlan.blockedMainThreadCommands.length} main-thread commands. `
      + "Re-run with --include-main-thread after reserving the live test lane.",
    );
    process.exit(2);
  }

  const executionResults = [];
  for (const commandRef of executionPlan.commandsToRun) {
    const command = commandToProcess(commandRef);
    if (!command) continue;
    const result = spawnSync(command.bin, command.args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: false,
      encoding: "utf8",
    });
    const exitCode = typeof result.status === "number" ? result.status : 1;
    executionResults.push({ commandRef, exitCode });
    if (exitCode !== 0) {
      writeOutputs(report, args, executionResults, executionPlan);
      process.exit(exitCode);
    }
  }
  if (executionPlan.commandsToRun.length > 0) {
    spawnSync("node", ["tools/test_timing_summary.mjs"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: false,
      encoding: "utf8",
    });
  }
  writeOutputs(report, args, executionResults, executionPlan);
  console.log(`Adaptive selection executed ${executionResults.length} commands.`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
