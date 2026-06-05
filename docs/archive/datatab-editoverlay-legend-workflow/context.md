# DataTab/EditOverlay and Legend Workflow Context

## 2026-06-05 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-datatab-legend-workflow`
- Branch: `codex/datatab-legend-workflow`
- Base commit: `b935750c`
- Parent checkout had unrelated dirty files and local commits; this worktree isolates implementation.
- Lessons loaded. Relevant rules: user edit layers stay delta/source separated, legend/source edits require `verify:pages-dist`, and UI changes should lock visible behavior with targeted tests.

## Existing Evidence

- DataTab already renders bounded `dataRows`, search, sort, column toggles, and row-to-map selection.
- EditOverlay already stores created/updated/deleted point deltas in `transportWorkbenchPointDeltas`.
- Point preview already builds an effective preview pack from source pack plus point deltas.
- Project export/import already preserves `transportWorkbenchPointDeltas`, `legendLabels`, and `legendConfig`.
- `LegendManager` already normalizes `legendControl`, but project export/import does not yet persist it.

## Current Target

V1 completion means a point-family edit can be seen in DataTab, previewed in the workbench, exported with the project, imported again, and recovered with the same delta and legend control state.

## 2026-06-05 Implementation Notes

- Extended editable point families through the shared point delta normalizer: airport, port, energy facilities, mineral resources, logistics hubs, and industrial zones.
- Added DataTab `Edit` status for source, created, updated, and deleted rows. Deleted source rows are represented from the delta list when preview filtering removes them from the effective pack.
- Wired right-deck selected point actions to existing state owner update/delete functions through the controller refresh path.
- Added `legendControl` to project export/import using `LegendManager.normalizeControl`.
- Targeted verification passed:
  - `node --check js\core\state_defaults.js js\ui\toolbar\transport_workbench_right_deck_owner.js js\ui\toolbar\transport_workbench_state_owner.js js\ui\toolbar\transport_workbench_controller.js js\core\file_manager.js`
  - `node --test tests\transport_workbench_right_deck_owner_behavior.test.mjs tests\transport_workbench_state_owner_behavior.test.mjs tests\file_manager_project_roundtrip_behavior.test.mjs tests\transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests\legend_manager_generation_behavior.test.mjs` (61/61)
  - `npm run verify:pages-dist` (Pages builder completed, 22 startup shell tests OK)

## 2026-06-05 Review Fixes

- Static reviewer found that `Save selected` could clear existing delta properties when the right deck sent only name/lon/lat. `updateEditOverlayPoint` now preserves existing created/update patch properties unless a caller explicitly sends a new `properties` object.
- Added regression assertions for source patch property retention and created point property retention after position/name updates.
- Added non-airport/port project roundtrip coverage for `logistics_hubs` with `hub_type` and `operator_classification`.
- Current `dist/pages-dist-manifest.json` state was verified as modified, not deleted. Added a checked-in manifest existence test so future deletion cannot be skipped by Pages startup shell tests.
