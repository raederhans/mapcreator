# Map Creator 三项架构清理执行计划

## 目标

完成三项架构清理：
1. HGO / Atlantropa 能力从 TNO 硬编码改为 manifest opt-in。
2. Control / frontline 层退场，Ownership 成为唯一地块归属来源。
3. Topology 压缩进入 candidate audit gate 流程，先度量和拦截风险，再推广参数。

## 执行顺序

1. Phase 0：建立审计基线。
   - 生成 controller 差异、controller-only country、rule pack 影响面。
   - 生成 topology 当前大小、feature/arc/coord、RU shell 占比。
   - 输出到 `.runtime/reports/generated/mapcreator-architecture-cleanup-3-issues/`，在 `context.md` 记录摘要。

2. Phase 1：HGO capability 化。
   - 扩展现有 scenario presentation helper。
   - TNO 专属字符串判断迁移到 `manifest.presentation_features`。
   - Mediterranean base-water exclusion 继续由 manifest 的 excluded group/id 决定。
   - TNO manifest 和 builder 写出 capability 字段。
   - 更新 contract/i18n/tests。

3. Phase 2：Control / frontline 退场。
   - Loader/runtime/file-manager/sidebar/toolbar/render pipeline 切为 owner-only。
   - 删除 controller 数据和 controller manual rules。
   - 旧项目导入时丢弃旧 controller 字段。
   - 更新 tests 和 scenario contract。

4. Phase 3：Topology candidate audit gate。
   - 在现有 candidate/promotion 流程加审计 artifact。
   - 记录参数、transform mode、bytes、feature/arc/coord、geometry drop、hash。
   - promotion gate 拦截 silent unquantized fallback 和拓扑结构异常。
   - 仅在 gate 稳定后进入量化/toposimplify 参数推广。

## 验收入口

- Phase 1：HGO helper/unit + TNO relief contract + targeted renderer/static tests。
- Phase 2：scenario runtime/state/file-manager/sidebar/strategic overlay targeted tests + old project import fixture。
- Phase 3：topology audit/gate unit tests + candidate build artifact sanity check。
- 全部完成前运行项目已有相关命名测试入口；长测试走后台日志。

## 执行约束

- 不创建新 worktree。
- `.runtime/` 承载临时报告和测试输出。
- `docs/active/mapcreator-architecture-cleanup-3-issues/` 是本任务唯一留档目录。
- 主线程独占 live browser / live tests；子代理只做静态分析和文件面复核。
- 计划文件保持指导性，实际代码为准；发现偏差写入 `context.md`。
