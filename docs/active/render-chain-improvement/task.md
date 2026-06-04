# Render Chain Improvement Task

## Current Step
- Political Path2D cache lifecycle reset diagnosis.

## Checklist
- [x] Report identity includes target URL, service/process hints, repository path, git head, benchmark argv, and scenario ids.
- [x] Workload identity includes scenario signatures and size hints.
- [x] Sample spread includes count, p50, p90, min, max, and spread.
- [x] Invalid interaction metrics are marked explicitly.
- [x] Renderer hot-path timings expose exact refresh phase costs.
- [x] Targeted tests pass.
- [x] Final performance evidence is recorded.
- [x] Render samples expose per-frame hot-path details.
- [x] Startup political background full-pass cache deferral experiment was tested and rejected.
- [x] Post-ready political background cache warmup was tested and rejected.
- [x] Visible political background drawing without full-pass cache was tested and rejected.
- [x] Viewport-only required chunk selection is locked by behavior test.
- [x] Final retained-version `perf:gate` evidence is recorded.
- [x] Final review issues were fixed: Pages dist manifest drift and render metric sequence behavior test coverage.
- [x] SVG-string group Path2D construction was tested and rejected.
- [x] Render samples now expose political background cache entry count and built Path2D count.
- [x] Transform-independent political path cache experiment was tested and rejected.
- [x] Render samples now expose path cache size before and after political background cache builds.
- [ ] Startup and render-sample hot paths are below `perf:gate` thresholds.

## Remaining Work
- Reduce `tno_1962.totalStartupMs`, `hoi4_1939.totalStartupMs`, and `hoi4_1939.renderSampleMedianMs` below the existing gate thresholds.
- Continue optimization on startup render sampling, chunk visual promotion, and interaction recovery using the new render sample hot-path details.
- Inspect the scene/data swap boundary that resets political path cache between the small visible startup frame and the later full-pass recovery frame.
