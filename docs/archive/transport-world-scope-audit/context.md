# Transport world scope audit context

- Started 2026-04-30.
- Existing working tree contains unrelated edits in scenario_manager/main/sidebar/transport controller, ops/browser-mcp/editor-performance-benchmark.py, and lessons learned; preserved them.
- omx explore failed on Windows POSIX harness; used direct repo commands.
- Memory says point preview shared owns manifest -> pack -> snapshot -> overlay and transport changes should inspect builder/manifest/source_recipe.
- Root cause: `js/core/data_loader.js` `CONTEXT_LAYER_PACKS` still pointed `airports` and `ports` at `data/transport_layers/japan_*/*.geojson`, while road/rail already used global catalogs.
- Deploy surface: `tools/build_pages_dist.py` allowlisted the same Japan airport/port full packs, so Pages would keep publishing the Japan-scoped runtime files.
- Workbench preview audit: `transport_workbench_airport_preview.js` and `transport_workbench_port_preview.js` remain Japan family preview wrappers. The user-visible road/rail world-scope symptom matches the main transport overview loader, so this fix targets runtime transport toggles and Pages deploy assets.
- Fix: added `tools/build_global_transport_points.py`, generated `data/transport_layers/global_airport/*` and `data/transport_layers/global_port/*`, switched `data_loader.js` and Pages allowlist to those packs, and added npm build scripts.
- Verification passed: py_compile, node --check, manifest checker, targeted airport/port unittest, global transport/manifest unittest suite, and pages dist build/test.
