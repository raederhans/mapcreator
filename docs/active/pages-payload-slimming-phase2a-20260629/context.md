# Phase 2A Context

## 2026-06-29 Intake

- User requested `$ralph` plus `$code-review` for Phase 2A Pages payload slimming.
- Task is complex because it touches Pages copy policy, generated dist, scenario metadata, tests, and release gating.
- Parent checkout has unrelated WIP; work is isolated on `codex/phase2a-pages-payload-slimming`.
- Base is `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`.
- Live build/test ownership stays with the main agent.

## Initial Known Size Problem

- Current `dist/pages-dist-manifest.json` total: `1155317661`.
- Hard cap: `1073741824`.
- Over cap: `81575837`.
- First candidates: HGO runtime preview payload, Japan industrial zones preview GeoJSON, full city aliases, and TNO water detail chunk.

## 2026-06-29 Implementation Evidence

- Pages publish policy now keeps HGO 1936 as developer/local preview metadata while omitting its runtime preview payload from Pages.
- `tools/build_pages_dist.py` removes local-only HGO runtime, HGO scenario runtime, Japan industrial preview GeoJSON, full city aliases, unpublished registry assets, unpublished catalog entries, and unpublished `dist/app/data/manifest.json` outputs.
- `dist/app/data/manifest.json` now rewrites the `city_aliases.json` size/hash/counts to the reduced Pages file and records removed unpublished outputs.
- `js/ui/scenario_controls.js` hides HGO Preview unless runtime assets are present or the preview is already active, with localized unavailable copy.
- Direct verification after the architect BLOCK fix: `missing_outputs=[]`, `missing_embedded_assets=[]`, `size_gate.status=within_limit`, `total_bytes=972529969`, and `city_hash_matches=true`.

## 2026-06-29 Review Evidence

- Code-review lane returned CLEAR before the manifest-prune follow-up and requested a final `verify:pages-dist` run.
- Architect lane initially blocked on stale HGO outputs in `dist/app/data/manifest.json`.
- The BLOCK was fixed by `prune_dist_data_manifest_to_published_files()` plus new tests for manifest outputs and embedded registry assets.

## 2026-06-29 Verification

- `npm run -s verify:pages-dist`: PASS, builder plus 42 Python Pages tests plus 9 landing Node tests.
- `py -3 tools/i18n_audit.py`: PASS, `ui_missing=0`.
- `py -3 -m unittest tests.test_toolbar_split_boundary_contract -q`: PASS, 53 tests.
- `npm run -s verify:architecture-boundaries`: PASS.
- `npm run -s verify:test-import-graph`: PASS, 49 specs.
- `py -3 -m py_compile tools/build_pages_dist.py tests/test_pages_dist_startup_shell.py tests/test_toolbar_split_boundary_contract.py`: PASS.
- `node --check` passed for touched source and dist JS files.
- `git diff --check`: PASS.
