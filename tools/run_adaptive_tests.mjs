import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { buildRecommendation } from "./select_verification_targets.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.md");

function parseArgs(argv) {
  const args = {
    changedFiles: [],
    dryRun: true,
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
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else args.changedFiles.push(token);
  }
  return args;
}

function discoverChangedFiles() {
  const discovered = new Set();
  const candidates = [
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["ls-files", "--others", "--exclude-standard"],
    ["origin/main...HEAD"],
    ["HEAD^", "HEAD"],
  ];
  for (const candidateArgs of candidates) {
    const gitArgs = candidateArgs[0] === "diff"
      ? candidateArgs
      : candidateArgs[0] === "ls-files"
        ? candidateArgs
        : ["diff", "--name-only", ...candidateArgs];
    const result = spawnSync("git", gitArgs, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: false,
    });
    if (result.status === 0) {
      const files = String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const file of files) {
        discovered.add(file);
      }
    }
  }
  return [...discovered].sort();
}

function commandToProcess(commandRef) {
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

function renderMarkdown(report, executionResults) {
  const lines = [
    "# test-adaptive-selection",
    "",
    "## Changed files",
    ...(report.changedFiles.length ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Recommended commands",
    ...(report.recommendedCommands.length
      ? report.recommendedCommands.map((entry) => `- ${entry.commandRef} (${entry.executionOwner}; ${entry.reason})`)
      : ["- none"]),
  ];
  if (executionResults) {
    lines.push("", "## Execution results");
    lines.push(...executionResults.map((entry) => `- ${entry.commandRef}: exit=${entry.exitCode}`));
  }
  return `${lines.join("\n")}\n`;
}

function writeOutputs(report, args, executionResults = null) {
  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${JSON.stringify({ ...report, executionResults }, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
  fs.writeFileSync(args.mdOut, renderMarkdown(report, executionResults), "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const changedFiles = args.changedFiles.length ? args.changedFiles : discoverChangedFiles();
  const report = buildRecommendation(changedFiles);
  if (args.dryRun) {
    writeOutputs(report, args);
    console.log(`Adaptive selection resolved ${report.recommendedCommands.length} commands (dry-run).`);
    return;
  }

  const orderedCommands = [
    ...report.childAgentStaticTasks.map((entry) => entry.commandRef),
    ...report.mainThreadSerialVerification.map((entry) => entry.commandRef),
  ];
  const uniqueCommands = [...new Set(orderedCommands)]
    .filter((commandRef) => !commandRef.startsWith("node tools/run_adaptive_tests.mjs "));
  const executionResults = [];
  for (const commandRef of uniqueCommands) {
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
      writeOutputs(report, args, executionResults);
      process.exit(exitCode);
    }
  }
  spawnSync("node", ["tools/test_timing_summary.mjs"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: false,
    encoding: "utf8",
  });
  writeOutputs(report, args, executionResults);
  console.log(`Adaptive selection executed ${executionResults.length} commands.`);
}

main();
