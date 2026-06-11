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

### Review Fix Follow-Up
Before regenerating checked-in scenario data, ensure every manifest field that describes geometry is derived from the final written payload. The first concrete fix is political coarse `feature_bounds`, which now follows optimized payload bounds instead of source feature bounds.

### Acceptance Run Follow-Up
The next execution lane must create a named real-data validator for TNO/HOI4 `political.coarse` chunks, regenerate both scenario chunk sets, run scenario/Pages/perf gates, and treat fresh `npm run perf:gate` success as a landing requirement.

### Acceptance Evidence
TNO and HOI4 scenario chunks were regenerated with political coarse LOD diagnostics. Fresh gates passed through chunk tests, scenario contracts, Pages dist, perf/report contracts, and `npm run perf:gate`. The regenerated coarse chunks cut TNO coarse bytes from `26.96MB` to `11.44MB` and HOI4 coarse bytes from `34.23MB` to `14.38MB`.

Review caught one build-output contract issue during acceptance: root Pages dist text files were copied with CRLF working-tree bytes while `.gitattributes` publishes them as LF. The builder now normalizes root `dist/index.html`, `dist/app.js`, and `dist/styles.css` before writing `dist/pages-dist-manifest.json`; static recompute now matches the manifest total `1109157488`, and all four tracked Pages files report `w/lf`.

UltraQA caught one data-contract issue during acceptance: TNO's top-level political path-cost budget still used the old `520000` value while the regenerated coarse chunk cost is `678774`. The budget hint is now `680000`, the generator default matches it, and the checked-in validator covers this relationship. Final perf gate passed after clearing a stale local `tools/dev_server.py` process on port `8000`.

## 2026-06-11 Progressive Full Cache Ready Render Recovery Plan

### Intent
Fix the progressive political recovery completion path so the idle-built full fine political background cache is actually painted after it becomes ready. The current code invalidates the political pass with `progressive-political-full-cache-ready`, but it does not request the next render in the same completion path.

### Boundaries
- Keep HGO, transport, appearance, worker raster, and renderer migration out of scope.
- Keep the existing default progressive recovery mode and exact recovery override.
- Reuse the current render scheduling helper instead of introducing a new render loop or fallback layer.
- Extend existing scenario chunk contracts; add a new test file only if existing coverage cannot express the regression.

### Checklist
- [x] Create isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-render-chain-progressive-recovery` on `codex/render-chain-progressive-recovery`.
- [x] Verify current source still has the gap: `runScenarioPoliticalBackgroundDeferredFullCacheSlice()` records completion and invalidates the political pass without a matching render request.
- [x] Reuse `docs/active/render-chain-improvement` as the task record.
- [x] Add a post-cache-ready render request through `requestRendererRender("progressive-political-full-cache-ready", ...)`.
- [x] Add focused regression coverage to the existing scenario chunk contract test.
- [x] Run syntax, node contract, packaged dist, perf, and diff verification as applicable.
- [x] Run independent static review and fix concrete findings.
- [x] Merge back to `main`, push, and remove the isolated worktree.

### Acceptance Criteria
- Deferred full cache completion records the existing completion metric, invalidates the political pass, and schedules a render with the same reason.
- The render request uses existing renderer scheduling semantics and keeps the context render fallback for environments where queued rendering is unavailable.
- Existing exact-after-settle recovery behavior remains covered and green.
- Source and packaged output stay synchronized through the repository's existing verification gate.

### Live Process Ownership
Main agent owns all tests, builds, perf gates, browser/dev-server commands, and log polling for this 2026-06-11 batch. Other agents may inspect files and completed logs only.

### Verification Evidence
- `node --check` passed for `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, `tests/scenario_chunk_contracts.test.mjs`, and `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`.
- `npm run test:node:scenario-chunk-contracts` passed `43/43`.
- `npm run verify:pages-dist` passed packaged shell unittest `34/34` and landing showcase tests `6/6`; generated dist size `1092.09 MiB`.
- `npm run test:e2e:dev:scenario-chunk-runtime` passed `6/6`.
- `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json`.
- `git diff --check` passed with line-ending warnings only.
- Independent static review found one P2 coverage gap: the contract test did not require the recovery quiet-window guard to run before Path2D slice construction. The contract now asserts `!isInteractionRecoverySettled({ quietMs: 600 })` appears before `const startedAt = nowMs()` and `getPoliticalFeaturePathEntry(... allowBuild: true ...)`; `npm run test:node:scenario-chunk-contracts` passed `43/43` after the fix.
- Closeout: implementation commit `ca1dc9c0` was fast-forward merged to `main`, pushed to `origin/main`, and the isolated worktree was removed.

### Review Fix Evidence
- Follow-up review found no BLOCK issue. Architect status was `WATCH` until repaint diagnostics were hardened.
- Fixed observability and stale-state cleanup: ready full-cache state now records deferred repaint requeue from the top guard, clears already-published pending state before recovery gating, and records `scenarioPoliticalBackgroundDeferredFullCacheReadyRepaintRequest.repaintRequested`.
- Contract coverage now locks the ready-deferred metric helper, guard-before-build order, post-loop quiet-window requeue path, and repaint request diagnostic field.
- Review-fix verification before rebasing onto local `main` passed: `npm run test:node:scenario-chunk-contracts` `43/43`, `npm run verify:pages-dist` packaged `34/34` plus landing `6/6`, `npm run test:e2e:dev:scenario-chunk-runtime` `6/6`, and `npm run perf:gate`.
- Final branch base is `origin/main` commit `54de2faf`.
- Final-base verification passed for syntax, scenario chunk contracts `43/43`, Pages dist packaged `34/34` plus landing `6/6`, and scenario runtime e2e `6/6`.
- Remaining landing blocker: post-rebase `npm run perf:gate` failed three times on broad startup timing. Latest failure before the final-base rebase: TNO `totalStartupMs=7791.6ms` against limit `6676.1ms`; HOI4 `totalStartupMs=7766.1ms` against limit `5986.6ms`.
