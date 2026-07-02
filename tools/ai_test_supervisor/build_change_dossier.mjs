import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { discoverChangedFiles } from "../run_adaptive_tests.mjs";
import { buildRecommendation } from "../select_verification_targets.mjs";
import { buildLaneSummary } from "./command_lanes.mjs";
import { renderSupervisorMarkdown } from "./render_supervisor_markdown.mjs";

const REPO_ROOT = process.cwd();
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "supervisor-change-dossier.json");
const DEFAULT_DOMAIN_REGISTRY_PATH = path.join(REPO_ROOT, "tools", "ai_test_supervisor", "domain_registry.json");
const SUPERVISOR_ARTIFACTS = [
  ".runtime/reports/generated/supervisor-change-dossier.json",
  ".runtime/reports/generated/supervisor-plan.json",
  ".runtime/reports/generated/supervisor-plan.md",
];
const HIGH_RESOURCE_LOCKS = new Set([
  "browser-dev-server",
  "playwright-browser",
  "perf-dev-server",
  "dist",
  "scenario-data",
  "heavy-geo",
  "checkpoint-builder",
  ".runtime-output",
]);

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function toRepoPath(value) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  if (!normalized) return "";
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(REPO_ROOT, normalized);
  return path.relative(REPO_ROOT, resolved).split(path.sep).join("/").replace(/^\.\//, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readDomainRegistry(registryPath = DEFAULT_DOMAIN_REGISTRY_PATH) {
  return readJson(registryPath);
}

function gitOutput(args, fallback = "") {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) return fallback;
  return String(result.stdout || "").trim() || fallback;
}

function defaultBaseSha() {
  return gitOutput(["merge-base", "HEAD", "main"], gitOutput(["rev-parse", "HEAD^"], ""));
}

export function parseDossierArgs(argv = []) {
  const args = {
    changedFiles: [],
    includeBranchHistory: false,
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: "",
    printJson: false,
    baseSha: "",
    gitSha: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--changed-file") args.changedFiles.push(argv[++index]);
    else if (token === "--changed-files") args.changedFiles.push(...splitList(argv[++index]));
    else if (token === "--changed-files-list") args.changedFiles.push(...readLines(argv[++index]));
    else if (token === "--include-branch-history") args.includeBranchHistory = true;
    else if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
    else if (token === "--print-json") args.printJson = true;
    else if (token === "--base-sha") args.baseSha = argv[++index];
    else if (token === "--git-sha") args.gitSha = argv[++index];
    else if (token && !token.startsWith("--")) args.changedFiles.push(token);
    else throw new Error(`Unknown change dossier argument: ${token}`);
  }
  args.changedFiles = uniqueSorted(args.changedFiles.map(toRepoPath));
  return args;
}

export function discoverSupervisorChangedFiles({
  changedFiles = [],
  includeBranchHistory = false,
  runner,
} = {}) {
  const explicitChangedFiles = uniqueSorted(changedFiles.map(toRepoPath));
  if (explicitChangedFiles.length > 0) {
    return {
      changedFiles: explicitChangedFiles,
      discoveryMode: "explicit-input",
    };
  }
  return {
    changedFiles: uniqueSorted(discoverChangedFiles({ includeBranchHistory, runner }).map(toRepoPath)),
    discoveryMode: includeBranchHistory ? "workspace-plus-history" : "workspace-only",
  };
}

function suggestedRouteFor(file) {
  if (file === "package.json" || file.startsWith("tools/ai_test_supervisor/") || file.startsWith("tests/supervisor_")) return "test-routing";
  if (file.startsWith("tools/") || file.startsWith(".github/workflows/")) return "test-routing";
  if (file.startsWith("tests/e2e/")) return "playwright-observability";
  if (file.startsWith("tests/")) return "test-routing";
  if (file.startsWith("data/")) return "data-governance";
  if (file.startsWith("js/")) return "architecture-boundaries";
  if (file.startsWith("docs/testing/") || file === "AGENTS.md") return "test-routing";
  if (file.startsWith("docs/")) return "documentation-route";
  return "test-routing";
}

export function classifyRouteGap(filePath) {
  const file = toRepoPath(filePath);
  const suggestedRoute = suggestedRouteFor(file);
  if (
    file === "package.json"
    || file === "tools/run_adaptive_tests.mjs"
    || file === "tools/select_verification_targets.mjs"
    || file === "tools/test_route_registry.mjs"
    || file.startsWith(".github/workflows/")
    || file.startsWith("tools/")
    || file.startsWith("js/")
    || file.startsWith("data/")
  ) {
    return {
      file,
      severity: "critical",
      reason: "production, workflow, data, or verification tooling file has no adaptive route",
      suggestedRoute,
    };
  }
  if (file.startsWith("tests/e2e/")) {
    return {
      file,
      severity: "high",
      reason: "browser test file has no adaptive route",
      suggestedRoute,
    };
  }
  if (file.startsWith("tests/")) {
    return {
      file,
      severity: "medium",
      reason: "test file has no adaptive route",
      suggestedRoute,
    };
  }
  return {
    file,
    severity: file.startsWith("docs/") ? "low" : "medium",
    reason: "changed file has no adaptive route",
    suggestedRoute,
  };
}

function ensureDomainSummary(map, domainId, registryById) {
  if (!map.has(domainId)) {
    const registry = registryById.get(domainId) || {};
    map.set(domainId, {
      domainId,
      changedFiles: new Set(),
      recommendedChecks: new Set(),
      ownerHints: new Set(registry.ownerHints || []),
      preferredChildSafeChecks: new Set(registry.preferredChildSafeChecks || []),
      preferredMainThreadChecks: new Set(registry.preferredMainThreadChecks || []),
      riskSignals: new Set(registry.mainRiskSignals || []),
      evidenceArtifacts: new Set(registry.evidenceArtifacts || []),
    });
  }
  return map.get(domainId);
}

export function buildDomainSummaries(selectorReport = {}, registry = readDomainRegistry()) {
  const registryById = new Map((registry.domains || []).map((domain) => [domain.id, domain]));
  const summaries = new Map();

  for (const fileEntry of selectorReport.matchedByFile || []) {
    for (const command of fileEntry.recommendedCommands || []) {
      for (const domainId of command.domains || []) {
        const summary = ensureDomainSummary(summaries, domainId, registryById);
        summary.changedFiles.add(fileEntry.changedFile);
        summary.recommendedChecks.add(command.commandRef);
        for (const ownerHint of command.ownerHints || []) summary.ownerHints.add(ownerHint);
      }
    }
  }
  for (const impacted of selectorReport.impactedDomains || []) {
    ensureDomainSummary(summaries, impacted.domain, registryById);
  }

  return [...summaries.values()]
    .map((summary) => ({
      domainId: summary.domainId,
      changedFiles: uniqueSorted([...summary.changedFiles]),
      recommendedChecks: uniqueSorted([...summary.recommendedChecks]),
      ownerHints: uniqueSorted([...summary.ownerHints]),
      preferredChildSafeChecks: uniqueSorted([...summary.preferredChildSafeChecks]),
      preferredMainThreadChecks: uniqueSorted([...summary.preferredMainThreadChecks]),
      riskSignals: uniqueSorted([...summary.riskSignals]),
      evidenceArtifacts: uniqueSorted([...summary.evidenceArtifacts]),
    }))
    .sort((left, right) => left.domainId.localeCompare(right.domainId));
}

function isDocsOnly(files) {
  return files.length > 0 && files.every((file) => file.startsWith("docs/"));
}

function hasSupervisorSurface(files) {
  return files.some((file) => (
    file === "AGENTS.md"
    || file.startsWith("docs/testing/")
    || file.startsWith("tools/ai_test_supervisor/")
    || file.startsWith("tests/supervisor_")
    || file === "package.json"
  ));
}

function hasProductionOrTestSurface(files) {
  return files.some((file) => (
    file.startsWith("js/")
    || file.startsWith("backend/")
    || file.startsWith("map_builder/")
    || file.startsWith("scenario_builder/")
    || file.startsWith("data/")
    || file.startsWith("tools/")
    || file.startsWith("tests/")
  ));
}

export function deriveRiskLevel({
  changedFiles = [],
  routeGaps = [],
  laneSummary = {},
} = {}) {
  const files = uniqueSorted(changedFiles.map(toRepoPath));
  const reasons = [];
  if (routeGaps.some((gap) => gap.severity === "critical")) {
    reasons.push("critical route gap present");
    return { riskLevel: "critical", riskReasons: reasons };
  }
  if (routeGaps.some((gap) => gap.severity === "high")) {
    reasons.push("high-severity route gap present");
    return { riskLevel: "high", riskReasons: reasons };
  }
  if ((laneSummary.mainThreadCommands || []).length > 0) {
    reasons.push("main-thread verification is selected");
  }
  const locks = laneSummary.resourceLocks || [];
  const highLocks = locks.filter((lock) => HIGH_RESOURCE_LOCKS.has(lock));
  if (highLocks.length > 0) {
    reasons.push(`resource locks selected: ${highLocks.join(", ")}`);
  }
  if (reasons.length > 0) {
    return { riskLevel: "high", riskReasons: uniqueSorted(reasons) };
  }
  if (routeGaps.length > 0) {
    reasons.push("route gaps require selector follow-up");
    return { riskLevel: "medium", riskReasons: reasons };
  }
  if (hasSupervisorSurface(files) || hasProductionOrTestSurface(files)) {
    reasons.push("matched supervisor, production, or test surface changed");
    return { riskLevel: "medium", riskReasons: reasons };
  }
  if (isDocsOnly(files)) {
    reasons.push("docs-only matched change");
    return { riskLevel: "low", riskReasons: reasons };
  }
  return { riskLevel: files.length ? "low" : "low", riskReasons: files.length ? ["matched low-risk change"] : ["no changed files discovered"] };
}

function requiredArtifactsFor(domainSummaries, selectorReport) {
  return uniqueSorted([
    ...SUPERVISOR_ARTIFACTS,
    ...domainSummaries.flatMap((summary) => summary.evidenceArtifacts || []),
    ...(selectorReport.diagnosticNextSteps || []).flatMap((entry) => entry?.guidance?.diagnostics || []),
  ]);
}

function suggestedNextActionsFor({ routeGaps, laneSummary }) {
  const actions = [];
  if (routeGaps.length > 0) {
    actions.push("Add or update adaptive route coverage for unmatched files before execution.");
  }
  if ((laneSummary.childSafeCommands || []).length > 0) {
    actions.push("Run child-safe commands listed in the supervisor plan.");
  }
  if ((laneSummary.mainThreadCommands || []).length > 0) {
    actions.push("Reserve the main-thread lane before running browser, dist, perf, scenario-data, heavy-geo, or .runtime locking checks.");
  }
  if ((laneSummary.ciOnlyCommands || []).length > 0) {
    actions.push("Record CI-only commands as required external evidence.");
  }
  if (!actions.length) {
    actions.push("No supervisor commands selected; record the dry-run dossier as evidence.");
  }
  return actions;
}

export function buildChangeDossier({
  changedFiles = [],
  includeBranchHistory = false,
  selectorReport = null,
  domainRegistry = null,
  baseSha = "",
  gitSha = "",
  now = new Date(),
  runner,
} = {}) {
  const discovery = discoverSupervisorChangedFiles({ changedFiles, includeBranchHistory, runner });
  const normalizedChangedFiles = discovery.changedFiles;
  const selector = selectorReport || buildRecommendation(normalizedChangedFiles);
  const registry = domainRegistry || readDomainRegistry();
  const laneSummary = buildLaneSummary(selector);
  const routeGaps = uniqueSorted(selector.unmatchedChangedFiles || [])
    .map(classifyRouteGap);
  const domainSummaries = buildDomainSummaries(selector, registry);
  const risk = deriveRiskLevel({
    changedFiles: normalizedChangedFiles,
    routeGaps,
    laneSummary,
  });
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    gitSha: gitSha || gitOutput(["rev-parse", "HEAD"], "unknown"),
    baseSha: baseSha || defaultBaseSha() || "unknown",
    discoveryMode: discovery.discoveryMode,
    changedFiles: normalizedChangedFiles,
    selector,
    domainSummaries,
    routeGaps,
    riskLevel: risk.riskLevel,
    riskReasons: risk.riskReasons,
    laneSummary,
    requiredArtifacts: requiredArtifactsFor(domainSummaries, selector),
    suggestedNextActions: suggestedNextActionsFor({ routeGaps, laneSummary }),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function main(argv = process.argv.slice(2)) {
  const args = parseDossierArgs(argv);
  const dossier = buildChangeDossier(args);
  writeJson(args.jsonOut, dossier);
  if (args.mdOut) {
    fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
    fs.writeFileSync(args.mdOut, renderSupervisorMarkdown({ dossier }), "utf8");
  }
  if (args.printJson) {
    console.log(JSON.stringify(dossier, null, 2));
  } else {
    console.log(`SF-ATS change dossier wrote ${path.relative(REPO_ROOT, args.jsonOut).split(path.sep).join("/")}.`);
  }
  return dossier;
}

const isMainModule = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  try {
    main();
  } catch (error) {
    console.error(`SF-ATS change dossier failed: ${error.message}`);
    process.exit(1);
  }
}

export { DEFAULT_JSON_OUT, DEFAULT_DOMAIN_REGISTRY_PATH };
