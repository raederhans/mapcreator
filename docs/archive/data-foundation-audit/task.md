# Data Foundation Audit Task

## Current Step

Archive task docs, stage the whitelist, then commit and attempt integration.

## Verification Commands

Run serially:

1. `python tools/data_health.py`
2. `python -m unittest tests.test_data_catalog_contract -q`
3. `python tools/check_source_ledger.py`
4. `python tools/check_transport_workbench_manifests.py`
5. `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962`

## Latest Result

All targeted verification commands passed. `check_source_ledger.py` reports expected warnings only for `local_presence: optional_cache` missing local sources and exits 0.

## Deferred Follow-Up Candidates

- HashRef validation for catalog entries whose referenced source field can be resolved cheaply.
- Runtime data single-flight fetch dedupe across direct URL and catalog-key paths.
- Transport phase-status coverage report for global road/rail staged rollout.
- Scenario chunk budget reporting for high-cost TNO chunks.
