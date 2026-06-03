from __future__ import annotations

from typing import Final


JAPAN_CARRIER_ASSET_KEY: Final = "transport_carrier:japan_corridor"
NATURAL_EARTH_ADMIN1_SOURCE_KIND: Final = "natural_earth_admin1"

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
    "china_energy_facilities": "china",
    "china_industrial_zones": "china",
    "china_logistics_hubs": "china",
    "china_mineral_resources": "china",
    "china_port": "china",
    "china_rail": "china",
    "china_road": "china",
    "france_airport": "france",
    "france_energy_facilities": "france",
    "france_industrial_zones": "france",
    "france_logistics_hubs": "france",
    "france_mineral_resources": "france",
    "france_port": "france",
    "france_rail": "france",
    "france_road": "france",
    "germany_airport": "germany",
    "germany_energy_facilities": "germany",
    "germany_industrial_zones": "germany",
    "germany_logistics_hubs": "germany",
    "germany_mineral_resources": "germany",
    "germany_port": "germany",
    "germany_rail": "germany",
    "germany_road": "germany",
    "india_airport": "india",
    "india_energy_facilities": "india",
    "india_industrial_zones": "india",
    "india_logistics_hubs": "india",
    "india_mineral_resources": "india",
    "india_port": "india",
    "india_rail": "india",
    "india_road": "india",
    "japan_airport": "japan",
    "japan_energy_facilities": "japan",
    "japan_industrial_zones": "japan",
    "japan_logistics_hubs": "japan",
    "japan_mineral_resources": "japan",
    "japan_port": "japan",
    "japan_rail": "japan",
    "japan_road": "japan",
    "russia_airport": "russia",
    "russia_energy_facilities": "russia",
    "russia_industrial_zones": "russia",
    "russia_logistics_hubs": "russia",
    "russia_mineral_resources": "russia",
    "russia_port": "russia",
    "russia_rail": "russia",
    "russia_road": "russia",
    "uk_airport": "uk",
    "uk_energy_facilities": "uk",
    "uk_industrial_zones": "uk",
    "uk_logistics_hubs": "uk",
    "uk_mineral_resources": "uk",
    "uk_port": "uk",
    "uk_rail": "uk",
    "uk_road": "uk",
    "usa_airport": "usa",
    "usa_energy_facilities": "usa",
    "usa_industrial_zones": "usa",
    "usa_logistics_hubs": "usa",
    "usa_mineral_resources": "usa",
    "usa_port": "usa",
    "usa_rail": "usa",
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

CARRIER_SOURCE_KIND_BY_ASSET_KEY: Final[dict[str, str]] = {
    JAPAN_CARRIER_ASSET_KEY: NATURAL_EARTH_ADMIN1_SOURCE_KIND,
    **{
        asset_key: NATURAL_EARTH_ADMIN1_SOURCE_KIND
        for asset_key in CARRIER_RUNTIME_ASSETS
    },
}


CARRIER_EXTENSION_METADATA: Final[dict[str, dict[str, str]]] = {
    JAPAN_CARRIER_ASSET_KEY: {
        "scope_policy": "Japan main corridor preview excludes Okinawa per existing workbench carrier.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 prefecture carrier.",
    },
    "transport_carrier:china": {
        "scope_policy": "Admin1 preview scope follows Natural Earth CHN polygons used by checked-in data.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 provincial carrier.",
    },
    "transport_carrier:france": {
        "scope_policy": "Metropolitan France only; overseas departments and collectivities excluded unless a future pack covers them.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 metropolitan carrier clipped to Europe.",
    },
    "transport_carrier:germany": {
        "scope_policy": "Germany national mainland and islands represented by Natural Earth admin1.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 Länder carrier.",
    },
    "transport_carrier:india": {
        "scope_policy": "India admin1 preview scope follows Natural Earth polygons used by checked-in data.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 state carrier.",
    },
    "transport_carrier:russia": {
        "scope_policy": "Russia admin1 preview includes Kaliningrad as part of the national carrier.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 federal subject carrier.",
    },
    "transport_carrier:uk": {
        "scope_policy": "England, Scotland, Wales, and Northern Ireland scope; overseas territories excluded.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 local authority carrier clipped to UK main geography.",
    },
    "transport_carrier:usa": {
        "scope_policy": "CONUS plus Alaska and Hawaii; territories excluded for workbench preview parity with current packs.",
        "projection_profile": "geoConicEqualArea",
        "basemap_profile": "Natural Earth admin1 state-level carrier with Alaska/Hawaii inset frames.",
    },
}

PACK_CARRIER_EXTENSION_METADATA: Final[dict[str, dict[str, str]]] = {
    "uk_rail": {
        "scope_policy": "Great Britain rail scope only; Northern Ireland rail remains a future UK source gap, and overseas territories are excluded.",
        "projection_profile": "geoConicConformal",
        "basemap_profile": "Natural Earth admin1 carrier clipped to Great Britain for this rail pack.",
    },
}


def resolve_pack_carrier_asset_key(pack_id: str) -> str:
    normalized_pack_id = str(pack_id or "").strip()
    return PACK_CARRIER_ASSET_KEYS.get(normalized_pack_id, "")


def resolve_carrier_source_kind(asset_key: str) -> str:
    normalized_asset_key = str(asset_key or "").strip()
    return CARRIER_SOURCE_KIND_BY_ASSET_KEY.get(normalized_asset_key, "")


def resolve_pack_carrier_extension(pack_id: str) -> dict[str, str]:
    carrier_asset_key = resolve_pack_carrier_asset_key(pack_id)
    if not carrier_asset_key:
        return {}
    pack_metadata = PACK_CARRIER_EXTENSION_METADATA.get(str(pack_id or "").strip())
    return {
        "carrier_asset_key": carrier_asset_key,
        **(pack_metadata or CARRIER_EXTENSION_METADATA.get(carrier_asset_key, {})),
    }
