import crypto from "node:crypto";

export const P4_REPOSITORY_ANALYSIS_BUNDLE_SCHEMA_VERSION = 1;
export const P4_REPOSITORY_ANALYSIS_BUNDLE_KIND =
  "scenario-forge-p4-repository-analysis-bundle";
export const P4_REPOSITORY_ANALYSIS_PRODUCER = Object.freeze({
  id: "p4-repository-analysis-producer",
  version: 1,
});

const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion",
  "kind",
  "producer",
  "source",
  "inputs",
  "inputClosure",
  "authorityDigests",
  "facts",
  "factsDigest",
  "bundleDigest",
]);
const INPUT_FIELDS = Object.freeze([
  "path",
  "mode",
  "bytes",
  "gitBlobOid",
  "sha256",
]);
const SOURCE_FIELDS = Object.freeze(["sha", "treeSha"]);
const PRODUCER_FIELDS = Object.freeze(["id", "version"]);
const CLOSURE_FIELDS = Object.freeze([
  "algorithm",
  "pathOrder",
  "count",
  "totalBytes",
  "digest",
]);
const AUTHORITY_FIELDS = Object.freeze(["algorithm", "paths", "digest"]);
const AUTHORITY_NAMES = Object.freeze(["scanner", "policy", "config"]);
const EXPECTED_FIELDS = Object.freeze([
  "bundleDigest",
  "source",
  "inputPaths",
  "authorityDigests",
]);
const RESERVED_VERDICT_KEYS = new Set([
  "verdict",
  "finalVerdict",
  "checkerVerdict",
  "manifestVerdict",
]);
const SHA1_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MODE_PATTERN = /^(100644|100755)$/u;

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireObject(value, label) {
  if (!isPlainObject(value)) {
    fail("p4-repository-analysis-bundle-shape-invalid", `${label} must be a plain object.`);
  }
}

function requireExactFields(value, expected, label) {
  requireObject(value, label);
  const actual = Object.keys(value).sort(compareUtf8);
  const required = [...expected].sort(compareUtf8);
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    fail(
      "p4-repository-analysis-bundle-shape-invalid",
      `${label} fields must equal ${required.join(", ")}.`,
      { actualFields: actual, expectedFields: required },
    );
  }
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(String(left), "utf8"), Buffer.from(String(right), "utf8"));
}

function canonicalJson(value, pointer = "$") {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("p4-repository-analysis-bundle-json-invalid", `${pointer} contains a non-finite number.`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry, index) => canonicalJson(entry, `${pointer}/${index}`)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort(compareUtf8).map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key], `${pointer}/${key}`)}`
    )).join(",")}}`;
  }
  fail("p4-repository-analysis-bundle-json-invalid", `${pointer} is outside the JSON data model.`);
}

function cloneJson(value) {
  return JSON.parse(canonicalJson(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobOid(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function normalizePath(value, label) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0")) {
    fail("p4-repository-analysis-bundle-path-invalid", `${label} must be a canonical repository path.`);
  }
  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value)) {
    fail("p4-repository-analysis-bundle-path-invalid", `${label} must be repository-relative.`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    fail("p4-repository-analysis-bundle-path-invalid", `${label} contains a non-canonical segment.`);
  }
  return value;
}

function requireSha(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("p4-repository-analysis-bundle-identity-invalid", `${label} has an invalid digest.`);
  }
  return value;
}

function normalizeBytes(value, label) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  fail("p4-repository-analysis-bundle-blob-invalid", `${label} bytes are required.`);
}

function buildInput(input, index) {
  requireObject(input, `inputs[${index}]`);
  const inputPath = normalizePath(input.path, `inputs[${index}].path`);
  const mode = input.mode === undefined ? "100644" : String(input.mode);
  if (!MODE_PATTERN.test(mode)) {
    fail("p4-repository-analysis-bundle-blob-invalid", `inputs[${index}].mode is invalid.`);
  }
  const bytes = normalizeBytes(input.bytes, `inputs[${index}]`);
  return {
    path: inputPath,
    mode,
    bytes: bytes.length,
    gitBlobOid: gitBlobOid(bytes),
    sha256: sha256(bytes),
  };
}

function inputIdentity(input) {
  return {
    path: input.path,
    mode: input.mode,
    bytes: input.bytes,
    gitBlobOid: input.gitBlobOid,
    sha256: input.sha256,
  };
}

function digestInputs(inputs) {
  return sha256(canonicalJson(inputs.map(inputIdentity)));
}

function buildClosure(inputs) {
  return {
    algorithm: "sha256",
    pathOrder: "utf8-byte-lexicographic-v1",
    count: inputs.length,
    totalBytes: inputs.reduce((total, input) => total + input.bytes, 0),
    digest: digestInputs(inputs),
  };
}

function normalizeAuthorityPaths(authorityPaths, inputsByPath) {
  requireExactFields(authorityPaths, AUTHORITY_NAMES, "authorityPaths");
  return Object.fromEntries(AUTHORITY_NAMES.map((name) => {
    const paths = authorityPaths[name];
    if (!Array.isArray(paths) || paths.length === 0) {
      fail("p4-repository-analysis-bundle-authority-invalid", `authorityPaths.${name} must be non-empty.`);
    }
    const normalized = paths.map((entry, index) => normalizePath(
      entry,
      `authorityPaths.${name}[${index}]`,
    ));
    const sorted = [...normalized].sort(compareUtf8);
    if (new Set(normalized).size !== normalized.length) {
      fail("p4-repository-analysis-bundle-authority-invalid", `authorityPaths.${name} contains duplicates.`);
    }
    for (const inputPath of normalized) {
      if (!inputsByPath.has(inputPath)) {
        fail(
          "p4-repository-analysis-bundle-input-closure-invalid",
          `authorityPaths.${name} references an input outside the closure: ${inputPath}.`,
        );
      }
    }
    return [name, sorted];
  }));
}

function buildAuthorityDigest(paths, inputsByPath) {
  return {
    algorithm: "sha256",
    paths,
    digest: digestInputs(paths.map((inputPath) => inputsByPath.get(inputPath))),
  };
}

function assertFactsContainNoVerdict(value, pointer = "facts") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFactsContainNoVerdict(entry, `${pointer}/${index}`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (RESERVED_VERDICT_KEYS.has(key)) {
      fail(
        "p4-repository-analysis-bundle-verdict-forbidden",
        `${pointer}/${key} is a consumer-owned verdict surface.`,
      );
    }
    assertFactsContainNoVerdict(entry, `${pointer}/${key}`);
  }
}

function bundleWithoutDigest(bundle) {
  const { bundleDigest: _discarded, ...payload } = bundle;
  return payload;
}

export function produceP4RepositoryAnalysisBundle({
  source,
  inputs,
  authorityPaths,
  facts,
} = {}) {
  requireExactFields(source, SOURCE_FIELDS, "source");
  const normalizedSource = {
    sha: requireSha(source.sha, SHA1_PATTERN, "source.sha"),
    treeSha: requireSha(source.treeSha, SHA1_PATTERN, "source.treeSha"),
  };
  if (!Array.isArray(inputs) || inputs.length === 0) {
    fail("p4-repository-analysis-bundle-input-closure-invalid", "inputs must be non-empty.");
  }
  const normalizedInputs = inputs.map(buildInput).sort((left, right) => compareUtf8(left.path, right.path));
  const inputsByPath = new Map(normalizedInputs.map((input) => [input.path, input]));
  if (inputsByPath.size !== normalizedInputs.length) {
    fail("p4-repository-analysis-bundle-input-closure-invalid", "inputs contain duplicate paths.");
  }
  requireObject(facts, "facts");
  assertFactsContainNoVerdict(facts);
  const immutableFacts = cloneJson(facts);
  const normalizedAuthorityPaths = normalizeAuthorityPaths(authorityPaths, inputsByPath);
  const authorityDigests = Object.fromEntries(AUTHORITY_NAMES.map((name) => [
    name,
    buildAuthorityDigest(normalizedAuthorityPaths[name], inputsByPath),
  ]));
  const bundle = {
    schemaVersion: P4_REPOSITORY_ANALYSIS_BUNDLE_SCHEMA_VERSION,
    kind: P4_REPOSITORY_ANALYSIS_BUNDLE_KIND,
    producer: { ...P4_REPOSITORY_ANALYSIS_PRODUCER },
    source: normalizedSource,
    inputs: normalizedInputs,
    inputClosure: buildClosure(normalizedInputs),
    authorityDigests,
    facts: immutableFacts,
    factsDigest: sha256(canonicalJson(immutableFacts)),
  };
  bundle.bundleDigest = sha256(canonicalJson(bundle));
  return deepFreeze(bundle);
}

function validateInputEntry(input, index) {
  requireExactFields(input, INPUT_FIELDS, `bundle.inputs[${index}]`);
  normalizePath(input.path, `bundle.inputs[${index}].path`);
  if (!MODE_PATTERN.test(input.mode)) {
    fail("p4-repository-analysis-bundle-blob-invalid", `bundle.inputs[${index}].mode is invalid.`);
  }
  if (!Number.isSafeInteger(input.bytes) || input.bytes < 0) {
    fail("p4-repository-analysis-bundle-blob-invalid", `bundle.inputs[${index}].bytes is invalid.`);
  }
  requireSha(input.gitBlobOid, SHA1_PATTERN, `bundle.inputs[${index}].gitBlobOid`);
  requireSha(input.sha256, SHA256_PATTERN, `bundle.inputs[${index}].sha256`);
}

function validateExpectedContract(expected) {
  requireExactFields(expected, EXPECTED_FIELDS, "expected");
  requireSha(expected.bundleDigest, SHA256_PATTERN, "expected.bundleDigest");
  requireExactFields(expected.source, SOURCE_FIELDS, "expected.source");
  requireSha(expected.source.sha, SHA1_PATTERN, "expected.source.sha");
  requireSha(expected.source.treeSha, SHA1_PATTERN, "expected.source.treeSha");
  if (!Array.isArray(expected.inputPaths) || expected.inputPaths.length === 0) {
    fail("p4-repository-analysis-bundle-expected-invalid", "expected.inputPaths must be non-empty.");
  }
  expected.inputPaths.forEach((entry, index) => normalizePath(entry, `expected.inputPaths[${index}]`));
  requireExactFields(expected.authorityDigests, AUTHORITY_NAMES, "expected.authorityDigests");
  for (const name of AUTHORITY_NAMES) {
    requireSha(expected.authorityDigests[name], SHA256_PATTERN, `expected.authorityDigests.${name}`);
  }
}

async function validateBundleForConsumer({ bundle, expected, repository, consumer }) {
  requireExactFields(bundle, TOP_LEVEL_FIELDS, "bundle");
  if (bundle.schemaVersion !== P4_REPOSITORY_ANALYSIS_BUNDLE_SCHEMA_VERSION) {
    fail("p4-repository-analysis-bundle-version-invalid", "bundle.schemaVersion is unsupported.");
  }
  if (bundle.kind !== P4_REPOSITORY_ANALYSIS_BUNDLE_KIND) {
    fail("p4-repository-analysis-bundle-kind-invalid", "bundle.kind is invalid.");
  }
  requireExactFields(bundle.producer, PRODUCER_FIELDS, "bundle.producer");
  if (
    bundle.producer.id !== P4_REPOSITORY_ANALYSIS_PRODUCER.id
    || bundle.producer.version !== P4_REPOSITORY_ANALYSIS_PRODUCER.version
  ) {
    fail("p4-repository-analysis-bundle-producer-invalid", "bundle.producer is unsupported.");
  }
  requireExactFields(bundle.source, SOURCE_FIELDS, "bundle.source");
  requireSha(bundle.source.sha, SHA1_PATTERN, "bundle.source.sha");
  requireSha(bundle.source.treeSha, SHA1_PATTERN, "bundle.source.treeSha");
  requireSha(bundle.bundleDigest, SHA256_PATTERN, "bundle.bundleDigest");
  const computedBundleDigest = sha256(canonicalJson(bundleWithoutDigest(bundle)));
  if (bundle.bundleDigest !== computedBundleDigest) {
    fail("p4-repository-analysis-bundle-digest-mismatch", "bundle.bundleDigest does not match its payload.");
  }
  validateExpectedContract(expected);
  if (bundle.bundleDigest !== expected.bundleDigest) {
    fail(
      "p4-repository-analysis-bundle-trust-digest-mismatch",
      `${consumer} expected a different trusted bundle digest.`,
    );
  }
  if (
    bundle.source.sha !== expected.source.sha
    || bundle.source.treeSha !== expected.source.treeSha
  ) {
    fail(
      "p4-repository-analysis-bundle-source-identity-mismatch",
      `${consumer} expected a different source SHA/tree identity.`,
    );
  }
  if (!repository || typeof repository.resolveSourceIdentity !== "function" || typeof repository.readBlob !== "function") {
    fail("p4-repository-analysis-bundle-repository-invalid", `${consumer} requires an independent repository reader.`);
  }
  const observedSource = await repository.resolveSourceIdentity(bundle.source.sha);
  requireExactFields(observedSource, SOURCE_FIELDS, "observedSource");
  if (observedSource.sha !== bundle.source.sha || observedSource.treeSha !== bundle.source.treeSha) {
    fail(
      "p4-repository-analysis-bundle-source-identity-mismatch",
      `${consumer} repository source SHA/tree does not match the bundle.`,
    );
  }
  if (!Array.isArray(bundle.inputs) || bundle.inputs.length === 0) {
    fail("p4-repository-analysis-bundle-input-closure-invalid", "bundle.inputs must be non-empty.");
  }
  bundle.inputs.forEach(validateInputEntry);
  const actualPaths = bundle.inputs.map((input) => input.path);
  const sortedPaths = [...actualPaths].sort(compareUtf8);
  if (
    new Set(actualPaths).size !== actualPaths.length
    || actualPaths.some((inputPath, index) => inputPath !== sortedPaths[index])
  ) {
    fail("p4-repository-analysis-bundle-input-order-invalid", "bundle.inputs are outside canonical path order.");
  }
  const expectedPaths = [...expected.inputPaths];
  if (
    new Set(expectedPaths).size !== expectedPaths.length
    || expectedPaths.length !== actualPaths.length
    || expectedPaths.some((inputPath, index) => inputPath !== actualPaths[index])
  ) {
    fail("p4-repository-analysis-bundle-input-closure-mismatch", `${consumer} expected a different input closure.`);
  }
  requireExactFields(bundle.inputClosure, CLOSURE_FIELDS, "bundle.inputClosure");
  const computedClosure = buildClosure(bundle.inputs);
  if (canonicalJson(bundle.inputClosure) !== canonicalJson(computedClosure)) {
    fail("p4-repository-analysis-bundle-input-closure-invalid", "bundle.inputClosure does not match bundle.inputs.");
  }
  const inputsByPath = new Map(bundle.inputs.map((input) => [input.path, input]));
  requireExactFields(bundle.authorityDigests, AUTHORITY_NAMES, "bundle.authorityDigests");
  for (const name of AUTHORITY_NAMES) {
    const authority = bundle.authorityDigests[name];
    requireExactFields(authority, AUTHORITY_FIELDS, `bundle.authorityDigests.${name}`);
    if (authority.algorithm !== "sha256" || !Array.isArray(authority.paths) || authority.paths.length === 0) {
      fail("p4-repository-analysis-bundle-authority-invalid", `bundle.authorityDigests.${name} is invalid.`);
    }
    const sortedAuthorityPaths = [...authority.paths].sort(compareUtf8);
    if (
      new Set(authority.paths).size !== authority.paths.length
      || authority.paths.some((inputPath, index) => inputPath !== sortedAuthorityPaths[index])
    ) {
      fail("p4-repository-analysis-bundle-authority-invalid", `bundle.authorityDigests.${name}.paths are invalid.`);
    }
    const selectedInputs = authority.paths.map((inputPath) => {
      normalizePath(inputPath, `bundle.authorityDigests.${name}.paths`);
      const input = inputsByPath.get(inputPath);
      if (!input) {
        fail(
          "p4-repository-analysis-bundle-input-closure-invalid",
          `bundle.authorityDigests.${name} references ${inputPath} outside the input closure.`,
        );
      }
      return input;
    });
    const computedAuthorityDigest = digestInputs(selectedInputs);
    if (
      authority.digest !== computedAuthorityDigest
      || authority.digest !== expected.authorityDigests[name]
    ) {
      fail(
        "p4-repository-analysis-bundle-authority-digest-mismatch",
        `${consumer} rejected the ${name} authority digest.`,
        { authority: name },
      );
    }
  }
  const observedBlobs = typeof repository.readBlobs === "function"
    ? await repository.readBlobs({
      sourceSha: bundle.source.sha,
      paths: bundle.inputs.map((input) => input.path),
    })
    : null;
  for (const [index, input] of bundle.inputs.entries()) {
    const observed = observedBlobs
      ? observedBlobs[index]
      : await repository.readBlob({ sourceSha: bundle.source.sha, path: input.path });
    requireObject(observed, `observed blob ${input.path}`);
    const observedBytes = normalizeBytes(observed.bytes, `observed blob ${input.path}`);
    const observedMode = String(observed.mode || "");
    if (
      observedMode !== input.mode
      || observedBytes.length !== input.bytes
      || gitBlobOid(observedBytes) !== input.gitBlobOid
      || sha256(observedBytes) !== input.sha256
    ) {
      fail(
        "p4-repository-analysis-bundle-blob-mismatch",
        `${consumer} rejected blob identity for ${input.path}.`,
        { path: input.path },
      );
    }
  }
  requireObject(bundle.facts, "bundle.facts");
  assertFactsContainNoVerdict(bundle.facts);
  requireSha(bundle.factsDigest, SHA256_PATTERN, "bundle.factsDigest");
  if (bundle.factsDigest !== sha256(canonicalJson(bundle.facts))) {
    fail("p4-repository-analysis-bundle-facts-digest-mismatch", "bundle.factsDigest is invalid.");
  }
  return deepFreeze({
    source: cloneJson(bundle.source),
    inputClosure: cloneJson(bundle.inputClosure),
    authorityDigests: cloneJson(bundle.authorityDigests),
    facts: cloneJson(bundle.facts),
    factsDigest: bundle.factsDigest,
    bundleDigest: bundle.bundleDigest,
  });
}

export function validateP4RepositoryAnalysisBundleForChecker(options) {
  return validateBundleForConsumer({ ...options, consumer: "checker-validator" });
}

export function validateP4RepositoryAnalysisBundleForManifest(options) {
  return validateBundleForConsumer({ ...options, consumer: "manifest-validator" });
}

async function consumeBundle(validate, options, evaluator, label) {
  if (typeof evaluator !== "function") {
    fail("p4-repository-analysis-bundle-evaluator-invalid", `${label} evaluator must be a function.`);
  }
  const accepted = await validate(options);
  return evaluator(accepted.facts);
}

export function consumeP4RepositoryAnalysisBundleForChecker(options, checkerEvaluator) {
  return consumeBundle(
    validateP4RepositoryAnalysisBundleForChecker,
    options,
    checkerEvaluator,
    "checker",
  );
}

export function consumeP4RepositoryAnalysisBundleForManifest(options, manifestEvaluator) {
  return consumeBundle(
    validateP4RepositoryAnalysisBundleForManifest,
    options,
    manifestEvaluator,
    "manifest",
  );
}
