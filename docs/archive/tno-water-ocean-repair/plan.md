# TNO Water/Ocean Repair Plan

## Goal

Repair the TNO 1962 water/ocean chain so geometry validation, generated water data, runtime water mode, and targeted rendering/hit checks agree.

## Acceptance

- `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962` completes without OOM.
- Targeted TNO water geometry tests cover Greenland Sea, Barents Sea, Ross Sea, Sea of Japan, Sea of Okhotsk, and Tatarskiy Proliv.
- TNO runtime water exclusive mode is expressed as a scenario manifest contract.
- `npm run test:node:scenario-chunk-contracts` passes.
- `npm run verify:scenario-contracts:strict` passes.

## Execution Order

1. Repair the validator memory path and add target overlap/seam/antimeridian assertions.
2. Clarify generator semantics for base exclusions, geometry subtraction, and polar supplement boxes.
3. Add the manifest water mode contract and update runtime consumers.
4. Rebuild or refresh shipped TNO artifacts as required by strict contract.
5. Run targeted verification and final review.
