# blank_base editable ownerless map plan

## Goal
Restore `blank_base` as a full editable blank map: it should load a complete political feature topology, keep all ownership/controller/core maps empty, and render unowned land with a neutral fill and fine boundaries.

## Acceptance
- `data/scenarios/blank_base/runtime_topology.topo.json` contains political geometries.
- Blank feature properties keep only neutral editing identity fields and do not carry country or ownership fields.
- `owners.by_feature.json`, `cores.by_feature.json`, and runtime sovereignty start empty.
- Country catalog and palette remain available, with initial per-country feature counts set to 0.
- Runtime hover/editing works on blank features; assigning an owner colors the feature through the existing palette.
- Blank feature labels are controlled by a UI toggle and default to hidden.

## Steps
- [x] Inspect current blank/runtime topology contracts.
- [x] Rebuild blank data artifacts from a sanitized full topology.
- [x] Add runtime neutral blank rendering and feature-label toggle.
- [x] Update contracts and E2E tests.
- [x] Run targeted verification and record integration readiness.
