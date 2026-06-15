# Worktree Housekeeping Plan 2026-06-15

## Goal

Clean local integrated or superseded worktrees while preserving recovery branches, commits, and the user's active local edits.

## Scope

- Remove local worktree directories that are clean and already marked integrated, integrated-selectively, or abandoned candidate.
- Update `docs/active/_worktree_registry.md` with cleanup evidence.
- Preserve `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` because it is locked and has local `index.html` edits.
- Preserve the main checkout's unrelated `lessons learned.md` edit.

## Acceptance Criteria

- `git worktree list` no longer lists cleaned local integrated reference worktrees.
- Registry records each cleanup candidate's recovery branch or commit.
- `git status --short --branch` in main still only shows the pre-existing `lessons learned.md` edit.
- Housekeeping branch is merged to `main`, pushed, and its temporary worktree is removed.

## Candidate Cleanup Set

- `mapcreator-audit-20260610-20260610-113750` - clean; commit `cf2a57a1`; contained by `origin/main`; keep local branch as recovery.
- `mapcreator-audit-20260612-appearance-transport` - clean; remote branch `origin/codex/audit-20260612-appearance-transport`; commit `01811500`.
- `mapcreator-data-chain-phases-2-4` - clean; remote branch `origin/codex/data-chain-phases-2-4`; commit `d858d276`.
- `mapcreator-data-quality-repair-2026-06-14` - clean; remote branch `origin/codex/data-quality-repair-2026-06-14`; commit `b856ceca`.
- `mapcreator-hoi4-strategic-values` - clean; remote branch `origin/codex/hoi4-strategic-values`; commit `979b20de`; contained by `origin/main`.
- `mapcreator-render-chain-cleanup` - clean; remote branch `origin/codex/render-chain-cleanup-phase4-5`; commit `8e89262e`.

## Explicitly Preserved

- `mapcreator-a11y-home-app-fix-20260615` - locked and dirty `index.html`.
- `mapcreator` main checkout - dirty `lessons learned.md`.
