from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from tools.build_data_catalog import build_catalog_markdown, build_catalog_payload
from tools.data_health import SCENARIO_REGISTRY_URL, collect_health


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_JSON = REPO_ROOT / "data" / "CATALOG.json"
CATALOG_MD = REPO_ROOT / "data" / "CATALOG.md"
LANDING_INDEX = REPO_ROOT / "landing" / "index.html"
LANDING_APP = REPO_ROOT / "landing" / "app.js"
EXPECTED_SCHEMA_REF_COUNT = 23


class DataCatalogContractTest(unittest.TestCase):
    def _load_catalog(self) -> dict:
        return json.loads(CATALOG_JSON.read_text(encoding="utf-8"))

    def test_checked_in_catalog_matches_builder(self) -> None:
        checked_in_payload = self._load_catalog()
        checked_in_markdown = CATALOG_MD.read_text(encoding="utf-8")
        rebuilt_payload = build_catalog_payload()
        rebuilt_markdown = build_catalog_markdown(rebuilt_payload)

        self.assertEqual(checked_in_payload, rebuilt_payload)
        self.assertEqual(checked_in_markdown, rebuilt_markdown)

    def test_catalog_keeps_current_governance_counts_and_schema_surface(self) -> None:
        payload = self._load_catalog()
        entries = payload.get("entries") or []
        schema_counts = Counter(entry.get("schemaRef") for entry in entries)

        self.assertEqual(payload.get("counts", {}).get("entries"), len(entries))
        self.assertEqual(len(schema_counts), EXPECTED_SCHEMA_REF_COUNT)
        self.assertEqual(schema_counts["schema://transport/manifest/v1"], 138)
        self.assertEqual(schema_counts["schema://transport/build_audit/v1"], 130)
        self.assertEqual(schema_counts["schema://topojson/line_collection/roads_v1"], 94)
        self.assertEqual(schema_counts["schema://topojson/line_collection/railways_v1"], 66)
        self.assertIn("schema://transport/carrier_payload/v1", schema_counts)
        self.assertIn("schema://transport/provenance_payload/v1", schema_counts)
        self.assertEqual(schema_counts["schema://hgo/runtime_manifest/v1"], 1)
        self.assertEqual(schema_counts["schema://hgo/runtime_seed/v1"], 1)
        self.assertEqual(schema_counts["schema://bitmap/bmp_rgb24/v1"], 1)

    def test_landing_catalog_count_matches_checked_in_catalog(self) -> None:
        payload = self._load_catalog()
        expected_count = payload.get("counts", {}).get("entries")
        self.assertIsInstance(expected_count, int)
        english_copy = f"The checked-in catalog tracks {expected_count} assets"
        chinese_copy = f"入库目录跟踪 {expected_count} 个资产"

        landing_index = LANDING_INDEX.read_text(encoding="utf-8")
        landing_app = LANDING_APP.read_text(encoding="utf-8")

        self.assertIn(f'data-stat-value="{expected_count}"', landing_index)
        self.assertIn(english_copy, landing_index)
        self.assertIn(english_copy, landing_app)
        self.assertIn(chinese_copy, landing_app)

    def test_catalog_excludes_optional_cache_source_assets(self) -> None:
        payload = self._load_catalog()
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}

        self.assertIn("source:gb_chn_adm2", entries)
        self.assertNotIn("source:gb_bfa_adm1", entries)
        self.assertNotIn("source:gb_ukr_adm2", entries)
        self.assertNotIn("source:hgo_mod_2241701657", entries)

    def test_catalog_contains_hgo_tier_a_assets(self) -> None:
        payload = self._load_catalog()
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}

        expected = {
            "hgo_tier_a_catalog": ("data/hgo_catalogs/index.json", "hgo_tier_a_catalog", "tools.build_hgo_flag_index"),
            "hgo_place_names": ("data/hgo_catalogs/hgo_place_names.json", "hgo_place_names", "tools.build_hgo_name_catalog"),
            "manifest_output:hgo_catalogs/hgo_flags.index.json": (
                "data/hgo_catalogs/hgo_flags.index.json",
                "hgo_flags_index",
                "tools.build_hgo_flag_index",
            ),
            "hgo_flags_png_manifest": (
                "data/hgo_catalogs/hgo_flags.png_manifest.json",
                "hgo_flags_png_manifest",
                "tools.build_hgo_flag_png_catalog",
            ),
            "hgo_identity_aliases": (
                "data/hgo_catalogs/hgo_identity_aliases.json",
                "hgo_identity_aliases",
                "hgo_identity_aliases.manual_review",
            ),
        }
        self.assertNotIn("hgo_flags_index", entries)
        for key, (url, role, owner) in expected.items():
            self.assertIn(key, entries)
            self.assertEqual(entries[key]["url"], url)
            self.assertEqual(entries[key]["role"], role)
            self.assertEqual(entries[key]["format"], "json")
            self.assertEqual(entries[key]["readMode"], "json")
            self.assertEqual(entries[key]["schemaRef"], "schema://json/object/v1")
            self.assertEqual(entries[key]["owner"], owner)
            self.assertEqual(entries[key]["hashRef"], f"data/manifest.json::outputs::{url.removeprefix('data/')}::sha256")
            if not key.startswith("manifest_output:"):
                self.assertIn(f"manifest_output:{url.removeprefix('data/')}", entries[key].get("aliases") or [])

    def test_catalog_contains_hgo_independent_runtime_assets(self) -> None:
        payload = self._load_catalog()
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}
        expected = {
            "hgo_runtime_manifest": (
                "data/hgo_runtime/manifest.json",
                "hgo_runtime_manifest",
                "json",
                "json",
                "schema://hgo/runtime_manifest/v1",
            ),
            "hgo_runtime_seed": (
                "data/hgo_runtime/seed.json",
                "hgo_runtime_seed",
                "json",
                "json",
                "schema://hgo/runtime_seed/v1",
            ),
            "hgo_runtime_provinces_bmp": (
                "data/hgo_runtime/provinces.bmp",
                "hgo_runtime_raster",
                "bmp",
                "binary",
                "schema://bitmap/bmp_rgb24/v1",
            ),
        }

        for key, (url, role, file_format, read_mode, schema_ref) in expected.items():
            with self.subTest(key=key):
                self.assertIn(key, entries)
                self.assertEqual(entries[key]["url"], url)
                self.assertEqual(entries[key]["role"], role)
                self.assertEqual(entries[key]["format"], file_format)
                self.assertEqual(entries[key]["readMode"], read_mode)
                self.assertEqual(entries[key]["schemaRef"], schema_ref)
                self.assertEqual(entries[key]["owner"], "tools.build_hgo_runtime_assets")
                self.assertEqual(entries[key]["hashRef"], f"data/manifest.json::outputs::{url.removeprefix('data/')}::sha256")
                self.assertIn(f"manifest_output:{url.removeprefix('data/')}", entries[key].get("aliases") or [])

    def test_catalog_keeps_hgo_tier_a_checked_in_surface_clean(self) -> None:
        payload = self._load_catalog()
        urls = [str(entry.get("url") or "") for entry in payload.get("entries") or []]

        self.assertIn("data/hgo_catalogs/index.json", urls)
        self.assertIn("data/hgo_catalogs/hgo_place_names.json", urls)
        self.assertIn("data/hgo_catalogs/hgo_flags.index.json", urls)
        self.assertIn("data/hgo_catalogs/hgo_flags.png_manifest.json", urls)
        for url in urls:
            self.assertNotIn("historic geographic overhaul", url)
            self.assertFalse(url.endswith(".tga"), url)

    def test_catalog_contains_transport_preview_and_manifest_entries(self) -> None:
        payload = self._load_catalog()
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}

        self.assertIn("transport_manifest:road", entries)
        self.assertIn("transport:road:preview:roads", entries)
        self.assertIn("transport:rail:preview:railways", entries)
        self.assertIn("transport:industrial_zones:open:paths:preview:industrial_zones", entries)
        self.assertEqual(entries["transport_manifest:road"]["schemaRef"], "schema://transport/manifest/v1")
        self.assertEqual(entries["transport:road:preview:roads"]["schemaRef"], "schema://topojson/line_collection/roads_v1")
        self.assertEqual(entries["transport:rail:preview:railways"]["schemaRef"], "schema://topojson/line_collection/railways_v1")
        self.assertEqual(entries["transport:industrial_zones:open:paths:preview:industrial_zones"]["format"], "geojson")

    def test_catalog_preserves_runtime_asset_alias_identity_for_shared_urls(self) -> None:
        payload = self._load_catalog()
        entries_by_url = {entry["url"]: entry for entry in payload.get("entries") or []}

        world_cities = entries_by_url["data/world_cities.geojson"]

        self.assertEqual(world_cities["key"], "world_cities")
        self.assertIn("city_lights:historical_1930:source", world_cities.get("aliases") or [])

    def test_scenario_registry_stays_the_cataloged_scenario_entry(self) -> None:
        payload = self._load_catalog()
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}
        scenario_entries = [
            entry
            for entry in payload.get("entries") or []
            if str(entry.get("role") or "") == "scenario_registry" or "scenario" in str(entry.get("key") or "")
        ]

        self.assertEqual(len(scenario_entries), 1)
        self.assertIn("scenario_registry", entries)
        self.assertEqual(entries["scenario_registry"]["url"], SCENARIO_REGISTRY_URL)
        self.assertEqual(entries["scenario_registry"]["role"], "scenario_registry")
        self.assertEqual(entries["scenario_registry"]["schemaRef"], "schema://json/object/v1")

    def test_data_health_static_governance_domain_is_clean(self) -> None:
        report = collect_health(CATALOG_JSON, large_file_warn_bytes=0)

        expected_entry_count = self._load_catalog().get("counts", {}).get("entries")
        self.assertEqual(report.errors, [])
        self.assertEqual(report.checked_catalog_urls, expected_entry_count)
        self.assertEqual(report.checked_transport_manifests, 138)
        self.assertGreaterEqual(report.checked_transport_paths, 460)
        self.assertEqual(len(report.schema_ref_counts), EXPECTED_SCHEMA_REF_COUNT)

    def test_data_health_roots_runtime_registry_and_transport_scan_from_catalog_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir) / "fixture-repo"
            data_root = repo_root / "data"
            transport_root = data_root / "transport_layers" / "fixture_corridor"
            scenarios_root = data_root / "scenarios"
            transport_root.mkdir(parents=True)
            scenarios_root.mkdir(parents=True)

            manifest_text = (REPO_ROOT / "data" / "transport_layers" / "japan_corridor" / "manifest.json").read_text(encoding="utf-8")
            manifest_text = manifest_text.replace("japan_corridor", "fixture_corridor")
            (transport_root / "manifest.json").write_text(manifest_text, encoding="utf-8")
            shutil.copy2(REPO_ROOT / "data" / "transport_layers" / "japan_corridor" / "carrier.json", transport_root / "carrier.json")
            shutil.copy2(REPO_ROOT / "data" / "transport_layers" / "japan_corridor" / "provenance.json", transport_root / "provenance.json")
            (scenarios_root / "index.json").write_text('{"scenarios":[]}', encoding="utf-8")

            catalog_payload = {
                "version": 1,
                "generated_at": "2026-05-04T00:00:00Z",
                "entries": [
                    {
                        "key": "scenario_registry",
                        "url": "data/scenarios/index.json",
                        "role": "scenario_registry",
                        "format": "json",
                        "schemaRef": "schema://json/object/v1",
                        "hashRef": "",
                        "owner": "runtime_asset_registry.assets.scenario_registry",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                    {
                        "key": "transport_manifest:carrier",
                        "url": "data/transport_layers/fixture_corridor/manifest.json",
                        "role": "transport_manifest",
                        "format": "json",
                        "schemaRef": "schema://transport/manifest/v1",
                        "hashRef": "",
                        "owner": "builder",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                    {
                        "key": "transport:fixture_corridor:carrier",
                        "url": "data/transport_layers/fixture_corridor/carrier.json",
                        "role": "transport_carrier_payload",
                        "format": "json",
                        "schemaRef": "schema://transport/carrier_payload/v1",
                        "hashRef": "",
                        "owner": "builder",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                        "aliases": ["transport_carrier:fixture_corridor"],
                    },
                    {
                        "key": "transport:fixture_corridor:provenance",
                        "url": "data/transport_layers/fixture_corridor/provenance.json",
                        "role": "transport_provenance_payload",
                        "format": "json",
                        "schemaRef": "schema://transport/provenance_payload/v1",
                        "hashRef": "",
                        "owner": "builder",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                ],
            }
            runtime_asset_registry_payload = {
                "schema_version": 1,
                "assets": {
                    "scenario_registry": {
                        "url": "data/scenarios/index.json",
                        "role": "scenario_registry",
                    },
                    "transport_carrier:fixture_corridor": {
                        "url": "data/transport_layers/fixture_corridor/carrier.json",
                        "role": "transport_workbench_carrier",
                    },
                },
            }
            (data_root / "CATALOG.json").write_text(json.dumps(catalog_payload, ensure_ascii=False, indent=2), encoding="utf-8")
            (data_root / "runtime_asset_registry.json").write_text(
                json.dumps(runtime_asset_registry_payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            report = collect_health(data_root / "CATALOG.json", large_file_warn_bytes=0)

            self.assertEqual(report.errors, [])
            self.assertEqual(report.checked_catalog_urls, 4)
            self.assertEqual(report.checked_runtime_assets, 2)
            self.assertEqual(report.checked_transport_manifests, 1)

    def test_data_health_rejects_duplicate_catalog_keys(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir) / "fixture-repo"
            data_root = repo_root / "data"
            scenarios_root = data_root / "scenarios"
            transport_root = data_root / "transport_layers"
            data_root.mkdir(parents=True)
            scenarios_root.mkdir(parents=True)
            transport_root.mkdir(parents=True)

            (scenarios_root / "index.json").write_text('{"scenarios":[]}', encoding="utf-8")
            (data_root / "first.json").write_text("{}", encoding="utf-8")
            (data_root / "second.json").write_text("{}", encoding="utf-8")
            catalog_payload = {
                "version": 1,
                "generated_at": "2026-05-19T00:00:00Z",
                "entries": [
                    {
                        "key": "scenario_registry",
                        "url": "data/scenarios/index.json",
                        "role": "scenario_registry",
                        "format": "json",
                        "schemaRef": "schema://json/object/v1",
                        "hashRef": "",
                        "owner": "runtime_asset_registry.assets.scenario_registry",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                    {
                        "key": "fixture_duplicate",
                        "url": "data/first.json",
                        "role": "fixture_metadata",
                        "format": "json",
                        "schemaRef": "schema://json/object/v1",
                        "hashRef": "",
                        "owner": "fixture",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                    {
                        "key": "fixture_duplicate",
                        "url": "data/second.json",
                        "role": "fixture_metadata",
                        "format": "json",
                        "schemaRef": "schema://json/object/v1",
                        "hashRef": "",
                        "owner": "fixture",
                        "cachePolicy": "default",
                        "sourceId": "",
                        "readMode": "json",
                    },
                ],
            }
            runtime_asset_registry_payload = {
                "schema_version": 1,
                "assets": {
                    "scenario_registry": {
                        "url": "data/scenarios/index.json",
                        "role": "scenario_registry",
                    },
                },
            }

            (data_root / "CATALOG.json").write_text(json.dumps(catalog_payload, ensure_ascii=False, indent=2), encoding="utf-8")
            (data_root / "runtime_asset_registry.json").write_text(
                json.dumps(runtime_asset_registry_payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            report = collect_health(data_root / "CATALOG.json", large_file_warn_bytes=0)

            self.assertIn("catalog key appears more than once: fixture_duplicate", report.errors)

    def test_catalog_keeps_topology_metadata_and_source_provenance_traces(self) -> None:
        payload = self._load_catalog()
        entries_by_key = {entry["key"]: entry for entry in payload.get("entries") or []}

        primary_topology = entries_by_key["manifest_output:europe_topology.json"]
        china_source = entries_by_key["source:gb_chn_adm2"]

        self.assertEqual(primary_topology["format"], "topojson")
        self.assertEqual(primary_topology["schemaRef"], "schema://topology/political_bundle_v1")
        self.assertEqual(china_source["sourceId"], "gb_chn_adm2")
        self.assertEqual(china_source["hashRef"], "data/source_ledger.json::gb_chn_adm2::current_local_sha256")


if __name__ == "__main__":
    unittest.main()
