# Renderer Fit Projection Owner P32 Plan

## Goal

Move only the existing `fitProjection` orchestration from `js/core/map_renderer.js` into a dependency-injected owner at `js/core/renderer/renderer_fit_projection_owner.js`.

## First-principles contract

- `fitProjection` is a projection-fit orchestration step: read land data and viewport dimensions, compute padding and fit extent, then run the same ordered invalidation effects.
- `map_renderer.js` remains the composition root because it owns `runtimeState`, cache variables, render effects, and cross-owner wiring.
- The new owner reads through `state`, `constants`, `getters`, and `surfaceHost`; it changes outside state only through injected `effects`.
- Renderer draw, hit build, selection, scenario, exact-after-settle, strategic overlay runtime, public facade, and `dist` generation policy remain separate concerns.

## Work steps

- [x] Add `renderer_fit_projection_owner.js` with fail-fast dependency validation and behavior-preserving `fitProjection`.
- [x] Wire `map_renderer.js` with import, singleton, `getRendererFitProjectionOwner()`, and stable wrapper.
- [x] Add owner behavior tests for early returns, fit extent calculation, renderable fallback, effect order, skipSpatialIndex, and missing projection API.
- [x] Update lifecycle inventory test for P32 implementation state.
- [x] Update architecture boundary checks and package scripts.
- [x] Sync `dist/app/**` mirrors. The builder wrote the mirrors, then stopped at the known Pages size gate.
- [ ] Run final static review, rebase over current `origin/main`, rerun validation, and complete registry closeout before push.

## Live process ownership

Main Codex agent owns all Node/Python/browser/live verification commands for this task. Subagents may do static code review and code mapping only.
