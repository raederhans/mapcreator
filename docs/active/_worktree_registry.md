# Worktree Registry

Last updated: 2026-06-16

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator`
- Integration branch: `main` closeout
- Base: `main` is aligned with `origin/main` at `4203b56d`
- Live test/build owner: main Codex agent only
- Subagents: static inspection/review only; no live tests, dev server, or browser processes delegated

## Recommended Order

1. No active implementation worktree remains after the a11y integration closeout.
2. Re-check recovery refs before recreating any historical worktree.
3. Branch cleanup should be handled as a separate action after classifying merged recovery refs and still-active topic branches.

## Current Worktrees

| Worktree | Branch / HEAD | Base | Status | Dirty / hot files | Evidence | Overlap risk | Integration action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator` | `main` / `4203b56d` | aligned with `origin/main` | active-main | clean | `git worktree list --porcelain` lists only main; `git status --short --branch` reports `## main...origin/main` | Green | No worktree integration action remains |

## Current Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| none | Green | Only `main` remains active after the a11y integration closeout. |

## Recovery Records

These rows are branch or commit recovery indexes. They are historical references, not current worktrees.

| Former worktree | Recovery ref | HEAD commit | Removed at | Archived docs | Reopen condition |
| --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` | `main` / former branch `codex/localization-governance-20260615` | `4711b0dd` | 2026-06-15 | `docs/archive/localization-governance-20260615/` | Inspect `4711b0dd` and archived docs when auditing localization governance ownership changes. |
| `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` | `origin/codex/a11y-home-app-fix-20260615` | `55f143de` | 2026-06-15 | `docs/archive/a11y-home-app-fix-20260615/` | Inspect branch/docs when auditing homepage and app-page accessibility fixes. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260615-registry-closeout` | `origin/main` | `691c933f` | 2026-06-15 | `docs/archive/housekeeping-review-fix-20260615/` | Inspect `691c933f` when auditing this automation's registry correction. |
| `C:\Users\raede\Desktop\dev\mapcreator-housekeeping-review-fix-20260615` | `origin/codex/housekeeping-review-fix-20260615` | `64ae29be` | 2026-06-15 | `docs/archive/housekeeping-review-fix-20260615/` | Inspect branch/docs when auditing this registry review fix. |
| `C:\Users\raede\Desktop\dev\mapcreator-worktree-housekeeping-20260615` | `origin/codex/worktree-housekeeping-20260615` | `c076d5e5` | 2026-06-15 | `docs/archive/worktree-housekeeping-20260615/` | Inspect branch/docs when auditing cleanup history. |
| `C:\Users\raede\Desktop\dev\mapcreator-e2e-route-contract-repair-20260615` | `origin/codex/e2e-route-contract-repair-20260615` | `f4d16b20` | 2026-06-15 | `docs/archive/e2e-route-contract-repair-20260615/` | Inspect branch/docs when auditing E2E route contract repairs. |
| `C:\Users\raede\Desktop\dev\mapcreator-render-data-chain-split-20260615` | `origin/codex/render-data-chain-split-20260615` | `b8727d42` | 2026-06-15 | `docs/archive/render-data-chain-split-20260615/` | Inspect branch/docs when auditing render/data split work. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phase2-3-deepening-2026-06-14` | `origin/codex/data-chain-phase2-3-deepening-2026-06-14` | `b1db07b1` | earlier cleanup | prior active/docs history | Inspect branch when recovering phase 2/3 transport deepening details. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14` | `codex/data-chain-integration-2026-06-14` | `77d18776` | earlier cleanup | prior active/docs history | Inspect branch when recovering data-chain integration decisions. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-quality-repair-2026-06-14` | `origin/codex/data-quality-repair-2026-06-14` | `b856ceca` | 2026-06-15 | prior active/docs history | Inspect branch when recovering scenario/data/catalog repair details. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phases-2-4` | `origin/codex/data-chain-phases-2-4` | `d858d276` | 2026-06-15 | prior active/docs history | Inspect branch when recovering phase 2-4 helper consolidation details. |
| `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup` | `origin/codex/render-chain-cleanup-phase4-5` | `8e89262e` | 2026-06-15 | prior active/docs history | Inspect branch when recovering render-chain cleanup details. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260612-appearance-transport` | `origin/codex/audit-20260612-appearance-transport` | `01811500` | 2026-06-15 | prior active/docs history | Inspect branch when recovering appearance/transport audit details. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260610-20260610-113750` | `audit/20260610-appearance-transport-20260610-113750` | `cf2a57a1` | 2026-06-15 | prior active/docs history | Inspect local branch when recovering old audit preservation details. |
| `C:\Users\raede\Desktop\dev\mapcreator-hoi4-strategic-values` | `origin/codex/hoi4-strategic-values` | `979b20de` | 2026-06-15 | prior active/docs history | Inspect branch when recovering HOI4 strategic values details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` | `origin/codex/tooling-simplification-phase2` | `9a5febfe` | earlier cleanup | prior active/docs history | Inspect branch when recovering tooling phase 2 details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase3` | `origin/codex/tooling-simplification-phase3` | `e296e660` | earlier cleanup | prior active/docs history | Inspect branch when recovering tooling phase 3 details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase4a` | `origin/codex/tooling-simplification-phase4a` | `16360a6f` | earlier cleanup | prior active/docs history | Inspect branch when recovering tooling phase 4A details. |

## Active Notes

- Main checkout is clean and aligned with `origin/main`.
- Main Codex agent owns validation commands; child agents are read-only static reviewers.
- Historical delivery packages live in their archived task/context docs; active registry keeps current worktree rows and recovery indexes.
- 2026-06-15: `codex/housekeeping-review-fix-20260615` was merged, archived, and cleaned locally. Remote branch remains as recovery record at `64ae29be`.
- 2026-06-15 localization governance: `4711b0dd` was fast-forward merged into main, validated on main, archived, pushed through the registry closeout, and cleaned from the active worktree list.
- 2026-06-15 a11y home/app fix: `55f143de` was rebased onto current main, validated with i18n, behavior, Pages dist, and a11y scan gates, fast-forwarded into main, and archived for cleanup.
- 2026-06-16 worktree cleanup: removed two unregistered local directory remnants with no `.git`: `C:\Users\raede\Desktop\dev\mapcreator-hgo-review-fix` and `C:\Users\raede\Desktop\dev\mapcreator-ocean-scotia-source-refinement-2026-06-02`. Recovery docs remain under `docs/archive/`.
