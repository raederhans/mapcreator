# Scenario Forge P1.2 RendererRuntimeContext Render Cache Read Model

## Goal

Move the render cache receiver inputs into `RendererRuntimeContext` as a narrow read model, then have `getRenderCacheOwner()` consume runtime state, render cache constants, render cache helpers, and the main surface context through that context.

## Non-goals

- Keep `drawCanvas()` control flow in `js/core/map_renderer.js`.
- Keep pass drawing functions and pass order in place.
- Keep `renderPassToCache()` host setup, skip, and commit accounting behavior in place.
- Keep click selection, public facade, UI, CSS, scenario data, dependencies, and global state shape unchanged.
- Keep `createRenderCacheOwner()` algorithm and owner API shape unchanged.

## Context Shape

`createRendererRuntimeContext()` accepts optional `renderCache`.

```js
renderCache: {
  constants: {
    interactionCompositePassNames,
    renderPassNames,
    renderPassOverscanRatioPerSide,
    transformedFramePassNames,
  },
  helpers: {
    getTransformSignature,
    getVisibleFrameIdentity,
  },
}
```

The resulting context exposes:

- `state.runtimeState`
- `surface.host`
- `surface.getHost()`
- `surface.getMainContext()`
- `renderCache.constants`
- `renderCache.helpers`
- `renderCache.getRuntimeState()`
- `renderCache.getSurfaceHost()`
- `renderCache.getMainContext()`

The context module stays import-free and only freezes the context shell plus read-model wrappers. It keeps `runtimeState` live and mutable for existing renderer owners.

## Receiver Shape

`getRendererRuntimeContext()` remains the only lazy construction point in `map_renderer.js`.

`getRenderCacheOwner()` now:

1. Calls `getRenderCacheReceiverContext()` before owner construction.
2. Reads runtime state from `rendererContext.state.runtimeState`.
3. Reads render cache constants and helper functions from `rendererContext.renderCache`.
4. Reads the main canvas context through `rendererContext.renderCache.getMainContext()`.
5. Calls `createRenderCacheOwner()` with the same `state`, `constants`, `getters`, and `helpers` API shape as before.

## Risks

- Context bloat: limit P1.2 to render cache constants, two helper functions, runtime/surface identity accessors, and main context read access.
- Text-contract fragility: update source-scan tests only around P1.2 receiver shape.
- Dist drift: source changes to `map_renderer.js` and `renderer_runtime_context.js` may require generated Pages mirror sync through `verify:dist-drift`.

## Validation Plan

- `node --check js/core/map_renderer.js`
- `node --check js/core/map_renderer/renderer_runtime_context.js`
- `node --check tests/renderer_runtime_context_render_cache_behavior.test.mjs`
- `node --check tests/renderer_runtime_context_receiver_behavior.test.mjs`
- `npm run test:node:renderer-runtime-context-foundation`
- `npm run test:node:renderer-runtime-context-receiver`
- `npm run test:node:renderer-runtime-context-render-cache`
- `npm run test:node:render-cache-owner`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:render-pass-commit-accounting-owner-suite`
- `npm run test:python:map-renderer-render-cache-owner-boundary`
- Metadata, architecture, selector, supervisor, dist drift, and final `verify:core` gates from the P1.2 attachment.

## P1.3 Recommendation

Use P1.3 for the next receiver migration only after P1.2 lands cleanly on `origin/main`. Prefer one narrow owner receiver at a time, with `RendererRuntimeContext` remaining a read model rather than a mutation or effects bus.
