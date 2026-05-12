from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from map_builder.transport_workbench_contracts import validate_transport_manifest
from tools.check_transport_workbench_manifests import discover_manifest_paths, inspect_transport_manifests


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT_BUILDER = PROJECT_ROOT / "tools" / "build_transport_workbench_japan_ports.py"
INDUSTRIAL_BUILDER = PROJECT_ROOT / "tools" / "build_transport_workbench_japan_industrial_zones.py"
RUNTIME_ASSET_REGISTRY = PROJECT_ROOT / "data" / "runtime_asset_registry.json"
CATALOG_JSON = PROJECT_ROOT / "data" / "CATALOG.json"


class TransportManifestContractsTest(unittest.TestCase):
    def test_checked_in_transport_manifests_pass_shared_contract(self) -> None:
        manifest_paths = discover_manifest_paths(PROJECT_ROOT / "data" / "transport_layers")
        reports = inspect_transport_manifests(manifest_paths)
        failed = [report for report in reports if report.get("status") != "ok"]
        self.assertFalse(failed, failed)

    def test_recursive_manifest_discovery_includes_rail_region_shards(self) -> None:
        manifest_paths = discover_manifest_paths(PROJECT_ROOT / "data" / "transport_layers")
        normalized_paths = [str(path.relative_to(PROJECT_ROOT)).replace("\\", "/") for path in manifest_paths]
        self.assertTrue(
            any(path.startswith("data/transport_layers/global_rail/regions/") for path in normalized_paths),
            normalized_paths,
        )

    def test_validator_rejects_legacy_variant_fields(self) -> None:
        manifest = {
            "adapter_id": "japan_port_v1",
            "family": "port",
            "geometry_kind": "point",
            "generated_at": "2026-04-03T00:00:00Z",
            "recipe_version": "v1",
            "feature_counts": {"preview": {"ports": 1}, "full": {"ports": 1}},
            "source_policy": "local_source_cache_only",
            "distribution_tier": "coverage_tiered",
            "paths": {"preview": {"ports": "preview.geojson"}, "full": {"ports": "full.geojson"}},
            "default_variant": "expanded",
            "variants": {
                "core": {
                    "distribution_tier": "curated_core",
                    "paths": {"preview": {"ports": "preview.geojson"}, "full": {"ports": "full.geojson"}},
                    "feature_counts": {"preview": {"ports": 1}, "full": {"ports": 1}},
                }
            },
            "default_coverage_tier": "core",
            "coverage_variants": {
                "core": {
                    "distribution_tier": "curated_core",
                    "paths": {"preview": {"ports": "preview.geojson"}, "full": {"ports": "full.geojson"}},
                    "feature_counts": {"preview": {"ports": 1}, "full": {"ports": 1}},
                }
            },
        }

        errors = validate_transport_manifest(manifest, source_label="port-manifest")

        self.assertTrue(
            any("legacy transport variant field" in error for error in errors),
            errors,
        )

    def test_validator_rejects_empty_feature_counts_for_feature_manifests(self) -> None:
        manifest = {
            "adapter_id": "empty_point_v1",
            "family": "road",
            "geometry_kind": "line",
            "generated_at": "2026-05-07T00:00:00Z",
            "recipe_version": "v1",
            "feature_counts": {},
            "source_policy": "local_source_cache_only",
            "distribution_tier": "single_pack",
            "paths": {"preview": {"roads": "preview.topo.json"}},
            "default_variant": "default",
            "variants": {
                "default": {
                    "distribution_tier": "single_pack",
                    "paths": {"preview": {"roads": "preview.topo.json"}},
                    "feature_counts": {},
                }
            },
        }

        errors = validate_transport_manifest(manifest, source_label="road-manifest")

        self.assertTrue(any("feature_counts" in error for error in errors), errors)

    def test_validator_rejects_boolean_feature_counts(self) -> None:
        manifest = {
            "adapter_id": "boolean_count_v1",
            "family": "road",
            "geometry_kind": "line",
            "generated_at": "2026-05-11T00:00:00Z",
            "recipe_version": "v1",
            "feature_counts": {"preview": {"roads": True}},
            "source_policy": "local_source_cache_only",
            "distribution_tier": "single_pack",
            "paths": {"preview": {"roads": "preview.topo.json"}},
            "default_variant": "default",
            "variants": {
                "default": {
                    "distribution_tier": "single_pack",
                    "paths": {"preview": {"roads": "preview.topo.json"}},
                    "feature_counts": {"preview": {"roads": False}},
                }
            },
        }

        errors = validate_transport_manifest(manifest, source_label="road-manifest")

        self.assertTrue(any("feature_counts" in error for error in errors), errors)

    def test_validator_rejects_carrier_family_without_carrier_geometry_kind(self) -> None:
        manifest = {
            "adapter_id": "bad_carrier_v1",
            "family": "carrier",
            "geometry_kind": "line",
            "generated_at": "2026-05-11T00:00:00Z",
            "recipe_version": "v1",
            "feature_counts": {},
            "source_policy": "local_source_cache_only",
            "distribution_tier": "single_pack",
            "paths": {"carrier": "carrier.json", "provenance": "provenance.json"},
            "default_variant": "default",
            "variants": {
                "default": {
                    "distribution_tier": "single_pack",
                    "paths": {"carrier": "carrier.json"},
                    "feature_counts": {},
                }
            },
        }

        errors = validate_transport_manifest(manifest, source_label="carrier-manifest")

        self.assertTrue(any("carrier family requires geometry_kind" in error for error in errors), errors)
        self.assertTrue(any("feature_counts" in error for error in errors), errors)

    def test_checked_in_transport_manifests_do_not_keep_legacy_variant_fields(self) -> None:
        manifest_paths = discover_manifest_paths(PROJECT_ROOT / "data" / "transport_layers")
        legacy_fields = {
            "default_coverage_tier",
            "coverage_variants",
            "default_distribution_variant",
            "distribution_variants",
        }
        offenders: list[tuple[str, list[str]]] = []
        for path in manifest_paths:
            manifest = json.loads(path.read_text(encoding="utf-8"))
            present = sorted(field for field in legacy_fields if field in manifest)
            if present:
                offenders.append((str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"), present))

        self.assertFalse(offenders, offenders)

    def test_transport_builders_no_longer_emit_legacy_variant_fields(self) -> None:
        legacy_field_names = (
            "default_coverage_tier",
            "coverage_variants",
            "default_distribution_variant",
            "distribution_variants",
        )

        for builder_path in (PORT_BUILDER, INDUSTRIAL_BUILDER):
            content = builder_path.read_text(encoding="utf-8")
            for field_name in legacy_field_names:
                self.assertNotIn(f'"{field_name}"', content, builder_path.as_posix())

    def test_carrier_manifest_is_valid_under_shared_contract(self) -> None:
        carrier_manifest = json.loads(
            (PROJECT_ROOT / "data" / "transport_layers" / "japan_corridor" / "manifest.json").read_text(encoding="utf-8")
        )
        errors = validate_transport_manifest(carrier_manifest, source_label="carrier")
        self.assertFalse(errors, errors)

    def test_carrier_runtime_asset_key_and_catalog_key_share_the_same_url(self) -> None:
        runtime_asset_registry = json.loads(RUNTIME_ASSET_REGISTRY.read_text(encoding="utf-8"))
        catalog_payload = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        catalog_entries = {entry["key"]: entry for entry in catalog_payload.get("entries") or []}

        runtime_url = runtime_asset_registry["assets"]["transport_carrier:japan_corridor"]["url"]
        catalog_url = catalog_entries["transport:japan_corridor:carrier"]["url"]

        self.assertEqual(runtime_url, "data/transport_layers/japan_corridor/carrier.json")
        self.assertEqual(catalog_url, runtime_url)
