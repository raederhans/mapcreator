# Architecture Debt Decoupling Plan

## Goal

Reduce high-risk module weight and coupling in the current codebase while preserving behavior and performance.

## Acceptance

- Each code change has a narrow owner boundary and uses existing modules when possible.
- Existing behavior stays covered by targeted tests before any broader verification.
- Main thread owns every live test/browser/build process.
- No unrelated dirty files are staged or modified.
- Final review is clean or blockers are recorded in ultragoal.

## Phase 1: audit and first low-risk split

- [x] Establish active docs and process ownership.
- [x] Identify largest coupled modules from live code.
- [x] Integrate static subagent findings into this context.
- [x] Move transport workbench static control schemas to the existing descriptor module.
- [x] Move transport workbench static defaults and section defaults to the existing descriptor module.
- [x] Update existing boundary tests so the new owner is explicit.
- [x] Verify with syntax checks and targeted Python/Node contracts.

## Phase 2: next candidates after Phase 1

Candidate order will be based on Phase 1 evidence:

- [x] `js/ui/toolbar/appearance_controls_controller.js`: split city-points theme descriptor data into a narrow descriptor module.
- [x] `js/ui/toolbar/appearance_controls_controller.js`: split transport appearance summary/counting logic into a pure summary utility module.
- [x] `js/core/renderer/transport_overview_render_owner.js`: split facility display policy and overview visibility policy into pure renderer policy modules.
- [x] `js/core/renderer/transport_overview_render_owner.js`: split road/rail line-label pure helpers into a renderer policy module.
- [x] `js/core/renderer/transport_overview_render_owner.js`: split visual-style helpers into a renderer style policy module.
- [x] `js/core/color_manager.js` / `js/core/state_defaults.js`: resolve Phase 5 color WATCH with an import-safe hex utility shared by both owners.
- [x] `js/core/renderer/transport_overview_render_owner.js`: move active label zoom visibility helper into the existing visibility policy module and delete stale threshold helpers.
- [x] `js/core/renderer/transport_overview_render_owner.js`: move pure facility label candidate and placement rules into the existing facility display policy module.
- [x] `js/core/renderer/transport_overview_render_owner.js`: move road/rail line width, dash, and stroke spec calculations into the existing line policy module.
- [x] `js/core/map_renderer.js`: remove thin transport overview facade wrappers and call the transport overview render owner directly from the marker pass.
- [x] `js/core/map_renderer.js`: remove stale border draw helper facade wrappers and direct the remaining coastline LOD call to the border draw owner.
- [x] `js/core/renderer/border_mesh_owner.js`: restore the owner-side frontline ownership context contract while keeping frontline mesh generation retired.
- [x] `js/ui/toolbar/appearance_controls_controller.js`: move pure city-points and transport display formatters into the existing descriptor/summary modules.
- [x] `js/core/map_renderer.js`: remove the one-line special-zones render proxy and call the strategic overlay helpers owner directly.
- [x] `js/core/map_renderer.js`: remove operation-graphics and operational-lines render proxies while keeping unit-counter interaction binding local.
- `js/core/renderer/transport_overview_render_owner.js`: next possible slice is hover target composition, after fresh test coverage review.
- `js/core/map_renderer.js`: continue facade-owner extraction in very small slices because it is the heaviest runtime surface.

## Verification Plan

Minimum for Phase 1:

- `node --check js/ui/toolbar/transport_workbench_controller.js js/ui/toolbar/transport_workbench_descriptor.js`
- `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
- Add or run Node behavior tests only if the static split changes exported runtime behavior.

## Open Risks

- Existing tests assert strings inside owner files. Moving owner boundaries requires updating those assertions so they protect the new boundary instead of the old file layout.
- The broad user goal cannot be honestly completed by one large patch. Completion requires staged, verified slices and final code review.
