# Context

2026-05-15：任务完成实现与验证。当前 main 有大量无关 WIP；本轮只处理用户计划点名的 renderer/main/detail-promotion/test 文件。live process owner：主线程。子代理限制：只读静态审查。

发现：`omx explore` 在 Windows POSIX wrapper 限制下不可用，本轮改用本地 grep/read。

实现：
- `refreshMapDataForScenarioApply` 新增 `recolorAllFeatures`，移除 `forcePoliticalFullRepaint` / `detail-promotion-force`。
- `reconcileDetailPromotionPoliticalPass` 只清 political signature/full reference、invalidate、request render、记录 metric；无 direct render fallback。
- `main.js` 新增固定 task key 的 post-ready reconcile 调度，detail 未完成或 request 失败时重排。
- `deferred_detail_promotion` 只在 `mapDataRefreshed` 为 true 的 promotion 成功路径调度 reconcile。
- active scenario 的 detail promotion refresh 失败直接暴露；保留无 active scenario 的正常 `setMapData` 路径。
- startup readonly unlock 不做泛化 reconcile 调度，避免 `applyMapData:false` 后误触发。
- `exact-after-settle-abort-recover` 恢复 `flush:false` request render。

验证：
- `node --check js/core/map_renderer.js js/core/map_renderer/public.js js/main.js js/bootstrap/deferred_detail_promotion.js` 通过。
- `python -m unittest tests.test_scenario_chunk_refresh_contracts -q` 通过。
- `python -m unittest tests.test_main_startup_scenario_boot_boundary_contract -q` 通过。
- `python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract -q` 通过。
- `python -m unittest tests.test_map_renderer_public_contract -q` 通过。
- `npm run test:node:renderer-runtime-state-behavior` 通过。
- `npm run test:node:physical-layer-contracts` 通过。
- `npm run test:node:scenario-chunk-contracts` 通过。
- 临时 Playwright smoke `.runtime/tmp/political-reconcile-smoke` 通过：冷启动 tno_1962，无用户交互，`detailPromotionPoliticalReconcile` metric 出现，post-ready active key 为空，console/network 无新增错误。临时 spec 已删除。

Review：最终只读 reviewer 返回 APPROVED。

注意：`npm run test:e2e:dev:tno-ready-state` 曾暴露既有 `hasAQSpatial=false` 失败，单独复跑该用例同样失败，和本轮 reconcile metric 无关；最终使用独立 smoke 覆盖本轮行为。

当前 127.0.0.1:8810 已有 `tools/dev_server.py` 进程，本轮未停止，避免误杀用户或外部既有 dev server。
