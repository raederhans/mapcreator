# Localization Plan

## Goal

- Run the live localization audit for unlocalized content.
- Focus on UI surfaces and local-state/scenario patch flows.
- Confirm there is no incorrect override in the current tree.

## Steps

- [x] Read automation memory, lessons learned, and prior archived localization notes.
- [x] Run `python tools/i18n_audit.py` and capture current drift buckets.
- [x] Audit UI/catalog/source-of-truth files for scan-scope drift.
- [x] Audit local-state/scenario patch merge and reload order for override safety.
- [x] Apply the smallest fix only if a real drift or override bug appears.
- [x] Run targeted localization verification.

## Result

- No repo code or locale patch was required in this run.
- Live audit stayed clean: `ui_missing=0`, `ui_english_fallback=0`, `uncovered_visible_ui=0`, `a11y_literals=0`, `dynamic_ui=2`, `scenario_geo_missing=0`, and `scenario_metadata_missing=0`.
- Targeted verification passed:
  - `python -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
  - `python -m unittest tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q`
