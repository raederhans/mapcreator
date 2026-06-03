from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from tools.build_hgo_flag_index import build_catalog_index, build_flag_index
from tools.build_hgo_flag_png_catalog import build_png_manifest, update_catalog_index
from tools.build_hgo_name_catalog import build_catalog
from PIL import Image


def write_tga(path: Path, *, size: tuple[int, int] = (4, 3)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGBA", size, (10, 20, 30, 255))
    image.save(path, "TGA")


class HgoCatalogBuilderTest(unittest.TestCase):
    def test_name_catalog_groups_country_suffixes_and_place_kinds(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            localisation = root / "localisation"
            replace = localisation / "replace"
            replace.mkdir(parents=True)
            (localisation / "HGO_countries_l_english.yml").write_text(
                'l_english:\n ABK:0 "Abkhazia"\n ALG:0 "Algeria"\n',
                encoding="utf-8",
            )
            (localisation / "HGO_countries_l_french.yml").write_text(
                'l_french:\n ALG_fascism:0 "Royaume d\'Algérie"\n',
                encoding="utf-8",
            )
            (localisation / "HGO_countries_l_german.yml").write_text(
                'l_german:\n ALG_fascism:0 "Koenigreich Algerien"\n',
                encoding="utf-8",
            )
            (localisation / "state_names_l_english.yml").write_text(
                'l_english:\n STATE_1:0 "Ajaccio"\n',
                encoding="utf-8",
            )
            (replace / "HGO_states_names_l_french.yml").write_text(
                'l_french:\n STATE_1:0 "Ajaccio FR"\n',
                encoding="utf-8",
            )
            (localisation / "strategic_region_names_l_english.yml").write_text(
                'l_english:\n STRATEGICREGION_1:0 "Southern England"\n',
                encoding="utf-8",
            )
            (localisation / "supply_area_names_l_english.yml").write_text(
                'l_english:\n SUPPLYAREA_1:0 "Corsica"\n',
                encoding="utf-8",
            )

            payload = build_catalog(root)

        entries = payload["entries"]
        self.assertEqual(entries["ALG"]["names"]["en"], "Algeria")
        self.assertEqual(entries["ALG"]["names"]["fr"], "Royaume d'Algérie")
        self.assertEqual(entries["ALG"]["names"]["de"], "Koenigreich Algerien")
        self.assertEqual(entries["STATE_1"]["kind"], "state")
        self.assertEqual(entries["STATE_1"]["names"]["en"], "Ajaccio")
        self.assertEqual(entries["STRATEGICREGION_1"]["kind"], "strategic_region")
        self.assertEqual(entries["SUPPLYAREA_1"]["kind"], "supply_area")

    def test_flag_index_keeps_source_paths_and_variant_tiers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            for rel_dir in ["gfx/flags", "gfx/flags/medium", "gfx/flags/small"]:
                (root / rel_dir).mkdir(parents=True)
            for rel_path in [
                "gfx/flags/ABK.tga",
                "gfx/flags/ABK_SOV.tga",
                "gfx/flags/ABK_ENG.TGA",
                "gfx/flags/medium/ABK.tga",
                "gfx/flags/medium/ABK_SOV.tga",
                "gfx/flags/small/ABK.tga",
            ]:
                (root / rel_path).write_bytes(b"tga")

            payload = build_flag_index(root)

        self.assertEqual(payload["counts"]["files_by_tier"]["full"], 3)
        self.assertEqual(payload["counts"]["files_by_tier"]["medium"], 2)
        self.assertEqual(payload["counts"]["files_by_tier"]["small"], 1)
        self.assertEqual(payload["tags"]["ABK"]["base"]["full"]["source_path"], "gfx/flags/ABK.tga")
        self.assertEqual(
            payload["tags"]["ABK"]["variants"]["sov"]["medium"]["source_path"],
            "gfx/flags/medium/ABK_SOV.tga",
        )
        self.assertEqual(
            payload["tags"]["ABK"]["variants"]["eng"]["full"]["source_path"],
            "gfx/flags/ABK_ENG.TGA",
        )
        self.assertEqual(payload["tags"]["ABK"]["variants"]["eng"]["full"]["variant_source"], "ENG")
        self.assertEqual(payload["distribution_policy"]["png_generation"], "companion_manifest")

    def test_catalog_index_records_place_names_and_flags_assets(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            place_names = root / "data" / "hgo_catalogs" / "hgo_place_names.json"
            flags_index = root / "data" / "hgo_catalogs" / "hgo_flags.index.json"
            place_names.parent.mkdir(parents=True)
            place_names.write_text(json.dumps({"counts": {"entries": 12}}), encoding="utf-8")
            flags_payload = {
                "generated_at_utc": "2026-06-02T00:00:00Z",
                "source": {"display_name": "Historic Geographical Overhaul"},
                "counts": {"tags": 3},
            }

            png_manifest = root / "data" / "hgo_catalogs" / "hgo_flags.png_manifest.json"
            png_manifest.write_text(json.dumps({"counts": {"files": 4, "total_png_bytes": 1234}}), encoding="utf-8")

            payload = build_catalog_index(
                flags_payload,
                place_names_path=place_names,
                flags_path=flags_index,
                png_manifest_path=png_manifest,
            )

        self.assertEqual(payload["assets"]["place_names"]["url"], place_names.as_posix())
        self.assertEqual(payload["assets"]["place_names"]["role"], "hgo_place_names")
        self.assertEqual(payload["assets"]["place_names"]["entry_count"], 12)
        self.assertEqual(payload["assets"]["flags_index"]["url"], flags_index.as_posix())
        self.assertEqual(payload["assets"]["flags_index"]["role"], "hgo_flags_index")
        self.assertEqual(payload["assets"]["flags_index"]["tag_count"], 3)
        self.assertEqual(payload["assets"]["flags_png_manifest"]["url"], png_manifest.as_posix())
        self.assertEqual(payload["assets"]["flags_png_manifest"]["role"], "hgo_flags_png_manifest")
        self.assertEqual(payload["assets"]["flags_png_manifest"]["file_count"], 4)
        self.assertEqual(payload["assets"]["flags_png_manifest"]["total_png_bytes"], 1234)

    def test_flag_png_manifest_converts_and_shards_assets(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source_root = root / "source"
            for rel_path in [
                "gfx/flags/ABK.tga",
                "gfx/flags/ABK_SOV.tga",
                "gfx/flags/ABK_ENG.TGA",
                "gfx/flags/medium/ABK.tga",
                "gfx/flags/small/ABK.tga",
            ]:
                write_tga(source_root / rel_path)
            output_root = root / "data" / "hgo_catalogs" / "flags_png"
            manifest_output = root / "data" / "hgo_catalogs" / "hgo_flags.png_manifest.json"

            payload = build_png_manifest(source_root, output_root, manifest_output=manifest_output)
            self.assertEqual(payload["counts"]["files"], 5)
            self.assertEqual(payload["counts"]["files_by_tier"], {"full": 3, "medium": 1, "small": 1})
            base_full = payload["tags"]["ABK"]["base"]["full"]
            self.assertEqual(base_full["source_path"], "gfx/flags/ABK.tga")
            self.assertTrue(base_full["png_path"].endswith("flags_png/full/AB/ABK.png"))
            self.assertEqual(base_full["width"], 4)
            self.assertEqual(base_full["height"], 3)
            self.assertEqual(len(base_full["sha256"]), 64)
            self.assertTrue(Path(base_full["png_path"]).is_file())
            self.assertTrue(
                payload["tags"]["ABK"]["variants"]["sov"]["full"]["png_path"].endswith(
                    "flags_png/full/AB/ABK_SOV.png"
                )
            )
            self.assertTrue(
                payload["tags"]["ABK"]["variants"]["eng"]["full"]["png_path"].endswith(
                    "flags_png/full/AB/ABK_ENG.png"
                )
            )
            self.assertEqual(payload["tags"]["ABK"]["variants"]["eng"]["full"]["variant_source"], "ENG")

    def test_flag_png_builder_updates_tier_a_catalog_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            catalog_index = root / "data" / "hgo_catalogs" / "index.json"
            catalog_index.parent.mkdir(parents=True)
            catalog_index.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "catalog_id": "hgo_tier_a",
                        "generated_at_utc": "2026-06-02T00:00:00Z",
                        "assets": {},
                        "scope": {"included": ["flag source index"], "excluded": ["converted flag image redistribution"]},
                    }
                ),
                encoding="utf-8",
            )
            manifest_output = root / "data" / "hgo_catalogs" / "hgo_flags.png_manifest.json"
            payload = {
                "generated_at_utc": "2026-06-03T00:00:00Z",
                "counts": {"files": 4, "total_png_bytes": 1234},
            }

            update_catalog_index(catalog_index, payload, manifest_output=manifest_output)
            updated = json.loads(catalog_index.read_text(encoding="utf-8"))

        self.assertEqual(updated["assets"]["flags_png_manifest"]["file_count"], 4)
        self.assertEqual(updated["assets"]["flags_png_manifest"]["total_png_bytes"], 1234)
        self.assertIn("converted flag PNG manifest", updated["scope"]["included"])
        self.assertNotIn("converted flag image redistribution", updated["scope"]["excluded"])

    def test_checked_in_hgo_png_manifest_matches_png_files(self) -> None:
        manifest_path = Path("data/hgo_catalogs/hgo_flags.png_manifest.json")
        if not manifest_path.exists():
            self.skipTest("checked-in HGO PNG manifest is generated by the HGO flags asset task")
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        seen_paths: set[str] = set()
        total_bytes = 0
        for tag_entry in payload["tags"].values():
            for record in tag_entry.get("base", {}).values():
                seen_paths.add(record["png_path"])
                path = Path(record["png_path"])
                self.assertTrue(path.is_file(), record["png_path"])
                self.assertEqual(path.stat().st_size, record["byte_length"])
                total_bytes += record["byte_length"]
            for variants in tag_entry.get("variants", {}).values():
                for record in variants.values():
                    seen_paths.add(record["png_path"])
                    path = Path(record["png_path"])
                    self.assertTrue(path.is_file(), record["png_path"])
                    self.assertEqual(path.stat().st_size, record["byte_length"])
                    total_bytes += record["byte_length"]

        actual_paths = {path.as_posix() for path in Path("data/hgo_catalogs/flags_png").rglob("*.png")}
        self.assertEqual(seen_paths, actual_paths)
        self.assertEqual(len(seen_paths), payload["counts"]["files"])
        self.assertEqual(total_bytes, payload["counts"]["total_png_bytes"])

    def test_checked_in_hgo_variant_keys_are_lowercase(self) -> None:
        for rel_path in [
            "data/hgo_catalogs/hgo_flags.index.json",
            "data/hgo_catalogs/hgo_flags.png_manifest.json",
        ]:
            path = Path(rel_path)
            if not path.exists():
                self.skipTest(f"{rel_path} is generated by the HGO flags asset task")
            payload = json.loads(path.read_text(encoding="utf-8"))
            for tag_entry in payload["tags"].values():
                for variant_key in tag_entry.get("variants", {}):
                    self.assertEqual(variant_key, variant_key.lower())


if __name__ == "__main__":
    unittest.main()
