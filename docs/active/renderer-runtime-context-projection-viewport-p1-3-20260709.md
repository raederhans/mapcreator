# RendererRuntimeContext Projection + Viewport P1.3

## Target

Migrate projection/path owner construction and viewport read/command owner construction to consume narrow `RendererRuntimeContext` read-model sections.

## Scope

- Add real optional `projection` and `viewport` context sections with frozen wrappers, finite-number validation, helper/accessor function validation, and sanitized descriptions.
- Keep `js/core/map_renderer/public.js`, `drawCanvas()`, pass drawing, `renderPassToCache()`, render order, click selection, scenario/UI/CSS/data, water/special/dev selection behavior, and owner algorithms unchanged.
- Keep `getRendererFitProjectionOwner()` as a P1.4 candidate.
- Verification owner: main thread owned deterministic P1.3 validation, checked-in Pages mirror sync, dist drift, and full `verify:core`. Browser/dev-server/Playwright and `verify:core:main-thread` were not run.

## Plan And Progress

- [x] Read lessons, existing context tests, receiver tests, verification metadata, and map renderer owner construction.
- [x] Extend `renderer_runtime_context.js` with `projection` and `viewport` read models.
- [x] Wire `getRendererRuntimeContext()` descriptors and add projection/viewport receiver helpers.
- [x] Migrate `getRendererProjectionPathOwner()`, `getViewportReadModelOwner()`, and `getViewportCommandOwner()` to context-derived reads.
- [x] Add/extend Node and Python boundary tests.
- [x] Add package scripts and verification metadata routes.
- [x] Update worktree registry with P1.3 delivery state.
- [x] Sync checked-in Pages mirror files for P1.3.
- [x] Run deterministic full validation, including `verify:pages-dist`, `verify:dist-drift`, and full `npm run verify:core`.
- [x] Commit the P1.3 functional patch as `91ffdfa6`.
- [ ] Commit this closeout update, then push the functional commit and closeout commit. Do not archive this active doc in this closeout.

## Validation Checklist

Focused checks covered by validation:

- `node --check js/core/map_renderer.js`
- `node --check js/core/map_renderer/renderer_runtime_context.js`
- `node --check tests/renderer_runtime_context_foundation_behavior.test.mjs`
- `node --check tests/renderer_runtime_context_receiver_behavior.test.mjs`
- `node --check tests/renderer_runtime_context_projection_viewport_behavior.test.mjs`
- `node --check tests/verification_metadata_behavior.test.mjs`
- `node --check tests/verify_core_runner_behavior.test.mjs`
- `node --check tools/verification/verification_domains.mjs`
- `npm run test:node:renderer-runtime-context-projection-viewport`
- `npm run test:node:renderer-runtime-context-receiver`
- `npm run test:node:renderer-runtime-context-foundation`
- `npm run test:python:map-renderer-projection-viewport-context-boundary`
- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `npm run test:node:renderer-runtime-context-render-cache`
- `npm run test:node:renderer-surface-host-inventory`
- `node tools/select_verification_targets.mjs --check`
- Changed-file selector dry-run for the complete 18 staged P1.3 file set
- `git diff --check`

Deterministic integration checks:

- `verify:pages-dist`
- `verify:dist-drift`
- `verify:core`

Explicit not-run lanes:

- Browser/dev-server/Playwright lanes
- `verify:core:main-thread`; full `verify:core` skipped explicit E2E main-thread commands by default

## Risks

- `js/core/map_renderer.js` is a shared renderer hotspot; future edits should re-check overlap before changing it.
- Checked-in Pages mirrors are synced for P1.3: `dist/app/js/core/map_renderer.js`, `dist/app/js/core/map_renderer/renderer_runtime_context.js`, and `dist/pages-dist-manifest.json`.
- Two stale historical inventory assertions were updated: projection path lifecycle now expects viewport context getter tokens, and the P43 dist untouched check now scopes to the P43 owner mirror.
- Browser/dev-server/Playwright coverage remains an explicit not-run lane for this deterministic closeout.

## Delivery Package Draft

Changed core files: `js/core/map_renderer.js`, `js/core/map_renderer/renderer_runtime_context.js`.

Changed test files: `tests/renderer_runtime_context_foundation_behavior.test.mjs`, `tests/renderer_runtime_context_receiver_behavior.test.mjs`, `tests/renderer_runtime_context_projection_viewport_behavior.test.mjs`, `tests/renderer_surface_host_inventory_boundary.test.mjs`, `tests/test_map_renderer_projection_viewport_context_boundary_contract.py`, `tests/verification_metadata_behavior.test.mjs`, `tests/verify_core_runner_behavior.test.mjs`.

Changed metadata/docs files: `package.json`, `tools/verification/verification_domains.mjs`, `docs/active/renderer-runtime-context-projection-viewport-p1-3-20260709.md`, `docs/active/_worktree_registry.md`.

Changed checked-in Pages mirror files: `dist/app/js/core/map_renderer.js`, `dist/app/js/core/map_renderer/renderer_runtime_context.js`, `dist/pages-dist-manifest.json`.

Runtime artifacts: changed-file selector dry-run wrote `.runtime/reports/generated/p1-3-adaptive-selection.json` and `.runtime/reports/generated/p1-3-adaptive-selection.md` for 18 staged files with `changedFiles=18`, `recommended=179`, `unmatched=0`, and `mainThreadSerial=6` (6 main-thread serial checks); full `npm run verify:core` wrote `.runtime/reports/generated/verify-core.json`.

Commit status: P1.3 functional commit `91ffdfa6` exists locally; this closeout update is preparing a follow-up docs commit, then push.

Base/HEAD starting point: `5d712c4b92ecb910a4aeb916ad11e195852d4e5f`.

Current worktree state: only `C:\Users\raede\Desktop\dev\mapcreator` on `main`.

Validation passed: syntax checks for changed JS/MJS; runtime context foundation/receiver/render-cache/projection-viewport tests; projection path lifecycle, viewport read model, and viewport command owner; Python render-cache boundary plus P1.3 projection/viewport boundary; surface host inventory; verification metadata and verify-core runner; architecture boundaries, state-write allowlist, and test import graph; selector schema check; changed-file selector dry-run for 18 staged files with `changedFiles=18`, `recommended=179`, `unmatched=0`, and `mainThreadSerial=6`; supervisor contracts/plan; `verify:pages-dist`; `verify:dist-drift`; full `npm run verify:core` passed 46 commands.

Not run: `verify:core:main-thread`, browser, dev-server, and Playwright lanes.

Recommended next step: commit this closeout update, then push P1.3 functional commit `91ffdfa6` and the closeout commit.
