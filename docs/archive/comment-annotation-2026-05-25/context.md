# 注释添加 2026-05-25 上下文

## 当前目标

在近期 churn 较高、长期存在、且目前工作树干净的核心 JS 文件中补充必要中文维护注释，帮助后续维护者更快理解 runtime state、scenario apply、startup detail promotion、i18n 的关键边界。

## 过程记录

- 已读取 automation memory，确认 2026-05-15、2026-05-16、2026-05-19、2026-05-20、2026-05-21、2026-05-22、2026-05-23 已覆盖的文件需要避开。
- 已读取 `lessons learned.md`，本轮继续保持 comment-only 边界，只解释职责、状态语义、提交时序和回退链。
- 已读取 `docs/shared/agent-tiers.md`，本轮主线程独占所有验证；没有启动 live test、browser smoke 或长进程。
- 已按 ultrawork 思路派出两条只读子代理 lane：
  - scenario/state lane：分析 `scenario_runtime_state.js`、`scenario_apply_pipeline.js`、`renderer_runtime_state.js`、`deferred_detail_promotion.js`
  - ui/i18n lane：分析 `i18n.js`、`i18n_catalog.js`、`sidebar.js`、`scenario_chunk_manager.js`
- 当前工作树存在大量既有未提交改动，因此本轮显式避开已脏文件，只在干净目标文件上落注释。
- 当前主候选为 `js/core/state/scenario_runtime_state.js`、`js/core/scenario_apply_pipeline.js`、`js/bootstrap/deferred_detail_promotion.js`、`js/ui/i18n.js`。
- 实际已补注释的文件为 `js/core/state/scenario_runtime_state.js`、`js/core/scenario_apply_pipeline.js`、`js/bootstrap/deferred_detail_promotion.js`、`js/ui/i18n.js`。
- 注释主题分别覆盖：chunk runtime 状态机字段的稳定语义、optional layer 的显式清空合同、scenario apply 的 pre/commit/post 三段式、detailReady 与 coarse 入场边界、startup readonly 解锁链、以及 UI/runtime locale 的回退链与语言切换三段式。
- `node --check` 已通过 4 个 JS 文件。
- `git diff --ignore-space-at-eol -- <4 files>` 确认目标代码改动为注释插入；`git diff --check -- <4 files>` 只有既有 LF/CRLF 提示，没有新增 whitespace error。
- 两个 explore 子代理都已返回候选落点；review 子代理第一次等待超时，主线程已完成一轮直接 diff 复核，并保留第二次短等待窗口。

## live process owner

- 当前无 live process。
- 所有验证均为主线程前台短命令。
