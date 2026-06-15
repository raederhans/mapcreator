# Housekeeping Review Fix Task

## Status

in-progress

## Checklist

- [x] Create isolated review-fix worktree.
- [x] Read agent tier rules and current worktree evidence.
- [x] Start read-only review lanes.
- [x] Repair stale registry state.
- [x] Run validation.
- [ ] Commit, merge, push, and clean review-fix worktree.

## Findings Under Review

- Registry owner and base still referenced the cleaned housekeeping branch.
- Main registry row used older base text instead of current `7211640d`.
- A11y row summarized dirty files too loosely for future overlap checks.
- Static review found that active registry mixed current worktrees with cleaned recovery records. Fixed by splitting `Current Worktrees` from `Recovery Records`.
- Static review found stale old delivery-package text that made completed work look pending. Fixed by removing delivery packages from the active registry and keeping archive pointers.

## Verification Log

- Read-only code-review lane found stale old delivery package text, stale main base/head text, and missing review-fix worktree registration. Fixed.
- Read-only architect lane found that active registry mixed current worktrees with recovery records. Fixed by splitting `Current Worktrees` and `Recovery Records`.
- `rg` stale-state search passed; no old pending-merge text remains in active registry.
- `git diff --check` passed; only the expected Windows line-ending warning was printed for `docs/active/_worktree_registry.md`.
- `git worktree list --porcelain` captured current main, a11y, review-fix, and localization-governance worktrees.
- `git status --short --branch` evidence:
  - main: only pre-existing `lessons learned.md` user edit.
  - a11y: dirty shared UI/i18n/dist/test files preserved.
  - localization-governance: clean at `origin/main`.
  - review-fix: registry and active review-fix docs only.
- `node tools/select_verification_targets.mjs docs/active/_worktree_registry.md docs/active/housekeeping-review-fix-20260615/plan.md docs/active/housekeeping-review-fix-20260615/context.md docs/active/housekeeping-review-fix-20260615/task.md --json` returned no recommended commands.
