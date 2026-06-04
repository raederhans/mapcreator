# Belarus Fragment Interaction Plan

## Goal

Hide small detached land fragments from the interactive/visual land layer while preserving the original political topology and feature ids.

## Constraints

- Do not edit source topology or GeoJSON geometry files.
- Keep ownership, history, scenario, and override data keyed by the existing feature ids.
- Exclude normal island/archipelago geography from this pass.
- Keep implementation scoped to political collection runtime policy and tests.

## Acceptance Criteria

- Belarus interior features `BY_INT_VITEBSK`, `BY_INT_MOGILEV`, and `BY_INT_MINSK` keep their feature ids.
- Their small detached MultiPolygon components below the configured threshold are absent from `runtimeState.landData`.
- `runtimeState.landDataFull` still preserves the full unmodified feature collection.
- Policy validation and targeted renderer owner tests pass.

## Tasks

- [x] Inspect political collection and interaction data flow.
- [x] Add display policy for fragment camouflage.
- [x] Apply policy inside `buildInteractiveLandData`.
- [x] Add focused tests for policy validation and runtime pruning.
- [x] Scan for other clear landlocked detached-fragment candidates.
- [x] Run targeted verification and final review.
