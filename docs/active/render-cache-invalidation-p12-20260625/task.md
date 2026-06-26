# P12 Task

## Checklist

- [x] Read request, AGENTS rules, lessons learned, and relevant memory.
- [x] Create isolated worktree from latest `origin/main`.
- [x] Record task plan/context.
- [x] Implement render cache owner invalidation methods.
- [x] Preserve `map_renderer.js` wrappers and host diagnostics.
- [x] Add owner behavior test and package script.
- [x] Update Python boundary contract and architecture boundary checker.
- [x] Run requested validation commands.
- [x] Run static review lanes and fix blocking findings.
- [ ] Commit with Lore trailers, push branch and `origin/main`.
- [ ] Update registry closeout, archive docs, remove worktree.

## Delivery Package

1. What changed:
   - `render_cache_owner.js` now owns render-pass dirty/reason invalidation, reference-transform clearing, last-good-frame invalidation/clear, and interaction-composite invalidation.
   - Owner mutation methods return a versioned summary envelope with requested/normalized/dropped pass names plus host follow-up flags.
   - `map_renderer.js` keeps stable wrapper names and consumes owner summaries for diagnostics, continuity metrics, political path cache invalidation, and interaction border snapshot invalidation.
   - Added focused owner behavior tests and strengthened Python/Node architecture contracts around the owner/host boundary.
   - Kept `renderPassToCache()`, `drawCanvas()`, `public.js`, `dist/app/**`, and state-write allowlist out of this change.

2. Changed files:
   - Core: `js/core/renderer/render_cache_owner.js`, `js/core/map_renderer.js`.
   - Tests: `tests/render_cache_owner_invalidation_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_map_renderer_render_cache_owner_boundary_contract.py`.
   - Tooling/package: `tools/check_architecture_boundaries.mjs`, `package.json`.
   - Docs: `docs/active/render-cache-invalidation-p12-20260625/*`, `docs/active/_worktree_registry.md`.
   - Temporary files: no retained temporary files; E2E `node_modules` junction was removed.

3. Diff summary:
   - Owner gains mutation primitives and summary contract.
   - Host loses direct invalidation state writes and keeps wrapper/orchestration duties.
   - Tests and architecture checks now assert the new split and summary contract.

4. Commit state:
   - Commit pending at this checkpoint. Next step is `git add -A`, final status check, Lore commit, branch push, and fast-forward push to `origin/main`.

5. Base/main divergence:
   - Worktree base is `origin/main@456b05130b37c2a7f8364c2a5a6a8430957388e8`.
   - Parent local main remains behind and dirty with unrelated archive-doc cleanup WIP.

6. Conflict/overlap review:
   - Yellow overlap with prior P9-P11 renderer extraction surfaces: `js/core/map_renderer.js`, architecture checker, package scripts, and scenario chunk contracts.
   - Green against parent checkout WIP because this worktree is isolated and parent source files were not edited.

7. Validation:
   - Syntax checks passed for modified JS/tool/test files.
   - Node/Python/architecture/governance gates passed: owner 6/6, render pass catalog 6/6, invalidation catalog 6/6, host inventory 7/7, runtime state 10/10, diagnostics 21/21, scenario refresh 23/23, exact-after-settle 8/8, canvas layer 4/4, scenario chunk 57/57, Python boundary 4/4, architecture, state-write allowlist, import graph.
   - E2E passed: TNO ready-state 5/5 and smoke 4/4. Smoke kept expected local auth `401` plus D3-unsafe water warnings.
   - `git diff --check` passed with only LF/CRLF warnings.

8. Remaining risk:
   - The owner summary envelope is new contract surface; tests now lock the required fields.
   - Browser smoke still reports known local auth `401` and D3 water geometry warnings; both are outside P12.

9. Recommended next step:
   - Merge by fast-forwarding this worktree commit into `origin/main`, then archive this doc folder, move the registry row to recent integrated, push the closeout commit, and remove the temporary worktree.

10. Integration readiness:
   - Ready for integration after staging untracked test/docs with `git add -A`.
