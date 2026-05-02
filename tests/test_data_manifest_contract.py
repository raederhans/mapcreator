from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_MANIFEST = REPO_ROOT / "data" / "manifest.json"
DATA_LOADER = REPO_ROOT / "js" / "core" / "data_loader.js"
RUNTIME_ASSET_REGISTRY_SOURCE = REPO_ROOT / "data" / "runtime_asset_registry.json"
RUNTIME_ASSET_REGISTRY_JS = REPO_ROOT / "js" / "core" / "runtime_asset_registry.js"
HISTORICAL_1930_CITY_LIGHTS_ASSET = REPO_ROOT / "js" / "core" / "city_lights_historical_1930_asset.js"


def _resolve_manifest_output_path(relative_path: str) -> Path:
    if relative_path.startswith("js/"):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


def _resolve_runtime_asset_path(relative_path: str) -> Path:
    if relative_path.startswith(("data/", "js/")):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


class DataManifestContractTest(unittest.TestCase):
    def test_manifest_output_hashes_match_checked_in_artifacts(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        mismatches: list[str] = []

        for relative_path, metadata in manifest["outputs"].items():
            output_path = _resolve_manifest_output_path(relative_path)
            if not output_path.is_file():
                mismatches.append(f"{relative_path}: missing")
                continue
            output_bytes = output_path.read_bytes()
            actual_size = output_path.stat().st_size
            actual_sha = hashlib.sha256(output_bytes).hexdigest()
            if metadata.get("size_bytes") != actual_size or metadata.get("sha256") != actual_sha:
                mismatches.append(f"{relative_path}: size/hash drift")

        self.assertEqual(mismatches, [])

    def test_runtime_asset_registry_declares_phase1_assets(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        registry = manifest.get("runtime_asset_registry") or {}
        source_registry = json.loads(RUNTIME_ASSET_REGISTRY_SOURCE.read_text(encoding="utf-8"))
        assets = source_registry.get("assets") or {}
        mismatches: list[str] = []
        loader_source = DATA_LOADER.read_text(encoding="utf-8")
        registry_source = RUNTIME_ASSET_REGISTRY_JS.read_text(encoding="utf-8")

        self.assertEqual(registry, source_registry)
        self.assertIn('../../data/runtime_asset_registry.json', registry_source)
        self.assertIn('resolveDataAssetUrl', registry_source)
        self.assertIn('resolveScenarioRegistryUrl', registry_source)
        self.assertIn('resolveTransportManifestUrl', registry_source)
        self.assertIn('./runtime_asset_registry.js', loader_source)

        for asset_key, metadata in assets.items():
            expected_url = metadata.get("url")
            actual_url = registry.get("assets", {}).get(asset_key, {}).get("url")
            if actual_url != expected_url:
                mismatches.append(f"{asset_key}: expected {expected_url}, got {actual_url}")
                continue
            if not _resolve_runtime_asset_path(expected_url).is_file():
                mismatches.append(f"{asset_key}: target missing at {expected_url}")

        self.assertEqual(mismatches, [])

    def test_historical_1930_city_lights_source_refs_are_repo_relative(self) -> None:
        asset_source = HISTORICAL_1930_CITY_LIGHTS_ASSET.read_text(encoding="utf-8")
        self.assertIn('sourceKey: "city_lights:historical_1930:source"', asset_source)
        self.assertIn('exclusionsKey: "city_lights:historical_1930:exclusions"', asset_source)
        self.assertIn('sourceRefParts: ["data", "world_cities.geojson"]', asset_source)
        self.assertIn('exclusionsRefParts: ["data", "historical_city_lights_1930_exclusions.json"]', asset_source)
        self.assertNotIn("file:///", asset_source)
        self.assertNotIn("C:/", asset_source)


if __name__ == "__main__":
    unittest.main()
