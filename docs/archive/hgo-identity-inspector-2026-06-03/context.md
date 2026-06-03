# HGO Identity Inspector Context

## 2026-06-03

- Started from `origin/main` at `6c0f4819` in worktree `C:\Users\raede\Desktop\dev\mapcreator-hgo-identity-inspector` on branch `codex/hgo-identity-inspector`.
- Main checkout is dirty and behind remote, so this work stays isolated until merge.
- Loaded `ultrawork`, `docs/shared/agent-tiers.md`, `lessons learned.md`, and `data/AGENTS.md`.
- Live tests/builds are owned by the main thread only.
- Read-only code-mapper found the country inspector touchpoints in `js/ui/sidebar/country_inspector_controller.js` and `js/ui/sidebar.js`.
- Read-only test mapper recommended adding a named node route when introducing a new node test.
- Direct file reads of large HGO JSON are too noisy; use key-targeted scripts for samples and stats.

## Current Target

Implement HGO identity as an inspector-only enhancement with exact/reviewed/suggested alias matching and scoped UI controls.

## Implementation Notes

- Added `data/hgo_catalogs/hgo_identity_aliases.json` with reviewed aliases `AEF -> FEA`, `AOF -> FWA`, and suggested alias `CEY -> LKA`.
- Registered `hgo_palette_pack` and `hgo_identity_aliases` in `data/runtime_asset_registry.json`, `data/manifest.json`, and regenerated `data/CATALOG.json` / `data/CATALOG.md`.
- Added `js/core/hgo_identity_resolver.js` for exact, reviewed alias, suggested alias, and missing identity output.
- Added inspector-only defaults at `runtimeState.hgoIdentity`.
- Wired sidebar loading for HGO place names, flags PNG manifest, alias map, and HGO palette.
- Extended the country inspector list, selected detail, controls, and search. The HGO name mode is display-only and scoped to inspector surfaces.
- Added retry UI for HGO asset load failures.
- Pages dist publishes HGO core JSON plus `small` and `medium` flag PNG tiers. The `full` tier stays out of Pages dist to keep the package below the 995 MiB limit.

## Verification

- `npm run test:node:hgo-identity-resolver` passed.
- `node --check js/core/hgo_identity_resolver.js`, `node --check js/ui/sidebar.js`, and `node --check js/ui/sidebar/country_inspector_controller.js` passed.
- `python -m py_compile tools/build_pages_dist.py` passed.
- `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q` passed.
- `python tools/check_source_ledger.py` passed with existing optional local-source warnings.
- `python tools/data_health.py` passed with 488 catalog URLs and 72 runtime assets; only existing report-only large-file warnings.
- `python -m unittest tests.test_hgo_catalog_builders -q` passed.
- `python -m unittest tests.test_import_country_palette -q` passed.
- `node tools/test_route_registry.mjs check` passed.
- `npm run verify:pages-dist` passed; rebuilt Pages dist at 993.91 MiB.
- Headless browser smoke against `dist/app` at 390px width found no horizontal overflow; HGO controls rendered with `127/192 flags matched`, flags showed for exact matches, missing tags stayed marked missing. The only 404 was the existing static-dist backend auth probe at `/api/backend/auth/me`.
