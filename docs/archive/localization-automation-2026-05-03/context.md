# Context

- 2026-05-03: Read prior localization memory and the previous 2026-05-01 automation archive before touching code.
- 2026-05-03: `python3 tools/i18n_audit.py` reported `ui_missing=12`, `uncovered_visible_ui=0`, `a11y_literals=0`, `scenario_geo_missing=0`, `source_name_corrupted=0`.
- 2026-05-03: All 12 missing keys come from `js/ui/sidebar/project_support_diagnostics_controller.js`; runtime wiring already uses `t(..., "ui")`, but the strings are absent from `data/i18n/manual_ui.json`, `data/locales.json`, and `data/i18n/locales_baseline.json`.
- 2026-05-03: Static review of `js/core/scenario_localization_state.js` still shows merge order `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`, with explicit scenario patch last.
- 2026-05-03: Patched the 12 diagnostics-panel keys into `manual_ui`, `locales.json`, and `locales_baseline.json`, then added the existing `Line Width` baseline entry for source consistency.
- 2026-05-03: Final verification is clean: `python3 tools/i18n_audit.py` => `ui_missing=0`, and `python3 -m unittest tests.test_i18n_audit tests.test_translate_manager -q` => 22 tests passed.
