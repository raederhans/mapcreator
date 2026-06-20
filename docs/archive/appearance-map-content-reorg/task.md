# Appearance Map Content Reorg Task

## Delivery Package

1. Changed

- Split Ocean, Day / Night, Texture, and Rivers into a new Map Content section below Appearance.
- Converted Map Content from a vertical stack into the same tab interaction pattern as Appearance.
- Adjusted Map Content panel spacing to match Appearance panel containment and prevent narrow-sidebar overflow.
- Added a Rivers Visibility child card so Rivers uses the same child-container style as the other map-content panels.
- Promoted Physical Regions, Urban Areas, and City Points into same-level Appearance tabs beside Borders, Transport, and Presets.
- Kept the old Context Layers container as a hidden staging source so existing stable control ids continue to work.
- Added Map Content i18n copy and synced checked-in Pages dist files.
- Added static contracts for the new IA, default Borders tab, and default Ocean map-content tab.

2. Files

- Core: `index.html`, `js/ui/toolbar/appearance_controls_controller.js`, `js/ui/toolbar.js`, `css/style.css`
- I18n: `js/ui/i18n.js`, `js/core/i18n_catalog.js`, `data/locales.json`
- Dist: `dist/app/index.html`, `dist/app/css/style.css`, `dist/app/js/ui/toolbar/appearance_controls_controller.js`, `dist/app/js/ui/toolbar.js`, `dist/app/js/ui/i18n.js`, `dist/app/js/core/i18n_catalog.js`, `dist/pages-dist-manifest.json`
- Tests: `tests/test_ui_rework_plan03_support_transport_contract.py`
- Docs: `docs/active/appearance-map-content-reorg/*`

3. Diff Summary

- Net diff for this stacked checkout is about 17 files plus task archives; this includes the prior dropdown styling task and this Appearance IA correction.
- Existing prior-task changes are still present in `tests/test_ui_rework_plan02_mainline_contract.py`, `docs/archive/dropdown-style-alignment/`, and `lessons learned.md`.

4. Commit State

- Not committed. The checkout already contains stacked edits from the prior dropdown task and one pre-existing `data/locales.json` dirty state.

5. Base

- Current branch: `main`
- Current base commit at completion: `27ace5614c6b35902de04d0f7652c17c61450a8e`

6. Overlap

- Shared hot files touched: `index.html`, `css/style.css`, `js/ui/toolbar.js`, `data/locales.json`, Pages dist.
- Potential overlap with other UI/sidebar worktrees should be checked before integration.

7. Verification

- `npm run python -- -m unittest tests.test_ui_rework_plan03_support_transport_contract -q` passed.
- `npm run python -- tools/build_pages_dist.py` passed.
- `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` passed, 37 tests.
- `node --check js/ui/toolbar/appearance_controls_controller.js; node --check js/ui/i18n.js` passed.
- `git diff --no-index` source/dist checks passed for CSS, `index.html`, `appearance_controls_controller.js`, and `i18n.js`.
- `node tests/appearance_texture_owner_behavior.test.mjs` passed, 12 tests.
- `node tests/appearance_rivers_owner_behavior.test.mjs` passed, 4 tests.
- `node tests/ocean_render_owner_behavior.test.mjs` passed, 6 tests.
- Browser DOM check passed on `http://127.0.0.1:8000/app/?scope=current-object&section=exportProjectSection&codexRefresh=20260620-map-content-tabs`.
- Browser click check passed for Physical Regions, Urban Areas, and City Points tabs.
- Browser click check passed for Ocean, Day / Night, Texture, and Rivers map-content tabs; each click leaves exactly one visible map-content panel.
- Browser computed-style check passed on `http://127.0.0.1:8000/app/?scope=current-object&section=exportProjectSection&codexRefresh=20260620-map-content-spacing-rivers-card-v2`: map-content panel padding is `18px 20px 20px`, all four panels report no horizontal overflow, and Rivers reports Visibility / River Stroke / Outline & Dash cards.
- Browser river-panel check passed on `http://127.0.0.1:8000/app/?scope=current-object&section=exportProjectSection&codexRefresh=20260620-rivers-panel-open-card`: Rivers is selected, visible, open, summary arrow hidden, and its three child cards have non-zero heights.
- `git diff --check` passed with line-ending warnings only.

8. Remaining Risks

- Browser verification was DOM-focused plus tab click-focused and did not do full visual screenshot review.
- Node tests still print the existing package `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Browser console still shows the existing local `/api/backend/auth/me` 401 and preload warnings.

9. Recommendation

- Ready for integration as part of the current stacked UI batch.
- Merge after reviewing overlap with any parallel sidebar or Appearance worktree.
