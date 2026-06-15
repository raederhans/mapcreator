# E2E Route Contract Repair Task

## Status

integrated-pending-push

## Checklist

- [x] Create isolated worktree.
- [x] Create active docs.
- [x] Update worktree registry.
- [x] Diagnose E2E layer manifest drift.
- [x] Diagnose industrial variants expectation.
- [x] Diagnose port coverage tiers expectation.
- [x] Patch smallest contract surface.
- [x] Run targeted validation.
- [x] Run review/QA.
- [x] Commit and integrate to main.
- [x] Push and clean worktree.

## Verification Log

- `node tools\e2e_layering.mjs check` - passed.
- `node tools\select_verification_targets.mjs --check` - passed.
- `node tools\select_verification_targets.mjs <changed files> --json` - passed; recommended short test-infra checks plus industrial/port E2E.
- `node tools\e2e_layering.mjs run-spec tests/e2e/transport_phase_b_main_map_smoke.spec.js` - passed.
- `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js` - passed.
- `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_label_rotation.spec.js` - passed.
- `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_port_coverage_tiers.spec.js` - passed.
- `npm run verify:test:e2e-layers` - passed.
- `npm run verify:test-timeout-guardrails` - passed.
- `npm run verify:test-timeout-inventory` - passed.
- `npm run verify:test-import-graph` - passed.
- `py -3.12 -m unittest tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q` - passed, 38 tests.
- `git diff --check` - passed.
- Final review found overly broad industrial runtime count assertions; fixed to exact accepted counts and reran `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js` - passed.
- Post-merge main validation passed:
  - `npm run verify:test:e2e-layers`
  - `node tools\select_verification_targets.mjs --check`
  - `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js`
  - `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_port_coverage_tiers.spec.js`
- Main push completed and temporary worktree was removed; remote branch remains at `f4d16b20` as a recovery record.

## Delivery Package Draft

1. Changed scope: repaired E2E routing metadata and two transport workbench E2E expectations without changing product runtime.
2. Core files: `tools/e2e_layering.mjs`.
3. Test files: `tests/e2e/test-layer-manifest.json`, `tests/e2e/test-lists/all.txt`, `tests/e2e/test-lists/feature.txt`, `tests/e2e/transport_workbench_industrial_variants.spec.js`, `tests/e2e/transport_workbench_port_coverage_tiers.spec.js`.
4. Docs files: `docs/active/_worktree_registry.md`, this active task folder.
5. Diff summary: E2E spec count 45 -> 46; added `transport_workbench_country_pack_loading.spec.js` to feature/all lists; separated industrial manifest raw counts from exact runtime accepted counts; pinned port coverage tiers to `japan_port`.
6. Commit state: implementation committed as `f4d16b20`; closeout and cleanup registry commits were pushed to main.
7. Base divergence: branch started from `origin/main` `f21a227f`; current local main was at the same commit when this worktree was created.
8. Conflict risk: green by direct file path against known active worktrees; yellow semantic relation to test-routing/tooling lanes because this touches E2E routing metadata.
9. Remaining risk: no Pages dist impact was selected by touched-file routing; bundled Python lacks `jsonschema`, so Python transport contract used system Python 3.12.
10. Recommended next step: continue with the next split direction from current main.
