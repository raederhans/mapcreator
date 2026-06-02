from __future__ import annotations

from typing import Final


JAPAN_CARRIER_ASSET_KEY: Final = "transport_carrier:japan_corridor"

CARRIER_ASSET_KEY_BY_COUNTRY: Final[dict[str, str]] = {
    "china": "transport_carrier:china",
    "france": "transport_carrier:france",
    "germany": "transport_carrier:germany",
    "india": "transport_carrier:india",
    "japan": JAPAN_CARRIER_ASSET_KEY,
    "russia": "transport_carrier:russia",
    "uk": "transport_carrier:uk",
    "usa": "transport_carrier:usa",
}

COUNTRY_BY_PACK_ID: Final[dict[str, str]] = {
    "china_airport": "china",
    "china_port": "china",
    "france_airport": "france",
    "france_port": "france",
    "france_rail": "france",
    "germany_airport": "germany",
    "germany_energy_facilities": "germany",
    "germany_industrial_zones": "germany",
    "germany_logistics_hubs": "germany",
    "germany_mineral_resources": "germany",
    "germany_port": "germany",
    "germany_rail": "germany",
    "germany_road": "germany",
    "india_airport": "india",
    "india_port": "india",
    "japan_airport": "japan",
    "japan_energy_facilities": "japan",
    "japan_industrial_zones": "japan",
    "japan_logistics_hubs": "japan",
    "japan_mineral_resources": "japan",
    "japan_port": "japan",
    "japan_rail": "japan",
    "japan_road": "japan",
    "russia_airport": "russia",
    "russia_port": "russia",
    "uk_airport": "uk",
    "uk_port": "uk",
    "uk_road": "uk",
    "usa_airport": "usa",
    "usa_port": "usa",
    "usa_road": "usa",
}

PACK_CARRIER_ASSET_KEYS: Final[dict[str, str]] = {
    pack_id: CARRIER_ASSET_KEY_BY_COUNTRY[country]
    for pack_id, country in COUNTRY_BY_PACK_ID.items()
}

CARRIER_RUNTIME_ASSETS: Final[dict[str, str]] = {
    "transport_carrier:china": "data/transport_layers/china_carrier/carrier.json",
    "transport_carrier:france": "data/transport_layers/france_carrier/carrier.json",
    "transport_carrier:germany": "data/transport_layers/germany_carrier/carrier.json",
    "transport_carrier:india": "data/transport_layers/india_carrier/carrier.json",
    "transport_carrier:russia": "data/transport_layers/russia_carrier/carrier.json",
    "transport_carrier:uk": "data/transport_layers/uk_carrier/carrier.json",
    "transport_carrier:usa": "data/transport_layers/usa_carrier/carrier.json",
}


def resolve_pack_carrier_asset_key(pack_id: str) -> str:
    normalized_pack_id = str(pack_id or "").strip()
    return PACK_CARRIER_ASSET_KEYS.get(normalized_pack_id, "")
