from __future__ import annotations

import json
import hashlib
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from map_builder.transport_country_real_source_contracts import (
    COUNTRY_SOURCE_SPECS,
    FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS,
    TARGET_COUNTRY_PACK_IDS,
    build_source_recipe,
    check_country_sources,
    scan_for_forbidden_backend_tokens,
)
from tools.build_transport_country_real_packs import is_operating_france_rail_status, normalize_text


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


if __name__ == "__main__":
    unittest.main()
