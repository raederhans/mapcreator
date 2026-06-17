# Strategic Overlay Cleanup Followups Task

Last updated: 2026-06-17

## Checklist

- [x] Load ultrawork and ai-slop-cleaner guidance.
- [x] Confirm clean main and create branch `codex/strategic-overlay-cleanup-followups`.
- [x] Read lessons and agent tiers.
- [x] Create active plan/context/task docs.
- [x] Register active work in `docs/active/_worktree_registry.md`.
- [x] Add Operation Graphic drag runtime behavior coverage.
- [x] Move Operation Graphic drag session into runtime domain.
- [x] Narrow render owner dirty API to strategic overlays.
- [x] Update boundary contracts.
- [x] Run targeted node/Python checks.
- [x] Run renderer split validation.
- [x] Sync `dist/app` with Pages dist verification.
- [x] Run review/bug/first-principles self-check.
- [x] Run ai-slop-cleaner on changed files.
- [x] Run independent code review.
- [x] Commit, merge to `main`, post-merge validate, push, archive.

## Delivery Package Draft

Changed files:

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/strategic_overlay_render_owner.js`
  - `js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`
- Tests:
  - `tests/strategic_overlay_runtime_owner_behavior.test.mjs`
  - `tests/strategic_overlay_render_owner_behavior.test.mjs`
  - `tests/test_map_renderer_strategic_overlay_render_owner_boundary_contract.py`
  - `tests/test_map_renderer_strategic_overlay_runtime_owner_boundary_contract.py`
- Docs:
  - `docs/active/strategic-overlay-cleanup-followups/`
  - `docs/active/_worktree_registry.md`
- Dist after verification:
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/core/renderer/strategic_overlay_render_owner.js`
  - `dist/app/js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`

## Current Status

Implementation, validation, independent code review, final self-check, and post-merge validation are complete.

Implemented:

- Operation Graphic vertex drag session state moved into `operation_graphics_runtime_domain.js`.
- `map_renderer.js` drag handler now delegates vertex drag transaction APIs to runtime owner.
- `strategic_overlay_render_owner.js` dirty API is strategic-only.
- `map_renderer.js` preserves inspector/hover dirty marking in the facade and keeps `markAllOverlaysDirty()` full-overlay semantics.
- Tests lock both behavior and boundary contracts.

Verification:

- `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs` passed, 17/17.
- `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q` passed, 4/4.
- `npm run test:node:renderer-splits` passed, 44/44.
- `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"` passed: Pages dist build, 37 startup shell tests, 6 landing showcase tests.
- `node --check` passed for changed JS modules.
- `git diff --check` passed.
- Independent review returned CLEAR: no blocking bug, behavior regression, or owner-boundary violation found.
- Branch commit `0a8b351e` was fast-forward merged to `main`.
- Post-merge validation passed:
  - `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs` passed, 17/17.
  - `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q` passed, 4/4.
  - `npm run test:node:renderer-splits` passed, 44/44.
  - `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"` passed: Pages dist build, 37 startup shell tests, 6 landing showcase tests.

Self-check:

- Simpler path checked: this cleanup uses existing runtime/render owners and facade wiring, with no new scheduler or dependency.
- Owner boundaries checked: runtime domain owns Operation Graphic drag transaction/session state; render owner owns strategic dirty flags; `map_renderer.js` owns event extraction and inspector/hover facade flags.
- Remaining scoped follow-up: midpoint insert remains renderer-owned.

## Next Step

Push `main` and delete the local feature branch after the archive closeout commit.
