"""Load the runtime asset registry source of truth from checked-in JSON."""
from __future__ import annotations

from functools import lru_cache
import json
from pathlib import Path
from typing import Any

from map_builder.json_schema_contracts import validate_json_contract


RUNTIME_ASSET_REGISTRY_PATH = Path(__file__).resolve().parents[1] / "data" / "runtime_asset_registry.json"


def _normalize_text(value: object) -> str:
    return str(value or "").strip()


def _require_asset_key(
    assets: dict[str, Any],
    asset_key: object,
    *,
    source_label: str,
    expected_role: str | None = None,
) -> str:
    normalized_asset_key = _normalize_text(asset_key)
    if not normalized_asset_key or normalized_asset_key not in assets:
        raise ValueError(f"{source_label} must reference an existing asset")
    if expected_role:
        raw_spec = assets[normalized_asset_key]
        spec = raw_spec if isinstance(raw_spec, dict) else {}
        if _normalize_text(spec.get("role")) != expected_role:
            raise ValueError(f"{source_label} must reference an asset with role {expected_role}")
    return normalized_asset_key


def _validate_runtime_asset_registry(payload: object) -> dict[str, Any]:
    schema_errors = validate_json_contract(
        payload,
        schema_name="runtime_asset_registry.schema.json",
        source_label="runtime_asset_registry",
    )
    if schema_errors:
        raise ValueError("\n".join(schema_errors))

    registry = payload
    if not isinstance(registry, dict):
        raise ValueError("runtime_asset_registry must be a JSON object")
    assets = registry.get("assets")
    if not isinstance(assets, dict):
        raise ValueError("runtime_asset_registry.assets must be a JSON object")
    for asset_key, raw_spec in assets.items():
        spec = raw_spec if isinstance(raw_spec, dict) else {}
        if not _normalize_text(spec.get("url")):
            raise ValueError(f"runtime_asset_registry.assets.{asset_key}.url must be non-empty")
    _require_asset_key(
        assets,
        registry.get("scenario_registry_key"),
        source_label="runtime_asset_registry.scenario_registry_key",
    )
    transport_manifest_keys = registry.get("transport_manifest_keys")
    if not isinstance(transport_manifest_keys, dict):
        raise ValueError("runtime_asset_registry.transport_manifest_keys must be a JSON object")
    for family_id, asset_key in transport_manifest_keys.items():
        _require_asset_key(
            assets,
            asset_key,
            source_label=f"runtime_asset_registry.transport_manifest_keys.{family_id}",
        )
    thematic_layer_index_key = _normalize_text(registry.get("thematic_layer_index_key"))
    if thematic_layer_index_key:
        _require_asset_key(
            assets,
            thematic_layer_index_key,
            source_label="runtime_asset_registry.thematic_layer_index_key",
            expected_role="thematic_layer_catalog",
        )
    thematic_layer_manifest_keys = registry.get("thematic_layer_manifest_keys")
    if thematic_layer_manifest_keys is not None:
        if not isinstance(thematic_layer_manifest_keys, dict):
            raise ValueError("runtime_asset_registry.thematic_layer_manifest_keys must be a JSON object")
        for layer_id, asset_key in thematic_layer_manifest_keys.items():
            _require_asset_key(
                assets,
                asset_key,
                source_label=f"runtime_asset_registry.thematic_layer_manifest_keys.{layer_id}",
                expected_role="thematic_layer_manifest",
            )
    return registry


@lru_cache(maxsize=1)
def load_runtime_asset_registry() -> dict[str, Any]:
    return _validate_runtime_asset_registry(json.loads(RUNTIME_ASSET_REGISTRY_PATH.read_text(encoding="utf-8")))
