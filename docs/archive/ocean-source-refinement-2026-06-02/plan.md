# Ocean Source Refinement Plan

## Goal

Use the ocean backlog audit to land the first safe source-backed water refinement update for TNO 1962.

## Scope

- Start from `source_replacement_candidates`.
- Prefer public/source-backed Marine Regions geometry over local clone geometry.
- Keep high-detail macro seas when they are still candidates for child-water splits.
- Update provenance and tests with the same change.
- Avoid UI, selection styling, and unrelated geometry cleanup in this phase.

## Acceptance

- The changed water geometry has source/provenance evidence.
- `tools/audit_tno_water_family_refinement.py` reports the intended candidate improvement.
- `tools/validate_tno_water_geometries.py` passes with no ocean macro overlap regression.
- Targeted water geometry tests pass.
- Final review finds no current-phase blocker.

## Steps

- [x] Create isolated worktree and activate ultragoal/ultrawork artifacts.
- [x] Read project rules, lessons, prior ocean backlog context, and data rules.
- [x] Select first source-backed target from the audit queue.
- [x] Implement the smallest geometry/provenance update.
- [x] Extend existing targeted tests.
- [x] Run validation and review.
- [x] Merge, push, and clean up worktree.
