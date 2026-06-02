# Transport Carrier Audit Fix Context

## Findings

- Pack manifests routed to country carrier assets but did not carry durable `extensions.carrier` scope/projection/basemap metadata.
- Russia carrier provenance included `UA-*` admin codes from the Natural Earth `adm0_a3 == RUS` selection; Kaliningrad `RU-KGD` needed to stay included.
- Carrier and pack loads could finish after a fast country switch and write stale state into the active preview.
- `industrial_zones` used the shared carrier projection but did not prepare the active pack carrier before projecting Germany polygons.
- Point preview render captured overlay roots before carrier switching could rebuild the SVG, so DOM nodes could be written into detached roots.

## Fixes

- Added shared carrier metadata in `map_builder/transport_carrier_registry.py` and used it from both carrier and real-pack builders.
- Added Russia `RU-` code-prefix filtering in `tools/build_transport_country_carriers.py`.
- Added generation checks in `js/ui/transport_workbench_carrier.js`, `transport_workbench_line_runtime_shared.js`, `transport_workbench_point_preview_shared.js`, and `transport_workbench_industrial_zone_preview.js`.
- Made manifest-aware carrier loading fail closed when `carrier_asset_key` is missing.
- Moved point and industrial overlay-root binding until after active carrier preparation.
- Added contract tests for carrier metadata, Russia code scope, generation guards, industrial carrier prep, and E2E DOM visibility.

## Validation Notes

- External source review confirmed the current checked-in carrier source is Natural Earth 10m Admin 1; the audit kept that source and made the scope policy explicit in pack contracts.
- E2E smoke now covers `germany_road`, `germany_industrial_zones`, `usa_road`, `france_rail`, and `usa_airport`.
