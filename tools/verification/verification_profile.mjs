import { createHash } from "node:crypto";
import path from "node:path";
import {
  VERIFICATION_GATE_POLICY_AUTHORITY,
  VERIFICATION_GATE_POLICY_AUTHORITY_IDENTITY,
  verificationGatePolicySignalsDigest,
} from "./verification_catalog_projection.mjs";

export const VERIFICATION_PROFILE_SCHEMA_VERSION = 1;
export const VERIFICATION_PROFILE_KIND = "verification-profile";
export const PR_COST_SCHEMA_VERSION = 1;
export const PR_COST_KIND = "pr-verification-cost-observation";
export const PR_COST_SCHEMA_KIND = "pr-verification-cost-schema";
const PR_COST_PHASE = "stabilization-cost-collapse-v2-pr-phase-1a";
const PR_COST_MODE = "observation-only";
const PR_COST_REQUIRED_EXECUTION_SET_EFFECT = "unchanged";
const PR_COST_METRIC_FIELDS = Object.freeze([
  "checkoutMs",
  "setupMs",
  "fixedGuardrailMs",
  "selectorMs",
  "selectedExecutionMs",
  "selectedCommands",
  "uniqueLeafTests",
  "duplicateLeafExecutions",
  "deferredMainThreadCommands",
]);
const PR_COST_TIMING_FIELDS = new Set([
  "checkoutMs",
  "setupMs",
  "fixedGuardrailMs",
  "selectorMs",
]);
const PR_COST_COUNT_FIELDS = new Set([
  "selectedCommands",
  "uniqueLeafTests",
  "duplicateLeafExecutions",
  "deferredMainThreadCommands",
]);
const PR_COST_TIMING_SOURCES = new Set(["unknown", "local-monotonic-clock", "workflow-observer"]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export const PR_COST_SCHEMA = deepFreeze({
  schemaVersion: PR_COST_SCHEMA_VERSION,
  kind: PR_COST_SCHEMA_KIND,
  observationKind: PR_COST_KIND,
  phase: PR_COST_PHASE,
  mode: PR_COST_MODE,
  requiredExecutionSetEffect: PR_COST_REQUIRED_EXECUTION_SET_EFFECT,
  observationStages: ["selector", "adaptive"],
  sourceBindingFields: [
    "catalogDigest",
    "catalogSourceIdentity",
    "gatePolicySignalsDigest",
    "selectorRootSet",
    "changedFiles",
    "selectorObservationDigest",
  ],
  metricFields: [...PR_COST_METRIC_FIELDS],
});
export const PR_COST_SCHEMA_IDENTITY = deepFreeze({
  schemaVersion: 1,
  kind: "pr-verification-cost-schema-identity",
  algorithm: "sha256",
  digest: sha256(PR_COST_SCHEMA),
});
export const DEFAULT_CORE_VERIFICATION_PROFILE_OUT = path.join(
  process.cwd(),
  ".runtime",
  "reports",
  "generated",
  "verify-core-profile.json",
);
export const DEFAULT_ADAPTIVE_VERIFICATION_PROFILE_OUT = path.join(
  process.cwd(),
  ".runtime",
  "reports",
  "generated",
  "test-adaptive-profile.json",
);

const PROFILE_STATES = new Set([
  "planned",
  "listed",
  "running",
  "passed",
  "failed",
  "blocked",
  "interrupted",
]);
const TERMINAL_PROFILE_STATES = new Set([
  "listed",
  "passed",
  "failed",
  "blocked",
  "interrupted",
]);

function stableUnique(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function stableValues(values) {
  return (values || []).filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function multisetDifference(left, right) {
  const available = new Map();
  for (const value of right) available.set(value, Number(available.get(value) || 0) + 1);
  return left.filter((value) => {
    const count = Number(available.get(value) || 0);
    if (count === 0) return true;
    available.set(value, count - 1);
    return false;
  });
}

function commandRefOf(value) {
  return String(typeof value === "string" ? value : value?.commandRef || value?.command || "").trim();
}

function executionIdentityOf(value) {
  return String(value?.groupId || value?.executionGroupRef || commandRefOf(value)).trim();
}

function nonNegativeDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

function nullableNonNegativeDuration(value) {
  if (value === null || value === undefined || value === "") return null;
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function leafIdOf(value) {
  return String(typeof value === "string" ? value : value?.leafId || value?.canonicalLeafRef || "").trim();
}

function prCostError(code, detail = "") {
  const error = new Error(`${code}${detail ? `:${detail}` : ""}`);
  error.code = code;
  error.detail = detail;
  return error;
}

function normalizeTimingObservation(input, field) {
  if (input === null || input === undefined) return { value: null, source: "unknown" };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw prCostError("pr-cost-observation-untrusted-timing-source", field);
  }
  const source = String(input.source || "");
  const value = nullableNonNegativeDuration(input.value);
  if (!PR_COST_TIMING_SOURCES.has(source)
    || (value === null && source !== "unknown")
    || (value !== null && source === "unknown")) {
    throw prCostError("pr-cost-observation-untrusted-timing-source", field);
  }
  return { value, source };
}

export function selectorPrCostObservation(report) {
  if (report?.selectorPrCost) return report.selectorPrCost;
  return report?.prCost?.observationStage === "selector" ? report.prCost : null;
}

export function buildPrCostSourceBinding({
  selectorReport = null,
  executionPlan = null,
  observationStage = "selector",
  selectorObservationDigest = null,
} = {}) {
  const catalogDigest = executionPlan?.catalogDigest ?? selectorReport?.catalogDigest ?? null;
  const catalogSourceIdentity = executionPlan?.catalogSourceIdentity
    ?? selectorReport?.catalogSourceIdentity
    ?? null;
  const gatePolicySignalsDigest = executionPlan?.gatePolicySignalsDigest
    ?? selectorReport?.gatePolicySignalsDigest
    ?? null;
  return {
    schemaVersion: 1,
    kind: "pr-verification-cost-source-binding",
    observationStage,
    catalogDigest: typeof catalogDigest === "string" ? catalogDigest : null,
    catalogSourceIdentity: catalogSourceIdentity ? structuredClone(catalogSourceIdentity) : null,
    gatePolicySignalsDigest: typeof gatePolicySignalsDigest === "string" ? gatePolicySignalsDigest : null,
    selectorRootSet: stableUnique(executionPlan?.selectorRootSet || selectorReport?.selectorRootSet || []),
    changedFiles: stableUnique(executionPlan?.changedFiles || selectorReport?.changedFiles || []),
    selectorObservationDigest: observationStage === "adaptive"
      && typeof selectorObservationDigest === "string"
      ? selectorObservationDigest
      : null,
  };
}

export function prCostObservationDigest(observation) {
  const payload = structuredClone(observation || {});
  delete payload.observationDigest;
  return sha256(payload);
}

export function assertPrCostObservation(observation, {
  expectedObservationStage = null,
  expectedSourceBinding = null,
} = {}) {
  const expectedKeys = [
    "schemaVersion",
    "kind",
    "schemaIdentity",
    "observationStage",
    "phase",
    "mode",
    "requiredExecutionSetEffect",
    "sourceBinding",
    "measurementSources",
    ...PR_COST_METRIC_FIELDS,
    "observationDigest",
  ];
  if (!observation || typeof observation !== "object" || Array.isArray(observation)
    || JSON.stringify(Object.keys(observation)) !== JSON.stringify(expectedKeys)) {
    throw prCostError("pr-cost-observation-schema-drift", "fields");
  }
  if (observation.schemaVersion !== PR_COST_SCHEMA_VERSION
    || observation.kind !== PR_COST_KIND
    || observation.phase !== PR_COST_PHASE
    || observation.mode !== PR_COST_MODE
    || observation.requiredExecutionSetEffect !== PR_COST_REQUIRED_EXECUTION_SET_EFFECT
    || !PR_COST_SCHEMA.observationStages.includes(observation.observationStage)) {
    throw prCostError("pr-cost-observation-schema-drift", "envelope");
  }
  if (JSON.stringify(observation.schemaIdentity) !== JSON.stringify(PR_COST_SCHEMA_IDENTITY)) {
    throw prCostError("pr-cost-observation-schema-identity-drift");
  }
  if (expectedObservationStage && observation.observationStage !== expectedObservationStage) {
    throw prCostError("pr-cost-observation-source-binding-drift", "observationStage");
  }
  const sourceBindingKeys = [
    "schemaVersion",
    "kind",
    "observationStage",
    ...PR_COST_SCHEMA.sourceBindingFields,
  ];
  const sourceBinding = observation.sourceBinding;
  if (!sourceBinding
    || JSON.stringify(Object.keys(sourceBinding)) !== JSON.stringify(sourceBindingKeys)
    || sourceBinding.schemaVersion !== 1
    || sourceBinding.kind !== "pr-verification-cost-source-binding"
    || sourceBinding.observationStage !== observation.observationStage
    || !Array.isArray(sourceBinding.selectorRootSet)
    || !Array.isArray(sourceBinding.changedFiles)
    || JSON.stringify(sourceBinding.selectorRootSet) !== JSON.stringify(stableUnique(sourceBinding.selectorRootSet))
    || JSON.stringify(sourceBinding.changedFiles) !== JSON.stringify(stableUnique(sourceBinding.changedFiles))) {
    throw prCostError("pr-cost-observation-source-binding-drift", "schema");
  }
  if (expectedSourceBinding
    && JSON.stringify(sourceBinding) !== JSON.stringify(expectedSourceBinding)) {
    throw prCostError("pr-cost-observation-source-binding-drift", "expected");
  }
  if (!observation.measurementSources
    || JSON.stringify(Object.keys(observation.measurementSources)) !== JSON.stringify(PR_COST_METRIC_FIELDS)) {
    throw prCostError("pr-cost-observation-schema-drift", "measurementSources");
  }
  for (const field of PR_COST_METRIC_FIELDS) {
    const value = observation[field];
    const source = observation.measurementSources[field];
    if (PR_COST_TIMING_FIELDS.has(field)) {
      if ((value !== null && (!Number.isFinite(value) || value < 0))
        || !PR_COST_TIMING_SOURCES.has(source)
        || (value === null && source !== "unknown")
        || (value !== null && source === "unknown")) {
        throw prCostError("pr-cost-observation-metric-drift", field);
      }
      continue;
    }
    if (field === "selectedExecutionMs") {
      if ((value !== null && (!Number.isFinite(value) || value < 0))
        || source !== (value === null ? "unknown" : "execution-results")) {
        throw prCostError("pr-cost-observation-metric-drift", field);
      }
      continue;
    }
    if (PR_COST_COUNT_FIELDS.has(field)
      && ((value !== null && (!Number.isInteger(value) || value < 0))
        || source !== (value === null ? "unknown" : "execution-plan"))) {
      throw prCostError("pr-cost-observation-metric-drift", field);
    }
  }
  if (typeof observation.observationDigest !== "string"
    || observation.observationDigest !== prCostObservationDigest(observation)) {
    throw prCostError("pr-cost-observation-digest-drift");
  }
  return observation;
}

function validatedSelectorPrCost(selectorReport, executionPlan) {
  const reportObservation = selectorPrCostObservation(selectorReport);
  const planObservation = executionPlan?.selectorPrCost || null;
  for (const [carrier, observation] of [
    [selectorReport, reportObservation],
    [executionPlan, planObservation],
  ]) {
    if (!observation) continue;
    assertPrCostObservation(observation, {
      expectedObservationStage: "selector",
      expectedSourceBinding: buildPrCostSourceBinding({
        selectorReport: carrier === selectorReport ? selectorReport : null,
        executionPlan: carrier === executionPlan ? executionPlan : null,
        observationStage: "selector",
      }),
    });
  }
  if (reportObservation && planObservation
    && JSON.stringify(reportObservation) !== JSON.stringify(planObservation)) {
    throw prCostError("pr-cost-observation-source-binding-drift", "selector-handoff");
  }
  const observation = planObservation || reportObservation;
  if (executionPlan?.selectorPrCostDigest !== undefined
    && executionPlan.selectorPrCostDigest !== (observation?.observationDigest ?? null)) {
    throw prCostError("pr-cost-observation-digest-drift", "selector-handoff");
  }
  return observation;
}

export function buildPrCostObservation({
  selectorReport = null,
  executionPlan = null,
  executionResults = null,
  timingInputs = {},
  observationStage = executionPlan ? "adaptive" : "selector",
} = {}) {
  if (!PR_COST_SCHEMA.observationStages.includes(observationStage)) {
    throw prCostError("pr-cost-observation-schema-drift", "observationStage");
  }
  const selectorObservation = observationStage === "adaptive"
    ? validatedSelectorPrCost(selectorReport, executionPlan)
    : null;
  const selectedLeaves = Array.isArray(executionPlan?.selectedLeaves)
    ? executionPlan.selectedLeaves.map(leafIdOf).filter(Boolean)
    : null;
  const uniqueLeafTests = selectedLeaves === null ? null : new Set(selectedLeaves).size;
  const selectedExecutionResults = timingInputs.executionObserved === false
    ? null
    : Array.isArray(executionResults)
    ? executionResults.filter((entry) => entry?.processStarted === true)
    : null;
  const selectedExecutionMs = selectedExecutionResults === null
    ? null
    : selectedExecutionResults.reduce((sum, entry) => sum + nonNegativeDuration(entry.durationMs), 0);
  const timing = Object.fromEntries([...PR_COST_TIMING_FIELDS]
    .map((field) => [field, normalizeTimingObservation(timingInputs[field], field)]));
  const metrics = {
    checkoutMs: timing.checkoutMs.value,
    setupMs: timing.setupMs.value,
    fixedGuardrailMs: timing.fixedGuardrailMs.value,
    selectorMs: timing.selectorMs.value,
    selectedExecutionMs,
    selectedCommands: Array.isArray(executionPlan?.commandsToRun)
      ? executionPlan.commandsToRun.length
      : null,
    uniqueLeafTests,
    duplicateLeafExecutions: selectedLeaves === null ? null : selectedLeaves.length - uniqueLeafTests,
    deferredMainThreadCommands: Array.isArray(executionPlan?.blockedMainThreadCommands)
      ? executionPlan.blockedMainThreadCommands.length
      : null,
  };
  const measurementSources = {
    checkoutMs: timing.checkoutMs.source,
    setupMs: timing.setupMs.source,
    fixedGuardrailMs: timing.fixedGuardrailMs.source,
    selectorMs: timing.selectorMs.source,
    selectedExecutionMs: selectedExecutionMs === null ? "unknown" : "execution-results",
    selectedCommands: metrics.selectedCommands === null ? "unknown" : "execution-plan",
    uniqueLeafTests: uniqueLeafTests === null ? "unknown" : "execution-plan",
    duplicateLeafExecutions: metrics.duplicateLeafExecutions === null ? "unknown" : "execution-plan",
    deferredMainThreadCommands: metrics.deferredMainThreadCommands === null ? "unknown" : "execution-plan",
  };
  const observation = {
    schemaVersion: PR_COST_SCHEMA_VERSION,
    kind: PR_COST_KIND,
    schemaIdentity: structuredClone(PR_COST_SCHEMA_IDENTITY),
    observationStage,
    phase: PR_COST_PHASE,
    mode: PR_COST_MODE,
    requiredExecutionSetEffect: PR_COST_REQUIRED_EXECUTION_SET_EFFECT,
    sourceBinding: buildPrCostSourceBinding({
      selectorReport,
      executionPlan,
      observationStage,
      selectorObservationDigest: selectorObservation?.observationDigest || null,
    }),
    measurementSources,
    ...metrics,
  };
  observation.observationDigest = prCostObservationDigest(observation);
  return assertPrCostObservation(observation);
}

function profileGatePolicyBinding(selectorReport, executionPlan) {
  const selectorSignals = selectorReport?.gatePolicySignals;
  const planSignals = executionPlan?.gatePolicySignals;
  const selectorDigest = selectorReport?.gatePolicySignalsDigest;
  const planDigest = executionPlan?.gatePolicySignalsDigest;
  const selectorBindingPresent = selectorSignals !== undefined || selectorDigest !== undefined;
  const planBindingPresent = planSignals !== undefined || planDigest !== undefined;
  if (!selectorBindingPresent && !planBindingPresent) return null;

  function validBinding(signals, digest) {
    const expectedSignalNames = Object.keys(VERIFICATION_GATE_POLICY_AUTHORITY.signals).sort();
    const observedSignalNames = Object.keys(signals?.signals || {}).sort();
    return signals?.schemaVersion === 1
      && signals?.kind === "verification-gate-policy-signals"
      && signals?.phase === VERIFICATION_GATE_POLICY_AUTHORITY.phase
      && signals?.mode === VERIFICATION_GATE_POLICY_AUTHORITY.mode
      && signals?.requiredExecutionSetEffect === VERIFICATION_GATE_POLICY_AUTHORITY.requiredExecutionSetEffect
      && JSON.stringify(observedSignalNames) === JSON.stringify(expectedSignalNames)
      && Object.values(signals.signals).every((signal) => (
        ["true", "false", "unknown"].includes(signal?.state)
        && Array.isArray(signal?.reasons)
        && signal.reasons.length > 0
        && signal.reasons.every((reason) => (
          ["domain", "sourceRef", "entrypoint", "sharedRisk"].includes(reason?.source?.type)
          && typeof reason?.source?.value === "string"
          && reason.source.value.length > 0
        ))
      ))
      && JSON.stringify(signals.authorityIdentity) === JSON.stringify(VERIFICATION_GATE_POLICY_AUTHORITY_IDENTITY)
      && typeof digest === "string"
      && digest.length > 0
      && digest === verificationGatePolicySignalsDigest(signals);
  }

  if ((selectorBindingPresent && !validBinding(selectorSignals, selectorDigest))
    || (planBindingPresent && !validBinding(planSignals, planDigest))
    || (selectorBindingPresent && planBindingPresent
      && (JSON.stringify(selectorSignals) !== JSON.stringify(planSignals) || selectorDigest !== planDigest))) {
    throw new Error("verification-profile-gate-policy-drift");
  }
  const signals = planSignals || selectorSignals;
  const signalsDigest = planDigest || selectorDigest;
  return {
    signalsDigest,
    catalogDigest: executionPlan?.catalogDigest || selectorReport?.catalogDigest || null,
    catalogSourceIdentity: structuredClone(
      executionPlan?.catalogSourceIdentity || selectorReport?.catalogSourceIdentity || null,
    ),
    signals: structuredClone(signals),
  };
}

export function normalizeVerificationTestFile(value) {
  let normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/[),:]+$/g, "");
  if (/^tests(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/u.test(normalized)) {
    normalized = `${normalized.replaceAll(".", "/")}.py`;
  }
  normalized = path.posix.normalize(normalized);
  if (!normalized.startsWith("tests/") || normalized.startsWith("tests/../")) return "";
  return normalized;
}

function extractTestFiles(command) {
  const files = [];
  for (const match of String(command || "").matchAll(/\btests\/[A-Za-z0-9_./-]+\.(?:mjs|js|py)\b/gu)) {
    const normalized = normalizeVerificationTestFile(match[0]);
    if (normalized) files.push(normalized);
  }
  for (const match of String(command || "").matchAll(/\btests(?:\.[A-Za-z_][A-Za-z0-9_]*)+\b/gu)) {
    const normalized = normalizeVerificationTestFile(match[0]);
    if (normalized) files.push(normalized);
  }
  return files;
}

function splitCommandChain(command) {
  return String(command || "")
    .split(/\s*&&\s*/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNpmScriptInvocation(command) {
  const match = String(command || "").trim().match(
    /^npm\s+(?:run|run-script)(?:\s+-s)?\s+([A-Za-z0-9:_-]+)(?:\s+--)?(.*)$/u,
  );
  if (!match) return null;
  return {
    scriptName: match[1],
    forwardedArgs: String(match[2] || "").trim(),
  };
}

function emptyProcessStarts() {
  return { node: 0, npm: 0, python: 0, playwright: 0, unclassified: 0 };
}

function classifyLeafProcess(command, processStarts) {
  const normalized = String(command || "").trim();
  if (!normalized) return;
  if (/^(?:npx\s+)?playwright\b|node\s+node_modules\/@playwright\/test\/cli\.js\b/u.test(normalized)) {
    if (normalized.startsWith("npx ")) processStarts.npm += 1;
    processStarts.playwright += 1;
    return;
  }
  if (/^node\s+tools\/run_python\.mjs\b/u.test(normalized)) {
    processStarts.node += 1;
    processStarts.python += 1;
    return;
  }
  if (/^node\b/u.test(normalized)) {
    processStarts.node += 1;
    return;
  }
  if (/^(?:python|python3|py(?:\s+-3)?)\b/u.test(normalized)) {
    processStarts.python += 1;
    return;
  }
  if (/^npm\b/u.test(normalized)) {
    processStarts.npm += 1;
    return;
  }
  processStarts.unclassified += 1;
}

export function analyzeVerificationCommand(commandRef, {
  packageScripts = {},
} = {}) {
  const processStarts = emptyProcessStarts();
  const leafCommands = [];
  const testFiles = [];
  const analysisIssues = [];

  function visit(command, stack = []) {
    const normalized = String(command || "").trim();
    if (!normalized) return;
    if (Object.hasOwn(packageScripts, normalized)) {
      processStarts.npm += 1;
      if (stack.includes(normalized)) {
        analysisIssues.push(`package-script-cycle:${[...stack, normalized].join("->")}`);
        return;
      }
      visit(packageScripts[normalized], [...stack, normalized]);
      return;
    }
    const chained = splitCommandChain(normalized);
    if (chained.length > 1) {
      for (const part of chained) visit(part, stack);
      return;
    }
    const npmInvocation = parseNpmScriptInvocation(normalized);
    if (npmInvocation) {
      processStarts.npm += 1;
      const { scriptName, forwardedArgs } = npmInvocation;
      if (!Object.hasOwn(packageScripts, scriptName)) {
        analysisIssues.push(`package-script-unresolved:${scriptName}`);
        return;
      }
      if (stack.includes(scriptName)) {
        analysisIssues.push(`package-script-cycle:${[...stack, scriptName].join("->")}`);
        return;
      }
      const expanded = [packageScripts[scriptName], forwardedArgs].filter(Boolean).join(" ");
      visit(expanded, [...stack, scriptName]);
      return;
    }
    leafCommands.push(normalized);
    classifyLeafProcess(normalized, processStarts);
    testFiles.push(...extractTestFiles(normalized));
  }

  visit(commandRef);
  return {
    commandRef: commandRefOf(commandRef),
    leafCommands,
    testFiles,
    processStarts: {
      ...processStarts,
      total: Object.values(processStarts).reduce((sum, count) => sum + count, 0),
    },
    analysisIssues: stableUnique(analysisIssues),
  };
}

export function classifyVerificationTestFile(file) {
  const normalized = normalizeVerificationTestFile(file);
  if (
    /^tests\/(?:verification_|verify_core_|supervisor_)/u.test(normalized)
    || /^tests\/p4_(?:phase_verification|state_writer_(?:streaming_runner|runner_reachability))/u.test(normalized)
    || /^tests\/test_(?:e2e_structural_tooling|perf_gate_contract)\.py$/u.test(normalized)
  ) {
    return "meta-verification";
  }
  return "product-test";
}

function classifyCommand(commandRef, files) {
  if (files.length > 0) {
    return files.every((file) => classifyVerificationTestFile(file) === "meta-verification")
      ? "meta-verification"
      : "product-test";
  }
  return /(?:verification|verify[_:-]?core|supervisor|select_verification_targets|test_route_registry)/iu
    .test(commandRef)
    ? "meta-verification"
    : "product-test";
}

function selectorFilesForCommand(selectorReport, commandRef) {
  const matching = (selectorReport?.recommendedCommands || [])
    .filter((entry) => commandRefOf(entry) === commandRef);
  return stableUnique(matching.flatMap((entry) => (
    entry.expandedSpecs || []
  )).map(normalizeVerificationTestFile));
}

function cacheOutcome(entry) {
  const explicit = String(entry?.cacheOutcome || "").toLowerCase();
  if (explicit === "hit" || explicit === "miss") return explicit;
  if (String(entry?.evidenceDisposition || "").startsWith("reused")) return "hit";
  return "miss";
}

function processWasStarted(entry) {
  return entry?.processStarted === true;
}

function entryFailed(entry) {
  return entry?.status === "failed"
    || (Number.isInteger(entry?.exitCode) && entry.exitCode !== 0);
}

function inferProfileState({ selectorReport, executionResults, runnerState, terminalState }) {
  const explicit = String(terminalState || runnerState || "").toLowerCase();
  const aliases = {
    pass: "passed",
    listed: "listed",
    failed: "failed",
    blocked: "blocked",
    interrupted: "interrupted",
    running: "running",
    planned: "planned",
  };
  if (PROFILE_STATES.has(aliases[explicit] || explicit)) return aliases[explicit] || explicit;
  if (selectorReport?.adaptiveMode === "dry-run") return "planned";
  if (executionResults.some((entry) => entry.status === "interrupted" || entry.signal)) return "interrupted";
  if (executionResults.some(entryFailed)) return "failed";
  if (executionResults.some((entry) => entry.status === "running")) return "running";
  if (executionResults.length > 0 && executionResults.every((entry) => entry.status === "passed")) return "passed";
  return "planned";
}

function slowestFirst(left, right, durationKey = "wallTimeMs", identityKey = "commandRef") {
  return right[durationKey] - left[durationKey]
    || String(left[identityKey]).localeCompare(String(right[identityKey]));
}

function normalizeExecutionProjection(executionProjection, plannedCommands) {
  const rows = [];
  const appendRow = (entry, inherited = {}) => {
    const rootCommandRef = commandRefOf(entry?.rootCommandRef || inherited.rootCommandRef);
    const sourceRootRefs = stableUnique(
      entry?.sourceRootRefs || inherited.sourceRootRefs || [rootCommandRef],
    );
    const canonicalLeafRef = commandRefOf(entry?.canonicalLeafRef || entry?.leafId || entry?.commandRef || entry);
    const executionGroupRef = commandRefOf(
      entry?.executionGroupRef || entry?.groupId || inherited.executionGroupRef || rootCommandRef,
    );
    if (!rootCommandRef || !canonicalLeafRef || !executionGroupRef) return;
    rows.push({
      rootCommandRef,
      sourceRootRefs: sourceRootRefs.length > 0 ? sourceRootRefs : [rootCommandRef],
      canonicalLeafRef,
      leafId: commandRefOf(entry?.leafId || canonicalLeafRef),
      kind: String(entry?.kind || inherited.kind || "legacy-command"),
      executionGroupRef,
      groupId: commandRefOf(entry?.groupId || executionGroupRef),
      files: stableUnique(entry?.files || inherited.files),
      modules: stableUnique(entry?.modules || inherited.modules),
      specs: stableUnique(entry?.specs || inherited.specs),
      processRef: commandRefOf(entry?.processRef || inherited.processRef || executionGroupRef),
      processClass: String(entry?.processClass || inherited.processClass || "unclassified"),
      isolation: String(entry?.isolation || inherited.isolation || "process"),
      disposition: String(entry?.disposition || inherited.disposition || "selected"),
      executionOwner: String(entry?.executionOwner || inherited.executionOwner || "unclassified"),
      executionOwners: stableUnique(entry?.executionOwners || inherited.executionOwners),
      platforms: stableUnique(entry?.platforms || inherited.platforms),
      resourceLocks: stableUnique(entry?.resourceLocks || inherited.resourceLocks),
      routeIds: stableUnique(entry?.routeIds || inherited.routeIds),
      safetyContributorRouteIds: stableUnique(
        entry?.safetyContributorRouteIds || inherited.safetyContributorRouteIds,
      ),
      provenance: structuredClone(entry?.provenance || inherited.provenance || []),
      dependencyEdges: structuredClone(entry?.dependencyEdges || inherited.dependencyEdges || []),
      sourceOrder: Number.isInteger(entry?.sourceOrder)
        ? entry.sourceOrder
        : Number.isInteger(inherited.sourceOrder) ? inherited.sourceOrder : rows.length,
    });
  };
  for (const entry of executionProjection || []) {
    const nestedLeaves = Array.isArray(entry?.canonicalLeaves) ? entry.canonicalLeaves : null;
    if (nestedLeaves) {
      for (const leaf of nestedLeaves) appendRow(leaf, entry);
      continue;
    }
    appendRow(entry);
  }
  const projectedRoots = new Set(rows.flatMap((entry) => entry.sourceRootRefs));
  for (const rootCommandRef of stableUnique(plannedCommands)) {
    if (!projectedRoots.has(rootCommandRef)) {
      appendRow({
        rootCommandRef,
        sourceRootRefs: [rootCommandRef],
        canonicalLeafRef: rootCommandRef,
        leafId: rootCommandRef,
        executionGroupRef: rootCommandRef,
      });
    }
  }
  return rows.sort((left, right) => (
    left.sourceOrder - right.sourceOrder
    || left.rootCommandRef.localeCompare(right.rootCommandRef)
    || left.canonicalLeafRef.localeCompare(right.canonicalLeafRef)
    || left.executionGroupRef.localeCompare(right.executionGroupRef)
  ));
}

function plannedLeavesFromProjection(plannedCommands, projection, projectionMode = "legacy") {
  if (projectionMode === "canonical") {
    return stableValues(projection.map((entry) => entry.canonicalLeafRef));
  }
  const leavesByRoot = new Map();
  for (const entry of projection) {
    const leaves = leavesByRoot.get(entry.rootCommandRef) || [];
    leaves.push(entry.canonicalLeafRef);
    leavesByRoot.set(entry.rootCommandRef, leaves);
  }
  return stableValues(plannedCommands.flatMap((rootCommandRef) => (
    leavesByRoot.get(rootCommandRef) || [rootCommandRef]
  )));
}

function defaultMissingAnalysis(commandRef) {
  return {
    commandRef,
    leafCommands: [],
    testFiles: [],
    processStarts: { ...emptyProcessStarts(), total: 0 },
    analysisIssues: commandRef ? [`profile-plan-missing-analysis:${commandRef}`] : [],
  };
}

function projectionTestFiles(entry) {
  return stableUnique([
    ...(entry?.files || []),
    ...(entry?.modules || []),
    ...(entry?.specs || []),
  ].map(normalizeVerificationTestFile));
}

export function prepareVerificationProfilePlan({
  selectorReport = null,
  executionPlan = null,
  executionProjection = executionPlan?.verificationProfileProjection
    || executionPlan?.executionProjection
    || [],
  executionResults = [],
  packageScripts = {},
  commandAnalyzer = analyzeVerificationCommand,
} = {}) {
  const recommendedCommands = stableValues(
    (selectorReport?.recommendedCommands || []).map(commandRefOf).filter(Boolean),
  );
  const plannedCommands = stableValues(
    (executionPlan?.commandsToRun || []).map(commandRefOf).filter(Boolean),
  );
  const projection = normalizeExecutionProjection(executionProjection, plannedCommands);
  const projectionMode = executionPlan?.verificationProfileProjectionKind === "canonical-final-plan"
    && projection.length > 0
    && projection.every((entry) => entry.leafId && entry.groupId && entry.processRef)
    ? "canonical"
    : "legacy";
  const observedCommands = stableValues(
    (executionResults || []).map(commandRefOf).filter(Boolean),
  );
  const allCommandRefs = stableUnique([
    ...recommendedCommands,
    ...plannedCommands,
    ...observedCommands,
    ...projection.flatMap((entry) => [
      entry.rootCommandRef,
      entry.canonicalLeafRef,
      entry.executionGroupRef,
    ]),
  ]);
  const analysisByCommand = {};
  const selectorFilesByCommand = {};
  for (const commandRef of allCommandRefs) {
    selectorFilesByCommand[commandRef] = selectorFilesForCommand(selectorReport, commandRef);
    if (projectionMode === "legacy") {
      analysisByCommand[commandRef] = structuredClone(commandAnalyzer(commandRef, { packageScripts }));
    }
  }
  const filesForCommand = (commandRef) => {
    const analyzed = analysisByCommand[commandRef]?.testFiles || [];
    return analyzed.length > 0 ? analyzed : selectorFilesByCommand[commandRef] || [];
  };
  const plannedCanonicalLeaves = plannedLeavesFromProjection(plannedCommands, projection, projectionMode);
  const selectorRecommendedFiles = stableUnique(recommendedCommands.flatMap((commandRef) => (
    (selectorFilesByCommand[commandRef] || []).length > 0
      ? selectorFilesByCommand[commandRef]
      : filesForCommand(commandRef)
  )));

  return {
    schemaVersion: 1,
    kind: "verification-profile-prepared-plan",
    selectorAdaptiveMode: String(selectorReport?.adaptiveMode || ""),
    recommendedCommands,
    plannedCommands,
    executionProjection: projection,
    plannedCanonicalLeaves,
    selectorRecommendedFiles,
    plannedFiles: projectionMode === "canonical"
      ? stableUnique(projection.flatMap(projectionTestFiles))
      : stableUnique(plannedCanonicalLeaves.flatMap(filesForCommand)),
    projectionMode,
    analysisByCommand,
    selectorFilesByCommand,
  };
}

function profileObserverFailure(error, phase) {
  return {
    phase,
    code: String(error?.code || "verification-profile-observer-error"),
    message: String(error?.message || error),
  };
}

export function publishVerificationProfileSafely({
  outputPath,
  buildProfile,
  writeProfile,
  previousDiagnostic = null,
}) {
  let profile = null;
  let failure = null;
  try {
    profile = buildProfile();
  } catch (error) {
    failure = profileObserverFailure(error, "build");
  }
  if (!failure) {
    try {
      writeProfile(outputPath, profile);
    } catch (error) {
      failure = profileObserverFailure(error, "publish");
    }
  }
  const previousFailureCount = Number(previousDiagnostic?.failureCount || 0);
  return {
    profile,
    diagnostic: {
      schemaVersion: 1,
      kind: "verification-profile-observer-diagnostic",
      outputPath: String(outputPath || ""),
      status: failure ? "error" : "published",
      attempts: Number(previousDiagnostic?.attempts || 0) + 1,
      failureCount: previousFailureCount + (failure ? 1 : 0),
      lastFailure: failure || previousDiagnostic?.lastFailure || null,
    },
  };
}

export function buildVerificationProfile({
  runnerId,
  selectorReport = null,
  executionPlan = null,
  executionProjection = executionPlan?.verificationProfileProjection
    || executionPlan?.executionProjection
    || [],
  executionResults = [],
  packageScripts = {},
  preparedPlan = null,
  runnerState = "",
  terminalState = "",
  interruptionSignal = null,
  prCostTiming = {},
} = {}) {
  const prepared = preparedPlan || prepareVerificationProfilePlan({
    selectorReport,
    executionPlan,
    executionProjection,
    executionResults,
    packageScripts,
  });
  const recommendedCommands = prepared.recommendedCommands || [];
  const plannedCommands = prepared.plannedCommands || [];
  const projection = prepared.executionProjection || [];
  const canonicalProjection = prepared.projectionMode === "canonical";
  const resultEntries = (executionResults || [])
    .filter((entry) => entry && entry.status !== "pending")
    .map((entry) => structuredClone(entry));
  const accountedCommands = stableValues(resultEntries.map(commandRefOf).filter(Boolean));
  const cacheMissEntries = resultEntries.filter((entry) => cacheOutcome(entry) === "miss");
  const processStartedEntries = cacheMissEntries.filter(processWasStarted);
  const processStartedCommands = stableValues(processStartedEntries.map(commandRefOf).filter(Boolean));
  const analysisByCommand = prepared.analysisByCommand || {};
  const filesForCommand = (commandRef) => {
    const analyzed = analysisByCommand[commandRef]?.testFiles || [];
    return analyzed.length > 0
      ? analyzed
      : prepared.selectorFilesByCommand?.[commandRef] || [];
  };
  const projectionForExecution = (executionRef) => projection
    .filter((entry) => entry.executionGroupRef === executionRef || entry.groupId === executionRef);
  const leavesForExecutionCommand = (executionRef) => {
    const projected = projection
      .filter((entry) => entry.executionGroupRef === executionRef || entry.groupId === executionRef)
      .map((entry) => entry.canonicalLeafRef);
    return projected.length > 0 ? projected : [executionRef];
  };
  const rootsForExecutionCommand = (executionRef) => {
    const projected = stableUnique(
      projection
        .filter((entry) => entry.executionGroupRef === executionRef || entry.groupId === executionRef)
        .flatMap((entry) => entry.sourceRootRefs || [entry.rootCommandRef]),
    );
    return projected.length > 0 ? projected : [executionRef];
  };
  const plannedCanonicalLeaves = prepared.plannedCanonicalLeaves
    || plannedLeavesFromProjection(plannedCommands, projection, prepared.projectionMode);
  const accountedCanonicalLeaves = stableValues(
    resultEntries.flatMap((entry) => leavesForExecutionCommand(executionIdentityOf(entry))),
  );
  const filesForExecutionCommand = (executionRef) => {
    if (canonicalProjection) return projectionForExecution(executionRef).flatMap(projectionTestFiles);
    return leavesForExecutionCommand(executionRef).flatMap(filesForCommand);
  };
  const selectorRecommendedFiles = prepared.selectorRecommendedFiles || [];
  const plannedFiles = prepared.plannedFiles || [];
  const actualFiles = stableUnique(
    processStartedEntries.flatMap((entry) => (
      Array.isArray(entry.actualFiles)
        ? entry.actualFiles.map(normalizeVerificationTestFile)
        : filesForExecutionCommand(executionIdentityOf(entry))
    )),
  );
  const missingCommands = multisetDifference(plannedCanonicalLeaves, accountedCanonicalLeaves);
  const unexpectedCommands = multisetDifference(accountedCanonicalLeaves, plannedCanonicalLeaves);
  const accountedRootCommands = stableUnique(
    resultEntries.flatMap((entry) => rootsForExecutionCommand(executionIdentityOf(entry))),
  );
  const rootMissingCommands = multisetDifference(plannedCommands, accountedRootCommands);
  const rootUnexpectedCommands = multisetDifference(accountedRootCommands, plannedCommands);
  const comparisonStatus = prepared.selectorAdaptiveMode === "dry-run"
    || new Set(["listed", "planned"]).has(String(runnerState || "").toLowerCase())
    ? "not-executed"
    : missingCommands.length === 0 && unexpectedCommands.length === 0
      ? canonicalProjection ? "complete" : "equivalent"
      : "partial";

  const processStarts = emptyProcessStarts();
  const fileMap = new Map();
  const commandWallTimes = [];
  let metaVerificationWallTimeMs = 0;
  let productTestWallTimeMs = 0;
  for (const entry of processStartedEntries) {
    const commandRef = commandRefOf(entry);
    const executionRef = executionIdentityOf(entry);
    if (canonicalProjection) {
      const processClass = projectionForExecution(executionRef)[0]?.processClass || "unclassified";
      if (Object.hasOwn(processStarts, processClass)) processStarts[processClass] += 1;
      else processStarts.unclassified += 1;
    } else {
      const analysis = analysisByCommand[commandRef] || defaultMissingAnalysis(commandRef);
      for (const key of Object.keys(processStarts)) {
        processStarts[key] += Number(analysis.processStarts[key] || 0);
      }
    }
    const files = Array.isArray(entry.actualFiles)
      ? stableUnique(entry.actualFiles.map(normalizeVerificationTestFile))
      : canonicalProjection
        ? stableUnique(filesForExecutionCommand(executionRef))
        : filesForExecutionCommand(executionRef);
    const wallTimeMs = nonNegativeDuration(entry.durationMs);
    const classification = classifyCommand(commandRef, files);
    if (classification === "meta-verification") metaVerificationWallTimeMs += wallTimeMs;
    else productTestWallTimeMs += wallTimeMs;
    commandWallTimes.push({
      commandRef,
      status: String(entry.status || "unknown"),
      wallTimeMs,
      classification,
      testFiles: stableUnique(files),
    });
    for (const file of files) {
      const current = fileMap.get(file) || {
        file,
        classification: classifyVerificationTestFile(file),
        executionCount: 0,
        inclusiveWallTimeMs: 0,
      };
      current.executionCount += 1;
      current.inclusiveWallTimeMs += wallTimeMs;
      fileMap.set(file, current);
    }
  }
  const files = [...fileMap.values()].sort((left, right) => left.file.localeCompare(right.file));
  const sortedCommandWallTimes = commandWallTimes
    .sort((left, right) => left.commandRef.localeCompare(right.commandRef));
  const cacheHits = resultEntries.filter((entry) => cacheOutcome(entry) === "hit");
  const state = inferProfileState({
    selectorReport,
    executionResults: resultEntries,
    runnerState,
    terminalState,
  });
  const failedCommandRef = commandRefOf(
    resultEntries.find(entryFailed),
  ) || null;
  const observedInterruptionSignal = interruptionSignal
    || resultEntries.find((entry) => entry.signal)?.signal
    || null;
  const resultsByExecution = new Map(resultEntries.map((entry) => [executionIdentityOf(entry), entry]));
  const evidenceByGroup = new Map();
  for (const row of projection) {
    const groupRef = row.executionGroupRef;
    const current = evidenceByGroup.get(groupRef) || {
      rootCommandRef: row.rootCommandRef,
      sourceRootRefs: [],
      canonicalLeafRefs: [],
      leafIds: [],
      kind: row.kind,
      executionGroupRef: groupRef,
      groupId: row.groupId,
      files: [],
      modules: [],
      specs: [],
      processRef: row.processRef,
      processClass: row.processClass,
      isolation: row.isolation,
      disposition: row.disposition,
      executionOwner: row.executionOwner,
      executionOwners: [],
      platforms: [],
      resourceLocks: [],
      routeIds: [],
      safetyContributorRouteIds: [],
      provenance: structuredClone(row.provenance),
      dependencyEdges: structuredClone(row.dependencyEdges),
      sourceOrder: row.sourceOrder,
    };
    current.sourceRootRefs = stableUnique([...current.sourceRootRefs, ...row.sourceRootRefs]);
    current.canonicalLeafRefs = stableValues([...current.canonicalLeafRefs, row.canonicalLeafRef]);
    current.leafIds = stableValues([...current.leafIds, row.leafId]);
    current.files = stableUnique([...current.files, ...row.files]);
    current.modules = stableUnique([...current.modules, ...row.modules]);
    current.specs = stableUnique([...current.specs, ...row.specs]);
    current.executionOwners = stableUnique([...current.executionOwners, ...row.executionOwners]);
    current.platforms = stableUnique([...current.platforms, ...row.platforms]);
    current.resourceLocks = stableUnique([...current.resourceLocks, ...row.resourceLocks]);
    current.routeIds = stableUnique([...current.routeIds, ...row.routeIds]);
    current.safetyContributorRouteIds = stableUnique([
      ...current.safetyContributorRouteIds,
      ...row.safetyContributorRouteIds,
    ]);
    current.sourceOrder = Math.min(current.sourceOrder, row.sourceOrder);
    evidenceByGroup.set(groupRef, current);
  }
  const executionEvidence = [...evidenceByGroup.values()]
    .sort((left, right) => left.sourceOrder - right.sourceOrder || left.groupId.localeCompare(right.groupId))
    .map((entry) => {
      const result = resultsByExecution.get(entry.executionGroupRef);
      if (!result) return entry;
      return {
        ...entry,
        processStarted: result.processStarted === true,
        interrupted: result.interrupted === true || Boolean(result.signal),
        exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
        status: String(result.status || "unknown"),
        actualFiles: Array.isArray(result.actualFiles)
          ? stableUnique(result.actualFiles.map(normalizeVerificationTestFile))
          : stableUnique(projectionForExecution(entry.executionGroupRef).flatMap(projectionTestFiles)),
      };
    });
  const gatePolicy = profileGatePolicyBinding(selectorReport, executionPlan);
  const prCost = buildPrCostObservation({
    selectorReport,
    executionPlan,
    executionResults,
    timingInputs: prCostTiming,
  });

  return {
    schemaVersion: VERIFICATION_PROFILE_SCHEMA_VERSION,
    kind: VERIFICATION_PROFILE_KIND,
    runnerId: String(runnerId || "unknown"),
    gatePolicy,
    prCost,
    lifecycle: {
      state,
      terminal: TERMINAL_PROFILE_STATES.has(state),
      failedCommandRef,
      interruptionSignal: observedInterruptionSignal ? String(observedInterruptionSignal) : null,
    },
    selection: {
      selectorRecommendedCommands: recommendedCommands,
      selectorRecommendedCommandCount: recommendedCommands.length,
      selectorRecommendedFiles,
      selectorRecommendedUniqueFileCount: selectorRecommendedFiles.length,
      plannedCommands,
      plannedCommandCount: plannedCommands.length,
      plannedCanonicalLeaves,
      plannedCanonicalLeafCount: plannedCanonicalLeaves.length,
      plannedFiles,
      plannedUniqueFileCount: plannedFiles.length,
      executionProjection: projection,
      accountedCommands,
      accountedCommandCount: accountedCommands.length,
      accountedRootCommands,
      accountedRootCommandCount: accountedRootCommands.length,
      accountedCanonicalLeaves,
      accountedCanonicalLeafCount: accountedCanonicalLeaves.length,
      processStartedCommands,
      processStartedCommandCount: processStartedCommands.length,
      actualFiles,
      actualUniqueFileCount: actualFiles.length,
      executionSetComparison: {
        status: comparisonStatus,
        missingCommands,
        unexpectedCommands,
      },
      rootExecutionSetComparison: {
        status: comparisonStatus === "not-executed"
          ? "not-executed"
          : rootMissingCommands.length === 0 && rootUnexpectedCommands.length === 0
            ? canonicalProjection ? "complete" : "equivalent"
            : "partial",
        missingCommands: rootMissingCommands,
        unexpectedCommands: rootUnexpectedCommands,
      },
    },
    processStarts: {
      ...processStarts,
      total: Object.values(processStarts).reduce((sum, count) => sum + count, 0),
    },
    cache: {
      hits: cacheHits.length,
      misses: cacheMissEntries.length,
      unobserved: missingCommands.length,
      hitCommands: stableValues(cacheHits.map(commandRefOf).filter(Boolean)),
      missCommands: stableValues(cacheMissEntries.map(commandRefOf).filter(Boolean)),
    },
    timings: {
      totalCommandWallTimeMs: sortedCommandWallTimes.reduce((sum, entry) => sum + entry.wallTimeMs, 0),
      metaVerificationWallTimeMs,
      productTestWallTimeMs,
      commandWallTimes: sortedCommandWallTimes,
      slowestCommands: [...sortedCommandWallTimes]
        .sort((left, right) => slowestFirst(left, right))
        .slice(0, 10),
      slowestFiles: [...files]
        .sort((left, right) => slowestFirst(left, right, "inclusiveWallTimeMs", "file"))
        .slice(0, 10),
    },
    files,
    executionEvidence,
    analysisIssues: stableUnique(
      Object.values(analysisByCommand).flatMap((analysis) => analysis.analysisIssues),
    ),
  };
}

export function formatVerificationProfile(profile) {
  return `${JSON.stringify(profile, null, 2)}\n`;
}
