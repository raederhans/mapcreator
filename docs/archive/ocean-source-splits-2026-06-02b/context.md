# Ocean Source Splits 2026-06-02b Context

## Starting Point

Current main has low precision candidates = 0, source replacement candidates = 6, high-precision split candidates = 3, and provenance gaps = 0.

## Live Process Ownership

The main agent owns all live validation commands. Subagents may do static/source analysis only.
# 2026-06-02 North Sea source replacement

- Current audit queue after previous pass: 6 source replacement candidates, 3 high-precision split candidates, 3 simplification-monitor candidates.
- Selected `tno_north_sea` for this pass because it is still a local clone while its child waters are already source-backed, and Marine Regions IHO `mrgid=2350` returns one `North Sea` MultiPolygon.
- Live process owner: main agent owns all fetch/build/test commands in this worktree. Subagents are limited to static/source analysis.
- `changed-domain water` failed in the new worktree because the default checkpoint was missing countries.json, so this pass used a scoped `.runtime/tmp` sync script.
- North Sea IHO `mrgid=2350` initially produced about 123k vertices after child subtraction. Added `simplify_tolerance: 0.02`, reducing it to about 11.6k vertices while keeping it source-backed.
- Rebuilding all named waters surfaced Dover as a 70-vertex low-precision candidate. Reduced `tno_strait_of_dover` tolerance from 0.01 to 0.004, bringing it to 120 vertices and restoring low-precision count to 0.
- Final targeted sync replaced only `tno_north_sea` and `tno_strait_of_dover`; water_regions changed IDs confirmed as exactly those two.
- Final audit: low_precision=0, source_replacement=5, high_precision_split=3, simplification_review=3, provenance_gap=0.
- Final validation: `python tools\validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.north_sea_source_final.json` passed.
- Targeted contract tests passed: `2 passed, 189 subtests passed`; full water test before final formatting/hash pass passed: `31 passed in 137.57s`.
