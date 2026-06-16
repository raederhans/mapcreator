# Renderer Layer Owner Split Plan

## Scope

- Current task slice: Phase 3 from the supplied renderer split plan.
- Primary goal: keep large draw-layer logic behind focused renderer owners while preserving `map_renderer.js` as the stable facade.
- Phase 1: move Modern City Lights rendering details into `js/core/renderer/modern_city_lights_render_owner.js`.
- Phase 2: close out Rivers ownership in `js/core/renderer/river_layer_render_owner.js`.
- Phase 3A: move Ocean / Bathymetry / Coastal rendering details into `js/core/renderer/ocean_render_owner.js`.
- Phase 3B: move Physical base / contour rendering details into a focused physical owner while keeping pass signatures and cache lifecycle in `map_renderer.js`.
- Phase 3C: move `contextScenario` relief overlay drawing details into `js/core/renderer/scenario_relief_overlay_render_owner.js` while keeping the relief cache/pass lifecycle in `map_renderer.js`.
- Non-goals for this slice: toolbar/sidebar, vendored libraries, and broad clone utility migration.

## Evidence

- Base branch: `main`.
- Base commit: `5e3a7acaaef93b51e4766b0ee199ce40a2d95d66`.
- Work branch: `codex/renderer-modern-lights-owner`.
- Existing pattern: `js/core/renderer/river_layer_render_owner.js` keeps rendering details in an owner and leaves a thin wrapper in `map_renderer.js`.
- Ocean evidence: `drawBackgroundPass` still composes base ocean fill, `drawOceanStyle()`, then `drawOceanDepthMaskLayer()`; ocean invalidators and depth mask stay in `map_renderer.js`.
- Physical evidence: `physicalBase`, `contextBase` contours, and `contextScenario` relief have separate pass lifecycles, so Phase 3B should avoid one broad owner that binds those caches together.
- Live test owner: main Codex agent only.
- Baseline log: `.runtime/tests/renderer-modern-lights-owner/baseline.log`.

## Acceptance Criteria

- `map_renderer.js` keeps a thin Modern City Lights wrapper and lazy owner factory.
- New owner owns Modern City Lights caches and drawing details.
- Existing historical city lights behavior keeps working through shared helper wrappers.
- Targeted node behavior test covers owner cache key, population boost sorting, culling, color conversion, and wrapper contract.
- Verification commands pass or any gap is recorded with exact reason.
- Rivers owner keeps `drawRiversLayer` logic outside `map_renderer.js`, has direct behavior coverage, and focused river e2e passes.
- Ocean owner keeps bathymetry bands/contours, coastal accent buckets, and `drawOceanStyle` logic outside `map_renderer.js`, with direct behavior coverage.
- `drawOceanStyle()` remains before `drawOceanDepthMaskLayer()` in `drawBackgroundPass`.
- Physical owner keeps atlas, intensity field, relief base, and contour drawing details outside `map_renderer.js`, with direct behavior coverage.
- Scenario relief owner keeps overlay style, texture line pattern, and per-feature drawing details outside `map_renderer.js`, while relief cache reuse stays in `map_renderer.js`.
- Pages dist includes any new renderer owner modules.

## Task List

- [x] Read supplied plan and project rules.
- [x] Confirm current branch/worktree state.
- [x] Start pre-edit baseline validation.
- [x] Add `modern_city_lights_render_owner.js`.
- [x] Wire `map_renderer.js` to lazy-load the new owner.
- [x] Add targeted owner behavior/contract test and package script.
- [x] Run targeted checks and city-rendering verification.
- [x] Run review/QA self-check.
- [x] Update worktree registry with delivery package.
- [x] Push Phase 1 and documentation cleanup commits to `origin/codex/renderer-modern-lights-owner`.
- [x] Confirm Phase 2 Rivers implementation already lives in `river_layer_render_owner.js`.
- [x] Add direct `river_layer_render_owner` behavior coverage.
- [x] Run river contract, appearance river owner, and focused river e2e validation.
- [x] Run final review/QA self-check for Phase 2.
- [x] Commit and push Phase 2 closeout.
- [x] Gather Phase 3 Ocean and Physical evidence with static subagent review.
- [x] Add `ocean_render_owner.js` and thin Ocean wrappers.
- [x] Add direct Ocean owner behavior coverage and update boundary contracts.
- [x] Rebuild Pages dist for the new owner module.
- [x] Run Ocean targeted validation and record full water e2e residual failures.
- [x] Implement Physical owner split.
- [x] Implement Scenario relief overlay owner split.
- [x] Run physical contracts and focused physical e2e validation.
- [ ] Run final Phase 3 review/QA self-check.
- [ ] Commit and push Phase 3 closeout.
