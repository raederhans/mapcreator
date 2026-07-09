# RendererRuntimeContext First Receiver P1.1

Date: 2026-07-09
Owner: main Codex thread
Status: pushed
Base: `main@d0386559c2c939a026e3863ea9c7515f7ee68450`
Integrated: `main@35bbcde6`

## Goal

P1.1 connects the P1.0 `RendererRuntimeContext` to `js/core/map_renderer.js` for the first time.

The first receiver is render pass cache host / commit accounting owner dependency setup. The context proves that `map_renderer.js` can create and hold a stable renderer runtime contract before later owner migration stages move more dependency read-models through it.

## Scope

- Add a lazy `getRendererRuntimeContext()` helper in `js/core/map_renderer.js`.
- Keep `map_renderer.js` as the composition root.
- Use `assertRendererRuntimeContext(getRendererRuntimeContext())` around P51/P52 owner construction.
- Route surface/runtime references in that receiver setup through the context when the setup needs them.
- Add focused receiver coverage and verification routing.
- Sync generated Pages mirror only when `verify:dist-drift` requires it.

## Non-goals

- No `drawCanvas()` migration.
- No pass drawing migration.
- No `renderPassToCache()` behavior change.
- No click selection migration.
- No public facade change.
- No scenario apply or scenario refresh runtime behavior change.
- No UI, CSS, scenario data, manifest, chunk, or package dependency change.

## Expected Code Shape

`js/core/map_renderer.js` should import `createRendererRuntimeContext`, `assertRendererRuntimeContext`, and `describeRendererRuntimeContext` from `./map_renderer/renderer_runtime_context.js`.

The module should hold:

```js
let rendererRuntimeContext = null;
```

The lazy helper should look like:

```js
function getRendererRuntimeContext() {
  if (rendererRuntimeContext) return rendererRuntimeContext;
  rendererRuntimeContext = createRendererRuntimeContext({
    runtimeState,
    rendererSurfaceHost,
    ownerTag: "map-renderer",
  });
  return rendererRuntimeContext;
}
```

Rules:

- Do not call `createRendererRuntimeContext()` at module import time.
- Do not export the context through the public facade.
- Do not attach the context to `globalThis`.
- Do not write the context into `runtimeState`.
- Do not replace broad `rendererSurfaceHost` usage during P1.1.
- Keep P51/P52 owner algorithms intact.

## Risks

- Do not turn the context into a long effects/getters bag.
- Do not turn the context into a new mutable global state object.
- Do not add context parameters to owner APIs when a local construction assertion is enough.
- Do not use generated dist changes as proof of source behavior.
- Keep stage inventory guards scoped to the phase-owned mirror files.

## Required Verification

- `node --check js/core/map_renderer/renderer_runtime_context.js`
- `node --check tests/renderer_runtime_context_receiver_behavior.test.mjs`
- `npm run test:node:renderer-runtime-context-foundation`
- `npm run test:node:renderer-runtime-context-receiver`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:render-pass-commit-accounting-owner-suite`
- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:core:list`
- `node tools/select_verification_targets.mjs --check`
- P1.1 changed-file selector dry-run with `unmatchedChangedFiles: []`
- `npm run verify:test-import-graph`
- `npm run verify:supervisor-contracts`
- `npm run verify:supervisor-plan`
- `npm run verify:dist-drift` if renderer source mirror changed
- Recommended final gate: `npm run verify:core`

`verify:core:main-thread` remains a browser/dev-server/Playwright lane and is out of scope for P1.1 unless a live-process owner explicitly reserves it.

## Implementation Notes

- `js/core/map_renderer.js` owns a private `rendererRuntimeContext` singleton and creates it lazily through `getRendererRuntimeContext()`.
- `getRenderPassReceiverContext()` asserts the P1.0 context contract, verifies the context still points at the module `runtimeState` and `rendererSurfaceHost`, and calls `describeRendererRuntimeContext()` as the lightweight diagnostic read.
- `getRenderPassCacheHostOwner()` and `getRenderPassCommitAccountingOwner()` call the receiver helper before their existing constructor calls.
- P51/P52 constructor APIs stay unchanged; their effects/getters bags remain the existing narrow owner dependencies.
- Generated Pages mirror changes are limited to `dist/app/js/core/map_renderer.js` and `dist/pages-dist-manifest.json`.

## Validation Result

Passed:

- `node --check js/core/map_renderer.js`
- `node --check js/core/map_renderer/renderer_runtime_context.js`
- `node --check tests/renderer_runtime_context_receiver_behavior.test.mjs`
- `npm run test:node:renderer-runtime-context-foundation`
- `npm run test:node:renderer-runtime-context-receiver`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:render-pass-commit-accounting-owner-suite`
- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `node tools/select_verification_targets.mjs --check`
- changed-file selector dry-run, writing `.runtime/reports/generated/p1-1-adaptive-selection.json` and `.runtime/reports/generated/p1-1-adaptive-selection.md` with `unmatchedChangedFiles: []`
- `npm run verify:supervisor-contracts`
- `npm run verify:supervisor-plan`
- `npm run verify:core:list -- --json-out .runtime/reports/generated/p1-1-verify-core-plan.json --md-out .runtime/reports/generated/p1-1-verify-core-plan.md`
- `npm run verify:dist-drift` after staging the generated Pages mirror

- full `npm run verify:core`, passing 42 commands and writing `.runtime/reports/generated/verify-core.json`

Intentionally skipped:

- `verify:core:main-thread`, because it is the explicit browser/dev-server/Playwright lane outside P1.1.

## P1.2 Direction

If P1.1 passes, P1.2 can move a small render cache or surface host read-model dependency through the context more substantively. It should still avoid direct `drawCanvas()` migration.
