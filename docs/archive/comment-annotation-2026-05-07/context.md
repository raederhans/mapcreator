# 上下文

## 2026-05-07

- 自动化记忆显示前几轮已经覆盖 `map_renderer`、`chunk_runtime`、`main.js`、`scenario_manager`、`sidebar`、`startup_data_pipeline`、`startup_hydration`、`file_manager`、`data_loader`、`scenario_resources`、`ui_state`、`check_scenario_contracts.py`，本轮需要避开这些热点。
- 近期提交热点里，未在自动化记忆中出现、同时仍是核心 owner 的候选集中在 `scenario_apply_pipeline`、`scenario_runtime_state`、`build_pages_dist.py`、`map_builder/contracts.py`。
- 本轮注释目标仍然保持最小补丁，只解释容易误改的职责边界和时序，不做重构。
- 已按仓库要求启用子代理做只读筛选和复核；主线程独占最终编辑与验证。
- 主线程最终落注释的文件是 `js/core/scenario_apply_pipeline.js`、`js/core/state/scenario_runtime_state.js`、`tools/build_pages_dist.py`、`map_builder/contracts.py`，重点解释 scenario apply 三段时序、chunk optional layer 的 `undefined/null` 语义、Pages runtime allowlist、以及 scenario publish contract 与 Pages dist 的边界。
- 定向验证已完成：`node --check` 通过 2 个 JavaScript 文件，`python -m py_compile` 通过 2 个 Python 文件；diff 统计为 4 个文件共 39 行纯注释新增。
