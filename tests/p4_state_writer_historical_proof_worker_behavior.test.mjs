import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import test from "node:test";

import {
  buildHistoricalDerivedAliasProofIdentity,
} from "../tools/build_state_writer_policy.mjs";
import {
  joinP4StateWriterHistoricalProofWork,
  validateP4StateWriterHistoricalProofResult,
} from "../tools/check_state_writer_policy.mjs";
import {
  hashP4StateWriterHistoricalProofJson,
  startP4StateWriterHistoricalProofWorker,
} from "../tools/verification/p4_state_writer_historical_proof_worker.mjs";

const SOURCE_SHA = "1234567890abcdef1234567890abcdef12345678";

function buildFixture() {
  const previousPolicy = {
    schemaVersion: 2,
    baseline: { sourceBaseSha: SOURCE_SHA },
    progress: { latestPhase: "P4.2c", checkpoints: [] },
    baselines: { derivedAliasTaint: { paths: ["js/previous.js"] } },
  };
  const policy = {
    schemaVersion: 2,
    baseline: { sourceBaseSha: SOURCE_SHA },
    progress: {
      latestPhase: "P4.3",
      checkpoints: [{ phase: "P4.3", marker: "current" }],
    },
    baselines: {
      derivedAliasTaint: {
        paths: ["js/a.js", "js/b.js"],
        transitionCheckpoints: [{ phase: "P4.3", marker: "proof" }],
      },
    },
  };
  const identity = buildHistoricalDerivedAliasProofIdentity({
    sourceSha: SOURCE_SHA,
    candidatePaths: policy.baselines.derivedAliasTaint.paths,
    phase: "P4.3",
    taintMode: "strict",
    checkpoint: {
      acceptedPolicyCheckpoint: null,
      progressCheckpoint: policy.progress.checkpoints[0],
      transitionCheckpoints:
        policy.baselines.derivedAliasTaint.transitionCheckpoints,
    },
    previousPolicy,
    policy,
  });
  const proof = { paths: ["js/a.js", "js/b.js"], matches: true };
  const summary = {
    kind: "p4-state-writer-historical-proof",
    schemaVersion: 1,
    status: "passed",
    identity,
    identitySha256: hashP4StateWriterHistoricalProofJson(identity),
    policySha256: identity.policySha256,
    proofSha256: hashP4StateWriterHistoricalProofJson(proof),
    sourceSha: identity.sourceSha,
    phase: identity.phase,
    candidatePaths: [...identity.candidatePaths],
    matches: true,
  };
  return { previousPolicy, policy, identity, proof, summary };
}

class CapturingWorker extends EventEmitter {
  static options = null;

  constructor(_url, options) {
    super();
    CapturingWorker.options = options;
  }

  terminate() {
    queueMicrotask(() => this.emit("exit", 1));
    return Promise.resolve(1);
  }
}

test("worker request carries an isolated complete proof identity", async () => {
  const fixture = buildFixture();
  const request = {
    identity: fixture.identity,
    previousPolicy: fixture.previousPolicy,
    policy: fixture.policy,
  };
  const session = startP4StateWriterHistoricalProofWorker(
    { request },
    {
      WorkerCtor: CapturingWorker,
      workerUrl: new URL("file:///fixture-worker.mjs"),
    },
  );
  const captured = CapturingWorker.options.workerData.request;

  assert.deepEqual(captured, request);
  assert.notEqual(captured, request);
  assert.notEqual(captured.identity, request.identity);
  assert.equal(captured.identity.sourceSha, SOURCE_SHA);
  assert.deepEqual(captured.identity.candidatePaths, ["js/a.js", "js/b.js"]);
  assert.equal(captured.identity.phase, "P4.3");
  assert.equal(
    captured.identity.previousPolicySha256,
    fixture.identity.previousPolicySha256,
  );
  assert.equal(captured.identity.policySha256, fixture.identity.policySha256);
  assert.deepEqual(captured.identity.checkpoint, fixture.identity.checkpoint);
  await session.terminate();
  await assert.rejects(
    session.result,
    (error) => error?.code === "p4-historical-proof-worker-exit-nonzero",
  );
});

test("checker accepts only the exact worker proof identity and proof", () => {
  const fixture = buildFixture();
  assert.deepEqual(
    validateP4StateWriterHistoricalProofResult({
      workerSummary: fixture.summary,
      expectedIdentity: fixture.identity,
      expectedProof: fixture.proof,
    }),
    fixture.proof,
  );

  const drifts = [
    ["source SHA", { sourceSha: "abcdef1234567890abcdef1234567890abcdef12" }],
    ["candidate paths", { candidatePaths: ["js/a.js"] }],
    ["phase", { phase: "P4.2c" }],
    ["previous policy", { previousPolicySha256: "a".repeat(64) }],
    ["policy", { policySha256: "b".repeat(64) }],
    ["checkpoint", { checkpoint: { drifted: true } }],
  ];
  for (const [label, identityPatch] of drifts) {
    const driftedIdentity = { ...fixture.identity, ...identityPatch };
    const driftedSummary = {
      ...fixture.summary,
      identity: driftedIdentity,
      identitySha256:
        hashP4StateWriterHistoricalProofJson(driftedIdentity),
      policySha256: driftedIdentity.policySha256,
    };
    assert.throws(
      () => validateP4StateWriterHistoricalProofResult({
        workerSummary: driftedSummary,
        expectedIdentity: fixture.identity,
        expectedProof: fixture.proof,
      }),
      (error) => (
        error?.code
          === "p4-historical-proof-worker-result-identity-mismatch"
      ),
      label,
    );
  }

  assert.throws(
    () => validateP4StateWriterHistoricalProofResult({
      workerSummary: {
        ...fixture.summary,
        proofSha256: hashP4StateWriterHistoricalProofJson({ drifted: true }),
      },
      expectedIdentity: fixture.identity,
      expectedProof: fixture.proof,
    }),
    (error) => (
      error?.code === "p4-historical-proof-worker-result-identity-mismatch"
    ),
  );
});

test("parallel join terminates and drains the worker when inventory fails", async () => {
  const inventoryError = new Error("inventory failed");
  const workerError = new Error("worker terminated");
  let rejectWorker;
  let terminateCalls = 0;
  const workerSession = {
    result: new Promise((_resolve, reject) => {
      rejectWorker = reject;
    }),
    async terminate() {
      terminateCalls += 1;
      rejectWorker(workerError);
      return 1;
    },
  };

  await assert.rejects(
    joinP4StateWriterHistoricalProofWork({
      inventoryPromise: Promise.reject(inventoryError),
      workerSession,
    }),
    (error) => error === inventoryError,
  );
  assert.equal(terminateCalls, 1);
});

test("parallel join fails closed when the worker rejects", async () => {
  const workerError = new Error("worker failed");
  let terminateCalls = 0;
  await assert.rejects(
    joinP4StateWriterHistoricalProofWork({
      inventoryPromise: Promise.resolve({ scans: [] }),
      workerSession: {
        result: Promise.reject(workerError),
        async terminate() {
          terminateCalls += 1;
          return 1;
        },
      },
    }),
    (error) => error === workerError,
  );
  assert.equal(terminateCalls, 0);
});

test("canonical checker starts historical proof before awaiting repository scan", () => {
  const source = fs.readFileSync(
    new URL("../tools/check_state_writer_policy.mjs", import.meta.url),
    "utf8",
  );
  const workerStart = source.indexOf(
    "startP4StateWriterHistoricalProofWorker({",
  );
  const scanStart = source.indexOf(
    "const inventoryPromise = scanStateWriterPolicySnapshot(",
  );
  const parallelAwait = source.indexOf(
    "} = await joinP4StateWriterHistoricalProofWork({",
  );
  const workerConsume = source.indexOf(
    "const workerSummary = historicalProofWorkerSummary;",
  );

  assert.match(
    source,
    /buildHistoricalDerivedAliasProofCheckpoint,\s+buildHistoricalDerivedAliasProofIdentity,\s+buildIncrementalDerivedAliasTaintBaseline,/,
  );
  assert.ok(workerStart >= 0);
  assert.ok(workerStart < scanStart);
  assert.ok(scanStart < parallelAwait);
  assert.ok(parallelAwait < workerConsume);
});
