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
