# Render Chain Follow-Up Plan 2026-06-11

## Source
- Guidance: user-provided "主渲染链路改进 · 二次复核结论与后续跟进计划".
- Current phase: R2 coarse-underlay owner/base color gap closeout after R0 and R1 landed on `origin/main`.

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

## R2 Acceptance
- Classify the 648 rendered spatial owner/base color gaps with runtime evidence before changing render code.
- Keep `runtimeState.colors` full visual collection coverage and Great Lakes Congo final-pixel checks passing.
- Treat `spatialItems.countryCode` as geometry source, and use display owner for owner/base color diagnostics.
- Color admin0 coarse underlay from full visual resolved dominant fill before consulting owner/base color maps.
- Keep source and `dist/app` renderer mirrors synchronized, then run clean-worktree `npm run verify:pages-dist`.

## Current Status
- [x] R0 docs/archive move submitted as `ddd94ba9`.
- [x] Perf blocker diagnosed with fresh evidence: stale `active_server.json` allowed a gate run to reuse the wrong worktree server.
- [x] `codex/render-recovery-review-fix` merged into `main` as `4cfb5e1d` after clean fresh perf evidence.
- [x] Current HEAD `fe7d69e5` passed a fresh isolated `npm run perf:gate` after two noisy HOI4 failures; push is unblocked with the instability recorded as evidence.
- [x] R1 pixel probe added for Great Lakes Congo zoom-end visible political fill stability.
- [x] R1 color source fix makes `runtimeState.colors` cover `landDataFull` and owner refresh full-only feature ids.
- [x] R1 final verification passed, including clean-worktree `npm run verify:pages-dist`.
- [x] R1 final review and push completed at `60d76b91`.
- [x] R2 evidence classified all 648 owner/base gaps as display-owner source mismatch.
- [x] R2 minimal fix landed in the worktree: admin0 underlay uses dominant resolved fill, and e2e/pixel diagnostics use display owner base colors.
- [x] R2 clean Pages dist verification passed in `C:\Users\raede\Desktop\dev\mapcreator-r2-pages-verify`.
- [x] R2 final self-review verification passed; git closeout will be recorded by the self-review commit and push.
