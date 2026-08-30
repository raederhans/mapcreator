import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VERIFICATION_METADATA_SOURCE,
  VERIFICATION_METADATA_SOURCE_IDENTITY,
} from "./verification_catalog_source.mjs";
import { analyzeVerificationCommand } from "./verification_profile.mjs";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export const DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_VERSION = 1;
export const DEPENDENCY_CHECKOUT_PROFILE_KIND = "dependency-checkout-profile-report";
export const DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_REF =
  "tools/verification/dependency_checkout_profile.schema.json";
export const DEPENDENCY_PROFILE_IDS = Object.freeze([
  "node-only",
  "python-stdlib",
  "python-core",
  "python-geo",
  "browser",
]);
export const PYTHON_GEO_IMPORT_ROOTS = Object.freeze([
  "geopandas",
  "numpy",
  "pyproj",
  "rasterio",
  "shapely",
  "topojson",
]);

export const DEPENDENCY_PROFILE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "node-only",
    selection: "node command closure without Python or browser ownership",
    nodeInstall: "npm-ci",
    pythonInstall: "none",
    browserInstall: "none",
  }),
  Object.freeze({
    id: "python-stdlib",
    selection: "static recursive Python import closure is stdlib-only",
    nodeInstall: "as-required-by-wrapper",
    pythonInstall: "requirements-ci-min.lock.txt",
    browserInstall: "none",
  }),
  Object.freeze({
    id: "python-core",
    selection: "Python closure requires non-geo third-party packages or lacks a complete stdlib proof",
    nodeInstall: "as-required-by-wrapper",
    pythonInstall: "generated-minimal-lock",
    browserInstall: "none",
  }),
  Object.freeze({
    id: "python-geo",
    selection: "canonical heavy geo group or heavy-geo resource lock",
    nodeInstall: "as-required-by-wrapper",
    pythonInstall: "requirements-dev.lock.txt",
    browserInstall: "none",
  }),
  Object.freeze({
    id: "browser",
    selection: "canonical browser/playwright resource ownership",
    nodeInstall: "npm-ci",
    pythonInstall: "derive-from-owned-Python-roots",
    browserInstall: "playwright-chromium",
  }),
]);

export const CHECKOUT_PROFILE_RULES = Object.freeze([
  Object.freeze({
    id: "ordinary-lane",
    precedence: 4,
    checkoutMode: "repository",
    fetchDepth: 1,
    condition: "lane has no history comparison, P4 baseline, or closeout bundle requirement",
  }),
  Object.freeze({
    id: "history-comparison",
    precedence: 3,
    checkoutMode: "repository",
    fetchDepth: 2,
    condition: "lane compares the target with its first parent only",
  }),
  Object.freeze({
    id: "p4-explicit-baseline",
    precedence: 2,
    checkoutMode: "repository-plus-explicit-fetch",
    fetchDepth: 1,
    condition: "P4 lane declares each required baseline ref and fetch depth explicitly",
  }),
  Object.freeze({
    id: "closeout-validator-bundle",
    precedence: 1,
    checkoutMode: "artifact-bundle-or-shallow-repository",
    fetchDepth: 1,
    condition: "no-checkout requires a complete identity-bound validator bundle",
  }),
]);

const CLOSEOUT_BUNDLE_CONDITIONS = Object.freeze([
  "manifestValidated",
  "artifactIdentityBound",
  "allInputsArtifactLocal",
  "immutableDownloadNames",
  "runtimeProvided",
]);

function immutableBaselineRef(value) {
  return /^[0-9a-f]{40}$/iu.test(value)
    || /^\$\{\{\s*github\.sha\s*\}\}$/u.test(value);
}

function stableUnique(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function normalizeCommandRef(value) {
  return String(value || "")
    .trim()
    .replace(/^npm\s+run(?:\s+-s)?\s+/u, "")
    .replace(/\s+--.*$/u, "");
}

function commandRecords(metadataSource) {
  const byCommand = new Map();
  for (const record of metadataSource.records || []) {
    const commandRef = String(record.commandRef || "").trim();
    if (!commandRef) continue;
    const current = byCommand.get(commandRef) || {
      commandRef,
      recordIds: [],
      sourceRefs: [],
      resourceLocks: [],
    };
    current.recordIds.push(record.id);
    current.sourceRefs.push(...record.sourceRefs);
    current.resourceLocks.push(...record.resourceLocks);
    byCommand.set(commandRef, current);
  }
  return [...byCommand.values()].map((entry) => ({
    ...entry,
    recordIds: stableUnique(entry.recordIds),
    sourceRefs: stableUnique(entry.sourceRefs),
    resourceLocks: stableUnique(entry.resourceLocks),
  })).sort((left, right) => left.commandRef.localeCompare(right.commandRef));
}

function pythonRootsForCommand(entry, analysis) {
  const directPythonPaths = analysis.leafCommands.flatMap((command) => (
    [...String(command).matchAll(/\b(?:tests|tools)\/[A-Za-z0-9_./-]+\.py\b/gu)].map((match) => match[0])
  ));
  const analyzedTests = analysis.testFiles.filter((file) => file.endsWith(".py"));
  const canonicalPythonRefs = entry.sourceRefs.filter((sourceRef) => (
    /^(?:tests|tools)\/[A-Za-z0-9_./-]+\.py$/u.test(sourceRef)
  ));
  const preferred = stableUnique([...directPythonPaths, ...analyzedTests]);
  return preferred.length > 0 ? preferred : stableUnique(canonicalPythonRefs);
}

export function deriveCanonicalProfileInputs(metadataSource = VERIFICATION_METADATA_SOURCE) {
  const geoPatterns = new Set((metadataSource.projectionAuthority?.heavyDependencyGroups || [])
    .filter((group) => group.id === "geo_stack")
    .flatMap((group) => group.patterns));
  const commands = commandRecords(metadataSource).map((entry) => {
    const analysis = analyzeVerificationCommand(entry.commandRef, {
      packageScripts: metadataSource.packageScripts,
    });
    return {
      ...entry,
      leafCommands: analysis.leafCommands,
      processStarts: analysis.processStarts,
      analysisIssues: analysis.analysisIssues,
      pythonRoots: pythonRootsForCommand(entry, analysis),
      canonicalGeo: entry.resourceLocks.includes("heavy-geo")
        || entry.sourceRefs.some((sourceRef) => geoPatterns.has(sourceRef)),
      canonicalBrowser: entry.resourceLocks.includes("browser-dev-server")
        || entry.resourceLocks.includes("playwright-browser")
        || analysis.processStarts.playwright > 0,
    };
  });
  const p4BoundaryCommandRefs = stableUnique(commands
    .map((entry) => entry.commandRef)
    .filter((commandRef) => commandRef.startsWith("test:python:p4:")));
  const pythonRoots = stableUnique(commands.flatMap((entry) => entry.pythonRoots));
  return { commands, p4BoundaryCommandRefs, pythonRoots };
}

function rootAuditMap(pythonAudit) {
  return new Map((pythonAudit?.roots || []).map((entry) => [entry.path, entry]));
}

function commandUsesPython(entry) {
  return entry.pythonRoots.length > 0
    || entry.processStarts.python > 0
    || entry.commandRef.startsWith("test:python:")
    || entry.commandRef.startsWith("test:py:");
}

function profileForCommand(entry, auditsByRoot) {
  if (entry.canonicalBrowser) return "browser";
  const usesPython = commandUsesPython(entry);
  if (!usesPython) {
    return entry.processStarts.node > 0 || entry.leafCommands.some((command) => /^node\b/u.test(command))
      ? "node-only"
      : null;
  }
  const audits = entry.pythonRoots.map((root) => auditsByRoot.get(root)).filter(Boolean);
  const thirdPartyImports = stableUnique(audits.flatMap((audit) => audit.thirdPartyImports || []));
  if (entry.canonicalGeo || thirdPartyImports.some((name) => PYTHON_GEO_IMPORT_ROOTS.includes(name))) {
    return "python-geo";
  }
  if (entry.pythonRoots.length > 0
    && audits.length === entry.pythonRoots.length
    && audits.every((audit) => audit.verdict === "stdlib-only")) {
    return "python-stdlib";
  }
  return "python-core";
}

export function deriveDependencyAssignments(canonical, pythonAudit) {
  const auditsByRoot = rootAuditMap(pythonAudit);
  return canonical.commands.map((entry) => ({
    commandRef: entry.commandRef,
    profileId: profileForCommand(entry, auditsByRoot),
    pythonRoots: entry.pythonRoots,
    recordIds: entry.recordIds,
  }));
}

function pythonCandidates() {
  return process.platform === "win32"
    ? [{ command: "py", args: ["-3"] }, { command: "python", args: [] }]
    : [{ command: "python3", args: [] }, { command: "python", args: [] }];
}

export function runPythonImportClosureAudit(paths, {
  cwd = REPO_ROOT,
  runner = spawnSync,
} = {}) {
  const script = path.join("tools", "verification", "python_import_closure.py");
  let lastError = null;
  for (const candidate of pythonCandidates()) {
    const result = runner(candidate.command, [
      ...candidate.args,
      script,
      "--root",
      cwd,
      "--stdin",
    ], {
      cwd,
      input: JSON.stringify(stableUnique(paths)),
      encoding: "utf8",
      shell: false,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result?.error?.code === "ENOENT") {
      lastError = result.error;
      continue;
    }
    if (result?.error) throw result.error;
    if (![0, 2].includes(result.status)) {
      throw new Error(`python-import-closure-audit-failed:${result.status}:${result.stderr || ""}`);
    }
    return JSON.parse(String(result.stdout || "{}"));
  }
  throw lastError || new Error("python-import-closure-interpreter-missing");
}

export function selectCheckoutProfile({
  laneKind = "ordinary",
  comparesFirstParent = false,
  p4BaselineFetches = [],
  closeoutValidatorBundle = null,
} = {}) {
  if (laneKind === "closeout-validator") {
    const unmetConditions = CLOSEOUT_BUNDLE_CONDITIONS.filter(
      (condition) => closeoutValidatorBundle?.[condition] !== true,
    );
    if (closeoutValidatorBundle?.requiresRepositoryRead !== false) {
      unmetConditions.push("requiresRepositoryRead=false");
    }
    return unmetConditions.length === 0
      ? {
          profileId: "closeout-validator-bundle",
          checkoutMode: "no-checkout",
          fetchDepth: null,
          unmetConditions: [],
        }
      : {
          profileId: "closeout-validator-bundle",
          checkoutMode: "repository",
          fetchDepth: 1,
          unmetConditions: stableUnique(unmetConditions),
        };
  }
  if (laneKind === "p4") {
    const fetches = (p4BaselineFetches || []).map((entry) => ({
      reason: String(entry?.reason || "").trim(),
      ref: String(entry?.ref || "").trim(),
      depth: Number(entry?.depth),
    }));
    const invalid = fetches.filter((entry) => (
      !entry.reason
      || !immutableBaselineRef(entry.ref)
      || !Number.isInteger(entry.depth)
      || entry.depth < 1
    ));
    return {
      profileId: "p4-explicit-baseline",
      checkoutMode: "repository-plus-explicit-fetch",
      fetchDepth: 1,
      baselineFetches: fetches,
      status: fetches.length > 0 && invalid.length === 0 ? "ready" : "blocked",
      blockReason: fetches.length === 0
        ? "p4-explicit-baseline-fetch-missing"
        : invalid.length > 0 ? "p4-explicit-baseline-fetch-invalid" : null,
    };
  }
  if (comparesFirstParent) {
    return {
      profileId: "history-comparison",
      checkoutMode: "repository",
      fetchDepth: 2,
    };
  }
  return {
    profileId: "ordinary-lane",
    checkoutMode: "repository",
    fetchDepth: 1,
  };
}

function timingRows(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.commandWallTimes)) return input.commandWallTimes;
  if (Array.isArray(input?.timings?.commandWallTimes)) return input.timings.commandWallTimes;
  return [];
}

export function recommendP4BoundaryLanes(commandRefs, timingInput, {
  twoLaneMinimumTotalMs = 60_000,
  twoLaneMinimumReductionRatio = 0.15,
} = {}) {
  const normalizedRefs = stableUnique(commandRefs.map(normalizeCommandRef));
  const observedByCommand = new Map(timingRows(timingInput).map((entry) => [
    normalizeCommandRef(entry.commandRef),
    Number(entry.commandWallTimeMs ?? entry.wallTimeMs),
  ]).filter(([, duration]) => Number.isFinite(duration) && duration >= 0));
  const missingCommandRefs = normalizedRefs.filter((commandRef) => !observedByCommand.has(commandRef));
  const observed = normalizedRefs.filter((commandRef) => observedByCommand.has(commandRef)).map((commandRef) => ({
    commandRef,
    commandWallTimeMs: observedByCommand.get(commandRef),
  }));
  const oneLaneTotalMs = observed.reduce((sum, entry) => sum + entry.commandWallTimeMs, 0);
  const oneLane = [{
    laneId: "p4-boundaries-1",
    commandRefs: [...normalizedRefs],
    observedCommandWallTimeMs: oneLaneTotalMs,
  }];
  if (missingCommandRefs.length > 0 || observed.length < 2) {
    return {
      status: "insufficient-command-wall-time",
      basis: "commandWallTimeMs",
      observedCommandCount: observed.length,
      missingCommandRefs,
      recommendedLaneCount: 1,
      lanes: oneLane,
      oneLaneCriticalPathMs: oneLaneTotalMs,
      twoLaneCriticalPathMs: null,
    };
  }
  const twoLane = [
    { laneId: "p4-boundaries-1", commandRefs: [], observedCommandWallTimeMs: 0 },
    { laneId: "p4-boundaries-2", commandRefs: [], observedCommandWallTimeMs: 0 },
  ];
  for (const entry of [...observed].sort((left, right) => (
    right.commandWallTimeMs - left.commandWallTimeMs || left.commandRef.localeCompare(right.commandRef)
  ))) {
    const lane = twoLane[0].observedCommandWallTimeMs <= twoLane[1].observedCommandWallTimeMs
      ? twoLane[0]
      : twoLane[1];
    lane.commandRefs.push(entry.commandRef);
    lane.observedCommandWallTimeMs += entry.commandWallTimeMs;
  }
  for (const lane of twoLane) lane.commandRefs.sort((left, right) => left.localeCompare(right));
  const twoLaneCriticalPathMs = Math.max(...twoLane.map((lane) => lane.observedCommandWallTimeMs));
  const reductionRatio = oneLaneTotalMs > 0 ? 1 - (twoLaneCriticalPathMs / oneLaneTotalMs) : 0;
  const recommendTwo = oneLaneTotalMs >= twoLaneMinimumTotalMs
    && reductionRatio >= twoLaneMinimumReductionRatio;
  return {
    status: "complete",
    basis: "commandWallTimeMs",
    observedCommandCount: observed.length,
    missingCommandRefs: [],
    recommendedLaneCount: recommendTwo ? 2 : 1,
    lanes: recommendTwo ? twoLane : oneLane,
    oneLaneCriticalPathMs: oneLaneTotalMs,
    twoLaneCriticalPathMs,
    projectedReductionRatio: reductionRatio,
  };
}

export function buildDependencyCheckoutProfileReport({
  metadataSource = VERIFICATION_METADATA_SOURCE,
  metadataSourceIdentity = VERIFICATION_METADATA_SOURCE_IDENTITY,
  pythonAudit = null,
  timingInput = null,
} = {}) {
  const canonical = deriveCanonicalProfileInputs(metadataSource);
  const effectiveAudit = pythonAudit || runPythonImportClosureAudit(canonical.pythonRoots);
  const auditsByRoot = rootAuditMap(effectiveAudit);
  const assignments = deriveDependencyAssignments(canonical, effectiveAudit);
  const profileCommands = Object.fromEntries(DEPENDENCY_PROFILE_IDS.map((profileId) => [
    profileId,
    stableUnique(assignments.filter((entry) => entry.profileId === profileId).map((entry) => entry.commandRef)),
  ]));
  const p4RootSet = stableUnique(canonical.commands
    .filter((entry) => canonical.p4BoundaryCommandRefs.includes(entry.commandRef))
    .flatMap((entry) => entry.pythonRoots));
  const p4RootAudits = p4RootSet.map((root) => auditsByRoot.get(root)).filter(Boolean);
  const p4Verdict = p4RootAudits.length === p4RootSet.length
    && p4RootSet.length > 0
    && p4RootAudits.every((entry) => entry.verdict === "stdlib-only")
    ? "stdlib-only"
    : "external-or-unresolved";
  return {
    schemaVersion: DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_VERSION,
    kind: DEPENDENCY_CHECKOUT_PROFILE_KIND,
    schemaRef: DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_REF,
    sourceBinding: {
      kind: metadataSource.kind,
      schemaVersion: metadataSource.schemaVersion,
      identity: structuredClone(metadataSourceIdentity),
      mode: "read-only",
    },
    dependencyProfiles: DEPENDENCY_PROFILE_DEFINITIONS.map((entry) => structuredClone(entry)),
    profileCommands,
    p4CheckerBoundaries: {
      commandRefs: canonical.p4BoundaryCommandRefs,
      pythonRoots: p4RootSet,
      verdict: p4Verdict,
      thirdPartyImports: stableUnique(p4RootAudits.flatMap((entry) => entry.thirdPartyImports || [])),
      unresolvedDynamicImports: stableUnique(p4RootAudits.flatMap((entry) => entry.unresolvedDynamicImports || [])),
      parseErrors: stableUnique(p4RootAudits.flatMap((entry) => entry.parseErrors || [])),
    },
    checkoutProfiles: CHECKOUT_PROFILE_RULES.map((entry) => structuredClone(entry)),
    closeoutNoCheckoutConditions: [...CLOSEOUT_BUNDLE_CONDITIONS, "requiresRepositoryRead=false"],
    laneRecommendation: recommendP4BoundaryLanes(canonical.p4BoundaryCommandRefs, timingInput),
    integrationGaps: [
      "workflow-consumers-not-wired",
      "canonical-route-registration-owned-by-integration",
    ],
  };
}

export function assertDependencyCheckoutProfileReport(report) {
  if (report?.schemaVersion !== DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_VERSION
    || report?.kind !== DEPENDENCY_CHECKOUT_PROFILE_KIND
    || report?.schemaRef !== DEPENDENCY_CHECKOUT_PROFILE_SCHEMA_REF
    || report?.sourceBinding?.mode !== "read-only"
    || JSON.stringify(report.dependencyProfiles?.map((entry) => entry.id)) !== JSON.stringify(DEPENDENCY_PROFILE_IDS)
    || !report?.profileCommands
    || !Array.isArray(report?.p4CheckerBoundaries?.commandRefs)
    || !Array.isArray(report?.checkoutProfiles)
    || ![1, 2].includes(report?.laneRecommendation?.recommendedLaneCount)) {
    throw new Error("dependency-checkout-profile-schema-invalid");
  }
  return report;
}

function parseArgs(argv) {
  const args = { jsonOut: "", timingProfile: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json-out") args.jsonOut = argv[++index] || "";
    else if (token === "--timing-profile") args.timingProfile = argv[++index] || "";
    else throw new Error(`Unknown dependency/checkout profile argument: ${token}`);
  }
  if (!args.jsonOut) throw new Error("dependency-checkout-profile-output-required");
  return args;
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const timingInput = args.timingProfile
      ? JSON.parse(fs.readFileSync(path.resolve(args.timingProfile), "utf8"))
      : null;
    const report = assertDependencyCheckoutProfileReport(buildDependencyCheckoutProfileReport({ timingInput }));
    const outputPath = path.resolve(args.jsonOut);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Dependency/checkout profiles written: ${outputPath}`);
    console.log(`P4 checker boundaries: ${report.p4CheckerBoundaries.verdict}`);
    console.log(`P4 boundary lane recommendation: ${report.laneRecommendation.recommendedLaneCount}`);
  } catch (error) {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  }
}
