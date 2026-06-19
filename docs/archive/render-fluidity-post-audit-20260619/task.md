# Render Fluidity Post-Audit Task - 2026-06-19

## Delivery Package Draft

1. Changed accepted worker bitmap handling so ready bitmap frames skip the main-thread political background fill.
2. Locked the draw order in the scenario chunk contract suite.
3. Kept source and `dist/app` renderer mirrors aligned.
4. Preserved the dirty parent checkout by using a clean audit worktree.
5. Re-ran the focused renderer, worker, perf, import graph, Pages dist, and diff checks.

## Files

- Core: `js/core/map_renderer.js`
- Dist mirror: `dist/app/js/core/map_renderer.js`
- Tests: `tests/scenario_chunk_contracts.test.mjs`
- Docs: `docs/active/render-fluidity-post-audit-20260619/{plan,context,task}.md`

## Integration State

- Commit: `a2577335`.
- Base commit: `da191163`.
- Current main divergence: parent checkout is behind and dirty; audit branch starts at latest `origin/main`.
- Overlap risk: yellow for future renderer/perf work because this touches `map_renderer.js`.
- Recommended action: push closeout registry update, then remove the audit worktree. Recovery is available through commit `a2577335` and branch `origin/codex/render-fluidity-post-audit`.
