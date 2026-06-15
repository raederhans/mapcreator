# Housekeeping Review Fix Plan 2026-06-15

## Goal

Review the just-landed worktree housekeeping records, repair stale registry state, and keep the main checkout ready for future integration work.

## Scope

- Audit `docs/active/_worktree_registry.md` against live `git worktree list` and worktree statuses.
- Audit archived housekeeping records for misleading stale state.
- Preserve the main checkout's unrelated `lessons learned.md` local edit.
- Preserve `mapcreator-a11y-home-app-fix-20260615` as an active dirty worktree.
- Merge this review-fix branch to `main`, push, and remove the temporary review-fix worktree after validation.

## Acceptance Criteria

- Registry clearly separates current worktrees from cleaned recovery records.
- Registry owner/base/head rows match live evidence from 2026-06-15.
- A11y dirty-file evidence matches the current `git status --short --branch`.
- Review-fix task docs capture findings, validation, and integration guidance.
- `git diff --check` passes.
- Main remains dirty only because of the pre-existing `lessons learned.md` edit after merge.
