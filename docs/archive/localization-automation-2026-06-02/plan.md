# Localization Automation Plan

## Goal

- Run the current localization audit for unlocalized content.
- Recheck UI and local-state/scenario patch flows.
- Fix only current-tree localization drift or override bugs.

## Steps

- [x] Read automation memory, lessons learned, and prior localization notes.
- [x] Inspect the current audit script and override-critical files.
- [x] Run `python tools/i18n_audit.py` and capture current buckets.
- [x] Recheck UI/local-state override order against current source.
- [x] Apply the smallest fix only if the current tree shows a real issue.
- [x] Run targeted localization verification.
- [x] Update automation memory and archive the task if complete.

## Result

- `python tools/i18n_audit.py` stayed clean in the current tree:
  - `ui_missing=0`
  - `ui_english_fallback=0`
  - `uncovered_visible_ui=0`
  - `scenario_geo_missing=0`
  - `scenario_metadata_missing=0`
- Known noise stayed unchanged:
  - `dynamic_ui=2`
  - `shell_fallback_missing_like=32663`
- Static override review stayed clean:
  - `js/core/scenario/shared.js` still resolves locale-specific geo patch URLs before the shared fallback.
  - `js/core/scenario_localization_state.js` still merges `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
  - `js/ui/dev_workspace/scenario_text_editors_controller.js` still reloads the saved patch from `publishedPath/generatedPath`, normalizes it, then replays `syncScenarioLocalizationState(...)`.
- Targeted verification passed:
  - `python -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q`
  - `Ran 76 tests ... OK`
