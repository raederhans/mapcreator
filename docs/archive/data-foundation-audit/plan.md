# Data Foundation Audit Plan

## Scope

Audit and improve the repository data foundation without broad rewrites:

- checked-in data catalog and generation chain
- source ledger and provenance sidecars
- runtime asset registry and data service loading contracts
- transport manifest and variant data contracts
- scenario registry, scenario bundles, and chunk manifests
- publish and verification gates that keep runtime data available

Main-thread live-process owner: parent Codex thread. Child agents are static-analysis only.

## Acceptance Criteria

- `python tools/data_health.py` reports no errors.
- `python -m unittest tests.test_data_catalog_contract -q` passes.
- `python tools/check_source_ledger.py` exits 0, with explicit `local_presence: optional_cache` missing sources reported as warnings.
- `python tools/check_transport_workbench_manifests.py` passes.
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` passes.
- Final review gate is run before goal completion.

## Task List

- [x] Create isolated worktree `codex/data-foundation-audit`.
- [x] Read project rules, data rules, lessons learned, and relevant memory.
- [x] Run baseline data health and catalog contract checks.
- [x] Fix confirmed catalog drift from stale missing source entries.
- [x] Add focused governance coverage for catalog key uniqueness.
- [x] Reconcile source ledger lifecycle status, local presence policy, and checked-in China ADM2 hash/provenance.
- [x] Refresh TNO 1962 safe scenario snapshot metadata.
- [x] Run final targeted verification serially.
- [x] Run final review and record outcome.
- [ ] Commit, merge back to main when safe, and push.

## Findings And Decisions

- `data/CATALOG.json` contained 16 stale source entries whose files are absent. The existing builder already drops absent JSON-like source ledger assets, so regenerating catalog is the correct repair.
- `tools/data_health.py` detected duplicate URLs but did not detect duplicate catalog keys. A duplicate key can silently overwrite in key-indexed maps, so the health gate now reports it.
- `data/source_ledger.json` mixed lifecycle status with local source presence. `status` now tracks lifecycle, while `local_presence` determines whether a missing local file is a hard failure or an optional cache warning.
- `gb_chn_adm2` had a stale ledger/provenance hash. The ledger and sidecar now match the checked-in `data/china_adm2.geojson`.
- TNO 1962 strict contracts found stale snapshot metadata. Existing `--write-safe` refreshed only safe derived metadata and strict now passes.
- Final architect review is CLEAR. Final code review requested staging the untracked source-ledger test and task docs; no code logic blocker remains.
