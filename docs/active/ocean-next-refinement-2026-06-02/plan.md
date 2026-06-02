# Ocean Next Refinement Plan - 2026-06-02

## Goal

Continue TNO ocean refinement after South China Sea by selecting evidence-backed ocean candidates, repairing the narrow publish path needed for water-only changes, then applying scoped geometry/source/split improvements with generated assets and verification.

## Acceptance

- Current audit is regenerated from `origin/main`.
- Candidate choice is evidence-based and recorded.
- High precision is treated as useful split evidence when the parent sea still needs child waters.
- Geometry edits use public/source-backed data or existing checked-in source contracts.
- Water data, `scenario_water` runtime topology, chunks, startup bundles, manifest hashes, and provenance stay in sync if geometry changes.
- Validators and targeted/full relevant tests pass.

## Steps

- [x] Create isolated worktree.
- [x] Load lessons and prior backlog notes.
- [x] Run current audit and inspect candidate lists.
- [x] Choose the next candidate and implementation path.
- [x] Patch source-review audit contract and tests.
- [x] Validate checked-in geometry and targeted audit contract.
- [x] Add and verify `water_runtime_from_scenario` checkpoint stage.
- [x] Route normal `water` changed-domain rebuilds through the narrow stage.
- [ ] Run final review.
- [ ] Commit, push, merge, and cleanup.

## Current Decision

- `tno_norwegian_sea`, `tno_caribbean_sea`, and `tno_philippine_sea` are high precision, but Marine Regions WFS evidence shows terminal public-source records without verified child polygon sources. They are now monitored through source review metadata instead of treated as immediate split work.
- `tno_strait_of_dover` and `tno_north_channel` have verified SeaVoX child records (`tno_rye_bay`, `tno_belfast_lough`). They remain the next geometry candidates now that a narrow checked-in-water runtime checkpoint stage exists.
- `tno_bosporus_dardanelles` is the only current source replacement candidate and should be evaluated after the narrow stage is landed, because it is a local clone with low score.
- The publish blocker for water-only checked-in edits is reduced: `water_runtime_from_scenario` now passes prechunk checkpoint validation with 130 water features, and the normal `--changed-domain water` path executes `water_runtime_from_scenario -> write_bundle -> chunk_assets`. The older full generator still carries unrelated global ocean topology failures and should be treated as a separate repair lane.
