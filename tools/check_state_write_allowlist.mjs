import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { discoverGlobalStateImportBindings } from "./state_writer_policy.mjs";
import { scanStateMutations } from "./state_writer_inventory.mjs";

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
// Test-local fixtures are not the application singleton. Resolve canonical
// imports and lexical bindings rather than matching text inside assertions.
export function hasDirectStateWrites(content, relativePath) {
  if (!normalizeRelativePath(relativePath).startsWith("tests/")) {
    return scanContentForStateWrites(content).length > 0;
  }
  let imports;
  try {
    imports = discoverGlobalStateImportBindings(content, { filePath: relativePath });
  } catch (error) {
    // Browser tests also use dynamic imports. Keep the existing conservative
    // scan for access forms the binding resolver cannot represent.
    if (error.code !== "unsupported-global-state-facade-access") throw error;
    return scanContentForStateWrites(content).length > 0;
  }
  if (!imports.length) return false;
  // Escape diagnostics also cover readonly assertions; the policy checker
  // handles those separately. This check inventories concrete direct writes.
  return scanStateMutations(content, {
    filePath: relativePath,
    bindings: imports.map(({ localName, importSource, importedName }) => ({
      id: `module:${localName}`,
      kind: "module",
      name: localName,
      importSource,
      importedName,
    })),
  }).some((finding) => finding.operation !== "unsupported");
}

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
      const content = fs.readFileSync(filePath, "utf8");
      if (hasDirectStateWrites(content, relativePath)) {
        current.add(relativePath);
      }
    }
  }
  return current;
}

function main() {
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
      `State write allowlist passed with ${allowlist.size} policy-projected files; direct write scans observed ${currentWriters.size}.`,
    );
    return 0;
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
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exitCode = main();
}
