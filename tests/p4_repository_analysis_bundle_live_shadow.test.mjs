import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStateWriterPolicySnapshot,
  readStateWriterPolicy,
  resolveAcceptedStateWriterPolicyCheckpoint,
} from "../tools/build_state_writer_policy.mjs";
import { buildStateWriterPolicyReport } from "../tools/check_state_writer_policy.mjs";
import {
  buildStateWriterPolicyReportFromRepositoryAnalysisBundle,
  buildStateWriterPolicySnapshotFromRepositoryAnalysisBundle,
  produceStateWriterRepositoryAnalysisBundle,
} from "../tools/verification/p4_repository_analysis_bundle_adapters.mjs";
import { createGitP4RepositoryAnalysisReader } from "../tools/verification/p4_repository_analysis_bundle_git.mjs";
import {
  createP4RepositoryAnalysisDigestReceipt,
  validateP4RepositoryAnalysisDigestReceipt,
} from "../tools/verification/p4_repository_analysis_bundle_receipt.mjs";

const liveTest = process.env.M9_LIVE_REPOSITORY_SHADOW === "1" ? test : test.skip;
let shadow;

async function buildShadow() {
  if (shadow) return shadow;
  const policy = await readStateWriterPolicy();
  const phase = policy.progress.latestPhase;
  const sourceRef = String(process.env.M9_REPOSITORY_ANALYSIS_SOURCE_REF || "HEAD");
  const bundle = await produceStateWriterRepositoryAnalysisBundle({
    sourceRef,
    previousPolicy: policy,
    baseSha: policy.baseline.sourceBaseSha,
  });
  const receipt = createP4RepositoryAnalysisDigestReceipt(bundle);
  shadow = {
    policy,
    phase,
    bundle,
    receipt,
    repository: createGitP4RepositoryAnalysisReader(),
  };
  return shadow;
}

liveTest("Git-backed producer freezes the current commit and every tracked scan input", async () => {
  const { bundle, receipt, repository } = await buildShadow();
  const observed = await repository.resolveSourceIdentity(bundle.source.sha);
  assert.deepEqual(bundle.source, observed);
  assert.equal(bundle.inputClosure.count, bundle.inputs.length);
  assert.equal(bundle.inputs.length > 100, true);
  assert.equal(Object.isFrozen(bundle), true);
  const expected = validateP4RepositoryAnalysisDigestReceipt({
    receipt,
    expectedReceiptDigest: receipt.receiptDigest,
  });
  assert.equal(expected.bundleDigest, bundle.bundleDigest);
});

liveTest("bundle checker is deep-equal to the existing live checker on one SHA/tree", async () => {
  const { policy, phase, bundle, receipt, repository } = await buildShadow();
  const options = { phase, policy, previousPolicy: null };
  const live = await buildStateWriterPolicyReport(options);
  const bundled = await buildStateWriterPolicyReportFromRepositoryAnalysisBundle({
    bundle,
    receipt,
    expectedReceiptDigest: receipt.receiptDigest,
    repository,
    reportOptions: options,
  });
  assert.deepEqual(bundled, live);
  assert.equal(bundled.verificationSha, live.verificationSha);
});

liveTest("bundle manifest is semantic-equal to the existing live manifest on one SHA/tree", async () => {
  const { policy, phase, bundle, receipt, repository } = await buildShadow();
  const options = {
    baseSha: bundle.source.sha,
    generatedAt: "2026-08-29T00:00:00.000Z",
    phase,
    previousPolicy: policy,
    acceptedPolicyCheckpoint: resolveAcceptedStateWriterPolicyCheckpoint({ policy }),
  };
  const live = await buildStateWriterPolicySnapshot(options);
  const bundled = await buildStateWriterPolicySnapshotFromRepositoryAnalysisBundle({
    bundle,
    receipt,
    expectedReceiptDigest: receipt.receiptDigest,
    repository,
    manifestOptions: options,
  });
  assert.deepEqual(bundled, live);
});

liveTest("trusted receipt and same-SHA blob tampering fail closed before either consumer", async () => {
  const { policy, phase, bundle, receipt, repository } = await buildShadow();
  const forgedReceipt = JSON.parse(JSON.stringify(receipt));
  forgedReceipt.bundleDigest = "f".repeat(64);
  await assert.rejects(
    buildStateWriterPolicyReportFromRepositoryAnalysisBundle({
      bundle,
      receipt: forgedReceipt,
      expectedReceiptDigest: receipt.receiptDigest,
      repository,
      reportOptions: { phase, policy, previousPolicy: null },
    }),
    { code: "p4-repository-analysis-receipt-digest-mismatch" },
  );

  const tamperedRepository = {
    resolveSourceIdentity: (...args) => repository.resolveSourceIdentity(...args),
    async readBlob(options) {
      const observed = await repository.readBlob(options);
      if (options.path === bundle.inputs[0].path) {
        return { ...observed, bytes: Buffer.concat([observed.bytes, Buffer.from("tamper")]) };
      }
      return observed;
    },
  };
  await assert.rejects(
    buildStateWriterPolicySnapshotFromRepositoryAnalysisBundle({
      bundle,
      receipt,
      expectedReceiptDigest: receipt.receiptDigest,
      repository: tamperedRepository,
      manifestOptions: {
        baseSha: bundle.source.sha,
        generatedAt: "2026-08-29T00:00:00.000Z",
        phase,
        previousPolicy: policy,
        acceptedPolicyCheckpoint: resolveAcceptedStateWriterPolicyCheckpoint({ policy }),
      },
    }),
    { code: "p4-repository-analysis-bundle-blob-mismatch", path: bundle.inputs[0].path },
  );
});
