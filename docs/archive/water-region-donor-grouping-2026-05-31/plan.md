# Water Region Donor Grouping Plan

## Goal

Reduce donor-state clutter in the Water Region inspector search/list while keeping water-region selection geographically meaningful.

## Plan

- [x] Read lessons and narrow relevant files/data.
- [x] Map Water Region inspector list/search/selection flow.
- [x] Inspect TNO water-region data fields for donor fragments, named-water ids, and possible grouping keys.
- [x] Decide the smallest product behavior: unified display backed by the original feature ids.
- [x] Implement deterministic UI grouping for fragment-suffixed water rows.
- [x] Add focused tests and sync `dist/app` if source changes.
- [x] Review, update context, and archive.

## Verification

- `python -m unittest tests.test_water_special_region_sidebar_boundary_contract -q`
- `node --check js/ui/sidebar/water_special_region_controller.js`
- `node --check dist/app/js/ui/sidebar/water_special_region_controller.js`
- Inline Node smoke: grouped two Gabes fragments into one row and applied color to both real ids.
- `npm run verify:pages-dist`
