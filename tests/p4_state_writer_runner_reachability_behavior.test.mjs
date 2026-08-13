import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  P4_STATE_WRITER_POLICY_TEST_FILES,
  P4_STATE_WRITER_POLICY_QUICK_TEST_FILES,
  resolveP4StateWriterPolicyRun,
  resolveP4StateWriterPolicyTestFiles,
} from "../tools/run_p4_state_writer_policy_tests.mjs";
import { buildP4PhaseVerificationPlan } from "../tools/run_p4_phase_verification.mjs";
import { buildNodeRoutes } from "../tools/test_route_registry.mjs";

const EXPECTED_DEFAULT_SUITES = Object.freeze([
  "tests/state_action_delegation_edges_behavior.test.mjs",
  "tests/state_writer_policy_behavior.test.mjs",
  "tests/state_writer_policy_batch_scan_behavior.test.mjs",
  "tests/state_writer_policy_soundness_behavior.test.mjs",
  "tests/state_writer_scanner_soundness_behavior.test.mjs",
  "tests/state_writer_policy_manifest_behavior.test.mjs",
  "tests/p4_state_action_routes_behavior.test.mjs",
  "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
]);

test("named P4 policy gate delegates to the complete runner default suite", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(
    packageJson.scripts["test:node:p4:state-writer-policy"],
    "node tools/run_p4_state_writer_policy_tests.mjs",
  );
  assert.deepEqual(
    P4_STATE_WRITER_POLICY_TEST_FILES,
    EXPECTED_DEFAULT_SUITES,
  );
  assert.deepEqual(
    resolveP4StateWriterPolicyTestFiles([]),
    EXPECTED_DEFAULT_SUITES,
  );
});

test("explicit focused runner requests remain isolated from the default suite", () => {
  assert.deepEqual(
    resolveP4StateWriterPolicyTestFiles([
      "tests/state_writer_policy_behavior.test.mjs",
    ]),
    ["tests/state_writer_policy_behavior.test.mjs"],
  );
});

test("quick policy runner keeps fast suites and writes an isolated TAP report", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const request = resolveP4StateWriterPolicyRun(["--quick"]);

  assert.equal(
    packageJson.scripts["test:node:p4:state-writer-policy:quick"],
    "node tools/run_p4_state_writer_policy_tests.mjs --quick",
  );
  assert.deepEqual(request.testArguments, P4_STATE_WRITER_POLICY_QUICK_TEST_FILES);
  assert.equal(
    request.testArguments.includes("tests/state_writer_policy_manifest_behavior.test.mjs"),
    false,
  );
  assert.match(request.reportPath, /state-writer-policy-tests\.quick\.tap$/);
  assert.throws(
    () => resolveP4StateWriterPolicyRun(["--quick", "tests/state_writer_policy_behavior.test.mjs"]),
    /cannot be combined/,
  );

  const focused = resolveP4StateWriterPolicyRun([
    "--test-name-pattern=explicit repository scan cache",
    "tests/state_writer_policy_manifest_behavior.test.mjs",
  ]);
  assert.equal(focused.mode, "focused");
  assert.match(focused.reportPath, /state-writer-policy-tests\.focused\.tap$/);
});

test("exact P4.2a Node gate reaches the batch scanner regression suite", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const exactPhaseCommand = packageJson.scripts["test:node:p4:p4-2a"];

  assert.ok(
    exactPhaseCommand
      .split(/\s+/)
      .includes("tests/state_writer_policy_batch_scan_behavior.test.mjs"),
    exactPhaseCommand,
  );
});

test("exact P4.2b gates reach chunk action and boundary regressions", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const nodeCommand = packageJson.scripts["test:node:p4:p4-2b"];
  const pythonCommand = packageJson.scripts["test:python:p4:p4-2b-boundary"];

  assert.ok(nodeCommand.split(/\s+/).includes("tests/scenario_chunk_state_actions_behavior.test.mjs"));
  assert.ok(!nodeCommand.includes("--test-force-exit"), nodeCommand);
  assert.match(pythonCommand, /tests\.test_scenario_chunk_state_actions_boundary_contract/);
  assert.ok(
    buildP4PhaseVerificationPlan({ phase: "P4.2b" }).commands.includes(
      "npm run test:node:p4:state-writer-policy",
    ),
  );
});

test("exact P4.2c gates reach Scenario health action and boundary regressions", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const nodeCommand = packageJson.scripts["test:node:p4:p4-2c"];
  const pythonCommand = packageJson.scripts["test:python:p4:p4-2c-boundary"];

  assert.ok(nodeCommand.split(/\s+/).includes("tests/scenario_health_actions_behavior.test.mjs"));
  assert.ok(nodeCommand.split(/\s+/).includes("tests/startup_hydration_behavior.test.mjs"));
  assert.ok(!nodeCommand.includes("--test-force-exit"), nodeCommand);
  assert.match(pythonCommand, /tests\.test_scenario_health_actions_boundary_contract/);
  assert.ok(
    buildP4PhaseVerificationPlan({ phase: "P4.2c" }).commands.includes(
      "npm run test:node:p4:state-writer-policy",
    ),
  );
});

test("exact P4.3 gates reach renderer state action and boundary regressions", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const nodeCommand = packageJson.scripts["test:node:p4:p4-3"];
  const pythonCommand = packageJson.scripts["test:python:p4:p4-3-boundary"];

  for (const testFile of [
    "tests/renderer_phase_actions_behavior.test.mjs",
    "tests/renderer_interaction_actions_behavior.test.mjs",
    "tests/renderer_exact_refresh_actions_behavior.test.mjs",
    "tests/renderer_cache_actions_behavior.test.mjs",
    "tests/renderer_diagnostics_actions_behavior.test.mjs",
    "tests/render_perf_metrics_runtime_owner_behavior.test.mjs",
    "tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs",
  ]) {
    assert.ok(nodeCommand.split(/\s+/).includes(testFile), testFile);
  }
  assert.ok(!nodeCommand.includes("--test-force-exit"), nodeCommand);
  assert.match(pythonCommand, /tests\.test_renderer_control_actions_boundary_contract/);
  assert.match(pythonCommand, /tests\.test_renderer_exact_refresh_actions_boundary_contract/);
  assert.match(pythonCommand, /tests\.test_renderer_cache_actions_boundary_contract/);
  assert.match(pythonCommand, /tests\.test_renderer_diagnostics_actions_boundary_contract/);
  assert.ok(
    buildP4PhaseVerificationPlan({ phase: "P4.3" }).commands.includes(
      "npm run test:node:p4:state-writer-policy",
    ),
  );
});

test("node route discovery keeps wrapper-based named gates reachable", () => {
  const route = buildNodeRoutes().find(
    ({ commandRef }) => commandRef === "test:node:p4:state-writer-policy",
  );

  assert.ok(route);
  assert.equal(route.domain, "state-ownership");
  assert.ok(
    route.sourceRef
      .split(",")
      .includes("tools/run_p4_state_writer_policy_tests.mjs"),
    route.sourceRef,
  );
});
