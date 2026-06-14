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
    scenario_registry_key = _normalize_text(registry.get("scenario_registry_key"))
    if not scenario_registry_key or scenario_registry_key not in assets:
        raise ValueError("runtime_asset_registry.scenario_registry_key must reference an existing asset")
    transport_manifest_keys = registry.get("transport_manifest_keys")
    if not isinstance(transport_manifest_keys, dict):
        raise ValueError("runtime_asset_registry.transport_manifest_keys must be a JSON object")
    for family_id, asset_key in transport_manifest_keys.items():
        normalized_asset_key = _normalize_text(asset_key)
        if not normalized_asset_key or normalized_asset_key not in assets:
            raise ValueError(
                f"runtime_asset_registry.transport_manifest_keys.{family_id} must reference an existing asset"
            )
    return registry


@lru_cache(maxsize=1)
def load_runtime_asset_registry() -> dict[str, Any]:
    return _validate_runtime_asset_registry(json.loads(RUNTIME_ASSET_REGISTRY_PATH.read_text(encoding="utf-8")))
