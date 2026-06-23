# Scenario Political Chunk Full Derived State Phase 1

## Goal

Fix the chunk promotion path where a viewport-primary political visible subset can become the stable renderer derived state. The visual fast path may use the visible subset for the first frame, but the deferred infrastructure stage must restore complete political derived state from `runtimeState.scenarioPoliticalChunkData`.

## Scope

- In scope: `chunk_runtime`, `scenario_refresh_runtime`, map renderer derived-state contracts, focused Node/Python tests, diagnostics, Pages dist sync if source/dist parity is required.
- Out of scope: Thematic panel changes, UI layout changes, scenario data regeneration, and 1936/1939 Red Sea follow-up work.

## Acceptance

- A regression test constructs full political payload ids `GER`, `ITA`, `POL`, `FRA` and primary visible ids `GER`, `ITA`.
- Deferred infra restores full political derived state after visual-stage primary subset rebuild.
- `scenarioPoliticalVisibleChunkData` is cleared or disabled after stable restore.
- `runtimeState.colors` is rebuilt from full political feature ids.
- Diagnostics report partial stable derived-state mismatch without normal spam.
- Targeted Node and Python tests pass, plus `verify:pages-dist` if dist mirrors change.

## Execution Checklist

- [x] Confirm current worktree and branch state.
- [x] Read relevant skills and project rules.
- [x] Locate suspected state chain.
- [x] Add failing Node regression.
- [x] Implement smallest restore-path fix.
- [x] Add diagnostic metric.
- [x] Update boundary contracts.
- [x] Run targeted validation.
- [x] Run review and first-principles bug check.
- [x] Update delivery package and registry.

## Phase 1 Result

- Visual first-frame promotion still uses the viewport-primary political subset for fast paint.
- Deferred infra now distinguishes `primaryVisibleDerivedStateReady` from `completePoliticalDerivedStateReady`.
- When feature-id coverage shows the stable renderer state is only the visible subset, deferred infra clears `scenarioPoliticalVisibleChunkData` and rebuilds full political land/index/spatial/color state from `scenarioPoliticalChunkData`.
- Coverage diagnostics record complete, visible, land, and color counts plus missing id samples and chunk-selection context.
- The 1936/1939 Red Sea and unrelated palette/base-color gaps remain Phase 2 work.
