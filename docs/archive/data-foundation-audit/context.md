# Data Foundation Audit Context

## 2026-05-19

- Created worktree at `C:\Users\raede\Desktop\dev\mapcreator-data-foundation-audit` on branch `codex/data-foundation-audit`.
- Loaded workflow skills: `ultragoal`, `research-before-fix`, `code-review`, `ultrawork`.
- Loaded repository guidance from `AGENTS.md`, `data/AGENTS.md`, `docs/shared/agent-tiers.md`, and `lessons learned.md`.
- Registered ultragoal story `G001-mapcreator`; Codex aggregate goal is active.
- Live process ownership: parent thread owns all tests/builds. Child agents only perform static analysis.

## Baseline Verification

- `python tools/data_health.py` failed with 16 missing catalog targets for absent geoBoundaries files.
- `python -m unittest tests.test_data_catalog_contract -q` failed because checked-in catalog entries differed from `build_catalog_payload()`.
- `python tools/check_source_ledger.py` failed because optional local source files were missing and `gb_chn_adm2` hash/provenance were stale.
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` failed because `build_snapshot.json` fingerprint/input shas were stale.

## Repairs

- Ran `python tools/build_data_catalog.py`, reducing catalog entries from 407 to 391 by removing absent source-ledger assets.
- Added duplicate catalog key detection to `tools/data_health.py`.
- Updated `tests/test_data_catalog_contract.py` for the 391-entry generated catalog and the new duplicate-key guard.
- Updated `tools/check_source_ledger.py` so explicit `local_presence: optional_cache` entries may be absent in a clean checkout while still reporting warnings.
- Updated `tools/source_governance_catalog.py` so only checked-in `gb_chn_adm2` remains frozen and required among the phase-2 geoBoundaries sources.
- Updated `data/source_ledger.json` and `data/china_adm2.provenance.json` to match the current China ADM2 file.
- Ran `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962`, then reran strict without write.

## Verification So Far

- `python tools/data_health.py` passed.
- `python -m unittest tests.test_data_catalog_contract -q` passed after the catalog/test updates.
- `python tools/check_transport_workbench_manifests.py` passed.
- `python tools/check_source_ledger.py` passed with expected `optional_cache` missing-source warnings.
- `python -m unittest tests.test_source_ledger_contract -q` passed.

## Final Review

- Code review found one process blocker: `tests/test_source_ledger_contract.py` and task docs were untracked.
- Architect review status: CLEAR.
- Resolution: include the new test and archived task docs in the commit whitelist.
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` passed after write-safe.
