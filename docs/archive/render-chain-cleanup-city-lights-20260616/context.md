# City Lights Owner Extraction Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-chain-cleanup-city-lights`
- Branch: `codex/render-chain-cleanup-city-lights`
- Base: `origin/main` at `bb40fe02`
- Parent checkout has unrelated local WIP in `docs/archive/data-architecture-hardening-v2/context.md`; all implementation happened in this isolated worktree.

## Implemented

- Renamed the existing Modern owner to `js/core/renderer/city_lights_render_owner.js`.
- Moved Historical 1930 density, retention, fallback, asset entry, derived-glow cache, and draw logic into the same owner.
- Kept `drawDayNightPass`, `drawDayNightShadowLayer`, and `buildNightHemisphereFeature` in `map_renderer.js`.
- Replaced in-file night light dispatch with `getCityLightsRenderOwner().drawNightLightsLayer(...)`.
- Added owner behavior tests for modern cache/key helpers and historical density, retention, asset/fallback, and derived-glow invalidation.
- Refreshed `dist/app` with `py -3 tools/build_pages_dist.py`.
- Fixed stale e2e smoke assertions discovered during required gates:
  - City/urban radius diff now disables Day/Night while checking legacy radius migration, then re-enables Day/Night for lights.
  - HOI4 smoke now matches the current zero controller-only baseline.
  - TNO smoke opens the Inspector drawer and Country Inspector details before checking the search input.
  - City marker smoke filters the anonymous backend auth probe 401 while preserving other console/network failures.

## Review Notes

- Static child review found two actionable issues:
  - Ensure `dist/app/js/core/renderer/city_lights_render_owner.js` is tracked with the dist import.
  - Update urban policy boundary contract to read City Lights static key from the new owner file.
- Both issues were addressed and verified.
- Non-blocking inherited risk: historical derived-glow cache key still summarizes projection, retention, length, and first/last entry. This matches the pre-extraction behavior and was left unchanged to preserve rendering semantics.

## Perf Gate Evidence

`npm run perf:gate` failed against the checked-in 2026-04-20 baseline on this machine. The same command also failed from a detached `origin/main@bb40fe02` baseline worktree, so the historical gate is currently environment-red.

- Current branch first run failed startup/refresh/render thresholds after manual server reuse.
- `origin/main@bb40fe02` failed: `tno_1962.totalStartupMs=9068.6`, `tno_1962.refreshScenarioApplyMs=371.8`, `hoi4_1939.totalStartupMs=9461.9`, `hoi4_1939.refreshScenarioApplyMs=502.6`, `hoi4_1939.renderSampleMedianMs=709.7`.
- Current branch second run failed: `tno_1962.totalStartupMs=10119.3`, `tno_1962.refreshScenarioApplyMs=368.4`, `hoi4_1939.totalStartupMs=11088.8`, `hoi4_1939.refreshScenarioApplyMs=513.1`, `hoi4_1939.renderSampleMedianMs=713.7`.

Interpretation: functional rendering and smoke gates are green; perf gate cannot be claimed green in this environment. Same-machine comparison suggests refresh/render are close to main, while startup remains noisy and above the historical baseline for both branches.

## Live Process Ownership

Main agent owned all commands that executed tests, builds, Pages dist generation, perf gates, dev server, and browser/e2e flows.

Child agents performed static review only.
