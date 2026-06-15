# E2E Route Contract Repair Plan 2026-06-15

## Goal

Repair the current E2E route contract blockers that were exposed by the render/data split verification, without changing product runtime behavior.

## Scope

- Fix the E2E layer manifest count drift.
- Re-ground `transport_workbench_industrial_variants.spec.js` on the current checked-in industrial data/runtime contract.
- Re-ground `transport_workbench_port_coverage_tiers.spec.js` on the current checked-in port manifest/variant contract.
- Keep this task limited to tests, route metadata, and active documentation unless evidence proves a product bug.

## Acceptance Criteria

- `node tools/e2e_layering.mjs run-spec tests/e2e/transport_phase_b_main_map_smoke.spec.js` starts through the layer manifest gate.
- The selected specs pass through the project E2E layering path or a documented equivalent if the layer tool owns a separate current-state issue:
  - `tests/e2e/transport_phase_b_main_map_smoke.spec.js`
  - `tests/e2e/transport_workbench_industrial_variants.spec.js`
  - `tests/e2e/transport_workbench_label_rotation.spec.js`
  - `tests/e2e/transport_workbench_port_coverage_tiers.spec.js`
- Static route/schema checks pass:
  - `node tools/select_verification_targets.mjs --check`
  - relevant structural route tests if touched.
- `git diff --check` passes.

## Work Plan

1. [completed] Establish worktree, docs, and current evidence.
2. [completed] Compare actual E2E spec set with `tests/e2e/test-layer-manifest.json`.
3. [completed] Diagnose industrial variant expectation against checked-in data and runtime snapshot.
4. [completed] Diagnose port coverage tier expectation against current manifest and runtime setup.
5. [completed] Patch the smallest test/route contract surface.
6. [in-progress] Run targeted validation, static review, commit, integrate, push, and clean worktree.

## Live Process Ownership

- Main Codex agent owns all Playwright/E2E runs and polling.
- Subagents may do static file and manifest analysis only.
