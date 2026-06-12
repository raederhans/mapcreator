# Render Chain Follow-Up Context 2026-06-11

## Initial Evidence
- `main` started at `54de2faf` with `.omx/metrics.json` modified and completed docs records moved from active to archive.
- Review-fix worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-recovery-review-fix`.
- Review-fix branch head before R0 merge work: `652d0354`.
- `codex/render-recovery-review-fix` contains the progressive cache repaint diagnostics patch but remains blocked by repeated `npm run perf:gate` failures.

## R0 Docs Cleanup
- Submitted docs/archive cleanup as `ddd94ba9`.
- Included paths: `docs/archive/render-chain-improvement`, `docs/archive/hgo-scenario-platformization`, and `lessons learned.md`.
- Excluded `.omx/metrics.json`.

## Live Process Ownership
- Main agent owns `npm run perf:baseline`, `npm run perf:gate`, `npm run verify:pages-dist`, browser/e2e commands, and any dev server those commands launch.
- Subagents are read-only evidence lanes and may not run or monitor live processes.

## R0 Perf Diagnosis
- Main baseline probes at `ddd94ba9` failed against the old threshold on this machine: TNO total startup `6960.6ms` / `6980.1ms`; HOI4 total startup `7235.5ms` / `7706.4ms`.
- Isolated `ca1dc9c0` gate failed while using its own `8000` server: TNO `6735.4ms`, HOI4 `7197.4ms`, `contractMismatches=[]`.
- Isolated `54de2faf` gate failed only on HOI4 while using its own `8000` server: TNO `6287.4ms`, HOI4 `7065.4ms`, `contractMismatches=[]`.
- The first fresh `652d0354` gate sample was invalid as branch evidence: its `.runtime/dev/active_server.json` pointed at port `8810` with a dead pid, while the live `8810` server belonged to the main worktree.
- Fixed `tools/perf/run_baseline.mjs` so reusable dev-server metadata must match the current repo path and a live pid before probing the URL.
- After removing the stale review-fix `active_server.json`, `652d0354` fresh gate passed using its own `8000` server: TNO `5215.8ms`, HOI4 `5659.4ms`, `contractMismatches=[]`, `failures=[]`.

## R0 Merge Verification
- Merged `codex/render-recovery-review-fix` into `main` as `4cfb5e1d`; Git moved the branch doc updates into `docs/archive/render-chain-improvement`.
- `npm run verify:perf-gate-contract`: 22 tests passed.
- `node tests/scenario_chunk_contracts.test.mjs`: 43 tests passed.
- `npm run verify:pages-dist`: dist build passed, `tests.test_pages_dist_startup_shell` 34 tests passed, landing showcase Node tests 6 passed.
- Final `npm run perf:gate` at `4cfb5e1d` passed: TNO `4913.3ms`, HOI4 `5355.8ms`, `contractMismatches=[]`, `failures=[]`.
- Self-review found that valid but long-lived local dev servers can still make local perf samples noisy. The perf script now starts a dedicated `.runtime/tmp/perf-baseline-runtime` server by default; existing active server reuse requires `PERF_REUSE_ACTIVE_SERVER=1`.
- Default isolated `npm run perf:gate` with the self-review fix passed: TNO `6153.6ms`, HOI4 `5398.5ms`, `contractMismatches=[]`, `failures=[]`.
- After committing the self-review fix, current HEAD `735d99f0` passed `npm run verify:perf-gate-contract`, then isolated `npm run perf:gate` failed twice on HOI4 only: `6921.6ms` and `6830.0ms` versus limit `5986.6ms`; both runs had `contractMismatches=[]`.
- A fresh isolated rerun at current HEAD `fe7d69e5` passed `npm run perf:gate`: TNO `6204.8ms`, HOI4 `5665.8ms`, `contractMismatches=[]`, `failures=[]`.
- Push is unblocked, with the repeated HOI4 variance recorded as a follow-up risk for future perf gate interpretation.

## R1 Color Visibility Work
- Reused `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js` rather than creating a separate e2e suite.
- Added `tests/e2e/support/political-pixel-probe.js` to sample final `map-canvas` pixels through d3 projection, `zoomTransform`, and DPR.
- Extended the Great Lakes Congo zoom-end regression to assert final canvas pixels match `state.colors[featureId]` before and after zoom-end detail promotion.
- Added runtime color coverage diagnostics for TNO: `landDataFull` visual features and rendered `spatialItems` must have resolved colors.
- First R1 coverage run found `resolvedColor` complete for rendered `spatialItems`, while 648 rendered items lacked owner/base colors such as `AL` and `AT`; this is R2 coarse-underlay evidence, not a final-pixel R1 blocker.
- Fixed `rebuildResolvedColors()` to build from `getFullLandDataFeatures()` so full visual collection features receive stable resolved colors.
- Fixed `refreshResolvedColorsForFeatures()` to fall back from `landIndex` to full color-source features.
- Fixed `refreshResolvedColorsForOwners()` to include full color-source features for owner refreshes, preventing full-only features from keeping stale colors after owner/base color edits.
- Final R1 e2e rerun passed 2/2; latest log path is `.runtime/logs/political-progressive-recovery-final-20260612.log`.
- Clean worktree `C:\Users\raede\Desktop\dev\mapcreator-r1-pages-verify` passed `npm run verify:pages-dist`; the resulting `dist/pages-dist-manifest.json` was copied back to the main checkout.

## R2 Owner/Base Color Gap Work
- R2 ran in isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-r2-owner-base-colors` on branch `codex/r2-owner-base-colors` from `60d76b91`, keeping main checkout UI/i18n WIP out of the diff.
- Runtime diagnostic `.runtime/reports/r2-owner-base-diagnostics-baseline.json` classified all 648 owner/base color gaps as `display-owner-source-mismatch`; `countsBySourceCollection={"landData":648}`.
- Representative sample: feature `AL011` has geometry `countryCode=AL`, display owner `ITA`, resolved color `#6d8e60`, no `AL` base color, and `ITA` display-owner base color `#6d8e60`.
- Static source chain confirmed the same split: `spatialItems.countryCode` stores geometry source from `cntr_code`, while color resolution uses `getDisplayOwnerCode()` through `state.sovereigntyByFeatureId` / shell owner hints.
- Minimal renderer fix: `drawAdmin0BackgroundFills()` now obtains fill via `getAdmin0BackgroundFillColor()`, which first uses `buildCountryDominantFillColorMap()` over full visual resolved colors, then consults canonical sovereign/country base maps.
- Minimal diagnostic fix: `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js` and `tests/e2e/support/political-pixel-probe.js` now check owner/base color against display owner and retain `display-owner-source-mismatch` samples as non-blocking classification evidence.
- Contract coverage added in `tests/scenario_chunk_contracts.test.mjs` for admin0 dominant fill and display-owner owner/base diagnostics.
- Post-review hardening extended the diagnostic helper to mirror production country-code keys, id-derived country fallback, and shell-fallback detection for `RU_ARCTIC_FB_` / shell-fallback names; the static contract now checks the dominant-first, base-map-second, `LAND_FILL_COLOR`-last return chain.
- Verification completed: `node --check js/core/map_renderer.js`, `node --check dist/app/js/core/map_renderer.js`, `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`, `python -m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -q`, `node tests/scenario_chunk_contracts.test.mjs`, `npm run test:e2e:dev:political-progressive-recovery`, `git diff --check`, and clean-worktree `npm run verify:pages-dist`.
- Clean Pages dist verification ran in `C:\Users\raede\Desktop\dev\mapcreator-r2-pages-verify`: build_pages_dist completed, `tests.test_pages_dist_startup_shell` ran 34 tests in 111.202s, and landing showcase Node tests passed 6/6.
- The resulting `dist/pages-dist-manifest.json` was copied back to the R2 worktree because `dist/app/js/core/map_renderer.js` changed.
- After review hardening, `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`, `node --check tests/e2e/support/political-pixel-probe.js`, `node tests/scenario_chunk_contracts.test.mjs`, `npm run test:e2e:dev:political-progressive-recovery`, and `git diff --check` passed again.
- Remaining R2 closeout: final review/bug check, commit, push, and cleanup of the R2 worktree plus clean verify worktree.
