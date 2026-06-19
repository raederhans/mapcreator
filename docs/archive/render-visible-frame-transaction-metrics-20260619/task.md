# Render Visible Frame Transaction Metrics Task

## Delivery Package Draft

Status: integrated, pushed, archived, and ready for local worktree cleanup

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
- Docs files: `docs/archive/render-visible-frame-transaction-metrics-20260619/{plan,context,task}.md`, `docs/active/_worktree_registry.md`.
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

Completed path: feature commit `15008502` was pushed to `origin/codex/render-fluidity-p1-p3`, fast-forwarded through clean integration branch `codex/render-fluidity-main-integration`, validated again, and pushed to `origin/main`. Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` remains dirty and was not used for staging this branch.

## Integration Planning

- Current worktrees:
  - `C:\Users\raede\Desktop\dev\mapcreator`: `main@bf76965d`, dirty with unrelated docs/archive deletions and `lessons learned.md`.
  - `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-p1-p3`: `codex/render-fluidity-p1-p3@15008502`, clean after commit and push.
  - `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-integration`: `codex/render-fluidity-main-integration@15008502`, used for clean main integration and closeout.
- Base commit: `origin/main@d1faea1f`.
- Functional commit: `15008502`.
- Parent checkout overlap by file path: none against this P1-P3 changed-file set.
- Risk rating:
  - Parent checkout: yellow because it is dirty and behind origin.
  - P1-P3 feature worktree: green after fast-forward integration; yellow only for future renderer/perf metric work.
  - Integration worktree: green after closeout commit and push.
- Cleanup plan: remove `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-p1-p3` and `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-integration` after closeout push. Keep the dirty parent checkout untouched.
