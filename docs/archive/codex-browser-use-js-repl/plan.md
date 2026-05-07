# Codex Browser Use js_repl 修复计划

- 确认缺失工具来源：Browser Use 需要 Codex 内置 Node REPL `js` 工具，常见工具名为 `mcp__node_repl__js`。
- 检查安装链路：Browser Use plugin、Codex CLI、Node、Playwright。
- 修正配置：把 `js_repl = true` 放入 `C:\Users\raede\.codex\config.toml` 的 `[features]` 段。
- 验证：用 Codex CLI 解析配置、检查插件启用、用新 `codex exec --enable js_repl` smoke test 检查工具暴露。
- 收尾：说明当前会话工具列表固定，需要新会话加载新 tool list；记录上游缺陷状态。
