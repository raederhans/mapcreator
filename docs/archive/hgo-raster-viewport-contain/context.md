# HGO Raster Viewport Contain Context

## 2026-06-07

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-raster-viewport-contain`
- Branch: `codex/hgo-raster-viewport-contain`
- Base: `origin/main` at `569ea447`
- Original main checkout is dirty and behind `origin/main`; this worktree isolates the HGO fix.
- Current HGO raster source is `5120x2560`, so the source aspect ratio is `2:1`.
- Root cause: `renderToCanvas()` draws the rendered HGO raster into the full shared canvas dimensions, which can stretch the raster when the canvas aspect differs.
- Live process owner: main agent only.

## Implementation Notes

- The first implementation target is an aspect-preserving `contain` viewport.
- Rendering and `inspectCanvasPoint()` must share the same viewport math.
- Existing HGO color resolution and loader behavior stay unchanged.

## Validation Notes

- `npm run test:node:hgo-raster-renderer`: passed, 12 tests.
- `npm run test:node:hgo-runtime-preview`: passed, 15 tests.
- `node --check js/core/hgo_raster_renderer.js js/core/hgo_runtime_preview.js`: passed.
- First `npm run verify:hgo-runtime-poc` run failed after the HGO tests, at `tests.test_data_catalog_contract.DataCatalogContractTest.test_landing_catalog_count_matches_checked_in_catalog`.
- The failure was a checked-in landing catalog copy mismatch on clean `origin/main`: the contract expects `The checked-in catalog tracks 641 assets`.
- Applied the smallest landing copy sync in `landing/index.html` and `landing/app.js` so the existing gate can complete.
- `npm run verify:hgo-runtime-poc`: passed after the landing copy sync.
- `npm run verify:hgo-runtime-poc`: passed again after self-review removed an unnecessary helper export.
- `npm run verify:pages-dist`: passed after dist sync; it rebuilt `dist/`, ran 32 startup shell tests, and ran the landing showcase view Node test.

## Self-Review Notes

- The simpler implementation is a single internal viewport function reused by render and inspection.
- No default map rendering path changed.
- No new dependency was added.
