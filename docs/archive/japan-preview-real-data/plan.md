# Japan preview real data rebuild

## Goal

Rebuild the landing page Japan preview from checked-in data instead of hand-drawn SVG shapes.

## Acceptance

- `landing/assets/japan-preview-transport.svg`, `japan-preview-cities.svg`, `japan-preview-terrain.svg`, and `japan-preview-night.svg` are generated from real carrier, transport, city, physical, and night-light sources.
- `landing/assets/japan-preview.json` records scope, projection, sources, selection policy, and actual render counts.
- Landing copy describes a sampled real-data preview and uses counts that match the generated metadata.
- `tools/build_pages_dist.py` regenerates the Japan preview before copying Pages dist.
- `npm run verify:pages-dist` passes.

## Live Process Owner

Main agent owns all build and test live processes for this task. Subagents may do read-only static review only.

## Work Items

- [x] Create `tools/build_landing_japan_preview.py`.
- [x] Migrate Japan generation out of `tools/build_landing_hero_cartography.py`.
- [x] Update landing copy and i18n.
- [x] Add Pages dist and SVG metadata tests.
- [x] Generate landing assets and Pages dist.
- [x] Run targeted generator contract tests.
- [x] Run review and bug self-check.
- [ ] Archive this active task folder after completion.

## Verification

- `python tools/build_landing_japan_preview.py`
- `python -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_copy_stays_user_facing tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_japan_preview_metadata_uses_checked_in_sources tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_landing_japan_preview_assets_match_builder_output -q`
- `python -m py_compile tools/build_landing_japan_preview.py tools/build_landing_hero_cartography.py tools/build_pages_dist.py`
- `git diff --check`
- `npm run verify:pages-dist`
