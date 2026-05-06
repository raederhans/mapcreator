# TNO 1962 颜色与缩放填色/交互修复计划

## 目标
修复 zoom-end protected political detail chunks 退出 active merge 后导致的缩放后政治填色和 hover/click 命中丢失，并加固 TNO 颜色优先级契约。

## 执行范围
- 修改 `js/core/scenario/chunk_runtime.js` 的 active/cache-only 选择语义。
- 扩展既有测试：`tests/scenario_chunk_contracts.test.mjs`、`tests/palette_runtime_bridge.node.test.mjs`、`tests/test_tno_bundle_builder.py`。
- 按单拥有者处理 TNO strict scenario contract 数据漂移。

## 冻结边界
- `index.html`
- `css/style.css`
- `js/ui/toolbar.js`

## 验收命令
- `node --check js/core/map_renderer.js js/core/color_resolver.js js/core/palette_runtime_bridge.js js/core/scenario_apply_pipeline.js js/core/scenario/chunk_runtime.js`
- `npm run test:node:palette-runtime-bridge`
- `npm run test:node:scenario-chunk-contracts`
- `python -m unittest tests.test_tno_bundle_builder -q`
- `npm run verify:scenario-contracts:strict`
- `npm run test:e2e:dev:scenario-chunk-runtime`
