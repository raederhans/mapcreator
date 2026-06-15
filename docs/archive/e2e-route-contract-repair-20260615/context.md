# E2E Route Contract Repair Context

## Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-e2e-route-contract-repair-20260615`
- Branch: `codex/e2e-route-contract-repair-20260615`
- Base: `origin/main` at `f21a227f`
- Parent checkout has unrelated local `lessons learned.md` edits; this worktree is isolated.
- Main live process owner: main Codex agent.

## Initial Evidence

- Prior render/data split verification exposed an E2E layer manifest count mismatch before browser launch.
- Direct Playwright showed:
  - `transport_phase_b_main_map_smoke.spec.js` passed.
  - `transport_workbench_label_rotation.spec.js` passed.
  - `transport_workbench_industrial_variants.spec.js` expected 3458 internal features while runtime reported 3449.
  - `transport_workbench_port_coverage_tiers.spec.js` loaded `usa_port/default` while the spec expected coverage-tier variants.

## Running Notes

- Update this file after each diagnosis and validation phase.
- Static diagnosis found `tests/e2e/transport_workbench_country_pack_loading.spec.js` on disk and in `test-import-graph.json`, but absent from `tests/e2e/test-layer-manifest.json`; `tools/e2e_layering.mjs` still expected 45 specs.
- Patched E2E route contract to 46 specs and regenerated `tests/e2e/test-lists/all.txt` plus `tests/e2e/test-lists/feature.txt`.
- Patched industrial variant spec to assert manifest raw feature counts separately from runtime accepted/renderable feature counts.
- Patched port coverage spec to explicitly target `japan_port`, whose manifest owns the `core` / `expanded` / `full_official` variants.
- Static validation passed: `node tools/e2e_layering.mjs check`, `node tools/select_verification_targets.mjs --check`, `git diff --check`.
- Browser E2E validation passed through the layer runner:
  - `node tools/e2e_layering.mjs run-spec tests/e2e/transport_phase_b_main_map_smoke.spec.js`
  - `node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js`
  - `node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_label_rotation.spec.js`
  - `node tools/e2e_layering.mjs run-spec tests/e2e/transport_workbench_port_coverage_tiers.spec.js`
- Touched-file verification routing passed and recommended the industrial/port E2E specs plus short test-infra checks.
- Additional validation passed:
  - `npm run verify:test:e2e-layers`
  - `npm run verify:test-timeout-guardrails`
  - `npm run verify:test-timeout-inventory`
  - `npm run verify:test-import-graph`
  - `py -3.12 -m unittest tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q`
  - `git diff --check`
- Bundled Python lacked `jsonschema`; system Python 3.12 was used for the transport manifest unittest.
- Final read-only review found the first industrial runtime assertion was too broad. Fixed by locking exact runtime accepted counts separately from raw manifest counts: internal `3458 -> 3449`, open `31976 -> 31971`.
- Post-review validation passed:
  - `node tools\e2e_layering.mjs run-spec tests/e2e/transport_workbench_industrial_variants.spec.js`
  - `npm run verify:test:e2e-layers`
  - `node tools\select_verification_targets.mjs --check`
  - `git diff --check`
