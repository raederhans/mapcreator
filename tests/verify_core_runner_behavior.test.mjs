import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildRouteIndex,
} from "../tools/test_route_registry.mjs";
import {
  buildRecommendation,
} from "../tools/select_verification_targets.mjs";
import {
  buildCoreVerificationPlan,
  commandToProcess,
  parseArgs,
  runCoreVerification,
  runVerificationPlan,
} from "../tools/run_core_verification.mjs";

const PACKAGE_SCRIPTS = {
  "verify:test:e2e-layers": "node tools/e2e_layering.mjs check",
  "verify:test-import-graph": "node tools/check_test_import_graph.mjs",
  "verify:architecture-boundaries": "node tools/check_architecture_boundaries.mjs",
  "verify:state-write-allowlist": "node tools/check_state_write_allowlist.mjs",
  "verify:test-console-allowlist": "node tools/check_console_allowlist_decay.mjs",
  "verify:test-timeout-guardrails": "node tools/check_test_timeout_guardrails.mjs",
  "verify:supervisor-contracts": "npm run verify:supervisor-schemas && npm run test:node:supervisor-contracts && npm run test:node:supervisor-routing",
  "verify:supervisor-plan": "npm run test:node:supervisor-plan && node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tests/supervisor_plan_behavior.test.mjs",
  "test:node:post-ready-scheduler": "node --test tests/post_ready_scheduler_behavior.test.mjs tests/main_post_ready_scheduler_boundary.test.mjs",
  "test:node:main-runtime-diagnostics": "node --test tests/main_runtime_diagnostics_behavior.test.mjs tests/main_runtime_diagnostics_boundary.test.mjs",
  "test:node:render-runtime-binding": "node --test tests/render_runtime_binding_behavior.test.mjs tests/main_render_runtime_binding_boundary.test.mjs",
  "test:node:startup-ready-handoff": "node --test tests/startup_ready_handoff_behavior.test.mjs tests/main_startup_ready_handoff_boundary.test.mjs",
  "test:node:startup-failure-recovery": "node --test tests/startup_failure_recovery_behavior.test.mjs tests/main_startup_failure_recovery_boundary.test.mjs",
  "test:node:deferred-bootstrap": "node --test tests/deferred_vendor_loader_behavior.test.mjs tests/deferred_ui_bootstrap_behavior.test.mjs tests/main_deferred_bootstrap_boundary.test.mjs",
  "test:node:main-bootstrap-wiring": "node --test tests/main_bootstrap_wiring_boundary.test.mjs",
  "test:node:renderer-render-request-boundary": "npm run test:node:renderer-render-request-boundary-owner && npm run test:node:renderer-render-request-boundary-inventory",
  "test:node:renderer-render-phase-lifecycle": "npm run test:node:renderer-render-phase-lifecycle-owner && npm run test:node:renderer-render-phase-lifecycle-inventory",
  "test:node:render-pass-catalog": "node --test tests/render_pass_catalog_behavior.test.mjs",
  "test:node:render-pipeline-catalog": "node --test tests/render_pipeline_catalog_behavior.test.mjs",
  "test:node:renderer-hit-canvas-scheduling-inventory": "node --test tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs",
  "test:node:render-pass-cache-host-owner-suite": "npm run test:node:render-pass-cache-host-owner && npm run test:node:render-pass-cache-host-owner-inventory && npm run test:node:renderer-render-pass-cache-host-inventory",
  "test:node:render-pass-commit-accounting-owner-suite": "npm run test:node:render-pass-commit-accounting-owner && npm run test:node:render-pass-commit-accounting-inventory",
  "test:node:hit-canvas-scheduling-owner-suite": "npm run test:node:hit-canvas-scheduling-owner && npm run test:node:hit-canvas-scheduling-owner-inventory && npm run test:node:renderer-hit-canvas-scheduling-inventory",
  "test:node:map-interaction-event-binding-owner": "node --test tests/map_interaction_event_binding_owner_behavior.test.mjs",
  "test:node:visible-frame-diagnostics": "npm run test:node:visible-frame-diagnostics-owner && npm run test:node:visible-frame-diagnostics-inventory",
  "test:node:render-cache-owner": "node --test tests/render_cache_owner_invalidation_behavior.test.mjs",
  "test:node:render-transform-reuse-policy-owner": "node --test tests/render_transform_reuse_policy_owner_behavior.test.mjs",
  "test:node:viewport-read-model-owner": "node --test tests/viewport_read_model_owner_behavior.test.mjs",
  "test:node:viewport-command-owner": "node --test tests/viewport_command_owner_behavior.test.mjs",
  "verify:scenario-contracts:strict": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json",
  "test:node:scenario-lifecycle-runtime-behavior": "node --test tests/scenario_lifecycle_runtime_behavior.test.mjs",
  "test:node:scenario-runtime-state-behavior": "node --test tests/scenario_runtime_state_behavior.test.mjs",
  "test:node:scenario-apply-transaction-ownership": "node --test tests/scenario_apply_transaction_ownership.test.mjs",
  "test:node:scenario-chunk-contracts": "node --test tests/scenario_chunk_contracts.test.mjs",
  "test:node:annotation-productization": "node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs",
  "verify:pages-dist": "npm run python -- tools/build_pages_dist.py && npm run python -- -m unittest tests.test_pages_dist_startup_shell -q && npm run test:node:landing-showcase-view && npm run test:node:sample-project-contracts",
  "verify:dist-drift": "npm run python -- tools/build_pages_dist.py && git diff --exit-code -- dist/.nojekyll dist/app.js dist/index.html dist/styles.css dist/assets dist/app/index.html dist/app/js dist/app/css dist/app/vendor dist/pages-dist-manifest.json",
  "test:e2e:smoke": "node tools/e2e_layering.mjs run smoke",
  "test:e2e:scenario-apply-concurrency": "node node_modules/@playwright/test/cli.js test tests/e2e/scenario_apply_concurrency.spec.js --workers=1 --retries=0",
  "test:e2e:project-save-load": "node node_modules/@playwright/test/cli.js test tests/e2e/project_save_load_roundtrip.spec.js --workers=1",
  "test:e2e:interaction-funnel": "node node_modules/@playwright/test/cli.js test tests/e2e/interaction_funnel_contract.spec.js --workers=1 --retries=0",
};

function commandRefs(plan) {
  return plan.commandsToRun.map((entry) => entry.commandRef);
}

function assertCommandRefsInclude(plan, expectedCommandRefs) {
  const refs = new Set(commandRefs(plan));
  for (const commandRef of expectedCommandRefs) {
    assert.equal(refs.has(commandRef), true, `${commandRef} should be present in the verify:core plan`);
  }
}

function assertNoRendererRuntimeSelection(report) {
  for (const command of report.recommendedCommands) {
    assert.equal(command.domains.includes("renderer-runtime"), false);
    assert.equal(command.ownerHints.includes("renderer-runtime"), false);
  }
  for (const entry of report.matchedByFile) {
    for (const command of entry.recommendedCommands) {
      assert.equal(command.domains.includes("renderer-runtime"), false);
      assert.equal(command.ownerHints.includes("renderer-runtime"), false);
    }
  }
}

test("verify-core runner node route stays in test-routing domain", () => {
  const route = buildRouteIndex().find((candidate) => candidate.id === "node:test:node:verify-core-runner");

  assert.ok(route);
  assert.equal(route.commandRef, "test:node:verify-core-runner");
  assert.equal(route.domain, "test-routing");
});

test("verify-core runner selector coverage stays out of renderer runtime", () => {
  assertNoRendererRuntimeSelection(buildRecommendation(["tools/run_core_verification.mjs"]));
  assertNoRendererRuntimeSelection(buildRecommendation(["tests/verify_core_runner_behavior.test.mjs"]));
});

test("default plan excludes E2E and lists skipped main-thread checks", () => {
  const plan = buildCoreVerificationPlan({ packageScripts: PACKAGE_SCRIPTS });

  assert.equal(plan.includeMainThread, false);
  assert.equal(plan.startsBrowserDevServerOrPlaywright, false);
  assert.equal(plan.requiresDistLaneOwner, true);
  assert.deepEqual(plan.omittedCommands, []);
  assert.deepEqual(plan.duplicateCommands, []);
  assert.equal(commandRefs(plan).some((commandRef) => commandRef.startsWith("test:e2e:")), false);
  assertCommandRefsInclude(plan, [
    "verify:state-write-allowlist",
    "verify:pages-dist",
    "verify:dist-drift",
    "test:node:render-pass-cache-host-owner-suite",
    "test:node:render-pass-commit-accounting-owner-suite",
    "test:node:hit-canvas-scheduling-owner-suite",
  ]);
  assert.ok(commandRefs(plan).includes(
    "npm run python -- -m unittest tests.test_app_entry_resolver tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract tests.test_map_renderer_interaction_border_snapshot_orchestration_contract tests.test_perf_gate_contract tests.test_startup_shell -q",
  ));
  assert.deepEqual(
    plan.skippedMainThreadCommands.map((entry) => entry.commandRef),
    [
      "test:e2e:smoke",
      "test:e2e:scenario-apply-concurrency",
      "test:e2e:project-save-load",
      "test:e2e:interaction-funnel",
      "test:e2e:tno-contracts",
      "test:e2e:water-rendering",
      "test:e2e:city-rendering",
    ],
  );
});

test("includeMainThread adds explicit E2E group and keeps optional E2E skipped", () => {
  const plan = buildCoreVerificationPlan({ packageScripts: PACKAGE_SCRIPTS, includeMainThread: true });

  assert.equal(plan.startsBrowserDevServerOrPlaywright, true);
  assertCommandRefsInclude(plan, [
    "test:e2e:smoke",
    "test:e2e:scenario-apply-concurrency",
    "test:e2e:project-save-load",
    "test:e2e:interaction-funnel",
  ]);
  assert.deepEqual(
    plan.skippedMainThreadCommands.map((entry) => entry.commandRef),
    ["test:e2e:tno-contracts", "test:e2e:water-rendering", "test:e2e:city-rendering"],
  );
});

test("plan filters empty commandRef, duplicates, self-recursion, and missing package scripts", () => {
  const plan = buildCoreVerificationPlan({
    packageScripts: {
      ok: "node ok.mjs",
      duplicate: "node ok.mjs",
      "verify:core": "node tools/run_core_verification.mjs",
    },
    groups: [
      {
        id: "custom",
        title: "Custom",
        commands: ["ok", "", "duplicate", "verify:core", "node tools/run_core_verification.mjs --list", "missing"],
      },
    ],
    mainThreadGroup: { id: "main", title: "Main", commands: [] },
    optionalMainThreadCommands: [],
  });

  assert.deepEqual(commandRefs(plan), ["ok"]);
  assert.deepEqual(
    plan.duplicateCommands.map((entry) => [entry.commandRef, entry.duplicateOf, entry.command]),
    [["duplicate", "ok", "node ok.mjs"]],
  );
  assert.deepEqual(
    plan.omittedCommands.map((entry) => [entry.commandRef, entry.reason]),
    [
      ["", "empty commandRef"],
      ["verify:core", "self recursion"],
      ["node tools/run_core_verification.mjs --list", "self recursion"],
      ["missing", "missing package script"],
    ],
  );
});

test("commandToProcess resolves package scripts, direct node, and direct npm on Windows", () => {
  assert.deepEqual(
    commandToProcess("ok", { packageScripts: { ok: "node ok.mjs" }, platform: "linux" }),
    { bin: "npm", args: ["run", "ok"] },
  );
  assert.deepEqual(
    commandToProcess("node tools/run_core_verification.mjs --list", { packageScripts: {}, platform: "win32" }),
    { bin: "node", args: ["tools/run_core_verification.mjs", "--list"] },
  );
  assert.deepEqual(
    commandToProcess("npm run test:node:verify-core-runner", { packageScripts: {}, platform: "win32" }),
    { bin: "cmd.exe", args: ["/d", "/s", "/c", "npm", "run", "test:node:verify-core-runner"] },
  );
});

test("--list writes reports and does not execute", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-core-"));
  const calls = [];
  const result = runCoreVerification({
    argv: {
      ...parseArgs([
        "--list",
        "--json-out",
        path.join(tempDir, "verify-core.json"),
        "--md-out",
        path.join(tempDir, "verify-core.md"),
      ]),
    },
    packageScripts: PACKAGE_SCRIPTS,
    runner(bin, args) {
      calls.push([bin, args]);
      return { status: 0 };
    },
    stdio: "pipe",
  });

  assert.equal(result.exitCode, 0);
  assert.equal(calls.length, 0);
  assert.equal(fs.existsSync(path.join(tempDir, "verify-core.json")), true);
  assert.equal(fs.existsSync(path.join(tempDir, "verify-core.md")), true);
});

test("execution records failure and stops on first failing command", () => {
  const plan = buildCoreVerificationPlan({
    packageScripts: { first: "node first.mjs", second: "node second.mjs", third: "node third.mjs" },
    groups: [{ id: "custom", title: "Custom", commands: ["first", "second", "third"] }],
    mainThreadGroup: { id: "main", title: "Main", commands: [] },
    optionalMainThreadCommands: [],
  });
  const calls = [];
  const results = runVerificationPlan(plan, {
    packageScripts: { first: "node first.mjs", second: "node second.mjs", third: "node third.mjs" },
    platform: "linux",
    stdio: "pipe",
    runner(bin, args) {
      calls.push([bin, args]);
      return { status: calls.length === 2 ? 7 : 0 };
    },
  });

  assert.deepEqual(results.map((entry) => [entry.commandRef, entry.exitCode]), [["first", 0], ["second", 7]]);
  assert.equal(calls.length, 2);
});
