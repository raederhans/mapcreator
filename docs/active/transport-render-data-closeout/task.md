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
- [ ] Commit WS3.

### WS2: Jsonschema Smoke Profile Validator

- [ ] Run baseline `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- [ ] Locate dependency files and add `jsonschema>=4.0`.
- [ ] Confirm `jsonschema` import.
- [ ] Replace structural checks with Draft 2020-12 schema.
- [ ] Preserve localhost, output containment, safe ID, port, budget, mode subset, and route reference checks.
- [ ] Run contract test and real profile validation.
- [ ] Update schema doc if needed.
- [ ] Commit WS2.

### WS1: Single OSM-GPKG Family Driver

- [ ] Discover clock/output/stub points and live pack IDs.
- [ ] Add golden fixture test and snapshots against current builders.
- [ ] Run golden test against current code.
- [ ] Commit pre-refactor golden net.
- [ ] Add `FamilyOutput` and per-output registry config.
- [ ] Add row-builder dispatch and generic driver.
- [ ] Repoint builder registry and remove old four functions.
- [ ] Run golden test with zero diffs.
- [ ] Add Python-JS geometry contract test.
- [ ] Run builder contract tests.
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
