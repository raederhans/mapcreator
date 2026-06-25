# Deferred Bootstrap Phase6 Context

## 2026-06-25

- Created clean worktree from `origin/main@edf9e4dc282a694d33dc931209274d6b558b6808`.
- Parent checkout remains dirty and behind with unrelated `docs/archive/**` deletion WIP plus `lessons learned.md` WIP.
- Static mapping found the owned phase6 extraction points in `js/main.js`: deferred promise lets, `yieldToMain`, `loadDeferredMilsymbol`, `bootstrapDeferredUi`, bootstrap reset, UI shell helper injection, and ordinary startup calls.
- Existing boundary tests that need sync:
  - `tests/scenario_chunk_contracts.test.mjs` currently looks for `yieldToMain` in `main.js`.
  - `tests/test_main_bootstrap_split_boundary_contract.py` currently looks for `startupUiBootstrapPromise = bootstrapDeferredUi(renderApp);`.
  - `tests/test_startup_shell.py` still contains some older UI shell owner assumptions.
- Live test/build owner: main Codex agent. Subagents were read-only/static only.

## Implementation Notes

- Keep `bootstrapDeferredUi` as a helper name for UI shell injection.
- Use direct owner calls in ordinary startup so `main.js` clearly delegates to the bootstrapper.
- Do not reset the milsymbol loader cache during `bootstrap()`, preserving current cross-attempt cache semantics.

## Closeout Notes

- Functional commit: `d1d5c04750cc545f8a2fb60231c425442ab16bbc`.
- Added `js/bootstrap/deferred_vendor_loader.js` as the owner for deferred `vendor/milsymbol.js` loading, promise caching, existing script reuse, and stable boot warning output.
- Added `js/bootstrap/deferred_ui_bootstrap.js` as the owner for `yieldToMain`, deferred UI dynamic imports, cached bootstrap promise, reset, and the original yield/init ordering.
- `js/main.js` now imports the two owners, resets only the deferred UI bootstrapper on each bootstrap attempt, starts milsymbol loading through the loader, and keeps `bootstrapDeferredUi` available for UI shell helper injection.
- New named validation entry: `npm run test:node:deferred-bootstrap`.
- Existing boundary contracts were updated to point at the new owner modules instead of treating moved code as `main.js` responsibility.
- `npm run verify:pages-dist` regenerated `dist/app/js/main.js`, the two new `dist/app/js/bootstrap/deferred_*.js` mirrors, and `dist/pages-dist-manifest.json`; `npm run verify:dist-drift` passed after staging the generated dist snapshot.
- Browser smoke passed: `npm run test:e2e:dev:tno-ready-state` 5/5, `npm run test:e2e:smoke` 4/4, and `npm run test:e2e:ui-rework-mainline` 5/5.
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` remained untouched; its unrelated `docs/archive/**` deletion WIP stayed outside this integration.
