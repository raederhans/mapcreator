# WGI Real-source QA Fix Context

## 2026-06-22

- Current main and `origin/main` both started at `902c83fd5aff6bffb8ea1f29ceec36800e6a6882`.
- Main checkout had unrelated local docs/archive and `lessons learned.md` traces; the QA fix uses isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-wgi-real-source-qa-fix-20260622`.
- The old planned recovery worktree `C:\Users\raede\Desktop\dev\mapcreator-thematic-real-source-wgi-v1-20260622` was absent.
- OMX ultragoal state recorded the earlier WGI integration as complete, but the local WGI source cache still exposed a QA gap: standard errors and 90% confidence intervals were present in the workbook and not preserved in generated metrics.
- Local cache copied into this worktree only under `.runtime/source-cache/thematic/wgi/`; it is runtime input and remains untracked.
- Live process owner: main agent owns all build/test commands for this task. No subagent may start, poll, or retry the same live process.

## Implementation Notes

- `map_builder/thematic_wgi_ingest.py` now carries source metric uncertainty into `metrics.admin0.json`.
- Missing metrics omit empty uncertainty payloads; source rows with score gaps keep real uncertainty when the source row has it.
- Composite uncertainty stays explicitly `not_computed` because the composite is project-defined.
- `map_builder/thematic_layer_contracts.py` validates uncertainty numeric leaves for finite values and only allows text in `method` and `reason`.
- Tests use a fixture with number of sources, standard errors, and 90% confidence intervals.
- `number_of_sources` now uses non-negative integer parsing instead of year parsing.
- JS thematic catalog summaries now distinguish fixture-only layers from WGI real-source-derived metadata while keeping all thematic layers read-only and hidden by default.
- Pages dist now publishes the read-only thematic catalog/manifest payloads listed by `runtime_asset_registry`; startup shell tests verify every registry `data/` URL exists in dist.

## Verification Evidence

- `py -3 -m py_compile map_builder\thematic_layer_contracts.py map_builder\thematic_wgi_ingest.py tools\build_thematic_layers.py map_builder\contracts.py` passed.
- `py -3 -m unittest tests.test_thematic_wgi_source_ingest tests.test_thematic_layer_contracts -q` passed: 20 tests after source-count and uncertainty contract fixes.
- `py -3 tools\build_thematic_layers.py --include-wgi-real` passed: 4 layers, 17 outputs.
- `py -3 tools\build_data_catalog.py` passed: 658 entries.
- `py -3 -m unittest tests.test_thematic_layer_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_thematic_wgi_source_ingest -q` passed: 52 tests.
- `py -3 tools\check_data_catalog.py` passed: 658 entries validated; report-only existing empty hashRef warnings.
- `py -3 tools\data_health.py` passed; report-only existing large file warnings.
- `npm run test:node:thematic-layer-catalog` passed: 5 tests; existing Node module-type warning only.
- `npm run test:node:layer-panel-contracts` passed: 6 tests; existing Node module-type warning only.
- `npm run test:node:layer-status-diagnostics` passed: 6 tests; existing Node module-type warning only.
- `npm run verify:toolbar-split-boundary` passed: 53 tests.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed: 112 tracked files.
- `npm run verify:test-import-graph` passed: 49 specs.
- `npm run verify:pages-dist` passed after Pages thematic allowlist fix: dist build, 39 startup shell tests, 8 landing showcase tests; total size 1101.61 MiB under the 1102 MiB cap.
- `git diff --check` passed; Git reported line-ending conversion warnings only.
- `node` dist registry probe found `missing_count=0` for `dist/app/data/runtime_asset_registry.json` `data/` URLs.

## Source Snapshot

- WGI source cache: `.runtime/source-cache/thematic/wgi/WGI_2025_Revision_Governance_Estimates_and_Absolute_Scores_1996_2024.xlsx`.
- Source hash in manifest: `25a2f9eabb90b0092973392c0b31571aa58b691cc5786292e504b52f693e1eb8`.
- Source size in manifest: `10423344`.
- Reader-facing title: `WGI Governance Proxy`.
- Runtime status: catalog-only, `supports_main_map_render=false`, `default_visible=false`.
- Preserved uncertainty fields: number of sources, score standard error, score 90% CI, estimate, estimate standard error, estimate 90% CI.

## Review Fixes

- Closed code-review HIGH: thematic runtime registry URLs now resolve in Pages dist and have a startup-shell contract.
- Closed code-review MEDIUM: uncertainty string values only allowed for `method` and `reason`; string numeric fields are rejected.
- Closed code-review MEDIUM: `number_of_sources` decimal/negative values no longer truncate; they become null.
- Closed code-review MEDIUM: UI label now says `Real-source derived metadata`.
- Closed code-review LOW: `data/CATALOG.md` EOL-only churn removed from the diff.
