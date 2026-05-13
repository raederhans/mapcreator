# Context

- Review fix started 2026-05-13.
- Worktree: C:\Users\raede\Desktop\dev\mapcreator-transport-reviewfix
- Branch: transport-phase-b-review-fix
- Live process owner: main agent only.
- Verified the three review claims against current code and fixed them directly.

## Fix notes

- `transportCountryOverlayState` now keeps `overlaysByFamily` plus `activePackIdByFamily`, while preserving top-level last-applied fields for compatibility.
- Renderer reads the family-specific overlay first, so road, rail, and airport overlays can coexist after sequential Apply.
- Workbench pack selection only changes preview/editor state and no longer clears applied main-map overlay state.
- Project export/import persists and restores multiple applied family packs.
- Road sidecar labels with no explicit class now default to low priority; explicit `priority` can opt into stronger label gates.

## Verification

- node --check targeted modified JS/MJS files
- python -m py_compile tests/test_transport_workbench_manifest_runtime_contract.py
- python -m unittest tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q
- node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs
- PLAYWRIGHT_REUSE_EXISTING_SERVER=0 node node_modules/@playwright/test/cli.js test tests/e2e/transport_phase_b_main_map_smoke.spec.js --workers=1 --retries=0
- git diff --check passed with line-ending warnings only.
