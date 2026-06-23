# Context

## 2026-06-22 Initial Evidence

- Current checkout: `main` at `6402153b1bb7f2c6ae1a472407a2305594815788`, matching `origin/main`.
- `git worktree list` shows only `C:/Users/raede/Desktop/dev/mapcreator`.
- Live process owner: main Codex agent only. Subagents are read-only static lanes and must not run or monitor tests/builds.
- Task classification: `complex`, because the change touches renderer runtime state, chunk promotion, diagnostics, contracts, and Pages dist.

## Suspected Root Cause

- `applyScenarioPoliticalChunkPayload` writes the complete political payload to `runtimeState.scenarioPoliticalChunkData`.
- When `primaryPoliticalPayload.features.length < politicalPayload.features.length`, it also writes the viewport-primary subset to `runtimeState.scenarioPoliticalVisibleChunkData`.
- `refreshMapDataForScenarioChunkPromotion` immediately calls `rebuildPrimaryPoliticalDerivedState` for political changes.
- The same function stores/schedules `primaryDerivedStateReady: hasPoliticalChange`, which currently treats the primary-visible rebuild as complete derived-state readiness.
- `runDeferredScenarioChunkPromotionInfraRefresh` restores full political derived state only when `!primaryDerivedStateReady` and rendered land count is smaller than complete political count.
- If visual-stage rebuild used the primary subset and `primaryDerivedStateReady` is true, deferred infra can skip the full restore. Non-visible countries then disappear from `landData`, spatial/index state, and resolved colors until the viewport moves over their chunks.

## Boundaries

- Keep visual first-frame fast path.
- Use feature-id coverage guard in addition to count checks.
- Do not change Thematic panel or UI layout.
- Treat 1936/1939 Red Sea as a later phase.

## 2026-06-22 Implementation Notes

- Added a failing-first regression in `tests/scenario_refresh_plans_behavior.test.mjs` with full ids `GER`, `ITA`, `POL`, `FRA` and visible ids `GER`, `ITA`.
- Split chunk-promotion readiness into visible-subset readiness and complete political derived-state readiness in `js/core/map_renderer/scenario_refresh_runtime.js`.
- Deferred infra now checks feature-id coverage, clears `runtimeState.scenarioPoliticalVisibleChunkData`, rebuilds full political land collections/runtime derived state/spatial state, marks hit canvas dirty, and invalidates physical, political, context, and borders passes when a subset reached stable state.
- Added `scenarioPoliticalDerivedStateCoverage` metrics with complete/visible/land/color counts, missing id samples, selection version, required/cache/retained chunk ids, and restore state.
- Color coverage now participates in complete derived-state readiness and deferred restore. The targeted post-edit browser regression still passes after this change.
- Browser smoke exposed separate TNO palette/base-color gaps for `CF`, `CG`, `CM`, `CY`, `EH`, `GA`, `MT`, `TW`, and `VA`; those remain Phase 2 data/palette work.
- Code-review P1/P2 found a color-only coverage gap. The fix added `colorCoverageMissing` to readiness/restore decisions and added a color-only regression where `landData` is full but `colors` still contains only `GER`/`ITA`.

## Validation Evidence

- Failing-first check before the fix: `node --test tests/scenario_refresh_plans_behavior.test.mjs` failed on the new full-political restore contract.
- `node --check js/core/map_renderer/scenario_refresh_runtime.js`: pass.
- `npm run test:node:scenario-refresh-plans`: pass, 22/22.
- `npm run test:node:scenario-chunk-contracts`: pass, 55/55.
- `npm run test:node:scenario-chunk-promotion-helpers`: pass, 9/9.
- `npm run test:node:scenario-lifecycle-runtime-behavior`: pass, 12/12.
- `npm run test:node:scenario-runtime-state-behavior`: pass, 6/6.
- `npm run test:node:render-transaction-diagnostics`: pass, 21/21.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_political_collection_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract -q`: pass, 48/48.
- `node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --grep "tno post-edit keeps political detail fill" --workers=1 --retries=0`: pass, 1/1.
- `npm run verify:pages-dist`: pass, Pages startup shell 39/39 and landing showcase 8/8.

## Known Follow-Up

- Full `npm run test:e2e:dev:scenario-chunk-runtime` reached 6/8 before the final color-coverage guard adjustment. The remaining runtime color coverage failure reported palette/base-color gaps for `CF`, `CG`, `CM`, `CY`, `EH`, `GA`, `MT`, `TW`, and `VA`. This is tracked as Phase 2 and is intentionally separated from the chunk-derived-state repair.
