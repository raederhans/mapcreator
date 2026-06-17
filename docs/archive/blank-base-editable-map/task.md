# blank_base editable ownerless map task

## Status
integrated

## Files expected to change
- Data: `data/scenarios/blank_base/*`
- Runtime/UI: `index.html`, `js/ui/scenario_controls.js`, `js/core/state/ui_state.js`, `js/core/map_renderer.js`
- Contracts/tests: `tools/check_scenario_contracts.py`, `tests/test_scenario_contracts.py`, `tests/scenario_lifecycle_runtime_behavior.test.mjs`, `tests/e2e/scenario_blank_exit.spec.js`, `tests/e2e/non_1962_runtime_matrix.spec.js`

## Verification target
- `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs`
- `pytest tests/test_scenario_contracts.py`
- `npx playwright test tests/e2e/scenario_blank_exit.spec.js`
- `npm run verify:pages-dist` if `dist/app` or publish artifacts are touched.

## Delivery package
1. Changed `blank_base` data from empty political topology to 11294 ownerless editable geometries, with neutral feature properties and empty owner/core maps.
2. Added blank feature label UI toggle, default off, and blank hover country-context suppression.
3. Added neutral ownerless blank fill while preserving existing owner color behavior after assignment.
4. Added `blank_base` default presentation style for country-border opacity 40% and coastline width 0.8, with scenario-exit style restoration.
5. Updated runtime, Python contract, and Playwright tests for ownerless editable blank behavior.
6. No `dist/app` files were touched, so `npm run verify:pages-dist` was not required.

## Integration readiness
- Commit state: uncommitted.
- Base branch: `main`.
- Shared hotspots: runtime rendering, scenario controls, scenario data contracts, E2E scenario tests.
- Conflict risk: moderate, because `js/core/map_renderer.js`, scenario data files, and scenario E2E tests are common integration surfaces.
- Integration result: committed directly on `main`; no separate worktree merge was needed for this single-worktree task.
