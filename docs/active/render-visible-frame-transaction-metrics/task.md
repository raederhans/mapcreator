# Render Visible Frame Transaction Metrics Task

## Delivery Package Draft

Status: ready-for-integration

## Change Groups

- Core files:
  - `js/core/map_renderer.js`
  - `js/core/map_renderer/scenario_refresh_runtime.js`
  - `js/core/renderer/scenario_chunk_promotion_helpers.js`
  - `js/core/state/renderer_runtime_state.js`
  - `tools/perf/run_baseline.mjs`
  - matching `dist/app/js/core/*` mirrors and `dist/pages-dist-manifest.json`
- Test files:
  - `tests/perf_probe_snapshot_behavior.test.mjs`
  - `tests/scenario_chunk_contracts.test.mjs`
  - `tests/scenario_chunk_promotion_helpers_behavior.test.mjs`
  - `tests/test_perf_gate_contract.py`
  - `tests/test_scenario_chunk_refresh_contracts.py`
- Docs files: `docs/active/render-visible-frame-transaction-metrics/{plan,context,task}.md`, `docs/active/_worktree_registry.md`.
- Temporary/runtime files: `.omx/ultragoal/*` and local `node_modules` junction are untracked/ignored runtime state.

## Diff Summary

- Adds unified visible-frame transaction perf metrics for committed, reused, rejected, missing, and blocked frame states.
- Adds input-to-first-pixel timing for visual fill/erase patches through the existing political partial repaint and full pass completion paths.
- Preserves zero viewport-visible subset counts and exposes subset-vs-full payload diagnostic fields.
- Extends perf baseline output and snapshot/contract tests for the new metric surfaces.
- Rebuilds Pages dist mirrors after source changes.

## Verification Log

- `node --check js/core/map_renderer.js`: passed.
- `node --check js/core/renderer/scenario_chunk_promotion_helpers.js`: passed.
- `node --check tools/perf/run_baseline.mjs`: passed.
- `node --test tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/perf_probe_snapshot_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`: passed 52/52.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_perf_gate_contract -q`: passed 57 tests.
- `npm run verify:perf-gate-contract`: passed 22 tests.
- `npm run verify:pages-dist`: passed Pages dist build, 37 startup shell tests, and 8 landing showcase tests.
- `git diff --check`: passed with Windows line-ending warnings only.
- Independent verification review: `APPROVE` and `CLEAR`; no required supplemental tests.
- Independent code review: `APPROVE` and `CLEAR`; two LOW findings fixed.
- Post-review fix validation:
  - `node --check js/core/map_renderer.js`: passed.
  - `node --check tools/perf/run_baseline.mjs`: passed.
  - `node --test tests/perf_probe_snapshot_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`: passed 49/49.
  - `npm run python -- -m unittest tests.test_perf_gate_contract tests.test_scenario_chunk_refresh_contracts -q`: passed 57 tests.
  - `npm run verify:perf-gate-contract`: passed 22 tests.
  - `npm run verify:pages-dist`: passed Pages dist build, 37 startup shell tests, and 8 landing showcase tests.
  - `git diff --check`: passed with Windows line-ending warnings only.

## Risks

- `js/core/map_renderer.js` is a shared hot file with many existing render contracts.
- P2 uses existing visual override and political repaint state; it does not add a saved-data color source.
- P3 keeps viewport subset fields diagnostic and keeps full political payload counts explicit.
- Independent review findings have been addressed and revalidation is complete.

## Recommended Integration

Recommended path after review approval: commit this branch, archive task docs, push the feature branch, fast-forward integrate into a clean main worktree or push the branch head to `origin/main` after confirming `origin/main` still matches the base, then clean the isolated worktree. Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` remains dirty and should not be used for staging this branch.

## Integration Planning

- Current worktrees:
  - `C:\Users\raede\Desktop\dev\mapcreator`: `main@bf76965d`, dirty with unrelated docs/archive deletions and `lessons learned.md`.
  - `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-p1-p3`: `codex/render-fluidity-p1-p3@d1faea1f`, dirty with this P1-P3 implementation.
- Base commit: `origin/main@d1faea1f`.
- Current branch HEAD before commit: `d1faea1f`.
- Parent checkout overlap by file path: none against this P1-P3 changed-file set.
- Risk rating:
  - Parent checkout: yellow because it is dirty and behind origin.
  - P1-P3 worktree: yellow because it touches `js/core/map_renderer.js`, perf gates, scenario chunk contracts, and Pages dist mirrors.
- Recommended order: commit this isolated branch first, then integrate through a clean main worktree or direct fast-forward path after `origin/main` freshness check. Do not stage from the dirty parent checkout.
