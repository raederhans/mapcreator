# Render Chain Improvement Plan

## Intent
Improve the render-chain performance work in two guarded stages: first make benchmark reports trustworthy, then optimize the proven hot path around post-scenario visible-frame recovery.

## Acceptance Criteria
- Benchmark reports identify the served runtime, workload, metric validity, and sample spread.
- `singleFillAction` is marked invalid when no action was recorded.
- `settleExact`, `hitCanvas`, chunk promotion, and interaction recovery expose enough timing details to guide fixes.
- Runtime behavior remains unchanged for scenario apply, map fill, double-click fill, chunk visibility, and hit detection.
- Source/dist synchronization is verified when packaged files are touched.

## Work Items
- [x] Add active task docs and Ralph context snapshot.
- [x] Harden editor benchmark report identity and invalid metric handling.
- [x] Harden perf gate workload identity and sample spread reporting.
- [x] Add renderer hot-path timing breakdown.
- [x] Add `politicalRecoveryQuality` with default progressive mode and exact query override.
- [x] Keep startup/chunk recovery current-viewport political background usable while deferring full fine cache work to idle slices.
- [x] Keep hit/interaction correctness scoped to current viewport and existing overscan.
- [x] Run targeted contract tests and source/dist verification.
- [x] Run performance benchmarks and record before/after evidence.
- [x] Review changed files for simpler and safer implementation.

## 2026-06-04 Next Evaluation Pass
- [x] Run current-main `perf:gate` from a clean worktree and record whether progressive recovery still passes outside the implementation branch.
- [x] Run `bench:editor-performance` with an explicit localhost `/app/` URL and isolated output path.
- [x] Collect targeted visual smoke evidence for TNO/HOI4 startup, chunk promotion, and idle-ready states using the benchmark screenshot outputs first.
- [x] Review remaining hot-path evidence for `scenarioChunkPromotionVisualStage`, `buildHitCanvas`, and deferred full-cache idle completion before choosing the next code change.
- [x] Fix the user-visible HOI4 coarse-detail health toast found during visual evidence review.
- [x] Keep MapLibre/deck.gl/worker raster as a spike boundary unless current 2D evidence shows the remaining bottleneck is still dominated by main-thread drawing after progressive recovery.
- [x] Run Stage 3 TNO/HOI4 paired water A/B through explicit benchmark context probe settings.
- [x] Record Stage 4 architecture spike conclusion and next implementation lane.
- [x] Implement chunk-internal visible political subset for primary promotion using existing `feature_bounds`.
- [x] Preserve full political chunk payloads while using viewport-clipped primary payloads during recovery.
- [x] Add contract coverage for visible subset counts and primary clipped promotion.
- [ ] Verify real TNO/HOI4 samples show `promotedVisibleFeatureCount < promotedTotalFeatureCount`.
- [ ] Choose the next lane from post-subset evidence: deferred full restore, hit canvas, or startup non-render long tail.

## 2026-06-05 Correctness Repair Plan
- [x] Verify the audit report against the current `codex/render-chain-next-eval` worktree and separate current evidence from stale report numbers.
- [x] Record the correction plan and execution boundary in active docs and `.omx` planning artifacts.
- [x] Rewrite tests so complete runtime political ownership is the contract for coarse chunks, render land collections, ready checks, and data-health counts.
- [x] Fix the generator so political coarse chunks use complete runtime political data whenever runtime political features exist.
- [x] Fix render ownership so `landDataFull` and `landData` are composed from complete promoted political chunk data.
- [x] Fix initial visual ready checks so clipped visible political data cannot satisfy readiness alone.
- [x] Regenerate HOI4/TNO scenario chunk assets and verify political coarse counts match runtime topology counts.
- [x] Sync source changes into `dist/app` and verify packaged output.
- [x] Run full planned verification gates and final review.

## 2026-06-05 Direction Decision
The previous "visible subset primary promotion" lane remains useful as a diagnostic and selection-volume experiment, but it no longer owns political fill correctness. The product contract is complete political ownership first; performance work must preserve that contract.

## 2026-06-05 Correctness Repair Verification
- Source/dist sync passed through `npm run verify:pages-dist` with 19 packaged-output checks and total dist size `1042.57 MiB`.
- Full verification passed: Python scenario chunk/startup tests `31/31`, Node scenario chunk contracts `43/43`, Node lifecycle runtime behavior `9/9`, strict TNO scenario contracts, dist JS syntax checks, `git diff --check`, and `npm run perf:gate`.
- Perf gate passed against `docs\perf\baseline_2026-04-20.json` after the final review fix. Latest medians: TNO `totalStartupMs=5455.3ms`; HOI4 `totalStartupMs=5853.1ms`, below the `5986.6ms` gate.
- Deferred infra duplicate political restore is gone in the latest six benchmark runs: `restoredFullPoliticalChunkData=false`, `fullPoliticalRestoreMs=0`, and `primaryDerivedStateReady=true`.
- Review fix completed: `preloadScenarioCoarseChunks()` now uses full-world bounds for startup coarse prewarm, while later active refreshes keep current-viewport selection.

## Live Process Ownership
Main agent owns all builds, browser benchmarks, perf gates, and long tests for this task. Subagents may inspect files and propose tests, but they must not run or monitor live processes.

## 2026-06-04 Next Evaluation Live Process Ownership
Main agent owns `perf:gate`, `bench:editor-performance`, any dev server created by those commands, and all log polling. Other agents may only inspect files or finished artifacts.
