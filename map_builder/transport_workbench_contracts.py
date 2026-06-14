from __future__ import annotations

from copy import deepcopy
from typing import Any

from map_builder.json_schema_contracts import validate_json_contract


TRANSPORT_LEGACY_VARIANT_FIELDS = (
    "default_coverage_tier",
    "coverage_variants",
    "default_distribution_variant",
    "distribution_variants",
)


def _has_value(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def _has_feature_count_value(value: object) -> bool:
    if not isinstance(value, dict) or not value:
        return False
    for child in value.values():
        if isinstance(child, dict):
            if _has_feature_count_value(child):
                return True
            continue
        if isinstance(child, (int, float)) and not isinstance(child, bool) and child >= 0:
            return True
    return False


def finalize_transport_manifest(
    manifest: dict[str, Any],
    *,
    default_variant: str,
    variants: dict[str, Any],
    extension: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = deepcopy(manifest)
    payload["default_variant"] = str(default_variant).strip()
    payload["variants"] = deepcopy(variants)
    if extension:
        extensions = payload.setdefault("extensions", {})
        family = str(payload.get("family") or "").strip()
        if family:
            extensions[family] = deepcopy(extension)
    return payload


def validate_transport_manifest(
    manifest: dict[str, Any],
    *,
    source_label: str = "manifest.json",
) -> list[str]:
    errors = validate_json_contract(
        manifest,
        schema_name="transport_manifest.schema.json",
        source_label=source_label,
    )
    if not isinstance(manifest, dict):
        return errors

    family = str(manifest.get("family") or "").strip()
    geometry_kind = str(manifest.get("geometry_kind") or "").strip()
    is_carrier_manifest = family == "carrier" and geometry_kind == "carrier"

    if not is_carrier_manifest and not _has_feature_count_value(manifest.get("feature_counts")):
        errors.append(f"{source_label}: `feature_counts` must contain at least one numeric count.")

    for legacy_field in TRANSPORT_LEGACY_VARIANT_FIELDS:
        if legacy_field in manifest:
            errors.append(
                f"{source_label}: legacy transport variant field `{legacy_field}` is no longer allowed."
            )

    if geometry_kind == "carrier" and family != "carrier":
        errors.append(f"{source_label}: carrier geometry_kind requires family `carrier`.")
    if family == "carrier" and geometry_kind != "carrier":
        errors.append(f"{source_label}: carrier family requires geometry_kind `carrier`.")

    paths = manifest.get("paths")
    variants = manifest.get("variants")
    if not isinstance(variants, dict):
        return errors

    default_variant = str(manifest.get("default_variant") or "").strip()
    if default_variant and default_variant not in variants:
        errors.append(
            f"{source_label}: `default_variant` must exist in `variants`. Missing `{default_variant}`."
        )

    for variant_id, raw_variant in variants.items():
        if not isinstance(raw_variant, dict):
            errors.append(f"{source_label}: variant `{variant_id}` must be an object.")
            continue
        if not _has_value(raw_variant.get("distribution_tier")):
            errors.append(f"{source_label}: variant `{variant_id}` missing `distribution_tier`.")
        if not isinstance(raw_variant.get("paths"), dict):
            errors.append(f"{source_label}: variant `{variant_id}` missing `paths` object.")
        if not is_carrier_manifest and not _has_feature_count_value(raw_variant.get("feature_counts")):
            errors.append(f"{source_label}: variant `{variant_id}` missing non-empty `feature_counts` object.")

    if is_carrier_manifest:
        if not isinstance(paths, dict):
            return errors
        if not _has_value(paths.get("carrier")):
            errors.append(f"{source_label}: carrier manifest must declare `paths.carrier`.")
        if not _has_value(paths.get("provenance")):
            errors.append(f"{source_label}: carrier manifest must declare `paths.provenance`.")

    return errors
