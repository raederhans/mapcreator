# TNO Startup Political Visual Ready Context

## 2026-05-26
- Created worktree `C:\Users\raede\Desktop\dev\mapcreator-tno-startup-visual-ready` on branch `codex/tno-startup-visual-ready`.
- Main worktree had unrelated WIP, so implementation stays isolated.
- Ultragoal aggregate goal is active; current story is task documentation setup.
- Main thread is live-process owner for all browser/E2E work.

## Reproduction Evidence
- Direct startup can reach ready with `activeScenarioId=tno_1962`, runtime political geometry present, but `selectionVersion=0`, `scenarioPoliticalChunkData.features.length=0`, `landData.features.length=0`, and no resolved political colors.
- A zoom interaction later triggers a real chunk refresh, moves `selectionVersion` to `1`, loads political detail chunks, and restores country colors.

## Implementation Direction
- Keep `scheduleScenarioChunkRefresh()` as the non-blocking scheduler.
- Add a separate awaitable initial visual promotion gate for chunked startup scenarios.
- Allow this gate to bypass only the startup `bootBlocking` deferral after scenario apply is complete; keep zoom, interaction, stale selection, and pending post-commit protections intact.
- Gate completion must be tied to the same `scenarioId + selectionVersion` and real promoted feature/land/color counts.

## Execution Notes
- Added `awaitInitialScenarioChunkVisualPromotion()` in chunk runtime and wired it through resources, scenario manager, apply pipeline, startup boot, lifecycle cleanup, rollback snapshotting, and startup main flow.
- Fixed two live failures found during smoke:
  - `scenario_manager` was not passing the awaitable gate into the apply pipeline, leaving `awaitInitialScenarioChunkVisualPromotionFn` null.
  - Startup bundle payloads were applied without entering `scenarioBundleCacheById`, so the chunk owner could not hydrate the registry or select chunks during startup.
- Preserved the async large-scenario handoff contract by keeping HOI4 detail prewarm async and adjusting the E2E assertion to the existing `detailPrewarmCompletedAt` metric.
- Main thread owned all live work: manual dev server on 8811, Python Playwright smoke, npm Playwright E2E, and server shutdown.

## Verification Notes
- `node --check` passed for changed runtime modules.
- `python -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_scenario_boot_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q` passed.
- `npm run test:node:scenario-chunk-contracts`, `npm run test:node:startup-hydration-behavior`, and `npm run test:node:physical-layer-contracts` passed.
- `npm run test:e2e:tno-contracts` passed.
- `npm run test:e2e:dev:scenario-chunk-runtime` passed.
- `git diff --check` passed with only CRLF conversion warnings.

## Review Notes
- Code-review subagent found no blocking correctness, security, or maintainability issues; its formal verdict stayed COMMENT because code-intel diagnostics transport was unavailable.
- Architecture subagent returned WATCH for raw startup bundle cache keys; fixed by normalizing the scenario id in `cacheStartupScenarioBundle()`.
- Added rollback static coverage for `awaitInitialScenarioChunkVisualPromotionEnabled`.
- Added one reusable lesson: startup ready for chunked scenes must wait for actual promotion state, not only for scheduled refresh.
