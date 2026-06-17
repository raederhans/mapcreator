# City Points Render Owner Task

Last updated: 2026-06-17

## Checklist

- [x] Read `AGENTS.md`, `lessons learned.md`, and `docs/shared/agent-tiers.md`.
- [x] Confirm clean starting branch and create `codex/city-points-render-owner`.
- [x] Register active work in `docs/active/_worktree_registry.md`.
- [x] Create active plan/context/task docs.
- [x] Add `city_points_render_owner.js` owner shell.
- [x] Move marker sprite/render state/draw layer/hover logic behind owner.
- [x] Keep `map_renderer.js` facades as thin delegates.
- [x] Add owner behavior tests.
- [x] Update boundary contract tests.
- [x] Run targeted node/Python checks.
- [x] Run city e2e, layer smoke, and Pages dist verification.
- [x] Run final review/QA self-check.
- [x] Commit implementation.
- [x] Fast-forward merge to `main`.
- [x] Run post-merge short validation.
- [x] Push `main`.

## Delivery Package Draft

Changed files are expected in:

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/city_points_render_owner.js`
- Tests:
  - `tests/city_points_render_owner_behavior.test.mjs`
  - `tests/test_map_renderer_urban_city_policy_boundary_contract.py`
  - `tests/test_map_renderer_city_label_owner_boundary_contract.py`
  - `package.json`
- Docs:
  - `docs/active/city-points-render-owner/plan.md`
  - `docs/active/city-points-render-owner/context.md`
  - `docs/active/city-points-render-owner/task.md`
  - `docs/active/_worktree_registry.md`
- Dist after verification:
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/core/renderer/city_points_render_owner.js`
  - `dist/pages-dist-manifest.json`

## Current Status

Implementation, long validation, review follow-up fixes, post-merge short validation, main merge, and main push are complete.

## Next Step

No execution work remains for this phase.
