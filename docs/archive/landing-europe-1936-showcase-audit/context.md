# Landing Europe 1936 Showcase Audit Context

## 2026-06-06
- User requested an audit of the Europe 1936 showcase, especially data and perspective correctness, plus necessary decoupling.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-audit-europe-1936-showcase`.
- Branch: `codex/audit-europe-1936-showcase` from `main` at `45a3adb8`.
- Main checkout has unrelated `.omx/metrics.json` dirty file.
- Main agent owns all builds/tests/dist/browser checks.

## Review Focus
- Scenario source chain: `data/scenarios/hoi4_1936/manifest.json` and paths it declares.
- Transport source chain: `data/transport_layers/global_rail/catalog.json` and Europe preview manifests.
- Generated assets: `landing/assets/europe-1936-showcase.svg/json` and dist copies.
- Presentation boundary: `landing/index.html`, `landing/app.js`, `landing/styles.css`.

## Findings And Fixes
- The original showcase generator used a manually curated country tag list. This omitted several European tags from the 1936 view. The generator now selects `continent_europe` countries from `countries.json` and adds the explicit transregional viewport tag `TUR`.
- Pages dist previously copied whatever Europe showcase asset happened to be checked in. `tools/build_pages_dist.py` now regenerates the showcase before copying landing assets.
- Metadata now records the viewport policy, territory tags, capital tags, focus tags, sources, counts, and layer ids. Landing JS reads the layer ids from `europe-1936-showcase.json` and exposes an error state for unknown layers.
- Showcase tabs now have an explicit tab/panel ARIA contract, and tab button height rules are locked with selector-level CSS assertions.

## Verification
- `node --check landing/app.js`
- `python -m py_compile tools/build_landing_europe_1936_showcase.py tools/build_pages_dist.py`
- `python -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_europe_1936_showcase_metadata_uses_checked_in_sources tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_europe_1936_showcase_assets_match_builder_output tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_pages_dist_generated_text_writes_use_lf tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_source_keeps_landing_contract -q`
- `npm run verify:pages-dist`
