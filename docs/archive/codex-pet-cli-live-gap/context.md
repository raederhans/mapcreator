# Context

发现：
1. 当前 standalone CLI 会话存在，`state_5.sqlite` 和对应 rollout JSONL 都在更新，说明 CLI 本身工作正常。
2. Codex App 全局状态已选中 `custom:mochi`，avatar overlay 处于打开状态。
3. Codex App 内部存在 app-server 进程，standalone CLI 是独立 codex.exe 进程。
4. `codex app-server generate-json-schema --out .runtime/tmp/codex-pet-cli-live-gap/schema-out` 成功生成协议 schema，协议里有 `thread/started`、`turn/started`、`item/started`、`thread/status/changed` 等实时通知类型。
5. `codex app-server proxy` 连接 `C:\Users\raede\.codex\app-server-control\app-server-control.sock` 失败，错误为 `os error 10050`，并且该 control 目录当前不存在。

判断：当前断点在 App 实时控制/通知链路。CLI 活动能落盘，但没有稳定进入 Codex App 的 avatar overlay 实时状态。
