from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from tools.build_hgo_flag_index import build_catalog_index, build_flag_index
from tools.build_hgo_name_catalog import build_catalog


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
                "gfx/flags/medium/ABK.tga",
                "gfx/flags/medium/ABK_SOV.tga",
                "gfx/flags/small/ABK.tga",
            ]:
                (root / rel_path).write_bytes(b"tga")

            payload = build_flag_index(root)

        self.assertEqual(payload["counts"]["files_by_tier"]["full"], 2)
        self.assertEqual(payload["counts"]["files_by_tier"]["medium"], 2)
        self.assertEqual(payload["counts"]["files_by_tier"]["small"], 1)
        self.assertEqual(payload["tags"]["ABK"]["base"]["full"]["source_path"], "gfx/flags/ABK.tga")
        self.assertEqual(
            payload["tags"]["ABK"]["variants"]["SOV"]["medium"]["source_path"],
            "gfx/flags/medium/ABK_SOV.tga",
        )
        self.assertEqual(payload["distribution_policy"]["png_generation"], "deferred")

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

            payload = build_catalog_index(flags_payload, place_names_path=place_names, flags_path=flags_index)

        self.assertEqual(payload["assets"]["place_names"]["url"], place_names.as_posix())
        self.assertEqual(payload["assets"]["place_names"]["role"], "hgo_place_names")
        self.assertEqual(payload["assets"]["place_names"]["entry_count"], 12)
        self.assertEqual(payload["assets"]["flags_index"]["url"], flags_index.as_posix())
        self.assertEqual(payload["assets"]["flags_index"]["role"], "hgo_flags_index")
        self.assertEqual(payload["assets"]["flags_index"]["tag_count"], 3)


if __name__ == "__main__":
    unittest.main()
