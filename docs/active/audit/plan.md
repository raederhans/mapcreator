# Plan

## Goal

审计最近一组时间相近、功能相关的运行时就绪与性能身份提交，修复可复现的功能、可靠性、安全、冗余或结构问题，并把验证后的改动提交、推送到 `origin/main`。

## Scope

- 审计范围：`4905fb696d9a5222aea628937fd2bc804109ae1f^..8a02bc8d4b306485ed4308b7b645f80607511524`，并复核同一功能簇的 `4905fb69`。
- 覆盖 same-runner 性能 gate、PR merge candidate 身份、回归阻断策略、selector 路由与 city visual E2E。
- 检查当前未提交修改、worktree、未合并分支，只整合已证明安全且属于本轮范围的交付。

## Sources of truth

- 当前 `origin/main`
- 提交 diff 与调用链
- SF-ATS selector / route registry
- 现有单元、结构和浏览器回归测试
- `docs/active/_worktree_registry.md`

## Stages

- [x] Stage 1: 确认基线、worktree、提交范围和既往自动化记忆。
- [x] Stage 2: 两条独立 review lane 审查代码/测试质量与架构边界。
- [x] Stage 3: 复现并最小修复确认的问题，补充回归覆盖。
- [x] Stage 4: 执行 SF-ATS 自适应选择、目标测试和必要主线程检查。
- [x] Stage 5: 完成独立复核、提交、推送、Git/worktree 状态同步。
- [x] Stage 6: 修复 GitHub-hosted follow-up 失败，重新验证功能提交并完成最终 closeout。
- [ ] Stage 7: 补强逐规则策略、PR candidate 身份、city visual 证据与测试预算，重新验证、提交并完成远端检查。

## Acceptance criteria

- 所有修复都有明确失败模式与回归覆盖。
- 相关 child-safe 检查通过；共享 live 检查由主线程独占。
- source/dist、selector route、生成清单等受影响合同保持一致。
- 两条独立 review lane 给出可追踪结论，最终无未解决 HIGH/CRITICAL 或架构 BLOCK。
- 审核提交推送到 `origin/main`，同时保留运行期间出现的无关文档 WIP 与独立 P4 worktree。

## Non-goals

- 扩大到 appearance + transport 的新功能开发。
- 重放仍有独立内容的历史 recovery 分支。
- 为通过检查而放宽 allowlist、timeout 或 selector 路由。

## Risks and constraints

- `index.html`、`css/style.css`、`js/ui/toolbar.js` 属于共享串行集成文件。
- live browser、Playwright、长测试和 `.runtime` 输出由主线程独占。
- Windows checkout 可能触发 Pages manifest 字节差异，需区分真实发布漂移与本地换行影响。
