# Landing Review Fix Plan

- [x] Create isolated worktree from current `main`.
- [x] Load workflow skills, agent tiers, memory, and lessons.
- [x] Run independent static review lanes for code quality and architecture.
- [x] Locally inspect changed commit surfaces and identify confirmed findings.
- [x] Fix confirmed issues with the smallest scoped patches.
- [x] Run targeted checks and `verify:pages-dist`.
- [x] Run final review/bug/first-principles pass.
- [x] Update lessons learned only for durable new project rules.
- [x] Archive this task folder after verified completion.
- [ ] Commit, merge to `main`, push, and clean the temporary worktree.

## Acceptance Criteria

- No unresolved high/medium findings from independent review lanes.
- Source and `dist` remain synchronized.
- `npm.cmd run verify:pages-dist` passes after fixes.
- Final parent checkout is on `main` at pushed commit; only pre-existing unrelated dirt remains.
