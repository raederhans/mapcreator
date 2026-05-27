# 注释添加 2026-05-27 上下文

## 当前目标

在近期 churn 较高、长期存在、且当前工作树干净的核心 JS 文件中补充必要中文维护注释，帮助后续维护者更快理解 inspector 分组树、scenario tag creator、appearance parent border、transport apply bridge 与 dev state 的关键边界。

## 过程记录

- 已读取 automation memory，确认 2026-05-15、2026-05-16、2026-05-19、2026-05-20、2026-05-21、2026-05-22、2026-05-23、2026-05-25、2026-05-26 已覆盖的文件需要避开。
- 已读取 `C:\Users\raede\.codex\memories\MEMORY.md` 的 mapcreator comment-maintenance 记录，以及 `lessons learned.md`，本轮继续保持 comment-only 边界，只解释职责、状态语义、提交时序和宿主/owner 分层。
- 当前工作树已有 `index.html`、`tests/test_i18n_audit.py` 与 `.omx/metrics.json` 的既有改动，因此本轮避开这些脏文件，只在干净目标文件上落注释。
- 已按近 7 天 churn、文件长度、近期提交主题筛出候选：`js/ui/sidebar.js`、`js/ui/dev_workspace/scenario_tag_creator_controller.js`、`js/ui/toolbar/appearance_parent_border_owner.js`、`js/ui/toolbar/transport_workbench_apply_bridge_owner.js`、`js/core/state/dev_state.js`。
- 当前主线程独占所有验证；没有启动 live test、browser smoke 或长进程。
- 实际已补注释的文件为 `js/ui/sidebar.js`、`js/ui/dev_workspace/scenario_tag_creator_controller.js`、`js/ui/toolbar/appearance_parent_border_owner.js`、`js/ui/toolbar/transport_workbench_apply_bridge_owner.js`、`js/core/state/dev_state.js`。
- 注释主题分别覆盖：inspector 顶层分组顺序与 ownership 批量提交边界、tag creator 的 runtimeState 归一化与 inspector group 双模式校验、parent border 的支持集裁剪与列表 DOM 复用、transport apply bridge 的 source gate promise 去重与主图提交时序、以及 dev workspace transient reset 的保留/清空范围。
- `node --check` 已通过 5 个 JS 文件。
- `git diff --ignore-space-at-eol -- <5 files>` 确认目标代码改动为注释插入；`git diff --check -- <5 files + docs>` 只有目标文件既有的 LF/CRLF 提示，没有新增 whitespace error。

## live process owner

- 当前无 live process。
- 所有验证均为主线程前台短命令。
