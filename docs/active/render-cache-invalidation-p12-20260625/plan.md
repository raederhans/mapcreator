# P12 Render Cache Invalidation Authority Consolidation Plan

## Scope

Move render cache invalidation primitives into `js/core/renderer/render_cache_owner.js` while preserving the `map_renderer.js` wrapper names and public facade. Keep frame composition, draw passes, viewport/surface lifecycle, scenario refresh runtime, exact-after-settle scheduling, `dist/app/**`, state-write allowlist, and `public.js` out of scope.

## Classification

- Level: complex / integration.
- Live process owner: main Codex agent only.
- Subagents: static code mapping, test review, and code review lanes only; no live test or dev server ownership.

## Steps

1. Record worktree baseline and current registry truth.
2. Locate existing host invalidation primitives and owner return surface.
3. Move dirty/reason, reference-transform clear, interaction composite invalidation, and last-good-frame clear/stale mutation into `render_cache_owner.js`.
4. Keep `map_renderer.js` wrappers and host-only diagnostics/adjacent cache side effects.
5. Add owner behavior tests, boundary contract updates, architecture boundary checks, and package script.
6. Run targeted syntax, node, Python, architecture, allowlist, import graph, and main-thread E2E gates.
7. Request static review, fix findings, commit, push branch and `origin/main`, update registry closeout, and clean the worktree.

## Acceptance

- Owner owns the mutation primitives and returns summaries for host diagnostics.
- Host wrapper names remain stable and call `getRenderCacheOwner().*`.
- `renderPassToCache()` and `drawCanvas()` behavior stays unchanged.
- Forbidden files remain untouched.
- Validation commands from the P12 request pass or have documented pre-existing drift.
