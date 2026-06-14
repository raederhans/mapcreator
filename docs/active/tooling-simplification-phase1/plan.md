# Tooling Simplification Phase 1

## Scope

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase1`
- Branch: `codex/tooling-simplification-phase1`
- Owner: main Codex agent
- Live process owner: main Codex agent only
- Focus: data catalog topology validation and adaptive test selector behavior locks

## Plan

1. Lock current behavior with targeted tests:
   - `python -m unittest tests.test_data_catalog_contract -q`
   - `python -m unittest tests.test_e2e_structural_tooling -q`
2. Add a malformed `.topo.json` regression in `tests/test_data_catalog_contract.py`.
3. Fix `tools/build_data_catalog.py` so non-object topology payloads return contract errors.
4. Add adaptive selector golden cases to `tests/test_e2e_structural_tooling.py`.
5. Keep public script names stable and avoid new dependencies.
6. Run required verification and perform read-only review.

## Progress

- [x] Created isolated worktree from `origin/main`.
- [x] Baseline targeted tests recorded.
- [x] Data catalog regression added.
- [x] Topology payload validation fixed.
- [x] Adaptive selector golden cases added.
- [x] Verification completed.
- [x] Review/self-check completed.

## Validation Log

- 2026-06-14: Baseline `python -m unittest tests.test_data_catalog_contract -q` passed: 14 tests in 49.500s.
- 2026-06-14: Baseline `python -m unittest tests.test_e2e_structural_tooling -q` failed with 3 structural red lights:
  - missing `@playwright/test` dependency in this isolated worktree;
  - `tests/e2e/transport_workbench_country_pack_loading.spec.js` absent from timeout guardrail allowlist;
  - `tests/test_tno_water_geometries.py` routed to unittest while the selector contract expects pytest.
- 2026-06-14: Installed worktree npm dependencies with `npm ci --ignore-scripts`; tracked dependency files stayed unchanged.
- 2026-06-14: Fixed `.topo.json` non-object payload handling in `tools/build_data_catalog.py` and locked it in `tests/test_data_catalog_contract.py`.
- 2026-06-14: Added 10 adaptive selector golden cases in `tests/test_e2e_structural_tooling.py`.
- 2026-06-14: Fixed pytest-style top-level test routing in `tools/test_route_registry.mjs`.
- 2026-06-14: Updated existing timeout guardrail allowlist for the current long-timeout transport workbench spec.
- 2026-06-14: `python -m unittest tests.test_data_catalog_contract -q` passed: 15 tests in 46.105s.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` passed: 28 tests in 5.297s.
- 2026-06-14: `node tools/select_verification_targets.mjs --check` passed: route schema check passed for 133 routes.
- 2026-06-14: `npm run test:adaptive -- --dry-run` passed: adaptive selection planned 5 commands, dry-run only.
- 2026-06-14: `git diff --check` passed; output only reported CRLF checkout warnings.
- 2026-06-14: After final import cleanup, `python -m unittest tests.test_data_catalog_contract -q` passed: 15 tests in 65.400s.

## Review Notes

- Public script names and package scripts stayed unchanged.
- Dependency installation used the existing lockfile and produced no tracked dependency diff.
- Changes stayed within testing/tooling scope plus this active task log.
- `.omx` runtime state/log files are local execution noise and are excluded from the product commit.
