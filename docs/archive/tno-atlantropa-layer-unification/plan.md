# TNO 1962 Atlantropa Layer Unification Plan

## Objective

Move ATL* scenario geometry out of the political runtime path and into a first-class `scenario_atlantropa` layer. Rendering, color, chunk coverage, startup hydration, and interaction should all read explicit Atlantropa fields instead of prefix-only inference.

## Execution Plan

- [x] Establish context snapshot and active docs.
- [x] Start parallel read-only agents for data/build, runtime loader, renderer/spatial, tests, and architecture critique.
- [ ] Update data generation to emit `scenario_atlantropa` topology object, standalone topology, metadata, chunk layer, manifest fields, and refreshed runtime metadata.
- [ ] Update strict checker to validate Atlantropa layer separation and ATL field legality.
- [ ] Update runtime loader/state/startup/chunk merge paths for `scenarioAtlantropaData`.
- [ ] Update renderer/color/spatial interaction paths to read `atl_render_layer`, `atl_color_rule`, and `atl_interactive`.
- [ ] Update existing scenario chunk tests for layer separation, ATL fields, color resolution, chunk coverage, and hit-test samples.
- [ ] Regenerate TNO 1962 assets through the canonical builder path.
- [ ] Run targeted verification: strict TNO contract, scenario chunk contract tests, targeted unit tests, and final diff checks.
- [ ] Run final review/bug check and record any major new lesson.

## Implementation Boundaries

- No new worktree.
- Avoid direct generated-data edits except as output from the builder.
- Preserve unrelated dirty work.
- No browser validation unless code/test evidence leaves a visual-only gap.
- Keep new abstractions narrow and named around the `scenario_atlantropa` contract.
