# Worktree Housekeeping Task

## Status

integrated-and-cleaned

## Checklist

- [x] Create isolated housekeeping worktree.
- [x] Read current registry and `lessons learned.md`.
- [x] Identify clean cleanup candidates and preserved worktrees.
- [x] Remove eligible local worktree directories.
- [x] Update registry and task evidence.
- [x] Run static validation.
- [x] Commit and merge to main.
- [x] Push and clean housekeeping worktree.

## Verification Log

- `git worktree list` after cleanup - passed; only main, a11y, and housekeeping worktrees remain.
- `git status --short --branch` in main - preserved only pre-existing `lessons learned.md`.
- `git status --short --branch` in a11y worktree - dirty UI files preserved.
- `git diff --check` - passed.
- Review fix: updated stale registry rows for main, render-data-chain-split, data-chain-phase2/3, tooling-simplification-phase2, and the housekeeping validation note.
- Post-merge main validation passed:
  - `git worktree list`
  - `git status --short --branch`
  - `git diff --check`
- Main push completed and temporary housekeeping worktree was removed; remote branch remains at `c076d5e5` as a recovery record.
