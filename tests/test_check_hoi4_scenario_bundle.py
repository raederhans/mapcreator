from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools import check_scenario_contracts
from tools.check_hoi4_scenario_bundle import inspect_hoi4_scenario_bundle


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _create_valid_hoi4_bundle(tmp_root: Path, scenario_name: str = "hoi4_1936") -> tuple[Path, Path, Path]:
    scenario_dir = tmp_root / "data" / "scenarios" / scenario_name
    report_dir = tmp_root / ".runtime" / "reports" / "generated" / "scenarios" / scenario_name
    expectation_path = tmp_root / "data" / "scenarios" / "expectations" / f"{scenario_name}.expectation.json"

    _write_json(
        scenario_dir / "manifest.json",
        {
            "version": 2,
            "scenario_id": scenario_name,
            "display_name": scenario_name,
            "bookmark_name": scenario_name,
            "bookmark_description": f"{scenario_name} description",
            "bookmark_date": "1936.1.1.12",
            "default_country": "AAA",
            "featured_tags": ["AAA"],
            "palette_id": "hoi4_vanilla",
            "baseline_hash": "abc123",
            "countries_url": f"data/scenarios/{scenario_name}/countries.json",
            "owners_url": f"data/scenarios/{scenario_name}/owners.by_feature.json",
            "cores_url": f"data/scenarios/{scenario_name}/cores.by_feature.json",
            "audit_url": f"data/scenarios/{scenario_name}/audit.json",
            "strategic_values_url": f"data/scenarios/{scenario_name}/strategic_values.by_feature.json",
            "special_zone_layers_url": f"data/scenarios/{scenario_name}/special_zone_layers.json",
            "city_overrides_url": f"data/scenarios/{scenario_name}/city_overrides.json",
            "capital_hints_url": f"data/scenarios/{scenario_name}/capital_hints.json",
            "summary": {
                "feature_count": 1,
                "owner_count": 1,
                "controller_count": 1,
                "approximate_count": 0,
                "geometry_blocker_count": 0,
                "failed_region_check_count": 0,
                "synthetic_owner_feature_count": 0,
                "strategic_vp_total": 1,
                "strategic_vp_matched": 1,
                "strategic_states_anchored": 1,
                "strategic_states_pooled": 0,
                "strategic_resource_point_count": 1,
            },
            "generated_at": "2026-04-03T00:00:00Z",
            "performance_hints": {"render_profile_default": "balanced"},
            "style_defaults": {"ocean": {"fillColor": "#123456"}},
        },
    )
    _write_json(
        scenario_dir / "city_overrides.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "capitals_by_tag": {"AAA": "CITY::capital"},
            "capital_city_hints": {},
        },
    )
    _write_json(
        scenario_dir / "capital_hints.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "entries": [],
        },
    )
    _write_json(
        scenario_dir / "scenario_mutations.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "generated_at": "",
            "tags": {},
            "countries": {},
            "assignments_by_feature_id": {},
            "capitals": {},
            "geo_locale": {},
            "district_groups": {},
        },
    )
    _write_json(
        scenario_dir / "city_assets.partial.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "generated_at": "",
            "cities": {},
            "audit": {},
        },
    )
    _write_json(
        scenario_dir / "capital_defaults.partial.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "generated_at": "",
            "capitals_by_tag": {},
            "capital_city_hints": {},
            "audit": {},
        },
    )
    _write_json(
        scenario_dir / "countries.json",
        {
            "countries": {
                "AAA": {
                    "feature_count": 1,
                    "controller_feature_count": 1,
                    "entry_kind": "country",
                    "display_name": "AAA",
                }
            }
        },
    )
    _write_json(scenario_dir / "owners.by_feature.json", {"owners": {"F-1": "AAA"}})
    _write_json(scenario_dir / "controllers.by_feature.json", {"controllers": {"F-1": "AAA"}})
    _write_json(scenario_dir / "cores.by_feature.json", {"cores": {"F-1": ["AAA"]}})
    _write_json(
        scenario_dir / "strategic_values.by_feature.json",
        {
            "version": 1,
            "scenario_id": scenario_name,
            "baseline_hash": "abc123",
            "as_of_date": "1936.1.1.12",
            "metrics": {
                "manpower": {"kind": "additive", "min": 0, "max": 100, "p95": 100}
            },
            "buckets": {
                "s1": {
                    "state_id": 1,
                    "owner_tag": "AAA",
                    "attribution": "vp_anchor",
                    "manpower": 100,
                }
            },
            "bucket_by_feature": {"F-1": "s1"},
            "victory_points": [
                {
                    "province_id": 1,
                    "value": 10,
                    "state_id": 1,
                    "owner_tag": "AAA",
                    "name": "Capital",
                    "city_id": "CITY::capital",
                    "stable_key": "id::capital",
                    "host_feature_id": "F-1",
                    "lon": 0,
                    "lat": 0,
                    "match_method": "name_owner_match",
                    "confidence": "high",
                }
            ],
            "resource_points": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [0, 0]},
                        "properties": {
                            "resource": "steel",
                            "amount": 1,
                            "state_id": 1,
                            "owner_tag": "AAA",
                            "anchor_kind": "vp_city",
                            "tier": 3,
                        },
                    }
                ],
            },
            "diagnostics": {
                "vp_total": 1,
                "vp_matched": 1,
                "states_anchored": 1,
                "states_pooled": 0,
                "resource_point_count": 1,
            },
        },
    )
    _write_json(
        scenario_dir / "special_zone_layers.json",
        {
            "version": 1,
            "layers": [],
            "activeLayerId": "",
            "topologyFingerprint": "",
            "diagnostics": [],
        },
    )
    _write_json(
        scenario_dir / "audit.json",
        {
            "diagnostics": {
                "owner_rule_paths": [
                    "data/scenario-rules/hoi4_1936.manual.json",
                    f"data/scenario-rules/{scenario_name}.manual.json",
                ]
            },
            "summary": {
                "feature_count": 1,
                "owner_count": 1,
                "controller_count": 1,
                "approximate_count": 0,
                "geometry_blocker_count": 0,
                "failed_region_check_count": 0,
                "synthetic_owner_feature_count": 0,
            }
        },
    )
    _write_json(
        expectation_path,
        {
            "scenario_id": scenario_name,
            "require_controllers": True,
            "manifest_required_fields": ["strategic_values_url"],
            "summary_equals": {"feature_count": 1},
            "strategic_diagnostics_min": {
                "vp_total": 1,
                "vp_matched": 1,
                "states_anchored": 1,
            },
            "featured_tags_contains": ["AAA"],
            "diagnostics_equals": {
                "owner_rule_paths": [
                    "data/scenario-rules/hoi4_1936.manual.json",
                    f"data/scenario-rules/{scenario_name}.manual.json",
                ]
            },
            "owner_set_assertions": [
                {
                    "name": "aaa owners",
                    "expected_owner_tag": "AAA",
                    "feature_ids": ["F-1"],
                }
            ],
        },
    )
    _write_text(
        report_dir / "coverage_report.md",
        "\n".join(
            [
                "Features assigned: `1`",
                "Owners present: `1`",
                "Geometry blockers: `0`",
                "Failed region checks: `0`",
                "Synthetic-owner features: `0`",
                "- `approx_existing_geometry`: `0`",
            ]
        ),
    )
    return scenario_dir, report_dir, expectation_path


class CheckHoi4ScenarioBundleTest(unittest.TestCase):
    def test_inspect_hoi4_scenario_bundle_passes_when_domain_report_and_expectation_match(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root)
            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["shared_errors"], [])
            self.assertEqual(report["domain_errors"], [])

    def test_inspect_hoi4_scenario_bundle_enforces_featured_tags_and_diagnostics_expectations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root, scenario_name="hoi4_1939")
            expectation = json.loads(expectation_path.read_text(encoding="utf-8"))
            expectation["featured_tags_contains"] = ["AAA", "SOV"]
            expectation["diagnostics_equals"] = {
                "owner_rule_paths": [
                    "data/scenario-rules/hoi4_1936.manual.json",
                    "data/scenario-rules/hoi4_1939.manual.json",
                ]
            }
            _write_json(expectation_path, expectation)
            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "failed")
            self.assertTrue(any("manifest.featured_tags must include" in error for error in report["domain_errors"]))

    def test_inspect_hoi4_scenario_bundle_keeps_domain_report_checks(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root)
            _write_text(
                report_dir / "coverage_report.md",
                "\n".join(
                    [
                        "Features assigned: `2`",
                        "Owners present: `1`",
                        "Geometry blockers: `0`",
                        "Failed region checks: `0`",
                        "Synthetic-owner features: `0`",
                        "- `approx_existing_geometry`: `0`",
                    ]
                ),
            )
            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "failed")
            self.assertFalse(report["shared_errors"])
            self.assertTrue(
                any("coverage_report.md feature_count must equal audit.summary.feature_count." in error for error in report["domain_errors"])
            )

    def test_inspect_hoi4_scenario_bundle_skips_controller_payload_assertions_when_optional(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root, scenario_name="hoi4_1939")
            (scenario_dir / "controllers.by_feature.json").unlink()
            expectation = json.loads(expectation_path.read_text(encoding="utf-8"))
            expectation["require_controllers"] = False
            expectation["controller_set_assertions"] = [
                {
                    "name": "legacy controller assertion",
                    "expected_controller_tag": "AAA",
                    "feature_ids": ["F-1"],
                }
            ]
            _write_json(expectation_path, expectation)

            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "ok")

    def test_inspect_hoi4_scenario_bundle_ignores_strict_bundle_only_mismatches(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root, scenario_name="hoi4_1939")
            _write_json(
                scenario_dir / "controllers.by_feature.json",
                {"controllers": {"F-1": "AAA", "F-2": "AAA"}},
            )
            _write_json(
                scenario_dir / "cores.by_feature.json",
                {"cores": {"F-1": ["AAA"], "F-2": ["AAA"]}},
            )
            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["shared_errors"], [])
            self.assertEqual(report["domain_errors"], [])

    def test_inspect_hoi4_scenario_bundle_rejects_stale_strategic_baseline(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root)
            strategic_path = scenario_dir / "strategic_values.by_feature.json"
            strategic_payload = json.loads(strategic_path.read_text(encoding="utf-8"))
            strategic_payload["baseline_hash"] = "stale"
            _write_json(strategic_path, strategic_payload)

            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "failed")
            self.assertTrue(
                any("strategic_values.by_feature.json.baseline_hash" in error for error in report["domain_errors"])
            )

    def test_inspect_hoi4_scenario_bundle_rejects_partial_strategic_feature_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            scenario_dir, report_dir, expectation_path = _create_valid_hoi4_bundle(tmp_root)
            _write_json(
                scenario_dir / "owners.by_feature.json",
                {"owners": {"F-1": "AAA", "F-2": "AAA"}},
            )
            _write_json(
                scenario_dir / "controllers.by_feature.json",
                {"controllers": {"F-1": "AAA", "F-2": "AAA"}},
            )
            _write_json(
                scenario_dir / "cores.by_feature.json",
                {"cores": {"F-1": ["AAA"], "F-2": ["AAA"]}},
            )
            strategic_path = scenario_dir / "strategic_values.by_feature.json"
            strategic_payload = json.loads(strategic_path.read_text(encoding="utf-8"))
            strategic_payload["bucket_by_feature"] = {"F-1": "s1"}
            _write_json(strategic_path, strategic_payload)

            previous_project_root = check_scenario_contracts.PROJECT_ROOT
            check_scenario_contracts.PROJECT_ROOT = tmp_root
            try:
                report = inspect_hoi4_scenario_bundle(
                    scenario_dir,
                    report_dir,
                    expectation_path=expectation_path,
                )
            finally:
                check_scenario_contracts.PROJECT_ROOT = previous_project_root

            self.assertEqual(report["status"], "failed")
            self.assertTrue(
                any("bucket_by_feature is missing owner feature IDs" in error for error in report["domain_errors"]),
                report["domain_errors"],
            )
