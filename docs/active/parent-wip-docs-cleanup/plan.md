# Parent WIP Docs Cleanup Plan

## Goal

Classify and integrate the dirty parent checkout docs WIP from `C:\Users\raede\Desktop\dev\mapcreator` without editing that behind checkout directly.

## Scope

- Preserve the parent WIP patch under `.runtime/cleanup-backups/parent-wip-classification-20260620T140804Z/`.
- Reapply only the verified docs cleanup on a fresh branch from latest `origin/main`.
- Delete 17 stale archive directories after exact reference checks.
- Merge the `lessons learned.md` dedupe into the latest file state.
- Push both the cleanup branch and `origin/main`, then sync the parent checkout safely.

## Acceptance Gates

- `git diff --check -- "lessons learned.md" docs`
- exact reference check for deleted archive directory names
- `git status --short --branch` clean after commit
- post-push proof: `HEAD`, `origin/main`, and cleanup branch align
- parent checkout is clean and up to date, with the original WIP preserved in a named stash or patch backup
