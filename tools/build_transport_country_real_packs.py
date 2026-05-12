#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import pandas as pd
import topojson as tp
from pyproj import Transformer
from shapely.geometry import LineString, Point
from shapely.ops import transform as shapely_transform

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_country_real_source_contracts import (  # noqa: E402
    COUNTRY_SOURCE_SPECS,
    DEFAULT_SOURCE_CACHE_ROOT,
    TARGET_COUNTRY_PACK_IDS,
    build_source_recipe,
    check_country_sources,
)
from map_builder.transport_workbench_contracts import finalize_transport_manifest  # noqa: E402

OUTPUT_ROOT = PROJECT_ROOT / "data" / "transport_layers"
INDIA_TRAFFIC_RANK_PATH = PROJECT_ROOT / "map_builder" / "transport_country_india_airport_traffic_rank.manual.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def rel(path: Path) -> str:
    return str(path.relative_to(PROJECT_ROOT)).replace("\\", "/")


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) if compact else json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False)
    path.write_text(text + ("" if compact else "\n"), encoding="utf-8")


def file_signature(path: Path) -> dict[str, Any]:
    import hashlib

    payload = path.read_bytes()
    return {
        "filename": path.name,
        "path": rel(path),
        "size_bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


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


def feature_collection(gdf: gpd.GeoDataFrame) -> dict[str, Any]:
    if gdf.crs is not None:
        gdf = gdf.to_crs("EPSG:4326")
    return json.loads(gdf.to_json(drop_id=True))


def topology_payload(gdf: gpd.GeoDataFrame, object_name: str) -> dict[str, Any]:
    if gdf.empty:
        return {"type": "Topology", "objects": {object_name: {"type": "GeometryCollection", "geometries": []}}, "arcs": []}
    if gdf.crs is not None:
        gdf = gdf.to_crs("EPSG:4326")
    payload = tp.Topology(gdf, prequantize=False).to_dict()
    objects = payload.get("objects") or {}
    if object_name not in objects and len(objects) == 1:
        only_key = next(iter(objects))
        payload["objects"] = {object_name: objects[only_key]}
    return payload


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
    paths = {"preview": {}, "full": {}, "build_audit": rel(output_dir / "build_audit.json")}
    for layer, gdf in preview.items():
        suffix = ".topo.json" if geometry_kind == "line" and layer in {"roads", "railways"} else ".geojson"
        path = output_dir / f"{layer}.preview{suffix}"
        write_json(path, topology_payload(gdf, layer) if suffix == ".topo.json" else feature_collection(gdf), compact=True)
        paths["preview"][layer] = rel(path)
    for layer, gdf in full.items():
        suffix = ".topo.json" if geometry_kind == "line" and layer in {"roads", "railways"} else ".geojson"
        path = output_dir / f"{layer}{suffix}"
        write_json(path, topology_payload(gdf, layer) if suffix == ".topo.json" else feature_collection(gdf), compact=True)
        paths["full"][layer] = rel(path)

    counts = {
        "preview": {layer: int(len(gdf)) for layer, gdf in preview.items()},
        "full": {layer: int(len(gdf)) for layer, gdf in full.items()},
    }
    all_geoms = [gdf for gdf in list(preview.values()) + list(full.values()) if not gdf.empty and "geometry" in gdf]
    bbox = None
    if all_geoms:
        merged = pd.concat(all_geoms, ignore_index=True)
        bbox = [round(float(v), 6) for v in gpd.GeoDataFrame(merged, geometry="geometry", crs="EPSG:4326").total_bounds]
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
    manifest = finalize_transport_manifest(
        manifest,
        default_variant="default",
        variants={"default": {"label": "default", "distribution_tier": "single_pack", "paths": paths, "feature_counts": counts}},
    )
    write_json(output_dir / "manifest.json", manifest)
    print(f"[build] {pack_id}: {counts}")


def normalize_text(value: Any) -> str:
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass
    return re.sub(r"\s+", " ", str(value or "").strip())




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
    preview = gdf[(gdf["enplanements_2024"] >= 1000000) | (gdf["icao"].astype(str).str.len() > 0)].sort_values("enplanements_2024", ascending=False).head(250).copy()
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"APT_BASE": len(apt), "faa_enplanements": len(enp)}, "matched_count": int(gdf["enplanements_2024"].gt(0).sum()), "unmatched_official_rows": int(len(gdf) - gdf["enplanements_2024"].gt(0).sum()), "excluded_private_rows": int(apt["FACILITY_USE_CODE"].map(normalize_text).eq("PR").sum()), "preview_rule": "CY2024 enplanements >= 1,000,000 plus ICAO-coded public-use airports capped at 250"}, build_command="python tools/build_transport_country_real_packs.py --pack usa_airport")


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
    preview = gdf.sort_values("passengers", ascending=False).head(80).copy()
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"caac_airport_rows": len(official), "taiwan_caa_airport_rows": len(taiwan_names), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_taiwan_official_rows": taiwan_unmatched, "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "preview_rule": "top 80 CAAC passenger-throughput airports after strict official-name coordinate matching; Taiwan CAA objects join full output"}, build_command="python tools/build_transport_country_real_packs.py --pack china_airport")


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
    preview = gdf[gdf["class"].isin(["А", "Б", "В", "A", "B", "C"])].copy().head(120)
    if preview.empty:
        raise SystemExit(f"{pack_id}: preview selection is empty; check Rosaviatsiya class parsing.")
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"rosaviatsiya_registry_rows": len(registry), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "preview_rule": "official class A/B/Cyrillic А/Б/В first, capped at 120"}, build_command="python tools/build_transport_country_real_packs.py --pack russia_airport")


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
    preview = gdf[gdf["traffic_report_rank"] < 9999].sort_values("traffic_report_rank").head(100).copy()
    if preview.empty:
        raise SystemExit(f"{pack_id}: AAI traffic-report preview rank matched zero airports.")
    write_pack(pack_id, "airport", "point", {"airports": preview}, {"airports": gdf}, {"source_row_count": {"aai_airport_list_rows": len(official), "aai_traffic_rank_rows": len(traffic_source["rows"]), "osm_geometry_rows": len(osm)}, "matched_count": len(gdf), "unmatched_official_rows": unmatched[:80], "unmatched_geometry_rows": max(0, len(osm)-len(gdf)), "traffic_rank_source": {"path": rel(INDIA_TRAFFIC_RANK_PATH), "rows": len(traffic_source["rows"]), "source_pdf_sha256": traffic_source["source_pdf_sha256"], "rank_file_signature": traffic_source["rank_file_signature"]}, "preview_rule": "AAI June 2025 traffic-report audited rank extraction matched against AAI airport-list objects"}, build_command="python tools/build_transport_country_real_packs.py --pack india_airport")


BUILDERS = {
    "germany_road": build_germany_road,
    "uk_road": build_uk_road,
    "france_rail": build_france_rail,
    "usa_airport": build_usa_airport,
    "china_airport": build_china_airport,
    "russia_airport": build_russia_airport,
    "india_airport": build_india_airport,
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
