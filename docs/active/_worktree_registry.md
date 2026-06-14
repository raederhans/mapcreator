# Worktree Registry

Last updated: 2026-06-14

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14`
- Integration branch: `codex/data-chain-integration-2026-06-14`
- Base: `origin/main` at `fba1b71063bbdd44d42cb1145ec030cec4fff0e9`
- Live test/build owner: main Codex agent only
- Subagents: static review only

## Recommended Order

1. `codex/data-quality-repair-2026-06-14`
2. `codex/data-chain-phases-2-4`
3. Selective carry from `codex/render-chain-cleanup-phases`
4. `codex/audit-20260612-appearance-transport`
5. Mark empty or superseded audit worktrees as integrated/abandoned candidates

## Worktrees

| Worktree | Branch / HEAD | Base | Status | Goal | Hot files | Tests / evidence | Overlap risk | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\Desktop\dev\mapcreator` | `main` / `fba1b710` | `fba1b710` | clean | Main checkout | main branch | status clean | Green | Receive final integration after branch is verified |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14` | `codex/data-chain-integration-2026-06-14` / `56ba34b6+WIP` | `fba1b710` | in-progress | Integration owner for data chain continuation | registry, data, renderer, transport, chunk generator | data-quality, Phase 2-4, render selective, Pages dist gates passed | Red owner branch | Commit verified data-chain/render-selective batch, then decide audit cherry-pick |
| `C:\Users\raede\Desktop\dev\mapcreator-data-quality-repair-2026-06-14` | `codex/data-quality-repair-2026-06-14` / `b856ceca` | `979b20de` | integrated-by-current-main-plus-residual-fix | Repair scenario/data/catalog/i18n/transport asset contracts | data manifests, scenario assets, `dist/pages-dist-manifest.json`, `js/core/data_loader.js`, `lessons learned.md` | premerge branch gates passed; direct merge was rejected because current main already contains same-theme later commits; residual HOI4/data manifest drift fixed in integration and post-fix gates passed | Resolved prerequisite | Keep worktree as recoverable reference until final main integration |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phases-2-4` | `codex/data-chain-phases-2-4` / `d858d276` | `b279558d` | integrated | Consolidate transport builder, line preview helpers, renderer transaction helpers | `js/core/map_renderer.js`, road/rail preview, `dist/pages-dist-manifest.json`, `lessons learned.md`, transport builder helpers | integrated by cherry-pick; Phase 2-4 gate passed after HOI4 1939 chunk repair | Resolved | Keep worktree as recoverable reference until final main integration |
| `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup` | `codex/render-chain-cleanup-phases` / `85621443` | `cf2a57a1` | integrated-by-current-main-plus-selective-carry | Narrow shared preview helpers, renderer reset helper, worker task client | `js/core/map_renderer.js`, road/rail preview, `js/core/startup_worker_client.js`, `js/core/worker_task_client.js`, `package.json`, tests | worker/startup/overview pieces already present from main; duplicate line helper removed; render selective gate passed | Resolved | Keep worktree as recoverable reference until final main integration |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260612-appearance-transport` | `codex/audit-20260612-appearance-transport` / `01811500` | `cf2a57a1` | selective-review-needed | Appearance preset/i18n audit fixes | `index.html`, `dist/app/index.html`, appearance preset state, i18n catalog | branch diff reviewed; no integration validation yet | Yellow with Pages delivery surface | Cherry-pick selectively after verified data-chain batch commit |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260610-20260610-113750` | `audit/20260610-appearance-transport-20260610-113750` / `cf2a57a1` | `cf2a57a1` | abandoned candidate | Old audit preservation worktree | none vs `origin/main` | no diff vs `origin/main...HEAD` | Green | Mark abandoned/integrated after final check |
| `C:\Users\raede\Desktop\dev\mapcreator-hoi4-strategic-values` | `codex/hoi4-strategic-values` / `979b20de` | `979b20de` | integrated candidate | HOI4 strategic values branch already in main ancestry | none vs `origin/main` | no diff vs `origin/main...HEAD` | Green | Mark integrated candidate |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` | `codex/tooling-simplification-phase2` / `fba1b710` | `fba1b710` | in-progress elsewhere | Tooling simplification work | dirty `tools/check_scenario_contracts.py`, `tests/test_scenario_contracts.py`, active docs | no committed diff yet | Yellow with data-quality on scenario contract tooling | Do not touch in this integration |

## Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| data-quality -> data-chain | Yellow | Both touch `dist/pages-dist-manifest.json` and `lessons learned.md`; data-quality repairs the scenario data gate data-chain exposed. |
| data-chain -> render-chain | Red | Both edit `js/core/map_renderer.js`, road/rail preview files, and scenario chunk refresh tests. |
| data-quality -> tooling-simplification | Yellow | Tooling worktree has uncommitted scenario contract edits; integration branch must not absorb them. |
| data-quality -> audit-20260612 | Yellow | Both touch Pages delivery surfaces through `index.html` / dist outputs. |
| render-chain -> audit-20260612 | Green | File overlap is minimal; semantic coupling through Pages dist only. |

## Current Execution Notes

- Main checkout is clean, but `codex/tooling-simplification-phase2` has unrelated dirty WIP. This integration does not touch that worktree.
- `codex/data-chain-integration-2026-06-14` is the only branch allowed to run live validation for this task.
- Registry must be updated after each successful merge, validation failure, conflict resolution, and final integration.
- 2026-06-14: `codex/data-quality-repair-2026-06-14` premerge gates passed, but direct merge would reintroduce older UI/render/docs tree changes. Integration kept only residual data contract fixes produced by current tools: HOI4 1936/1939 write-safe metadata, `data/manifest.json` output hashes, and Pages manifest size metadata. Post-fix data-quality gates passed.
- 2026-06-14: `codex/data-chain-phases-2-4` integrated by cherry-pick. The original scenario chunk red gate was fixed in current integration by updating `tools/scenario_chunk_assets.py` so political coarse chunk bounds stay feature-index aligned while detail chunks keep strict non-empty bbox validation. `npm run test:node:scenario-chunk-contracts` now passes.
- 2026-06-14: render-chain selective carry is complete for the non-duplicative pieces already present in current main. The standalone `transport_workbench_line_preview_helpers.js` duplicate helper was removed and tests were migrated to `transport_workbench_line_runtime_shared_behavior.test.mjs`.
