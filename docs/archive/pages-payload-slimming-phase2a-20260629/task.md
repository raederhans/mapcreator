# Phase 2A Task Ledger

## Objective

Reduce the Pages `dist/` payload below the 1 GiB hard cap while keeping local source data intact and keeping online demo metadata truthful.

## Checklist

- [x] Register active worktree.
- [x] Inspect largest payload references before copy-policy changes.
- [x] Implement explicit Pages slimming policy.
- [x] Add or update tests for shipped metadata/catalog consistency.
- [x] Rebuild Pages dist.
- [x] Verify size gate and targeted behavior.
- [x] Run independent code-review lane.
- [x] Complete independent architect lane.
- [x] Commit and push.
- [x] Integrate to `main`.
- [x] Clean integrated worktree after closeout remote verification.

## Delivery Notes

- Commit status: functional commit `efa2a632` pushed to `origin/main`; closeout commit records archive and registry truth.
- Integration status: integrated into `origin/main`.
- Base commit: `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`.
- Current remote `origin/main` is `7fb3ade5`; the functional branch is already rebased onto it and is one commit ahead.

## What Changed

1. Pages excludes HGO runtime preview payload and the `hgo_1936` scenario payload while recording HGO as local preview policy.
2. Pages prunes runtime registry asset keys and catalog references that point at files absent from `dist/app`.
3. Pages excludes Japan industrial local preview GeoJSON and strips dist manifest preview paths that would reference them.
4. Pages writes a reduced `city_aliases.json` selected by semantic city priority and filtered through the source authority alias map.
5. The HGO preview UI hides or blocks local-only runtime preview in Pages builds and keeps local developer builds available.

## Files

- Core files: `tools/build_pages_dist.py`, `js/core/runtime_asset_registry.js`, `js/core/hgo_runtime_asset_loader.js`, `js/ui/scenario_controls.js`, `js/core/i18n_catalog.js`.
- Tests: `tests/test_pages_dist_startup_shell.py`, `tests/test_toolbar_split_boundary_contract.py`.
- Generated dist mirrors: `dist/app/js/core/runtime_asset_registry.js`, `dist/app/js/core/hgo_runtime_asset_loader.js`, `dist/app/js/ui/scenario_controls.js`, `dist/app/js/core/i18n_catalog.js`, `dist/pages-dist-manifest.json`.
- Docs: `docs/active/_worktree_registry.md`, `docs/archive/pages-payload-slimming-phase2a-20260629/{plan.md,context.md,task.md}`.
- Temporary files: none outside ignored runtime outputs.

## Diff Summary

- Functional commit diff: 17 files changed, 810 insertions and 161 deletions.
- Shared hotspots touched: Pages dist generator, generated Pages manifest, scenario/catalog publishing metadata, HGO preview UI, toolbar boundary tests.
- Source data under `data/**` remains intact.

## Conflict And Overlap

- Direct overlap risk is red with any concurrent work that changes `tools/build_pages_dist.py`, `dist/pages-dist-manifest.json`, scenario publish metadata, or Pages startup shell tests.
- Semantic overlap risk is yellow with landing/Pages deploy policy and HGO runtime preview behavior.
- Current renderer worktrees are green by file path, except the shared registry text.

## Verification

- `npm run verify:pages-dist`: passed; total `972529969` bytes / `927.48 MiB`.
- `npm run verify:toolbar-split-boundary`: passed, 53 tests.
- `node --test tests/hgo_raster_renderer.node.test.mjs tests/hgo_runtime_preview.node.test.mjs tests/hgo_runtime_preview_toolbar.node.test.mjs`: passed, 41 tests; existing Node module-type warnings printed.
- `py -3 -m unittest tests.test_scenario_contracts -q`: passed, 41 tests; expected risky fixture diagnostic printed with exit code 0.
- `py -3 -m unittest tests.test_data_catalog_contract -q`: passed, 18 tests.
- `py -3 -m unittest tests.test_transport_manifest_contracts -q`: passed, 18 tests.
- `py -3 -m py_compile tools\build_pages_dist.py tests\test_pages_dist_startup_shell.py tests\test_toolbar_split_boundary_contract.py`: passed.
- `node --check js/core/runtime_asset_registry.js`, `node --check js/core/hgo_runtime_asset_loader.js`, `node --check js/ui/scenario_controls.js`: passed.
- `git diff --check`: passed with CRLF normalization warnings only.

## Remaining Risks

- TNO water and HOI4 political detail chunks remain the largest public payloads; future slimming should target those with scenario-runtime-specific tests.
- No broad browser smoke was run. This change is covered by builder, manifest, registry, Node preview, and Python contract tests; the project rules discourage broad Playwright use for this path.

## Recommended Next Step

After this closeout push, remove the temporary worktree. Recovery remains functional commit `efa2a632` on `origin/main` and branch `codex/phase2a-pages-payload-slimming`.
