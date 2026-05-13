# Context

实现位置：
- `C:\Users\raede\.codex\pet-tools\mochi_cli_overlay.py`
- `C:\Users\raede\.codex\pet-tools\start-mochi-cli-overlay.ps1`
- `C:\Users\raede\.codex\pet-tools\stop-mochi-cli-overlay.ps1`

活动信号：
- 读取 `C:\Users\raede\.codex\state_5.sqlite` 的 `threads` 表。
- 结合 `rollout_path` 文件 mtime 判断近期活动。
- source 覆盖 `cli`、`exec` 和 subagent 类活动。

UI 行为：
- 使用现有 `C:\Users\raede\.codex\pets\mochi\spritesheet.png`。
- `idle/running/waiting/review/failed` 映射到 pet atlas 行。
- 左键拖动位置，右键、Esc 或 Ctrl+Q 退出。
- 位置保存到 `C:\Users\raede\.codex\pet-tools\mochi-cli-overlay.json`。

验证：
- `python ...\mochi_cli_overlay.py --once` 返回 `state=running`。
- 通过 `pythonw.exe ...\mochi_cli_overlay.py` 启动后进程保持存活。
