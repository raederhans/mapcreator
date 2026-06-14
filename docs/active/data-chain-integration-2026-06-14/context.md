# Data Chain Integration Context

## Start

- Date: 2026-06-14
- Integration worktree: `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14`
- Integration branch: `codex/data-chain-integration-2026-06-14`
- Base: `origin/main` at `fba1b71063bbdd44d42cb1145ec030cec4fff0e9`
- Main checkout: clean at start of integration pass.
- `codex/tooling-simplification-phase2`: dirty WIP exists and is outside this task.

## Known Inputs

- `codex/data-quality-repair-2026-06-14` is the first integration target and repairs scenario/data/catalog/i18n/transport data contracts.
- `codex/data-chain-phases-2-4` is the second target and contains transport builder helper extraction, road/rail line runtime sharing, and renderer private transaction helpers.
- `codex/render-chain-cleanup-phases` is a selective source. Its worker task client and startup worker migration are likely portable; its road/rail helper work overlaps the data-chain helper owner.
- `codex/audit-20260612-appearance-transport` is a later follow-up because it touches appearance/i18n Pages surfaces.

## Live Process Ownership

- Main agent owns every live command, test, build, and verification run in this integration worktree.
- Subagents may run static read-only analysis only.

## Progress

- Created integration worktree and branch from `origin/main`.
- Created `docs/active/_worktree_registry.md`.
- Created this integration plan/context/task set.
- Ran premerge data-quality gates in `codex/data-quality-repair-2026-06-14`: `check_data_catalog`, strict HOI4 1936, strict HOI4 1939, strict TNO 1962, targeted unittest, and `verify:pages-dist` all passed.
- Direct merge of `codex/data-quality-repair-2026-06-14` into integration was aborted because current main already contains later same-theme commits and a direct merge would reintroduce older UI/render/docs changes.
- Ran current integration data-quality gate before residual repair: catalog and TNO passed; HOI4 1936/1939 strict and targeted unittest failed due build snapshot and `data/manifest.json` output hash drift.
- Repaired residual data drift with `tools/check_scenario_contracts.py --strict --write-safe` for HOI4 1936/1939 and structured refresh of `data/manifest.json` output size/hash fields.
- Post-fix data-quality gate passed: catalog, strict HOI4 1936, strict HOI4 1939, strict TNO 1962, targeted unittest, and `verify:pages-dist`.
- Cherry-picked `codex/data-chain-phases-2-4` commit `d858d276` after the data-quality baseline commit.
- Resolved data-chain/render-chain overlap by keeping `transport_workbench_line_runtime_shared.js` as the road/rail shared helper owner and deleting the duplicate `transport_workbench_line_preview_helpers.js` source/dist files.
- Kept current-main render-chain pieces already present: `worker_task_client.js`, startup worker migration, and transport overview label helper behavior.
- Fixed the exposed HOI4 1939 coarse chunk data gate by making political coarse chunk `feature_bounds` preserve zero-area positional alignment while political detail chunks continue to require non-empty bounds.
- Phase 2-4 gate passed in `.runtime/reports/generated/data-chain-integration/post-data-chain-v3/`: py_compile, Python unittest group including `tests.test_scenario_chunk_assets`, Node preview/renderer group, `npm run test:node:scenario-chunk-contracts`, and `npm run verify:pages-dist`.
- Render selective gate passed in `.runtime/reports/generated/data-chain-integration/render-selective-gate-v4/`: worker task client, startup hydration, preview lifecycle, overview line contract, `verify:test-import-graph`, and `git diff --check`.
- Final Pages dist sync passed in `.runtime/reports/generated/data-chain-integration/final-pages-dist-sync/`.
- `codex/audit-20260612-appearance-transport` still has branch-only appearance/i18n changes; direct merge is not yet attempted because the older branch once deleted `dist/pages-dist-manifest.json` and needs selective cherry-pick review.
