# City Lights Owner Extraction Plan

## Goal

Extract Modern and Historical 1930 city lights rendering from `js/core/map_renderer.js` into `js/core/renderer/city_lights_render_owner.js` with behavior unchanged.

## Scope

- Move City Lights drawing helpers, geometry/static-layer/population caches, and historical fallback/derived-glow caches into an owner closure.
- Keep `drawDayNightPass`, `drawDayNightShadowLayer`, and `buildNightHemisphereFeature` in `map_renderer.js`.
- Wire `drawNightLightsLayer` through `getCityLightsRenderOwner().drawNightLightsLayer(...)`.
- Keep assets imported by `map_renderer.js`; inject them through the owner factory.
- Add focused owner behavior tests and a named npm script.
- Refresh `dist/app` only through the existing Pages dist builder.

## Cleanup Discipline

- Preserve rendering order, numeric constants, canvas compositing, and cache key semantics.
- Prefer a direct move plus dependency injection over new abstractions.
- Main agent owns all live tests/builds/perf gates. Child agents are static review only.

## Progress

- [x] Worktree and docs created.
- [x] Dependencies and current behavior mapped.
- [x] Owner extracted and wired.
- [x] Targeted tests added.
- [x] Dist mirror refreshed.
- [x] Static review and UltraQA-style pass completed.
- [x] Required functional gates passed.
- [x] Perf gate executed with same-machine `origin/main` comparison; historical baseline failed for both current branch and `origin/main`.
- [ ] Docs archived, committed, pushed, and temporary worktree cleaned.

## Verification Plan And Result

- PASS: `node --check js/core/renderer/city_lights_render_owner.js js/core/map_renderer.js tests/city_lights_render_owner_behavior.test.mjs tests/e2e/city_marker_visibility_regression.spec.js tests/e2e/city_urban_rendering_regression.spec.js tests/e2e/hoi4_1939_ui_smoke.spec.js tests/e2e/tno_1962_ui_smoke.spec.js`
- PASS: `npm run test:node:city-lights-render-owner`
- PASS: `npm run test:node:modern-city-lights-owner`
- PASS: `npm run test:node:city-lights-assets`
- PASS: `py -3 -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_urban_city_policy_boundary_contract -q`
- PASS: `npm run test:e2e:city-rendering`
- PASS: `npm run test:e2e:layer:smoke`
- PASS: `py -3 tools/build_pages_dist.py`
- PASS: `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- PASS: `npm run test:node:landing-showcase-view`
- PASS: `git diff --check`
- ENV RED: `npm run perf:gate` against 2026-04-20 baseline. Current branch and `origin/main@bb40fe02` both failed the historical baseline on this machine; current branch second run remained close to same-machine main on refresh/render metrics, with startup still noisy.
