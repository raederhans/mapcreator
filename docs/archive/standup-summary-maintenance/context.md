# Context

2026-04-29 开始执行本轮 standup maintenance。

已确认：
- automation memory 当前不存在 `memory.md`，只有 `automation.toml`。
- `lessons learned.md` 规模很大，存在明显重复主题，尤其集中在 team/tmux、顶部 utility 点击层级、长测试后台化。
- `docs/active` 里有多份 2026-04-22 ~ 2026-04-23 的旧任务仍停留在 active，需要根据任务文件里的未完成项再决定是否归档。

执行策略：
- 子代理 A：只读审计 lessons 的合并/删除候选。
- 子代理 B：只读审计 `docs/active` 的归档候选。
- 主线程：整合结论，做最小文本整理和目录迁移。

执行结果：
- `lessons learned.md` 已清理最明显的重复簇：
  - 顶部 overlay 点击验证
  - `$team` / tmux leader 前置条件
  - 主壳 E2E 不要被相邻可选区块绑死
- 已删除一批乱码条目和低复用噪音条目，并修复了 `### 19` 之前的标题粘连问题。
- 已将以下已闭环任务从 `docs/active` 移到 `docs/archive`：
  - `interaction_funnel_root_state_write_reduction`
  - `startup_hydration_root_state_write_reduction`
  - `preload_warning_architecture_fix_2026-04-22`
  - `refactor_and_perf_2026-04-20`
- 当前保留在 `docs/active` 的目录为：
  - `app-performance-overhaul`
  - `color-library-improvement`
  - `js-runtime-static-review`
  - `renderer_volume_wave_2026-04-22`
  - `scenario-review-static-analysis`
  - `standup-summary-maintenance`
  - `static_review_tno1962_chunk_fix_2026-04-23`
  - `transport-panel-visibility`
- 主线程复核已完成：
  - lessons 的重复簇已压缩成单条原则，结构性乱码已移除。
  - active 目录只保留仍有未完成项、验证缺口或显式后续风险的任务。
  - automation memory 已新建并写入本轮摘要。

2026-04-30 当前轮补充复核：
- 重新按当前文件系统审计后，发现之前的 maintenance 记录已经落后于仓库现状，不能直接当成最终状态；因此本轮重新核对 `docs/active` 与 `docs/archive`。
- `lessons learned.md` 本轮继续移除了不可读乱码条目，并把 defer/exact-after-settle、external context layer、水域 source/base-id 收口为可读原则。
- 本轮确定清理的 active 目录：
  - `comment-annotation-2026-04-30`：归档后的纠错残留，且 archive 已有同名完整任务。
  - `static_review_tno1962_chunk_fix_2026-04-23`：静态 review 已闭环。
  - `js-runtime-static-review`：长期停留在空壳状态。
  - `scenario-review-static-analysis`：长期停留在占位状态。
  - `standup-summary-maintenance`：本轮完成后归档。
