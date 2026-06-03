from __future__ import annotations

import json
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString, Point, Polygon

from map_builder.transport_country_real_source_contracts import (
    COUNTRY_SOURCE_SPECS,
    FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS,
    TARGET_COUNTRY_PACK_IDS,
    build_source_recipe,
    check_country_sources,
    scan_for_forbidden_backend_tokens,
)
from tools import download_transport_country_sources as source_downloader
from tools.build_transport_country_real_packs import (
    FRANCE_ROAD_COLUMNS,
    build_osm_gpkg_industrial_zone_centers_pack,
    build_osm_gpkg_logistics_hub_pack,
    build_osm_gpkg_rail_pack,
    build_osm_gpkg_road_pack,
    classify_france_road,
    extract_7z_member_flat,
    france_road_number,
    france_ite_operator_classification,
    france_ite_status_category,
    iter_uk_mineral_resource_json_paths,
    is_france_industrial_zone,
    is_operating_france_rail_status,
    normalize_energy_subtype,
    normalize_text,
    parse_osm_hstore_tags,
    should_keep_camino_mineral_title,
    uk_mineral_group_from_resource,
    uk_overpass_logistics_hub_type,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TRANSPORT_ROOT = PROJECT_ROOT / "data" / "transport_layers"


class TransportCountrySourceContractsTest(unittest.TestCase):
    def test_real_source_specs_cover_first_rollout_packs(self) -> None:
        self.assertEqual(tuple(COUNTRY_SOURCE_SPECS), TARGET_COUNTRY_PACK_IDS)
        for pack_id, spec in COUNTRY_SOURCE_SPECS.items():
            with self.subTest(pack_id=pack_id):
                self.assertEqual(spec.pack_id, pack_id)
                self.assertTrue(spec.sources)
                self.assertNotIn("checked_in", spec.geometry_truth.casefold())
                for source in spec.sources:
                    self.assertTrue(source.filename)
                    self.assertTrue(source.url)
                    self.assertTrue(source.license)
                    self.assertTrue(source.role)

    def test_source_check_reports_missing_cache_files_without_substitution(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            report = check_country_sources(COUNTRY_SOURCE_SPECS["uk_road"], source_cache_root=Path(temp_dir))

        self.assertFalse(report["ready"])
        self.assertEqual(
            {source["id"] for source in report["missing_sources"]},
            {"os_open_roads_gb", "osni_50k_transport_lines_geojson"},
        )
        self.assertIn("uk_road", report["source_cache_dir"])

    def test_source_check_rejects_invalid_overpass_cache(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_root = Path(temp_dir)
            source_path = source_root / "uk_logistics_hubs" / "uk_logistics_hubs_osm_overpass_2026-06-02.json"
            source_path.parent.mkdir(parents=True)
            source_path.write_text(json.dumps({"remark": "runtime error", "elements": []}), encoding="utf-8")
            report = check_country_sources(COUNTRY_SOURCE_SPECS["uk_logistics_hubs"], source_cache_root=source_root)

        self.assertFalse(report["ready"])
        self.assertEqual(report["missing_sources"], [])
        self.assertEqual(report["invalid_sources"][0]["id"], "osm_overpass_uk_logistics_facilities")
        self.assertIn("Overpass response contains remark", report["invalid_sources"][0]["errors"][0])

    def test_source_recipe_signatures_only_come_from_present_cache_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_root = Path(temp_dir)
            source_path = source_root / "germany_road" / "dlm250.utm32s.nas_bda.kompakt.zip"
            source_path.parent.mkdir(parents=True)
            source_path.write_bytes(b"fixture-real-source")
            report = check_country_sources(COUNTRY_SOURCE_SPECS["germany_road"], source_cache_root=source_root)

        recipe = build_source_recipe(COUNTRY_SOURCE_SPECS["germany_road"], report)

        self.assertTrue(report["ready"])
        self.assertEqual(set(recipe["source_signature"]), {"bkg_dlm250_compact_nas_bda"})
        self.assertEqual(recipe["source_policy"], "real_source_cache_only")

    def test_country_pack_audits_do_not_use_forbidden_geometry_backends(self) -> None:
        audit_paths = []
        for pack_id in TARGET_COUNTRY_PACK_IDS:
            pack_dir = TRANSPORT_ROOT / pack_id
            audit_paths.extend([pack_dir / "build_audit.json", pack_dir / "source_recipe.manual.json"])

        offenders = scan_for_forbidden_backend_tokens(audit_paths)

        self.assertFalse(offenders, offenders)

    def test_existing_country_packs_must_have_real_source_signature(self) -> None:
        missing_signature: list[str] = []
        for pack_id in TARGET_COUNTRY_PACK_IDS:
            manifest_path = TRANSPORT_ROOT / pack_id / "manifest.json"
            if not manifest_path.exists():
                continue
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            signature = manifest.get("source_signature") or {}
            if not signature:
                missing_signature.append(pack_id)
                continue
            filenames = "\n".join(
                str(value.get("filename") or value.get("path") or "")
                for value in signature.values()
                if isinstance(value, dict)
            )
            if any(token in filenames for token in FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS):
                missing_signature.append(pack_id)

        self.assertFalse(missing_signature, missing_signature)

    def test_normalize_text_treats_pandas_missing_values_as_empty(self) -> None:
        self.assertEqual(normalize_text(None), "")
        self.assertEqual(normalize_text(float("nan")), "")
        self.assertEqual(normalize_text(pd.NA), "")

    def test_usa_airport_pack_excludes_private_airports_and_nan_codes(self) -> None:
        payload = json.loads((TRANSPORT_ROOT / "usa_airport" / "airports.geojson").read_text(encoding="utf-8"))
        offenders = []
        for feature in payload.get("features") or []:
            properties = feature.get("properties") or {}
            if properties.get("facility_use") == "PR":
                offenders.append(properties.get("id") or properties.get("name"))
            for key in ("iata", "icao"):
                if str(properties.get(key) or "").casefold() == "nan":
                    offenders.append(f"{properties.get('id') or properties.get('name')}:{key}=nan")

        self.assertFalse(offenders[:20], offenders[:20])

    def test_france_rail_preview_contains_only_operating_lines(self) -> None:
        payload = json.loads((TRANSPORT_ROOT / "france_rail" / "railways.preview.topo.json").read_text(encoding="utf-8"))
        geometries = payload.get("objects", {}).get("railways", {}).get("geometries") or []
        offenders = []
        missing_status = []
        for geometry in geometries:
            properties = geometry.get("properties") or {}
            if not is_operating_france_rail_status(properties.get("rail_status")):
                offenders.append(properties.get("rail_status"))
            if properties.get("status") != "active":
                missing_status.append(properties.get("id"))

        self.assertTrue(geometries)
        self.assertFalse(offenders[:20], offenders[:20])
        self.assertFalse(missing_status[:20], missing_status[:20])

    def test_france_road_builder_accepts_lowercase_bdcarto_fields(self) -> None:
        row = {
            "importance": "2",
            "nature": "Route a 2 chaussees",
            "cpx_numero": "N7",
            "cpx_classement_administratif": "Route nationale",
        }

        self.assertEqual(france_road_number(row), "N7")
        self.assertEqual(classify_france_road(row), "trunk")

    def test_france_road_source_contract_matches_bdcarto_layer_and_columns(self) -> None:
        source = COUNTRY_SOURCE_SPECS["france_road"].sources[0]

        self.assertEqual(source.required_layers, ("troncon_de_route",))
        self.assertEqual(set(source.required_fields), {*FRANCE_ROAD_COLUMNS, "geometry"})

    def test_geofabrik_osm_gpkg_specs_cover_large_country_road_rail_packs(self) -> None:
        expected = {
            "china_road": ("road", "https://download.geofabrik.de/asia/china/", ("gis_osm_roads_free",)),
            "india_road": ("road", "https://download.geofabrik.de/asia/india/", ("gis_osm_roads_free",)),
            "russia_road": ("road", "https://download.geofabrik.de/russia/", ("gis_osm_roads_free",)),
            "china_rail": ("rail", "https://download.geofabrik.de/asia/china/", ("gis_osm_railways_free", "gis_osm_transport_free")),
            "india_rail": ("rail", "https://download.geofabrik.de/asia/india/", ("gis_osm_railways_free", "gis_osm_transport_free")),
            "russia_rail": ("rail", "https://download.geofabrik.de/russia/", ("gis_osm_railways_free", "gis_osm_transport_free")),
            "china_industrial_zones": ("industrial_zones", "https://download.geofabrik.de/asia/china/", ("gis_osm_landuse_a_free",)),
            "china_logistics_hubs": ("logistics_hubs", "https://download.geofabrik.de/asia/china/", ("gis_osm_transport_free", "gis_osm_transport_a_free")),
            "india_industrial_zones": ("industrial_zones", "https://download.geofabrik.de/asia/india/", ("gis_osm_landuse_a_free",)),
            "india_logistics_hubs": ("logistics_hubs", "https://download.geofabrik.de/asia/india/", ("gis_osm_transport_free", "gis_osm_transport_a_free")),
            "russia_industrial_zones": ("industrial_zones", "https://download.geofabrik.de/russia/", ("gis_osm_landuse_a_free",)),
            "russia_logistics_hubs": ("logistics_hubs", "https://download.geofabrik.de/russia/", ("gis_osm_transport_free", "gis_osm_transport_a_free")),
        }

        for pack_id, (family, url_prefix, layers) in expected.items():
            with self.subTest(pack_id=pack_id):
                spec = COUNTRY_SOURCE_SPECS[pack_id]
                source = spec.sources[0]
                self.assertEqual(spec.family, family)
                self.assertEqual(source.role, "osm_gpkg_subregion_extract")
                self.assertTrue(source.url.startswith(url_prefix), source.url)
                self.assertTrue(source.filename.endswith("-latest-free.gpkg.zip"))
                self.assertEqual(source.required_layers, layers)
                self.assertIn("ODbL 1.0", source.license)
                self.assertIn("carrier", source.filter_rule)

    def test_india_facility_source_contracts_use_reproducible_public_point_sources(self) -> None:
        energy = COUNTRY_SOURCE_SPECS["india_energy_facilities"]
        mineral = COUNTRY_SOURCE_SPECS["india_mineral_resources"]

        self.assertEqual(energy.sources[0].id, "wri_global_power_plant_database_india_csv")
        self.assertIn("database_IND.csv", energy.sources[0].filename)
        self.assertIn("CC BY 4.0", energy.sources[0].license)
        self.assertEqual(mineral.sources[0].id, "usgs_mrds_feature_service")
        self.assertEqual(mineral.sources[0].query_params.get("where"), "1=1")
        self.assertIn("carrier", mineral.sources[0].filter_rule)

    def test_china_russia_facility_source_contracts_use_public_cacheable_sources(self) -> None:
        for country_key, country_code in (("china", "CHN"), ("russia", "RUS")):
            with self.subTest(country=country_key):
                energy = COUNTRY_SOURCE_SPECS[f"{country_key}_energy_facilities"]
                mineral = COUNTRY_SOURCE_SPECS[f"{country_key}_mineral_resources"]

                self.assertEqual(energy.sources[0].id, "wri_global_power_plant_database_csv")
                self.assertEqual(energy.sources[0].filename, "global_power_plant_database.csv")
                self.assertIn("global_power_plant_database.csv", energy.sources[0].url)
                self.assertIn(country_code, energy.sources[0].filter_rule)
                self.assertIn("CC BY 4.0", energy.sources[0].license)
                self.assertEqual(mineral.sources[0].id, "usgs_mrds_feature_service")
                self.assertEqual(mineral.sources[0].query_params.get("where"), "1=1")
                self.assertIn("carrier", mineral.sources[0].filter_rule)
                self.assertIn("public data", mineral.sources[0].license)

    def test_uk_mineral_source_contract_uses_public_opendatani_geojson(self) -> None:
        spec = COUNTRY_SOURCE_SPECS["uk_mineral_resources"]
        source = spec.sources[0]

        self.assertEqual(spec.family, "mineral_resources")
        self.assertEqual(source.id, "gsni_northern_ireland_mineral_resources_json")
        self.assertEqual(source.role, "opendatani_geojson_zip")
        self.assertEqual(source.filename, "mineralresourcesjson.zip")
        self.assertIn("opendatani.gov.uk", source.url)
        self.assertIn("Open Government Licence", source.license)
        self.assertIn("Northern Ireland", source.notes)
        self.assertEqual(uk_mineral_group_from_resource("Coal and Lignite"), "energy_minerals")
        self.assertEqual(uk_mineral_group_from_resource("Silica Sand"), "industrial_minerals")
        self.assertEqual(uk_mineral_group_from_resource("Sand and Gravel"), "construction_materials")

    def test_uk_mineral_builder_scans_nested_geojson_members(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            extract_dir = Path(temp_dir)
            nested_json = extract_dir / "nested" / "mineralresources.json"
            hidden_json = extract_dir / ".extract-complete.json"
            nested_json.parent.mkdir(parents=True)
            nested_json.write_text("{}", encoding="utf-8")
            hidden_json.write_text("{}", encoding="utf-8")

            paths = iter_uk_mineral_resource_json_paths(extract_dir)

        self.assertEqual(paths, [nested_json])

    def test_osm_hstore_tag_parser_reads_gdal_default_other_tags(self) -> None:
        tags = parse_osm_hstore_tags('"railway"=>"station","service"=>"yard","name:en"=>"Central"')

        self.assertEqual(tags["railway"], "station")
        self.assertEqual(tags["service"], "yard")
        self.assertEqual(tags["name:en"], "Central")

    def test_osm_gpkg_road_builder_filters_and_writes_standard_pack_keys(self) -> None:
        line_source = gpd.GeoDataFrame(
            [
                {
                    "osm_id": "1",
                    "name": "M1",
                    "fclass": "motorway",
                    "ref": "M1",
                    "geometry": LineString([(0, 0), (1, 1)]),
                },
                {
                    "osm_id": "2",
                    "name": "Farm track",
                    "fclass": "track",
                    "ref": "",
                    "geometry": LineString([(0, 1), (1, 2)]),
                },
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        captured: dict = {}

        def fake_write_pack(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

        with mock.patch("tools.build_transport_country_real_packs.geofabrik_gpkg_paths", return_value=[("geofabrik_gpkg_fixture", Path("fixture.gpkg"))]):
            with mock.patch("tools.build_transport_country_real_packs.read_geofabrik_gpkg_layer", return_value=line_source):
                with mock.patch("tools.build_transport_country_real_packs.clip_to_carrier", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                    with mock.patch("tools.build_transport_country_real_packs.filter_lines_to_carrier_or_empty", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                        with mock.patch("tools.build_transport_country_real_packs.source_recipe_for", return_value=({}, {})):
                            with mock.patch("tools.build_transport_country_real_packs.write_pack", side_effect=fake_write_pack):
                                build_osm_gpkg_road_pack("china_road", "china", full_limit=10, preview_limit=10)

        preview = captured["args"][3]
        full = captured["args"][4]
        self.assertEqual(captured["args"][:3], ("china_road", "road", "line"))
        self.assertEqual(set(preview), {"roads", "road_labels"})
        self.assertEqual(set(full), {"roads", "road_labels"})
        self.assertEqual(full["roads"]["road_class"].tolist(), ["motorway"])
        self.assertEqual(preview["roads"]["ref"].tolist(), ["M1"])

    def test_osm_gpkg_rail_builder_builds_station_sidecar(self) -> None:
        line_source = gpd.GeoDataFrame(
            [
                {
                    "osm_id": "10",
                    "name": "Main Line",
                    "fclass": "rail",
                    "geometry": LineString([(0, 0), (1, 1)]),
                },
                {
                    "osm_id": "11",
                    "name": "Subway",
                    "fclass": "subway",
                    "geometry": LineString([(0, 1), (1, 2)]),
                },
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        station_source = gpd.GeoDataFrame(
            [
                {
                    "osm_id": "20",
                    "name": "Central",
                    "fclass": "railway_station",
                    "geometry": Point(0.5, 0.5),
                }
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        captured: dict = {}

        def fake_read(_path, layer, columns, **_kwargs):
            return line_source if layer == "gis_osm_railways_free" else station_source

        def fake_write_pack(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

        with mock.patch("tools.build_transport_country_real_packs.geofabrik_gpkg_paths", return_value=[("geofabrik_gpkg_fixture", Path("fixture.gpkg"))]):
            with mock.patch("tools.build_transport_country_real_packs.read_geofabrik_gpkg_layer", side_effect=fake_read):
                with mock.patch("tools.build_transport_country_real_packs.clip_to_carrier", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                    with mock.patch("tools.build_transport_country_real_packs.filter_lines_to_carrier_or_empty", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                        with mock.patch("tools.build_transport_country_real_packs.source_recipe_for", return_value=({}, {})):
                            with mock.patch("tools.build_transport_country_real_packs.write_pack", side_effect=fake_write_pack):
                                build_osm_gpkg_rail_pack("russia_rail", "russia", full_limit=10, preview_limit=10, station_limit=10)

        preview = captured["args"][3]
        full = captured["args"][4]
        self.assertEqual(captured["args"][:3], ("russia_rail", "rail", "line"))
        self.assertEqual(set(preview), {"railways", "rail_stations_major"})
        self.assertEqual(set(full), {"railways", "rail_stations_major"})
        self.assertEqual(len(full["railways"]), 2)
        self.assertEqual(preview["railways"]["name"].tolist(), ["Main Line", "Subway"])
        self.assertEqual(full["rail_stations_major"]["name"].tolist(), ["Central"])

    def test_osm_gpkg_industrial_builder_writes_frontend_visible_point_fields(self) -> None:
        industrial_source = gpd.GeoDataFrame(
            [
                {
                    "osm_id": "30",
                    "name": "Foundry Estate",
                    "fclass": "industrial",
                    "geometry": Polygon([(0, 0), (2, 0), (2, 1), (0, 1), (0, 0)]),
                },
                {
                    "osm_id": "31",
                    "name": "Housing",
                    "fclass": "residential",
                    "geometry": Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]),
                },
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        captured: dict = {}

        def fake_write_pack(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

        with mock.patch("tools.build_transport_country_real_packs.geofabrik_gpkg_paths", return_value=[("geofabrik_gpkg_fixture", Path("fixture.gpkg"))]):
            with mock.patch("tools.build_transport_country_real_packs.read_geofabrik_gpkg_layer", return_value=industrial_source):
                with mock.patch("tools.build_transport_country_real_packs.clip_to_carrier_or_empty", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                    with mock.patch("tools.build_transport_country_real_packs.source_recipe_for", return_value=({}, {})):
                        with mock.patch("tools.build_transport_country_real_packs.write_pack", side_effect=fake_write_pack):
                            build_osm_gpkg_industrial_zone_centers_pack("india_industrial_zones", "india", full_limit=10, preview_limit=10)

        preview = captured["args"][3]
        full = captured["args"][4]
        self.assertEqual(captured["args"][:3], ("india_industrial_zones", "industrial_zones", "point"))
        self.assertEqual(set(preview), {"industrial_zones"})
        self.assertEqual(set(full), {"industrial_zones"})
        row = full["industrial_zones"].iloc[0]
        self.assertEqual(row["site_class"], "industrial_landuse")
        self.assertEqual(row["coastal_inland_label"], "inland")
        self.assertEqual(row["source_fclass"], "industrial")

    def test_osm_gpkg_logistics_builder_maps_terminal_classes_to_existing_hub_types(self) -> None:
        point_source = gpd.GeoDataFrame(
            [
                {"osm_id": "40", "name": "Cargo Airport", "fclass": "airport", "geometry": Point(0, 0)},
                {"osm_id": "41", "name": "Main Station", "fclass": "railway_station", "geometry": Point(1, 1)},
                {"osm_id": "42", "name": "Bus Station", "fclass": "bus_station", "geometry": Point(2, 2)},
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        area_source = gpd.GeoDataFrame(
            [
                {
                    "osm_id": "50",
                    "name": "Ferry Port",
                    "fclass": "ferry_terminal",
                    "geometry": Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]),
                }
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )
        captured: dict = {}

        def fake_read(_path, layer, columns, **_kwargs):
            return area_source if layer == "gis_osm_transport_a_free" else point_source

        def fake_write_pack(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

        with mock.patch("tools.build_transport_country_real_packs.geofabrik_gpkg_paths", return_value=[("geofabrik_gpkg_fixture", Path("fixture.gpkg"))]):
            with mock.patch("tools.build_transport_country_real_packs.read_geofabrik_gpkg_layer", side_effect=fake_read):
                with mock.patch("tools.build_transport_country_real_packs.clip_to_carrier_or_empty", side_effect=lambda gdf, *_args, **_kwargs: gdf):
                    with mock.patch("tools.build_transport_country_real_packs.source_recipe_for", return_value=({}, {})):
                        with mock.patch("tools.build_transport_country_real_packs.write_pack", side_effect=fake_write_pack):
                            build_osm_gpkg_logistics_hub_pack("india_logistics_hubs", "india", full_limit=10, preview_limit=10)

        full = captured["args"][4]["logistics_hubs"]
        self.assertEqual(captured["args"][:3], ("india_logistics_hubs", "logistics_hubs", "point"))
        self.assertEqual(set(full["hub_type"]), {"air_cargo_terminal", "rail_cargo_station", "truck_terminal"})
        self.assertNotIn("bus_station", set(full["source_fclass"]))

    def test_bdcarto_member_extract_marker_is_bound_to_archive_signature(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            archive = root / "source.7z"
            output_dir = root / "out"
            archive.write_bytes(b"first-source")
            output_dir.mkdir()
            (output_dir / "troncon_de_route.gpkg").write_bytes(b"stale")
            (output_dir / "troncon_de_route.gpkg.extract-complete").write_text("{}\n", encoding="utf-8")
            calls: list[list[str]] = []

            def fake_run(args, **kwargs):
                calls.append([str(arg) for arg in args])
                (output_dir / "troncon_de_route.gpkg").write_bytes(b"fresh")
                return mock.Mock(returncode=0, stdout="", stderr="")

            with mock.patch("tools.build_transport_country_real_packs.find_7z_executable", return_value="7z"):
                with mock.patch("tools.build_transport_country_real_packs.subprocess.run", side_effect=fake_run):
                    result = extract_7z_member_flat(archive, output_dir, "troncon_de_route.gpkg")

            self.assertEqual(result.read_bytes(), b"fresh")
            self.assertTrue(calls)
            marker = json.loads((output_dir / "troncon_de_route.gpkg.extract-complete").read_text(encoding="utf-8"))
            self.assertEqual(marker["archive"]["size_bytes"], len(b"first-source"))
            self.assertEqual(marker["member_filename"], "troncon_de_route.gpkg")

    def test_arcgis_downloader_uses_count_instead_of_short_page_as_stop_signal(self) -> None:
        class FakeResponse:
            def __init__(self, payload: dict):
                self._payload = payload

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return self._payload

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "arcgis.geojson"
            calls: list[dict] = []
            payloads = [
                {"count": 2},
                {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"id": 1}, "geometry": None}]},
                {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"id": 2}, "geometry": None}]},
            ]

            def fake_get(*args, **kwargs):
                calls.append(kwargs.get("params") or {})
                return FakeResponse(payloads.pop(0))

            with mock.patch.object(source_downloader.requests, "get", side_effect=fake_get):
                result = source_downloader.download_arcgis_geojson(
                    "https://example.test/FeatureServer/0",
                    target,
                    {"where": "1=1", "outFields": "id", "returnGeometry": "true", "f": "geojson", "resultRecordCount": "2"},
                )

            payload = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(result["feature_count"], 2)
            self.assertEqual(len(payload["features"]), 2)
            self.assertEqual([call.get("resultOffset") for call in calls[1:]], ["0", "1"])

    def test_wfs_downloader_uses_number_matched_instead_of_short_page_as_stop_signal(self) -> None:
        class FakeResponse:
            def __init__(self, payload: dict):
                self._payload = payload

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return self._payload

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "wfs.geojson"
            calls: list[dict] = []
            payloads = [
                {"type": "FeatureCollection", "numberMatched": 2, "features": [{"type": "Feature", "properties": {"id": 1}, "geometry": None}]},
                {"type": "FeatureCollection", "numberMatched": 2, "features": [{"type": "Feature", "properties": {"id": 2}, "geometry": None}]},
            ]

            def fake_get(*args, **kwargs):
                calls.append(kwargs.get("params") or {})
                return FakeResponse(payloads.pop(0))

            with mock.patch.object(source_downloader.requests, "get", side_effect=fake_get):
                result = source_downloader.download_wfs_geojson(
                    "https://example.test/wfs",
                    target,
                    {"SERVICE": "WFS", "REQUEST": "GetFeature", "COUNT": "2"},
                )

            payload = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(result["feature_count"], 2)
            self.assertEqual(len(payload["features"]), 2)
            self.assertEqual([call.get("STARTINDEX") for call in calls], ["0", "1"])

    def test_wfs_downloader_rejects_repeated_pages(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return {
                    "type": "FeatureCollection",
                    "numberMatched": 2,
                    "features": [{"type": "Feature", "properties": {"id": 1}, "geometry": None}],
                }

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "wfs.geojson"
            with mock.patch.object(source_downloader.requests, "get", return_value=FakeResponse()):
                with self.assertRaisesRegex(RuntimeError, "repeated a page"):
                    source_downloader.download_wfs_geojson(
                        "https://example.test/wfs",
                        target,
                        {"SERVICE": "WFS", "REQUEST": "GetFeature", "COUNT": "2"},
                    )

    def test_india_airport_preview_uses_audited_traffic_rank_source(self) -> None:
        audit = json.loads((TRANSPORT_ROOT / "india_airport" / "build_audit.json").read_text(encoding="utf-8"))
        recipe = json.loads((TRANSPORT_ROOT / "india_airport" / "source_recipe.manual.json").read_text(encoding="utf-8"))
        rank_source = audit.get("traffic_rank_source") or {}

        self.assertGreater(audit.get("source_row_count", {}).get("aai_traffic_rank_rows", 0), 0)
        self.assertEqual(rank_source.get("rows"), audit.get("source_row_count", {}).get("aai_traffic_rank_rows"))
        self.assertIn("aai_air_traffic_report_june_2025_manual_rank", recipe.get("source_signature") or {})
        rank_path = PROJECT_ROOT / rank_source.get("path", "")
        rank_payload = rank_path.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
        rank_sha = hashlib.sha256(rank_payload).hexdigest()
        rank_signature = recipe.get("source_signature", {}).get("aai_air_traffic_report_june_2025_manual_rank", {})
        self.assertEqual(rank_source.get("rank_file_signature", {}).get("sha256"), rank_sha)
        self.assertEqual(rank_signature.get("sha256"), rank_sha)
        self.assertEqual(
            rank_source.get("source_pdf_sha256"),
            recipe.get("source_signature", {}).get("aai_air_traffic_report_june_2025", {}).get("sha256"),
        )

    def test_source_downloader_resumes_existing_partial_file(self) -> None:
        class FakeResponse:
            status_code = 206
            headers = {"Content-Range": "bytes 5-9/10", "Content-Length": "5"}

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def iter_content(self, chunk_size: int):
                yield b"world"

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "payload.bin"
            target.with_suffix(".bin.part").write_bytes(b"hello")
            calls: list[dict] = []

            def fake_get(*args, **kwargs):
                calls.append(kwargs)
                return FakeResponse()

            with mock.patch.object(source_downloader.requests, "get", side_effect=fake_get):
                result = source_downloader.download("https://example.test/payload.bin", target)

            self.assertEqual(target.read_bytes(), b"helloworld")
        self.assertEqual(result["size_bytes"], 10)
        self.assertEqual(calls[0]["headers"]["Range"], "bytes=5-")

    def test_source_downloader_writes_overpass_json_cache(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return {"elements": [{"type": "node", "id": 1, "lat": 51.0, "lon": -1.0, "tags": {"railway": "yard"}}]}

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "overpass.json"
            calls: list[dict] = []

            def fake_post(*args, **kwargs):
                calls.append(kwargs)
                return FakeResponse()

            with mock.patch.object(source_downloader.requests, "post", side_effect=fake_post):
                result = source_downloader.download_overpass_json("https://example.test/interpreter", target, {"data": "[out:json];node(1);out;"})

            payload = json.loads(target.read_text(encoding="utf-8"))

        self.assertEqual(result["element_count"], 1)
        self.assertEqual(len(payload["elements"]), 1)
        self.assertEqual(calls[0]["data"]["data"], "[out:json];node(1);out;")

    def test_source_downloader_rejects_overpass_remarks(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return {"remark": "runtime error", "elements": [{"type": "node", "id": 1}]}

        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "overpass.json"
            with mock.patch.object(source_downloader.requests, "post", return_value=FakeResponse()):
                with self.assertRaisesRegex(RuntimeError, "Overpass query returned remark"):
                    source_downloader.download_overpass_json("https://example.test/interpreter", target, {"data": "[out:json];node(1);out;"})

            self.assertFalse(target.exists())

    def test_usa_energy_pack_preserves_eia_generator_capacity_join(self) -> None:
        payload = json.loads((TRANSPORT_ROOT / "usa_energy_facilities" / "energy_facilities.preview.geojson").read_text(encoding="utf-8"))
        properties = [feature.get("properties") or {} for feature in payload.get("features") or []]

        self.assertTrue(properties)
        self.assertGreater(max(float(row.get("capacity_mw") or 0) for row in properties), 1000)
        self.assertFalse([row.get("id") for row in properties[:50] if row.get("facility_subtype") == "unknown"])
        self.assertFalse([row.get("id") for row in properties[:50] if not row.get("generator_status_codes")])

    def test_usa_industrial_pack_uses_frontend_visible_default_filters(self) -> None:
        payload = json.loads((TRANSPORT_ROOT / "usa_industrial_zones" / "industrial_zones.preview.geojson").read_text(encoding="utf-8"))
        properties = [feature.get("properties") or {} for feature in payload.get("features") or []]

        self.assertTrue(properties)
        self.assertEqual({row.get("site_class") for row in properties}, {"industrial_landuse"})
        self.assertEqual({row.get("coastal_inland_label") for row in properties}, {"inland"})

    def test_uk_industrial_pack_uses_osm_center_points_with_frontend_filters(self) -> None:
        payload = json.loads((TRANSPORT_ROOT / "uk_industrial_zones" / "industrial_zones.preview.geojson").read_text(encoding="utf-8"))
        features = payload.get("features") or []
        properties = [feature.get("properties") or {} for feature in features]

        self.assertTrue(features)
        self.assertEqual({feature.get("geometry", {}).get("type") for feature in features}, {"Point"})
        self.assertEqual({row.get("site_class") for row in properties}, {"industrial_landuse"})
        self.assertEqual({row.get("coastal_inland_label") for row in properties}, {"inland"})
        self.assertEqual({row.get("source") for row in properties}, {"OpenStreetMap landuse=industrial center"})

    def test_logistics_packs_use_frontend_visible_default_filters(self) -> None:
        allowed_hub_types = {"air_cargo_terminal", "rail_cargo_station", "truck_terminal"}
        allowed_operator_classes = {"public", "private", "other"}
        for pack_id in ("usa_logistics_hubs", "uk_logistics_hubs", "france_logistics_hubs"):
            payload_path = TRANSPORT_ROOT / pack_id / "logistics_hubs.preview.geojson"
            if not payload_path.exists():
                self.skipTest(f"{pack_id} pack has not been built yet")
            payload = json.loads(payload_path.read_text(encoding="utf-8"))
            properties = [feature.get("properties") or {} for feature in payload.get("features") or []]

            self.assertTrue(properties)
            self.assertTrue({row.get("hub_type") for row in properties}.issubset(allowed_hub_types))
            self.assertTrue({row.get("operator_classification") for row in properties}.issubset(allowed_operator_classes))

    def test_uk_overpass_logistics_mapping_uses_stable_preview_values(self) -> None:
        self.assertEqual(uk_overpass_logistics_hub_type({"railway": "yard"}), "rail_cargo_station")
        self.assertEqual(uk_overpass_logistics_hub_type({"railway": "container_terminal"}), "rail_cargo_station")
        self.assertEqual(uk_overpass_logistics_hub_type({"amenity": "loading_dock"}), "truck_terminal")

    def test_france_ite_logistics_mapping_uses_stable_preview_values(self) -> None:
        active = pd.Series({"Utilisation_ITE": "Oui", "Circulation_récente": "", "Convention_active": "", "Etat_ITE": "Bon"})
        inactive = pd.Series({"Utilisation_ITE": "Non", "Circulation_récente": "Non", "Convention_active": "Non", "Etat_ITE": "Inutilisable"})
        public = pd.Series({"Structure_proprietaire_voie_d'approche": "SNCF Réseau", "Raison_sociale": ""})
        private = pd.Series({"Structure_proprietaire_voie_d'approche": "", "Raison_sociale": "Solvay", "Code_SIRET": "123"})

        self.assertEqual(france_ite_status_category(active), "active")
        self.assertEqual(france_ite_status_category(inactive), "inactive")
        self.assertEqual(france_ite_operator_classification(public), "public")
        self.assertEqual(france_ite_operator_classification(private), "private")

    def test_energy_subtype_normalization_keeps_common_country_sources_visible(self) -> None:
        samples = {
            "Photovoltaïque": "solar",
            "Offshore Wind": "wind",
            "Batteries": "storage",
            "Hydrogen": "storage",
            "Biomass (co-firing)": "biomass",
            "Hydraulique": "hydro",
            "Combined Cycle Gas": "thermal",
        }

        for source, expected in samples.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_energy_subtype(source), expected)

    def test_france_industrial_zone_filter_accepts_bdtopo_activity_values(self) -> None:
        rows = [
            pd.Series({"categorie": "Industriel et commercial", "nature": "Zone industrielle", "nature_detaillee": "Zone d'activités"}),
            pd.Series({"categorie": "Industriel et commercial", "nature": "Divers commercial", "nature_detaillee": "Centre commercial"}),
            pd.Series({"categorie": "Sport", "nature": "Stade", "nature_detaillee": ""}),
        ]

        self.assertEqual([is_france_industrial_zone(row) for row in rows], [True, True, False])

    def test_france_mineral_filter_keeps_mining_titles_only(self) -> None:
        rows = [
            pd.Series({"domaine": "Minéraux et métaux", "type": "Concession"}),
            pd.Series({"domaine": "Carrières", "type": "Autorisation"}),
            pd.Series({"domaine": "Géothermie", "type": "Permis"}),
            pd.Series({"domaine": "Hydrocarbures liquides ou gazeux", "type": "Permis"}),
        ]

        self.assertEqual([should_keep_camino_mineral_title(row) for row in rows], [True, True, False, False])

    def test_france_industrial_pack_uses_frontend_visible_default_filters(self) -> None:
        payload_path = TRANSPORT_ROOT / "france_industrial_zones" / "industrial_zones.preview.geojson"
        if not payload_path.exists():
            self.skipTest("france_industrial_zones pack has not been built yet")
        payload = json.loads(payload_path.read_text(encoding="utf-8"))
        properties = [feature.get("properties") or {} for feature in payload.get("features") or []]

        self.assertTrue(properties)
        self.assertEqual({row.get("site_class") for row in properties}, {"industrial_landuse"})
        self.assertEqual({row.get("coastal_inland_label") for row in properties}, {"inland"})

    def test_new_energy_packs_use_frontend_visible_subtypes(self) -> None:
        allowed = {"solar", "wind", "hydro", "storage", "biomass", "nuclear", "geothermal", "thermal", "other"}
        for pack_id in ("uk_energy_facilities", "france_energy_facilities"):
            payload_path = TRANSPORT_ROOT / pack_id / "energy_facilities.preview.geojson"
            if not payload_path.exists():
                self.skipTest(f"{pack_id} pack has not been built yet")
            payload = json.loads(payload_path.read_text(encoding="utf-8"))
            properties = [feature.get("properties") or {} for feature in payload.get("features") or []]

            self.assertTrue(properties)
            self.assertTrue({row.get("facility_subtype") for row in properties}.issubset(allowed))


if __name__ == "__main__":
    unittest.main()
