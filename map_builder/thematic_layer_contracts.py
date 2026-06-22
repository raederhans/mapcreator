"""Contracts for checked-in thematic layer foundation assets."""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from map_builder.json_schema_contracts import validate_json_contract


MISSING_SOURCE_STATUSES = {
    "missing",
    "not_applicable",
    "partial_source_gap",
    "source_gap",
    "unmatched",
}


def read_thematic_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _schema_errors(payload: object, *, schema_name: str, source_label: str) -> list[str]:
    return validate_json_contract(payload, schema_name=schema_name, source_label=source_label)


def _format_path(parts: list[str]) -> str:
    return "$." + ".".join(parts) if parts else "$"


def _dict_field(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    return value if isinstance(value, dict) else {}


def _list_field(payload: dict[str, Any], key: str) -> list[Any]:
    value = payload.get(key)
    return value if isinstance(value, list) else []


def _rle_cell_total(runs: object) -> int:
    total = 0
    iterable = runs if isinstance(runs, list) else []
    for run in iterable:
        if isinstance(run, list) and len(run) == 2 and isinstance(run[1], int):
            total += run[1]
    return total


def _rle_value_count(runs: object, expected_value: int) -> int:
    total = 0
    iterable = runs if isinstance(runs, list) else []
    for run in iterable:
        if (
            isinstance(run, list)
            and len(run) == 2
            and isinstance(run[0], int)
            and isinstance(run[1], int)
            and run[0] == expected_value
        ):
            total += run[1]
    return total


def _is_finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def validate_thematic_layer_index(
    payload: object,
    *,
    source_label: str = "thematic layer index",
) -> list[str]:
    errors = _schema_errors(
        payload,
        schema_name="thematic_layer_index.schema.json",
        source_label=source_label,
    )
    if not isinstance(payload, dict):
        return errors

    layer_ids: set[str] = set()
    for index, layer in enumerate(payload.get("layers") or []):
        if not isinstance(layer, dict):
            continue
        layer_id = str(layer.get("layer_id") or "").strip()
        if not layer_id:
            continue
        if layer_id in layer_ids:
            errors.append(f"{source_label}: $.layers.{index}.layer_id duplicates {layer_id}")
        layer_ids.add(layer_id)
    return errors


def validate_thematic_layer_manifest(
    payload: object,
    *,
    source_label: str = "thematic layer manifest",
) -> list[str]:
    errors = _schema_errors(
        payload,
        schema_name="thematic_layer_manifest.schema.json",
        source_label=source_label,
    )
    if not isinstance(payload, dict):
        return errors

    paths = _dict_field(payload, "paths")
    build_audit_path = str(payload.get("build_audit_path") or "").strip()
    if build_audit_path and build_audit_path != str(paths.get("build_audit") or "").strip():
        errors.append(f"{source_label}: $.build_audit_path must match $.paths.build_audit")
    return errors


def validate_thematic_admin_metrics(
    payload: object,
    *,
    source_label: str = "thematic admin metrics",
) -> list[str]:
    errors = _schema_errors(
        payload,
        schema_name="thematic_admin_metrics.schema.json",
        source_label=source_label,
    )
    if not isinstance(payload, dict):
        return errors

    metric_ids = {str(metric_id) for metric_id in _list_field(payload, "metric_ids")}
    for feature_index, feature in enumerate(_list_field(payload, "features")):
        if not isinstance(feature, dict):
            continue
        values = _dict_field(feature, "values")
        missing_metrics = sorted(metric_ids.difference(values))
        if missing_metrics:
            errors.append(
                f"{source_label}: $.features.{feature_index}.values missing metrics {', '.join(missing_metrics)}"
            )
        for metric_id, metric_payload in values.items():
            if not isinstance(metric_payload, dict):
                continue
            metric_path = _format_path(["features", str(feature_index), "values", str(metric_id)])
            source_status = str(metric_payload.get("source_status") or "")
            raw_value = metric_payload.get("raw_value")
            normalized_value = metric_payload.get("normalized_value")
            if source_status in MISSING_SOURCE_STATUSES:
                if raw_value is not None or normalized_value is not None:
                    errors.append(
                        f"{source_label}: {metric_path} missing-status values must use null raw_value and normalized_value"
                    )
            elif raw_value is None or normalized_value is None:
                errors.append(f"{source_label}: {metric_path} observed values must not be null")
            else:
                if not _is_finite_number(raw_value):
                    errors.append(f"{source_label}: {metric_path}.raw_value must be a finite number")
                if not _is_finite_number(normalized_value):
                    errors.append(f"{source_label}: {metric_path}.normalized_value must be a finite number")
                elif not 0 <= float(normalized_value) <= 100:
                    errors.append(f"{source_label}: {metric_path}.normalized_value must be between 0 and 100")
    return errors


def validate_thematic_grid_rle(
    payload: object,
    *,
    source_label: str = "thematic grid rle",
) -> list[str]:
    errors = _schema_errors(
        payload,
        schema_name="thematic_grid_rle.schema.json",
        source_label=source_label,
    )
    if not isinstance(payload, dict):
        return errors

    grid = _dict_field(payload, "grid")
    expected_cells = int(grid.get("columns") or 0) * int(grid.get("rows") or 0)
    actual_cells = _rle_cell_total(payload.get("data"))
    if expected_cells and actual_cells != expected_cells:
        errors.append(
            f"{source_label}: $.data run length total {actual_cells} must equal grid cell count {expected_cells}"
        )
    missing_cell_count = payload.get("missing_cell_count")
    missing_policy = _dict_field(payload, "missing_value_policy")
    if isinstance(missing_cell_count, int) and missing_cell_count > 0:
        if missing_policy.get("source_gap_encoding") == "none":
            errors.append(f"{source_label}: $.missing_value_policy.source_gap_encoding cannot be none with missing cells")
        missing_mask = payload.get("missing_mask_rle")
        if not isinstance(missing_mask, list):
            errors.append(f"{source_label}: $.missing_mask_rle is required when missing_cell_count is greater than zero")
        else:
            mask_cells = _rle_cell_total(missing_mask)
            mask_missing_cells = _rle_value_count(missing_mask, 1)
            if expected_cells and mask_cells != expected_cells:
                errors.append(
                    f"{source_label}: $.missing_mask_rle run length total {mask_cells} must equal grid cell count {expected_cells}"
                )
            if mask_missing_cells != missing_cell_count:
                errors.append(
                    f"{source_label}: $.missing_mask_rle missing cells {mask_missing_cells} must equal missing_cell_count {missing_cell_count}"
                )
    return errors


def validate_thematic_build_audit(
    payload: object,
    *,
    source_label: str = "thematic build audit",
) -> list[str]:
    errors = _schema_errors(
        payload,
        schema_name="thematic_build_audit.schema.json",
        source_label=source_label,
    )
    if not isinstance(payload, dict):
        return errors

    source_inputs = _list_field(payload, "source_inputs")
    if any(
        isinstance(source_input, dict) and source_input.get("source_policy") == "fixture_only"
        for source_input in source_inputs
    ):
        fixture_notice = _dict_field(payload, "fixture_notice")
        if fixture_notice.get("enabled") is not True:
            errors.append(f"{source_label}: $.fixture_notice.enabled must be true for fixture-only inputs")
    return errors
