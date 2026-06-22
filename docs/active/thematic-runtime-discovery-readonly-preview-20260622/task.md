# Thematic Runtime Discovery and Read-only Panel Preview Task

## Checklist

- [x] Create isolated worktree from current `origin/main`.
- [x] Record worktree in registry.
- [x] Create active task docs.
- [x] Map existing thematic data and layer panel contract surfaces.
- [x] Implement read-only thematic catalog loader.
- [x] Implement thematic layer panel contract adapter and diagnostics.
- [x] Implement read-only UI preview in the existing panel surface.
- [x] Extend focused tests.
- [x] Run targeted validation and Pages dist.
- [x] Run independent code-review and architecture review.
- [ ] Commit feature work.
- [ ] Merge to main, push, archive docs, and clean the worktree.

## Delivery Package Draft

- What changed:
  - Added a registry-driven thematic catalog preview loader for `data/thematic_layers/index.json` plus manifest summaries.
  - Added read-only thematic layer panel contracts and status diagnostics with render disabled and real-source pending reasons.
  - Added a Map Content `Thematic` tab that shows fixture-only, hidden-by-default, manifest, renderer, and payload metadata without toggles or state writes.
  - Added focused Node/Python contracts and regenerated Pages dist through the official builder.
- Changed files:
  - Core: `js/core/runtime_asset_registry.js`, `js/core/thematic_layer_catalog.js`.
  - UI: `index.html`, `css/style.css`, `js/ui/toolbar/appearance_controls_controller.js`, `js/ui/toolbar/layer_panel_contracts.js`, `js/ui/toolbar/layer_status_diagnostics.js`, `js/ui/toolbar/thematic_layer_preview_controller.js`.
  - Tests: `tests/thematic_layer_catalog_behavior.test.mjs`, `tests/layer_panel_contracts_behavior.test.mjs`, `tests/layer_status_diagnostics_behavior.test.mjs`, `tests/test_toolbar_split_boundary_contract.py`, `package.json`.
  - Generated: `dist/app/**` mirrors for changed source files and `dist/pages-dist-manifest.json`.
  - Docs: this active task folder and `docs/active/_worktree_registry.md`.
- Diff summary: source/UI/tests/docs plus generated Pages dist mirrors; no real-source thematic data changes after builders.
- Commit status: not committed yet; independent code-review and architecture review are complete.
- Base divergence: branch was refreshed to `origin/main@ad4b6b8659d2d56a2e8f01b9f4cbd2428462782f`; current feature diff is on top of that base.
- Potential conflicts: red/yellow with active WGI work because it also touches thematic data/build routes/package/generated publish artifacts; yellow with future work touching `index.html`, `css/style.css`, `appearance_controls_controller.js`, `layer_panel_contracts.js`, `layer_status_diagnostics.js`, or generated `dist/**`.
- Verification:
  - `node --check` on changed JS modules passed.
  - `py -3 tools/build_thematic_layers.py` passed.
  - `py -3 tools/build_data_catalog.py` passed.
  - `py -3 -m unittest tests.test_thematic_layer_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract -q` passed, 37 tests.
  - `py -3 tools/check_data_catalog.py` passed with existing empty `hashRef` coverage warnings.
  - `npm run test:node:thematic-layer-catalog` passed, 5 tests.
  - `npm run test:node:layer-panel-contracts` passed, 6 tests.
  - `npm run test:node:layer-status-diagnostics` passed, 6 tests.
  - `npm run verify:toolbar-split-boundary` passed, 53 tests.
  - `npm run verify:architecture-boundaries` passed.
  - `npm run verify:state-write-allowlist` passed.
  - `npm run verify:test-import-graph` passed.
  - `npm run verify:pages-dist` passed: 38 startup shell tests and 8 landing showcase tests.
  - `git diff --check` passed with the existing Windows line-ending warning for `package.json`.
- Remaining risk: no browser smoke was run because this phase is contract-visible and read-only; real-source ingestion and thematic map rendering remain future phases.
- Review follow-up: restored thematic Python contract route and selector golden case after code review finding; rebased to current `origin/main` so safety metadata stays intact; sanitized preview loader errors so raw `undefined/null/NaN` values do not render; staged all new files after code-review flagged the incomplete staged diff.
- Recommendation: commit this branch and fast-forward into main after re-checking `origin/main`.
