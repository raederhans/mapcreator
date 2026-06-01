# Export Workflow Platform Context

## 2026-06-01

- User chose: package delivery first, include Export workbench + Project JSON + scenario publish, and use a ZIP library.
- Created worktree: `C:\Users\raede\.codex\worktrees\export-workflow-platform`.
- Branch: `codex/export-workflow-platform`, based on `origin/main` at `330aca5a`.
- Main thread owns all live tests/browser/builds.
- Subagents may do static review and test suggestions only.
- Current source facts:
  - Export workbench has composite, per-layer, and bake-pack flows.
  - Per-layer and bake-pack currently trigger multiple browser downloads.
  - Bake-pack metadata exists as a separate JSON blob.
  - Project JSON already preserves export settings, appearance, and transport state.
  - Scenario publish already records published targets in build state.
- Implemented `js/core/export_artifact_package.js` with manifest-first ZIP packaging backed by vendored `fflate`.
- Export workbench per-layer and bake-pack targets now download one ZIP package with `manifest.json`; composite image behavior stays unchanged.
- Project JSON export/import now carries `exportHandoff` metadata while runtime-only bake cache stays out of saved JSON.
- Scenario publish state now stores `published_targets[].artifact_manifest`; old `target/files/published_at` fields remain intact.
- Test finding fixed during execution: workbench normalization dropped the runtime `bakeCache` Map. `ensureExportWorkbenchUiState` now preserves that Map after normalization.
- Validation completed:
  - `node --check js/core/export_artifact_package.js js/core/file_manager.js js/ui/toolbar.js js/ui/toolbar/export_workbench_controller.js`
  - `python -m py_compile map_builder/scenario_build_session.py`
  - `node --test tests/export_workbench_state_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs`
  - `python -m unittest tests.test_scenario_build_session tests.test_publish_scenario_outputs tests.test_scenario_bundle_publish_service -q`
  - `python tools/i18n_audit.py`
  - `npm run test:node:annotation-productization`
  - `npm run verify:pages-dist`

## Live Process Ownership

- No live tests or browser sessions are running.
- Main thread owns final git merge/push/cleanup.
- Final review completed after verification. The simpler stable shape is a shared artifact manifest helper plus narrow integrations at the three export boundaries; no extra workflow abstraction was added. Git closeout happens after this archived task state is committed.
