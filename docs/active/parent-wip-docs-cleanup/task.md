# Parent WIP Docs Cleanup Task

## Checklist

- [x] Back up parent WIP patch.
- [x] Create cleanup branch from latest `origin/main`.
- [x] Create active docs.
- [x] Reapply verified archive deletions.
- [x] Merge `lessons learned.md` dedupe.
- [x] Update worktree registry.
- [x] Run docs validation.
- [ ] Commit, push branch, and fast-forward `origin/main`.
- [ ] Sync parent checkout safely.
- [ ] Archive task docs and clean temporary worktree if safe.

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
- `docs/active/parent-wip-docs-cleanup/{plan.md,context.md,task.md}`
- 47 deleted files under `docs/archive/*`

### Verification

- Directory-name reference scan completed; no deleted archive path dependency remains.
- `git diff --check -- "lessons learned.md" docs` passed with line-ending warnings only.

### Integration State

- Current branch: `codex/parent-wip-docs-cleanup`.
- Base: `origin/main@73e64166`.
- Parent WIP backup: `.runtime/cleanup-backups/parent-wip-classification-20260620T140804Z/parent-wip.patch`.
- Current status: ready for commit and push.
