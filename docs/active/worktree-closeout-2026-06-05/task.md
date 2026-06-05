# Worktree closeout 2026-06-05

## Goal

Merge the current mapcreator worktrees back into `main` safely, preserving useful code/docs/test work and keeping the local checkout current with `origin/main`.

## Scope

- Main checkout dirty work.
- Worktree branches listed by `git worktree list --porcelain`.
- Conflict review, targeted verification, commit, push, and safe cleanup of merged worktrees.

## Safety Rules

- Create recoverable patch snapshots before merge operations.
- Treat `.omx` runtime state as local operational state unless evidence shows it is intentional product data.
- Keep live tests/builds under main-thread ownership.
- Preserve `dist/app` parity when source or checked-in delivery files change.

## Stop Condition

`main` contains the accepted work, verification has fresh evidence, pushed state is current, and only intentionally local ignored runtime artifacts remain.
