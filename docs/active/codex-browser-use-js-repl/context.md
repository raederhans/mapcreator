# Codex Browser Use js_repl 上下文

2026-05-06：Browser Use skill 声明 in-app browser 控制依赖 Node REPL `js` 工具，工具 id 通常是 `mcp__node_repl__js`。本机 `browser-use@openai-bundled` plugin 已启用，Codex CLI 为 0.128.0，npm 最新同为 0.128.0。`config.toml` 原问题是 `js_repl` 需要作为 `[features]` 下的 feature 开启。

已处理：备份 `C:\Users\raede\.codex\config.toml.before-js-repl-features-20260506-145103.bak`，并在 `C:\Users\raede\.codex\config.toml` 写入 `[features] js_repl = true`。`codex debug prompt-input --enable js_repl ...` 退出码 0，证明配置可解析。

验证发现：新起 `codex exec --enable js_repl` 仍回复 `TOOL_MISSING`，与 openai/codex#18328 描述的“配置已启用但会话工具列表未暴露 js_repl”一致。当前运行中的 Codex 会话工具列表在会话启动时固定，本线程无法热加载 `mcp__node_repl__js`。
