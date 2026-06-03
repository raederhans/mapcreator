# Water Selection Visual Hit Fix Plan

## Goal
Restore visibility and click selection for Atlantropa Mediterranean waters, Congo Lake, lake tiles, and normal ocean tiles after the recent ocean refinement work.

## Acceptance
- Named TNO waters that existed before ocean refinement remain renderable water surfaces.
- Lake and ocean water features remain present in the runtime water chunks.
- Water features keep stable ids and metadata needed by hit selection.
- Targeted tests cover the regression path.
- `verify:scenario-contracts:strict`, `verify:pages-dist`, and focused water tests pass.

## Steps
- [x] Map current water data, render, and hit-selection paths.
- [x] Reproduce the missing-feature path with data/contract evidence.
- [x] Patch the smallest root cause.
- [x] Add or extend targeted tests.
- [x] Run focused validation and final review.
- [x] Archive this task folder after completion.
