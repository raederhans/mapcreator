# TNO Startup Review Fix Plan

## Scope

Review commit `7bf1181` (`7bf1181^..7bf1181`) for startup scenario chunk visual readiness regressions. Preserve unrelated dirty work in the main checkout by working from a clean review worktree.

## Acceptance

- Code-review and architecture lanes finish with file/line findings or an explicit no-issue result.
- Any confirmed issue is fixed in the review worktree with targeted tests.
- Main checkout user WIP remains untouched.

## Tasks

- [x] Create clean review worktree from `origin/main`.
- [x] Run parallel code-review and architecture review lanes.
- [x] Inspect the diff locally for runtime, rollback, cache, and test-contract risks.
- [ ] Fix confirmed issues and run targeted verification.
- [ ] Archive the task notes or clean them up according to whether a repo change is needed.
