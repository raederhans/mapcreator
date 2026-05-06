# TNO 1962 颜色与缩放填色/交互修复上下文

## 2026-05-06 启动
- 已读取仓库 AGENTS.md、lessons learned、agent tiers、相关 memory。
- `omx explore` 在当前 Windows allowlist harness 下不可用，切回本地只读检查和原生子代理 evidence lanes。
- 本轮主线程独占 live tests / long tests；子代理只做静态复核。
- `.omx/metrics.json` 是进入任务前已有改动，本轮不接管。

## 当前约束
- 修复优先落在 `chunk_runtime.js` 的 selection/merge 语义。
- 颜色侧保持现有 runtime 优先级，只补契约。
- strict scenario contract 漂移单拥有者处理。

## 2026-05-06 实施进度
- `chunk_runtime.js` 已把 zoom-end protected political detail chunk 从 `cacheOnlyChunkIds` 改为 `retainedActiveChunkIds`，active merge 时继续参与 political payload 和 hit 输入。
- `tests/scenario_chunk_contracts.test.mjs` 已新增行为回归：protected previous detail chunk 与 next detail chunk 一起出现在 merged political payload。
- `tests/palette_runtime_bridge.node.test.mjs` 已新增 `seedColorByTag` 优先级契约，锁定 seed tag color 高于 palette 和 ISO2 bridge。
- `tests/test_tno_bundle_builder.py` 已确认既有 mixed-policy 覆盖 `ARM/BRG/LAO/MAL/PHI` 与非例外 audit 对齐。
- strict contract 初跑暴露 manifest byte_size / snapshot drift；已用 `.runtime/tmp/tno_1962_current_checkpoint/runtime_topology.topo.json` 单拥有者执行 `tools/patch_tno_1962_bundle.py --stage chunk_assets`，再用 `check_scenario_contracts.py --strict --write-safe` 做派生资产同步。最终 checked-in 数据内容与 HEAD 一致，只有 runtime 生成过程刷新了 stat；已通过 `git add data/scenarios/tno_1962` 清掉无内容差异的 stat 噪音。

## 已验证
- `node --check js/core/map_renderer.js js/core/color_resolver.js js/core/palette_runtime_bridge.js js/core/scenario_apply_pipeline.js js/core/scenario/chunk_runtime.js`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:palette-runtime-bridge`
- `python -m unittest tests.test_tno_bundle_builder -q`
- `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json`

## 2026-05-06 复核说明
- reviewer 子代理两次都在只读复核阶段超时，已关闭两个子代理，避免继续占用后台资源。
- 主线程按【review-查bug-第一性原理分析】复核：本次真正需要守住的是 detail chunk 同时“驻留内存”和“参与 active political merge/hit 输入”，因此 `retainedActiveChunkIds` 是比复用 `cacheOnlyChunkIds` 更清晰的最短路径。
- e2e 失败暴露 `GCO -> CD` 的 ISO2 映射会把 focus chunk 指向不存在的 `political.detail.country.cd`；已改为 scenario tag 优先、ISO2 候选次之，并用 node contract 与 e2e 锁定。
