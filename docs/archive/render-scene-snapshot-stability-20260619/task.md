# Render Scene Snapshot Stability Tasks

## Implementation

- [x] Add runtime scene snapshot fields and helper functions.
- [x] Thread scene snapshot through visible frame identity, last-good frame, interaction composite, worker identity, deferred full cache, and promotion metrics.
- [x] Record political data stage and fine/full readiness in political pass summaries and pass-cache metadata.
- [x] Gate trusted full political references and partial repaint on fine same-scene baseline.
- [x] Split coarse prewarm cache availability from trusted visible commit eligibility.
- [x] Add a single feature visual override write transaction.
- [x] Make scenario political background collection prefer `landDataFull`.
- [x] Document water/ocean region overrides as a separate `waterRegionOverrides` visual domain.
- [x] Include rollback restore in the scene/data generation contract.

## Tests

- [x] Extend scene/chunk contracts for first visible scene generation and coarse prewarm.
- [x] Extend render pipeline contracts for partial repaint trusted baseline.
- [x] Extend renderer runtime state contracts for snapshot fields/helpers.
- [x] Extend worker packet/currentness tests for scene snapshot.
- [x] Extend palette/runtime bridge tests for unified override behavior.
- [x] Extend rollback tests for visible chunk restore and scene/data generation invalidation.

## Verification

- [x] `node --check` on changed JS files.
- [x] Focused Node behavior tests.
- [x] Focused Python boundary contracts.
- [x] `npm run test:node:scenario-chunk-contracts`.
- [x] `npm run verify:pages-dist`.
- [x] `git diff --check`.
- [x] Final review self-check.

## Closeout

- [x] Update this context with delivery summary.
- [x] Update worktree registry if additional worktrees become active.
- [x] Update `lessons learned.md` only if a durable new project lesson emerges.
- [x] Commit with Lore trailers.
- [x] Push branch and, after integration, merge to `main` and push.
