import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildRecommendation, normalizeChangedFiles } from "./select_verification_targets.mjs";
import { buildCommandSupersessionPlan } from "./verification/command_supersession.mjs";
import { atomicWriteJsonSync } from "./verification/resumable_verification.mjs";
import {
  buildVerificationProfile,
  DEFAULT_ADAPTIVE_VERIFICATION_PROFILE_OUT,
  prepareVerificationProfilePlan,
  publishVerificationProfileSafely,
} from "./verification/verification_profile.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-adaptive-selection.md");
let packageScriptsForProfile = null;
function readPackageScriptsForProfile() {
  if (packageScriptsForProfile === null) {
    packageScriptsForProfile = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
    ).scripts || {};
  }
  return packageScriptsForProfile;
}
const DEFAULT_DISCOVERY_COMMANDS = [
  ["diff", "--name-only", "--diff-filter=ACMRD", "-z"],
  ["diff", "--name-only", "--cached", "--diff-filter=ACMRD", "-z"],
  ["ls-files", "--others", "--exclude-standard", "-z"],
];
const HISTORY_DISCOVERY_COMMANDS = [
  ["diff", "--name-only", "origin/main...HEAD", "--diff-filter=ACMRD", "-z"],
];

export function parseArgs(argv) {
  const args = {
    changedFiles: [],
    changedFilesProvided: false,
    dryRun: true,
    includeBranchHistory: false,
    historyBase: "",
    includeMainThread: false,
    deferMainThread: false,
    selectionJson: "",
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
    profileOut: DEFAULT_ADAPTIVE_VERIFICATION_PROFILE_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--changed-file") {
      args.changedFilesProvided = true;
      args.changedFiles.push(argv[++index]);
    } else if (token === "--changed-files") {
      args.changedFilesProvided = true;
      args.changedFiles.push(...String(argv[++index] || "").split(",").map((value) => value.trim()).filter(Boolean));
    }
    else if (token === "--changed-files-list") {
      args.changedFilesProvided = true;
      const filePath = argv[++index];
      const values = fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      args.changedFiles.push(...values);
    } else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--execute") args.dryRun = false;
    else if (token === "--include-branch-history") args.includeBranchHistory = true;
    else if (token === "--history-base") {
      args.historyBase = String(argv[++index] || "").trim();
      if (!args.historyBase) throw new Error("--history-base requires a non-empty Git revision");
      args.includeBranchHistory = true;
    }
    else if (token === "--include-main-thread") args.includeMainThread = true;
    else if (token === "--defer-main-thread") args.deferMainThread = true;
    else if (token === "--selection-json") args.selectionJson = argv[++index];
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else if (token === "--profile-out") args.profileOut = argv[++index];
    else {
      args.changedFilesProvided = true;
      args.changedFiles.push(token);
    }
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
  historyBase = "",
} = {}) {
  const discovered = new Set();
  // workspace 与 branch history 合并时只收集路径；实际 route 判定交给 selector，避免 Git 探测层携带业务语义。
  const normalizedHistoryBase = String(historyBase || "").trim();
  const historyCommands = normalizedHistoryBase
    ? [[
      "diff",
      "--name-only",
      normalizedHistoryBase,
      "HEAD",
      "--diff-filter=ACMRD",
      "-z",
    ]]
    : includeBranchHistory
      ? HISTORY_DISCOVERY_COMMANDS
      : [];
  for (const gitArgs of DEFAULT_DISCOVERY_COMMANDS) {
    const result = runGitPathCommand(gitArgs, runner);
    if (result.status === 0) {
      const files = parseGitPathOutput(result.stdout);
      for (const file of files) {
        discovered.add(file);
      }
    }
  }
  let successfulHistoryCommands = 0;
  for (const gitArgs of historyCommands) {
    const result = runGitPathCommand(gitArgs, runner);
    if (result.status !== 0) {
      if (normalizedHistoryBase) {
        const error = new Error(`adaptive-history-discovery-failed:${normalizedHistoryBase}`);
        error.code = "adaptive-history-discovery-failed";
        error.historyBase = normalizedHistoryBase;
        throw error;
      }
      continue;
    }
    successfulHistoryCommands += 1;
    const files = parseGitPathOutput(result.stdout);
    for (const file of files) discovered.add(file);
  }
  if (includeBranchHistory && !normalizedHistoryBase && historyCommands.length > 0 && successfulHistoryCommands === 0) {
    const error = new Error("adaptive-history-discovery-failed:all-fallbacks");
    error.code = "adaptive-history-discovery-failed";
    throw error;
  }
  return [...discovered].sort();
}

export function commandToProcess(commandRef, platform = process.platform) {
  const normalized = String(commandRef || "").trim();
  if (!normalized) return null;
  if (/^(node|python|npm)\b/.test(normalized)) {
    const tokens = normalized.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const args = tokens.slice(1).map((token) => token.replace(/^"(.*)"$/, "$1"));
    if (tokens[0] === "python" && platform === "win32") {
      return {
        bin: process.execPath,
        args: ["tools/run_python.mjs", ...args],
      };
    }
    if (tokens[0] === "npm" && platform === "win32") {
      return {
        bin: "cmd.exe",
        args: ["/d", "/s", "/c", "npm", ...args],
      };
    }
    return {
      bin: tokens[0],
      args,
    };
  }
  if (platform === "win32") {
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

function uniqueSorted(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].sort();
}

function readPackageScripts(packagePath = path.join(REPO_ROOT, "package.json")) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  return packageJson.scripts || {};
}

function planGap(code, commandRef, detail = "") {
  return {
    code,
    commandRef: String(commandRef || ""),
    detail: String(detail || ""),
  };
}

function shellSyntaxError(code, source) {
  const error = new Error(`${code}:${source}`);
  error.code = code;
  error.commandRef = source;
  return error;
}

export function splitConjunctiveCommands(source) {
  const input = String(source || "").trim();
  if (!input) throw shellSyntaxError("adaptive-command-empty", source);
  const commands = [];
  let quote = "";
  let escaped = false;
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "&" && input[index + 1] === "&") {
      const command = input.slice(start, index).trim();
      if (!command) throw shellSyntaxError("adaptive-command-empty-segment", source);
      commands.push(command);
      index += 1;
      start = index + 1;
      continue;
    }
    if (char === "|" || char === ";" || char === "\n" || char === "\r" || char === "&") {
      throw shellSyntaxError("adaptive-command-unsupported-control-operator", source);
    }
  }
  if (quote) throw shellSyntaxError("adaptive-command-unclosed-quote", source);
  const tail = input.slice(start).trim();
  if (!tail) throw shellSyntaxError("adaptive-command-empty-segment", source);
  commands.push(tail);
  return commands;
}

export function tokenizeCommand(source) {
  const input = String(source || "").trim();
  const tokens = [];
  let token = "";
  let quote = "";
  let escaped = false;
  let active = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      token += char;
      escaped = false;
      active = true;
      continue;
    }
    if (char === "\\" && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = "";
      } else {
        token += char;
      }
      active = true;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      active = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (active) {
        tokens.push(token);
        token = "";
        active = false;
      }
      continue;
    }
    token += char;
    active = true;
  }
  if (quote || escaped) throw shellSyntaxError("adaptive-command-unclosed-quote", source);
  if (active) tokens.push(token);
  if (!tokens.length) throw shellSyntaxError("adaptive-command-empty", source);
  return tokens;
}

function formatCommandTokens(tokens) {
  return tokens.map((token) => {
    const value = String(token);
    return /[\s"'|;&]/.test(value) ? JSON.stringify(value) : value;
  }).join(" ");
}

function aliasError(code, commandRef, aliasPath) {
  const pathText = [...aliasPath, commandRef].join(" -> ");
  const error = new Error(`${code}:${pathText}`);
  error.code = code;
  error.commandRef = commandRef;
  error.aliasPath = [...aliasPath, commandRef];
  return error;
}

export function expandCommandAliases(commandRef, packageScripts, aliasPath = []) {
  const normalized = String(commandRef || "").trim();
  if (!normalized) throw aliasError("adaptive-alias-empty", normalized, aliasPath);
  if (Object.hasOwn(packageScripts, normalized)) {
    if (aliasPath.includes(normalized)) {
      throw aliasError("adaptive-alias-cycle", normalized, aliasPath);
    }
    const nextPath = [...aliasPath, normalized];
    return splitConjunctiveCommands(packageScripts[normalized]).flatMap((command) => (
      expandCommandAliases(command, packageScripts, nextPath)
    ));
  }

  const tokens = tokenizeCommand(normalized);
  if (tokens[0] === "npm" && tokens[1] === "run") {
    const silentOffset = tokens[2] === "-s" ? 1 : 0;
    const alias = tokens[2 + silentOffset];
    if (!alias || !Object.hasOwn(packageScripts, alias)) {
      throw aliasError("adaptive-alias-unresolved", alias || normalized, aliasPath);
    }
    const separatorIndex = 3 + silentOffset;
    const extraArgs = tokens[separatorIndex] === "--"
      ? tokens.slice(separatorIndex + 1)
      : tokens.slice(separatorIndex);
    const expanded = expandCommandAliases(alias, packageScripts, aliasPath);
    if (extraArgs.length > 0 && expanded.length !== 1) {
      throw aliasError("adaptive-alias-ambiguous-arguments", alias, aliasPath);
    }
    return expanded.map((entry) => ({
      ...entry,
      tokens: [...entry.tokens, ...extraArgs],
    }));
  }

  if (tokens.length === 1 && aliasPath.length === 0) {
    throw aliasError("adaptive-command-unresolved", normalized, aliasPath);
  }
  return [{ tokens, aliasPath: [...aliasPath] }];
}

function normalizePathToken(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function leafRecord({
  kind,
  target = "",
  options = [],
  tokens,
  root,
  aliasPath,
  sequence,
}) {
  const normalizedTarget = normalizePathToken(target);
  const normalizedOptions = options.map((entry) => String(entry));
  const identityParts = [kind, normalizedTarget, ...normalizedOptions];
  return {
    leafId: identityParts.join("\u0000"),
    kind,
    target: normalizedTarget,
    options: normalizedOptions,
    tokens: tokens.map((entry) => String(entry)),
    sourceCommandRefs: [root.commandRef],
    aliasPaths: [[...aliasPath]],
    sequence,
    disposition: root.disposition,
    executionOwners: [...root.executionOwners],
    resourceLocks: [...root.resourceLocks],
    ciProfiles: [...root.ciProfiles],
    routeIds: [...root.routeIds],
  };
}

function rawLeaf(tokens, root, aliasPath, sequence, kind = "raw") {
  return leafRecord({
    kind,
    options: tokens,
    tokens,
    root,
    aliasPath,
    sequence,
  });
}

function normalizeExpandedCommand(entry, root, sequence) {
  let tokens = [...entry.tokens];
  if (tokens[0] === "node" && normalizePathToken(tokens[1]) === "tools/run_python.mjs") {
    tokens = ["python", ...tokens.slice(2)];
  }

  if (tokens[0] === "node" && tokens[1] === "--test") {
    const args = tokens.slice(2);
    const targets = args.filter((arg) => /\.(?:c|m)?js$/.test(arg));
    const options = args.filter((arg) => !targets.includes(arg));
    if (targets.length > 0 && options.every((option) => option.startsWith("-"))) {
      return targets.map((target) => leafRecord({
        kind: "node-test",
        target,
        options,
        tokens: ["node", "--test", target, ...options],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  if (tokens[0] === "node" && tokens[1] === "--check") {
    const targets = tokens.slice(2);
    if (targets.length > 0 && targets.every((target) => /\.(?:c|m)?js$/.test(target))) {
      return targets.map((target) => leafRecord({
        kind: "node-check",
        target,
        tokens: ["node", "--check", target],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  if (
    tokens[0] === "node"
    && normalizePathToken(tokens[1]) === "node_modules/@playwright/test/cli.js"
    && tokens[2] === "test"
  ) {
    const args = tokens.slice(3);
    const targets = args.filter((arg) => /\.spec\.js$/.test(arg));
    const options = args.filter((arg) => !targets.includes(arg));
    if (targets.length > 0) {
      return targets.map((target) => leafRecord({
        kind: "playwright",
        target,
        options,
        tokens: ["node", tokens[1], "test", target, ...options],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  if (
    tokens[0] === "node"
    && normalizePathToken(tokens[1]) === "tools/e2e_layering.mjs"
    && tokens[2] === "run-spec"
    && tokens[3]
  ) {
    return [leafRecord({
      kind: "playwright-layer",
      target: tokens[3],
      options: tokens.slice(4),
      tokens,
      root,
      aliasPath: entry.aliasPath,
      sequence,
    })];
  }

  if (tokens[0] === "python" && tokens[1] === "-m" && tokens[2] === "unittest") {
    const args = tokens.slice(3);
    const allowedOptions = new Set(["-q", "-v", "-f", "--failfast", "-b", "--buffer", "--locals"]);
    const targets = args.filter((arg) => !arg.startsWith("-"));
    const options = args.filter((arg) => arg.startsWith("-"));
    if (targets.length > 0 && options.every((option) => allowedOptions.has(option)) && !targets.includes("discover")) {
      return targets.map((target) => leafRecord({
        kind: "python-unittest",
        target,
        options,
        tokens: ["python", "-m", "unittest", target, ...options],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  if (tokens[0] === "python" && tokens[1] === "-m" && tokens[2] === "pytest") {
    const args = tokens.slice(3);
    const targets = args.filter((arg) => /\.py$/.test(arg));
    const options = args.filter((arg) => !targets.includes(arg));
    if (targets.length > 0 && options.every((option) => option.startsWith("-"))) {
      return targets.map((target) => leafRecord({
        kind: "python-pytest",
        target,
        options,
        tokens: ["python", "-m", "pytest", target, ...options],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  if (tokens[0] === "python" && tokens[1] === "-m" && tokens[2] === "py_compile") {
    const targets = tokens.slice(3);
    if (targets.length > 0 && targets.every((target) => /\.py$/.test(target))) {
      return targets.map((target) => leafRecord({
        kind: "python-pycompile",
        target,
        tokens: ["python", "-m", "py_compile", target],
        root,
        aliasPath: entry.aliasPath,
        sequence,
      }));
    }
  }

  const runtime = tokens[0] === "node" ? "node" : tokens[0] === "python" ? "python" : "external";
  return [rawLeaf(tokens, root, entry.aliasPath, sequence, runtime)];
}

function mergeLeaves(leaves) {
  const byId = new Map();
  for (const leaf of leaves) {
    const existing = byId.get(leaf.leafId);
    if (!existing) {
      byId.set(leaf.leafId, { ...leaf });
      continue;
    }
    existing.sourceCommandRefs = uniqueSorted([...existing.sourceCommandRefs, ...leaf.sourceCommandRefs]);
    existing.aliasPaths = [...existing.aliasPaths, ...leaf.aliasPaths];
    existing.executionOwners = uniqueSorted([...existing.executionOwners, ...leaf.executionOwners]);
    existing.resourceLocks = uniqueSorted([...existing.resourceLocks, ...leaf.resourceLocks]);
    existing.ciProfiles = uniqueSorted([...existing.ciProfiles, ...leaf.ciProfiles]);
    existing.routeIds = uniqueSorted([...existing.routeIds, ...leaf.routeIds]);
    existing.sequence = Math.min(existing.sequence, leaf.sequence);
  }
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence || left.leafId.localeCompare(right.leafId));
}

function processForTokens(tokens, platform = process.platform) {
  if (tokens[0] === "python" && platform === "win32") {
    return { bin: process.execPath, args: ["tools/run_python.mjs", ...tokens.slice(1)] };
  }
  return { bin: tokens[0], args: tokens.slice(1) };
}

function aggregateTokens(kind, leaves) {
  const targets = uniqueSorted(leaves.map((leaf) => leaf.target));
  const options = leaves[0]?.options || [];
  if (kind === "node-test") return ["node", "--test", ...targets, ...options];
  if (kind === "node-check") return ["node", "--check", ...targets];
  if (kind === "python-unittest") return ["python", "-m", "unittest", ...targets, ...options];
  if (kind === "python-pytest") return ["python", "-m", "pytest", ...targets, ...options];
  if (kind === "python-pycompile") return ["python", "-m", "py_compile", ...targets];
  return [...leaves[0].tokens];
}

function buildExecutionGroups(leaves, { disposition }) {
  const aggregatable = new Set([
    "node-test",
    "python-unittest",
    "python-pytest",
    "python-pycompile",
  ]);
  const grouped = new Map();
  for (const leaf of leaves) {
    const canAggregate = leaf.resourceLocks.length === 0 && aggregatable.has(leaf.kind);
    const key = canAggregate
      ? `aggregate:${leaf.kind}:${JSON.stringify(leaf.options)}`
      : `independent:${leaf.leafId}`;
    const group = grouped.get(key) || {
      key,
      kind: canAggregate ? leaf.kind : "independent",
      resourceLocks: new Set(),
      executionOwners: new Set(),
      ciProfiles: new Set(),
      sourceCommandRefs: new Set(),
      leaves: [],
    };
    group.leaves.push(leaf);
    for (const lock of leaf.resourceLocks) group.resourceLocks.add(lock);
    for (const owner of leaf.executionOwners) group.executionOwners.add(owner);
    for (const profile of leaf.ciProfiles) group.ciProfiles.add(profile);
    for (const commandRef of leaf.sourceCommandRefs) group.sourceCommandRefs.add(commandRef);
    grouped.set(key, group);
  }
  return [...grouped.values()].map((group, index) => {
    const tokens = aggregateTokens(group.leaves[0].kind, group.leaves);
    return {
      groupId: `${disposition}-${String(index + 1).padStart(3, "0")}`,
      disposition,
      kind: group.kind === "independent" ? group.leaves[0].kind : group.kind,
      commandRef: formatCommandTokens(tokens),
      process: processForTokens(tokens),
      leafIds: group.leaves.map((leaf) => leaf.leafId),
      sourceCommandRefs: [...group.sourceCommandRefs].sort(),
      resourceLocks: [...group.resourceLocks].sort(),
      executionOwners: [...group.executionOwners].sort(),
      ciProfiles: [...group.ciProfiles].sort(),
    };
  });
}

function commandMetadata(report, commandRef, disposition, fallbackOwner) {
  const recommended = (report.recommendedCommands || []).find((entry) => entry.commandRef === commandRef) || {};
  return {
    commandRef,
    disposition,
    executionOwners: uniqueSorted(recommended.executionOwners || [fallbackOwner]),
    resourceLocks: uniqueSorted(recommended.resourceLocks),
    ciProfiles: uniqueSorted(recommended.ciProfiles),
    routeIds: uniqueSorted(recommended.routeIds),
  };
}

function expandRoots(
  roots,
  report,
  packageScripts,
  disposition,
  fallbackOwner,
  routeGaps,
  commandExpander,
) {
  const expandedLeaves = [];
  let sequence = 0;
  for (const commandRef of roots) {
    const root = commandMetadata(report, commandRef, disposition, fallbackOwner);
    try {
      const expanded = commandExpander(commandRef, packageScripts);
      for (const entry of expanded) {
        expandedLeaves.push(...normalizeExpandedCommand(entry, root, sequence));
        sequence += 1;
      }
    } catch (error) {
      routeGaps.push(planGap(error.code || "adaptive-plan-error", commandRef, error.message));
    }
  }
  return mergeLeaves(expandedLeaves);
}

function collapseRoots(commandRefs, routeGaps) {
  try {
    return buildCommandSupersessionPlan(commandRefs);
  } catch (error) {
    routeGaps.push(planGap(error.code || "adaptive-supersession-error", error.commandRef || "", error.message));
    return { commandRefs: [], supersededCommands: [] };
  }
}

export function buildExecutionPlan(report, {
  includeMainThread = false,
  packageScripts = readPackageScripts(),
  // Catalog ownership stays outside the runner; a canonical catalog expander can replace this adapter.
  commandExpander = expandCommandAliases,
} = {}) {
  // run_adaptive_tests 自身可能被 selector 推荐；这里过滤递归命令，避免执行模式套娃。
  const withoutAdaptiveRecursion = (entries) => uniqueSorted(entries.map((entry) => entry.commandRef))
    .filter((commandRef) => !commandRef.startsWith("node tools/run_adaptive_tests.mjs "));
  const childSafeCommands = withoutAdaptiveRecursion(report.childAgentStaticTasks || []);
  const mainThreadCommands = withoutAdaptiveRecursion(report.mainThreadSerialVerification || []);
  const ciOnlyCommands = withoutAdaptiveRecursion(report.ciOnlyVerification || []);
  const routeGaps = (report.blockedVerification || []).map((entry) => (
    planGap("adaptive-route-owner-gap", entry.commandRef, entry.reason)
  ));
  const selectedRootPlan = collapseRoots(
    includeMainThread ? [...childSafeCommands, ...mainThreadCommands] : childSafeCommands,
    routeGaps,
  );
  const deferredMainRootPlan = includeMainThread
    ? { commandRefs: [], supersededCommands: [] }
    : collapseRoots(mainThreadCommands, routeGaps);
  const deferredCiRootPlan = collapseRoots(ciOnlyCommands, routeGaps);
  const selectedLeaves = expandRoots(
    selectedRootPlan.commandRefs,
    report,
    packageScripts,
    "selected",
    "child-safe",
    routeGaps,
    commandExpander,
  );
  const deferredMainThreadLeaves = expandRoots(
    deferredMainRootPlan.commandRefs,
    report,
    packageScripts,
    "deferred-main-thread",
    "main-thread",
    routeGaps,
    commandExpander,
  );
  const deferredCiOnlyLeaves = expandRoots(
    deferredCiRootPlan.commandRefs,
    report,
    packageScripts,
    "deferred-ci-only",
    "ci-only",
    routeGaps,
    commandExpander,
  );
  const executionGroups = buildExecutionGroups(selectedLeaves, { disposition: "selected" });
  const deferredMainThreadGroups = buildExecutionGroups(deferredMainThreadLeaves, { disposition: "deferred-main-thread" });
  const deferredCiOnlyGroups = buildExecutionGroups(deferredCiOnlyLeaves, { disposition: "deferred-ci-only" });
  return {
    schemaVersion: 2,
    childSafeCommands,
    mainThreadCommands,
    ciOnlyCommands,
    commandsToRun: selectedRootPlan.commandRefs,
    supersededCommands: selectedRootPlan.supersededCommands,
    blockedMainThreadCommands: includeMainThread ? [] : mainThreadCommands,
    deferredMainThreadSupersededCommands: deferredMainRootPlan.supersededCommands,
    deferredCiOnlyCommands: ciOnlyCommands,
    deferredCiOnlySupersededCommands: deferredCiRootPlan.supersededCommands,
    selectedLeaves,
    deferredMainThreadLeaves,
    deferredCiOnlyLeaves,
    executionGroups,
    deferredMainThreadGroups,
    deferredCiOnlyGroups,
    executionCommands: routeGaps.length > 0 ? [] : executionGroups,
    routeGaps,
    closure: {
      selectedRootCount: selectedRootPlan.commandRefs.length,
      selectedLeafCount: selectedLeaves.length,
      executionGroupCount: executionGroups.length,
      deferredMainThreadRootCount: deferredMainRootPlan.commandRefs.length,
      deferredMainThreadLeafCount: deferredMainThreadLeaves.length,
      deferredCiOnlyRootCount: deferredCiRootPlan.commandRefs.length,
      deferredCiOnlyLeafCount: deferredCiOnlyLeaves.length,
    },
  };
}

function renderMarkdown(report, executionResults, executionPlan = null) {
  const lines = [
    "# test-adaptive-selection",
    "",
    `- mode: ${report.adaptiveMode}`,
    `- discoveryMode: ${report.discoveryMode}`,
    `- mainThreadDisposition: ${report.mainThreadDisposition}`,
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
    lines.push(...((executionPlan.deferredCiOnlyCommands || []).length ? executionPlan.deferredCiOnlyCommands.map((commandRef) => `- deferred-ci-only: ${commandRef}`) : ["- deferred-ci-only: none"]));
    lines.push(...(executionPlan.supersededCommands.length
      ? executionPlan.supersededCommands.map(({ commandRef, supersededBy }) => `- superseded: ${commandRef} by ${supersededBy}`)
      : ["- superseded: none"]));
    lines.push(...((executionPlan.deferredMainThreadSupersededCommands || []).length
      ? executionPlan.deferredMainThreadSupersededCommands.map(({ commandRef, supersededBy }) => `- deferred-main-thread-superseded: ${commandRef} by ${supersededBy}`)
      : ["- deferred-main-thread-superseded: none"]));
    lines.push(...((executionPlan.deferredCiOnlySupersededCommands || []).length
      ? executionPlan.deferredCiOnlySupersededCommands.map(({ commandRef, supersededBy }) => `- deferred-ci-only-superseded: ${commandRef} by ${supersededBy}`)
      : ["- deferred-ci-only-superseded: none"]));
    lines.push("", "## Selected leaf groups");
    lines.push(...((executionPlan.executionGroups || []).length
      ? executionPlan.executionGroups.map((group) => `- ${group.groupId}: ${group.commandRef} (leaves=${group.leafIds.length}; locks=${group.resourceLocks.join("+") || "none"})`)
      : ["- none"]));
    lines.push("", "## Deferred leaf closure");
    lines.push(`- main-thread roots: ${executionPlan.closure?.deferredMainThreadRootCount || 0}`);
    lines.push(`- main-thread leaves: ${executionPlan.closure?.deferredMainThreadLeafCount || 0}`);
    lines.push(`- ci-only roots: ${executionPlan.closure?.deferredCiOnlyRootCount || 0}`);
    lines.push(`- ci-only leaves: ${executionPlan.closure?.deferredCiOnlyLeafCount || 0}`);
    lines.push("", "## Route gaps");
    lines.push(...((executionPlan.routeGaps || []).length
      ? executionPlan.routeGaps.map((gap) => `- ${gap.code}: ${gap.commandRef}${gap.detail ? ` (${gap.detail})` : ""}`)
      : ["- none"]));
  }
  if (executionResults) {
    lines.push("", "## Execution results");
    lines.push(...executionResults.map((entry) => `- ${entry.commandRef}: exit=${entry.exitCode}`));
  }
  return `${lines.join("\n")}\n`;
}

export function writeAdaptiveOutputs(report, args, executionResults = null, executionPlan = null, {
  terminalState = "",
  preparedProfilePlan = null,
  profilePreparationError = null,
  profileBuilder = buildVerificationProfile,
  profileWriter = atomicWriteJsonSync,
  packageScripts = null,
} = {}) {
  let currentPreparedPlan = preparedProfilePlan;
  let currentPreparationError = profilePreparationError;
  let currentPackageScripts = packageScripts;
  if (!currentPackageScripts && !currentPreparationError) {
    try {
      currentPackageScripts = readPackageScriptsForProfile();
    } catch (error) {
      currentPreparationError = error;
    }
  }
  if (!currentPreparedPlan && !currentPreparationError) {
    try {
      currentPreparedPlan = prepareVerificationProfilePlan({
        selectorReport: report,
        executionPlan,
        packageScripts: currentPackageScripts,
      });
    } catch (error) {
      currentPreparationError = error;
    }
  }
  const publication = publishVerificationProfileSafely({
    outputPath: args.profileOut,
    previousDiagnostic: report.observerDiagnostics?.profile,
    buildProfile() {
      if (currentPreparationError) throw currentPreparationError;
      return profileBuilder({
        runnerId: "adaptive-verification",
        selectorReport: report,
        executionPlan,
        executionResults: executionResults || [],
        preparedPlan: currentPreparedPlan,
        terminalState,
      });
    },
    writeProfile: profileWriter,
  });
  report.observerDiagnostics = {
    ...(report.observerDiagnostics || {}),
    profile: publication.diagnostic,
  };
  const blockedByOwnership = report.mainThreadDisposition === "blocked"
    && (executionPlan?.blockedMainThreadCommands || []).length > 0;
  const executionStatus = terminalState
    || (executionResults === null
      ? "planned"
      : (report.unmatchedChangedFiles || []).length > 0
        || (executionPlan?.routeGaps || []).length > 0
        || blockedByOwnership
        ? "blocked"
        : executionResults.some((entry) => entry.status === "interrupted")
          ? "interrupted"
          : executionResults.some((entry) => entry.exitCode !== 0)
            ? "failed"
            : executionResults.some((entry) => entry.status === "running")
              ? "running"
              : "passed");
  atomicWriteJsonSync(args.jsonOut, {
    ...report,
    executionStatus,
    executionResults,
    executionPlan,
    verificationProfilePath: args.profileOut,
  });
  fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
  fs.writeFileSync(args.mdOut, renderMarkdown(report, executionResults, executionPlan), "utf8");
}

export function executeAdaptivePlan(executionPlan, {
  runner = spawnSync,
  cwd = REPO_ROOT,
  now = () => new Date(),
  onCheckpoint = () => {},
} = {}) {
  if ((executionPlan.routeGaps || []).length > 0) return [];
  const executionResults = [];
  const plannedCommands = Object.hasOwn(executionPlan, "executionCommands")
    ? executionPlan.executionCommands || []
    : (executionPlan.commandsToRun || []).map((commandRef) => ({ commandRef }));
  for (const plannedCommand of plannedCommands) {
    const commandRef = plannedCommand.commandRef;
    const startedAtDate = now();
    const entry = {
      commandRef,
      groupId: plannedCommand.groupId || null,
      leafIds: plannedCommand.leafIds || [],
      sourceCommandRefs: plannedCommand.sourceCommandRefs || [commandRef],
      resourceLocks: plannedCommand.resourceLocks || [],
      status: "running",
      startedAt: startedAtDate.toISOString(),
      finishedAt: null,
      durationMs: null,
      exitCode: null,
      signal: null,
      processStarted: false,
    };
    executionResults.push(entry);
    onCheckpoint(executionResults);

    const command = plannedCommand.process || commandToProcess(commandRef);
    const result = command
      ? runner(command.bin, command.args, {
        cwd,
        stdio: "inherit",
        shell: false,
        encoding: "utf8",
      })
      : { status: 1, error: "Command could not be resolved." };
    entry.processStarted = Boolean(command && result && !result.error);
    const finishedAtDate = now();
    entry.finishedAt = finishedAtDate.toISOString();
    entry.durationMs = Math.max(0, finishedAtDate.getTime() - startedAtDate.getTime());
    entry.exitCode = typeof result?.status === "number" ? result.status : 1;
    entry.signal = result?.signal ? String(result.signal) : null;
    entry.status = entry.signal ? "interrupted" : entry.exitCode === 0 ? "passed" : "failed";
    if (result?.error) entry.error = String(result.error);
    onCheckpoint(executionResults);
    if (entry.exitCode !== 0) break;
  }
  return executionResults;
}

export function assertAdaptiveExecutionInput(changedFiles, { dryRun = true } = {}) {
  if (!dryRun && (!Array.isArray(changedFiles) || changedFiles.length === 0)) {
    const error = new Error("adaptive-execution-empty-changed-files");
    error.code = "adaptive-execution-empty-changed-files";
    throw error;
  }
}

function selectionArtifactError(code, detail = "") {
  const error = new Error(`${code}${detail ? `:${detail}` : ""}`);
  error.code = code;
  error.detail = detail;
  return error;
}

export function readSelectionArtifact(selectionPath, changedFiles) {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
  } catch (error) {
    throw selectionArtifactError("adaptive-selection-artifact-unreadable", error.message);
  }
  if (!report || typeof report !== "object" || Array.isArray(report) || report.schemaVersion !== 1) {
    throw selectionArtifactError("adaptive-selection-artifact-schema", String(report?.schemaVersion ?? "missing"));
  }
  for (const field of [
    "changedFiles",
    "recommendedCommands",
    "childAgentStaticTasks",
    "mainThreadSerialVerification",
    "ciOnlyVerification",
    "blockedVerification",
    "unmatchedChangedFiles",
  ]) {
    if (!Array.isArray(report[field])) {
      throw selectionArtifactError("adaptive-selection-artifact-field", field);
    }
  }
  if (!report.changedFiles.every((entry) => typeof entry === "string" && entry.trim())) {
    throw selectionArtifactError("adaptive-selection-artifact-field", "changedFiles[]");
  }
  for (const field of [
    "recommendedCommands",
    "childAgentStaticTasks",
    "mainThreadSerialVerification",
    "ciOnlyVerification",
    "blockedVerification",
  ]) {
    if (!report[field].every((entry) => (
      entry
      && typeof entry === "object"
      && !Array.isArray(entry)
      && typeof entry.commandRef === "string"
      && entry.commandRef.trim()
    ))) {
      throw selectionArtifactError("adaptive-selection-artifact-field", `${field}[].commandRef`);
    }
  }
  if (!report.unmatchedChangedFiles.every((entry) => typeof entry === "string" && entry.trim())) {
    throw selectionArtifactError("adaptive-selection-artifact-field", "unmatchedChangedFiles[]");
  }
  for (const entry of report.recommendedCommands) {
    for (const field of ["executionOwners", "resourceLocks", "ciProfiles", "routeIds"]) {
      if (!Array.isArray(entry[field])) {
        throw selectionArtifactError("adaptive-selection-artifact-field", `recommendedCommands[].${field}`);
      }
    }
  }
  const expectedChangedFiles = normalizeChangedFiles(changedFiles);
  const artifactChangedFiles = normalizeChangedFiles(report.changedFiles);
  if (JSON.stringify(expectedChangedFiles) !== JSON.stringify(artifactChangedFiles)) {
    throw selectionArtifactError(
      "adaptive-selection-artifact-changed-files-mismatch",
      `expected=${expectedChangedFiles.join(",")};artifact=${artifactChangedFiles.join(",")}`,
    );
  }
  return report;
}

function emptySelectionReport(changedFiles, gap) {
  return {
    schemaVersion: 1,
    changedFiles: normalizeChangedFiles(changedFiles),
    recommendedCommands: [],
    childAgentStaticTasks: [],
    mainThreadSerialVerification: [],
    ciOnlyVerification: [],
    blockedVerification: [{
      commandRef: gap.commandRef || "selection-artifact",
      reason: gap.detail || gap.code,
    }],
    unmatchedChangedFiles: [],
    diagnosticNextSteps: [],
    advisoryNotes: [],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.includeMainThread && args.deferMainThread) {
    throw new Error("--include-main-thread and --defer-main-thread are mutually exclusive");
  }
  const changedFiles = args.changedFilesProvided
    ? args.changedFiles
    : discoverChangedFiles({
      includeBranchHistory: args.includeBranchHistory,
      historyBase: args.historyBase,
    });
  try {
    assertAdaptiveExecutionInput(changedFiles, { dryRun: args.dryRun });
  } catch (error) {
    const gap = planGap(error.code || "adaptive-execution-input-error", "changed-files", error.message);
    const failedReport = {
      ...emptySelectionReport(changedFiles, gap),
      adaptiveMode: args.dryRun ? "dry-run" : "execute",
      discoveryMode: "explicit-input",
      mainThreadDisposition: args.includeMainThread ? "included" : args.deferMainThread ? "deferred" : "blocked",
      selectionArtifact: args.selectionJson || null,
    };
    const failedPlan = buildExecutionPlan(failedReport);
    failedPlan.routeGaps = [gap];
    failedPlan.executionCommands = [];
    writeAdaptiveOutputs(failedReport, args, [], failedPlan, { terminalState: "blocked" });
    console.error(`Adaptive execution input failed closed: ${error.message}`);
    process.exit(2);
  }
  let selectedReport;
  try {
    selectedReport = args.selectionJson
      ? readSelectionArtifact(args.selectionJson, changedFiles)
      : buildRecommendation(changedFiles);
  } catch (error) {
    const gap = planGap(error.code || "adaptive-selection-artifact-error", "selection-artifact", error.message);
    const failedReport = {
      ...emptySelectionReport(changedFiles, gap),
      adaptiveMode: args.dryRun ? "dry-run" : "execute",
      discoveryMode: "explicit-input",
      mainThreadDisposition: args.includeMainThread ? "included" : args.deferMainThread ? "deferred" : "blocked",
      selectionArtifact: args.selectionJson || null,
    };
    const failedPlan = buildExecutionPlan(failedReport);
    failedPlan.routeGaps = [gap];
    failedPlan.executionCommands = [];
    writeAdaptiveOutputs(failedReport, args, [], failedPlan, { terminalState: "blocked" });
    console.error(`Adaptive selection artifact failed closed: ${error.message}`);
    process.exit(2);
  }
  const report = {
    ...selectedReport,
    adaptiveMode: args.dryRun ? "dry-run" : "execute",
    discoveryMode: args.changedFilesProvided
      ? "explicit-input"
      : args.includeBranchHistory
        ? "workspace-plus-history"
        : "workspace-only",
    mainThreadDisposition: args.includeMainThread
      ? "included"
      : args.deferMainThread
        ? "deferred"
        : "blocked",
    selectionArtifact: args.selectionJson || null,
  };
  const executionPlan = buildExecutionPlan(report, { includeMainThread: args.includeMainThread });
  let packageScripts = null;
  let preparedProfilePlan = null;
  let profilePreparationError = null;
  try {
    packageScripts = readPackageScriptsForProfile();
    preparedProfilePlan = prepareVerificationProfilePlan({
      selectorReport: report,
      executionPlan,
      packageScripts,
    });
  } catch (error) {
    profilePreparationError = error;
  }
  const profileOutputOptions = {
    preparedProfilePlan,
    profilePreparationError,
    packageScripts,
  };
  if (args.dryRun) {
    writeAdaptiveOutputs(report, args, null, executionPlan, {
      ...profileOutputOptions,
      terminalState: "planned",
    });
    console.log(
      `Adaptive selection recommended ${report.recommendedCommands.length} commands; `
      + `execution plan keeps ${executionPlan.commandsToRun.length} and blocks ${executionPlan.blockedMainThreadCommands.length} `
      + "(dry-run only; no verification executed).",
    );
    return;
  }

  if ((report.unmatchedChangedFiles || []).length > 0) {
    executionPlan.executionCommands = [];
    writeAdaptiveOutputs(report, args, [], executionPlan, {
      ...profileOutputOptions,
      terminalState: "blocked",
    });
    console.error(
      `Adaptive selection found ${report.unmatchedChangedFiles.length} unmatched changed files. `
      + "Add route coverage before running --execute.",
    );
    process.exit(2);
  }

  if ((executionPlan.routeGaps || []).length > 0) {
    executionPlan.executionCommands = [];
    writeAdaptiveOutputs(report, args, [], executionPlan, {
      ...profileOutputOptions,
      terminalState: "blocked",
    });
    console.error(
      `Adaptive execution plan found ${executionPlan.routeGaps.length} route or command gap(s). `
      + "Repair the selector/alias contract before execution.",
    );
    process.exit(2);
  }

  if (executionPlan.blockedMainThreadCommands.length > 0 && !args.deferMainThread) {
    executionPlan.executionCommands = [];
    writeAdaptiveOutputs(report, args, [], executionPlan, {
      ...profileOutputOptions,
      terminalState: "blocked",
    });
    console.error(
      `Adaptive selection found ${executionPlan.blockedMainThreadCommands.length} main-thread commands. `
      + "Re-run with --include-main-thread after reserving the live test lane.",
    );
    process.exit(2);
  }

  const executionResults = executeAdaptivePlan(executionPlan, {
    onCheckpoint(results) {
      writeAdaptiveOutputs(report, args, results, executionPlan, profileOutputOptions);
    },
  });
  const failed = executionResults.find((entry) => entry.exitCode !== 0);
  if (failed) process.exit(failed.exitCode);
  if (executionPlan.executionCommands.length > 0) {
    spawnSync("node", ["tools/test_timing_summary.mjs"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: false,
      encoding: "utf8",
    });
  }
  writeAdaptiveOutputs(report, args, executionResults, executionPlan, {
    ...profileOutputOptions,
    terminalState: "passed",
  });
  const deferredSummary = args.deferMainThread
    ? `; deferred ${executionPlan.blockedMainThreadCommands.length} main-thread command(s)`
    : "";
  console.log(`Adaptive selection executed ${executionResults.length} commands${deferredSummary}.`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
