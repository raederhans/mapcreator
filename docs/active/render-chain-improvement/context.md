# Render Chain Improvement Context

## 2026-06-04
- Started from local `main` commit `80bdb0e8`.
- Main checkout has unrelated dirty HGO/localization work; implementation is isolated in `codex/render-chain-improvement`.
- Prior evidence points to post-scenario visible-frame recovery as the current bottleneck: `settleExact`, `hitCanvas`, `scenarioChunkPromotionVisualStageMs`, and `interactionRecoveryWindowMs`.
- `applyScenarioBundleMs` is currently faster than the checked-in baseline, so this task should avoid broad scenario-apply rewrites.
- Main agent owns live tests and benchmark runs. Subagents are read-only evidence lanes.

## Risks
- `js/core/map_renderer.js` is large and shared; edits must stay narrow.
- Benchmark changes can make reports more honest while preserving the existing gate thresholds.
- Browser benchmark evidence depends on a real served URL; reports must identify the served runtime.

## Verification Evidence
- `python -m unittest tests.test_perf_gate_contract -q`: passed, 22 tests.
- `npm run test:node:perf-probe-snapshot-behavior`: passed, 4 tests.
- `npm run test:node:scenario-chunk-contracts`: passed, 33 tests.
- `python -m unittest tests.test_map_renderer_political_collection_boundary_contract tests.test_renderer_runtime_state_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract -q`: passed, 16 tests.
- `npm run test:node:renderer-runtime-state-behavior`: passed, 9 tests.
- `npm run test:node:political-collection-fragment-camouflage`: passed, 4 tests.
- `npm run verify:pages-dist`: passed, 19 tests, total dist size 1037.26 MiB.
- `npm run perf:gate`: produced `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json`; contract mismatches empty; gate still fails on `tno_1962.totalStartupMs`, `hoi4_1939.totalStartupMs`, and `hoi4_1939.renderSampleMedianMs`.
- `npm run bench:editor-performance -- --url http://127.0.0.1:8017/app/?perf_overlay=1 --out .runtime/output/perf/editor-performance-benchmark-render-chain-improvement.json --screenshot-dir .runtime/browser/mcp-artifacts/render-chain-improvement`: passed and recorded served runtime identity.
- After review, `settleExactRefreshPhaseBreakdown.hitCanvasMs` is scoped to metrics recorded after the current exact plan starts, so old `buildHitCanvas` samples do not leak into the current phase breakdown.
- Final rerun: `npm run perf:gate` still failed with 3 failures and 0 contract mismatches; `tno_1962.totalStartupMs=6811.5ms`, `hoi4_1939.totalStartupMs=7986.9ms`, `hoi4_1939.renderSampleMedianMs=949.8ms`.
- Final editor benchmark rerun served `http://127.0.0.1:8017/app/?perf_overlay=1` from the isolated worktree and wrote `.runtime/output/perf/editor-performance-benchmark-render-chain-improvement.json`.

## Performance Findings
- Perf gate now exposes `workloadIdentity`, per-scenario manifest hash, and `sampleSpread`.
- Current gate failures are narrower than the prior audit snapshot: startup remains over threshold for TNO/HOI4, and HOI4 render sample median remains over threshold.
- Final perf gate sample spread shows visible variance: TNO startup p50 6811.5ms, spread 774.8ms; HOI4 startup p50 7986.9ms, spread 312.5ms; HOI4 render median p50 949.8ms, spread 24.75ms.
- Editor benchmark marks `tno_1962.singleFillAction` invalid with `missing-last-action`, while all other checked fill actions remain valid.
- Water probe signal is weak: `tno_1962.contextScenarioDurationDeltaMs.p50 = -0.2ms`, recommendation remains `delta-signal-insufficient`.
- Hot path remains visible: final editor benchmark reported `settleExact` around 1268.5ms for TNO and 1171.7ms for HOI4; TNO `scenarioChunkPromotionVisualStage` fallback for zoom-end visibility was 520.8ms.

## 2026-06-04 Follow-up Optimization
- Raw perf gate samples show HOI4 first startup render is dominated by `drawPoliticalBackgroundFillsPass` and `scenarioPoliticalBackgroundCacheBuild`: run-01 recorded about 531.7ms for the background pass and about 521.7ms for first full-pass Path2D cache construction.
- `selectScenarioChunks` already filters required chunks by viewport; the current full-world cost comes from the selected startup political chunk itself containing the visible shell/detail payload, so selector rewrites are not the shortest safe path.
- Tested and rejected startup-only full-pass political background cache deferral: `perf:gate` worsened to `tno_1962.totalStartupMs=7552.8ms`, `hoi4_1939.totalStartupMs=8354.7ms`, and `hoi4_1939.renderSampleMedianMs=1298.6ms`. The direct grouped draw path costs more than building and replaying the Path2D full-pass cache.
- Tested and rejected post-ready political background cache warmup: `scenarioPoliticalBackgroundCacheWarmup` stayed absent from benchmark snapshots, so the scheduled task did not run inside the measured startup recovery window.
- Tested and rejected disabling full-pass cache for visible political background drawing: `hoi4_1939.renderSampleMedianMs` worsened to `1219.6ms`, with the second render background pass around `1076-1131ms`. The full-pass Path2D cache is expensive to build, but replay is still cheaper than direct grouped path replay for HOI4.
- Added render sample diagnostic details for per-frame `politicalBgMs`, `politicalBgCacheBuildMs`, `politicalFeatureFillMs`, `contextScenarioMs`, and `hitCanvasMs`, scoped to metrics recorded after the current render frame starts.
- Added contracts for viewport-only required chunk selection, render sample diagnostic isolation, render hot-path detail exposure, and stale generation interaction recovery cleanup.
- Final retained-version `perf:gate` still fails existing thresholds: `tno_1962.totalStartupMs=7015.1ms`, `hoi4_1939.totalStartupMs=6804.4ms`, and `hoi4_1939.renderSampleMedianMs=812.8ms`. Retained samples show second-frame political background cache build remains about `402-485ms`, hit canvas about `203-226ms`, and interaction recovery about `4452-5201ms`.
- Final review found two fix-before-submit issues. Fixed Pages dist manifest drift by normalizing `dist/app` JS/JSON and `app/index.html` to LF before writing `pages-dist-manifest.json`; post-fix manifest size mismatch count is `0`. Strengthened render sample tests with an executable `readRenderPerfMetricDuration` sequence-filter check and `politicalFeatureFillMs` assertion.

## 2026-06-04 Follow-up Evidence
- Tested and rejected SVG-string group Path2D construction for full-pass political background cache. It reduced HOI4 cache build from roughly `412-485ms` to `321-346ms`, but moved cost into `drawPoliticalFeatureFillLoop`: HOI4 rose to about `193-197ms`, TNO rose to about `258-266ms`, and `hoi4_1939.renderSampleMedianMs` worsened to `865.3ms`.
- Retained the existing per-feature Path2D cache and full-pass group replay. Deleting that path had already worsened HOI4 render median to `1219.6ms`; the safe direction is to keep per-feature cache reuse and reduce first-build timing/cost.
- Added render sample counters for `politicalBgCacheEntryCount` and `politicalBgCacheBuiltPathCount`. Latest retained-path `perf:gate` still fails thresholds, but confirms the real second-frame build shape: TNO builds `11978/11978` paths, HOI4 builds `11897/11897` paths, with cache build about `413-457ms`.
- Latest retained-path `perf:gate`: `tno_1962.totalStartupMs=6912.8ms`, `hoi4_1939.totalStartupMs=6964.0ms`, and `hoi4_1939.renderSampleMedianMs=803.9ms`. This is still above gate, but no longer shows the SVG-string group experiment's feature-fill regression.
- Tested and rejected making political Path2D cache transform-independent as a direct optimization. The targeted signal did not move: second-frame full-pass builds still reported `reusedPathCount=0`.
- Added `politicalPathCacheReset`, `pathCacheSizeBefore`, and `pathCacheSizeAfter` diagnostics. Latest samples show first scenario frame builds a small visible cache (`pathCacheSizeAfter=198`), while the later full-pass build starts from `pathCacheSizeBefore=0` and ends around `11978` for TNO / `11897` for HOI4. This indicates the cache lifecycle is reset between the bootstrap visible frame and the full political recovery frame.
- Latest diagnostic `perf:gate` still fails existing thresholds: `tno_1962.totalStartupMs=6712.1ms`, `hoi4_1939.totalStartupMs=6831.5ms`, and `hoi4_1939.renderSampleMedianMs=806.4ms`. Next implementation should inspect the scene/data swap boundary that discards the small visible cache before full-pass recovery.

## 2026-06-04 Path Cache Lifecycle Follow-up
- Main agent owns all live verification. Subagent Ohm ran a read-only static map of political path cache invalidation paths.
- Static evidence shows `invalidateRenderPasses("political", reason)` cleared `politicalPathCache` for every political invalidation except `refresh-colors`; `exact-after-settle-political` therefore discarded Path2D cache even though it is a political pass repaint with stable projected geometry.
- Tested and rejected a stable-repaint reason classifier for `refresh-colors`, `rebuild-colors`, `exact-after-settle-political`, `bootstrap-first-political-frame`, and `startup-initial-visual`. The cache predecessor moved from `bootstrap-first-political-frame` to `startup-initial-visual`, but full-pass build stayed effectively full-world and the gate remained above threshold.
- Tested and rejected narrowing `getPoliticalPathCacheSignature()` plus per-entry `featureRef` / `projectionSignature` reuse. The best samples only reused 11 TNO paths and 1 HOI4 path out of about 12k, while cache size grew with stale entries; this is too little benefit for the added complexity.
- Retained only the diagnostic improvement: `scenarioPoliticalBackgroundCacheBuild` and render samples now expose `pathCacheResetPreviousReason`, making future cache lifecycle failures visible without changing runtime behavior.
- Added `pathCacheResetPreviousReason` to `scenarioPoliticalBackgroundCacheBuild` and render samples so the next perf run can show the cache state before any full-pass rebuild.
- Final retained-diagnostic `perf:gate` still fails existing thresholds: `tno_1962.totalStartupMs=7503.6ms`, `hoi4_1939.totalStartupMs=7937.6ms`, and `hoi4_1939.renderSampleMedianMs=907.6ms`. Samples confirm the full political cache rebuild starts from `pathCacheSizeBefore=0`, records `pathCacheResetPreviousReason=bootstrap-first-political-frame`, and builds `11978/11978` TNO paths or `11897/11897` HOI4 paths. The next optimization lane should target `hitCanvas` around `253-279ms`, `scenarioChunkPromotionVisualStage` around `697-805ms`, and `interactionRecoveryWindowMs` around `4934-5420ms`.
- Final read-only review found no blocking issue. It flagged that the regression test should more strongly lock the rejected signature-narrowing and per-entry reuse experiments. The contract now asserts the full political path cache signature inputs and the lightweight `{ path }` entry shape; `npm run test:node:scenario-chunk-contracts` passes with 37 tests.

## 2026-06-04 Chunk Promotion Refresh Breakdown
- Added `politicalChunkPromotionBreakdown` around chunk payload normalization, identity, comparison, and visual refresh. One-run evidence showed normalize/identity/compare are negligible while `refreshMapDataForScenarioChunkPromotion` owns almost all chunk promotion cost.
- Added `rebuildPoliticalLandCollectionsBreakdown` around runtime collection, compose, Atlantropa append, interactive filtering, and coverage stats. TNO one-run baseline: rebuild `163.7ms`, compose `137.1ms`, interactive `20.5ms`, coverage `5.5ms`. HOI4 one-run baseline: rebuild `216.6ms`, compose `180.6ms`, interactive `29.9ms`, coverage `5.6ms`.
- Subagent Aquinas reviewed `debugCountryCoverage`: it can be moved to a lazy/cache-invalidated path later, but current evidence shows only about `5-7ms`, so it is not the current best optimization target.
- Tested and rejected skipping repeated detail geometry normalization for scenario chunk composition. A read-only data probe against real `political/detail` chunks found large D3 areas in both TNO and HOI4 raw chunk GeoJSON, so the optimization was reverted even though the one-run timing looked better. The behavior test now covers representative Polygon and MultiPolygon cases where detail composition normalizes large-area geometry before tagging `__source: "detail"`.
- Rejected skip-geometry one-run evidence, kept here only as context: TNO total `6980.4ms -> 6904.3ms`, render median `663.2ms -> 520.9ms`, rebuild `163.7ms -> 158.6ms`, compose `137.1ms -> 131.0ms`, background cache build `565.4ms -> 508.5ms`; HOI4 total `7314.3ms -> 7161.7ms`, render median `887.2ms -> 870.5ms`, rebuild `216.6ms -> 207.6ms`, compose `180.6ms -> 173.9ms`, background cache build `480.7ms -> 472.4ms`.
- Tested and rejected a single-pass compose rewrite. It reduced TNO compose to `126.4ms`, but HOI4 regressed: total `7249.6ms`, render median `925.7ms`, rebuild `228.9ms`, compose `191.2ms`, background cache build `491.5ms`. The experiment was reverted.
- Latest retained-version `perf:gate` still fails existing thresholds with 0 contract mismatches: `tno_1962.totalStartupMs=7027.9ms`, `hoi4_1939.totalStartupMs=7275.4ms`, and `hoi4_1939.renderSampleMedianMs=904.3ms`. Sample spreads remain material: TNO startup spread `256.5ms`, HOI4 startup spread `250.2ms`, HOI4 render median spread `62.55ms`.
- The recovery window metric is mostly a diagnostic span from `zoomGestureEndedAt` to the eventual recovery task record. Current task durations are small (`interactionRecoveryTaskMs` p50 about `0.2ms` TNO and `4.9ms` HOI4). Do not chase this metric as a primary runtime cost without changing readiness semantics deliberately.
- HOI4 render samples show the persistent hard cost: first frame builds about `198` background paths in `57.1ms`; second frame builds `11897` background paths in about `496.4ms`, producing `renderSampleMedianMs=904.25ms` when only two render samples are captured.

## 2026-06-04 Post-Review Safety Fix
- Read-only review flagged that skipping geometry normalization for scenario political chunk composition required a real data contract. A direct probe of current `political/detail` chunks found large D3 areas in both TNO and HOI4 raw chunk GeoJSON, so the skip-normalization optimization was removed.
- Added `political_collection_fragment_camouflage_behavior` coverage for the retained safe behavior: detail composition normalizes representative large-area Polygon and MultiPolygon geometry before tagging features with `__source: "detail"`.
- Refreshed `perf:gate` after the rollback: failures remain the same three metrics, `tno_1962.totalStartupMs=7052.3ms`, `hoi4_1939.totalStartupMs=7381.4ms`, `hoi4_1939.renderSampleMedianMs=901.1ms`.
- Latest run-03 hot-path details: TNO `politicalChunkPromotionBreakdown=745.2ms` with `refreshMs=743.2ms`, `rebuildPoliticalLandCollectionsBreakdown=150.5ms` with `composeMs=128.8ms`, and `scenarioPoliticalBackgroundCacheBuild=550.4ms` for `11978` built paths. HOI4 `politicalChunkPromotionBreakdown=809.0ms` with `refreshMs=804.3ms`, `rebuildPoliticalLandCollectionsBreakdown=204.6ms` with `composeMs=169.6ms`, and `scenarioPoliticalBackgroundCacheBuild=517.0ms` for `11897` built paths.
- Next optimization target remains the full political background Path2D build and startup visual refresh shape. The safe short-term path is to reduce how much the second render sample builds, or shift that build out of the measured startup recovery path without changing visible correctness.

## 2026-06-04 Progressive Recovery Implementation
- User selected first-stage progressive political recovery: default recovery quality should prioritize current viewport usability and defer full fine political background cache work. Exact mode remains available through `?political_recovery_quality=exact`.
- Implementation boundary: no new production dependency, no WebGL/vector-tile migration, and no default worker raster route in this phase.
- Expected evidence: startup/recovery `scenarioPoliticalBackgroundCacheBuild.builtPathCount` should stop matching the prior near-12k full-pass shape in progressive mode; deferred/idle full-pass work must be separately visible in diagnostics.

## 2026-06-04 Progressive Recovery Final Evidence
- Implemented `politicalRecoveryQuality` with default `progressive` mode and `?political_recovery_quality=exact` override. Runtime state now records the resolved mode for diagnostics.
- Progressive large recovery frames draw the admin0 political underlay, skip the fine feature fill/stroke loop for that frame, and schedule full fine political background cache completion through idle slices. `refresh-colors` keeps the exact path so hover/click/double-click fill feedback stays aligned with current viewport hit results.
- Reviewer P1 fix: deferred full cache slices now reuse the stored entry list and full-pass cache key instead of recomputing full identity before every slice. `progressive-political-full-cache-ready` invalidates the political pass while preserving the path cache.
- Final `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json` with 0 failures. TNO p50 `totalStartupMs=5514.8ms`, `renderSampleMedianMs=456.7ms`; HOI4 p50 `totalStartupMs=5722.1ms`, `renderSampleMedianMs=514.3ms`.
- Startup progressive large frames no longer show near-12k full-pass Path2D builds: TNO progressive rows recorded `politicalBgCacheBuildMs=0`, `politicalBgCacheBuiltPathCount=0`, `politicalFeatureFillMs=0`; HOI4 progressive rows recorded the same zero-build shape. Small startup shell frames still build 198 paths.
- Final verification after reviewer fixes: `node --check js\core\map_renderer.js`, `node --check tests\scenario_chunk_contracts.test.mjs`, `npm run test:node:scenario-chunk-contracts`, `npm run verify:pages-dist`, and `npm run perf:gate` all passed.
- Earlier same-stage verification also passed: `npm run test:node:perf-probe-snapshot-behavior`, `npm run test:node:renderer-runtime-state-behavior`, `npm run test:node:political-collection-fragment-camouflage`, and `python -m unittest tests.test_perf_gate_contract tests.test_map_renderer_political_collection_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`.
- Remaining validation gap: targeted browser screenshots and broader `bench:editor-performance` comparison were not rerun after the final reviewer fixes. Current evidence is metric/contract based.
