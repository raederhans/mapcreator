# TNO startup render regression plan

## Intent

Fix the default TNO startup render path so runtime-only shell fallback political geometry cannot trigger a modern primary political fallback after filtering.

## Scope

- `js/core/map_renderer.js`
- `js/bootstrap/deferred_detail_promotion.js` contracts only if needed
- Existing startup, scenario chunk, and renderer boundary tests
- This task doc set
- `lessons learned.md` only if a new durable lesson is found

## Acceptance

- Active scenario runtime political topology owns the political baseline even when shell fallback filtering leaves it empty.
- Modern primary political topology is used only when no active scenario runtime political source exists.
- Scenario political chunks and Atlantropa land-like overlays still compose onto the scenario-owned baseline.
- Detail promotion contracts continue to refresh political, water, and `scenario_atlantropa` passes.

## Verification

- `npm run test:node:startup-hydration-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:physical-layer-contracts`
- `python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract -q`
