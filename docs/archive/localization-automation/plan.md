# Localization Automation Plan

## Goal

- Run the live localization audit for unlocalized content.
- Focus on UI surfaces and local-state/scenario patch flows.
- Confirm explicit scenario geo patch entries still win over lower-priority locale layers.

## Steps

- [done] Read prior automation memory, lessons learned, and current repo state.
- [done] Run `python tools/i18n_audit.py` and collect the current drift buckets.
- [done] Audit UI and local-state code paths for coverage gaps or incorrect override order.
- [done] No source-of-truth fix was needed because the live audit stayed clean.
- [done] Run targeted localization and scenario-localization tests.

## Verification

- `python tools/i18n_audit.py`
- `python -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
- `python -m unittest tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q`
