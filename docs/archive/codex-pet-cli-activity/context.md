# Context

当前任务：测试 Mochi 水豚是否能反映 Codex CLI 端动作。

Live process owner：主线程。
日志/临时输出：.runtime/tmp/codex-pet-cli-activity/

发现记录：

- Start-Process 直接启动 codex shim 失败：Windows 将 npm shim 当成非 Win32 可执行文件；改用 powershell -File codex.ps1。

- codex exec 子命令不接受 -a shorthand；改用 config override approval_policy。

- codex exec prompt 通过 Start-Process 参数数组会被拆词；改为 .runtime runner.ps1 通过 stdin 传入 prompt。

- App asar 中 codex-avatar 映射确认：local/exec 会话状态会映射到宠物行，running -> running，failed -> failed，waiting -> waiting，review -> review，idle -> idle。
- 嵌套 Codex CLI 测试线程：019e1d34-892d-78a2-9e71-f43dc5596a7f，source=exec，cwd=.runtime/tmp/codex-pet-cli-activity。
- 测试 stdout 捕获到 command_execution 的 in_progress/completed/failed 事件；最终 PowerShell 8 秒 sleep + 写 marker 成功。
- marker 文件存在：.runtime/tmp/codex-pet-cli-activity/nested-marker-20260512-132040.txt，内容 pet-cli-activity-ok。
- 稳定结论：Codex App 原生宠物链路能反映 CLI/exec 会话级状态；动作粒度是会话/通知级，不是每个 CLI hook 的专用动画事件。

自检：
- 更简单实现：直接复用 App 的 localConversations 状态映射，比改 App 或写 overlay 稳。
- 风险：App UI 是否实时刷新取决于本机 App server 回调；状态库和 exec JSONL 已证明 CLI 事件可被本机状态面记录。
- 后续：只有当你需要“每个 CLI hook 都触发特定动作”时，才增加 hook bridge。
