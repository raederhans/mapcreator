from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from scenario_builder.hoi4.crosswalk import build_iso2_to_mapped_tag
from tools.import_country_palette import (
    PaletteEntry,
    build_palette_entries,
    ensure_exposed_runtime_default_bridges,
    find_source_root,
    parse_localisation_catalog,
    parse_country_tags,
    resolve_mapping_state,
)


def _entry(tag: str, *, localized_name: str) -> PaletteEntry:
    return PaletteEntry(
        tag=tag,
        localized_name=localized_name,
        name_source="manual",
        country_file_label=localized_name,
        country_file="countries/test.txt",
        country_file_is_shared_template=False,
        map_hex="#123456",
        map_source="test",
        ui_hex="#123456",
        ui_source="test",
        country_file_hex="",
        country_file_source="",
        dynamic=False,
    )


class ImportCountryPaletteTest(unittest.TestCase):
    def test_find_source_root_accepts_mod_specific_country_tag_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            country_tags = root / "common" / "country_tags"
            country_tags.mkdir(parents=True)
            (country_tags / "HGO_countries.txt").write_text('ABK = "countries/Abkhazia.txt"\n', encoding="utf-8")

            self.assertEqual(find_source_root(str(root)), root)

    def test_parse_country_tags_reads_all_mod_country_tag_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            country_tags = root / "common" / "country_tags"
            country_tags.mkdir(parents=True)
            (country_tags / "HGO_countries.txt").write_text('ABK = "countries/Abkhazia.txt"\n', encoding="utf-8")
            (country_tags / "HGO2_countries.txt").write_text('ALG = "countries/Algeria.txt"\n', encoding="utf-8")
            (country_tags / "my_dynamic_topic_countries.txt").write_text(
                'AIC = "countries/Ainu.txt"\n',
                encoding="utf-8",
            )
            (country_tags / "zz_dynamic_countries.txt").write_text(
                'DYN = "countries/Dynamic.txt"\n',
                encoding="utf-8",
            )

            tags = parse_country_tags(root)

        self.assertEqual(tags["ABK"], ("countries/Abkhazia.txt", False))
        self.assertEqual(tags["ALG"], ("countries/Algeria.txt", False))
        self.assertEqual(tags["AIC"], ("countries/Ainu.txt", False))
        self.assertEqual(tags["DYN"], ("countries/Dynamic.txt", True))

    def test_build_palette_entries_falls_back_ui_hex_to_map_hex(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            country_dir = root / "common" / "countries"
            country_dir.mkdir(parents=True)
            (country_dir / "Abkhazia.txt").write_text("color = { 100 100 150 }\n", encoding="utf-8")

            entries = build_palette_entries(
                root,
                {"ABK": ("countries/Abkhazia.txt", False)},
                {},
                {"ABK": "Abkhazia"},
                {},
                {},
            )

        self.assertEqual(entries["ABK"].map_hex, "#646496")
        self.assertEqual(entries["ABK"].ui_hex, "#646496")
        self.assertEqual(entries["ABK"].ui_source, "map_hex_fallback")

    def test_parse_localisation_catalog_accepts_custom_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            loc_root = root / "localisation"
            loc_root.mkdir()
            (loc_root / "HGO_countries_l_english.yml").write_text(
                'l_english:\n ABK:0 "Abkhazia"\n ALG_fascism:0 "Kingdom of Algeria"\n',
                encoding="utf-8",
            )

            exact_names, suffix_names = parse_localisation_catalog(root, ["fascism"], Path("localisation"))

        self.assertEqual(exact_names["ABK"], "Abkhazia")
        self.assertEqual(suffix_names["ALG"]["fascism"], "Kingdom of Algeria")

    def test_resolve_mapping_state_marks_non_default_runtime_tags(self) -> None:
        entries = {
            "MAN": _entry("MAN", localized_name="Manchuria"),
            "CHI": _entry("CHI", localized_name="China"),
        }
        manual = {
            "verified_exact_tag_to_iso2": {
                "MAN": "CN",
                "CHI": "CN",
            },
            "non_default_runtime_tags": ["MAN"],
        }

        with tempfile.TemporaryDirectory() as tmp_dir:
            manual_path = Path(tmp_dir) / "tno.manual.json"
            manual_path.write_text("{}", encoding="utf-8")
            mapped, unmapped, audit_entries = resolve_mapping_state(
                entries,
                manual,
                manual_path,
                runtime_country_codes={"CN"},
                primary_name_to_iso2={"manchuria": "CN", "china": "CN"},
            )

        self.assertEqual(unmapped, {})
        self.assertEqual(mapped["MAN"]["iso2"], "CN")
        self.assertFalse(mapped["MAN"]["expose_as_runtime_default"])
        self.assertNotIn("expose_as_runtime_default", mapped["CHI"])
        self.assertEqual(audit_entries["MAN"]["status"], "mapped")

    def test_resolve_mapping_state_rejects_non_default_runtime_tags_without_verified_mapping(self) -> None:
        entries = {
            "MAN": _entry("MAN", localized_name="Manchuria"),
        }
        manual = {
            "non_default_runtime_tags": ["MAN"],
        }

        with tempfile.TemporaryDirectory() as tmp_dir:
            manual_path = Path(tmp_dir) / "tno.manual.json"
            manual_path.write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(SystemExit, "non_default_runtime_tags entries require verified mappings"):
                resolve_mapping_state(
                    entries,
                    manual,
                    manual_path,
                    runtime_country_codes={"CN"},
                    primary_name_to_iso2={"manchuria": "CN"},
                )

    def test_build_iso2_to_mapped_tag_skips_non_default_runtime_entries(self) -> None:
        palette_map = {
            "mapped": {
                "MAN": {
                    "iso2": "CN",
                    "match_kind": "manual_exact",
                    "decision_source": "manual_verified",
                    "expose_as_runtime_default": False,
                },
                "CHI": {
                    "iso2": "CN",
                    "match_kind": "manual_exact",
                    "decision_source": "manual_verified",
                },
                "VIN": {
                    "iso2": "VN",
                    "match_kind": "manual_exact",
                    "decision_source": "manual_verified",
                    "expose_as_runtime_default": False,
                },
            }
        }

        self.assertEqual(
            build_iso2_to_mapped_tag(palette_map),
            {
                "CN": "CHI",
            },
        )

    def test_ensure_exposed_runtime_default_bridges_rejects_hidden_only_iso2(self) -> None:
        with self.assertRaisesRegex(
            SystemExit,
            "palette map is missing an exposed runtime default bridge for: RU=>MAG/SAM",
        ):
            ensure_exposed_runtime_default_bridges(
                {
                    "MAG": {
                        "iso2": "RU",
                        "expose_as_runtime_default": False,
                    },
                    "SAM": {
                        "iso2": "RU",
                        "expose_as_runtime_default": False,
                    },
                }
            )

    def test_tno_manual_second_wave_tags_are_verified(self) -> None:
        payload = json.loads(Path("data/palette-maps/tno.manual.json").read_text(encoding="utf-8"))
        verified = payload.get("verified_exact_tag_to_iso2") or {}
        non_default = set(payload.get("non_default_runtime_tags") or [])
        expected = {
            "KOR": "KR",
            "GNG": "CN",
            "MAG": "RU",
            "ONG": "RU",
            "GAY": "RU",
            "SVR": "RU",
            "SAM": "RU",
            "VYT": "RU",
            "NOV": "RU",
            "GOR": "RU",
            "TYM": "RU",
            "WRS": "RU",
            "CHT": "RU",
            "VOL": "RU",
            "BRY": "RU",
            "BKR": "RU",
            "SBA": "RU",
            "ZLT": "RU",
            "TAN": "RU",
            "KOM": "RU",
            "IRK": "RU",
            "KRS": "RU",
            "TOM": "RU",
            "YAK": "RU",
            "OMS": "RU",
            "ALT": "RU",
            "PRM": "RU",
            "ORE": "RU",
            "URL": "RU",
            "VOR": "RU",
        }

        for tag, iso2 in expected.items():
            self.assertEqual(verified.get(tag), iso2)
        for tag in set(expected) - {"KOR", "SVR"}:
            self.assertIn(tag, non_default)
        for tag in ["KOR", "SVR"]:
            self.assertNotIn(tag, non_default)

    def test_tno_manual_runtime_default_bridge_tags_stay_exposed(self) -> None:
        payload = json.loads(Path("data/palette-maps/tno.manual.json").read_text(encoding="utf-8"))
        verified = payload.get("verified_exact_tag_to_iso2") or {}
        non_default = set(payload.get("non_default_runtime_tags") or [])
        expected = {
            "FFR": "FR",
            "FRI": "IN",
            "KOR": "KR",
            "SER": "RS",
            "SVR": "RU",
            "VIN": "VN",
        }

        for tag, iso2 in expected.items():
            self.assertEqual(verified.get(tag), iso2)
            self.assertNotIn(tag, non_default)

    def test_tno_manual_final_wave_tags_are_verified_and_non_default(self) -> None:
        payload = json.loads(Path("data/palette-maps/tno.manual.json").read_text(encoding="utf-8"))
        verified = payload.get("verified_exact_tag_to_iso2") or {}
        non_default = set(payload.get("non_default_runtime_tags") or [])
        expected = {
            "PRC": "CN",
            "SIC": "CN",
        }

        for tag, iso2 in expected.items():
            self.assertEqual(verified.get(tag), iso2)
            self.assertIn(tag, non_default)

        for tag in ["SIK", "TIB", "XIK"]:
            self.assertNotIn(tag, verified)
            self.assertNotIn(tag, non_default)

    def test_tno_generated_map_keeps_runtime_default_bridges_for_critical_iso2(self) -> None:
        payload_map = json.loads(Path("data/palette-maps/tno.map.json").read_text(encoding="utf-8"))
        iso2_to_tag = build_iso2_to_mapped_tag(payload_map)

        self.assertEqual(
            {iso2: iso2_to_tag.get(iso2) for iso2 in ["FR", "IN", "KR", "RS", "RU", "VN"]},
            {
                "FR": "FFR",
                "IN": "FRI",
                "KR": "KOR",
                "RS": "SER",
                "RU": "SVR",
                "VN": "VIN",
            },
        )

    def test_tno_generated_map_and_audit_final_wave_tags_match_topic_status(self) -> None:
        payload_map = json.loads(Path("data/palette-maps/tno.map.json").read_text(encoding="utf-8"))
        payload_audit = json.loads(Path("data/palette-maps/tno.audit.json").read_text(encoding="utf-8"))["entries"]

        expected_mapped = {
            "PRC": "CN",
            "SIC": "CN",
        }
        expected_unmapped = {
            "SIK": "unsupported_runtime_country",
            "TIB": "unsupported_runtime_country",
            "XIK": "unreviewed",
        }

        for tag, iso2 in expected_mapped.items():
            self.assertIn(tag, payload_map["mapped"])
            self.assertNotIn(tag, payload_map["unmapped"])
            self.assertEqual(payload_map["mapped"][tag]["iso2"], iso2)
            self.assertFalse(payload_map["mapped"][tag]["expose_as_runtime_default"])
            self.assertEqual(payload_audit[tag]["status"], "mapped")
            self.assertEqual(payload_audit[tag]["mapped_iso2"], iso2)

        for tag, reason in expected_unmapped.items():
            self.assertNotIn(tag, payload_map["mapped"])
            self.assertIn(tag, payload_map["unmapped"])
            self.assertEqual(payload_map["unmapped"][tag]["reason"], reason)
            self.assertEqual(payload_audit[tag]["status"], "unmapped")
            self.assertEqual(payload_audit[tag]["reason"], reason)


if __name__ == "__main__":
    unittest.main()
