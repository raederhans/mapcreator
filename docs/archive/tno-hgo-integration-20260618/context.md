# TNO + HGO Integration Context

## 2026-06-18

- Started integration from clean worktree `C:\Users\raede\.codex\worktrees\mapcreator-tno-hgo-integration`.
- Base branch: `origin/main@1206eb43`.
- Integration branch: `codex/tno-hgo-integration`.
- Parent checkout remains dirty and is used only as a source for scoped TNO patch extraction.
- HGO source branch is clean at `7a95e26c`.
- Static review subagents are assigned to:
  - classify TNO dirty files into required scoped fix vs unrelated drift;
  - review HGO/TNO semantic overlap in `map_renderer.js`.
- Both static review lanes reported that the scoped TNO fix already exists in `origin/main@1206eb43`.
- Direct grep in the integration worktree confirmed `pendingPoliticalColorEdit`, `orderPoliticalShellUnderlayFirst`, and related tests are present in the base.
- The parent checkout's landing/dist dirty files are branch-age drift and stay out of this branch.
- HGO commit `7a95e26c` was cherry-picked as `9494ca52`.
- Cherry-pick conflict was limited to `docs/active/_worktree_registry.md`; renderer code had no text conflict.
- Static read of `drawPoliticalPass` confirmed HGO preview ready early return is first, followed by normal TNO pending political color edit handling.
- `verify:pages-dist` initially failed because the integration worktree had checked out `landing/assets/work-*.json` as CRLF before HGO `.gitattributes` rules were applied. Converting those working-tree bytes to LF and rerunning passed; no tracked diff remained after renormalization.

## Integration Principles

- Current `origin/main` is already the TNO-preserving base.
- HGO goes on top because it is a clean commit from current `origin/main` and was independently validated.
- In `drawPoliticalPass`, HGO runtime preview visibility owns the top-level skip; normal rendering then keeps TNO pending edit tracking and clearing.
- Unrelated landing and old main drift from the parent checkout stays out of this branch.

## Verification Log

- HGO node tests: 39/39 passed.
- Renderer runtime state node test: 9/9 passed.
- Scenario chunk node contract: 43/44; known existing red point is `hoverFacilityAndCityProbeMetricsRemainNamed`.
- HGO render pipeline boundary unittest: 5/5 passed.
- TNO political progressive E2E: 3/3 passed.
- Pages dist verification: builder, 37 startup shell tests, and 8 landing node tests passed.
- JS syntax checks passed for touched renderer/HGO files.
- `git diff --check` passed.
