import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  DEPENDENCY_PROFILE_IDS,
  assertDependencyCheckoutProfileReport,
  buildDependencyCheckoutProfileReport,
  deriveCanonicalProfileInputs,
  recommendP4BoundaryLanes,
  selectCheckoutProfile,
} from "../tools/verification/dependency_checkout_profiles.mjs";

function stdlibAudit(paths) {
  return {
    schemaVersion: 1,
    kind: "python-static-import-closure-audit",
    verdict: "stdlib-only",
    rootCount: paths.length,
    roots: paths.map((path) => ({
      path,
      verdict: "stdlib-only",
      closureFiles: [path],
      stdlibImports: ["unittest"],
      thirdPartyImports: [],
      unresolvedDynamicImports: [],
      parseErrors: [],
    })),
    stdlibImports: ["unittest"],
    thirdPartyImports: [],
    unresolvedDynamicImports: [],
    parseErrors: [],
    missingPaths: [],
  };
}

test("canonical metadata derives the complete P4 boundary root set read-only", () => {
  const inputs = deriveCanonicalProfileInputs();
  assert.deepEqual(inputs.p4BoundaryCommandRefs, [
    "test:python:p4:p4-1-boundary",
    "test:python:p4:p4-2a-boundary",
    "test:python:p4:p4-2b-boundary",
    "test:python:p4:p4-2c-boundary",
    "test:python:p4:p4-3-boundary",
    "test:python:p4:state-write-boundary",
  ]);
  assert.ok(inputs.pythonRoots.includes("tests/test_state_write_guardrail_contract.py"));
  const report = assertDependencyCheckoutProfileReport(buildDependencyCheckoutProfileReport({
    pythonAudit: stdlibAudit(inputs.pythonRoots),
  }));
  assert.deepEqual(report.dependencyProfiles.map((entry) => entry.id), DEPENDENCY_PROFILE_IDS);
  const schema = JSON.parse(fs.readFileSync(
    new URL("../tools/verification/dependency_checkout_profile.schema.json", import.meta.url),
    "utf8",
  ));
  assert.equal(schema.properties.schemaVersion.const, report.schemaVersion);
  assert.equal(schema.properties.kind.const, report.kind);
  assert.equal(schema.properties.laneRecommendation.properties.basis.const, "commandWallTimeMs");
  assert.equal(report.sourceBinding.mode, "read-only");
  assert.equal(report.p4CheckerBoundaries.verdict, "stdlib-only");
  for (const commandRef of inputs.p4BoundaryCommandRefs) {
    assert.ok(report.profileCommands["python-stdlib"].includes(commandRef), commandRef);
  }
});

test("checkout selection uses shallow, first-parent, explicit P4, and bundle rules", () => {
  assert.deepEqual(selectCheckoutProfile(), {
    profileId: "ordinary-lane",
    checkoutMode: "repository",
    fetchDepth: 1,
  });
  assert.equal(selectCheckoutProfile({ comparesFirstParent: true }).fetchDepth, 2);
  const blockedP4 = selectCheckoutProfile({ laneKind: "p4" });
  assert.equal(blockedP4.status, "blocked");
  const readyP4 = selectCheckoutProfile({
    laneKind: "p4",
    p4BaselineFetches: [
      { reason: "head-parent", ref: "${{ github.sha }}", depth: 2 },
      { reason: "frozen-state-writer-source", ref: "0123456789abcdef0123456789abcdef01234567", depth: 1 },
    ],
  });
  assert.equal(readyP4.status, "ready");
  assert.equal(readyP4.fetchDepth, 1);
  assert.equal(selectCheckoutProfile({
    laneKind: "p4",
    p4BaselineFetches: [{ reason: "mutable", ref: "origin/main", depth: 1 }],
  }).status, "blocked");
  const fallbackCloseout = selectCheckoutProfile({ laneKind: "closeout-validator" });
  assert.equal(fallbackCloseout.checkoutMode, "repository");
  assert.equal(fallbackCloseout.fetchDepth, 1);
  const bundleCloseout = selectCheckoutProfile({
    laneKind: "closeout-validator",
    closeoutValidatorBundle: {
      manifestValidated: true,
      artifactIdentityBound: true,
      allInputsArtifactLocal: true,
      immutableDownloadNames: true,
      runtimeProvided: true,
      requiresRepositoryRead: false,
    },
  });
  assert.equal(bundleCloseout.checkoutMode, "no-checkout");
  assert.equal(bundleCloseout.fetchDepth, null);
});

test("P4 boundary lane recommendation is capped at two and driven by commandWallTimeMs", () => {
  const commands = ["test:python:p4:a", "test:python:p4:b", "test:python:p4:c"];
  const twoLane = recommendP4BoundaryLanes(commands, [
    { commandRef: "npm run test:python:p4:a", commandWallTimeMs: 60_000 },
    { commandRef: "test:python:p4:b", commandWallTimeMs: 40_000 },
    { commandRef: "test:python:p4:c", commandWallTimeMs: 20_000 },
  ]);
  assert.equal(twoLane.status, "complete");
  assert.equal(twoLane.recommendedLaneCount, 2);
  assert.deepEqual(twoLane.lanes.map((lane) => lane.observedCommandWallTimeMs), [60_000, 60_000]);

  const oneLane = recommendP4BoundaryLanes(commands, [
    { commandRef: "test:python:p4:a", commandWallTimeMs: 3_000 },
    { commandRef: "test:python:p4:b", commandWallTimeMs: 2_000 },
    { commandRef: "test:python:p4:c", commandWallTimeMs: 1_000 },
  ]);
  assert.equal(oneLane.recommendedLaneCount, 1);
  assert.equal(oneLane.lanes.length, 1);

  const incomplete = recommendP4BoundaryLanes(commands, [
    { commandRef: "test:python:p4:a", commandWallTimeMs: 3_000 },
  ]);
  assert.equal(incomplete.status, "insufficient-command-wall-time");
  assert.equal(incomplete.recommendedLaneCount, 1);
});
