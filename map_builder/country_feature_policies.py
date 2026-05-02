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


def _normalize_country_codes(values: object, *, field_name: str) -> tuple[str, ...]:
    if not isinstance(values, list):
        raise ValueError(f"{field_name} must be a JSON array")
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


def _validate_country_feature_policies(policies: object) -> dict[str, Any]:
    root = _require_mapping(policies, field_name="country_feature_policies")
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

    support_tiers = _require_mapping(gate.get("support_tiers"), field_name="country_gate.support_tiers")
    missing_tiers = sorted(_SUPPORT_TIER_KEYS - set(support_tiers))
    if missing_tiers:
        raise ValueError(f"country_gate.support_tiers missing keys: {', '.join(missing_tiers)}")
    for tier_name in _SUPPORT_TIER_KEYS:
        _normalize_country_codes(
            support_tiers.get(tier_name),
            field_name=f"country_gate.support_tiers.{tier_name}",
        )
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
