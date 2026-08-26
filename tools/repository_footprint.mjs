import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { atomicWriteJsonSync } from "./verification/resumable_verification.mjs";

const REPO_ROOT = process.cwd();
const TOOL_DIR = path.join(REPO_ROOT, "tools", "repository_footprint");
const DEFAULT_MANIFEST_PATH = path.join(TOOL_DIR, "baseline.v1.json");
const DEFAULT_JSON_OUT = path.join(
  REPO_ROOT,
  ".runtime",
  "reports",
  "generated",
  "repository-footprint.json",
);
const DEFAULT_MD_OUT = path.join(
  REPO_ROOT,
  ".runtime",
  "reports",
  "generated",
  "repository-footprint.md",
);
const HEX_OBJECT_ID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MANAGED_KINDS = new Set(["checksum-manifest", "source-manifest"]);
const MANAGEMENT_CLASSES = new Set([
  "existing-grandfathered",
  "managed-manifest",
  "waived-unmanaged",
  "new-unmanaged-large-blob",
]);
const POLICY_MODES = new Set(["report-only", "gate"]);
const POLICY_OUTCOMES = new Set(["pass", "warning", "fail"]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (value === undefined || String(value).startsWith("--")) {
    fail("repository-footprint-cli-value-missing", `${option} requires a value`);
  }
  return String(value);
}

export function parseArgs(argv) {
  const args = {
    ref: "HEAD",
    base: "",
    asOfDate: "",
    manifestPath: DEFAULT_MANIFEST_PATH,
    jsonOut: DEFAULT_JSON_OUT,
    mdOut: DEFAULT_MD_OUT,
    help: false,
  };
  const seen = new Set();
  const optionMap = new Map([
    ["--ref", "ref"],
    ["--base", "base"],
    ["--as-of", "asOfDate"],
    ["--manifest", "manifestPath"],
    ["--json-out", "jsonOut"],
    ["--md-out", "mdOut"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index]);
    if (token === "--help") {
      if (seen.has(token)) fail("repository-footprint-cli-duplicate", `duplicate option: ${token}`);
      seen.add(token);
      args.help = true;
      continue;
    }
    const property = optionMap.get(token);
    if (!property) fail("repository-footprint-cli-unknown", `unknown option: ${token}`);
    if (seen.has(token)) fail("repository-footprint-cli-duplicate", `duplicate option: ${token}`);
    seen.add(token);
    args[property] = takeValue(argv, index, token).trim();
    if (!args[property]) fail("repository-footprint-cli-empty", `${token} requires a non-empty value`);
    index += 1;
  }
  if (args.asOfDate) assertEvaluationDate(args.asOfDate, "--as-of");
  return args;
}

function assertEvaluationDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    fail("repository-footprint-cli-date-invalid", `${label} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("repository-footprint-cli-date-invalid", `${label} must be a real UTC calendar date`);
  }
}

export function resolveEvaluationDate(asOfDate, now = () => new Date()) {
  if (asOfDate) {
    assertEvaluationDate(asOfDate, "--as-of");
    return asOfDate;
  }
  const current = now();
  if (!(current instanceof Date) || Number.isNaN(current.valueOf())) {
    fail("repository-footprint-evaluation-date-invalid", "current UTC evaluation time is invalid");
  }
  return current.toISOString().slice(0, 10);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("repository-footprint-manifest-invalid", `${label} must be an object`);
  }
}

function assertExactKeys(value, allowed, required, label) {
  assertObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail("repository-footprint-manifest-unknown-field", `${label}.${key} is unknown`);
    }
  }
  for (const key of required) {
    if (!(key in value)) {
      fail("repository-footprint-manifest-field-missing", `${label}.${key} is required`);
    }
  }
}

function assertPositiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    fail("repository-footprint-manifest-invalid", `${label} must be an integer from 1 to ${maximum}`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("repository-footprint-manifest-invalid", `${label} must be a non-negative integer`);
  }
}

function assertObjectId(value, label) {
  if (typeof value !== "string" || !HEX_OBJECT_ID.test(value)) {
    fail("repository-footprint-manifest-invalid", `${label} must be a 40- or 64-character lowercase Git object id`);
  }
}

function assertRepositoryPath(value, label) {
  if (
    typeof value !== "string"
    || !value
    || value.startsWith("/")
    || value.endsWith("/")
    || value.includes("\\")
    || value.includes("\0")
    || value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    fail("repository-footprint-manifest-invalid", `${label} must be a canonical repository-relative path`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail("repository-footprint-manifest-invalid", `${label} must be a non-empty string`);
  }
}

function assertValidDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    fail("repository-footprint-manifest-invalid", `${label} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("repository-footprint-manifest-invalid", `${label} is not a real calendar date`);
  }
}

export function validateManifest(manifest) {
  assertExactKeys(
    manifest,
    ["schemaVersion", "policy", "baseline", "managedAssets", "waivers"],
    ["schemaVersion", "policy", "baseline", "managedAssets", "waivers"],
    "manifest",
  );
  if (manifest.schemaVersion !== 1) {
    fail("repository-footprint-manifest-version", "manifest.schemaVersion must equal 1");
  }

  assertExactKeys(
    manifest.policy,
    ["mode", "largeBlobThresholdBytes", "topN", "pathGroupDepth"],
    ["mode", "largeBlobThresholdBytes", "topN", "pathGroupDepth"],
    "manifest.policy",
  );
  if (!POLICY_MODES.has(manifest.policy.mode)) {
    fail("repository-footprint-manifest-invalid", "manifest.policy.mode must be report-only or gate");
  }
  assertPositiveInteger(manifest.policy.largeBlobThresholdBytes, "manifest.policy.largeBlobThresholdBytes");
  assertPositiveInteger(manifest.policy.topN, "manifest.policy.topN", 100);
  assertPositiveInteger(manifest.policy.pathGroupDepth, "manifest.policy.pathGroupDepth", 20);

  assertExactKeys(
    manifest.baseline,
    ["commit", "trackedFileCount", "checkoutTreeBytes"],
    ["commit", "trackedFileCount", "checkoutTreeBytes"],
    "manifest.baseline",
  );
  assertObjectId(manifest.baseline.commit, "manifest.baseline.commit");
  assertNonNegativeInteger(manifest.baseline.trackedFileCount, "manifest.baseline.trackedFileCount");
  assertNonNegativeInteger(manifest.baseline.checkoutTreeBytes, "manifest.baseline.checkoutTreeBytes");

  if (!Array.isArray(manifest.managedAssets)) {
    fail("repository-footprint-manifest-invalid", "manifest.managedAssets must be an array");
  }
  const managedPaths = new Set();
  manifest.managedAssets.forEach((asset, index) => {
    const label = `manifest.managedAssets[${index}]`;
    assertExactKeys(
      asset,
      ["path", "manifestPath", "managementKind", "evidencePointer"],
      ["path", "manifestPath", "managementKind", "evidencePointer"],
      label,
    );
    assertRepositoryPath(asset.path, `${label}.path`);
    assertRepositoryPath(asset.manifestPath, `${label}.manifestPath`);
    if (!MANAGED_KINDS.has(asset.managementKind)) {
      fail("repository-footprint-manifest-invalid", `${label}.managementKind is invalid`);
    }
    if (typeof asset.evidencePointer !== "string" || !asset.evidencePointer.startsWith("/")) {
      fail("repository-footprint-manifest-invalid", `${label}.evidencePointer must be an absolute JSON pointer`);
    }
    if (managedPaths.has(asset.path)) {
      fail("repository-footprint-manifest-invalid", `duplicate managed asset path: ${asset.path}`);
    }
    managedPaths.add(asset.path);
  });

  if (!Array.isArray(manifest.waivers)) {
    fail("repository-footprint-manifest-invalid", "manifest.waivers must be an array");
  }
  const waiverIds = new Set();
  manifest.waivers.forEach((waiver, index) => {
    const label = `manifest.waivers[${index}]`;
    assertExactKeys(
      waiver,
      ["id", "path", "blobOid", "maxBytes", "expiresOn", "reason"],
      ["id", "path", "blobOid", "maxBytes", "expiresOn", "reason"],
      label,
    );
    assertNonEmptyString(waiver.id, `${label}.id`);
    assertRepositoryPath(waiver.path, `${label}.path`);
    assertObjectId(waiver.blobOid, `${label}.blobOid`);
    assertPositiveInteger(waiver.maxBytes, `${label}.maxBytes`);
    assertValidDate(waiver.expiresOn, `${label}.expiresOn`);
    assertNonEmptyString(waiver.reason, `${label}.reason`);
    if (waiverIds.has(waiver.id)) {
      fail("repository-footprint-manifest-invalid", `duplicate waiver id: ${waiver.id}`);
    }
    waiverIds.add(waiver.id);
  });
  return manifest;
}

export function parseLsTree(output) {
  const text = Buffer.isBuffer(output) ? output.toString("utf8") : String(output || "");
  const records = text.split("\0");
  if (records.at(-1) !== "") {
    fail("repository-footprint-ls-tree-invalid", "git ls-tree output must be NUL terminated");
  }
  records.pop();
  const paths = new Set();
  return records.map((record, index) => {
    const match = record.match(/^(\d{6}) (blob|commit) ([0-9a-f]{40}(?:[0-9a-f]{24})?) +(-|\d+)\t([\s\S]+)$/);
    if (!match) fail("repository-footprint-ls-tree-invalid", `invalid git ls-tree record at index ${index}`);
    const [, mode, type, oid, rawBytes, repositoryPath] = match;
    if (!repositoryPath || repositoryPath.includes("\0")) {
      fail("repository-footprint-ls-tree-invalid", `invalid path at git ls-tree record ${index}`);
    }
    if (paths.has(repositoryPath)) {
      fail("repository-footprint-ls-tree-invalid", `duplicate path in git ls-tree output: ${repositoryPath}`);
    }
    paths.add(repositoryPath);
    if ((type === "commit") !== (rawBytes === "-")) {
      fail("repository-footprint-ls-tree-invalid", `invalid object size for ${repositoryPath}`);
    }
    const bytes = rawBytes === "-" ? 0 : Number(rawBytes);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      fail("repository-footprint-ls-tree-invalid", `invalid byte size for ${repositoryPath}`);
    }
    return Object.freeze({ mode, type, oid, bytes, path: repositoryPath });
  });
}

export function parseCountObjects(output) {
  const allowed = new Set([
    "count",
    "size",
    "in-pack",
    "packs",
    "size-pack",
    "prune-packable",
    "garbage",
    "size-garbage",
  ]);
  const values = new Map();
  const lines = String(output || "").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([a-z-]+): (\d+)$/);
    if (!match || !allowed.has(match[1]) || values.has(match[1])) {
      fail("repository-footprint-count-objects-invalid", `invalid git count-objects line: ${line}`);
    }
    const value = Number(match[2]);
    if (!Number.isSafeInteger(value)) {
      fail("repository-footprint-count-objects-invalid", `invalid git count-objects value: ${line}`);
    }
    values.set(match[1], value);
  }
  for (const key of allowed) {
    if (!values.has(key)) fail("repository-footprint-count-objects-invalid", `missing git count-objects field: ${key}`);
  }
  const kibToBytes = (value) => value * 1024;
  const looseObjectBytes = kibToBytes(values.get("size"));
  const packBytes = kibToBytes(values.get("size-pack"));
  const garbageBytes = kibToBytes(values.get("size-garbage"));
  return Object.freeze({
    looseObjectCount: values.get("count"),
    looseObjectBytes,
    packedObjectCount: values.get("in-pack"),
    packCount: values.get("packs"),
    packBytes,
    prunePackableObjectCount: values.get("prune-packable"),
    garbageObjectCount: values.get("garbage"),
    garbageBytes,
    totalObjectStoreBytes: looseObjectBytes + packBytes + garbageBytes,
    scope: "shared-git-object-database",
    measurement: "git-count-objects-kib-converted-to-bytes",
  });
}

function compareBytesThenText(left, right, byteKey, textKey) {
  return right[byteKey] - left[byteKey] || left[textKey].localeCompare(right[textKey], "en");
}

export function buildTopBlobs(entries, topN) {
  const byOid = new Map();
  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    const existing = byOid.get(entry.oid);
    if (existing && existing.bytes !== entry.bytes) {
      fail("repository-footprint-tree-inconsistent", `blob ${entry.oid} has conflicting sizes`);
    }
    if (existing) existing.paths.push(entry.path);
    else byOid.set(entry.oid, { oid: entry.oid, bytes: entry.bytes, paths: [entry.path] });
  }
  return [...byOid.values()]
    .map((entry) => ({ ...entry, paths: entry.paths.sort((a, b) => a.localeCompare(b, "en")) }))
    .sort((left, right) => compareBytesThenText(left, right, "bytes", "oid"))
    .slice(0, topN)
    .map((entry) => Object.freeze({ ...entry, pathCount: entry.paths.length }));
}

export function buildTopPathTotals(entries, topN, pathGroupDepth) {
  const totals = new Map();
  for (const entry of entries) {
    const groupPath = entry.path.split("/").slice(0, pathGroupDepth).join("/");
    const current = totals.get(groupPath) || { path: groupPath, totalBytes: 0, trackedFileCount: 0 };
    current.totalBytes += entry.bytes;
    current.trackedFileCount += 1;
    totals.set(groupPath, current);
  }
  return [...totals.values()]
    .sort((left, right) => compareBytesThenText(left, right, "totalBytes", "path"))
    .slice(0, topN)
    .map((entry) => Object.freeze(entry));
}

function mapByPath(entries) {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function activeWaiverFor(entry, waivers, asOfDate) {
  return waivers.find((waiver) => (
    waiver.path === entry.path
    && waiver.blobOid === entry.oid
    && entry.bytes <= waiver.maxBytes
    && waiver.expiresOn >= asOfDate
  ));
}

export function classifyAsset(entry, { baselineByPath, managedPaths, waivers, asOfDate }) {
  if (managedPaths.has(entry.path)) return { managementClass: "managed-manifest", waiverId: null };
  const baselineEntry = baselineByPath.get(entry.path);
  if (baselineEntry?.oid === entry.oid) {
    return { managementClass: "existing-grandfathered", waiverId: null };
  }
  const waiver = activeWaiverFor(entry, waivers, asOfDate);
  if (waiver) return { managementClass: "waived-unmanaged", waiverId: waiver.id };
  return { managementClass: "new-unmanaged-large-blob", waiverId: null };
}

export function buildLargeAssetInventory({
  currentEntries,
  baselineEntries,
  managedPaths = new Set(),
  waivers = [],
  thresholdBytes,
  asOfDate,
}) {
  const baselineByPath = mapByPath(baselineEntries);
  return currentEntries
    .filter((entry) => entry.type === "blob" && entry.bytes >= thresholdBytes)
    .map((entry) => ({
      path: entry.path,
      oid: entry.oid,
      bytes: entry.bytes,
      ...classifyAsset(entry, { baselineByPath, managedPaths, waivers, asOfDate }),
    }))
    .sort((left, right) => compareBytesThenText(left, right, "bytes", "path"));
}

export function compareLargeBlobs({
  currentEntries,
  baseEntries,
  baselineEntries,
  managedPaths = new Set(),
  waivers = [],
  thresholdBytes,
  asOfDate,
}) {
  const baseByPath = mapByPath(baseEntries);
  const baselineByPath = mapByPath(baselineEntries);
  return currentEntries
    .filter((entry) => entry.type === "blob" && entry.bytes >= thresholdBytes)
    .filter((entry) => baseByPath.get(entry.path)?.oid !== entry.oid)
    .map((entry) => {
      const previous = baseByPath.get(entry.path);
      return {
        changeType: previous ? "replaced" : "added",
        path: entry.path,
        oid: entry.oid,
        bytes: entry.bytes,
        previousOid: previous?.oid || null,
        previousBytes: previous?.bytes ?? null,
        ...classifyAsset(entry, { baselineByPath, managedPaths, waivers, asOfDate }),
      };
    })
    .sort((left, right) => compareBytesThenText(left, right, "bytes", "path"));
}

function countClasses(entries) {
  const counts = {
    existingGrandfathered: 0,
    managedManifest: 0,
    waivedUnmanaged: 0,
    newUnmanagedLargeBlob: 0,
  };
  const keyByClass = {
    "existing-grandfathered": "existingGrandfathered",
    "managed-manifest": "managedManifest",
    "waived-unmanaged": "waivedUnmanaged",
    "new-unmanaged-large-blob": "newUnmanagedLargeBlob",
  };
  for (const entry of entries) counts[keyByClass[entry.managementClass]] += 1;
  return counts;
}

function resolveJsonPointer(document, pointer) {
  const parts = pointer.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = document;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      fail("repository-footprint-managed-evidence-invalid", `JSON pointer does not resolve: ${pointer}`);
    }
    current = current[part];
  }
  return current;
}

export function validateManagedEvidence({ asset, manifestDocument, targetBytes, targetBuffer }) {
  const evidence = resolveJsonPointer(manifestDocument, asset.evidencePointer);
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("repository-footprint-managed-evidence-invalid", `managed evidence must be an object: ${asset.evidencePointer}`);
  }
  if (!Buffer.isBuffer(targetBuffer) || targetBuffer.length !== targetBytes) {
    fail("repository-footprint-managed-evidence-invalid", `target bytes do not match the target blob for ${asset.path}`);
  }
  const actualSha256 = createHash("sha256").update(targetBuffer).digest("hex");
  if (asset.managementKind === "checksum-manifest") {
    if (evidence.size_bytes !== targetBytes || !/^[0-9a-f]{64}$/.test(evidence.sha256 || "")) {
      fail("repository-footprint-managed-evidence-invalid", `checksum evidence is incomplete for ${asset.path}`);
    }
    if (actualSha256 !== evidence.sha256) {
      fail("repository-footprint-managed-evidence-invalid", `checksum evidence does not match ${asset.path}`);
    }
  } else {
    if (
      evidence.path !== asset.path
      || evidence.size_bytes !== targetBytes
      || !/^[0-9a-f]{64}$/.test(evidence.sha256 || "")
    ) {
      fail(
        "repository-footprint-managed-evidence-invalid",
        `source evidence must bind exact output path, bytes, and SHA-256 for ${asset.path}`,
      );
    }
    if (actualSha256 !== evidence.sha256) {
      fail("repository-footprint-managed-evidence-invalid", `source evidence does not match ${asset.path}`);
    }
  }
  return true;
}

function runGit(args, { runner = spawnSync, encoding = "utf8" } = {}) {
  const result = runner("git", args, {
    cwd: REPO_ROOT,
    encoding,
    shell: false,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : String(result.stderr || "");
    fail("repository-footprint-git-failed", `git ${args[0]} failed: ${detail.trim()}`);
  }
  return result.stdout;
}

export function resolveCommit(ref, runner = spawnSync) {
  if (typeof ref !== "string" || !ref.trim() || ref.includes("\0")) {
    fail("repository-footprint-ref-invalid", "Git revision must be a non-empty string without NUL bytes");
  }
  const stdout = runGit(
    ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
    { runner, encoding: "utf8" },
  );
  const commit = String(stdout).trim();
  if (!HEX_OBJECT_ID.test(commit)) {
    fail("repository-footprint-ref-invalid", `Git revision did not resolve to a commit: ${ref}`);
  }
  return commit;
}

function readTree(commit, runner = spawnSync) {
  return parseLsTree(runGit(["ls-tree", "-r", "-l", "-z", "--full-tree", commit], { runner, encoding: "buffer" }));
}

function readCommitDate(commit, runner = spawnSync) {
  const value = String(runGit(["show", "-s", "--format=%cI", commit], { runner, encoding: "utf8" })).trim();
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.valueOf())) {
    fail("repository-footprint-commit-date-invalid", `commit date is invalid for ${commit}`);
  }
  return value;
}

function readJsonFromGit(commit, repositoryPath, runner = spawnSync) {
  const raw = runGit(["show", `${commit}:${repositoryPath}`], { runner, encoding: "utf8" });
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    fail("repository-footprint-managed-evidence-invalid", `${repositoryPath} is not valid JSON: ${error.message}`);
  }
}

function readBlob(oid, runner = spawnSync) {
  return runGit(["cat-file", "blob", oid], { runner, encoding: "buffer" });
}

function loadManifest(manifestPath) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail("repository-footprint-manifest-unreadable", `cannot read manifest ${manifestPath}: ${error.message}`);
  }
  return validateManifest(payload);
}

function sumTreeBytes(entries) {
  return entries.reduce((total, entry) => total + entry.bytes, 0);
}

function buildManagedPathSet(manifest, currentEntries, currentCommit, runner) {
  const currentByPath = mapByPath(currentEntries);
  const managedPaths = new Set();
  for (const asset of manifest.managedAssets) {
    const target = currentByPath.get(asset.path);
    if (!target) continue;
    if (target.type !== "blob") {
      fail("repository-footprint-managed-evidence-invalid", `managed asset is not a blob: ${asset.path}`);
    }
    const manifestEntry = currentByPath.get(asset.manifestPath);
    if (!manifestEntry || manifestEntry.type !== "blob") {
      fail("repository-footprint-managed-evidence-invalid", `managed evidence file is missing: ${asset.manifestPath}`);
    }
    validateManagedEvidence({
      asset,
      manifestDocument: readJsonFromGit(currentCommit, asset.manifestPath, runner),
      targetBytes: target.bytes,
      targetBuffer: readBlob(target.oid, runner),
    });
    managedPaths.add(asset.path);
  }
  return managedPaths;
}

export function buildReport({
  targetCommit,
  targetCommitDate,
  asOfDate,
  baseCommit,
  baselineCommit,
  currentEntries,
  baseEntries,
  baselineEntries,
  objectDatabase,
  manifest,
  managedPaths,
}) {
  const trackedFileCount = currentEntries.length;
  const checkoutTreeBytes = sumTreeBytes(currentEntries);
  const largeAssetInventory = buildLargeAssetInventory({
    currentEntries,
    baselineEntries,
    managedPaths,
    waivers: manifest.waivers,
    thresholdBytes: manifest.policy.largeBlobThresholdBytes,
    asOfDate,
  });
  const changedLargeBlobs = compareLargeBlobs({
    currentEntries,
    baseEntries,
    baselineEntries,
    managedPaths,
    waivers: manifest.waivers,
    thresholdBytes: manifest.policy.largeBlobThresholdBytes,
    asOfDate,
  });
  const findings = changedLargeBlobs
    .filter((entry) => entry.managementClass === "new-unmanaged-large-blob")
    .map((entry) => ({
      code: "new-unmanaged-large-blob",
      severity: "warning",
      path: entry.path,
      oid: entry.oid,
      bytes: entry.bytes,
      message: `large ${entry.changeType} blob has no baseline identity, managed manifest evidence, or active exact waiver`,
    }));
  const outcome = findings.length === 0
    ? "pass"
    : manifest.policy.mode === "report-only" ? "warning" : "fail";

  return {
    schemaVersion: 1,
    target: {
      commit: targetCommit,
      commitDate: targetCommitDate,
      trackedFileCount,
      checkoutTreeBytes,
      checkoutTreeMeasurement: "sum-of-git-tree-path-blob-bytes",
    },
    gitObjectDatabase: objectDatabase,
    rankings: {
      topN: manifest.policy.topN,
      pathGroupDepth: manifest.policy.pathGroupDepth,
      topBlobsByBytes: buildTopBlobs(currentEntries, manifest.policy.topN),
      topPathGroupsByTotalBytes: buildTopPathTotals(
        currentEntries,
        manifest.policy.topN,
        manifest.policy.pathGroupDepth,
      ),
    },
    comparison: {
      baseCommit,
      largeBlobThresholdBytes: manifest.policy.largeBlobThresholdBytes,
      changedLargeBlobs,
      changedLargeBlobCounts: countClasses(changedLargeBlobs),
    },
    policy: {
      mode: manifest.policy.mode,
      outcome,
      evaluatedAt: asOfDate,
      baselineCommit,
      largeAssetCounts: countClasses(largeAssetInventory),
      largeAssetInventory,
      findings,
    },
  };
}

function reportInvalid(message) {
  fail("repository-footprint-report-invalid", message);
}

function assertReportObject(value, label, allowed, required = allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reportInvalid(`${label} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) reportInvalid(`${label}.${key} is unknown`);
  }
  for (const key of required) {
    if (!(key in value)) reportInvalid(`${label}.${key} is required`);
  }
}

function assertReportArray(value, label) {
  if (!Array.isArray(value)) reportInvalid(`${label} must be an array`);
}

function assertReportInteger(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    reportInvalid(`${label} must be an integer greater than or equal to ${minimum}`);
  }
}

function assertReportString(value, label, { nonEmpty = false } = {}) {
  if (typeof value !== "string" || (nonEmpty && value.length === 0)) {
    reportInvalid(`${label} must be ${nonEmpty ? "a non-empty" : "a"} string`);
  }
}

function assertReportObjectId(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !HEX_OBJECT_ID.test(value)) {
    reportInvalid(`${label} must be a 40- or 64-character lowercase Git object id${nullable ? " or null" : ""}`);
  }
}

function assertReportDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) reportInvalid(`${label} must use YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    reportInvalid(`${label} must be a real calendar date`);
  }
}

function assertReportDateTime(value, label) {
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof value !== "string" || !isoDateTime.test(value) || Number.isNaN(new Date(value).valueOf())) {
    reportInvalid(`${label} must be an ISO date-time string`);
  }
}

function validateClassCounts(value, label) {
  const keys = ["existingGrandfathered", "managedManifest", "waivedUnmanaged", "newUnmanagedLargeBlob"];
  assertReportObject(value, label, keys);
  for (const key of keys) assertReportInteger(value[key], `${label}.${key}`);
}

function validateManagementClass(value, label) {
  if (!MANAGEMENT_CLASSES.has(value)) reportInvalid(`${label} has an invalid management class`);
}

function validateClassifiedBlob(value, label) {
  assertReportObject(value, label, ["path", "oid", "bytes", "managementClass", "waiverId"]);
  assertReportString(value.path, `${label}.path`, { nonEmpty: true });
  assertReportObjectId(value.oid, `${label}.oid`);
  assertReportInteger(value.bytes, `${label}.bytes`);
  validateManagementClass(value.managementClass, `${label}.managementClass`);
  if (value.waiverId !== null) assertReportString(value.waiverId, `${label}.waiverId`);
}

export function validateReport(report) {
  assertReportObject(
    report,
    "report",
    ["schemaVersion", "target", "gitObjectDatabase", "rankings", "comparison", "policy"],
  );
  if (report.schemaVersion !== 1) reportInvalid("report.schemaVersion must equal 1");

  assertReportObject(
    report.target,
    "report.target",
    ["commit", "commitDate", "trackedFileCount", "checkoutTreeBytes", "checkoutTreeMeasurement"],
  );
  assertReportObjectId(report.target.commit, "report.target.commit");
  assertReportDateTime(report.target.commitDate, "report.target.commitDate");
  assertReportInteger(report.target.trackedFileCount, "report.target.trackedFileCount");
  assertReportInteger(report.target.checkoutTreeBytes, "report.target.checkoutTreeBytes");
  if (report.target.checkoutTreeMeasurement !== "sum-of-git-tree-path-blob-bytes") {
    reportInvalid("report.target.checkoutTreeMeasurement is invalid");
  }

  const objectDatabaseKeys = [
    "looseObjectCount",
    "looseObjectBytes",
    "packedObjectCount",
    "packCount",
    "packBytes",
    "prunePackableObjectCount",
    "garbageObjectCount",
    "garbageBytes",
    "totalObjectStoreBytes",
    "scope",
    "measurement",
  ];
  assertReportObject(report.gitObjectDatabase, "report.gitObjectDatabase", objectDatabaseKeys);
  for (const key of objectDatabaseKeys.slice(0, 9)) {
    assertReportInteger(report.gitObjectDatabase[key], `report.gitObjectDatabase.${key}`);
  }
  if (report.gitObjectDatabase.scope !== "shared-git-object-database") {
    reportInvalid("report.gitObjectDatabase.scope is invalid");
  }
  if (report.gitObjectDatabase.measurement !== "git-count-objects-kib-converted-to-bytes") {
    reportInvalid("report.gitObjectDatabase.measurement is invalid");
  }

  assertReportObject(
    report.rankings,
    "report.rankings",
    ["topN", "pathGroupDepth", "topBlobsByBytes", "topPathGroupsByTotalBytes"],
  );
  assertReportInteger(report.rankings.topN, "report.rankings.topN", 1);
  assertReportInteger(report.rankings.pathGroupDepth, "report.rankings.pathGroupDepth", 1);
  assertReportArray(report.rankings.topBlobsByBytes, "report.rankings.topBlobsByBytes");
  report.rankings.topBlobsByBytes.forEach((entry, index) => {
    const label = `report.rankings.topBlobsByBytes[${index}]`;
    assertReportObject(entry, label, ["oid", "bytes", "paths", "pathCount"]);
    assertReportObjectId(entry.oid, `${label}.oid`);
    assertReportInteger(entry.bytes, `${label}.bytes`);
    assertReportArray(entry.paths, `${label}.paths`);
    if (entry.paths.length < 1) reportInvalid(`${label}.paths must contain at least one path`);
    entry.paths.forEach((repositoryPath, pathIndex) => {
      assertReportString(repositoryPath, `${label}.paths[${pathIndex}]`);
    });
    assertReportInteger(entry.pathCount, `${label}.pathCount`, 1);
  });
  assertReportArray(report.rankings.topPathGroupsByTotalBytes, "report.rankings.topPathGroupsByTotalBytes");
  report.rankings.topPathGroupsByTotalBytes.forEach((entry, index) => {
    const label = `report.rankings.topPathGroupsByTotalBytes[${index}]`;
    assertReportObject(entry, label, ["path", "totalBytes", "trackedFileCount"]);
    assertReportString(entry.path, `${label}.path`, { nonEmpty: true });
    assertReportInteger(entry.totalBytes, `${label}.totalBytes`);
    assertReportInteger(entry.trackedFileCount, `${label}.trackedFileCount`, 1);
  });

  assertReportObject(
    report.comparison,
    "report.comparison",
    ["baseCommit", "largeBlobThresholdBytes", "changedLargeBlobs", "changedLargeBlobCounts"],
  );
  assertReportObjectId(report.comparison.baseCommit, "report.comparison.baseCommit");
  assertReportInteger(report.comparison.largeBlobThresholdBytes, "report.comparison.largeBlobThresholdBytes", 1);
  assertReportArray(report.comparison.changedLargeBlobs, "report.comparison.changedLargeBlobs");
  report.comparison.changedLargeBlobs.forEach((entry, index) => {
    const label = `report.comparison.changedLargeBlobs[${index}]`;
    assertReportObject(
      entry,
      label,
      ["changeType", "path", "oid", "bytes", "previousOid", "previousBytes", "managementClass", "waiverId"],
    );
    if (!new Set(["added", "replaced"]).has(entry.changeType)) reportInvalid(`${label}.changeType is invalid`);
    assertReportString(entry.path, `${label}.path`, { nonEmpty: true });
    assertReportObjectId(entry.oid, `${label}.oid`);
    assertReportInteger(entry.bytes, `${label}.bytes`);
    assertReportObjectId(entry.previousOid, `${label}.previousOid`, { nullable: true });
    if (entry.previousBytes !== null) assertReportInteger(entry.previousBytes, `${label}.previousBytes`);
    validateManagementClass(entry.managementClass, `${label}.managementClass`);
    if (entry.waiverId !== null) assertReportString(entry.waiverId, `${label}.waiverId`);
  });
  validateClassCounts(report.comparison.changedLargeBlobCounts, "report.comparison.changedLargeBlobCounts");

  assertReportObject(
    report.policy,
    "report.policy",
    ["mode", "outcome", "evaluatedAt", "baselineCommit", "largeAssetCounts", "largeAssetInventory", "findings"],
  );
  if (!POLICY_MODES.has(report.policy.mode)) reportInvalid("report.policy.mode is invalid");
  if (!POLICY_OUTCOMES.has(report.policy.outcome)) reportInvalid("report.policy.outcome is invalid");
  assertReportDate(report.policy.evaluatedAt, "report.policy.evaluatedAt");
  assertReportObjectId(report.policy.baselineCommit, "report.policy.baselineCommit");
  validateClassCounts(report.policy.largeAssetCounts, "report.policy.largeAssetCounts");
  assertReportArray(report.policy.largeAssetInventory, "report.policy.largeAssetInventory");
  report.policy.largeAssetInventory.forEach((entry, index) => {
    validateClassifiedBlob(entry, `report.policy.largeAssetInventory[${index}]`);
  });
  assertReportArray(report.policy.findings, "report.policy.findings");
  report.policy.findings.forEach((finding, index) => {
    const label = `report.policy.findings[${index}]`;
    assertReportObject(finding, label, ["code", "severity", "path", "oid", "bytes", "message"]);
    if (finding.code !== "new-unmanaged-large-blob") reportInvalid(`${label}.code is invalid`);
    if (finding.severity !== "warning") reportInvalid(`${label}.severity is invalid`);
    assertReportString(finding.path, `${label}.path`, { nonEmpty: true });
    assertReportObjectId(finding.oid, `${label}.oid`);
    assertReportInteger(finding.bytes, `${label}.bytes`);
    assertReportString(finding.message, `${label}.message`, { nonEmpty: true });
  });
  return report;
}

function renderMarkdown(report) {
  const formatBytes = (bytes) => `${bytes.toLocaleString("en-US")} bytes`;
  const lines = [
    "# Repository footprint report",
    "",
    `- target: \`${report.target.commit}\``,
    `- target commit date: \`${report.target.commitDate}\``,
    `- evaluated at (UTC): \`${report.policy.evaluatedAt}\``,
    `- base: \`${report.comparison.baseCommit}\``,
    `- baseline: \`${report.policy.baselineCommit}\``,
    `- policy: \`${report.policy.mode}\` / \`${report.policy.outcome}\``,
    `- tracked files: ${report.target.trackedFileCount.toLocaleString("en-US")}`,
    `- checkout tree: ${formatBytes(report.target.checkoutTreeBytes)}`,
    `- Git object store: ${formatBytes(report.gitObjectDatabase.totalObjectStoreBytes)}`,
    `- large-blob threshold: ${formatBytes(report.comparison.largeBlobThresholdBytes)}`,
    `- new or replaced large blobs: ${report.comparison.changedLargeBlobs.length}`,
    `- unmanaged findings: ${report.policy.findings.length}`,
    "",
    "## Findings",
    "",
  ];
  if (report.policy.findings.length === 0) lines.push("- none");
  else {
    for (const finding of report.policy.findings) {
      lines.push(`- \`${finding.path}\`: ${formatBytes(finding.bytes)} (${finding.code})`);
    }
  }
  lines.push("", "## Largest blobs", "");
  for (const entry of report.rankings.topBlobsByBytes) {
    lines.push(`- ${formatBytes(entry.bytes)} \`${entry.paths[0]}\` (${entry.pathCount} path${entry.pathCount === 1 ? "" : "s"})`);
  }
  lines.push("", "## Largest path groups", "");
  for (const entry of report.rankings.topPathGroupsByTotalBytes) {
    lines.push(`- ${formatBytes(entry.totalBytes)} \`${entry.path}\` (${entry.trackedFileCount} tracked files)`);
  }
  return `${lines.join("\n")}\n`;
}

function printHelp() {
  process.stdout.write([
    "Usage: node tools/repository_footprint.mjs [options]",
    "",
    "Options:",
    "  --ref <revision>       target commit/tree (default: HEAD)",
    "  --base <revision>      comparison base (default: manifest baseline commit)",
    "  --as-of <YYYY-MM-DD>   UTC policy evaluation date (default: current UTC date)",
    "  --manifest <path>      versioned baseline/waiver manifest",
    "  --json-out <path>      JSON report output",
    "  --md-out <path>        Markdown report output",
    "  --help                 show this help",
    "",
  ].join("\n"));
}

export function runRepositoryFootprint(args, { runner = spawnSync, now = () => new Date() } = {}) {
  const manifestPath = path.resolve(args.manifestPath);
  const manifest = loadManifest(manifestPath);
  const targetCommit = resolveCommit(args.ref, runner);
  const baseCommit = resolveCommit(args.base || manifest.baseline.commit, runner);
  const baselineCommit = resolveCommit(manifest.baseline.commit, runner);
  const currentEntries = readTree(targetCommit, runner);
  const baseEntries = baseCommit === targetCommit ? currentEntries : readTree(baseCommit, runner);
  const baselineEntries = baselineCommit === targetCommit
    ? currentEntries
    : baselineCommit === baseCommit ? baseEntries : readTree(baselineCommit, runner);
  if (
    baselineEntries.length !== manifest.baseline.trackedFileCount
    || sumTreeBytes(baselineEntries) !== manifest.baseline.checkoutTreeBytes
  ) {
    fail(
      "repository-footprint-baseline-drift",
      "manifest baseline counts do not match its frozen Git tree",
    );
  }
  const commitDate = readCommitDate(targetCommit, runner);
  const asOfDate = resolveEvaluationDate(args.asOfDate, now);
  const managedPaths = buildManagedPathSet(manifest, currentEntries, targetCommit, runner);
  const objectDatabase = parseCountObjects(
    runGit(["count-objects", "-v"], { runner, encoding: "utf8" }),
  );
  const report = validateReport(buildReport({
    targetCommit,
    targetCommitDate: commitDate,
    asOfDate,
    baseCommit,
    baselineCommit,
    currentEntries,
    baseEntries,
    baselineEntries,
    objectDatabase,
    manifest,
    managedPaths,
  }));
  atomicWriteJsonSync(path.resolve(args.jsonOut), report);
  const mdOut = path.resolve(args.mdOut);
  fs.mkdirSync(path.dirname(mdOut), { recursive: true });
  fs.writeFileSync(mdOut, renderMarkdown(report), "utf8");
  return report;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    const report = runRepositoryFootprint(args);
    for (const finding of report.policy.findings) {
      process.stderr.write(`::warning file=${finding.path}::${finding.message}; bytes=${finding.bytes}; oid=${finding.oid}\n`);
    }
    process.stdout.write(
      `repository footprint ${report.policy.outcome}: ${report.target.trackedFileCount} tracked files, ${report.target.checkoutTreeBytes} checkout bytes, ${report.policy.findings.length} finding(s)\n`,
    );
    if (report.policy.mode === "gate" && report.policy.findings.length > 0) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`[repository-footprint] ${error.code || "error"}: ${error.message}\n`);
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) await main();
