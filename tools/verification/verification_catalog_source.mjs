import { createHash } from "node:crypto";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values, field) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) {
    throw new Error(`verification-metadata-source-duplicate-array-value:${field}:${[...new Set(duplicates)].sort(compareText).join(",")}`);
  }
  return [...values].sort(compareText);
}

const RECORD_SET_FIELDS = Object.freeze([
  "sourceRefs",
  "ownerHints",
  "domains",
  "tiers",
  "resourceLocks",
  "executionOwners",
  "profiles",
  "platforms",
]);

export function normalizeVerificationMetadataSource(source) {
  const normalized = structuredClone(source);
  const recordIds = new Set();
  for (const record of normalized.records || []) {
    if (recordIds.has(record.id)) {
      throw new Error(`verification-metadata-source-duplicate-record:${record.id}`);
    }
    recordIds.add(record.id);
    for (const field of RECORD_SET_FIELDS) {
      if (!Array.isArray(record[field])) {
        throw new Error(`verification-metadata-source-invalid-array:${record.id}:${field}`);
      }
      record[field] = sortedUnique(record[field], `${record.id}.${field}`);
    }
  }
  normalized.records.sort((left, right) => compareText(left.id, right.id));
  for (const [superseder, superseded] of Object.entries(normalized.supersession || {})) {
    normalized.supersession[superseder] = sortedUnique(superseded, `supersession.${superseder}`);
  }
  for (const [index, policy] of (normalized.entrypointPolicies || []).entries()) {
    policy.eligibleEntrypoints = sortedUnique(policy.eligibleEntrypoints, `entrypointPolicies.${index}.eligibleEntrypoints`);
  }
  return normalized;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function verificationMetadataSourceDigest(source) {
  const normalized = normalizeVerificationMetadataSource(source);
  return createHash("sha256").update(stableJson(normalized)).digest("hex");
}

// This is the only manually maintained verification metadata surface.
// Legacy package/route/domain projections remain readable only for shadow equality checks.
const AUTHORED_VERIFICATION_METADATA = {
  "schemaVersion": 1,
  "kind": "verification-metadata-source",
  "packageScripts": {
    "test:node:city-lights-assets": "node --test tests/city_lights_asset_contract.test.mjs",
    "test:node:city-lights-render-owner": "node --test tests/city_lights_render_owner_behavior.test.mjs",
    "test:node:modern-city-lights-owner": "npm run test:node:city-lights-render-owner",
    "test:node:day-night-runtime-owner": "node --test tests/day_night_runtime_owner_behavior.test.mjs",
    "test:node:data-service-runtime": "node --test tests/data_service_runtime_behavior.test.mjs",
    "test:node:intensity-field": "node --test tests/intensity_field.node.test.mjs",
    "test:node:intensity-field-mask": "node --test tests/intensity_field_mask_owner.node.test.mjs",
    "test:node:ocean-depth-layer-contracts": "node --test tests/ocean_depth_layer_contracts.test.mjs",
    "test:node:ocean-render-owner": "node --test tests/ocean_render_owner_behavior.test.mjs",
    "test:node:city-points-render-owner": "node --test tests/city_points_render_owner_behavior.test.mjs tests/urban_city_policy_strategic_values_behavior.test.mjs",
    "test:python:map-renderer-city-points-boundary": "npm run python -- -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_city_label_owner_boundary_contract -q",
    "test:node:appearance-city-points-owner": "node --test tests/appearance_city_points_owner_behavior.test.mjs",
    "test:node:appearance-border-owner": "node --test tests/appearance_border_owner_behavior.test.mjs",
    "test:node:appearance-parent-border-owner": "node --test tests/appearance_parent_border_owner_behavior.test.mjs",
    "test:node:appearance-physical-owner": "node --test tests/appearance_physical_owner_behavior.test.mjs",
    "test:node:appearance-presets": "node --test tests/appearance_preset_state.node.test.mjs tests/appearance_presets_owner_behavior.test.mjs tests/appearance_preset_history.node.test.mjs",
    "test:node:appearance-transport-change-set": "node --test tests/appearance_transport_change_set_contract_behavior.test.mjs tests/appearance_transport_operation_behavior.test.mjs",
    "test:node:appearance-reference-owner": "node --test tests/appearance_reference_owner_behavior.test.mjs",
    "test:node:appearance-rivers-owner": "node --test tests/appearance_rivers_owner_behavior.test.mjs",
    "test:node:appearance-texture-owner": "node --test tests/appearance_texture_owner_behavior.test.mjs",
    "test:node:layer-panel-contracts": "node --test tests/layer_panel_contracts_behavior.test.mjs",
    "test:node:layer-status-diagnostics": "node --test tests/layer_status_diagnostics_behavior.test.mjs",
    "test:node:thematic-layer-catalog": "node --test tests/thematic_layer_catalog_behavior.test.mjs tests/thematic_layer_preview_controller_behavior.test.mjs",
    "test:node:thematic-admin-metrics-loader": "node --test tests/thematic_admin_metrics_loader_behavior.test.mjs",
    "test:node:toolbar-render-scheduler": "node --test tests/toolbar_render_scheduler_behavior.test.mjs",
    "test:node:post-ready-scheduler": "node --test tests/post_ready_scheduler_behavior.test.mjs tests/main_post_ready_scheduler_boundary.test.mjs",
    "test:node:main-runtime-diagnostics": "node --test tests/main_runtime_diagnostics_behavior.test.mjs tests/main_runtime_diagnostics_boundary.test.mjs",
    "test:node:render-runtime-binding": "node --test tests/render_runtime_binding_behavior.test.mjs tests/main_render_runtime_binding_boundary.test.mjs",
    "test:node:startup-failure-recovery": "node --test tests/startup_failure_recovery_behavior.test.mjs tests/main_startup_failure_recovery_boundary.test.mjs",
    "test:node:ui-shell-boot": "node --test tests/ui_shell_boot_behavior.test.mjs tests/main_ui_shell_boot_boundary.test.mjs",
    "test:node:deferred-bootstrap": "node --test tests/deferred_vendor_loader_behavior.test.mjs tests/deferred_ui_bootstrap_behavior.test.mjs tests/main_deferred_bootstrap_boundary.test.mjs",
    "test:node:main-bootstrap-wiring": "node --test tests/main_bootstrap_wiring_boundary.test.mjs",
    "test:node:startup-ready-handoff": "node --test tests/startup_ready_handoff_behavior.test.mjs tests/main_startup_ready_handoff_boundary.test.mjs",
    "python": "node tools/run_python.mjs",
    "test:node:backend-cloud-support": "node --test tests/backend_client_behavior.test.mjs tests/project_support_diagnostics_controller_behavior.test.mjs tests/backend_console_helpers.test.mjs",
    "test:node:backend-console-helpers": "node --test tests/backend_console_helpers.test.mjs",
    "start:backend-preview": "npm run python -- tools/dev_server.py /backend/",
    "verify:backend-preview": "npm run test:py:backend-cloud-support && node --test tests/backend_client_behavior.test.mjs tests/backend_console_helpers.test.mjs && node --check backend/app.js backend/backend_console_helpers.js js/api/backend_client.js tools/run_python.mjs",
    "test:node:transport-appearance-controller": "node --test tests/transport_appearance_controller_behavior.test.mjs",
    "test:node:transport-facility-render-owner": "node --test tests/transport_facility_render_owner_behavior.test.mjs",
    "test:node:transport-workbench-controller": "npm run test:node:transport-workbench-event-owner && npm run test:node:transport-workbench-shell-owner",
    "test:node:transport-workbench-event-owner": "node --test tests/transport_workbench_event_owner_behavior.test.mjs",
    "test:node:transport-workbench-shell-owner": "node --test tests/transport_workbench_shell_owner_behavior.test.mjs",
    "test:node:transport-workbench-inspector-owner": "node --test tests/transport_workbench_inspector_owner_behavior.test.mjs",
    "test:node:transport-workbench-layer-order-owner": "node --test tests/transport_workbench_layer_order_owner_behavior.test.mjs",
    "test:node:transport-workbench-lens-owner": "node --test tests/transport_workbench_lens_owner_behavior.test.mjs",
    "test:node:transport-workbench-popover-owner": "node --test tests/transport_workbench_popover_owner_behavior.test.mjs",
    "test:node:transport-workbench-preview-lifecycle-owner": "node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_line_runtime_shared_behavior.test.mjs tests/transport_workbench_road_preview_runtime_behavior.test.mjs tests/transport_workbench_rail_preview_runtime_behavior.test.mjs",
    "test:node:transport-workbench-right-deck-owner": "node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs",
    "test:node:transport-workbench-state-owner": "node --test tests/transport_workbench_state_owner_behavior.test.mjs",
    "test:py:backend-cloud-support": "npm run python -- -m unittest tests.test_backend_service tests.test_backend_routes -q",
    "start:ui-shell": "npm run python -- tools/dev_server.py \"/app/?ui_shell=1&startup_interaction=full&startup_worker=0&startup_cache=0\"",
    "build:transport-workbench-carrier": "npm run python -- tools/build_transport_workbench_japan_carrier.py",
    "build:transport-workbench-japan-roads": "npm run python -- tools/build_transport_workbench_japan_roads.py",
    "build:transport-workbench-japan-rail": "npm run python -- tools/build_transport_workbench_japan_rail.py",
    "build:transport-workbench-japan-airports": "npm run python -- tools/build_transport_workbench_japan_airports.py",
    "build:transport-workbench-japan-ports": "npm run python -- tools/build_transport_workbench_japan_ports.py",
    "playwright:install": "playwright install",
    "playwright:install:chromium": "playwright install --with-deps chromium",
    "verify:ui-contract-foundation": "npm run python -- -m unittest tests/test_ui_rework_plan01_foundation_contract.py",
    "verify:toolbar-split-boundary": "npm run python -- -m unittest tests.test_toolbar_split_boundary_contract -q",
    "verify:state-write-allowlist": "node tools/check_state_write_allowlist.mjs",
    "test:node:p4:state-writer-policy": "node tools/run_p4_state_writer_policy_tests.mjs",
    "test:node:p4:state-writer-policy:quick": "node tools/run_p4_state_writer_policy_tests.mjs --quick",
    "verify:p4:state-writer-policy": "npm run test:node:p4:state-writer-policy && node tools/check_state_writer_policy.mjs",
    "test:python:p4:state-write-boundary": "node tools/run_p4_state_write_boundary.mjs",
    "test:node:p4:phase-verification-runner": "node --test tests/p4_phase_verification_runner_behavior.test.mjs",
    "test:node:p4:p4-1": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/boot_actions_behavior.test.mjs tests/startup_boot_overlay_behavior.test.mjs tests/startup_bootstrap_support_behavior.test.mjs tests/post_ready_scheduler_behavior.test.mjs tests/ui_shell_boot_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/sample_project_contracts.test.mjs tests/state_writer_scanner_soundness_behavior.test.mjs",
    "test:python:p4:p4-1-boundary": "npm run python -- -m unittest tests.test_boot_state_actions_boundary_contract tests.test_state_split_boundary_contract tests.test_state_write_guardrail_contract -q",
    "verify:p4:p4-1": "node tools/run_p4_phase_verification.mjs --phase P4.1",
    "test:node:scenario-state-actions-atomicity": "node --test tests/scenario_state_actions_atomicity_behavior.test.mjs",
    "test:node:p4:p4-2a": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs tests/scenario_apply_transaction_ownership.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs",
    "test:python:p4:p4-2a-boundary": "npm run python -- -m unittest tests.test_scenario_state_actions_boundary_contract tests.test_scenario_manager_boundary_contract tests.test_scenario_resources_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_scenario_lifecycle_runtime_boundary_contract tests.test_state_write_guardrail_contract -q",
    "verify:p4:p4-2a": "node tools/run_p4_phase_verification.mjs --phase P4.2a",
    "test:node:p4:p4-2b": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_chunk_state_actions_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/scenario_refresh_plans_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs",
    "test:python:p4:p4-2b-boundary": "npm run python -- -m unittest tests.test_scenario_chunk_state_actions_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_manager_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_state_write_guardrail_contract -q",
    "verify:p4:p4-2b": "node tools/run_p4_phase_verification.mjs --phase P4.2b",
    "test:node:p4:p4-2c": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/scenario_health_actions_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_state_actions_atomicity_behavior.test.mjs tests/scenario_transaction_rollback_actions_behavior.test.mjs",
    "test:python:p4:p4-2c-boundary": "npm run python -- -m unittest tests.test_scenario_health_actions_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_scenario_data_health_boundary_contract tests.test_scenario_presentation_runtime_boundary_contract tests.test_scenario_lifecycle_runtime_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_scenario_runtime_state_boundary_contract tests.test_scenario_state_actions_boundary_contract tests.test_state_write_guardrail_contract -q",
    "verify:p4:p4-2c": "node tools/run_p4_phase_verification.mjs --phase P4.2c",
    "test:node:p4:p4-3": "node --test tests/p4_phase_verification_runner_behavior.test.mjs tests/state_action_delegation_edges_behavior.test.mjs tests/state_writer_policy_batch_scan_behavior.test.mjs tests/renderer_phase_actions_behavior.test.mjs tests/renderer_interaction_actions_behavior.test.mjs tests/renderer_exact_refresh_actions_behavior.test.mjs tests/render_pass_cache_state_normalizer_behavior.test.mjs tests/renderer_cache_actions_behavior.test.mjs tests/renderer_diagnostics_actions_behavior.test.mjs tests/render_perf_metrics_runtime_owner_behavior.test.mjs tests/day_night_runtime_owner_behavior.test.mjs tests/visual_effects_pass_owner_behavior.test.mjs tests/political_background_render_owner_behavior.test.mjs tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs tests/renderer_render_phase_lifecycle_inventory.test.mjs tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs tests/zoom_interaction_lifecycle_owner_behavior.test.mjs tests/renderer_runtime_state_behavior.test.mjs tests/physical_layer_contracts.test.mjs tests/scenario_chunk_contracts.test.mjs",
    "test:python:p4:p4-3-boundary": "npm run python -- -m unittest tests.test_renderer_control_actions_boundary_contract tests.test_renderer_exact_refresh_actions_boundary_contract tests.test_renderer_cache_actions_boundary_contract tests.test_renderer_diagnostics_actions_boundary_contract tests.test_day_night_runtime_owner_boundary_contract tests.test_map_renderer_political_background_render_owner_boundary_contract tests.test_renderer_runtime_state_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_state_write_guardrail_contract -q",
    "verify:p4:p4-3": "node tools/run_p4_phase_verification.mjs --phase P4.3",
    "verify:p4:routes": "node tools/check_p4_state_action_routes.mjs",
    "verify:ui-rework-mainline": "npm run python -- -m unittest tests/test_ui_rework_plan02_mainline_contract.py",
    "verify:ui-rework-support": "npm run python -- -m unittest tests/test_ui_rework_plan03_support_transport_contract.py",
    "verify:scenario-contracts": "npm run python -- tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962",
    "verify:scenario-contracts:strict": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json",
    "verify:tno-coverage-ledger": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.coverage_ledger_report.json",
    "verify:tno-atlantropa-coverage": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.atlantropa_coverage_report.json",
    "verify:tno-polar-coverage": "npm run python -- tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.polar_coverage_report.json",
    "verify:tno-coverage-chain": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json --report-path .runtime/reports/generated/tno_1962.coverage_ledger_report.json --report-path .runtime/reports/generated/tno_1962.atlantropa_coverage_report.json && npm run verify:tno-polar-coverage && npm run test:node:scenario-chunk-contracts",
    "build:hgo-scenario": "npm run python -- tools/build_hgo_scenario.py",
    "verify:scenario-contracts:hgo": "npm run python -- tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/hgo_1936.strict_contract_report.json",
    "test:py:tno-water-repair-contracts": "npm run python -- -m unittest tests.test_tno_water_owners_consistency tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_run_changed_domain_plan_for_water_repairs_contract_outputs_after_chunks tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_external_publish_checkpoint_validation_uses_tno_profile_and_hard_fails_final_files tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_prechunk_publish_checkpoint_validation_only_allows_missing_build_snapshot tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_write_bundle_stage_blocks_publish_when_strict_checkpoint_validation_fails -q",
    "perf:baseline": "node tools/perf/run_baseline.mjs --mode baseline --scenarios tno_1962,hoi4_1939 --runs 5 --warmups 3",
    "perf:gate": "node tools/perf/run_baseline.mjs --mode gate --scenarios tno_1962,hoi4_1939 --runs 5 --warmups 3 --threshold 1.15 --write-markdown false",
    "perf:analyze-render-sample-roles": "node tools/perf/analyze_render_sample_roles.mjs",
    "test:node:render-sample-role-policy": "node --test tests/render_sample_role_policy_behavior.test.mjs tests/perf_role_governed_report_behavior.test.mjs",
    "perf:williams-crossover:plan": "node tools/perf/run_williams_crossover.mjs --plan",
    "perf:williams-crossover:analyze": "node tools/perf/run_williams_crossover.mjs --analyze",
    "perf:williams-crossover:run": "node tools/perf/run_williams_crossover.mjs --execute",
    "test:node:williams-crossover-governance": "node --test tests/williams_crossover_governance_behavior.test.mjs",
    "test:node:williams-crossover-job-runner": "node --test tests/williams_crossover_windows_job_runner_behavior.test.mjs tests/williams_crossover_windows_job_runner_integration.test.mjs",
    "test:node:windows-job-runtime": "node --test tests/windows_job_runner_v2_native_contract.test.mjs tests/windows_job_runtime_behavior.test.mjs",
    "test:node:windows-job-runtime:integration": "node --test tests/windows_job_runtime_integration.test.mjs",
    "test:node:williams-crossover-telemetry-live": "node -e \"process.env.WILLIAMS_LIVE_TELEMETRY_TEST='1'; import('./tests/williams_crossover_windows_job_runner_integration.test.mjs')\"",
    "perf:williams-power-scheme:live-preflight": "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tools/perf/williams_crossover_power_scheme.ps1 -LivePreflight",
    "test:e2e:ui-contract-foundation": "node node_modules/@playwright/test/cli.js test tests/e2e/ui_contract_foundation.spec.js --workers=1 --retries=0",
    "test:e2e:ui-rework-mainline": "node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_mainline_shell_sidebar.spec.js --workers=1 --retries=0",
    "test:e2e:ui-rework-support": "node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_support_transport_hardening.spec.js --workers=1 --retries=0",
    "test:e2e": "node node_modules/@playwright/test/cli.js test",
    "test:node:renderer-splits": "node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs tests/strategic_overlay_state_behavior.test.mjs tests/special_zone_layers_state_behavior.test.mjs tests/special_zones_workbench_controller_behavior.test.mjs tests/scenario_optional_layers_behavior.test.mjs",
    "test:node:annotation-productization": "node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs",
    "test:node:scenario-lifecycle-runtime-behavior": "node --test tests/scenario_lifecycle_runtime_behavior.test.mjs",
    "test:node:scenario-runtime-state-behavior": "node --test tests/scenario_runtime_state_behavior.test.mjs",
    "test:node:scenario-apply-transaction-ownership": "node --test tests/scenario_apply_transaction_ownership.test.mjs",
    "test:node:scenario-context-bar-controller": "node --test tests/scenario_context_bar_controller_behavior.test.mjs",
    "test:node:worker-task-client": "node --test tests/worker_task_client_behavior.test.mjs",
    "test:node:spatial-query-index": "node --test tests/spatial_query_index_behavior.test.mjs",
    "test:node:scenario-chunk-promotion-helpers": "node --test tests/scenario_chunk_promotion_helpers_behavior.test.mjs",
    "test:node:scenario-refresh-plans": "node --test tests/scenario_refresh_plans_behavior.test.mjs tests/scenario_visual_invalidation_executor_behavior.test.mjs",
    "test:node:exact-after-settle-refresh-plans": "node --test tests/exact_after_settle_refresh_plans_behavior.test.mjs",
    "test:node:exact-after-settle-pass-catalog": "node --test tests/exact_after_settle_pass_catalog_behavior.test.mjs",
    "test:node:interaction-hit-candidates": "node --test tests/interaction_hit_candidates_behavior.test.mjs",
    "test:node:startup-hydration-behavior": "node --test tests/startup_hydration_behavior.test.mjs",
    "test:node:dev-workspace-selection-ownership": "node --test tests/dev_workspace_selection_ownership_behavior.test.mjs",
    "test:node:hgo-identity-resolver": "node --test tests/hgo_identity_resolver.node.test.mjs",
    "test:node:hgo-runtime-index": "node --test tests/hgo_runtime_index.node.test.mjs",
    "test:node:hgo-projection-model": "node --test tests/hgo_projection_model.node.test.mjs",
    "test:node:hgo-raster-renderer": "node --test tests/hgo_raster_renderer.node.test.mjs",
    "test:node:hgo-runtime-preview": "node --test tests/hgo_runtime_preview.node.test.mjs tests/hgo_runtime_preview_toolbar.node.test.mjs",
    "test:py:hgo-runtime-seed": "npm run python -- -m unittest tests.test_hgo_runtime_seed_builder -q",
    "test:py:hgo-runtime-assets": "npm run python -- -m unittest tests.test_hgo_runtime_seed_builder -q",
    "test:py:hgo-runtime-assets-contract": "npm run python -- -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q",
    "test:py:thematic-layer-contracts": "npm run python -- -m unittest tests.test_thematic_layer_contracts tests.test_thematic_wgi_source_ingest -q",
    "smoke:hgo-runtime-source": "npm run python -- tools/build_hgo_runtime_seed.py",
    "build:hgo-runtime-assets": "npm run python -- tools/build_hgo_runtime_assets.py",
    "spike:hgo-runtime-lod": "node tools/spike_hgo_runtime_lod_assets.mjs",
    "verify:hgo-runtime-poc": "npm run test:py:hgo-runtime-assets && npm run test:node:hgo-runtime-index && npm run test:node:hgo-projection-model && npm run test:node:hgo-raster-renderer && npm run test:node:hgo-runtime-preview && npm run test:py:hgo-runtime-assets-contract && node --check js/core/hgo_runtime_index.js js/core/hgo_projection_model.js js/core/hgo_raster_renderer.js js/core/hgo_runtime_asset_loader.js js/core/hgo_runtime_preview.js js/ui/toolbar.js js/ui/toolbar/hgo_runtime_preview_controller.js && npm run python -- -m py_compile tools/build_hgo_runtime_seed.py tools/build_hgo_runtime_assets.py",
    "test:node:country-inspector-controller": "node --test tests/country_inspector_controller_behavior.test.mjs",
    "test:node:sidebar-hgo-identity-startup": "node --test tests/sidebar_hgo_identity_startup_behavior.test.mjs",
    "test:node:palette-runtime-bridge": "node --test tests/palette_runtime_bridge.node.test.mjs",
    "test:node:legend-generation": "node --test tests/legend_manager_generation_behavior.test.mjs",
    "test:node:political-collection-fragment-camouflage": "node --test tests/political_collection_fragment_camouflage_behavior.test.mjs",
    "test:node:transport-overview-line-contract": "node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs",
    "test:node:renderer-host-inventory": "node --test tests/renderer_host_inventory_boundary.test.mjs",
    "test:node:renderer-surface-host": "node --test tests/renderer_surface_host_behavior.test.mjs tests/renderer_surface_host_inventory_boundary.test.mjs",
    "test:node:renderer-surface-host-inventory": "node --test tests/renderer_surface_host_inventory_boundary.test.mjs",
    "test:node:renderer-surface-runtime-bridge-state": "node --test tests/renderer_surface_runtime_bridge_state_behavior.test.mjs",
    "test:node:renderer-surface-lifecycle-inventory": "node --test tests/renderer_surface_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-surface-lifecycle-owner": "node --test tests/renderer_surface_lifecycle_owner_behavior.test.mjs",
    "test:node:renderer-surface-lifecycle": "node --test tests/renderer_surface_lifecycle_owner_behavior.test.mjs tests/renderer_surface_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-projection-path-owner": "node --test tests/renderer_projection_path_owner_behavior.test.mjs",
    "test:node:renderer-projection-path-lifecycle-inventory": "node --test tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-projection-path-lifecycle": "node --test tests/renderer_projection_path_owner_behavior.test.mjs tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-svg-surface-lifecycle-owner": "node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs",
    "test:node:renderer-svg-surface-lifecycle-inventory": "node --test tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-svg-surface-lifecycle": "node --test tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-fit-projection-owner": "node --test tests/renderer_fit_projection_owner_behavior.test.mjs",
    "test:node:renderer-fit-projection-lifecycle-inventory": "node --test tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-fit-projection-lifecycle": "node --test tests/renderer_fit_projection_owner_behavior.test.mjs tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-viewport-update-owner": "node --test tests/renderer_viewport_update_owner_behavior.test.mjs",
    "test:node:renderer-startup-transaction-owner": "node --test tests/renderer_startup_transaction_owner_behavior.test.mjs",
    "test:node:renderer-startup-transaction-inventory": "node --test tests/renderer_startup_transaction_inventory_boundary.test.mjs",
    "test:node:renderer-set-map-data-transaction-owner": "node --test tests/renderer_set_map_data_transaction_owner_behavior.test.mjs",
    "test:node:renderer-set-map-data-transaction-inventory": "node --test tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs",
    "test:node:renderer-set-map-data-transaction": "npm run test:node:renderer-set-map-data-transaction-owner && npm run test:node:renderer-set-map-data-transaction-inventory",
    "test:node:renderer-transaction-reset-owner": "node --test tests/renderer_transaction_reset_owner_behavior.test.mjs",
    "test:node:renderer-transaction-reset-hardening-inventory": "node --test tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs",
    "test:node:renderer-transaction-reset": "npm run test:node:renderer-transaction-reset-owner && npm run test:node:renderer-transaction-reset-hardening-inventory",
    "test:node:renderer-render-lifecycle-inventory": "node --test tests/renderer_render_lifecycle_inventory_boundary.test.mjs",
    "test:node:renderer-render-pass-cache-host-inventory": "node --test tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs",
    "test:node:render-pass-cache-host-owner": "node --test tests/render_pass_cache_host_owner_behavior.test.mjs",
    "test:node:render-pass-cache-host-owner-inventory": "node --test tests/render_pass_cache_host_owner_inventory.test.mjs",
    "test:node:render-pass-cache-host-owner-suite": "npm run test:node:render-pass-cache-host-owner && npm run test:node:render-pass-cache-host-owner-inventory && npm run test:node:renderer-render-pass-cache-host-inventory",
    "test:node:render-pass-commit-accounting-owner": "node --test tests/render_pass_commit_accounting_owner_behavior.test.mjs",
    "test:node:render-pass-commit-accounting-inventory": "node --test tests/render_pass_commit_accounting_owner_inventory.test.mjs",
    "test:node:render-pass-commit-accounting-owner-suite": "npm run test:node:render-pass-commit-accounting-owner && npm run test:node:render-pass-commit-accounting-inventory",
    "test:node:renderer-runtime-context-receiver": "node --test tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "test:node:renderer-runtime-context-render-cache": "node --test tests/renderer_runtime_context_render_cache_behavior.test.mjs",
    "test:node:renderer-runtime-context-projection-viewport": "node --test tests/renderer_runtime_context_projection_viewport_behavior.test.mjs",
    "test:node:renderer-runtime-context-viewport-mutation": "node --test tests/renderer_runtime_context_viewport_mutation_behavior.test.mjs",
    "test:node:renderer-runtime-context-interaction": "node --test tests/renderer_runtime_context_interaction_behavior.test.mjs",
    "test:node:renderer-runtime-context-hit-hover": "node --test tests/renderer_runtime_context_hit_hover_behavior.test.mjs",
    "test:python:map-renderer-render-cache-owner-boundary": "npm run python -- -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract -q",
    "test:python:day-night-runtime-owner-boundary": "npm run python -- -m unittest tests.test_day_night_runtime_owner_boundary_contract -q",
    "test:python:map-renderer-projection-viewport-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_projection_viewport_context_boundary_contract -q",
    "test:python:map-renderer-viewport-mutation-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_viewport_mutation_context_boundary_contract -q",
    "test:python:map-renderer-interaction-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_interaction_context_boundary_contract -q",
    "test:python:map-renderer-hit-hover-context-boundary": "npm run python -- -m unittest tests.test_map_renderer_hit_hover_context_boundary_contract -q",
    "test:node:renderer-draw-canvas-orchestration-inventory": "node --test tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
    "test:node:draw-canvas-orchestration-owner": "node --test tests/draw_canvas_orchestration_owner_behavior.test.mjs",
    "test:node:draw-canvas-orchestration-owner-suite": "npm run test:node:draw-canvas-orchestration-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-draw-canvas-orchestration-boundary",
    "test:python:map-renderer-draw-canvas-orchestration-boundary": "npm run python -- -m unittest tests.test_map_renderer_draw_canvas_orchestration_owner_boundary_contract -q",
    "test:node:cached-pass-compositor-owner": "node --test tests/cached_pass_compositor_owner_behavior.test.mjs",
    "test:node:cached-pass-compositor-owner-suite": "npm run test:node:cached-pass-compositor-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-frame-compositor-boundary",
    "test:node:transformed-frame-compositor-owner": "node --test tests/transformed_frame_compositor_owner_behavior.test.mjs",
    "test:node:transformed-frame-compositor-owner-suite": "npm run test:node:transformed-frame-compositor-owner && npm run test:node:renderer-draw-canvas-orchestration-inventory && npm run test:python:map-renderer-frame-compositor-boundary",
    "test:python:map-renderer-frame-compositor-boundary": "npm run python -- -m unittest tests.test_map_renderer_frame_compositor_owner_boundary_contract -q",
    "test:node:click-selection-transaction-owner": "node --test tests/click_selection_transaction_owner_behavior.test.mjs",
    "test:node:renderer-click-selection-transaction-inventory": "node --test tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
    "test:python:map-renderer-click-selection-transaction-boundary": "npm run python -- -m unittest tests.test_map_renderer_click_selection_transaction_boundary_contract -q",
    "test:node:renderer-render-request-boundary-owner": "node --test tests/renderer_render_request_boundary_owner_behavior.test.mjs",
    "test:node:renderer-render-request-boundary-inventory": "node --test tests/renderer_render_request_boundary_inventory.test.mjs",
    "test:node:renderer-render-request-boundary": "npm run test:node:renderer-render-request-boundary-owner && npm run test:node:renderer-render-request-boundary-inventory",
    "test:node:renderer-render-phase-lifecycle-owner": "node --test tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
    "test:node:renderer-render-phase-lifecycle-inventory": "node --test tests/renderer_render_phase_lifecycle_inventory.test.mjs",
    "test:node:renderer-render-phase-lifecycle": "npm run test:node:renderer-render-phase-lifecycle-owner && npm run test:node:renderer-render-phase-lifecycle-inventory",
    "test:node:hit-canvas-scheduling-owner": "node --test tests/hit_canvas_scheduling_owner_behavior.test.mjs",
    "test:node:hit-canvas-scheduling-owner-inventory": "node --test tests/hit_canvas_scheduling_owner_inventory.test.mjs",
    "test:node:hit-canvas-scheduling-owner-suite": "npm run test:node:hit-canvas-scheduling-owner && npm run test:node:hit-canvas-scheduling-owner-inventory && node --test tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs",
    "test:node:map-hover-interaction-owner": "node --test tests/map_hover_interaction_owner_behavior.test.mjs",
    "test:node:map-hover-interaction-inventory": "node --test tests/map_hover_interaction_owner_inventory.test.mjs",
    "test:node:map-hover-interaction": "npm run test:node:map-hover-interaction-owner && npm run test:node:map-hover-interaction-inventory",
    "test:node:visible-frame-diagnostics-owner": "node --test tests/visible_frame_diagnostics_owner_behavior.test.mjs",
    "test:node:visible-frame-diagnostics-inventory": "node --test tests/visible_frame_diagnostics_owner_inventory.test.mjs",
    "test:node:visible-frame-diagnostics": "npm run test:node:visible-frame-diagnostics-owner && npm run test:node:visible-frame-diagnostics-inventory",
    "test:node:render-cache-owner": "node --test tests/render_cache_owner_invalidation_behavior.test.mjs",
    "test:node:render-transform-reuse-policy-owner": "node --test tests/render_transform_reuse_policy_owner_behavior.test.mjs",
    "test:node:projected-geometry-bounds-owner": "node --test tests/projected_geometry_bounds_owner_behavior.test.mjs",
    "test:node:viewport-read-model-owner": "node --test tests/viewport_read_model_owner_behavior.test.mjs",
    "test:node:viewport-command-owner": "node --test tests/viewport_command_owner_behavior.test.mjs",
    "test:node:viewport-resize-lifecycle-owner": "node --test tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
    "test:node:zoom-interaction-lifecycle-owner": "node --test tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
    "test:node:strategic-overlay-runtime-owner": "node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs",
    "test:node:map-interaction-event-binding-owner": "node --test tests/map_interaction_event_binding_owner_behavior.test.mjs",
    "test:node:scenario-water-cache-policy-owner": "node --test tests/scenario_water_cache_policy_owner_behavior.test.mjs",
    "test:node:render-pass-catalog": "node --test tests/render_pass_catalog_behavior.test.mjs",
    "test:node:render-pipeline-catalog": "node --test tests/render_pipeline_catalog_behavior.test.mjs",
    "test:node:render-invalidation-catalog": "node --test tests/render_invalidation_catalog_behavior.test.mjs",
    "test:node:renderer-runtime-context-foundation": "node --test tests/renderer_runtime_context_foundation_behavior.test.mjs",
    "test:node:renderer-runtime-state-behavior": "node --test tests/renderer_runtime_state_behavior.test.mjs",
    "test:node:render-transaction-diagnostics": "node --test tests/render_transaction_diagnostics_behavior.test.mjs",
    "test:node:border-draw-owner-behavior": "node --test tests/border_draw_owner_behavior.test.mjs",
    "test:node:border-mesh-owner-behavior": "node --test tests/border_mesh_owner_behavior.test.mjs",
    "test:node:canvas-layer-manager": "node --test tests/canvas_layer_manager_behavior.test.mjs",
    "test:node:political-raster-worker-packet": "node --test tests/political_raster_worker_packet_behavior.test.mjs",
    "test:node:perf-probe-snapshot-behavior": "node --test tests/perf_probe_snapshot_behavior.test.mjs",
    "test:node:scenario-chunk-contracts": "node --test tests/scenario_chunk_contracts.test.mjs",
    "test:node:scenario-chunk-contracts:quick": "node --test tests/scenario_chunk_contracts.quick.test.mjs",
    "test:node:scenario-chunk-contracts:heavy": "node --test tests/scenario_chunk_contracts.heavy.test.mjs",
    "test:node:scenario-chunk-contracts:split": "node --test tests/scenario_chunk_contracts.quick.test.mjs tests/scenario_chunk_contracts.heavy.test.mjs",
    "test:node:scenario-chunk-contracts:shadow": "node tools/verification/test_shadow_equivalence.mjs --shadow",
    "test:node:physical-layer-contracts": "node --test tests/physical_layer_contracts.test.mjs",
    "test:node:physical-layer-owner": "node --test tests/physical_layer_render_owner_behavior.test.mjs",
    "test:node:scenario-relief-overlay-owner": "node --test tests/scenario_relief_overlay_render_owner_behavior.test.mjs",
    "test:node:river-layer-contracts": "node --test tests/river_layer_contracts.test.mjs",
    "test:node:river-layer-owner": "node --test tests/river_layer_render_owner_behavior.test.mjs",
    "test:e2e:scenario-apply-concurrency": "node node_modules/@playwright/test/cli.js test tests/e2e/scenario_apply_concurrency.spec.js --workers=1 --retries=0",
    "test:e2e:startup-bundle-recovery-contract": "node node_modules/@playwright/test/cli.js test tests/e2e/startup_bundle_recovery_contract.spec.js --workers=1 --retries=0",
    "test:e2e:scenario-shell-overlay-contract": "node node_modules/@playwright/test/cli.js test tests/e2e/scenario_shell_overlay_contract.spec.js --workers=1 --retries=0",
    "test:e2e:physical-layer-regression": "node node_modules/@playwright/test/cli.js test tests/e2e/physical_layer_regression.spec.js --workers=1 --retries=0",
    "test:e2e:physical-layer-runtime-contract": "node node_modules/@playwright/test/cli.js test tests/e2e/physical_layer_runtime_contract.spec.js --workers=1 --retries=0",
    "test:e2e:dev:tno-ready-state": "node node_modules/@playwright/test/cli.js test tests/e2e/dev/tno_ready_state_contract.dev.spec.js --workers=1 --retries=0",
    "test:e2e:dev:scenario-chunk-runtime": "node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --workers=1 --retries=0",
    "test:e2e:dev:stage5-visual-acceptance": "node node_modules/@playwright/test/cli.js test tests/e2e/dev/full_visual_acceptance.dev.spec.js --workers=1 --retries=0",
    "test:e2e:dev:political-progressive-recovery": "node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --grep \"Great Lakes Congo political detail fill stable|post-edit keeps political detail fill|runtime color coverage\" --workers=1 --retries=0",
    "test:e2e:smoke": "node tools/e2e_layering.mjs run smoke",
    "test:e2e:strategic-overlay-smoke": "node node_modules/@playwright/test/cli.js test tests/e2e/strategic_overlay_smoke.spec.js --workers=1 --retries=0",
    "test:e2e:project-save-load": "node node_modules/@playwright/test/cli.js test tests/e2e/project_save_load_roundtrip.spec.js --workers=1",
    "test:e2e:interaction-funnel": "node node_modules/@playwright/test/cli.js test tests/e2e/interaction_funnel_contract.spec.js --workers=1 --retries=0",
    "test:e2e:scenario-resilience": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_apply_resilience.spec.js",
    "test:e2e:city-rendering": "node tools/e2e_layering.mjs run-spec tests/e2e/city_label_i18n_redraw.spec.js && node tools/e2e_layering.mjs run-spec tests/e2e/city_marker_visibility_regression.spec.js && node tools/e2e_layering.mjs run-spec tests/e2e/city_points_urban_runtime.spec.js && node tools/e2e_layering.mjs run-spec tests/e2e/city_reveal_plan_regression.spec.js && node tools/e2e_layering.mjs run-spec tests/e2e/city_urban_rendering_regression.spec.js",
    "test:e2e:water-rendering": "node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js tests/e2e/tno_named_water_rendering.spec.js tests/e2e/tno_open_ocean_rendering.spec.js tests/e2e/water_cache_strategy_regression.spec.js --workers=1 --retries=0",
    "test:e2e:tno-contracts": "node node_modules/@playwright/test/cli.js test tests/e2e/tno_startup_visible_context_layers_contract.spec.js tests/e2e/tno_1962_ui_smoke.spec.js --workers=1 --retries=0",
    "test:e2e:sample-guide": "node node_modules/@playwright/test/cli.js test tests/e2e/sample_guide_deeplink.spec.js --workers=1 --retries=0",
    "test:e2e:pages-public-release-gate": "node node_modules/@playwright/test/cli.js test tests/e2e/release/pages_public_release_gate.spec.js --workers=1 --retries=0",
    "test:e2e:pages-public-release-gate:deployed": "node node_modules/@playwright/test/cli.js test tests/e2e/release/pages_public_release_gate.spec.js --workers=1 --retries=0",
    "test:e2e:layer:smoke": "node tools/e2e_layering.mjs run smoke",
    "test:e2e:layer:contract": "node tools/e2e_layering.mjs run contract",
    "test:e2e:layer:regression": "node tools/e2e_layering.mjs run regression",
    "test:e2e:layer:feature": "node tools/e2e_layering.mjs run feature",
    "test:e2e:layer:all": "node tools/e2e_layering.mjs run all",
    "test:adaptive": "node tools/run_adaptive_tests.mjs",
    "test:adaptive:execute": "node tools/run_adaptive_tests.mjs --execute",
    "test:adaptive:execute:main-thread": "node tools/run_adaptive_tests.mjs --execute --include-main-thread",
    "verify:test:e2e-layers": "node tools/e2e_layering.mjs check",
    "verify:test-timeout-inventory": "node tools/test_timeout_inventory.mjs",
    "verify:test-import-graph": "node tools/check_test_import_graph.mjs",
    "verify:architecture-boundaries": "node tools/check_architecture_boundaries.mjs",
    "verify:supervisor-schemas": "node tools/ai_test_supervisor/check_supervisor_schemas.mjs",
    "test:node:supervisor-contracts": "node --test tests/supervisor_domain_registry_behavior.test.mjs tests/supervisor_schema_contracts.test.mjs",
    "test:node:supervisor-routing": "node --test tests/supervisor_adaptive_route_behavior.test.mjs",
    "test:node:supervisor-plan": "node --test tests/supervisor_change_dossier_behavior.test.mjs tests/supervisor_plan_behavior.test.mjs",
    "test:supervisor": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs",
    "test:supervisor:execute": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute",
    "test:supervisor:execute:main-thread": "node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute --include-main-thread",
    "verify:supervisor-plan": "npm run test:node:supervisor-plan && node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file tests/supervisor_plan_behavior.test.mjs",
    "verify:supervisor-contracts": "npm run verify:supervisor-schemas && npm run test:node:supervisor-contracts && npm run test:node:supervisor-routing",
    "test:node:verify-core-runner": "node --test tests/verify_core_runner_behavior.test.mjs",
    "test:node:verification-profile": "node --test tests/verification_profile_behavior.test.mjs",
    "test:node:verification-metadata": "node --test tests/verification_metadata_behavior.test.mjs",
    "test:node:verification-script-portfolio": "node --test tests/verification_script_portfolio_behavior.test.mjs",
    "test:node:renderer-pass-family-inventory": "node --test tests/renderer_pass_family_inventory_behavior.test.mjs",
    "test:node:visual-effects-pass-owner": "node --test tests/visual_effects_pass_owner_behavior.test.mjs",
    "test:node:context-pass-orchestrator-owner": "node --test tests/context_pass_orchestrator_owner_behavior.test.mjs",
    "test:node:renderer-political-pass-orchestration-preflight": "node --test tests/renderer_political_pass_orchestration_preflight.test.mjs",
    "test:node:political-pass-orchestrator-owner": "node --test tests/political_pass_orchestrator_owner_behavior.test.mjs",
    "test:node:political-background-render-owner": "node --test tests/political_background_render_owner_behavior.test.mjs",
    "test:node:political-partial-repaint-owner": "node --test tests/political_partial_repaint_owner_behavior.test.mjs",
    "test:node:political-pass-orchestrator-owner-suite": "npm run test:node:political-pass-orchestrator-owner && npm run test:node:renderer-political-pass-orchestration-preflight && npm run test:python:map-renderer-political-pass-orchestrator-boundary",
    "test:python:map-renderer-political-pass-orchestrator-boundary": "npm run python -- -m unittest tests.test_map_renderer_political_pass_orchestrator_boundary_contract -q",
    "test:python:map-renderer-political-background-render-owner-boundary": "npm run python -- -m unittest tests.test_map_renderer_political_background_render_owner_boundary_contract -q",
    "test:python:map-renderer-political-partial-repaint-owner-boundary": "npm run python -- -m unittest tests.test_map_renderer_political_partial_repaint_owner_boundary_contract -q",
    "test:python:map-renderer-render-pipeline-passes-boundary": "npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_strategic_values_render_contract -q",
    "verify:core:list": "node tools/run_core_verification.mjs --list",
    "verify:core": "node tools/run_core_verification.mjs",
    "verify:core:main-thread": "node tools/run_core_verification.mjs --include-main-thread",
    "verify:script-portfolio": "node tools/verification/script_portfolio.mjs check",
    "verify:local-infra": "node --test tests/verification_script_portfolio_behavior.test.mjs tests/verification_metadata_behavior.test.mjs tests/verify_core_runner_behavior.test.mjs tests/verification_profile_behavior.test.mjs && npm run python -- -m unittest tests.test_e2e_structural_tooling -q && node tools/select_verification_targets.mjs --check",
    "verify:edit": "npm run verify:script-portfolio && node tools/select_verification_targets.mjs --check && node tools/run_adaptive_tests.mjs --entrypoint edit --execute --defer-main-thread",
    "verify:impact": "node tools/run_adaptive_tests.mjs --entrypoint impact --execute --defer-main-thread",
    "verify:pr": "npm run verify:script-portfolio && npm run verify:test-import-graph && node tools/select_verification_targets.mjs --check && npm run verify:architecture-boundaries && npm run verify:test:e2e-layers && npm run verify:test-console-allowlist && npm run verify:test-timeout-guardrails && npm run python -- -m unittest tests.test_app_entry_resolver tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract tests.test_map_renderer_interaction_border_snapshot_orchestration_contract tests.test_perf_gate_contract tests.test_startup_shell tests.test_e2e_structural_tooling -q && npm run verify:scenario-contracts:strict && node tools/run_adaptive_tests.mjs --execute --defer-main-thread --history-base origin/main",
    "verify:demo": "node node_modules/@playwright/test/cli.js test tests/e2e/sample_guide_deeplink.spec.js --grep @golden-demo --workers=1 --retries=0",
    "verify:nightly": "npm run verify:core && npm run python -- -m unittest discover -s tests -p \"test_*.py\" && npm run test:e2e:sample-guide",
    "verify:release": "npm run verify:core:main-thread && npm run verify:demo && npm run test:e2e:pages-public-release-gate",
    "verify:test-console-allowlist": "node tools/check_console_allowlist_decay.mjs",
    "verify:test-timeout-guardrails": "node tools/check_test_timeout_guardrails.mjs",
    "verify:test-timing-summary": "node tools/test_timing_summary.mjs",
    "build:landing-showcase": "npm run python -- tools/build_landing_europe_1936_showcase.py",
    "build:landing-work-maps": "npm run python -- tools/build_landing_work_maps.py",
    "test:py:landing-map-asset-contracts": "npm run python -- -m unittest tests.test_landing_map_asset_contracts -q",
    "test:node:landing-showcase-view": "node --test tests/landing_showcase_view_behavior.test.mjs",
    "test:node:sample-project-contracts": "node --test tests/sample_project_contracts.test.mjs",
    "test:node:release-smoke-helper": "node --test tests/release_smoke_retry_behavior.node.test.mjs",
    "test:py:pages-dist-startup-shell-heavy": "npm run python -- -m unittest tests.test_pages_dist_startup_shell_heavy -q",
    "verify:pages-dist": "npm run python -- tools/build_pages_dist.py && npm run python -- -m unittest tests.test_pages_dist_startup_shell -q && npm run test:py:landing-map-asset-contracts && npm run test:node:landing-showcase-view && npm run test:node:sample-project-contracts",
    "verify:pages-dist-and-drift": "npm run python -- tools/build_pages_dist.py && npm run python -- -m unittest tests.test_pages_dist_startup_shell -q && npm run test:py:landing-map-asset-contracts && npm run test:node:landing-showcase-view && npm run test:node:sample-project-contracts && git diff --exit-code -- dist/.nojekyll dist/app.js dist/index.html dist/styles.css dist/assets dist/app/index.html dist/app/js dist/app/css dist/app/vendor dist/pages-dist-manifest.json",
    "verify:dist-drift": "npm run python -- tools/build_pages_dist.py && git diff --exit-code -- dist/.nojekyll dist/app.js dist/index.html dist/styles.css dist/assets dist/app/index.html dist/app/js dist/app/css dist/app/vendor dist/pages-dist-manifest.json",
    "build:global-transport-roads": "npm run python -- tools/build_global_transport_roads.py",
    "build:global-transport-rail": "npm run python -- tools/build_global_transport_rail.py",
    "build:global-transport-road-catalog": "npm run python -- tools/build_global_transport_catalogs.py --family road",
    "build:global-transport-airports": "npm run python -- tools/build_global_transport_points.py --family airport",
    "build:global-transport-ports": "npm run python -- tools/build_global_transport_points.py --family port",
    "verify:perf-gate-contract": "npm run python -- -m unittest tests.test_perf_gate_contract -q",
    "bench:editor-performance": "npm run python -- ops/browser-mcp/editor-performance-benchmark.py --out .runtime/output/perf/editor-performance-benchmark.json --screenshot-dir .runtime/browser/mcp-artifacts/perf",
    "bench:special-zones-members": "node tools/perf/special_zone_members_benchmark.mjs --members 240 --iterations 40 --out .runtime/output/perf/special-zone-members-benchmark.json",
    "bench:polyline-simplification": "node tools/perf/polyline_simplification_benchmark.mjs --iterations 40 --out .runtime/reports/generated/geometry-simplification-benchmark.json",
    "test:node:polyline-simplification-benchmark": "node --test tests/polyline_simplification_benchmark_contract.test.mjs"
  },
  "enums": {
    "resourceLocks": [
      "browser-dev-server",
      "perf-dev-server",
      "playwright-browser",
      "dist",
      ".runtime-output",
      "scenario-data",
      "heavy-geo",
      "checkpoint-builder",
      "system-power-scheme"
    ],
    "executionOwners": [
      "child-safe",
      "main-thread",
      "ci-only"
    ],
    "costs": [
      "fast",
      "contract",
      "heavy"
    ],
    "layers": [
      "smoke",
      "contract",
      "regression",
      "feature",
      "heavy"
    ],
    "ciProfiles": [
      "pr-fast",
      "pr-smoke",
      "demo",
      "full",
      "deploy-minimal",
      "perf-pr-gate",
      "scenario-contract-matrix"
    ],
    "platforms": [
      "all",
      "win32",
      "linux",
      "darwin"
    ],
    "entrypointDepths": [
      "local",
      "pr",
      "nightly",
      "release"
    ],
    "entrypointIds": [
      "edit",
      "impact",
      "pr",
      "nightly",
      "release"
    ]
  },
  "commandRefs": {
    "selectorSanity": "node tools/select_verification_targets.mjs --check",
    "adaptiveRecursive": "node tools/run_adaptive_tests.mjs --entrypoint impact --execute --defer-main-thread",
    "exactDirect": [
      "node tools/select_verification_targets.mjs --check",
      "node tools/run_adaptive_tests.mjs --entrypoint impact --execute --defer-main-thread"
    ]
  },
  "verifyCoreGroups": [
    {
      "id": "infra",
      "title": "Infrastructure contracts"
    },
    {
      "id": "python-quick",
      "title": "Quick Python contracts"
    },
    {
      "id": "startup-node",
      "title": "Startup Node contracts"
    },
    {
      "id": "renderer-owner",
      "title": "Renderer owner contracts"
    },
    {
      "id": "scenario-project-chunk",
      "title": "Scenario, project, and chunk contracts"
    },
    {
      "id": "pages",
      "title": "Pages contract checks"
    }
  ],
  "verifyCoreMainThreadGroup": {
    "id": "main-thread-e2e",
    "title": "Main-thread E2E checks"
  },
  "estimatePolicy": {
    "schemaVersion": 1,
    "kind": "verification-estimate-policy",
    "aggregation": "sum-process-group-base-plus-leaf-scale",
    "costClasses": {
      "fast": {
        "groupBaseRuntimeSeconds": 20,
        "perLeafRuntimeSeconds": 5,
        "groupBaseCostUnits": 0.5,
        "perLeafCostUnits": 0.25
      },
      "contract": {
        "groupBaseRuntimeSeconds": 30,
        "perLeafRuntimeSeconds": 10,
        "groupBaseCostUnits": 1,
        "perLeafCostUnits": 0.5
      },
      "heavy": {
        "groupBaseRuntimeSeconds": 120,
        "perLeafRuntimeSeconds": 30,
        "groupBaseCostUnits": 4,
        "perLeafCostUnits": 1
      }
    }
  },
  "entrypointPolicies": [
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "nightly"
      ],
      "minimumDepth": "nightly",
      "executionTarget": "main-thread",
      "deferredReason": "requires-nightly-verification",
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": null
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "release"
      ],
      "minimumDepth": "release",
      "executionTarget": "deployed-target",
      "deferredReason": "requires-release-verification",
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": null
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "pr"
      ],
      "minimumDepth": "pr",
      "executionTarget": "main-thread",
      "deferredReason": "requires-pr-verification",
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": null
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "edit",
        "impact",
        "pr"
      ],
      "minimumDepth": "local",
      "executionTarget": "child-safe",
      "deferredReason": null,
      "plannerDisposition": "blocked",
      "blockedReason": "adaptive-recursion-forbidden",
      "localProjection": null
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "pr"
      ],
      "minimumDepth": "pr",
      "executionTarget": "child-safe",
      "deferredReason": "requires-pr-verification",
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": null
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "edit",
        "impact",
        "pr"
      ],
      "minimumDepth": "local",
      "executionTarget": "child-safe",
      "deferredReason": null,
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": {
        "mode": "indivisible",
        "proof": "canonical-local-leaf-equivalence"
      }
    },
    {
      "schemaVersion": 1,
      "eligibleEntrypoints": [
        "edit",
        "impact",
        "pr"
      ],
      "minimumDepth": "local",
      "executionTarget": "child-safe",
      "deferredReason": null,
      "plannerDisposition": "planned",
      "blockedReason": null,
      "localProjection": null
    }
  ],
  "canonicalEntrypoints": {
    "tier": [
      {
        "tier": 0,
        "id": "edit",
        "commandRef": "verify:edit",
        "executionScope": "child-safe"
      },
      {
        "tier": 1,
        "id": "impact",
        "commandRef": "verify:impact",
        "executionScope": "child-safe"
      },
      {
        "tier": 2,
        "id": "pr",
        "commandRef": "verify:pr",
        "executionScope": "pr"
      },
      {
        "tier": 3,
        "id": "nightly",
        "commandRef": "verify:nightly",
        "executionScope": "nightly"
      },
      {
        "tier": 4,
        "id": "release",
        "commandRef": "verify:release",
        "executionScope": "release"
      }
    ],
    "productJourney": [
      {
        "id": "demo",
        "commandRef": "verify:demo",
        "consumer": "pr-verify-demo"
      }
    ]
  },
  "supersession": {
    "verify:supervisor-contracts": [
      "test:node:supervisor-contracts",
      "test:node:supervisor-routing"
    ],
    "verify:supervisor-plan": [
      "test:node:supervisor-plan"
    ],
    "verify:p4:p4-1": [
      "test:node:p4:p4-1",
      "test:python:p4:p4-1-boundary"
    ],
    "verify:p4:p4-2a": [
      "test:node:p4:p4-2a",
      "test:python:p4:p4-2a-boundary"
    ],
    "verify:p4:p4-2b": [
      "test:node:p4:p4-2b",
      "test:python:p4:p4-2b-boundary",
      "test:node:p4:state-writer-policy",
      "test:node:p4:state-writer-policy:quick"
    ],
    "verify:p4:p4-2c": [
      "test:node:p4:p4-2c",
      "test:python:p4:p4-2c-boundary",
      "test:node:p4:state-writer-policy",
      "test:node:p4:state-writer-policy:quick"
    ],
    "verify:p4:p4-3": [
      "test:node:p4:p4-3",
      "test:python:p4:p4-3-boundary",
      "verify:p4:state-writer-policy",
      "test:node:p4:state-writer-policy",
      "test:node:p4:state-writer-policy:quick"
    ],
    "verify:p4:state-writer-policy": [
      "test:node:p4:state-writer-policy",
      "test:node:p4:state-writer-policy:quick"
    ],
    "test:node:p4:state-writer-policy": [
      "test:node:p4:state-writer-policy:quick"
    ],
    "test:node:p4:p4-2a": [
      "test:node:scenario-apply-transaction-ownership",
      "test:node:scenario-lifecycle-runtime-behavior",
      "test:node:scenario-runtime-state-behavior"
    ],
    "test:node:p4:p4-2b": [
      "test:node:scenario-chunk-contracts"
    ],
    "test:node:p4:p4-3": [
      "test:node:renderer-render-phase-lifecycle",
      "test:node:zoom-interaction-lifecycle-owner"
    ],
    "verify:tno-coverage-chain": [
      "verify:scenario-contracts:strict",
      "verify:tno-coverage-ledger",
      "verify:tno-atlantropa-coverage",
      "verify:tno-polar-coverage",
      "test:node:scenario-chunk-contracts"
    ],
    "verify:pages-dist-and-drift": [
      "verify:pages-dist",
      "verify:dist-drift"
    ]
  },
  "records": [
    {
      "id": "node:test:node:political-partial-repaint-owner",
      "commandRef": "test:node:political-partial-repaint-owner",
      "sourceRefs": [
        "js/core/renderer/political_partial_repaint_owner.js",
        "tests/political_partial_repaint_owner_behavior.test.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": null,
      "selector": {}
    },
    {
      "id": "verify-core:test:node:political-partial-repaint-owner",
      "commandRef": "test:node:political-partial-repaint-owner",
      "sourceRefs": [
        "js/core/renderer/political_partial_repaint_owner.js",
        "package.json",
        "tests/political_partial_repaint_owner_behavior.test.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-political-partial-repaint-owner-boundary",
      "commandRef": "test:python:map-renderer-political-partial-repaint-owner-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "package.json",
        "tests/test_map_renderer_political_partial_repaint_owner_boundary_contract.py",
        "tools/check_architecture_boundaries.mjs",
        "tools/renderer_pass_family_inventory.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "node:test:node:political-background-render-owner",
      "commandRef": "test:node:political-background-render-owner",
      "sourceRefs": [
        "js/core/renderer/political_background_render_owner.js",
        "tests/political_background_render_owner_behavior.test.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": null,
      "selector": {}
    },
    {
      "id": "verify-core:test:node:political-background-render-owner",
      "commandRef": "test:node:political-background-render-owner",
      "sourceRefs": [
        "js/core/renderer/political_background_render_owner.js",
        "package.json",
        "tests/political_background_render_owner_behavior.test.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-political-background-render-owner-boundary",
      "commandRef": "test:python:map-renderer-political-background-render-owner-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/political_background_render_owner.js",
        "package.json",
        "tests/test_map_renderer_political_background_render_owner_boundary_contract.py",
        "tools/check_architecture_boundaries.mjs",
        "tools/renderer_pass_family_inventory.mjs"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "direct-e2e:test:e2e:dev:political-progressive-recovery",
      "commandRef": "test:e2e:dev:political-progressive-recovery",
      "sourceRefs": [
        "tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 155,
      "verification": null,
      "selector": {}
    },
    {
      "id": "direct-e2e:test:e2e:dev:scenario-chunk-runtime",
      "commandRef": "test:e2e:dev:scenario-chunk-runtime",
      "sourceRefs": [
        "tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 153,
      "verification": null,
      "selector": {}
    },
    {
      "id": "direct-e2e:test:e2e:dev:stage5-visual-acceptance",
      "commandRef": "test:e2e:dev:stage5-visual-acceptance",
      "sourceRefs": [
        "tests/e2e/dev/full_visual_acceptance.dev.spec.js"
      ],
      "ownerHints": [
        "dev-workspace"
      ],
      "domains": [
        "dev-workspace"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 154,
      "verification": null,
      "selector": {}
    },
    {
      "id": "direct-e2e:test:e2e:dev:tno-ready-state",
      "commandRef": "test:e2e:dev:tno-ready-state",
      "sourceRefs": [
        "tests/e2e/dev/tno_ready_state_contract.dev.spec.js"
      ],
      "ownerHints": [
        "tno-startup"
      ],
      "domains": [
        "tno-startup"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 152,
      "verification": null,
      "selector": {}
    },
    {
      "id": "direct-e2e:test:e2e:pages-public-release-gate",
      "commandRef": "test:e2e:pages-public-release-gate",
      "sourceRefs": [
        "tests/e2e/release/pages_public_release_gate.spec.js"
      ],
      "ownerHints": [
        "deploy-runtime"
      ],
      "domains": [
        "release-smoke"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "deploy-minimal"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 1,
      "verificationOrder": null,
      "selectorOrder": 156,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_label_i18n_redraw.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_label_i18n_redraw.spec.js",
      "sourceRefs": [
        "tests/e2e/city_label_i18n_redraw.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 105,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_lights_layer_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_lights_layer_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/city_lights_layer_regression.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 106,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_marker_visibility_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_marker_visibility_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/city_marker_visibility_regression.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 107,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_points_urban_runtime.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_points_urban_runtime.spec.js",
      "sourceRefs": [
        "tests/e2e/city_points_urban_runtime.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 108,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_reveal_plan_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_reveal_plan_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/city_reveal_plan_regression.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 109,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/city_urban_rendering_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/city_urban_rendering_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/city_urban_rendering_regression.spec.js"
      ],
      "ownerHints": [
        "map-city"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 110,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/dev_workspace_i18n.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/dev_workspace_i18n.spec.js",
      "sourceRefs": [
        "tests/e2e/dev_workspace_i18n.spec.js"
      ],
      "ownerHints": [
        "dev-workspace"
      ],
      "domains": [
        "dev-workspace"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 111,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/dev_workspace_render_boundary.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/dev_workspace_render_boundary.spec.js",
      "sourceRefs": [
        "tests/e2e/dev_workspace_render_boundary.spec.js"
      ],
      "ownerHints": [
        "dev-workspace"
      ],
      "domains": [
        "dev-workspace"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 112,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/hoi4_1939_ui_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/hoi4_1939_ui_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/hoi4_1939_ui_smoke.spec.js"
      ],
      "ownerHints": [
        "scenario-hoi4"
      ],
      "domains": [
        "hoi4-scenario"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "fast",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-smoke"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 113,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/hoi4_rk_russia_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/hoi4_rk_russia_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/hoi4_rk_russia_regression.spec.js"
      ],
      "ownerHints": [
        "scenario-hoi4"
      ],
      "domains": [
        "hoi4-scenario"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 114,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/interaction_funnel_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/interaction_funnel_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/interaction_funnel_contract.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "shell-interaction"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 115,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/main_shell_i18n.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/main_shell_i18n.spec.js",
      "sourceRefs": [
        "tests/e2e/main_shell_i18n.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "main-shell"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "fast",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-smoke"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 116,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/non_1962_runtime_matrix.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/non_1962_runtime_matrix.spec.js",
      "sourceRefs": [
        "tests/e2e/non_1962_runtime_matrix.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 117,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/physical_layer_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/physical_layer_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/physical_layer_regression.spec.js"
      ],
      "ownerHints": [
        "map-runtime"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 118,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/physical_layer_runtime_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/physical_layer_runtime_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/physical_layer_runtime_contract.spec.js"
      ],
      "ownerHints": [
        "map-runtime"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 119,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/project_save_load_roundtrip.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/project_save_load_roundtrip.spec.js",
      "sourceRefs": [
        "tests/e2e/project_save_load_roundtrip.spec.js"
      ],
      "ownerHints": [
        "project-persistence"
      ],
      "domains": [
        "project-io"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 120,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/review_regressions.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/review_regressions.spec.js",
      "sourceRefs": [
        "tests/e2e/review_regressions.spec.js"
      ],
      "ownerHints": [
        "review-runtime"
      ],
      "domains": [
        "review-workspace"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 121,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/river_layer_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/river_layer_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/river_layer_regression.spec.js"
      ],
      "ownerHints": [
        "map-runtime"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 122,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/sample_guide_deeplink.spec.js",
      "commandRef": "verify:demo",
      "sourceRefs": [
        "tests/e2e/sample_guide_deeplink.spec.js"
      ],
      "ownerHints": [
        "sample-guide"
      ],
      "domains": [
        "public-sample"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "demo"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 123,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_apply_concurrency.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_apply_concurrency.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_apply_concurrency.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 124,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_apply_resilience.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_apply_resilience.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_apply_resilience.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 125,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_blank_exit.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_blank_exit.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_blank_exit.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 126,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_boundary_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_boundary_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_boundary_regression.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 127,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_controls_dispatcher_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_controls_dispatcher_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_controls_dispatcher_contract.spec.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 128,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/scenario_shell_overlay_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/scenario_shell_overlay_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/scenario_shell_overlay_contract.spec.js"
      ],
      "ownerHints": [
        "scenario-shell"
      ],
      "domains": [
        "scenario-shell"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 129,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/shortcut_history_render_boundary.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/shortcut_history_render_boundary.spec.js",
      "sourceRefs": [
        "tests/e2e/shortcut_history_render_boundary.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "shortcut-history"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 130,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/sidebar_default_collapse.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/sidebar_default_collapse.spec.js",
      "sourceRefs": [
        "tests/e2e/sidebar_default_collapse.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "sidebar-shell"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 131,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/startup_bundle_recovery_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/startup_bundle_recovery_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/startup_bundle_recovery_contract.spec.js"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 132,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/strategic_overlay_counter_canvas_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_counter_canvas_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/strategic_overlay_counter_canvas_smoke.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "strategic-overlay"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 133,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/strategic_overlay_editing.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_editing.spec.js",
      "sourceRefs": [
        "tests/e2e/strategic_overlay_editing.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "strategic-overlay"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 134,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/strategic_overlay_roundtrip.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_roundtrip.spec.js",
      "sourceRefs": [
        "tests/e2e/strategic_overlay_roundtrip.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "strategic-overlay"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 135,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/strategic_overlay_sidebar_entry_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_sidebar_entry_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/strategic_overlay_sidebar_entry_smoke.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "strategic-overlay"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 136,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/strategic_overlay_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/strategic_overlay_smoke.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "strategic-overlay"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 137,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/texture_overlay_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/texture_overlay_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/texture_overlay_regression.spec.js"
      ],
      "ownerHints": [
        "overlay-runtime"
      ],
      "domains": [
        "texture-overlay"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 138,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/tno_1962_ui_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/tno_1962_ui_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/tno_1962_ui_smoke.spec.js"
      ],
      "ownerHints": [
        "scenario-tno"
      ],
      "domains": [
        "tno-scenario"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "fast",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-smoke"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 139,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/tno_named_water_rendering.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/tno_named_water_rendering.spec.js",
      "sourceRefs": [
        "tests/e2e/tno_named_water_rendering.spec.js"
      ],
      "ownerHints": [
        "scenario-tno"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 140,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/tno_open_ocean_rendering.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/tno_open_ocean_rendering.spec.js",
      "sourceRefs": [
        "tests/e2e/tno_open_ocean_rendering.spec.js"
      ],
      "ownerHints": [
        "scenario-tno"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 141,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/tno_startup_visible_context_layers_contract.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/tno_startup_visible_context_layers_contract.spec.js",
      "sourceRefs": [
        "tests/e2e/tno_startup_visible_context_layers_contract.spec.js"
      ],
      "ownerHints": [
        "scenario-tno"
      ],
      "domains": [
        "tno-startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 142,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/transport_phase_b_main_map_smoke.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/transport_phase_b_main_map_smoke.spec.js",
      "sourceRefs": [
        "tests/e2e/transport_phase_b_main_map_smoke.spec.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 147,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/transport_workbench_country_pack_loading.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_country_pack_loading.spec.js",
      "sourceRefs": [
        "tests/e2e/transport_workbench_country_pack_loading.spec.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 143,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/transport_workbench_industrial_variants.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js",
      "sourceRefs": [
        "tests/e2e/transport_workbench_industrial_variants.spec.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 144,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/transport_workbench_label_rotation.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_label_rotation.spec.js",
      "sourceRefs": [
        "tests/e2e/transport_workbench_label_rotation.spec.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 145,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/transport_workbench_port_coverage_tiers.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_port_coverage_tiers.spec.js",
      "sourceRefs": [
        "tests/e2e/transport_workbench_port_coverage_tiers.spec.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 146,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/ui_contract_foundation.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/ui_contract_foundation.spec.js",
      "sourceRefs": [
        "tests/e2e/ui_contract_foundation.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "ui-foundation"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "fast",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-smoke"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 148,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/ui_rework_mainline_shell_sidebar.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/ui_rework_mainline_shell_sidebar.spec.js",
      "sourceRefs": [
        "tests/e2e/ui_rework_mainline_shell_sidebar.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "ui-rework"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 149,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/ui_rework_support_transport_hardening.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/ui_rework_support_transport_hardening.spec.js",
      "sourceRefs": [
        "tests/e2e/ui_rework_support_transport_hardening.spec.js"
      ],
      "ownerHints": [
        "ui-shell"
      ],
      "domains": [
        "ui-rework"
      ],
      "tiers": [
        "feature"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 150,
      "verification": null,
      "selector": {}
    },
    {
      "id": "e2e:tests/e2e/water_cache_strategy_regression.spec.js",
      "commandRef": "node tools/e2e_layering.mjs run-spec tests/e2e/water_cache_strategy_regression.spec.js",
      "sourceRefs": [
        "tests/e2e/water_cache_strategy_regression.spec.js"
      ],
      "ownerHints": [
        "water-runtime"
      ],
      "domains": [
        "water-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 151,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:adaptive-recursion-policy",
      "commandRef": "node tools/run_adaptive_tests.mjs --entrypoint impact --execute --defer-main-thread",
      "sourceRefs": [
        "tools/run_adaptive_tests.mjs",
        "tests/fixtures/adaptive_local_cli_recursive.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 3,
      "verificationOrder": 4,
      "selectorOrder": null,
      "verification": {
        "commandType": "direct",
        "packageScriptRequired": false,
        "supervisorDomain": "test-routing",
        "routeRegistry": false
      },
      "selector": null
    },
    {
      "id": "infra:architecture-boundaries",
      "commandRef": "verify:architecture-boundaries",
      "sourceRefs": [
        "tools/check_architecture_boundaries.mjs",
        "js/core/map_renderer.js",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "tests/test_map_renderer_frame_compositor_owner_boundary_contract.py",
        "tests/test_map_renderer_political_pass_orchestrator_boundary_contract.py",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-cached-pass-compositor-owner-p2-2a-20260711.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-transformed-frame-compositor-owner-p2-2b-20260712.md",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "tests/click_selection_transaction_owner_behavior.test.mjs",
        "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
        "js/core/renderer/render_pipeline_passes.js",
        "js/core/renderer/viewport_resize_lifecycle_owner.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml",
        "package.json"
      ],
      "ownerHints": [
        "architecture"
      ],
      "domains": [
        "architecture-boundaries"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 11,
      "selectorOrder": 10,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "architecture-boundaries",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:browser-smoke-static-contract",
      "commandRef": "python -m unittest tests.test_playwright_app_ready_gate_contract -q",
      "sourceRefs": [
        "ops/browser-mcp/run-smoke-browser-inspection.sh",
        "ops/browser-mcp/inspection-profile.toml",
        "ops/browser-mcp/inspection-profile.schema.md",
        "tests/test_playwright_app_ready_gate_contract.py",
        "tools/browser_smoke_profile_contract.py"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "browser-smoke"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 89,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:core-verification-runner",
      "commandRef": "test:node:verify-core-runner",
      "sourceRefs": [
        "tools/run_core_verification.mjs",
        "tools/verification/resumable_verification.mjs",
        "tools/verification/command_supersession.mjs",
        "tests/fixtures/adaptive_local_cli_source_mismatch.json",
        "tests/fixtures/adaptive_local_cli_missing_selector.json",
        "tests/fixtures/adaptive_local_cli_renamed_selector.json",
        "tests/fixtures/adaptive_local_cli_valid.json",
        "tests/fixtures/adaptive_local_cli_recursive.json",
        "tests/verify_core_runner_behavior.test.mjs",
        "docs/testing/verify-core.md",
        "docs/active/test-verification-reform-20260813",
        "docs/active/mapcreator-recovery-gates-20260814",
        "package.json"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 6,
      "selectorOrder": 5,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:data-health",
      "commandRef": "python tools/data_health.py --json",
      "sourceRefs": [
        "tools/data_health.py",
        "tools/build_data_catalog.py",
        "data/CATALOG.json",
        "data/runtime_asset_registry.json",
        "data/scenarios/index.json"
      ],
      "ownerHints": [
        "data-governance"
      ],
      "domains": [
        "data-governance"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 103,
      "verification": null,
      "selector": {
        "guidance": {
          "taskEntry": [
            "Data catalog governance health gate"
          ],
          "ownerFiles": [
            "tools/data_health.py",
            "data/CATALOG.json",
            "data/runtime_asset_registry.json"
          ],
          "commonChecks": [
            "python tools/data_health.py --json"
          ],
          "riskSignals": [
            "catalog/runtime asset drift",
            "scenario registry coverage drift",
            "transport manifest path drift"
          ],
          "diagnostics": [
            "stdout JSON health report"
          ],
          "status": "active"
        }
      }
    },
    {
      "id": "infra:e2e-layer-manifest",
      "commandRef": "verify:test:e2e-layers",
      "sourceRefs": [
        "tools/e2e_layering.mjs",
        "tests/e2e/test-layer-manifest.json",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 2,
      "selectorOrder": 2,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:local-verification-closure",
      "commandRef": "verify:local-infra",
      "sourceRefs": [
        ".github/workflows/nightly-verification.yml",
        ".github/workflows/release-verification.yml",
        "package.json",
        "tests/test_e2e_structural_tooling.py",
        "tests/verification_metadata_behavior.test.mjs",
        "tests/verification_script_portfolio_behavior.test.mjs",
        "tests/verify_core_runner_behavior.test.mjs",
        "tools/ai_test_supervisor/domain_registry.json",
        "tools/run_adaptive_tests.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_profile_behavior.test.mjs",
        "tools/verification/verification_profile.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 5,
      "verificationOrder": 0,
      "selectorOrder": 0,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:pages-dist",
      "commandRef": "verify:pages-dist-and-drift",
      "sourceRefs": [
        "tools/build_pages_dist.py",
        "tests/test_pages_dist_startup_shell.py",
        "dist/pages-dist-manifest.json",
        "dist/app",
        "js/core/map_renderer.js",
        "js/core/map_renderer",
        "js/core/renderer",
        "js/core/renderer/cached_pass_compositor_owner.js",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "deploy-runtime"
      ],
      "domains": [
        "pages-dist"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "dist",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "deploy-minimal"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 1,
      "verificationOrder": 120,
      "selectorOrder": 86,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "pages",
        "supervisorDomain": "pages-dist",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:perf-gate",
      "commandRef": "perf:gate",
      "sourceRefs": [
        "tools/perf/run_baseline.mjs",
        "ops/browser-mcp/editor-performance-benchmark.py",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "perf-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "perf-pr-gate"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 93,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:perf-gate-contract",
      "commandRef": "verify:perf-gate-contract",
      "sourceRefs": [
        ".github/workflows/perf-pr-gate.yml",
        "docs/perf/baseline_2026-07-30-ratification.json",
        "ops/browser-mcp/editor-performance-benchmark.py",
        "tools/perf/run_baseline.mjs"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 88,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:playwright-observability",
      "commandRef": "python -m unittest tests.test_e2e_structural_tooling -q",
      "sourceRefs": [
        ".gitignore",
        "playwright.config.cjs",
        "tests/e2e/support/fixtures.js",
        "tests/e2e/support/playwright-app.js",
        "tests/e2e/support/reporters",
        "tests/e2e/support/playwright-selectors.js",
        "tests/e2e/support/expectations/console-allowlist.js",
        "tests/e2e/test-flake-budget.json",
        "tests/test_e2e_structural_tooling.py",
        "tools/run_adaptive_tests.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/test_timeout_inventory.mjs",
        "tools/check_console_allowlist_decay.mjs",
        "tools/check_test_timeout_guardrails.mjs",
        "tools/test_timing_summary.mjs",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 87,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:render-sample-role-policy",
      "commandRef": "test:node:render-sample-role-policy",
      "sourceRefs": [
        "tools/perf/render_sample_role_policy.mjs",
        "tools/perf/analyze_render_sample_roles.mjs",
        "tools/perf/run_baseline.mjs",
        "tools/perf/standard_perf_admission.mjs",
        "tests/render_sample_role_policy_behavior.test.mjs",
        "tests/perf_role_governed_report_behavior.test.mjs",
        "tests/test_perf_gate_contract.py",
        "docs/perf/baseline_2026-07-14.json",
        "docs/perf/baseline_2026-07-14.md",
        "docs/perf/baseline_2026-07-30.json",
        "docs/perf/baseline_2026-07-30.md",
        "docs/perf/baseline_2026-07-30-ratification.json",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/context.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/task.md",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 9,
      "selectorOrder": 8,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "perf",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:scenario-builder",
      "commandRef": "python tools/build_hoi4_scenario.py",
      "sourceRefs": [
        "tools/build_hoi4_scenario.py",
        "tools/build_startup_bundle.py",
        "scenario_builder"
      ],
      "ownerHints": [
        "scenario-builder"
      ],
      "domains": [
        "scenario-build"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "scenario-data",
        "checkpoint-builder",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 101,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:scenario-contracts-strict",
      "commandRef": "verify:scenario-contracts:strict",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "data/scenarios/tno_1962",
        ".github/workflows/scenario-contract-matrix.yml"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-contracts"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "scenario-contract-matrix"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 94,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:scenario-contracts-strict-full",
      "commandRef": "verify:scenario-contracts:strict",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "data/scenarios/tno_1962",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-contracts"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 96,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:scenario-contracts-strict-pr-fast",
      "commandRef": "verify:scenario-contracts:strict",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "data/scenarios/tno_1962",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-contracts"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 95,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:sf-ats-contracts",
      "commandRef": "verify:supervisor-contracts",
      "sourceRefs": [
        "AGENTS.md",
        "lessons learned.md",
        "docs/testing/sf-ats-overview.md",
        "docs/active/_worktree_registry.md",
        "docs/archive/sf-ats-wp2-supervisor-plan-20260702",
        "tools/ai_test_supervisor",
        "tests/supervisor_domain_registry_behavior.test.mjs",
        "tests/supervisor_schema_contracts.test.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 5,
      "selectorOrder": 4,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {
        "guidance": {
          "taskEntry": [
            "SF-ATS contract and schema health gate"
          ],
          "ownerFiles": [
            "AGENTS.md",
            "lessons learned.md",
            "docs/active/_worktree_registry.md",
            "docs/testing/sf-ats-overview.md",
            "tools/ai_test_supervisor",
            "tests/supervisor_domain_registry_behavior.test.mjs",
            "tests/supervisor_schema_contracts.test.mjs"
          ],
          "commonChecks": [
            "npm run verify:supervisor-contracts"
          ],
          "riskSignals": [
            "SF-ATS contract drift",
            "supervisor schema drift",
            "domain registry drift",
            "agent verification contract drift"
          ],
          "diagnostics": [
            ".runtime/reports/generated/test-adaptive-selection.json",
            ".runtime/reports/generated/test-adaptive-selection.md"
          ],
          "status": "active"
        }
      }
    },
    {
      "id": "infra:test-console-allowlist",
      "commandRef": "verify:test-console-allowlist",
      "sourceRefs": [
        "tools/check_console_allowlist_decay.mjs",
        "tests/e2e/support/expectations/console-allowlist.js",
        "tests/e2e/test-flake-budget.json",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 91,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:test-import-graph",
      "commandRef": "verify:test-import-graph",
      "sourceRefs": [
        "tools/build_test_import_graph.mjs",
        "tools/check_test_import_graph.mjs",
        "tests/e2e/test-import-graph.json",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 10,
      "selectorOrder": 9,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:test-timeout-guardrails",
      "commandRef": "verify:test-timeout-guardrails",
      "sourceRefs": [
        "tools/check_test_timeout_guardrails.mjs",
        "tests/e2e/test-layer-manifest.json",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 92,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:test-timeout-inventory",
      "commandRef": "verify:test-timeout-inventory",
      "sourceRefs": [
        "tools/test_timeout_inventory.mjs",
        "tests/e2e/test-layer-manifest.json",
        "tests/e2e/test-import-graph.json",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 90,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:tno-atlantropa-coverage",
      "commandRef": "verify:tno-atlantropa-coverage",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "data/scenarios/tno_1962/scenario_atlantropa_metadata.json",
        "data/scenarios/tno_1962/chunks"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "tno-coverage-chain"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "scenario-contract-matrix"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 98,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:tno-coverage-chain",
      "commandRef": "verify:tno-coverage-chain",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "tools/validate_tno_water_geometries.py",
        "tests/scenario_chunk_contracts.test.mjs",
        "data/scenarios/tno_1962"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "tno-coverage-chain"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 100,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:tno-coverage-ledger",
      "commandRef": "verify:tno-coverage-ledger",
      "sourceRefs": [
        "tools/check_scenario_contracts.py",
        "data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json",
        "data/scenarios/tno_1962/derived/geometry_drop_audit.json"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "tno-coverage-chain"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "scenario-contract-matrix"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 97,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:tno-polar-coverage",
      "commandRef": "verify:tno-polar-coverage",
      "sourceRefs": [
        "tools/validate_tno_water_geometries.py",
        "data/scenarios/tno_1962/runtime_topology.topo.json",
        "data/scenarios/tno_1962/water_regions.geojson"
      ],
      "ownerHints": [
        "tno-water"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 99,
      "verification": null,
      "selector": {}
    },
    {
      "id": "infra:tno-water-validator",
      "commandRef": "python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json",
      "sourceRefs": [
        "tools/validate_tno_water_geometries.py",
        "data/scenarios/tno_1962/water_regions.geojson",
        "data/scenarios/tno_1962/runtime_topology.topo.json",
        "data/scenarios/tno_1962/runtime_topology.bootstrap.topo.json",
        "data/scenarios/tno_1962/detail_chunks.manifest.json",
        "data/scenarios/tno_1962/chunks/water"
      ],
      "ownerHints": [
        "tno-water"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 102,
      "verification": null,
      "selector": {
        "guidance": {
          "taskEntry": [
            "TNO water geometry health gate"
          ],
          "ownerFiles": [
            "tools/validate_tno_water_geometries.py",
            "data/scenarios/tno_1962/water_regions.geojson",
            "data/scenarios/tno_1962/detail_chunks.manifest.json"
          ],
          "commonChecks": [
            "python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json"
          ],
          "riskSignals": [
            "water geometry source/runtime drift",
            "chunk manifest coverage drift",
            "D3 spherical safety regression"
          ],
          "diagnostics": [
            ".runtime/reports/generated/tno_water_geometry_report.json"
          ],
          "status": "active"
        }
      }
    },
    {
      "id": "infra:transport-manifest-contracts",
      "commandRef": "python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json",
      "sourceRefs": [
        "tools/check_transport_workbench_manifests.py",
        "map_builder/transport_workbench_contracts.py",
        "data/transport_layers"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 104,
      "verification": null,
      "selector": {
        "guidance": {
          "taskEntry": [
            "Transport workbench manifest health gate"
          ],
          "ownerFiles": [
            "tools/check_transport_workbench_manifests.py",
            "map_builder/transport_workbench_contracts.py",
            "data/transport_layers"
          ],
          "commonChecks": [
            "python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json"
          ],
          "riskSignals": [
            "transport family manifest drift",
            "coverage variant path drift",
            "runtime workbench contract drift"
          ],
          "diagnostics": [
            ".runtime/reports/generated/transport_workbench_manifest_report.json"
          ],
          "status": "active"
        }
      }
    },
    {
      "id": "infra:verification-metadata",
      "commandRef": "test:node:verification-metadata",
      "sourceRefs": [
        "tools/verification/verification_domains.mjs",
        "tools/verification/verification_metadata_helpers.mjs",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/testing/verification-metadata.md",
        "package.json"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 7,
      "selectorOrder": 6,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:verification-profile",
      "commandRef": "test:node:verification-profile",
      "sourceRefs": [
        ".github/workflows/nightly-verification.yml",
        ".github/workflows/release-verification.yml",
        "package.json",
        "tests/test_e2e_structural_tooling.py",
        "tests/verification_metadata_behavior.test.mjs",
        "tests/verification_script_portfolio_behavior.test.mjs",
        "tests/verify_core_runner_behavior.test.mjs",
        "tools/ai_test_supervisor/domain_registry.json",
        "tools/run_adaptive_tests.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_profile_behavior.test.mjs",
        "tools/verification/verification_profile.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 6,
      "verificationOrder": 1,
      "selectorOrder": 1,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:verification-script-portfolio",
      "commandRef": "verify:script-portfolio",
      "sourceRefs": [
        "package.json",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/command_supersession.mjs",
        "tests/verification_script_portfolio_behavior.test.mjs",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml",
        ".github/workflows/nightly-verification.yml",
        ".github/workflows/release-verification.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 8,
      "selectorOrder": 7,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:verification-selector",
      "commandRef": "node tools/select_verification_targets.mjs --check",
      "sourceRefs": [
        ".github/workflows/nightly-verification.yml",
        ".github/workflows/release-verification.yml",
        "package.json",
        "tests/test_e2e_structural_tooling.py",
        "tests/verification_metadata_behavior.test.mjs",
        "tests/verification_script_portfolio_behavior.test.mjs",
        "tests/verify_core_runner_behavior.test.mjs",
        "tools/ai_test_supervisor/domain_registry.json",
        "tools/run_adaptive_tests.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_profile_behavior.test.mjs",
        "tools/verification/verification_profile.mjs",
        ".gitignore",
        "tools/verification/command_supersession.mjs",
        ".github/workflows/pr-verify.yml",
        ".github/workflows/verify-shared.yml"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 6,
      "verificationOrder": 3,
      "selectorOrder": 3,
      "verification": {
        "commandType": "direct",
        "packageScriptRequired": false,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:williams-crossover-governance",
      "commandRef": "test:node:williams-crossover-governance",
      "sourceRefs": [
        "tools/perf/williams_crossover_policy.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tools/perf/williams_crossover_windows_job_runner.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tools/process_containment/ordered_source_set_identity.mjs",
        "tools/perf/williams_crossover_power_scheme.ps1",
        "tools/perf/run_baseline.mjs",
        "tools/perf/render_sample_role_policy.mjs",
        "tests/williams_crossover_governance_behavior.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/plan.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/context.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/task.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/rerun07-final-repeat-governance.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/rerun08-harness-recovery-governance.md",
        "docs/active/_worktree_registry.md",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 87,
      "selectorOrder": 74,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "perf",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:williams-crossover-job-runner",
      "commandRef": "test:node:williams-crossover-job-runner",
      "sourceRefs": [
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tools/perf/williams_crossover_windows_job_runner.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tools/process_containment/ordered_source_set_identity.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/williams_crossover_policy.mjs",
        "tests/williams_crossover_windows_job_runner_behavior.test.mjs",
        "tests/williams_crossover_windows_job_runner_integration.test.mjs",
        "tests/williams_crossover_governance_behavior.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/plan.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/context.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/task.md",
        "docs/active/_worktree_registry.md",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 88,
      "selectorOrder": 75,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "perf",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:windows-job-runtime-contract",
      "commandRef": "test:node:windows-job-runtime",
      "sourceRefs": [
        "tools/process_containment/windows_job_runtime.mjs",
        "tools/process_containment/windows_job_runner_v2.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tests/windows_job_runner_v2_native_contract.test.mjs",
        "tests/windows_job_runtime_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "process-containment"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 85,
      "selectorOrder": 72,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "infra:windows-job-runtime-integration",
      "commandRef": "test:node:windows-job-runtime:integration",
      "sourceRefs": [
        "tools/process_containment/windows_job_runtime.mjs",
        "tools/process_containment/windows_job_runner_v2.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tests/windows_job_runtime_integration.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "process-containment"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "contract",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 86,
      "selectorOrder": 73,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "test-routing",
        "routeRegistry": true,
        "optionalMainThread": true
      },
      "selector": {}
    },
    {
      "id": "node:test:node:annotation-productization",
      "commandRef": "test:node:annotation-productization",
      "sourceRefs": [
        "tests/file_manager_project_roundtrip_behavior.test.mjs",
        "tests/export_workbench_state_behavior.test.mjs",
        "tests/strategic_overlay_runtime_owner_behavior.test.mjs",
        "js/core/file_manager.js",
        "js/core/intensity_field.js",
        "js/core/interaction_funnel.js",
        "js/core/project_package_io.js",
        "js/core/state.js",
        "js/core/state/appearance_preset_state.js",
        "js/core/state/index.js",
        "js/core/state/intensity_field_state.js",
        "js/core/transport_capability_registry.js",
        "vendor/fflate.browser.js",
        "js/core/export_artifact_package.js",
        "js/core/state/ui_state.js",
        "js/core/state_defaults.js",
        "js/ui/toolbar/export_artifact_model.js",
        "js/ui/toolbar/export_workbench_controller.js",
        "js/core/renderer/strategic_overlay_runtime_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 218,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-border-owner",
      "commandRef": "test:node:appearance-border-owner",
      "sourceRefs": [
        "tests/appearance_border_owner_behavior.test.mjs",
        "js/ui/toolbar/appearance_border_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 167,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-city-points-owner",
      "commandRef": "test:node:appearance-city-points-owner",
      "sourceRefs": [
        "tests/appearance_city_points_owner_behavior.test.mjs",
        "js/ui/toolbar/appearance_city_points_owner.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 166,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-parent-border-owner",
      "commandRef": "test:node:appearance-parent-border-owner",
      "sourceRefs": [
        "tests/appearance_parent_border_owner_behavior.test.mjs",
        "js/ui/toolbar/appearance_parent_border_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 168,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-physical-owner",
      "commandRef": "test:node:appearance-physical-owner",
      "sourceRefs": [
        "tests/appearance_physical_owner_behavior.test.mjs",
        "js/core/state.js",
        "js/ui/toolbar/appearance_physical_owner.js",
        "js/ui/toolbar/intensity_field_editor_section.js"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 169,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-presets",
      "commandRef": "test:node:appearance-presets",
      "sourceRefs": [
        "tests/appearance_preset_state.node.test.mjs",
        "tests/appearance_presets_owner_behavior.test.mjs",
        "tests/appearance_preset_history.node.test.mjs",
        "js/core/state.js",
        "js/ui/toolbar/appearance_presets_owner.js",
        "js/core/history_manager.js",
        "js/core/state/ui_state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 170,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-reference-owner",
      "commandRef": "test:node:appearance-reference-owner",
      "sourceRefs": [
        "tests/appearance_reference_owner_behavior.test.mjs",
        "js/ui/toolbar/appearance_reference_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 172,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-rivers-owner",
      "commandRef": "test:node:appearance-rivers-owner",
      "sourceRefs": [
        "tests/appearance_rivers_owner_behavior.test.mjs",
        "js/ui/toolbar/appearance_rivers_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 173,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-texture-owner",
      "commandRef": "test:node:appearance-texture-owner",
      "sourceRefs": [
        "tests/appearance_texture_owner_behavior.test.mjs",
        "js/core/state.js",
        "js/ui/toolbar/appearance_texture_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 174,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:appearance-transport-change-set",
      "commandRef": "test:node:appearance-transport-change-set",
      "sourceRefs": [
        "tests/appearance_transport_change_set_contract_behavior.test.mjs",
        "tests/appearance_transport_operation_behavior.test.mjs",
        "js/core/appearance_transport_change_set.js",
        "js/core/appearance_transport_change_set_contract.js",
        "tests/helpers/appearance_transport_change_set_fixtures.mjs",
        "js/core/appearance_transport_operation.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 171,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:backend-cloud-support",
      "commandRef": "test:node:backend-cloud-support",
      "sourceRefs": [
        "tests/backend_client_behavior.test.mjs",
        "tests/project_support_diagnostics_controller_behavior.test.mjs",
        "tests/backend_console_helpers.test.mjs",
        "js/core/dirty_state.js",
        "js/core/state.js",
        "js/core/state/index.js",
        "js/ui/sidebar/project_support_diagnostics_controller.js",
        "vendor/fflate.browser.js",
        "backend/backend_console_helpers.js"
      ],
      "ownerHints": [
        "backend-cloud-support"
      ],
      "domains": [
        "backend-cloud-support"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 188,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:backend-console-helpers",
      "commandRef": "test:node:backend-console-helpers",
      "sourceRefs": [
        "tests/backend_console_helpers.test.mjs",
        "backend/backend_console_helpers.js"
      ],
      "ownerHints": [
        "backend-cloud-support"
      ],
      "domains": [
        "backend-cloud-support"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 189,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:border-draw-owner-behavior",
      "commandRef": "test:node:border-draw-owner-behavior",
      "sourceRefs": [
        "tests/border_draw_owner_behavior.test.mjs",
        "js/core/renderer/border_draw_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 323,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:border-mesh-owner-behavior",
      "commandRef": "test:node:border-mesh-owner-behavior",
      "sourceRefs": [
        "tests/border_mesh_owner_behavior.test.mjs",
        "js/core/renderer/border_mesh_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 324,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:cached-pass-compositor-owner",
      "commandRef": "test:node:cached-pass-compositor-owner",
      "sourceRefs": [
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "js/core/renderer/cached_pass_compositor_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 285,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:cached-pass-compositor-owner-suite",
      "commandRef": "test:node:cached-pass-compositor-owner-suite",
      "sourceRefs": [
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "js/core/renderer/cached_pass_compositor_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 286,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:canvas-layer-manager",
      "commandRef": "test:node:canvas-layer-manager",
      "sourceRefs": [
        "tests/canvas_layer_manager_behavior.test.mjs",
        "js/core/map_renderer/canvas_layer_manager.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 325,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:city-lights-assets",
      "commandRef": "test:node:city-lights-assets",
      "sourceRefs": [
        ".gitattributes",
        "tests/city_lights_asset_contract.test.mjs",
        "tests/test_data_manifest_contract.py",
        "tests/fixtures/city_lights/.gitattributes",
        "tests/fixtures/city_lights/modern_source_fixture.pgm",
        "tests/fixtures/city_lights/modern_source_fixture_descriptor.json",
        "tools/build_city_lights_modern_asset.py",
        "data/CATALOG.json",
        "data/CATALOG.md",
        "data/city_lights/.gitattributes",
        "data/city_lights/modern_source_descriptor.json",
        "data/city_lights/historical_1930_entries.json",
        "data/manifest.json",
        "data/runtime_asset_registry.json",
        "data/source_ledger.json",
        "js/core/city_lights_modern_asset.js",
        "js/core/city_lights_historical_1930_asset.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 157,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:city-lights-render-owner",
      "commandRef": "test:node:city-lights-render-owner",
      "sourceRefs": [
        "tests/city_lights_render_owner_behavior.test.mjs",
        "js/core/renderer/city_lights_render_owner.js",
        "js/core/state_defaults.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 128,
      "selectorOrder": 158,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "city-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "node:test:node:city-points-render-owner",
      "commandRef": "test:node:city-points-render-owner",
      "sourceRefs": [
        "tests/city_points_render_owner_behavior.test.mjs",
        "tests/urban_city_policy_strategic_values_behavior.test.mjs",
        "js/core/renderer/city_points_render_owner.js",
        "js/core/renderer/urban_city_policy.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 165,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:click-selection-transaction-owner",
      "commandRef": "test:node:click-selection-transaction-owner",
      "sourceRefs": [
        "tests/click_selection_transaction_owner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 289,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:context-pass-orchestrator-owner",
      "commandRef": "test:node:context-pass-orchestrator-owner",
      "sourceRefs": [
        "tests/context_pass_orchestrator_owner_behavior.test.mjs",
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 343,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:country-inspector-controller",
      "commandRef": "test:node:country-inspector-controller",
      "sourceRefs": [
        "tests/country_inspector_controller_behavior.test.mjs",
        "js/core/i18n_catalog.js",
        "js/ui/sidebar/country_inspector_controller.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 237,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:data-service-runtime",
      "commandRef": "test:node:data-service-runtime",
      "sourceRefs": [
        "tests/data_service_runtime_behavior.test.mjs",
        "js/core/data_service.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 160,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:deferred-bootstrap",
      "commandRef": "test:node:deferred-bootstrap",
      "sourceRefs": [
        "tests/deferred_vendor_loader_behavior.test.mjs",
        "tests/deferred_ui_bootstrap_behavior.test.mjs",
        "tests/main_deferred_bootstrap_boundary.test.mjs",
        "js/bootstrap/deferred_vendor_loader.js",
        "js/bootstrap/deferred_ui_bootstrap.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 185,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:dev-workspace-selection-ownership",
      "commandRef": "test:node:dev-workspace-selection-ownership",
      "sourceRefs": [
        "tests/dev_workspace_selection_ownership_behavior.test.mjs",
        "js/core/sovereignty_manager.js",
        "js/core/state.js",
        "js/ui/dev_workspace/selection_ownership_controller.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 231,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:draw-canvas-orchestration-owner",
      "commandRef": "test:node:draw-canvas-orchestration-owner",
      "sourceRefs": [
        "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 283,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:draw-canvas-orchestration-owner-suite",
      "commandRef": "test:node:draw-canvas-orchestration-owner-suite",
      "sourceRefs": [
        "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 284,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:exact-after-settle-pass-catalog",
      "commandRef": "test:node:exact-after-settle-pass-catalog",
      "sourceRefs": [
        "tests/exact_after_settle_pass_catalog_behavior.test.mjs",
        "js/core/map_renderer/exact_after_settle_refresh_plans.js",
        "js/core/map_renderer/render_pass_catalog.js",
        "js/core/renderer/exact_after_settle_pass_catalog.js",
        "js/core/renderer/render_pipeline_catalog.js",
        "js/core/renderer/render_pipeline_passes.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 228,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:exact-after-settle-refresh-plans",
      "commandRef": "test:node:exact-after-settle-refresh-plans",
      "sourceRefs": [
        "tests/exact_after_settle_refresh_plans_behavior.test.mjs",
        "js/core/map_renderer/exact_after_settle_refresh_plans.js",
        "js/core/renderer/exact_after_settle_pass_catalog.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 227,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hgo-identity-resolver",
      "commandRef": "test:node:hgo-identity-resolver",
      "sourceRefs": [
        "tests/hgo_identity_resolver.node.test.mjs",
        "js/core/hgo_identity_resolver.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 232,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hgo-projection-model",
      "commandRef": "test:node:hgo-projection-model",
      "sourceRefs": [
        "tests/hgo_projection_model.node.test.mjs",
        "js/core/hgo_projection_model.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 234,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hgo-raster-renderer",
      "commandRef": "test:node:hgo-raster-renderer",
      "sourceRefs": [
        "tests/hgo_raster_renderer.node.test.mjs",
        "js/core/hgo_raster_renderer.js",
        "js/core/hgo_runtime_asset_loader.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 235,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hgo-runtime-index",
      "commandRef": "test:node:hgo-runtime-index",
      "sourceRefs": [
        "tests/hgo_runtime_index.node.test.mjs",
        "js/core/hgo_runtime_index.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 233,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hgo-runtime-preview",
      "commandRef": "test:node:hgo-runtime-preview",
      "sourceRefs": [
        "tests/hgo_runtime_preview.node.test.mjs",
        "tests/hgo_runtime_preview_toolbar.node.test.mjs",
        "js/core/hgo_runtime_preview.js",
        "js/core/map_renderer/hgo_runtime_preview_frame_commit.js",
        "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
        "js/ui/toolbar/hgo_runtime_preview_controller.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 236,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hit-canvas-scheduling-owner",
      "commandRef": "test:node:hit-canvas-scheduling-owner",
      "sourceRefs": [
        "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
        "js/core/map_renderer/hit_canvas_scheduling_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 297,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hit-canvas-scheduling-owner-inventory",
      "commandRef": "test:node:hit-canvas-scheduling-owner-inventory",
      "sourceRefs": [
        "tests/hit_canvas_scheduling_owner_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 298,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:hit-canvas-scheduling-owner-suite",
      "commandRef": "test:node:hit-canvas-scheduling-owner-suite",
      "sourceRefs": [
        "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
        "tests/hit_canvas_scheduling_owner_inventory.test.mjs",
        "tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs",
        "js/core/map_renderer/hit_canvas_scheduling_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 299,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:intensity-field",
      "commandRef": "test:node:intensity-field",
      "sourceRefs": [
        "tests/intensity_field.node.test.mjs",
        "js/core/intensity_field.js",
        "js/core/state/intensity_field_state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 161,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:intensity-field-mask",
      "commandRef": "test:node:intensity-field-mask",
      "sourceRefs": [
        "tests/intensity_field_mask_owner.node.test.mjs",
        "js/core/renderer/intensity_field_mask_owner.js",
        "js/core/state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 162,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:interaction-hit-candidates",
      "commandRef": "test:node:interaction-hit-candidates",
      "sourceRefs": [
        "tests/interaction_hit_candidates_behavior.test.mjs",
        "js/core/map_renderer/interaction_hit_candidates.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 229,
      "verification": null,
      "selector": {}
    },
    {
      "id": "landing:map-asset-contracts",
      "commandRef": "test:py:landing-map-asset-contracts",
      "sourceRefs": [
        "tests/test_landing_map_asset_contracts.py",
        "tools/build_landing_europe_1936_showcase.py",
        "tools/build_landing_japan_preview.py",
        "tools/build_landing_work_maps.py",
        "tools/rasterize_landing_assets.py",
        "landing/assets/europe-1936-showcase.json",
        "landing/assets/europe-1936-showcase.svg",
        "landing/assets/hero-blank.json",
        "landing/assets/hero-blank.svg",
        "landing/assets/hero-hoi4-1936.json",
        "landing/assets/hero-hoi4-1936.svg",
        "landing/assets/hero-hoi4-1939.json",
        "landing/assets/hero-hoi4-1939.svg",
        "landing/assets/hero-tno-1962.json",
        "landing/assets/hero-tno-1962.svg",
        "landing/assets/japan-preview.json",
        "landing/assets/japan-preview-cities.svg",
        "landing/assets/japan-preview-night.svg",
        "landing/assets/japan-preview-terrain.svg",
        "landing/assets/japan-preview-transport.svg",
        "landing/assets/work-alt-history-med.json",
        "landing/assets/work-alt-history-med.svg",
        "landing/assets/work-atlas-japan-corridor.json",
        "landing/assets/work-atlas-japan-corridor.svg",
        "landing/assets/work-scenario-switch-europe.json",
        "landing/assets/work-scenario-switch-europe.svg"
      ],
      "ownerHints": [
        "public-demo"
      ],
      "domains": [
        "public-sample"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 379,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "public-sample",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "node:test:node:landing-showcase-view",
      "commandRef": "test:node:landing-showcase-view",
      "sourceRefs": [
        "tests/landing_showcase_view_behavior.test.mjs",
        "landing/app.js",
        "landing/assets/europe-1936-showcase.svg",
        "landing/index.html"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 347,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:layer-panel-contracts",
      "commandRef": "test:node:layer-panel-contracts",
      "sourceRefs": [
        "tests/layer_panel_contracts_behavior.test.mjs",
        "data/thematic_layers/index.json",
        "js/core/state/content_state.js",
        "js/core/state/ui_state.js",
        "js/core/transport_capability_registry.js",
        "js/ui/toolbar/layer_panel_contracts.js",
        "js/ui/toolbar/layer_status_diagnostics.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 175,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:layer-status-diagnostics",
      "commandRef": "test:node:layer-status-diagnostics",
      "sourceRefs": [
        "tests/layer_status_diagnostics_behavior.test.mjs",
        "js/core/state/content_state.js",
        "js/core/state/ui_state.js",
        "js/core/thematic_layer_catalog.js",
        "js/ui/toolbar/layer_status_diagnostics.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 176,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:legend-generation",
      "commandRef": "test:node:legend-generation",
      "sourceRefs": [
        "tests/legend_manager_generation_behavior.test.mjs",
        "js/core/legend_manager.js",
        "js/core/state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 240,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:main-bootstrap-wiring",
      "commandRef": "test:node:main-bootstrap-wiring",
      "sourceRefs": [
        "tests/main_bootstrap_wiring_boundary.test.mjs",
        "js/core/state/content_state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 186,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:main-runtime-diagnostics",
      "commandRef": "test:node:main-runtime-diagnostics",
      "sourceRefs": [
        "tests/main_runtime_diagnostics_behavior.test.mjs",
        "tests/main_runtime_diagnostics_boundary.test.mjs",
        "js/bootstrap/main_runtime_diagnostics.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 181,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:map-hover-interaction",
      "commandRef": "test:node:map-hover-interaction",
      "sourceRefs": [
        "tests/map_hover_interaction_owner_behavior.test.mjs",
        "tests/map_hover_interaction_owner_inventory.test.mjs",
        "js/core/map_renderer/map_hover_interaction_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 303,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:map-hover-interaction-inventory",
      "commandRef": "test:node:map-hover-interaction-inventory",
      "sourceRefs": [
        "tests/map_hover_interaction_owner_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 302,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:map-hover-interaction-owner",
      "commandRef": "test:node:map-hover-interaction-owner",
      "sourceRefs": [
        "tests/map_hover_interaction_owner_behavior.test.mjs",
        "js/core/map_renderer/map_hover_interaction_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 301,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:map-interaction-event-binding-owner",
      "commandRef": "test:node:map-interaction-event-binding-owner",
      "sourceRefs": [
        "tests/map_interaction_event_binding_owner_behavior.test.mjs",
        "js/core/renderer/map_interaction_event_binding_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 315,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:modern-city-lights-owner",
      "commandRef": "test:node:modern-city-lights-owner",
      "sourceRefs": [
        "tests/city_lights_render_owner_behavior.test.mjs",
        "js/core/renderer/city_lights_render_owner.js",
        "js/core/state_defaults.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 159,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:ocean-depth-layer-contracts",
      "commandRef": "test:node:ocean-depth-layer-contracts",
      "sourceRefs": [
        "tests/ocean_depth_layer_contracts.test.mjs",
        "js/core/renderer/political_background_render_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 163,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:ocean-render-owner",
      "commandRef": "test:node:ocean-render-owner",
      "sourceRefs": [
        "tests/ocean_render_owner_behavior.test.mjs",
        "js/core/renderer/ocean_render_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 164,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:p4-1",
      "commandRef": "test:node:p4:p4-1",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/boot_actions_behavior.test.mjs",
        "tests/startup_boot_overlay_behavior.test.mjs",
        "tests/startup_bootstrap_support_behavior.test.mjs",
        "tests/post_ready_scheduler_behavior.test.mjs",
        "tests/ui_shell_boot_behavior.test.mjs",
        "tests/startup_hydration_behavior.test.mjs",
        "tests/sample_project_contracts.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tools/run_p4_phase_verification.mjs",
        "js/core/state/actions/boot_actions.js",
        "js/core/state/boot_state.js",
        "js/bootstrap/startup_boot_overlay.js",
        "js/core/state.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/core/state/actions/renderer_diagnostics_actions.js",
        "js/bootstrap/post_ready_scheduler.js",
        "js/bootstrap/ui_shell_boot.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/startup_cache.js",
        "js/bootstrap/startup_sample_project_deeplink.js",
        "js/core/file_manager.js",
        "js/core/sample_export_recommendation.js",
        "js/core/sample_project_import_workflow.js",
        "js/core/sample_project_registry.js",
        "js/core/state/index.js",
        "js/ui/toolbar/export_workbench_controller.js",
        "js/ui/toolbar/sample_project_banner_controller.js",
        "js/ui/ui_surface_url_state.js",
        "tools/build_state_writer_policy.mjs",
        "tools/state_writer_inventory.mjs"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 205,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:p4-2a",
      "commandRef": "test:node:p4:p4-2a",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_apply_transaction_ownership.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/build_state_writer_policy.mjs",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/scenario/shared.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/palette_manager.js",
        "js/core/political_raster_worker_client.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario/presentation_ocean_fill_restore.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario_manager.js",
        "js/core/scenario_post_apply_effects.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/state.js",
        "js/core/state/index.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/scenario/chunk_runtime.js"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 207,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:p4-2b",
      "commandRef": "test:node:p4:p4-2b",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/scenario_chunk_state_actions_behavior.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/helpers/scenario_chunk_contract_support.mjs",
        "tests/scenario_chunk_promotion_helpers_behavior.test.mjs",
        "tests/scenario_refresh_plans_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/build_state_writer_policy.mjs",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/feature_identity.js",
        "js/core/frame_scheduler.js",
        "js/core/political_raster_worker_client.js",
        "js/core/renderer/color_resolution_strategy.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/scenario_chunk_manager.js",
        "js/core/scenario_runtime_queries.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/renderer/scenario_chunk_promotion_helpers.js",
        "js/core/map_renderer/scenario_refresh_plans.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/renderer/context_layer_resolver.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/scenario/shared.js",
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/palette_manager.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario/presentation_ocean_fill_restore.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario_manager.js",
        "js/core/scenario_post_apply_effects.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/state.js",
        "js/core/state/index.js"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 208,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:p4-2c",
      "commandRef": "test:node:p4:p4-2c",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/scenario_health_actions_behavior.test.mjs",
        "tests/startup_hydration_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/build_state_writer_policy.mjs",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/scenario/presentation_display_restore.js",
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/index.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/startup_cache.js",
        "js/core/palette_manager.js",
        "js/core/political_raster_worker_client.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario/presentation_ocean_fill_restore.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario_manager.js",
        "js/core/scenario_post_apply_effects.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/state.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/scenario/shared.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 209,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:p4-3",
      "commandRef": "test:node:p4:p4-3",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/renderer_phase_actions_behavior.test.mjs",
        "tests/renderer_interaction_actions_behavior.test.mjs",
        "tests/renderer_exact_refresh_actions_behavior.test.mjs",
        "tests/render_pass_cache_state_normalizer_behavior.test.mjs",
        "tests/renderer_cache_actions_behavior.test.mjs",
        "tests/renderer_diagnostics_actions_behavior.test.mjs",
        "tests/render_perf_metrics_runtime_owner_behavior.test.mjs",
        "tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs",
        "tests/renderer_render_phase_lifecycle_inventory.test.mjs",
        "tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
        "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_runtime_state_behavior.test.mjs",
        "tests/physical_layer_contracts.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/helpers/scenario_chunk_contract_support.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/build_state_writer_policy.mjs",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/renderer/render_pass_cache_state_normalizer.js",
        "js/core/state/actions/renderer_cache_actions.js",
        "js/core/state/renderer_runtime_state.js",
        "js/core/renderer/render_perf_metrics_runtime_owner.js",
        "js/core/state/actions/renderer_diagnostics_actions.js",
        "js/core/map_renderer/render_phase_lifecycle_owner.js",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/renderer/spatial_index_runtime_derivation.js",
        "js/core/renderer/spatial_index_runtime_state_ops.js",
        "js/core/state/actions/renderer_exact_refresh_actions.js",
        "js/core/state/border_cache_state.js",
        "js/core/state/spatial_index_state.js",
        "js/core/state/ui_state.js",
        "js/core/transport_capability_registry.js",
        "js/core/feature_identity.js",
        "js/core/frame_scheduler.js",
        "js/core/political_raster_worker_client.js",
        "js/core/renderer/color_resolution_strategy.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/scenario_chunk_manager.js",
        "js/core/scenario_runtime_queries.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 210,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:phase-verification-runner",
      "commandRef": "test:node:p4:phase-verification-runner",
      "sourceRefs": [
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tools/run_p4_phase_verification.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 204,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:state-writer-policy",
      "commandRef": "test:node:p4:state-writer-policy",
      "sourceRefs": [
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/process_containment/windows_job_runtime.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 202,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:p4:state-writer-policy:quick",
      "commandRef": "test:node:p4:state-writer-policy:quick",
      "sourceRefs": [
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/process_containment/windows_job_runtime.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 203,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:palette-runtime-bridge",
      "commandRef": "test:node:palette-runtime-bridge",
      "sourceRefs": [
        "tests/palette_runtime_bridge.node.test.mjs",
        "data/country_feature_policies.json",
        "js/core/color_hex_utils.js",
        "js/core/color_manager.js",
        "js/core/color_resolver.js",
        "js/core/country_code_aliases.js",
        "js/core/country_feature_policies.js",
        "js/core/feature_identity.js",
        "js/core/feature_identity_shared.js",
        "js/core/palette_runtime_bridge.js",
        "js/core/state/color_state.js",
        "js/core/state_defaults.js",
        "js/core/transport_capability_registry.js",
        "js/core/transport_pack_resolver.js",
        "js/workers/startup_boot.worker.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 239,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:perf-probe-snapshot-behavior",
      "commandRef": "test:node:perf-probe-snapshot-behavior",
      "sourceRefs": [
        "tests/perf_probe_snapshot_behavior.test.mjs",
        "js/core/perf_probe.js"
      ],
      "ownerHints": [
        "perf"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 327,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:physical-layer-contracts",
      "commandRef": "test:node:physical-layer-contracts",
      "sourceRefs": [
        "tests/physical_layer_contracts.test.mjs"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 329,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:physical-layer-owner",
      "commandRef": "test:node:physical-layer-owner",
      "sourceRefs": [
        "tests/physical_layer_render_owner_behavior.test.mjs",
        "js/core/renderer/physical_layer_render_owner.js"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 330,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:political-collection-fragment-camouflage",
      "commandRef": "test:node:political-collection-fragment-camouflage",
      "sourceRefs": [
        "tests/political_collection_fragment_camouflage_behavior.test.mjs",
        "data/europe_topology.runtime_political_v1.political.geojson",
        "js/core/country_feature_policies.js",
        "js/core/renderer/political_collection_owner.js",
        "vendor/d3.v7.min.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 241,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:political-pass-orchestrator-owner",
      "commandRef": "test:node:political-pass-orchestrator-owner",
      "sourceRefs": [
        "tests/political_pass_orchestrator_owner_behavior.test.mjs",
        "js/core/renderer/political_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 345,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:political-pass-orchestrator-owner-suite",
      "commandRef": "test:node:political-pass-orchestrator-owner-suite",
      "sourceRefs": [
        "tests/political_pass_orchestrator_owner_behavior.test.mjs",
        "tests/renderer_political_pass_orchestration_preflight.test.mjs",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "tools/renderer_pass_family_inventory.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 346,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:political-raster-worker-packet",
      "commandRef": "test:node:political-raster-worker-packet",
      "sourceRefs": [
        "tests/political_raster_worker_packet_behavior.test.mjs",
        "js/core/map_renderer/political_raster_worker_packet.js",
        "js/workers/political_raster.worker.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 326,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:polyline-simplification-benchmark",
      "commandRef": "test:node:polyline-simplification-benchmark",
      "sourceRefs": [
        "tests/polyline_simplification_benchmark_contract.test.mjs",
        "package-lock.json",
        "package.json",
        "tests/fixtures/polyline_simplification_benchmark_fixtures.mjs",
        "tools/perf/polyline_simplification_benchmark.mjs"
      ],
      "ownerHints": [
        "perf"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 350,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:post-ready-scheduler",
      "commandRef": "test:node:post-ready-scheduler",
      "sourceRefs": [
        "tests/post_ready_scheduler_behavior.test.mjs",
        "tests/main_post_ready_scheduler_boundary.test.mjs",
        "js/bootstrap/post_ready_scheduler.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 180,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:projected-geometry-bounds-owner",
      "commandRef": "test:node:projected-geometry-bounds-owner",
      "sourceRefs": [
        "tests/projected_geometry_bounds_owner_behavior.test.mjs",
        "js/core/renderer/projected_geometry_bounds_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 309,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:release-smoke-helper",
      "commandRef": "test:node:release-smoke-helper",
      "sourceRefs": [
        "tests/release_smoke_retry_behavior.node.test.mjs",
        "tests/e2e/support/release-smoke.js"
      ],
      "ownerHints": [
        "release-smoke"
      ],
      "domains": [
        "release-smoke"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 349,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-cache-owner",
      "commandRef": "test:node:render-cache-owner",
      "sourceRefs": [
        "tests/render_cache_owner_invalidation_behavior.test.mjs",
        "js/core/map_renderer/render_pass_catalog.js",
        "js/core/renderer/render_cache_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 307,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-invalidation-catalog",
      "commandRef": "test:node:render-invalidation-catalog",
      "sourceRefs": [
        "tests/render_invalidation_catalog_behavior.test.mjs",
        "js/core/map_renderer/render_invalidation_catalog.js",
        "js/core/map_renderer/render_pass_catalog.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 319,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-cache-host-owner",
      "commandRef": "test:node:render-pass-cache-host-owner",
      "sourceRefs": [
        "tests/render_pass_cache_host_owner_behavior.test.mjs",
        "js/core/map_renderer/render_pass_cache_host_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 270,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-cache-host-owner-inventory",
      "commandRef": "test:node:render-pass-cache-host-owner-inventory",
      "sourceRefs": [
        "tests/render_pass_cache_host_owner_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 271,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-cache-host-owner-suite",
      "commandRef": "test:node:render-pass-cache-host-owner-suite",
      "sourceRefs": [
        "tests/render_pass_cache_host_owner_behavior.test.mjs",
        "tests/render_pass_cache_host_owner_inventory.test.mjs",
        "tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs",
        "js/core/map_renderer/render_pass_cache_host_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 272,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-catalog",
      "commandRef": "test:node:render-pass-catalog",
      "sourceRefs": [
        "tests/render_pass_catalog_behavior.test.mjs",
        "js/core/map_renderer/render_pass_catalog.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 317,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-commit-accounting-inventory",
      "commandRef": "test:node:render-pass-commit-accounting-inventory",
      "sourceRefs": [
        "tests/render_pass_commit_accounting_owner_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 274,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-commit-accounting-owner",
      "commandRef": "test:node:render-pass-commit-accounting-owner",
      "sourceRefs": [
        "tests/render_pass_commit_accounting_owner_behavior.test.mjs",
        "js/core/map_renderer/render_pass_commit_accounting_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 273,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pass-commit-accounting-owner-suite",
      "commandRef": "test:node:render-pass-commit-accounting-owner-suite",
      "sourceRefs": [
        "tests/render_pass_commit_accounting_owner_behavior.test.mjs",
        "tests/render_pass_commit_accounting_owner_inventory.test.mjs",
        "js/core/map_renderer/render_pass_commit_accounting_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 275,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-pipeline-catalog",
      "commandRef": "test:node:render-pipeline-catalog",
      "sourceRefs": [
        "tests/render_pipeline_catalog_behavior.test.mjs",
        "js/core/map_renderer/render_pass_catalog.js",
        "js/core/renderer/render_pipeline_catalog.js",
        "js/core/renderer/render_pipeline_passes.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 318,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-runtime-binding",
      "commandRef": "test:node:render-runtime-binding",
      "sourceRefs": [
        "tests/render_runtime_binding_behavior.test.mjs",
        "tests/main_render_runtime_binding_boundary.test.mjs",
        "js/bootstrap/render_runtime_binding.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 182,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-sample-role-policy",
      "commandRef": "test:node:render-sample-role-policy",
      "sourceRefs": [
        "tests/render_sample_role_policy_behavior.test.mjs",
        "tests/perf_role_governed_report_behavior.test.mjs",
        "tools/perf/render_sample_role_policy.mjs",
        "tools/perf/analyze_render_sample_roles.mjs",
        "tools/perf/run_baseline.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/standard_perf_admission.mjs"
      ],
      "ownerHints": [
        "perf"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 211,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-transaction-diagnostics",
      "commandRef": "test:node:render-transaction-diagnostics",
      "sourceRefs": [
        "tests/render_transaction_diagnostics_behavior.test.mjs",
        "js/core/renderer/render_transaction_diagnostics.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 322,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:render-transform-reuse-policy-owner",
      "commandRef": "test:node:render-transform-reuse-policy-owner",
      "sourceRefs": [
        "tests/render_transform_reuse_policy_owner_behavior.test.mjs",
        "js/core/renderer/render_transform_reuse_policy_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 308,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-click-selection-transaction-inventory",
      "commandRef": "test:node:renderer-click-selection-transaction-inventory",
      "sourceRefs": [
        "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 290,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-draw-canvas-orchestration-inventory",
      "commandRef": "test:node:renderer-draw-canvas-orchestration-inventory",
      "sourceRefs": [
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 282,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-fit-projection-lifecycle",
      "commandRef": "test:node:renderer-fit-projection-lifecycle",
      "sourceRefs": [
        "tests/renderer_fit_projection_owner_behavior.test.mjs",
        "tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs",
        "js/core/renderer/renderer_fit_projection_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 258,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-fit-projection-lifecycle-inventory",
      "commandRef": "test:node:renderer-fit-projection-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 257,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-fit-projection-owner",
      "commandRef": "test:node:renderer-fit-projection-owner",
      "sourceRefs": [
        "tests/renderer_fit_projection_owner_behavior.test.mjs",
        "js/core/renderer/renderer_fit_projection_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 256,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-host-inventory",
      "commandRef": "test:node:renderer-host-inventory",
      "sourceRefs": [
        "tests/renderer_host_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 243,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-pass-family-inventory",
      "commandRef": "test:node:renderer-pass-family-inventory",
      "sourceRefs": [
        "tests/renderer_pass_family_inventory_behavior.test.mjs",
        "tools/renderer_pass_family_inventory.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 341,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-political-pass-orchestration-preflight",
      "commandRef": "test:node:renderer-political-pass-orchestration-preflight",
      "sourceRefs": [
        "tests/renderer_political_pass_orchestration_preflight.test.mjs",
        "tools/renderer_pass_family_inventory.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 344,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-projection-path-lifecycle",
      "commandRef": "test:node:renderer-projection-path-lifecycle",
      "sourceRefs": [
        "tests/renderer_projection_path_owner_behavior.test.mjs",
        "tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs",
        "js/core/renderer/renderer_projection_path_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 252,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-projection-path-lifecycle-inventory",
      "commandRef": "test:node:renderer-projection-path-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 251,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-projection-path-owner",
      "commandRef": "test:node:renderer-projection-path-owner",
      "sourceRefs": [
        "tests/renderer_projection_path_owner_behavior.test.mjs",
        "js/core/renderer/renderer_projection_path_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 250,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-lifecycle-inventory",
      "commandRef": "test:node:renderer-render-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_render_lifecycle_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 268,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-pass-cache-host-inventory",
      "commandRef": "test:node:renderer-render-pass-cache-host-inventory",
      "sourceRefs": [
        "tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 269,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-phase-lifecycle",
      "commandRef": "test:node:renderer-render-phase-lifecycle",
      "sourceRefs": [
        "tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_render_phase_lifecycle_inventory.test.mjs",
        "js/core/map_renderer/render_phase_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 296,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-phase-lifecycle-inventory",
      "commandRef": "test:node:renderer-render-phase-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_render_phase_lifecycle_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 295,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-phase-lifecycle-owner",
      "commandRef": "test:node:renderer-render-phase-lifecycle-owner",
      "sourceRefs": [
        "tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
        "js/core/map_renderer/render_phase_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 294,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-request-boundary",
      "commandRef": "test:node:renderer-render-request-boundary",
      "sourceRefs": [
        "tests/renderer_render_request_boundary_owner_behavior.test.mjs",
        "tests/renderer_render_request_boundary_inventory.test.mjs",
        "js/core/map_renderer/render_request_boundary_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 293,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-request-boundary-inventory",
      "commandRef": "test:node:renderer-render-request-boundary-inventory",
      "sourceRefs": [
        "tests/renderer_render_request_boundary_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 292,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-render-request-boundary-owner",
      "commandRef": "test:node:renderer-render-request-boundary-owner",
      "sourceRefs": [
        "tests/renderer_render_request_boundary_owner_behavior.test.mjs",
        "js/core/map_renderer/render_request_boundary_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 291,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-foundation",
      "commandRef": "test:node:renderer-runtime-context-foundation",
      "sourceRefs": [
        "tests/renderer_runtime_context_foundation_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 320,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-hit-hover",
      "commandRef": "test:node:renderer-runtime-context-hit-hover",
      "sourceRefs": [
        "tests/renderer_runtime_context_hit_hover_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 281,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-interaction",
      "commandRef": "test:node:renderer-runtime-context-interaction",
      "sourceRefs": [
        "tests/renderer_runtime_context_interaction_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 280,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-projection-viewport",
      "commandRef": "test:node:renderer-runtime-context-projection-viewport",
      "sourceRefs": [
        "tests/renderer_runtime_context_projection_viewport_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 278,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-receiver",
      "commandRef": "test:node:renderer-runtime-context-receiver",
      "sourceRefs": [
        "tests/renderer_runtime_context_receiver_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 276,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-render-cache",
      "commandRef": "test:node:renderer-runtime-context-render-cache",
      "sourceRefs": [
        "tests/renderer_runtime_context_render_cache_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 277,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-context-viewport-mutation",
      "commandRef": "test:node:renderer-runtime-context-viewport-mutation",
      "sourceRefs": [
        "tests/renderer_runtime_context_viewport_mutation_behavior.test.mjs",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 279,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-runtime-state-behavior",
      "commandRef": "test:node:renderer-runtime-state-behavior",
      "sourceRefs": [
        "tests/renderer_runtime_state_behavior.test.mjs",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/renderer/spatial_index_runtime_derivation.js",
        "js/core/renderer/spatial_index_runtime_state_ops.js",
        "js/core/state/actions/renderer_exact_refresh_actions.js",
        "js/core/state/border_cache_state.js",
        "js/core/state/renderer_runtime_state.js",
        "js/core/state/spatial_index_state.js",
        "js/core/state/ui_state.js",
        "js/core/transport_capability_registry.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 321,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-set-map-data-transaction",
      "commandRef": "test:node:renderer-set-map-data-transaction",
      "sourceRefs": [
        "tests/renderer_set_map_data_transaction_owner_behavior.test.mjs",
        "tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs",
        "js/core/map_renderer/set_map_data_transaction_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 264,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-set-map-data-transaction-inventory",
      "commandRef": "test:node:renderer-set-map-data-transaction-inventory",
      "sourceRefs": [
        "tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 263,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-set-map-data-transaction-owner",
      "commandRef": "test:node:renderer-set-map-data-transaction-owner",
      "sourceRefs": [
        "tests/renderer_set_map_data_transaction_owner_behavior.test.mjs",
        "js/core/map_renderer/set_map_data_transaction_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 262,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-splits",
      "commandRef": "test:node:renderer-splits",
      "sourceRefs": [
        "tests/strategic_overlay_runtime_owner_behavior.test.mjs",
        "tests/strategic_overlay_render_owner_behavior.test.mjs",
        "tests/strategic_overlay_state_behavior.test.mjs",
        "tests/special_zone_layers_state_behavior.test.mjs",
        "tests/special_zones_workbench_controller_behavior.test.mjs",
        "tests/scenario_optional_layers_behavior.test.mjs",
        "js/core/renderer/strategic_overlay_runtime_owner.js",
        "js/core/renderer/strategic_overlay_render_owner.js",
        "js/core/state/strategic_overlay_state.js",
        "js/core/special_zone_layers.js",
        "js/core/state/index.js",
        "js/ui/toolbar/special_zones_workbench_controller.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario_resources.js",
        "js/core/state.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 217,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-startup-transaction-inventory",
      "commandRef": "test:node:renderer-startup-transaction-inventory",
      "sourceRefs": [
        "tests/renderer_startup_transaction_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 261,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-startup-transaction-owner",
      "commandRef": "test:node:renderer-startup-transaction-owner",
      "sourceRefs": [
        "tests/renderer_startup_transaction_owner_behavior.test.mjs",
        "js/core/renderer/renderer_startup_transaction_owner.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 260,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-host",
      "commandRef": "test:node:renderer-surface-host",
      "sourceRefs": [
        "tests/renderer_surface_host_behavior.test.mjs",
        "tests/renderer_surface_host_inventory_boundary.test.mjs",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 244,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-host-inventory",
      "commandRef": "test:node:renderer-surface-host-inventory",
      "sourceRefs": [
        "tests/renderer_surface_host_inventory_boundary.test.mjs",
        "js/core/renderer/renderer_surface_host.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 245,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-lifecycle",
      "commandRef": "test:node:renderer-surface-lifecycle",
      "sourceRefs": [
        "tests/renderer_surface_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_surface_lifecycle_inventory_boundary.test.mjs",
        "js/core/map_renderer/canvas_layer_manager.js",
        "js/core/renderer/renderer_surface_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 249,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-lifecycle-inventory",
      "commandRef": "test:node:renderer-surface-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_surface_lifecycle_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 247,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-lifecycle-owner",
      "commandRef": "test:node:renderer-surface-lifecycle-owner",
      "sourceRefs": [
        "tests/renderer_surface_lifecycle_owner_behavior.test.mjs",
        "js/core/map_renderer/canvas_layer_manager.js",
        "js/core/renderer/renderer_surface_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 248,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-surface-runtime-bridge-state",
      "commandRef": "test:node:renderer-surface-runtime-bridge-state",
      "sourceRefs": [
        "tests/renderer_surface_runtime_bridge_state_behavior.test.mjs",
        "js/core/state/renderer_runtime_state.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 246,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-svg-surface-lifecycle",
      "commandRef": "test:node:renderer-svg-surface-lifecycle",
      "sourceRefs": [
        "tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs",
        "js/core/renderer/renderer_svg_surface_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 255,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-svg-surface-lifecycle-inventory",
      "commandRef": "test:node:renderer-svg-surface-lifecycle-inventory",
      "sourceRefs": [
        "tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 254,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-svg-surface-lifecycle-owner",
      "commandRef": "test:node:renderer-svg-surface-lifecycle-owner",
      "sourceRefs": [
        "tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs",
        "js/core/renderer/renderer_svg_surface_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 253,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-transaction-reset",
      "commandRef": "test:node:renderer-transaction-reset",
      "sourceRefs": [
        "tests/renderer_transaction_reset_owner_behavior.test.mjs",
        "tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs",
        "js/core/map_renderer/renderer_transaction_reset_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 267,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-transaction-reset-hardening-inventory",
      "commandRef": "test:node:renderer-transaction-reset-hardening-inventory",
      "sourceRefs": [
        "tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 266,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-transaction-reset-owner",
      "commandRef": "test:node:renderer-transaction-reset-owner",
      "sourceRefs": [
        "tests/renderer_transaction_reset_owner_behavior.test.mjs",
        "js/core/map_renderer/renderer_transaction_reset_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 265,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:renderer-viewport-update-owner",
      "commandRef": "test:node:renderer-viewport-update-owner",
      "sourceRefs": [
        "tests/renderer_viewport_update_owner_behavior.test.mjs",
        "js/core/renderer/renderer_viewport_update_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 259,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:river-layer-contracts",
      "commandRef": "test:node:river-layer-contracts",
      "sourceRefs": [
        "tests/river_layer_contracts.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 332,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:river-layer-owner",
      "commandRef": "test:node:river-layer-owner",
      "sourceRefs": [
        "tests/river_layer_render_owner_behavior.test.mjs",
        "js/core/renderer/river_layer_render_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 333,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:sample-project-contracts",
      "commandRef": "test:node:sample-project-contracts",
      "sourceRefs": [
        "tests/sample_project_contracts.test.mjs",
        "js/bootstrap/startup_sample_project_deeplink.js",
        "js/core/file_manager.js",
        "js/core/sample_export_recommendation.js",
        "js/core/sample_project_import_workflow.js",
        "js/core/sample_project_registry.js",
        "js/core/state/index.js",
        "js/ui/toolbar/export_workbench_controller.js",
        "js/ui/toolbar/sample_project_banner_controller.js",
        "js/ui/ui_surface_url_state.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 348,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-apply-transaction-ownership",
      "commandRef": "test:node:scenario-apply-transaction-ownership",
      "sourceRefs": [
        "tests/scenario_apply_transaction_ownership.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 221,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-contracts:quick",
      "commandRef": "test:node:scenario-chunk-contracts:quick",
      "sourceRefs": [
        "package.json",
        "tests/scenario_chunk_contracts.quick.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/helpers/scenario_chunk_contract_support.mjs",
        "js/core/feature_identity.js",
        "js/core/frame_scheduler.js",
        "js/core/political_raster_worker_client.js",
        "js/core/renderer/color_resolution_strategy.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/scenario_chunk_manager.js",
        "js/core/scenario_runtime_queries.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js"
      ],
      "ownerHints": ["scenario-runtime"],
      "domains": ["scenario-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 5,
      "verificationOrder": null,
      "selectorOrder": 374,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-contracts:heavy",
      "commandRef": "test:node:scenario-chunk-contracts:heavy",
      "sourceRefs": [
        "tests/scenario_chunk_contracts.heavy.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/helpers/scenario_chunk_contract_support.mjs",
        "data/scenarios/tno_1962",
        "vendor/d3.v7.min.js",
        "js/bootstrap/deferred_ui_bootstrap.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/bootstrap/startup_data_pipeline.js",
        "js/bootstrap/startup_scenario_boot.js",
        "js/core/frame_scheduler.js",
        "js/core/map_renderer.js",
        "js/core/map_renderer/canvas_layer_manager.js",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js",
        "js/core/map_renderer/exact_after_settle_refresh_plans.js",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/core/map_renderer/interaction_hit_candidates.js",
        "js/core/map_renderer/political_raster_worker_packet.js",
        "js/core/map_renderer/render_invalidation_catalog.js",
        "js/core/map_renderer/render_pass_catalog.js",
        "js/core/map_renderer/render_pass_commit_accounting_owner.js",
        "js/core/map_renderer/render_phase_lifecycle_owner.js",
        "js/core/map_renderer/render_request_boundary_owner.js",
        "js/core/map_renderer/scenario_refresh_plans.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/map_renderer/scenario_visual_invalidation_executor.js",
        "js/core/map_renderer/set_map_data_transaction_owner.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "js/core/political_raster_worker_client.js",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "js/core/renderer/city_points_render_owner.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "js/core/renderer/exact_after_settle_pass_catalog.js",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/projected_geometry_bounds_owner.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/renderer/render_pipeline_passes.js",
        "js/core/renderer/render_transform_reuse_policy_owner.js",
        "js/core/renderer/scenario_chunk_promotion_helpers.js",
        "js/core/renderer/scenario_water_cache_policy_owner.js",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/renderer/spatial_index_runtime_owner.js",
        "js/core/renderer/spatial_query_index.js",
        "js/core/renderer/urban_city_policy.js",
        "js/core/renderer/visible_frame_diagnostics_owner.js",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_chunk_manager.js",
        "js/core/scenario_manager.js",
        "js/core/scenario_ownership_editor.js",
        "js/core/scenario_post_apply_effects.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario/bundle_runtime.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/scenario/scenario_renderer_bridge.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/state/renderer_runtime_state.js",
        "js/main.js",
        "js/workers/political_raster.worker.js",
        "ops/browser-mcp/editor-performance-benchmark.py",
        "tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js",
        "tests/e2e/support/playwright-app-paths.js",
        "tests/e2e/support/political-pixel-probe.js",
        "tools/check_scenario_contracts.py",
        "tools/scenario_chunk_assets.py"
      ],
      "ownerHints": ["scenario-runtime"],
      "domains": ["scenario-runtime"],
      "tiers": ["heavy"],
      "cost": "heavy",
      "resourceLocks": ["scenario-data"],
      "executionOwners": ["main-thread"],
      "profiles": ["full"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 375,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-contracts:split",
      "commandRef": "test:node:scenario-chunk-contracts:split",
      "sourceRefs": [
        "tests/scenario_chunk_contracts.quick.test.mjs",
        "tests/scenario_chunk_contracts.heavy.test.mjs"
      ],
      "ownerHints": ["scenario-runtime"],
      "domains": ["scenario-runtime"],
      "tiers": ["heavy"],
      "cost": "heavy",
      "resourceLocks": ["scenario-data"],
      "executionOwners": ["main-thread"],
      "profiles": ["full"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 376,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-contracts:shadow",
      "commandRef": "test:node:scenario-chunk-contracts:shadow",
      "sourceRefs": [
        "tests/scenario_chunk_contract_shadow_behavior.test.mjs",
        "tools/verification/test_shadow_equivalence.mjs"
      ],
      "ownerHints": ["scenario-runtime"],
      "domains": ["scenario-runtime"],
      "tiers": ["heavy"],
      "cost": "heavy",
      "resourceLocks": [".runtime-output", "scenario-data"],
      "executionOwners": ["main-thread"],
      "profiles": ["full"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 377,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-contracts",
      "commandRef": "test:node:scenario-chunk-contracts",
      "sourceRefs": [
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/helpers/scenario_chunk_contract_support.mjs",
        "js/core/feature_identity.js",
        "js/core/frame_scheduler.js",
        "js/core/political_raster_worker_client.js",
        "js/core/renderer/color_resolution_strategy.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/renderer/spatial_index_runtime_builders.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/scenario_chunk_manager.js",
        "js/core/scenario_runtime_queries.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 328,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-chunk-promotion-helpers",
      "commandRef": "test:node:scenario-chunk-promotion-helpers",
      "sourceRefs": [
        "tests/scenario_chunk_promotion_helpers_behavior.test.mjs",
        "js/core/renderer/scenario_chunk_promotion_helpers.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 225,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-context-bar-controller",
      "commandRef": "test:node:scenario-context-bar-controller",
      "sourceRefs": [
        "tests/scenario_context_bar_controller_behavior.test.mjs",
        "js/ui/toolbar/scenario_context_bar_controller.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 222,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-lifecycle-runtime-behavior",
      "commandRef": "test:node:scenario-lifecycle-runtime-behavior",
      "sourceRefs": [
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "js/core/palette_manager.js",
        "js/core/political_raster_worker_client.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario/presentation_ocean_fill_restore.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario_manager.js",
        "js/core/scenario_post_apply_effects.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/state.js",
        "js/core/state/index.js",
        "js/core/state/scenario_runtime_state.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 219,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-refresh-plans",
      "commandRef": "test:node:scenario-refresh-plans",
      "sourceRefs": [
        "tests/scenario_refresh_plans_behavior.test.mjs",
        "tests/scenario_visual_invalidation_executor_behavior.test.mjs",
        "js/core/map_renderer/scenario_refresh_plans.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/renderer/context_layer_resolver.js",
        "js/core/map_renderer/scenario_visual_invalidation_executor.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 226,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-relief-overlay-owner",
      "commandRef": "test:node:scenario-relief-overlay-owner",
      "sourceRefs": [
        "tests/scenario_relief_overlay_render_owner_behavior.test.mjs",
        "js/core/renderer/scenario_relief_overlay_render_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 331,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-runtime-state-behavior",
      "commandRef": "test:node:scenario-runtime-state-behavior",
      "sourceRefs": [
        "tests/scenario_runtime_state_behavior.test.mjs",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/scenario_runtime_state.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 220,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-state-actions-atomicity",
      "commandRef": "test:node:scenario-state-actions-atomicity",
      "sourceRefs": [
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_readiness_actions.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 206,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:scenario-water-cache-policy-owner",
      "commandRef": "test:node:scenario-water-cache-policy-owner",
      "sourceRefs": [
        "tests/scenario_water_cache_policy_owner_behavior.test.mjs",
        "js/core/renderer/scenario_water_cache_policy_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 316,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:sidebar-hgo-identity-startup",
      "commandRef": "test:node:sidebar-hgo-identity-startup",
      "sourceRefs": [
        "tests/sidebar_hgo_identity_startup_behavior.test.mjs",
        "js/ui/sidebar.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 238,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:spatial-query-index",
      "commandRef": "test:node:spatial-query-index",
      "sourceRefs": [
        "tests/spatial_query_index_behavior.test.mjs",
        "js/core/renderer/spatial_query_index.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 224,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:startup-failure-recovery",
      "commandRef": "test:node:startup-failure-recovery",
      "sourceRefs": [
        "tests/startup_failure_recovery_behavior.test.mjs",
        "tests/main_startup_failure_recovery_boundary.test.mjs",
        "js/bootstrap/startup_failure_recovery.js",
        "js/bootstrap/startup_lazy_module_loader.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 183,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:startup-hydration-behavior",
      "commandRef": "test:node:startup-hydration-behavior",
      "sourceRefs": [
        "tests/startup_hydration_behavior.test.mjs",
        "js/core/scenario/startup_hydration.js",
        "js/core/startup_cache.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 230,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:startup-ready-handoff",
      "commandRef": "test:node:startup-ready-handoff",
      "sourceRefs": [
        "tests/startup_ready_handoff_behavior.test.mjs",
        "tests/main_startup_ready_handoff_boundary.test.mjs",
        "js/bootstrap/post_ready_scheduler.js",
        "js/bootstrap/startup_ready_handoff.js"
      ],
      "ownerHints": [
        "startup"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 187,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:strategic-overlay-runtime-owner",
      "commandRef": "test:node:strategic-overlay-runtime-owner",
      "sourceRefs": [
        "tests/strategic_overlay_runtime_owner_behavior.test.mjs",
        "js/core/renderer/strategic_overlay_runtime_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 314,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:supervisor-contracts",
      "commandRef": "test:node:supervisor-contracts",
      "sourceRefs": [
        "tests/supervisor_domain_registry_behavior.test.mjs",
        "tests/supervisor_schema_contracts.test.mjs",
        "tools/ai_test_supervisor/check_supervisor_schemas.mjs",
        "tools/test_route_registry.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 334,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:supervisor-plan",
      "commandRef": "test:node:supervisor-plan",
      "sourceRefs": [
        "tests/supervisor_change_dossier_behavior.test.mjs",
        "tests/supervisor_plan_behavior.test.mjs",
        "tools/ai_test_supervisor/build_change_dossier.mjs",
        "tools/ai_test_supervisor/command_lanes.mjs",
        "tools/ai_test_supervisor/render_supervisor_markdown.mjs",
        "tools/ai_test_supervisor/supervise_adaptive_verification.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 336,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:supervisor-routing",
      "commandRef": "test:node:supervisor-routing",
      "sourceRefs": [
        "tests/supervisor_adaptive_route_behavior.test.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 335,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:thematic-admin-metrics-loader",
      "commandRef": "test:node:thematic-admin-metrics-loader",
      "sourceRefs": [
        "tests/thematic_admin_metrics_loader_behavior.test.mjs",
        "data/thematic_layers/political/state_capacity_demo/manifest.json",
        "data/thematic_layers/political/state_capacity_demo/metrics.admin0.json",
        "data/thematic_layers/political/wgi_state_capacity_v1/manifest.json",
        "data/thematic_layers/political/wgi_state_capacity_v1/metrics.admin0.json",
        "data/thematic_layers/population/population_density_demo/manifest.json",
        "js/core/data_service.js",
        "js/core/thematic_admin_metrics_loader.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 178,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:thematic-layer-catalog",
      "commandRef": "test:node:thematic-layer-catalog",
      "sourceRefs": [
        "tests/thematic_layer_catalog_behavior.test.mjs",
        "tests/thematic_layer_preview_controller_behavior.test.mjs",
        "data/thematic_layers/index.json",
        "data/thematic_layers/political/state_capacity_demo/manifest.json",
        "data/thematic_layers/political/wgi_state_capacity_v1/manifest.json",
        "data/thematic_layers/population/population_density_demo/manifest.json",
        "data/thematic_layers/social/human_development_demo/manifest.json",
        "js/core/runtime_asset_registry.js",
        "js/core/thematic_layer_catalog.js",
        "js/ui/toolbar/thematic_layer_preview_controller.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 177,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:toolbar-render-scheduler",
      "commandRef": "test:node:toolbar-render-scheduler",
      "sourceRefs": [
        "tests/toolbar_render_scheduler_behavior.test.mjs",
        "js/ui/toolbar/toolbar_render_scheduler.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 179,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transformed-frame-compositor-owner",
      "commandRef": "test:node:transformed-frame-compositor-owner",
      "sourceRefs": [
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "js/core/map_renderer/transformed_frame_compositor_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 287,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transformed-frame-compositor-owner-suite",
      "commandRef": "test:node:transformed-frame-compositor-owner-suite",
      "sourceRefs": [
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "js/core/map_renderer/transformed_frame_compositor_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 288,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-appearance-controller",
      "commandRef": "test:node:transport-appearance-controller",
      "sourceRefs": [
        "tests/transport_appearance_controller_behavior.test.mjs",
        "js/core/transport_capability_registry.js",
        "js/ui/toolbar/transport_appearance_controller.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 190,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-facility-render-owner",
      "commandRef": "test:node:transport-facility-render-owner",
      "sourceRefs": [
        "tests/transport_facility_render_owner_behavior.test.mjs",
        "data/transport_layers/global_airport/airports.geojson",
        "data/transport_layers/global_port/ports.geojson",
        "js/core/renderer/transport_facility_display_policy.js",
        "js/core/renderer/transport_facility_icons.js",
        "js/core/renderer/transport_overview_render_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 191,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-overview-line-contract",
      "commandRef": "test:node:transport-overview-line-contract",
      "sourceRefs": [
        "tests/transport_overview_line_strategy_scope_contract.node.test.mjs",
        "js/core/map_renderer.js",
        "js/core/renderer/transport_line_label_policy.js",
        "js/core/renderer/transport_overview_render_owner.js",
        "js/core/renderer/transport_overview_style_policy.js",
        "js/core/transport_capability_registry.js",
        "js/core/transport_country_overlay.js",
        "js/core/transport_overview_visibility_policy.js",
        "js/core/transport_pack_resolver.js",
        "js/ui/toolbar/appearance_city_points_descriptor.js",
        "js/ui/toolbar/appearance_transport_summary.js"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 242,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-controller",
      "commandRef": "test:node:transport-workbench-controller",
      "sourceRefs": [
        "tests/transport_workbench_event_owner_behavior.test.mjs",
        "tests/transport_workbench_shell_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_event_owner.js",
        "js/ui/toolbar/transport_workbench_shell_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 192,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-event-owner",
      "commandRef": "test:node:transport-workbench-event-owner",
      "sourceRefs": [
        "tests/transport_workbench_event_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_event_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 193,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-inspector-owner",
      "commandRef": "test:node:transport-workbench-inspector-owner",
      "sourceRefs": [
        "tests/transport_workbench_inspector_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_inspector_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 195,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-layer-order-owner",
      "commandRef": "test:node:transport-workbench-layer-order-owner",
      "sourceRefs": [
        "tests/transport_workbench_layer_order_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_layer_order_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 196,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-lens-owner",
      "commandRef": "test:node:transport-workbench-lens-owner",
      "sourceRefs": [
        "tests/transport_workbench_lens_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_lens_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 197,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-popover-owner",
      "commandRef": "test:node:transport-workbench-popover-owner",
      "sourceRefs": [
        "tests/transport_workbench_popover_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_popover_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 198,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-preview-lifecycle-owner",
      "commandRef": "test:node:transport-workbench-preview-lifecycle-owner",
      "sourceRefs": [
        "tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs",
        "tests/transport_workbench_line_runtime_shared_behavior.test.mjs",
        "tests/transport_workbench_road_preview_runtime_behavior.test.mjs",
        "tests/transport_workbench_rail_preview_runtime_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js",
        "js/ui/transport_workbench_line_runtime_shared.js",
        "js/ui/transport_workbench_point_preview_runtime.js",
        "js/ui/transport_workbench_point_preview_shared.js",
        "js/ui/transport_workbench_road_preview_runtime.js",
        "js/ui/transport_workbench_rail_preview_runtime.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 199,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-right-deck-owner",
      "commandRef": "test:node:transport-workbench-right-deck-owner",
      "sourceRefs": [
        "tests/transport_workbench_right_deck_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_right_deck_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 200,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-shell-owner",
      "commandRef": "test:node:transport-workbench-shell-owner",
      "sourceRefs": [
        "tests/transport_workbench_shell_owner_behavior.test.mjs",
        "js/ui/toolbar/transport_workbench_shell_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 194,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:transport-workbench-state-owner",
      "commandRef": "test:node:transport-workbench-state-owner",
      "sourceRefs": [
        "tests/transport_workbench_state_owner_behavior.test.mjs",
        "js/core/transport_pack_resolver.js",
        "js/ui/toolbar/transport_workbench_state_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 201,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:ui-shell-boot",
      "commandRef": "test:node:ui-shell-boot",
      "sourceRefs": [
        "tests/ui_shell_boot_behavior.test.mjs",
        "tests/main_ui_shell_boot_boundary.test.mjs",
        "js/bootstrap/ui_shell_boot.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 184,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:verification-metadata",
      "commandRef": "test:node:verification-metadata",
      "sourceRefs": [
        "tests/verification_metadata_behavior.test.mjs",
        "tools/run_core_verification.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/verification_catalog_projection.mjs",
        "tools/verification/verification_domains.mjs",
        "tools/verification/verification_metadata_helpers.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 339,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:verification-profile",
      "commandRef": "test:node:verification-profile",
      "sourceRefs": [
        "tests/verification_profile_behavior.test.mjs",
        "tools/verification/verification_profile.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 6,
      "verificationOrder": null,
      "selectorOrder": 338,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:verification-script-portfolio",
      "commandRef": "test:node:verification-script-portfolio",
      "sourceRefs": [
        "tests/verification_script_portfolio_behavior.test.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/command_supersession.mjs",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/verification_domains.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 340,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:verify-core-runner",
      "commandRef": "test:node:verify-core-runner",
      "sourceRefs": [
        "tests/verify_core_runner_behavior.test.mjs",
        "tools/run_adaptive_tests.mjs",
        "tools/run_core_verification.mjs",
        "tools/select_verification_targets.mjs",
        "tools/test_route_registry.mjs",
        "tools/verification/command_supersession.mjs",
        "tools/verification/resumable_verification.mjs",
        "tools/verification/script_portfolio.mjs",
        "tools/verification/verification_catalog_projection.mjs",
        "tools/verification/verification_domains.mjs",
        "tools/verification/verification_profile.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 337,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:viewport-command-owner",
      "commandRef": "test:node:viewport-command-owner",
      "sourceRefs": [
        "tests/viewport_command_owner_behavior.test.mjs",
        "js/core/renderer/viewport_command_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 311,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:viewport-read-model-owner",
      "commandRef": "test:node:viewport-read-model-owner",
      "sourceRefs": [
        "tests/viewport_read_model_owner_behavior.test.mjs",
        "js/core/renderer/viewport_read_model_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 310,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:viewport-resize-lifecycle-owner",
      "commandRef": "test:node:viewport-resize-lifecycle-owner",
      "sourceRefs": [
        "tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
        "js/core/renderer/viewport_resize_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 312,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:visible-frame-diagnostics",
      "commandRef": "test:node:visible-frame-diagnostics",
      "sourceRefs": [
        "tests/visible_frame_diagnostics_owner_behavior.test.mjs",
        "tests/visible_frame_diagnostics_owner_inventory.test.mjs",
        "js/core/renderer/visible_frame_diagnostics_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 306,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:visible-frame-diagnostics-inventory",
      "commandRef": "test:node:visible-frame-diagnostics-inventory",
      "sourceRefs": [
        "tests/visible_frame_diagnostics_owner_inventory.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 305,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:visible-frame-diagnostics-owner",
      "commandRef": "test:node:visible-frame-diagnostics-owner",
      "sourceRefs": [
        "tests/visible_frame_diagnostics_owner_behavior.test.mjs",
        "js/core/renderer/visible_frame_diagnostics_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 304,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:visual-effects-pass-owner",
      "commandRef": "test:node:visual-effects-pass-owner",
      "sourceRefs": [
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "js/core/renderer/visual_effects_pass_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 342,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:williams-crossover-governance",
      "commandRef": "test:node:williams-crossover-governance",
      "sourceRefs": [
        "tests/williams_crossover_governance_behavior.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/rerun08-harness-recovery-governance.md",
        "tools/perf/render_sample_role_policy.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/standard_perf_admission.mjs",
        "tools/perf/williams_crossover_policy.mjs",
        "tools/perf/williams_crossover_power_scheme.ps1",
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tools/process_containment/ordered_source_set_identity.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 212,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:williams-crossover-job-runner",
      "commandRef": "test:node:williams-crossover-job-runner",
      "sourceRefs": [
        "tests/williams_crossover_windows_job_runner_behavior.test.mjs",
        "tests/williams_crossover_windows_job_runner_integration.test.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/williams_crossover_windows_job_runner.cs",
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tools/process_containment/windows_job_runner_core.cs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 213,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:williams-crossover-telemetry-live",
      "commandRef": "test:node:williams-crossover-telemetry-live",
      "sourceRefs": [
        "tests/williams_crossover_windows_job_runner_integration.test.mjs",
        "tools/perf/williams_crossover_windows_runtime.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": null,
      "selectorOrder": 216,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:windows-job-runtime",
      "commandRef": "test:node:windows-job-runtime",
      "sourceRefs": [
        "tests/windows_job_runner_v2_native_contract.test.mjs",
        "tests/windows_job_runtime_behavior.test.mjs",
        "tools/process_containment/windows_job_runtime.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 214,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:windows-job-runtime:integration",
      "commandRef": "test:node:windows-job-runtime:integration",
      "sourceRefs": [
        "tests/windows_job_runtime_integration.test.mjs",
        "tools/process_containment/windows_job_runtime.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 215,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:worker-task-client",
      "commandRef": "test:node:worker-task-client",
      "sourceRefs": [
        "tests/worker_task_client_behavior.test.mjs",
        "js/core/worker_task_client.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 223,
      "verification": null,
      "selector": {}
    },
    {
      "id": "node:test:node:zoom-interaction-lifecycle-owner",
      "commandRef": "test:node:zoom-interaction-lifecycle-owner",
      "sourceRefs": [
        "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 313,
      "verification": null,
      "selector": {}
    },
    {
      "id": "p3:context-pass:physical-layer-contracts",
      "commandRef": "test:node:physical-layer-contracts",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/physical_layer_contracts.test.mjs"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 56,
      "selectorOrder": 43,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "map-layer",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:physical-layer-runtime",
      "commandRef": "test:e2e:physical-layer-runtime-contract",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 61,
      "selectorOrder": 48,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "map-layer",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:river-layer-contracts",
      "commandRef": "test:node:river-layer-contracts",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/river_layer_contracts.test.mjs"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 57,
      "selectorOrder": 44,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "map-layer",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:scenario-chunk-contracts",
      "commandRef": "test:node:scenario-chunk-contracts",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/scenario_chunk_contracts.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 58,
      "selectorOrder": 45,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:scenario-resilience",
      "commandRef": "test:e2e:scenario-resilience",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 63,
      "selectorOrder": 50,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:tno-contracts",
      "commandRef": "test:e2e:tno-contracts",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "tno-startup"
      ],
      "domains": [
        "tno-startup"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 64,
      "selectorOrder": 51,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "tno-startup",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:context-pass:water-rendering",
      "commandRef": "test:e2e:water-rendering",
      "sourceRefs": [
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 62,
      "selectorOrder": 49,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:pass-family:city-rendering",
      "commandRef": "test:e2e:city-rendering",
      "sourceRefs": [
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/context_pass_orchestrator_owner.js"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 60,
      "selectorOrder": 47,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "city-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:collection-fragment-camouflage",
      "commandRef": "test:node:political-collection-fragment-camouflage",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_collection_owner.js",
        "js/core/country_feature_policies.js",
        "tests/political_collection_fragment_camouflage_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 49,
      "selectorOrder": 36,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:physical-layer-runtime",
      "commandRef": "test:e2e:physical-layer-runtime-contract",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "map-layer"
      ],
      "domains": [
        "map-layer"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 53,
      "selectorOrder": 40,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "map-layer",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:progressive-recovery",
      "commandRef": "test:e2e:dev:political-progressive-recovery",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 50,
      "selectorOrder": 37,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:scenario-chunk-contracts",
      "commandRef": "test:node:scenario-chunk-contracts",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "tests/scenario_chunk_contracts.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 47,
      "selectorOrder": 34,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:scenario-chunk-runtime",
      "commandRef": "test:e2e:dev:scenario-chunk-runtime",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 51,
      "selectorOrder": 38,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:scenario-resilience",
      "commandRef": "test:e2e:scenario-resilience",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 52,
      "selectorOrder": 39,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:tno-contracts",
      "commandRef": "test:e2e:tno-contracts",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "tno-startup"
      ],
      "domains": [
        "tno-startup"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 55,
      "selectorOrder": 42,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "tno-startup",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:water-rendering",
      "commandRef": "test:e2e:water-rendering",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 54,
      "selectorOrder": 41,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "scenario-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:political-pass:worker-packet",
      "commandRef": "test:node:political-raster-worker-packet",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "js/core/map_renderer/political_raster_worker_packet.js",
        "tests/political_raster_worker_packet_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 48,
      "selectorOrder": 35,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p3:visual-effects:layer-regression",
      "commandRef": "test:e2e:layer:regression",
      "sourceRefs": [
        "js/core/renderer/visual_effects_pass_owner.js"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 59,
      "selectorOrder": 46,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p4:p4-1-exact-phase",
      "commandRef": "verify:p4:p4-1",
      "sourceRefs": [
        "js/core/state/actions/boot_actions.js",
        "js/core/state/boot_state.js",
        "js/core/state/content_state.js",
        "js/main.js",
        "js/bootstrap/post_ready_scheduler.js",
        "js/bootstrap/startup_boot_overlay.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/bootstrap/ui_shell_boot.js",
        "js/bootstrap/ui_shell_debug_seed.js",
        "js/core/sample_project_import_workflow.js",
        "js/core/scenario/bundle_runtime.js",
        "js/core/scenario/startup_hydration.js",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tools/select_verification_targets.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/p4_state_action_routes_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/boot_actions_behavior.test.mjs",
        "tests/test_boot_state_actions_boundary_contract.py",
        "tests/test_state_split_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/_worktree_registry.md",
        "tools/verification/verification_domains.mjs",
        "tools/ai_test_supervisor/domain_registry.json",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 17,
      "selectorOrder": 15,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p4:p4-2a-exact-phase",
      "commandRef": "verify:p4:p4-2a",
      "sourceRefs": [
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_manager.js",
        "js/core/palette_manager.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/scenario_post_apply_effects.js",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tools/select_verification_targets.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_soundness_behavior.test.mjs",
        "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
        "tests/p4_state_writer_streaming_runner_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_apply_transaction_ownership.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/test_scenario_state_actions_boundary_contract.py",
        "tests/test_scenario_manager_boundary_contract.py",
        "tests/test_scenario_resources_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_scenario_lifecycle_runtime_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/appearance-transport-platformization-milestones-20260812",
        "docs/active/_worktree_registry.md",
        "tools/verification/verification_domains.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 20,
      "selectorOrder": 18,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p4:p4-2b-exact-phase",
      "commandRef": "verify:p4:p4-2b",
      "sourceRefs": [
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/scenario_runtime_state.js",
        "js/bootstrap/deferred_detail_promotion.js",
        "js/bootstrap/startup_ready_handoff.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/state/content_state.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/scenario_localization_state.js",
        "js/core/scenario/bundle_loader.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tools/select_verification_targets.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tests/scenario_chunk_state_actions_behavior.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/scenario_chunk_promotion_helpers_behavior.test.mjs",
        "tests/scenario_refresh_plans_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_soundness_behavior.test.mjs",
        "tests/p4_state_action_routes_behavior.test.mjs",
        "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
        "tests/p4_state_writer_streaming_runner_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/test_scenario_chunk_state_actions_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_main_deferred_detail_promotion_boundary_contract.py",
        "tests/test_scenario_manager_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_scenario_state_actions_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/_worktree_registry.md",
        "tools/verification/verification_domains.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 23,
      "selectorOrder": 21,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p4:p4-2c-exact-phase",
      "commandRef": "verify:p4:p4-2c",
      "sourceRefs": [
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario/presentation_display_restore.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario_rollback.js",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tools/select_verification_targets.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tests/scenario_health_actions_behavior.test.mjs",
        "tests/startup_hydration_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_soundness_behavior.test.mjs",
        "tests/p4_state_action_routes_behavior.test.mjs",
        "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
        "tests/p4_state_writer_streaming_runner_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/test_scenario_health_actions_boundary_contract.py",
        "tests/test_startup_hydration_boundary_contract.py",
        "tests/test_scenario_data_health_boundary_contract.py",
        "tests/test_scenario_presentation_runtime_boundary_contract.py",
        "tests/test_scenario_lifecycle_runtime_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_scenario_runtime_state_boundary_contract.py",
        "tests/test_scenario_state_actions_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/_worktree_registry.md",
        "tools/verification/verification_domains.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 26,
      "selectorOrder": 24,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "p4:p4-3-exact-phase",
      "commandRef": "verify:p4:p4-3",
      "sourceRefs": [
        "js/core/state/actions/renderer_phase_actions.js",
        "js/core/state/actions/renderer_interaction_actions.js",
        "js/core/state/actions/renderer_exact_refresh_actions.js",
        "js/core/state/actions/renderer_cache_actions.js",
        "js/core/renderer/render_pass_cache_state_normalizer.js",
        "js/core/state/actions/renderer_diagnostics_actions.js",
        "js/core/renderer/render_perf_metrics_runtime_owner.js",
        "js/core/renderer/day_night_runtime_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/renderer_runtime_state.js",
        "js/core/map_renderer.js",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_inventory.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tools/test_route_registry.mjs",
        "tools/select_verification_targets.mjs",
        "tools/run_p4_phase_verification.mjs",
        "tools/verification/resumable_verification.mjs",
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tests/renderer_phase_actions_behavior.test.mjs",
        "tests/renderer_interaction_actions_behavior.test.mjs",
        "tests/renderer_exact_refresh_actions_behavior.test.mjs",
        "tests/render_pass_cache_state_normalizer_behavior.test.mjs",
        "tests/renderer_cache_actions_behavior.test.mjs",
        "tests/renderer_diagnostics_actions_behavior.test.mjs",
        "tests/render_perf_metrics_runtime_owner_behavior.test.mjs",
        "tests/day_night_runtime_owner_behavior.test.mjs",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "tests/political_background_render_owner_behavior.test.mjs",
        "tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs",
        "tests/renderer_render_phase_lifecycle_inventory.test.mjs",
        "tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
        "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_runtime_state_behavior.test.mjs",
        "tests/physical_layer_contracts.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_soundness_behavior.test.mjs",
        "tests/p4_state_action_routes_behavior.test.mjs",
        "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
        "tests/p4_state_writer_streaming_runner_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "tests/test_renderer_control_actions_boundary_contract.py",
        "tests/test_renderer_exact_refresh_actions_boundary_contract.py",
        "tests/test_renderer_cache_actions_boundary_contract.py",
        "tests/test_renderer_diagnostics_actions_boundary_contract.py",
        "tests/test_day_night_runtime_owner_boundary_contract.py",
        "tests/test_map_renderer_political_background_render_owner_boundary_contract.py",
        "tests/test_renderer_runtime_state_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_state_write_guardrail_contract.py",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/_worktree_registry.md",
        "tools/verification/verification_domains.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 29,
      "selectorOrder": 27,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "perf:williams-crossover-live",
      "commandRef": "perf:williams-crossover:run",
      "sourceRefs": [
        "tools/perf/williams_crossover_policy.mjs",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tools/perf/williams_crossover_windows_job_runner.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tools/process_containment/ordered_source_set_identity.mjs",
        "tools/perf/williams_crossover_power_scheme.ps1",
        "tools/perf/run_baseline.mjs",
        "tools/perf/render_sample_role_policy.mjs",
        "package-lock.json",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "perf-dev-server",
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output",
        "system-power-scheme"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "perf-pr-gate"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": 89,
      "selectorOrder": 76,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "perf",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "perf:williams-crossover-telemetry-live",
      "commandRef": "test:node:williams-crossover-telemetry-live",
      "sourceRefs": [
        "tools/perf/williams_crossover_policy.mjs",
        "tools/perf/williams_crossover_windows_runtime.mjs",
        "tests/williams_crossover_windows_job_runner_integration.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "contract",
      "resourceLocks": [
        "perf-dev-server"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "perf-pr-gate"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": 91,
      "selectorOrder": 78,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "perf",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "perf:williams-power-scheme-live-preflight",
      "commandRef": "perf:williams-power-scheme:live-preflight",
      "sourceRefs": [
        "tools/perf/williams_crossover_power_scheme.ps1",
        "tools/perf/run_williams_crossover.mjs",
        "tools/perf/williams_crossover_policy.mjs",
        "tests/williams_crossover_governance_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "contract",
      "resourceLocks": [
        "system-power-scheme"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "perf-pr-gate"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 2,
      "verificationOrder": 90,
      "selectorOrder": 77,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "perf",
        "routeRegistry": true,
        "optionalMainThread": true
      },
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_city_assets.py",
      "commandRef": "python -m unittest tests.test_city_assets -q",
      "sourceRefs": [
        "tests/test_city_assets.py"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 368,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_global_transport_builder_contracts.py",
      "commandRef": "python -m unittest tests.test_global_transport_builder_contracts -q",
      "sourceRefs": [
        "tests/test_global_transport_builder_contracts.py"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 369,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_local_canonicalization.py",
      "commandRef": "python -m unittest tests.test_local_canonicalization -q",
      "sourceRefs": [
        "tests/test_local_canonicalization.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 370,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_pages_dist_startup_shell_heavy.py",
      "commandRef": "python -m unittest tests.test_pages_dist_startup_shell_heavy -q",
      "sourceRefs": [
        "tests/test_pages_dist_startup_shell_heavy.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 371,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_patch_checked_in_urban_artifacts.py",
      "commandRef": "python -m unittest tests.test_patch_checked_in_urban_artifacts -q",
      "sourceRefs": [
        "tests/test_patch_checked_in_urban_artifacts.py"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 367,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_physical_context_contours.py",
      "commandRef": "python -m unittest tests.test_physical_context_contours -q",
      "sourceRefs": [
        "tests/test_physical_context_contours.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 366,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_political_topology_gap_contract.py",
      "commandRef": "python -m unittest tests.test_political_topology_gap_contract -q",
      "sourceRefs": [
        "tests/test_political_topology_gap_contract.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 372,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_scenario_chunk_assets.py",
      "commandRef": "python -m unittest tests.test_scenario_chunk_assets -q",
      "sourceRefs": [
        "tests/test_scenario_chunk_assets.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 363,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_tno_bundle_builder.py",
      "commandRef": "python -m unittest tests.test_tno_bundle_builder -q",
      "sourceRefs": [
        "tests/test_tno_bundle_builder.py"
      ],
      "ownerHints": [
        "geo-contract"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 362,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_tno_named_marginal_water_contract.py",
      "commandRef": "python -m pytest tests/test_tno_named_marginal_water_contract.py -q",
      "sourceRefs": [
        "tests/test_tno_named_marginal_water_contract.py"
      ],
      "ownerHints": [
        "tno-water"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 365,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_tno_water_geometries.py",
      "commandRef": "python -m pytest tests/test_tno_water_geometries.py -q",
      "sourceRefs": [
        "tests/test_tno_water_geometries.py"
      ],
      "ownerHints": [
        "tno-water"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 364,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_polar_water_spherical_safety.py",
      "commandRef": "python -m pytest tests/test_polar_water_spherical_safety.py -q",
      "sourceRefs": [
        "tests/test_polar_water_spherical_safety.py"
      ],
      "ownerHints": [
        "tno-water"
      ],
      "domains": [
        "tno-water"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 378,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_transport_country_source_contracts.py",
      "commandRef": "python -m unittest tests.test_transport_country_source_contracts -q",
      "sourceRefs": [
        "tests/test_transport_country_source_contracts.py"
      ],
      "ownerHints": [
        "transport-workbench"
      ],
      "domains": [
        "transport-workbench"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 373,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python-heavy:geo_stack:tests/test_urban_topology_contract.py",
      "commandRef": "python -m pytest tests/test_urban_topology_contract.py -q",
      "sourceRefs": [
        "tests/test_urban_topology_contract.py"
      ],
      "ownerHints": [
        "city-runtime"
      ],
      "domains": [
        "city-runtime"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 361,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:backend-cloud-support",
      "commandRef": "test:py:backend-cloud-support",
      "sourceRefs": [
        "map_backend",
        "tools/dev_server.py",
        "tests/test_backend_service.py",
        "tests/test_backend_routes.py",
        "tests/test_dev_server.py"
      ],
      "ownerHints": [
        "backend-cloud-support"
      ],
      "domains": [
        "backend-cloud-support"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 352,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:polar-water-spherical-safety",
      "commandRef": "python -m pytest tests/test_polar_water_spherical_safety.py -q",
      "sourceRefs": [
        "init_map_data.py",
        "map_builder/geo/topology.py",
        "map_builder/geo/spherical_safety.py",
        "data/europe_topology.json",
        "data/water_regions.geojson",
        "tests/test_polar_water_spherical_safety.py"
      ],
      "ownerHints": [
        "polar-water-spherical-safety"
      ],
      "domains": [
        "geo-contract"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "heavy-geo",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": null,
      "selectorOrder": 351,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.deferred_detail_promotion_contracts",
      "commandRef": "python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q",
      "sourceRefs": [
        "js/bootstrap/deferred_detail_promotion.js",
        "tests/test_main_deferred_detail_promotion_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_scenario_renderer_bridge_boundary_contract.py"
      ],
      "ownerHints": [
        "deferred-detail-promotion"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 357,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_app_entry_resolver",
      "commandRef": "python -m unittest tests.test_app_entry_resolver -q",
      "sourceRefs": [
        "tests/test_app_entry_resolver.py"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 354,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_i18n_audit",
      "commandRef": "python -m unittest tests.test_i18n_audit -q",
      "sourceRefs": [
        "tests/test_i18n_audit.py",
        "tools/i18n_audit.py",
        "tools/translate_manager.py",
        "data/locales.json",
        "data/i18n/locales_baseline.json",
        "data/city_aliases.json",
        "data/geo_aliases.json",
        "data/hgo_catalogs/hgo_place_names.json",
        "data/hgo_catalogs/hgo_identity_aliases.json"
      ],
      "ownerHints": [
        "i18n-runtime"
      ],
      "domains": [
        "i18n-data"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 356,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_map_renderer_interaction_border_snapshot_orchestration_contract",
      "commandRef": "python -m unittest tests.test_map_renderer_interaction_border_snapshot_orchestration_contract -q",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "js/core/renderer/render_cache_owner.js",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js",
        "tests/test_map_renderer_interaction_border_snapshot_orchestration_contract.py"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 358,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract",
      "commandRef": "python -m unittest tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q",
      "sourceRefs": [
        "tests/test_map_renderer_strategic_overlay_render_owner_boundary_contract.py",
        "js/core/map_renderer.js",
        "js/core/renderer/strategic_overlay_render_owner.js",
        "js/core/renderer/strategic_overlay_runtime/unit_counter_runtime_domain.js"
      ],
      "ownerHints": [
        "strategic-overlay-render-owner"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 355,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_perf_gate_contract",
      "commandRef": "python -m unittest tests.test_perf_gate_contract -q",
      "sourceRefs": [
        "tests/test_perf_gate_contract.py"
      ],
      "ownerHints": [
        "perf-runtime"
      ],
      "domains": [
        "perf"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 359,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:tests.test_startup_shell",
      "commandRef": "python -m unittest tests.test_startup_shell -q",
      "sourceRefs": [
        "tests/test_startup_shell.py"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 360,
      "verification": null,
      "selector": {}
    },
    {
      "id": "python:thematic-layer-contracts",
      "commandRef": "test:py:thematic-layer-contracts",
      "sourceRefs": [
        "tools/build_thematic_layers.py",
        "map_builder/thematic_layer_contracts.py",
        "map_builder/thematic_wgi_ingest.py",
        "map_builder/contracts.py",
        "map_builder/runtime_asset_registry.py",
        "data/thematic_layers",
        "data/manifest.json",
        "data/runtime_asset_registry.json",
        "tests/test_thematic_layer_contracts.py",
        "tests/test_thematic_wgi_source_ingest.py",
        "tests/fixtures/thematic_wgi_2024_minimal.csv"
      ],
      "ownerHints": [
        "thematic-layer-contracts"
      ],
      "domains": [
        "data-governance"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": null,
      "selectorOrder": 353,
      "verification": null,
      "selector": {}
    },
    {
      "id": "renderer:transformed-frame-compositor-runtime",
      "commandRef": "test:e2e:dev:scenario-chunk-runtime",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "pr-smoke"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 96,
      "selectorOrder": 83,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true,
        "optionalMainThread": true
      },
      "selector": {}
    },
    {
      "id": "verify-core-main-thread:test:e2e:interaction-funnel",
      "commandRef": "test:e2e:interaction-funnel",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 125,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-main-thread:test:e2e:project-save-load",
      "commandRef": "test:e2e:project-save-load",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 124,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-main-thread:test:e2e:scenario-apply-concurrency",
      "commandRef": "test:e2e:scenario-apply-concurrency",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 123,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-main-thread:test:e2e:smoke",
      "commandRef": "test:e2e:smoke",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "smoke"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 122,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-optional:test:e2e:city-rendering",
      "commandRef": "test:e2e:city-rendering",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 128,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "optionalMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-optional:test:e2e:tno-contracts",
      "commandRef": "test:e2e:tno-contracts",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 126,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "optionalMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core-optional:test:e2e:water-rendering",
      "commandRef": "test:e2e:water-rendering",
      "sourceRefs": [
        "package.json",
        "tests/e2e"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "browser-dev-server",
        "playwright-browser",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 127,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "optionalMainThread": true,
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core:dist-drift",
      "commandRef": "verify:dist-drift",
      "sourceRefs": [
        "tools/build_pages_dist.py",
        "dist/pages-dist-manifest.json",
        "dist/app"
      ],
      "ownerHints": [
        "deploy-runtime"
      ],
      "domains": [
        "pages-dist"
      ],
      "tiers": [
        "heavy"
      ],
      "cost": "heavy",
      "resourceLocks": [
        "dist",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "deploy-minimal"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 1,
      "verificationOrder": 121,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "supervisorDomain": "pages-dist"
      },
      "selector": null
    },
    {
      "id": "verify-core:p4:p4-1-boot-actions",
      "commandRef": "test:node:p4:p4-1",
      "sourceRefs": [
        "js/core/state/actions/boot_actions.js",
        "js/core/state/boot_state.js",
        "js/core/state/content_state.js",
        "js/main.js",
        "js/bootstrap/post_ready_scheduler.js",
        "js/bootstrap/startup_boot_overlay.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/bootstrap/ui_shell_boot.js",
        "js/bootstrap/ui_shell_debug_seed.js",
        "js/core/sample_project_import_workflow.js",
        "js/core/scenario/bundle_runtime.js",
        "js/core/scenario/startup_hydration.js",
        "tests/boot_actions_behavior.test.mjs",
        "tests/startup_boot_overlay_behavior.test.mjs",
        "tests/startup_bootstrap_support_behavior.test.mjs",
        "tests/post_ready_scheduler_behavior.test.mjs",
        "tests/ui_shell_boot_behavior.test.mjs",
        "tests/startup_hydration_behavior.test.mjs",
        "tests/sample_project_contracts.test.mjs",
        "tests/main_bootstrap_wiring_boundary.test.mjs",
        "tests/main_post_ready_scheduler_boundary.test.mjs",
        "tests/main_ui_shell_boot_boundary.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output",
        "heavy-geo",
        "scenario-data"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 15,
      "selectorOrder": 13,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-1-boot-boundary",
      "commandRef": "test:python:p4:p4-1-boundary",
      "sourceRefs": [
        "js/core/state/actions/boot_actions.js",
        "js/core/state/boot_state.js",
        "tests/test_boot_state_actions_boundary_contract.py",
        "tests/test_state_split_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 16,
      "selectorOrder": 14,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2a-scenario-actions",
      "commandRef": "test:node:p4:p4-2a",
      "sourceRefs": [
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_manager.js",
        "js/core/palette_manager.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/scenario_post_apply_effects.js",
        "tools/state_action_delegation_contract.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_apply_transaction_ownership.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output",
        "heavy-geo",
        "scenario-data"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 18,
      "selectorOrder": 16,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2a-scenario-boundary",
      "commandRef": "test:python:p4:p4-2a-boundary",
      "sourceRefs": [
        "js/core/state/actions/scenario_readiness_actions.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_apply_request_actions.js",
        "js/core/state/actions/scenario_palette_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario_manager.js",
        "js/core/palette_manager.js",
        "js/core/scenario_resources.js",
        "js/core/scenario_rollback.js",
        "js/core/scenario_post_apply_effects.js",
        "tests/test_scenario_state_actions_boundary_contract.py",
        "tests/test_scenario_manager_boundary_contract.py",
        "tests/test_scenario_resources_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_scenario_lifecycle_runtime_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 19,
      "selectorOrder": 17,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2b-scenario-chunk-actions",
      "commandRef": "test:node:p4:p4-2b",
      "sourceRefs": [
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/scenario_runtime_state.js",
        "js/bootstrap/deferred_detail_promotion.js",
        "js/bootstrap/startup_ready_handoff.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/state/content_state.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "tests/scenario_chunk_state_actions_behavior.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/scenario_chunk_promotion_helpers_behavior.test.mjs",
        "tests/scenario_refresh_plans_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output",
        "heavy-geo",
        "scenario-data"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 21,
      "selectorOrder": 19,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2b-scenario-chunk-boundary",
      "commandRef": "test:python:p4:p4-2b-boundary",
      "sourceRefs": [
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/scenario_runtime_state.js",
        "js/bootstrap/deferred_detail_promotion.js",
        "js/bootstrap/startup_ready_handoff.js",
        "js/core/scenario_apply_pipeline.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/map_renderer/scenario_refresh_runtime.js",
        "js/core/state/content_state.js",
        "js/core/state/actions/scenario_activation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "tests/test_scenario_chunk_state_actions_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_main_deferred_detail_promotion_boundary_contract.py",
        "tests/test_scenario_manager_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 22,
      "selectorOrder": 20,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2c-scenario-health-actions",
      "commandRef": "test:node:p4:p4-2c",
      "sourceRefs": [
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario/presentation_display_restore.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario_rollback.js",
        "tests/scenario_health_actions_behavior.test.mjs",
        "tests/startup_hydration_behavior.test.mjs",
        "tests/scenario_lifecycle_runtime_behavior.test.mjs",
        "tests/scenario_runtime_state_behavior.test.mjs",
        "tests/scenario_state_actions_atomicity_behavior.test.mjs",
        "tests/scenario_transaction_rollback_actions_behavior.test.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/p4_phase_verification_runner_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output",
        "heavy-geo",
        "scenario-data"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 24,
      "selectorOrder": 22,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-2c-scenario-health-boundary",
      "commandRef": "test:python:p4:p4-2c-boundary",
      "sourceRefs": [
        "js/core/state/actions/scenario_health_actions.js",
        "js/core/state/actions/scenario_presentation_actions.js",
        "js/core/state/actions/scenario_transaction_rollback_actions.js",
        "js/core/state/scenario_runtime_state.js",
        "js/core/scenario/startup_hydration.js",
        "js/core/scenario_data_health.js",
        "js/core/scenario/presentation_display_restore.js",
        "js/core/scenario/lifecycle_runtime.js",
        "js/core/scenario_rollback.js",
        "tests/test_scenario_health_actions_boundary_contract.py",
        "tests/test_startup_hydration_boundary_contract.py",
        "tests/test_scenario_data_health_boundary_contract.py",
        "tests/test_scenario_presentation_runtime_boundary_contract.py",
        "tests/test_scenario_lifecycle_runtime_boundary_contract.py",
        "tests/test_scenario_rollback_boundary_contract.py",
        "tests/test_scenario_runtime_state_boundary_contract.py",
        "tests/test_scenario_state_actions_boundary_contract.py",
        "tests/test_state_write_guardrail_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 25,
      "selectorOrder": 23,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-3-renderer-actions",
      "commandRef": "test:node:p4:p4-3",
      "sourceRefs": [
        "js/core/state/actions/renderer_phase_actions.js",
        "js/core/state/actions/renderer_interaction_actions.js",
        "js/core/state/actions/renderer_exact_refresh_actions.js",
        "js/core/state/actions/renderer_cache_actions.js",
        "js/core/renderer/render_pass_cache_state_normalizer.js",
        "js/core/state/actions/renderer_diagnostics_actions.js",
        "js/core/renderer/render_perf_metrics_runtime_owner.js",
        "js/core/renderer/day_night_runtime_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "js/core/state_defaults.js",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/renderer_runtime_state.js",
        "js/core/map_renderer.js",
        "tests/renderer_phase_actions_behavior.test.mjs",
        "tests/renderer_interaction_actions_behavior.test.mjs",
        "tests/renderer_exact_refresh_actions_behavior.test.mjs",
        "tests/render_pass_cache_state_normalizer_behavior.test.mjs",
        "tests/renderer_cache_actions_behavior.test.mjs",
        "tests/renderer_diagnostics_actions_behavior.test.mjs",
        "tests/render_perf_metrics_runtime_owner_behavior.test.mjs",
        "tests/day_night_runtime_owner_behavior.test.mjs",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "tests/political_background_render_owner_behavior.test.mjs",
        "tests/exact_after_settle_scheduler_state_actions_behavior.test.mjs",
        "tests/renderer_render_phase_lifecycle_inventory.test.mjs",
        "tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs",
        "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
        "tests/renderer_runtime_state_behavior.test.mjs",
        "tests/physical_layer_contracts.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output",
        "heavy-geo",
        "scenario-data"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 27,
      "selectorOrder": 25,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:p4-3-renderer-boundary",
      "commandRef": "test:python:p4:p4-3-boundary",
      "sourceRefs": [
        "js/core/state/actions/renderer_phase_actions.js",
        "js/core/state/actions/renderer_interaction_actions.js",
        "js/core/state/actions/renderer_exact_refresh_actions.js",
        "js/core/state/actions/renderer_cache_actions.js",
        "js/core/renderer/render_pass_cache_state_normalizer.js",
        "js/core/state/actions/renderer_diagnostics_actions.js",
        "js/core/renderer/render_perf_metrics_runtime_owner.js",
        "js/core/renderer/day_night_runtime_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "js/core/map_renderer/exact_after_settle_scheduler.js",
        "js/bootstrap/startup_bootstrap_support.js",
        "js/core/scenario/chunk_runtime.js",
        "js/core/state/renderer_runtime_state.js",
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "tests/test_renderer_control_actions_boundary_contract.py",
        "tests/test_renderer_exact_refresh_actions_boundary_contract.py",
        "tests/render_pass_cache_state_normalizer_behavior.test.mjs",
        "tests/test_renderer_cache_actions_boundary_contract.py",
        "tests/test_renderer_diagnostics_actions_boundary_contract.py",
        "tests/render_perf_metrics_runtime_owner_behavior.test.mjs",
        "tests/day_night_runtime_owner_behavior.test.mjs",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "tests/test_day_night_runtime_owner_boundary_contract.py",
        "tests/test_map_renderer_political_background_render_owner_boundary_contract.py",
        "tests/test_renderer_runtime_state_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_state_write_guardrail_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 28,
      "selectorOrder": 26,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:state-write-boundary",
      "commandRef": "test:python:p4:state-write-boundary",
      "sourceRefs": [
        "tools/run_p4_state_write_boundary.mjs",
        "tests/test_state_write_guardrail_contract.py",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/check_state_writer_policy.mjs",
        "package.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 14,
      "selectorOrder": 12,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:p4:state-writer-policy",
      "commandRef": "verify:p4:state-writer-policy",
      "sourceRefs": [
        "tools/state_writer_inventory.mjs",
        "tools/state_action_delegation_contract.mjs",
        "tools/state_writer_policy.mjs",
        "tools/state_writer_policy.json",
        "tools/build_state_writer_policy.mjs",
        "tools/check_state_writer_policy.mjs",
        "tools/p4_state_action_phases.mjs",
        "tools/run_p4_state_writer_policy_tests.mjs",
        "tools/verification/p4_state_writer_policy_test_lifecycle.mjs",
        "tools/verification/p4_state_writer_historical_proof_worker.mjs",
        "tools/process_containment/windows_job_runtime.mjs",
        "tools/process_containment/windows_job_runner_v2.cs",
        "tools/process_containment/windows_job_runner_core.cs",
        "tools/run_p4_state_write_boundary.mjs",
        "tools/check_p4_state_action_routes.mjs",
        "tests/state_action_delegation_edges_behavior.test.mjs",
        "tests/state_writer_policy_behavior.test.mjs",
        "tests/state_writer_policy_batch_scan_behavior.test.mjs",
        "tests/state_writer_scanner_soundness_behavior.test.mjs",
        "tests/state_writer_policy_soundness_behavior.test.mjs",
        "tests/p4_state_action_routes_behavior.test.mjs",
        "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
        "tests/p4_state_writer_streaming_runner_behavior.test.mjs",
        "tests/state_writer_policy_manifest_behavior.test.mjs",
        "tests/test_state_write_guardrail_contract.py",
        "tests/supervisor_domain_registry_behavior.test.mjs",
        "tests/verification_metadata_behavior.test.mjs",
        "tests/verify_core_runner_behavior.test.mjs",
        "docs/active/state-action-ownership-p4-20260719",
        "docs/active/_worktree_registry.md",
        "tools/eslint-rules/no-direct-state-mutation.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/check_state_write_allowlist.mjs",
        "tools/verification/verification_domains.mjs",
        "tools/verification/verification_metadata_helpers.mjs",
        "tools/test_route_registry.mjs",
        "tools/select_verification_targets.mjs",
        "tools/ai_test_supervisor/domain_registry.json",
        "tools/ai_test_supervisor/check_supervisor_schemas.mjs",
        "package.json",
        "package-lock.json"
      ],
      "ownerHints": [
        "state-ownership"
      ],
      "domains": [
        "state-ownership"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "heavy",
      "resourceLocks": [
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "full"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 13,
      "selectorOrder": 11,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "state-ownership",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:python-quick",
      "commandRef": "npm run python -- -m unittest tests.test_app_entry_resolver tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract tests.test_map_renderer_interaction_border_snapshot_orchestration_contract tests.test_perf_gate_contract tests.test_startup_shell -q",
      "sourceRefs": [
        "tests/test_app_entry_resolver.py",
        "tests/test_main_deferred_detail_promotion_boundary_contract.py",
        "tests/test_scenario_chunk_refresh_contracts.py",
        "tests/test_scenario_renderer_bridge_boundary_contract.py",
        "tests/test_map_renderer_interaction_border_snapshot_orchestration_contract.py",
        "tests/test_perf_gate_contract.py",
        "tests/test_startup_shell.py"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 33,
      "selectorOrder": null,
      "verification": {
        "commandType": "direct",
        "packageScriptRequired": false,
        "verifyCoreDefaultGroup": "python-quick",
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core:state-write-allowlist",
      "commandRef": "verify:state-write-allowlist",
      "sourceRefs": [
        "tools/check_state_write_allowlist.mjs",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/state_writer_policy.json"
      ],
      "ownerHints": [
        "architecture"
      ],
      "domains": [
        "architecture-boundaries"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 12,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "architecture-boundaries"
      },
      "selector": null
    },
    {
      "id": "verify-core:supervisor-plan",
      "commandRef": "verify:supervisor-plan",
      "sourceRefs": [
        "tools/ai_test_supervisor/supervise_adaptive_verification.mjs",
        "tests/supervisor_plan_behavior.test.mjs"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "test-routing"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 32,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "test-routing"
      },
      "selector": null
    },
    {
      "id": "verify-core:test-console-allowlist",
      "commandRef": "verify:test-console-allowlist",
      "sourceRefs": [
        "tools/check_console_allowlist_decay.mjs",
        "tests/e2e/support/expectations/console-allowlist.js"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 30,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "playwright-observability"
      },
      "selector": null
    },
    {
      "id": "verify-core:test-timeout-guardrails",
      "commandRef": "verify:test-timeout-guardrails",
      "sourceRefs": [
        "tools/check_test_timeout_guardrails.mjs",
        "tests/e2e/test-layer-manifest.json"
      ],
      "ownerHints": [
        "test-infra"
      ],
      "domains": [
        "playwright-observability"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 31,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "infra",
        "supervisorDomain": "playwright-observability"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:annotation-productization",
      "commandRef": "test:node:annotation-productization",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 119,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:cached-pass-compositor-owner",
      "commandRef": "test:node:cached-pass-compositor-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-cached-pass-compositor-owner-p2-2a-20260711.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 94,
      "selectorOrder": 81,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:city-points-render-owner",
      "commandRef": "test:node:city-points-render-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/city_points_render_owner.js",
        "js/core/renderer/urban_city_policy.js",
        "tests/city_points_render_owner_behavior.test.mjs",
        "tests/urban_city_policy_strategic_values_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "regression"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 92,
      "selectorOrder": 79,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:click-selection-transaction-owner",
      "commandRef": "test:node:click-selection-transaction-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "tests/click_selection_transaction_owner_behavior.test.mjs",
        "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
        "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
        "tools/check_architecture_boundaries.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
        "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
        "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
        "docs/active/_worktree_registry.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 80,
      "selectorOrder": 67,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:context-pass-orchestrator-owner",
      "commandRef": "test:node:context-pass-orchestrator-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/context_pass_orchestrator_owner_behavior.test.mjs",
        "tools/renderer_pass_family_inventory.mjs",
        "tests/renderer_pass_family_inventory_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 43,
      "selectorOrder": 30,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:deferred-bootstrap",
      "commandRef": "test:node:deferred-bootstrap",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 39,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:draw-canvas-orchestration-owner",
      "commandRef": "test:node:draw-canvas-orchestration-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js",
        "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 83,
      "selectorOrder": 70,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:hit-canvas-scheduling-owner-suite",
      "commandRef": "test:node:hit-canvas-scheduling-owner-suite",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 106,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:main-bootstrap-wiring",
      "commandRef": "test:node:main-bootstrap-wiring",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 40,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:main-runtime-diagnostics",
      "commandRef": "test:node:main-runtime-diagnostics",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 35,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:map-interaction-event-binding-owner",
      "commandRef": "test:node:map-interaction-event-binding-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 108,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:political-pass-orchestrator-owner",
      "commandRef": "test:node:political-pass-orchestrator-owner",
      "sourceRefs": [
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/renderer/political_background_render_owner.js",
        "js/core/renderer/political_partial_repaint_owner.js",
        "tests/political_pass_orchestrator_owner_behavior.test.mjs",
        "docs/active/renderer-political-pass-orchestrator-owner-p3-3b-20260714.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 45,
      "selectorOrder": 32,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:post-ready-scheduler",
      "commandRef": "test:node:post-ready-scheduler",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 34,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-cache-owner",
      "commandRef": "test:node:render-cache-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 110,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-pass-cache-host-owner-suite",
      "commandRef": "test:node:render-pass-cache-host-owner-suite",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 104,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-pass-catalog",
      "commandRef": "test:node:render-pass-catalog",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 99,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-pass-commit-accounting-owner-suite",
      "commandRef": "test:node:render-pass-commit-accounting-owner-suite",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 105,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-pipeline-catalog",
      "commandRef": "test:node:render-pipeline-catalog",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 100,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-runtime-binding",
      "commandRef": "test:node:render-runtime-binding",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 36,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:render-transform-reuse-policy-owner",
      "commandRef": "test:node:render-transform-reuse-policy-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 111,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:renderer-click-selection-transaction-inventory",
      "commandRef": "test:node:renderer-click-selection-transaction-inventory",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "js/core/map_renderer/map_hover_interaction_owner.js",
        "js/core/renderer/map_interaction_event_binding_owner.js",
        "js/core/map_renderer/interaction_hit_candidates.js",
        "js/core/interaction_funnel.js",
        "js/core/history_manager.js",
        "js/core/dirty_state.js",
        "js/core/map_renderer/public.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
        "tests/click_selection_transaction_owner_behavior.test.mjs",
        "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
        "tools/check_architecture_boundaries.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
        "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
        "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
        "docs/active/_worktree_registry.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 81,
      "selectorOrder": 68,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-draw-canvas-orchestration-inventory",
      "commandRef": "test:node:renderer-draw-canvas-orchestration-inventory",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "tests/test_map_renderer_draw_canvas_orchestration_owner_boundary_contract.py",
        "tests/test_map_renderer_frame_compositor_owner_boundary_contract.py",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-preflight-20260702.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-cached-pass-compositor-owner-p2-2a-20260711.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-transformed-frame-compositor-owner-p2-2b-20260712.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/plan.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/context.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/task.md",
        "tools/check_architecture_boundaries.mjs",
        "tools/verification/verification_domains.mjs",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 82,
      "selectorOrder": 69,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-pass-family-inventory",
      "commandRef": "test:node:renderer-pass-family-inventory",
      "sourceRefs": [
        "js",
        "dist",
        "tools/renderer_pass_family_inventory.mjs",
        "tests/renderer_pass_family_inventory_behavior.test.mjs",
        "js/core/renderer/render_pipeline_catalog.js",
        "js/core/map_renderer/render_pass_catalog.js",
        "js/core/map_renderer.js",
        "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
        "js/core/renderer/transport_overview_render_owner.js",
        "js/core/state/ui_state.js",
        "docs/archive/renderer-pass-family-p3-20260713/plan.md",
        "docs/archive/renderer-pass-family-p3-20260713/context.md",
        "docs/archive/renderer-pass-family-p3-20260713/task.md",
        "docs/archive/renderer-pass-family-p3-20260713/closeout.md",
        "docs/archive/renderer-pass-family-p3-20260713/coupling-matrix-p3-0.md",
        "docs/active/renderer-pass-family-p3-20260713/plan.md",
        "docs/active/renderer-pass-family-p3-20260713/context.md",
        "docs/active/renderer-pass-family-p3-20260713/task.md",
        "docs/active/renderer-pass-family-p3-closeout-20260715.md",
        "docs/active/renderer-pass-family-coupling-matrix-p3-0-20260713.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 41,
      "selectorOrder": 28,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-political-pass-orchestration-preflight",
      "commandRef": "test:node:renderer-political-pass-orchestration-preflight",
      "sourceRefs": [
        "js/core",
        "tests/renderer_political_pass_orchestration_preflight.test.mjs",
        "docs/active/renderer-political-pass-preflight-p3-3a-20260714.md",
        "tools/renderer_pass_family_inventory.mjs",
        "tests/renderer_pass_family_inventory_behavior.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "tests/test_map_renderer_render_pipeline_passes_boundary_contract.py",
        "tools/eslint-rules/state-writer-allowlist.json",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 44,
      "selectorOrder": 31,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-render-phase-lifecycle",
      "commandRef": "test:node:renderer-render-phase-lifecycle",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 102,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:renderer-render-request-boundary",
      "commandRef": "test:node:renderer-render-request-boundary",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 101,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-foundation",
      "commandRef": "test:node:renderer-runtime-context-foundation",
      "sourceRefs": [
        "js/core/map_renderer/renderer_runtime_context.js",
        "tests/renderer_runtime_context_foundation_behavior.test.mjs",
        "docs/active/renderer-runtime-context-foundation-p1-0-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 66,
      "selectorOrder": 53,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-hit-hover",
      "commandRef": "test:node:renderer-runtime-context-hit-hover",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/map_renderer/hit_canvas_scheduling_owner.js",
        "js/core/map_renderer/map_hover_interaction_owner.js",
        "tests/renderer_runtime_context_hit_hover_behavior.test.mjs",
        "tests/renderer_runtime_context_interaction_behavior.test.mjs",
        "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
        "tests/hit_canvas_scheduling_owner_inventory.test.mjs",
        "tests/map_hover_interaction_owner_behavior.test.mjs",
        "tests/map_hover_interaction_owner_inventory.test.mjs",
        "docs/active/renderer-runtime-context-hit-hover-p1-6-20260709.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 78,
      "selectorOrder": 65,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-interaction",
      "commandRef": "test:node:renderer-runtime-context-interaction",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js",
        "js/core/renderer/map_interaction_event_binding_owner.js",
        "tests/renderer_runtime_context_interaction_behavior.test.mjs",
        "tests/renderer_runtime_context_receiver_behavior.test.mjs",
        "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
        "tests/map_interaction_event_binding_owner_behavior.test.mjs",
        "docs/active/renderer-runtime-context-interaction-p1-5-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 76,
      "selectorOrder": 63,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-projection-viewport",
      "commandRef": "test:node:renderer-runtime-context-projection-viewport",
      "sourceRefs": [
        "js/core/map_renderer/renderer_runtime_context.js",
        "tests/renderer_runtime_context_projection_viewport_behavior.test.mjs",
        "docs/active/renderer-runtime-context-projection-viewport-p1-3-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 70,
      "selectorOrder": 57,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-receiver",
      "commandRef": "test:node:renderer-runtime-context-receiver",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/map_renderer/render_pass_cache_host_owner.js",
        "js/core/map_renderer/render_pass_commit_accounting_owner.js",
        "tests/renderer_runtime_context_receiver_behavior.test.mjs",
        "tests/render_pass_cache_host_owner_inventory.test.mjs",
        "tests/render_pass_commit_accounting_owner_inventory.test.mjs",
        "docs/active/renderer-runtime-context-first-receiver-p1-1-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 67,
      "selectorOrder": 54,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-render-cache",
      "commandRef": "test:node:renderer-runtime-context-render-cache",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/render_cache_owner.js",
        "tests/renderer_runtime_context_render_cache_behavior.test.mjs",
        "tests/renderer_runtime_context_receiver_behavior.test.mjs",
        "docs/active/renderer-runtime-context-render-cache-read-model-p1-2-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 68,
      "selectorOrder": 55,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-runtime-context-viewport-mutation",
      "commandRef": "test:node:renderer-runtime-context-viewport-mutation",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_fit_projection_owner.js",
        "js/core/renderer/renderer_viewport_update_owner.js",
        "js/core/renderer/viewport_resize_lifecycle_owner.js",
        "tests/renderer_runtime_context_viewport_mutation_behavior.test.mjs",
        "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 72,
      "selectorOrder": 59,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:renderer-viewport-update-owner",
      "commandRef": "test:node:renderer-viewport-update-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/renderer_viewport_update_owner.js",
        "tests/renderer_viewport_update_owner_behavior.test.mjs",
        "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 74,
      "selectorOrder": 61,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:scenario-apply-transaction-ownership",
      "commandRef": "test:node:scenario-apply-transaction-ownership",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 116,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:scenario-chunk-contracts",
      "commandRef": "test:node:scenario-chunk-contracts",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 115,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:scenario-lifecycle-runtime-behavior",
      "commandRef": "test:node:scenario-lifecycle-runtime-behavior",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 117,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:scenario-runtime-state-behavior",
      "commandRef": "test:node:scenario-runtime-state-behavior",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 118,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:startup-failure-recovery",
      "commandRef": "test:node:startup-failure-recovery",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 37,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:startup-ready-handoff",
      "commandRef": "test:node:startup-ready-handoff",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "startup-runtime"
      ],
      "domains": [
        "startup"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 38,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "startup-node",
        "supervisorDomain": "startup"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:transformed-frame-compositor-owner",
      "commandRef": "test:node:transformed-frame-compositor-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
        "tests/scenario_chunk_contracts.test.mjs",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-transformed-frame-compositor-owner-p2-2b-20260712.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 95,
      "selectorOrder": 82,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:viewport-command-owner",
      "commandRef": "test:node:viewport-command-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 113,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:viewport-read-model-owner",
      "commandRef": "test:node:viewport-read-model-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 112,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:viewport-resize-lifecycle-owner",
      "commandRef": "test:node:viewport-resize-lifecycle-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/viewport_resize_lifecycle_owner.js",
        "tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
        "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 75,
      "selectorOrder": 62,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:visible-frame-diagnostics",
      "commandRef": "test:node:visible-frame-diagnostics",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 109,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:node:visual-effects-pass-owner",
      "commandRef": "test:node:visual-effects-pass-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "tools/renderer_pass_family_inventory.mjs",
        "tests/renderer_pass_family_inventory_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 42,
      "selectorOrder": 29,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:node:zoom-interaction-lifecycle-owner",
      "commandRef": "test:node:zoom-interaction-lifecycle-owner",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 107,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime"
      },
      "selector": null
    },
    {
      "id": "verify-core:test:python:map-renderer-city-points-boundary",
      "commandRef": "test:python:map-renderer-city-points-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/city_points_render_owner.js",
        "js/core/renderer/urban_city_policy.js",
        "tests/test_map_renderer_urban_city_policy_boundary_contract.py",
        "tests/test_map_renderer_city_label_owner_boundary_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 93,
      "selectorOrder": 80,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-click-selection-transaction-boundary",
      "commandRef": "test:python:map-renderer-click-selection-transaction-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/click_selection_transaction_owner.js",
        "js/core/map_renderer/map_hover_interaction_owner.js",
        "js/core/renderer/map_interaction_event_binding_owner.js",
        "js/core/map_renderer/interaction_hit_candidates.js",
        "js/core/interaction_funnel.js",
        "js/core/history_manager.js",
        "js/core/dirty_state.js",
        "js/core/map_renderer/public.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
        "tests/click_selection_transaction_owner_behavior.test.mjs",
        "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
        "tools/check_architecture_boundaries.mjs",
        "tools/verification/verification_domains.mjs",
        "tests/verification_metadata_behavior.test.mjs",
        "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
        "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
        "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
        "docs/active/_worktree_registry.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 98,
      "selectorOrder": 85,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-draw-canvas-orchestration-boundary",
      "commandRef": "test:python:map-renderer-draw-canvas-orchestration-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/draw_canvas_orchestration_owner.js",
        "js/core/map_renderer/public.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/check_architecture_boundaries.mjs",
        "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
        "tests/test_map_renderer_draw_canvas_orchestration_owner_boundary_contract.py",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 84,
      "selectorOrder": 71,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-frame-compositor-boundary",
      "commandRef": "test:python:map-renderer-frame-compositor-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/cached_pass_compositor_owner.js",
        "js/core/map_renderer/transformed_frame_compositor_owner.js",
        "js/core/map_renderer/public.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/check_architecture_boundaries.mjs",
        "tests/cached_pass_compositor_owner_behavior.test.mjs",
        "tests/transformed_frame_compositor_owner_behavior.test.mjs",
        "tests/test_map_renderer_frame_compositor_owner_boundary_contract.py",
        "tests/test_pages_dist_startup_shell.py",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-cached-pass-compositor-owner-p2-2a-20260711.md",
        "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-transformed-frame-compositor-owner-p2-2b-20260712.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 97,
      "selectorOrder": 84,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-hit-hover-context-boundary",
      "commandRef": "test:python:map-renderer-hit-hover-context-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/map_renderer/hit_canvas_scheduling_owner.js",
        "js/core/map_renderer/map_hover_interaction_owner.js",
        "js/core/map_renderer/public.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tests/test_map_renderer_hit_hover_context_boundary_contract.py",
        "docs/active/renderer-runtime-context-hit-hover-p1-6-20260709.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
        "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 79,
      "selectorOrder": 66,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-interaction-context-boundary",
      "commandRef": "test:python:map-renderer-interaction-context-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/zoom_interaction_lifecycle_owner.js",
        "js/core/renderer/map_interaction_event_binding_owner.js",
        "js/core/map_renderer/public.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tests/test_map_renderer_interaction_context_boundary_contract.py",
        "docs/active/renderer-runtime-context-interaction-p1-5-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 77,
      "selectorOrder": 64,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-political-pass-orchestrator-boundary",
      "commandRef": "test:python:map-renderer-political-pass-orchestrator-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "js/core/map_renderer/public.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tools/check_architecture_boundaries.mjs",
        "tools/renderer_pass_family_inventory.mjs",
        "tests/test_map_renderer_political_pass_orchestrator_boundary_contract.py",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 46,
      "selectorOrder": 33,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-projection-viewport-context-boundary",
      "commandRef": "test:python:map-renderer-projection-viewport-context-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/renderer/renderer_projection_path_owner.js",
        "js/core/renderer/viewport_read_model_owner.js",
        "js/core/renderer/viewport_command_owner.js",
        "tests/test_map_renderer_projection_viewport_context_boundary_contract.py",
        "tests/renderer_runtime_context_receiver_behavior.test.mjs",
        "docs/active/renderer-runtime-context-projection-viewport-p1-3-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 71,
      "selectorOrder": 58,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-render-cache-owner-boundary",
      "commandRef": "test:python:map-renderer-render-cache-owner-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/render_cache_owner.js",
        "tests/test_map_renderer_render_cache_owner_boundary_contract.py",
        "docs/active/renderer-runtime-context-render-cache-read-model-p1-2-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 69,
      "selectorOrder": 56,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-render-pipeline-passes-boundary",
      "commandRef": "test:python:map-renderer-render-pipeline-passes-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "js/core/renderer/political_pass_orchestrator_owner.js",
        "tests/test_map_renderer_render_pipeline_passes_boundary_contract.py",
        "tests/test_map_renderer_strategic_values_render_contract.py",
        "tools/check_architecture_boundaries.mjs",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 65,
      "selectorOrder": 52,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:map-renderer-viewport-mutation-context-boundary",
      "commandRef": "test:python:map-renderer-viewport-mutation-context-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/map_renderer/renderer_runtime_context.js",
        "js/core/map_renderer/public.js",
        "tools/eslint-rules/state-writer-allowlist.json",
        "tests/test_map_renderer_viewport_mutation_context_boundary_contract.py",
        "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
        "package.json"
      ],
      "ownerHints": [
        "renderer-runtime"
      ],
      "domains": [
        "renderer-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": [
        "child-safe"
      ],
      "profiles": [
        "pr-fast"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 73,
      "selectorOrder": 60,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:verify:scenario-contracts:strict",
      "commandRef": "verify:scenario-contracts:strict",
      "sourceRefs": [
        "package.json",
        "tests/verify_core_runner_behavior.test.mjs"
      ],
      "ownerHints": [
        "scenario-runtime"
      ],
      "domains": [
        "scenario-runtime"
      ],
      "tiers": [
        "contract"
      ],
      "cost": "contract",
      "resourceLocks": [
        "scenario-data",
        ".runtime-output"
      ],
      "executionOwners": [
        "main-thread"
      ],
      "profiles": [
        "scenario-contract-matrix"
      ],
      "platforms": [
        "all"
      ],
      "entrypointPolicyIndex": 0,
      "verificationOrder": 114,
      "selectorOrder": null,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "scenario-project-chunk",
        "supervisorDomain": "scenario-runtime"
      },
      "selector": null
    },
    {
      "id": "node:test:node:day-night-runtime-owner",
      "commandRef": "test:node:day-night-runtime-owner",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/day_night_runtime_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/state_defaults.js",
        "js/core/state/actions/renderer_phase_actions.js",
        "tests/day_night_runtime_owner_behavior.test.mjs",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
        "package.json"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 129,
      "selectorOrder": 380,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    },
    {
      "id": "verify-core:test:python:day-night-runtime-owner-boundary",
      "commandRef": "test:python:day-night-runtime-owner-boundary",
      "sourceRefs": [
        "js/core/map_renderer.js",
        "js/core/renderer/day_night_runtime_owner.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/state/actions/renderer_phase_actions.js",
        "tests/test_day_night_runtime_owner_boundary_contract.py",
        "tests/test_map_renderer_render_pipeline_passes_boundary_contract.py",
        "package.json"
      ],
      "ownerHints": ["renderer-runtime"],
      "domains": ["renderer-runtime"],
      "tiers": ["contract"],
      "cost": "fast",
      "resourceLocks": [],
      "executionOwners": ["child-safe"],
      "profiles": ["pr-fast"],
      "platforms": ["all"],
      "entrypointPolicyIndex": 4,
      "verificationOrder": 130,
      "selectorOrder": 381,
      "verification": {
        "commandType": "package-script",
        "packageScriptRequired": true,
        "verifyCoreDefaultGroup": "renderer-owner",
        "supervisorDomain": "renderer-runtime",
        "routeRegistry": true
      },
      "selector": {}
    }
  ]
};

export const VERIFICATION_METADATA_SOURCE = deepFreeze(
  normalizeVerificationMetadataSource(AUTHORED_VERIFICATION_METADATA),
);
export const VERIFICATION_METADATA_SOURCE_IDENTITY = deepFreeze({
  schemaVersion: 1,
  kind: "verification-metadata-source-identity",
  algorithm: "sha256",
  digest: verificationMetadataSourceDigest(VERIFICATION_METADATA_SOURCE),
});
