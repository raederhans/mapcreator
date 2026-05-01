# test-system-routing-overhaul task

## Current task
Implement route metadata, selector, E2E domain/owner commands, and targeted verification.

## Status
- [x] Task initialized.
- [x] Route registry implemented.
- [x] E2E run/generate write boundary fixed.
- [x] Domain/owner/explain commands implemented.
- [x] Read-only selector implemented.
- [x] PR-fast explain artifact wired with `--check` gate.
- [x] Targeted verification complete.
- [x] Review findings fixed.

## Verification evidence
- `node --check tools/e2e_layering.mjs` passed.
- `node --check tools/test_route_registry.mjs` passed.
- `node --check tools/select_verification_targets.mjs` passed.
- `node tools/select_verification_targets.mjs --check` passed for 71 routes.
- `npm run verify:test:e2e-layers` passed.
- `node tools/e2e_layering.mjs list-owner ui-shell` printed 7 matching specs.
- `node tools/e2e_layering.mjs explain tests/e2e/tno_1962_ui_smoke.spec.js` printed route metadata.
- `node tools/e2e_layering.mjs run-domain city-runtime -- --list` listed 8 tests and wrote `.runtime/tests/e2e-lists/domain-city-runtime.txt`.
- `python -m unittest tests.test_app_entry_resolver tests.test_map_renderer_interaction_border_snapshot_orchestration_contract tests.test_perf_gate_contract tests.test_startup_shell -q` passed 29 tests.
- `npm run test:node:scenario-chunk-contracts` passed 16 tests.
- `git diff --check` passed.

## Review follow-up verification
- `node tools/select_verification_targets.mjs js/ui/sidebar.js --json` recommends UI shell/sidebar/ui-rework routes.
- `node tools/select_verification_targets.mjs scenario_builder/hoi4/compiler.py --json` recommends `python tools/build_hoi4_scenario.py` with checkpoint/scenario-data locks.
- `npm run verify:test:e2e-layers` passed.
- `python -m unittest tests.test_app_entry_resolver tests.test_map_renderer_interaction_border_snapshot_orchestration_contract tests.test_perf_gate_contract tests.test_startup_shell -q` passed 29 tests.
- `npm run test:node:scenario-chunk-contracts` passed 16 tests.
- `git diff --check` passed.
