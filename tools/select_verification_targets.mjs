import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildRouteIndex, summarizeRoutes, validateRouteIndex, toRepoPath } from "./test_route_registry.mjs";

const REPO_ROOT = process.cwd();
const IMPORT_GRAPH_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-import-graph.json");
const BOOTSTRAP_FALLBACK_ROUTE_IDS = new Set([
  "e2e:tests/e2e/city_label_i18n_redraw.spec.js",
  "e2e:tests/e2e/startup_bundle_recovery_contract.spec.js",
  "e2e:tests/e2e/tno_startup_visible_context_layers_contract.spec.js",
  "python:tests.test_app_entry_resolver",
  "python:tests.test_startup_shell",
]);

function parseArgs(argv) {
  const args = { command: "recommend", changedFiles: [], jsonOut: null, mdOut: null, format: "text" };
  const rest = [...argv];
  const knownCommands = new Set(["check", "list", "explain", "recommend"]);
  if (rest[0] && knownCommands.has(rest[0])) {
    args.command = rest.shift();
  }
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--check") args.command = "check";
    else if (value === "--list") args.command = "list";
    else if (value === "--json") args.format = "json";
    else if (value === "--changed-files-list") args.changedFiles.push(...readChangedFileList(rest[++index]));
    else if (value === "--changed-file") args.changedFiles.push(rest[++index]);
    else if (value === "--changed-files") args.changedFiles.push(...splitChangedFiles(rest[++index]));
    else if (value === "--json-out") args.jsonOut = rest[++index];
    else if (value === "--md-out") args.mdOut = rest[++index];
    else args.changedFiles.push(value);
  }
  return args;
}

function splitChangedFiles(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readChangedFileList(filePath) {
  if (!filePath) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeChangedFiles(values) {
  return [...new Set(values.map((value) => toRepoPath(path.relative(REPO_ROOT, path.resolve(REPO_ROOT, value))).replace(/^\.\//, "")))].sort();
}

function routeSourceRefs(route) {
  return String(route.sourceRef)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isDirectRouteMatch(route, changedFile) {
  return routeSourceRefs(route).some((sourceRef) => {
    if (sourceRef === changedFile) return true;
    const looksLikeFile = /\.[^/]+$/.test(sourceRef);
    return !looksLikeFile && changedFile.startsWith(`${sourceRef.replace(/\/$/, "")}/`);
  });
}

function readImportGraph() {
  if (!fs.existsSync(IMPORT_GRAPH_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(IMPORT_GRAPH_PATH, "utf8"));
}

function routeMatchesImportGraph(route, changedFile, importGraph) {
  const affectedSpecs = importGraph?.reverseIndex?.[changedFile];
  if (!Array.isArray(affectedSpecs) || !affectedSpecs.length) {
    return false;
  }
  return route.id.startsWith("e2e:") && affectedSpecs.includes(route.sourceRef);
}

function routeMatchesChangedFile(route, changedFile, importGraph = null) {
  if (isDirectRouteMatch(route, changedFile)) return true;
  if (routeMatchesImportGraph(route, changedFile, importGraph)) return true;

  if (changedFile === "package.json" || changedFile === "package-lock.json") {
    return route.id.startsWith("node:")
      || route.id === "infra:e2e-layer-manifest"
      || route.id === "infra:verification-selector"
      || route.id === "infra:playwright-observability"
      || route.id === "infra:adaptive-test-runner";
  }

  if (changedFile === "tools/e2e_layering.mjs" || changedFile === "tests/e2e/test-layer-manifest.json") {
    return route.id === "infra:e2e-layer-manifest";
  }

  if (changedFile === "tools/select_verification_targets.mjs" || changedFile === "tools/test_route_registry.mjs") {
    return route.domain === "test-routing";
  }

  if (changedFile.startsWith("tests/e2e/")) {
    return route.id === "infra:e2e-layer-manifest" || isDirectRouteMatch(route, changedFile);
  }

  if (changedFile.startsWith("tests/") && changedFile.endsWith(".py")) {
    return route.id === "infra:verification-selector" || isDirectRouteMatch(route, changedFile);
  }

  if (changedFile.startsWith("tests/") && changedFile.endsWith(".mjs")) {
    return route.id === "infra:verification-selector" || isDirectRouteMatch(route, changedFile);
  }

  if (changedFile.startsWith("js/bootstrap/")) {
    return BOOTSTRAP_FALLBACK_ROUTE_IDS.has(route.id);
  }

  if (changedFile.startsWith("js/") && changedFile.includes("city")) return route.domain === "city-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("scenario")) return route.domain === "scenario-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("palette")) return route.domain === "palette-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("transport")) return route.domain === "transport-workbench";
  if (changedFile.startsWith("data/transport_layers/") || changedFile.includes("transport_workbench")) return route.domain === "transport-workbench";
  if (changedFile.startsWith("data/scenarios/")) return route.domain.includes("scenario") || route.domain === "tno-water";
  if (changedFile.startsWith("tools/perf/") || changedFile.startsWith("ops/browser-mcp/") || changedFile.includes("perf")) return route.domain === "perf";
  if (changedFile === "index.html" || changedFile.startsWith("css/") || changedFile.startsWith("js/ui/")) {
    return route.ownerHint === "ui-shell" || route.domain === "main-shell";
  }

  return false;
}

function uniqueByCommand(routes) {
  const seen = new Set();
  const result = [];
  for (const route of routes) {
    if (seen.has(route.commandRef)) continue;
    seen.add(route.commandRef);
    result.push(route);
  }
  return result;
}

function skippedHeavyRoutes(allRoutes, selectedRoutes) {
  const selectedCommands = new Set(selectedRoutes.map((route) => route.commandRef));
  const skipped = allRoutes
    .filter((route) => route.cost === "heavy" || route.executionOwner === "ci-only" || route.resourceLocks.length > 0)
    .filter((route) => !selectedCommands.has(route.commandRef));
  return uniqueByCommand(skipped).map((route) => ({
    id: route.id,
    commandRef: route.commandRef,
    reason: "changed files do not map to this route",
  }));
}

function buildRecommendation(changedFiles, allRoutes = buildRouteIndex()) {
  validateRouteIndex(allRoutes);
  const normalizedChangedFiles = normalizeChangedFiles(changedFiles);
  const importGraph = readImportGraph();
  const matchedRoutes = allRoutes.filter((route) => normalizedChangedFiles.some((file) => routeMatchesChangedFile(route, file, importGraph)));
  const commandRoutes = uniqueByCommand(matchedRoutes).sort((a, b) => a.commandRef.localeCompare(b.commandRef));
  const childSafeRoutes = commandRoutes.filter((route) => route.executionOwner === "child-safe");
  const mainThreadRoutes = commandRoutes.filter((route) => route.executionOwner === "main-thread");
  const ciOnlyRoutes = commandRoutes.filter((route) => route.executionOwner === "ci-only");

  return {
    schemaVersion: 1,
    changedFiles: normalizedChangedFiles,
    importGraphLoaded: !!importGraph,
    recommendedCommands: commandRoutes.map((route) => ({
      commandRef: route.commandRef,
      reason: `matches ${route.domain}/${route.ownerHint}`,
      domain: route.domain,
      ownerHint: route.ownerHint,
      resourceLocks: route.resourceLocks,
      executionOwner: route.executionOwner,
      ciProfile: route.ciProfile,
    })),
    coveredDomains: [...new Set(commandRoutes.map((route) => route.domain))].sort(),
    coveredOwners: [...new Set(commandRoutes.map((route) => route.ownerHint))].sort(),
    resourceLocks: [...new Set(commandRoutes.flatMap((route) => route.resourceLocks))].sort(),
    executionOwners: [...new Set(commandRoutes.map((route) => route.executionOwner))].sort(),
    childAgentStaticTasks: childSafeRoutes.map((route) => ({ commandRef: route.commandRef, reason: `short ${route.layer} route` })),
    mainThreadSerialVerification: mainThreadRoutes.map((route) => ({ commandRef: route.commandRef, resourceLocks: route.resourceLocks })),
    ciOnlyVerification: ciOnlyRoutes.map((route) => ({ commandRef: route.commandRef, reason: "reserved for CI profile" })),
    skippedHeavyTests: skippedHeavyRoutes(allRoutes, commandRoutes),
  };
}

function renderMarkdown(report) {
  const lines = ["# Verification selector explain", "", "## Changed files"];
  lines.push(...(report.changedFiles.length ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]));
  lines.push("", "## Recommended commands");
  lines.push(...(report.recommendedCommands.length ? report.recommendedCommands.map((route) => `- ${route.commandRef} (${route.executionOwner}; ${route.domain}/${route.ownerHint})`) : ["- none"]));
  lines.push("", "## Resource locks");
  lines.push(...(report.resourceLocks.length ? report.resourceLocks.map((lock) => `- ${lock}`) : ["- none"]));
  lines.push("", "## Main-thread serial verification");
  lines.push(...(report.mainThreadSerialVerification.length ? report.mainThreadSerialVerification.map((route) => `- ${route.commandRef}`) : ["- none"]));
  lines.push("", "## Child-safe tasks");
  lines.push(...(report.childAgentStaticTasks.length ? report.childAgentStaticTasks.map((route) => `- ${route.commandRef}`) : ["- none"]));
  lines.push("", "## Skipped heavy tests");
  lines.push(...(report.skippedHeavyTests.length ? report.skippedHeavyTests.slice(0, 25).map((route) => `- ${route.commandRef}: ${route.reason}`) : ["- none"]));
  return `${lines.join("\n")}\n`;
}

function writeOutputFiles(report, args) {
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (args.mdOut) {
    fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
    fs.writeFileSync(args.mdOut, renderMarkdown(report), "utf8");
  }
}

function listRoutes() {
  const routes = buildRouteIndex();
  console.log(JSON.stringify({ summary: summarizeRoutes(routes), routes }, null, 2));
}

function explainRoute(target) {
  const routes = buildRouteIndex();
  const normalizedTarget = target ? normalizeChangedFiles([target])[0] : "";
  const route = routes.find((candidate) => candidate.id === target || routeSourceRefs(candidate).includes(normalizedTarget));
  if (!route) throw new Error(`No route found for ${target}`);
  console.log(JSON.stringify(route, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "check") {
    const summary = validateRouteIndex();
    console.log(`Route schema check passed for ${summary.count} routes.`);
    return;
  }
  if (args.command === "list") {
    listRoutes();
    return;
  }
  if (args.command === "explain") {
    explainRoute(args.changedFiles[0]);
    return;
  }

  const report = buildRecommendation(args.changedFiles);
  writeOutputFiles(report, args);
  if (args.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderMarkdown(report));
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}

export {
  buildRecommendation,
  normalizeChangedFiles,
  routeMatchesChangedFile,
};
