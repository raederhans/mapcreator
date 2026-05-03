from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools.build_data_catalog import build_catalog_markdown, build_catalog_payload


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_JSON = REPO_ROOT / "data" / "CATALOG.json"
CATALOG_MD = REPO_ROOT / "data" / "CATALOG.md"


class DataCatalogContractTest(unittest.TestCase):
    def test_checked_in_catalog_matches_builder(self) -> None:
        checked_in_payload = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        checked_in_markdown = CATALOG_MD.read_text(encoding="utf-8")
        rebuilt_payload = build_catalog_payload()
        rebuilt_markdown = build_catalog_markdown(rebuilt_payload)

        self.assertEqual(checked_in_payload, rebuilt_payload)
        self.assertEqual(checked_in_markdown, rebuilt_markdown)

    def test_catalog_contains_transport_preview_and_manifest_entries(self) -> None:
        payload = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        entries = {entry["key"]: entry for entry in payload.get("entries") or []}

        self.assertIn("transport_manifest:road", entries)
        self.assertIn("transport:road:preview:roads", entries)
        self.assertIn("transport:rail:preview:railways", entries)
        self.assertIn("transport:industrial_zones:open:paths:preview:industrial_zones", entries)
        self.assertEqual(entries["transport_manifest:road"]["schemaRef"], "schema://transport/manifest/v1")
        self.assertEqual(entries["transport:road:preview:roads"]["schemaRef"], "schema://topojson/line_collection/roads_v1")
        self.assertEqual(entries["transport:rail:preview:railways"]["schemaRef"], "schema://topojson/line_collection/railways_v1")
        self.assertEqual(entries["transport:industrial_zones:open:paths:preview:industrial_zones"]["format"], "geojson")

    def test_catalog_keeps_topology_metadata_and_source_provenance_traces(self) -> None:
        payload = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        entries_by_key = {entry["key"]: entry for entry in payload.get("entries") or []}

        primary_topology = entries_by_key["manifest_output:europe_topology.json"]
        china_source = entries_by_key["source:gb_chn_adm2"]

        self.assertEqual(primary_topology["format"], "topojson")
        self.assertEqual(primary_topology["schemaRef"], "schema://topology/political_bundle_v1")
        self.assertEqual(china_source["sourceId"], "gb_chn_adm2")
        self.assertEqual(china_source["hashRef"], "data/source_ledger.json::gb_chn_adm2::current_local_sha256")


if __name__ == "__main__":
    unittest.main()
