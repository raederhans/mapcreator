# Render Chain Stabilization Context

## Current State

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-chain-stabilization`
- Branch: `codex/render-chain-stabilization`
- Base: `origin/main` at `15802d7d Preserve map visibility through viewport rebuilds`
- Main checkout remains dirty and is not used for implementation.

## Relevant Project Lessons

- Render passes must invalidate together with the inputs they depend on.
- Chunk promotion, visual refresh, spatial index, and hit canvas belong to the same committed generation.
- Source and `dist/app` must be checked together for delivery-facing changes.

## Running Notes

- 2026-06-04: Created isolated worktree from latest `origin/main`.
- 2026-06-04: Started static child-agent lanes for render-chain code mapping and test-entrypoint mapping. Main thread owns implementation and all live tests.
- 2026-06-04: Review found the proposed `contextScenario` color revision invalidation was too broad; kept color refresh scoped to the passes that consume resolved land colors.
- 2026-06-04: Fixed main-map water/special selection-only click paths so canvas interaction overlays redraw after state changes.
- 2026-06-04: Confirmed current startup initial visual gate already waits for `selectionVersion`, political chunk data, `landData`, and `colors`; added a contract to keep those checks together.
- 2026-06-04: `verify:pages-dist` exposed Windows platform newline drift in generated Pages manifest sizes. Added LF-stable Pages dist text writing and a contract test.
- 2026-06-04: Reviewer feedback for color invalidation, special selection coverage, and LF write behavior is addressed.
- 2026-06-04: Moved pure spatial grid construction into `spatial_index_runtime_builders.js`; `map_renderer.js` now passes grid constants and keeps hit-query orchestration.
- 2026-06-04: Added spatial grid bucket/global counts to existing `buildSpatialIndex` perf payloads as the measurement base for future Flatbush evaluation.
- 2026-06-04: Final review found `renderer_runtime_state_behavior.test.mjs` needed the new perf payload fields and Pages dist byte-counted text files needed `.gitattributes` LF rules; both are fixed.

## Verification Log

- `npm run test:node:scenario-chunk-contracts` passed: 33 tests.
- `python -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_pages_dist_startup_shell tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract -q` passed: 58 tests.
- `npm run verify:pages-dist` passed after LF-stable manifest fix: 19 tests.
- `node --test tests/renderer_runtime_state_behavior.test.mjs` passed: 9 tests.
- `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js` passed with no content diff.
- `git diff --no-index` passed for `spatial_index_runtime_builders.js`, `spatial_index_runtime_owner.js`, and `spatial_index_runtime_derivation.js` source/dist pairs.
- `git diff --check` passed with only Windows line-ending warnings.

## Remaining Work

- Merge, commit, push, and clean the worktree.
