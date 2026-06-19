# Render Visible Frame Transaction Metrics Context

## 2026-06-19 Start

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is dirty with unrelated docs/archive cleanup changes and is behind `origin/main`; implementation is isolated in `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-p1-p3`.
- Branch `codex/render-fluidity-p1-p3` starts from `origin/main@d1faea1f`.
- `omx ultragoal create-goals` created `.omx/ultragoal/brief.md`, `.omx/ultragoal/goals.json`, and `.omx/ultragoal/ledger.jsonl`.
- `node_modules` is a local junction to the parent checkout dependency tree; it is an ignored runtime convenience.
- Existing render code already has `recordRenderPerfMetric`, `blackFrameCount`, `missingVisibleFrameCount`, `firstVisibleFramePainted`, `continuityFrameRejected`, `continuityFrameStaleAgeMs`, and `politicalPartialRepaint`.
- P1 should consolidate existing continuity events into a transaction surface instead of inventing a second metrics system.
- P2 should reuse `applyVisualSubdivisionFill`, `refreshResolvedColorsForFeatures`, `partialPoliticalDirtyIds`, and `tryPartialPoliticalPassRepaint`.
- P3 must preserve the product contract that full political data remains authoritative; visible subset metrics are diagnostic/current-selection auxiliary data.

## Current Work

- Static subagent Hilbert owns P2 code-path mapping only.
- Static subagent Gauss owns test strategy mapping only.
- Main agent owns implementation and live verification.

## 2026-06-19 Implementation Notes

- P1 adds a single `visibleFrameTransaction` perf metric over the existing visible-frame lifecycle instead of creating a second metrics store. It covers last-good capture, missing/black frames, interaction skips, first-visible-frame blocks/commits, base visible fallback commits, last-good reuse, and continuity rejection.
- P2 records `fillPatchInputToFirstPixelMs` from visual fill/erase input start to the first completed political pass or partial repaint that clears the pending edit. It reuses `refreshResolvedColorsForFeatures`, `partialPoliticalDirtyIds`, `tryPartialPoliticalPassRepaint`, and normal render pass completion.
- P3 keeps complete political payload counts and viewport-visible subset counts separate. `promotedVisibleFeatureCount` now preserves real zero counts, and promotion visual metrics expose `fullPoliticalPayloadFeatureCount`, `viewportVisibleSubsetFeatureCount`, `primaryVisibleIsSubset`, and `promotedVisibleIsSubset`.
- Perf baseline summaries now include visible-frame transaction timing/counts and fill patch first-pixel timing so the new metrics are visible in benchmark output.
- Pages dist was regenerated after source changes; source and `dist/app` mirrors are in sync from `npm run verify:pages-dist`.

## 2026-06-19 Verification

- `node --check js/core/map_renderer.js` passed.
- `node --check js/core/renderer/scenario_chunk_promotion_helpers.js` passed.
- `node --check tools/perf/run_baseline.mjs` passed.
- `node --test tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/perf_probe_snapshot_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs` passed 52/52.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_perf_gate_contract -q` passed 57 tests.
- `npm run verify:perf-gate-contract` passed 22 tests.
- `npm run verify:pages-dist` passed: Pages dist build, 37 startup shell tests, and 8 landing showcase tests.
- `git diff --check` passed with Windows line-ending warnings only.

## 2026-06-19 Review Gate

- Main changed-file cleanup pass removed a new helper parameter named `fallback` from P3 metric normalization and moved visible-frame metric detail spreading so normalized fields win.
- Independent verification review returned `APPROVE` and `CLEAR` with no required supplemental tests.
- Independent code review returned `APPROVE` and `CLEAR` with two LOW findings:
  - Perf markdown count rows were using millisecond formatting.
  - Base visible fallback wrote both a `missing` and `committed` `visibleFrameTransaction` for one base-fill frame.
- Both LOW findings were fixed. Count rows now use `formatCountRow`, and base visible fallback records only the legacy `missingVisibleFrameCount` plus one committed `visibleFrameTransaction`.
- After the fixes, validation passed again: map renderer and perf baseline syntax checks, 49 focused Node tests, 57 Python contract tests, perf gate contract 22 tests, Pages dist build + 37 startup shell + 8 landing showcase, and `git diff --check`.

## 2026-06-19 Integration Closeout

- Functional commit: `15008502` (`Expose render fluidity transaction evidence`).
- Feature branch `codex/render-fluidity-p1-p3` was pushed to origin and fast-forwarded through clean integration worktree `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-integration`.
- Post-merge validation in the integration worktree passed:
  - `node --check js/core/map_renderer.js`.
  - `node --check tools/perf/run_baseline.mjs`.
  - `node --test tests/perf_probe_snapshot_behavior.test.mjs tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs` passed 52/52.
  - `npm run python -- -m unittest tests.test_perf_gate_contract tests.test_scenario_chunk_refresh_contracts -q` passed 57 tests.
  - `git diff --check` passed.
- `origin/main` was fast-forwarded from `d1faea1f` to `15008502`.
- Task docs moved to `docs/archive/render-visible-frame-transaction-metrics-20260619/`.
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` stayed untouched with its unrelated local docs/archive changes.
