# Rendering performance benchmark evaluation task

## Acceptance

- 当前 worktree 的 performance gate 有可复查 JSON 证据。
- 编辑器 benchmark 必须命中当前 worktree 的明确 URL。
- 外部资料只用于确定推进方向，实际结论以本仓库报告为准。
- 最终建议要区分三类事项：立即修测试合同、短期优化渲染链路、中期结构升级。

## Current live process ownership

- Main agent owned `py -3 ops/browser-mcp/editor-performance-benchmark.py --url http://127.0.0.1:8017/app/?perf_overlay=1`.
- Dedicated dev server pid `22524` was stopped after benchmark completion.
