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
EXPECTED_ENTRY_COUNT = 373
EXPECTED_SCHEMA_REF_COUNT = 20


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

        self.assertEqual(len(entries), EXPECTED_ENTRY_COUNT)
        self.assertEqual(payload.get("counts", {}).get("entries"), EXPECTED_ENTRY_COUNT)
        self.assertEqual(len(schema_counts), EXPECTED_SCHEMA_REF_COUNT)
        self.assertEqual(schema_counts["schema://transport/manifest/v1"], 75)
        self.assertEqual(schema_counts["schema://transport/build_audit/v1"], 74)
        self.assertEqual(schema_counts["schema://topojson/line_collection/roads_v1"], 80)
        self.assertEqual(schema_counts["schema://topojson/line_collection/railways_v1"], 52)
        self.assertIn("schema://transport/carrier_payload/v1", schema_counts)
        self.assertIn("schema://transport/provenance_payload/v1", schema_counts)

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

        self.assertEqual(report.errors, [])
        self.assertEqual(report.checked_catalog_urls, EXPECTED_ENTRY_COUNT)
        self.assertEqual(report.checked_transport_manifests, 75)
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
