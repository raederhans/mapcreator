from __future__ import annotations

import json
import unittest
from pathlib import Path

from scenario_builder.hoi4.compiler import _apply_country_full_names
from scenario_builder.hoi4.models import ScenarioCountryRecord
from tools.build_hoi4_scenario import (
    DEFAULT_COUNTRY_FULL_NAMES_FILE,
    PROJECT_ROOT,
    load_country_full_names,
    resolve_controller_rules,
    resolve_manual_rules,
)


class BuildHoi4ScenarioDefaultsTest(unittest.TestCase):
    def test_resolve_manual_rules_keeps_hoi4_1936_single_pack_default(self) -> None:
        resolved = resolve_manual_rules("", "hoi4_1936")
        self.assertEqual(
            resolved,
            str(PROJECT_ROOT / "data" / "scenario-rules" / "hoi4_1936.manual.json"),
        )

    def test_resolve_manual_rules_restores_hoi4_1939_base_plus_override_default(self) -> None:
        resolved = resolve_manual_rules("", "hoi4_1939")
        self.assertEqual(
            resolved,
            ",".join(
                [
                    str(PROJECT_ROOT / "data" / "scenario-rules" / "hoi4_1936.manual.json"),
                    str(PROJECT_ROOT / "data" / "scenario-rules" / "hoi4_1939.manual.json"),
                ]
            ),
        )

    def test_resolve_manual_rules_preserves_explicit_override(self) -> None:
        explicit = "custom/a.json,custom/b.json"
        self.assertEqual(resolve_manual_rules(explicit, "hoi4_1939"), explicit)

    def test_resolve_manual_rules_uses_scenario_specific_file_for_other_scenarios(self) -> None:
        scenario_rules_dir = PROJECT_ROOT / "data" / "scenario-rules"
        target_path = scenario_rules_dir / "unit_test.manual.json"
        try:
            target_path.write_text('{"version": 1, "rules": []}\n', encoding="utf-8")
            self.assertEqual(resolve_manual_rules("", "unit_test"), str(target_path))
        finally:
            target_path.unlink(missing_ok=True)

    def test_resolve_manual_rules_returns_empty_string_when_no_default_exists(self) -> None:
        self.assertEqual(resolve_manual_rules("", "missing_scenario"), "")

    def test_resolve_controller_rules_rejects_explicit_rules_for_owner_only_output(self) -> None:
        with self.assertRaisesRegex(ValueError, "controller rules are retired"):
            resolve_controller_rules("custom/controller.json", "hoi4_1939")

    def test_resolve_controller_rules_returns_empty_for_owner_only_output(self) -> None:
        self.assertEqual(resolve_controller_rules("", "hoi4_1939"), "")

    def test_default_country_full_names_include_required_major_tags(self) -> None:
        full_names = load_country_full_names(str(DEFAULT_COUNTRY_FULL_NAMES_FILE))
        tags = full_names["tags"]

        self.assertEqual(DEFAULT_COUNTRY_FULL_NAMES_FILE.name, "hoi4_country_full_names.json")
        self.assertEqual(tags["ENG"]["en"], "United Kingdom of Great Britain and Northern Ireland")
        self.assertEqual(tags["ENG"]["zh"], "大不列颠及北爱尔兰联合王国")
        self.assertEqual(tags["SOV"]["en"], "Union of Soviet Socialist Republics")
        self.assertEqual(tags["SOV"]["zh"], "苏维埃社会主义共和国联盟")

    def test_checked_in_scenario_countries_use_full_names(self) -> None:
        full_names = load_country_full_names(str(DEFAULT_COUNTRY_FULL_NAMES_FILE))

        for scenario_id in ("hoi4_1936", "hoi4_1939"):
            with self.subTest(scenario_id=scenario_id):
                countries_path = PROJECT_ROOT / "data" / "scenarios" / scenario_id / "countries.json"
                countries_payload = json.loads(countries_path.read_text(encoding="utf-8"))
                countries = countries_payload["countries"]
                scenario_overrides = full_names.get("scenarios", {}).get(scenario_id, {})

                for tag, country in countries.items():
                    expected = scenario_overrides.get(tag, full_names["tags"].get(tag))
                    self.assertIsNotNone(expected, f"{scenario_id} {tag} missing full-name entry")
                    self.assertEqual(country["display_name"], expected["en"])
                    self.assertEqual(country["display_name_en"], expected["en"])
                    self.assertEqual(country["display_name_zh"], expected["zh"])

        scenario_1936 = json.loads(
            (PROJECT_ROOT / "data" / "scenarios" / "hoi4_1936" / "countries.json").read_text(encoding="utf-8")
        )["countries"]
        scenario_1939 = json.loads(
            (PROJECT_ROOT / "data" / "scenarios" / "hoi4_1939" / "countries.json").read_text(encoding="utf-8")
        )["countries"]
        self.assertEqual(scenario_1936["PRC"]["display_name"], "Chinese Soviet Republic")
        self.assertEqual(scenario_1939["PRC"]["display_name"], "Shaan-Gan-Ning Border Region")
        self.assertEqual(scenario_1936["SPR"]["display_name"], "Spanish Republic")
        self.assertEqual(scenario_1939["SPR"]["display_name"], "Spanish State")

    def test_apply_country_full_names_rejects_missing_or_incomplete_entries(self) -> None:
        countries = {
            "AAA": ScenarioCountryRecord(
                tag="AAA",
                display_name="Alpha",
                color_hex="#111111",
                feature_count=1,
                quality="manual_reviewed",
                source="unit-test",
            ),
            "BBB": ScenarioCountryRecord(
                tag="BBB",
                display_name="Beta",
                color_hex="#222222",
                feature_count=1,
                quality="manual_reviewed",
                source="unit-test",
            ),
        }

        with self.assertRaisesRegex(ValueError, "missing tags: BBB"):
            _apply_country_full_names(
                countries,
                scenario_id="unit_test",
                country_full_names={"tags": {"AAA": {"en": "Alpha Republic", "zh": "阿尔法共和国"}}},
            )

        with self.assertRaisesRegex(ValueError, "incomplete bilingual entries: BBB"):
            _apply_country_full_names(
                countries,
                scenario_id="unit_test",
                country_full_names={
                    "tags": {
                        "AAA": {"en": "Alpha Republic", "zh": "阿尔法共和国"},
                        "BBB": {"en": "Beta Republic"},
                    }
                },
            )


if __name__ == "__main__":
    unittest.main()
