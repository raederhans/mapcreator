# Data Layer System Audit Context - 2026-05-07

## Starting State

- Working tree has substantial uncommitted changes around `tno_1962`, startup/chunk runtime, scenario resources, contract tools, and tests.
- Memory notes identify prior data architecture work around thin catalog, `data_service`, `data_health` rooting, Pages dist publish contract, and runtime asset registry.
- `data/AGENTS.md` defines governed data entrypoints: `data/CATALOG.json`, `data/runtime_asset_registry.json`, `data/transport_layers/*/manifest.json`, and `data/scenarios/index.json`.

## Audit Notes

- Static analysis lanes will avoid running live tests.
- Main thread may run small read-only commands and code-inspection probes.
- Re-deployed fresh static subagents after earlier child-agent progress became unavailable. Old `not_found` or context-overflow results are treated as unusable.
- Main-thread checks passed:
  - `python tools\data_health.py --json` reported zero errors, with 117 catalog URLs, 36 runtime assets, 11 transport manifests, and 76 transport paths.
  - `python -m unittest tests.test_data_catalog_contract -q` passed 7 tests.
  - `python tools\check_transport_workbench_manifests.py --report-path .runtime\reports\generated\data-layer-audit-transport-manifests.json` passed and discovered 75 transport manifests.
  - `python tools\check_scenario_contracts.py --strict --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\data-layer-audit-tno-strict.json` passed.
- Confirmed finding: catalog/data_health only govern top-level `data/transport_layers/*/manifest.json` while transport manifest checker recursively governs 75 manifests. Current catalog includes 11 transport manifest entries and omits 64 nested global road/rail shard manifests.
- Confirmed finding: `map_builder/transport_workbench_contracts.py` accepts empty top-level and per-variant `feature_counts` dictionaries, so a manifest can pass shared validation with no semantic feature-count coverage.
- Confirmed finding: `data/scenarios/tno_1962/manifest.json` summary reports `scenario_runtime_topology_object_count: 5`, while `runtime_meta.json` and `runtime_topology.topo.json` report 6 runtime topology objects including `scenario_atlantropa`.
- Confirmed finding: `context_land_mask_fallback_used` is `true` with `context_land_mask_arc_refs: 130930`, while strict scenario contract still passes.
- Confirmed finding: `scenario_resources.js` marks optional layer load failures as settled, so later visibility-driven loads skip retry unless forced.
- Confirmed architecture risk: runtime data loading is split across `data_service`, direct `d3Client.json`, direct `fetch`, and direct module imports, so diagnostics and catalog governance do not describe every runtime data path equally.
