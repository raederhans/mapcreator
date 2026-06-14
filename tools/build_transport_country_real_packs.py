#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import pandas as pd
import pyogrio
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union
from shapely.ops import transform as shapely_transform

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_country_real_source_contracts import (  # noqa: E402
    COUNTRY_SOURCE_SPECS,
    DEFAULT_SOURCE_CACHE_ROOT,
    TARGET_COUNTRY_PACK_IDS,
    USA_STATE_FIPS_FOR_AREALM,
    build_source_recipe,
    check_country_sources,
    file_signature,
)
from map_builder.transport_country_pack_writer import (  # noqa: E402
    country_pack_clip_bbox,
    country_pack_feature_counts,
    write_country_pack_layers,
    write_json,
)
from map_builder.transport_carrier_registry import (  # noqa: E402
    resolve_pack_carrier_asset_key,
    resolve_pack_carrier_extension,
)
from map_builder.transport_source_extract_cache import (  # noqa: E402
    marker_matches,
    source_marker_from_signature,
    write_marker,
)
from map_builder.transport_workbench_contracts import finalize_transport_manifest  # noqa: E402

OUTPUT_ROOT = PROJECT_ROOT / "data" / "transport_layers"
INDIA_TRAFFIC_RANK_PATH = PROJECT_ROOT / "map_builder" / "transport_country_india_airport_traffic_rank.manual.json"
BNG_TO_WGS84 = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)

MAIN_MAP_KEYS_BY_FAMILY = {
    "road": ("roads", "road_labels"),
    "rail": ("railways", "rail_stations_major"),
    "airport": ("airports",),
    "port": ("ports",),
}

MAIN_MAP_SIDECARS_BY_FAMILY = {
    "road": {"road_labels": {"required": True}},
    "rail": {"rail_stations_major": {"required": True}},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT)).replace("\\", "/")
    except ValueError:
        return path.as_posix()


def repo_text_file_signature(path: Path) -> dict[str, Any]:
    import hashlib

    text = path.read_text(encoding="utf-8")
    payload = text.replace("\r\n", "\n").encode("utf-8")
    return {
        "filename": path.name,
        "path": rel(path),
        "size_bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


def source_recipe_for(pack_id: str, output_dir: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    spec = COUNTRY_SOURCE_SPECS[pack_id]
    report = check_country_sources(spec, source_cache_root=DEFAULT_SOURCE_CACHE_ROOT)
    if not report.get("ready"):
        missing = ", ".join(item["expected_path"] for item in report.get("missing_sources", []))
        raise SystemExit(f"Missing required source files for {pack_id}: {missing}")
    recipe = build_source_recipe(spec, report)
    if pack_id == "india_airport":
        rank_signature = repo_text_file_signature(INDIA_TRAFFIC_RANK_PATH)
        recipe.setdefault("sources", []).append(
            {
                "id": "aai_air_traffic_report_june_2025_manual_rank",
                "role": "audited_importance_filter_extraction",
                "expected_path": rel(INDIA_TRAFFIC_RANK_PATH),
                "url": "https://www.aai.aero/sites/default/files/traffic-news/TRJun2k25.pdf",
                "license": "official_reference_citation_only",
                "required_fields": ["airport", "rank", "source_pdf_sha256"],
                "filter_rule": "Preview rank order comes from this audited extraction of the AAI June 2025 traffic report.",
                "notes": "Small repo-versioned extraction file keeps the PDF-derived ranking auditable without requiring a PDF text dependency.",
                "signature": rank_signature,
            }
        )
        recipe.setdefault("source_signature", {})["aai_air_traffic_report_june_2025_manual_rank"] = rank_signature
    write_json(output_dir / "source_recipe.manual.json", recipe)
    return recipe, report


def source_signature(recipe: dict[str, Any]) -> dict[str, Any]:
    return recipe.get("source_signature") or {}


def write_pack(
    pack_id: str,
    family: str,
    geometry_kind: str,
    preview: dict[str, gpd.GeoDataFrame],
    full: dict[str, gpd.GeoDataFrame],
    audit_extra: dict[str, Any],
    *,
    build_command: str,
) -> None:
    output_dir = OUTPUT_ROOT / pack_id
    output_dir.mkdir(parents=True, exist_ok=True)
    recipe, _ = source_recipe_for(pack_id, output_dir)
    generated_at = utc_now()
    paths = write_country_pack_layers(output_dir, geometry_kind, preview, full, rel_path=rel)
    counts = country_pack_feature_counts(preview, full)
    bbox = country_pack_clip_bbox(preview, full)
    audit = {
        "generated_at": generated_at,
        "adapter_id": f"{pack_id}_v1",
        "pack_id": pack_id,
        "source_policy": "real_source_cache_only",
        "source_truth": recipe.get("source_truth"),
        "geometry_truth": recipe.get("geometry_truth"),
        "source_signature": source_signature(recipe),
        "feature_counts": counts,
        **audit_extra,
    }
    write_json(output_dir / "build_audit.json", audit)
    manifest = {
        "adapter_id": f"{pack_id}_v1",
        "pack_id": pack_id,
        "family": family,
        "geometry_kind": geometry_kind,
        "country": COUNTRY_SOURCE_SPECS[pack_id].country,
        "schema_version": 1,
        "generated_at": generated_at,
        "recipe_path": rel(output_dir / "source_recipe.manual.json"),
        "distribution_tier": "single_pack",
        "paths": paths,
        "source_signature": source_signature(recipe),
        "recipe_version": recipe["version"],
        "feature_counts": counts,
        "clip_bbox": bbox,
        "build_command": build_command,
        "runtime_consumer": f"transport_workbench_{family}_preview",
        "source_policy": "real_source_cache_only",
    }
    carrier_asset_key = resolve_pack_carrier_asset_key(pack_id)
    if not carrier_asset_key:
        raise RuntimeError(f"{pack_id}: missing carrier_asset_key registry entry")
    manifest["carrier_asset_key"] = carrier_asset_key
    consumer_keys = MAIN_MAP_KEYS_BY_FAMILY.get(family)
    if consumer_keys:
        manifest.update(
            {
                "mainMapEligible": True,
                "apply_bridge_supported": True,
                "coverage_scope": "country",
                "main_map_consumer": {
                    "family": family,
                    "supported_keys": list(consumer_keys),
                },
            }
        )
        sidecars = MAIN_MAP_SIDECARS_BY_FAMILY.get(family)
        if sidecars:
            manifest["sidecars"] = sidecars
    manifest = finalize_transport_manifest(
        manifest,
        default_variant="default",
        variants={"default": {"label": "default", "distribution_tier": "single_pack", "paths": paths, "feature_counts": counts}},
        extension=resolve_pack_carrier_extension(pack_id),
    )
    if carrier_asset_key:
        manifest.setdefault("extensions", {}).setdefault("carrier", {}).update(resolve_pack_carrier_extension(pack_id))
    write_json(output_dir / "manifest.json", manifest)
    print(f"[build] {pack_id}: {counts}")


def normalize_text(value: Any) -> str:
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass
    return re.sub(r"\s+", " ", str(value or "").strip())


def normalized_column_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_text(value).casefold())


def column_lookup(frame: pd.DataFrame) -> dict[str, str]:
    return {normalized_column_key(column): str(column) for column in frame.columns}


def find_column(frame: pd.DataFrame, *candidates: str) -> str:
    lookup = column_lookup(frame)
    for candidate in candidates:
        column = lookup.get(normalized_column_key(candidate))
        if column:
            return column
    raise KeyError(f"None of the expected columns are present: {candidates}")


def optional_column(frame: pd.DataFrame, *candidates: str) -> str | None:
    lookup = column_lookup(frame)
    for candidate in candidates:
        column = lookup.get(normalized_column_key(candidate))
        if column:
            return column
    return None


def carrier_scope_geometry(country_key: str):
    carrier_path = OUTPUT_ROOT / f"{country_key}_carrier" / "carrier.json"
    payload = json.loads(carrier_path.read_text(encoding="utf-8"))
    geometries = []
    for frame in (payload.get("frames") or {}).values():
        geom_payload = (frame or {}).get("fitGeometry")
        if geom_payload:
            geometries.append(shape(geom_payload))
    if not geometries:
        raise SystemExit(f"{country_key} carrier fitGeometry is empty; cannot scope country facility packs.")
    return unary_union(geometries)


def usa_carrier_scope_geometry():
    return carrier_scope_geometry("usa")


def filter_to_carrier(gdf: gpd.GeoDataFrame, country_key: str, *, label: str | None = None) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf
    scope = carrier_scope_geometry(country_key)
    scoped = gdf[gdf.geometry.notna() & gdf.geometry.within(scope)].copy()
    if scoped.empty:
        raise SystemExit(f"{label or country_key}: carrier scope filter removed every feature.")
    return scoped


def filter_to_usa_carrier(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return filter_to_carrier(gdf, "usa", label="USA")


def clip_to_carrier(gdf: gpd.GeoDataFrame, country_key: str, *, label: str | None = None) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf
    scope = carrier_scope_geometry(country_key)
    scope_frame = gpd.GeoDataFrame(geometry=[scope], crs="EPSG:4326")
    clipped = gpd.clip(gdf[gdf.geometry.notna()].copy(), scope_frame, keep_geom_type=True)
    clipped = clipped.loc[clipped.geometry.notna() & ~clipped.geometry.is_empty].copy()
    if clipped.empty:
        raise SystemExit(f"{label or country_key}: carrier clip removed every feature.")
    return clipped


def clip_to_carrier_or_empty(gdf: gpd.GeoDataFrame, country_key: str, *, label: str | None = None) -> gpd.GeoDataFrame:
    try:
        return clip_to_carrier(gdf, country_key, label=label)
    except SystemExit:
        return gdf.iloc[0:0].copy()


def filter_lines_to_carrier_or_empty(gdf: gpd.GeoDataFrame, country_key: str) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf
    scope = carrier_scope_geometry(country_key)
    scoped = gdf[gdf.geometry.notna() & gdf.geometry.intersects(scope)].copy()
    return scoped.loc[scoped.geometry.notna() & ~scoped.geometry.is_empty].copy()


def first_zip_member(zip_path: Path, *, pattern: str) -> str:
    regex = re.compile(pattern, re.IGNORECASE)
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if regex.search(Path(name).name):
                return name
    raise SystemExit(f"{zip_path.name}: no ZIP member matches {pattern!r}.")


def source_path_for(pack_id: str, source_id: str) -> Path:
    spec = COUNTRY_SOURCE_SPECS[pack_id]
    for source in spec.sources:
        if source.id == source_id:
            return DEFAULT_SOURCE_CACHE_ROOT / spec.cache_subdir / source.filename
    raise KeyError(f"{pack_id}: unknown source id {source_id!r}")


def source_paths_for_role(pack_id: str, role: str) -> list[tuple[str, Path]]:
    spec = COUNTRY_SOURCE_SPECS[pack_id]
    return [
        (source.id, DEFAULT_SOURCE_CACHE_ROOT / spec.cache_subdir / source.filename)
        for source in spec.sources
        if source.role == role
    ]


def normalized_id_number(value: Any) -> str:
    number = pd.to_numeric(value, errors="coerce")
    if pd.isna(number):
        return normalize_text(value)
    if float(number).is_integer():
        return str(int(number))
    return normalize_text(number)


def slug_id(value: Any, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", normalize_text(value).casefold()).strip("-")
    return slug or fallback


def parse_capacity_mw(value: Any) -> float:
    text = normalize_text(value).replace(",", ".")
    if not text:
        return 0.0
    match = re.search(r"[-+]?\d+(?:\.\d+)?", text)
    if not match:
        return 0.0
    number = float(match.group(0))
    folded = text.casefold()
    if "kw" in folded and "mw" not in folded:
        return number / 1000
    if "gw" in folded:
        return number * 1000
    return number


def normalize_energy_subtype(value: Any) -> str:
    text = normalize_text(value).casefold()
    if "hydrogen" in text:
        return "storage"
    if any(token in text for token in ("solar", "solaire", "photovolta", "pv")):
        return "solar"
    if any(token in text for token in ("wind", "eolien", "éolien", "offshore")):
        return "wind"
    if any(token in text for token in ("hydroelectric", "hydropower", "hydraul", "water", "tidal", "wave")) or re.search(r"\bhydro\b", text):
        return "hydro"
    if any(token in text for token in ("battery", "batteries", "storage", "stockage", "bess")):
        return "storage"
    if any(token in text for token in ("biomass", "biomasse", "biogas", "anaerobic", "waste")):
        return "biomass"
    if any(token in text for token in ("nuclear", "nucléaire", "nucleaire")):
        return "nuclear"
    if any(token in text for token in ("geothermal", "géotherm", "geotherm")):
        return "geothermal"
    if any(token in text for token in ("gas", "diesel", "coal", "oil", "thermal", "combustion", "fossil")):
        return "thermal"
    return "other"


def bng_point(row: pd.Series, x_col: str, y_col: str):
    x = pd.to_numeric(row.get(x_col), errors="coerce")
    y = pd.to_numeric(row.get(y_col), errors="coerce")
    if pd.isna(x) or pd.isna(y):
        return None
    lon, lat = BNG_TO_WGS84.transform(float(x), float(y))
    return Point(lon, lat)



def safe_int(value: Any, default: int = 0) -> int:
    try:
        if pd.isna(value):
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default

def match_key(value: Any) -> str:
    text = normalize_text(value).casefold()
    text = re.sub(r"\b(international|airport|aerodrome|civil|municipal|intl|ltd|limited)\b", " ", text)
    text = re.sub(r"(国际机场|國際機場|機場|机场|航空站|аэропорт|аэродром)", " ", text)
    return re.sub(r"[^\w\u0400-\u04ff\u4e00-\u9fff]+", "", text)


def is_operating_france_rail_status(value: Any) -> bool:
    # SNCF's source status is localized and can arrive with lossy accent decoding.
    # The stable contract is the leading "Exploit..." token for operating lines.
    return normalize_text(value).casefold().startswith("exploit")


def load_india_traffic_rank(pdf_path: Path) -> dict[str, Any]:
    rank_payload = json.loads(INDIA_TRAFFIC_RANK_PATH.read_text(encoding="utf-8"))
    expected_pdf_sha = rank_payload.get("source_pdf_sha256")
    actual_pdf_sha = file_signature(pdf_path)["sha256"]
    if expected_pdf_sha != actual_pdf_sha:
        raise SystemExit(
            "India AAI traffic rank extraction is stale: "
            f"{INDIA_TRAFFIC_RANK_PATH} expects {expected_pdf_sha}, PDF is {actual_pdf_sha}"
        )
    rows = rank_payload.get("ranked_airports") or []
    if not rows:
        raise SystemExit(f"{INDIA_TRAFFIC_RANK_PATH} has no ranked_airports rows.")
    seen_ranks: set[int] = set()
    traffic_rank: dict[str, int] = {}
    for row in rows:
        rank = safe_int(row.get("rank"))
        airport = normalize_text(row.get("airport"))
        if rank <= 0 or rank in seen_ranks or not airport:
            raise SystemExit(f"{INDIA_TRAFFIC_RANK_PATH} contains invalid rank row: {row}")
        seen_ranks.add(rank)
        for alias in [airport, *(row.get("aliases") or [])]:
            key = match_key(alias)
            if key:
                traffic_rank[key] = rank
    return {
        "rank_by_key": traffic_rank,
        "rows": rows,
        "source_pdf_sha256": actual_pdf_sha,
        "rank_file_signature": repo_text_file_signature(INDIA_TRAFFIC_RANK_PATH),
    }


def official_aliases(name: str) -> list[str]:
    aliases: list[str] = []
    raw = normalize_text(name)
    candidates = [raw]
    if "/" in raw:
        pieces = [part.strip() for part in raw.split("/") if part.strip()]
        candidates.append("".join(pieces))
    for candidate in candidates:
        key = match_key(candidate)
        if key and key not in aliases:
            aliases.append(key)
    return aliases


def simplified_lines(gdf: gpd.GeoDataFrame, tolerance: float = 0.003) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf.copy()
    out = gdf.copy()
    out["geometry"] = out.geometry.apply(lambda geom: shapely_transform(lambda x, y, z=None: (x, y), geom) if geom is not None and not geom.is_empty else geom)
    out["geometry"] = out.geometry.simplify(tolerance, preserve_topology=False)
    out = out.loc[out.geometry.notnull() & ~out.geometry.is_empty].copy()
    return out


def line_labels(gdf: gpd.GeoDataFrame, name_col: str = "name", *, max_labels: int = 5000) -> gpd.GeoDataFrame:
    rows = []
    seen: set[str] = set()
    for row in gdf.itertuples(index=False):
        geom = getattr(row, "geometry")
        name = normalize_text(getattr(row, name_col, ""))
        key = match_key(name)
        if geom is None or geom.is_empty or not name or key in seen:
            continue
        seen.add(key)
        point = geom.interpolate(0.5, normalized=True)
        rows.append({"id": getattr(row, "id"), "name": name, "geometry": point})
        if len(rows) >= max_labels:
            break
    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")


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
OSM_ROAD_PREVIEW_CLASSES = frozenset({"motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link", "secondary_link"})
OSM_RAILWAY_FULL_CLASSES = frozenset({"rail", "light_rail", "subway", "tram", "narrow_gauge"})
OSM_RAILWAY_PREVIEW_CLASSES = frozenset({"rail", "light_rail", "subway", "narrow_gauge"})
OSM_RAIL_SERVICE_CLASSES = frozenset({"yard", "siding", "spur", "crossover"})
OSM_STATION_CLASSES = frozenset({"station", "halt", "tram_stop"})
OSM_PBF_LINE_COLUMNS = ["osm_id", "name", "highway", "railway", "other_tags"]
OSM_PBF_POINT_COLUMNS = ["osm_id", "name", "ref", "other_tags"]


def parse_osm_hstore_tags(value: Any) -> dict[str, str]:
    text = normalize_text(value)
    if not text:
        return {}
    return {match.group(1): match.group(2) for match in re.finditer(r'"([^"]+)"=>"([^"]*)"', text)}


def osm_tag(row_data: dict[str, Any], key: str) -> str:
    direct = normalize_text(row_data.get(key))
    if direct:
        return direct
    return normalize_text(parse_osm_hstore_tags(row_data.get("other_tags")).get(key))


def osm_tag_in_where(key: str, values: Iterable[str]) -> str:
    checks = [f"{key} IN ({','.join(repr(value) for value in values)})"]
    checks.extend(f"other_tags LIKE '%\"{key}\"=>\"{value}\"%'" for value in values)
    return "(" + " OR ".join(checks) + ")"


def read_osm_pbf_layer(path: Path, *, layer: str, columns: list[str], where: str) -> gpd.GeoDataFrame:
    try:
        return pyogrio.read_dataframe(path, layer=layer, columns=columns, where=where)
    except ValueError:
        # Some GDAL OSM builds expose important tags only through other_tags.
        return pyogrio.read_dataframe(path, layer=layer, where=where)


def osm_pbf_source_path(pack_id: str) -> Path:
    return source_path_for(pack_id, "geofabrik_osm_pbf")


def build_osm_pbf_road_pack(pack_id: str, country_key: str, *, full_limit: int = 50000, preview_limit: int = 8000) -> None:
    source_path = osm_pbf_source_path(pack_id)
    where = osm_tag_in_where("highway", sorted(OSM_ROAD_FULL_CLASSES))
    source = read_osm_pbf_layer(source_path, layer="lines", columns=OSM_PBF_LINE_COLUMNS, where=where).to_crs("EPSG:4326")
    rows = []
    for row in source.itertuples(index=False):
        row_data = row._asdict()
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty:
            continue
        road_class = osm_tag(row_data, "highway")
        if road_class not in OSM_ROAD_FULL_CLASSES:
            continue
        osm_id = normalize_text(row_data.get("osm_id")) or str(len(rows))
        rows.append(
            {
                "id": f"{country_key}-osm-road-{osm_id}",
                "name": osm_tag(row_data, "name") or osm_tag(row_data, "ref") or road_class,
                "ref": osm_tag(row_data, "ref"),
                "road_class": road_class,
                "source_region": country_key.upper(),
                "source_osm_id": osm_id,
                "source_highway": road_class,
                "geometry": geom,
            }
        )
    roads = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if roads.empty:
        raise SystemExit(f"{pack_id}: OSM PBF road selection is empty.")
    roads = clip_to_carrier(roads, country_key, label=pack_id)
    roads = roads.assign(_class_rank=roads["road_class"].map(OSM_ROAD_CLASS_RANK).fillna(99), _named=roads["name"].astype(str).ne(""))
    roads = roads.sort_values(["_class_rank", "_named", "id"], ascending=[True, False, True]).head(full_limit)
    roads = roads.drop(columns=["_class_rank", "_named"])
    roads = simplified_lines(roads, tolerance=0.002)
    preview = roads[roads["road_class"].isin(OSM_ROAD_PREVIEW_CLASSES)].head(preview_limit).copy()
    if preview.empty:
        raise SystemExit(f"{pack_id}: OSM PBF preview road selection is empty.")
    write_pack(
        pack_id,
        "road",
        "line",
        {"roads": preview, "road_labels": line_labels(preview, max_labels=800)},
        {"roads": roads, "road_labels": line_labels(roads, max_labels=2500)},
        {
            "source_row_count": {"osm_pbf_lines_filtered": len(source)},
            "matched_count": len(roads),
            "preview_rule": f"OSM highway classes motorway/trunk/primary/secondary and links capped at {preview_limit} rows.",
            "scope_rule": f"Geofabrik extract clipped to transport_carrier:{country_key}.",
            "filter_rule": "OSM highway class whitelist; service, residential, track, and unknown highway classes are left for later local-detail packs.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def osm_rail_service(row_data: dict[str, Any]) -> str:
    return osm_tag(row_data, "service")


def build_osm_pbf_rail_pack(pack_id: str, country_key: str, *, full_limit: int = 50000, preview_limit: int = 8000, station_limit: int = 2500) -> None:
    source_path = osm_pbf_source_path(pack_id)
    rail_where = osm_tag_in_where("railway", sorted(OSM_RAILWAY_FULL_CLASSES))
    line_source = read_osm_pbf_layer(source_path, layer="lines", columns=OSM_PBF_LINE_COLUMNS, where=rail_where).to_crs("EPSG:4326")
    rows = []
    for row in line_source.itertuples(index=False):
        row_data = row._asdict()
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty:
            continue
        railway = osm_tag(row_data, "railway")
        if railway not in OSM_RAILWAY_FULL_CLASSES:
            continue
        service = osm_rail_service(row_data)
        osm_id = normalize_text(row_data.get("osm_id")) or str(len(rows))
        rows.append(
            {
                "id": f"{country_key}-osm-rail-{osm_id}",
                "name": osm_tag(row_data, "name") or osm_tag(row_data, "ref") or railway,
                "railway": railway,
                "service": service,
                "usage": osm_tag(row_data, "usage"),
                "operator": osm_tag(row_data, "operator"),
                "status": "active",
                "source_osm_id": osm_id,
                "geometry": geom,
            }
        )
    railways = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if railways.empty:
        raise SystemExit(f"{pack_id}: OSM PBF rail selection is empty.")
    railways = clip_to_carrier(railways, country_key, label=pack_id)
    railways = railways.assign(_service_rank=railways["service"].isin(OSM_RAIL_SERVICE_CLASSES).astype(int), _named=railways["name"].astype(str).ne(""))
    railways = railways.sort_values(["_service_rank", "_named", "id"], ascending=[True, False, True]).head(full_limit)
    railways = railways.drop(columns=["_service_rank", "_named"])
    railways = simplified_lines(railways, tolerance=0.002)
    preview_lines = railways[
        railways["railway"].isin(OSM_RAILWAY_PREVIEW_CLASSES) & ~railways["service"].isin(OSM_RAIL_SERVICE_CLASSES)
    ].head(preview_limit).copy()
    if preview_lines.empty:
        raise SystemExit(f"{pack_id}: OSM PBF preview rail selection is empty.")

    station_where = (
        "other_tags LIKE '%\"railway\"=>%' OR "
        "other_tags LIKE '%\"public_transport\"=>%' OR "
        "other_tags LIKE '%\"building\"=>\"train_station\"%'"
    )
    station_source = read_osm_pbf_layer(source_path, layer="points", columns=OSM_PBF_POINT_COLUMNS, where=station_where).to_crs("EPSG:4326")
    station_rows = []
    for row in station_source.itertuples(index=False):
        row_data = row._asdict()
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty:
            continue
        railway = osm_tag(row_data, "railway")
        public_transport = osm_tag(row_data, "public_transport")
        building = osm_tag(row_data, "building")
        if railway not in OSM_STATION_CLASSES and public_transport not in {"station", "stop_area"} and building != "train_station":
            continue
        name = osm_tag(row_data, "name")
        if not name:
            continue
        osm_id = normalize_text(row_data.get("osm_id")) or str(len(station_rows))
        station_rows.append(
            {
                "id": f"{country_key}-osm-rail-station-{osm_id}",
                "name": name,
                "station_code": osm_tag(row_data, "ref"),
                "station_type": railway or public_transport or building,
                "operator": osm_tag(row_data, "operator"),
                "source_osm_id": osm_id,
                "geometry": geom,
            }
        )
    stations = gpd.GeoDataFrame(station_rows, geometry="geometry", crs="EPSG:4326")
    if stations.empty:
        raise SystemExit(f"{pack_id}: OSM PBF station sidecar selection is empty.")
    stations = clip_to_carrier(stations, country_key, label=f"{pack_id}:stations")
    stations = stations.head(station_limit).copy()
    write_pack(
        pack_id,
        "rail",
        "line",
        {"railways": preview_lines, "rail_stations_major": stations.head(min(600, len(stations))).copy()},
        {"railways": railways, "rail_stations_major": stations},
        {
            "source_row_count": {"osm_pbf_lines_filtered": len(line_source), "osm_pbf_points_filtered": len(station_source)},
            "matched_count": {"railways": len(railways), "rail_stations_major": len(stations)},
            "preview_rule": f"OSM railway main classes without yard/siding/spur/crossover service rows capped at {preview_limit}; station sidecar capped at 600 preview points.",
            "scope_rule": f"Geofabrik extract clipped to transport_carrier:{country_key}.",
            "filter_rule": "OSM railway class whitelist plus service-track separation; station sidecar from railway/public_transport/building tags.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def extract_geofabrik_gpkg(zip_path: Path, output_dir: Path, source_id: str) -> Path:
    signature = file_signature(zip_path)
    target_dir = output_dir / source_id
    marker_path = target_dir / ".extract-complete.json"
    expected_marker = source_marker_from_signature(signature, key="source")
    gpkg_files = sorted(target_dir.glob("*.gpkg"))
    if marker_matches(marker_path, expected_marker) and gpkg_files and gpkg_files[0].stat().st_size > 0:
        return gpkg_files[0]
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        gpkg_members = [name for name in z.namelist() if name.casefold().endswith(".gpkg")]
        if len(gpkg_members) != 1:
            raise SystemExit(f"{zip_path.name}: expected one GeoPackage member, found {gpkg_members}")
        z.extract(gpkg_members[0], target_dir)
    gpkg_path = target_dir / gpkg_members[0]
    write_marker(marker_path, expected_marker)
    return gpkg_path


def geofabrik_gpkg_paths(pack_id: str) -> list[tuple[str, Path]]:
    extract_key = COUNTRY_SOURCE_SPECS[pack_id].cache_subdir
    extract_root = PROJECT_ROOT / ".runtime" / "tmp" / "transport" / f"{extract_key}_geofabrik_gpkg"
    return [
        (source_id, extract_geofabrik_gpkg(path, extract_root, source_id))
        for source_id, path in source_paths_for_role(pack_id, "osm_gpkg_subregion_extract")
    ]


def read_geofabrik_gpkg_layer(path: Path, layer: str, columns: list[str], *, where: str = "") -> gpd.GeoDataFrame:
    try:
        return pyogrio.read_dataframe(path, layer=layer, columns=columns, where=where or None)
    except ValueError:
        return pyogrio.read_dataframe(path, layer=layer, where=where or None)


def sql_in_values(column: str, values: Iterable[str]) -> str:
    return f"{column} IN ({','.join(repr(value) for value in values)})"


def build_osm_gpkg_road_pack(pack_id: str, country_key: str, *, full_limit: int = 50000, preview_limit: int = 4000) -> None:
    paths = geofabrik_gpkg_paths(pack_id)
    frames = []
    source_counts: dict[str, int] = {}
    per_source_limit = max(1000, int(full_limit / max(1, len(paths))) * 3)
    for source_id, gpkg_path in paths:
        frame = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_roads_free",
            ["osm_id", "fclass", "name", "ref"],
            where=sql_in_values("fclass", sorted(OSM_ROAD_FULL_CLASSES)),
        )
        source_counts[source_id] = len(frame)
        frame = frame.to_crs("EPSG:4326")
        frame["source_region"] = source_id.replace("geofabrik_gpkg_", "").replace("_", "-")
        rows = []
        for row in frame.itertuples(index=False):
            row_data = row._asdict()
            geom = row_data.get("geometry")
            road_class = normalize_text(row_data.get("fclass"))
            if geom is None or geom.is_empty or road_class not in OSM_ROAD_FULL_CLASSES:
                continue
            osm_id = normalize_text(row_data.get("osm_id")) or str(len(rows))
            rows.append(
                {
                    "id": f"{country_key}-osm-road-{osm_id}",
                    "name": normalize_text(row_data.get("name")) or normalize_text(row_data.get("ref")) or road_class,
                    "ref": normalize_text(row_data.get("ref")),
                    "road_class": road_class,
                    "source_region": normalize_text(row_data.get("source_region")),
                    "source_osm_id": osm_id,
                    "geometry": geom,
                }
            )
        region_roads = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
        if region_roads.empty:
            continue
        region_roads = region_roads.drop_duplicates(subset=["source_osm_id", "road_class"]).copy()
        region_roads = filter_lines_to_carrier_or_empty(region_roads, country_key)
        if region_roads.empty:
            continue
        region_roads = region_roads.assign(_class_rank=region_roads["road_class"].map(OSM_ROAD_CLASS_RANK).fillna(99), _named=region_roads["name"].astype(str).ne(""))
        region_roads = region_roads.sort_values(["_class_rank", "_named", "id"], ascending=[True, False, True]).head(per_source_limit)
        frames.append(region_roads.drop(columns=["_class_rank", "_named"]))
    if not frames:
        raise SystemExit(f"{pack_id}: no Geofabrik GeoPackage road sources produced scoped rows.")
    roads = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    if roads.empty:
        raise SystemExit(f"{pack_id}: Geofabrik road selection is empty.")
    roads = roads.drop_duplicates(subset=["source_osm_id", "road_class"]).copy()
    roads = roads.assign(_class_rank=roads["road_class"].map(OSM_ROAD_CLASS_RANK).fillna(99), _named=roads["name"].astype(str).ne(""))
    roads = roads.sort_values(["_class_rank", "_named", "id"], ascending=[True, False, True]).head(full_limit)
    roads = roads.drop(columns=["_class_rank", "_named"])
    roads = simplified_lines(roads, tolerance=0.002)
    preview = roads[roads["road_class"].isin(OSM_ROAD_PREVIEW_CLASSES)].head(preview_limit).copy()
    if preview.empty:
        raise SystemExit(f"{pack_id}: Geofabrik preview road selection is empty.")
    write_pack(
        pack_id,
        "road",
        "line",
        {"roads": preview, "road_labels": line_labels(preview, max_labels=800)},
        {"roads": roads, "road_labels": line_labels(roads, max_labels=2500)},
        {
            "source_row_count": source_counts,
            "matched_count": len(roads),
            "preview_rule": f"Geofabrik free GeoPackage major OSM road classes capped at {preview_limit} rows.",
            "scope_rule": f"Subregion GeoPackages clipped to transport_carrier:{country_key}.",
            "filter_rule": "OSM fclass whitelist; local/residential/track/service road classes remain future local-detail packs.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def build_osm_gpkg_rail_pack(pack_id: str, country_key: str, *, full_limit: int = 50000, preview_limit: int = 4000, station_limit: int = 2500) -> None:
    paths = geofabrik_gpkg_paths(pack_id)
    line_frames = []
    station_frames = []
    source_counts: dict[str, dict[str, int]] = {}
    per_source_line_limit = max(1000, int(full_limit / max(1, len(paths))) * 3)
    per_source_station_limit = max(200, int(station_limit / max(1, len(paths))) * 3)
    for source_id, gpkg_path in paths:
        lines = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_railways_free",
            ["osm_id", "fclass", "name"],
            where=sql_in_values("fclass", sorted(OSM_RAILWAY_FULL_CLASSES)),
        )
        stations = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_transport_free",
            ["osm_id", "fclass", "name"],
            where="fclass = 'railway_station'",
        )
        source_counts[source_id] = {"railways": len(lines), "transport": len(stations)}
        lines = lines.to_crs("EPSG:4326")
        stations = stations.to_crs("EPSG:4326")
        lines["source_region"] = source_id.replace("geofabrik_gpkg_", "").replace("_", "-")
        stations["source_region"] = source_id.replace("geofabrik_gpkg_", "").replace("_", "-")
        rail_rows = []
        for row in lines.itertuples(index=False):
            row_data = row._asdict()
            geom = row_data.get("geometry")
            railway = normalize_text(row_data.get("fclass"))
            if geom is None or geom.is_empty or railway not in OSM_RAILWAY_FULL_CLASSES:
                continue
            osm_id = normalize_text(row_data.get("osm_id")) or str(len(rail_rows))
            rail_rows.append(
                {
                    "id": f"{country_key}-osm-rail-{osm_id}",
                    "name": normalize_text(row_data.get("name")) or railway,
                    "railway": railway,
                    "service": "",
                    "status": "active",
                    "source_region": normalize_text(row_data.get("source_region")),
                    "source_osm_id": osm_id,
                    "geometry": geom,
                }
            )
        region_railways = gpd.GeoDataFrame(rail_rows, geometry="geometry", crs="EPSG:4326")
        if not region_railways.empty:
            region_railways = region_railways.drop_duplicates(subset=["source_osm_id", "railway"]).copy()
            region_railways = filter_lines_to_carrier_or_empty(region_railways, country_key)
            if region_railways.empty:
                continue
            region_railways = region_railways.sort_values(["railway", "name", "id"]).head(per_source_line_limit)
            line_frames.append(region_railways)
        station_rows = []
        for row in stations.itertuples(index=False):
            row_data = row._asdict()
            geom = row_data.get("geometry")
            station_type = normalize_text(row_data.get("fclass"))
            name = normalize_text(row_data.get("name"))
            if geom is None or geom.is_empty or station_type != "railway_station" or not name:
                continue
            osm_id = normalize_text(row_data.get("osm_id")) or str(len(station_rows))
            station_rows.append(
                {
                    "id": f"{country_key}-osm-rail-station-{osm_id}",
                    "name": name,
                    "station_type": station_type,
                    "source_region": normalize_text(row_data.get("source_region")),
                    "source_osm_id": osm_id,
                    "geometry": geom,
                }
            )
        region_stations = gpd.GeoDataFrame(station_rows, geometry="geometry", crs="EPSG:4326")
        if not region_stations.empty:
            region_stations = region_stations.drop_duplicates(subset=["source_osm_id", "name"]).copy()
            region_stations = clip_to_carrier_or_empty(region_stations, country_key, label=f"{pack_id}:stations:{source_id}")
            if region_stations.empty:
                continue
            region_stations = region_stations.head(per_source_station_limit).copy()
            station_frames.append(region_stations)
    if not line_frames:
        raise SystemExit(f"{pack_id}: no Geofabrik GeoPackage rail sources produced scoped rows.")
    railways = gpd.GeoDataFrame(pd.concat(line_frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    if railways.empty:
        raise SystemExit(f"{pack_id}: Geofabrik rail selection is empty.")
    railways = railways.drop_duplicates(subset=["source_osm_id", "railway"]).copy()
    railways = railways.sort_values(["railway", "name", "id"]).head(full_limit)
    railways = simplified_lines(railways, tolerance=0.002)
    preview_lines = railways[railways["railway"].isin(OSM_RAILWAY_PREVIEW_CLASSES)].head(preview_limit).copy()
    if preview_lines.empty:
        raise SystemExit(f"{pack_id}: Geofabrik preview rail selection is empty.")
    if not station_frames:
        raise SystemExit(f"{pack_id}: no Geofabrik GeoPackage station sources produced scoped rows.")
    stations = gpd.GeoDataFrame(pd.concat(station_frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    if stations.empty:
        raise SystemExit(f"{pack_id}: Geofabrik station sidecar selection is empty.")
    stations = stations.drop_duplicates(subset=["source_osm_id", "name"]).copy()
    stations = stations.head(station_limit).copy()
    write_pack(
        pack_id,
        "rail",
        "line",
        {"railways": preview_lines, "rail_stations_major": stations.head(min(400, len(stations))).copy()},
        {"railways": railways, "rail_stations_major": stations},
        {
            "source_row_count": source_counts,
            "matched_count": {"railways": len(railways), "rail_stations_major": len(stations)},
            "preview_rule": f"Geofabrik free GeoPackage rail classes capped at {preview_limit}; station sidecar capped at 400 preview points.",
            "scope_rule": f"Subregion GeoPackages clipped to transport_carrier:{country_key}.",
            "filter_rule": "OSM fclass railway whitelist and transport fclass railway_station sidecar.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


OSM_INDUSTRIAL_LANDUSE_CLASSES = frozenset({"industrial"})
OSM_LOGISTICS_TRANSPORT_CLASSES = frozenset({"airport", "ferry_terminal", "port", "railway_station"})
OSM_LOGISTICS_RANK_BY_CLASS = {
    "airport": 3,
    "port": 3,
    "ferry_terminal": 2,
    "railway_station": 2,
}


def build_osm_gpkg_industrial_zone_centers_pack(
    pack_id: str,
    country_key: str,
    *,
    full_limit: int = 12000,
    preview_limit: int = 500,
) -> None:
    paths = geofabrik_gpkg_paths(pack_id)
    frames = []
    source_counts: dict[str, int] = {}
    per_source_limit = max(1000, int(full_limit / max(1, len(paths))) * 3)
    for source_id, gpkg_path in paths:
        source = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_landuse_a_free",
            ["osm_id", "fclass", "name"],
            where=sql_in_values("fclass", sorted(OSM_INDUSTRIAL_LANDUSE_CLASSES)),
        )
        source_counts[source_id] = len(source)
        source = source.to_crs("EPSG:4326")
        source_region = source_id.replace("geofabrik_gpkg_", "").replace("_", "-")
        rows = []
        for row in source.itertuples(index=False):
            row_data = row._asdict()
            geom = row_data.get("geometry")
            site_class = normalize_text(row_data.get("fclass"))
            if geom is None or geom.is_empty or site_class not in OSM_INDUSTRIAL_LANDUSE_CLASSES:
                continue
            point = representative_point(geom)
            if point is None:
                continue
            osm_id = normalize_text(row_data.get("osm_id")) or str(len(rows))
            name = normalize_text(row_data.get("name")) or f"OSM industrial landuse {osm_id}"
            rows.append(
                {
                    "id": f"{country_key}-osm-industrial-{slug_id(source_region, 'region')}-{slug_id(osm_id, str(len(rows) + 1))}",
                    "name": name,
                    "zone_type": "industrial_landuse_center",
                    "site_class": "industrial_landuse",
                    "coastal_inland_label": "inland",
                    "source": "OpenStreetMap landuse=industrial representative point",
                    "source_region": source_region,
                    "source_osm_id": osm_id,
                    "source_fclass": site_class,
                    "source_area_hint": round(float(getattr(geom, "area", 0.0) or 0.0), 12),
                    "geometry": point,
                }
            )
        if not rows:
            continue
        region = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
        region = clip_to_carrier_or_empty(region, country_key, label=f"{pack_id}:{source_id}")
        if region.empty:
            continue
        region = region.sort_values(["source_area_hint", "name"], ascending=[False, True]).head(per_source_limit)
        frames.append(region)
    if not frames:
        raise SystemExit(f"{pack_id}: no Geofabrik industrial landuse sources produced scoped rows.")
    gdf = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    gdf = gdf.drop_duplicates(subset=["source_osm_id", "source_region"]).copy()
    gdf["_named"] = gdf["name"].str.startswith("OSM industrial landuse").map(lambda value: 0 if value else 1)
    gdf = gdf.sort_values(["_named", "source_area_hint", "name"], ascending=[False, False, True]).head(full_limit)
    gdf = gdf.drop(columns=["_named"]).reset_index(drop=True)
    preview = gdf.head(preview_limit).copy()
    write_pack(
        pack_id,
        "industrial_zones",
        "point",
        {"industrial_zones": preview},
        {"industrial_zones": gdf},
        {
            "source_row_count": source_counts,
            "matched_count": len(gdf),
            "preview_rule": f"Top {preview_limit} named-first OSM landuse=industrial representative points after {country_key} carrier clip.",
            "scope_rule": f"Filtered through transport_carrier:{country_key}; Geofabrik zone extracts are carrier-clipped to the {country_key} workbench scope.",
            "filter_rule": "Geofabrik gis_osm_landuse_a_free fclass=industrial polygons converted to representative points for a compact first-wave country preview.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def osm_gpkg_logistics_hub_type(fclass: str) -> str:
    if fclass == "airport":
        return "air_cargo_terminal"
    if fclass == "railway_station":
        return "rail_cargo_station"
    return "truck_terminal"


def build_osm_gpkg_logistics_hub_pack(
    pack_id: str,
    country_key: str,
    *,
    full_limit: int = 5000,
    preview_limit: int = 500,
) -> None:
    paths = geofabrik_gpkg_paths(pack_id)
    frames = []
    source_counts: dict[str, dict[str, int]] = {}
    per_source_limit = max(500, int(full_limit / max(1, len(paths))) * 3)
    for source_id, gpkg_path in paths:
        point_source = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_transport_free",
            ["osm_id", "fclass", "name"],
            where=sql_in_values("fclass", sorted(OSM_LOGISTICS_TRANSPORT_CLASSES)),
        ).to_crs("EPSG:4326")
        area_source = read_geofabrik_gpkg_layer(
            gpkg_path,
            "gis_osm_transport_a_free",
            ["osm_id", "fclass", "name"],
            where=sql_in_values("fclass", sorted(OSM_LOGISTICS_TRANSPORT_CLASSES)),
        ).to_crs("EPSG:4326")
        source_counts[source_id] = {"transport_points": len(point_source), "transport_areas": len(area_source)}
        source_region = source_id.replace("geofabrik_gpkg_", "").replace("_", "-")
        rows = []
        for layer_name, source in (("transport_point", point_source), ("transport_area", area_source)):
            for row in source.itertuples(index=False):
                row_data = row._asdict()
                geom = row_data.get("geometry")
                fclass = normalize_text(row_data.get("fclass"))
                if geom is None or geom.is_empty or fclass not in OSM_LOGISTICS_TRANSPORT_CLASSES:
                    continue
                point = geom if geom.geom_type == "Point" else representative_point(geom)
                if point is None:
                    continue
                osm_id = normalize_text(row_data.get("osm_id")) or str(len(rows))
                name = normalize_text(row_data.get("name")) or f"OSM transport terminal {fclass} {osm_id}"
                rank = OSM_LOGISTICS_RANK_BY_CLASS.get(fclass, 1)
                rows.append(
                    {
                        "id": f"{country_key}-osm-logistics-{slug_id(source_region, 'region')}-{slug_id(layer_name, 'layer')}-{slug_id(osm_id, str(len(rows) + 1))}",
                        "name": name,
                        "hub_type": osm_gpkg_logistics_hub_type(fclass),
                        "operator_classification": "other",
                        "source_operator": "",
                        "source_region": source_region,
                        "source_layer": layer_name,
                        "source_osm_id": osm_id,
                        "source_fclass": fclass,
                        "importance_rank": rank,
                        "importance": POINT_IMPORTANCE_BY_RANK.get(rank, "local_connector"),
                        "geometry": point,
                    }
                )
        if not rows:
            continue
        region = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
        region = clip_to_carrier_or_empty(region, country_key, label=f"{pack_id}:{source_id}")
        if region.empty:
            continue
        region["_named"] = region["name"].str.startswith("OSM transport terminal").map(lambda value: 0 if value else 1)
        region = region.sort_values(["importance_rank", "_named", "name"], ascending=[False, False, True]).head(per_source_limit)
        frames.append(region.drop(columns=["_named"]))
    if not frames:
        raise SystemExit(f"{pack_id}: no Geofabrik transport terminal sources produced scoped rows.")
    gdf = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    gdf = gdf.drop_duplicates(subset=["source_osm_id", "source_fclass", "source_region"]).copy()
    gdf["_named"] = gdf["name"].str.startswith("OSM transport terminal").map(lambda value: 0 if value else 1)
    gdf = gdf.sort_values(["importance_rank", "_named", "name"], ascending=[False, False, True]).head(full_limit)
    gdf = gdf.drop(columns=["_named"]).reset_index(drop=True)
    preview = gdf.head(preview_limit).copy()
    write_pack(
        pack_id,
        "logistics_hubs",
        "point",
        {"logistics_hubs": preview},
        {"logistics_hubs": gdf},
        {
            "source_row_count": source_counts,
            "matched_count": len(gdf),
            "preview_rule": f"Top {preview_limit} OSM transport terminals by terminal class rank and named status after {country_key} carrier clip.",
            "scope_rule": f"Filtered through transport_carrier:{country_key}; Geofabrik zone extracts are carrier-clipped to the {country_key} workbench scope.",
            "filter_rule": "Geofabrik transport point/area terminal classes airport, port, ferry_terminal, and railway_station mapped to existing logistics hub preview categories.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


UNLOCODE_COLUMNS = [
    "change",
    "country",
    "code",
    "name",
    "name_without_diacritics",
    "subdivision",
    "function",
    "status",
    "date",
    "iata",
    "coordinates",
    "remarks",
]


def get_gml_id(elem: ET.Element) -> str:
    return elem.attrib.get("{http://www.opengis.net/gml/3.2}id", "")


def first_text(elem: ET.Element, tag_name: str) -> str:
    for child in elem.findall(f".//{{*}}{tag_name}"):
        value = normalize_text(child.text)
        if value:
            return value
    return ""


def parse_xy_pairs(value: str) -> list[tuple[float, float]]:
    values = [float(part) for part in normalize_text(value).split()]
    return list(zip(values[0::2], values[1::2]))


def transform_dlm_point(x: float, y: float) -> Point:
    transformer = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
    lon, lat = transformer.transform(x, y)
    return Point(lon, lat)


def transform_dlm_geometry(geom):
    transformer = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
    return shapely_transform(transformer.transform, geom)


def dlm_line_from_pos_list(value: str):
    coords = parse_xy_pairs(value)
    if len(coords) < 2:
        return None
    return transform_dlm_geometry(LineString(coords))


def dlm_polygon_from_pos_list(value: str):
    coords = parse_xy_pairs(value)
    if len(coords) < 4:
        return None
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    geom = transform_dlm_geometry(Polygon(coords))
    if not geom.is_valid:
        geom = geom.buffer(0)
    return geom if geom is not None and not geom.is_empty else None


def dlm_point_from_pos(value: str):
    coords = parse_xy_pairs(value)
    if not coords:
        return None
    x, y = coords[0]
    return transform_dlm_point(x, y)


def representative_point(geom):
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Point":
        return geom
    return geom.representative_point()


def dlm_source_zip() -> Path:
    return DEFAULT_SOURCE_CACHE_ROOT / "germany_road" / "dlm250.utm32s.nas_bda.kompakt.zip"


def read_unlocode_frame() -> pd.DataFrame:
    zip_path = DEFAULT_SOURCE_CACHE_ROOT / "unlocode" / "unlocode_2025-1_artifacts.zip"
    parts: list[pd.DataFrame] = []
    with zipfile.ZipFile(zip_path) as z:
        names = sorted(name for name in z.namelist() if name.startswith("release/csv/UNLOCODE CodeListPart"))
        for name in names:
            with z.open(name) as handle:
                parts.append(
                    pd.read_csv(
                        handle,
                        header=None,
                        names=UNLOCODE_COLUMNS,
                        encoding="latin1",
                        dtype=str,
                        keep_default_na=False,
                    )
                )
    if not parts:
        raise SystemExit("UN/LOCODE release has no CSV code-list parts.")
    return pd.concat(parts, ignore_index=True)


def parse_unlocode_coordinate(value: Any):
    text = normalize_text(value).upper()
    match = re.match(r"^(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])$", text)
    if not match:
        return None
    lat_deg, lat_min, lat_dir, lon_deg, lon_min, lon_dir = match.groups()
    lat = int(lat_deg) + int(lat_min) / 60
    lon = int(lon_deg) + int(lon_min) / 60
    if lat_dir == "S":
        lat *= -1
    if lon_dir == "W":
        lon *= -1
    return Point(lon, lat)


def build_unlocode_point_pack(
    pack_id: str,
    *,
    family: str,
    collection_key: str,
    country_code: str,
    function_index: int,
    marker: str,
    preview_limit: int,
) -> None:
    df = read_unlocode_frame()
    df = df[df["country"].str.upper().eq(country_code.upper())].copy()
    df["function"] = df["function"].fillna("").astype(str)
    df = df[df["function"].str.len().gt(function_index)]
    df = df[df["function"].str[function_index].eq(marker)].copy()
    rows = []
    for _, row in df.iterrows():
        geom = parse_unlocode_coordinate(row.get("coordinates"))
        if geom is None:
            continue
        code = normalize_text(row.get("code")).upper()
        country = normalize_text(row.get("country")).upper()
        name = normalize_text(row.get("name")) or normalize_text(row.get("name_without_diacritics")) or f"{country}{code}"
        rows.append(
            {
                "id": f"{country.lower()}-{family}-{code.lower()}",
                "name": name,
                "unlocode": f"{country}{code}",
                "subdivision": normalize_text(row.get("subdivision")),
                "function": normalize_text(row.get("function")),
                "status": normalize_text(row.get("status")),
                "date": normalize_text(row.get("date")),
                "iata": normalize_text(row.get("iata")),
                "importance_rank_source": "unlocode_status_iata",
                "geometry": geom,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: UN/LOCODE selection produced no coordinate rows.")
    gdf = apply_point_importance(
        gdf,
        family,
        gdf.apply(lambda row: unlocode_importance_rank(family, row.get("status"), row.get("iata")), axis=1),
    )
    status_rank = {"AA": 0, "AC": 1, "AI": 2, "RL": 3, "RQ": 4}
    gdf["_status_rank"] = gdf["status"].map(lambda value: status_rank.get(normalize_text(value).upper(), 9))
    gdf["_date_rank"] = gdf["date"].map(safe_int)
    preview = gdf.sort_values(["_status_rank", "_date_rank", "name"], ascending=[True, False, True]).head(preview_limit).copy()
    gdf = gdf.drop(columns=["_status_rank", "_date_rank"])
    preview = preview.drop(columns=["_status_rank", "_date_rank"])
    write_pack(
        pack_id,
        family,
        "point",
        {collection_key: preview},
        {collection_key: gdf},
        {
            "source_row_count": {"unlocode_country_rows": int(len(df))},
            "matched_count": int(len(gdf)),
            "preview_rule": f"UN/LOCODE status/date ordering capped at {preview_limit}",
            "importance_rank_rule": "3 for airport rows with IATA, 2 for AA/AC/AI status rows, 1 for other coordinate rows",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def build_germany_road() -> None:
    pack_id = "germany_road"
    zip_path = DEFAULT_SOURCE_CACHE_ROOT / pack_id / COUNTRY_SOURCE_SPECS[pack_id].sources[0].filename
    road_meta: dict[str, dict[str, str]] = {}
    ns_gml = "{http://www.opengis.net/gml/3.2}"
    ns_xlink = "{http://www.w3.org/1999/xlink}"
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_42002.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_Strasse"):
                oid = elem.attrib.get(ns_gml + "id", "")
                road_meta[oid] = {
                    "widmung": elem.findtext(".//{*}widmung") or "",
                    "ref": elem.findtext(".//{*}bezeichnung") or "",
                }
                elem.clear()
    transformer = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
    class_map = {"1301": "motorway", "1303": "primary"}
    rows = []
    raw_axes = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_42003.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_Strassenachse"):
                raw_axes += 1
                href_el = elem.find(".//{*}istTeilVon")
                href = href_el.attrib.get(ns_xlink + "href", "") if href_el is not None else ""
                parent = href.rsplit(":", 1)[-1]
                meta = road_meta.get(parent, {})
                road_class = class_map.get(meta.get("widmung", ""))
                pos = elem.findtext(".//{*}posList")
                if road_class and pos:
                    vals = [float(v) for v in pos.split()]
                    coords = list(zip(vals[0::2], vals[1::2]))
                    geom = shapely_transform(transformer.transform, LineString(coords))
                    rows.append({"id": elem.attrib.get(ns_gml + "id", ""), "name": meta.get("ref") or road_class, "ref": meta.get("ref"), "road_class": road_class, "source_region": "DE", "geometry": geom})
                elem.clear()
    gdf = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"))
    preview = gdf[gdf["road_class"].isin(["motorway", "trunk"])].copy()
    write_pack(pack_id, "road", "line", {"roads": preview, "road_labels": line_labels(preview)}, {"roads": gdf, "road_labels": line_labels(gdf)}, {"source_row_count": {"AX_Strasse": len(road_meta), "AX_Strassenachse": raw_axes}, "matched_count": len(gdf), "filter_rule": "widmung 1301/1303 -> motorway/primary federal road context"}, build_command="python tools/build_transport_country_real_packs.py --pack germany_road")


def build_uk_road() -> None:
    pack_id = "uk_road"
    source_dir = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    zip_path = source_dir / "oproad_essh_gb.zip"
    rows = []
    raw_gb = 0
    with zipfile.ZipFile(zip_path) as z:
        shp_names = [name for name in z.namelist() if name.endswith("_RoadLink.shp")]
    for shp in shp_names:
        gdf = gpd.read_file(f"zip://{zip_path.resolve()}!{shp}")
        raw_gb += len(gdf)
        gdf = gdf.to_crs("EPSG:4326")
        mask = (gdf["class"].astype(str) == "Motorway") | (gdf["primary"].astype(str).str.lower() == "true") | (gdf["trunkRoad"].astype(str).str.lower() == "true")
        for row in gdf.loc[mask].itertuples(index=False):
            row_data = row._asdict()
            row_class = row_data.get("class")
            road_class = "motorway" if row_class == "Motorway" else ("trunk" if str(row_data.get("trunkRoad")).lower() == "true" else "primary")
            rows.append({"id": row_data.get("identifier"), "name": normalize_text(row_data.get("name1") or row_data.get("roadNumber") or ""), "ref": normalize_text(row_data.get("roadNumber") or ""), "road_class": road_class, "source_region": "GB", "geometry": row_data.get("geometry")})
    ni = gpd.read_file(source_dir / "osni_open_data_50k_transport_transport_lines.geojson").to_crs("EPSG:4326")
    raw_ni = len(ni)
    ni_mask = ni["TEMA"].astype(str).str.contains("MOTORWAY|A CLASS|A ROAD|A-CLASS|A ", case=False, na=False)
    for row in ni.loc[ni_mask].itertuples(index=False):
        tema = normalize_text(getattr(row, "TEMA", ""))
        road_class = "motorway" if "MOTORWAY" in tema.upper() else "primary"
        rows.append({"id": f"ni-{getattr(row, 'OBJECTID')}", "name": tema, "ref": "", "road_class": road_class, "source_region": "NI", "geometry": getattr(row, "geometry")})
    gdf = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"))
    preview = gdf[gdf["road_class"].isin(["motorway", "trunk"])].copy()
    write_pack(pack_id, "road", "line", {"roads": preview, "road_labels": line_labels(preview)}, {"roads": gdf, "road_labels": line_labels(gdf)}, {"source_row_count": {"os_open_roads_gb": raw_gb, "osni_50k_transport_lines": raw_ni}, "matched_count": len(gdf), "source_region_counts": gdf["source_region"].value_counts().to_dict()}, build_command="python tools/build_transport_country_real_packs.py --pack uk_road")


def build_usa_road() -> None:
    pack_id = "usa_road"
    zip_path = DEFAULT_SOURCE_CACHE_ROOT / pack_id / "tl_2024_us_primaryroads.zip"
    with zipfile.ZipFile(zip_path) as z:
        shp_name = next(name for name in z.namelist() if name.lower().endswith(".shp"))
    source = gpd.read_file(f"zip://{zip_path.resolve()}!{shp_name}").to_crs("EPSG:4326")
    rows = []
    for row in source.itertuples(index=False):
        row_data = row._asdict()
        route_type = normalize_text(row_data.get("RTTYP")).upper()
        road_class = "motorway" if route_type == "I" else ("trunk" if route_type == "U" else "primary")
        rows.append(
            {
                "id": normalize_text(row_data.get("LINEARID")) or f"us-road-{len(rows)}",
                "name": normalize_text(row_data.get("FULLNAME") or row_data.get("RTTYP") or "Primary Road"),
                "ref": normalize_text(row_data.get("RTTYP")),
                "road_class": road_class,
                "mtfcc": normalize_text(row_data.get("MTFCC")),
                "geometry": row_data.get("geometry"),
            }
        )
    gdf = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), tolerance=0.002)
    preview = gdf[gdf["road_class"].isin(["motorway", "trunk"])].copy()
    write_pack(
        pack_id,
        "road",
        "line",
        {"roads": preview, "road_labels": line_labels(preview, max_labels=800)},
        {"roads": gdf, "road_labels": line_labels(gdf, max_labels=2500)},
        {
            "source_row_count": {"tiger_primary_roads": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "TIGER RTTYP Interstate and U.S. routes first; full pack keeps all primary-road rows.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_road",
    )


def build_france_rail() -> None:
    pack_id = "france_rail"
    d = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    lines = gpd.read_file(d / "sncf_rfn_lines_formes-des-lignes-du-rfn_2026-02-19.geojson").to_crs("EPSG:4326")
    stations = gpd.read_file(d / "sncf_rfn_stations_liste-des-gares_2024-03-28.geojson").to_crs("EPSG:4326")
    lines = lines.rename(columns={"libelle": "line_status"})
    lines["id"] = lines["code_ligne"].astype(str) + "-" + lines.index.astype(str)
    lines["name"] = lines["mnemo"].fillna(lines["code_ligne"].astype(str)).astype(str)
    lines["rail_status"] = lines["line_status"].astype(str)
    lines["status"] = lines["rail_status"].map(lambda value: "active" if is_operating_france_rail_status(value) else "inactive")
    full_lines = simplified_lines(lines[["id", "name", "code_ligne", "rail_status", "status", "geometry"]].copy(), tolerance=0.0005)
    preview_lines = full_lines[full_lines["rail_status"].map(is_operating_france_rail_status)].copy()
    stations = stations[stations.geometry.notnull()].copy()
    stations["id"] = stations["code_uic"].astype(str)
    stations["name"] = stations["libelle"].astype(str)
    stations["is_passenger"] = stations["voyageurs"].astype(str).str.upper().eq("O")
    full_stations = stations[["id", "name", "code_uic", "is_passenger", "geometry"]].copy()
    preview_stations = full_stations[full_stations["is_passenger"]].copy()
    write_pack(pack_id, "rail", "line", {"railways": preview_lines, "rail_stations_major": preview_stations}, {"railways": full_lines, "rail_stations_major": full_stations}, {"source_row_count": {"sncf_lines": len(lines), "sncf_stations": len(stations)}, "matched_count": {"railways": len(full_lines), "rail_stations_major": len(full_stations)}, "preview_rule": "keep only SNCF operating/Exploitee rail lines; passenger stations only"}, build_command="python tools/build_transport_country_real_packs.py --pack france_rail")


def build_germany_rail() -> None:
    pack_id = "germany_rail"
    zip_path = dlm_source_zip()
    rows = []
    raw_lines = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_42014.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_Bahnstrecke"):
                raw_lines += 1
                geom = dlm_line_from_pos_list(first_text(elem, "posList"))
                if geom is not None:
                    line_number = first_text(elem, "nummerDerBahnstrecke")
                    categories = [normalize_text(node.text) for node in elem.findall(".//{*}bahnkategorie") if normalize_text(node.text)]
                    rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": line_number or "Bahnstrecke",
                            "rail_status": first_text(elem, "zustand"),
                            "rail_category": ",".join(categories),
                            "line_number": line_number,
                            "status": "active",
                            "geometry": geom,
                        }
                    )
                elem.clear()
    station_rows = []
    raw_stations = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_53004.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_Bahnverkehrsanlage"):
                raw_stations += 1
                geom = dlm_point_from_pos(first_text(elem, "pos"))
                if geom is not None:
                    station_rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": first_text(elem, "name") or first_text(elem, "bezeichnung") or "Bahnhof",
                            "station_category": first_text(elem, "bahnhofskategorie"),
                            "rail_category": first_text(elem, "bahnkategorie"),
                            "geometry": geom,
                        }
                    )
                elem.clear()
    railways = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), tolerance=0.0008)
    stations = gpd.GeoDataFrame(station_rows, geometry="geometry", crs="EPSG:4326")
    preview_lines = railways[railways["rail_category"].str.contains("1100|1101", na=False)].copy()
    preview_stations = stations[stations["station_category"].isin(["1010", "1020"])].copy()
    if preview_lines.empty:
        raise SystemExit(f"{pack_id}: DLM250 rail preview selection is empty.")
    if preview_stations.empty:
        raise SystemExit(f"{pack_id}: DLM250 station preview selection is empty.")
    write_pack(
        pack_id,
        "rail",
        "line",
        {"railways": preview_lines, "rail_stations_major": preview_stations},
        {"railways": railways, "rail_stations_major": stations},
        {
            "source_row_count": {"AX_Bahnstrecke": raw_lines, "AX_Bahnverkehrsanlage": raw_stations},
            "matched_count": {"railways": len(railways), "rail_stations_major": len(stations)},
            "preview_rule": "DLM250 bahnkategorie 1100/1101 lines and station categories 1010/1020.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_rail",
    )


def build_usa_rail() -> None:
    pack_id = "usa_rail"
    source_dir = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    lines = gpd.read_file(source_dir / "fra_ntad_narn_lines_us_mainline_2026-04-28.geojson").to_crs("EPSG:4326")
    stations = gpd.read_file(source_dir / "fra_ntad_amtrak_stations_2026-04-22.geojson").to_crs("EPSG:4326")
    rows = []
    for row in lines.itertuples(index=False):
        row_data = row._asdict()
        object_id = normalize_text(row_data.get("OBJECTID"))
        fra_arc_id = normalize_text(row_data.get("FRAARCID"))
        owner = normalize_text(row_data.get("RROWNER1"))
        passenger = normalize_text(row_data.get("PASSNGR"))
        stracnet = normalize_text(row_data.get("STRACNET"))
        rows.append(
            {
                "id": f"us-rail-{fra_arc_id or object_id or len(rows)}",
                "name": owner or f"NARN {fra_arc_id or object_id}",
                "operator": owner,
                "state": normalize_text(row_data.get("STATEAB")),
                "country": normalize_text(row_data.get("COUNTRY")),
                "network_class": normalize_text(row_data.get("NET")),
                "passenger_service": passenger,
                "strategic_network": stracnet,
                "miles": float(row_data.get("MILES") or 0),
                "status": "active",
                "geometry": row_data.get("geometry"),
            }
        )
    railways = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), tolerance=0.0015)
    preview_mask = railways["passenger_service"].astype(str).str.len().gt(0) | railways["strategic_network"].astype(str).str.len().gt(0)
    preview_lines = railways.loc[preview_mask].copy()
    if preview_lines.empty:
        preview_lines = railways.sort_values("miles", ascending=False).head(6000).copy()
    else:
        preview_lines = preview_lines.assign(
            _passenger_rank=preview_lines["passenger_service"].astype(str).str.len().gt(0).astype(int),
            _strategic_rank=preview_lines["strategic_network"].astype(str).str.len().gt(0).astype(int),
        ).sort_values(["_passenger_rank", "_strategic_rank", "miles"], ascending=[False, False, False]).head(8000).drop(columns=["_passenger_rank", "_strategic_rank"])
    station_rows = []
    for row in stations.itertuples(index=False):
        row_data = row._asdict()
        code = normalize_text(row_data.get("Code"))
        name = normalize_text(row_data.get("StationName") or row_data.get("StationFacilityName") or code)
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty or not name:
            continue
        station_rows.append(
            {
                "id": f"us-rail-station-{code or row_data.get('OBJECTID')}",
                "name": name,
                "station_code": code,
                "station_type": normalize_text(row_data.get("StaType")),
                "aliases": normalize_text(row_data.get("StationAliases")),
                "geometry": geom,
            }
        )
    station_gdf = gpd.GeoDataFrame(station_rows, geometry="geometry", crs="EPSG:4326")
    preview_stations = station_gdf.head(500).copy()
    write_pack(
        pack_id,
        "rail",
        "line",
        {"railways": preview_lines, "rail_stations_major": preview_stations},
        {"railways": railways, "rail_stations_major": station_gdf},
        {
            "source_row_count": {"narn_mainline_segments": len(lines), "amtrak_stations": len(stations)},
            "matched_count": {"railways": len(railways), "rail_stations_major": len(station_gdf)},
            "preview_rule": "Top 8000 NARN mainline passenger/STRACNET rows by passenger flag, strategic flag, and miles; fallback to longest mainline rows if official flags are empty.",
            "scope_rule": "COUNTRY='US' NARN rows; U.S. states plus Alaska/Hawaii as present in source, territories excluded by source filter.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_rail",
    )


def read_first_available_gpkg_layer(path: Path, layer_candidates: Iterable[str]) -> gpd.GeoDataFrame:
    last_error: Exception | None = None
    for layer in layer_candidates:
        try:
            return gpd.read_file(path, layer=layer)
        except Exception as exc:
            last_error = exc
    raise SystemExit(f"{path.name}: none of the expected layers exist: {list(layer_candidates)}; last_error={last_error!r}")


def find_7z_executable() -> str:
    configured = os.environ.get("TRANSPORT_7Z_EXE", "").strip()
    if configured:
        candidate = Path(configured)
        if candidate.exists():
            return str(candidate)
        raise SystemExit(f"TRANSPORT_7Z_EXE points to a missing 7z executable: {configured}")
    for name in ("7z", "7za", "7zz"):
        executable = shutil.which(name)
        if executable:
            return executable
    raise SystemExit("7z.exe is required to extract IGN BDCARTO .7z payloads. Put 7z/7za/7zz on PATH or set TRANSPORT_7Z_EXE.")


def extract_7z_member_flat(archive_path: Path, output_dir: Path, member_filename: str) -> Path:
    output_path = output_dir / member_filename
    marker_path = output_path.with_suffix(output_path.suffix + ".extract-complete")
    archive_signature = file_signature(archive_path)
    expected_marker = source_marker_from_signature(archive_signature, key="archive")
    expected_marker["member_filename"] = member_filename
    if marker_path.exists() and output_path.exists() and output_path.stat().st_size > 0:
        if marker_matches(marker_path, expected_marker):
            return output_path
    if output_path.exists():
        output_path.unlink()
    if marker_path.exists():
        marker_path.unlink()
    if output_path.exists() and output_path.stat().st_size > 0:
        write_marker(marker_path, expected_marker)
        return output_path
    output_dir.mkdir(parents=True, exist_ok=True)
    seven_zip = find_7z_executable()
    result = subprocess.run(
        [seven_zip, "e", str(archive_path.resolve()), member_filename, f"-o{output_dir.resolve()}", "-r", "-y"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"Failed to extract {member_filename} from {archive_path.name} with 7z.exe.\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    if not output_path.exists() or output_path.stat().st_size <= 0:
        raise SystemExit(
            f"{archive_path.name}: 7z.exe completed but did not produce {output_path}.\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    write_marker(marker_path, expected_marker)
    return output_path


def bdcarto_france_gpkg() -> Path:
    archive_path = DEFAULT_SOURCE_CACHE_ROOT / "france_road" / "BDCARTO_5-0_TOUSTHEMES_GPKG_LAMB93_FXX_2025-09-15.7z"
    output_dir = PROJECT_ROOT / ".runtime" / "tmp" / "transport" / "france_road_bdcarto_target_7z"
    return extract_7z_member_flat(archive_path, output_dir, "troncon_de_route.gpkg")


def normalize_bdcarto_importance(value: Any) -> int:
    text = normalize_text(value)
    match = re.search(r"\d+", text)
    return int(match.group(0)) if match else 9


def row_value(row_data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row_data:
            return row_data[key]
        key_folded = key.casefold()
        for actual_key, value in row_data.items():
            if actual_key.casefold() == key_folded:
                return value
    return None


def france_road_number(row_data: dict[str, Any]) -> str:
    return normalize_text(
        row_value(row_data, "NUMERO", "NUM_ROUTE", "cpx_numero", "cpx_numero_route_europeenne")
    ).upper()


def classify_france_road(row_data: dict[str, Any]) -> str:
    nature = normalize_text(row_value(row_data, "NATURE", "nature")).casefold()
    admin_class = normalize_text(row_value(row_data, "cpx_classement_administratif")).casefold()
    number = france_road_number(row_data)
    importance = normalize_bdcarto_importance(row_value(row_data, "IMPORTANCE", "importance"))
    if number.startswith("A") or "autoroute" in nature or "autoroute" in admin_class:
        return "motorway"
    if number.startswith("N") or "nationale" in admin_class or importance <= 2:
        return "trunk"
    return "primary"


def france_road_name(row_data: dict[str, Any], road_class: str) -> str:
    for key in ("NUMERO", "NUM_ROUTE", "cpx_numero", "NOM", "TOPONYME", "NOM_ITI", "cpx_toponyme_route_nommee"):
        value = normalize_text(row_value(row_data, key))
        if value:
            return value
    return road_class


FRANCE_ROAD_COLUMNS = [
    "cleabs",
    "cleabs_ge",
    "nature",
    "importance",
    "cpx_numero",
    "cpx_numero_route_europeenne",
    "cpx_classement_administratif",
    "cpx_toponyme_route_nommee",
]

FRANCE_ROAD_SOURCE_WHERE = (
    "importance in ('1','2','3') "
    "or cpx_numero is not null "
    "or cpx_classement_administratif is not null"
)
FRANCE_ROAD_FULL_MAX_ROWS = 50000


def build_france_road() -> None:
    pack_id = "france_road"
    gpkg_path = bdcarto_france_gpkg()
    source = pyogrio.read_dataframe(
        gpkg_path,
        layer="troncon_de_route",
        columns=FRANCE_ROAD_COLUMNS,
        where=FRANCE_ROAD_SOURCE_WHERE,
    )
    source = source.to_crs("EPSG:4326")
    rows = []
    for row in source.itertuples(index=False):
        row_data = row._asdict()
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty:
            continue
        importance = normalize_bdcarto_importance(row_value(row_data, "IMPORTANCE", "importance"))
        number = france_road_number(row_data)
        nature = normalize_text(row_value(row_data, "NATURE", "nature"))
        admin_class = normalize_text(row_value(row_data, "cpx_classement_administratif")).casefold()
        if importance > 4 and not number.startswith(("A", "N", "D")) and not any(
            token in admin_class for token in ("autoroute", "nationale", "departementale")
        ):
            continue
        road_class = classify_france_road(row_data)
        rows.append(
            {
                "id": f"fr-road-{normalize_text(row_value(row_data, 'ID', 'ID_TRONCON', 'ID_RTE500', 'cleabs', 'cleabs_ge') or len(rows))}",
                "name": france_road_name(row_data, road_class),
                "ref": number,
                "road_class": road_class,
                "importance": importance,
                "nature": nature,
                "source_region": "FXX",
                "geometry": geom,
            }
        )
    roads = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    class_rank = {"motorway": 0, "trunk": 1, "primary": 2}
    roads = roads.assign(_class_rank=roads["road_class"].map(class_rank).fillna(9))
    roads = roads.sort_values(["_class_rank", "importance", "ref", "id"]).head(FRANCE_ROAD_FULL_MAX_ROWS)
    roads = roads.drop(columns=["_class_rank"])
    roads = simplified_lines(roads, tolerance=0.0008)
    preview = roads[
        roads["road_class"].isin(["motorway", "trunk"]) | roads["importance"].le(2)
    ].sort_values(["road_class", "importance", "ref"]).head(6000).copy()
    if roads.empty:
        raise SystemExit(f"{pack_id}: BDCARTO road selection is empty.")
    if preview.empty:
        raise SystemExit(f"{pack_id}: BDCARTO preview road selection is empty.")
    write_pack(
        pack_id,
        "road",
        "line",
        {"roads": preview, "road_labels": line_labels(preview, max_labels=800)},
        {"roads": roads, "road_labels": line_labels(roads, max_labels=2500)},
        {
            "source_row_count": {"bdcarto_troncon_de_route": len(source)},
            "matched_count": len(roads),
            "preview_rule": "BDCARTO metropolitan France motorway/trunk/high-importance roads capped at 6000 rows.",
            "scope_rule": "IGN BDCARTO FXX France metropolitaine archive; overseas territory archives are separate and excluded.",
            "source_gpkg": rel(gpkg_path),
            "source_gpkg_signature": file_signature(gpkg_path),
        },
        build_command="python tools/build_transport_country_real_packs.py --pack france_road",
    )


def build_uk_rail() -> None:
    pack_id = "uk_rail"
    gpkg_path = DEFAULT_SOURCE_CACHE_ROOT / pack_id / "network-model.gpkg"
    source = read_first_available_gpkg_layer(gpkg_path, ["ReferenceLines", "VectorReferenceLines", "NetworkLinks", "VectorLinks"])
    source = source.to_crs("EPSG:4326")
    rows = []
    for row in source.itertuples(index=False):
        row_data = row._asdict()
        geom = row_data.get("geometry")
        if geom is None or geom.is_empty:
            continue
        elr = normalize_text(row_data.get("ELR") or row_data.get("elr"))
        trid = normalize_text(row_data.get("TRID") or row_data.get("trid"))
        rows.append(
            {
                "id": f"uk-rail-{elr or trid or len(rows)}",
                "name": elr or trid or "Network Rail route",
                "elr": elr,
                "track_id": trid,
                "status": "active",
                "geometry": geom,
            }
        )
    railways = simplified_lines(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), tolerance=0.001)
    naptan_path = DEFAULT_SOURCE_CACHE_ROOT / pack_id / "naptan_access_nodes_2026-06-02.csv"
    naptan = pd.read_csv(
        naptan_path,
        usecols=["ATCOCode", "CommonName", "StopType", "Status", "Longitude", "Latitude", "LocalityName", "Town"],
        dtype=str,
        keep_default_na=False,
    )
    station_source = naptan[
        naptan["StopType"].str.upper().eq("RSE")
        & naptan["Status"].str.casefold().eq("active")
        & naptan["Longitude"].astype(str).str.len().gt(0)
        & naptan["Latitude"].astype(str).str.len().gt(0)
    ].copy()
    station_source["_station_key"] = station_source["CommonName"].map(match_key)
    station_source = station_source[station_source["_station_key"].str.len().gt(0)].drop_duplicates("_station_key").copy()
    station_rows = []
    for row in station_source.itertuples(index=False):
        row_data = row._asdict()
        name = normalize_text(row_data.get("CommonName"))
        lon = pd.to_numeric(row_data.get("Longitude"), errors="coerce")
        lat = pd.to_numeric(row_data.get("Latitude"), errors="coerce")
        if pd.isna(lon) or pd.isna(lat) or not name:
            continue
        station_rows.append(
            {
                "id": f"uk-rail-station-{match_key(row_data.get('ATCOCode') or name)}",
                "name": name,
                "atco_code": normalize_text(row_data.get("ATCOCode")),
                "locality": normalize_text(row_data.get("LocalityName") or row_data.get("Town")),
                "station_type": "rail_station_entrance",
                "geometry": Point(float(lon), float(lat)),
            }
        )
    stations = gpd.GeoDataFrame(station_rows, geometry="geometry", crs="EPSG:4326")
    preview_lines = railways.head(5000).copy()
    preview_stations = stations.head(600).copy()
    write_pack(
        pack_id,
        "rail",
        "line",
        {"railways": preview_lines, "rail_stations_major": preview_stations},
        {"railways": railways, "rail_stations_major": stations},
        {
            "source_row_count": {"network_model_lines": len(source), "naptan_rows": len(naptan), "naptan_rail_station_rows": len(station_source)},
            "matched_count": {"railways": len(railways), "rail_stations_major": len(stations)},
            "preview_rule": "First 5000 simplified Network Rail reference lines and first 600 active NaPTAN RSE rail-station entrances after station-name de-duplication.",
            "scope_rule": "Network Rail and NaPTAN cover Great Britain; Northern Ireland rail remains a future UK source gap.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack uk_rail",
    )


def load_osm_points(path: Path) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(path).to_crs("EPSG:4326")
    if "name" not in gdf.columns:
        gdf["name"] = ""
    for col in ["iata", "icao", "name:ru", "name:zh", "name:en"]:
        if col not in gdf.columns:
            gdf[col] = ""
    text_columns = ["name", "name:en", "name:ru", "name:zh"]
    gdf["match_keys"] = gdf[text_columns].fillna("").astype(str).apply(
        lambda row: sorted({key for value in row for key in [match_key(value)] if key}),
        axis=1,
    )
    gdf["iata_key"] = gdf["iata"].fillna("").astype(str).str.strip().str.upper()
    gdf["icao_key"] = gdf["icao"].fillna("").astype(str).str.strip().str.upper()
    return gdf


def match_osm(name: str, osm: gpd.GeoDataFrame, *, iata: str = "", icao: str = ""):
    iata_key = normalize_text(iata).upper()
    icao_key = normalize_text(icao).upper()
    candidates = gpd.GeoDataFrame()
    if iata_key:
        candidates = osm[osm["iata_key"] == iata_key]
    if candidates.empty and icao_key:
        candidates = osm[osm["icao_key"] == icao_key]
    aliases = set(official_aliases(name))
    if candidates.empty and aliases:
        candidates = osm[osm["match_keys"].apply(lambda keys: bool(aliases.intersection(keys)))]
    if candidates.empty:
        return None
    return candidates.iloc[0]


def assert_unique_airport_coordinates(pack_id: str, gdf: gpd.GeoDataFrame) -> None:
    if gdf.empty:
        raise SystemExit(f"{pack_id}: airport output is empty after official-to-geometry matching.")
    coords = gdf.geometry.apply(lambda point: (round(float(point.x), 5), round(float(point.y), 5)))
    duplicates = gdf.assign(_coord=coords).groupby("_coord").filter(lambda group: len(group) > 1)
    if not duplicates.empty:
        names = duplicates[["name", "_coord"]].head(20).to_dict("records")
        raise SystemExit(f"{pack_id}: duplicate airport coordinates after strict matching: {names}")


POINT_IMPORTANCE_BY_RANK = {
    3: "national_core",
    2: "regional_core",
    1: "local_connector",
}


def apply_point_importance(gdf: gpd.GeoDataFrame, family: str, rank_values: Any) -> gpd.GeoDataFrame:
    out = gdf.copy()
    if isinstance(rank_values, pd.Series):
        raw = rank_values.reindex(out.index)
    else:
        raw = pd.Series(rank_values, index=out.index)
    ranks = pd.to_numeric(raw, errors="coerce").fillna(1).round().clip(1, 3).astype(int)
    out["importance_rank"] = ranks
    out["importance"] = ranks.map(POINT_IMPORTANCE_BY_RANK).fillna("local_connector")
    if family == "airport":
        out["airport_type"] = ranks.map({3: "national", 2: "specific_local", 1: "local"}).fillna("local")
        if "status_category" not in out.columns:
            out["status_category"] = "active"
        else:
            out["status_category"] = out["status_category"].map(lambda value: normalize_text(value) or "active")
    if family == "port":
        out["legal_designation"] = ranks.map({3: "international_hub", 2: "important", 1: "local"}).fillna("local")
        out["legal_designation_label"] = ranks.map({
            3: "International hub port",
            2: "Important port",
            1: "Local port",
        }).fillna("Local port")
        if "manager_type_code" not in out.columns:
            out["manager_type_code"] = "1"
        else:
            out["manager_type_code"] = out["manager_type_code"].map(lambda value: normalize_text(value) or "1")
    return out


def unlocode_importance_rank(family: str, status: Any, iata: Any = "") -> int:
    normalized_status = normalize_text(status).upper()
    if family == "airport" and normalize_text(iata):
        return 3
    if normalized_status in {"AA", "AC", "AI"}:
        return 2
    return 1


def build_usa_airport() -> None:
    pack_id = "usa_airport"
    d = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    with zipfile.ZipFile(d / "14_May_2026_APT_CSV.zip") as z, z.open("APT_BASE.csv") as f:
        apt = pd.read_csv(f, low_memory=False)
    enp = pd.read_excel(d / "faa_cy2024_all_enplanements_by_state_airport.xlsx")
    enp.columns = [str(c).strip() for c in enp.columns]
    enp_map = {}
    if "Locid" in enp.columns and "CY 24 Enplanements" in enp.columns:
        for _, row in enp.iterrows():
            loc = str(row.get("Locid") or "").strip()
            value = row.get("CY 24 Enplanements")
            if loc and pd.notna(value):
                enp_map[loc] = int(value)
    rows = []
    for _, row in apt.iterrows():
        facility_use = normalize_text(row.get("FACILITY_USE_CODE"))
        if row.get("SITE_TYPE_CODE") != "A" or row.get("COUNTRY_CODE") != "US" or row.get("ARPT_STATUS") != "O" or facility_use != "PU" or pd.isna(row.get("LAT_DECIMAL")) or pd.isna(row.get("LONG_DECIMAL")):
            continue
        loc = str(row.get("ARPT_ID") or "").strip()
        rows.append({"id": f"us-airport-{loc}", "name": normalize_text(row.get("ARPT_NAME")), "iata": loc, "icao": normalize_text(row.get("ICAO_ID")), "enplanements_2024": enp_map.get(loc, 0), "facility_use": facility_use, "geometry": Point(float(row["LONG_DECIMAL"]), float(row["LAT_DECIMAL"]))})
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    gdf = apply_point_importance(
        gdf,
        "airport",
        gdf.apply(
            lambda row: 3 if int(row.get("enplanements_2024") or 0) >= 10_000_000
            else 2 if int(row.get("enplanements_2024") or 0) >= 1_000_000 or bool(normalize_text(row.get("icao")))
            else 1,
            axis=1,
        ),
    )
    preview = gdf[(gdf["enplanements_2024"] >= 1000000) | (gdf["icao"].astype(str).str.len() > 0)].sort_values("enplanements_2024", ascending=False).head(250).copy()
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"APT_BASE": len(apt), "faa_enplanements": len(enp)}, "matched_count": int(gdf["enplanements_2024"].gt(0).sum()), "unmatched_official_rows": int(len(gdf) - gdf["enplanements_2024"].gt(0).sum()), "excluded_private_rows": int(apt["FACILITY_USE_CODE"].map(normalize_text).eq("PR").sum()), "preview_rule": "CY2024 enplanements >= 1,000,000 plus ICAO-coded public-use airports capped at 250", "importance_rank_rule": "3 for >=10M CY2024 enplanements, 2 for >=1M enplanements or ICAO-coded public-use airports, 1 for other public-use airports"}, build_command="python tools/build_transport_country_real_packs.py --pack usa_airport")


def build_china_airport() -> None:
    pack_id = "china_airport"
    d = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    official = pd.read_excel(d / "caac_2025_airport_throughput_ranking.xlsx", header=None, skiprows=5)
    official = official.rename(columns={0: "airport", 1: "passenger_rank", 2: "passengers", 5: "cargo_rank", 6: "cargo_tons", 9: "movement_rank", 10: "movements"})
    official = official[official["airport"].notna()].copy()
    official = official[official["airport"].astype(str) != "合计"].copy()
    osm = load_osm_points(d / "cn_tw_airport_osm_geometry_overpass_2026-05-12.geojson")
    rows = []
    unmatched = []
    for _, row in official.iterrows():
        hit = match_osm(str(row["airport"]), osm)
        if hit is None:
            unmatched.append(str(row["airport"])); continue
        rows.append({"id": "cn-airport-" + match_key(row["airport"]), "name": str(row["airport"]), "passengers": safe_int(row.get("passengers")), "passenger_rank": safe_int(row.get("passenger_rank")), "geometry": hit.geometry})
    taiwan = pd.read_html(d / "tw_airport_caa_airport_telephone_2024-08-08.html", flavor="lxml")[0]
    taiwan_names = [normalize_text(value) for value in taiwan["機場"].dropna().tolist()]
    taiwan_unmatched = []
    for name in taiwan_names:
        hit = match_osm(name, osm)
        if hit is None:
            taiwan_unmatched.append(name)
            continue
        rows.append({"id": "tw-airport-" + match_key(name), "name": name, "passengers": 0, "passenger_rank": 0, "source_region": "TW", "geometry": hit.geometry})
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    assert_unique_airport_coordinates(pack_id, gdf)
    gdf = apply_point_importance(
        gdf,
        "airport",
        gdf["passenger_rank"].map(lambda value: 3 if 0 < safe_int(value) <= 30 else 2 if 0 < safe_int(value) <= 80 else 1),
    )
    preview = gdf.sort_values("passengers", ascending=False).head(80).copy()
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"caac_airport_rows": len(official), "taiwan_caa_airport_rows": len(taiwan_names), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_taiwan_official_rows": taiwan_unmatched, "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "preview_rule": "top 80 CAAC passenger-throughput airports after strict official-name coordinate matching; Taiwan CAA objects join full output", "importance_rank_rule": "3 for CAAC passenger rank <= 30, 2 for <= 80, 1 for other matched airports"}, build_command="python tools/build_transport_country_real_packs.py --pack china_airport")


def build_russia_airport() -> None:
    pack_id = "russia_airport"
    d = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    tables = pd.read_html(d / "ru_airport_rosaviatsiya_civil_aerodrome_registry_2026-04-27.html", flavor="lxml")
    registry = tables[0]
    registry.columns = ["row_no", "name", "certificate", "operator", "class"]
    registry = registry[pd.to_numeric(registry["row_no"], errors="coerce").notna()].copy()
    osm = load_osm_points(d / "ru_airport_osm_geometry_overpass_2026-05-12.geojson")
    rows, unmatched = [], []
    for _, row in registry.iterrows():
        name = str(row["name"])
        hit = match_osm(name, osm)
        if hit is None:
            unmatched.append(name); continue
        rows.append({"id": "ru-airport-" + match_key(name), "name": name, "certificate": normalize_text(row.get("certificate")), "class": normalize_text(row.get("class")), "geometry": hit.geometry})
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    assert_unique_airport_coordinates(pack_id, gdf)
    gdf = apply_point_importance(
        gdf,
        "airport",
        gdf["class"].map(lambda value: 3 if normalize_text(value).upper() in {"A", "А", "B", "Б"} else 2 if normalize_text(value).upper() in {"C", "В"} else 1),
    )
    preview = gdf[gdf["class"].isin(["А", "Б", "В", "A", "B", "C"])].copy().head(120)
    if preview.empty:
        raise SystemExit(f"{pack_id}: preview selection is empty; check Rosaviatsiya class parsing.")
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"rosaviatsiya_registry_rows": len(registry), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "preview_rule": "official class A/B/Cyrillic А/Б/В first, capped at 120", "importance_rank_rule": "3 for class A/B, 2 for class C, 1 for other matched civil aerodromes"}, build_command="python tools/build_transport_country_real_packs.py --pack russia_airport")


def build_india_airport() -> None:
    pack_id = "india_airport"
    d = DEFAULT_SOURCE_CACHE_ROOT / pack_id
    text = (d / "in_airport_aai_operational_airports_2026-05.html").read_text(encoding="utf-8", errors="ignore")
    names = []
    for href, value, label in re.findall(r"<a[^>]+href\s*=\s*['\"]([^'\"]+)['\"][^>]+value\s*=\s*['\"]([^'\"]*)['\"][^>]*>(.*?)</a>", text, re.I | re.S):
        name = normalize_text(re.sub("<.*?>", " ", label))
        if name and name.lower() not in {"english", "skip"}:
            names.append(name)
    official = sorted(set(names))
    osm = load_osm_points(d / "in_airport_osm_geometry_overpass_2026-05-12.geojson")
    rows, unmatched = [], []
    for name in official:
        hit = match_osm(name, osm)
        if hit is None:
            unmatched.append(name); continue
        rows.append({"id": "in-airport-" + match_key(name), "name": name, "iata": normalize_text(hit.get("iata")), "icao": normalize_text(hit.get("icao")), "geometry": hit.geometry})
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    assert_unique_airport_coordinates(pack_id, gdf)
    traffic_source = load_india_traffic_rank(d / "aai_air_traffic_report_june_2025_TRJun2k25.pdf")
    traffic_rank = traffic_source["rank_by_key"]
    gdf["traffic_report_rank"] = gdf["name"].map(lambda name: traffic_rank.get(match_key(name), 9999))
    gdf = apply_point_importance(
        gdf,
        "airport",
        gdf["traffic_report_rank"].map(lambda value: 3 if 0 < safe_int(value) <= 20 else 2 if 0 < safe_int(value) <= 100 else 1),
    )
    preview = gdf[gdf["traffic_report_rank"] < 9999].sort_values("traffic_report_rank").head(100).copy()
    if preview.empty:
        raise SystemExit(f"{pack_id}: AAI traffic-report preview rank matched zero airports.")
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"aai_airport_list_rows": len(official), "aai_traffic_rank_rows": len(traffic_source["rows"]), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "traffic_rank_source": {"path": rel(INDIA_TRAFFIC_RANK_PATH), "rows": len(traffic_source["rows"]), "source_pdf_sha256": traffic_source["source_pdf_sha256"], "rank_file_signature": traffic_source["rank_file_signature"]}, "preview_rule": "AAI June 2025 traffic-report audited rank extraction matched against AAI airport-list objects", "importance_rank_rule": "3 for audited traffic rank <= 20, 2 for <= 100, 1 for other matched AAI airports"}, build_command="python tools/build_transport_country_real_packs.py --pack india_airport")


def build_germany_airport() -> None:
    pack_id = "germany_airport"
    path = DEFAULT_SOURCE_CACHE_ROOT / pack_id / "bkg_poi_open_flughaefen_2025-12.geojson"
    source = gpd.read_file(path)
    if source.crs is None:
        source = source.set_crs("EPSG:4326")
    source = source.to_crs("EPSG:4326")
    rows = []
    for index, row in source.iterrows():
        properties = row.to_dict()
        geom = representative_point(properties.get("geometry"))
        if geom is None:
            continue
        name = normalize_text(
            properties.get("name")
            or properties.get("NAME")
            or properties.get("objektname")
            or properties.get("bezeichnung")
            or properties.get("typ")
            or "Flughafen"
        )
        rows.append(
            {
                "id": normalize_text(properties.get("poi_id") or properties.get("id") or f"de-airport-{index}"),
                "name": name,
                "icao": normalize_text(properties.get("icao_code") or properties.get("icao") or properties.get("ICAO")),
                "facility_type": normalize_text(properties.get("typ") or properties.get("type") or "airport"),
                "geometry": geom,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: BKG POI-Open airport layer produced no rows.")
    gdf = apply_point_importance(gdf, "airport", [2] * len(gdf))
    write_pack(
        pack_id,
        "airport",
        "point",
        {"airports": gdf},
        {"airports": gdf},
        {
            "source_row_count": {"bkg_poi_open_airports": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "BKG POI-Open airport WFS rows are already airport-scoped.",
            "importance_rank_rule": "2 for BKG POI-Open airport-scoped rows without traffic ranking fields",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_airport",
    )


def build_france_airport() -> None:
    build_unlocode_point_pack(
        "france_airport",
        family="airport",
        collection_key="airports",
        country_code="FR",
        function_index=3,
        marker="4",
        preview_limit=160,
    )


def build_uk_airport() -> None:
    build_unlocode_point_pack(
        "uk_airport",
        family="airport",
        collection_key="airports",
        country_code="GB",
        function_index=3,
        marker="4",
        preview_limit=160,
    )


def build_usa_port() -> None:
    build_unlocode_point_pack("usa_port", family="port", collection_key="ports", country_code="US", function_index=0, marker="1", preview_limit=260)


def build_germany_port() -> None:
    build_unlocode_point_pack("germany_port", family="port", collection_key="ports", country_code="DE", function_index=0, marker="1", preview_limit=220)


def build_france_port() -> None:
    build_unlocode_point_pack("france_port", family="port", collection_key="ports", country_code="FR", function_index=0, marker="1", preview_limit=220)


def build_uk_port() -> None:
    build_unlocode_point_pack("uk_port", family="port", collection_key="ports", country_code="GB", function_index=0, marker="1", preview_limit=220)


def build_china_port() -> None:
    build_unlocode_point_pack("china_port", family="port", collection_key="ports", country_code="CN", function_index=0, marker="1", preview_limit=260)


def build_india_port() -> None:
    build_unlocode_point_pack("india_port", family="port", collection_key="ports", country_code="IN", function_index=0, marker="1", preview_limit=220)


def build_russia_port() -> None:
    build_unlocode_point_pack("russia_port", family="port", collection_key="ports", country_code="RU", function_index=0, marker="1", preview_limit=220)


def eia_energy_subtype(code: Any) -> str:
    normalized = normalize_text(code).upper()
    groups = {
        "BIT": "coal",
        "LIG": "coal",
        "SUB": "coal",
        "WC": "coal",
        "NG": "natural_gas",
        "NUC": "nuclear",
        "WAT": "hydro",
        "WND": "wind",
        "SUN": "solar",
        "DFO": "oil",
        "RFO": "oil",
        "JF": "oil",
        "OBG": "biomass",
        "OBL": "biomass",
        "OBS": "biomass",
        "WDS": "biomass",
        "GEO": "geothermal",
        "MWH": "storage",
    }
    return groups.get(normalized, normalized.casefold() or "unknown")


def build_usa_energy_facilities() -> None:
    pack_id = "usa_energy_facilities"
    zip_path = source_path_for(pack_id, "eia_860_2024_final")
    plant_member = first_zip_member(zip_path, pattern=r"2.*plant.*\.xlsx$")
    generator_member = first_zip_member(zip_path, pattern=r"3_1.*generator.*\.xlsx$")
    with zipfile.ZipFile(zip_path) as z:
        with z.open(plant_member) as handle:
            plants = pd.read_excel(handle, sheet_name=0, engine="openpyxl", header=1)
        with z.open(generator_member) as handle:
            generators = pd.read_excel(handle, sheet_name="Operable", engine="openpyxl", header=1)

    plant_code_col = find_column(plants, "Plant Code")
    plant_name_col = find_column(plants, "Plant Name")
    state_col = find_column(plants, "State")
    lat_col = find_column(plants, "Latitude")
    lon_col = find_column(plants, "Longitude")
    county_col = optional_column(plants, "County")
    gen_plant_code_col = find_column(generators, "Plant Code")
    energy_col = find_column(generators, "Energy Source 1", "Energy Source Code")
    capacity_col = find_column(generators, "Nameplate Capacity (MW)")
    status_col = find_column(generators, "Status")

    generator_rows = generators.copy()
    generator_rows["_capacity_mw"] = pd.to_numeric(generator_rows[capacity_col], errors="coerce").fillna(0.0)
    generator_rows["_plant_key"] = generator_rows[gen_plant_code_col].map(normalized_id_number)
    generator_rows["_energy_source"] = generator_rows[energy_col].map(normalize_text)
    generator_rows["_status"] = generator_rows[status_col].map(normalize_text)
    capacity_by_plant = generator_rows.groupby("_plant_key")["_capacity_mw"].sum().to_dict()
    status_by_plant = generator_rows.groupby("_plant_key")["_status"].agg(lambda values: ",".join(sorted(set(filter(None, values))))).to_dict()
    fuel_by_plant = {}
    for plant_key, fuel_rows in generator_rows.groupby("_plant_key"):
        ranked = fuel_rows.sort_values("_capacity_mw", ascending=False)
        fuel_by_plant[plant_key] = normalize_text(ranked.iloc[0].get("_energy_source")) if not ranked.empty else ""

    rows = []
    for _, row in plants.iterrows():
        plant_key = normalized_id_number(row.get(plant_code_col))
        lat = pd.to_numeric(row.get(lat_col), errors="coerce")
        lon = pd.to_numeric(row.get(lon_col), errors="coerce")
        if pd.isna(lat) or pd.isna(lon):
            continue
        rows.append(
            {
                "id": f"us-energy-{plant_key}",
                "name": normalize_text(row.get(plant_name_col)) or f"EIA plant {plant_key}",
                "facility_type": "power_plant",
                "facility_subtype": eia_energy_subtype(fuel_by_plant.get(plant_key)),
                "status": "existing",
                "state": normalize_text(row.get(state_col)),
                "county": normalize_text(row.get(county_col)) if county_col else "",
                "capacity_mw": round(float(capacity_by_plant.get(plant_key, 0.0)), 3),
                "generator_status_codes": status_by_plant.get(plant_key, ""),
                "geometry": Point(float(lon), float(lat)),
            }
        )
    gdf = filter_to_usa_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"))
    if gdf.empty:
        raise SystemExit(f"{pack_id}: EIA plant selection is empty.")
    gdf = gdf.sort_values(["capacity_mw", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(4000).copy()
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": preview},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"eia_plants": len(plants), "eia_operable_generators": len(generators)},
            "matched_count": len(gdf),
            "preview_rule": "Largest 4000 EIA plants by aggregated operable generator nameplate capacity.",
            "scope_rule": "Filtered through the USA carrier fitGeometry; CONUS, Alaska, and Hawaii remain in scope.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_energy_facilities",
    )


def build_india_energy_facilities() -> None:
    pack_id = "india_energy_facilities"
    source_path = source_path_for(pack_id, "wri_global_power_plant_database_india_csv")
    source = pd.read_csv(source_path, dtype=str, keep_default_na=False, encoding_errors="replace")
    country_col = find_column(source, "country")
    name_col = find_column(source, "name")
    id_col = find_column(source, "gppd_idnr")
    capacity_col = find_column(source, "capacity_mw")
    lat_col = find_column(source, "latitude")
    lon_col = find_column(source, "longitude")
    fuel_col = find_column(source, "primary_fuel")
    owner_col = optional_column(source, "owner")
    commissioning_col = optional_column(source, "commissioning_year")
    source_col = optional_column(source, "source")
    url_col = optional_column(source, "url")
    rows = []
    for index, row in source.iterrows():
        if normalize_text(row.get(country_col)).upper() != "IND":
            continue
        lat = pd.to_numeric(row.get(lat_col), errors="coerce")
        lon = pd.to_numeric(row.get(lon_col), errors="coerce")
        if pd.isna(lat) or pd.isna(lon):
            continue
        plant_id = normalize_text(row.get(id_col)) or str(index)
        fuel = normalize_text(row.get(fuel_col))
        rows.append(
            {
                "id": f"in-wri-energy-{slug_id(plant_id, str(len(rows) + 1))}",
                "name": normalize_text(row.get(name_col)) or f"WRI India plant {plant_id}",
                "facility_type": "power_plant",
                "facility_subtype": normalize_energy_subtype(fuel),
                "status": "existing",
                "capacity_mw": parse_capacity_mw(row.get(capacity_col)),
                "primary_fuel": fuel,
                "owner": normalize_text(row.get(owner_col)) if owner_col else "",
                "commissioning_year": normalize_text(row.get(commissioning_col)) if commissioning_col else "",
                "source": normalize_text(row.get(source_col)) if source_col else "WRI Global Power Plant Database",
                "source_url": normalize_text(row.get(url_col)) if url_col else "",
                "geometry": Point(float(lon), float(lat)),
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: WRI India power plant selection is empty.")
    gdf = filter_to_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), "india", label=pack_id)
    gdf = gdf.drop_duplicates(subset=["id", "name", "geometry"]).copy()
    gdf = gdf.sort_values(["capacity_mw", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(1000).copy()
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": preview},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"wri_india_power_plants": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "Largest 1000 WRI India power plants by reported capacity after India carrier clip.",
            "scope_rule": "Filtered through the India carrier fitGeometry; out-of-scope coordinate rows are excluded.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack india_energy_facilities",
    )


def build_wri_country_energy_facilities(
    pack_id: str,
    country_key: str,
    country_code: str,
    country_label: str,
    *,
    preview_limit: int = 1000,
) -> None:
    source_path = source_path_for(pack_id, "wri_global_power_plant_database_csv")
    source = pd.read_csv(source_path, dtype=str, keep_default_na=False, encoding_errors="replace")
    country_col = find_column(source, "country")
    name_col = find_column(source, "name")
    id_col = find_column(source, "gppd_idnr")
    capacity_col = find_column(source, "capacity_mw")
    lat_col = find_column(source, "latitude")
    lon_col = find_column(source, "longitude")
    fuel_col = find_column(source, "primary_fuel")
    owner_col = optional_column(source, "owner")
    commissioning_col = optional_column(source, "commissioning_year")
    source_col = optional_column(source, "source")
    url_col = optional_column(source, "url")
    country_rows = source[source[country_col].map(normalize_text).str.upper().eq(country_code.upper())].copy()
    rows = []
    for index, row in country_rows.iterrows():
        lat = pd.to_numeric(row.get(lat_col), errors="coerce")
        lon = pd.to_numeric(row.get(lon_col), errors="coerce")
        if pd.isna(lat) or pd.isna(lon):
            continue
        plant_id = normalize_text(row.get(id_col)) or str(index)
        fuel = normalize_text(row.get(fuel_col))
        rows.append(
            {
                "id": f"{country_key}-wri-energy-{slug_id(plant_id, str(len(rows) + 1))}",
                "name": normalize_text(row.get(name_col)) or f"WRI {country_label} plant {plant_id}",
                "facility_type": "power_plant",
                "facility_subtype": normalize_energy_subtype(fuel),
                "status": "existing",
                "capacity_mw": parse_capacity_mw(row.get(capacity_col)),
                "primary_fuel": fuel,
                "owner": normalize_text(row.get(owner_col)) if owner_col else "",
                "commissioning_year": normalize_text(row.get(commissioning_col)) if commissioning_col else "",
                "source": normalize_text(row.get(source_col)) if source_col else "WRI Global Power Plant Database",
                "source_url": normalize_text(row.get(url_col)) if url_col else "",
                "geometry": Point(float(lon), float(lat)),
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: WRI {country_label} power plant selection is empty.")
    gdf = filter_to_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), country_key, label=pack_id)
    gdf = gdf.drop_duplicates(subset=["id", "name", "geometry"]).copy()
    gdf = gdf.sort_values(["capacity_mw", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(preview_limit).copy()
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": preview},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"wri_global_power_plants": len(source), f"wri_{country_key}_power_plants": len(country_rows)},
            "matched_count": len(gdf),
            "preview_rule": f"Largest {preview_limit} WRI {country_label} power plants by reported capacity after {country_label} carrier clip.",
            "scope_rule": f"Filtered through the {country_label} carrier fitGeometry; out-of-scope coordinate rows are excluded.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def build_china_energy_facilities() -> None:
    build_wri_country_energy_facilities("china_energy_facilities", "china", "CHN", "China")


def build_russia_energy_facilities() -> None:
    build_wri_country_energy_facilities("russia_energy_facilities", "russia", "RUS", "Russia")


def mrds_rank(row: pd.Series) -> tuple[int, int, str]:
    status = normalize_text(row.get("dev_stat")).casefold()
    grade = normalize_text(row.get("grade")).upper()
    status_rank = 0
    if "producer" in status:
        status_rank = 1
    elif "plant" in status:
        status_rank = 2
    elif "prospect" in status:
        status_rank = 3
    elif "occurrence" in status:
        status_rank = 4
    else:
        status_rank = 5
    grade_rank = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5}.get(grade, 9)
    return (status_rank, grade_rank, normalize_text(row.get("site_name")))


def mineral_group_from_codes(value: Any) -> str:
    codes = normalize_text(value).casefold()
    if any(token in codes for token in ("au", "ag", "cu", "pb", "zn", "mo", "ni", "co", "u", "ree", "li")):
        return "metallic_minerals"
    if any(token in codes for token in ("coal", "bit", "lignite")):
        return "coal"
    if any(token in codes for token in ("sand", "stone", "limestone", "clay", "gravel")):
        return "construction_materials"
    return "mineral_occurrence"


def normalize_camino_cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return normalize_text(value)
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, (list, tuple, set)):
        return ", ".join(normalize_text(item) for item in value if normalize_text(item))
    return normalize_text(value)


def mineral_group_from_camino(row: pd.Series) -> str:
    text = " ".join(
        normalize_camino_cell_text(row.get(key)).casefold()
        for key in ("domaine", "type", "substances")
    )
    if any(token in text for token in ("or", "argent", "cuivre", "plomb", "zinc", "nickel", "cobalt", "lithium", "tungst", "titane")):
        return "metallic_minerals"
    if any(token in text for token in ("charbon", "houille", "lignite", "combustible", "hydrocarb")):
        return "fossil_resources"
    if any(token in text for token in ("carri", "granulat", "sable", "calcaire", "gypse", "argile")):
        return "construction_materials"
    if any(token in text for token in ("uranium", "radioact")):
        return "specialty_minerals"
    return "industrial_minerals"


def should_keep_camino_mineral_title(row: pd.Series) -> bool:
    domain = normalize_text(row.get("domaine")).casefold()
    title_type = normalize_text(row.get("type")).casefold()
    if any(token in domain for token in ("géothermie", "geothermie", "stockages souterrains")):
        return False
    if "hydrocarbures" in domain:
        return False
    return any(
        token in f"{domain} {title_type}"
        for token in ("min", "métaux", "metaux", "carri", "granulat", "combustibles fossiles", "radioact")
    )


def build_usa_mineral_resources() -> None:
    pack_id = "usa_mineral_resources"
    path = source_path_for(pack_id, "usgs_mrds_feature_service")
    source = gpd.read_file(path).to_crs("EPSG:4326")
    source = source[source.geometry.notna()].copy()
    source = filter_to_usa_carrier(source)
    source["_rank"] = source.apply(mrds_rank, axis=1)
    source = source.sort_values("_rank").reset_index(drop=True)
    full_source = source.head(50000).copy()
    rows = []
    for _, row in full_source.iterrows():
        object_id = normalize_text(row.get("objectid_1"))
        dep_id = normalize_text(row.get("dep_id"))
        rows.append(
            {
                "id": f"us-mrds-{dep_id or object_id}",
                "name": normalize_text(row.get("site_name")) or "MRDS mineral site",
                "resource_type": normalize_text(row.get("dev_stat")) or "mineral_site",
                "normalized_resource_group": mineral_group_from_codes(row.get("code_list")),
                "commodity_codes": normalize_text(row.get("code_list")),
                "grade": normalize_text(row.get("grade")),
                "geometry": row.geometry,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: MRDS USA selection is empty.")
    preview = gdf.head(5000).copy()
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": preview},
        {"mineral_resources": gdf},
        {
            "source_row_count": {"usgs_mrds_features": len(source)},
            "matched_count": len(gdf),
            "full_cap": 50000,
            "preview_rule": "Best-ranked 5000 MRDS USA points by development status, grade, and site name.",
            "scope_rule": "Filtered through the USA carrier fitGeometry; CONUS, Alaska, and Hawaii remain in scope.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_mineral_resources",
    )


def build_india_mineral_resources() -> None:
    pack_id = "india_mineral_resources"
    path = source_path_for(pack_id, "usgs_mrds_feature_service")
    source = gpd.read_file(path).to_crs("EPSG:4326")
    source = source[source.geometry.notna()].copy()
    source = filter_to_carrier(source, "india", label=pack_id)
    source["_rank"] = source.apply(mrds_rank, axis=1)
    source = source.sort_values("_rank").reset_index(drop=True)
    full_source = source.head(50000).copy()
    rows = []
    for _, row in full_source.iterrows():
        object_id = normalize_text(row.get("objectid_1"))
        dep_id = normalize_text(row.get("dep_id"))
        rows.append(
            {
                "id": f"in-mrds-{dep_id or object_id}",
                "name": normalize_text(row.get("site_name")) or "MRDS mineral site",
                "resource_type": normalize_text(row.get("dev_stat")) or "mineral_site",
                "normalized_resource_group": mineral_group_from_codes(row.get("code_list")),
                "commodity_codes": normalize_text(row.get("code_list")),
                "grade": normalize_text(row.get("grade")),
                "geometry": row.geometry,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: MRDS India carrier selection is empty.")
    preview = gdf.head(1000).copy()
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": preview},
        {"mineral_resources": gdf},
        {
            "source_row_count": {"usgs_mrds_features_after_carrier_filter": len(source)},
            "matched_count": len(gdf),
            "full_cap": 50000,
            "preview_rule": "Best-ranked 1000 MRDS India points by development status, grade, and site name.",
            "scope_rule": "Global MRDS point rows filtered through the India carrier fitGeometry.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack india_mineral_resources",
    )


def build_mrds_country_mineral_resources(
    pack_id: str,
    country_key: str,
    country_label: str,
    id_prefix: str,
    *,
    preview_limit: int = 1000,
) -> None:
    path = source_path_for(pack_id, "usgs_mrds_feature_service")
    source = gpd.read_file(path).to_crs("EPSG:4326")
    source = source[source.geometry.notna()].copy()
    source = filter_to_carrier(source, country_key, label=pack_id)
    source["_rank"] = source.apply(mrds_rank, axis=1)
    source = source.sort_values("_rank").reset_index(drop=True)
    full_source = source.head(50000).copy()
    rows = []
    for _, row in full_source.iterrows():
        object_id = normalize_text(row.get("objectid_1"))
        dep_id = normalize_text(row.get("dep_id"))
        rows.append(
            {
                "id": f"{id_prefix}-mrds-{dep_id or object_id}",
                "name": normalize_text(row.get("site_name")) or "MRDS mineral site",
                "resource_type": normalize_text(row.get("dev_stat")) or "mineral_site",
                "normalized_resource_group": mineral_group_from_codes(row.get("code_list")),
                "commodity_codes": normalize_text(row.get("code_list")),
                "grade": normalize_text(row.get("grade")),
                "geometry": row.geometry,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: MRDS {country_label} carrier selection is empty.")
    preview = gdf.head(preview_limit).copy()
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": preview},
        {"mineral_resources": gdf},
        {
            "source_row_count": {"usgs_mrds_features_after_carrier_filter": len(source)},
            "matched_count": len(gdf),
            "full_cap": 50000,
            "preview_rule": f"Best-ranked {preview_limit} MRDS {country_label} points by development status, grade, and site name.",
            "scope_rule": f"Global MRDS point rows filtered through the {country_label} carrier fitGeometry.",
        },
        build_command=f"python tools/build_transport_country_real_packs.py --pack {pack_id}",
    )


def build_china_mineral_resources() -> None:
    build_mrds_country_mineral_resources("china_mineral_resources", "china", "China", "cn")


def build_russia_mineral_resources() -> None:
    build_mrds_country_mineral_resources("russia_mineral_resources", "russia", "Russia", "ru")


def uk_mineral_group_from_resource(value: Any) -> str:
    text = normalize_text(value).casefold()
    if any(token in text for token in ("coal", "lignite", "peat", "salt")):
        return "energy_minerals"
    if any(token in text for token in ("silica", "perlite", "bauxitic")):
        return "industrial_minerals"
    if any(token in text for token in ("limestone", "dolomite", "sandstone", "sand", "gravel", "clay", "aggregate", "conglomerate")):
        return "construction_materials"
    if any(token in text for token in ("igneous", "metaigneous", "metasedimentary", "quartzite")):
        return "rock_materials"
    return "other"


def extract_uk_mineral_resource_json_zip(zip_path: Path) -> Path:
    signature = file_signature(zip_path)
    target_dir = PROJECT_ROOT / ".runtime" / "tmp" / "transport" / "uk_mineral_resources_json"
    marker_path = target_dir / ".extract-complete.json"
    expected_marker = {
        "source": {
            "path": signature["path"],
            "size_bytes": signature["size_bytes"],
            "sha256": signature["sha256"],
        }
    }
    json_files = iter_uk_mineral_resource_json_paths(target_dir)
    if marker_path.exists() and json_files:
        try:
            marker = json.loads(marker_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            marker = {}
        if marker == expected_marker:
            return target_dir
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        json_members = [name for name in archive.namelist() if name.casefold().endswith(".json")]
        if not json_members:
            raise SystemExit(f"{zip_path.name}: expected at least one GeoJSON member.")
        archive.extractall(target_dir, json_members)
    marker_path.write_text(json.dumps(expected_marker, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target_dir


def iter_uk_mineral_resource_json_paths(extract_dir: Path) -> list[Path]:
    return sorted(path for path in extract_dir.rglob("*.json") if not path.name.startswith("."))


def build_uk_mineral_resources() -> None:
    pack_id = "uk_mineral_resources"
    zip_path = source_path_for(pack_id, "gsni_northern_ireland_mineral_resources_json")
    extract_dir = extract_uk_mineral_resource_json_zip(zip_path)
    frames = []
    source_counts: dict[str, int] = {}
    for json_path in iter_uk_mineral_resource_json_paths(extract_dir):
        source = gpd.read_file(json_path).to_crs("EPSG:4326")
        source = source.loc[source.geometry.notna() & ~source.geometry.is_empty].copy()
        source_counts[json_path.name] = len(source)
        rows = []
        layer_name = json_path.stem
        for index, row in source.iterrows():
            resource = normalize_text(row.get("RESOURCE")) or layer_name.replace("_", " ")
            point = representative_point(row.geometry)
            if point is None:
                continue
            rows.append(
                {
                    "id": f"uk-gsni-mineral-{slug_id(layer_name, 'layer')}-{index}",
                    "name": resource.title(),
                    "resource_type": resource,
                    "normalized_resource_group": uk_mineral_group_from_resource(resource),
                    "commodity_codes": resource,
                    "source_layer": layer_name,
                    "source_region": "Northern Ireland",
                    "source_area_hint": round(float(row.geometry.area or 0.0), 12),
                    "geometry": point,
                }
            )
        if rows:
            frames.append(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"))
    if not frames:
        raise SystemExit(f"{pack_id}: OpenDataNI mineral resource JSON package produced no rows.")
    gdf = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326")
    gdf = filter_to_carrier(gdf, "uk", label=pack_id)
    if gdf.empty:
        raise SystemExit(f"{pack_id}: GSNI mineral resource selection is empty after UK carrier filter.")
    gdf = gdf.sort_values(["normalized_resource_group", "resource_type", "source_layer", "id"]).reset_index(drop=True)
    preview = gdf.head(1000).copy()
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": preview},
        {"mineral_resources": gdf},
        {
            "source_row_count": source_counts,
            "matched_count": len(gdf),
            "preview_rule": "First 1000 grouped GSNI mineral resource polygon representative points after UK carrier clip.",
            "scope_rule": "OpenDataNI mineral resource layers cover Northern Ireland; UK carrier filtering keeps the pack inside United Kingdom scope.",
            "filter_rule": "GeoJSON polygons are converted to representative points to reuse the existing mineral_resources point-family preview contract.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack uk_mineral_resources",
    )


def build_france_mineral_resources() -> None:
    pack_id = "france_mineral_resources"
    path = source_path_for(pack_id, "camino_titles_geojson")
    source = gpd.read_file(path).to_crs("EPSG:4326")
    source = source[source.geometry.notna()].copy()
    raw_rows = len(source)
    source = source[source.apply(should_keep_camino_mineral_title, axis=1)].copy()
    rows = []
    for index, row in source.iterrows():
        point = representative_point(row.geometry)
        if point is None:
            continue
        title_id = normalize_text(row.get("id")) or str(index)
        substance_text = normalize_camino_cell_text(row.get("substances"))
        surface_value = pd.to_numeric(row.get("surface_totale"), errors="coerce")
        surface_km2 = round(float(surface_value), 4) if pd.notna(surface_value) else 0.0
        rows.append(
            {
                "id": f"fr-camino-{title_id}",
                "name": normalize_text(row.get("nom")) or "Camino mining title",
                "resource_type": normalize_text(row.get("type")) or "mining_title",
                "normalized_resource_group": mineral_group_from_camino(row),
                "commodity_codes": substance_text,
                "status": normalize_text(row.get("statut")),
                "domain": normalize_text(row.get("domaine")),
                "surface_km2": surface_km2,
                "departments": normalize_camino_cell_text(row.get("departements")),
                "regions": normalize_camino_cell_text(row.get("regions")),
                "geometry": point,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    gdf = filter_to_carrier(gdf, "france", label=pack_id)
    if gdf.empty:
        raise SystemExit(f"{pack_id}: Camino mining title selection is empty.")
    gdf = gdf.sort_values(["surface_km2", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(200).copy()
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": preview},
        {"mineral_resources": gdf},
        {
            "source_row_count": {"camino_titles": raw_rows, "camino_mining_titles": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "Largest 300 metropolitan France Camino mineral/mining titles by declared surface.",
            "scope_rule": "Representative points are filtered through the France carrier fitGeometry; overseas territories are excluded.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack france_mineral_resources",
    )


def build_usa_industrial_zones() -> None:
    pack_id = "usa_industrial_zones"
    rows = []
    raw_rows = 0
    matched_rows = 0
    for state_fips in USA_STATE_FIPS_FOR_AREALM:
        source_id = f"census_tiger_2025_arealm_{state_fips}"
        zip_path = source_path_for(pack_id, source_id)
        shp_name = f"tl_2025_{state_fips}_arealm.shp"
        source = gpd.read_file(f"zip://{zip_path.resolve()}!{shp_name}").to_crs("EPSG:4326")
        raw_rows += len(source)
        mtfcc_col = find_column(source, "MTFCC")
        filtered = source[source[mtfcc_col].map(normalize_text).eq("K2362")].copy()
        matched_rows += len(filtered)
        for _, row in filtered.iterrows():
            rows.append(
                {
                    "id": f"us-arealm-{normalize_text(row.get('AREAID')) or len(rows)}",
                    "name": normalize_text(row.get("FULLNAME")) or "Industrial Building or Industrial Park",
                    "zone_type": "industrial_park",
                    "site_class": "industrial_landuse",
                    "coastal_inland_label": "inland",
                    "state_fips": normalize_text(row.get("STATEFP")) or state_fips,
                    "mtfcc": normalize_text(row.get("MTFCC")),
                    "aland": safe_int(row.get("ALAND")),
                    "awater": safe_int(row.get("AWATER")),
                    "geometry": row.geometry,
                }
            )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: Census AREALM K2362 selection is empty.")
    gdf = gdf.sort_values(["aland", "name"], ascending=[False, True]).reset_index(drop=True)
    full = gdf.copy()
    preview = full.head(3500).copy()
    write_pack(
        pack_id,
        "industrial_zones",
        "polygon",
        {"industrial_zones": preview},
        {"industrial_zones": full},
        {
            "source_row_count": {"census_arealm_rows": raw_rows},
            "matched_count": len(full),
            "matched_k2362_rows": matched_rows,
            "preview_rule": "Largest 3500 Census AREALM K2362 Industrial Building or Industrial Park polygons by land area.",
            "scope_rule": "50 states plus DC state-based TIGER files; U.S. territories are excluded for USA carrier parity.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_industrial_zones",
    )


def logistics_hub_name(row: pd.Series) -> str:
    for candidate in ("terminal", "TERMINAL", "TERM_NAME", "COMP_NAME", "LOCID", "FACILITY_C", "FACILITY", "NAME", "name"):
        value = normalize_text(row.get(candidate))
        if value:
            return value
    return "Intermodal freight facility"


def normalized_usa_logistics_hub_type(source_id: str) -> str:
    if source_id == "bts_intermodal_air_to_truck":
        return "air_cargo_terminal"
    if source_id == "bts_intermodal_rail_tofc_cofc":
        return "rail_cargo_station"
    return "truck_terminal"


def overpass_element_point(element: dict[str, Any]) -> Point | None:
    if element.get("type") == "node":
        lon = pd.to_numeric(element.get("lon"), errors="coerce")
        lat = pd.to_numeric(element.get("lat"), errors="coerce")
    else:
        center = element.get("center") or {}
        lon = pd.to_numeric(center.get("lon"), errors="coerce")
        lat = pd.to_numeric(center.get("lat"), errors="coerce")
    if pd.isna(lon) or pd.isna(lat):
        return None
    return Point(float(lon), float(lat))


def uk_overpass_logistics_hub_type(tags: dict[str, Any]) -> str:
    if normalize_text(tags.get("railway")) in {"yard", "container_terminal"}:
        return "rail_cargo_station"
    if normalize_text(tags.get("landuse")) == "railway" and normalize_text(tags.get("freight")).casefold() == "yes":
        return "rail_cargo_station"
    return "truck_terminal"


def uk_overpass_logistics_operator_classification(tags: dict[str, Any]) -> str:
    operator = normalize_text(tags.get("operator")).casefold()
    if any(token in operator for token in ("network rail", "national rail", "department for transport")):
        return "public"
    if operator:
        return "private"
    return "other"


def uk_overpass_logistics_importance_rank(tags: dict[str, Any]) -> int:
    railway = normalize_text(tags.get("railway"))
    if railway == "container_terminal":
        return 3
    if railway == "yard" or normalize_text(tags.get("industrial")) == "logistics":
        return 2
    return 1


def build_uk_industrial_zones() -> None:
    pack_id = "uk_industrial_zones"
    path = source_path_for(pack_id, "osm_overpass_uk_industrial_landuse")
    payload = json.loads(path.read_text(encoding="utf-8"))
    elements = payload.get("elements") or []
    rows = []
    for element in elements:
        tags = element.get("tags") or {}
        geom = overpass_element_point(element)
        if geom is None:
            continue
        osm_type = normalize_text(element.get("type"))
        osm_id = normalize_text(element.get("id"))
        name = normalize_text(tags.get("name")) or normalize_text(tags.get("operator")) or f"OSM industrial landuse {osm_type}/{osm_id}"
        rows.append(
            {
                "id": f"uk-osm-industrial-{slug_id(osm_type, 'element')}-{slug_id(osm_id, str(len(rows) + 1))}",
                "name": name,
                "zone_type": normalize_text(tags.get("industrial")) or "industrial_landuse_center",
                "site_class": "industrial_landuse",
                "coastal_inland_label": "inland",
                "source": "OpenStreetMap landuse=industrial center",
                "source_operator": normalize_text(tags.get("operator")),
                "osm_type": osm_type,
                "osm_id": osm_id,
                "landuse": normalize_text(tags.get("landuse")),
                "industrial": normalize_text(tags.get("industrial")),
                "man_made": normalize_text(tags.get("man_made")),
                "geometry": geom,
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: Overpass industrial landuse selection is empty.")
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    gdf = filter_to_carrier(gdf, "uk", label=pack_id)
    gdf = gdf.drop_duplicates(subset=["osm_type", "osm_id"]).copy()
    gdf["_named"] = gdf["name"].str.startswith("OSM industrial landuse").map(lambda value: 0 if value else 1)
    gdf = gdf.sort_values(["_named", "name"], ascending=[False, True]).drop(columns=["_named"]).reset_index(drop=True)
    preview = gdf.head(200).copy()
    write_pack(
        pack_id,
        "industrial_zones",
        "point",
        {"industrial_zones": preview},
        {"industrial_zones": gdf},
        {
            "source_row_count": {"overpass_elements": len(elements)},
            "matched_count": len(gdf),
            "preview_rule": "Top 200 named-first UK OSM landuse=industrial polygon centers after carrier clip.",
            "scope_rule": "Filtered through the United Kingdom carrier; OSM relation scope is GB and excludes overseas territories.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack uk_industrial_zones",
    )


def france_ite_status_category(row: pd.Series) -> str:
    usage = normalize_text(row.get("Utilisation_ITE")).casefold()
    recent = normalize_text(row.get("Circulation_récente")).casefold()
    convention = normalize_text(row.get("Convention_active")).casefold()
    state = normalize_text(row.get("Etat_ITE")).casefold()
    reuse_interest = normalize_text(row.get("Intérêt_reutilisation_ITE")).casefold()
    if usage == "oui" or recent == "oui" or convention == "oui":
        return "active"
    if any(token in state for token in ("inutilisable", "hors service", "ferm")):
        return "inactive"
    if any(token in reuse_interest for token in ("oui", "intérêt", "interet")):
        return "planned"
    return "inactive"


def france_ite_operator_classification(row: pd.Series) -> str:
    owner_text = " ".join(
        normalize_text(row.get(key)).casefold()
        for key in ("Structure_proprietaire_voie_d'approche", "Proprietaire_voie_d'approche", "Raison_sociale")
    )
    if any(token in owner_text for token in ("sncf", "etat", "état", "collectivité", "collectivite", "public")):
        return "public"
    if normalize_text(row.get("Raison_sociale")) or normalize_text(row.get("Code_SIRET")):
        return "private"
    return "other"


def france_ite_importance_rank(row: pd.Series) -> int:
    if france_ite_status_category(row) != "active":
        return 1
    whole_train = normalize_text(row.get("Possibilité_circulation_trains_entier_sur_site")).casefold()
    recent = normalize_text(row.get("Circulation_récente")).casefold()
    lanes = pd.to_numeric(str(row.get("Nombre_de_voies") or "").replace(",", "."), errors="coerce")
    if whole_train == "oui" or recent == "oui" or (pd.notna(lanes) and float(lanes) >= 4):
        return 3
    return 2


def build_usa_logistics_hubs() -> None:
    pack_id = "usa_logistics_hubs"
    source_specs = (
        ("bts_intermodal_rail_tofc_cofc", normalized_usa_logistics_hub_type("bts_intermodal_rail_tofc_cofc")),
        ("bts_intermodal_air_to_truck", normalized_usa_logistics_hub_type("bts_intermodal_air_to_truck")),
        ("bts_intermodal_pipeline_terminals", normalized_usa_logistics_hub_type("bts_intermodal_pipeline_terminals")),
    )
    frames = []
    source_counts: dict[str, int] = {}
    for source_id, hub_type in source_specs:
        path = source_path_for(pack_id, source_id)
        source = gpd.read_file(path).to_crs("EPSG:4326")
        source = source[source.geometry.notna()].copy()
        source_counts[source_id] = len(source)
        rows = []
        for index, row in source.reset_index(drop=True).iterrows():
            object_id = normalize_text(row.get("OBJECTID") or row.get("objectid") or row.get("FID") or index)
            rows.append(
                {
                    "id": f"us-logistics-{source_id}-{object_id}",
                    "name": logistics_hub_name(row),
                    "hub_type": hub_type,
                    "source_layer": source_id,
                    "operator_classification": "other",
                    "source_operator": normalize_text(row.get("operator") or row.get("OPERATOR") or row.get("rail_co") or row.get("RAIL_CO") or row.get("COMP_NAME")),
                    "geometry": row.geometry,
                }
            )
        frames.append(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"))
    gdf = filter_to_usa_carrier(gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326"))
    gdf = gdf.sort_values(["hub_type", "name"]).reset_index(drop=True)
    if gdf.empty:
        raise SystemExit(f"{pack_id}: BTS logistics selection is empty.")
    preview = gdf.head(3000).copy()
    write_pack(
        pack_id,
        "logistics_hubs",
        "point",
        {"logistics_hubs": preview},
        {"logistics_hubs": gdf},
        {
            "source_row_count": source_counts,
            "matched_count": len(gdf),
            "preview_rule": "All scoped BTS intermodal freight facilities, capped at 3000 preview points if a later source grows.",
            "scope_rule": "Filtered through the USA carrier fitGeometry; CONUS, Alaska, and Hawaii remain in scope.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack usa_logistics_hubs",
    )


def build_france_logistics_hubs() -> None:
    pack_id = "france_logistics_hubs"
    path = source_path_for(pack_id, "cerema_ite3000_geojson")
    source = gpd.read_file(path).to_crs("EPSG:4326")
    source = source[source.geometry.notna()].copy()
    rows = []
    for index, row in source.reset_index(drop=True).iterrows():
        ite_id = normalize_text(row.get("ID_ITE")) or str(index)
        company = normalize_text(row.get("Raison_sociale"))
        commune = normalize_text(row.get("Commune"))
        cargo = normalize_text(row.get("Produit_transporté"))
        rows.append(
            {
                "id": f"fr-ite3000-{ite_id}",
                "name": company or (f"ITE {commune}" if commune else "ITE freight siding"),
                "hub_type": "rail_cargo_station",
                "status_category": france_ite_status_category(row),
                "operator_classification": france_ite_operator_classification(row),
                "source_operator": company,
                "municipality": commune,
                "postal_code": normalize_text(row.get("Code_postal")),
                "cargo_type": cargo,
                "received_goods": normalize_text(row.get("Marchandises_reçue")),
                "shipped_goods": normalize_text(row.get("Marchandises_expédiées")),
                "site_type": normalize_text(row.get("Type_etablissement")),
                "active_convention": normalize_text(row.get("Convention_active")),
                "recent_circulation": normalize_text(row.get("Circulation_récente")),
                "source_state": normalize_text(row.get("Etat_ITE")),
                "importance_rank": france_ite_importance_rank(row),
                "geometry": row.geometry,
            }
        )
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    gdf = filter_to_carrier(gdf, "france", label=pack_id)
    if gdf.empty:
        raise SystemExit(f"{pack_id}: ITE 3000 logistics selection is empty.")
    gdf["importance"] = gdf["importance_rank"].map(POINT_IMPORTANCE_BY_RANK).fillna("local_connector")
    status_order = {"active": 0, "planned": 1, "inactive": 2}
    gdf["_status_order"] = gdf["status_category"].map(status_order).fillna(3)
    gdf = gdf.sort_values(["_status_order", "importance_rank", "name"], ascending=[True, False, True]).drop(columns=["_status_order"]).reset_index(drop=True)
    preview = gdf.head(300).copy()
    write_pack(
        pack_id,
        "logistics_hubs",
        "point",
        {"logistics_hubs": preview},
        {"logistics_hubs": gdf},
        {
            "source_row_count": {"cerema_ite3000_features": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "Top 300 scoped ITE 3000 freight sidings by active status, rank, and name.",
            "scope_rule": "Filtered through the France carrier fitGeometry; overseas territories are excluded.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack france_logistics_hubs",
    )


def build_uk_logistics_hubs() -> None:
    pack_id = "uk_logistics_hubs"
    path = source_path_for(pack_id, "osm_overpass_uk_logistics_facilities")
    payload = json.loads(path.read_text(encoding="utf-8"))
    elements = payload.get("elements") or []
    rows = []
    for element in elements:
        tags = element.get("tags") or {}
        geom = overpass_element_point(element)
        if geom is None:
            continue
        hub_type = uk_overpass_logistics_hub_type(tags)
        osm_type = normalize_text(element.get("type"))
        osm_id = normalize_text(element.get("id"))
        name = normalize_text(tags.get("name")) or normalize_text(tags.get("operator")) or f"OSM logistics facility {osm_type}/{osm_id}"
        rank = uk_overpass_logistics_importance_rank(tags)
        rows.append(
            {
                "id": f"uk-osm-logistics-{slug_id(osm_type, 'element')}-{slug_id(osm_id, str(len(rows) + 1))}",
                "name": name,
                "hub_type": hub_type,
                "operator_classification": uk_overpass_logistics_operator_classification(tags),
                "source_operator": normalize_text(tags.get("operator")),
                "osm_type": osm_type,
                "osm_id": osm_id,
                "railway": normalize_text(tags.get("railway")),
                "landuse": normalize_text(tags.get("landuse")),
                "industrial": normalize_text(tags.get("industrial")),
                "amenity": normalize_text(tags.get("amenity")),
                "freight": normalize_text(tags.get("freight")),
                "importance_rank": rank,
                "importance": POINT_IMPORTANCE_BY_RANK.get(rank, "local_connector"),
                "geometry": geom,
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: Overpass logistics selection is empty.")
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    gdf = filter_to_carrier(gdf, "uk", label=pack_id)
    gdf = gdf.drop_duplicates(subset=["osm_type", "osm_id", "hub_type"]).copy()
    gdf["_named"] = gdf["name"].str.startswith("OSM logistics facility").map(lambda value: 0 if value else 1)
    gdf = gdf.sort_values(["importance_rank", "_named", "name"], ascending=[False, False, True]).drop(columns=["_named"]).reset_index(drop=True)
    preview = gdf.head(200).copy()
    write_pack(
        pack_id,
        "logistics_hubs",
        "point",
        {"logistics_hubs": preview},
        {"logistics_hubs": gdf},
        {
            "source_row_count": {"overpass_elements": len(elements)},
            "matched_count": len(gdf),
            "preview_rule": "Top 200 UK OSM freight/logistics elements by tag rank and named status after carrier clip.",
            "scope_rule": "Filtered through the United Kingdom carrier; OSM relation scope is GB and excludes overseas territories.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack uk_logistics_hubs",
    )


def build_uk_energy_facilities() -> None:
    pack_id = "uk_energy_facilities"
    source_path = source_path_for(pack_id, "desnz_repd_q1_2026_csv")
    source = pd.read_csv(source_path, dtype=str, keep_default_na=False, encoding_errors="replace")
    x_col = find_column(source, "X-coordinate")
    y_col = find_column(source, "Y-coordinate")
    capacity_col = find_column(source, "Installed Capacity (MWelec)")
    technology_col = find_column(source, "Technology Type")
    status_col = find_column(source, "Development Status")
    short_status_col = optional_column(source, "Development Status (short)")
    ref_col = find_column(source, "Ref ID")
    operator_col = find_column(source, "Operator (or Applicant)")
    name_col = find_column(source, "Site Name")
    country_col = find_column(source, "Country")
    rows = []
    for _, row in source.iterrows():
        geom = bng_point(row, x_col, y_col)
        if geom is None:
            continue
        ref_id = normalize_text(row.get(ref_col))
        technology = normalize_text(row.get(technology_col))
        status = normalize_text(row.get(short_status_col)) or normalize_text(row.get(status_col))
        rows.append(
            {
                "id": f"uk-energy-{slug_id(ref_id, str(len(rows) + 1))}",
                "name": normalize_text(row.get(name_col)) or f"REPD project {ref_id}",
                "operator": normalize_text(row.get(operator_col)),
                "facility_subtype": normalize_energy_subtype(technology),
                "source_technology": technology,
                "status": status,
                "capacity_mw": parse_capacity_mw(row.get(capacity_col)),
                "source_country": normalize_text(row.get(country_col)),
                "source_ref_id": ref_id,
                "geometry": geom,
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: REPD selection is empty.")
    gdf = filter_to_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), "uk", label=pack_id)
    gdf = gdf.sort_values(["capacity_mw", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(4000).copy()
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": preview},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"desnz_repd_q1_2026_csv": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "Top 4000 REPD renewable electricity projects by installed capacity after UK carrier clip.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack uk_energy_facilities",
    )


def build_france_energy_facilities() -> None:
    pack_id = "france_energy_facilities"
    source_path = source_path_for(pack_id, "osmose_fr_power_register_opendata_250kw")
    source = pd.read_csv(source_path, dtype=str, keep_default_na=False, compression="infer", encoding_errors="replace")
    lon_col = find_column(source, "lon")
    lat_col = find_column(source, "lat")
    name_col = find_column(source, "name")
    operator_col = optional_column(source, "operator", "exploitant")
    source_col = optional_column(source, "plant:source", "generator:source")
    method_col = optional_column(source, "plant:method", "generator:method")
    output_col = optional_column(source, "plant:output:electricity", "generator:output:electricity", "planned:power")
    rows = []
    for _, row in source.iterrows():
        lon = pd.to_numeric(row.get(lon_col), errors="coerce")
        lat = pd.to_numeric(row.get(lat_col), errors="coerce")
        if pd.isna(lon) or pd.isna(lat):
            continue
        subtype_source = normalize_text(row.get(source_col)) or normalize_text(row.get(method_col))
        osm_id = normalize_text(row.get("osm_id"))
        rows.append(
            {
                "id": f"fr-energy-{slug_id(osm_id or normalize_text(row.get(name_col)), str(len(rows) + 1))}",
                "name": normalize_text(row.get(name_col)) or "French energy facility",
                "operator": normalize_text(row.get(operator_col)) if operator_col else "",
                "facility_subtype": normalize_energy_subtype(subtype_source),
                "source_technology": subtype_source,
                "status": normalize_text(row.get("status")) or "active",
                "capacity_mw": parse_capacity_mw(row.get(output_col)) if output_col else 0.0,
                "osm_id": osm_id,
                "osm_type": normalize_text(row.get("osm_type")),
                "geometry": Point(float(lon), float(lat)),
            }
        )
    if not rows:
        raise SystemExit(f"{pack_id}: French power plant selection is empty.")
    gdf = filter_to_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), "france", label=pack_id)
    gdf = gdf.drop_duplicates(subset=["id", "name", "capacity_mw", "geometry"]).copy()
    gdf = gdf.sort_values(["capacity_mw", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(4000).copy()
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": preview},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"osmose_fr_power_register_opendata_250kw": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "Top 4000 France metropolitan power/storage points by parsed MW after carrier clip.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack france_energy_facilities",
    )


def is_france_industrial_zone(row: pd.Series) -> bool:
    text = " ".join(
        normalize_text(row.get(column))
        for column in ("categorie", "nature", "nature_detaillee")
    ).casefold()
    return any(
        token in text
        for token in (
            "zone industrielle",
            "zone d'activ",
            "zone d’activ",
            "parc d'activ",
            "parc d’activ",
            "zone commerciale",
            "centre commercial",
            "divers commercial",
            "usine",
            "marché",
            "marche",
        )
    )


def build_france_industrial_zones() -> None:
    pack_id = "france_industrial_zones"
    source_path = source_path_for(pack_id, "ign_bdtopo_zone_activite_wfs")
    source = gpd.read_file(source_path).to_crs("EPSG:4326")
    source = source.loc[source.geometry.notna() & ~source.geometry.is_empty].copy()
    selected = source[source.apply(is_france_industrial_zone, axis=1)].copy()
    if selected.empty:
        raise SystemExit(f"{pack_id}: IGN BD TOPO industrial zone selection is empty.")
    rows = []
    for _, row in selected.iterrows():
        cleabs = normalize_text(row.get("cleabs"))
        nature = normalize_text(row.get("nature"))
        nature_detaillee = normalize_text(row.get("nature_detaillee"))
        rows.append(
            {
                "id": f"fr-industrial-{slug_id(cleabs, str(len(rows) + 1))}",
                "name": normalize_text(row.get("toponyme")) or nature_detaillee or nature or "French industrial zone",
                "zone_type": nature_detaillee or nature,
                "site_class": "industrial_landuse",
                "coastal_inland_label": "inland",
                "source_category": normalize_text(row.get("categorie")),
                "source_nature": nature,
                "source_nature_detaillee": nature_detaillee,
                "status": normalize_text(row.get("etat_de_l_objet")),
                "importance_rank": max(1, min(3, 4 - safe_int(row.get("importance"), 3))),
                "geometry": row.geometry,
            }
        )
    gdf = filter_to_carrier(gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326"), "france", label=pack_id)
    gdf = gdf.sort_values(["importance_rank", "name"], ascending=[False, True]).reset_index(drop=True)
    preview = gdf.head(3500).copy()
    write_pack(
        pack_id,
        "industrial_zones",
        "polygon",
        {"industrial_zones": preview},
        {"industrial_zones": gdf},
        {
            "source_row_count": {"ign_bdtopo_zone_activite_wfs": len(source)},
            "matched_count": len(gdf),
            "preview_rule": "First 3500 industrial/commercial BD TOPO polygons after France metropolitan carrier clip.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack france_industrial_zones",
    )


def build_germany_energy_facilities() -> None:
    pack_id = "germany_energy_facilities"
    zip_path = dlm_source_zip()
    rows = []
    raw_rows = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_51002.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_BauwerkOderAnlageFuerIndustrieUndGewerbe"):
                raw_rows += 1
                function_code = first_text(elem, "bauwerksfunktion")
                if function_code != "2530":
                    elem.clear()
                    continue
                geom = dlm_point_from_pos(first_text(elem, "pos"))
                if geom is not None:
                    rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": first_text(elem, "name") or first_text(elem, "bezeichnung") or "Kraftwerk",
                            "facility_type": "power_plant",
                            "facility_subtype": "thermal_power",
                            "status": "existing",
                            "source_function_code": function_code,
                            "geometry": geom,
                        }
                    )
                elem.clear()
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: DLM250 energy facility selection is empty.")
    write_pack(
        pack_id,
        "energy_facilities",
        "point",
        {"energy_facilities": gdf},
        {"energy_facilities": gdf},
        {
            "source_row_count": {"AX_BauwerkOderAnlageFuerIndustrieUndGewerbe": raw_rows},
            "matched_count": len(gdf),
            "preview_rule": "DLM250 bauwerksfunktion 2530 power-plant objects.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_energy_facilities",
    )


def build_germany_mineral_resources() -> None:
    pack_id = "germany_mineral_resources"
    zip_path = dlm_source_zip()
    rows = []
    raw_rows = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_41005.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_TagebauGrubeSteinbruch"):
                raw_rows += 1
                polygon = dlm_polygon_from_pos_list(first_text(elem, "posList"))
                geom = representative_point(polygon)
                if geom is not None:
                    rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": first_text(elem, "name") or "Tagebau/Steinbruch",
                            "resource_type": "quarry_open_pit",
                            "normalized_resource_group": "construction_materials",
                            "geometry": geom,
                        }
                    )
                elem.clear()
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: DLM250 mineral selection is empty.")
    write_pack(
        pack_id,
        "mineral_resources",
        "point",
        {"mineral_resources": gdf},
        {"mineral_resources": gdf},
        {
            "source_row_count": {"AX_TagebauGrubeSteinbruch": raw_rows},
            "matched_count": len(gdf),
            "preview_rule": "DLM250 quarry/open-pit polygons converted to representative points.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_mineral_resources",
    )


def build_germany_industrial_zones() -> None:
    pack_id = "germany_industrial_zones"
    zip_path = dlm_source_zip()
    rows = []
    raw_rows = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_41002.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_IndustrieUndGewerbeflaeche"):
                raw_rows += 1
                geom = dlm_polygon_from_pos_list(first_text(elem, "posList"))
                if geom is not None:
                    rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": first_text(elem, "name") or "Industrie- und Gewerbeflaeche",
                            "zone_type": "industrial_commercial_area",
                            "site_class": "industrial_landuse",
                            "coastal_inland_label": "inland",
                            "geometry": geom,
                        }
                    )
                elem.clear()
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: DLM250 industrial zone selection is empty.")
    preview = gdf.head(3500).copy()
    write_pack(
        pack_id,
        "industrial_zones",
        "polygon",
        {"industrial_zones": preview},
        {"industrial_zones": gdf},
        {
            "source_row_count": {"AX_IndustrieUndGewerbeflaeche": raw_rows},
            "matched_count": len(gdf),
            "preview_rule": "First 3500 DLM250 industrial/commercial polygons in source order; full pack keeps all.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_industrial_zones",
    )


def build_germany_logistics_hubs() -> None:
    pack_id = "germany_logistics_hubs"
    zip_path = dlm_source_zip()
    rows = []
    raw_rows = 0
    with zipfile.ZipFile(zip_path) as z, z.open("daten/BDA_51004.xml") as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag.endswith("AX_Transportanlage"):
                raw_rows += 1
                geom = representative_point(dlm_line_from_pos_list(first_text(elem, "posList")))
                if geom is not None:
                    rows.append(
                        {
                            "id": get_gml_id(elem),
                            "name": first_text(elem, "name") or first_text(elem, "bezeichnung") or "Transportanlage",
                            "hub_type": "truck_terminal",
                            "source_function_code": first_text(elem, "bauwerksfunktion") or "",
                            "operator_classification": "other",
                            "geometry": geom,
                        }
                    )
                elem.clear()
    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    if gdf.empty:
        raise SystemExit(f"{pack_id}: DLM250 logistics hub selection is empty.")
    write_pack(
        pack_id,
        "logistics_hubs",
        "point",
        {"logistics_hubs": gdf},
        {"logistics_hubs": gdf},
        {
            "source_row_count": {"AX_Transportanlage": raw_rows},
            "matched_count": len(gdf),
            "preview_rule": "DLM250 transport facility geometry converted to representative points.",
        },
        build_command="python tools/build_transport_country_real_packs.py --pack germany_logistics_hubs",
    )


BUILDERS = {
    "germany_road": build_germany_road,
    "uk_road": build_uk_road,
    "usa_road": build_usa_road,
    "france_road": build_france_road,
    "china_road": lambda: build_osm_gpkg_road_pack("china_road", "china"),
    "india_road": lambda: build_osm_gpkg_road_pack("india_road", "india"),
    "russia_road": lambda: build_osm_gpkg_road_pack("russia_road", "russia"),
    "usa_rail": build_usa_rail,
    "china_rail": lambda: build_osm_gpkg_rail_pack("china_rail", "china"),
    "india_rail": lambda: build_osm_gpkg_rail_pack("india_rail", "india"),
    "russia_rail": lambda: build_osm_gpkg_rail_pack("russia_rail", "russia"),
    "china_energy_facilities": build_china_energy_facilities,
    "china_industrial_zones": lambda: build_osm_gpkg_industrial_zone_centers_pack("china_industrial_zones", "china"),
    "china_logistics_hubs": lambda: build_osm_gpkg_logistics_hub_pack("china_logistics_hubs", "china"),
    "china_mineral_resources": build_china_mineral_resources,
    "usa_energy_facilities": build_usa_energy_facilities,
    "usa_mineral_resources": build_usa_mineral_resources,
    "usa_industrial_zones": build_usa_industrial_zones,
    "usa_logistics_hubs": build_usa_logistics_hubs,
    "india_energy_facilities": build_india_energy_facilities,
    "india_industrial_zones": lambda: build_osm_gpkg_industrial_zone_centers_pack("india_industrial_zones", "india"),
    "india_logistics_hubs": lambda: build_osm_gpkg_logistics_hub_pack("india_logistics_hubs", "india"),
    "india_mineral_resources": build_india_mineral_resources,
    "russia_energy_facilities": build_russia_energy_facilities,
    "russia_industrial_zones": lambda: build_osm_gpkg_industrial_zone_centers_pack("russia_industrial_zones", "russia"),
    "russia_logistics_hubs": lambda: build_osm_gpkg_logistics_hub_pack("russia_logistics_hubs", "russia"),
    "russia_mineral_resources": build_russia_mineral_resources,
    "uk_energy_facilities": build_uk_energy_facilities,
    "uk_industrial_zones": build_uk_industrial_zones,
    "uk_logistics_hubs": build_uk_logistics_hubs,
    "uk_mineral_resources": build_uk_mineral_resources,
    "france_energy_facilities": build_france_energy_facilities,
    "france_industrial_zones": build_france_industrial_zones,
    "france_mineral_resources": build_france_mineral_resources,
    "france_logistics_hubs": build_france_logistics_hubs,
    "france_rail": build_france_rail,
    "germany_rail": build_germany_rail,
    "uk_rail": build_uk_rail,
    "usa_airport": build_usa_airport,
    "china_airport": build_china_airport,
    "russia_airport": build_russia_airport,
    "india_airport": build_india_airport,
    "germany_airport": build_germany_airport,
    "france_airport": build_france_airport,
    "uk_airport": build_uk_airport,
    "usa_port": build_usa_port,
    "germany_port": build_germany_port,
    "france_port": build_france_port,
    "uk_port": build_uk_port,
    "china_port": build_china_port,
    "india_port": build_india_port,
    "russia_port": build_russia_port,
    "germany_energy_facilities": build_germany_energy_facilities,
    "germany_mineral_resources": build_germany_mineral_resources,
    "germany_industrial_zones": build_germany_industrial_zones,
    "germany_logistics_hubs": build_germany_logistics_hubs,
}


def main(argv: list[str] | None = None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Build real-source transport country packs.")
    parser.add_argument("--pack", action="append", choices=TARGET_COUNTRY_PACK_IDS)
    args = parser.parse_args(argv)
    for pack_id in args.pack or TARGET_COUNTRY_PACK_IDS:
        BUILDERS[pack_id]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
