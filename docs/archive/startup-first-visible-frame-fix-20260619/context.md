# Startup First Visible Frame Fix Context

## 2026-06-19

- User reported: `[boot] First visible frame was not accepted after bootstrap-first-political-frame: stale-political-full-reference-transform`.
- Evidence: `js/main.js` invalidates all render passes, flushes, then asserts startup first visible frame acceptance.
- Evidence: `js/core/map_renderer.js` first-visible gate currently requires `political` full reference transform even during coarse/progressive startup.
- Root direction: first visible frame acceptance should prove current political pass identity and transform; full reference transform remains a fine partial repaint baseline requirement.
- Patch: `getFirstVisiblePoliticalFrameBlockReason` now checks `political` full reference transform only when the cached political pass is `fine` and `finePoliticalCacheReady`.
- Contract coverage: `tests/scenario_chunk_contracts.test.mjs` now exercises coarse startup acceptance without full reference and fine-ready rejection for missing or stale full reference.
- Verification passed:
  - `node --check js/core/map_renderer.js`
  - `node --check dist/app/js/core/map_renderer.js`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
  - `py -3 -m unittest tests.test_pages_dist_startup_shell tests.test_startup_shell tests.test_main_startup_scenario_boot_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
  - `git diff --check`
  - `git diff --no-index --quiet js/core/map_renderer.js dist/app/js/core/map_renderer.js`
- Local server evidence: `http://127.0.0.1:8810/app/?scope=current-object&section=exportProjectSection` returned HTTP 200, and the served `app/js/core/map_renderer.js` contains the patched fine-ready gate.
- Browser automation gap: Playwright smoke could not run because this checkout/runtime does not currently provide a usable `playwright` or `@playwright/test` package.

## Live Process Ownership

- Main agent owns localhost page checks and all targeted tests.
- Subagent lane is static review only.
