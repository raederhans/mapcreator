import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  consumeP4RepositoryAnalysisBundleForChecker,
  consumeP4RepositoryAnalysisBundleForManifest,
  produceP4RepositoryAnalysisBundle,
  validateP4RepositoryAnalysisBundleForChecker,
  validateP4RepositoryAnalysisBundleForManifest,
} from "../tools/verification/p4_repository_analysis_bundle.mjs";
import {
  createP4RepositoryAnalysisDigestReceipt,
  validateP4RepositoryAnalysisDigestReceipt,
} from "../tools/verification/p4_repository_analysis_bundle_receipt.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");
const fixture = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, "fixtures", "p4_repository_analysis_bundle_source.json"),
  "utf8",
));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort((left, right) => Buffer.compare(
      Buffer.from(left, "utf8"),
      Buffer.from(right, "utf8"),
    )).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function resignBundle(bundle) {
  const payload = clone(bundle);
  delete payload.bundleDigest;
  bundle.bundleDigest = sha256(canonicalJson(payload));
  return bundle;
}

function buildFixture() {
  const files = new Map(fixture.files.map((entry) => [entry.path, {
    mode: entry.mode,
    bytes: Buffer.from(entry.text, "utf8"),
  }]));
  const bundle = produceP4RepositoryAnalysisBundle({
    source: fixture.source,
    inputs: [...fixture.files].reverse().map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      bytes: Buffer.from(entry.text, "utf8"),
    })),
    authorityPaths: fixture.authorityPaths,
    facts: fixture.facts,
  });
  const expected = {
    bundleDigest: bundle.bundleDigest,
    source: clone(fixture.source),
    inputPaths: bundle.inputs.map((input) => input.path),
    authorityDigests: Object.fromEntries(Object.entries(bundle.authorityDigests).map(
      ([name, authority]) => [name, authority.digest],
    )),
  };
  const repository = {
    async resolveSourceIdentity() {
      return clone(fixture.source);
    },
    async readBlob({ path: inputPath }) {
      const entry = files.get(inputPath);
      return entry && { mode: entry.mode, bytes: Buffer.from(entry.bytes) };
    },
  };
  return { bundle, expected, repository, files };
}

function referenceChecker(facts) {
  const violations = facts.findings.filter((finding) => finding.line < 1);
  return {
    verdict: violations.length ? "fail" : "pass",
    violations,
    metrics: clone(facts.metrics),
  };
}

function referenceManifest(facts) {
  return {
    schemaVersion: 1,
    candidates: facts.candidatePaths.map((candidatePath) => ({
      path: candidatePath,
      findingCount: facts.findings.filter((finding) => finding.path === candidatePath).length,
    })),
  };
}

test("producer emits a deeply immutable fact bundle in canonical input order", () => {
  const { bundle } = buildFixture();
  assert.equal(Object.isFrozen(bundle), true);
  assert.equal(Object.isFrozen(bundle.inputs), true);
  assert.equal(Object.isFrozen(bundle.facts.findings[0]), true);
  assert.deepEqual(bundle.inputs.map((input) => input.path), [
    "config/p4.json",
    "js/core/state.js",
    "tools/policy.json",
    "tools/scanner.mjs",
  ]);
  assert.equal("verdict" in bundle, false);
  assert.equal("checkerVerdict" in bundle, false);
  assert.equal("manifestVerdict" in bundle, false);
});

test("checker and manifest validators independently accept every bound identity", async () => {
  const { bundle, expected, repository } = buildFixture();
  const checkerAccepted = await validateP4RepositoryAnalysisBundleForChecker({
    bundle,
    expected,
    repository,
  });
  const manifestAccepted = await validateP4RepositoryAnalysisBundleForManifest({
    bundle,
    expected: clone(expected),
    repository,
  });
  assert.deepEqual(checkerAccepted, manifestAccepted);
  assert.equal(Object.isFrozen(checkerAccepted.facts), true);
});

test("bundle checker stays deep-equal to the reference checker on the shadow fixture", async () => {
  const { bundle, expected, repository } = buildFixture();
  const live = referenceChecker(clone(fixture.facts));
  const shadow = await consumeP4RepositoryAnalysisBundleForChecker(
    { bundle, expected, repository },
    referenceChecker,
  );
  assert.deepEqual(shadow, live);
});

test("bundle manifest stays semantic-equal to the reference manifest on the shadow fixture", async () => {
  const { bundle, expected, repository } = buildFixture();
  const live = referenceManifest(clone(fixture.facts));
  const shadow = await consumeP4RepositoryAnalysisBundleForManifest(
    { bundle, expected, repository },
    referenceManifest,
  );
  assert.deepEqual(shadow, live);
});

test("bundle digest corruption fails closed for each consumer", async () => {
  const { bundle, expected, repository } = buildFixture();
  const corrupted = clone(bundle);
  corrupted.facts.metrics.findingCount = 9;
  for (const validate of [
    validateP4RepositoryAnalysisBundleForChecker,
    validateP4RepositoryAnalysisBundleForManifest,
  ]) {
    await assert.rejects(
      validate({ bundle: corrupted, expected, repository }),
      { code: "p4-repository-analysis-bundle-digest-mismatch" },
    );
  }
});

test("self-consistently resigned fact forgery fails the external bundle trust digest", async () => {
  const { bundle, expected, repository } = buildFixture();
  const forged = clone(bundle);
  forged.facts.metrics.findingCount = 9;
  forged.factsDigest = sha256(canonicalJson(forged.facts));
  resignBundle(forged);
  await assert.rejects(
    validateP4RepositoryAnalysisBundleForChecker({ bundle: forged, expected, repository }),
    { code: "p4-repository-analysis-bundle-trust-digest-mismatch" },
  );
});

test("field deletion fails closed even when the outer digest is recomputed", async () => {
  const { bundle, expected, repository } = buildFixture();
  const missing = clone(bundle);
  delete missing.factsDigest;
  resignBundle(missing);
  await assert.rejects(
    validateP4RepositoryAnalysisBundleForChecker({ bundle: missing, expected, repository }),
    { code: "p4-repository-analysis-bundle-shape-invalid" },
  );
});

test("input reordering fails closed even when all attacker-controlled digests are recomputed", async () => {
  const { bundle, expected, repository } = buildFixture();
  const reordered = clone(bundle);
  reordered.inputs.reverse();
  reordered.inputClosure.digest = sha256(canonicalJson(reordered.inputs));
  resignBundle(reordered);
  expected.bundleDigest = reordered.bundleDigest;
  await assert.rejects(
    validateP4RepositoryAnalysisBundleForManifest({ bundle: reordered, expected, repository }),
    { code: "p4-repository-analysis-bundle-input-order-invalid" },
  );
});

test("forged source SHA/tree fails closed after the bundle is self-consistently resigned", async () => {
  const { bundle, expected, repository } = buildFixture();
  const forged = clone(bundle);
  forged.source.sha = "3333333333333333333333333333333333333333";
  forged.source.treeSha = "4444444444444444444444444444444444444444";
  resignBundle(forged);
  expected.bundleDigest = forged.bundleDigest;
  await assert.rejects(
    validateP4RepositoryAnalysisBundleForChecker({ bundle: forged, expected, repository }),
    { code: "p4-repository-analysis-bundle-source-identity-mismatch" },
  );
});

test("input closure deletion fails closed after the remaining bundle is resigned", async () => {
  const { bundle, expected, repository } = buildFixture();
  const truncated = clone(bundle);
  truncated.inputs.splice(1, 1);
  truncated.inputClosure.count = truncated.inputs.length;
  truncated.inputClosure.totalBytes = truncated.inputs.reduce((total, input) => total + input.bytes, 0);
  truncated.inputClosure.digest = sha256(canonicalJson(truncated.inputs));
  resignBundle(truncated);
  expected.bundleDigest = truncated.bundleDigest;
  await assert.rejects(
    validateP4RepositoryAnalysisBundleForManifest({ bundle: truncated, expected, repository }),
    { code: "p4-repository-analysis-bundle-input-closure-mismatch" },
  );
});

test("every input blob is independently re-read and byte-verified", async () => {
  const { bundle, expected, repository, files } = buildFixture();
  for (const input of bundle.inputs) {
    const original = files.get(input.path);
    files.set(input.path, { ...original, bytes: Buffer.concat([original.bytes, Buffer.from("tamper")]) });
    await assert.rejects(
      validateP4RepositoryAnalysisBundleForChecker({ bundle, expected, repository }),
      { code: "p4-repository-analysis-bundle-blob-mismatch", path: input.path },
    );
    files.set(input.path, original);
  }
});

test("scanner, policy, and config digest forgery each fail closed", async () => {
  const { bundle, expected, repository } = buildFixture();
  for (const authority of ["scanner", "policy", "config"]) {
    const forged = clone(bundle);
    forged.authorityDigests[authority].digest = "f".repeat(64);
    resignBundle(forged);
    expected.bundleDigest = forged.bundleDigest;
    await assert.rejects(
      validateP4RepositoryAnalysisBundleForManifest({ bundle: forged, expected, repository }),
      { code: "p4-repository-analysis-bundle-authority-digest-mismatch", authority },
    );
  }
});

test("producer rejects consumer verdicts embedded in extracted facts", () => {
  assert.throws(
    () => produceP4RepositoryAnalysisBundle({
      source: fixture.source,
      inputs: fixture.files.map((entry) => ({
        path: entry.path,
        mode: entry.mode,
        bytes: entry.text,
      })),
      authorityPaths: fixture.authorityPaths,
      facts: { nested: { manifestVerdict: "pass" } },
    }),
    { code: "p4-repository-analysis-bundle-verdict-forbidden" },
  );
});

test("trusted digest receipt immutably binds bundle, facts, closure, and authorities", () => {
  const { bundle } = buildFixture();
  const receipt = createP4RepositoryAnalysisDigestReceipt(bundle);
  const expected = validateP4RepositoryAnalysisDigestReceipt({
    receipt,
    expectedReceiptDigest: receipt.receiptDigest,
  });
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(receipt.bundleDigest, bundle.bundleDigest);
  assert.equal(receipt.factsDigest, bundle.factsDigest);
  assert.deepEqual(receipt.inputClosure, bundle.inputClosure);
  assert.equal(expected.bundleDigest, bundle.bundleDigest);
});

test("self-consistently resigned receipt forgery fails the external trust digest", () => {
  const { bundle } = buildFixture();
  const receipt = clone(createP4RepositoryAnalysisDigestReceipt(bundle));
  const trustedDigest = receipt.receiptDigest;
  receipt.bundleDigest = "e".repeat(64);
  const payload = clone(receipt);
  delete payload.receiptDigest;
  receipt.receiptDigest = sha256(canonicalJson(payload));
  assert.throws(
    () => validateP4RepositoryAnalysisDigestReceipt({
      receipt,
      expectedReceiptDigest: trustedDigest,
    }),
    { code: "p4-repository-analysis-receipt-trust-mismatch" },
  );
});

test("checked-in schema freezes the bundle surface and forbids extra fields", () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, "tools", "verification", "p4_repository_analysis_bundle.schema.json"),
    "utf8",
  ));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(new Set(schema.required), new Set([
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
  ]));
  assert.equal(schema.properties.authorityDigests.additionalProperties, false);
  assert.deepEqual(schema.properties.authorityDigests.required, ["scanner", "policy", "config"]);
  const receiptSchema = JSON.parse(fs.readFileSync(
    path.join(
      REPO_ROOT,
      "tools",
      "verification",
      "p4_repository_analysis_bundle_receipt.schema.json",
    ),
    "utf8",
  ));
  assert.equal(receiptSchema.additionalProperties, false);
  assert.equal(receiptSchema.properties.kind.const,
    "scenario-forge-p4-repository-analysis-digest-receipt");
});
