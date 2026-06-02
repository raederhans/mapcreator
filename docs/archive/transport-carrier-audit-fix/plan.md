# Transport Carrier Audit Fix

## Goal

Audit the transport carrier platformization after merge, fix confirmed data-source/scope and switching bugs, and keep source, data catalog, and Pages dist synchronized.

## Completed

- [x] Reviewed carrier data provenance, pack manifests, runtime registry, catalog, and switching code.
- [x] Fixed stale async carrier/pack writes with generation guards in carrier, line, point, and industrial-zone runtimes.
- [x] Fixed `industrial_zones` so it prepares the active pack carrier before polygon projection.
- [x] Centralized `extensions.carrier` scope/projection/basemap metadata in the carrier registry and builders.
- [x] Rebuilt carrier manifests and pack manifests with explicit scope metadata.
- [x] Filtered Russia carrier admin codes to `RU-*` while preserving `RU-KGD` Kaliningrad.
- [x] Rebuilt catalog and Pages dist.
- [x] Ran targeted unit, data, dist, syntax, diff, and E2E checks.

## Verification

- `python -B -m py_compile map_builder/transport_carrier_registry.py tools/build_transport_country_carriers.py tools/build_transport_country_real_packs.py`
- `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract`
- `python tools/build_transport_country_carriers.py`
- `python tools/build_data_catalog.py`
- `python tools/check_transport_workbench_manifests.py`
- `python tools/check_data_catalog.py`
- `npm run verify:pages-dist`
- `node --check` for modified source/dist JS and target E2E spec
- `node ... @playwright/test ... tests/e2e/transport_workbench_country_pack_loading.spec.js --workers=1 --retries=0`
- `git diff --check`
