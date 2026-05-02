"""Load country feature policy tables from the data owner JSON."""
from __future__ import annotations

from functools import lru_cache
import json
from pathlib import Path
from typing import Any


POLICY_PATH = Path(__file__).resolve().parents[1] / "data" / "country_feature_policies.json"
_SUPPORT_TIER_KEYS = frozenset(
    {
        "strict_gap_target_countries",
        "order_of_magnitude_improvement_countries",
    }
)
_POLICY_SCHEMA_VERSION = 2


def _require_sequence(value: object, *, field_name: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a JSON array")
    return value


def _normalize_country_codes(values: object, *, field_name: str) -> tuple[str, ...]:
    _require_sequence(values, field_name=field_name)
    codes = tuple(
        code
        for code in (str(value or "").strip().upper() for value in values)
        if code
    )
    if len(codes) != len(set(codes)):
        raise ValueError(f"{field_name} contains duplicate country codes")
    return codes


def _require_mapping(value: object, *, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be a JSON object")
    return value


def _validate_string_mapping(value: object, *, field_name: str) -> dict[str, str]:
    mapping = _require_mapping(value, field_name=field_name)
    for key, item in mapping.items():
        if not isinstance(key, str) or not isinstance(item, str):
            raise ValueError(f"{field_name} must map strings to strings")
    return mapping


def _validate_palette(display: dict[str, Any]) -> None:
    palette = _require_mapping(display.get("palette"), field_name="display.palette")
    themes = _require_mapping(palette.get("themes"), field_name="display.palette.themes")
    for theme_name, colors in themes.items():
        if not isinstance(theme_name, str):
            raise ValueError("display.palette.themes keys must be strings")
        color_values = _require_sequence(colors, field_name=f"display.palette.themes.{theme_name}")
        if not all(isinstance(color, str) and color.strip() for color in color_values):
            raise ValueError(f"display.palette.themes.{theme_name} must contain non-empty color strings")
    _validate_string_mapping(palette.get("countryPalette"), field_name="display.palette.countryPalette")


def _validate_presets(value: object, *, field_name: str) -> dict[str, list[dict[str, Any]]]:
    presets = _require_mapping(value, field_name=field_name)
    for country_code, entries in presets.items():
        if not isinstance(country_code, str):
            raise ValueError(f"{field_name} keys must be country codes")
        for index, preset in enumerate(_require_sequence(entries, field_name=f"{field_name}.{country_code}")):
            preset_mapping = _require_mapping(preset, field_name=f"{field_name}.{country_code}[{index}]")
            if not isinstance(preset_mapping.get("name"), str) or not preset_mapping["name"].strip():
                raise ValueError(f"{field_name}.{country_code}[{index}].name must be a non-empty string")
            ids = _require_sequence(preset_mapping.get("ids"), field_name=f"{field_name}.{country_code}[{index}].ids")
            if not all(isinstance(item, str) and item.strip() for item in ids):
                raise ValueError(f"{field_name}.{country_code}[{index}].ids must contain non-empty strings")
    return presets  # type: ignore[return-value]


def _validate_support_tiers(value: object, *, field_name: str) -> dict[str, Any]:
    support_tiers = _require_mapping(value, field_name=field_name)
    missing_tiers = sorted(_SUPPORT_TIER_KEYS - set(support_tiers))
    if missing_tiers:
        raise ValueError(f"{field_name} missing keys: {', '.join(missing_tiers)}")
    for tier_name in _SUPPORT_TIER_KEYS:
        _normalize_country_codes(
            support_tiers.get(tier_name),
            field_name=f"{field_name}.{tier_name}",
        )
    return support_tiers


def _validate_country_feature_policies(policies: object) -> dict[str, Any]:
    root = _require_mapping(policies, field_name="country_feature_policies")
    if root.get("schema_version") != _POLICY_SCHEMA_VERSION:
        raise ValueError(f"country_feature_policies.schema_version must be {_POLICY_SCHEMA_VERSION}")
    _normalize_country_codes(
        root.get("subdivision_protected_countries"),
        field_name="subdivision_protected_countries",
    )

    gate = _require_mapping(root.get("country_gate"), field_name="country_gate")
    _normalize_country_codes(gate.get("target_country_codes"), field_name="country_gate.target_country_codes")
    try:
        float(gate["country_gap_target_km2"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("country_gate.country_gap_target_km2 must be numeric") from exc

    support_tiers = _validate_support_tiers(gate.get("support_tiers"), field_name="country_gate.support_tiers")
    display = _require_mapping(root.get("display"), field_name="display")
    _validate_palette(display)
    _validate_string_mapping(display.get("countryNames"), field_name="display.countryNames")
    _validate_presets(display.get("presets"), field_name="display.presets")
    display_tiers = _validate_support_tiers(
        display.get("detailOverlaySupportTiers"),
        field_name="display.detailOverlaySupportTiers",
    )
    if display_tiers != support_tiers:
        raise ValueError("display.detailOverlaySupportTiers must mirror country_gate.support_tiers")
    return root


@lru_cache(maxsize=1)
def load_country_feature_policies() -> dict[str, Any]:
    """Return the raw policy table so tests can verify the file-backed owner."""
    return _validate_country_feature_policies(json.loads(POLICY_PATH.read_text(encoding="utf-8")))


def subdivision_protected_countries() -> frozenset[str]:
    policies = load_country_feature_policies()
    return frozenset(
        _normalize_country_codes(
            policies["subdivision_protected_countries"],
            field_name="subdivision_protected_countries",
        )
    )


def country_gate_target_codes() -> tuple[str, ...]:
    policies = load_country_feature_policies()
    gate = policies["country_gate"]
    return _normalize_country_codes(gate["target_country_codes"], field_name="country_gate.target_country_codes")


def country_gate_gap_target_km2() -> float:
    policies = load_country_feature_policies()
    gate = policies["country_gate"]
    return float(gate["country_gap_target_km2"])


def country_gate_support_tier_codes(tier_name: str) -> tuple[str, ...]:
    policies = load_country_feature_policies()
    support_tiers = policies["country_gate"]["support_tiers"]
    return _normalize_country_codes(
        support_tiers[tier_name],
        field_name=f"country_gate.support_tiers.{tier_name}",
    )


def display_policy() -> dict[str, Any]:
    policies = load_country_feature_policies()
    return policies["display"]


def display_palette() -> dict[str, Any]:
    return display_policy()["palette"]


def display_country_names() -> dict[str, str]:
    return display_policy()["countryNames"]


def display_presets() -> dict[str, list[dict[str, Any]]]:
    return display_policy()["presets"]


def display_detail_overlay_support_tier_codes(tier_name: str) -> tuple[str, ...]:
    support_tiers = display_policy()["detailOverlaySupportTiers"]
    return _normalize_country_codes(
        support_tiers[tier_name],
        field_name=f"display.detailOverlaySupportTiers.{tier_name}",
    )
