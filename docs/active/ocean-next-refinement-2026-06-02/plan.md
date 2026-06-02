# Ocean Next Refinement Plan - 2026-06-02

## Goal

Continue TNO ocean refinement after South China Sea by selecting the next evidence-backed ocean candidate from the current audit, then applying one scoped geometry/source/split improvement with generated assets and verification.

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
- [ ] Run final review.
- [ ] Commit, push, merge, and cleanup.

## Current Decision

- `tno_norwegian_sea`, `tno_caribbean_sea`, and `tno_philippine_sea` are high precision, but Marine Regions WFS evidence shows terminal public-source records without verified child polygon sources. They are now monitored through source review metadata instead of treated as immediate split work.
- `tno_strait_of_dover` and `tno_north_channel` have verified SeaVoX child records (`tno_rye_bay`, `tno_belfast_lough`), but the current builder path regenerates unrelated old global ocean failures before publish. Keep them as next candidates after the builder checkpoint path is repaired.
- Verification passed for the source-review audit contract, invalid source-review rejection including date format, and checked-in water geometry. The publish path remains gated by the existing global ocean validation failures recorded in context.
