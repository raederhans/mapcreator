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

## R1 Acceptance
- Add a browser pixel regression for TNO zoom/shrink political color visibility.
- Diagnose permanent missing-color candidates through feature id, resolved color, owner/base color, and spatial/full collection coverage.
- Keep fixes limited to color resolution source consistency unless evidence points to spatial index or detail-promotion ownership.
- Preserve owner/base color gaps as R2 coarse-underlay evidence when resolved colors and final pixels are healthy.

## Current Status
- [x] R0 docs/archive move submitted as `ddd94ba9`.
- [x] Perf blocker diagnosed with fresh evidence: stale `active_server.json` allowed a gate run to reuse the wrong worktree server.
- [x] `codex/render-recovery-review-fix` merged into `main` as `4cfb5e1d` after clean fresh perf evidence.
- [x] Current HEAD `fe7d69e5` passed a fresh isolated `npm run perf:gate` after two noisy HOI4 failures; push is unblocked with the instability recorded as evidence.
- [x] R1 pixel probe added for Great Lakes Congo zoom-end visible political fill stability.
- [x] R1 color source fix makes `runtimeState.colors` cover `landDataFull` and owner refresh full-only feature ids.
- [x] R1 final verification passed, including clean-worktree `npm run verify:pages-dist`.
- [ ] R1 final review, commit amendment, and push remain open.
- [ ] R2 coarse-underlay owner/base color gaps remain follow-up work.
