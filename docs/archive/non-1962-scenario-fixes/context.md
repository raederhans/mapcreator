# 非1962剧本修复上下文

当前仓库已有大量未提交改动。只修改与本任务直接相关的 JS/test 文件和本任务留档，避免触碰已有 transport/perf/docs 改动。


## 修复实现记录
- `startup_data_pipeline` 改为先读场景 manifest，只有 manifest 明确声明 startup bundle 时才请求 `startup.bundle.*` 与场景级 startup locale/geo_aliases。
- `scenario_data_health` 改为从 `landDataFull`、`runtimePoliticalTopology`、`landData` 中取最大 runtime feature count，避免完整 HOI4 runtime topology 被 coarse 首屏集合误判。
- `hoi4_rk_russia_regression` 改用共享 Playwright 场景 apply helper，先打开折叠 details，再应用 HOI4 1939。
- 新增 `non_1962_runtime_matrix.spec.js`，覆盖四个非1962剧本的默认启动、active 状态、coarse 文案和 4xx/请求失败。

## 验证记录
- `python -m unittest tests.test_scenario_data_health_boundary_contract -q`：通过。
- `node tools/e2e_layering.mjs check`：通过。
- `python -m unittest tests.test_check_hoi4_scenario_bundle -q`：通过。
- `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/{blank_base,hoi4_1936,hoi4_1939,modern_world}`：四个场景均通过非 strict contract。
- `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`：25 个 Node 子测试通过，仍有既有 MODULE_TYPELESS_PACKAGE_JSON warning。
- `node node_modules/@playwright/test/cli.js test tests/e2e/non_1962_runtime_matrix.spec.js tests/e2e/hoi4_1939_ui_smoke.spec.js tests/e2e/scenario_blank_exit.spec.js tests/e2e/scenario_controls_dispatcher_contract.spec.js tests/e2e/hoi4_rk_russia_regression.spec.js --reporter=list --workers=1 --retries=0`：9 个 Playwright 测试通过，用时 3.5m；日志在 `.runtime/tmp/non-1962-scenario-fixes/playwright-targeted-2.*.log`。
- `git diff --check -- <本任务文件>`：通过，仅输出既有 LF/CRLF 提示。

## 额外发现
- HOI4 RK 回归测试原 `polar_gap_*` 采样点落在当前 land feature 外；用浏览器运行态探针确认附近纬度 66.8/66.95 能命中真实俄罗斯 land feature。测试采样点已改成当前拓扑内的 arctic land 点。
- `scenario_blank_exit` 在完整批量第一次失败后，修复 query preload 后单独与批量复跑均通过。
