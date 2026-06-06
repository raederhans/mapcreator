# Context

2026-06-06

- User reported the Japan landing preview is visually wrong: the Japan base is missing and the preview uses simplified drawn shapes.
- Inspection confirmed `tools/build_landing_hero_cartography.py` hardcodes land, terrain, and night shapes for Japan while only road/rail/city points use checked-in data.
- User selected the existing Japan main corridor scope and readable data sampling.
- Main agent owns live build/test processes. Data and test subagents are read-only.

## Current implementation target

- New generator: `tools/build_landing_japan_preview.py`.
- Source paths:
  - `data/transport_layers/japan_corridor/carrier.json`
  - `data/transport_layers/japan_road/roads.preview.topo.json`
  - `data/transport_layers/japan_rail/railways.preview.topo.json`
  - `data/transport_layers/japan_rail/rail_stations_major.preview.geojson`
  - `data/world_cities.geojson`
  - `data/global_contours.major.topo.json`
  - `data/global_contours.minor.topo.json`
  - `data/global_rivers.geojson`
  - `data/global_bathymetry.topo.json`
  - `js/core/city_lights_modern_asset.js`
  - `data/city_lights/historical_1930_entries.json`

## Execution notes

- Data review confirmed the carrier, road, rail, station, city, contour, river, bathymetry, and night-light sources are readable from checked-in assets.
- The Japan preview generator now writes four SVGs plus `landing/assets/japan-preview.json`.
- The preview uses the carrier `frames.main.fitGeometry`, the carrier `geoConicConformal` projection, and readable sampled layers: 260 road lines, 160 rail lines, 32 city anchors, 20 major station anchors, 32 major contours, 120 minor contours, 9 rivers, and 88 night-light points.
- The checked-in bathymetry topology has no lines intersecting the Japan main corridor bbox, so metadata records that fact and visible copy focuses on contours and rivers.
- Review pass found ambiguous city titles and unclear candidate count semantics; the generator now exposes source features, eligible paths or points, rendered counts, and disambiguated selected city titles.
- `tools/build_pages_dist.py` runs the Japan preview builder before `reset_dist()`, so Pages dist is regenerated from source data.
- `npm run verify:pages-dist` passed after rebuilding dist.
