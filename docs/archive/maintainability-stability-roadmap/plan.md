# Maintainability / Stability Roadmap Execution Plan

## Goal
按照《可维护性 / 稳定性整治路线图 v1》完成当前仓库的基线对齐、owner seam 收口、测试门禁补强和大件拆分准备。

## Constraints
- 主线程独占 live browser、E2E、perf gate、长测试。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 只能串行集成。
- 优先最短路径修复，避免新依赖、避免多层 fallback、避免扩大无关范围。
- 每完成一个阶段都要回写 drift ledger、任务清单和验证证据。

## Acceptance
- 阶段 0 到阶段 8 的目标全部完成，且有对应验证证据。
- 运行时 URL 查询入口统一到 manifest + data_loader。
- state 写入口 guardrail 通过，试点 owner API 接管目标写口。
- Python country gate / processor chain seam 完成单一 owner 收口。
- transport capability/apply bridge、FeatureNormalizer、政策表外部化、scenario transaction seam 都完成。
- 最终 review、查 bug、第一性原理复盘完成，留档齐全。

## Task List
- [x] 阶段 0：基线对齐与 drift ledger
- [x] 阶段 1：资源路径统一与绝对路径清理
- [x] 阶段 2：state 写入口守卫与小切片试点
- [x] 阶段 3：Python country gate seam
- [x] 阶段 4：processor chain seam 与 subdivisions 收口
- [x] 阶段 5：transport capability / apply bridge 收口
- [x] 阶段 6：FeatureNormalizer 与颜色/渲染门禁补强
- [x] 阶段 7：政策表外部化
- [x] 阶段 8：scenario 事务化与 map_renderer 渐进瘦身
- [x] 最终验证、review、复盘、归档

## Drift Ledger Pointer
- `docs/active/maintainability-stability-roadmap/task.md`
