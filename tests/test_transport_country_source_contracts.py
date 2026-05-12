from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from map_builder.transport_country_real_source_contracts import (
    COUNTRY_SOURCE_SPECS,
    FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS,
    TARGET_COUNTRY_PACK_IDS,
    build_source_recipe,
    check_country_sources,
    scan_for_forbidden_backend_tokens,
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


if __name__ == "__main__":
    unittest.main()
