import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const TEST_ROOT = path.join(REPO_ROOT, "tests", "e2e");
const MANIFEST_PATH = path.join(TEST_ROOT, "test-layer-manifest.json");
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-timeout-inventory.json");
const DEFAULT_MD_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "test-timeout-inventory.md");

function toRepoPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function parseArgs(argv) {
  const args = {
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json-out") args.jsonOut = argv[++index];
    else if (token === "--md-out") args.mdOut = argv[++index];
  }
  return args;
}

function walkSpecFiles(rootDir) {
  const results = [];
  const queue = [rootDir];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".spec.js")) {
        results.push(nextPath);
      }
    }
  }
  return results.sort();
}

function buildLineIndex(content) {
  const offsets = [0];
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
}

function lineForIndex(lineOffsets, index) {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const next = mid + 1 < lineOffsets.length ? lineOffsets[mid + 1] : Number.POSITIVE_INFINITY;
    if (index >= start && index < next) {
      return mid + 1;
    }
    if (index < start) high = mid - 1;
    else low = mid + 1;
  }
  return 1;
}

function readManifestMeta() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const bySpecPath = new Map();
  for (const spec of manifest.specs || []) {
    bySpecPath.set(spec.specPath, {
      domain: spec.domain,
      primaryLayer: spec.primaryLayer,
      ownerHint: spec.ownerHint,
      executionMode: spec.executionMode,
    });
  }
  return bySpecPath;
}

function collectMatches(content, expression) {
  const lineOffsets = buildLineIndex(content);
  const matches = [];
  for (const match of content.matchAll(expression)) {
    matches.push({
      value: String(match[1] || "").trim(),
      line: lineForIndex(lineOffsets, match.index),
    });
  }
  return matches;
}

function buildInventory() {
  const manifestMeta = readManifestMeta();
  const specFiles = walkSpecFiles(TEST_ROOT);
  const entries = [];
  for (const filePath of specFiles) {
    const repoPath = toRepoPath(path.relative(REPO_ROOT, filePath));
    const content = fs.readFileSync(filePath, "utf8");
    const meta = manifestMeta.get(repoPath) || {
      domain: repoPath.includes("/dev/") ? "dev-only" : "untracked",
      primaryLayer: repoPath.includes("/dev/") ? "dev" : "untracked",
      ownerHint: repoPath.includes("/dev/") ? "dev-only" : "unknown",
      executionMode: repoPath.includes("/dev/") ? "browser" : "unknown",
    };
    const testTimeouts = collectMatches(content, /test\.setTimeout\(([^)]+)\)/g);
    const waitForTimeouts = collectMatches(content, /page\.waitForTimeout\(([^)]+)\)/g);
    entries.push({
      specPath: repoPath,
      ...meta,
      testTimeouts,
      waitForTimeouts,
    });
  }
  const summary = {
    specFileCount: entries.length,
    testTimeoutEntryCount: entries.filter((entry) => entry.testTimeouts.length > 0).length,
    waitForTimeoutEntryCount: entries.filter((entry) => entry.waitForTimeouts.length > 0).length,
    totalTestTimeoutCalls: entries.reduce((total, entry) => total + entry.testTimeouts.length, 0),
    totalWaitForTimeoutCalls: entries.reduce((total, entry) => total + entry.waitForTimeouts.length, 0),
    byDomain: Object.fromEntries(
      [...entries.reduce((map, entry) => {
        const current = map.get(entry.domain) || {
          specCount: 0,
          testTimeoutCalls: 0,
          waitForTimeoutCalls: 0,
        };
        current.specCount += 1;
        current.testTimeoutCalls += entry.testTimeouts.length;
        current.waitForTimeoutCalls += entry.waitForTimeouts.length;
        map.set(entry.domain, current);
        return map;
      }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right))
    ),
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    entries,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# test-timeout-inventory",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- spec files: ${report.summary.specFileCount}`,
    `- files with test.setTimeout: ${report.summary.testTimeoutEntryCount}`,
    `- files with page.waitForTimeout: ${report.summary.waitForTimeoutEntryCount}`,
    `- total test.setTimeout calls: ${report.summary.totalTestTimeoutCalls}`,
    `- total page.waitForTimeout calls: ${report.summary.totalWaitForTimeoutCalls}`,
    "",
    "## Domain summary",
  ];
  for (const [domain, value] of Object.entries(report.summary.byDomain)) {
    lines.push(`- ${domain}: specs=${value.specCount}, test.setTimeout=${value.testTimeoutCalls}, page.waitForTimeout=${value.waitForTimeoutCalls}`);
  }
  lines.push("", "## Top files by page.waitForTimeout");
  const topWaitFiles = [...report.entries]
    .filter((entry) => entry.waitForTimeouts.length > 0)
    .sort((left, right) => right.waitForTimeouts.length - left.waitForTimeouts.length || left.specPath.localeCompare(right.specPath))
    .slice(0, 20);
  if (!topWaitFiles.length) {
    lines.push("- none");
  } else {
    for (const entry of topWaitFiles) {
      lines.push(`- ${entry.specPath}: waits=${entry.waitForTimeouts.length}, layer=${entry.primaryLayer}, domain=${entry.domain}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function writeOutputs(report, args) {
  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
  fs.writeFileSync(args.mdOut, renderMarkdown(report), "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildInventory();
  writeOutputs(report, args);
  console.log(`Wrote timeout inventory for ${report.summary.specFileCount} spec files.`);
}

main();
