# runtime topology review follow-up plan

Acceptance:
- [x] blank map mode keeps explicit empty runtime topology during activation/hydration.
- [x] scenario manifest source hashes are written by generator chain, not only by startup bundle payload.
- [x] targeted tests and strict contract pass.

Steps:
- [x] Verify review comments against current code.
- [x] Patch blank-mode topology handling with minimal branch.
- [x] Patch generator manifest source persistence.
- [x] Add/adjust targeted tests.
- [x] Run focused verification.
- [x] Archive docs after completion.

Verification:
- `node --check js/core/scenario_apply_pipeline.js js/core/scenario/startup_hydration.js`: passed.
- `python -m py_compile tools/build_startup_bundle.py tests/test_startup_bootstrap_assets.py`: passed.
- `npm run test:node:startup-hydration-behavior`: 9 passed.
- `npm run test:node:scenario-lifecycle-runtime-behavior`: 5 passed.
- `python -m unittest tests.test_startup_bootstrap_assets tests.test_scenario_contracts -q`: 40 passed.
- `python -m unittest tests.test_scenario_contracts tests.test_startup_bootstrap_assets tests.test_pages_dist_startup_shell tests.test_data_manifest_contract tests.test_scenario_manager_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_startup_shell -q`: 67 passed, 7 skipped.
- `python tools/check_scenario_contracts.py --strict`: all checked-in scenarios OK.
