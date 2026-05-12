# Context

- Date: 2026-05-07
- Task: Read-only localization override safety audit
- Focus files:
  - `js/core/scenario_localization_state.js`
  - `js/bootstrap/startup_data_pipeline.js`
  - `js/core/scenario/startup_hydration.js`
  - `js/core/scenario_apply_pipeline.js`
  - `js/core/scenario/chunk_runtime.js`
  - `js/ui/dev_workspace/scenario_text_editors_controller.js`
  - `js/ui/i18n.js`
  - `js/core/state/content_state.js`
  - `js/core/scenario_rollback.js`

## Findings Notes
- Live merge in `syncScenarioLocalizationState()` still applies `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
- Startup/full-localization refresh paths update base snapshots first, then re-run `syncScenarioLocalizationState()` when a scenario is active.
- Language switch reloads the scenario geo locale patch through `ensureScenarioGeoLocalePatchForLanguage()` and then re-applies merged localization state.
- Chunk/runtime city override refresh paths call `syncScenarioLocalizationState({ cityOverridesPayload: ... })`, which preserves the currently active explicit scenario patch.
- Rollback restores a captured presentation snapshot directly; it restores both merged `locales` and `scenarioGeoLocalePatchData` from the same snapshot, so no independent merge-order drift was found in the current code.
- Existing targeted Playwright coverage already asserts that explicit scenario geo locale patch wins over derived city override sync.
