import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CONSOLE_ALLOWLIST,
  normalizeSpecPath,
} = require("../tests/e2e/support/expectations/console-allowlist.js");

const REPO_ROOT = process.cwd();
const TEST_ROOT = path.join(REPO_ROOT, "tests", "e2e");
const SPEC_EXTENSIONS = new Set([".js"]);

function walkFiles(rootDir) {
  const results = [];
  const queue = [rootDir];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (toRepoPath(path.relative(REPO_ROOT, nextPath)).startsWith("tests/e2e/dev/")) {
          continue;
        }
        queue.push(nextPath);
        continue;
      }
      if (entry.isFile() && SPEC_EXTENSIONS.has(path.extname(entry.name)) && entry.name.endsWith(".spec.js")) {
        results.push(nextPath);
      }
    }
  }
  return results.sort();
}

function toRepoPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function specExists(specPath) {
  return fs.existsSync(path.join(REPO_ROOT, specPath));
}

function findInlineAllowlists() {
  const matches = [];
  for (const filePath of walkFiles(TEST_ROOT)) {
    const repoPath = toRepoPath(path.relative(REPO_ROOT, filePath));
    const content = fs.readFileSync(filePath, "utf8");
    if (/const\s+IGNORED_CONSOLE_PATTERNS\s*=\s*\[/m.test(content)) {
      matches.push(repoPath);
    }
  }
  return matches;
}

function validateEntries() {
  const today = new Date().toISOString().slice(0, 10);
  const ids = new Set();
  const problems = [];
  for (const entry of CONSOLE_ALLOWLIST) {
    if (ids.has(entry.id)) {
      problems.push(`duplicate id: ${entry.id}`);
      continue;
    }
    ids.add(entry.id);
    for (const field of ["id", "scope", "addedAt", "expiresAt", "ownerHint", "justification"]) {
      if (!String(entry[field] || "").trim()) {
        problems.push(`missing ${field} on ${entry.id}`);
      }
    }
    if (!(entry.pattern instanceof RegExp)) {
      problems.push(`pattern must be RegExp on ${entry.id}`);
    }
    if (entry.expiresAt < today) {
      problems.push(`expired allowlist entry: ${entry.id} (${entry.expiresAt})`);
    }
    if (entry.scope === "spec") {
      const specPaths = Array.isArray(entry.specPaths) ? entry.specPaths : [];
      if (!specPaths.length) {
        problems.push(`missing specPaths on ${entry.id}`);
      }
      for (const specPath of specPaths) {
        if (!specExists(specPath)) {
          problems.push(`stale specPath on ${entry.id}: ${specPath}`);
        }
      }
    }
  }
  return problems;
}

function main() {
  const entryProblems = validateEntries();
  const inlineAllowlists = findInlineAllowlists().filter((specPath) => {
    const normalized = normalizeSpecPath(specPath);
    return !normalized.startsWith("tests/e2e/dev/");
  });

  if (!entryProblems.length && !inlineAllowlists.length) {
    console.log(`Console allowlist passed with ${CONSOLE_ALLOWLIST.length} entries.`);
    return;
  }

  if (entryProblems.length) {
    console.error("Console allowlist metadata issues:");
    entryProblems.forEach((problem) => console.error(`  - ${problem}`));
  }
  if (inlineAllowlists.length) {
    console.error("Inline IGNORED_CONSOLE_PATTERNS remain in:");
    inlineAllowlists.forEach((specPath) => console.error(`  - ${specPath}`));
  }
  process.exit(1);
}

main();
