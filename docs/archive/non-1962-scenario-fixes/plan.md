# 非1962剧本修复计划

范围：`blank_base`、`hoi4_1936`、`hoi4_1939`、`modern_world`。

修复目标：
- default_scenario 启动时，只在场景声明 startup bundle 时加载 startup bundle，避免轻量场景 404。
- 场景状态健康检查以真实 runtime political topology / full land data 为准，避免完整场景误报 coarse mode。
- 修复 HOI4 回归测试对折叠 Scenario 面板的可见性依赖。
- 增加非1962 runtime matrix 测试，固定四个场景的 active 状态、网络失败和状态文案。

验收命令：
- `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/<id>`
- `python -m unittest tests.test_check_hoi4_scenario_bundle -q`
- `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`
- `node node_modules/@playwright/test/cli.js test tests/e2e/hoi4_1939_ui_smoke.spec.js tests/e2e/scenario_blank_exit.spec.js tests/e2e/scenario_controls_dispatcher_contract.spec.js tests/e2e/hoi4_rk_russia_regression.spec.js tests/e2e/non_1962_runtime_matrix.spec.js --reporter=list --workers=1 --retries=0`
