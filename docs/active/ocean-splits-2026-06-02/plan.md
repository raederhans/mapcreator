# Ocean Splits 2026-06-02 Plan

## Goal

Continue the ocean refinement program after Scotia Sea by turning remaining high-value macro-only water bodies into source-backed or child-detail water records.

## Acceptance

- Current audit is refreshed from main.
- Candidate choice is evidence-based: source replacement queue, high-precision split queue, and provenance status are documented.
- At least one aligned refinement is implemented in checked-in scenario data, provenance, runtime/chunk/startup artifacts, and tests.
- Validators and targeted tests pass.
- Final review finds no blocker.

## Steps

- [x] Create isolated worktree.
- [x] Activate ultrawork state.
- [x] Refresh detailed audit and choose candidates.
- [x] Implement source-backed or child-water refinement.
- [x] Synchronize generated assets.
- [x] Extend tests.
- [x] Validate and review.
- [ ] Merge, push, and clean up.

## Candidate Decision

- Starting audit: source replacement candidates = 7; high-precision split candidates = 4.
- Implemented source replacement: `tno_weddell_sea` now uses Marine Regions SeaVoX `mrgid_sr='24035'`.
- Implemented child split: `tno_hudson_strait` is a Marine Regions SeaVoX `marine_detail` child of `tno_hudson_bay`, using `mrgid_sr='24017'`.
- Resulting audit: source replacement candidates = 6; high-precision split candidates = 3; marine macro with children = 13.

## Build Notes

- `python tools\patch_tno_1962_bundle.py --changed-domain water --refresh-named-water-snapshot` needs a countries checkpoint in a fresh worktree.
- `python tools\patch_tno_1962_bundle.py --stage countries --refresh-named-water-snapshot` is blocked in this worktree by the missing external HGO donor root.
- Scoped sync used existing project helpers for named-water feature generation, runtime topology replacement, water chunk rebuild, manifest update, and startup bundle rebuild.

## Validation

- [x] `python -m py_compile tools\validate_tno_water_geometries.py tools\audit_tno_water_family_refinement.py tools\patch_tno_1962_bundle.py tests\test_tno_water_geometries.py`
- [x] `python tools\validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.ocean_splits.json`
- [x] Targeted pytest for Weddell, Hudson Strait, phase targets, probes, manifest/startup, and chunk hash.
- [x] `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests/test_tno_water_geometries.py -q`
- [x] `python tools\audit_tno_water_family_refinement.py`
- [x] `git diff --check`
- [x] Read-only code review subagent: no blocking issues.
