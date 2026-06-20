# TNO Coverage Contract Follow-up Plan

## Goal

Close the review findings from the TNO coverage-chain audit by strengthening machine contracts before geometry repair:

- Replace Atlantropa basin probe bbox-only coverage with geometry-backed probe checks.
- Expose `polar_spherical_failures` in strict scenario reports.
- Lock `coverage_ledger_paths` and all `coverage_report_paths` in source and Pages tests.
- Correct stale registry/archive delivery state.

## Constraints

- Work in `C:\Users\raede\Desktop\dev\mapcreator-tno-coverage-chain-audit`.
- Preserve parent checkout WIP in `C:\Users\raede\Desktop\dev\mapcreator`.
- Main agent owns all live tests and Pages dist commands.
- Subagents are review-only for this follow-up.

## Acceptance Gates

- `npm run verify:tno-coverage-chain`
- `npm run python -- -m unittest tests.test_scenario_contracts -q`
- `npm run python -- -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_tno_coverage_ledgers_are_published_with_runtime_metadata_hashes -q`
- `npm run python -- -m py_compile tools/check_scenario_contracts.py`
- `git diff --check`

Run `npm run verify:pages-dist` if Pages dist manifest or source/dist publishing output changes.
