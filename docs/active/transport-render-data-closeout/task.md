# Transport Render/Data Closeout Task Log

## Status

Current status: in-progress

## Workstream Tasks

### WS3: Dist Drift Guard

- [x] Confirm tracked `dist/app` path set.
- [x] Run `python tools/build_pages_dist.py` equivalent with bundled Python because `python` is not on PATH in Codex App PowerShell.
- [x] Confirm generated changes are scoped to tracked dist and manifest.
- [x] Add `.github/workflows/verify-shared.yml` drift guard.
- [x] Add `package.json` script `verify:dist-drift`.
- [x] Verify passing guard.
- [x] Verify deliberate drift failure and revert.
- [x] Commit WS3.

### WS2: Jsonschema Smoke Profile Validator

- [x] Run baseline `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- [x] Locate dependency files and add `jsonschema>=4.0` if missing.
- [x] Confirm `jsonschema` import.
- [x] Replace structural checks with Draft 2020-12 schema.
- [x] Preserve localhost, output containment, safe ID, port, budget, mode subset, and route reference checks.
- [x] Run contract test and real profile validation.
- [x] Update schema doc if needed.
- [x] Commit WS2.

### WS1: Single OSM-GPKG Family Driver

- [x] Discover clock/output/stub points and live pack IDs.
- [x] Reuse existing golden fixture and snapshots against current builders.
- [x] Run golden test against current code.
- [x] Confirm separate pre-refactor commit is unnecessary because existing golden net already covers the refactor.
- [x] Add `FamilyOutput` and per-output registry config.
- [x] Add row-builder dispatch and generic driver.
- [x] Repoint builder registry through the generic driver while keeping thin compatibility wrappers for existing tests/scripts.
- [x] Run golden test with zero diffs.
- [x] Add Python-JS geometry contract test.
- [x] Run builder contract tests.
- [ ] Commit WS1.

### Final Closeout

- [ ] Run changed-file ai-slop-cleaner pass.
- [ ] Run final targeted verification.
- [ ] Run independent code-review lanes.
- [ ] Run or justify UltraQA.
- [ ] Update worktree registry and delivery package.
- [ ] Push branch if verification is clean.
- [ ] Clean worktree only after merge/abandon condition is satisfied.

## Delivery Package Draft

Pending until implementation is complete.
