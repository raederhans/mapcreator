import crypto from "node:crypto";

export const P4_REPOSITORY_ANALYSIS_RECEIPT_SCHEMA_VERSION = 1;
export const P4_REPOSITORY_ANALYSIS_RECEIPT_KIND =
  "scenario-forge-p4-repository-analysis-digest-receipt";

const RECEIPT_FIELDS = Object.freeze([
  "schemaVersion",
  "kind",
  "bundleDigest",
  "factsDigest",
  "source",
  "inputPaths",
  "inputClosure",
  "authorityDigests",
  "receiptDigest",
]);
const SHA1_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(String(left), "utf8"), Buffer.from(String(right), "utf8"));
}

function isObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort(compareUtf8).map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(",")}}`;
  }
  fail("p4-repository-analysis-receipt-json-invalid", "Receipt contains non-JSON data.");
}

function clone(value) {
  return JSON.parse(canonicalJson(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function exactFields(value, fields, label) {
  if (!isObject(value)) fail("p4-repository-analysis-receipt-shape-invalid", `${label} must be an object.`);
  const actual = Object.keys(value).sort(compareUtf8);
  const expected = [...fields].sort(compareUtf8);
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    fail("p4-repository-analysis-receipt-shape-invalid", `${label} has an invalid field closure.`);
  }
}

function requireDigest(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("p4-repository-analysis-receipt-identity-invalid", `${label} is invalid.`);
  }
}

function receiptPayload(receipt) {
  const { receiptDigest: _discarded, ...payload } = receipt;
  return payload;
}

export function createP4RepositoryAnalysisDigestReceipt(bundle) {
  const receipt = {
    schemaVersion: P4_REPOSITORY_ANALYSIS_RECEIPT_SCHEMA_VERSION,
    kind: P4_REPOSITORY_ANALYSIS_RECEIPT_KIND,
    bundleDigest: String(bundle?.bundleDigest || ""),
    factsDigest: String(bundle?.factsDigest || ""),
    source: clone(bundle?.source),
    inputPaths: (bundle?.inputs || []).map((input) => String(input.path || "")),
    inputClosure: clone(bundle?.inputClosure),
    authorityDigests: clone(bundle?.authorityDigests),
  };
  receipt.receiptDigest = digest(receipt);
  return deepFreeze(receipt);
}

export function validateP4RepositoryAnalysisDigestReceipt({
  receipt,
  expectedReceiptDigest,
} = {}) {
  exactFields(receipt, RECEIPT_FIELDS, "receipt");
  if (
    receipt.schemaVersion !== P4_REPOSITORY_ANALYSIS_RECEIPT_SCHEMA_VERSION
    || receipt.kind !== P4_REPOSITORY_ANALYSIS_RECEIPT_KIND
  ) {
    fail("p4-repository-analysis-receipt-version-invalid", "Receipt kind or version is invalid.");
  }
  requireDigest(receipt.bundleDigest, SHA256_PATTERN, "receipt.bundleDigest");
  requireDigest(receipt.factsDigest, SHA256_PATTERN, "receipt.factsDigest");
  requireDigest(receipt.receiptDigest, SHA256_PATTERN, "receipt.receiptDigest");
  requireDigest(expectedReceiptDigest, SHA256_PATTERN, "expectedReceiptDigest");
  exactFields(receipt.source, ["sha", "treeSha"], "receipt.source");
  requireDigest(receipt.source.sha, SHA1_PATTERN, "receipt.source.sha");
  requireDigest(receipt.source.treeSha, SHA1_PATTERN, "receipt.source.treeSha");
  if (!Array.isArray(receipt.inputPaths) || receipt.inputPaths.length === 0) {
    fail("p4-repository-analysis-receipt-closure-invalid", "receipt.inputPaths must be non-empty.");
  }
  const sortedPaths = [...receipt.inputPaths].sort(compareUtf8);
  if (
    new Set(receipt.inputPaths).size !== receipt.inputPaths.length
    || receipt.inputPaths.some((inputPath, index) => inputPath !== sortedPaths[index])
  ) {
    fail("p4-repository-analysis-receipt-closure-invalid", "receipt.inputPaths are outside canonical order.");
  }
  exactFields(receipt.authorityDigests, ["scanner", "policy", "config"], "receipt.authorityDigests");
  for (const name of ["scanner", "policy", "config"]) {
    requireDigest(receipt.authorityDigests[name]?.digest, SHA256_PATTERN, `receipt.${name}.digest`);
  }
  const computed = digest(receiptPayload(receipt));
  if (receipt.receiptDigest !== computed) {
    fail("p4-repository-analysis-receipt-digest-mismatch", "Receipt payload digest is invalid.");
  }
  if (receipt.receiptDigest !== expectedReceiptDigest) {
    fail("p4-repository-analysis-receipt-trust-mismatch", "Receipt differs from the trusted digest.");
  }
  return deepFreeze({
    bundleDigest: receipt.bundleDigest,
    source: clone(receipt.source),
    inputPaths: clone(receipt.inputPaths),
    authorityDigests: Object.fromEntries(["scanner", "policy", "config"].map((name) => [
      name,
      receipt.authorityDigests[name].digest,
    ])),
  });
}
