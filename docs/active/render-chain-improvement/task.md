# Render Chain Improvement Task

## Current Step
- Progressive political recovery implementation: reduce full political background Path2D build inside startup render samples while preserving exact mode as a comparison path.

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
- [x] Political Path2D invalidation and signature narrowing experiments were tested and rejected.
- [x] Render samples expose the previous political path cache reset reason.
- [x] Review finding fixed: political path cache signature and entry-shape contracts now lock rejected experiments out.
- [x] Chunk promotion now records visual refresh substeps through `politicalChunkPromotionBreakdown`.
- [x] Political collection rebuild now records sync substeps through `rebuildPoliticalLandCollectionsBreakdown`.
- [x] Scenario chunk geometry-normalization skip experiment was tested and rejected with real chunk data.
- [x] Rejected unstable single-pass compose experiment after HOI4 regression.
- [x] Detail composition behavior test now locks large-area geometry normalization.
- [x] Refreshed `perf:gate` after the safety rollback and recorded the remaining hot paths.
- [x] Add `politicalRecoveryQuality = progressive | exact`, defaulting to progressive with query override.
- [x] Move full fine political background cache build out of startup/chunk recovery render samples.
- [x] Record progressive/deferred cache metrics so startup samples no longer look like a near-12k full-pass build.
- [x] Verify current viewport hover/click/double-click assumptions with existing contracts and targeted benchmark evidence.
- [x] Startup and render-sample hot paths are below `perf:gate` thresholds.

## Remaining Work
- Run a targeted visual screenshot smoke when the next browser-owned validation window opens: startup first frame, chunk promotion frame, and idle-ready frame for TNO/HOI4.
- Run `bench:editor-performance` with an explicit localhost URL for a broader current/baseline/before-fix/after-fix comparison.
- Continue the next optimization lane on remaining measured costs: `scenarioChunkPromotionVisualStage`, `buildHitCanvas`, and the idle completion shape for deferred full political background cache.
