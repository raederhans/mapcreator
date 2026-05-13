# Annotation Productization Context

## 2026-05-12

- Worktree: `C:\Users\raede\.codex\worktrees\infoupdate\mapcreator`
- Branch: `codex/infoupdate`
- Main worktree has unrelated dirty files; this task only uses the `infoupdate` worktree.
- Live process owner: main assistant thread only. Subagents may do static analysis and review only.

## Findings

- `normalizeUnitCounters()` currently preserves baseline counter identity/anchor fields but omits `baseFillColor`, `organizationPct`, `equipmentPct`, `statsPresetId`, and `statsSource`.
- `normalizeOperationGraphics()` and `normalizeOperationalLines()` reject some kind values already used by runtime/history tests.
- Unit counter drag detach in `map_renderer.js` clears the counter-side attachment but does not immediately rebuild line-side `attachedCounterIds`.
- Export workbench exposes `svg-annotations`, but count and labels are too coarse for publishable-map QA.
- Implemented the minimal productization pass in the `infoupdate` worktree: project roundtrip now preserves strategic annotation product fields, detached counters rebuild operational-line attachment ids, and `svg-annotations` exports only strategic annotation SVG layers.
- UI wording now frames the surface as `Derived Frontlines` and `Strategic Annotations`, with a publish status count in the Project tab.

## Verification Log

- `node --check js/core/file_manager.js js/core/map_renderer.js js/core/state_defaults.js js/ui/toolbar.js js/ui/toolbar/export_workbench_controller.js js/ui/sidebar.js js/ui/sidebar/strategic_overlay_controller.js` passed.
- `node --check tests/file_manager_project_roundtrip_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs` passed.
- After review fixes, `node --check js/ui/i18n_catalog.js js/ui/toolbar/export_workbench_controller.js js/ui/sidebar.js js/ui/sidebar/strategic_overlay_controller.js tests/export_workbench_state_behavior.test.mjs` passed.
- `python tools/i18n_audit.py` passed: `ui_missing=0`, `ui_english_fallback=0`, `uncovered_visible_ui=0`.
- `npm run test:node:annotation-productization` passed: 15 tests.
- Final static review found one duplicate i18n catalog key; duplicate was removed and `python tools/i18n_audit.py` plus `npm run test:node:annotation-productization` passed again.
- `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_strategic_overlay_sidebar_boundary_contract tests.test_history_manager_strategic_overlay_contract -q` passed: 48 tests.
- `npm run test:node:renderer-splits` passed: 17 tests.
- `npm run verify:state-write-allowlist` passed: 73 tracked files.
- `node tools/build_test_import_graph.mjs` refreshed `tests/e2e/test-import-graph.json`; `npm run verify:test-import-graph` passed.
- `CODEX_CI=1 CI=1 node node_modules/@playwright/test/cli.js test tests/e2e/strategic_overlay_smoke.spec.js --workers=1 --retries=0 --timeout=15000` passed after review fixes: 1 test.
- `CODEX_CI=1 CI=1 npm run test:e2e:project-save-load` passed: 5 tests.
- One earlier background E2E launch without `CODEX_CI=1` was stopped after it produced no reporter output; the verified rerun used the isolated CI webServer path.
