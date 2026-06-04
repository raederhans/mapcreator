# Render Chain Improvement Task

## Current Step
- Final verification and review.

## Checklist
- [x] Report identity includes target URL, service/process hints, repository path, git head, benchmark argv, and scenario ids.
- [x] Workload identity includes scenario signatures and size hints.
- [x] Sample spread includes count, p50, p90, min, max, and spread.
- [x] Invalid interaction metrics are marked explicitly.
- [x] Renderer hot-path timings expose exact refresh phase costs.
- [x] Targeted tests pass.
- [x] Final performance evidence is recorded.
- [ ] Startup and render-sample hot paths are below `perf:gate` thresholds.

## Remaining Work
- Reduce `tno_1962.totalStartupMs`, `hoi4_1939.totalStartupMs`, and `hoi4_1939.renderSampleMedianMs` below the existing gate thresholds.
- Continue optimization on startup render sampling, chunk visual promotion, and interaction recovery using the new identity/spread evidence.
