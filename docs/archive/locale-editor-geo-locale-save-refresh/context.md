# Context

2026-05-15: 收到 review blocker：保存端实际写入 geo locale patch 路径与前端保存后 reload 的 language descriptor 可能分叉。主线程为测试 owner。

2026-05-15: 定位结果：`save_scenario_geo_locale_entry()` 返回 `generatedPath`，来源是 `context["geoLocalePatchPath"]`；当前前端保存成功后继续 fetch UI 当前语言 descriptor。修复为保存成功后从 `result.publishedPath || result.generatedPath` 取实际写入路径，缺字段直接报错。

2026-05-15: 验证结果：`node --check js/ui/dev_workspace/scenario_text_editors_controller.js` 通过；`python -m unittest tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_dev_server -q` 通过，73 tests，skipped=1。
