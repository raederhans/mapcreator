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
  classifyExecutionOwners,
} from "../tools/select_verification_targets.mjs";
import {
  buildCoreVerificationPlan,
  commandToProcess,
  parseArgs,
  runCoreVerification,
  runVerificationPlan,
} from "../tools/run_core_verification.mjs";
import {
  RESUMABLE_VERIFICATION_KIND,
  RESUMABLE_VERIFICATION_SCHEMA_VERSION,
  atomicWriteJsonSync,
  buildCommandStates,
  buildPlanIdentity,
  decideResume,
} from "../tools/verification/resumable_verification.mjs";
import {
  assertAdaptiveExecutionInput,
  buildExecutionPlan,
  discoverChangedFiles,
  executeAdaptivePlan,
  parseArgs as parseAdaptiveArgs,
} from "../tools/run_adaptive_tests.mjs";
import {
  buildCommandSupersessionPlan,
  collapseSupersededCommands,
} from "../tools/verification/command_supersession.mjs";

const PACKAGE_SCRIPTS = {
  "test:node:city-points-render-owner": "node --test tests/city_points_render_owner_behavior.test.mjs tests/urban_city_policy_strategic_values_behavior.test.mjs",
  "test:python:map-renderer-city-points-boundary": "npm run python -- -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_city_label_owner_boundary_contract -q",
  "verify:test:e2e-layers": "node tools/e2e_layering.mjs check",
  "verify:test-import-graph": "node tools/check_test_import_graph.mjs",
  "verify:architecture-boundaries": "node tools/check_architecture_boundaries.mjs",
  "verify:state-write-allowlist": "node tools/check_state_write_allowlist.mjs",
  "verify:p4:state-writer-policy": "npm run test:node:p4:state-writer-policy && node tools/check_state_writer_policy.mjs",
  "test:python:p4:state-write-boundary": "node tools/run_p4_state_write_boundary.mjs",
  "test:node:p4:p4-1": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/boot_actions_behavior.test.mjs",
  "test:python:p4:p4-1-boundary": "npm run python -- -m unittest tests.test_boot_state_actions_boundary_contract tests.test_state_split_boundary_contract tests.test_state_write_guardrail_contract -q",
  "verify:p4:p4-1": "node tools/run_p4_phase_verification.mjs --phase P4.1",
  "test:node:p4:p4-2a": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs tests/scenario_apply_transaction_ownership.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs",
  "test:python:p4:p4-2a-boundary": "npm run python -- -m unittest tests.test_scenario_state_actions_boundary_contract tests.test_scenario_manager_boundary_contract tests.test_scenario_resources_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_scenario_lifecycle_runtime_boundary_contract tests.test_state_write_guardrail_contract -q",
  "test:node:p4:p4-2b": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_chunk_state_actions_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/scenario_refresh_plans_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs",
  "test:python:p4:p4-2b-boundary": "npm run python -- -m unittest tests.test_scenario_chunk_state_actions_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_manager_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_state_write_guardrail_contract -q",
  "test:node:p4:p4-2c": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_health_actions_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs",
  "test:python:p4:p4-2c-boundary": "npm run python -- -m unittest tests.test_scenario_health_actions_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_scenario_data_health_boundary_contract tests.test_scenario_presentation_runtime_boundary_contract tests.test_scenario_lifecycle_runtime_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_scenario_runtime_state_boundary_contract tests.test_scenario_state_actions_boundary_contract tests.test_state_write_guardrail_contract -q",
  "test:node:p4:p4-3": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/renderer_phase_actions_behavior.test.mjs tests/renderer_interaction_actions_behavior.test.mjs tests/renderer_exact_refresh_actions_behavior.test.mjs tests/render_pass_cache_state_normalizer_behavior.test.mjs tests/renderer_cache_actions_behavior.test.mjs tests/renderer_diagnostics_actions_behavior.test.mjs tests/render_perf_metrics_runtime_owner_behavior.test.mjs tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs tests/renderer_render_phase_lifecycle_inventory.test.mjs tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs tests/zoom_interaction_lifecycle_owner_behavior.test.mjs tests/renderer_runtime_state_behavior.test.mjs tests/physical_layer_contracts.test.mjs tests/scenario_chunk_contracts.test.mjs",
  "test:python:p4:p4-3-boundary": "npm run python -- -m unittest tests.test_renderer_control_actions_boundary_contract tests.test_renderer_exact_refresh_actions_boundary_contract tests.test_renderer_cache_actions_boundary_contract tests.test_renderer_diagnostics_actions_boundary_contract tests.test_renderer_runtime_state_boundary_contract tests.test_map_renderer_interaction_context_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_state_write_guardrail_contract -q",
  "verify:test-console-allowlist": "node tools/check_console_allowlist_decay.mjs",
  "verify:test-timeout-guardrails": "node tools/check_test_timeout_guardrails.mjs",
  "verify:script-portfolio": "node tools/verification/script_portfolio.mjs check",
  "verify:supervisor-contracts": "npm run verify:supervisor-schemas && npm run test:node:supervisor-contracts && npm run test:node:supervisor-routing",
  "verify:supervisor-plan": "npm run test:node:supervisor-plan && node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tests/supervisor_plan_behavior.test.mjs",
  "test:node:verification-metadata": "node --test tests/verification_metadata_behavior.test.mjs",
  "test:node:renderer-pass-family-inventory": "node --test tests/renderer_pass_family_inventory_behavior.test.mjs",
  "test:node:visual-effects-pass-owner": "node --test tests/visual_effects_pass_owner_behavior.test.mjs",
  "test:node:context-pass-orchestrator-owner": "node --test tests/context_pass_orchestrator_owner_behavior.test.mjs",
  "test:node:renderer-political-pass-orchestration-preflight": "node --test tests/renderer_political_pass_orchestration_preflight.test.mjs",
  "test:node:political-pass-orchestrator-owner": "node --test tests/political_pass_orchestrator_owner_behavior.test.mjs",
  "test:python:map-renderer-political-pass-orchestrator-boundary": "npm run python -- -m unittest tests.test_map_renderer_political_pass_orchestrator_boundary_contract -q",
  "test:python:map-renderer-render-pipeline-passes-boundary": "npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q",
  "test:node:render-sample-role-policy": "node --test tests/render_sample_role_policy_behavior.test.mjs tests/perf_role_governed_report_behavior.test.mjs",
  "test:node:williams-crossover-governance": "node --test tests/williams_crossover_governance_behavior.test.mjs",
  "test:node:williams-crossover-job-runner": "node --test tests/williams_crossover_windows_job_runner_behavior.test.mjs tests/williams_crossover_windows_job_runner_integration.test.mjs",
  "test:node:windows-job-runtime": "node --test tests/windows_job_runner_v2_native_contract.test.mjs tests/windows_job_runtime_behavior.test.mjs",
  "test:node:windows-job-runtime:integration": "node --test tests/windows_job_runtime_integration.test.mjs",
  "test:node:renderer-draw-canvas-orchestration-inventory": "node --test tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
  "test:node:draw-canvas-orchestration-owner": "node --test tests/draw_canvas_orchestration_owner_behavior.test.mjs",
  "test:node:draw-canvas-orchestration-owner-suite": "npm run test:node:draw-canvas-orchestration-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-draw-canvas-orchestration-boundary",
  "test:node:cached-pass-compositor-owner": "node --test tests/cached_pass_compositor_owner_behavior.test.mjs",
  "test:node:cached-pass-compositor-owner-suite": "npm run test:node:cached-pass-compositor-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-frame-compositor-boundary",
  "test:node:transformed-frame-compositor-owner": "node --test tests/transformed_frame_compositor_owner_behavior.test.mjs",
  "test:node:transformed-frame-compositor-owner-suite": "npm run test:node:transformed-frame-compositor-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-frame-compositor-boundary",
  "test:node:post-ready-scheduler": "node --test tests/post_ready_scheduler_behavior.test.mjs tests/main_post_ready_scheduler_boundary.test.mjs",
  "test:node:main-runtime-diagnostics": "node --test tests/main_runtime_diagnostics_behavior.test.mjs tests/main_runtime_diagnostics_boundary.test.mjs",
  "test:node:render-runtime-binding": "node --test tests/render_runtime_binding_behavior.test.mjs tests/main_render_runtime_binding_boundary.test.mjs",
  "test:node:startup-ready-handoff": "node --test tests/startup_ready_handoff_behavior.test.mjs tests/main_startup_ready_handoff_boundary.test.mjs",
  "test:node:startup-failure-recovery": "node --test tests/startup_failure_recovery_behavior.test.mjs tests/main_startup_failure_recovery_boundary.test.mjs",
  "test:node:deferred-bootstrap": "node --test tests/deferred_vendor_loader_behavior.test.mjs tests/deferred_ui_bootstrap_behavior.test.mjs tests/main_deferred_bootstrap_boundary.test.mjs",
  "test:node:main-bootstrap-wiring": "node --test tests/main_bootstrap_wiring_boundary.test.mjs",
  "test:node:renderer-render-request-boundary": "npm run test:node:renderer-render-request-boundary-owner && npm run test:node:renderer-render-request-boundary-inventory",
  "test:node:renderer-render-phase-lifecycle": "npm run test:node:renderer-render-phase-lifecycle-owner && npm run test:node:renderer-render-phase-lifecycle-inventory",
  "test:node:renderer-runtime-context-foundation": "node --test tests/renderer_runtime_context_foundation_behavior.test.mjs",
  "test:node:renderer-runtime-context-receiver": "node --test tests/renderer_runtime_context_receiver_behavior.test.mjs",
  "test:node:renderer-runtime-context-render-cache": "node --test tests/renderer_runtime_context_render_cache_behavior.test.mjs",
  "test:node:renderer-runtime-context-projection-viewport": "node --test tests/renderer_runtime_context_projection_viewport_behavior.test.mjs",
  "test:node:renderer-runtime-context-viewport-mutation": "node --test tests/renderer_runtime_context_viewport_mutation_behavior.test.mjs",
  "test:node:renderer-runtime-context-interaction": "node --test tests/renderer_runtime_context_interaction_behavior.test.mjs",
  "test:node:renderer-runtime-context-hit-hover": "node --test tests/renderer_runtime_context_hit_hover_behavior.test.mjs",
  "test:node:click-selection-transaction-owner": "node --test tests/click_selection_transaction_owner_behavior.test.mjs",
  "test:node:renderer-click-selection-transaction-inventory": "node --test tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
  "test:python:map-renderer-render-cache-owner-boundary": "npm run python -- -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract -q",
  "test:python:map-renderer-projection-viewport-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_projection_viewport_context_boundary_contract -q",
  "test:python:map-renderer-viewport-mutation-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_viewport_mutation_context_boundary_contract -q",
  "test:python:map-renderer-interaction-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_interaction_context_boundary_contract -q",
  "test:python:map-renderer-hit-hover-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_hit_hover_context_boundary_contract -q",
  "test:python:map-renderer-draw-canvas-orchestration-boundary": "npm run python -- -m unittest tests.test_map_renderer_draw_canvas_orchestration_owner_boundary_contract -q",
  "test:python:map-renderer-frame-compositor-boundary": "npm run python -- -m unittest tests.test_map_renderer_frame_compositor_owner_boundary_contract -q",
  "test:python:map-renderer-click-selection-transaction-boundary": "npm run python -- -m unittest tests.test_map_renderer_click_selection_transaction_boundary_contract -q",
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
  "test:node:renderer-viewport-update-owner": "node --test tests/renderer_viewport_update_owner_behavior.test.mjs",
  "test:node:viewport-resize-lifecycle-owner": "node --test tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
  "test:node:zoom-interaction-lifecycle-owner": "node --test tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
  "verify:scenario-contracts:strict": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json",
  "test:node:scenario-lifecycle-runtime-behavior": "node --test tests/scenario_lifecycle_runtime_behavior.test.mjs",
  "test:node:scenario-runtime-state-behavior": "node --test tests/scenario_runtime_state_behavior.test.mjs",
  "test:node:scenario-apply-transaction-ownership": "node --test tests/scenario_apply_transaction_ownership.test.mjs",
  "test:node:scenario-chunk-contracts": "node --test tests/scenario_chunk_contracts.test.mjs",
  "test:node:annotation-productization": "node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs",
  "verify:pages-dist": "npm run python -- tools/build_pages_dist.py && npm run python -- -m unittest tests.test_pages_dist_startup_shell -q && npm run test:node:landing-showcase-view && npm run test:node:sample-project-contracts",
  "verify:pages-dist-and-drift": "npm run python -- tools/build_pages_dist.py && npm run python -- -m unittest tests.test_pages_dist_startup_shell -q && npm run test:node:landing-showcase-view && npm run test:node:sample-project-contracts && git diff --exit-code -- dist/.nojekyll dist/app.js dist/index.html dist/styles.css dist/assets dist/app/index.html dist/app/js dist/app/css dist/app/vendor dist/pages-dist-manifest.json",
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
  assert.equal(commandRefs(plan).includes("perf:williams-crossover:run"), false);
  assertCommandRefsInclude(plan, [
    "verify:state-write-allowlist",
    "verify:p4:state-writer-policy",
    "test:python:p4:state-write-boundary",
    "test:node:p4:p4-1",
    "test:python:p4:p4-1-boundary",
    "test:node:p4:p4-2a",
    "test:python:p4:p4-2a-boundary",
    "test:node:p4:p4-2b",
    "test:python:p4:p4-2b-boundary",
    "test:node:p4:p4-2c",
    "test:python:p4:p4-2c-boundary",
    "test:node:p4:p4-3",
    "test:python:p4:p4-3-boundary",
    "verify:pages-dist-and-drift",
    "test:node:verification-metadata",
    "test:node:renderer-pass-family-inventory",
    "test:node:visual-effects-pass-owner",
    "test:node:context-pass-orchestrator-owner",
    "test:node:renderer-political-pass-orchestration-preflight",
    "test:node:political-pass-orchestrator-owner",
    "test:python:map-renderer-political-pass-orchestrator-boundary",
    "test:python:map-renderer-render-pipeline-passes-boundary",
    "test:node:render-sample-role-policy",
    "test:node:williams-crossover-governance",
    "test:node:williams-crossover-job-runner",
    "test:node:renderer-draw-canvas-orchestration-inventory",
    "test:node:draw-canvas-orchestration-owner",
    "test:python:map-renderer-draw-canvas-orchestration-boundary",
    "test:node:cached-pass-compositor-owner",
    "test:node:transformed-frame-compositor-owner",
    "test:python:map-renderer-frame-compositor-boundary",
    "test:node:renderer-runtime-context-foundation",
    "test:node:renderer-runtime-context-receiver",
    "test:node:renderer-runtime-context-render-cache",
    "test:node:renderer-runtime-context-projection-viewport",
    "test:node:renderer-runtime-context-viewport-mutation",
    "test:node:renderer-runtime-context-interaction",
    "test:node:renderer-runtime-context-hit-hover",
    "test:node:click-selection-transaction-owner",
    "test:node:renderer-click-selection-transaction-inventory",
    "test:python:map-renderer-render-cache-owner-boundary",
    "test:python:map-renderer-projection-viewport-context-boundary",
    "test:python:map-renderer-viewport-mutation-context-boundary",
    "test:python:map-renderer-interaction-context-boundary",
    "test:python:map-renderer-hit-hover-context-boundary",
    "test:python:map-renderer-click-selection-transaction-boundary",
    "test:node:renderer-viewport-update-owner",
    "test:node:viewport-resize-lifecycle-owner",
    "test:node:map-interaction-event-binding-owner",
    "test:node:render-pass-cache-host-owner-suite",
    "test:node:render-pass-commit-accounting-owner-suite",
    "test:node:hit-canvas-scheduling-owner-suite",
  ]);
  assert.equal(commandRefs(plan).includes("verify:p4:p4-1"), false);
  assert.equal(commandRefs(plan).includes("test:node:zoom-interaction-lifecycle-owner"), false);
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
      "test:node:windows-job-runtime:integration",
      "perf:williams-power-scheme:live-preflight",
      "test:e2e:dev:scenario-chunk-runtime",
      "test:e2e:tno-contracts",
      "test:e2e:water-rendering",
      "test:e2e:city-rendering",
    ],
  );
});

test("default core plan applies strict command closure without changing test coverage", () => {
  const packageScripts = JSON.parse(
    fs.readFileSync("package.json", "utf8"),
  ).scripts;
  const rawPlan = buildCoreVerificationPlan({
    packageScripts,
    applySupersession: false,
  });
  const plan = buildCoreVerificationPlan({ packageScripts });
  const rawLeaves = rawPlan.commandsToRun.flatMap(({ commandRef }) => (
    resolveCommandLeafProcesses(commandRef, packageScripts)
  ));
  const retainedLeaves = plan.commandsToRun.flatMap(({ commandRef }) => (
    resolveCommandLeafProcesses(commandRef, packageScripts)
  ));
  const nodeFiles = (targetPlan) => [...new Set(
    targetPlan.commandsToRun.flatMap(({ commandRef }) => (
      nodeTestFileClosure(commandRef, packageScripts)
    )),
  )].sort();

  assert.equal(rawPlan.commandsToRun.length, 89);
  assert.equal(plan.commandsToRun.length, 82);
  assert.equal(rawLeaves.length, 105);
  assert.equal(retainedLeaves.length, 97);
  assert.equal(rawLeaves.filter((command) => command.startsWith("node --test ")).length, 71);
  assert.equal(retainedLeaves.filter((command) => command.startsWith("node --test ")).length, 63);
  assert.equal(rawLeaves.filter((command) => command.startsWith("node tools/run_python.mjs ")).length, 20);
  assert.equal(retainedLeaves.filter((command) => command.startsWith("node tools/run_python.mjs ")).length, 20);
  assert.deepEqual(nodeFiles(plan), nodeFiles(rawPlan));
  assert.deepEqual(
    plan.supersededCommands.map(({ commandRef }) => commandRef).sort(),
    [
      "test:node:renderer-hit-canvas-scheduling-inventory",
      "test:node:renderer-render-phase-lifecycle",
      "test:node:scenario-apply-transaction-ownership",
      "test:node:scenario-chunk-contracts",
      "test:node:scenario-lifecycle-runtime-behavior",
      "test:node:scenario-runtime-state-behavior",
      "test:node:zoom-interaction-lifecycle-owner",
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
    [
      "test:node:windows-job-runtime:integration",
      "perf:williams-power-scheme:live-preflight",
      "test:e2e:dev:scenario-chunk-runtime",
      "test:e2e:tno-contracts",
      "test:e2e:water-rendering",
      "test:e2e:city-rendering",
    ],
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

test("direct core plan execution injects strict evidence before a Python boundary", () => {
  const commandRef = "test:python:p4:p4-1-boundary";
  const plan = buildCoreVerificationPlan({
    packageScripts: { [commandRef]: "node fake-python-boundary.mjs" },
    groups: [{ id: "custom", title: "Custom", commands: [commandRef] }],
    mainThreadGroup: { id: "main", title: "Main", commands: [] },
    optionalMainThreadCommands: [],
  });
  const calls = [];
  const results = runVerificationPlan(plan, {
    packageScripts: { [commandRef]: "node fake-python-boundary.mjs" },
    platform: "linux",
    stdio: "pipe",
    baseEnv: {},
    stateWriterEvidenceEnsurer: () => fakeStateWriterEvidenceResult({ commandRef }),
    runner(bin, args, options) {
      calls.push({ bin, args, options });
      return { status: 0 };
    },
  });

  assert.equal(results[0].exitCode, 0);
  assert.equal(results[0].externalEvidence.evidenceId, "a".repeat(64));
  assert.equal(calls[0].options.env.STATE_WRITER_POLICY_EVIDENCE_MODE, "strict");
  assert.equal(calls[0].options.env.STATE_WRITER_POLICY_EVIDENCE_ID, "a".repeat(64));
});

test("each direct-plan invocation owns one fallback session across boundaries", () => {
  const commandRefs = [
    "test:python:p4:p4-1-boundary",
    "test:python:p4:p4-2a-boundary",
  ];
  const packageScripts = Object.fromEntries(
    commandRefs.map((commandRef, index) => [
      commandRef,
      `node fake-boundary-${index}.mjs`,
    ]),
  );
  const plan = buildCoreVerificationPlan({
    packageScripts,
    groups: [{ id: "custom", title: "Custom", commands: commandRefs }],
    mainThreadGroup: { id: "main", title: "Main", commands: [] },
    optionalMainThreadCommands: [],
  });
  let producerCount = 0;
  const sessions = [];
  const stateWriterEvidenceEnsurer = ({ producer, liveFallbackSession }) => {
    sessions.push(liveFallbackSession);
    if (liveFallbackSession.liveFallbackAttempts === 0) {
      liveFallbackSession.liveFallbackAttempts += 1;
      producerCount += 1;
    }
    return fakeStateWriterEvidenceResult({ commandRef: producer.commandRef });
  };

  for (let invocation = 0; invocation < 2; invocation += 1) {
    const results = runVerificationPlan(plan, {
      packageScripts,
      platform: "linux",
      stdio: "pipe",
      stateWriterEvidenceEnsurer,
      runner: () => ({ status: 0 }),
    });
    assert.deepEqual(results.map(({ exitCode }) => exitCode), [0, 0]);
  }

  assert.equal(producerCount, 2);
  assert.equal(sessions[0], sessions[1]);
  assert.notEqual(sessions[1], sessions[2]);
  assert.equal(sessions[2], sessions[3]);
});

function cleanIdentity(verificationSha, verificationTreeSha) {
  return {
    verificationSha,
    verificationTreeSha,
    workspaceClean: true,
    trackedClean: true,
    includesUntracked: true,
    workspaceStatus: "",
  };
}

function fakeStateWriterEvidenceResult({
  commandRef = "test:python:p4:p4-1-boundary",
  disposition = "reused-exact",
} = {}) {
  return {
    status: disposition === "produced-live" ? "produced-live" : "reusable-exact",
    disposition,
    evidenceId: "a".repeat(64),
    evidencePath: ".runtime/reports/generated/p4-state-actions/P4.3/state-writer-policy-evidence.json",
    sourceVerificationSha: "b".repeat(40),
    sourceVerificationTreeSha: "c".repeat(40),
    producer: {
      entrypoint: "tools/run_core_verification.mjs",
      commandRef,
      planDigest: "d".repeat(64),
      producedAt: "2026-08-13T00:00:00.000Z",
      disposition: "produced-live",
    },
    evidence: { phase: "P4.3" },
  };
}

function checkpointFor(planIdentity, identity, passedIndexes) {
  const commands = buildCommandStates(planIdentity);
  for (const index of passedIndexes) {
    Object.assign(commands[index], {
      status: "passed",
      exitCode: 0,
      startedAt: "2026-08-13T00:00:00.000Z",
      finishedAt: "2026-08-13T00:00:01.000Z",
      durationMs: 1000,
      verificationIdentityAfter: identity,
      evidenceValidatedForIdentity: identity,
    });
  }
  const allPassed = commands.every((entry) => entry.status === "passed");
  return {
    schemaVersion: RESUMABLE_VERIFICATION_SCHEMA_VERSION,
    kind: RESUMABLE_VERIFICATION_KIND,
    runnerId: planIdentity.runnerId,
    planIdentity,
    verificationIdentity: identity,
    finalVerificationIdentity: allPassed ? identity : null,
    verdict: allPassed ? "pass" : "failed",
    commands,
  };
}

test("resume parsing is explicit and does not expose an arbitrary skip flag", () => {
  assert.deepEqual(parseArgs(["--resume-from", "previous.json"]), {
    list: false,
    includeMainThread: false,
    resume: true,
    resumeFrom: "previous.json",
    jsonOut: path.join(process.cwd(), ".runtime", "reports", "generated", "verify-core.json"),
    mdOut: path.join(process.cwd(), ".runtime", "reports", "generated", "verify-core.md"),
  });
  assert.throws(() => parseArgs(["--skip", "verify:p4:state-writer-policy"]), /Unknown verify:core argument/);
});

test("verification checkpoints atomically replace complete parseable JSON", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-checkpoint-"));
  const reportPath = path.join(root, "nested", "checkpoint.json");
  atomicWriteJsonSync(reportPath, { generation: 1, commands: [{ status: "running" }] });
  atomicWriteJsonSync(reportPath, { generation: 2, commands: [{ status: "passed" }] });

  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), {
    generation: 2,
    commands: [{ status: "passed" }],
  });
  assert.deepEqual(
    fs.readdirSync(path.dirname(reportPath)).filter((entry) => entry.endsWith(".tmp")),
    [],
  );
});

test("same-tree resume reuses every command with durable passed evidence", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [
      { group: "one", commandRef: "first", command: "node first.mjs", commandType: "package-script" },
      { group: "one", commandRef: "second", command: "node second.mjs", commandType: "package-script" },
    ],
  });
  const identity = cleanIdentity("sha-one", "tree-one");
  const checkpoint = checkpointFor(planIdentity, identity, [0]);
  const decision = decideResume({
    checkpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: identity,
    changedFilesReader: () => {
      throw new Error("exact resume must not inspect a diff");
    },
  });
  assert.equal(decision.mode, "exact");
  assert.deepEqual(decision.reusedIndexes, [0]);
});

test("core runner same-tree resume skips its durable passed prefix", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-core-resume-"));
  const jsonOut = path.join(root, "verify-core.json");
  const mdOut = path.join(root, "verify-core.md");
  const identity = cleanIdentity("sha-one", "tree-one");
  let firstCalls = 0;
  const first = runCoreVerification({
    argv: { list: false, includeMainThread: false, resume: false, resumeFrom: null, jsonOut, mdOut },
    packageScripts: PACKAGE_SCRIPTS,
    identityReader: () => identity,
    stdio: "pipe",
    now: (() => {
      let tick = 0;
      return () => new Date(tick++ * 5);
    })(),
    runner() {
      firstCalls += 1;
      return { status: firstCalls === 2 ? 7 : 0 };
    },
  });
  assert.equal(first.exitCode, 7);
  assert.equal(first.report.commands[0].status, "passed");
  assert.equal(first.report.commands[1].status, "failed");

  const resumedCalls = [];
  let resumedProducerCount = 0;
  let resumedFallbackSession = null;
  const resumed = runCoreVerification({
    argv: { list: false, includeMainThread: false, resume: true, resumeFrom: jsonOut, jsonOut, mdOut },
    packageScripts: PACKAGE_SCRIPTS,
    identityReader: () => identity,
    stdio: "pipe",
    now: (() => {
      let tick = 1000;
      return () => new Date(tick++ * 5);
    })(),
    stateWriterEvidenceEnsurer: ({ producer, liveFallbackSession }) => {
      if (resumedFallbackSession === null) {
        resumedFallbackSession = liveFallbackSession;
      } else {
        assert.equal(liveFallbackSession, resumedFallbackSession);
      }
      if (liveFallbackSession.liveFallbackAttempts === 0) {
        liveFallbackSession.liveFallbackAttempts += 1;
        resumedProducerCount += 1;
      }
      return fakeStateWriterEvidenceResult({ commandRef: producer.commandRef });
    },
    runner(bin, args) {
      resumedCalls.push([bin, ...args]);
      return { status: 0 };
    },
  });

  assert.equal(resumed.exitCode, 0);
  assert.equal(resumed.report.resumeDecision.mode, "exact");
  assert.equal(resumed.report.summary.reused, 1);
  assert.equal(resumed.report.commands[0].evidenceDisposition, "reused-exact");
  assert.equal(resumedCalls.length, resumed.plan.commandsToRun.length - 1);
  assert.equal(resumedProducerCount, 1);
});

test("core runner injects strict exact-tree evidence and persists its trace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-core-evidence-"));
  const jsonOut = path.join(root, "verify-core.json");
  const mdOut = path.join(root, "verify-core.md");
  const commandRef = "test:python:p4:p4-1-boundary";
  const identity = cleanIdentity("b".repeat(40), "c".repeat(40));
  const ensured = [];
  const spawns = [];

  const result = runCoreVerification({
    argv: { list: false, includeMainThread: false, resume: false, resumeFrom: null, jsonOut, mdOut },
    packageScripts: { [commandRef]: "node fake-python-boundary.mjs" },
    cwd: root,
    platform: "linux",
    stdio: "pipe",
    identityReader: () => identity,
    baseEnv: { FIXTURE_ENV: "kept" },
    stateWriterEvidenceEnsurer(options) {
      ensured.push(options);
      return fakeStateWriterEvidenceResult({ commandRef });
    },
    runner(bin, args, options) {
      spawns.push({ bin, args, options });
      return { status: 0 };
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(ensured.length, 1);
  assert.equal(ensured[0].producer.commandRef, commandRef);
  assert.deepEqual(ensured[0].routeApplicability.unmatchedChangedFiles, []);
  assert.equal(spawns.length, result.plan.commandsToRun.length);
  const boundarySpawn = spawns.find(({ args }) => args.includes(commandRef));
  assert.equal(boundarySpawn.options.env.FIXTURE_ENV, "kept");
  assert.equal(boundarySpawn.options.env.STATE_WRITER_POLICY_EVIDENCE_MODE, "strict");
  assert.equal(
    boundarySpawn.options.env.STATE_WRITER_POLICY_EVIDENCE_ID,
    "a".repeat(64),
  );
  assert.equal(
    boundarySpawn.options.env.STATE_WRITER_POLICY_EVIDENCE_PATH,
    fakeStateWriterEvidenceResult().evidencePath,
  );
  const command = result.report.commands.find(
    (entry) => entry.commandRef === commandRef,
  );
  assert.equal(command.externalEvidence.evidenceId, "a".repeat(64));
  assert.equal(command.externalEvidence.disposition, "reused-exact");
  const durable = JSON.parse(fs.readFileSync(jsonOut, "utf8"));
  assert.equal(
    durable.commands.find((entry) => entry.commandRef === commandRef)
      .externalEvidence.evidenceId,
    "a".repeat(64),
  );
  assert.match(fs.readFileSync(mdOut, "utf8"), /evidence=a{64}/);
});

test("core runner blocks a boundary before spawn when evidence setup is blocked", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-core-evidence-blocked-"));
  const commandRef = "test:python:p4:p4-1-boundary";
  const spawns = [];
  const blockedError = Object.assign(new Error("workspace dirty"), {
    code: "state-writer-evidence-workspace-dirty",
    disposition: "blocked",
  });
  const result = runCoreVerification({
    argv: {
      list: false,
      includeMainThread: false,
      resume: false,
      resumeFrom: null,
      jsonOut: path.join(root, "verify-core.json"),
      mdOut: path.join(root, "verify-core.md"),
    },
    packageScripts: { [commandRef]: "node fake-python-boundary.mjs" },
    cwd: root,
    platform: "linux",
    stdio: "pipe",
    identityReader: () => cleanIdentity("b".repeat(40), "c".repeat(40)),
    stateWriterEvidenceEnsurer() {
      throw blockedError;
    },
    runner(bin, args) {
      spawns.push([bin, ...args]);
      return { status: 0 };
    },
  });

  assert.equal(result.exitCode, 2);
  assert.equal(
    spawns.some((spawn) => spawn.includes(commandRef)),
    false,
  );
  assert.equal(result.report.failedCommandRef, commandRef);
  const boundary = result.report.commands.find(
    (entry) => entry.commandRef === commandRef,
  );
  assert.equal(
    boundary.externalEvidence.code,
    "state-writer-evidence-workspace-dirty",
  );
  assert.match(boundary.error, /disposition=blocked/);
});

test("changed-tree resume reruns the suffix from the earliest routed command", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [
      { group: "one", commandRef: "verify:alpha", command: "node alpha.mjs", commandType: "package-script" },
      { group: "one", commandRef: "verify:beta", command: "node beta.mjs", commandType: "package-script" },
      { group: "one", commandRef: "verify:gamma", command: "node gamma.mjs", commandType: "package-script" },
    ],
  });
  const checkpoint = checkpointFor(planIdentity, cleanIdentity("sha-one", "tree-one"), [0, 1]);
  const decision = decideResume({
    checkpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: cleanIdentity("sha-two", "tree-two"),
    changedFilesReader: () => ["js/alpha.js"],
    selector: () => ({
      unmatchedChangedFiles: [],
      matchedByFile: [{
        changedFile: "js/alpha.js",
        recommendedCommands: [{ commandRef: "verify:alpha" }],
      }],
    }),
  });
  assert.equal(decision.mode, "sf-ats");
  assert.equal(decision.resumeIndex, 0);
  assert.deepEqual(decision.reusedIndexes, []);
  assert.deepEqual(decision.invalidatedCommandRefs, ["verify:alpha"]);
});

test("cross-revision reused evidence remains bound across repeated exact resumes", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [
      { group: "one", commandRef: "verify:alpha", command: "node alpha.mjs" },
      { group: "one", commandRef: "verify:beta", command: "node beta.mjs" },
      { group: "one", commandRef: "verify:gamma", command: "node gamma.mjs" },
    ],
  });
  const oldIdentity = cleanIdentity("sha-old", "tree-old");
  const currentIdentity = cleanIdentity("sha-current", "tree-current");
  const oldCheckpoint = checkpointFor(planIdentity, oldIdentity, [0]);
  const crossRevision = decideResume({
    checkpoint: oldCheckpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: currentIdentity,
    changedFilesReader: () => ["js/beta.js"],
    selector: () => ({
      unmatchedChangedFiles: [],
      matchedByFile: [{
        changedFile: "js/beta.js",
        recommendedCommands: [{ commandRef: "verify:beta" }],
      }],
    }),
  });
  assert.deepEqual(crossRevision.reusedIndexes, [0]);
  const currentCommands = buildCommandStates(planIdentity, {
    checkpoint: oldCheckpoint,
    resumeDecision: crossRevision,
    verificationIdentity: currentIdentity,
  });
  Object.assign(currentCommands[1], {
    status: "failed",
    exitCode: 7,
    startedAt: "2026-08-13T00:01:00.000Z",
    finishedAt: "2026-08-13T00:01:01.000Z",
    durationMs: 1000,
    verificationIdentityAfter: currentIdentity,
    evidenceValidatedForIdentity: currentIdentity,
  });
  const currentCheckpoint = {
    schemaVersion: RESUMABLE_VERIFICATION_SCHEMA_VERSION,
    kind: RESUMABLE_VERIFICATION_KIND,
    runnerId: planIdentity.runnerId,
    planIdentity,
    verificationIdentity: currentIdentity,
    finalVerificationIdentity: null,
    verdict: "failed",
    commands: currentCommands,
  };
  const secondResume = decideResume({
    checkpoint: currentCheckpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: currentIdentity,
    changedFilesReader: () => {
      throw new Error("second exact resume must not inspect a diff");
    },
  });
  assert.equal(secondResume.mode, "exact");
  assert.deepEqual(secondResume.reusedIndexes, [0]);
  assert.equal(secondResume.resumeIndex, 1);
  assert.deepEqual(currentCommands[0].verificationIdentityAfter, oldIdentity);
  assert.deepEqual(currentCommands[0].evidenceValidatedForIdentity, currentIdentity);

  const secondCommands = buildCommandStates(planIdentity, {
    checkpoint: currentCheckpoint,
    resumeDecision: secondResume,
    verificationIdentity: currentIdentity,
  });
  Object.assign(secondCommands[1], {
    status: "failed",
    exitCode: 7,
    startedAt: "2026-08-13T00:02:00.000Z",
    finishedAt: "2026-08-13T00:02:01.000Z",
    durationMs: 1000,
    verificationIdentityAfter: currentIdentity,
    evidenceValidatedForIdentity: currentIdentity,
  });
  const secondCheckpoint = {
    ...currentCheckpoint,
    commands: secondCommands,
  };
  const thirdResume = decideResume({
    checkpoint: secondCheckpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: currentIdentity,
    changedFilesReader: () => {
      throw new Error("third exact resume must not inspect a diff");
    },
  });
  assert.deepEqual(thirdResume.reusedIndexes, [0]);
  assert.equal(secondCommands[0].evidenceDisposition, "reused-after-sf-ats");
  assert.equal(secondCommands[0].lastReuseMode, "reused-exact");
  assert.equal(secondCommands[0].sourceVerificationSha, oldIdentity.verificationSha);
});

test("revision drift without path changes and non-contiguous evidence fail closed", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [
      { group: "one", commandRef: "verify:alpha", command: "node alpha.mjs" },
      { group: "one", commandRef: "verify:beta", command: "node beta.mjs" },
    ],
  });
  const checkpoint = checkpointFor(planIdentity, cleanIdentity("sha-one", "tree-one"), [0]);
  const revisionOnly = decideResume({
    checkpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: cleanIdentity("sha-two", "tree-one"),
    changedFilesReader: () => [],
  });
  assert.equal(revisionOnly.resumeIndex, 0);
  assert.deepEqual(revisionOnly.reusedIndexes, []);
  assert.deepEqual(revisionOnly.reasonCodes, ["revision-drift-without-path-change"]);

  const invalid = checkpointFor(planIdentity, cleanIdentity("sha-one", "tree-one"), [1]);
  assert.throws(() => decideResume({
    checkpoint: invalid,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: cleanIdentity("sha-one", "tree-one"),
    changedFilesReader: () => [],
  }), /non-contiguous passed command/);
});

test("resume rejects passed evidence with command or final identity drift", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [
      { group: "one", commandRef: "verify:alpha", command: "node alpha.mjs" },
      { group: "one", commandRef: "verify:beta", command: "node beta.mjs" },
    ],
  });
  const identity = cleanIdentity("sha-one", "tree-one");
  const commandDrift = checkpointFor(planIdentity, identity, [0]);
  commandDrift.commands[0].verificationIdentityAfter = cleanIdentity("sha-one", "tree-drifted");
  assert.throws(() => decideResume({
    checkpoint: commandDrift,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: identity,
    changedFilesReader: () => [],
  }), /drifted execution evidence/);

  const finalDrift = checkpointFor(planIdentity, identity, [0, 1]);
  finalDrift.verdict = "failed";
  finalDrift.finalVerificationIdentity = cleanIdentity("sha-one", "tree-drifted");
  assert.throws(() => decideResume({
    checkpoint: finalDrift,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: identity,
    changedFilesReader: () => [],
  }), /no valid final pass identity/);
});

test("dirty and unmatched changed workspaces block resume before execution", () => {
  const planIdentity = buildPlanIdentity({
    runnerId: "verify-core",
    entries: [{ group: "one", commandRef: "verify:alpha", command: "node alpha.mjs" }],
  });
  const checkpoint = checkpointFor(planIdentity, cleanIdentity("sha-one", "tree-one"), [0]);
  const dirty = decideResume({
    checkpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: { ...cleanIdentity("sha-two", "tree-two"), workspaceClean: false },
    changedFilesReader: () => [],
  });
  assert.equal(dirty.blockReason, "workspace-dirty");

  const unmatched = decideResume({
    checkpoint,
    runnerId: "verify-core",
    planIdentity,
    verificationIdentity: cleanIdentity("sha-two", "tree-two"),
    changedFilesReader: () => ["unknown.file"],
    selector: () => ({ unmatchedChangedFiles: ["unknown.file"], matchedByFile: [] }),
  });
  assert.equal(unmatched.blockReason, "unmatched-changed-files");
  assert.deepEqual(unmatched.reusedIndexes, []);
});

test("adaptive command supersession removes covered TNO and Pages commands", () => {
  const commands = collapseSupersededCommands([
    "verify:scenario-contracts:strict",
    "verify:tno-coverage-ledger",
    "verify:tno-atlantropa-coverage",
    "verify:tno-polar-coverage",
    "test:node:scenario-chunk-contracts",
    "verify:tno-coverage-chain",
    "verify:dist-drift",
    "verify:pages-dist",
    "verify:pages-dist-and-drift",
    "verify:unrelated",
  ]);
  assert.deepEqual(commands, [
    "verify:tno-coverage-chain",
    "verify:pages-dist-and-drift",
    "verify:unrelated",
  ]);

  const plan = buildExecutionPlan({
    childAgentStaticTasks: [
      { commandRef: "verify:tno-coverage-ledger" },
      { commandRef: "verify:tno-coverage-chain" },
    ],
    mainThreadSerialVerification: [],
  });
  assert.deepEqual(plan.commandsToRun, ["verify:tno-coverage-chain"]);
  assert.deepEqual(plan.supersededCommands, [{
    commandRef: "verify:tno-coverage-ledger",
    supersededBy: "verify:tno-coverage-chain",
  }]);
});

test("command supersession preserves current policy evidence beside historical exact phases", () => {
  assert.deepEqual(collapseSupersededCommands([
    "verify:p4:p4-2b",
    "verify:p4:state-writer-policy",
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
  ]), [
    "verify:p4:p4-2b",
    "verify:p4:state-writer-policy",
  ]);
  assert.deepEqual(collapseSupersededCommands([
    "verify:p4:p4-3",
    "verify:p4:state-writer-policy",
    "test:node:p4:state-writer-policy",
  ]), ["verify:p4:p4-3"]);
});

const STRICT_COMMAND_CLOSURE_SUPERSESSION = Object.freeze({
  "verify:supervisor-contracts": Object.freeze([
    "test:node:supervisor-contracts",
    "test:node:supervisor-routing",
  ]),
  "verify:supervisor-plan": Object.freeze([
    "test:node:supervisor-plan",
  ]),
  "test:node:p4:p4-2a": Object.freeze([
    "test:node:scenario-apply-transaction-ownership",
    "test:node:scenario-lifecycle-runtime-behavior",
    "test:node:scenario-runtime-state-behavior",
  ]),
  "test:node:p4:p4-2b": Object.freeze([
    "test:node:scenario-chunk-contracts",
  ]),
  "test:node:p4:p4-3": Object.freeze([
    "test:node:renderer-render-phase-lifecycle",
    "test:node:zoom-interaction-lifecycle-owner",
  ]),
  "test:node:hit-canvas-scheduling-owner-suite": Object.freeze([
    "test:node:renderer-hit-canvas-scheduling-inventory",
  ]),
});

function resolveCommandLeafProcesses(commandRef, packageScripts, seen = new Set()) {
  if (seen.has(commandRef)) return [];
  const command = packageScripts[commandRef] || commandRef;
  const nextSeen = new Set(seen).add(commandRef);
  return String(command)
    .split(/\s*&&\s*/)
    .flatMap((part) => {
      const npmRun = part.trim().match(/^npm run(?: -s)? ([A-Za-z0-9:_-]+)(.*)$/);
      return npmRun && packageScripts[npmRun[1]] && !nextSeen.has(npmRun[1])
        ? resolveCommandLeafProcesses(
          `${packageScripts[npmRun[1]]}${npmRun[2]}`,
          packageScripts,
          new Set(nextSeen).add(npmRun[1]),
        )
        : [part.trim()];
    });
}

function nodeTestFileClosure(commandRef, packageScripts) {
  return [...new Set(
    resolveCommandLeafProcesses(commandRef, packageScripts)
      .flatMap((command) => (
        [...command.matchAll(/tests\/[A-Za-z0-9_./-]+\.(?:test\.mjs|node\.test\.mjs)/g)]
          .map((match) => match[0])
      )),
  )].sort();
}

test("strict command supersession declares every approved aggregate mapping", () => {
  for (const [superseder, coveredCommands] of Object.entries(
    STRICT_COMMAND_CLOSURE_SUPERSESSION,
  )) {
    assert.deepEqual(
      collapseSupersededCommands([superseder, ...coveredCommands]),
      [superseder],
      superseder,
    );
    for (const coveredCommand of coveredCommands) {
      assert.deepEqual(
        collapseSupersededCommands([coveredCommand]),
        [coveredCommand],
        `${coveredCommand} remains reachable by itself`,
      );
    }
  }
});

test("command supersession preserves retained order and reports the retained aggregate", () => {
  assert.deepEqual(
    buildCommandSupersessionPlan([
      "before",
      "test:node:p4:state-writer-policy",
      "verify:p4:state-writer-policy",
      "verify:p4:p4-3",
      "after",
    ]),
    {
      commandRefs: ["before", "verify:p4:p4-3", "after"],
      supersededCommands: [
        {
          commandRef: "test:node:p4:state-writer-policy",
          supersededBy: "verify:p4:p4-3",
        },
        {
          commandRef: "verify:p4:state-writer-policy",
          supersededBy: "verify:p4:p4-3",
        },
      ],
    },
  );
});

test("command supersession resolves direct provenance to a retained root", () => {
  assert.deepEqual(
    buildCommandSupersessionPlan(["A", "B"], {
      supersession: { A: ["B"] },
    }),
    {
      commandRefs: ["A"],
      supersededCommands: [{ commandRef: "B", supersededBy: "A" }],
    },
  );
});

test("command supersession resolves recursive provenance to the retained root", () => {
  assert.deepEqual(
    buildCommandSupersessionPlan(["A", "B", "C"], {
      supersession: { A: ["B"], B: ["C"] },
    }),
    {
      commandRefs: ["A"],
      supersededCommands: [
        { commandRef: "B", supersededBy: "A" },
        { commandRef: "C", supersededBy: "A" },
      ],
    },
  );
});

test("command supersession rejects a selected self-cycle", () => {
  assert.throws(
    () => buildCommandSupersessionPlan(["A"], {
      supersession: { A: ["A"] },
    }),
    (error) => {
      assert.equal(error.code, "command-supersession-cycle");
      assert.deepEqual(error.nodes, ["A"]);
      assert.equal(error.message, "command-supersession-cycle:A");
      return true;
    },
  );
});

test("command supersession rejects a selected multi-node cycle deterministically", () => {
  assert.throws(
    () => collapseSupersededCommands(["B", "A"], {
      supersession: { A: ["B"], B: ["A"] },
    }),
    (error) => {
      assert.equal(error.code, "command-supersession-cycle");
      assert.deepEqual(error.nodes, ["A", "B"]);
      assert.equal(error.message, "command-supersession-cycle:A,B");
      return true;
    },
  );
});

test("strict command supersession preserves the complete Node test-file closure", () => {
  const packageScripts = JSON.parse(
    fs.readFileSync("package.json", "utf8"),
  ).scripts;
  for (const [superseder, coveredCommands] of Object.entries(
    STRICT_COMMAND_CLOSURE_SUPERSESSION,
  )) {
    const supersederFiles = new Set(
      nodeTestFileClosure(superseder, packageScripts),
    );
    for (const coveredCommand of coveredCommands) {
      const coveredFiles = nodeTestFileClosure(coveredCommand, packageScripts);
      assert.ok(coveredFiles.length > 0, coveredCommand);
      assert.deepEqual(
        coveredFiles.filter((testFile) => !supersederFiles.has(testFile)),
        [],
        `${superseder} must cover ${coveredCommand}`,
      );
    }
  }
});

test("Pages checked gate keeps generation compatibility and performs one build", () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).scripts;
  const generation = scripts["verify:pages-dist"];
  const checked = scripts["verify:pages-dist-and-drift"];
  assert.equal((generation.match(/tools\/build_pages_dist\.py/g) || []).length, 1);
  assert.equal((checked.match(/tools\/build_pages_dist\.py/g) || []).length, 1);
  for (const contract of [
    "tests.test_pages_dist_startup_shell",
    "test:node:landing-showcase-view",
    "test:node:sample-project-contracts",
  ]) {
    assert.match(generation, new RegExp(contract.replaceAll(":", "\\:")));
    assert.match(checked, new RegExp(contract.replaceAll(":", "\\:")));
  }
  assert.equal(generation.includes("git diff --exit-code"), false);
  assert.equal(checked.includes("git diff --exit-code"), true);
});

test("adaptive command supersession keeps the exact P4.3 gate as the complete heavy lane", () => {
  const commands = collapseSupersededCommands([
    "test:node:p4:p4-3",
    "test:python:p4:p4-3-boundary",
    "test:node:p4:state-writer-policy:quick",
    "test:node:p4:state-writer-policy",
    "verify:p4:state-writer-policy",
    "verify:p4:p4-3",
  ]);

  assert.deepEqual(commands, ["verify:p4:p4-3"]);
});

test("adaptive child-safe execution substitutes quick coverage for the full P4 policy lane", () => {
  const report = buildRecommendation(["tools/run_p4_state_writer_policy_tests.mjs"]);
  const childSafePlan = buildExecutionPlan(report);
  assert.ok(childSafePlan.commandsToRun.includes("test:node:p4:state-writer-policy:quick"));
  assert.equal(childSafePlan.commandsToRun.includes("test:node:p4:state-writer-policy"), false);
  assert.ok(childSafePlan.mainThreadCommands.includes("test:node:p4:state-writer-policy"));
  assert.ok(childSafePlan.blockedMainThreadCommands.includes("verify:p4:state-writer-policy"));

  const mainThreadPlan = buildExecutionPlan(report, { includeMainThread: true });
  assert.equal(mainThreadPlan.commandsToRun.includes("test:node:p4:state-writer-policy"), false);
  assert.equal(mainThreadPlan.commandsToRun.includes("test:node:p4:state-writer-policy:quick"), false);
  assert.ok(mainThreadPlan.commandsToRun.some((commandRef) => (
    commandRef === "verify:p4:state-writer-policy" || commandRef === "verify:p4:p4-3"
  )));
});

test("verification portfolio exposes four canonical entrypoints with full policy in deep lanes", () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).scripts;
  assert.match(scripts["verify:pr"], /verify:script-portfolio/);
  assert.match(scripts["verify:pr"], /select_verification_targets\.mjs --check/);
  assert.match(scripts["verify:pr"], /tests\.test_e2e_structural_tooling/);
  assert.match(scripts["verify:pr"], /verify:scenario-contracts:strict/);
  assert.match(scripts["verify:pr"], /run_adaptive_tests\.mjs --execute --defer-main-thread --history-base origin\/main/);
  assert.equal(
    scripts["verify:demo"],
    "node node_modules/@playwright/test/cli.js test tests/e2e/sample_guide_deeplink.spec.js --grep @golden-demo --workers=1 --retries=0",
  );
  assert.match(scripts["verify:nightly"], /^npm run verify:core\b/);
  assert.match(scripts["verify:nightly"], /unittest discover/);
  assert.match(scripts["verify:nightly"], /npm run test:e2e:sample-guide/);
  assert.match(scripts["verify:release"], /^npm run verify:core:main-thread\b/);
  assert.match(scripts["verify:release"], /npm run verify:demo/);
  assert.match(scripts["verify:release"], /npm run test:e2e:pages-public-release-gate/);

  const nightlyPlan = buildCoreVerificationPlan({ packageScripts: scripts });
  const releasePlan = buildCoreVerificationPlan({ packageScripts: scripts, includeMainThread: true });
  for (const plan of [nightlyPlan, releasePlan]) {
    assert.ok(plan.commandsToRun.some((entry) => entry.commandRef === "verify:p4:state-writer-policy"));
    assert.ok(plan.commandsToRun.some((entry) => entry.commandRef === "verify:pages-dist-and-drift"));
  }
});

test("adaptive history discovery requires its exact base and rejects last-commit fallback", () => {
  assert.deepEqual(parseAdaptiveArgs(["--execute", "--history-base", "origin/main"]), {
    changedFiles: [],
    dryRun: false,
    includeBranchHistory: true,
    historyBase: "origin/main",
    includeMainThread: false,
    deferMainThread: false,
    jsonOut: path.join(process.cwd(), ".runtime", "reports", "generated", "test-adaptive-selection.json"),
    mdOut: path.join(process.cwd(), ".runtime", "reports", "generated", "test-adaptive-selection.md"),
  });
  assert.throws(() => parseAdaptiveArgs(["--history-base", ""]), /requires a non-empty Git revision/);

  const calls = [];
  const rejectedBroadHistory = (args) => {
    const joined = args.join(" ");
    calls.push(joined);
    if (joined.includes("origin/main...HEAD")) return { status: 9, stdout: "" };
    if (joined.includes("HEAD^ HEAD")) return { status: 0, stdout: "package.json\0" };
    return { status: 0, stdout: "" };
  };
  assert.throws(
    () => discoverChangedFiles({ runner: (_bin, args) => rejectedBroadHistory(args), includeBranchHistory: true }),
    /adaptive-history-discovery-failed:all-fallbacks/,
  );
  assert.equal(calls.some((entry) => entry.includes("HEAD^ HEAD")), false);
  assert.throws(
    () => discoverChangedFiles({
      runner: (_bin, args) => args.join(" ").includes("origin/main HEAD")
        ? { status: 7, stdout: "" }
        : { status: 0, stdout: "" },
      historyBase: "origin/main",
    }),
    /adaptive-history-discovery-failed:origin\/main/,
  );
  assert.doesNotThrow(() => assertAdaptiveExecutionInput([], { dryRun: true }));
  assert.throws(
    () => assertAdaptiveExecutionInput([], { dryRun: false }),
    /adaptive-execution-empty-changed-files/,
  );
});

test("adaptive execution reconciles duplicate route safety metadata before PR execution", () => {
  const report = buildRecommendation(["tools/verification/verification_domains.mjs"]);
  const telemetryCommand = "test:node:williams-crossover-telemetry-live";
  const telemetryEntry = report.recommendedCommands.find((entry) => entry.commandRef === telemetryCommand);
  assert.ok(telemetryEntry);
  assert.deepEqual(telemetryEntry.executionOwners, ["child-safe", "main-thread"]);
  assert.deepEqual(telemetryEntry.ciProfiles, ["perf-pr-gate", "pr-fast"]);
  assert.deepEqual(telemetryEntry.resourceLocks, ["perf-dev-server"]);
  assert.ok(telemetryEntry.safetyContributorRouteIds.length > telemetryEntry.routeIds.length);
  assert.ok(telemetryEntry.safetyContributorRouteIds.includes("node:test:node:williams-crossover-telemetry-live"));
  assert.ok(telemetryEntry.safetyContributorRouteIds.includes("perf:williams-crossover-telemetry-live"));

  const executionPlan = buildExecutionPlan(report);
  assert.equal(executionPlan.commandsToRun.includes(telemetryCommand), false);
  assert.ok(executionPlan.blockedMainThreadCommands.includes(telemetryCommand));
});

test("adaptive execution owner precedence classifies every mixed owner set", () => {
  assert.equal(classifyExecutionOwners(["child-safe"]), "child-safe");
  assert.equal(classifyExecutionOwners(["child-safe", "main-thread"]), "main-thread");
  assert.equal(classifyExecutionOwners(["child-safe", "ci-only"]), "ci-only");
  assert.equal(classifyExecutionOwners(["main-thread", "ci-only"]), "ci-only");
  assert.equal(classifyExecutionOwners(["child-safe", "main-thread", "ci-only"]), "ci-only");
  assert.equal(classifyExecutionOwners([]), "blocked");
});

test("adaptive execution checkpoints running and terminal results with timings", () => {
  const checkpoints = [];
  const calls = [];
  const results = executeAdaptivePlan({
    commandsToRun: ["node first.mjs", "node second.mjs"],
  }, {
    cwd: process.cwd(),
    now: (() => {
      let tick = 0;
      return () => new Date(tick++ * 25);
    })(),
    runner(bin, args) {
      calls.push([bin, ...args]);
      return { status: calls.length === 1 ? 0 : 7 };
    },
    onCheckpoint(entries) {
      checkpoints.push(structuredClone(entries));
    },
  });
  assert.equal(checkpoints.length, 4);
  assert.equal(checkpoints[0][0].status, "running");
  assert.equal(checkpoints[1][0].status, "passed");
  assert.equal(checkpoints[3][1].status, "failed");
  assert.deepEqual(results.map((entry) => entry.durationMs), [25, 25]);
  assert.deepEqual(results.map((entry) => entry.exitCode), [0, 7]);
});
