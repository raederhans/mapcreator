# 慢 E2E 治理第一波：city-runtime 可量化提速

## 目标
- 第一波把 `city_lights_layer_regression.spec.js` 的固定等待改成状态驱动等待。
- 修复本轮验证暴露的两个 city-runtime 回归：city lights 视觉采样断言、city reveal warning allowlist。
- 比照原计划继续推进一轮到 `water_cache_strategy_regression.spec.js`，替换固定等待并保持现有水域交互契约。
- 主线程独占 Playwright；子代理只跑互相独立的 node/static 验证。

## 验收
- before/after wall-clock 写入 `.runtime/reports/generated/e2e-speed/`。
- `node --check` 覆盖 4 个改动 JS 文件。
- targeted Playwright：city lights、city reveal、water cache 全部通过。
- city-runtime domain `--list` 通过。
- node/static：`npm run verify:test:e2e-layers`、`select_verification_targets`、`npm run test:node:scenario-chunk-contracts` 通过。
- city-runtime domain full run 给出新鲜结果。
