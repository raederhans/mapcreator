# Transport Carrier Platformization Plan

## Goal

Make Transport Workbench preview carrier maps follow the selected country pack. Phase 1 covers preview only; main-map apply stays on the existing pack overlay path.

## Tasks

- [x] Generate country carrier assets for USA, Germany, UK, France, China, India, and Russia.
- [x] Add `carrier_asset_key` to active transport pack manifests and register carrier assets in runtime/catalog data.
- [x] Update carrier runtime and road/rail/point preview projection to use the active pack carrier.
- [x] Add static and targeted runtime tests for carrier binding and country-scope projection.
- [x] Rebuild catalog/dist outputs and run targeted verification.

## Scope Rules

- UK and France carrier scopes use the European/mainland body and exclude overseas territories.
- Russia carrier scope includes Kaliningrad with the main Russian frame.
- USA carrier scope includes CONUS, Alaska, and Hawaii as separate frames; territories stay out of this phase.
- Carrier assets use preview-grade administrative geography; transport line/point packs keep their preview/full split.

## Live Process Ownership

Main thread owned builders, tests, dist rebuild, and browser/dev-server verification.

## Verification

- `python tools/check_transport_workbench_manifests.py` -> OK.
- `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract` -> 37 tests OK.
- `npm run verify:pages-dist` -> build output 976.45 MiB, 13 tests OK.
- `node ... @playwright/test ... tests/e2e/transport_workbench_country_pack_loading.spec.js --workers=1 --retries=0` -> 1 smoke OK.
- `git diff --check` -> OK.
