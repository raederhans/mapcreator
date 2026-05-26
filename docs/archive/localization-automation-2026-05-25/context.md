# Localization Context

## Current Run

- Date: 2026-05-25
- Owner: main thread
- Live-process owner: main thread owns the audit and targeted tests for this run.

## Notes

- Current ask: run the localization script for unlocalized contents, especially UI and local states, and confirm there is no incorrect override.
- Prior clean runs kept the same watchpoints: `dynamic_ui=2` and a large `shell_fallback_missing_like` noise bucket.
- Static review will focus on `js/core/scenario_localization_state.js`, `js/core/scenario/shared.js`, and `js/ui/dev_workspace/scenario_text_editors_controller.js`.
- Existing unrelated worktree noise includes `.omx/*` runtime files plus pre-existing repo edits under `docs/`, `js/`, and `lessons learned.md`; this run left them untouched.
- Live audit result: `ui_missing=0`, `ui_english_fallback=0`, `uncovered_visible_ui=0`, `a11y_literals=0`, `dynamic_ui=2`, `scenario_geo_missing=0`, and `scenario_metadata_missing=0`.
- Static review confirmed `js/core/scenario_localization_state.js` still applies geo locales in the order `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
- Static review confirmed `js/ui/dev_workspace/scenario_text_editors_controller.js` still reloads the saved patch from `publishedPath/generatedPath`, normalizes it, and replays `syncScenarioLocalizationState(...)`.
- Static review confirmed `js/core/scenario/shared.js` still resolves locale-specific geo locale patch URLs before the shared manifest fallback.
- No incorrect override was found and no repo patch was needed.

## Watchpoints

- `dynamic_ui=2` remains the same small dynamic bucket seen in earlier clean runs.
- `shell_fallback_missing_like=32663` remains audit noise from shell fallback names, not a new regression.
