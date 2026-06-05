# Plan

## Acceptance Criteria

- `git fetch origin --prune` has refreshed remote references.
- Every worktree is classified as clean/dirty, committed/uncommitted, and merged/unmerged.
- Useful main dirty changes are committed on `main`; local `.omx` runtime noise is preserved outside the commit path.
- Each worktree branch with unique commits is merged or explicitly skipped with evidence.
- Conflicts are resolved by preserving behavior, performance, and source/dist contracts.
- Relevant targeted tests and `verify:pages-dist` pass after integration.
- Final code review/self-check is complete before push/cleanup.

## Steps

- [x] Load project guidance, lessons, and relevant workflow skills.
- [x] Fetch remote refs and list worktrees.
- [ ] Snapshot all dirty diffs and branch diffs into `.runtime/git-closeout/`.
- [ ] Inspect branch commit/diff surfaces and choose merge order.
- [ ] Isolate `.omx/metrics.json` runtime noise from `main`.
- [ ] Commit current main product/docs/test changes.
- [ ] Merge worktree branches into `main` one by one.
- [ ] Resolve conflicts and rerun focused checks after each risky merge.
- [ ] Run final verification and review.
- [ ] Push `main`.
- [ ] Remove worktrees whose content is safely merged.

## Live Process Ownership

Main thread owns all live tests, builds, dev servers, browser sessions, and long-running commands. Subagents may only do static Git/code review and may read finished logs.
