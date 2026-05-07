# 上下文

## 2026-05-06

- 任务目标是“扫描近期更改过的代码库和提交文件，为重要文件、长文件和长期存在文件添加必要中文注释”。
- 本轮重新按近期提交、长文件和长期 owner 筛选，避开 automation memory 里已补过的热点文件。
- 两个只读子代理分别覆盖 `js/core/js/bootstrap` 与 `tools/js/core/state/js/ui/sidebar`，候选集中收敛到 `scenario_resources`、`data_loader`、`ui_state`、`scenario_runtime_state`、`check_scenario_contracts.py`。
- 主线程最终选择 `js/core/data_loader.js`、`js/core/scenario_resources.js`、`js/core/state/ui_state.js`、`tools/check_scenario_contracts.py` 四个文件，注释仍保持最小改动，只解释职责边界、状态合并顺序和 strict repair 语义。
- 定向验证已完成：`node --check` 通过 3 个 JavaScript 文件，`python -m py_compile` 通过 `tools/check_scenario_contracts.py`。
- 当前待收尾项只剩复核子代理的静态 review 结果；主线程已先做 diff 体量检查，未发现 comment-only 异常大改动。
