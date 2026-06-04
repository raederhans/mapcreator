# Rendering performance benchmark evaluation context

## State

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-perf-eval`
- Branch: `codex/render-performance-benchmark-eval`
- Base commit: `e6bc754b3a7bf540aaffd0a721d9f9c6c19b26cd`
- Long process owner: main agent

## Evidence log

- `npm run perf:gate` initially failed because Playwright was missing from this fresh worktree.
- `npm ci` completed with `0 vulnerabilities`.
- `npm run perf:gate` completed and failed against `docs/perf/baseline_2026-04-20.json`.
- Gate failures:
  - `tno_1962.totalStartupMs`: `9342.2ms` current, `5805.3ms` baseline, `6676.1ms` limit.
  - `tno_1962.refreshScenarioApplyMs`: `363.5ms` current, `303.8ms` baseline, `349.4ms` limit.
  - `hoi4_1939.totalStartupMs`: `8313.0ms` current, `5205.7ms` baseline, `5986.6ms` limit.
  - `hoi4_1939.renderSampleMedianMs`: `1023.6ms` current, `560.9ms` baseline, `701.1ms` limit.
- Gate also shows `applyScenarioBundleMs` improved:
  - `tno_1962`: `786.0ms` current, `2247.6ms` baseline.
  - `hoi4_1939`: `563.3ms` current, `2355.8ms` baseline.
- Current slowdown concentrates after apply:
  - `tno_1962.scenarioChunkPromotionVisualStageMs`: `853.2ms` current, `3.6ms` baseline.
  - `hoi4_1939.scenarioChunkPromotionVisualStageMs`: `723.2ms` current, `4.2ms` baseline.
  - `tno_1962.interactionRecoveryWindowMs`: `6151.4ms` current, `3898.6ms` baseline.
  - `hoi4_1939.interactionRecoveryWindowMs`: `5716.8ms` current, `3032.9ms` baseline.
- First editor benchmark hit `http://127.0.0.1:8000/?perf_overlay=1`; current worktree gate server had been `8001` and was already stopped. Treat this first editor report as a pollution-risk sample.
- Dedicated current-worktree dev server started at `http://127.0.0.1:8017`, pid `22524`, cwd matches this worktree.
- Current-worktree editor benchmark completed against `http://127.0.0.1:8017/app/?perf_overlay=1`.
- Current-worktree editor report:
  - JSON: `.runtime/output/perf/editor-performance-benchmark-current-worktree.json`
  - Log: `.runtime/logs/editor-performance-current-worktree-20260604T021106Z.log`
  - Screenshots: `.runtime/browser/mcp-artifacts/perf-current/`
  - Water cache summary: `.runtime/reports/generated/editor-performance-water-cache-summary.json`
- Editor benchmark headline:
  - `none.pageReadyMs`: `10293ms`; `settleExactRefresh`: `816.0ms`.
  - `hoi4_1939.loadScenarioBundle`: `518.3ms`; `timeToInteractiveCoarseFrame`: `4063.8ms`; `settleExactRefresh`: `1556.8ms`.
  - `tno_1962.loadScenarioBundle`: `146.0ms`; `timeToInteractiveCoarseFrame`: `3263.9ms`; `settleExactRefresh`: `1012.2ms`.
  - `tno_1962.repeatedZoomRegions.firstIdleAfterLastWheelMs`: p50 `462.9ms`, p90 `472.4ms`, max `520.9ms`, 24 samples.
  - `tno_1962.repeatedZoomRegions.longTask.maxLongTaskMs`: `280ms`.
  - `tno_1962.repeatedZoomRegions.blackPixelRatio`: p50 `0`, max `0`.
  - `tno_1962.wheelAnchorTrace.firstIdleAfterLastWheelMs`: `417.9ms`, `maxBlackPixelRatio`: `0.128287`.
  - `tno_1962.interactivePanFrame`: `0.1ms`.
  - `tno_1962.doubleClickFillAction`: `10.4ms`.
  - `tno_1962.singleFillAction`: `lastAction` was not recorded, `blackPixelRatio`: `0.050833`; treat this metric as incomplete for fill-action proof.
- Editor benchmark pass attribution:
  - `tno_1962.repeatedZoomRegions.settleExact`: p50 `1095.5ms`.
  - `tno_1962.repeatedZoomRegions.hitCanvas`: p50 `230.4ms`, p90 `278.0ms`, max `332.6ms`.
  - `tno_1962.repeatedZoomRegions.politicalBg`: p50 `47.7ms`.
  - `tno_1962.repeatedZoomRegions.bgCacheBuild`: p50 `45.8ms`.
  - `tno_1962.waterOff.contextScenarioDurationDeltaMs`: p50 `-212.8ms`; report recommendation remains `delta-signal-insufficient`.
- Current-worktree dev server pid `22524` was stopped after benchmark; port `8017` was released.

## External reference notes

- Canvas guidance: pre-render repeated primitives and use layered canvases for complex scenes.
- OffscreenCanvas guidance: render work can move into a worker; worker `requestAnimationFrame` is available.
- Responsiveness guidance: Long Animation Frame entries expose 50ms+ frame delays and script attribution; Long Tasks expose 50ms+ main thread tasks.
- Spatial index guidance: RBush suits dynamic insert/remove and bulk load; Flatbush suits static packed indexes with ArrayBuffer transfer.
