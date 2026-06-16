# Context

## 2026-05-31 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tno-zoom-water-fill-repair`.
- Former branch: `codex/tno-zoom-water-fill-repair`; recovery commits `71b91375..417c7b27`.
- Base commit: `b928a6b4 Stabilize editor chrome and scenario color contracts`.
- Main checkout has unrelated `.omx/metrics.json` dirt and is behind `origin/main`; this work stays isolated.
- Main thread owns live tests and build processes. Subagents are static-only unless reassigned.
- `lessons learned.md` relevant rules: render passes share one lifecycle; chunk promotion, spatial, hit canvas, colors, and checked-in outputs must stay generation-aligned; source/dist changes require `verify:pages-dist`.

## Runtime Evidence Target

Capture zoom interaction state for TNO before renderer edits:

- `selectionVersion`
- `topologyRevision`
- `colorRevision`
- `contextFlagSignature`
- `interactionComposite` reject reason
- `interactionCompositeUnavailable`
- `continuityFrameRejected`
- `missingVisibleFrameSkippedDuringInteraction`

If the reject reason is outside selection/topology drift, update this context before changing renderer logic.

## 2026-05-31 Runtime Evidence Attempt 1

- Temporary probe: `.runtime/tmp/tno_zoom_evidence_2026-05-31.cjs`.
- Direct boot with `default_scenario=tno_1962` failed before zoom evidence collection.
- Boot error: `[boot] Initial scenario chunk visual promotion did not reach visible readiness: promoted`.
- Adjustment: start the base app first, then switch to TNO through the existing E2E helper path so zoom evidence is isolated from startup boot gating.
- Attempt 2 still entered TNO on boot. The probe now forces `default_scenario=hoi4_1939` before switching to TNO.
- Attempt 3 reached the helper-driven TNO apply path but timed out in `applyScenarioAndWaitIdle`.
- Decision: runtime reproduction is currently blocked by TNO startup/apply readiness. Continue with static contract evidence and controlled cache tests, then rerun focused runtime checks after data and renderer fixes.

## 2026-05-31 E2E Boot Gate Finding

- `npm run test:e2e:dev:scenario-chunk-runtime` exposed a startup race before the zoom assertions.
- Live probe on port `8920` showed `startupInitialScenarioChunkVisualPromotion.status="promoted"` with `selectionVersion=0`, `promotedFeatureCount=0`, `landFeatureCount=198`, `colorCount=137`, and `shellStatus="loading"`.
- Root cause: `allowStartupInitialVisual` bypassed `bootBlocking`, but `startupReadonly` still blocked the first chunk selection under the fast readonly startup path.
- Fix: let only the explicit startup initial visual gate pass through `startupReadonly` and `startupReadonlyUnlockInFlight`; normal refreshes keep the existing defer rules.
- Follow-up: Playwright can observe the gate before the browser settles enough for the first chunk selection. The awaitable gate now retries the same startup visual pass for a short bounded window and still fails closed if `selectionVersion`, promoted feature count, land data, and colors never become ready.

## 2026-05-31 Water E2E Ready Gate Finding

- `npm run test:e2e:water-rendering` passed 10/12 and timed out in two `tno_open_ocean_rendering` cases inside `applyScenarioAndWaitIdle`.
- Runtime probe showed TNO can be active, renderable, and chunk-idle with `scenarioAutoShellOwnerByFeatureId` empty.
- Fix: Playwright helper now accepts either shell-owner readiness or renderable runtime readiness: active scenario, no apply, land/colors present, and no pending chunk promotion.

## 2026-05-31 Final Verification

- Renderer continuity reuse now only accepts complete `interactionComposite` reuse during `INTERACTING` when mismatches are limited to selection/topology version drift.
- TNO water source/runtime/bootstrap/chunks now include `caspian_sea`, `lake_superior`, `lake_michigan`, `lake_huron`, `lake_erie`, and `lake_ontario` as interactive base-geography water.
- Startup visual gate needed two fixes discovered by E2E: explicit startup visual refresh must pass the render-phase gate, and the bounded wait must retry only while no selection has landed and no promotion is pending.
- Verification passed:
  - `node --check js/core/map_renderer.js; node --check js/core/renderer/render_cache_owner.js; node --check js/core/scenario/chunk_runtime.js; node --check tests/e2e/support/playwright-app.js`
  - `python -m py_compile tools/patch_tno_1962_bundle.py`
  - `python -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_playwright_app_ready_gate_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
  - `python -m unittest tests.test_tno_water_geometries tests.test_tno_bundle_builder -q`
  - `node --test tests/renderer_runtime_state_behavior.test.mjs`
  - `npm run test:py:tno-water-repair-contracts`
  - `npm run verify:scenario-contracts:strict`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --workers=1 --retries=0 --output=.runtime/tests/playwright/tno-zoom-water-fill-repair/scenario-chunk-output`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js tests/e2e/tno_named_water_rendering.spec.js tests/e2e/tno_open_ocean_rendering.spec.js tests/e2e/water_cache_strategy_regression.spec.js --workers=1 --retries=0 --output=.runtime/tests/playwright/tno-zoom-water-fill-repair/water-rendering-output`
  - `npm run verify:pages-dist`
