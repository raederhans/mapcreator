import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildRecommendation,
  classifyExecutionOwners,
  normalizeChangedFiles,
} from "./select_verification_targets.mjs";
import { buildRouteIndex } from "./test_route_registry.mjs";
import { VERIFICATION_DOMAINS } from "./verification/verification_domains.mjs";
import { atomicWriteJsonSync } from "./verification/resumable_verification.mjs";
import {
  bindSelectionReportToPreparedCatalog,
  buildVerificationSelectionPlan,
  prepareRepositoryVerificationCatalogBinding,
  prepareVerificationCatalog,
} from "./verification/script_portfolio.mjs";
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
const EXECUTION_PLANNER_SCHEMA_VERSION = 1;
const EXECUTION_PLAN_SCHEMA_VERSION = 3;
const HARD_MAX_GROUP_LEAVES = 64;
const WINDOWS_MAX_ARGV_BYTES = 30_000;
const POSIX_MAX_ARGV_BYTES = 131_072;
const AUTHORITY_DISPOSITIONS = new Set(["child-safe", "main-thread", "ci-only", "blocked"]);
const EXECUTION_ISOLATIONS = new Set(["batch", "root", "process", "leaf"]);

export function parseArgs(argv) {
  const args = {
    changedFiles: [],
    changedFilesProvided: false,
    inputErrors: [],
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
  const takeOptionValue = (index) => (
    index + 1 < argv.length && !String(argv[index + 1]).startsWith("--")
      ? { value: argv[index + 1], consumed: true }
      : { value: "", consumed: false }
  );
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--changed-file") {
      args.changedFilesProvided = true;
      const next = takeOptionValue(index);
      args.changedFiles.push(next.value);
      if (next.consumed) index += 1;
    } else if (token === "--changed-files") {
      args.changedFilesProvided = true;
      const next = takeOptionValue(index);
      args.changedFiles.push(...String(next.value).split(","));
      if (next.consumed) index += 1;
    }
    else if (token === "--changed-files-list") {
      args.changedFilesProvided = true;
      const next = takeOptionValue(index);
      const filePath = String(next.value || "").trim();
      if (next.consumed) index += 1;
      if (!filePath) {
        args.inputErrors.push("adaptive-changed-files-list-path-empty");
      } else {
        try {
          args.changedFiles.push(...fs.readFileSync(filePath, "utf8").split(/\r?\n/));
        } catch (error) {
          args.inputErrors.push(`adaptive-changed-files-list-unreadable:${error.message}`);
        }
      }
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

function selectionRootSet(report) {
  return uniqueSorted((report?.recommendedCommands || []).map((entry) => entry.commandRef));
}

export function bindSelectionToPreparedCatalog(report, preparedCatalog) {
  return bindSelectionReportToPreparedCatalog(report, preparedCatalog);
}

function validateSelectionCatalogBinding(report, preparedCatalog, {
  expectedSelectorRootSet = selectionRootSet(report),
} = {}) {
  const gaps = [];
  const compare = (field, actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      gaps.push(planGap("adaptive-selection-catalog-drift", "selection-artifact", field));
    }
  };
  compare("catalogDigest", report?.catalogDigest, preparedCatalog.catalogDigest);
  compare("catalogSourceIdentity", report?.catalogSourceIdentity, preparedCatalog.sourceIdentity);
  compare("selectorRootSet", report?.selectorRootSet, expectedSelectorRootSet);
  compare("routeAuthority", report?.routeAuthority, preparedCatalog.authority);
  return gaps;
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
  processKey,
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
    processKeys: [processKey],
    sequence,
    disposition: root.executionDisposition,
    authorityDisposition: root.disposition,
    executionOwner: root.executionOwner,
    executionOwners: [...root.executionOwners],
    platforms: [...root.platforms],
    resourceLocks: [...root.resourceLocks],
    tiers: [...root.tiers],
    ciProfiles: [...root.ciProfiles],
    routeIds: [...root.routeIds],
    safetyContributorRouteIds: [...root.safetyContributorRouteIds],
    batchSafe: root.batchSafe,
    isolation: root.isolation,
    maxLeaves: root.maxLeaves,
    maxArgvBytes: root.maxArgvBytes,
  };
}

function rawLeaf(tokens, root, aliasPath, sequence, processKey, kind = "raw") {
  return leafRecord({
    kind,
    options: tokens,
    tokens,
    root,
    aliasPath,
    sequence,
    processKey,
  });
}

function normalizeExpandedCommand(entry, root, sequence, processKey) {
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
        processKey,
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
        processKey,
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
        processKey,
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
      processKey,
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
        processKey,
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
        processKey,
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
        processKey,
      }));
    }
  }

  const runtime = tokens[0] === "node" ? "node" : tokens[0] === "python" ? "python" : "external";
  return [rawLeaf(tokens, root, entry.aliasPath, sequence, processKey, runtime)];
}

function leafSafetyMetadata(leaf) {
  return {
    kind: leaf.kind,
    target: leaf.target,
    options: leaf.options,
    tokens: leaf.tokens,
    disposition: leaf.disposition,
    authorityDisposition: leaf.authorityDisposition,
    executionOwner: leaf.executionOwner,
    executionOwners: leaf.executionOwners,
    platforms: leaf.platforms,
    resourceLocks: leaf.resourceLocks,
    tiers: leaf.tiers,
    ciProfiles: leaf.ciProfiles,
    batchSafe: leaf.batchSafe,
    isolation: leaf.isolation,
    maxLeaves: leaf.maxLeaves,
    maxArgvBytes: leaf.maxArgvBytes,
  };
}

function mergeLeaves(leaves, routeGaps) {
  const byId = new Map();
  for (const leaf of leaves) {
    const existing = byId.get(leaf.leafId);
    if (!existing) {
      byId.set(leaf.leafId, { ...leaf });
      continue;
    }
    if (JSON.stringify(leafSafetyMetadata(existing)) !== JSON.stringify(leafSafetyMetadata(leaf))) {
      routeGaps.push(planGap(
        "adaptive-leaf-metadata-conflict",
        leaf.sourceCommandRefs.join(","),
        `leaf=${JSON.stringify(leaf.leafId)}`,
      ));
      continue;
    }
    existing.sourceCommandRefs = uniqueSorted([...existing.sourceCommandRefs, ...leaf.sourceCommandRefs]);
    existing.aliasPaths = [...existing.aliasPaths, ...leaf.aliasPaths];
    existing.processKeys = uniqueSorted([...existing.processKeys, ...leaf.processKeys]);
    existing.routeIds = uniqueSorted([...existing.routeIds, ...leaf.routeIds]);
    existing.safetyContributorRouteIds = uniqueSorted([
      ...existing.safetyContributorRouteIds,
      ...leaf.safetyContributorRouteIds,
    ]);
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
  if (kind === "playwright") return ["node", leaves[0].tokens[1], "test", ...targets, ...options];
  return [...leaves[0].tokens];
}

function argvByteLength(tokens, platform) {
  const encoding = platform === "win32" ? "utf16le" : "utf8";
  return Buffer.byteLength(tokens.map((token) => String(token)).join("\u0000"), encoding);
}

function leafBudget(leaf, platform) {
  const hardArgvLimit = platform === "win32" ? WINDOWS_MAX_ARGV_BYTES : POSIX_MAX_ARGV_BYTES;
  return {
    maxLeaves: Math.min(leaf.maxLeaves, HARD_MAX_GROUP_LEAVES),
    maxArgvBytes: Math.min(leaf.maxArgvBytes, hardArgvLimit),
  };
}

function groupMetadataKey(leaf) {
  return JSON.stringify({
    kind: leaf.kind,
    options: leaf.options,
    executionOwner: leaf.executionOwner,
    executionOwners: leaf.executionOwners,
    platforms: leaf.platforms,
    resourceLocks: leaf.resourceLocks,
    ciProfiles: leaf.ciProfiles,
    batchSafe: leaf.batchSafe,
    isolation: leaf.isolation,
    maxLeaves: leaf.maxLeaves,
    maxArgvBytes: leaf.maxArgvBytes,
  });
}

function makeExecutionGroup(leaves, { disposition, platform, routeGaps }) {
  const first = leaves[0];
  const tokens = aggregateTokens(first.kind, leaves);
  const budget = leafBudget(first, platform);
  const argvBytes = argvByteLength(tokens, platform);
  if (leaves.length > budget.maxLeaves) {
    routeGaps.push(planGap(
      "adaptive-group-leaf-budget-exceeded",
      uniqueSorted(leaves.flatMap((leaf) => leaf.sourceCommandRefs)).join(","),
      `leaves=${leaves.length};maxLeaves=${budget.maxLeaves}`,
    ));
    return null;
  }
  if (argvBytes > budget.maxArgvBytes) {
    routeGaps.push(planGap(
      "adaptive-group-argv-budget-exceeded",
      uniqueSorted(leaves.flatMap((leaf) => leaf.sourceCommandRefs)).join(","),
      `argvBytes=${argvBytes};maxArgvBytes=${budget.maxArgvBytes};platform=${platform}`,
    ));
    return null;
  }
  return {
    disposition,
    kind: first.kind,
    commandRef: formatCommandTokens(tokens),
    process: processForTokens(tokens, platform),
    leafIds: leaves.map((leaf) => leaf.leafId),
    sourceCommandRefs: uniqueSorted(leaves.flatMap((leaf) => leaf.sourceCommandRefs)),
    routeIds: uniqueSorted(leaves.flatMap((leaf) => leaf.routeIds)),
    safetyContributorRouteIds: uniqueSorted(leaves.flatMap((leaf) => leaf.safetyContributorRouteIds)),
    resourceLocks: [...first.resourceLocks],
    executionOwner: first.executionOwner,
    executionOwners: [...first.executionOwners],
    platforms: [...first.platforms],
    tiers: [...first.tiers],
    ciProfiles: [...first.ciProfiles],
    batchSafe: first.batchSafe,
    isolation: first.isolation,
    leafCount: leaves.length,
    argvBytes,
    maxLeaves: budget.maxLeaves,
    maxArgvBytes: budget.maxArgvBytes,
  };
}

function buildExecutionGroups(leaves, { disposition, platform, routeGaps }) {
  const batchKinds = new Set(["node-test", "playwright"]);
  const buckets = new Map();
  for (const leaf of leaves) {
    const canBatch = leaf.resourceLocks.length === 0
      && leaf.batchSafe
      && leaf.isolation === "batch"
      && batchKinds.has(leaf.kind);
    let isolationKey;
    if (canBatch) isolationKey = "batch";
    else if (leaf.resourceLocks.length > 0 || leaf.isolation === "leaf") isolationKey = `leaf:${leaf.leafId}`;
    else if (leaf.isolation === "root") isolationKey = `root:${leaf.sourceCommandRefs.join("\u0000")}`;
    else isolationKey = `process:${leaf.processKeys.join("\u0000")}`;
    const key = `${isolationKey}:${groupMetadataKey(leaf)}`;
    const bucket = buckets.get(key) || { canBatch, leaves: [] };
    bucket.leaves.push(leaf);
    buckets.set(key, bucket);
  }

  const groups = [];
  for (const bucket of buckets.values()) {
    if (!bucket.canBatch) {
      const group = makeExecutionGroup(bucket.leaves, { disposition, platform, routeGaps });
      if (group) groups.push(group);
      continue;
    }
    let chunk = [];
    for (const leaf of bucket.leaves) {
      const candidate = [...chunk, leaf];
      const tokens = aggregateTokens(leaf.kind, candidate);
      const budget = leafBudget(leaf, platform);
      const fits = candidate.length <= budget.maxLeaves
        && argvByteLength(tokens, platform) <= budget.maxArgvBytes;
      if (fits) {
        chunk = candidate;
        continue;
      }
      if (chunk.length > 0) {
        const group = makeExecutionGroup(chunk, { disposition, platform, routeGaps });
        if (group) groups.push(group);
        chunk = [];
      }
      const single = makeExecutionGroup([leaf], { disposition, platform, routeGaps });
      if (single) chunk = [leaf];
    }
    if (chunk.length > 0) {
      const group = makeExecutionGroup(chunk, { disposition, platform, routeGaps });
      if (group) groups.push(group);
    }
  }
  return groups.map((group, index) => ({
    groupId: `${disposition}-${String(index + 1).padStart(3, "0")}`,
    ...group,
  }));
}

function requiredStringArray(entry, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(entry?.[field])) return null;
  if (!entry[field].every((value) => typeof value === "string" && value.trim())) return null;
  const normalized = uniqueSorted(entry[field]);
  if (!allowEmpty && normalized.length === 0) return null;
  return normalized;
}

function authorityMetadata(entry) {
  return {
    executionOwner: entry.executionOwner,
    executionOwners: uniqueSorted(entry.executionOwners),
    sourceRefs: uniqueSorted(entry.sourceRefs),
    domains: uniqueSorted(entry.domains),
    ownerHints: uniqueSorted(entry.ownerHints),
    cost: entry.cost,
    platforms: uniqueSorted(entry.platforms),
    resourceLocks: uniqueSorted(entry.resourceLocks),
    tiers: uniqueSorted(entry.tiers),
    ciProfiles: uniqueSorted(entry.ciProfiles),
    routeIds: uniqueSorted(entry.routeIds),
    safetyContributorRouteIds: uniqueSorted(entry.safetyContributorRouteIds),
    provenance: {
      routeIds: uniqueSorted(entry.provenance?.routeIds),
      safetyContributorRouteIds: uniqueSorted(entry.provenance?.safetyContributorRouteIds),
    },
    disposition: entry.disposition,
    batchSafe: entry.batchSafe,
    isolation: entry.isolation,
    maxLeaves: entry.maxLeaves,
    maxArgvBytes: entry.maxArgvBytes,
  };
}

function validateAuthorityContributor(entry, expectedDisposition, platform, routeGaps, field) {
  const commandRef = typeof entry?.commandRef === "string" ? entry.commandRef.trim() : "";
  if (!commandRef) {
    routeGaps.push(planGap("adaptive-selection-authority-field", field, "commandRef"));
    return null;
  }
  const executionOwners = requiredStringArray(entry, "executionOwners", {
    allowEmpty: expectedDisposition === "blocked",
  });
  const sourceRefs = requiredStringArray(entry, "sourceRefs");
  const domains = requiredStringArray(entry, "domains");
  const ownerHints = requiredStringArray(entry, "ownerHints");
  const platforms = requiredStringArray(entry, "platforms");
  const resourceLocks = requiredStringArray(entry, "resourceLocks", { allowEmpty: true });
  const tiers = requiredStringArray(entry, "tiers");
  const ciProfiles = requiredStringArray(entry, "ciProfiles");
  const routeIds = requiredStringArray(entry, "routeIds");
  const safetyContributorRouteIds = requiredStringArray(entry, "safetyContributorRouteIds");
  const provenanceRouteIds = requiredStringArray(entry?.provenance, "routeIds");
  const provenanceSafetyIds = requiredStringArray(entry?.provenance, "safetyContributorRouteIds");
  const missing = [
    ["executionOwners", executionOwners],
    ["sourceRefs", sourceRefs],
    ["domains", domains],
    ["ownerHints", ownerHints],
    ["platforms", platforms],
    ["resourceLocks", resourceLocks],
    ["tiers", tiers],
    ["ciProfiles", ciProfiles],
    ["routeIds", routeIds],
    ["safetyContributorRouteIds", safetyContributorRouteIds],
    ["provenance.routeIds", provenanceRouteIds],
    ["provenance.safetyContributorRouteIds", provenanceSafetyIds],
  ].find(([, value]) => value === null);
  if (missing) {
    routeGaps.push(planGap("adaptive-selection-authority-field", commandRef, `${field}.${missing[0]}`));
    return null;
  }
  if (typeof entry.executionOwner !== "string" || !AUTHORITY_DISPOSITIONS.has(entry.executionOwner)) {
    routeGaps.push(planGap("adaptive-selection-authority-field", commandRef, `${field}.executionOwner`));
    return null;
  }
  if (typeof entry.cost !== "string" || !entry.cost.trim()) {
    routeGaps.push(planGap("adaptive-selection-authority-field", commandRef, `${field}.cost`));
    return null;
  }
  if (!AUTHORITY_DISPOSITIONS.has(entry.disposition)) {
    routeGaps.push(planGap("adaptive-selection-authority-field", commandRef, `${field}.disposition`));
    return null;
  }
  if (entry.disposition !== expectedDisposition) {
    routeGaps.push(planGap(
      "adaptive-selection-cross-disposition",
      commandRef,
      `field=${field};expected=${expectedDisposition};actual=${entry.disposition}`,
    ));
    return null;
  }
  const classifiedOwner = classifyExecutionOwners(executionOwners);
  if (entry.executionOwner !== classifiedOwner || entry.executionOwner !== expectedDisposition) {
    routeGaps.push(planGap(
      "adaptive-selection-disposition-owner-mismatch",
      commandRef,
      `disposition=${expectedDisposition};executionOwner=${entry.executionOwner};owners=${executionOwners.join("+")}`,
    ));
    return null;
  }
  if (!platforms.includes("all") && !platforms.includes(platform)) {
    routeGaps.push(planGap(
      "adaptive-selection-platform-mismatch",
      commandRef,
      `current=${platform};artifact=${platforms.join("+")}`,
    ));
    return null;
  }
  if (JSON.stringify(routeIds) !== JSON.stringify(provenanceRouteIds)
    || JSON.stringify(safetyContributorRouteIds) !== JSON.stringify(provenanceSafetyIds)
    || routeIds.some((routeId) => !safetyContributorRouteIds.includes(routeId))) {
    routeGaps.push(planGap("adaptive-selection-authority-conflict", commandRef, "provenance"));
    return null;
  }
  if (typeof entry.batchSafe !== "boolean"
    || !EXECUTION_ISOLATIONS.has(entry.isolation)
    || !Number.isInteger(entry.maxLeaves)
    || entry.maxLeaves <= 0
    || !Number.isInteger(entry.maxArgvBytes)
    || entry.maxArgvBytes <= 0) {
    routeGaps.push(planGap("adaptive-selection-authority-field", commandRef, `${field}.groupBudget`));
    return null;
  }
  if ((entry.batchSafe && entry.isolation !== "batch") || (!entry.batchSafe && entry.isolation === "batch")) {
    routeGaps.push(planGap("adaptive-selection-authority-conflict", commandRef, "batchSafe/isolation"));
    return null;
  }
  return {
    commandRef,
    ...authorityMetadata(entry),
  };
}

function resolveSelectionAuthority(report, { platform = process.platform } = {}) {
  const routeGaps = [];
  if (report.selectionPlatform !== platform) {
    routeGaps.push(planGap(
      "adaptive-selection-platform-mismatch",
      "selection-artifact",
      `current=${platform};artifact=${String(report.selectionPlatform || "missing")}`,
    ));
  }
  const laneDefinitions = [
    ["childAgentStaticTasks", "child-safe"],
    ["mainThreadSerialVerification", "main-thread"],
    ["ciOnlyVerification", "ci-only"],
    ["blockedVerification", "blocked"],
  ];
  const recommendedByCommand = new Map();
  for (const [index, entry] of (report.recommendedCommands || []).entries()) {
    const normalized = validateAuthorityContributor(
      entry,
      entry?.disposition,
      platform,
      routeGaps,
      `recommendedCommands[${index}]`,
    );
    if (!normalized) continue;
    if (recommendedByCommand.has(normalized.commandRef)) {
      routeGaps.push(planGap("adaptive-selection-authority-conflict", normalized.commandRef, "duplicate-recommended-command"));
      continue;
    }
    recommendedByCommand.set(normalized.commandRef, normalized);
  }

  const byDisposition = new Map(laneDefinitions.map(([, disposition]) => [disposition, []]));
  const observedDisposition = new Map();
  for (const [field, disposition] of laneDefinitions) {
    if (!Array.isArray(report[field])) {
      routeGaps.push(planGap("adaptive-selection-authority-field", "selection-artifact", field));
      continue;
    }
    for (const [index, entry] of report[field].entries()) {
      const normalized = validateAuthorityContributor(entry, disposition, platform, routeGaps, `${field}[${index}]`);
      if (!normalized) continue;
      const priorDisposition = observedDisposition.get(normalized.commandRef);
      if (priorDisposition && priorDisposition !== disposition) {
        routeGaps.push(planGap(
          "adaptive-selection-cross-disposition",
          normalized.commandRef,
          `${priorDisposition}->${disposition}`,
        ));
        continue;
      }
      observedDisposition.set(normalized.commandRef, disposition);
      const recommended = recommendedByCommand.get(normalized.commandRef);
      if (!recommended) {
        routeGaps.push(planGap("adaptive-selection-authority-missing-recommendation", normalized.commandRef, field));
        continue;
      }
      if (JSON.stringify(authorityMetadata(recommended)) !== JSON.stringify(authorityMetadata(normalized))) {
        routeGaps.push(planGap("adaptive-selection-authority-conflict", normalized.commandRef, field));
        continue;
      }
      byDisposition.get(disposition).push(normalized);
    }
  }
  for (const [commandRef, recommended] of recommendedByCommand) {
    if (observedDisposition.get(commandRef) !== recommended.disposition) {
      routeGaps.push(planGap(
        "adaptive-selection-authority-missing-contributor",
        commandRef,
        `disposition=${recommended.disposition}`,
      ));
    }
  }
  return { byDisposition, recommendedByCommand, routeGaps };
}

function validateSelectionArtifactProvenance(report, authority, { platform = process.platform } = {}) {
  const routeGaps = [];
  const expectedFiles = normalizeChangedFiles(report.changedFiles);
  const unmatchedFiles = new Set(normalizeChangedFiles(report.unmatchedChangedFiles));
  const observedFiles = new Set();
  const routeIdsByCommand = new Map();
  for (const [index, entry] of report.matchedByFile.entries()) {
    const normalizedFile = normalizeChangedFiles([entry?.changedFile])[0] || "";
    if (!normalizedFile || !expectedFiles.includes(normalizedFile) || observedFiles.has(normalizedFile)) {
      routeGaps.push(planGap(
        "adaptive-selection-provenance-conflict",
        normalizedFile || `matchedByFile[${index}]`,
        "unknown-or-duplicate-changed-file",
      ));
      continue;
    }
    observedFiles.add(normalizedFile);
    const matchedRouteIds = requiredStringArray(entry, "matchedRouteIds", {
      allowEmpty: unmatchedFiles.has(normalizedFile),
    });
    if (matchedRouteIds === null || !Array.isArray(entry.recommendedCommands)) {
      routeGaps.push(planGap("adaptive-selection-provenance-field", normalizedFile, `matchedByFile[${index}]`));
      continue;
    }
    if (!unmatchedFiles.has(normalizedFile)
      && (matchedRouteIds.length === 0 || entry.recommendedCommands.length === 0)) {
      routeGaps.push(planGap("adaptive-selection-provenance-empty", normalizedFile, `matchedByFile[${index}]`));
      continue;
    }
    for (const [commandIndex, command] of entry.recommendedCommands.entries()) {
      const normalized = validateAuthorityContributor(
        command,
        command?.disposition,
        platform,
        routeGaps,
        `matchedByFile[${index}].recommendedCommands[${commandIndex}]`,
      );
      if (!normalized) continue;
      const recommended = authority.recommendedByCommand.get(normalized.commandRef);
      if (!recommended) {
        routeGaps.push(planGap("adaptive-selection-provenance-conflict", normalized.commandRef, normalizedFile));
        continue;
      }
      if (normalized.routeIds.some((routeId) => !matchedRouteIds.includes(routeId))) {
        routeGaps.push(planGap("adaptive-selection-provenance-conflict", normalized.commandRef, `${normalizedFile}:routeIds`));
      }
      const observedRouteIds = routeIdsByCommand.get(normalized.commandRef) || new Set();
      for (const routeId of normalized.routeIds) observedRouteIds.add(routeId);
      routeIdsByCommand.set(normalized.commandRef, observedRouteIds);
    }
  }
  for (const changedFile of expectedFiles) {
    if (!observedFiles.has(changedFile)) {
      routeGaps.push(planGap("adaptive-selection-provenance-missing-file", changedFile));
    }
  }
  for (const [commandRef, recommended] of authority.recommendedByCommand) {
    const observedRouteIds = routeIdsByCommand.get(commandRef) || new Set();
    if (recommended.routeIds.some((routeId) => !observedRouteIds.has(routeId))) {
      routeGaps.push(planGap("adaptive-selection-provenance-missing-route", commandRef));
    }
  }
  return routeGaps;
}

export function planExecutionLaneFromPackageScripts({
  disposition,
  rootContributors,
  packageScripts,
}) {
  const plannedRoots = [];
  const routeGaps = [];
  for (const root of rootContributors) {
    try {
      plannedRoots.push({
        commandRef: root.commandRef,
        expandedCommands: expandCommandAliases(root.commandRef, packageScripts),
      });
    } catch (error) {
      routeGaps.push(planGap(error.code || "adaptive-plan-error", root.commandRef, error.message));
      plannedRoots.push({ commandRef: root.commandRef, expandedCommands: [] });
    }
  }
  return {
    schemaVersion: EXECUTION_PLANNER_SCHEMA_VERSION,
    disposition,
    plannedRoots,
    routeGaps,
  };
}

function projectCanonicalLane({
  disposition,
  rootContributors,
  preparedCatalog,
  executionPlanner,
  platform,
  routeGaps,
  plannerInvocations,
}) {
  const rootCommandRefs = rootContributors.map((entry) => entry.commandRef);
  plannerInvocations.push({ disposition, rootCommandRefs: [...rootCommandRefs] });
  let plan;
  try {
    const maxLeaves = Math.min(HARD_MAX_GROUP_LEAVES, ...rootContributors.map((entry) => entry.maxLeaves));
    const platformArgvLimit = platform === "win32" ? WINDOWS_MAX_ARGV_BYTES : POSIX_MAX_ARGV_BYTES;
    const maxArgvBytes = Math.min(platformArgvLimit, ...rootContributors.map((entry) => entry.maxArgvBytes));
    plan = executionPlanner(
      preparedCatalog.catalog,
      rootContributors.map((entry) => structuredClone(entry)),
      {
        preparedCatalog,
        disposition,
        platform,
        maxLeaves: Number.isFinite(maxLeaves) ? maxLeaves : HARD_MAX_GROUP_LEAVES,
        maxArgvBytes: Number.isFinite(maxArgvBytes) ? maxArgvBytes : platformArgvLimit,
      },
    );
  } catch (error) {
    const code = error.code || String(error.message || "adaptive-execution-planner-error").split(":")[0];
    routeGaps.push(planGap(code, disposition, error.message));
    return { plan: null, leaves: [], groups: [] };
  }
  if (!plan
    || plan.schemaVersion !== 1
    || plan.kind !== "verification-selection-plan"
    || plan.status !== "ready"
    || plan.catalogDigest !== preparedCatalog.catalogDigest
    || !Array.isArray(plan.requestedCommandRefs)
    || !Array.isArray(plan.selectedCommandRefs)
    || !Array.isArray(plan.rootRecords)
    || !Array.isArray(plan.normalizedLeaves)
    || !Array.isArray(plan.executions)
    || !Array.isArray(plan.dependencyEdges)
    || !Array.isArray(plan.resourceLockGroups)) {
    routeGaps.push(planGap("adaptive-execution-planner-contract", disposition, "invalid-final-plan"));
    return { plan: null, leaves: [], groups: [] };
  }
  if (JSON.stringify(plan.requestedCommandRefs) !== JSON.stringify(rootCommandRefs)) {
    routeGaps.push(planGap("adaptive-execution-planner-contract", disposition, "requested-root-drift"));
    return { plan: null, leaves: [], groups: [] };
  }
  const contributorsByCommand = new Map(rootContributors.map((entry) => [entry.commandRef, entry]));
  const groups = plan.executions.map((execution) => {
    const sourceRootRefs = uniqueSorted(execution.provenance.map((entry) => entry.rootCommandRef));
    const contributors = sourceRootRefs.map((commandRef) => contributorsByCommand.get(commandRef)).filter(Boolean);
    const routeIds = uniqueSorted(execution.provenance.flatMap((entry) => entry.routeIds || []));
    const safetyContributorRouteIds = uniqueSorted(
      execution.provenance.flatMap((entry) => entry.safetyContributorRouteIds || []),
    );
    return {
      disposition,
      kind: execution.runner,
      commandRef: formatCommandTokens([execution.executable, ...execution.effectiveArgv]),
      rootCommandRef: sourceRootRefs[0] || null,
      sourceRootRefs,
      sourceCommandRefs: sourceRootRefs,
      sourceRefs: uniqueSorted(contributors.flatMap((entry) => entry.sourceRefs)),
      process: { bin: execution.executable, args: [...execution.effectiveArgv] },
      processRef: execution.executionId,
      processClass: execution.processClass,
      isolation: execution.isolation,
      groupId: execution.executionId,
      executionGroupRef: execution.executionId,
      canonicalLeafRefs: [...execution.leafKeys],
      leafIds: [...execution.leafKeys],
      files: [...execution.files],
      modules: [...execution.modules],
      specs: [...execution.specs],
      routeIds,
      safetyContributorRouteIds,
      resourceLocks: [...execution.resourceLocks],
      executionOwner: execution.executionOwner,
      executionOwners: uniqueSorted(contributors.flatMap((entry) => entry.executionOwners)),
      platforms: [...execution.platforms],
      tiers: [...execution.tiers],
      ciProfiles: [...execution.ciProfiles],
      domains: [...execution.domains],
      cost: execution.cost,
      leafCount: execution.leafCount,
      argvBytes: execution.argvBytes,
      maxLeaves: execution.maxLeaves,
      maxArgvBytes: execution.maxArgvBytes,
      provenance: structuredClone(execution.provenance),
      dependencyEdges: plan.dependencyEdges.filter((edge) => (
        edge.from === execution.executionId || edge.to === execution.executionId
      )),
      sourceOrder: execution.order,
    };
  });
  const groupByLeaf = new Map(groups.flatMap((group) => (
    group.leafIds.map((leafId) => [leafId, group])
  )));
  const leaves = plan.normalizedLeaves.map((leafId, sequence) => {
    const group = groupByLeaf.get(leafId);
    if (!group) {
      routeGaps.push(planGap("adaptive-execution-planner-contract", disposition, `unprojected-leaf:${leafId}`));
      return null;
    }
    const separator = leafId.indexOf(":");
    return {
      leafId,
      canonicalLeafRef: leafId,
      kind: separator === -1 ? group.kind : leafId.slice(0, separator),
      target: separator === -1 ? leafId : leafId.slice(separator + 1),
      disposition,
      authorityDisposition: disposition,
      executionOwner: group.executionOwner,
      executionOwners: [...group.executionOwners],
      platforms: [...group.platforms],
      resourceLocks: [...group.resourceLocks],
      tiers: [...group.tiers],
      ciProfiles: [...group.ciProfiles],
      isolation: group.isolation,
      batchSafe: group.isolation === "batch",
      maxLeaves: group.maxLeaves,
      maxArgvBytes: group.maxArgvBytes,
      sourceCommandRefs: [...group.sourceCommandRefs],
      sourceRootRefs: [...group.sourceRootRefs],
      routeIds: [...group.routeIds],
      safetyContributorRouteIds: [...group.safetyContributorRouteIds],
      aliasPaths: group.provenance.map((entry) => entry.expansionPath),
      processKeys: [group.processRef],
      executionGroupRef: group.executionGroupRef,
      processRef: group.processRef,
      processClass: group.processClass,
      files: [...group.files],
      modules: [...group.modules],
      specs: [...group.specs],
      provenance: structuredClone(group.provenance),
      dependencyEdges: structuredClone(group.dependencyEdges),
      sourceOrder: group.sourceOrder,
      sequence,
    };
  }).filter(Boolean);
  return { plan, leaves, groups };
}

function prepareAdaptiveCatalog(report, packageScripts, platform) {
  if (Array.isArray(report.routeAuthority) && report.routeAuthority.length > 0) {
    return prepareVerificationCatalog({
      packageScripts,
      authority: report.routeAuthority,
      selectorCommandRefs: report.routeAuthority.map((entry) => entry.commandRef),
      platform,
      sourceMode: "fixture",
    });
  }
  const selectorRoutes = (report.recommendedCommands || []).map((entry, index) => ({
    ...structuredClone(entry),
    id: entry.routeIds?.[0] || `adaptive-fixture:${String(index + 1).padStart(4, "0")}`,
    authoritySource: "selector-route",
  }));
  return prepareVerificationCatalog({
    packageScripts,
    selectorRoutes,
    selectorCommandRefs: selectorRoutes.map((entry) => entry.commandRef),
    platform,
    sourceMode: "fixture",
  });
}

function buildCanonicalProfileProjection(groups) {
  return groups.flatMap((group) => group.leafIds.map((leafId, leafIndex) => {
    const separator = leafId.indexOf(":");
    const kind = separator === -1 ? group.kind : leafId.slice(0, separator);
    const target = separator === -1 ? leafId : leafId.slice(separator + 1);
    const files = group.files.filter((file) => file === target);
    const modules = group.modules.filter((moduleName) => moduleName === target);
    const specs = group.specs.filter((spec) => spec === target);
    return {
      rootCommandRef: group.rootCommandRef,
      sourceRootRefs: [...group.sourceRootRefs],
      canonicalLeafRef: leafId,
      leafId,
      kind,
      executionGroupRef: group.executionGroupRef,
      groupId: group.groupId,
      files,
      modules,
      specs,
      processRef: group.processRef,
      processClass: group.processClass,
      isolation: group.isolation,
      disposition: group.disposition,
      executionOwner: group.executionOwner,
      executionOwners: [...group.executionOwners],
      platforms: [...group.platforms],
      resourceLocks: [...group.resourceLocks],
      routeIds: [...group.routeIds],
      safetyContributorRouteIds: [...group.safetyContributorRouteIds],
      provenance: structuredClone(group.provenance),
      dependencyEdges: structuredClone(group.dependencyEdges),
      sourceOrder: group.sourceOrder * HARD_MAX_GROUP_LEAVES + leafIndex,
    };
  }));
}

export function buildExecutionPlan(report, {
  includeMainThread = false,
  packageScripts = readPackageScripts(),
  platform = process.platform,
  preparedCatalog = null,
  executionPlanner = buildVerificationSelectionPlan,
} = {}) {
  const authority = resolveSelectionAuthority(report, { platform });
  const routeGaps = [...authority.routeGaps, ...(report.blockedVerification || []).map((entry) => (
    planGap("adaptive-route-owner-gap", entry.commandRef, entry.reason)
  ))];
  let currentPreparedCatalog = preparedCatalog;
  try {
    currentPreparedCatalog ||= prepareAdaptiveCatalog(report, packageScripts, platform);
    if (preparedCatalog
      && (preparedCatalog.sourceMode === "repository" || report.catalogDigest !== undefined)) {
      routeGaps.push(...validateSelectionCatalogBinding(report, preparedCatalog));
    }
  } catch (error) {
    routeGaps.push(planGap(
      error.code || String(error.message || "adaptive-catalog-preparation-error").split(":")[0],
      "verification-catalog",
      error.message,
    ));
  }
  // run_adaptive_tests 自身可能被 selector 推荐；这里过滤递归命令，避免执行模式套娃。
  const withoutAdaptiveRecursion = (entries) => entries
    .filter((entry) => !entry.commandRef.startsWith("node tools/run_adaptive_tests.mjs "));
  const childSafeContributors = withoutAdaptiveRecursion(authority.byDisposition.get("child-safe") || []);
  const mainThreadContributors = withoutAdaptiveRecursion(authority.byDisposition.get("main-thread") || []);
  const ciOnlyContributors = withoutAdaptiveRecursion(authority.byDisposition.get("ci-only") || []);
  const childSafeCommands = childSafeContributors.map((entry) => entry.commandRef);
  const mainThreadCommands = mainThreadContributors.map((entry) => entry.commandRef);
  const ciOnlyCommands = ciOnlyContributors.map((entry) => entry.commandRef);
  const contributorsFor = (entries, executionDisposition) => entries.map((entry) => ({
    ...entry,
    executionDisposition,
  }));
  const selectedContributors = contributorsFor(
    includeMainThread ? [...childSafeContributors, ...mainThreadContributors] : childSafeContributors,
    "selected",
  );
  const deferredMainContributors = contributorsFor(
    includeMainThread ? [] : mainThreadContributors,
    "deferred-main-thread",
  );
  const deferredCiContributors = contributorsFor(ciOnlyContributors, "deferred-ci-only");
  const plannerInvocations = [];
  let selectedProjection = { plan: null, leaves: [], groups: [] };
  let deferredMainProjection = { plan: null, leaves: [], groups: [] };
  let deferredCiProjection = { plan: null, leaves: [], groups: [] };
  if (routeGaps.length === 0 && currentPreparedCatalog) {
    selectedProjection = projectCanonicalLane({
      disposition: "selected",
      rootContributors: selectedContributors,
      preparedCatalog: currentPreparedCatalog,
      executionPlanner,
      platform,
      routeGaps,
      plannerInvocations,
    });
    deferredMainProjection = projectCanonicalLane({
      disposition: "deferred-main-thread",
      rootContributors: deferredMainContributors,
      preparedCatalog: currentPreparedCatalog,
      executionPlanner,
      platform,
      routeGaps,
      plannerInvocations,
    });
    deferredCiProjection = projectCanonicalLane({
      disposition: "deferred-ci-only",
      rootContributors: deferredCiContributors,
      preparedCatalog: currentPreparedCatalog,
      executionPlanner,
      platform,
      routeGaps,
      plannerInvocations,
    });
  }
  const selectedLeaves = selectedProjection.leaves;
  const deferredMainThreadLeaves = deferredMainProjection.leaves;
  const deferredCiOnlyLeaves = deferredCiProjection.leaves;
  for (const [disposition, leaves] of [
    ["selected", selectedLeaves],
    ["deferred-main-thread", deferredMainThreadLeaves],
    ["deferred-ci-only", deferredCiOnlyLeaves],
  ]) {
    const laneLeafIds = new Set();
    for (const leaf of leaves) {
      if (laneLeafIds.has(leaf.leafId)) {
        routeGaps.push(planGap(
          "adaptive-leaf-duplicate",
          leaf.sourceCommandRefs.join(","),
          `leaf=${JSON.stringify(leaf.leafId)};disposition=${disposition}`,
        ));
      }
      laneLeafIds.add(leaf.leafId);
    }
  }
  const executionGroups = selectedProjection.groups;
  const deferredMainThreadGroups = deferredMainProjection.groups;
  const deferredCiOnlyGroups = deferredCiProjection.groups;
  const superseded = (projection) => (projection.plan?.rootRecords || [])
    .filter((entry) => entry.disposition === "superseded")
    .map(({ commandRef, supersededBy }) => ({ commandRef, supersededBy }));
  const uniqueRouteGaps = [...new Map(routeGaps.map((gap) => [
    `${gap.code}\u0000${gap.commandRef}\u0000${gap.detail}`,
    gap,
  ])).values()];
  const verificationProfileProjection = buildCanonicalProfileProjection(executionGroups);
  return {
    schemaVersion: EXECUTION_PLAN_SCHEMA_VERSION,
    plannerSchemaVersion: EXECUTION_PLANNER_SCHEMA_VERSION,
    platform,
    childSafeCommands,
    mainThreadCommands,
    ciOnlyCommands,
    catalogDigest: currentPreparedCatalog?.catalogDigest || null,
    catalogSourceIdentity: currentPreparedCatalog?.sourceIdentity || null,
    commandsToRun: selectedProjection.plan?.selectedCommandRefs || [],
    supersededCommands: superseded(selectedProjection),
    blockedMainThreadCommands: includeMainThread ? [] : mainThreadCommands,
    deferredMainThreadSupersededCommands: superseded(deferredMainProjection),
    deferredCiOnlyCommands: ciOnlyCommands,
    deferredCiOnlySupersededCommands: superseded(deferredCiProjection),
    selectedLeaves,
    deferredMainThreadLeaves,
    deferredCiOnlyLeaves,
    executionGroups,
    deferredMainThreadGroups,
    deferredCiOnlyGroups,
    verificationProfileProjectionKind: "canonical-final-plan",
    verificationProfileProjection,
    canonicalPlans: {
      selected: selectedProjection.plan,
      deferredMainThread: deferredMainProjection.plan,
      deferredCiOnly: deferredCiProjection.plan,
    },
    executionCommands: uniqueRouteGaps.length > 0 ? [] : executionGroups,
    routeGaps: uniqueRouteGaps,
    plannerInvocations,
    closure: {
      authorityContributorCount: authority.recommendedByCommand.size,
      selectedRootCount: selectedProjection.plan?.selectedCommandRefs.length || 0,
      selectedLeafCount: selectedLeaves.length,
      executionGroupCount: executionGroups.length,
      deferredMainThreadRootCount: deferredMainProjection.plan?.selectedCommandRefs.length || 0,
      deferredMainThreadLeafCount: deferredMainThreadLeaves.length,
      deferredCiOnlyRootCount: deferredCiProjection.plan?.selectedCommandRefs.length || 0,
      deferredCiOnlyLeafCount: deferredCiOnlyLeaves.length,
      plannerInvocationCount: plannerInvocations.length,
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
  const planningBlocked = (report.unmatchedChangedFiles || []).length > 0
    || (executionPlan?.routeGaps || []).length > 0
    || blockedByOwnership;
  const executionStatus = planningBlocked
    ? "blocked"
    : terminalState
      || (executionResults === null
        ? "planned"
        : executionResults.some((entry) => entry.status === "interrupted")
          ? "interrupted"
          : executionResults.some((entry) => entry.status === "running")
            ? "running"
            : executionResults.some((entry) => entry.status !== "passed")
              ? "failed"
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
  const plannedCommands = Array.isArray(executionPlan.executionCommands)
    ? executionPlan.executionCommands
    : [];
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
      interrupted: false,
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
    entry.actualFiles = entry.processStarted
      ? uniqueSorted([
        ...(plannedCommand.files || []),
        ...(plannedCommand.modules || []),
        ...(plannedCommand.specs || []),
      ])
      : [];
    const finishedAtDate = now();
    entry.finishedAt = finishedAtDate.toISOString();
    entry.durationMs = Math.max(0, finishedAtDate.getTime() - startedAtDate.getTime());
    entry.signal = typeof result?.signal === "string" ? result.signal : null;
    entry.interrupted = entry.signal !== null || result?.error?.code === "EINTR";
    entry.exitCode = typeof result?.status === "number" ? result.status : 1;
    entry.status = entry.interrupted ? "interrupted" : entry.exitCode === 0 ? "passed" : "failed";
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

export function readSelectionArtifact(selectionPath, changedFiles, {
  preparedCatalog = null,
  expectedSelectorRootSet = null,
} = {}) {
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
    "matchedByFile",
    "unmatchedChangedFiles",
  ]) {
    if (!Array.isArray(report[field])) {
      throw selectionArtifactError("adaptive-selection-artifact-field", field);
    }
  }
  if (!report.changedFiles.every((entry) => typeof entry === "string" && entry.trim())) {
    throw selectionArtifactError("adaptive-selection-artifact-field", "changedFiles[]");
  }
  if (!report.unmatchedChangedFiles.every((entry) => typeof entry === "string" && entry.trim())) {
    throw selectionArtifactError("adaptive-selection-artifact-field", "unmatchedChangedFiles[]");
  }
  const expectedChangedFiles = normalizeChangedFiles(changedFiles);
  const artifactChangedFiles = normalizeChangedFiles(report.changedFiles);
  if (JSON.stringify(expectedChangedFiles) !== JSON.stringify(artifactChangedFiles)) {
    throw selectionArtifactError(
      "adaptive-selection-artifact-changed-files-mismatch",
      `expected=${expectedChangedFiles.join(",")};artifact=${artifactChangedFiles.join(",")}`,
    );
  }
  if (artifactChangedFiles.length > 0
    && report.recommendedCommands.length === 0
    && report.unmatchedChangedFiles.length === 0
    && report.blockedVerification.length === 0) {
    throw selectionArtifactError("adaptive-selection-artifact-empty-closure", artifactChangedFiles.join(","));
  }
  if (preparedCatalog) {
    const [bindingGap] = validateSelectionCatalogBinding(report, preparedCatalog, {
      expectedSelectorRootSet: expectedSelectorRootSet || selectionRootSet(report),
    });
    if (bindingGap) {
      throw selectionArtifactError(bindingGap.code, bindingGap.detail);
    }
  }
  const authority = resolveSelectionAuthority(report);
  const provenanceGaps = authority.routeGaps.length > 0
    ? []
    : validateSelectionArtifactProvenance(report, authority);
  if (authority.routeGaps.length > 0 || provenanceGaps.length > 0) {
    const [gap] = [...authority.routeGaps, ...provenanceGaps];
    throw selectionArtifactError(gap.code, `${gap.commandRef}:${gap.detail}`);
  }
  return report;
}

function emptySelectionReport(changedFiles, gap) {
  return {
    schemaVersion: 1,
    selectionPlatform: process.platform,
    changedFiles: normalizeChangedFiles(changedFiles),
    recommendedCommands: [],
    childAgentStaticTasks: [],
    mainThreadSerialVerification: [],
    ciOnlyVerification: [],
    blockedVerification: [],
    matchedByFile: [],
    unmatchedChangedFiles: [],
    diagnosticNextSteps: [{
      commandRef: gap.commandRef || "selection-artifact",
      executionOwners: [],
      resourceLocks: [],
    }],
    advisoryNotes: [],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.includeMainThread && args.deferMainThread) {
    throw new Error("--include-main-thread and --defer-main-thread are mutually exclusive");
  }
  const rawChangedFiles = args.changedFilesProvided
    ? args.changedFiles
    : discoverChangedFiles({
      includeBranchHistory: args.includeBranchHistory,
      historyBase: args.historyBase,
    });
  const changedFiles = normalizeChangedFiles(rawChangedFiles);
  try {
    if (args.inputErrors.length > 0) {
      const error = new Error(args.inputErrors.join(";"));
      error.code = "adaptive-execution-input-error";
      throw error;
    }
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
  let packageScripts = null;
  let preparedCatalog = null;
  try {
    packageScripts = readPackageScriptsForProfile();
    const selectorRoutes = buildRouteIndex();
    const catalogBinding = prepareRepositoryVerificationCatalogBinding({
      packageScripts,
      verificationRecords: VERIFICATION_DOMAINS,
      selectorRoutes,
      repoRoot: REPO_ROOT,
      platform: process.platform,
    });
    preparedCatalog = catalogBinding.preparedCatalog;
    const currentSelection = catalogBinding.bindSelectionReport(
      buildRecommendation(changedFiles, selectorRoutes, { routeAuthority: preparedCatalog.authority }),
    );
    selectedReport = args.selectionJson
      ? readSelectionArtifact(args.selectionJson, changedFiles, {
        preparedCatalog,
        expectedSelectorRootSet: currentSelection.selectorRootSet,
      })
      : currentSelection;
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
  const executionPlan = buildExecutionPlan(report, {
    includeMainThread: args.includeMainThread,
    packageScripts,
    preparedCatalog,
  });
  let preparedProfilePlan = null;
  let profilePreparationError = null;
  try {
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
      terminalState: (report.unmatchedChangedFiles || []).length > 0 || executionPlan.routeGaps.length > 0
        ? "blocked"
        : "planned",
    });
    if ((report.unmatchedChangedFiles || []).length > 0 || executionPlan.routeGaps.length > 0) {
      console.error(
        `Adaptive planning failed closed with ${report.unmatchedChangedFiles.length} unmatched file(s) `
        + `and ${executionPlan.routeGaps.length} route gap(s).`,
      );
      process.exit(2);
    }
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
  const failed = executionResults.find((entry) => entry.status !== "passed");
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
