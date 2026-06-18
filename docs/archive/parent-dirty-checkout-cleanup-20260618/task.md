# Parent Dirty Checkout Cleanup Delivery Package

## What Changed

1. Audited the former dirty parent checkout against `origin/main`.
2. Preserved recovery evidence with both a file-level backup and a git stash.
3. Switched the parent checkout to clean `main@8f289606`.
4. Updated the worktree registry to show the parent checkout as clean.
5. Added this archive record for future recovery and audit.

## Files

Core files: none.

Test files: none.

Documentation files:

- `docs/active/_worktree_registry.md`
- `docs/archive/parent-dirty-checkout-cleanup-20260618/plan.md`
- `docs/archive/parent-dirty-checkout-cleanup-20260618/context.md`
- `docs/archive/parent-dirty-checkout-cleanup-20260618/task.md`

Runtime backup files:

- `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/tracked-working-tree.patch`
- `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/untracked-files.zip`
- `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/status-short.txt`
- `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/tracked-vs-origin-main.tsv`
- `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/untracked-vs-origin-main.tsv`

## Diff Summary

This delivery is docs-only. It records that the parent checkout is clean on `main`, and it adds the backup/stash recovery path for the previous dirty WIP.

## Commit State

This cleanup is ready for the docs-only closeout commit after final review.

## Base And Branch

- Former parent branch: `codex/tno-political-color-recovery@a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`
- Current parent branch: `main@8f2896060e5f3d9f461db56bdf30a0f5e1915def`
- Current base: `origin/main@8f2896060e5f3d9f461db56bdf30a0f5e1915def`

## Conflict Analysis

- Green: future work from `main` starts from a clean checkout.
- Yellow: forensic recovery from the stash should use targeted files and compare against current owners.
- Red: applying the old stash wholesale would restore stale renderer, dist, package, test, registry, and generated asset residue.

## Verification

- `git worktree list`: one parent checkout on `main@8f289606`.
- `git status --short`: clean after stash and switch, before this docs-only update.
- `git rev-parse HEAD`: `8f2896060e5f3d9f461db56bdf30a0f5e1915def`.
- `git rev-parse origin/main`: `8f2896060e5f3d9f461db56bdf30a0f5e1915def`.
- `git rev-parse 'stash@{0}'`: `3a251933f031959dbe303700ed0cebd6e77486d3`.

## Remaining Risk

The old stash is intentionally broad. It should be treated as recovery material only and inspected file by file before applying any content to current `main`.

## Recommendation

Commit and push this docs-only cleanup record, then keep developing from clean `main`.
