# Parent WIP Docs Cleanup Task

## Checklist

- [x] Back up parent WIP patch.
- [x] Create cleanup branch from latest `origin/main`.
- [x] Create active docs.
- [x] Reapply verified archive deletions.
- [x] Merge `lessons learned.md` dedupe.
- [x] Update worktree registry.
- [x] Run docs validation.
- [x] Commit cleanup.
- [x] Archive task docs.
- [ ] Push branch and fast-forward `origin/main`.
- [ ] Sync parent checkout safely.
- [ ] Clean temporary worktree after parent sync.

## Delivery Package Draft

### Changed What

1. Removed 17 stale archive directories from the parent checkout WIP.
2. Merged the `dist/assets/*.json` byte-contract lesson into the existing source/dist rule.
3. Removed four narrow or duplicate lesson entries.
4. Recorded parent WIP backup and replay rationale in active docs.
5. Updated the worktree registry for the cleanup branch.

### Files

Docs:

- `lessons learned.md`
- `docs/active/_worktree_registry.md`
- `docs/archive/parent-wip-docs-cleanup-20260620/{plan.md,context.md,task.md}`
- 47 deleted files under `docs/archive/*`

### Diff Summary

- Functional cleanup commit `e36f3016`: 52 files changed, 106 insertions, 859 deletions.
- Closeout commit scope: move cleanup docs from active to archive and update registry state.

### Verification

- Directory-name reference scan completed; no deleted archive path dependency remains.
- `git diff --check -- "lessons learned.md" docs` passed with line-ending warnings only.

### Integration State

- Current branch: `codex/parent-wip-docs-cleanup`.
- Base: `origin/main@73e64166`.
- Functional cleanup commit: `e36f3016`.
- Parent WIP backup: `.runtime/cleanup-backups/parent-wip-classification-20260620T140804Z/parent-wip.patch`.
- Commit status: cleanup committed; closeout docs staged for final commit.
- Base/main divergence: one cleanup commit ahead before closeout commit; no upstream changes observed at commit time.
- Conflict check: docs-only changes; shared files are `docs/active/_worktree_registry.md` and `lessons learned.md`.
- Recommendation: push the feature branch, fast-forward `origin/main`, stash the covered parent WIP for recovery, pull parent `main`, then remove the temporary cleanup worktree.

### Unverified Risk

- Full app/test suite was skipped because this change deletes stale docs and edits lessons/registry only.
