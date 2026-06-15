# Worktree Registry

Last updated: 2026-06-15

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator`
- Integration branch: `main` closeout
- Base: `origin/main` at `691c933f` before final registry cleanup closeout
- Live test/build owner: main Codex agent only
- Subagents: static inspection/review only; no live tests, dev server, or browser processes delegated

## Recommended Order

1. Review and rebase `codex/a11y-home-app-fix-20260615`; it is clean and pushed, with shared UI, i18n, tests, and `dist/app` changes.
2. Recover `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` before integration; its active rebase is stopped on `docs/active/_worktree_registry.md`.
3. Re-check recovery refs before recreating any historical worktree.

## Current Worktrees

| Worktree | Branch / HEAD | Base | Status | Dirty / hot files | Evidence | Overlap risk | Integration action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator` | `main` / current registry closeout HEAD | `origin/main` `691c933f` before final cleanup closeout | active-main | user edit in `lessons learned.md` | `git status --short --branch` shows only the pre-existing `lessons learned.md` edit after final cleanup; use `git rev-parse HEAD` for the exact pushed closeout commit | Green; preserve the user edit | Integration target; stage only owned files while the user edit remains |
| `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` | `codex/a11y-home-app-fix-20260615` / `e3dfea57` | merge-base `9f0ef27a` with `origin/main` | ready-for-integration | shared UI, i18n, `dist/app`, and focused behavior tests relative to `origin/main` | `git status --short --branch` is clean and tracks `origin/codex/a11y-home-app-fix-20260615`; changed files include `index.html`, `css/style.css`, sidebar/toolbar JS, locale data, `dist/app`, and behavior tests | Red; direct registry-file overlap with current `main` and direct UI/dist/i18n overlap with localization | Rebase onto latest `main`, run UI/i18n/Pages gates, then integrate if green |
| `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` | detached rebase `HEAD` `02e39fa9`; branch ref `codex/localization-governance-20260615` -> `c2f36b02` | branch merge-base `988118d4` with `origin/main`; branch is ahead 1 and behind 1 | blocked-conflict-recovery | localization audit, locale data, TNO locale patch assets, `dist/app/js/ui/i18n_catalog.js`, `dist/pages-dist-manifest.json`, active docs, unresolved registry conflict | full `git status` reports interactive rebase in progress onto `02e39fa9`, staged localization/dist/doc/test/tool changes, and `UU docs/active/_worktree_registry.md`; `REBASE_HEAD` is `c2f36b02` | Red; unresolved registry conflict plus direct i18n/test overlap with a11y and delivery-surface manifest/mirror churn | Localization owner should resolve the registry conflict, continue or abort the rebase intentionally, then re-check against the final `main` HEAD |

## Current Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| main -> a11y | Red | Direct overlap in `docs/active/_worktree_registry.md`; keep current registry facts when a11y is rebased. |
| main -> localization-governance | Red | Direct overlap in `docs/active/_worktree_registry.md`; localization's current rebase is stopped on that registry file. |
| a11y -> localization-governance | Red | Direct overlap in `docs/active/_worktree_registry.md`, `tests/test_i18n_audit.py`, UI catalog/locales, and delivery-surface manifest/mirror files. TNO scenario locale assets are localization-owned risk unless a later a11y rebase touches them. |

## Recovery Records

These rows are branch or commit recovery indexes. They are historical references, not current worktrees.

| Former worktree | Recovery ref | HEAD commit | Removed at | Archived docs | Reopen condition |
| --- | --- | --- | --- | --- | --- |
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

- Main checkout is at the current pushed registry closeout HEAD and retains an unrelated user edit in `lessons learned.md`.
- Main Codex agent owns validation commands; child agents are read-only static reviewers.
- Historical delivery packages live in their archived task/context docs; active registry keeps current worktree rows and recovery indexes.
- 2026-06-15: `codex/housekeeping-review-fix-20260615` was merged, archived, and cleaned locally. Remote branch remains as recovery record at `64ae29be`.
- 2026-06-15 audit: previous registry state still described localization-governance with stale head and risk details; `691c933f` is the pushed recovery record for the first registry correction, `988118d4` is the pushed audit-worktree cleanup, and this follow-up records the observed localization rebase conflict state at target `02e39fa9`.
