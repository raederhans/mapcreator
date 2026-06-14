"""Shared build-time JSON Schema validation helpers."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


@lru_cache(maxsize=None)
def load_schema(schema_name: str) -> dict[str, Any]:
    schema_path = SCHEMA_DIR / schema_name
    payload = json.loads(schema_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{schema_path} must contain a JSON object schema")
    Draft202012Validator.check_schema(payload)
    return payload


def _format_path(parts: list[object]) -> str:
    if not parts:
        return "$"
    return "$." + ".".join(str(part) for part in parts)


def validate_json_contract(
    payload: object,
    *,
    schema_name: str,
    source_label: str,
) -> list[str]:
    validator = Draft202012Validator(load_schema(schema_name))
    errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.path))
    return [
        f"{source_label}: {_format_path(list(error.path))}: {error.message}"
        for error in errors
    ]
