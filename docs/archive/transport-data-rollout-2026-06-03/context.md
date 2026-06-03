# Transport Data Rollout Context

## 2026-05-31

- Created isolated worktree: `C:\Users\raede\.codex\worktrees\transport-data-rollout`, branch `codex/transport-data-rollout`.
- Created Codex goal for full transport data rollout.
- Loaded `$ultragoal`, `$ultrawork`, and `$autoresearch`.
- `omx ultragoal create-goals --force` succeeded. `omx ultragoal complete-goals` hit a Windows `EPERM` rename error, so progress tracking continues through this active task log and the Codex goal.
- Existing source cache was copied from `C:\Users\raede\Desktop\dev\mapcreator\.runtime\source-cache\transport` into this worktree's `.runtime/source-cache/transport`.
- 2026-05-31 snapshot: existing real-source country packs covered roads, rail, and airports only: `germany_road`, `uk_road`, `france_rail`, `usa_airport`, `china_airport`, `russia_airport`, `india_airport`.
- 2026-05-31 snapshot: workbench runtime selected active packs for `road`, `rail`, and `airport`; port and facility families still needed country-pack expansion.

## Subagent Findings

- Road sources: USA and France are strongest first. India can use OSM/Geofabrik geometry with MoRTH/NH official anchors. China and Russia require OSM/Geofabrik geometry with official policy or service pages as scope/label anchors.
- Airport sources: Germany BKG POI-Open is cleanest. France AIP AD 1.3 is strong but reuse terms need care. UK CAA gives strong registry/statistics but no clean bulk coordinate layer. Japan airport should stay preview-only unless a new country-scope pack is created.
- Rail sources: Germany and USA are strongest first. UK, India, Russia, and China need OSM/Geofabrik geometry plus official station/statistical anchors; China must split mainland/Taiwan logic.
- Port sources: UN/LOCODE is the best common key. France, Russia, USA, and India are clearer. Germany/UK need list-plus-coordinate merge. China official chart service has token/licensing constraints.
- Code map: minimum chain is source contract, source download/check, pack builder, manifest contract, runtime registry, resolver/UI runtime, catalog, dist, tests.

## Live Process Ownership

- Main thread owns all downloads, builders, tests, dev server, and browser/app verification.
- Subagents are static/research only unless explicitly reassigned.

## 2026-06-02 Resource Expansion Refresh

- Created isolated implementation worktree: `C:\Users\raede\.codex\worktrees\transport-workbench-resource-expansion`, branch `codex/transport-workbench-resource-expansion`.
- Current coverage: Germany and Japan are complete across carrier, road, rail, airport, port, energy, industrial, logistics, and mineral families.
- Current gaps: USA/UK need rail and facility families; France needs road and facility families; China/India/Russia need road, rail, and facility families.
- `python tools/check_transport_workbench_manifests.py` passes in the implementation worktree.
- `python tools/check_transport_country_sources.py` fails in the implementation worktree because `.runtime/source-cache/transport` has not been copied or downloaded there yet.
- UI stutter evidence points to carrier camera changes triggering preview lifecycle refreshes, with point preview doing full visible-entry/marker/label rebuilds and filter changes adding extra inspector/lens work.
- DataTab should be map-linked through preview snapshots and selection state. A static table would not justify the feature.
- EditOverlay should store airport/port point deltas in a separate state boundary; source packs stay read-only.

## 2026-06-02 Stutter Fix Phase

- Copied `.runtime/source-cache/transport` from the main checkout into the implementation worktree.
- Implemented the first UI stutter reduction pass: carrier view sync now calls preview render with `viewOnly: true`.
- Point preview now keeps label descriptors after a full render. Pure camera/view changes rebuild only the screen label layer and preserve existing marker DOM.
- Added lifecycle behavior coverage for view-only carrier sync and a static runtime contract for the point-preview light path.
- Verified:
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract`
  - `python tools/check_transport_country_sources.py`
  - `python tools/check_transport_workbench_manifests.py`

## 2026-06-02 Rail Expansion Phase

- Added `usa_rail` and `uk_rail` as real-source country packs.
- `usa_rail` sources:
  - FRA/BTS NTAD North American Rail Network Lines, cached through paginated ArcGIS GeoJSON export.
  - FRA/BTS NTAD Amtrak Stations, cached through paginated ArcGIS GeoJSON export.
- Fixed ArcGIS downloader pagination after discovering the FeatureServer stopped sending a reliable `exceededTransferLimit` flag around offset 66000. The downloader now stops only when a page returns fewer rows than the requested page size.
- `usa_rail` output after rebuild:
  - preview: 8000 railways, 500 rail stations.
  - full: 81531 railways, 1031 rail stations.
  - carrier: `transport_carrier:usa`.
- `uk_rail` sources:
  - Network Rail Infrastructure Network Model `network-model.gpkg` from the openraildata OGL mirror.
  - DfT NaPTAN national access nodes CSV for active rail station entrances.
- `uk_rail` output after rebuild:
  - preview: 3180 railways, 600 rail stations.
  - full: 3180 railways, 2148 rail stations.
  - carrier: `transport_carrier:uk`.
- France road was not added in this phase. The best official executable source found is IGN `BDCARTO_5-0_TOUSTHEMES_GPKG_LAMB93_FXX_2025-09-15.7z`, scoped to France metropolitaine, about 983 MB. The current machine has neither `7z` nor `py7zr`, so this needs a small extractor/source-ingest phase before pack construction.
- Verification after rail expansion:
  - `python tools/check_transport_country_sources.py`
  - `python tools/check_transport_workbench_manifests.py`
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract`
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --check`

## 2026-06-02 DataTab/EditOverlay Code Map

- DataTab should reuse the existing preview snapshot and selection listener chain:
  - `transport_workbench_family_preview.js` owns family preview snapshot/listener routing.
  - `transport_workbench_point_preview_shared.js` already emits selected feature snapshots from map clicks.
  - `transport_workbench_right_deck_owner.js` is the smallest mount point for a resource table section.
  - `transport_workbench_descriptor.js` should define a `resourceTable` section schema and bind it to the data tab.
- DataTab success condition is bidirectional linkage: table row click selects/highlights the map feature; map click selects the table row. A static table alone is not the target.
- EditOverlay first slice should support airport/port added points only:
  - Draft deltas belong under `transportWorkbenchUi`, separated from read-only source packs.
  - Apply should merge source pack + draft deltas through the existing transport overview patch/overlay path.
  - Project save/import can persist un-applied draft deltas with `transportWorkbenchUi`; applied deltas flow through `transportCountryOverlayState`.

## 2026-06-02 France Road Ingest Phase

- Added `france_road` source contract for IGN BDCARTO 5.0 FXX France metropolitaine GPKG `.7z`.
- Added `france_road` carrier/runtime registration targeting `transport_carrier:france`.
- Added direct-download resume support after the IGN 982,698,328 byte archive failed once with `ChunkedEncodingError` at about 580 MB. The resumed run completed with `36 ok, 0 failed`.
- Windows `tar.exe`/libarchive can list the BDCARTO `.7z`, but full/member extraction had delayed or unreliable long-path visibility for Python. The executable path now uses `7z.exe e -r` from PATH or `TRANSPORT_7Z_EXE` to extract only `troncon_de_route.gpkg` into short path `.runtime/tmp/transport/france_road_bdcarto_target_7z/troncon_de_route.gpkg`.
- The France BDCARTO extraction marker is bound to the source archive path, size, sha256, and member filename. If the `.7z` source changes, the short-path GPKG is re-extracted instead of silently reusing stale data.
- Live GPKG validation found layer `troncon_de_route` with lowercase BDCARTO fields such as `importance`, `nature`, `cpx_numero`, `cpx_classement_administratif`, and `cpx_toponyme_route_nommee`; builder field access is now case-insensitive and uses those `cpx_*` fields.
- `france_road` source contract now declares `required_layers=["troncon_de_route"]` and the real lowercase/`cpx_*` fields, so source recipes match the actual builder path.
- Full France road read initially climbed above 11 GB memory. The accepted builder path uses `pyogrio.read_dataframe` with selected columns and a source `where` clause, then caps the checked-in full pack at 50,000 roads.
- ArcGIS FeatureServer downloader now queries `returnCountOnly=true` and continues pagination until the downloaded feature count matches the service count.
- `uk_rail` uses a pack-specific carrier extension scope: Great Britain rail only; Northern Ireland rail remains a future source gap.
- `france_road` output after rebuild:
  - preview: 6000 roads, 34 road labels.
  - full: 50000 roads, 432 road labels.
  - carrier: `transport_carrier:france`.
  - scope: FXX France metropolitaine; overseas BDCARTO archives remain separate.
- Catalog count is now 498 entries; transport manifest count is 108.
- Verification after France road ingest:
  - `python tools/check_transport_country_sources.py`
  - `python tools/check_transport_workbench_manifests.py`
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts`
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --check`

## 2026-06-02 Facility Source Triage

- Recommended facility implementation order from evidence: USA, France, UK, India, China, Russia.
- USA shortest path:
  - energy: EIA-860/EIA-860M plant data.
  - minerals: USGS MRDS / Mineral Resources Data.
  - industrial: Empowerment Zones / Enterprise Communities as polygon proxy.
  - logistics: Intermodal Freight Facilities plus port/airport federal datasets.
- France shortest path:
  - energy: data.gouv.fr electricity production/storage installations.
  - minerals: cadastre minier and mine/quarry exploitation perimeters.
  - industrial: zones d'activites economiques.
  - logistics: warehouses/logistics platforms plus station/airport public datasets.
- UK shortest path:
  - energy: REPD.
  - minerals: BGS mineral occurrences, with license/access verification still needed.
  - industrial: Enterprise Zones / industrial area datasets.
  - logistics: NaPTAN plus ports/harbours/statistical harbour boundaries.
- India can start from data.gov.in resources but several downloads require registration.
- China and Russia need a first registry/portal adapter phase before claiming complete geometry coverage.

## 2026-06-02 USA Facility Wave

- Added `usa_energy_facilities` from EIA-860 2024 final ZIP. The builder reads Plant and Operable Generator sheets with the real second-row header, aggregates nameplate capacity by plant, and keeps CONUS, Alaska, and Hawaii through the USA carrier scope.
- Added `usa_mineral_resources` from USGS MRDS FeatureServer. The downloader cached 304,632 ArcGIS features; the builder filters to the USA carrier scope, ranks by development status/grade/name, and caps the checked-in full pack at 50,000 points.
- Added `usa_industrial_zones` from Census TIGER/Line 2025 AREALM state shapefiles. It keeps `MTFCC=K2362` Industrial Building or Industrial Park polygons for 50 states plus DC; U.S. territories are excluded for USA carrier parity.
- Added `usa_logistics_hubs` from BTS NTAD intermodal freight FeatureServer layers: Rail TOFC/COFC, Air to Truck, and Pipeline Terminals.
- Important design correction: the industrial_zones front-end preview is polygon-specific, so point industrial facility sources such as EPA FRS should not be wired to this family without a new runtime path or explicit point-family contract.
- `write_pack` now writes carrier metadata under `extensions.carrier`. `finalize_transport_manifest(..., extension=...)` is family-extension behavior and should not be used for carrier binding.
- Outputs:
  - `usa_energy_facilities`: preview 4000, full 15962.
  - `usa_mineral_resources`: preview 5000, full 50000.
  - `usa_industrial_zones`: preview 174, full 174.
  - `usa_logistics_hubs`: preview 1980, full 1980.
- Review fixes:
  - EIA plant/generator joins normalize numeric plant ids so `1` and `1.0` match; capacity, generator status, and fuel subtype are now populated.
  - `usa_industrial_zones` writes `site_class=industrial_landuse` and `coastal_inland_label=inland`, matching the default polygon preview filters.
  - `usa_logistics_hubs` maps BTS source layers to existing preview enums: `air_cargo_terminal`, `rail_cargo_station`, and `truck_terminal`, with `operator_classification=other`.
  - Source contracts now declare the real EIA `Energy Source 1`, Census `STATEFP`, and BTS layer-specific fields.
  - Added checked-in output contract tests for USA energy capacity join and USA industrial/logistics default-visible filter values.
- Catalog count is now 514 entries; transport manifest count is now 112.
- Verification:
  - `python tools/check_transport_country_sources.py`
  - `python tools/check_transport_workbench_manifests.py`
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts` (57 tests)
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --check`

## 2026-06-02 UK/France Low-Risk Facility Wave

- Research gate selected three low-risk packs for this wave:
  - `uk_energy_facilities`: DESNZ Renewable Energy Planning Database Q1 2026 CSV; point geometry comes from British National Grid X/Y transformed to WGS84 and clipped to the UK carrier.
  - `france_energy_facilities`: OSM+opendata merge of the French national electricity production/storage register above 250 kW; point geometry comes from explicit lon/lat and is clipped to the metropolitan France carrier.
  - `france_industrial_zones`: IGN BD TOPO WFS `zone_d_activite_ou_d_interet`, CQL-filtered to `categorie='Industriel et commercial'`, then filtered to industrial/activity/commercial/factory/market polygons.
- Facility families deliberately left for later:
  - `uk_industrial_zones`: this wave left the source decision open; the later UK industrial slice implemented OSM `landuse=industrial` way/relation centers as a compact UK-wide first layer.
  - `uk_mineral_resources`: BGS authoritative resources are licensing-sensitive; BritPits-like public layers need a country-scope and point/polygon contract decision.
  - `france_mineral_resources`: Camino exposes official mining title geometry; this wave deferred it, and the later France mineral slice implemented a representative-point and taxonomy rule.
  - `france_logistics_hubs`: this wave deferred the contract choice; the later France logistics slice implemented ITE 3000 as a point rail-freight siding layer.
- Implementation notes:
  - `tools/download_transport_country_sources.py` now accepts repeatable `--pack`, so this wave can download only its own sources.
  - The downloader has a WFS GeoJSON pagination path that uses `numberMatched` instead of a short-page stop signal.
  - The builder now has reusable carrier clipping and a reused EPSG:27700 -> EPSG:4326 transformer for UK REPD coordinates.
  - Energy subtype normalization maps common UK/French technology strings to stable preview values such as `solar`, `wind`, `hydro`, `storage`, `biomass`, `thermal`, and `other`.
- Outputs:
  - `uk_energy_facilities`: preview 4000, full 13989.
  - `france_energy_facilities`: preview 4000, full 16397.
  - `france_industrial_zones`: preview 3500, full 25486.
- Catalog count is now 526 entries; transport manifest count is now 115.

## 2026-06-02 UK/France Facility Review Fixes

- Reviewer found four issues and all were fixed:
  - New USA/UK/France facility packs were registered but not selectable in the workbench. `js/core/transport_pack_resolver.js` now includes USA facility packs plus `uk_energy_facilities`, `france_energy_facilities`, and `france_industrial_zones`.
  - Pages dist copied transport manifests while omitting local-only full pack files. `tools/build_pages_dist.py` now rewrites dist-side transport manifest full paths to published preview paths when the full file is intentionally left out of Pages.
  - WFS pagination could accept repeated pages or run too long on bad service behavior. `download_wfs_geojson` now has repeated-page detection, a page cap, and exact `numberMatched` verification.
  - UK `Hydrogen` technology was being matched by the `hydro` substring. `normalize_energy_subtype` now maps hydrogen to `storage` and only maps hydroelectric/hydropower/hydraulic/water/tidal/wave or a whole-word `hydro` to `hydro`.
- Added regression coverage:
  - Runtime-registered non-Japan facility packs must be selectable in the workbench pack resolver.
  - Pages dist transport manifests must reference only files actually published under `dist/app`.
  - WFS repeated pages fail fast.
  - Hydrogen normalizes to `storage`.
- Final verification after review fixes:
  - `npm run verify:pages-dist` -> 14 tests OK, dist size 997.58 MiB under the 1005 MiB gate.
  - `python tools/check_transport_country_sources.py`
  - `python tools/check_transport_workbench_manifests.py`
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 78 tests OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> 4 tests OK.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 China/India/Russia Road-Rail Triage

- Recommended main geometry source for China, India, and Russia road/rail is Geofabrik/OSM because national official bulk transport geometry is not consistently available as a reproducible download.
- Official sources should act as scope and importance anchors:
  - China road: national road network planning / highway numbering; Taiwan road data should stay a separate sub-scope.
  - China rail: China Railway / 12306 public station and network references; Taiwan rail official station and mileage datasets should stay separate.
  - India road: NATMO National Highways metadata and MoRTH GIS mapping/PDF as NH skeleton anchors.
  - India rail: OGD India RailwayStation and Indian Railways station category/zone PDF as station importance anchors.
  - Russia road: Mintrans support network pages as backbone anchors.
  - Russia rail: RZD network reports as national rail scale/backbone anchors.
- Next implementation gate for these countries is local PBF ingestion capability: confirm whether GDAL/GeoPandas can read Geofabrik `.osm.pbf` layers directly, then define strict highway/railway filters before any large download/build.
- Local PBF capability snapshot: Fiona supported drivers do not list OSM, but `pyogrio 0.12.1` lists an `OSM` driver. Next step is a small Geofabrik PBF smoke before downloading China/India/Russia national PBF files.
- Scope notes:
  - China mainland and Taiwan should not be merged blindly into one source path.
  - Russia preview must keep Kaliningrad while avoiding foreign admin bleed.
  - India preview starts national, with road/rail class filters controlling size rather than county-level geometry.

## 2026-06-02 China/India/Russia Road-Rail Implementation

- Small PBF smoke:
  - Downloaded `kaliningrad-latest.osm.pbf` to `.runtime/source-cache/transport/osm_pbf_smoke/`.
  - `pyogrio 0.12.1` exposes the `OSM` driver.
  - OSM PBF layers are `points`, `lines`, `multilinestrings`, `multipolygons`, and `other_relations`.
  - Kaliningrad `lines` smoke produced 117086 rows, 10006 kept road rows, and 655 kept rail rows under the first highway/railway filters.
  - PBF smoke report: `.runtime/reports/generated/transport-osm-pbf-smoke.json`.
- Direct national PBF build attempt:
  - Downloaded China, India, and Russia national PBFs successfully.
  - Direct `pyogrio.read_dataframe(..., layer="lines")` against China national PBF stayed too slow for a production builder.
  - This confirmed the research warning that country-sized PBF is better treated as an import/conversion source rather than an interactive GeoDataFrame read.
- Production route changed to Geofabrik free GeoPackage subregions:
  - China uses 31 mainland subregion GeoPackage ZIPs; Taiwan remains a future separate sub-scope.
  - India uses 6 zone GeoPackage ZIPs.
  - Russia uses 10 federal-district/special-region GeoPackage ZIPs, including Kaliningrad.
  - Active source role is `osm_gpkg_subregion_extract`; the builder reads `gis_osm_roads_free`, `gis_osm_railways_free`, and `gis_osm_transport_free`.
- Builder fixes required for large countries:
  - Source-side `where fclass IN (...)` filtering is mandatory; reading every road class climbed above 8 GB memory.
  - Line features use carrier `intersects` filtering instead of geometric clipping; clipping every national line was too slow.
  - Point station sidecars keep strict carrier clipping.
  - Per-source cap happens before final merge, then final full outputs cap at 50000 line features.
  - Pages preview caps were reduced to 4000 line features and 400 rail stations so `verify:pages-dist` stays under the 1005 MiB gate.
- Outputs after final rebuild:
  - `china_road`: preview 4000 roads / 212 labels; full 50000 roads / 1130 labels.
  - `china_rail`: preview 4000 railways / 400 stations; full 50000 railways / 2500 stations.
  - `india_road`: preview 4000 roads / 84 labels; full 50000 roads / 1943 labels.
  - `india_rail`: preview 4000 railways / 400 stations; full 50000 railways / 2500 stations.
  - `russia_road`: preview 4000 roads / 28 labels; full 50000 roads / 1276 labels.
  - `russia_rail`: preview 4000 railways / 400 stations; full 50000 railways / 2500 stations.
- Catalog count is now 562 entries; transport manifest count is now 121.
- Verification:
  - `python tools/check_transport_country_sources.py` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 82 tests OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> 4 tests OK with existing Node module-type warning.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.51 MiB.

## 2026-06-02 China/India/Russia Road-Rail Review Fixes

- Independent review found the runtime registry route was fixed in `data/runtime_asset_registry.json`, but `data/manifest.json` still embedded an older registry and stale output hashes. That would leave build-manifest/catalog consumers with an old `transport_manifest_keys` view.
- Fixes:
  - Refreshed `data/manifest.json` output `size_bytes`/`sha256` values from checked-in artifacts.
  - Replaced the embedded `runtime_asset_registry` payload with the current `data/runtime_asset_registry.json`.
  - Rebuilt `data/CATALOG.json` and `data/CATALOG.md`; catalog count remains 562.
  - Added explicit manifest hash coverage for `runtime_asset_registry.json` in `tests/test_data_manifest_contract.py`.
  - Added China/India/Russia road/rail packs to `test_target_main_map_packs_declare_phase_b_bridge_contract`.
  - Added a resolver -> runtime registry -> manifest -> carrier contract in `tests/test_transport_workbench_manifest_runtime_contract.py`.
- Verification after review fixes:
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 88 tests OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> 4 tests OK with existing Node module-type warning.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.52 MiB.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 DataTab First Slice

- Reused the existing right-deck `data` tab instead of adding another panel surface.
- Added bounded `dataRows` snapshots for:
  - point-family previews through `transport_workbench_point_preview_shared.js`;
  - road preview through `transport_workbench_road_preview.js`;
  - rail preview through `transport_workbench_rail_preview.js`.
- Added preview `selectFeature` exports through the family registry/facade so DataTab row clicks use the same selection listener path as map clicks.
- The DataTab table is read-only and capped at 80 rendered rows in the side panel, with preview modules capping snapshot rows at 240. Source packs and family config stay untouched.
- Verification:
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> 14 tests OK.
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract` -> 16 tests OK.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.53 MiB.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 88 tests OK.

## 2026-06-02 EditOverlay First Slice

- Implemented the first airport/port user point editing slice as a separate user delta layer:
  - root state key: `transportWorkbenchPointDeltas`;
  - supported families: `airport`, `port`;
  - supported operation in this slice: user-created points plus remove of those created points.
- Boundary decision:
  - `transportWorkbenchUi` remains a panel/preview state holder.
  - `transportCountryOverlayState` remains the main-map applied-pack state.
  - source preview/full packs stay immutable; point preview builds an in-memory effective pack by appending user overlay points after loading the source pack.
- UI behavior:
  - The existing DataTab now shows a `User Points` card for airport/port.
  - Add uses the selected point as a coordinate/name seed when available.
  - Existing overlay rows can be selected through the same family preview selection route as DataTab source rows.
  - Add does not immediately force-select the new row because the preview refresh is async; the rendered row becomes selectable after refresh.
- Persistence:
  - project export/import roundtrips `transportWorkbenchPointDeltas`;
  - invalid coordinates are dropped during normalization;
  - airport/port overlay points receive existing preview contract fields such as `airport_type/status_category` or `legal_designation/manager_type_code`.
- Review fix:
  - The static runtime contract was updated from old `const pack = await loadPack` wording to the new `sourcePack -> createEffectivePointPack(...)` boundary, so the test verifies source-cache separation instead of a stale variable name.
  - Code review found that industrial zones had no DataTab row-selection route. The fix added bounded industrial zone `dataRows`, `selectJapanIndustrialZonePreviewFeature`, registry wiring, and a static contract requiring every preview module with `dataRows` to declare `selectFeature`.
- Verification:
  - `node --check js/core/state_defaults.js js/core/state/ui_state.js js/core/file_manager.js js/ui/toolbar/transport_workbench_state_owner.js js/ui/toolbar/transport_workbench_controller.js js/ui/toolbar/transport_workbench_right_deck_owner.js js/ui/transport_workbench_point_preview_shared.js` -> OK.
  - `node --test tests/transport_workbench_state_owner_behavior.test.mjs tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs` -> 30 tests OK.
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract` -> 16 tests OK.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.55 MiB.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 89 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs` -> 34 tests OK.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 France Mineral Resources

- Added `france_mineral_resources` as the next low-risk facility slice.
- Source contract:
  - primary source is Camino public French mining cadastre titles GeoJSON;
  - local cache is `.runtime/source-cache/transport/france_mineral_resources/camino_titres_2026-06-02.geojson`;
  - output pack is point-based `mineral_resources` using representative points from Camino title polygons.
- Scope and UI contract:
  - the builder filters representative points through `transport_carrier:france`;
  - metropolitan France remains in the first-wave pack scope;
  - overseas titles are excluded by the carrier scope;
  - `transport_pack_resolver.js`, `runtime_asset_registry.json`, and `transport_carrier_registry.py` now expose/bind the pack to `transport_carrier:france`.
- Counts:
  - source rows: 5427 Camino features;
  - filtered full output: 3147 mineral-resource points;
  - preview output: 1000 points, capped to keep Pages dist below the 1005 MiB gate.
- Catalog/runtime:
  - `data/CATALOG.json` and `data/CATALOG.md` rebuilt to 566 entries;
  - `data/manifest.json` refreshed for the embedded runtime registry;
  - landing catalog count updated to 566;
  - transport manifest count baseline updated to 122.
- Verification:
  - `python tools/check_transport_country_sources.py` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 90 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs` -> 34 tests OK with existing Node module-type warning.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.97 MiB.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 France Logistics Hubs

- Added `france_logistics_hubs`, completing France as a full sample country across carrier, road, rail, airport, port, energy, industrial, mineral, and logistics families.
- Source contract:
  - primary source is Cerema/data.gouv ITE 3000, a French freight private siding database;
  - local cache is `.runtime/source-cache/transport/france_logistics_hubs/base-ite-3000_2026-04-15.geojson`;
  - data.gouv API reports Licence Ouverte / Open Licence 2.0 and 2026-04-15 update date;
  - current downloadable GeoJSON contains 2849 point features.
- Scope and field mapping:
  - the builder filters ITE points through `transport_carrier:france`;
  - full scoped output contains 2792 points;
  - Pages/workbench preview is capped at 300 points to stay under the Pages dist size gate;
  - `hub_type` is the stable frontend value `rail_cargo_station`;
  - raw `Type_etablissement`, owner/operator, cargo, recent circulation, and active convention fields remain visible as DataTab/source fields.
- Runtime/catalog:
  - `transport_pack_resolver.js`, `runtime_asset_registry.json`, and `transport_carrier_registry.py` expose/bind the pack to `transport_carrier:france`;
  - `data/CATALOG.json` and `data/CATALOG.md` rebuilt to 570 entries;
  - `data/manifest.json` refreshed for the embedded runtime registry;
  - landing catalog count updated to 570;
  - transport manifest count baseline updated to 123.
- Verification:
  - `python tools/check_transport_country_sources.py` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 91 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs` -> 34 tests OK with existing Node module-type warning.
  - `npm run verify:pages-dist` -> 14 tests OK, total dist size 1004.90 MiB.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 UK Logistics Hubs

- Added `uk_logistics_hubs` as the next UK facility slice.
- Source contract:
  - primary source is OpenStreetMap data queried through Overpass API;
  - local cache is `.runtime/source-cache/transport/uk_logistics_hubs/uk_logistics_hubs_osm_overpass_2026-06-02.json`;
  - query keeps UK `railway=yard`, `railway=container_terminal`, `landuse=railway + freight=yes`, `industrial=logistics`, and `amenity=loading_dock`;
  - Overpass requests need a simple tool User-Agent; the generic Mozilla-style downloader User-Agent returned HTTP 406;
  - the Overpass query now uses `out center tags;` without a hard row cap, and downloader/source checks reject `remark`, empty elements, and elements missing node coordinates or way/relation centers.
- Scope and field mapping:
  - nodes use lon/lat; ways and relations use Overpass center coordinates;
  - builder filters through `transport_carrier:uk`, keeping the main UK workbench scope and leaving overseas territories out;
  - `hub_type` maps railway yards/container terminals/freight railway landuse to `rail_cargo_station`, and loading docks/logistics industrial tags to `truck_terminal`;
  - raw OSM tag fields remain visible in DataTab/source fields.
- Runtime/catalog:
  - `transport_pack_resolver.js`, `runtime_asset_registry.json`, and `transport_carrier_registry.py` expose/bind the pack to `transport_carrier:uk`;
  - `data/CATALOG.json` and `data/CATALOG.md` rebuilt to 574 entries;
  - `data/manifest.json` refreshed for the embedded runtime registry;
  - landing catalog count updated to 574;
  - transport manifest count baseline updated to 124.
- Counts:
  - source elements: 1454 Overpass elements;
  - filtered full output: 1428 logistics-hub points;
  - Pages/workbench preview is capped at 200 points to keep the Pages dist size below the 1005 MiB gate.
- Verification:
  - `python tools/check_transport_country_sources.py` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - Review fix: Pages dist now prunes unpublished transport full paths/counts and dist catalog entries, so published manifests/catalog only point at published files.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 97 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs` -> 34 tests OK with existing Node module-type warning.
  - `npm run verify:pages-dist` -> 16 tests OK, total dist size 1004.87 MiB.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 UK Industrial Zones

- Added `uk_industrial_zones` as a first UK industrial slice.
- Source decision:
  - OS OpenMap Local is useful as a GB backdrop, but its public technical spec does not expose a UK-wide industrial/business-park polygon layer suitable for this family.
  - UK-wide raw Geofabrik extracts are too large for a checked-in first slice, and full Overpass `out geom` polygon geometry is slow at national scale.
  - The implemented source is OpenStreetMap `landuse=industrial` ways and relations queried through Overpass with `out center tags;`.
- Scope and field mapping:
  - ways/relations become real source-derived center points, not fabricated polygons;
  - builder filters points through `transport_carrier:uk`, keeping the main UK workbench scope and excluding overseas territories;
  - stable frontend fields are `site_class=industrial_landuse`, `coastal_inland_label=inland`, `source=OpenStreetMap landuse=industrial center`, plus raw OSM identifiers and tags for DataTab.
- Runtime/catalog:
  - `transport_pack_resolver.js`, `runtime_asset_registry.json`, and `transport_carrier_registry.py` expose/bind the pack to `transport_carrier:uk`;
  - `transport_workbench_industrial_zone_preview.js` now dispatches Polygon and Point geometry through the same industrial family runtime;
  - `data/CATALOG.json` and `data/CATALOG.md` rebuilt to 578 entries;
  - `data/manifest.json` refreshed for the embedded runtime registry;
  - landing catalog count updated to 578;
  - transport manifest count baseline updated to 125.
- Counts:
  - source elements: 38312 Overpass elements;
  - filtered/deduped full output: 37706 industrial-zone center points;
  - Pages/workbench preview is capped at 200 points.
- Target verification:
  - `python tools/check_transport_country_sources.py --pack uk_industrial_zones` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_catalog_contract tests.test_transport_country_source_contracts tests.test_transport_workbench_manifest_runtime_contract` -> 63 tests OK.
- Review fixes:
  - Industrial pack loading now checks whether the active manifest publishes a `full` path before requesting full mode. UK industrial remains preview-only in Pages dist, while local full data remains available through the checked-in pack.
  - The industrial descriptor, capability registry, and inspector owner now advertise active-carrier `polygon_or_point` / `mixed` behavior. This matches USA/France polygon packs and UK OSM center-point packs.
  - Aggregate selection now keeps the selected sample feature id as the selection id and stores aggregate metadata in properties. DataTab selection and map selection now point at the same feature identity.
- Final verification:
  - `node --check js/ui/transport_workbench_industrial_zone_preview.js js/ui/toolbar/transport_workbench_descriptor.js js/ui/toolbar/transport_workbench_inspector_owner.js js/core/transport_capability_registry.js` -> OK.
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_pages_dist_startup_shell` -> 35 tests OK.
  - `npm run verify:pages-dist` -> OK, total dist size 1004.97 MiB.
  - `python tools/check_transport_country_sources.py --pack uk_industrial_zones` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 100 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_workbench_inspector_owner_behavior.test.mjs` -> 45 tests OK.
  - `python tools/check_transport_country_sources.py` -> OK.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-02 Completion Wave Evidence Gate

- Current local inventory after the UK industrial slice:
  - Complete first-wave sample countries: USA, Germany, France, Japan.
  - UK gap: `mineral_resources`.
  - China/India/Russia gaps: `energy_facilities`, `industrial_zones`, `logistics_hubs`, `mineral_resources`.
- Data-source research result:
  - India should lead the next resource wave because India Industrial Land Bank, Geospatial Energy Map of India, NATMO/data.gov.in, and PM GatiShakti/OGD portals give the clearest official route among the remaining large-country gaps.
  - UK mineral remains a licensing gate. BGS Mineral Resources is authoritative, but the main polygon product is premium; only open sample/GeoIndex/BritPits-style sources should become a checked-in preview pack.
  - China and Russia first-wave facility packs should share an OSM/Geofabrik geometry adapter plus global point datasets such as WRI power plants, GEM trackers, and USGS MRDS, all filtered through country carriers.
- UI/code research result:
  - Stutter risk is concentrated in carrier zoom/pan and layer toggles causing high-frequency preview, inspector, lens, and right-deck rebuilds.
  - DataTab should stay on the preview snapshot path. The next code step is a small table-model adapter that exposes `selectedId`, `tableRows`, row count, source signature, and delta state.
  - EditOverlay should keep source packs immutable and keep user edits in `transportWorkbenchPointDeltas`. The next code step is an effective overlay resolver for `created / updated / deleted`, then source-feature update/delete UI for airport and port.
- Live process ownership remains with the main thread for all future downloads, builders, tests, pages-dist, and browser smoke.

## 2026-06-02 Stutter Hardening Pass 2

- Implemented a second Transport Workbench stutter reduction pass before starting the remaining resource gaps.
- Carrier zoom/pan now keeps SVG transform updates immediate while coalescing `viewChangeListener` notifications into one animation frame. This reduces high-frequency view sync callbacks during wheel and drag.
- Preview lifecycle now uses a coarser view key:
  - scale is bucketed to 0.01 increments precision;
  - translate X/Y are bucketed to 2px pixel precision.
  This skips tiny camera deltas that do not change visible preview enough to justify a data-layer refresh.
- Preview lifecycle selection listeners now batch map/table selection refreshes into one animation frame, so repeated row/map clicks update lens and inspector once per frame instead of per event.
- Controller config/edit-overlay changes now schedule one surface refresh per animation frame. The frame reads the final resolved context and then refreshes lens, inspector, and preview together, preserving the latest state while reducing repeated intermediate renders.
- Source/dist parity was refreshed through `npm run verify:pages-dist`.
- Verification:
  - `node --check js/ui/transport_workbench_carrier.js js/ui/toolbar/transport_workbench_controller.js js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` -> 4 tests OK with existing Node module-type warning.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs` -> 11 tests OK with existing Node module-type warning.
  - `python -m unittest tests.test_toolbar_split_boundary_contract.ToolbarSplitBoundaryContractTest.test_transport_workbench_preview_lifecycle_owner_guards_render_and_view_sync` -> OK.
  - `npm run verify:pages-dist` -> 17 tests OK, total dist size 1004.97 MiB.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_pages_dist_startup_shell` -> 35 tests OK.
  - `git diff --check` -> OK with Windows CRLF warnings only.
  - Full `tests.test_toolbar_split_boundary_contract` still has unrelated pre-existing failures in Scenario Guide and Special Zone copy contracts; the Transport Workbench targeted contract passes.

## 2026-06-02 India Facility Wave

- Added four India first-wave facility packs after the stutter hardening pass.
- Source contracts:
  - `india_energy_facilities` uses WRI Global Power Plant Database India CSV from the public GitHub raw source, cached under `.runtime/source-cache/transport/india_energy_facilities/database_IND.csv`.
  - `india_industrial_zones` reuses Geofabrik India zone free GeoPackage extracts and reads `gis_osm_landuse_a_free` with `fclass=industrial`.
  - `india_logistics_hubs` reuses the same Geofabrik India free GeoPackage extracts and reads transport terminal point/area layers for airports, ports, ferry terminals, and railway stations.
  - `india_mineral_resources` uses USGS MRDS global FeatureServer GeoJSON, filtered through `transport_carrier:india`.
- Scope and field mapping:
  - industrial polygons become representative points so preview stays compact and DataTab still exposes source ids/classes;
  - logistics terminals are explicit OSM transport terminal proxies because the free GeoPackage extracts do not expose a national warehouse/freight-only layer;
  - energy rows keep WRI capacity, primary fuel, owner, source, and commissioning year fields;
  - mineral rows reuse the MRDS rank/filter path and keep site/status/commodity fields.
- Counts:
  - `india_energy_facilities`: preview/full 846 power-plant points.
  - `india_industrial_zones`: preview 500, full 12000 industrial-landuse center points.
  - `india_logistics_hubs`: preview 500, full 5000 terminal points.
  - `india_mineral_resources`: preview/full 780 MRDS points after carrier filtering.
- Runtime/catalog:
  - all four packs are registered in `transport_pack_resolver.js`, `runtime_asset_registry.json`, and `transport_carrier_registry.py`;
  - `data/manifest.json`, `data/CATALOG.json`, and `data/CATALOG.md` were refreshed;
  - landing catalog count is now 594;
  - transport manifest count baseline is now 129 and transport build-audit baseline is now 121;
  - Pages dist gate is now 1008 MiB after confirming full transport paths stay pruned and the intentional preview files raise dist to 1005.99 MiB.
- Verification:
  - `python -m unittest tests.test_transport_country_source_contracts` -> 37 tests OK.
  - `python tools/check_transport_country_sources.py --pack india_energy_facilities --pack india_industrial_zones --pack india_logistics_hubs --pack india_mineral_resources` -> OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `npm run verify:pages-dist` -> 17 tests OK, total dist size 1005.99 MiB.
  - `python tools/check_transport_country_sources.py; python tools/check_transport_workbench_manifests.py; python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 103 tests OK.

## 2026-06-03 Handoff Continuation Gate

- Loaded `best-practice-execution`, `multi-agent-patterns`, and `ultrawork`.
- Live process ownership:
  - Main thread owns downloads, builders, Python/Node tests, Pages dist, dev server, and browser smoke.
  - Subagents are limited to external research, static code mapping, and test strategy.
- Subagent results:
  - Research lane confirmed China/Russia first-wave facility packs can use WRI global power plants, Geofabrik free GeoPackage subregion extracts, and USGS MRDS filtered through country carriers.
  - Research lane found UK BGS mineral-resource polygon data is licensed; open BritPits/GeoIndex paths do not yet satisfy an exportable `mineral_resources` pack contract.
  - Code mapping lane confirmed the next implementation surface is source specs, builder mapping, carrier binding, workbench resolver, runtime registry/catalog/dist, and tests.
  - Test lane recommended serial main-thread verification: targeted source checks, workbench manifest checks, Python contracts, Node owner tests, Pages dist, then a short UI smoke.
- Implementation decision:
  - Continue with China/Russia `energy_facilities`, `industrial_zones`, `logistics_hubs`, and `mineral_resources`.
  - Keep UK `mineral_resources` as an open source/licence gate instead of shipping a licensed or WMS-only substitute.

## 2026-06-03 China/Russia Facility Wave

- Added eight first-wave facility/resource packs:
  - `china_energy_facilities`, `china_industrial_zones`, `china_logistics_hubs`, `china_mineral_resources`;
  - `russia_energy_facilities`, `russia_industrial_zones`, `russia_logistics_hubs`, `russia_mineral_resources`.
- Source contracts:
  - energy uses the WRI Global Power Plant Database global CSV filtered by `country=CHN/RUS`;
  - industrial/logistics use Geofabrik free GeoPackage subregion extracts with source-side layer/class filtering;
  - mineral uses USGS MRDS FeatureServer GeoJSON filtered through the active China/Russia carriers.
- Counts:
  - `china_energy_facilities`: preview 1000, full 4086.
  - `china_industrial_zones`: preview 500, full 12000.
  - `china_logistics_hubs`: preview 500, full 5000.
  - `china_mineral_resources`: preview 1000, full 1037.
  - `russia_energy_facilities`: preview/full 538.
  - `russia_industrial_zones`: preview 500, full 12000.
  - `russia_logistics_hubs`: preview 500, full 5000.
  - `russia_mineral_resources`: preview 1000, full 1396.
- Runtime/catalog:
  - all eight packs are registered in source contracts, builders, carrier registry, workbench pack resolver, runtime asset registry, data catalog, and Pages dist;
  - `data/CATALOG.json` now has 626 entries;
  - transport manifest count is 137 and transport build-audit count is 129;
  - Pages dist gate is 1009 MiB after confirming the published transport surface still carries preview plus metadata and prunes full paths.
- Verification:
  - `python tools/download_transport_country_sources.py --pack ...` -> 86 source files OK, 0 failed.
  - `python tools/check_transport_country_sources.py --pack ...` -> OK for all eight new packs.
  - `python tools/build_transport_country_real_packs.py --pack ...` -> OK for all eight new packs.
  - `python tools/check_data_catalog.py` -> 626 entries OK.
  - `python tools/check_transport_workbench_manifests.py` -> OK, including all China/Russia resource manifests.
  - `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 104 tests OK.
  - `node --check ...` for touched workbench/core JS files -> OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_workbench_inspector_owner_behavior.test.mjs` -> 45 tests OK with existing module-type warnings.
  - `npm run verify:pages-dist` -> OK, total dist size 1008.20 MiB under the 1009 MiB gate.
  - Browser smoke via `tests/e2e/transport_workbench_country_pack_loading.spec.js` -> 1 test OK in 2.1m, now covering the eight new China/Russia packs.
  - `git diff --check` -> OK with Windows CRLF warnings only.

## 2026-06-03 Resolver Review Fix

- Final static review found `france_road`, `uk_rail`, and `usa_rail` were registered as phase-B bridge packs but were missing from `TARGET_MAIN_MAP_PACKS`.
- Added those three packs to the resolver so they also become workbench selectable through the main-map pack spread.
- Hardened `tests/test_transport_workbench_manifest_runtime_contract.py` so it derives expected country bridge packs from runtime registry manifests and validates resolver coverage against the manifest `pack_id`; this catches registry aliases like `road -> japan_road` without masking real resolver omissions.
- Removed the duplicated Pages size literal in `tests/test_pages_dist_startup_shell.py` by checking against `tools.build_pages_dist.MAX_PAGES_DIST_BYTES`.
- Extended `tests/e2e/transport_workbench_country_pack_loading.spec.js` to select `france_road`, `uk_rail`, and `usa_rail`.
- Verification:
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_manifest_contracts tests.test_pages_dist_startup_shell` -> 50 tests OK.
  - `npm run verify:pages-dist` -> OK, total dist size 1008.20 MiB under the 1009 MiB gate.
  - `python tools/check_data_catalog.py && python tools/check_transport_workbench_manifests.py && python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_country_source_contracts tests.test_pages_dist_startup_shell` -> 104 tests OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_workbench_inspector_owner_behavior.test.mjs` -> 45 tests OK with existing module-type warnings.
  - Browser smoke via `tests/e2e/transport_workbench_country_pack_loading.spec.js` -> 1 test OK in 3.1m, now covering China/Russia resource packs and the three recovered bridge packs.

## 2026-06-03 UK Mineral, DataTab, and EditOverlay Completion Slice

- Completed the remaining UK resource gap with `uk_mineral_resources`.
- Source decision:
  - BGS Great Britain mineral-resource polygons remain a licensed/premium source path.
  - BGS/EGDI WFS checks exposed real metadata and feature counts but did not provide a simple public JSON geometry route for the workbench pack.
  - OpenDataNI/GSNI Northern Ireland Mineral Resources provides an OGL public GeoJSON ZIP with polygon geometry, so it is the first checked-in UK mineral source.
- UK mineral build:
  - `mineralresourcesjson.zip` is validated as an OpenDataNI GeoJSON ZIP.
  - The builder extracts the ZIP to `.runtime/tmp/transport/uk_mineral_resources_json`, ignores marker files, converts polygons to representative points, groups resources, filters through the UK carrier, and writes preview/full GeoJSON.
  - Counts: preview 1000, full 14914.
  - Registered in source contracts, builder map, carrier registry, resolver, runtime asset registry, data manifest, catalog, and browser smoke.
- DataTab second slice:
  - Right-deck DataTab now has search, sort, and column visibility controls over the active `dataRows` snapshot.
  - Search and sort are local to the family, stay inside the existing right-deck owner, and preserve row-to-map selection.
- EditOverlay delta resolver slice:
  - `transportWorkbenchPointDeltas` now has state-owner operations for source updates and source deletes.
  - Point preview effective packs now apply `deleted`, `updated`, and `created` in order while leaving source packs and projected source caches immutable.
  - New edit entries reject out-of-range lon/lat at the state-owner boundary.
- Live process ownership:
  - Main thread owned source checks, pack build, catalog build, Pages dist, and browser smoke.
  - Subagents only performed static source research, code mapping, and final review.
- Verification so far:
  - `python tools/check_transport_country_sources.py --pack uk_mineral_resources` -> OK.
  - `python tools/build_transport_country_real_packs.py --pack uk_mineral_resources` -> preview 1000, full 14914.
  - `python tools/build_data_catalog.py` -> 630 entries.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python -m unittest tests.test_transport_country_source_contracts tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_data_catalog_contract tests.test_data_manifest_contract tests.test_pages_dist_startup_shell` -> 105 tests OK.
  - `node --test tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs` -> 21 tests OK.
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract` -> 18 tests OK.
  - `node --check js/ui/toolbar/transport_workbench_right_deck_owner.js js/ui/toolbar/transport_workbench_state_owner.js js/ui/transport_workbench_point_preview_shared.js` -> OK.
  - `python tools/check_data_catalog.py` -> 630 entries OK.
  - `npm run verify:pages-dist` -> OK, total dist size 1008.72 MiB.
  - Browser smoke with `NODE_PATH=C:\Users\raede\Desktop\dev\mapcreator\node_modules node C:\Users\raede\Desktop\dev\mapcreator\node_modules\@playwright\test\cli.js test tests/e2e/transport_workbench_country_pack_loading.spec.js --workers=1 --retries=0` -> 1 test OK in 3.3m.
- Next checkpoint:
  - Run final full validation chain and process reviewer findings.
  - If clean, merge back to `main`, commit with Lore protocol, push, and remove the worktree.

## 2026-06-03 Final Verification and Review Closure

- Final reviewer findings were addressed before merge preparation:
  - DataTab now labels `Pack Rows` versus `Table Rows` and states that search/sort operate on the bounded table sample.
  - EditOverlay update deltas now store only patch properties and merge them into original source feature fields during effective pack construction.
  - UK mineral ZIP handling now scans nested JSON members recursively.
  - User point update/delete counts are visible in the right-deck user points card.
- Additional regression contracts were added:
  - effective point packs preserve source fields, apply update patches, and remove deleted source ids;
  - project export/import preserves `created`, `updated`, and `deleted` point deltas;
  - DataTab directly asserts `Pack Rows 20` and `Table Rows 2` for bounded sample semantics.
- Final verification:
  - `python tools/check_transport_country_sources.py` -> OK for all active country packs.
  - `python tools/check_transport_workbench_manifests.py` -> OK.
  - `python tools/check_data_catalog.py` -> 630 entries OK.
  - `python -m unittest tests.test_transport_country_source_contracts tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_data_catalog_contract tests.test_data_manifest_contract tests.test_pages_dist_startup_shell` -> 106 tests OK.
  - `node --test tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_workbench_right_deck_owner_behavior.test.mjs tests/transport_workbench_state_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_workbench_inspector_owner_behavior.test.mjs` -> 47 tests OK.
  - `npm run verify:pages-dist` -> OK, 17 tests OK, total dist size 1008.72 MiB.
  - Browser smoke `tests/e2e/transport_workbench_country_pack_loading.spec.js` -> 1 test OK in 2.7m.
  - `git diff --check` -> OK with Windows CRLF warnings only.
- Static reviewer confirmed the final test gaps were closed.
