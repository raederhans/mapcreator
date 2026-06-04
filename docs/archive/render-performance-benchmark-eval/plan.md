# Rendering performance benchmark evaluation

## Goal

建立当前 `origin/main` 渲染链路的性能证据，区分真实瓶颈、测试污染和 baseline 合同漂移，再给出后续推进顺序。

## Steps

- [x] 建立独立 worktree，避免污染本地 main 的未提交改动。
- [x] 安装 benchmark 所需依赖并运行 `perf:gate`。
- [x] 抽取门禁报告与旧 baseline 的关键差异。
- [x] 核查编辑器 benchmark 端口来源，识别默认端口污染风险。
- [x] 用当前 worktree 专属服务补跑编辑器 benchmark。
- [x] 对照外部 Canvas、Long Animation Frame、OffscreenCanvas、空间索引资料。
- [x] 形成推进建议和验证口径。
