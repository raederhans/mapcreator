import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  P4_STATE_WRITER_POLICY_TEST_FILES,
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
  assert.match(pythonCommand, /tests\.test_scenario_chunk_state_actions_boundary_contract/);
  assert.ok(
    buildP4PhaseVerificationPlan({ phase: "P4.2b" }).commands.includes(
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
