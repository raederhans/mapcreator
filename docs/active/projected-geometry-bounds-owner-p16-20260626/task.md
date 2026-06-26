# P16 Task

## Status

ready-for-integration

## Checklist

- [x] Create isolated worktree from latest `origin/main`.
- [x] Record plan/context/task docs and registry row.
- [x] Map current projected geometry / water sanitization implementation and call sites.
- [x] Add `js/core/renderer/projected_geometry_bounds_owner.js`.
- [x] Delegate `map_renderer.js` wrappers to the new owner.
- [x] Add `tests/projected_geometry_bounds_owner_behavior.test.mjs`.
- [x] Add package script and architecture boundary checks.
- [x] Run required validation commands.
- [x] Run final review and first-principles bug check.
- [ ] Commit, push branch/main, archive docs, update registry, and clean worktree.

## Delivery Package Draft

1. Change summary: projected bounds, spherical geometry diagnostics, safe water hit geometry, and D3-unsafe water sanitization moved into `createProjectedGeometryBoundsOwner`; `map_renderer.js` now preserves wrapper names and delegates; `runtimeState` diagnostics and water Path2D caches remain host-owned; architecture and scenario contracts now lock the new boundary; owner behavior tests cover coordinate/path bounds, caching, merge, spherical diagnostics, safe part filtering, warning-once, and cache reset callback.
2. Files: core files `js/core/renderer/projected_geometry_bounds_owner.js`, `js/core/map_renderer.js`; test files `tests/projected_geometry_bounds_owner_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`; tooling/package `tools/check_architecture_boundaries.mjs`, `package.json`; docs `docs/active/projected-geometry-bounds-owner-p16-20260626/*`, `docs/active/_worktree_registry.md`.
3. Diff summary: `map_renderer.js` loses the large projected geometry / water sanitization implementation and keeps wrappers plus owner factory injection; the new owner owns four local caches and pure geometry policy; contracts and architecture checks now require owner ownership and forbid lifecycle/state tokens in the owner.
4. Commit state: not committed yet; ready for functional commit after CLEAR review and diff check.
5. Base divergence: worktree starts at `origin/main@760f08291cd6425870ed63b327f6709092e13601`; parent checkout remains local `main@383a626a` with unrelated docs/archive deletion WIP and `lessons learned.md`.
6. Overlap risk: yellow with future renderer host wrapper, spatial index helper, water geometry safety, package script, scenario chunk contract, and architecture boundary changes; green against parent docs/archive WIP.
7. Validation: syntax checks passed for owner, renderer, owner test, and architecture tool; owner test 12/12; transform reuse 7/7; render cache 6/6; render pipeline catalog 3/3; exact pass catalog 6/6; renderer host inventory 7/7; runtime state 10/10; transaction diagnostics 21/21; scenario refresh 23/23; scenario chunk contracts 57/57; canvas layer 4/4; architecture boundaries; state-write allowlist; import graph; TNO ready-state e2e 5/5; smoke e2e 4/4.
8. Unverified risks: no remaining P16-specific validation gap. Smoke logs still include known local backend auth 401 probes and expected D3-unsafe water sanitization warnings.
9. Recommended next step: commit with Lore protocol, push branch/main, archive docs, update registry, then clean the worktree.
10. Integrability: ready to integrate as a single renderer extraction commit after final review.
