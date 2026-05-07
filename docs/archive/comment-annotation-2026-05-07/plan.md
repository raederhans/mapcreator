# 注释添加计划

## 目标

为近期仍在高频变动、同时承担核心 owner 职责的长期文件补必要中文注释，帮助后续维护者更快理解状态提交时序、Pages dist 发布边界和 scenario 合同表的用途。

## 本轮范围

- `js/core/scenario_apply_pipeline.js`
- `js/core/state/scenario_runtime_state.js`
- `tools/build_pages_dist.py`
- `map_builder/contracts.py`

## 验收

- 只做 comment-only 改动，不改行为
- 注释聚焦职责边界、时序和契约，不铺满全文件
- `node --check` 通过两个 JavaScript 文件
- `python -m py_compile` 通过两个 Python 文件

## 执行步骤

- [x] 查看自动化记忆、lessons learned、近期提交和候选长文件
- [x] 选定本轮补注释目标
- [x] 添加最小中文注释补丁
- [x] 运行定向检查
- [x] 做静态复核并更新留档
