# Scenario Forge P1.5 RendererRuntimeContext Interaction Read Model

Date: 2026-07-09

Status: implementation and scoped verification complete; ready to integrate with an external Landing asset reproducibility blocker recorded below.

Baseline: `origin/main@db8bd6c118d158aaed4dd6734ecdd981fe80f326`.

## Scope

P1.5 adds a real `RendererRuntimeContext.interaction` read model and routes the construction-time read dependencies of the zoom lifecycle and map interaction event-binding owners through that receiver. `js/core/map_renderer.js` remains the composition root.

The interaction read model contains:

- constants for zoom bounds and interacting/settling render phases;
- live accessors for runtime/surface identity, D3, viewport dimensions, interaction targets, window, zoom behavior, and zoom transform state;
- read helpers for transform cloning and zoom-event admission.

## Implemented Boundary

1. `getInteractionReceiverContext()` asserts the live runtime, surface, D3, interaction rect/node, window, and zoom-behavior receiver identities.
2. `getZoomInteractionLifecycleOwner()` obtains its state, constants, getters, transform cloning, and zoom-event admission helper from the interaction receiver.
3. `getMapInteractionEventBindingOwner()` obtains the D3 interaction rect, browser window, and native interaction node from the interaction receiver.
4. Timing and effects remain in the composition root. This includes `nowMs`, `requestAnimationFrame`, zoom state writes, render-phase transitions, drawing/refresh scheduling, border snapshots, and viewport constraint effects.
5. Event handlers remain in the composition root. This includes click/double-click, physical intensity, brush, hover, sidebar, resize, and observer binding behavior.

## Preserved Contracts

- `createZoomInteractionLifecycleOwner()` and `createMapInteractionEventBindingOwner()` retain their existing constructor APIs and algorithms.
- `handleClick()` and `handleDoubleClick()` remain in `map_renderer.js` with their existing selection, history, dirty-state, water, special-zone, and dev-selection branches.
- `js/core/map_renderer/public.js` remains unchanged.
- The state-write allowlist remains unchanged.
- `drawCanvas()`, pass drawing, render-pass ordering, scenario data, UI, CSS, and dependencies remain unchanged.
- `RendererRuntimeContext` remains import-free, fail-fast, frozen at its contract shell, and JSON-safe in diagnostics.

## Verification Coverage

New commands:

- `test:node:renderer-runtime-context-interaction`
- `test:python:map-renderer-interaction-context-boundary`

Both commands are registered as child-safe `renderer-owner` default checks. The existing `test:node:zoom-interaction-lifecycle-owner` command is now also included in the default renderer-owner group so full `verify:core` covers both migrated owners.

Focused validation passed:

- production and test syntax checks;
- runtime context foundation: 8/8;
- runtime context receiver: 10/10;
- interaction context: 6/6;
- zoom lifecycle owner: 7/7;
- map interaction event binding owner: 6/6;
- Python interaction boundary: 4/4;
- verification metadata: 11/11;
- verify-core runner: 8/8;
- architecture boundary and state-write allowlist checks.

Final deterministic evidence:

- source and Pages dist mirrors are byte-identical;
- `verify:pages-dist` passed in the base environment with 41 startup-shell tests, including 4 optional geospatial builder skips, plus landing showcase 18/18 and sample project 17/17;
- `verify:dist-drift` passed;
- selector schema, test import graph, supervisor contracts, and supervisor plan passed;
- the final changed-file selector reported 14 changed files, 183 recommended commands, 0 unmatched files, and 6 main-thread commands;
- the default `verify:core` plan contains 53 commands with no omitted or duplicate commands;
- the full `verify:core` execution passed its first 52 commands and stopped only at the final `verify:pages-dist` command for the external reproducibility issue below.

## External Verification Blocker

Installing the exact locked geospatial stack exposed four byte-comparison failures while regenerating unchanged Landing hero assets. The four metadata files differ only in four floating-point values, with absolute differences from `5.55e-17` to `2.27e-13`. The blank and TNO SVGs are byte-identical; the two HOI4 SVGs retain the same element counts and differ in a small set of path ordering or floating-point geometry outputs.

These assets, their builders, and their source data are outside the P1.5 patch. None is staged. The P1.5-specific suites and all preceding deterministic core commands remain green, so this environment-sensitive asset reproducibility issue is recorded without expanding the interaction-context migration scope.

## Files

Core:

- `js/core/map_renderer.js`
- `js/core/map_renderer/renderer_runtime_context.js`

Tests and routing:

- `tests/renderer_runtime_context_interaction_behavior.test.mjs`
- `tests/renderer_runtime_context_receiver_behavior.test.mjs`
- `tests/test_map_renderer_interaction_context_boundary_contract.py`
- `tests/verification_metadata_behavior.test.mjs`
- `tests/verify_core_runner_behavior.test.mjs`
- `tools/verification/verification_domains.mjs`
- `package.json`

Documentation:

- `docs/active/renderer-runtime-context-interaction-p1-5-20260709.md`
- `docs/active/_worktree_registry.md`

Generated Pages mirrors are synchronized and byte-identical to their source files.

## Explicitly Unrun Lanes

`verify:core:main-thread`, browser, dev-server, and Playwright lanes remain outside P1.5 ownership and are not run.
