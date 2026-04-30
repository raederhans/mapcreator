# 非1962剧本全面审计上下文

初始状态：仓库已有大量未提交改动，本任务只做审计和留档，避免覆盖现有代码改动。

## 运行记录

- 已确认非1962场景：blank_base、hoi4_1936、hoi4_1939、modern_world。
- `omx explore` 在 Windows 当前环境不可用，原因是内置 allowlist 依赖 POSIX sh/bash；改用 PowerShell/rg/python 只读审计。
- `ultraqa` state 写入失败：当前已有 `ralph` active 状态，避免清理无关模式，继续执行本地 QA 循环并记录该限制。
- strict scenario contract：hoi4_1936、hoi4_1939 通过；blank_base、modern_world 失败，缺 `runtime_topology.topo.json`。
- non-strict scenario contract：四个非1962场景均通过。

## 验证记录

- `python -m unittest tests.test_check_hoi4_scenario_bundle -q`：4 tests passed。
- `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/startup_hydration_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`：25 tests passed；Node 输出 MODULE_TYPELESS_PACKAGE_JSON warning。
- `node tools/e2e_layering.mjs check`：passed。
- Playwright targeted suite：5 tests 中 4 passed，`hoi4_rk_russia_regression.spec.js` 失败；失败点是 `#scenarioSelect` 存在但不可见，截图显示 Scenario 折叠。
- 自建 runtime matrix：四个非1962场景都能到 active 状态；blank_base/hoi4_1936/modern_world 出现 startup bundle/support 404；hoi4_1939 无网络失败但有 coarse/detail visibility warning。
- 手动启动过 dev server 进行 runtime matrix，结束后已停止。

## 自检

- 第一性原理复核：本次目标是审核并汇报，所以没有修改生产代码。问题优先级按用户可见故障、数据契约失败、测试失效、覆盖缺口排序。
- 查 bug 复核：所有高风险发现都有命令输出或文件行号支撑；没有把缺失启动资产解释成正常通过。
- 更简单稳健的路径：下一步应先修 startup asset contract 和 status health metric，再处理 1939 地区规则数据。
