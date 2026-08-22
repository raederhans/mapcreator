import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCommandSupersessionPlan,
  VERIFICATION_COMMAND_SUPERSESSION,
} from "./command_supersession.mjs";
import {
  VERIFICATION_DOMAINS,
  VERIFICATION_ESTIMATE_POLICY,
} from "./verification_domains.mjs";
import {
  buildRouteIndex,
  reconcileVerificationRouteAuthority,
} from "../test_route_registry.mjs";
import { buildP4PhaseVerificationPlan } from "../run_p4_phase_verification.mjs";
import { resolveP4StateWriterPolicyRun } from "../run_p4_state_writer_policy_tests.mjs";

export const SCRIPT_PORTFOLIO_SCHEMA_VERSION = 1;
export const VERIFICATION_CATALOG_SCHEMA_VERSION = 1;
export const VERIFICATION_CATALOG_KIND = "verification-test-catalog";
export const PREPARED_VERIFICATION_CATALOG_KIND = "prepared-verification-test-catalog";
export const VERIFICATION_TIER_ENTRYPOINTS = Object.freeze([
  Object.freeze({ tier: 0, id: "edit", commandRef: "verify:edit", executionScope: "child-safe" }),
  Object.freeze({ tier: 1, id: "impact", commandRef: "verify:impact", executionScope: "child-safe" }),
  Object.freeze({ tier: 2, id: "pr", commandRef: "verify:pr", executionScope: "pr" }),
  Object.freeze({ tier: 3, id: "nightly", commandRef: "verify:nightly", executionScope: "nightly" }),
  Object.freeze({ tier: 4, id: "release", commandRef: "verify:release", executionScope: "release" }),
]);
export const VERIFICATION_PRODUCT_JOURNEY_ENTRYPOINTS = Object.freeze([
  Object.freeze({ id: "demo", commandRef: "verify:demo", consumer: "pr-verify-demo" }),
]);
export const CANONICAL_VERIFICATION_ENTRYPOINTS = Object.freeze([
  ...VERIFICATION_TIER_ENTRYPOINTS.map((entry) => entry.commandRef),
  ...VERIFICATION_PRODUCT_JOURNEY_ENTRYPOINTS.map((entry) => entry.commandRef),
]);

const CLASSIFICATIONS = Object.freeze(["canonical", "internal", "superseded"]);
const COST_ORDER = Object.freeze(["fast", "contract", "heavy"]);
const EXECUTION_OWNER_ORDER = Object.freeze(["child-safe", "main-thread", "ci-only"]);
const DEFAULT_EXECUTION_MAX_LEAVES = 64;
const DEFAULT_WINDOWS_ARGV_BYTES = 30_000;
const DEFAULT_POSIX_ARGV_BYTES = 131_072;
const ENTRYPOINT_POLICY_BY_DEPTH = Object.freeze({
  local: Object.freeze(["edit", "impact", "pr"]),
  pr: Object.freeze(["pr"]),
  nightly: Object.freeze(["nightly"]),
  release: Object.freeze(["release"]),
});

function sortedUnique(values) {
  return [...new Set((values || []).filter((value) => value !== undefined && value !== null).map(String))].sort();
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertEntrypointPolicy(commandRef, entry) {
  const policy = entry?.entrypointPolicy;
  const expectedEntrypoints = ENTRYPOINT_POLICY_BY_DEPTH[policy?.minimumDepth];
  const projection = policy?.localProjection;
  const validPlannerDisposition = policy?.plannerDisposition === "planned"
    ? policy.blockedReason === null
    : policy?.plannerDisposition === "blocked"
      && typeof policy.blockedReason === "string"
      && policy.blockedReason.length > 0;
  const validProjection = projection === null || (
    policy?.minimumDepth === "local"
    && projection?.mode === "indivisible"
    && projection?.proof === "canonical-local-leaf-equivalence"
  );
  const validTarget = policy?.minimumDepth === "release"
    ? policy?.executionTarget === "deployed-target"
    : entry?.executionOwner === "child-safe"
      ? policy?.executionTarget === "child-safe"
      : ["main-thread", "ci-only"].includes(policy?.executionTarget);
  if (!policy
    || policy.schemaVersion !== 1
    || !expectedEntrypoints
    || JSON.stringify(policy.eligibleEntrypoints) !== JSON.stringify(expectedEntrypoints)
    || !validPlannerDisposition
    || !validTarget
    || !validProjection
    || (policy.minimumDepth === "local" && policy.deferredReason !== null)
    || (policy.minimumDepth !== "local" && policy.deferredReason !== `requires-${policy.minimumDepth}-verification`)
    || (policy.minimumDepth === "local"
      && (entry.executionOwner !== "child-safe" || entry.cost === "heavy" || entry.resourceLocks.length > 0))) {
    throw new Error(`verification-plan-authority-gap:${commandRef}:entrypointPolicy`);
  }
}

function catalogIntegrityPayload(catalog) {
  return JSON.stringify({
    schemaVersion: catalog?.schemaVersion,
    kind: catalog?.kind,
    sourceMode: catalog?.sourceMode,
    identity: catalog?.identity,
    authority: catalog?.authority,
    estimatePolicy: catalog?.estimatePolicy,
    selectorCommandRefs: catalog?.selectorCommandRefs,
    entries: catalog?.entries,
  });
}

function sourceIntegrityForCatalog(catalog) {
  return {
    algorithm: "sha256",
    digest: createHash("sha256").update(catalogIntegrityPayload(catalog)).digest("hex"),
  };
}

export function sealVerificationCatalog(catalog) {
  const sealedCatalog = { ...catalog };
  delete sealedCatalog.sourceIntegrity;
  return { ...sealedCatalog, sourceIntegrity: sourceIntegrityForCatalog(sealedCatalog) };
}

function assertCatalogAuthorityCompleteness(authority) {
  if (!Array.isArray(authority)) throw new Error("verification-plan-authority-gap:<catalog>:authority");
  for (const entry of authority) {
    const commandRef = String(entry?.commandRef || "<unknown>");
    for (const field of [
      "routeIds",
      "safetyContributorRouteIds",
      "sourceRefs",
      "domains",
      "ownerHints",
      "tiers",
      "ciProfiles",
      "platforms",
    ]) {
      if (!Array.isArray(entry?.[field]) || entry[field].length === 0) {
        throw new Error(`verification-plan-authority-gap:${commandRef}:${field}`);
      }
    }
    if (!COST_ORDER.includes(entry?.cost)) {
      throw new Error(`verification-plan-authority-gap:${commandRef}:cost`);
    }
    if (!EXECUTION_OWNER_ORDER.includes(entry?.executionOwner)) {
      throw new Error(`verification-plan-authority-gap:${commandRef}:executionOwner`);
    }
    if (!Object.hasOwn(entry, "resourceLocks") || !Array.isArray(entry.resourceLocks)) {
      throw new Error(`verification-plan-authority-gap:${commandRef}:resourceLocks`);
    }
    assertEntrypointPolicy(commandRef, entry);
    const presenceFields = [
      "sourceRefs",
      "domains",
      "ownerHints",
      "tiers",
      "costs",
      "resourceLocks",
      "executionOwners",
      "ciProfiles",
      "platforms",
    ];
    if (!entry.presence || presenceFields.some((field) => typeof entry.presence[field] !== "boolean")) {
      throw new Error(`verification-plan-authority-gap:${commandRef}:presence`);
    }
    if (entry.presence.resourceLocks !== true) {
      throw new Error(`verification-plan-authority-gap:${commandRef}:resourceLocks`);
    }
  }
}

export function assertVerificationEstimatePolicy(policy) {
  if (!policy || typeof policy !== "object") {
    throw new Error("verification-plan-estimate-policy-missing");
  }
  if (policy.schemaVersion !== 1
    || policy.kind !== "verification-estimate-policy"
    || policy.aggregation !== "sum-process-group-base-plus-leaf-scale"
    || !policy.costClasses
    || typeof policy.costClasses !== "object") {
    throw new Error("verification-plan-estimate-policy-unknown-authority");
  }
  for (const cost of COST_ORDER) {
    const costClass = policy.costClasses[cost];
    if (!costClass) throw new Error(`verification-plan-estimate-policy-unknown:${cost}`);
    for (const field of [
      "groupBaseRuntimeSeconds",
      "perLeafRuntimeSeconds",
      "groupBaseCostUnits",
      "perLeafCostUnits",
    ]) {
      if (!Number.isFinite(costClass[field]) || costClass[field] < 0) {
        throw new Error(`verification-plan-estimate-policy-invalid:${cost}:${field}`);
      }
    }
    if (costClass.perLeafRuntimeSeconds === 0 || costClass.perLeafCostUnits === 0) {
      throw new Error(`verification-plan-estimate-policy-unscaled:${cost}`);
    }
  }
  return policy;
}

function assertCatalogSourceIntegrity(catalog, { allowUnverifiedCatalog = false } = {}) {
  if (allowUnverifiedCatalog) return;
  if (!catalog?.sourceIntegrity?.digest || catalog.sourceIntegrity.algorithm !== "sha256") {
    throw new Error("verification-plan-unverified-catalog");
  }
  if (catalog?.schemaVersion !== VERIFICATION_CATALOG_SCHEMA_VERSION || catalog?.kind !== VERIFICATION_CATALOG_KIND) {
    throw new Error(`verification-plan-catalog-identity:${String(catalog?.schemaVersion)}:${String(catalog?.kind)}`);
  }
  assertCatalogAuthorityCompleteness(catalog?.authority);
  assertVerificationEstimatePolicy(catalog?.estimatePolicy);
  const actual = sourceIntegrityForCatalog(catalog);
  if (actual.digest !== catalog.sourceIntegrity.digest) {
    throw new Error("verification-plan-catalog-source-drift");
  }
}

export function normalizeVerificationPath(value, {
  repoRoot = process.cwd(),
  platform = process.platform,
} = {}) {
  const slashPath = String(value).replaceAll("\\", "/");
  const repoSlashPath = String(repoRoot || "").replaceAll("\\", "/");
  const unc = slashPath.startsWith("//");
  const repoUnc = repoSlashPath.startsWith("//");
  const normalized = unc
    ? `//${path.posix.normalize(slashPath.slice(2)).replace(/^\/+/, "")}`
    : path.posix.normalize(slashPath);
  const normalizedRepo = (repoUnc
    ? `//${path.posix.normalize(repoSlashPath.slice(2)).replace(/^\/+/, "")}`
    : path.posix.normalize(repoSlashPath)).replace(/\/$/, "");
  const windowsIdentity = platform === "win32";
  const comparable = windowsIdentity ? normalized.toLowerCase() : normalized;
  const comparableRepo = windowsIdentity ? normalizedRepo.toLowerCase() : normalizedRepo;
  const isAbsolute = unc || /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
  const underRepo = isAbsolute
    && comparableRepo
    && (comparable === comparableRepo || comparable.startsWith(`${comparableRepo}/`));
  const canonical = underRepo ? normalized.slice(normalizedRepo.length).replace(/^\/+/, "") : normalized;
  const withoutDot = canonical.replace(/^\.\//, "");
  return windowsIdentity ? withoutDot.toLowerCase() : withoutDot.replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`);
}

function assertSupportedShellOperators(command, id) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const next = command[index + 1];
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
    const commandSeparatorControl = {
      "\0": "NUL",
      "\r": "CR",
      "\n": "LF",
      "\v": "VT",
      "\f": "FF",
      "\u0085": "NEL",
      "\u2028": "LS",
      "\u2029": "PS",
    }[character];
    if (commandSeparatorControl) {
      throw new Error(`verification-catalog-unsupported-shell-operator:${id}:${commandSeparatorControl}`);
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "&" && next === "&") {
      index += 1;
      continue;
    }
    const operator = character === "|" && next === "|" ? "||" : character;
    if (operator === "||" || ["|", "&", ";", "<", ">"].includes(operator)) {
      throw new Error(`verification-catalog-unsupported-shell-operator:${id}:${operator}`);
    }
  }
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

function partitionRunnerTargets(tokens, targetPredicate, valueOptions, pathOptions = {}) {
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
    if (targetPredicate(token)) targets.push(normalizeVerificationPath(token, pathOptions));
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

function nodeOrchestrationCoverage(nodeEntrypoint, runnerArgs, pathOptions) {
  if (nodeEntrypoint.endsWith("tools/run_p4_phase_verification.mjs")) {
    const phaseIndex = runnerArgs.indexOf("--phase");
    const phase = phaseIndex === -1 ? null : runnerArgs[phaseIndex + 1];
    if (!phase) return {};
    const commands = buildP4PhaseVerificationPlan({ phase }).commands;
    const coverageRefs = commands.map((command) => parseNpmRunReference(command)?.id).filter(Boolean);
    const coverageCommands = commands.filter((command) => !parseNpmRunReference(command));
    return { coverageRefs, coverageCommands };
  }
  if (nodeEntrypoint.endsWith("tools/run_p4_state_writer_policy_tests.mjs")) {
    return {
      coverageFiles: resolveP4StateWriterPolicyRun(runnerArgs).testArguments
        .map((value) => normalizeVerificationPath(value, pathOptions)),
    };
  }
  return {};
}

function parseLeafDefinition(id, command, metadata, pathOptions = {}) {
  const argv = tokenizeCommand(command);
  const executable = argv[0] || "";
  const args = argv.slice(1);
  const { discoverySpecs = [], ...executionMetadata } = metadata;
  const leafMetadata = {
    ...executionMetadata,
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
      pathOptions,
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
      pathOptions,
    );
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "node-test",
      files, modules: [], specs: [], runnerArgs, ...leafMetadata,
      ...(files.length === 0 ? { targetless: true, discovery: { kind: "node-test-default" } } : {}),
    };
  }
  if (/^(?:node|node\.exe)$/i.test(executable) && args[0] === "--check") {
    const files = args.slice(1).map((value) => normalizeVerificationPath(value, pathOptions));
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "node-check",
      files, modules: [], specs: [], runnerArgs: [], ...leafMetadata,
      ...(files.length === 0 ? { targetless: true, discovery: { kind: "node-check-default" } } : {}),
    };
  }
  const nodeEntrypoint = /^(?:node|node\.exe)$/i.test(executable)
    ? normalizeVerificationPath(args[0] || "", pathOptions)
    : "";
  if (nodeEntrypoint.endsWith("tools/e2e_layering.mjs")
    && new Set(["run", "run-spec", "run-domain", "run-owner"]).has(args[1])) {
    const specs = args[1] === "run-spec" && args[2]
      ? [normalizeVerificationPath(args[2], pathOptions)]
      : sortedUnique(discoverySpecs.map((value) => normalizeVerificationPath(value, pathOptions)));
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "playwright",
      files: [], modules: [], specs, runnerArgs: ["run-spec"], executionMode: "e2e-layering",
      ...leafMetadata,
      ...(specs.length === 0 ? { targetless: true, discovery: { kind: "e2e-route-authority" } } : {}),
    };
  }
  if (/^(?:node|node\.exe)$/i.test(executable) && isTestPath(args[0] || "")) {
    const runnerArgs = args.slice(1);
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "node-script",
      files: [normalizeVerificationPath(args[0], pathOptions)], modules: [], specs: [],
      runnerArgs, ...nodeOrchestrationCoverage(nodeEntrypoint, runnerArgs, pathOptions), ...leafMetadata,
    };
  }
  const npmPython = executable === "npm" && args[0] === "run" && args[1] === "python";
  const nodePython = /^(?:node|node\.exe)$/i.test(executable)
    && normalizeVerificationPath(args[0] || "", pathOptions).endsWith("tools/run_python.mjs");
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
        files: [normalizeVerificationPath(path.posix.join(normalizeVerificationPath(startDirectory, pathOptions), pattern), pathOptions)],
        modules: [], specs: [], runnerArgs: [...unittestArgs], ...leafMetadata,
      };
    }
    const { targets: positionalTargets, runnerArgs } = partitionRunnerTargets(
      unittestArgs,
      (arg) => !arg.startsWith("-") && !arg.includes("="),
      new Set(["-k", "--durations"]),
      pathOptions,
    );
    const files = positionalTargets.filter(isPythonTestPath).map((value) => normalizeVerificationPath(value, pathOptions));
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
    const files = pytestArgs.filter(isPythonTestPath).map((value) => normalizeVerificationPath(value, pathOptions));
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "python-pytest",
      files, modules: [], specs: [], runnerArgs: pytestArgs.filter((arg) => !isPythonTestPath(arg)), ...leafMetadata,
      ...(files.length === 0 ? { targetless: true, discovery: { kind: "python-pytest-default" } } : {}),
    };
  }
  if (pythonArgs.length > 0 && isPythonTestPath(pythonArgs[0])) {
    return {
      id, kind: "leaf", command, executable, argv: args, runner: "python-script",
      files: [normalizeVerificationPath(pythonArgs[0], pathOptions)], modules: [], specs: [],
      runnerArgs: pythonArgs.slice(1), ...leafMetadata,
    };
  }
  return {
    id, kind: "leaf", command, executable, argv: args, runner: "opaque",
    files: [], modules: [], specs: [], runnerArgs: [...args], ...leafMetadata,
  };
}

function catalogAuthority({ records = [], selectorRoutes = [], authority } = {}) {
  if (authority !== undefined) {
    if (!Array.isArray(authority)) throw new TypeError("verification-catalog-invalid-authority");
    const provided = authority.map((entry) => ({ ...entry })).sort((left, right) => compareText(left.commandRef, right.commandRef));
    assertCatalogAuthorityCompleteness(provided);
    return provided;
  }
  const normalizedRecords = records.map((record, index) => ({
    ...record,
    id: record?.id || `verification-record:${String(index + 1).padStart(4, "0")}:${record?.commandRef || "<unknown>"}`,
    authoritySource: "verification-record",
  }));
  const normalizedRoutes = selectorRoutes.map((route) => ({
    ...route,
    authoritySource: "selector-route",
  }));
  const reconciled = reconcileVerificationRouteAuthority([...normalizedRecords, ...normalizedRoutes]);
  assertCatalogAuthorityCompleteness(reconciled);
  return reconciled;
}

function selectorDiscoverySpecs(command, selectorRoutes) {
  const tokens = tokenizeCommand(command);
  const entrypointIndex = tokens.findIndex((token) => normalizeVerificationPath(token)
    .endsWith("tools/e2e_layering.mjs"));
  const mode = entrypointIndex === -1 ? "" : tokens[entrypointIndex + 1];
  const selector = entrypointIndex === -1 ? "" : tokens[entrypointIndex + 2];
  if (!new Set(["run", "run-domain", "run-owner"]).has(mode) || !selector) return [];
  return sortedUnique(selectorRoutes
    .filter((route) => route.id?.startsWith("e2e:"))
    .filter((route) => mode !== "run" || selector === "all" || route.layer === selector)
    .filter((route) => mode !== "run-domain" || route.domain === selector)
    .filter((route) => mode !== "run-owner" || route.ownerHint === selector)
    .flatMap((route) => String(route.sourceRef || "").split(","))
    .filter((sourceRef) => /(?:^|\/)tests\/e2e\/.+\.spec\.js$/i.test(sourceRef)));
}

function authorityMetadata(authorityByCommand, commandRef, command = commandRef, selectorRoutes = []) {
  const authority = authorityByCommand.get(commandRef);
  if (!authority) return commandMetadata([], commandRef);
  return {
    domains: sortedUnique(authority.domains),
    cost: authority.cost || "unclassified",
    executionOwner: authority.executionOwner || "unclassified",
    platforms: sortedUnique(authority.platforms || ["all"]),
    resourceLocks: sortedUnique(authority.resourceLocks),
    tiers: sortedUnique(authority.tiers),
    ciProfiles: sortedUnique(authority.ciProfiles),
    discoverySpecs: sortedUnique([
      ...authority.sourceRefs,
      ...selectorDiscoverySpecs(command, selectorRoutes),
    ]).filter((sourceRef) => /(?:^|\/)tests\/e2e\/.+\.spec\.js$/i.test(sourceRef)),
    metadataComplete: authority.metadataComplete === true,
  };
}

/** Build the canonical verification catalog from one reconciled route authority. */
export function buildVerificationCatalog(input, options = {}) {
  const packageScripts = input?.packageScripts || input;
  const records = input?.packageScripts ? input.records || [] : options.records || [];
  const selectorRoutes = input?.packageScripts ? input.selectorRoutes || [] : options.selectorRoutes || [];
  const authority = catalogAuthority({
    records,
    selectorRoutes,
    authority: input?.packageScripts ? input.authority : options.authority,
  });
  const repoRoot = input?.packageScripts ? input.repoRoot || process.cwd() : options.repoRoot || process.cwd();
  const platform = input?.packageScripts ? input.platform || process.platform : options.platform || process.platform;
  const estimatePolicy = input?.packageScripts
    ? input.estimatePolicy || VERIFICATION_ESTIMATE_POLICY
    : options.estimatePolicy || VERIFICATION_ESTIMATE_POLICY;
  assertVerificationEstimatePolicy(estimatePolicy);
  const pathOptions = { repoRoot, platform };
  const authorityByCommand = new Map(authority.map((entry) => [entry.commandRef, entry]));
  const scripts = normalizeScripts(packageScripts);
  const entries = [];
  for (const id of Object.keys(scripts).sort()) {
    const command = scripts[id];
    assertSupportedShellOperators(command, id);
    const parts = splitCommandChain(command);
    if (parts.some((part) => !part)) throw new Error(`verification-catalog-empty-command-segment:${id}`);
    const metadata = authorityMetadata(authorityByCommand, id, command, selectorRoutes);
    if (parts.length > 1) {
      const refs = parts.map((part, index) => {
        const inlineId = `${id}#inline:${String(index + 1).padStart(2, "0")}`;
        const parsedPart = parseLeafDefinition(inlineId, part, commandMetadata([], inlineId), pathOptions);
        const npmRef = parseNpmRunReference(part);
        if (parsedPart.runner === "opaque" && npmRef) return { ...npmRef, sourceOrder: index };
        entries.push({ ...parsedPart, sourceKind: "inline", sourceScript: id, sourceOrder: index });
        return { id: inlineId, args: [], sourceOrder: index };
      });
      entries.push({ id, kind: "suite", command, refs, files: [], modules: [], specs: [], ...metadata });
      continue;
    }
    const parsedLeaf = parseLeafDefinition(id, command, metadata, pathOptions);
    const npmRef = parseNpmRunReference(command);
    if (parsedLeaf.runner === "opaque" && npmRef) {
      entries.push({
        id,
        kind: "suite",
        command,
        refs: [{ ...npmRef, sourceOrder: 0 }],
        files: [],
        modules: [],
        specs: [],
        ...metadata,
      });
      continue;
    }
    entries.push(parsedLeaf);
  }
  const scriptIds = new Set(Object.keys(scripts));
  const directRefs = authority
    .map((entry) => entry.commandRef)
    .filter((commandRef) => commandRef && !scriptIds.has(commandRef) && /\s/.test(commandRef));
  for (const commandRef of directRefs) {
    assertSupportedShellOperators(commandRef, commandRef);
    entries.push({
      ...parseLeafDefinition(
        commandRef,
        commandRef,
        authorityMetadata(authorityByCommand, commandRef, commandRef, selectorRoutes),
        pathOptions,
      ),
      sourceKind: "direct-authority",
    });
  }
  entries.sort((left, right) => compareText(left.id, right.id));
  catalogEntries(entries);
  const selectorCommandRefs = sortedUnique(input?.selectorCommandRefs
    ?? (selectorRoutes.length > 0
      ? selectorRoutes.map((route) => route.commandRef)
      : authority.map((entry) => entry.commandRef)));
  const catalog = {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: VERIFICATION_CATALOG_KIND,
    sourceMode: input?.sourceMode || "fixture",
    identity: { repoRoot: normalizeVerificationPath(repoRoot, { repoRoot: "", platform }), platform },
    authority,
    estimatePolicy: structuredClone(estimatePolicy),
    selectorCommandRefs,
    entries,
  };
  return sealVerificationCatalog(catalog);
}

/** Build the repository catalog from package scripts, metadata, and every selector route. */
export function buildRepositoryVerificationCatalog({
  packageScripts,
  verificationRecords = VERIFICATION_DOMAINS,
  selectorRoutes = buildRouteIndex(),
  repoRoot = process.cwd(),
  platform = process.platform,
  estimatePolicy = VERIFICATION_ESTIMATE_POLICY,
} = {}) {
  return buildVerificationCatalog({
    packageScripts,
    records: verificationRecords,
    selectorRoutes,
    selectorCommandRefs: selectorRoutes.map((route) => route.commandRef),
    repoRoot,
    platform,
    estimatePolicy,
    sourceMode: "repository",
  });
}

function preparedCatalogSourceIdentity({
  packageScripts,
  verificationRecords,
  selectorRoutes,
  authority,
  repoRoot,
  platform,
  sourceMode,
  estimatePolicy,
}) {
  const payload = JSON.stringify({
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: VERIFICATION_CATALOG_KIND,
    sourceMode,
    repoRoot: normalizeVerificationPath(repoRoot, { repoRoot: "", platform }),
    platform,
    packageScripts,
    verificationRecords,
    selectorRoutes,
    authority,
    estimatePolicy,
  });
  return {
    algorithm: "sha256",
    digest: createHash("sha256").update(payload).digest("hex"),
    sourceMode,
    repoRoot: normalizeVerificationPath(repoRoot, { repoRoot: "", platform }),
    platform,
  };
}

export function prepareVerificationCatalog({
  packageScripts = {},
  verificationRecords = [],
  selectorRoutes = [],
  authority,
  selectorCommandRefs,
  repoRoot = process.cwd(),
  platform = process.platform,
  sourceMode = "fixture",
  estimatePolicy = VERIFICATION_ESTIMATE_POLICY,
  catalogBuilder = buildVerificationCatalog,
  authorityReconciler = reconcileVerificationRouteAuthority,
} = {}) {
  const reconciledAuthority = authority || authorityReconciler([
    ...verificationRecords.map((record, index) => ({
      ...record,
      id: record?.id || `verification-record:${String(index + 1).padStart(4, "0")}:${record?.commandRef || "<unknown>"}`,
      authoritySource: "verification-record",
    })),
    ...selectorRoutes.map((route) => ({ ...route, authoritySource: "selector-route" })),
  ]);
  assertCatalogAuthorityCompleteness(reconciledAuthority);
  const sourceIdentity = preparedCatalogSourceIdentity({
    packageScripts,
    verificationRecords,
    selectorRoutes,
    authority: reconciledAuthority,
    repoRoot,
    platform,
    sourceMode,
    estimatePolicy,
  });
  const catalog = catalogBuilder({
    packageScripts,
    authority: reconciledAuthority,
    selectorRoutes,
    selectorCommandRefs: selectorCommandRefs || selectorRoutes.map((route) => route.commandRef),
    repoRoot,
    platform,
    estimatePolicy,
    sourceMode,
  });
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: PREPARED_VERIFICATION_CATALOG_KIND,
    sourceMode,
    sourceIdentity,
    catalogDigest: catalog.sourceIntegrity.digest,
    authority: reconciledAuthority,
    catalog,
    sourceInputs: {
      packageScripts,
      verificationRecords,
      selectorRoutes,
      repoRoot,
      platform,
      estimatePolicy,
      sourceMode,
    },
  };
}

export function prepareRepositoryVerificationCatalog({
  packageScripts,
  verificationRecords = VERIFICATION_DOMAINS,
  selectorRoutes = buildRouteIndex(),
  repoRoot = process.cwd(),
  platform = process.platform,
  estimatePolicy = VERIFICATION_ESTIMATE_POLICY,
  catalogBuilder = buildVerificationCatalog,
  authorityReconciler = reconcileVerificationRouteAuthority,
} = {}) {
  return prepareVerificationCatalog({
    packageScripts,
    verificationRecords,
    selectorRoutes,
    selectorCommandRefs: selectorRoutes.map((route) => route.commandRef),
    repoRoot,
    platform,
    estimatePolicy,
    sourceMode: "repository",
    catalogBuilder,
    authorityReconciler,
  });
}

export function verificationSelectionRootSet(report) {
  return sortedUnique((report?.recommendedCommands || []).map((entry) => entry.commandRef));
}

export function bindSelectionReportToPreparedCatalog(report, preparedCatalog) {
  assertPreparedVerificationCatalog(preparedCatalog);
  return {
    ...report,
    catalogDigest: preparedCatalog.catalogDigest,
    catalogSourceIdentity: structuredClone(preparedCatalog.sourceIdentity),
    selectorRootSet: verificationSelectionRootSet(report),
    routeAuthority: structuredClone(preparedCatalog.authority),
  };
}

export function prepareRepositoryVerificationCatalogBinding(options = {}) {
  const preparedCatalog = prepareRepositoryVerificationCatalog(options);
  return {
    preparedCatalog,
    bindSelectionReport(report) {
      return bindSelectionReportToPreparedCatalog(report, preparedCatalog);
    },
  };
}

export function assertPreparedVerificationCatalog(prepared, catalog = prepared?.catalog) {
  if (!prepared
    || prepared.schemaVersion !== VERIFICATION_CATALOG_SCHEMA_VERSION
    || prepared.kind !== PREPARED_VERIFICATION_CATALOG_KIND
    || prepared.catalog !== catalog
    || prepared.catalogDigest !== catalog?.sourceIntegrity?.digest) {
    throw new Error("verification-plan-invalid-prepared-catalog");
  }
  const expectedIdentity = preparedCatalogSourceIdentity({
    ...prepared.sourceInputs,
    authority: prepared.authority,
  });
  if (expectedIdentity.digest !== prepared.sourceIdentity?.digest) {
    throw new Error("verification-plan-prepared-source-drift");
  }
  assertCatalogSourceIntegrity(catalog);
  return prepared;
}

function assertRepositorySourceConsistency(catalog, sourceInputs) {
  if (catalog?.sourceMode !== "repository") return;
  if (!sourceInputs) throw new Error("verification-plan-missing-source-authority");
  const consistency = checkVerificationCatalogConsistency(catalog, {
    packageScripts: sourceInputs.packageScripts,
    records: sourceInputs.verificationRecords || sourceInputs.records || VERIFICATION_DOMAINS,
    selectorRoutes: sourceInputs.selectorRoutes || buildRouteIndex(),
    repoRoot: sourceInputs.repoRoot || process.cwd(),
    platform: sourceInputs.platform || process.platform,
    estimatePolicy: sourceInputs.estimatePolicy || VERIFICATION_ESTIMATE_POLICY,
    sourceMode: "repository",
  });
  if (!consistency.consistent) {
    const error = new Error("verification-plan-source-authority-drift");
    error.consistency = consistency;
    throw error;
  }
}

/** Mechanically compare a catalog with retained package-script and route-record sources. */
export function checkVerificationCatalogConsistency(catalog, {
  packageScripts = {},
  records = [],
  selectorRoutes = [],
  authority,
  repoRoot = process.cwd(),
  platform = process.platform,
  sourceMode = "fixture",
  estimatePolicy = VERIFICATION_ESTIMATE_POLICY,
} = {}) {
  const byId = catalogEntries(catalog);
  const expectedCatalog = buildVerificationCatalog({
    packageScripts,
    records,
    selectorRoutes,
    authority,
    selectorCommandRefs: selectorRoutes.length > 0 ? selectorRoutes.map((route) => route.commandRef) : undefined,
    repoRoot,
    platform,
    estimatePolicy,
    sourceMode,
  });
  const expectedById = catalogEntries(expectedCatalog);
  const catalogIds = new Set(byId.keys());
  const expectedIds = new Set(expectedById.keys());
  const recordRefs = sortedUnique([
    ...records.map((record) => record?.commandRef || record?.id),
    ...selectorRoutes.map((route) => route?.commandRef),
  ].filter(Boolean));
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
        allowUnverifiedCatalog: true,
      });
    } catch (error) {
      invalidSuitePlans.push({ id: entry.id, error: String(error?.message || error) });
    }
  }
  invalidSuitePlans.sort((left, right) => compareText(left.id, right.id));
  const selectorPlanFailures = [];
  const unclassifiedCatalogEntries = new Set();
  const targetlessDiscoveryEntries = new Set();
  for (const commandRef of expectedCatalog.selectorCommandRefs) {
    try {
      buildVerificationSelectionPlanInternal(catalog, [commandRef], {
        platform,
        allowUnverifiedCatalog: true,
      });
    } catch (error) {
      const message = String(error?.message || error);
      selectorPlanFailures.push({ commandRef, error: message });
      const unclassified = /^verification-plan-unclassified-leaf:(.+)$/.exec(message);
      if (unclassified) unclassifiedCatalogEntries.add(unclassified[1]);
      const targetless = /^verification-plan-targetless-leaf:([^:]+(?:[:][^:]+)*):/.exec(message);
      if (targetless) targetlessDiscoveryEntries.add(targetless[1]);
    }
  }
  selectorPlanFailures.sort((left, right) => compareText(left.commandRef, right.commandRef));
  const supersessionMismatches = [];
  for (const [superseder, coveredCommands] of Object.entries(VERIFICATION_COMMAND_SUPERSESSION)) {
    for (const covered of coveredCommands) {
      if (!byId.has(superseder) || !byId.has(covered)) continue;
      try {
        buildVerificationSelectionPlanInternal(catalog, [superseder, covered], {
          platform,
          allowUnclassified: true,
          allowUnverifiedCatalog: true,
        });
      } catch (error) {
        const message = String(error?.message || error);
        if (message.startsWith("verification-plan-supersession-drift:")) {
          supersessionMismatches.push({ superseder, covered, error: message });
        }
      }
    }
  }
  supersessionMismatches.sort((left, right) => compareText(
    `${left.superseder}\0${left.covered}`,
    `${right.superseder}\0${right.covered}`,
  ));
  const actualAuthority = Array.isArray(catalog?.authority) ? catalog.authority : [];
  const authorityMismatches = JSON.stringify(actualAuthority) === JSON.stringify(expectedCatalog.authority)
    ? []
    : ["authority"];
  const catalogIdentityMismatches = ["schemaVersion", "kind", "sourceMode", "identity", "estimatePolicy", "selectorCommandRefs"]
    .filter((field) => JSON.stringify(catalog?.[field]) !== JSON.stringify(expectedCatalog[field]));
  const expectedSourceIntegrity = sourceIntegrityForCatalog(catalog);
  const sourceIntegrityMismatches = catalog?.sourceIntegrity?.algorithm === "sha256"
    && catalog.sourceIntegrity.digest === expectedSourceIntegrity.digest
    ? []
    : ["sourceIntegrity"];
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: "verification-catalog-consistency",
    consistent: missingCatalogEntries.length === 0
      && orphanCatalogEntries.length === 0
      && unresolvedRecordRefs.length === 0
      && entryMismatches.length === 0
      && unresolvedSuiteRefs.length === 0
      && cyclicSuiteRefs.length === 0
      && invalidSuitePlans.length === 0
      && selectorPlanFailures.length === 0
      && supersessionMismatches.length === 0
      && authorityMismatches.length === 0
      && catalogIdentityMismatches.length === 0
      && sourceIntegrityMismatches.length === 0,
    missingCatalogEntries,
    orphanCatalogEntries,
    unresolvedRecordRefs,
    entryMismatches,
    unresolvedSuiteRefs,
    cyclicSuiteRefs,
    invalidSuitePlans,
    selectorPlanFailures,
    supersessionMismatches,
    authorityMismatches,
    catalogIdentityMismatches,
    sourceIntegrityMismatches,
    unclassifiedCatalogEntries: [...unclassifiedCatalogEntries].sort(compareText),
    targetlessDiscoveryEntries: [...targetlessDiscoveryEntries].sort(compareText),
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

function normalizeModuleIdentity(value, { platform = process.platform } = {}) {
  const moduleName = String(value);
  return platform === "win32" ? moduleName.toLowerCase() : moduleName;
}

function leafTargets(entry, pathOptions = {}) {
  const targets = [
    ...(entry.files || []).map((value) => {
      const normalized = normalizeVerificationPath(value, pathOptions);
      return { collisionKey: `path:${normalized}`, display: normalized };
    }),
    ...(entry.specs || []).map((value) => {
      const normalized = normalizeVerificationPath(value, pathOptions);
      return { collisionKey: `path:${normalized}`, display: normalized };
    }),
    ...(entry.modules || []).map((value) => {
      const normalized = normalizeModuleIdentity(value, pathOptions);
      return { collisionKey: `module:${normalized}`, display: normalized };
    }),
  ];
  if (targets.length > 0) return targets;
  return [{ collisionKey: `opaque:${entry.command || `${entry.executable || ""}\0${(entry.argv || []).join("\0")}`}`, display: entry.id }];
}

function comparableLeaf(entry, forwardedArgs, pathOptions = {}) {
  return {
    runner: entry.runner || "opaque",
    argv: [...(entry.runnerArgs || entry.argv || []), ...forwardedArgs].map((value) => (
      isTestPath(value) || isPythonTestPath(value) ? normalizeVerificationPath(value, pathOptions) : value
    )),
    executionOwner: entry.executionOwner || "unclassified",
    platforms: sortedUnique(entry.platforms || ["all"]),
    resourceLocks: sortedUnique(entry.resourceLocks),
    ciProfiles: sortedUnique(entry.ciProfiles),
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
  for (const field of ["runner", "argv", "executionOwner", "platforms", "resourceLocks", "ciProfiles"]) {
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

function normalizePlanningRoots(commandRefs) {
  if (!Array.isArray(commandRefs)) throw new TypeError("verification-plan-invalid-command-refs");
  const seen = new Set();
  return commandRefs.map((root, inputIndex) => {
    const normalized = typeof root === "string" ? { commandRef: root } : root;
    if (!normalized || typeof normalized.commandRef !== "string" || !normalized.commandRef.trim()) {
      throw new TypeError(`verification-plan-invalid-root:${inputIndex}`);
    }
    const commandRef = normalized.commandRef.trim();
    if (seen.has(commandRef)) throw new Error(`verification-plan-duplicate-root:${commandRef}`);
    seen.add(commandRef);
    return {
      inputIndex,
      commandRef,
      routeIds: sortedUnique(normalized.routeIds),
      safetyContributorRouteIds: sortedUnique(normalized.safetyContributorRouteIds),
      sourceRefs: normalized.sourceRefs === undefined ? undefined : sortedUnique(normalized.sourceRefs),
      domains: normalized.domains === undefined ? undefined : sortedUnique(normalized.domains),
      ownerHints: normalized.ownerHints === undefined ? undefined : sortedUnique(normalized.ownerHints),
      cost: normalized.cost,
      executionOwner: normalized.executionOwner,
      platforms: normalized.platforms === undefined ? undefined : sortedUnique(normalized.platforms),
      resourceLocks: normalized.resourceLocks === undefined ? undefined : sortedUnique(normalized.resourceLocks),
      tiers: normalized.tiers === undefined ? undefined : sortedUnique(normalized.tiers),
      ciProfiles: normalized.ciProfiles === undefined ? undefined : sortedUnique(normalized.ciProfiles),
      executionDisposition: normalized.executionDisposition,
    };
  });
}

function collectSupersessionLeafClaims(byId, rootId, pathOptions) {
  const claims = new Map();
  const recordLeafClaims = (entry, forwardedArgs = []) => {
    const comparable = comparableLeaf(entry, forwardedArgs, pathOptions);
    for (const target of leafTargets(entry, pathOptions)) {
      const claim = {
        target: target.collisionKey,
        runner: comparable.runner,
        argv: comparable.argv,
      };
      claims.set(JSON.stringify(claim), claim);
    }
  };
  const visit = (id, forwardedArgs, stack) => {
    const entry = byId.get(id);
    if (!entry) throw new Error(`verification-plan-unresolved-ref:${id}`);
    const cycleAt = stack.indexOf(id);
    if (cycleAt !== -1) throw new Error(`verification-plan-cycle:${[...stack.slice(cycleAt), id].join("->")}`);
    if (entry.kind === "suite") {
      if (!Array.isArray(entry.refs) || entry.refs.length === 0) {
        throw new Error(`verification-plan-invalid-supersession-suite:${id}`);
      }
      if (forwardedArgs.length > 0 && entry.refs.length > 1) {
        throw new Error(`verification-plan-ambiguous-suite-args:${id}`);
      }
      const refs = entry.refs.map((ref, index) => ({
        ...(typeof ref === "string" ? { id: ref, args: [] } : ref),
        sourceOrder: typeof ref === "object" && Number.isInteger(ref?.sourceOrder) ? ref.sourceOrder : index,
      })).sort((left, right) => left.sourceOrder - right.sourceOrder);
      for (const ref of refs) {
        if (!ref?.id || !Array.isArray(ref.args || [])) throw new TypeError(`verification-plan-invalid-ref:${id}`);
        visit(ref.id, [...(ref.args || []), ...forwardedArgs], [...stack, id]);
      }
      return;
    }
    if ((entry.coverageRefs || []).length > 0 || (entry.coverageCommands || []).length > 0) {
      for (const coveredRef of (entry.coverageRefs || [])) visit(coveredRef, [], [...stack, id]);
      for (const [index, command] of (entry.coverageCommands || []).entries()) {
        const virtualEntry = parseLeafDefinition(
          `${id}#coverage:${String(index + 1).padStart(2, "0")}`,
          command,
          {
            domains: entry.domains,
            cost: entry.cost,
            executionOwner: entry.executionOwner,
            platforms: entry.platforms,
            resourceLocks: entry.resourceLocks,
            tiers: entry.tiers,
            ciProfiles: entry.ciProfiles,
            metadataComplete: entry.metadataComplete,
            discoverySpecs: [],
          },
          pathOptions,
        );
        recordLeafClaims(virtualEntry);
      }
      return;
    }
    if ((entry.coverageFiles || []).length > 0) {
      for (const coverageFile of entry.coverageFiles) {
        const claim = {
          target: `path:${normalizeVerificationPath(coverageFile, pathOptions)}`,
          runner: "node-test",
          argv: [],
        };
        claims.set(JSON.stringify(claim), claim);
      }
      return;
    }
    recordLeafClaims(entry, forwardedArgs);
  };
  visit(rootId, [], []);
  return [...claims.values()];
}

function isArgumentMultisetSubset(subset, superset) {
  const remaining = new Map();
  for (const value of superset) remaining.set(value, (remaining.get(value) || 0) + 1);
  for (const value of subset) {
    const count = remaining.get(value) || 0;
    if (count === 0) return false;
    remaining.set(value, count - 1);
  }
  return true;
}

function supersessionClaimCovered(superseder, covered) {
  if (superseder.target !== covered.target || superseder.runner !== covered.runner) return false;
  if (superseder.runner === "python-script" || superseder.runner === "node-script") {
    return isArgumentMultisetSubset(covered.argv, superseder.argv);
  }
  return JSON.stringify(superseder.argv) === JSON.stringify(covered.argv);
}

function assertSupersessionCoverage(byId, supersededBy, pathOptions) {
  const claimsByRoot = new Map();
  const claimsFor = (rootId) => {
    if (!claimsByRoot.has(rootId)) {
      claimsByRoot.set(rootId, collectSupersessionLeafClaims(byId, rootId, pathOptions));
    }
    return claimsByRoot.get(rootId);
  };
  for (const [covered, superseder] of supersededBy) {
    const coveredClaims = claimsFor(covered);
    const supersederClaims = claimsFor(superseder);
    const missingClaims = coveredClaims.filter((claim) => !supersederClaims.some((candidate) => (
      supersessionClaimCovered(candidate, claim)
    )));
    if (missingClaims.length > 0) {
      const error = new Error(`verification-plan-supersession-drift:${superseder}:${covered}`);
      error.missingClaims = missingClaims;
      throw error;
    }
  }
}

function executionProcessShape(executable, effectiveArgv, platform) {
  if (platform === "win32" && executable === "python") {
    return { executable: process.execPath, effectiveArgv: ["tools/run_python.mjs", ...effectiveArgv] };
  }
  if (platform === "win32" && (executable === "npm" || executable === "npx")) {
    return {
      executable: "cmd.exe",
      effectiveArgv: ["/d", "/s", "/c", executable, ...effectiveArgv],
    };
  }
  return { executable, effectiveArgv };
}

function rebuildLogicalArgv(entry, { files, modules, specs }, forwardedArgs) {
  const argv = [...(entry.argv || [])];
  const withTargets = (markerIndex, targets) => [
    ...argv.slice(0, markerIndex + 1),
    ...targets,
    ...(entry.runnerArgs || []),
    ...forwardedArgs,
  ];
  if (entry.runner === "node-test") return withTargets(argv.indexOf("--test"), files);
  if (entry.runner === "node-check") return withTargets(argv.indexOf("--check"), files);
  if (entry.runner === "python-unittest") {
    const markerIndex = argv.findIndex((value, index) => value === "unittest" && argv[index - 1] === "-m");
    return withTargets(markerIndex, [...files, ...modules]);
  }
  if (entry.runner === "python-pytest") {
    const markerIndex = argv.findIndex((value, index) => value === "pytest" && argv[index - 1] === "-m");
    return withTargets(markerIndex, files);
  }
  if (entry.runner === "playwright" && entry.executionMode !== "e2e-layering") {
    const markerIndex = argv.findIndex((value, index) => value === "test"
      && (index === 0 || /(?:playwright|cli\.js)$/i.test(argv[index - 1])));
    return withTargets(markerIndex, specs);
  }
  return [...argv, ...forwardedArgs];
}

function isOrderedSubset(left, right) {
  let index = 0;
  for (const value of right) {
    if (value === left[index]) index += 1;
  }
  return index === left.length;
}

function playwrightInvocationCovers(left, right) {
  return left.runner === "playwright"
    && right.runner === "playwright"
    && JSON.stringify(left.executionOwner) === JSON.stringify(right.executionOwner)
    && JSON.stringify(left.platforms) === JSON.stringify(right.platforms)
    && JSON.stringify(left.resourceLocks) === JSON.stringify(right.resourceLocks)
    && isOrderedSubset(left.argv, right.argv);
}

function executionArgvBytes(executable, argv, platform) {
  return Buffer.byteLength(
    [executable, ...argv].join("\0"),
    platform === "win32" ? "utf16le" : "utf8",
  );
}

function executionProcessClass(runner) {
  if (runner.startsWith("python-")) return "python";
  if (runner === "playwright") return "playwright";
  if (runner.startsWith("node-")) return "node";
  return "native";
}

function partitionCanonicalExecution(execution, {
  platform,
  maxLeaves,
  maxArgvBytes,
}) {
  const processClass = executionProcessClass(execution.runner);
  const finalize = (entry) => ({
    ...entry,
    processClass,
    isolation: processClass === "python" ? "process" : entry.leafKeys.length > 1 ? "batch" : "process",
    leafCount: entry.leafKeys.length,
    argvBytes: executionArgvBytes(entry.executable, entry.effectiveArgv, platform),
    maxLeaves,
    maxArgvBytes,
  });
  if (execution.runner === "playwright"
    && execution.executionMode === "e2e-layering"
    && execution.specs.length > 0) {
    return execution.specs.map((spec) => {
      const logicalArgv = [execution.argv[0], "run-spec", spec, ...execution.forwardedArgs];
      const processShape = executionProcessShape(execution.logicalExecutable, logicalArgv, platform);
      return finalize({
        ...execution,
        argv: [execution.argv[0], "run-spec", spec],
        logicalArgv,
        executable: processShape.executable,
        effectiveArgv: processShape.effectiveArgv,
        specs: [spec],
        leafKeys: [`playwright:${normalizeVerificationPath(spec, { platform })}`],
      });
    });
  }
  if (!new Set(["node-test", "node-check"]).has(execution.runner) || execution.files.length === 0) {
    const finalized = finalize(execution);
    if (finalized.leafCount > maxLeaves) {
      throw new Error(`verification-plan-leaf-budget-exceeded:${execution.id}:${finalized.leafCount}:${maxLeaves}`);
    }
    if (finalized.argvBytes > maxArgvBytes) {
      throw new Error(`verification-plan-argv-budget-exceeded:${execution.id}:${finalized.argvBytes}:${maxArgvBytes}`);
    }
    return [finalized];
  }

  const chunks = [];
  let current = [];
  const buildChunk = (files) => {
    if (files.length === execution.files.length
      && files.every((file, index) => file === execution.files[index])) {
      return finalize(execution);
    }
    const nodeMode = execution.runner === "node-check" ? "--check" : "--test";
    const logicalArgv = [nodeMode, ...files, ...execution.runnerArgs, ...execution.forwardedArgs];
    const processShape = executionProcessShape(execution.logicalExecutable, logicalArgv, platform);
    return finalize({
      ...execution,
      argv: [nodeMode, ...files, ...execution.runnerArgs],
      logicalArgv,
      effectiveArgv: processShape.effectiveArgv,
      executable: processShape.executable,
      files,
      leafKeys: files.map((file) => `${execution.runner}:${normalizeVerificationPath(file, { platform })}`),
    });
  };
  for (const file of execution.files) {
    const candidate = buildChunk([...current, file]);
    if (current.length > 0 && (execution.runner === "node-check"
      || candidate.leafCount > maxLeaves
      || candidate.argvBytes > maxArgvBytes)) {
      chunks.push(buildChunk(current));
      current = [file];
      const single = buildChunk(current);
      if (single.leafCount > maxLeaves || single.argvBytes > maxArgvBytes) {
        throw new Error(`verification-plan-argv-budget-exceeded:${execution.id}:${single.argvBytes}:${maxArgvBytes}`);
      }
    } else {
      current.push(file);
    }
  }
  if (current.length > 0) {
    const finalChunk = buildChunk(current);
    if (finalChunk.leafCount > maxLeaves || finalChunk.argvBytes > maxArgvBytes) {
      throw new Error(`verification-plan-argv-budget-exceeded:${execution.id}:${finalChunk.argvBytes}:${maxArgvBytes}`);
    }
    chunks.push(finalChunk);
  }
  return chunks;
}

function finalizeCanonicalExecutions(unbatchedExecutions, dependencyEdgeIndexes, options) {
  const chunksByRawId = new Map();
  const flattened = [];
  for (const execution of unbatchedExecutions) {
    const chunks = partitionCanonicalExecution(execution, options);
    chunksByRawId.set(execution.executionId, chunks);
    flattened.push(...chunks);
  }
  const finalIdByChunk = new Map();
  flattened.forEach((chunk, index) => {
    finalIdByChunk.set(chunk, `execution:${String(index + 1).padStart(4, "0")}`);
  });
  const executions = flattened.map((chunk, order) => {
    const siblings = chunksByRawId.get(chunk.executionId);
    const chunkIndex = siblings.indexOf(chunk);
    const dependsOn = chunkIndex > 0
      ? [finalIdByChunk.get(siblings[chunkIndex - 1])]
      : chunk.dependsOn.map((rawDependency) => {
        const dependencyChunks = chunksByRawId.get(rawDependency);
        return finalIdByChunk.get(dependencyChunks.at(-1));
      });
    return {
      ...chunk,
      sourceExecutionId: chunk.executionId,
      executionId: finalIdByChunk.get(chunk),
      order,
      dependsOn,
    };
  });
  const dependencyEdges = dependencyEdgeIndexes.map((edge) => {
    const fromChunks = chunksByRawId.get(`execution:${String(edge.fromIndex + 1).padStart(4, "0")}`);
    const toChunks = chunksByRawId.get(`execution:${String(edge.toIndex + 1).padStart(4, "0")}`);
    return {
      from: finalIdByChunk.get(fromChunks.at(-1)),
      to: finalIdByChunk.get(toChunks[0]),
      kind: edge.kind,
      suiteId: edge.suiteId,
      sourceOrder: edge.sourceOrder,
    };
  });
  for (const chunks of chunksByRawId.values()) {
    for (let index = 1; index < chunks.length; index += 1) {
      dependencyEdges.push({
        from: finalIdByChunk.get(chunks[index - 1]),
        to: finalIdByChunk.get(chunks[index]),
        kind: "execution-batch-sequence",
        suiteId: chunks[index].id,
        sourceOrder: index,
      });
    }
  }
  return { executions, dependencyEdges };
}

function buildVerificationSelectionPlanInternal(catalog, commandRefs, {
  platform,
  repoRoot = catalog?.identity?.repoRoot || process.cwd(),
  allowUnclassified = false,
  allowUnverifiedCatalog = false,
  supersession = VERIFICATION_COMMAND_SUPERSESSION,
  maxLeaves = DEFAULT_EXECUTION_MAX_LEAVES,
  maxArgvBytes,
} = {}) {
  assertCatalogSourceIntegrity(catalog, { allowUnverifiedCatalog });
  const identityPlatform = platform || catalog?.identity?.platform || process.platform;
  const effectiveMaxArgvBytes = maxArgvBytes
    || (identityPlatform === "win32" ? DEFAULT_WINDOWS_ARGV_BYTES : DEFAULT_POSIX_ARGV_BYTES);
  const roots = normalizePlanningRoots(commandRefs);
  const byId = catalogEntries(catalog);
  const authorityByCommand = new Map((catalog?.authority || []).map((entry) => [entry.commandRef, entry]));
  const supersessionPlan = buildCommandSupersessionPlan(roots.map((root) => root.commandRef), { supersession });
  const supersededBy = new Map(supersessionPlan.supersededCommands
    .map((entry) => [entry.commandRef, entry.supersededBy]));
  assertSupersessionCoverage(byId, supersededBy, { repoRoot, platform: identityPlatform });
  const retained = new Set(supersessionPlan.commandRefs);
  const rootRecords = roots.map((root) => {
    const authority = authorityByCommand.get(root.commandRef) || null;
    const rootCarriesAuthority = [
      "sourceRefs",
      "domains",
      "ownerHints",
      "cost",
      "executionOwner",
      "platforms",
      "resourceLocks",
      "tiers",
      "ciProfiles",
    ].some((field) => root[field] !== undefined);
    if (!authority && rootCarriesAuthority) {
      throw new Error(`verification-plan-root-authority-missing:${root.commandRef}`);
    }
    const authorityRouteIds = sortedUnique(authority?.routeIds);
    const authoritySafetyRouteIds = sortedUnique(authority?.safetyContributorRouteIds);
    if (root.routeIds.some((routeId) => !authorityRouteIds.includes(routeId))) {
      throw new Error(`verification-plan-root-route-drift:${root.commandRef}:routeIds`);
    }
    if (root.safetyContributorRouteIds.length > 0
      && JSON.stringify(root.safetyContributorRouteIds) !== JSON.stringify(authoritySafetyRouteIds)) {
      throw new Error(`verification-plan-root-route-drift:${root.commandRef}:safetyContributorRouteIds`);
    }
    for (const field of ["sourceRefs", "domains", "ownerHints", "platforms", "resourceLocks", "tiers", "ciProfiles"]) {
      if (root[field] !== undefined
        && JSON.stringify(root[field]) !== JSON.stringify(sortedUnique(authority[field]))) {
        throw new Error(`verification-plan-root-authority-drift:${root.commandRef}:${field}`);
      }
    }
    for (const field of ["cost", "executionOwner"]) {
      if (root[field] !== undefined && root[field] !== authority[field]) {
        throw new Error(`verification-plan-root-authority-drift:${root.commandRef}:${field}`);
      }
    }
    return {
      ...root,
      routeIds: root.routeIds.length > 0 ? root.routeIds : authorityRouteIds,
      safetyContributorRouteIds: root.safetyContributorRouteIds.length > 0
        ? root.safetyContributorRouteIds
        : authoritySafetyRouteIds,
      disposition: retained.has(root.commandRef) ? "planned" : "superseded",
      ...(supersededBy.has(root.commandRef) ? { supersededBy: supersededBy.get(root.commandRef) } : {}),
    };
  });
  const expanded = [];
  const dependencyEdgeIndexes = [];
  const addDependencies = (heads, tails, edgeMetadata) => {
    for (const head of heads) {
      for (const tail of tails) {
        expanded[head].dependsOnIndexes.add(tail);
        dependencyEdgeIndexes.push({ fromIndex: tail, toIndex: head, ...edgeMetadata });
      }
    }
  };
  const visit = (id, forwardedArgs, stack, inheritedMetadata, context) => {
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
      const normalizedRefs = entry.refs.map((ref, index) => ({
        ...(typeof ref === "string" ? { id: ref, args: [] } : ref),
        sourceOrder: typeof ref === "object" && Number.isInteger(ref?.sourceOrder) ? ref.sourceOrder : index,
      }));
      if (new Set(normalizedRefs.map((ref) => ref.sourceOrder)).size !== normalizedRefs.length) {
        throw new Error(`verification-plan-conflicting-source-order:${id}`);
      }
      normalizedRefs.sort((left, right) => left.sourceOrder - right.sourceOrder);
      if (normalizedRefs.some((ref, index) => ref.sourceOrder !== index)) {
        throw new Error(`verification-plan-conflicting-source-order:${id}`);
      }
      const nextStack = [...stack, id];
      const suiteMetadata = mergeExecutionMetadata(inheritedMetadata, entry);
      let heads = [];
      let previousTails = [];
      for (const ref of normalizedRefs) {
        if (!ref?.id || !Array.isArray(ref.args || [])) throw new TypeError(`verification-plan-invalid-ref:${id}`);
        const child = visit(
          ref.id,
          [...(ref.args || []), ...forwardedArgs],
          nextStack,
          suiteMetadata,
          {
            ...context,
            expansionPath: [...context.expansionPath, {
              suiteId: id,
              refId: ref.id,
              sourceOrder: ref.sourceOrder,
              args: [...(ref.args || [])],
              effectiveForwardedArgs: [...(ref.args || []), ...forwardedArgs],
            }],
          },
        );
        if (heads.length === 0) heads = child.heads;
        if (previousTails.length > 0) {
          addDependencies(child.heads, previousTails, {
            kind: "suite-sequence",
            suiteId: id,
            sourceOrder: ref.sourceOrder,
          });
        }
        previousTails = child.tails;
      }
      return { heads, tails: previousTails };
    }
    const metadata = mergeExecutionMetadata(inheritedMetadata, entry);
    if (!metadata.metadataComplete && !allowUnclassified) throw new Error(`verification-plan-unclassified-leaf:${id}`);
    if (isTargetlessTestLeaf(entry)) {
      throw new Error(`verification-plan-targetless-leaf:${id}:${entry.discovery?.kind || "unknown"}`);
    }
    if (metadata.platforms.length === 0) throw new Error(`verification-plan-empty-platforms:${id}`);
    if (platform && !metadata.platforms.includes("all") && !metadata.platforms.includes(platform)) {
      throw new Error(`verification-plan-platform-mismatch:${id}:${platform}`);
    }
    const index = expanded.length;
    expanded.push({
      entry: { ...entry, ...metadata },
      forwardedArgs,
      dependsOnIndexes: new Set(),
      provenance: [{
        rootCommandRef: context.root.commandRef,
        routeIds: context.root.routeIds,
        safetyContributorRouteIds: context.root.safetyContributorRouteIds,
        expansionPath: context.expansionPath,
        sourceScript: entry.sourceScript || entry.id,
        sourceOrder: Number.isInteger(entry.sourceOrder) ? entry.sourceOrder : null,
      }],
    });
    return { heads: [index], tails: [index] };
  };
  const plannedRootRecords = rootRecords.filter((candidate) => candidate.disposition === "planned")
    .sort((left, right) => {
      const leftEntry = byId.get(left.commandRef);
      const rightEntry = byId.get(right.commandRef);
      const leftRank = leftEntry?.runner === "playwright" ? (leftEntry.runnerArgs || []).length : Number.MAX_SAFE_INTEGER;
      const rightRank = rightEntry?.runner === "playwright" ? (rightEntry.runnerArgs || []).length : Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.inputIndex - right.inputIndex;
    });
  for (const rootContext of plannedRootRecords) {
    visit(rootContext.commandRef, [], [], {}, { root: rootContext, expansionPath: [] });
  }

  const pathOptions = { repoRoot, platform: identityPlatform };
  const claimedTargets = new Map();
  const unbatchedExecutions = [];
  const executionIndexByExpanded = new Map();
  for (let index = 0; index < expanded.length; index += 1) {
    const { entry, forwardedArgs, dependsOnIndexes, provenance } = expanded[index];
    const comparable = comparableLeaf(entry, forwardedArgs, pathOptions);
    const duplicateExecutionIndexes = new Set();
    const freshTargets = [];
    const leafKeys = [];
    for (const target of leafTargets(entry, pathOptions)) {
      const displayKey = `${comparable.runner}:${target.display}`;
      const existing = claimedTargets.get(target.collisionKey);
      if (existing) {
        const conflict = conflictingField(existing.comparable, comparable);
        if (conflict && !playwrightInvocationCovers(existing.comparable, comparable)) {
          throw new Error(`verification-plan-leaf-conflict:${existing.displayKey}:${conflict}`);
        }
        duplicateExecutionIndexes.add(existing.executionIndex);
        continue;
      }
      freshTargets.push({ ...target, displayKey });
      leafKeys.push(displayKey);
    }
    for (const duplicateIndex of duplicateExecutionIndexes) {
      const existingExecution = unbatchedExecutions[duplicateIndex];
      existingExecution.provenance.push(...structuredClone(provenance));
    }
    if (freshTargets.length === 0) {
      executionIndexByExpanded.set(index, [...duplicateExecutionIndexes][0]);
      continue;
    }
    const freshCollisionKeys = new Set(freshTargets.map((target) => target.collisionKey));
    const files = (entry.files || []).filter((value) => freshCollisionKeys.has(
      `path:${normalizeVerificationPath(value, pathOptions)}`,
    ));
    const specs = (entry.specs || []).filter((value) => freshCollisionKeys.has(
      `path:${normalizeVerificationPath(value, pathOptions)}`,
    ));
    const modules = (entry.modules || []).filter((value) => freshCollisionKeys.has(
      `module:${normalizeModuleIdentity(value, pathOptions)}`,
    ));
    const executionIndex = unbatchedExecutions.length;
    const executionId = `execution:${String(executionIndex + 1).padStart(4, "0")}`;
    const logicalArgv = freshTargets.length === leafTargets(entry, pathOptions).length
      ? [...(entry.argv || []), ...forwardedArgs]
      : rebuildLogicalArgv(entry, { files, modules, specs }, forwardedArgs);
    const processShape = executionProcessShape(entry.executable, logicalArgv, identityPlatform);
    unbatchedExecutions.push({
      executionId,
      order: index,
      id: entry.id,
      command: entry.command,
      executable: processShape.executable,
      argv: [...(entry.argv || [])],
      forwardedArgs: [...forwardedArgs],
      effectiveArgv: processShape.effectiveArgv,
      logicalExecutable: entry.executable,
      logicalArgv,
      runner: comparable.runner,
      runnerArgs: [...(entry.runnerArgs || [])],
      executionMode: entry.executionMode || null,
      files,
      modules,
      specs,
      domains: sortedUnique(entry.domains),
      cost: entry.cost || "contract",
      executionOwner: comparable.executionOwner,
      platforms: comparable.platforms,
      resourceLocks: comparable.resourceLocks,
      tiers: sortedUnique(entry.tiers),
      ciProfiles: sortedUnique(entry.ciProfiles),
      leafKeys: leafKeys.sort(),
      dependsOn: [...dependsOnIndexes].sort((left, right) => left - right)
        .map((dependencyIndex) => executionIndexByExpanded.get(dependencyIndex))
        .filter((dependencyIndex) => dependencyIndex !== undefined)
        .map((dependencyIndex) => `execution:${String(dependencyIndex + 1).padStart(4, "0")}`),
      provenance,
    });
    executionIndexByExpanded.set(index, executionIndex);
    for (const target of freshTargets) {
      claimedTargets.set(target.collisionKey, {
        comparable,
        displayKey: target.displayKey,
        executionIndex,
      });
    }
  }
  const remappedDependencyEdges = dependencyEdgeIndexes.flatMap((edge) => {
    const fromIndex = executionIndexByExpanded.get(edge.fromIndex);
    const toIndex = executionIndexByExpanded.get(edge.toIndex);
    if (fromIndex === undefined || toIndex === undefined || fromIndex === toIndex) return [];
    return [{ ...edge, fromIndex, toIndex }];
  });
  const { executions, dependencyEdges } = finalizeCanonicalExecutions(
    unbatchedExecutions,
    remappedDependencyEdges,
    {
      platform: identityPlatform,
      maxLeaves,
      maxArgvBytes: effectiveMaxArgvBytes,
    },
  );
  const lockGroups = new Map();
  for (const execution of executions) {
    const key = JSON.stringify(execution.resourceLocks);
    if (!lockGroups.has(key)) lockGroups.set(key, { resourceLocks: execution.resourceLocks, executionIds: [] });
    lockGroups.get(key).executionIds.push(execution.executionId);
  }
  const resourceLockGroups = [...lockGroups.values()].sort((left, right) => {
    if (left.resourceLocks.length !== right.resourceLocks.length) return left.resourceLocks.length - right.resourceLocks.length;
    return compareText(JSON.stringify(left.resourceLocks), JSON.stringify(right.resourceLocks));
  });
  return {
    schemaVersion: VERIFICATION_CATALOG_SCHEMA_VERSION,
    kind: "verification-selection-plan",
    status: "ready",
    catalogDigest: catalog?.sourceIntegrity?.digest || null,
    catalogIdentity: catalog?.identity || null,
    requestedCommandRefs: roots.map((root) => root.commandRef),
    selectedCommandRefs: supersessionPlan.commandRefs,
    rootRecords,
    normalizedLeaves: executions.flatMap((entry) => entry.leafKeys).sort(),
    executions,
    dependencyEdges,
    resourceLockGroups,
  };
}

/** Expand selected suites into a stable, fail-closed whole-lane execution plan. */
export function buildVerificationSelectionPlan(catalog, commandRefs, options = {}) {
  if (options.preparedCatalog) assertPreparedVerificationCatalog(options.preparedCatalog, catalog);
  else assertRepositorySourceConsistency(catalog, options.sourceInputs);
  return buildVerificationSelectionPlanInternal(catalog, commandRefs, options);
}

/** Atomically build, verify, and plan the repository catalog for Phase 2 consumption. */
export function buildRepositoryVerificationSelectionPlan({
  packageScripts,
  roots,
  verificationRecords = VERIFICATION_DOMAINS,
  selectorRoutes = buildRouteIndex(),
  repoRoot = process.cwd(),
  platform = process.platform,
  supersession = VERIFICATION_COMMAND_SUPERSESSION,
} = {}) {
  const catalog = buildRepositoryVerificationCatalog({
    packageScripts,
    verificationRecords,
    selectorRoutes,
    repoRoot,
    platform,
  });
  return buildVerificationSelectionPlan(catalog, roots, {
    platform,
    supersession,
    sourceInputs: {
      packageScripts,
      verificationRecords,
      selectorRoutes,
      repoRoot,
      platform,
    },
  });
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
    tierEntrypoints: VERIFICATION_TIER_ENTRYPOINTS.map((entry) => ({ ...entry })),
    productJourneyEntrypoints: VERIFICATION_PRODUCT_JOURNEY_ENTRYPOINTS.map((entry) => ({ ...entry })),
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
  selectorRoutes = buildRouteIndex(),
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
  const catalog = buildRepositoryVerificationCatalog({
    packageScripts,
    verificationRecords,
    selectorRoutes,
  });
  const consistency = checkVerificationCatalogConsistency(catalog, {
    packageScripts,
    records: verificationRecords,
    selectorRoutes,
    sourceMode: "repository",
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
