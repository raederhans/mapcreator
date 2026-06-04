# Context

本轮 live process owner：主代理。
范围：地图 Ctrl/Command 地块选择、检查器国家同步、领土预设刷新。

发现：`map_renderer.handleClick` 只有在 `runtimeState.devSelectionModeEnabled` 为真时才响应 Ctrl 多选；`sidebar.renderPresetTree` 已有从选中地块推断国家的能力，但已有 `selectedInspectorCountryCode` 会优先覆盖推断。

完成：新增 `syncInspectorCountryToLandSelection`，Ctrl/Command 选择时同步检查器国家并刷新预设树。普通工具栏模式复用 `toggleFeatureInDevSelection`，加选和减选行为一致。

验证：`node --check js/core/map_renderer.js`、`node tests/scenario_chunk_contracts.test.mjs`、`python -m unittest tests.test_sidebar_split_boundary_contract -q`、`npm run verify:pages-dist` 均通过。浏览器 smoke 尝试因 Node REPL 缺少 Playwright 包未执行。
