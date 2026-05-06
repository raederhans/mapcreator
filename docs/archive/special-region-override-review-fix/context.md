# Context

- 2026-05-05：当前 main 已合入 special-zone-layers workbench 主线，但 review 指出两个直接回退：
  - special region sidebar 仍展示 `scenarioSpecialRegionsData`，却失去颜色编辑入口。
  - renderer 已不再消费 `specialRegionOverrides`，而 history/runtime 仍会保存与恢复该字段。
- 本批保持最小范围修复，只恢复兼容面，不回退 layer-based workbench 主路径。
- 已完成修复：
  - `js/ui/sidebar/water_special_region_controller.js` 恢复 legacy special region override 的读取、legend 展示、颜色写回、清除、history 与 dirty/render 触发。
  - `js/core/map_renderer.js` 恢复 `specialRegionOverrides` 的 fill/opacity 兼容渲染，并把 override map 纳入 special visual signature，确保 cache 会随 override 变化失效重绘。
- 已完成验证：
  - `node --check js/ui/sidebar/water_special_region_controller.js`
  - `node --check js/core/map_renderer.js`
  - `python -m unittest tests.test_water_special_region_sidebar_boundary_contract tests.test_toolbar_split_boundary_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
  - review 子代理只读复核：可提交，无新的 scoped blocker。
