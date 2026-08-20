import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCommandSupersessionPlan,
  VERIFICATION_COMMAND_SUPERSESSION,
} from "./command_supersession.mjs";
import { VERIFICATION_DOMAINS } from "./verification_domains.mjs";

export const SCRIPT_PORTFOLIO_SCHEMA_VERSION = 1;
export const VERIFICATION_CATALOG_SCHEMA_VERSION = 1;
export const CANONICAL_VERIFICATION_ENTRYPOINTS = Object.freeze([
  "verify:pr",
  "verify:demo",
  "verify:nightly",
  "verify:release",
]);

const CLASSIFICATIONS = Object.freeze(["canonical", "internal", "superseded"]);
const COST_ORDER = Object.freeze(["fast", "contract", "heavy"]);
const EXECUTION_OWNER_ORDER = Object.freeze(["child-safe", "main-thread", "ci-only"]);

function sortedUnique(values) {
  return [...new Set((values || []).filter((value) => value !== undefined && value !== null).map(String))].sort();
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeVerificationPath(value) {
  const slashPath = String(value).replaceAll("\\", "/");
  const normalized = path.posix.normalize(slashPath).replace(/^\.\//, "");
  return normalized.replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`);
}

function tokenizeCommand(command) {
  const tokens = [];
  let token = "";
  let quote = null;
  const source = String(command);
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    const escapesNext = next === "\\" || next === '"' || (!quote && /\s/.test(next || ""));
    if (character === "\\" && quote !== "'" && escapesNext) {
      token += next;
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += character;
  }
  if (quote) throw new Error("verification-catalog-unclosed-quote");
  if (token) tokens.push(token);
  return tokens;
}

function splitCommandChain(command) {
  const parts = [];
  let start = 0;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < command.length - 1; index += 1) {
    const character = command[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "&" && command[index + 1] === "&") {
      parts.push(command.slice(start, index).trim());
      start = index + 2;
      index += 1;
    }
  }
  parts.push(command.slice(start).trim());
  return parts;
}

function parseNpmRunReference(command) {
  const tokens = tokenizeCommand(command);
  if (tokens[0] !== "npm" || tokens[1] !== "run" || !tokens[2]) return null;
  const separator = tokens.indexOf("--", 3);
  return {
    id: tokens[2],
    args: separator === -1 ? tokens.slice(3) : tokens.slice(separator + 1),
  };
}

function commandMetadata(records, commandRef) {
  const matching = (records || []).filter((record) => record?.commandRef === commandRef || record?.id === commandRef);
  const valuesFor = (field) => sortedUnique(matching.flatMap((record) => {
    const value = record?.[field];
    return Array.isArray(value) ? value : value === undefined ? [] : [value];
  }));
  const owners = valuesFor("executionOwner");
  const platformSets = matching
    .filter((record) => Object.hasOwn(record, "platforms") || Object.hasOwn(record, "platform"))
    .map((record) => sortedUnique(record.platforms || (record.platform ? [record.platform] : [])));
  const distinctPlatforms = sortedUnique(platformSets.map((values) => JSON.stringify(values)));
  const lockSets = matching
    .filter((record) => Object.hasOwn(record, "resourceLocks"))
    .map((record) => sortedUnique(record.resourceLocks));
  const distinctLocks = sortedUnique(lockSets.map((values) => JSON.stringify(values)));
  if (owners.length > 1) throw new Error(`verification-catalog-metadata-conflict:${commandRef}:executionOwner`);
  if (distinctPlatforms.length > 1) throw new Error(`verification-catalog-metadata-conflict:${commandRef}:platforms`);
  if (distinctLocks.length > 1) throw new Error(`verification-catalog-metadata-conflict:${commandRef}:resourceLocks`);
  const costs = valuesFor("cost");
  for (const value of costs) {
    if (!COST_ORDER.includes(value)) throw new Error(`verification-catalog-invalid-cost:${commandRef}:${value}`);
  }
  const cost = costs.length === 0
    ? "unclassified"
    : [...costs].sort((left, right) => COST_ORDER.indexOf(right) - COST_ORDER.indexOf(left))[0];
  const tiers = sortedUnique([...valuesFor("tier"), ...valuesFor("tiers"), ...valuesFor("layer")]);
  const ciProfiles = sortedUnique([...valuesFor("ciProfile"), ...valuesFor("ciProfiles")]);
  const metadataComplete = matching.length > 0
    && costs.length > 0
    && owners.length > 0
    && lockSets.length > 0
    && ciProfiles.length > 0;
  return {
    domains: valuesFor("domain").concat(valuesFor("domains")).filter((value, index, all) => all.indexOf(value) === index).sort(),
    cost,
    executionOwner: owners[0] || "unclassified",
    platforms: platformSets[0] || ["all"],
    resourceLocks: lockSets[0] || [],
    tiers,
    ciProfiles,
    metadataComplete,
  };
}

function isTestPath(token) {
  return /(?:^|[\\/])[^\\/]+\.(?:c|m)?js$/i.test(token);
}

function isPythonTestPath(token) {
  return /(?:^|[\\/])[^\\/]+\.py$/i.test(token);
}

function partitionRunnerTargets(tokens, targetPredicate, valueOptions) {
  const targets = [];
  const runnerArgs = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const equalsIndex = token.indexOf("=");
    if (equalsIndex > 0 && valueOptions.has(token.slice(0, equalsIndex))) {
      runnerArgs.push(token);
      continue;
    }
    if (valueOptions.has(token) && index + 1 < tokens.length) {
      runnerArgs.push(token, tokens[index + 1]);
      index += 1;
      continue;
    }
    if (targetPredicate(token)) targets.push(normalizeVerificationPath(token));
    else runnerArgs.push(token);
  }
  return { targets, runnerArgs };
}

function inferPlatforms(executable, configuredPlatforms = ["all"]) {
  const configured = sortedUnique(configuredPlatforms);
  if (configured.length !== 1 || configured[0] !== "all") return configured;
  if (/^(?:cmd|powershell)(?:\.exe)?$/i.test(executable)) return ["win32"];
  if (/^(?:bash|sh)$/i.test(executable)) return ["darwin", "linux"];
  return configured;
}

function parseLeafDefinition(id, command, metadata) {
  const argv = tokenizeCommand(command);
  const executable = argv[0] || "";
  const args = argv.slice(1);
  const leafMetadata = {
    ...metadata,
    platforms: inferPlatforms(executable, metadata.platforms),
  };
  const playwrightTestIndex = args.findIndex((arg, index) => arg === "test"
    && index > 0
    && /(?:^|[\\/])@playwright[\\/]test[\\/]cli\.js$/i.test(args[index - 1]));
  const directPlaywrightTestIndex = /^(?:playwright|playwright\.cmd)$/i.test(executable) && args[0] === "test"
    ? 0
    : -1;
  const resolvedPlaywrightTestIndex = playwrightTestIndex !== -1
    ? playwrightTestIndex
    : directPlaywrightTestIndex;
  if (resolvedPlaywrightTestIndex !== -1) {
    const testArgs = args.slice(resolvedPlaywrightTestIndex + 1);
    const { targets: specs, runnerArgs } = partitionRunnerTargets(
      testArgs,
      isTestPath,
      new Set([
        "--config", "-c", "--global-timeout", "--grep", "-g", "--grep-invert",
        "--max-failures", "--project", "--reporter", "--retries", "--timeout",
        "--workers", "-j",
      ]),
    );
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "playwright",
      files: [], modules: [], specs, runnerArgs, ...leafMetadata,
      ...(specs.length === 0 ? { targetless: true, discovery: { kind: "playwright-config" } } : {}),
    };
  }
  const nodeTestIndex = args.indexOf("--test");
  if (/^(?:node|node\.exe)$/i.test(executable) && nodeTestIndex !== -1) {
    const testArgs = args.slice(nodeTestIndex + 1);
    const { targets: files, runnerArgs } = partitionRunnerTargets(
      testArgs,
      isTestPath,
      new Set([
        "--test-concurrency", "--test-name-pattern", "--test-reporter",
        "--test-reporter-destination", "--test-shard", "--test-timeout",
      ]),
    );
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "node-test",
      files, modules: [], specs: [], runnerArgs, ...leafMetadata,
      ...(files.length === 0 ? { targetless: true, discovery: { kind: "node-test-default" } } : {}),
    };
  }
  if (/^(?:node|node\.exe)$/i.test(executable) && isTestPath(args[0] || "")) {
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "node-script",
      files: [normalizeVerificationPath(args[0])], modules: [], specs: [],
      runnerArgs: args.slice(1), ...leafMetadata,
    };
  }
  const npmPython = executable === "npm" && args[0] === "run" && args[1] === "python";
  const nodePython = /^(?:node|node\.exe)$/i.test(executable)
    && normalizeVerificationPath(args[0] || "").endsWith("tools/run_python.mjs");
  const directPython = /^(?:py|python|python3)(?:\.exe)?$/i.test(executable);
  const pythonArgs = npmPython
    ? args.slice(Math.max(args.indexOf("--") + 1, 3))
    : nodePython
      ? args.slice(1)
      : directPython
        ? args
        : [];
  const unittestIndex = pythonArgs.findIndex((arg, index) => arg === "unittest" && pythonArgs[index - 1] === "-m");
  if (unittestIndex !== -1) {
    const unittestArgs = pythonArgs.slice(unittestIndex + 1);
    if (unittestArgs[0] === "discover") {
      const startIndex = unittestArgs.findIndex((arg) => arg === "-s" || arg === "--start-directory");
      const patternIndex = unittestArgs.findIndex((arg) => arg === "-p" || arg === "--pattern");
      const startDirectory = startIndex !== -1 ? unittestArgs[startIndex + 1] : ".";
      const pattern = patternIndex !== -1 ? unittestArgs[patternIndex + 1] : "test*.py";
      return {
        id, kind: "leaf", command, executable, argv: args, runner: "python-unittest",
        files: [normalizeVerificationPath(path.posix.join(normalizeVerificationPath(startDirectory), pattern))],
        modules: [], specs: [], runnerArgs: [...unittestArgs], ...leafMetadata,
      };
    }
    const { targets: positionalTargets, runnerArgs } = partitionRunnerTargets(
      unittestArgs,
      (arg) => !arg.startsWith("-") && !arg.includes("="),
      new Set(["-k", "--durations"]),
    );
    const files = positionalTargets.filter(isPythonTestPath).map(normalizeVerificationPath);
    const modules = positionalTargets.filter((arg) => !isPythonTestPath(arg)).map(String);
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "python-unittest",
      files, modules, specs: [], runnerArgs, ...leafMetadata,
      ...(files.length === 0 && modules.length === 0
        ? { targetless: true, discovery: { kind: "python-unittest-default" } }
        : {}),
    };
  }
  const pytestIndex = pythonArgs.findIndex((arg, index) => arg === "pytest" && pythonArgs[index - 1] === "-m");
  if (pytestIndex !== -1) {
    const pytestArgs = pythonArgs.slice(pytestIndex + 1);
    const files = pytestArgs.filter(isPythonTestPath).map(normalizeVerificationPath);
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "python-pytest",
      files, modules: [], specs: [], runnerArgs: pytestArgs.filter((arg) => !isPythonTestPath(arg)), ...leafMetadata,
      ...(files.length === 0 ? { targetless: true, discovery: { kind: "python-pytest-default" } } : {}),
    };
  }
  if (pythonArgs.length > 0 && isPythonTestPath(pythonArgs[0])) {
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "python-script",
      files: [normalizeVerificationPath(pythonArgs[0])], modules: [], specs: [],
      runnerArgs: pythonArgs.slice(1), ...leafMetadata,
    };
  }
  return {
    id, kind: "leaf", command, executable, argv: args, runner: "opaque",
    files: [], modules: [], specs: [], runnerArgs: [...args], ...leafMetadata,
  };
}

/** Build the canonical verification catalog without importing selector metadata. */
export function buildVerificationCatalog(input, options = {}) {
  const packageScripts = input?.packageScripts || input;
  const records = input?.packageScripts ? input.records || [] : options.records || [];
  const scripts = normalizeScripts(packageScripts);
  const entries = [];
  for (const id of Object.keys(scripts).sort()) {
    const command = scripts[id];
    const parts = splitCommandChain(command);
    if (parts.some((part) => !part)) throw new Error(`verification-catalog-empty-command-segment:${id}`);
    const metadata = commandMetadata(records, id);
    if (parts.length > 1) {
      const refs = parts.map((part, index) => {
        const inlineId = `${id}#inline:${String(index + 1).padStart(2, "0")}`;
        const parsedPart = parseLeafDefinition(inlineId, part, commandMetadata([], inlineId));
        const npmRef = parseNpmRunReference(part);
        if (parsedPart.runner === "opaque" && npmRef) return npmRef;
        entries.push({ ...parsedPart, sourceKind: "inline", sourceScript: id });
        return { id: inlineId, args: [] };
      });
      entries.push({ id, kind: "suite", command, refs, files: [], modules: [], specs: [], ...metadata });
      continue;
    }
    const parsedLeaf = parseLeafDefinition(id, command, metadata);
    const npmRef = parseNpmRunReference(command);
    if (parsedLeaf.runner === "opaque" && npmRef) {
      entries.push({ id, kind: "suite", command, refs: [npmRef], files: [], modules: [], specs: [], ...metadata });
      continue;
    }
    entries.push(parsedLeaf);
  }
  const scriptIds = new Set(Object.keys(scripts));
  const directRefs = sortedUnique(records
    .filter((record) => record?.commandType === "direct" || record?.packageScriptRequired === false)
    .map((record) => record?.commandRef)
    .filter((commandRef) => commandRef && !scriptIds.has(commandRef)));
  for (const commandRef of directRefs) {
    entries.push({
      ...parseLeafDefinition(commandRef, commandRef, commandMetadata(records, commandRef)),
      sourceKind: "direct-record",
    });
  }
  entries.sort((left, right) => compareText(left.id, right.id));
  catalogEntries(entries);
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: "verification-test-catalog",
    entries,
  };
}

/** Mechanically compare a catalog with retained package-script and route-record sources. */
export function checkVerificationCatalogConsistency(catalog, {
  packageScripts = {},
  records = [],
} = {}) {
  const byId = catalogEntries(catalog);
  const expectedCatalog = buildVerificationCatalog({ packageScripts, records });
  const expectedById = catalogEntries(expectedCatalog);
  const catalogIds = new Set(byId.keys());
  const expectedIds = new Set(expectedById.keys());
  const recordRefs = sortedUnique(records.map((record) => record?.commandRef || record?.id).filter(Boolean));
  const missingCatalogEntries = [...expectedIds].filter((id) => !catalogIds.has(id)).sort();
  const orphanCatalogEntries = [...catalogIds].filter((id) => !expectedIds.has(id)).sort();
  const unresolvedRecordRefs = recordRefs.filter((id) => !catalogIds.has(id));
  const entryMismatches = [];
  for (const id of [...expectedIds].filter((candidate) => catalogIds.has(candidate)).sort(compareText)) {
    const actual = byId.get(id);
    const expected = expectedById.get(id);
    const fields = sortedUnique([...Object.keys(actual), ...Object.keys(expected)])
      .filter((field) => JSON.stringify(actual[field]) !== JSON.stringify(expected[field]));
    if (fields.length > 0) entryMismatches.push({ id, fields });
  }
  const { unresolvedSuiteRefs, cyclicSuiteRefs } = catalogAliasGraphIssues(byId);
  const invalidSuitePlans = [];
  for (const entry of [...byId.values()].filter((candidate) => candidate.kind === "suite")) {
    try {
      buildVerificationSelectionPlanInternal(catalog, [entry.id], {
        allowUnclassified: true,
      });
    } catch (error) {
      invalidSuitePlans.push({ id: entry.id, error: String(error?.message || error) });
    }
  }
  invalidSuitePlans.sort((left, right) => compareText(left.id, right.id));
  const unclassifiedCatalogEntries = [...expectedById.values()]
    .filter((entry) => entry.kind === "leaf" && entry.metadataComplete === false)
    .map((entry) => entry.id)
    .sort(compareText);
  const targetlessDiscoveryEntries = [...expectedById.values()]
    .filter((entry) => entry.kind === "leaf" && entry.targetless)
    .map((entry) => entry.id)
    .sort(compareText);
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: "verification-catalog-consistency",
    consistent: missingCatalogEntries.length === 0
      && orphanCatalogEntries.length === 0
      && unresolvedRecordRefs.length === 0
      && entryMismatches.length === 0
      && unresolvedSuiteRefs.length === 0
      && cyclicSuiteRefs.length === 0
      && invalidSuitePlans.length === 0,
    missingCatalogEntries,
    orphanCatalogEntries,
    unresolvedRecordRefs,
    entryMismatches,
    unresolvedSuiteRefs,
    cyclicSuiteRefs,
    invalidSuitePlans,
    unclassifiedCatalogEntries,
    targetlessDiscoveryEntries,
  };
}

function catalogEntries(catalog) {
  const entries = Array.isArray(catalog) ? catalog : catalog?.entries;
  if (!Array.isArray(entries)) throw new TypeError("verification-plan-invalid-catalog");
  const byId = new Map();
  for (const entry of entries) {
    if (!entry?.id || (entry.kind !== "leaf" && entry.kind !== "suite")) {
      throw new TypeError("verification-plan-invalid-entry");
    }
    if (byId.has(entry.id)) throw new Error(`verification-plan-duplicate-id:${entry.id}`);
    byId.set(entry.id, entry);
  }
  return byId;
}

function catalogAliasGraphIssues(byId) {
  const unresolvedSuiteRefs = new Set();
  const cyclicSuiteRefs = new Set();
  const state = new Map();

  function visit(id, stack) {
    const entry = byId.get(id);
    if (!entry || entry.kind !== "suite") return;
    const cycleAt = stack.indexOf(id);
    if (cycleAt !== -1) {
      cyclicSuiteRefs.add([...stack.slice(cycleAt), id].join("->"));
      return;
    }
    if (state.get(id) === "complete") return;
    const nextStack = [...stack, id];
    for (const ref of Array.isArray(entry.refs) ? entry.refs : []) {
      const refId = typeof ref === "string" ? ref : ref?.id;
      if (!refId || !byId.has(refId)) {
        unresolvedSuiteRefs.add(`${id}->${refId || "<invalid>"}`);
        continue;
      }
      visit(refId, nextStack);
    }
    state.set(id, "complete");
  }

  for (const id of [...byId.keys()].sort(compareText)) visit(id, []);
  return {
    unresolvedSuiteRefs: [...unresolvedSuiteRefs].sort(compareText),
    cyclicSuiteRefs: [...cyclicSuiteRefs].sort(compareText),
  };
}

function leafTargets(entry) {
  const targets = [
    ...(entry.files || []).map((value) => ({ collisionKey: `path:${normalizeVerificationPath(value)}`, display: normalizeVerificationPath(value) })),
    ...(entry.specs || []).map((value) => ({ collisionKey: `path:${normalizeVerificationPath(value)}`, display: normalizeVerificationPath(value) })),
    ...(entry.modules || []).map((value) => ({ collisionKey: `module:${value}`, display: String(value) })),
  ];
  if (targets.length > 0) return targets;
  return [{ collisionKey: `opaque:${entry.command || `${entry.executable || ""}\0${(entry.argv || []).join("\0")}`}`, display: entry.id }];
}

function comparableLeaf(entry, forwardedArgs) {
  return {
    runner: entry.runner || "opaque",
    argv: [...(entry.argv || []), ...forwardedArgs].map((value) => (
      isTestPath(value) || isPythonTestPath(value) ? normalizeVerificationPath(value) : value
    )),
    executionOwner: entry.executionOwner || "unclassified",
    platforms: sortedUnique(entry.platforms || ["all"]),
    resourceLocks: sortedUnique(entry.resourceLocks),
  };
}

function restrictiveOwner(left = "unclassified", right = "unclassified") {
  if (left === "unclassified") return right;
  if (right === "unclassified") return left;
  const leftIndex = EXECUTION_OWNER_ORDER.indexOf(left);
  const rightIndex = EXECUTION_OWNER_ORDER.indexOf(right);
  if (leftIndex === -1) throw new Error(`verification-plan-invalid-execution-owner:${left}`);
  if (rightIndex === -1) throw new Error(`verification-plan-invalid-execution-owner:${right}`);
  return EXECUTION_OWNER_ORDER[Math.max(leftIndex, rightIndex)];
}

function constrainedPlatforms(left = ["all"], right = ["all"]) {
  const normalizedLeft = sortedUnique(left);
  const normalizedRight = sortedUnique(right);
  if (normalizedLeft.includes("all")) return normalizedRight;
  if (normalizedRight.includes("all")) return normalizedLeft;
  return normalizedLeft.filter((value) => normalizedRight.includes(value));
}

function mergeExecutionMetadata(left = {}, right = {}) {
  const costs = [left.cost, right.cost].filter((cost) => cost && cost !== "unclassified");
  for (const cost of costs) {
    if (!COST_ORDER.includes(cost)) throw new Error(`verification-plan-invalid-cost:${cost}`);
  }
  const metadataComplete = [left, right].some((value) => COST_ORDER.includes(value.cost)
    && EXECUTION_OWNER_ORDER.includes(value.executionOwner)
    && Array.isArray(value.platforms)
    && value.platforms.length > 0
    && Array.isArray(value.resourceLocks)
    && Array.isArray(value.tiers)
    && Array.isArray(value.ciProfiles)
    && value.ciProfiles.length > 0);
  return {
    domains: sortedUnique([...(left.domains || []), ...(right.domains || [])]),
    cost: costs.length === 0
      ? "unclassified"
      : COST_ORDER[Math.max(...costs.map((cost) => COST_ORDER.indexOf(cost)))],
    executionOwner: restrictiveOwner(left.executionOwner, right.executionOwner),
    platforms: constrainedPlatforms(left.platforms, right.platforms),
    resourceLocks: sortedUnique([...(left.resourceLocks || []), ...(right.resourceLocks || [])]),
    tiers: sortedUnique([...(left.tiers || []), ...(right.tiers || [])]),
    ciProfiles: sortedUnique([...(left.ciProfiles || []), ...(right.ciProfiles || [])]),
    metadataComplete,
  };
}

function conflictingField(left, right) {
  for (const field of ["runner", "argv", "executionOwner", "platforms", "resourceLocks"]) {
    if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) return field;
  }
  return null;
}

function isTargetlessTestLeaf(entry) {
  if (!new Set(["node-test", "playwright", "python-unittest", "python-pytest"]).has(entry.runner)) {
    return false;
  }
  return (entry.files || []).length === 0
    && (entry.modules || []).length === 0
    && (entry.specs || []).length === 0;
}

function buildVerificationSelectionPlanInternal(catalog, commandRefs, {
  platform,
  allowUnclassified = false,
} = {}) {
  if (!Array.isArray(commandRefs)) throw new TypeError("verification-plan-invalid-command-refs");
  const byId = catalogEntries(catalog);
  const expanded = [];
  const visit = (id, forwardedArgs, stack, inheritedMetadata = {}) => {
    const entry = byId.get(id);
    if (!entry) throw new Error(`verification-plan-unresolved-ref:${id}`);
    const cycleAt = stack.indexOf(id);
    if (cycleAt !== -1) throw new Error(`verification-plan-cycle:${[...stack.slice(cycleAt), id].join("->")}`);
    if (entry.kind === "suite") {
      if (!Array.isArray(entry.refs)) throw new TypeError(`verification-plan-invalid-suite:${id}`);
      if (entry.refs.length === 0) throw new Error(`verification-plan-empty-suite:${id}`);
      if (forwardedArgs.length > 0 && entry.refs.length > 1) {
        throw new Error(`verification-plan-ambiguous-suite-args:${id}`);
      }
      const nextStack = [...stack, id];
      const suiteMetadata = mergeExecutionMetadata(inheritedMetadata, entry);
      for (const ref of entry.refs) {
        const normalizedRef = typeof ref === "string" ? { id: ref, args: [] } : ref;
        if (!normalizedRef?.id || !Array.isArray(normalizedRef.args || [])) {
          throw new TypeError(`verification-plan-invalid-ref:${id}`);
        }
        visit(normalizedRef.id, [...(normalizedRef.args || []), ...forwardedArgs], nextStack, suiteMetadata);
      }
      return;
    }
    const metadata = mergeExecutionMetadata(inheritedMetadata, entry);
    if (!metadata.metadataComplete && !allowUnclassified) {
      throw new Error(`verification-plan-unclassified-leaf:${id}`);
    }
    if (isTargetlessTestLeaf(entry)) {
      throw new Error(`verification-plan-targetless-leaf:${id}:${entry.discovery?.kind || "unknown"}`);
    }
    if (metadata.platforms.length === 0) throw new Error(`verification-plan-empty-platforms:${id}`);
    if (platform && !metadata.platforms.includes("all") && !metadata.platforms.includes(platform)) {
      throw new Error(`verification-plan-platform-mismatch:${id}:${platform}`);
    }
    expanded.push({ entry: { ...entry, ...metadata }, forwardedArgs });
  };
  for (const commandRef of commandRefs) visit(commandRef, [], []);

  const claimedTargets = new Map();
  const executions = [];
  for (const { entry, forwardedArgs } of expanded) {
    const comparable = comparableLeaf(entry, forwardedArgs);
    const leafKeys = [];
    for (const target of leafTargets(entry)) {
      const displayKey = `${comparable.runner}:${target.display}`;
      const existing = claimedTargets.get(target.collisionKey);
      if (existing) {
        const conflict = conflictingField(existing.comparable, comparable);
        if (conflict) throw new Error(`verification-plan-leaf-conflict:${existing.displayKey}:${conflict}`);
        throw new Error(`verification-plan-duplicate-leaf:${existing.displayKey}`);
      }
      claimedTargets.set(target.collisionKey, { comparable, displayKey });
      leafKeys.push(displayKey);
    }
    executions.push({
      id: entry.id,
      command: entry.command,
      executable: entry.executable,
      argv: [...(entry.argv || [])],
      forwardedArgs: [...forwardedArgs],
      effectiveArgv: [...(entry.argv || []), ...forwardedArgs],
      runner: comparable.runner,
      files: [...(entry.files || [])],
      modules: [...(entry.modules || [])],
      specs: [...(entry.specs || [])],
      domains: sortedUnique(entry.domains),
      cost: entry.cost || "contract",
      executionOwner: comparable.executionOwner,
      platforms: comparable.platforms,
      resourceLocks: comparable.resourceLocks,
      tiers: sortedUnique(entry.tiers),
      ciProfiles: sortedUnique(entry.ciProfiles),
      leafKeys: leafKeys.sort(),
    });
  }
  executions.sort((left, right) => compareText(left.leafKeys[0], right.leafKeys[0]) || compareText(left.id, right.id));
  const lockGroups = new Map();
  for (const execution of executions) {
    const key = JSON.stringify(execution.resourceLocks);
    if (!lockGroups.has(key)) lockGroups.set(key, { resourceLocks: execution.resourceLocks, executionIds: [] });
    lockGroups.get(key).executionIds.push(execution.id);
  }
  const resourceLockGroups = [...lockGroups.values()].sort((left, right) => {
    if (left.resourceLocks.length !== right.resourceLocks.length) return left.resourceLocks.length - right.resourceLocks.length;
    return compareText(JSON.stringify(left.resourceLocks), JSON.stringify(right.resourceLocks));
  });
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: "verification-selection-plan",
    selectedCommandRefs: [...commandRefs].sort(compareText),
    normalizedLeaves: executions.flatMap((entry) => entry.leafKeys).sort(),
    executions,
    resourceLockGroups,
  };
}

/** Expand selected suites into a stable, fail-closed execution plan. */
export function buildVerificationSelectionPlan(catalog, commandRefs, { platform } = {}) {
  return buildVerificationSelectionPlanInternal(catalog, commandRefs, { platform });
}

function normalizeScripts(scripts) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new TypeError("script-portfolio-invalid-scripts");
  }
  return Object.fromEntries(Object.entries(scripts).map(([name, command]) => {
    if (!String(name).trim()) {
      throw new TypeError("script-portfolio-invalid-name");
    }
    if (typeof command !== "string") {
      throw new TypeError(`script-portfolio-invalid-command:${name}`);
    }
    if (!command.trim()) {
      throw new TypeError(`script-portfolio-blank-command:${name}`);
    }
    return [String(name), command];
  }));
}

export function buildScriptPortfolio(scripts, {
  supersession = VERIFICATION_COMMAND_SUPERSESSION,
} = {}) {
  const normalizedScripts = normalizeScripts(scripts);
  const names = Object.keys(normalizedScripts).sort();
  const canonical = new Set(CANONICAL_VERIFICATION_ENTRYPOINTS);
  const supersessionPlan = buildCommandSupersessionPlan(names, { supersession });
  const supersededBy = new Map(supersessionPlan.supersededCommands.map((entry) => [
    entry.commandRef,
    entry.supersededBy,
  ]));
  const entries = names.map((name) => {
    if (canonical.has(name)) {
      return { name, command: normalizedScripts[name], classification: "canonical" };
    }
    const superseder = supersededBy.get(name);
    if (superseder) {
      return {
        name,
        command: normalizedScripts[name],
        classification: "superseded",
        supersededBy: superseder,
      };
    }
    return { name, command: normalizedScripts[name], classification: "internal" };
  });
  const missingCanonicalEntrypoints = CANONICAL_VERIFICATION_ENTRYPOINTS.filter(
    (name) => !Object.hasOwn(normalizedScripts, name),
  );
  const counts = Object.fromEntries(CLASSIFICATIONS.map((classification) => [
    classification,
    entries.filter((entry) => entry.classification === classification).length,
  ]));
  return {
    schemaVersion: SCRIPT_PORTFOLIO_SCHEMA_VERSION,
    kind: "verification-script-portfolio",
    canonicalEntrypoints: [...CANONICAL_VERIFICATION_ENTRYPOINTS],
    missingCanonicalEntrypoints,
    summary: {
      total: entries.length,
      ...counts,
      complete: missingCanonicalEntrypoints.length === 0,
    },
    scripts: entries,
  };
}

export function readPackageScriptPortfolio(packagePath = path.resolve("package.json"), options = {}) {
  const resolvedPath = path.resolve(packagePath);
  const packageJson = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  return buildScriptPortfolio(packageJson.scripts || {}, options);
}

export function formatScriptPortfolioJson(portfolio) {
  return `${JSON.stringify(portfolio, null, 2)}\n`;
}

export function formatScriptPortfolioSummary(portfolio) {
  const { summary, missingCanonicalEntrypoints } = portfolio;
  const missing = missingCanonicalEntrypoints.length > 0
    ? missingCanonicalEntrypoints.join(",")
    : "none";
  return [
    `scripts=${summary.total}`,
    `canonical=${summary.canonical}`,
    `internal=${summary.internal}`,
    `superseded=${summary.superseded}`,
    `complete=${summary.complete}`,
    `missingCanonical=${missing}`,
  ].join(" ") + "\n";
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function formatScriptPortfolioMarkdown(portfolio) {
  const lines = [
    "# Verification Script Portfolio",
    "",
    `- Total: ${portfolio.summary.total}`,
    `- Canonical: ${portfolio.summary.canonical}`,
    `- Internal: ${portfolio.summary.internal}`,
    `- Superseded: ${portfolio.summary.superseded}`,
    `- Complete: ${portfolio.summary.complete}`,
    `- Missing canonical: ${portfolio.missingCanonicalEntrypoints.join(", ") || "none"}`,
    "",
    "| Script | Classification | Superseded by | Command |",
    "| --- | --- | --- | --- |",
  ];
  for (const entry of portfolio.scripts) {
    lines.push(`| ${markdownCell(entry.name)} | ${entry.classification} | ${markdownCell(entry.supersededBy || "")} | ${markdownCell(entry.command)} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function parseScriptPortfolioArgs(argv) {
  const args = [...argv];
  const action = args.shift() || "list";
  if (!new Set(["list", "check"]).has(action)) {
    throw new Error(`script-portfolio-unknown-action:${action}`);
  }
  let format = "summary";
  let packagePath = path.resolve("package.json");
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--format") {
      if (args.length === 0) throw new Error("script-portfolio-missing-value:--format");
      format = args.shift();
      continue;
    }
    if (arg === "--package") {
      if (args.length === 0) throw new Error("script-portfolio-missing-value:--package");
      packagePath = path.resolve(args.shift());
      continue;
    }
    throw new Error(`script-portfolio-unknown-argument:${arg}`);
  }
  if (!new Set(["json", "markdown", "summary"]).has(format)) {
    throw new Error(`script-portfolio-unknown-format:${format}`);
  }
  return { action, format, packagePath };
}

export function runScriptPortfolioCli(argv, {
  stdout = process.stdout,
  verificationRecords = VERIFICATION_DOMAINS,
} = {}) {
  const options = parseScriptPortfolioArgs(argv);
  const portfolio = readPackageScriptPortfolio(options.packagePath);
  const formatters = {
    json: formatScriptPortfolioJson,
    markdown: formatScriptPortfolioMarkdown,
    summary: formatScriptPortfolioSummary,
  };
  stdout.write(formatters[options.format](portfolio));
  if (options.action !== "check") return 0;
  if (!portfolio.summary.complete) return 1;
  if (options.packagePath !== path.resolve("package.json")) return 0;
  const packageJson = JSON.parse(fs.readFileSync(options.packagePath, "utf8"));
  const packageScripts = packageJson.scripts || {};
  const catalog = buildVerificationCatalog({ packageScripts, records: verificationRecords });
  const consistency = checkVerificationCatalogConsistency(catalog, {
    packageScripts,
    records: verificationRecords,
  });
  return consistency.consistent ? 0 : 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    process.exitCode = runScriptPortfolioCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error?.message || error}\n`);
    process.exitCode = 2;
  }
}
