# Render Chain Follow-Up Plan 2026-06-11

## Source
- Guidance: user-provided "主渲染链路改进 · 二次复核结论与后续跟进计划".
- Current phase: R0 first, then R1 only after R0 blockers are resolved.

## R0 Acceptance
- Archive completed `docs/active/render-chain-improvement` and `docs/active/hgo-scenario-platformization` records.
- Keep `.omx/metrics.json` local and out of product commits.
- Diagnose `npm run perf:gate` on clean evidence before merging `codex/render-recovery-review-fix`.
- Merge and push `codex/render-recovery-review-fix` only after performance evidence is clean or a verified code fix lands.

## Boundaries
- Keep HGO renderer, toolbar controls, render pass order, and zoom handler bodies out of this R0 repair.
- Main agent owns all perf, e2e, dev-server, and build/test live processes.
- Subagents may inspect files and completed logs only.

## Current Status
- [x] R0 docs/archive move submitted as `ddd94ba9`.
- [x] Perf blocker diagnosed with fresh evidence: stale `active_server.json` allowed a gate run to reuse the wrong worktree server.
- [x] `codex/render-recovery-review-fix` merged into `main` as `4cfb5e1d` after clean fresh perf evidence.
- [ ] Push is held: current HEAD `735d99f0` isolated perf gate still has repeated HOI4 `totalStartupMs` failures on this machine.
- [ ] R1 visual/pixel smoke and color-path diagnosis remain follow-up work.
