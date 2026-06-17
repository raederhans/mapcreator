# blank_base editable ownerless map context

## 2026-06-17
- Current `blank_base` topology has 0 political geometries, which makes the scenario look like a cleared/no-scenario map and prevents normal feature hover/editing.
- `modern_world/runtime_topology.topo.json` has 11294 political geometries and compact properties: `id`, `name`, `cntr_code`, `admin1_group`, `legacy_name`, `anchor_county_name`, `detail_tier`, `__source`.
- Planned blank allowlist is `id`, `name`, `detail_tier`, `__source`; country code and ownership-like fields are removed so blank startup has no implied owner.
- Main live process owner: main agent owns all tests and browser/server use for this task.
- Implemented blank runtime topology from `modern_world` with 11294 political geometries.
- `owners.by_feature.json` and `cores.by_feature.json` remain empty maps; `countries.json` keeps the catalog and palette while setting `feature_count` and `controller_feature_count` to 0.
- Runtime neutral fill uses `#d7d3c7` for ownerless blank features; assigning an owner still resolves through the existing owner color pipeline.
- Blank hover now suppresses country context so id prefixes such as `AFG-1741` do not display as ownership.
- `blank_base` now sets `style_defaults.empireBorders.opacity` to `0.4` and `style_defaults.coastlines.width` to `0.8`; runtime presentation restore captures these style groups and restores the pre-scenario values on exit.
- Verification: `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs` passed; `py -m unittest tests.test_scenario_contracts` passed; `py tools/check_scenario_contracts.py --scenario-dir data/scenarios/blank_base` passed; `npx playwright test tests/e2e/scenario_blank_exit.spec.js --workers=1 --retries=0` passed; `node --check` on changed JS files passed; `git diff --check` passed with CRLF warnings only.
- `py -m pytest tests/test_scenario_contracts.py` could not run because local Python environments do not have pytest installed.
- `npx playwright test tests/e2e/non_1962_runtime_matrix.spec.js --workers=1 --retries=0` still fails on existing startup asset 404 and browser 401 console noise across multiple scenarios.
