# Remaining Worktree Audit 2026-05-26

## Goal

Audit the remaining dirty worktrees, keep useful work by integrating it into `main`, and discard stale local changes when the current `main` already supersedes them.

## Acceptance

- [x] Each remaining worktree has a documented keep/discard decision.
- [x] Useful changes are merged into `main`, verified, committed, and pushed.
- [x] Stale changes are discarded only after their diff is compared against current `main`.
- [x] Removed worktrees are cleaned with `git worktree remove`, and merged local branches are deleted.
- [x] Main checkout ends clean except for excluded local runtime noise.

## Live Process Owner

Main thread owns git writes, destructive cleanup, and all verification commands. Subagents are read-only reviewers.

## Decisions

- `C:/Users/raede/.codex/worktrees/0a63/mapcreator`: kept. Current `main` still lacked the bathymetry retry cooldown, empty bathymetry topology helper, remaining Atlantropa bathymetry diagnostics fix, and coastal accent relief gating.
- `C:/Users/raede/.codex/worktrees/c7af/mapcreator`: discarded. The patch targeted the old sidebar import path; current `main` already moved import-audit handling into the interaction funnel.
- `C:/Users/raede/Desktop/dev/mapcreator-data-foundation-audit`: discarded. The branch commits are already in `main`; dirty state was line-ending noise in locale JSON files.
- `C:/Users/raede/Desktop/dev/mapcreator-data-foundation-main-merge`: discarded. The merge work is already in `main`; dirty state was line-ending noise in locale JSON files.
- `C:/Users/raede/Desktop/dev/mapcreator-tno-color-policy-fix`: partially kept. Current `main` superseded the old large worktree diff, so only the still-useful `color_policy` contract and DEV country color editor path were reimplemented on top of current files.

## Verification

- `node --check js/core/map_renderer.js js/core/state/dev_state.js js/ui/dev_workspace/dev_workspace_shell_builder.js js/ui/dev_workspace/scenario_text_editors_controller.js js/ui/dev_workspace/scenario_country_color_editor.js`
- `python -m py_compile tools/build_global_bathymetry_asset.py tools/dev_server.py tools/patch_tno_1962_bundle.py map_builder/scenario_political_materialization_support.py`
- `python -m unittest tests.test_build_global_bathymetry_asset tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_dev_server.DevServerTest.test_save_scenario_country_payload_updates_manual_overrides_and_country_metadata tests.test_dev_server.DevServerTest.test_save_scenario_country_payload_preserves_palette_policy_when_only_names_change tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_build_tno_bathymetry_payload_marks_observed_and_synthetic_modes tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_tno_palette_audit_sync_uses_locked_color_overrides tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_apply_tno_country_color_policy_backfill_marks_locked_and_palette_entries tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_sync_tno_country_colors_from_palette_audit_only_updates_palette_entries`
- `python -m unittest tests.test_build_global_bathymetry_asset tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_dev_server.DevServerTest.test_save_scenario_country_payload_updates_manual_overrides_and_country_metadata tests.test_dev_server.DevServerTest.test_save_scenario_country_payload_preserves_palette_policy_when_only_names_change tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_build_tno_bathymetry_payload_marks_observed_and_synthetic_modes tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_tno_palette_audit_sync_uses_color_policy_not_static_override_list tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_apply_tno_country_color_policy_backfill_marks_locked_and_palette_entries tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_sync_tno_country_colors_from_palette_audit_only_updates_palette_entries tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_second_wave_color_sources_match_expected_targets`
- `python -m unittest tests.test_dev_server tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_build_global_bathymetry_asset tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_second_wave_color_sources_match_expected_targets tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_second_wave_runtime_colors_match_tno_audit_targets tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_final_wave_runtime_colors_match_tno_audit_targets`
