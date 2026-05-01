# land-data architecture repair context

## 2026-04-30 batch 1 execution
- Started from archived audit `docs/archive/land-data-architecture-audit/report.md` and copied it as the guiding audit report.
- Fixed `data/manifest.json` hash/size drift for changed runtime data assets; added `tests/test_data_manifest_contract.py` so checked-in output metadata must match actual files.
- Fixed `hoi4_1939` startup shell identity: manifest and startup bundle subset now point `startup_topology_url` to `startup.runtime_shell.topo.json`; builder source emits the same URL.
- Fixed Pages publish metadata: dist stripping now removes `audit_url` and any omitted local-only runtime topology URL; `modern_world/runtime_topology.topo.json` is kept local and excluded from Pages to keep the deploy artifact under the size gate.
- Repaired strict scenario contract for `blank_base` and `modern_world`: added checked-in runtime topology files, pruned 430 stale modern assignments (410 US zone ids, 20 RU ids) that no longer exist in the runtime topology, converted modern cores to arrays, and updated summary counts.
- Verification passed: `python -m unittest tests.test_data_manifest_contract tests.test_pages_dist_startup_shell tests.test_startup_bootstrap_assets tests.test_scenario_contracts -q`; `python tools/check_scenario_contracts.py --strict`; `python tools/build_pages_dist.py`; dist URL probe returned no audit/runtime missing URL hits.

## Final review
- Main-thread first-principles review kept the patch focused on source identity, publish metadata consistency, and strict contract repair. Native reviewer subagent did not return before timeout and was closed to avoid idle agents; final verification was rerun in the parent thread.
- Re-ran py_compile, targeted unittest, strict scenario contract, Pages build, and dist URL probe after lessons update.

## Review follow-up 2026-05-01
- Fixed review item: Pages publish transform now also strips unpublished URLs from copied `startup.bundle.*.json` `manifest_subset` and rewrites sibling `.json.gz` when present.
- Removed generated `dist/` output from the working tree after using it as a verification artifact.
- Restored `.omx/logs/session-history.jsonl` and `.omx/metrics.json` local runtime state out of the business diff.
- Verification: `python -m unittest tests.test_pages_dist_startup_shell tests.test_data_manifest_contract tests.test_startup_bootstrap_assets tests.test_scenario_contracts -q`; `python tools/check_scenario_contracts.py --strict`; `python tools/build_pages_dist.py`; startup bundle URL probe returned `[]`; `git diff --check -- tools/build_pages_dist.py tests/test_pages_dist_startup_shell.py`.
