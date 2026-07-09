# Renderer Runtime Context Foundation P1.0

Date: 2026-07-09
Owner: main Codex thread
Status: validated

## Current Problem

`js/core/map_renderer.js` still owns cross-domain orchestration, runtime handles, render pass coordination, and several owner dependency handoffs. The next renderer extraction stages need a stable runtime context contract before moving more owner dependencies out of the composition root.

P1.0 establishes that contract as a foundation layer. It does not connect the new context to production renderer flow.

## P1.0 Scope

- Add `js/core/map_renderer/renderer_runtime_context.js` as a pure factory / assertion / description module.
- Add a focused Node behavior test for the context shell.
- Add a package script for the new test.
- Add verification metadata so the test is part of the `verify:core` `renderer-owner` group.
- Add route coverage so context source, test, docs, and package changes have no selector gap.

## Explicit Non-goals

- No `drawCanvas()` migration.
- No pass drawing migration.
- No `renderPassToCache()` migration.
- No click selection or map click transaction migration.
- No public facade change.
- No scenario apply or scenario refresh runtime behavior change.
- No global state shape change.
- No `index.html`, CSS, UI, or scenario data changes.
- Checked-in dist changes are limited to generated Pages mirror sync when `verify:dist-drift` requires it.

## Context Sections

Implemented sections:

- `state`: holds the existing mutable `runtimeState` reference.
- `surface`: holds the existing `rendererSurfaceHost` reference.
- `diagnostics`: exposes a safe surface-host snapshot through `getSnapshot()`.

Lifecycle metadata:

- `schemaVersion`
- `createdAt`
- `ownerTag`

Reserved future sections declared in `RENDERER_RUNTIME_CONTEXT_SECTION_IDS`:

- `projection`
- `renderCache`
- `interaction`
- `scheduling`

These sections are intentionally reserved for later owner migration work. P1.0 only names the contract boundary.

## Contract Rules

- `createRendererRuntimeContext()` fails fast when `runtimeState` is missing.
- `createRendererRuntimeContext()` fails fast when `rendererSurfaceHost` is missing.
- `rendererSurfaceHost` must expose `snapshot()` and at least one common renderer getter such as `getContext()`.
- The context shell and section wrappers are frozen.
- `runtimeState` is not deep-frozen because current renderer code still depends on mutable runtime state.
- `describeRendererRuntimeContext()` returns a JSON-serializable snapshot.
- `describeRendererRuntimeContext()` exposes only presence/type/schema/owner metadata and sanitized surface snapshot descriptors.
- The module has no imports, reads no DOM, starts no rendering, calls no D3, writes no global state, and writes no `.runtime` artifact.

## P1.1 Direction

Recommended P1.1 candidates:

- Wrap render pass host and commit accounting owner dependencies in the context.
- Or first connect render cache / surface host read-model dependencies through the context.

Both options should keep `map_renderer.js` as the composition root until the receiving owner has behavior tests and route coverage.

## Risks

- Do not turn the context into a long effects/getters bag.
- Do not turn the context into a new mutable global state object.
- Do not move render order, state writes, pass drawing, click selection, or public facade behavior during this foundation stage.

## Required Verification

- `node --check js/core/map_renderer/renderer_runtime_context.js`
- `node --check tests/renderer_runtime_context_foundation_behavior.test.mjs`
- `npm run test:node:renderer-runtime-context-foundation`
- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `npm run verify:core:list`
- `node tools/select_verification_targets.mjs --check`
- Changed-file selector dry-run for the P1.0 changed files.
- `npm run verify:test-import-graph`
- `npm run verify:architecture-boundaries`
- `npm run verify:supervisor-contracts`
- `npm run verify:supervisor-plan`
- Recommended: `npm run verify:core`

`verify:core:main-thread` remains a browser/dev-server/Playwright lane and is out of scope for P1.0 unless a live-process owner explicitly reserves it.

Final closeout ran the full required set plus `npm run verify:dist-drift`, `node --check tests/renderer_render_phase_lifecycle_inventory.test.mjs`, `npm run test:node:renderer-render-phase-lifecycle-inventory`, and final changed-file selector dry-run. The final selector reported `unmatchedChangedFiles: []`, and `npm run verify:core` passed 41 commands.
