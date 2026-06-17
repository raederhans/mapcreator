# Strategic Overlay Editor Followups Task

Last updated: 2026-06-17

## Checklist

- [x] Load workflow guidance and project lessons.
- [x] Confirm clean `main` and create branch.
- [x] Create active task docs.
- [x] Register worktree.
- [x] Add red-first boundary and behavior coverage.
- [x] Move Operation Graphic midpoint insertion into runtime domain.
- [x] Move Special Zone membership click/drag transactions into runtime owner.
- [x] Write dependency Spike report.
- [x] Sync `dist/app` and run validation.
- [ ] Review, commit, merge to `main`, push, and archive.

## Delivery Package Draft

Core files:

- `js/core/map_renderer.js`
- `js/core/renderer/strategic_overlay_runtime_owner.js`
- `js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`

Tests:

- `tests/strategic_overlay_runtime_owner_behavior.test.mjs`
- `tests/test_map_renderer_strategic_overlay_runtime_owner_boundary_contract.py`

Docs:

- `docs/active/strategic-overlay-editor-followups/`
- `docs/active/_worktree_registry.md`

Spike:

- `docs/active/strategic-overlay-editor-followups/dependency-spike.md`

## Delivery Package

What changed:

1. Operation Graphic midpoint insertion now commits history/dirty/UI/render updates in `operation_graphics_runtime_domain.js`.
2. Special Zone membership click and drag sessions now commit history/dirty/UI/render updates in `strategic_overlay_runtime_owner.js`.
3. `map_renderer.js` keeps D3 binding, event/hit reads, land-feature validation, pointer lifecycle, cursor/render ordering, and facade calls.
4. Boundary and runtime behavior tests now lock the new ownership split, including non-brush Shift drag add behavior.
5. Dependency Spike recommends zero new production dependencies this round.

Core files:

- `js/core/map_renderer.js`
- `js/core/renderer/strategic_overlay_runtime_owner.js`
- `js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/strategic_overlay_runtime_owner.js`
- `dist/app/js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`
- `dist/pages-dist-manifest.json`

Tests:

- `tests/strategic_overlay_runtime_owner_behavior.test.mjs`
- `tests/test_map_renderer_strategic_overlay_runtime_owner_boundary_contract.py`

Docs:

- `docs/active/_worktree_registry.md`
- `docs/active/strategic-overlay-editor-followups/plan.md`
- `docs/active/strategic-overlay-editor-followups/context.md`
- `docs/active/strategic-overlay-editor-followups/task.md`
- `docs/active/strategic-overlay-editor-followups/dependency-spike.md`

Diff summary:

- Runtime/domain code: adds midpoint insert API and membership click/drag runtime transaction APIs.
- Renderer: removes direct midpoint and membership transaction commits, replacing them with runtime owner facade calls.
- Tests: adds behavior and boundary coverage for the ownership move.
- Dist: regenerated from source with `verify:pages-dist`.

Commit state:

- Pending before final commit.

Base state:

- Branch base: `main@ee42ba98`.
- Current `main`, `HEAD`, and merge-base were still `ee42ba98` before commit.

Conflict risk:

- Yellow before merge because the branch touches `js/core/map_renderer.js`, strategic runtime owner/domain files, tests, and Pages dist mirrors.
- No parallel local worktree currently overlaps this branch.

Validation:

- `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs`: passed, 19 tests.
- `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q`: passed, 4 tests.
- `node --check` on changed source JS files: passed.
- `npm run test:node:renderer-splits`: passed, 46 tests.
- `git diff --check`: passed with Windows line-ending warnings only.
- `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`: passed.

Unverified risks:

- Browser interaction smoke was not run because this change is covered by owner/domain behavior tests, boundary contracts, and Pages dist gates.
- Dependency candidates were evaluated by metadata and local code surface only; no benchmark was added in this implementation branch.

Recommended integration:

- Fast-forward merge this branch into `main`, then run a short post-merge validation and push.
