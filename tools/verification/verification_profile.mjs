import path from "node:path";

export const VERIFICATION_PROFILE_SCHEMA_VERSION = 1;
export const VERIFICATION_PROFILE_KIND = "verification-profile";
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

function nonNegativeDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
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
  for (const entry of executionProjection || []) {
    const rootCommandRef = commandRefOf(entry?.rootCommandRef);
    const inheritedGroupRef = commandRefOf(entry?.executionGroupRef) || rootCommandRef;
    const nestedLeaves = Array.isArray(entry?.canonicalLeaves) ? entry.canonicalLeaves : null;
    if (nestedLeaves) {
      for (const leaf of nestedLeaves) {
        const canonicalLeafRef = commandRefOf(leaf?.canonicalLeafRef || leaf?.commandRef || leaf);
        const executionGroupRef = commandRefOf(leaf?.executionGroupRef) || inheritedGroupRef;
        if (rootCommandRef && canonicalLeafRef && executionGroupRef) {
          rows.push({ rootCommandRef, canonicalLeafRef, executionGroupRef });
        }
      }
      continue;
    }
    const canonicalLeafRef = commandRefOf(entry?.canonicalLeafRef);
    const executionGroupRef = commandRefOf(entry?.executionGroupRef) || rootCommandRef;
    if (rootCommandRef && canonicalLeafRef && executionGroupRef) {
      rows.push({ rootCommandRef, canonicalLeafRef, executionGroupRef });
    }
  }
  const projectedRoots = new Set(rows.map((entry) => entry.rootCommandRef));
  for (const rootCommandRef of stableUnique(plannedCommands)) {
    if (!projectedRoots.has(rootCommandRef)) {
      rows.push({
        rootCommandRef,
        canonicalLeafRef: rootCommandRef,
        executionGroupRef: rootCommandRef,
      });
    }
  }
  return rows.sort((left, right) => (
    left.rootCommandRef.localeCompare(right.rootCommandRef)
    || left.canonicalLeafRef.localeCompare(right.canonicalLeafRef)
    || left.executionGroupRef.localeCompare(right.executionGroupRef)
  ));
}

function plannedLeavesFromProjection(plannedCommands, projection) {
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
    analysisByCommand[commandRef] = structuredClone(commandAnalyzer(commandRef, { packageScripts }));
    selectorFilesByCommand[commandRef] = selectorFilesForCommand(selectorReport, commandRef);
  }
  const filesForCommand = (commandRef) => {
    const analyzed = analysisByCommand[commandRef]?.testFiles || [];
    return analyzed.length > 0 ? analyzed : selectorFilesByCommand[commandRef] || [];
  };
  const plannedCanonicalLeaves = plannedLeavesFromProjection(plannedCommands, projection);
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
    plannedFiles: stableUnique(plannedCanonicalLeaves.flatMap(filesForCommand)),
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
  const leavesForExecutionCommand = (commandRef) => {
    const projected = projection
      .filter((entry) => entry.executionGroupRef === commandRef)
      .map((entry) => entry.canonicalLeafRef);
    return projected.length > 0 ? projected : [commandRef];
  };
  const rootsForExecutionCommand = (commandRef) => {
    const projected = stableUnique(
      projection
        .filter((entry) => entry.executionGroupRef === commandRef)
        .map((entry) => entry.rootCommandRef),
    );
    return projected.length > 0 ? projected : [commandRef];
  };
  const plannedCanonicalLeaves = prepared.plannedCanonicalLeaves
    || plannedLeavesFromProjection(plannedCommands, projection);
  const accountedCanonicalLeaves = stableValues(
    resultEntries.flatMap((entry) => leavesForExecutionCommand(commandRefOf(entry))),
  );
  const filesForExecutionCommand = (commandRef) => (
    leavesForExecutionCommand(commandRef).flatMap(filesForCommand)
  );
  const selectorRecommendedFiles = prepared.selectorRecommendedFiles || [];
  const plannedFiles = prepared.plannedFiles || [];
  const actualFiles = stableUnique(
    processStartedEntries.flatMap((entry) => filesForExecutionCommand(commandRefOf(entry))),
  );
  const missingCommands = multisetDifference(plannedCanonicalLeaves, accountedCanonicalLeaves);
  const unexpectedCommands = multisetDifference(accountedCanonicalLeaves, plannedCanonicalLeaves);
  const accountedRootCommands = stableValues(
    resultEntries.flatMap((entry) => rootsForExecutionCommand(commandRefOf(entry))),
  );
  const rootMissingCommands = multisetDifference(plannedCommands, accountedRootCommands);
  const rootUnexpectedCommands = multisetDifference(accountedRootCommands, plannedCommands);
  const comparisonStatus = prepared.selectorAdaptiveMode === "dry-run"
    || new Set(["listed", "planned"]).has(String(runnerState || "").toLowerCase())
    ? "not-executed"
    : missingCommands.length === 0 && unexpectedCommands.length === 0
      ? "equivalent"
      : "partial";

  const processStarts = emptyProcessStarts();
  const fileMap = new Map();
  const commandWallTimes = [];
  let metaVerificationWallTimeMs = 0;
  let productTestWallTimeMs = 0;
  for (const entry of processStartedEntries) {
    const commandRef = commandRefOf(entry);
    const analysis = analysisByCommand[commandRef] || defaultMissingAnalysis(commandRef);
    for (const key of Object.keys(processStarts)) {
      processStarts[key] += Number(analysis.processStarts[key] || 0);
    }
    const files = filesForExecutionCommand(commandRef);
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

  return {
    schemaVersion: VERIFICATION_PROFILE_SCHEMA_VERSION,
    kind: VERIFICATION_PROFILE_KIND,
    runnerId: String(runnerId || "unknown"),
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
            ? "equivalent"
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
    analysisIssues: stableUnique(
      Object.values(analysisByCommand).flatMap((analysis) => analysis.analysisIssues),
    ),
  };
}

export function formatVerificationProfile(profile) {
  return `${JSON.stringify(profile, null, 2)}\n`;
}
