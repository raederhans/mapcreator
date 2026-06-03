# Worktree Closeout Plan

## Goal

Bring all local mapcreator worktrees back into one clean pushed `main` state, preserving finished work and deleting only worktrees whose content is merged.

## Steps

- [x] List all worktrees and branch tracking state.
- [x] Inspect dirty files before any merge or deletion.
- [ ] Commit current `main` doc cleanup without runtime metric drift.
- [ ] Replay branch commits onto latest `origin/main` in a clean integration path.
- [ ] Merge integrated work back into `main`.
- [ ] Push `main`.
- [ ] Remove merged worktrees and prune stale records.
- [ ] Run final status and clean-worktree check.

## Live Process Ownership

Main thread owns all tests, builds, pushes, merges, and worktree deletion for this closeout.
Current live-process owner: main thread. No child agent may start, poll, retry, or interpret builds, tests, browser sessions, or worktree removal.
