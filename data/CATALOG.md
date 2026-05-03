# Data Catalog

- generated_at: 2026-05-02T20:22:13.492583+00:00
- version: 1
- entries: 117

## Counts by role

| role | count |
| --- | ---: |
| bathymetry_topology | 1 |
| build_manifest | 1 |
| city_aliases | 1 |
| city_lights_entries | 1 |
| city_lights_source | 1 |
| city_overrides | 1 |
| context_layer | 3 |
| country_feature_policies | 1 |
| detail_topology_na_v1 | 1 |
| detail_topology_na_v2 | 1 |
| feature_migration_table | 1 |
| geo_aliases | 1 |
| hierarchy | 1 |
| historical_1930_city_lights_asset | 1 |
| locales | 1 |
| modern_city_lights_asset | 1 |
| palette_audit | 4 |
| palette_map | 4 |
| palette_pack | 4 |
| palette_registry | 1 |
| physical_semantics_topology | 1 |
| primary_topology | 1 |
| releasable_catalog | 1 |
| runtime_asset_registry | 1 |
| runtime_political_topology | 1 |
| scenario_registry | 1 |
| source_ledger_asset | 19 |
| special_zones | 1 |
| terrain_contours_major_topology | 1 |
| terrain_contours_minor_topology | 1 |
| transport_build_audit | 10 |
| transport_carrier_payload | 1 |
| transport_catalog | 2 |
| transport_manifest | 11 |
| transport_pack | 30 |
| transport_provenance_payload | 1 |
| transport_subtype_catalog | 1 |
| unit_counter_manifest | 1 |
| world_cities | 1 |

## Entries

| key | url | role | format | readMode | owner | sourceId |
| --- | --- | --- | --- | --- | --- | --- |
| source:gb_chn_adm2 | data/china_adm2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_chn_adm2 |
| city_aliases | data/city_aliases.json | city_aliases | json | json | init_map_data.world_cities |  |
| city_lights:historical_1930:entries | data/city_lights/historical_1930_entries.json | city_lights_entries | json | json | runtime_asset_registry.assets.city_lights:historical_1930:entries |  |
| country_feature_policies | data/country_feature_policies.json | country_feature_policies | json | json | data/country_feature_policies.json |  |
| context_layer:physical | data/europe_physical.geojson | context_layer | geojson | json | runtime_asset_registry.assets.context_layer:physical |  |
| manifest_output:europe_topology.json | data/europe_topology.json | primary_topology | topojson | json | init_map_data.primary_topology_bundle |  |
| manifest_output:europe_topology.na_v1.json | data/europe_topology.na_v1.json | detail_topology_na_v1 | topojson | json | init_map_data.detail_topology |  |
| manifest_output:europe_topology.na_v2.json | data/europe_topology.na_v2.json | detail_topology_na_v2 | topojson | json | init_map_data.detail_topology |  |
| runtime_political_topology | data/europe_topology.runtime_political_v1.json | runtime_political_topology | topojson | json | init_map_data.runtime_political_topology |  |
| context_layer:urban | data/europe_urban.geojson | context_layer | geojson | json | runtime_asset_registry.assets.context_layer:urban |  |
| feature_migrations:by_hybrid_v1 | data/feature-migrations/by_hybrid_v1.json | feature_migration_table | json | json | runtime_asset_registry.assets.feature_migrations:by_hybrid_v1 |  |
| source:fr_arr | data/france_arrondissements.geojson | source_ledger_asset | geojson | json | source_ledger | fr_arr |
| source:gb_bfa_adm1 | data/geoBoundaries-BFA-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_bfa_adm1 |
| source:gb_bih_adm1 | data/geoBoundaries-BIH-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_bih_adm1 |
| source:gb_blr_adm2 | data/geoBoundaries-BLR-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_blr_adm2 |
| source:gb_civ_adm1 | data/geoBoundaries-CIV-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_civ_adm1 |
| source:gb_cze_adm2 | data/geoBoundaries-CZE-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_cze_adm2 |
| source:gb_dnk_adm2 | data/geoBoundaries-DNK-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_dnk_adm2 |
| source:gb_gin_adm1 | data/geoBoundaries-GIN-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_gin_adm1 |
| source:gb_idn_adm1 | data/geoBoundaries-IDN-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_idn_adm1 |
| source:gb_ind_adm2 | data/geoBoundaries-IND-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_ind_adm2 |
| source:gb_mex_adm2 | data/geoBoundaries-MEX-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_mex_adm2 |
| source:gb_mwi_adm1 | data/geoBoundaries-MWI-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_mwi_adm1 |
| source:gb_rus_adm2 | data/geoBoundaries-RUS-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_rus_adm2 |
| source:gb_som_adm1 | data/geoBoundaries-SOM-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_som_adm1 |
| source:gb_svk_adm2 | data/geoBoundaries-SVK-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_svk_adm2 |
| source:gb_uga_adm1 | data/geoBoundaries-UGA-ADM1.geojson | source_ledger_asset | geojson | json | source_ledger | gb_uga_adm1 |
| source:gb_ukr_adm2 | data/geoBoundaries-UKR-ADM2.geojson | source_ledger_asset | geojson | json | source_ledger | gb_ukr_adm2 |
| manifest_output:geo_aliases.json | data/geo_aliases.json | geo_aliases | json | json | init_map_data.hierarchy_locales |  |
| bathymetry:global_topology | data/global_bathymetry.topo.json | bathymetry_topology | topojson | json | runtime_asset_registry.assets.bathymetry:global_topology |  |
| manifest_output:global_contours.major.topo.json | data/global_contours.major.topo.json | terrain_contours_major_topology | topojson | json | init_map_data.primary_topology_bundle |  |
| manifest_output:global_contours.minor.topo.json | data/global_contours.minor.topo.json | terrain_contours_minor_topology | topojson | json | init_map_data.primary_topology_bundle |  |
| manifest_output:global_physical_semantics.topo.json | data/global_physical_semantics.topo.json | physical_semantics_topology | topojson | json | init_map_data.primary_topology_bundle |  |
| context_layer:rivers | data/global_rivers.geojson | context_layer | geojson | json | runtime_asset_registry.assets.context_layer:rivers |  |
| manifest_output:hierarchy.json | data/hierarchy.json | hierarchy | json | json | init_map_data.hierarchy_locales |  |
| city_lights:historical_1930:exclusions | data/historical_city_lights_1930_exclusions.json | city_lights_source | json | json | runtime_asset_registry.assets.city_lights:historical_1930:exclusions |  |
| manifest_output:locales.json | data/locales.json | locales | json | json | init_map_data.hierarchy_locales |  |
| build_manifest | data/manifest.json | build_manifest | json | json | runtime_asset_registry.assets.build_manifest |  |
| manifest_output:palette-maps/hoi4_vanilla.audit.json | data/palette-maps/hoi4_vanilla.audit.json | palette_audit | json | json | init_map_data.palette_assets |  |
| manifest_output:palette-maps/hoi4_vanilla.map.json | data/palette-maps/hoi4_vanilla.map.json | palette_map | json | json | tools.import_country_palette |  |
| manifest_output:palette-maps/kaiserreich.audit.json | data/palette-maps/kaiserreich.audit.json | palette_audit | json | json | init_map_data.palette_assets |  |
| manifest_output:palette-maps/kaiserreich.map.json | data/palette-maps/kaiserreich.map.json | palette_map | json | json | tools.import_country_palette |  |
| manifest_output:palette-maps/red_flood.audit.json | data/palette-maps/red_flood.audit.json | palette_audit | json | json | init_map_data.palette_assets |  |
| manifest_output:palette-maps/red_flood.map.json | data/palette-maps/red_flood.map.json | palette_map | json | json | tools.import_country_palette |  |
| manifest_output:palette-maps/tno.audit.json | data/palette-maps/tno.audit.json | palette_audit | json | json | init_map_data.palette_assets |  |
| manifest_output:palette-maps/tno.map.json | data/palette-maps/tno.map.json | palette_map | json | json | tools.import_country_palette |  |
| manifest_output:palettes/hoi4_vanilla.palette.json | data/palettes/hoi4_vanilla.palette.json | palette_pack | json | json | init_map_data.palette_assets |  |
| palette_registry | data/palettes/index.json | palette_registry | json | json | init_map_data.palette_assets |  |
| manifest_output:palettes/kaiserreich.palette.json | data/palettes/kaiserreich.palette.json | palette_pack | json | json | init_map_data.palette_assets |  |
| manifest_output:palettes/red_flood.palette.json | data/palettes/red_flood.palette.json | palette_pack | json | json | init_map_data.palette_assets |  |
| manifest_output:palettes/tno.palette.json | data/palettes/tno.palette.json | palette_pack | json | json | init_map_data.palette_assets |  |
| source:pl_powiaty | data/poland_powiaty.geojson | source_ledger_asset | geojson | json | source_ledger | pl_powiaty |
| releasable_catalog | data/releasables/hoi4_vanilla.internal.phase1.catalog.json | releasable_catalog | json | json | runtime_asset_registry.assets.releasable_catalog |  |
| ru_city_overrides | data/ru_city_overrides.geojson | city_overrides | geojson | json | runtime_asset_registry.assets.ru_city_overrides |  |
| manifest_output:runtime_asset_registry.json | data/runtime_asset_registry.json | runtime_asset_registry | json | json | data/runtime_asset_registry.json |  |
| scenario_registry | data/scenarios/index.json | scenario_registry | json | json | runtime_asset_registry.assets.scenario_registry |  |
| special_zones | data/special_zones.geojson | special_zones | geojson | json | runtime_asset_registry.assets.special_zones |  |
| transport:global_airport:full:airports | data/transport_layers/global_airport/airports.geojson | transport_pack | geojson | json | python tools/build_global_transport_points.py --family airport |  |
| transport:global_airport:preview:airports | data/transport_layers/global_airport/airports.preview.geojson | transport_pack | geojson | json | python tools/build_global_transport_points.py --family airport |  |
| transport:global_airport:build_audit | data/transport_layers/global_airport/build_audit.json | transport_build_audit | json | json | python tools/build_global_transport_points.py --family airport |  |
| transport_manifest:global_airport | data/transport_layers/global_airport/manifest.json | transport_manifest | json | json | python tools/build_global_transport_points.py --family airport |  |
| transport:global_port:build_audit | data/transport_layers/global_port/build_audit.json | transport_build_audit | json | json | python tools/build_global_transport_points.py --family port |  |
| transport_manifest:global_port | data/transport_layers/global_port/manifest.json | transport_manifest | json | json | python tools/build_global_transport_points.py --family port |  |
| transport:global_port:full:ports | data/transport_layers/global_port/ports.geojson | transport_pack | geojson | json | python tools/build_global_transport_points.py --family port |  |
| transport:global_port:preview:ports | data/transport_layers/global_port/ports.preview.geojson | transport_pack | geojson | json | python tools/build_global_transport_points.py --family port |  |
| transport_catalog:rail | data/transport_layers/global_rail/catalog.json | transport_catalog | json | json | runtime_asset_registry.assets.transport_catalog:rail |  |
| transport_catalog:road | data/transport_layers/global_road/catalog.json | transport_catalog | json | json | runtime_asset_registry.assets.transport_catalog:road |  |
| transport:airport:full:airports | data/transport_layers/japan_airport/airports.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_airports.py |  |
| transport:airport:preview:airports | data/transport_layers/japan_airport/airports.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_airports.py |  |
| transport:airport:build_audit | data/transport_layers/japan_airport/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_airports.py |  |
| transport_manifest:airport | data/transport_layers/japan_airport/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_airports.py |  |
| transport:japan_corridor:carrier | data/transport_layers/japan_corridor/carrier.json | transport_carrier_payload | json | json | python tools/build_transport_workbench_japan_carrier.py |  |
| transport_manifest:japan_corridor | data/transport_layers/japan_corridor/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_carrier.py |  |
| transport:japan_corridor:provenance | data/transport_layers/japan_corridor/provenance.json | transport_provenance_payload | json | json | python tools/build_transport_workbench_japan_carrier.py |  |
| transport:energy_facilities:build_audit | data/transport_layers/japan_energy_facilities/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_energy_facilities.py |  |
| transport:energy_facilities:full:energy_facilities | data/transport_layers/japan_energy_facilities/energy_facilities.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_energy_facilities.py |  |
| transport:energy_facilities:preview:energy_facilities | data/transport_layers/japan_energy_facilities/energy_facilities.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_energy_facilities.py |  |
| transport_manifest:energy_facilities | data/transport_layers/japan_energy_facilities/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_energy_facilities.py |  |
| transport:energy_facilities:subtype_catalog | data/transport_layers/japan_energy_facilities/subtype_catalog.json | transport_subtype_catalog | json | json | python tools/build_transport_workbench_japan_energy_facilities.py |  |
| transport:industrial_zones:build_audit | data/transport_layers/japan_industrial_zones/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport:industrial_zones:full:industrial_zones | data/transport_layers/japan_industrial_zones/industrial_zones.internal.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport:industrial_zones:preview:industrial_zones | data/transport_layers/japan_industrial_zones/industrial_zones.internal.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport:industrial_zones:open:paths:full:industrial_zones | data/transport_layers/japan_industrial_zones/industrial_zones.open.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport:industrial_zones:open:paths:preview:industrial_zones | data/transport_layers/japan_industrial_zones/industrial_zones.open.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport_manifest:industrial_zones | data/transport_layers/japan_industrial_zones/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_industrial_zones.py |  |
| transport:logistics_hubs:build_audit | data/transport_layers/japan_logistics_hubs/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_logistics_hubs.py |  |
| transport:logistics_hubs:full:logistics_hubs | data/transport_layers/japan_logistics_hubs/logistics_hubs.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_logistics_hubs.py |  |
| transport:logistics_hubs:preview:logistics_hubs | data/transport_layers/japan_logistics_hubs/logistics_hubs.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_logistics_hubs.py |  |
| transport_manifest:logistics_hubs | data/transport_layers/japan_logistics_hubs/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_logistics_hubs.py |  |
| transport:mineral_resources:build_audit | data/transport_layers/japan_mineral_resources/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_mineral_resources.py |  |
| transport_manifest:mineral_resources | data/transport_layers/japan_mineral_resources/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_mineral_resources.py |  |
| transport:mineral_resources:full:mineral_resources | data/transport_layers/japan_mineral_resources/mineral_resources.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_mineral_resources.py |  |
| transport:mineral_resources:preview:mineral_resources | data/transport_layers/japan_mineral_resources/mineral_resources.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_mineral_resources.py |  |
| transport:port:build_audit | data/transport_layers/japan_port/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport_manifest:port | data/transport_layers/japan_port/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:core:paths:full:ports | data/transport_layers/japan_port/ports.core.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:preview:ports | data/transport_layers/japan_port/ports.core.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:expanded:paths:full:ports | data/transport_layers/japan_port/ports.expanded.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:expanded:paths:preview:ports | data/transport_layers/japan_port/ports.expanded.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:full:ports | data/transport_layers/japan_port/ports.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:port:full_official:paths:preview:ports | data/transport_layers/japan_port/ports.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_ports.py |  |
| transport:rail:build_audit | data/transport_layers/japan_rail/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport_manifest:rail | data/transport_layers/japan_rail/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport:rail:full:rail_stations_major | data/transport_layers/japan_rail/rail_stations_major.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport:rail:preview:rail_stations_major | data/transport_layers/japan_rail/rail_stations_major.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport:rail:preview:railways | data/transport_layers/japan_rail/railways.preview.topo.json | transport_pack | topojson | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport:rail:full:railways | data/transport_layers/japan_rail/railways.topo.json | transport_pack | topojson | json | python tools/build_transport_workbench_japan_rail.py |  |
| transport:road:build_audit | data/transport_layers/japan_road/build_audit.json | transport_build_audit | json | json | python tools/build_transport_workbench_japan_roads.py |  |
| transport_manifest:road | data/transport_layers/japan_road/manifest.json | transport_manifest | json | json | python tools/build_transport_workbench_japan_roads.py |  |
| transport:road:full:road_labels | data/transport_layers/japan_road/road_labels.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_roads.py |  |
| transport:road:preview:road_labels | data/transport_layers/japan_road/road_labels.preview.geojson | transport_pack | geojson | json | python tools/build_transport_workbench_japan_roads.py |  |
| transport:road:preview:roads | data/transport_layers/japan_road/roads.preview.topo.json | transport_pack | topojson | json | python tools/build_transport_workbench_japan_roads.py |  |
| transport:road:full:roads | data/transport_layers/japan_road/roads.topo.json | transport_pack | topojson | json | python tools/build_transport_workbench_japan_roads.py |  |
| unit_counter_manifest:hoi4 | data/unit_counter_libraries/hoi4/manifest.json | unit_counter_manifest | json | json | runtime_asset_registry.assets.unit_counter_manifest:hoi4 |  |
| world_cities | data/world_cities.geojson | world_cities | geojson | json | init_map_data.world_cities |  |
| manifest_output:js/core/city_lights_historical_1930_asset.js | js/core/city_lights_historical_1930_asset.js | historical_1930_city_lights_asset | javascript | module | init_map_data.city_lights_assets |  |
| manifest_output:js/core/city_lights_modern_asset.js | js/core/city_lights_modern_asset.js | modern_city_lights_asset | javascript | module | init_map_data.city_lights_assets |  |
