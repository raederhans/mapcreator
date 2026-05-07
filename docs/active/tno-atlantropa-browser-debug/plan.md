# TNO Atlantropa Browser Debug Plan

## Goal

Confirm and fix the remaining TNO 1962 Mediterranean Atlantropa color and interaction bugs in a real browser.

## Steps

- [x] Load debugging skills and read relevant lessons.
- [x] Start static color-path and hit-path subagents.
- [x] Reproduce the issue in browser with runtime evidence.
- [x] Identify the root cause in the scenario_atlantropa GeoJSON/TopoJSON D3 orientation path.
- [x] Add the smallest regression check that captures world-bounds ATL chunk geometry.
- [x] Patch the generation path and checked-in TNO 1962 assets.
- [x] Verify with browser screenshots/runtime probes and targeted tests.

## Result

- Browser probe confirms `scenario_atlantropa` loads 927 features.
- Browser probe confirms land-like ATL features enter land interaction state: 840 spatial items, 840 land index entries, 840 color cache entries.
- Browser probe confirms ATLSEA enters water interaction state: 87 water spatial items.
- Browser click probe covers all six ATL prefixes with 12 exact target hits and `mismatchedClickCount=0`.
- Targeted dense probe confirms the previously marginal `ATLSHL_west_med_14` sample is selectable.
