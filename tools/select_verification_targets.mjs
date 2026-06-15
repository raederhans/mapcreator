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
const BROWSER_SMOKE_STATIC_SUPPORT_FILES = new Set([
  "ops/browser-mcp/run-smoke-browser-inspection.sh",
  "ops/browser-mcp/inspection-profile.toml",
  "ops/browser-mcp/inspection-profile.schema.md",
  "tools/browser_smoke_profile_contract.py",
]);
const PERF_STATIC_SUPPORT_FILES = new Set([
  "ops/browser-mcp/editor-performance-benchmark.py",
]);
const GUIDANCE_ARRAY_FIELDS = ["taskEntry", "ownerFiles", "commonChecks", "riskSignals", "diagnostics"];

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
  return (route.id.startsWith("e2e:") || route.id.startsWith("direct-e2e:")) && affectedSpecs.includes(route.sourceRef);
}

function routeMatchesChangedFile(route, changedFile, importGraph = null) {
  if (BROWSER_SMOKE_STATIC_SUPPORT_FILES.has(changedFile)) {
    return route.id === "infra:browser-smoke-static-contract";
  }
  if (PERF_STATIC_SUPPORT_FILES.has(changedFile)) {
    return route.domain === "perf";
  }

  if (isDirectRouteMatch(route, changedFile)) return true;
  if (routeMatchesImportGraph(route, changedFile, importGraph)) return true;

  if (changedFile === "package.json" || changedFile === "package-lock.json") {
    return route.id.startsWith("node:")
      || route.id.startsWith("direct-e2e:")
      || route.id === "infra:e2e-layer-manifest"
      || route.id === "infra:verification-selector"
      || route.id === "infra:playwright-observability"
      || route.id === "infra:test-import-graph"
      || route.id === "infra:test-timeout-inventory"
      || route.id === "infra:test-console-allowlist"
      || route.id === "infra:test-timeout-guardrails"
      || route.id === "infra:perf-gate-contract";
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

  if (changedFile.startsWith("map_backend/") || changedFile === "js/api/backend_client.js") {
    return route.domain === "backend-cloud-support";
  }

  if (changedFile === "js/ui/sidebar/project_support_diagnostics_controller.js" && route.domain === "backend-cloud-support") {
    return true;
  }

  if (changedFile.startsWith("js/") && changedFile.includes("city")) return route.domain === "city-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("scenario")) return route.domain === "scenario-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("palette")) return route.domain === "palette-runtime";
  if (changedFile.startsWith("js/") && changedFile.includes("transport")) return route.domain === "transport-workbench";
  if (changedFile.startsWith("data/transport_layers/") || changedFile.includes("transport_workbench")) return route.domain === "transport-workbench";
  if (changedFile.startsWith("data/scenarios/")) return route.domain.includes("scenario") || route.domain === "tno-water";
  if (changedFile.startsWith("tools/perf/")) return route.domain === "perf";
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

function createGuidanceSets() {
  return Object.fromEntries(GUIDANCE_ARRAY_FIELDS.map((field) => [field, new Set()]));
}

function collectRouteGuidance(target, guidance) {
  if (!guidance) return;
  for (const field of GUIDANCE_ARRAY_FIELDS) {
    for (const value of guidance[field] || []) {
      target[field].add(value);
    }
  }
  if (typeof guidance.status === "string" && guidance.status.trim()) {
    target.status.add(guidance.status);
  }
}

function guidanceSetsToObject(guidanceSets) {
  const result = Object.fromEntries(GUIDANCE_ARRAY_FIELDS.map((field) => [field, [...guidanceSets[field]].sort()]));
  result.status = [...guidanceSets.status].sort();
  return result;
}

function hasGuidance(guidance) {
  return GUIDANCE_ARRAY_FIELDS.some((field) => (guidance?.[field] || []).length > 0) || (guidance?.status || []).length > 0;
}

function buildDiagnosticNextSteps(commandEntries) {
  return commandEntries
    .filter((entry) => hasGuidance(entry.guidance) || entry.executionOwners.includes("main-thread") || entry.resourceLocks.length > 0)
    .map((entry) => ({
      commandRef: entry.commandRef,
      domains: entry.domains,
      ownerHints: entry.ownerHints,
      executionOwners: entry.executionOwners,
      resourceLocks: entry.resourceLocks,
      routeIds: entry.routeIds,
      guidance: entry.guidance,
    }));
}

function buildAdvisoryNotes(commandEntries) {
  const notes = [];
  const mainThreadCommands = commandEntries.filter((entry) => entry.executionOwners.includes("main-thread"));
  if (mainThreadCommands.length) {
    notes.push(`${mainThreadCommands.length} command(s) require main-thread serial ownership before execution.`);
  }
  const lockedCommands = commandEntries.filter((entry) => entry.resourceLocks.length > 0);
  if (lockedCommands.length) {
    const locks = [...new Set(lockedCommands.flatMap((entry) => entry.resourceLocks))].sort();
    notes.push(`Resource locks required: ${locks.join(", ")}.`);
  }
  const guidedDomains = [...new Set(commandEntries.filter((entry) => hasGuidance(entry.guidance)).flatMap((entry) => entry.domains))].sort();
  if (guidedDomains.length) {
    notes.push(`Guidance available for: ${guidedDomains.join(", ")}.`);
  }
  return notes;
}

function expandedSpecsForCommand(commandRef, allRoutes) {
  const normalized = String(commandRef || "").trim();
  if (!normalized) return [];
  const runSpecPrefix = "node tools/e2e_layering.mjs run-spec ";
  const runDomainPrefix = "node tools/e2e_layering.mjs run-domain ";
  const runOwnerPrefix = "node tools/e2e_layering.mjs run-owner ";
  if (normalized.startsWith(runSpecPrefix)) {
    return [normalized.slice(runSpecPrefix.length).trim()].filter(Boolean);
  }
  if (normalized.startsWith(runDomainPrefix)) {
    const domain = normalized.slice(runDomainPrefix.length).trim();
    return [...new Set(
      allRoutes
        .filter((route) => route.id.startsWith("e2e:") && route.domain === domain)
        .map((route) => route.sourceRef),
    )].sort();
  }
  if (normalized.startsWith(runOwnerPrefix)) {
    const ownerHint = normalized.slice(runOwnerPrefix.length).trim();
    return [...new Set(
      allRoutes
        .filter((route) => route.id.startsWith("e2e:") && route.ownerHint === ownerHint)
        .map((route) => route.sourceRef),
    )].sort();
  }
  return [...new Set(
    allRoutes
      .filter((route) => route.commandRef === normalized)
      .flatMap((route) => routeSourceRefs(route).filter((sourceRef) => sourceRef.endsWith(".spec.js"))),
  )].sort();
}

function commandEntryPriority(entry) {
  const childSafe = entry.executionOwners.every((owner) => owner === "child-safe");
  return [
    childSafe ? 0 : 1,
    entry.resourceLocks.length,
    entry.expandedSpecs.length,
    entry.commandRef,
  ];
}

function compareCommandEntries(left, right) {
  const [leftOwnerRank, leftLockCount, leftSpecCount, leftCommand] = commandEntryPriority(left);
  const [rightOwnerRank, rightLockCount, rightSpecCount, rightCommand] = commandEntryPriority(right);
  return leftOwnerRank - rightOwnerRank
    || leftLockCount - rightLockCount
    || leftSpecCount - rightSpecCount
    || leftCommand.localeCompare(rightCommand);
}

function buildCommandEntries(routes, allRoutes = buildRouteIndex()) {
  const byCommand = new Map();
  for (const route of routes) {
    const existing = byCommand.get(route.commandRef) || {
      commandRef: route.commandRef,
      domains: new Set(),
      ownerHints: new Set(),
      resourceLocks: new Set(),
      executionOwners: new Set(),
      ciProfiles: new Set(),
      routeIds: new Set(),
      expandedSpecs: new Set(expandedSpecsForCommand(route.commandRef, allRoutes)),
      matchedFiles: new Set(),
      guidance: { ...createGuidanceSets(), status: new Set() },
    };
    existing.domains.add(route.domain);
    existing.ownerHints.add(route.ownerHint);
    existing.executionOwners.add(route.executionOwner);
    existing.ciProfiles.add(route.ciProfile);
    existing.routeIds.add(route.id);
    for (const lock of route.resourceLocks) {
      existing.resourceLocks.add(lock);
    }
    collectRouteGuidance(existing.guidance, route.guidance);
    byCommand.set(route.commandRef, existing);
  }
  return [...byCommand.values()]
    .map((entry) => ({
      commandRef: entry.commandRef,
      domains: [...entry.domains].sort(),
      ownerHints: [...entry.ownerHints].sort(),
      resourceLocks: [...entry.resourceLocks].sort(),
      executionOwners: [...entry.executionOwners].sort(),
      ciProfiles: [...entry.ciProfiles].sort(),
      routeIds: [...entry.routeIds].sort(),
      expandedSpecs: [...entry.expandedSpecs].sort(),
      matchedFiles: [...entry.matchedFiles].sort(),
      guidance: guidanceSetsToObject(entry.guidance),
    }))
    .sort(compareCommandEntries);
}

function summarizeImpactedDomains(commandEntries) {
  const byDomain = new Map();
  for (const entry of commandEntries) {
    for (const domain of entry.domains) {
      const current = byDomain.get(domain) || {
        domain,
        commandCount: 0,
        ownerHints: new Set(),
        expandedSpecs: new Set(),
      };
      current.commandCount += 1;
      for (const ownerHint of entry.ownerHints) {
        current.ownerHints.add(ownerHint);
      }
      for (const specPath of entry.expandedSpecs) {
        current.expandedSpecs.add(specPath);
      }
      byDomain.set(domain, current);
    }
  }
  return [...byDomain.values()]
    .map((entry) => ({
      domain: entry.domain,
      commandCount: entry.commandCount,
      ownerHints: [...entry.ownerHints].sort(),
      specCount: entry.expandedSpecs.size,
    }))
    .sort((left, right) => right.commandCount - left.commandCount || left.domain.localeCompare(right.domain));
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
  const matchedRoutesByFile = normalizedChangedFiles.map((file) => ({
    changedFile: file,
    routes: allRoutes.filter((route) => routeMatchesChangedFile(route, file, importGraph)),
  }));
  const matchedRoutes = matchedRoutesByFile.flatMap((entry) => entry.routes);
  const commandEntries = buildCommandEntries(matchedRoutes, allRoutes);
  for (const entry of matchedRoutesByFile) {
    const perFileCommandEntries = buildCommandEntries(entry.routes, allRoutes);
    entry.commandEntries = perFileCommandEntries;
  }
  const childSafeRoutes = commandEntries.filter((entry) => entry.executionOwners.every((owner) => owner === "child-safe"));
  const mainThreadRoutes = commandEntries.filter((entry) => entry.executionOwners.includes("main-thread"));
  const ciOnlyRoutes = commandEntries.filter((entry) => entry.executionOwners.every((owner) => owner === "ci-only"));
  const unmatchedChangedFiles = matchedRoutesByFile
    .filter((entry) => entry.routes.length === 0)
    .map((entry) => entry.changedFile);

  return {
    schemaVersion: 1,
    changedFiles: normalizedChangedFiles,
    importGraphLoaded: !!importGraph,
    recommendedCommands: commandEntries.map((entry) => ({
      commandRef: entry.commandRef,
      reason: `matches ${entry.domains.join("+")}/${entry.ownerHints.join("+")}`,
      domains: entry.domains,
      ownerHints: entry.ownerHints,
      resourceLocks: entry.resourceLocks,
      executionOwners: entry.executionOwners,
      ciProfiles: entry.ciProfiles,
      expandedSpecs: entry.expandedSpecs,
      routeIds: entry.routeIds,
      guidance: entry.guidance,
    })),
    coveredDomains: [...new Set(commandEntries.flatMap((entry) => entry.domains))].sort(),
    coveredOwners: [...new Set(commandEntries.flatMap((entry) => entry.ownerHints))].sort(),
    resourceLocks: [...new Set(commandEntries.flatMap((entry) => entry.resourceLocks))].sort(),
    executionOwners: [...new Set(commandEntries.flatMap((entry) => entry.executionOwners))].sort(),
    childAgentStaticTasks: childSafeRoutes.map((entry) => ({
      commandRef: entry.commandRef,
      reason: "short contract route",
      expandedSpecs: entry.expandedSpecs,
    })),
    mainThreadSerialVerification: mainThreadRoutes.map((entry) => ({
      commandRef: entry.commandRef,
      resourceLocks: entry.resourceLocks,
      expandedSpecs: entry.expandedSpecs,
      guidance: entry.guidance,
    })),
    ciOnlyVerification: ciOnlyRoutes.map((entry) => ({ commandRef: entry.commandRef, reason: "reserved for CI profile" })),
    matchedByFile: matchedRoutesByFile.map((entry) => ({
      changedFile: entry.changedFile,
      matchedRouteIds: entry.routes.map((route) => route.id).sort(),
      recommendedCommands: entry.commandEntries.map((commandEntry) => ({
        commandRef: commandEntry.commandRef,
        domains: commandEntry.domains,
        ownerHints: commandEntry.ownerHints,
        resourceLocks: commandEntry.resourceLocks,
        executionOwners: commandEntry.executionOwners,
        routeIds: commandEntry.routeIds,
        expandedSpecs: commandEntry.expandedSpecs,
        guidance: commandEntry.guidance,
      })),
    })),
    impactedDomains: summarizeImpactedDomains(commandEntries),
    diagnosticNextSteps: buildDiagnosticNextSteps(commandEntries),
    advisoryNotes: buildAdvisoryNotes(commandEntries),
    unmatchedChangedFiles,
    skippedHeavyTests: skippedHeavyRoutes(allRoutes, matchedRoutes),
  };
}

function renderMarkdown(report) {
  const lines = ["# Verification selector explain", "", "## Changed files"];
  lines.push(...(report.changedFiles.length ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]));
  lines.push("", "## Matched by changed file");
  for (const entry of report.matchedByFile || []) {
    lines.push(`- ${entry.changedFile}`);
    if (!entry.recommendedCommands.length) {
      lines.push("  - no matched commands");
      continue;
    }
    for (const command of entry.recommendedCommands) {
      lines.push(`  - ${command.commandRef} (${command.domains.join("+")}/${command.ownerHints.join("+")})`);
      if (command.expandedSpecs.length) {
        lines.push(...command.expandedSpecs.map((specPath) => `    - ${specPath}`));
      }
    }
  }
  lines.push("", "## Unmatched changed files");
  lines.push(...(report.unmatchedChangedFiles.length ? report.unmatchedChangedFiles.map((file) => `- ${file}`) : ["- none"]));
  lines.push("", "## Impacted domains");
  lines.push(...((report.impactedDomains || []).length
    ? report.impactedDomains.map((entry) => `- ${entry.domain}: commands=${entry.commandCount}, specs=${entry.specCount}, owners=${entry.ownerHints.join("+")}`)
    : ["- none"]));
  lines.push("", "## Recommended commands");
  lines.push(...(report.recommendedCommands.length ? report.recommendedCommands.map((route) => {
    const ownerText = route.executionOwners.join("+") || "unknown-owner";
    const routeText = route.domains.join("+") || "unknown-domain";
    const specCount = route.expandedSpecs.length ? `; specs=${route.expandedSpecs.length}` : "";
    return `- ${route.commandRef} (${ownerText}; ${routeText}${specCount})`;
  }) : ["- none"]));
  lines.push("", "## Resource locks");
  lines.push(...(report.resourceLocks.length ? report.resourceLocks.map((lock) => `- ${lock}`) : ["- none"]));
  lines.push("", "## Main-thread serial verification");
  lines.push(...(report.mainThreadSerialVerification.length ? report.mainThreadSerialVerification.map((route) => `- ${route.commandRef}`) : ["- none"]));
  lines.push("", "## Diagnostic next steps");
  lines.push(...((report.diagnosticNextSteps || []).length ? report.diagnosticNextSteps.map((entry) => {
    const owners = entry.executionOwners.join("+") || "unknown-owner";
    const locks = entry.resourceLocks.length ? `; locks=${entry.resourceLocks.join("+")}` : "";
    return `- ${entry.commandRef} (${owners}${locks})`;
  }) : ["- none"]));
  lines.push("", "## Advisory notes");
  lines.push(...((report.advisoryNotes || []).length ? report.advisoryNotes.map((note) => `- ${note}`) : ["- none"]));
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
  const route = routes.find((candidate) => candidate.id === target);
  if (route) {
    console.log(JSON.stringify(route, null, 2));
    return;
  }
  const normalizedTarget = target ? normalizeChangedFiles([target])[0] : "";
  const recommendation = buildRecommendation([target], routes);
  const targetExists = normalizedTarget ? fs.existsSync(path.join(REPO_ROOT, normalizedTarget)) : false;
  if (targetExists && recommendation.recommendedCommands.length > 0) {
    console.log(JSON.stringify({
      mode: "recommendation-fallback",
      target,
      recommendation,
    }, null, 2));
    return;
  }
  throw new Error(`No route found for ${target}`);
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
