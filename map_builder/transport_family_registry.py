from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GpkgLayerGroup:
    source_layer: str
    output_layer: str
    columns: tuple[str, ...]
    filter_column: str
    filter_values: frozenset[str]
    audit_key: str
    row_builder_id: str


@dataclass(frozen=True)
class FamilySpec:
    family: str
    output_geometry_kind: str
    capability_geometry_kind: str
    gpkg_layers: tuple[GpkgLayerGroup, ...]
    full_limit: int
    preview_limit: int
    per_source_minimum: int
    per_source_multiplier: int
    dedup_subset: tuple[str, ...]
    sort_fields: tuple[str, ...]
    sort_ascending: tuple[bool, ...]
    preview_filter_field: str = ""
    preview_filter_values: frozenset[str] = frozenset()
    sidecar_preview_limit: int | None = None
    audit_shape: dict[str, Any] | None = None

    def layer(self, output_layer: str) -> GpkgLayerGroup:
        for layer in self.gpkg_layers:
            if layer.output_layer == output_layer:
                return layer
        raise KeyError(f"{self.family}: missing layer spec for {output_layer}")


OSM_ROAD_CLASS_RANK = {
    "motorway": 0,
    "trunk": 1,
    "primary": 2,
    "secondary": 3,
    "tertiary": 4,
    "motorway_link": 5,
    "trunk_link": 6,
    "primary_link": 7,
    "secondary_link": 8,
    "tertiary_link": 9,
}
OSM_ROAD_FULL_CLASSES = frozenset(OSM_ROAD_CLASS_RANK)
OSM_ROAD_PREVIEW_CLASSES = frozenset(
    {"motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link", "secondary_link"}
)
OSM_RAILWAY_FULL_CLASSES = frozenset({"rail", "light_rail", "subway", "tram", "narrow_gauge"})
OSM_RAILWAY_PREVIEW_CLASSES = frozenset({"rail", "light_rail", "subway", "narrow_gauge"})
OSM_INDUSTRIAL_LANDUSE_CLASSES = frozenset({"industrial"})
OSM_LOGISTICS_TRANSPORT_CLASSES = frozenset({"airport", "ferry_terminal", "port", "railway_station"})
OSM_LOGISTICS_RANK_BY_CLASS = {
    "airport": 3,
    "port": 3,
    "ferry_terminal": 2,
    "railway_station": 2,
}


OSM_GPKG_FAMILY_SPECS: dict[str, FamilySpec] = {
    "road": FamilySpec(
        family="road",
        output_geometry_kind="line",
        capability_geometry_kind="line",
        gpkg_layers=(
            GpkgLayerGroup(
                source_layer="gis_osm_roads_free",
                output_layer="roads",
                columns=("osm_id", "fclass", "name", "ref"),
                filter_column="fclass",
                filter_values=OSM_ROAD_FULL_CLASSES,
                audit_key="roads",
                row_builder_id="road_line_from_gpkg",
            ),
        ),
        full_limit=50000,
        preview_limit=4000,
        per_source_minimum=1000,
        per_source_multiplier=3,
        dedup_subset=("source_osm_id", "road_class"),
        sort_fields=("_class_rank", "_named", "id"),
        sort_ascending=(True, False, True),
        preview_filter_field="road_class",
        preview_filter_values=OSM_ROAD_PREVIEW_CLASSES,
        audit_shape={
            "preview_rule": "Geofabrik free GeoPackage major OSM road classes capped at {preview_limit} rows.",
            "filter_rule": "OSM fclass whitelist; local/residential/track/service road classes remain future local-detail packs.",
        },
    ),
    "rail": FamilySpec(
        family="rail",
        output_geometry_kind="line",
        capability_geometry_kind="line",
        gpkg_layers=(
            GpkgLayerGroup(
                source_layer="gis_osm_railways_free",
                output_layer="railways",
                columns=("osm_id", "fclass", "name"),
                filter_column="fclass",
                filter_values=OSM_RAILWAY_FULL_CLASSES,
                audit_key="railways",
                row_builder_id="rail_line_from_gpkg",
            ),
            GpkgLayerGroup(
                source_layer="gis_osm_transport_free",
                output_layer="rail_stations_major",
                columns=("osm_id", "fclass", "name"),
                filter_column="fclass",
                filter_values=frozenset({"railway_station"}),
                audit_key="transport",
                row_builder_id="rail_station_from_gpkg",
            ),
        ),
        full_limit=50000,
        preview_limit=4000,
        per_source_minimum=1000,
        per_source_multiplier=3,
        dedup_subset=("source_osm_id", "railway"),
        sort_fields=("railway", "name", "id"),
        sort_ascending=(True, True, True),
        preview_filter_field="railway",
        preview_filter_values=OSM_RAILWAY_PREVIEW_CLASSES,
        sidecar_preview_limit=400,
        audit_shape={
            "preview_rule": "Geofabrik free GeoPackage rail classes capped at {preview_limit}; station sidecar capped at {sidecar_preview_limit} preview points.",
            "filter_rule": "OSM fclass railway whitelist and transport fclass railway_station sidecar.",
        },
    ),
    "industrial_zones": FamilySpec(
        family="industrial_zones",
        output_geometry_kind="point",
        capability_geometry_kind="polygon_or_point",
        gpkg_layers=(
            GpkgLayerGroup(
                source_layer="gis_osm_landuse_a_free",
                output_layer="industrial_zones",
                columns=("osm_id", "fclass", "name"),
                filter_column="fclass",
                filter_values=OSM_INDUSTRIAL_LANDUSE_CLASSES,
                audit_key="industrial_zones",
                row_builder_id="industrial_center_from_gpkg_polygon",
            ),
        ),
        full_limit=12000,
        preview_limit=500,
        per_source_minimum=1000,
        per_source_multiplier=3,
        dedup_subset=("source_osm_id", "source_region"),
        sort_fields=("_named", "source_area_hint", "name"),
        sort_ascending=(False, False, True),
        audit_shape={
            "preview_rule": "Top {preview_limit} named-first OSM landuse=industrial representative points after {country_key} carrier clip.",
            "filter_rule": "Geofabrik gis_osm_landuse_a_free fclass=industrial polygons converted to representative points for a compact first-wave country preview.",
        },
    ),
    "logistics_hubs": FamilySpec(
        family="logistics_hubs",
        output_geometry_kind="point",
        capability_geometry_kind="point",
        gpkg_layers=(
            GpkgLayerGroup(
                source_layer="gis_osm_transport_free",
                output_layer="logistics_hubs",
                columns=("osm_id", "fclass", "name"),
                filter_column="fclass",
                filter_values=OSM_LOGISTICS_TRANSPORT_CLASSES,
                audit_key="transport_points",
                row_builder_id="logistics_hub_from_gpkg_point",
            ),
            GpkgLayerGroup(
                source_layer="gis_osm_transport_a_free",
                output_layer="logistics_hubs",
                columns=("osm_id", "fclass", "name"),
                filter_column="fclass",
                filter_values=OSM_LOGISTICS_TRANSPORT_CLASSES,
                audit_key="transport_areas",
                row_builder_id="logistics_hub_from_gpkg_area",
            ),
        ),
        full_limit=5000,
        preview_limit=500,
        per_source_minimum=500,
        per_source_multiplier=3,
        dedup_subset=("source_osm_id", "source_fclass", "source_region"),
        sort_fields=("importance_rank", "_named", "name"),
        sort_ascending=(False, False, True),
        audit_shape={
            "preview_rule": "Top {preview_limit} OSM transport terminals by terminal class rank and named status after {country_key} carrier clip.",
            "filter_rule": "Geofabrik transport point/area terminal classes airport, port, ferry_terminal, and railway_station mapped to existing logistics hub preview categories.",
        },
    ),
}


OSM_GPKG_PACK_FAMILY_BY_SUFFIX: tuple[tuple[str, str], ...] = (
    ("_road", "road"),
    ("_rail", "rail"),
    ("_industrial_zones", "industrial_zones"),
    ("_logistics_hubs", "logistics_hubs"),
)


def osm_gpkg_family_spec(family: str) -> FamilySpec:
    return OSM_GPKG_FAMILY_SPECS[family]


def osm_gpkg_family_for_pack_id(pack_id: str) -> str:
    normalized = str(pack_id or "").strip()
    for suffix, family in OSM_GPKG_PACK_FAMILY_BY_SUFFIX:
        if normalized.endswith(suffix):
            return family
    raise KeyError(f"{pack_id}: no OSM GPKG family spec")
