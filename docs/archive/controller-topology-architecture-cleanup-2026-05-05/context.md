# Context

2026-05-05: 从用户提供的计划进入执行。实际代码库为准；旧计划只作为意图源。live tests 由主线程串行执行。

2026-05-05: controller 收口已落到正式 contract：checkpoint artifacts、publish filenames、strict required filenames、TNO stage signatures、HOI4 generated manifest URL、HOI4 output writer、startup bundle input均不再要求 controllers.by_feature.json。legacy startup bundle controllers section 改为从 owners 派生，保留旧 shape。

2026-05-05: topology candidate audit 升级为 v2；缺 country metrics collector、缺 evaluator、候选/基线 metrics 缺失均写 audit 后终止 promotion。audit 记录 stage、parameter_profile_id、topology_parameters、topology_transform、fallback_used。

2026-05-05: 子代理静态 lane 因 GPT-5.3-Codex-Spark 额度中断，review 子代理超时后关闭。主线程完成静态映射、实现、验证和第一性原理自检。

2026-05-05 验证：py_compile 通过；147 个 targeted unittest 通过；HOI4 checker OK；hoi4_1939/tno_1962 strict contract OK。Phase 3b production 参数未更新，需后续带真实候选产物和视觉关键点再推进。

2026-05-05 review fix: explicit --controller-rules now fails at resolve_controller_rules, preventing audit/summary from claiming controller-rule application under owner-only output. City asset generation now always derives controllers_by_feature from owners_by_feature, so stale controllers.by_feature.json files cannot affect capital/city indexing. Verification: py_compile build_hoi4_scenario.py/cities.py; 157 targeted unittest OK.

2026-05-05 Phase 3b continuation: added explicit env-variable tuning for runtime/detail topology quantization (RUNTIME_POLITICAL_TOPOLOGY_QUANTIZATION, DETAIL_OUTPUT_TOPOLOGY_QUANTIZATION) with fail-closed positive integer parsing. Targeted config/audit tests pass.

2026-05-05 Phase 3b runtime q50000: candidate build completed under .runtime/tmp/phase3b/runtime_q50000, audit v2 wrote result=failed_contract. Quantization=50000, fallback_used=false, bytes 15,038,191 vs baseline 15,682,866, arc_count 151,356 vs 144,926, arc_point_count 601,362 vs 613,401. Contract blocker: world_bounds_geometries=391, so runtime q25000 and production parameter update were not attempted.

2026-05-05 Phase 3b detail q50000: build failed before candidate because source/primary urban layer contract lacks id and country_owner_id. Wrote a failed_contract audit in .runtime/tmp/phase3b/detail_q50000/europe_topology.na_v2.json.candidate_audit.json. Detail q25000 and production parameter update were blocked.

2026-05-05 Phase 3b verification rule: visual key-point checks were intentionally not run because candidate gate failed before the visual gate. Strict scenario checks and HOI4 checker remain green on current production artifacts.

2026-05-05 self-review: the simplest stable path is to keep production quantization at 100000 until runtime q50000 world-bounds leakage and stale urban source schema are fixed. No fallback promotion or visual approval was used.

2026-05-14 archive decision: this folder's scoped work is complete. Owner-only controller retirement, checker/audit cutover, candidate gate creation, and fail-closed verification are done. Remaining work is a new blocker track: fix runtime q50000 world-bounds leakage and detail urban source schema, then reopen a separate topology candidate follow-up before any production quantization change.
