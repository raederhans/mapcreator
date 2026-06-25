# render-runtime-binding phase3 context

## 2026-06-25 startup context

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is local `main@c4a5632f`, behind `origin/main@5b88fb6d`, with unrelated `docs/archive/**` deletion WIP.
- Clean worktree created at `C:\Users\raede\.codex\worktrees\mapcreator-render-runtime-binding-phase3-20260625`.
- Branch: `codex/render-runtime-binding-phase3-20260625`.
- Base: `origin/main@5b88fb6d94e320bad6bb52a58c96ef7ce60f264c`, which already contains post-ready scheduler phase1 and main runtime diagnostics phase2.

## Discovery

- UI shell debug path owned a render binding block after `initMap` / `setMapData` and before `applyUiShellDebugTerritorySeed`.
- Normal startup path owned the same binding block after `initMap` / `setMapData` and before `loadDeferredMilsymbol`.
- The only semantic difference between the two blocks was the `renderNow` flush reason.
- `main.js` still needs `flushRenderBoundary`, `requestRender`, and `registerRuntimeHook` for other startup responsibilities.

## Implementation Notes

- Added `js/bootstrap/render_runtime_binding.js` with `createStartupRenderRuntimeBinding`.
- The owner accepts injected dependencies for tests, validates required inputs, publishes `renderApp` and `renderNow`, binds the render boundary, registers runtime hooks, initializes toast and presets, and hides the boot preview.
- Added behavior tests for return handles, dispatcher flush/finally behavior, global hooks, render boundary callbacks, runtime hook registrations, initialization calls, fallback flush reason, and fail-fast validation.
- Added static boundary tests to keep `main.js` from regaining the duplicated binding block.

## Validation Log

- PASS `node --check js/bootstrap/render_runtime_binding.js js/main.js`.
- PASS `npm run test:node:render-runtime-binding` 14/14.
- PASS `npm run test:node:main-runtime-diagnostics` 12/12.
- PASS `npm run test:node:post-ready-scheduler` 10/10.
- PASS `npm run test:node:startup-hydration-behavior` 12/12.
- PASS `npm run test:node:render-transaction-diagnostics` 21/21.
- PASS `npm run test:node:renderer-runtime-state-behavior` 10/10.
- PASS `npm run verify:state-write-allowlist` with 115 tracked files.
- PASS `npm run verify:architecture-boundaries`.
- PASS `npm run verify:pages-dist` with startup shell 39/39 and landing showcase 8/8.
- Initial `npm run verify:dist-drift` failed with expected dist changes in `dist/app/js/main.js`, `dist/app/js/bootstrap/render_runtime_binding.js`, and `dist/pages-dist-manifest.json`; after staging those generated files, PASS `npm run verify:dist-drift`.
- PASS `node --check dist/app/js/bootstrap/render_runtime_binding.js dist/app/js/main.js`.
- PASS `npm run test:e2e:dev:tno-ready-state` 5/5.
- PASS `npm run test:e2e:smoke` 4/4. The smoke log still includes existing 401 auth probe and D3 unsafe-water warnings accepted by the test.
- Optional `npm run test:e2e:ui-rework-mainline` failed 2/5 in this worktree; the same command on clean phase2 baseline `5b88fb6d` failed with the same three layout assertions, so it is recorded as existing UI layout gate drift outside this render binding extraction.

## Review Notes

- Final reviewer requested changing empty `flushReason` fallback into a hard error. This was not applied because the phase3 task explicitly requires empty `flushReason` to normalize to `"legacy-render-now"`.
- The real startup call sites are still protected by boundary tests requiring both explicit reasons: `"ui-shell-render-now"` and `"legacy-render-now"`.
