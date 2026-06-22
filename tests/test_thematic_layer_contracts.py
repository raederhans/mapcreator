from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from map_builder.thematic_layer_contracts import (
    MISSING_SOURCE_STATUSES,
    validate_thematic_admin_metrics,
    validate_thematic_build_audit,
    validate_thematic_grid_rle,
    validate_thematic_layer_index,
    validate_thematic_layer_manifest,
)
from tools.build_thematic_layers import (
    THEMATIC_RUNTIME_PUBLISH_SCOPE,
    THEMATIC_RUNTIME_READINESS,
    build_payloads,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = REPO_ROOT / "data"
THEMATIC_ROOT = DATA_ROOT / "thematic_layers"
INDEX_PATH = THEMATIC_ROOT / "index.json"
RUNTIME_ASSET_REGISTRY_PATH = DATA_ROOT / "runtime_asset_registry.json"
EXPECTED_LAYER_IDS = {
    "political_state_capacity_demo",
    "social_human_development_demo",
    "population_density_demo",
}


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _repo_path(repo_relative_path: str) -> Path:
    return REPO_ROOT / repo_relative_path


def _iter_layer_manifests() -> list[tuple[dict, dict]]:
    index_payload = _read_json(INDEX_PATH)
    return [
        (layer, _read_json(_repo_path(layer["manifest_path"])))
        for layer in index_payload["layers"]
    ]


def _grid_payload() -> tuple[dict, dict]:
    for layer, manifest in _iter_layer_manifests():
        if layer["layer_id"] == "population_density_demo":
            return manifest, _read_json(_repo_path(manifest["paths"]["grid"]))
    raise AssertionError("population_density_demo layer not found")


class ThematicLayerContractTest(unittest.TestCase):
    def test_checked_in_index_matches_builder_and_schema(self) -> None:
        index_payload = _read_json(INDEX_PATH)
        rebuilt = build_payloads(index_payload["generated_at"])

        self.assertEqual(index_payload, rebuilt["thematic_layers/index.json"])
        self.assertEqual(validate_thematic_layer_index(index_payload), [])
        self.assertEqual({layer["layer_id"] for layer in index_payload["layers"]}, EXPECTED_LAYER_IDS)

    def test_manifest_payloads_validate_and_point_to_existing_files(self) -> None:
        for layer, manifest in _iter_layer_manifests():
            with self.subTest(layer_id=layer["layer_id"]):
                self.assertEqual(validate_thematic_layer_manifest(manifest, source_label=layer["manifest_path"]), [])
                self.assertEqual(manifest["layer_id"], layer["layer_id"])
                self.assertEqual(manifest["source_policy"], "fixture_only")
                self.assertGreaterEqual(len(manifest["limitations"]), 1)

                paths = manifest["paths"]
                payload_key = "grid" if manifest["geometry_kind"] == "grid_720x360" else "metrics"
                self.assertTrue(_repo_path(paths[payload_key]).is_file())
                self.assertTrue(_repo_path(paths["build_audit"]).is_file())
                for recipe_path in paths["source_recipes"]:
                    recipe = _read_json(_repo_path(recipe_path))
                    self.assertFalse(recipe["download_policy"]["network_allowed"])

    def test_admin_metric_payloads_preserve_missing_values_as_null(self) -> None:
        for _layer, manifest in _iter_layer_manifests():
            if manifest["geometry_kind"] == "grid_720x360":
                continue
            metrics_path = _repo_path(manifest["paths"]["metrics"])
            metrics_payload = _read_json(metrics_path)
            errors = validate_thematic_admin_metrics(metrics_payload, source_label=manifest["paths"]["metrics"])
            self.assertEqual(errors, [])

            missing_seen = False
            for feature in metrics_payload["features"]:
                for metric_payload in feature["values"].values():
                    if metric_payload["source_status"] in MISSING_SOURCE_STATUSES:
                        missing_seen = True
                        self.assertIsNone(metric_payload["raw_value"])
                        self.assertIsNone(metric_payload["normalized_value"])
                    else:
                        self.assertIsInstance(metric_payload["raw_value"], (int, float))
                        self.assertIsInstance(metric_payload["normalized_value"], (int, float))
            self.assertTrue(missing_seen)

    def test_grid_rle_contract_matches_declared_grid_size(self) -> None:
        manifest, grid_payload = _grid_payload()
        errors = validate_thematic_grid_rle(grid_payload, source_label=manifest["paths"]["grid"])

        self.assertEqual(errors, [])
        self.assertEqual(grid_payload["grid"]["columns"], 720)
        self.assertEqual(grid_payload["grid"]["rows"], 360)
        self.assertEqual(grid_payload["missing_cell_count"], 0)
        self.assertEqual(grid_payload["missing_value_policy"]["source_gap_encoding"], "none")
        self.assertEqual(sum(run[1] for run in grid_payload["data"]), 720 * 360)
        self.assertGreater(sum(1 for run in grid_payload["data"] if run[0] != grid_payload["neutral_value"]), 0)

    def test_grid_rle_requires_missing_mask_when_missing_cells_exist(self) -> None:
        manifest, grid_payload = _grid_payload()
        broken_payload = copy.deepcopy(grid_payload)
        broken_payload["missing_cell_count"] = 1

        errors = validate_thematic_grid_rle(broken_payload, source_label=manifest["paths"]["grid"])

        self.assertTrue(any("missing_mask_rle" in error for error in errors), errors)

    def test_build_audits_validate_and_mark_fixture_inputs(self) -> None:
        for _layer, manifest in _iter_layer_manifests():
            audit_path = _repo_path(manifest["build_audit_path"])
            audit_payload = _read_json(audit_path)
            errors = validate_thematic_build_audit(audit_payload, source_label=manifest["build_audit_path"])

            self.assertEqual(errors, [])
            self.assertTrue(audit_payload["fixture_notice"]["enabled"])
            self.assertGreaterEqual(audit_payload["coverage_summary"]["features"], 1)
            for source_input in audit_payload["source_inputs"]:
                self.assertEqual(source_input["source_policy"], "fixture_only")

    def test_runtime_asset_registry_declares_thematic_catalog_and_manifests(self) -> None:
        registry = _read_json(RUNTIME_ASSET_REGISTRY_PATH)
        assets = registry["assets"]

        self.assertEqual(registry["thematic_layer_index_key"], "thematic_layer_catalog")
        self.assertEqual(
            set(registry["thematic_layer_manifest_keys"]),
            EXPECTED_LAYER_IDS,
        )
        self.assertEqual(assets["thematic_layer_catalog"]["url"], "data/thematic_layers/index.json")
        self.assertEqual(
            assets["thematic_layer_catalog"]["metadata"]["publish_scope"],
            THEMATIC_RUNTIME_PUBLISH_SCOPE,
        )
        self.assertEqual(
            assets["thematic_layer_catalog"]["metadata"]["runtime_readiness"],
            THEMATIC_RUNTIME_READINESS,
        )
        for layer_id, asset_key in registry["thematic_layer_manifest_keys"].items():
            with self.subTest(layer_id=layer_id):
                self.assertIn(asset_key, assets)
                manifest = _read_json(_repo_path(assets[asset_key]["url"]))
                metadata = assets[asset_key]["metadata"]
                self.assertEqual(metadata["layer_id"], layer_id)
                self.assertEqual(metadata["source_policy"], manifest["source_policy"])
                self.assertEqual(metadata["publish_scope"], THEMATIC_RUNTIME_PUBLISH_SCOPE)
                self.assertEqual(metadata["runtime_readiness"], THEMATIC_RUNTIME_READINESS)


if __name__ == "__main__":
    unittest.main()
