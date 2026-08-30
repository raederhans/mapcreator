import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE,
  STATE_WRITER_POLICY_EVIDENCE_KIND,
  STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION,
  STATE_WRITER_POLICY_LIVE_FALLBACK_FORBID,
  buildStateWriterCheckerPlan,
  createStateWriterPolicyEvidence,
  createStateWriterPolicyEvidenceSession,
  ensureStateWriterPolicyEvidence,
  produceStateWriterPolicyEvidence,
  validateStateWriterPolicyEvidence,
} from "../tools/verification/state_writer_policy_evidence.mjs";

const PHASE = "P4.3";
const VERIFICATION_SHA = "a".repeat(40);
const VERIFICATION_TREE_SHA = "b".repeat(40);
const POLICY_BLOB_SHA = "c".repeat(40);
const CONFIG_BLOB_SHA = "d".repeat(40);
const CONFIG_TREE_IDENTITY = createHash("sha256")
  .update(`tools/build_state_writer_policy.mjs\0${CONFIG_BLOB_SHA}`)
  .digest("hex");

function cleanIdentity(overrides = {}) {
  return {
    verificationSha: VERIFICATION_SHA,
    verificationTreeSha: VERIFICATION_TREE_SHA,
    workspaceClean: true,
    trackedClean: true,
    includesUntracked: true,
    workspaceStatus: "",
    ...overrides,
  };
}

function sequenceReader(identities) {
  let index = 0;
  return () => identities[Math.min(index++, identities.length - 1)];
}

function policyFixture(overrides = {}) {
  return {
    schemaVersion: 2,
    baseline: {
      phase: "P4.0",
      sourceBaseSha: "e".repeat(40),
    },
    baselines: {
      derivedAliasTaint: {
        algorithmVersion: 1,
        sourceBaseSha: "e".repeat(40),
        transitionCheckpoints: [{ sourceSha: "f".repeat(40) }],
      },
    },
    progress: {
      latestPhase: PHASE,
      checkpoints: [{
        phase: PHASE,
        productionLegacyDirectFiles: 75,
        previousAcceptedSourceSha: "f".repeat(40),
      }],
    },
    writers: [],
    ...overrides,
  };
}

function reportFixture(identity = cleanIdentity()) {
  return {
    schemaVersion: 1,
    phase: PHASE,
    sourceBaseSha: "e".repeat(40),
    verificationSha: identity.verificationSha,
    verificationIdentity: {
      sourceBaseSha: "e".repeat(40),
      verificationSha: identity.verificationSha,
      verificationTreeSha: identity.verificationTreeSha,
      workspaceClean: true,
      trackedClean: true,
      includesUntracked: true,
      workspaceStatus: "",
      trackedStatus: "",
      policyPath: "tools/state_writer_policy.json",
      policyBlobSha: POLICY_BLOB_SHA,
      configBlobShas: [{
        path: "tools/build_state_writer_policy.mjs",
        blobSha: CONFIG_BLOB_SHA,
      }],
      configTreeIdentity: CONFIG_TREE_IDENTITY,
      violations: [],
    },
    policyPath: "tools/state_writer_policy.json",
    verdict: "pass",
    violations: [],
    metrics: { legacyDirectFiles: { production: 75, test: 43 } },
  };
}

function createFixture() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "state-writer-evidence-"));
  const reportPath = path.join(
    ".runtime",
    "reports",
    "generated",
    "p4-state-actions",
    PHASE,
    "policy-report.json",
  );
  const evidencePath = path.join(
    ".runtime",
    "reports",
    "generated",
    "p4-state-actions",
    PHASE,
    "state-writer-policy-evidence.json",
  );
  const policy = policyFixture();
  const identity = cleanIdentity();
  const report = reportFixture(identity);
  fs.mkdirSync(path.dirname(path.join(cwd, reportPath)), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, reportPath),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  const checkerPlan = buildStateWriterCheckerPlan({
    phase: PHASE,
    reportPath,
    nodeExecutable: "node-fixture",
  });
  const dependencies = {
    verificationIdentityReader: () => identity,
    policyReader: () => structuredClone(policy),
    blobShaReader: (relativePath) => (
      relativePath === "tools/state_writer_policy.json"
        ? POLICY_BLOB_SHA
        : CONFIG_BLOB_SHA
    ),
  };
  return {
    cwd,
    reportPath,
    evidencePath,
    policy,
    identity,
    report,
    checkerPlan,
    dependencies,
  };
}

function writeEvidence(fixture, overrides = {}) {
  return createStateWriterPolicyEvidence({
    cwd: fixture.cwd,
    phase: PHASE,
    reportPath: fixture.reportPath,
    evidencePath: fixture.evidencePath,
    checkerPlan: fixture.checkerPlan,
    producer: {
      entrypoint: "tests/state_writer_policy_evidence_behavior.test.mjs",
      commandRef: "fixture-live-checker",
    },
    ...fixture.dependencies,
    ...overrides,
  });
}

function validateEvidence(fixture, overrides = {}) {
  return validateStateWriterPolicyEvidence({
    cwd: fixture.cwd,
    phase: PHASE,
    evidencePath: fixture.evidencePath,
    checkerPlan: fixture.checkerPlan,
    routeApplicability: { unmatchedChangedFiles: [] },
    ...fixture.dependencies,
    ...overrides,
  });
}

test("default checker plan has a cross-platform Node command identity", () => {
  const plan = buildStateWriterCheckerPlan({ phase: PHASE });

  assert.equal(plan.resolvedCommand.executable, "node");
  assert.equal(
    plan.commandRef,
    `node ${plan.resolvedCommand.args.join(" ")}`,
  );
});

test("exact clean-tree checker evidence binds plan, policy, checkpoint, and report artifact", () => {
  const fixture = createFixture();
  const created = writeEvidence(fixture);
  const validated = validateEvidence(fixture);

  assert.equal(created.kind, STATE_WRITER_POLICY_EVIDENCE_KIND);
  assert.equal(created.schemaVersion, STATE_WRITER_POLICY_EVIDENCE_SCHEMA_VERSION);
  assert.equal(created.verificationIdentity.verificationSha, VERIFICATION_SHA);
  assert.equal(created.verificationIdentity.verificationTreeSha, VERIFICATION_TREE_SHA);
  assert.equal(created.checkerPlan.digest, fixture.checkerPlan.digest);
  assert.equal(created.policyIdentity.policyBlobSha, POLICY_BLOB_SHA);
  assert.equal(created.policyIdentity.configTreeIdentity, CONFIG_TREE_IDENTITY);
  assert.equal(created.policyIdentity.currentCheckpoint.phase, PHASE);
  assert.match(created.policyIdentity.currentCheckpointDigest, /^[0-9a-f]{64}$/);
  assert.match(created.policyIdentity.checkpointHistoryDigest, /^[0-9a-f]{64}$/);
  assert.equal(created.reportArtifact.path, fixture.reportPath.replaceAll("\\", "/"));
  assert.equal(created.reportArtifact.schemaVersion, 1);
  assert.equal(created.reportArtifact.verdict, "pass");
  assert.ok(created.reportArtifact.size > 0);
  assert.match(created.reportArtifact.sha256, /^[0-9a-f]{64}$/);
  assert.match(created.evidenceId, /^[0-9a-f]{64}$/);
  assert.equal(validated.status, "reusable-exact");
  assert.equal(validated.evidence.evidenceId, created.evidenceId);
});

test("explicit checker producer runs the checker once and publishes checker-producer evidence", () => {
  const fixture = createFixture();
  fs.unlinkSync(path.join(fixture.cwd, fixture.reportPath));
  let checkerRuns = 0;
  const result = produceStateWriterPolicyEvidence({
    cwd: fixture.cwd,
    phase: PHASE,
    reportPath: fixture.reportPath,
    evidencePath: fixture.evidencePath,
    checkerPlan: fixture.checkerPlan,
    runner(command, args, options) {
      checkerRuns += 1;
      assert.equal(command, fixture.checkerPlan.resolvedCommand.executable);
      assert.deepEqual(args, fixture.checkerPlan.resolvedCommand.args);
      assert.equal(options.cwd, fixture.cwd);
      fs.writeFileSync(
        path.join(fixture.cwd, fixture.reportPath),
        `${JSON.stringify(fixture.report, null, 2)}\n`,
        "utf8",
      );
      return { status: 0, stdout: "pass", stderr: "" };
    },
    ...fixture.dependencies,
  });

  assert.equal(checkerRuns, 1);
  assert.equal(result.status, "produced-live");
  assert.equal(
    result.producer.role,
    STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE,
  );
  assert.equal(result.evidenceId, result.evidence.evidenceId);
  assert.equal(
    validateEvidence(fixture, {
      expectedEvidenceId: result.evidenceId,
      expectedProducerRole: STATE_WRITER_POLICY_CHECKER_PRODUCER_ROLE,
    }).evidenceId,
    result.evidenceId,
  );
});

test("producer and validator fence the exact clean identity after all reads", () => {
  const dirtyIdentity = cleanIdentity({
    workspaceClean: false,
    trackedClean: false,
    workspaceStatus: " M tools/state_writer_policy.json",
  });
  const changedIdentity = cleanIdentity({
    verificationSha: "8".repeat(40),
    verificationTreeSha: "9".repeat(40),
  });

  for (const [label, endIdentity] of [
    ["dirty", dirtyIdentity],
    ["changed", changedIdentity],
  ]) {
    const producerFixture = createFixture();
    assert.throws(
      () => writeEvidence(producerFixture, {
        verificationIdentityReader: sequenceReader([
          producerFixture.identity,
          endIdentity,
        ]),
      }),
      (error) => (
        error?.code === "state-writer-evidence-identity-drift"
        && error?.disposition === "blocked"
        && error?.startIdentity?.verificationSha === VERIFICATION_SHA
        && error?.endIdentity?.verificationSha === endIdentity.verificationSha
      ),
      `producer ${label} fence`,
    );
    assert.equal(fs.existsSync(path.join(
      producerFixture.cwd,
      producerFixture.evidencePath,
    )), false);

    const validatorFixture = createFixture();
    writeEvidence(validatorFixture);
    assert.throws(
      () => validateEvidence(validatorFixture, {
        verificationIdentityReader: sequenceReader([
          validatorFixture.identity,
          endIdentity,
        ]),
      }),
      (error) => (
        error?.code === "state-writer-evidence-identity-drift"
        && error?.disposition === "blocked"
        && error?.startIdentity?.verificationSha === VERIFICATION_SHA
        && error?.endIdentity?.verificationSha === endIdentity.verificationSha
      ),
      `validator ${label} fence`,
    );
  }

  const producerFixture = createFixture();
  const created = writeEvidence(producerFixture, {
    verificationIdentityReader: sequenceReader([
      producerFixture.identity,
      producerFixture.identity,
    ]),
  });
  const validated = validateEvidence(producerFixture, {
    verificationIdentityReader: sequenceReader([
      producerFixture.identity,
      producerFixture.identity,
    ]),
  });
  assert.equal(validated.evidenceId, created.evidenceId);
});

test("checker verification identity exposes complete untracked-aware aliases", () => {
  const checkerSource = fs.readFileSync(
    path.join(process.cwd(), "tools", "check_state_writer_policy.mjs"),
    "utf8",
  );
  assert.match(checkerSource, /workspaceClean:\s*trackedClean/u);
  assert.match(checkerSource, /workspaceStatus:\s*trackedStatus/u);
  assert.match(checkerSource, /trackedClean,\s*\r?\n\s*trackedStatus,/u);
  assert.match(checkerSource, /includesUntracked:\s*true/u);
});

test("dirty and unmatched applicability block before evidence reuse", () => {
  const fixture = createFixture();
  writeEvidence(fixture);

  assert.throws(
    () => validateEvidence(fixture, {
      verificationIdentityReader: () => cleanIdentity({
        workspaceClean: false,
        trackedClean: false,
        workspaceStatus: " M js/main.js",
      }),
    }),
    (error) => error?.code === "state-writer-evidence-workspace-dirty"
      && error?.disposition === "blocked",
  );
  assert.throws(
    () => validateEvidence(fixture, {
      routeApplicability: { unmatchedChangedFiles: ["js/unmatched.js"] },
    }),
    (error) => error?.code === "state-writer-evidence-unmatched-route"
      && error?.disposition === "blocked",
  );
});

test("incomplete source identity blocks instead of falling back", () => {
  const fixture = createFixture();
  const evidence = writeEvidence(fixture);
  delete evidence.verificationIdentity.verificationTreeSha;
  fs.writeFileSync(
    path.join(fixture.cwd, fixture.evidencePath),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-source-identity-incomplete"
      && error?.disposition === "blocked",
  );
});

test("missing, corrupt, schema-drifted, and plan-drifted artifacts are traceable reuse misses", () => {
  const fixture = createFixture();

  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-missing"
      && error?.disposition === "reuse-miss",
  );

  const evidence = writeEvidence(fixture);
  fs.appendFileSync(path.join(fixture.cwd, fixture.reportPath), "corrupt\n", "utf8");
  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-report-artifact-corrupt"
      && error?.disposition === "reuse-miss",
  );

  const driftedReport = structuredClone(fixture.report);
  driftedReport.metrics.legacyDirectFiles.test += 1;
  fs.writeFileSync(
    path.join(fixture.cwd, fixture.reportPath),
    `${JSON.stringify(driftedReport, null, 2)}\n`,
    "utf8",
  );
  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-report-artifact-drift"
      && error?.disposition === "reuse-miss",
  );

  fs.writeFileSync(
    path.join(fixture.cwd, fixture.reportPath),
    `${JSON.stringify(fixture.report, null, 2)}\n`,
    "utf8",
  );
  evidence.schemaVersion += 1;
  fs.writeFileSync(
    path.join(fixture.cwd, fixture.evidencePath),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-schema-drift"
      && error?.disposition === "reuse-miss",
  );

  writeEvidence(fixture);
  const driftedPlan = buildStateWriterCheckerPlan({
    phase: PHASE,
    reportPath: fixture.reportPath,
    nodeExecutable: "different-node",
  });
  assert.throws(
    () => validateEvidence(fixture, { checkerPlan: driftedPlan }),
    (error) => error?.code === "state-writer-evidence-plan-drift"
      && error?.disposition === "reuse-miss",
  );
});

test("policy, checkpoint, Git identity, and evidence body drift reject reuse", () => {
  const fixture = createFixture();
  writeEvidence(fixture);

  assert.throws(
    () => validateEvidence(fixture, {
      verificationIdentityReader: () => cleanIdentity({
        verificationTreeSha: "9".repeat(40),
      }),
    }),
    (error) => error?.code === "state-writer-evidence-git-identity-drift"
      && error?.disposition === "reuse-miss",
  );
  assert.throws(
    () => validateEvidence(fixture, {
      policyReader: () => policyFixture({
        progress: {
          latestPhase: PHASE,
          checkpoints: [{ phase: PHASE, productionLegacyDirectFiles: 74 }],
        },
      }),
    }),
    (error) => error?.code === "state-writer-evidence-checkpoint-drift"
      && error?.disposition === "reuse-miss",
  );
  assert.throws(
    () => validateEvidence(fixture, {
      blobShaReader: () => "8".repeat(40),
    }),
    (error) => error?.code === "state-writer-evidence-policy-identity-drift"
      && error?.disposition === "reuse-miss",
  );

  assert.throws(
    () => validateEvidence(fixture, { expectedEvidenceId: "7".repeat(64) }),
    (error) => error?.code === "state-writer-evidence-id-drift"
      && error?.disposition === "reuse-miss",
  );

  const evidence = JSON.parse(
    fs.readFileSync(path.join(fixture.cwd, fixture.evidencePath), "utf8"),
  );
  evidence.producer.entrypoint = "tampered-entrypoint";
  fs.writeFileSync(
    path.join(fixture.cwd, fixture.evidencePath),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  assert.throws(
    () => validateEvidence(fixture),
    (error) => error?.code === "state-writer-evidence-body-drift"
      && error?.disposition === "reuse-miss",
  );
});

test("compatible ensure performs one live fallback and then reuses exact evidence", () => {
  const fixture = createFixture();
  fs.unlinkSync(path.join(fixture.cwd, fixture.reportPath));
  let liveRuns = 0;
  const runner = (_command, _args, options) => {
    liveRuns += 1;
    assert.equal(options.cwd, fixture.cwd);
    fs.mkdirSync(path.dirname(path.join(fixture.cwd, fixture.reportPath)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.cwd, fixture.reportPath),
      `${JSON.stringify(fixture.report, null, 2)}\n`,
      "utf8",
    );
    return { status: 0, stdout: "pass", stderr: "" };
  };
  const options = {
    cwd: fixture.cwd,
    phase: PHASE,
    reportPath: fixture.reportPath,
    evidencePath: fixture.evidencePath,
    checkerPlan: fixture.checkerPlan,
    producer: {
      entrypoint: "tools/run_p4_state_write_boundary.mjs",
      commandRef: "standalone-boundary-live-fallback",
    },
    routeApplicability: { unmatchedChangedFiles: [] },
    runner,
    liveFallbackSession: createStateWriterPolicyEvidenceSession(),
    ...fixture.dependencies,
  };

  const first = ensureStateWriterPolicyEvidence(options);
  const second = ensureStateWriterPolicyEvidence(options);

  assert.equal(first.status, "produced-live");
  assert.equal(first.fallbackReason, "state-writer-evidence-missing");
  assert.equal(second.status, "reusable-exact");
  assert.equal(liveRuns, 1);
});

test("blocked ensure never invokes the live fallback", () => {
  const fixture = createFixture();
  let liveRuns = 0;

  assert.throws(
    () => ensureStateWriterPolicyEvidence({
      cwd: fixture.cwd,
      phase: PHASE,
      reportPath: fixture.reportPath,
      evidencePath: fixture.evidencePath,
      checkerPlan: fixture.checkerPlan,
      routeApplicability: { unmatchedChangedFiles: ["js/unmatched.js"] },
      runner: () => {
        liveRuns += 1;
        return { status: 0 };
      },
      liveFallbackSession: createStateWriterPolicyEvidenceSession(),
      ...fixture.dependencies,
    }),
    (error) => error?.code === "state-writer-evidence-unmatched-route"
      && error?.disposition === "blocked",
  );
  assert.equal(liveRuns, 0);
});

test("Nightly strict consumers fail red before any live producer fallback", () => {
  const fixture = createFixture();
  let liveRuns = 0;
  const liveFallbackSession = createStateWriterPolicyEvidenceSession();

  assert.throws(
    () => ensureStateWriterPolicyEvidence({
      cwd: fixture.cwd,
      phase: PHASE,
      reportPath: fixture.reportPath,
      evidencePath: fixture.evidencePath,
      expectedEvidenceId: "9".repeat(64),
      checkerPlan: fixture.checkerPlan,
      routeApplicability: { unmatchedChangedFiles: [] },
      runner: () => {
        liveRuns += 1;
        return { status: 0 };
      },
      liveFallbackSession,
      liveFallbackPolicy: STATE_WRITER_POLICY_LIVE_FALLBACK_FORBID,
      ...fixture.dependencies,
    }),
    (error) => (
      error?.code === "state-writer-evidence-live-fallback-forbidden"
      && error?.disposition === "blocked"
      && error?.fallbackReason === "state-writer-evidence-missing"
    ),
  );
  assert.equal(liveRuns, 0);
  assert.equal(liveFallbackSession.liveFallbackAttempts, 0);
});

test("missing includesUntracked blocks before consuming producer budget", () => {
  const fixture = createFixture();
  const incompleteIdentity = cleanIdentity();
  delete incompleteIdentity.includesUntracked;
  let liveRuns = 0;
  const liveFallbackSession = createStateWriterPolicyEvidenceSession();

  assert.throws(
    () => ensureStateWriterPolicyEvidence({
      cwd: fixture.cwd,
      phase: PHASE,
      reportPath: fixture.reportPath,
      evidencePath: fixture.evidencePath,
      checkerPlan: fixture.checkerPlan,
      routeApplicability: { unmatchedChangedFiles: [] },
      verificationIdentityReader: () => incompleteIdentity,
      runner: () => {
        liveRuns += 1;
        return { status: 0 };
      },
      liveFallbackSession,
      policyReader: fixture.dependencies.policyReader,
      blobShaReader: fixture.dependencies.blobShaReader,
    }),
    (error) => error?.code === "state-writer-evidence-source-identity-incomplete"
      && error?.disposition === "blocked",
  );
  assert.equal(liveRuns, 0);
  assert.equal(liveFallbackSession.liveFallbackAttempts, 0);
});

test("one caller-owned session consumes at most one live producer attempt", () => {
  for (const outcome of ["success", "failure", "signal", "invalid-artifact"]) {
    const fixture = createFixture();
    const liveFallbackSession = createStateWriterPolicyEvidenceSession();
    let liveRuns = 0;
    if (outcome === "invalid-artifact") {
      fs.unlinkSync(path.join(fixture.cwd, fixture.reportPath));
    }
    const runner = () => {
      liveRuns += 1;
      if (outcome === "failure") {
        return { status: 7, stdout: "", stderr: "failed" };
      }
      if (outcome === "signal") {
        return { status: null, signal: "SIGTERM", stdout: "", stderr: "" };
      }
      return { status: 0, stdout: "pass", stderr: "" };
    };
    const options = {
      cwd: fixture.cwd,
      phase: PHASE,
      reportPath: fixture.reportPath,
      evidencePath: fixture.evidencePath,
      checkerPlan: fixture.checkerPlan,
      routeApplicability: { unmatchedChangedFiles: [] },
      runner,
      liveFallbackSession,
      ...fixture.dependencies,
    };

    if (outcome === "success") {
      assert.equal(ensureStateWriterPolicyEvidence(options).status, "produced-live");
      fs.unlinkSync(path.join(fixture.cwd, fixture.evidencePath));
    } else {
      assert.throws(
        () => ensureStateWriterPolicyEvidence(options),
        (error) => error?.disposition === "blocked",
      );
    }
    assert.equal(liveRuns, 1, `${outcome} first attempt`);
    assert.equal(liveFallbackSession.liveFallbackAttempts, 1, outcome);
    assert.throws(
      () => ensureStateWriterPolicyEvidence(options),
      (error) => (
        error?.code === "state-writer-evidence-live-fallback-budget-exhausted"
        && error?.disposition === "blocked"
        && error?.liveFallbackAttempts === 1
      ),
      `${outcome} exhausted budget`,
    );
    assert.equal(liveRuns, 1, `${outcome} producer count`);

    const newSessionOptions = {
      ...options,
      liveFallbackSession: createStateWriterPolicyEvidenceSession(),
      runner: () => {
        liveRuns += 1;
        return { status: 9, stdout: "", stderr: "new invocation" };
      },
    };
    assert.throws(
      () => ensureStateWriterPolicyEvidence(newSessionOptions),
      (error) => error?.code === "state-writer-evidence-live-producer-failed",
      `${outcome} new invocation budget`,
    );
    assert.equal(liveRuns, 2, `${outcome} new invocation producer count`);
  }
});

test("successful producer exit without a valid report artifact fails closed", () => {
  const fixture = createFixture();
  fs.unlinkSync(path.join(fixture.cwd, fixture.reportPath));
  let liveRuns = 0;

  assert.throws(
    () => ensureStateWriterPolicyEvidence({
      cwd: fixture.cwd,
      phase: PHASE,
      reportPath: fixture.reportPath,
      evidencePath: fixture.evidencePath,
      checkerPlan: fixture.checkerPlan,
      routeApplicability: { unmatchedChangedFiles: [] },
      runner: () => {
        liveRuns += 1;
        return { status: 0, stdout: "pass", stderr: "" };
      },
      liveFallbackSession: createStateWriterPolicyEvidenceSession(),
      ...fixture.dependencies,
    }),
    (error) => (
      error?.code === "state-writer-evidence-live-producer-invalid-artifact"
      && error?.disposition === "blocked"
      && error?.validationCode === "state-writer-evidence-report-artifact-missing"
    ),
  );
  assert.equal(liveRuns, 1);
});
