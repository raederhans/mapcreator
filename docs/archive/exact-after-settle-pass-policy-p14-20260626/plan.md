# P14 Exact-After-Settle Pass Policy Catalog Alignment

## Goal

Move exact-after-settle pass policy ownership into a pure renderer catalog while preserving the existing refresh-plan compatibility exports and renderer behavior.

## Constraints

- Base: clean isolated worktree from `origin/main@df3f54670ae9afb11dbc6455d6fe5e19e727b5a5`.
- Keep parent checkout WIP untouched.
- Do not edit `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.
- Do not change DOM, canvas, SVG, projection, zoom lifecycle, `exact_after_settle_scheduler` timing/state-machine behavior, or `scenario_refresh_runtime.js`.
- Main Codex agent owns all live tests and E2E commands.

## Plan

1. Add `js/core/renderer/exact_after_settle_pass_catalog.js` for exact-after-settle deferred, always-target, and DPR restore pass policy.
2. Rewire `exact_after_settle_refresh_plans.js` to import the catalog and re-export the legacy deferred/DPR API.
3. Rewire `render_pipeline_passes.js` to use the catalog as the default deferred-pass set while preserving the existing constants override.
4. Remove the `map_renderer.js` bridge injection of `EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES`.
5. Add catalog behavior coverage and update architecture/static boundary checks.
6. Run the P14 validation set, then commit, push, archive docs, update registry, and clean the worktree.

## Status

- [x] Initial repo probes and isolated worktree created.
- [x] Catalog extraction implemented.
- [x] Validation completed.
- [ ] Functional commit pushed.
- [ ] Closeout archived, registry updated, worktree cleaned.
