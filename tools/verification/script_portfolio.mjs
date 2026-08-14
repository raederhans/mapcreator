import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCommandSupersessionPlan,
  VERIFICATION_COMMAND_SUPERSESSION,
} from "./command_supersession.mjs";

export const SCRIPT_PORTFOLIO_SCHEMA_VERSION = 1;
export const CANONICAL_VERIFICATION_ENTRYPOINTS = Object.freeze([
  "verify:pr",
  "verify:demo",
  "verify:nightly",
  "verify:release",
]);

const CLASSIFICATIONS = Object.freeze(["canonical", "internal", "superseded"]);

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

export function runScriptPortfolioCli(argv, { stdout = process.stdout } = {}) {
  const options = parseScriptPortfolioArgs(argv);
  const portfolio = readPackageScriptPortfolio(options.packagePath);
  const formatters = {
    json: formatScriptPortfolioJson,
    markdown: formatScriptPortfolioMarkdown,
    summary: formatScriptPortfolioSummary,
  };
  stdout.write(formatters[options.format](portfolio));
  return options.action === "check" && !portfolio.summary.complete ? 1 : 0;
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
