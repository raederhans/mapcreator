# render-runtime-binding phase3 plan

## Goal

Extract the duplicated startup render runtime binding from `js/main.js` into `js/bootstrap/render_runtime_binding.js` while preserving startup order, legacy globals, runtime hook names, render flush reasons, and Pages dist output.

## Acceptance

- `js/main.js` calls `createStartupRenderRuntimeBinding` once in UI shell startup and once in normal startup.
- UI shell keeps `flushReason: "ui-shell-render-now"`; normal startup keeps `flushReason: "legacy-render-now"`.
- `globalThis.renderApp`, `globalThis.renderNow`, `renderNowFn`, `ensureDetailTopologyFn`, and `showToastFn` remain registered through the new owner.
- `ensureDetailTopologyReady` receives the active `renderDispatcher`.
- `initToast`, `setBootPreviewVisible(false)`, and `initPresetState` run in the new owner.
- New node tests are reachable through `npm run test:node:render-runtime-binding`.
- Source and `dist/app` are synchronized through the Pages dist gates.
- At least one real browser startup smoke passes.

## Steps

- [x] Create a clean worktree from `origin/main` after phase2.
- [x] Map the two duplicated binding blocks in `js/main.js`.
- [x] Add `js/bootstrap/render_runtime_binding.js`.
- [x] Add behavior and boundary tests plus package script.
- [x] Replace both `main.js` binding blocks with owner calls.
- [x] Run requested Node/static verification.
- [x] Run Pages dist and dist drift verification, including required dist changes.
- [x] Run browser startup smoke.
- [x] Run final review, commit, push, and clean the integration worktree.

## Risk Notes

- This touches startup and render boundary bootstrap, so validation needs both node contracts and a browser startup smoke.
- `docs/archive/**` deletion WIP exists in the parent checkout; this phase must stay in the clean worktree.
- Only the main agent owns live tests and build processes for this phase.
