# Codex CLI Mochi overlay plan

目标：实现一个外部 Mochi overlay，直接读取本机 Codex CLI 活动，绕开 Codex App 内置 avatar overlay 的实时通知缺口。

步骤：
- [x] 定位 Mochi spritesheet 与 Codex activity source。
- [x] 实现 Python/Tk overlay watcher。
- [x] 增加 start/stop PowerShell launcher。
- [x] 验证 `--once` 状态判定与后台 overlay 进程存活。
