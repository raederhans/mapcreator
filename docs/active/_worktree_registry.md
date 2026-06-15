# Worktree Registry

Last updated: 2026-06-15

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator`
- Integration branch: `codex/housekeeping-review-fix-20260615`
- Base: `origin/main` at `7211640d`
- Live test/build owner: main Codex agent only
- Subagents: static inspection/review only; no live tests, dev server, or browser processes delegated

## Recommended Order

1. Complete and merge `codex/housekeeping-review-fix-20260615` because it only repairs registry and review-fix docs.
2. Preserve `codex/a11y-home-app-fix-20260615` because it has active local UI edits.
3. Leave `codex/localization-governance-20260615` untouched unless its owner assigns integration work; it is currently clean.
4. Re-check recovery refs before recreating any historical worktree.

## Current Worktrees

| Worktree | Branch / HEAD | Base | Status | Dirty / hot files | Evidence | Overlap risk | Integration action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator` | `main` / `7211640d` | `origin/main` `7211640d` | active-main | user edit in `lessons learned.md` | `git status --short --branch` shows only the pre-existing `lessons learned.md` edit; `HEAD` matches `origin/main` at review start | Green for review-fix; preserve the user edit | Fast-forward review-fix after validation |
| `C:\Users\raede\Desktop\dev\mapcreator-housekeeping-review-fix-20260615` | `codex/housekeeping-review-fix-20260615` / `7211640d` | `origin/main` `7211640d` | in-progress | `docs/active/_worktree_registry.md`, `docs/active/housekeeping-review-fix-20260615/*` | Created from current `origin/main`; static review lanes are read-only | Green by file path vs a11y UI worktree | Commit, merge, push, then clean temporary worktree |
| `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` | `codex/a11y-home-app-fix-20260615` / `9f0ef27a` | `origin/main` `9f0ef27a` | in-progress-elsewhere | dirty shared UI, i18n, dist mirror, and focused behavior test files; exact list in `docs/active/housekeeping-review-fix-20260615/context.md` | Current status captured during review-fix; preserved because it is dirty and outside this task | Red for future UI/dist integration | Leave untouched |
| `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` | `codex/localization-governance-20260615` / `7211640d` | `origin/main` `7211640d` | in-progress-elsewhere-clean | none | `git status --short --branch` is clean; `HEAD` matches `origin/main` at review validation | Green for review-fix; no changed files | Leave untouched |

## Current Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| review-fix -> main | Green | Review-fix only changes registry/task docs; main has a user edit in `lessons learned.md`. |
| review-fix -> a11y | Green | No file overlap with the a11y dirty status list captured in the review-fix context. |
| review-fix -> localization-governance | Green | Localization-governance has no local changes at review validation. |
| main -> a11y | Yellow | Main is clean relative to `origin/main` except `lessons learned.md`; a11y touches shared UI/dist files and should be integrated in its own UI lane. |
| a11y -> localization-governance | Green | Localization-governance has no local changes at review validation. |

## Recovery Records

These rows are branch or commit recovery indexes. They are historical references, not current worktrees.

| Former worktree | Recovery ref | HEAD commit | Removed at | Archived docs | Reopen condition |
| --- | --- | --- | --- | --- | --- |
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

- Main checkout is at pushed `7211640d` and retains an unrelated user edit in `lessons learned.md`.
- `codex/housekeeping-review-fix-20260615` owns only registry and review-fix docs for this task.
- Main Codex agent owns validation commands; child agents are read-only static reviewers.
- Historical delivery packages live in their archived task/context docs; active registry keeps current worktree rows and recovery indexes.
- 2026-06-15: started `codex/housekeeping-review-fix-20260615` from `origin/main` `7211640d` to audit and repair stale housekeeping registry state.
