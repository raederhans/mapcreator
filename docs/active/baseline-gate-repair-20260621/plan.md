# Baseline Gate Repair 2026-06-21 Plan

## Stage A1 - Architecture Boundary

1. Reproduce the `verify:architecture-boundaries` failure on a clean `origin/main` worktree.
2. Reduce `js/core/map_renderer.js` by extracting existing focused behavior into an owner module.
3. Strengthen the architecture checker and boundary tests so the owner relationship remains explicit.
4. Run targeted syntax, checker, import graph, renderer/runtime tests, and Pages dist verification.
5. Commit with Lore trailers and prepare for integration.

## Stage A2 - State Write Allowlist

1. Reproduce `verify:state-write-allowlist` on a clean branch after A1.
2. Identify the writer that violates state ownership.
3. Repair the writer path with the smallest state-owner compatible change.
4. Run targeted allowlist and related runtime tests.
5. Commit, integrate, and push main after both Stage A repairs pass.
