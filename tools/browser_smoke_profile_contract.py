from __future__ import annotations

import argparse
import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any
import tomllib
from urllib.parse import urlparse

import jsonschema


VALID_MODES = frozenset({"quick", "full"})
VALID_DEFAULT_MODES = frozenset({"quick", "full", "auto"})
VALID_EXPAND_VALUES = frozenset({"none", "click", "toggle"})
VALID_SCREENSHOT_POLICIES = frozenset({"always", "on_error", "never"})
VALID_PRIORITIES = frozenset({"high", "normal", "low"})
VALID_GESTURE_TYPES = frozenset({"drag_zoom"})
VALID_CONSOLE_LEVELS = frozenset({"debug", "info", "warning", "error"})
VALID_BASE_HOSTS = frozenset({"localhost", "127.0.0.1"})
OUTPUT_ROOTS = {
    "artifact_dir": ".runtime/browser/",
    "report_path": ".runtime/reports/generated/browser/",
}
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]+$")
MAX_PORT = 65535


def _string_array_schema() -> dict[str, Any]:
    return {
        "type": "array",
        "items": _non_blank_string_schema(),
    }


def _non_blank_string_schema() -> dict[str, Any]:
    return {"type": "string", "minLength": 1, "pattern": r"\S"}


def _mode_array_schema() -> dict[str, Any]:
    return {
        "type": "array",
        "minItems": 1,
        "items": {"type": "string", "enum": sorted(VALID_MODES)},
    }


def _point_schema() -> dict[str, Any]:
    return {
        "type": "array",
        "minItems": 2,
        "maxItems": 2,
        "items": {"type": "integer"},
    }


PROFILE_SCHEMA: dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "version",
        "defaults",
        "decision",
        "budgets",
        "evidence",
        "outputs",
        "routes",
        "sections",
        "gestures",
    ],
    "additionalProperties": False,
    "properties": {
        "version": {"type": "integer", "const": 1},
        "defaults": {
            "type": "object",
            "required": [
                "base_host",
                "port_range_start",
                "port_range_end",
                "server_title_pattern",
                "wsl_windows_fallback",
            ],
            "additionalProperties": False,
            "properties": {
                "base_host": {"type": "string", "enum": sorted(VALID_BASE_HOSTS)},
                "port_range_start": {"type": "integer", "minimum": 1, "maximum": MAX_PORT},
                "port_range_end": {"type": "integer", "minimum": 1, "maximum": MAX_PORT},
                "server_title_pattern": _non_blank_string_schema(),
                "wsl_windows_fallback": {"type": "boolean"},
            },
        },
        "decision": {
            "type": "object",
            "required": [
                "default_mode",
                "auto_start_mode",
                "upgrade_on_cross_section_anomaly",
                "cross_section_threshold",
                "upgrade_on_insufficient_evidence",
                "min_sections_for_confidence",
                "full_trigger_keywords",
                "quick_trigger_keywords",
            ],
            "additionalProperties": False,
            "properties": {
                "default_mode": {"type": "string", "enum": sorted(VALID_DEFAULT_MODES)},
                "auto_start_mode": {"type": "string", "enum": sorted(VALID_MODES)},
                "upgrade_on_cross_section_anomaly": {"type": "boolean"},
                "cross_section_threshold": {"type": "integer", "minimum": 1},
                "upgrade_on_insufficient_evidence": {"type": "boolean"},
                "min_sections_for_confidence": {"type": "integer", "minimum": 1},
                "full_trigger_keywords": _string_array_schema(),
                "quick_trigger_keywords": _string_array_schema(),
            },
        },
        "budgets": {
            "type": "object",
            "required": ["quick", "full"],
            "additionalProperties": False,
            "properties": {
                "quick": {
                    "type": "object",
                    "required": ["max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"],
                    "additionalProperties": False,
                    "properties": {
                        "max_sections": {"type": "integer", "minimum": 1},
                        "max_screenshots": {"type": "integer", "minimum": 1},
                        "max_runtime_sec": {"type": "integer", "minimum": 1},
                        "max_network_entries": {"type": "integer", "minimum": 1},
                    },
                },
                "full": {
                    "type": "object",
                    "required": ["max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"],
                    "additionalProperties": False,
                    "properties": {
                        "max_sections": {"type": "integer", "minimum": 1},
                        "max_screenshots": {"type": "integer", "minimum": 1},
                        "max_runtime_sec": {"type": "integer", "minimum": 1},
                        "max_network_entries": {"type": "integer", "minimum": 1},
                    },
                },
            },
        },
        "evidence": {
            "type": "object",
            "required": ["console_min_level", "network_include_static", "network_failed_only"],
            "additionalProperties": False,
            "properties": {
                "console_min_level": {"type": "string", "enum": sorted(VALID_CONSOLE_LEVELS)},
                "network_include_static": {"type": "boolean"},
                "network_failed_only": {"type": "boolean"},
            },
        },
        "outputs": {
            "type": "object",
            "required": sorted(OUTPUT_ROOTS),
            "additionalProperties": False,
            "properties": {
                "artifact_dir": _non_blank_string_schema(),
                "report_path": _non_blank_string_schema(),
            },
        },
        "routes": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["id", "url"],
                "additionalProperties": False,
                "properties": {
                    "id": _non_blank_string_schema(),
                    "url": _non_blank_string_schema(),
                    "scroll": {"type": "integer", "minimum": 0},
                    "screenshot": {"type": "boolean"},
                    "capture_console": {"type": "boolean"},
                    "capture_network": {"type": "boolean"},
                    "enabled_modes": _mode_array_schema(),
                },
            },
        },
        "sections": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["id", "page", "selector"],
                "additionalProperties": False,
                "properties": {
                    "id": _non_blank_string_schema(),
                    "page": _non_blank_string_schema(),
                    "selector": _non_blank_string_schema(),
                    "expand": {"type": "string", "enum": sorted(VALID_EXPAND_VALUES)},
                    "scroll": {"type": "integer", "minimum": 0},
                    "screenshot": {"type": "string", "enum": sorted(VALID_SCREENSHOT_POLICIES)},
                    "priority": {"type": "string", "enum": sorted(VALID_PRIORITIES)},
                    "enabled_modes": _mode_array_schema(),
                },
            },
        },
        "gestures": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "page", "selector", "type"],
                "additionalProperties": False,
                "properties": {
                    "id": _non_blank_string_schema(),
                    "page": _non_blank_string_schema(),
                    "selector": _non_blank_string_schema(),
                    "type": {"type": "string", "enum": sorted(VALID_GESTURE_TYPES)},
                    "from": _point_schema(),
                    "to": _point_schema(),
                    "wheel": {"type": "integer"},
                    "screenshot": {"type": "boolean"},
                    "enabled_modes": _mode_array_schema(),
                },
            },
        },
    },
}


@lru_cache(maxsize=1)
def _profile_validator() -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(PROFILE_SCHEMA)


def validate_profile_path(profile_path: str | Path) -> list[str]:
    path = Path(profile_path)
    try:
        payload = tomllib.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [f"{path}: profile file does not exist."]
    except tomllib.TOMLDecodeError as exc:
        return [f"{path}: invalid TOML: {exc}"]
    return validate_profile_payload(payload, path=str(path))


def validate_profile_payload(payload: Any, path: str = "<profile>") -> list[str]:
    if not isinstance(payload, dict):
        return [f"{path}: profile must be a table."]

    errors = [
        _format_schema_error(error, payload, path)
        for error in sorted(
            _profile_validator().iter_errors(payload),
            key=lambda item: (list(item.absolute_path), item.validator, str(item.message)),
        )
    ]

    defaults = payload.get("defaults")
    outputs = payload.get("outputs")
    routes = payload.get("routes")
    sections = payload.get("sections")
    gestures = payload.get("gestures")

    _validate_port_relationship(defaults, path, errors)
    _validate_output_path_containment(outputs, path, errors)
    _validate_route_urls(routes, path, errors)
    _validate_safe_ids(routes, "routes", path, errors)
    _validate_safe_ids(sections, "sections", path, errors)
    _validate_safe_ids(gestures, "gestures", path, errors)
    route_modes = _route_mode_index(routes, path, errors)
    _validate_mode_coverage(route_modes, path, errors)
    _validate_page_references(sections, "sections", route_modes, path, errors)
    _validate_page_references(gestures, "gestures", route_modes, path, errors)
    _validate_budget_relationships(payload.get("budgets"), path, errors)
    return errors


def _format_schema_error(error: jsonschema.ValidationError, payload: dict[str, Any], path: str) -> str:
    parts = list(error.absolute_path)
    if error.validator == "additionalProperties":
        unknown = _unexpected_property(error)
        return f"{_entry_label(payload, parts, path)} has unknown field: {unknown}."
    if error.validator == "const" and parts == ["version"]:
        return f"{path}: version must be 1."
    if error.validator == "required":
        missing = _missing_required_property(error)
        return _format_missing_required(payload, parts, missing, path)
    if error.validator == "enum":
        return _format_enum_error(payload, parts, error.validator_value, path)
    if error.validator == "type":
        return _format_type_error(payload, parts, error.validator_value, path)
    if error.validator in {"minLength", "pattern"}:
        return f"{_field_label(payload, parts, path)} must be a non-empty string."
    if error.validator == "minItems":
        return _format_min_items_error(payload, parts, path)
    if error.validator == "maxItems":
        return f"{_field_label(payload, parts, path)} must be a two-integer array."
    if error.validator == "minimum":
        label = _field_label(payload, parts, path)
        if error.validator_value == 0:
            return f"{label} must be greater than or equal to 0."
        return f"{label} must be greater than 0."
    if error.validator == "maximum":
        return f"{_field_label(payload, parts, path)} must be less than or equal to {error.validator_value}."
    return f"{path}: {error.message}"


def _format_missing_required(payload: dict[str, Any], parts: list[Any], field: str, path: str) -> str:
    label = _entry_label(payload, parts, path)
    if not parts:
        if field == "version":
            return f"{path}: version must be an integer."
        if field in {"routes", "sections", "gestures"}:
            return f"{path}: {field} must be an array of tables."
        return f"{path}: {field} must be a table."
    if field == "type" and parts and parts[0] == "gestures":
        return f"{label}.type must be one of: {', '.join(sorted(VALID_GESTURE_TYPES))}."
    if field == "enabled_modes":
        return f"{label}.enabled_modes must be a non-empty array."
    if field in {"id", "url", "page", "selector", "base_host", "server_title_pattern", "artifact_dir", "report_path"}:
        return f"{label}.{field} must be a non-empty string."
    if field in {"screenshot", "capture_console", "capture_network", "wsl_windows_fallback"}:
        return f"{label}.{field} must be a boolean."
    if field.startswith("max_") or field.startswith("port_") or field in {"scroll", "wheel"}:
        return f"{label}.{field} must be an integer."
    return f"{label}.{field} is required."


def _format_enum_error(payload: dict[str, Any], parts: list[Any], allowed: Any, path: str) -> str:
    allowed_values = ", ".join(sorted(str(value) for value in allowed))
    if len(parts) >= 3 and parts[-2] == "enabled_modes":
        return f"{_field_label(payload, parts[:-1], path)} has invalid mode: {_value_at_path(payload, parts)}."
    return f"{_field_label(payload, parts, path)} must be one of: {allowed_values}."


def _format_type_error(payload: dict[str, Any], parts: list[Any], expected: Any, path: str) -> str:
    if not parts:
        return f"{path}: profile must be a table."
    field = parts[-1]
    label = _field_label(payload, parts, path)
    expected_values = set(expected if isinstance(expected, list) else [expected])
    if parts == ["version"]:
        return f"{path}: version must be an integer."
    if "object" in expected_values:
        return f"{_parent_label(payload, parts, path)}: {field} must be a table."
    if "array" in expected_values:
        if parts == ["routes"] or parts == ["sections"] or parts == ["gestures"]:
            return f"{path}: {field} must be an array of tables."
        if field in {"from", "to"}:
            return f"{label} must be a two-integer array."
        if field in {"full_trigger_keywords", "quick_trigger_keywords"}:
            return f"{label} must be an array of non-empty strings."
        return f"{label} must be a non-empty array."
    if "integer" in expected_values:
        return f"{label} must be an integer."
    if "boolean" in expected_values:
        return f"{label} must be a boolean."
    if "string" in expected_values:
        return f"{label} must be a non-empty string."
    return f"{path}: expected {expected} at {'.'.join(str(part) for part in parts)}."


def _format_min_items_error(payload: dict[str, Any], parts: list[Any], path: str) -> str:
    if parts == ["routes"]:
        return f"{path}: routes must contain at least one route."
    if parts == ["sections"]:
        return f"{path}: sections must contain at least one section."
    if parts and parts[-1] in {"from", "to"}:
        return f"{_field_label(payload, parts, path)} must be a two-integer array."
    return f"{_field_label(payload, parts, path)} must be a non-empty array."


def _validate_port_relationship(defaults: Any, path: str, errors: list[str]) -> None:
    if not isinstance(defaults, dict):
        return
    start = defaults.get("port_range_start")
    end = defaults.get("port_range_end")
    if _is_int(start) and _is_int(end) and start > end:
        errors.append(f"{path}: defaults.port_range_start must be less than or equal to defaults.port_range_end.")


def _validate_output_path_containment(outputs: Any, path: str, errors: list[str]) -> None:
    if not isinstance(outputs, dict):
        return
    for field, required_root in OUTPUT_ROOTS.items():
        value = outputs.get(field)
        if not isinstance(value, str):
            continue
        normalized = _normalize_repo_relative_path(value)
        if normalized is None or not normalized.startswith(required_root):
            errors.append(f"{path}: outputs.{field} must stay under {required_root}.")


def _validate_route_urls(routes: Any, path: str, errors: list[str]) -> None:
    if not isinstance(routes, list):
        return
    for index, route in enumerate(routes):
        if not isinstance(route, dict):
            continue
        label = f"{path}: routes[{_entry_id(route, index)}].url"
        _validate_route_url(route.get("url"), label, errors)


def _validate_safe_ids(entries: Any, collection: str, path: str, errors: list[str]) -> None:
    if not isinstance(entries, list):
        return
    seen: set[str] = set()
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        entry_id = _entry_id(entry, index)
        value = entry.get("id")
        if isinstance(value, str) and value.strip() and not SAFE_ID_RE.fullmatch(value):
            errors.append(
                f"{path}: {collection}[{entry_id}].id must use only letters, numbers, underscores, and hyphens."
            )
        if isinstance(value, str) and value.strip():
            if value in seen:
                errors.append(f"{path}: {collection} has duplicate id: {value}.")
            seen.add(value)


def _route_mode_index(routes: Any, path: str, errors: list[str]) -> dict[str, set[str]]:
    if not isinstance(routes, list):
        return {}
    route_modes: dict[str, set[str]] = {}
    for index, route in enumerate(routes):
        if not isinstance(route, dict):
            continue
        rid = route.get("id")
        if not isinstance(rid, str) or not rid.strip():
            continue
        modes = _valid_modes_from(route.get("enabled_modes", ["quick", "full"]))
        route_modes[rid] = modes
    return route_modes


def _validate_mode_coverage(route_modes: dict[str, set[str]], path: str, errors: list[str]) -> None:
    if not route_modes:
        return
    modes_seen = set().union(*route_modes.values()) if route_modes else set()
    for mode in VALID_MODES:
        if mode not in modes_seen:
            errors.append(f"{path}: routes must include at least one {mode} route.")


def _validate_page_references(
    entries: Any,
    collection: str,
    route_modes: dict[str, set[str]],
    path: str,
    errors: list[str],
) -> None:
    if not isinstance(entries, list):
        return
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        page = entry.get("page")
        if not isinstance(page, str) or not page.strip():
            continue
        modes = _valid_modes_from(entry.get("enabled_modes", ["quick", "full"]))
        label = f"{path}: {collection}[{_entry_id(entry, index)}].page"
        if page not in route_modes:
            errors.append(f"{label} references unknown route: {page}.")
            continue
        missing_modes = sorted(modes - route_modes[page])
        if missing_modes:
            errors.append(f"{label} enables modes not available on route {page}: {', '.join(missing_modes)}.")


def _validate_budget_relationships(budgets: Any, path: str, errors: list[str]) -> None:
    if not isinstance(budgets, dict):
        return
    quick = budgets.get("quick")
    full = budgets.get("full")
    if not isinstance(quick, dict) or not isinstance(full, dict):
        return
    for field in ("max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"):
        quick_value = quick.get(field)
        full_value = full.get(field)
        if _is_int(quick_value) and _is_int(full_value) and quick_value > full_value:
            errors.append(f"{path}: budgets.quick.{field} must be less than or equal to budgets.full.{field}.")


def _validate_route_url(value: Any, label: str, errors: list[str]) -> None:
    if not isinstance(value, str):
        return
    if value.startswith("/") and not value.startswith("//"):
        return
    parsed = urlparse(value)
    if parsed.scheme.lower() in {"http", "https"} and (parsed.hostname or "").lower() in VALID_BASE_HOSTS:
        try:
            port = parsed.port
        except ValueError:
            errors.append(f"{label} port must be in range 1..{MAX_PORT}.")
            return
        if port is not None and not 1 <= port <= MAX_PORT:
            errors.append(f"{label} port must be in range 1..{MAX_PORT}.")
            return
        return
    errors.append(f"{label} must be app-relative or localhost absolute.")


def _entry_label(payload: dict[str, Any], parts: list[Any], path: str) -> str:
    if len(parts) >= 2 and parts[0] in {"routes", "sections", "gestures"} and isinstance(parts[1], int):
        collection = str(parts[0])
        index = int(parts[1])
        entries = payload.get(collection)
        entry = entries[index] if isinstance(entries, list) and index < len(entries) and isinstance(entries[index], dict) else {}
        return f"{path}: {collection}[{_entry_id(entry, index)}]"
    if parts:
        return f"{path}: {'.'.join(str(part) for part in parts)}"
    return path


def _field_label(payload: dict[str, Any], parts: list[Any], path: str) -> str:
    if not parts:
        return path
    if len(parts) >= 3 and parts[0] in {"routes", "sections", "gestures"} and isinstance(parts[1], int):
        return f"{_entry_label(payload, parts[:2], path)}.{parts[2]}"
    return f"{path}: {'.'.join(str(part) for part in parts)}"


def _parent_label(payload: dict[str, Any], parts: list[Any], path: str) -> str:
    if len(parts) <= 1:
        return path
    return _field_label(payload, parts[:-1], path)


def _entry_id(entry: dict[str, Any], index: int) -> str:
    value = entry.get("id")
    if isinstance(value, str) and value.strip():
        return value
    return f"#{index}"


def _valid_modes_from(value: Any) -> set[str]:
    if not isinstance(value, list):
        return set()
    return {entry for entry in value if isinstance(entry, str) and entry in VALID_MODES}


def _value_at_path(payload: dict[str, Any], parts: list[Any]) -> Any:
    value: Any = payload
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        elif isinstance(value, list) and isinstance(part, int) and 0 <= part < len(value):
            value = value[part]
        else:
            return None
    return value


def _unexpected_property(error: jsonschema.ValidationError) -> str:
    match = re.search(r"'([^']+)'", str(error.message))
    return match.group(1) if match else "<unknown>"


def _missing_required_property(error: jsonschema.ValidationError) -> str:
    match = re.search(r"'([^']+)' is a required property", str(error.message))
    if match:
        return match.group(1)
    return str(next(iter(set(error.validator_value) - set(error.instance)), ""))


def _normalize_repo_relative_path(value: str) -> str | None:
    if re.match(r"^[A-Za-z]:[\\/]", value) or value.startswith("/") or value.startswith("\\"):
        return None
    parts = value.replace("\\", "/").split("/")
    if any(part in ("", "..") for part in parts):
        return None
    return "/".join(parts)


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the browser smoke inspection profile contract.")
    parser.add_argument(
        "profile",
        nargs="?",
        default=Path("ops") / "browser-mcp" / "inspection-profile.toml",
        help="Path to inspection-profile.toml",
    )
    args = parser.parse_args(argv)
    errors = validate_profile_path(args.profile)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print(f"{args.profile}: browser smoke profile contract OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
