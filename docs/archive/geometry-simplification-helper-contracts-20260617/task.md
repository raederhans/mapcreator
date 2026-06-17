# Geometry Simplification Helper Contracts Task

## Status

Verified and ready for archive/commit.

## Task Checklist

- [x] Baseline and branch confirmed.
- [x] Active docs created.
- [x] Worktree registry updated for this branch.
- [x] Red-first tests added and observed failing for the intended reason.
- [x] Helper extraction implemented.
- [x] Targeted validation passed.
- [x] Dist synced and checked.
- [x] Review / QA complete.
- [x] Delivery package written.
- [x] Docs archived.
- [x] Commit and push complete.

## Delivery Package

1. What changed:
   - Added `js/core/renderer/polyline_simplification_helpers.js` with the extracted geometry/polyline helper functions.
   - Updated `js/core/map_renderer.js` to import helpers and keep existing owner injection wiring.
   - Added focused helper behavior tests for sanitizing, RDP, effective-area simplification, and latitude epsilon scaling.
   - Extended the border mesh boundary contract so helper definitions stay outside `map_renderer.js` and owner-to-runtime injection stays explicit.
   - Synced `dist/app` and `dist/pages-dist-manifest.json` through `verify:pages-dist`.

2. Files touched:
   - Core: `js/core/map_renderer.js`; `js/core/renderer/polyline_simplification_helpers.js`.
   - Tests: `tests/polyline_simplification_helpers_behavior.test.mjs`; `tests/test_map_renderer_border_mesh_owner_boundary_contract.py`.
   - Dist: `dist/app/js/core/map_renderer.js`; `dist/app/js/core/renderer/polyline_simplification_helpers.js`; `dist/pages-dist-manifest.json`.
   - Docs: `docs/active/_worktree_registry.md`; `docs/active/geometry-simplification-helper-contracts/{plan.md,context.md,task.md}`.
   - Temporary files: none.

3. Diff summary:
   - Tracked diff before adding new files: 5 files, 51 insertions, 423 deletions.
   - Added files: new helper module in source and dist, focused helper behavior test, and three task docs.
   - `map_renderer.js` drops the extracted helper function bodies and imports the three helpers it still calls/injects.

4. Commit state:
   - Commit and push are the final shell closeout steps after this archived delivery package is written.

5. Base and divergence:
   - Base commit: `0660407509e25392be9605683b5e5f6f4107f93a`.
   - `main`, `origin/main`, and branch base were aligned at start; `main...origin/main` is `0 0`.

6. Potential overlap:
   - File-path overlap risk is yellow for future renderer work because this touches `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, and `dist/pages-dist-manifest.json`.
   - No active parallel local worktree exists.

7. Validation:
   - Red-first: helper behavior and boundary tests failed before implementation because the helper module was absent.
   - PASS: `node --test tests/polyline_simplification_helpers_behavior.test.mjs`.
   - PASS: `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& python -m unittest tests.test_map_renderer_border_mesh_owner_boundary_contract -q"`.
   - PASS: `node --check js/core/map_renderer.js js/core/renderer/polyline_simplification_helpers.js js/core/renderer/border_mesh_owner.js js/core/renderer/border_mesh_dynamic_runtime.js`.
   - PASS: `npm run test:node:border-mesh-owner-behavior`.
   - PASS: `npm run test:node:renderer-splits`.
   - PASS: `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`.
   - PASS: `node --check dist/app/js/core/map_renderer.js dist/app/js/core/renderer/polyline_simplification_helpers.js`.
   - PASS: `git diff --check` with Windows line-ending warnings only.
   - PASS: no `simplify-js`, `rbush`, `flatbush`, or `@turf` dependency scan hits.
   - PASS: source and dist helper module byte compare returned no differences.

8. Remaining risk:
   - Browser smoke was not run because the change is helper extraction plus existing owner injection, and targeted tests plus Pages dist checks covered the modified contracts.
   - Node ESM module-type warnings are pre-existing project behavior and not introduced by this helper extraction.

9. Recommended next step:
   - Fast-forward merge this branch into `main`, push `origin/main`, then delete the merged local feature branch.

10. Integration readiness:
   - The worktree is ready to integrate by fast-forward merge.
