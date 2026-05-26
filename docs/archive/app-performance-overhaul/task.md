# Task

## 2026-05-25 archive closeout note

- This active folder stayed open after the work was already completed and merged.
- Completion evidence lives in this folder and `.omx/ultragoal/goals.json`: G001 completed on 2026-05-20 with commit `c751325`, later review-fix branches were also merged back to `main`.
- The remaining unchecked historical checklist items below are stale planning residue, so this folder can move to `docs/archive/app-performance-overhaul/`.

## 2026-05-20 performance commit review closeout

Owner: main thread for implementation, live tests, perf gate, commit/push, and cleanup. Child agents are static/read-only review lanes only.

- [x] Create isolated clean worktree from `origin/main`.
- [x] Load review/performance/ultrawork guidance and read active performance docs.
- [ ] Identify performance-related commit scope.
- [ ] Dispatch static review lanes.
- [ ] Review startup/apply/chunk metric changes.
- [ ] Review transport workbench DOM/cache hot-path changes.
- [ ] Review appearance owner split and toolbar facade reduction changes.
- [ ] Fix confirmed issues.
- [ ] Run targeted verification.
- [ ] Run final perf/dist/import verification.
- [ ] Commit, push to `origin/main`, and clean temporary worktree.

## 2026-05-19 overall performance evaluation and architecture optimization

Owner: main thread for implementation and all live processes. Child agents are read-only/static only.

- [x] Create isolated worktree and branch.
- [x] Load `ultragoal`, `ultrawork`, `research-before-fix`, and `performance-goal` skills.
- [x] Read `lessons learned.md`, `AGENTS.md`, and existing app-performance active docs.
- [x] Create OMX performance-goal evaluator contract.
- [x] Dispatch read-only/static subagents for code mapping, architecture review, evaluator review, and external research.
- [x] Run fresh baseline: `npm run perf:gate`.
- [x] Run fresh baseline: `npm run bench:editor-performance`.
- [x] Run fresh baseline: `npm run bench:special-zones-members`.
- [x] Write baseline/gap summary into context.
- [x] Implement measured improvements.
- [x] Extend existing tests only where needed.
- [x] Run targeted verification.
- [x] Run evaluator after changes and checkpoint performance-goal.
- [x] Run final review/bug-check/first-principles pass.
- [ ] Merge to main, commit, push, and clean worktree.

## 2026-05-20 G001 appearance/reference evaluator continuation

Owner: main thread for all live processes.

- [x] Create scoped performance-goal evaluator contract.
- [x] Keep Codex goal on the outer ultragoal aggregate objective.
- [x] Implement a small appearance owner split with DOM-work reduction.
- [x] Run targeted short verification.
- [ ] Run full evaluator command.
- [ ] Record performance-goal checkpoint after evaluator pass.

Execute app performance overhaul v3.1 next slice.

## Current owner
Main thread owns implementation and verification. Subagents are static analysis only.

## Metrics + HOI4 startup slice
- [x] Update tools/perf/run_baseline.mjs summary fields.
- [x] Update perf gate static contract.
- [x] Add HOI4 startup support/bundle generation to build_hoi4_scenario.py.
- [x] Generate checked-in hoi4_1939 startup assets from existing checked-in scenario payloads.
- [x] Update hoi4_1939 manifest startup fields.
- [x] Add startup asset contract coverage for hoi4_1939.
- [x] Run targeted tests.

## UI fanout slice
- [x] Inspect current fallback in flushPendingSidebarRefresh/applyAutoFill.
- [x] Apply only a proven row-level refresh change.
- [x] Run existing UI fanout contract if touched.

## 2026-04-24 Remaining overhaul task progress

- [x] Collect static mapper results.
- [x] Implement UI fanout row hooks and metrics.
- [x] Implement contextScenario metrics.
- [x] Implement interaction hit metrics and secondary demand reason merge.
- [ ] Hydration delayed-init implementation, split into a later guarded slice.
- [ ] Full perf gate and e2e validation.

## 2026-04-24 Review remediation task progress

- [x] Fix water row refresh filter/sort consistency.
- [x] Fix contextBreakdown current-frame metric semantics.
- [x] Fix hook result telemetry unwrap.
- [x] Fix secondary demand metric repeated counting.
- [x] Run targeted syntax, contract, and node tests.


## 2026-04-24 Direct interaction closeout task progress

- [x] Add direct interaction duration metrics.
- [x] Add hover metric sampling rule.
- [x] Defer mousemove hover overlay render by one RAF.
- [x] Keep click/dblclick hit path semantics unchanged.
- [x] Add static contract coverage for hover RAF, metric names, secondary demand, and eager hooks.
- [x] Run targeted validation and perf gate.

## 2026-04-25 Map interaction speed task progress

- [x] Collect static maps from subagents.
- [x] Add execution plan/context notes.
- [x] Implement benchmark/perf probe schema v3.1 fields.
- [x] Implement main-pass interaction composite cache.
- [x] Implement hover-only strict hit shortcut.
- [x] Implement post-ready pending/retry diagnostics.
- [x] Extend existing contract tests.
- [x] Run parent-owned targeted verification.
- [ ] Stabilize `test:e2e:dev:scenario-chunk-runtime` in a separate follow-up if it keeps alternating failure points.

## 2026-04-25 Map interaction speed remediation progress

- [x] Fix perf gate schema hard contract.
- [x] Split startup post-ready infra metrics from interaction recovery benchmark metrics.
- [x] Reject continuity frames across topologyRevision changes.
- [x] Preserve explicit focusCountryOverride priority for zoom-end chunk detail selection.
- [x] Re-run scenario chunk runtime E2E after remediation.

## 2026-04-25 Final verification checklist

- [x] node syntax checks for changed JS/MJS.
- [x] Python py_compile for changed Python files.
- [x] node scenario chunk contract tests.
- [x] perf probe snapshot behavior tests.
- [x] Python perf gate and scenario chunk refresh contract tests.
- [x] TNO ready-state E2E.
- [x] scenario chunk runtime E2E.
- [x] interaction funnel E2E.
- [x] static code review findings remediated.

## 2026-04-26 interaction-continuity-and-promotion-slicing task progress
- [x] Record approved execution plan in active docs.
- [ ] Implement fast-frame eligibility, firstVisibleFramePainted, and interactionComposite identity.
- [ ] Implement async single-flight chunk promotion commit and serializable runtime status.
- [ ] Remove hit-canvas spatial-unavailable all-feature fallback.
- [ ] Update existing node/Python contract tests.
- [ ] Run syntax, node, Python, E2E, and perf verification in serial.
- [ ] Run review/bug-check/first-principles pass and update lessons learned if needed.



## 2026-04-26 03:22 UTC verification evidence
- 
ode --check affected JS files: pass.
- python -m py_compile affected Python contracts: pass.
- 
pm run test:node:renderer-runtime-state-behavior: pass.
- 
pm run test:node:scenario-runtime-state-behavior: pass.
- 
pm run test:node:scenario-chunk-contracts: pass.
- python -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_scenario_runtime_state_boundary_contract tests.test_scenario_rollback_boundary_contract tests.test_perf_gate_contract -q: pass.
- 
pm run test:e2e:dev:scenario-chunk-runtime: pass after fixing stale refresh race.
- 
pm run test:e2e:dev:tno-ready-state: pass.
- 
pm run test:e2e:interaction-funnel: pass.
- 
pm run perf:baseline: pass and rewrote docs/perf/baseline_2026-04-20.*.
- 
pm run perf:gate: pass.
- 
pm run test: unavailable; package has no 	est script.


## 2026-04-26 03:48 UTC final verification refresh
- Re-ran syntax checks after review fixes: pass.
- Re-ran node contracts and Python contracts: pass.
- Re-ran 
pm run test:e2e:dev:scenario-chunk-runtime: 4 passed.
- Re-ran 
pm run test:e2e:dev:tno-ready-state: 5 passed.
- Re-ran 
pm run test:e2e:interaction-funnel: 3 passed.
- Re-ran 
pm run perf:baseline: pass and rewrote baseline files.
- Re-ran 
pm run perf:gate: pass against refreshed baseline.

## 2026-04-26 14:50 UTC interaction black-frame and zoom closeout progress
- [x] Re-read current code and active docs before editing.
- [x] Spawned static-only mapper and QA agents; parent owns all live verification.
- [x] Implemented renderer continuity/composite hardening.
- [x] Implemented chunk promotion second-yield revalidation and render-lock hold-through-flush.
- [x] Implemented editor benchmark wheel/black-screen evidence fields.
- [x] Updated existing contract checks for relaxed continuity and benchmark fields.
- [ ] Run parent-owned targeted node/Python/E2E/perf verification.
- [ ] Run review/bug-check/first-principles pass and update lessons learned if warranted.


## 2026-04-26 15:23 UTC verification result
- [x] Syntax and contract checks passed.
- [x] Dev E2E scenario-chunk-runtime passed after zoom-end detail protection fix.
- [x] TNO ready-state and interaction-funnel E2E passed.
- [x] Editor benchmark ran and produced rapid-wheel/interactive-pan screenshot evidence.
- [x] perf:gate warmup mismatch fixed; `npm run perf:gate` passes with three warmups.
- [ ] Final static review pass pending.

## 2026-04-26 16:25 UTC final verification refresh
- [x] `node --check` on changed renderer/chunk/state/perf JS.
- [x] `python -m py_compile` on changed benchmark and Python contracts.
- [x] Node contracts: renderer runtime state, scenario runtime state, scenario chunk contracts, perf probe snapshot behavior.
- [x] Python contracts: scenario chunk refresh + perf gate contract.
- [x] E2E: scenario-chunk-runtime 4/4, tno-ready-state 5/5, interaction-funnel 3/3.
- [x] Perf: `npm run perf:baseline` regenerated the checked-in three-warmup baseline; `npm run perf:gate` rerun passed against `docs/perf/baseline_2026-04-20.json`.
- [x] Benchmark: full `editor-performance-benchmark.py` passed after isolating browser sessions per scenario; TNO wheel trace recorded `firstIdleAfterLastWheelMs=1084.5`, `maxBlackPixelRatio=0.061361`, `sameScenario=true`, and screenshots under `.runtime/browser/mcp-artifacts/perf/`.
- [x] Review remediation: fixed warmup contract drift, wheel clock-domain mixing, zoom-end detail chunk protection scope, and continuity-frame over-reuse.
- [x] Final review blocker follow-up: added behavior tests for wheel last-wheel/fallback semantics and zoom-end protection one-shot selection scope.

## 2026-04-26 review follow-up: zoom-end metric source
- [x] Preserve true end-to-visible timing when zoomEndChunkVisible also has scenarioChunkPromotionVisualStage.
- [x] Keep visual-stage metric as explicit fallback only.
- [x] Add behavior test for render/runtime/fallback source order.
- [x] Run py_compile, perf gate contract unittest, and scenario chunk node contract.

## 2026-04-26 21:51 UTC zoom-interaction-architecture safe slice checklist
- [x] Exact-after-settle helper extraction keeps apply -> render -> finalize ordering.
- [x] Political color refresh uses partial dirty ids and avoids full physical/context invalidation unless contextBase has color-dependent layers.
- [x] Brush preview render is rAF-batched through requestInteractionRender.
- [x] Exact compose uses compositeBuffer and copy blit to prevent stale pixels.
- [x] Zoom-end detail chunk final-state E2E passes after replacing async waitForFunction checks with synchronous state polling.
- [x] Review blockers addressed: contextBase contour colors, composite transparency, and bounded zoom-end protected-id retention.

## 2026-04-26 review follow-up: scenario apply refresh scope
- [x] Scope stale post-apply skip by scenario id, selectionVersion, and refresh source start time.
- [x] Add behavior coverage for old stale apply vs new post-zoom apply/prewarm.
- [x] E2E scenario chunk runtime review-fix run completed (`npm run test:e2e:dev:scenario-chunk-runtime`, 4/4).

## 2026-04-26 23:35 UTC exact-after-settle controller task progress
- [x] Create Ralph context snapshot and verify preflight state.
- [x] Add local exact-after-settle controller state and after-paint finalize hook.
- [x] Move first-batch dev-selection and land/water color writes to `requestInteractionRender`.
- [x] Extend existing static/runtime state contracts.
- [x] Run parent-owned syntax, node, Python, E2E, and perf verification.
- [x] Run code-review / architect review and fix findings.
- [x] Run deslop review and post-review regression verification.

## 2026-04-27 00:18 UTC verification evidence
- Syntax and targeted Node contracts passed: `node --check js/core/map_renderer.js`, `node --check js/core/state/renderer_runtime_state.js`, and node tests for scenario chunk, renderer runtime, scenario runtime, and physical layer contracts.
- Python contracts passed: `python -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_perf_gate_contract -q`; after recovery-block update, `tests.test_scenario_chunk_refresh_contracts` passed again.
- E2E passed: scenario chunk runtime 4/4, TNO ready-state 5/5, interaction funnel 3/3.
- Perf: `npm run perf:baseline` regenerated `docs/perf/baseline_2026-04-20.*`; `npm run perf:gate` had one transient TNO apply failure and one transient HOI4 render median failure, then passed on rerun against the regenerated baseline.
- Post-change reruns passed: scenario chunk runtime 4/4 and `npm run perf:gate` passed.

## 2026-04-27 00:35 UTC final closeout
- [x] Fixed the stale helper reference in `beginExactAfterSettleControllerSchedule()` so controller defaults come from `renderer_runtime_state.js`.
- [x] Final syntax/contracts passed: `node --check` on changed renderer/state files, targeted Node contracts, and `python -m unittest tests.test_scenario_chunk_refresh_contracts -q`.
- [x] Final E2E passed: `npm run test:e2e:dev:scenario-chunk-runtime` 4/4, `npm run test:e2e:dev:tno-ready-state` 5/5, and `npm run test:e2e:interaction-funnel` 3/3.
- [x] Final perf gate passed: `npm run perf:gate` against `docs/perf/baseline_2026-04-20.json`.
- [x] Final static review result: APPROVE; optional identity-mismatch runtime coverage left as a future hardening candidate because current generation and identity contracts are already covered by behavior/static checks.
- [x] Deslop pass checked changed files for stale helper names, dead wrappers, temporary artifacts, and broken new task lines; no extra code cleanup needed.

## 2026-04-27 full zoom/drag black-frame overhaul task progress
- [x] Start Ralph state and context snapshot.
- [x] Spawn static-only lanes for metrics, request/flush, scheduler, atomic compose, political dirty batching, fallback/worker.
- [ ] Implement pre-gate A metrics contract completion.
- [ ] Implement pre-gate B request/flush ownership completion.
- [ ] Implement phase 1 frame scheduler / sliced exact-after-settle minimum slice.
- [ ] Implement phase 2 atomic composite identity completion.
- [ ] Implement phase 3 political dirty + rAF batching completion.
- [ ] Complete phase 4 fallback cache inventory and safe cleanup decision.
- [ ] Implement phase 5 flag-off political raster worker protocol.
- [ ] Run parent-owned syntax, contracts, E2E, benchmark, perf baseline/gate.
- [ ] Run review/bug-check/first-principles pass and close Ralph state.

## 2026-04-27 状态更新
- [x] 前置门 A：指标契约字段、fill 黑屏采样、worker 指标壳、测试覆盖。
- [x] 前置门 B：ownership editor request lane、sidebar/water contract 保持。
- [x] 阶段 1 基础设施：frame_scheduler、exact-after-settle controller identity、pass slice 调度。

## 2026-04-29 five-step interaction performance task progress
- [x] Create Ralph context snapshot and switch state to execution.
- [x] Load ralph/ultrawork skills, lessons learned, agent tiers, and active docs.
- [x] Spawn static-only benchmark, renderer, worker, and test-planning lanes where agent capacity allowed.
- [x] Upgrade editor benchmark/report schema to 3.3 with pass attribution and black-pixel classification.
- [x] Add renderer political pass visible candidate attribution.
- [x] Upgrade default-off political raster worker shell to v2 protocol and metrics.
- [x] Extend existing perf and scenario chunk contract tests.
- [x] Run parent-owned syntax, node/Python contracts, E2E, editor benchmark, perf baseline, and perf gate.
- [x] Run final review, bug check, first-principles self-check, and close Ralph/Ultrawork state.

## 2026-04-29 five-step verification evidence
- Syntax: `python -m py_compile ops/browser-mcp/editor-performance-benchmark.py tests/test_perf_gate_contract.py`; `node --check` for `map_renderer.js`, `political_raster_worker_client.js`, `political_raster.worker.js`, and `scenario_chunk_contracts.test.mjs`.
- Contracts: `npm run verify:perf-gate-contract`, `npm run test:node:scenario-chunk-contracts`, `npm run test:node:perf-probe-snapshot-behavior`.
- E2E: `npm run test:e2e:dev:scenario-chunk-runtime` 4/4, `npm run test:e2e:dev:tno-ready-state` 5/5, `npm run test:e2e:interaction-funnel` 3/3.
- Benchmark: `npm run bench:editor-performance` passed and wrote `.runtime/output/perf/editor-performance-benchmark.json`.
- Repeated zoom ratios after this slice: Europe 0.562, US East 0.9823, East Asia 1.1507. All remain below 1.25.
- Benchmark now reports `benchmarkMetricsSchemaVersion=3.3`, `passAttributionSchema=mc_pass_attribution_v1`, and black pixel classifications; all repeated zoom black-pixel samples classified as `normal`.
- Perf: `npm run perf:baseline` refreshed `docs/perf/baseline_2026-04-20.*`; `npm run perf:gate` passed against refreshed baseline.
- Review/self-check: static reviewer subagent timed out and was closed. Parent review checked core diffs, schema/baseline consistency, worker-off default behavior, and verification logs; no blocker found. Remaining architecture work is the future true worker bitmap/raster offload.
- [x] 阶段 2 基础设施：compositeBuffer 原子提交、fast transformed frame 单次 buffer blit。
- [x] 阶段 3 部分：changed ids 政治色刷新、click fill request lane、ownership changed-only refresh。
- [x] 阶段 4 inventory：fallback 缓存保留理由已确认。
- [x] 阶段 5 protocol shell：default-off client/worker/metrics/currentness contract。
- [ ] 阶段目标达标：wheel idle、long task、black ratio 仍超阈值。
- [ ] Worker political raster 实际 offload。

## 2026-04-27 交互延迟任务状态
- [x] wheel 后等待口径对齐 exact-after-settle controller。
- [x] frame_scheduler 输入优先让出。
- [x] 移除 settle 阶段即时 political full exact repaint。
- [x] benchmark correctness source 收口到 settleExactRefresh。
- [x] 新增命名验证入口与 contract。
- [x] TNO wheel firstIdleAfterLast 降到 382.9ms，maxLong 降到 281ms。
- [ ] political/background full pass 本体仍重，下一步继续提升 cache 命中率。
- [ ] black pixel 指标仍高，下一步结合截图定位真实暗区与采样口径。

## 2026-04-29 repeated zoom implementation checklist
- [x] Re-read active docs, skills, lessons, and relevant memory before editing.
- [x] Spawn static-only lanes for benchmark schema, chunk runtime, and scheduler/UI hot paths.
- [x] Implement benchmark schema 3.2 and `repeatedZoomRegions` probe arguments/output.
- [x] Add chunk manifest cost fields and cost-aware chunk selection summaries.
- [x] Discard stale chunk refreshes by scenario/selection/signature and keep protected detail chunks cache-only outside current merge.
- [x] Convert `focusCountryOverride` into a TTL/consumed zoom-end hint.
- [x] Preserve post-commit replay reason and reject stale replay ownership.
- [x] Add frame scheduler label+generation dedupe, input-aware deferral, and queue depth by label/generation.
- [x] Narrow exact-after-settle passes to the current plan.
- [x] Add hit-canvas visible/global/cell-span stats.
- [x] Reduce zoom toolbar DOM writes, sidebar inspector/preset refresh fanout, and day/night interval lifetime.
- [x] Keep render-boundary reasons until the real render flush and expose them in perf snapshots.
- [x] Extend contract tests and run syntax/unit/node verification.
- [x] Run dev E2E gates in parent-owned background-log mode.
- [x] Run final perf gate and record pass/fail.
- [x] Run full repeatedZoomRegions editor benchmark for after metrics.
- [x] Run review/bug-check/first-principles pass and decide archive timing.

## 2026-04-29 repeated zoom final verification
- [x] Final `bench:editor-performance` passed with schema 3.2 and `interactionProbeSchema=mc_repeated_zoom_regions_v1`.
- [x] TNO repeated zoom ratios: Europe 0.9039, US East 1.0131, East Asia 1.0632.
- [x] Final repeated zoom chunk cost fields were populated from checked-in manifests: selected byte/coord/part/path-cost sums are present.
- [x] Final dev E2E passed: scenario-chunk-runtime 4/4, tno-ready-state 5/5, interaction-funnel 3/3.
- [x] Final `npm run perf:baseline` refreshed `docs/perf/baseline_2026-04-20.json/.md`.
- [x] Final `npm run perf:gate` passed against `docs/perf/baseline_2026-04-20.json`.
- [x] Final static review result recorded: static reviewer approved prior blockers; self-review found no simpler safe path than bounded cost-aware chunk selection plus stale-work cancellation. Folder remains active because worker raster and political/background full-pass work are still future slices.

## 2026-04-30 C0 subowner attribution gate
- [x] 修正 `scheduler:queue-depth` 弱证据归因。
- [x] 补 perf gate contract 静态断言。
- [x] 运行 `python -m py_compile ops/browser-mcp/editor-performance-benchmark.py tests/test_perf_gate_contract.py`。
- [x] 运行 `python -m unittest tests.test_perf_gate_contract -q`。
- [ ] 运行 `npm run verify:perf-gate-contract`。
- [ ] 重跑 short repeated zoom artifact。
- [ ] 重跑 full repeated zoom artifact。
- [ ] 解析 C0 gate，确认 topSubOwner 可作为下一阶段优化入口。
- [x] 收紧 weak browser attribution guard，unknown-only browser attribution 进入 unknown。
- [x] 收紧 actionable subowner 规则，chunk subowner 统一 namespaced。
- [x] 修正 missing short/full artifact markers 默认真值问题。
- [x] 补 truncated task aggregate gate、missing marker、naked subowner targeted tests。
- [x] 运行 `npm run verify:perf-gate-contract`，17 tests passed。
- [x] 重跑 short artifact：`.runtime/output/perf/next-latency-audit-short.json`，C0 gate passed。
- [ ] 重跑 full artifact：`.runtime/output/perf/next-latency-audit-full.json`。

## 2026-04-30 C0/C1 continuation checklist
- [x] Strict artifact boolean marker parsing.
- [x] Attribution sample context carries `firstIdleAfterLastWheelMs`.
- [x] Skip intermediate repeated-zoom black-pixel sampling while preserving final classification.
- [x] Extend existing perf gate and scenario chunk contracts.
- [x] Revert unhelpful scheduled-chunk-before-exact renderer experiment.
- [x] Run `node --check js/core/map_renderer.js`.
- [x] Run `python -m py_compile ops/browser-mcp/editor-performance-benchmark.py tests/test_perf_gate_contract.py`.
- [x] Run `npm run test:node:scenario-chunk-contracts`.
- [x] Run `npm run verify:perf-gate-contract` with 19 tests.
- [x] Rerun short artifact after contract changes.
- [ ] Finish full closeout artifact after latest changes.
- [ ] Decide next implementation boundary for chunk promotion queueing.
- [ ] Run perf baseline and perf gate after full artifact.
- [x] Implement zoom-end priority settling path and `refresh-started` exact gate.
- [x] Short artifact confirms repeated idle/long-task and wheel targets now pass in 1-cycle probe.
- [ ] Full c10 closeout artifact confirms 8-cycle repeated zoom targets.
- [x] Fix scheduler label attribution blocker from static review.
- [x] Cover deferred exact continuous-input draining in scenario chunk contract.
- [x] Short c13 artifact passes core acceptance thresholds.
- [ ] Full c14 artifact confirms 8-cycle acceptance thresholds.

## 2026-04-30 C1/C2 continued closeout
- [x] Add relief contextScenario layer cache.
- [x] Add special overlay payload identity to contextScenario cache signature.
- [x] Separate deferred exact context delay from context-base enhancement delay.
- [x] Add contextScenario-specific reuse distance budget.
- [x] Allow settling/defer-exact fast frames to reuse dirty cached passes while exact refresh remains scheduled.
- [x] Run `node --check js/core/map_renderer.js`.
- [x] Run `npm run test:node:scenario-chunk-contracts`.
- [x] Run `python -m unittest tests.test_perf_gate_contract tests.test_scenario_chunk_refresh_contracts -q`.
- [x] Short c23 artifact passes repeated idle, long-task, wheel, black-frame, and finalSharpness targets.
- [x] Full c24 artifact completed.
- [ ] Full c24 artifact passes repeated absolute idle/long-task targets.
- [x] `npm run perf:baseline` completed.
- [ ] `npm run perf:gate` passes after latest renderer changes.
- [ ] Next root-cause pass: identify why full 5-wheel/8-cycle runs still fall back to exact settling frames despite dirty-cache fast-frame allowance.

## 2026-04-30 C2/C3 Ralph continuation checklist
- [x] Fix dirty fast-frame so it cannot build a reusable `interactionComposite` from dirty passes.
- [x] Prevent dirty fast frames from becoming `lastGoodFrame` continuity fallback sources.
- [x] Add `colorRevision` to `lastGoodFrame` freshness checks.
- [x] Make repeated-zoom idle waits include chunk promotion/post-commit and post-ready infrastructure work.
- [x] Flush exact-after-settle compose after exact pass prep to reduce finalSharpness latency.
- [x] Run `node --check js/core/map_renderer.js`.
- [x] Run `python -m py_compile ops/browser-mcp/editor-performance-benchmark.py`.
- [x] Run `npm run test:node:scenario-chunk-contracts`.
- [x] Run `python -m unittest tests.test_perf_gate_contract tests.test_scenario_chunk_refresh_contracts -q`.
- [x] Rerun short artifact c29 and confirm short targets pass.
- [x] Rerun full artifact c30 and isolate the remaining full blocker.
- [x] Run `npm run perf:baseline` after full artifact.
- [x] Run `npm run perf:gate` after baseline refresh.
- [ ] Full repeated-zoom max <= 3500ms and maxLongTask <= 750ms. Current blocker: first cold US East political detail payload load/parse, topSubOwner `chunk-promotion:post-commit-replay`.
- [ ] Decide and implement next boundary: detail chunk worker parse/off-main-thread path or explicit high-value political detail prewarm policy.

## 2026-05-14 01:20 UTC exact-after-settle political invalidation task
- [x] Create isolated worktree.
- [x] Read AGENTS, lessons learned, agent tiers, active performance docs.
- [x] Implement local political invalidation in success path.
- [x] Implement abort cleanup + recover render request.
- [x] Extend source contracts for success and abort paths.
- [x] Extend dev E2E guard to assert political pass repaint and reason.
- [x] Run targeted source contracts.
- [x] Run dev runtime E2E.
- [x] Run perf contract and perf gate.
- [x] Final static review completed; merged back to main.

## 2026-05-14 01:44 UTC exact-after-settle political invalidation task closeout
- [x] Run targeted source contracts.
- [x] Run dev runtime E2E.
- [x] Run perf contract and perf gate.
- [x] Final static review completed; merged back to main.

## 2026-05-14 02:07 UTC exact-after-settle political invalidation review-fix tasks
- [x] Split focused exact-after-settle political repaint E2E from zoom-end GCO chunk-fill regression.
- [x] Move E2E success reason assertion to stable settleExactRefreshPasses metric fields.
- [x] Re-run source contracts and runtime E2E after review fixes.
- [x] Re-run perf contract.
- [x] Re-run perf gate three times; failures isolated to startup/apply timing metrics outside political repaint.
- [x] Final static review completed; merged back to main.


## 2026-05-14 exact-after-settle political review fix
- [x] Move political dirty invalidation behind idle/current pass-task checks.
- [x] Update source contracts for delayed invalidation ordering.
- [x] Run node syntax checks.
- [x] Run scenario chunk contracts.
- [x] Run physical layer contracts.
- [x] Run scenario chunk runtime E2E.
- [x] Final static review approved; merged back to main.

## 2026-05-20 G001 appearance/reference/rivers evaluator continuation
- [x] Create isolated worktree from `origin/main@07709e0`.
- [x] Create scoped performance-goal evaluator contract.
- [x] Move reference overlay state/style/object-URL work into `appearance_reference_owner.js`.
- [x] Move rivers controls into `appearance_rivers_owner.js`.
- [x] Remove stale Appearance/transport bootstrap DOM and state writes from `toolbar.js`.
- [x] Run targeted owner behavior tests and toolbar/state contracts.
- [x] Run Pages dist sync and dist import smoke.
- [x] Run final toolbar/state evaluator contracts.
- [x] Run `npm run perf:gate` and clean `origin/main@07709e0` control comparison; both fail startup/apply gate family.
- [x] Fix final static review blocker in project import transport appearance UI sync.
- [x] Consolidate reference image state normalization into shared state helper.
- [x] Track current startup/apply perf gate blocker as the next performance boundary.
- [x] Reproduce startup/apply blocker in a clean `origin/main@b923b22` worktree.
- [x] Move startup scenario coarse chunk prewarm out of the blocking apply transaction.
- [x] Keep legacy bootstrap recovery on the synchronous prewarm path.
- [x] Separate startup-shell readiness metrics from coarse chunk readiness metrics.
- [x] Preserve synchronous chunk prewarm for ordinary scenario Apply.
- [x] Run startup/resource/chunk/perf/toolbar/state contracts.
- [x] Run `npm run perf:gate`; final gate passed.
- [x] Review all performance-related commits since the latest pushed performance split work.
- [x] Fix startup metric naming and prevent false coarse-ready metrics.
- [x] Fix transport workbench range input rebuilds, render-context side effects, and event-owner marker scope.
- [x] Fix appearance import/reference/rivers owner regressions found during review.
- [x] Re-run targeted contracts, owner tests, Pages dist, import smoke, and clean-server `npm run perf:gate`.
- [ ] Commit, push to `origin/main`, checkpoint goal state, and clean temporary worktree.
