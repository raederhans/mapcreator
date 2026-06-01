# transport-data-rollout task

- [x] Create isolated worktree and load required skills.
- [x] Review current transport data state and methodology docs.
- [x] Verify and rebuild existing real-source country packs.
- [x] Expand source contracts and download newly required public source files.
- [x] Step 1 road: rebuild Germany, United Kingdom, and United States road packs.
- [x] Step 2 airport: build Germany, France, United Kingdom and rebuild USA, China, Russia, India airport packs.
- [x] Step 3 rail: build Germany rail and rebuild France rail.
- [x] Step 4 port: build United States, Germany, France, United Kingdom, China, India, Russia port packs.
- [x] Step 5 facility: build Germany energy, mineral, industrial, and logistics packs.
- [x] Step 6 register packs, rebuild catalog/dist, verify app load/render/interaction.
- [x] Final review closeout and lessons learned update.

## Final Verification Snapshot

- Source contracts: `python tools/check_transport_country_sources.py --report-path .runtime/reports/generated/transport-country-source-check.final.json`
- Manifest contracts: `python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.final.json`
- Catalog: `python tools/check_data_catalog.py`
- Python contracts: `python -m unittest tests.test_transport_country_source_contracts tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q`
- Node render/state: `node tests/transport_overview_line_strategy_scope_contract.node.test.mjs`; `node tests/transport_workbench_state_owner_behavior.test.mjs`
- Browser smoke: `node ...@playwright/test/cli.js test tests/e2e/transport_workbench_country_pack_loading.spec.js --workers=1 --retries=0 --timeout=300000`
- Dist: `npm run verify:pages-dist`
