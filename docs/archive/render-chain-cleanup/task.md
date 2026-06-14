# Render Chain Cleanup Tasks

## Phase 1A

- [x] Run baseline transport tests.
- [x] Inventory fallback-like and duplicate code in road/rail preview scope.
- [x] Extract shared road/rail preview path and length helpers.
- [x] Extract shared label density/grid occupancy helper where behavior matches.
- [x] Replace manual dataset parent walking with `Element.closest()` plus containment checks.
- [x] Add or reuse minimal DOM test helper if repeated setup is found.
- [x] Run Phase 1A verification.
- [x] Run review/self-check and fix findings.

## Phase 1B

- [x] Start only after Phase 1A is green.
- [x] Inventory overview road/rail duplicate drawing and label seams.
- [x] Extract the narrowest shared family line-layer helper or defer if the seam is too wide.
- [x] Run Phase 1B verification.

## Phase 2

- [x] Start only after Phase 1 is green.
- [x] Repair stale chunk promotion union contract test.
- [x] Extract shared renderer refresh transaction reset helper.
- [x] Preserve `setMapData` and `scenario apply` path-specific reset order.
- [x] Run Phase 2 verification.

## Phase 3

- [x] Start only after Phase 2 is green.
- [x] Inventory current worker client duplication and tests.
- [x] Add worker client helper only if current files show real repeated task-client structure.
- [x] Run `.runtime` spatial index spike without changing production grid.
- [x] Run Phase 3 verification.
