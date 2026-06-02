# Ocean South China Sea Source 2026-06-02 Plan

## Goal

Replace `tno_south_china_sea` with a public Marine Regions source while preserving nearby marginal seas, provenance, chunks, manifests, startup bundles, and audit counts.

## Acceptance

- `tno_south_china_sea` no longer appears in `local_clone_extracts`.
- The selected public source preserves South China Sea position, scale, and neighboring sea boundaries.
- Generated water changes stay limited to the target and any directly linked neighbor/open-ocean subtraction that can be explained.
- Audit source replacement count decreases without low-precision candidates or provenance gaps.
- Geometry validator, targeted source tests, chunk manifest checks, large-file check, and `git diff --check` pass.

## Steps

- [x] Create isolated worktree.
- [x] Verify public source candidate.
- [x] Patch source spec, validator, and tests.
- [x] Synchronize checked-in water/runtime/chunk/startup assets.
- [x] Validate and review.
- [ ] Commit, push, archive, cleanup.

## Result

- Selected Marine Regions SeaVoX v19 `mrgid_sr='24144'` for `tno_south_china_sea`, because it matches the existing South China Sea scale more closely than the broader IHO polygon.
- Refreshed the named-water snapshot with `snapshot_simplify_tolerance=0.03`; snapshot size is `104,538,794` bytes, below the GitHub 100 MiB hard limit.
- Replaced `tno_south_china_sea` geometry with SeaVoX source minus existing child waters: Taiwan Strait, Gulf of Tonkin, Gulf of Thailand, Natuna Sea, Singapore Strait, Java Sea, and Sulu Sea.
- Rebuilt `scenario_water` in runtime topology, water chunks, startup bundles, manifest hashes, and provenance.
- Preserved existing `scenario_atlantropa` runtime topology object by replacing only `scenario_water`.
- Pruned direct Pacific open-ocean subtraction results with the existing `component_min_area=0.05` rule to keep open-ocean component contracts stable.

## Verification

- `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.south_china_sea.json`
- `python tools\audit_tno_water_family_refinement.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\tno_water_family_refinement_audit.south_china_sea.json`
- `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests\test_tno_water_geometries.py -q`
- `$env:PYTHONPATH='.'; uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests\test_tno_bundle_builder.py -q`
- `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests\test_tno_named_marginal_water_contract.py -q`
