# Context

- 2026-05-13：开始执行 fresh context。`omx explore` 在 Windows allowlist harness 不可用，改用本地只读 grep/文件读取。
- 主线程是 live process owner；子代理只读静态审查和测试设计。
- 子代理结论：当前 airport/port atlas 非 ready 时会整层早退并清 hover；label 没有点位级 bbox 避让；map_renderer 已有 pack 优先级但 hover 列表缺少 semantic 去重。
- 已实现：atlas loading/error/unavailable 走 geometry fallback 并保留 hover；图标尺寸收小；tint 改成外缘描边；facility density 分 world/regional/local；airport/port label 做四向 bbox；hover 列表按 semantic key 去重并保留 country pack。
- Live test owner：主线程。已跑 targeted node/Python tests、`git diff --check`、`node --check`。
