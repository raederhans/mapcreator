"""Validation schema contracts for map data build stages."""
from __future__ import annotations

from map_builder.contracts import INIT_MAP_DATA_STAGE_DESCRIPTORS


CONTRACT_STAGE_NAMES = frozenset(stage.name for stage in INIT_MAP_DATA_STAGE_DESCRIPTORS)
REQUIRED_CONTRACT_STAGE_NAMES = frozenset(
    {
        "primary_topology_bundle",
        "detail_topology",
        "runtime_political_topology",
        "hierarchy_locales",
        "palette_assets",
        "world_cities",
        "city_lights_assets",
        "derived_hoi4_assets",
        "manifest",
        "validation",
    }
)


def assert_init_map_data_stage_alignment() -> None:
    missing = sorted(REQUIRED_CONTRACT_STAGE_NAMES - CONTRACT_STAGE_NAMES)
    if missing:
        raise ValueError(
            "INIT_MAP_DATA_STAGE_DESCRIPTORS is missing required orchestrator stages: "
            + ", ".join(missing)
        )
