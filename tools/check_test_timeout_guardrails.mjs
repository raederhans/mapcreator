import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const TEST_ROOT = path.join(REPO_ROOT, "tests", "e2e");
const ALLOWLIST_PATH = path.join(REPO_ROOT, "tools", "test-timeout-guardrail-allowlist.json");
const MAX_WAIT_TIMEOUT_MS = 500;
const MAX_TEST_TIMEOUT_MS = 60_000;

function toRepoPath(value) {
  return String(value || "").replace(/\\/g, "/");
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

function buildLineOffsets(content) {
  const offsets = [0];
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") offsets.push(index + 1);
  }
  return offsets;
}

function lineForIndex(offsets, index) {
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = offsets[mid];
    const next = mid + 1 < offsets.length ? offsets[mid + 1] : Number.POSITIVE_INFINITY;
    if (index >= start && index < next) return mid + 1;
    if (index < start) high = mid - 1;
    else low = mid + 1;
  }
  return 1;
}

function hasJustify(lines, lineNumber) {
  const candidateLines = [
    lines[lineNumber - 1] || "",
    lines[lineNumber - 2] || "",
  ];
  return candidateLines.some((line) => /JUSTIFY:/.test(line));
}

function numericValue(rawValue) {
  const normalized = String(rawValue || "").replace(/_/g, "").trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const offsets = buildLineOffsets(content);
  const violations = {
    hasSkipOnly: false,
    longTimeout: false,
    waitForTimeout: false,
  };

  if (!toRepoPath(path.relative(REPO_ROOT, filePath)).startsWith("tests/e2e/dev/")) {
    violations.hasSkipOnly = /test\.(?:skip|only)\(/.test(content);
  }

  for (const match of content.matchAll(/test\.setTimeout\(([^)]+)\)/g)) {
    const value = numericValue(match[1]);
    const line = lineForIndex(offsets, match.index);
    const needsReview = value === null || value > MAX_TEST_TIMEOUT_MS;
    if (needsReview && !hasJustify(lines, line)) {
      violations.longTimeout = true;
      break;
    }
  }

  for (const match of content.matchAll(/page\.waitForTimeout\(([^)]+)\)/g)) {
    const value = numericValue(match[1]);
    const line = lineForIndex(offsets, match.index);
    const needsReview = value === null || value >= MAX_WAIT_TIMEOUT_MS;
    if (needsReview && !hasJustify(lines, line)) {
      violations.waitForTimeout = true;
      break;
    }
  }

  return violations;
}

function main() {
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
  const allowLong = new Set((allowlist.allowLongTimeoutFiles || []).map(toRepoPath));
  const allowWait = new Set((allowlist.allowWaitForTimeoutFiles || []).map(toRepoPath));

  const currentLong = new Set();
  const currentWait = new Set();
  const skipOnly = [];

  for (const absolutePath of walkSpecFiles(TEST_ROOT)) {
    const repoPath = toRepoPath(path.relative(REPO_ROOT, absolutePath));
    const result = scanFile(absolutePath);
    if (result.hasSkipOnly) skipOnly.push(repoPath);
    if (result.longTimeout) currentLong.add(repoPath);
    if (result.waitForTimeout) currentWait.add(repoPath);
  }

  const unexpectedLong = [...currentLong].filter((filePath) => !allowLong.has(filePath)).sort();
  const staleLong = [...allowLong].filter((filePath) => !currentLong.has(filePath)).sort();
  const unexpectedWait = [...currentWait].filter((filePath) => !allowWait.has(filePath)).sort();
  const staleWait = [...allowWait].filter((filePath) => !currentWait.has(filePath)).sort();

  if (!skipOnly.length && !unexpectedLong.length && !staleLong.length && !unexpectedWait.length && !staleWait.length) {
    console.log(`Test timeout guardrails passed with ${currentLong.size} long-timeout files and ${currentWait.size} waitForTimeout files.`);
    return;
  }

  if (skipOnly.length) {
    console.error("Unexpected test.skip/test.only outside dev specs:");
    skipOnly.forEach((filePath) => console.error(`  - ${filePath}`));
  }
  if (unexpectedLong.length) {
    console.error("Unexpected long-timeout files:");
    unexpectedLong.forEach((filePath) => console.error(`  + ${filePath}`));
  }
  if (staleLong.length) {
    console.error("Stale long-timeout allowlist entries:");
    staleLong.forEach((filePath) => console.error(`  - ${filePath}`));
  }
  if (unexpectedWait.length) {
    console.error("Unexpected waitForTimeout files:");
    unexpectedWait.forEach((filePath) => console.error(`  + ${filePath}`));
  }
  if (staleWait.length) {
    console.error("Stale waitForTimeout allowlist entries:");
    staleWait.forEach((filePath) => console.error(`  - ${filePath}`));
  }
  process.exit(1);
}

main();
