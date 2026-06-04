# Context

2026-06-03

- User requested reclassifying top-level countries shown under Other in the TNO country inspector.
- Current unclassified top-level set found in `data/scenarios/tno_1962/countries.json`: XIK, VOK, BOP, ORS, MAG, ORN, ONG, GAY.
- XIK should join China Region. VOK, BOP, ORS, MAG, ORN, ONG, and GAY should join Russia Region.
- `js/ui/sidebar.js` already hides Other unless entries remain assigned to the fallback continent/group; the data repair should remove the visible fallback group for these tags.
- Added explicit tag groups in `tools/patch_tno_1962_bundle.py` so future TNO rebuilds keep these custom tags out of the fallback group.
- Synchronized `countries.json`, manual overrides, scenario mutations, startup bundles, gzip sidecars, and Pages dist.
- Verification passed: `python -m unittest tests.test_tno_inspector_groups -q`, `node --test tests/country_inspector_controller_behavior.test.mjs`, `python -m py_compile tools\patch_tno_1962_bundle.py`, `npm run verify:pages-dist`, startup bundle hash/gzip check, and browser DOM smoke.
