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

## 2026-06-05 Hit Canvas/Yield Low-Risk Plan
- [x] Keep implementation in isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-render-hit-yield` on `codex/render-hit-yield`; main checkout keeps unrelated `.omx/metrics.json` out of the change.
- [x] Prefer `scheduler.yield()` for deferred UI bootstrap yields, with `setTimeout(0)` as the compatibility path.
- [x] Remove startup/recovery synchronous full hit canvas builds from `buildHitCanvasAfterStartup()` and staged hit-canvas warmup.
- [x] Record explicit hit canvas metric reasons for deferred full, deferred idle, forced full, and point-probe paths.
- [x] Extend existing scenario chunk contracts instead of adding a new test harness.
- [x] Sync `dist/app` after source edits and run packaged verification.
- [x] Run final verification gates: scenario chunk contracts, perf/report contracts, `verify:pages-dist`, `perf:gate`, syntax/diff checks.
- [ ] Merge back to `main`, push, and clean the isolated worktree after verification.

LOD and renderer migration remain outside this implementation pass. The next production optimization candidate is a build-time political LOD spike that preserves feature ownership and adds only optional manifest diagnostics.

## 2026-06-05 Hit Canvas/Yield Verification
- Source/dist sync passed through `npm run verify:pages-dist`; packaged shell tests passed `22/22`, total dist size `1090.63 MiB`.
- Contract verification passed: `npm run test:node:scenario-chunk-contracts` `43/43`; perf/report boundary tests `28/28`.
- Syntax and whitespace checks passed: `node --check` for changed source/dist JS and `tests/scenario_chunk_contracts.test.mjs`; `git diff --check` passed with line-ending warnings only.
- `npm run perf:gate` passed with zero contract mismatches and zero failures. TNO p50: `totalStartupMs=5407.2ms`, `scenarioChunkPromotionVisualStageMs=578.4ms`, `buildHitCanvasMs=197.7ms`. HOI4 p50: `totalStartupMs=5985.0ms`, `scenarioChunkPromotionVisualStageMs=636.4ms`, `buildHitCanvasMs=205.1ms`.
- Important metric reading: `buildHitCanvasMs` still appears during idle deferred construction. The completed change removes forced startup/recovery construction and adds mode/reason diagnostics; it does not claim that full hit canvas work has been eliminated.

## Live Process Ownership
Main agent owns all builds, browser benchmarks, perf gates, and long tests for this task. Subagents may inspect files and propose tests, but they must not run or monitor live processes.

## 2026-06-04 Next Evaluation Live Process Ownership
Main agent owns `perf:gate`, `bench:editor-performance`, any dev server created by those commands, and all log polling. Other agents may only inspect files or finished artifacts.
## 2026-06-05 Political LOD Spike Plan

### Intent
Reduce political coarse chunk geometry cost at build time while preserving complete political ownership and runtime compatibility.

### Implementation Steps
1. Add a topology-preserving Shapely simplification helper for political coarse payloads in `tools/scenario_chunk_assets.py`.
2. Apply simplification only inside the existing `layer_key == "political" and lod == "coarse"` builder path.
3. Add optional manifest diagnostics for source vs optimized coordinate/path counts.
4. Extend existing scenario chunk asset tests with a redundant polygon fixture that proves coordinate reduction and feature preservation.
5. Run targeted verification, then architect review, deslop, and regression re-verification.

### Boundaries
- Keep detail political chunks exact.
- Keep political ids and existing coarse property whitelist.
- Keep front-end runtime untouched for this spike.
- Defer scenario data regeneration and perf-gate comparison to a later measured lane.
