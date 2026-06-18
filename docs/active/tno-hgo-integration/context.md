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

## Integration Principles

- Current `origin/main` is already the TNO-preserving base.
- HGO goes on top because it is a clean commit from current `origin/main` and was independently validated.
- In `drawPoliticalPass`, HGO runtime preview visibility owns the top-level skip; normal rendering then keeps TNO pending edit tracking and clearing.
- Unrelated landing and old main drift from the parent checkout stays out of this branch.
