# Worktree Closeout Plan

## Goal

Bring all local mapcreator worktrees back into one clean pushed `main` state, preserving finished work and deleting only worktrees whose content is merged.

## Steps

- [x] List all worktrees and branch tracking state.
- [x] Inspect dirty files before any merge or deletion.
- [ ] Commit and verify current `main` work.
- [ ] Commit or replay dirty `backend-admin-ui-preview` work.
- [ ] Merge remaining worktree branches into `main`.
- [ ] Push `main`.
- [ ] Remove merged worktrees and prune stale records.
- [ ] Run final status and clean-worktree check.

## Live Process Ownership

Main thread owns all tests, builds, pushes, merges, and worktree deletion for this closeout.
