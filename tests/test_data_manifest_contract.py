from __future__ import annotations

import hashlib
import json
import struct
import unittest
from pathlib import Path

from map_builder.runtime_asset_registry import _validate_runtime_asset_registry
from tools.build_data_catalog import validate_catalog_entry_contract


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_MANIFEST = REPO_ROOT / "data" / "manifest.json"
DATA_LOADER = REPO_ROOT / "js" / "core" / "data_loader.js"
RUNTIME_ASSET_REGISTRY_SOURCE = REPO_ROOT / "data" / "runtime_asset_registry.json"
RUNTIME_ASSET_REGISTRY_JS = REPO_ROOT / "js" / "core" / "runtime_asset_registry.js"
HISTORICAL_1930_CITY_LIGHTS_ASSET = REPO_ROOT / "js" / "core" / "city_lights_historical_1930_asset.js"
HISTORICAL_1930_CITY_LIGHTS_ENTRIES = REPO_ROOT / "data" / "city_lights" / "historical_1930_entries.json"
HGO_RUNTIME_SEED = REPO_ROOT / "data" / "hgo_runtime" / "seed.json"
HGO_RUNTIME_RASTER = REPO_ROOT / "data" / "hgo_runtime" / "provinces.bmp"


def _resolve_manifest_output_path(relative_path: str) -> Path:
    if relative_path.startswith("js/"):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


def _resolve_runtime_asset_path(relative_path: str) -> Path:
    if relative_path.startswith(("data/", "js/")):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


def _read_bmp_rgb_keys(path: Path) -> set[int]:
    data = path.read_bytes()
    if data[:2] != b"BM":
        raise AssertionError(f"{path} is not a BMP file")
    pixel_offset = struct.unpack_from("<I", data, 10)[0]
    width = struct.unpack_from("<i", data, 18)[0]
    height_raw = struct.unpack_from("<i", data, 22)[0]
    bits_per_pixel = struct.unpack_from("<H", data, 28)[0]
    compression = struct.unpack_from("<I", data, 30)[0]
    if width <= 0 or height_raw == 0 or bits_per_pixel != 24 or compression != 0:
        raise AssertionError(f"{path} must be an uncompressed RGB24 BMP")
    height = abs(height_raw)
    row_stride = ((width * 3 + 3) // 4) * 4
    rgb_keys: set[int] = set()
    for row_index in range(height):
        row_start = pixel_offset + row_index * row_stride
        row = data[row_start:row_start + width * 3]
        for pixel_index in range(0, len(row), 3):
            blue, green, red = row[pixel_index], row[pixel_index + 1], row[pixel_index + 2]
            rgb_keys.add((red << 16) | (green << 8) | blue)
    return rgb_keys


class DataManifestContractTest(unittest.TestCase):
    def test_manifest_output_hashes_match_checked_in_artifacts(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        mismatches: list[str] = []

        for relative_path, metadata in manifest["outputs"].items():
            output_path = _resolve_manifest_output_path(relative_path)
            if not output_path.is_file():
                mismatches.append(f"{relative_path}: missing")
                continue
            output_bytes = output_path.read_bytes()
            actual_size = output_path.stat().st_size
            actual_sha = hashlib.sha256(output_bytes).hexdigest()
            if metadata.get("size_bytes") != actual_size or metadata.get("sha256") != actual_sha:
                mismatches.append(f"{relative_path}: size/hash drift")

        self.assertEqual(mismatches, [])

    def test_runtime_asset_registry_manifest_hash_matches_source_file(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        metadata = manifest.get("outputs", {}).get("runtime_asset_registry.json") or {}
        output_bytes = RUNTIME_ASSET_REGISTRY_SOURCE.read_bytes()

        self.assertEqual(metadata.get("size_bytes"), RUNTIME_ASSET_REGISTRY_SOURCE.stat().st_size)
        self.assertEqual(metadata.get("sha256"), hashlib.sha256(output_bytes).hexdigest())

    def test_runtime_asset_registry_declares_phase1_assets(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        registry = manifest.get("runtime_asset_registry") or {}
        source_registry = json.loads(RUNTIME_ASSET_REGISTRY_SOURCE.read_text(encoding="utf-8"))
        assets = source_registry.get("assets") or {}
        mismatches: list[str] = []
        loader_source = DATA_LOADER.read_text(encoding="utf-8")
        registry_source = RUNTIME_ASSET_REGISTRY_JS.read_text(encoding="utf-8")

        self.assertEqual(registry, source_registry)
        self.assertIn('../../data/runtime_asset_registry.json', registry_source)
        self.assertIn('resolveDataAssetUrl', registry_source)
        self.assertIn('resolveScenarioRegistryUrl', registry_source)
        self.assertIn('resolveCountryFeaturePoliciesUrl', registry_source)
        self.assertIn('resolveTransportManifestUrl', registry_source)
        self.assertIn('./runtime_asset_registry.js', loader_source)
        self.assertEqual(
            assets.get("city_lights:historical_1930:entries", {}).get("url"),
            "data/city_lights/historical_1930_entries.json",
        )
        self.assertEqual(
            source_registry.get("city_lights", {}).get("historical_1930", {}).get("entries_key"),
            "city_lights:historical_1930:entries",
        )
        self.assertEqual(
            assets.get("country_feature_policies", {}).get("url"),
            "data/country_feature_policies.json",
        )
        self.assertEqual(source_registry.get("country_feature_policies_key"), "country_feature_policies")
        self.assertEqual(assets.get("world_cities", {}).get("url"), "data/world_cities.geojson")
        self.assertEqual(assets.get("context_layer:physical", {}).get("url"), "data/europe_physical.geojson")
        self.assertEqual(assets.get("transport_catalog:road", {}).get("url"), "data/transport_layers/global_road/catalog.json")
        self.assertEqual(assets.get("hgo_flags_png_manifest", {}).get("url"), "data/hgo_catalogs/hgo_flags.png_manifest.json")
        self.assertEqual(assets.get("hgo_identity_aliases", {}).get("url"), "data/hgo_catalogs/hgo_identity_aliases.json")
        self.assertEqual(assets.get("hgo_runtime_manifest", {}).get("url"), "data/hgo_runtime/manifest.json")
        self.assertEqual(assets.get("hgo_runtime_seed", {}).get("url"), "data/hgo_runtime/seed.json")
        self.assertEqual(assets.get("hgo_runtime_provinces_bmp", {}).get("url"), "data/hgo_runtime/provinces.bmp")
        self.assertNotIn("hgo_flags_index", assets)
        self.assertIn('resolveDataAssetUrl("world_cities")', loader_source)
        self.assertIn('resolveDataAssetUrl("context_layer:physical")', loader_source)
        self.assertIn('resolveDataAssetUrl("transport_catalog:road")', loader_source)
        self.assertNotIn("topology:detail:highres", assets)
        self.assertNotIn("topology:detail:legacy_bak", assets)
        self.assertNotIn("topology:detail:na_v1", assets)
        self.assertNotIn("topology:detail:na_v2", assets)
        self.assertIn('highres: "data/europe_topology.highres.json"', loader_source)
        self.assertIn('legacy_bak: "data/europe_topology.json.bak"', loader_source)
        self.assertIn('na_v1: "data/europe_topology.na_v1.json"', loader_source)
        self.assertIn('na_v2: "data/europe_topology.na_v2.json"', loader_source)
        self.assertNotIn('const GLOBAL_ROAD_CATALOG_URL = "data/transport_layers/global_road/catalog.json";', loader_source)
        self.assertNotIn('const PALETTE_REGISTRY_URL = "data/palettes/index.json";', loader_source)

        for asset_key, metadata in assets.items():
            expected_url = metadata.get("url")
            actual_url = registry.get("assets", {}).get(asset_key, {}).get("url")
            if actual_url != expected_url:
                mismatches.append(f"{asset_key}: expected {expected_url}, got {actual_url}")
                continue
            if not _resolve_runtime_asset_path(expected_url).is_file():
                mismatches.append(f"{asset_key}: target missing at {expected_url}")

        self.assertEqual(mismatches, [])

    def test_runtime_asset_registry_schema_rejects_missing_assets(self) -> None:
        with self.assertRaises(ValueError) as context:
            _validate_runtime_asset_registry(
                {
                    "scenario_registry_key": "scenario_registry",
                    "transport_manifest_keys": {},
                }
            )

        self.assertIn("runtime_asset_registry", str(context.exception))
        self.assertIn("assets", str(context.exception))

    def test_runtime_asset_registry_schema_rejects_assets_type_error(self) -> None:
        with self.assertRaises(ValueError) as context:
            _validate_runtime_asset_registry(
                {
                    "assets": [],
                    "scenario_registry_key": "scenario_registry",
                    "transport_manifest_keys": {},
                }
            )

        self.assertIn("$.assets", str(context.exception))

    def test_runtime_asset_registry_business_rules_keep_cross_field_reference_errors(self) -> None:
        with self.assertRaises(ValueError) as context:
            _validate_runtime_asset_registry(
                {
                    "assets": {
                        "scenario_registry": {"url": "data/scenarios/index.json"},
                    },
                    "scenario_registry_key": "scenario_registry",
                    "transport_manifest_keys": {"road": "missing_asset"},
                }
            )

        self.assertIn(
            "runtime_asset_registry.transport_manifest_keys.road must reference an existing asset",
            str(context.exception),
        )

    def test_catalog_entry_contract_reports_missing_required_and_type_errors(self) -> None:
        missing_errors = validate_catalog_entry_contract(
            {
                "key": "runtime_asset_registry",
                "url": "data/runtime_asset_registry.json",
                "role": "runtime_asset",
                "format": "json",
                "owner": "test",
                "cachePolicy": "default",
                "readMode": "json",
            },
            source_label="catalog entry test",
        )
        self.assertTrue(any("schemaRef" in error for error in missing_errors), missing_errors)

        empty_errors = validate_catalog_entry_contract(
            {
                "key": "runtime_asset_registry",
                "url": "data/runtime_asset_registry.json",
                "role": "runtime_asset",
                "format": "json",
                "schemaRef": "",
                "owner": "test",
                "cachePolicy": "default",
                "readMode": "json",
            },
            source_label="catalog entry test",
        )
        self.assertTrue(any("$.schemaRef" in error for error in empty_errors), empty_errors)

        type_errors = validate_catalog_entry_contract(
            {
                "key": "runtime_asset_registry",
                "url": "data/runtime_asset_registry.json",
                "role": "runtime_asset",
                "format": "json",
                "schemaRef": "schema://json/object/v1",
                "owner": "test",
                "cachePolicy": "default",
                "readMode": "json",
                "aliases": "runtime_asset_registry",
            },
            source_label="catalog entry test",
        )
        self.assertTrue(any("$.aliases" in error for error in type_errors), type_errors)

    def test_manifest_output_hashes_cover_hgo_runtime_assets(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        outputs = manifest.get("outputs") or {}
        expected = {
            "hgo_runtime/manifest.json": "hgo_runtime_manifest",
            "hgo_runtime/seed.json": "hgo_runtime_seed",
            "hgo_runtime/provinces.bmp": "hgo_runtime_raster",
        }

        for relative_path, role in expected.items():
            with self.subTest(relative_path=relative_path):
                metadata = outputs.get(relative_path) or {}
                output_path = REPO_ROOT / "data" / relative_path
                self.assertTrue(output_path.is_file())
                self.assertEqual(metadata.get("role"), role)
                self.assertEqual(metadata.get("owner"), "tools.build_hgo_runtime_assets")
                self.assertEqual(metadata.get("size_bytes"), output_path.stat().st_size)
                self.assertEqual(metadata.get("sha256"), hashlib.sha256(output_path.read_bytes()).hexdigest())
                self.assertTrue(str(metadata.get("schema_ref") or "").startswith("schema://"))

        raster_metadata = outputs["hgo_runtime/provinces.bmp"]
        self.assertEqual(raster_metadata.get("width"), 5120)
        self.assertEqual(raster_metadata.get("height"), 2560)
        self.assertEqual(raster_metadata.get("bits_per_pixel"), 24)
        self.assertEqual(raster_metadata.get("compression"), 0)

    def test_hgo_runtime_raster_colors_resolve_against_seed(self) -> None:
        seed = json.loads(HGO_RUNTIME_SEED.read_text(encoding="utf-8"))
        seed_rgb_keys = {
            int(province["rgb_key"])
            for province in (seed.get("provinces") or {}).values()
            if "rgb_key" in province
        }
        raster_rgb_keys = _read_bmp_rgb_keys(HGO_RUNTIME_RASTER)
        unresolved_rgb_keys = sorted(raster_rgb_keys - seed_rgb_keys)

        self.assertGreater(len(raster_rgb_keys), 20_000)
        self.assertEqual(unresolved_rgb_keys, [])

    def test_historical_1930_city_lights_source_refs_are_repo_relative(self) -> None:
        asset_source = HISTORICAL_1930_CITY_LIGHTS_ASSET.read_text(encoding="utf-8")
        self.assertIn('sourceKey: "city_lights:historical_1930:source"', asset_source)
        self.assertIn('exclusionsKey: "city_lights:historical_1930:exclusions"', asset_source)
        self.assertIn('entriesKey: "city_lights:historical_1930:entries"', asset_source)
        self.assertIn('sourceRefParts: ["data", "world_cities.geojson"]', asset_source)
        self.assertIn('exclusionsRefParts: ["data", "historical_city_lights_1930_exclusions.json"]', asset_source)
        self.assertIn('entriesRefParts: ["data", "city_lights/historical_1930_entries.json"]', asset_source)
        self.assertIn('historical_1930_entries.json', asset_source)
        self.assertNotIn("population: 35676000", asset_source)
        self.assertNotIn("file:///", asset_source)
        self.assertNotIn("C:/", asset_source)

        entries_payload = json.loads(HISTORICAL_1930_CITY_LIGHTS_ENTRIES.read_text(encoding="utf-8"))
        self.assertEqual(entries_payload.get("asset_key"), "city_lights:historical_1930:entries")
        self.assertEqual(entries_payload.get("family_id"), "historical_1930")
        self.assertEqual(entries_payload.get("stats", {}).get("entryCount"), 1580)
        self.assertEqual(len(entries_payload.get("entries") or []), 1580)

    def test_topology_outputs_expose_schema_and_zoom_metadata(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        outputs = manifest.get("outputs") or {}
        expected = {
            "europe_topology.json": {
                "schema_ref": "schema://topology/political_bundle_v1",
                "simplification": "coarse_publish_v1",
                "target_zoom_range": [0.0, 1.7],
            },
            "europe_topology.na_v1.json": {
                "schema_ref": "schema://topology/detail_political_bundle_v1",
                "simplification": "detail_publish_legacy_v1",
                "target_zoom_range": [1.7, 20.0],
            },
            "europe_topology.na_v2.json": {
                "schema_ref": "schema://topology/detail_political_bundle_v2",
                "simplification": "detail_publish_v2",
                "target_zoom_range": [1.7, 20.0],
            },
            "europe_topology.runtime_political_v1.json": {
                "schema_ref": "schema://topology/runtime_political_v1",
                "simplification": "runtime_projection_v1",
                "target_zoom_range": [1.7, 20.0],
            },
            "global_physical_semantics.topo.json": {
                "schema_ref": "schema://topology/physical_semantics_v1",
                "simplification": "semantic_dissolve_v1",
                "target_zoom_range": [0.0, 20.0],
            },
            "global_contours.major.topo.json": {
                "schema_ref": "schema://topology/terrain_contours_major_v1",
                "simplification": "contour_major_publish_v1",
                "target_zoom_range": [0.0, 20.0],
            },
            "global_contours.minor.topo.json": {
                "schema_ref": "schema://topology/terrain_contours_minor_v1",
                "simplification": "contour_minor_publish_v1",
                "target_zoom_range": [0.0, 20.0],
            },
        }

        for relative_path, metadata in expected.items():
            self.assertEqual(outputs.get(relative_path, {}).get("schema_ref"), metadata["schema_ref"], relative_path)
            self.assertEqual(outputs.get(relative_path, {}).get("simplification"), metadata["simplification"], relative_path)
            self.assertEqual(outputs.get(relative_path, {}).get("target_zoom_range"), metadata["target_zoom_range"], relative_path)


if __name__ == "__main__":
    unittest.main()
