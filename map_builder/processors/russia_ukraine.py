"""Russia/Ukraine hybrid replacement processor."""
from __future__ import annotations

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

from map_builder import config as cfg
from map_builder.io.fetch import fetch_or_load_geojson


def _rep_longitudes(gdf: gpd.GeoDataFrame) -> pd.Series:
    gdf_ll = gdf
    if gdf_ll.crs is None:
        gdf_ll = gdf_ll.set_crs("EPSG:4326", allow_override=True)
    elif gdf_ll.crs.to_epsg() != 4326:
        gdf_ll = gdf_ll.to_crs("EPSG:4326")
    reps = gdf_ll.geometry.representative_point()
    return reps.x


def apply_russia_ukraine_replacement(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[RU/UA] cntr_code missing; skipping replacement.")
        return main_gdf

    base = main_gdf[
        ~main_gdf["cntr_code"].astype(str).str.upper().isin({"RU", "UA"})
    ].copy()

    # Russia: keep Admin-1 east of the Urals
    ru_admin1 = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() == "RU"].copy()
    if not ru_admin1.empty:
        ru_admin1["__rep_lon"] = _rep_longitudes(ru_admin1)
        ru_east = ru_admin1[ru_admin1["__rep_lon"] >= cfg.URAL_LONGITUDE].copy()
        ru_east = ru_east.drop(columns=["__rep_lon"])
    else:
        ru_east = ru_admin1

    # Russia: replace west with ADM2
    print("Downloading Russia ADM2 (geoBoundaries)...")
    ru_gdf = fetch_or_load_geojson(
        cfg.RUS_ADM2_URL,
        cfg.RUS_ADM2_FILENAME,
        fallback_urls=cfg.RUS_ADM2_FALLBACK_URLS,
    )
    if ru_gdf.empty:
        print("Russia ADM2 GeoDataFrame is empty.")
        raise SystemExit(1)
    if ru_gdf.crs is None:
        ru_gdf = ru_gdf.set_crs("EPSG:4326", allow_override=True)
    if ru_gdf.crs.to_epsg() != 4326:
        ru_gdf = ru_gdf.to_crs("EPSG:4326")
    # Clip to prevent dateline wrapping artifacts (keep Russia in Eastern Hemisphere)
    clip_box = box(-20.0, 0.0, 179.99, 90.0)
    try:
        ru_gdf = gpd.clip(ru_gdf, clip_box)
    except Exception as exc:
        print(f"RU ADM2 clip failed; continuing without clip: {exc}")
    if "shapeID" not in ru_gdf.columns or "shapeName" not in ru_gdf.columns:
        raise ValueError(
            "Russia ADM2 dataset missing expected columns: shapeID/shapeName. "
            f"Available: {ru_gdf.columns.tolist()}"
        )
    ru_gdf = ru_gdf.copy()
    ru_gdf["__rep_lon"] = _rep_longitudes(ru_gdf)
    ru_gdf = ru_gdf[ru_gdf["__rep_lon"] < cfg.URAL_LONGITUDE].copy()
    ru_gdf = ru_gdf.drop(columns=["__rep_lon"])
    ru_gdf["id"] = "RU_RAY_" + ru_gdf["shapeID"].astype(str)
    ru_gdf["name"] = ru_gdf["shapeName"].astype(str)
    ru_gdf["cntr_code"] = "RU"
    ru_gdf = ru_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    ru_gdf["geometry"] = ru_gdf.geometry.simplify(
        tolerance=cfg.SIMPLIFY_RU_UA, preserve_topology=True
    )

    # Ukraine: full ADM2 replacement
    print("Downloading Ukraine ADM2 (geoBoundaries)...")
    ua_gdf = fetch_or_load_geojson(
        cfg.UKR_ADM2_URL,
        cfg.UKR_ADM2_FILENAME,
        fallback_urls=cfg.UKR_ADM2_FALLBACK_URLS,
    )
    if ua_gdf.empty:
        print("Ukraine ADM2 GeoDataFrame is empty.")
        raise SystemExit(1)
    if ua_gdf.crs is None:
        ua_gdf = ua_gdf.set_crs("EPSG:4326", allow_override=True)
    if ua_gdf.crs.to_epsg() != 4326:
        ua_gdf = ua_gdf.to_crs("EPSG:4326")
    if "shapeID" not in ua_gdf.columns or "shapeName" not in ua_gdf.columns:
        raise ValueError(
            "Ukraine ADM2 dataset missing expected columns: shapeID/shapeName. "
            f"Available: {ua_gdf.columns.tolist()}"
        )
    ua_gdf = ua_gdf.copy()
    ua_gdf["id"] = "UA_RAY_" + ua_gdf["shapeID"].astype(str)
    ua_gdf["name"] = ua_gdf["shapeName"].astype(str)
    ua_gdf["cntr_code"] = "UA"
    ua_gdf = ua_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    ua_gdf["geometry"] = ua_gdf.geometry.simplify(
        tolerance=cfg.SIMPLIFY_RU_UA, preserve_topology=True
    )

    combined = pd.concat([base, ru_east, ru_gdf, ua_gdf], ignore_index=True)
    print(
        f"[RU/UA] Replacement: RU west ADM2 {len(ru_gdf)}, RU east Admin1 {len(ru_east)}, UA ADM2 {len(ua_gdf)}."
    )
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)
