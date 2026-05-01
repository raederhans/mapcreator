import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const DEFAULT_INPUT = path.join(REPO_ROOT, ".runtime", "reports", "test-timings.ndjson");
const DEFAULT_OUTPUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-timings-summary.json");
const FLAKE_BUDGET_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-flake-budget.json");

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") args.input = argv[++index];
    else if (token === "--output") args.output = argv[++index];
  }
  return args;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function readEntries(inputPath) {
  if (!fs.existsSync(inputPath)) {
    return [];
  }
  return fs.readFileSync(inputPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readFlakeBudget() {
  if (!fs.existsSync(FLAKE_BUDGET_PATH)) {
    return { specs: {} };
  }
  return JSON.parse(fs.readFileSync(FLAKE_BUDGET_PATH, "utf8"));
}

function buildSummary(entries) {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const flakeBudget = readFlakeBudget();
  const perSpec = new Map();
  for (const entry of entries) {
    const specPath = String(entry.specPath || "").trim();
    if (!specPath) continue;
    const bucket = perSpec.get(specPath) || [];
    bucket.push(entry);
    perSpec.set(specPath, bucket);
  }

  const specs = {};
  const flakeSuggestions = [];
  for (const [specPath, bucket] of [...perSpec.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const budgetEntry = flakeBudget.specs?.[specPath] || { retries: 0 };
    const durations = bucket.map((entry) => Number(entry.durationMs || 0)).filter((value) => Number.isFinite(value) && value >= 0);
    const recentRuns = [...bucket].sort((left, right) => new Date(right.ts) - new Date(left.ts));
    const recentStatuses = recentRuns.slice(0, 5).map((entry) => ({
      ts: entry.ts,
      status: entry.status,
      retry: entry.retry,
      durationMs: entry.durationMs,
    }));
    const trailingThirtyDays = recentRuns.filter((entry) => new Date(entry.ts).getTime() >= thirtyDaysAgo);
    const flakyPassCount = trailingThirtyDays.filter((entry) => Number(entry.retry || 0) > 0 && entry.status === "passed").length;
    const suggestionThreshold = Math.max(3, Number(budgetEntry.retries || 0) + 3);
    if (flakyPassCount >= suggestionThreshold) {
      flakeSuggestions.push({
        specPath,
        flakyPassCount,
        configuredRetries: Number(budgetEntry.retries || 0),
        suggestion: "consider quarantine or retries budget review",
      });
    }
    specs[specPath] = {
      runCount: bucket.length,
      p50DurationMs: percentile(durations, 0.5),
      p90DurationMs: percentile(durations, 0.9),
      lastStatus: recentRuns[0]?.status || "",
      recentStatuses,
      flakyPassCount,
      flakeBudget: {
        retries: Number(budgetEntry.retries || 0),
        owner: String(budgetEntry.owner || ""),
        quarantinedSince: String(budgetEntry.quarantinedSince || ""),
      },
    };
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    specCount: Object.keys(specs).length,
    specs,
    flakeSuggestions,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = buildSummary(readEntries(args.input));
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Wrote timing summary for ${summary.specCount} specs.`);
}

main();
