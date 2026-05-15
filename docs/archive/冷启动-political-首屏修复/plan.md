# 冷启动 political 首屏修复计划

目标：按用户提供计划做窄修复，让 detail promotion 完成后通过 post-ready 任务补一次 political 全量重画，修复冷启动首屏 political 颜色缺失。

边界：
- 保留 recolorAllFeatures 数据修复。
- 移除 forcePoliticalFullRepaint 即时直渲染和 detail-promotion-force reason。
- 恢复 exact-after-settle-abort-recover 的 flush:false render 请求。
- 不改 shared UI 文件。
- 主线程独占所有测试和浏览器验证；子代理只做静态 review。

验收命令：
- node --check js/core/map_renderer.js js/core/map_renderer/public.js js/main.js js/bootstrap/deferred_detail_promotion.js
- python -m unittest tests.test_scenario_chunk_refresh_contracts -q
- python -m unittest tests.test_main_startup_scenario_boot_boundary_contract -q
- python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract -q
- python -m unittest tests.test_map_renderer_public_contract -q
- npm run test:node:renderer-runtime-state-behavior
- npm run test:node:physical-layer-contracts
- npm run test:node:scenario-chunk-contracts
