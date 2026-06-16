# Render Chain Cleanup Phase 4/5 Tasks

## Phase 4

- [x] Add spatial query helper tests.
- [x] Add internal spatial query helper.
- [x] Replace renderer query loops with helper calls.
- [x] Run Phase 4 verification.

## Phase 5

- [x] Extract chunk promotion plan/metric helpers.
- [x] Preserve visual/deferred-infra order contracts.
- [x] Run Phase 5 verification.
- [x] Run static review and deslop pass on changed files.

## Verification Evidence

- `node --check js/core/map_renderer.js js/core/renderer/spatial_query_index.js js/core/renderer/scenario_chunk_promotion_helpers.js tests/spatial_query_index_behavior.test.mjs tests/scenario_chunk_promotion_helpers_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs` passed.
- `npm run test:node:spatial-query-index` passed.
- `npm run test:node:scenario-chunk-promotion-helpers` passed.
- `python -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_spatial_index_state_boundary_contract tests.test_scenario_chunk_refresh_contracts -q` passed.
- `npm run test:node:scenario-chunk-contracts` still fails only on the known `hoi4_1939 coarse chunk should expose per-feature bounds` data mismatch: actual `23375`, expected `23426`.
- Static review found one helper boundary issue: iterable `globals` support was narrower than the old renderer loop. Fixed in `spatial_query_index.js` and covered by `visible spatial query accepts iterable globals`.
- Follow-up review found stale registry commit status and Map-style `globals.forEach` value semantics. Fixed the registry/context and covered Map globals with `visible spatial query reads map globals as values`.
