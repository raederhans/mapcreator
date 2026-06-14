# Data Chain Integration Plan - 2026-06-14

## Goal

Integrate the data-quality repair and data-chain Phase 2-4 simplification work, then selectively carry non-duplicative render-chain cleanup while preserving runtime data formats and user-visible behavior.

## Execution Rules

- Use `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14` as the integration owner worktree.
- Integrate one logical branch or patch at a time.
- Run live tests/builds from the integration worktree only.
- Keep subagents read-only unless a later task explicitly assigns a disjoint write scope.
- Do not touch `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` dirty WIP.

## Steps

- [x] Create isolated integration worktree from `origin/main`.
- [x] Create worktree registry and integration docs.
- [x] Integrate `codex/data-quality-repair-2026-06-14` as current-main residual data fixes.
- [x] Run data-quality gates.
- [x] Cherry-pick `codex/data-chain-phases-2-4` commit `d858d276`.
- [x] Run Phase 2-4 gates, including `npm run test:node:scenario-chunk-contracts`.
- [x] Selectively carry render-chain cleanup pieces that do not duplicate data-chain helpers.
- [x] Run render-chain selective gates.
- [x] Review `codex/audit-20260612-appearance-transport` for follow-up integration order.
- [x] Merge current `origin/main` and rerun affected gates.
- [x] Selectively integrate `codex/audit-20260612-appearance-transport` and verify Pages dist.
- [x] Update registry, archive or keep active docs according to final state.
- [x] Run final review/bug-check and fix i18n findings.
- [ ] Run final push/merge gate.

## Validation Commands

- `python tools/check_data_catalog.py`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1939`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962`
- `python -m unittest tests.test_data_catalog_contract tests.test_data_manifest_contract tests.test_scenario_contracts tests.test_transport_manifest_contracts tests.test_i18n_audit -q`
- `python -m py_compile map_builder\transport_country_pack_writer.py map_builder\transport_source_extract_cache.py tools\build_transport_country_real_packs.py`
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_scenario_chunk_refresh_contracts -q`
- `node --test tests\transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests\transport_overview_line_strategy_scope_contract.node.test.mjs tests\renderer_runtime_state_behavior.test.mjs`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:worker-task-client`
- `npm run test:node:startup-hydration-behavior`
- `npm run test:node:transport-workbench-preview-lifecycle-owner`
- `npm run test:node:transport-overview-line-contract`
- `npm run verify:pages-dist`
- `git diff --check`
