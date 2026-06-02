# Ocean Baltic Sea Source 2026-06-02 Plan

## Goal

Replace `tno_baltic_sea` with a public Marine Regions source while preserving existing child seas, chokepoint seams, provenance, chunks, manifests, startup bundles, and audit counts.

## Acceptance

- `tno_baltic_sea` no longer appears in `local_clone_extracts`.
- The selected source keeps existing child-water seams closed after subtraction.
- Generated water changes stay limited to `tno_baltic_sea` and any directly linked open-ocean correction that can be explained.
- Audit source replacement count decreases without low-precision candidates or provenance gaps.
- Geometry validator, targeted water/source tests, chunk manifest checks, and `git diff --check` pass.

## Steps

- [x] Create isolated worktree.
- [x] Verify Baltic Sea Marine Regions source candidate.
- [x] Patch source spec, validator, and tests.
- [x] Synchronize checked-in water/runtime/chunk/startup assets.
- [x] Validate and review.
- [ ] Commit, push, archive, cleanup.

## Final Plan Notes

- Source candidate is Marine Regions IHO `mrgid=2401`, recorded as `source_layer="iho"` and `source_query="mrgid=2401"`.
- Snapshot simplification tolerance is `0.008`; this keeps the named-water snapshot under the 100 MiB limit while preserving Baltic child seams.
- Baltic stays a high-precision parent because it is split by existing child seas: Kattegat, The Sound, Storebaelt, Lillebaelt, Central Baltic Sea, Gulf of Riga, Gulf of Finland, Bothnian Sea, and Bay of Bothnia.
- Bay of Bothnia is covered by non-overlap tests only; it is separated from the Baltic parent remnant by Bothnian Sea, so it is not a direct seam pair.
- Asset sync changed the target parent plus the linked Northeast Atlantic open-ocean subtraction boundary.
