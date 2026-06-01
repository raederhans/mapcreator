# Political Topology Review Fix Plan

## Scope
- Review the political topology repair from commit `0bf9dada` on top of current `main`.
- Fix only confirmed defects in the political topology path.
- Avoid transport rollout files except for read-only status checks.

## Tasks
- [x] Create isolated review worktree from current `main`.
- [x] Run independent code-review and architecture lanes.
- [x] Inspect high-risk geometry/id/test paths locally.
- [x] Patch confirmed defects with the smallest change.
- [x] Run targeted contracts and source/dist gates needed by the patch.
- [x] Archive this task folder after verification.
