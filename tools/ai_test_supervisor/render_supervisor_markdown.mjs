import { commandKey } from "./command_lanes.mjs";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function commandRefs(entries = []) {
  return asArray(entries)
    .map((entry) => commandKey(typeof entry === "string" ? entry : entry?.commandRef || entry?.command))
    .filter(Boolean);
}

function renderList(values, empty = "- none") {
  const entries = asArray(values).filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return entries.length ? entries.map((value) => `- ${value}`) : [empty];
}

function renderRouteGaps(gaps = []) {
  return asArray(gaps).length
    ? gaps.map((gap) => `- ${gap.file} [${gap.severity || "unknown"}]: ${gap.reason}${gap.suggestedRoute ? `; suggested=${gap.suggestedRoute}` : ""}`)
    : ["- none"];
}

function renderDomains(domainSummaries = []) {
  if (!asArray(domainSummaries).length) return ["- none"];
  return domainSummaries.map((entry) => {
    const checks = asArray(entry.recommendedChecks).length ? `; checks=${entry.recommendedChecks.join(", ")}` : "";
    const files = asArray(entry.changedFiles).length ? `; files=${entry.changedFiles.length}` : "";
    return `- ${entry.domainId}${files}${checks}`;
  });
}

function renderBlockedCommands(commands = []) {
  return asArray(commands).length
    ? commands.map((entry) => `- ${entry.commandRef} (${entry.lane || "blocked"}; ${entry.reason || "blocked"})`)
    : ["- none"];
}

function renderExecutionResults(results = []) {
  return asArray(results).length
    ? results.map((entry) => `- ${entry.commandRef}: exit=${entry.exitCode}; durationMs=${entry.durationMs}`)
    : ["- none"];
}

export function renderSupervisorMarkdown({ dossier = null, plan = null } = {}) {
  const source = plan || dossier || {};
  const selector = dossier?.selector || {};
  const executionPolicy = plan?.executionPolicy || {};
  const mode = executionPolicy.execute ? "execute" : "dry-run";
  const lines = [
    "# SF-ATS Supervisor Plan",
    "",
    "## Summary",
    `- mode: ${mode}`,
    `- generatedAt: ${source.generatedAt || dossier?.generatedAt || "unknown"}`,
    `- gitSha: ${dossier?.gitSha || "unknown"}`,
    `- baseSha: ${dossier?.baseSha || "unknown"}`,
    `- riskLevel: ${source.riskLevel || "unknown"}`,
    "",
    "## Changed Files",
    ...renderList(source.changedFiles || dossier?.changedFiles),
    "",
    "## Route Gaps",
    ...renderRouteGaps(source.routeGaps || dossier?.routeGaps),
    "",
    "## Domains",
    ...renderDomains(dossier?.domainSummaries || (plan?.domains || []).map((domainId) => ({ domainId }))),
    "",
    "## Child-Safe Commands",
    ...renderList(plan ? plan.childSafeCommands : commandRefs(dossier?.laneSummary?.childSafeCommands)),
    "",
    "## Main-Thread Commands",
    ...renderList(plan ? plan.mainThreadCommands : commandRefs(dossier?.laneSummary?.mainThreadCommands)),
    "",
    "## CI-Only Commands",
    ...renderList(plan ? plan.ciOnlyCommands : commandRefs(dossier?.laneSummary?.ciOnlyCommands)),
    "",
    "## Blocked Commands",
    ...renderBlockedCommands(plan ? plan.blockedCommands : dossier?.laneSummary?.blockedCommands),
    "",
    "## Diagnostics",
    ...renderList(selector.diagnosticNextSteps?.map((entry) => entry.commandRef)),
    "",
    "## Required Artifacts",
    ...renderList(source.requiredArtifacts || dossier?.requiredArtifacts),
    "",
    "## Suggested Actions",
    ...renderList(dossier?.suggestedNextActions),
    "",
    "## Stop Conditions",
    ...renderList(plan?.stopConditions),
    "",
    "## Execution Results",
    ...renderExecutionResults(plan?.executionResults),
  ];
  return `${lines.join("\n")}\n`;
}

export function renderCommandList(plan = {}) {
  return [
    "child-safe:",
    ...renderList(plan.childSafeCommands),
    "main-thread:",
    ...renderList(plan.mainThreadCommands),
    "ci-only:",
    ...renderList(plan.ciOnlyCommands),
    "blocked:",
    ...renderBlockedCommands(plan.blockedCommands),
  ].join("\n");
}
