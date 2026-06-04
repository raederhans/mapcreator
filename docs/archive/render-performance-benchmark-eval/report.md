# Rendering performance benchmark evaluation report

## Conclusion

当前性能问题的主线在“剧本应用后的可见画面恢复”，重点是 `settleExact`、`hitCanvas`、chunk promotion visual stage 和交互恢复窗口。剧本数据应用本身已经明显变快，后续优化应避免继续盯着 `applyScenarioBundle` 做大改。

## Local evidence

Gate report:

- Current report: `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json`
- Baseline: `docs/perf/baseline_2026-04-20.json`
- `tno_1962.totalStartupMs`: `9342.2ms` current, `5805.3ms` baseline, `6676.1ms` limit.
- `hoi4_1939.totalStartupMs`: `8313.0ms` current, `5205.7ms` baseline, `5986.6ms` limit.
- `tno_1962.applyScenarioBundleMs`: `786.0ms` current, `2247.6ms` baseline.
- `hoi4_1939.applyScenarioBundleMs`: `563.3ms` current, `2355.8ms` baseline.
- `tno_1962.scenarioChunkPromotionVisualStageMs`: `853.2ms` current, `3.6ms` baseline.
- `hoi4_1939.scenarioChunkPromotionVisualStageMs`: `723.2ms` current, `4.2ms` baseline.
- `tno_1962.interactionRecoveryWindowMs`: `6151.4ms` current, `3898.6ms` baseline.
- `hoi4_1939.interactionRecoveryWindowMs`: `5716.8ms` current, `3032.9ms` baseline.

Editor benchmark report:

- Current report: `.runtime/output/perf/editor-performance-benchmark-current-worktree.json`
- Screenshots: `.runtime/browser/mcp-artifacts/perf-current/`
- Target URL: `http://127.0.0.1:8017/app/?perf_overlay=1`
- Git head: `e6bc754b3a7bf540aaffd0a721d9f9c6c19b26cd`
- `tno_1962.repeatedZoomRegions.firstIdleAfterLastWheelMs`: p50 `462.9ms`, p90 `472.4ms`, max `520.9ms`.
- `tno_1962.repeatedZoomRegions.longTask.maxLongTaskMs`: `280ms`.
- `tno_1962.repeatedZoomRegions.settleExact`: p50 `1095.5ms`.
- `tno_1962.repeatedZoomRegions.hitCanvas`: p50 `230.4ms`, p90 `278.0ms`, max `332.6ms`.
- `tno_1962.wheelAnchorTrace.maxBlackPixelRatio`: `0.128287`.
- `tno_1962.interactivePanFrame`: `0.1ms`.
- `tno_1962.doubleClickFillAction`: `10.4ms`.
- `tno_1962.singleFillAction`: no `lastAction` recorded; this is a benchmark reliability issue.
- Water cache probe: `water_off` reduces `contextScenarioDurationDeltaMs` by p50 `212.8ms`, while the built-in recommendation still says `delta-signal-insufficient`.

## External comparison

- MDN Canvas optimization guidance recommends pre-rendering repeated primitives and using layered canvases for complex scenes: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- MDN OffscreenCanvas guidance confirms canvas rendering can run in worker context, with worker `requestAnimationFrame` available: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- MDN Long Animation Frames guidance treats 50ms+ delayed frames as responsiveness problems and gives script attribution for frame-level root cause analysis: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing
- RBush documentation supports dynamic spatial indexes and bulk loading; bulk loading is usually much faster than individual inserts and can improve query performance: https://github.com/mourner/rbush
- Flatbush documentation fits static packed spatial indexes and ArrayBuffer transfer: https://github.com/mourner/flatbush

## Recommended path

1. First fix benchmark contracts:
   - Make `bench:editor-performance` require an explicit current-worktree URL or read `.runtime/dev/active_server.json`.
   - Record served runtime identity in reports: cwd, git head, URL, port, active server pid.
   - Add workload identity fields to `perf:gate`: scenario feature count/hash, render sample count minimum, metric spread.
   - Mark `singleFillAction` invalid when `lastAction` is null, instead of reporting `0ms`.

2. Then optimize the proven hot path:
   - Target `settleExact` first, because it is the largest repeated zoom cost.
   - Target `hitCanvas` second, because it costs 230-330ms in the repeated zoom loop.
   - Audit chunk promotion visual stage and interaction recovery window as one readiness chain.
   - Treat water/cache changes as a scoped experiment; current probe shows a signal, while the built-in recommendation is still inconclusive.

3. Then consider structural upgrades:
   - Use layered canvas boundaries to separate static background, political fill, context overlays, hit canvas, and interaction composite.
   - Move static large spatial indexes toward packed/transferable data, with Flatbush as a candidate for immutable bbox query surfaces.
   - Keep RBush-style dynamic indexing only for user-edited or frequently changing objects.
   - Evaluate OffscreenCanvas worker rendering only after `settleExact` and `hitCanvas` contracts are stable, because worker migration increases architecture cost.

## Verification notes

- `npm run perf:gate` failed with current regression evidence; this is expected for this evaluation.
- `bench:editor-performance` completed on a dedicated current-worktree service.
- Temporary service `8017` was stopped after report generation.
