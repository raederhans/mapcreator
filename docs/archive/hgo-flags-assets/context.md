# HGO Flags Assets Context

## 2026-06-03

- User confirmed authorization is available to continue beyond source-only flag indexing.
- Official GitHub docs constrain the storage plan: ordinary Git files over 50 MiB warn, files over 100 MiB are blocked, and GitHub Pages cannot use Git LFS objects directly.
- HGO source cache remains at `C:\Users\raede\Desktop\dev\mapcreator\historic geographic overhaul`.
- Source TGA scan: 11253 files, 81751481 bytes.
- Sample conversion with Pillow worked: `ABK.tga` is RGBA 82x52 and optimized PNG is 1156 bytes.
- Real PNG generation completed: 11253 files, 12908285 bytes total, largest PNG 10533 bytes.
- PNG output is sharded by tier and tag prefix under `data/hgo_catalogs/flags_png/`.
- Targeted tests passed: `python -m unittest tests.test_hgo_catalog_builders tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_source_ledger_contract -q`.
- Source ledger, data catalog, data health, and HGO PNG targeted checks passed. Data health kept existing report-only large-file warnings.
- Final review found three issues and they were fixed: case-insensitive `.tga/.TGA` scanning, checked-in PNG entity verification, and lowercase variant keys with `variant_source` preservation.
- Final verification after fixes passed: 30 targeted tests OK, HGO PNG targeted check OK, source ledger OK, data health OK, and `git diff --check` OK apart from Git CRLF notices.

## Ownership

- Main thread owns PNG generation and validation.
- Read-only subagent `Feynman` is checking existing repo asset governance patterns.
- Main thread completed PNG generation; no other agent owned or monitored that process.
