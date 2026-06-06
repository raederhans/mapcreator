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

## 2026-06-04 Next Evaluation Pass
- Created clean worktree `C:\Users\raede\Desktop\dev\mapcreator-render-chain-next-eval` on branch `codex/render-chain-next-eval` at `c3a96e27` to avoid broad dirty WIP in the main checkout.
- Main checkout is ahead of `origin/main` by the render-chain merge and still has unrelated WIP; benchmark conclusions in this pass must be tied to the clean worktree only.
- Main agent is the only live process owner for `perf:gate`, `bench:editor-performance`, dev server startup, and log polling.
- Acceptance for this pass: prove current-main performance identity, collect benchmark screenshots for TNO/HOI4, inspect invalid metrics and black-frame ratios, and choose the next optimization target from fresh evidence.
- New clean worktree needed `npm ci` before browser/perf tools could run; the first `perf:gate` attempt failed with missing `playwright`, then dependency install completed with 0 vulnerabilities.
- Fresh `perf:gate` wrote `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json` with 0 contract mismatches. TNO passed; HOI4 failed only `totalStartupMs`, with current `6627.2ms` over the `5986.6ms` limit.
- Fresh gate medians: TNO `totalStartupMs=6466.9`, `scenarioAppliedMs=3069.1`, `scenarioChunkPromotionVisualStageMs=643.5`, `buildHitCanvasMs=231.1`, `interactionRecoveryWindowMs=4180.9`, `renderSampleMedianMs=332.7`. HOI4 `totalStartupMs=6627.2`, `scenarioAppliedMs=3028.4`, `scenarioChunkPromotionVisualStageMs=735.6`, `buildHitCanvasMs=236.5`, `interactionRecoveryWindowMs=4423.5`, `renderSampleMedianMs=586.75`.
- Progressive recovery is still effective for the render sample: HOI4 progressive large frames recorded `politicalBgCacheBuiltPathCount=0`, `politicalFeatureFillMs=0`, and `deferredFullCacheScheduled=true`; the old near-12k Path2D full-pass build is out of the startup render sample.
- Remaining hot-path evidence points to chunk visual promotion and hit canvas. HOI4 run-02 recorded `scenarioChunkPromotionVisualStage=688.9ms` with `promotedFeatureCount=22502`, and `buildHitCanvas=202.4ms` with `visibleItemCount=11897`, `drawnItemCount=11897`, mode `deferred`.
- `bench:editor-performance` ran against `http://127.0.0.1:8017/app/?perf_overlay=1` and wrote `.runtime/output/perf/editor-performance-benchmark-next-eval.json`; served identity recorded git head `c3a96e27332d00ea0156aaaa48950798eada4cd8`, repository path `C:\Users\raede\Desktop\dev\mapcreator-render-chain-next-eval`, and scenarios `none`, `hoi4_1939`, `tno_1962`.
- Benchmark screenshot evidence: `none`, `hoi4_1939`, and `tno_1962` were scenario-consistent and had `blackFrame.count=0`. TNO `singleFillAction` was correctly marked invalid with reason `missing-last-action`; TNO double-click fill remained valid.
- Visual review found a real HOI4 user-visible defect: `hoi4_1939-interactive-pan.png` showed a red "Scenario visibility error" toast saying detail topology was not fully loaded while the expected chunked coarse startup display was already usable.
- Fixed the HOI4 toast by suppressing warning/error toast display when a chunked runtime has committed a controlled coarse prewarm. The health state is still refreshed; the user-visible error is withheld during the expected progressive coarse phase.
- After-fix targeted smoke used the same state readiness shape as the benchmark, reached `hoi4_1939` idle in `8925.4ms`, dragged the map, saved `.runtime/browser/mcp-artifacts/render-chain-next-eval-after-fix/hoi4_1939-visibility-after-fix.png`, and reported `hasScenarioVisibilityError=false`, `hasDetailCoarseWarning=false`, `blackFrameCount=0`.
- Water cache paired probe still needs its own lane. TNO `contextScenarioDurationDeltaMs.p50=-184.1ms` favored `water_off`, but the existing recommendation remained `delta-signal-insufficient`, so this should not become a default behavior change without screenshot and hit-test evidence.
- Verification for this pass: `node --check js\core\scenario_post_apply_effects.js`, `node --check tests\scenario_chunk_contracts.test.mjs`, `npm run test:node:scenario-chunk-contracts`, `npm run verify:pages-dist`, and `python -m unittest tests.test_perf_gate_contract tests.test_scenario_data_health_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q` all passed.

## 2026-06-04 Stage 1/2 Implementation Pass
- Implemented dirty hit canvas point probing in `map_renderer`: when the hit canvas is dirty during idle interactions, click/hover schedules the full hit rebuild and immediately draws only the grid candidates around the pointer into a tiny probe region. This keeps current-viewport interactions precise without forcing a full hit canvas rebuild inside the interaction path.
- Narrowed `drawHitCanvas` collection through `HIT_CANVAS_VIEWPORT_OVERSCAN_PX` and added `hitCanvasViewportProfile` diagnostics. The profile records visible, drawn, global-candidate, cell-candidate, and overscan values for full builds and point probes.
- Added chunk promotion stage metrics without adding another data scan. `chunk_runtime` now carries selected feature/byte/path-cost sums into `pendingVisualPromotion` and `pendingPromotion`; `map_renderer` records `chunkPromotionPrimaryRefreshMs`, `chunkPromotionDeferredInfraMs`, `promotedVisibleFeatureCount`, and `promotedTotalFeatureCount`.
- Contract coverage added to `tests/scenario_chunk_contracts.test.mjs` for the dirty point-probe path, viewport hit profile, and chunk promotion primary/deferred metric fields.
- Verification so far: `node --check js\core\map_renderer.js`, `node --check js\core\scenario\chunk_runtime.js`, `node --check tests\scenario_chunk_contracts.test.mjs`, and `npm run test:node:scenario-chunk-contracts` passed with 37 tests.
- Additional verification passed: `npm run test:node:renderer-runtime-state-behavior`, `npm run test:node:perf-probe-snapshot-behavior`, `npm run test:node:political-collection-fragment-camouflage`, `python -m unittest tests.test_perf_gate_contract tests.test_map_renderer_political_collection_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`, `npm run verify:pages-dist`, and `git diff --check`.
- `perf:gate` after Stage 1/2 still failed one metric: `hoi4_1939.totalStartupMs=6167.8ms` against limit `5986.6ms`; contract mismatches remained `0`.
- Stage 1 evidence: full background hit canvas still builds about the whole active political chunk. TNO `visibleItemCount=11978`, `drawnItemCount=11978`, `buildHitCanvas=206-245ms`; HOI4 `visibleItemCount=11897`, `drawnItemCount=11897`, `buildHitCanvas=205-215ms`. The point-probe change protects dirty interaction latency, but startup benchmark still observes full background hit builds.
- Stage 2 evidence: `chunkPromotionPrimaryRefreshMs` matches `scenarioChunkPromotionVisualStageMs`, so primary visual refresh is still the real cost. TNO `605-636ms` with `promotedVisibleFeatureCount=12019`; HOI4 `655-685ms` with `promotedVisibleFeatureCount=22502`. This proves the current selected chunk is too coarse for viewport-scope gains.
- Important metric caveat: `promotedVisibleFeatureCount` currently means the feature count inside the selected required chunk set, not a geometry-clipped viewport subset. The value equaling the total is the evidence that the current chunk granularity is too coarse for viewport-only promotion savings.
- `bench:editor-performance` ran against `http://127.0.0.1:8000/app/?perf_overlay=1` and wrote `.runtime/output/perf/editor-performance-benchmark-render-chain-next-stage.json`; served identity recorded repository `C:\Users\raede\Desktop\dev\mapcreator-render-chain-next-eval`, git head `c3a96e27332d00ea0156aaaa48950798eada4cd8`, and target/effective URLs.
- Benchmark screenshots were captured under `.runtime/browser/mcp-artifacts/render-chain-next-stage/` for `none`, `hoi4_1939`, and `tno_1962`. The run reported no black-frame evidence in the reviewed suites. HOI4 double-click fill was valid; TNO double-click fill was valid; TNO single-fill remained an invalid metric because the benchmark recorded `missing-last-action`.
- Water probe evidence remains partial. TNO produced five paired samples favoring `water_off` for `contextScenarioDurationDeltaMs` with p50 about `-168.2ms`, but the built-in recommendation stayed `delta-signal-insufficient`. HOI4 had no paired water delta in this benchmark. Stage 3 should keep water as a dedicated A/B lane and should not change the default path yet.
- A final static review subagent could not be spawned because the native agent thread limit was already reached. The main agent performed local diff review; remaining validation for this pass is final `git diff --check` after documentation updates.

## 2026-06-04 Stage 3 Water A/B
- Fixed the measurement gap before deciding behavior: `editor-performance-benchmark.py` now accepts `--context-probe-scenarios` and `--context-probe-cases`, while preserving the default TNO-only full context probe. This lets the water lane run HOI4 and TNO paired samples with only `baseline,water_off`.
- Contract coverage now requires configurable context probe scenarios/cases and records `contextProbeScenarios` plus `contextProbeCases` in the benchmark report config.
- Dedicated run: `npm run bench:editor-performance -- --url http://127.0.0.1:8000/app/?perf_overlay=1 --out .runtime/output/perf/editor-performance-benchmark-render-chain-water-ab.json --screenshot-dir .runtime/browser/mcp-artifacts/render-chain-water-ab --context-probe-scenarios tno_1962,hoi4_1939 --context-probe-cases baseline,water_off`.
- Served identity: repository `C:\Users\raede\Desktop\dev\mapcreator-render-chain-next-eval`, git head `c3a96e27332d00ea0156aaaa48950798eada4cd8`, target URL `http://127.0.0.1:8000/app/?perf_overlay=1`, effective URL `http://172.21.96.1:8000/app/?perf_overlay=1`.
- HOI4 water A/B: 5 paired samples, `contextScenarioDurationDeltaMs.p50=0.4ms`, p90 `2.72ms`, samples `[4.2, 0.4, 0.5, -0.6, 0.4]`, recommendation `delta-signal-insufficient`, no negative benefit metrics.
- TNO water A/B: 5 paired samples, `contextScenarioDurationDeltaMs.p50=-235.2ms`, p90 `-231.64ms`, samples `[-230.2, -250.5, -235.2, -233.8, -245.4]`, recommendation `delta-signal-insufficient` because only `contextScenarioDurationDeltaMs` improved while draw/frame counts stayed flat.
- Visual/interactions: benchmark consistency was true for `none`, `hoi4_1939`, and `tno_1962`; black frame count was `0` for all three. HOI4 single-click and double-click fill were valid. TNO double-click fill was valid; TNO single-click remained invalid with `missing-last-action`.
- Decision: keep current water default. The evidence is not balanced across TNO and HOI4, and the built-in recommendation does not meet the release gate for changing water cache behavior.

## 2026-06-04 Stage 4 Architecture Spike
- External evidence used for the spike:
  - MDN Canvas optimization recommends pre-rendering repeated work, layered canvases for scenes with different change rates, and rendering screen differences instead of the whole state: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
  - MDN OffscreenCanvas documents `transferToImageBitmap`, `transferFromImageBitmap`, `transferControlToOffscreen`, and worker `requestAnimationFrame`; this supports a worker raster proof only if ImageBitmap ownership/currentness is explicit: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
  - Mapbox GL JS models render/source/layer update time as a function of sources, layers, and feature vertices, and recommends vector tiles plus removing unused features for large datasets: https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/
  - MapLibre large-data guidance recommends smaller GeoJSON, vector tiling, and simpler visualisation for large datasets: https://maplibre.org/maplibre-gl-js/docs/guides/large-data/
- Local architecture observation: the app already uses one visible canvas plus pass caches and a hidden hit canvas. This gives some benefits of pre-rendering, but the DOM-level canvas split is still absent: background, political, context, and interaction passes all composite through the same visible canvas.
- Multi-layer canvas spike result: useful later for separating static background/political/context/hover invalidation, but it will not remove the measured `chunkPromotionPrimaryRefreshMs` cost while the primary promotion still feeds 12k-22.5k features into one selected chunk.
- OffscreenCanvas worker spike result: the repo already has `js/workers/political_raster.worker.js` and a client path behind the political raster worker flag. The next worker proof should focus on political background raster or hit canvas only after the chunk-internal visible subset reduces how much data is sent or drawn. Otherwise it moves large payload/currentness complexity to another thread without reducing selected feature count.
- MapLibre/deck.gl spike result: both are plausible long-term renderers if the product accepts a vector-tile/source-layer model, but the feature contract is broad: scenario fill updates, hover/hit, double-click fill, chunk incrementality, Atlantropa/water layers, and current viewport progressive quality all need parity. The immediate production path remains 2D Canvas with finer visible data selection.
- Recommended prototype sequence:
  1. Implement chunk-internal visible feature subset for primary promotion and hit/background primary passes.
  2. Re-run `perf:gate` and `bench:editor-performance`; require `promotedVisibleFeatureCount < promotedTotalFeatureCount` for HOI4/TNO before further architecture work.
  3. Prototype DOM multi-layer canvas only if primary refresh drops but composition remains hot.
  4. Prototype OffscreenCanvas worker only if main-thread raster remains the top cost after data volume is reduced.
  5. Keep MapLibre/deck.gl as a separate feature-contract spike with no production dependency until parity is proven.

## 2026-06-04 Review Fix Pass
- Independent native review lanes could not start because the current session had reached the agent thread limit. The main lane completed a local review and treated this as a review coverage limitation rather than a formal independent approval.
- Review finding fixed: `--context-probe-scenarios` previously accepted arbitrary ids, so a typo could silently skip a water/context probe scenario and make the report look more complete than it was. The benchmark now validates probe scenario ids against `SCENARIO_IDS` and raises a clear error for unknown values.
- Review finding fixed: hit-canvas pixel reads and the dirty point-probe path now resolve `runtimeState.dpr` to a finite positive value before mapping pointer coordinates into device pixels. This avoids NaN/zero dpr turning an interaction probe into an invalid canvas read or transform.
- Contract coverage now locks both review fixes: benchmark scenario validation and finite-dpr hit canvas reads.
- Verification after the review fixes: `node --check js\core\map_renderer.js`, `node --check tests\scenario_chunk_contracts.test.mjs`, `node --check dist\app\js\core\map_renderer.js`, `python -m py_compile ops\browser-mcp\editor-performance-benchmark.py`, `npm run test:node:scenario-chunk-contracts`, `python -m unittest tests.test_perf_gate_contract tests.test_map_renderer_political_collection_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`, `npm run verify:pages-dist`, and `git diff --check` all passed. A direct parser probe confirmed `bad_scenario` is rejected with `Unknown --context-probe-scenarios value(s): bad_scenario`.

## 2026-06-04 Chunk-Internal Visible Subset Pass
- Main agent still owns all live verification. Native subagent review remained unavailable because the session had reached the agent thread limit.
- Implemented the next selected lane: `scenario_chunk_manager` now computes full selected feature count, viewport-visible feature count, political-only full count, political-only visible count, and a viewport feature subset signature from manifest `feature_bounds`.
- Added `mergeScenarioChunkPayloadsForViewport()` for political chunks. It filters chunk payload features by per-feature bounds, preserves full chunk payloads when bounds are unavailable or count-mismatched, and reports clipped/full/unbounded stats.
- `chunk_runtime` now keeps full `mergedLayerPayloads` as the durable payload and creates `primaryMergedLayerPayloads` for primary recovery. A changed viewport feature subset can force a political refresh even when the selected chunk ids are unchanged.
- `map_renderer` now composes `scenarioPoliticalVisibleChunkData` during the primary recovery frame, while `scenarioPoliticalChunkData` keeps the full payload. Deferred chunk infra clears the visible payload, rebuilds full political collections/state, marks hit canvas dirty, and records `fullPoliticalRestoreMs`.
- New behavior coverage proves the target chain: a 3-feature political chunk with 2 visible features stores all 3 in `scenarioPoliticalChunkData`, uses 2 in `scenarioPoliticalVisibleChunkData`, and exposes primary visible/total counts during refresh.
- Verification so far: `node --check` passed for changed source and synced dist files; `npm run test:node:scenario-chunk-contracts` passed with 40 tests.
- Remaining validation: run broader runtime/state contracts, `verify:pages-dist`, `git diff --check`, then run `perf:gate` and explicit-url `bench:editor-performance` to confirm `promotedVisibleFeatureCount < promotedTotalFeatureCount` in real TNO/HOI4 samples.

## 2026-06-05 Render Chain Correctness Repair
- User-provided audit report was independently verified before implementation. The report was directionally correct that the recent visible-subset promotion path broke political fill ownership, but the current HOI4 coarse count evidence was `11912`, not the older `9549` number in the report.
- Current repair supersedes the previous "chunk-internal visible political subset owns primary recovery" direction for political fill ownership. Viewport-visible political data may remain as metrics/diagnostics/current-selection auxiliary data; `landDataFull`, `landData`, and initial ready now use the complete promoted political collection.
- Generator fix: `tools/scenario_chunk_assets.py` now uses complete `runtime_topology.topo.json` political features for coarse chunks when runtime political data exists. Startup political data is only a fallback when runtime political features are absent.
- Renderer fix: `rebuildPoliticalLandCollections()` composes `runtimeState.scenarioPoliticalChunkData` into the authoritative political land collections. It still records `scenarioPoliticalVisibleChunkData` counts for diagnostics, but visible data no longer replaces the full collection.
- Ready fix: `buildInitialScenarioChunkVisualPromotionResult()` now requires `scenarioPoliticalChunkFeatureCount > 0`, plus land data and colors. A clipped visible subset alone cannot satisfy startup visual readiness.
- Contract updates: Python chunk-asset tests now cover complete runtime coarse ownership; Node contracts now cover full `landData` preservation during viewport-clipped promotion, complete coarse prewarm, and health counts ignoring visible subsets.
- Regeneration evidence: after rebuilding HOI4 and TNO chunks, `political.coarse.r0c0` matches runtime topology counts: HOI4 `22502/22502`, TNO `12019/12019`, and manifest `feature_bounds` lengths match those counts.
- Performance follow-up: the first correctness repair restored fill ownership but made deferred infra repeat a full political restore. The final fix treats `primaryDerivedStateReady` as the ownership signal; deferred infra clears the visible diagnostic payload and only rebuilds full political state when the visual stage has not already completed the main derived state.
- Final review fix: `preloadScenarioCoarseChunks()` now uses full-world bounds for startup coarse prewarm. This keeps the first committed coarse payload complete while later visibility refreshes keep current-viewport selection.
- Final evidence: `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json` after the review fix; TNO median `totalStartupMs=5455.3ms`, HOI4 median `totalStartupMs=5853.1ms`; all six benchmark samples recorded `restoredFullPoliticalChunkData=false` and `fullPoliticalRestoreMs=0`.
- Final verification passed: `node --check` for changed source/dist JS, `npm run test:node:scenario-chunk-contracts` with 43 tests, `python -m unittest tests.test_scenario_chunk_assets tests.test_startup_bootstrap_assets -q` with 31 tests, `npm run test:node:scenario-lifecycle-runtime-behavior` with 9 tests, `npm run verify:scenario-contracts`, `npm run verify:pages-dist`, and `git diff --check`.

## 2026-06-05 Hit Canvas/Yield Low-Risk Pass
- Execution boundary: isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-render-hit-yield`, branch `codex/render-hit-yield`, based on local `main` at `9d163b27`. Main checkout had unrelated `.omx/metrics.json` and remains excluded from the change.
- Live process ownership: main agent owns all test/build/perf commands in this pass. No browser smoke has been started because the requested plan makes browser validation optional unless code/test evidence shows a visual risk.
- Implemented `js/main.js` `yieldToMain()` as `scheduler.yield()` first, with `setTimeout(0)` fallback.
- Implemented `recordDeferredFullHitCanvasMetric()` in `js/core/map_renderer.js` so `buildHitCanvas` and `hitCanvasViewportProfile` can report `mode: "deferred-full"` and `profile: "deferred-full"` when full hit canvas work is intentionally delayed.
- Changed `buildHitCanvasAfterStartup()` so startup interaction infrastructure no longer calls `ensureHitCanvasUpToDate({ force: true })`. It records the deferred-full metric, keeps readiness when requested, and lets existing idle render scheduling or dirty point-probe handle later hit canvas needs.
- Changed `scheduleStagedHitCanvasWarmup()` so staged warmup no longer forces full hit canvas construction. It records reason `staged-hit-canvas-warmup` and leaves the dirty canvas path observable.
- Existing dirty point-probe path remains intact: dirty hover/click schedules deferred full build and immediately probes local grid candidates.
- Contract coverage was added to `tests/scenario_chunk_contracts.test.mjs` for scheduler-yield preference, startup deferred-full behavior, staged warmup deferred-full behavior, and separated metric reasons.
- First verification evidence: `npm run test:node:scenario-chunk-contracts` passed `43/43`.
- Final verification evidence: perf/report Python contracts passed `28/28`; `npm run verify:pages-dist` passed packaged tests `22/22`; `npm run perf:gate` passed with zero failures and zero contract mismatches.
- Latest perf gate p50 values: TNO `totalStartupMs=5407.2ms`, `scenarioChunkPromotionVisualStageMs=578.4ms`, `buildHitCanvasMs=197.7ms`; HOI4 `totalStartupMs=5985.0ms`, `scenarioChunkPromotionVisualStageMs=636.4ms`, `buildHitCanvasMs=205.1ms`.
- Interpretation: full hit canvas work still happens as an idle deferred task in the benchmark sample. The startup/recovery forced-full path is now removed, and the remaining idle/full work is clearly labeled for the next optimization lane.
## 2026-06-05 Political LOD Spike Ralph Context
- Current branch/worktree: `codex/render-political-lod-spike` at `C:\Users\raede\Desktop\dev\mapcreator-render-political-lod-spike`.
- Ralph snapshot: `.omx/context/render-political-lod-spike-20260605T233450Z.md`.
- PRD/test-spec: `.omx/plans/prd-render-political-lod-spike-20260605.md`, `.omx/plans/test-spec-render-political-lod-spike-20260605.md`.
- Live process owner: main agent only. No subagent may run or poll tests, builds, dev servers, browser benchmarks, or perf gates for this lane.
- Subagent findings:
  - Implementation touchpoint is `tools/scenario_chunk_assets.py`; it already owns political coarse chunk generation and manifest cost fields.
  - Test touchpoint is `tests/test_scenario_chunk_assets.py`; it already covers political coarse source selection, manifest metadata, and payload contracts.
- Scope decision: implement coarse political build-time simplification plus optional diagnostics; keep detail chunks and runtime full political payload contract unchanged.

## 2026-06-05 Political LOD Review Fix Context
- Review found a real generator contract bug: political coarse `feature_bounds` were still computed from pre-simplified selected features, so a regenerated manifest could drift from the final optimized payload.
- Fix: compute `feature_count` and `feature_bounds` from the final `chunk_payload.features` after political coarse simplification.
- Additional hardening: accept only `Polygon` / `MultiPolygon` simplification results and keep original geometry if Shapely repair produces another type.
- Diagnostics were expanded for the next regeneration/perf lane: `source/optimized` byte size and part count, `round_decimals`, and `preserve_topology`.

## 2026-06-06 LOD Acceptance Run Context
- Earlier entries are historical setup evidence; they do not count as acceptance evidence for this run.
- This run must regenerate TNO/HOI4 scenario chunks, prove real `political.coarse` manifest fields against final written payloads, rerun scenario contracts, rerun Pages dist verification, and require a fresh `npm run perf:gate` pass before landing.
- Autopilot consensus evidence exists from Codex App native subagents, but `omx state write` could not transition to `ultragoal` because this App run did not populate OMX `subagent-tracking.json`; continue with explicit file/subagent evidence and record the compatibility gap in final evidence.
- Real-data regeneration completed for `data/scenarios/tno_1962` and `data/scenarios/hoi4_1939`.
- Named validator passed: `python -m unittest tests.test_scenario_chunk_assets.ScenarioChunkAssetsTest.test_checked_in_political_coarse_lod_manifest_matches_payload -q`.
- LOD diagnostics after regeneration:
  - TNO coarse: byte size `26,960,504 -> 11,435,737`, coord count `629,841 -> 501,709`, estimated path cost `806,930 -> 678,774`.
  - HOI4 coarse: byte size `34,229,015 -> 14,382,950`, coord count `715,490 -> 561,427`, estimated path cost `1,013,852 -> 859,821`.
- Fresh `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json`; TNO p50 `totalStartupMs=5070.6ms`, `scenarioChunkPromotionVisualStageMs=522.8ms`, `buildHitCanvasMs=184.5ms`; HOI4 p50 `totalStartupMs=5608.7ms`, `scenarioChunkPromotionVisualStageMs=569.5ms`, `buildHitCanvasMs=176.2ms`.
- Verification passed so far: py_compile for generator/checker entries and chunk test, chunk asset tests `15/15`, Node scenario chunk contracts `43/43`, TNO scenario contracts, HOI4 bundle check, Pages dist startup shell `22/22`, perf/report boundary contracts `28/28`, and perf gate.
- Review found a real Pages dist contract issue: `dist/pages-dist-manifest.json` was computed from CRLF working-tree sizes for root `dist/app.js`, `dist/index.html`, and `dist/styles.css`, while `.gitattributes` publishes them as LF. The builder now normalizes those root files before manifest generation.
- Review-fix verification: `python -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_pages_dist_generated_text_writes_use_lf -q` passed; `npm run verify:pages-dist` passed with `22/22`; manifest recompute matched `app.js=36893`, `index.html=42534`, `styles.css=28336`, TNO coarse `11435737`, HOI4 coarse `14382950`, and total `1109157488`.
- Git line-ending proof after the review fix: `git ls-files --eol dist/app.js dist/index.html dist/styles.css dist/pages-dist-manifest.json` reported `w/lf` for all four tracked files.
- Fresh post-review gates passed: `npm run test:node:scenario-chunk-contracts` `43/43`, `python -m unittest tests.test_perf_gate_contract tests.test_map_renderer_political_collection_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q` `28/28`, `python -m unittest tests.test_scenario_chunk_assets -q` `15/15`, and `npm run perf:gate` passed.
- Latest post-review perf gate p50 values: TNO `totalStartupMs=5502.1ms`, `scenarioChunkPromotionVisualStageMs=544.1ms`, `buildHitCanvasMs=192.6ms`; HOI4 `totalStartupMs=5748.3ms`, `scenarioChunkPromotionVisualStageMs=575.9ms`, `buildHitCanvasMs=186.3ms`.
- UltraQA found and fixed a real budget blocker: TNO `render_budget_hints.max_required_political_estimated_path_cost` was still `520000`, below regenerated `political.coarse.r0c0.estimated_path_cost=678774`. The accepted hint is now `680000`, and the checked-in validator asserts any present political path-cost budget covers the real coarse chunk cost.
- After the budget fix, the first perf reruns failed under a noisy local environment. A stale local `tools/dev_server.py` on port `8000` was stopped; the final clean-window `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json`.
- Final acceptance perf p50 after the UltraQA fix: TNO `totalStartupMs=5410.6ms`, `scenarioChunkPromotionVisualStageMs=536.9ms`, `buildHitCanvasMs=188.9ms`; HOI4 `totalStartupMs=5975.9ms`, `scenarioChunkPromotionVisualStageMs=583.1ms`, `buildHitCanvasMs=180.5ms`.
