# HGO Render Continuity Stop-Bleed Plan

## Goal

Prevent HGO runtime preview from producing visible empty, transparent, or stale-mode frames while preserving the existing vector scenario render path.

## Success Criteria

- HGO preview does not clear or commit any target canvas when the preview is disabled, loading, or not ready.
- Vector scenario active pass lists exclude `hgoPreview` while HGO preview is not ready.
- HGO preview frames commit only after staging validation confirms projected pixels exist and enough projected pixels resolved to real colors.
- A rejected HGO frame keeps the previous visible frame or pass cache and records a rejection reason in existing render perf metrics.
- Targeted HGO, render-pass, exact-after-settle, and public contract tests pass.

## Implementation Steps

1. Record the execution context in `context.md` and maintain `task.md` as each step finishes.
2. Add or adjust focused tests for:
   - HGO owner no-op before ready.
   - Active vector pass filtering of `hgoPreview`.
   - HGO staged commit rejection for empty or low-resolution color frames.
   - Exact-after-settle pass policy when HGO is active.
3. Implement the smallest render-owner changes:
   - Filter HGO preview out of non-HGO active pass lists.
   - Move ready checks before target canvas reset.
   - Return a commit status from `drawPreviewPass`.
4. Update render pass cache commit handling so an explicit `committed: false` draw result does not mark the pass clean or valid.
5. Add HGO staging validation and metrics using the existing `renderPerfMetrics` surface.
6. Run focused verification, then final review and QA gates.

## Validation Plan

- `npm run test:node:hgo-runtime-preview`
- `npm run test:node:hgo-raster-renderer`
- `npm run test:node:hgo-projection-model`
- `npm run test:node:hgo-identity-resolver`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_public_contract -q`
- `npm run verify:hgo-runtime-poc`
- `npm run test:e2e:dev:political-progressive-recovery` as the single-owner browser/live lane if earlier gates are green.

## Constraints

- Work in the isolated `C:\Users\raede\Desktop\dev\mapcreator-hgo-render-continuity` worktree.
- Preserve unrelated dirty changes in the parent `C:\Users\raede\Desktop\dev\mapcreator` checkout.
- Do not introduce new dependencies.
- Do not update README.
- Use existing render metrics and pass/cache abstractions.
