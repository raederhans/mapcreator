"""Special status zones processor."""
from __future__ import annotations

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

from map_builder.geo.utils import ensure_crs

DISPUTED_AREA_MIN_KM2 = 25.0
CHERNOBYL_CENTER = (30.099, 51.389)
CHERNOBYL_RADIUS_M = 30_000


def _build_disputed_cn_in(
    china_gdf: gpd.GeoDataFrame,
    india_raw_gdf: gpd.GeoDataFrame,
    min_area_km2: float = DISPUTED_AREA_MIN_KM2,
) -> gpd.GeoDataFrame:
    if china_gdf.empty or india_raw_gdf.empty:
        return gpd.GeoDataFrame(columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"], crs="EPSG:4326")

    china_gdf = ensure_crs(china_gdf, epsg=4326)
    india_raw_gdf = ensure_crs(india_raw_gdf, epsg=4326)

    try:
        inter_gdf = gpd.overlay(india_raw_gdf, china_gdf, how="intersection")
    except Exception as exc:
        print(f"[Special Zones] Intersection overlay failed: {exc}")
        return gpd.GeoDataFrame(columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"], crs="EPSG:4326")
    inter_gdf = inter_gdf[["geometry"]].copy()
    inter_gdf = inter_gdf[inter_gdf.geometry.notna() & ~inter_gdf.geometry.is_empty].copy()
    if inter_gdf.empty:
        return gpd.GeoDataFrame(columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"], crs="EPSG:4326")

    inter_gdf = inter_gdf[inter_gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
    if inter_gdf.empty:
        return gpd.GeoDataFrame(columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"], crs="EPSG:4326")

    try:
        areas_km2 = inter_gdf.to_crs("EPSG:6933").geometry.area / 1_000_000.0
        inter_gdf = inter_gdf.loc[areas_km2 >= min_area_km2].copy()
    except Exception as exc:
        print(f"[Special Zones] Area filter failed; keeping all intersections: {exc}")

    if inter_gdf.empty:
        return gpd.GeoDataFrame(columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"], crs="EPSG:4326")

    disputed_geom = inter_gdf.unary_union
    data = {
        "id": "disputed_cn_in",
        "name": "Disputed (CN/IN)",
        "label": "Disputed (CN/IN)",
        "type": "disputed",
        "claimants": ["CN", "IN"],
        "cntr_code": "",
    }
    return gpd.GeoDataFrame([data], geometry=[disputed_geom], crs="EPSG:4326")


def _build_chernobyl_zone() -> gpd.GeoDataFrame:
    center = Point(*CHERNOBYL_CENTER)
    series = gpd.GeoSeries([center], crs="EPSG:4326").to_crs("EPSG:3857")
    buffered = series.buffer(CHERNOBYL_RADIUS_M)
    chernobyl_geom = buffered.to_crs("EPSG:4326").iloc[0]
    data = {
        "id": "wasteland_ua_chernobyl",
        "name": "Chernobyl Exclusion Zone",
        "label": "Chernobyl Exclusion Zone",
        "type": "wasteland",
        "claimants": [],
        "cntr_code": "UA",
    }
    return gpd.GeoDataFrame([data], geometry=[chernobyl_geom], crs="EPSG:4326")


def build_special_zones(
    china_gdf: gpd.GeoDataFrame,
    india_raw_gdf: gpd.GeoDataFrame,
) -> gpd.GeoDataFrame:
    """Build special status zones (prototype)."""
    frames = []

    disputed = _build_disputed_cn_in(china_gdf, india_raw_gdf)
    if not disputed.empty:
        frames.append(disputed)

    chernobyl = _build_chernobyl_zone()
    if not chernobyl.empty:
        frames.append(chernobyl)

    if not frames:
        return gpd.GeoDataFrame(
            columns=["id", "name", "type", "label", "claimants", "cntr_code", "geometry"],
            crs="EPSG:4326",
        )

    combined = pd.concat(frames, ignore_index=True)
    return gpd.GeoDataFrame(combined, crs="EPSG:4326")
