# Localization Automation Plan

## Goal

- Run the live localization audit for unlocalized content.
- Focus on UI surfaces and local-state/scenario patch flows.
- Confirm there is no incorrect override in the current tree.

## Steps

- [x] Read automation memory, lessons learned, and prior localization notes.
- [x] Run `python tools/i18n_audit.py` and capture current drift buckets.
- [x] Audit UI/catalog/source-of-truth files for scan-scope drift.
- [x] Audit local-state/scenario patch merge and reload order for override safety.
- [x] Apply the smallest fix only if a real drift or override bug appears.
- [x] Run targeted localization verification.

## Result

- `python tools/i18n_audit.py` initially reported `ui_missing=26` and `uncovered_visible_ui=8`.
- The real current-tree gaps were Cloud Saves / community / auth / report / `fragments` UI keys missing from `data/locales.json` and `dist/app/data/locales.json`.
- The remaining 8 uncovered literals were source-provider names, so `tools/i18n_audit.py` now treats them as explicit non-translatable tokens instead of false-positive UI drift.
- Static override review stayed clean:
  - `js/core/scenario/shared.js` still resolves locale-specific geo patch URLs before the shared fallback.
  - `js/core/scenario_localization_state.js` still merges `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
  - `js/ui/dev_workspace/scenario_text_editors_controller.js` still reloads the saved patch from `publishedPath/generatedPath`, normalizes it, then replays `syncScenarioLocalizationState(...)`.
- Fresh verification passed:
  - `python tools/i18n_audit.py` -> `ui_missing=0`, `uncovered_visible_ui=0`, `scenario_geo_missing=0`, `scenario_metadata_missing=0`
  - `python -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q` -> `Ran 76 tests ... OK`
