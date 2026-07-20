import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  loadAllowlist,
  normalizeRelativePath,
  scanContentForStateWrites,
} = require("./eslint-rules/no-direct-state-mutation.js");

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = path.join(PROJECT_ROOT, "tools", "eslint-rules", "state-writer-allowlist.json");
const POLICY_PATH = path.join(PROJECT_ROOT, "tools", "state_writer_policy.json");
const SCAN_ROOTS = [
  path.join(PROJECT_ROOT, "js"),
  path.join(PROJECT_ROOT, "tests"),
];
const EXTENSIONS = new Set([".js", ".mjs"]);
const LEGACY_SCANNER_FIXTURE_PATHS = new Set([
  "tests/state_writer_policy_behavior.test.mjs",
  "tests/state_writer_policy_manifest_behavior.test.mjs",
  "tests/state_writer_scanner_soundness_behavior.test.mjs",
  "tests/state_writer_policy_soundness_behavior.test.mjs",
]);

function walkFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  const queue = [rootDir];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        continue;
      }
      if (!EXTENSIONS.has(path.extname(entry.name))) continue;
      results.push(nextPath);
    }
  }
  return results;
}

function collectCurrentWriters() {
  const current = new Set();
  for (const rootDir of SCAN_ROOTS) {
    for (const filePath of walkFiles(rootDir)) {
      const relativePath = normalizeRelativePath(
        path.relative(PROJECT_ROOT, filePath),
      );
      if (LEGACY_SCANNER_FIXTURE_PATHS.has(relativePath)) {
        continue;
      }
      const content = fs.readFileSync(filePath, "utf8");
      if (scanContentForStateWrites(content).length > 0) {
        current.add(relativePath);
      }
    }
  }
  return current;
}

const allowlist = loadAllowlist(ALLOWLIST_PATH);
const currentWriters = collectCurrentWriters();
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
const policyProjection = new Set(
  (policy.writers || [])
    .filter((writer) => writer?.authority === "legacy-direct")
    .map((writer) => normalizeRelativePath(writer.path)),
);
const unexpected = [...currentWriters].filter((filePath) => !allowlist.has(filePath)).sort();
const missingFromAllowlist = [...policyProjection]
  .filter((filePath) => !allowlist.has(filePath))
  .sort();
const stale = [...allowlist]
  .filter((filePath) => !policyProjection.has(filePath))
  .sort();

if (!unexpected.length && !missingFromAllowlist.length && !stale.length) {
  console.log(
    `State write allowlist passed with ${allowlist.size} policy-projected files; legacy scanner observed ${currentWriters.size}.`,
  );
  process.exit(0);
}

if (unexpected.length) {
  console.error("Unexpected direct state write files:");
  unexpected.forEach((filePath) => console.error(`  + ${filePath}`));
}
if (missingFromAllowlist.length) {
  console.error("Policy-projected direct state writers missing from the allowlist:");
  missingFromAllowlist.forEach((filePath) => console.error(`  + ${filePath}`));
}
if (stale.length) {
  console.error("Stale allowlist entries:");
  stale.forEach((filePath) => console.error(`  - ${filePath}`));
}
process.exit(1);
