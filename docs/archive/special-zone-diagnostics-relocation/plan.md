# Special Zone Diagnostics Relocation

## Task

Investigate why switching scenarios can show `topology_fingerprint_mismatch` in the Special Zone editor, then move those diagnostics from the left editor workbench to the right Project sidebar.

## Findings

- `js/core/special_zone_layers.js` emits `topology_fingerprint_mismatch` when the active scenario topology fingerprint differs from the fingerprint stored on `runtimeState.specialZoneLayers`.
- The diagnostic is real state health information: it means the visible layer state was normalized against a different scenario topology.
- `js/ui/toolbar/special_zones_workbench_controller.js` currently renders diagnostics inline through `.special-zone-workbench-diagnostics`, which consumes left editor space and makes the edit surface look broken.
- `js/ui/sidebar/project_support_diagnostics_controller.js` already owns Project sidebar diagnostics/audit surfaces, so it is the best owner for displaying this runtime health message.

## Plan

- Remove inline diagnostics rendering from the Special Zone workbench.
- Add a compact runtime diagnostics block to the right Project sidebar Scenario Audit panel.
- Reuse existing normalization and diagnostic payloads; keep the mismatch visible and truthful.
- Extend existing behavior/static tests and mirror source changes to `dist/app`.

## Acceptance

- Switching scenarios no longer shows `topology_fingerprint_mismatch` inside the left Special Zone editor.
- The same diagnostic appears in the right Project sidebar lower/middle diagnostics area.
- Targeted controller tests pass.
- `verify:pages-dist` passes after source/dist sync.
