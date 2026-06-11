# Render Chain Improvement Task

## Archive Status
- This task record is complete and archived.
- The last implementation batch merged to `main`, pushed to `origin/main`, and removed its isolated worktree on 2026-06-11.

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

## 2026-06-04 Next Evaluation Checklist
- [x] Clean worktree created from local `main` merge commit.
- [x] `perf:gate` current-main evidence recorded.
- [x] `bench:editor-performance` explicit URL evidence recorded.
- [x] Screenshot paths and black-frame / hit-test evidence reviewed.
- [x] HOI4 chunked coarse visibility toast defect fixed and smoke-verified.
- [x] Next optimization target chosen from fresh evidence.
- [x] Stage 1 hit canvas point-probe path implemented for dirty hit canvas interactions.
- [x] Stage 1 hit canvas viewport profile metrics added.
- [x] Stage 2 chunk promotion primary/deferred metrics added.
- [x] Stage 2 promotion visible/total feature counts added.
- [x] Stage 1/2 broader perf validation completed with remaining HOI4 `totalStartupMs` failure.
- [x] Stage 3 water A/B paired probe completed for both TNO and HOI4.
- [x] Stage 4 architecture spike evidence completed.
- [x] Final review pass completed.
- [x] Review fix: benchmark context probe scenario ids are validated instead of silently skipped on typo.
- [x] Review fix: hit-canvas pixel reads use a finite positive dpr in both full-canvas reads and dirty point probes.
- [x] Implement chunk-internal visible feature subset counts and signatures from existing `feature_bounds`.
- [x] Apply viewport-clipped political payload only to primary recovery while retaining the full chunk payload.
- [x] Defer full political chunk restoration to the chunk promotion infra stage and record `fullPoliticalRestoreMs`.
- [x] Add behavior coverage for viewport-clipped primary political promotion.

## 2026-06-04 Next Evaluation Results
- Progressive recovery remains the right baseline: startup render samples no longer build the near-12k full political Path2D cache in progressive mode.
- HOI4 still fails `totalStartupMs` in `perf:gate`, mainly because startup long-tail and `scenarioAppliedMs` vary across samples. HOI4 render sample median now stays below the old failing shape.
- Remaining measured costs are concentrated in `scenarioChunkPromotionVisualStage` and `buildHitCanvas`, with full visible item counts still around 12k after promotion.
- TNO benchmark correctly flags the single-fill probe invalid when no last action is recorded; double-click remains valid and black-frame counts are zero.
- HOI4 visual smoke found and fixed an expected-progressive-stage toast that made coarse detail loading look like an error.
- Stage 1/2 implementation is retained as a correctness and observability improvement, but it does not yet reduce startup work enough because the required political chunk still contains the near-full feature set.
- Stage 3 is complete for the current lane: benchmark context probes can now target HOI4 and TNO with only `baseline,water_off`; the paired run produced 5 samples per scenario.
- Water behavior decision: keep the current default. TNO improved by about `235ms` p50 in `contextScenarioDurationDeltaMs`, while HOI4 was essentially flat at about `0.4ms` p50, and both recommendations stayed `delta-signal-insufficient`.
- Stage 4 evidence supports staying on 2D Canvas for the next production step. Multi-layer canvas, OffscreenCanvas worker, MapLibre, and deck.gl remain useful spikes, but the first local architecture proof should reduce selected feature volume inside the current chunk promotion path.
- Final review found two concrete correctness risks and fixed both: silent context-probe scenario typos and invalid dpr handling in hit-canvas reads. Independent native review was unavailable because the session had reached the agent thread limit.

## 2026-06-05 Correctness Repair Checklist
- [x] Independently verify the audit report against current source and data.
- [x] Mark the previous visible-primary ownership direction as superseded for political fill ownership.
- [x] Update Python generator tests for complete runtime political coarse ownership.
- [x] Update Node contracts for full land data ownership, complete coarse prewarm, ready gate, and health-count behavior.
- [x] Fix `tools/scenario_chunk_assets.py`, `js/core/map_renderer.js`, and `js/core/scenario/chunk_runtime.js`.
- [x] Rebuild `data/scenarios/hoi4_1939` chunk assets.
- [x] Rebuild `data/scenarios/tno_1962` chunk assets.
- [x] Verify count probe: HOI4 `22502/22502`, TNO `12019/12019`.
- [x] Sync `dist/app` output and run packaged verification.
- [x] Run final verification gates and review.

## 2026-06-05 Correctness Repair Results
- Complete political coarse ownership verified after regeneration: HOI4 `22502/22502`, TNO `12019/12019`; `feature_bounds` lengths matched payload feature counts.
- Packaged output verified with `npm run verify:pages-dist`; source and `dist/app` JS syntax checks passed.
- Targeted tests passed: Python scenario chunk/startup tests `31/31`, Node scenario chunk contracts `43/43`, Node lifecycle runtime behavior `9/9`, strict TNO scenario contracts, and `git diff --check`.
- Review fix completed: startup coarse prewarm now selects full-world bounds instead of the current viewport, so the complete political coarse prewarm contract matches implementation.
- Performance gate passed after the review fix and after skipping duplicate deferred full political restore when `primaryDerivedStateReady` is already true. Latest median totals: TNO `5455.3ms`, HOI4 `5853.1ms`; all six benchmark runs reported `restoredFullPoliticalChunkData=false` and `fullPoliticalRestoreMs=0`.

## 2026-06-05 Hit Canvas/Yield Checklist
- [x] Create isolated worktree and keep unrelated `.omx/metrics.json` out of scope.
- [x] Read existing lessons and reuse current render-chain active docs.
- [x] Update deferred UI `yieldToMain()` to prefer `scheduler.yield()`.
- [x] Defer startup full hit canvas construction and record a `deferred-full` metric reason.
- [x] Defer staged hit-canvas warmup full construction and record `staged-hit-canvas-warmup`.
- [x] Keep dirty point-probe and forced strict-validation paths available.
- [x] Extend existing scenario chunk contract tests for scheduler yield and hit canvas metric modes.
- [x] Run `npm run test:node:scenario-chunk-contracts`: `43/43` passed.
- [x] Sync `dist/app`.
- [x] Run perf/report contracts: `28/28` passed.
- [x] Run `npm run verify:pages-dist`: packaged tests `22/22` passed.
- [x] Run `npm run perf:gate`: passed with zero failures.
- [x] Run final static checks and review.
- [x] Merge, push, and clean worktree.

## 2026-06-05 Hit Canvas/Yield Current Result
- Startup and staged recovery now mark full hit canvas work as delayed instead of building it synchronously.
- `buildHitCanvas` metrics can now distinguish `deferred-full`, idle `deferred`, strict `forced`, and point-probe behavior through `hitCanvasViewportProfile`.
- Latest gate passed. TNO p50: `totalStartupMs=5407.2ms`, `scenarioChunkPromotionVisualStageMs=578.4ms`, `buildHitCanvasMs=197.7ms`. HOI4 p50: `totalStartupMs=5985.0ms`, `scenarioChunkPromotionVisualStageMs=636.4ms`, `buildHitCanvasMs=205.1ms`.
- Remaining performance lane: full hit canvas still appears as idle deferred work, so the next improvement should target LOD/data-volume reduction or a dedicated hit-canvas segmentation spike.

## 2026-06-05 Political LOD Spike Checklist
- [x] Create isolated worktree from pushed `main`.
- [x] Read Ralph, Ultrawork, lessons learned, and current render-chain active docs.
- [x] Dispatch read-only subagents for implementation touchpoints and test coverage.
- [x] Write Ralph context snapshot and PRD/test-spec artifacts.
- [x] Implement build-time political coarse LOD diagnostics and simplification.
- [x] Extend existing scenario chunk asset tests.
- [x] Run targeted Python tests and syntax checks.
- [x] Run architect verification.
- [x] Run deslop pass and regression re-verification.
- [x] Commit, push, merge back to `main`, and clean worktree.

## 2026-06-05 Political LOD Spike Current Result
- Direction is constrained to `tools/scenario_chunk_assets.py` and `tests/test_scenario_chunk_assets.py`.
- Runtime JavaScript and checked-in scenario data remain out of scope unless the implementation evidence forces a narrower correction.
- Architect verification approved the coarse-only scope and additive manifest field.
- Post-deslop checks passed: `tests.test_scenario_chunk_assets` `14/14`, Python py_compile, `git diff --check`, Node scenario chunk contracts `43/43`, and perf/report Python contracts `28/28`.

## 2026-06-05 Political LOD Review Fix Checklist
- [x] Create isolated review/fix worktree from `origin/main`.
- [x] Run independent code-review and architecture review lanes.
- [x] Fix `feature_bounds` and `feature_count` to use final optimized payload features.
- [x] Guard political coarse simplification to polygonal output types.
- [x] Expand `lod_diagnostics` for next-stage regeneration analysis.
- [x] Add regression assertions for payload-derived feature bounds and diagnostics fields.
- [x] Re-run targeted Python, Node, perf/report, py_compile, and diff checks.

## 2026-06-06 LOD Acceptance Checklist
- [x] Start isolated acceptance worktree from `origin/main`.
- [x] Record Autopilot context, PRD, and test spec.
- [x] Add named real-data political coarse validator for TNO/HOI4.
- [x] Regenerate TNO and HOI4 scenario chunk assets.
- [x] Run scenario contracts, Pages dist verification, and perf gate.
- [x] Fix Pages dist manifest LF-size drift found during review.
- [x] Fix UltraQA TNO political path-cost budget blocker.
- [x] Complete code review and UltraQA gates.

## 2026-06-11 Progressive Full Cache Ready Render Recovery Checklist
- [x] Create isolated worktree from `origin/main`.
- [x] Confirm current progressive deferred full cache completion invalidates the political pass without scheduling the repaint.
- [x] Record this batch's boundaries, acceptance criteria, and live process ownership in active docs.
- [x] Add the post-cache-ready render request.
- [x] Extend existing scenario chunk contracts for the regression.
- [x] Run syntax and targeted contract verification.
- [x] Run packaged-output verification and performance gate if the source/dist contract requires it.
- [x] Run independent static review, fix concrete findings, and record the final evidence.
- [x] Merge to `main`, push, and clean the worktree.

## 2026-06-11 Current Result
- Progressive full cache completion now schedules a non-flush repaint with reason `progressive-political-full-cache-ready` after recovery is settled.
- The deferred full-cache worker waits for the interaction recovery quiet window before doing slice work or publishing the full cache. This prevents HOI4 startup recovery from paying the idle fine-cache cost.
- Tests and gates passed from this worktree: `node --check` for changed source/dist/test JS, `npm run test:node:scenario-chunk-contracts` `43/43`, `npm run verify:pages-dist` packaged `34/34` plus landing `6/6`, `npm run test:e2e:dev:scenario-chunk-runtime` `6/6`, `npm run perf:gate`, and `git diff --check`.
- Independent static review found and fixed one P2 test coverage gap: the contract now requires the recovery quiet-window guard before full-cache Path2D slice construction. Post-fix `npm run test:node:scenario-chunk-contracts` passed `43/43`.
- Closeout: implementation commit `ca1dc9c0` was fast-forward merged to `main`, pushed to `origin/main`, and the isolated worktree was removed. No task steps remain for this batch.
