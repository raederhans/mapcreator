# Module Boundary Continuation Plan

## Objective

Finish the remaining module-boundary slimming work in staged worktrees, starting with the renderer shell and ending with boundary guardrails plus final QA.

## Phase Checklist

- [x] Create Phase A worktree from `main@4ea5252e`.
- [x] Establish active task docs for the continuation.
- [x] Extract exact-after-settle refresh plan policy from `js/core/map_renderer.js`.
- [x] Add a named Node behavior entry for the new exact-after-settle plan module.
- [x] Rebuild Pages dist for the new browser module.
- [x] Run Phase A review gates.
- [x] Commit, integrate Phase A into main, push, and checkpoint.
- [ ] Phase B: split sidebar/toolbar UI shell.
- [ ] Phase C: split backend preview app shell.
- [ ] Phase D: add boundary and module budget guardrails.
- [ ] Final UltraQA, independent review, worktree cleanup, and archive.

## Acceptance Criteria

- Public renderer facade and scenario bridge behavior stay stable.
- `map_renderer.js` keeps runtimeState mutation, render requests, canvas work, deferred handles, and exact-after-settle execution.
- New modules own pure plan/policy decisions with focused behavior tests.
- Each phase has registry evidence, targeted tests, ai-slop scan, over-engineering review, and integration instructions.
- Main is pushed only after post-merge verification.

## Live Process Ownership

- Main Codex agent owns all test/build/dev-server/live-process commands.
- Subagents stay read-only unless explicitly assigned a disjoint write scope.
- No child agent may monitor or retry the same live process.
