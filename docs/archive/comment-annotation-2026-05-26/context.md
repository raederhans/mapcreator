# 注释添加 2026-05-26 上下文

## 当前目标

在近期 churn 较高、长期存在、且目前工作树干净的核心 JS 文件中补充必要中文维护注释，帮助后续维护者更快理解 scenario apply 首帧、frame scheduler、history snapshot、special zone layer mutation 的关键边界。

## 过程记录

- 已读取 automation memory，确认 2026-05-15、2026-05-16、2026-05-19、2026-05-20、2026-05-21、2026-05-22、2026-05-23、2026-05-25 已覆盖的文件需要避开。
- 已读取 `C:\Users\raede\.codex\memories\MEMORY.md` 的 comment-maintenance 相关记录，以及 `lessons learned.md`，本轮继续保持 comment-only 边界，只解释职责、状态语义、提交时序和单一入口。
- 当前工作树存在大量既有未提交改动，因此本轮显式避开已脏文件，只在干净目标文件上落注释。
- 已按近 30 天 churn、文件长度、近期提交主题筛出 clean 候选：`js/core/scenario_post_apply_effects.js`、`js/core/frame_scheduler.js`、`js/core/history_manager.js`、`js/core/special_zone_layers.js`。
- 当前主线程独占所有验证；没有启动 live test、browser smoke 或长进程。
- 实际已补注释的文件为 `js/core/scenario_post_apply_effects.js`、`js/core/frame_scheduler.js`、`js/core/history_manager.js`、`js/core/special_zone_layers.js`。
- 注释主题分别覆盖：scenario apply 后首帧与 detail prewarm 的职责分工、frame scheduler 的单一 drain/去重/输入让路合同、history snapshot 的 null 删除语义与 undo/redo 统一刷新入口、以及 special zone layers 的 normalize/mutation/render 单一边界。
- `node --check` 已通过 4 个 JS 文件。
- `git diff --ignore-space-at-eol -- <4 files>` 确认目标代码改动为注释插入；`git diff --check -- <4 files>` 只有目标文件既有的 LF/CRLF 提示，没有新增 whitespace error。

## live process owner

- 当前无 live process。
- 所有验证均为主线程前台短命令。
