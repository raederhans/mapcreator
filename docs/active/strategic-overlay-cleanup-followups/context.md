# Strategic Overlay Cleanup Followups Context

Last updated: 2026-06-17

## Start State

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator`
- Branch: `codex/strategic-overlay-cleanup-followups`
- Base: `origin/main@07e98d17`
- Worktree list before work: only `C:/Users/raede/Desktop/dev/mapcreator`
- Live test/build owner: main Codex agent only
- Subagents: static inspection/review only; no live tests, dev server, or browser processes delegated

## Read Before Work

- `AGENTS.md`
- `lessons learned.md`
- `docs/shared/agent-tiers.md`
- `docs/active/_worktree_registry.md`
- `docs/archive/strategic-overlay-render-owner-20260617/`

## Findings

- `map_renderer.js` still stores Operation Graphic vertex drag `__historyBefore` on D3 datum inside `renderOperationGraphicsEditorOverlay()`.
- `operation_graphics_runtime_domain.js` already owns Operation Graphic create/update/delete/vertex delete transactions and has the right helpers for history, dirty, UI refresh, and render request.
- `strategic_overlay_render_owner.js` currently accepts `inspector` and `hover` in `markOverlaysDirty()`, although it only schedules strategic overlays.
- `map_renderer.js` already has the facade boundary where inspector/hover dirty can be assigned without changing callers.

## Implementation Notes

- Operation Graphic vertex drag now uses `beginOperationGraphicVertexDrag`, `moveOperationGraphicVertexDrag`, and `finishOperationGraphicVertexDrag` from the runtime owner.
- Drag session state is private to `operation_graphics_runtime_domain.js`; D3 datum and graphic model objects no longer receive internal session fields.
- `map_renderer.js` still owns D3 drag binding, cursor state, and map event coordinate extraction.
- `strategic_overlay_render_owner.js` now marks only strategic overlay dirty flags. The `map_renderer.js` facade marks inspector and hover dirty flags for callers that need full overlay invalidation.

## Validation Matrix

- Runtime behavior:
  - `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs`
- Render owner behavior:
  - `node --test tests/strategic_overlay_render_owner_behavior.test.mjs`
- Boundary:
  - `py -3 -m unittest tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract -q`
- Integrated renderer splits:
  - `npm run test:node:renderer-splits`
- Dist and hygiene:
  - `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`
  - `git diff --check`

## Open Risks

- Midpoint insert remains renderer-owned in this pass by scope choice.
- `verify:pages-dist` needs Hermes venv Python on PATH on this host.

## Validation Log

- Red test pass before implementation:
  - `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs` failed on missing Operation Graphic drag runtime API and render owner writing inspector/hover.
  - `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q` failed on the same boundary gaps.
- After implementation:
  - `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs` passed, 17/17.
  - `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q` passed, 4/4.
  - `node --check js/core/map_renderer.js && node --check js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js && node --check js/core/renderer/strategic_overlay_render_owner.js` passed.
  - `npm run test:node:renderer-splits` passed, 44/44.
  - `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"` passed: Pages dist build, 37 startup shell tests, 6 landing showcase tests.
  - `git diff --check` passed during the combined syntax/diff check.

## Cleanup Review

- Fallback inventory found no new fallback/retry/degrade path in this pass.
- Remaining fallback-like hits are pre-existing render recovery paths in `map_renderer.js`.
- No new dependencies or generic overlay scheduler were added.

## Independent Review

- Reviewer: Codex native subagent `019ed624-17ac-7c32-b327-c452dc42d807`.
- Result: CLEAR.
- Evidence checked: runtime domain private drag session, map renderer D3 event delegation, render owner strategic-only dirty flags, inspector/hover facade dirty flags, tests for clean history snapshots, and source/dist parity.

## Final Self-Check

- Behavior path is smaller than the pre-cleanup path: vertex drag uses begin/move/finish runtime APIs with one private session object.
- Boundary is stable: `map_renderer.js` keeps UI/event glue, `operation_graphics_runtime_domain.js` keeps transaction state, and `strategic_overlay_render_owner.js` keeps strategic dirty scheduling.
- No new dependency, fallback layer, generic scheduler, or hardcoded recovery path was introduced.
