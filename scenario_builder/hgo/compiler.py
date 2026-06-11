from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from scenario_builder.hgo.vectorizer import hgo_state_feature_id, vectorize_hgo_states
from scenario_builder.hoi4.compiler import compile_scenario_bundle
from scenario_builder.hoi4.models import (
    BookmarkRecord,
    CountryHistoryRecord,
    ScenarioRule,
    StateRecord,
)

# HGO seed 会把水域也写成 owner-like 记录；这些 tag 只能进入几何背景，不能进入可玩国家推荐。
HGO_SYSTEM_OWNER_TAGS = frozenset({"WTR"})


def _country_display_name(tag: str, country: dict[str, Any]) -> str:
    source_path = str(country.get("source_path") or "").strip()
    definition_path = str(country.get("definition_path") or "").strip()
    for value in (source_path, definition_path):
        if "/" in value:
            label = value.rsplit("/", 1)[-1].rsplit(".", 1)[0]
            if label:
                return label
    return tag


def is_hgo_system_owner(tag: str, country: dict[str, Any] | None = None) -> bool:
    normalized_tag = str(tag or "").strip().upper()
    if normalized_tag in HGO_SYSTEM_OWNER_TAGS:
        return True
    if not isinstance(country, dict):
        return False
    return _country_display_name(normalized_tag, country).strip().casefold() == "water"


def _build_palette_pack(seed: dict[str, Any]) -> dict[str, Any]:
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    entries: dict[str, dict[str, Any]] = {}
    for tag, country in sorted(countries.items()):
        if not isinstance(country, dict):
            continue
        normalized_tag = str(tag or "").strip().upper()
        if not normalized_tag:
            continue
        color_hex = str(country.get("color_hex") or "#808080").strip()
        entries[normalized_tag] = {
            "localized_name": _country_display_name(normalized_tag, country),
            "country_file_label": _country_display_name(normalized_tag, country),
            "map_hex": color_hex,
            "country_file_hex": color_hex,
        }
    return {
        "version": 1,
        "palette_id": "hgo",
        "preferred_runtime_color_field": "map_hex",
        "entries": entries,
    }


def _build_palette_map(seed: dict[str, Any]) -> dict[str, Any]:
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    return {
        "version": 1,
        "palette_id": "hgo",
        "mapped": {
            str(tag).strip().upper(): {"iso2": str(tag).strip().upper()}
            for tag in countries
            if str(tag).strip()
        },
    }


def _state_records(seed: dict[str, Any]) -> dict[int, StateRecord]:
    states = seed.get("states") if isinstance(seed.get("states"), list) else []
    records: dict[int, StateRecord] = {}
    for state in states:
        if not isinstance(state, dict):
            continue
        state_id = int(state["id"])
        owner = str(state.get("owner") or "").strip().upper()
        controller = str(state.get("controller") or owner).strip().upper()
        records[state_id] = StateRecord(
            state_id=state_id,
            file_name=str(state.get("source_path") or f"hgo_state_{state_id}.txt"),
            owner_tag=owner,
            controller_tag=controller,
            core_tags=[str(tag).strip().upper() for tag in state.get("core_tags") or [] if str(tag).strip()],
            province_ids=[int(province_id) for province_id in state.get("province_ids") or []],
            state_category=str(state.get("category") or "").strip(),
        )
    return records


def _country_histories(seed: dict[str, Any]) -> dict[str, CountryHistoryRecord]:
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    histories: dict[str, CountryHistoryRecord] = {}
    for tag, country in sorted(countries.items()):
        normalized_tag = str(tag).strip().upper()
        if not normalized_tag or not isinstance(country, dict):
            continue
        histories[normalized_tag] = CountryHistoryRecord(
            tag=normalized_tag,
            file_label=_country_display_name(normalized_tag, country),
        )
    return histories


def _runtime_country_names(seed: dict[str, Any]) -> dict[str, str]:
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    return {
        str(tag).strip().upper(): _country_display_name(str(tag).strip().upper(), country)
        for tag, country in countries.items()
        if isinstance(country, dict) and str(tag).strip()
    }


def _owner_rules(seed: dict[str, Any]) -> list[ScenarioRule]:
    states = seed.get("states") if isinstance(seed.get("states"), list) else []
    features_by_owner: defaultdict[str, list[str]] = defaultdict(list)
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    for state in states:
        if not isinstance(state, dict):
            continue
        owner = str(state.get("owner") or "").strip().upper()
        if owner:
            features_by_owner[owner].append(hgo_state_feature_id(int(state["id"])))
    rules: list[ScenarioRule] = []
    for owner, feature_ids in sorted(features_by_owner.items()):
        country = countries.get(owner, {}) if isinstance(countries.get(owner), dict) else {}
        # 这里从 state owner 生成规则，让 HGO 继续复用 HOI4 scenario compiler 的国家/颜色/审计链。
        rules.append(
            ScenarioRule(
                rule_id=f"hgo_owner_{owner}",
                owner_tag=owner,
                priority=10,
                quality="manual_reviewed",
                critical=False,
                notes="Derived directly from HGO state history owner.",
                include_feature_ids=sorted(feature_ids),
                base_iso2=owner,
                lookup_iso2=owner,
                display_name_override=_country_display_name(owner, country),
                color_hex_override=str(country.get("color_hex") or "").strip(),
                source_type="hgo_owner",
                historical_fidelity="mod_source",
                entry_kind="owner",
            )
        )
    return rules


def _featured_tags(seed: dict[str, Any], limit: int = 12) -> list[str]:
    states = seed.get("states") if isinstance(seed.get("states"), list) else []
    countries = seed.get("countries") if isinstance(seed.get("countries"), dict) else {}
    counts = Counter(
        str(state.get("owner") or "").strip().upper()
        for state in states
        if isinstance(state, dict) and str(state.get("owner") or "").strip()
    )
    featured: list[str] = []
    for tag, _count in counts.most_common():
        country = countries.get(tag, {}) if isinstance(countries.get(tag), dict) else {}
        if is_hgo_system_owner(tag, country):
            continue
        featured.append(tag)
        if len(featured) >= limit:
            break
    return featured


def _hide_system_owner_countries(compiled: dict[str, Any]) -> None:
    countries = compiled.get("countries", {}).get("countries", {})
    if not isinstance(countries, dict):
        return
    for tag, country in countries.items():
        if isinstance(country, dict) and is_hgo_system_owner(str(tag), country):
            country["hidden_from_country_list"] = True


def _bookmark(seed: dict[str, Any], display_name: str) -> BookmarkRecord:
    featured_tags = _featured_tags(seed)
    default_country = featured_tags[0] if featured_tags else "HGO"
    return BookmarkRecord(
        name=f"{display_name} Start",
        description="Historic Geographical Overhaul state-level vector scenario.",
        date="1936.1.1.12",
        default_country=default_country,
        featured_tags=featured_tags,
    )


def compile_hgo_scenario(
    *,
    seed: dict[str, Any],
    provinces_bmp_path,
    scenario_id: str = "hgo_1936",
    display_name: str = "HGO 1936",
) -> dict[str, Any]:
    topology, runtime_features, vector_diagnostics = vectorize_hgo_states(seed, provinces_bmp_path)
    # HGO 的差异只在 vectorized runtime features 和宽松 profile；bundle 结构仍走共享 HOI4 编译入口。
    compiled = compile_scenario_bundle(
        scenario_id=scenario_id,
        display_name=display_name,
        bookmark=_bookmark(seed, display_name),
        runtime_features=runtime_features,
        runtime_country_names=_runtime_country_names(seed),
        hierarchy_groups={},
        country_meta_by_iso2={},
        rules=_owner_rules(seed),
        states_by_id=_state_records(seed),
        country_histories=_country_histories(seed),
        palette_pack=_build_palette_pack(seed),
        palette_map=_build_palette_map(seed),
        diagnostics={
            "hgo_vectorizer": vector_diagnostics,
            "enable_region_checks": False,
            "enforce_region_checks": False,
            "enforce_scenario_extensions": False,
        },
    )
    _hide_system_owner_countries(compiled)
    manifest = compiled["manifest"]
    manifest["palette_id"] = "hgo"
    manifest["scenario_contract_profile"] = "hgo_vector"
    manifest["runtime_topology_url"] = f"data/scenarios/{scenario_id}/runtime_topology.topo.json"
    manifest["city_overrides_url"] = f"data/scenarios/{scenario_id}/city_overrides.json"
    manifest["special_zone_layers_url"] = f"data/scenarios/{scenario_id}/special_zone_layers.json"
    manifest["capital_hints_url"] = f"data/scenarios/{scenario_id}/capital_hints.json"
    manifest["summary"] = {
        **manifest["summary"],
        "hgo_state_feature_count": len(runtime_features),
        "hgo_owner_count": compiled["manifest"]["summary"].get("owner_count", 0),
    }
    manifest["performance_hints"] = {
        **manifest.get("performance_hints", {}),
        "dynamic_borders_default": False,
        "hgo_vector_scene_default": True,
    }
    return {
        **compiled,
        "runtime_topology": topology,
    }
