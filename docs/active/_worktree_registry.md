# Worktree Registry

Last updated: 2026-06-14

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phase2-3-deepening-2026-06-14`
- Integration branch: `codex/data-chain-phase2-3-deepening-2026-06-14`
- Base: `origin/main` at `3d247f17`
- Live test/build owner: main Codex agent only
- Subagents: static review only

## Recommended Order

1. `codex/tooling-simplification-phase4a`
2. Keep `codex/tooling-simplification-phase2` isolated while it remains in-progress elsewhere
3. Check `codex/data-chain-phase2-3-deepening-2026-06-14` cleanup/closeout state in a separate housekeeping pass
4. Mark empty or superseded audit worktrees as integrated/abandoned candidates in a separate housekeeping pass

## Worktrees

| Worktree | Branch / HEAD | Base | Status | Goal | Hot files | Tests / evidence | Overlap risk | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator` | `main` / pushed final integration state | `9a5febfe` | integrated-and-pushed | Main checkout | main branch | fast-forwarded from integration branch after final QA, then pushed to `origin/main` | Green | None |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phase2-3-deepening-2026-06-14` | `codex/data-chain-phase2-3-deepening-2026-06-14` / `506d0b0e` | rebased on `origin/main` `3d247f17` | ready-for-integration | Phase 2 transport pack writer deepening and Phase 3 point preview runtime split | `tools/build_transport_country_real_packs.py`, `map_builder/transport_country_pack_writer.py`, point preview source/dist mirror, `dist/pages-dist-manifest.json`, tests | py_compile; 138 targeted Python tests; 33 targeted node tests; `verify:test-import-graph`; `verify:pages-dist`; `git diff --check` | Yellow with prior data-chain/render-chain helper work; Green vs tooling WIP by file path | Merge to `main` after static review closes |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14` | `codex/data-chain-integration-2026-06-14` / `77d18776` | `fba1b710` plus merged `origin/main` `9a5febfe` | integrated-and-cleaned | Integration owner for data chain continuation | registry, data, renderer, transport, chunk generator, appearance/i18n Pages surface | data-quality, Phase 2-4, render selective, origin/main merge, audit selective, final review fix, and Pages dist gates passed | Resolved | Worktree removed after main push; branch and main history preserve recovery |
| `C:\Users\raede\Desktop\dev\mapcreator-data-quality-repair-2026-06-14` | `codex/data-quality-repair-2026-06-14` / `b856ceca` | `979b20de` | integrated | Repair scenario/data/catalog/i18n/transport asset contracts | data manifests, scenario assets, `dist/pages-dist-manifest.json`, `js/core/data_loader.js`, `lessons learned.md` | premerge branch gates passed; direct merge was rejected because current main already contains same-theme later commits; residual HOI4/data manifest drift fixed in integration and post-fix gates passed | Resolved | Recoverable reference; cleanup allowed after main push confirmation |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phases-2-4` | `codex/data-chain-phases-2-4` / `d858d276` | `b279558d` | integrated | Consolidate transport builder, line preview helpers, renderer transaction helpers | `js/core/map_renderer.js`, road/rail preview, `dist/pages-dist-manifest.json`, `lessons learned.md`, transport builder helpers | integrated by cherry-pick; Phase 2-4 gate passed after HOI4 1939 chunk repair | Resolved | Recoverable reference; cleanup allowed after main push confirmation |
| `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup` | `codex/render-chain-cleanup-phase4-5` / `8e89262e` | `cf2a57a1` | integrated-selectively | Narrow shared preview helpers, renderer reset helper, worker task client | `js/core/map_renderer.js`, road/rail preview, `js/core/startup_worker_client.js`, `js/core/worker_task_client.js`, `package.json`, tests | worker/startup/overview pieces already present from main; duplicate line helper removed; render selective gate passed | Resolved | Recoverable reference; cleanup allowed after main push confirmation |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260612-appearance-transport` | `codex/audit-20260612-appearance-transport` / `01811500` | `cf2a57a1` | integrated-selectively | Appearance preset/i18n audit fixes | `index.html`, `dist/app/index.html`, appearance preset state, i18n catalog | selected target files plus regenerated Pages manifest; JSON, node tests, `verify:pages-dist`, static review fix, and `git diff --check` passed | Resolved | Recoverable reference; cleanup allowed after main push confirmation |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260610-20260610-113750` | `audit/20260610-appearance-transport-20260610-113750` / `cf2a57a1` | `cf2a57a1` | abandoned candidate | Old audit preservation worktree | none vs `origin/main` | no diff vs `origin/main...HEAD` | Green | Mark abandoned/integrated after final check |
| `C:\Users\raede\Desktop\dev\mapcreator-hoi4-strategic-values` | `codex/hoi4-strategic-values` / `979b20de` | `979b20de` | integrated candidate | HOI4 strategic values branch already in main ancestry | none vs `origin/main` | no diff vs `origin/main...HEAD` | Green | Mark integrated candidate |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` | `codex/tooling-simplification-phase2` / `fba1b710` | `fba1b710` | in-progress elsewhere | Tooling simplification work | dirty `tools/check_scenario_contracts.py`, `tests/test_scenario_contracts.py`, active docs | no committed diff yet | Yellow with data-quality on scenario contract tooling | Do not touch in this integration |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase3` | `origin/codex/tooling-simplification-phase3` / `e296e660` | `origin/main` `3d8cd631` | integrated-and-cleaned | Tooling simplification phase3: split browser-smoke static routing from live perf routing | `tools/select_verification_targets.mjs`, `tools/test_route_registry.mjs`, `tests/test_e2e_structural_tooling.py`, active docs, `lessons learned.md` | browser-smoke selector golden red-then-green; branch and main pushed; main structural unittest, static smoke contract, selector check, direct selector JSON, adaptive dry-run, diff check passed | Green by file path vs data/render/scenario worktrees; Yellow semantic relation to test-routing only | None |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase4a` | `codex/tooling-simplification-phase4a` / `43abd4a3` | `origin/main` `b06e2ece` | ready-for-integration | Tooling simplification phase4A: static browser smoke profile validator | `ops/browser-mcp/run-smoke-browser-inspection.sh`, `tests/test_playwright_app_ready_gate_contract.py`, `tools/browser_smoke_profile_contract.py`, `tools/select_verification_targets.mjs`, `tools/test_route_registry.mjs`, `lessons learned.md`, active docs | static unittest, structural unittest, selector check, selector JSON dry-runs, validator CLI, py_compile, adaptive dry-run, LF-normalized shell syntax, and diff check passed; no live browser smoke | Green by file path vs data/render/scenario worktrees; Yellow semantic relation to phase3 test-routing files; Red only if another worktree edits same browser-smoke profile/test files | Push branch, merge to main, verify on main, then clean worktree; keep phase2 untouched |

## Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| data-quality -> data-chain | Yellow | Both touch `dist/pages-dist-manifest.json` and `lessons learned.md`; data-quality repairs the scenario data gate data-chain exposed. |
| data-chain -> render-chain | Red | Both edit `js/core/map_renderer.js`, road/rail preview files, and scenario chunk refresh tests. |
| data-quality -> tooling-simplification | Yellow | Tooling worktree has uncommitted scenario contract edits; integration branch must not absorb them. |
| data-quality -> audit-20260612 | Yellow | Both touch Pages delivery surfaces through `index.html` / dist outputs. |
| render-chain -> audit-20260612 | Green | File overlap is minimal; semantic coupling through Pages dist only. |
| current Phase 2/3 deepening -> tooling-simplification | Green | Current work targets transport writer and point preview runtime; tooling WIP targets scenario contract tooling. |
| current Phase 2/3 deepening -> previous data-chain/render-chain references | Yellow | Same transport helper family and preview runtime concepts; old worktrees are integrated references and should not be merged again. |

## Current Execution Notes

- Main checkout is clean, but `codex/tooling-simplification-phase2` has unrelated dirty WIP. This integration does not touch that worktree.
- `codex/data-chain-phase2-3-deepening-2026-06-14` is the only branch allowed to run live validation for this task.
- Registry must be updated after each successful merge, validation failure, conflict resolution, and final integration.
- 2026-06-14: created `codex/data-chain-phase2-3-deepening-2026-06-14` from `origin/main` `3d8cd631`. Scope is Phase 2 writer deepening followed by Phase 3 point preview pure runtime helper split. Live tests/builds are owned by the main Codex agent; child agents are static review only.
- 2026-06-14: `codex/data-quality-repair-2026-06-14` premerge gates passed, but direct merge would reintroduce older UI/render/docs tree changes. Integration kept only residual data contract fixes produced by current tools: HOI4 1936/1939 write-safe metadata, `data/manifest.json` output hashes, and Pages manifest size metadata. Post-fix data-quality gates passed.
- 2026-06-14: `codex/data-chain-phases-2-4` integrated by cherry-pick. The original scenario chunk red gate was fixed in current integration by updating `tools/scenario_chunk_assets.py` so political coarse chunk bounds stay feature-index aligned while detail chunks keep strict non-empty bbox validation. `npm run test:node:scenario-chunk-contracts` now passes.
- 2026-06-14: render-chain selective carry is complete for the non-duplicative pieces already present in current main. The standalone `transport_workbench_line_preview_helpers.js` duplicate helper was removed and tests were migrated to `transport_workbench_line_runtime_shared_behavior.test.mjs`.
- 2026-06-14: merged `origin/main` commit `9a5febfe` into the integration branch. The only conflicts were HOI4 1939 generated metadata hashes; resolution kept the integration branch's verified chunk artifacts and absorbed current-main safe-review tooling tests. Strict HOI4 1936/1939, structural unittest, scenario chunk node gate, and `git diff --check` passed.
- 2026-06-14: selectively integrated `codex/audit-20260612-appearance-transport` by taking the appearance/i18n source, mirrored dist files, and audit tests. `verify:pages-dist` regenerated `dist/pages-dist-manifest.json`; JSON validation, node tests, Pages dist verification, and `git diff --check` passed.
- 2026-06-14: started `codex/tooling-simplification-phase3` from `origin/main` `3d8cd631` as an isolated tooling lane. It touches only selector/registry/tests/docs and keeps browser smoke live execution out of scope.
- 2026-06-14: `codex/tooling-simplification-phase3` was committed as `e296e660`, pushed to branch and main, verified on main, and the local worktree plus local branch were removed. Remote branch remains as recovery record.
- 2026-06-14: `codex/data-chain-phase2-3-deepening-2026-06-14` completed Phase 2 and Phase 3 implementation, then rebased cleanly onto `origin/main` `3d247f17`. Post-rebase gates passed: Python compile, 138 targeted Python tests, 33 targeted node tests, `verify:test-import-graph`, `verify:pages-dist`, and `git diff --check`.
- 2026-06-14: started `codex/tooling-simplification-phase4a` from `origin/main` `3d247f17` as an isolated static validator lane. It will not start browser smoke, Playwright, or dev server processes.
- 2026-06-14: `codex/tooling-simplification-phase4a` passed static validation after reviewer fixes for unknown fields, live preflight, route URL shape, and required gesture type. It is ready for integration.
- 2026-06-14: rebased `codex/tooling-simplification-phase4a` onto `origin/main` `b06e2ece`; conflict was limited to the registry text and kept both transport-deepening and phase4A notes.

## Delivery Package - Integration Branch

1. Changed scope: data-quality residual metadata repair; Phase 2-4 helper consolidation; render-chain duplicate helper removal and selective carry; current-main safe-review merge; appearance/i18n audit selective carry.
2. Core files: `tools/scenario_chunk_assets.py`, `js/ui/transport_workbench_line_runtime_shared.js`, road/rail preview files, `js/core/map_renderer.js`, `js/core/state/appearance_preset_state.js`, `js/ui/i18n_catalog.js`, scenario metadata and Pages dist manifests.
3. Tests/docs: scenario chunk asset tests, preview/runtime node tests, appearance/ocean depth tests, active integration docs and registry.
4. Commit state: integration branch is committed through `77d18776`; main has fast-forwarded to the same commit locally.
5. Main divergence: local main is ahead of `origin/main` by the integration commits until the final push.
6. Conflict risk: direct file overlap resolved for data-chain/render-chain helpers; audit overlap limited to Pages delivery surface and validated by `verify:pages-dist`.
7. Verification run so far: data-quality gate, Phase 2-4 gate, render selective gate, current-main merge gate, audit selective gate.
8. Remaining risk: cleanup of older pre-existing recoverable worktrees is intentionally left as a separate housekeeping pass.
9. Recommended next step: start the next Phase 2/3/4 deepening task from updated `main`.

## Review Findings Closed

- Static review found duplicate top-level `UI_COPY_CATALOG` keys introduced by the appearance audit carry. Fixed by keeping one authoritative entry per key and adding `tests.test_i18n_audit.I18nAuditTest.test_inline_ui_catalog_keys_are_unique`.
- Static review found missing `data-i18n` attributes on physical intensity field controls. Fixed by wiring the physical Atlas/Contour controls, buttons, labels, clear action, and point count to the existing i18n keys.
- Post-fix validation passed: top-level catalog uniqueness probe, `python -m unittest tests.test_i18n_audit -q`, `npm run verify:pages-dist`, and `git diff --check`.

## Delivery Package - Phase 2/3 Deepening

1. Changed scope: Phase 2 moved country transport pack output assembly into `map_builder/transport_country_pack_writer.py`; Phase 3 split pure point preview runtime logic into `js/ui/transport_workbench_point_preview_runtime.js`; fixed industrial full-pack path probing.
2. Core files: `map_builder/transport_country_pack_writer.py`, `tools/build_transport_country_real_packs.py`, `js/ui/transport_workbench_point_preview_runtime.js`, `js/ui/transport_workbench_point_preview_shared.js`, `js/ui/transport_workbench_industrial_zone_preview.js`, and matching `dist/app` mirror files.
3. Tests/docs: `tests/test_global_transport_builder_contracts.py`, `tests/test_transport_workbench_manifest_runtime_contract.py`, `tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`, active plan, registry, and regenerated `dist/pages-dist-manifest.json`.
4. Commit state: branch committed through `506d0b0e` after clean rebase onto `origin/main` `3d247f17`.
5. Main divergence: branch is ahead of `origin/main` by 2 commits; main can fast-forward after review.
6. Conflict risk: direct file overlap with historical data-chain/render-chain reference work is resolved by main ancestry; active tooling WIP has no file overlap.
7. Verification run: `python -m py_compile map_builder\transport_country_pack_writer.py map_builder\transport_source_extract_cache.py tools\build_transport_country_real_packs.py`; `node --check` on changed JS modules; `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_country_source_contracts tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q`; `node --test tests\transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests\transport_workbench_right_deck_owner_behavior.test.mjs tests\transport_workbench_inspector_owner_behavior.test.mjs`; `npm run verify:test-import-graph`; `npm run verify:pages-dist`; `git diff --check`.
8. Remaining risk: final static review is pending; cleanup of older recoverable worktrees remains a separate housekeeping pass.
9. Recommended next step: fast-forward merge to `main`, push branch/main, then remove the temporary worktree after main verification.
