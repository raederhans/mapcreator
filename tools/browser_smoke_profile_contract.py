from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any
import tomllib


VALID_MODES = frozenset({"quick", "full"})
VALID_DEFAULT_MODES = frozenset({"quick", "full", "auto"})
VALID_EXPAND_VALUES = frozenset({"none", "click", "toggle"})
VALID_SCREENSHOT_POLICIES = frozenset({"always", "on_error", "never"})
VALID_PRIORITIES = frozenset({"high", "normal", "low"})
VALID_GESTURE_TYPES = frozenset({"drag_zoom"})
VALID_CONSOLE_LEVELS = frozenset({"debug", "info", "warning", "error"})
OUTPUT_ROOTS = {
    "artifact_dir": ".runtime/browser/",
    "report_path": ".runtime/reports/generated/browser/",
}
TOP_LEVEL_FIELDS = frozenset({"version", "defaults", "decision", "budgets", "evidence", "outputs", "routes", "sections", "gestures"})
DEFAULT_FIELDS = frozenset({"base_host", "port_range_start", "port_range_end", "server_title_pattern", "wsl_windows_fallback"})
DECISION_FIELDS = frozenset({
    "default_mode",
    "auto_start_mode",
    "upgrade_on_cross_section_anomaly",
    "cross_section_threshold",
    "upgrade_on_insufficient_evidence",
    "min_sections_for_confidence",
    "full_trigger_keywords",
    "quick_trigger_keywords",
})
BUDGET_FIELDS = frozenset({"quick", "full"})
BUDGET_MODE_FIELDS = frozenset({"max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"})
EVIDENCE_FIELDS = frozenset({"console_min_level", "network_include_static", "network_failed_only"})
OUTPUT_FIELDS = frozenset(OUTPUT_ROOTS)
ROUTE_FIELDS = frozenset({"id", "url", "scroll", "screenshot", "capture_console", "capture_network", "enabled_modes"})
SECTION_FIELDS = frozenset({"id", "page", "selector", "expand", "scroll", "screenshot", "priority", "enabled_modes"})
GESTURE_FIELDS = frozenset({"id", "page", "selector", "type", "from", "to", "wheel", "screenshot", "enabled_modes"})
INTEGER_REJECTS_BOOL = "must be an integer."


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
    errors: list[str] = []
    if not isinstance(payload, dict):
        return [f"{path}: profile must be a table."]

    _reject_unknown_fields(payload, TOP_LEVEL_FIELDS, path, errors)
    version = payload.get("version")
    if not _is_int(version):
        errors.append(f"{path}: version must be an integer.")
    elif version != 1:
        errors.append(f"{path}: version must be 1.")

    defaults = _require_table(payload, "defaults", path, errors)
    decision = _require_table(payload, "decision", path, errors)
    budgets = _require_table(payload, "budgets", path, errors)
    evidence = _require_table(payload, "evidence", path, errors)
    outputs = _require_table(payload, "outputs", path, errors)
    routes = _require_table_array(payload, "routes", path, errors)
    sections = _require_table_array(payload, "sections", path, errors)
    gestures = _require_table_array(payload, "gestures", path, errors)

    if defaults is not None:
        _validate_defaults(defaults, path, errors)
    if decision is not None:
        _validate_decision(decision, path, errors)
    budget_values: dict[str, dict[str, int]] = {}
    if budgets is not None:
        budget_values = _validate_budgets(budgets, path, errors)
    if evidence is not None:
        _validate_evidence(evidence, path, errors)
    if outputs is not None:
        _validate_outputs(outputs, path, errors)

    route_modes = _validate_routes(routes, path, errors)
    _validate_sections(sections, route_modes, path, errors)
    _validate_gestures(gestures, route_modes, path, errors)
    _validate_budget_relationships(budget_values, path, errors)
    return errors


def _validate_defaults(table: dict[str, Any], path: str, errors: list[str]) -> None:
    _reject_unknown_fields(table, DEFAULT_FIELDS, f"{path}: defaults", errors)
    for field in ("base_host", "server_title_pattern"):
        _require_string(table, field, f"{path}: defaults", errors)
    for field in ("port_range_start", "port_range_end"):
        _require_int(table, field, f"{path}: defaults", errors, positive=True)
    _require_bool(table, "wsl_windows_fallback", f"{path}: defaults", errors)
    start = table.get("port_range_start")
    end = table.get("port_range_end")
    if _is_int(start) and _is_int(end) and start > end:
        errors.append(f"{path}: defaults.port_range_start must be less than or equal to defaults.port_range_end.")


def _validate_decision(table: dict[str, Any], path: str, errors: list[str]) -> None:
    _reject_unknown_fields(table, DECISION_FIELDS, f"{path}: decision", errors)
    _require_enum(table, "default_mode", VALID_DEFAULT_MODES, f"{path}: decision", errors)
    _require_enum(table, "auto_start_mode", VALID_MODES, f"{path}: decision", errors)
    for field in ("upgrade_on_cross_section_anomaly", "upgrade_on_insufficient_evidence"):
        _require_bool(table, field, f"{path}: decision", errors)
    for field in ("cross_section_threshold", "min_sections_for_confidence"):
        _require_int(table, field, f"{path}: decision", errors, positive=True)
    for field in ("full_trigger_keywords", "quick_trigger_keywords"):
        _require_string_array(table, field, f"{path}: decision", errors)


def _validate_budgets(table: dict[str, Any], path: str, errors: list[str]) -> dict[str, dict[str, int]]:
    _reject_unknown_fields(table, BUDGET_FIELDS, f"{path}: budgets", errors)
    budget_values: dict[str, dict[str, int]] = {}
    for mode in ("quick", "full"):
        mode_table = _require_table(table, mode, f"{path}: budgets", errors)
        if mode_table is None:
            continue
        _reject_unknown_fields(mode_table, BUDGET_MODE_FIELDS, f"{path}: budgets.{mode}", errors)
        budget_values[mode] = {}
        for field in ("max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"):
            value = _require_int(mode_table, field, f"{path}: budgets.{mode}", errors, positive=True)
            if value is not None:
                budget_values[mode][field] = value
    return budget_values


def _validate_evidence(table: dict[str, Any], path: str, errors: list[str]) -> None:
    _reject_unknown_fields(table, EVIDENCE_FIELDS, f"{path}: evidence", errors)
    _require_enum(table, "console_min_level", VALID_CONSOLE_LEVELS, f"{path}: evidence", errors)
    for field in ("network_include_static", "network_failed_only"):
        _require_bool(table, field, f"{path}: evidence", errors)


def _validate_outputs(table: dict[str, Any], path: str, errors: list[str]) -> None:
    _reject_unknown_fields(table, OUTPUT_FIELDS, f"{path}: outputs", errors)
    for field, required_root in OUTPUT_ROOTS.items():
        value = _require_string(table, field, f"{path}: outputs", errors)
        if value is None:
            continue
        normalized = _normalize_repo_relative_path(value)
        if normalized is None or not normalized.startswith(required_root):
            errors.append(f"{path}: outputs.{field} must stay under {required_root}.")


def _validate_routes(routes: list[dict[str, Any]] | None, path: str, errors: list[str]) -> dict[str, set[str]]:
    if routes is None:
        return {}
    if not routes:
        errors.append(f"{path}: routes must contain at least one route.")
        return {}

    route_modes: dict[str, set[str]] = {}
    ids: set[str] = set()
    modes_seen: set[str] = set()
    for index, route in enumerate(routes):
        route_id = _entry_id(route, index)
        label = f"{path}: routes[{route_id}]"
        _reject_unknown_fields(route, ROUTE_FIELDS, label, errors)
        rid = _require_string(route, "id", label, errors)
        route_url = _require_string(route, "url", label, errors)
        if route_url is not None and not route_url.startswith(("/", "http://", "https://")):
            errors.append(f"{label}.url must start with '/', 'http://', or 'https://'.")
        _optional_int(route, "scroll", label, errors, minimum=0)
        for field in ("screenshot", "capture_console", "capture_network"):
            _optional_bool(route, field, label, errors)
        modes = _validate_modes(route.get("enabled_modes", ["quick", "full"]), f"{label}.enabled_modes", errors)
        modes_seen.update(modes)
        if rid:
            if rid in ids:
                errors.append(f"{path}: routes has duplicate id: {rid}.")
            ids.add(rid)
            route_modes[rid] = modes
    for mode in VALID_MODES:
        if mode not in modes_seen:
            errors.append(f"{path}: routes must include at least one {mode} route.")
    return route_modes


def _validate_sections(
    sections: list[dict[str, Any]] | None,
    route_modes: dict[str, set[str]],
    path: str,
    errors: list[str],
) -> None:
    if sections is None:
        return
    if not sections:
        errors.append(f"{path}: sections must contain at least one section.")
        return
    ids: set[str] = set()
    for index, section in enumerate(sections):
        section_id = _entry_id(section, index)
        label = f"{path}: sections[{section_id}]"
        _reject_unknown_fields(section, SECTION_FIELDS, label, errors)
        sid = _require_string(section, "id", label, errors)
        page = _require_string(section, "page", label, errors)
        _require_string(section, "selector", label, errors)
        _optional_enum(section, "expand", VALID_EXPAND_VALUES, label, errors)
        _optional_int(section, "scroll", label, errors, minimum=0)
        _optional_enum(section, "screenshot", VALID_SCREENSHOT_POLICIES, label, errors)
        _optional_enum(section, "priority", VALID_PRIORITIES, label, errors)
        modes = _validate_modes(section.get("enabled_modes", ["quick", "full"]), f"{label}.enabled_modes", errors)
        _validate_page_reference(page, modes, route_modes, f"{label}.page", errors)
        if sid:
            if sid in ids:
                errors.append(f"{path}: sections has duplicate id: {sid}.")
            ids.add(sid)


def _validate_gestures(
    gestures: list[dict[str, Any]] | None,
    route_modes: dict[str, set[str]],
    path: str,
    errors: list[str],
) -> None:
    if gestures is None:
        return
    if not gestures:
        return
    ids: set[str] = set()
    for index, gesture in enumerate(gestures):
        gesture_id = _entry_id(gesture, index)
        label = f"{path}: gestures[{gesture_id}]"
        _reject_unknown_fields(gesture, GESTURE_FIELDS, label, errors)
        gid = _require_string(gesture, "id", label, errors)
        page = _require_string(gesture, "page", label, errors)
        _require_string(gesture, "selector", label, errors)
        _require_enum(gesture, "type", VALID_GESTURE_TYPES, label, errors)
        _optional_point(gesture, "from", label, errors)
        _optional_point(gesture, "to", label, errors)
        _optional_int(gesture, "wheel", label, errors)
        _optional_bool(gesture, "screenshot", label, errors)
        modes = _validate_modes(gesture.get("enabled_modes", ["quick", "full"]), f"{label}.enabled_modes", errors)
        _validate_page_reference(page, modes, route_modes, f"{label}.page", errors)
        if gid:
            if gid in ids:
                errors.append(f"{path}: gestures has duplicate id: {gid}.")
            ids.add(gid)


def _validate_page_reference(
    page: str | None,
    modes: set[str],
    route_modes: dict[str, set[str]],
    label: str,
    errors: list[str],
) -> None:
    if page is None:
        return
    if page not in route_modes:
        errors.append(f"{label} references unknown route: {page}.")
        return
    missing_modes = sorted(modes - route_modes[page])
    if missing_modes:
        errors.append(f"{label} enables modes not available on route {page}: {', '.join(missing_modes)}.")


def _validate_budget_relationships(budget_values: dict[str, dict[str, int]], path: str, errors: list[str]) -> None:
    quick = budget_values.get("quick", {})
    full = budget_values.get("full", {})
    for field in ("max_sections", "max_screenshots", "max_runtime_sec", "max_network_entries"):
        if field in quick and field in full and quick[field] > full[field]:
            errors.append(f"{path}: budgets.quick.{field} must be less than or equal to budgets.full.{field}.")


def _reject_unknown_fields(payload: dict[str, Any], allowed_fields: frozenset[str], label: str, errors: list[str]) -> None:
    for field in sorted(payload):
        if field not in allowed_fields:
            errors.append(f"{label} has unknown field: {field}.")


def _require_table(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> dict[str, Any] | None:
    value = payload.get(field)
    if isinstance(value, dict):
        return value
    errors.append(f"{label}: {field} must be a table.")
    return None


def _require_table_array(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> list[dict[str, Any]] | None:
    value = payload.get(field)
    if not isinstance(value, list) or any(not isinstance(entry, dict) for entry in value):
        errors.append(f"{label}: {field} must be an array of tables.")
        return None
    return value


def _require_string(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> str | None:
    value = payload.get(field)
    if isinstance(value, str) and value.strip():
        return value
    errors.append(f"{label}.{field} must be a non-empty string.")
    return None


def _require_bool(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> bool | None:
    value = payload.get(field)
    if isinstance(value, bool):
        return value
    errors.append(f"{label}.{field} must be a boolean.")
    return None


def _require_int(
    payload: dict[str, Any],
    field: str,
    label: str,
    errors: list[str],
    *,
    positive: bool = False,
) -> int | None:
    value = payload.get(field)
    if not _is_int(value):
        errors.append(f"{label}.{field} {INTEGER_REJECTS_BOOL}")
        return None
    if positive and value <= 0:
        errors.append(f"{label}.{field} must be greater than 0.")
        return None
    return value


def _optional_int(
    payload: dict[str, Any],
    field: str,
    label: str,
    errors: list[str],
    *,
    minimum: int | None = None,
) -> int | None:
    if field not in payload:
        return None
    value = payload[field]
    if not _is_int(value):
        errors.append(f"{label}.{field} {INTEGER_REJECTS_BOOL}")
        return None
    if minimum is not None and value < minimum:
        errors.append(f"{label}.{field} must be greater than or equal to {minimum}.")
        return None
    return value


def _optional_bool(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> None:
    if field in payload and not isinstance(payload[field], bool):
        errors.append(f"{label}.{field} must be a boolean.")


def _require_enum(payload: dict[str, Any], field: str, allowed: frozenset[str], label: str, errors: list[str]) -> None:
    value = payload.get(field)
    if value not in allowed:
        errors.append(f"{label}.{field} must be one of: {', '.join(sorted(allowed))}.")


def _optional_enum(payload: dict[str, Any], field: str, allowed: frozenset[str], label: str, errors: list[str]) -> None:
    if field in payload and payload[field] not in allowed:
        errors.append(f"{label}.{field} must be one of: {', '.join(sorted(allowed))}.")


def _require_string_array(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> None:
    value = payload.get(field)
    if not isinstance(value, list) or any(not isinstance(entry, str) or not entry.strip() for entry in value):
        errors.append(f"{label}.{field} must be an array of non-empty strings.")


def _validate_modes(value: Any, label: str, errors: list[str]) -> set[str]:
    if not isinstance(value, list) or not value:
        errors.append(f"{label} must be a non-empty array.")
        return set()
    modes: set[str] = set()
    for entry in value:
        if not isinstance(entry, str):
            errors.append(f"{label} entries must be strings.")
            continue
        if entry not in VALID_MODES:
            errors.append(f"{label} has invalid mode: {entry}.")
            continue
        modes.add(entry)
    return modes


def _optional_point(payload: dict[str, Any], field: str, label: str, errors: list[str]) -> None:
    if field not in payload:
        return
    value = payload[field]
    if not isinstance(value, list) or len(value) != 2 or any(not _is_int(entry) for entry in value):
        errors.append(f"{label}.{field} must be a two-integer array.")


def _entry_id(entry: dict[str, Any], index: int) -> str:
    value = entry.get("id")
    if isinstance(value, str) and value.strip():
        return value
    return f"#{index}"


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
