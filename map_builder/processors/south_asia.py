"""South Asia expansion processor (India ADM2 + extensions)."""
from __future__ import annotations

import geopandas as gpd
import pandas as pd

from map_builder import config as cfg
from map_builder.io.fetch import fetch_or_load_geojson


def _rep_points(gdf: gpd.GeoDataFrame) -> gpd.GeoSeries:
    gdf_ll = gdf
    if gdf_ll.crs is None:
        gdf_ll = gdf_ll.set_crs("EPSG:4326", allow_override=True)
    elif gdf_ll.crs.to_epsg() != 4326:
        gdf_ll = gdf_ll.to_crs("EPSG:4326")
    return gdf_ll.geometry.representative_point()


def apply_south_asia_replacement(hybrid_gdf: gpd.GeoDataFrame, land_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if hybrid_gdf.empty:
        return hybrid_gdf
    if "cntr_code" not in hybrid_gdf.columns:
        print("[South Asia] cntr_code missing; skipping replacement.")
        return hybrid_gdf

    base = hybrid_gdf[hybrid_gdf["cntr_code"].astype(str).str.upper() != "IN"].copy()

    print("Downloading India ADM2 (geoBoundaries)...")
    ind_gdf = fetch_or_load_geojson(
        cfg.IND_ADM2_URL,
        cfg.IND_ADM2_FILENAME,
        fallback_urls=cfg.IND_ADM2_FALLBACK_URLS,
    )

    if ind_gdf.empty:
        print("India ADM2 GeoDataFrame is empty.")
        raise SystemExit(1)

    if ind_gdf.crs is None:
        ind_gdf = ind_gdf.set_crs("EPSG:4326", allow_override=True)
    if ind_gdf.crs.to_epsg() != 4326:
        ind_gdf = ind_gdf.to_crs("EPSG:4326")

    if "shapeID" not in ind_gdf.columns or "shapeName" not in ind_gdf.columns:
        raise ValueError(
            "India ADM2 dataset missing expected columns: shapeID/shapeName. "
            f"Available: {ind_gdf.columns.tolist()}"
        )

    # Island cull using representative points (Andaman/Nicobar + Lakshadweep)
    reps = _rep_points(ind_gdf)
    keep_mask = ~((reps.x > 88.0) & (reps.y < 15.0)) & ~((reps.x < 75.0) & (reps.y < 14.0))
    ind_gdf = ind_gdf.loc[keep_mask].copy()

    # Clip India against China geometry to avoid overlaps
    china_geom = None
    try:
        china = hybrid_gdf[hybrid_gdf["cntr_code"].astype(str).str.upper() == "CN"]
        if not china.empty:
            china_geom = china.unary_union
    except Exception:
        china_geom = None

    if china_geom is not None and not china_geom.is_empty:
        try:
            ind_gdf["geometry"] = ind_gdf.geometry.apply(lambda geom: geom.difference(china_geom))
        except Exception as exc:
            print(f"[South Asia] China clip failed; continuing without: {exc}")

    # Simplify India ADM2
    ind_gdf = ind_gdf[ind_gdf.geometry.notna() & ~ind_gdf.geometry.is_empty].copy()
    ind_gdf["geometry"] = ind_gdf.geometry.simplify(
        tolerance=cfg.SIMPLIFY_INDIA, preserve_topology=True
    )

    ind_gdf["id"] = "IN_ADM2_" + ind_gdf["shapeID"].astype(str)
    ind_gdf["name"] = ind_gdf["shapeName"].astype(str)
    ind_gdf["cntr_code"] = "IN"
    ind_gdf = ind_gdf[["id", "name", "cntr_code", "geometry"]].copy()

    combined = pd.concat([base, ind_gdf], ignore_index=True)
    print(f"[South Asia] India ADM2 loaded: {len(ind_gdf)} features.")
    return gpd.GeoDataFrame(combined, crs=hybrid_gdf.crs)
