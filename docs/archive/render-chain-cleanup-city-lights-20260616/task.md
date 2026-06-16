# City Lights Owner Extraction Task

## Checklist

- [x] Confirm current function/cache/call-site boundaries with repo evidence.
- [x] Add/extend focused behavior tests for owner-visible pure logic and cache keys.
- [x] Create `js/core/renderer/city_lights_render_owner.js`.
- [x] Replace in-file city lights calls with owner delegation.
- [x] Remove migrated City Lights implementation from `map_renderer.js`.
- [x] Add `test:node:city-lights-render-owner` to `package.json`.
- [x] Refresh `dist/app` and manifest through `tools/build_pages_dist.py`.
- [x] Run targeted syntax, unit, e2e, Pages dist, smoke, and diff checks.
- [x] Run perf gate with same-machine `origin/main` comparison.
- [x] Update `docs/active/_worktree_registry.md`.
- [x] Run static review and UltraQA-style adversarial verification pass.
- [ ] Archive this task folder.
- [ ] Commit, push, and clean the temporary worktree.

## Delivery Package

1. Changed behavior surface: City Lights rendering now lives in `createCityLightsRenderOwner`; `map_renderer.js` keeps orchestration and delegates night-light drawing.
2. Core files: `js/core/renderer/city_lights_render_owner.js`, `js/core/map_renderer.js`, `dist/app/js/core/renderer/city_lights_render_owner.js`, `dist/app/js/core/map_renderer.js`.
3. Test files: `tests/city_lights_render_owner_behavior.test.mjs`, `tests/test_map_renderer_render_cache_owner_boundary_contract.py`, `tests/test_map_renderer_urban_city_policy_boundary_contract.py`, `tests/e2e/city_marker_visibility_regression.spec.js`, `tests/e2e/city_urban_rendering_regression.spec.js`, `tests/e2e/hoi4_1939_ui_smoke.spec.js`, `tests/e2e/tno_1962_ui_smoke.spec.js`.
4. Docs: `docs/active/render-chain-cleanup-city-lights/*`, `docs/active/_worktree_registry.md`.
5. Diff summary: `map_renderer.js` loses the historical City Lights implementation and owner factory imports are updated; the new owner gains historical logic; old `modern_city_lights_render_owner.js` path is removed.
6. Commit state: included in the City Lights closeout commit.
7. Base divergence: branch is based on `origin/main@bb40fe02`; parent checkout is behind origin/main and has unrelated local WIP.
8. Conflict risk: red overlap with future renderer-owner changes touching `map_renderer.js`, `city_lights_render_owner.js`, `dist/app`, or layer smoke tests; green with unrelated docs/runtime work.
9. Verification: all functional and smoke gates passed; perf gate is environment-red against historical baseline and also red on same-machine `origin/main`.
10. Recommended next step: commit and push with perf caveat recorded; clean the temporary worktree after the branch is recoverable on remote.
